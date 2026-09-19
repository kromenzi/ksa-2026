import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity, AlertTriangle, BellRing, Building2, CheckCircle2, Clock3, DoorOpen,
  Flame, Gauge, HardDrive, Link2, Network, Plus, RefreshCw, Router, ShieldAlert,
  ShieldCheck, Siren, TriangleAlert, Wifi, WifiOff, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Gateway = {
  id:string; gatewayCode:string; name:string; protocol:string; host?:string|null; port?:number|null;
  manufacturer?:string|null; model?:string|null; firmware?:string|null; building?:string|null; area?:string|null;
  status:string; signalQuality?:number|null; connectedDevices:number; lastHeartbeatAt?:string|null; lastError?:string|null;
};

type FirePanel = {
  id:string; panelCode:string; name:string; manufacturer?:string|null; model?:string|null; serialNumber?:string|null;
  building?:string|null; floor?:string|null; area?:string|null; protocol:string; gatewayId?:string|null;
  host?:string|null; status:string; lastSignalAt?:string|null; lastTestAt?:string|null; nextTestAt?:string|null;
};

type FireDevice = {
  id:string; deviceCode:string; deviceType:string; panelId?:string|null; zoneId?:string|null; gatewayId?:string|null;
  loopNo?:string|null; addressNo?:string|null; building?:string|null; floor?:string|null; area?:string|null;
  exactLocation?:string|null; manufacturer?:string|null; model?:string|null; serialNumber?:string|null; protocol:string;
  status:string; powerStatus:string; batteryLevel?:number|null; isolated:boolean; lastSignalAt?:string|null;
  lastTestAt?:string|null; nextTestAt?:string|null;
};

type FireEvent = {
  id:string; deviceId?:string|null; panelId?:string|null; gatewayId?:string|null; eventType:string; severity:string;
  status:string; message?:string|null; occurredAt:string; acknowledgedAt?:string|null; acknowledgedBy?:string|null;
  clearedAt?:string|null; source:string; rawPayload?:Record<string,any>;
};

type EmergencyExit = {
  id:string; exitCode:string; name:string; building?:string|null; floor?:string|null; area?:string|null;
  assemblyPoint?:string|null; routeDescription?:string|null; doorType?:string|null; gatewayId?:string|null;
  status:string; doorStatus:string; lockStatus:string; panicBarStatus:string; exitSignStatus:string;
  emergencyLightStatus:string; emergencyLightBattery?:number|null; obstructionStatus:string; lastSignalAt?:string|null;
  lastInspectionAt?:string|null; nextInspectionAt?:string|null; qrCode?:string|null;
};

type ExitEvent = {
  id:string; exitId?:string|null; gatewayId?:string|null; eventType:string; severity:string; status:string;
  message?:string|null; occurredAt:string; acknowledgedAt?:string|null; acknowledgedBy?:string|null;
  clearedAt?:string|null; source:string; rawPayload?:Record<string,any>;
};

const loadResource = async <T,>(resource:string):Promise<T[]> => {
  const response = await apiRequest("GET", `/api/data?resource=${resource}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || `Unable to load ${resource}`);
  return Array.isArray(payload) ? payload : [];
};

const statusTone = (status:string) => {
  const value=String(status||"").toLowerCase();
  if(["alarm","critical","blocked","locked","offline","fault"].includes(value)) return "bg-red-500/10 text-red-700 border-red-500/30";
  if(["pre_alarm","supervisory","inspection_due","maintenance"].includes(value)) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  if(["normal","available","online","ok","on","clear","ready","closed"].includes(value)) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
};

const severityTone = (severity:string) => {
  if(severity==="critical") return "bg-red-600 text-white";
  if(severity==="high") return "bg-orange-500 text-white";
  if(severity==="medium") return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
};

const fmt=(value?:string|null)=>value?new Date(value).toLocaleString():"—";
const isPast=(value?:string|null)=>Boolean(value&&new Date(value).getTime()<Date.now());

export default function FireEmergencyCommandCenter(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const queryClient=useQueryClient();
  const canWrite=currentUser?.role==="admin"||currentUser?.role==="manager"||currentUser?.role==="editor";

  const gatewaysQ=useQuery<Gateway[]>({queryKey:["fire-gateways"],queryFn:()=>loadResource<Gateway>("fire-gateways")});
  const panelsQ=useQuery<FirePanel[]>({queryKey:["fire-panels"],queryFn:()=>loadResource<FirePanel>("fire-panels")});
  const devicesQ=useQuery<FireDevice[]>({queryKey:["fire-devices"],queryFn:()=>loadResource<FireDevice>("fire-devices")});
  const fireEventsQ=useQuery<FireEvent[]>({queryKey:["fire-device-events"],queryFn:()=>loadResource<FireEvent>("fire-device-events")});
  const exitsQ=useQuery<EmergencyExit[]>({queryKey:["emergency-exits"],queryFn:()=>loadResource<EmergencyExit>("emergency-exits")});
  const exitEventsQ=useQuery<ExitEvent[]>({queryKey:["emergency-exit-events"],queryFn:()=>loadResource<ExitEvent>("emergency-exit-events")});

  const gateways=gatewaysQ.data||[];
  const panels=panelsQ.data||[];
  const devices=devicesQ.data||[];
  const fireEvents=fireEventsQ.data||[];
  const exits=exitsQ.data||[];
  const exitEvents=exitEventsQ.data||[];
  const loading=[gatewaysQ,panelsQ,devicesQ,fireEventsQ,exitsQ,exitEventsQ].some(q=>q.isLoading);

  const refresh=async()=>{
    await Promise.all([
      queryClient.invalidateQueries({queryKey:["fire-gateways"]}),
      queryClient.invalidateQueries({queryKey:["fire-panels"]}),
      queryClient.invalidateQueries({queryKey:["fire-devices"]}),
      queryClient.invalidateQueries({queryKey:["fire-device-events"]}),
      queryClient.invalidateQueries({queryKey:["emergency-exits"]}),
      queryClient.invalidateQueries({queryKey:["emergency-exit-events"]}),
    ]);
  };

  const [dialog,setDialog]=useState<"gateway"|"panel"|"device"|"exit"|"fire-event"|"exit-event"|null>(null);
  const [saving,setSaving]=useState(false);
  const [gatewayForm,setGatewayForm]=useState({gatewayCode:"",name:"",protocol:"manual",host:"",port:"",manufacturer:"",model:"",building:"",area:"",status:"offline"});
  const [panelForm,setPanelForm]=useState({panelCode:"",name:"",manufacturer:"",model:"",serialNumber:"",building:"",floor:"",area:"",protocol:"manual",gatewayId:"none",host:"",status:"normal"});
  const [deviceForm,setDeviceForm]=useState({deviceCode:"",deviceType:"smoke_detector",panelId:"none",gatewayId:"none",loopNo:"",addressNo:"",building:"",floor:"",area:"",exactLocation:"",manufacturer:"",model:"",serialNumber:"",protocol:"manual",status:"normal"});
  const [exitForm,setExitForm]=useState({exitCode:"",name:"",building:"",floor:"",area:"",assemblyPoint:"",routeDescription:"",doorType:"panic_bar",gatewayId:"none",status:"available"});
  const [fireEventForm,setFireEventForm]=useState({deviceId:"none",panelId:"none",gatewayId:"none",eventType:"alarm",severity:"critical",message:"",source:"manual"});
  const [exitEventForm,setExitEventForm]=useState({exitId:"none",gatewayId:"none",eventType:"blocked",severity:"critical",message:"",source:"manual"});

  const createResource=async(resource:string,body:any)=>{
    const response=await apiRequest("POST",`/api/data?resource=${resource}`,body);
    const payload=await response.json();
    if(!response.ok) throw new Error(payload?.error||"Unable to save");
    return payload;
  };

  const saveDialog=async()=>{
    setSaving(true);
    try{
      if(dialog==="gateway"){
        if(!gatewayForm.gatewayCode.trim()||!gatewayForm.name.trim()) throw new Error(isAr?"رمز واسم Gateway مطلوبان":"Gateway code and name are required");
        await createResource("fire-gateways",{...gatewayForm,port:gatewayForm.port?Number(gatewayForm.port):null});
      }
      if(dialog==="panel"){
        if(!panelForm.panelCode.trim()||!panelForm.name.trim()) throw new Error(isAr?"رمز واسم اللوحة مطلوبان":"Panel code and name are required");
        await createResource("fire-panels",{...panelForm,gatewayId:panelForm.gatewayId==="none"?null:panelForm.gatewayId});
      }
      if(dialog==="device"){
        if(!deviceForm.deviceCode.trim()) throw new Error(isAr?"رمز الجهاز مطلوب":"Device code is required");
        await createResource("fire-devices",{...deviceForm,panelId:deviceForm.panelId==="none"?null:deviceForm.panelId,gatewayId:deviceForm.gatewayId==="none"?null:deviceForm.gatewayId,powerStatus:"normal",isolated:false});
      }
      if(dialog==="exit"){
        if(!exitForm.exitCode.trim()||!exitForm.name.trim()) throw new Error(isAr?"رمز واسم المخرج مطلوبان":"Exit code and name are required");
        await createResource("emergency-exits",{...exitForm,gatewayId:exitForm.gatewayId==="none"?null:exitForm.gatewayId,doorStatus:"closed",lockStatus:"ready",panicBarStatus:"ok",exitSignStatus:"on",emergencyLightStatus:"ok",obstructionStatus:"clear",qrCode:`EXIT-${exitForm.exitCode}-${Date.now()}`});
      }
      if(dialog==="fire-event"){
        if(fireEventForm.deviceId==="none"&&fireEventForm.panelId==="none") throw new Error(isAr?"اختر جهازًا أو لوحة":"Select a device or panel");
        await createResource("fire-device-events",{...fireEventForm,deviceId:fireEventForm.deviceId==="none"?null:fireEventForm.deviceId,panelId:fireEventForm.panelId==="none"?null:fireEventForm.panelId,gatewayId:fireEventForm.gatewayId==="none"?null:fireEventForm.gatewayId,status:"open",occurredAt:new Date().toISOString(),rawPayload:{commissioning:true}});
      }
      if(dialog==="exit-event"){
        if(exitEventForm.exitId==="none") throw new Error(isAr?"اختر مخرج الطوارئ":"Select an emergency exit");
        await createResource("emergency-exit-events",{...exitEventForm,gatewayId:exitEventForm.gatewayId==="none"?null:exitEventForm.gatewayId,status:"open",occurredAt:new Date().toISOString(),rawPayload:{commissioning:true}});
      }
      toast.success(isAr?"تم الحفظ وتحديث مركز القيادة":"Saved and Command Center updated");
      setDialog(null);
      await refresh();
    }catch(error:any){
      toast.error(error?.message||(isAr?"تعذر الحفظ":"Unable to save"));
    }finally{setSaving(false);}
  };

  const acknowledge=async(resource:string,event:any)=>{
    try{
      const response=await apiRequest("PATCH",`/api/data?resource=${resource}&id=${encodeURIComponent(event.id)}`,{
        status:"acknowledged",
        acknowledgedAt:new Date().toISOString(),
        acknowledgedBy:currentUser?.id||null
      });
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error||"Unable to acknowledge");
      toast.success(isAr?"تم تأكيد استلام الحدث":"Event acknowledged");
      await refresh();
    }catch(error:any){toast.error(error?.message||"Unable to acknowledge");}
  };

  const metrics=useMemo(()=>{
    const activeAlarm=devices.filter(d=>d.status==="alarm").length+panels.filter(p=>p.status==="alarm").length;
    const fireFaults=devices.filter(d=>["fault","offline"].includes(d.status)).length+panels.filter(p=>["fault","offline"].includes(p.status)).length;
    const badExits=exits.filter(e=>["blocked","locked","fault","offline"].includes(e.status)||e.obstructionStatus==="blocked").length;
    const gatewayOnline=gateways.filter(g=>g.status==="online").length;
    const overdue=devices.filter(d=>isPast(d.nextTestAt)&&d.status!=="maintenance").length+panels.filter(p=>isPast(p.nextTestAt)&&p.status!=="maintenance").length+exits.filter(e=>isPast(e.nextInspectionAt)).length;
    const openEvents=fireEvents.filter(e=>e.status==="open").length+exitEvents.filter(e=>e.status==="open").length;
    return{activeAlarm,fireFaults,badExits,gatewayOnline,overdue,openEvents};
  },[devices,panels,exits,gateways,fireEvents,exitEvents]);

  const panelName=(id?:string|null)=>panels.find(p=>p.id===id)?.panelCode||"—";
  const gatewayName=(id?:string|null)=>gateways.find(g=>g.id===id)?.gatewayCode||"—";
  const deviceName=(id?:string|null)=>devices.find(d=>d.id===id)?.deviceCode||"—";
  const exitName=(id?:string|null)=>exits.find(e=>e.id===id)?.exitCode||"—";

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white shadow"><Siren className="h-6 w-6"/></div>
        <div>
          <h1 className="text-2xl font-bold">{isAr?"مركز قيادة الحريق والطوارئ":"Fire & Emergency Command Center"}</h1>
          <p className="text-xs text-muted-foreground">{isAr?"مراقبة لوحات الإنذار والأجهزة ومخارج الطوارئ والأحداث":"Monitor fire panels, devices, emergency exits and events"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/fire-protection"><Button variant="outline"><Flame className="me-2 h-4 w-4"/>{isAr?"الحماية من الحريق":"Fire Protection"}</Button></Link>
        <Link href="/admin/emergency"><Button variant="outline"><DoorOpen className="me-2 h-4 w-4"/>{isAr?"تمارين الإخلاء":"Emergency Drills"}</Button></Link>
        <Button variant="outline" onClick={()=>void refresh()} disabled={loading}><RefreshCw className={"me-2 h-4 w-4 "+(loading?"animate-spin":"")}/>{isAr?"تحديث":"Refresh"}</Button>
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0"/>
      <div><p className="font-semibold">{isAr?"مراقبة فقط لأنظمة Life-Safety":"Read-only life-safety monitoring"}</p><p className="mt-1 text-xs opacity-80">{isAr?"لا تتضمن المنصة Reset أو Silence أو Disable أو Isolate للوحة الإنذار. أحداث الاختبار أدناه مخصصة للـCommissioning والتحقق من التكامل فقط.":"The platform does not provide Reset, Silence, Disable or Isolate controls. Manual events below are for commissioning and integration verification only."}</p></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"إنذارات فعالة":"Active Alarms"}</p><p className="mt-1 text-2xl font-bold text-red-600">{metrics.activeAlarm}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"أعطال / Offline":"Faults / Offline"}</p><p className="mt-1 text-2xl font-bold text-orange-600">{metrics.fireFaults}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"مخارج حرجة":"Critical Exits"}</p><p className="mt-1 text-2xl font-bold text-red-600">{metrics.badExits}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"Gateways Online":"Gateways Online"}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{metrics.gatewayOnline}/{gateways.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"فحوصات متأخرة":"Overdue Tests"}</p><p className="mt-1 text-2xl font-bold text-amber-600">{metrics.overdue}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr?"أحداث مفتوحة":"Open Events"}</p><p className="mt-1 text-2xl font-bold text-blue-600">{metrics.openEvents}</p></CardContent></Card>
    </div>

    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1.5">
        <TabsTrigger value="dashboard"><Activity className="me-2 h-4 w-4"/>{isAr?"القيادة":"Dashboard"}</TabsTrigger>
        <TabsTrigger value="fire"><Siren className="me-2 h-4 w-4"/>{isAr?"الإنذار والأجهزة":"Panels & Devices"}</TabsTrigger>
        <TabsTrigger value="exits"><DoorOpen className="me-2 h-4 w-4"/>{isAr?"مخارج الطوارئ":"Emergency Exits"}</TabsTrigger>
        <TabsTrigger value="gateways"><Network className="me-2 h-4 w-4"/>{isAr?"التكامل":"Gateways"}</TabsTrigger>
        <TabsTrigger value="events"><BellRing className="me-2 h-4 w-4"/>{isAr?"الأحداث":"Events"}</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">{isAr?"حالة أنظمة الحريق":"Fire System Health"}</CardTitle></CardHeader><CardContent className="space-y-3">
            {panels.length===0&&devices.length===0&&<p className="py-8 text-center text-sm text-muted-foreground">{isAr?"لم تتم إضافة لوحات أو أجهزة بعد":"No panels or devices registered yet"}</p>}
            {panels.slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">{p.panelCode} — {p.name}</p><p className="text-xs text-muted-foreground">{p.building||"—"} · {p.area||"—"}</p></div><Badge variant="outline" className={statusTone(p.status)}>{p.status}</Badge></div>)}
            {devices.filter(d=>d.status!=="normal").slice(0,6).map(d=><div key={d.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">{d.deviceCode}</p><p className="text-xs text-muted-foreground">{d.exactLocation||d.area||"—"} · {d.deviceType}</p></div><Badge variant="outline" className={statusTone(d.status)}>{d.status}</Badge></div>)}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{isAr?"جاهزية مخارج الطوارئ":"Emergency Exit Readiness"}</CardTitle></CardHeader><CardContent className="space-y-3">
            {exits.length===0&&<p className="py-8 text-center text-sm text-muted-foreground">{isAr?"لم تتم إضافة مخارج طوارئ بعد":"No emergency exits registered yet"}</p>}
            {exits.slice(0,8).map(e=><div key={e.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">{e.exitCode} — {e.name}</p><p className="text-xs text-muted-foreground">{e.area||"—"} · {isAr?"نقطة التجمع":"Assembly"}: {e.assemblyPoint||"—"}</p></div><div className="flex gap-1"><Badge variant="outline" className={statusTone(e.status)}>{e.status}</Badge>{e.obstructionStatus==="blocked"&&<Badge variant="destructive">{isAr?"محجوب":"Blocked"}</Badge>}</div></div>)}
          </CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="fire" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>setDialog("panel")}><Plus className="me-2 h-4 w-4"/>{isAr?"لوحة إنذار":"Panel"}</Button><Button variant="outline" onClick={()=>setDialog("device")}><Plus className="me-2 h-4 w-4"/>{isAr?"جهاز":"Device"}</Button><Button onClick={()=>setDialog("fire-event")}><BellRing className="me-2 h-4 w-4"/>{isAr?"تسجيل Event":"Log Event"}</Button></>}</div>
        <Card><CardHeader><CardTitle className="text-base">{isAr?"لوحات إنذار الحريق":"Fire Alarm Panels"}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"اللوحة":"Panel"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>Protocol</TableHead><TableHead>Gateway</TableHead><TableHead>{isAr?"آخر إشارة":"Last Signal"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{panels.map(p=><TableRow key={p.id}><TableCell><p className="font-semibold">{p.panelCode}</p><p className="text-xs text-muted-foreground">{p.name}</p></TableCell><TableCell>{p.building||"—"} / {p.floor||"—"} / {p.area||"—"}</TableCell><TableCell>{p.protocol}</TableCell><TableCell>{gatewayName(p.gatewayId)}</TableCell><TableCell>{fmt(p.lastSignalAt)}</TableCell><TableCell><Badge variant="outline" className={statusTone(p.status)}>{p.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{isAr?"أجهزة الكشف والإنذار":"Detection & Alarm Devices"}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"الجهاز":"Device"}</TableHead><TableHead>{isAr?"النوع":"Type"}</TableHead><TableHead>{isAr?"اللوحة":"Panel"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"الطاقة":"Power"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{devices.map(d=><TableRow key={d.id}><TableCell><p className="font-semibold">{d.deviceCode}</p><p className="text-xs text-muted-foreground">Loop {d.loopNo||"—"} · Addr {d.addressNo||"—"}</p></TableCell><TableCell>{d.deviceType}</TableCell><TableCell>{panelName(d.panelId)}</TableCell><TableCell>{d.exactLocation||d.area||"—"}</TableCell><TableCell><Badge variant="outline" className={statusTone(d.powerStatus)}>{d.powerStatus}</Badge>{d.batteryLevel!=null&&<span className="ms-2 text-xs">{d.batteryLevel}%</span>}</TableCell><TableCell><Badge variant="outline" className={statusTone(d.status)}>{d.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </TabsContent>

      <TabsContent value="exits" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">{canWrite&&<><Button variant="outline" onClick={()=>setDialog("exit")}><Plus className="me-2 h-4 w-4"/>{isAr?"إضافة مخرج":"Add Exit"}</Button><Button onClick={()=>setDialog("exit-event")}><BellRing className="me-2 h-4 w-4"/>{isAr?"تسجيل Event":"Log Event"}</Button></>}</div>
        <Card><CardContent className="overflow-x-auto p-4"><Table><TableHeader><TableRow><TableHead>{isAr?"المخرج":"Exit"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"نقطة التجمع":"Assembly Point"}</TableHead><TableHead>{isAr?"الباب / القفل":"Door / Lock"}</TableHead><TableHead>{isAr?"الإشارة / الإضاءة":"Sign / Light"}</TableHead><TableHead>{isAr?"عوائق":"Obstruction"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{exits.map(e=><TableRow key={e.id}><TableCell><p className="font-semibold">{e.exitCode}</p><p className="text-xs text-muted-foreground">{e.name}</p></TableCell><TableCell>{e.building||"—"} / {e.floor||"—"} / {e.area||"—"}</TableCell><TableCell>{e.assemblyPoint||"—"}</TableCell><TableCell>{e.doorStatus} / {e.lockStatus}</TableCell><TableCell>{e.exitSignStatus} / {e.emergencyLightStatus}{e.emergencyLightBattery!=null&&` · ${e.emergencyLightBattery}%`}</TableCell><TableCell><Badge variant="outline" className={statusTone(e.obstructionStatus)}>{e.obstructionStatus}</Badge></TableCell><TableCell><Badge variant="outline" className={statusTone(e.status)}>{e.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </TabsContent>

      <TabsContent value="gateways" className="space-y-4">
        <div className="flex justify-end">{canWrite&&<Button onClick={()=>setDialog("gateway")}><Plus className="me-2 h-4 w-4"/>{isAr?"إضافة Gateway":"Add Gateway"}</Button>}</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{gateways.map(g=><Card key={g.id}><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">{g.status==="online"?<Wifi className="h-5 w-5"/>:<WifiOff className="h-5 w-5"/>}</div><div><p className="font-semibold">{g.gatewayCode} — {g.name}</p><p className="text-xs text-muted-foreground">{g.protocol} · {g.host||"—"}{g.port?`:${g.port}`:""}</p></div></div><Badge variant="outline" className={statusTone(g.status)}>{g.status}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg border p-2"><span className="text-muted-foreground">{isAr?"الأجهزة":"Devices"}</span><p className="font-semibold">{g.connectedDevices}</p></div><div className="rounded-lg border p-2"><span className="text-muted-foreground">{isAr?"الإشارة":"Signal"}</span><p className="font-semibold">{g.signalQuality??"—"}{g.signalQuality!=null?"%":""}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{isAr?"آخر Heartbeat":"Last heartbeat"}: {fmt(g.lastHeartbeatAt)}</p>{g.lastError&&<p className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-700">{g.lastError}</p>}</CardContent></Card>)}</div>
      </TabsContent>

      <TabsContent value="events" className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">{isAr?"أحداث نظام الحريق":"Fire System Events"}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"الوقت":"Time"}</TableHead><TableHead>{isAr?"المصدر":"Source"}</TableHead><TableHead>{isAr?"الحدث":"Event"}</TableHead><TableHead>{isAr?"الشدة":"Severity"}</TableHead><TableHead>{isAr?"الرسالة":"Message"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{fireEvents.slice(0,100).map(e=><TableRow key={e.id}><TableCell>{fmt(e.occurredAt)}</TableCell><TableCell>{deviceName(e.deviceId)} / {panelName(e.panelId)}</TableCell><TableCell>{e.eventType}</TableCell><TableCell><Badge variant="outline" className={severityTone(e.severity)}>{e.severity}</Badge></TableCell><TableCell>{e.message||"—"}</TableCell><TableCell><Badge variant="outline" className={statusTone(e.status)}>{e.status}</Badge></TableCell><TableCell>{canWrite&&e.status==="open"&&<Button size="sm" variant="outline" onClick={()=>void acknowledge("fire-device-events",e)}>{isAr?"تأكيد":"Acknowledge"}</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{isAr?"أحداث مخارج الطوارئ":"Emergency Exit Events"}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"الوقت":"Time"}</TableHead><TableHead>{isAr?"المخرج":"Exit"}</TableHead><TableHead>{isAr?"الحدث":"Event"}</TableHead><TableHead>{isAr?"الشدة":"Severity"}</TableHead><TableHead>{isAr?"الرسالة":"Message"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{exitEvents.slice(0,100).map(e=><TableRow key={e.id}><TableCell>{fmt(e.occurredAt)}</TableCell><TableCell>{exitName(e.exitId)}</TableCell><TableCell>{e.eventType}</TableCell><TableCell><Badge variant="outline" className={severityTone(e.severity)}>{e.severity}</Badge></TableCell><TableCell>{e.message||"—"}</TableCell><TableCell><Badge variant="outline" className={statusTone(e.status)}>{e.status}</Badge></TableCell><TableCell>{canWrite&&e.status==="open"&&<Button size="sm" variant="outline" onClick={()=>void acknowledge("emergency-exit-events",e)}>{isAr?"تأكيد":"Acknowledge"}</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </TabsContent>
    </Tabs>

    <Dialog open={dialog!==null} onOpenChange={open=>!open&&setDialog(null)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{
          dialog==="gateway"?(isAr?"إضافة Gateway":"Add Gateway"):
          dialog==="panel"?(isAr?"إضافة لوحة إنذار":"Add Fire Panel"):
          dialog==="device"?(isAr?"إضافة جهاز إنذار":"Add Fire Device"):
          dialog==="exit"?(isAr?"إضافة مخرج طوارئ":"Add Emergency Exit"):
          dialog==="fire-event"?(isAr?"تسجيل حدث حريق / Commissioning":"Log Fire Event / Commissioning"):
          isAr?"تسجيل حدث مخرج طوارئ":"Log Emergency Exit Event"
        }</DialogTitle></DialogHeader>

        {dialog==="gateway"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"رمز Gateway":"Gateway Code"}><Input value={gatewayForm.gatewayCode} onChange={e=>setGatewayForm({...gatewayForm,gatewayCode:e.target.value})}/></Field>
          <Field label={isAr?"الاسم":"Name"}><Input value={gatewayForm.name} onChange={e=>setGatewayForm({...gatewayForm,name:e.target.value})}/></Field>
          <Field label="Protocol"><Select value={gatewayForm.protocol} onValueChange={v=>setGatewayForm({...gatewayForm,protocol:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["manual","vendor_api","bacnet_ip","modbus_tcp","modbus_rtu","opc_ua","mqtt","dry_contact"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Status"><Select value={gatewayForm.status} onValueChange={v=>setGatewayForm({...gatewayForm,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["online","offline","fault","maintenance"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Host / IP"><Input value={gatewayForm.host} onChange={e=>setGatewayForm({...gatewayForm,host:e.target.value})}/></Field>
          <Field label="Port"><Input type="number" value={gatewayForm.port} onChange={e=>setGatewayForm({...gatewayForm,port:e.target.value})}/></Field>
          <Field label={isAr?"الشركة المصنعة":"Manufacturer"}><Input value={gatewayForm.manufacturer} onChange={e=>setGatewayForm({...gatewayForm,manufacturer:e.target.value})}/></Field>
          <Field label="Model"><Input value={gatewayForm.model} onChange={e=>setGatewayForm({...gatewayForm,model:e.target.value})}/></Field>
          <Field label={isAr?"المبنى":"Building"}><Input value={gatewayForm.building} onChange={e=>setGatewayForm({...gatewayForm,building:e.target.value})}/></Field>
          <Field label={isAr?"المنطقة":"Area"}><Input value={gatewayForm.area} onChange={e=>setGatewayForm({...gatewayForm,area:e.target.value})}/></Field>
        </div>}

        {dialog==="panel"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"رمز اللوحة":"Panel Code"}><Input value={panelForm.panelCode} onChange={e=>setPanelForm({...panelForm,panelCode:e.target.value})}/></Field>
          <Field label={isAr?"الاسم":"Name"}><Input value={panelForm.name} onChange={e=>setPanelForm({...panelForm,name:e.target.value})}/></Field>
          <Field label={isAr?"الشركة المصنعة":"Manufacturer"}><Input value={panelForm.manufacturer} onChange={e=>setPanelForm({...panelForm,manufacturer:e.target.value})}/></Field>
          <Field label="Model"><Input value={panelForm.model} onChange={e=>setPanelForm({...panelForm,model:e.target.value})}/></Field>
          <Field label="Serial"><Input value={panelForm.serialNumber} onChange={e=>setPanelForm({...panelForm,serialNumber:e.target.value})}/></Field>
          <Field label="Protocol"><Select value={panelForm.protocol} onValueChange={v=>setPanelForm({...panelForm,protocol:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["manual","vendor_api","bacnet_ip","modbus_tcp","modbus_rtu","opc_ua","mqtt","dry_contact"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Gateway"><Select value={panelForm.gatewayId} onValueChange={v=>setPanelForm({...panelForm,gatewayId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{gateways.map(g=><SelectItem key={g.id} value={g.id}>{g.gatewayCode} — {g.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Host / IP"><Input value={panelForm.host} onChange={e=>setPanelForm({...panelForm,host:e.target.value})}/></Field>
          <Field label={isAr?"المبنى":"Building"}><Input value={panelForm.building} onChange={e=>setPanelForm({...panelForm,building:e.target.value})}/></Field>
          <Field label={isAr?"الطابق":"Floor"}><Input value={panelForm.floor} onChange={e=>setPanelForm({...panelForm,floor:e.target.value})}/></Field>
          <Field label={isAr?"المنطقة":"Area"}><Input value={panelForm.area} onChange={e=>setPanelForm({...panelForm,area:e.target.value})}/></Field>
        </div>}

        {dialog==="device"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"رمز الجهاز":"Device Code"}><Input value={deviceForm.deviceCode} onChange={e=>setDeviceForm({...deviceForm,deviceCode:e.target.value})}/></Field>
          <Field label={isAr?"نوع الجهاز":"Device Type"}><Select value={deviceForm.deviceType} onValueChange={v=>setDeviceForm({...deviceForm,deviceType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["smoke_detector","heat_detector","beam_detector","manual_call_point","sounder","strobe","io_module","flow_switch","pressure_switch","gas_suppression","other"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"اللوحة":"Panel"}><Select value={deviceForm.panelId} onValueChange={v=>setDeviceForm({...deviceForm,panelId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{panels.map(p=><SelectItem key={p.id} value={p.id}>{p.panelCode} — {p.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Gateway"><Select value={deviceForm.gatewayId} onValueChange={v=>setDeviceForm({...deviceForm,gatewayId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{gateways.map(g=><SelectItem key={g.id} value={g.id}>{g.gatewayCode}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Loop"><Input value={deviceForm.loopNo} onChange={e=>setDeviceForm({...deviceForm,loopNo:e.target.value})}/></Field>
          <Field label="Address"><Input value={deviceForm.addressNo} onChange={e=>setDeviceForm({...deviceForm,addressNo:e.target.value})}/></Field>
          <Field label={isAr?"المبنى":"Building"}><Input value={deviceForm.building} onChange={e=>setDeviceForm({...deviceForm,building:e.target.value})}/></Field>
          <Field label={isAr?"الطابق":"Floor"}><Input value={deviceForm.floor} onChange={e=>setDeviceForm({...deviceForm,floor:e.target.value})}/></Field>
          <Field label={isAr?"المنطقة":"Area"}><Input value={deviceForm.area} onChange={e=>setDeviceForm({...deviceForm,area:e.target.value})}/></Field>
          <Field label={isAr?"الموقع الدقيق":"Exact Location"}><Input value={deviceForm.exactLocation} onChange={e=>setDeviceForm({...deviceForm,exactLocation:e.target.value})}/></Field>
          <Field label="Protocol"><Input value={deviceForm.protocol} onChange={e=>setDeviceForm({...deviceForm,protocol:e.target.value})}/></Field>
        </div>}

        {dialog==="exit"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"رمز المخرج":"Exit Code"}><Input value={exitForm.exitCode} onChange={e=>setExitForm({...exitForm,exitCode:e.target.value})}/></Field>
          <Field label={isAr?"الاسم":"Name"}><Input value={exitForm.name} onChange={e=>setExitForm({...exitForm,name:e.target.value})}/></Field>
          <Field label={isAr?"المبنى":"Building"}><Input value={exitForm.building} onChange={e=>setExitForm({...exitForm,building:e.target.value})}/></Field>
          <Field label={isAr?"الطابق":"Floor"}><Input value={exitForm.floor} onChange={e=>setExitForm({...exitForm,floor:e.target.value})}/></Field>
          <Field label={isAr?"المنطقة":"Area"}><Input value={exitForm.area} onChange={e=>setExitForm({...exitForm,area:e.target.value})}/></Field>
          <Field label={isAr?"نقطة التجمع":"Assembly Point"}><Input value={exitForm.assemblyPoint} onChange={e=>setExitForm({...exitForm,assemblyPoint:e.target.value})}/></Field>
          <Field label={isAr?"نوع الباب":"Door Type"}><Input value={exitForm.doorType} onChange={e=>setExitForm({...exitForm,doorType:e.target.value})}/></Field>
          <Field label="Gateway"><Select value={exitForm.gatewayId} onValueChange={v=>setExitForm({...exitForm,gatewayId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{gateways.map(g=><SelectItem key={g.id} value={g.id}>{g.gatewayCode}</SelectItem>)}</SelectContent></Select></Field>
          <div className="space-y-1 sm:col-span-2"><Label>{isAr?"مسار الإخلاء":"Evacuation Route"}</Label><Textarea value={exitForm.routeDescription} onChange={e=>setExitForm({...exitForm,routeDescription:e.target.value})}/></div>
        </div>}

        {dialog==="fire-event"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"الجهاز":"Device"}><Select value={fireEventForm.deviceId} onValueChange={v=>setFireEventForm({...fireEventForm,deviceId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.deviceCode}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"اللوحة":"Panel"}><Select value={fireEventForm.panelId} onValueChange={v=>setFireEventForm({...fireEventForm,panelId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{panels.map(p=><SelectItem key={p.id} value={p.id}>{p.panelCode}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"الحدث":"Event"}><Select value={fireEventForm.eventType} onValueChange={v=>setFireEventForm({...fireEventForm,eventType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["alarm","pre_alarm","fault","supervisory","offline","normal","test","maintenance"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"الشدة":"Severity"}><Select value={fireEventForm.severity} onValueChange={v=>setFireEventForm({...fireEventForm,severity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["info","low","medium","high","critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <div className="space-y-1 sm:col-span-2"><Label>{isAr?"الرسالة":"Message"}</Label><Textarea value={fireEventForm.message} onChange={e=>setFireEventForm({...fireEventForm,message:e.target.value})}/></div>
        </div>}

        {dialog==="exit-event"&&<div className="grid gap-3 sm:grid-cols-2">
          <Field label={isAr?"المخرج":"Exit"}><Select value={exitEventForm.exitId} onValueChange={v=>setExitEventForm({...exitEventForm,exitId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{exits.map(e=><SelectItem key={e.id} value={e.id}>{e.exitCode} — {e.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"الحدث":"Event"}><Select value={exitEventForm.eventType} onValueChange={v=>setExitEventForm({...exitEventForm,eventType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["open","closed","blocked","locked","released","panic_bar_fault","exit_sign_fault","emergency_light_fault","offline","normal","inspection_due","test"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={isAr?"الشدة":"Severity"}><Select value={exitEventForm.severity} onValueChange={v=>setExitEventForm({...exitEventForm,severity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["info","low","medium","high","critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
          <div className="space-y-1 sm:col-span-2"><Label>{isAr?"الرسالة":"Message"}</Label><Textarea value={exitEventForm.message} onChange={e=>setExitEventForm({...exitEventForm,message:e.target.value})}/></div>
        </div>}

        <DialogFooter><Button variant="outline" onClick={()=>setDialog(null)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void saveDialog()} disabled={saving}>{saving?(isAr?"جارٍ الحفظ...":"Saving..."):(isAr?"حفظ":"Save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function Field({label,children}:{label:string;children:any}){
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, KeyRound, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, UnlockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Isolation={
  id:string;lotoNo:string;permitId?:string|null;equipmentName:string;assetRef?:string|null;department?:string|null;factory?:string|null;area?:string|null;
  isolationType:string;status:string;authorizedEmployeeId?:string|null;verifiedByUserId?:string|null;zeroEnergyVerified:boolean;
  startAt?:string|null;verifiedAt?:string|null;releasedAt?:string|null;closedAt?:string|null;notes?:string|null;createdAt:string;
};
type Point={id:string;isolationId:string;pointCode:string;energyType:string;location?:string|null;normalState?:string|null;isolatedState?:string|null;verificationMethod?:string|null;status:string;};
type Lock={id:string;isolationId:string;pointId?:string|null;lockNumber:string;tagNumber?:string|null;appliedByEmployeeId?:string|null;appliedAt:string;removedAt?:string|null;status:string;notes?:string|null;};
type Permit={id:string;permitNo:string;title:string;status:string;lotoRequired:boolean;};
type Employee={id:string;name:string;employeeId?:string|null;title?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString():"—";
const tone=(v:string)=>{const x=v.toLowerCase();if(["active","verified","isolated","applied"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";if(["planned","pending"].includes(x))return"bg-amber-500/10 text-amber-700 border-amber-500/30";if(["released","closed","removed"].includes(x))return"bg-slate-500/10 text-slate-700 border-slate-500/30";return"bg-red-500/10 text-red-700 border-red-500/30";};

export default function AdminLotoPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Isolation|null>(null);
  const [saving,setSaving]=useState(false);
  const [pointForm,setPointForm]=useState({pointCode:"",energyType:"electrical",location:"",normalState:"",isolatedState:"",verificationMethod:""});
  const [lockForm,setLockForm]=useState({pointId:"none",lockNumber:"",tagNumber:"",appliedByEmployeeId:"none",notes:""});
  const [form,setForm]=useState({permitId:"none",equipmentName:"",assetRef:"",department:"",factory:"",area:"",isolationType:"multi",authorizedEmployeeId:"none",startAt:"",notes:""});

  const isolationsQ=useQuery<Isolation[]>({queryKey:["loto-isolations"],queryFn:()=>load("/api/data?resource=loto-isolations")});
  const permitsQ=useQuery<Permit[]>({queryKey:["loto-permits"],queryFn:()=>load("/api/data?resource=ptw-permits")});
  const employeesQ=useQuery<Employee[]>({queryKey:["loto-employees"],queryFn:()=>load("/api/data?resource=employee-directory")});
  const pointsQ=useQuery<Point[]>({queryKey:["loto-points",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=loto-points&isolationId=${selected!.id}`)});
  const locksQ=useQuery<Lock[]>({queryKey:["loto-locks",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=loto-locks&isolationId=${selected!.id}`)});

  const isolations=isolationsQ.data||[];
  const permits=permitsQ.data||[];
  const employees=employeesQ.data||[];
  const points=pointsQ.data||[];
  const locks=locksQ.data||[];

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return isolations.filter(i=>!q||[i.lotoNo,i.equipmentName,i.assetRef,i.department,i.area].some(v=>String(v||"").toLowerCase().includes(q)));},[isolations,search]);
  const metrics=useMemo(()=>({active:isolations.filter(i=>i.status==="Active").length,verified:isolations.filter(i=>i.status==="Verified").length,locks:locks.filter(l=>l.status==="Applied").length,open:isolations.filter(i=>!["Released","Closed","Cancelled"].includes(i.status)).length}),[isolations,locks]);

  const refresh=()=>Promise.all([
    qc.invalidateQueries({queryKey:["loto-isolations"]}),
    qc.invalidateQueries({queryKey:["loto-points"]}),
    qc.invalidateQueries({queryKey:["loto-locks"]}),
    qc.invalidateQueries({queryKey:["loto-permits"]})
  ]);

  const createIsolation=async()=>{
    if(!form.equipmentName.trim())return toast.error(isAr?"اسم المعدة مطلوب":"Equipment name is required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=loto-isolations",{
        permitId:form.permitId==="none"?null:form.permitId,equipmentName:form.equipmentName.trim(),assetRef:form.assetRef.trim(),
        department:form.department.trim(),factory:form.factory.trim(),area:form.area.trim(),isolationType:form.isolationType,
        status:"Planned",authorizedEmployeeId:form.authorizedEmployeeId==="none"?null:form.authorizedEmployeeId,
        startAt:form.startAt?new Date(form.startAt).toISOString():null,notes:form.notes.trim(),zeroEnergyVerified:false
      });
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create LOTO");
      toast.success(isAr?"تم إنشاء سجل LOTO":"LOTO record created");setOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create LOTO");}finally{setSaving(false);}
  };

  const patchIsolation=async(patch:any)=>{
    if(!selected)return;
    setSaving(true);
    try{
      const r=await apiRequest("PATCH",`/api/data?resource=loto-isolations&id=${selected.id}`,patch);
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to update LOTO");
      setSelected(p);toast.success(isAr?"تم تحديث LOTO":"LOTO updated");await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to update LOTO");}finally{setSaving(false);}
  };

  const addPoint=async()=>{
    if(!selected||!pointForm.pointCode.trim())return;
    const r=await apiRequest("POST","/api/data?resource=loto-points",{isolationId:selected.id,...pointForm,status:"Pending"});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add point");
    setPointForm({pointCode:"",energyType:"electrical",location:"",normalState:"",isolatedState:"",verificationMethod:""});
    await qc.invalidateQueries({queryKey:["loto-points",selected.id]});
  };

  const patchPoint=async(point:Point,status:string)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=loto-points&id=${point.id}`,{status});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to update point");
    await qc.invalidateQueries({queryKey:["loto-points",selected?.id]});
  };

  const addLock=async()=>{
    if(!selected||!lockForm.lockNumber.trim())return;
    const r=await apiRequest("POST","/api/data?resource=loto-locks",{
      isolationId:selected.id,pointId:lockForm.pointId==="none"?null:lockForm.pointId,lockNumber:lockForm.lockNumber.trim(),
      tagNumber:lockForm.tagNumber.trim(),appliedByEmployeeId:lockForm.appliedByEmployeeId==="none"?null:lockForm.appliedByEmployeeId,notes:lockForm.notes.trim(),status:"Applied"
    });
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add lock");
    setLockForm({pointId:"none",lockNumber:"",tagNumber:"",appliedByEmployeeId:"none",notes:""});
    await qc.invalidateQueries({queryKey:["loto-locks",selected.id]});
  };

  const removeLock=async(lock:Lock)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=loto-locks&id=${lock.id}`,{status:"Removed",removedAt:new Date().toISOString()});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to remove lock");
    await qc.invalidateQueries({queryKey:["loto-locks",selected?.id]});
  };

  const nextActions=()=>{
    if(!selected)return null;
    if(selected.status==="Planned")return <Button onClick={()=>void patchIsolation({status:"Active",startAt:selected.startAt||new Date().toISOString()})}>{isAr?"بدء العزل":"Start Isolation"}</Button>;
    if(selected.status==="Active")return <div className="flex gap-2"><Button variant="outline" onClick={()=>void patchIsolation({zeroEnergyVerified:true})}>{isAr?"تأكيد صفر طاقة":"Confirm Zero Energy"}</Button><Button onClick={()=>void patchIsolation({status:"Verified",zeroEnergyVerified:true,verifiedByUserId:currentUser?.id||null})}>{isAr?"تحقق من العزل":"Verify LOTO"}</Button></div>;
    if(selected.status==="Verified")return <Button onClick={()=>void patchIsolation({status:"Released"})}><UnlockKeyhole className="me-2 h-4 w-4"/>{isAr?"فك العزل":"Release LOTO"}</Button>;
    if(selected.status==="Released")return <Button onClick={()=>void patchIsolation({status:"Closed"})}>{isAr?"إغلاق السجل":"Close Record"}</Button>;
    return null;
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-white"><LockKeyhole className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"مركز عزل الطاقة LOTO":"LOTO Energy Isolation Center"}</h1><p className="text-xs text-muted-foreground">{isAr?"نقاط عزل وLocks وZero-Energy Verification مرتبطة بتصاريح العمل":"Isolation points, locks and zero-energy verification linked to PTW"}</p></div></div>
      <div className="flex gap-2"><Link href="/admin/permits"><Button variant="outline"><FilePermitIcon/>{isAr?"PTW":"PTW"}</Button></Link><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"عزل جديد":"New LOTO"}</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={isAr?"نشطة":"Active"} value={metrics.active} icon={<LockKeyhole className="h-4 w-4 text-rose-600"/>}/>
      <Metric label={isAr?"تم التحقق":"Verified"} value={metrics.verified} icon={<ShieldCheck className="h-4 w-4 text-emerald-600"/>}/>
      <Metric label={isAr?"سجلات مفتوحة":"Open Records"} value={metrics.open} icon={<KeyRound className="h-4 w-4 text-amber-600"/>}/>
      <Metric label={isAr?"Locks مطبقة في السجل المفتوح":"Applied Locks"} value={metrics.locks} icon={<CheckCircle2 className="h-4 w-4 text-blue-600"/>}/>
    </div>

    <Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث برقم LOTO أو المعدة...":"Search LOTO number or equipment..."}/></div>
      <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>LOTO</TableHead><TableHead>{isAr?"المعدة":"Equipment"}</TableHead><TableHead>PTW</TableHead><TableHead>{isAr?"النوع":"Type"}</TableHead><TableHead>{isAr?"صفر الطاقة":"Zero Energy"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(i=><TableRow key={i.id} className="cursor-pointer" onClick={()=>setSelected(i)}><TableCell className="font-semibold">{i.lotoNo}</TableCell><TableCell><p>{i.equipmentName}</p><p className="text-xs text-muted-foreground">{i.assetRef||"—"}</p></TableCell><TableCell>{permits.find(p=>p.id===i.permitId)?.permitNo||"—"}</TableCell><TableCell>{i.isolationType}</TableCell><TableCell>{i.zeroEnergyVerified?<Badge className="bg-emerald-600">{isAr?"مؤكد":"Verified"}</Badge>:<Badge variant="outline">{isAr?"غير مؤكد":"Pending"}</Badge>}</TableCell><TableCell><Badge variant="outline" className={tone(i.status)}>{i.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
    </CardContent></Card>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isAr?"إنشاء سجل LOTO":"Create LOTO Isolation"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="PTW"><Select value={form.permitId} onValueChange={v=>setForm({...form,permitId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{permits.filter(p=>!["Closed","Rejected","Expired"].includes(p.status)).map(p=><SelectItem key={p.id} value={p.id}>{p.permitNo} · {p.title}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"نوع الطاقة":"Isolation Type"}><Select value={form.isolationType} onValueChange={v=>setForm({...form,isolationType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["electrical","mechanical","hydraulic","pneumatic","thermal","chemical","gravity","multi"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"اسم المعدة":"Equipment Name"} wide><Input value={form.equipmentName} onChange={e=>setForm({...form,equipmentName:e.target.value})}/></Field>
        <Field label={isAr?"مرجع الأصل":"Asset Ref"}><Input value={form.assetRef} onChange={e=>setForm({...form,assetRef:e.target.value})}/></Field>
        <Field label={isAr?"المسؤول المعتمد":"Authorized Employee"}><Select value={form.authorizedEmployeeId} onValueChange={v=>setForm({...form,authorizedEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name} · {e.employeeId||"—"}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"القسم":"Department"}><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></Field>
        <Field label={isAr?"المصنع":"Factory"}><Input value={form.factory} onChange={e=>setForm({...form,factory:e.target.value})}/></Field>
        <Field label={isAr?"المنطقة":"Area"}><Input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></Field>
        <Field label={isAr?"وقت البدء":"Start"}><Input type="datetime-local" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})}/></Field>
        <Field label={isAr?"ملاحظات":"Notes"} wide><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createIsolation()} disabled={saving}>{isAr?"إنشاء":"Create"}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">{selected&&<>
      <DialogHeader><DialogTitle>{selected.lotoNo} — {selected.equipmentName}</DialogTitle></DialogHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="space-y-3 p-4"><Data label={isAr?"الحالة":"Status"} value={selected.status}/><Data label={isAr?"نوع العزل":"Isolation Type"} value={selected.isolationType}/><Data label="PTW" value={permits.find(p=>p.id===selected.permitId)?.permitNo||"—"}/><Data label={isAr?"صفر الطاقة":"Zero Energy"} value={selected.zeroEnergyVerified?(isAr?"مؤكد":"Verified"):(isAr?"غير مؤكد":"Pending")}/><div className="pt-2">{nextActions()}</div></CardContent></Card>
        <Card><CardContent className="space-y-2 p-4"><Data label={isAr?"البداية":"Start"} value={fmt(selected.startAt)}/><Data label={isAr?"تم التحقق":"Verified At"} value={fmt(selected.verifiedAt)}/><Data label={isAr?"تم الفك":"Released At"} value={fmt(selected.releasedAt)}/><Data label={isAr?"المنطقة":"Area"} value={selected.area||"—"}/></CardContent></Card>
      </div>

      <Card><CardContent className="space-y-3 p-4"><h3 className="font-semibold">{isAr?"نقاط العزل":"Isolation Points"}</h3>
        <div className="grid gap-2 md:grid-cols-3"><Input placeholder={isAr?"رمز النقطة":"Point code"} value={pointForm.pointCode} onChange={e=>setPointForm({...pointForm,pointCode:e.target.value})}/><Select value={pointForm.energyType} onValueChange={v=>setPointForm({...pointForm,energyType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["electrical","mechanical","hydraulic","pneumatic","thermal","chemical","gravity"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input placeholder={isAr?"الموقع":"Location"} value={pointForm.location} onChange={e=>setPointForm({...pointForm,location:e.target.value})}/><Input placeholder={isAr?"الحالة الطبيعية":"Normal state"} value={pointForm.normalState} onChange={e=>setPointForm({...pointForm,normalState:e.target.value})}/><Input placeholder={isAr?"حالة العزل":"Isolated state"} value={pointForm.isolatedState} onChange={e=>setPointForm({...pointForm,isolatedState:e.target.value})}/><div className="flex gap-2"><Input placeholder={isAr?"طريقة التحقق":"Verification method"} value={pointForm.verificationMethod} onChange={e=>setPointForm({...pointForm,verificationMethod:e.target.value})}/><Button onClick={()=>void addPoint()}><Plus className="h-4 w-4"/></Button></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"النقطة":"Point"}</TableHead><TableHead>{isAr?"الطاقة":"Energy"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{points.map(p=><TableRow key={p.id}><TableCell>{p.pointCode}</TableCell><TableCell>{p.energyType}</TableCell><TableCell>{p.location||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(p.status)}>{p.status}</Badge></TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>void patchPoint(p,"Isolated")}>{isAr?"عزل":"Isolate"}</Button><Button size="sm" onClick={()=>void patchPoint(p,"Verified")}>{isAr?"تحقق":"Verify"}</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-4"><h3 className="font-semibold">{isAr?"الأقفال والبطاقات":"Locks & Tags"}</h3>
        <div className="grid gap-2 md:grid-cols-4"><Select value={lockForm.pointId} onValueChange={v=>setLockForm({...lockForm,pointId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{isAr?"بدون نقطة محددة":"No point"}</SelectItem>{points.map(p=><SelectItem key={p.id} value={p.id}>{p.pointCode}</SelectItem>)}</SelectContent></Select><Input placeholder={isAr?"رقم القفل":"Lock #"} value={lockForm.lockNumber} onChange={e=>setLockForm({...lockForm,lockNumber:e.target.value})}/><Input placeholder={isAr?"رقم البطاقة":"Tag #"} value={lockForm.tagNumber} onChange={e=>setLockForm({...lockForm,tagNumber:e.target.value})}/><div className="flex gap-2"><Select value={lockForm.appliedByEmployeeId} onValueChange={v=>setLockForm({...lockForm,appliedByEmployeeId:v})}><SelectTrigger><SelectValue placeholder={isAr?"الموظف":"Employee"}/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><Button onClick={()=>void addLock()}><Plus className="h-4 w-4"/></Button></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"القفل":"Lock"}</TableHead><TableHead>{isAr?"البطاقة":"Tag"}</TableHead><TableHead>{isAr?"النقطة":"Point"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{locks.map(l=><TableRow key={l.id}><TableCell>{l.lockNumber}</TableCell><TableCell>{l.tagNumber||"—"}</TableCell><TableCell>{points.find(p=>p.id===l.pointId)?.pointCode||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(l.status)}>{l.status}</Badge></TableCell><TableCell>{l.status==="Applied"&&<Button size="sm" variant="outline" onClick={()=>void removeLock(l)}>{isAr?"إزالة":"Remove"}</Button>}</TableCell></TableRow>)}</TableBody></Table></div>
      </CardContent></Card>
    </>}</DialogContent></Dialog>
  </div>;
}
function FilePermitIcon(){return <KeyRound className="me-2 h-4 w-4"/>}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Data({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-end font-medium">{value}</span></div>}

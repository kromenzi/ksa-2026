import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, QrCode, RefreshCw, Search, ShieldCheck, Truck, Wrench, Plus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Asset={id:string;assetCode:string;name:string;equipmentType:string;serialNumber?:string|null;manufacturer?:string|null;model?:string|null;department?:string|null;factory?:string|null;area?:string|null;status:string;riskRating:string;qrCode?:string|null;certificateNumber?:string|null;certificateExpiry?:string|null;nextInspectionDate?:string|null;nextMaintenanceDate?:string|null;operatorAuthorizationRequired:boolean;lotoRequired:boolean;notes?:string|null;};
type Defect={id:string;defectNo:string;assetId:string;description:string;severity:string;status:string;reportedAt:string;actionId?:string|null;resolutionNotes?:string|null;};
type Service={id:string;assetId:string;serviceType:string;performedAt:string;nextDue?:string|null;result:string;provider?:string|null;technician?:string|null;notes?:string|null;attachmentUrl?:string|null;};
type Auth={id:string;assetId:string;employeeId:string;authorizationType:string;issueDate:string;expiryDate?:string|null;status:string;certificateRef?:string|null;};
type Employee={id:string;name:string;employeeId?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const tone=(v:string)=>{const x=v.toLowerCase();if(["critical","out of service","open","fail","expired"].includes(x))return"bg-red-500/10 text-red-700 border-red-500/30";if(["high","restricted","maintenance","in progress","conditional"].includes(x))return"bg-orange-500/10 text-orange-700 border-orange-500/30";if(["operational","verified","pass","completed","active"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};
const due=(v?:string|null)=>Boolean(v&&new Date(v).getTime()<Date.now());

export default function EquipmentSafetyPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [assetOpen,setAssetOpen]=useState(false);
  const [selected,setSelected]=useState<Asset|null>(null);
  const [saving,setSaving]=useState(false);
  const [assetForm,setAssetForm]=useState({assetCode:"",name:"",equipmentType:"Forklift",serialNumber:"",manufacturer:"",model:"",department:"",factory:"",area:"",riskRating:"Medium",certificateNumber:"",certificateExpiry:"",nextInspectionDate:"",nextMaintenanceDate:"",operatorAuthorizationRequired:false,lotoRequired:false,notes:""});
  const [defectForm,setDefectForm]=useState({description:"",severity:"Medium",reportedByEmployeeId:"none"});
  const [serviceForm,setServiceForm]=useState({serviceType:"Inspection",performedAt:new Date().toISOString().slice(0,10),nextDue:"",result:"Pass",provider:"",technician:"",notes:""});
  const [authForm,setAuthForm]=useState({employeeId:"none",authorizationType:"Operator",issueDate:new Date().toISOString().slice(0,10),expiryDate:"",certificateRef:""});

  const assetsQ=useQuery<Asset[]>({queryKey:["equipment-safety-assets"],queryFn:()=>load("/api/data?resource=equipment-safety-assets")});
  const employeesQ=useQuery<Employee[]>({queryKey:["equipment-workforce"],queryFn:()=>load("/api/data?resource=employee-directory&type=workforce")});
  const defectsQ=useQuery<Defect[]>({queryKey:["equipment-defects",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=equipment-defects&assetId=${selected!.id}`)});
  const servicesQ=useQuery<Service[]>({queryKey:["equipment-services",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=equipment-service-records&assetId=${selected!.id}`)});
  const authQ=useQuery<Auth[]>({queryKey:["equipment-auth",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=equipment-operator-authorizations&assetId=${selected!.id}`)});

  const assets=assetsQ.data||[],employees=employeesQ.data||[],defects=defectsQ.data||[],services=servicesQ.data||[],auths=authQ.data||[];
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return assets.filter(a=>!q||[a.assetCode,a.name,a.equipmentType,a.department,a.factory,a.area].some(v=>String(v||"").toLowerCase().includes(q)));},[assets,search]);
  const metrics=useMemo(()=>({
    total:assets.length,
    restricted:assets.filter(a=>["Restricted","Out of Service"].includes(a.status)).length,
    overdue:assets.filter(a=>due(a.certificateExpiry)||due(a.nextInspectionDate)||due(a.nextMaintenanceDate)).length,
    criticalDefects:assets.reduce((n,a)=>n+(a.status==="Out of Service"?1:0),0)
  }),[assets]);

  const refresh=()=>Promise.all([
    qc.invalidateQueries({queryKey:["equipment-safety-assets"]}),
    qc.invalidateQueries({queryKey:["equipment-defects"]}),
    qc.invalidateQueries({queryKey:["equipment-services"]}),
    qc.invalidateQueries({queryKey:["equipment-auth"]})
  ]);

  const createAsset=async()=>{
    if(!assetForm.assetCode.trim()||!assetForm.name.trim())return toast.error(isAr?"رمز واسم المعدة مطلوبان":"Asset code and name are required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=equipment-safety-assets",{
        ...assetForm,status:"Operational",qrCode:`EQUIP-${assetForm.assetCode.trim()}-${Date.now()}`,
        certificateExpiry:assetForm.certificateExpiry||null,nextInspectionDate:assetForm.nextInspectionDate||null,nextMaintenanceDate:assetForm.nextMaintenanceDate||null,data:{}
      });const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create asset");
      toast.success(isAr?"تم إنشاء Safety Passport":"Safety Passport created");setAssetOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create asset");}finally{setSaving(false);}
  };

  const addDefect=async()=>{
    if(!selected||!defectForm.description.trim())return;
    const r=await apiRequest("POST","/api/data?resource=equipment-defects",{
      assetId:selected.id,description:defectForm.description.trim(),severity:defectForm.severity,status:"Open",
      reportedByEmployeeId:defectForm.reportedByEmployeeId==="none"?null:defectForm.reportedByEmployeeId
    });const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add defect");
    toast.success(p.actionId?(isAr?"تم تسجيل العطل وإنشاء CAPA":"Defect recorded and CAPA created"):(isAr?"تم تسجيل العطل":"Defect recorded"));
    setDefectForm({description:"",severity:"Medium",reportedByEmployeeId:"none"});await refresh();
  };

  const addService=async()=>{
    if(!selected)return;
    const r=await apiRequest("POST","/api/data?resource=equipment-service-records",{
      assetId:selected.id,...serviceForm,nextDue:serviceForm.nextDue||null
    });const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add service");
    const patch:any={};
    if(serviceForm.serviceType==="Inspection"){patch.lastInspectionDate=serviceForm.performedAt;patch.nextInspectionDate=serviceForm.nextDue||null;}
    if(["Maintenance","Repair"].includes(serviceForm.serviceType)){patch.lastMaintenanceDate=serviceForm.performedAt;patch.nextMaintenanceDate=serviceForm.nextDue||null;}
    if(serviceForm.serviceType==="Certification"){patch.certificateExpiry=serviceForm.nextDue||null;}
    if(Object.keys(patch).length){await apiRequest("PATCH",`/api/data?resource=equipment-safety-assets&id=${selected.id}`,patch);}
    toast.success(isAr?"تم تسجيل الخدمة":"Service record added");await refresh();
  };

  const addAuthorization=async()=>{
    if(!selected||authForm.employeeId==="none")return toast.error(isAr?"اختر الموظف":"Select employee");
    const r=await apiRequest("POST","/api/data?resource=equipment-operator-authorizations",{
      assetId:selected.id,...authForm,expiryDate:authForm.expiryDate||null,status:"Active"
    });const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to authorize operator");
    toast.success(isAr?"تمت إضافة صلاحية المشغل":"Operator authorization added");await refresh();
  };

  const resolveDefect=async(d:Defect)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=equipment-defects&id=${d.id}`,{status:"Resolved",resolvedAt:new Date().toISOString(),resolutionNotes:"Resolved",verifiedByUserId:currentUser?.id||null});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to resolve defect");await refresh();
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white"><Truck className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"جواز سلامة المعدات":"Equipment Safety Passport"}</h1><p className="text-xs text-muted-foreground">{isAr?"شهادات وفحوصات وصيانة وأعطال وتصاريح المشغلين لكل معدة":"Certificates, inspections, maintenance, defects and operator authorizations per asset"}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setAssetOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"معدة جديدة":"New Asset"}</Button></div></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={isAr?"إجمالي المعدات":"Total Assets"} value={metrics.total} icon={<Truck className="h-4 w-4"/>}/><Metric label={isAr?"مقيدة / خارج الخدمة":"Restricted / OOS"} value={metrics.restricted} icon={<AlertTriangle className="h-4 w-4 text-red-600"/>}/><Metric label={isAr?"استحقاقات متأخرة":"Overdue Items"} value={metrics.overdue} icon={<Wrench className="h-4 w-4 text-orange-600"/>}/><Metric label={isAr?"حرجة":"Critical"} value={metrics.criticalDefects} icon={<ShieldCheck className="h-4 w-4 text-red-600"/>}/></div>

    <Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث برمز المعدة أو النوع أو الموقع...":"Search asset code, type or location..."}/></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"المعدة":"Asset"}</TableHead><TableHead>{isAr?"النوع":"Type"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"الشهادة":"Certificate"}</TableHead><TableHead>{isAr?"الفحص القادم":"Next Inspection"}</TableHead><TableHead>{isAr?"الصيانة القادمة":"Next Maintenance"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(a=><TableRow key={a.id} className="cursor-pointer" onClick={()=>setSelected(a)}><TableCell><p className="font-semibold">{a.assetCode}</p><p className="text-xs text-muted-foreground">{a.name}</p></TableCell><TableCell>{a.equipmentType}</TableCell><TableCell>{a.factory||"—"} / {a.area||"—"}</TableCell><TableCell className={due(a.certificateExpiry)?"text-red-600":""}>{a.certificateExpiry||"—"}</TableCell><TableCell className={due(a.nextInspectionDate)?"text-red-600":""}>{a.nextInspectionDate||"—"}</TableCell><TableCell className={due(a.nextMaintenanceDate)?"text-red-600":""}>{a.nextMaintenanceDate||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(a.status)}>{a.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

    <Dialog open={assetOpen} onOpenChange={setAssetOpen}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{isAr?"إنشاء جواز سلامة للمعدة":"Create Equipment Safety Passport"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"رمز المعدة":"Asset Code"}><Input value={assetForm.assetCode} onChange={e=>setAssetForm({...assetForm,assetCode:e.target.value})}/></Field><Field label={isAr?"الاسم":"Name"}><Input value={assetForm.name} onChange={e=>setAssetForm({...assetForm,name:e.target.value})}/></Field>
      <Field label={isAr?"النوع":"Equipment Type"}><Select value={assetForm.equipmentType} onValueChange={v=>setAssetForm({...assetForm,equipmentType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Forklift","Overhead Crane","Machine","Electrical Equipment","Fire Equipment","Vehicle","Other"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label={isAr?"المخاطر":"Risk Rating"}><Select value={assetForm.riskRating} onValueChange={v=>setAssetForm({...assetForm,riskRating:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Serial"><Input value={assetForm.serialNumber} onChange={e=>setAssetForm({...assetForm,serialNumber:e.target.value})}/></Field><Field label={isAr?"الشركة المصنعة":"Manufacturer"}><Input value={assetForm.manufacturer} onChange={e=>setAssetForm({...assetForm,manufacturer:e.target.value})}/></Field>
      <Field label="Model"><Input value={assetForm.model} onChange={e=>setAssetForm({...assetForm,model:e.target.value})}/></Field><Field label={isAr?"القسم":"Department"}><Input value={assetForm.department} onChange={e=>setAssetForm({...assetForm,department:e.target.value})}/></Field>
      <Field label={isAr?"المصنع":"Factory"}><Input value={assetForm.factory} onChange={e=>setAssetForm({...assetForm,factory:e.target.value})}/></Field><Field label={isAr?"المنطقة":"Area"}><Input value={assetForm.area} onChange={e=>setAssetForm({...assetForm,area:e.target.value})}/></Field>
      <Field label={isAr?"رقم الشهادة":"Certificate #"}><Input value={assetForm.certificateNumber} onChange={e=>setAssetForm({...assetForm,certificateNumber:e.target.value})}/></Field><Field label={isAr?"انتهاء الشهادة":"Certificate Expiry"}><Input type="date" value={assetForm.certificateExpiry} onChange={e=>setAssetForm({...assetForm,certificateExpiry:e.target.value})}/></Field>
      <Field label={isAr?"الفحص القادم":"Next Inspection"}><Input type="date" value={assetForm.nextInspectionDate} onChange={e=>setAssetForm({...assetForm,nextInspectionDate:e.target.value})}/></Field><Field label={isAr?"الصيانة القادمة":"Next Maintenance"}><Input type="date" value={assetForm.nextMaintenanceDate} onChange={e=>setAssetForm({...assetForm,nextMaintenanceDate:e.target.value})}/></Field>
      <Button type="button" variant={assetForm.operatorAuthorizationRequired?"default":"outline"} onClick={()=>setAssetForm({...assetForm,operatorAuthorizationRequired:!assetForm.operatorAuthorizationRequired})}>{isAr?"Operator Authorization":"Operator Authorization"}</Button><Button type="button" variant={assetForm.lotoRequired?"default":"outline"} onClick={()=>setAssetForm({...assetForm,lotoRequired:!assetForm.lotoRequired})}>LOTO</Button>
      <Field label={isAr?"ملاحظات":"Notes"} wide><Textarea value={assetForm.notes} onChange={e=>setAssetForm({...assetForm,notes:e.target.value})}/></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setAssetOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createAsset()} disabled={saving}>{isAr?"إنشاء":"Create"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">{selected&&<><DialogHeader><DialogTitle>{selected.assetCode} — {selected.name}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-4"><Info label={isAr?"الحالة":"Status"} value={selected.status}/><Info label={isAr?"المخاطر":"Risk"} value={selected.riskRating}/><Info label={isAr?"QR":"QR"} value={selected.qrCode||"—"}/><Info label="LOTO" value={selected.lotoRequired?"Required":"N/A"}/></div>
      <Tabs defaultValue="defects"><TabsList><TabsTrigger value="defects">{isAr?"الأعطال":"Defects"}</TabsTrigger><TabsTrigger value="service">{isAr?"الخدمة":"Service"}</TabsTrigger><TabsTrigger value="operators">{isAr?"المشغلون":"Operators"}</TabsTrigger></TabsList>
        <TabsContent value="defects" className="space-y-3"><div className="grid gap-2 sm:grid-cols-[1fr_160px_220px_auto]"><Input placeholder={isAr?"وصف العطل":"Defect description"} value={defectForm.description} onChange={e=>setDefectForm({...defectForm,description:e.target.value})}/><Select value={defectForm.severity} onValueChange={v=>setDefectForm({...defectForm,severity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={defectForm.reportedByEmployeeId} onValueChange={v=>setDefectForm({...defectForm,reportedByEmployeeId:v})}><SelectTrigger><SelectValue placeholder={isAr?"المبلغ":"Reporter"}/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><Button onClick={()=>void addDefect()}><Plus className="h-4 w-4"/></Button></div><div className="space-y-2">{defects.map(d=><div key={d.id} className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="font-medium">{d.defectNo} — {d.description}</p><div className="mt-1 flex gap-2"><Badge variant="outline" className={tone(d.severity)}>{d.severity}</Badge><Badge variant="outline">{d.status}</Badge>{d.actionId&&<Badge variant="destructive">CAPA</Badge>}</div></div>{!["Resolved","Verified","Cancelled"].includes(d.status)&&<Button size="sm" variant="outline" onClick={()=>void resolveDefect(d)}>{isAr?"حل":"Resolve"}</Button>}</div>)}</div></TabsContent>
        <TabsContent value="service" className="space-y-3"><div className="grid gap-2 md:grid-cols-3"><Select value={serviceForm.serviceType} onValueChange={v=>setServiceForm({...serviceForm,serviceType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Inspection","Maintenance","Repair","Certification","Load Test","Calibration"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input type="date" value={serviceForm.performedAt} onChange={e=>setServiceForm({...serviceForm,performedAt:e.target.value})}/><Input type="date" value={serviceForm.nextDue} onChange={e=>setServiceForm({...serviceForm,nextDue:e.target.value})}/><Input placeholder={isAr?"المزود":"Provider"} value={serviceForm.provider} onChange={e=>setServiceForm({...serviceForm,provider:e.target.value})}/><Input placeholder={isAr?"الفني":"Technician"} value={serviceForm.technician} onChange={e=>setServiceForm({...serviceForm,technician:e.target.value})}/><Button onClick={()=>void addService()}>{isAr?"إضافة سجل":"Add Record"}</Button></div><div className="space-y-2">{services.map(s=><div key={s.id} className="rounded-lg border p-3"><div className="flex justify-between"><span className="font-medium">{s.serviceType}</span><Badge variant="outline" className={tone(s.result)}>{s.result}</Badge></div><p className="text-xs text-muted-foreground">{s.performedAt} → {s.nextDue||"—"} · {s.provider||"—"}</p></div>)}</div></TabsContent>
        <TabsContent value="operators" className="space-y-3"><div className="grid gap-2 md:grid-cols-4"><Select value={authForm.employeeId} onValueChange={v=>setAuthForm({...authForm,employeeId:v})}><SelectTrigger><SelectValue placeholder={isAr?"الموظف":"Employee"}/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><Input value={authForm.authorizationType} onChange={e=>setAuthForm({...authForm,authorizationType:e.target.value})}/><Input type="date" value={authForm.expiryDate} onChange={e=>setAuthForm({...authForm,expiryDate:e.target.value})}/><Button onClick={()=>void addAuthorization()}>{isAr?"تفويض":"Authorize"}</Button></div><div className="space-y-2">{auths.map(a=><div key={a.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{employees.find(e=>e.id===a.employeeId)?.name||a.employeeId}</p><p className="text-xs text-muted-foreground">{a.authorizationType} · {a.expiryDate||"No expiry"}</p></div><Badge variant="outline" className={tone(a.status)}>{a.status}</Badge></div>)}</div></TabsContent>
      </Tabs>
    </>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-all font-medium">{value}</p></div>}

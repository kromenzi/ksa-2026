import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
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

type Permit={
  id:string;permitNo:string;permitType:string;title:string;description?:string|null;department?:string|null;factory?:string|null;
  area?:string|null;location?:string|null;requesterEmployeeId?:string|null;issuerUserId?:string|null;hseReviewerUserId?:string|null;
  approverUserId?:string|null;status:string;riskLevel:string;startAt?:string|null;expiresAt?:string|null;reviewedAt?:string|null;
  approvedAt?:string|null;activatedAt?:string|null;suspendedAt?:string|null;closedAt?:string|null;suspensionReason?:string|null;
  closureNotes?:string|null;precautions:any[];requiredPpe:any[];gasTestRequired:boolean;gasTestResult:any;lotoRequired:boolean;
  createdAt:string;updatedAt:string;
};
type Employee={id:string;name:string;employeeId?:string|null;department?:string|null;title?:string|null;};
type Loto={id:string;lotoNo:string;permitId?:string|null;status:string;equipmentName:string;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString():"—";
const tone=(v:string)=>{const x=v.toLowerCase();if(["critical","expired","suspended","rejected"].includes(x))return"bg-red-500/10 text-red-700 border-red-500/30";if(["high","pending review","pending approval"].includes(x))return"bg-orange-500/10 text-orange-700 border-orange-500/30";if(["approved","active","closed"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};

export default function AdminPermitsPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Permit|null>(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    permitType:"hot_work",title:"",description:"",department:"",factory:"",area:"",location:"",
    requesterEmployeeId:"none",riskLevel:"Medium",startAt:"",expiresAt:"",lotoRequired:false,
    gasTestRequired:false,precautions:"",requiredPpe:""
  });

  const permitsQ=useQuery<Permit[]>({queryKey:["ptw-permits"],queryFn:()=>load("/api/data?resource=ptw-permits")});
  const employeesQ=useQuery<Employee[]>({queryKey:["ptw-workforce"],queryFn:()=>load("/api/data?resource=employee-directory&type=workforce")});
  const lotoQ=useQuery<Loto[]>({queryKey:["ptw-loto-links"],queryFn:()=>load("/api/data?resource=loto-isolations")});
  const permits=permitsQ.data||[];
  const employees=employeesQ.data||[];
  const loto=lotoQ.data||[];

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return permits.filter(p=>{
      if(statusFilter!=="all"&&p.status!==statusFilter)return false;
      if(!q)return true;
      return [p.permitNo,p.title,p.permitType,p.department,p.location].some(v=>String(v||"").toLowerCase().includes(q));
    });
  },[permits,search,statusFilter]);

  const metrics=useMemo(()=>({
    active:permits.filter(p=>p.status==="Active").length,
    pending:permits.filter(p=>["Pending Review","Pending Approval"].includes(p.status)).length,
    expiring:permits.filter(p=>p.status==="Active"&&p.expiresAt&&new Date(p.expiresAt).getTime()-Date.now()<24*3600*1000).length,
    suspended:permits.filter(p=>p.status==="Suspended").length
  }),[permits]);

  const refresh=()=>Promise.all([
    qc.invalidateQueries({queryKey:["ptw-permits"]}),
    qc.invalidateQueries({queryKey:["ptw-loto-links"]})
  ]);

  const createPermit=async()=>{
    if(!form.title.trim()||!form.startAt||!form.expiresAt)return toast.error(isAr?"العنوان ووقت البداية والانتهاء مطلوبة":"Title, start and expiry are required");
    if(new Date(form.expiresAt)<=new Date(form.startAt))return toast.error(isAr?"وقت الانتهاء يجب أن يكون بعد البداية":"Expiry must be after start");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=ptw-permits",{
        permitType:form.permitType,title:form.title.trim(),description:form.description.trim(),department:form.department.trim(),
        factory:form.factory.trim(),area:form.area.trim(),location:form.location.trim(),
        requesterEmployeeId:form.requesterEmployeeId==="none"?null:form.requesterEmployeeId,
        status:"Draft",riskLevel:form.riskLevel,startAt:new Date(form.startAt).toISOString(),expiresAt:new Date(form.expiresAt).toISOString(),
        lotoRequired:form.lotoRequired,gasTestRequired:form.gasTestRequired,
        precautions:form.precautions.split("\n").map(x=>x.trim()).filter(Boolean),
        requiredPpe:form.requiredPpe.split(",").map(x=>x.trim()).filter(Boolean)
      });
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create permit");
      toast.success(isAr?"تم إنشاء التصريح":"Permit created");
      setOpen(false);setForm({permitType:"hot_work",title:"",description:"",department:"",factory:"",area:"",location:"",requesterEmployeeId:"none",riskLevel:"Medium",startAt:"",expiresAt:"",lotoRequired:false,gasTestRequired:false,precautions:"",requiredPpe:""});
      await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create permit");}finally{setSaving(false);}
  };

  const patch=async(patchData:any)=>{
    if(!selected)return;
    setSaving(true);
    try{
      const r=await apiRequest("PATCH",`/api/data?resource=ptw-permits&id=${selected.id}`,patchData);
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to update permit");
      setSelected(p);toast.success(isAr?"تم تحديث التصريح":"Permit updated");await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to update permit");}finally{setSaving(false);}
  };

  const nextAction=()=>{
    if(!selected)return null;
    if(selected.status==="Draft")return <Button onClick={()=>void patch({status:"Pending Review"})}>{isAr?"إرسال لمراجعة HSE":"Submit for HSE Review"}</Button>;
    if(selected.status==="Pending Review")return <Button onClick={()=>void patch({status:"Pending Approval",hseReviewerUserId:currentUser?.id||null,reviewedAt:new Date().toISOString()})}>{isAr?"مراجعة وإرسال للموافقة":"Review & Send for Approval"}</Button>;
    if(selected.status==="Pending Approval")return <Button onClick={()=>void patch({status:"Approved",approverUserId:currentUser?.id||null})}>{isAr?"اعتماد التصريح":"Approve Permit"}</Button>;
    if(selected.status==="Approved")return <Button onClick={()=>void patch({status:"Active"})}>{isAr?"تفعيل التصريح":"Activate Permit"}</Button>;
    if(selected.status==="Active")return <div className="flex gap-2"><Button variant="destructive" onClick={()=>void patch({status:"Suspended",suspensionReason:"Suspended by HSE"})}>{isAr?"تعليق":"Suspend"}</Button><Button onClick={()=>void patch({status:"Closed",closureNotes:"Permit closed by HSE"})}>{isAr?"إغلاق":"Close"}</Button></div>;
    if(selected.status==="Suspended")return <Button onClick={()=>void patch({status:"Active",suspensionReason:null})}>{isAr?"استئناف":"Resume"}</Button>;
    return null;
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-600 text-white"><FileCheck2 className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"مركز تصاريح العمل PTW":"Permit-to-Work Center"}</h1><p className="text-xs text-muted-foreground">{isAr?"تصاريح تشغيلية مرتبطة بالمراجعة والموافقة وLOTO":"Operational permits linked to review, approval and LOTO"}</p></div></div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/loto"><Button variant="outline"><LockKeyhole className="me-2 h-4 w-4"/>LOTO</Button></Link><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"تصريح جديد":"New Permit"}</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={isAr?"نشطة":"Active"} value={metrics.active} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600"/>}/>
      <Metric label={isAr?"بانتظار الموافقة":"Pending"} value={metrics.pending} icon={<Clock3 className="h-4 w-4 text-orange-600"/>}/>
      <Metric label={isAr?"تنتهي خلال 24 ساعة":"Expiring <24h"} value={metrics.expiring} icon={<AlertTriangle className="h-4 w-4 text-amber-600"/>}/>
      <Metric label={isAr?"معلقة":"Suspended"} value={metrics.suspended} icon={<ShieldCheck className="h-4 w-4 text-red-600"/>}/>
    </div>

    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-2 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث برقم التصريح أو الموقع...":"Search permit number or location..."}/></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل الحالات":"All statuses"}</SelectItem>{["Draft","Pending Review","Pending Approval","Approved","Active","Suspended","Expired","Closed","Rejected"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"التصريح":"Permit"}</TableHead><TableHead>{isAr?"النوع":"Type"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"الصلاحية":"Validity"}</TableHead><TableHead>{isAr?"المخاطر":"Risk"}</TableHead><TableHead>LOTO</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(p=><TableRow key={p.id} className="cursor-pointer" onClick={()=>setSelected(p)}><TableCell><p className="font-semibold">{p.permitNo}</p><p className="max-w-[260px] truncate text-xs text-muted-foreground">{p.title}</p></TableCell><TableCell>{p.permitType}</TableCell><TableCell>{p.factory||"—"} / {p.area||p.location||"—"}</TableCell><TableCell><p className="text-xs">{fmt(p.startAt)}</p><p className="text-xs text-muted-foreground">{fmt(p.expiresAt)}</p></TableCell><TableCell><Badge variant="outline" className={tone(p.riskLevel)}>{p.riskLevel}</Badge></TableCell><TableCell>{p.lotoRequired?<Badge variant="destructive">{isAr?"مطلوب":"Required"}</Badge>:<Badge variant="outline">N/A</Badge>}</TableCell><TableCell><Badge variant="outline" className={tone(p.status)}>{p.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
    </CardContent></Card>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{isAr?"إنشاء تصريح عمل":"Create Permit to Work"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={isAr?"نوع التصريح":"Permit Type"}><Select value={form.permitType} onValueChange={v=>setForm({...form,permitType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["hot_work","electrical","work_at_height","confined_space","excavation","lifting","general"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"مستوى المخاطر":"Risk Level"}><Select value={form.riskLevel} onValueChange={v=>setForm({...form,riskLevel:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"العنوان":"Title"} wide><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
        <Field label={isAr?"الوصف":"Description"} wide><Textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
        <Field label={isAr?"القسم":"Department"}><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></Field>
        <Field label={isAr?"المصنع":"Factory"}><Input value={form.factory} onChange={e=>setForm({...form,factory:e.target.value})}/></Field>
        <Field label={isAr?"المنطقة":"Area"}><Input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></Field>
        <Field label={isAr?"الموقع":"Location"}><Input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field>
        <Field label={isAr?"طالب التصريح":"Requester"}><Select value={form.requesterEmployeeId} onValueChange={v=>setForm({...form,requesterEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name} · {e.employeeId||"—"}</SelectItem>)}</SelectContent></Select></Field>
        <div/>
        <Field label={isAr?"البداية":"Start"}><Input type="datetime-local" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})}/></Field>
        <Field label={isAr?"الانتهاء":"Expiry"}><Input type="datetime-local" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></Field>
        <Field label={isAr?"الاحتياطات - سطر لكل احتياط":"Precautions"} wide><Textarea rows={3} value={form.precautions} onChange={e=>setForm({...form,precautions:e.target.value})}/></Field>
        <Field label={isAr?"PPE مفصولة بفواصل":"Required PPE"} wide><Input value={form.requiredPpe} onChange={e=>setForm({...form,requiredPpe:e.target.value})}/></Field>
        <Button type="button" variant={form.lotoRequired?"default":"outline"} onClick={()=>setForm({...form,lotoRequired:!form.lotoRequired})}>{form.lotoRequired?(isAr?"LOTO مطلوب":"LOTO Required"):(isAr?"يتطلب LOTO":"Require LOTO")}</Button>
        <Button type="button" variant={form.gasTestRequired?"default":"outline"} onClick={()=>setForm({...form,gasTestRequired:!form.gasTestRequired})}>{form.gasTestRequired?(isAr?"Gas Test مطلوب":"Gas Test Required"):(isAr?"يتطلب فحص غاز":"Require Gas Test")}</Button>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createPermit()} disabled={saving}>{isAr?"إنشاء":"Create"}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-w-3xl">{selected&&<>
      <DialogHeader><DialogTitle>{selected.permitNo} — {selected.title}</DialogTitle></DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="space-y-2 p-4 text-sm"><Data label={isAr?"الحالة":"Status"} value={selected.status}/><Data label={isAr?"النوع":"Type"} value={selected.permitType}/><Data label={isAr?"المخاطر":"Risk"} value={selected.riskLevel}/><Data label={isAr?"البداية":"Start"} value={fmt(selected.startAt)}/><Data label={isAr?"الانتهاء":"Expiry"} value={fmt(selected.expiresAt)}/><Data label="LOTO" value={selected.lotoRequired?(isAr?"مطلوب":"Required"):"N/A"}/></CardContent></Card>
        <Card><CardContent className="space-y-2 p-4 text-sm"><Data label={isAr?"القسم":"Department"} value={selected.department||"—"}/><Data label={isAr?"المصنع":"Factory"} value={selected.factory||"—"}/><Data label={isAr?"المنطقة":"Area"} value={selected.area||"—"}/><Data label={isAr?"الموقع":"Location"} value={selected.location||"—"}/><Data label={isAr?"عزل مرتبط":"Linked LOTO"} value={loto.filter(l=>l.permitId===selected.id).map(l=>l.lotoNo+" ("+l.status+")").join(", ")||"—"}/></CardContent></Card>
      </div>
      {selected.lotoRequired&&loto.filter(l=>l.permitId===selected.id&&["Active","Verified"].includes(l.status)).length===0&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{isAr?"لن يسمح النظام بتفعيل التصريح قبل إنشاء LOTO Active/Verified مرتبط به.":"The permit cannot be activated until a linked LOTO is Active/Verified."}</div>}
      <div className="flex flex-wrap justify-end gap-2"><Link href="/admin/loto"><Button variant="outline"><LockKeyhole className="me-2 h-4 w-4"/>{isAr?"فتح LOTO":"Open LOTO"}</Button></Link>{nextAction()}</div>
    </>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Data({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-end font-medium">{value}</span></div>}

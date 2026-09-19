import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileWarning, Plus, RefreshCw, Search, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
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

type Contractor={id:string;contractorCode:string;name:string;companyRegistration?:string|null;scopeOfWork?:string|null;mainContact?:string|null;email?:string|null;phone?:string|null;contractStart?:string|null;contractEnd?:string|null;insuranceExpiry?:string|null;status:string;safetyScore:number;notes?:string|null;};
type Worker={id:string;contractorId:string;workerNo?:string|null;name:string;nationalId?:string|null;jobTitle?:string|null;phone?:string|null;inductionDate?:string|null;inductionExpiry?:string|null;medicalExpiry?:string|null;competencyExpiry?:string|null;status:string;accessAllowed:boolean;blockReason?:string|null;};
type Doc={id:string;contractorId:string;workerId?:string|null;documentType:string;referenceNo?:string|null;issueDate?:string|null;expiryDate?:string|null;status:string;criticalForAccess:boolean;fileUrl?:string|null;notes?:string|null;};
type Score={id:string;contractorId:string;month:number;year:number;inspections:number;violations:number;incidents:number;overdueActions:number;trainingCompliance:number;score:number;rating:string;notes?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const due=(v?:string|null)=>Boolean(v&&new Date(v).getTime()<Date.now());
const tone=(v:string)=>{const x=v.toLowerCase();if(["blocked","expired","suspended","rejected"].includes(x))return"bg-red-500/10 text-red-700 border-red-500/30";if(["conditional","pending"].includes(x))return"bg-orange-500/10 text-orange-700 border-orange-500/30";if(["approved","active","valid","excellent","good"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};

export default function ContractorSafetyPage(){
  const {settings}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [createOpen,setCreateOpen]=useState(false);
  const [selected,setSelected]=useState<Contractor|null>(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:"",companyRegistration:"",scopeOfWork:"",mainContact:"",email:"",phone:"",contractStart:"",contractEnd:"",insuranceExpiry:"",status:"Conditional",notes:""});
  const [workerForm,setWorkerForm]=useState({workerNo:"",name:"",nationalId:"",jobTitle:"",phone:"",inductionDate:"",inductionExpiry:"",medicalExpiry:"",competencyExpiry:""});
  const [docForm,setDocForm]=useState({workerId:"none",documentType:"Training Certificate",referenceNo:"",issueDate:"",expiryDate:"",criticalForAccess:true,fileUrl:"",notes:""});

  const contractorsQ=useQuery<Contractor[]>({queryKey:["contractors"],queryFn:()=>load("/api/data?resource=contractors")});
  const workersQ=useQuery<Worker[]>({queryKey:["contractor-workers",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=contractor-workers&contractorId=${selected!.id}`)});
  const docsQ=useQuery<Doc[]>({queryKey:["contractor-documents",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=contractor-documents&contractorId=${selected!.id}`)});
  const scoresQ=useQuery<Score[]>({queryKey:["contractor-scorecards",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=contractor-scorecards&contractorId=${selected!.id}`)});

  const contractors=contractorsQ.data||[],workers=workersQ.data||[],docs=docsQ.data||[],scores=scoresQ.data||[];
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return contractors.filter(c=>!q||[c.contractorCode,c.name,c.scopeOfWork,c.mainContact].some(v=>String(v||"").toLowerCase().includes(q)));},[contractors,search]);
  const metrics=useMemo(()=>({
    total:contractors.length,
    approved:contractors.filter(c=>c.status==="Approved").length,
    blocked:contractors.filter(c=>["Blocked","Suspended","Expired"].includes(c.status)).length,
    expiring:contractors.filter(c=>(c.contractEnd&&new Date(c.contractEnd).getTime()-Date.now()<30*86400000)||(c.insuranceExpiry&&new Date(c.insuranceExpiry).getTime()-Date.now()<30*86400000)).length
  }),[contractors]);

  const refresh=()=>Promise.all([
    qc.invalidateQueries({queryKey:["contractors"]}),
    qc.invalidateQueries({queryKey:["contractor-workers"]}),
    qc.invalidateQueries({queryKey:["contractor-documents"]}),
    qc.invalidateQueries({queryKey:["contractor-scorecards"]})
  ]);

  const createContractor=async()=>{
    if(!form.name.trim())return toast.error(isAr?"اسم المقاول مطلوب":"Contractor name is required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=contractors",{...form,safetyScore:100,contractStart:form.contractStart||null,contractEnd:form.contractEnd||null,insuranceExpiry:form.insuranceExpiry||null});
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create contractor");
      toast.success(isAr?"تم إنشاء ملف المقاول":"Contractor profile created");setCreateOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create contractor");}finally{setSaving(false);}
  };

  const addWorker=async()=>{
    if(!selected||!workerForm.name.trim())return;
    const r=await apiRequest("POST","/api/data?resource=contractor-workers",{
      contractorId:selected.id,...workerForm,status:"Blocked",accessAllowed:false,inductionDate:workerForm.inductionDate||null,inductionExpiry:workerForm.inductionExpiry||null,medicalExpiry:workerForm.medicalExpiry||null,competencyExpiry:workerForm.competencyExpiry||null
    });
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add worker");
    toast.success(isAr?"تم إضافة العامل؛ الوصول يبقى محجوبًا حتى اكتمال المتطلبات":"Worker added; access remains blocked until requirements are valid");
    setWorkerForm({workerNo:"",name:"",nationalId:"",jobTitle:"",phone:"",inductionDate:"",inductionExpiry:"",medicalExpiry:"",competencyExpiry:""});await refresh();
  };

  const addDoc=async()=>{
    if(!selected||!docForm.documentType.trim())return;
    const r=await apiRequest("POST","/api/data?resource=contractor-documents",{
      contractorId:selected.id,workerId:docForm.workerId==="none"?null:docForm.workerId,...docForm,
      issueDate:docForm.issueDate||null,expiryDate:docForm.expiryDate||null,status:"Valid"
    });
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add document");
    toast.success(isAr?"تم حفظ المستند":"Document saved");await refresh();
  };

  const setContractorStatus=async(status:string)=>{
    if(!selected)return;
    const r=await apiRequest("PATCH",`/api/data?resource=contractors&id=${selected.id}`,{status});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to update contractor");setSelected(p);await refresh();
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-600 text-white"><Building2 className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"إدارة سلامة المقاولين":"Contractor Safety Management"}</h1><p className="text-xs text-muted-foreground">{isAr?"عمال، Induction، شهادات، صلاحية دخول، ومستندات المقاول":"Workers, induction, certificates, access eligibility and contractor documents"}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setCreateOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"مقاول جديد":"New Contractor"}</Button></div></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={isAr?"المقاولون":"Contractors"} value={metrics.total} icon={<Building2 className="h-4 w-4"/>}/><Metric label={isAr?"معتمد":"Approved"} value={metrics.approved} icon={<ShieldCheck className="h-4 w-4 text-emerald-600"/>}/><Metric label={isAr?"موقوف / منتهي":"Blocked / Expired"} value={metrics.blocked} icon={<FileWarning className="h-4 w-4 text-red-600"/>}/><Metric label={isAr?"استحقاق خلال 30 يوم":"Due <30d"} value={metrics.expiring} icon={<UserCheck className="h-4 w-4 text-orange-600"/>}/></div>

    <Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث بالمقاول أو نطاق العمل...":"Search contractor or scope..."}/></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"المقاول":"Contractor"}</TableHead><TableHead>{isAr?"نطاق العمل":"Scope"}</TableHead><TableHead>{isAr?"انتهاء العقد":"Contract End"}</TableHead><TableHead>{isAr?"التأمين":"Insurance"}</TableHead><TableHead>{isAr?"التقييم":"Score"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c=><TableRow key={c.id} className="cursor-pointer" onClick={()=>setSelected(c)}><TableCell><p className="font-semibold">{c.contractorCode}</p><p className="text-xs text-muted-foreground">{c.name}</p></TableCell><TableCell>{c.scopeOfWork||"—"}</TableCell><TableCell className={due(c.contractEnd)?"text-red-600":""}>{c.contractEnd||"—"}</TableCell><TableCell className={due(c.insuranceExpiry)?"text-red-600":""}>{c.insuranceExpiry||"—"}</TableCell><TableCell>{c.safetyScore}%</TableCell><TableCell><Badge variant="outline" className={tone(c.status)}>{c.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isAr?"مقاول جديد":"New Contractor"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"الاسم":"Name"} wide><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={isAr?"السجل التجاري":"Company Registration"}><Input value={form.companyRegistration} onChange={e=>setForm({...form,companyRegistration:e.target.value})}/></Field><Field label={isAr?"جهة الاتصال":"Main Contact"}><Input value={form.mainContact} onChange={e=>setForm({...form,mainContact:e.target.value})}/></Field>
      <Field label={isAr?"نطاق العمل":"Scope of Work"} wide><Textarea value={form.scopeOfWork} onChange={e=>setForm({...form,scopeOfWork:e.target.value})}/></Field><Field label="Email"><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label={isAr?"الجوال":"Phone"}><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
      <Field label={isAr?"بداية العقد":"Contract Start"}><Input type="date" value={form.contractStart} onChange={e=>setForm({...form,contractStart:e.target.value})}/></Field><Field label={isAr?"نهاية العقد":"Contract End"}><Input type="date" value={form.contractEnd} onChange={e=>setForm({...form,contractEnd:e.target.value})}/></Field><Field label={isAr?"انتهاء التأمين":"Insurance Expiry"}><Input type="date" value={form.insuranceExpiry} onChange={e=>setForm({...form,insuranceExpiry:e.target.value})}/></Field><Field label={isAr?"الحالة":"Status"}><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Approved","Conditional","Suspended","Expired","Blocked"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setCreateOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createContractor()} disabled={saving}>{isAr?"إنشاء":"Create"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">{selected&&<><DialogHeader><DialogTitle>{selected.contractorCode} — {selected.name}</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void setContractorStatus("Approved")}>{isAr?"اعتماد":"Approve"}</Button><Button variant="destructive" onClick={()=>void setContractorStatus("Suspended")}>{isAr?"تعليق":"Suspend"}</Button></div>
      <Tabs defaultValue="workers"><TabsList><TabsTrigger value="workers">{isAr?"العمال":"Workers"}</TabsTrigger><TabsTrigger value="documents">{isAr?"المستندات":"Documents"}</TabsTrigger><TabsTrigger value="scorecard">{isAr?"Scorecard":"Scorecard"}</TabsTrigger></TabsList>
        <TabsContent value="workers" className="space-y-3"><div className="grid gap-2 md:grid-cols-3"><Input placeholder={isAr?"رقم العامل":"Worker #"} value={workerForm.workerNo} onChange={e=>setWorkerForm({...workerForm,workerNo:e.target.value})}/><Input placeholder={isAr?"الاسم":"Name"} value={workerForm.name} onChange={e=>setWorkerForm({...workerForm,name:e.target.value})}/><Input placeholder={isAr?"المسمى":"Job title"} value={workerForm.jobTitle} onChange={e=>setWorkerForm({...workerForm,jobTitle:e.target.value})}/><Input type="date" title="Induction Expiry" value={workerForm.inductionExpiry} onChange={e=>setWorkerForm({...workerForm,inductionExpiry:e.target.value})}/><Input type="date" title="Medical Expiry" value={workerForm.medicalExpiry} onChange={e=>setWorkerForm({...workerForm,medicalExpiry:e.target.value})}/><div className="flex gap-2"><Input type="date" title="Competency Expiry" value={workerForm.competencyExpiry} onChange={e=>setWorkerForm({...workerForm,competencyExpiry:e.target.value})}/><Button onClick={()=>void addWorker()}><Plus className="h-4 w-4"/></Button></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"العامل":"Worker"}</TableHead><TableHead>{isAr?"المسمى":"Title"}</TableHead><TableHead>Induction</TableHead><TableHead>{isAr?"الوصول":"Access"}</TableHead><TableHead>{isAr?"السبب":"Reason"}</TableHead></TableRow></TableHeader><TableBody>{workers.map(w=><TableRow key={w.id}><TableCell><p className="font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.workerNo||"—"}</p></TableCell><TableCell>{w.jobTitle||"—"}</TableCell><TableCell className={due(w.inductionExpiry)?"text-red-600":""}>{w.inductionExpiry||"—"}</TableCell><TableCell>{w.accessAllowed?<Badge className="bg-emerald-600">{isAr?"مسموح":"Allowed"}</Badge>:<Badge variant="destructive">{isAr?"محجوب":"Blocked"}</Badge>}</TableCell><TableCell>{w.blockReason||"—"}</TableCell></TableRow>)}</TableBody></Table></div></TabsContent>
        <TabsContent value="documents" className="space-y-3"><div className="grid gap-2 md:grid-cols-3"><Select value={docForm.workerId} onValueChange={v=>setDocForm({...docForm,workerId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{isAr?"مستند المقاول":"Contractor-level"}</SelectItem>{workers.map(w=><SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select><Input placeholder={isAr?"نوع المستند":"Document type"} value={docForm.documentType} onChange={e=>setDocForm({...docForm,documentType:e.target.value})}/><Input placeholder={isAr?"المرجع":"Reference"} value={docForm.referenceNo} onChange={e=>setDocForm({...docForm,referenceNo:e.target.value})}/><Input type="date" value={docForm.expiryDate} onChange={e=>setDocForm({...docForm,expiryDate:e.target.value})}/><Input placeholder="https://..." value={docForm.fileUrl} onChange={e=>setDocForm({...docForm,fileUrl:e.target.value})}/><Button onClick={()=>void addDoc()}>{isAr?"إضافة مستند":"Add Document"}</Button></div><div className="space-y-2">{docs.map(d=><div key={d.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{d.documentType}</p><p className="text-xs text-muted-foreground">{d.referenceNo||"—"} · {d.expiryDate||"No expiry"}</p></div><Badge variant="outline" className={tone(d.status)}>{d.status}</Badge></div>)}</div></TabsContent>
        <TabsContent value="scorecard"><div className="space-y-2">{scores.map(s=><div key={s.id} className="grid grid-cols-2 gap-2 rounded-lg border p-3 md:grid-cols-5"><div><p className="text-xs text-muted-foreground">{s.month}/{s.year}</p><p className="font-bold">{s.score}%</p></div><div><p className="text-xs text-muted-foreground">{isAr?"المخالفات":"Violations"}</p><p>{s.violations}</p></div><div><p className="text-xs text-muted-foreground">{isAr?"الحوادث":"Incidents"}</p><p>{s.incidents}</p></div><div><p className="text-xs text-muted-foreground">{isAr?"الإجراءات المتأخرة":"Overdue"}</p><p>{s.overdueActions}</p></div><Badge variant="outline" className={tone(s.rating)}>{s.rating}</Badge></div>)}{scores.length===0&&<p className="py-8 text-center text-sm text-muted-foreground">{isAr?"سيتم إنشاء Scorecard عند توفر بيانات الأداء":"Scorecards will appear as performance data is collected"}</p>}</div></TabsContent>
      </Tabs>
    </>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}

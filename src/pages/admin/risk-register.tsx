import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, RefreshCw, Search, Shield, ShieldCheck, Target } from "lucide-react";
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

type Risk={id:string;riskNo:string;title:string;hazard:string;activity?:string|null;department?:string|null;factory?:string|null;area?:string|null;initialLikelihood:number;initialSeverity:number;initialScore:number;initialLevel:string;residualLikelihood:number;residualSeverity:number;residualScore:number;residualLevel:string;status:string;reviewDate?:string|null;actionId?:string|null;notes?:string|null;};
type Control={id:string;riskId:string;controlType:string;description:string;ownerEmployeeId?:string|null;dueDate?:string|null;status:string;effectiveness:string;};
type Employee={id:string;name:string;title?:string|null;};

const load=async<T,>(url:string):Promise<T>=>{const r=await apiRequest("GET",url);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const tone=(v:string)=>{const x=v.toLowerCase();if(["critical"].includes(x))return"bg-red-600 text-white";if(["high"].includes(x))return"bg-orange-500 text-white";if(["medium","treatment"].includes(x))return"bg-amber-500/10 text-amber-700 border-amber-500/30";if(["low","accepted","closed","verified","effective"].includes(x))return"bg-emerald-500/10 text-emerald-700 border-emerald-500/30";return"bg-slate-500/10 text-slate-700 border-slate-500/30";};

export default function RiskRegisterPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Risk|null>(null);
  const [form,setForm]=useState({title:"",hazard:"",activity:"",department:"",factory:"",area:"",initialLikelihood:"3",initialSeverity:"3",residualLikelihood:"2",residualSeverity:"2",reviewDate:"",notes:""});
  const [controlForm,setControlForm]=useState({controlType:"Engineering",description:"",ownerEmployeeId:"none",dueDate:""});
  const [saving,setSaving]=useState(false);

  const risksQ=useQuery<Risk[]>({queryKey:["risk-register"],queryFn:()=>load("/api/data?resource=risk-register")});
  const controlsQ=useQuery<Control[]>({queryKey:["risk-controls",selected?.id],enabled:Boolean(selected),queryFn:()=>load(`/api/data?resource=risk-controls&riskId=${selected!.id}`)});
  const hseQ=useQuery<Employee[]>({queryKey:["risk-hse"],queryFn:()=>load("/api/data?resource=employee-directory&type=hse")});
  const risks=risksQ.data||[],controls=controlsQ.data||[],hse=hseQ.data||[];
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return risks.filter(r=>!q||[r.riskNo,r.title,r.hazard,r.department,r.factory,r.area].some(v=>String(v||"").toLowerCase().includes(q)));},[risks,search]);
  const metrics=useMemo(()=>({total:risks.length,critical:risks.filter(r=>r.residualLevel==="Critical"&&r.status!=="Closed").length,high:risks.filter(r=>r.residualLevel==="High"&&r.status!=="Closed").length,overdue:risks.filter(r=>r.reviewDate&&new Date(r.reviewDate).getTime()<Date.now()&&r.status!=="Closed").length}),[risks]);

  const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:["risk-register"]}),qc.invalidateQueries({queryKey:["risk-controls"]}),qc.invalidateQueries({queryKey:["hse-actions"]})]);

  const createRisk=async()=>{
    if(!form.title.trim()||!form.hazard.trim())return toast.error(isAr?"العنوان والخطر مطلوبان":"Title and hazard are required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=risk-register",{
        title:form.title.trim(),hazard:form.hazard.trim(),activity:form.activity.trim(),department:form.department.trim(),factory:form.factory.trim(),area:form.area.trim(),
        ownerUserId:currentUser?.id||null,initialLikelihood:Number(form.initialLikelihood),initialSeverity:Number(form.initialSeverity),
        residualLikelihood:Number(form.residualLikelihood),residualSeverity:Number(form.residualSeverity),status:"Open",reviewDate:form.reviewDate||null,notes:form.notes.trim()
      });
      const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to create risk");
      toast.success(p.actionId?(isAr?"تم تسجيل الخطر وإنشاء CAPA تلقائيًا":"Risk recorded and CAPA created"):(isAr?"تم تسجيل الخطر":"Risk recorded"));setOpen(false);await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create risk");}finally{setSaving(false);}
  };

  const addControl=async()=>{
    if(!selected||!controlForm.description.trim())return;
    const r=await apiRequest("POST","/api/data?resource=risk-controls",{riskId:selected.id,controlType:controlForm.controlType,description:controlForm.description.trim(),ownerEmployeeId:controlForm.ownerEmployeeId==="none"?null:controlForm.ownerEmployeeId,dueDate:controlForm.dueDate||null,status:"Planned",effectiveness:"Not Reviewed"});
    const p=await r.json();if(!r.ok)return toast.error(p?.error||"Unable to add control");
    setControlForm({controlType:"Engineering",description:"",ownerEmployeeId:"none",dueDate:""});await qc.invalidateQueries({queryKey:["risk-controls",selected.id]});
  };

  const patchRisk=async(patch:any)=>{
    if(!selected)return;
    const r=await apiRequest("PATCH",`/api/data?resource=risk-register&id=${selected.id}`,patch);const p=await r.json();
    if(!r.ok)return toast.error(p?.error||"Unable to update risk");setSelected(p);await refresh();
  };
  const patchControl=async(c:Control,patch:any)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=risk-controls&id=${c.id}`,patch);const p=await r.json();
    if(!r.ok)return toast.error(p?.error||"Unable to update control");await qc.invalidateQueries({queryKey:["risk-controls",selected?.id]});
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white"><Shield className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"سجل المخاطر المركزي":"Central Risk Register"}</h1><p className="text-xs text-muted-foreground">{isAr?"Initial Risk → Controls → Residual Risk → Review → CAPA":"Initial Risk → Controls → Residual Risk → Review → CAPA"}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="me-2 h-4 w-4"/>{isAr?"تحديث":"Refresh"}</Button><Button onClick={()=>setOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"خطر جديد":"New Risk"}</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={isAr?"إجمالي المخاطر":"Total Risks"} value={metrics.total}/><Metric label={isAr?"حرجة":"Critical"} value={metrics.critical}/><Metric label={isAr?"عالية":"High"} value={metrics.high}/><Metric label={isAr?"مراجعات متأخرة":"Overdue Reviews"} value={metrics.overdue}/></div>
    <Card><CardContent className="space-y-4 p-4"><div className="relative max-w-xl"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث بالخطر أو القسم أو الموقع...":"Search risk, department or location..."}/></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>{isAr?"الخطر":"Risk"}</TableHead><TableHead>{isAr?"الموقع":"Location"}</TableHead><TableHead>{isAr?"Initial":"Initial"}</TableHead><TableHead>{isAr?"Residual":"Residual"}</TableHead><TableHead>{isAr?"المراجعة":"Review"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead><TableHead>CAPA</TableHead></TableRow></TableHeader><TableBody>{filtered.map(r=><TableRow key={r.id} className="cursor-pointer" onClick={()=>setSelected(r)}><TableCell><p className="font-semibold">{r.riskNo}</p><p className="text-xs text-muted-foreground">{r.title}</p></TableCell><TableCell>{r.factory||"—"} / {r.area||r.department||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(r.initialLevel)}>{r.initialScore} · {r.initialLevel}</Badge></TableCell><TableCell><Badge variant="outline" className={tone(r.residualLevel)}>{r.residualScore} · {r.residualLevel}</Badge></TableCell><TableCell>{r.reviewDate||"—"}</TableCell><TableCell><Badge variant="outline" className={tone(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.actionId?<Badge variant="destructive">CAPA</Badge>:"—"}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr?"إضافة خطر":"Add Risk"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
      <Field label={isAr?"العنوان":"Title"} wide><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label={isAr?"وصف الخطر":"Hazard"} wide><Textarea value={form.hazard} onChange={e=>setForm({...form,hazard:e.target.value})}/></Field><Field label={isAr?"النشاط":"Activity"}><Input value={form.activity} onChange={e=>setForm({...form,activity:e.target.value})}/></Field><Field label={isAr?"القسم":"Department"}><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></Field><Field label={isAr?"المصنع":"Factory"}><Input value={form.factory} onChange={e=>setForm({...form,factory:e.target.value})}/></Field><Field label={isAr?"المنطقة":"Area"}><Input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></Field>
      <Field label="Initial Likelihood"><Select value={form.initialLikelihood} onValueChange={v=>setForm({...form,initialLikelihood:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["1","2","3","4","5"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label="Initial Severity"><Select value={form.initialSeverity} onValueChange={v=>setForm({...form,initialSeverity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["1","2","3","4","5"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Residual Likelihood"><Select value={form.residualLikelihood} onValueChange={v=>setForm({...form,residualLikelihood:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["1","2","3","4","5"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label="Residual Severity"><Select value={form.residualSeverity} onValueChange={v=>setForm({...form,residualSeverity:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["1","2","3","4","5"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
      <Field label={isAr?"تاريخ المراجعة":"Review Date"}><Input type="date" value={form.reviewDate} onChange={e=>setForm({...form,reviewDate:e.target.value})}/></Field>
    </div><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createRisk()} disabled={saving}>{isAr?"حفظ":"Save"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">{selected&&<><DialogHeader><DialogTitle>{selected.riskNo} — {selected.title}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-4"><Info label="Initial" value={`${selected.initialScore} · ${selected.initialLevel}`}/><Info label="Residual" value={`${selected.residualScore} · ${selected.residualLevel}`}/><Info label={isAr?"الحالة":"Status"} value={selected.status}/><Info label={isAr?"المراجعة":"Review"} value={selected.reviewDate||"—"}/></div><Card><CardContent className="space-y-3 p-4"><h3 className="font-semibold">{isAr?"ضوابط التحكم":"Risk Controls"}</h3><div className="grid gap-2 md:grid-cols-4"><Select value={controlForm.controlType} onValueChange={v=>setControlForm({...controlForm,controlType:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Elimination","Substitution","Engineering","Administrative","PPE"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input placeholder={isAr?"وصف التحكم":"Control description"} value={controlForm.description} onChange={e=>setControlForm({...controlForm,description:e.target.value})}/><Select value={controlForm.ownerEmployeeId} onValueChange={v=>setControlForm({...controlForm,ownerEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{hse.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><Button onClick={()=>void addControl()}><Plus className="h-4 w-4"/></Button></div><div className="space-y-2">{controls.map(c=><div key={c.id} className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="font-medium">{c.controlType}: {c.description}</p><p className="text-xs text-muted-foreground">{c.dueDate||"No due date"} · {c.effectiveness}</p></div><div className="flex gap-2"><Badge variant="outline">{c.status}</Badge>{c.status!=="Verified"&&<Button size="sm" variant="outline" onClick={()=>void patchControl(c,{status:"Verified",effectiveness:"Effective",verifiedAt:new Date().toISOString(),verifiedBy:currentUser?.id||null})}>{isAr?"تحقق":"Verify"}</Button>}</div></div>)}</div></CardContent></Card><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>void patchRisk({status:"Treatment"})}>{isAr?"معالجة":"Treatment"}</Button><Button onClick={()=>void patchRisk({status:"Accepted",acceptedBy:currentUser?.id||null,acceptedAt:new Date().toISOString()})}>{isAr?"قبول الخطر":"Accept Risk"}</Button></div></>}</DialogContent></Dialog>
  </div>;
}
function Metric({label,value}:{label:string;value:number}){return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuditProgram={id:string;auditNo:string;title:string;auditType:string;standard?:string;department?:string;plannedDate?:string;status:string};
type Finding={id:string;auditId:string;findingNo:string;findingType:string;title:string;dueDate?:string;status:string};

export default function AdminAudits(){
 const {settings}=useData(); const isAr=settings.language==="ar"; const qc=useQueryClient();
 const [title,setTitle]=useState(""); const [standard,setStandard]=useState("ISO 45001"); const [busy,setBusy]=useState(false);
 const {data:audits=[]}=useQuery<AuditProgram[]>({queryKey:["/api/audit-programs"],queryFn:async()=>{const r=await fetch("/api/audit-programs");if(!r.ok)throw new Error("Unable to load audits");return r.json();}});
 const {data:findings=[]}=useQuery<Finding[]>({queryKey:["/api/audit-findings"],queryFn:async()=>{const r=await fetch("/api/audit-findings");if(!r.ok)throw new Error("Unable to load findings");return r.json();}});
 const open=findings.filter(f=>f.status!=="Closed");
 const major=open.filter(f=>f.findingType==="Major NC").length;
 const createAudit=async()=>{if(!title.trim())return;setBusy(true);try{await apiRequest("POST","/api/audit-programs",{auditNo:`AUD-${Date.now().toString(36).toUpperCase()}`,title:title.trim(),auditType:"Internal",standard,status:"Planned",plannedDate:new Date().toISOString().slice(0,10)});setTitle("");qc.invalidateQueries({queryKey:["/api/audit-programs"]});toast.success(isAr?"تم إنشاء التدقيق":"Audit created");}catch(e:any){toast.error(e?.message||"Unable to create audit");}finally{setBusy(false);}};
 const stats=useMemo(()=>({planned:audits.filter(a=>a.status==="Planned").length,active:audits.filter(a=>a.status==="In Progress").length,open:open.length,major}),[audits,open.length,major]);
 return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
  <div className="rounded-3xl border bg-card p-6">
   <div className="flex items-center gap-3"><div className="h-11 w-11 rounded-2xl bg-emerald-500/10 grid place-items-center"><ClipboardCheck className="h-5 w-5 text-emerald-600"/></div><div><h1 className="text-2xl font-bold">{isAr?"برنامج تدقيق HSE":"HSE Audit Program"}</h1><p className="text-sm text-muted-foreground">{isAr?"ISO 45001 / ISO 14001، النتائج، الأدلة، والإجراءات التصحيحية.":"ISO 45001 / ISO 14001 planning, findings, evidence and corrective actions."}</p></div></div>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[[isAr?"مخطط":"Planned",stats.planned],[isAr?"قيد التنفيذ":"In Progress",stats.active],[isAr?"نتائج مفتوحة":"Open Findings",stats.open],[isAr?"عدم مطابقة جسيم":"Major NC",stats.major]].map(([l,v])=><div className="rounded-2xl border bg-background p-4" key={String(l)}><div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}</div>
  </div>
  <div className="rounded-3xl border bg-card p-5">
   <div className="grid md:grid-cols-[1fr_200px_auto] gap-3"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder={isAr?"عنوان التدقيق":"Audit title"}/><select className="h-10 rounded-md border bg-background px-3 text-sm" value={standard} onChange={e=>setStandard(e.target.value)}><option>ISO 45001</option><option>ISO 14001</option><option>Internal HSE</option><option>Legal Compliance</option></select><Button onClick={createAudit} disabled={busy||!title.trim()}>{busy?<Loader2 className="h-4 w-4 animate-spin me-2"/>:<Plus className="h-4 w-4 me-2"/>}{isAr?"إنشاء تدقيق":"Create Audit"}</Button></div>
  </div>
  <div className="rounded-3xl border bg-card overflow-hidden"><div className="px-5 py-4 border-b font-semibold">{isAr?"سجل التدقيق":"Audit Register"}</div><div className="divide-y">{audits.length===0?<div className="p-10 text-center text-sm text-muted-foreground">{isAr?"لا توجد تدقيقات بعد.":"No audits yet."}</div>:audits.map(a=><div key={a.id} className="p-4 flex items-center justify-between gap-4"><div><div className="font-medium">{a.title}</div><div className="text-xs text-muted-foreground mt-1">{a.auditNo} · {a.standard||a.auditType} · {a.plannedDate||"-"}</div></div><span className="text-xs rounded-full border px-2.5 py-1">{a.status}</span></div>)}</div></div>
  <div className="rounded-3xl border bg-card overflow-hidden"><div className="px-5 py-4 border-b font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>{isAr?"نتائج التدقيق المفتوحة":"Open Audit Findings"}</div><div className="divide-y">{open.slice(0,20).map(f=><div key={f.id} className="p-4 flex items-center justify-between"><div><div className="font-medium text-sm">{f.title}</div><div className="text-xs text-muted-foreground">{f.findingNo} · {f.findingType}</div></div>{f.status==="Closed"?<CheckCircle2 className="h-4 w-4 text-emerald-600"/>:<span className="text-xs">{f.dueDate||"-"}</span>}</div>)}</div></div>
 </div>;
}

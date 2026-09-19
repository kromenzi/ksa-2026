import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, CheckCircle2, CircleDot, Clock3, FileCheck2, MessageSquarePlus,
  Plus, RefreshCw, Search, ShieldCheck, Siren, Upload, UserRoundCheck
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ActionItem = {
  id:string; actionNo:string; title:string; description?:string|null; sourceType?:string|null; sourceId?:string|null;
  category:string; department?:string|null; factory?:string|null; area?:string|null; priority:string; status:string;
  progress:number; ownerUserId?:string|null; assignedEmployeeId?:string|null; dueAt?:string|null; evidenceRequired:boolean;
  verificationRequired:boolean; verifiedBy?:string|null; verifiedAt?:string|null; verificationNotes?:string|null;
  effectivenessStatus:string; effectivenessNotes?:string|null; escalationLevel:number; createdAt:string; updatedAt:string;
};

type Employee = { id:string; name:string; employeeId?:string|null; title?:string|null; employeeType:string; status?:string|null; };
type Escalation = { id:string; actionId:string; escalationLevel:number; targetRole:string; reason:string; status:string; escalatedAt:string; };
type CommentRow = { id:string; actionId:string; comment:string; createdAt:string; };
type EvidenceRow = { id:string; actionId:string; fileUrl:string; fileName?:string|null; note?:string|null; uploadedAt:string; };

const load = async <T,>(url:string):Promise<T> => {
  const r=await apiRequest("GET",url);
  const p=await r.json();
  if(!r.ok) throw new Error(p?.error||"Unable to load");
  return p;
};
const tone=(v:string)=>{
  const x=String(v||"").toLowerCase();
  if(["critical","blocked"].includes(x)) return "bg-red-500/10 text-red-700 border-red-500/30";
  if(["high","in progress","pending verification"].includes(x)) return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  if(["completed","closed","effective"].includes(x)) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  if(["medium","open"].includes(x)) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-slate-500/10 text-slate-700 border-slate-500/30";
};
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString():"—";
const today=()=>Date.now();

export default function ActionCenterPage(){
  const {settings,currentUser}=useData();
  const isAr=settings.language==="ar";
  const qc=useQueryClient();
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [priorityFilter,setPriorityFilter]=useState("all");
  const [createOpen,setCreateOpen]=useState(false);
  const [selected,setSelected]=useState<ActionItem|null>(null);
  const [comment,setComment]=useState("");
  const [evidenceUrl,setEvidenceUrl]=useState("");
  const [evidenceNote,setEvidenceNote]=useState("");
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    title:"",description:"",category:"General",department:"",factory:"",area:"",
    priority:"Medium",assignedEmployeeId:"none",dueAt:"",evidenceRequired:false
  });

  const actionsQ=useQuery<ActionItem[]>({queryKey:["hse-actions"],queryFn:()=>load("/api/data?resource=hse-actions")});
  const employeesQ=useQuery<Employee[]>({queryKey:["hse-action-assignees"],queryFn:()=>load("/api/data?resource=employee-directory&type=hse")});
  const escalationsQ=useQuery<Escalation[]>({queryKey:["hse-action-escalations"],queryFn:()=>load("/api/data?resource=hse-action-escalations")});
  const commentsQ=useQuery<CommentRow[]>({
    queryKey:["hse-action-comments",selected?.id],
    enabled:Boolean(selected?.id),
    queryFn:()=>load(`/api/data?resource=hse-action-comments&actionId=${selected!.id}`)
  });
  const evidenceQ=useQuery<EvidenceRow[]>({
    queryKey:["hse-action-evidence",selected?.id],
    enabled:Boolean(selected?.id),
    queryFn:()=>load(`/api/data?resource=hse-action-evidence&actionId=${selected!.id}`)
  });

  const actions=actionsQ.data||[];
  const employees=employeesQ.data||[];
  const escalations=escalationsQ.data||[];

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return actions.filter(a=>{
      if(statusFilter!=="all"&&a.status!==statusFilter) return false;
      if(priorityFilter!=="all"&&a.priority!==priorityFilter) return false;
      if(!q) return true;
      return [a.actionNo,a.title,a.description,a.category,a.department,a.sourceType]
        .some(v=>String(v||"").toLowerCase().includes(q));
    });
  },[actions,search,statusFilter,priorityFilter]);

  const metrics=useMemo(()=>{
    const active=actions.filter(a=>!["Completed","Closed","Cancelled"].includes(a.status));
    return {
      open:active.length,
      overdue:active.filter(a=>a.dueAt&&new Date(a.dueAt).getTime()<today()).length,
      critical:active.filter(a=>a.priority==="Critical").length,
      escalated:active.filter(a=>a.escalationLevel>0).length,
      verification:actions.filter(a=>a.status==="Pending Verification").length,
      closed:actions.filter(a=>["Completed","Closed"].includes(a.status)).length,
    };
  },[actions]);

  const refresh=async()=>{
    await Promise.all([
      qc.invalidateQueries({queryKey:["hse-actions"]}),
      qc.invalidateQueries({queryKey:["hse-action-escalations"]}),
      qc.invalidateQueries({queryKey:["hse-action-comments"]}),
      qc.invalidateQueries({queryKey:["hse-action-evidence"]}),
    ]);
  };

  const createAction=async()=>{
    if(!form.title.trim()) return toast.error(isAr?"عنوان الإجراء مطلوب":"Action title is required");
    setSaving(true);
    try{
      const r=await apiRequest("POST","/api/data?resource=hse-actions",{
        title:form.title.trim(),
        description:form.description.trim(),
        category:form.category,
        department:form.department.trim(),
        factory:form.factory.trim(),
        area:form.area.trim(),
        priority:form.priority,
        status:"Open",
        progress:0,
        ownerUserId:currentUser?.id||null,
        assignedEmployeeId:form.assignedEmployeeId==="none"?null:form.assignedEmployeeId,
        dueAt:form.dueAt?new Date(form.dueAt).toISOString():null,
        evidenceRequired:form.evidenceRequired,
        verificationRequired:true,
        effectivenessStatus:"Not Reviewed",
        metadata:{manual:true}
      });
      const p=await r.json();
      if(!r.ok) throw new Error(p?.error||"Unable to create action");
      toast.success(isAr?"تم إنشاء الإجراء":"Action created");
      setCreateOpen(false);
      setForm({title:"",description:"",category:"General",department:"",factory:"",area:"",priority:"Medium",assignedEmployeeId:"none",dueAt:"",evidenceRequired:false});
      await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to create action");}
    finally{setSaving(false);}
  };

  const patchAction=async(patch:any)=>{
    if(!selected) return;
    setSaving(true);
    try{
      const r=await apiRequest("PATCH",`/api/data?resource=hse-actions&id=${selected.id}`,patch);
      const p=await r.json();
      if(!r.ok) throw new Error(p?.error||"Unable to update action");
      setSelected(p);
      toast.success(isAr?"تم تحديث الإجراء":"Action updated");
      await refresh();
    }catch(e:any){toast.error(e?.message||"Unable to update action");}
    finally{setSaving(false);}
  };

  const addComment=async()=>{
    if(!selected||!comment.trim()) return;
    const r=await apiRequest("POST","/api/data?resource=hse-action-comments",{actionId:selected.id,comment:comment.trim()});
    const p=await r.json(); if(!r.ok) return toast.error(p?.error||"Unable to add comment");
    setComment("");
    await qc.invalidateQueries({queryKey:["hse-action-comments",selected.id]});
  };

  const addEvidence=async()=>{
    if(!selected||!evidenceUrl.trim()) return;
    const r=await apiRequest("POST","/api/data?resource=hse-action-evidence",{
      actionId:selected.id,fileUrl:evidenceUrl.trim(),fileName:evidenceUrl.split("/").pop()||"Evidence",note:evidenceNote.trim()
    });
    const p=await r.json(); if(!r.ok) return toast.error(p?.error||"Unable to add evidence");
    setEvidenceUrl("");setEvidenceNote("");
    await qc.invalidateQueries({queryKey:["hse-action-evidence",selected.id]});
  };

  const acknowledgeEscalation=async(e:Escalation)=>{
    const r=await apiRequest("PATCH",`/api/data?resource=hse-action-escalations&id=${e.id}`,{
      status:"Acknowledged",acknowledgedAt:new Date().toISOString(),acknowledgedBy:currentUser?.id||null
    });
    const p=await r.json(); if(!r.ok) return toast.error(p?.error||"Unable to acknowledge");
    toast.success(isAr?"تم تأكيد التصعيد":"Escalation acknowledged");
    await refresh();
  };

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white"><ShieldCheck className="h-6 w-6"/></div>
          <div>
            <h1 className="text-2xl font-bold">{isAr?"مركز الإجراءات التصحيحية CAPA":"CAPA & Action Center"}</h1>
            <p className="text-xs text-muted-foreground">{isAr?"مركز موحد للإجراءات الناتجة من NCR والحوادث والمخالفات والحريق والطوارئ":"Unified corrective actions from NCR, incidents, violations, fire and emergency events"}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={()=>void refresh()} disabled={actionsQ.isLoading}><RefreshCw className={"me-2 h-4 w-4 "+(actionsQ.isLoading?"animate-spin":"")}/>{isAr?"تحديث":"Refresh"}</Button>
        <Button onClick={()=>setCreateOpen(true)}><Plus className="me-2 h-4 w-4"/>{isAr?"إجراء جديد":"New Action"}</Button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Metric label={isAr?"مفتوحة":"Open"} value={metrics.open} icon={<CircleDot className="h-4 w-4"/>}/>
      <Metric label={isAr?"متأخرة":"Overdue"} value={metrics.overdue} icon={<Clock3 className="h-4 w-4 text-red-600"/>}/>
      <Metric label={isAr?"حرجة":"Critical"} value={metrics.critical} icon={<AlertTriangle className="h-4 w-4 text-red-600"/>}/>
      <Metric label={isAr?"مصعّدة":"Escalated"} value={metrics.escalated} icon={<Siren className="h-4 w-4 text-orange-600"/>}/>
      <Metric label={isAr?"بانتظار التحقق":"Verification"} value={metrics.verification} icon={<UserRoundCheck className="h-4 w-4 text-blue-600"/>}/>
      <Metric label={isAr?"مغلقة":"Closed"} value={metrics.closed} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600"/>}/>
    </div>

    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-2 md:grid-cols-[1fr_190px_180px]">
        <div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث برقم الإجراء أو العنوان أو المصدر...":"Search action number, title or source..."}/></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل الحالات":"All statuses"}</SelectItem>{["Open","In Progress","Blocked","Pending Verification","Completed","Closed","Cancelled"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{isAr?"كل الأولويات":"All priorities"}</SelectItem>{["Critical","High","Medium","Low"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="overflow-x-auto rounded-xl border"><Table>
        <TableHeader><TableRow><TableHead>{isAr?"الإجراء":"Action"}</TableHead><TableHead>{isAr?"المصدر":"Source"}</TableHead><TableHead>{isAr?"المسؤول":"Assignee"}</TableHead><TableHead>{isAr?"الاستحقاق":"Due"}</TableHead><TableHead>{isAr?"التقدم":"Progress"}</TableHead><TableHead>{isAr?"الأولوية":"Priority"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map(a=>{
            const assignee=employees.find(e=>e.id===a.assignedEmployeeId);
            const overdue=Boolean(a.dueAt&&new Date(a.dueAt).getTime()<today()&&!["Completed","Closed","Cancelled"].includes(a.status));
            return <TableRow key={a.id} className="cursor-pointer" onClick={()=>setSelected(a)}>
              <TableCell><p className="font-semibold">{a.actionNo}</p><p className="max-w-[320px] truncate text-xs text-muted-foreground">{a.title}</p></TableCell>
              <TableCell><div>{a.sourceType||a.category}</div>{a.escalationLevel>0&&<Badge variant="destructive" className="mt-1">L{a.escalationLevel}</Badge>}</TableCell>
              <TableCell>{assignee?.name||"—"}</TableCell>
              <TableCell className={overdue?"font-semibold text-red-600":""}>{fmt(a.dueAt)}</TableCell>
              <TableCell>{a.progress}%</TableCell>
              <TableCell><Badge variant="outline" className={tone(a.priority)}>{a.priority}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={tone(a.status)}>{a.status}</Badge></TableCell>
            </TableRow>;
          })}
          {!actionsQ.isLoading&&filtered.length===0&&<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr?"لا توجد إجراءات مطابقة":"No matching actions"}</TableCell></TableRow>}
        </TableBody>
      </Table></div>
    </CardContent></Card>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isAr?"إجراء تصحيحي جديد":"New Corrective Action"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={isAr?"العنوان":"Title"} wide><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
        <Field label={isAr?"الوصف":"Description"} wide><Textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
        <Field label={isAr?"التصنيف":"Category"}><Input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></Field>
        <Field label={isAr?"القسم":"Department"}><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></Field>
        <Field label={isAr?"المصنع":"Factory"}><Input value={form.factory} onChange={e=>setForm({...form,factory:e.target.value})}/></Field>
        <Field label={isAr?"المنطقة":"Area"}><Input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></Field>
        <Field label={isAr?"الأولوية":"Priority"}><Select value={form.priority} onValueChange={v=>setForm({...form,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Critical","High","Medium","Low"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"موظف HSE المسؤول":"HSE Assignee"}><Select value={form.assignedEmployeeId} onValueChange={v=>setForm({...form,assignedEmployeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">—</SelectItem>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.name} · {e.title||"HSE"}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={isAr?"تاريخ الاستحقاق":"Due Date"}><Input type="datetime-local" value={form.dueAt} onChange={e=>setForm({...form,dueAt:e.target.value})}/></Field>
        <div className="flex items-end"><Button type="button" variant={form.evidenceRequired?"default":"outline"} className="w-full" onClick={()=>setForm({...form,evidenceRequired:!form.evidenceRequired})}><Upload className="me-2 h-4 w-4"/>{form.evidenceRequired?(isAr?"الدليل مطلوب":"Evidence Required"):(isAr?"اجعل الدليل مطلوبًا":"Require Evidence")}</Button></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setCreateOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button onClick={()=>void createAction()} disabled={saving}>{isAr?"إنشاء":"Create"}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
      {selected&&<>
        <DialogHeader><DialogTitle>{selected.actionNo} — {selected.title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card><CardContent className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">{selected.description||"—"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={isAr?"الحالة":"Status"}><Select value={selected.status} onValueChange={v=>void patchAction({status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Open","In Progress","Blocked","Pending Verification","Completed","Closed","Cancelled"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
                <Field label={isAr?"التقدم":"Progress"}><Input type="number" min={0} max={100} value={selected.progress} onChange={e=>setSelected({...selected,progress:Number(e.target.value)})} onBlur={()=>void patchAction({progress:selected.progress})}/></Field>
                <Field label={isAr?"الفعالية":"Effectiveness"}><Select value={selected.effectivenessStatus} onValueChange={v=>void patchAction({effectivenessStatus:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Not Reviewed","Effective","Partially Effective","Ineffective"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field>
                <Field label={isAr?"الاستحقاق":"Due"}><div className="rounded-md border px-3 py-2 text-sm">{fmt(selected.dueAt)}</div></Field>
              </div>
              <Field label={isAr?"ملاحظات التحقق":"Verification Notes"} wide><Textarea value={selected.verificationNotes||""} onChange={e=>setSelected({...selected,verificationNotes:e.target.value})} onBlur={()=>void patchAction({verificationNotes:selected.verificationNotes||""})}/></Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={()=>void patchAction({status:"Pending Verification",progress:100})}><FileCheck2 className="me-2 h-4 w-4"/>{isAr?"إرسال للتحقق":"Submit for Verification"}</Button>
                <Button onClick={()=>void patchAction({status:"Closed",progress:100,verifiedBy:currentUser?.id||null,verifiedAt:new Date().toISOString()})}><CheckCircle2 className="me-2 h-4 w-4"/>{isAr?"تحقق وإغلاق":"Verify & Close"}</Button>
              </div>
            </CardContent></Card>

            <Card><CardHeader><CardTitle className="text-sm">{isAr?"التعليقات":"Comments"}</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="flex gap-2"><Input value={comment} onChange={e=>setComment(e.target.value)} placeholder={isAr?"أضف متابعة...":"Add follow-up..."}/><Button size="icon" onClick={()=>void addComment()}><MessageSquarePlus className="h-4 w-4"/></Button></div>
              {(commentsQ.data||[]).map(c=><div key={c.id} className="rounded-lg border p-3 text-sm"><p>{c.comment}</p><p className="mt-1 text-xs text-muted-foreground">{fmt(c.createdAt)}</p></div>)}
            </CardContent></Card>

            <Card><CardHeader><CardTitle className="text-sm">{isAr?"الأدلة":"Evidence"}</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} placeholder="https://..."/><Input value={evidenceNote} onChange={e=>setEvidenceNote(e.target.value)} placeholder={isAr?"ملاحظة":"Note"}/><Button onClick={()=>void addEvidence()}><Upload className="h-4 w-4"/></Button></div>
              {(evidenceQ.data||[]).map(e=><div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><a href={e.fileUrl} target="_blank" rel="noreferrer" className="font-medium underline">{e.fileName||e.fileUrl}</a><p className="text-xs text-muted-foreground">{e.note||""}</p></div><span className="text-xs text-muted-foreground">{fmt(e.uploadedAt)}</span></div>)}
            </CardContent></Card>
          </div>

          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">{isAr?"بيانات الإجراء":"Action Data"}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <Data label={isAr?"المصدر":"Source"} value={selected.sourceType||selected.category}/>
              <Data label={isAr?"القسم":"Department"} value={selected.department||"—"}/>
              <Data label={isAr?"الأولوية":"Priority"} value={selected.priority}/>
              <Data label={isAr?"مستوى التصعيد":"Escalation Level"} value={String(selected.escalationLevel)}/>
              <Data label={isAr?"أُنشئ":"Created"} value={fmt(selected.createdAt)}/>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">{isAr?"التصعيدات":"Escalations"}</CardTitle></CardHeader><CardContent className="space-y-2">
              {escalations.filter(e=>e.actionId===selected.id).map(e=><div key={e.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between"><Badge variant="destructive">L{e.escalationLevel} → {e.targetRole}</Badge><Badge variant="outline">{e.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{e.reason}</p><p className="mt-1 text-xs text-muted-foreground">{fmt(e.escalatedAt)}</p>{e.status==="Open"&&<Button size="sm" variant="outline" className="mt-2 w-full" onClick={()=>void acknowledgeEscalation(e)}>{isAr?"تأكيد الاستلام":"Acknowledge"}</Button>}</div>)}
              {escalations.filter(e=>e.actionId===selected.id).length===0&&<p className="py-4 text-center text-xs text-muted-foreground">{isAr?"لا يوجد تصعيد":"No escalation"}</p>}
            </CardContent></Card>
          </div>
        </div>
      </>}
    </DialogContent></Dialog>
  </div>;
}

function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>{icon}</CardContent></Card>}
function Field({label,children,wide=false}:{label:string;children:any;wide?:boolean}){return <div className={"space-y-1 "+(wide?"sm:col-span-2":"")}><Label>{label}</Label>{children}</div>}
function Data({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-end font-medium">{value}</span></div>}

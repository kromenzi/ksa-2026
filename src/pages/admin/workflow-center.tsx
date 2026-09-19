import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Workflow, Link2, CheckCircle2, Clock3, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type HseWorkflow = {
  id:string; workflowNo:string; title:string; status:string; sourceType?:string|null; sourceId?:string|null;
  department?:string|null; factory?:string|null; area?:string|null; ownerUserId?:string|null; updatedAt:string;
};

export default function WorkflowCenterPage(){
  const { settings, currentUser } = useData();
  const isAr=settings.language==="ar";
  const queryClient=useQueryClient();
  const [title,setTitle]=useState("");
  const [sourceType,setSourceType]=useState("observation");
  const [busy,setBusy]=useState(false);

  const {data:workflows=[],isLoading}=useQuery<HseWorkflow[]>({
    queryKey:["/api/hse-workflows"],
    queryFn:async()=>{const r=await fetch("/api/hse-workflows",{credentials:"include",cache:"no-store"});if(!r.ok)throw new Error("Unable to load workflows");return r.json();},
    refetchInterval:15000,
  });

  const stats=useMemo(()=>({
    open:workflows.filter(w=>w.status==="Open").length,
    progress:workflows.filter(w=>w.status==="In Progress").length,
    verify:workflows.filter(w=>w.status==="Pending Verification").length,
    closed:workflows.filter(w=>w.status==="Closed").length,
  }),[workflows]);

  const createWorkflow=async()=>{
    if(!title.trim())return;
    setBusy(true);
    try{
      await apiRequest("POST","/api/hse-workflows",{title:title.trim(),sourceType,status:"Open",ownerUserId:currentUser?.id||null});
      setTitle("");
      queryClient.invalidateQueries({queryKey:["/api/hse-workflows"]});
      toast.success(isAr?"تم إنشاء مسار HSE":"HSE workflow created");
    }catch(e:any){toast.error(e?.message||"Unable to create workflow");}
    finally{setBusy(false);}
  };

  const cards=[
    [isAr?"مفتوح":"Open",stats.open,AlertTriangle],
    [isAr?"قيد التنفيذ":"In Progress",stats.progress,Clock3],
    [isAr?"بانتظار التحقق":"Pending Verification",stats.verify,Link2],
    [isAr?"مغلق":"Closed",stats.closed,CheckCircle2],
  ] as const;

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="rounded-3xl border bg-card p-5 md:p-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-3"><Workflow className="h-3.5 w-3.5"/>{isAr?"محرك سير عمل HSE":"HSE Workflow Engine"}</div>
          <h1 className="text-2xl font-bold">{isAr?"مركز ربط إجراءات السلامة":"Safety Workflow Center"}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{isAr?"يربط الملاحظة أو الحادث أو NCR بإجراء CAPA والتحقق والإغلاق ضمن سلسلة واحدة قابلة للتتبع.":"Links observations, incidents and NCRs to CAPA, verification and closure in one traceable chain."}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {cards.map(([label,value,Icon])=><div key={label} className="rounded-2xl border bg-background/60 p-4"><Icon className="h-4 w-4 text-primary mb-2"/><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}
      </div>
    </div>

    <div className="rounded-3xl border bg-card p-5">
      <h2 className="font-semibold mb-3">{isAr?"إنشاء مسار جديد":"Create workflow"}</h2>
      <div className="grid md:grid-cols-[1fr_220px_auto] gap-3">
        <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder={isAr?"عنوان الحالة / الإجراء":"Workflow title"} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sourceType} onChange={e=>setSourceType(e.target.value)}>
          <option value="observation">{isAr?"ملاحظة":"Observation"}</option>
          <option value="incident">{isAr?"حادث":"Incident"}</option>
          <option value="ncr">NCR</option>
          <option value="inspection">{isAr?"تفتيش":"Inspection"}</option>
          <option value="risk">{isAr?"مخاطر":"Risk"}</option>
        </select>
        <Button onClick={createWorkflow} disabled={busy||!title.trim()}>{busy?<Loader2 className="h-4 w-4 animate-spin me-2"/>:<Plus className="h-4 w-4 me-2"/>}{isAr?"إنشاء":"Create"}</Button>
      </div>
    </div>

    <div className="rounded-3xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b"><h2 className="font-semibold">{isAr?"سجل المسارات":"Workflow register"}</h2></div>
      {isLoading?<div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2"/></div>:
      workflows.length===0?<div className="p-10 text-center text-sm text-muted-foreground">{isAr?"لا توجد مسارات بعد.":"No workflows yet."}</div>:
      <div className="divide-y">{workflows.map(w=><div key={w.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0"><div className="font-medium truncate">{w.title}</div><div className="text-xs text-muted-foreground mt-1">{w.workflowNo} · {w.sourceType||"manual"}</div></div>
        <span className="rounded-full border px-2.5 py-1 text-xs whitespace-nowrap">{w.status}</span>
      </div>)}</div>}
    </div>
  </div>;
}

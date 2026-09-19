import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus, Trash2, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Rule={id:string;refNo?:string;title:string;status:string;department?:string;data:any;updatedAt?:string};

export default function AdminNotificationRules(){
  const {settings}=useData(); const isAr=settings.language==="ar"; const qc=useQueryClient();
  const [name,setName]=useState(""); const [channel,setChannel]=useState("in_app"); const [severity,setSeverity]=useState("High"); const [busy,setBusy]=useState(false);
  const {data:rules=[],isLoading}=useQuery<Rule[]>({queryKey:["/api/notification-rules"],queryFn:async()=>{const r=await fetch("/api/notification-rules");if(!r.ok)throw new Error("Unable to load notification rules");return r.json();}});
  const create=async()=>{if(!name.trim())return;setBusy(true);try{await apiRequest("POST","/api/notification-rules",{refNo:`NR-${Date.now().toString(36).toUpperCase()}`,title:name.trim(),status:"active",data:{eventType:"Incident",channel,severity,recipients:"HSE Team"}});setName("");qc.invalidateQueries({queryKey:["/api/notification-rules"]});toast.success(isAr?"تم حفظ القاعدة في النظام":"Rule saved to Safety Board");}catch(e:any){toast.error(e?.message||"Unable to create rule");}finally{setBusy(false);}};
  const toggle=async(r:Rule)=>{await apiRequest("PATCH",`/api/notification-rules/${r.id}`,{status:r.status==="active"?"inactive":"active"});qc.invalidateQueries({queryKey:["/api/notification-rules"]});};
  const remove=async(id:string)=>{await apiRequest("DELETE",`/api/notification-rules/${id}`,{});qc.invalidateQueries({queryKey:["/api/notification-rules"]});};

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="rounded-3xl border bg-card p-6"><div className="flex items-center gap-3"><BellRing className="h-6 w-6 text-amber-500"/><div><h1 className="text-2xl font-bold">{isAr?"قواعد إشعارات HSE":"HSE Notification Rules"}</h1><p className="text-sm text-muted-foreground">{isAr?"القواعد محفوظة الآن في Supabase وليست localStorage.":"Rules are now persisted in Supabase rather than localStorage."}</p></div></div></div>
    <div className="rounded-3xl border bg-card p-5"><div className="grid md:grid-cols-[1fr_170px_150px_auto] gap-3"><Input value={name} onChange={e=>setName(e.target.value)} placeholder={isAr?"اسم القاعدة":"Rule name"}/><select className="h-10 rounded-md border bg-background px-3 text-sm" value={channel} onChange={e=>setChannel(e.target.value)}><option value="in_app">In-App</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="webhook">Teams/Webhook</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={severity} onChange={e=>setSeverity(e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><Button onClick={create} disabled={busy||!name.trim()}>{busy?<Loader2 className="h-4 w-4 animate-spin me-2"/>:<Plus className="h-4 w-4 me-2"/>}{isAr?"إضافة":"Add"}</Button></div></div>
    <div className="rounded-3xl border bg-card overflow-hidden">{isLoading?<div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div>:<div className="divide-y">{rules.length===0?<div className="p-10 text-center text-sm text-muted-foreground">{isAr?"لا توجد قواعد محفوظة":"No persisted rules"}</div>:rules.map(r=><div key={r.id} className="p-4 flex items-center justify-between gap-4"><div><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground mt-1">{r.refNo} · {r.data?.channel||"in_app"} · {r.data?.severity||"-"}</div></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={()=>toggle(r)}>{r.status}</Button><Button variant="ghost" size="icon" onClick={()=>remove(r.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div></div>)}</div>}</div>
  </div>;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Phone, BellRing, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProviderInfo={configured:boolean;requiredEnv?:string[]};
type DeliveryStatus={providers:{inApp:ProviderInfo;email:ProviderInfo;whatsapp:ProviderInfo;teams:ProviderInfo};outbox:any[]};

export default function AdminIntegrations(){
  const {settings}=useData(); const isAr=settings.language==="ar"; const qc=useQueryClient();
  const {data,isLoading,isFetching}=useQuery<DeliveryStatus>({
    queryKey:["/api/notification-delivery"],
    queryFn:async()=>{const r=await fetch("/api/notification-delivery",{credentials:"include",cache:"no-store"});if(!r.ok)throw new Error("Unable to load delivery status");return r.json();},
    refetchInterval:30000,
  });
  const processQueue=async()=>{
    try{const r=await apiRequest("POST","/api/notification-delivery",{action:"process",limit:20});const p=await r.json();toast.success(isAr?`تمت معالجة ${p.processed||0} رسالة`:`Processed ${p.processed||0} messages`);qc.invalidateQueries({queryKey:["/api/notification-delivery"]});}
    catch(e:any){toast.error(e?.message||"Unable to process queue");}
  };
  const cards=[
    {key:"inApp",label:isAr?"داخل النظام":"In-App",icon:BellRing},
    {key:"email",label:"Email",icon:Mail},
    {key:"teams",label:"Microsoft Teams",icon:MessageSquare},
    {key:"whatsapp",label:"WhatsApp",icon:Phone},
  ] as const;
  const pending=(data?.outbox||[]).filter(x=>x.status==="pending").length;
  const failed=(data?.outbox||[]).filter(x=>x.status==="failed").length;
  const sent=(data?.outbox||[]).filter(x=>x.status==="sent").length;

  return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
    <div className="rounded-3xl border bg-card p-6">
      <h1 className="text-2xl font-bold">{isAr?"تكاملات الإشعارات والتسليم":"Notification & Delivery Integrations"}</h1>
      <p className="text-sm text-muted-foreground mt-2">{isAr?"الأسرار تحفظ فقط في Vercel Environment. هذه الصفحة تعرض الحالة الفعلية ولا تحفظ Tokens في المتصفح.":"Secrets stay only in Vercel Environment. This page reports actual provider readiness and never stores tokens in the browser."}</p>
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map(({key,label,icon:Icon})=>{const p=data?.providers?.[key];return <div key={key} className="rounded-3xl border bg-card p-5">
        <div className="flex items-center justify-between"><div className="h-10 w-10 rounded-2xl bg-primary/10 grid place-items-center"><Icon className="h-4 w-4 text-primary"/></div>{p?.configured?<CheckCircle2 className="h-5 w-5 text-emerald-600"/>:<XCircle className="h-5 w-5 text-amber-500"/>}</div>
        <div className="font-semibold mt-4">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{p?.configured?(isAr?"جاهز للإرسال":"Configured"):(isAr?"غير مهيأ":"Not configured")}</div>
        {!p?.configured&&p?.requiredEnv?.length?<div className="mt-3 text-[10px] font-mono text-muted-foreground break-all">{p.requiredEnv.join(" + ")}</div>:null}
      </div>})}
    </div>

    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap"><div><h2 className="font-semibold">{isAr?"طابور الإشعارات":"Notification Outbox"}</h2><p className="text-xs text-muted-foreground mt-1">{isAr?"Retry تدريجي حتى 5 محاولات للقنوات المهيأة.":"Progressive retry up to 5 attempts for configured providers."}</p></div>
      <Button onClick={processQueue} disabled={isLoading||isFetching}>{isFetching?<Loader2 className="h-4 w-4 animate-spin me-2"/>:<RefreshCw className="h-4 w-4 me-2"/>}{isAr?"معالجة الطابور":"Process Queue"}</Button></div>
      <div className="grid grid-cols-3 gap-3 mt-4">{[[isAr?"معلق":"Pending",pending],[isAr?"مرسل":"Sent",sent],[isAr?"فشل":"Failed",failed]].map(([l,v])=><div key={String(l)} className="rounded-2xl bg-muted/30 p-4"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}</div>
      <div className="mt-4 divide-y border rounded-2xl overflow-hidden">{(data?.outbox||[]).slice(0,20).map((x:any)=><div key={x.id} className="p-3 text-xs flex items-center justify-between gap-3"><div><span className="font-medium">{x.channel}</span><span className="text-muted-foreground ms-2">attempts {x.attempts||0}</span>{x.lastError?<div className="text-red-500 mt-1 line-clamp-1">{x.lastError}</div>:null}</div><span className="rounded-full border px-2 py-1">{x.status}</span></div>)}</div>
    </div>
  </div>;
}

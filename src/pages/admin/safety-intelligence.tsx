import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ClipboardCheck, Flame, ShieldAlert, Wrench, TrendingUp, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";

type Intelligence={
  generatedAt:string;
  metrics:{openObservations:number;highCriticalObservations:number;incidents30d:number;overdueActions:number;openHighRisks:number;overdueInspections:number;openEquipmentDefects:number;fireFaults:number;actionsClosed30d:number};
  rootCauses:Array<{rootCause:string;count:number}>;
  observationCategories:Array<{category:string;count:number}>;
  departmentExposure:Array<{department:string;count:number}>;
};

export default function SafetyIntelligencePage(){
 const {settings}=useData();const isAr=settings.language==="ar";
 const {data,isLoading,error}=useQuery<Intelligence>({queryKey:["/api/safety-intelligence"],queryFn:async()=>{const r=await fetch("/api/safety-intelligence",{credentials:"include",cache:"no-store"});if(!r.ok)throw new Error("Unable to load intelligence");return r.json();},refetchInterval:60000});
 const m=data?.metrics;
 const cards=[
  [isAr?"ملاحظات مفتوحة":"Open Observations",m?.openObservations??0,Activity],
  [isAr?"ملاحظات عالية/حرجة":"High/Critical Observations",m?.highCriticalObservations??0,AlertTriangle],
  [isAr?"حوادث 30 يوم":"Incidents 30d",m?.incidents30d??0,ShieldAlert],
  [isAr?"CAPA متأخرة":"Overdue CAPA",m?.overdueActions??0,ClipboardCheck],
  [isAr?"مخاطر عالية مفتوحة":"Open High Risks",m?.openHighRisks??0,TrendingUp],
  [isAr?"تفتيشات متأخرة":"Overdue Inspections",m?.overdueInspections??0,ClipboardCheck],
  [isAr?"عيوب معدات مفتوحة":"Open Equipment Defects",m?.openEquipmentDefects??0,Wrench],
  [isAr?"أعطال/إنذارات حريق":"Fire Faults / Alarms",m?.fireFaults??0,Flame],
 ] as const;
 return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
  <div className="rounded-3xl border bg-card p-6"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-2xl bg-violet-500/10 grid place-items-center"><TrendingUp className="h-5 w-5 text-violet-600"/></div><div><h1 className="text-2xl font-bold">{isAr?"ذكاء السلامة التشغيلي":"Safety Intelligence"}</h1><p className="text-sm text-muted-foreground mt-1">{isAr?"مؤشرات حقيقية من بيانات البورد، بدون أرقام تجريبية أو استنتاجات مصطنعة.":"Deterministic indicators from live Safety Board records—no demo metrics or fabricated conclusions."}</p></div></div></div>
  {isLoading?<div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>:error?<div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-600">{String((error as Error).message)}</div>:<>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(([label,value,Icon])=><div key={label} className="rounded-3xl border bg-card p-4"><Icon className="h-4 w-4 text-primary mb-3"/><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>)}</div>
  <div className="grid lg:grid-cols-3 gap-4">
   <Rank title={isAr?"الأسباب الجذرية الأكثر تكرارًا":"Recurring Root Causes"} rows={(data?.rootCauses||[]).map(x=>[x.rootCause,x.count])}/>
   <Rank title={isAr?"فئات الملاحظات":"Observation Categories"} rows={(data?.observationCategories||[]).map(x=>[x.category,x.count])}/>
   <Rank title={isAr?"التعرض حسب القسم":"Department Exposure"} rows={(data?.departmentExposure||[]).map(x=>[x.department,x.count])}/>
  </div>
  <div className="rounded-2xl border bg-muted/20 p-4 text-xs text-muted-foreground">{isAr?"الإجراءات المغلقة خلال 30 يوم":"Actions closed in last 30 days"}: <span className="font-semibold text-foreground">{m?.actionsClosed30d??0}</span> · {isAr?"آخر تحديث":"Generated"} {data?.generatedAt?new Date(data.generatedAt).toLocaleString():"-"}</div>
  </>}
 </div>;
}
function Rank({title,rows}:{title:string;rows:Array<[string,number]>}){return <div className="rounded-3xl border bg-card p-5"><h2 className="font-semibold text-sm mb-4">{title}</h2><div className="space-y-3">{rows.length===0?<div className="text-xs text-muted-foreground">No data yet</div>:rows.map(([name,count],i)=><div key={name} className="flex items-center gap-3"><div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">{i+1}</div><div className="flex-1 min-w-0"><div className="text-sm truncate">{name}</div></div><div className="text-sm font-bold">{count}</div></div>)}</div></div>}

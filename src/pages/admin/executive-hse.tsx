import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, Beaker, CheckCircle2, ClipboardCheck, DoorOpen, FileCheck2, Flame, Shield, Siren, Truck, UsersRound } from "lucide-react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";

const load=async<T,>(u:string):Promise<T>=>{const r=await apiRequest("GET",u);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
type AnyRow=Record<string,any>;
const active=(s:string)=>!["Closed","Completed","Cancelled","Resolved","Verified"].includes(String(s||""));
export default function ExecutiveHseDashboard(){
 const {settings}=useData();const isAr=settings.language==="ar";
 const q=useQuery({queryKey:["executive-hse"],queryFn:async()=>{
   const urls={
    actions:"hse-actions",incidents:"incidents",ncr:"ncr",obs:"safety-observations",permits:"ptw-permits",
    equipment:"equipment-safety-assets",defects:"equipment-defects",risks:"risk-register",contractors:"contractors",
    chemicals:"chemicals",fire:"fire-devices",exits:"emergency-exits",responses:"emergency-responses",inspections:"inspection-tasks"
   };
   const entries=await Promise.all(Object.entries(urls).map(async([k,v])=>[k,await load<AnyRow[]>(`/api/data?resource=${v}`)] as const));
   return Object.fromEntries(entries) as Record<string,AnyRow[]>;
 }});
 const d=q.data||{};const arr=(k:string)=>d[k]||[];
 const actions=arr("actions"),incidents=arr("incidents"),ncr=arr("ncr"),obs=arr("obs"),permits=arr("permits"),equipment=arr("equipment"),risks=arr("risks"),contractors=arr("contractors"),chemicals=arr("chemicals"),fire=arr("fire"),exits=arr("exits"),responses=arr("responses"),inspections=arr("inspections");
 const overdueActions=actions.filter(a=>active(a.status)&&a.dueAt&&new Date(a.dueAt)<new Date()).length;
 const criticalActions=actions.filter(a=>active(a.status)&&a.priority==="Critical").length;
 const nearMiss=obs.filter(o=>o.observationType==="Near Miss").length;
 const activePermits=permits.filter(p=>p.status==="Active").length;
 const equipmentDue=equipment.filter(a=>[a.certificateExpiry,a.nextInspectionDate,a.nextMaintenanceDate].some(v=>v&&new Date(v)<new Date())).length;
 const topRisks=[...risks].filter(r=>r.status!=="Closed").sort((a,b)=>(b.residualScore||0)-(a.residualScore||0)).slice(0,5);
 const badFire=fire.filter(x=>["alarm","fault","offline"].includes(x.status)).length;
 const badExits=exits.filter(x=>["blocked","locked","fault","offline"].includes(x.status)||x.obstructionStatus==="blocked").length;
 const blockedContractors=contractors.filter(x=>["Blocked","Suspended","Expired"].includes(x.status)).length;
 const chemIssues=chemicals.filter(x=>["Expired","Restricted"].includes(x.status)||(x.maxAllowedQuantity!=null&&Number(x.quantity)>Number(x.maxAllowedQuantity))).length;
 const inspectionCompliance=inspections.length?Math.round(inspections.filter(x=>x.status==="Completed").length/inspections.length*100):100;
 return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
  <div><h1 className="text-2xl font-bold">{isAr?"لوحة قيادة HSE التنفيذية":"Executive HSE Command Dashboard"}</h1><p className="text-xs text-muted-foreground">{isAr?"صورة موحدة لحالة السلامة عبر جميع وحدات المنصة":"Unified HSE operating picture across all platform modules"}</p></div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
   <Kpi label={isAr?"CAPA متأخرة":"Overdue CAPA"} value={overdueActions} icon={<AlertTriangle/>} href="/admin/action-center" danger/>
   <Kpi label={isAr?"CAPA حرجة":"Critical CAPA"} value={criticalActions} icon={<Siren/>} href="/admin/action-center" danger/>
   <Kpi label={isAr?"Near Miss":"Near Miss"} value={nearMiss} icon={<ClipboardCheck/>} href="/admin/inspections"/>
   <Kpi label={isAr?"PTW نشطة":"Active PTW"} value={activePermits} icon={<FileCheck2/>} href="/admin/permits"/>
   <Kpi label={isAr?"معدات متأخرة":"Equipment Due"} value={equipmentDue} icon={<Truck/>} href="/admin/equipment-safety" danger={equipmentDue>0}/>
   <Kpi label={isAr?"امتثال التفتيش":"Inspection Compliance"} value={inspectionCompliance} suffix="%" icon={<CheckCircle2/>} href="/admin/inspections"/>
  </div>
  <div className="grid gap-4 lg:grid-cols-3">
   <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">{isAr?"أعلى 5 مخاطر متبقية":"Top 5 Residual Risks"}</CardTitle></CardHeader><CardContent className="space-y-3">{topRisks.map((r,i)=><Link key={r.id} href="/admin/risk-register"><div className="cursor-pointer rounded-xl border p-3 hover:bg-muted/50"><div className="flex items-center justify-between"><div><p className="font-semibold">{i+1}. {r.riskNo} — {r.title}</p><p className="text-xs text-muted-foreground">{r.factory||"—"} / {r.area||r.department||"—"}</p></div><Badge variant={r.residualLevel==="Critical"?"destructive":"outline"}>{r.residualScore} · {r.residualLevel}</Badge></div><div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-current text-orange-500" style={{width:`${Math.min(100,(r.residualScore||0)*4)}%`}}/></div></div></Link>)}{!topRisks.length&&<p className="py-8 text-center text-sm text-muted-foreground">{isAr?"لا توجد مخاطر في السجل":"No risks registered"}</p>}</CardContent></Card>
   <Card><CardHeader><CardTitle className="text-base">{isAr?"حالة الأنظمة الحرجة":"Critical Systems"}</CardTitle></CardHeader><CardContent className="space-y-3">
    <Status label={isAr?"أجهزة الحريق Alarm/Fault":"Fire Alarm/Fault"} value={badFire} href="/admin/fire-emergency-command"/>
    <Status label={isAr?"مخارج غير جاهزة":"Unsafe Emergency Exits"} value={badExits} href="/admin/fire-emergency-command"/>
    <Status label={isAr?"استجابات طوارئ فعالة":"Active Emergency Responses"} value={responses.filter(r=>!["All Clear","Closed","Cancelled"].includes(r.status)).length} href="/admin/emergency-response"/>
    <Status label={isAr?"مقاولون محجوبون":"Blocked Contractors"} value={blockedContractors} href="/admin/contractor-safety"/>
    <Status label={isAr?"مشاكل كيميائية":"Chemical Issues"} value={chemIssues} href="/admin/chemicals"/>
   </CardContent></Card>
  </div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Summary icon={<Shield className="h-5 w-5"/>} label={isAr?"الحوادث":"Incidents"} value={incidents.filter(x=>active(x.status)).length} total={incidents.length} href="/admin/incidents"/>
   <Summary icon={<AlertTriangle className="h-5 w-5"/>} label="NCR" value={ncr.filter(x=>active(x.status)).length} total={ncr.length} href="/admin/ncr"/>
   <Summary icon={<UsersRound className="h-5 w-5"/>} label={isAr?"المقاولون":"Contractors"} value={blockedContractors} total={contractors.length} href="/admin/contractor-safety"/>
   <Summary icon={<Beaker className="h-5 w-5"/>} label={isAr?"المواد الكيميائية":"Chemicals"} value={chemIssues} total={chemicals.length} href="/admin/chemicals"/>
  </div>
 </div>;
}
function Kpi({label,value,suffix="",icon,href,danger=false}:{label:string;value:number;suffix?:string;icon:any;href:string;danger?:boolean}){return <Link href={href}><Card className="cursor-pointer hover:shadow-md"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${danger&&value>0?"text-red-600":""}`}>{value}{suffix}</p></div><div className="h-5 w-5 text-muted-foreground">{icon}</div></CardContent></Card></Link>}
function Status({label,value,href}:{label:string;value:number;href:string}){return <Link href={href}><div className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"><span className="text-sm">{label}</span><Badge variant={value>0?"destructive":"outline"}>{value}</Badge></div></Link>}
function Summary({icon,label,value,total,href}:{icon:any;label:string;value:number;total:number;href:string}){return <Link href={href}><Card className="cursor-pointer"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{value} / {total}</p></div></CardContent></Card></Link>}

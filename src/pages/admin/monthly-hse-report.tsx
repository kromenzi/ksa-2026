import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, FileText, Printer, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Report={id:string;reportNo:string;month:number;year:number;status:string;snapshot:any;highlights?:string|null;managementSummary?:string|null;nextMonthPlan?:string|null;generatedAt:string;reviewedAt?:string|null;approvedAt?:string|null;};
const load=async<T,>(u:string):Promise<T>=>{const r=await apiRequest("GET",u);const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load");return p;};
const current=new Date();
const labels:{path:string[];en:string;ar:string}[]=[
 {path:["actions","created"],en:"CAPA Created",ar:"إجراءات CAPA المنشأة"},
 {path:["actions","closed"],en:"CAPA Closed",ar:"إجراءات CAPA المغلقة"},
 {path:["actions","overdue"],en:"CAPA Overdue",ar:"CAPA المتأخرة"},
 {path:["incidents"],en:"Incidents",ar:"الحوادث"},
 {path:["ncr"],en:"NCR",ar:"NCR"},
 {path:["violations"],en:"Violations",ar:"المخالفات"},
 {path:["observations","total"],en:"Safety Observations",ar:"ملاحظات السلامة"},
 {path:["observations","nearMiss"],en:"Near Miss",ar:"Near Miss"},
 {path:["inspections","completed"],en:"Inspections Completed",ar:"التفتيشات المكتملة"},
 {path:["inspections","failed"],en:"Failed Inspections",ar:"التفتيشات غير المطابقة"},
 {path:["ptw","issued"],en:"PTW Issued",ar:"تصاريح العمل"},
 {path:["equipment","defects"],en:"Equipment Defects",ar:"أعطال المعدات"},
 {path:["fireEmergency","fireAlarms"],en:"Fire Alarms",ar:"إنذارات الحريق"},
 {path:["fireEmergency","responses"],en:"Emergency Responses",ar:"استجابات الطوارئ"},
 {path:["training"],en:"Training Records",ar:"سجلات التدريب"},
 {path:["risk","critical"],en:"Critical Residual Risks",ar:"المخاطر الحرجة المتبقية"}
];
const get=(o:any,p:string[])=>p.reduce((a,k)=>a?.[k],o)??0;
export default function MonthlyHseReportPage(){
 const {settings,currentUser}=useData();const isAr=settings.language==="ar";const qc=useQueryClient();
 const reportsQ=useQuery<Report[]>({queryKey:["monthly-hse-reports"],queryFn:()=>load("/api/data?resource=monthly-hse-reports")});
 const reports=reportsQ.data||[];
 const [month,setMonth]=useState(String(current.getMonth()===0?12:current.getMonth()));
 const [year,setYear]=useState(String(current.getMonth()===0?current.getFullYear()-1:current.getFullYear()));
 const [selectedId,setSelectedId]=useState<string>("");
 const selected=reports.find(r=>r.id===(selectedId||reports[0]?.id));
 const [saving,setSaving]=useState(false);
 const refresh=()=>qc.invalidateQueries({queryKey:["monthly-hse-reports"]});
 const generate=async()=>{setSaving(true);try{const r=await apiRequest("POST","/api/data?resource=monthly-hse-report-generate",{month:Number(month),year:Number(year)});const p=await r.json();if(!r.ok)throw new Error(p?.error||"Generation failed");toast.success(isAr?"تم توليد التقرير من بيانات النظام":"Report generated from live system data");await refresh();setSelectedId(p.id);}catch(e:any){toast.error(e?.message||"Generation failed");}finally{setSaving(false);}};
 const patch=async(p:any):Promise<void>=>{if(!selected)return;const r=await apiRequest("PATCH",`/api/data?resource=monthly-hse-reports&id=${selected.id}`,p);const b=await r.json();if(!r.ok){toast.error(b?.error||"Update failed");return;}await refresh();};
 const print=()=>window.print();
 return <div className="space-y-5" dir={isAr?"rtl":"ltr"}>
  <div className="print:hidden flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-700 text-white"><FileText className="h-6 w-6"/></div><div><h1 className="text-2xl font-bold">{isAr?"التقرير الشهري الآلي HSE":"Automatic Monthly HSE Report"}</h1><p className="text-xs text-muted-foreground">{isAr?"Snapshot ثابت يولد تلقائيًا أول كل شهر أو يدويًا عند الحاجة":"Stable monthly snapshot generated automatically or on demand"}</p></div></div><div className="flex flex-wrap gap-2"><Select value={month} onValueChange={setMonth}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=>String(i+1)).map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input className="w-28" type="number" value={year} onChange={e=>setYear(e.target.value)}/><Button onClick={()=>void generate()} disabled={saving}><Sparkles className="me-2 h-4 w-4"/>{isAr?"توليد":"Generate"}</Button><Button variant="outline" onClick={()=>void refresh()}><RefreshCw className="h-4 w-4"/></Button></div></div>
  <div className="print:hidden grid gap-4 lg:grid-cols-[320px_1fr]">
   <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>{isAr?"التقارير":"Reports"}</TableHead><TableHead>{isAr?"الحالة":"Status"}</TableHead></TableRow></TableHeader><TableBody>{reports.map(r=><TableRow key={r.id} className="cursor-pointer" onClick={()=>setSelectedId(r.id)}><TableCell><p className="font-semibold">{r.reportNo}</p><p className="text-xs text-muted-foreground">{r.month}/{r.year}</p></TableCell><TableCell><Badge variant="outline">{r.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
   {!selected?<Card><CardContent className="py-20 text-center text-muted-foreground">{isAr?"اختر أو ولّد تقريرًا":"Select or generate a report"}</CardContent></Card>:<ReportEditor report={selected} isAr={isAr} patch={patch} print={print} currentUserId={currentUser?.id||null}/>}
  </div>
  {selected&&<div className="hidden print:block"><Printable report={selected} isAr={isAr}/></div>}
 </div>;
}
function ReportEditor({report,isAr,patch,print,currentUserId}:{report:Report;isAr:boolean;patch:(p:any)=>Promise<void>;print:()=>void;currentUserId:string|null}){
 const [summary,setSummary]=useState(report.managementSummary||"");const [highlights,setHighlights]=useState(report.highlights||"");const [plan,setPlan]=useState(report.nextMonthPlan||"");
 return <Card><CardContent className="space-y-5 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{report.reportNo}</h2><p className="text-xs text-muted-foreground">{new Date(report.generatedAt).toLocaleString()}</p></div><div className="flex gap-2"><Badge>{report.status}</Badge><Button variant="outline" onClick={print}><Printer className="me-2 h-4 w-4"/>{isAr?"طباعة":"Print"}</Button></div></div><Snapshot snapshot={report.snapshot} isAr={isAr}/><div className="space-y-3"><Field label={isAr?"ملخص الإدارة":"Management Summary"}><Textarea rows={4} value={summary} onChange={e=>setSummary(e.target.value)} onBlur={()=>void patch({managementSummary:summary,status:"Draft Review"})}/></Field><Field label={isAr?"أبرز الإنجازات":"Highlights"}><Textarea rows={3} value={highlights} onChange={e=>setHighlights(e.target.value)} onBlur={()=>void patch({highlights})}/></Field><Field label={isAr?"خطة الشهر القادم":"Next Month Plan"}><Textarea rows={4} value={plan} onChange={e=>setPlan(e.target.value)} onBlur={()=>void patch({nextMonthPlan:plan})}/></Field></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>void patch({status:"Reviewed",reviewedBy:currentUserId,reviewedAt:new Date().toISOString()})}>{isAr?"مراجعة":"Mark Reviewed"}</Button><Button onClick={()=>void patch({status:"Approved",approvedBy:currentUserId,approvedAt:new Date().toISOString()})}><CheckCircle2 className="me-2 h-4 w-4"/>{isAr?"اعتماد":"Approve"}</Button></div></CardContent></Card>
}
function Printable({report,isAr}:{report:Report;isAr:boolean}){return <div className="mx-auto max-w-[190mm] space-y-6 p-6"><div className="border-b pb-4 text-center"><h1 className="text-2xl font-bold">UTEC — {isAr?"التقرير الشهري للصحة والسلامة والبيئة":"Monthly HSE Report"}</h1><p>{report.month}/{report.year} · {report.reportNo}</p></div><Snapshot snapshot={report.snapshot} isAr={isAr}/><section><h2 className="font-bold">{isAr?"ملخص الإدارة":"Management Summary"}</h2><p className="whitespace-pre-wrap">{report.managementSummary||"—"}</p></section><section><h2 className="font-bold">{isAr?"أبرز الإنجازات":"Highlights"}</h2><p className="whitespace-pre-wrap">{report.highlights||"—"}</p></section><section><h2 className="font-bold">{isAr?"خطة الشهر القادم":"Next Month Plan"}</h2><p className="whitespace-pre-wrap">{report.nextMonthPlan||"—"}</p></section></div>}
function Snapshot({snapshot,isAr}:{snapshot:any;isAr:boolean}){return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{labels.map(x=><div key={x.path.join(".")} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{isAr?x.ar:x.en}</p><p className="mt-1 text-2xl font-bold">{get(snapshot,x.path)}</p></div>)}</div>}
function Field({label,children}:{label:string;children:any}){return <div className="space-y-1"><Label>{label}</Label>{children}</div>}

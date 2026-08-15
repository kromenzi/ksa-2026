import { useEffect, useMemo, useState } from "react";
import IncidentPyramid from "@/components/incident-pyramid";
import { Triangle, Download, Printer, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";

export interface PyramidLevelConfig { id:string; nameEn:string; nameAr:string; order:number; category:string; color:string; bgColor:string; enabled:boolean; }
const DEFAULT_PYRAMID_LEVELS:PyramidLevelConfig[]=[
{id:"fatality",nameEn:"Fatalities",nameAr:"الوفيات",order:1,category:"Fatal",color:"text-red-700",bgColor:"bg-red-700",enabled:true},
{id:"lostTime",nameEn:"Lost-Time Injuries",nameAr:"إصابات الوقت الضائع",order:2,category:"Major",color:"text-red-500",bgColor:"bg-red-500",enabled:true},
{id:"restrictedWork",nameEn:"Restricted Work",nameAr:"العمل المقيد",order:3,category:"Restricted Work",color:"text-orange-500",bgColor:"bg-orange-500",enabled:true},
{id:"medicalTreatment",nameEn:"Medical Treatment",nameAr:"العلاج الطبي",order:4,category:"Medical Treatment",color:"text-amber-500",bgColor:"bg-amber-500",enabled:true},
{id:"firstAid",nameEn:"First Aid Cases",nameAr:"حالات الإسعافات الأولية",order:5,category:"First Aid",color:"text-yellow-500",bgColor:"bg-yellow-500",enabled:true},
{id:"nearMiss",nameEn:"Near Misses",nameAr:"الوقائع الوشيكة",order:6,category:"Near Miss",color:"text-emerald-500",bgColor:"bg-emerald-500",enabled:true},
{id:"unsafeActs",nameEn:"At-Risk Behaviors / Unsafe Conditions",nameAr:"السلوكيات والظروف غير الآمنة",order:7,category:"Observation",color:"text-emerald-700",bgColor:"bg-emerald-700",enabled:true}
];

export default function SafetyPyramidPage(){
 const {settings,safetyReports,ncrs,logActivity}=useData();
 const isAr=settings.language==='ar';
 const [pyramidLevels,setPyramidLevels]=useState<PyramidLevelConfig[]>(()=>{try{const s=localStorage.getItem("safety_board_pyramid_config_v2");return s?JSON.parse(s):DEFAULT_PYRAMID_LEVELS}catch{return DEFAULT_PYRAMID_LEVELS}});
 useEffect(()=>{try{localStorage.setItem("safety_board_pyramid_config_v2",JSON.stringify(pyramidLevels))}catch{}},[pyramidLevels]);
 const [settingsOpen,setSettingsOpen]=useState(false);
 const selectedMonth = new Date().getMonth()+1;
 const selectedYear = new Date().getFullYear();
 const enabledLevels = useMemo(()=>pyramidLevels.filter(x=>x.enabled).sort((a,b)=>a.order-b.order),[pyramidLevels]);
 const monthlyData = useMemo<Record<string,number>>(()=>({}),[]);
 const ytdData = useMemo<Record<string,number>>(()=>({}),[]);
 const handlePrint=()=>{logActivity("Print Safety Pyramid","Open comparative monthly vs YTD visual pyramid report","reports");window.print();};
 const exportCSV=()=>{const headers="ID,RecordNo,Date,Department,Location,Category,Severity,Description,Status\n";const rows=[...safetyReports.map(r=>[r.id,r.reportNo,r.date||"",r.department||"",r.location||"",r.category||"",r.riskLevel||"",r.observationDescription||"",r.status||""]),...ncrs.map(r=>[r.id,r.refNo,r.date||"",r.department||"",r.location||"","NCR",r.severity||"",r.description||"",r.status||""])].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([headers+rows],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`incident_pyramid_${selectedYear}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);logActivity("Export Incident Pyramid CSV","Exported comparative incident pyramid source records","reports");toast.success(isAr?'تم تصدير البيانات بنجاح':'Data exported successfully');};
 return <div className="space-y-6" dir={isAr?'rtl':'ltr'}>
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm">
   <div><div className="flex items-center gap-2.5 mb-1.5"><div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Triangle className="h-5 w-5 fill-red-500/20"/></div><h1 className="text-xl font-bold tracking-tight text-foreground">{isAr?`الهرم الأمني للحوادث - ${selectedYear}`:`Incident Pyramid - ${selectedYear}`}</h1></div><p className="text-sm text-muted-foreground">{isAr?'مقارنة هرم السلامة للشهر المحدد مع التراكمي منذ بداية السنة (YTD)':'Comparative safety pyramid for selected month vs. Year-To-Date (YTD) cumulative record'}</p></div>
   <div className="flex items-center gap-2.5 flex-wrap"><Button variant="outline" onClick={()=>setSettingsOpen(true)} className="rounded-2xl gap-2"><Settings className="h-4 w-4"/>{isAr?'إعدادات الهرم':'Pyramid Settings'}</Button><Button variant="outline" onClick={exportCSV} className="rounded-2xl gap-2"><Download className="h-4 w-4"/>{isAr?'تصدير CSV':'Export CSV'}</Button><Button onClick={handlePrint} className="rounded-2xl gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md"><Printer className="h-4 w-4"/>{isAr?'طباعة / PDF':'Print / PDF'}</Button></div>
  </div>
  <IncidentPyramid month={selectedMonth} year={selectedYear} monthlyData={monthlyData} ytdData={ytdData} />
  <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>{isAr?'إعدادات الهرم':'Pyramid Settings'}</DialogTitle><DialogDescription>{isAr?'تفعيل أو تعطيل مستويات الهرم المستخدمة في العرض والتقرير.':'Enable or disable pyramid levels used in the display and report.'}</DialogDescription></DialogHeader><div className="space-y-2">{pyramidLevels.map(level=><label key={level.id} className="flex items-center justify-between border rounded-lg p-2"><span>{isAr?level.nameAr:level.nameEn}</span><input type="checkbox" checked={level.enabled} onChange={e=>setPyramidLevels(v=>v.map(x=>x.id===level.id?{...x,enabled:e.target.checked}:x))}/></label>)}</div><DialogFooter><Button onClick={()=>setSettingsOpen(false)}>{isAr?'إغلاق':'Close'}</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
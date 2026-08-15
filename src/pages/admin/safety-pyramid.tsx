import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import IncidentPyramid from "@/components/incident-pyramid";
import { Triangle, Download, Printer, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface PyramidLevelConfig { id:string; nameEn:string; nameAr:string; order:number; category:string; color:string; bgColor:string; enabled:boolean; }
const DEFAULT_PYRAMID_LEVELS:PyramidLevelConfig[]=[
{id:"fatal",nameEn:"Fatalities",nameAr:"الوفيات",order:1,category:"Fatal",color:"text-red-700",bgColor:"bg-red-700",enabled:true},
{id:"major",nameEn:"Major Injuries",nameAr:"إصابات جسيمة",order:2,category:"Major",color:"text-red-500",bgColor:"bg-red-500",enabled:true},
{id:"minor",nameEn:"Minor Injuries",nameAr:"إصابات طفيفة",order:3,category:"Minor",color:"text-amber-500",bgColor:"bg-amber-500",enabled:true},
{id:"first_aid",nameEn:"First Aid Cases",nameAr:"حالات الإسعافات الأولية",order:4,category:"First Aid",color:"text-yellow-500",bgColor:"bg-yellow-500",enabled:true},
{id:"property",nameEn:"Property Damage",nameAr:"أضرار الممتلكات والمعدات",order:5,category:"Property Damage",color:"text-orange-500",bgColor:"bg-orange-500",enabled:true},
{id:"near_miss",nameEn:"Near Misses",nameAr:"الوقائع الوشيكة (Near Miss)",order:6,category:"Near Miss",color:"text-blue-500",bgColor:"bg-blue-500",enabled:true},
{id:"observations",nameEn:"Unsafe Acts & Conditions",nameAr:"الأفعال والظروف غير الآمنة",order:7,category:"Observation",color:"text-emerald-500",bgColor:"bg-emerald-500",enabled:true}
];

export default function SafetyPyramidPage(){
 const {settings,safetyReports,ncrs,logActivity}=useData();
 const isAr=settings.language==='ar';
 const [pyramidLevels,setPyramidLevels]=useState<PyramidLevelConfig[]>(()=>{try{const s=localStorage.getItem("safety_board_pyramid_config_v1");return s?JSON.parse(s):DEFAULT_PYRAMID_LEVELS}catch{return DEFAULT_PYRAMID_LEVELS}});
 useEffect(()=>{try{localStorage.setItem("safety_board_pyramid_config_v1",JSON.stringify(pyramidLevels))}catch{}},[pyramidLevels]);
 const [settingsOpen,setSettingsOpen]=useState(false);
 const allRecords=safetyReports.map(rep=>({
  id:rep.id, date:rep.date||new Date().toISOString().slice(0,10), department:rep.department||"General", location:rep.location||"Main Plant",
  severity:(rep.riskLevel?.toLowerCase()==='high'?'Major':'Near Miss'), description:rep.observationDescription||"Safety observation recorded", status:rep.status||"Open",
  factory:"Main Factory 1", reportNo:rep.reportNo
 })).concat(ncrs.map(ncr=>({
  id:ncr.id, date:ncr.date||new Date().toISOString().slice(0,10), department:ncr.department||"General", location:ncr.location||"Main Plant",
  severity:"Property Damage", description:ncr.description||"NCR recorded", status:ncr.status||"Open", factory:"Main Factory 1", reportNo:ncr.refNo
 })));
 const getLevelCount=(levelId:string)=>{switch(levelId){case"fatal":return allRecords.filter(r=>r.severity==="Fatal").length;case"major":return allRecords.filter(r=>r.severity==="Major").length;case"minor":return allRecords.filter(r=>r.severity==="Minor").length;case"first_aid":return allRecords.filter(r=>r.severity==="First Aid").length;case"property":return allRecords.filter(r=>r.severity==="Property Damage").length;case"near_miss":return allRecords.filter(r=>r.severity==="Near Miss").length;case"observations":return allRecords.filter(r=>r.severity==="Unsafe Act"||r.severity==="Unsafe Condition"||r.severity==="Observation").length;default:return 0}};
 const totalIncidents=allRecords.filter(r=>["Fatal","Major","Minor","First Aid","Property Damage"].includes(r.severity)).length;
 const totalNearMisses=getLevelCount("near_miss"); const totalObservations=getLevelCount("observations");
 const printLevels=pyramidLevels.filter(x=>x.enabled).sort((a,b)=>a.order-b.order);
 const handlePrint=()=>{logActivity("Print Safety Pyramid","Open isolated visual pyramid print page","reports");const q=new URLSearchParams({lang:isAr?"ar":"en",month:new Intl.DateTimeFormat(isAr?'ar-SA':'en-US',{month:'long'}).format(new Date()),year:String(new Date().getFullYear()),levels:JSON.stringify(printLevels.map(l=>({id:l.id,nameEn:l.nameEn,nameAr:l.nameAr,order:l.order}))),counts:JSON.stringify(printLevels.map(l=>({id:l.id,monthly:getLevelCount(l.id),ytd:getLevelCount(l.id)}))),incidents:String(totalIncidents),nearMisses:String(totalNearMisses),observations:String(totalObservations)});window.open(`/admin/safety-pyramid-print?${q.toString()}`,"_blank","noopener,noreferrer");};
 const exportCSV=()=>{const headers="ID,RecordNo,Date,Department,Location,Severity,Description,Status\n";const rows=allRecords.map(r=>`"${r.id}","${r.reportNo}","${r.date}","${r.department}","${r.location}","${r.severity}","${r.description.replace(/"/g,'""')}","${r.status}"`).join("\n");const blob=new Blob([headers+rows],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`safety_pyramid_export_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);logActivity("Export CSV","Exported safety pyramid records to CSV","reports");toast.success(isAr?'تم تصدير ملف CSV بنجاح':'CSV exported successfully')};
 return <div className="space-y-6" dir={isAr?'rtl':'ltr'}><div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm"><div><div className="flex items-center gap-2.5 mb-1.5"><div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Triangle className="h-5 w-5 fill-red-500/20"/></div><h1 className="text-xl font-bold tracking-tight text-foreground">{isAr?'الهرم الأمني الديناميكي (Safety Pyramid)':'Dynamic Safety & Incident Pyramid'}</h1></div><p className="text-sm text-muted-foreground">{isAr?'تحليل تسلسلي حقيقي ومباشر للحوادث والوقائع الوشيكة والظروف غير الآمنة':'Enterprise safety analytics tracking incidents, near misses, and unsafe conditions'}</p></div><div className="flex items-center gap-2.5 flex-wrap"><Button variant="outline" onClick={()=>setSettingsOpen(true)} className="rounded-2xl gap-2"><Settings className="h-4 w-4"/>{isAr?'إعدادات الهرم':'Pyramid Settings'}</Button><Button variant="outline" onClick={exportCSV} className="rounded-2xl gap-2"><Download className="h-4 w-4"/>{isAr?'تصدير CSV':'Export CSV'}</Button><Button onClick={handlePrint} className="rounded-2xl gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md"><Printer className="h-4 w-4"/>{isAr?'طباعة / تقرير PDF':'Print / PDF Report'}</Button></div></div><IncidentPyramid month={new Date().getMonth()+1} year={new Date().getFullYear()} /><Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>{isAr?'إعدادات الهرم':'Pyramid Settings'}</DialogTitle><DialogDescription>{isAr?'تفعيل أو تعطيل مستويات الهرم المستخدمة في التقرير المرئي.':'Enable or disable pyramid levels used in the visual report.'}</DialogDescription></DialogHeader><div className="space-y-2">{pyramidLevels.map(level=><label key={level.id} className="flex items-center justify-between border rounded-lg p-2"><span>{isAr?level.nameAr:level.nameEn}</span><input type="checkbox" checked={level.enabled} onChange={e=>setPyramidLevels(v=>v.map(x=>x.id===level.id?{...x,enabled:e.target.checked}:x))}/></label>)}</div><DialogFooter><Button onClick={()=>setSettingsOpen(false)}>{isAr?'إغلاق':'Close'}</Button></DialogFooter></DialogContent></Dialog></div>;
}

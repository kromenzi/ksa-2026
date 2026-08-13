"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Plus, Search, Eye, Printer, HelpCircle, GitMerge, ShieldAlert } from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface FiveWhyItem { whyNo: number; question: string; answer: string; }
export interface FishboneCategory {
  category: "Man (People)" | "Machine (Equipment)" | "Method (Process)" | "Material" | "Environment";
  cause: string;
}
export interface IncidentRecord {
  id: string; refNo: string;
  type: "Near Miss" | "First Aid" | "Medical Treatment" | "Lost Time Injury" | "Property Damage" | "Environmental" | "Vehicle";
  title: string; date: string; time: string; location: string; department: string; factory: string; reportedBy: string;
  severity: "Low" | "Medium" | "High" | "Critical"; description: string; fiveWhys: FiveWhyItem[];
  fishbone: FishboneCategory[];
  correctiveActions: Array<{ action: string; responsible: string; targetDate: string; status: "Open" | "Closed" }>;
  lessonsLearned: string;
  status: "Under Investigation" | "Actions Pending" | "Closed";
}

const SAMPLE_INCIDENTS: IncidentRecord[] = [{
  id: "INC-001", refNo: "INC-2024-101", type: "Near Miss",
  title: "Unsecured Scaffold Board Slipped Near High Bay Rack", date: "2024-05-18", time: "11:15 AM",
  location: "High Bay Storage Warehouse B", department: "Logistics", factory: "Main Factory 1", reportedBy: "Tariq Mansoor",
  severity: "Medium",
  description: "During routine rack inspection, a wooden scaffold board was observed unclipped and overhang by 15cm. It slipped when bumped by forklift pole but caught on secondary crossbar.",
  fiveWhys: [
    { whyNo: 1, question: "Why did the scaffold board slip?", answer: "It was not secured with standard toe-board locks." },
    { whyNo: 2, question: "Why was it not secured?", answer: "The locking pins were damaged during last shift setup." },
    { whyNo: 3, question: "Why were damaged pins used?", answer: "No spare locking pins were available in the maintenance crib." },
    { whyNo: 4, question: "Why were no spares available?", answer: "Re-order threshold was not triggered in inventory system." },
    { whyNo: 5, question: "Root Cause: Why was threshold not triggered?", answer: "Part number mapping was missing in computerized maintenance management software." }
  ],
  fishbone: [
    { category: "Machine (Equipment)", cause: "Worn scaffold locking pins" },
    { category: "Method (Process)", cause: "Pre-use checklist did not enforce pin verification" },
    { category: "Material", cause: "Lack of spare lock pins" }
  ],
  correctiveActions: [
    { action: "Replace all damaged scaffold pins across Warehouse B", responsible: "Mohammad Hassan", targetDate: "2024-05-20", status: "Closed" },
    { action: "Update inventory min-max thresholds for scaffold hardware", responsible: "Logistics Manager", targetDate: "2024-05-25", status: "Open" }
  ],
  lessonsLearned: "Always perform a secondary mechanical pin lock check before ascending scaffold platforms. Never operate with unverified lock hardware.",
  status: "Actions Pending"
}];

const esc = (value: string) => value || "—";

export default function AdminIncidentsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [, setLocation] = useLocation();
  const [incidents, setIncidents] = useState<IncidentRecord[]>(SAMPLE_INCIDENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeIncident, setActiveIncident] = useState<IncidentRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const filtered = incidents.filter((inc) => {
    const q = searchTerm.toLowerCase();
    return (inc.title.toLowerCase().includes(q) || inc.refNo.toLowerCase().includes(q)) && (typeFilter === "all" || inc.type === typeFilter);
  });

  const openEscalation = (refNo: string) => {
    setLocation(`/admin/escalations?source=${encodeURIComponent(refNo)}`);
  };

  const printIncident = () => {
    if (!activeIncident) return;
    setPrintItem({
      id: activeIncident.id,
      type: "report",
      refNo: activeIncident.refNo,
      title: `${isAr ? "تحليل الحادث والسبب الجذر (RCA)" : "Incident Investigation & Root Cause Analysis"} - ${activeIncident.title || activeIncident.refNo}`,
      department: activeIncident.department,
      severity: activeIncident.severity,
      status: activeIncident.status,
      date: activeIncident.date,
      sections: [
        { label: isAr ? "عنوان الواقعة / الحادث" : "Incident Title", value: esc(activeIncident.title) },
        { label: isAr ? "الرقم المرجعي" : "Reference No", value: esc(activeIncident.refNo) },
        { label: isAr ? "نوع الحادث" : "Incident Type", value: esc(activeIncident.type) },
        { label: isAr ? "التاريخ والوقت" : "Date & Time", value: `${esc(activeIncident.date)} — ${esc(activeIncident.time)}` },
        { label: isAr ? "الموقع" : "Location", value: esc(activeIncident.location) },
        { label: isAr ? "القسم / المصنع" : "Department / Factory", value: `${esc(activeIncident.department)} / ${esc(activeIncident.factory)}` },
        { label: isAr ? "المبلّغ" : "Reported By", value: esc(activeIncident.reportedBy) },
        { label: isAr ? "الحالة" : "Status", value: esc(activeIncident.status) },
        { label: isAr ? "وصف الحادث التفصيلي" : "Detailed Incident Description", value: esc(activeIncident.description) },
        { label: isAr ? "تحليل الأسباب الخمسة (5 Why)" : "5-Why Root Cause Analysis", value: activeIncident.fiveWhys.map(fw => `${isAr ? `لماذا #${fw.whyNo}` : `Why #${fw.whyNo}`}: ${esc(fw.question)}\n${esc(fw.answer)}`).join("\n\n") },
        { label: isAr ? "تحليل عظم السمكة (Ishikawa)" : "Fishbone / Ishikawa Analysis", value: activeIncident.fishbone.map(fb => `${fb.category}: ${esc(fb.cause)}`).join("\n") },
        { label: isAr ? "الإجراءات التصحيحية والوقائية" : "Corrective & Preventive Actions", value: activeIncident.correctiveActions.map(a => `${esc(a.action)} | ${esc(a.responsible)} | ${esc(a.targetDate)} | ${esc(a.status)}`).join("\n") },
        { label: isAr ? "الدروس المستفادة" : "Lessons Learned", value: esc(activeIncident.lessonsLearned) },
      ],
    });
    setIsPrintOpen(true);
  };

  const createIncident = () => {
    const newInc: IncidentRecord = {
      id: `INC-${Date.now()}`,
      refNo: `INC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      type: "Near Miss", title: "", date: new Date().toISOString().split("T")[0], time: "10:00 AM",
      location: "Factory Floor", department: "Production", factory: "Main Factory 1", reportedBy: "Abdulkarem Alanzi", severity: "Medium", description: "",
      fiveWhys: [1,2,3,4,5].map(n => ({ whyNo: n, question: n === 5 ? "Root Cause?" : n === 1 ? "Why did it happen?" : "Why?", answer: "" })),
      fishbone: [{ category: "Man (People)", cause: "" }],
      correctiveActions: [{ action: "Immediate safety briefing", responsible: "Safety Team", targetDate: new Date().toISOString().split("T")[0], status: "Open" }],
      lessonsLearned: "", status: "Under Investigation"
    };
    setActiveIncident(newInc);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-incidents-page">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20"><AlertTriangle className="h-5 w-5 text-white" /></div>
            <div><h2 className="text-[28px] font-bold tracking-tight">{isAr ? "إدارة الحوادث والوقائع الوشيكة (Near Miss)" : "Incidents & Near Miss Management"}</h2><p className="text-[12px] text-muted-foreground">{isAr ? "تحليل السبب الجذر (5 Why & Fishbone)، الخطة التصحيحية والدروس المستفادة" : "Root cause investigation (5-Why & Fishbone), corrective action tracking & lessons learned"}</p></div></div>
          <Button type="button" onClick={createIncident} className="gap-2 bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4" />{isAr ? "تسجيل حادث / وشيكة جديد" : "Report Incident / Near Miss"}</Button>
        </div>
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" /><Input placeholder={isAr ? "البحث بالرقم المرجعي، العنوان أو الموقع..." : "Search incidents..."} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9 rtl:pr-9 rtl:pl-3" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder={isAr ? "نوع الحادث" : "Incident Type"} /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "جميع الأنواع" : "All Types"}</SelectItem><SelectItem value="Near Miss">Near Miss</SelectItem><SelectItem value="First Aid">First Aid</SelectItem><SelectItem value="Lost Time Injury">Lost Time Injury (LTI)</SelectItem><SelectItem value="Property Damage">Property Damage</SelectItem></SelectContent></Select></div>
          <div className="rounded-lg border overflow-hidden"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead>{isAr ? "الرقم المرجعي" : "Ref No"}</TableHead><TableHead>{isAr ? "النوع والعنوان" : "Type & Title"}</TableHead><TableHead>{isAr ? "الموقع والقسم" : "Location & Dept"}</TableHead><TableHead>{isAr ? "التاريخ والخطورة" : "Date & Severity"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right rtl:text-left">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>{filtered.map(inc=><TableRow key={inc.id}><TableCell className="font-mono text-xs font-semibold">{inc.refNo}</TableCell><TableCell><p className="font-semibold text-sm">{inc.title||"—"}</p><Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 mt-0.5">{inc.type}</Badge></TableCell><TableCell><p className="text-xs font-medium">{inc.location}</p><p className="text-[11px] text-muted-foreground">{inc.department}</p></TableCell><TableCell><p className="text-xs">{inc.date}</p><Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600">{inc.severity} Severity</Badge></TableCell><TableCell><Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{inc.status}</Badge></TableCell><TableCell className="text-right rtl:text-left"><Button type="button" size="icon" variant="outline" aria-label={isAr?"تصعيد للإدارة":"Escalate to Management"} title={isAr?"تصعيد للإدارة":"Escalate to Management"} className="h-9 w-9 mr-1 rtl:mr-0 rtl:ml-1 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700" onClick={e=>{e.preventDefault();e.stopPropagation();openEscalation(inc.refNo);}}><ShieldAlert className="h-5 w-5" strokeWidth={2.5}/></Button><Button type="button" size="icon" variant="outline" aria-label={isAr?"عرض الحادث":"View incident"} title={isAr?"عرض الحادث":"View incident"} onClick={()=>{setActiveIncident(inc);setIsDialogOpen(true);}}><Eye className="h-4 w-4"/></Button></TableCell></TableRow>)}</TableBody></Table></div>
        </Card>
      </div>

      {activeIncident && isDialogOpen && <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center justify-between"><span>{isAr?"تحليل الحادث والسبب الجذر (RCA)":"Incident Investigation & Root Cause Analysis"}</span><Button type="button" variant="outline" size="sm" onClick={printIncident} className="gap-2"><Printer className="h-4 w-4" />{isAr?"طباعة التقرير":"Print Investigation"}</Button></DialogTitle></DialogHeader><Tabs defaultValue="overview" className="w-full mt-2"><TabsList className="grid grid-cols-4 w-full"><TabsTrigger value="overview">{isAr?"الوصف العام":"Overview"}</TabsTrigger><TabsTrigger value="fivewhy">{isAr?"تحليل 5 Why":"5-Why RCA"}</TabsTrigger><TabsTrigger value="fishbone">{isAr?"عظم السمكة (Ishikawa)":"Fishbone"}</TabsTrigger><TabsTrigger value="actions">{isAr?"الإجراءات والدروس":"Actions & Lessons"}</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-3 pt-4 text-sm"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold">{isAr?"عنوان الواقعة / الحادث":"Incident Title"}</label><Input value={activeIncident.title} onChange={e=>setActiveIncident({...activeIncident,title:e.target.value})}/></div><div><label className="text-xs font-semibold">{isAr?"الموقع":"Location"}</label><Input value={activeIncident.location} onChange={e=>setActiveIncident({...activeIncident,location:e.target.value})}/></div></div><div><label className="text-xs font-semibold">{isAr?"وصف الحادث التفصيلي":"Detailed Description"}</label><textarea className="w-full p-2 text-xs border rounded-md h-20 bg-background" value={activeIncident.description} onChange={e=>setActiveIncident({...activeIncident,description:e.target.value})}/></div></TabsContent><TabsContent value="fivewhy" className="space-y-3 pt-4"><h4 className="font-semibold text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4 text-blue-500" />{isAr?"منهجية الأسباب الخمسة (5-Why Analysis)":"5-Why Root Cause Methodology"}</h4>{activeIncident.fiveWhys.map((fw,idx)=><div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-1 text-xs"><p className="font-bold text-blue-600">Why #{fw.whyNo}: {fw.question}</p><Input value={fw.answer} placeholder={`Answer for Why #${fw.whyNo}`} onChange={e=>{const updated=[...activeIncident.fiveWhys];updated[idx]={...updated[idx],answer:e.target.value};setActiveIncident({...activeIncident,fiveWhys:updated});}}/></div>)}</TabsContent><TabsContent value="fishbone" className="space-y-3 pt-4"><h4 className="font-semibold text-sm flex items-center gap-2"><GitMerge className="h-4 w-4 text-purple-500" />{isAr?"مخطط عظم السمكة (Ishikawa Diagram Categories)":"Ishikawa Fishbone Cause Diagram"}</h4>{activeIncident.fishbone.map((fb,idx)=><div key={idx} className="flex items-center gap-3 border p-2.5 rounded-md text-xs"><span className="font-bold w-44">{fb.category}:</span><Input value={fb.cause} placeholder="Identified cause factor..." onChange={e=>{const updated=[...activeIncident.fishbone];updated[idx]={...updated[idx],cause:e.target.value};setActiveIncident({...activeIncident,fishbone:updated});}}/></div>)}</TabsContent><TabsContent value="actions" className="space-y-3 pt-4"><div><h4 className="font-semibold text-sm mb-2">{isAr?"الدروس المستفادة (Lessons Learned)":"Lessons Learned Bulletin"}</h4><textarea className="w-full p-2 text-xs border rounded-md h-16 bg-background" value={activeIncident.lessonsLearned} onChange={e=>setActiveIncident({...activeIncident,lessonsLearned:e.target.value})}/></div></TabsContent></Tabs><DialogFooter className="mt-4 gap-2"><Button type="button" variant="outline" onClick={()=>setIsDialogOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button type="button" variant="outline" onClick={printIncident} className="gap-2"><Printer className="h-4 w-4" /><span>{isAr?"طباعة تقرير RCA":"Print RCA Report"}</span></Button><Button type="button" onClick={()=>{if(activeIncident)setIncidents(prev=>prev.some(i=>i.id===activeIncident.id)?prev.map(i=>i.id===activeIncident.id?activeIncident:i):[activeIncident,...prev]);setIsDialogOpen(false);}} className="bg-red-600 hover:bg-red-700">{isAr?"حفظ الحادث":"Save Incident"}</Button></DialogFooter></DialogContent></Dialog>}

      {printItem && <PrintShareDialog open={isPrintOpen} onOpenChange={setIsPrintOpen} item={printItem} />}
    </div>
  );
}

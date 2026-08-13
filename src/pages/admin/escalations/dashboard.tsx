import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import PrintShareDialog from "@/components/print-share-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, Activity, Search, ArrowUpRight, ShieldAlert, Flame, Download, Printer, CheckCircle2, ShieldCheck, Eye, Send, Building2, User, Calendar, FileText, BellRing, Mail, MessageSquare } from "lucide-react";

type Escalation = { id: string; refNo: string; source: string; title: string; severity: string; level: string; status: string; dueDate: string; responsible: string; department: string; reason: string; createdAt: string; updatedAt?: string; history?: any[] };

const FALLBACK_ESCALATIONS: Escalation[] = [
  { id: "ESC-2026-0001", refNo: "ESC-2026-0001", source: "NCR-2026-00125", title: "Unsafe Condition at Area B", severity: "HIGH", level: "Level 2 - Dept Manager", status: "OPEN", dueDate: "2026-08-09", responsible: "John Doe", department: "Production", reason: "Uncorrected safety non-conformity exceeding standard SLA.", createdAt: "2026-08-05" },
  { id: "ESC-2026-0002", refNo: "ESC-2026-0002", source: "INC-2026-00042", title: "Forklift Near Miss", severity: "CRITICAL", level: "Level 4 - Plant Manager", status: "OVERDUE", dueDate: "2026-08-06", responsible: "Jane Smith", department: "Logistics", reason: "Near-miss event involving heavy equipment near pedestrian walkway.", createdAt: "2026-08-03" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
}

function csvCell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export default function EscalationDashboard() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const [location, setLocation] = useLocation();
  const query = location.includes("?") ? location.slice(location.indexOf("?") + 1) : "";
  const sourceParam = useMemo(() => new URLSearchParams(query).get("source") || "", [query]);

  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState<Escalation[]>(FALLBACK_ESCALATIONS);
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [sourceVal, setSourceVal] = useState("");
  const [titleVal, setTitleVal] = useState("");
  const [severityVal, setSeverityVal] = useState("HIGH");
  const [departmentVal, setDepartmentVal] = useState("Production");
  const [levelVal, setLevelVal] = useState("Level 2 - Dept Manager");
  const [responsibleVal, setResponsibleVal] = useState("");
  const [reasonVal, setReasonVal] = useState("");
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<Escalation | null>(null);
  const [reminderText, setReminderText] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendSystemAlert, setSendSystemAlert] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest("GET", "/api/escalations")
      .then(async response => { if (!response.ok) throw new Error("Unable to load escalations"); return response.json(); })
      .then(rows => { if (!cancelled && Array.isArray(rows)) setEscalations(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sourceParam) return;
    setSourceVal(sourceParam);
    setIsEscalateOpen(true);
  }, [sourceParam]);

  const filteredEscalations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return escalations;
    return escalations.filter(item => [item.title, item.source, item.refNo, item.department, item.responsible].some(value => String(value || "").toLowerCase().includes(q)));
  }, [escalations, searchQuery]);
  const active = filteredEscalations.filter(item => !["RESOLVED", "CLOSED"].includes(item.status));
  const overdue = filteredEscalations.filter(item => item.status === "OVERDUE");

  const closeEscalateDialog = (open: boolean) => {
    setIsEscalateOpen(open);
    if (!open && sourceParam) setLocation("/admin/escalations");
  };

  const historyEntry = (action: string, status: string, details = "") => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action, status, user: currentUser?.name || currentUser?.email || "Current User", date: new Date().toISOString(), details });

  const handleConfirmEscalation = async () => {
    if (!titleVal.trim()) { toast.error(isAr ? "يرجى كتابة عنوان المشكلة" : "Please enter issue title"); return; }
    try {
      const response = await apiRequest("POST", "/api/escalations", { source: sourceVal.trim() || "MANUAL", title: titleVal.trim(), severity: severityVal, level: levelVal, department: departmentVal, responsible: responsibleVal.trim() || (isAr ? "مدير السلامة / الجودة" : "HSE Lead"), reason: reasonVal.trim() });
      if (!response.ok) throw new Error("Unable to save escalation");
      const created = await response.json();
      setEscalations(prev => [created, ...prev]);
      toast.success(isAr ? "تم إرسال التصعيد للإدارة بنجاح" : "Escalation created successfully");
      setTitleVal(""); setSourceVal(""); setReasonVal(""); setResponsibleVal(""); closeEscalateDialog(false);
    } catch (error: any) {
      toast.error(isAr ? "تعذر حفظ التصعيد" : "Unable to save escalation", { description: error?.message || "Backend error" });
    }
  };

  const handleView = (item: Escalation) => { setSelectedEscalation(item); setIsViewOpen(true); };

  const handleUpdateStatus = async (item: Escalation, newStatus: string) => {
    const updated = { ...item, status: newStatus };
    setEscalations(prev => prev.map(row => row.id === item.id ? updated : row));
    if (selectedEscalation?.id === item.id) setSelectedEscalation(updated);
    try {
      const response = await apiRequest("PATCH", `/api/escalations/${encodeURIComponent(item.id)}`, { status: newStatus, historyEntry: historyEntry(`Status changed to ${newStatus}`, newStatus) });
      if (!response.ok) throw new Error("Unable to update escalation");
      toast.success(isAr ? `تم تغيير الحالة إلى ${newStatus}` : `Status changed to ${newStatus}`);
    } catch (error: any) {
      toast.error(isAr ? "تعذر تحديث التصعيد" : "Unable to update escalation", { description: error?.message || "Backend error" });
    }
  };

  const openReminder = (item: Escalation) => {
    setReminderTarget(item);
    setReminderText(isAr ? `تذكير إداري عاجل: يرجى اتخاذ الإجراء التصحيحي اللازم حيال (${item.title}) - المرجع ${item.source} - مستوى ${item.level} - الموعد ${item.dueDate}.` : `Urgent reminder: please take corrective action for (${item.title}) - Ref ${item.source} - ${item.level} - Due ${item.dueDate}.`);
    setIsReminderOpen(true);
  };

  const sendReminder = async () => {
    if (!reminderTarget) return;
    const channels = [sendEmail ? "Email" : "", sendSms ? "WhatsApp / SMS" : "", sendSystemAlert ? "System Alert" : ""].filter(Boolean);
    if (!channels.length) { toast.error(isAr ? "اختر قناة إرسال واحدة على الأقل" : "Select at least one delivery channel"); return; }
    try {
      const response = await apiRequest("PATCH", `/api/escalations/${encodeURIComponent(reminderTarget.id)}`, { status: "WAITING FOR RESPONSE", historyEntry: historyEntry("Urgent Reminder Sent", "WAITING FOR RESPONSE", `${channels.join(", ")} — ${reminderText}`) });
      if (!response.ok) throw new Error("Unable to record reminder");
      const updated = { ...reminderTarget, status: "WAITING FOR RESPONSE" };
      setEscalations(prev => prev.map(row => row.id === reminderTarget.id ? updated : row));
      if (selectedEscalation?.id === reminderTarget.id) setSelectedEscalation(updated);
      setIsReminderOpen(false);
      toast.success(isAr ? "تم تسجيل التذكير العاجل" : "Urgent reminder recorded");
    } catch (error: any) {
      toast.error(isAr ? "تعذر تسجيل التذكير" : "Unable to record reminder", { description: error?.message || "Backend error" });
    }
  };

  const makePrintItem = (item: Escalation) => ({
    id: item.id, type: "report" as const, refNo: item.refNo || item.id,
    title: `${isAr ? "تقرير تصعيد إداري" : "Management Escalation Report"} - ${item.title}`,
    department: item.department, severity: item.severity, status: item.status, date: item.createdAt?.slice(0, 10),
    sections: [
      { label: isAr ? "رقم التصعيد" : "Escalation ID", value: item.refNo || item.id },
      { label: isAr ? "المصدر المرتبط" : "Source Reference", value: item.source },
      { label: isAr ? "عنوان المشكلة" : "Issue Title", value: item.title },
      { label: isAr ? "مستوى التصعيد" : "Escalation Level", value: item.level },
      { label: isAr ? "مستوى الخطورة" : "Severity Level", value: item.severity },
      { label: isAr ? "المسؤول" : "Responsible Person", value: item.responsible },
      { label: isAr ? "القسم" : "Department", value: item.department },
      { label: isAr ? "تاريخ الاستحقاق" : "Due Date", value: item.dueDate },
      { label: isAr ? "سبب وتفاصيل التصعيد" : "Escalation Details", value: item.reason || "—" },
    ],
  });

  const openPrintItem = (item: Escalation) => { setPrintItem(makePrintItem(item)); setIsPrintOpen(true); };

  const printRegister = () => {
    setPrintItem({ id: "ESC-REGISTER-2026", type: "report", refNo: "ESC-REG-2026", title: isAr ? "السجل الشامل لتصعيدات الإدارة العليا" : "Management Escalations Comprehensive Register", department: "Management / HSE Board", severity: "HIGH", status: "ACTIVE", date: new Date().toISOString().slice(0, 10), sections: [
      { label: isAr ? "إجمالي التصعيدات" : "Total Escalations", value: String(filteredEscalations.length) },
      { label: isAr ? "التصعيدات النشطة" : "Active Escalations", value: String(active.length) },
      { label: isAr ? "التصعيدات المتأخرة" : "Overdue Escalations", value: String(overdue.length) },
      { label: isAr ? "تفاصيل السجل" : "Register Details", value: filteredEscalations.map(item => `${item.refNo || item.id} | ${item.title} | ${item.severity} | ${item.status} | ${item.dueDate}`).join("\n") || "No records" },
    ] });
    setIsPrintOpen(true);
  };

  const exportCsv = () => {
    const headers = ["ID", "Source", "Title", "Severity", "Level", "Status", "Due Date", "Responsible", "Department", "Created"];
    const rows = filteredEscalations.map(item => [item.refNo || item.id, item.source, item.title, item.severity, item.level, item.status, item.dueDate, item.responsible, item.department, item.createdAt]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `escalations-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isAr ? "تم تصدير سجل التصعيدات" : "Escalation register exported");
  };

  const exportJson = () => {
    downloadBlob(new Blob([JSON.stringify(filteredEscalations, null, 2)], { type: "application/json;charset=utf-8" }), `escalations-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success(isAr ? "تم تصدير JSON" : "JSON exported");
  };

  const severityBadge = (severity: string) => {
    const className = severity === "CRITICAL" ? "bg-red-600 text-white" : severity === "HIGH" ? "bg-orange-500 text-white" : severity === "MEDIUM" ? "bg-amber-500 text-white" : "bg-green-500 text-white";
    const label = isAr ? ({ CRITICAL: "حرج", HIGH: "عالي", MEDIUM: "متوسط", LOW: "منخفض" } as Record<string, string>)[severity] || severity : severity;
    return <Badge className={className}>{label}</Badge>;
  };

  const statusBadge = (status: string) => {
    const className = status === "OVERDUE" ? "bg-red-600 text-white" : status === "RESOLVED" || status === "CLOSED" ? "bg-emerald-600 text-white" : status === "IN PROGRESS" ? "bg-purple-600 text-white" : "bg-blue-600 text-white";
    const label = isAr ? ({ OVERDUE: "متأخر", OPEN: "مفتوح", "IN PROGRESS": "قيد التنفيذ", "WAITING FOR RESPONSE": "في انتظار الرد", RESOLVED: "تم الحل", CLOSED: "مغلق" } as Record<string, string>)[status] || status : status;
    return <Badge className={className}>{label}</Badge>;
  };

  const renderRows = (rows: Escalation[]) => rows.map(item => (
    <TableRow key={item.id}>
      <TableCell className="font-medium text-rose-600">{item.refNo || item.id}</TableCell>
      <TableCell className="text-xs font-mono">{item.source}</TableCell>
      <TableCell className="font-medium">{item.title}</TableCell>
      <TableCell>{severityBadge(item.severity)}</TableCell>
      <TableCell>{statusBadge(item.status)}</TableCell>
      <TableCell className="text-xs whitespace-nowrap">{item.dueDate}</TableCell>
      <TableCell className="text-end"><div className="flex items-center justify-end gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => handleView(item)}><Eye className="h-3.5 w-3.5" />{isAr ? "عرض" : "View"}</Button><Button type="button" variant="ghost" size="icon" className="text-amber-600" onClick={() => openReminder(item)} title={isAr ? "تذكير عاجل" : "Urgent Reminder"}><Send className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="text-slate-600" onClick={() => openPrintItem(item)} title={isAr ? "طباعة التقرير" : "Print Report"}><Printer className="h-3.5 w-3.5" /></Button></div></TableCell>
    </TableRow>
  ));

  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-rose-600" />{isAr ? "تصعيد الإدارة" : "Management Escalation"}</h2><p className="text-sm text-muted-foreground mt-1">{isAr ? "مراقبة وإدارة التصعيدات للإدارات العليا" : "Monitor and manage escalations to senior management"}</p></div>
      <div className="flex items-center gap-2 flex-wrap"><Button type="button" variant="outline" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" />{isAr ? "تصدير CSV" : "Export CSV"}</Button><Button type="button" variant="outline" className="gap-2" onClick={exportJson}><Download className="h-4 w-4" />{isAr ? "تصدير JSON" : "Export JSON"}</Button><Button type="button" variant="outline" className="gap-2" onClick={printRegister}><Printer className="h-4 w-4" />{isAr ? "طباعة" : "Print"}</Button><Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white gap-2" onClick={() => { setSourceVal(""); setIsEscalateOpen(true); }}><Flame className="h-4 w-4" />{isAr ? "تصعيد يدوي" : "Manual Escalation"}</Button></div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium">{isAr ? "تصعيدات نشطة" : "Active Escalations"}</p><Activity className="h-4 w-4 text-blue-500" /></div><div className="text-2xl font-bold mt-2">{active.length}</div><p className="text-xs text-muted-foreground mt-1"><ArrowUpRight className="h-3 w-3 inline" /> {loading ? "…" : filteredEscalations.length}</p></CardContent></Card><Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-red-600">{isAr ? "تصعيدات متأخرة" : "Overdue Escalations"}</p><Clock className="h-4 w-4 text-red-600" /></div><div className="text-2xl font-bold text-red-600 mt-2">{overdue.length}</div><p className="text-xs text-muted-foreground mt-1">{isAr ? "تتطلب إجراء فوري" : "Requires immediate action"}</p></CardContent></Card><Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-orange-500">{isAr ? "تصعيدات حرجة" : "Critical Escalations"}</p><AlertTriangle className="h-4 w-4 text-orange-500" /></div><div className="text-2xl font-bold text-orange-500 mt-2">{filteredEscalations.filter(item => item.severity === "CRITICAL").length}</div><p className="text-xs text-muted-foreground mt-1">{isAr ? "مستوى المصنع / الإدارة" : "Plant / Mgmt Level"}</p></CardContent></Card><Card><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-emerald-500">{isAr ? "تم الحل" : "Resolved"}</p><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div><div className="text-2xl font-bold text-emerald-500 mt-2">{filteredEscalations.filter(item => ["RESOLVED", "CLOSED"].includes(item.status)).length}</div><p className="text-xs text-muted-foreground mt-1"><ShieldCheck className="h-3 w-3 inline" /> {isAr ? "حالات مغلقة" : "closed cases"}</p></CardContent></Card></div>

    <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="w-full justify-start"><TabsTrigger value="overview">{isAr ? "نظرة عامة" : "Overview"}</TabsTrigger><TabsTrigger value="active">{isAr ? "النشطة" : "Active"} <Badge variant="secondary" className="ms-2">{active.length}</Badge></TabsTrigger><TabsTrigger value="overdue">{isAr ? "المتأخرة" : "Overdue"} {overdue.length > 0 && <Badge className="bg-red-600 ms-2">{overdue.length}</Badge>}</TabsTrigger></TabsList><div className="mt-6 relative w-full max-w-sm"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? "بحث في التصعيدات..." : "Search escalations..."} className="ps-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div><TabsContent value="overview" className="mt-6"><EscalationTable isAr={isAr} rows={filteredEscalations} renderRows={renderRows} /></TabsContent><TabsContent value="active" className="mt-6"><EscalationTable isAr={isAr} rows={active} renderRows={renderRows} emptyText={isAr ? "لا توجد تصعيدات نشطة" : "No active escalations"} /></TabsContent><TabsContent value="overdue" className="mt-6"><EscalationTable isAr={isAr} rows={overdue} renderRows={renderRows} emptyText={isAr ? "لا توجد تصعيدات متأخرة" : "No overdue escalations"} /></TabsContent></Tabs>

    <Dialog open={isEscalateOpen} onOpenChange={closeEscalateDialog}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><ShieldAlert className="h-5 w-5" />{isAr ? "تصعيد مسألة للإدارة" : "Escalate Issue to Management"}</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>{isAr ? "مصدر المشكلة" : "Source Record"}</Label><Input value={sourceVal} onChange={e => setSourceVal(e.target.value)} placeholder="INC-2026-00042" /></div><div className="space-y-2"><Label>{isAr ? "عنوان المشكلة *" : "Issue Title *"}</Label><Input value={titleVal} onChange={e => setTitleVal(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>{isAr ? "الخطورة" : "Severity"}</Label><Select value={severityVal} onValueChange={setSeverityVal}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CRITICAL">Critical</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="LOW">Low</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>{isAr ? "مستوى التصعيد" : "Escalation Level"}</Label><Select value={levelVal} onValueChange={setLevelVal}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Level 1 - Supervisor">Level 1 - Supervisor</SelectItem><SelectItem value="Level 2 - Dept Manager">Level 2 - Dept Manager</SelectItem><SelectItem value="Level 3 - HSE Lead">Level 3 - HSE Lead</SelectItem><SelectItem value="Level 4 - Plant Manager">Level 4 - Plant Manager</SelectItem></SelectContent></Select></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>{isAr ? "القسم" : "Department"}</Label><Select value={departmentVal} onValueChange={setDepartmentVal}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Production">Production</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Logistics">Logistics</SelectItem><SelectItem value="Warehouse">Warehouse</SelectItem><SelectItem value="HSE">HSE</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>{isAr ? "المسؤول" : "Responsible Person"}</Label><Input value={responsibleVal} onChange={e => setResponsibleVal(e.target.value)} /></div></div><div className="space-y-2"><Label>{isAr ? "سبب التصعيد والتفاصيل" : "Escalation Reason & Details"}</Label><Textarea rows={4} value={reasonVal} onChange={e => setReasonVal(e.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => closeEscalateDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleConfirmEscalation}><ShieldAlert className="h-4 w-4 me-1" />{isAr ? "تأكيد التصعيد" : "Confirm Escalation"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}><DialogContent className="sm:max-w-[700px]"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><ShieldAlert className="h-6 w-6" />{isAr ? "تفاصيل التصعيد الإداري" : "Management Escalation Details"}</DialogTitle></DialogHeader>{selectedEscalation && <div className="space-y-5 py-2"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border"><div><span className="text-xs text-muted-foreground block">ID</span><b className="text-rose-600">{selectedEscalation.refNo || selectedEscalation.id}</b></div><div><span className="text-xs text-muted-foreground block">{isAr ? "المصدر" : "Source"}</span><b>{selectedEscalation.source}</b></div><div><span className="text-xs text-muted-foreground block">{isAr ? "الخطورة" : "Severity"}</span>{severityBadge(selectedEscalation.severity)}</div><div><span className="text-xs text-muted-foreground block">{isAr ? "الحالة" : "Status"}</span>{statusBadge(selectedEscalation.status)}</div></div><div><h3 className="text-lg font-bold">{selectedEscalation.title}</h3><p className="mt-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">{selectedEscalation.reason || (isAr ? "لا توجد تفاصيل إضافية" : "No additional details")}</p></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm"><div><span className="text-xs text-muted-foreground block"><Building2 className="h-3.5 w-3.5 inline me-1" />{isAr ? "القسم" : "Department"}</span><b>{selectedEscalation.department}</b></div><div><span className="text-xs text-muted-foreground block"><User className="h-3.5 w-3.5 inline me-1" />{isAr ? "المسؤول" : "Responsible"}</span><b>{selectedEscalation.responsible}</b></div><div><span className="text-xs text-muted-foreground block"><ShieldCheck className="h-3.5 w-3.5 inline me-1" />{isAr ? "المستوى" : "Level"}</span><b>{selectedEscalation.level}</b></div><div><span className="text-xs text-muted-foreground block"><Calendar className="h-3.5 w-3.5 inline me-1" />{isAr ? "الاستحقاق" : "Due Date"}</span><b className="text-rose-600">{selectedEscalation.dueDate}</b></div><div><span className="text-xs text-muted-foreground block"><FileText className="h-3.5 w-3.5 inline me-1" />{isAr ? "الإنشاء" : "Created"}</span><b>{selectedEscalation.createdAt?.slice(0, 10)}</b></div></div><div className="border-t pt-4"><Label className="text-xs text-muted-foreground block mb-2">{isAr ? "تحديث الحالة" : "Status Update"}</Label><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => handleUpdateStatus(selectedEscalation, "IN PROGRESS")}>{isAr ? "قيد التنفيذ" : "In Progress"}</Button><Button type="button" size="sm" variant="outline" onClick={() => handleUpdateStatus(selectedEscalation, "WAITING FOR RESPONSE")}>{isAr ? "في انتظار الرد" : "Waiting Response"}</Button><Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateStatus(selectedEscalation, "RESOLVED")}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{isAr ? "تم الحل" : "Mark Resolved"}</Button><Button type="button" size="sm" variant="outline" className="text-rose-600" onClick={() => openReminder(selectedEscalation)}><Send className="h-3.5 w-3.5 me-1" />{isAr ? "تذكير" : "Reminder"}</Button></div></div></div>}<DialogFooter><Button type="button" variant="outline" onClick={() => selectedEscalation && openPrintItem(selectedEscalation)}><Printer className="h-4 w-4 me-1" />{isAr ? "طباعة التقرير" : "Print Report"}</Button><Button type="button" variant="secondary" onClick={() => setIsViewOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><BellRing className="h-5 w-5" />{isAr ? "إرسال تذكير عاجل" : "Send Urgent Reminder"}</DialogTitle></DialogHeader>{reminderTarget && <div className="space-y-4"><div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-200 text-sm"><b>{reminderTarget.title}</b><div className="text-xs mt-1">{reminderTarget.refNo || reminderTarget.id} — {reminderTarget.responsible} — {reminderTarget.level}</div></div><div className="flex flex-wrap gap-4 text-xs"><label className="flex items-center gap-1.5"><Checkbox checked={sendEmail} onCheckedChange={value => setSendEmail(!!value)} /><Mail className="h-3.5 w-3.5 text-blue-600" />{isAr ? "بريد إلكتروني" : "Email"}</label><label className="flex items-center gap-1.5"><Checkbox checked={sendSms} onCheckedChange={value => setSendSms(!!value)} /><MessageSquare className="h-3.5 w-3.5 text-emerald-600" />{isAr ? "واتساب / SMS" : "WhatsApp / SMS"}</label><label className="flex items-center gap-1.5"><Checkbox checked={sendSystemAlert} onCheckedChange={value => setSendSystemAlert(!!value)} /><BellRing className="h-3.5 w-3.5 text-rose-600" />{isAr ? "إشعار النظام" : "System Alert"}</label></div><Textarea rows={5} value={reminderText} onChange={event => setReminderText(event.target.value)} /></div>}<DialogFooter><Button type="button" variant="outline" onClick={() => setIsReminderOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button type="button" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={sendReminder}><Send className="h-4 w-4 me-1" />{isAr ? "إرسال التذكير" : "Send Reminder"}</Button></DialogFooter></DialogContent></Dialog>

    {printItem && <PrintShareDialog open={isPrintOpen} onOpenChange={setIsPrintOpen} item={printItem} />}
  </div>;
}

function EscalationTable({ isAr, rows, renderRows, emptyText = "No data found" }: { isAr: boolean; rows: Escalation[]; renderRows: (rows: Escalation[]) => React.ReactNode; emptyText?: string }) {
  return <Card><CardHeader><CardTitle>{isAr ? "سجل التصعيدات" : "Escalation Register"}</CardTitle><CardDescription>{isAr ? "جميع التصعيدات والمتابعة المرتبطة بها" : "All escalations and their follow-up actions"}</CardDescription></CardHeader><CardContent><div className="rounded-md border overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead><TableHead>{isAr ? "المصدر" : "Source"}</TableHead><TableHead>{isAr ? "الموضوع" : "Issue"}</TableHead><TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead>{isAr ? "الاستحقاق" : "Due Date"}</TableHead><TableHead className="text-end">{isAr ? "إجراء" : "Action"}</TableHead></TableRow></TableHeader><TableBody>{renderRows(rows)}{rows.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{emptyText}</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>;
}

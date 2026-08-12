import { useState } from "react";
import { useData } from "@/lib/data-context";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, Clock, Activity, Search, ArrowUpRight, ShieldAlert, 
  Flame, Download, Printer, CheckCircle2, ShieldCheck, Eye, Send, Building2, User, Calendar, FileText, BellRing, Mail, MessageSquare
} from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";

export default function EscalationDashboard() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const sourceParam = searchParams.get("source");
  const [sourceVal, setSourceVal] = useState(sourceParam || "");
  const [isEscalateOpen, setIsEscalateOpen] = useState(!!sourceParam);

  // Form states for manual escalation
  const [titleVal, setTitleVal] = useState("");
  const [severityVal, setSeverityVal] = useState("HIGH");
  const [departmentVal, setDepartmentVal] = useState("Production");
  const [levelVal, setLevelVal] = useState("Level 2 - Dept Manager");
  const [responsibleVal, setResponsibleVal] = useState("");
  const [reasonVal, setReasonVal] = useState("");

  // View Modal state
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Print Share Modal state
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  // Urgent Reminder Dialog state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<any>(null);
  const [reminderText, setReminderText] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendSystemAlert, setSendSystemAlert] = useState(true);

  const [escalations, setEscalations] = useState([
    { id: "ESC-2026-0001", source: "NCR-2026-00125", title: "Unsafe Condition at Area B", severity: "HIGH", level: "Level 2 - Dept Manager", status: "OPEN", dueDate: "2026-08-09", responsible: "John Doe", department: "Production", reason: "Uncorrected safety non-conformity exceeding standard SLA.", createdAt: "2026-08-05" },
    { id: "ESC-2026-0002", source: "INC-2026-00042", title: "Forklift Near Miss", severity: "CRITICAL", level: "Level 4 - Plant Manager", status: "OVERDUE", dueDate: "2026-08-06", responsible: "Jane Smith", department: "Logistics", reason: "Near-miss event involving heavy equipment near pedestrian walkway.", createdAt: "2026-08-03" },
    { id: "ESC-2026-0003", source: "CAPA-2026-00018", title: "Missing Guardrails", severity: "MEDIUM", level: "Level 1 - Supervisor", status: "IN PROGRESS", dueDate: "2026-08-11", responsible: "Mike Johnson", department: "Maintenance", reason: "Height hazard identified without appropriate collective protection.", createdAt: "2026-08-07" },
    { id: "ESC-2026-0004", source: "OBS-2026-00301", title: "Spill not cleaned", severity: "LOW", level: "Level 0 - Normal", status: "WAITING FOR RESPONSE", dueDate: "2026-08-08", responsible: "Sarah Connor", department: "Warehouse", reason: "Minor chemical spill pending spill kit disposal protocol.", createdAt: "2026-08-06" },
  ]);

  const filteredEscalations = escalations.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const overdue = filteredEscalations.filter(e => e.status === "OVERDUE");
  const active = filteredEscalations.filter(e => e.status !== "RESOLVED" && e.status !== "CLOSED");

  const handleConfirmEscalation = () => {
    if (!titleVal.trim()) {
      toast.error(isAr ? "يرجى كتابة عنوان المشكلة" : "Please enter issue title");
      return;
    }

    const newEsc = {
      id: `ESC-2026-000${escalations.length + 1}`,
      source: sourceVal.trim() || "MANUAL",
      title: titleVal.trim(),
      severity: severityVal || "HIGH",
      level: levelVal || "Level 2 - Dept Manager",
      status: "OPEN",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      responsible: responsibleVal.trim() || (isAr ? "مدير السلامة / الجودة" : "HSE Lead"),
      department: departmentVal || "Production",
      reason: reasonVal.trim() || (isAr ? "تصعيد يدوي مباشر للإدارة العليا" : "Direct manual escalation to senior management"),
      createdAt: new Date().toISOString().split("T")[0]
    };

    setEscalations([newEsc, ...escalations]);
    setIsEscalateOpen(false);
    setTitleVal("");
    setSourceVal("");
    setReasonVal("");
    setResponsibleVal("");
    toast.success(isAr ? "تم إرسال التصعيد للإدارة بنجاح" : "Escalation created and sent to management successfully");
  };

  const handleView = (esc: any) => {
    setSelectedEscalation(esc);
    setIsViewOpen(true);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setEscalations(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    if (selectedEscalation && selectedEscalation.id === id) {
      setSelectedEscalation((prev: any) => ({ ...prev, status: newStatus }));
    }
    toast.success(isAr ? `تم تغيير حالة التصعيد إلى: ${newStatus}` : `Escalation status changed to: ${newStatus}`);
  };

  const handleOpenReminderModal = (esc: any) => {
    setReminderTarget(esc);
    setReminderText(
      isAr 
        ? `تذكير إداري عاجل هام جداً: يرجى التكرم بالإفادة السريعة واتخاذ الإجراء التصحيحي اللازم حيال موضوع التصعيد (${esc.title}) - [مرجع: ${esc.source}] الموجه لمستوى (${esc.level}). الموعد النهائي: ${esc.dueDate}.`
        : `Urgent Management Reminder: Please take immediate required action regarding escalation item (${esc.title}) - [Ref: ${esc.source}] assigned to (${esc.level}). Due date: ${esc.dueDate}.`
    );
    setIsReminderOpen(true);
  };

  const handleSendUrgentReminderConfirm = () => {
    if (!reminderTarget) return;

    const channels = [];
    if (sendEmail) channels.push(isAr ? "البريد الإلكتروني" : "Email");
    if (sendSms) channels.push(isAr ? "الواتساب / SMS" : "WhatsApp / SMS");
    if (sendSystemAlert) channels.push(isAr ? "إشعار النظام المباشر" : "System Alert");

    // Update status to WAITING FOR RESPONSE if it was OPEN or OVERDUE
    setEscalations(prev => prev.map(e => e.id === reminderTarget.id ? { ...e, status: "WAITING FOR RESPONSE" } : e));
    if (selectedEscalation && selectedEscalation.id === reminderTarget.id) {
      setSelectedEscalation((prev: any) => ({ ...prev, status: "WAITING FOR RESPONSE" }));
    }

    setIsReminderOpen(false);
    toast.success(
      isAr 
        ? `تم إرسال التذكير العاجل لـ ${reminderTarget.responsible} (${reminderTarget.department}) عبر [${channels.join("، ")}] بنجاح!` 
        : `Urgent reminder sent to ${reminderTarget.responsible} via [${channels.join(", ")}]!`
    );
  };

  const handlePrintItem = (esc: any) => {
    const itemToPrint = {
      id: esc.id,
      type: "report" as const,
      refNo: esc.id,
      title: `${isAr ? "تقرير تصعيد إداري عاجل" : "Management Escalation Report"} - ${esc.title}`,
      department: esc.department,
      severity: esc.severity,
      status: esc.status,
      date: esc.createdAt || new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "رقم التصعيد" : "Escalation ID", value: esc.id },
        { label: isAr ? "المصدر المرتبط" : "Source Reference", value: esc.source },
        { label: isAr ? "عنوان المشكلة" : "Issue Title", value: esc.title },
        { label: isAr ? "مستوى التصعيد" : "Escalation Level", value: esc.level },
        { label: isAr ? "مستوى الخطورة" : "Severity Level", value: esc.severity },
        { label: isAr ? "المسؤول المعين" : "Responsible Person", value: esc.responsible },
        { label: isAr ? "القسم المعني" : "Department", value: esc.department },
        { label: isAr ? "تاريخ الموعد النهائي" : "Due Date", value: esc.dueDate },
        { label: isAr ? "تاريخ الإنشاء" : "Created Date", value: esc.createdAt || "2026-08-05" },
        { label: isAr ? "سبب وتفاصيل التصعيد" : "Escalation Details", value: esc.reason || (isAr ? "تم رفعه للإدارة العليا لمتابعة تنفيذ الإجراء التصحيحي." : "Escalated to management for corrective action enforcement.") },
        { label: isAr ? "توصية الإدارة العليا" : "Management Action Required", value: isAr ? "مطلوب متابعة القسم وفحص موقع الملاحظة وإغلاق الحالة وتزويد الإدارة بالتقرير المطلوب." : "Department follow-up required with root cause verification and status closure." }
      ]
    };
    setPrintItem(itemToPrint);
    setIsPrintOpen(true);
  };

  const handlePrintOverallRegister = () => {
    const itemToPrint = {
      id: "ESC-REGISTER-2026",
      type: "report" as const,
      refNo: "ESC-REG-2026",
      title: isAr ? "سجل التقرير الشامل لتصعيدات الإدارة العليا" : "Management Escalations Comprehensive Register",
      department: "Management / HSE Board",
      severity: "HIGH",
      status: "ACTIVE",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي التصعيدات النشطة" : "Active Escalations", value: `${active.length} ${isAr ? "حالة" : "cases"}` },
        { label: isAr ? "التصعيدات المتأخرة" : "Overdue Escalations", value: `${overdue.length} ${isAr ? "حالة حرجة" : "critical cases"}` },
        { label: isAr ? "معدل الإغلاق الشهري" : "Monthly Closure Rate", value: "82%" },
        { label: isAr ? "الملخص التنفيذي" : "Executive Summary", value: isAr ? "يتضمن هذا التقرير كافة موضوعات عدم المطابقة والحوادث المرفوعة للإدارة العليا مع متابعة المواعيد والمسؤولين." : "This report details all non-conformities and incidents escalated to senior management." }
      ]
    };
    setPrintItem(itemToPrint);
    setIsPrintOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Source", "Title", "Severity", "Level", "Status", "Due Date", "Responsible", "Department"];
    const rows = filteredEscalations.map(e => [e.id, e.source, e.title, e.severity, e.level, e.status, e.dueDate, e.responsible, e.department]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "escalations_report.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast.success(isAr ? "تم تصدير سجل التصعيدات بنجاح (CSV)" : "Escalations exported successfully (CSV)");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredEscalations, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "escalations_report.json");
    dlAnchorElem.click();
    toast.success(isAr ? "تم تصدير البيانات بنجاح (JSON)" : "Escalations exported successfully (JSON)");
  };

  const handlePrint = () => {
    handlePrintOverallRegister();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return <Badge className="bg-red-600 text-white">{isAr ? "حرج" : "CRITICAL"}</Badge>;
      case "HIGH": return <Badge className="bg-orange-500 text-white">{isAr ? "عالي" : "HIGH"}</Badge>;
      case "MEDIUM": return <Badge className="bg-amber-500 text-white">{isAr ? "متوسط" : "MEDIUM"}</Badge>;
      case "LOW": return <Badge className="bg-green-500 text-white">{isAr ? "منخفض" : "LOW"}</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "OVERDUE") return <Badge variant="destructive">{isAr ? "متأخر" : "OVERDUE"}</Badge>;
    if (status === "OPEN") return <Badge className="bg-blue-500 text-white">{isAr ? "مفتوح" : "OPEN"}</Badge>;
    if (status === "IN PROGRESS") return <Badge className="bg-purple-500 text-white">{isAr ? "قيد التنفيذ" : "IN PROGRESS"}</Badge>;
    if (status === "RESOLVED") return <Badge className="bg-emerald-600 text-white">{isAr ? "تم الحل" : "RESOLVED"}</Badge>;
    if (status === "WAITING FOR RESPONSE") return <Badge className="bg-amber-500 text-white">{isAr ? "في انتظار الرد" : "WAITING FOR RESPONSE"}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            {isAr ? "تصعيد الإدارة" : "Management Escalation"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "مراقبة وإدارة التصعيدات للإدارات العليا" : "Monitor and manage escalations to senior management"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            {isAr ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handleExportJSON}>
            <Download className="h-4 w-4" />
            {isAr ? "تصدير JSON" : "Export JSON"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-2xl" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة" : "Print"}
          </Button>
          
        <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2" data-testid="button-manual-escalate">
              <Flame className="h-4 w-4" />
              {isAr ? "تصعيد يدوي" : "Manual Escalation"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
                {isAr ? "تصعيد مسألة للإدارة" : "Escalate Issue to Management"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isAr ? "مصدر المشكلة (اختياري)" : "Source Record (Optional)"}</Label>
                <Input placeholder="e.g. NCR-2026-00125 or INC-2026-00042" value={sourceVal} onChange={e => setSourceVal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "عنوان المشكلة *" : "Issue Title *"}</Label>
                <Input 
                  placeholder={isAr ? "عنوان قصير ومحدد للمشكلة" : "Brief descriptive title"} 
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isAr ? "مستوى الخطورة" : "Severity Level"}</Label>
                  <Select value={severityVal} onValueChange={setSeverityVal}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">{isAr ? "حرج (Critical)" : "Critical"}</SelectItem>
                      <SelectItem value="HIGH">{isAr ? "عالي (High)" : "High"}</SelectItem>
                      <SelectItem value="MEDIUM">{isAr ? "متوسط (Medium)" : "Medium"}</SelectItem>
                      <SelectItem value="LOW">{isAr ? "منخفض (Low)" : "Low"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "مستوى التصعيد" : "Escalation Level"}</Label>
                  <Select value={levelVal} onValueChange={setLevelVal}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Level 1 - Supervisor">{isAr ? "مستوى 1 - المشرف" : "Level 1 - Supervisor"}</SelectItem>
                      <SelectItem value="Level 2 - Dept Manager">{isAr ? "مستوى 2 - مدير القسم" : "Level 2 - Dept Manager"}</SelectItem>
                      <SelectItem value="Level 3 - HSE Lead">{isAr ? "مستوى 3 - مدير السلامة" : "Level 3 - HSE Lead"}</SelectItem>
                      <SelectItem value="Level 4 - Plant Manager">{isAr ? "مستوى 4 - مدير المصنع" : "Level 4 - Plant Manager"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isAr ? "القسم" : "Department"}</Label>
                  <Select value={departmentVal} onValueChange={setDepartmentVal}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Production">{isAr ? "الإنتاج (Production)" : "Production"}</SelectItem>
                      <SelectItem value="Maintenance">{isAr ? "الصيانة (Maintenance)" : "Maintenance"}</SelectItem>
                      <SelectItem value="Logistics">{isAr ? "الخدمات اللوجستية (Logistics)" : "Logistics"}</SelectItem>
                      <SelectItem value="Warehouse">{isAr ? "المستودعات (Warehouse)" : "Warehouse"}</SelectItem>
                      <SelectItem value="HSE">{isAr ? "السلامة (HSE)" : "HSE"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "المسؤول المعين" : "Responsible Person"}</Label>
                  <Input 
                    placeholder={isAr ? "اسم المسؤول..." : "Person responsible..."} 
                    value={responsibleVal}
                    onChange={e => setResponsibleVal(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "سبب التصعيد والتفاصيل" : "Escalation Reason & Details"}</Label>
                <Textarea 
                  rows={3}
                  placeholder={isAr ? "يرجى توضيح سبب رفع المشكلة والتأثير على العمليات..." : "Provide clear justification for escalation..."} 
                  value={reasonVal}
                  onChange={e => setReasonVal(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEscalateOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2" onClick={handleConfirmEscalation} data-testid="button-confirm-escalate">
                <ShieldAlert className="h-4 w-4" />
                {isAr ? "تأكيد التصعيد" : "Confirm Escalation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">{isAr ? "تصعيدات نشطة" : "Active Escalations"}</p>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{active.length}</div>
            <p className="text-xs text-muted-foreground mt-1 text-blue-500 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> 2 {isAr ? "هذا الأسبوع" : "this week"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-red-600">{isAr ? "تصعيدات متأخرة" : "Overdue Escalations"}</p>
              <Clock className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {isAr ? "تتطلب إجراء فوري" : "Requires immediate action"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-orange-500">{isAr ? "تصعيدات حرجة" : "Critical Escalations"}</p>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500">{filteredEscalations.filter(e => e.severity === 'CRITICAL').length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {isAr ? "مستوى المصنع / الإدارة" : "Plant / Mgmt Level"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-emerald-500">{isAr ? "تم الحل (الشهر)" : "Resolved (Month)"}</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">14</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> 82% {isAr ? "معدل الحل" : "resolution rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-rose-600 rounded-none px-6 py-3">
            {isAr ? "نظرة عامة" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:border-b-2 data-[state=active]:border-rose-600 rounded-none px-6 py-3">
            {isAr ? "التصعيدات النشطة" : "Active"} <Badge variant="secondary" className="ms-2">{active.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:border-b-2 data-[state=active]:border-rose-600 rounded-none px-6 py-3 text-red-600 data-[state=active]:text-red-700">
            {isAr ? "المتأخرة" : "Overdue"} {overdue.length > 0 && <Badge className="bg-red-600 ms-2">{overdue.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={isAr ? "بحث في التصعيدات..." : "Search escalations..."} 
              className="ps-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? "التصعيدات الأخيرة" : "Recent Escalations"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead>
                      <TableHead>{isAr ? "المصدر" : "Source"}</TableHead>
                      <TableHead>{isAr ? "الموضوع" : "Issue"}</TableHead>
                      <TableHead>{isAr ? "المستوى" : "Level"}</TableHead>
                      <TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead>
                      <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
                      <TableHead className="text-end">{isAr ? "إجراء" : "Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEscalations.map((esc) => (
                      <TableRow key={esc.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-rose-600">{esc.id}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">{esc.source}</TableCell>
                        <TableCell className="font-medium">{esc.title}</TableCell>
                        <TableCell className="text-xs">{esc.level}</TableCell>
                        <TableCell>{getSeverityBadge(esc.severity)}</TableCell>
                        <TableCell>{getStatusBadge(esc.status)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{esc.dueDate}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-1 text-primary hover:text-primary/80" 
                              onClick={() => handleView(esc)}
                              data-testid={`button-view-esc-${esc.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isAr ? "عرض" : "View"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                              onClick={() => handleOpenReminderModal(esc)}
                              title={isAr ? "إرسال تذكير عاجل" : "Send Urgent Reminder"}
                              data-testid={`button-reminder-esc-${esc.id}`}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                              onClick={() => handlePrintItem(esc)}
                              title={isAr ? "طباعة التقرير" : "Print Report"}
                              data-testid={`button-print-esc-${esc.id}`}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEscalations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          {isAr ? "لا توجد بيانات" : "No data found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead>
                      <TableHead>{isAr ? "المصدر" : "Source"}</TableHead>
                      <TableHead>{isAr ? "الموضوع" : "Issue"}</TableHead>
                      <TableHead>{isAr ? "المسؤول" : "Responsible"}</TableHead>
                      <TableHead>{isAr ? "القسم" : "Department"}</TableHead>
                      <TableHead>{isAr ? "المستوى" : "Level"}</TableHead>
                      <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-end">{isAr ? "إجراء" : "Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map((esc) => (
                      <TableRow key={esc.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-rose-600">{esc.id}</TableCell>
                        <TableCell className="text-xs font-mono">{esc.source}</TableCell>
                        <TableCell className="font-medium">{esc.title}</TableCell>
                        <TableCell className="text-xs">{esc.responsible}</TableCell>
                        <TableCell className="text-xs">{esc.department}</TableCell>
                        <TableCell className="text-xs">{esc.level}</TableCell>
                        <TableCell>{getStatusBadge(esc.status)}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-1 text-primary hover:text-primary/80" 
                              onClick={() => handleView(esc)}
                              data-testid={`button-view-esc-active-${esc.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isAr ? "عرض" : "View"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                              onClick={() => handleOpenReminderModal(esc)}
                              title={isAr ? "إرسال تذكير عاجل" : "Send Urgent Reminder"}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                              onClick={() => handlePrintItem(esc)}
                              title={isAr ? "طباعة التقرير" : "Print Report"}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {active.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          {isAr ? "لا توجد تصعيدات نشطة حالياً" : "No active escalations"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="overdue" className="mt-6">
          <Card className="border-red-200">
            <CardHeader className="bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900">
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {isAr ? "التصعيدات المتأخرة" : "Overdue Escalations"}
              </CardTitle>
              <CardDescription>
                {isAr ? "هذه العناصر تجاوزت المهلة المحددة وتتطلب إجراءً فورياً" : "These items have breached their deadline and require immediate action"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead>
                      <TableHead>{isAr ? "المصدر" : "Source"}</TableHead>
                      <TableHead>{isAr ? "الموضوع" : "Issue"}</TableHead>
                      <TableHead>{isAr ? "المسؤول" : "Responsible"}</TableHead>
                      <TableHead>{isAr ? "المستوى" : "Level"}</TableHead>
                      <TableHead>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
                      <TableHead className="text-end">{isAr ? "إجراء" : "Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdue.map((esc) => (
                      <TableRow key={esc.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-rose-600">{esc.id}</TableCell>
                        <TableCell className="text-xs font-mono">{esc.source}</TableCell>
                        <TableCell className="font-semibold">{esc.title}</TableCell>
                        <TableCell className="text-xs">{esc.responsible}</TableCell>
                        <TableCell className="text-xs">{esc.level}</TableCell>
                        <TableCell className="text-red-600 font-medium">{esc.dueDate}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="h-8 gap-1"
                              onClick={() => handleView(esc)}
                              data-testid={`button-view-esc-overdue-${esc.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isAr ? "عرض والتحديث" : "View & Resolve"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50" 
                              onClick={() => handleOpenReminderModal(esc)}
                              title={isAr ? "إرسال تذكير عاجل" : "Send Urgent Reminder"}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-slate-600 hover:text-slate-800" 
                              onClick={() => handlePrintItem(esc)}
                              title={isAr ? "طباعة التقرير" : "Print Report"}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {overdue.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {isAr ? "لا توجد تصعيدات متأخرة" : "No overdue escalations"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Escalation Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-rose-600 text-xl font-bold">
                <ShieldAlert className="h-6 w-6" />
                {isAr ? "تفاصيل التصعيد الإداري" : "Management Escalation Details"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {selectedEscalation && (
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border">
                <div>
                  <span className="text-xs text-muted-foreground block">{isAr ? "رقم المعاملة" : "Escalation ID"}</span>
                  <span className="text-lg font-bold text-rose-600 font-mono">{selectedEscalation.id}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{isAr ? "المصدر المرتبط" : "Source Reference"}</span>
                  <Badge variant="outline" className="font-mono text-sm">{selectedEscalation.source}</Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">{isAr ? "الخطورة" : "Severity"}</span>
                  {getSeverityBadge(selectedEscalation.severity)}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">{isAr ? "الحالة الحالية" : "Current Status"}</span>
                  {getStatusBadge(selectedEscalation.status)}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">{selectedEscalation.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                  {selectedEscalation.reason || (isAr ? "لا توجد تفاصيل إضافية مسجلة." : "No additional details provided.")}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-muted-foreground block">{isAr ? "القسم" : "Department"}</span>
                    <span className="font-medium">{selectedEscalation.department}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-muted-foreground block">{isAr ? "المسؤول" : "Responsible"}</span>
                    <span className="font-medium">{selectedEscalation.responsible}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-muted-foreground block">{isAr ? "المستوى" : "Level"}</span>
                    <span className="font-medium">{selectedEscalation.level}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-muted-foreground block">{isAr ? "تاريخ الموعد النهائي" : "Due Date"}</span>
                    <span className="font-medium text-rose-600">{selectedEscalation.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-muted-foreground block">{isAr ? "تاريخ الإنشاء" : "Created Date"}</span>
                    <span className="font-medium">{selectedEscalation.createdAt || "2026-08-05"}</span>
                  </div>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground block mb-2">{isAr ? "تحديث حالة التصعيد سريعاً:" : "Quick Status Update:"}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant={selectedEscalation.status === "IN PROGRESS" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => handleUpdateStatus(selectedEscalation.id, "IN PROGRESS")}
                  >
                    {isAr ? "قيد التنفيذ" : "In Progress"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedEscalation.status === "WAITING FOR RESPONSE" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => handleUpdateStatus(selectedEscalation.id, "WAITING FOR RESPONSE")}
                  >
                    {isAr ? "في انتظار الرد" : "Waiting Response"}
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleUpdateStatus(selectedEscalation.id, "RESOLVED")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                    {isAr ? "تم الحل والتسوية" : "Mark Resolved"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                    onClick={() => handleOpenReminderModal(selectedEscalation)}
                  >
                    <Send className="h-3.5 w-3.5 me-1" />
                    {isAr ? "إرسال تذكير عاجل" : "Send Reminder"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 flex items-center justify-between">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => {
                if (selectedEscalation) handlePrintItem(selectedEscalation);
              }}
            >
              <Printer className="h-4 w-4" />
              {isAr ? "طباعة التقرير" : "Print Report"}
            </Button>
            <Button variant="secondary" onClick={() => setIsViewOpen(false)}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Urgent Reminder Modal */}
      <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-lg font-bold">
              <BellRing className="h-5 w-5" />
              {isAr ? "إرسال تذكير عاجل للإدارة" : "Send Urgent Escalation Reminder"}
            </DialogTitle>
          </DialogHeader>

          {reminderTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-200 dark:border-rose-900 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-rose-800 dark:text-rose-300">{reminderTarget.title}</span>
                  <Badge variant="outline" className="font-mono text-xs">{reminderTarget.id}</Badge>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  {isAr ? `الموجه إلى: ${reminderTarget.responsible} (${reminderTarget.department}) - ${reminderTarget.level}` : `Assigned to: ${reminderTarget.responsible} (${reminderTarget.department}) - ${reminderTarget.level}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">{isAr ? "قنوات الإرسال المحددة:" : "Selected Channels:"}</Label>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="chk-email" checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
                    <Label htmlFor="chk-email" className="flex items-center gap-1 cursor-pointer">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      {isAr ? "بريد إلكتروني" : "Email"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="chk-sms" checked={sendSms} onCheckedChange={(v) => setSendSms(!!v)} />
                    <Label htmlFor="chk-sms" className="flex items-center gap-1 cursor-pointer">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      {isAr ? "واتساب / SMS" : "WhatsApp / SMS"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="chk-sys" checked={sendSystemAlert} onCheckedChange={(v) => setSendSystemAlert(!!v)} />
                    <Label htmlFor="chk-sys" className="flex items-center gap-1 cursor-pointer">
                      <BellRing className="h-3.5 w-3.5 text-rose-600" />
                      {isAr ? "إشعار نظام عاجل" : "System Alert"}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">{isAr ? "نص رسالة التذكير العاجلة:" : "Urgent Reminder Message:"}</Label>
                <Textarea 
                  rows={4}
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReminderOpen(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
              onClick={handleSendUrgentReminderConfirm}
              data-testid="button-confirm-send-reminder"
            >
              <Send className="h-4 w-4" />
              {isAr ? "إرسال التذكير العاجل الآن" : "Send Urgent Reminder Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print / Share Dialog */}
      {printItem && (
        <PrintShareDialog 
          open={isPrintOpen} 
          onOpenChange={setIsPrintOpen} 
          item={printItem} 
        />
      )}
    </div>
  );
}


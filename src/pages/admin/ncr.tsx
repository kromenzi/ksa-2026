import { useMemo, useState } from "react";
import { useData, type NCR, type NCRActionRow, type NCRStatus } from "@/lib/data-context";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, Plus, Search, FileWarning, Download, Trash2, MoreHorizontal,
  CheckCircle2, Printer, Loader2, Clock3, ShieldAlert, ClipboardCheck,
  Pencil, PlusCircle, X, Target, UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import PrintShareDialog from "@/components/print-share-dialog";

type NCRForm = {
  date: string;
  department: string;
  location: string;
  description: string;
  severity: string;
  status: NCRStatus;
  immediateAction: string;
  rootCause: string;
  correctiveAction: string;
  correctiveActions: NCRActionRow[];
  responsiblePersonId: string;
  dueDate: string;
  verificationNotes: string;
  sourceMetadata: {
    requirement?: string;
    classification?: string;
    recurrenceRisk?: string;
    similarCasesReviewed?: string;
    effectivenessStatus?: string;
    [key: string]: unknown;
  };
};

const emptyAction = (no = 1): NCRActionRow => ({
  no,
  action: "",
  responsible: "",
  dueDate: "",
  effectiveness: "",
  signature: "",
});

const emptyForm = (): NCRForm => ({
  date: new Date().toISOString().slice(0, 10),
  department: "",
  location: "",
  description: "",
  severity: "medium",
  status: "draft",
  immediateAction: "",
  rootCause: "",
  correctiveAction: "",
  correctiveActions: [emptyAction()],
  responsiblePersonId: "",
  dueDate: "",
  verificationNotes: "",
  sourceMetadata: {
    requirement: "",
    classification: "process",
    recurrenceRisk: "Medium",
    similarCasesReviewed: "",
    effectivenessStatus: "Pending",
  },
});

const metadataOf = (ncr: NCR) =>
  ncr.sourceMetadata && typeof ncr.sourceMetadata === "object" ? ncr.sourceMetadata : {};

export default function AdminNCR() {
  const { settings, ncrs, addNCR, updateNCR, deleteNCR, currentUser } = useData();
  const isAr = settings.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [form, setForm] = useState<NCRForm>(emptyForm);
  const [editing, setEditing] = useState<NCR | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (n: NCR) => Boolean(n.dueDate && n.status !== "closed" && n.dueDate < today);

  const filteredNcrs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...ncrs]
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .filter((n) => {
        if (statusFilter !== "all" && n.status !== statusFilter) return false;
        if (severityFilter !== "all" && n.severity !== severityFilter) return false;
        if (!q) return true;
        return [
          n.refNo, n.description, n.department, n.location, n.status, n.severity,
          n.immediateAction, n.rootCause, n.correctiveAction, n.responsiblePersonId,
        ].some((value) => String(value || "").toLowerCase().includes(q));
      });
  }, [ncrs, searchQuery, statusFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: ncrs.length,
    open: ncrs.filter(n => n.status !== "closed").length,
    high: ncrs.filter(n => ["high", "critical"].includes(String(n.severity).toLowerCase())).length,
    overdue: ncrs.filter(isOverdue).length,
    closed: ncrs.filter(n => n.status === "closed").length,
  }), [ncrs]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setIsDialogOpen(true);
  };

  const openEdit = (ncr: NCR) => {
    const meta = metadataOf(ncr);
    setEditing(ncr);
    setForm({
      date: ncr.date || today,
      department: ncr.department || "",
      location: ncr.location || "",
      description: ncr.description || "",
      severity: ncr.severity || "medium",
      status: (ncr.status || "draft") as NCRStatus,
      immediateAction: ncr.immediateAction || "",
      rootCause: ncr.rootCause || "",
      correctiveAction: ncr.correctiveAction || "",
      correctiveActions: Array.isArray(ncr.correctiveActions) && ncr.correctiveActions.length
        ? ncr.correctiveActions.map((row, idx) => ({ ...row, no: row.no || idx + 1 }))
        : [emptyAction()],
      responsiblePersonId: ncr.responsiblePersonId || "",
      dueDate: ncr.dueDate || "",
      verificationNotes: ncr.verificationNotes || "",
      sourceMetadata: {
        ...meta,
        requirement: String(meta.requirement || ""),
        classification: String(meta.classification || "process"),
        recurrenceRisk: String(meta.recurrenceRisk || "Medium"),
        similarCasesReviewed: String(meta.similarCasesReviewed || ""),
        effectivenessStatus: String(meta.effectivenessStatus || "Pending"),
      },
    });
    setIsDialogOpen(true);
  };

  const updateAction = (index: number, patch: Partial<NCRActionRow>) => {
    setForm(prev => ({
      ...prev,
      correctiveActions: prev.correctiveActions.map((row, idx) => idx === index ? { ...row, ...patch } : row),
    }));
  };

  const addActionRow = () => {
    setForm(prev => ({
      ...prev,
      correctiveActions: [...prev.correctiveActions, emptyAction(prev.correctiveActions.length + 1)],
    }));
  };

  const removeActionRow = (index: number) => {
    setForm(prev => {
      const next = prev.correctiveActions.filter((_, idx) => idx !== index).map((row, idx) => ({ ...row, no: idx + 1 }));
      return { ...prev, correctiveActions: next.length ? next : [emptyAction()] };
    });
  };

  const handleSave = async () => {
    if (!form.department.trim() || !form.description.trim()) {
      toast.error(isAr ? "القسم ووصف عدم المطابقة مطلوبان" : "Department and non-conformance description are required");
      return;
    }
    if (["high", "critical"].includes(form.severity) && !form.immediateAction.trim()) {
      toast.error(isAr ? "أضف الإجراء الفوري للحالات عالية/حرجة الخطورة" : "Add an immediate action for high/critical NCRs");
      return;
    }
    const cleanedActions = form.correctiveActions
      .filter(row => row.action.trim() || row.responsible.trim() || row.dueDate)
      .map((row, idx) => ({ ...row, no: idx + 1 }));

    setSaving(true);
    try {
      const payload = {
        ...form,
        department: form.department.trim(),
        location: form.location.trim() || null,
        description: form.description.trim(),
        immediateAction: form.immediateAction.trim() || null,
        rootCause: form.rootCause.trim() || null,
        correctiveAction: form.correctiveAction.trim() || null,
        correctiveActions: cleanedActions,
        responsiblePersonId: form.responsiblePersonId.trim() || null,
        dueDate: form.dueDate || null,
        verificationNotes: form.verificationNotes.trim() || null,
        closedAt: form.status === "closed" ? new Date().toISOString() : null,
        sourceMetadata: {
          ...(editing ? metadataOf(editing) : {}),
          ...form.sourceMetadata,
          lastEditedBy: currentUser?.name || currentUser?.id || "HSE",
          lastEditedAt: new Date().toISOString(),
        },
      };

      if (editing) {
        await updateNCR(editing.id, payload);
        toast.success(isAr ? `تم تحديث ${editing.refNo}` : `${editing.refNo} updated`);
      } else {
        const saved = await addNCR(payload);
        toast.success(isAr ? `تم إنشاء ${saved.refNo}` : `${saved.refNo} created`);
      }
      setIsDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حفظ NCR" : "Unable to save NCR"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ncr: NCR) => {
    if (!window.confirm(isAr ? `هل تريد حذف ${ncr.refNo} نهائيًا؟` : `Delete ${ncr.refNo} permanently?`)) return;
    setBusyId(ncr.id);
    try {
      await deleteNCR(ncr.id);
      toast.success(isAr ? "تم حذف NCR" : "NCR deleted");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حذف NCR" : "Unable to delete NCR"));
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (ncr: NCR, status: NCRStatus) => {
    setBusyId(ncr.id);
    try {
      await updateNCR(ncr.id, { status, closedAt: status === "closed" ? new Date().toISOString() : null });
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر تحديث الحالة" : "Unable to update status"));
    } finally {
      setBusyId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Reference", "Date", "Department", "Location", "Description", "Severity", "Status", "Immediate Action", "Root Cause", "Owner", "Due Date", "Verification"];
    const rows = filteredNcrs.map((n) => [
      n.refNo, n.date, n.department, n.location || "", n.description, n.severity, n.status,
      n.immediateAction || "", n.rootCause || "", n.responsiblePersonId || "", n.dueDate || "", n.verificationNotes || "",
    ].map(value => `"${String(value ?? "").replace(/"/g, '""')}"`));
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ncr_register_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const printNcr = (ncr: NCR) => {
    const meta = metadataOf(ncr);
    const actions = Array.isArray(ncr.correctiveActions) ? ncr.correctiveActions : [];
    setPrintItem({
      id: ncr.id,
      type: "report",
      refNo: ncr.refNo,
      title: isAr ? "تقرير عدم المطابقة والإجراء التصحيحي" : "Non-Conformance & Corrective Action Report",
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      date: ncr.date,
      sections: [
        { label: isAr ? "الرقم المرجعي" : "Reference", value: ncr.refNo },
        { label: isAr ? "التاريخ / القسم / الموقع" : "Date / Department / Location", value: `${ncr.date} | ${ncr.department || "—"} | ${ncr.location || "—"}` },
        { label: isAr ? "تصنيف عدم المطابقة" : "Non-Conformance Classification", value: String(meta.classification || "—") },
        { label: isAr ? "المتطلب / المرجع" : "Requirement / Reference", value: String(meta.requirement || "—") },
        { label: isAr ? "وصف عدم المطابقة" : "Non-Conformance Description", value: ncr.description || "—" },
        { label: isAr ? "التصحيح / الإجراء الفوري" : "Correction / Immediate Containment", value: ncr.immediateAction || "—" },
        { label: isAr ? "تحليل السبب الجذري" : "Root Cause Analysis", value: ncr.rootCause || "—" },
        { label: isAr ? "مراجعة حالات مشابهة" : "Similar Non-Conformities Review", value: String(meta.similarCasesReviewed || "—") },
        { label: isAr ? "خطة الإجراء التصحيحي" : "Corrective Action Plan", value: actions.length ? actions.map(a => `#${a.no} ${a.action} | ${a.responsible || "—"} | ${a.dueDate || "—"} | ${a.effectiveness || "—"}`).join("\n") : (ncr.correctiveAction || "—") },
        { label: isAr ? "المسؤول والموعد المستهدف" : "Owner & Target Date", value: `${ncr.responsiblePersonId || "—"} | ${ncr.dueDate || "—"}` },
        { label: isAr ? "التحقق من الفعالية" : "Effectiveness Verification", value: `${String(meta.effectivenessStatus || "Pending")}\n${ncr.verificationNotes || "—"}` },
      ],
    });
  };

  const severityBadge = (severity: string) => {
    const key = String(severity || "low").toLowerCase();
    const labels: Record<string, string> = {
      low: isAr ? "منخفض" : "Low",
      medium: isAr ? "متوسط" : "Medium",
      high: isAr ? "عالٍ" : "High",
      critical: isAr ? "حرج" : "Critical",
    };
    const styles: Record<string, string> = {
      low: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      high: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
    return <Badge variant="outline" className={styles[key]}>{labels[key] || severity}</Badge>;
  };

  const statusBadge = (status: string) => {
    const labels: Record<string, string> = {
      draft: isAr ? "مسودة" : "Draft",
      submitted: isAr ? "مرفوع" : "Submitted",
      assigned: isAr ? "مُسند" : "Assigned",
      in_progress: isAr ? "قيد الإجراء" : "In Progress",
      closed: isAr ? "مغلق" : "Closed",
    };
    return <Badge variant="outline">{labels[status] || status}</Badge>;
  };

  const statCards = [
    { label: isAr ? "إجمالي NCR" : "Total NCR", value: stats.total, icon: FileWarning },
    { label: isAr ? "مفتوح" : "Open", value: stats.open, icon: Clock3 },
    { label: isAr ? "عالٍ / حرج" : "High / Critical", value: stats.high, icon: ShieldAlert },
    { label: isAr ? "متأخر" : "Overdue", value: stats.overdue, icon: AlertTriangle },
    { label: isAr ? "مغلق" : "Closed", value: stats.closed, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"} data-testid="admin-ncr-page">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileWarning className="h-6 w-6 text-amber-500" />
            {isAr ? "تقارير عدم المطابقة (NCR)" : "Non-Conformance Reports (NCR)"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr ? "إدارة عدم المطابقة من الاكتشاف إلى تحليل السبب الجذري وCAPA والتحقق من الفعالية." : "Manage non-conformities from identification through root cause, CAPA, and effectiveness verification."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}><Download className="h-4 w-4" />{isAr ? "تصدير السجل" : "Export Register"}</Button>
          <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" />{isAr ? "NCR جديد" : "New NCR"}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="ps-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث بالرقم، القسم، الموقع، الوصف، السبب..." : "Search reference, department, location, description, cause..."} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>
              <SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem>
              <SelectItem value="submitted">{isAr ? "مرفوع" : "Submitted"}</SelectItem>
              <SelectItem value="assigned">{isAr ? "مُسند" : "Assigned"}</SelectItem>
              <SelectItem value="in_progress">{isAr ? "قيد الإجراء" : "In Progress"}</SelectItem>
              <SelectItem value="closed">{isAr ? "مغلق" : "Closed"}</SelectItem>
            </SelectContent></Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">{isAr ? "كل مستويات الخطورة" : "All severity"}</SelectItem>
              <SelectItem value="low">{isAr ? "منخفض" : "Low"}</SelectItem>
              <SelectItem value="medium">{isAr ? "متوسط" : "Medium"}</SelectItem>
              <SelectItem value="high">{isAr ? "عالٍ" : "High"}</SelectItem>
              <SelectItem value="critical">{isAr ? "حرج" : "Critical"}</SelectItem>
            </SelectContent></Select>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="p-3 text-start">{isAr ? "المرجع" : "Reference"}</th>
                  <th className="p-3 text-start">{isAr ? "عدم المطابقة" : "Non-Conformance"}</th>
                  <th className="p-3 text-start">{isAr ? "القسم / الموقع" : "Department / Location"}</th>
                  <th className="p-3 text-start">{isAr ? "المسؤول / الموعد" : "Owner / Due"}</th>
                  <th className="p-3 text-start">{isAr ? "الخطورة" : "Severity"}</th>
                  <th className="p-3 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-end">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNcrs.map(ncr => (
                  <tr key={ncr.id} className="border-t align-top hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs font-semibold">{ncr.refNo}</td>
                    <td className="max-w-[360px] p-3"><p className="line-clamp-2 font-medium">{ncr.description}</p><p className="mt-1 text-xs text-muted-foreground">{ncr.date}</p></td>
                    <td className="p-3"><p>{ncr.department || "—"}</p><p className="text-xs text-muted-foreground">{ncr.location || "—"}</p></td>
                    <td className="p-3"><p>{ncr.responsiblePersonId || "—"}</p><p className={`text-xs ${isOverdue(ncr) ? "font-semibold text-red-600" : "text-muted-foreground"}`}>{ncr.dueDate || "—"}{isOverdue(ncr) ? (isAr ? " • متأخر" : " • Overdue") : ""}</p></td>
                    <td className="p-3">{severityBadge(ncr.severity)}</td>
                    <td className="p-3">{statusBadge(ncr.status)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {busyId === ncr.id && <Loader2 className="my-2 h-4 w-4 animate-spin" />}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ncr)} title={isAr ? "فتح / تعديل" : "Open / Edit"}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => printNcr(ncr)} title={isAr ? "طباعة" : "Print"}><Printer className="h-4 w-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void handleStatusChange(ncr, "submitted")}>{isAr ? "رفع NCR" : "Submit"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleStatusChange(ncr, "assigned")}>{isAr ? "إسناد" : "Assign"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleStatusChange(ncr, "in_progress")}>{isAr ? "قيد الإجراء" : "In Progress"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleStatusChange(ncr, "closed")}><CheckCircle2 className="me-2 h-4 w-4" />{isAr ? "إغلاق" : "Close"}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => void handleDelete(ncr)}><Trash2 className="me-2 h-4 w-4" />{isAr ? "حذف" : "Delete"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNcrs.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">{isAr ? "لا توجد سجلات مطابقة" : "No matching NCR records"}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editing ? `${isAr ? "تعديل" : "Edit"} ${editing.refNo}` : (isAr ? "إنشاء تقرير عدم مطابقة" : "Create Non-Conformance Report")}</DialogTitle>
            <DialogDescription>{isAr ? "سجّل عدم المطابقة ثم وثّق التصحيح والسبب الجذري والإجراءات والتحقق من الفعالية." : "Record the non-conformance, containment, root cause, corrective actions, and effectiveness verification."}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
              <TabsTrigger value="details">{isAr ? "1. البيانات" : "1. Details"}</TabsTrigger>
              <TabsTrigger value="containment">{isAr ? "2. التصحيح" : "2. Containment"}</TabsTrigger>
              <TabsTrigger value="cause">{isAr ? "3. السبب" : "3. Cause"}</TabsTrigger>
              <TabsTrigger value="capa">{isAr ? "4. CAPA" : "4. CAPA"}</TabsTrigger>
              <TabsTrigger value="verify">{isAr ? "5. التحقق" : "5. Verify"}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>{isAr ? "التاريخ *" : "Date *"}</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isAr ? "مستوى الخطورة" : "Severity"}</Label><Select value={form.severity} onValueChange={severity => setForm({ ...form, severity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{isAr ? "منخفض" : "Low"}</SelectItem><SelectItem value="medium">{isAr ? "متوسط" : "Medium"}</SelectItem><SelectItem value="high">{isAr ? "عالٍ" : "High"}</SelectItem><SelectItem value="critical">{isAr ? "حرج" : "Critical"}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>{isAr ? "القسم *" : "Department *"}</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>{isAr ? "تصنيف عدم المطابقة" : "Classification"}</Label><Select value={String(form.sourceMetadata.classification || "process")} onValueChange={classification => setForm(prev => ({ ...prev, sourceMetadata: { ...prev.sourceMetadata, classification } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="process">{isAr ? "عملية / إجراء" : "Process"}</SelectItem><SelectItem value="equipment">{isAr ? "معدات" : "Equipment"}</SelectItem><SelectItem value="documentation">{isAr ? "توثيق / سجل" : "Documentation"}</SelectItem><SelectItem value="behavior">{isAr ? "ممارسة عمل" : "Work Practice"}</SelectItem><SelectItem value="product">{isAr ? "منتج / جودة" : "Product / Quality"}</SelectItem><SelectItem value="other">{isAr ? "أخرى" : "Other"}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>{isAr ? "المتطلب / المرجع" : "Requirement / Reference"}</Label><Input value={String(form.sourceMetadata.requirement || "")} onChange={e => setForm(prev => ({ ...prev, sourceMetadata: { ...prev.sourceMetadata, requirement: e.target.value } }))} placeholder={isAr ? "مثال: ISO 45001 / إجراء داخلي / متطلب عميل" : "e.g. ISO 45001 / procedure / customer requirement"} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>{isAr ? "وصف عدم المطابقة *" : "Non-Conformance Description *"}</Label><Textarea rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={isAr ? "اكتب المتطلب، ما تم ملاحظته، وأين يوجد الانحراف بعبارات واقعية قابلة للتحقق." : "State the requirement, observed evidence, and the deviation in objective, verifiable terms."} /></div>
            </TabsContent>

            <TabsContent value="containment" className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm"><strong>{isAr ? "التصحيح / الاحتواء الفوري:" : "Correction / Immediate Containment:"}</strong> {isAr ? "الإجراء السريع للسيطرة على الحالة الحالية، وهو مختلف عن الإجراء التصحيحي الذي يمنع تكرار السبب." : "Immediate control of the current condition; this is separate from the corrective action that prevents recurrence."}</div>
              <div className="space-y-2"><Label>{isAr ? "الإجراء الفوري" : "Immediate Action / Correction"}</Label><Textarea rows={7} value={form.immediateAction} onChange={e => setForm({ ...form, immediateAction: e.target.value })} placeholder={isAr ? "مثال: إيقاف المعدة، عزل المنطقة، إزالة المادة غير المطابقة..." : "e.g. stop equipment, isolate area, contain/remove non-conforming condition..."} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "مخاطر التكرار" : "Recurrence Risk"}</Label><Select value={String(form.sourceMetadata.recurrenceRisk || "Medium")} onValueChange={recurrenceRisk => setForm(prev => ({ ...prev, sourceMetadata: { ...prev.sourceMetadata, recurrenceRisk } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{isAr ? "الحالة" : "Workflow Status"}</Label><Select value={form.status} onValueChange={status => setForm({ ...form, status: status as NCRStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem><SelectItem value="submitted">{isAr ? "مرفوع" : "Submitted"}</SelectItem><SelectItem value="assigned">{isAr ? "مُسند" : "Assigned"}</SelectItem><SelectItem value="in_progress">{isAr ? "قيد الإجراء" : "In Progress"}</SelectItem><SelectItem value="closed">{isAr ? "مغلق" : "Closed"}</SelectItem></SelectContent></Select></div>
              </div>
            </TabsContent>

            <TabsContent value="cause" className="space-y-4">
              <div className="space-y-2"><Label>{isAr ? "تحليل السبب الجذري" : "Root Cause Analysis"}</Label><Textarea rows={7} value={form.rootCause} onChange={e => setForm({ ...form, rootCause: e.target.value })} placeholder={isAr ? "حدّد السبب النظامي القابل للمعالجة، وليس فقط خطأ الشخص أو السبب المباشر." : "Identify the actionable systemic cause, not only the immediate cause or individual error."} /></div>
              <div className="space-y-2"><Label>{isAr ? "هل توجد حالات مشابهة أو يمكن أن تحدث في أماكن أخرى؟" : "Similar / Potential Non-Conformities Review"}</Label><Textarea rows={5} value={String(form.sourceMetadata.similarCasesReviewed || "")} onChange={e => setForm(prev => ({ ...prev, sourceMetadata: { ...prev.sourceMetadata, similarCasesReviewed: e.target.value } }))} /></div>
            </TabsContent>

            <TabsContent value="capa" className="space-y-4">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{isAr ? "خطة الإجراءات التصحيحية والوقائية" : "Corrective / Preventive Action Plan"}</h3><p className="text-xs text-muted-foreground">{isAr ? "لكل إجراء: ماذا سنفعل، من المسؤول، متى ينتهي، وكيف نتحقق من الفعالية." : "For each action define what, owner, due date, and effectiveness evidence."}</p></div><Button type="button" variant="outline" size="sm" className="gap-2" onClick={addActionRow}><PlusCircle className="h-4 w-4" />{isAr ? "إضافة إجراء" : "Add Action"}</Button></div>
              <div className="space-y-3">
                {form.correctiveActions.map((action, index) => (
                  <div key={index} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between"><strong className="text-sm">#{index + 1}</strong><Button type="button" variant="ghost" size="icon" onClick={() => removeActionRow(index)}><X className="h-4 w-4" /></Button></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label>{isAr ? "الإجراء" : "Action"}</Label><Textarea rows={3} value={action.action} onChange={e => updateAction(index, { action: e.target.value })} /></div>
                      <div className="space-y-2"><Label>{isAr ? "المسؤول" : "Responsible"}</Label><Input value={action.responsible} onChange={e => updateAction(index, { responsible: e.target.value })} /></div>
                      <div className="space-y-2"><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={action.dueDate} onChange={e => updateAction(index, { dueDate: e.target.value })} /></div>
                      <div className="space-y-2 sm:col-span-2"><Label>{isAr ? "دليل / معيار الفعالية" : "Effectiveness Evidence / Criteria"}</Label><Input value={action.effectiveness} onChange={e => updateAction(index, { effectiveness: e.target.value })} /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "مسؤول الإغلاق الرئيسي" : "Primary Action Owner"}</Label><Input value={form.responsiblePersonId} onChange={e => setForm({ ...form, responsiblePersonId: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "الموعد المستهدف النهائي" : "Overall Target Date"}</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>{isAr ? "ملخص الإجراء التصحيحي" : "Corrective Action Summary"}</Label><Textarea rows={4} value={form.correctiveAction} onChange={e => setForm({ ...form, correctiveAction: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="verify" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "نتيجة التحقق من الفعالية" : "Effectiveness Status"}</Label><Select value={String(form.sourceMetadata.effectivenessStatus || "Pending")} onValueChange={effectivenessStatus => setForm(prev => ({ ...prev, sourceMetadata: { ...prev.sourceMetadata, effectivenessStatus } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pending">{isAr ? "بانتظار التحقق" : "Pending"}</SelectItem><SelectItem value="Effective">{isAr ? "فعّال" : "Effective"}</SelectItem><SelectItem value="Needs Follow-up">{isAr ? "يتطلب متابعة" : "Needs Follow-up"}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{isAr ? "حالة NCR" : "NCR Status"}</Label><Select value={form.status} onValueChange={status => setForm({ ...form, status: status as NCRStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem><SelectItem value="submitted">{isAr ? "مرفوع" : "Submitted"}</SelectItem><SelectItem value="assigned">{isAr ? "مُسند" : "Assigned"}</SelectItem><SelectItem value="in_progress">{isAr ? "قيد الإجراء" : "In Progress"}</SelectItem><SelectItem value="closed">{isAr ? "مغلق" : "Closed"}</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closeout Notes"}</Label><Textarea rows={8} value={form.verificationNotes} onChange={e => setForm({ ...form, verificationNotes: e.target.value })} placeholder={isAr ? "اذكر الدليل الذي يثبت تنفيذ الإجراء وفعاليته وعدم تكرار الحالة." : "Record evidence that actions were implemented, effective, and recurrence was controlled."} /></div>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm"><UserRoundCheck className="me-2 inline h-4 w-4" />{isAr ? "الإغلاق المهني يكون بعد التحقق من تنفيذ الإجراءات وفعاليتها، وليس بمجرد إدخال الإجراء." : "Close the NCR after verifying action implementation and effectiveness, not merely after entering an action."}</div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}<ClipboardCheck className="h-4 w-4" />{editing ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء NCR" : "Create NCR")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={open => !open && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

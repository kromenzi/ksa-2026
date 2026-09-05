import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { canDeleteManagedRecord } from "@/lib/generic-records";
import PrintShareDialog from "@/components/print-share-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, Plus, Search, Trash2, RefreshCw, Printer, CheckCircle2 } from "lucide-react";

type Escalation = {
  id: string;
  refNo: string;
  source: string;
  title: string;
  severity: string;
  level: string;
  status: string;
  dueDate: string;
  responsible: string;
  department: string;
  reason: string;
  createdAt: string;
  updatedAt?: string;
  history?: any[];
};

export default function EscalationDashboard() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const [items, setItems] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("HIGH");
  const [level, setLevel] = useState("Level 2 - Dept Manager");
  const [department, setDepartment] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [printItem, setPrintItem] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/escalations");
      const rows = await response.json();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setItems([]);
      toast.error(err?.message || (isAr ? "تعذر تحميل التصعيدات" : "Unable to load escalations"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => [item.refNo, item.source, item.title, item.department, item.responsible].some(value => String(value || "").toLowerCase().includes(q)));
  }, [items, search]);

  const activeCount = items.filter(item => !["RESOLVED", "CLOSED"].includes(item.status)).length;
  const overdueCount = items.filter(item => item.status === "OVERDUE" || (item.dueDate && new Date(`${item.dueDate}T23:59:59`).getTime() < Date.now() && !["RESOLVED", "CLOSED"].includes(item.status))).length;
  const resolvedCount = items.filter(item => ["RESOLVED", "CLOSED"].includes(item.status)).length;

  const openCreate = () => {
    setSource("");
    setTitle("");
    setSeverity("HIGH");
    setLevel("Level 2 - Dept Manager");
    setDepartment("");
    setResponsible("");
    setDueDate("");
    setReason("");
    setOpen(true);
  };

  const createEscalation = async () => {
    if (!title.trim()) {
      toast.error(isAr ? "عنوان التصعيد مطلوب" : "Escalation title is required");
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest("POST", "/api/escalations", { source, title: title.trim(), severity, level, department, responsible, dueDate, reason });
      const created = await response.json();
      setItems(prev => [created, ...prev]);
      setOpen(false);
      toast.success(isAr ? "تم إنشاء التصعيد" : "Escalation created");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر إنشاء التصعيد" : "Unable to create escalation"));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: Escalation, nextStatus: string) => {
    try {
      const response = await apiRequest("PATCH", `/api/escalations/${encodeURIComponent(item.id)}`, {
        status: nextStatus,
        historyEntry: {
          id: `${Date.now()}`,
          action: `Status changed to ${nextStatus}`,
          status: nextStatus,
          user: currentUser?.name || "Current User",
          date: new Date().toISOString(),
          details: "",
        },
      });
      if (!response.ok) throw new Error("Unable to update escalation");
      setItems(prev => prev.map(row => row.id === item.id ? { ...row, status: nextStatus } : row));
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل تحديث الحالة" : "Status update failed"));
    }
  };

  const deleteEscalation = async (item: Escalation) => {
    if (!canDelete || !window.confirm(isAr ? `حذف التصعيد ${item.refNo} وجميع سجله نهائيًا؟` : `Permanently delete ${item.refNo} and its full history?`)) return;
    setDeletingId(item.id);
    try {
      await apiRequest("DELETE", `/api/escalations/${encodeURIComponent(item.id)}`);
      setItems(prev => prev.filter(row => row.id !== item.id));
      toast.success(isAr ? "تم حذف التصعيد نهائيًا" : "Escalation permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل حذف التصعيد" : "Escalation delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const printEscalation = (item: Escalation) => setPrintItem({
    id: item.id,
    type: "report" as const,
    refNo: item.refNo,
    title: `${isAr ? "تقرير تصعيد إداري" : "Management Escalation Report"} - ${item.title}`,
    department: item.department || "HSE",
    status: item.status,
    date: item.createdAt?.slice(0, 10),
    sections: [
      { label: isAr ? "المصدر" : "Source", value: item.source || "-" },
      { label: isAr ? "الخطورة" : "Severity", value: item.severity || "-" },
      { label: isAr ? "المستوى" : "Level", value: item.level || "-" },
      { label: isAr ? "المسؤول" : "Responsible", value: item.responsible || "-" },
      { label: isAr ? "القسم" : "Department", value: item.department || "-" },
      { label: isAr ? "تاريخ الاستحقاق" : "Due Date", value: item.dueDate || "-" },
      { label: isAr ? "السبب" : "Reason", value: item.reason || "-" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-bold">{isAr ? "لوحة تصعيد الإدارة" : "Management Escalation Dashboard"}</h1><p className="text-sm text-muted-foreground">{isAr ? "تصعيدات فعلية محفوظة في Supabase بدون بيانات احتياطية تجريبية" : "Real Supabase escalations with no fallback demo records"}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button onClick={openCreate}><Plus className="me-2 h-4 w-4" />{isAr ? "تصعيد جديد" : "New Escalation"}</Button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "نشطة" : "Active"}</p><Clock className="h-4 w-4 text-amber-600" /></div><p className="text-2xl font-bold text-amber-700">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "متأخرة" : "Overdue"}</p><AlertTriangle className="h-4 w-4 text-red-600" /></div><p className="text-2xl font-bold text-red-700">{overdueCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "مغلقة" : "Resolved"}</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="text-2xl font-bold text-emerald-700">{resolvedCount}</p></CardContent></Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث في التصعيدات..." : "Search escalations..."} className="pl-9 rtl:pl-3 rtl:pr-9" /></div>
        <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "العنوان" : "Title"}</TableHead><TableHead>{isAr ? "الخطورة / المستوى" : "Severity / Level"}</TableHead><TableHead>{isAr ? "المسؤول" : "Responsible"}</TableHead><TableHead>{isAr ? "الاستحقاق" : "Due"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>
          {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد تصعيدات فعلية. تمت إزالة جميع بيانات التصعيد التجريبية." : "No real escalations. All demo escalation data has been removed."}</TableCell></TableRow>}
          {filtered.map(item => <TableRow key={item.id}><TableCell className="font-mono text-xs font-semibold">{item.refNo}</TableCell><TableCell><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.source}</p></TableCell><TableCell><Badge variant="outline">{item.severity}</Badge><p className="mt-1 text-xs text-muted-foreground">{item.level}</p></TableCell><TableCell className="text-xs">{item.responsible || "-"}<br /><span className="text-muted-foreground">{item.department || ""}</span></TableCell><TableCell className="text-xs">{item.dueDate || "-"}</TableCell><TableCell><Select value={item.status} onValueChange={value => void updateStatus(item, value)}><SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger><SelectContent>{["OPEN", "IN PROGRESS", "WAITING FOR RESPONSE", "OVERDUE", "RESOLVED", "CLOSED"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => printEscalation(item)}><Printer className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === item.id} onClick={() => void deleteEscalation(item)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}
        </TableBody></Table></div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? "إنشاء تصعيد إداري" : "Create Management Escalation"}</DialogTitle></DialogHeader><div className="grid gap-4 md:grid-cols-2">
        <div><Label>{isAr ? "المصدر" : "Source"}</Label><Input value={source} onChange={e => setSource(e.target.value)} /></div>
        <div><Label>{isAr ? "العنوان" : "Title"}</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div><Label>{isAr ? "الخطورة" : "Severity"}</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "المستوى" : "Level"}</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Level 1 - Supervisor", "Level 2 - Dept Manager", "Level 3 - HSE Manager", "Level 4 - Plant Manager"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "القسم" : "Department"}</Label><Input value={department} onChange={e => setDepartment(e.target.value)} /></div>
        <div><Label>{isAr ? "المسؤول" : "Responsible"}</Label><Input value={responsible} onChange={e => setResponsible(e.target.value)} /></div>
        <div><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div className="md:col-span-2"><Label>{isAr ? "سبب التصعيد" : "Escalation Reason"}</Label><Textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void createEscalation()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent></Dialog>
      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={value => !value && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

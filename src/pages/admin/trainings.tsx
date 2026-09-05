"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Search, Trash2, RefreshCw, Printer, BookOpen, Users, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";
import CompetencyMatrix from "@/components/training/CompetencyMatrix";

type AttendanceRow = { employeeId: string; employeeName: string; status: "present" | "absent" | "excused" };
type TrainingData = {
  refNo: string;
  title: string;
  category: string;
  trainer: string;
  factory: string;
  location: string;
  time: string;
  duration: string;
  language: string;
  objectives: string;
  attendance: AttendanceRow[];
};

const EMPTY_FORM: TrainingData = {
  refNo: "",
  title: "",
  category: "Toolbox Talk",
  trainer: "",
  factory: "",
  location: "",
  time: "",
  duration: "",
  language: "",
  objectives: "",
  attendance: [],
};

export default function AdminTrainingsPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<TrainingData>("trainings");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<TrainingData>(EMPTY_FORM);
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Scheduled");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<any>(null);

  const trainings = useMemo(() => items.map(row => ({
    ...row.data,
    id: row.id,
    refNo: row.refNo || row.data?.refNo || "",
    department: row.department || "",
    date: row.date || "",
    status: row.status || "Scheduled",
  })), [items]);

  const filtered = useMemo(() => trainings.filter(record => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [record.refNo, record.title, record.trainer, record.department]
      .some(value => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || record.status === statusFilter);
  }), [trainings, search, statusFilter]);

  const uniqueAttendees = new Set(trainings.flatMap(record => (record.attendance || []).map(person => person.employeeId))).size;
  const completedCount = trainings.filter(record => record.status === "Completed").length;
  const scheduledCount = trainings.filter(record => record.status === "Scheduled").length;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, refNo: `TRN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}` });
    setDepartment("");
    setDate(new Date().toISOString().slice(0, 10));
    setStatus("Scheduled");
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.trainer.trim() || !form.refNo.trim()) {
      toast.error(isAr ? "رقم التدريب والعنوان والمدرب مطلوبة" : "Training reference, title and trainer are required");
      return;
    }
    setSaving(true);
    try {
      await create({ refNo: form.refNo, title: form.title, status, department, date, data: form });
      setIsAddOpen(false);
      toast.success(isAr ? "تم حفظ التدريب في قاعدة البيانات" : "Training record saved to the database");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ التدريب" : "Unable to save training"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, refNo: string) => {
    if (!canDelete || !window.confirm(isAr ? `حذف سجل التدريب ${refNo} نهائيًا؟` : `Permanently delete training ${refNo}?`)) return;
    setDeletingId(id);
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف سجل التدريب نهائيًا" : "Training record permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (record: any) => {
    setPrintItem({
      id: record.id,
      type: "report" as const,
      refNo: record.refNo,
      title: `${isAr ? "سجل التدريب" : "Training Record"} - ${record.title}`,
      department: record.department || "HSE",
      status: record.status,
      date: record.date,
      createdAt: record.date,
      sections: [
        { label: isAr ? "عنوان التدريب" : "Training Title", value: record.title },
        { label: isAr ? "الفئة" : "Category", value: record.category || "-" },
        { label: isAr ? "المدرب" : "Trainer", value: record.trainer || "-" },
        { label: isAr ? "المصنع / الموقع" : "Factory / Location", value: [record.factory, record.location].filter(Boolean).join(" - ") || "-" },
        { label: isAr ? "التاريخ والوقت" : "Date & Time", value: [record.date, record.time].filter(Boolean).join(" ") || "-" },
        { label: isAr ? "المدة" : "Duration", value: record.duration || "-" },
        { label: isAr ? "الحضور" : "Attendance", value: (record.attendance || []).length ? record.attendance.map((person: AttendanceRow) => `${person.employeeName} (${person.employeeId}) - ${person.status}`).join("\n") : (isAr ? "لا يوجد حضور مسجل" : "No attendance recorded") },
        { label: isAr ? "الأهداف" : "Objectives", value: record.objectives || "-" },
      ],
    });
  };

  return (
    <div className="space-y-6" data-testid="admin-trainings-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg"><GraduationCap className="h-5 w-5" /></div>
          <div><h1 className="text-2xl font-bold">{isAr ? "التدريب والكفاءة" : "Training & Competency"}</h1><p className="text-xs text-muted-foreground">{isAr ? "سجلات التدريب والكفاءة الفعلية دون بيانات تجريبية" : "Real training and competency records without demo data"}</p></div>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="me-2 h-4 w-4" />{isAr ? "إنشاء تدريب" : "Create Training"}</Button></div>
      </div>

      <Tabs defaultValue="training" className="space-y-4">
        <TabsList><TabsTrigger value="training">{isAr ? "سجلات التدريب" : "Training Records"}</TabsTrigger><TabsTrigger value="competency">{isAr ? "الكفاءة" : "Competency"}</TabsTrigger></TabsList>
        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "إجمالي التدريبات" : "Total Trainings"}</p><BookOpen className="h-4 w-4 text-indigo-500" /></div><p className="mt-1 text-2xl font-bold">{trainings.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "مكتملة" : "Completed"}</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-2xl font-bold text-emerald-700">{completedCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "مجدولة" : "Scheduled"}</p><Clock className="h-4 w-4 text-amber-600" /></div><p className="mt-1 text-2xl font-bold text-amber-700">{scheduledCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "متدربون مسجلون" : "Recorded Trainees"}</p><Users className="h-4 w-4 text-blue-600" /></div><p className="mt-1 text-2xl font-bold">{uniqueAttendees}</p></CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle className="text-base">{isAr ? "سجل التدريب" : "Training Register"}</CardTitle></CardHeader><CardContent>
            <div className="mb-4 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث بالعنوان أو الرقم أو المدرب..." : "Search title, reference or trainer..."} className="pl-9 rtl:pl-3 rtl:pr-9" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="md:w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Ref"}</TableHead><TableHead>{isAr ? "التدريب" : "Training"}</TableHead><TableHead>{isAr ? "المدرب" : "Trainer"}</TableHead><TableHead>{isAr ? "القسم" : "Department"}</TableHead><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد تدريبات مسجلة. تم حذف جميع بيانات التدريب التجريبية." : "No training records. All demo training data has been removed."}</TableCell></TableRow>}
              {filtered.map(record => <TableRow key={record.id}><TableCell className="font-mono text-xs">{record.refNo}</TableCell><TableCell><p className="font-medium">{record.title}</p><p className="text-xs text-muted-foreground">{record.category || "-"}</p></TableCell><TableCell className="text-xs">{record.trainer || "-"}</TableCell><TableCell className="text-xs">{record.department || "-"}</TableCell><TableCell className="text-xs">{record.date || "-"}</TableCell><TableCell><Badge variant="outline">{record.status}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => handlePrint(record)}><Printer className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === record.id} onClick={() => void handleDelete(record.id, record.refNo)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}
            </TableBody></Table></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="competency"><Card className="p-5"><CompetencyMatrix isAr={isAr} /></Card></TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? "إنشاء سجل تدريب" : "Create Training Record"}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2">
        <div><Label>{isAr ? "الرقم المرجعي" : "Reference No"}</Label><Input value={form.refNo} onChange={e => setForm({ ...form, refNo: e.target.value })} /></div>
        <div><Label>{isAr ? "عنوان التدريب" : "Training Title"}</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>{isAr ? "الفئة" : "Category"}</Label><Select value={form.category} onValueChange={value => setForm({ ...form, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Toolbox Talk">Toolbox Talk</SelectItem><SelectItem value="Safety Induction">Safety Induction</SelectItem><SelectItem value="Technical Training">Technical Training</SelectItem><SelectItem value="Emergency Drill Training">Emergency Drill Training</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
        <div><Label>{isAr ? "المدرب" : "Trainer"}</Label><Input value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} /></div>
        <div><Label>{isAr ? "القسم" : "Department"}</Label><Input value={department} onChange={e => setDepartment(e.target.value)} /></div>
        <div><Label>{isAr ? "المصنع" : "Factory"}</Label><Input value={form.factory} onChange={e => setForm({ ...form, factory: e.target.value })} /></div>
        <div><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
        <div><Label>{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>{isAr ? "الوقت" : "Time"}</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        <div><Label>{isAr ? "المدة" : "Duration"}</Label><Input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
        <div><Label>{isAr ? "اللغة" : "Language"}</Label><Input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} /></div>
        <div><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></div>
        <div className="md:col-span-2"><Label>{isAr ? "الأهداف" : "Objectives"}</Label><Input value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent></Dialog>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={open => !open && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

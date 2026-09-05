"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Grid, Search, Printer, CheckCircle2, AlertTriangle, Clock, Trash2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

const COURSES = ["General HSE Induction", "Fire Safety & Extinguisher", "LOTO & Energy Isolation", "Confined Space Entry", "First Aid & CPR", "Working at Heights"];
type CourseStatus = "completed" | "pending" | "expired";
type MatrixData = { employeeId: string; employeeName: string; courses: Record<string, CourseStatus> };

const emptyCourses = () => Object.fromEntries(COURSES.map(course => [course, "pending"])) as Record<string, CourseStatus>;

export default function AdminTrainingMatrixPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<MatrixData>("training-matrix");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState("");
  const [form, setForm] = useState<MatrixData>({ employeeId: "", employeeName: "", courses: emptyCourses() });
  const [printItem, setPrintItem] = useState<any>(null);

  const rows = useMemo(() => items.map(row => ({ ...row.data, id: row.id, department: row.department || "", refNo: row.refNo || row.data?.employeeId || "" })), [items]);
  const filtered = useMemo(() => rows.filter(row => {
    const q = search.trim().toLowerCase();
    return !q || [row.employeeId, row.employeeName, row.department].some(value => String(value || "").toLowerCase().includes(q));
  }), [rows, search]);

  const save = async () => {
    if (!form.employeeId.trim() || !form.employeeName.trim()) {
      toast.error(isAr ? "اسم الموظف والرقم الوظيفي مطلوبان" : "Employee name and ID are required");
      return;
    }
    setSaving(true);
    try {
      await create({ refNo: form.employeeId, title: form.employeeName, status: "active", department, date: new Date().toISOString().slice(0, 10), data: form });
      setOpen(false);
      setDepartment("");
      setForm({ employeeId: "", employeeName: "", courses: emptyCourses() });
      toast.success(isAr ? "تم حفظ صف المصفوفة" : "Training matrix row saved");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر الحفظ" : "Unable to save"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string, employeeName: string) => {
    if (!canDelete || !window.confirm(isAr ? `حذف سجل المصفوفة للموظف ${employeeName}؟` : `Delete training matrix record for ${employeeName}?`)) return;
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف السجل" : "Matrix record deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  const printMatrix = () => setPrintItem({
    id: "TRAINING-MATRIX",
    type: "report" as const,
    refNo: "HSE-TRAINING-MATRIX",
    title: isAr ? "مصفوفة التدريب والكفاءة" : "Training & Competency Matrix",
    department: "HSE",
    status: "Current",
    date: new Date().toISOString().slice(0, 10),
    sections: filtered.map(row => ({ label: `${row.employeeName} (${row.employeeId})`, value: COURSES.map(course => `${course}: ${row.courses?.[course] || "pending"}`).join("\n") })),
  });

  return (
    <div className="space-y-6" data-testid="admin-training-matrix-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white"><Grid className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold">{isAr ? "مصفوفة التدريب" : "Training Matrix"}</h1><p className="text-xs text-muted-foreground">{isAr ? "مصفوفة فعلية مرتبطة بقاعدة البيانات" : "Database-backed training qualification matrix"}</p></div></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button variant="outline" onClick={printMatrix}><Printer className="me-2 h-4 w-4" />{isAr ? "طباعة" : "Print"}</Button><Button onClick={() => setOpen(true)}><Plus className="me-2 h-4 w-4" />{isAr ? "إضافة موظف" : "Add Employee"}</Button></div>
      </div>

      <Card className="p-4">
        <div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث بالموظف أو القسم..." : "Search employee or department..."} className="pl-9 rtl:pl-3 rtl:pr-9" /></div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead className="min-w-[190px]">{isAr ? "الموظف" : "Employee"}</TableHead><TableHead>{isAr ? "القسم" : "Department"}</TableHead>{COURSES.map(course => <TableHead key={course} className="min-w-[125px] text-center text-xs">{course}</TableHead>)}<TableHead className="w-16 text-right">{isAr ? "حذف" : "Delete"}</TableHead></TableRow></TableHeader><TableBody>
          {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={COURSES.length + 3} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد بيانات في المصفوفة. تم حذف الموظفين والنتائج التجريبية." : "No matrix records. Demo employees and statuses have been removed."}</TableCell></TableRow>}
          {filtered.map(row => <TableRow key={row.id}><TableCell><p className="font-medium">{row.employeeName}</p><p className="font-mono text-xs text-muted-foreground">{row.employeeId}</p></TableCell><TableCell className="text-xs">{row.department || "-"}</TableCell>{COURSES.map(course => { const status = row.courses?.[course] || "pending"; return <TableCell key={course} className="text-center">{status === "completed" ? <Badge className="bg-emerald-500/10 text-emerald-700"><CheckCircle2 className="me-1 h-3 w-3" />{isAr ? "مكتمل" : "Done"}</Badge> : status === "expired" ? <Badge variant="outline" className="bg-red-500/10 text-red-700"><AlertTriangle className="me-1 h-3 w-3" />{isAr ? "منتهي" : "Expired"}</Badge> : <Badge variant="outline"><Clock className="me-1 h-3 w-3" />{isAr ? "مطلوب" : "Pending"}</Badge>}</TableCell>; })}<TableCell className="text-right">{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => void deleteRow(row.id, row.employeeName)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
        </TableBody></Table></div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? "إضافة سجل للمصفوفة" : "Add Training Matrix Record"}</DialogTitle></DialogHeader><div className="grid gap-4 md:grid-cols-3"><div><Label>{isAr ? "اسم الموظف" : "Employee Name"}</Label><Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} /></div><div><Label>{isAr ? "الرقم الوظيفي" : "Employee ID"}</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} /></div><div><Label>{isAr ? "القسم" : "Department"}</Label><Input value={department} onChange={e => setDepartment(e.target.value)} /></div>{COURSES.map(course => <div key={course}><Label>{course}</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.courses[course]} onChange={e => setForm({ ...form, courses: { ...form.courses, [course]: e.target.value as CourseStatus } })}><option value="pending">Pending</option><option value="completed">Completed</option><option value="expired">Expired</option></select></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void save()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent></Dialog>
      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={openValue => !openValue && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

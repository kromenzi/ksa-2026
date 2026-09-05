"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, XCircle, Circle } from "lucide-react";
import { toast } from "sonner";

const COMPETENCIES = ["Fire Safety", "LOTO", "PPE", "Emergency Response", "Equipment Operation"];
type CompetencyStatus = "competent" | "needs_improvement" | "not_competent" | "not_assessed";
type CompetencyData = {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  competencies: Record<string, CompetencyStatus>;
};

const emptyStatuses = () => Object.fromEntries(COMPETENCIES.map(item => [item, "not_assessed"])) as Record<string, CompetencyStatus>;

function StatusIcon({ status }: { status: CompetencyStatus }) {
  if (status === "competent") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "needs_improvement") return <AlertCircle className="h-5 w-5 text-amber-600" />;
  if (status === "not_competent") return <XCircle className="h-5 w-5 text-red-600" />;
  return <Circle className="h-5 w-5 text-slate-300" />;
}

export default function CompetencyMatrix({ isAr }: { isAr: boolean }) {
  const { currentUser } = useData();
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<CompetencyData>("competency");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompetencyData>({ employeeId: "", employeeName: "", jobTitle: "", competencies: emptyStatuses() });

  const records = useMemo(() => items.map(row => ({ ...row.data, id: row.id, department: row.department || "", refNo: row.refNo || row.data?.employeeId || "" })), [items]);

  const save = async () => {
    if (!form.employeeId.trim() || !form.employeeName.trim()) {
      toast.error(isAr ? "اسم الموظف والرقم الوظيفي مطلوبان" : "Employee name and ID are required");
      return;
    }
    setSaving(true);
    try {
      await create({ refNo: form.employeeId, title: form.employeeName, status: "active", department: "", date: new Date().toISOString().slice(0, 10), data: form });
      setOpen(false);
      setForm({ employeeId: "", employeeName: "", jobTitle: "", competencies: emptyStatuses() });
      toast.success(isAr ? "تم حفظ تقييم الكفاءة" : "Competency assessment saved");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر الحفظ" : "Unable to save"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string, employeeName: string) => {
    if (!canDelete || !window.confirm(isAr ? `حذف تقييم كفاءة ${employeeName} نهائيًا؟` : `Permanently delete ${employeeName}'s competency assessment?`)) return;
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف تقييم الكفاءة" : "Competency assessment deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold">{isAr ? "مصفوفة الكفاءة للموظفين" : "Employee Competency Matrix"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "بيانات فعلية محفوظة في Supabase" : "Real competency records stored in Supabase"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="me-2 h-4 w-4" />{isAr ? "إضافة تقييم" : "Add Assessment"}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <Badge variant="outline"><CheckCircle2 className="me-1 h-3.5 w-3.5 text-emerald-600" />{isAr ? "كفء" : "Competent"}</Badge>
        <Badge variant="outline"><AlertCircle className="me-1 h-3.5 w-3.5 text-amber-600" />{isAr ? "يحتاج تحسين" : "Needs Improvement"}</Badge>
        <Badge variant="outline"><XCircle className="me-1 h-3.5 w-3.5 text-red-600" />{isAr ? "غير كفء" : "Not Competent"}</Badge>
        <Badge variant="outline"><Circle className="me-1 h-3.5 w-3.5 text-slate-400" />{isAr ? "لم يقيّم" : "Not Assessed"}</Badge>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead className="min-w-[190px]">{isAr ? "الموظف" : "Employee"}</TableHead>{COMPETENCIES.map(item => <TableHead key={item} className="min-w-[130px] text-center text-xs">{item}</TableHead>)}<TableHead className="w-16 text-right">{isAr ? "حذف" : "Delete"}</TableHead></TableRow></TableHeader>
          <TableBody>
            {!loading && records.length === 0 && <TableRow><TableCell colSpan={COMPETENCIES.length + 2} className="py-10 text-center text-muted-foreground">{isAr ? "لا توجد تقييمات كفاءة مسجلة. تم حذف البيانات التجريبية." : "No competency assessments recorded. Demo data has been removed."}</TableCell></TableRow>}
            {records.map(record => <TableRow key={record.id}><TableCell><p className="font-medium">{record.employeeName}</p><p className="text-xs text-muted-foreground">{record.employeeId}{record.jobTitle ? ` · ${record.jobTitle}` : ""}</p></TableCell>{COMPETENCIES.map(item => <TableCell key={item} className="text-center"><div className="flex justify-center"><StatusIcon status={record.competencies?.[item] || "not_assessed"} /></div></TableCell>)}<TableCell className="text-right">{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => void deleteRow(record.id, record.employeeName)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? "إضافة تقييم كفاءة" : "Add Competency Assessment"}</DialogTitle></DialogHeader><div className="grid gap-4 md:grid-cols-3"><div><Label>{isAr ? "اسم الموظف" : "Employee Name"}</Label><Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} /></div><div><Label>{isAr ? "الرقم الوظيفي" : "Employee ID"}</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} /></div><div><Label>{isAr ? "المسمى الوظيفي" : "Job Title"}</Label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>{COMPETENCIES.map(item => <div key={item}><Label>{item}</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.competencies[item]} onChange={e => setForm({ ...form, competencies: { ...form.competencies, [item]: e.target.value as CompetencyStatus } })}><option value="not_assessed">Not Assessed</option><option value="competent">Competent</option><option value="needs_improvement">Needs Improvement</option><option value="not_competent">Not Competent</option></select></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void save()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

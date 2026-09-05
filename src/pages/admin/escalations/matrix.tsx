import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord, type GenericRecord } from "@/lib/generic-records";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type MatrixData = {
  severity: string;
  timeline: string;
  level: string;
  role: string;
  autoEscalate: boolean;
};

const EMPTY: MatrixData = {
  severity: "HIGH",
  timeline: "",
  level: "Level 2",
  role: "",
  autoEscalate: true,
};

export default function EscalationMatrix() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, update, remove, refresh } = useGenericRecords<MatrixData>("escalation-matrix");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GenericRecord<MatrixData> | null>(null);
  const [form, setForm] = useState<MatrixData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(() => items.map(row => ({ ...row, ...row.data })), [items]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (row: GenericRecord<MatrixData>) => {
    setEditing(row);
    setForm({ ...EMPTY, ...(row.data || {}) });
    setOpen(true);
  };

  const save = async () => {
    if (!form.timeline.trim() || !form.role.trim()) {
      toast.error(isAr ? "المهلة والدور المسؤول مطلوبان" : "Timeline and responsible role are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, { title: `${form.severity} - ${form.level}`, status: "active", data: form });
        toast.success(isAr ? "تم تحديث قاعدة التصعيد" : "Escalation rule updated");
      } else {
        await create({
          refNo: `ESC-MTX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          title: `${form.severity} - ${form.level}`,
          status: "active",
          department: "Management",
          date: new Date().toISOString().slice(0, 10),
          data: form,
        });
        toast.success(isAr ? "تم إنشاء قاعدة التصعيد" : "Escalation rule created");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ قاعدة التصعيد" : "Unable to save escalation rule"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (row: GenericRecord<MatrixData>) => {
    if (!canDelete || !window.confirm(isAr ? `حذف قاعدة ${row.refNo || row.id} نهائيًا؟` : `Permanently delete rule ${row.refNo || row.id}?`)) return;
    setDeletingId(row.id);
    try {
      await remove(row.id);
      toast.success(isAr ? "تم حذف قاعدة التصعيد نهائيًا" : "Escalation rule permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل حذف القاعدة" : "Rule delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Grid className="h-6 w-6 text-indigo-500" />{isAr ? "مصفوفة التصعيد" : "Escalation Matrix"}</h2><p className="mt-1 text-sm text-muted-foreground">{isAr ? "قواعد تصعيد فعلية محفوظة في Supabase؛ تمت إزالة القواعد الافتراضية وlocalStorage." : "Real escalation rules stored in Supabase; default rules and localStorage data are removed."}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button onClick={openNew}><Plus className="me-2 h-4 w-4" />{isAr ? "قاعدة جديدة" : "New Rule"}</Button></div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Card><CardContent className="p-4"><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead><TableHead>{isAr ? "المهلة" : "Timeline"}</TableHead><TableHead>{isAr ? "المستوى" : "Level"}</TableHead><TableHead>{isAr ? "الدور المسؤول" : "Responsible Role"}</TableHead><TableHead>{isAr ? "تلقائي" : "Auto"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>
        {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد قواعد تصعيد فعلية. تمت إزالة جميع قواعد المصفوفة التجريبية." : "No real escalation rules. All demo matrix rules have been removed."}</TableCell></TableRow>}
        {rows.map(row => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.refNo || "-"}</TableCell><TableCell><Badge variant="outline">{row.severity || "-"}</Badge></TableCell><TableCell className="text-sm">{row.timeline || "-"}</TableCell><TableCell><Badge variant="outline">{row.level || "-"}</Badge></TableCell><TableCell className="text-sm">{row.role || "-"}</TableCell><TableCell>{row.autoEscalate ? <Badge className="bg-emerald-500/10 text-emerald-700">{isAr ? "نعم" : "Yes"}</Badge> : <Badge variant="outline">{isAr ? "لا" : "No"}</Badge>}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === row.id} onClick={() => void deleteRule(row)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}
      </TableBody></Table></div></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-[560px]"><DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل قاعدة التصعيد" : "Edit Escalation Rule") : (isAr ? "إضافة قاعدة تصعيد" : "Add Escalation Rule")}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2">
        <div><Label>{isAr ? "الخطورة" : "Severity"}</Label><Select value={form.severity} onValueChange={value => setForm({ ...form, severity: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "المستوى" : "Level"}</Label><Select value={form.level} onValueChange={value => setForm({ ...form, level: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Level 0", "Level 1", "Level 2", "Level 3", "Level 4"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "المهلة الزمنية" : "Timeline"}</Label><Input value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value })} placeholder={isAr ? "مثال: 24 ساعة" : "e.g. 24 Hours"} /></div>
        <div><Label>{isAr ? "الدور المسؤول" : "Responsible Role"}</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
        <div><Label>{isAr ? "التصعيد التلقائي" : "Auto Escalate"}</Label><Select value={String(form.autoEscalate)} onValueChange={value => setForm({ ...form, autoEscalate: value === "true" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">{isAr ? "نعم" : "Yes"}</SelectItem><SelectItem value="false">{isAr ? "لا" : "No"}</SelectItem></SelectContent></Select></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void save()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

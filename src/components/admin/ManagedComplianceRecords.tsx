"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, RefreshCw, Printer, ShieldCheck, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

type Option = { value: string; en: string; ar: string };

type RecordData = {
  category: string;
  location: string;
  owner: string;
  dueDate: string;
  description: string;
  notes: string;
};

export interface ManagedComplianceRecordsProps {
  resource: string;
  prefix: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categories: Option[];
  statuses: Option[];
  defaultStatus: string;
}

const EMPTY_DATA: RecordData = {
  category: "",
  location: "",
  owner: "",
  dueDate: "",
  description: "",
  notes: "",
};

export default function ManagedComplianceRecords(props: ManagedComplianceRecordsProps) {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<RecordData>(props.resource);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [refNo, setRefNo] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState(props.defaultStatus);
  const [data, setData] = useState<RecordData>(EMPTY_DATA);
  const [printItem, setPrintItem] = useState<any>(null);

  const rows = useMemo(() => items.map(row => ({
    id: row.id,
    refNo: row.refNo || "",
    title: row.title || "",
    status: row.status || props.defaultStatus,
    department: row.department || "",
    date: row.date || "",
    ...(row.data || EMPTY_DATA),
  })), [items, props.defaultStatus]);

  const filtered = useMemo(() => rows.filter(row => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [row.refNo, row.title, row.department, row.category, row.location, row.owner, row.description]
      .some(value => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || row.status === statusFilter);
  }), [rows, search, statusFilter]);

  const openCount = rows.filter(row => !["Closed", "Completed", "Compliant", "Released"].includes(row.status)).length;
  const closedCount = rows.length - openCount;
  const overdueCount = rows.filter(row => row.dueDate && new Date(`${row.dueDate}T23:59:59`).getTime() < Date.now() && !["Closed", "Completed", "Compliant", "Released"].includes(row.status)).length;

  const labelFor = (options: Option[], value: string) => {
    const match = options.find(option => option.value === value);
    return match ? (isAr ? match.ar : match.en) : value || "-";
  };

  const openCreate = () => {
    setRefNo(`${props.prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`);
    setTitle("");
    setDepartment("");
    setDate(new Date().toISOString().slice(0, 10));
    setStatus(props.defaultStatus);
    setData({ ...EMPTY_DATA, category: props.categories[0]?.value || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!title.trim() || !refNo.trim()) {
      toast.error(isAr ? "الرقم المرجعي والعنوان مطلوبان" : "Reference number and title are required");
      return;
    }
    setSaving(true);
    try {
      await create({ refNo, title: title.trim(), status, department, date, data });
      setOpen(false);
      toast.success(isAr ? "تم حفظ السجل في قاعدة البيانات" : "Record saved to the database");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ السجل" : "Unable to save record"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string, reference: string) => {
    if (!canDelete || !window.confirm(isAr ? `حذف السجل ${reference || id} نهائيًا؟` : `Permanently delete ${reference || id}?`)) return;
    setDeletingId(id);
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف السجل نهائيًا" : "Record permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const printRow = (row: any) => setPrintItem({
    id: row.id,
    type: "report" as const,
    refNo: row.refNo,
    title: `${isAr ? props.titleAr : props.titleEn} - ${row.title}`,
    department: row.department || "HSE",
    status: row.status,
    date: row.date,
    createdAt: row.date,
    sections: [
      { label: isAr ? "المرجع" : "Reference", value: row.refNo || "-" },
      { label: isAr ? "العنوان" : "Title", value: row.title || "-" },
      { label: isAr ? "الفئة" : "Category", value: labelFor(props.categories, row.category) },
      { label: isAr ? "القسم" : "Department", value: row.department || "-" },
      { label: isAr ? "الموقع" : "Location", value: row.location || "-" },
      { label: isAr ? "المسؤول" : "Owner", value: row.owner || "-" },
      { label: isAr ? "التاريخ" : "Date", value: row.date || "-" },
      { label: isAr ? "تاريخ الاستحقاق" : "Due Date", value: row.dueDate || "-" },
      { label: isAr ? "الحالة" : "Status", value: labelFor(props.statuses, row.status) },
      { label: isAr ? "الوصف" : "Description", value: row.description || "-" },
      { label: isAr ? "ملاحظات" : "Notes", value: row.notes || "-" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg"><ShieldCheck className="h-5 w-5" /></div>
          <div><h1 className="text-2xl font-bold">{isAr ? props.titleAr : props.titleEn}</h1><p className="text-xs text-muted-foreground">{isAr ? props.descriptionAr : props.descriptionEn}</p></div>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button onClick={openCreate}><Plus className="me-2 h-4 w-4" />{isAr ? "إضافة سجل" : "Add Record"}</Button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "إجمالي السجلات" : "Total Records"}</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "مفتوحة / نشطة" : "Open / Active"}</p><Clock className="h-4 w-4 text-amber-600" /></div><p className="mt-1 text-2xl font-bold text-amber-700">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "مغلقة / مكتملة" : "Closed / Completed"}</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-2xl font-bold text-emerald-700">{closedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs text-muted-foreground">{isAr ? "متأخرة" : "Overdue"}</p><AlertTriangle className="h-4 w-4 text-red-600" /></div><p className="mt-1 text-2xl font-bold text-red-700">{overdueCount}</p></CardContent></Card>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث في السجلات..." : "Search records..."} className="pl-9 rtl:pl-3 rtl:pr-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="md:w-[210px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>{props.statuses.map(option => <SelectItem key={option.value} value={option.value}>{isAr ? option.ar : option.en}</SelectItem>)}</SelectContent></Select>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "العنوان" : "Title"}</TableHead><TableHead>{isAr ? "الفئة" : "Category"}</TableHead><TableHead>{isAr ? "القسم / الموقع" : "Department / Location"}</TableHead><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>
          {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد سجلات فعلية. تمت إزالة جميع البيانات التجريبية." : "No real records found. All demo data has been removed."}</TableCell></TableRow>}
          {filtered.map(row => <TableRow key={row.id}><TableCell className="font-mono text-xs font-semibold">{row.refNo || "-"}</TableCell><TableCell><p className="font-medium">{row.title}</p><p className="max-w-[280px] truncate text-xs text-muted-foreground">{row.description || ""}</p></TableCell><TableCell><Badge variant="outline">{labelFor(props.categories, row.category)}</Badge></TableCell><TableCell className="text-xs">{row.department || "-"}<br /><span className="text-muted-foreground">{row.location || ""}</span></TableCell><TableCell className="text-xs">{row.date || "-"}{row.dueDate ? <><br /><span className="text-muted-foreground">{isAr ? "استحقاق:" : "Due:"} {row.dueDate}</span></> : null}</TableCell><TableCell><Badge variant="outline">{labelFor(props.statuses, row.status)}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => printRow(row)}><Printer className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === row.id} onClick={() => void deleteRow(row.id, row.refNo)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}
        </TableBody></Table></div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? `إضافة سجل - ${props.titleAr}` : `Add Record - ${props.titleEn}`}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2">
        <div><Label>{isAr ? "الرقم المرجعي" : "Reference No"}</Label><Input value={refNo} onChange={e => setRefNo(e.target.value)} /></div>
        <div><Label>{isAr ? "العنوان" : "Title"}</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div><Label>{isAr ? "الفئة" : "Category"}</Label><Select value={data.category} onValueChange={value => setData({ ...data, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{props.categories.map(option => <SelectItem key={option.value} value={option.value}>{isAr ? option.ar : option.en}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{props.statuses.map(option => <SelectItem key={option.value} value={option.value}>{isAr ? option.ar : option.en}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{isAr ? "القسم" : "Department"}</Label><Input value={department} onChange={e => setDepartment(e.target.value)} /></div>
        <div><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={data.location} onChange={e => setData({ ...data, location: e.target.value })} /></div>
        <div><Label>{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={data.dueDate} onChange={e => setData({ ...data, dueDate: e.target.value })} /></div>
        <div><Label>{isAr ? "المسؤول" : "Owner"}</Label><Input value={data.owner} onChange={e => setData({ ...data, owner: e.target.value })} /></div>
        <div><Label>{isAr ? "ملاحظات" : "Notes"}</Label><Input value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>{isAr ? "الوصف" : "Description"}</Label><Textarea rows={4} value={data.description} onChange={e => setData({ ...data, description: e.target.value })} /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void save()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent></Dialog>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={value => !value && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

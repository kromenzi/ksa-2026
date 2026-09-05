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
import { CreditCard, Plus, Search, Trash2, RefreshCw, Printer, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

const LICENSE_TYPES = [
  { value: "driving", en: "Driving License", ar: "رخصة قيادة" },
  { value: "forklift", en: "Forklift License", ar: "رخصة رافعة شوكية" },
  { value: "overhead_crane", en: "Overhead Crane License", ar: "رخصة ونش علوي" },
  { value: "lifter", en: "Lifter / Manlift License", ar: "رخصة رافعات أفراد" },
  { value: "mewp", en: "MEWP License", ar: "رخصة منصة عمل متحركة" },
  { value: "heavy_vehicle", en: "Heavy Vehicle License", ar: "رخصة مركبات ثقيلة" },
  { value: "other", en: "Other", ar: "أخرى" },
] as const;

type LicenseData = {
  licenseNumber: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  licenseType: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  attachmentName: string;
  attachmentUrl: string;
  remarks: string;
};

const EMPTY_FORM: LicenseData = {
  licenseNumber: "",
  employeeId: "",
  employeeName: "",
  jobTitle: "",
  licenseType: "forklift",
  issuingAuthority: "",
  issueDate: "",
  expiryDate: "",
  attachmentName: "",
  attachmentUrl: "",
  remarks: "",
};

function typeLabel(value: string, isAr: boolean) {
  const item = LICENSE_TYPES.find(type => type.value === value);
  return item ? (isAr ? item.ar : item.en) : value;
}

function getLicenseStatus(expiryDate?: string) {
  if (!expiryDate) return "NO EXPIRY";
  const expiry = new Date(`${expiryDate}T23:59:59`);
  const now = new Date();
  if (Number.isNaN(expiry.getTime())) return "NO EXPIRY";
  if (expiry.getTime() < now.getTime()) return "EXPIRED";
  const warning = new Date();
  warning.setMonth(warning.getMonth() + 6);
  return expiry.getTime() <= warning.getTime() ? "EXPIRING SOON" : "VALID";
}

function statusBadge(status: string) {
  if (status === "VALID") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (status === "EXPIRING SOON") return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  if (status === "EXPIRED") return "bg-red-500/10 text-red-700 border-red-500/20";
  return "bg-slate-500/10 text-slate-700 border-slate-500/20";
}

export default function AdminLicensesPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<LicenseData>("licenses");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<LicenseData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<any>(null);

  const licenses = useMemo(() => items.map(row => {
    const data = row.data || ({} as LicenseData);
    return {
      ...data,
      id: row.id,
      refNo: row.refNo || data.licenseNumber || "",
      department: row.department || "",
      recordStatus: row.status || "active",
      status: getLicenseStatus(data.expiryDate),
    };
  }), [items]);

  const filtered = useMemo(() => licenses.filter(record => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [record.refNo, record.employeeName, record.employeeId, record.issuingAuthority]
      .some(value => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (typeFilter === "all" || record.licenseType === typeFilter);
  }), [licenses, search, typeFilter]);

  const expiring = useMemo(() => licenses.filter(record => record.status === "EXPIRING SOON" || record.status === "EXPIRED"), [licenses]);
  const validCount = licenses.filter(record => record.status === "VALID").length;
  const expiringCount = licenses.filter(record => record.status === "EXPIRING SOON").length;
  const expiredCount = licenses.filter(record => record.status === "EXPIRED").length;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, licenseNumber: `LIC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}` });
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim() || !form.employeeId.trim() || !form.licenseNumber.trim()) {
      toast.error(isAr ? "رقم الترخيص واسم الموظف ورقمه الوظيفي مطلوبة" : "License number, employee name and employee ID are required");
      return;
    }
    setSaving(true);
    try {
      await create({
        refNo: form.licenseNumber,
        title: form.employeeName,
        status: "active",
        department: "",
        date: form.issueDate || new Date().toISOString().slice(0, 10),
        data: form,
      });
      setIsAddOpen(false);
      toast.success(isAr ? "تم حفظ الترخيص في قاعدة البيانات" : "License saved to the database");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ الترخيص" : "Unable to save license"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, refNo: string) => {
    if (!canDelete) return;
    if (!window.confirm(isAr ? `حذف الترخيص ${refNo} نهائيًا؟` : `Permanently delete license ${refNo}?`)) return;
    setDeletingId(id);
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف الترخيص نهائيًا" : "License permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل حذف الترخيص" : "License delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (record: any) => {
    setPrintItem({
      id: record.id,
      type: "license" as const,
      refNo: record.refNo,
      title: `${isAr ? "بطاقة ترخيص مهني" : "Professional License Card"} - ${typeLabel(record.licenseType, isAr)}`,
      department: record.department || "HSE",
      status: record.status,
      date: record.expiryDate || record.issueDate,
      createdAt: record.issueDate,
      sections: [
        { label: isAr ? "رقم الترخيص" : "License Number", value: record.refNo },
        { label: isAr ? "الموظف" : "Employee", value: `${record.employeeName} (${record.employeeId})` },
        { label: isAr ? "المسمى الوظيفي" : "Job Title", value: record.jobTitle || "-" },
        { label: isAr ? "نوع الترخيص" : "License Type", value: typeLabel(record.licenseType, isAr) },
        { label: isAr ? "جهة الإصدار" : "Issuing Authority", value: record.issuingAuthority || "-" },
        { label: isAr ? "تاريخ الإصدار" : "Issue Date", value: record.issueDate || "-" },
        { label: isAr ? "تاريخ الانتهاء" : "Expiry Date", value: record.expiryDate || "-" },
        { label: isAr ? "الحالة" : "Status", value: record.status },
        { label: isAr ? "ملاحظات" : "Remarks", value: record.remarks || "-" },
      ],
    });
  };

  const renderRows = (rows: typeof licenses) => (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isAr ? "رقم الترخيص" : "License No"}</TableHead>
            <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
            <TableHead>{isAr ? "النوع" : "Type"}</TableHead>
            <TableHead>{isAr ? "جهة الإصدار" : "Authority"}</TableHead>
            <TableHead>{isAr ? "تاريخ الانتهاء" : "Expiry"}</TableHead>
            <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
            <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد تراخيص مسجلة. لا توجد بيانات تجريبية." : "No licenses recorded. No demo data is loaded."}</TableCell></TableRow>}
          {rows.map(record => (
            <TableRow key={record.id}>
              <TableCell className="font-mono text-xs font-semibold">{record.refNo}</TableCell>
              <TableCell><p className="font-medium">{record.employeeName}</p><p className="text-xs text-muted-foreground">{record.employeeId} {record.jobTitle ? `· ${record.jobTitle}` : ""}</p></TableCell>
              <TableCell><Badge variant="outline">{typeLabel(record.licenseType, isAr)}</Badge></TableCell>
              <TableCell className="text-xs">{record.issuingAuthority || "-"}</TableCell>
              <TableCell className="text-xs">{record.expiryDate || "-"}</TableCell>
              <TableCell><Badge variant="outline" className={statusBadge(record.status)}>{record.status}</Badge></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => handlePrint(record)}><Printer className="h-4 w-4" /></Button>{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === record.id} onClick={() => void handleDelete(record.id, record.refNo)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-licenses-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg"><CreditCard className="h-5 w-5" /></div>
          <div><h1 className="text-2xl font-bold">{isAr ? "إدارة التراخيص" : "License Management"}</h1><p className="text-xs text-muted-foreground">{isAr ? "التراخيص المهنية الفعلية ومتابعة تواريخ الانتهاء" : "Database-backed professional licenses and expiry tracking"}</p></div>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button onClick={openCreate} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" />{isAr ? "إضافة ترخيص" : "Add License"}</Button></div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList><TabsTrigger value="dashboard">{isAr ? "لوحة القيادة" : "Dashboard"}</TabsTrigger><TabsTrigger value="licenses">{isAr ? "التراخيص" : "Licenses"}</TabsTrigger><TabsTrigger value="expiring">{isAr ? "العناصر منتهية/قاربت الانتهاء" : "Expiring Items"}</TabsTrigger></TabsList>
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? "إجمالي التراخيص" : "Total Licenses"}</p><p className="mt-1 text-2xl font-bold">{licenses.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{isAr ? "سارية" : "Valid"}</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-2xl font-bold text-emerald-700">{validCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{isAr ? "قاربت الانتهاء" : "Expiring Soon"}</p><Clock className="h-4 w-4 text-amber-600" /></div><p className="mt-1 text-2xl font-bold text-amber-700">{expiringCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{isAr ? "منتهية" : "Expired"}</p><AlertTriangle className="h-4 w-4 text-red-600" /></div><p className="mt-1 text-2xl font-bold text-red-700">{expiredCount}</p></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">{isAr ? "السجل الحالي" : "Current Register"}</CardTitle></CardHeader><CardContent>{renderRows(licenses.slice(0, 10))}</CardContent></Card>
        </TabsContent>
        <TabsContent value="licenses" className="space-y-4">
          <Card className="p-4"><div className="mb-4 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث بالترخيص أو الموظف..." : "Search licenses or employees..."} className="pl-9 rtl:pl-3 rtl:pr-9" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="md:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الأنواع" : "All types"}</SelectItem>{LICENSE_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{isAr ? type.ar : type.en}</SelectItem>)}</SelectContent></Select></div>{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{renderRows(filtered)}</Card>
        </TabsContent>
        <TabsContent value="expiring"><Card className="p-4">{renderRows(expiring)}</Card></TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{isAr ? "إضافة ترخيص" : "Add License"}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 md:grid-cols-2">
          <div><Label>{isAr ? "رقم الترخيص" : "License Number"}</Label><Input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} /></div>
          <div><Label>{isAr ? "نوع الترخيص" : "License Type"}</Label><Select value={form.licenseType} onValueChange={value => setForm({ ...form, licenseType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LICENSE_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{isAr ? type.ar : type.en}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{isAr ? "اسم الموظف" : "Employee Name"}</Label><Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} /></div>
          <div><Label>{isAr ? "الرقم الوظيفي" : "Employee ID"}</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} /></div>
          <div><Label>{isAr ? "المسمى الوظيفي" : "Job Title"}</Label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
          <div><Label>{isAr ? "جهة الإصدار" : "Issuing Authority"}</Label><Input value={form.issuingAuthority} onChange={e => setForm({ ...form, issuingAuthority: e.target.value })} /></div>
          <div><Label>{isAr ? "تاريخ الإصدار" : "Issue Date"}</Label><Input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></div>
          <div><Label>{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</Label><Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
          <div><Label>{isAr ? "اسم المرفق" : "Attachment Name"}</Label><Input value={form.attachmentName} onChange={e => setForm({ ...form, attachmentName: e.target.value })} /></div>
          <div><Label>{isAr ? "رابط المرفق" : "Attachment URL"}</Label><Input value={form.attachmentUrl} onChange={e => setForm({ ...form, attachmentUrl: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>{isAr ? "ملاحظات" : "Remarks"}</Label><Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter></DialogContent>
      </Dialog>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={open => !open && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

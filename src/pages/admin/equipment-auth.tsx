"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ShieldCheck, Trash2, RefreshCw, Printer } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

const CATEGORIES = [
  { value: "forklift", en: "Forklift", ar: "رافعة شوكية" },
  { value: "overhead_crane", en: "Overhead Crane", ar: "ونش علوي" },
  { value: "lifter_manlift", en: "Lifter / Manlift", ar: "رافعات الأفراد" },
  { value: "mewp", en: "MEWP", ar: "منصات العمل المتحركة" },
  { value: "rigging_banksman", en: "Rigging & Banksman", ar: "الربط والإشارات" },
  { value: "electrical", en: "Electrical Authorization", ar: "التفويض الكهربائي" },
  { value: "loto", en: "LOTO Authorization", ar: "عزل الطاقة LOTO" },
  { value: "work_at_height", en: "Work at Height", ar: "العمل على ارتفاعات" },
  { value: "confined_space", en: "Confined Space", ar: "الأماكن المغلقة" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

type AuthorizationData = {
  authorizationNumber: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  category: Category;
  equipmentType: string;
  equipmentId: string;
  certificationNumber: string;
  issueDate: string;
  expiryDate: string;
  supervisor: string;
  notes: string;
};

const EMPTY_FORM: AuthorizationData = {
  authorizationNumber: "",
  employeeId: "",
  employeeName: "",
  jobTitle: "",
  category: "forklift",
  equipmentType: "",
  equipmentId: "",
  certificationNumber: "",
  issueDate: "",
  expiryDate: "",
  supervisor: "",
  notes: "",
};

function categoryLabel(value: string, isAr: boolean) {
  const item = CATEGORIES.find(category => category.value === value);
  return item ? (isAr ? item.ar : item.en) : value;
}

export default function AdminEquipmentAuthorizationPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const { items, loading, error, create, remove, refresh } = useGenericRecords<AuthorizationData>("equipment-auth");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<AuthorizationData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<any>(null);

  const records = useMemo(() => items.map(row => ({
    ...row.data,
    id: row.id,
    refNo: row.refNo || row.data?.authorizationNumber || "",
    status: row.status || "active",
    department: row.department || "",
  })), [items]);

  const filtered = useMemo(() => records.filter(record => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [record.refNo, record.employeeName, record.employeeId, record.equipmentId, record.certificationNumber]
      .some(value => String(value || "").toLowerCase().includes(q));
    const matchesCategory = category === "all" || record.category === category;
    return matchesSearch && matchesCategory;
  }), [records, search, category]);

  const openCreate = () => {
    const generated = `AUTH-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    setForm({ ...EMPTY_FORM, authorizationNumber: generated });
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim() || !form.employeeId.trim() || !form.category) {
      toast.error(isAr ? "اسم الموظف والرقم الوظيفي ونوع التفويض مطلوبة" : "Employee name, ID and authorization category are required");
      return;
    }
    setSaving(true);
    try {
      await create({
        refNo: form.authorizationNumber,
        title: form.employeeName,
        status: "active",
        department: "",
        date: form.issueDate || new Date().toISOString().slice(0, 10),
        data: form,
      });
      setIsAddOpen(false);
      toast.success(isAr ? "تم حفظ التفويض في قاعدة البيانات" : "Authorization saved to the database");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "تعذر حفظ التفويض" : "Unable to save authorization"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, refNo: string) => {
    if (!canDelete) return;
    const ok = window.confirm(isAr ? `حذف التفويض ${refNo} نهائيًا؟` : `Permanently delete authorization ${refNo}?`);
    if (!ok) return;
    setDeletingId(id);
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف التفويض نهائيًا" : "Authorization permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (record: any) => {
    setPrintItem({
      id: record.id,
      type: "license" as const,
      refNo: record.refNo,
      title: `${isAr ? "تفويض تشغيل معدات" : "Equipment Operation Authorization"} - ${record.employeeName}`,
      department: record.department || "HSE",
      status: record.status,
      date: record.expiryDate || record.issueDate,
      createdAt: record.issueDate,
      sections: [
        { label: isAr ? "الموظف" : "Employee", value: `${record.employeeName} (${record.employeeId})` },
        { label: isAr ? "نوع التفويض" : "Authorization Type", value: categoryLabel(record.category, isAr) },
        { label: isAr ? "المعدة" : "Equipment", value: [record.equipmentType, record.equipmentId].filter(Boolean).join(" - ") },
        { label: isAr ? "رقم الشهادة" : "Certification No", value: record.certificationNumber || "-" },
        { label: isAr ? "تاريخ الإصدار" : "Issue Date", value: record.issueDate || "-" },
        { label: isAr ? "تاريخ الانتهاء" : "Expiry Date", value: record.expiryDate || "-" },
        { label: isAr ? "المشرف" : "Supervisor", value: record.supervisor || "-" },
        { label: isAr ? "ملاحظات" : "Notes", value: record.notes || "-" },
      ],
    });
  };

  return (
    <div className="space-y-6" data-testid="admin-equipment-auth-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isAr ? "تفويض المعدات" : "Equipment Authorization"}</h1>
            <p className="text-xs text-muted-foreground">{isAr ? "سجل فعلي مرتبط بقاعدة البيانات لجميع أنواع تفويض التشغيل" : "Database-backed register for all equipment authorization categories"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة تفويض" : "Add Authorization"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CATEGORIES.map(item => {
          const count = records.filter(record => record.category === item.value).length;
          return (
            <Card key={item.value} className="cursor-pointer" onClick={() => setCategory(item.value)}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{isAr ? item.ar : item.en}</p>
                <p className="mt-1 text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder={isAr ? "بحث بالموظف أو رقم التفويض أو المعدة..." : "Search employee, authorization or equipment..."} className="pl-9 rtl:pl-3 rtl:pr-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="md:w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "جميع أنواع التفويض" : "All authorization types"}</SelectItem>
              {CATEGORIES.map(item => <SelectItem key={item.value} value={item.value}>{isAr ? item.ar : item.en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "رقم التفويض" : "Authorization No"}</TableHead>
                <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{isAr ? "النوع" : "Category"}</TableHead>
                <TableHead>{isAr ? "المعدة" : "Equipment"}</TableHead>
                <TableHead>{isAr ? "الصلاحية" : "Validity"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد تفويضات مسجلة. لا توجد بيانات تجريبية." : "No authorizations recorded. No demo data is loaded."}</TableCell></TableRow>
              )}
              {filtered.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs font-semibold">{record.refNo}</TableCell>
                  <TableCell><p className="font-medium">{record.employeeName}</p><p className="text-xs text-muted-foreground">{record.employeeId} {record.jobTitle ? `· ${record.jobTitle}` : ""}</p></TableCell>
                  <TableCell><Badge variant="outline">{categoryLabel(record.category, isAr)}</Badge></TableCell>
                  <TableCell className="text-xs">{record.equipmentType || "-"}<br /><span className="text-muted-foreground">{record.equipmentId || ""}</span></TableCell>
                  <TableCell className="text-xs">{record.issueDate || "-"}<br /><span className="text-muted-foreground">{record.expiryDate || "-"}</span></TableCell>
                  <TableCell><Badge className="bg-emerald-500/10 text-emerald-700">{record.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handlePrint(record)} title={isAr ? "طباعة" : "Print"}><Printer className="h-4 w-4" /></Button>
                      {canDelete && (
                        <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={deletingId === record.id} onClick={() => void handleDelete(record.id, record.refNo)} title={isAr ? "حذف" : "Delete"}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{isAr ? "إضافة تفويض معدات" : "Add Equipment Authorization"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div><Label>{isAr ? "رقم التفويض" : "Authorization No"}</Label><Input value={form.authorizationNumber} onChange={e => setForm({ ...form, authorizationNumber: e.target.value })} /></div>
            <div><Label>{isAr ? "نوع التفويض" : "Authorization Category"}</Label><Select value={form.category} onValueChange={value => setForm({ ...form, category: value as Category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(item => <SelectItem key={item.value} value={item.value}>{isAr ? item.ar : item.en}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isAr ? "اسم الموظف" : "Employee Name"}</Label><Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} /></div>
            <div><Label>{isAr ? "الرقم الوظيفي" : "Employee ID"}</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} /></div>
            <div><Label>{isAr ? "المسمى الوظيفي" : "Job Title"}</Label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
            <div><Label>{isAr ? "نوع المعدة" : "Equipment Type"}</Label><Input value={form.equipmentType} onChange={e => setForm({ ...form, equipmentType: e.target.value })} /></div>
            <div><Label>{isAr ? "رقم المعدة" : "Equipment ID"}</Label><Input value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })} /></div>
            <div><Label>{isAr ? "رقم الشهادة" : "Certification No"}</Label><Input value={form.certificationNumber} onChange={e => setForm({ ...form, certificationNumber: e.target.value })} /></div>
            <div><Label>{isAr ? "تاريخ الإصدار" : "Issue Date"}</Label><Input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></div>
            <div><Label>{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</Label><Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
            <div><Label>{isAr ? "المشرف" : "Supervisor"}</Label><Input value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} /></div>
            <div><Label>{isAr ? "ملاحظات" : "Notes"}</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={() => void handleSave()} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={open => !open && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Search, ShieldCheck, Trash2, Pencil, AlertTriangle, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";

type LicenseType = "environmental" | "civil_defense" | "municipal" | "industrial" | "other";
type RegulatoryLicense = {
  id: string;
  license_number: string;
  license_type: LicenseType;
  license_type_name_en: string;
  license_type_name_ar: string;
  facility_name: string;
  facility_code: string | null;
  site_name: string | null;
  site_address: string | null;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  attachment_url: string | null;
  attachment_name: string | null;
  remarks: string | null;
  renewal_notes: string | null;
};

const TYPE_OPTIONS: Array<{ value: LicenseType; en: string; ar: string }> = [
  { value: "environmental", en: "Environmental License", ar: "رخصة البيئة" },
  { value: "civil_defense", en: "Civil Defense License", ar: "رخصة الدفاع المدني" },
  { value: "municipal", en: "Municipal License", ar: "الرخصة البلدية" },
  { value: "industrial", en: "Industrial License", ar: "الرخصة الصناعية" },
  { value: "other", en: "Other Regulatory License", ar: "رخصة تنظيمية أخرى" },
];

const statusForExpiry = (date: string | null) => {
  if (!date) return "PENDING RENEWAL";
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "EXPIRING SOON";
  return "ACTIVE";
};

const itemApi = (id: string) => `/api/facility-regulatory-licenses?id=${encodeURIComponent(id)}`;
const emptyForm: Partial<RegulatoryLicense> = { license_type: "environmental", license_type_name_en: "Environmental License", license_type_name_ar: "رخصة البيئة", license_number: "", facility_name: "", facility_code: "", site_name: "", site_address: "", issuing_authority: "", issue_date: "", expiry_date: "", remarks: "", renewal_notes: "" };

export default function FacilityRegulatoryLicensesPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [items, setItems] = useState<RegulatoryLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RegulatoryLicense | null>(null);
  const [form, setForm] = useState<Partial<RegulatoryLicense>>({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/facility-regulatory-licenses");
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load facility licenses");
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر تحميل تراخيص المنشأة" : "Unable to load facility licenses"));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [item.license_number, item.facility_name, item.site_name, item.issuing_authority].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    const status = statusForExpiry(item.expiry_date);
    return matchesQuery && (typeFilter === "ALL" || item.license_type === typeFilter) && (statusFilter === "ALL" || status === statusFilter);
  }), [items, query, typeFilter, statusFilter]);

  const chooseType = (value: LicenseType) => {
    const type = TYPE_OPTIONS.find((option) => option.value === value) || TYPE_OPTIONS[0];
    setForm((current) => ({ ...current, license_type: type.value, license_type_name_en: type.en, license_type_name_ar: type.ar }));
  };
  const resetForm = () => { setEditing(null); setForm({ ...emptyForm }); };

  const save = async () => {
    try {
      if (!form.license_number || !form.facility_name || !form.issuing_authority) {
        toast.error(isAr ? "أدخل رقم الرخصة واسم المنشأة والجهة المصدرة" : "License number, facility name and issuing authority are required");
        return;
      }
      const payload = { ...form, status: statusForExpiry(form.expiry_date || null) };
      const response = editing ? await apiRequest("PATCH", itemApi(editing.id), payload) : await apiRequest("POST", "/api/facility-regulatory-licenses", payload);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save license");
      toast.success(isAr ? "تم حفظ الرخصة" : "License saved");
      setOpen(false); resetForm(); await load();
    } catch (error: any) { toast.error(error?.message || (isAr ? "تعذر حفظ الرخصة" : "Unable to save license")); }
  };

  const remove = async (id: string) => {
    if (!window.confirm(isAr ? "هل تريد حذف الرخصة؟" : "Delete this license?")) return;
    try {
      const response = await apiRequest("DELETE", itemApi(id));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Delete failed");
      toast.success(isAr ? "تم حذف الرخصة" : "License deleted"); await load();
    } catch (error: any) { toast.error(error?.message || (isAr ? "فشل حذف الرخصة" : "Delete failed")); }
  };

  const stats = { total: items.length, active: items.filter((item) => statusForExpiry(item.expiry_date) === "ACTIVE").length, expiring: items.filter((item) => statusForExpiry(item.expiry_date) === "EXPIRING SOON").length, expired: items.filter((item) => statusForExpiry(item.expiry_date) === "EXPIRED").length };

  return <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />{isAr ? "تراخيص المنشأة والجهات التنظيمية" : "Facility & Regulatory Licenses"}</h1><p className="text-muted-foreground">{isAr ? "رخص البيئة والدفاع المدني والبلدية والصناعة والرخص التنظيمية الأخرى" : "Environmental, civil defense, municipal, industrial and other facility-level regulatory licenses"}</p></div><Button onClick={() => { resetForm(); setOpen(true); }}><Plus className="h-4 w-4 me-2" />{isAr ? "إضافة رخصة منشأة" : "Add Facility License"}</Button></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[[isAr ? "الإجمالي" : "Total", stats.total, FileText],[isAr ? "سارية" : "Active", stats.active, ShieldCheck],[isAr ? "تقترب من الانتهاء" : "Expiring Soon", stats.expiring, AlertTriangle],[isAr ? "منتهية" : "Expired", stats.expired, AlertTriangle]].map(([label, value, Icon]: any) => <Card key={String(label)} className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{label}</div><div className="text-2xl font-bold mt-2">{value}</div></Card>)}</div>
    <Card className="p-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="relative"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="ps-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAr ? "بحث برقم الرخصة أو المنشأة" : "Search by license, facility, site or authority"} /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue placeholder={isAr ? "نوع الرخصة" : "License Type"} /></SelectTrigger><SelectContent><SelectItem value="ALL">{isAr ? "كل الأنواع" : "All Types"}</SelectItem>{TYPE_OPTIONS.map((type) => <SelectItem key={type.value} value={type.value}>{isAr ? type.ar : type.en}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder={isAr ? "الحالة" : "Status"} /></SelectTrigger><SelectContent><SelectItem value="ALL">{isAr ? "كل الحالات" : "All Statuses"}</SelectItem><SelectItem value="ACTIVE">{isAr ? "سارية" : "Active"}</SelectItem><SelectItem value="EXPIRING SOON">{isAr ? "تقترب من الانتهاء" : "Expiring Soon"}</SelectItem><SelectItem value="EXPIRED">{isAr ? "منتهية" : "Expired"}</SelectItem><SelectItem value="PENDING RENEWAL">{isAr ? "قيد التجديد" : "Pending Renewal"}</SelectItem></SelectContent></Select></div></Card>
    <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{[isAr ? "نوع الرخصة" : "License", isAr ? "رقم الرخصة" : "License No.", isAr ? "المنشأة / الموقع" : "Facility / Site", isAr ? "الجهة المصدرة" : "Issuing Authority", isAr ? "الانتهاء" : "Expiry", isAr ? "الحالة" : "Status", isAr ? "إجراءات" : "Actions"].map((head, index) => <th key={head} className={`p-3 ${index === 6 ? "text-end" : "text-start"}`}>{head}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center">{isAr ? "جارٍ التحميل..." : "Loading..."}</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد تراخيص منشأة" : "No facility licenses found"}</td></tr> : filtered.map((item) => { const status = statusForExpiry(item.expiry_date); return <tr key={item.id} className="border-t"><td className="p-3 font-medium">{isAr ? item.license_type_name_ar : item.license_type_name_en}</td><td className="p-3 font-mono">{item.license_number}</td><td className="p-3">{item.facility_name}{item.site_name ? <div className="text-xs text-muted-foreground">{item.site_name}</div> : null}</td><td className="p-3">{item.issuing_authority}</td><td className="p-3">{item.expiry_date || "—"}</td><td className="p-3"><Badge variant={status === "ACTIVE" ? "default" : status === "EXPIRED" ? "destructive" : "secondary"}>{status}</Badge></td><td className="p-3 text-end"><div className="flex justify-end gap-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(item); setForm(item); setOpen(true); }} title={isAr ? "تعديل" : "Edit"}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(item.id)} title={isAr ? "حذف" : "Delete"}><Trash2 className="h-4 w-4" /></Button></div></td></tr>; })}</tbody></table></div></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{editing ? (isAr ? "تعديل رخصة منشأة" : "Edit Facility License") : (isAr ? "إضافة رخصة منشأة" : "Add Facility License")}</DialogTitle></DialogHeader><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>{isAr ? "نوع الرخصة" : "License Type"}</Label><Select value={form.license_type || "environmental"} onValueChange={(value) => chooseType(value as LicenseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TYPE_OPTIONS.map((type) => <SelectItem key={type.value} value={type.value}>{isAr ? type.ar : type.en}</SelectItem>)}</SelectContent></Select></div><div><Label>{isAr ? "رقم الرخصة" : "License Number"}</Label><Input className="mt-1" value={form.license_number || ""} onChange={(event) => setForm((current) => ({ ...current, license_number: event.target.value }))} /></div><div><Label>{isAr ? "اسم المنشأة" : "Facility Name"}</Label><Input className="mt-1" value={form.facility_name || ""} onChange={(event) => setForm((current) => ({ ...current, facility_name: event.target.value }))} /></div><div><Label>{isAr ? "رمز المنشأة" : "Facility Code"}</Label><Input className="mt-1" value={form.facility_code || ""} onChange={(event) => setForm((current) => ({ ...current, facility_code: event.target.value }))} /></div><div><Label>{isAr ? "اسم الموقع" : "Site Name"}</Label><Input className="mt-1" value={form.site_name || ""} onChange={(event) => setForm((current) => ({ ...current, site_name: event.target.value }))} /></div><div><Label>{isAr ? "العنوان" : "Address"}</Label><Input className="mt-1" value={form.site_address || ""} onChange={(event) => setForm((current) => ({ ...current, site_address: event.target.value }))} /></div><div><Label>{isAr ? "الجهة المصدرة" : "Issuing Authority"}</Label><Input className="mt-1" value={form.issuing_authority || ""} onChange={(event) => setForm((current) => ({ ...current, issuing_authority: event.target.value }))} /></div><div><Label>{isAr ? "تاريخ الإصدار" : "Issue Date"}</Label><Input className="mt-1" type="date" value={form.issue_date || ""} onChange={(event) => setForm((current) => ({ ...current, issue_date: event.target.value }))} /></div><div><Label>{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</Label><Input className="mt-1" type="date" value={form.expiry_date || ""} onChange={(event) => setForm((current) => ({ ...current, expiry_date: event.target.value }))} /></div><div className="md:col-span-2"><Label>{isAr ? "ملاحظات" : "Remarks"}</Label><Textarea className="mt-1" value={form.remarks || ""} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={save}>{isAr ? "حفظ" : "Save"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

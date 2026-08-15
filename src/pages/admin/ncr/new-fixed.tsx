import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useData } from "@/lib/data-context";
import { ArrowLeft, Save, Send, Eye, RefreshCw } from "lucide-react";

type Department = { id: string; name: string; code?: string | null };

type FormState = {
  date: string;
  department: string;
  location: string;
  description: string;
  severity: string;
  immediateAction: string;
  rootCause: string;
  correctiveAction: string;
  dueDate: string;
  verificationNotes: string;
  status: string;
};

const emptyForm = (): FormState => ({
  date: new Date().toISOString().slice(0, 10),
  department: "",
  location: "",
  description: "",
  severity: "low",
  immediateAction: "",
  rootCause: "",
  correctiveAction: "",
  dueDate: "",
  verificationNotes: "",
  status: "draft",
});

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{value || "—"}</div>
    </div>
  );
}

function A4Preview({ form, isAr }: { form: FormState; isAr: boolean }) {
  return (
    <div className="h-full overflow-auto bg-slate-200 p-3">
      <div className="relative mx-auto min-h-[640px] w-[365px] overflow-hidden rounded bg-white shadow-xl" dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"}>
        <div className="min-h-[640px] p-5 text-slate-900">
          <div className="mb-4 rounded-lg bg-slate-900 p-4 text-white">
            <div className="text-lg font-bold">NON-CONFORMANCE REPORT</div>
            <div className="mt-1 text-[11px] text-slate-300">تقرير عدم المطابقة — HSE-F-03</div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <PreviewField label={isAr ? "التاريخ" : "Date"} value={form.date} />
            <PreviewField label={isAr ? "القسم" : "Department"} value={form.department} />
            <PreviewField label={isAr ? "الموقع" : "Location"} value={form.location} />
            <PreviewField label={isAr ? "الحدة" : "Severity"} value={form.severity} />
          </div>

          <section className="mb-3 overflow-hidden rounded-lg border border-red-200">
            <div className="bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{isAr ? "وصف عدم المطابقة" : "Description of Non-Conformance"}</div>
            <div className="min-h-[82px] whitespace-pre-wrap p-3 text-sm">{form.description || "—"}</div>
          </section>

          <section className="mb-3 overflow-hidden rounded-lg border border-amber-200">
            <div className="bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">{isAr ? "الإجراء الفوري" : "Immediate Action"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.immediateAction || "—"}</div>
          </section>

          <section className="mb-3 overflow-hidden rounded-lg border border-violet-200">
            <div className="bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">{isAr ? "السبب الجذري" : "Root Cause"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.rootCause || "—"}</div>
          </section>

          <section className="mb-3 overflow-hidden rounded-lg border border-sky-200">
            <div className="bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">{isAr ? "الإجراء التصحيحي" : "Corrective Action"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.correctiveAction || "—"}</div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <PreviewField label={isAr ? "تاريخ الاستحقاق" : "Due Date"} value={form.dueDate} />
            <PreviewField label={isAr ? "الحالة" : "Status"} value={form.status} />
          </div>

          <section className="mt-3 overflow-hidden rounded-lg border border-emerald-200">
            <div className="bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</div>
            <div className="min-h-[60px] whitespace-pre-wrap p-3 text-sm">{form.verificationNotes || "—"}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function NewNCRFixed() {
  const { settings, currentUser, addNCR } = useData();
  const [, setLocation] = useLocation();
  const isAr = settings.language === "ar";
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAndSending, setSavingAndSending] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await apiRequest("GET", "/api/ncr?resource=departments");
      const rows = await response.json();
      setDepartments(Array.isArray(rows) ? rows : []);
      if (!Array.isArray(rows)) throw new Error("Invalid departments response");
    } catch (error: any) {
      setDepartments([]);
      toast.error(error?.message || (isAr ? "تعذر تحميل الأقسام" : "Unable to load departments"));
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const options = useMemo(() => departments.filter((d) => d?.id && d?.name), [departments]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveNcr = async () => {
    if (!form.department || !form.description.trim()) {
      toast.error(isAr ? "القسم ووصف عدم المطابقة مطلوبان" : "Department and description are required");
      return null;
    }

    const payload = {
      ...form,
      department: form.department.trim(),
      description: form.description.trim(),
      createdBy: currentUser?.id || "",
    };

    const response = await apiRequest("POST", "/api/ncr", payload);
    const created = await response.json();
    if (!created?.id) throw new Error(created?.error || (isAr ? "تعذر إنشاء التقرير" : "Unable to create NCR"));
    return created;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const created = await saveNcr();
      if (!created) return;
      toast.success(isAr ? "تم حفظ تقرير NCR بنجاح" : "NCR saved successfully");
      setLocation(`/admin/ncr/${created.id}`);
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "فشل حفظ التقرير" : "Failed to save NCR"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    setSavingAndSending(true);
    try {
      const created = await saveNcr();
      if (!created) return;

      const subject = encodeURIComponent(`${isAr ? "تقرير عدم مطابقة NCR" : "NCR Report"} ${created.refNo || ""}`.trim());
      const body = encodeURIComponent(
        [
          `${isAr ? "رقم التقرير" : "Reference"}: ${created.refNo || ""}`,
          `${isAr ? "القسم" : "Department"}: ${form.department}`,
          `${isAr ? "الموقع" : "Location"}: ${form.location || "—"}`,
          `${isAr ? "الخطورة" : "Severity"}: ${form.severity}`,
          "",
          `${isAr ? "الوصف" : "Description"}:`,
          form.description,
          "",
          `${isAr ? "الإجراء الفوري" : "Immediate Action"}:`,
          form.immediateAction || "—",
          "",
          `${isAr ? "الإجراء التصحيحي" : "Corrective Action"}:`,
          form.correctiveAction || "—",
        ].join("\n"),
      );
      const target = currentUser?.email || "";
      window.location.href = `mailto:${target}?subject=${subject}&body=${body}`;
      toast.success(isAr ? "تم حفظ التقرير وفتح رسالة الإرسال" : "NCR saved and the email draft was opened");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "فشل حفظ وإرسال التقرير" : "Failed to save and send NCR"));
    } finally {
      setSavingAndSending(false);
    }
  };

  const addDepartment = async () => {
    const name = window.prompt(isAr ? "اسم القسم" : "Department name");
    if (!name?.trim()) return;
    const code = window.prompt(isAr ? "رمز القسم (اختياري)" : "Department code (optional)") || "";
    try {
      const response = await apiRequest("POST", "/api/ncr?resource=departments", { name: name.trim(), ...(code.trim() ? { code: code.trim() } : {}) });
      const created = await response.json();
      if (!response.ok || !created?.id) throw new Error(created?.error || "Department creation failed");
      await loadDepartments();
      setField("department", created.name || name.trim());
      toast.success(isAr ? "تمت إضافة القسم" : "Department added");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر إضافة القسم" : "Unable to add department"));
    }
  };

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} className="mx-auto w-full max-w-[1400px] space-y-5 pb-12">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ncr")}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{isAr ? "إنشاء تقرير NCR جديد" : "Create New NCR Report"}</h1>
            <p className="text-sm text-muted-foreground">HSE-F-03 · {isAr ? "تقرير عدم المطابقة" : "Non-Conformance Report"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => setShowPreview((v) => !v)}>
            <Eye className="me-2 h-4 w-4" />{showPreview ? (isAr ? "إخفاء المعاينة" : "Hide Preview") : (isAr ? "إظهار المعاينة" : "Show Preview")}
          </Button>
          <Button type="button" variant="outline" onClick={loadDepartments} disabled={loadingDepartments}>
            <RefreshCw className={`me-2 h-4 w-4 ${loadingDepartments ? "animate-spin" : ""}`} />{isAr ? "تحديث الأقسام" : "Refresh Departments"}
          </Button>
        </div>
      </div>

      <div className={showPreview ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]" : "block"}>
        <Card className="border-l-4 border-l-blue-500" dir={isAr ? "rtl" : "ltr"}>
          <CardHeader><CardTitle>{isAr ? "بيانات عدم المطابقة" : "Non-Conformance Details"}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>{isAr ? "القسم" : "Department"} *</Label>
                <Select value={form.department} onValueChange={(v) => setField("department", v)}>
                  <SelectTrigger><SelectValue placeholder={loadingDepartments ? (isAr ? "جاري تحميل الأقسام..." : "Loading departments...") : (isAr ? "اختر القسم" : "Select department")} /></SelectTrigger>
                  <SelectContent>
                    {options.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}{d.code ? ` (${d.code})` : ""}</SelectItem>)}
                    {!loadingDepartments && options.length === 0 && <div className="p-3 text-sm text-muted-foreground">{isAr ? "لا توجد أقسام بعد" : "No departments found"}</div>}
                  </SelectContent>
                </Select>
                <Button type="button" variant="link" className="h-auto p-0" onClick={addDepartment}>+ {isAr ? "إضافة قسم" : "Add Department"}</Button>
              </div>
              <div className="space-y-2"><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Site B - Zone 1" /></div>
              <div className="space-y-2"><Label>{isAr ? "الحدة" : "Severity"}</Label><Select value={form.severity} onValueChange={(v) => setField("severity", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low — منخفض</SelectItem><SelectItem value="medium">Medium — متوسط</SelectItem><SelectItem value="high">High — مرتفع</SelectItem><SelectItem value="critical">Critical — حرج</SelectItem></SelectContent></Select></div>
            </div>

            <div className="space-y-2"><Label>{isAr ? "وصف عدم المطابقة" : "Description of Non-Conformance"} *</Label><Textarea rows={6} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={isAr ? "اكتب وصفًا تفصيليًا لعدم المطابقة..." : "Describe the non-conformance in detail..."} /></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>{isAr ? "الإجراء الفوري" : "Immediate Action"}</Label><Textarea rows={4} value={form.immediateAction} onChange={(e) => setField("immediateAction", e.target.value)} /></div>
              <div className="space-y-2"><Label>{isAr ? "السبب الجذري" : "Root Cause"}</Label><Textarea rows={4} value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} /></div>
              <div className="space-y-2"><Label>{isAr ? "الإجراء التصحيحي" : "Corrective Action"}</Label><Textarea rows={4} value={form.correctiveAction} onChange={(e) => setField("correctiveAction", e.target.value)} /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} /></div>
              <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={form.status} onValueChange={(v) => setField("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem><SelectItem value="submitted">{isAr ? "مقدم" : "Submitted"}</SelectItem><SelectItem value="assigned">{isAr ? "معين" : "Assigned"}</SelectItem><SelectItem value="in_progress">{isAr ? "قيد التنفيذ" : "In Progress"}</SelectItem><SelectItem value="closed">{isAr ? "مغلق" : "Closed"}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>{isAr ? "المرسل إليه" : "Recipient"}</Label><Input value={currentUser?.email || ""} readOnly /></div>
            </div>
            <div className="space-y-2"><Label>{isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</Label><Textarea rows={4} value={form.verificationNotes} onChange={(e) => setField("verificationNotes", e.target.value)} /></div>

            <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/ncr")}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button type="button" onClick={handleSave} disabled={saving || savingAndSending}>
                <Save className="me-2 h-4 w-4" />{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التقرير" : "Save Report")}
              </Button>
              <Button type="button" variant="secondary" onClick={handleSaveAndSend} disabled={saving || savingAndSending}>
                <Send className="me-2 h-4 w-4" />{savingAndSending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ وإرسال" : "Save & Send")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPreview && <div className="sticky top-4 h-[680px] min-h-0 overflow-hidden rounded-lg border bg-slate-900 shadow-lg"><A4Preview form={form} isAr={isAr} /></div>}
      </div>
    </main>
  );
}

import React, { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function NewNCR() {
  const data = useData();
  const departments = data?.departments ?? [];
  const addNCR = data?.addNCR;
  const isAr = data?.settings?.language === "ar";
  const [preview, setPreview] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newDepartmentCode, setNewDepartmentCode] = useState("");
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), department: "", location: "", description: "", severity: "medium", immediateAction: "", rootCause: "", correctiveAction: "" });
  const options = useMemo(() => (departments || []).filter((d: any) => d?.id && d?.name), [departments]);
  const setField = (key: string, value: string) => setForm(v => ({ ...v, [key]: value }));
  const selectedDepartment = options.find((d: any) => d.name === form.department);
  const go = (path: string) => { window.location.assign(path); };

  const createDepartment = async () => {
    const name = newDepartment.trim();
    if (!name) return;
    setSavingDepartment(true);
    try {
      const requestedCode = newDepartmentCode.trim();
      const response = await apiRequest("POST", "/api/departments", { name, ...(requestedCode ? { code: requestedCode } : {}) });
      if (!response.ok) {
        let message = "Unable to add department";
        try { const body = await response.json(); message = body?.error || body?.message || message; } catch {}
        throw new Error(message);
      }
      const created = await response.json();
      setField("department", created.name || name);
      setNewDepartment("");
      setNewDepartmentCode("");
      setShowAddDepartment(false);
      toast.success(isAr ? "تمت إضافة القسم بنجاح" : "Department added successfully");
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "تعذر إضافة القسم" : "Unable to add department"));
    } finally { setSavingDepartment(false); }
  };

  const submit = async () => {
    if (!form.department || !form.description.trim()) {
      toast.error(isAr ? "القسم ووصف عدم المطابقة مطلوبان" : "Department and description are required");
      return;
    }
    if (!addNCR) return;
    setSaving(true);
    try {
      const created = await addNCR({ ...form, status: "draft" });
      toast.success(isAr ? "تم إنشاء NCR بنجاح" : "NCR created successfully");
      if (created?.id) go(`/admin/ncr/${created.id}`); else go("/admin/ncr");
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "تعذر إنشاء NCR" : "Unable to create NCR"));
    } finally { setSaving(false); }
  };

  const Field = ({ label, children }: any) => <div className="space-y-2"><Label>{label}</Label>{children}</div>;

  return <main dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} className="mx-auto w-full max-w-5xl space-y-6 pb-12">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">{isAr ? "إنشاء NCR جديد" : "Create New NCR"}</h1><p className="text-sm text-muted-foreground">{isAr ? "سجل عدم المطابقة وحفظه في قاعدة البيانات الفعلية" : "Record a non-conformity and save it to the real database"}</p></div>
      <Button type="button" variant="outline" onClick={() => setPreview(v => !v)}>{preview ? (isAr ? "تعديل" : "Edit") : (isAr ? "معاينة" : "Preview")}</Button>
    </div>

    {preview ? <Card dir={isAr ? "rtl" : "ltr"} className="overflow-hidden text-start">
      <CardHeader><CardTitle>{isAr ? "معاينة NCR" : "NCR Preview"}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><div className="text-xs text-muted-foreground">{isAr ? "التاريخ" : "Date"}</div><div className="font-medium">{form.date || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{isAr ? "القسم" : "Department"}</div><div className="font-medium">{selectedDepartment?.name || form.department || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{isAr ? "الموقع" : "Location"}</div><div>{form.location || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{isAr ? "الخطورة" : "Severity"}</div><div className="font-medium capitalize">{form.severity}</div></div>
        </div>
        <div><div className="mb-1 text-xs text-muted-foreground">{isAr ? "الوصف" : "Description"}</div><div className="whitespace-pre-wrap rounded-md border p-4">{form.description || "—"}</div></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><div className="text-xs text-muted-foreground">{isAr ? "الإجراء الفوري" : "Immediate Action"}</div><div className="whitespace-pre-wrap">{form.immediateAction || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{isAr ? "السبب الجذري" : "Root Cause"}</div><div className="whitespace-pre-wrap">{form.rootCause || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{isAr ? "الإجراء التصحيحي" : "Corrective Action"}</div><div className="whitespace-pre-wrap">{form.correctiveAction || "—"}</div></div>
        </div>
      </CardContent>
    </Card> : <Card>
      <CardHeader><CardTitle>{isAr ? "بيانات عدم المطابقة" : "Non-Conformity Details"}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isAr ? "التاريخ" : "Date"}><Input type="date" value={form.date} onChange={e => setField("date", e.target.value)} /></Field>
          <div className="space-y-2">
            <Label>{isAr ? "القسم" : "Department"} <span className="text-destructive">*</span></Label>
            <Select value={form.department} onValueChange={v => setField("department", v)}>
              <SelectTrigger><SelectValue placeholder={isAr ? "اختر القسم" : "Select Department"} /></SelectTrigger>
              <SelectContent>{options.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}{d.code ? ` (${d.code})` : ""}</SelectItem>)}</SelectContent>
            </Select>
            {options.length === 0 && <p className="text-sm text-muted-foreground">{isAr ? "لا توجد أقسام. أضف قسمًا حقيقيًا أدناه." : "No departments found. Add a real department below."}</p>}
            <Button type="button" variant="link" className="h-auto px-0" onClick={() => setShowAddDepartment(v => !v)}>+ {isAr ? "إضافة قسم جديد" : "Add New Department"}</Button>
            {showAddDepartment && <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_180px_auto]">
              <Input value={newDepartment} onChange={e => setNewDepartment(e.target.value)} placeholder={isAr ? "اسم القسم" : "Department name"} />
              <Input value={newDepartmentCode} onChange={e => setNewDepartmentCode(e.target.value)} placeholder={isAr ? "الرمز (اختياري)" : "Code (optional)"} />
              <Button type="button" disabled={savingDepartment || !newDepartment.trim()} onClick={createDepartment}>{savingDepartment ? "..." : (isAr ? "إضافة" : "Add")}</Button>
            </div>}
          </div>
          <Field label={isAr ? "الموقع" : "Location"}><Input value={form.location} onChange={e => setField("location", e.target.value)} /></Field>
          <Field label={isAr ? "مستوى الخطورة" : "Severity"}><Select value={form.severity} onValueChange={v => setField("severity", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low / منخفض</SelectItem><SelectItem value="medium">Medium / متوسط</SelectItem><SelectItem value="high">High / عالي</SelectItem><SelectItem value="critical">Critical / حرج</SelectItem></SelectContent></Select></Field>
        </div>
        <Field label={isAr ? "وصف عدم المطابقة" : "Non-Conformity Description"}><Textarea rows={5} value={form.description} onChange={e => setField("description", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={isAr ? "الإجراء الفوري" : "Immediate Action"}><Textarea rows={4} value={form.immediateAction} onChange={e => setField("immediateAction", e.target.value)} /></Field>
          <Field label={isAr ? "السبب الجذري" : "Root Cause"}><Textarea rows={4} value={form.rootCause} onChange={e => setField("rootCause", e.target.value)} /></Field>
          <Field label={isAr ? "الإجراء التصحيحي" : "Corrective Action"}><Textarea rows={4} value={form.correctiveAction} onChange={e => setField("correctiveAction", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => go("/admin/ncr")}>{isAr ? "إلغاء" : "Cancel"}</Button><Button type="button" onClick={submit} disabled={saving}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "إنشاء NCR" : "Create NCR")}</Button></div>
      </CardContent>
    </Card>}
  </main>;
}

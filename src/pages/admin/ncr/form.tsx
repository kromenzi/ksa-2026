import { useState, useEffect, useCallback, useRef } from "react";
import { useData } from "@/lib/data-context";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Printer, Upload, Plus, Trash2, FileText, Send, Loader2, Eye, Image as ImageIcon, X, ShieldAlert } from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";
import FilePreviewDialog, { type FilePreviewItem } from "@/components/file-preview-dialog";
import { useToast } from "@/hooks/use-toast";

interface NCRActionRow {
  no: number;
  action: string;
  responsible: string;
  dueDate: string;
  effectiveness: string;
  signature: string;
}

const EMPTY_ACTION = (): NCRActionRow => ({ no: 1, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" });

function A4Preview({ formData, isAr }: { formData: any; isAr: boolean }) {
  const severityColors: Record<string, { text: string; bg: string; border: string }> = {
    low: { text: "#15803d", bg: "#dcfce7", border: "#86efac" },
    medium: { text: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
    high: { text: "#c2410c", bg: "#ffedd5", border: "#fdba74" },
    critical: { text: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
  };
  const sev = severityColors[formData.severity] || severityColors.low;
  const sections = [
    { en: "Description of Non-Conformance", ar: "وصف عدم المطابقة", value: formData.description, accent: "#dc2626", bg: "#fef2f2" },
    { en: "Immediate Action Taken", ar: "الإجراء الفوري", value: formData.immediateAction, accent: "#d97706", bg: "#fffbeb" },
    { en: "Root Cause Analysis", ar: "السبب الجذري", value: formData.rootCause, accent: "#7c3aed", bg: "#f5f3ff" },
    { en: "Corrective Action Summary", ar: "الإجراء التصحيحي", value: formData.correctiveAction, accent: "#0369a1", bg: "#eff6ff" },
  ];
  const rows: NCRActionRow[] = formData.correctiveActions || [];
  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box", padding: "8mm", background: "#fff", color: "#111827", fontFamily: "Arial, sans-serif", fontSize: "10px", lineHeight: 1.45 }}>
      <div style={{ background: "linear-gradient(135deg,#0f4c81,#1a6fa3)", color: "#fff", padding: "5mm 6mm", borderRadius: "3mm", marginBottom: "4mm", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6mm" }}>
        <div style={{ textAlign: isAr ? "right" : "left" }}>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>NON-CONFORMANCE REPORT</div>
          <div style={{ fontSize: "10px", opacity: 0.85, marginTop: 3 }}>تقرير عدم المطابقة — Corrective / Preventive Action Request</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, background: "rgba(255,255,255,.18)", padding: "2px 10px", borderRadius: 4 }}>{formData.refNo || "NCR-______"}</div>
          <div style={{ fontSize: "9px", opacity: 0.75, marginTop: 3 }}>HSE-F-03 Rev.01</div>
        </div>
      </div>

      <div style={{ border: "1px solid #dbe2ea", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#f8fafc", borderBottom: "2px solid #0f4c81", padding: "2mm 3mm", fontWeight: 700, color: "#0f4c81" }}>General Information / المعلومات العامة</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {[
            ["Date / التاريخ", formData.date || "___"],
            ["Department / القسم", formData.department || "___"],
            ["Location / الموقع", formData.location || "___"],
            ["Severity / الحدة", formData.severity || "___"],
            ["Status / الحالة", formData.status || "___"],
            ["Due Date / تاريخ الاستحقاق", formData.dueDate || "___"],
          ].map(([label, value], i) => (
            <div key={i} style={{ padding: "2.5mm 3mm", borderBottom: i < 3 ? "1px solid #e2e8f0" : "none", borderInlineEnd: (i % 3) !== 2 ? "1px solid #e2e8f0" : "none" }}>
              <div style={{ color: "#64748b", fontSize: "8px", marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {sections.map((sec) => (
        <div key={sec.en} style={{ border: `1px solid ${sec.accent}40`, borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
          <div style={{ background: sec.bg, borderBottom: `2px solid ${sec.accent}50`, padding: "2mm 3mm", display: "flex", alignItems: "center", gap: 5, flexDirection: isAr ? "row-reverse" : "row" }}>
            <div style={{ width: 3, height: 13, background: sec.accent, borderRadius: 2 }} />
            <span style={{ fontWeight: 700, color: sec.accent }}>{isAr ? sec.ar : sec.en}</span>
            <span style={{ color: "#64748b", fontSize: "8px" }}>/ {isAr ? sec.en : sec.ar}</span>
          </div>
          <div style={{ padding: "3mm", minHeight: "14mm", whiteSpace: "pre-wrap", textAlign: isAr ? "right" : "left" }}>{sec.value || "—"}</div>
        </div>
      ))}

      <div style={{ border: "1px solid #cbd5e1", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#0f4c81", color: "#fff", padding: "2mm 3mm", fontWeight: 700 }}>Corrective Actions Table / جدول الإجراءات التصحيحية</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5px" }}>
          <thead><tr style={{ background: "#f1f5f9" }}>{["No./الرقم","Action / الإجراء","Responsible / المسؤول","Due Date / التاريخ","Effectiveness","Signature / التوقيع"].map(h => <th key={h} style={{ border: "1px solid #cbd5e1", padding: "2mm", textAlign: "center" }}>{h}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.map((r) => <tr key={r.no}><td style={{ border: "1px solid #e2e8f0", padding: "2mm", textAlign: "center" }}>{r.no}</td><td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{r.action || "—"}</td><td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{r.responsible || "—"}</td><td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{r.dueDate || "—"}</td><td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{r.effectiveness || "—"}</td><td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{r.signature || "—"}</td></tr>) : <tr><td colSpan={6} style={{ border: "1px solid #e2e8f0", padding: "4mm", textAlign: "center", color: "#94a3b8" }}>—</td></tr>}</tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #22c55e50", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#f0fdf4", borderBottom: "2px solid #22c55e50", padding: "2mm 3mm", fontWeight: 700, color: "#15803d" }}>{isAr ? "ملاحظات التحقق والإغلاق / Verification & Closure Notes" : "Verification & Closure Notes / ملاحظات التحقق والإغلاق"}</div>
        <div style={{ padding: "3mm", minHeight: "14mm", whiteSpace: "pre-wrap", textAlign: isAr ? "right" : "left" }}>{formData.verificationNotes || "—"}</div>
      </div>

      <div style={{ borderTop: "2px solid #0f4c81", paddingTop: "2mm", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#64748b" }}>
        <span style={{ color: "#0f4c81", fontWeight: 700 }}>HSE-F-03 Rev.01</span>
        <span>ABDULKAREM SAFETY BOARD — نظام إدارة السلامة</span>
        <span>{formData.date || ""}</span>
      </div>
    </div>
  );
}

export default function AdminNCRForm() {
  const [, params] = useRoute("/admin/ncr/:id");
  const isNew = params?.id === "new";
  const [, setLocation] = useLocation();
  const { ncrs, users, addNCR, updateNCR, sendNCREmail, currentUser, settings, departments: contextDepartments, hasPermission } = useData();
  const { toast } = useToast();
  const [showShare, setShowShare] = useState(false);
  const [shareNcrMeta, setShareNcrMeta] = useState<{ id?: string; refNo?: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const [apiDepartments, setApiDepartments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const isAr = settings.language === "ar";
  const canSendEmail = hasPermission("ncr", "send_email");
  const departments = (contextDepartments?.length ? contextDepartments : apiDepartments).filter((d: any) => d?.id && d?.name);

  useEffect(() => {
    let active = true;
    if (!contextDepartments?.length) {
      fetch("/api/departments", { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          if (active && Array.isArray(data)) setApiDepartments(data);
        })
        .catch(() => { /* DataContext remains the primary source */ });
    }
    return () => { active = false; };
  }, [contextDepartments?.length]);

  const [mode, setMode] = useState<"manual" | "upload" | "review">("manual");
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<any>({
    department: "", location: "", description: "", severity: "low", status: "draft",
    date: new Date().toISOString().split("T")[0], immediateAction: "", rootCause: "", correctiveAction: "",
    correctiveActions: [EMPTY_ACTION(), { ...EMPTY_ACTION(), no: 2 }], dueDate: "", verificationNotes: "",
    image1: null, image2: null, image3: null, image4: null, responsiblePersonId: "", sourceFile: null, sourceMetadata: null,
  });

  useEffect(() => {
    if (!isNew && params?.id) {
      const ncr = ncrs.find((n) => n.id === params.id);
      if (ncr) setFormData((prev: any) => ({ ...prev, ...ncr, correctiveActions: ncr.correctiveActions?.length ? ncr.correctiveActions : prev.correctiveActions }));
    }
  }, [isNew, params?.id, ncrs]);

  const updateField = useCallback((field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value })), []);
  const updateActionRow = useCallback((index: number, field: string, value: string) => setFormData((prev: any) => {
    const rows = [...(prev.correctiveActions || [])]; rows[index] = { ...rows[index], [field]: value }; return { ...prev, correctiveActions: rows };
  }), []);
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => updateField(`image${slot}`, reader.result); reader.readAsDataURL(file);
  }, [updateField]);
  const clearImage = useCallback((slot: number) => updateField(`image${slot}`, null), [updateField]);
  const addActionRow = useCallback(() => setFormData((prev: any) => ({ ...prev, correctiveActions: [...(prev.correctiveActions || []), { ...EMPTY_ACTION(), no: (prev.correctiveActions || []).length + 1 }] })), []);
  const removeActionRow = useCallback((index: number) => setFormData((prev: any) => ({ ...prev, correctiveActions: (prev.correctiveActions || []).filter((_: any, i: number) => i !== index).map((r: any, i: number) => ({ ...r, no: i + 1 })) })), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || sending) return;
    if (!formData.department || !formData.description?.trim()) {
      toast({ title: isAr ? "البيانات المطلوبة ناقصة" : "Required fields missing", description: isAr ? "القسم ووصف عدم المطابقة مطلوبان." : "Department and Description are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, createdBy: currentUser?.id || "unknown" };
      if (isNew) {
        const created = await addNCR(payload);
        if (!created?.id) throw new Error(isAr ? "لم يتم إنشاء التقرير" : "NCR was not created");
        setShareNcrMeta({ id: created.id, refNo: created.refNo });
        toast({ title: isAr ? "تم حفظ التقرير" : "NCR saved", description: created.refNo || "" });
      } else {
        await updateNCR(params!.id, payload);
        setShareNcrMeta({ id: params!.id, refNo: formData.refNo });
        toast({ title: isAr ? "تم حفظ التعديلات" : "NCR updated" });
      }
      setLocation("/admin/ncr");
    } catch (error: any) {
      toast({ title: isAr ? "فشل حفظ التقرير" : "Save failed", description: error?.message || String(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveAndSend = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (saving || sending) return;
    if (!formData.department || !formData.description?.trim()) {
      toast({ title: isAr ? "البيانات المطلوبة ناقصة" : "Required fields missing", description: isAr ? "القسم ووصف عدم المطابقة مطلوبان." : "Department and Description are required.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      let id = formData.id || params?.id;
      let refNo = formData.refNo;
      if (isNew) {
        const created = await addNCR({ ...formData, status: "submitted", createdBy: currentUser?.id || "unknown" });
        id = created?.id; refNo = created?.refNo;
        if (!id) throw new Error(isAr ? "لم يتم إنشاء التقرير" : "NCR was not created");
        setFormData((prev: any) => ({ ...prev, id, refNo, status: "submitted" }));
      } else {
        await updateNCR(params!.id, { ...formData, status: "submitted" });
      }
      setShareNcrMeta({ id, refNo });
      await sendNCREmail(id);
      toast({ title: isAr ? "تم الحفظ والإرسال" : "Saved and sent", description: refNo || "" });
      setShowShare(true);
    } catch (error: any) {
      toast({ title: isAr ? "فشل الحفظ أو الإرسال" : "Save & Send failed", description: error?.message || String(error), variant: "destructive" });
    } finally { setSending(false); }
  };

  const formatActionsForSections = () => (formData.correctiveActions || []).map((r: NCRActionRow) => `${r.no}. ${r.action || "-"} | ${r.responsible || "-"} | ${r.dueDate || "-"} | ${r.effectiveness || "-"}`).join("\n") || "N/A";
  const imageSlots = [1,2,3,4];

  const preview = (
    <div className="overflow-auto rounded-lg border bg-gray-50 p-2" style={{ height: "calc(100vh - 150px)", minHeight: 520 }}>
      <div style={{ width: "210mm", minHeight: "297mm", transform: "scale(.48)", transformOrigin: isAr ? "top right" : "top left", marginInlineStart: isAr ? "auto" : 0, marginInlineEnd: isAr ? 0 : "auto" }}>
        <A4Preview formData={formData} isAr={isAr} />
      </div>
    </div>
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ncr")}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></Button>
          <div><h2 className="text-xl sm:text-3xl font-bold tracking-tight">{isNew ? (isAr ? "إنشاء تقرير جديد" : "Create New NCR") : (isAr ? "تعديل التقرير" : "Edit NCR")}</h2><p className="text-sm text-muted-foreground">{isNew ? "HSE-F-03" : `Ref: ${formData.refNo || "New"}`}</p></div>
        </div>
        <div className="ms-auto flex gap-2 self-end sm:self-auto">
          <Button variant="outline" onClick={() => setShowMobilePreview(true)} className="lg:hidden"><Eye className="h-4 w-4 me-2" />{isAr ? "معاينة" : "Preview"}</Button>
          {!isNew && <Button variant="outline" onClick={() => setLocation("/admin/escalations?source=" + encodeURIComponent(formData.refNo || params?.id || ""))}><ShieldAlert className="h-4 w-4 me-2 text-rose-500" />{isAr ? "تصعيد للإدارة" : "Escalate"}</Button>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-6 w-full">
          <Card><CardHeader><CardTitle>{isAr ? "المعلومات العامة" : "General Information"}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={formData.date} onChange={e => updateField("date", e.target.value)} /></div>
            <div className="space-y-2"><Label>{isAr ? "القسم" : "Department"}<span className="text-destructive"> *</span></Label><Select value={formData.department} onValueChange={v => updateField("department", v)}><SelectTrigger><SelectValue placeholder={isAr ? "اختر القسم" : "Select Department"} /></SelectTrigger><SelectContent>{departments.length ? departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}{d.code ? ` (${d.code})` : ""}</SelectItem>) : <SelectItem value="__none__" disabled>{isAr ? "لا توجد أقسام" : "No Departments Configured"}</SelectItem>}</SelectContent></Select>{!departments.length && <p className="text-xs text-amber-500">{isAr ? "جاري تحميل الأقسام من الإعدادات…" : "Loading departments from settings…"}</p>}</div>
            <div className="space-y-2"><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={formData.location} onChange={e => updateField("location", e.target.value)} /></div>
            <div className="space-y-2"><Label>{isAr ? "مستوى الخطورة" : "Severity"}</Label><Select value={formData.severity} onValueChange={v => updateField("severity", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low — منخفض</SelectItem><SelectItem value="medium">Medium — متوسط</SelectItem><SelectItem value="high">High — مرتفع</SelectItem><SelectItem value="critical">Critical — حرج</SelectItem></SelectContent></Select></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>{isAr ? "تفاصيل عدم المطابقة" : "Non-Conformance Details"}</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>{isAr ? "وصف عدم المطابقة" : "Description"}<span className="text-destructive"> *</span></Label><Textarea rows={5} value={formData.description} onChange={e => updateField("description", e.target.value)} /></div>
            <div className="space-y-2"><Label>{isAr ? "الإجراء الفوري" : "Immediate Action"}</Label><Textarea rows={3} value={formData.immediateAction} onChange={e => updateField("immediateAction", e.target.value)} /></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>{isAr ? "السبب الجذري والإجراء التصحيحي" : "Root Cause & Corrective Action"}</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>{isAr ? "السبب الجذري" : "Root Cause"}</Label><Textarea rows={3} value={formData.rootCause} onChange={e => updateField("rootCause", e.target.value)} /></div>
            <div className="space-y-2"><Label>{isAr ? "الإجراء التصحيحي" : "Corrective Action"}</Label><Textarea rows={3} value={formData.correctiveAction} onChange={e => updateField("correctiveAction", e.target.value)} /></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>{isAr ? "الصور المرفقة" : "Attached Images"}</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{imageSlots.map(slot => { const image = formData[`image${slot}`]; return <div key={slot} className="relative aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">{image ? <><img src={image} className="h-full w-full object-cover" /><button type="button" onClick={() => clearImage(slot)} className="absolute top-1 end-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"><X className="h-3.5 w-3.5" /></button></> : <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground"><ImageIcon className="h-5 w-5" /><span className="text-[10px]">{isAr ? `صورة ${slot}` : `Image ${slot}`}</span><input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, slot)} /></label>}</div>; })}</div></CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center justify-between"><span>{isAr ? "جدول الإجراءات التصحيحية" : "Corrective Actions Table"}</span><Button type="button" variant="outline" size="sm" onClick={addActionRow}><Plus className="h-4 w-4 me-1" />{isAr ? "إضافة صف" : "Add Row"}</Button></CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-muted">{[isAr?"الرقم":"No.",isAr?"الإجراء":"Action",isAr?"المسؤول":"Responsible",isAr?"تاريخ التنفيذ":"Due Date",isAr?"الفعالية":"Effectiveness",isAr?"التوقيع":"Signature",""] .map(h => <th key={h} className="border p-2">{h}</th>)}</tr></thead><tbody>{(formData.correctiveActions || []).map((r: NCRActionRow, i: number) => <tr key={i}><td className="border p-2 text-center">{r.no}</td><td className="border p-1"><Input value={r.action} onChange={e=>updateActionRow(i,"action",e.target.value)} /></td><td className="border p-1"><Input value={r.responsible} onChange={e=>updateActionRow(i,"responsible",e.target.value)} /></td><td className="border p-1"><Input type="date" value={r.dueDate} onChange={e=>updateActionRow(i,"dueDate",e.target.value)} /></td><td className="border p-1"><Input value={r.effectiveness} onChange={e=>updateActionRow(i,"effectiveness",e.target.value)} /></td><td className="border p-1"><Input value={r.signature} onChange={e=>updateActionRow(i,"signature",e.target.value)} /></td><td className="border p-1"><Button type="button" variant="ghost" size="icon" onClick={()=>removeActionRow(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>)}</tbody></table></CardContent></Card>

          <Card><CardHeader><CardTitle>{isAr ? "المسؤولية والإغلاق" : "Assignment & Closure"}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{isAr ? "الشخص المسؤول" : "Responsible Person"}</Label><Select value={formData.responsiblePersonId || ""} onValueChange={v=>updateField("responsiblePersonId",v)}><SelectTrigger><SelectValue placeholder={isAr ? "اختر المسؤول" : "Select User"} /></SelectTrigger><SelectContent>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={formData.dueDate} onChange={e=>updateField("dueDate",e.target.value)} /></div>
            <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={formData.status} onValueChange={v=>updateField("status",v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{isAr?"مسودة":"Draft"}</SelectItem><SelectItem value="submitted">{isAr?"مقدم":"Submitted"}</SelectItem><SelectItem value="assigned">{isAr?"معين":"Assigned"}</SelectItem><SelectItem value="in_progress">{isAr?"قيد التنفيذ":"In Progress"}</SelectItem><SelectItem value="closed">{isAr?"مغلق":"Closed"}</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 md:col-span-2"><Label>{isAr ? "ملاحظات التحقق" : "Verification / Closure Notes"}</Label><Textarea value={formData.verificationNotes} onChange={e=>updateField("verificationNotes",e.target.value)} /></div>
          </CardContent><CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={()=>setLocation("/admin/ncr")} className="w-full sm:w-auto">{isAr?"إلغاء":"Cancel"}</Button>
            <Button type="submit" disabled={saving || sending} className="w-full sm:w-auto"><Save className="h-4 w-4 me-2" />{saving ? (isAr?"جاري الحفظ…":"Saving…") : (isAr?"حفظ التقرير":"Save NCR")}</Button>
            {canSendEmail && <Button type="button" disabled={saving || sending} onClick={handleSaveAndSend} className="w-full sm:w-auto"><Send className="h-4 w-4 me-2" />{sending ? (isAr?"جاري الحفظ والإرسال…":"Saving & Sending…") : (isAr?"حفظ وإرسال":"Save & Send")}</Button>}
          </CardFooter></Card>
        </form>

        <aside className="hidden lg:block w-[400px] flex-shrink-0 sticky top-4">{preview}</aside>
      </div>

      {showMobilePreview && <div className="fixed inset-0 z-50 bg-black/60 p-3 lg:hidden" onClick={()=>setShowMobilePreview(false)}><div className="h-full max-w-xl mx-auto bg-background rounded-lg overflow-hidden p-2" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center p-2 border-b"><strong>{isAr?"معاينة NCR":"NCR Preview"}</strong><Button variant="ghost" size="sm" onClick={()=>setShowMobilePreview(false)}>✕</Button></div>{preview}</div></div>}

      {showShare && <PrintShareDialog open={showShare} onOpenChange={setShowShare} item={{ id: shareNcrMeta?.id || params?.id, url: shareNcrMeta?.id || params?.id ? `${window.location.origin}/admin/ncr/${shareNcrMeta?.id || params?.id}` : undefined, type: "ncr", refNo: shareNcrMeta?.refNo || formData.refNo, title: `NCR: ${shareNcrMeta?.refNo || formData.refNo || "New"}`, department: formData.department, severity: formData.severity, status: formData.status, date: formData.date, images: [formData.image1,formData.image2,formData.image3,formData.image4], sections: [{label:isAr?"الوصف":"Description",value:formData.description},{label:isAr?"الإجراء الفوري":"Immediate Action",value:formData.immediateAction||""},{label:isAr?"السبب الجذري":"Root Cause",value:formData.rootCause||""},{label:isAr?"الإجراء التصحيحي":"Corrective Action",value:formData.correctiveAction||""},{label:isAr?"جدول الإجراءات":"Corrective Actions Table",value:formatActionsForSections()},{label:isAr?"ملاحظات التحقق":"Verification Notes",value:formData.verificationNotes||""}] }} />}
      <FilePreviewDialog open={!!previewFile} onOpenChange={open=>!open && setPreviewFile(null)} file={previewFile} />
    </div>
  );
}

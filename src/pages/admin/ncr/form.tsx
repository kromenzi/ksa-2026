import { useState, useEffect, useCallback, useRef } from "react";
import { useData } from "@/lib/data-context";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Printer, Upload, Plus, Trash2, FileText, Send, Loader2, Eye, Image as ImageIcon, X, ShieldAlert } from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";
import FilePreviewDialog, { type FilePreviewItem } from "@/components/file-preview-dialog";
import { useToast } from "@/hooks/use-toast";

// Mock AI analysis for demo purposes
async function mockAnalyzeNCR(file: File): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        fields: {
          department: { value: "HSE Department", confidence: 0.92 },
          location: { value: "Site A - Zone 3", confidence: 0.88 },
          description: { value: "تم العثور على عدم مطابقة في معدات الحماية الشخصية في منطقة العمل", confidence: 0.85 },
          severity: { value: "medium", confidence: 0.78 },
          immediateAction: { value: "تم استبدال المعدات غير المطابقة فوراً", confidence: 0.82 },
          rootCause: { value: "عدم وجود فحص دوري للمعدات", confidence: 0.75 },
          correctiveAction: { value: "إنشاء جدول فحص دوري شهري", confidence: 0.80 },
          date: { value: new Date().toISOString().split("T")[0], confidence: 0.95 },
        },
        sourceFile: URL.createObjectURL(file),
        sourceFilename: file.name,
      });
    }, 2000);
  });
}

async function mockUploadFile(file: File): Promise<{ filename: string; fileUrl: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        filename: file.name,
        fileUrl: URL.createObjectURL(file),
      });
    }, 1000);
  });
}

interface NCRActionRow {
  no: number;
  action: string;
  responsible: string;
  dueDate: string;
  effectiveness: string;
  signature: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const cls = confidence > 0.7
    ? "bg-green-100 text-green-700"
    : confidence > 0.4
    ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  return <Badge className={cls}>{Math.round(confidence * 100)}%</Badge>;
}

function A4Preview({ formData }: { formData: any }) {
  const severityColors: Record<string, { text: string; bg: string; border: string }> = {
    low:      { text: "#16a34a", bg: "#dcfce7", border: "#86efac" },
    medium:   { text: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
    high:     { text: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
    critical: { text: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  };
  const sev = severityColors[formData.severity] || { text: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" };

  const sections = [
    { title: "Description of Non-Conformance", titleAr: "وصف عدم المطابقة",   value: formData.description,    color: "#dc2626", bg: "#fef2f2" },
    { title: "Immediate Action Taken",          titleAr: "الإجراء الفوري",      value: formData.immediateAction, color: "#d97706", bg: "#fffbeb" },
    { title: "Root Cause Analysis",             titleAr: "السبب الجذري",        value: formData.rootCause,       color: "#7c3aed", bg: "#f5f3ff" },
    { title: "Corrective Action Summary",       titleAr: "الإجراء التصحيحي",    value: formData.correctiveAction,color: "#0369a1", bg: "#eff6ff" },
  ];

  return (
    <div
      className="bg-white text-black origin-top-left"
      style={{ width: "210mm", minHeight: "297mm", transform: "scale(0.48)", transformOrigin: "top left", fontFamily: "Arial, sans-serif", padding: "8mm" }}
    >
      {/* ─── Header ─────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #0f4c81 0%, #1a6fa3 100%)", color: "white", padding: "5mm 6mm", borderRadius: "3mm", marginBottom: "4mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "bold", letterSpacing: "0.5px" }}>NON-CONFORMANCE REPORT</div>
          <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "2px" }}>تقرير عدم المطابقة — Corrective / Preventive Action Request</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", background: "rgba(255,255,255,0.2)", padding: "2px 10px", borderRadius: "4px", marginBottom: "3px" }}>
            {formData.refNo || "NCR-______"}
          </div>
          <div style={{ fontSize: "9px", opacity: 0.75 }}>HSE-F-03 Rev.01</div>
        </div>
      </div>

      {/* ─── Info Grid ──────────────────────────────── */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#f8fafc", borderBottom: "2px solid #0f4c81", padding: "2mm 3mm", fontSize: "10px", fontWeight: "bold", color: "#0f4c81" }}>
          General Information / المعلومات العامة
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "10px" }}>
          {[
            { label: "Date / التاريخ",           value: formData.date || "___" },
            { label: "Department / القسم",         value: formData.department || "___" },
            { label: "Location / الموقع",          value: formData.location || "___" },
          ].map((item, i) => (
            <div key={i} style={{ padding: "2.5mm 3mm", borderRight: i < 2 ? "1px solid #e2e8f0" : "none", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ color: "#64748b", fontSize: "8px", marginBottom: "1px" }}>{item.label}</div>
              <div style={{ fontWeight: "600" }}>{item.value}</div>
            </div>
          ))}
          <div style={{ padding: "2.5mm 3mm", borderRight: "1px solid #e2e8f0" }}>
            <div style={{ color: "#64748b", fontSize: "8px", marginBottom: "1px" }}>Severity / الحدة</div>
            <span style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`, padding: "0 6px", borderRadius: "10px", fontWeight: "bold", fontSize: "9px", textTransform: "capitalize" }}>
              {formData.severity || "___"}
            </span>
          </div>
          <div style={{ padding: "2.5mm 3mm", borderRight: "1px solid #e2e8f0" }}>
            <div style={{ color: "#64748b", fontSize: "8px", marginBottom: "1px" }}>Status / الحالة</div>
            <div style={{ fontWeight: "600", textTransform: "capitalize" }}>{formData.status || "___"}</div>
          </div>
          <div style={{ padding: "2.5mm 3mm" }}>
            <div style={{ color: "#64748b", fontSize: "8px", marginBottom: "1px" }}>Due Date / تاريخ الاستحقاق</div>
            <div style={{ fontWeight: "600" }}>{formData.dueDate || "___"}</div>
          </div>
        </div>
      </div>

      {/* ─── Colored Sections ───────────────────────── */}
      {sections.map((sec) => (
        <div key={sec.title} style={{ border: `1px solid ${sec.color}30`, borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
          <div style={{ background: sec.bg, borderBottom: `2px solid ${sec.color}50`, padding: "2mm 3mm", display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "3px", height: "12px", background: sec.color, borderRadius: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "10px", fontWeight: "bold", color: sec.color }}>{sec.title}</span>
            <span style={{ fontSize: "8px", color: "#64748b", marginInlineStart: "4px" }}>/ {sec.titleAr}</span>
          </div>
          <div style={{ padding: "3mm", fontSize: "9px", minHeight: "14mm", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sec.value || ""}</div>
        </div>
      ))}

      {/* ─── Actions Table ──────────────────────────── */}
      <div style={{ border: "1px solid #cbd5e1", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#0f4c81", color: "white", padding: "2mm 3mm", fontSize: "10px", fontWeight: "bold" }}>
          Corrective Actions Table / جدول الإجراءات التصحيحية
        </div>
        <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {["No./الرقم", "Action / الإجراء", "Responsible / المسئول", "Due Date / التاريخ", "Effectiveness", "Signature / التوقيع"].map((h, i) => (
                <th key={i} style={{ border: "1px solid #cbd5e1", padding: "2mm", textAlign: "center", color: "#374151", fontWeight: "bold", fontSize: "8px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(formData.correctiveActions || []).map((row: NCRActionRow, i: number) => (
              <tr key={row.no} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm", textAlign: "center", fontWeight: "bold", color: "#0f4c81" }}>{row.no}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{row.action}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{row.responsible}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{row.dueDate}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{row.effectiveness}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "2mm" }}>{row.signature}</td>
              </tr>
            ))}
            {(!formData.correctiveActions || formData.correctiveActions.length === 0) && (
              <tr>
                <td colSpan={6} style={{ border: "1px solid #e2e8f0", padding: "4mm", textAlign: "center", color: "#94a3b8" }}>—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Verification Notes ─────────────────────── */}
      <div style={{ border: "1px solid #22c55e30", borderRadius: "2mm", overflow: "hidden", marginBottom: "3mm" }}>
        <div style={{ background: "#f0fdf4", borderBottom: "2px solid #22c55e50", padding: "2mm 3mm", display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "3px", height: "12px", background: "#22c55e", borderRadius: "2px", flexShrink: 0 }} />
          <span style={{ fontSize: "10px", fontWeight: "bold", color: "#16a34a" }}>Verification & Closure Notes / ملاحظات التحقق والإغلاق</span>
        </div>
        <div style={{ padding: "3mm", fontSize: "9px", minHeight: "14mm", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{formData.verificationNotes || ""}</div>
      </div>

      {/* ─── Signatures ─────────────────────────────── */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "2mm", overflow: "hidden", marginBottom: "4mm" }}>
        <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "2mm 3mm", fontSize: "10px", fontWeight: "bold", color: "#374151" }}>
          Signatures / التوقيعات
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {[
            { label: "Inspector",  labelAr: "المفتش" },
            { label: "Supervisor", labelAr: "المشرف" },
            { label: "Manager",    labelAr: "المدير" },
          ].map((sig, i) => (
            <div key={sig.label} style={{ padding: "4mm 3mm", borderRight: i < 2 ? "1px solid #e2e8f0" : "none" }}>
              <div style={{ fontSize: "9px", fontWeight: "bold", marginBottom: "6mm", color: "#374151" }}>{sig.label} / {sig.labelAr}</div>
              <div style={{ borderBottom: "1px solid #94a3b8", marginBottom: "2mm", height: "10mm" }} />
              <div style={{ fontSize: "8px", color: "#94a3b8" }}>Date / التاريخ: ___________</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Footer ─────────────────────────────────── */}
      <div style={{ borderTop: "2px solid #0f4c81", paddingTop: "2mm", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#64748b" }}>
        <span style={{ color: "#0f4c81", fontWeight: "bold" }}>HSE-F-03 Rev.01</span>
        <span style={{ color: "#64748b" }}>ABDULKAREM SAFETY BOARD — نظام إدارة السلامة</span>
        <span>{formData.date || new Date().toISOString().split("T")[0]}</span>
      </div>
    </div>
  );
}

export default function AdminNCRForm() {
  const [, params] = useRoute("/admin/ncr/:id");
  const isNew = params?.id === "new";
  const [, setLocation] = useLocation();
  const { ncrs, users, addNCR, updateNCR, currentUser, settings, departments, hasPermission } = useData();
  const { toast } = useToast();
  const [showShare, setShowShare] = useState(false);
  const [shareNcrMeta, setShareNcrMeta] = useState<{ id?: string; refNo?: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);

  const isAr = settings.language === "ar";
  const canSendEmail = hasPermission("ncr", "send_email");

  const initialMode = (): "manual" | "upload" | "review" => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "upload") {
      return "upload";
    }
    return "manual";
  };

  const [mode, setMode] = useState<"manual" | "upload" | "review">(initialMode);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [formData, setFormData] = useState<any>({
    department: "",
    location: "",
    description: "",
    severity: "low",
    status: "draft",
    date: new Date().toISOString().split("T")[0],
    immediateAction: "",
    rootCause: "",
    correctiveAction: "",
    correctiveActions: [
      { no: 1, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
      { no: 2, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
    ],
    dueDate: "",
    verificationNotes: "",
    image1: null,
    image2: null,
    image3: null,
    image4: null,
    responsiblePersonId: "",
    sourceFile: null,
    sourceMetadata: null,
  });

  useEffect(() => {
    if (!isNew && params?.id) {
      const ncr = ncrs.find((n) => n.id === params.id);
      if (ncr) {
        Promise.resolve().then(() => {
          setFormData({
            ...ncr,
            image1: ncr.image1 || null,
            image2: ncr.image2 || null,
            image3: ncr.image3 || null,
            image4: ncr.image4 || null,
            correctiveActions: ncr.correctiveActions || [
              { no: 1, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
              { no: 2, action: "", responsible: "", dueDate: "", effectiveness: "", signature: "" },
            ],
          });
          setMode("manual");
        });
      } else {
        toast({ title: "Error", description: "NCR not found", variant: "destructive" });
        setLocation("/admin/ncr");
      }
    }
  }, [params?.id, isNew, ncrs, setLocation, toast]);

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const updateActionRow = useCallback((index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const rows = [...(prev.correctiveActions || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, correctiveActions: rows };
    });
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(`image${slot}`, reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [updateField]);

  const clearImage = useCallback((slot: number) => {
    updateField(`image${slot}`, null);
  }, [updateField]);

  const addActionRow = useCallback(() => {
    setFormData((prev: any) => {
      const rows = [...(prev.correctiveActions || [])];
      rows.push({
        no: rows.length + 1,
        action: "",
        responsible: "",
        dueDate: "",
        effectiveness: "",
        signature: "",
      });
      return { ...prev, correctiveActions: rows };
    });
  }, []);

  const removeActionRow = useCallback((index: number) => {
    setFormData((prev: any) => {
      const rows = [...(prev.correctiveActions || [])];
      rows.splice(index, 1);
      const renumbered = rows.map((r: NCRActionRow, i: number) => ({ ...r, no: i + 1 }));
      return { ...prev, correctiveActions: renumbered };
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Use mock upload for demo
      const { filename, fileUrl } = await mockUploadFile(file);

      setAnalyzing(true);
      setUploading(false);

      // Use mock AI analysis for demo
      const result = await mockAnalyzeNCR(file);
      setAnalysisResult({ ...result, sourceFile: fileUrl, sourceFilename: filename });
      setMode("review");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Upload/analysis failed", variant: "destructive" });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleConfirmAnalysis = () => {
    if (!analysisResult) return;
    const fields = analysisResult.fields || analysisResult;
    setFormData((prev: any) => ({
      ...prev,
      department: fields.department?.value || fields.department || prev.department,
      location: fields.location?.value || fields.location || prev.location,
      description: fields.description?.value || fields.description || prev.description,
      severity: fields.severity?.value || fields.severity || prev.severity,
      immediateAction: fields.immediateAction?.value || fields.immediateAction || prev.immediateAction,
      rootCause: fields.rootCause?.value || fields.rootCause || prev.rootCause,
      correctiveAction: fields.correctiveAction?.value || fields.correctiveAction || prev.correctiveAction,
      date: fields.date?.value || fields.date || prev.date,
      sourceFile: analysisResult.sourceFile || null,
      sourceMetadata: analysisResult,
    }));
    setMode("manual");
    toast({ title: isAr ? "تم تحميل البيانات" : "Data loaded", description: isAr ? "راجع البيانات قبل الحفظ" : "Review fields before saving" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department || !formData.description) {
      toast({ title: "Validation Error", description: "Department and Description are required.", variant: "destructive" });
      return;
    }

    if (isNew) {
      const created = await addNCR({ ...formData, createdBy: currentUser?.id || "unknown" });
      setShareNcrMeta({ id: created.id, refNo: created.refNo });
    } else {
      await updateNCR(params!.id, formData);
      setShareNcrMeta({ id: params!.id, refNo: formData.refNo });
    }

    setLocation("/admin/ncr");
  };

  const handleSaveAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department || !formData.description) {
      toast({ title: "Validation Error", description: "Department and Description are required.", variant: "destructive" });
      return;
    }

    if (isNew) {
      const created = await addNCR({ ...formData, createdBy: currentUser?.id || "unknown" });
      setShareNcrMeta({ id: created.id, refNo: created.refNo });
      setFormData((prev: any) => ({ ...prev, id: created.id, refNo: created.refNo }));
    } else {
      await updateNCR(params!.id, formData);
      setShareNcrMeta({ id: params!.id, refNo: formData.refNo });
    }

    setShowShare(true);
  };

  const formatActionsForSections = () => {
    if (!formData.correctiveActions || formData.correctiveActions.length === 0) return "N/A";
    return formData.correctiveActions
      .map((r: NCRActionRow) => `${r.no}. ${r.action || "-"} | ${r.responsible || "-"} | ${r.dueDate || "-"} | ${r.effectiveness || "-"}`)
      .join("\n");
  };

  const imageSlots = [1, 2, 3, 4];

  if (mode === "upload") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ncr")} data-testid="button-back-ncr">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
              {isAr ? "تحميل وتحليل NCR" : "Upload & Analyze NCR"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAr ? "ارفع ملف PDF أو DOCX لاستخراج البيانات تلقائياً" : "Upload a PDF or DOCX file to auto-extract data"}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-drop-zone"
            >
              {uploading || analyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">
                    {uploading ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "جاري التحليل..." : "Analyzing...")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">{isAr ? "اسحب الملف هنا أو انقر للتحميل" : "Drag & drop file here or click to upload"}</p>
                  <p className="text-sm text-muted-foreground">PDF, DOCX</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                data-testid="input-file-upload"
              />
            </div>

            <div className="mt-4 flex justify-center">
              <Button variant="link" onClick={() => setMode("manual")} data-testid="button-switch-manual">
                <FileText className="h-4 w-4 mr-2" />
                {isAr ? "أو أدخل البيانات يدوياً" : "Or enter data manually"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "review" && analysisResult) {
    const fields = analysisResult.fields || analysisResult;
    const fieldEntries = Object.entries(fields).filter(
      ([key]) => !["sourceFile", "sourceFilename"].includes(key) && typeof (fields as any)[key] !== "function"
    );

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => setMode("upload")} data-testid="button-back-upload">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
              {isAr ? "مراجعة البيانات المستخرجة" : "Review Extracted Data"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAr ? "تحقق من البيانات وعدّل ما يلزم قبل التأكيد" : "Verify extracted fields and edit as needed before confirming"}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {fieldEntries.map(([key, val]: [string, any]) => {
              const fieldValue = typeof val === "object" && val !== null ? val.value : val;
              const confidence = typeof val === "object" && val !== null ? val.confidence : null;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="capitalize font-medium">{key.replace(/([A-Z])/g, " $1")}</Label>
                    {confidence !== null && confidence !== undefined && (
                      <ConfidenceBadge confidence={confidence} />
                    )}
                  </div>
                  <Input
                    value={fieldValue || ""}
                    onChange={(e) => {
                      setAnalysisResult((prev: any) => {
                        const f = { ...(prev.fields || prev) };
                        if (typeof f[key] === "object" && f[key] !== null) {
                          f[key] = { ...f[key], value: e.target.value };
                        } else {
                          f[key] = e.target.value;
                        }
                        return prev.fields ? { ...prev, fields: f } : f;
                      });
                    }}
                    data-testid={`input-review-${key}`}
                  />
                </div>
              );
            })}

            <div className="space-y-2 pt-2 border-t">
              <Label>{isAr ? "صور مرفقة (يدوي)" : "Attached Images (manual)"}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imageSlots.map((slot) => {
                  const image = formData[`image${slot}`] as string | null;
                  return (
                    <div key={slot} className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 overflow-hidden flex items-center justify-center">
                      {image ? (
                        <>
                          <img src={image} alt={`NCR Image ${slot}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(slot)}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[10px]">{slot}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, slot)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            {analysisResult?.sourceFile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const filename = analysisResult.sourceFile.split('/').pop() || '';
                  setPreviewFile({
                    id: 'ncr-source',
                    name: analysisResult.sourceFilename || filename,
                    originalName: filename,
                    mimeType: filename.endsWith('.pdf') ? 'application/pdf' : 
                              filename.match(/\.docx?$/i) ? 'application/msword' :
                              filename.match(/\.xlsx?$/i) ? 'application/vnd.ms-excel' :
                              filename.match(/\.pptx?$/i) ? 'application/vnd.ms-powerpoint' : 'application/octet-stream',
                    previewUrl: `/api/uploads/preview?path=${encodeURIComponent(filename)}`,
                    downloadUrl: analysisResult.sourceFile,
                    viewUrl: analysisResult.sourceFile,
                    section: 'ncr',
                  });
                }}
                data-testid="button-preview-source"
              >
                <Eye className="h-4 w-4 me-2" />
                {isAr ? "عرض الملف" : "View File"}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setMode("upload")} data-testid="button-review-back">
              {isAr ? "رجوع" : "Back"}
            </Button>
            <Button onClick={handleConfirmAnalysis} data-testid="button-confirm-analysis">
              <FileText className="h-4 w-4 mr-2" />
              {isAr ? "تأكيد وتعبئة النموذج" : "Confirm & Fill Form"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ncr")} data-testid="button-back-ncr">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
              {isNew
                ? isAr ? "إنشاء تقرير جديد" : "Create New NCR"
                : isAr ? "تعديل التقرير" : "Edit NCR"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isNew ? "HSE-F-03" : `Ref: ${formData.refNo || "New"}`}
            </p>
          </div>
        </div>
        {!isNew && (
          <div className="ms-auto flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={() => setLocation("/admin/escalations?source=" + encodeURIComponent(formData.refNo || params?.id || ""))}
              data-testid="button-escalate-ncr-form"
            >
              <ShieldAlert className="h-4 w-4 me-2 text-rose-500" />
              {isAr ? "تصعيد للإدارة" : "Escalate to Management"}
            </Button>
            <Button variant="outline" onClick={() => setShowShare(true)} data-testid="button-share-ncr-form">
              <Printer className="h-4 w-4 me-2" />
              {isAr ? "طباعة / مشاركة" : "Print / Share"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">1</span>
                {isAr ? "المعلومات العامة" : "General Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "التاريخ" : "Date"}</Label>
                <Input type="date" value={formData.date} onChange={(e) => updateField("date", e.target.value)} data-testid="input-ncr-date" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "القسم" : "Department"}</Label>
                <Select value={formData.department} onValueChange={(v) => updateField("department", v)}>
                  <SelectTrigger data-testid="select-ncr-dept"><SelectValue placeholder={isAr ? "اختر القسم" : "Select Dept"} /></SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="General" disabled>No Departments Configured</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الموقع" : "Location"}</Label>
                <Input value={formData.location || ""} onChange={(e) => updateField("location", e.target.value)} placeholder="e.g. Site B - Zone 1" data-testid="input-ncr-location" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الحدة" : "Severity"}</Label>
                <Select value={formData.severity} onValueChange={(v) => updateField("severity", v)}>
                  <SelectTrigger data-testid="select-ncr-severity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Low — منخفض</span></SelectItem>
                    <SelectItem value="medium"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />Medium — متوسط</span></SelectItem>
                    <SelectItem value="high"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />High — مرتفع</span></SelectItem>
                    <SelectItem value="critical"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Critical — حرج</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">2</span>
                {isAr ? "تفاصيل عدم المطابقة" : "Non-Conformance Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? "وصف عدم المطابقة" : "Description of Non-Conformance"}</Label>
                <Textarea rows={4} value={formData.description} onChange={(e) => updateField("description", e.target.value)} placeholder={isAr ? "وصف تفصيلي..." : "Describe the issue in detail..."} data-testid="input-ncr-description" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الإجراء الفوري" : "Immediate Action Taken"}</Label>
                <Textarea rows={3} value={formData.immediateAction || ""} onChange={(e) => updateField("immediateAction", e.target.value)} data-testid="input-ncr-immediate-action" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">3</span>
                {isAr ? "السبب الجذري والإجراء التصحيحي" : "Root Cause & Corrective Action"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? "السبب الجذري" : "Root Cause Analysis"}</Label>
                <Textarea rows={3} value={formData.rootCause || ""} onChange={(e) => updateField("rootCause", e.target.value)} data-testid="input-ncr-root-cause" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الإجراء التصحيحي" : "Corrective Action Summary"}</Label>
                <Textarea rows={3} value={formData.correctiveAction || ""} onChange={(e) => updateField("correctiveAction", e.target.value)} data-testid="input-ncr-corrective-action" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">4</span>
                {isAr ? "الصور المرفقة" : "Attached Images"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imageSlots.map((slot) => {
                  const image = formData[`image${slot}`] as string | null;
                  return (
                    <div key={slot} className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 overflow-hidden flex items-center justify-center">
                      {image ? (
                        <>
                          <img src={image} alt={`NCR Image ${slot}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(slot)}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center"
                            data-testid={`button-remove-image-${slot}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[10px]">{isAr ? `صورة ${slot}` : `Image ${slot}`}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, slot)} data-testid={`input-image-${slot}`} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-xs font-bold">5</span>
                  {isAr ? "جدول الإجراءات التصحيحية" : "Corrective Actions Table"}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addActionRow} data-testid="button-add-action-row">
                  <Plus className="h-4 w-4 mr-1" />
                  {isAr ? "إضافة صف" : "Add Row"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 w-12 text-center">{isAr ? "الرقم" : "No."}</th>
                      <th className="border p-2">{isAr ? "الإجراء" : "Action"}</th>
                      <th className="border p-2">{isAr ? "المسئول" : "Responsible"}</th>
                      <th className="border p-2 w-36">{isAr ? "تاريخ التنفيذ" : "Due Date"}</th>
                      <th className="border p-2">{isAr ? "الفعالية" : "Effectiveness"}</th>
                      <th className="border p-2">{isAr ? "التوقيع" : "Signature"}</th>
                      <th className="border p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.correctiveActions || []).map((row: NCRActionRow, idx: number) => (
                      <tr key={idx} data-testid={`row-action-${idx}`}>
                        <td className="border p-2 text-center font-medium">{row.no}</td>
                        <td className="border p-1">
                          <Input value={row.action} onChange={(e) => updateActionRow(idx, "action", e.target.value)} className="border-0 h-8" data-testid={`input-action-${idx}`} />
                        </td>
                        <td className="border p-1">
                          <Input value={row.responsible} onChange={(e) => updateActionRow(idx, "responsible", e.target.value)} className="border-0 h-8" data-testid={`input-responsible-${idx}`} />
                        </td>
                        <td className="border p-1">
                          <Input type="date" value={row.dueDate} onChange={(e) => updateActionRow(idx, "dueDate", e.target.value)} className="border-0 h-8" data-testid={`input-action-date-${idx}`} />
                        </td>
                        <td className="border p-1">
                          <Input value={row.effectiveness} onChange={(e) => updateActionRow(idx, "effectiveness", e.target.value)} className="border-0 h-8" data-testid={`input-effectiveness-${idx}`} />
                        </td>
                        <td className="border p-1">
                          <Input value={row.signature} onChange={(e) => updateActionRow(idx, "signature", e.target.value)} className="border-0 h-8" data-testid={`input-signature-${idx}`} />
                        </td>
                        <td className="border p-1 text-center">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeActionRow(idx)} data-testid={`button-delete-row-${idx}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">6</span>
                {isAr ? "المسؤولية والإغلاق" : "Assignment & Closure"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "الشخص المسؤول" : "Responsible Person"}</Label>
                <Select value={formData.responsiblePersonId || ""} onValueChange={(v) => updateField("responsiblePersonId", v)}>
                  <SelectTrigger data-testid="select-ncr-responsible"><SelectValue placeholder={isAr ? "اختر المسؤول" : "Select User"} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input type="date" value={formData.dueDate || ""} onChange={(e) => updateField("dueDate", e.target.value)} data-testid="input-ncr-due-date" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الحالة" : "Status"}</Label>
                <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger data-testid="select-ncr-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem>
                    <SelectItem value="submitted">{isAr ? "مقدم" : "Submitted"}</SelectItem>
                    <SelectItem value="assigned">{isAr ? "معين" : "Assigned"}</SelectItem>
                    <SelectItem value="in_progress">{isAr ? "قيد التنفيذ" : "In Progress"}</SelectItem>
                    <SelectItem value="closed">{isAr ? "مغلق" : "Closed"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{isAr ? "ملاحظات التحقق" : "Verification / Closure Notes"}</Label>
                <Textarea value={formData.verificationNotes || ""} onChange={(e) => updateField("verificationNotes", e.target.value)} placeholder={isAr ? "ملاحظات نهائية..." : "Final comments before closing..."} data-testid="input-ncr-verification" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/ncr")} className="w-full sm:w-auto" data-testid="button-cancel-ncr">
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" data-testid="button-save-ncr">
                <Save className="h-4 w-4 me-2" />
                {isAr ? "حفظ التقرير" : "Save NCR"}
              </Button>
              {canSendEmail && (
                <Button type="button" onClick={handleSaveAndSend} className="w-full sm:w-auto" data-testid="button-save-send-ncr">
                  <Send className="h-4 w-4 me-2" />
                  {isAr ? "حفظ وإرسال" : "Save & Send"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>

        <div className="hidden lg:block w-[400px] flex-shrink-0 sticky top-4">
          <div className="overflow-hidden rounded-lg border bg-gray-50" style={{ height: "calc(100vh - 120px)", overflow: "auto" }}>
            <A4Preview formData={formData} />
          </div>
        </div>
      </div>

      {showShare && (
        <PrintShareDialog
          open={showShare}
          onOpenChange={setShowShare}
          item={{
            id: shareNcrMeta?.id || params?.id,
            url: typeof window !== 'undefined' && (shareNcrMeta?.id || params?.id)
              ? `${window.location.origin}/admin/ncr/${shareNcrMeta?.id || params?.id}`
              : undefined,
            type: "ncr",
            refNo: shareNcrMeta?.refNo || formData.refNo,
            title: `NCR: ${shareNcrMeta?.refNo || formData.refNo || "New"}`,
            department: formData.department,
            severity: formData.severity,
            status: formData.status,
            date: formData.date,
            images: [formData.image1, formData.image2, formData.image3, formData.image4],
            sections: [
              { label: isAr ? "الوصف" : "Description", value: formData.description },
              { label: isAr ? "الإجراء الفوري" : "Immediate Action", value: formData.immediateAction || "" },
              { label: isAr ? "السبب الجذري" : "Root Cause", value: formData.rootCause || "" },
              { label: isAr ? "الإجراء التصحيحي" : "Corrective Action", value: formData.correctiveAction || "" },
              { label: isAr ? "جدول الإجراءات" : "Corrective Actions Table", value: formatActionsForSections() },
              { label: isAr ? "ملاحظات التحقق" : "Verification Notes", value: formData.verificationNotes || "" },
            ],
          }}
        />
      )}

      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        file={previewFile}
      />
    </div>
  );
}

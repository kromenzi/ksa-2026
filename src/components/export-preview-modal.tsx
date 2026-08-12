"use client";

import { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Archive,
  FileCode2,
  ShieldAlert,
  ShieldCheck,
  Palette,
  Building2,
  Lock,
  Sparkles,
  Check,
} from "lucide-react";

export interface ExportColumnDef {
  id: string;
  labelEn: string;
  labelAr: string;
  isSensitive?: boolean;
}

export interface ExportSectionDef {
  id: string;
  labelEn: string;
  labelAr: string;
  defaultChecked?: boolean;
}

export interface ExportOptions {
  format: "zip" | "doc" | "csv" | "json" | "pdf";
  companyName: string;
  headerColor: string;
  showLogo: boolean;
  showMetadata: boolean;
  selectedSections: string[];
  hiddenColumns: string[];
  hideSensitiveData: boolean;
}

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleEn: string;
  titleAr: string;
  data: any[];
  columns: ExportColumnDef[];
  sections?: ExportSectionDef[];
  onConfirmExport: (options: ExportOptions) => void;
}

const BRAND_COLORS = [
  { id: "#0f766e", nameEn: "Teal HSE", nameAr: "تيل للسلامة", class: "bg-teal-700" },
  { id: "#1e293b", nameEn: "Slate Corporate", nameAr: "رمادي رسمي", class: "bg-slate-800" },
  { id: "#d97706", nameEn: "Amber Warning", nameAr: "كهرماني تحذيري", class: "bg-amber-600" },
  { id: "#1e3a8a", nameEn: "Royal Blue", nameAr: "أزرق ملكي", class: "bg-blue-900" },
  { id: "#047857", nameEn: "Emerald Safety", nameAr: "زمردي بيئي", class: "bg-emerald-700" },
];

export default function ExportPreviewModal({
  isOpen,
  onClose,
  titleEn,
  titleAr,
  data,
  columns,
  sections = [
    { id: "summary", labelEn: "Executive Summary & Stats", labelAr: "الملخص التنفيذي والإحصائيات", defaultChecked: true },
    { id: "table", labelEn: "Detailed Data Table", labelAr: "جدول البيانات التفصيلي", defaultChecked: true },
    { id: "signoff", labelEn: "Approval & Signatures Block", labelAr: "قسم التوقيعات والاعتماد", defaultChecked: true },
  ],
  onConfirmExport,
}: ExportPreviewModalProps) {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [format, setFormat] = useState<ExportOptions["format"]>("zip");
  const [companyName, setCompanyName] = useState(
    isAr ? "مجلس السلامة الموحد - HSE System" : "ABDULKAREM SAFETY BOARD HSE ENTERPRISE"
  );
  const [headerColor, setHeaderColor] = useState("#0f766e");
  const [showLogo, setShowLogo] = useState(true);
  const [showMetadata, setShowMetadata] = useState(true);
  const [hideSensitiveData, setHideSensitiveData] = useState(false);

  const [selectedSections, setSelectedSections] = useState<string[]>(
    sections.filter((s) => s.defaultChecked !== false).map((s) => s.id)
  );

  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Automatically adjust sensitive columns when switch toggles
  const handleSensitiveToggle = (checked: boolean) => {
    setHideSensitiveData(checked);
    if (checked) {
      const sensitiveIds = columns.filter((c) => c.isSensitive).map((c) => c.id);
      setHiddenColumns((prev) => Array.from(new Set([...prev, ...sensitiveIds])));
    } else {
      const sensitiveIds = new Set(columns.filter((c) => c.isSensitive).map((c) => c.id));
      setHiddenColumns((prev) => prev.filter((id) => !sensitiveIds.has(id)));
    }
  };

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleColumn = (id: string) => {
    setHiddenColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColumns.includes(col.id));
  }, [columns, hiddenColumns]);

  const previewRows = useMemo(() => {
    return data.slice(0, 4);
  }, [data]);

  const handleConfirm = () => {
    onConfirmExport({
      format,
      companyName,
      headerColor,
      showLogo,
      showMetadata,
      selectedSections,
      hiddenColumns,
      hideSensitiveData,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl gap-0 border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
                style={{ backgroundColor: headerColor }}
              >
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {isAr ? "معاينة وتخصيص التصدير قبل التحميل" : "Preview & Customize Export Before Download"}
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {isAr ? titleAr : titleEn}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "اختر التنسيق، اضبط الهوية البصرية، قم بإخفاء البيانات الحساسة وحدد الأقسام المطلوبة قبل إنشاء المستند النهائي."
                    : "Configure format, branding, toggle sections, and obscure sensitive data before generating the final export file."}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse border-b">
          {/* Controls Panel (Left in LTR / Right in RTL) */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-muted/10 text-sm overflow-y-auto max-h-[620px]">
            {/* 1. Format Selection */}
            <div className="space-y-2">
              <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {isAr ? "1. تنسيق المستند المطلوب" : "1. Choose File Format"}
              </Label>
              <Tabs value={format} onValueChange={(v: any) => setFormat(v)} className="w-full">
                <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl">
                  <TabsTrigger value="zip" className="text-xs py-2 gap-1 rounded-lg">
                    <Archive className="h-3.5 w-3.5 text-amber-500" />
                    ZIP
                  </TabsTrigger>
                  <TabsTrigger value="doc" className="text-xs py-2 gap-1 rounded-lg">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    Word
                  </TabsTrigger>
                  <TabsTrigger value="csv" className="text-xs py-2 gap-1 rounded-lg">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    CSV
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-xs py-2 gap-1 rounded-lg">
                    <FileCode2 className="h-3.5 w-3.5 text-purple-500" />
                    JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 2. Branding Options */}
            <div className="space-y-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
              <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                {isAr ? "2. إعدادات الهوية والعنوان" : "2. Branding & Styling"}
              </Label>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{isAr ? "اسم المؤسسة / الهيدر" : "Organization Header"}</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                  placeholder="Company Title..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{isAr ? "لون الهيدر والنسق" : "Header Color Theme"}</Label>
                <div className="flex items-center gap-2">
                  {BRAND_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setHeaderColor(c.id)}
                      className={`h-7 w-7 rounded-full ${c.class} flex items-center justify-center transition-all ${
                        headerColor === c.id ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      title={isAr ? c.nameAr : c.nameEn}
                    >
                      {headerColor === c.id && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs">{isAr ? "إظهار الشعار الرسمي" : "Include Official Logo"}</span>
                <Switch checked={showLogo} onCheckedChange={setShowLogo} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">{isAr ? "إظهار التاريخ والختم الزمني" : "Include Timestamp Footer"}</span>
                <Switch checked={showMetadata} onCheckedChange={setShowMetadata} />
              </div>
            </div>

            {/* 3. Sections Included */}
            <div className="space-y-2 p-3.5 rounded-xl border bg-card/60 shadow-sm">
              <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-indigo-500" />
                {isAr ? "3. الأقسام المضمنة بالتقرير" : "3. Report Sections"}
              </Label>

              <div className="space-y-2 mt-1">
                {sections.map((sec) => (
                  <div key={sec.id} className="flex items-center justify-between py-1 border-b last:border-0 border-border/40">
                    <span className="text-xs font-medium">{isAr ? sec.labelAr : sec.labelEn}</span>
                    <Switch
                      checked={selectedSections.includes(sec.id)}
                      onCheckedChange={() => toggleSection(sec.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Sensitive Data & Column Toggles */}
            <div className="space-y-3 p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>{isAr ? "4. حماية البيانات الحساسة" : "4. Sensitive Data & Privacy"}</span>
                </div>
                <Switch checked={hideSensitiveData} onCheckedChange={handleSensitiveToggle} />
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isAr
                  ? "تفعيل هذا الخيار يخفي أسماء المراقبين، الهويات والبيانات الداخلية قبل المشاركة الخارجية."
                  : "Hides observer names, personal IDs, and internal remarks for GDPR/internal compliance."}
              </p>

              <div className="pt-2 border-t border-amber-200/40 dark:border-amber-900/40">
                <Label className="text-xs font-medium block mb-2">{isAr ? "الأعمدة المعروضة:" : "Visible Columns:"}</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1 bg-background/80 rounded-lg border">
                  {columns.map((col) => {
                    const isHidden = hiddenColumns.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={!isHidden}
                          onCheckedChange={() => toggleColumn(col.id)}
                        />
                        <span className={isHidden ? "line-through text-muted-foreground" : "font-medium"}>
                          {isAr ? col.labelAr : col.labelEn}
                        </span>
                        {col.isSensitive && (
                          <span title={isAr ? "عمود حساس" : "Sensitive"} className="ml-auto flex items-center">
                            <Lock className="h-2.5 w-2.5 text-amber-600" />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Sheet Panel (Right in LTR / Left in RTL) */}
          <div className="lg:col-span-7 p-6 bg-slate-100 dark:bg-slate-950/80 flex flex-col items-center justify-start overflow-y-auto max-h-[620px]">
            <div className="w-full mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-primary" />
                {isAr ? "معاينة حية للمستند النهائي" : "Live Rendered Sheet Preview"}
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {data.length} {isAr ? "سجل إجمالي" : "total records"}
              </Badge>
            </div>

            {/* Paper Sheet Mockup */}
            <div className="w-full bg-white text-slate-900 shadow-xl border rounded-lg p-6 font-sans space-y-4 text-xs transition-all">
              {/* Header Banner */}
              <div
                className="p-4 rounded-lg text-white flex items-center justify-between shadow-sm"
                style={{ backgroundColor: headerColor }}
              >
                <div>
                  <h3 className="font-bold text-sm tracking-wide uppercase">{companyName}</h3>
                  <p className="text-[10px] opacity-90">
                    {isAr ? titleAr : titleEn} · ISO 45001 STANDARDS
                  </p>
                </div>
                {showLogo && (
                  <div className="h-8 w-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center font-black text-xs">
                    HSE
                  </div>
                )}
              </div>

              {/* Summary Section */}
              {selectedSections.includes("summary") && (
                <div className="p-3 bg-slate-50 border rounded-md grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">{isAr ? "إجمالي السجلات" : "Total Records"}</span>
                    <span className="font-bold text-slate-900 text-sm">{data.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">{isAr ? "الحالة الحساسة" : "Privacy Status"}</span>
                    <span className={`font-semibold ${hideSensitiveData ? "text-amber-600" : "text-emerald-600"}`}>
                      {hideSensitiveData ? (isAr ? "بيانات محمية" : "Obscured") : (isAr ? "كامل" : "Standard")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">{isAr ? "التنسيق" : "Format"}</span>
                    <span className="font-bold uppercase text-slate-800">{format}</span>
                  </div>
                </div>
              )}

              {/* Table Section */}
              {selectedSections.includes("table") && (
                <div className="border rounded-md overflow-hidden bg-white">
                  <table className="w-full text-left rtl:text-right border-collapse text-[11px]">
                    <thead>
                      <tr style={{ backgroundColor: `${headerColor}15` }} className="border-b">
                        {visibleColumns.map((col) => (
                          <th key={col.id} className="p-2 font-bold text-slate-800 border-r last:border-0">
                            {isAr ? col.labelAr : col.labelEn}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/80">
                          {visibleColumns.map((col) => {
                            let val = row[col.id] || "-";
                            if (col.isSensitive && hideSensitiveData) {
                              val = "██████";
                            }
                            return (
                              <td key={col.id} className="p-2 text-slate-700 border-r last:border-0 font-mono text-[10px]">
                                {String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 4 && (
                    <div className="p-1.5 text-center text-[10px] text-slate-400 bg-slate-50 border-t italic">
                      + {data.length - 4} {isAr ? "صفوف أخرى ستتضمن في الملف النهائي..." : "more rows will be included in exported file..."}
                    </div>
                  )}
                </div>
              )}

              {/* Signoff Section */}
              {selectedSections.includes("signoff") && (
                <div className="pt-4 border-t-2 border-dashed border-slate-300 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-600">
                  <div className="p-2 border rounded bg-slate-50">
                    <p className="font-bold text-slate-800">{isAr ? "إعداد ومراجعة أخصائي السلامة" : "Prepared by HSE Officer"}</p>
                    <p className="text-[9px] text-slate-400 mt-4">{isAr ? "التوقيع والاعتماد" : "Signature & Date"}</p>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <p className="font-bold text-slate-800">{isAr ? "اعتماد مدير الموقع" : "Approved by Site Director"}</p>
                    <p className="text-[9px] text-slate-400 mt-4">{isAr ? "التوقيع والختم" : "Stamp & Signature"}</p>
                  </div>
                </div>
              )}

              {/* Footer Metadata */}
              {showMetadata && (
                <div className="pt-2 text-[9px] text-slate-400 flex justify-between border-t border-slate-100">
                  <span>{isAr ? "تم إنشاء الملف عبر النظام الموحد" : "Generated via Safety Board HSE System"}</span>
                  <span>{new Date().toLocaleString(isAr ? "ar-SA" : "en-US")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/40 flex items-center justify-between sm:justify-between border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              {isAr
                ? `سيتم استخراج ${visibleColumns.length} عمود و ${selectedSections.length} قسم.`
                : `Ready to export ${visibleColumns.length} columns and ${selectedSections.length} sections.`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              {isAr ? "إلغاء" : "Cancel"}
            </Button>

            <Button
              onClick={handleConfirm}
              style={{ backgroundColor: headerColor }}
              className="gap-2 text-white hover:opacity-90 rounded-xl shadow-md font-bold px-6"
            >
              <Download className="h-4 w-4" />
              {isAr ? `تأكيد وتحميل المستند (${format.toUpperCase()})` : `Confirm & Download (${format.toUpperCase()})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

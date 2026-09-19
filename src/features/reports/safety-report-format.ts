import type { ExportColumnDef } from "@/components/export-preview-modal";

export const SAFETY_REPORT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "reportNo", labelEn: "Report No", labelAr: "رقم التقرير" },
  { id: "category", labelEn: "Category", labelAr: "التصنيف" },
  { id: "location", labelEn: "Location", labelAr: "الموقع" },
  { id: "department", labelEn: "Department", labelAr: "القسم" },
  { id: "riskLevel", labelEn: "Risk Level", labelAr: "مستوى الخطر" },
  { id: "status", labelEn: "Status", labelAr: "الحالة" },
  { id: "date", labelEn: "Date", labelAr: "التاريخ" },
  { id: "observerName", labelEn: "Observer Name", labelAr: "اسم المراقب", isSensitive: true },
  { id: "observationDescription", labelEn: "Description", labelAr: "الوصف" },
  { id: "correctiveAction", labelEn: "Corrective Action", labelAr: "الإجراء التصحيحي" },
];

export function safetyRiskLabel(level: string, isAr: boolean) {
  const key = level?.toLowerCase() || "";
  const ar: Record<string, string> = { low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" };
  const en: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
  return isAr ? (ar[key] || level) : (en[key] || level);
}

export function safetyStatusLabel(status: string, isAr: boolean) {
  const key = status?.toLowerCase() || "";
  const ar: Record<string, string> = { open: "مفتوح", in_progress: "قيد التنفيذ", closed: "مغلق" };
  const en: Record<string, string> = { open: "Open", in_progress: "In Progress", closed: "Closed" };
  return isAr ? (ar[key] || status) : (en[key] || status);
}

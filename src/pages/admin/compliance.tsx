import ManagedComplianceRecords from "@/components/admin/ManagedComplianceRecords";

export default function AdminCompliancePage() {
  return (
    <ManagedComplianceRecords
      resource="compliance"
      prefix="CMP"
      titleEn="Compliance Dashboard"
      titleAr="إدارة الامتثال والمعايير"
      descriptionEn="Live compliance register backed by Supabase with permanent Admin/Manager deletion."
      descriptionAr="سجل امتثال فعلي مرتبط بـSupabase مع حذف دائم لصلاحيات Admin/Manager."
      categories={[
        { value: "regulatory", en: "Regulatory Requirement", ar: "متطلب تنظيمي" },
        { value: "iso45001", en: "ISO 45001 Requirement", ar: "متطلب ISO 45001" },
        { value: "iso14001", en: "ISO 14001 Requirement", ar: "متطلب ISO 14001" },
        { value: "corporate", en: "Corporate Standard", ar: "معيار الشركة" },
        { value: "corrective", en: "Corrective Action", ar: "إجراء تصحيحي" },
      ]}
      statuses={[
        { value: "Open", en: "Open", ar: "مفتوح" },
        { value: "In Progress", en: "In Progress", ar: "قيد التنفيذ" },
        { value: "Compliant", en: "Compliant", ar: "ممتثل" },
        { value: "Non-Compliant", en: "Non-Compliant", ar: "غير ممتثل" },
        { value: "Closed", en: "Closed", ar: "مغلق" },
      ]}
      defaultStatus="Open"
    />
  );
}

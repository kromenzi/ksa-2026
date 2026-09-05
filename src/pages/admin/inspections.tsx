import ManagedComplianceRecords from "@/components/admin/ManagedComplianceRecords";

export default function AdminInspectionsPage() {
  return (
    <ManagedComplianceRecords
      resource="inspections"
      prefix="INS"
      titleEn="Safety Inspections"
      titleAr="فحوصات السلامة"
      descriptionEn="Database-backed safety inspection register with permanent record deletion."
      descriptionAr="سجل فحوصات سلامة فعلي مرتبط بقاعدة البيانات مع حذف دائم للسجلات."
      categories={[
        { value: "general", en: "General Safety Inspection", ar: "فحص سلامة عام" },
        { value: "electrical", en: "Electrical Safety", ar: "سلامة كهربائية" },
        { value: "fire", en: "Fire Safety", ar: "سلامة الحريق" },
        { value: "equipment", en: "Equipment Inspection", ar: "فحص المعدات" },
        { value: "contractor", en: "Contractor Inspection", ar: "فحص المقاولين" },
        { value: "warehouse", en: "Warehouse Inspection", ar: "فحص المستودع" },
      ]}
      statuses={[
        { value: "Scheduled", en: "Scheduled", ar: "مجدول" },
        { value: "In Progress", en: "In Progress", ar: "قيد التنفيذ" },
        { value: "Completed", en: "Completed", ar: "مكتمل" },
        { value: "Closed", en: "Closed", ar: "مغلق" },
      ]}
      defaultStatus="Scheduled"
    />
  );
}

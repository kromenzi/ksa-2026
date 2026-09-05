import ManagedComplianceRecords from "@/components/admin/ManagedComplianceRecords";

export default function AdminPermitsPage() {
  return (
    <ManagedComplianceRecords
      resource="permits"
      prefix="PTW"
      titleEn="Permits to Work (PTW)"
      titleAr="تصاريح العمل (PTW)"
      descriptionEn="Live permit-to-work register stored in Supabase with permanent Admin/Manager deletion."
      descriptionAr="سجل تصاريح عمل فعلي محفوظ في Supabase مع حذف دائم لـAdmin/Manager."
      categories={[
        { value: "hot_work", en: "Hot Work", ar: "أعمال ساخنة" },
        { value: "work_at_height", en: "Work at Height", ar: "العمل على ارتفاعات" },
        { value: "confined_space", en: "Confined Space", ar: "الأماكن المغلقة" },
        { value: "electrical", en: "Electrical Work", ar: "أعمال كهربائية" },
        { value: "excavation", en: "Excavation", ar: "الحفر" },
        { value: "lifting", en: "Lifting Operation", ar: "عمليات الرفع" },
        { value: "general", en: "General PTW", ar: "تصريح عمل عام" },
      ]}
      statuses={[
        { value: "Draft", en: "Draft", ar: "مسودة" },
        { value: "Pending Approval", en: "Pending Approval", ar: "بانتظار الموافقة" },
        { value: "Active", en: "Active", ar: "نشط" },
        { value: "Suspended", en: "Suspended", ar: "معلق" },
        { value: "Closed", en: "Closed", ar: "مغلق" },
      ]}
      defaultStatus="Draft"
    />
  );
}

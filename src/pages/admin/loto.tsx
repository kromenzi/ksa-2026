import ManagedComplianceRecords from "@/components/admin/ManagedComplianceRecords";

export default function AdminLotoPage() {
  return (
    <ManagedComplianceRecords
      resource="loto"
      prefix="LOTO"
      titleEn="Lockout Tagout (LOTO)"
      titleAr="عزل الطاقة (LOTO)"
      descriptionEn="Real energy-isolation records stored in Supabase with controlled permanent deletion."
      descriptionAr="سجلات عزل طاقة فعلية محفوظة في Supabase مع حذف دائم بصلاحيات محكومة."
      categories={[
        { value: "electrical", en: "Electrical Energy", ar: "طاقة كهربائية" },
        { value: "mechanical", en: "Mechanical Energy", ar: "طاقة ميكانيكية" },
        { value: "hydraulic", en: "Hydraulic Energy", ar: "طاقة هيدروليكية" },
        { value: "pneumatic", en: "Pneumatic Energy", ar: "طاقة هوائية" },
        { value: "thermal", en: "Thermal Energy", ar: "طاقة حرارية" },
        { value: "multi", en: "Multi-Energy Isolation", ar: "عزل متعدد مصادر الطاقة" },
      ]}
      statuses={[
        { value: "Active", en: "Active", ar: "نشط" },
        { value: "Isolated", en: "Isolated", ar: "تم العزل" },
        { value: "Verified", en: "Verified", ar: "تم التحقق" },
        { value: "Released", en: "Released", ar: "تم فك العزل" },
        { value: "Closed", en: "Closed", ar: "مغلق" },
      ]}
      defaultStatus="Active"
    />
  );
}

import ManagedComplianceRecords from "@/components/admin/ManagedComplianceRecords";

export default function AdminAuditsPage() {
  return (
    <ManagedComplianceRecords
      resource="audits"
      prefix="AUD"
      titleEn="Audits & ISO"
      titleAr="التدقيق ومواصفات ISO"
      descriptionEn="Real ISO and audit records stored in Supabase without sample audit data."
      descriptionAr="سجلات تدقيق وISO فعلية محفوظة في Supabase بدون بيانات تدقيق تجريبية."
      categories={[
        { value: "iso45001", en: "ISO 45001", ar: "ISO 45001" },
        { value: "iso14001", en: "ISO 14001", ar: "ISO 14001" },
        { value: "internal", en: "Internal Audit", ar: "تدقيق داخلي" },
        { value: "external", en: "External Audit", ar: "تدقيق خارجي" },
        { value: "legal", en: "Legal Compliance Audit", ar: "تدقيق الالتزام القانوني" },
      ]}
      statuses={[
        { value: "Planned", en: "Planned", ar: "مخطط" },
        { value: "In Progress", en: "In Progress", ar: "قيد التنفيذ" },
        { value: "Findings Open", en: "Findings Open", ar: "ملاحظات مفتوحة" },
        { value: "Completed", en: "Completed", ar: "مكتمل" },
        { value: "Closed", en: "Closed", ar: "مغلق" },
      ]}
      defaultStatus="Planned"
    />
  );
}

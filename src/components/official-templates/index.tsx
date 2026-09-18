"use client";

import EquipmentAuthorizationCard from "./equipment-authorization-card";
import ProfessionalLicenseCard from "./professional-license-card";
import FireDrillCertificate from "./fire-drill-certificate";
import SafetyTrainingCertificate from "./safety-training-certificate";
import type { OfficialHseTemplateKind, OfficialTemplateProps } from "./shared";

export type { OfficialHseTemplateData, OfficialHseTemplateKind, OfficialHseBranding } from "./shared";

export function OfficialHseTemplate({ kind, ...props }: OfficialTemplateProps & { kind: OfficialHseTemplateKind }) {
  if (kind === "equipment-authorization") return <EquipmentAuthorizationCard {...props} />;
  if (kind === "professional-license") return <ProfessionalLicenseCard {...props} />;
  if (kind === "fire-drill") return <FireDrillCertificate {...props} />;
  return <SafetyTrainingCertificate {...props} />;
}

export const OFFICIAL_HSE_TEMPLATE_META = [
  {
    kind: "equipment-authorization" as const,
    titleEn: "Equipment Authorization Card",
    titleAr: "بطاقة تفويض معدات",
    descriptionEn: "Operator authorization with QR verification, validity, trainer and approval blocks.",
    descriptionAr: "بطاقة تفويض تشغيل مع QR والصلاحية والمدرب والاعتماد.",
    format: "ID Card • Landscape",
  },
  {
    kind: "professional-license" as const,
    titleEn: "Professional License Card",
    titleAr: "بطاقة رخصة مهنية",
    descriptionEn: "Portrait professional license card for employee competency and authorization.",
    descriptionAr: "بطاقة رخصة مهنية طولية للكفاءة والتأهيل والصلاحية.",
    format: "ID Card • Portrait",
  },
  {
    kind: "fire-drill" as const,
    titleEn: "Fire Drill Certificate",
    titleAr: "شهادة تنفيذ تجربة إخلاء",
    descriptionEn: "Formal evacuation/fire drill certificate with evacuation time and verification.",
    descriptionAr: "شهادة رسمية لتجربة الإخلاء تشمل زمن الإخلاء ونقطة التجمع والتحقق.",
    format: "A4 • Landscape",
  },
  {
    kind: "safety-training" as const,
    titleEn: "Safety Training Certificate",
    titleAr: "شهادة حضور تدريب سلامة",
    descriptionEn: "Formal training certificate with participant, course, hours, signatures and QR.",
    descriptionAr: "شهادة تدريب رسمية تشمل المتدرب والدورة والساعات والتوقيعات وQR.",
    format: "A4 • Landscape",
  },
];

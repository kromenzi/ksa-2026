"use client";

import { BadgeCheck, BriefcaseBusiness, CalendarDays, GraduationCap, HardHat, MapPin, ShieldCheck, Timer, UserRound } from "lucide-react";
import {
  CertificateField, CertificateHeader, CertificateShell, CertificateSignatures, HSE_COLORS, QrBox, safeValue,
  type OfficialTemplateProps,
} from "./shared";

export default function SafetyTrainingCertificate({ data, branding, qrValue }: OfficialTemplateProps) {
  return (
    <CertificateShell>
      <CertificateHeader branding={branding} titleAr="شهادة حضور تدريب سلامة" titleEn="Safety Training Certificate" icon={<HardHat className="h-6 w-6" />} />
      <div className="mt-4 text-center">
        <div className="text-[11px] font-black" style={{ color: HSE_COLORS.navy }}>تُمنح إلى / Presented to</div>
        <div className="mx-auto mt-2 max-w-[600px] rounded-xl px-6 py-3 text-[18px] font-black" style={{ background: "#e9f1f5", color: HSE_COLORS.navy }}>
          {safeValue(data?.participantName || data?.employeeName, "Name of Participant / اسم المشارك")}
        </div>
        <div className="mt-2 text-[9px] text-slate-600">وذلك لحضور وإتمام متطلبات الدورة التدريبية بنجاح</div>
        <div className="text-[8px] text-slate-500">For attending and successfully completing the training course requirements</div>
      </div>

      <div className="mx-auto mt-4 grid max-w-[820px] grid-cols-2 gap-x-7 gap-y-2">
        <CertificateField icon={<GraduationCap className="h-5 w-5" />} en="Course Title" ar="عنوان الدورة" value={data?.courseTitle} />
        <CertificateField icon={<BriefcaseBusiness className="h-5 w-5" />} en="Department" ar="القسم" value={data?.department} />
        <CertificateField icon={<Timer className="h-5 w-5" />} en="Training Hours" ar="ساعات التدريب" value={data?.trainingHours} />
        <CertificateField icon={<UserRound className="h-5 w-5" />} en="Trainer" ar="المدرب" value={data?.trainer} />
        <CertificateField icon={<CalendarDays className="h-5 w-5" />} en="Date" ar="التاريخ" value={data?.date} />
        <CertificateField icon={<BadgeCheck className="h-5 w-5" />} en="Certificate No." ar="رقم الشهادة" value={data?.certificateNo || data?.reference} />
        <CertificateField icon={<MapPin className="h-5 w-5" />} en="Location" ar="الموقع" value={data?.location || data?.factory} />
        <CertificateField icon={<ShieldCheck className="h-5 w-5" />} en="Status" ar="الحالة" value="Completed / مكتمل" />
      </div>

      <div className="mt-5 flex items-end gap-6">
        <div className="flex-1">
          <CertificateSignatures items={[
            { en: "Trainer", ar: "المدرب", value: data?.trainer },
            { en: "HSE Manager", ar: "مدير الصحة والسلامة والبيئة" },
            { en: "Approved By", ar: "يعتمد من", value: data?.approver },
          ]} />
        </div>
        <QrBox value={qrValue || data?.certificateNo || data?.reference} certificate />
      </div>

      <div className="absolute bottom-0 left-0 right-0 py-2 text-center text-[8px] font-bold tracking-[.2em] text-white" style={{ background: "linear-gradient(90deg,#0b3a67,#0f8f8a)" }}>
        PEOPLE • SAFETY • ENVIRONMENT • SUSTAINABLE SUCCESS
      </div>
    </CertificateShell>
  );
}

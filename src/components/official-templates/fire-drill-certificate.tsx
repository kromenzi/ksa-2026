"use client";

import { Award, CalendarDays, Flame, MapPin, ShieldCheck, Timer, UserRound, UsersRound } from "lucide-react";
import {
  CertificateField, CertificateHeader, CertificateShell, CertificateSignatures, HSE_COLORS, QrBox, safeValue,
  type OfficialTemplateProps,
} from "./shared";

export default function FireDrillCertificate({ data, branding, qrValue }: OfficialTemplateProps) {
  return (
    <CertificateShell>
      <CertificateHeader branding={branding} titleAr="شهادة تنفيذ تجربة إخلاء" titleEn="Fire Drill Certificate" icon={<Flame className="h-6 w-6" />} />
      <div className="mt-3 text-center">
        <div className="text-[11px] font-bold" style={{ color: HSE_COLORS.navy }}>
          تشهد الإدارة بأن <span className="inline-block min-w-[260px] border-b border-dotted px-2">{safeValue(data?.factory || data?.department, "")}</span>
        </div>
        <div className="mt-1 text-[9px] text-slate-600">has successfully conducted a fire drill in accordance with approved HSE procedures.</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <CertificateField icon={<CalendarDays className="h-5 w-5" />} en="Date" ar="التاريخ" value={data?.date} />
          <CertificateField icon={<MapPin className="h-5 w-5" />} en="Location" ar="الموقع" value={data?.location} />
          <CertificateField icon={<Award className="h-5 w-5" />} en="Scenario" ar="سيناريو التمرين" value={data?.scenario} />
          <CertificateField icon={<UsersRound className="h-5 w-5" />} en="Participants" ar="المشاركون" value={data?.participants} />
        </div>
        <div className="space-y-2">
          <CertificateField icon={<Timer className="h-5 w-5" />} en="Evacuation Time" ar="زمن الإخلاء" value={data?.evacuationTime} />
          <CertificateField icon={<UsersRound className="h-5 w-5" />} en="Assembly Point" ar="نقطة التجمع" value={data?.assemblyPoint} />
          <CertificateField icon={<UserRound className="h-5 w-5" />} en="Coordinator" ar="المنسق" value={data?.coordinator} />
          <CertificateField icon={<ShieldCheck className="h-5 w-5" />} en="Safety Officer" ar="مسؤول السلامة" value={data?.safetyOfficer} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div className="flex items-center gap-2 text-red-600">
          <Flame className="h-12 w-12" />
          <div className="text-[11px] font-black leading-4">FIRE DRILLS<br />SAVE LIVES<br /><span className="text-[10px]">تمارين الإخلاء تنقذ الأرواح</span></div>
        </div>
        <div className="flex-1 px-8">
          <CertificateSignatures items={[
            { en: "Safety Officer", ar: "مسؤول السلامة", value: data?.safetyOfficer },
            { en: "Coordinator", ar: "المنسق", value: data?.coordinator },
            { en: "Approved By", ar: "الاعتماد", value: data?.approver },
          ]} />
        </div>
        <QrBox value={qrValue || data?.reference || data?.certificateNo} certificate />
      </div>

      <div className="absolute bottom-0 left-0 right-0 py-2 text-center text-[8px] font-bold tracking-[.2em] text-white" style={{ background: HSE_COLORS.navy }}>
        A SAFER TODAY • A BRIGHTER TOMORROW | بيئة أكثر أماناً لمستقبل أفضل
      </div>
    </CertificateShell>
  );
}

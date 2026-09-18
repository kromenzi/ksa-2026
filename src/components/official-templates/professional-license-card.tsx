"use client";

import { Award, BadgeCheck, BriefcaseBusiness, CalendarDays, Factory, GraduationCap, UserRound } from "lucide-react";
import {
  CardField, CompanyBrand, HSE_COLORS, HseBadge, PhotoBox, QrBox, SecurityPattern, SignatureBox,
  type OfficialTemplateProps,
} from "./shared";

export default function ProfessionalLicenseCard({ data, branding, qrValue }: OfficialTemplateProps) {
  return (
    <div
      className="official-hse-template relative mx-auto aspect-[.69/1] w-full max-w-[520px] overflow-hidden rounded-[24px] border bg-white shadow-xl"
      style={{ fontFamily: "'Cairo','Noto Sans Arabic',Arial,sans-serif", color: HSE_COLORS.ink, borderColor: "#d7e4ea" }}
    >
      <SecurityPattern />
      <div className="relative z-10">
        <div className="px-7 pt-5">
          <div className="flex items-center justify-between">
            <CompanyBrand branding={branding} />
            <div className="text-right">
              <div className="text-[12px] font-black" style={{ color: HSE_COLORS.navy }}>السلامة أولاً</div>
              <div className="text-[10px] font-bold" style={{ color: HSE_COLORS.navy }}>SAFETY FIRST</div>
            </div>
          </div>
        </div>

        <div className="mt-3 px-7 py-5 text-white" style={{ background: "linear-gradient(120deg,#08355e,#075985 60%,#1987b3)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[24px] font-black">بطاقة رخصة مهنية</div>
              <div className="text-[18px] font-black">Professional License Card</div>
              <div className="mt-2 text-[7px] font-bold tracking-[.2em] opacity-80">PEOPLE | SAFETY | SUSTAINABILITY | EXCELLENCE</div>
            </div>
            <HseBadge />
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr] gap-5 px-7 py-5">
          <div className="space-y-3">
            <PhotoBox src={data?.photoUrl} portrait />
            <QrBox value={qrValue || data?.reference} />
            <SignatureBox en="Authorized By" ar="اعتماد" value={data?.approver || "HSE MANAGER"} />
          </div>
          <div className="space-y-2.5 pt-1">
            <CardField en="License No." ar="رقم الرخصة" value={data?.reference} icon={<BadgeCheck className="h-4 w-4" />} />
            <CardField en="Employee Name" ar="اسم الموظف" value={data?.employeeName} icon={<UserRound className="h-4 w-4" />} />
            <CardField en="National ID" ar="رقم الهوية" value={data?.nationalId || data?.employeeId} icon={<Award className="h-4 w-4" />} />
            <CardField en="Job Title" ar="المسمى الوظيفي" value={data?.jobTitle} icon={<BriefcaseBusiness className="h-4 w-4" />} />
            <CardField en="Department" ar="القسم" value={data?.department} icon={<Factory className="h-4 w-4" />} />
            <CardField en="Qualification" ar="المؤهل" value={data?.qualification || data?.licenseType} icon={<GraduationCap className="h-4 w-4" />} />
            <CardField en="Valid Until" ar="صالح حتى" value={data?.expiryDate} icon={<CalendarDays className="h-4 w-4" />} />
            <div className="mt-5 text-center">
              <div className="text-[12px] font-black" style={{ color: HSE_COLORS.navy }}>معاً لبيئة عمل أكثر أماناً</div>
              <div className="text-[8px] font-bold text-slate-500">TOGETHER FOR A SAFER WORKPLACE</div>
            </div>
          </div>
        </div>

        <div className="px-7 py-3 text-center text-[8px] font-bold tracking-[.25em] text-white" style={{ background: HSE_COLORS.navy }}>
          SAFETY TODAY • A STRONGER TOMORROW
        </div>
      </div>
    </div>
  );
}

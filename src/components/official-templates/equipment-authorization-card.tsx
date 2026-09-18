"use client";

import { Award, BadgeCheck, BriefcaseBusiness, Factory, UserRound } from "lucide-react";
import {
  CardField, CompanyBrand, HSE_COLORS, HseBadge, PhotoBox, QrBox, SecurityPattern, SignatureBox,
  type OfficialTemplateProps,
} from "./shared";

export default function EquipmentAuthorizationCard({ data, branding, qrValue }: OfficialTemplateProps) {
  return (
    <div
      className="official-hse-template relative mx-auto aspect-[1.59/1] w-full max-w-[900px] overflow-hidden rounded-[22px] border bg-white shadow-xl"
      style={{ fontFamily: "'Cairo','Noto Sans Arabic',Arial,sans-serif", color: HSE_COLORS.ink, borderColor: "#d6e5ec" }}
    >
      <SecurityPattern />
      <div className="relative z-10">
        <div className="flex items-center justify-between px-7 py-4">
          <CompanyBrand branding={branding} />
          <div className="text-center">
            <div className="text-[12px] font-black" style={{ color: HSE_COLORS.teal }}>السلامة أولاً ... لنصنع غداً أفضل</div>
            <div className="text-[9px] font-bold" style={{ color: HSE_COLORS.navy }}>Safety First ... A Stronger Tomorrow</div>
          </div>
          <div className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: "#c7dbe5" }}>
            <div className="text-[8px] font-bold text-slate-500">SAUDI INDUSTRIAL HSE</div>
            <div className="text-[15px] font-black" style={{ color: HSE_COLORS.navy }}>2030</div>
          </div>
        </div>

        <div className="relative flex items-center gap-5 overflow-hidden px-7 py-4 text-white" style={{ background: "linear-gradient(110deg,#06365e 0%,#075985 55%,#0c9aa0 100%)" }}>
          <HseBadge />
          <div className="flex-1">
            <div className="text-[30px] font-black leading-tight">بطاقة تفويض معدات</div>
            <div className="text-[22px] font-black leading-tight">Equipment Authorization Card</div>
          </div>
          <Factory className="h-20 w-20 opacity-30" />
          <div className="text-[8px] font-bold leading-4 opacity-80">PEOPLE<br />PROCESS<br />SAFETY<br />SUSTAINABILITY</div>
        </div>

        <div className="grid grid-cols-[120px_1fr_118px] gap-5 px-7 py-4">
          <div className="space-y-3">
            <PhotoBox src={data?.photoUrl} />
            <div className="text-[8px] font-bold leading-4" style={{ color: HSE_COLORS.navy }}>SAFE PEOPLE<br />PRODUCTIVE PLACES<br />THRIVING TOGETHER</div>
          </div>

          <div className="space-y-2">
            <CardField en="Card No." ar="رقم البطاقة" value={data?.reference} icon={<BadgeCheck className="h-4 w-4" />} />
            <CardField en="Employee Name" ar="اسم الموظف" value={data?.employeeName} icon={<UserRound className="h-4 w-4" />} />
            <CardField en="Employee ID" ar="الرقم الوظيفي" value={data?.employeeId} icon={<Award className="h-4 w-4" />} />
            <CardField en="Department" ar="القسم" value={data?.department} icon={<BriefcaseBusiness className="h-4 w-4" />} />
            <CardField en="Authorized Equipment" ar="المعدة المصرح بها" value={data?.authorizedEquipment || data?.licenseType} icon={<Factory className="h-4 w-4" />} />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border px-3 py-2 text-[9px]" style={{ borderColor: "#bfd3df" }}><b>Issue Date</b> : {data?.issueDate || "—"} <span className="float-right font-bold">تاريخ الإصدار</span></div>
              <div className="rounded-lg border px-3 py-2 text-[9px]" style={{ borderColor: "#bfd3df" }}><b>Expiry Date</b> : {data?.expiryDate || "—"} <span className="float-right font-bold">تاريخ الانتهاء</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SignatureBox en="Trainer" ar="المدرب" value={data?.trainer} />
              <SignatureBox en="Approver" ar="الاعتماد" value={data?.approver} />
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <QrBox value={qrValue || data?.reference} />
            <div className="rounded-tl-[28px] p-3 text-[8px] font-bold leading-4 text-white" style={{ background: HSE_COLORS.navy }}>
              AUTHORIZED<br />TRAINED<br />QUALIFIED<br />SAFER OPERATIONS
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-7 py-2 text-[8px] font-bold" style={{ borderColor: "#d7e6ec", color: HSE_COLORS.navy }}>
          <span>THIS CARD IS THE PROPERTY OF THE COMPANY • MUST BE SURRENDERED UPON REQUEST</span>
          <span>هذه البطاقة ملك للشركة ويجب إعادتها عند الطلب</span>
        </div>
      </div>
    </div>
  );
}

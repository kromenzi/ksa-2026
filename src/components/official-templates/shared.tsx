"use client";

import { BadgeCheck, ShieldCheck, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export type OfficialHseTemplateKind =
  | "professional-license"
  | "equipment-authorization"
  | "safety-training"
  | "fire-drill";

export type OfficialHseTemplateData = {
  reference?: string;
  employeeName?: string;
  employeeId?: string;
  nationalId?: string;
  jobTitle?: string;
  department?: string;
  qualification?: string;
  licenseType?: string;
  authorizedEquipment?: string;
  issueDate?: string;
  expiryDate?: string;
  trainer?: string;
  approver?: string;
  photoUrl?: string;
  participantName?: string;
  courseTitle?: string;
  trainingHours?: string;
  date?: string;
  location?: string;
  scenario?: string;
  participants?: string;
  evacuationTime?: string;
  assemblyPoint?: string;
  coordinator?: string;
  safetyOfficer?: string;
  certificateNo?: string;
  factory?: string;
  notes?: string;
};

export type OfficialHseBranding = {
  companyName?: string;
  companyLogo?: string;
  documentFooter?: string;
  departmentName?: string;
  safetyDepartmentName?: string;
};

export interface OfficialTemplateProps {
  data?: OfficialHseTemplateData;
  branding?: OfficialHseBranding;
  qrValue?: string;
}

export const HSE_COLORS = {
  navy: "#0b3a67",
  blue: "#075985",
  teal: "#0f8f8a",
  green: "#24a447",
  ink: "#0f2742",
};

export function safeValue(input?: string, fallback = "—") {
  return input && input.trim() ? input : fallback;
}

export function SecurityPattern() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 5%, rgba(15,143,138,.10), transparent 26%), radial-gradient(circle at 92% 94%, rgba(11,58,103,.09), transparent 30%), linear-gradient(145deg,#ffffff 0%,#fbfdfe 50%,#f2f8fa 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #0f8f8a 0 1px, transparent 1px), repeating-linear-gradient(135deg, transparent 0 10px, #0b3a67 10px 11px, transparent 11px 20px)",
          backgroundSize: "18px 18px,36px 36px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[24px]"
        style={{ borderColor: "rgba(15,143,138,.06)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full border-[30px]"
        style={{ borderColor: "rgba(11,58,103,.05)" }}
      />
    </>
  );
}

export function CompanyBrand({ branding, light = false }: { branding?: OfficialHseBranding; light?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {branding?.companyLogo ? (
        <img src={branding.companyLogo} alt={branding.companyName || "Company"} className="h-10 w-16 object-contain" />
      ) : (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: light ? "rgba(255,255,255,.16)" : "#e5f5f5", color: light ? "#fff" : HSE_COLORS.teal }}
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
      )}
      <div className="leading-tight">
        <div className="max-w-[220px] break-words text-[13px] font-black tracking-wide" style={{ color: light ? "#fff" : HSE_COLORS.navy }}>
          {branding?.companyName || "YOUR COMPANY"}
        </div>
        <div className="text-[8px] font-semibold tracking-[.14em]" style={{ color: light ? "rgba(255,255,255,.8)" : "#55758f" }}>
          SAFER PEOPLE • STRONGER TOMORROW
        </div>
      </div>
    </div>
  );
}

export function HseBadge() {
  return (
    <div
      className="flex h-[66px] w-[66px] shrink-0 flex-col items-center justify-center rounded-full border-4 text-center shadow-sm"
      style={{ borderColor: "#8ee3df", background: "rgba(4,49,82,.92)", color: "#fff" }}
    >
      <div className="text-[20px] font-black leading-none">HSE</div>
      <div className="mt-1 text-[6px] font-bold leading-tight">HEALTH<br />SAFETY<br />ENVIRONMENT</div>
    </div>
  );
}

export function QrBox({ value, certificate = false }: { value?: string; certificate?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-white p-2 text-center shadow-sm" style={{ borderColor: "#bfd3df" }}>
      <QRCodeSVG value={value || "HSE-TEMPLATE"} size={68} level="M" includeMargin={false} />
      <div className="text-[8px] font-black" style={{ color: HSE_COLORS.navy }}>
        {certificate ? "VERIFY CERTIFICATE" : "SCAN TO VERIFY"}
      </div>
      <div className="text-[8px] font-bold" style={{ color: HSE_COLORS.navy }}>
        {certificate ? "التحقق من الشهادة" : "امسح للتحقق"}
      </div>
    </div>
  );
}

export function PhotoBox({ src, portrait = false }: { src?: string; portrait?: boolean }) {
  return (
    <div
      className={"overflow-hidden rounded-xl border-2 bg-slate-100 " + (portrait ? "h-[150px] w-[120px]" : "h-[126px] w-[104px]")}
      style={{ borderColor: "#b8cad6" }}
    >
      {src ? (
        <img src={src} alt="Employee" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-slate-400">
          <UserRound className="h-14 w-14" />
          <span className="mt-1 text-[10px] font-bold">PHOTO</span>
        </div>
      )}
    </div>
  );
}

export function CardField({ en, ar, value, icon }: { en: string; ar: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[18px_minmax(76px,104px)_minmax(0,1fr)_minmax(68px,88px)] items-center gap-1.5 text-[9px]">
      <div style={{ color: HSE_COLORS.blue }}>{icon || <BadgeCheck className="h-4 w-4" />}</div>
      <div className="min-w-0 font-bold leading-tight" style={{ color: HSE_COLORS.navy }}>{en}</div>
      <div className="min-h-[27px] min-w-0 break-words rounded-md px-2 py-1.5 font-semibold leading-tight" style={{ background: "rgba(237,242,245,.92)", color: HSE_COLORS.ink }}>
        {safeValue(value, "")}
      </div>
      <div className="min-w-0 text-right font-bold leading-tight" style={{ color: HSE_COLORS.navy }}>{ar}</div>
    </div>
  );
}

export function SignatureBox({ en, ar, value }: { en: string; ar: string; value?: string }) {
  return (
    <div className="rounded-lg border bg-white/80 px-3 py-2" style={{ borderColor: "#b7cbd8" }}>
      <div className="flex items-center justify-between text-[9px] font-bold" style={{ color: HSE_COLORS.navy }}>
        <span>{en}</span><span>{ar}</span>
      </div>
      <div className="mt-3 border-b" style={{ borderColor: "#5d7890" }} />
      {value ? <div className="mt-1 text-center text-[8px] font-semibold text-slate-500">{value}</div> : null}
    </div>
  );
}

export function CertificateShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="official-hse-template relative mx-auto aspect-[1.414/1] w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-[14px] shadow-xl"
      style={{ fontFamily: "'Cairo','Noto Sans Arabic',Arial,sans-serif", color: HSE_COLORS.ink }}
    >
      <SecurityPattern />
      <div className="relative z-10 h-full border-[3px] p-6" style={{ borderColor: HSE_COLORS.navy, boxShadow: "inset 0 0 0 2px #d7b65d" }}>
        {children}
      </div>
    </div>
  );
}

export function CertificateHeader({
  branding,
  titleAr,
  titleEn,
  icon,
}: {
  branding?: OfficialHseBranding;
  titleAr: string;
  titleEn: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        <CompanyBrand branding={branding} />
        <div className="text-center">
          <div className="text-[11px] font-black" style={{ color: HSE_COLORS.navy }}>السلامة مسؤولية مشتركة</div>
          <div className="text-[8px] font-bold tracking-wide text-slate-500">SAFETY IS A SHARED RESPONSIBILITY</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black" style={{ color: HSE_COLORS.teal }}>الصحة والسلامة والبيئة</div>
          <div className="text-[8px] font-bold" style={{ color: HSE_COLORS.navy }}>HEALTH, SAFETY & ENVIRONMENT</div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-[33px] font-black leading-tight" style={{ color: HSE_COLORS.navy }}>{titleAr}</div>
        <div className="text-[25px] font-black leading-tight" style={{ color: HSE_COLORS.navy }}>{titleEn}</div>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div className="h-px w-32" style={{ background: HSE_COLORS.blue }} />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: HSE_COLORS.teal }}>{icon}</div>
          <div className="h-px w-32" style={{ background: HSE_COLORS.blue }} />
        </div>
      </div>
    </>
  );
}

export function CertificateField({ icon, en, ar, value }: { icon: React.ReactNode; en: string; ar: string; value?: string }) {
  return (
    <div className="grid grid-cols-[28px_120px_1fr] items-center gap-2 border px-3 py-2" style={{ borderColor: "#d0dee6", background: "rgba(239,247,250,.72)" }}>
      <div style={{ color: HSE_COLORS.navy }}>{icon}</div>
      <div>
        <div className="text-[9px] font-black" style={{ color: HSE_COLORS.navy }}>{ar}</div>
        <div className="text-[8px] font-bold text-slate-500">{en}</div>
      </div>
      <div className="border-b border-dotted px-2 py-1 text-[9px] font-semibold" style={{ borderColor: "#7691a5" }}>{safeValue(value, "")}</div>
    </div>
  );
}

export function CertificateSignatures({ items }: { items: Array<{ en: string; ar: string; value?: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {items.map(item => (
        <div key={item.en} className="text-center">
          <div className="text-[10px] font-black" style={{ color: HSE_COLORS.navy }}>{item.ar}</div>
          <div className="text-[9px] font-bold" style={{ color: HSE_COLORS.navy }}>{item.en}</div>
          <div className="mx-auto mt-6 w-40 border-b" style={{ borderColor: HSE_COLORS.navy }} />
          <div className="mt-1 text-[8px] text-slate-500">{item.value || "Signature / التوقيع"}</div>
        </div>
      ))}
    </div>
  );
}

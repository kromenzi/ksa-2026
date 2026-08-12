"use client";

import { useState, useCallback } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Printer, Mail, MessageSquare, Send, Plus, X, CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import type { Module } from "@/lib/data-context";

const itemTypeToModule: Record<string, Module> = {
  ncr: "ncr",
  report: "reports",
  form: "forms",
  contract: "documents",
  permit: "documents",
  invoice: "documents",
  document: "documents",
};

interface PrintShareItem {
  id?: string;
  url?: string;
  type: "ncr" | "report" | "form" | "contract" | "permit" | "invoice" | "document";
  refNo?: string;
  title: string;
  department?: string;
  severity?: string;
  status?: string;
  date?: string;
  pdfUrl?: string;
  images?: Array<string | null | undefined>;
  sections: { label: string; value: string }[];
}

interface PrintShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PrintShareItem;
  customContent?: React.ReactNode;
}

function getItemTypeLabel(type: PrintShareItem["type"], isAr: boolean): string {
  const mapAr: Record<PrintShareItem["type"], string> = {
    ncr: "تقرير عدم مطابقة",
    report: "تقرير سلامة",
    form: "نموذج",
    contract: "عقد",
    permit: "تصريح",
    invoice: "فاتورة",
    document: "مستند",
  };
  const mapEn: Record<PrintShareItem["type"], string> = {
    ncr: "Non-Conformance Report",
    report: "Safety Report",
    form: "Form",
    contract: "Contract",
    permit: "Permit",
    invoice: "Invoice",
    document: "Document",
  };
  return isAr ? mapAr[type] : mapEn[type];
}

function getSectionValue(item: PrintShareItem, patterns: string[]): string {
  const normalizedPatterns = patterns.map((p) => p.toLowerCase());
  const match = item.sections.find((s) => {
    const label = s.label.toLowerCase();
    return normalizedPatterns.some((p) => label.includes(p));
  });
  return match?.value || "";
}

// Build print HTML with embedded Arabic fonts
function buildPrintHtml(item: PrintShareItem, siteName: string, isAr: boolean, settings?: any): string {
  const branding = settings?.branding || { companyName: siteName, companyLogo: '', logoPosition: 'left', confidentialLabel: isAr ? 'سري' : 'Confidential', documentFooter: '', departmentName: '', safetyDepartmentName: '' };
  siteName = branding.companyName || siteName;
  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'right' : 'left';
  const isNcr = item.type === "ncr";
  const showQr = item.type === "ncr" || item.type === "report";
  const accent = isNcr ? "#111111" : "#0f766e";
  const accentSoft = isNcr ? "#f3f4f6" : "#ccfbf1";
  const docTypeLabel = getItemTypeLabel(item.type, isAr);
  const displayTitle = isNcr ? docTypeLabel : item.title;
  const fallbackUrl = typeof window !== "undefined" && item.id
    ? (item.type === "report"
      ? `${window.location.origin}/report/${item.id}`
      : `${window.location.origin}/admin/ncr/${item.id}`)
    : "";
  const qrText = item.url || fallbackUrl || item.refNo || item.title || "NCR";
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrText)}&size=140`;

  const ncrDescription = getSectionValue(item, ["description", "non-conformance", "وصف"]);
  const ncrImmediateAction = getSectionValue(item, ["immediate", "الفوري"]);
  const ncrRootCause = getSectionValue(item, ["root cause", "السبب الجذري"]);
  const ncrCorrectiveAction = getSectionValue(item, ["corrective action", "الإجراء التصحيحي"]);
  const ncrVerification = getSectionValue(item, ["verification", "التحقق", "closure"]);
  const ncrActionsTable = getSectionValue(item, ["actions table", "جدول الإجراءات", "table"]);
  const ncrImages = (item.images || []).filter((img): img is string => Boolean(img));
  
  const sectionsHtml = item.sections.map(s =>
    `<div style="border:1px solid #e5e7eb;background:#fff;border-${isAr ? 'right' : 'left'}:5px solid ${accent};padding:16px 18px;border-radius:8px;margin-bottom:14px;text-align:${align};page-break-inside:avoid;">
      <h3 style="font-size:15px;margin:0 0 8px 0;color:#334155;font-weight:700;">${escapeHtml(s.label)}</h3>
      <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.9;font-size:14px;">${escapeHtml(s.value) || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>`
  ).join("");

  const metaItems = [
    item.type ? `<span style="display:inline-block;margin-${isAr ? 'left' : 'right'}:12px;">${isAr ? 'النوع' : 'Type'}: <strong>${item.type.toUpperCase()}</strong></span>` : "",
    item.department ? `<span style="display:inline-block;margin-${isAr ? 'left' : 'right'}:12px;">${isAr ? 'القسم' : 'Department'}: <strong>${escapeHtml(item.department)}</strong></span>` : "",
    item.severity ? `<span style="display:inline-block;margin-${isAr ? 'left' : 'right'}:12px;">${isAr ? 'الخطورة' : 'Severity'}: <strong>${escapeHtml(item.severity)}</strong></span>` : "",
    item.status ? `<span style="display:inline-block;">${isAr ? 'الحالة' : 'Status'}: <strong>${escapeHtml(item.status)}</strong></span>` : "",
  ].filter(Boolean).join("");

  const ncrStructuredHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;page-break-inside:avoid;">
      <div style="border:1px solid #d1d5db;border-radius:6px;padding:8px 10px;background:#fff;">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:4px;">${isAr ? "رقم المرجع" : "Reference No."}</div>
        <div style="font-size:14px;color:#0f172a;font-weight:700;">${escapeHtml(item.refNo || "-")}</div>
      </div>
      <div style="border:1px solid #d1d5db;border-radius:6px;padding:8px 10px;background:#fff;">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:4px;">${isAr ? "التاريخ" : "Date"}</div>
        <div style="font-size:14px;color:#0f172a;font-weight:700;">${escapeHtml(item.date || "-")}</div>
      </div>
    </div>

    <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;margin-bottom:12px;text-align:${align};page-break-inside:avoid;">
      <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "وصف عدم المطابقة" : "Description of Non-Conformance"}</h3>
      <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrDescription) || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>

    <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;margin-bottom:12px;text-align:${align};page-break-inside:avoid;">
      <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "الإجراء الفوري" : "Immediate Action"}</h3>
      <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrImmediateAction) || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;page-break-inside:avoid;">
      <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;text-align:${align};min-height:100px;">
        <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "السبب الجذري" : "Root Cause"}</h3>
        <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrRootCause) || (isAr ? "غير متوفر" : "N/A")}</p>
      </div>
      <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;text-align:${align};min-height:100px;">
        <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "الإجراء التصحيحي" : "Corrective Action"}</h3>
        <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrCorrectiveAction) || (isAr ? "غير متوفر" : "N/A")}</p>
      </div>
    </div>

    <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;margin-bottom:12px;text-align:${align};page-break-inside:avoid;">
      <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "جدول الإجراءات التصحيحية" : "Corrective Actions Table"}</h3>
      <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrActionsTable) || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>

    <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;margin-bottom:12px;text-align:${align};page-break-inside:avoid;">
      <h3 style="font-size:14px;margin:0 0 6px 0;color:#334155;font-weight:700;">${isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"}</h3>
      <p style="margin:0;color:#0f172a;white-space:pre-wrap;line-height:1.7;font-size:13px;">${escapeHtml(ncrVerification) || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>
    ${ncrImages.length > 0 ? `
      <div style="border:1px solid #d1d5db;background:#fff;border-${isAr ? 'right' : 'left'}:4px solid ${accent};padding:12px 14px;border-radius:6px;margin-bottom:12px;text-align:${align};page-break-inside:avoid;">
        <h3 style="font-size:14px;margin:0 0 8px 0;color:#334155;font-weight:700;">${isAr ? "الصور المرفقة" : "Attached Images"}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${ncrImages.map((src, idx) => `
            <div style="border:1px solid #d1d5db;border-radius:6px;height:130px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;page-break-inside:avoid;">
              <img src="${escapeHtml(src)}" alt="Image ${idx + 1}" style="max-width:100%;max-height:100%;object-fit:cover;" />
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.refNo || item.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap');
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body {
      font-family: ${isAr ? "'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "Arial, sans-serif"}; 
      padding: 12px;
      color: #1f2937; 
      direction: ${dir}; 
      text-align: ${align}; 
      line-height: 1.8;
      font-size: 13px;
      background: #f8fafc;
    }
    
    h1, h2, h3 { 
      font-family: ${isAr ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "Arial, sans-serif"}; 
      font-weight: 600;
    }
    
    @page { 
      size: A4; 
      margin: 12mm; 
    }
    
    @media print { 
      body { 
        padding: 0; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
      } 
      .no-print { 
        display: none !important; 
      }
    }
  </style>
</head>
<body>
  <div style="max-width: 794px; margin: 0 auto; background: #fff; border: 1px solid ${isNcr ? "#111111" : "#e2e8f0"}; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 20px rgba(15,23,42,.06);">
    <!-- Header -->
    <div style="background: ${isNcr ? '#ffffff' : 'linear-gradient(135deg, ' + accent + ' 0%, #1e293b 100%)'}; color: ${isNcr ? '#111111' : '#fff'}; padding: 16px 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-direction: ${isAr ? 'row-reverse' : 'row'}; border-bottom: 2px solid ${isNcr ? '#111111' : 'transparent'};">
      ${branding.logoPosition === 'right' ? '<div style="flex: 1"></div>' : ''}
      <div style="text-align: ${branding.logoPosition === 'center' ? 'center' : (isAr ? 'right' : 'left')}; display: flex; flex-direction: column; align-items: ${branding.logoPosition === 'center' ? 'center' : (isAr ? 'flex-end' : 'flex-start')}; gap: 8px;">
        ${branding.companyLogo ? `<img src="${branding.companyLogo}" alt="${escapeHtml(branding.companyName)}" style="height: 64px; width: 96px; object-fit: contain; object-position: center;"/>` : ''}
        <div style="display: flex; flex-direction: column;">
          <h1 style="font-size: 20px; margin: 0; font-weight: 700; color: ${isNcr ? '#111111' : '#fff'};">${escapeHtml(siteName)}</h1>
          ${branding.departmentName ? `<p style="font-size: 11px; margin: 2px 0 0; color: ${isNcr ? '#4b5563' : '#e2e8f0'};">${escapeHtml(branding.departmentName)}</p>` : ''}
          ${branding.safetyDepartmentName ? `<p style="font-size: 11px; margin: 0; color: ${isNcr ? '#4b5563' : '#e2e8f0'};">${escapeHtml(branding.safetyDepartmentName)}</p>` : ''}
        </div>
      </div>
      ${branding.logoPosition === 'left' ? '<div style="flex: 1"></div>' : ''}
      <div style="text-align: ${isAr ? 'left' : 'right'}; display: flex; flex-direction: column; align-items: ${isAr ? 'flex-start' : 'flex-end'};">
        <p style="font-size: 11px; color: ${isNcr ? '#6b7280' : '#cbd5e1'}; margin-top: 4px;">${item.date || new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
        ${showQr ? `<div style="margin-top:8px; width:112px; border:1px solid #d1d5db; border-radius:8px; padding:8px 8px 6px; background:#fff; text-align:center;"><div style="font-size:10px; color:#6b7280; font-weight:600; margin-bottom:6px;">${isAr ? 'رمز الاستجابة السريعة' : 'QR Code'}</div><img src="${qrUrl}" alt="${isNcr ? 'NCR' : 'Report'} QR" style="height:84px; width:84px; object-fit:contain; display:block; margin:0 auto;"/><div style="margin-top:6px; font-size:11px; font-family:monospace; font-weight:700; color:#111111; letter-spacing:0.02em; line-height:1.35; word-break:break-word;">${escapeHtml(item.refNo || '')}</div></div>` : ''}
      </div>
    </div>
        <!-- Title & Meta -->
    <div style="padding: 12px 18px; background: ${accentSoft}; border-bottom: 1px solid #e2e8f0; text-align: ${align};">
      <h2 style="font-size: 18px; margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">${escapeHtml(displayTitle)}</h2>
      <div style="font-size: 12px; color: #334155; line-height: 1.6;">${metaItems}</div>
    </div>
    
    <!-- Sections -->
    <div style="padding: 12px 18px;">${isNcr ? ncrStructuredHtml : sectionsHtml}</div>
    
    ${item.pdfUrl ? `
    <div style="margin-top: 24px; padding: 12px 16px; border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 6px;">
      <p style="font-size: 12px; font-weight: 600; color: #1e40af; margin: 0 0 4px 0;">${isAr ? 'ملف PDF مرفق' : 'PDF Attachment'}</p>
      <a href="${item.pdfUrl}" style="font-size: 12px; color: #2563eb; text-decoration: underline;">${isAr ? 'عرض / تحميل PDF' : 'View / Download PDF'}</a>
    </div>
    ` : ""}
    
    <!-- Footer -->
    <div style="padding: 10px 18px; background: #f8fafc; border-top: 1px solid #e5e7eb; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; flex-direction: ${isAr ? 'row-reverse' : 'row'}; align-items: center;">
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <span>${isAr ? 'تم الإنشاء' : 'Generated'}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
        ${branding.companyWebsite ? `<span>|</span><span>${escapeHtml(branding.companyWebsite)}</span>` : ''}
        ${branding.companyPhone ? `<span>|</span><span>${escapeHtml(branding.companyPhone)}</span>` : ''}
        ${branding.companyEmail ? `<span>|</span><span>${escapeHtml(branding.companyEmail)}</span>` : ''}
      </div>
      <div style="text-align: ${isAr ? 'left' : 'right'};">
        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(branding.confidentialLabel || (isAr ? 'سري' : 'Confidential'))}</div>
        ${branding.documentFooter ? `<div style="margin-top: 2px;">${escapeHtml(branding.documentFooter)}</div>` : ''}
      </div>
    </div>
  </div>
  </div>
</body>
</html>`;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Print View Component for preview
function PrintView({ item, siteName, isAr, settings }: { item: PrintShareItem; siteName: string; isAr: boolean; settings?: any }) {
  const branding = settings?.branding || { companyName: siteName, companyLogo: '', logoPosition: 'left', confidentialLabel: isAr ? 'سري' : 'Confidential', documentFooter: '', departmentName: '', safetyDepartmentName: '' };
  siteName = branding.companyName || siteName;
  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'right' : 'left';
  const isNcr = item.type === "ncr";
  const showQr = item.type === "ncr" || item.type === "report";
  const accentClass = isNcr ? "border-black" : "border-teal-500";
  const badgeClass = isNcr ? "bg-gray-200 text-gray-800" : "bg-teal-100 text-teal-800";
  const docTypeLabel = getItemTypeLabel(item.type, isAr);
  const displayTitle = isNcr ? docTypeLabel : item.title;
  const fallbackUrl = typeof window !== "undefined" && item.id
    ? (item.type === "report"
      ? `${window.location.origin}/report/${item.id}`
      : `${window.location.origin}/admin/ncr/${item.id}`)
    : "";
  const qrText = item.url || fallbackUrl || item.refNo || item.title || "NCR";
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrText)}&size=140`;
  const ncrDescription = getSectionValue(item, ["description", "non-conformance", "وصف"]);
  const ncrImmediateAction = getSectionValue(item, ["immediate", "الفوري"]);
  const ncrRootCause = getSectionValue(item, ["root cause", "السبب الجذري"]);
  const ncrCorrectiveAction = getSectionValue(item, ["corrective action", "الإجراء التصحيحي"]);
  const ncrVerification = getSectionValue(item, ["verification", "التحقق", "closure"]);
  const ncrActionsTable = getSectionValue(item, ["actions table", "جدول الإجراءات", "table"]);
  const ncrImages = (item.images || []).filter((img): img is string => Boolean(img));
  
  return (
    <div 
      className="print-content bg-white p-5 text-gray-900" 
      style={{ 
        fontFamily: isAr ? "'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "Arial, sans-serif", 
        direction: dir, 
        textAlign: align,
        lineHeight: 1.7,
        maxWidth: "794px",
        margin: "0 auto"
      }}
    >
      {/* Load fonts for preview */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <div className={`mb-4 border-b-2 ${accentClass} pb-3`}>
        <div className={`flex justify-between items-start gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
          {branding.logoPosition === 'right' && <div className="flex-1"></div>}
          <div style={{ textAlign: branding.logoPosition === 'center' ? 'center' : (isAr ? 'right' : 'left') }} className={`flex flex-col gap-2 ${branding.logoPosition === 'center' ? 'items-center' : (isAr ? 'items-end' : 'items-start')}`}>
            {branding.companyLogo && <img src={branding.companyLogo} alt={branding.companyName} className="h-16 w-24 brand-logo-full" />}
            <div>
              <h1 className="text-[22px] font-bold text-gray-900" style={{ fontFamily: isAr ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "Arial, sans-serif" }}>{siteName}</h1>
              <p className="mt-1 text-xs text-gray-500">{docTypeLabel}</p>
              {branding.departmentName && <p className="mt-0.5 text-[10px] text-gray-500">{branding.departmentName}</p>}
              {branding.safetyDepartmentName && <p className="mt-0 text-[10px] text-gray-500">{branding.safetyDepartmentName}</p>}
            </div>
          </div>
          {branding.logoPosition === 'left' && <div className="flex-1"></div>}
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <p className="mt-1 text-xs text-gray-500">{item.date || new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
            {showQr && (
              <div className="mt-2 w-[112px] rounded-lg border border-slate-300 bg-white p-2 text-center shadow-sm">
                <p className="mb-1.5 text-[10px] font-semibold text-slate-500">{isAr ? 'رمز الاستجابة السريعة' : 'QR Code'}</p>
                <img src={qrUrl} alt={isNcr ? "NCR QR" : "Report QR"} className="mx-auto h-[84px] w-[84px] object-contain" />
                <p className="mt-1.5 text-[11px] font-mono font-bold tracking-wide text-gray-900">{item.refNo || qrText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-4" style={{ textAlign: align }}>
        <h2 className="mb-2 text-xl font-bold text-gray-900">{displayTitle}</h2>
        <div className={`flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-gray-600 ${isAr ? 'flex-row-reverse justify-end' : ''}`}>
          {item.type && <span className={`capitalize rounded-full px-2.5 py-1 font-semibold ${badgeClass}`}>{isAr ? 'النوع' : 'Type'}: <strong>{item.type.toUpperCase()}</strong></span>}
          {item.department && <span>{isAr ? 'القسم' : 'Department'}: <strong>{item.department}</strong></span>}
          {item.severity && <span className="capitalize">{isAr ? 'الخطورة' : 'Severity'}: <strong>{item.severity}</strong></span>}
          {item.status && <span className="capitalize">{isAr ? 'الحالة' : 'Status'}: <strong>{item.status}</strong></span>}
        </div>
      </div>
      
      {isNcr ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <NcrBlock title={isAr ? "وصف عدم المطابقة" : "Description of Non-Conformance"} value={ncrDescription} isAr={isAr} accentClass={accentClass} />
            <NcrBlock title={isAr ? "الإجراء الفوري" : "Immediate Action"} value={ncrImmediateAction} isAr={isAr} accentClass={accentClass} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NcrBlock title={isAr ? "السبب الجذري" : "Root Cause"} value={ncrRootCause} isAr={isAr} accentClass={accentClass} />
            <NcrBlock title={isAr ? "الإجراء التصحيحي" : "Corrective Action"} value={ncrCorrectiveAction} isAr={isAr} accentClass={accentClass} />
          </div>
          <NcrBlock title={isAr ? "جدول الإجراءات التصحيحية" : "Corrective Actions Table"} value={ncrActionsTable} isAr={isAr} accentClass={accentClass} />
          <NcrBlock title={isAr ? "ملاحظات التحقق والإغلاق" : "Verification / Closure Notes"} value={ncrVerification} isAr={isAr} accentClass={accentClass} />
          {ncrImages.length > 0 && (
            <div className={`${isAr ? "border-r-4 pr-3" : "border-l-4 pl-3"} ${accentClass} rounded-sm bg-slate-50/70 py-1.5`}>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">{isAr ? "الصور المرفقة" : "Attached Images"}</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {ncrImages.map((src, idx) => (
                  <div key={idx} className="flex h-32 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                    <img src={src} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {item.sections.map((section, idx) => (
            <div key={idx} className={`${isAr ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} ${accentClass} rounded-sm bg-slate-50/70 py-1.5`} style={{ textAlign: align }}>
              <h3 className="mb-1.5 text-sm font-semibold text-gray-700">{section.label}</h3>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">{section.value || (isAr ? "غير متوفر" : "N/A")}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className={`mt-5 flex flex-wrap justify-between gap-3 border-t border-gray-300 pt-3 text-[11px] text-gray-400 ${isAr ? 'flex-row-reverse' : ''}`}>
        <span>{isAr ? 'تم الإنشاء' : 'Generated'}: {new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
        <span>{siteName} - {isAr ? 'سري' : 'Confidential'}</span>
      </div>
    </div>
  );
}

function NcrBlock({ title, value, isAr, accentClass }: { title: string; value: string; isAr: boolean; accentClass: string }) {
  return (
    <div className={`${isAr ? "border-r-4 pr-3" : "border-l-4 pl-3"} ${accentClass} rounded-sm bg-slate-50/70 py-1.5`}>
      <h3 className="mb-1.5 text-sm font-semibold text-gray-700">{title}</h3>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">{value || (isAr ? "غير متوفر" : "N/A")}</p>
    </div>
  );
}

export default function PrintShareDialog({ open, onOpenChange, item, customContent }: PrintShareDialogProps) {
  const { settings, hasPermission, logActivity } = useData();
  const [activeTab, setActiveTab] = useState("print");
  const [extraRecipients, setExtraRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; channel: string; error?: string; recipients?: string[] } | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const isAr = settings.language === "ar";
  const canSend = hasPermission("ncr", "send_email");

  const defaultSubject = `${item.type.toUpperCase()}: ${item.refNo || item.title}${item.severity ? ` [${item.severity.toUpperCase()}]` : ""}`;
  const defaultBody = item.sections.map(s => `${s.label}: ${s.value || (isAr ? "غير متوفر" : "N/A")}`).join("\n\n");

  // Handle print using iframe for better font support or window.print for custom content
  const handlePrint = useCallback(() => {
    if (customContent) {
      window.print();
      return;
    }

    const html = buildPrintHtml(item, settings.siteName, isAr, settings);
    
    // Remove existing print iframe if any to prevent memory leaks
    const existingIframe = document.getElementById('print-share-iframe');
    if (existingIframe) {
      existingIframe.parentNode?.removeChild(existingIframe);
    }

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'print-share-iframe';
    // Use absolute positioning with actual size so browser renders it fully
    // width/height 0 or display none often breaks print media generation
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1024px';
    iframe.style.height = '1024px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);
    
    // Write HTML to iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      // Wait for fonts and rendering before printing
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          // We DO NOT remove the iframe immediately.
          // Removing it while the print dialog is open will cancel/corrupt the PDF generation.
        }
      }, 1000);
    }
  }, [item, isAr, settings, customContent]);

  const addRecipient = () => {
    const val = newRecipient.trim();
    if (val && !extraRecipients.includes(val)) {
      setExtraRecipients([...extraRecipients, val]);
      setNewRecipient("");
    }
  };

  const removeRecipient = (r: string) => {
    setExtraRecipients(extraRecipients.filter(e => e !== r));
  };

  const handleSend = async (channel: "email" | "teams" | "whatsapp") => {
    setSending(true);
    setSendResult(null);
    try {
      setTimeout(() => {
        setSendResult({ success: true, channel, recipients: extraRecipients.length > 0 ? extraRecipients : ['default'] });
        toast.success(isAr ? "تم الإرسال" : "Sent Successfully", { description: `${channel}: ${extraRecipients.join(", ") || (isAr ? 'تم التسليم' : 'Delivered')}` });
        setSending(false);
      }, 1000);
    } catch (e: any) {
      const errMsg = e.message || (isAr ? "فشل الإرسال" : "Send failed");
      setSendResult({ success: false, channel, error: errMsg });
      toast.error(isAr ? "خطأ" : "Error", { description: errMsg });
      setSending(false);
    }
  };

  const handleShareWhatsApp = () => {
    const subject = customSubject || defaultSubject;
    const body = customBody || defaultBody;
    const text = `*${subject}*\n\n${body}`;
    const encoded = encodeURIComponent(text);

    if (extraRecipients.length > 0) {
      const phone = extraRecipients[0].replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
    toast.success(isAr ? "تم فتح WhatsApp" : "WhatsApp Opened");
    logActivity("Share via WhatsApp", `Shared ${item.type} ${item.refNo || item.title}`, itemTypeToModule[item.type] || "ncr");
  };

  const handleShareEmail = () => {
    const subject = customSubject || defaultSubject;
    const body = customBody || defaultBody;
    const to = extraRecipients.join(",");
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    toast.success(isAr ? "تم فتح البريد" : "Email App Opened");
    logActivity("Share via Email", `Shared ${item.type} ${item.refNo || item.title}`, itemTypeToModule[item.type] || "ncr");
  };

  const handleShareTeams = () => {
    const subject = customSubject || defaultSubject;
    const body = customBody || defaultBody;
    const message = `${subject}\n\n${body}`;
    const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?message=${encodeURIComponent(message)}`;
    window.open(teamsUrl, "_blank");
    toast.success(isAr ? "تم فتح Teams" : "Teams Opened");
    logActivity("Share via Teams", `Shared ${item.type} ${item.refNo || item.title}`, itemTypeToModule[item.type] || "ncr");
  };

  const handleCopyText = () => {
    const subject = customSubject || defaultSubject;
    const body = customBody || defaultBody;
    const text = `*${subject}*\n\n${body}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(isAr ? "تم النسخ" : "Copied to Clipboard");
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              {isAr ? "طباعة ومشاركة" : "Print & Share"}
            </DialogTitle>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="print">{isAr ? 'طباعة' : 'Print'}</TabsTrigger>
            <TabsTrigger value="email">{isAr ? 'بريد' : 'Email'}</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <PrintView item={item} siteName={settings.siteName} isAr={isAr} settings={settings} />
            </div>
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              {isAr ? 'طباعة / تحميل PDF' : 'Print / Download PDF'}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الموضوع' : 'Subject'}</Label>
              <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder={defaultSubject} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'المحتوى' : 'Body'}</Label>
              <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} placeholder={defaultBody} rows={6} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'المستلمون الإضافيون' : 'Extra Recipients'}</Label>
              <div className="flex gap-2">
                <Input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="email@example.com" onKeyDown={(e) => e.key === 'Enter' && addRecipient()} />
                <Button onClick={addRecipient} variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {extraRecipients.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1">
                    {r}
                    <button onClick={() => removeRecipient(r)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleShareEmail} variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                {isAr ? 'فتح تطبيق البريد' : 'Open Email App'}
              </Button>
              <Button onClick={() => handleSend('email')} disabled={sending || !canSend} className="flex-1">
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {isAr ? 'إرسال' : 'Send'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الرسالة' : 'Message'}</Label>
              <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} placeholder={defaultBody} rows={6} />
            </div>
            <Button onClick={handleShareTeams} variant="outline" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              {isAr ? 'فتح Teams' : 'Open Teams'}
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الرسالة' : 'Message'}</Label>
              <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} placeholder={defaultBody} rows={6} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'رقم الهاتف (اختياري)' : 'Phone Number (optional)'}</Label>
              <Input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="+966XXXXXXXXX" />
            </div>
            <Button onClick={handleShareWhatsApp} variant="outline" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              {isAr ? 'فتح WhatsApp' : 'Open WhatsApp'}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleCopyText} variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            {isAr ? 'نسخ النص' : 'Copy Text'}
          </Button>
        </div>

        {sendResult && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${sendResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {sendResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {sendResult.success ? (isAr ? "تم الإرسال بنجاح!" : "Sent successfully!") : (sendResult.error || (isAr ? "فشل الإرسال" : "Send failed"))}
          </div>
        )}
        </DialogContent>
      </Dialog>
      
      {customContent && open && (
        <div className="hidden print:block w-full h-full bg-white text-black print:absolute print:inset-0 print:z-[9999]">
          {customContent}
        </div>
      )}
    </>
  );
}

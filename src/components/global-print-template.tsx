import { useData } from "@/lib/data-context";

export function GlobalPrintTemplate() {
  const { settings } = useData();
  const branding = settings.branding || {
    companyName: settings.siteName,
    companyLogo: '/logo.png',
    logoPosition: 'left',
    confidentialLabel: 'Confidential',
    documentFooter: '',
    departmentName: '',
    safetyDepartmentName: '',
    companyWebsite: '',
    companyPhone: '',
    companyEmail: ''
  };
  const isAr = settings.language === 'ar';

  return (
    <div className="hidden print:flex flex-col w-full bg-white text-black mb-6 border-b-2 border-black pb-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className={`flex justify-between items-start gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
        {branding.logoPosition === 'right' && <div className="flex-1" />}
        
        <div className={`flex flex-col gap-2 ${branding.logoPosition === 'center' ? 'items-center text-center' : (isAr ? 'items-end text-right' : 'items-start text-left')}`}>
          <img src={branding.companyLogo || "/logo.png"} alt={branding.companyName || "ABDULKAREM SAFETY BOARD"} className="h-20 w-[120px] brand-logo-full" />
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: isAr ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "Arial, sans-serif" }}>{branding.companyName || settings.siteName}</h1>
            {branding.departmentName && <p className="mt-1 text-sm text-gray-600">{branding.departmentName}</p>}
            {branding.safetyDepartmentName && <p className="text-sm text-gray-600">{branding.safetyDepartmentName}</p>}
          </div>
        </div>

        {branding.logoPosition === 'left' && <div className="flex-1" />}

        <div className={`flex flex-col ${isAr ? 'items-start text-left' : 'items-end text-right'}`}>
          <p className="text-sm text-gray-600">{new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
        </div>
      </div>
    </div>
  );
}

export function GlobalPrintFooter() {
  const { settings } = useData();
  const branding = settings.branding || {
    confidentialLabel: 'Confidential',
    documentFooter: '',
    companyWebsite: '',
    companyPhone: '',
    companyEmail: ''
  };
  const isAr = settings.language === 'ar';

  return (
    <div className="hidden print:flex fixed bottom-0 left-0 right-0 w-full bg-white pt-2 mt-4 border-t border-gray-300 text-[10px] text-gray-600 justify-between items-center px-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex gap-3 flex-wrap">
        <span>{isAr ? 'تم الإنشاء' : 'Generated'}: {new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
        {branding.companyWebsite && <><span>|</span><span>{branding.companyWebsite}</span></>}
        {branding.companyPhone && <><span>|</span><span>{branding.companyPhone}</span></>}
        {branding.companyEmail && <><span>|</span><span>{branding.companyEmail}</span></>}
      </div>
      <div className={`text-${isAr ? 'left' : 'right'}`}>
        <div className="font-bold text-gray-800">{branding.confidentialLabel || (isAr ? 'سري' : 'Confidential')}</div>
        {branding.documentFooter && <div className="mt-0.5">{branding.documentFooter}</div>}
      </div>
    </div>
  );
}

// Helper HTML generators for iframe-based printing in PrintShareDialog and reports
export function getGlobalPrintHeaderHtml(branding: any, siteName: string, isAr: boolean, isNcr: boolean, showQr: boolean, qrUrl: string, item: any, accent: string): string {
  siteName = branding.companyName || siteName;
  return `
    <div style="background: ${isNcr ? '#ffffff' : 'linear-gradient(135deg, ' + accent + ' 0%, #1e293b 100%)'}; color: ${isNcr ? '#111111' : '#fff'}; padding: 16px 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-direction: ${isAr ? 'row-reverse' : 'row'}; border-bottom: 2px solid ${isNcr ? '#111111' : 'transparent'}; page-break-inside: avoid;">
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
  `;
}

export function getGlobalPrintFooterHtml(branding: any, isAr: boolean): string {
  return `
    <div style="padding: 10px 18px; background: #f8fafc; border-top: 1px solid #e5e7eb; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; flex-direction: ${isAr ? 'row-reverse' : 'row'}; align-items: center; page-break-inside: avoid;">
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
  `;
}

function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}


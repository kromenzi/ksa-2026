from pathlib import Path

# 1) Make language switching work before authentication.
data = Path("src/lib/data-context.tsx")
text = data.read_text(encoding="utf-8")
old = ' const updateSettings=async(d:Partial<SiteSettings>)=>{try{await apiRequest("PATCH","/api/site-settings",d);}catch{} invalidate("/api/site-settings")};'
new = ''' const updateSettings=async(d:Partial<SiteSettings>)=>{
   if (d.language === "ar" || d.language === "en") {
     setLocalLanguage(d.language);
     try { localStorage.setItem("safety-board-language", d.language); } catch {}
   }
   try { await apiRequest("PATCH","/api/site-settings",d); } catch {}
   invalidate("/api/site-settings");
 };'''
if old in text:
    text = text.replace(old, new, 1)
    data.write_text(text, encoding="utf-8")
    print("Patched pre-auth language persistence")
else:
    if 'setLocalLanguage(d.language)' in text:
        print("Language persistence already patched")
    else:
        raise SystemExit("Could not locate updateSettings")

# 2) Replace any previous pyramid print implementation with a stable Blob URL printer.
pyramid = Path("src/pages/admin/safety-pyramid.tsx")
text = pyramid.read_text(encoding="utf-8")
start = text.find("  const openPrintWindow =")
if start >= 0:
    end = text.find("\n\n  return (", start)
    if end < 0:
        raise SystemExit("Could not locate end of openPrintWindow")
    new_handler = r'''  const openPrintWindow = (mode: "report" | "image") => {
    const popup = window.open("about:blank", "incident-pyramid-print", "width=1400,height=1000");
    if (!popup) {
      toast.error(isAr ? "يرجى السماح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print");
      return;
    }
    const esc = (value: unknown) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
    const pyramid = (data: Record<LevelId, number>) => LEVELS.map((level, i) => enabled[level.id] ? `<div class="row"><div class="bar" style="width:${24 + i * 12}%;background:${level.color};color:${level.text}"><span>${esc(isAr ? level.ar : level.en)}</span><b>${data[level.id]}</b></div></div>` : "").join("");
    const report = mode === "report";
    const html = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${report ? "Incident Pyramid Report" : "Incident Pyramid"}</title><style>
@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111827;font-family:Arial,"Segoe UI",sans-serif}body{padding:10mm}.toolbar{display:flex;justify-content:flex-end;margin-bottom:7mm}.print-btn{border:0;border-radius:8px;background:#1d4ed8;color:#fff;padding:10px 18px;font-weight:700;cursor:pointer}.header{text-align:center;border-bottom:3px solid #dc2626;padding-bottom:5mm;margin-bottom:7mm}.header h1{margin:0;font-size:24px}.header p{margin:2mm 0;color:#64748b;font-size:11px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:7mm}.kpi{border:1px solid #cbd5e1;border-radius:8px;padding:4mm;text-align:center}.kpi b{display:block;font-size:22px}.kpi span{display:block;color:#64748b;font-size:10px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.card{border:1px solid #cbd5e1;border-radius:10px;padding:6mm}.card h2{text-align:center;margin:0 0 4mm;font-size:16px;color:#1e3a8a}.row{height:12mm;display:flex;align-items:center;justify-content:center}.bar{height:9mm;border-radius:4px;display:flex;align-items:center;justify-content:space-between;padding:0 3mm;font-size:10px;font-weight:800;print-color-adjust:exact;-webkit-print-color-adjust:exact}.bar b{font-size:12px}.total{text-align:center;border-top:1px solid #cbd5e1;margin-top:4mm;padding-top:3mm;font-size:10px;font-weight:700}.footer{margin-top:7mm;padding-top:3mm;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;color:#64748b;font-size:8px}@media print{.toolbar{display:none!important}.bar{print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}}
</style></head><body><div class="toolbar"><button class="print-btn" onclick="window.print()">${esc(report ? (isAr ? "طباعة التقرير" : "Print Report") : (isAr ? "طباعة صورة الهرم" : "Print Pyramid Image"))}</button></div><div class="header"><h1>${esc(isAr ? `هرم الحوادث - ${selectedYear}` : `Incident Pyramid - ${selectedYear}`)}</h1><p>${esc(isAr ? `مقارنة ${monthName} مع التراكمي ${selectedYear}` : `Monthly ${monthName} vs YTD ${selectedYear}`)}</p></div>${report ? `<div class="kpis"><div class="kpi"><b>${monthTotal}</b><span>${esc(isAr ? `إجمالي ${monthName}` : `Total ${monthName}`)}</span></div><div class="kpi"><b>${counts.monthly.nearMiss}</b><span>${esc(isAr ? "الوقائع الوشيكة" : "Near Misses")}</span></div><div class="kpi"><b>${counts.monthly.unsafeActs}</b><span>${esc(isAr ? "السلوكيات والظروف غير الآمنة" : "At-Risk / Unsafe")}</span></div></div>` : ""}<div class="columns"><section class="card"><h2>${esc(isAr ? `الشهر • ${monthName}` : `Monthly • ${monthName}`)}</h2>${pyramid(counts.monthly)}${report ? `<div class="total">${monthTotal} ${esc(isAr ? "إجمالي السجلات" : "total records")}</div>` : ""}</section><section class="card"><h2>${esc(isAr ? `التراكمي YTD • ${selectedYear}` : `YTD • ${selectedYear}`)}</h2>${pyramid(counts.ytd)}${report ? `<div class="total">${ytdTotal} ${esc(isAr ? "إجمالي السجلات" : "total records")}</div>` : ""}</section></div><div class="footer"><span>ABDULKAREM SAFETY BOARD</span><span>${report ? "Incident Pyramid Report" : "Incident Pyramid"}</span></div></body></html>`;
    const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    popup.location.href = blobUrl;
    popup.onload = () => window.setTimeout(() => { popup.focus(); popup.print(); window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); }, 700);
    logActivity(report ? "Print Incident Pyramid Report" : "Print Incident Pyramid Image", `Printed ${monthName} ${selectedYear}`, "reports");
  };
'''
    text = text[:start] + new_handler + text[end:]
    pyramid.write_text(text, encoding="utf-8")
    print("Installed stable Blob URL pyramid printer")
else:
    # Older source shape: replace the old handlePrint block if present.
    start = text.find("  const handlePrint = () => {")
    end = text.find("  const exportCSV = () => {", start)
    if start >= 0 and end > start:
        raise SystemExit("Older handlePrint source detected; use the dedicated print handler workflow instead")
    raise SystemExit("No known pyramid print handler found")

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { Calendar, Download, Printer, Settings, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const LEVELS = [
  { id: "fatality", en: "Fatality", ar: "الوفاة", color: "#b91c1c", text: "#ffffff" },
  { id: "lostTime", en: "Lost-Time Injury (LTI)", ar: "إصابة وقت ضائع (LTI)", color: "#ef4444", text: "#ffffff" },
  { id: "restrictedWork", en: "Restricted Work (RWD)", ar: "عمل مقيد (RWD)", color: "#f97316", text: "#ffffff" },
  { id: "medicalTreatment", en: "Medical Treatment (MTC)", ar: "علاج طبي (MTC)", color: "#f59e0b", text: "#111827" },
  { id: "firstAid", en: "First Aid (FAC)", ar: "إسعافات أولية (FAC)", color: "#facc15", text: "#111827" },
  { id: "nearMiss", en: "Near Miss", ar: "واقعة وشيكة", color: "#34d399", text: "#111827" },
  { id: "unsafeActs", en: "At-Risk / Unsafe", ar: "سلوكيات / ظروف غير آمنة", color: "#059669", text: "#ffffff" },
] as const;

type LevelId = typeof LEVELS[number]["id"];
type RecordItem = { id: string; refNo: string; date: string; month: number; year: number; level: LevelId; description: string; location: string; department: string; status: string };

function classifySafetyReport(r: any): LevelId {
  const category = String(r.category || "").toLowerCase();
  const risk = String(r.riskLevel || "").toLowerCase();
  const text = String(r.observationDescription || "").toLowerCase();
  if (text.includes("fatal") || category.includes("fatal")) return "fatality";
  if (text.includes("lost time") || text.includes("lti")) return "lostTime";
  if (text.includes("restricted") || text.includes("rwd")) return "restrictedWork";
  if (text.includes("medical") || text.includes("mtc") || text.includes("hospital")) return "medicalTreatment";
  if (text.includes("first aid") || text.includes("fac") || text.includes("clinic")) return "firstAid";
  if (category.includes("near miss") || category.includes("near_miss") || text.includes("near miss") || text.includes("near-miss")) return "nearMiss";
  if (risk === "high" && text.includes("injury")) return "lostTime";
  return "unsafeActs";
}

function classifyNcr(r: any): LevelId {
  const severity = String(r.severity || "").toLowerCase();
  const text = String(r.description || "").toLowerCase();
  if (text.includes("fatal")) return "fatality";
  if (text.includes("lost time") || text.includes("lti")) return "lostTime";
  if (text.includes("restricted") || text.includes("rwd")) return "restrictedWork";
  if (text.includes("medical") || text.includes("mtc") || text.includes("hospital")) return "medicalTreatment";
  if (text.includes("first aid") || text.includes("fac")) return "firstAid";
  if (text.includes("near miss") || text.includes("near-miss")) return "nearMiss";
  if (severity === "critical") return "lostTime";
  if (severity === "high") return "medicalTreatment";
  return "unsafeActs";
}

export default function SafetyPyramidPage() {
  const { settings, safetyReports, ncrs, logActivity } = useData();
  const isAr = settings.language === "ar";
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<LevelId, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("safety_board_pyramid_enabled_v3") || "null");
      if (saved) return saved;
    } catch {}
    return Object.fromEntries(LEVELS.map(l => [l.id, true])) as Record<LevelId, boolean>;
  });
  const monthName = new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", { month: "long" }).format(new Date(selectedYear, selectedMonth - 1, 1));

  const records = useMemo<RecordItem[]>(() => {
    const out: RecordItem[] = [];
    safetyReports.forEach((r: any) => {
      const raw = r.date || r.createdAt;
      const d = raw ? new Date(raw) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      out.push({ id: r.id, refNo: r.reportNo || r.id, date: d.toISOString().slice(0, 10), month: d.getMonth() + 1, year: d.getFullYear(), level: classifySafetyReport(r), description: r.observationDescription || "Safety observation", location: r.location || "Main Plant", department: r.department || "General", status: r.status || "Open" });
    });
    ncrs.forEach((r: any) => {
      const raw = r.date || r.createdAt;
      const d = raw ? new Date(raw) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      out.push({ id: `ncr-${r.id}`, refNo: r.refNo || r.id, date: d.toISOString().slice(0, 10), month: d.getMonth() + 1, year: d.getFullYear(), level: classifyNcr(r), description: r.description || "NCR", location: r.location || "Main Plant", department: r.department || "General", status: r.status || "Open" });
    });
    return out;
  }, [safetyReports, ncrs]);

  const counts = useMemo(() => {
    const monthly = Object.fromEntries(LEVELS.map(l => [l.id, 0])) as Record<LevelId, number>;
    const ytd = Object.fromEntries(LEVELS.map(l => [l.id, 0])) as Record<LevelId, number>;
    records.forEach(r => {
      if (r.year !== selectedYear) return;
      if (r.month === selectedMonth) monthly[r.level]++;
      if (r.month <= selectedMonth) ytd[r.level]++;
    });
    return { monthly, ytd };
  }, [records, selectedMonth, selectedYear]);

  const total = (data: Record<LevelId, number>) => LEVELS.reduce((sum, l) => sum + data[l.id], 0);
  const monthTotal = total(counts.monthly);
  const ytdTotal = total(counts.ytd);

  const renderPyramid = (data: Record<LevelId, number>, label: string) => (
    <div className="pyramid-card rounded-2xl border bg-background p-4">
      <div className="text-center mb-3">
        <h2 className="font-extrabold text-blue-900 dark:text-blue-200">{label}</h2>
        <p className="text-[11px] text-muted-foreground">{isAr ? "المستويات والأعداد" : "Levels and counts"}</p>
      </div>
      <div className="space-y-1.5">
        {LEVELS.map((level, i) => {
          if (!enabled[level.id]) return null;
          return (
            <div key={level.id} className="flex items-center min-h-9">
              <div className="flex-1 flex justify-center">
                <div className="pyramid-row h-9 rounded-md flex items-center justify-between px-3 shadow-sm" style={{ width: `${24 + i * 12}%`, backgroundColor: level.color, color: level.text }}>
                  <span className="text-[10px] sm:text-xs font-extrabold truncate">{isAr ? level.ar : level.en}</span>
                  <span className="font-mono font-black text-sm ms-2">{data[level.id]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t text-center text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{label.startsWith("Monthly") ? monthTotal : ytdTotal}</span> {isAr ? "إجمالي السجلات" : "total records"}
      </div>
    </div>
  );

  const exportCSV = () => {
    const rows = records.map(r => [r.id, r.refNo, r.date, r.department, r.location, r.level, r.description, r.status]);
    const csv = ["ID,RecordNo,Date,Department,Location,Level,Description,Status", ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `incident-pyramid-${selectedYear}.csv`; a.click(); URL.revokeObjectURL(url);
    logActivity("Export Incident Pyramid CSV", "Exported live incident pyramid records", "reports");
    toast.success(isAr ? "تم تصدير البيانات" : "Data exported");
  };

  const openPrintWindow = (mode: "report" | "image") => {
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
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument;
    const frameWin = iframe.contentWindow;
    if (!frameDoc || !frameWin) {
      iframe.remove();
      toast.error(isAr ? "تعذر تجهيز صفحة الطباعة" : "Could not prepare print page");
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    window.setTimeout(() => {
      try { frameWin.focus(); frameWin.print(); }
      finally { window.setTimeout(() => iframe.remove(), 1000); }
    }, 300);

    logActivity(report ? "Print Incident Pyramid Report" : "Print Incident Pyramid Image", `Printed ${monthName} ${selectedYear}`, "reports");
  };


  return (
    <div className="space-y-6 pyramid-page" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm no-print">
        <div><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="h-5 w-5 text-red-600" /></div><h1 className="text-xl font-extrabold">{isAr ? `هرم الحوادث - ${selectedYear}` : `Incident Pyramid - ${selectedYear}`}</h1></div><p className="text-sm text-muted-foreground mt-1">{isAr ? "مقارنة الشهر المحدد مع التراكمي منذ بداية السنة (YTD)" : "Comparative safety pyramid for selected month vs. Year-To-Date (YTD) cumulative record"}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border rounded-xl px-2 h-9"><Calendar className="h-4 w-4 text-blue-700" /><select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', { month: 'long' }).format(new Date(2026, i, 1))}</option>)}</select></div>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="h-9 border rounded-xl px-2 bg-background text-sm"><option value={2026}>2026</option><option value={2025}>2025</option></select>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="rounded-xl gap-2"><Settings className="h-4 w-4" />{isAr ? "الإعدادات" : "Settings"}</Button>
          <Button variant="outline" onClick={exportCSV} className="rounded-xl gap-2"><Download className="h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={() => openPrintWindow("report")} className="rounded-xl gap-2 print-trigger"><Printer className="h-4 w-4" />{isAr ? "طباعة التقرير" : "Print Report"}</Button>
          <Button variant="destructive" onClick={() => openPrintWindow("image")} className="rounded-xl gap-2 print-trigger"><Printer className="h-4 w-4" />{isAr ? "طباعة صورة الهرم" : "Print Pyramid Image"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{monthTotal}</div><div className="text-xs text-muted-foreground">{isAr ? `إجمالي ${monthName}` : `Total ${monthName}`}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{ytdTotal}</div><div className="text-xs text-muted-foreground">YTD {selectedYear}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{counts.monthly.nearMiss}</div><div className="text-xs text-muted-foreground">{isAr ? "وقائع وشيكة" : "Near Misses"}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{counts.monthly.unsafeActs}</div><div className="text-xs text-muted-foreground">{isAr ? "غير آمن" : "At-Risk / Unsafe"}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print-grid">{renderPyramid(counts.monthly, `Monthly • ${monthName}`)}{renderPyramid(counts.ytd, `YTD • ${selectedYear}`)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print"><div className="rounded-2xl border bg-emerald-500/10 p-4"><h3 className="font-bold text-emerald-800 dark:text-emerald-300">{isAr ? "المؤشرات الاستباقية" : "Leading Indicators"}</h3><p className="text-sm mt-2">Near Miss: <b>{counts.monthly.nearMiss}</b> ({counts.ytd.nearMiss} YTD) • Unsafe: <b>{counts.monthly.unsafeActs}</b> ({counts.ytd.unsafeActs} YTD)</p></div><div className="rounded-2xl border bg-amber-500/10 p-4"><h3 className="font-bold text-amber-800 dark:text-amber-300">{isAr ? "المؤشرات التفاعلية" : "Lagging Indicators"}</h3><p className="text-sm mt-2">LTI/MTC/FAC: <b>{counts.monthly.lostTime + counts.monthly.medicalTreatment + counts.monthly.firstAid}</b> ({counts.ytd.lostTime + counts.ytd.medicalTreatment + counts.ytd.firstAid} YTD)</p></div></div>

      <style>{`@media print{ @page{size:A4 landscape;margin:10mm} html,body,#root{background:#fff!important;color:#111827!important}.no-print{display:none!important}.pyramid-page{display:block!important;background:#fff!important;color:#111827!important}.print-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8mm!important}.pyramid-card{display:block!important;visibility:visible!important;opacity:1!important;break-inside:avoid!important;page-break-inside:avoid!important;border:1px solid #cbd5e1!important;background:#fff!important;color:#111827!important}.pyramid-card *{visibility:visible!important;opacity:1!important}.pyramid-row{print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;visibility:visible!important;opacity:1!important} }`}</style>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{isAr ? "إعدادات الهرم" : "Pyramid Settings"}</DialogTitle><DialogDescription>{isAr ? "اختر المستويات الظاهرة في التقرير والطباعة." : "Choose which levels are visible in the report and print."}</DialogDescription></DialogHeader><div className="space-y-2">{LEVELS.map(level => <label key={level.id} className="flex items-center justify-between border rounded-xl px-3 py-2"><span className="text-sm">{isAr ? level.ar : level.en}</span><input type="checkbox" checked={enabled[level.id]} onChange={e => setEnabled(v => ({ ...v, [level.id]: e.target.checked }))} /></label>)}</div><DialogFooter><Button onClick={() => setSettingsOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

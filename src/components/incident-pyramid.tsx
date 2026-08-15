import { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Printer,
  Building2,
  Clock,
  Eye,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useLocation } from "wouter";

export interface IncidentPyramidProps {
  month?: number;
  year?: number;
  monthlyData?: Record<string, number>;
  ytdData?: Record<string, number>;
  className?: string;
  onNavigateToRecords?: (category: string, period: string) => void;
}

export interface PyramidLevelDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  shortNameEn: string;
  shortNameAr: string;
  order: number;
  widthClass: string;
  bgColor: string;
  textColor: string;
  indicatorType: "lagging" | "leading";
}

export const PYRAMID_LEVEL_DEFS: PyramidLevelDefinition[] = [
  { id: "fatality", nameEn: "Fatality", nameAr: "الوفيات", shortNameEn: "Fatality", shortNameAr: "الوفيات", order: 1, widthClass: "w-[24%]", bgColor: "bg-red-600 dark:bg-red-700", textColor: "text-white", indicatorType: "lagging" },
  { id: "lostTime", nameEn: "Lost-Time", nameAr: "إصابات الوقت الضائع (LTI)", shortNameEn: "Lost-Time", shortNameAr: "وقت ضائع", order: 2, widthClass: "w-[36%]", bgColor: "bg-rose-500 dark:bg-rose-600", textColor: "text-white", indicatorType: "lagging" },
  { id: "restrictedWork", nameEn: "Restricted Work", nameAr: "حالات العمل المقيد (RWD)", shortNameEn: "Restricted Work", shortNameAr: "عمل مقيد", order: 3, widthClass: "w-[48%]", bgColor: "bg-orange-500 dark:bg-orange-600", textColor: "text-white", indicatorType: "lagging" },
  { id: "medicalTreatment", nameEn: "Medical Treatment", nameAr: "العلاج الطبي (MTC)", shortNameEn: "Medical Treatment", shortNameAr: "علاج طبي", order: 4, widthClass: "w-[60%]", bgColor: "bg-amber-500 dark:bg-amber-500", textColor: "text-slate-950 font-bold", indicatorType: "lagging" },
  { id: "firstAid", nameEn: "First Aid", nameAr: "الإسعافات الأولية (FAC)", shortNameEn: "First Aid", shortNameAr: "إسعافات أولية", order: 5, widthClass: "w-[72%]", bgColor: "bg-yellow-400 dark:bg-yellow-400", textColor: "text-slate-950 font-bold", indicatorType: "lagging" },
  { id: "nearMiss", nameEn: "Near Miss", nameAr: "الوقائع الوشيكة (Near Miss)", shortNameEn: "Near Miss", shortNameAr: "واقعة وشيكة", order: 6, widthClass: "w-[84%]", bgColor: "bg-emerald-400 dark:bg-emerald-400", textColor: "text-slate-950 font-bold", indicatorType: "leading" },
  { id: "unsafeActs", nameEn: "At-Risk Behaviors / Unsafe Conditions", nameAr: "السلوكيات والظروف غير الآمنة", shortNameEn: "At-Risk / Unsafe", shortNameAr: "أفعال/ظروف غير آمنة", order: 7, widthClass: "w-[96%]", bgColor: "bg-emerald-600 dark:bg-emerald-700", textColor: "text-white", indicatorType: "leading" }
];

const MONTH_NAMES = [
  { en: "January", ar: "يناير", shortEn: "Jan", shortAr: "يناير" }, { en: "February", ar: "فبراير", shortEn: "Feb", shortAr: "فبراير" },
  { en: "March", ar: "مارس", shortEn: "Mar", shortAr: "مارس" }, { en: "April", ar: "أبريل", shortEn: "Apr", shortAr: "أبريل" },
  { en: "May", ar: "مايو", shortEn: "May", shortAr: "مايو" }, { en: "June", ar: "يونيو", shortEn: "Jun", shortAr: "يونيو" },
  { en: "July", ar: "يوليو", shortEn: "Jul", shortAr: "يوليو" }, { en: "August", ar: "أغسطس", shortEn: "Aug", shortAr: "أغسطس" },
  { en: "September", ar: "سبتمبر", shortEn: "Sep", shortAr: "سبتمبر" }, { en: "October", ar: "أكتوبر", shortEn: "Oct", shortAr: "أكتوبر" },
  { en: "November", ar: "نوفمبر", shortEn: "Nov", shortAr: "نوفمبر" }, { en: "December", ar: "ديسمبر", shortEn: "Dec", shortAr: "ديسمبر" }
];

export interface UnifiedIncidentRecord {
  id: string; refNo: string; date: string; month: number; year: number; category: string; levelId: string;
  location: string; department: string; description: string; status: string; responsible: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function openStandalonePyramidPrint({
  year, monthName, monthlyCounts, ytdCounts, isAr
}: {
  year: number; monthName: string; monthlyCounts: Record<string, number>; ytdCounts: Record<string, number>; isAr: boolean;
}) {
  const title = isAr ? `الهرم الأمني للمنشأة - ${year}` : `Incident Pyramid - ${year}`;
  const subtitle = isAr ? `${monthName} ${year} مقابل التراكمي YTD` : `${monthName} ${year} vs YTD`;
  const monthTitle = isAr ? `الشهر • ${monthName}` : `Monthly • ${monthName}`;
  const ytdTitle = isAr ? `التراكمي YTD • ${year}` : `YTD • ${year}`;
  const generated = new Date().toLocaleString(isAr ? "ar-SA" : "en-US");

  const widthMap: Record<string, number> = {
    fatality: 24, lostTime: 36, restrictedWork: 48, medicalTreatment: 60, firstAid: 72, nearMiss: 84, unsafeActs: 96
  };
  const colorMap: Record<string, string> = {
    fatality: "#dc2626", lostTime: "#f43f5e", restrictedWork: "#f97316", medicalTreatment: "#f59e0b",
    firstAid: "#facc15", nearMiss: "#34d399", unsafeActs: "#059669"
  };

  const renderRows = (counts: Record<string, number>) => PYRAMID_LEVEL_DEFS.map((lvl) => {
    const label = isAr ? lvl.shortNameAr : lvl.shortNameEn;
    const count = counts[lvl.id] ?? 0;
    const textColor = ["medicalTreatment", "firstAid", "nearMiss"].includes(lvl.id) ? "#0f172a" : "#fff";
    return `<div class="row"><div class="bar" style="width:${widthMap[lvl.id]}%;background:${colorMap[lvl.id]};color:${textColor}">${escapeHtml(label)}</div><span class="count">${count}</span></div>`;
  }).join("");

  const totalMonth = ["fatality", "lostTime", "restrictedWork", "medicalTreatment", "firstAid"].reduce((s, id) => s + (monthlyCounts[id] ?? 0), 0);
  const totalYtd = ["fatality", "lostTime", "restrictedWork", "medicalTreatment", "firstAid"].reduce((s, id) => s + (ytdCounts[id] ?? 0), 0);
  const printHtml = `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:Arial,"Noto Sans Arabic",sans-serif}
body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.page{max-width:1120px;margin:0 auto}.head{padding-bottom:10px;border-bottom:2px solid #0f172a;margin-bottom:12px}.head h1{font-size:23px;margin:0 0 4px;font-weight:800}.head p{margin:0;color:#475569;font-size:10px}.meta{margin-top:5px;color:#64748b;font-size:9px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.panel{border:1px solid #cbd5e1;border-radius:10px;padding:10px}.panel h2{text-align:center;color:#1e3a8a;font-size:13px;margin:0}.panel p{text-align:center;color:#64748b;font-size:9px;margin:3px 0 8px}.rows{display:flex;flex-direction:column;gap:5px;min-height:270px;justify-content:flex-end}.row{position:relative;min-height:30px;display:flex;align-items:center;justify-content:center}.bar{min-height:30px;border-radius:5px;display:flex;align-items:center;justify-content:center;padding:0 6px;font-size:9px;font-weight:800;text-align:center}.count{position:absolute;inset-inline-end:0;font:900 12px ui-monospace,SFMono-Regular,Consolas,monospace}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:11px 0}.kpi{border:1px solid #cbd5e1;border-radius:7px;padding:6px;text-align:center}.kpi strong{display:block;font-size:16px}.kpi span{font-size:8px;color:#64748b}.footer{margin-top:10px;padding-top:5px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;color:#64748b;font-size:7px}@media print{.page{max-width:none}}
</style></head>
<body><main class="page">
<header class="head"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><div class="meta">HSE-PYRAMID-01 • ${escapeHtml(generated)}</div></header>
<section class="summary"><div class="kpi"><strong>${totalMonth}</strong><span>${isAr ? "إجمالي الإصابات والحوادث للشهر" : "Monthly Incident Cases"}</span></div><div class="kpi"><strong>${monthlyCounts.nearMiss ?? 0}</strong><span>${isAr ? "Near Miss للشهر" : "Monthly Near Misses"}</span></div><div class="kpi"><strong>${monthlyCounts.unsafeActs ?? 0}</strong><span>${isAr ? "السلوكيات/الظروف غير الآمنة" : "Monthly Unsafe Acts/Conditions"}</span></div><div class="kpi"><strong>${totalYtd}</strong><span>${isAr ? "إجمالي الإصابات والحوادث YTD" : "YTD Incident Cases"}</span></div></section>
<section class="grid"><article class="panel"><h2>${escapeHtml(monthTitle)}</h2><p>${isAr ? "المستويات والأعداد الشهرية" : "Monthly levels and counts"}</p><div class="rows">${renderRows(monthlyCounts)}</div></article><article class="panel"><h2>${escapeHtml(ytdTitle)}</h2><p>${isAr ? "المستويات والأعداد التراكمية" : "Year-to-date levels and counts"}</p><div class="rows">${renderRows(ytdCounts)}</div></article></section>
<footer class="footer"><span>ABDULKAREM SAFETY BOARD</span><span>${isAr ? "تقرير هرم الحوادث" : "Incident Pyramid Report"}</span></footer>
</main></body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(iframe);
  const frameDoc = iframe.contentDocument;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) { iframe.remove(); window.print(); return; }
  frameDoc.open();
  frameDoc.write(printHtml);
  frameDoc.close();
  window.setTimeout(() => {
    try { frameWin.focus(); frameWin.print(); }
    finally { window.setTimeout(() => iframe.remove(), 1000); }
  }, 300);

}

export function IncidentPyramid({ month: propMonth, year: propYear, monthlyData: propMonthlyData, ytdData: propYtdData, className, onNavigateToRecords }: IncidentPyramidProps) {
  const { settings, safetyReports, ncrs } = useData();
  const [, setLocation] = useLocation();
  const isAr = settings.language === "ar";
  const [selectedMonth, setSelectedMonth] = useState<number>(propMonth ?? 7);
  const [selectedYear, setSelectedYear] = useState<number>(propYear ?? 2026);
  const [activeLevelModal, setActiveLevelModal] = useState<{ level: PyramidLevelDefinition; isYtd: boolean } | null>(null);

  const unifiedRecords = useMemo<UnifiedIncidentRecord[]>(() => {
    const list: UnifiedIncidentRecord[] = [];
    safetyReports.forEach((rep) => {
      const dateObj = new Date(rep.date || rep.createdAt); const validDate = !isNaN(dateObj.getTime());
      const year = validDate ? dateObj.getFullYear() : selectedYear; const month = validDate ? dateObj.getMonth() + 1 : selectedMonth;
      const risk = (rep.riskLevel || "").toLowerCase(); const cat = (rep.category || "").toLowerCase(); const desc = (rep.observationDescription || "").toLowerCase();
      let levelId = "unsafeActs";
      if (desc.includes("fatal") || cat.includes("fatal")) levelId = "fatality";
      else if (desc.includes("lost time") || desc.includes("lti") || (risk === "high" && desc.includes("injury"))) levelId = "lostTime";
      else if (desc.includes("restricted") || desc.includes("rwd")) levelId = "restrictedWork";
      else if (desc.includes("medical") || desc.includes("mtc") || desc.includes("hospital")) levelId = "medicalTreatment";
      else if (desc.includes("first aid") || desc.includes("fac") || desc.includes("clinic")) levelId = "firstAid";
      else if (cat.includes("near miss") || desc.includes("near miss") || desc.includes("near-miss") || cat === "near_miss") levelId = "nearMiss";
      list.push({ id: rep.id, refNo: rep.reportNo, date: rep.date || new Date().toISOString().split("T")[0], month, year, category: rep.category || "Safety Observation", levelId, location: rep.location || "Main Plant", department: rep.department || "HSE Dept", description: rep.observationDescription || "Safety Observation Recorded", status: rep.status || "Open", responsible: rep.observerName || "Safety Officer" });
    });
    ncrs.forEach((ncr) => {
      const dateObj = new Date(ncr.date || ncr.createdAt); const validDate = !isNaN(dateObj.getTime());
      const year = validDate ? dateObj.getFullYear() : selectedYear; const month = validDate ? dateObj.getMonth() + 1 : selectedMonth;
      const sev = (ncr.severity || "").toLowerCase(); const desc = (ncr.description || "").toLowerCase();
      let levelId = "unsafeActs";
      if (sev === "critical" && (desc.includes("fatality") || desc.includes("fatal"))) levelId = "fatality";
      else if (sev === "critical" || desc.includes("lost time")) levelId = "lostTime";
      else if (desc.includes("restricted")) levelId = "restrictedWork";
      else if (sev === "high" || desc.includes("medical")) levelId = "medicalTreatment";
      else if (sev === "medium" && desc.includes("first aid")) levelId = "firstAid";
      else if (desc.includes("near miss") || desc.includes("near-miss")) levelId = "nearMiss";
      list.push({ id: ncr.id, refNo: ncr.refNo, date: ncr.date || new Date().toISOString().split("T")[0], month, year, category: "Non-Conformance (NCR)", levelId, location: ncr.location || "Zone A", department: ncr.department || "Operations", description: ncr.description, status: ncr.status, responsible: "Facility Manager" });
    });
    return list;
  }, [safetyReports, ncrs, selectedMonth, selectedYear]);

  const makeCounts = (filter: (r: UnifiedIncidentRecord) => boolean) => {
    const counts: Record<string, number> = { fatality: 0, lostTime: 0, restrictedWork: 0, medicalTreatment: 0, firstAid: 0, nearMiss: 0, unsafeActs: 0 };
    unifiedRecords.forEach((r) => { if (filter(r) && counts[r.levelId] !== undefined) counts[r.levelId]++; });
    return counts;
  };
  const monthlyCounts = useMemo(() => propMonthlyData ?? makeCounts(r => r.year === selectedYear && r.month === selectedMonth), [propMonthlyData, unifiedRecords, selectedMonth, selectedYear]);
  const ytdCounts = useMemo(() => propYtdData ?? makeCounts(r => r.year === selectedYear && r.month <= selectedMonth), [propYtdData, unifiedRecords, selectedMonth, selectedYear]);
  const prevMonthCounts = useMemo(() => { const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1; const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear; return makeCounts(r => r.year === prevY && r.month === prevM); }, [unifiedRecords, selectedMonth, selectedYear]);
  const totalMonthlyIncidents = Object.values(monthlyCounts).reduce((a, b) => a + b, 0);
  const totalYtdIncidents = Object.values(ytdCounts).reduce((a, b) => a + b, 0);
  const monthObj = MONTH_NAMES[selectedMonth - 1] || MONTH_NAMES[6];
  const monthNameText = isAr ? monthObj.ar : monthObj.en;
  const leftSubtitle = `USSG ${monthObj.en}-${selectedYear}`; const rightSubtitle = `USSG YTD-${selectedYear}`;

  const handlePrintPyramid = () => openStandalonePyramidPrint({ year: selectedYear, monthName: monthNameText, monthlyCounts, ytdCounts, isAr });
  const getFilteredRecordsForLevel = (levelId: string, isYtd: boolean) => unifiedRecords.filter((r) => r.levelId === levelId && r.year === selectedYear && (isYtd ? r.month <= selectedMonth : r.month === selectedMonth));
  const getLevelDetailStats = (levelId: string, isYtd: boolean) => {
    const recs = getFilteredRecordsForLevel(levelId, isYtd); const mCount = monthlyCounts[levelId] || 0; const yCount = ytdCounts[levelId] || 0; const pCount = prevMonthCounts[levelId] || 0;
    const trend: "up" | "down" | "flat" = mCount > pCount ? "up" : mCount < pCount ? "down" : "flat"; const total = isYtd ? totalYtdIncidents : totalMonthlyIncidents; const targetCount = isYtd ? yCount : mCount; const pct = total > 0 ? ((targetCount / total) * 100).toFixed(1) : "0.0";
    const locMap: Record<string, number> = {}; recs.forEach((r) => { locMap[r.location] = (locMap[r.location] || 0) + 1; }); let topLoc = isAr ? "غير محدد" : "Main Plant / Facility"; let maxLocCount = 0; Object.entries(locMap).forEach(([loc, cnt]) => { if (cnt > maxLocCount) { maxLocCount = cnt; topLoc = loc; } });
    let latestDate = isAr ? "لا توجد حوادث مسجلة" : "No incidents logged"; if (recs.length > 0) latestDate = [...recs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;
    return { records: recs, mCount, yCount, pCount, trend, pct, topLoc, latestDate };
  };

  return (
    <Card className={cn("border border-border/70 shadow-sm bg-card rounded-2xl overflow-hidden incident-pyramid-container print:border-none print:shadow-none print:bg-white print:text-slate-950 print:break-inside-avoid", className)} data-testid="incident-pyramid-card">
      <CardHeader className="pb-4 border-b border-border/40 bg-muted/20 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-blue-900/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-900 dark:text-blue-400"><ShieldAlert className="h-4 w-4" /></div><CardTitle className="text-lg sm:text-xl font-extrabold text-blue-950 dark:text-blue-100 tracking-tight">{isAr ? `الهرم الأمني للمنشأة - ${selectedYear}` : `Incident Pyramid - ${selectedYear}`}</CardTitle></div><CardDescription className="text-xs text-muted-foreground mt-1">{isAr ? "مقارنة هرم السلامة الميداني للشهر الحالي بالتراكمي منذ بداية العام" : "Comparative safety pyramid for selected month vs. Year-To-Date (YTD) cumulative records"}</CardDescription></div>
          <div className="flex items-center gap-2 flex-wrap"><div className="flex items-center gap-1 bg-background border border-border/60 rounded-xl px-2 py-1 shadow-xs"><Calendar className="h-3.5 w-3.5 text-blue-800 dark:text-blue-400" /><Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}><SelectTrigger className="h-7 border-none bg-transparent text-xs font-semibold focus:ring-0 w-[110px] p-0 shadow-none"><SelectValue placeholder="Select Month" /></SelectTrigger><SelectContent className="rounded-xl">{MONTH_NAMES.map((m, idx) => <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">{isAr ? m.ar : m.en}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center gap-1 bg-background border border-border/60 rounded-xl px-2 py-1 shadow-xs"><Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}><SelectTrigger className="h-7 border-none bg-transparent text-xs font-semibold focus:ring-0 w-[70px] p-0 shadow-none"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="2024" className="text-xs">2024</SelectItem><SelectItem value="2025" className="text-xs">2025</SelectItem><SelectItem value="2026" className="text-xs">2026</SelectItem></SelectContent></Select></div>
            <Button variant="outline" size="sm" onClick={handlePrintPyramid} className="h-8 rounded-xl border-border/60 text-xs gap-1.5 font-medium hover:bg-muted"><Printer className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" /><span className="hidden sm:inline">{isAr ? "طباعة" : "Print"}</span></Button></div></div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="hidden print:block text-center pb-4 border-b"><h2 className="text-2xl font-bold text-blue-900">{isAr ? `الهرم الأمني للمنشأة - ${selectedYear}` : `Incident Pyramid - ${selectedYear}`}</h2><p className="text-xs text-slate-500">{monthNameText} {selectedYear} vs YTD {selectedYear}</p></div>
        <div className="relative grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 items-stretch incident-pyramid-grid"><div className="hidden md:block print:block absolute top-10 bottom-2 left-1/2 w-[1.5px] bg-blue-300 dark:bg-blue-800/80 print:bg-blue-400 -translate-x-1/2 z-10 incident-pyramid-divider" aria-hidden="true" />
          {[{ key: "month", title: leftSubtitle, sub: isAr ? `إحصائيات شهر ${monthNameText} ${selectedYear}` : `Single Month Records (${monthNameText})`, counts: monthlyCounts }, { key: "ytd", title: rightSubtitle, sub: isAr ? `التراكمي من يناير إلى ${monthNameText} ${selectedYear}` : `Cumulative Jan 1 - ${monthNameText} ${selectedYear}`, counts: ytdCounts }].map((panel) => <div key={panel.key} className="flex flex-col items-center justify-between space-y-3 pe-0 md:pe-4"><div className="text-center w-full"><h3 className="text-sm sm:text-base font-bold text-blue-800 dark:text-blue-300 italic tracking-wide">{panel.title}</h3><p className="text-[11px] text-muted-foreground">{panel.sub}</p></div><div className="w-full space-y-1.5 py-2 flex flex-col justify-end min-h-[310px]" role="region" aria-label={panel.title}>{PYRAMID_LEVEL_DEFS.map((lvl) => { const count = panel.counts[lvl.id] ?? 0; return <div key={`${panel.key}-${lvl.id}`} onClick={() => setActiveLevelModal({ level: lvl, isYtd: panel.key === "ytd" })} className="group relative flex items-center w-full h-8 sm:h-9 cursor-pointer transition-transform duration-200 hover:scale-[1.01]" title={`${lvl.nameEn}: ${count}`}><div className="w-full flex justify-center items-center h-full px-8"><div className={cn("h-full rounded-sm flex items-center justify-center px-2 transition-all duration-300 shadow-xs border border-white/20 dark:border-black/20 group-hover:shadow-md group-hover:brightness-105", lvl.bgColor, lvl.textColor, lvl.widthClass)}><span className="text-[10px] sm:text-xs font-extrabold tracking-tight text-center truncate select-none">{isAr ? lvl.shortNameAr : lvl.shortNameEn}</span></div></div><div className="absolute right-0 top-0 bottom-0 flex items-center justify-start min-w-[28px] pe-1"><span className="text-xs sm:text-sm font-black font-mono text-blue-950 dark:text-blue-300 print:text-slate-950 incident-pyramid-count">{count}</span></div></div>; })}</div></div>)}
        </div>
        <div className="pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"><div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between space-y-2"><div className="flex items-center justify-between"><span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{isAr ? "المؤشرات الاستباقية (Leading Indicators)" : "Leading Indicators"}</span><Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] rounded-lg">Proactive</Badge></div><div className="text-[11px] text-muted-foreground space-y-1"><div className="flex justify-between items-center"><span>• {isAr ? "السلوكيات والظروف غير الآمنة" : "At-Risk Behaviors / Unsafe Conditions"}:</span><span className="font-bold font-mono text-foreground">{monthlyCounts.unsafeActs} ({ytdCounts.unsafeActs} YTD)</span></div><div className="flex justify-between items-center"><span>• {isAr ? "الوقائع الوشيكة (Near Miss)" : "Near Misses"}:</span><span className="font-bold font-mono text-foreground">{monthlyCounts.nearMiss} ({ytdCounts.nearMiss} YTD)</span></div></div></div><div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between space-y-2"><div className="flex items-center justify-between"><span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-amber-600" />{isAr ? "المؤشرات التفاعلية (Lagging Indicators)" : "Lagging Indicators"}</span><Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] rounded-lg">Reactive</Badge></div><div className="text-[11px] text-muted-foreground space-y-1"><div className="flex justify-between items-center"><span>• {isAr ? "إجمالي الإصابات والحوادث (LTI/MTC/FAC)" : "Total Incident Cases"}:</span><span className="font-bold font-mono text-foreground">{monthlyCounts.fatality + monthlyCounts.lostTime + monthlyCounts.restrictedWork + monthlyCounts.medicalTreatment + monthlyCounts.firstAid} ({ytdCounts.fatality + ytdCounts.lostTime + ytdCounts.restrictedWork + ytdCounts.medicalTreatment + ytdCounts.firstAid} YTD)</span></div><div className="flex justify-between items-center"><span>• {isAr ? "الحوادث الجسيمة (Fatal / LTI)" : "Major / LTI Cases"}:</span><span className="font-bold font-mono text-foreground">{monthlyCounts.fatality + monthlyCounts.lostTime} ({ytdCounts.fatality + ytdCounts.lostTime} YTD)</span></div></div></div></div>
      </CardContent>
      {activeLevelModal && <Dialog open={!!activeLevelModal} onOpenChange={(open) => !open && setActiveLevelModal(null)}><DialogContent className="sm:max-w-md rounded-2xl p-6 shadow-xl border border-border"><div className="space-y-5"><DialogHeader className="pb-2 border-b"><div className="flex items-center gap-2.5"><div className={cn("h-4 w-4 rounded-full", activeLevelModal.level.bgColor)} /><DialogTitle className="text-lg font-extrabold text-foreground">{isAr ? activeLevelModal.level.nameAr : activeLevelModal.level.nameEn}</DialogTitle></div><DialogDescription className="text-xs text-muted-foreground font-medium pt-1">{activeLevelModal.isYtd ? rightSubtitle : leftSubtitle} • HSE Tier Analysis</DialogDescription></DialogHeader>{(() => { const stats = getLevelDetailStats(activeLevelModal.level.id, activeLevelModal.isYtd); return <><div className="grid grid-cols-2 gap-3"><div className="p-3 rounded-xl bg-muted/40 border border-border/40"><div className="text-[11px] text-muted-foreground font-semibold">{activeLevelModal.isYtd ? (isAr ? "إجمالي YTD" : "YTD Total Count") : (isAr ? "عدد الشهر الحالي" : "Current Month Count")}</div><div className="text-2xl font-black font-mono text-blue-900 dark:text-blue-300 mt-0.5">{activeLevelModal.isYtd ? stats.yCount : stats.mCount}</div><div className="text-[10px] text-muted-foreground mt-1">{stats.pct}% {isAr ? "من إجمالي السجلات" : "of total HSE logs"}</div></div><div className="p-3 rounded-xl bg-muted/40 border border-border/40"><div className="text-[11px] text-muted-foreground font-semibold">{isAr ? "مقارنة بالشهر السابق" : "Vs. Previous Month"}</div><div className="flex items-center gap-2 mt-0.5"><span className="text-2xl font-black font-mono text-foreground">{stats.pCount}</span>{stats.trend === "up" ? <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] gap-1 px-1.5"><TrendingUp className="h-3 w-3" /> ↑</Badge> : stats.trend === "down" ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 px-1.5"><TrendingDown className="h-3 w-3" /> ↓</Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] gap-1 px-1.5"><Minus className="h-3 w-3" /> →</Badge>}</div><div className="text-[10px] text-muted-foreground mt-1">{isAr ? "الاتجاه الشهري" : "Monthly trend indicator"}</div></div></div><div className="space-y-2 text-xs bg-muted/30 p-3 rounded-xl border border-border/30"><div className="flex justify-between items-center py-1 border-b border-border/30"><span className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-blue-600" />{isAr ? "أكثر موقع/منشأة تأثراً:" : "Top Affected Unit:"}</span><span className="font-bold text-foreground">{stats.topLoc}</span></div><div className="flex justify-between items-center py-1"><span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-600" />{isAr ? "تاريخ آخر تسجيل:" : "Latest Occurrence:"}</span><span className="font-mono font-bold text-foreground">{stats.latestDate}</span></div></div></> })()}<DialogFooter className="pt-2 flex-col sm:flex-row gap-2"><Button variant="outline" onClick={() => setActiveLevelModal(null)} className="rounded-xl text-xs">{isAr ? "إغلاق" : "Close"}</Button><Button onClick={() => { setActiveLevelModal(null); if (onNavigateToRecords) onNavigateToRecords(activeLevelModal.level.id, activeLevelModal.isYtd ? "ytd" : "month"); else setLocation(`/admin/safety-pyramid?level=${activeLevelModal.level.id}&period=${activeLevelModal.isYtd ? "ytd" : "month"}`); }} className="rounded-xl text-xs bg-blue-900 hover:bg-blue-950 text-white gap-1.5 font-bold"><Eye className="h-3.5 w-3.5" /><span>{isAr ? "عرض السجلات المفلترة" : "View Filtered Records"}</span></Button></DialogFooter></div></DialogContent></Dialog>}
    </Card>
  );
}

export default IncidentPyramid;

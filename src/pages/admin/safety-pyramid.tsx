import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { Calendar, Download, Printer, Settings, ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const LEVELS = [
  { id: "fatality", en: "Fatality", ar: "الوفاة", color: "bg-red-700", text: "text-white" },
  { id: "lostTime", en: "Lost-Time Injury (LTI)", ar: "إصابة وقت ضائع (LTI)", color: "bg-red-500", text: "text-white" },
  { id: "restrictedWork", en: "Restricted Work (RWD)", ar: "عمل مقيد (RWD)", color: "bg-orange-500", text: "text-white" },
  { id: "medicalTreatment", en: "Medical Treatment (MTC)", ar: "علاج طبي (MTC)", color: "bg-amber-500", text: "text-slate-950" },
  { id: "firstAid", en: "First Aid (FAC)", ar: "إسعافات أولية (FAC)", color: "bg-yellow-400", text: "text-slate-950" },
  { id: "nearMiss", en: "Near Miss", ar: "واقعة وشيكة", color: "bg-emerald-400", text: "text-slate-950" },
  { id: "unsafeActs", en: "At-Risk / Unsafe", ar: "سلوكيات / ظروف غير آمنة", color: "bg-emerald-700", text: "text-white" },
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
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const previous = useMemo(() => {
    const c = Object.fromEntries(LEVELS.map(l => [l.id, 0])) as Record<LevelId, number>;
    records.forEach(r => { if (r.year === prevYear && r.month === prevMonth) c[r.level]++; });
    return c;
  }, [records, prevMonth, prevYear]);

  const renderPyramid = (data: Record<LevelId, number>, label: string) => (
    <div className="flex-1 min-w-0 rounded-2xl border bg-background p-4">
      <div className="text-center mb-3">
        <h2 className="font-extrabold text-blue-900 dark:text-blue-200">{label}</h2>
        <p className="text-[11px] text-muted-foreground">{isAr ? "المستويات والأعداد" : "Levels and counts"}</p>
      </div>
      <div className="space-y-1.5">
        {LEVELS.map((level, i) => {
          if (!enabled[level.id]) return null;
          const width = `${24 + i * 12}%`;
          const value = data[level.id];
          return (
            <div key={level.id} className="flex items-center min-h-9 gap-2">
              <div className="flex-1 flex justify-center">
                <div className={`${level.color} ${level.text} h-9 rounded-md flex items-center justify-between px-3 shadow-sm transition-all`} style={{ width }}>
                  <span className="text-[10px] sm:text-xs font-extrabold truncate">{isAr ? level.ar : level.en}</span>
                  <span className="font-mono font-black text-sm ms-2">{value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t text-center text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{monthTotal && label.startsWith("Monthly") ? monthTotal : label.startsWith("YTD") ? ytdTotal : total(data)}</span> {isAr ? "إجمالي السجلات" : "total records"}
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

  const print = () => { logActivity("Print Incident Pyramid", `Printed ${monthName} ${selectedYear} Monthly vs YTD`, "reports"); window.print(); };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm">
        <div>
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="h-5 w-5 text-red-600" /></div><h1 className="text-xl font-extrabold">{isAr ? `هرم الحوادث - ${selectedYear}` : `Incident Pyramid - ${selectedYear}`}</h1></div>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "مقارنة الشهر المحدد مع التراكمي منذ بداية السنة (YTD)" : "Comparative safety pyramid for selected month vs. Year-To-Date (YTD) cumulative record"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border rounded-xl px-2 h-9"><Calendar className="h-4 w-4 text-blue-700" /><select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm outline-none">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Intl.DateTimeFormat(isAr?'ar-SA':'en-US',{month:'long'}).format(new Date(2026,i,1))}</option>)}</select></div>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="h-9 border rounded-xl px-2 bg-background text-sm"><option value={2026}>2026</option><option value={2025}>2025</option></select>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="rounded-xl gap-2"><Settings className="h-4 w-4" />{isAr ? "الإعدادات" : "Settings"}</Button>
          <Button variant="outline" onClick={exportCSV} className="rounded-xl gap-2"><Download className="h-4 w-4" />CSV</Button>
          <Button onClick={print} className="rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white"><Printer className="h-4 w-4" />{isAr ? "طباعة" : "Print / PDF"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{monthTotal}</div><div className="text-xs text-muted-foreground">{isAr ? `إجمالي ${monthName}` : `Total ${monthName}`}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{ytdTotal}</div><div className="text-xs text-muted-foreground">YTD {selectedYear}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{counts.monthly.nearMiss}</div><div className="text-xs text-muted-foreground">{isAr ? "وقائع وشيكة" : "Near Misses"}</div></div>
        <div className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{counts.monthly.unsafeActs}</div><div className="text-xs text-muted-foreground">{isAr ? "غير آمن" : "At-Risk / Unsafe"}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderPyramid(counts.monthly, `Monthly • ${monthName}`)}
        {renderPyramid(counts.ytd, `YTD • ${selectedYear}`)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-emerald-500/10 p-4"><h3 className="font-bold text-emerald-800 dark:text-emerald-300">{isAr ? "المؤشرات الاستباقية" : "Leading Indicators"}</h3><p className="text-sm mt-2">Near Miss: <b>{counts.monthly.nearMiss}</b> ({counts.ytd.nearMiss} YTD) • Unsafe: <b>{counts.monthly.unsafeActs}</b> ({counts.ytd.unsafeActs} YTD)</p></div>
        <div className="rounded-2xl border bg-amber-500/10 p-4"><h3 className="font-bold text-amber-800 dark:text-amber-300">{isAr ? "المؤشرات التفاعلية" : "Lagging Indicators"}</h3><p className="text-sm mt-2">LTI/MTC/FAC: <b>{counts.monthly.lostTime + counts.monthly.medicalTreatment + counts.monthly.firstAid}</b> ({counts.ytd.lostTime + counts.ytd.medicalTreatment + counts.ytd.firstAid} YTD)</p></div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent><DialogHeader><DialogTitle>{isAr ? "مستويات الهرم" : "Pyramid Levels"}</DialogTitle><DialogDescription>{isAr ? "اختر المستويات الظاهرة في الهرم." : "Choose which levels are visible."}</DialogDescription></DialogHeader>
          <div className="space-y-2">{LEVELS.map(l => <label key={l.id} className="flex items-center justify-between rounded-lg border p-3"><span>{isAr ? l.ar : l.en}</span><input type="checkbox" checked={enabled[l.id]} onChange={e => { const next = {...enabled, [l.id]: e.target.checked}; setEnabled(next); try { localStorage.setItem("safety_board_pyramid_enabled_v3", JSON.stringify(next)); } catch {} }} /></label>)}</div>
          <DialogFooter><Button onClick={() => setSettingsOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden print:block fixed inset-0 bg-white text-black p-6 z-[9999]">
        <h1 className="text-2xl font-black">Incident Pyramid - {selectedYear}</h1><p>{monthName} {selectedYear} — Monthly vs YTD</p>
        <div className="grid grid-cols-2 gap-8 mt-8">{renderPyramid(counts.monthly, `Monthly • ${monthName}`)}{renderPyramid(counts.ytd, `YTD • ${selectedYear}`)}</div>
      </div>
    </div>
  );
}

import { useEffect } from "react";

const COLORS = ["#991b1b", "#dc2626", "#f59e0b", "#eab308", "#f97316", "#2563eb", "#059669"];

type Level = { id: string; nameEn: string; nameAr: string; order: number };
type Count = { id: string; monthly?: number; ytd?: number };

function decode<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export default function SafetyPyramidPrintPage() {
  const params = new URLSearchParams(window.location.search);
  const isAr = params.get("lang") === "ar";
  const levels = decode<Level[]>(params.get("levels"), []).sort((a, b) => a.order - b.order);
  const counts = decode<Count[]>(params.get("counts"), []);
  const incidents = Number(params.get("incidents") || 0);
  const nearMisses = Number(params.get("nearMisses") || 0);
  const observations = Number(params.get("observations") || 0);
  const monthText = params.get("month") || (isAr ? "الفترة المحددة" : "Selected Period");
  const year = params.get("year") || new Date().getFullYear().toString();

  const countFor = (id: string, mode: "monthly" | "ytd") => {
    const item = counts.find(x => x.id === id);
    return Number(item?.[mode] || 0);
  };

  const renderColumn = (mode: "monthly" | "ytd") => {
    const center = 250;
    const topWidth = 52;
    const bottomWidth = 460;
    const segmentHeight = 64;
    const topY = 34;
    const step = levels.length > 1 ? (bottomWidth - topWidth) / (levels.length - 1) : 0;
    return levels.map((lvl, index) => {
      const wTop = topWidth + step * index;
      const wBottom = index === levels.length - 1 ? bottomWidth : topWidth + step * (index + 1);
      const y = topY + index * segmentHeight;
      const label = isAr ? lvl.nameAr : lvl.nameEn;
      const count = countFor(lvl.id, mode);
      return (
        <g key={`${mode}-${lvl.id}`}>
          <polygon points={`${center-wTop/2},${y} ${center+wTop/2},${y} ${center+wBottom/2},${y+segmentHeight} ${center-wBottom/2},${y+segmentHeight}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth="3" />
          <text x={center} y={y+25} textAnchor="middle" fontFamily="Arial,Segoe UI,sans-serif" fontSize={label.length > 28 ? 9 : 12} fontWeight="700" fill="#ffffff">{label}</text>
          <text x={center} y={y+49} textAnchor="middle" fontFamily="Arial,Segoe UI,sans-serif" fontSize="19" fontWeight="800" fill="#ffffff">{count}</text>
        </g>
      );
    });
  };

  const svgHeight = 34 + levels.length * 64 + 16;

  useEffect(() => {
    document.title = isAr ? "تقرير الهرم الأمني" : "Safety Pyramid Report";
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [isAr]);

  return (
    <main className="pyramid-print-page" dir={isAr ? "rtl" : "ltr"}>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        html, body, #root { margin:0 !important; padding:0 !important; background:#fff !important; }
        body { font-family: Arial, "Segoe UI", sans-serif; color:#111827; }
        .pyramid-print-page { width:100%; max-width:190mm; margin:0 auto; background:#fff; }
        .header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; border-bottom:3px solid #dc2626; padding-bottom:8px; margin-bottom:10px; }
        .header h1 { margin:0; font-size:20px; font-weight:800; }
        .header p { margin:3px 0 0; font-size:10px; color:#64748b; }
        .meta { font-size:8px; color:#475569; text-align:end; white-space:nowrap; }
        .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:10px; }
        .kpi { border:1px solid #cbd5e1; border-radius:6px; padding:6px; text-align:center; background:#f8fafc; }
        .kpi strong { display:block; font-size:16px; }
        .kpi span { display:block; margin-top:1px; font-size:8px; color:#64748b; }
        .columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:start; }
        .column h2 { text-align:center; margin:0 0 4px; font-size:12px; color:#1e3a8a; }
        .column p { text-align:center; margin:0 0 4px; font-size:8px; color:#64748b; }
        svg { display:block; width:100%; height:auto; }
        .footer { display:flex; justify-content:space-between; gap:8px; margin-top:6px; padding-top:4px; border-top:1px solid #cbd5e1; font-size:7px; color:#64748b; }
        @media print { .pyramid-print-page { width:100% !important; max-width:none !important; } }
      `}</style>

      <section className="header">
        <div>
          <h1>{isAr ? "الهرم الأمني الديناميكي" : "Dynamic Safety & Incident Pyramid"}</h1>
          <p>{isAr ? `التقرير المرئي • ${monthText} ${year}` : `Visual report • ${monthText} ${year}`}</p>
        </div>
        <div className="meta">HSE-PYRAMID-01<br />{new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}</div>
      </section>

      <section className="kpis">
        <div className="kpi"><strong>{incidents}</strong><span>{isAr ? "إجمالي الحوادث" : "Total Incidents"}</span></div>
        <div className="kpi"><strong>{nearMisses}</strong><span>{isAr ? "الوقائع الوشيكة" : "Near Misses"}</span></div>
        <div className="kpi"><strong>{observations}</strong><span>{isAr ? "الأفعال والظروف غير الآمنة" : "Unsafe Acts & Conditions"}</span></div>
      </section>

      <section className="columns">
        <div className="column">
          <h2>{isAr ? `الشهر • ${monthText}` : `Monthly • ${monthText}`}</h2>
          <p>{isAr ? "المستويات والأعداد الشهرية" : "Monthly levels and counts"}</p>
          <svg viewBox={`0 0 500 ${svgHeight}`} xmlns="http://www.w3.org/2000/svg" aria-label="Monthly Pyramid">{renderColumn("monthly")}</svg>
        </div>
        <div className="column">
          <h2>{isAr ? `التراكمي YTD • ${year}` : `YTD • ${year}`}</h2>
          <p>{isAr ? "المستويات والأعداد التراكمية" : "Year-to-date levels and counts"}</p>
          <svg viewBox={`0 0 500 ${svgHeight}`} xmlns="http://www.w3.org/2000/svg" aria-label="YTD Pyramid">{renderColumn("ytd")}</svg>
        </div>
      </section>

      <footer className="footer">
        <span>{isAr ? "تم إنشاء التقرير من ABDULKAREM SAFETY BOARD" : "Generated by ABDULKAREM SAFETY BOARD"}</span>
        <span>{isAr ? "تقرير الهرم الأمني" : "Safety Pyramid Report"}</span>
      </footer>
    </main>
  );
}

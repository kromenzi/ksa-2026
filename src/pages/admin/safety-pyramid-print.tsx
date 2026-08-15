import { useEffect, useMemo } from "react";

type Level = { id: string; nameEn: string; nameAr: string; order: number; color: string };
type Count = { id: string; monthly: number; ytd: number };

const LEVELS: Level[] = [
  { id: "fatality", nameEn: "Fatality", nameAr: "الوفاة", order: 1, color: "#991b1b" },
  { id: "lostTime", nameEn: "Lost-Time Injury (LTI)", nameAr: "إصابة وقت ضائع (LTI)", order: 2, color: "#dc2626" },
  { id: "restrictedWork", nameEn: "Restricted Work (RWD)", nameAr: "عمل مقيد (RWD)", order: 3, color: "#f97316" },
  { id: "medicalTreatment", nameEn: "Medical Treatment (MTC)", nameAr: "علاج طبي (MTC)", order: 4, color: "#f59e0b" },
  { id: "firstAid", nameEn: "First Aid (FAC)", nameAr: "إسعافات أولية (FAC)", order: 5, color: "#eab308" },
  { id: "nearMiss", nameEn: "Near Miss", nameAr: "واقعة وشيكة", order: 6, color: "#34d399" },
  { id: "unsafeActs", nameEn: "At-Risk / Unsafe", nameAr: "سلوكيات / ظروف غير آمنة", order: 7, color: "#059669" },
];

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeCounts(input: Count[]): Count[] {
  return LEVELS.map((level) => {
    const found = input.find((item) => item.id === level.id);
    return {
      id: level.id,
      monthly: Number(found?.monthly ?? 0),
      ytd: Number(found?.ytd ?? 0),
    };
  });
}

export default function SafetyPyramidPrintPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isAr = params.get("lang") === "ar";
  const monthText = params.get("month") || (isAr ? "الفترة المحددة" : "Selected Period");
  const year = params.get("year") || new Date().getFullYear().toString();
  const incomingCounts = parseJson<Count[]>(params.get("counts"), []);
  const counts = normalizeCounts(incomingCounts);

  const totalIncidentsParam = Number(params.get("incidents") || 0);
  const nearMissParam = Number(params.get("nearMisses") || 0);
  const observationsParam = Number(params.get("observations") || 0);
  const incidents = totalIncidentsParam || counts.reduce((sum, item) => {
    return sum + (item.id === "fatality" || item.id === "lostTime" || item.id === "restrictedWork" || item.id === "medicalTreatment" || item.id === "firstAid" ? item.monthly : 0);
  }, 0);
  const nearMisses = nearMissParam || counts.find((item) => item.id === "nearMiss")?.monthly || 0;
  const observations = observationsParam || counts.find((item) => item.id === "unsafeActs")?.monthly || 0;

  useEffect(() => {
    document.title = isAr ? "تقرير هرم الحوادث" : "Incident Pyramid Report";
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [isAr]);

  const renderPyramid = (mode: "monthly" | "ytd") => {
    const centerX = 250;
    const topWidth = 70;
    const bottomWidth = 450;
    const segmentHeight = 61;
    const topY = 14;
    const step = (bottomWidth - topWidth) / (LEVELS.length - 1);

    return LEVELS.map((level, index) => {
      const top = topWidth + step * index;
      const bottom = topWidth + step * Math.min(index + 1, LEVELS.length - 1);
      const y = topY + index * segmentHeight;
      const count = counts.find((item) => item.id === level.id)?.[mode] ?? 0;
      const label = isAr ? level.nameAr : level.nameEn;
      return (
        <g key={`${mode}-${level.id}`}>
          <polygon
            points={`${centerX - top / 2},${y} ${centerX + top / 2},${y} ${centerX + bottom / 2},${y + segmentHeight} ${centerX - bottom / 2},${y + segmentHeight}`}
            fill={level.color}
            stroke="#ffffff"
            strokeWidth="3"
          />
          <text x={centerX} y={y + 22} textAnchor="middle" fontFamily="Arial,Segoe UI,sans-serif" fontSize={label.length > 28 ? 9 : 12} fontWeight="700" fill="#ffffff">
            {label}
          </text>
          <text x={centerX} y={y + 48} textAnchor="middle" fontFamily="Arial,Segoe UI,sans-serif" fontSize="18" fontWeight="800" fill="#ffffff">
            {count}
          </text>
        </g>
      );
    });
  };

  const svgHeight = 14 + LEVELS.length * 61 + 10;

  return (
    <main dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#fff", color: "#111827", fontFamily: "Arial, Segoe UI, sans-serif", padding: "0" }}>
      <style>{`
        @page { size: A4 portrait; margin: 9mm; }
        * { box-sizing: border-box; }
        html, body, #root { margin:0; padding:0; background:#fff !important; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .page { width:100%; max-width:190mm; margin:0 auto; }
        .header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding-bottom:10px; border-bottom:3px solid #dc2626; }
        .brand { display:flex; align-items:center; gap:10px; }
        .brand img { width:80px; height:52px; object-fit:contain; }
        .title h1 { margin:0; font-size:20px; font-weight:800; }
        .title p { margin:3px 0 0; color:#64748b; font-size:10px; }
        .meta { text-align:right; font-size:9px; color:#475569; white-space:nowrap; }
        .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin:10px 0; }
        .kpi { border:1px solid #cbd5e1; border-radius:7px; padding:7px; text-align:center; }
        .kpi strong { display:block; font-size:17px; font-weight:800; }
        .kpi span { display:block; margin-top:2px; color:#64748b; font-size:8px; }
        .columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .column { border:1px solid #cbd5e1; border-radius:8px; padding:6px; }
        .column h2 { margin:0; text-align:center; font-size:12px; color:#1e3a8a; }
        .column p { margin:2px 0 4px; text-align:center; font-size:8px; color:#64748b; }
        svg { display:block; width:100%; height:auto; }
        .footer { margin-top:8px; padding-top:5px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; gap:10px; font-size:7px; color:#64748b; }
        @media print { .page { max-width:none; } }
      `}</style>

      <div className="page">
        <section className="header">
          <div className="brand">
            <img src="/logo.png" alt="ABDULKAREM SAFETY BOARD" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="title">
              <h1>{isAr ? `هرم الحوادث - ${year}` : `Incident Pyramid - ${year}`}</h1>
              <p>{isAr ? "مقارنة الشهر المحدد مع التراكمي منذ بداية السنة (YTD)" : "Comparative safety pyramid for selected month vs. Year-To-Date (YTD) cumulative record"}</p>
            </div>
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
            <svg viewBox={`0 0 500 ${svgHeight}`} role="img" aria-label="Monthly Incident Pyramid">{renderPyramid("monthly")}</svg>
          </div>
          <div className="column">
            <h2>{isAr ? `التراكمي YTD • ${year}` : `YTD • ${year}`}</h2>
            <p>{isAr ? "المستويات والأعداد التراكمية" : "Year-to-date levels and counts"}</p>
            <svg viewBox={`0 0 500 ${svgHeight}`} role="img" aria-label="YTD Incident Pyramid">{renderPyramid("ytd")}</svg>
          </div>
        </section>

        <footer className="footer">
          <span>{isAr ? "تم إنشاء التقرير من ABDULKAREM SAFETY BOARD" : "Generated by ABDULKAREM SAFETY BOARD"}</span>
          <span>{isAr ? "تقرير هرم الحوادث" : "Incident Pyramid Report"}</span>
        </footer>
      </div>
    </main>
  );
}

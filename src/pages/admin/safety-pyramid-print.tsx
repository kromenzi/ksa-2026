import { useEffect, useMemo, useState } from "react";

type Level = {
  id: string;
  nameEn: string;
  nameAr: string;
  order: number;
  color: string;
  textColor: string;
};
type Count = { id: string; monthly: number; ytd: number };

const LEVELS: Level[] = [
  { id: "fatality", nameEn: "Fatality", nameAr: "الوفاة", order: 1, color: "#991b1b", textColor: "#ffffff" },
  { id: "lostTime", nameEn: "Lost-Time Injury (LTI)", nameAr: "إصابة وقت ضائع (LTI)", order: 2, color: "#dc2626", textColor: "#ffffff" },
  { id: "restrictedWork", nameEn: "Restricted Work (RWD)", nameAr: "عمل مقيد (RWD)", order: 3, color: "#f97316", textColor: "#ffffff" },
  { id: "medicalTreatment", nameEn: "Medical Treatment (MTC)", nameAr: "علاج طبي (MTC)", order: 4, color: "#f59e0b", textColor: "#111827" },
  { id: "firstAid", nameEn: "First Aid (FAC)", nameAr: "إسعافات أولية (FAC)", order: 5, color: "#eab308", textColor: "#111827" },
  { id: "nearMiss", nameEn: "Near Miss", nameAr: "واقعة وشيكة", order: 6, color: "#34d399", textColor: "#111827" },
  { id: "unsafeActs", nameEn: "At-Risk / Unsafe", nameAr: "سلوكيات / ظروف غير آمنة", order: 7, color: "#059669", textColor: "#ffffff" },
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

function Pyramid({ mode, counts, isAr }: { mode: "monthly" | "ytd"; counts: Count[]; isAr: boolean }) {
  return (
    <div className="pyramid" aria-label={mode === "monthly" ? "Monthly Incident Pyramid" : "YTD Incident Pyramid"}>
      {LEVELS.map((level, index) => {
        const count = counts.find((item) => item.id === level.id)?.[mode] ?? 0;
        const width = 24 + index * 12;
        return (
          <div className="pyramid-row" key={`${mode}-${level.id}`}>
            <div
              className="pyramid-layer"
              style={{
                width: `${width}%`,
                backgroundColor: level.color,
                color: level.textColor,
                borderColor: "#ffffff",
              }}
            >
              <span className="pyramid-label">{isAr ? level.nameAr : level.nameEn}</span>
              <span className="pyramid-value">{count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SafetyPyramidPrintPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isAr = params.get("lang") === "ar";
  const monthText = params.get("month") || (isAr ? "الفترة المحددة" : "Selected Period");
  const year = params.get("year") || new Date().getFullYear().toString();
  const incomingCounts = parseJson<Count[]>(params.get("counts"), []);
  const counts = normalizeCounts(incomingCounts);
  const [ready, setReady] = useState(false);

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

    const markReady = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {}
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      setReady(true);
    };

    void markReady();
  }, [isAr]);

  const handlePrint = () => {
    if (ready) window.print();
  };

  return (
    <main dir={isAr ? "rtl" : "ltr"}>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; }
        html, body, #root { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body { font-family: Arial, "Segoe UI", sans-serif; color: #111827; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        main { min-height: 100vh; background: #fff; }
        .page { width: 100%; max-width: 190mm; margin: 0 auto; }
        .toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
        .print-button { border: 0; border-radius: 8px; background: #1d4ed8; color: #fff; padding: 9px 16px; font-weight: 700; cursor: pointer; }
        .print-button:disabled { opacity: .55; cursor: wait; }
        .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 3px solid #dc2626; padding-bottom: 9px; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand img { width: 72px; height: 48px; object-fit: contain; }
        .title h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .title p { margin: 3px 0 0; color: #64748b; font-size: 9px; }
        .meta { text-align: right; font-size: 8px; color: #475569; white-space: nowrap; }
        .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 9px 0; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 7px; padding: 7px; text-align: center; }
        .kpi strong { display: block; font-size: 16px; font-weight: 800; }
        .kpi span { display: block; margin-top: 2px; color: #64748b; font-size: 8px; }
        .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .column { border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; break-inside: avoid; page-break-inside: avoid; }
        .column h2 { margin: 0; text-align: center; color: #1e3a8a; font-size: 12px; }
        .column p { margin: 2px 0 5px; text-align: center; color: #64748b; font-size: 8px; }
        .pyramid { display: flex; flex-direction: column; gap: 2px; width: 100%; align-items: center; }
        .pyramid-row { width: 100%; display: flex; justify-content: center; height: 32px; }
        .pyramid-layer { min-width: 24%; height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 8px; border: 2px solid #fff; border-radius: 3px; font-weight: 800; overflow: hidden; }
        .pyramid-label { font-size: 8px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pyramid-value { font-size: 12px; line-height: 1; font-family: Arial, sans-serif; }
        .footer { margin-top: 7px; padding-top: 5px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; gap: 10px; color: #64748b; font-size: 7px; }
        @media print {
          .toolbar { display: none !important; }
          .page { max-width: none; width: 100%; }
          .header, .kpis, .columns, .column, .pyramid, .pyramid-row, .pyramid-layer, .footer { display: block; visibility: visible !important; opacity: 1 !important; }
          .header { display: flex !important; }
          .kpis { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; }
          .columns { display: grid !important; grid-template-columns: 1fr 1fr !important; }
          .pyramid { display: flex !important; }
          .pyramid-row { display: flex !important; }
          .pyramid-layer { display: flex !important; }
        }
      `}</style>

      <div className="page">
        <div className="toolbar">
          <button className="print-button" type="button" onClick={handlePrint} disabled={!ready}>
            {ready ? (isAr ? "طباعة التقرير" : "Print Report") : (isAr ? "جاري تجهيز التقرير..." : "Preparing report...")}
          </button>
        </div>

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
            <Pyramid mode="monthly" counts={counts} isAr={isAr} />
          </div>
          <div className="column">
            <h2>{isAr ? `التراكمي YTD • ${year}` : `YTD • ${year}`}</h2>
            <p>{isAr ? "المستويات والأعداد التراكمية" : "Year-to-date levels and counts"}</p>
            <Pyramid mode="ytd" counts={counts} isAr={isAr} />
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

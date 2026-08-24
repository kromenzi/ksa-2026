import { useMemo } from "react";

type Level = {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
  textColor: string;
};
type Count = { id: string; monthly: number; ytd: number };

const LEVELS: Level[] = [
  { id: "fatality", nameEn: "Fatality", nameAr: "الوفاة", color: "#991b1b", textColor: "#ffffff" },
  { id: "lostTime", nameEn: "Lost-Time Injury (LTI)", nameAr: "إصابة وقت ضائع (LTI)", color: "#dc2626", textColor: "#ffffff" },
  { id: "restrictedWork", nameEn: "Restricted Work (RWD)", nameAr: "عمل مقيد (RWD)", color: "#f97316", textColor: "#ffffff" },
  { id: "medicalTreatment", nameEn: "Medical Treatment (MTC)", nameAr: "علاج طبي (MTC)", color: "#f59e0b", textColor: "#111827" },
  { id: "firstAid", nameEn: "First Aid (FAC)", nameAr: "إسعافات أولية (FAC)", color: "#eab308", textColor: "#111827" },
  { id: "nearMiss", nameEn: "Near Miss", nameAr: "واقعة وشيكة", color: "#34d399", textColor: "#111827" },
  { id: "unsafeActs", nameEn: "At-Risk / Unsafe", nameAr: "سلوكيات / ظروف غير آمنة", color: "#059669", textColor: "#ffffff" },
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
    return { id: level.id, monthly: Number(found?.monthly ?? 0), ytd: Number(found?.ytd ?? 0) };
  });
}

function Pyramid({ mode, counts, isAr }: { mode: "monthly" | "ytd"; counts: Count[]; isAr: boolean }) {
  return (
    <div className="pyramid">
      {LEVELS.map((level, index) => {
        const count = counts[index]?.[mode] ?? 0;
        const width = 24 + index * 12;
        return (
          <div className="pyramid-row" key={`${mode}-${level.id}`}>
            <div className="pyramid-layer" style={{ width: `${width}%`, backgroundColor: level.color, color: level.textColor }}>
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
  const year = params.get("year") || String(new Date().getFullYear());
  const counts = normalizeCounts(parseJson<Count[]>(params.get("counts"), []));

  const incidents = Number(params.get("incidents") || counts.slice(0, 5).reduce((sum, item) => sum + item.monthly, 0));
  const nearMisses = Number(params.get("nearMisses") || counts.find((item) => item.id === "nearMiss")?.monthly || 0);
  const observations = Number(params.get("observations") || counts.find((item) => item.id === "unsafeActs")?.monthly || 0);

  const printNow = () => window.print();

  return (
    <main dir={isAr ? "rtl" : "ltr"}>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        html, body, #root { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body { font-family: Arial, "Segoe UI", sans-serif; color: #111827; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        main { min-height: 100vh; background: #fff; }
        .page { width: 100%; margin: 0 auto; }
        .toolbar { display: flex; justify-content: flex-end; margin-bottom: 8mm; }
        .print-button { border: 0; border-radius: 8px; background: #1d4ed8; color: #fff; padding: 9px 16px; font-weight: 700; cursor: pointer; }
        .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 3px solid #dc2626; padding-bottom: 5mm; margin-bottom: 5mm; }
        .title h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .title p { margin: 3px 0 0; color: #64748b; font-size: 11px; }
        .meta { text-align: right; font-size: 9px; color: #475569; }
        .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-bottom: 5mm; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 4mm; text-align: center; }
        .kpi strong { display: block; font-size: 22px; font-weight: 800; }
        .kpi span { display: block; margin-top: 2px; color: #64748b; font-size: 10px; }
        .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
        .column { border: 1px solid #cbd5e1; border-radius: 8px; padding: 5mm; }
        .column h2 { margin: 0; text-align: center; color: #1e3a8a; font-size: 16px; }
        .column p { margin: 2mm 0 4mm; text-align: center; color: #64748b; font-size: 10px; }
        .pyramid { display: flex; flex-direction: column; gap: 2mm; align-items: center; }
        .pyramid-row { width: 100%; display: flex; justify-content: center; height: 11mm; }
        .pyramid-layer { height: 10mm; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 4mm; border: 2px solid #fff; border-radius: 4px; font-weight: 800; }
        .pyramid-label { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pyramid-value { font-size: 13px; font-family: Arial, sans-serif; }
        .footer { margin-top: 5mm; padding-top: 2mm; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; color: #64748b; font-size: 8px; }
        @media print { .toolbar { display: none !important; } .page { width: 100%; } }
      `}</style>

      <div className="page">
        <div className="toolbar"><button className="print-button" type="button" onClick={printNow}>{isAr ? "طباعة التقرير" : "Print Report"}</button></div>

        <section className="header">
          <div className="title">
            <h1>{isAr ? `هرم الحوادث - ${year}` : `Incident Pyramid - ${year}`}</h1>
            <p>{isAr ? `مقارنة ${monthText} مع التراكمي ${year}` : `Monthly ${monthText} vs YTD ${year}`}</p>
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

        <footer className="footer"><span>UTEC SAFETY BOARD</span><span>Incident Pyramid Report</span></footer>
      </div>
    </main>
  );
}

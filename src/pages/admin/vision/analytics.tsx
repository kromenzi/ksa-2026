import { useData } from "@/lib/data-context";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VisionAnalytics() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">CAMERA & ESP ANALYTICS</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "تحليلات وإحصائيات الرؤية الذكية (Vision Analytics)" : "Camera & ESP AI Safety Analytics"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "اتجاهات الالتزام بمعدات الوقاية، معدل الإنذارات الخاطئة، وزمن استجابة فرق السلامة" : "Violation trends by plant, PPE compliance trajectory & false positive rate performance"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border p-4 rounded-2xl bg-card">
          <CardHeader className="p-0 mb-3"><CardTitle className="text-sm">{isAr ? "المخالفات حسب المصنع" : "Violations by Plant"}</CardTitle></CardHeader>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1"><span>Plant 1 - Steel Fab</span><span className="font-bold">42%</span></div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-indigo-600 w-[42%]" /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Plant 2 - Chemical</span><span className="font-bold">28%</span></div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[28%]" /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Logistics Hub</span><span className="font-bold">18%</span></div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[18%]" /></div>
            </div>
          </div>
        </Card>

        <Card className="border p-4 rounded-2xl bg-card">
          <CardHeader className="p-0 mb-3"><CardTitle className="text-sm">{isAr ? "نسبة الإنذارات الخاطئة (AI False Positive Rate)" : "AI False Positive Rate"}</CardTitle></CardHeader>
          <div className="text-3xl font-black font-mono text-emerald-600">2.4%</div>
          <p className="text-xs text-muted-foreground mt-2">{isAr ? "ضمن المعايير الصناعية الممتازة (<5%)" : "Well within enterprise target threshold (< 5%)"}</p>
        </Card>
      </div>
    </div>
  );
}

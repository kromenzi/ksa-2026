import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function VisionHeatmap() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-rose-600 text-white font-mono text-xs mb-1">FACTORY RISK HEATMAP</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "الخريطة الحرارية للمخاطر بالمصنع (Safety Heatmap)" : "Factory Safety Risk Heatmap"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "تمثيل بصري لمناطق كثرة مخالفات السلامة والوشيكة بالمصنع" : "Visual spatial density of PPE violations, restricted area breaches and equipment near-misses"}
        </p>
      </div>

      <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden bg-slate-950 p-6 min-h-[480px] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(244,63,94,0.4),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(245,158,11,0.3),transparent_45%)]" />
        <div className="relative z-10 text-white space-y-2">
          <div className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            {isAr ? "كثافة المخاطر المرصودة تلقائياً" : "AI Spatial Risk Intensity Density"}
          </div>
          <p className="text-xs text-slate-400">
            {isAr ? "المنطقة الأكثر خطورة: باحة الشحن الكيميائي والونش العلوي" : "Highest risk density zone: Chemical Storage Yard B & Overhead Crane Bay 1"}
          </p>
        </div>
      </Card>
    </div>
  );
}

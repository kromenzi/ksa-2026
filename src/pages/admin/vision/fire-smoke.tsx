import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

export default function VisionFireSmoke() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-rose-600 text-white font-mono text-xs mb-1">THERMAL FIRE & SMOKE ENGINE</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "كشف الدخان والحريق الحراري (Fire & Smoke Detection)" : "AI Fire & Smoke Thermal Detection Center"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "التقاط حراري فوري لللهب، انبعاثات الدخان الخفيفة والثقيلة، وارتفاع الحرارة المفرط" : "Thermal & optical AI analytics for early fire, flame particle and smoke plume detection"}
        </p>
      </div>

      <Card className="border border-rose-500/30 bg-rose-500/5 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-rose-600 text-white rounded-2xl animate-pulse">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-rose-900 dark:text-rose-100">
              {isAr ? "حالة المراقبة الحرارية: سليمة وآمنة" : "Thermal Monitoring Status: ALL CLEAR"}
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {isAr ? "جميع كاميرات الكشف الحراري والبصري تعمل بكفاءة 100%" : "Thermal & flame detection sensors operating normally"}
            </p>
          </div>
        </div>

        <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-mono">5 THERMAL SENSORS ONLINE</Badge>
      </Card>
    </div>
  );
}

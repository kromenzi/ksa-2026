import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VisionPeopleVehicles() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-emerald-600 text-white font-mono text-xs mb-1">PERSON & VEHICLE TRACKING</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "تتبع الأفراد والمركبات (People & Vehicle Analytics)" : "Person & Vehicle AI Tracking Engine"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "تتبع التواجد، أعداد العمال، حركة المركبات، وأحداث تقارب المشاة مع المعدات" : "Real-time count and motion analysis for staff, visitors, trucks and forklifts"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border p-4 rounded-2xl bg-card">
          <div className="text-xs text-muted-foreground">{isAr ? "الأفراد بالموقع حالياً" : "Current People On-Site"}</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">142</div>
        </Card>
        <Card className="border p-4 rounded-2xl bg-card">
          <div className="text-xs text-muted-foreground">{isAr ? "المركبات والروافع النشطة" : "Active Vehicles & Forklifts"}</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">18</div>
        </Card>
        <Card className="border p-4 rounded-2xl bg-card">
          <div className="text-xs text-muted-foreground">{isAr ? "أحداث التقارب اليوم" : "Proximity Near-Misses"}</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">3</div>
        </Card>
      </div>
    </div>
  );
}

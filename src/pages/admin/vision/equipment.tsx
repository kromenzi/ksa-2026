import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

export default function VisionEquipment() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const equipmentItems = [
    { name: isAr ? "الرافعة الشوكية (Forklift) - ممر 4" : "Forklift Aisle 4", status: "Active Detection", risk: "Proximity Event", camera: "CAM-106", severity: "HIGH" },
    { name: isAr ? "الونش العلوي (Overhead Crane) - باحة 1" : "Overhead Crane Bay 1", status: "Active Detection", risk: "Suspended Load Near Pedestrian", camera: "CAM-103", severity: "HIGH" },
    { name: isAr ? "مخرج الطوارئ ب" : "Emergency Exit Door B", status: "Blocked Area", risk: "Pallet Obstruction", camera: "CAM-108", severity: "LOW" },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-blue-600 text-white font-mono text-xs mb-1">EQUIPMENT & VEHICLE SAFETY</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "مراقبة سلامة المعدات والروافع (Equipment Monitoring)" : "Equipment & Machinery AI Safety Monitoring"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "كشف اقتراب المشاة من المعدات المتحركة، انسداد مخارج الطوارئ، ومواقف المعدات غير الآمنة" : "Automated AI tracking for forklifts, overhead cranes, blocked emergency exits & machine barriers"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {equipmentItems.map((item) => (
          <Card key={item.name} className="border border-border/70 shadow-sm bg-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Truck className="w-5 h-5 text-blue-500" />
              <Badge className={item.severity === "HIGH" ? "bg-orange-600 text-white" : "bg-amber-500 text-white"}>{item.severity}</Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.risk}</p>
            </div>
            <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
              {item.camera}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";

export default function VisionEvents() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const timelineEvents = [
    { time: "09:42:15", title: "Restricted Area Entry Detected", camera: "CAM-102 (Chemical Yard)", severity: "HIGH", confidence: "94%" },
    { time: "09:38:00", title: "No Safety Helmet Violation", camera: "CAM-103 (Crane Bay 1)", severity: "MEDIUM", confidence: "96%" },
    { time: "09:25:10", title: "Forklift Pedestrian Proximity Event", camera: "CAM-106 (Warehouse Aisle 4)", severity: "HIGH", confidence: "91%" },
    { time: "08:50:44", title: "Thermal Fire & Smoke Alert", camera: "CAM-105 (Substation Alpha)", severity: "CRITICAL", confidence: "89%" },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">CHRONOLOGICAL EVENT TIMELINE</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "السجل الزمني للأحداث (AI Event Timeline)" : "AI Vision Event Timeline"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "التسلسل الزمني اللحظي لكافة اللقطات والأحداث المرصودة" : "Chronological safety log with snapshots and RCA investigation links"}
        </p>
      </div>

      <div className="relative border-s-2 border-indigo-200 dark:border-indigo-900 ms-4 space-y-6">
        {timelineEvents.map((evt, idx) => (
          <div key={idx} className="ms-6 relative">
            <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950" />
            <Card className="border p-4 rounded-2xl bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{evt.time}</span>
                <Badge className={evt.severity === "CRITICAL" ? "bg-rose-600" : "bg-orange-600 text-white"}>{evt.severity}</Badge>
              </div>
              <h3 className="font-bold text-sm">{evt.title}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                {evt.camera} • Confidence: {evt.confidence}
              </p>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

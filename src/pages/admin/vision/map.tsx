import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredCameras, type CameraDevice } from "@/lib/vision-store";
import CameraStream from "@/components/camera-stream";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera, Filter, ZoomIn, ZoomOut
} from "lucide-react";

export default function VisionMap() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [cameras] = useState<CameraDevice[]>(() => getStoredCameras());
  const [selectedPlant, setSelectedPlant] = useState("All");
  const [selectedCamPin, setSelectedCamPin] = useState<CameraDevice | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const filteredCameras = cameras.filter((cam) => {
    const matchPlant = selectedPlant === "All" || cam.plant === selectedPlant;
    return matchPlant;
  });

  const getPinColor = (cam: CameraDevice) => {
    if (cam.status === "OFFLINE") return "bg-rose-500 text-white shadow-rose-500/50";
    if (cam.status === "WARNING") return "bg-amber-500 text-white shadow-amber-500/50";
    if (cam.aiStatus === "Active") return "bg-indigo-600 text-white shadow-indigo-500/50";
    return "bg-emerald-500 text-white shadow-emerald-500/50";
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-600 text-white font-mono text-xs">FACTORY GEOSPATIAL MAP</Badge>
            <span className="text-xs text-muted-foreground">• {isAr ? "خريطة التوزيع الجغرافي للكاميرات" : "Interactive Camera Distribution"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAr ? "خريطة الكاميرات والمخطط الصناعي (Camera Map)" : "Interactive Factory Camera Map"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? "توزيع الكاميرات على مخطط المصنع، تتبع مناطق الخطورة، ومعاينة البث الفوري بالنقر" : "Factory floor camera positioning, zone risk overlays and click-to-preview live feeds"}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border/60 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{isAr ? "متصلة" : "Online"}</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />{isAr ? "ذكاء نشط" : "AI Active"}</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{isAr ? "تحذير" : "Warning"}</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />{isAr ? "غير متصلة" : "Offline"}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {["All", "Plant 1 - Steel Fab", "Plant 2 - Chemical", "Logistics Hub", "Utilities & Power"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={selectedPlant === p ? "default" : "outline"}
              className={`text-xs h-8 rounded-lg shrink-0 ${selectedPlant === p ? "bg-indigo-600 text-white" : ""}`}
              onClick={() => setSelectedPlant(p)}
            >
              {p}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden bg-slate-950 relative min-h-[580px] select-none">
        <div
          className="w-full h-full min-h-[580px] relative transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />

          <div className="absolute top-8 left-12 border border-indigo-500/30 bg-indigo-950/40 p-4 rounded-2xl text-indigo-300 font-mono text-xs">
            PLANT 1 - STEEL FABRICATION & CRANE YARD
          </div>
          <div className="absolute top-8 right-12 border border-rose-500/30 bg-rose-950/40 p-4 rounded-2xl text-rose-300 font-mono text-xs">
            PLANT 2 - CHEMICAL & HAZMAT SOLVENTS
          </div>
          <div className="absolute bottom-12 left-12 border border-amber-500/30 bg-amber-950/40 p-4 rounded-2xl text-amber-300 font-mono text-xs">
            UTILITIES & POWER SUBSTATION 33kV
          </div>
          <div className="absolute bottom-12 right-12 border border-emerald-500/30 bg-emerald-950/40 p-4 rounded-2xl text-emerald-300 font-mono text-xs">
            LOGISTICS HUB & MAIN WAREHOUSE
          </div>

          {filteredCameras.map((cam) => {
            const left = cam.xCoord ?? 50;
            const top = cam.yCoord ?? 50;
            const pinColor = getPinColor(cam);

            return (
              <button
                key={cam.id}
                onClick={() => setSelectedCamPin(cam)}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full font-mono text-[11px] font-bold shadow-lg transition-transform hover:scale-125 flex items-center gap-1 z-20 cursor-pointer ${pinColor}`}
                title={`${cam.name} (${cam.id}) - Click to View Live Feed`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">{cam.id}</span>

                {cam.activeAlertsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!selectedCamPin} onOpenChange={() => setSelectedCamPin(null)}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center justify-between text-white">
              <span>{selectedCamPin?.name} ({selectedCamPin?.id})</span>
              <Badge className="bg-indigo-600 text-white">{selectedCamPin?.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedCamPin && (
            <div className="space-y-4 pt-2">
              <CameraStream
                cameraId={selectedCamPin.id}
                cameraName={selectedCamPin.name}
                plant={selectedCamPin.plant}
                area={selectedCamPin.area}
                status={selectedCamPin.status}
                aiActive={selectedCamPin.aiStatus === "Active"}
                fps={selectedCamPin.fps}
                resolution={selectedCamPin.resolution}
                recording={selectedCamPin.recordingStatus === "Recording"}
                interactivePtz={true}
                heightClassName="h-64"
              />

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block">{isAr ? "الموقع والمصنع" : "Location"}</span>
                  <span className="font-semibold">{selectedCamPin.plant} - {selectedCamPin.area}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? "عنوان IP والنوع" : "IP & Type"}</span>
                  <span className="font-semibold font-mono">{selectedCamPin.ip} ({selectedCamPin.type})</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

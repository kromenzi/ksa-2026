import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredCameras, type CameraDevice } from "@/lib/vision-store";
import CameraStream from "@/components/camera-stream";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Camera, Search, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function VisionLive() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [allCameras] = useState<CameraDevice[]>(() => getStoredCameras());
  const [gridSize, setGridSize] = useState<1 | 4 | 9 | 16 | 25>(4);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState<string>("All");
  const [fullscreenCam, setFullscreenCam] = useState<CameraDevice | null>(null);

  const filteredCameras = allCameras.filter((cam) => {
    const matchesSearch = cam.name.toLowerCase().includes(searchQuery.toLowerCase()) || cam.id.toLowerCase().includes(searchQuery.toLowerCase()) || cam.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlant = selectedPlant === "All" || cam.plant === selectedPlant;
    return matchesSearch && matchesPlant;
  });

  const displayCameras = filteredCameras.slice(0, gridSize);

  const handleTakeSnapshot = (camName: string) => {
    toast.success(isAr ? `تم التقاط لقطة شاشة للكاميرا: ${camName}` : `Snapshot saved for camera: ${camName}`);
  };

  const gridClassMap = {
    1: "grid-cols-1",
    4: "grid-cols-1 sm:grid-cols-2",
    9: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    16: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    25: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5",
  };

  const plantsList = ["All", "Plant 1 - Steel Fab", "Plant 2 - Chemical", "Plant 3 - Assembly", "Logistics Hub", "Utilities & Power"];

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-rose-600 text-white font-mono text-xs animate-pulse">LIVE CCTV MATRIX</Badge>
            <span className="text-xs text-slate-400">• {isAr ? "جدار المراقبة الصناعية المباشر" : "Industrial CCTV Matrix"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? "جدار المراقبة المباشرة (Live Camera Wall)" : "Live CCTV Camera Wall"}
          </h1>
          <p className="text-xs text-slate-400">
            {isAr ? "عرض شبكي متعدد الكاميرات بجهوزية التحليل الذكي والتحكم بالتكبير والتوجيه (PTZ)" : "Multi-channel camera grid viewer with active AI vision overlays and PTZ control"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 me-1">{isAr ? "شاشة الشبكة:" : "Grid View:"}</span>
          {([1, 4, 9, 16, 25] as const).map((size) => (
            <Button
              key={size}
              size="sm"
              variant={gridSize === size ? "default" : "outline"}
              className={gridSize === size ? "bg-indigo-600 text-white font-bold" : "border-slate-800 text-slate-300 hover:bg-slate-900"}
              onClick={() => setGridSize(size)}
            >
              {size} {isAr ? "كاميرا" : "CAM"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            placeholder={isAr ? "بحث عن كاميرا بالموقع أو الاسم أو المعرف..." : "Search camera by name, ID or area..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border-slate-800 text-slate-200 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 me-1 shrink-0" />
          {plantsList.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={selectedPlant === p ? "secondary" : "ghost"}
              className={`text-xs h-8 rounded-lg shrink-0 ${selectedPlant === p ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              onClick={() => setSelectedPlant(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${gridClassMap[gridSize]}`}>
        {displayCameras.map((cam) => (
          <div key={cam.id} className="relative">
            <CameraStream
              cameraId={cam.id}
              cameraName={cam.name}
              plant={cam.plant}
              area={cam.area}
              status={cam.status}
              aiActive={cam.aiStatus === "Active"}
              fps={cam.fps}
              resolution={cam.resolution}
              recording={cam.recordingStatus === "Recording"}
              activeAlerts={cam.activeAlertsCount}
              interactivePtz={true}
              heightClassName={gridSize === 1 ? "h-[650px]" : gridSize <= 4 ? "h-[340px]" : gridSize <= 9 ? "h-[240px]" : "h-[180px]"}
              onOpenDetails={() => setFullscreenCam(cam)}
              onTakeSnapshot={() => handleTakeSnapshot(cam.name)}
            />
          </div>
        ))}
      </div>

      <Dialog open={!!fullscreenCam} onOpenChange={() => setFullscreenCam(null)}>
        <DialogContent className="max-w-5xl bg-slate-950 border-slate-800 text-white p-6 rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <Camera className="w-5 h-5 text-indigo-400" />
                {fullscreenCam?.name} ({fullscreenCam?.id})
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                {fullscreenCam?.plant} • {fullscreenCam?.area} • RTSP://192.168.10.x/stream
              </p>
            </div>
            <Badge className="bg-emerald-500 text-white text-xs">{fullscreenCam?.status}</Badge>
          </DialogHeader>

          {fullscreenCam && (
            <div className="space-y-4 py-2">
              <CameraStream
                cameraId={fullscreenCam.id}
                cameraName={fullscreenCam.name}
                plant={fullscreenCam.plant}
                area={fullscreenCam.area}
                status={fullscreenCam.status}
                aiActive={fullscreenCam.aiStatus === "Active"}
                fps={fullscreenCam.fps}
                resolution={fullscreenCam.resolution}
                recording={fullscreenCam.recordingStatus === "Recording"}
                activeAlerts={fullscreenCam.activeAlertsCount}
                interactivePtz={true}
                heightClassName="h-[520px]"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">{isAr ? "نوع الكاميرا" : "Type"}</span>
                  <span className="font-semibold">{fullscreenCam.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? "دقة البث" : "Resolution"}</span>
                  <span className="font-semibold">{fullscreenCam.resolution} @ {fullscreenCam.fps} FPS</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? "سيرفر NVR" : "NVR Server"}</span>
                  <span className="font-semibold">{fullscreenCam.nvrId || "NVR-01"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? "درجة صحة الكاميرا" : "Health Score"}</span>
                  <span className="font-semibold text-emerald-400">{fullscreenCam.healthScore}%</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

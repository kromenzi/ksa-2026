import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Maximize2, Volume2, VolumeX, Eye, ShieldAlert,
  Radio, ZoomIn, ZoomOut,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CameraStreamProps {
  cameraId: string;
  cameraName: string;
  plant?: string;
  area?: string;
  status?: string;
  aiActive?: boolean;
  fps?: number;
  resolution?: string;
  recording?: boolean;
  activeAlerts?: number;
  interactivePtz?: boolean;
  showOverlayControls?: boolean;
  heightClassName?: string;
  onOpenDetails?: () => void;
  onTakeSnapshot?: () => void;
  className?: string;
}

export default function CameraStream({
  cameraId,
  cameraName,
  plant = "Plant 1",
  area = "Zone A",
  status = "ONLINE",
  aiActive = true,
  fps = 28,
  resolution = "1920x1080",
  recording = true,
  activeAlerts = 0,
  interactivePtz = false,
  showOverlayControls = true,
  heightClassName = "h-48 sm:h-56",
  onOpenDetails,
  onTakeSnapshot,
  className
}: CameraStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [ptzZoom, setPtzZoom] = useState(1);
  const [ptzOffset, setPtzOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const render = () => {
      step += 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.fillStyle = status === "OFFLINE" ? "#020617" : "#080d1a";
      ctx.fillRect(0, 0, w, h);

      if (status === "OFFLINE") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SIGNAL LOST / CONNECTION OFFLINE", w / 2, h / 2 - 10);
        ctx.fillStyle = "#64748b";
        ctx.font = "11px sans-serif";
        ctx.fillText(`RTSP://192.168.10.x/stream_${cameraId.toLowerCase()}`, w / 2, h / 2 + 15);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(w / 2 + ptzOffset.x, h / 2 + ptzOffset.y);
      ctx.scale(ptzZoom, ptzZoom);
      ctx.translate(-w / 2, -h / 2);

      ctx.strokeStyle = "rgba(30, 58, 138, 0.15)";
      ctx.lineWidth = 1;
      const gridGap = 30;
      for (let x = 0; x < w; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
      ctx.fillRect(40, h - 80, 120, 60);
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(w - 140, h - 110, 100, 90);

      const gearX = 100;
      const gearY = h - 50;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gearX, gearY, 15, step * 0.05, step * 0.05 + Math.PI * 1.5);
      ctx.stroke();

      if (aiActive) {
        ctx.strokeStyle = activeAlerts > 0 ? "rgba(239, 68, 68, 0.7)" : "rgba(245, 158, 11, 0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.rect(30, 30, w - 60, h - 70);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (aiActive) {
        const p1X = 60 + Math.sin(step * 0.03) * 40;
        const p1Y = 70 + Math.cos(step * 0.02) * 15;
        
        ctx.strokeStyle = activeAlerts > 0 ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 2;
        ctx.strokeRect(p1X, p1Y, 32, 54);

        ctx.fillStyle = activeAlerts > 0 ? "#ef4444" : "#22c55e";
        ctx.fillRect(p1X, p1Y - 18, 85, 18);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(activeAlerts > 0 ? "NO HELMET 96%" : "PPE OK 98%", p1X + 4, p1Y - 5);

        ctx.fillStyle = activeAlerts > 0 ? "#f87171" : "#86efac";
        ctx.beginPath();
        ctx.arc(p1X + 16, p1Y + 12, 6, 0, Math.PI * 2);
        ctx.fill();

        if (activeAlerts > 0 || cameraId.includes("106") || cameraId.includes("103")) {
          const fkX = w - 160 + Math.cos(step * 0.02) * 20;
          const fkY = h - 75;

          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2;
          ctx.strokeRect(fkX, fkY, 70, 45);

          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(fkX, fkY - 16, 110, 16);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 9px monospace";
          ctx.fillText("FORKLIFT DETECTED 92%", fkX + 3, fkY - 4);
        }
      }

      ctx.restore();

      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      const dateStr = new Date().toISOString().replace("T", " ").substring(0, 19);
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`CAM: ${cameraId} | ${cameraName.toUpperCase()}`, 10, 18);
      
      ctx.textAlign = "right";
      ctx.fillText(`${dateStr} | ${fps} FPS | ${resolution}`, w - 10, 18);

      if (recording) {
        const pulse = Math.sin(step * 0.1) > 0;
        ctx.fillStyle = pulse ? "#ef4444" : "rgba(239, 68, 68, 0.3)";
        ctx.beginPath();
        ctx.arc(15, h - 15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText("REC", 25, h - 11);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraId, cameraName, status, aiActive, fps, resolution, recording, activeAlerts, ptzZoom, ptzOffset]);

  const handleZoom = (direction: "in" | "out") => {
    setPtzZoom((prev) => Math.max(1, Math.min(3, direction === "in" ? prev + 0.25 : prev - 0.25)));
  };

  const handlePan = (dx: number, dy: number) => {
    setPtzOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  return (
    <div className={cn("relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md flex flex-col justify-between select-none", heightClassName, className)}>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-cover block cursor-pointer"
        onClick={onOpenDetails}
      />

      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn("text-[10px] px-2 py-0.5 font-semibold tracking-wide", status === "ONLINE" ? "bg-emerald-500/90 text-white" : status === "WARNING" ? "bg-amber-500/90 text-white" : "bg-rose-600 text-white")}>
            <Radio className="w-2.5 h-2.5 me-1 animate-pulse" />
            {status}
          </Badge>

          {aiActive && (
            <Badge className="bg-indigo-600/90 text-white text-[10px] px-2 py-0.5 font-semibold">
              <ShieldCheck className="w-2.5 h-2.5 me-1" />
              ESP AI
            </Badge>
          )}

          {activeAlerts > 0 && (
            <Badge className="bg-rose-500 text-white text-[10px] px-2 py-0.5 font-bold animate-bounce me-1">
              <ShieldAlert className="w-2.5 h-2.5 me-1" />
              {activeAlerts} {activeAlerts === 1 ? "ALERT" : "ALERTS"}
            </Badge>
          )}
        </div>

        <div className="text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
          {plant} • {area}
        </div>
      </div>

      {interactivePtz && (
        <div className="absolute top-12 left-2 flex flex-col items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-1 gap-1 z-20">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handlePan(0, -15)} title="Pan Up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handlePan(-15, 0)} title="Pan Left">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handlePan(15, 0)} title="Pan Right">
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handlePan(0, 15)} title="Pan Down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <div className="w-full h-px bg-white/20 my-0.5" />
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handleZoom("in")} title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200 hover:bg-white/20" onClick={() => handleZoom("out")} title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {showOverlayControls && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between z-10">
          <div className="text-xs font-semibold text-white truncate max-w-[180px]">
            {cameraName}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-white/20 rounded-md"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>

            {onTakeSnapshot && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white hover:bg-white/20 rounded-md"
                onClick={onTakeSnapshot}
                title="Take Snapshot"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
            )}

            {onOpenDetails && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white hover:bg-white/20 rounded-md"
                onClick={onOpenDetails}
                title="Camera Details & Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

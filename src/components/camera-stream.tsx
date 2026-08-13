import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Maximize2, Volume2, VolumeX, Eye, ShieldAlert, Radio, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
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
  streamUrl?: string;
  streamType?: "hls" | "webrtc" | "mjpeg";
  rtspUrl?: string;
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
  className,
  streamUrl,
  streamType,
  rtspUrl,
}: CameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [ptzZoom, setPtzZoom] = useState(1);
  const [ptzOffset, setPtzOffset] = useState({ x: 0, y: 0 });

  // For production CCTV, set VITE_CAMERA_GATEWAY_URL to an on-prem HLS/WebRTC gateway.
  const gatewayBase = (import.meta.env.VITE_CAMERA_GATEWAY_URL as string | undefined)?.replace(/\/$/, "");
  const gatewayHlsUrl = gatewayBase ? `${gatewayBase}/streams/${encodeURIComponent(cameraId)}/index.m3u8` : undefined;
  const effectiveStreamUrl = streamUrl || gatewayHlsUrl;
  const effectiveStreamType = streamType || (gatewayHlsUrl ? "hls" : undefined);
  const isBrowserStream = Boolean(effectiveStreamUrl && effectiveStreamType);

  useEffect(() => setLiveError(false), [effectiveStreamUrl, effectiveStreamType, cameraId]);

  useEffect(() => {
    if (effectiveStreamType !== "hls" || !effectiveStreamUrl || !videoRef.current) return;
    const video = videoRef.current;
    let hls: any;
    let disposed = false;

    const start = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = effectiveStreamUrl;
        try { await video.play(); } catch {}
        return;
      }
      try {
        const mod: any = await import("https://cdn.jsdelivr.net/npm/hls.js@1.5.20/+esm");
        if (disposed || !mod?.default?.isSupported?.()) return;
        const Hls = mod.default;
        hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
        hls.loadSource(effectiveStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event: unknown, data: any) => {
          if (data?.fatal) setLiveError(true);
        });
      } catch {
        setLiveError(true);
      }
    };
    void start();
    return () => { disposed = true; try { hls?.destroy?.(); } catch {} };
  }, [effectiveStreamUrl, effectiveStreamType]);

  useEffect(() => {
    if (isBrowserStream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = status === "OFFLINE" ? "#ef4444" : "#f59e0b";
      ctx.font = "bold 14px monospace";
      ctx.fillText(status === "OFFLINE" ? "CAMERA OFFLINE" : "LIVE STREAM NOT CONFIGURED", w / 2, h / 2 - 16);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText(rtspUrl ? "RTSP is not browser-playable; configure the camera gateway." : "Configure a real HLS/WebRTC/MJPEG stream URL.", w / 2, h / 2 + 10);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(rtspUrl || `CAMERA: ${cameraId}`, w / 2, h / 2 + 34);
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [isBrowserStream, status, rtspUrl, cameraId]);

  const handleZoom = (direction: "in" | "out") => setPtzZoom((prev) => Math.max(1, Math.min(3, direction === "in" ? prev + 0.25 : prev - 0.25)));
  const handlePan = (dx: number, dy: number) => setPtzOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));

  return (
    <div className={cn("relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md flex flex-col justify-between select-none", heightClassName, className)}>
      {isBrowserStream ? (
        <video
          ref={videoRef}
          src={effectiveStreamType === "mjpeg" ? effectiveStreamUrl : undefined}
          autoPlay
          playsInline
          muted={isMuted}
          controls={false}
          onError={() => setLiveError(true)}
          className="w-full h-full object-cover block cursor-pointer bg-black"
          style={{ transform: `translate(${ptzOffset.x}px, ${ptzOffset.y}px) scale(${ptzZoom})` }}
          onClick={onOpenDetails}
        />
      ) : (
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover block cursor-pointer" onClick={onOpenDetails} />
      )}

      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn("text-[10px] px-2 py-0.5 font-semibold tracking-wide", liveError ? "bg-rose-600 text-white" : status === "ONLINE" ? "bg-emerald-500/90 text-white" : status === "WARNING" ? "bg-amber-500/90 text-white" : "bg-rose-600 text-white")}>
            <Radio className="w-2.5 h-2.5 me-1" />{liveError ? "STREAM ERROR" : status}
          </Badge>
          {isBrowserStream && <Badge className="bg-cyan-600/90 text-white text-[10px] px-2 py-0.5 font-semibold">LIVE</Badge>}
          {aiActive && <Badge className="bg-indigo-600/90 text-white text-[10px] px-2 py-0.5 font-semibold"><ShieldCheck className="w-2.5 h-2.5 me-1" />ESP AI</Badge>}
          {activeAlerts > 0 && <Badge className="bg-rose-500 text-white text-[10px] px-2 py-0.5 font-bold"><ShieldAlert className="w-2.5 h-2.5 me-1" />{activeAlerts} ALERTS</Badge>}
        </div>
        <div className="text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">{plant} • {area}</div>
      </div>

      {interactivePtz && (
        <div className="absolute top-12 left-2 flex flex-col items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-1 gap-1 z-20">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(0, -15)}><ArrowUp className="w-3.5 h-3.5" /></Button>
          <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(-15, 0)}><ArrowLeft className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(15, 0)}><ArrowRight className="w-3.5 h-3.5" /></Button></div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(0, 15)}><ArrowDown className="w-3.5 h-3.5" /></Button>
          <div className="w-full h-px bg-white/20 my-0.5" />
          <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handleZoom("in")}><ZoomIn className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handleZoom("out")}><ZoomOut className="w-3.5 h-3.5" /></Button></div>
        </div>
      )}

      {showOverlayControls && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between z-10">
          <div className="text-xs font-semibold text-white truncate max-w-[180px]">{cameraName}</div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => setIsMuted((v) => !v)}>{isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}</Button>
            {onTakeSnapshot && <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={onTakeSnapshot}><Eye className="w-3.5 h-3.5" /></Button>}
            {onOpenDetails && <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={onOpenDetails}><Maximize2 className="w-3.5 h-3.5" /></Button>}
          </div>
        </div>
      )}
    </div>
  );
}

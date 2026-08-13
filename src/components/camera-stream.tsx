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

declare global { interface Window { Hls?: any } }

export default function CameraStream({
  cameraId, cameraName, plant = "Plant 1", area = "Zone A", status = "ONLINE",
  aiActive = true, fps = 28, resolution = "1920x1080", recording = true,
  activeAlerts = 0, interactivePtz = false, showOverlayControls = true,
  heightClassName = "h-48 sm:h-56", onOpenDetails, onTakeSnapshot,
  className, streamUrl, streamType, rtspUrl,
}: CameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [ptzZoom, setPtzZoom] = useState(1);
  const [ptzOffset, setPtzOffset] = useState({ x: 0, y: 0 });

  const configuredGateway = (import.meta.env.VITE_CAMERA_GATEWAY_URL as string | undefined)?.replace(/\/$/, "");
  const localTestGateway = cameraId === "CAM-101" ? "http://localhost:1984" : undefined;
  const gatewayBase = configuredGateway || localTestGateway;
  const gatewayHlsUrl = gatewayBase ? `${gatewayBase}/api/stream.m3u8?src=${encodeURIComponent(cameraId === "CAM-101" ? "phone" : cameraId)}` : undefined;
  const effectiveStreamUrl = streamUrl || gatewayHlsUrl;
  const effectiveStreamType = streamType || (gatewayHlsUrl ? "hls" : undefined);
  const isBrowserStream = Boolean(effectiveStreamUrl && effectiveStreamType);

  useEffect(() => setLiveError(false), [effectiveStreamUrl, effectiveStreamType]);

  useEffect(() => {
    if (effectiveStreamType !== "hls" || !effectiveStreamUrl || !videoRef.current) return;
    const video = videoRef.current;
    let hls: any;
    let disposed = false;
    let script: HTMLScriptElement | null = null;

    const startNative = async () => {
      video.src = effectiveStreamUrl;
      try { await video.play(); } catch { /* autoplay may be blocked */ }
    };
    const attachHls = () => {
      if (disposed || !window.Hls?.isSupported?.()) { if (!disposed) startNative(); return; }
      hls = new window.Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.ERROR, (_event: unknown, data: any) => { if (data?.fatal) setLiveError(true); });
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) startNative();
    else if (window.Hls) attachHls();
    else {
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
      script.async = true;
      script.onload = attachHls;
      script.onerror = () => setLiveError(true);
      document.head.appendChild(script);
    }
    return () => { disposed = true; try { hls?.destroy?.(); } catch {} if (script?.parentNode) script.parentNode.removeChild(script); };
  }, [effectiveStreamUrl, effectiveStreamType]);

  useEffect(() => {
    if (isBrowserStream) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    let frame = 0;
    const render = () => {
      ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center"; ctx.fillStyle = status === "OFFLINE" ? "#ef4444" : "#f59e0b";
      ctx.font = "bold 14px monospace"; ctx.fillText(status === "OFFLINE" ? "CAMERA OFFLINE" : "LIVE STREAM NOT CONFIGURED", canvas.width / 2, canvas.height / 2 - 16);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px sans-serif";
      ctx.fillText(rtspUrl ? "RTSP requires the camera gateway." : "Configure a real HLS/WebRTC/MJPEG stream.", canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillStyle = "#64748b"; ctx.font = "10px monospace"; ctx.fillText(rtspUrl || `CAMERA: ${cameraId}`, canvas.width / 2, canvas.height / 2 + 34);
      frame = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(frame);
  }, [isBrowserStream, status, rtspUrl, cameraId]);

  const handleZoom = (direction: "in" | "out") => setPtzZoom((p) => Math.max(1, Math.min(3, direction === "in" ? p + 0.25 : p - 0.25)));
  const handlePan = (dx: number, dy: number) => setPtzOffset((p) => ({ x: p.x + dx, y: p.y + dy }));

  return <div className={cn("relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md flex flex-col justify-between select-none", heightClassName, className)}>
    {isBrowserStream ? <video ref={videoRef} autoPlay playsInline muted={isMuted} controls={false} onError={() => setLiveError(true)} onClick={onOpenDetails} className="w-full h-full object-cover block cursor-pointer bg-black" style={{ transform: `translate(${ptzOffset.x}px, ${ptzOffset.y}px) scale(${ptzZoom})` }} /> : <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover block cursor-pointer" onClick={onOpenDetails} />}

    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={cn("text-[10px] px-2 py-0.5 font-semibold tracking-wide", liveError ? "bg-rose-600 text-white" : status === "ONLINE" ? "bg-emerald-500/90 text-white" : status === "WARNING" ? "bg-amber-500/90 text-white" : "bg-rose-600 text-white")}><Radio className="w-2.5 h-2.5 me-1" />{liveError ? "STREAM ERROR" : status}</Badge>
        {isBrowserStream && <Badge className="bg-cyan-600/90 text-white text-[10px] px-2 py-0.5 font-semibold">LIVE</Badge>}
        {aiActive && <Badge className="bg-indigo-600/90 text-white text-[10px] px-2 py-0.5 font-semibold"><ShieldCheck className="w-2.5 h-2.5 me-1" />ESP AI</Badge>}
        {activeAlerts > 0 && <Badge className="bg-rose-500 text-white text-[10px] px-2 py-0.5 font-bold"><ShieldAlert className="w-2.5 h-2.5 me-1" />{activeAlerts} ALERTS</Badge>}
      </div>
      <div className="text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">{plant} • {area} • {resolution} • {fps} FPS{recording ? " • REC" : ""}</div>
    </div>

    {interactivePtz && <div className="absolute top-12 left-2 flex flex-col items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-1 gap-1 z-20">
      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(0, -15)}><ArrowUp className="w-3.5 h-3.5" /></Button>
      <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(-15, 0)}><ArrowLeft className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(15, 0)}><ArrowRight className="w-3.5 h-3.5" /></Button></div>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handlePan(0, 15)}><ArrowDown className="w-3.5 h-3.5" /></Button>
      <div className="w-full h-px bg-white/20 my-0.5" />
      <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handleZoom("in")}><ZoomIn className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-200" onClick={() => handleZoom("out")}><ZoomOut className="w-3.5 h-3.5" /></Button></div>
    </div>}

    {showOverlayControls && <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between z-10">
      <div className="text-xs font-semibold text-white truncate max-w-[180px]">{cameraName}</div>
      <div className="flex items-center gap-1"><Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => setIsMuted((v) => !v)}>{isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}</Button>{onTakeSnapshot && <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={onTakeSnapshot}><Eye className="w-3.5 h-3.5" /></Button>}{onOpenDetails && <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={onOpenDetails}><Maximize2 className="w-3.5 h-3.5" /></Button>}</div>
    </div>}
  </div>;
}

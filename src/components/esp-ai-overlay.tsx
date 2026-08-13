import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ScanFace } from "lucide-react";

type Detection = {
  label?: string;
  class?: string;
  confidence?: number;
  score?: number;
  bbox?: number[];
  box?: number[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  zone?: string;
  alert?: string;
};

type AiPayload = {
  detections?: Detection[];
  results?: Detection[];
  alerts?: Array<{ type?: string; message?: string; severity?: string }>;
  frame_width?: number;
  frame_height?: number;
};

const labelAr: Record<string, string> = {
  person: "شخص",
  car: "سيارة",
  truck: "شاحنة",
  bus: "حافلة",
  motorcycle: "دراجة نارية",
  forklift: "رافعة شوكية",
  helmet: "خوذة",
  safety_vest: "سترة سلامة",
  vest: "سترة سلامة",
  fall: "سقوط محتمل",
  restricted_zone: "منطقة ممنوعة",
  crowd: "تجمع",
};

function normalizeBox(d: Detection, width: number, height: number) {
  const raw = d.bbox || d.box || [d.x1, d.y1, d.x2, d.y2];
  if (!raw || raw.length < 4 || raw.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  let [x1, y1, x2, y2] = raw as number[];
  const normalized = Math.max(Math.abs(x1), Math.abs(y2)) <= 1.5 && Math.max(Math.abs(x2), Math.abs(y2)) <= 1.5;
  if (!normalized && width > 0 && height > 0) {
    x1 /= width; x2 /= width; y1 /= height; y2 /= height;
  }
  return {
    left: Math.max(0, Math.min(100, x1 * 100)),
    top: Math.max(0, Math.min(100, y1 * 100)),
    width: Math.max(0, Math.min(100, (x2 - x1) * 100)),
    height: Math.max(0, Math.min(100, (y2 - y1) * 100)),
  };
}

export default function EspAiOverlay({ cameraId, enabled = true }: { cameraId: string; enabled?: boolean }) {
  const [payload, setPayload] = useState<AiPayload | null>(null);
  const [error, setError] = useState(false);
  const endpoint = (import.meta.env.VITE_ESP_AI_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8090";

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`${endpoint}/api/detections?camera_id=${encodeURIComponent(cameraId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`ESP AI HTTP ${response.status}`);
        const data = await response.json();
        if (!stopped) { setPayload(data); setError(false); }
      } catch {
        if (!stopped) setError(true);
      }
    };
    poll();
    const timer = window.setInterval(poll, 1000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [endpoint, cameraId, enabled]);

  const detections = useMemo(() => payload?.detections || payload?.results || [], [payload]);
  const alerts = payload?.alerts || [];
  const frameWidth = payload?.frame_width || 1920;
  const frameHeight = payload?.frame_height || 1080;
  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[8]">
      {detections.map((d, index) => {
        const box = normalizeBox(d, frameWidth, frameHeight);
        if (!box) return null;
        const label = d.label || d.class || "object";
        const confidence = Number(d.confidence ?? d.score ?? 0);
        const risky = /fall|restricted|crowd|helmet|vest|safety/i.test(`${label} ${d.alert || ""}`);
        return (
          <div key={`${label}-${index}`} className="absolute" style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}>
            <div className={cn("absolute inset-0 border-2 rounded-sm", risky ? "border-rose-400" : "border-cyan-400")} />
            <Badge className={cn("absolute -top-5 left-0 whitespace-nowrap text-[9px] px-1.5 py-0.5", risky ? "bg-rose-600 text-white" : "bg-cyan-600/95 text-white")}>
              {labelAr[label.toLowerCase()] || label} {confidence > 0 ? `${Math.round(confidence * 100)}%` : ""}
            </Badge>
          </div>
        );
      })}

      {(alerts.length > 0 || detections.some((d) => d.alert || /fall|restricted|crowd/i.test(`${d.label || d.class || ""}`))) && (
        <div className="absolute top-12 right-2 max-w-[85%] space-y-1">
          {alerts.slice(0, 3).map((a, i) => (
            <Badge key={i} className="bg-rose-600/95 text-white shadow-lg text-[10px] px-2 py-1 block w-fit ms-auto">
              <ShieldAlert className="inline-block w-3 h-3 me-1" />{a.message || a.type || "ESP AI Alert"}
            </Badge>
          ))}
        </div>
      )}

      <div className="absolute bottom-10 left-2 flex items-center gap-1">
        <Badge className={cn("text-[9px] px-1.5 py-0.5", error ? "bg-amber-600/90" : "bg-indigo-600/90", "text-white")}>
          <ScanFace className="w-3 h-3 me-1" />ESP AI {error ? "OFFLINE" : detections.length ? `${detections.length} كشف` : "ACTIVE"}
        </Badge>
      </div>
    </div>
  );
}

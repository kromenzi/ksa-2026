import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredRecordings, type CameraRecording } from "@/lib/vision-store";
import CameraStream from "@/components/camera-stream";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Search, Film } from "lucide-react";

export default function VisionRecordings() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [recordings] = useState(() => getStoredRecordings());
  const [searchQuery, setSearchQuery] = useState("");
  const [playingRec, setPlayingRec] = useState<CameraRecording | null>(null);

  const filtered = recordings.filter((r: CameraRecording) => r.cameraName.toLowerCase().includes(searchQuery.toLowerCase()) || r.area.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">RECORDINGS ARCHIVE</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "تسجيلات الكاميرات والأرشيف (Camera Recordings)" : "Camera Video Recordings & Playback"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "البحث والتشغيل وتصدير مقاطع التسجيلات السابقة حسب الوقت والمنطقة والكاميرا" : "Search, playback and export historical NVR footage by date, camera and violation event"}
        </p>
      </div>

      <div className="flex items-center gap-2 max-w-md bg-card p-2 rounded-xl border">
        <Search className="w-4 h-4 text-muted-foreground me-1" />
        <Input placeholder={isAr ? "بحث بالاسم أو الكاميرا..." : "Search recording by camera name..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 text-xs border-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((rec: CameraRecording) => (
          <Card key={rec.id} className="border border-border/70 shadow-sm bg-card rounded-2xl overflow-hidden p-3 space-y-3">
            <div className="relative h-36 bg-slate-950 rounded-xl flex items-center justify-center cursor-pointer group" onClick={() => setPlayingRec(rec)}>
              <Film className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <Badge className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-mono">{rec.durationMinutes} MIN</Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm truncate">{rec.cameraName}</h3>
              <p className="text-xs text-muted-foreground font-mono">{rec.startTime}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-[11px] text-muted-foreground font-mono">{rec.fileSizeMb} MB</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={() => setPlayingRec(rec)}>
                <Play className="w-3 h-3 fill-current" />
                {isAr ? "تشغيل" : "Play"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!playingRec} onOpenChange={() => setPlayingRec(null)}>
        <DialogContent className="max-w-3xl bg-slate-950 text-white p-6 rounded-2xl border-slate-800">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base text-white font-bold">{playingRec?.cameraName} - Playback</DialogTitle>
          </DialogHeader>
          {playingRec && (
            <div className="py-2">
              <CameraStream cameraId={playingRec.cameraId} cameraName={playingRec.cameraName} heightClassName="h-80" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RadioTower, Video, VideoOff, Mic, MonitorUp, MessageSquare, Users, LogOut, Square, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LiveMeeting = {
  id: string;
  roomCode: string;
  title: string;
  provider: string;
  providerRoomName: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  createdBy: string;
  startedAt: string;
  endedAt?: string | null;
};

export default function LiveMeetingPage() {
  const { currentUser, settings } = useData();
  const isAr = settings.language === "ar";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(isAr ? "اجتماع سلامة مباشر" : "Safety Live Meeting");
  const [active, setActive] = useState<LiveMeeting | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: meetings = [], isLoading } = useQuery<LiveMeeting[]>({
    queryKey: ["/api/live-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/live-meetings", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load live meetings");
      const payload = await res.json();
      return Array.isArray(payload) ? payload : [];
    },
    refetchInterval: 10000,
  });

  const liveMeetings = useMemo(() => meetings.filter((m) => m.status === "live"), [meetings]);

  const startMeeting = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/live-meetings", { title: title.trim() || "Safety Live Meeting" });
      const meeting = await res.json() as LiveMeeting;
      await apiRequest("POST", "/api/live-meeting-participants", {
        meetingId: meeting.id,
        displayName: currentUser?.name || "Host",
        role: "host",
      });
      setActive(meeting);
      queryClient.invalidateQueries({ queryKey: ["/api/live-meetings"] });
      toast.success(isAr ? "بدأ الاجتماع المباشر" : "Live meeting started");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر بدء الاجتماع" : "Unable to start meeting"));
    } finally {
      setBusy(false);
    }
  };

  const joinMeeting = async (meeting: LiveMeeting) => {
    try {
      await apiRequest("POST", "/api/live-meeting-participants", {
        meetingId: meeting.id,
        displayName: currentUser?.name || "Participant",
        role: meeting.createdBy === currentUser?.id ? "host" : "participant",
      });
    } catch {
      // Joining the media room should remain available even if attendance logging fails.
    }
    setActive(meeting);
  };

  const endMeeting = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const res = await apiRequest("PATCH", `/api/live-meetings/${encodeURIComponent(active.id)}`, {
        status: "completed",
        endedAt: new Date().toISOString(),
      });
      await res.json().catch(() => null);
      setActive(null);
      queryClient.invalidateQueries({ queryKey: ["/api/live-meetings"] });
      toast.success(isAr ? "تم إنهاء الاجتماع" : "Meeting ended");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر إنهاء الاجتماع" : "Unable to end meeting"));
    } finally {
      setBusy(false);
    }
  };

  const meetingUrl = active ? `https://meet.jit.si/${encodeURIComponent(active.providerRoomName)}` : "";

  if (active) {
    return (
      <div className="fixed inset-0 z-[70] bg-slate-950 text-white flex flex-col" dir={isAr ? "rtl" : "ltr"}>
        <div className="h-14 px-3 md:px-5 border-b border-white/10 bg-slate-950/95 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <RadioTower className="h-4 w-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold truncate">{active.title}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-white/45 truncate">{active.roomCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={async () => {
                await navigator.clipboard.writeText(meetingUrl).catch(() => {});
                toast.success(isAr ? "تم نسخ رابط الاجتماع" : "Meeting link copied");
              }}
            >
              <Copy className="h-4 w-4 me-1.5" />
              <span className="hidden sm:inline">{isAr ? "نسخ الرابط" : "Copy link"}</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={endMeeting}
              disabled={busy}
              className="rounded-xl"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Square className="h-4 w-4 me-1.5" />}
              {isAr ? "إنهاء" : "End"}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-black">
          <iframe
            title="Safety Board Live Meeting"
            src={meetingUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <div className="h-10 px-3 border-t border-white/10 bg-slate-950 flex items-center justify-center gap-4 text-[10px] text-white/45">
          <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> {isAr ? "الميكروفون" : "Microphone"}</span>
          <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {isAr ? "الكاميرا" : "Camera"}</span>
          <span className="flex items-center gap-1"><MonitorUp className="h-3 w-3" /> {isAr ? "مشاركة الشاشة" : "Screen share"}</span>
          <span className="hidden sm:flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {isAr ? "الدردشة" : "Chat"}</span>
          <span className="hidden sm:flex items-center gap-1"><Users className="h-3 w-3" /> {isAr ? "المشاركون" : "Participants"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <div className="rounded-3xl border border-border/60 bg-card/80 overflow-hidden">
        <div className="p-5 md:p-7 bg-gradient-to-br from-red-500/[0.08] via-background to-background">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-500 mb-3">
                <RadioTower className="h-3.5 w-3.5" />
                {isAr ? "Safety Board Live" : "Safety Board Live"}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {isAr ? "اجتماع مباشر داخل البورد" : "Live meeting inside Safety Board"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                {isAr
                  ? "كاميرا، مايك، مشاركة شاشة، دردشة ومشاركون في غرفة واحدة مدمجة داخل النظام."
                  : "Camera, microphone, screen sharing, chat and participants in one room embedded inside the system."}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center shrink-0">
              {[
                [Video, isAr ? "كاميرا" : "Camera"],
                [Mic, isAr ? "مايك" : "Mic"],
                [MonitorUp, isAr ? "شاشة" : "Share"],
                [MessageSquare, isAr ? "دردشة" : "Chat"],
              ].map(([Icon, label]: any) => (
                <div key={label} className="rounded-2xl border border-border/50 bg-background/70 px-3 py-3 min-w-[68px]">
                  <Icon className="h-4 w-4 mx-auto mb-1.5 text-primary" />
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 md:p-7 border-t border-border/50">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? "اسم الاجتماع" : "Meeting title"}
              className="h-11 rounded-xl"
              maxLength={160}
            />
            <Button onClick={startMeeting} disabled={busy} className="h-11 rounded-xl md:px-6">
              {busy ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <RadioTower className="h-4 w-4 me-2" />}
              {isAr ? "بدء اجتماع مباشر" : "Start Live Meeting"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/70 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">{isAr ? "الاجتماعات المباشرة" : "Live meetings"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr ? `${liveMeetings.length} اجتماع نشط` : `${liveMeetings.length} active meeting(s)`}
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/40">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              {isAr ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : liveMeetings.length === 0 ? (
            <div className="p-10 text-center">
              <VideoOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">{isAr ? "لا يوجد اجتماع مباشر الآن" : "No live meeting right now"}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "ابدأ أول اجتماع من الأعلى." : "Start the first meeting above."}</p>
            </div>
          ) : (
            liveMeetings.map((meeting) => (
              <div key={meeting.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <RadioTower className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{meeting.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold">LIVE</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {meeting.roomCode} · {new Date(meeting.startedAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.open(`https://meet.jit.si/${encodeURIComponent(meeting.providerRoomName)}`, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                    {isAr ? "نافذة جديدة" : "Open"}
                  </Button>
                  <Button size="sm" className="rounded-xl" onClick={() => joinMeeting(meeting)}>
                    <Video className="h-3.5 w-3.5 me-1.5" />
                    {isAr ? "انضمام" : "Join"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

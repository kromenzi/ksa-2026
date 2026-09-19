import { useMemo, useState } from "react";
import { Copy, ExternalLink, Radio, Square, Video } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LiveMeeting = {
  id: string;
  room_code: string;
  title: string;
  provider_room_name: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

export default function LiveMeetingPage() {
  const { currentUser, settings } = useData();
  const isAr = settings.language === "ar";
  const [title, setTitle] = useState(isAr ? "اجتماع سلامة مباشر" : "Safety Live Meeting");
  const [meeting, setMeeting] = useState<LiveMeeting | null>(null);
  const [loading, setLoading] = useState(false);

  const roomUrl = useMemo(() => {
    if (!meeting) return "";
    const params = new URLSearchParams({
      "config.prejoinPageEnabled": "true",
      "config.startWithAudioMuted": "false",
      "config.startWithVideoMuted": "false",
      "userInfo.displayName": currentUser?.name || "Safety User",
    });
    return `https://meet.jit.si/${encodeURIComponent(meeting.provider_room_name)}#${params.toString()}`;
  }, [meeting, currentUser?.name]);

  const startMeeting = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/live-meetings", { title });
      const data = await res.json();
      setMeeting(data);
      toast.success(isAr ? "تم بدء الاجتماع المباشر" : "Live meeting started");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر بدء الاجتماع" : "Unable to start meeting"));
    } finally {
      setLoading(false);
    }
  };

  const endMeeting = async () => {
    if (!meeting) return;
    try {
      await apiRequest("PATCH", `/api/live-meetings?id=${encodeURIComponent(meeting.id)}`, { status: "completed" });
      setMeeting(null);
      toast.success(isAr ? "تم إنهاء الاجتماع" : "Meeting ended");
    } catch (error: any) {
      toast.error(error?.message || "Unable to end meeting");
    }
  };

  const copyLink = async () => {
    if (!roomUrl) return;
    await navigator.clipboard.writeText(roomUrl);
    toast.success(isAr ? "تم نسخ رابط الاجتماع" : "Meeting link copied");
  };

  if (meeting && roomUrl) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> LIVE
              </span>
              <h1 className="text-xl font-bold">{meeting.title}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? "الكاميرا والمايك والدردشة ومشاركة الشاشة داخل نافذة الاجتماع." : "Camera, microphone, chat and screen sharing are available inside the meeting room."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}><Copy className="me-2 h-4 w-4" />{isAr ? "نسخ الرابط" : "Copy link"}</Button>
            <Button variant="outline" onClick={() => window.open(roomUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="me-2 h-4 w-4" />{isAr ? "فتح بنافذة" : "Open window"}</Button>
            <Button variant="destructive" onClick={endMeeting}><Square className="me-2 h-4 w-4" />{isAr ? "إنهاء الاجتماع" : "End meeting"}</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-black shadow-sm" style={{ minHeight: "72vh" }}>
          <iframe
            title={meeting.title}
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="h-[72vh] w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Video className="h-6 w-6 text-red-600" />
          {isAr ? "الاجتماع المباشر" : "Live Meeting"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isAr ? "ابدأ اجتماع فيديو مباشر داخل Safety Board مع كاميرا ومايك ودردشة ومشاركة شاشة." : "Start a live video meeting inside Safety Board with camera, microphone, chat and screen sharing."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "بدء اجتماع جديد" : "Start a new meeting"}</CardTitle>
          <CardDescription>{isAr ? "سيتم إنشاء غرفة آمنة برمز عشوائي وتسجيلها في سجل النظام." : "A random room will be created and recorded in the system log."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={isAr ? "عنوان الاجتماع" : "Meeting title"} />
          <Button className="w-full sm:w-auto" onClick={startMeeting} disabled={loading || !title.trim()}>
            <Radio className="me-2 h-4 w-4" />
            {loading ? (isAr ? "جاري البدء..." : "Starting...") : (isAr ? "ابدأ البث المباشر" : "Start Live Meeting")}
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        {isAr ? "ملاحظة: المتصفح سيطلب إذن الكاميرا والميكروفون عند دخول الغرفة. لا يتم تشغيل كاميرا أو مايك أي مستخدم دون موافقته." : "Note: the browser requests camera and microphone permission when entering the room. No participant camera or microphone is activated without consent."}
      </div>
    </div>
  );
}

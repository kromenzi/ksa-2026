import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Language = "ar" | "en";
type StatusPayload = {
  report: { refNo: string; title: string; status: string; date: string; category?: string; severity?: string; immediateLifeThreat?: boolean; createdAt?: string; updatedAt?: string };
  messages: Array<{ id: string; senderType: "reporter" | "hse"; message: string; createdAt: string }>;
};

export default function PublicSafetyReportStatusPage() {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";
  const [refNo, setRefNo] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [data, setData] = useState<StatusPayload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/safety-reporting-public?action=status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refNo: refNo.trim(), trackingCode: trackingCode.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to load report");
      setData(payload);
    } catch (err: any) {
      setData(null);
      setError(isAr ? "تعذر العثور على البلاغ. تحقق من الرقم المرجعي ورمز المتابعة." : (err?.message || "Unable to find the report."));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/safety-reporting-public?action=message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refNo: refNo.trim(), trackingCode: trackingCode.trim(), message: message.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to send message");
      setMessage("");
      await load();
    } catch (err: any) {
      setError(err?.message || (isAr ? "تعذر إرسال الرسالة." : "Unable to send the message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-5 sm:py-10 dark:bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-emerald-600" /><div><h1 className="font-bold">{isAr ? "متابعة بلاغ السلامة" : "Track Safety Report"}</h1><p className="text-xs text-muted-foreground">{isAr ? "استخدم رقم البلاغ ورمز المتابعة السري" : "Use the report reference and private tracking code"}</p></div></div>
          <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>{isAr ? "English" : "العربية"}</Button>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>{isAr ? "رقم البلاغ" : "Report reference"}</Label><Input value={refNo} onChange={e => setRefNo(e.target.value.toUpperCase())} placeholder="SR-2026-000001" autoComplete="off" /></div>
            <div className="space-y-2"><Label>{isAr ? "رمز المتابعة السري" : "Private tracking code"}</Label><Input value={trackingCode} onChange={e => setTrackingCode(e.target.value.toUpperCase())} type="password" autoComplete="off" /></div>
            <Button className="gap-2 sm:col-span-2" onClick={load} disabled={loading || !refNo.trim() || !trackingCode.trim()}><Search className="h-4 w-4" />{loading ? (isAr ? "جارٍ التحقق..." : "Checking...") : (isAr ? "عرض حالة البلاغ" : "View report status")}</Button>
          </CardContent>
        </Card>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}

        {data && (
          <>
            <Card>
              <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-2"><span>{data.report.refNo}</span><Badge variant="outline">{data.report.status}</Badge></CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">{isAr ? "العنوان:" : "Title:"}</span> <strong>{data.report.title}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? "التاريخ:" : "Date:"}</span> <strong>{data.report.date}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? "التصنيف:" : "Category:"}</span> <strong>{data.report.category || "—"}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? "الخطورة:" : "Severity:"}</span> <strong>{data.report.severity || "—"}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />{isAr ? "التواصل مع فريق HSE" : "Communication with HSE"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {data.messages.length === 0 ? <p className="text-sm text-muted-foreground">{isAr ? "لا توجد رسائل حتى الآن." : "No messages yet."}</p> : (
                  <div className="space-y-2">
                    {data.messages.map(item => (
                      <div key={item.id} className={`max-w-[88%] rounded-xl border p-3 text-sm ${item.senderType === "hse" ? "bg-blue-50 dark:bg-blue-950/20" : "ms-auto bg-emerald-50 dark:bg-emerald-950/20"}`}>
                        <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{item.senderType === "hse" ? "HSE" : (isAr ? "المبلّغ" : "Reporter")}</p>
                        <p className="whitespace-pre-wrap">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2"><Label>{isAr ? "إضافة معلومات أو رسالة" : "Add information or a message"}</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={4000} /><Button onClick={sendMessage} disabled={sending || !message.trim()}>{sending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Send message")}</Button></div>
              </CardContent>
            </Card>
          </>
        )}

        <Link href="/report"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{isAr ? "العودة إلى نموذج البلاغ" : "Back to reporting form"}</Button></Link>
      </div>
    </div>
  );
}

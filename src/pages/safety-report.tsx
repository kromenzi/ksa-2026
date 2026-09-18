import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, ExternalLink, LockKeyhole, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HseImagePicker } from "@/components/hse-image-picker";
import type { HseStoredImage } from "@/lib/hse-image-storage";

type Language = "ar" | "en";
type IdentityMode = "anonymous" | "confidential" | "identified";
type Channel = {
  channel: "WEB" | "EMAIL" | "WHATSAPP" | "INTERNAL";
  isEnabled: boolean;
  publicLabelAr?: string | null;
  publicLabelEn?: string | null;
  destination?: string | null;
};

const categories = [
  ["unsafe_condition", "حالة غير آمنة", "Unsafe Condition"],
  ["unsafe_act", "تصرف غير آمن", "Unsafe Act"],
  ["near_miss", "شبه حادث", "Near Miss"],
  ["hazard", "خطر عام", "Hazard"],
  ["electrical", "خطر كهربائي", "Electrical Hazard"],
  ["fire", "حريق / حماية من الحريق", "Fire / Fire Protection"],
  ["environment", "ملاحظة بيئية", "Environmental Concern"],
  ["contractor", "سلامة المقاولين", "Contractor Safety"],
  ["equipment", "سلامة المعدات", "Equipment Safety"],
  ["work_at_height", "العمل على الارتفاعات", "Work at Height"],
  ["confined_space", "دخول الأماكن المحصورة", "Confined Space Entry"],
  ["other", "أخرى", "Other"],
] as const;

const privacyOptions: Array<{ value: IdentityMode; ar: string; en: string; arText: string; enText: string }> = [
  { value: "anonymous", ar: "مجهول", en: "Anonymous", arText: "لا نطلب اسمك أو بريدك أو رقم جوالك.", enText: "No name, email, or phone number is requested." },
  { value: "confidential", ar: "سري", en: "Confidential", arText: "بيانات التواصل تُشفّر وتظهر فقط للمخولين عند الحاجة.", enText: "Contact details are encrypted and can only be revealed by authorized staff when needed." },
  { value: "identified", ar: "معلوم الهوية", en: "Identified", arText: "يتم حفظ بياناتك مشفّرة مع البلاغ.", enText: "Your identity is stored encrypted with the report." },
];

export default function PublicSafetyReportPage() {
  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";
  const [channels, setChannels] = useState<Channel[]>([]);
  const [identityMode, setIdentityMode] = useState<IdentityMode>("anonymous");
  const [category, setCategory] = useState("unsafe_condition");
  const [severity, setSeverity] = useState("Medium");
  const [immediateLifeThreat, setImmediateLifeThreat] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [reporter, setReporter] = useState({ name: "", email: "", phone: "", employeeId: "" });
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ refNo: string; trackingCode: string } | null>(null);

  useEffect(() => {
    fetch("/api/safety-reporting-public?action=channels", { cache: "no-store" })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error("Unable to load reporting channels")))
      .then(payload => setChannels(Array.isArray(payload?.channels) ? payload.channels : []))
      .catch(() => setChannels([]));
  }, []);

  const alternateChannels = useMemo(
    () => channels.filter(item => item.isEnabled && ["EMAIL", "WHATSAPP"].includes(item.channel) && item.destination),
    [channels],
  );

  const channelHref = (item: Channel) => {
    const destination = String(item.destination || "").trim();
    if (item.channel === "EMAIL") return destination.startsWith("mailto:") ? destination : `mailto:${destination}`;
    if (item.channel === "WHATSAPP") {
      if (/^https?:\/\//i.test(destination)) return destination;
      return `https://wa.me/${destination.replace(/\D/g, "")}`;
    }
    return destination;
  };

  const uploadPhotos = async (): Promise<HseStoredImage[]> => {
    const uploaded: HseStoredImage[] = [];
    for (const file of photos) {
      const signResponse = await fetch("/api/safety-reporting-public?action=upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          website,
        }),
      });
      const signPayload = await signResponse.json().catch(() => ({}));
      if (!signResponse.ok) throw new Error(signPayload?.error || (isAr ? "تعذر تجهيز رفع الصورة." : "Unable to prepare image upload."));

      const path = String(signPayload?.path || "");
      const signedUrl = String(signPayload?.signedUrl || "");
      if (!path || !signedUrl) throw new Error(isAr ? "لم يتم إنشاء رابط رفع صالح." : "A valid upload URL was not created.");

      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", file);
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadBody,
      });
      if (!uploadResponse.ok) {
        const message = await uploadResponse.text().catch(() => "");
        throw new Error(message || (isAr ? `تعذر رفع الصورة ${file.name}.` : `Unable to upload ${file.name}.`));
      }

      uploaded.push({
        path,
        name: file.name,
        mimeType: file.type || "image/jpeg",
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    return uploaded;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (description.trim().length < 10) {
      setError(isAr ? "اكتب وصفًا واضحًا للبلاغ (10 أحرف على الأقل)." : "Enter a clear report description (at least 10 characters).");
      return;
    }
    setSaving(true);
    try {
      const attachments = photos.length ? await uploadPhotos() : [];
      const response = await fetch("/api/safety-reporting-public?action=intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityMode,
          category,
          severity,
          immediateLifeThreat,
          title,
          location,
          department,
          description,
          attachments,
          reporter: identityMode === "anonymous" ? {} : reporter,
          website,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to submit report");
      setResult({ refNo: payload.refNo, trackingCode: payload.trackingCode });
      setPhotos([]);
    } catch (err: any) {
      setError(err?.message || (isAr ? "تعذر إرسال البلاغ." : "Unable to submit the report."));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-xl">
          <Card className="border-emerald-200 shadow-xl">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-600" />
                <h1 className="text-2xl font-bold">{isAr ? "تم استلام البلاغ" : "Report received"}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isAr ? "احتفظ بالرقم المرجعي ورمز المتابعة. رمز المتابعة لا يمكن استرجاعه لاحقًا." : "Keep the reference and tracking code. The tracking code cannot be recovered later."}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">{isAr ? "رقم البلاغ" : "Report reference"}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{result.refNo}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
                  <p className="text-xs text-muted-foreground">{isAr ? "رمز المتابعة السري" : "Private tracking code"}</p>
                  <p className="mt-1 break-all font-mono text-xl font-bold tracking-wider">{result.trackingCode}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/report/status" className="flex-1"><Button className="w-full">{isAr ? "متابعة البلاغ" : "Track report"}</Button></Link>
                <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setDescription(""); setTitle(""); setPhotos([]); }}>
                  {isAr ? "إرسال بلاغ آخر" : "Submit another report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5 sm:py-8 dark:bg-slate-950" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/utec-logo.svg" alt="UTEC" className="h-11 w-16 object-contain" />
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{isAr ? "بوابة بلاغات السلامة" : "Safety Reporting Portal"}</h1>
              <p className="text-xs text-muted-foreground">{isAr ? "الإبلاغ الآمن عن المخاطر وشبه الحوادث وملاحظات HSE" : "Secure reporting for hazards, near misses, and HSE concerns"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>{isAr ? "English" : "العربية"}</Button>
        </div>

        <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
          <CardContent className="flex gap-3 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p>{isAr ? "يمكنك تقديم البلاغ مجهولًا تمامًا أو اختيار وضع سري. بيانات المبلّغ السرية تُشفّر ولا تظهر في سجل البلاغات." : "You can report anonymously or choose confidential reporting. Confidential reporter details are encrypted and are not shown in the report register."}</p>
          </CardContent>
        </Card>

        {immediateLifeThreat && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
            <CardContent className="flex gap-3 p-4 text-sm font-medium text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{isAr ? "يوجد خطر فوري: أبلغ مسؤول الموقع/الطوارئ فورًا ولا تعتمد على هذا النموذج وحده." : "Immediate danger: notify site supervision/emergency response immediately; do not rely on this form alone."}</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? "1. مستوى الخصوصية" : "1. Privacy level"}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {privacyOptions.map(option => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setIdentityMode(option.value)}
                  className={`rounded-xl border p-4 text-start transition ${identityMode === option.value ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20" : "hover:bg-muted/40"}`}
                >
                  <div className="mb-2 flex items-center gap-2 font-bold"><LockKeyhole className="h-4 w-4" />{isAr ? option.ar : option.en}</div>
                  <p className="text-xs text-muted-foreground">{isAr ? option.arText : option.enText}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? "2. تفاصيل البلاغ" : "2. Report details"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isAr ? "نوع البلاغ" : "Report category"}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(item => <SelectItem key={item[0]} value={item[0]}>{isAr ? item[1] : item[2]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "مستوى الخطورة المبدئي" : "Initial severity"}</Label>
                  <Select value={severity} onValueChange={setSeverity} disabled={immediateLifeThreat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">{isAr ? "منخفض" : "Low"}</SelectItem>
                      <SelectItem value="Medium">{isAr ? "متوسط" : "Medium"}</SelectItem>
                      <SelectItem value="High">{isAr ? "عالٍ" : "High"}</SelectItem>
                      <SelectItem value="Critical">{isAr ? "حرج" : "Critical"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "عنوان مختصر (اختياري)" : "Short title (optional)"}</Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={180} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "الموقع" : "Location"}</Label><Input value={location} onChange={e => setLocation(e.target.value)} maxLength={300} placeholder={isAr ? "مثال: مصنع MV/LV - منطقة الاختبار" : "e.g. MV/LV Factory - Testing Area"} /></div>
                <div className="space-y-2"><Label>{isAr ? "القسم (اختياري)" : "Department (optional)"}</Label><Input value={department} onChange={e => setDepartment(e.target.value)} maxLength={200} /></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "وصف الحالة أو الخطر" : "Describe the concern or hazard"}</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} maxLength={6000} required /></div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <HseImagePicker
                  files={photos}
                  onChange={setPhotos}
                  isAr={isAr}
                  disabled={saving}
                  label={isAr ? "صور البلاغ (اختياري)" : "Report photos (optional)"}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {isAr ? "يمكن اختيار الصور من الجوال أو التقاط صورة حسب خيارات جهازك. الصور تُحفظ بشكل خاص ولا تظهر للعامة." : "Choose photos from your phone or camera depending on your device. Photos are stored privately and are not public."}
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 p-4">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={immediateLifeThreat} onChange={e => { setImmediateLifeThreat(e.target.checked); if (e.target.checked) setSeverity("Critical"); }} />
                <span><strong>{isAr ? "هل يوجد خطر فوري على الحياة أو احتمال حادث جسيم؟" : "Is there an immediate threat to life or a major-incident potential?"}</strong><span className="mt-1 block text-xs text-muted-foreground">{isAr ? "سيتم تصنيف البلاغ كحالة حرجة للمراجعة الفورية." : "The report will be classified as critical for immediate review."}</span></span>
              </label>
            </CardContent>
          </Card>

          {identityMode !== "anonymous" && (
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "3. بيانات المبلّغ المشفّرة" : "3. Encrypted reporter details"}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {identityMode === "identified" && <div className="space-y-2"><Label>{isAr ? "الاسم" : "Name"}</Label><Input value={reporter.name} onChange={e => setReporter({ ...reporter, name: e.target.value })} maxLength={160} required /></div>}
                <div className="space-y-2"><Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={reporter.email} onChange={e => setReporter({ ...reporter, email: e.target.value })} maxLength={254} /></div>
                <div className="space-y-2"><Label>{isAr ? "رقم الجوال" : "Phone"}</Label><Input value={reporter.phone} onChange={e => setReporter({ ...reporter, phone: e.target.value })} maxLength={60} /></div>
                {identityMode === "identified" && <div className="space-y-2"><Label>{isAr ? "الرقم الوظيفي (اختياري)" : "Employee ID (optional)"}</Label><Input value={reporter.employeeId} onChange={e => setReporter({ ...reporter, employeeId: e.target.value })} maxLength={100} /></div>}
                <p className="sm:col-span-2 text-xs text-muted-foreground">{isAr ? "في الوضع السري يلزم بريد أو جوال واحد على الأقل للمتابعة. لا تطلب البوابة رقم الهوية الوطنية." : "Confidential mode requires at least one contact method. The portal does not request a national identity number."}</p>
              </CardContent>
            </Card>
          )}

          <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
          <Button type="submit" disabled={saving} className="h-12 w-full text-base">{saving ? (isAr ? "جارٍ إرسال البلاغ..." : "Submitting...") : (isAr ? "إرسال البلاغ بأمان" : "Submit report securely")}</Button>
        </form>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">{isAr ? "طرق إبلاغ أخرى" : "Other reporting channels"}</p><p className="text-xs text-muted-foreground">{isAr ? "البريد وWhatsApp ليسا مجهولين بالكامل لأن مزود الخدمة يرى عنوان/رقم المرسل." : "Email and WhatsApp are not fully anonymous because the provider can identify the sender address/number."}</p></div>
              <Link href="/report/status"><Button variant="outline" size="sm">{isAr ? "متابعة بلاغ" : "Track report"}</Button></Link>
            </div>
            {alternateChannels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {alternateChannels.map(item => (
                  <a key={item.channel} href={channelHref(item)} target={item.channel === "WHATSAPP" ? "_blank" : undefined} rel="noreferrer">
                    <Button type="button" variant="outline" className="gap-2">
                      {item.channel === "EMAIL" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      {isAr ? item.publicLabelAr : item.publicLabelEn}<ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">{isAr ? "الرابط الآمن هو قناة الإبلاغ العامة المتاحة حاليًا." : "The secure web link is the currently enabled public reporting channel."}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

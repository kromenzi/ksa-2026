import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, ArrowRight, Calendar, CheckCircle2, MapPin, Printer, ShieldAlert, User } from "lucide-react";

const labels = {
  severity: { ar: { low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" }, en: { low: "Low", medium: "Medium", high: "High", critical: "Critical" } },
  status: { ar: { draft: "مسودة", submitted: "مُرسل", assigned: "مُعيّن", in_progress: "قيد التنفيذ", closed: "مغلق" }, en: { draft: "Draft", submitted: "Submitted", assigned: "Assigned", in_progress: "In Progress", closed: "Closed" } },
} as const;

export default function NCRPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { ncrs, settings } = useData();
  const isAr = settings.language === "ar";
  const { data: linkedNcr, isLoading } = useQuery<any>({
    queryKey: ["/api/public-ncr", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await fetch(`/api/ncr/${encodeURIComponent(id || "")}?public=1`, { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Unable to load NCR preview");
      return response.json();
    },
    retry: false,
  });
  const ncr = linkedNcr || ncrs.find((item) => item.id === id);
  const Arrow = isAr ? ArrowRight : ArrowLeft;
  const text = (ar: string, en: string) => isAr ? ar : en;

  if (isLoading && !ncr) return <div className="ncr-public-page grid min-h-screen place-items-center text-sm text-muted-foreground" dir={isAr ? "rtl" : "ltr"}>{text("جاري تحميل المعاينة...", "Loading preview...")}</div>;
  if (!ncr) return <div className="ncr-public-page grid min-h-screen place-items-center gap-4 p-8 text-center" dir={isAr ? "rtl" : "ltr"}><AlertTriangle className="h-10 w-10 text-destructive" /><h1 className="text-2xl font-bold">{text("تقرير NCR غير موجود", "NCR not found")}</h1><Link href="/"><Button variant="outline" className="gap-2"><Arrow className="h-4 w-4" />{text("العودة للرئيسية", "Back to Home")}</Button></Link></div>;

  const severity = ncr.severity || "medium";
  const status = ncr.status || "submitted";
  const images = [ncr.image1, ncr.image2, ncr.image3, ncr.image4].filter(Boolean);
  const sections = [
    [text("الوصف", "Description"), ncr.description],
    [text("الإجراء الفوري", "Immediate Action"), ncr.immediateAction],
    [text("السبب الجذري", "Root Cause"), ncr.rootCause],
    [text("الإجراء التصحيحي", "Corrective Action"), ncr.correctiveAction],
    [text("ملاحظات التحقق", "Verification Notes"), ncr.verificationNotes],
  ].filter((item) => item[1]);
  const publicUrl = `${window.location.origin}/ncr/${ncr.id}`;

  return <div className="ncr-public-page min-h-screen bg-slate-100 px-3 py-5 text-slate-900 sm:px-6 sm:py-8" dir={isAr ? "rtl" : "ltr"}>
    <header className="ncr-preview-actions mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3"><Link href="/"><Button variant="outline" className="gap-2 rounded-xl bg-white"><Arrow className="h-4 w-4" />{text("الرئيسية", "Home")}</Button></Link><Button onClick={() => window.print()} className="gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"><Printer className="h-4 w-4" />{text("طباعة", "Print")}</Button></header>
    <main className="ncr-print-sheet mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="ncr-print-header bg-gradient-to-r from-slate-900 via-slate-800 to-amber-700 px-5 py-5 text-white sm:px-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">{text("منصة إدارة السلامة الصناعية", "Industrial Safety Management Platform")}</p><h1 className="mt-2 text-xl font-black sm:text-2xl">{text("تقرير عدم المطابقة", "Non-Conformance Report")}</h1><p className="mt-1 font-mono text-sm text-slate-200">{ncr.refNo}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><Badge className="border border-white/20 bg-white/15 text-white">{labels.severity[isAr ? "ar" : "en"][severity as keyof typeof labels.severity.ar] || severity}</Badge><Badge className="border border-emerald-200/30 bg-emerald-400/15 text-emerald-100">{labels.status[isAr ? "ar" : "en"][status as keyof typeof labels.status.ar] || status}</Badge></div></div>
      </div>
      <div className="ncr-meta-grid grid grid-cols-2 gap-2 border-b border-slate-200 p-4 sm:grid-cols-4 sm:p-5">
        {[[Calendar, text("التاريخ", "Date"), ncr.date], [MapPin, text("الموقع", "Location"), ncr.location], [ShieldAlert, text("القسم", "Department"), ncr.department], [User, text("المسؤول", "Responsible"), ncr.responsiblePersonId]].map(([Icon, label, value]: any) => <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5" key={label as string}><Icon className="mb-1.5 h-3.5 w-3.5 text-slate-500" /><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="truncate text-xs font-bold text-slate-800">{value || "—"}</p></div>)}
      </div>
      <div className="ncr-print-content space-y-3 p-4 sm:p-6">
        <div className="ncr-description rounded-lg border border-amber-200 bg-amber-50/60 p-3"><h2 className="mb-1 text-xs font-extrabold text-amber-900">{text("الوصف الرئيسي", "Main Description")}</h2><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{ncr.description || "—"}</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{sections.slice(1, 5).map(([label, value]) => <section className="ncr-section rounded-lg border border-slate-200 p-3" key={label as string}><h2 className="mb-1 text-xs font-extrabold text-slate-800">{label}</h2><p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{value as string}</p></section>)}</div>
        {images.length > 0 && <section className="ncr-images"><h2 className="mb-2 text-xs font-extrabold text-slate-800">{text("الصور المرفقة", "Evidence Images")}</h2><div className="grid grid-cols-4 gap-2">{images.map((image, index) => <img key={`${image}-${index}`} src={image!} alt={`${text("صورة", "Image")} ${index + 1}`} className="h-20 w-full rounded-md border border-slate-200 object-cover" />)}</div></section>}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-[10px] text-slate-500 sm:px-6"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{text("معاينة موثقة من UTEC Safety Board", "Verified UTEC Safety Board preview")}</span><span className="max-w-[45%] truncate font-mono">{publicUrl}</span></footer>
    </main>
  </div>;
}

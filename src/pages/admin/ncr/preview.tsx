import { Link, useParams } from "wouter";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, ArrowRight, Calendar, CheckCircle2, MapPin, Printer, ShieldAlert, User } from "lucide-react";

const severityLabel = (value: string, isAr: boolean) => (isAr
  ? ({ low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" } as Record<string, string>)[value] || value
  : ({ low: "Low", medium: "Medium", high: "High", critical: "Critical" } as Record<string, string>)[value] || value);

const statusLabel = (value: string, isAr: boolean) => (isAr
  ? ({ draft: "مسودة", submitted: "مُرسل", assigned: "مُعيّن", in_progress: "قيد التنفيذ", closed: "مغلق" } as Record<string, string>)[value] || value
  : ({ draft: "Draft", submitted: "Submitted", assigned: "Assigned", in_progress: "In Progress", closed: "Closed" } as Record<string, string>)[value] || value);

export default function NCRPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { ncrs, settings } = useData();
  const isAr = settings.language === "ar";
  const ncr = ncrs.find((item) => item.id === id);
  const Arrow = isAr ? ArrowRight : ArrowLeft;

  if (!ncr) {
    return <div className="min-h-screen grid place-items-center gap-4 p-8 text-center" dir={isAr ? "rtl" : "ltr"}><AlertTriangle className="h-10 w-10 text-destructive" /><h1 className="text-2xl font-bold">{isAr ? "تقرير NCR غير موجود" : "NCR not found"}</h1><Link href="/admin/ncr"><Button variant="outline" className="gap-2"><Arrow className="h-4 w-4" />{isAr ? "العودة إلى NCR" : "Back to NCR"}</Button></Link></div>;
  }

  const print = () => window.print();
  const severityClass = ncr.severity === "critical" ? "bg-red-500/10 text-red-700 border-red-500/30" : ncr.severity === "high" ? "bg-orange-500/10 text-orange-700 border-orange-500/30" : "bg-amber-500/10 text-amber-700 border-amber-500/30";
  const statusClass = ncr.status === "closed" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-blue-500/10 text-blue-700 border-blue-500/30";
  const images = [ncr.image1, ncr.image2, ncr.image3, ncr.image4].filter(Boolean);

  return <div className="min-h-screen bg-muted/30 py-6 sm:py-10" dir={isAr ? "rtl" : "ltr"}>
    <header className="mx-auto mb-5 flex max-w-4xl items-center justify-between gap-3 px-4 print:hidden">
      <Link href="/admin/ncr"><Button variant="outline" className="gap-2 rounded-xl"><Arrow className="h-4 w-4" />{isAr ? "قائمة NCR" : "NCR list"}</Button></Link>
      <Button onClick={print} className="gap-2 rounded-xl"><Printer className="h-4 w-4" />{isAr ? "طباعة المعاينة" : "Print preview"}</Button>
    </header>
    <main className="mx-auto max-w-4xl px-4">
      <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold opacity-80">{isAr ? "تقرير عدم المطابقة" : "Non-Conformance Report"}</p><h1 className="mt-2 text-2xl font-black tracking-tight">{ncr.refNo}</h1></div><div className="flex flex-wrap gap-2"><Badge className={`${severityClass} border`}>{severityLabel(ncr.severity, isAr)}</Badge><Badge className={`${statusClass} border`}>{statusLabel(ncr.status, isAr)}</Badge></div></div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b p-5 sm:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-3"><Calendar className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-[11px] text-muted-foreground">{isAr ? "التاريخ" : "Date"}</p><p className="text-sm font-semibold">{ncr.date || "—"}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><MapPin className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-[11px] text-muted-foreground">{isAr ? "الموقع" : "Location"}</p><p className="truncate text-sm font-semibold">{ncr.location || "—"}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><ShieldAlert className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-[11px] text-muted-foreground">{isAr ? "القسم" : "Department"}</p><p className="truncate text-sm font-semibold">{ncr.department || "—"}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><User className="mb-2 h-4 w-4 text-muted-foreground" /><p className="text-[11px] text-muted-foreground">{isAr ? "المسؤول" : "Responsible"}</p><p className="truncate text-sm font-semibold">{ncr.responsiblePersonId || "—"}</p></div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          {[{ label: isAr ? "الوصف" : "Description", value: ncr.description }, { label: isAr ? "الإجراء الفوري" : "Immediate Action", value: ncr.immediateAction }, { label: isAr ? "السبب الجذري" : "Root Cause", value: ncr.rootCause }, { label: isAr ? "الإجراء التصحيحي" : "Corrective Action", value: ncr.correctiveAction }, { label: isAr ? "ملاحظات التحقق" : "Verification Notes", value: ncr.verificationNotes }].filter((item) => item.value).map((item) => <section key={item.label} className="rounded-xl border p-4"><h2 className="mb-2 text-sm font-bold">{item.label}</h2><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.value}</p></section>)}
          {images.length > 0 && <section><h2 className="mb-3 text-sm font-bold">{isAr ? "الصور والمرفقات" : "Evidence images"}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((image, index) => <img key={`${image}-${index}`} src={image!} alt={`${isAr ? "صورة" : "Image"} ${index + 1}`} className="aspect-square w-full rounded-xl border object-cover" />)}</div></section>}
        </div>
        <footer className="flex items-center gap-2 border-t bg-muted/30 px-5 py-4 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" />{isAr ? "معاينة داخلية موثقة من نظام UTEC Safety Board" : "Verified internal preview from UTEC Safety Board"}</footer>
      </article>
    </main>
  </div>;
}

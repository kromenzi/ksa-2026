import { useParams, Link } from "wouter";
import { GlobalPrintTemplate, GlobalPrintFooter } from "@/components/global-print-template";
import { useData } from "@/lib/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, User, AlertTriangle, CheckCircle2, Printer, ArrowLeft, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function PublicReport() {
  const { id } = useParams<{ id: string }>();
  const { safetyReports, reportSettingsData, settings } = useData();

  const report = safetyReports.find((r) => r.id === id);
  const isAr = settings.language === "ar";
  const Arrow = isAr ? ArrowRight : ArrowLeft;

  const riskColors: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
    critical: "bg-red-500/10 text-red-700 border-red-500/30",
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    closed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  };

  const getRiskLabel = (level: string) => {
    const ar: Record<string, string> = { low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" };
    const en: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
    return isAr ? (ar[level] ?? level) : (en[level] ?? level);
  };

  const getStatusLabel = (status: string) => {
    const ar: Record<string, string> = { open: "مفتوح", in_progress: "قيد التنفيذ", closed: "مغلق" };
    const en: Record<string, string> = { open: "Open", in_progress: "In Progress", closed: "Closed" };
    return isAr ? (ar[status] ?? status) : (en[status] ?? status);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8" dir={isAr ? "rtl" : "ltr"}>
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isAr ? "التقرير غير موجود" : "Report Not Found"}</h1>
          <p className="text-muted-foreground mt-2">
            {isAr ? "لم يتم العثور على التقرير المطلوب." : "The requested report could not be found."}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Arrow className="h-4 w-4" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Button>
        </Link>
      </div>
    );
  }

  const companyName = reportSettingsData.companyName || "Safety Department";
  const companyLogo = reportSettingsData.companyLogo;
  const publicReportUrl = `${window.location.origin}/report/${report.id}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background" dir={isAr ? "rtl" : "ltr"}>
      <GlobalPrintTemplate />
      <GlobalPrintFooter />
      {/* Header */}
      <header className="bg-white dark:bg-card border-b print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={companyLogo || "/logo.png"} 
              alt={companyName} 
              className="h-10 w-[60px] brand-logo-full" 
              onError={(e) => {
                if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                  e.currentTarget.src = '/logo.png';
                }
              }}
            />
            <span className="font-bold text-sm">{companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              {isAr ? "طباعة" : "Print"}
            </Button>
            <Link href="/">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <Arrow className="h-3.5 w-3.5" />
                {isAr ? "الرئيسية" : "Home"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Report */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white dark:bg-card rounded-xl border shadow-sm overflow-hidden">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white print:bg-teal-700">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 opacity-80" />
                  <span className="text-sm font-medium opacity-80">
                    {isAr ? "تقرير ملاحظة السلامة" : "Safety Observation Report"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold">{report.reportNo}</h1>
                {report.observationId && (
                  <p className="text-sm opacity-70 mt-1">ID: {report.observationId}</p>
                )}
              </div>
              <div className="text-end rtl:text-start">
                <Badge className={`${riskColors[report.riskLevel] ?? ""} border text-sm font-semibold mb-2`}>
                  {getRiskLabel(report.riskLevel)}
                </Badge>
                <p className="text-sm opacity-80">{report.date}</p>
                {report.time && <p className="text-sm opacity-70">{report.time}</p>}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b bg-muted/20">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "الموقع" : "Location"}</p>
                <p className="text-sm font-medium">{report.location || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "القسم" : "Department"}</p>
                <p className="text-sm font-medium">{report.department || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "المراقب" : "Observer"}</p>
                <p className="text-sm font-medium">{report.observerName || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "الحالة" : "Status"}</p>
                <Badge variant="outline" className={`text-xs mt-0.5 ${statusColors[report.status] ?? ""}`}>
                  {getStatusLabel(report.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {report.category && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {isAr ? "الفئة" : "Category"}
                </h3>
                <p className="text-sm">{report.category}</p>
              </div>
            )}

            {report.observationDescription && (
              <div className={`border-${isAr ? "r" : "l"}-4 border-teal-500 p-${isAr ? "r" : "l"}-4 ps-4 border-s-4`}>
                <h3 className="text-sm font-semibold mb-2 text-teal-700 dark:text-teal-400">
                  {isAr ? "وصف الملاحظة" : "Observation Description"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {report.observationDescription}
                </p>
              </div>
            )}

            {report.correctiveAction && (
              <div className="border-s-4 border-emerald-500 ps-4">
                <h3 className="text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">
                  {isAr ? "الإجراء التصحيحي" : "Corrective Action"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {report.correctiveAction}
                </p>
              </div>
            )}

            {/* Images */}
            {[report.image1, report.image2, report.image3, report.image4].some(Boolean) && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  {isAr ? "الصور" : "Images"}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[report.image1, report.image2, report.image3, report.image4]
                    .filter(Boolean)
                    .map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={img!}
                          alt={`${isAr ? "صورة" : "Image"} ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-white p-1.5">
                <QRCodeSVG value={publicReportUrl} size={56} level="M" includeMargin />
              </div>
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{isAr ? "QR للتقرير" : "Report QR"}</p>
                <p className="truncate max-w-[220px] sm:max-w-[320px]">{publicReportUrl}</p>
              </div>
            </div>
            <span>
              {isAr ? "تم الإنشاء" : "Created"}:{" "}
              {new Date(report.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
            </span>
            <span>{companyName} — {isAr ? "وثيقة رسمية" : "Official Document"}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/data-context";
import { Shield, FileText, ClipboardList, LayoutDashboard, Mail, Phone, Clock, ArrowRight, ArrowLeft, HardHat, AlertTriangle, BarChart3, Zap, TrendingUp, CheckCircle2, Activity, FileCheck, Users } from "lucide-react";

interface ReportSettingsData {
  companyName: string;
  companyLogo: string | null;
}

interface SiteSettingsData {
  language: string;
}

export default function Home() {
  const { settings } = useData();
  const { data: reportSettings } = useQuery<ReportSettingsData>({
    queryKey: ["/api/report-settings"],
  });

  const { data: siteSettings } = useQuery<SiteSettingsData>({
    queryKey: ["/api/settings"],
  });

  const isAr = (settings?.language || siteSettings?.language) === "ar";
  const branding = settings?.branding;
  const logo = branding?.companyLogo || reportSettings?.companyLogo || "/logo.png";
  const companyName = branding?.companyName || "ABDULKAREM SAFETY BOARD";
  const heroTitleEn = branding?.heroTitleEn || "ABDULKAREM SAFETY BOARD";
  const heroTitleAr = branding?.heroTitleAr || "ABDULKAREM SAFETY BOARD – لوحة السلامة";
  const heroSubtitleEn = branding?.heroSubtitleEn || "Industrial Safety Management System";
  const heroSubtitleAr = branding?.heroSubtitleAr || "منصة إدارة السلامة الصناعية";
  const heroDescriptionEn = branding?.heroDescriptionEn || "A centralized platform for managing safety observations, non-conformance reports, compliance tracking, and proactive safety measures across all operations.";
  const heroDescriptionAr = branding?.heroDescriptionAr || "منصة مركزية لإدارة ملاحظات السلامة وتقارير عدم المطابقة ومتابعة الامتثال وإجراءات السلامة الاستباقية عبر جميع العمليات.";
  const footerText = isAr 
    ? (branding?.systemFooterTextAr || "ABDULKAREM SAFETY BOARD – قسم السلامة والصحة والبيئة")
    : (branding?.systemFooterTextEn || "ABDULKAREM SAFETY BOARD – Health, Safety & Environment Department");

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b bg-background/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={logo} 
              alt={companyName} 
              className="h-14 w-[84px] sm:h-16 sm:w-24 brand-logo-full drop-shadow-sm shrink-0" 
              data-testid="img-company-logo"
              onError={(e) => {
                if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                  e.currentTarget.src = '/logo.png';
                }
              }}
            />
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-none text-foreground">{companyName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {isAr ? "قسم السلامة والصحة المهنية" : "Safety & EHS Department"}
              </p>
            </div>
          </div>
          <Link href="/admin">
            <Button className="rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 text-xs h-9 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5" data-testid="button-header-admin">
              <LayoutDashboard className="h-4 w-4 me-1.5" />
              {isAr ? "لوحة التحكم" : "Dashboard"}
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden hero-gradient min-h-[500px]">
        <div className="hazard-stripe absolute inset-x-0 top-0" />
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <img 
              src={logo} 
              alt={companyName} 
              className="w-[min(86vw,520px)] max-h-[340px] brand-logo-full mx-auto mb-4 drop-shadow-xl transition-all duration-300 hover:scale-105" 
              onError={(e) => {
                if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                  e.currentTarget.src = '/logo.png';
                }
              }}
            />

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest shadow-sm">
              <HardHat className="h-3.5 w-3.5" />
              {isAr ? heroSubtitleAr : heroSubtitleEn}
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                {heroTitleEn}
              </h1>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary/90" dir="rtl">
                {heroTitleAr}
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3 pt-2">
              {!isAr && (
                <p className="text-base md:text-lg text-muted-foreground/80 leading-relaxed">
                  {heroDescriptionEn}
                </p>
              )}
              {isAr && (
                <p className="text-base md:text-lg text-muted-foreground/80 leading-relaxed" dir="rtl">
                  {heroDescriptionAr}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
              <Link href="/admin/reports">
                <Button size="lg" className="text-sm px-8 w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 h-12 font-semibold transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5" data-testid="button-create-report">
                  <ClipboardList className="h-5 w-5 me-2" />
                  {isAr ? "إنشاء تقرير" : "Create Report"}
                  <Arrow className="h-4 w-4 ms-2" />
                </Button>
              </Link>
              <Link href="/admin/ncr">
                <Button size="lg" variant="outline" className="text-sm px-8 w-full sm:w-auto rounded-xl border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/60 h-12 font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5" data-testid="button-create-ncr">
                  <AlertTriangle className="h-5 w-5 me-2 text-warning" />
                  {isAr ? "إنشاء NCR" : "Create NCR"}
                  <Arrow className="h-4 w-4 ms-2" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="ghost" className="text-sm px-8 w-full sm:w-auto rounded-xl h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" data-testid="button-go-dashboard">
                  <LayoutDashboard className="h-5 w-5 me-2" />
                  {isAr ? "لوحة التحكم" : "Go to Dashboard"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 -mt-8">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">{isAr ? 'الميزات' : 'CAPABILITIES'}</p>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">{isAr ? 'أدوات إدارة السلامة الصناعية' : 'Industrial Safety Management Tools'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Shield, labelEn: "Safety Reports", labelAr: "تقارير السلامة", descEn: "Observation and incident tracking", descAr: "تتبع الملاحظات والحوادث", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
            { icon: AlertTriangle, labelEn: "NCR Management", labelAr: "إدارة عدم المطابقة", descEn: "Non-conformance lifecycle", descAr: "دورة حياة عدم المطابقة", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
            { icon: FileText, labelEn: "Documents", labelAr: "المستندات", descEn: "Contracts, permits & invoices", descAr: "العقود والتصاريح والفواتير", color: "text-sky-500", bgColor: "bg-sky-500/10", borderColor: "border-sky-500/20" },
            { icon: BarChart3, labelEn: "Analytics", labelAr: "التحليلات", descEn: "Performance insights & KPIs", descAr: "مؤشرات الأداء والرؤى", color: "text-violet-500", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
          ].map((item, i) => (
            <div key={i} className={`glass-card rounded-2xl p-6 card-lift border ${item.borderColor} hover:shadow-xl transition-all duration-300`} data-testid={`card-feature-${i}`}>
              <div className={`h-12 w-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <h3 className="font-bold text-sm mb-2 uppercase tracking-wide text-foreground">{isAr ? item.labelAr : item.labelEn}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{isAr ? item.descAr : item.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <Card className="glass-card rounded-3xl overflow-hidden shadow-2xl border-border/50" data-testid="card-safety-department">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="lg:col-span-3 p-8 md:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                  <HardHat className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{isAr ? "قسم السلامة" : "Safety Department"}</h3>
                  <p className="text-xs text-muted-foreground">{isAr ? "ABDULKAREM SAFETY BOARD – السلامة والصحة والبيئة" : "ABDULKAREM SAFETY BOARD – Health, Safety & Environment"}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground/90 leading-relaxed mb-6">
                {isAr
                  ? "مهمتنا هي ضمان بيئة عمل آمنة وصحية لجميع الموظفين والمقاولين والزوار من خلال الالتزام بأعلى معايير السلامة وتعزيز ثقافة السلامة الاستباقية في جميع عملياتنا."
                  : "Our mission is to ensure a safe and healthy work environment for all employees, contractors, and visitors by maintaining the highest safety standards and promoting a proactive safety culture across all our operations."}
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  { en: "Zero Harm Goal", ar: "هدف صفر أضرار", icon: CheckCircle2 },
                  { en: "Proactive Reporting", ar: "الإبلاغ الاستباقي", icon: TrendingUp },
                  { en: "Continuous Improvement", ar: "التحسين المستمر", icon: Zap },
                ].map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold border border-primary/20 uppercase tracking-wide hover:bg-primary/15 transition-all cursor-default">
                    <tag.icon className="h-3.5 w-3.5" />
                    {isAr ? tag.ar : tag.en}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-muted/30 to-muted/50 dark:from-white/[0.02] dark:to-white/[0.01] p-8 md:p-10 border-t lg:border-t-0 lg:border-s border-border/30">
              <h4 className="font-semibold mb-6 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                {isAr ? "معلومات الاتصال" : "Contact Information"}
              </h4>
              <div className="space-y-5">
                {[
                  { icon: Mail, titleEn: "Email", titleAr: "البريد الإلكتروني", value: "safety@abdulkaremsineor.com" },
                  { icon: Phone, titleEn: "Phone", titleAr: "الهاتف", value: "+966 XX XXX XXXX", dir: "ltr" },
                  { icon: Clock, titleEn: "Working Hours", titleAr: "ساعات العمل", value: isAr ? "الأحد – الخميس، 07:00 – 17:00" : "Sun – Thu, 07:00 – 17:00" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="h-10 w-10 rounded-xl bg-muted/60 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-all">
                      <item.icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-all" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{isAr ? item.titleAr : item.titleEn}</p>
                      <p className="text-xs text-muted-foreground/80" dir={item.dir}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">{isAr ? 'إحصائيات' : 'Quick Stats'}</p>
          <h3 className="text-lg md:text-xl font-bold">{isAr ? 'نظرة عامة على النظام' : 'System Overview'}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, labelEn: "Active Reports", labelAr: "تقارير نشطة", value: "24", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
            { icon: FileCheck, labelEn: "Closed NCRs", labelAr: "NCRs مغلقة", value: "156", color: "text-blue-500", bgColor: "bg-blue-500/10" },
            { icon: Users, labelEn: "Team Members", labelAr: "أعضاء الفريق", value: "48", color: "text-violet-500", bgColor: "bg-violet-500/10" },
            { icon: ClipboardList, labelEn: "Pending Review", labelAr: "قيد المراجعة", value: "12", color: "text-amber-500", bgColor: "bg-amber-500/10" },
          ].map((stat, i) => (
            <div key={i} className="steel-card rounded-2xl p-5 text-center card-lift">
              <div className={`h-10 w-10 rounded-xl ${stat.bgColor} flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{isAr ? stat.labelAr : stat.labelEn}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-primary/20 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} {footerText}
          </p>
          <div className="flex items-center gap-4">
            <p className="text-[11px] text-muted-foreground/70">
              {isAr ? "لوحة السلامة الإلكترونية" : "Safety Dashboard Platform"}
            </p>
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] text-success font-medium">
              {isAr ? "نشط" : "System Online"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

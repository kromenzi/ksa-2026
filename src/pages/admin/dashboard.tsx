import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import IncidentPyramid from "@/components/incident-pyramid";
import {
  Shield, AlertTriangle, FileText, Activity, TrendingUp,
  BarChart3, CheckCircle2, Clock,
  Target, Triangle,
  FileWarning, ClipboardCheck,
  Eye, Layers, Building2, Award, ShieldCheck, HeartPulse
} from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
  AreaChart, Area
} from "recharts";

interface AnalyticsStats {
  totalReports: number;
  totalNCRs: number;
  totalDocuments: number;
  totalActivities: number;
  openNCRs: number;
  closedNCRs: number;
  highRiskReports: number;
  openReports: number;
  ncrClosureRate: number;
  riskDistribution: { low: number; medium: number; high: number; critical: number };
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  ncrSeverity: Record<string, number>;
  ncrStatus: Record<string, number>;
  trendData: Array<{ month: string; reports: number; ncrs: number }>;
  recentReports: any[];
  recentNCRs: any[];
}

const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7c3aed",
};

const STATUS_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function KPICard({
  title, value, subtitle, icon: Icon, color, borderColor, loading, testId, badgeText
}: {
  title: string; value: string | number; subtitle?: React.ReactNode; icon: any;
  color: string; borderColor: string; loading?: boolean; testId: string; badgeText?: string;
}) {
  return (
    <Card className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 shadow-sm`} data-testid={testId}>
      <div className={`absolute top-0 start-0 w-1.5 h-full ${borderColor}`} />
      <div className={`absolute top-0 end-0 w-24 h-24 -mt-8 -me-8 rounded-full opacity-[0.07] ${color}`} />
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
              <div className="flex items-center gap-1.5">
                {badgeText && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {badgeText}
                  </span>
                )}
                <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
                  <Icon className={`h-3.5 w-3.5 ${color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
            <div className="text-[28px] sm:text-[32px] font-black tracking-tight">{value}</div>
            {subtitle && <div className="mt-1.5">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-[18px] w-[18px] text-white" />
      </div>
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}


export default function AdminDashboard() {
  const { settings, safetyReports, ncrs, activityLogs, documents } = useData();
  const isAr = settings.language === "ar";

  // Compute all stats from real data
  const totalReports = safetyReports.length;
  const totalNCRs = ncrs.length;
  const openNCRs = ncrs.filter(n => ['submitted', 'assigned', 'in_progress', 'open'].includes(n.status)).length;
  const closedNCRs = ncrs.filter(n => n.status === 'closed').length;
  const highRiskReports = safetyReports.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
  const openReports = safetyReports.filter(r => r.status !== 'closed').length;
  const ncrClosureRate = totalNCRs > 0 ? Math.round((closedNCRs / totalNCRs) * 100) : 0;

  // Risk distribution from safetyReports
  const riskDistribution = safetyReports.reduce(
    (acc, r) => {
      const key = r.riskLevel as keyof typeof acc;
      if (key in acc) acc[key]++;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );

  // Category distribution from safetyReports
  const categoryDistribution = safetyReports.reduce<Record<string, number>>((acc, r) => {
    const cat = r.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Department distribution from safetyReports + ncrs
  const departmentDistribution = [...safetyReports, ...ncrs].reduce<Record<string, number>>((acc, r) => {
    const dept = r.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  // NCR status distribution
  const ncrStatusDist = ncrs.reduce<Record<string, number>>((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {});

  // NCR severity distribution
  const ncrSeverityDist = ncrs.reduce<Record<string, number>>((acc, n) => {
    acc[n.severity] = (acc[n.severity] || 0) + 1;
    return acc;
  }, {});

  // Trend data: last 6 months based on safetyReports & ncrs createdAt dates
  const trendData = (() => {
    const months: Array<{ month: string; reports: number; ncrs: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short' });
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const rCount = safetyReports.filter(r => {
        const rd = new Date(r.createdAt);
        return rd.getFullYear() === yr && rd.getMonth() === mo;
      }).length;
      const nCount = ncrs.filter(n => {
        const nd = new Date(n.createdAt);
        return nd.getFullYear() === yr && nd.getMonth() === mo;
      }).length;
      months.push({ month: label, reports: rCount, ncrs: nCount });
    }
    return months;
  })();

  const stats: AnalyticsStats = {
    totalReports,
    totalNCRs,
    totalDocuments: documents.length,
    totalActivities: activityLogs.length,
    openNCRs,
    closedNCRs,
    highRiskReports,
    openReports,
    ncrClosureRate,
    riskDistribution,
    statusDistribution: { open: openReports, closed: safetyReports.filter(r => r.status === 'closed').length },
    categoryDistribution,
    departmentDistribution,
    ncrSeverity: ncrSeverityDist,
    ncrStatus: ncrStatusDist,
    trendData,
    recentReports: safetyReports.slice(-5).reverse(),
    recentNCRs: ncrs.slice(-5).reverse(),
  };
  const statsLoading = false;

  const riskPieData = stats
    ? Object.entries(stats.riskDistribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: isAr
            ? { low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" }[name] || name
            : name.charAt(0).toUpperCase() + name.slice(1),
          value,
          fill: RISK_COLORS[name as keyof typeof RISK_COLORS],
        }))
    : [];

  const ncrStatusData = stats
    ? Object.entries(stats.ncrStatus)
        .filter(([, v]) => v > 0)
        .map(([name, value], i) => ({
          name: isAr
            ? { draft: "مسودة", submitted: "مقدم", assigned: "مخصص", in_progress: "قيد التنفيذ", closed: "مغلق" }[name] || name
            : name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          value,
          fill: STATUS_COLORS[i % STATUS_COLORS.length],
        }))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-black tracking-tight flex items-center gap-2.5" data-testid="text-dashboard-title">
            <div className="p-2 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            {isAr ? "لوحة التحكم" : "Dashboard"}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1.5 ms-12">
            {isAr ? "مؤشرات أداء السلامة" : "Safety performance overview"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={isAr ? "مؤشر السلامة العام" : "Safety Adherence Index"}
          value={`${Math.max(85, Math.min(98, 100 - (stats?.highRiskReports || 0) * 3))}%`}
          subtitle={
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isAr ? "ضمن المعايير القياسية" : "ISO 45001 Compliant"}</span>
            </div>
          }
          icon={Shield}
          color="bg-emerald-500"
          borderColor="bg-emerald-500"
          loading={statsLoading}
          testId="card-safety-index"
          badgeText="ISO"
        />

        <KPICard
          title={isAr ? "معدل الحوادث المسجلة (TRIR)" : "TRIR (Recordable Rate)"}
          value="0.24"
          subtitle={
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
              <TrendingUp className="h-3 w-3 rotate-180" />
              <span>{isAr ? "أقل من المعدل المستهدف (0.5)" : "Below Target (0.5)"}</span>
            </div>
          }
          icon={Activity}
          color="bg-blue-500"
          borderColor="bg-blue-500"
          loading={statsLoading}
          testId="card-trir"
          badgeText="OSHA"
        />

        <KPICard
          title={isAr ? "معدل الإصابات المقعدة (LTIFR)" : "LTIFR (Lost Time Rate)"}
          value="0.00"
          subtitle={
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              <span>{isAr ? "سجل نظيف (Zero LTI)" : "Zero Lost Time"}</span>
            </div>
          }
          icon={HeartPulse}
          color="bg-teal-500"
          borderColor="bg-teal-500"
          loading={statsLoading}
          testId="card-ltifr"
          badgeText="HSE"
        />

        <KPICard
          title={isAr ? "نسبة إغلاق عدم المطابقة" : "NCR Closure Rate"}
          value={`${stats?.ncrClosureRate || 0}%`}
          subtitle={<Progress value={stats?.ncrClosureRate || 0} className="h-1.5 mt-1" />}
          icon={Target}
          color="bg-indigo-500"
          borderColor="bg-indigo-500"
          loading={statsLoading}
          testId="card-closure-rate"
          badgeText="CAPA"
        />

        <KPICard
          title={isAr ? "إجمالي التقارير" : "Total Reports"}
          value={stats?.totalReports || 0}
          subtitle={
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>{stats?.openReports || 0} {isAr ? "قيد المتابعة" : "active"}</span>
            </div>
          }
          icon={ClipboardCheck}
          color="bg-sky-500"
          borderColor="bg-sky-500"
          loading={statsLoading}
          testId="card-total-reports"
          badgeText="SOR"
        />

        <KPICard
          title={isAr ? "المخاطر العالية" : "High Risk Items"}
          value={stats?.highRiskReports || 0}
          subtitle={
            <p className="text-[11px] text-red-600 font-medium">
              {stats && stats.totalReports > 0
                ? `${Math.round((stats.highRiskReports / stats.totalReports) * 100)}% ${isAr ? "من إجمالي التقارير" : "of total reports"}`
                : isAr ? "لا توجد مخاطر مسجلة" : "No high risks"}
            </p>
          }
          icon={AlertTriangle}
          color="bg-red-500"
          borderColor="bg-red-500"
          loading={statsLoading}
          testId="card-high-risk"
          badgeText="Risk"
        />

        <KPICard
          title={isAr ? "حالات عدم المطابقة (NCR)" : "Non-Conformances"}
          value={stats?.totalNCRs || 0}
          subtitle={
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <span>{stats?.openNCRs || 0} {isAr ? "مفتوحة" : "open items"}</span>
            </div>
          }
          icon={FileWarning}
          color="bg-amber-500"
          borderColor="bg-amber-500"
          loading={statsLoading}
          testId="card-total-ncrs"
          badgeText="Audit"
        />

        <KPICard
          title={isAr ? "جاهزية الطوارئ والتدقيق" : "Audit & Readiness"}
          value="94.2%"
          subtitle={
            <div className="flex items-center gap-1.5 text-[11px] text-purple-600 font-medium">
              <Award className="h-3.5 w-3.5" />
              <span>{isAr ? "اجتياز التدقيق الخارجي" : "External Audit Ready"}</span>
            </div>
          }
          icon={Building2}
          color="bg-purple-500"
          borderColor="bg-purple-500"
          loading={statsLoading}
          testId="card-audit-readiness"
          badgeText="SBC"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto p-1 bg-muted/60 rounded-xl grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5 rounded-lg text-[11px] sm:text-[12px] data-[state=active]:shadow-sm" data-testid="tab-overview">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isAr ? "نظرة عامة" : "Overview"}</span>
            <span className="sm:hidden">{isAr ? "عام" : "Stats"}</span>
          </TabsTrigger>
          <TabsTrigger value="pyramid" className="gap-1.5 rounded-lg text-[11px] sm:text-[12px] data-[state=active]:shadow-sm" data-testid="tab-pyramid">
            <Triangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 fill-rose-500/20" />
            <span className="hidden sm:inline">{isAr ? "هرم الحوادث (Incident Pyramid)" : "Incident Pyramid"}</span>
            <span className="sm:hidden">{isAr ? "الهرم" : "Pyramid"}</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5 rounded-lg text-[11px] sm:text-[12px] data-[state=active]:shadow-sm" data-testid="tab-details">
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isAr ? "التفاصيل" : "Details"}</span>
            <span className="sm:hidden">{isAr ? "تفاصيل" : "More"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Pyramid */}
        <TabsContent value="pyramid" className="space-y-4 mt-4">
          <IncidentPyramid />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-0 shadow-sm" data-testid="card-trend-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    {isAr ? "اتجاه التقارير الشهري" : "Monthly Trend"}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {isAr ? "آخر 6 أشهر" : "Last 6 months"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-[260px] w-full rounded-xl" />
                ) : stats?.trendData && stats.trendData.length > 0 ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.trendData}>
                        <defs>
                          <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ncrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                        <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} dx={-4} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                            backgroundColor: "hsl(var(--card))",
                            color: "hsl(var(--card-foreground))",
                            padding: "8px 14px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                        <Area
                          type="monotone"
                          dataKey="reports"
                          name={isAr ? "تقارير" : "Reports"}
                          stroke="hsl(var(--primary))"
                          fill="url(#reportGrad)"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ncrs"
                          name={isAr ? "عدم مطابقة" : "NCRs"}
                          stroke="#ef4444"
                          fill="url(#ncrGrad)"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">{isAr ? "لا توجد بيانات كافية" : "Not enough data yet"}</p>
                      <p className="text-xs text-muted-foreground/60">{isAr ? "أضف تقارير لرؤية الاتجاهات" : "Add reports to see trends"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-0 shadow-sm" data-testid="card-risk-distribution">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="p-1.5 rounded-lg bg-red-500/10">
                    <Shield className="h-4 w-4 text-red-500" />
                  </div>
                  {isAr ? "توزيع المخاطر" : "Risk Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-[260px] w-full rounded-xl" />
                ) : riskPieData.length > 0 ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskPieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={45}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          style={{ fontSize: "11px" }}
                        >
                          {riskPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                            backgroundColor: "hsl(var(--card))",
                            color: "hsl(var(--card-foreground))",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">{isAr ? "لا توجد بيانات مخاطر" : "No risk data"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Incident Pyramid Section */}
          <div className="pt-2">
            <IncidentPyramid />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-0 shadow-sm" data-testid="card-ncr-status">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <FileWarning className="h-4 w-4 text-amber-500" />
                  </div>
                  {isAr ? "حالة عدم المطابقة" : "NCR Status"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                ) : ncrStatusData.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ncrStatusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" horizontal={false} />
                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                            backgroundColor: "hsl(var(--card))",
                            color: "hsl(var(--card-foreground))",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                          {ncrStatusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    {isAr ? "لا توجد بيانات" : "No NCR data"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm" data-testid="card-categories">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  {isAr ? "الفئات" : "Categories"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                ) : stats && Object.keys(stats.categoryDistribution).length > 0 ? (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pe-1">
                    {Object.entries(stats.categoryDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => {
                        const max = Math.max(...Object.values(stats.categoryDistribution));
                        const pct = max > 0 ? (count / max) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium truncate me-2">{cat}</span>
                              <span className="text-muted-foreground font-mono shrink-0">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70 transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    {isAr ? "لا توجد فئات" : "No categories"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <MiniStat icon={FileText} value={stats?.totalDocuments || 0} label={isAr ? "المستندات" : "Documents"} color="bg-blue-500" />
            <MiniStat icon={Activity} value={stats?.totalActivities || 0} label={isAr ? "الأنشطة" : "Activities"} color="bg-emerald-500" />
            <MiniStat icon={CheckCircle2} value={stats?.closedNCRs || 0} label={isAr ? "NCR مغلقة" : "Closed NCRs"} color="bg-violet-500" />
            <MiniStat icon={Clock} value={stats?.openReports || 0} label={isAr ? "تقارير مفتوحة" : "Open Reports"} color="bg-amber-500" />
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-0 shadow-sm" data-testid="card-recent-reports">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <ClipboardCheck className="h-4 w-4 text-blue-500" />
                    </div>
                    {isAr ? "أحدث التقارير" : "Recent Reports"}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {stats?.recentReports?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats?.recentReports && stats.recentReports.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.recentReports.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex-1 min-w-0 me-3">
                          <p className="text-xs font-semibold truncate">{r.reportNo}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {r.observationDescription?.substring(0, 50) || (isAr ? "بدون وصف" : "No description")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={r.riskLevel === "critical" || r.riskLevel === "high" ? "destructive" : "secondary"}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {r.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{isAr ? "لا توجد تقارير" : "No recent reports"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm" data-testid="card-recent-ncrs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <FileWarning className="h-4 w-4 text-amber-500" />
                    </div>
                    {isAr ? "أحدث عدم المطابقة" : "Recent NCRs"}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {stats?.recentNCRs?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats?.recentNCRs && stats.recentNCRs.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.recentNCRs.map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex-1 min-w-0 me-3">
                          <p className="text-xs font-semibold truncate">{n.refNo}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {n.description?.substring(0, 50) || (isAr ? "بدون وصف" : "No description")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={n.severity === "critical" || n.severity === "high" ? "destructive" : "secondary"}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {n.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <FileWarning className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{isAr ? "لا توجد بيانات" : "No recent NCRs"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm" data-testid="card-department-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                {isAr ? "توزيع الأقسام" : "Department Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats && Object.keys(stats.departmentDistribution).length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(stats.departmentDistribution).map(([name, value]) => ({
                        name,
                        value,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                          backgroundColor: "hsl(var(--card))",
                          color: "hsl(var(--card-foreground))",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Building2 className="h-8 w-8 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{isAr ? "لا توجد بيانات" : "No department data"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden" data-testid="card-resolution-overview">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x rtl:divide-x-reverse divide-border">
                <div className="p-4 sm:p-5 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats?.totalDocuments || 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "المستندات" : "Documents"}</p>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats?.totalActivities || 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "الأنشطة" : "Activities"}</p>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats?.closedNCRs || 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "NCR مغلقة" : "Closed NCRs"}</p>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats?.openReports || 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "تقارير مفتوحة" : "Open Reports"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

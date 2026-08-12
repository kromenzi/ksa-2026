import { useData } from "@/lib/data-context";
import { getStoredCameras, getStoredAlerts, getStoredDevices } from "@/lib/vision-store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CameraStream from "@/components/camera-stream";
import { 
  Camera, ShieldAlert, Activity, ShieldCheck,
  Flame, HardHat, AlertTriangle, Radio,
  Users, Truck, ArrowRight, Grid, MapPin
} from "lucide-react";

export default function VisionDashboard() {
  const { settings } = useData();
  const [, setLocation] = useLocation();
  const isAr = settings.language === "ar";

  const cameras = getStoredCameras();
  const alerts = getStoredAlerts();
  const devices = getStoredDevices();

  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter(c => c.status === "ONLINE").length;
  const offlineCameras = cameras.filter(c => c.status === "OFFLINE").length;
  const warningCameras = cameras.filter(c => c.status === "WARNING").length;
  const recordingCameras = cameras.filter(c => c.recordingStatus === "Recording").length;
  const activeAlertsCount = alerts.filter(a => a.status === "NEW" || a.status === "ACKNOWLEDGED").length;
  const systemHealthPct = Math.round((onlineCameras / Math.max(1, totalCameras)) * 100);

  const ppeCompliancePct = 84;
  const restrictedAreaViolations = alerts.filter(a => a.category === "Restricted Zone").length;
  const equipmentViolations = alerts.filter(a => a.category === "Equipment").length;
  const fireSmokeEvents = alerts.filter(a => a.category === "Fire & Smoke").length;

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-600 text-white font-mono text-xs">ESP VISION ENGINE v4.2</Badge>
            <span className="text-xs text-muted-foreground">• {isAr ? "نظام السلامة الذكي بالكاميرات" : "AI Video Safety Engine"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAr ? "مركز قيادة الكاميرات والسلامة الذكية (ESP Safety)" : "Camera Command Center / ESP Safety"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "مراقبة البث الحي للمصنع، تحليل المعدات الوقائية، كشف الحريق والمنحنيات الخطرة تلقائياً" : "Real-time industrial surveillance, AI PPE compliance tracking, hazard zone detection & automatic alerts"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/devices")}>
            <Activity className="w-4 h-4 text-emerald-500" />
            {isAr ? "صحة الكاميرات (Health)" : "Camera Health"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/live")}>
            <Grid className="w-4 h-4 text-indigo-500" />
            {isAr ? "جدار الكاميرات (Live Wall)" : "CCTV Live Wall"}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/map")}>
            <MapPin className="w-4 h-4 text-indigo-500" />
            {isAr ? "خريطة المصنع" : "Factory Map"}
          </Button>
          <Button className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold" onClick={() => setLocation("/admin/vision/cameras")}>
            <Camera className="w-4 h-4" />
            {isAr ? "إدارة الكاميرات" : "Camera Directory"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border border-border/60 shadow-sm bg-card rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">{isAr ? "إجمالي الكاميرات" : "Total Cameras"}</span>
              <Camera className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">{totalCameras}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{totalCameras} {isAr ? "كاميرا مسجلة" : "Configured"}</p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-sm rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? "الكاميرات المتصلة" : "Online Cameras"}</span>
              <Radio className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{onlineCameras}</div>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">{recordingCameras} {isAr ? "تسجل حالياً" : "Active Recording"}</p>
          </CardContent>
        </Card>

        <Card className="border border-rose-500/30 bg-rose-500/5 shadow-sm rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? "الكاميرات غير المتصلة" : "Offline Cameras"}</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{offlineCameras}</div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">{warningCameras} {isAr ? "في حالة تحذير" : "Warning state"}</p>
          </CardContent>
        </Card>

        <Card className="border border-indigo-500/30 bg-indigo-500/5 shadow-sm rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? "نسبة التزام السلامة" : "PPE Compliance"}</span>
              <HardHat className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">{ppeCompliancePct}%</div>
            <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">{isAr ? "تحليل الذكاء الاصطناعي" : "AI Detection Avg"}</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-500/30 bg-amber-500/5 shadow-sm rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? "التنبيهات النشطة" : "Active Alerts"}</span>
              <ShieldAlert className="w-4 h-4 animate-bounce" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{activeAlertsCount}</div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">{isAr ? "تتطلب مراجعة مشغل" : "Require Action"}</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-500/30 bg-blue-500/5 shadow-sm rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? "كفاءة النظام" : "System Health"}</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{systemHealthPct}%</div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">{devices.length} {isAr ? "أجهزة حافة متصلة" : "Edge Devices"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "البث المباشر لأهم نقاط الخطورة بالأنظمة الذكية" : "Priority High-Risk Live Feeds"}
            </h2>
          </div>
          <Button variant="link" className="text-indigo-600 text-xs gap-1 font-semibold p-0" onClick={() => setLocation("/admin/vision/live")}>
            {isAr ? "عرض كل الكاميرات" : "View All Feeds"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cameras.slice(0, 4).map((cam) => (
            <CameraStream
              key={cam.id}
              cameraId={cam.id}
              cameraName={cam.name}
              plant={cam.plant}
              area={cam.area}
              status={cam.status}
              aiActive={cam.aiStatus === "Active"}
              fps={cam.fps}
              resolution={cam.resolution}
              recording={cam.recordingStatus === "Recording"}
              activeAlerts={cam.activeAlertsCount}
              interactivePtz={true}
              heightClassName="h-56"
              onOpenDetails={() => setLocation(`/admin/vision/cameras?id=${cam.id}`)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 pb-3 flex flex-row items-center justify-between border-b border-border/40">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                {isAr ? "سجل تنبيهات الذكاء الاصطناعي الفورية (AI Alerts Feed)" : "Real-time AI Alerts Feed"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isAr ? "تنبيهات تلقائية بدرجات الثقة والتأكيد البشري" : "Automated detection events with confidence scores"}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1" onClick={() => setLocation("/admin/vision/alerts")}>
              {isAr ? "مركز التنبيهات" : "Alert Center"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/40">
            {alerts.slice(0, 5).map((alt) => (
              <div key={alt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl text-white font-mono font-bold text-xs shrink-0 ${alt.severity === "CRITICAL" ? "bg-rose-600 animate-pulse" : alt.severity === "HIGH" ? "bg-orange-600" : "bg-amber-500"}`}>
                    {alt.severity}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{alt.violationType}</span>
                      <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                        {isAr ? "نسبة الثقة" : "Confidence"}: {alt.confidencePct}%
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{alt.timestamp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Camera className="w-3 h-3 inline me-1 text-indigo-500" />
                      {alt.cameraName} ({alt.plant} - {alt.area})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={alt.status === "NEW" ? "bg-rose-500 text-white" : alt.status === "ACKNOWLEDGED" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}>
                    {alt.status}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 font-semibold" onClick={() => setLocation("/admin/vision/alerts")}>
                    {isAr ? "معاينة" : "Review"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-muted/30 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              {isAr ? "محركات كشف السلامة (ESP Engines)" : "ESP AI Detection Engines"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "تغطية كافة أنواع المخاطر الصناعية" : "Comprehensive industrial hazard coverage"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <Button variant="outline" className="w-full justify-between h-11 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/ppe")}>
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-indigo-500" />
                <span>{isAr ? "كشف المعدات الوقائية (PPE)" : "PPE AI Enforcement"}</span>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 border-none">84% {isAr ? "التزام" : "Match"}</Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between h-11 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/restricted-areas")}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>{isAr ? "المناطق المحظورة وخطوط المنع" : "Restricted Area & Line Crossing"}</span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-none">{restrictedAreaViolations} {isAr ? "تنبيه" : "Alerts"}</Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between h-11 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/equipment")}>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                <span>{isAr ? "مراقبة الرافعة والمعدات" : "Equipment & Forklift Monitoring"}</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-none">{equipmentViolations} {isAr ? "حدث" : "Events"}</Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between h-11 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/fire-smoke")}>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>{isAr ? "كشف الحريق والدخان الحراري" : "Fire & Thermal Smoke Detection"}</span>
              </div>
              <Badge className="bg-rose-100 text-rose-800 border-none">{fireSmokeEvents} {isAr ? "حراري" : "Thermal"}</Badge>
            </Button>

            <Button variant="outline" className="w-full justify-between h-11 rounded-xl text-xs font-semibold" onClick={() => setLocation("/admin/vision/people-vehicles")}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? "تتبع الأفراد والمركبات" : "People & Vehicles Tracking"}</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-none">{isAr ? "نشط" : "Active"}</Badge>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

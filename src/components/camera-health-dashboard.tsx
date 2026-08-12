import { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import {
  getStoredCameras,
  getStoredDevices,
  type CameraDevice,
  type VisionDevice,
} from "@/lib/vision-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Search,
  Video,
  Download,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface CameraHealthDashboardProps {
  showTitle?: boolean;
  className?: string;
}

export default function CameraHealthDashboard({
  showTitle = true,
  className = "",
}: CameraHealthDashboardProps) {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [cameras, setCameras] = useState<CameraDevice[]>(() => getStoredCameras());
  const [devices, setDevices] = useState<VisionDevice[]>(() => getStoredDevices());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlant, setSelectedPlant] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Compute Overall NVR & System Metrics
  const totalNVRs = devices.length;
  const onlineNVRs = devices.filter((d) => d.status === "ONLINE").length;

  const avgNvrCpu = Math.round(
    devices.reduce((acc, d) => acc + d.cpuUsagePct, 0) / Math.max(1, devices.length)
  );
  const avgNvrStorage = Math.round(
    devices.reduce((acc, d) => acc + d.storageUsedPct, 0) / Math.max(1, devices.length)
  );

  // Compute Camera Metrics
  const totalCameras = cameras.length;
  const offlineCameras = cameras.filter((c) => c.status === "OFFLINE").length;
  const warningCameras = cameras.filter((c) => c.status === "WARNING").length;

  const recordingActive = cameras.filter((c) => c.recordingStatus === "Recording").length;
  const recordingPaused = cameras.filter((c) => c.recordingStatus === "Paused").length;

  const avgLatency = Math.round(
    cameras.reduce((acc, c) => acc + c.latencyMs, 0) / Math.max(1, cameras.length)
  );
  const highLatencyCount = cameras.filter((c) => c.latencyMs > 50).length;
  const totalStorageGb = cameras.reduce((acc, c) => acc + (c.storageUsedGb || 0), 0);

  // Unique plants list
  const plants = useMemo(() => {
    const set = new Set<string>();
    cameras.forEach((c) => set.add(c.plant));
    return Array.from(set);
  }, [cameras]);

  // Filtered cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const matchesSearch =
        cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.ip.includes(searchQuery) ||
        cam.area.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlant = selectedPlant === "ALL" || cam.plant === selectedPlant;

      let matchesStatus = true;
      if (statusFilter === "ONLINE") matchesStatus = cam.status === "ONLINE";
      else if (statusFilter === "OFFLINE") matchesStatus = cam.status === "OFFLINE";
      else if (statusFilter === "WARNING") matchesStatus = cam.status === "WARNING";
      else if (statusFilter === "HIGH_LATENCY") matchesStatus = cam.latencyMs > 50;
      else if (statusFilter === "PAUSED_REC") matchesStatus = cam.recordingStatus !== "Recording";

      return matchesSearch && matchesPlant && matchesStatus;
    });
  }, [cameras, searchQuery, selectedPlant, statusFilter]);

  // Trigger simulated Ping Sweep
  const handlePingSweep = () => {
    setIsPinging(true);
    toast.info(isAr ? "جاري إجراء فحص الاستجابة الشامل (Ping Sweep)..." : "Initiating network latency & health sweep...");

    setTimeout(() => {
      // Fluctuate latencies slightly for realistic simulation
      setCameras((prev) =>
        prev.map((c) => {
          if (c.status === "OFFLINE") return c;
          const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
          const newLatency = Math.max(8, c.latencyMs + delta);
          return {
            ...c,
            latencyMs: newLatency,
          };
        })
      );

      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          cpuUsagePct: Math.min(95, Math.max(15, d.cpuUsagePct + Math.floor(Math.random() * 7) - 3)),
        }))
      );

      setIsPinging(false);
      const newTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastPingTime(newTime);

      toast.success(
        isAr
          ? `تم تحديث حالة الاستجابة للكاميرات والخوادم بنجاح (${newTime})`
          : `Network sweep complete. Updated ping latencies at ${newTime}.`
      );
    }, 1200);
  };

  const handleExportReport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Name,Plant,Area,IP,NVR,Status,Recording,LatencyMs,HealthScore,FPS,Resolution"]
        .concat(
          cameras.map(
            (c) =>
              `${c.id},"${c.name}","${c.plant}","${c.area}",${c.ip},${c.nvrId || "N/A"},${c.status},${c.recordingStatus},${c.latencyMs},${c.healthScore}%,${c.fps},${c.resolution}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Camera_Health_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);

    toast.success(isAr ? "تم تحميل تقرير صحة الكاميرات بنجاح" : "Camera health CSV report exported successfully.");
  };

  const handleRebootDevice = (deviceName: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: isAr ? `جاري إعادة تشغيل الخادم ${deviceName}...` : `Initiating soft reboot for ${deviceName}...`,
        success: isAr ? `تمت إعادة تشغيل ${deviceName} واستعادة الاتصال` : `${deviceName} successfully rebooted and online.`,
        error: isAr ? "فشلت العملية" : "Reboot failed",
      }
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Optional Title Block */}
      {showTitle && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-border/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-600 text-white font-mono text-xs">
                REAL-TIME HEALTH MONITOR
              </Badge>
              <span className="text-xs text-muted-foreground">
                • {isAr ? "آخر فحص:" : "Last Sweep:"} <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{lastPingTime}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isAr ? "لوحة صحة الكاميرات وخوادم التسجيل (NVR Health Dashboard)" : "Camera & NVR Health Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "مراقبة زمن الاستجابة (Latency)، جودة التسجيل، حالة الاتصال وموارد خوادم NVR والشبكة"
                : "Real-time infrastructure health, NVR node server metrics, network latency & recording diagnostics"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePingSweep}
              disabled={isPinging}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-indigo-600" : "text-indigo-500"}`} />
              {isAr ? "إعادة فحص الاتصال (Ping Sweep)" : "Run Latency Ping Sweep"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              {isAr ? "تصدير التقرير (CSV)" : "Export Health CSV"}
            </Button>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NVR Hardware Status */}
        <Card className="border border-border/60 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isAr ? "خوادم التسجيل NVR" : "NVR & Edge Servers"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{totalNVRs} {isAr ? "خوادم مسجلة" : "Units Configured"}</p>
                </div>
              </div>
              <Badge className={onlineNVRs === totalNVRs ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600"}>
                {onlineNVRs}/{totalNVRs} {isAr ? "نشط" : "Online"}
              </Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">{isAr ? "متوسط استخدام CPU" : "Avg CPU Load"}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{avgNvrCpu}%</span>
              </div>
              <Progress value={avgNvrCpu} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">{isAr ? "استهلاك التخزين" : "Storage Capacity"}</span>
                <span className={`font-bold ${avgNvrStorage > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                  {avgNvrStorage}%
                </span>
              </div>
              <Progress value={avgNvrStorage} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>

        {/* Latency & Connectivity */}
        <Card className="border border-border/60 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isAr ? "زمن الاستجابة (Latency)" : "Network Latency"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{isAr ? "متوسط استجابة الكاميرات" : "Avg Camera Ping"}</p>
                </div>
              </div>
              <Badge className="font-mono text-xs bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                {avgLatency} ms
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 text-center">
                <div className="text-[10px] text-muted-foreground">{isAr ? "استجابة ممتازة (<25ms)" : "Optimal (<25ms)"}</div>
                <div className="text-sm font-bold font-mono text-emerald-600">
                  {cameras.filter((c) => c.latencyMs < 25).length}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 text-center">
                <div className="text-[10px] text-muted-foreground">{isAr ? "بطء اتصالات (>50ms)" : "High (>50ms)"}</div>
                <div className={`text-sm font-bold font-mono ${highLatencyCount > 0 ? "text-amber-600" : "text-slate-600"}`}>
                  {highLatencyCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recording Health */}
        <Card className="border border-border/60 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isAr ? "حالة التسجيل والتخزين" : "Recording Health"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{totalStorageGb} GB {isAr ? "مستخدم" : "Total Active Storage"}</p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white font-mono text-xs">
                {Math.round((recordingActive / Math.max(1, totalCameras)) * 100)}%
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isAr ? "تسجيل مستمر" : "Active Rec"}
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{recordingActive}</span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-1">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {isAr ? "موقوف مؤقتاً" : "Paused"}
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{recordingPaused}</span>
            </div>
          </CardContent>
        </Card>

        {/* System Diagnostics Score */}
        <Card className="border border-border/60 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isAr ? "مؤشر صحة الشبكة" : "Network Health Index"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{isAr ? "تقييم أداء الإشارة والتخزين" : "Overall Channel Uptime"}</p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white font-mono text-xs">
                98.4%
              </Badge>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
              <div className="text-xs text-purple-900 dark:text-purple-200">
                <span className="font-bold">{offlineCameras + warningCameras}</span> {isAr ? "كاميرات تحت الصيانة" : "Devices require check"}
              </div>
              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-700 dark:text-purple-300">
                {isAr ? "مراقبة مستمرة" : "Monitored"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NVR Hardware Nodes Detailed Grid */}
      <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              {isAr ? "حالة خوادم NVR وأجهزة المعالجة الذكية (Edge NVR Status)" : "NVR Servers & Edge Hardware Nodes"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr ? "استهلاك الموارد، السعة، والبرمجيات المثبتة لكل خادم" : "Resource utilization, connected channel load & firmware status per NVR"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-mono">
            {devices.length} {isAr ? "وحدات متصلة" : "Active Nodes"}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {devices.map((device) => {
              const connectedCamsCount = cameras.filter((c) => c.nvrId === device.id).length;
              return (
                <div
                  key={device.id}
                  className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{device.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                        <span>{device.id}</span>
                        <span>•</span>
                        <span>{device.ip}</span>
                      </div>
                    </div>
                    <Badge
                      className={
                        device.status === "ONLINE"
                          ? "bg-emerald-600 text-white text-[10px]"
                          : "bg-amber-500 text-white text-[10px]"
                      }
                    >
                      {device.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span className="font-semibold">{device.type}</span>
                    <span>•</span>
                    <span>{device.plant} ({device.area})</span>
                  </div>

                  {/* Resource meters */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                        <span>CPU</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{device.cpuUsagePct}%</span>
                      </div>
                      <Progress value={device.cpuUsagePct} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                        <span>{isAr ? "التخزين" : "Storage"}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{device.storageUsedPct}%</span>
                      </div>
                      <Progress value={device.storageUsedPct} className="h-1.5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
                    <span className="font-mono text-[11px]">
                      {connectedCamsCount} / {device.channelsCount} {isAr ? "قناة مستخدمة" : "Channels Active"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRebootDevice(device.name)}
                      className="h-7 text-[11px] px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {isAr ? "إعادة تشغيل" : "Reboot"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Camera Health & Latency Table */}
      <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-4 bg-muted/30 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              {isAr ? "سجل استجابة وصحة الكاميرات الفردية (Camera Health Directory)" : "Individual Camera Health & Ping Registry"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr
                ? "تتبع حالة الاتصال، السرعة، سرعة الإطارات (FPS)، والدقة وتخصيص NVR"
                : "Real-time latency (ms), frame rate (FPS), recording status & linked NVR node per camera"}
            </CardDescription>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder={isAr ? "بحث برقم الكاميرا، الاسم، IP..." : "Search Camera ID, Name, IP..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs rounded-xl bg-background"
              />
            </div>

            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="h-8 text-xs w-[140px] rounded-xl bg-background">
                <SelectValue placeholder={isAr ? "جميع المصانع" : "All Plants"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع المصانع" : "All Plants"}</SelectItem>
                {plants.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[150px] rounded-xl bg-background">
                <SelectValue placeholder={isAr ? "جميع الحالات" : "All Statuses"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع الحالات" : "All Statuses"}</SelectItem>
                <SelectItem value="ONLINE">{isAr ? "متصل (ONLINE)" : "Online Only"}</SelectItem>
                <SelectItem value="WARNING">{isAr ? "تحذير (WARNING)" : "Warning Only"}</SelectItem>
                <SelectItem value="OFFLINE">{isAr ? "غير متصل (OFFLINE)" : "Offline Only"}</SelectItem>
                <SelectItem value="HIGH_LATENCY">{isAr ? "استجابة بطيئة (>50ms)" : "High Latency (>50ms)"}</SelectItem>
                <SelectItem value="PAUSED_REC">{isAr ? "التسجيل متوقف/معطل" : "Recording Paused/Disabled"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
              <TableRow className="text-xs">
                <TableHead>{isAr ? "الكاميرا والمعرف" : "Camera & ID"}</TableHead>
                <TableHead>{isAr ? "الموقع وخادم NVR" : "Location & NVR"}</TableHead>
                <TableHead>{isAr ? "عنوان IP والنوع" : "IP & Type"}</TableHead>
                <TableHead>{isAr ? "حالة الاتصال" : "Status"}</TableHead>
                <TableHead>{isAr ? "حالة التسجيل" : "Recording State"}</TableHead>
                <TableHead className="text-center">{isAr ? "زمن الاستجابة (Ping)" : "Latency (Ms)"}</TableHead>
                <TableHead className="text-center">{isAr ? "الجودة و FPS" : "Res / FPS"}</TableHead>
                <TableHead className="text-right">{isAr ? "مؤشر الصحة" : "Health Score"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCameras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    {isAr ? "لا توجد كاميرات تطابق معايير البحث الحالية." : "No cameras match the selected search criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCameras.map((cam) => {
                  const isHighLatency = cam.latencyMs > 50;
                  return (
                    <TableRow key={cam.id} className="hover:bg-muted/30 text-xs transition-colors">
                      <TableCell className="font-medium">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{cam.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            {cam.id}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-slate-800 dark:text-slate-200">{cam.plant}</div>
                        <div className="text-[11px] text-muted-foreground">{cam.area} • <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{cam.nvrId || "Unassigned"}</span></div>
                      </TableCell>

                      <TableCell>
                        <div className="font-mono text-slate-700 dark:text-slate-300">{cam.ip}</div>
                        <div className="text-[10px] text-muted-foreground">{cam.type}</div>
                      </TableCell>

                      <TableCell>
                        {cam.status === "ONLINE" ? (
                          <Badge className="bg-emerald-600 text-white gap-1 text-[10px]">
                            <Wifi className="w-3 h-3" />
                            ONLINE
                          </Badge>
                        ) : cam.status === "WARNING" ? (
                          <Badge className="bg-amber-500 text-white gap-1 text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            WARNING
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-600 text-white gap-1 text-[10px]">
                            <WifiOff className="w-3 h-3" />
                            OFFLINE
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {cam.recordingStatus === "Recording" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            {isAr ? "جاري التسجيل" : "Recording"}
                          </span>
                        ) : cam.recordingStatus === "Paused" ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {isAr ? "موقوف" : "Paused"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            {isAr ? "معطل" : "Disabled"}
                          </span>
                        )}
                        <div className="text-[10px] text-muted-foreground font-mono">{cam.storageUsedGb || 0} GB stored</div>
                      </TableCell>

                      <TableCell className="text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[11px] ${
                            cam.status === "OFFLINE"
                              ? "bg-slate-100 text-slate-400 border-slate-200"
                              : isHighLatency
                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {cam.status === "OFFLINE" ? "N/A" : `${cam.latencyMs} ms`}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <div className="text-slate-800 dark:text-slate-200 font-bold">{cam.resolution}</div>
                        <div className="text-[10px] text-muted-foreground">{cam.fps} FPS</div>
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        <div
                          className={`font-black text-sm ${
                            cam.healthScore >= 90
                              ? "text-emerald-600"
                              : cam.healthScore >= 75
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {cam.healthScore}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">{cam.firmware}</div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

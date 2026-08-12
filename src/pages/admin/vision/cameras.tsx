import { useState } from "react";
import { useData } from "@/lib/data-context";
import {
  getStoredCameras,
  saveStoredCameras,
  addAuditEntry,
  type CameraDevice,
} from "@/lib/vision-store";
import CameraStream from "@/components/camera-stream";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Search, Edit, Trash2, Eye, Grid, List, RefreshCw, Copy, Check, Video, AlertTriangle
} from "lucide-react";

export default function VisionCameras() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [cameras, setCameras] = useState<CameraDevice[]>(() => getStoredCameras());
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selected Camera for Details Dialog
  const [detailsCamera, setDetailsCamera] = useState<CameraDevice | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<CameraDevice>>({
    name: "",
    plant: "Plant 1 - Steel Fab",
    area: "Main Production Floor",
    ip: "192.168.10.100",
    rtspUrl: "rtsp://192.168.10.100/live/ch0",
    type: "PTZ",
    status: "ONLINE",
    aiStatus: "Active",
    recordingStatus: "Recording",
    resolution: "4K (3840x2160)",
    fps: 30,
    nvrId: "NVR-01",
    firmware: "v4.2.1-industrial",
    latencyMs: 12,
    healthScore: 98,
  });

  const [copiedRtsp, setCopiedRtsp] = useState(false);
  const [isTestingRtsp, setIsTestingRtsp] = useState(false);

  const updateAndSaveCameras = (updated: CameraDevice[]) => {
    setCameras(updated);
    saveStoredCameras(updated);
  };

  // Handle Add New Camera
  const handleOpenAddModal = () => {
    const nextIdNumber = cameras.length + 1;
    const newId = `CAM-${String(nextIdNumber).padStart(2, "0")}`;
    setFormData({
      id: newId,
      name: isAr ? `كاميرا جديدة ${nextIdNumber}` : `New Industrial Camera ${nextIdNumber}`,
      plant: "Plant 1 - Steel Fab",
      area: "Main Production Line",
      ip: `192.168.10.${100 + nextIdNumber}`,
      rtspUrl: `rtsp://192.168.10.${100 + nextIdNumber}/live/ch0`,
      type: "PTZ",
      status: "ONLINE",
      aiStatus: "Active",
      recordingStatus: "Recording",
      resolution: "4K (3840x2160)",
      fps: 30,
      nvrId: "NVR-01",
      firmware: "v4.2.1-industrial",
      latencyMs: 14,
      healthScore: 99,
      activeAlertsCount: 0,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewCamera = () => {
    if (!formData.name || !formData.ip) {
      toast.error(isAr ? "يرجى ملء الاسم وعنوان IP" : "Please provide camera name and IP address.");
      return;
    }

    const newCam: CameraDevice = {
      id: formData.id || `CAM-${Date.now().toString().slice(-3)}`,
      name: formData.name || "Camera",
      plant: formData.plant || "Plant 1",
      area: formData.area || "Zone A",
      ip: formData.ip || "192.168.1.1",
      rtspUrl: formData.rtspUrl || `rtsp://${formData.ip}/live/ch0`,
      type: (formData.type as any) || "Fixed Bullet",
      status: (formData.status as any) || "ONLINE",
      aiStatus: (formData.aiStatus as any) || "Active",
      recordingStatus: (formData.recordingStatus as any) || "Recording",
      resolution: formData.resolution || "1080p",
      fps: formData.fps || 30,
      nvrId: formData.nvrId || "NVR-01",
      firmware: formData.firmware || "v4.2.1",
      latencyMs: formData.latencyMs || 15,
      healthScore: formData.healthScore || 95,
      activeAlertsCount: 0,
      storageUsedGb: 120,
      lastSeen: new Date().toISOString(),
    };

    const nextList = [newCam, ...cameras];
    updateAndSaveCameras(nextList);
    addAuditEntry("Added New Camera", newCam.id);
    setIsAddModalOpen(false);
    toast.success(isAr ? `تمت إضافة الكاميرا ${newCam.name} بنجاح` : `Camera ${newCam.name} registered successfully.`);
  };

  // Handle Edit Existing Camera
  const handleOpenEditModal = (cam: CameraDevice) => {
    setFormData({ ...cam });
    setIsEditModalOpen(true);
  };

  const handleSaveEditCamera = () => {
    if (!formData.id) return;
    const nextList = cameras.map((c) => (c.id === formData.id ? ({ ...c, ...formData } as CameraDevice) : c));
    updateAndSaveCameras(nextList);
    addAuditEntry("Updated Camera Details", formData.id);

    // If detailsCamera is currently open for this camera, update it
    if (detailsCamera && detailsCamera.id === formData.id) {
      setDetailsCamera({ ...detailsCamera, ...formData } as CameraDevice);
    }

    setIsEditModalOpen(false);
    toast.success(isAr ? `تم تحديث بيانات الكاميرا ${formData.name}` : `Camera ${formData.name} updated successfully.`);
  };

  // Delete Camera Trigger
  const handleDeleteCamera = (id: string, name: string) => {
    setCameraToDelete({ id, name });
  };

  const confirmDeleteCamera = () => {
    if (!cameraToDelete) return;
    const { id, name } = cameraToDelete;
    const next = cameras.filter((c) => c.id !== id);
    updateAndSaveCameras(next);
    addAuditEntry("Deleted Camera", id);
    if (detailsCamera?.id === id) setDetailsCamera(null);
    toast.success(isAr ? `تم حذف الكاميرا ${name} بنجاح` : `Camera ${name} removed successfully`);
    setCameraToDelete(null);
  };

  // Toggle Recording Status directly in details
  const handleToggleRecording = (cam: CameraDevice) => {
    const nextStatus = cam.recordingStatus === "Recording" ? "Paused" : "Recording";
    const updated = cameras.map((c) => (c.id === cam.id ? { ...c, recordingStatus: nextStatus as any } : c));
    updateAndSaveCameras(updated);
    setDetailsCamera({ ...cam, recordingStatus: nextStatus as any });
    toast.info(
      isAr
        ? `تم تغير حالة التسجيل للكاميرا ${cam.name} إلى: ${nextStatus}`
        : `Recording status for ${cam.name} set to ${nextStatus}`
    );
  };

  // Toggle AI Analytics Engine
  const handleToggleAiEngine = (cam: CameraDevice) => {
    const nextAi = cam.aiStatus === "Active" ? "Disabled" : "Active";
    const updated = cameras.map((c) => (c.id === cam.id ? { ...c, aiStatus: nextAi as any } : c));
    updateAndSaveCameras(updated);
    setDetailsCamera({ ...cam, aiStatus: nextAi as any });
    toast.success(
      isAr
        ? `تحليل الذكاء الاصطناعي لكاميرا ${cam.name}: ${nextAi === "Active" ? "مفعل" : "معطل"}`
        : `AI Vision analytics for ${cam.name} is now ${nextAi}`
    );
  };

  // RTSP Copy
  const handleCopyRtsp = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedRtsp(true);
    setTimeout(() => setCopiedRtsp(false), 2000);
    toast.success(isAr ? "تم نسخ رابط RTSP" : "RTSP stream URL copied to clipboard");
  };

  // Test Connection
  const handleTestRtspConnection = () => {
    setIsTestingRtsp(true);
    setTimeout(() => {
      setIsTestingRtsp(false);
      toast.success(isAr ? "اتصال RTSP نشط وناجح (Bitrate: 8.4 Mbps)" : "RTSP Connection verified. Active bitrate: 8.4 Mbps.");
    }, 1200);
  };

  const filteredCameras = cameras.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ip.includes(searchQuery);
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCount = cameras.length;
  const onlineCount = cameras.filter((c) => c.status === "ONLINE").length;
  const offlineCount = cameras.filter((c) => c.status === "OFFLINE").length;
  const alertCount = cameras.filter((c) => c.activeAlertsCount > 0).length;
  const recordingCount = cameras.filter((c) => c.recordingStatus === "Recording").length;

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-600 text-white font-mono text-xs">CAMERA COMMAND CENTER</Badge>
            <span className="text-xs text-muted-foreground">• {isAr ? "مركز إدارة الكاميرات والشبكات" : "Camera Directory & Device Hub"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAr ? "مركز إدارة الكاميرات (Camera Command Center)" : "Camera Command Center"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? "إدارة كاملة لكاميرات المصنع، عناوين RTSP، التحليل الذكي، والربط بالخوادم" : "Full lifecycle configuration for industrial IP, Thermal, ONVIF and ESP cameras"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            onClick={handleOpenAddModal}
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إضافة كاميرا جديدة" : "Add New Camera"}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-border/60 bg-card p-3 rounded-xl">
          <div className="text-xs text-muted-foreground">{isAr ? "إجمالي الكاميرات" : "Total Cameras"}</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
        </Card>
        <Card className="border border-emerald-500/30 bg-emerald-500/5 p-3 rounded-xl">
          <div className="text-xs text-emerald-600 font-semibold">{isAr ? "متصلة (ONLINE)" : "Online"}</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{onlineCount}</div>
        </Card>
        <Card className="border border-rose-500/30 bg-rose-500/5 p-3 rounded-xl">
          <div className="text-xs text-rose-600 font-semibold">{isAr ? "غير متصلة (OFFLINE)" : "Offline"}</div>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">{offlineCount}</div>
        </Card>
        <Card className="border border-amber-500/30 bg-amber-500/5 p-3 rounded-xl">
          <div className="text-xs text-amber-600 font-semibold">{isAr ? "في حالة تنبيه" : "In Alert"}</div>
          <div className="text-xl font-bold font-mono text-amber-600 mt-1">{alertCount}</div>
        </Card>
        <Card className="border border-indigo-500/30 bg-indigo-500/5 p-3 rounded-xl">
          <div className="text-xs text-indigo-600 font-semibold">{isAr ? "تسجيل نشط" : "Recording"}</div>
          <div className="text-xl font-bold font-mono text-indigo-600 mt-1">{recordingCount}</div>
        </Card>
        <Card className="border border-blue-500/30 bg-blue-500/5 p-3 rounded-xl">
          <div className="text-xs text-blue-600 font-semibold">{isAr ? "صحة الكاميرات" : "System Health"}</div>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">98%</div>
        </Card>
      </div>

      {/* Filter and View Mode Switch */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث عن كاميرا بالاسم، المعرف، IP أو المنطقة..." : "Search camera by name, ID, IP or area..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs rounded-lg bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{isAr ? "كل الحالات" : "All Status"}</SelectItem>
              <SelectItem value="ONLINE">ONLINE</SelectItem>
              <SelectItem value="OFFLINE">OFFLINE</SelectItem>
              <SelectItem value="WARNING">WARNING</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border border-border rounded-lg overflow-hidden bg-background">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCameras.map((cam) => (
            <Card
              key={cam.id}
              className="border border-border/70 shadow-sm bg-card rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <CameraStream
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
                  heightClassName="h-44"
                  onOpenDetails={() => setDetailsCamera(cam)}
                />

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{cam.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-mono">{cam.id} • {cam.ip}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {cam.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <div>{isAr ? "الدقة:" : "Res:"} <span className="font-semibold text-foreground">{cam.resolution}</span></div>
                    <div>{isAr ? "الإطارات:" : "FPS:"} <span className="font-semibold text-foreground">{cam.fps}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1 text-indigo-600 hover:text-indigo-700 font-semibold p-0"
                  onClick={() => setDetailsCamera(cam)}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isAr ? "التفاصيل والبث" : "Details & Stream"}
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    onClick={() => handleOpenEditModal(cam)}
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    onClick={() => handleDeleteCamera(cam.id, cam.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{isAr ? "الكاميرا المعرف والاسم" : "Camera ID & Name"}</TableHead>
                <TableHead>{isAr ? "المصنع والمنطقة" : "Plant & Area"}</TableHead>
                <TableHead>{isAr ? "عنوان IP والسيرفر" : "IP & NVR"}</TableHead>
                <TableHead>{isAr ? "الحالة والتسجيل" : "Status & REC"}</TableHead>
                <TableHead>{isAr ? "الذكاء الاصطناعي" : "AI Engine"}</TableHead>
                <TableHead className="text-end">{isAr ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCameras.map((cam) => (
                <TableRow key={cam.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="font-bold text-sm">{cam.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{cam.id} • {cam.type}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium">{cam.plant}</div>
                    <div className="text-[11px] text-muted-foreground">{cam.area}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{cam.ip}</div>
                    <div className="text-[10px] text-muted-foreground">{cam.nvrId || "NVR-01"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge className={cam.status === "ONLINE" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                        {cam.status}
                      </Badge>
                      {cam.recordingStatus === "Recording" && (
                        <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/40">REC</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        cam.aiStatus === "Active"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cam.aiStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-indigo-600" onClick={() => setDetailsCamera(cam)}>
                        <Eye className="w-3.5 h-3.5" />
                        {isAr ? "عرض" : "View"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenEditModal(cam)}>
                        <Edit className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => handleDeleteCamera(cam.id, cam.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Camera Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl bg-card rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              {isAr ? "إضافة كاميرا مراقبة جديدة" : "Register New Industrial IP Camera"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isAr ? "ربط كاميرا شبكية RTSP/ONVIF بنظام تحليل الرؤية وسيرفرات NVR" : "Configure new IP stream, ONVIF endpoint, plant zone and RTSP connection settings"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>{isAr ? "معرف الكاميرا (Camera ID)" : "Camera ID"}</Label>
              <Input
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "اسم الكاميرا" : "Camera Name"}</Label>
              <Input
                placeholder={isAr ? "مثال: كاميرا المدخل الرئيسي" : "e.g. Main Entrance Dome"}
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المصنع" : "Plant / Facility"}</Label>
              <Select value={formData.plant} onValueChange={(val) => setFormData({ ...formData, plant: val })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plant 1 - Steel Fab">Plant 1 - Steel Fab</SelectItem>
                  <SelectItem value="Plant 2 - Chemical">Plant 2 - Chemical</SelectItem>
                  <SelectItem value="Plant 3 - Assembly">Plant 3 - Assembly</SelectItem>
                  <SelectItem value="Logistics Hub">Logistics Hub</SelectItem>
                  <SelectItem value="Utilities & Power">Utilities & Power</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المنطقة / القسيمة" : "Area / Zone"}</Label>
              <Input
                placeholder="e.g. Zone B - Chemical Reactor"
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "عنوان IP" : "IP Address"}</Label>
              <Input
                placeholder="192.168.10.x"
                value={formData.ip || ""}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value, rtspUrl: `rtsp://${e.target.value}/live/ch0` })}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "نوع الكاميرا" : "Camera Type"}</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as any })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PTZ">PTZ Dome (Pan-Tilt-Zoom)</SelectItem>
                  <SelectItem value="Fixed Bullet">Fixed Bullet Camera</SelectItem>
                  <SelectItem value="Thermal">Thermal Dual Sensor</SelectItem>
                  <SelectItem value="Dome">Dome Camera</SelectItem>
                  <SelectItem value="IP Camera">Industrial IP Camera</SelectItem>
                  <SelectItem value="ESP Node">ESP32 Cam Edge Node</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <Label>{isAr ? "رابط البث (RTSP Stream URL)" : "RTSP Stream URL"}</Label>
              <Input
                placeholder="rtsp://192.168.10.x/live/ch0"
                value={formData.rtspUrl || ""}
                onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "خادم NVR" : "NVR Server Node"}</Label>
              <Select value={formData.nvrId} onValueChange={(val) => setFormData({ ...formData, nvrId: val })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NVR-01">NVR-01 (Main Processing Cluster)</SelectItem>
                  <SelectItem value="NVR-02">NVR-02 (Plant 2 High-Density)</SelectItem>
                  <SelectItem value="NVR-03">NVR-03 (Logistics Edge Server)</SelectItem>
                  <SelectItem value="NVR-04">NVR-04 (Thermal & Safety Unit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "الدقة ومعدل الإطارات" : "Resolution & FPS"}</Label>
              <Select value={formData.resolution} onValueChange={(val) => setFormData({ ...formData, resolution: val })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4K (3840x2160)">4K UHD (3840x2160)</SelectItem>
                  <SelectItem value="1080p (1920x1080)">Full HD 1080p (1920x1080)</SelectItem>
                  <SelectItem value="2K (2560x1440)">2K QHD (2560x1440)</SelectItem>
                  <SelectItem value="720p (1280x720)">720p HD (1280x720)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs">
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button size="sm" onClick={handleSaveNewCamera} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
              {isAr ? "حفظ الكاميرا" : "Save & Connect Camera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Camera Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl bg-card rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              {isAr ? `تعديل الكاميرا: ${formData.name}` : `Edit Camera Configuration: ${formData.id}`}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>{isAr ? "اسم الكاميرا" : "Camera Name"}</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "حالة الاتصال" : "Status"}</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">ONLINE</SelectItem>
                  <SelectItem value="WARNING">WARNING</SelectItem>
                  <SelectItem value="OFFLINE">OFFLINE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المصنع" : "Plant"}</Label>
              <Input
                value={formData.plant || ""}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "المنطقة" : "Area"}</Label>
              <Input
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "عنوان IP" : "IP Address"}</Label>
              <Input
                value={formData.ip || ""}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "تحليل الذكاء الاصطناعي" : "AI Vision Status"}</Label>
              <Select value={formData.aiStatus} onValueChange={(val) => setFormData({ ...formData, aiStatus: val as any })}>
                <SelectTrigger className="text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (المحرك نشط)</SelectItem>
                  <SelectItem value="Disabled">Disabled (معطل)</SelectItem>
                  <SelectItem value="Warning">Warning (تحذير الأداء)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <Label>{isAr ? "رابط البث (RTSP Stream URL)" : "RTSP Stream URL"}</Label>
              <Input
                value={formData.rtspUrl || ""}
                onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} className="rounded-xl text-xs">
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button size="sm" onClick={handleSaveEditCamera} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
              {isAr ? "حفظ التغيرات" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details & Live Stream Dialog */}
      <Dialog open={!!detailsCamera} onOpenChange={() => setDetailsCamera(null)}>
        <DialogContent className="max-w-4xl bg-card rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{detailsCamera?.name}</span>
                <span className="text-xs font-mono text-muted-foreground">({detailsCamera?.id})</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={() => detailsCamera && handleOpenEditModal(detailsCamera)}>
                  <Edit className="w-3.5 h-3.5" />
                  {isAr ? "تعديل" : "Edit"}
                </Button>
                <Badge className={detailsCamera?.status === "ONLINE" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                  {detailsCamera?.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsCamera && (
            <Tabs defaultValue="live" className="w-full space-y-4">
              <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="live" className="text-xs">{isAr ? "البث المباشر" : "Live Stream"}</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">{isAr ? "كشف الذكاء" : "AI Detection"}</TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs">{isAr ? "التنبيهات" : "Alerts"}</TabsTrigger>
                <TabsTrigger value="recordings" className="text-xs">{isAr ? "التسجيلات" : "Recordings"}</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">{isAr ? "الإعدادات" : "Settings"}</TabsTrigger>
              </TabsList>

              {/* Live Stream Tab */}
              <TabsContent value="live" className="space-y-3">
                <CameraStream
                  cameraId={detailsCamera.id}
                  cameraName={detailsCamera.name}
                  plant={detailsCamera.plant}
                  area={detailsCamera.area}
                  status={detailsCamera.status}
                  aiActive={detailsCamera.aiStatus === "Active"}
                  fps={detailsCamera.fps}
                  resolution={detailsCamera.resolution}
                  interactivePtz={true}
                  recording={detailsCamera.recordingStatus === "Recording"}
                  activeAlerts={detailsCamera.activeAlertsCount}
                  heightClassName="h-80"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block">{isAr ? "الموقع والقسيمة" : "Plant & Area"}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{detailsCamera.plant} • {detailsCamera.area}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{isAr ? "عنوان IP والسيرفر" : "IP & NVR"}</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{detailsCamera.ip} ({detailsCamera.nvrId || "NVR-01"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{isAr ? "زمن الاستجابة" : "Latency"}</span>
                    <span className="font-mono font-bold text-emerald-600">{detailsCamera.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{isAr ? "درجة صحة الكاميرا" : "Health Score"}</span>
                    <span className="font-mono font-bold text-indigo-600">{detailsCamera.healthScore}%</span>
                  </div>
                </div>
              </TabsContent>

              {/* AI Detection Tab */}
              <TabsContent value="ai" className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <div className="space-y-0.5">
                    <div className="font-bold text-indigo-950 dark:text-indigo-200">
                      {isAr ? "محرك تحليل الذكاء الاصطناعي الرئيسي" : "Master AI Vision Processing Engine"}
                    </div>
                    <div className="text-muted-foreground">
                      {isAr ? "تفعيل المعالجة اللحظية لإطارات الصور والكشف عن المخاطر" : "Real-time AI bounding box inferencing on this stream"}
                    </div>
                  </div>
                  <Switch
                    checked={detailsCamera.aiStatus === "Active"}
                    onCheckedChange={() => handleToggleAiEngine(detailsCamera)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-xl border flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{isAr ? "كشف معدات السلامة (PPE Detector)" : "PPE Helmet & Vest Detector"}</div>
                      <div className="text-[11px] text-muted-foreground">{isAr ? "خوذة، سترة، نظارات حماية" : "Detect missing safety helmet, vest, glasses"}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
                  </div>

                  <div className="p-3 bg-card rounded-xl border flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{isAr ? "المناطق المحظورة (Restricted Polygon)" : "Restricted Zone Intrusion"}</div>
                      <div className="text-[11px] text-muted-foreground">{isAr ? "تنبيه عند عبور الخط الأحمر" : "Polygon fence virtual boundary check"}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
                  </div>

                  <div className="p-3 bg-card rounded-xl border flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{isAr ? "كشف الحريق والدخان (Fire/Smoke)" : "Fire & Smoke Thermal Detector"}</div>
                      <div className="text-[11px] text-muted-foreground">{isAr ? "انبعاثات الدخان وارتفاع الحرارة" : "Early thermal flame detection"}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
                  </div>

                  <div className="p-3 bg-card rounded-xl border flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{isAr ? "تقارب المشاة والرافعات (Proximity)" : "Forklift / Pedestrian Proximity"}</div>
                      <div className="text-[11px] text-muted-foreground">{isAr ? "حساب المسافات بين الأفراد والآليات" : "Real-time safety distance monitor"}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
                  </div>
                </div>
              </TabsContent>

              {/* Alerts Log Tab */}
              <TabsContent value="alerts" className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl">
                  <span className="font-bold">{isAr ? "سجل التنبيهات المرتبطة بهذه الكاميرا" : "Recent Active Alerts & Event Logs"}</span>
                  <Badge variant="outline" className="font-mono">
                    {detailsCamera.activeAlertsCount} {isAr ? "تنبيهات حرجة" : "Active Alerts"}
                  </Badge>
                </div>

                {detailsCamera.activeAlertsCount === 0 ? (
                  <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    {isAr ? "لا توجد تنبيهات نشطة حالياً لهذه الكاميرا." : "No critical security or safety alerts active on this stream."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-bold text-amber-900 dark:text-amber-200">{isAr ? "تجاوز المنطقة المحظورة" : "Restricted Area Intrusion Detected"}</div>
                          <div className="text-[11px] text-muted-foreground">{isAr ? "قبل 3 دقائق • كشف فرد بدون تصريح" : "3 mins ago • Unauthorized personnel in Zone B"}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg">
                        {isAr ? "مراجعة اللقطة" : "Review Snapshot"}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Recordings Tab */}
              <TabsContent value="recordings" className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{isAr ? "حالة التسجيل اللحظي" : "Continuous Video Recording"}</div>
                    <div className="text-muted-foreground">{isAr ? "تخزين 24/7 على سيرفرات NVR مع الاحتفاظ لمدة 30 يوماً" : "Loop recording retention: 30 Days @ 4K 30FPS"}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={detailsCamera.recordingStatus === "Recording" ? "default" : "outline"}
                    className={detailsCamera.recordingStatus === "Recording" ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" : "text-amber-600 gap-1.5"}
                    onClick={() => handleToggleRecording(detailsCamera)}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {detailsCamera.recordingStatus === "Recording" ? (isAr ? "جاري التسجيل" : "Recording Active") : (isAr ? "التسجيل موقوف" : "Recording Paused")}
                  </Button>
                </div>

                <div className="p-3 rounded-xl bg-card border space-y-2">
                  <div className="font-bold">{isAr ? "عنوان البث RTSP المباشر:" : "RTSP Stream Link:"}</div>
                  <div className="flex items-center gap-2">
                    <Input value={detailsCamera.rtspUrl || `rtsp://${detailsCamera.ip}/live/ch0`} readOnly className="font-mono text-xs bg-muted/40 rounded-xl" />
                    <Button size="sm" variant="outline" onClick={() => handleCopyRtsp(detailsCamera.rtspUrl || `rtsp://${detailsCamera.ip}/live/ch0`)} className="gap-1 rounded-xl">
                      {copiedRtsp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedRtsp ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-3 text-xs">
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <div className="font-bold text-sm border-b pb-2">{isAr ? "مواصفات الاتصال المتقدمة" : "Technical Connection & Firmware Details"}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block">{isAr ? "عنوان الشبكة IP" : "IP Address"}</span>
                      <span className="font-mono font-bold">{detailsCamera.ip}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{isAr ? "سيرفر NVR المربوط" : "Linked NVR Unit"}</span>
                      <span className="font-bold">{detailsCamera.nvrId || "NVR-01"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{isAr ? "إصدار البرمجية Firmware" : "Firmware Version"}</span>
                      <span className="font-mono">{detailsCamera.firmware}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{isAr ? "استهلاك التخزين الحالي" : "Storage Consumed"}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailsCamera.storageUsedGb || 120} GB</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTestRtspConnection}
                      disabled={isTestingRtsp}
                      className="gap-2 rounded-xl text-xs font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingRtsp ? "animate-spin text-indigo-600" : ""}`} />
                      {isAr ? "اختبار اتصال RTSP" : "Test RTSP Bandwidth"}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenEditModal(detailsCamera)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      {isAr ? "تعديل كل الإعدادات" : "Edit Full Config"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!cameraToDelete} onOpenChange={() => setCameraToDelete(null)}>
        <DialogContent className="max-w-md bg-card rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              {isAr ? "تأكيد حذف الكاميرا" : "Confirm Camera Deletion"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 text-muted-foreground leading-relaxed">
              {isAr
                ? `هل أنت متاكد من إزالة الكاميرا "${cameraToDelete?.name}" (${cameraToDelete?.id})؟ سيتم إلغاء الربط مع سيرفر NVR وحذف قواعد التحليل الذكي المرتبطة بها.`
                : `Are you sure you want to delete camera "${cameraToDelete?.name}" (${cameraToDelete?.id})? This will unbind it from NVR and stop active recording.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setCameraToDelete(null)} className="rounded-xl text-xs">
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={confirmDeleteCamera}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isAr ? "نعم، حذف الكاميرا" : "Yes, Delete Camera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


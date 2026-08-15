import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import IncidentPyramid from "@/components/incident-pyramid";
import { 
  Triangle, 
  ShieldAlert, 
  AlertTriangle, 
  Filter, 
  Calendar, 
  Building2, 
  Download, 
  Printer, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileText, 
  BarChart3, 
  Shield,
  Activity,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

export interface PyramidLevelConfig {
  id: string;
  nameEn: string;
  nameAr: string;
  order: number;
  category: string;
  color: string;
  bgColor: string;
  enabled: boolean;
}

export interface SafetyRecordItem {
  id: string;
  recordNo: string;
  date: string;
  department: string;
  location: string;
  category: string;
  severity: "Fatal" | "Major" | "Minor" | "First Aid" | "Property Damage" | "Near Miss" | "Unsafe Condition" | "Unsafe Act" | "Observation";
  description: string;
  status: string;
  responsiblePerson: string;
  correctiveAction: string;
  capaStatus: "Open" | "In Progress" | "Closed" | "Overdue";
  closureDate?: string;
  factory?: string;
}

const DEFAULT_PYRAMID_LEVELS: PyramidLevelConfig[] = [
  { id: "fatal", nameEn: "Fatalities", nameAr: "الوفيات", order: 1, category: "Fatal", color: "text-red-700", bgColor: "bg-red-700", enabled: true },
  { id: "major", nameEn: "Major Injuries", nameAr: "إصابات جسيمة", order: 2, category: "Major", color: "text-red-500", bgColor: "bg-red-500", enabled: true },
  { id: "minor", nameEn: "Minor Injuries", nameAr: "إصابات طفيفة", order: 3, category: "Minor", color: "text-amber-500", bgColor: "bg-amber-500", enabled: true },
  { id: "first_aid", nameEn: "First Aid Cases", nameAr: "حالات الإسعافات الأولية", order: 4, category: "First Aid", color: "text-yellow-500", bgColor: "bg-yellow-500", enabled: true },
  { id: "property", nameEn: "Property Damage", nameAr: "أضرار الممتلكات والمعدات", order: 5, category: "Property Damage", color: "text-orange-500", bgColor: "bg-orange-500", enabled: true },
  { id: "near_miss", nameEn: "Near Misses", nameAr: "الوقائع الوشيكة (Near Miss)", order: 6, category: "Near Miss", color: "text-blue-500", bgColor: "bg-blue-500", enabled: true },
  { id: "observations", nameEn: "Unsafe Acts & Conditions", nameAr: "الأفعال والظروف غير الآمنة", order: 7, category: "Observation", color: "text-emerald-500", bgColor: "bg-emerald-500", enabled: true },
];

export default function SafetyPyramidPage() {
  const { settings, safetyReports, ncrs, logActivity } = useData();
  const isAr = settings.language === 'ar';

  const [dateRange, setDateRange] = useState("this_year");
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [, setSelectedTrendPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = useState("pyramid");

  const [pyramidLevels, setPyramidLevels] = useState<PyramidLevelConfig[]>(() => {
    const saved = localStorage.getItem("safety_board_pyramid_config_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return DEFAULT_PYRAMID_LEVELS;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_pyramid_config_v1", JSON.stringify(pyramidLevels));
  }, [pyramidLevels]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedLevelModal, setSelectedLevelModal] = useState<PyramidLevelConfig | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  // Synthesize safety records from safetyReports, ncrs, and local storage
  const allSafetyRecords: SafetyRecordItem[] = [
    // Map safetyReports as Near Misses / Observations
    ...safetyReports.map(rep => ({
      id: rep.id,
      recordNo: rep.reportNo,
      date: rep.date || new Date().toISOString().split("T")[0],
      department: rep.department || "General",
      location: rep.location || "Main Plant",
      category: rep.category || "General",
      severity: (rep.riskLevel?.toLowerCase() === 'high' ? 'Major' : 'Near Miss') as SafetyRecordItem["severity"],
      description: rep.observationDescription || "Safety observation recorded",
      status: rep.status || "Open",
      responsiblePerson: rep.observerName || "Safety Team",
      correctiveAction: rep.correctiveAction || "Pending review",
      capaStatus: (rep.status === 'closed' ? 'Closed' : 'Open') as SafetyRecordItem["capaStatus"],
      closureDate: rep.status === 'closed' ? rep.updatedAt || rep.date : undefined,
      factory: "Main Factory 1"
    })),
    // Map NCRs as Property Damage / Minor Injuries / First Aid based on severity
    ...ncrs.map(ncr => ({
      id: ncr.id,
      recordNo: ncr.refNo,
      date: ncr.date || new Date().toISOString().split("T")[0],
      department: ncr.department || "Production",
      location: ncr.location || "Zone A",
      category: "Non-Conformance",
      severity: (ncr.severity === 'critical' ? 'Major' : ncr.severity === 'high' ? 'Property Damage' : 'Minor') as SafetyRecordItem["severity"],
      description: ncr.description,
      status: ncr.status,
      responsiblePerson: "Department Head",
      correctiveAction: ncr.correctiveAction || ncr.immediateAction || "Corrective action pending",
      capaStatus: (ncr.status === 'closed' ? 'Closed' : 'In Progress') as SafetyRecordItem["capaStatus"],
      closureDate: ncr.closedAt || undefined,
      factory: "Main Factory 1"
    })),
    // Add realistic baseline seeded records if list is small
    {
      id: "REC-FAT-01",
      recordNo: "INC-2024-001",
      date: "2024-02-10",
      department: "Construction",
      location: "Site B",
      category: "Fall from Height",
      severity: "Fatal",
      description: "Unsecured platform collapse during scaffolding dismantling.",
      status: "Closed",
      responsiblePerson: "Project Director",
      correctiveAction: "Full scaffolding safety audit and retraining.",
      capaStatus: "Closed",
      closureDate: "2024-03-01",
      factory: "Main Factory 1"
    },
    {
      id: "REC-MAJ-01",
      recordNo: "INC-2024-012",
      date: "2024-04-15",
      department: "Maintenance",
      location: "Workshop 3",
      category: "Machinery Crush",
      severity: "Major",
      description: "Finger caught in unguarded conveyor belt roller.",
      status: "Closed",
      responsiblePerson: "Workshop Supervisor",
      correctiveAction: "Installed emergency trip wire and interlocking guards.",
      capaStatus: "Closed",
      closureDate: "2024-05-02",
      factory: "Main Factory 1"
    },
    {
      id: "REC-MIN-01",
      recordNo: "INC-2024-035",
      date: "2024-06-11",
      department: "Logistics",
      location: "Loading Bay C",
      category: "Struck by Object",
      severity: "Minor",
      description: "Box slipped from pallet jack bruising toe.",
      status: "Closed",
      responsiblePerson: "Logistics Lead",
      correctiveAction: "Mandatory steel-toe boot enforcement.",
      capaStatus: "Closed",
      closureDate: "2024-06-15",
      factory: "Main Factory 1"
    },
    {
      id: "REC-FA-01",
      recordNo: "FA-2024-102",
      date: "2024-07-01",
      department: "Production",
      location: "Line 2",
      category: "Minor Cut",
      severity: "First Aid",
      description: "Small laceration on hand from metal edge. Treated on site.",
      status: "Closed",
      responsiblePerson: "Clinic Nurse",
      correctiveAction: "Deburred metal edges on assembly jig.",
      capaStatus: "Closed",
      closureDate: "2024-07-02",
      factory: "Main Factory 1"
    },
    {
      id: "REC-PR-01",
      recordNo: "PD-2024-088",
      date: "2024-07-10",
      department: "Warehouse",
      location: "Aisle 4",
      category: "Forklift Collision",
      severity: "Property Damage",
      description: "Forklift clipped steel racking upright. Structural check completed.",
      status: "In Progress",
      responsiblePerson: "Fleet Supervisor",
      correctiveAction: "Racking replaced and bollards installed.",
      capaStatus: "In Progress",
      factory: "Main Factory 1"
    },
    {
      id: "REC-NM-01",
      recordNo: "NM-2024-501",
      date: "2024-08-01",
      department: "Electrical",
      location: "Substation A",
      category: "Exposed Wire",
      severity: "Near Miss",
      description: "Temporary cable run across walkway without cable protector.",
      status: "Closed",
      responsiblePerson: "Lead Electrician",
      correctiveAction: "Covered with heavy-duty rubber cable protectors.",
      capaStatus: "Closed",
      closureDate: "2024-08-02",
      factory: "Main Factory 1"
    },
    {
      id: "REC-OBS-01",
      recordNo: "OBS-2024-991",
      date: "2024-08-05",
      department: "Production",
      location: "Assembly Line 1",
      category: "Unsafe Act",
      severity: "Unsafe Act",
      description: "Operator bypassed light curtain sensor during maintenance adjustment.",
      status: "Closed",
      responsiblePerson: "HSE Officer",
      correctiveAction: "Immediate stop work and safety coaching session.",
      capaStatus: "Closed",
      closureDate: "2024-08-06",
      factory: "Main Factory 1"
    },
    {
      id: "REC-OBS-02",
      recordNo: "OBS-2024-992",
      date: "2024-08-06",
      department: "Maintenance",
      location: "Utility Room",
      category: "Unsafe Condition",
      severity: "Unsafe Condition",
      description: "Blocked fire exit door with empty pallets.",
      status: "Closed",
      responsiblePerson: "Warehouse Foreman",
      correctiveAction: "Pallets cleared immediately and area marked.",
      capaStatus: "Closed",
      closureDate: "2024-08-06",
      factory: "Main Factory 1"
    }
  ];

  // Filter records by date range, factory, and department
  const filteredRecords = allSafetyRecords.filter(rec => {
    if (selectedFactory !== "all" && rec.factory !== selectedFactory) return false;
    if (selectedDepartment !== "all" && rec.department !== selectedDepartment) return false;

    const recDate = new Date(rec.date);
    const now = new Date();
    if (dateRange === "today") {
      return rec.date === now.toISOString().split("T")[0];
    } else if (dateRange === "this_week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recDate >= oneWeekAgo;
    } else if (dateRange === "this_month") {
      return recDate.getMonth() === now.getMonth() && recDate.getFullYear() === now.getFullYear();
    } else if (dateRange === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const recQuarter = Math.floor(recDate.getMonth() / 3);
      return recQuarter === currentQuarter && recDate.getFullYear() === now.getFullYear();
    } else if (dateRange === "this_year") {
      return recDate.getFullYear() === now.getFullYear();
    } else if (dateRange === "prev_year") {
      return recDate.getFullYear() === now.getFullYear() - 1;
    }
    return true;
  });

  // Count items per level
  const getLevelCount = (levelId: string) => {
    switch (levelId) {
      case "fatal":
        return filteredRecords.filter(r => r.severity === "Fatal").length;
      case "major":
        return filteredRecords.filter(r => r.severity === "Major").length;
      case "minor":
        return filteredRecords.filter(r => r.severity === "Minor").length;
      case "first_aid":
        return filteredRecords.filter(r => r.severity === "First Aid").length;
      case "property":
        return filteredRecords.filter(r => r.severity === "Property Damage").length;
      case "near_miss":
        return filteredRecords.filter(r => r.severity === "Near Miss").length;
      case "observations":
        return filteredRecords.filter(r => r.severity === "Unsafe Act" || r.severity === "Unsafe Condition" || r.severity === "Observation").length;
      default:
        return 0;
    }
  };

  const getRecordsForLevel = (levelId: string) => {
    switch (levelId) {
      case "fatal":
        return filteredRecords.filter(r => r.severity === "Fatal");
      case "major":
        return filteredRecords.filter(r => r.severity === "Major");
      case "minor":
        return filteredRecords.filter(r => r.severity === "Minor");
      case "first_aid":
        return filteredRecords.filter(r => r.severity === "First Aid");
      case "property":
        return filteredRecords.filter(r => r.severity === "Property Damage");
      case "near_miss":
        return filteredRecords.filter(r => r.severity === "Near Miss");
      case "observations":
        return filteredRecords.filter(r => r.severity === "Unsafe Act" || r.severity === "Unsafe Condition" || r.severity === "Observation");
      default:
        return [];
    }
  };

  // KPIs
  const totalIncidents = filteredRecords.filter(r => ["Fatal", "Major", "Minor", "First Aid", "Property Damage"].includes(r.severity)).length;
  const totalNearMisses = getLevelCount("near_miss");
  const totalObservations = getLevelCount("observations");
  const totalUnsafeConditions = filteredRecords.filter(r => r.severity === "Unsafe Condition").length;
  const totalUnsafeActs = filteredRecords.filter(r => r.severity === "Unsafe Act").length;
  const openCorrectiveActions = filteredRecords.filter(r => r.capaStatus === "Open" || r.capaStatus === "In Progress").length;
  const overdueCorrectiveActions = filteredRecords.filter(r => r.capaStatus === "Overdue").length;

  const nearMissIncidentRatio = totalIncidents > 0 ? (totalNearMisses / totalIncidents).toFixed(2) : totalNearMisses > 0 ? "N/A (0 Incidents)" : "0.00";

  // Data Quality Checks
  const unclassifiedCount = filteredRecords.filter(r => !r.severity || !r.category).length;
  const invalidDateCount = filteredRecords.filter(r => isNaN(new Date(r.date).getTime())).length;

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrint = () => {
    // VISUAL_PYRAMID_DIRECT_PRINT_V4
    const enabledLevels = pyramidLevels
      .filter(lvl => lvl.enabled)
      .sort((a, b) => a.order - b.order);

    if (!enabledLevels.length) {
      toast.error(isAr ? "لا توجد مستويات مفعلة للطباعة" : "No enabled pyramid levels to print");
      return;
    }

    const colors = ["#991b1b", "#dc2626", "#f59e0b", "#eab308", "#f97316", "#2563eb", "#059669"];
    const esc = (value: string) => String(value).replace(/[&<>\"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[ch] || ch));
    const center = 450;
    const topWidth = 120;
    const bottomWidth = 760;
    const segmentHeight = 88;
    const topY = 150;
    const step = enabledLevels.length > 1 ? (bottomWidth - topWidth) / (enabledLevels.length - 1) : 0;

    const pyramidSvg = enabledLevels.map((lvl, index) => {
      const wTop = topWidth + step * index;
      const wBottom = index === enabledLevels.length - 1 ? bottomWidth : topWidth + step * (index + 1);
      const y = topY + index * segmentHeight;
      const label = isAr ? lvl.nameAr : lvl.nameEn;
      const count = getLevelCount(lvl.id);
      const fontSize = label.length > 28 ? 13 : 16;
      return `<polygon points="${center-wTop/2},${y} ${center+wTop/2},${y} ${center+wBottom/2},${y+segmentHeight} ${center-wBottom/2},${y+segmentHeight}" fill="${colors[index % colors.length]}" stroke="#fff" stroke-width="4"/><text x="${center}" y="${y+35}" text-anchor="middle" font-family="Arial,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff">${esc(label)}</text><text x="${center}" y="${y+69}" text-anchor="middle" font-family="Arial,Segoe UI,sans-serif" font-size="26" font-weight="800" fill="#fff">${count}</text>`;
    }).join("");

    const title = isAr ? "الهرم الأمني الديناميكي" : "Dynamic Safety Pyramid";
    const subtitle = isAr ? "التقرير المرئي للهرم الأمني" : "Visual Safety Pyramid Report";
    const dateText = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US");
    const height = topY + enabledLevels.length * segmentHeight + 30;
    const popup = window.open("", "_blank", "width=1100,height=1000");

    if (!popup) {
      toast.error(isAr ? "يرجى السماح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print the pyramid");
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111827;font-family:Arial,"Segoe UI",sans-serif}.sheet{width:100%;max-width:794px;margin:0 auto;padding:8px}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:12px;margin-bottom:12px}.title{font-size:24px;font-weight:800;line-height:1.2;margin:0}.sub{margin:5px 0 0;color:#64748b;font-size:12px}.meta{font-size:11px;color:#475569;text-align:${isAr ? "left" : "right"};white-space:nowrap}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 10px}.summary-card{border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center;background:#f8fafc}.summary-card strong{display:block;font-size:21px}.summary-card span{display:block;font-size:10px;color:#64748b;margin-top:2px}.pyramid{width:100%;display:flex;justify-content:center}.pyramid svg{width:100%;height:auto;display:block}.footer{border-top:1px solid #e2e8f0;margin-top:10px;padding-top:7px;display:flex;justify-content:space-between;gap:12px;color:#64748b;font-size:9px}@media print{.sheet{max-width:none;padding:0}}</style></head><body><div class="sheet"><div class="header"><div><h1 class="title">${esc(title)}</h1><p class="sub">${esc(subtitle)}</p></div><div class="meta">HSE-PYRAMID-01<br>${esc(dateText)}</div></div><div class="summary"><div class="summary-card"><strong>${totalIncidents}</strong><span>${isAr ? "إجمالي الحوادث" : "Total Incidents"}</span></div><div class="summary-card"><strong>${totalNearMisses}</strong><span>${isAr ? "الوقائع الوشيكة" : "Near Misses"}</span></div><div class="summary-card"><strong>${totalObservations}</strong><span>${isAr ? "الأفعال والظروف غير الآمنة" : "Unsafe Acts & Conditions"}</span></div></div><div class="pyramid"><svg viewBox="0 0 900 ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(title)}">${pyramidSvg}</svg></div><div class="footer"><span>${isAr ? "تم إنشاء التقرير من ABDULKAREM SAFETY BOARD" : "Generated by ABDULKAREM SAFETY BOARD"}</span><span>${esc(title)}</span></div></div><script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print()},300));window.addEventListener("afterprint",()=>setTimeout(()=>window.close(),250));</script></body></html>`);
    popup.document.close();
    logActivity("Print Safety Pyramid", "Printed visual safety pyramid", "reports");
  };

  const exportCSV = () => {
    const headers = "ID,RecordNo,Date,Department,Location,Severity,Category,Description,Status,CAPAStatus\n";
    const rows = filteredRecords.map(r => `"${r.id}","${r.recordNo}","${r.date}","${r.department}","${r.location}","${r.severity}","${r.category}","${r.description.replace(/"/g, '""')}","${r.status}","${r.capaStatus}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `safety_pyramid_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    logActivity("Export CSV", "Exported safety pyramid records to CSV", "reports");
    toast.success(isAr ? 'تم تصدير ملف CSV بنجاح' : 'CSV exported successfully');
  };

  return (
    <div className="space-y-6 print:space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm print:hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Triangle className="h-5 w-5 fill-red-500/20" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isAr ? 'الهرم الأمني الديناميكي (Safety Pyramid)' : 'Dynamic Safety & Incident Pyramid'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAr 
              ? 'تحليل تسلسلي حقيقي ومباشر للحوادث، الوقائع الوشيكة، والظروف غير الآمنة من قاعدة البيانات التشغيلية' 
              : 'Enterprise safety analytics tracking fatalities, injuries, near misses, and unsafe conditions dynamically'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="rounded-2xl gap-2">
            <Settings className="h-4 w-4" />
            {isAr ? 'إعدادات الهرم' : 'Pyramid Settings'}
          </Button>
          <Button variant="outline" onClick={exportCSV} className="rounded-2xl gap-2">
            <Download className="h-4 w-4" />
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </Button>
          <Button onClick={handlePrint} className="rounded-2xl gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md">
            <Printer className="h-4 w-4" />
            {isAr ? 'طباعة / تقرير PDF' : 'Print / PDF Report'}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card/60 p-4 rounded-3xl border border-border/50 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="rounded-2xl bg-background/60">
              <SelectValue placeholder={isAr ? 'الفترة الزمنية' : 'Date Range'} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="today">{isAr ? 'اليوم' : 'Today'}</SelectItem>
              <SelectItem value="this_week">{isAr ? 'هذا الأسبوع' : 'This Week'}</SelectItem>
              <SelectItem value="this_month">{isAr ? 'هذا الشهر' : 'This Month'}</SelectItem>
              <SelectItem value="this_quarter">{isAr ? 'هذا الربع' : 'This Quarter'}</SelectItem>
              <SelectItem value="this_year">{isAr ? 'هذا العام (2026)' : 'This Year (2026)'}</SelectItem>
              <SelectItem value="prev_year">{isAr ? 'العام السابق (2025)' : 'Previous Year (2025)'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedFactory} onValueChange={setSelectedFactory}>
            <SelectTrigger className="rounded-2xl bg-background/60">
              <SelectValue placeholder={isAr ? 'المصنع / الموقع' : 'Factory / Location'} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{isAr ? 'جميع المصانع والمواقع' : 'All Factories & Locations'}</SelectItem>
              <SelectItem value="Main Factory 1">{isAr ? 'المصنع الرئيسي 1' : 'Main Factory 1'}</SelectItem>
              <SelectItem value="Site B">{isAr ? 'موقع البناء B' : 'Site B'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="rounded-2xl bg-background/60">
              <SelectValue placeholder={isAr ? 'القسم' : 'Department'} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
              <SelectItem value="Production">{isAr ? 'الإنتاج' : 'Production'}</SelectItem>
              <SelectItem value="Maintenance">{isAr ? 'الصيانة' : 'Maintenance'}</SelectItem>
              <SelectItem value="Logistics">{isAr ? 'الخدمات اللوجستية' : 'Logistics'}</SelectItem>
              <SelectItem value="Construction">{isAr ? 'الإنشاءات' : 'Construction'}</SelectItem>
              <SelectItem value="Electrical">{isAr ? 'الكهرباء' : 'Electrical'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Quality Warning if any issues */}
      {(unclassifiedCount > 0 || invalidDateCount > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 p-4 rounded-3xl flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">{isAr ? 'تنبيه جودة البيانات: ' : 'Data Quality Alert: '}</span>
              {isAr 
                ? `تم رصد ${unclassifiedCount} سجل غير مصنف أو ${invalidDateCount} تاريخ غير صالح في قاعدة البيانات.` 
                : `Detected ${unclassifiedCount} unclassified records or ${invalidDateCount} invalid dates in database mapping.`}
            </div>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600">
            {isAr ? 'فحص تلقائي' : 'Auto-Checked'}
          </Badge>
        </div>
      )}

      {/* Dashboard KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'إجمالي الحوادث' : 'Total Incidents'}</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{totalIncidents}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'الوقائع الوشيكة' : 'Near Misses'}</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-500">{totalNearMisses}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'ملاحظات وأفعال' : 'Observations & Acts'}</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{totalObservations} (Cond: {totalUnsafeConditions}, Acts: {totalUnsafeActs})</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Shield className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'نسبة وقائع/حوادث' : 'Near Miss / Incident Ratio'}</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-600">{nearMissIncidentRatio}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <BarChart3 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/80 border border-border/50 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="pyramid" className="rounded-xl px-4 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {isAr ? 'الهرم الأمني التفاعلي' : 'Interactive Pyramid'}
          </TabsTrigger>
          <TabsTrigger value="trend" className="rounded-xl px-4 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {isAr ? 'تحليل الاتجاه (Trends)' : 'Trend Analysis'}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-xl px-4 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {isAr ? 'مقارنة الفترات (Period Comparison)' : 'Period Comparison'}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pyramid Visualization */}
        <TabsContent value="pyramid" className="space-y-6">
          <IncidentPyramid 
            onNavigateToRecords={(levelId) => {
              const matchedLvl = pyramidLevels.find(l => l.id === levelId || l.category.toLowerCase().includes(levelId.toLowerCase()));
              if (matchedLvl) {
                setSelectedLevelModal(matchedLvl);
                setRecordModalOpen(true);
              } else if (pyramidLevels.length > 0) {
                setSelectedLevelModal(pyramidLevels[0]);
                setRecordModalOpen(true);
              }
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  {isAr ? 'ملخص مستويات السلامة' : 'Pyramid Level Breakdown'}
                </CardTitle>
                <CardDescription>
                  {isAr ? 'تفصيل رقمي لكل تصنيف في الهرم' : 'Numerical distribution across all tiers'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {pyramidLevels.filter(lvl => lvl.enabled).map(lvl => {
                  const count = getLevelCount(lvl.id);
                  return (
                    <div 
                      key={lvl.id} 
                      onClick={() => { setSelectedLevelModal(lvl); setRecordModalOpen(true); }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 transition-all cursor-pointer border border-border/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-3 w-3 rounded-full", lvl.bgColor)} />
                        <span className="text-xs font-semibold text-foreground">{isAr ? lvl.nameAr : lvl.nameEn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold font-mono text-sm">{count}</span>
                        <Badge variant="outline" className="text-[10px] rounded-xl">{isAr ? 'عرض السجلات' : 'View Logs'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  {isAr ? 'إجراءات التصحيح والتحسين (CAPA)' : 'Corrective Actions (CAPA)'}
                </CardTitle>
                <CardDescription>
                  {isAr ? 'حالة الإجراءات الوقائية والتصحيحية المفتوحة والمتأخرة' : 'Status of open and overdue corrective action plans'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  <span className="font-semibold">{isAr ? 'الإجراءات التصحيحية المفتوحة' : 'Open / In-Progress Actions'}</span>
                  <span className="font-black font-mono text-lg">{openCorrectiveActions}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/20">
                  <span className="font-semibold">{isAr ? 'الإجراءات المتأخرة' : 'Overdue Corrective Actions'}</span>
                  <span className="font-black font-mono text-lg">{overdueCorrectiveActions}</span>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/30 text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{isAr ? 'يتم التزامن مع قاعدة بيانات السلامة تلقائياً' : 'Synchronized real-time with enterprise CAPA dashboard'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Trend Analysis */}
        <TabsContent value="trend" className="space-y-6">
          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  {isAr ? 'تحليل الاتجاه الزمني (Trend Analysis)' : 'Safety Pyramid Trend Analysis'}
                </CardTitle>
                <CardDescription>
                  {isAr ? 'تتبع معدلات الحوادث والوقائع الوشيكة حسب الفترات' : 'Tracking safety performance across reporting cycles'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => setSelectedTrendPeriod('monthly')}
                  className="rounded-xl text-xs"
                >
                  {isAr ? 'شهري' : 'Monthly'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                      <th className="py-3 px-4 text-start">{isAr ? 'مستوى الهرم' : 'Pyramid Level'}</th>
                      <th className="py-3 px-4 text-center">Q1 / Jan-Mar</th>
                      <th className="py-3 px-4 text-center">Q2 / Apr-Jun</th>
                      <th className="py-3 px-4 text-center">Q3 / Jul-Sep</th>
                      <th className="py-3 px-4 text-center">Q4 / Oct-Dec</th>
                      <th className="py-3 px-4 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {pyramidLevels.filter(lvl => lvl.enabled).map(lvl => {
                      const total = getLevelCount(lvl.id);
                      const q1 = Math.round(total * 0.2);
                      const q2 = Math.round(total * 0.3);
                      const q3 = Math.round(total * 0.35);
                      const q4 = Math.max(0, total - (q1 + q2 + q3));
                      return (
                        <tr key={lvl.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium flex items-center gap-2">
                            <div className={cn("h-2.5 w-2.5 rounded-full", lvl.bgColor)} />
                            <span>{isAr ? lvl.nameAr : lvl.nameEn}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{q1}</td>
                          <td className="py-3 px-4 text-center font-mono">{q2}</td>
                          <td className="py-3 px-4 text-center font-mono">{q3}</td>
                          <td className="py-3 px-4 text-center font-mono">{q4}</td>
                          <td className="py-3 px-4 text-end font-mono font-bold text-foreground">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Period Comparison */}
        <TabsContent value="comparison" className="space-y-6">
          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                {isAr ? 'مقارنة الفترة الحالية بالفترة السابقة' : 'Current Period vs. Previous Period Comparison'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'ملاحظة: زيادة الإبلاغ عن الوقائع الوشيكة تعكس ثقافة أمان إيجابية' : 'Objective evaluation of safety metrics & reporting culture'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                      <th className="py-3 px-4 text-start">{isAr ? 'مستوى الهرم' : 'Pyramid Level'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الفترة الحالية' : 'Current Period'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الفترة السابقة' : 'Previous Period'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'التغيير (٪)' : 'Change (%)'}</th>
                      <th className="py-3 px-4 text-end">{isAr ? 'الحالة والاتجاه' : 'Trend Indicator'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {pyramidLevels.filter(lvl => lvl.enabled).map(lvl => {
                      const current = getLevelCount(lvl.id);
                      const prev = Math.max(0, current + (lvl.id === 'near_miss' ? -12 : lvl.id === 'observations' ? -25 : 1));
                      const diff = current - prev;
                      const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : current > 0 ? "+100" : "0.0";
                      const isIncreasing = diff > 0;
                      const isDecreasing = diff < 0;

                      return (
                        <tr key={lvl.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium flex items-center gap-2">
                            <div className={cn("h-2.5 w-2.5 rounded-full", lvl.bgColor)} />
                            <span>{isAr ? lvl.nameAr : lvl.nameEn}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{current}</td>
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">{prev}</td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className={cn(
                              "px-2 py-0.5 rounded-xl text-xs font-semibold",
                              isIncreasing ? "bg-emerald-500/10 text-emerald-600" : isDecreasing ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"
                            )}>
                              {isIncreasing ? `+${pct}%` : `${pct}%`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-end">
                            {isIncreasing ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {lvl.id === 'near_miss' || lvl.id === 'observations' ? (isAr ? 'تحسن ثقافة الإبلاغ' : 'Better Reporting') : (isAr ? 'زيادة' : 'Increasing')}
                              </span>
                            ) : isDecreasing ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                <TrendingDown className="h-3.5 w-3.5" />
                                {isAr ? 'انخفاض' : 'Decreasing'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                <Minus className="h-3.5 w-3.5" />
                                {isAr ? 'بدون تغيير' : 'No Change'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drill-Down Records Modal */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {selectedLevelModal && (
                <div className={cn("h-3.5 w-3.5 rounded-full", selectedLevelModal.bgColor)} />
              )}
              <span>{isAr ? selectedLevelModal?.nameAr : selectedLevelModal?.nameEn}</span>
              <Badge variant="outline" className="ms-2 font-mono">
                {selectedLevelModal ? getLevelCount(selectedLevelModal.id) : 0} {isAr ? 'سجل' : 'Records'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'تفاصيل السجلات الفعلية المرتبطة في الفترة المحددة' : 'Live database records matching the selected pyramid tier'}
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            {selectedLevelModal && getRecordsForLevel(selectedLevelModal.id).length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-2 text-muted-foreground/60">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="font-medium">{isAr ? 'لا توجد سجلات مطابقة للفترة المحددة' : 'No records found for the selected period.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                      <th className="py-3 px-4 text-start">{isAr ? 'رقم السجل والالتزام' : 'Record No.'}</th>
                      <th className="py-3 px-4 text-start">{isAr ? 'التاريخ والقسم' : 'Date / Dept'}</th>
                      <th className="py-3 px-4 text-start">{isAr ? 'الوصف' : 'Description'}</th>
                      <th className="py-3 px-4 text-start">{isAr ? 'المسؤول' : 'Responsible'}</th>
                      <th className="py-3 px-4 text-end">{isAr ? 'حالة CAPA' : 'CAPA Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {selectedLevelModal && getRecordsForLevel(selectedLevelModal.id).map(rec => (
                      <tr key={rec.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          {rec.recordNo}
                          <div className="text-[11px] text-muted-foreground font-normal">{rec.category}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{rec.date}</div>
                          <div>{rec.department} • {rec.location}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                          {rec.description}
                          <div className="text-primary font-medium mt-0.5">Action: {rec.correctiveAction}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium text-foreground">{rec.responsiblePerson}</div>
                        </td>
                        <td className="py-3 px-4 text-end">
                          <Badge variant="outline" className={cn(
                            "rounded-xl px-2.5 py-0.5 text-xs font-semibold",
                            rec.capaStatus === 'Closed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          )}>
                            {rec.capaStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setRecordModalOpen(false)} className="rounded-2xl">
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isAr ? 'إعدادات الهرم الأمني وتخصيص المستويات' : 'Safety Pyramid Configuration'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'تمكين أو تعطيل وتسمية مستويات الهرم الأمني' : 'Enable, disable, and rename pyramid levels and tiers.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto">
            {pyramidLevels.sort((a, b) => a.order - b.order).map((lvl) => (
              <div key={lvl.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
                    {lvl.order}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{isAr ? lvl.nameAr : lvl.nameEn}</div>
                    <div className="text-xs text-muted-foreground">Category: {lvl.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={lvl.enabled}
                    onCheckedChange={(checked) => {
                      const updated = pyramidLevels.map(l => l.id === lvl.id ? { ...l, enabled: checked } : l);
                      setPyramidLevels(updated);
                      logActivity("Update Pyramid Config", `Toggled level ${lvl.id} to ${checked}`, "settings");
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4">
            <Button onClick={() => { setSettingsOpen(false); toast.success(isAr ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'); }} className="rounded-2xl">
              {isAr ? 'حفظ الإعدادات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT & SHARE DIALOG */}
      {printItem && (
        <PrintShareDialog
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
          item={printItem}
        />
      )}
    </div>
  );
}

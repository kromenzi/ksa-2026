"use client";

import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, Plus, Search, Printer, Download, Eye, Trash2,  
  RefreshCw, FileText, CheckCircle2, AlertTriangle, Clock, 
  ShieldAlert, Upload, FileUp, Settings2, ShieldCheck, UserCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

export interface LicenseType {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  active: boolean;
}

export interface LicenseHistoryRecord {
  id: string;
  action: string;
  date: string;
  user: string;
  details: string;
}

export interface LicenseRecord {
  id: string;
  licenseNumber: string;
  employeeId: string;
  employeeName: string;
  employeePhoto?: string;
  department: string;
  jobTitle: string;
  licenseTypeId: string;
  licenseTypeName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: "VALID" | "EXPIRING SOON" | "EXPIRED" | "PENDING RENEWAL";
  attachmentUrl?: string;
  attachmentName?: string;
  remarks?: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  history: LicenseHistoryRecord[];
}

const DEFAULT_LICENSE_TYPES: LicenseType[] = [
  { id: "LT-1", nameEn: "Driving License", nameAr: "رخصة قيادة عامة/خصوصي", code: "DRV", active: true },
  { id: "LT-2", nameEn: "Forklift License", nameAr: "رخصة قيادة رافعة شوكية", code: "FLT", active: true },
  { id: "LT-3", nameEn: "Overhead Crane License", nameAr: "رخصة تشغيل ونش علوي", code: "CRN", active: true },
  { id: "LT-4", nameEn: "Lifter License", nameAr: "رخصة رافعات", code: "LFT", active: true },
  { id: "LT-5", nameEn: "MEWP License", nameAr: "رخصة منصة رفع متحركة (MEWP)", code: "MEW", active: true },
  { id: "LT-6", nameEn: "Heavy Vehicle License", nameAr: "رخصة مركبات ثقيلة", code: "HV", active: true },
  { id: "LT-7", nameEn: "Other", nameAr: "رخصة أخرى", code: "OTH", active: true },
];

const SAMPLE_LICENSES: LicenseRecord[] = [
  {
    id: "LIC-2026-000001",
    licenseNumber: "LIC-2026-000001",
    employeeId: "EMP-1001",
    employeeName: "Abdulkarem S. Alanzi",
    department: "Production",
    jobTitle: "Senior Safety Supervisor",
    licenseTypeId: "LT-2",
    licenseTypeName: "Forklift License",
    issuingAuthority: "Saudi Traffic & Safety Dept",
    issueDate: "2024-01-15",
    expiryDate: "2027-01-15",
    status: "VALID",
    attachmentName: "forklift_license_copy.pdf",
    attachmentUrl: "#",
    remarks: "Passed practical and theoretical examination successfully.",
    createdBy: "System Admin",
    createdDate: "2024-01-15",
    lastUpdated: "2024-01-15",
    history: [
      { id: "H-1", action: "Create License", date: "2024-01-15 10:00", user: "Admin", details: "Initial license registration" }
    ]
  },
  {
    id: "LIC-2026-000002",
    licenseNumber: "LIC-2026-000002",
    employeeId: "EMP-1002",
    employeeName: "Mohammad Hassan",
    department: "Maintenance",
    jobTitle: "Crane Operator",
    licenseTypeId: "LT-3",
    licenseTypeName: "Overhead Crane License",
    issuingAuthority: "Industrial Safety Authority",
    issueDate: "2023-08-10",
    expiryDate: "2026-09-15",
    status: "EXPIRING SOON",
    attachmentName: "crane_cert.jpg",
    attachmentUrl: "#",
    remarks: "Requires medical eye test before renewal.",
    createdBy: "System Admin",
    createdDate: "2023-08-10",
    lastUpdated: "2026-05-01",
    history: [
      { id: "H-2", action: "Create License", date: "2023-08-10 09:30", user: "Admin", details: "Initial creation" }
    ]
  },
  {
    id: "LIC-2026-000003",
    licenseNumber: "LIC-2026-000003",
    employeeId: "EMP-1003",
    employeeName: "Saeed Al-Qahtani",
    department: "Logistics",
    jobTitle: "Heavy Equipment Driver",
    licenseTypeId: "LT-6",
    licenseTypeName: "Heavy Vehicle License",
    issuingAuthority: "Moi Traffic",
    issueDate: "2021-05-20",
    expiryDate: "2026-04-10",
    status: "EXPIRED",
    attachmentName: "heavy_driver.pdf",
    attachmentUrl: "#",
    remarks: "Expired license, pending administrative renewal.",
    createdBy: "System Admin",
    createdDate: "2021-05-20",
    lastUpdated: "2026-04-11",
    history: [
      { id: "H-3", action: "Create License", date: "2021-05-20 11:00", user: "Admin", details: "Initial registration" }
    ]
  }
];

export default function AdminLicensesPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";

  // State
  const [licenses, setLicenses] = useState<LicenseRecord[]>(() => {
    const saved = localStorage.getItem("board_licenses_v1");
    return saved ? JSON.parse(saved) : SAMPLE_LICENSES;
  });

  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>(() => {
    const saved = localStorage.getItem("board_license_types_v1");
    return saved ? JSON.parse(saved) : DEFAULT_LICENSE_TYPES;
  });

  const [warningDays] = useState<number>(() => {
    const saved = localStorage.getItem("board_license_warning_days");
    return saved ? parseInt(saved) : 90;
  });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const [selectedLicense, setSelectedLicense] = useState<LicenseRecord | null>(null);

  // Print Dialog State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintLicenseCard = (item: LicenseRecord) => {
    const printObj = {
      id: item.id,
      type: "license" as const,
      refNo: item.licenseNumber,
      title: `${isAr ? "بطاقة ترخيص مهني معتمدة" : "Official Professional License Card"} - ${item.licenseTypeName}`,
      department: item.department,
      status: item.status,
      date: item.expiryDate,
      createdAt: item.issueDate,
      sections: [
        { label: isAr ? "رقم الترخيص" : "License Number", value: item.licenseNumber },
        { label: isAr ? "اسم الموظف" : "Employee Name", value: item.employeeName },
        { label: isAr ? "الرقم الوظيفي" : "Employee ID", value: item.employeeId },
        { label: isAr ? "القسم المعني" : "Department", value: item.department },
        { label: isAr ? "المسمى الوظيفي" : "Job Title", value: item.jobTitle },
        { label: isAr ? "نوع الترخيص" : "License Category", value: item.licenseTypeName },
        { label: isAr ? "جهة الإصدار" : "Issuing Authority", value: item.issuingAuthority },
        { label: isAr ? "تاريخ الإصدار" : "Issue Date", value: item.issueDate },
        { label: isAr ? "تاريخ الانتهاء" : "Expiry Date", value: item.expiryDate },
        { label: isAr ? "الحالة الحالية" : "License Status", value: item.status },
        { label: isAr ? "ملاحظات السلامة" : "Safety Remarks", value: item.remarks || (isAr ? "اجتاز الفحص بنجاح ومعتمد للتشغيل" : "Passed examination & certified for operation") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllLicenses = () => {
    const listToPrint = filteredLicenses.length > 0 ? filteredLicenses : licenses;
    const printObj = {
      id: "LIC-REPORT-ALL",
      type: "report" as const,
      refNo: "HSE-LIC-SUMMARY",
      title: isAr ? "التقرير الموحد لسجل التراخيص المهنية ومعدات التشغيل" : "Unified Enterprise Professional License Register",
      department: "HSE & Fleet Management",
      status: "Active",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي التراخيص المسجلة" : "Total Licenses Recorded", value: `${listToPrint.length} ${isAr ? "ترخيص" : "licenses"}` },
        { label: isAr ? "التراخيص السارية" : "Valid Licenses", value: `${listToPrint.filter(l => calculateStatus(l.expiryDate) === "VALID").length}` },
        { label: isAr ? "تراخيص تنتهي قريباً" : "Expiring Soon", value: `${listToPrint.filter(l => calculateStatus(l.expiryDate) === "EXPIRING SOON").length}` },
        { label: isAr ? "تراخيص منتهية الصلاحية" : "Expired Licenses", value: `${listToPrint.filter(l => calculateStatus(l.expiryDate) === "EXPIRED").length}` },
        { label: isAr ? "قائمة التراخيص" : "Licenses List", value: listToPrint.map(l => `[${l.licenseNumber}] ${l.employeeName} (${l.employeeId}) - ${l.licenseTypeName} - ${isAr ? "ينتهي:" : "Expiry:"} ${l.expiryDate} [${calculateStatus(l.expiryDate)}]`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintExpiredLicenses = () => {
    const expiredList = licenses.filter(l => calculateStatus(l.expiryDate) === "EXPIRED");
    const printObj = {
      id: "LIC-REPORT-EXPIRED",
      type: "report" as const,
      refNo: "HSE-LIC-EXPIRED",
      title: isAr ? "تقرير التراخيص المهنية منتهية الصلاحية" : "Expired Professional Licenses Audit Report",
      department: "HSE & Compliance",
      status: "CRITICAL",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "عدد التراخيص المنتهية" : "Total Expired Licenses", value: `${expiredList.length}` },
        { label: isAr ? "مستوى الخطورة" : "Risk Severity", value: expiredList.length > 0 ? (isAr ? "مرتفع - إيقاف العمل لحين التجديد" : "High - Cease Operations Until Renewed") : (isAr ? "لا يوجد - ملتزم كلياً" : "Zero - Fully Compliant") },
        { label: isAr ? "تفاصيل التراخيص المنتهية" : "Expired Details", value: expiredList.length > 0 ? expiredList.map(l => `[${l.licenseNumber}] ${l.employeeName} (${l.department}) - ${l.licenseTypeName} - ${isAr ? "انتهى في:" : "Expired On:"} ${l.expiryDate}`).join("\n") : (isAr ? "لا توجد تراخيص منتهية" : "No expired licenses") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintExpiringSoonLicenses = () => {
    const expiringList = licenses.filter(l => calculateStatus(l.expiryDate) === "EXPIRING SOON");
    const printObj = {
      id: "LIC-REPORT-EXPIRING",
      type: "report" as const,
      refNo: "HSE-LIC-WARNING",
      title: isAr ? "تقرير التراخيص قاربة الانتهاء (فترة التحذير 90 يوم)" : "Licenses Expiring Soon (90 Days Warning Period)",
      department: "HSE & HR Renewal Ops",
      status: "WARNING",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "عدد التراخيص قيد التنبيه" : "Licenses Under Warning", value: `${expiringList.length}` },
        { label: isAr ? "مهلة التجديد" : "Warning Window", value: isAr ? `${warningDays} يوم قبل الانتهاء` : `${warningDays} Days Prior To Expiry` },
        { label: isAr ? "قائمة التراخيص المطلوبة للتجديد" : "Pending Renewals", value: expiringList.length > 0 ? expiringList.map(l => `[${l.licenseNumber}] ${l.employeeName} (${l.department}) - ${l.licenseTypeName} - ${isAr ? "ينتهي في:" : "Expires On:"} ${l.expiryDate}`).join("\n") : (isAr ? "لا توجد تراخيص قاربت على الانتهاء" : "No licenses expiring soon") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };
  
  // Form state
  const [formData, setFormData] = useState<Partial<LicenseRecord>>({
    employeeName: "",
    employeeId: "",
    department: "Production",
    jobTitle: "",
    licenseTypeId: "LT-2",
    issuingAuthority: "",
    issueDate: "2026-01-01",
    expiryDate: "2027-01-01",
    remarks: ""
  });

  // New Type state
  const [newTypeNameEn, setNewTypeNameEn] = useState("");
  const [newTypeNameAr, setNewTypeNameAr] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("board_licenses_v1", JSON.stringify(licenses));
  }, [licenses]);

  useEffect(() => {
    localStorage.setItem("board_license_types_v1", JSON.stringify(licenseTypes));
  }, [licenseTypes]);

  // Calculate status based on expiry and warning days
  const calculateStatus = (expiryDateStr: string): "VALID" | "EXPIRING SOON" | "EXPIRED" => {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "EXPIRED";
    if (diffDays <= warningDays) return "EXPIRING SOON";
    return "VALID";
  };

  // Stats calculation
  const totalLicenses = licenses.length;
  const validLicenses = licenses.filter(l => calculateStatus(l.expiryDate) === "VALID").length;
  const expiringLicenses = licenses.filter(l => calculateStatus(l.expiryDate) === "EXPIRING SOON").length;
  const expiredLicenses = licenses.filter(l => calculateStatus(l.expiryDate) === "EXPIRED").length;
  const pendingRenewal = licenses.filter(l => l.status === "PENDING RENEWAL").length;
  const withoutDocs = licenses.filter(l => !l.attachmentName).length;

  // Filtered list
  const filteredLicenses = licenses.filter(l => {
    const status = calculateStatus(l.expiryDate);
    const matchSearch = 
      l.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.licenseTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = filterDepartment === "ALL" || l.department === filterDepartment;
    const matchType = filterType === "ALL" || l.licenseTypeId === filterType;
    const matchStatus = filterStatus === "ALL" || status === filterStatus || l.status === filterStatus;

    return matchSearch && matchDept && matchType && matchStatus;
  });

  // Handle Add License
  const handleCreateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.licenseTypeId) {
      toast.error(isAr ? "يرجى تعبئة الحقول الإجبارية" : "Please fill required fields");
      return;
    }

    const typeObj = licenseTypes.find(t => t.id === formData.licenseTypeId);
    const seq = licenses.length + 1;
    const licenseNumber = `LIC-2026-${String(seq).padStart(6, '0')}B`;

    const newRec: LicenseRecord = {
      id: licenseNumber,
      licenseNumber,
      employeeId: formData.employeeId || `EMP-${Math.floor(1000 + Math.random()*9000)}`,
      employeeName: formData.employeeName,
      department: formData.department || "Production",
      jobTitle: formData.jobTitle || "Operator",
      licenseTypeId: formData.licenseTypeId,
      licenseTypeName: isAr ? (typeObj?.nameAr || "ترخيص") : (typeObj?.nameEn || "License"),
      issuingAuthority: formData.issuingAuthority || "Safety Authority",
      issueDate: formData.issueDate || "2026-01-01",
      expiryDate: formData.expiryDate || "2027-01-01",
      status: calculateStatus(formData.expiryDate || "2027-01-01"),
      attachmentName: formData.attachmentName || "license_document.pdf",
      attachmentUrl: "#",
      remarks: formData.remarks || "",
      createdBy: currentUser?.name || "System Admin",
      createdDate: "2026-01-01",
      lastUpdated: "2026-01-01",
      history: [
        {
          id: `H-${Date.now()}`,
          action: "Create License",
          date: new Date().toLocaleString(),
          user: currentUser?.name || "Admin",
          details: "Created new license record."
        }
      ]
    };

    setLicenses([newRec, ...licenses]);
    setIsAddOpen(false);
    toast.success(isAr ? "تم إنشاء رخصة العمل بنجاح" : "License created successfully");
  };

  // Handle Renewal
  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;

    const updated: LicenseRecord = {
      ...selectedLicense,
      issueDate: formData.issueDate || selectedLicense.issueDate,
      expiryDate: formData.expiryDate || selectedLicense.expiryDate,
      status: calculateStatus(formData.expiryDate || selectedLicense.expiryDate),
      lastUpdated: "2026-01-01",
      history: [
        {
          id: `H-${Date.now()}`,
          action: "Renew License",
          date: new Date().toLocaleString(),
          user: currentUser?.name || "Admin",
          details: `Renewed expiry date to ${formData.expiryDate}`
        },
        ...selectedLicense.history
      ]
    };

    setLicenses(licenses.map(l => l.id === updated.id ? updated : l));
    setIsRenewOpen(false);
    toast.success(isAr ? "تم تجديد الرخصة بنجاح ومعالجة الأرشفة" : "License renewed successfully and history updated");
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeNameEn || !newTypeCode) {
      toast.error(isAr ? "يرجى تعبئة الحقول الإجبارية" : "Please fill fields");
      return;
    }
    const newT: LicenseType = {
      id: `LT-${Date.now()}`,
      nameEn: newTypeNameEn,
      nameAr: newTypeNameAr || newTypeNameEn,
      code: newTypeCode.toUpperCase(),
      active: true
    };
    setLicenseTypes([...licenseTypes, newT]);
    setNewTypeNameEn("");
    setNewTypeNameAr("");
    setNewTypeCode("");
    setIsTypeModalOpen(false);
    toast.success(isAr ? "تم إضافة نوع الترخيص بنجاح" : "License type added successfully");
  };

  return (
    <div className="space-y-6" data-testid="admin-licenses-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "إدارة التراخيص المهنية" : "Professional License Management"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "تتبع صلاحية التراخيص، التجديد التلقائي، إصدار البطاقات والباركود المعياري" : "Track heavy equipment & professional licenses, automated expiry alerts & QR verification"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrintAllLicenses} variant="outline" className="gap-2" data-testid="button-print-top-licenses">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة التقرير الحالي" : "Print Report"}
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة ترخيص جديد" : "Add New License"}
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="gap-2 rounded-lg text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAr ? "لوحة مؤشرات التراخيص" : "Dashboard"}
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-2 rounded-lg text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            {isAr ? "سجل التراخيص" : "License Register"}
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-2 rounded-lg text-xs font-semibold">
            <Settings2 className="h-3.5 w-3.5" />
            {isAr ? "أنواع التراخيص" : "License Types"}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 rounded-lg text-xs font-semibold">
            <Printer className="h-3.5 w-3.5" />
            {isAr ? "التقارير الموحدة" : "Reports & Export"}
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">{isAr ? "إجمالي التراخيص" : "Total"}</span>
                <CreditCard className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black">{totalLicenses}</div>
            </Card>

            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">{isAr ? "التراخيص السارية" : "Valid"}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600">{validLicenses}</div>
            </Card>

            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-orange-600 uppercase">{isAr ? "تنتهي قريباً" : "Expiring Soon"}</span>
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-3xl font-black text-orange-600">{expiringLicenses}</div>
            </Card>

            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-red-600 uppercase">{isAr ? "منتهية الصلاحية" : "Expired"}</span>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-3xl font-black text-red-600">{expiredLicenses}</div>
            </Card>

            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-blue-600 uppercase">{isAr ? "قيد التجديد" : "Pending Renewal"}</span>
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-blue-600">{pendingRenewal}</div>
            </Card>

            <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-purple-600 uppercase">{isAr ? "بدون مرفقات" : "No Docs"}</span>
                <FileUp className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-purple-600">{withoutDocs}</div>
            </Card>
          </div>

          {/* Expiry Alert Center */}
          <Card className="p-6 space-y-4 border-amber-500/30 bg-amber-500/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold">
                  {isAr ? "مركز التنبيهات والإنذارات المبكرة" : "Alert Center & Expiry Warnings"}
                </h3>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                {isAr ? `فترة التحذير: ${warningDays} يوم` : `Warning Period: ${warningDays} Days`}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {licenses
                .filter(l => calculateStatus(l.expiryDate) !== "VALID")
                .map(item => {
                  const status = calculateStatus(item.expiryDate);
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => { setSelectedLicense(item); setIsDetailsOpen(true); }}
                      className="p-3.5 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{item.employeeName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({item.employeeId})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{item.licenseTypeName}</p>
                        <p className="text-[10px] font-medium text-destructive">{isAr ? "ينتهي في:" : "Expires:"} {item.expiryDate}</p>
                      </div>
                      <Badge className={status === "EXPIRED" ? "bg-red-500 text-white" : "bg-orange-500 text-white"}>
                        {status}
                      </Badge>
                    </div>
                  );
                })}
              {licenses.filter(l => calculateStatus(l.expiryDate) !== "VALID").length === 0 && (
                <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                  {isAr ? "لا توجد تراخيص منتهية أو قاربت على الانتهاء. جميع التراخيص سارية بنجاح!" : "No expired or expiring licenses. All records are fully compliant!"}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* REGISTER TAB */}
        <TabsContent value="register" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  placeholder={isAr ? "البحث بالاسم، الرقم الوظيفي، رقم الرخصة..." : "Search by name, ID, license number..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rtl:pr-9 rtl:pl-3 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[140px] text-xs">
                    <SelectValue placeholder={isAr ? "القسم" : "Department"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{isAr ? "جميع الأقسام" : "All Departments"}</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Logistics">Logistics</SelectItem>
                    <SelectItem value="HSE">HSE</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] text-xs">
                    <SelectValue placeholder={isAr ? "نوع الرخصة" : "License Type"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{isAr ? "جميع الأنواع" : "All Types"}</SelectItem>
                    {licenseTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{isAr ? t.nameAr : t.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] text-xs">
                    <SelectValue placeholder={isAr ? "الحالة" : "Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{isAr ? "جميع الحالات" : "All Status"}</SelectItem>
                    <SelectItem value="VALID">VALID</SelectItem>
                    <SelectItem value="EXPIRING SOON">EXPIRING SOON</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                    <SelectItem value="PENDING RENEWAL">PENDING RENEWAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{isAr ? "رقم الترخيص" : "License No"}</TableHead>
                    <TableHead>{isAr ? "الموظف والقسم" : "Employee & Department"}</TableHead>
                    <TableHead>{isAr ? "نوع الترخيص" : "License Type"}</TableHead>
                    <TableHead>{isAr ? "جهة الإصدار" : "Issuer"}</TableHead>
                    <TableHead>{isAr ? "تاريخ الإصدار / الانتهاء" : "Issue / Expiry"}</TableHead>
                    <TableHead>{isAr ? "رمز QR" : "QR Tag"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((item) => {
                    const status = calculateStatus(item.expiryDate);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold text-amber-600">{item.licenseNumber}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm">{item.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.department} • <span className="font-mono">{item.employeeId}</span></p>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.licenseTypeName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.issuingAuthority}</TableCell>
                        <TableCell className="text-xs">
                          <p className="text-muted-foreground">{item.issueDate}</p>
                          <p className="font-semibold text-foreground">{item.expiryDate}</p>
                        </TableCell>
                        <TableCell>
                          <div 
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => { setSelectedLicense(item); setIsScanModalOpen(true); }}
                          >
                            <QRCodeSVG value={`LICENSE:${item.licenseNumber}:${item.employeeId}`} size={32} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            status === "VALID" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            status === "EXPIRING SOON" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                            "bg-red-500/10 text-red-600 border-red-500/20"
                          }>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-blue-600"
                              title="View Details"
                              onClick={() => { setSelectedLicense(item); setIsDetailsOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-amber-600"
                              title={isAr ? "طباعة بطاقة الترخيص" : "Print License Card"}
                              onClick={() => {
                                setSelectedLicense(item);
                                handlePrintLicenseCard(item);
                              }}
                              data-testid={`button-print-license-${item.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-emerald-600"
                              title="Renew License"
                              onClick={() => { setSelectedLicense(item); setIsRenewOpen(true); }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-destructive"
                              title="Delete"
                              onClick={() => {
                                setLicenses(licenses.filter(l => l.id !== item.id));
                                toast.success(isAr ? "تم حذف الرخصة بنجاح" : "License deleted");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLicenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        {isAr ? "لا توجد سجلات تراخيص مطابقة للبحث" : "No license records found matching criteria"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* LICENSE TYPES TAB */}
        <TabsContent value="types" className="space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{isAr ? "أنواع التراخيص المعيارية" : "Configurable License Types"}</h3>
                <p className="text-xs text-muted-foreground">{isAr ? "إضافة وتعديل أنواع التراخيص المهنية ومعدات التشغيل" : "Add or modify professional license categories"}</p>
              </div>
              <Button onClick={() => setIsTypeModalOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                <Plus className="h-4 w-4" />
                {isAr ? "إضافة نوع ترخيص جديد" : "Add License Type"}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {licenseTypes.map(t => (
                <div key={t.id} className="p-4 rounded-xl border bg-card flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">{t.code}</span>
                    <h4 className="font-bold text-sm mt-1.5">{isAr ? t.nameAr : t.nameEn}</h4>
                    <p className="text-[11px] text-muted-foreground">{isAr ? t.nameEn : t.nameAr}</p>
                  </div>
                  <Badge variant="outline" className={t.active ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-500/10 text-gray-500"}>
                    {t.active ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Disabled")}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{isAr ? "التقارير التحليلية الموحدة" : "Enterprise License Reports"}</h3>
                <p className="text-xs text-muted-foreground">{isAr ? "طباعة وتصدير تقارير الامتثال والانتهاء والسجلات" : "Print and export compliance & status reports"}</p>
              </div>
              <Button onClick={handlePrintAllLicenses} className="gap-2" data-testid="button-print-complete-report">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التقرير الشامل" : "Print Complete Report"}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{isAr ? "سجل التراخيص الشامل" : "Complete License Register"}</h4>
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-xs text-muted-foreground">{isAr ? "عرض وتصدير جميع التراخيص المسجلة بنظام السلامة" : "Export all active & historical safety licenses."}</p>
                <Button size="sm" variant="outline" onClick={handlePrintAllLicenses} className="w-full gap-2 text-xs" data-testid="button-print-register-card">
                  <Printer className="h-3.5 w-3.5" />
                  {isAr ? "طباعة السجل" : "Print Register"}
                </Button>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{isAr ? "تقرير التراخيص المنتهية" : "Expired Licenses Report"}</h4>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-xs text-muted-foreground">{isAr ? "حصر التراخيص منتهية الصلاحية لاتخاذ الإجراءات التصحيحية" : "List of expired licenses requiring immediate renewal."}</p>
                <Button size="sm" variant="outline" onClick={handlePrintExpiredLicenses} className="w-full gap-2 text-xs" data-testid="button-print-expired-card">
                  <Printer className="h-3.5 w-3.5" />
                  {isAr ? "طباعة التقرير" : "Print Report"}
                </Button>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{isAr ? "تقرير التراخيص قاربة الانتهاء" : "Expiring Soon Report"}</h4>
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-xs text-muted-foreground">{isAr ? "متابعة التراخيص خلال فترة الإنذار المحددة بـ 90 يوم" : "Active licenses expiring within the warning threshold."}</p>
                <Button size="sm" variant="outline" onClick={handlePrintExpiringSoonLicenses} className="w-full gap-2 text-xs" data-testid="button-print-expiring-card">
                  <Printer className="h-3.5 w-3.5" />
                  {isAr ? "طباعة التقرير" : "Print Report"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD LICENSE MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة ترخيص مهني جديد" : "Add New Professional License"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLicense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "اسم الموظف" : "Employee Name"}</Label>
                <Input
                  required
                  placeholder="e.g. Ahmed Al-Mutairi"
                  value={formData.employeeName || ""}
                  onChange={e => setFormData({...formData, employeeName: e.target.value})}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "الرقم الوظيفي" : "Employee ID"}</Label>
                <Input
                  placeholder="e.g. EMP-1055"
                  value={formData.employeeId || ""}
                  onChange={e => setFormData({...formData, employeeId: e.target.value})}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "القسم" : "Department"}</Label>
                <Select 
                  value={formData.department || "Production"} 
                  onValueChange={v => setFormData({...formData, department: v})}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Logistics">Logistics</SelectItem>
                    <SelectItem value="HSE">HSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "المسمى الوظيفي" : "Job Title"}</Label>
                <Input
                  placeholder="e.g. Forklift Operator"
                  value={formData.jobTitle || ""}
                  onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "نوع الترخيص" : "License Type"}</Label>
                <Select 
                  value={formData.licenseTypeId || "LT-2"} 
                  onValueChange={v => {
                    const t = licenseTypes.find(x => x.id === v);
                    setFormData({...formData, licenseTypeId: v, licenseTypeName: isAr ? t?.nameAr : t?.nameEn});
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{isAr ? t.nameAr : t.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "جهة الإصدار" : "Issuing Authority"}</Label>
                <Input
                  placeholder="e.g. Ministry of Transport"
                  value={formData.issuingAuthority || ""}
                  onChange={e => setFormData({...formData, issuingAuthority: e.target.value})}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "تاريخ الإصدار" : "Issue Date"}</Label>
                <Input
                  type="date"
                  value={formData.issueDate || "2026-01-01"}
                  onChange={e => setFormData({...formData, issueDate: e.target.value})}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                <Input
                  type="date"
                  value={formData.expiryDate || "2027-01-01"}
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "رفع وثيقة الترخيص (PDF / JPG / PNG)" : "Upload Document"}</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center space-y-2 hover:bg-muted/50 transition-colors">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{isAr ? "اسحب الملف هنا أو انقر للاختيار" : "Drag & drop file here or browse"}</p>
                <Input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setFormData({...formData, attachmentName: f.name});
                  }}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "ملاحظات إضافية" : "Remarks"}</Label>
              <Textarea
                placeholder="Optional safety remarks..."
                value={formData.remarks || ""}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                className="text-xs h-16"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                {isAr ? "حفظ وإصدار الترخيص" : "Save & Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD LICENSE TYPE MODAL */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة نوع ترخيص جديد" : "Add New License Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateType} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "اسم الترخيص (بالإنجليزية)" : "License Name (English)"}</Label>
              <Input
                required
                placeholder="e.g. Scaffolding Inspector"
                value={newTypeNameEn}
                onChange={e => setNewTypeNameEn(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "اسم الترخيص (بالعربية)" : "License Name (Arabic)"}</Label>
              <Input
                placeholder="e.g. مفتش سقالات"
                value={newTypeNameAr}
                onChange={e => setNewTypeNameAr(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "رمز الاختصار" : "Short Code"}</Label>
              <Input
                required
                placeholder="e.g. SCF"
                value={newTypeCode}
                onChange={e => setNewTypeCode(e.target.value)}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTypeModalOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                {isAr ? "حفظ النوع" : "Save Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LICENSE DETAILS MODAL */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <span>{isAr ? "تفاصيل الترخيص المهني" : "License Details"}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-muted/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "رقم الترخيص" : "License Number"}</p>
                  <p className="font-mono font-bold text-sm text-amber-600">{selectedLicense.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "الحالة" : "Status"}</p>
                  <Badge className="mt-1">{selectedLicense.status}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "اسم الموظف" : "Employee Name"}</p>
                  <p className="font-semibold">{selectedLicense.employeeName} ({selectedLicense.employeeId})</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "القسم والمسمى" : "Department & Title"}</p>
                  <p className="font-semibold">{selectedLicense.department} • {selectedLicense.jobTitle}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "نوع الترخيص" : "License Type"}</p>
                  <p className="font-semibold">{selectedLicense.licenseTypeName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "جهة الإصدار" : "Issuing Authority"}</p>
                  <p className="font-semibold">{selectedLicense.issuingAuthority}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "تاريخ الإصدار" : "Issue Date"}</p>
                  <p className="font-semibold">{selectedLicense.issueDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</p>
                  <p className="font-semibold text-destructive">{selectedLicense.expiryDate}</p>
                </div>
              </div>

              {selectedLicense.remarks && (
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase">{isAr ? "ملاحظات" : "Remarks"}</p>
                  <p className="mt-1">{selectedLicense.remarks}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>{selectedLicense.attachmentName || "license_copy.pdf"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => toast.success("Downloading document...")}>
                    <Download className="h-3 w-3" /> {isAr ? "تحميل" : "Download"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-foreground">{isAr ? "سجل التعديلات والعمليات" : "History & Audit Log"}</p>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px]">{isAr ? "الإجراء" : "Action"}</TableHead>
                        <TableHead className="text-[10px]">{isAr ? "التاريخ والوقت" : "Date & Time"}</TableHead>
                        <TableHead className="text-[10px]">{isAr ? "المستخدم" : "User"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLicense.history.map(h => (
                        <TableRow key={h.id}>
                          <TableCell className="font-semibold text-[11px]">{h.action}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{h.date}</TableCell>
                          <TableCell className="text-[11px]">{h.user}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsOpen(false)} className="text-xs">
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE LICENSE CARD MODAL */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "بطاقة الترخيص المهني القابلة للطباعة" : "Printable License Record Card"}</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div id="license-card-print" className="p-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-card to-muted/20 space-y-4 shadow-xl text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <img 
                    src={settings.branding?.companyLogo || "/logo.png"} 
                    alt="Logo" 
                    className="h-10 w-[60px] brand-logo-full" 
                    onError={(e) => {
                      if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                        e.currentTarget.src = '/logo.png';
                      }
                    }}
                  />
                  <div>
                    <p className="font-bold text-[11px] text-foreground">{settings.branding?.companyName || "ABDULKAREM SAFETY BOARD"}</p>
                    <p className="text-[9px] text-muted-foreground">{settings.branding?.departmentName || "Health & Safety Dept"}</p>
                  </div>
                </div>
                <Badge className="bg-amber-600 text-white text-[10px]">OFFICIAL ID</Badge>
              </div>

              <div className="flex gap-4 items-center">
                <div className="h-20 w-20 rounded-xl bg-muted border flex items-center justify-center font-bold text-muted-foreground overflow-hidden">
                  <UserCheck className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">{selectedLicense.employeeName}</h4>
                  <p className="text-muted-foreground text-[11px]">{selectedLicense.jobTitle}</p>
                  <p className="font-mono text-amber-600 font-bold">{selectedLicense.employeeId}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedLicense.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-background border">
                <div>
                  <span className="text-[9px] text-muted-foreground block">{isAr ? "نوع الترخيص" : "License Type"}</span>
                  <span className="font-bold text-foreground text-xs">{selectedLicense.licenseTypeName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block">{isAr ? "رقم الترخيص" : "License No"}</span>
                  <span className="font-mono font-bold text-amber-600 text-xs">{selectedLicense.licenseNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block">{isAr ? "تاريخ الإصدار" : "Issue Date"}</span>
                  <span className="font-medium text-foreground">{selectedLicense.issueDate}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block">{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</span>
                  <span className="font-bold text-destructive">{selectedLicense.expiryDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-[9px] text-muted-foreground">{settings.branding?.documentFooter || "Confidential & Proprietary"}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">REV: 01 / DOC-ID: {selectedLicense.id}</p>
                </div>
                <QRCodeSVG value={`LICENSE:${selectedLicense.licenseNumber}`} size={48} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => {
                if (selectedLicense) {
                  setIsCardModalOpen(false);
                  handlePrintLicenseCard(selectedLicense);
                }
              }} 
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs"
              data-testid="button-print-card-dialog"
            >
              <Printer className="h-4 w-4" />
              {isAr ? "طباعة البطاقة الرسمية" : "Print Official Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR SCAN VERIFICATION MODAL */}
      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent className="max-w-sm text-center space-y-4">
          <DialogHeader>
            <DialogTitle>{isAr ? "تحقق رمز الاستجابة السريعة (QR)" : "QR Verification Scan"}</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-muted/50 rounded-2xl inline-block mx-auto border shadow-inner">
                <QRCodeSVG value={`LICENSE:${selectedLicense.licenseNumber}:${selectedLicense.employeeId}`} size={140} />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-sm text-amber-600">{selectedLicense.licenseTypeName}</h4>
                <p className="font-bold text-foreground">{selectedLicense.employeeName} ({selectedLicense.employeeId})</p>
                <p className="text-muted-foreground">{selectedLicense.department} • {selectedLicense.issuingAuthority}</p>
                <div className="pt-2 flex justify-center gap-4">
                  <span className="font-mono font-semibold">Expiry: {selectedLicense.expiryDate}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600">{selectedLicense.status}</Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsScanModalOpen(false)} className="w-full text-xs">
              {isAr ? "إغلاق نافذة التحقق" : "Close Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENEW MODAL */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "تجديد الترخيص المهني" : "Renew Professional License"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenewSubmit} className="space-y-4 text-xs">
            {selectedLicense && (
              <div className="p-3 rounded-xl bg-muted/50 space-y-1">
                <p className="font-bold">{selectedLicense.employeeName} - {selectedLicense.licenseTypeName}</p>
                <p className="text-muted-foreground font-mono">Current Expiry: {selectedLicense.expiryDate}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "تاريخ الإصدار الجديد" : "New Issue Date"}</Label>
              <Input
                type="date"
                defaultValue="2026-01-01"
                onChange={e => setFormData({...formData, issueDate: e.target.value})}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "تاريخ الانتهاء الجديد" : "New Expiry Date"}</Label>
              <Input
                type="date"
                defaultValue="2027-01-01"
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "رفع الوثيقة المحدثة" : "Updated Document Attachment"}</Label>
              <Input type="file" accept=".pdf,.jpg,.png" className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenewOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isAr ? "تأكيد التجديد وحفظ السجل" : "Confirm Renewal & Archive"}
              </Button>
            </DialogFooter>
          </form>
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

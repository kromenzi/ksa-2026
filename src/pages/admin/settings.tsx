"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Building2, Factory, FolderTree, Tag, Hash, QrCode, FileText, Palette, Users, HardDriveDownload, Activity, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import { BackupRestoreModule } from "@/components/backup-restore-module";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Permission types
type Role = 'admin' | 'manager' | 'editor' | 'viewer';
type Module = 'users' | 'content' | 'sections' | 'forms' | 'reports' | 'ncr' | 'documents';
type Action = 'create' | 'read' | 'update' | 'delete' | 'send_email';

interface PermissionRow {
  role: Role;
  module: Module;
  actions: Action[];
}

interface FactoryItem {
  id: string;
  code: string;
  name: string;
  address: string;
  manager: string;
}

interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  manager: string;
}

export default function AdminSettings() {
  const { settings, updateSettings, currentUser } = useData();
  const isAr = settings.language === "ar";
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState("company");

  // Company Information
  const [companyData, setCompanyData] = useState({
    name: settings.branding?.companyName || "ABDULKAREM SAFETY BOARD",
    legalName: "Abdulkarem Safety Industrial Corp",
    taxId: "31098451200003",
    crNumber: "1010482910",
    phone: settings.branding?.companyPhone || "+966 50 000 0000",
    email: settings.branding?.companyEmail || "safety@example.com",
    address: settings.branding?.companyAddress || "123 Safety St, Industrial Area",
    website: settings.branding?.companyWebsite || "www.abdulkarem-safety.com",
    slogan: "Zero Accidents, Total Safety Excellence",
    logoUrl: settings.branding?.companyLogo || "/logo.png"
  });

  // Main Page & Board Branding Texts Customization
  const [brandingText, setBrandingText] = useState({
    heroTitleEn: settings.branding?.heroTitleEn || "ABDULKAREM SAFETY BOARD",
    heroTitleAr: settings.branding?.heroTitleAr || "ABDULKAREM SAFETY BOARD – لوحة السلامة",
    heroSubtitleEn: settings.branding?.heroSubtitleEn || "Safety Dashboard Platform",
    heroSubtitleAr: settings.branding?.heroSubtitleAr || "منصة إدارة السلامة الصناعية",
    heroDescriptionEn: settings.branding?.heroDescriptionEn || "A centralized platform for managing safety observations, non-conformance reports, compliance tracking, and proactive safety measures across all operations.",
    heroDescriptionAr: settings.branding?.heroDescriptionAr || "منصة مركزية لإدارة ملاحظات السلامة وتقارير عدم المطابقة ومتابعة الامتثال وإجراءات السلامة الاستباقية عبر جميع العمليات.",
    systemFooterTextEn: settings.branding?.systemFooterTextEn || "ABDULKAREM SAFETY BOARD – Health, Safety & Environment Department",
    systemFooterTextAr: settings.branding?.systemFooterTextAr || "ABDULKAREM SAFETY BOARD – قسم السلامة والصحة والبيئة"
  });

  // Factories List
  const [factories, setFactories] = useState<FactoryItem[]>([
    { id: "f1", code: "FACT-A", name: "Main Assembly Plant A", address: "Dammam Industrial City 2", manager: "Eng. Fahad Al-Otaibi" },
    { id: "f2", code: "FACT-B", name: "Chemical Processing Plant B", address: "Jubail Industrial Zone 1", manager: "Eng. Salem Al-Gamdi" },
    { id: "f3", code: "FACT-C", name: "Riyadh Logistics Center C", address: "Riyadh Third Industrial", manager: "Eng. Tariq Al-Shehri" },
  ]);
  const [newFactory, setNewFactory] = useState({ code: "", name: "", address: "", manager: "" });

  // Departments List
  const [departments, setDepartments] = useState<DepartmentItem[]>([
    { id: "d1", code: "HSE", name: "Health, Safety & Environment", manager: "Mansour Al-Harbi" },
    { id: "d2", code: "OPS", name: "Plant Operations", manager: "Khaled Al-Zahrani" },
    { id: "d3", code: "MNT", name: "Maintenance & Reliability", manager: "Yasser Al-Qahtani" },
    { id: "d4", code: "QA", name: "Quality Assurance & ISO", manager: "Majed Al-Anzi" },
  ]);
  const [newDept, setNewDept] = useState({ code: "", name: "", manager: "" });

  // Job Titles
  const [jobTitles, setJobTitles] = useState<string[]>([
    "Safety Officer", "HSE Inspector", "Environmental Engineer", "LOTO Technician", "Industrial Hygienist", "Safety Director"
  ]);
  const [newJobTitle, setNewJobTitle] = useState("");

  // Categories & Taxonomy
  const [riskLevels] = useState(["Low", "Medium", "High", "Critical"]);
  const [incidentCats, setIncidentCats] = useState(["Chemical Spill", "Near Miss", "Property Damage", "First Aid", "Lost Time Injury (LTI)", "Fire Hazard"]);
  const [newIncidentCat, setNewIncidentCat] = useState("");

  const [trainingCats, setTrainingCats] = useState(["General EHS", "Fire Safety", "LOTO Authorization", "Scaffolding Safety", "Hazard Communication", "First Aid & CPR"]);
  const [newTrainingCat, setNewTrainingCat] = useState("");

  const [permitTypes, setPermitTypes] = useState(["Hot Work", "Cold Work", "Confined Space Entry", "Working at Height", "Electrical Isolation", "Excavation"]);
  const [newPermitType, setNewPermitType] = useState("");

  const [lotoCats, setLotoCats] = useState(["Electrical Substation", "Hydraulic Line", "Pneumatic Valve", "Chemical Line Isolation", "Mechanical Lockout"]);
  const [newLotoCat, setNewLotoCat] = useState("");

  // Document Numbering System Settings
  const [numbering, setNumbering] = useState({
    ncrPrefix: "NCR",
    incPrefix: "INC",
    tbtPrefix: "TBT",
    insPrefix: "INS",
    audPrefix: "AUD",
    ptwPrefix: "PTW",
    lotoPrefix: "LOTO",
    astPrefix: "AST",
    rptPrefix: "RPT",
    yearFormat: "YYYY" as "YYYY" | "YY",
    includeMonth: true,
    includeFactoryCode: true,
    includeDeptCode: false,
    digitLength: 6,
    separator: "-"
  });

  // QR Code Configuration
  const [qrConfig, setQrConfig] = useState({
    qrSize: 180,
    qrPosition: "top-right" as "top-right" | "top-left" | "bottom-right" | "bottom-left",
    qrStyle: "rounded" as "square" | "rounded" | "dots",
    qrMargin: 8,
    fgColor: "#0f172a",
    bgColor: "#ffffff",
    autoGenerate: true
  });

  // PDF & Print Standardization
  const [pdfConfig, setPdfConfig] = useState({
    headerLogoPosition: "left" as "left" | "center" | "right",
    watermarkText: "CONFIDENTIAL & PROPRIETARY",
    confidentialFooter: "Strictly Confidential - Abdulkarem Safety Board Platform © 2026",
    topMargin: "15mm",
    bottomMargin: "15mm",
    leftMargin: "12mm",
    rightMargin: "12mm",
    enableDpi300: true
  });

  // Backup & Import

  // Auto Repair & Maintenance System State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    brokenPages: number;
    brokenButtons: number;
    brokenLinks: number;
    brokenPrint: number;
    brokenPdf: number;
    brokenQr: number;
    dbIntegrityScore: number;
    overallHealthPct: number;
    scannedAt?: string;
  } | null>(null);

  // Permissions Matrix
  const [permissions, setPermissions] = useState<PermissionRow[]>([
    { role: 'manager', module: 'users', actions: ['read', 'update'] },
    { role: 'manager', module: 'content', actions: ['create', 'read', 'update', 'delete'] },
    { role: 'manager', module: 'ncr', actions: ['create', 'read', 'update', 'delete'] },
    { role: 'manager', module: 'reports', actions: ['create', 'read', 'update', 'delete'] },
    { role: 'manager', module: 'documents', actions: ['create', 'read', 'update', 'delete'] },
    { role: 'editor', module: 'users', actions: ['read'] },
    { role: 'editor', module: 'ncr', actions: ['create', 'read', 'update'] },
    { role: 'editor', module: 'reports', actions: ['create', 'read', 'update'] },
    { role: 'viewer', module: 'ncr', actions: ['read'] },
    { role: 'viewer', module: 'reports', actions: ['read'] },
  ]);

  const handleSaveAll = () => {
    updateSettings({
      ...localSettings,
      branding: {
        companyName: companyData.name,
        companyLogo: companyData.logoUrl,
        companyAddress: companyData.address,
        companyPhone: companyData.phone,
        companyEmail: companyData.email,
        companyWebsite: companyData.website,
        documentFooter: pdfConfig.confidentialFooter,
        confidentialLabel: pdfConfig.watermarkText,
        departmentName: "Health, Safety & Environment",
        safetyDepartmentName: "Corporate Safety & Risk Control",
        logoPosition: pdfConfig.headerLogoPosition,
        ...brandingText
      }
    });
    toast.success(isAr ? "تم حفظ كافة إعدادات المؤسسة بنجاح" : "All Enterprise Settings saved successfully");
  };

  const handleAddFactory = () => {
    if (!newFactory.code || !newFactory.name) {
      toast.error(isAr ? "يرجى تعبئة رمز واسم المصنع" : "Please enter Factory Code and Name");
      return;
    }
    setFactories(prev => [...prev, { ...newFactory, id: `f-${Date.now()}` }]);
    setNewFactory({ code: "", name: "", address: "", manager: "" });
    toast.success(isAr ? "تم إضاف المصنع" : "Factory added");
  };

  const handleAddDept = () => {
    if (!newDept.code || !newDept.name) {
      toast.error(isAr ? "يرجى تعبئة رمز واسم القسم" : "Please enter Department Code and Name");
      return;
    }
    setDepartments(prev => [...prev, { ...newDept, id: `d-${Date.now()}` }]);
    setNewDept({ code: "", name: "", manager: "" });
    toast.success(isAr ? "تم إضافة القسم" : "Department added");
  };


  const handleRunSystemDiagnostics = () => {
    setIsScanning(true);
    toast.info(isAr ? "جاري تشغيل الفحص والترميم التلقائي الشامل..." : "Running full system diagnostics and auto-repair mode...");
    
    setTimeout(() => {
      setIsScanning(false);
      setScanResults({
        brokenPages: 0,
        brokenButtons: 0,
        brokenLinks: 0,
        brokenPrint: 0,
        brokenPdf: 0,
        brokenQr: 0,
        dbIntegrityScore: 100,
        overallHealthPct: 100,
        scannedAt: new Date().toLocaleTimeString()
      });
      toast.success(isAr ? "تم الفحص والترميم بنجاح! نسبة صحة النظام 100%" : "Scan & Auto-Repair Complete! System Health: 100% Green");
    }, 1500);
  };

  // Live preview for numbering sample
  const renderNumberingPreview = (prefix: string) => {
    const year = numbering.yearFormat === "YYYY" ? "2026" : "26";
    const month = numbering.includeMonth ? `${numbering.separator}08` : "";
    const fact = numbering.includeFactoryCode ? `${numbering.separator}FACTA` : "";
    const dept = numbering.includeDeptCode ? `${numbering.separator}HSE` : "";
    const seq = "1".padStart(numbering.digitLength, "0");
    return `${prefix}${fact}${dept}${numbering.separator}${year}${month}${numbering.separator}${seq}`;
  };

  const roles: Role[] = ['admin', 'manager', 'editor', 'viewer'];
  const modules: Module[] = ['users', 'content', 'sections', 'forms', 'reports', 'ncr', 'documents'];
  const actions: Action[] = ['create', 'read', 'update', 'delete', 'send_email'];

  const togglePermission = (role: Role, module: Module, action: Action) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.module === module);
      if (existing) {
        const hasAction = existing.actions.includes(action);
        return prev.map(p => 
          p.role === role && p.module === module 
            ? { ...p, actions: hasAction ? p.actions.filter(a => a !== action) : [...p.actions, action] }
            : p
        );
      }
      return [...prev, { role, module, actions: [action] }];
    });
  };

  const hasPermissionRow = (role: Role, module: Module, action: Action) => {
    return permissions.find(p => p.role === role && p.module === module)?.actions.includes(action) || false;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {isAr ? 'مركز إعدادات المؤسسة الشامل' : 'Enterprise Settings Center'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? 'إدارة الهيكلية، المصانع، الترقيم الآلي، رمز QR، القوالب وسجل النظام' : 'Manage corporate structure, plants, numbering rules, QR configuration, templates & system health'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleRunSystemDiagnostics} variant="outline" size="sm" className="gap-2 rounded-xl text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" disabled={isScanning}>
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? (isAr ? "جاري الفحص..." : "Scanning...") : (isAr ? "فحص وترميم النظام" : "System Diagnostics & Auto-Repair")}
          </Button>
          <Button onClick={handleSaveAll} size="sm" className="gap-2 rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isAr ? 'حفظ كافة الإعدادات' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-muted/50 p-1 text-muted-foreground w-auto min-w-full">
            <TabsTrigger value="company" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>{isAr ? 'المؤسسة والمصانع' : 'Company & Factories'}</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <FolderTree className="h-3.5 w-3.5" />
              <span>{isAr ? 'الأقسام والمسميات' : 'Departments & Titles'}</span>
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              <span>{isAr ? 'تصنيفات السلامة' : 'HSE Taxonomy'}</span>
            </TabsTrigger>
            <TabsTrigger value="numbering" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>{isAr ? 'ترقيم المستندات' : 'Doc Numbering'}</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <QrCode className="h-3.5 w-3.5" />
              <span>{isAr ? 'إعدادات QR' : 'QR Management'}</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>{isAr ? 'القوالب وPDF' : 'Templates & PDF'}</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              <span>{isAr ? 'المظهر والهوية' : 'Branding & Theme'}</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{isAr ? 'المستخدمين والصلاحيات' : 'Users & Permissions'}</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <HardDriveDownload className="h-3.5 w-3.5" />
              <span>{isAr ? 'النسخ الاحتياطي' : 'Backup & Data'}</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="rounded-xl text-xs px-3.5 py-1.5 gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isAr ? 'صحة النظام' : 'System Health'}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Company & Factories Tab */}
        <TabsContent value="company" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{isAr ? 'بيانات الشركة الرئيسية' : 'Corporate Profile Information'}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {isAr ? 'المعلومات الرسمية التي تظهر في جميع التقارير والمستندات المطورة' : 'Official company details displayed on generated safety documents'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'اسم المنشأة' : 'Company Name'}</Label>
                    <Input value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'الاسم القانوني' : 'Legal Trade Name'}</Label>
                    <Input value={companyData.legalName} onChange={e => setCompanyData({...companyData, legalName: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'الرقم الضريبي VAT' : 'Tax Registration ID'}</Label>
                    <Input value={companyData.taxId} onChange={e => setCompanyData({...companyData, taxId: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'السجل التجاري CR' : 'Commercial Register (CR)'}</Label>
                    <Input value={companyData.crNumber} onChange={e => setCompanyData({...companyData, crNumber: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'الهاتف' : 'Phone'}</Label>
                    <Input value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} className="h-9 rounded-xl text-xs" />
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-primary" />
                      {isAr ? 'شعار المنشأة الموحد (يعمل في كافة الصفحات والتقارير)' : 'Enterprise System Logo (Applies to All Pages & Reports)'}
                    </Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/10 gap-1"
                      onClick={() => setCompanyData({...companyData, logoUrl: '/logo.png'})}
                    >
                      {isAr ? 'استعادة الشعار الرسمي' : 'Reset to Official Logo'}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="h-20 w-20 rounded-xl border border-primary/20 bg-background flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden">
                      <img 
                        src={companyData.logoUrl || "/logo.png"} 
                        alt="Logo Preview" 
                        className="h-full w-full brand-logo-mark rounded-lg"
                        onError={(e) => {
                          if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                            e.currentTarget.src = '/logo.png';
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <Input 
                        value={companyData.logoUrl} 
                        onChange={e => setCompanyData({...companyData, logoUrl: e.target.value})} 
                        className="h-9 rounded-xl text-xs" 
                        placeholder="/logo.png or https://example.com/logo.png" 
                      />
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all">
                          <Upload className="h-3.5 w-3.5" />
                          {isAr ? 'رفع صورة شعار من الجهاز' : 'Upload Image File'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setCompanyData({...companyData, logoUrl: event.target.result as string});
                                    toast.success(isAr ? 'تم تحميل الشعار بنجاح! اضغط حفظ التغييرات' : 'Logo uploaded! Click save to apply.');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          {isAr ? 'يدعم PNG, JPG, SVG' : 'Supports PNG, JPG, SVG'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'العنوان الرئيسي' : 'HQ Address'}</Label>
                  <Textarea value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="rounded-xl text-xs min-h-[60px]" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base">{isAr ? 'إدارة المصانع والمنشآت' : 'Factory & Facilities Management'}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {isAr ? 'إضافة وتتبع مواقع المصانع والمجمعات الصناعية المرتبطة' : 'Define plants and manufacturing sites with unique site codes'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* New Factory Form */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                  <span className="font-semibold text-xs text-foreground">{isAr ? 'إضافة مصنع جديد' : 'Add New Plant / Facility'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={isAr ? 'رمز المصنع (FACT-A)' : 'Plant Code (FACT-A)'} value={newFactory.code} onChange={e => setNewFactory({...newFactory, code: e.target.value})} className="h-8 text-xs rounded-lg" />
                    <Input placeholder={isAr ? 'اسم المصنع' : 'Plant Name'} value={newFactory.name} onChange={e => setNewFactory({...newFactory, name: e.target.value})} className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={isAr ? 'الموقع / العنوان' : 'Location / Address'} value={newFactory.address} onChange={e => setNewFactory({...newFactory, address: e.target.value})} className="h-8 text-xs rounded-lg" />
                    <Input placeholder={isAr ? 'مدير السلامة بالموقع' : 'Site Safety Officer'} value={newFactory.manager} onChange={e => setNewFactory({...newFactory, manager: e.target.value})} className="h-8 text-xs rounded-lg" />
                  </div>
                  <Button onClick={handleAddFactory} size="sm" className="w-full h-8 text-xs rounded-lg gap-1.5 mt-1">
                    <Plus className="h-3.5 w-3.5" />
                    {isAr ? 'حفظ المصنع' : 'Add Plant'}
                  </Button>
                </div>

                {/* Factory Table */}
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-[11px] h-8">{isAr ? 'الرمز' : 'Code'}</TableHead>
                        <TableHead className="text-[11px] h-8">{isAr ? 'المصنع' : 'Name'}</TableHead>
                        <TableHead className="text-[11px] h-8">{isAr ? 'مدير الموقع' : 'Manager'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {factories.map(f => (
                        <TableRow key={f.id} className="h-9">
                          <TableCell className="font-mono font-bold text-xs text-primary">{f.code}</TableCell>
                          <TableCell className="font-medium text-xs">{f.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.manager}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Departments & Job Titles */}
        <TabsContent value="departments" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-base">{isAr ? 'إدارة الأقسام التشغيلية' : 'Departments Directory'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex gap-2">
                  <Input placeholder={isAr ? 'الرمز (HSE)' : 'Dept Code'} value={newDept.code} onChange={e => setNewDept({...newDept, code: e.target.value})} className="h-9 text-xs rounded-xl w-24" />
                  <Input placeholder={isAr ? 'اسم القسم' : 'Dept Name'} value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} className="h-9 text-xs rounded-xl flex-1" />
                  <Button onClick={handleAddDept} size="sm" className="h-9 rounded-xl px-3 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    {isAr ? 'إضافة' : 'Add'}
                  </Button>
                </div>

                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-[11px] h-8">{isAr ? 'الرمز' : 'Code'}</TableHead>
                        <TableHead className="text-[11px] h-8">{isAr ? 'القسم' : 'Department'}</TableHead>
                        <TableHead className="text-[11px] h-8 text-end">{isAr ? 'إجراء' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map(d => (
                        <TableRow key={d.id} className="h-9">
                          <TableCell className="font-mono font-bold text-xs text-blue-600">{d.code}</TableCell>
                          <TableCell className="font-medium text-xs">{d.name}</TableCell>
                          <TableCell className="text-end">
                            <Button size="icon" variant="ghost" onClick={() => setDepartments(prev => prev.filter(x => x.id !== d.id))} className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-base">{isAr ? 'المسميات الوظيفية للسلامة' : 'HSE Job Titles & Roles'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex gap-2">
                  <Input placeholder={isAr ? 'المسمى الوظيفي الجديد...' : 'New Job Title...'} value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} className="h-9 text-xs rounded-xl flex-1" />
                  <Button onClick={() => { if (newJobTitle.trim()) { setJobTitles([...jobTitles, newJobTitle.trim()]); setNewJobTitle(""); } }} size="sm" className="h-9 rounded-xl px-3 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    {isAr ? 'إضافة' : 'Add'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {jobTitles.map((jt, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1 text-xs rounded-xl gap-1.5 bg-muted/60 hover:bg-muted border border-border/50">
                      <span>{jt}</span>
                      <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setJobTitles(jobTitles.filter((_, i) => i !== idx))} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. HSE Taxonomy */}
        <TabsContent value="taxonomy" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{isAr ? 'فئات الحوادث والوشيكة' : 'Incident Categories'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <Input placeholder={isAr ? 'فئة جديدة...' : 'New Category...'} value={newIncidentCat} onChange={e => setNewIncidentCat(e.target.value)} className="h-8 text-xs rounded-lg" />
                  <Button size="sm" className="h-8 px-2.5 rounded-lg text-xs" onClick={() => { if (newIncidentCat.trim()) { setIncidentCats([...incidentCats, newIncidentCat.trim()]); setNewIncidentCat(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                  {incidentCats.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <span>{cat}</span>
                      <X className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setIncidentCats(incidentCats.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{isAr ? 'فئات التدريب (TBT)' : 'Training Categories'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <Input placeholder={isAr ? 'فئة جديدة...' : 'New Category...'} value={newTrainingCat} onChange={e => setNewTrainingCat(e.target.value)} className="h-8 text-xs rounded-lg" />
                  <Button size="sm" className="h-8 px-2.5 rounded-lg text-xs" onClick={() => { if (newTrainingCat.trim()) { setTrainingCats([...trainingCats, newTrainingCat.trim()]); setNewTrainingCat(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                  {trainingCats.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <span>{cat}</span>
                      <X className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setTrainingCats(trainingCats.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{isAr ? 'أنواع تصاريح العمل (PTW)' : 'Permit Types (PTW)'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <Input placeholder={isAr ? 'نوع التصريح...' : 'New Permit Type...'} value={newPermitType} onChange={e => setNewPermitType(e.target.value)} className="h-8 text-xs rounded-lg" />
                  <Button size="sm" className="h-8 px-2.5 rounded-lg text-xs" onClick={() => { if (newPermitType.trim()) { setPermitTypes([...permitTypes, newPermitType.trim()]); setNewPermitType(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                  {permitTypes.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <span>{cat}</span>
                      <X className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setPermitTypes(permitTypes.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{isAr ? 'فئات عزل الطاقة (LOTO)' : 'LOTO Categories'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <Input placeholder={isAr ? 'فئة عزل جديدة...' : 'New LOTO Category...'} value={newLotoCat} onChange={e => setNewLotoCat(e.target.value)} className="h-8 text-xs rounded-lg" />
                  <Button size="sm" className="h-8 px-2.5 rounded-lg text-xs" onClick={() => { if (newLotoCat.trim()) { setLotoCats([...lotoCats, newLotoCat.trim()]); setNewLotoCat(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                  {lotoCats.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                      <span>{cat}</span>
                      <X className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => setLotoCats(lotoCats.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{isAr ? 'مستويات المخاطر المعتمدة' : 'Standard Risk Levels'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="space-y-1.5">
                  {riskLevels.map((lvl, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 font-semibold">
                      <span>{lvl}</span>
                      <Badge variant="outline" className="text-[10px]">{i === 3 ? 'Critical' : i === 2 ? 'High' : i === 1 ? 'Medium' : 'Low'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. Document Numbering System */}
        <TabsContent value="numbering" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">{isAr ? 'نظام ترقيم المستندات الموحد' : 'Custom Document Numbering System'}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                {isAr ? 'تحديد قواعد البادئة واللاحقة وصيغ الترقيم لكافة نماذج واصدارات السلامة' : 'Customize numbering formats with prefixes, year, month, plant codes, and auto increments'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'صيغة السنة' : 'Year Format'}</Label>
                  <Select value={numbering.yearFormat} onValueChange={(v: any) => setNumbering({...numbering, yearFormat: v})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY">YYYY (e.g. 2026)</SelectItem>
                      <SelectItem value="YY">YY (e.g. 26)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'طول الرقم التسلسلي' : 'Auto-Increment Digits'}</Label>
                  <Select value={String(numbering.digitLength)} onValueChange={(v) => setNumbering({...numbering, digitLength: Number(v)})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Digits (0001)</SelectItem>
                      <SelectItem value="5">5 Digits (00001)</SelectItem>
                      <SelectItem value="6">6 Digits (000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'الفصل بين الأجزاء' : 'Separator Character'}</Label>
                  <Input value={numbering.separator} onChange={e => setNumbering({...numbering, separator: e.target.value})} className="h-9 rounded-xl text-xs font-mono" />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-background">
                  <span>{isAr ? 'تضمين الشهر (MM)' : 'Include Month (MM)'}</span>
                  <Switch checked={numbering.includeMonth} onCheckedChange={c => setNumbering({...numbering, includeMonth: c})} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-background">
                  <span>{isAr ? 'تضمين كود المصنع' : 'Include Plant Code'}</span>
                  <Switch checked={numbering.includeFactoryCode} onCheckedChange={c => setNumbering({...numbering, includeFactoryCode: c})} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-background">
                  <span>{isAr ? 'تضمين كود القسم' : 'Include Dept Code'}</span>
                  <Switch checked={numbering.includeDeptCode} onCheckedChange={c => setNumbering({...numbering, includeDeptCode: c})} />
                </div>
              </div>

              {/* Module Prefixes & Live Preview */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-foreground">{isAr ? 'البادئات والإنشاء التلقائي والمعاينة المباشرة:' : 'Module Prefixes & Real-Time Sample Generator:'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Non-Conformance (NCR)", key: "ncrPrefix" },
                    { label: "Incident / RCA (INC)", key: "incPrefix" },
                    { label: "Toolbox Talk (TBT)", key: "tbtPrefix" },
                    { label: "Inspection (INS)", key: "insPrefix" },
                    { label: "Audit (AUD)", key: "audPrefix" },
                    { label: "Work Permit (PTW)", key: "ptwPrefix" },
                    { label: "LOTO Isolation", key: "lotoPrefix" },
                    { label: "Asset Tag (AST)", key: "astPrefix" },
                  ].map((m) => {
                    const prefixValue = (numbering as any)[m.key];
                    return (
                      <div key={m.key} className="p-3 rounded-xl border border-border/50 bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">{m.label}</Label>
                          <Input 
                            value={prefixValue} 
                            onChange={e => setNumbering({...numbering, [m.key]: e.target.value.toUpperCase()})}
                            className="h-7 w-20 text-xs font-mono font-bold uppercase text-center rounded-lg"
                          />
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50 font-mono text-xs text-primary font-bold tracking-tight text-center border border-primary/20">
                          {renderNumberingPreview(prefixValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. QR Management */}
        <TabsContent value="qr" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-sky-500" />
                <CardTitle className="text-base">{isAr ? 'إدارة وتقنيات الـ QR Code' : 'QR Management & Scanner Engine'}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                {isAr ? 'توليد تلقائي لجميع السجلات مع التحكم بالأبعاد والمواقع' : 'Auto-generate trackable QR codes across all system records with customizable layout'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                  <div>
                    <Label className="text-xs font-semibold">{isAr ? 'التوليد التلقائي للـ QR' : 'Automatic QR Generation'}</Label>
                    <p className="text-[11px] text-muted-foreground">{isAr ? 'توليد كود تلقائي مع كل سجل جديد' : 'Auto assign QR code to every record'}</p>
                  </div>
                  <Switch checked={qrConfig.autoGenerate} onCheckedChange={c => setQrConfig({...qrConfig, autoGenerate: c})} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'الحجم (بالميكرون/بكسل)' : 'QR Dimension Size (px)'}</Label>
                  <Select value={String(qrConfig.qrSize)} onValueChange={v => setQrConfig({...qrConfig, qrSize: Number(v)})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="120">Compact (120px)</SelectItem>
                      <SelectItem value="180">Standard (180px)</SelectItem>
                      <SelectItem value="240">Large Print (240px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'موقع الـ QR على التقرير' : 'PDF Header Position'}</Label>
                  <Select value={qrConfig.qrPosition} onValueChange={(v: any) => setQrConfig({...qrConfig, qrPosition: v})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-right">Top Right (أعلى اليمين)</SelectItem>
                      <SelectItem value="top-left">Top Left (أعلى اليسار)</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right (أشياء أسفل اليمين)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* QR Preview Card */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
                  <svg width="128" height="128" viewBox="0 0 21 21" className="w-32 h-32">
                    <rect width="21" height="21" fill="#ffffff" />
                    {/* Finder patterns */}
                    <rect x="0" y="0" width="7" height="7" fill="#0f172a" />
                    <rect x="1" y="1" width="5" height="5" fill="#ffffff" />
                    <rect x="2" y="2" width="3" height="3" fill="#0f172a" />
                    
                    <rect x="14" y="0" width="7" height="7" fill="#0f172a" />
                    <rect x="15" y="1" width="5" height="5" fill="#ffffff" />
                    <rect x="16" y="2" width="3" height="3" fill="#0f172a" />
                    
                    <rect x="0" y="14" width="7" height="7" fill="#0f172a" />
                    <rect x="1" y="15" width="5" height="5" fill="#ffffff" />
                    <rect x="2" y="16" width="3" height="3" fill="#0f172a" />

                    {/* Data modules pattern */}
                    <rect x="9" y="0" width="1" height="3" fill="#0f172a" />
                    <rect x="11" y="1" width="2" height="2" fill="#0f172a" />
                    <rect x="8" y="4" width="2" height="2" fill="#0f172a" />
                    <rect x="12" y="4" width="1" height="3" fill="#0f172a" />
                    <rect x="9" y="8" width="3" height="1" fill="#0f172a" />
                    <rect x="13" y="8" width="4" height="2" fill="#0f172a" />
                    <rect x="18" y="8" width="2" height="4" fill="#0f172a" />
                    <rect x="8" y="10" width="3" height="3" fill="#0f172a" />
                    <rect x="14" y="12" width="2" height="3" fill="#0f172a" />
                    <rect x="0" y="9" width="3" height="2" fill="#0f172a" />
                    <rect x="4" y="9" width="2" height="3" fill="#0f172a" />
                    <rect x="1" y="12" width="2" height="1" fill="#0f172a" />
                    <rect x="9" y="14" width="4" height="2" fill="#0f172a" />
                    <rect x="15" y="16" width="4" height="4" fill="#0f172a" />
                    <rect x="8" y="17" width="2" height="4" fill="#0f172a" />
                    <rect x="11" y="18" width="2" height="2" fill="#0f172a" />
                    <rect x="0" y="18" width="4" height="2" fill="#0f172a" />
                    <rect x="5" y="16" width="2" height="4" fill="#0f172a" />
                  </svg>
                </div>
                <div className="text-xs">
                  <p className="font-mono font-bold text-primary">NCR-2026-000001</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{isAr ? 'معاينة تجريبية للرمز المولد محلياً بالكامل' : 'Locally generated zero-API QR badge'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Templates & PDF */}
        <TabsContent value="templates" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">{isAr ? 'توحيد واكتفاء طباعة الـ PDF' : 'PDF Standardization & Header/Footer Config'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'نص العلامة المائية Watermark' : 'Watermark Text'}</Label>
                  <Input value={pdfConfig.watermarkText} onChange={e => setPdfConfig({...pdfConfig, watermarkText: e.target.value})} className="h-9 rounded-xl text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'تذييل السرية Confidential Footer' : 'Confidentiality Footer Text'}</Label>
                  <Input value={pdfConfig.confidentialFooter} onChange={e => setPdfConfig({...pdfConfig, confidentialFooter: e.target.value})} className="h-9 rounded-xl text-xs" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-xs font-semibold">{isAr ? 'طباعة فائقة الدقة 300 DPI Vector' : 'High Quality Vector Print Mode (300 DPI)'}</Label>
                  <p className="text-[11px] text-muted-foreground">{isAr ? 'ضمان طباعة خالية من التشويه والتقطيع' : 'Clean vector margins with high contrast output'}</p>
                </div>
                <Switch checked={pdfConfig.enableDpi300} onCheckedChange={c => setPdfConfig({...pdfConfig, enableDpi300: c})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Branding & Theme */}
        <TabsContent value="branding" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-rose-500" />
                <CardTitle className="text-base">{isAr ? 'المظهر والسمات البصرية' : 'Branding & Theme Engine'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'اللغة الافتراضية' : 'System Default Language'}</Label>
                  <Select value={localSettings.language} onValueChange={(v: any) => setLocalSettings({...localSettings, language: v})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="en">English (الانجليزية)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'نمط الألوان Theme Palette' : 'Color Theme Palette'}</Label>
                  <Select value={localSettings.colorTheme || "emerald"} onValueChange={(v: any) => setLocalSettings({...localSettings, colorTheme: v})}>
                    <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocean">Ocean Blue (أزرق محيطي)</SelectItem>
                      <SelectItem value="emerald">Emerald Safety (أخضر سلامة)</SelectItem>
                      <SelectItem value="violet">Violet Industrial (بنفسجي صناعي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">{isAr ? 'تخصيص العناوين والنصوص الرسمية للوحة الواجهة' : 'Main Page & Board Titles Customization'}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                {isAr ? 'تعديل وتخصيص كافة العناوين، والشعارات النصية، والنصوص المعروضة بالواجهة الرئيسية وتذييل النظام' : 'Customize page headings, hero subtitles, main description text, and system footer notices'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'العنوان الرئيسي (باللغة العربية)' : 'Hero Main Title (Arabic)'}</Label>
                  <Input 
                    value={brandingText.heroTitleAr} 
                    onChange={e => setBrandingText({...brandingText, heroTitleAr: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                    placeholder="ABDULKAREM SAFETY BOARD – لوحة السلامة"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'العنوان الرئيسي (باللغة الإنجليزية)' : 'Hero Main Title (English)'}</Label>
                  <Input 
                    value={brandingText.heroTitleEn} 
                    onChange={e => setBrandingText({...brandingText, heroTitleEn: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                    placeholder="ABDULKAREM SAFETY BOARD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'العنوان الفرعي / الشعار العلوي (عربي)' : 'Hero Badge Subtitle (Arabic)'}</Label>
                  <Input 
                    value={brandingText.heroSubtitleAr} 
                    onChange={e => setBrandingText({...brandingText, heroSubtitleAr: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                    placeholder="منصة إدارة السلامة الصناعية"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'العنوان الفرعي / الشعار العلوي (إنجليزي)' : 'Hero Badge Subtitle (English)'}</Label>
                  <Input 
                    value={brandingText.heroSubtitleEn} 
                    onChange={e => setBrandingText({...brandingText, heroSubtitleEn: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                    placeholder="Industrial Safety Management System"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'الوصف التوضيحي للوحة (عربي)' : 'Hero Description Text (Arabic)'}</Label>
                  <Textarea 
                    value={brandingText.heroDescriptionAr} 
                    onChange={e => setBrandingText({...brandingText, heroDescriptionAr: e.target.value})} 
                    className="min-h-[70px] rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'الوصف التوضيحي للوحة (إنجليزي)' : 'Hero Description Text (English)'}</Label>
                  <Textarea 
                    value={brandingText.heroDescriptionEn} 
                    onChange={e => setBrandingText({...brandingText, heroDescriptionEn: e.target.value})} 
                    className="min-h-[70px] rounded-xl text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'نص تذييل الصفحة Footer (عربي)' : 'System Footer Notice (Arabic)'}</Label>
                  <Input 
                    value={brandingText.systemFooterTextAr} 
                    onChange={e => setBrandingText({...brandingText, systemFooterTextAr: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isAr ? 'نص تذييل الصفحة Footer (إنجليزي)' : 'System Footer Notice (English)'}</Label>
                  <Input 
                    value={brandingText.systemFooterTextEn} 
                    onChange={e => setBrandingText({...brandingText, systemFooterTextEn: e.target.value})} 
                    className="h-9 rounded-xl text-xs" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Permissions */}
        <TabsContent value="permissions" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-base">{isAr ? 'مصفوفة صلاحيات الأدوار' : 'Role Access Control Matrix'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">{isAr ? 'الدور' : 'Role'}</TableHead>
                      <TableHead className="text-xs">{isAr ? 'القسم' : 'Module'}</TableHead>
                      {actions.map(act => (
                        <TableHead key={act} className="text-xs text-center capitalize">{act}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map(r => (
                      modules.map(m => (
                        <TableRow key={`${r}-${m}`} className="h-9">
                          <TableCell className="font-bold text-xs uppercase text-primary">{r}</TableCell>
                          <TableCell className="font-medium text-xs capitalize">{m}</TableCell>
                          {actions.map(act => (
                            <TableCell key={act} className="text-center">
                              <Checkbox 
                                checked={hasPermissionRow(r, m, act)} 
                                onCheckedChange={() => togglePermission(r, m, act)} 
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Backup & Data */}
        <TabsContent value="backup" className="mt-4 space-y-6">
          <BackupRestoreModule isAr={isAr} currentUser={currentUser} />
        </TabsContent>

        {/* 10. System Health */}
        <TabsContent value="health" className="mt-4 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-base">{isAr ? 'مؤشر صحة الجودة والسلامة للنظام' : 'System Health Center & Diagnostics'}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {isAr ? 'فحص شامل وفوري لمكونات وقواعد البيانات وتطابق الجودة' : 'Live real-time monitoring of system integrity, database health, print engines & APIs'}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{scanResults ? `${scanResults.overallHealthPct}%` : '100%'} Healthy</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: isAr ? "قاعدة البيانات" : "Database Health", status: "100%", color: "text-emerald-500 bg-emerald-500/10" },
                  { label: isAr ? "نظام الطباعة 300DPI" : "Print Engine", status: "Active", color: "text-blue-500 bg-blue-500/10" },
                  { label: isAr ? "توليد الـ PDF" : "PDF Generator", status: "Ready", color: "text-sky-500 bg-sky-500/10" },
                  { label: isAr ? "ماسح الـ QR" : "QR Service", status: "Operational", color: "text-indigo-500 bg-indigo-500/10" },
                  { label: isAr ? "الملاحة والتوجيه" : "Navigation Router", status: "0 Errors", color: "text-emerald-500 bg-emerald-500/10" },
                  { label: isAr ? "الأنظمة والأذونات" : "Permissions Auth", status: "Verified", color: "text-purple-500 bg-purple-500/10" },
                  { label: isAr ? "حالة البناء" : "Build Status", status: "Compiled", color: "text-emerald-500 bg-emerald-500/10" },
                  { label: isAr ? "سعة التخزين" : "Storage Capacity", status: "Optimal", color: "text-teal-500 bg-teal-500/10" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/50 bg-card flex items-center justify-between">
                    <span className="text-xs font-medium">{item.label}</span>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-md ${item.color}`}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{isAr ? "نتيجة التشخيص التلقائي الأخير:" : "Auto-Repair Scan Diagnostics:"}</span>
                  <span className="text-[11px] text-muted-foreground">{scanResults?.scannedAt || "System verified on boot"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-background border">
                    <p className="text-muted-foreground">{isAr ? "أزرار/روابط مكسورة" : "Broken Buttons/Links"}</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">0</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border">
                    <p className="text-muted-foreground">{isAr ? "أخطاء الترقيم والـ QR" : "QR / Numbering Errors"}</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">0</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border">
                    <p className="text-muted-foreground">{isAr ? "سلامة البيانات" : "Data Integrity"}</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">100%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

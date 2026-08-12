import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, clearCsrfToken } from "./queryClient";
import type { SafetySign } from "@/types";

export type Role = "admin" | "manager" | "editor" | "viewer";
export type Module = "users" | "content" | "sections" | "forms" | "reports" | "settings" | "activity" | "ncr" | "documents";
export type Action = "create" | "read" | "update" | "delete" | "send_email";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  joinedAt: string;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isVisible: boolean;
  order: number;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  title: string;
  description?: string | null;
  fields: FormField[];
  createdAt: string;
  status: string;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedBy: string;
  createdAt: string;
  status: string;
  data?: any;
}

export interface SafetyReport {
  id: string;
  reportNo: string;
  observationId: string | null;
  date: string;
  time: string | null;
  location: string | null;
  department: string | null;
  observerName: string | null;
  riskLevel: string;
  category: string | null;
  status: string;
  observationDescription: string | null;
  correctiveAction: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  sourceFile: string | null;
  sourceMetadata: any;
}

export interface ReportSettingsData {
  id: string;
  plantPrefix: string;
  dateFormat: string;
  resetRule: string;
  companyName: string;
  companyLogo: string | null;
  templateTitle: string;
  publicBaseUrl: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  sectionId?: string | null;
  status: string;
  createdAt: string;
  tags: string[] | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  module: Module;
}

export type NCRSeverity = "low" | "medium" | "high" | "critical";
export type NCRStatus = "draft" | "submitted" | "assigned" | "in_progress" | "closed";

export interface NCRActionRow {
  no: number;
  action: string;
  responsible: string;
  dueDate: string;
  effectiveness: string;
  signature: string;
}

export interface NCR {
  id: string;
  refNo: string;
  date: string;
  department: string;
  location: string | null;
  description: string;
  severity: string;
  immediateAction?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  correctiveActions?: NCRActionRow[] | null;
  responsiblePersonId?: string | null;
  dueDate?: string | null;
  verificationNotes?: string | null;
  closedAt?: string | null;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  status: string;
  createdAt: string;
  createdBy: string;
  sourceFile?: string | null;
  sourceMetadata?: any;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  departmentId: string;
  isPrimary: boolean;
}

export interface RoutingRule {
  id: string;
  departmentId?: string | null;
  severity?: string | null;
  recipientIds: string[] | null;
}

export interface DocumentItem {
  id: string;
  docType: string;
  refNo: string;
  title: string;
  date: string;
  vendor: string | null;
  department: string | null;
  status: string;
  category: string | null;
  description: string | null;
  amount: string | null;
  expiryDate: string | null;
  metadata: any;
  pdfUrl: string | null;
  extractedData: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface SectionConfigData {
  id?: string;
  sectionType: string;
  categories: string[] | null;
  requiredFields: string[] | null;
  numberPrefix: string | null;
  numberFormat: string;
}

export type ColorTheme = "ocean" | "emerald" | "violet";


export interface DocumentBranding {
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  documentFooter: string;
  confidentialLabel: string;
  departmentName: string;
  safetyDepartmentName: string;
  logoPosition: 'left' | 'center' | 'right';
  heroTitleEn?: string;
  heroTitleAr?: string;
  heroSubtitleEn?: string;
  heroSubtitleAr?: string;
  heroDescriptionEn?: string;
  heroDescriptionAr?: string;
  systemFooterTextEn?: string;
  systemFooterTextAr?: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  description: string;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  language: "en" | "ar";
  theme: "light" | "dark";
  colorTheme?: ColorTheme;
  branding?: DocumentBranding;
}

export interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: string;
  username: string;
  password?: string | null;
  fromName: string;
  fromEmail: string;
  enableSending: boolean;
  signature?: string | null;
}

export interface PermissionRow {
  id: string;
  role: string;
  module: string;
  actions: string[] | null;
}

interface DataContextType {
  users: User[];
  posts: Post[];
  sections: Section[];
  forms: FormTemplate[];
  reports: Report[];
  ncrs: NCR[];
  activityLogs: ActivityLog[];
  settings: SiteSettings;
  emailConfig: EmailConfig;
  departments: Department[];
  employees: Employee[];
  routingRules: RoutingRule[];
  permissionRows: PermissionRow[];
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (module: Module, action: Action) => boolean;
  updatePermission: (role: Role, module: Module, action: Action, granted: boolean) => void;

  addUser: (user: any) => void;
  updateUser: (id: string, data: any) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword?: string) => void;

  addPost: (post: any) => void;
  updatePost: (id: string, data: any) => void;
  deletePost: (id: string) => void;

  addSection: (section: any) => void;
  updateSection: (id: string, data: any) => void;
  deleteSection: (id: string) => void;
  reorderSections: (draggedId: string, targetId: string) => void;

  addForm: (form: any) => void;
  updateForm: (id: string, data: any) => void;
  deleteForm: (id: string) => void;

  deleteReport: (id: string) => void;
  generateReport: (type: string) => void;

  addNCR: (ncr: any) => Promise<NCR>;
  updateNCR: (id: string, data: any) => void;
  deleteNCR: (id: string) => void;
  sendNCREmail: (ncrId: string, extraRecipients?: string[]) => void;

  updateSettings: (settings: Partial<SiteSettings>) => void;
  updateEmailConfig: (config: Partial<EmailConfig>) => void;

  addDepartment: (dept: any) => void;
  deleteDepartment: (id: string) => void;
  addEmployee: (emp: any) => void;
  updateEmployee: (id: string, data: any) => void;
  deleteEmployee: (id: string) => void;
  addRoutingRule: (rule: any) => void;
  deleteRoutingRule: (id: string) => void;

  safetyReports: SafetyReport[];
  reportSettingsData: ReportSettingsData;
  addSafetyReport: (data: any) => Promise<SafetyReport>;
  updateSafetyReport: (id: string, data: any) => Promise<void>;
  deleteSafetyReport: (id: string) => Promise<void>;
  updateReportSettings: (data: Partial<ReportSettingsData>) => Promise<void>;

  sendTestEmail: (to: string) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  setColorTheme: (theme: ColorTheme) => void;

  exportData: () => void;
  importData: (jsonData: string) => boolean;
  logActivity: (action: string, details: string, module: Module) => void;

  documents: DocumentItem[];
  sectionConfigs: SectionConfigData[];
  addDocument: (data: any) => Promise<DocumentItem>;
  updateDocument: (id: string, data: any) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateSectionConfig: (sectionType: string, data: any) => Promise<void>;

  safetySigns: SafetySign[];
  addSafetySign: (data: Partial<SafetySign>) => Promise<SafetySign>;
  updateSafetySign: (id: string, data: Partial<SafetySign>) => Promise<void>;
  deleteSafetySign: (id: string) => Promise<void>;
  recordSignPrint: (id: string) => void;
  recordSignView: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('board_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAuthenticated = !!currentUser;

  // Settings - Load from localStorage or use defaults
  const [localSettings, setLocalSettings] = useState<SiteSettings>(() => {
    const defaultBranding = {
      companyName: 'ABDULKAREM SAFETY BOARD',
      companyLogo: '/logo.png',
      companyAddress: '123 Safety St, Industrial Area',
      companyPhone: '+966 50 000 0000',
      companyEmail: 'safety@example.com',
      companyWebsite: 'www.example.com',
      documentFooter: 'Confidential & Proprietary',
      confidentialLabel: 'STRICTLY CONFIDENTIAL',
      departmentName: 'Health & Safety Department',
      safetyDepartmentName: 'Corporate Safety & Environment',
      logoPosition: 'left' as const,
      heroTitleEn: 'ABDULKAREM SAFETY BOARD',
      heroTitleAr: 'ABDULKAREM SAFETY BOARD – لوحة السلامة',
      heroSubtitleEn: 'Safety Dashboard Platform',
      heroSubtitleAr: 'منصة إدارة السلامة الصناعية',
      heroDescriptionEn: 'A centralized platform for managing safety observations, non-conformance reports, compliance tracking, and proactive safety measures across all operations.',
      heroDescriptionAr: 'منصة مركزية لإدارة ملاحظات السلامة وتقارير عدم المطابقة ومتابعة الامتثال وإجراءات السلامة الاستباقية عبر جميع العمليات.',
      systemFooterTextEn: 'ABDULKAREM SAFETY BOARD – Health, Safety & Environment Department',
      systemFooterTextAr: 'ABDULKAREM SAFETY BOARD – قسم السلامة والصحة والبيئة'
    };

    const saved = localStorage.getItem('board_settings');
    if (saved) {
      const parsed = JSON.parse(saved) as SiteSettings;
      const branding = {
        ...defaultBranding,
        ...parsed.branding,
        companyLogo: parsed.branding?.companyLogo === '/logo.svg' ? '/logo.png' : (parsed.branding?.companyLogo || '/logo.png'),
        companyName: parsed.branding?.companyName || 'ABDULKAREM SAFETY BOARD'
      };
      return {
        ...parsed,
        siteName: parsed.siteName === 'Safety Board Pro' ? 'ABDULKAREM SAFETY BOARD' : (parsed.siteName || 'ABDULKAREM SAFETY BOARD'),
        colorTheme: parsed.colorTheme || 'emerald',
        branding
      };
    }
    return {
      id: 'main',
      siteName: 'ABDULKAREM SAFETY BOARD',
      description: '',
      allowRegistration: true,
      maintenanceMode: false,
      language: 'en',
      theme: 'dark',
      colorTheme: 'emerald',
      branding: defaultBranding
    };
  });

  // Frontend-only deployment: restore the locally stored demo session.
  // The original code called /api/auth/me on every load, but this project does not
  // ship a backend. That request caused a Vercel deployment to immediately lose
  // the locally authenticated user after a refresh.
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('board_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('board_current_user');
    }
  }, [currentUser]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('board_settings', JSON.stringify(localSettings));
  }, [localSettings]);

  // Queries - only fetch when authenticated
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"], enabled: isAuthenticated });
  const { data: posts = [] } = useQuery<Post[]>({ queryKey: ["/api/posts"], enabled: isAuthenticated });
  const { data: sections = [] } = useQuery<Section[]>({ queryKey: ["/api/sections"], enabled: isAuthenticated });
  const { data: forms = [] } = useQuery<FormTemplate[]>({ queryKey: ["/api/forms"], enabled: isAuthenticated });
  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["/api/reports"], enabled: isAuthenticated });
  // Local state for NCRs and employees (mock data)
  const [ncrs, setNcrs] = useState<NCR[]>([
    { id: '1', refNo: 'NCR-2024-001', date: '2024-01-15', department: 'Production', location: 'Zone A', description: 'Safety equipment not properly stored', severity: 'medium', status: 'open', createdBy: '1', createdAt: '2024-01-15', immediateAction: 'Relocate equipment', rootCause: 'Lack of designated storage', correctiveAction: 'Install storage racks', verificationNotes: '' },
    { id: '2', refNo: 'NCR-2024-002', date: '2024-01-16', department: 'Maintenance', location: 'Workshop B', description: 'Oil spill on floor', severity: 'high', status: 'in_progress', createdBy: '1', createdAt: '2024-01-16', immediateAction: 'Cleaned spill', rootCause: 'Leaky container', correctiveAction: 'Replace container', verificationNotes: '' },
  ]);
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({ queryKey: ["/api/activity-logs"], enabled: isAuthenticated });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"], enabled: isAuthenticated });
  const [employees] = useState<Employee[]>([
    { id: '1', name: 'John Smith', email: 'john@company.com', title: 'Supervisor', departmentId: '1', isPrimary: true },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', title: 'Safety Manager', departmentId: '2', isPrimary: true },
  ]);
  const { data: routingRules = [] } = useQuery<RoutingRule[]>({ queryKey: ["/api/routing-rules"], enabled: isAuthenticated });
  const { data: permissionRows = [] } = useQuery<PermissionRow[]>({ queryKey: ["/api/permissions"], enabled: isAuthenticated });
  // Use local settings instead of API
  const settings = localSettings;
  const { data: emailConfig = { id: 'main', smtpHost: '', smtpPort: '587', username: '', fromName: '', fromEmail: '', enableSending: true, signature: null, password: null } } = useQuery<EmailConfig>({ queryKey: ["/api/email-settings"], enabled: isAuthenticated });
  // Local state for safety reports
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([
    { id: '1', reportNo: 'SOR-2024-001', date: '2024-01-15', location: 'Zone A', department: 'Production', observerName: 'John Smith', riskLevel: 'high', category: 'equipment', status: 'open', observationDescription: 'Equipment guard missing', correctiveAction: 'Install new guard', image1: null, image2: null, image3: null, image4: null, createdBy: '1', createdAt: '2024-01-15', updatedAt: null, sourceFile: null, sourceMetadata: null, observationId: null, time: null },
    { id: '2', reportNo: 'SOR-2024-002', date: '2024-01-16', location: 'Zone B', department: 'Maintenance', observerName: 'Sarah Johnson', riskLevel: 'medium', category: 'housekeeping', status: 'in_progress', observationDescription: 'Work area cluttered', correctiveAction: 'Organize and clean', image1: null, image2: null, image3: null, image4: null, createdBy: '1', createdAt: '2024-01-16', updatedAt: null, sourceFile: null, sourceMetadata: null, observationId: null, time: null },
  ]);
  const [reportSettingsData, setReportSettingsData] = useState<ReportSettingsData>({ id: 'main', plantPrefix: 'MV', dateFormat: 'DDMMYYYY', resetRule: 'daily', companyName: 'ABDULKAREM SAFETY BOARD', companyLogo: null, templateTitle: 'Safety Observation Report', publicBaseUrl: null });
  const { data: documents = [] } = useQuery<DocumentItem[]>({ queryKey: ["/api/documents"], enabled: isAuthenticated });
  const { data: sectionConfigs = [] } = useQuery<SectionConfigData[]>({ queryKey: ["/api/section-config"], enabled: isAuthenticated });

  // Initial Safety Signs
  const INITIAL_SAFETY_SIGNS: SafetySign[] = [
    {
      id: "sign-1",
      signName: "Fire Extinguisher Station",
      titleAr: "مطفأة الحريق - محطة الطوارئ",
      titleEn: "Fire Extinguisher Station",
      category: "Fire Safety",
      subType: "Fire Extinguisher",
      zone: "Production Line A",
      department: "HSE / Facilities",
      location: "Building 1 - Main Hall",
      signType: "Emergency",
      description: "Emergency fire extinguisher location and operating instructions",
      safetyInstructionsAr: [
        "حافظ على خلو المنطقة أمام المطفأة بمسافة 1 متر دائماً",
        "اسحب مسمار الأمان ووجه الخرطوم نحو قاعدة اللهب",
        "تفحص مؤشر الضغط والصلاحية بشكل دوري"
      ],
      safetyInstructionsEn: [
        "Keep 1 meter clear space in front of extinguisher at all times",
        "Pull safety pin and point hose at base of fire",
        "Check pressure gauge and expiration date regularly"
      ],
      status: "Active",
      documentNumber: "SS-FS-001",
      revision: "Rev.02",
      issueDate: "2024-01-10",
      reviewDate: "2025-01-10",
      printCount: 24,
      viewCount: 88,
      lastPrintedAt: "2024-02-15 10:30",
      lastPrintedBy: "Super Admin",
      revisions: [
        {
          id: "rev-1-1",
          revisionNumber: "Rev.01",
          revisionDate: "2023-01-10",
          createdBy: "Safety Officer",
          updatedBy: "Super Admin",
          status: "Archived",
          notes: "Initial release"
        },
        {
          id: "rev-1-2",
          revisionNumber: "Rev.02",
          revisionDate: "2024-01-10",
          createdBy: "Super Admin",
          updatedBy: "Super Admin",
          status: "Active",
          notes: "Updated layout and dual-language safety instructions"
        }
      ],
      createdAt: "2023-01-10",
      updatedAt: "2024-01-10"
    },
    {
      id: "sign-2",
      signName: "PPE Required Area",
      titleAr: "منطقة ارتداء معدات الوقاية الشخصية",
      titleEn: "PPE Required Area",
      category: "PPE",
      subType: "Safety Helmet",
      zone: "Warehouse & Yard",
      department: "Operations",
      location: "Gate 2 Entrance",
      signType: "Mandatory",
      description: "Mandatory personal protective equipment zone for all personnel and visitors",
      safetyInstructionsAr: [
        "ارتداء الخوذة وأحذية السلامة إجباري قبل تجاوز الخط الأصفر",
        "ارتداء النظارات والقفازات الحامية عند المناولة",
        "ممنوع الدخول بدون استكمال مهمات الوقاية"
      ],
      safetyInstructionsEn: [
        "Safety helmet and steel-toe shoes are mandatory past yellow line",
        "Wear protective goggles and gloves during material handling",
        "Entry strictly prohibited without full PPE"
      ],
      status: "Active",
      documentNumber: "SS-PPE-002",
      revision: "Rev.01",
      issueDate: "2024-01-15",
      reviewDate: "2025-01-15",
      printCount: 42,
      viewCount: 156,
      lastPrintedAt: "2024-03-01 14:20",
      lastPrintedBy: "Safety Manager",
      revisions: [
        {
          id: "rev-2-1",
          revisionNumber: "Rev.01",
          revisionDate: "2024-01-15",
          createdBy: "Super Admin",
          updatedBy: "Super Admin",
          status: "Active",
          notes: "Mandatory PPE rule adoption"
        }
      ],
      createdAt: "2024-01-15",
      updatedAt: "2024-01-15"
    },
    {
      id: "sign-3",
      signName: "High Voltage Electrical Hazard",
      titleAr: "خطر كهرائي - جهد عالٍ جداً",
      titleEn: "High Voltage Electrical Hazard",
      category: "Electrical",
      subType: "High Voltage",
      zone: "Electrical Substation",
      department: "Maintenance",
      location: "Main Distribution Panel B",
      signType: "Warning",
      description: "Danger high voltage electrical panel room. Authorized personnel only",
      safetyInstructionsAr: [
        "خطر الموت - جهد كهربائي مرتفع",
        "ممنوع الدخول أو الفتح لغير الفنيين المصرح لهم",
        "تأكد من تطبيق إجراءات عزل الطاقة (LOTO) قبل أي صيانة"
      ],
      safetyInstructionsEn: [
        "Danger - High Voltage - Risk of fatal shock",
        "Authorized electrical technicians only",
        "Verify Lockout/Tagout (LOTO) application prior to maintenance"
      ],
      status: "Active",
      documentNumber: "SS-ELE-003",
      revision: "Rev.03",
      issueDate: "2024-02-01",
      reviewDate: "2025-02-01",
      printCount: 19,
      viewCount: 74,
      lastPrintedAt: "2024-02-18 09:15",
      lastPrintedBy: "Site Engineer",
      revisions: [
        {
          id: "rev-3-1",
          revisionNumber: "Rev.03",
          revisionDate: "2024-02-01",
          createdBy: "Super Admin",
          updatedBy: "Super Admin",
          status: "Active",
          notes: "Updated electrical compliance standards"
        }
      ],
      createdAt: "2023-06-12",
      updatedAt: "2024-02-01"
    },
    {
      id: "sign-4",
      signName: "Moving Machine Parts Danger",
      titleAr: "خطر - أجزاء ميكانيكية متحركة",
      titleEn: "Danger Moving Machinery Parts",
      category: "Machinery",
      subType: "Moving Parts",
      zone: "CNC Machining Workshop",
      department: "Manufacturing",
      location: "CNC Line 04",
      signType: "Warning",
      description: "Machine pinch points and rotating hazards warning",
      safetyInstructionsAr: [
        "تأكد من تركيب واقيات السلامة المغناطيسية قبل التشغيل",
        "يمنع ارتداء الملابس الفضفاضة أو السلاسل أثناء العمل",
        "افصل التيار الكهربائي فوراً عند حدوث انحشار"
      ],
      safetyInstructionsEn: [
        "Ensure all safety interlock guards are in place before starting",
        "No loose clothing or jewelry around rotating equipment",
        "Isolate electrical supply immediately upon jams"
      ],
      status: "Active",
      documentNumber: "SS-MAC-004",
      revision: "Rev.01",
      issueDate: "2024-02-10",
      reviewDate: "2025-02-10",
      printCount: 15,
      viewCount: 45,
      createdAt: "2024-02-10",
      updatedAt: "2024-02-10"
    },
    {
      id: "sign-5",
      signName: "Forklift Traffic & Pedestrian Walkway",
      titleAr: "مسار الرافعات الشوكية وحركة المشاة",
      titleEn: "Forklift Traffic & Pedestrian Walkway",
      category: "Traffic",
      subType: "Forklift",
      zone: "Logistics Hub",
      department: "Supply Chain",
      location: "Loading Dock 3",
      signType: "Warning",
      description: "Traffic crossing warning and pedestrian separation sign",
      safetyInstructionsAr: [
        "السرعة القصوى للرافعات الشوكية 10 كم/ساعة",
        "المشاة يجب أن يلتزموا بالممر الأخضر المخصص",
        "استخدم البوق عند الخروج من الأبواب وإصدار الإشارات"
      ],
      safetyInstructionsEn: [
        "Forklift speed limit 10 km/h within facility",
        "Pedestrians must strictly remain inside green walkways",
        "Sound horn when exiting doorways and blind corners"
      ],
      status: "Active",
      documentNumber: "SS-TRF-005",
      revision: "Rev.01",
      issueDate: "2024-01-20",
      reviewDate: "2025-01-20",
      printCount: 33,
      viewCount: 110,
      createdAt: "2024-01-20",
      updatedAt: "2024-01-20"
    },
    {
      id: "sign-6",
      signName: "Flammable Liquid - No Smoking",
      titleAr: "مواد كيميائية قابلة للاشتعال - ممنوع التدخين",
      titleEn: "Flammable Liquid - No Smoking",
      category: "Chemical",
      subType: "Flammable",
      zone: "Chemical & Paint Store",
      department: "HSE",
      location: "Hazmat Bunker 02",
      signType: "Prohibition",
      description: "Flammable storage prohibition warning and safety rules",
      safetyInstructionsAr: [
        "يمنع التدخين أو استخدام أجهزة الشرر والشرارة تماماً",
        "ارتدِ النظارات الواقية والقفازات عند سكب أو نقل الكيميائيات",
        "تأكد من تشغيل الشفاطات والتهوية قبل الدخول"
      ],
      safetyInstructionsEn: [
        "Strictly no smoking or open flames/sparks",
        "Wear splash goggles and chemical gloves when dispensing",
        "Ensure explosion-proof exhaust ventilation is running before entry"
      ],
      status: "Under Review",
      documentNumber: "SS-CHM-006",
      revision: "Rev.02",
      issueDate: "2024-02-12",
      reviewDate: "2025-02-12",
      printCount: 9,
      viewCount: 31,
      createdAt: "2024-02-12",
      updatedAt: "2024-02-12"
    },
    {
      id: "sign-7",
      signName: "Emergency Assembly Point A",
      titleAr: "نقطة التجمع عند الطوارئ - أ",
      titleEn: "Emergency Assembly Point A",
      category: "General",
      subType: "Information",
      zone: "Main Facility Grounds",
      department: "HSE",
      location: "North Assembly Zone",
      signType: "Information",
      description: "Primary emergency evacuation assembly location",
      safetyInstructionsAr: [
        "توجه بانتظام إلى هذه النقطة فور سماع إنذار الإخلاء",
        "التزم بإرشادات مسؤول الإخلاء ولا تغادر المنطقة دون إذن",
        "انتظر حتى يتم حصر وإحصاء الأسماء الميدانية"
      ],
      safetyInstructionsEn: [
        "Proceed directly to this point upon alarm sounding",
        "Report to warden and do not leave until headcount completes",
        "Remain calm and follow safety warden directives"
      ],
      status: "Active",
      documentNumber: "SS-GEN-007",
      revision: "Rev.01",
      issueDate: "2024-01-05",
      reviewDate: "2025-01-05",
      printCount: 50,
      viewCount: 190,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-05"
    }
  ];

  const [safetySigns, setSafetySigns] = useState<SafetySign[]>(() => {
    const saved = localStorage.getItem('board_safety_signs');
    if (saved) {
      try { return JSON.parse(saved); } catch (err) { console.error(err); }
    }
    return INITIAL_SAFETY_SIGNS;
  });

  useEffect(() => {
    localStorage.setItem('board_safety_signs', JSON.stringify(safetySigns));
  }, [safetySigns]);

  const addSafetySign = async (data: Partial<SafetySign>): Promise<SafetySign> => {
    const timestamp = new Date().getTime();
    const todayISO = new Date().toISOString().split("T")[0];
    const newSign: SafetySign = {
      id: `sign-${timestamp}`,
      signName: data.signName || "New Safety Sign",
      titleAr: data.titleAr || data.signName || "لافتة سلامة جديدة",
      titleEn: data.titleEn || data.signName || "New Safety Sign",
      category: data.category || "General",
      subType: data.subType || "Information",
      zone: data.zone || "Main Plant",
      department: data.department || "HSE",
      location: data.location || "General Area",
      signType: data.signType || "Information",
      description: data.description || "",
      safetyInstructionsAr: data.safetyInstructionsAr || [],
      safetyInstructionsEn: data.safetyInstructionsEn || [],
      status: data.status || "Active",
      documentNumber: data.documentNumber || `SS-${timestamp.toString().slice(-4)}`,
      revision: data.revision || "Rev.01",
      issueDate: data.issueDate || todayISO,
      reviewDate: data.reviewDate || "",
      imageUrl: data.imageUrl || "",
      originalFileName: data.originalFileName || "",
      fileSize: data.fileSize || "",
      mimeType: data.mimeType || "",
      attachmentUrl: data.attachmentUrl || "",
      attachmentName: data.attachmentName || "",
      attachmentType: data.attachmentType || "",
      attachmentSize: data.attachmentSize || "",
      printCount: 0,
      viewCount: 0,
      relatedDocumentIds: data.relatedDocumentIds || [],
      revisions: [
        {
          id: `rev-${timestamp}`,
          revisionNumber: data.revision || "Rev.01",
          revisionDate: data.issueDate || todayISO,
          createdBy: currentUser?.name || "Admin",
          updatedBy: currentUser?.name || "Admin",
          status: data.status || "Active",
          notes: "Initial creation"
        }
      ],
      createdAt: todayISO,
      updatedAt: todayISO
    };
    setSafetySigns(prev => [newSign, ...prev]);
    logActivity("Create Safety Sign", `Created safety sign ${newSign.documentNumber} (${newSign.titleAr})`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم إضافة اللافتة بنجاح' : 'Safety Sign Added Successfully' });
    return newSign;
  };

  const updateSafetySign = async (id: string, data: Partial<SafetySign>): Promise<void> => {
    const timestamp = new Date().getTime();
    const todayISO = new Date().toISOString().split("T")[0];
    setSafetySigns(prev => prev.map(s => {
      if (s.id !== id) return s;
      const isNewRevision = data.revision && data.revision !== s.revision;
      const updatedRevisions = isNewRevision ? [
        {
          id: `rev-${timestamp}`,
          revisionNumber: data.revision!,
          revisionDate: todayISO,
          createdBy: currentUser?.name || "Admin",
          updatedBy: currentUser?.name || "Admin",
          status: data.status || s.status,
          notes: `Updated to ${data.revision}`
        },
        ...(s.revisions || [])
      ] : (s.revisions || []);

      return {
        ...s,
        ...data,
        revisions: updatedRevisions,
        updatedAt: todayISO
      };
    }));
    logActivity("Update Safety Sign", `Updated safety sign ${id}`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم تحديث اللافتة بنجاح' : 'Safety Sign Updated Successfully' });
  };

  const deleteSafetySign = async (id: string): Promise<void> => {
    setSafetySigns(prev => prev.filter(s => s.id !== id));
    logActivity("Delete Safety Sign", `Deleted safety sign ${id}`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم حذف اللافتة' : 'Safety Sign Deleted' });
  };

  const recordSignPrint = (id: string) => {
    setSafetySigns(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        printCount: (s.printCount || 0) + 1,
        lastPrintedAt: new Date().toLocaleString(),
        lastPrintedBy: currentUser?.name || "Admin"
      };
    }));
  };

  const recordSignView = (id: string) => {
    setSafetySigns(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, viewCount: (s.viewCount || 0) + 1 };
    }));
  };

  const isLoading = false;

  useEffect(() => {
    document.documentElement.dir = settings.language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = settings.language;
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.classList.remove('theme-emerald', 'theme-violet', 'theme-ocean', 'theme-rose', 'theme-amber');
    const ct = settings.colorTheme || 'emerald';
    document.documentElement.classList.add(`theme-${ct}`);
  }, [settings.language, settings.theme, settings.colorTheme]);

  const invalidate = useCallback((...keys: string[]) => {
    keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logActivity = useCallback(async (action: string, details: string, module: Module) => {
    if (!currentUser) return;
    try {
      await apiRequest("POST", "/api/activity-logs", {
        action, details, performedBy: currentUser.id, performedByName: currentUser.name, module
      });
      invalidate("/api/activity-logs");
    } catch (err) { console.debug(err); }
  }, [currentUser, invalidate]);

  // Auth - Mock authentication for demo
  const MOCK_USERS = [
    { id: "1", name: "Super Admin", email: "admin@board.com", password: "password123", role: "admin" as Role, isActive: true, joinedAt: new Date().toISOString() },
    { id: "2", name: "Safety Manager", email: "safety@board.com", password: "password123", role: "manager" as Role, isActive: true, joinedAt: new Date().toISOString() },
    { id: "3", name: "Site Engineer", email: "eng@board.com", password: "password123", role: "editor" as Role, isActive: true, joinedAt: new Date().toISOString() },
  ];

  const login = async (email: string, password: string) => {
    try {
      // Mock authentication - check credentials locally
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error("Invalid email or password");
      }
      if (!user.isActive) {
        throw new Error("Account is disabled");
      }
      
      // Remove password from user object before storing
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword as User);
      toast({ title: settings.language === 'ar' ? "مرحباً بعودتك!" : "Welcome back!", description: `${user.name} (${user.role})` });
    } catch (e: any) {
      toast({ title: settings.language === 'ar' ? "فشل تسجيل الدخول" : "Login Failed", description: e.message, variant: "destructive" });
      throw e;
    }
  };

  const logout = async () => {
    logActivity("Logout", "User logged out", "users");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) { console.debug(err); }
    setCurrentUser(null);
    clearCsrfToken();
    queryClient.clear();
    toast({ title: "Logged out" });
  };

  const hasPermission = (module: Module, action: Action): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const row = permissionRows.find(p => p.role === currentUser.role && p.module === module);
    return row?.actions?.includes(action) ?? false;
  };

  const updatePermission = async (role: Role, module: Module, action: Action, granted: boolean) => {
    const row = permissionRows.find(p => p.role === role && p.module === module);
    let actions = row?.actions ? [...row.actions] : [];
    if (granted) { actions = Array.from(new Set([...actions, action])); }
    else { actions = actions.filter(a => a !== action); }
    await apiRequest("PUT", "/api/permissions", { role, module, actions });
    invalidate("/api/permissions");
    toast({ title: "Permissions Updated" });
  };

  // Users
  const addUser = async (data: any) => {
    await apiRequest("POST", "/api/users", { ...data, password: "password123", isActive: true });
    invalidate("/api/users");
    logActivity("Create User", `Created user ${data.name}`, "users");
    toast({ title: "User Added" });
  };
  const updateUser = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/users/${id}`, data);
    invalidate("/api/users");
    logActivity("Update User", `Updated user ${id}`, "users");
    toast({ title: "User Updated" });
  };
  const deleteUser = async (id: string) => {
    await apiRequest("DELETE", `/api/users/${id}`);
    invalidate("/api/users");
    logActivity("Delete User", `Deleted user ${id}`, "users");
    toast({ title: "User Deleted" });
  };
  const toggleUserStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (user) {
      await apiRequest("PATCH", `/api/users/${id}`, { isActive: !user.isActive });
      invalidate("/api/users");
      toast({ title: "Status Updated" });
    }
  };
  const resetUserPassword = async (id: string, newPassword?: string) => {
    const pw = newPassword || "password123";
    try {
      await apiRequest("POST", `/api/users/${id}/change-password`, { newPassword: pw });
      toast({ title: "Password Updated", description: newPassword ? "Password changed successfully" : "Password reset to default (password123)" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Posts
  const addPost = async (data: any) => {
    await apiRequest("POST", "/api/posts", data);
    invalidate("/api/posts");
    logActivity("Create Post", "Created post", "content");
  };
  const updatePost = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/posts/${id}`, data);
    invalidate("/api/posts");
  };
  const deletePost = async (id: string) => {
    await apiRequest("DELETE", `/api/posts/${id}`);
    invalidate("/api/posts");
  };

  // Sections
  const addSection = async (data: any) => {
    await apiRequest("POST", "/api/sections", data);
    invalidate("/api/sections");
  };
  const updateSection = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/sections/${id}`, data);
    invalidate("/api/sections");
  };
  const deleteSection = async (id: string) => {
    await apiRequest("DELETE", `/api/sections/${id}`);
    invalidate("/api/sections");
  };
  const reorderSections = () => {};

  // Forms
  const addForm = async (data: any) => {
    await apiRequest("POST", "/api/forms", data);
    invalidate("/api/forms");
  };
  const updateForm = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/forms/${id}`, data);
    invalidate("/api/forms");
  };
  const deleteForm = async (id: string) => {
    await apiRequest("DELETE", `/api/forms/${id}`);
    invalidate("/api/forms");
  };

  // Reports
  const deleteReport = async (id: string) => {
    await apiRequest("DELETE", `/api/reports/${id}`);
    invalidate("/api/reports");
  };
  const generateReport = async (type: string) => {
    await apiRequest("POST", "/api/reports", { title: "Generated Report", type, generatedBy: currentUser?.id || "1", status: "completed" });
    invalidate("/api/reports");
  };

  // NCRs - Local implementation
  const addNCR = async (data: any): Promise<NCR> => {
    const newNcr: NCR = {
      id: Date.now().toString(),
      refNo: `NCR-${new Date().getFullYear()}-${String(ncrs.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || '1',
      status: 'draft',
      severity: 'medium',
      ...data,
    };
    setNcrs(prev => [...prev, newNcr]);
    toast({ title: "NCR Created" });
    return newNcr;
  };
  const updateNCR = async (id: string, data: any) => {
    setNcrs(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    toast({ title: "NCR Updated" });
  };
  const deleteNCR = async (id: string) => {
    setNcrs(prev => prev.filter(n => n.id !== id));
    toast({ title: "NCR Deleted" });
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendNCREmail = async (_ncrId: string, _extraRecipients: string[] = []) => {
    toast({ title: "Email Sent", description: `NCR details sent to recipients.` });
  };

  const updateSettings = async (data: Partial<SiteSettings>) => {
    setLocalSettings(prev => {
      const updated = { ...prev, ...data };
      if (data.branding?.companyLogo) {
        setReportSettingsData(r => ({ ...r, companyLogo: data.branding!.companyLogo }));
      }
      return updated;
    });
    toast({ title: data.language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved' });
  };
  const updateEmailConfig = async (data: Partial<EmailConfig>) => {
    await apiRequest("PATCH", "/api/email-settings", data);
    invalidate("/api/email-settings");
    logActivity("Update Email Config", "Updated email settings", "settings");
    toast({ title: "Email Settings Saved" });
  };
  const sendTestEmail = async (to: string) => {
    await apiRequest("POST", "/api/email-settings/test", { to });
    logActivity("Send Test Email", `Sent test email to ${to}`, "settings");
    toast({ title: "Test Email Sent", description: `Check inbox for ${to}` });
  };

  // Departments
  const addDepartment = async (data: any) => {
    await apiRequest("POST", "/api/departments", data);
    invalidate("/api/departments");
    logActivity("Add Department", `Added department ${data.name}`, "settings");
  };
  const deleteDepartment = async (id: string) => {
    await apiRequest("DELETE", `/api/departments/${id}`);
    invalidate("/api/departments");
    logActivity("Delete Department", `Deleted department ${id}`, "settings");
  };

  // Employees
  const addEmployee = async (data: any) => {
    await apiRequest("POST", "/api/employees", data);
    invalidate("/api/employees");
    logActivity("Add Employee", `Added employee ${data.name}`, "settings");
  };
  const updateEmployee = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/employees/${id}`, data);
    invalidate("/api/employees");
    logActivity("Update Employee", `Updated employee ${id}`, "settings");
  };
  const deleteEmployee = async (id: string) => {
    await apiRequest("DELETE", `/api/employees/${id}`);
    invalidate("/api/employees");
    logActivity("Delete Employee", `Deleted employee ${id}`, "settings");
  };

  // Routing Rules
  const addRoutingRule = async (data: any) => {
    await apiRequest("POST", "/api/routing-rules", data);
    invalidate("/api/routing-rules");
    logActivity("Add Routing Rule", "Added routing rule", "settings");
  };
  const deleteRoutingRule = async (id: string) => {
    await apiRequest("DELETE", `/api/routing-rules/${id}`);
    invalidate("/api/routing-rules");
    logActivity("Delete Routing Rule", `Deleted rule ${id}`, "settings");
  };

  // Safety Reports - Local implementation
  const addSafetyReport = async (data: any): Promise<SafetyReport> => {
    const newReport: SafetyReport = {
      id: Date.now().toString(),
      reportNo: `SOR-${new Date().getFullYear()}-${String(safetyReports.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || '1',
      status: 'open',
      riskLevel: 'medium',
      observationId: null,
      time: null,
      location: null,
      department: null,
      observerName: null,
      category: null,
      observationDescription: null,
      correctiveAction: null,
      image1: null,
      image2: null,
      image3: null,
      image4: null,
      updatedAt: null,
      sourceFile: null,
      sourceMetadata: null,
      ...data,
    };
    setSafetyReports(prev => [...prev, newReport]);
    toast({ title: settings.language === 'ar' ? 'تم إنشاء التقرير' : 'Report Created' });
    return newReport;
  };
  const updateSafetyReport = async (id: string, data: any) => {
    setSafetyReports(prev => prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r));
    toast({ title: settings.language === 'ar' ? 'تم تحديث التقرير' : 'Report Updated' });
  };
  const deleteSafetyReport = async (id: string) => {
    setSafetyReports(prev => prev.filter(r => r.id !== id));
    toast({ title: settings.language === 'ar' ? 'تم حذف التقرير' : 'Report Deleted' });
  };
  const updateReportSettingsFn = async (data: any) => {
    setReportSettingsData(prev => ({ ...prev, ...data }));
    logActivity("Update Report Settings", "Updated report settings", "settings");
    toast({ title: settings.language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved' });
  };

  // Documents
  const addDocument = async (data: any): Promise<DocumentItem> => {
    const res = await apiRequest("POST", "/api/documents", data);
    const doc = await res.json();
    invalidate("/api/documents");
    logActivity("Create Document", `Created ${data.docType}: ${data.title}`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم إنشاء المستند' : 'Document Created' });
    return doc;
  };
  const updateDocument = async (id: string, data: any) => {
    await apiRequest("PATCH", `/api/documents/${id}`, data);
    invalidate("/api/documents");
    logActivity("Update Document", `Updated document ${id}`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم تحديث المستند' : 'Document Updated' });
  };
  const deleteDocument = async (id: string) => {
    await apiRequest("DELETE", `/api/documents/${id}`);
    invalidate("/api/documents");
    logActivity("Delete Document", `Deleted document ${id}`, "documents");
    toast({ title: settings.language === 'ar' ? 'تم حذف المستند' : 'Document Deleted' });
  };
  const updateSectionConfigFn = async (sectionType: string, data: any) => {
    await apiRequest("PUT", `/api/section-config/${sectionType}`, data);
    invalidate("/api/section-config");
    logActivity("Update Section Config", `Updated config for ${sectionType}`, "settings");
    toast({ title: settings.language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved' });
  };

  const toggleLanguage = () => {
    const newLang = settings.language === "en" ? "ar" : "en";
    updateSettings({ language: newLang });
  };
  const toggleTheme = () => {
    const newTheme = settings.theme === "light" ? "dark" : "light";
    updateSettings({ theme: newTheme });
  };
  const setColorTheme = (ct: ColorTheme) => {
    updateSettings({ colorTheme: ct });
  };

  const exportData = () => {
    const data = { users, posts, sections, forms, reports, ncrs, settings, emailConfig, departments, employees, routingRules, safetySigns };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `board_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    logActivity("Export Data", "Exported system data backup", "settings");
    toast({ title: "Export Complete" });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const importData = (_jsonData: string): boolean => {
    toast({ title: "Import", description: "Use the API for bulk import." });
    return false;
  };

  return (
    <DataContext.Provider value={{
      users, posts, sections, forms, reports, ncrs, activityLogs,
      settings, emailConfig, departments, employees, routingRules, permissionRows,
      currentUser, isAuthenticated, isLoading,
      login, logout, hasPermission, updatePermission,
      addUser, updateUser, deleteUser, toggleUserStatus, resetUserPassword,
      addPost, updatePost, deletePost,
      addSection, updateSection, deleteSection, reorderSections,
      addForm, updateForm, deleteForm,
      deleteReport, generateReport,
      addNCR, updateNCR, deleteNCR, sendNCREmail,
      updateSettings, updateEmailConfig, sendTestEmail,
      addDepartment, deleteDepartment,
      addEmployee, updateEmployee, deleteEmployee,
      addRoutingRule, deleteRoutingRule,
      safetyReports, reportSettingsData, addSafetyReport, updateSafetyReport, deleteSafetyReport, updateReportSettings: updateReportSettingsFn,
      toggleLanguage, toggleTheme, setColorTheme, exportData, importData, logActivity,
      documents, sectionConfigs, addDocument, updateDocument, deleteDocument, updateSectionConfig: updateSectionConfigFn,
      safetySigns, addSafetySign, updateSafetySign, deleteSafetySign, recordSignPrint, recordSignView
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

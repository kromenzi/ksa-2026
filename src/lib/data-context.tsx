import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SafetySign } from "@/types";

export type Role = "admin" | "manager" | "editor" | "viewer";
export type Module = "users" | "content" | "sections" | "forms" | "reports" | "settings" | "activity" | "ncr" | "documents";
export type Action = "create" | "read" | "update" | "delete" | "send_email";
export type ColorTheme = "ocean" | "emerald" | "violet";

export interface User { id: string; name: string; email: string; password?: string; role: Role; isActive: boolean; avatar?: string | null; joinedAt: string; [key: string]: any; }
export interface Section { id: string; name: string; slug: string; description?: string | null; isVisible: boolean; order: number; [key: string]: any; }
export interface FormField { id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[]; [key: string]: any; }
export interface FormTemplate { id: string; title: string; description?: string | null; fields: FormField[]; createdAt: string; status: string; [key: string]: any; }
export interface Report { id: string; title: string; type: string; generatedBy: string; createdAt: string; status: string; data?: any; [key: string]: any; }
export interface SafetyReport { id: string; reportNo: string; observationId: string | null; date: string; time: string | null; location: string | null; department: string | null; observerName: string | null; riskLevel: string; category: string | null; status: string; observationDescription: string | null; correctiveAction: string | null; image1: string | null; image2: string | null; image3: string | null; image4: string | null; createdBy: string; createdAt: string; updatedAt: string | null; sourceFile: string | null; sourceMetadata: any; [key: string]: any; }
export interface ReportSettingsData { id: string; plantPrefix: string; dateFormat: string; resetRule: string; companyName: string; companyLogo: string | null; templateTitle: string; publicBaseUrl: string | null; [key: string]: any; }
export interface Post { id: string; title: string; content: string; authorId: string; sectionId?: string | null; status: string; createdAt: string; tags: string[] | null; [key: string]: any; }
export interface ActivityLog { id: string; action: string; details: string; performedBy: string; performedByName: string; timestamp: string; module: Module; [key: string]: any; }
export interface NCR { id: string; refNo: string; date: string; department: string; location: string | null; description: string; severity: string; immediateAction?: string | null; rootCause?: string | null; correctiveAction?: string | null; correctiveActions?: any[] | null; responsiblePersonId?: string | null; dueDate?: string | null; verificationNotes?: string | null; closedAt?: string | null; image1?: string | null; image2?: string | null; image3?: string | null; image4?: string | null; status: string; createdAt: string; createdBy: string; sourceFile?: string | null; sourceMetadata?: any; [key: string]: any; }
export interface Department { id: string; name: string; code: string; [key: string]: any; }
export interface Employee { id: string; name: string; email: string; title: string; departmentId: string; isPrimary: boolean; [key: string]: any; }
export interface RoutingRule { id: string; departmentId?: string | null; severity?: string | null; recipientIds: string[] | null; [key: string]: any; }
export interface DocumentItem { id: string; docType: string; refNo: string; title: string; date: string; vendor: string | null; department: string | null; status: string; category: string | null; description: string | null; amount: string | null; expiryDate: string | null; metadata: any; pdfUrl: string | null; extractedData: any; createdBy: string; createdAt: string; updatedAt: string | null; [key: string]: any; }
export interface SectionConfigData { id?: string; sectionType: string; categories: string[] | null; requiredFields: string[] | null; numberPrefix: string | null; numberFormat: string; [key: string]: any; }
export interface DocumentBranding { [key: string]: any; companyName: string; companyLogo: string; }
export interface SiteSettings { id: string; siteName: string; description: string; allowRegistration: boolean; maintenanceMode: boolean; language: "en" | "ar"; theme: "light" | "dark"; colorTheme?: ColorTheme; branding?: DocumentBranding; [key: string]: any; }
export interface EmailConfig { id: string; smtpHost: string; smtpPort: string; username: string; password?: string | null; fromName: string; fromEmail: string; enableSending: boolean; signature?: string | null; [key: string]: any; }
export interface PermissionRow { id: string; role: string; module: string; actions: string[] | null; [key: string]: any; }

interface DataContextType {
  users: User[]; posts: Post[]; sections: Section[]; forms: FormTemplate[]; reports: Report[]; ncrs: NCR[]; activityLogs: ActivityLog[]; settings: SiteSettings; emailConfig: EmailConfig; departments: Department[]; employees: Employee[]; routingRules: RoutingRule[]; permissionRows: PermissionRow[]; currentUser: User | null; isAuthenticated: boolean; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>; logout: () => void; hasPermission: (module: Module, action: Action) => boolean; updatePermission: (role: Role, module: Module, action: Action, granted: boolean) => Promise<void>;
  addUser: (data: any) => Promise<void>; updateUser: (id: string, data: any) => Promise<void>; deleteUser: (id: string) => Promise<void>; toggleUserStatus: (id: string) => Promise<void>; resetUserPassword: (id: string, newPassword?: string) => Promise<void>;
  addPost: (data: any) => Promise<void>; updatePost: (id: string, data: any) => Promise<void>; deletePost: (id: string) => Promise<void>;
  addSection: (data: any) => Promise<void>; updateSection: (id: string, data: any) => Promise<void>; deleteSection: (id: string) => Promise<void>; reorderSections: (draggedId: string, targetId: string) => Promise<void>;
  addForm: (data: any) => Promise<void>; updateForm: (id: string, data: any) => Promise<void>; deleteForm: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>; generateReport: (type: string) => Promise<void>;
  addNCR: (data: any) => Promise<NCR>; updateNCR: (id: string, data: any) => Promise<void>; deleteNCR: (id: string) => Promise<void>; sendNCREmail: (id: string, extraRecipients?: string[]) => Promise<void>;
  updateSettings: (data: Partial<SiteSettings>) => Promise<void>; updateEmailConfig: (data: Partial<EmailConfig>) => Promise<void>; addDepartment: (data: any) => Promise<void>; deleteDepartment: (id: string) => Promise<void>; addEmployee: (data: any) => Promise<void>; updateEmployee: (id: string, data: any) => Promise<void>; deleteEmployee: (id: string) => Promise<void>; addRoutingRule: (data: any) => Promise<void>; deleteRoutingRule: (id: string) => Promise<void>;
  safetyReports: SafetyReport[]; reportSettingsData: ReportSettingsData; addSafetyReport: (data: any) => Promise<SafetyReport>; updateSafetyReport: (id: string, data: any) => Promise<void>; deleteSafetyReport: (id: string) => Promise<void>; updateReportSettings: (data: Partial<ReportSettingsData>) => Promise<void>;
  sendTestEmail: (to: string) => Promise<void>; toggleLanguage: () => void; toggleTheme: () => void; setColorTheme: (theme: ColorTheme) => void; exportData: () => void; importData: (jsonData: string) => boolean; logActivity: (action: string, details: string, module: Module) => Promise<void>;
  documents: DocumentItem[]; sectionConfigs: SectionConfigData[]; addDocument: (data: any) => Promise<DocumentItem>; updateDocument: (id: string, data: any) => Promise<void>; deleteDocument: (id: string) => Promise<void>; updateSectionConfig: (sectionType: string, data: any) => Promise<void>;
  safetySigns: SafetySign[]; addSafetySign: (data: Partial<SafetySign>) => Promise<SafetySign>; updateSafetySign: (id: string, data: Partial<SafetySign>) => Promise<void>; deleteSafetySign: (id: string) => Promise<void>; recordSignPrint: (id: string) => void; recordSignView: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const snakeToCamel = (v: any): any => Array.isArray(v) ? v.map(snakeToCamel) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, val]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), snakeToCamel(val)])) : v;
const camelToSnake = (v: any): any => Array.isArray(v) ? v.map(camelToSnake) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith("_")).map(([k, val]) => [k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`), camelToSnake(val)])) : v;

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const text = await response.text();
  let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  return snakeToCamel(body);
}

const initialSettings: SiteSettings = { id: "main", siteName: "ABDULKAREM SAFETY BOARD", description: "", allowRegistration: true, maintenanceMode: false, language: "en", theme: "dark", colorTheme: "emerald", branding: { companyName: "ABDULKAREM SAFETY BOARD", companyLogo: "/logo.png" } };
const initialEmail: EmailConfig = { id: "main", smtpHost: "", smtpPort: "587", username: "", fromName: "", fromEmail: "", enableSending: false, signature: null };

export function DataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]); const [posts, setPosts] = useState<Post[]>([]); const [sections, setSections] = useState<Section[]>([]); const [forms, setForms] = useState<FormTemplate[]>([]); const [reports, setReports] = useState<Report[]>([]); const [ncrs, setNcrs] = useState<NCR[]>([]); const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); const [departments, setDepartments] = useState<Department[]>([]); const [employees, setEmployees] = useState<Employee[]>([]); const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]); const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]); const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]); const [documents, setDocuments] = useState<DocumentItem[]>([]); const [sectionConfigs, setSectionConfigs] = useState<SectionConfigData[]>([]); const [emailConfig, setEmailConfig] = useState<EmailConfig>(initialEmail); const [settings, setSettings] = useState<SiteSettings>(initialSettings); const [reportSettingsData, setReportSettingsData] = useState<ReportSettingsData>({ id: "main", plantPrefix: "MV", dateFormat: "DDMMYYYY", resetRule: "daily", companyName: "ABDULKAREM SAFETY BOARD", companyLogo: null, templateTitle: "Safety Observation Report", publicBaseUrl: null }); const [safetySigns, setSafetySigns] = useState<SafetySign[]>(() => { try { return JSON.parse(localStorage.getItem("board_safety_signs") || "[]"); } catch { return []; } });
  const isAuthenticated = !!currentUser;

  const loadAll = useCallback(async () => {
    const specs: Array<[string, (v: any[]) => void]> = [["/api/users", setUsers],["/api/posts", setPosts],["/api/sections", setSections],["/api/forms", setForms],["/api/reports", setReports],["/api/ncr", setNcrs],["/api/activity-logs", setActivityLogs],["/api/departments", setDepartments],["/api/employees", setEmployees],["/api/routing-rules", setRoutingRules],["/api/permissions", setPermissionRows],["/api/safety-reports", setSafetyReports],["/api/documents", setDocuments],["/api/section-config", setSectionConfigs]];
    await Promise.all(specs.map(async ([path, setter]) => { try { const data = await api(path); setter(Array.isArray(data) ? data : data?.items || []); } catch { /* endpoint may be unavailable until its module is migrated */ } }));
    try { setEmailConfig(await api("/api/email-settings")); } catch {}
    try { setSettings(await api("/api/settings")); } catch { try { setSettings(JSON.parse(localStorage.getItem("board_settings") || "null") || initialSettings); } catch {} }
    try { setReportSettingsData(await api("/api/report-settings")); } catch {}
  }, []);

  useEffect(() => { (async () => { setIsLoading(true); try { const me = await api("/api/auth/me"); setCurrentUser(me); await loadAll(); } catch {} finally { setIsLoading(false); } })(); }, [loadAll]);
  useEffect(() => { localStorage.setItem("board_safety_signs", JSON.stringify(safetySigns)); }, [safetySigns]);
  useEffect(() => { document.documentElement.dir = settings.language === "ar" ? "rtl" : "ltr"; document.documentElement.lang = settings.language; document.documentElement.classList.toggle("dark", settings.theme === "dark"); document.documentElement.classList.add(`theme-${settings.colorTheme || "emerald"}`); }, [settings]);

  const refresh = useCallback(async (key: string) => { try { const data = await api(key); return Array.isArray(data) ? data : data?.items || []; } catch { return []; } }, []);
  const invalidate = async (path: string, setter?: (v: any[]) => void) => { const data = await refresh(path); if (setter) setter(data); };
  const login = async (email: string, password: string) => { const user = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); setCurrentUser(user); await loadAll(); toast({ title: settings.language === "ar" ? "تم تسجيل الدخول" : "Login successful" }); };
  const logout = async () => { try { await api("/api/auth/logout", { method: "POST" }); } finally { setCurrentUser(null); } };
  const hasPermission = (module: Module, action: Action) => { if (!currentUser) return false; if (currentUser.role === "admin") return true; return permissionRows.find(p => p.role === currentUser.role && p.module === module)?.actions?.includes(action) ?? false; };
  const updatePermission = async (role: Role, module: Module, action: Action, granted: boolean) => { const row = permissionRows.find(p => p.role === role && p.module === module); const actions = new Set(row?.actions || []); granted ? actions.add(action) : actions.delete(action); await api("/api/permissions", { method: "PUT", body: JSON.stringify({ role, module, actions: [...actions] }) }); await invalidate("/api/permissions", setPermissionRows); };

  const crud = async (base: string, setter: (v: any[]) => void, method: string, id: string | null, data?: any) => { const result = await api(id ? `${base}/${encodeURIComponent(id)}` : base, { method, body: method === "DELETE" ? undefined : JSON.stringify(camelToSnake(data || {})) }); await invalidate(base, setter); return result; };
  const addNCR = async (data: any) => crud("/api/ncr", setNcrs, "POST", null, data);
  const updateNCR = async (id: string, data: any) => { await crud("/api/ncr", setNcrs, "PATCH", id, data); };
  const deleteNCR = async (id: string) => { await crud("/api/ncr", setNcrs, "DELETE", id); };
  const sendNCREmail = async (id: string, extraRecipients: string[] = []) => { await api("/api/ncr/send", { method: "POST", body: JSON.stringify({ ncrId: id, extraRecipients }) }); };
  const addSafetyReport = async (data: any) => crud("/api/safety-reports", setSafetyReports, "POST", null, data);
  const updateSafetyReport = async (id: string, data: any) => { await crud("/api/safety-reports", setSafetyReports, "PATCH", id, data); };
  const deleteSafetyReport = async (id: string) => { await crud("/api/safety-reports", setSafetyReports, "DELETE", id); };
  const addDocument = async (data: any) => crud("/api/documents", setDocuments, "POST", null, data);
  const updateDocument = async (id: string, data: any) => { await crud("/api/documents", setDocuments, "PATCH", id, data); };
  const deleteDocument = async (id: string) => { await crud("/api/documents", setDocuments, "DELETE", id); };
  const addDepartment = async (data: any) => { await crud("/api/departments", setDepartments, "POST", null, data); };
  const deleteDepartment = async (id: string) => { await crud("/api/departments", setDepartments, "DELETE", id); };
  const addEmployee = async (data: any) => { await crud("/api/employees", setEmployees, "POST", null, data); };
  const updateEmployee = async (id: string, data: any) => { await crud("/api/employees", setEmployees, "PATCH", id, data); };
  const deleteEmployee = async (id: string) => { await crud("/api/employees", setEmployees, "DELETE", id); };
  const addUser = async (data: any) => { await crud("/api/users", setUsers, "POST", null, data); };
  const updateUser = async (id: string, data: any) => { await crud("/api/users", setUsers, "PATCH", id, data); };
  const deleteUser = async (id: string) => { await crud("/api/users", setUsers, "DELETE", id); };
  const toggleUserStatus = async (id: string) => { const user = users.find(u => u.id === id); if (user) await updateUser(id, { isActive: !user.isActive }); };
  const resetUserPassword = async (id: string, newPassword?: string) => { await api(`/api/users/${encodeURIComponent(id)}/change-password`, { method: "POST", body: JSON.stringify({ newPassword: newPassword || "" }) }); };
  const addPost = async (data: any) => { await crud("/api/posts", setPosts, "POST", null, data); }; const updatePost = async (id: string, data: any) => { await crud("/api/posts", setPosts, "PATCH", id, data); }; const deletePost = async (id: string) => { await crud("/api/posts", setPosts, "DELETE", id); };
  const addSection = async (data: any) => { await crud("/api/sections", setSections, "POST", null, data); }; const updateSection = async (id: string, data: any) => { await crud("/api/sections", setSections, "PATCH", id, data); }; const deleteSection = async (id: string) => { await crud("/api/sections", setSections, "DELETE", id); }; const reorderSections = async () => {};
  const addForm = async (data: any) => { await crud("/api/forms", setForms, "POST", null, data); }; const updateForm = async (id: string, data: any) => { await crud("/api/forms", setForms, "PATCH", id, data); }; const deleteForm = async (id: string) => { await crud("/api/forms", setForms, "DELETE", id); };
  const deleteReport = async (id: string) => { await crud("/api/reports", setReports, "DELETE", id); }; const generateReport = async (type: string) => { await crud("/api/reports", setReports, "POST", null, { title: "Generated Report", type, generatedBy: currentUser?.id }); };
  const addRoutingRule = async (data: any) => { await crud("/api/routing-rules", setRoutingRules, "POST", null, data); }; const deleteRoutingRule = async (id: string) => { await crud("/api/routing-rules", setRoutingRules, "DELETE", id); };
  const updateSettings = async (data: Partial<SiteSettings>) => { try { const result = await api("/api/settings", { method: "PATCH", body: JSON.stringify(camelToSnake(data)) }); setSettings(result); } catch { setSettings(prev => ({ ...prev, ...data })); localStorage.setItem("board_settings", JSON.stringify({ ...settings, ...data })); } };
  const updateEmailConfig = async (data: Partial<EmailConfig>) => { const result = await api("/api/email-settings", { method: "PATCH", body: JSON.stringify(camelToSnake(data)) }); setEmailConfig(result); };
  const sendTestEmail = async (to: string) => { await api("/api/email-settings/test", { method: "POST", body: JSON.stringify({ to }) }); };
  const updateReportSettings = async (data: Partial<ReportSettingsData>) => { const result = await api("/api/report-settings", { method: "PATCH", body: JSON.stringify(camelToSnake(data)) }); setReportSettingsData(result); };
  const logActivity = async (action: string, details: string, module: Module) => { if (!currentUser) return; try { await api("/api/activity-logs", { method: "POST", body: JSON.stringify({ action, details, performedBy: currentUser.id, performedByName: currentUser.name, module }) }); await invalidate("/api/activity-logs", setActivityLogs); } catch {} };
  const toggleLanguage = () => setSettings(s => ({ ...s, language: s.language === "ar" ? "en" : "ar" })); const toggleTheme = () => setSettings(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" })); const setColorTheme = (theme: ColorTheme) => setSettings(s => ({ ...s, colorTheme: theme }));
  const exportData = () => { const payload = { users, posts, sections, forms, reports, ncrs, safetyReports, documents, departments, employees, routingRules }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "safety-board-export.json"; a.click(); URL.revokeObjectURL(url); };
  const importData = (_jsonData: string) => false;
  const sectionConfig = async (sectionType: string, data: any) => { const result = await api(`/api/section-config/${encodeURIComponent(sectionType)}`, { method: "PATCH", body: JSON.stringify(camelToSnake(data)) }); setSectionConfigs(prev => prev.map(x => x.sectionType === sectionType ? result : x)); };
  const addSafetySign = async (data: Partial<SafetySign>) => { const item = { ...(data as any), id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as SafetySign; setSafetySigns(prev => [item, ...prev]); return item; };
  const updateSafetySign = async (id: string, data: Partial<SafetySign>) => setSafetySigns(prev => prev.map(x => x.id === id ? { ...x, ...data, updatedAt: new Date().toISOString() } : x));
  const deleteSafetySign = async (id: string) => setSafetySigns(prev => prev.filter(x => x.id !== id)); const recordSignPrint = (id: string) => setSafetySigns(prev => prev.map(x => x.id === id ? { ...x, printCount: (x.printCount || 0) + 1 } : x)); const recordSignView = (id: string) => setSafetySigns(prev => prev.map(x => x.id === id ? { ...x, viewCount: (x.viewCount || 0) + 1 } : x));

  const value = useMemo<DataContextType>(() => ({ users, posts, sections, forms, reports, ncrs, activityLogs, settings, emailConfig, departments, employees, routingRules, permissionRows, currentUser, isAuthenticated, isLoading, login, logout, hasPermission, updatePermission, addUser, updateUser, deleteUser, toggleUserStatus, resetUserPassword, addPost, updatePost, deletePost, addSection, updateSection, deleteSection, reorderSections, addForm, updateForm, deleteForm, deleteReport, generateReport, addNCR, updateNCR, deleteNCR, sendNCREmail, updateSettings, updateEmailConfig, addDepartment, deleteDepartment, addEmployee, updateEmployee, deleteEmployee, addRoutingRule, deleteRoutingRule, safetyReports, reportSettingsData, addSafetyReport, updateSafetyReport, deleteSafetyReport, updateReportSettings, sendTestEmail, toggleLanguage, toggleTheme, setColorTheme, exportData, importData, logActivity, documents, sectionConfigs, addDocument, updateDocument, deleteDocument, updateSectionConfig: sectionConfig, safetySigns, addSafetySign, updateSafetySign, deleteSafetySign, recordSignPrint, recordSignView }), [users, posts, sections, forms, reports, ncrs, activityLogs, settings, emailConfig, departments, employees, routingRules, permissionRows, currentUser, isAuthenticated, isLoading, safetyReports, reportSettingsData, documents, sectionConfigs, safetySigns]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() { const context = useContext(DataContext); if (!context) throw new Error("useData must be used within DataProvider"); return context; }
export { DataContext };

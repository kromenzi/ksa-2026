import { Link, useLocation } from "wouter";
import { GlobalPrintTemplate, GlobalPrintFooter } from "@/components/global-print-template";
import { GlobalSearchDialog } from "@/components/global-search-dialog";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Newspaper, 
  Settings, 
  LogOut, 
  Menu,
  Globe,
  Bell,
  Search,
  ClipboardList,
  History,
  Moon,
  Sun,
  ShieldAlert,
  ServerCog,
  FileCheck2,
  ScrollText,
  FileText,
  Inbox,
  BellRing,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeft,
  BadgeCheck,
  Shield,
  Palette,
  Trophy,
  FileSpreadsheet,
  FileBadge,
  FileArchive,
  MessagesSquare,
  Boxes,
  CreditCard,
  Factory,
  Workflow,
  GraduationCap,
  Award,
  Grid,
  AlertTriangle,
  ClipboardCheck,
  FileCheck,
  Lock, MapPin,  Activity,  
  HardDrive,
  UserCheck,
  Flame,
  ShieldCheck,
  Truck,
  Wrench,
  
  Zap,
  Clock,
  Triangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ColorTheme } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NavGroup {
  title: string;
  titleAr: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: any;
  href: string;
  visible: boolean;
  color: string;
  bgColor: string;
  children?: NavItem[];
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentUser, settings, toggleLanguage, toggleTheme, setColorTheme, hasPermission } = useData();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  const isAr = settings.language === 'ar';

  const toggleItem = (key: string) => {
    setCollapsedItems(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const toggleGroup = (index: number) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [index]: !(prev[index] ?? true)
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navGroups: NavGroup[] = [

    {
      title: "ESP Safety Vision",
      titleAr: "رؤية السلامة الذكية",
      items: [
        { label: isAr ? 'لوحة القيادة' : 'Vision Dashboard', icon: LayoutDashboard, href: "/admin/vision/dashboard", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'المراقبة المباشرة' : 'Live Monitoring', icon: Grid, href: "/admin/vision/live", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'إدارة الكاميرات' : 'Camera Management', icon: Shield, href: "/admin/vision/cameras", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'أجهزة الحافة (ESP)' : 'Edge Devices (ESP)', icon: ServerCog, href: "/admin/vision/devices", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'خريطة المصنع' : 'Factory Map', icon: MapPin, href: "/admin/vision/map", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'قواعد السلامة' : 'Safety Rules', icon: FileCheck2, href: "/admin/vision/rules", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'أحداث السلامة' : 'Safety Events', icon: ShieldAlert, href: "/admin/vision/events", visible: true, color: "text-rose-500", bgColor: "bg-rose-500/10" },
        { label: isAr ? 'التحليلات' : 'Analytics', icon: Activity, href: "/admin/vision/analytics", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      ]
    },
    {
      title: "Overview",
      titleAr: "نظرة عامة",
      items: [
        { label: isAr ? 'لوحة التحكم الرئيسية' : 'Dashboard', icon: LayoutDashboard, href: "/admin/dashboard", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
      ]
    },
    {
      title: "HSE Operations",
      titleAr: "عمليات السلامة والحوادث",
      items: [
        { label: isAr ? 'الموظفين وسجلات السلامة' : 'Employees & Safety', icon: Users, href: "/admin/employees", visible: true, color: "text-blue-600", bgColor: "bg-blue-600/10" },
        { label: isAr ? 'مخالفات السلامة للموظفين' : 'Employee Safety Violations', icon: ShieldAlert, href: "/admin/employee-violations", visible: true, color: "text-red-600", bgColor: "bg-red-600/10" },
        { label: isAr ? 'تقارير السلامة (SOR)' : 'Safety Reports (SOR)', icon: ShieldAlert, href: "/admin/reports", visible: hasPermission('reports', 'read'), color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
        { label: isAr ? 'الحوادث والوشيكة (RCA)' : 'Incidents & Near Miss', icon: AlertTriangle, href: "/admin/incidents", visible: true, color: "text-red-500", bgColor: "bg-red-500/10" },
        { label: isAr ? 'تقييم المخاطر (5x5)' : 'Risk Assessment', icon: Shield, href: "/admin/risk-assessment", visible: true, color: "text-orange-500", bgColor: "bg-orange-500/10" },
        { label: isAr ? 'تقارير عدم المطابقة (NCR)' : 'Non-Conformance (NCR)', icon: ClipboardList, href: "/admin/ncr", visible: hasPermission('ncr', 'read'), color: "text-amber-500", bgColor: "bg-amber-500/10" },
        { label: isAr ? 'الهرم الأمني (Safety Pyramid)' : 'Safety Pyramid', icon: Triangle, href: "/admin/safety-pyramid", visible: true, color: "text-rose-600", bgColor: "bg-rose-600/10" },
      ]
    },
    {
      title: "Management Escalation",
      titleAr: "تصعيد الإدارة",
      items: [
        { label: isAr ? 'لوحة التصعيد' : 'Escalation Dashboard', icon: LayoutDashboard, href: "/admin/escalations", visible: true, color: "text-rose-500", bgColor: "bg-rose-500/10" },
        { label: isAr ? 'سجل التصعيدات' : 'Escalation History', icon: History, href: "/admin/escalations/history", visible: true, color: "text-orange-500", bgColor: "bg-orange-500/10" },
        { label: isAr ? 'مصفوفة التصعيد' : 'Escalation Matrix', icon: Grid, href: "/admin/escalations/matrix", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      ]
    },
    {
      title: "Audits & Compliance",
      titleAr: "التدقيق والامتثال والتصاريح",
      items: [
        { label: isAr ? 'فحوصات السلامة' : 'Safety Inspections', icon: ClipboardCheck, href: "/admin/inspections", visible: true, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
        { label: isAr ? 'التدقيق ومواصفات ISO' : 'Audits & ISO', icon: FileCheck, href: "/admin/audits", visible: true, color: "text-emerald-600", bgColor: "bg-emerald-600/10" },
        { label: isAr ? 'إدارة الامتثال والمعايير' : 'Compliance Dashboard', icon: ShieldCheck, href: "/admin/compliance", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { label: isAr ? 'عزل الطاقة (LOTO)' : 'Lockout Tagout (LOTO)', icon: Lock, href: "/admin/loto", visible: true, color: "text-rose-600", bgColor: "bg-rose-600/10" },
        { label: isAr ? 'تصاريح العمل (PTW)' : 'Permits (PTW)', icon: FileCheck2, href: "/admin/permits", visible: hasPermission('documents', 'read') || hasPermission('reports', 'read'), color: "text-sky-500", bgColor: "bg-sky-500/10" },
      ]
    },
    {
      title: "Licenses & Equipment Authorization",
      titleAr: "التراخيص وتفويض المعدات",
      items: [
        { label: isAr ? 'لوحة القيادة' : 'Dashboard', icon: LayoutDashboard, href: "/admin/licenses", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { label: isAr ? 'التراخيص' : 'Licenses', icon: CreditCard, href: "/admin/licenses", visible: true, color: "text-amber-500", bgColor: "bg-amber-500/10" },
        { label: isAr ? 'التدريب والكفاءة' : 'Training & Competency', icon: GraduationCap, href: "/admin/trainings", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        {
          label: isAr ? 'تفويض المعدات' : 'Equipment Authorization',
          icon: ShieldCheck, href: "/admin/equipment-auth", visible: true, color: "text-emerald-500", bgColor: "bg-emerald-500/10",
          children: [
            { label: isAr ? 'لوحة تفويض المعدات' : 'Authorization Dashboard', icon: ShieldCheck, href: "/admin/equipment-auth", visible: true, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
            { label: isAr ? 'رافعة شوكية (Forklift)' : 'Forklift', icon: Truck, href: "/admin/equipment-auth", visible: true, color: "text-blue-600", bgColor: "bg-blue-600/10" },
            { label: isAr ? 'ونش علوي (Overhead Crane)' : 'Overhead Crane', icon: Wrench, href: "/admin/equipment-auth", visible: true, color: "text-orange-500", bgColor: "bg-orange-500/10" },
            { label: isAr ? 'رافعات الأفراد (Lifter / Manlift)' : 'Lifter / Manlift', icon: Activity, href: "/admin/equipment-auth", visible: true, color: "text-purple-500", bgColor: "bg-purple-500/10" },
            { label: isAr ? 'منصات العمل المتحركة (MEWP)' : 'MEWP', icon: Truck, href: "/admin/equipment-auth", visible: true, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
            { label: isAr ? 'الربط والإشارات (Rigging & Banksman)' : 'Rigging & Banksman', icon: Award, href: "/admin/equipment-auth", visible: true, color: "text-amber-600", bgColor: "bg-amber-600/10" },
            { label: isAr ? 'التفويض الكهربائي (Electrical)' : 'Electrical Authorization', icon: Zap, href: "/admin/equipment-auth", visible: true, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
            { label: isAr ? 'عزل الطاقة (LOTO)' : 'LOTO Authorization', icon: Lock, href: "/admin/equipment-auth", visible: true, color: "text-rose-600", bgColor: "bg-rose-600/10" },
            { label: isAr ? 'العمل على ارتفاعات' : 'Work at Height', icon: ShieldAlert, href: "/admin/equipment-auth", visible: true, color: "text-sky-600", bgColor: "bg-sky-600/10" },
            { label: isAr ? 'الأماكن المغلقة' : 'Confined Space', icon: AlertTriangle, href: "/admin/equipment-auth", visible: true, color: "text-red-500", bgColor: "bg-red-500/10" },
          ]
        },
        { label: isAr ? 'العناصر منتهية الصلاحية' : 'Expiring Items', icon: Clock, href: "/admin/licenses", visible: true, color: "text-amber-500", bgColor: "bg-amber-500/10" },
        { label: isAr ? 'مصفوفة الكفاءة' : 'Competency Matrix', icon: Grid, href: "/admin/training-matrix", visible: true, color: "text-teal-500", bgColor: "bg-teal-500/10" },
        { label: isAr ? 'تقارير التفويض' : 'Authorization Reports', icon: ScrollText, href: "/admin/enterprise-reports", visible: true, color: "text-slate-400", bgColor: "bg-slate-500/10" },
      ]
    },
    {
      title: "Assets & Emergency",
      titleAr: "الأصول والمرافق والطوارئ",
      items: [
        { label: isAr ? 'أصول السلامة' : 'Safety Assets', icon: HardDrive, href: "/admin/assets", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { label: isAr ? 'الزوار والمقاولون' : 'Visitors & Induction', icon: UserCheck, href: "/admin/visitors", visible: true, color: "text-purple-500", bgColor: "bg-purple-500/10" },
        { label: isAr ? 'إدارة الطوارئ' : 'Emergency & Drills', icon: Flame, href: "/admin/emergency", visible: true, color: "text-red-600", bgColor: "bg-red-600/10" },
        { label: isAr ? 'حماية النيران' : 'Fire Protection', icon: ShieldAlert, href: "/admin/fire-protection", visible: true, color: "text-red-500", bgColor: "bg-red-500/10" },
      ]
    },
    {
      title: "Enterprise Reports",
      titleAr: "التقارير والمستندات",
      items: [
        { label: isAr ? 'المستندات والملفات' : 'Documents', icon: FileArchive, href: "/admin/files", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { label: isAr ? 'اللافتات' : 'Safety Signs', icon: ShieldAlert, href: "/admin/reports-documents/safety-signs", visible: true, color: "text-amber-500", bgColor: "bg-amber-500/10" },
        { label: isAr ? 'التقارير الموحدة 300DPI' : 'Enterprise Reports 300DPI', icon: FileText, href: "/admin/enterprise-reports", visible: true, color: "text-slate-400", bgColor: "bg-slate-500/10" },
        { label: isAr ? 'العقود' : 'Contracts', icon: ScrollText, href: "/admin/contracts", visible: hasPermission('documents', 'read') || hasPermission('reports', 'read'), color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { label: isAr ? 'النماذج' : 'Forms', icon: FileBadge, href: "/admin/forms", visible: hasPermission('forms', 'read'), color: "text-teal-500", bgColor: "bg-teal-500/10" },
        { label: isAr ? 'الفواتير' : 'Invoices', icon: FileSpreadsheet, href: "/admin/invoices", visible: hasPermission('documents', 'read') || hasPermission('reports', 'read'), color: "text-orange-500", bgColor: "bg-orange-500/10" },
      ]
    },
    {
      title: "Communication & Culture",
      titleAr: "الاتصالات وثقافة السلامة",
      items: [
        { label: isAr ? 'أبطال السلامة' : 'Safety Champions', icon: Trophy, href: "/admin/gamification", visible: true, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
        { label: isAr ? 'الأقسام' : 'Sections', icon: Boxes, href: "/admin/sections", visible: hasPermission('sections', 'read'), color: "text-violet-500", bgColor: "bg-violet-500/10" },
        { label: isAr ? 'المنشورات' : 'Posts', icon: Newspaper, href: "/admin/posts", visible: hasPermission('content', 'read'), color: "text-sky-500", bgColor: "bg-sky-500/10" },
        { label: isAr ? 'صندوق الوارد' : 'Inbox', icon: Inbox, href: "/admin/inbound-inbox", visible: hasPermission('settings', 'read'), color: "text-fuchsia-500", bgColor: "bg-fuchsia-500/10" },
        { label: isAr ? 'إعدادات البريد' : 'Email Settings', icon: ServerCog, href: "/admin/email-settings", visible: hasPermission('settings', 'read'), color: "text-rose-500", bgColor: "bg-rose-500/10" },
        { label: isAr ? 'قواعد الإشعارات' : 'Alert Rules', icon: MessagesSquare, href: "/admin/notification-rules", visible: hasPermission('settings', 'read'), color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
      ]
    },
    {
      title: "Administration",
      titleAr: "الإدارة والنظام",
      items: [
        { label: isAr ? 'المستخدمين والصلاحيات' : 'Users & Roles', icon: Users, href: "/admin/users", visible: hasPermission('users', 'read'), color: "text-pink-500", bgColor: "bg-pink-500/10" },
        { label: isAr ? 'سجل النشاط' : 'Activity Log', icon: History, href: "/admin/activity", visible: hasPermission('activity', 'read'), color: "text-slate-400", bgColor: "bg-slate-500/10" },
        { label: isAr ? 'المصانع والمواقع' : 'Plants & Sites', icon: Factory, href: "/admin/plants", visible: hasPermission('settings', 'read'), color: "text-lime-500", bgColor: "bg-lime-500/10" },
        { label: isAr ? 'الربط والتكامل' : 'Integrations', icon: Workflow, href: "/admin/integrations", visible: hasPermission('settings', 'read'), color: "text-blue-400", bgColor: "bg-blue-400/10" },
        { label: isAr ? 'إعدادات النظام' : 'Settings', icon: Settings, href: "/admin/settings", visible: hasPermission('settings', 'read'), color: "text-gray-400", bgColor: "bg-gray-500/10" },
      ]
    },
  ];

  const currentPageLabel = navGroups
    .flatMap(g => g.items)
    .find(item => location === item.href || location.startsWith(`${item.href}/`))?.label || '';

  const currentPageIcon = navGroups
    .flatMap(g => g.items)
    .find(item => location === item.href || location.startsWith(`${item.href}/`));

  const sidebarWidth = isCollapsed ? "w-[64px]" : "w-[245px]";

  const renderSidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full sidebar-glass">
      <div className={cn(
        "flex items-center border-b border-white/[0.06] transition-all duration-300",
        isCollapsed && !mobile ? "p-2 justify-center h-[62px]" : "px-3.5 py-2.5 gap-2.5 h-[62px]"
      )}>
        {isCollapsed && !mobile ? (
          <img 
            src={settings.branding?.companyLogo || "/utec-logo.svg"} 
            alt="Logo" 
            className="h-11 w-11 rounded-xl brand-logo-mark drop-shadow-sm transition-all ring-1 ring-white/15"
            referrerPolicy="no-referrer"
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + '/utec-logo.svg') {
                e.currentTarget.src = '/utec-logo.svg';
              }
            }}
          />
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img 
              src={settings.branding?.companyLogo || "/utec-logo.svg"} 
              alt="Logo" 
              className="h-12 w-[72px] brand-logo-full drop-shadow-sm shrink-0 transition-all"
              referrerPolicy="no-referrer"
              onError={(e) => {
                if (e.currentTarget.src !== window.location.origin + '/utec-logo.svg') {
                  e.currentTarget.src = '/utec-logo.svg';
                }
              }}
            />
            <div className="overflow-hidden flex-1 min-w-0">
              <h1 className="text-[12px] font-bold tracking-tight truncate text-sidebar-foreground leading-tight">
                {settings.siteName}
              </h1>
              <p className="text-[9px] text-white/60 truncate">{isAr ? 'لوحة الإدارة' : 'Admin Panel'}</p>
            </div>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "h-7 w-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white/90 hover:bg-white/5 transition-all shrink-0",
              isCollapsed && "mx-auto mt-1"
            )}
          >
            {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>
      
      <div className="flex-1 py-2 px-2 overflow-y-auto sidebar-scroll">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => item.visible);
          if (visibleItems.length === 0) return null;
          const isGroupCollapsed = collapsedGroups[gi] ?? true;
          return (
            <div key={gi} className={cn("mb-1", gi > 0 && "mt-2.5")}>
              {(!isCollapsed || mobile) && (
                <div 
                  onClick={() => toggleGroup(gi)}
                  className="px-2.5 py-1 mb-1 flex items-center justify-between cursor-pointer select-none rounded-lg hover:bg-white/[0.04] transition-colors group/header"
                >
                  <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase group-hover/header:text-white/80 transition-colors">
                    {isAr ? group.titleAr : group.title}
                  </span>
                  <ChevronDown className={cn("h-3 w-3 text-white/40 transition-transform duration-200", isGroupCollapsed && "-rotate-90 rtl:rotate-90")} />
                </div>
              )}
              {isCollapsed && !mobile && gi > 0 && (
                <div className="mx-2 mb-2 border-t border-white/[0.06]" />
              )}
              {(!isGroupCollapsed || (isCollapsed && !mobile)) && visibleItems.map((item, ii) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                const ItemIcon = item.icon;
                const uniqueKey = `${item.href}-${ii}`;
                const hasChildren = Boolean(item.children?.length);
                const childKey = `${gi}-${ii}`;
                const isItemCollapsed = collapsedItems[childKey] ?? true;
                
                if (isCollapsed && !mobile) {
                  return (
                    <TooltipProvider key={uniqueKey} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            <div 
                              className={cn(
                                "flex items-center justify-center h-8 w-8 mx-auto rounded-lg mb-1 transition-all duration-200 cursor-pointer relative",
                                isActive 
                                  ? "bg-primary/20 text-white shadow-sm ring-1 ring-primary/40" 
                                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                              )}
                              onClick={() => setIsMobileOpen(false)}
                            >
                              {isActive && (
                                <div className="absolute inset-y-1.5 start-0 w-[2.5px] rounded-full bg-primary" />
                              )}
                              <ItemIcon className={cn(
                                "h-3.5 w-3.5 transition-all",
                                isActive ? item.color : "text-white/60 hover:text-white"
                              )} />
                            </div>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side={isAr ? "left" : "right"} className="text-xs font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                if (hasChildren) {
                  return (
                    <div key={uniqueKey} className="mb-1">
                      <button type="button" onClick={() => toggleItem(childKey)} className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all duration-150 group relative mx-1 mb-0.5 text-white/80 hover:bg-white/[0.05] hover:text-white"
                      )}>
                        <div className="h-6 w-6 rounded-md flex items-center justify-center bg-emerald-500/10 shrink-0"><ItemIcon className={cn("h-3.5 w-3.5", item.color)} /></div>
                        <span className="truncate leading-none flex-1 text-start">{item.label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-white/60 transition-transform", isItemCollapsed && "-rotate-90 rtl:rotate-90")} />
                      </button>
                      {!isItemCollapsed && (item.children || []).filter(child => child.visible).map((child, ci) => {
                        const ChildIcon = child.icon;
                        const childActive = location === child.href || location.startsWith(`${child.href}/`);
                        return <Link key={`${child.href}-${ci}`} href={child.href}>
                          <div className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10.5px] transition-all mx-3 mb-0.5 border border-transparent",
                            childActive ? "bg-primary/15 text-white ring-1 ring-primary/20" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                          )} onClick={() => setIsMobileOpen(false)}>
                            <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", childActive ? child.bgColor : "bg-white/[0.03]")}><ChildIcon className={cn("h-3 w-3", childActive ? child.color : "text-white/50")} /></div>
                            <span className="truncate">{child.label}</span>
                          </div>
                        </Link>;
                      })}
                    </div>
                  );
                }

                return (
                  <Link key={uniqueKey} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all duration-150 cursor-pointer group relative mx-1 mb-0.5",
                      isActive ? "bg-primary/15 text-white shadow-sm ring-1 ring-primary/30 font-semibold" : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                    )} onClick={() => setIsMobileOpen(false)}>
                      {isActive && <div className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all duration-150 shrink-0", isActive ? item.bgColor : "bg-white/[0.03] group-hover:bg-white/[0.07]")}>
                        <ItemIcon className={cn("h-3.5 w-3.5 transition-all duration-150", isActive ? item.color : "text-white/50 group-hover:text-white")} />
                      </div>
                      <span className="truncate leading-none">{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 ms-auto text-primary/70 rtl:rotate-180 shrink-0" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className={cn(
        "border-t border-white/[0.06] transition-all duration-300",
        isCollapsed && !mobile ? "p-2" : "p-3"
      )}>
        {isCollapsed && !mobile ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-9 w-9 ring-2 ring-white/10">
              <AvatarImage src={currentUser?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-slate-500/30 to-cyan-600/20 text-white/80 text-[10px] font-bold">
                {currentUser?.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side={isAr ? "left" : "right"} className="text-xs">
                  {isAr ? 'تسجيل الخروج' : 'Logout'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] mb-2 ring-1 ring-white/[0.06]">
              <Avatar className="h-9 w-9 ring-2 ring-white/10">
                <AvatarImage src={currentUser?.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-slate-500/30 to-cyan-600/20 text-white/80 text-[10px] font-bold">
                  {currentUser?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-[12px] font-semibold truncate text-sidebar-foreground">{currentUser?.name}</span>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="h-3 w-3 text-cyan-400/70" />
                  <span className="text-[9px] text-white/60 truncate capitalize">{currentUser?.role}</span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-9 text-[12px]"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 me-2" />
              {isAr ? 'تسجيل الخروج' : 'Logout'}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      <aside className={cn(
        "hidden md:block fixed inset-y-0 z-50 border-e border-border/30 transition-all duration-300",
        isAr ? "right-0" : "left-0",
        sidebarWidth
      )}>
        {renderSidebarContent()}
      </aside>

      <main className={cn(
        "flex-1 flex flex-col min-h-screen w-full max-w-full transition-all duration-300",
        isCollapsed 
          ? "md:ps-[70px]" 
          : "md:ps-[252px]"
      )}>
        <GlobalPrintTemplate />
        <GlobalPrintFooter />
        <header className="h-[58px] border-b border-border/50 bg-background/85 sticky top-0 z-40 px-3 md:px-6 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isAr ? 'right' : 'left'} className="p-0 border-0 overflow-y-auto">
                <SheetTitle className="sr-only">{isAr ? 'القائمة' : 'Menu'}</SheetTitle>
                {renderSidebarContent(true)}
              </SheetContent>
            </Sheet>
            
            {currentPageLabel && (
              <div className="hidden md:flex items-center gap-2.5">
                {currentPageIcon && (
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center ring-1 ring-border/50", currentPageIcon.bgColor)}>
                    <currentPageIcon.icon className={cn("h-[15px] w-[15px]", currentPageIcon.color)} />
                  </div>
                )}
                <div>
                  <h2 className="text-[13px] font-semibold text-foreground leading-tight">{currentPageLabel}</h2>
                  <p className="text-[9px] text-muted-foreground/65 leading-tight">
                    {navGroups.find(g => g.items.some(i => i.href === (currentPageIcon?.href || '')))
                      ? (isAr 
                        ? navGroups.find(g => g.items.some(i => i.href === (currentPageIcon?.href || '')))?.titleAr
                        : navGroups.find(g => g.items.some(i => i.href === (currentPageIcon?.href || '')))?.title)
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 bg-muted/35 hover:bg-muted/60 border border-border/50 rounded-xl py-1.5 ps-3 pe-3 text-[11px] text-muted-foreground transition-all w-52 justify-between me-2 group"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                <span>{isAr ? 'البحث الشامل بالنظام...' : 'Global Search...'}</span>
              </div>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-card/70 border border-border/50 shadow-sm">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="h-8 w-8 rounded-xl hover:bg-background/90 transition-all"
                    >
                      {settings.theme === 'dark' ? (
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <Moon className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isAr ? 'تغيير المظهر' : 'Toggle theme'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Popover>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-background/90 transition-all">
                          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {isAr ? 'تغيير الألوان' : 'Color theme'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent align="end" className="w-48 p-2" sideOffset={8}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {isAr ? 'نمط الألوان' : 'Color Theme'}
                  </p>
                  {([
                    { id: 'ocean' as ColorTheme, label: isAr ? 'أزرق محيطي' : 'Ocean Blue', colors: ['#3b82f6', '#1e40af'] },
                    { id: 'emerald' as ColorTheme, label: isAr ? 'أخضر زمردي' : 'Emerald', colors: ['#10b981', '#047857'] },
                    { id: 'violet' as ColorTheme, label: isAr ? 'بنفسجي ملكي' : 'Royal Violet', colors: ['#8b5cf6', '#6d28d9'] },
                  ]).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setColorTheme(t.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full rounded-xl py-2 px-2 text-[12px] transition-colors",
                        (settings.colorTheme || 'emerald') === t.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <div className="flex gap-0.5">
                        <div className="h-4 w-4 rounded-full" style={{ background: t.colors[0] }} />
                        <div className="h-4 w-4 rounded-full -ms-1.5" style={{ background: t.colors[1] }} />
                      </div>
                      <span>{t.label}</span>
                      {(settings.colorTheme || 'emerald') === t.id && <Check className="h-3 w-3 ms-auto" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleLanguage} 
                      className="h-8 w-8 rounded-xl hover:bg-background/90 transition-all"
                    >
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isAr ? 'English' : 'العربية'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <NotificationBell userId={currentUser?.id} isAr={isAr} />
            </div>

          </div>
        </header>

        <div className="flex-1 p-3 sm:p-4 md:p-5 animate-in fade-in-50 duration-300 overflow-x-hidden">
          {children}
        </div>
        <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </main>
    </div>
  );
}

function NotificationBell({ userId, isAr }: { userId?: string; isAr: boolean }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { currentUser } = useData();
  const isAdmin = currentUser?.role === "admin";

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications", userId, "unread-count"],
    queryFn: async () => {
      if (!userId) return { count: 0 };
      const res = await fetch(`/api/notifications/${userId}/unread-count`);
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId, isAdmin ? "all" : "user"],
    queryFn: async () => {
      if (!userId) return [];
      if (isAdmin) {
        const res = await fetch(`/api/notifications-all`);
        return res.json();
      }
      const res = await fetch(`/api/notifications/${userId}`);
      return res.json();
    },
    enabled: !!userId && open,
  });

  const unreadCount = countData?.count || 0;

  const markRead = async (id: string) => {
    await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const markAllRead = async () => {
    if (!userId) return;
    await apiRequest("POST", `/api/notifications/${userId}/read-all`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await apiRequest("DELETE", `/api/notifications/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const formatNotifTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return isAr ? "الآن" : "Just now";
      if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const getTypeStyles = (type: string) => {
    if (type === "warning") return { bg: "bg-amber-500/10", text: "text-amber-500", icon: ShieldAlert };
    if (type === "error") return { bg: "bg-red-500/10", text: "text-red-500", icon: ShieldAlert };
    if (type === "success") return { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: Check };
    return { bg: "bg-blue-500/10", text: "text-blue-500", icon: Bell };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg hover:bg-background/80 transition-all" data-testid="button-notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 h-[18px] min-w-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 rounded-2xl shadow-2xl border-border/30 overflow-hidden" align="end">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <BellRing className="h-3.5 w-3.5 text-primary" />
            </div>
            {isAr ? 'الإشعارات' : 'Notifications'}
            {notifications.length > 0 && (
              <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground font-normal">{notifications.length}</span>
            )}
          </h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={markAllRead} data-testid="button-mark-all-read">
              <Check className="h-3 w-3 me-1" />
              {isAr ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 opacity-20" />
              </div>
              <p className="font-medium text-muted-foreground/60">{isAr ? 'لا توجد إشعارات' : 'No notifications'}</p>
            </div>
          ) : (
            notifications.slice(0, 20).map((n: any) => {
              const typeStyle = getTypeStyles(n.type);
              const TypeIcon = typeStyle.icon;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-border/20 last:border-0 cursor-pointer hover:bg-muted/30 transition-all group",
                    !n.isRead && "bg-primary/[0.03]"
                  )}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    if (n.linkTo) { setLocation(n.linkTo); setOpen(false); }
                  }}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0", typeStyle.bg)}>
                      <TypeIcon className={cn("h-4 w-4", typeStyle.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-tight", !n.isRead ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</p>
                        <button
                          onClick={(e) => deleteNotification(e, n.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all h-6 w-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive shrink-0"
                          title={isAr ? "حذف" : "Delete"}
                          data-testid={`button-delete-notif-${n.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                        <p className="text-[10px] text-muted-foreground/40">{formatNotifTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { Link, useLocation } from "wouter";
import { GlobalPrintTemplate, GlobalPrintFooter } from "@/components/global-print-template";
import { GlobalSearchDialog } from "@/components/global-search-dialog";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Newspaper, Settings, LogOut, Menu, Globe, Bell, Search, ClipboardList, History, Moon, Sun, ShieldAlert, ServerCog, FileCheck2, ScrollText, FileText, Inbox, BellRing, Check, ChevronRight, ChevronDown, X, PanelLeftClose, PanelLeft, BadgeCheck, Shield, Palette, Trophy, FileSpreadsheet, FileBadge, FileArchive, MessagesSquare, Boxes, CreditCard, Factory, Workflow, GraduationCap, Award, Grid, AlertTriangle, ClipboardCheck, FileCheck, Lock, MapPin, Activity, HardDrive, UserCheck, Flame, ShieldCheck, Truck, Wrench, Zap, Clock, Triangle, FileWarning } from "lucide-react";
import { useState, useEffect } from "react";
import type { ColorTheme } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NavGroup { title: string; titleAr: string; items: NavItem[]; }
interface NavItem { label: string; icon: any; href: string; visible: boolean; color: string; bgColor: string; children?: NavItem[]; }

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentUser, settings, toggleLanguage, toggleTheme, setColorTheme, hasPermission } = useData();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  const isAr = settings.language === 'ar';

  const toggleItem = (key: string) => setCollapsedItems(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  const toggleGroup = (index: number) => setCollapsedGroups(prev => ({ ...prev, [index]: !(prev[index] ?? true) }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setIsSearchOpen(prev => !prev); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navGroups: NavGroup[] = [
    { title: "ESP Safety Vision", titleAr: "رؤية السلامة الذكية", items: [
      { label: isAr ? 'لوحة القيادة' : 'Vision Dashboard', icon: LayoutDashboard, href: "/admin/vision/dashboard", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'المراقبة المباشرة' : 'Live Monitoring', icon: Grid, href: "/admin/vision/live", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'إدارة الكاميرات' : 'Camera Management', icon: Shield, href: "/admin/vision/cameras", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'أجهزة الحافة (ESP)' : 'Edge Devices (ESP)', icon: ServerCog, href: "/admin/vision/devices", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'خريطة المصنع' : 'Factory Map', icon: MapPin, href: "/admin/vision/map", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'قواعد السلامة' : 'Safety Rules', icon: FileCheck2, href: "/admin/vision/rules", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'أحداث السلامة' : 'Safety Events', icon: ShieldAlert, href: "/admin/vision/events", visible: true, color: "text-rose-500", bgColor: "bg-rose-500/10" },
      { label: isAr ? 'التحليلات' : 'Analytics', icon: Activity, href: "/admin/vision/analytics", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    ]},
    { title: "Overview", titleAr: "نظرة عامة", items: [{ label: isAr ? 'لوحة التحكم الرئيسية' : 'Dashboard', icon: LayoutDashboard, href: "/admin/dashboard", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" }] },
    { title: "HSE Operations", titleAr: "عمليات السلامة والحوادث", items: [
      { label: isAr ? 'الموظفين وسجلات السلامة' : 'Employees & Safety', icon: Users, href: "/admin/employees", visible: true, color: "text-blue-600", bgColor: "bg-blue-600/10" },
      { label: isAr ? 'المخالفات والمتابعة' : 'Violations & Follow Up', icon: FileWarning, href: "/admin/violations", visible: true, color: "text-red-600", bgColor: "bg-red-600/10" },
      { label: isAr ? 'تقارير السلامة (SOR)' : 'Safety Reports (SOR)', icon: ShieldAlert, href: "/admin/reports", visible: hasPermission('reports', 'read'), color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
      { label: isAr ? 'الحوادث والوشيكة (RCA)' : 'Incidents & Near Miss', icon: AlertTriangle, href: "/admin/incidents", visible: true, color: "text-red-500", bgColor: "bg-red-500/10" },
      { label: isAr ? 'تقييم المخاطر (5x5)' : 'Risk Assessment', icon: Shield, href: "/admin/risk-assessment", visible: true, color: "text-orange-500", bgColor: "bg-orange-500/10" },
      { label: isAr ? 'تقارير عدم المطابقة (NCR)' : 'Non-Conformance (NCR)', icon: ClipboardList, href: "/admin/ncr", visible: hasPermission('ncr', 'read'), color: "text-amber-500", bgColor: "bg-amber-500/10" },
      { label: isAr ? 'الهرم الأمني (Safety Pyramid)' : 'Safety Pyramid', icon: Triangle, href: "/admin/safety-pyramid", visible: true, color: "text-rose-600", bgColor: "bg-rose-600/10" },
    ]},
    { title: "Management Escalation", titleAr: "تصعيد الإدارة", items: [
      { label: isAr ? 'لوحة التصعيد' : 'Escalation Dashboard', icon: LayoutDashboard, href: "/admin/escalations", visible: true, color: "text-rose-500", bgColor: "bg-rose-500/10" },
      { label: isAr ? 'سجل التصعيدات' : 'Escalation History', icon: History, href: "/admin/escalations/history", visible: true, color: "text-orange-500", bgColor: "bg-orange-500/10" },
      { label: isAr ? 'مصفوفة التصعيد' : 'Escalation Matrix', icon: Grid, href: "/admin/escalations/matrix", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    ]},
    { title: "Audits & Compliance", titleAr: "التدقيق والامتثال والتصاريح", items: [
      { label: isAr ? 'فحوصات السلامة' : 'Safety Inspections', icon: ClipboardCheck, href: "/admin/inspections", visible: true, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
      { label: isAr ? 'التدقيق ومواصفات ISO' : 'Audits & ISO', icon: FileCheck, href: "/admin/audits", visible: true, color: "text-emerald-600", bgColor: "bg-emerald-600/10" },
      { label: isAr ? 'إدارة الامتثال والمعايير' : 'Compliance Dashboard', icon: ShieldCheck, href: "/admin/compliance", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
      { label: isAr ? 'عزل الطاقة (LOTO)' : 'Lockout Tagout (LOTO)', icon: Lock, href: "/admin/loto", visible: true, color: "text-rose-600", bgColor: "bg-rose-600/10" },
      { label: isAr ? 'تصاريح العمل (PTW)' : 'Permits (PTW)', icon: FileCheck2, href: "/admin/permits", visible: hasPermission('documents', 'read') || hasPermission('reports', 'read'), color: "text-sky-500", bgColor: "bg-sky-500/10" },
    ]},
    { title: "Licenses & Equipment Authorization", titleAr: "التراخيص وتفويض المعدات", items: [
      { label: isAr ? 'لوحة القيادة' : 'Dashboard', icon: LayoutDashboard, href: "/admin/licenses", visible: true, color: "text-blue-500", bgColor: "bg-blue-500/10" },
      { label: isAr ? 'التراخيص' : 'Licenses', icon: CreditCard, href: "/admin/licenses", visible: true, color: "text-amber-500", bgColor: "bg-amber-500/10" },
      { label: isAr ? 'التدريب والكفاءة' : 'Training & Competency', icon: GraduationCap, href: "/admin/trainings", visible: true, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { label: isAr ? 'تفويض المعدات' : 'Equipment Authorization', icon: ShieldCheck, href: "/admin/equipment-auth", visible: true, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
      { label: isAr ? 'العناصر منتهية الصلاحية' : 'Expiring Items', icon: Clock, href: "/admin/licenses", visible: true, color: "text-amber-500", bgColor: "bg-amber-500/10" },
      { label: isAr ? 'مصفوفة الكفاءة' : 'Competency Matrix', icon: Grid, href: "/admin/training-matrix", visible: true, color: "text-teal-500", bgColor: "bg-teal-500/10" },
      { label: isAr ? 'تقارير التفويض' : 'Authorization Reports', icon: ScrollText, href: "/admin/enterprise-reports", visible: true, color: "text-slate-400", bgColor: "bg-slate-500/10" },
    ]},
    { title: "Assets & Emergency", titleAr: "الأصول والمرافق والطوارئ", items: [
      { label: isAr ? 'الأصول' : 'Assets', icon: Boxes, href: "/admin/assets", visible: true, color: "text-sky-500", bgColor: "bg-sky-500/10" },
      { label: isAr ? 'الزوار والمقاولون' : 'Visitors & Contractors', icon: Users, href: "/admin/visitors", visible: true, color: "text-violet-500", bgColor: "bg-violet-500/10" },
      { label: isAr ? 'الطوارئ' : 'Emergency', icon: Flame, href: "/admin/emergency", visible: true, color: "text-red-500", bgColor: "bg-red-500/10" },
    ]},
    { title: "AI & Intelligence", titleAr: "الذكاء الاصطناعي والاستخبارات", items: [
      { label: isAr ? 'محرك Safety AI' : 'Safety AI Engine', icon: Workflow, href: "/admin/ai-engine", visible: true, color: "text-indigo-600", bgColor: "bg-indigo-600/10" },
    ]},
  ];

  const visibleGroups = navGroups.map(group => ({ ...group, items: group.items.filter(i => i.visible) })).filter(group => group.items.length);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => setIsCollapsed(v => !v)}>{isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</Button><span className="font-semibold">ABDULKAREM SAFETY BOARD</span></div>
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}><Search className="h-5 w-5" /></Button><Button variant="ghost" size="icon" onClick={toggleLanguage}><Globe className="h-5 w-5" /></Button><Button variant="ghost" size="icon" onClick={toggleTheme}>{settings.theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button><Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5" /></Button></div>
        </div>
      </header>
      <div className="flex">
        <aside className={cn("border-r bg-background/80 p-2 transition-all", isCollapsed ? "w-16" : "w-72")}>
          <nav className="space-y-4">
            {visibleGroups.map((group, index) => {
              const collapsed = collapsedGroups[index] ?? false;
              return <div key={group.title}><button className="mb-2 w-full text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleGroup(index)}>{isAr ? group.titleAr : group.title} <ChevronDown className={cn("inline h-3 w-3 transition-transform", collapsed && "-rotate-90")} /></button>{!collapsed && <div className="space-y-1">{group.items.map(item => <Link key={item.href + item.label} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", location === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{<item.icon className={cn("h-4 w-4 shrink-0", location === item.href ? "" : item.color)} />}{!isCollapsed && <span>{item.label}</span>}</Link>)}</div>}</div>;
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <GlobalPrintFooter />
    </div>
  );
}

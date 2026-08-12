import React, { useState } from "react";
import { useData } from "@/lib/data-context";
import { useFireProtectionStore } from "@/lib/fire-protection-store";
import type { FireEquipmentItem, ChecklistItemResult } from "@/types/fire-protection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Flame, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  QrCode, 
  Plus, 
  Search, 
  Printer, 
  Activity, 
  Bell, 
  Settings, 
  Layers, 
  Trash2, 
  Check, 
  Zap,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function AdminFireProtection() {
  const { settings: globalSettings } = useData();
  const isAr = globalSettings.language === "ar";
  const { toast } = useToast();

  const store = useFireProtectionStore();
  const { 
    equipment, 
    inspections, 
    pumpTests, 
    zones, 
    maintenance, 
    alerts, 
    settings: fireSettings, 
    addEquipment, 
    deleteEquipment, 
    addInspection, 
    dismissAlert, 
    updateSettings 
  } = store;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Add Equipment Dialog State
  const [isAddEqOpen, setIsAddEqOpen] = useState(false);
  const [newEq, setNewEq] = useState({
    equipmentId: 'EXT-101',
    serialNumber: 'SN-100001',
    qrCode: 'QR-FIRE-1001',
    category: 'extinguisher' as FireEquipmentItem['category'],
    type: 'powder' as FireEquipmentItem['type'],
    manufacturer: 'Naffco',
    model: 'ABC-6KG',
    capacity: '6 KG',
    location: 'Zone 1 - Production',
    department: 'Production',
    building: 'Building A',
    status: 'good' as FireEquipmentItem['status'],
    notes: ''
  });

  // Inspection Wizard State
  const [selectedEqForInspection, setSelectedEqForInspection] = useState<FireEquipmentItem | null>(null);
  const [inspectionChecklist, setInspectionChecklist] = useState<ChecklistItemResult[]>([]);
  const [inspectorName] = useState("System Safety Inspector");
  const [inspNotes, setInspNotes] = useState("");

  // QR Code Modal State
  const [selectedEqForQr, setSelectedEqForQr] = useState<FireEquipmentItem | null>(null);

  // Calculations for Dashboard
  const totalEquipment = equipment.length;
  const goodCount = equipment.filter((e: FireEquipmentItem) => e.status === 'good').length;
  const inspectionDueCount = equipment.filter((e: FireEquipmentItem) => e.status === 'inspection_due').length;
  const maintenanceDueCount = equipment.filter((e: FireEquipmentItem) => e.status === 'maintenance_due').length;
  const criticalCount = equipment.filter((e: FireEquipmentItem) => e.status === 'damaged' || e.status === 'out_of_service' || e.status === 'expired').length;
  const healthPercentage = totalEquipment > 0 ? Math.round((goodCount / totalEquipment) * 100) : 100;

  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    addEquipment({
      ...newEq,
      createdBy: 'Admin'
    });
    setIsAddEqOpen(false);
    toast({
      title: isAr ? 'تم إضافة المعدة بنجاح' : 'Equipment Added Successfully',
      description: isAr ? `تمت إضافة ${newEq.equipmentId} إلى النظام` : `Added ${newEq.equipmentId} to fire inventory.`
    });
  };

  const startInspection = (eq: FireEquipmentItem) => {
    setSelectedEqForInspection(eq);
    const initialList = fireSettings.checklistTemplates.map((t: { id: string; label: string; labelAr: string }) => ({
      id: t.id,
      label: t.label,
      labelAr: t.labelAr,
      result: 'pass' as const,
      notes: ''
    }));
    setInspectionChecklist(initialList);
  };

  const handleSaveInspection = () => {
    if (!selectedEqForInspection) return;
    const hasFail = inspectionChecklist.some((item: ChecklistItemResult) => item.result === 'fail');
    const overallResult = hasFail ? 'fail' : 'pass';

    addInspection({
      equipmentId: selectedEqForInspection.id,
      equipmentRef: selectedEqForInspection.equipmentId,
      equipmentName: `${selectedEqForInspection.manufacturer} ${selectedEqForInspection.type}`,
      inspectorName,
      inspectorId: 'usr-1',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      overallResult,
      checklist: inspectionChecklist,
      notes: inspNotes
    });

    setSelectedEqForInspection(null);
    setInspNotes('');
    toast({
      title: isAr ? 'تم حفظ الفحص بنجاح' : 'Inspection Saved',
      description: isAr ? `النتيجة العامة: ${overallResult === 'pass' ? 'اجتاز (PASS)' : 'راسب (FAIL)'}` : `Overall result: ${overallResult.toUpperCase()}`,
      variant: overallResult === 'fail' ? 'destructive' : 'default'
    });
  };

  const filteredEquipment = equipment.filter((eq: FireEquipmentItem) => {
    const matchesSearch = eq.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          eq.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || eq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isAr ? 'نظام إدارة حماية النيران والسلامة' : 'Fire Protection Management System'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? 'إدارة طفايات الحريق، مضخات الحريق، لوحات الإنذار، والفحوصات الدورية' : 'Manage fire extinguishers, fire pumps, alarm panels, and compliance inspections'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => {
            setNewEq({
              equipmentId: `EXT-${Math.floor(100 + Math.random() * 900)}`,
              serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
              qrCode: `QR-FIRE-${Date.now()}`,
              category: 'extinguisher' as FireEquipmentItem['category'],
              type: 'powder' as FireEquipmentItem['type'],
              manufacturer: 'Naffco',
              model: 'ABC-6KG',
              capacity: '6 KG',
              location: 'Zone 1 - Production',
              department: 'Production',
              building: 'Building A',
              status: 'good' as FireEquipmentItem['status'],
              notes: ''
            });
            setIsAddEqOpen(true);
          }} className="h-10 rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4" />
            {isAr ? 'إضافة معدة حريق جديدة' : 'Add Fire Equipment'}
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="h-10 rounded-xl gap-2">
            <Printer className="h-4 w-4" />
            {isAr ? 'طباعة التقرير' : 'Print Report'}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1.5 rounded-2xl flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="dashboard" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            {isAr ? 'لوحة القيادة' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Layers className="h-4 w-4 text-red-500" />
            {isAr ? 'معدات الحريق' : 'Fire Equipment'} ({totalEquipment})
          </TabsTrigger>
          <TabsTrigger value="inspections" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {isAr ? 'الفحوصات وقوائم المراجعة' : 'Inspections'} ({inspections.length})
          </TabsTrigger>
          <TabsTrigger value="pumps_alarms" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {isAr ? 'المضخات والإنذار' : 'Pumps & Alarms'}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Wrench className="h-4 w-4 text-purple-500" />
            {isAr ? 'الصيانة والطلبات' : 'Maintenance'} ({maintenance.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Bell className="h-4 w-4 text-rose-500" />
            {isAr ? 'التنبيهات' : 'Alerts'} ({alerts.filter((a: { isRead: boolean }) => !a.isRead).length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            {isAr ? 'الإعدادات والقوالب' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{isAr ? 'حالة سلامة الحريق الإجمالية' : 'Fire Protection Health'}</p>
                  <span className="text-2xl font-bold text-emerald-600">{healthPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${healthPercentage}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{isAr ? `${goodCount} من ${totalEquipment} معدة بحالة سليمة تماماً` : `${goodCount} of ${totalEquipment} equipment in good standing`}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'مستحقة الفحص' : 'Inspection Due'}</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{inspectionDueCount}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">{isAr ? 'تتطلب فحصاً دورياً فورياً' : 'Requires scheduled monthly check'}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'تحت الصيانة' : 'Maintenance Due'}</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{maintenanceDueCount}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600">
                    <Wrench className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">{isAr ? 'أوامر صيانة مجدولة' : 'Scheduled preventive work orders'}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'حالات حرجة / معطلة' : 'Critical / Out of Service'}</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">{isAr ? 'تتطلب تدخلاً هندسياً عاجلاً' : 'Requires immediate corrective action'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{isAr ? 'معدات الحريق الحرجة وتنبيهات الفحص' : 'Critical Equipment & Inspection Status'}</CardTitle>
                <CardDescription>{isAr ? 'نظرة سريعة على الطفايات والمضخات التابعة للمصنع' : 'Overview of plant fire extinguishers and pumps'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipment.slice(0, 5).map((eq: FireEquipmentItem) => (
                    <div key={eq.id} className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${eq.status === 'good' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          <Flame className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">{eq.equipmentId} — {eq.manufacturer} ({eq.type.toUpperCase()})</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Building2 className="h-3 w-3" /> {eq.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                          eq.status === 'good' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'
                        }`}>
                          {eq.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => startInspection(eq)} className="h-8 rounded-lg text-xs gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {isAr ? 'فحص' : 'Inspect'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{isAr ? 'حالة مضخات والإنذار' : 'Pumps & Alarms Status'}</CardTitle>
                <CardDescription>{isAr ? 'جاهزية الأنظمة الرئيسية' : 'Readiness of core systems'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-700">{isAr ? 'مضخة الحريق الرئيسية (Diesel)' : 'Main Fire Pump (Diesel)'}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Operational</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Flow: 750 GPM | Pressure: 120 PSI | Fuel: 90%</p>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-700">{isAr ? 'لوحة إنذار الحريق المركزية' : 'Central Alarm Panel (Simplex)'}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Normal (0 Faults)</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Zones Active: 3 / 3 | Battery: 100%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. EQUIPMENT TAB */}
        <TabsContent value="equipment" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{isAr ? 'سجل معدات حماية النيران' : 'Fire Equipment Directory'}</CardTitle>
                  <CardDescription>{isAr ? 'إحث وفلترة الطفايات، المضخات، ولوحات الإنذار' : 'Search and filter fire extinguishers, pumps, and panels'}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={isAr ? 'بحث برقم المعدة أو الموقع...' : 'Search by ID or location...'}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 rounded-xl text-xs"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-36 h-9 rounded-xl text-xs">
                      <SelectValue placeholder={isAr ? 'التصنيف' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? 'الكل' : 'All Categories'}</SelectItem>
                      <SelectItem value="extinguisher">{isAr ? 'طفايات الحريق' : 'Extinguishers'}</SelectItem>
                      <SelectItem value="pump">{isAr ? 'مضخات الحريق' : 'Pumps'}</SelectItem>
                      <SelectItem value="alarm_panel">{isAr ? 'لوحات الإنذار' : 'Alarm Panels'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs text-muted-foreground">
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'رقم المعدة' : 'Equipment ID'}</th>
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'النوع' : 'Type'}</th>
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الموقع' : 'Location'}</th>
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'القسم' : 'Department'}</th>
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الفحص القادم' : 'Next Inspection'}</th>
                      <th className={`pb-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={`pb-3 font-medium text-center`}>{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-xs">
                    {filteredEquipment.map((eq: FireEquipmentItem) => (
                      <tr key={eq.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-red-500" />
                            {eq.equipmentId}
                          </div>
                        </td>
                        <td className="py-3">{eq.manufacturer} - {eq.type.toUpperCase()} ({eq.capacity || ''})</td>
                        <td className="py-3 text-muted-foreground">{eq.location}</td>
                        <td className="py-3">{eq.department}</td>
                        <td className="py-3">{eq.nextInspectionDate || 'N/A'}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={`px-2 py-0.5 rounded-md font-medium ${
                            eq.status === 'good' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'
                          }`}>
                            {eq.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => startInspection(eq)} className="h-7 px-2 rounded-lg text-xs gap-1 text-emerald-600">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {isAr ? 'فحص' : 'Inspect'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedEqForQr(eq)} className="h-7 px-2 rounded-lg text-xs gap-1 text-blue-600">
                              <QrCode className="h-3.5 w-3.5" />
                              {isAr ? 'QR' : 'QR'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteEquipment(eq.id)} className="h-7 px-2 rounded-lg text-xs text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. INSPECTIONS TAB */}
        <TabsContent value="inspections" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{isAr ? 'سجل فحوصات السلامة وحماية النيران' : 'Fire Safety Inspection History'}</CardTitle>
              <CardDescription>{isAr ? 'قائمة الفحوصات الدورية المنفذة ونتائج قوائم المراجعة' : 'Logged routine inspections and checklist results'}</CardDescription>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  {isAr ? 'لا توجد فحوصات مسجلة حتى الآن. اضغط على "فحص" في قائمة المعدات.' : 'No inspection records yet. Click "Inspect" on any equipment.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {inspections.map((insp: { id: string; equipmentRef: string; equipmentName: string; overallResult: string; inspectorName: string; date: string; time: string; notes?: string }) => (
                    <div key={insp.id} className="p-4 rounded-xl border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{insp.equipmentRef}</span>
                          <span className="text-xs text-muted-foreground">({insp.equipmentName})</span>
                          <Badge variant="outline" className={`ml-2 text-[10px] px-2 py-0.5 rounded-md ${
                            insp.overallResult === 'pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {insp.overallResult.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isAr ? 'المفتش:' : 'Inspector:'} {insp.inspectorName} | {insp.date} {insp.time}
                        </p>
                        {insp.notes && <p className="text-xs text-slate-700 mt-2 bg-muted/50 p-2 rounded-lg">{insp.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. PUMPS & ALARMS TAB */}
        <TabsContent value="pumps_alarms" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{isAr ? 'مضخات الحريق' : 'Fire Pumps'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {pumpTests.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center">{isAr ? 'لا توجد اختبارات مضخات مسجلة.' : 'No pump tests recorded yet.'}</p>
                ) : (
                  pumpTests.map((pt: { id: string; pumpName: string; date: string; flowRate: string; dischargePressure: string }) => (
                    <div key={pt.id} className="p-3 rounded-xl border bg-slate-50/50 space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{pt.pumpName}</span>
                        <span className="text-emerald-600">PASS</span>
                      </div>
                      <p className="text-muted-foreground">Date: {pt.date} | Flow: {pt.flowRate} | Press: {pt.dischargePressure}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{isAr ? 'مناطق إنذار الحريق (Fire Alarm Zones)' : 'Fire Alarm Zones'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {zones.map((z: { id: string; zoneCode: string; zoneName: string; building: string; area: string; devicesCount: number }) => (
                  <div key={z.id} className="p-3.5 rounded-xl border bg-card flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{z.zoneCode} — {z.zoneName}</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">{z.building} ({z.area}) | Devices: {z.devicesCount}</div>
                    </div>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Normal</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. MAINTENANCE TAB */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{isAr ? 'أوامر صيانة معدات الحريق' : 'Fire Protection Maintenance Work Orders'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {maintenance.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <Wrench className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  {isAr ? 'لا توجد أوامر صيانة حالية.' : 'No maintenance work orders.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenance.map((wo: { id: string; woNumber: string; type: string; equipmentName: string; problemDescription: string }) => (
                    <div key={wo.id} className="p-4 rounded-xl border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{wo.woNumber}</span>
                          <Badge variant="outline" className="text-xs">{wo.type.toUpperCase()}</Badge>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mt-1">{wo.equipmentName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{wo.problemDescription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{isAr ? 'تنبيهات وإشعارات حماية النيران' : 'Fire Protection Alerts'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  {isAr ? 'لا توجد تنبيهات نشطة.' : 'No active alerts.'}
                </div>
              ) : (
                alerts.map((alt: { id: string; isRead: boolean; titleAr: string; title: string; messageAr: string; message: string }) => (
                  <div key={alt.id} className={`p-4 rounded-xl border flex items-center justify-between ${alt.isRead ? 'bg-muted/30 opacity-60' : 'bg-red-50/50 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{isAr ? alt.titleAr : alt.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{isAr ? alt.messageAr : alt.message}</p>
                      </div>
                    </div>
                    {!alt.isRead && (
                      <Button size="sm" variant="outline" onClick={() => dismissAlert(alt.id)} className="h-8 rounded-lg text-xs">
                        {isAr ? 'تحديد كمقروء' : 'Dismiss'}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{isAr ? 'إعدادات الفحص والصيانة' : 'Fire Inspection & Maintenance Settings'}</CardTitle>
              <CardDescription>{isAr ? 'تخصيص الفترات الزمنية وقوائم المراجعة' : 'Customize inspection intervals and default checklist items'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isAr ? 'فترة الفحص الدوري (بالأيام)' : 'Inspection Interval (Days)'}</Label>
                  <Input 
                    type="number" 
                    value={fireSettings.defaultInspectionIntervalDays} 
                    onChange={e => updateSettings({ ...fireSettings, defaultInspectionIntervalDays: parseInt(e.target.value) || 30 })}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? 'فترة الصيانة الوقائية (بالأيام)' : 'Preventive Maintenance Interval (Days)'}</Label>
                  <Input 
                    type="number" 
                    value={fireSettings.defaultMaintenanceIntervalDays} 
                    onChange={e => updateSettings({ ...fireSettings, defaultMaintenanceIntervalDays: parseInt(e.target.value) || 180 })}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddEqOpen} onOpenChange={setIsAddEqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إضافة معدة حريق جديدة' : 'Add New Fire Equipment'}</DialogTitle>
            <DialogDescription>{isAr ? 'تسجيل طفاية حريق أو مضخة أو جهاز إنذار جديد' : 'Register a new fire extinguisher, pump, or alarm device'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEquipment} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isAr ? 'رقم المعدة' : 'Equipment ID'}</Label>
                <Input value={newEq.equipmentId} onChange={e => setNewEq({ ...newEq, equipmentId: e.target.value })} required className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                <Input value={newEq.serialNumber} onChange={e => setNewEq({ ...newEq, serialNumber: e.target.value })} required className="rounded-xl h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isAr ? 'التصنيف' : 'Category'}</Label>
                <Select value={newEq.category} onValueChange={(val: FireEquipmentItem['category']) => setNewEq({ ...newEq, category: val })}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extinguisher">Fire Extinguisher</SelectItem>
                    <SelectItem value="pump">Fire Pump</SelectItem>
                    <SelectItem value="alarm_panel">Alarm Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? 'النوع' : 'Type'}</Label>
                <Select value={newEq.type} onValueChange={(val: FireEquipmentItem['type']) => setNewEq({ ...newEq, type: val })}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="powder">Dry Chemical Powder</SelectItem>
                    <SelectItem value="co2">CO2</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="foam">Foam</SelectItem>
                    <SelectItem value="diesel_pump">Diesel Fire Pump</SelectItem>
                    <SelectItem value="alarm_panel">Control Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isAr ? 'المصنع' : 'Manufacturer'}</Label>
                <Input value={newEq.manufacturer} onChange={e => setNewEq({ ...newEq, manufacturer: e.target.value })} className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? 'السعة' : 'Capacity'}</Label>
                <Input value={newEq.capacity} onChange={e => setNewEq({ ...newEq, capacity: e.target.value })} className="rounded-xl h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isAr ? 'الموقع' : 'Location'}</Label>
              <Input value={newEq.location} onChange={e => setNewEq({ ...newEq, location: e.target.value })} required className="rounded-xl h-9" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEqOpen(false)} className="rounded-xl h-9">
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" className="rounded-xl h-9 bg-red-600 hover:bg-red-700 text-white">
                {isAr ? 'حفظ المعدة' : 'Save Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inspection Wizard Dialog */}
      <Dialog open={!!selectedEqForInspection} onOpenChange={() => setSelectedEqForInspection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {isAr ? `فحص معدة: ${selectedEqForInspection?.equipmentId}` : `Inspect Equipment: ${selectedEqForInspection?.equipmentId}`}
            </DialogTitle>
            <DialogDescription>
              {selectedEqForInspection?.manufacturer} — {selectedEqForInspection?.location}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800">{isAr ? 'قائمة الفحص والتحقق (Checklist)' : 'Inspection Checklist'}</h4>
              <div className="space-y-2">
                {inspectionChecklist.map((item: ChecklistItemResult, idx: number) => (
                  <div key={item.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-4">
                    <span className="font-medium text-slate-800">{isAr ? item.labelAr : item.label}</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button"
                        size="sm" 
                        variant={item.result === 'pass' ? 'default' : 'outline'}
                        onClick={() => {
                          const updated = [...inspectionChecklist];
                          updated[idx].result = 'pass';
                          setInspectionChecklist(updated);
                        }}
                        className={`h-7 px-3 text-[11px] ${item.result === 'pass' ? 'bg-emerald-600 text-white' : ''}`}
                      >
                        PASS
                      </Button>
                      <Button 
                        type="button"
                        size="sm" 
                        variant={item.result === 'fail' ? 'destructive' : 'outline'}
                        onClick={() => {
                          const updated = [...inspectionChecklist];
                          updated[idx].result = 'fail';
                          setInspectionChecklist(updated);
                        }}
                        className={`h-7 px-3 text-[11px] ${item.result === 'fail' ? 'bg-red-600 text-white' : ''}`}
                      >
                        FAIL
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? 'ملاحظات المفتش' : 'Inspector Notes'}</Label>
              <Textarea 
                value={inspNotes} 
                onChange={e => setInspNotes(e.target.value)} 
                placeholder={isAr ? 'أدخل أي ملاحظات أو توصيات هنا...' : 'Enter any inspection notes or recommendations...'}
                className="h-20 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEqForInspection(null)} className="rounded-xl h-9">
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveInspection} className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Check className="h-4 w-4" />
              {isAr ? 'إنهاء وحفظ الفحص' : 'Complete & Save Inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={!!selectedEqForQr} onOpenChange={() => setSelectedEqForQr(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{isAr ? 'QR Code المعدة' : 'Equipment QR Code'}</DialogTitle>
            <DialogDescription>{selectedEqForQr?.equipmentId} — {selectedEqForQr?.location}</DialogDescription>
          </DialogHeader>
          <div className="p-6 bg-white rounded-2xl flex items-center justify-center border shadow-inner my-2">
            <QRCodeSVG value={selectedEqForQr?.qrCode || 'FIRE-EQ'} size={200} />
          </div>
          <DialogFooter className="justify-center sm:justify-center">
            <Button onClick={() => window.print()} className="w-full rounded-xl h-9 gap-2">
              <Printer className="h-4 w-4" />
              {isAr ? 'طباعة ملصق الـ QR' : 'Print QR Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Building2, Plus, Search, Edit3, Trash2, ShieldCheck, MapPin, Users, Activity, Printer, Eye, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface PlantRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  manager: string;
  location: string;
  type: string;
  employeesCount: number;
  safetyScore: number;
  status: "active" | "maintenance" | "inactive";
  isoCertified: boolean;
  establishedYear: number;
}

const DEFAULT_PLANTS: PlantRecord[] = [
  {
    id: "plt-1",
    code: "PLT-01",
    nameEn: "Jubail Heavy Industrial Complex",
    nameAr: "مجمع الجبيل للصناعات الثقيلة",
    manager: "Eng. Saeed Al-Ghamdi",
    location: "Jubail Industrial City, SA",
    type: "Heavy Manufacturing & Foundry",
    employeesCount: 420,
    safetyScore: 98.5,
    status: "active",
    isoCertified: true,
    establishedYear: 2012,
  },
  {
    id: "plt-2",
    code: "PLT-02",
    nameEn: "Yanbu Chemical & Polymer Plant",
    nameAr: "مصنع ينبع للكيماويات والبوليمر",
    manager: "Eng. Tariq Mansoor",
    location: "Yanbu Industrial Port, SA",
    type: "Chemical Processing",
    employeesCount: 280,
    safetyScore: 96.2,
    status: "active",
    isoCertified: true,
    establishedYear: 2016,
  },
  {
    id: "plt-3",
    code: "PLT-03",
    nameEn: "Riyadh High-Tech Assembly Hub",
    nameAr: "مركز الرياض للتجميع والتقنية العالية",
    manager: "Eng. Mona Al-Zahrani",
    location: "Riyadh 2nd Industrial City, SA",
    type: "Electronics & Assembly",
    employeesCount: 190,
    safetyScore: 99.1,
    status: "active",
    isoCertified: true,
    establishedYear: 2019,
  },
  {
    id: "plt-4",
    code: "PLT-04",
    nameEn: "Dammam Logistics & Warehouse Depot",
    nameAr: "مستودع ومركز الدمام اللوجستي",
    manager: "Fahad Al-Otaibi",
    location: "Dammam 3rd Industrial Zone, SA",
    type: "Logistics & High-Bay Warehousing",
    employeesCount: 110,
    safetyScore: 92.0,
    status: "maintenance",
    isoCertified: false,
    establishedYear: 2021,
  },
];

export default function AdminPlants() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const { toast } = useToast();

  const [plants, setPlants] = useState<PlantRecord[]>(() => {
    const saved = localStorage.getItem("safety_board_plants");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_PLANTS;
      }
    }
    return DEFAULT_PLANTS;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_plants", JSON.stringify(plants));
  }, [plants]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRecord | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantRecord | null>(null);

  const [formData, setFormData] = useState<Partial<PlantRecord>>({
    code: "",
    nameEn: "",
    nameAr: "",
    manager: "",
    location: "",
    type: "Manufacturing",
    employeesCount: 50,
    safetyScore: 95.0,
    status: "active",
    isoCertified: true,
    establishedYear: new Date().getFullYear(),
  });

  const filteredPlants = plants.filter((p) => {
    const matchesSearch =
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manager.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    const nextNum = plants.length + 1;
    setFormData({
      code: `PLT-${nextNum < 10 ? "0" + nextNum : nextNum}`,
      nameEn: "",
      nameAr: "",
      manager: "",
      location: "",
      type: "Manufacturing & Assembly",
      employeesCount: 100,
      safetyScore: 98.0,
      status: "active",
      isoCertified: true,
      establishedYear: new Date().getFullYear(),
    });
    setEditingPlant(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (plant: PlantRecord) => {
    setEditingPlant(plant);
    setFormData({ ...plant });
    setIsAddOpen(true);
  };

  const handleSavePlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameEn && !formData.nameAr) {
      toast({
        title: isAr ? "خطأ في البيانات" : "Validation Error",
        description: isAr ? "يرجى إدخال اسم المصنع والكود المرجعي" : "Please provide plant name and code",
        variant: "destructive",
      });
      return;
    }
    if (!formData.code) {
      toast({
        title: isAr ? "خطأ في البيانات" : "Validation Error",
        description: isAr ? "يرجى إدخال الكود المرجعي" : "Please provide plant code",
        variant: "destructive",
      });
      return;
    }

    if (editingPlant) {
      setPlants((prev) =>
        prev.map((p) => (p.id === editingPlant.id ? ({ ...p, ...formData } as PlantRecord) : p))
      );
      toast({
        title: isAr ? "تم تحديث المصنع" : "Plant Updated",
        description: isAr ? `تم تحديث بيانات المصنع ${formData.code} بنجاح` : `Updated plant ${formData.code} successfully`,
      });
    } else {
      const newPlant: PlantRecord = {
        id: `plt-${Date.now()}`,
        code: formData.code || `PLT-${plants.length + 1}`,
        nameEn: formData.nameEn || "New Plant",
        nameAr: formData.nameAr || formData.nameEn || "مصنع جديد",
        manager: formData.manager || "Plant Manager",
        location: formData.location || "Industrial Area",
        type: formData.type || "General Manufacturing",
        employeesCount: Number(formData.employeesCount) || 0,
        safetyScore: Number(formData.safetyScore) || 95.0,
        status: (formData.status as "active" | "maintenance" | "inactive") || "active",
        isoCertified: Boolean(formData.isoCertified),
        establishedYear: Number(formData.establishedYear) || new Date().getFullYear(),
      };
      setPlants((prev) => [newPlant, ...prev]);
      toast({
        title: isAr ? "تمت إضافة المصنع" : "Plant Added",
        description: isAr ? `تمت إضافة المصنع الجديد ${newPlant.code} بنجاح` : `New plant ${newPlant.code} added successfully`,
      });
    }

    setIsAddOpen(false);
  };

  const handleDeletePlant = (id: string, code: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
    toast({
      title: isAr ? "تم حذف المصنع" : "Plant Deleted",
      description: isAr ? `تم حذف المصنع ${code}` : `Plant ${code} removed`,
    });
  };

  return (
    <div className="space-y-6" data-testid="admin-plants-page">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-lime-500/20 text-lime-400 border border-lime-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {isAr ? "إدارة المصانع والمواقع" : "Plants & Facilities Directory"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? "مراقبة وإدارة أداء السلامة عبر كافة المنشآت والمصانع" : "Monitor safety compliance & operations across all manufacturing sites"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} variant="outline" className="gap-2 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة الدليل" : "Print Directory"}
          </Button>

          <Button onClick={handleOpenAdd} className="gap-2 bg-lime-500 text-slate-950 font-bold hover:bg-lime-400 shadow-lg shadow-lime-500/20">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة مصنع جديد" : "Add New Plant"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">{isAr ? "إجمالي المصانع" : "Total Facilities"}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{plants.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">{isAr ? "مصانع نشطة" : "Active Operations"}</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {plants.filter((p) => p.status === "active").length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">{isAr ? "متوسط معدل السلامة" : "Avg Safety Score"}</p>
              <h3 className="text-2xl font-black text-lime-600 mt-1">
                {plants.length > 0 ? (plants.reduce((a, b) => a + b.safetyScore, 0) / plants.length).toFixed(1) : 0}%
              </h3>
            </div>
            <div className="p-3 bg-lime-50 text-lime-600 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">{isAr ? "إجمالي القوى العاملة" : "Total Workforce"}</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-1">
                {plants.reduce((a, b) => a + b.employeesCount, 0)}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAr ? "بحث بالاسم، الكود، الموقع أو المدير..." : "Search plant name, code, manager, location..."}
              className="ps-10"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isAr ? "جميع الحالات" : "All Statuses"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "جميع الحالات" : "All Statuses"}</SelectItem>
                <SelectItem value="active">{isAr ? "نشط (Active)" : "Active"}</SelectItem>
                <SelectItem value="maintenance">{isAr ? "صيانة (Maintenance)" : "Maintenance"}</SelectItem>
                <SelectItem value="inactive">{isAr ? "متوقف (Inactive)" : "Inactive"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Plants Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            {isAr ? "سجل المنشآت والمصانع المعتمدة" : "Registered Manufacturing Facilities"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {isAr ? `إجمالي المصانع المعروضة: ${filteredPlants.length}` : `Showing ${filteredPlants.length} plants`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/70 hover:bg-slate-100/70">
                  <TableHead className="font-bold text-slate-900">{isAr ? "كود المصنع" : "Plant Code"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "اسم المنشأة / المصنع" : "Plant Name"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "مدير الموقع" : "Plant Manager"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "الموقع والمنطقة" : "Location"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "العمالة" : "Staff"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "مؤشر السلامة" : "Safety Index"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">{isAr ? "لا توجد مصانع مطابقة للبحث" : "No plants match your search criteria"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlants.map((plant) => (
                    <TableRow key={plant.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-lime-700 bg-lime-50/50">
                        {plant.code}
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-slate-900 text-sm">{isAr ? plant.nameAr : plant.nameEn}</div>
                        <div className="text-[11px] text-slate-500">{plant.type}</div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-700">{plant.manager}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span>{plant.location}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-semibold text-xs text-slate-800">{plant.employeesCount}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border">
                            <div
                              className={`h-full ${plant.safetyScore >= 95 ? "bg-emerald-500" : plant.safetyScore >= 90 ? "bg-lime-500" : "bg-amber-500"}`}
                              style={{ width: `${plant.safetyScore}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs font-mono">{plant.safetyScore}%</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {plant.status === "active" && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold">{isAr ? "نشط" : "Active"}</Badge>
                        )}
                        {plant.status === "maintenance" && (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold">{isAr ? "صيانة" : "Maintenance"}</Badge>
                        )}
                        {plant.status === "inactive" && (
                          <Badge className="bg-slate-500/10 text-slate-700 border-slate-500/20 font-semibold">{isAr ? "متوقف" : "Inactive"}</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                            onClick={() => setSelectedPlant(plant)}
                            title={isAr ? "معاينة التفاصيل" : "View Details"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(plant)}
                            title={isAr ? "تعديل البيانات" : "Edit Plant"}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDeletePlant(plant.id, plant.code)}
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Plant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Building2 className="h-5 w-5 text-lime-600" />
              {editingPlant
                ? isAr
                  ? "تعديل بيانات المصنع"
                  : "Edit Plant Details"
                : isAr
                ? "إضافة مصنع / منشأة جديدة"
                : "Register New Facility / Plant"}
            </DialogTitle>
            <DialogDescription>
              {isAr ? "أدخل البيانات الأساسية والمعايير التنظيمية للمصنع" : "Fill in the facility specifications and management details"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlant} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isAr ? "كود المصنع" : "Plant Code"}</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. PLT-05"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "الحالة التشغيلية" : "Operational Status"}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: "active" | "maintenance" | "inactive") => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{isAr ? "نشط (Active)" : "Active"}</SelectItem>
                    <SelectItem value="maintenance">{isAr ? "تحت الصيانة (Maintenance)" : "Maintenance"}</SelectItem>
                    <SelectItem value="inactive">{isAr ? "متوقف (Inactive)" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "اسم المصنع (بالإنجليزية)" : "Plant Name (English)"}</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="e.g. Eastern Industrial Chemical Facility"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "اسم المصنع (بالعربية)" : "Plant Name (Arabic)"}</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: مصنع الشرقية للصناعات الكيميائية"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isAr ? "مدير الموقع" : "Plant Manager"}</Label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="e.g. Eng. Khalid Mansour"
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "نوع النشاط" : "Operation Type"}</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g. Heavy Assembly & Molding"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isAr ? "الموقع الجغرافي / المدينة" : "Location / City"}</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Jubail 2 Industrial Zone, SA"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{isAr ? "عدد العمالة" : "Staff Count"}</Label>
                <Input
                  type="number"
                  value={formData.employeesCount}
                  onChange={(e) => setFormData({ ...formData, employeesCount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "نسبة السلامة %" : "Safety Score %"}</Label>
                <Input
                  type="number"
                  step="0.1"
                  max="100"
                  value={formData.safetyScore}
                  onChange={(e) => setFormData({ ...formData, safetyScore: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "سنة التأسيس" : "Est. Year"}</Label>
                <Input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => setFormData({ ...formData, establishedYear: Number(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white font-bold">
                {editingPlant ? (isAr ? "حفظ التغييرات" : "Save Changes") : isAr ? "حفظ المصنع" : "Register Plant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plant Details & Safety Profile Dialog */}
      {selectedPlant && (
        <Dialog open={!!selectedPlant} onOpenChange={(open) => !open && setSelectedPlant(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold border-b pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-lime-600" />
                  <span>{isAr ? selectedPlant.nameAr : selectedPlant.nameEn}</span>
                </div>
                <Badge className="bg-lime-700 text-white font-mono">{selectedPlant.code}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border">
                <div>
                  <span className="text-slate-500 block">{isAr ? "مدير الموقع:" : "Plant Manager:"}</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPlant.manager}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "الموقع الجغرافي:" : "Location:"}</span>
                  <span className="font-semibold text-slate-800">{selectedPlant.location}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "نوع النشاط والتصنيع:" : "Operation Type:"}</span>
                  <span className="font-semibold text-slate-800">{selectedPlant.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "سنة التأسيس:" : "Established Year:"}</span>
                  <span className="font-semibold text-slate-800">{selectedPlant.establishedYear}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 border rounded-xl bg-slate-50">
                  <p className="text-[11px] text-slate-500 font-medium">{isAr ? "إجمالي القوى العاملة" : "Workforce"}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{selectedPlant.employeesCount}</p>
                </div>
                <div className="p-3 border rounded-xl bg-emerald-50/50 border-emerald-200">
                  <p className="text-[11px] text-emerald-800 font-medium">{isAr ? "معدل السلامة" : "Safety Score"}</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">{selectedPlant.safetyScore}%</p>
                </div>
                <div className="p-3 border rounded-xl bg-blue-50/50 border-blue-200">
                  <p className="text-[11px] text-blue-800 font-medium">{isAr ? "اعتماد ISO 45001" : "ISO Certified"}</p>
                  <p className="text-sm font-black text-blue-700 mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {selectedPlant.isoCertified ? (isAr ? "معتمد" : "Verified") : isAr ? "قيد المراجعة" : "Pending"}
                  </p>
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-slate-900 text-white space-y-2">
                <h4 className="font-bold text-xs uppercase text-lime-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  {isAr ? "ملخص أداء السلامة والتراخيص" : "Facility HSE Compliance Summary"}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? `منشأة ${selectedPlant.code} تعمل بكفاءة عالية وفق أعلى معايير OHSAS / ISO 45001. تم اجتياز الفحوصات الدورية الأخيرة بنجاح وبنسبة مطابقة ${selectedPlant.safetyScore}%.`
                    : `Facility ${selectedPlant.code} operates in full compliance with ISO 45001 standards. Recent audits confirm an outstanding safety index of ${selectedPlant.safetyScore}%.`}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlant(null)}>
                {isAr ? "إغلاق" : "Close"}
              </Button>
              <Button onClick={() => window.print()} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة بطاقة المصنع" : "Print Plant Safety Profile"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

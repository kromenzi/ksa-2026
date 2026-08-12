import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Wrench, 
  Zap, 
  Lock, 
  Activity, 
  Award, 
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export interface EquipmentAuth {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  category: string; 
  equipmentModel?: string;
  certificateNo: string;
  issueDate: string;
  expiryDate: string;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED";
  trainingRef: string;
  assessorName: string;
  notes?: string;
}

const CATEGORIES = [
  { id: "all", labelEn: "All Authorizations", labelAr: "جميع التفويضات", icon: ShieldCheck },
  { id: "Forklift", labelEn: "Forklift", labelAr: "رافعة شوكية", icon: Truck },
  { id: "Overhead Crane", labelEn: "Overhead Crane", labelAr: "ونش علوي", icon: Wrench },
  { id: "Manlift", labelEn: "Lifter / Manlift", labelAr: "رافعات الأفراد", icon: Activity },
  { id: "MEWP", labelEn: "MEWP", labelAr: "منصات العمل المتحركة", icon: Truck },
  { id: "Rigging", labelEn: "Rigging & Banksman", labelAr: "الربط والإشارات", icon: Award },
  { id: "Electrical", labelEn: "Electrical Authorization", labelAr: "تفويض كهربائي", icon: Zap },
  { id: "LOTO", labelEn: "LOTO Authorization", labelAr: "عزل الطاقة (LOTO)", icon: Lock },
  { id: "Height", labelEn: "Work at Height", labelAr: "العمل على ارتفاعات", icon: ShieldCheck },
  { id: "Confined", labelEn: "Confined Space", labelAr: "الأماكن المغلقة", icon: AlertTriangle },
];

export default function AdminEquipmentAuth() {
  const { settings } = useData();
  const isAr = settings.language === 'ar';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  const [authorizations, setAuthorizations] = useState<EquipmentAuth[]>(() => {
    const saved = localStorage.getItem("safety_board_equipment_auths_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return [
      {
        id: "AUTH-101",
        employeeName: "Ahmed Al-Mansoori",
        employeeId: "EMP-4021",
        department: "Logistics & Warehouse",
        category: "Forklift",
        equipmentModel: "Toyota 3-Ton Diesel Forklift",
        certificateNo: "CERT-FK-8832",
        issueDate: "2024-05-15",
        expiryDate: "2026-05-15",
        status: "VALID",
        trainingRef: "TR-FORK-09",
        assessorName: "Eng. Rashid Al-Ketbi",
        notes: "Passed practical and theoretical evaluation successfully."
      },
      {
        id: "AUTH-102",
        employeeName: "Mohammed Salem",
        employeeId: "EMP-4099",
        department: "Maintenance",
        category: "Overhead Crane",
        equipmentModel: "Demag 10-Ton Overhead Bridge Crane",
        certificateNo: "CERT-CR-5521",
        issueDate: "2023-08-10",
        expiryDate: "2025-08-10",
        status: "VALID",
        trainingRef: "TR-CRANE-02",
        assessorName: "Captain Hassan",
        notes: "Certified for heavy overhead lifting."
      },
      {
        id: "AUTH-103",
        employeeName: "John Smith",
        employeeId: "EMP-5120",
        department: "Electrical & Instrumentation",
        category: "Electrical",
        equipmentModel: "High Voltage Switchgear 11kV",
        certificateNo: "CERT-EL-9901",
        issueDate: "2023-03-01",
        expiryDate: "2025-03-01",
        status: "EXPIRING_SOON",
        trainingRef: "TR-HV-04",
        assessorName: "Dr. Alaa",
        notes: "Authorized for authorized electrical switching."
      },
      {
        id: "AUTH-104",
        employeeName: "David Miller",
        employeeId: "EMP-6112",
        department: "Safety & Inspection",
        category: "LOTO",
        equipmentModel: "Complex Plant LOTO System",
        certificateNo: "CERT-LOTO-112",
        issueDate: "2022-01-10",
        expiryDate: "2024-01-10",
        status: "EXPIRED",
        trainingRef: "TR-LOTO-01",
        assessorName: "HSE Director",
        notes: "Requires renewal and retraining."
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("safety_board_equipment_auths_v1", JSON.stringify(authorizations));
  }, [authorizations]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewQRModal, setIsViewQRModal] = useState(false);
  const [activeAuth, setActiveAuth] = useState<EquipmentAuth | null>(null);

  const [formData, setFormData] = useState({
    employeeName: "",
    employeeId: "",
    department: "",
    category: "Forklift",
    equipmentModel: "",
    certificateNo: "",
    issueDate: "2025-01-01",
    expiryDate: "2026-01-01",
    trainingRef: "",
    assessorName: "",
    notes: ""
  });

  const handleSaveAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.certificateNo) {
      toast.error(isAr ? "يرجى تعبئة الحقول الإلزامية" : "Please fill in required fields");
      return;
    }

    const today = new Date();
    const expiry = new Date(formData.expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: EquipmentAuth["status"] = "VALID";
    if (diffDays < 0) status = "EXPIRED";
    else if (diffDays <= 45) status = "EXPIRING_SOON";

    const newAuth: EquipmentAuth = {
      id: `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
      ...formData,
      status
    };

    setAuthorizations([newAuth, ...authorizations]);
    setIsAddOpen(false);
    toast.success(isAr ? "تم إصدار التفويض بنجاح" : "Equipment authorization issued successfully");
    setFormData({
      employeeName: "",
      employeeId: "",
      department: "",
      category: "Forklift",
      equipmentModel: "",
      certificateNo: "",
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      trainingRef: "",
      assessorName: "",
      notes: ""
    });
  };

  const deleteAuth = (id: string) => {
    setAuthorizations(authorizations.filter(a => a.id !== id));
    toast.success(isAr ? "تم الحذف بنجاح" : "Authorization deleted successfully");
  };

  const filtered = authorizations.filter(item => {
    const matchesSearch = item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.certificateNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.equipmentModel && item.equipmentModel.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalCount = authorizations.length;
  const validCount = authorizations.filter(a => a.status === "VALID").length;
  const expiringCount = authorizations.filter(a => a.status === "EXPIRING_SOON").length;
  const expiredCount = authorizations.filter(a => a.status === "EXPIRED").length;

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isAr ? 'إدارة تراخيص وتفويض المعدات' : 'Equipment Authorizations & Licenses'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAr 
              ? 'إدارة صلاحيات وتراخيص تشغيل المعدات الثقيلة، الرافعات، أعمال الكهرباء، وعزل الطاقة (LOTO)'
              : 'Enterprise management for mobile equipment, heavy cranes, electrical switching, and high-risk task authorizations'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setIsAddOpen(true)} className="rounded-2xl gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            {isAr ? 'إصدار تفويض جديد' : 'Issue Authorization'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'إجمالي التفويضات' : 'Total Authorizations'}</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'صلاحيات سارية' : 'Valid Authorizations'}</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{validCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'توشك على الانتهاء' : 'Expiring Soon'}</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-500">{expiringCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? 'منتهية الصلاحية' : 'Expired'}</p>
              <h3 className="text-2xl font-bold mt-1 text-red-500">{expiredCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(cat => {
          const IconComp = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" 
                  : "bg-card hover:bg-muted/60 text-muted-foreground border-border/60"
              )}
            >
              <IconComp className="h-3.5 w-3.5" />
              <span>{isAr ? cat.labelAr : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-3xl border border-border/50 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={isAr ? 'بحث بالاسم، رقم الشهادة، المعدة...' : 'Search employee, certificate, model...'} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 rounded-2xl bg-background/60"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-44 rounded-2xl bg-background/60">
              <SelectValue placeholder={isAr ? 'حالة الصلاحية' : 'Status Filter'} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="VALID">{isAr ? 'ساري' : 'Valid'}</SelectItem>
              <SelectItem value="EXPIRING_SOON">{isAr ? 'قريب الانتهاء' : 'Expiring Soon'}</SelectItem>
              <SelectItem value="EXPIRED">{isAr ? 'منتهي' : 'Expired'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card/80 border border-border/50 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-5 text-start">{isAr ? 'الموظف / الرقم' : 'Employee / ID'}</th>
                <th className="py-4 px-5 text-start">{isAr ? 'فئة التفويض والمعدة' : 'Category & Equipment'}</th>
                <th className="py-4 px-5 text-start">{isAr ? 'رقم الشهادة' : 'Certificate No.'}</th>
                <th className="py-4 px-5 text-start">{isAr ? 'تاريخ الإصدار والانتهاء' : 'Issue / Expiry'}</th>
                <th className="py-4 px-5 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-4 px-5 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-2 text-muted-foreground/60">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <p className="font-medium">{isAr ? 'لا توجد تفويضات مطابقة للبحث' : 'No equipment authorizations found'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-foreground">{item.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{item.employeeId} • {item.department}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-semibold mb-1">
                        {item.category}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.equipmentModel || 'General Equipment'}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs font-medium">
                      {item.certificateNo}
                    </td>
                    <td className="py-4 px-5 text-xs text-muted-foreground">
                      <div>{isAr ? 'الإصدار:' : 'Iss:'} {item.issueDate}</div>
                      <div className="font-medium text-foreground">{isAr ? 'الانتهاء:' : 'Exp:'} {item.expiryDate}</div>
                    </td>
                    <td className="py-4 px-5">
                      {item.status === 'VALID' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-xl px-2.5 py-0.5">
                          {isAr ? 'ساري' : 'Valid'}
                        </Badge>
                      )}
                      {item.status === 'EXPIRING_SOON' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-xl px-2.5 py-0.5">
                          {isAr ? 'قريب الانتهاء' : 'Expiring Soon'}
                        </Badge>
                      )}
                      {item.status === 'EXPIRED' && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 rounded-xl px-2.5 py-0.5">
                          {isAr ? 'منتهي' : 'Expired'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-5 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-blue-500 hover:bg-blue-500/10"
                          title={isAr ? "عرض رمز الاستجابة السريعة (QR)" : "View QR Verification"}
                          onClick={() => { setActiveAuth(item); setIsViewQRModal(true); }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                          title={isAr ? "حذف" : "Delete"}
                          onClick={() => deleteAuth(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isAr ? 'إصدار تفويض تشغيل معدة جديد' : 'Issue New Equipment Authorization'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'أدخل تفاصيل الموظف ورخصة التشخيص والفئة' : 'Enter employee credentials, equipment category, and validity.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAuth} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'اسم الموظف' : 'Employee Name'}</Label>
                <Input 
                  required
                  placeholder="e.g. John Doe"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الرقم الوظيفي' : 'Employee ID'}</Label>
                <Input 
                  required
                  placeholder="e.g. EMP-1024"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'القسم' : 'Department'}</Label>
                <Input 
                  placeholder="e.g. Logistics"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'فئة التفويض' : 'Authorization Category'}</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'طراز المعدة' : 'Equipment Model'}</Label>
                <Input 
                  placeholder="e.g. Caterpillar Forklift 5T"
                  value={formData.equipmentModel}
                  onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'رقم الشهادة / الرخصة' : 'Certificate / License No.'}</Label>
                <Input 
                  required
                  placeholder="e.g. CERT-FK-998"
                  value={formData.certificateNo}
                  onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</Label>
                <Input 
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label>
                <Input 
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'مرجع التدريب' : 'Training Reference'}</Label>
                <Input 
                  placeholder="e.g. TR-FORK-01"
                  value={formData.trainingRef}
                  onChange={(e) => setFormData({ ...formData, trainingRef: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'اسم الفاحص / المدرب' : 'Assessor Name'}</Label>
                <Input 
                  placeholder="e.g. Eng. Ahmed"
                  value={formData.assessorName}
                  onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-2xl">
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" className="rounded-2xl">
                {isAr ? 'إصدار وحفظ' : 'Issue & Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewQRModal} onOpenChange={setIsViewQRModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isAr ? 'رمز التحقق من تفويض المعدة' : 'Equipment Authorization QR Badge'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'امح الكود عبر جهاز الجوال للتحقق الفوري من صلاحية المشغل' : 'Scan to instantly verify operator compliance & equipment credentials.'}
            </DialogDescription>
          </DialogHeader>
          {activeAuth && (
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <div className="p-4 bg-white rounded-3xl shadow-md border">
                <QRCodeSVG 
                  value={`SAFETY-BOARD-AUTH:${activeAuth.id}:${activeAuth.employeeId}:${activeAuth.certificateNo}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-foreground">{activeAuth.employeeName}</h3>
                <p className="text-xs text-muted-foreground">{activeAuth.category} • {activeAuth.certificateNo}</p>
                <div className="pt-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {activeAuth.status} (Valid until {activeAuth.expiryDate})
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setIsViewQRModal(false)} className="rounded-2xl w-full">
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

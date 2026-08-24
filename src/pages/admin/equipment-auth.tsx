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
  Trash2,
  Eye,
  Printer,
  Send,
  Mail
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");

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

  const handlePrintAuth = (auth: EquipmentAuth) => {
    const popup = window.open("", "_blank", "width=1100,height=850");
    if (!popup) { toast.error(isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Allow pop-ups to print"); return; }
    const escapeHtml = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
    popup.document.write(`<!doctype html><html dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escapeHtml(auth.certificateNo)}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,Tahoma,sans-serif;background:#fff;color:#0f172a;margin:0}.sheet{border:4px solid #0f766e;border-radius:18px;padding:30px;min-height:185mm;box-sizing:border-box}.brand{font-size:26px;font-weight:800;color:#0f766e}.head{display:flex;justify-content:space-between;border-bottom:2px solid #d1d5db;padding-bottom:15px}.title{font-size:24px;font-weight:800;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cell{border:1px solid #cbd5e1;border-radius:9px;padding:10px}.label{font-size:10px;color:#64748b}.value{font-size:14px;font-weight:700;margin-top:3px}.footer{margin-top:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:30px;text-align:center;font-size:11px}.sig{border-top:1px solid #64748b;padding-top:6px}</style></head><body><div class="sheet"><div class="head"><div><div class="brand">UTEC SAFETY BOARD</div><div style="color:#64748b">${isAr ? 'تفويض رسمي لتشغيل المعدة' : 'Official Equipment Authorization'}</div></div><div style="font-weight:700">${escapeHtml(auth.certificateNo)}</div></div><div class="title">${isAr ? 'تفويض رسمي لتشغيل المعدة' : 'OFFICIAL EQUIPMENT AUTHORIZATION'}</div><div class="grid"><div class="cell"><div class="label">${isAr ? 'اسم الموظف' : 'Employee Name'}</div><div class="value">${escapeHtml(auth.employeeName)}</div></div><div class="cell"><div class="label">${isAr ? 'الرقم الوظيفي' : 'Employee ID'}</div><div class="value">${escapeHtml(auth.employeeId)}</div></div><div class="cell"><div class="label">${isAr ? 'القسم' : 'Department'}</div><div class="value">${escapeHtml(auth.department)}</div></div><div class="cell"><div class="label">${isAr ? 'الفئة' : 'Category'}</div><div class="value">${escapeHtml(auth.category)}</div></div><div class="cell"><div class="label">${isAr ? 'المعدة' : 'Equipment'}</div><div class="value">${escapeHtml(auth.equipmentModel || '—')}</div></div><div class="cell"><div class="label">${isAr ? 'رقم الشهادة' : 'Certificate No.'}</div><div class="value">${escapeHtml(auth.certificateNo)}</div></div><div class="cell"><div class="label">${isAr ? 'الإصدار' : 'Issue Date'}</div><div class="value">${escapeHtml(auth.issueDate)}</div></div><div class="cell"><div class="label">${isAr ? 'الانتهاء' : 'Expiry Date'}</div><div class="value">${escapeHtml(auth.expiryDate)}</div></div><div class="cell"><div class="label">${isAr ? 'الحالة' : 'Status'}</div><div class="value">${escapeHtml(auth.status)}</div></div></div><div style="margin-top:16px"><b>${isAr ? 'مرجع التدريب:' : 'Training Ref:'}</b> ${escapeHtml(auth.trainingRef || '—')} &nbsp; <b>${isAr ? 'المقيم:' : 'Assessor:'}</b> ${escapeHtml(auth.assessorName || '—')}</div><div class="footer"><div class="sig">HSE Manager / مدير السلامة</div><div class="sig">Assessor / المقيم</div><div class="sig">Employee / الموظف</div></div></div><script>setTimeout(()=>window.print(),250)</script></body></html>`);
    popup.document.close();
  };

  const handleSendAuth = () => {
    if (!activeAuth) return;
    const email = sendEmail.trim();
    if (!email) { toast.error(isAr ? "أدخل البريد الإلكتروني" : "Enter an email address"); return; }
    const subject = `${isAr ? 'تفويض معدات' : 'Equipment Authorization'} - ${activeAuth.certificateNo}`;
    const body = `${isAr ? 'تفويض تشغيل معدات رسمي' : 'Official Equipment Authorization'}\n\nEmployee: ${activeAuth.employeeName}\nEmployee ID: ${activeAuth.employeeId}\nCategory: ${activeAuth.category}\nEquipment: ${activeAuth.equipmentModel || '—'}\nCertificate: ${activeAuth.certificateNo}\nIssue: ${activeAuth.issueDate}\nExpiry: ${activeAuth.expiryDate}\nStatus: ${activeAuth.status}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setIsSendOpen(false);
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
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-blue-500 hover:bg-blue-500/10" title={isAr ? "معاينة" : "Preview"} onClick={() => { setActiveAuth(item); setIsPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-violet-500 hover:bg-violet-500/10" title={isAr ? "طباعة" : "Print"} onClick={() => handlePrintAuth(item)}><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-emerald-500 hover:bg-emerald-500/10" title={isAr ? "إرسال" : "Send"} onClick={() => { setActiveAuth(item); setIsSendOpen(true); }}><Send className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-cyan-500 hover:bg-cyan-500/10" title={isAr ? "عرض QR" : "View QR"} onClick={() => { setActiveAuth(item); setIsViewQRModal(true); }}><QrCode className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-500/10" title={isAr ? "حذف" : "Delete"} onClick={() => deleteAuth(item.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6"><DialogTitle>{isAr ? 'معاينة تفويض المعدات' : 'Equipment Authorization Preview'}</DialogTitle><DialogDescription>{isAr ? 'معاينة المستند الرسمي قبل الطباعة.' : 'Preview the official authorization before printing.'}</DialogDescription></DialogHeader>
          {activeAuth && <div className="mx-6 mb-6 border-4 border-emerald-700 rounded-3xl bg-white text-slate-900 p-7 shadow-xl" dir={isAr ? 'rtl' : 'ltr'}><div className="flex items-start justify-between border-b pb-5"><div><div className="text-2xl font-extrabold text-emerald-700">UTEC SAFETY BOARD</div><div className="text-sm text-slate-500">{isAr ? 'تفويض رسمي لتشغيل المعدة' : 'OFFICIAL EQUIPMENT AUTHORIZATION'}</div></div><div className="rounded-xl border px-3 py-2 text-xs font-bold">{activeAuth.certificateNo}</div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">{[[isAr?'اسم الموظف':'Employee Name',activeAuth.employeeName],[isAr?'الرقم الوظيفي':'Employee ID',activeAuth.employeeId],[isAr?'القسم':'Department',activeAuth.department],[isAr?'الفئة':'Category',activeAuth.category],[isAr?'المعدة':'Equipment',activeAuth.equipmentModel||'—'],[isAr?'الإصدار':'Issue Date',activeAuth.issueDate],[isAr?'الانتهاء':'Expiry Date',activeAuth.expiryDate],[isAr?'الحالة':'Status',activeAuth.status],[isAr?'مرجع التدريب':'Training Ref',activeAuth.trainingRef||'—']].map(([label,value]) => <div key={String(label)} className="border rounded-xl p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-bold mt-1">{value}</div></div>)}</div><div className="mt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-600"><div className="border-t pt-2">HSE Manager</div><div className="border-t pt-2">Assessor</div><div className="border-t pt-2">Employee</div></div></div>}
          <DialogFooter className="px-6 pb-6"><Button variant="outline" onClick={() => setIsPreviewOpen(false)}>{isAr ? 'إغلاق' : 'Close'}</Button>{activeAuth && <Button onClick={() => handlePrintAuth(activeAuth)} className="gap-2"><Printer className="h-4 w-4" />{isAr ? 'طباعة' : 'Print'}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader><DialogTitle>{isAr ? 'إرسال تفويض المعدات' : 'Send Equipment Authorization'}</DialogTitle><DialogDescription>{isAr ? 'سيتم فتح تطبيق البريد لإرسال بيانات التفويض.' : 'Your email app will open with the authorization details.'}</DialogDescription></DialogHeader>
          {activeAuth && <div className="space-y-4"><div className="rounded-2xl border p-4 bg-muted/30"><div className="font-bold">{activeAuth.employeeName}</div><div className="text-sm text-muted-foreground">{activeAuth.certificateNo} • {activeAuth.category}</div></div><div className="space-y-2"><Label>{isAr ? 'البريد الإلكتروني' : 'Email Address'}</Label><div className="relative"><Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" className="ps-9 rounded-2xl" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="name@example.com" /></div></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setIsSendOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button><Button onClick={handleSendAuth} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Send className="h-4 w-4" />{isAr ? 'إرسال' : 'Send'}</Button></DialogFooter>
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

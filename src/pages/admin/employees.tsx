"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, UserPlus, Search, Eye, CheckCircle2, QrCode, Printer, HardHat, ShieldCheck, UserCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  fullName: string;
  photoUrl?: string;
  department: string;
  jobTitle: string;
  factory: string;
  section: string;
  nationality: string;
  joiningDate: string;
  supervisor: string;
  email: string;
  phone: string;
  medicalStatus: "Fit" | "Fit with Limitations" | "Medical Review Due";
  ppeIssued: string[];
  digitalSignature?: string;
  qrCodeData?: string;
  incidentsCount: number;
  ncrCount: number;
  trainingsCompleted: number;
  status: "Active" | "On Leave" | "Terminated";
}

const SAMPLE_EMPLOYEES: EmployeeProfile[] = [
  {
    id: "EMP-001",
    employeeId: "EMP-1001",
    fullName: "Abdulkarem S. Alanzi",
    department: "Production",
    jobTitle: "Senior HSE Supervisor",
    factory: "Main Factory 1",
    section: "Assembly Line 4",
    nationality: "Saudi Arabia",
    joiningDate: "2021-03-15",
    supervisor: "Engineering Director",
    email: "abdulkareem.s.alanzi@gmail.com",
    phone: "+966 50 123 4567",
    medicalStatus: "Fit",
    ppeIssued: ["Safety Helmet", "Safety Shoes (S3)", "High-Vis Vest", "Safety Glasses"],
    incidentsCount: 0,
    ncrCount: 1,
    trainingsCompleted: 14,
    status: "Active"
  },
  {
    id: "EMP-002",
    employeeId: "EMP-1002",
    fullName: "Mohammad Hassan",
    department: "Maintenance",
    jobTitle: "Electrical Specialist",
    factory: "Main Factory 1",
    section: "HV Substation",
    nationality: "Egypt",
    joiningDate: "2022-01-10",
    supervisor: "Abdulkarem S. Alanzi",
    email: "mohammad.h@company.com",
    phone: "+966 55 987 6543",
    medicalStatus: "Fit",
    ppeIssued: ["Arc Flash Suit", "Insulated Gloves", "Safety Helmet", "Safety Boots"],
    incidentsCount: 1,
    ncrCount: 0,
    trainingsCompleted: 9,
    status: "Active"
  },
  {
    id: "EMP-003",
    employeeId: "EMP-1003",
    fullName: "Sarah Johnson",
    department: "HSE",
    jobTitle: "Safety Officer",
    factory: "Factory 2 - Logistics",
    section: "Warehouse A",
    nationality: "Jordan",
    joiningDate: "2023-06-01",
    supervisor: "Abdulkarem S. Alanzi",
    email: "sarah.j@company.com",
    phone: "+966 54 321 0987",
    medicalStatus: "Fit",
    ppeIssued: ["Safety Helmet", "High-Vis Vest", "Safety Shoes"],
    incidentsCount: 0,
    ncrCount: 0,
    trainingsCompleted: 18,
    status: "Active"
  }
];

export default function AdminEmployeesPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [employees, setEmployees] = useState<EmployeeProfile[]>(SAMPLE_EMPLOYEES);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfile | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);

  // New Employee Form State
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({
    fullName: "",
    employeeId: "",
    department: "Production",
    jobTitle: "Operator",
    factory: "Main Factory 1",
    section: "General",
    nationality: "Saudi Arabia",
    email: "",
    phone: "",
    medicalStatus: "Fit",
    status: "Active",
    ppeIssued: ["Safety Helmet", "Safety Shoes"]
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleAddEmployee = () => {
    if (!formData.fullName || !formData.employeeId) return;
    const newEmp: EmployeeProfile = {
      id: `EMP-${Date.now()}`,
      employeeId: formData.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: formData.fullName || "",
      department: formData.department || "Production",
      jobTitle: formData.jobTitle || "Technician",
      factory: formData.factory || "Main Factory 1",
      section: formData.section || "Section 1",
      nationality: formData.nationality || "Saudi Arabia",
      joiningDate: new Date().toISOString().split("T")[0],
      supervisor: "HSE Manager",
      email: formData.email || "",
      phone: formData.phone || "",
      medicalStatus: formData.medicalStatus as any || "Fit",
      ppeIssued: formData.ppeIssued || ["Safety Helmet", "Safety Shoes"],
      incidentsCount: 0,
      ncrCount: 0,
      trainingsCompleted: 0,
      status: "Active"
    };

    setEmployees([newEmp, ...employees]);
    setIsAddDialogOpen(false);
  };

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintBadge = () => {
    if (selectedEmp) {
      const printObj = {
        id: selectedEmp.id,
        type: "license" as const,
        refNo: selectedEmp.employeeId,
        title: `${isAr ? "بطاقة السلامة الرقمية" : "Digital Safety Passport"} - ${selectedEmp.fullName}`,
        department: selectedEmp.department,
        status: selectedEmp.status,
        date: new Date().toISOString().split("T")[0],
        sections: [
          { label: isAr ? "الاسم" : "Name", value: selectedEmp.fullName },
          { label: isAr ? "الرقم الوظيفي" : "Employee ID", value: selectedEmp.employeeId },
          { label: isAr ? "القسم والمصنع" : "Dept & Factory", value: `${selectedEmp.department} - ${selectedEmp.factory}` },
          { label: isAr ? "المسمى الوظيفي" : "Job Title", value: selectedEmp.jobTitle },
          { label: isAr ? "اللياقة الطبية" : "Medical Fitness", value: selectedEmp.medicalStatus },
          { label: isAr ? "الدورات المجتازة" : "Completed Trainings", value: selectedEmp.trainingsCompleted.toString() },
          { label: isAr ? "تاريخ الانضمام" : "Joining Date", value: selectedEmp.joiningDate },
        ]
      };
      setPrintItem(printObj);
      setIsPrintOpen(true);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-employees-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "سجل الموظفين والسلامة" : "Employee & Safety Records"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "إدارة الموظفين، الكفاءات، مصفوفة التدريب وسجلات السلامة" : "Manage employees, competencies, training history & safety passports"}
            </p>
          </div>
        </div>

        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          {isAr ? "إضافة موظف جديد" : "Add New Employee"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border/50 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الموظفين" : "Total Employees"}</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "مكتملي التدريب" : "Fully Trained"}</p>
              <p className="text-2xl font-bold text-emerald-600">{employees.filter(e => e.trainingsCompleted >= 5).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/50 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center text-white">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "معدات السلامة المصروفة" : "PPE Issued"}</p>
              <p className="text-2xl font-bold text-amber-600">100%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/50 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "اللياقة الطبية" : "Medical Fitness"}</p>
              <p className="text-2xl font-bold text-purple-600">{employees.filter(e => e.medicalStatus === "Fit").length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
            <Input
              placeholder={isAr ? "البحث باسم الموظف، الرقم الوظيفي، أو المسمى..." : "Search by name, ID, or title..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rtl:pr-9 rtl:pl-3"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isAr ? "كل الأقسام" : "All Departments"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "كل الأقسام" : "All Departments"}</SelectItem>
              <SelectItem value="Production">{isAr ? "الإنتاج" : "Production"}</SelectItem>
              <SelectItem value="Maintenance">{isAr ? "الصيانة" : "Maintenance"}</SelectItem>
              <SelectItem value="HSE">{isAr ? "السلامة والصحة المهنية" : "HSE"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{isAr ? "الرقم الوظيفي" : "Employee ID"}</TableHead>
                <TableHead>{isAr ? "القسم والمصنع" : "Dept & Factory"}</TableHead>
                <TableHead>{isAr ? "اللياقة الطبية" : "Medical Status"}</TableHead>
                <TableHead>{isAr ? "التدريبات" : "Trainings"}</TableHead>
                <TableHead>{isAr ? "سجل الحوادث" : "Incidents / NCR"}</TableHead>
                <TableHead className="text-right rtl:text-left">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-semibold flex items-center justify-center text-sm border border-blue-200">
                        {emp.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{emp.fullName}</p>
                        <p className="text-xs text-muted-foreground">{emp.jobTitle}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{emp.employeeId}</TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{emp.department}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.factory}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {emp.medicalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{emp.trainingsCompleted} {isAr ? "دورة" : "Courses"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      {emp.incidentsCount > 0 && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                          {emp.incidentsCount} Incidents
                        </Badge>
                      )}
                      {emp.ncrCount > 0 && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {emp.ncrCount} NCR
                        </Badge>
                      )}
                      {emp.incidentsCount === 0 && emp.ncrCount === 0 && (
                        <span className="text-muted-foreground text-xs">{isAr ? "سجل نظيف" : "Clean Record"}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right rtl:text-left">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedEmp(emp)}
                        title={isAr ? "معاينة الملف" : "View Profile"}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedEmp(emp); setIsBadgeDialogOpen(true); }}
                        title={isAr ? "بطاقة السلامة والـ QR" : "Safety Passport Badge"}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Employee Detail Dialog */}
      {selectedEmp && !isBadgeDialogOpen && (
        <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {selectedEmp.fullName.slice(0, 2)}
                </div>
                <div>
                  <h3>{selectedEmp.fullName}</h3>
                  <p className="text-xs text-muted-foreground font-normal">{selectedEmp.jobTitle} - {selectedEmp.employeeId}</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="profile" className="w-full mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="profile">{isAr ? "المعلومات" : "Profile"}</TabsTrigger>
                <TabsTrigger value="ppe">{isAr ? "معدات السلامة" : "PPE Issued"}</TabsTrigger>
                <TabsTrigger value="trainings">{isAr ? "التدريبات" : "Trainings"}</TabsTrigger>
                <TabsTrigger value="qr">{isAr ? "بطاقة QR" : "QR Badge"}</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "القسم" : "Department"}</span>
                    <span className="font-semibold">{selectedEmp.department}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "المصنع" : "Factory"}</span>
                    <span className="font-semibold">{selectedEmp.factory}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "البريد الإلكتروني" : "Email"}</span>
                    <span className="font-medium">{selectedEmp.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "رقم الهاتف" : "Phone"}</span>
                    <span className="font-medium">{selectedEmp.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "تاريخ الانضمام" : "Joining Date"}</span>
                    <span>{selectedEmp.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">{isAr ? "الجنسية" : "Nationality"}</span>
                    <span>{selectedEmp.nationality}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ppe" className="space-y-4 pt-4">
                <h4 className="font-semibold text-sm">{isAr ? "معدات الوقاية الشخصية المصروفة" : "Issued Safety PPE"}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedEmp.ppeIssued.map((item) => (
                    <div key={item} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/40 text-xs">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="trainings" className="pt-4">
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold">General HSE Induction & Orientation</p>
                      <p className="text-muted-foreground">Date: 2024-02-10 · Duration: 2 Hours</p>
                    </div>
                    <Badge className="bg-emerald-500">{isAr ? "مكتمل" : "Completed"}</Badge>
                  </div>
                  <div className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold">Fire Safety & Portable Extinguisher Handling</p>
                      <p className="text-muted-foreground">Date: 2024-04-12 · Duration: 3 Hours</p>
                    </div>
                    <Badge className="bg-emerald-500">{isAr ? "مكتمل" : "Completed"}</Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="pt-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 bg-white border rounded-xl shadow-md">
                  <QRCodeSVG value={`EMPLOYEE:${selectedEmp.employeeId}:${selectedEmp.fullName}`} size={160} />
                </div>
                <p className="font-mono text-xs font-bold">{selectedEmp.employeeId}</p>
                <Button size="sm" variant="outline" className="gap-2" onClick={handlePrintBadge}>
                  <Printer className="h-4 w-4" />
                  {isAr ? "طباعة بطاقة السلامة (Passport)" : "Print Safety Passport"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة موظف جديد" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold">{isAr ? "الاسم الكامل" : "Full Name"}</label>
              <Input
                placeholder="e.g. Abdulkarem Alanzi"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">{isAr ? "الرقم الوظيفي" : "Employee ID"}</label>
                <Input
                  placeholder="EMP-1004"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{isAr ? "القسم" : "Department"}</label>
                <Input
                  placeholder="Production"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">{isAr ? "المسمى الوظيفي" : "Job Title"}</label>
                <Input
                  placeholder="Technician"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{isAr ? "المصنع" : "Factory"}</label>
                <Input
                  placeholder="Factory 1"
                  value={formData.factory}
                  onChange={(e) => setFormData({ ...formData, factory: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAddEmployee} className="bg-blue-600 hover:bg-blue-700">{isAr ? "حفظ" : "Save Employee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safety Passport Badge Dialog */}
      {selectedEmp && isBadgeDialogOpen && (
        <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <DialogTitle>{isAr ? "بطاقة السلامة الرقمية (Safety Passport)" : "Digital Safety Passport Badge"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-blue-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-lg my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left rtl:text-right">
                  <p className="font-bold text-xs text-blue-900">ABDULKAREM SAFETY BOARD ENTERPRISE</p>
                  <p className="text-[10px] text-slate-500">Official HSE Identity Card</p>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">{selectedEmp.status}</Badge>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="h-16 w-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center border-2 border-blue-200 shadow">
                  {selectedEmp.fullName.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-base text-slate-900">{selectedEmp.fullName}</h3>
                <p className="text-xs text-slate-600 font-medium">{selectedEmp.jobTitle}</p>
                <p className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{selectedEmp.employeeId}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left rtl:text-right text-[11px] bg-slate-50 p-2.5 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "القسم:" : "Dept:"}</span> <span className="font-semibold">{selectedEmp.department}</span></div>
                <div><span className="text-slate-500">{isAr ? "المصنع:" : "Factory:"}</span> <span className="font-semibold">{selectedEmp.factory}</span></div>
                <div><span className="text-slate-500">{isAr ? "اللياقة الطبية:" : "Medical:"}</span> <span className="font-semibold text-emerald-600">{selectedEmp.medicalStatus}</span></div>
                <div><span className="text-slate-500">{isAr ? "التدريبات:" : "Trainings:"}</span> <span className="font-semibold">{selectedEmp.trainingsCompleted} Passed</span></div>
              </div>

              <div className="flex flex-col items-center pt-2">
                <div className="p-2 bg-white border rounded-lg shadow-sm">
                  <QRCodeSVG value={`EMPLOYEE:${selectedEmp.employeeId}:${selectedEmp.fullName}`} size={110} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Scan for Instant Verification</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBadgeDialogOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button onClick={() => { setIsBadgeDialogOpen(false); handlePrintBadge(); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة البطاقة" : "Print Badge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

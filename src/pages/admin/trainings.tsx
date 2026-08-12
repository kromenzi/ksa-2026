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
  GraduationCap, Plus, Search, Eye, Printer, Award, CheckCircle2, 
  Sparkles, BookOpen, Clock, AlertTriangle, Users
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PrintShareDialog from "@/components/print-share-dialog";
import DepartmentTrainingWorkflow from "@/components/training/DepartmentTrainingWorkflow";
import AIDocumentAnalyzer from "@/components/training/AIDocumentAnalyzer";
import CompetencyMatrix from "@/components/training/CompetencyMatrix";
import PrintableAttendanceRecord from "@/components/training/PrintableAttendanceRecord";

export interface AttendanceRow {
  no: number;
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  status: "present" | "absent" | "excused";
  remarks: string;
}

export interface TrainingRecord {
  id: string;
  refNo: string;
  title: string;
  category: string;
  trainer: string;
  department: string;
  factory: string;
  location: string;
  date: string;
  time: string;
  duration: string;
  language: string;
  objectives: string;
  topics: string[];
  hazards: string[];
  controlMeasures: string[];
  requiredPpe: string[];
  attendance: AttendanceRow[];
  status: "Completed" | "Scheduled" | "Cancelled";
  certificateGenerated: boolean;
  photo1?: string;
  photo2?: string;
}

const SAMPLE_TRAININGS: TrainingRecord[] = [
  {
    id: "TRN-001",
    refNo: "TBT-2024-881",
    title: "Electrical Hazard Awareness & LOTO Safeguards",
    category: "Toolbox Talk",
    trainer: "Abdulkarem S. Alanzi",
    department: "Maintenance",
    factory: "Main Factory 1",
    location: "HV Switchgear Room",
    date: "2024-05-10",
    time: "08:30 AM",
    duration: "45 Mins",
    language: "Arabic / English",
    objectives: "Identify electric shock risks, arc flash hazards.",
    topics: ["Arc Flash PPE", "Lockout Tagout Steps"],
    hazards: ["High Voltage Exposure", "Arc Blast Hazard"],
    controlMeasures: ["Use NFPA 70E insulated tools", "Apply LOTO Padlocks"],
    requiredPpe: ["Safety Helmet", "Arc Flash Shield"],
    attendance: [
      { no: 1, employeeName: "Abdulkarem Alanzi", employeeId: "EMP-1001", department: "Production", jobTitle: "HSE Supervisor", status: "present", remarks: "Lead Trainer" },
      { no: 2, employeeName: "Mohammad Hassan", employeeId: "EMP-1002", department: "Maintenance", jobTitle: "Electrical Specialist", status: "present", remarks: "Passed Q&A" }
    ],
    status: "Completed",
    certificateGenerated: true
  }
];

export default function AdminTrainingsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [view, setView] = useState<"dashboard" | "department-training" | "ai-analyzer">("dashboard");
  const [trainings, setTrainings] = useState<TrainingRecord[]>(SAMPLE_TRAININGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [activeRecord, setActiveRecord] = useState<TrainingRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [selectedCertEmp, setSelectedCertEmp] = useState<AttendanceRow | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const filteredTrainings = trainings.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.refNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleSaveRecord = () => {
    if (!activeRecord) return;
    const existingIndex = trainings.findIndex((t) => t.id === activeRecord.id);
    if (existingIndex >= 0) {
      const updated = [...trainings];
      updated[existingIndex] = activeRecord;
      setTrainings(updated);
    } else {
      setTrainings([activeRecord, ...trainings]);
    }
    setIsFormOpen(false);
  };

  const handlePrintTrainingSession = (item: TrainingRecord) => {
    // Generate the professional A4 custom report object
    const printObj = {
      id: item.id,
      type: "report" as const,
      refNo: item.refNo,
      title: `${isAr ? "سجل حضور التدريب" : "Training Attendance Record"} - ${item.title}`,
      department: item.department,
      status: item.status,
      date: item.date,
      createdAt: item.date,
      // We embed the raw data to be used if we render the custom A4 template, but fallback to sections
      rawData: item,
      sections: [
        { label: isAr ? "الرقم المرجعي" : "Ref No", value: item.refNo },
        { label: isAr ? "الموضوع" : "Topic", value: item.title },
        { label: isAr ? "المصنع والقسم" : "Factory / Dept", value: `${item.factory} - ${item.department}` },
        { label: isAr ? "المدرب" : "Trainer", value: item.trainer },
        { label: isAr ? "التاريخ والوقت" : "Date & Time", value: `${item.date} (${item.time})` },
        { label: isAr ? "الحضور" : "Attendance", value: item.attendance.map(a => `${a.no}. ${a.employeeName} (${a.employeeId})`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintCertificate = (item: TrainingRecord, emp: AttendanceRow) => {
    const printObj = {
      id: `CERT-${item.refNo}-${emp.employeeId}`,
      type: "certificate" as const,
      refNo: `CERT-${item.refNo}`,
      title: isAr ? `شهادة إتمام دورة تدريبية - ${emp.employeeName}` : `Training Certificate of Completion - ${emp.employeeName}`,
      department: emp.department,
      status: "Passed & Certified",
      date: item.date,
      createdAt: item.date,
      sections: [
        { label: isAr ? "اسم المتدرب" : "Trainee Name", value: emp.employeeName },
        { label: isAr ? "الرقم الوظيفي" : "Employee ID", value: emp.employeeId },
        { label: isAr ? "اسم الدورة" : "Course Title", value: item.title },
        { label: isAr ? "تاريخ الانعقاد والمدة" : "Date & Duration", value: `${item.date} (${item.duration})` },
        { label: isAr ? "المدرب المعتمد" : "Certified Trainer", value: item.trainer },
        { label: isAr ? "الاعتماد" : "Certification Status", value: "PASSED & VERIFIED" }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const onDepartmentTrainingSave = (data: any) => {
    const newRecord: TrainingRecord = {
      id: `TRN-${Date.now()}`,
      refNo: `TRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: data.topic,
      category: data.type || "Department Training",
      trainer: data.trainer,
      department: data.department,
      factory: data.factory,
      location: data.location,
      date: data.date,
      time: data.time,
      duration: data.duration,
      language: "English / Arabic",
      objectives: "",
      topics: [],
      hazards: [],
      controlMeasures: [],
      requiredPpe: [],
      attendance: data.employees.map((empId: string, idx: number) => ({
        no: idx + 1,
        employeeName: `Employee ${empId}`, // Mock map here, real app uses lookup
        employeeId: empId,
        department: data.department,
        jobTitle: "Staff",
        status: "present",
        remarks: ""
      })),
      status: "Completed",
      certificateGenerated: false,
      photo1: data.photo1,
      photo2: data.photo2
    };
    setTrainings([newRecord, ...trainings]);
    setView("dashboard");
  };

  const onAIAnalyzerConfirm = (data: any[]) => {
    const newRecord: TrainingRecord = {
      id: `TRN-${Date.now()}`,
      refNo: `OCR-TRN-${Math.floor(1000 + Math.random() * 9000)}`,
      title: "Imported Training Record",
      category: "Imported",
      trainer: "Unknown",
      department: "Multiple",
      factory: "Main Factory 1",
      location: "Unknown",
      date: new Date().toISOString().split("T")[0],
      time: "00:00",
      duration: "Unknown",
      language: "Unknown",
      objectives: "Extracted via OCR",
      topics: [],
      hazards: [],
      controlMeasures: [],
      requiredPpe: [],
      attendance: data.map((d, idx) => ({
        no: idx + 1,
        employeeName: d.match.name,
        employeeId: d.match.id,
        department: d.match.department,
        jobTitle: d.match.title,
        status: "present",
        remarks: "OCR Match"
      })),
      status: "Completed",
      certificateGenerated: false,
    };
    setActiveRecord(newRecord);
    setIsFormOpen(true);
    setView("dashboard");
  };

  return (
    <div className="space-y-6" data-testid="admin-trainings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "التدريب والكفاءة" : "Training & Competency"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "إدارة التدريب، الحضور، الكفاءة، الشهادات ومصفوفة التدريب" : "Training, attendance, competency, certifications and training matrix."}
            </p>
          </div>
        </div>

        {view === "dashboard" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
              onClick={() => setView("ai-analyzer")}
            >
              <Sparkles className="h-4 w-4" />
              {isAr ? "تحليل مستند (AI)" : "AI Document Analyzer"}
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setView("department-training")}
            >
              <Users className="h-4 w-4" />
              {isAr ? "تدريب قسم كامل" : "Department Training"}
            </Button>

            <Button
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                setActiveRecord({
                  id: `TRN-${Date.now()}`,
                  refNo: `TRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                  title: "",
                  category: "Toolbox Talk",
                  trainer: "",
                  department: "",
                  factory: "",
                  location: "",
                  date: new Date().toISOString().split("T")[0],
                  time: "09:00",
                  duration: "60 Mins",
                  language: "English / Arabic",
                  objectives: "",
                  topics: [],
                  hazards: [],
                  controlMeasures: [],
                  requiredPpe: [],
                  attendance: [],
                  status: "Scheduled",
                  certificateGenerated: false
                });
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {isAr ? "إنشاء تدريب" : "Create Training"}
            </Button>
          </div>
        )}
      </div>

      {view === "dashboard" && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-border/50 bg-gradient-to-br from-indigo-50 to-indigo-100/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-semibold">{isAr ? "إجمالي التدريبات" : "Total Trainings"}</p>
                <BookOpen className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold">{trainings.length + 142}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "هذا العام" : "This Year"}</p>
            </Card>

            <Card className="p-4 border-border/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-semibold">{isAr ? "الموظفون المدربون" : "Employees Trained"}</p>
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">1,204</p>
              <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "85% نسبة التغطية" : "85% Coverage"}</p>
            </Card>

            <Card className="p-4 border-border/50 bg-gradient-to-br from-blue-50 to-blue-100/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-semibold">{isAr ? "ساعات التدريب" : "Training Hours"}</p>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-700">3,450</p>
              <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "إجمالي التراكمي" : "Cumulative Total"}</p>
            </Card>

            <Card className="p-4 border-border/50 bg-gradient-to-br from-amber-50 to-amber-100/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-semibold">{isAr ? "متوسط الكفاءة" : "Avg Competency"}</p>
                <Award className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700">92%</p>
              <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "معدل التقييم الإجمالي" : "Overall Assessment Rate"}</p>
            </Card>
          </div>

          <Tabs defaultValue="records" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
              <TabsTrigger value="records" className="py-2">{isAr ? "سجل التدريبات" : "Training Records"}</TabsTrigger>
              <TabsTrigger value="competency" className="py-2">{isAr ? "مصفوفة الكفاءة" : "Competency Matrix"}</TabsTrigger>
              <TabsTrigger value="gap" className="py-2">{isAr ? "تحليل الفجوات" : "Gap Analysis"}</TabsTrigger>
              <TabsTrigger value="calendar" className="py-2">{isAr ? "الجدول الزمني" : "Calendar"}</TabsTrigger>
            </TabsList>

            <TabsContent value="records" className="pt-4 space-y-4">
              <Card className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                    <Input
                      placeholder={isAr ? "البحث بالرقم المرجعي، عنوان التدريب..." : "Search by Ref No, title..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 rtl:pr-9 rtl:pl-3"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={isAr ? "كل الفئات" : "All Categories"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isAr ? "كل الفئات" : "All Categories"}</SelectItem>
                      <SelectItem value="Toolbox Talk">Toolbox Talk</SelectItem>
                      <SelectItem value="Fire Safety">Fire Safety</SelectItem>
                      <SelectItem value="Department Training">Department Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>{isAr ? "الرقم" : "Ref No"}</TableHead>
                        <TableHead>{isAr ? "التدريب" : "Training"}</TableHead>
                        <TableHead>{isAr ? "المدرب والقسم" : "Trainer & Dept"}</TableHead>
                        <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                        <TableHead>{isAr ? "الحضور" : "Attendance"}</TableHead>
                        <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                        <TableHead className="text-right rtl:text-left">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrainings.map((trn) => (
                        <TableRow key={trn.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-xs font-semibold">{trn.refNo}</TableCell>
                          <TableCell>
                            <p className="font-semibold text-sm">{trn.title}</p>
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 mt-0.5">
                              {trn.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium">{trn.trainer}</p>
                            <p className="text-[10px] text-muted-foreground">{trn.department}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs">{trn.date}</p>
                            <p className="text-[10px] text-muted-foreground">{trn.duration}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {trn.attendance.length} {isAr ? "موظف" : "Trainees"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {trn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right rtl:text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                onClick={() => handlePrintTrainingSession(trn)}
                                title={isAr ? "طباعة السجل" : "Print Record"}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => { setActiveRecord(trn); setIsFormOpen(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="competency" className="pt-4">
              <Card className="p-6">
                <CompetencyMatrix isAr={isAr} />
              </Card>
            </TabsContent>
            
            <TabsContent value="gap" className="pt-4">
              <Card className="p-12 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4 opacity-80" />
                <h3 className="text-xl font-bold">{isAr ? "تحليل فجوات التدريب" : "Training Gap Analysis"}</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {isAr 
                    ? "يتم حالياً تحليل فجوات الكفاءة والتدريبات المنتهية. (وحدة قيد التطوير)" 
                    : "Analyzing competency gaps and expired trainings. (Module under development)"}
                </p>
                <div className="mt-6 flex gap-4 text-sm text-left rtl:text-right bg-slate-50 p-4 rounded-lg w-full max-w-lg border">
                  <div className="flex-1 border-r rtl:border-l rtl:border-r-0 px-4">
                    <p className="font-bold text-red-600 mb-2">14</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "موظف يفتقرون للتدريب الأساسي" : "Employees missing required training"}</p>
                  </div>
                  <div className="flex-1 px-4">
                    <p className="font-bold text-amber-600 mb-2">6</p>
                    <p className="text-xs text-muted-foreground">{isAr ? "تدريبات منتهية الصلاحية" : "Expired training certificates"}</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="pt-4">
              <Card className="p-12 flex flex-col items-center justify-center text-center">
                <Clock className="h-12 w-12 text-indigo-300 mb-4" />
                <h3 className="text-xl font-bold">{isAr ? "الجدول الزمني للتدريبات" : "Training Calendar"}</h3>
                <p className="text-muted-foreground mt-2">{isAr ? "عرض التدريبات المجدولة والسابقة (وحدة قيد التطوير)" : "View scheduled and past trainings (Module under development)"}</p>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {view === "department-training" && (
        <DepartmentTrainingWorkflow 
          isAr={isAr} 
          onCancel={() => setView("dashboard")} 
          onSave={onDepartmentTrainingSave} 
        />
      )}

      {view === "ai-analyzer" && (
        <AIDocumentAnalyzer 
          isAr={isAr} 
          onCancel={() => setView("dashboard")} 
          onConfirm={onAIAnalyzerConfirm} 
        />
      )}

      {/* Edit / Detail Record Dialog */}
      {activeRecord && isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{isAr ? "معلومات التدريب" : "Training Record"}</span>
                <Button variant="outline" size="sm" onClick={() => handlePrintTrainingSession(activeRecord)} className="gap-2">
                  <Printer className="h-4 w-4" />
                  {isAr ? "طباعة المستند الاحترافي" : "Print A4 Record"}
                </Button>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details" className="w-full mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="details">{isAr ? "البيانات الأساسية" : "Basic Info"}</TabsTrigger>
                <TabsTrigger value="attendance">{isAr ? "جدول الحضور" : "Attendance"}</TabsTrigger>
                <TabsTrigger value="photos">{isAr ? "الصور والوثائق" : "Photos"}</TabsTrigger>
                <TabsTrigger value="preview">{isAr ? "المعاينة A4" : "A4 Preview"}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3 pt-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "عنوان التدريب" : "Training Topic"}</label>
                    <Input value={activeRecord.title} onChange={(e) => setActiveRecord({ ...activeRecord, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "الرقم المرجعي" : "Ref No"}</label>
                    <Input value={activeRecord.refNo} onChange={(e) => setActiveRecord({ ...activeRecord, refNo: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "اسم المدرب" : "Trainer"}</label>
                    <Input value={activeRecord.trainer} onChange={(e) => setActiveRecord({ ...activeRecord, trainer: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "القسم" : "Department"}</label>
                    <Input value={activeRecord.department} onChange={(e) => setActiveRecord({ ...activeRecord, department: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "المصنع" : "Factory"}</label>
                    <Input value={activeRecord.factory} onChange={(e) => setActiveRecord({ ...activeRecord, factory: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "التاريخ" : "Date"}</label>
                    <Input type="date" value={activeRecord.date} onChange={(e) => setActiveRecord({ ...activeRecord, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "المدة" : "Duration"}</label>
                    <Input value={activeRecord.duration} onChange={(e) => setActiveRecord({ ...activeRecord, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">{isAr ? "الوقت" : "Time"}</label>
                    <Input type="time" value={activeRecord.time} onChange={(e) => setActiveRecord({ ...activeRecord, time: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-3 pt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{isAr ? "اسم الموظف" : "Employee Name"}</TableHead>
                        <TableHead>{isAr ? "الرقم الوظيفي" : "Employee ID"}</TableHead>
                        <TableHead>{isAr ? "القسم" : "Dept"}</TableHead>
                        <TableHead className="text-right">{isAr ? "الشهادة" : "Certificate"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRecord.attendance.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.no}</TableCell>
                          <TableCell className="font-semibold">{row.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{row.employeeId}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs text-amber-600 hover:text-amber-700"
                              onClick={() => {
                                setSelectedCertEmp(row);
                                setIsCertOpen(true);
                              }}
                            >
                              <Award className="h-3.5 w-3.5" />
                              {isAr ? "إصدار شهادة" : "Certificate"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded p-4 text-center">
                    <p className="font-bold mb-2">{isAr ? "صورة نشاط التدريب" : "Training Activity Photo"}</p>
                    {activeRecord.photo1 ? (
                      <img src={activeRecord.photo1} alt="Activity" className="w-full h-48 object-cover rounded" />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400">No Photo</div>
                    )}
                  </div>
                  <div className="border rounded p-4 text-center">
                    <p className="font-bold mb-2">{isAr ? "صورة مجموعة الحضور" : "Training Group Photo"}</p>
                    {activeRecord.photo2 ? (
                      <img src={activeRecord.photo2} alt="Group" className="w-full h-48 object-cover rounded" />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400">No Photo</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="pt-4 bg-slate-100 p-6 rounded-md overflow-x-auto flex justify-center">
                 <div className="scale-[0.8] origin-top">
                   <PrintableAttendanceRecord data={activeRecord} isAr={isAr} />
                 </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleSaveRecord} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {isAr ? "حفظ التغييرات" : "Save Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Printable Certificate Dialog */}
      {activeRecord && isCertOpen && selectedCertEmp && (
        <Dialog open={isCertOpen} onOpenChange={setIsCertOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "معاينة الشهادة" : "Printable Training Certificate"}</DialogTitle>
            </DialogHeader>
            <div className="p-6 border-4 border-double border-indigo-600 rounded-xl bg-white text-slate-900 space-y-4 text-center">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left rtl:text-right">
                  <h3 className="font-bold text-lg tracking-wider text-indigo-950">UTEC ENTERPRISE</h3>
                  <p className="text-xs text-slate-500">HSE Training & Competency Division</p>
                </div>
                <QRCodeSVG value={`CERT:${activeRecord.refNo}:${selectedCertEmp.employeeId}`} size={50} />
              </div>

              <div className="py-2">
                <h2 className="text-2xl font-serif font-bold text-indigo-900 uppercase tracking-wide">CERTIFICATE OF COMPLETION</h2>
                <p className="text-xs text-slate-500 italic mt-1">This is to certify that</p>
                <h3 className="text-xl font-bold underline decoration-indigo-500 underline-offset-4 mt-2">{selectedCertEmp.employeeName}</h3>
                <p className="text-xs font-mono text-slate-600">ID: {selectedCertEmp.employeeId} · {selectedCertEmp.department}</p>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed px-4">
                Has successfully completed the Safety Training / Toolbox Talk course on:
                <p className="font-bold text-sm text-indigo-950 mt-1">"{activeRecord.title}"</p>
                <p className="text-[11px] text-slate-500 mt-1">Ref No: {activeRecord.refNo} · Date: {activeRecord.date} · Duration: {activeRecord.duration}</p>
              </div>

              <div className="flex items-center justify-between pt-6 text-xs border-t">
                <div className="text-center">
                  <p className="font-semibold text-slate-900">{activeRecord.trainer}</p>
                  <p className="text-[10px] text-slate-500">Certified Trainer / HSE Manager</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px] text-slate-400">Digitally Verified</p>
                  <p className="text-[10px] font-bold text-emerald-600">PASSED & VERIFIED</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCertOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  const rec = activeRecord;
                  const emp = selectedCertEmp;
                  setIsCertOpen(false);
                  handlePrintCertificate(rec, emp);
                }} 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة الشهادة" : "Print Certificate"}
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
          customContent={printItem.rawData ? (
            <PrintableAttendanceRecord data={printItem.rawData} isAr={isAr} />
          ) : undefined}
        />
      )}
    </div>
  );
}

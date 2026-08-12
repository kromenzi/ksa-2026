"use client";

import React, { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Search, Printer, Eye, Grid, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PrintShareDialog from "@/components/print-share-dialog";

export interface RiskItem {
  id: string;
  refNo: string;
  activity: string;
  location: string;
  department: string;
  hazard: string;
  initialLikelihood: number;
  initialSeverity: number;
  initialRiskScore: number;
  existingControls: string;
  additionalControls: string;
  residualLikelihood: number;
  residualSeverity: number;
  residualRiskScore: number;
  responsiblePerson: string;
  reviewDate: string;
  status: "Active" | "Under Review" | "Approved";
}

const DEFAULT_RISKS: RiskItem[] = [
  {
    id: "RA-001",
    refNo: "RA-2024-05",
    activity: "Forklift Material Loading & Unloading in Narrow Aisle",
    location: "High Bay Storage Warehouse B",
    department: "Logistics & Supply Chain",
    hazard: "Pedestrian-Vehicle Collision & Overturning Heavy Cargo",
    initialLikelihood: 4,
    initialSeverity: 4,
    initialRiskScore: 16, // Critical Red
    existingControls: "Pedestrian walkway lines painted on epoxy floor. High-visibility vests mandatory.",
    additionalControls: "Install blue LED proximity warning lights on all forklifts, set speed limiters to 8 km/h, and install motion sensors.",
    residualLikelihood: 2,
    residualSeverity: 3,
    residualRiskScore: 6, // Low-Medium
    responsiblePerson: "Abdulkarem S. Alanzi",
    reviewDate: "2024-12-01",
    status: "Approved",
  },
  {
    id: "RA-002",
    refNo: "RA-2024-09",
    activity: "High Voltage Substation Transformer Maintenance",
    location: "Substation #4 - Plant 1",
    department: "Electrical Maintenance",
    hazard: "Electrical Arc Flash, High Voltage Shock & Explosive Burn",
    initialLikelihood: 3,
    initialSeverity: 5,
    initialRiskScore: 15, // Critical Red
    existingControls: "LOTO Permit system enforced. Rubber insulating mats deployed.",
    additionalControls: "Mandatory Category 4 Arc Flash Suits (40 cal/cm²), thermal imaging pre-check, and dual-lockout authorization.",
    residualLikelihood: 1,
    residualSeverity: 4,
    residualRiskScore: 4, // Low
    responsiblePerson: "Eng. Saeed Al-Ghamdi",
    reviewDate: "2025-01-15",
    status: "Approved",
  },
  {
    id: "RA-003",
    refNo: "RA-2024-12",
    activity: "Chemical Solvent Tank Cleaning & Vessel Entry",
    location: "Chemical Processing Facility - Plant 2",
    department: "Process Operations",
    hazard: "Toxic Vapor Inhalation, Oxygen Deficiency & Asphyxiation",
    initialLikelihood: 4,
    initialSeverity: 5,
    initialRiskScore: 20, // Critical Red
    existingControls: "Ventilation fan installed. Continuous gas monitoring meter.",
    additionalControls: "Supplied-air breathing apparatus (SABA), emergency tripod retrieval harness, and dedicated standby observer.",
    residualLikelihood: 1,
    residualSeverity: 3,
    residualRiskScore: 3, // Low
    responsiblePerson: "Tariq Mansoor",
    reviewDate: "2024-11-20",
    status: "Approved",
  },
];

const getRiskLevel = (score: number) => {
  if (score >= 15) return { label: "High / Critical", color: "bg-red-600 hover:bg-red-700" };
  if (score >= 8) return { label: "Medium", color: "bg-amber-500 hover:bg-amber-600 text-slate-900" };
  return { label: "Low", color: "bg-emerald-500 hover:bg-emerald-600 text-white" };
};

const RiskBadge = ({ score, isAr }: { score: number, isAr: boolean }) => {
  const level = getRiskLevel(score);
  return (
    <Badge className={`${level.color} font-mono font-bold px-3 py-1 shadow-sm`}>
      {score} - {isAr && score >= 15 ? "حرج / مرتفع" : isAr && score >= 8 ? "متوسط" : isAr ? "منخفض" : level.label}
    </Badge>
  );
};

export default function AdminRiskAssessmentPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const { toast } = useToast();

  const [risks, setRisks] = useState<RiskItem[]>(() => {
    const saved = localStorage.getItem("safety_board_risks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_RISKS;
      }
    }
    return DEFAULT_RISKS;
  });

  useEffect(() => {
    localStorage.setItem("safety_board_risks", JSON.stringify(risks));
  }, [risks]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintRiskSheet = (item: RiskItem) => {
    const printObj = {
      id: item.id,
      type: "risk_assessment" as const,
      refNo: item.refNo,
      title: `${isAr ? "نموذج تقييم وحصر المخاطر" : "Risk Assessment Sheet"} - ${item.activity}`,
      department: item.department,
      status: item.status,
      date: item.reviewDate,
      createdAt: item.reviewDate,
      sections: [
        { label: isAr ? "الرقم المرجعي" : "Ref No", value: item.refNo },
        { label: isAr ? "النشاط / المهمة" : "Activity / Task", value: item.activity },
        { label: isAr ? "الموقع التفصيلي" : "Location", value: item.location },
        { label: isAr ? "القسم المسجل" : "Department", value: item.department },
        { label: isAr ? "الخطر والمخاطرة المحددة" : "Identified Hazard & Risks", value: item.hazard },
        { label: isAr ? "تقييم المخاطرة الأولية" : "Initial Risk Rating", value: `Score: ${item.initialRiskScore} (L:${item.initialLikelihood} x S:${item.initialSeverity})` },
        { label: isAr ? "ضوابط التحكم الحالية" : "Existing Control Measures", value: item.existingControls },
        { label: isAr ? "ضوابط التحكم الإضافية المطلوبة" : "Additional Required Controls", value: item.additionalControls },
        { label: isAr ? "تقييم المخاطرة المتبقية" : "Residual Risk Rating", value: `Score: ${item.residualRiskScore} (L:${item.residualLikelihood} x S:${item.residualSeverity})` },
        { label: isAr ? "مسؤول المتابعة والتنفيذ" : "Responsible Owner", value: item.responsiblePerson },
        { label: isAr ? "تاريخ المراجعة القادمة" : "Review Date", value: item.reviewDate }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllRisks = () => {
    const listToPrint = filteredRisks.length > 0 ? filteredRisks : risks;
    const printObj = {
      id: "RA-SUMMARY-ALL",
      type: "report" as const,
      refNo: "HSE-RISK-REGISTER-5X5",
      title: isAr ? "السجل الموحد لتقييم وحصر المخاطر (Matrix 5x5)" : "Unified Enterprise Risk Assessment Register",
      department: "HSE Risk Management Division",
      status: "Approved",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي التقييمات المسجلة" : "Total Assessments", value: `${listToPrint.length} ${isAr ? "تقييم" : "assessments"}` },
        { label: isAr ? "المخاطر الحرجة / المرتفعة" : "Critical / High Risks (Score >= 15)", value: `${listToPrint.filter(r => r.initialRiskScore >= 15).length}` },
        { label: isAr ? "تفاصيل سجل المخاطر" : "Risk Register Detail", value: listToPrint.map(r => `[${r.refNo}] ${r.activity} (${r.location}) - Initial: ${r.initialRiskScore} -> Residual: ${r.residualRiskScore} [${r.status}]`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const [formData, setFormData] = useState<Partial<RiskItem>>({
    refNo: "",
    activity: "",
    location: "",
    department: "",
    hazard: "",
    initialLikelihood: 3,
    initialSeverity: 3,
    initialRiskScore: 9,
    existingControls: "",
    additionalControls: "",
    residualLikelihood: 2,
    residualSeverity: 2,
    residualRiskScore: 4,
    responsiblePerson: "",
    reviewDate: new Date().toISOString().split("T")[0],
    status: "Active",
  });

  const calculateScore = (l: number, s: number) => l * s;

  const handleOpenAdd = () => {
    const nextNum = risks.length + 1;
    setEditingRisk(null);
    setFormData({
      refNo: `RA-${new Date().getFullYear()}-${nextNum < 10 ? "0" + nextNum : nextNum}`,
      activity: "",
      location: "Main Production Floor",
      department: "HSE Operations",
      hazard: "",
      initialLikelihood: 4,
      initialSeverity: 4,
      initialRiskScore: 16,
      existingControls: "",
      additionalControls: "",
      residualLikelihood: 2,
      residualSeverity: 3,
      residualRiskScore: 6,
      responsiblePerson: "Safety Officer",
      reviewDate: new Date().toISOString().split("T")[0],
      status: "Active",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: RiskItem) => {
    setEditingRisk(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity || !formData.hazard) {
      toast({
        title: isAr ? "خطأ في البيانات" : "Validation Error",
        description: isAr ? "يرجى كتابة اسم النشاط والخطر المحدد" : "Please specify activity name and hazard description",
        variant: "destructive",
      });
      return;
    }

    const initScore = calculateScore(formData.initialLikelihood || 3, formData.initialSeverity || 3);
    const resScore = calculateScore(formData.residualLikelihood || 2, formData.residualSeverity || 2);

    if (editingRisk) {
      setRisks((prev) =>
        prev.map((r) =>
          r.id === editingRisk.id
            ? ({
                ...r,
                ...formData,
                initialRiskScore: initScore,
                residualRiskScore: resScore,
              } as RiskItem)
            : r
        )
      );
      toast({
        title: isAr ? "تم تعديل تقييم المخاطر" : "Risk Assessment Updated",
        description: isAr ? `تم تحديث التقييم ${formData.refNo} بنجاح` : `Updated ${formData.refNo} successfully`,
      });
    } else {
      const newRisk: RiskItem = {
        id: `RA-${Date.now()}`,
        refNo: formData.refNo || `RA-${Date.now()}`,
        activity: formData.activity || "Safety Activity",
        location: formData.location || "General Area",
        department: formData.department || "HSE",
        hazard: formData.hazard || "Unspecified Hazard",
        initialLikelihood: Number(formData.initialLikelihood) || 3,
        initialSeverity: Number(formData.initialSeverity) || 3,
        initialRiskScore: initScore,
        existingControls: formData.existingControls || "Standard PPE",
        additionalControls: formData.additionalControls || "Engineering & Administrative Controls",
        residualLikelihood: Number(formData.residualLikelihood) || 2,
        residualSeverity: Number(formData.residualSeverity) || 2,
        residualRiskScore: resScore,
        responsiblePerson: formData.responsiblePerson || "HSE Manager",
        reviewDate: formData.reviewDate || new Date().toISOString().split("T")[0],
        status: (formData.status as "Active" | "Under Review" | "Approved") || "Active",
      };

      setRisks((prev) => [newRisk, ...prev]);
      toast({
        title: isAr ? "تمت إضافة تقييم مخاطر جديد" : "New Assessment Added",
        description: isAr ? `تم إنشاء تقييم المخاطر ${newRisk.refNo} بنجاح` : `Created ${newRisk.refNo} successfully`,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDeleteRisk = (id: string, refNo: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
    toast({
      title: isAr ? "تم الحذف" : "Assessment Removed",
      description: isAr ? `تم حذف ${refNo}` : `Removed ${refNo}`,
    });
  };

  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      r.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.hazard.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-testid="admin-risk-assessment-page">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {isAr ? "تقييم وحصر المخاطر (Risk Assessment Matrix 5x5)" : "Risk Assessment & Hazard Control Engine"}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? "مصفوفة تحديد الأخطار، حساب المخاطر الأولية والمتبقية وضوابط السلامة الاحترافية" : "Interactive 5x5 risk rating, residual risk reduction & HSE control measures"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrintAllRisks} variant="outline" className="gap-2 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" data-testid="button-print-risk-header">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة السجل" : "Print Risk Register"}
          </Button>

          <Button onClick={handleOpenAdd} className="gap-2 bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20">
            <Plus className="h-4 w-4" />
            {isAr ? "تقييم مخاطر جديد" : "New Risk Assessment"}
          </Button>
        </div>
      </div>

      {/* 5x5 Matrix Visual Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
            <Grid className="h-4 w-4 text-amber-600" />
            {isAr ? "مصفوفة 5x5 القياسية لتقييم المخاطر (Likelihood x Severity Matrix)" : "Standard 5x5 Risk Evaluation Matrix"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {isAr ? "الاحتمالية (1 - 5) × الشدة والخطورة (1 - 5) = درجة المخاطرة الأولية والمتبقية" : "Probability (1-5) × Severity (1-5) = Risk Score Rating"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="grid grid-cols-6 gap-1.5 text-center text-[11px] font-bold">
              <div className="p-2 bg-slate-100 rounded text-slate-500">L \ S</div>
              <div className="p-2 bg-slate-100 rounded text-slate-700">1 (Negligible)</div>
              <div className="p-2 bg-slate-100 rounded text-slate-700">2 (Minor)</div>
              <div className="p-2 bg-slate-100 rounded text-slate-700">3 (Moderate)</div>
              <div className="p-2 bg-slate-100 rounded text-slate-700">4 (Major)</div>
              <div className="p-2 bg-slate-100 rounded text-slate-700">5 (Catastrophic)</div>

              {[5, 4, 3, 2, 1].map((l) => (
                <div key={`row-${l}`} className="contents">
                  <div className="p-2 bg-slate-100 rounded text-slate-900 font-black">L{l}</div>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const score = l * s;
                    let bg = "bg-emerald-500 text-white";
                    if (score >= 15) bg = "bg-red-600 text-white";
                    else if (score >= 10) bg = "bg-orange-500 text-white";
                    else if (score >= 5) bg = "bg-amber-400 text-slate-950";
                    return (
                      <div key={`${l}-${s}`} className={`p-2 rounded font-black shadow-sm transition-transform hover:scale-105 ${bg}`}>
                        {score}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold pt-2 text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Low (1-4)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Medium (5-9)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> High (10-14)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span> Critical (15-25)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={isAr ? "البحث بالنشاط، الخطر، أو الموقع..." : "Search risk assessment, hazard or location..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={isAr ? "جميع الحالات" : "All Statuses"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "جميع الحالات" : "All Statuses"}</SelectItem>
              <SelectItem value="Approved">{isAr ? "معتمد (Approved)" : "Approved"}</SelectItem>
              <SelectItem value="Active">{isAr ? "نشط (Active)" : "Active"}</SelectItem>
              <SelectItem value="Under Review">{isAr ? "قيد المراجعة" : "Under Review"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/70 hover:bg-slate-100/70">
                  <TableHead className="font-bold text-slate-900">{isAr ? "الرقم المرجعي" : "Ref No"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "النشاط والخطر" : "Activity & Hazard"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "الموقع والقسم" : "Location & Dept"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "المخاطرة الأولية" : "Initial Risk"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "المخاطرة المتبقية" : "Residual Risk"}</TableHead>
                  <TableHead className="font-bold text-slate-900">{isAr ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">{isAr ? "لا توجد سجلات تقييم مخاطر" : "No risk assessment records found"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRisks.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-amber-700 bg-amber-50/50">
                        {item.refNo}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{item.activity}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.hazard}</p>
                      </TableCell>

                      <TableCell className="text-xs">
                        <p className="font-semibold text-slate-800">{item.location}</p>
                        <p className="text-[11px] text-slate-500">{item.department}</p>
                      </TableCell>

                      <TableCell>{<RiskBadge score={item.initialRiskScore} isAr={isAr} />}</TableCell>

                      <TableCell>{<RiskBadge score={item.residualRiskScore} isAr={isAr} />}</TableCell>

                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold">{item.status}</Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            onClick={() => handlePrintRiskSheet(item)}
                            title={isAr ? "طباعة النموذج" : "Print Risk Sheet"}
                            data-testid={`button-print-risk-${item.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                            onClick={() => setSelectedRisk(item)}
                            title={isAr ? "معاينة التقرير" : "Preview Sheet"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(item)}
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDeleteRisk(item.id, item.refNo)}
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

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="h-5 w-5 text-amber-600" />
              {editingRisk ? (isAr ? "تعديل تقييم المخاطر" : "Edit Risk Assessment") : isAr ? "إضافة تقييم مخاطر جديد" : "New Risk Assessment"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRisk} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isAr ? "الرقم المرجعي" : "Ref No"}</Label>
                <Input
                  value={formData.refNo}
                  onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "حالة التقييم" : "Assessment Status"}</Label>
                <Select value={formData.status} onValueChange={(val: "Active" | "Under Review" | "Approved") => setFormData({ ...formData, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{isAr ? "اسم النشاط / المهمة" : "Activity / Work Description"}</Label>
              <Input
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                placeholder="e.g. Crane Lifting Operations near High Voltage Overhead Lines"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>{isAr ? "الخطر المحدد المخاطر المرتبطة" : "Identified Hazards & Risks"}</Label>
              <Input
                value={formData.hazard}
                onChange={(e) => setFormData({ ...formData, hazard: e.target.value })}
                placeholder="e.g. Boom contact with overhead powerline causing electrocution"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isAr ? "الموقع" : "Location"}</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "القسم" : "Department"}</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            {/* Initial Risk Rating */}
            <div className="border rounded-xl p-3 bg-red-50/40 border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase text-red-900">{isAr ? "تقييم المخاطرة الأولية (Initial Risk Rating)" : "Initial Risk Rating (Pre-Control)"}</h4>
                {<RiskBadge score={calculateScore(formData.initialLikelihood || 1, formData.initialSeverity || 1)} isAr={isAr} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? "الاحتمالية L (1 - 5)" : "Likelihood L (1-5)"}</Label>
                  <Select value={String(formData.initialLikelihood)} onValueChange={(val) => setFormData({ ...formData, initialLikelihood: Number(val) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - {isAr ? "نادر" : "Rare"}</SelectItem>
                      <SelectItem value="2">2 - {isAr ? "مستبعد" : "Unlikely"}</SelectItem>
                      <SelectItem value="3">3 - {isAr ? "ممكن" : "Possible"}</SelectItem>
                      <SelectItem value="4">4 - {isAr ? "مرجح" : "Likely"}</SelectItem>
                      <SelectItem value="5">5 - {isAr ? "شبه مؤكد" : "Almost Certain"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? "الشدة والخطورة S (1 - 5)" : "Severity S (1-5)"}</Label>
                  <Select value={String(formData.initialSeverity)} onValueChange={(val) => setFormData({ ...formData, initialSeverity: Number(val) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - {isAr ? "طفيف" : "Insignificant"}</SelectItem>
                      <SelectItem value="2">2 - {isAr ? "بسيط" : "Minor"}</SelectItem>
                      <SelectItem value="3">3 - {isAr ? "متوسط" : "Moderate"}</SelectItem>
                      <SelectItem value="4">4 - {isAr ? "جسيم" : "Major"}</SelectItem>
                      <SelectItem value="5">5 - {isAr ? "كارثي" : "Catastrophic"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{isAr ? "ضوابط التحكم الحالية" : "Existing Control Measures"}</Label>
              <textarea
                className="w-full p-2 border rounded-md text-xs bg-white min-h-[50px]"
                value={formData.existingControls}
                onChange={(e) => setFormData({ ...formData, existingControls: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>{isAr ? "ضوابط التحكم الإضافية المطلوبة" : "Additional Required Control Measures"}</Label>
              <textarea
                className="w-full p-2 border rounded-md text-xs bg-white min-h-[50px]"
                value={formData.additionalControls}
                onChange={(e) => setFormData({ ...formData, additionalControls: e.target.value })}
              />
            </div>

            {/* Residual Risk Rating */}
            <div className="border rounded-xl p-3 bg-emerald-50/40 border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase text-emerald-900">{isAr ? "تقييم المخاطرة المتبقية (Residual Risk Rating)" : "Residual Risk Rating (Post-Control)"}</h4>
                {<RiskBadge score={calculateScore(formData.residualLikelihood || 1, formData.residualSeverity || 1)} isAr={isAr} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? "الاحتمالية المتبقية L" : "Residual Likelihood L"}</Label>
                  <Select value={String(formData.residualLikelihood)} onValueChange={(val) => setFormData({ ...formData, residualLikelihood: Number(val) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - {isAr ? "نادر" : "Rare"}</SelectItem>
                      <SelectItem value="2">2 - {isAr ? "مستبعد" : "Unlikely"}</SelectItem>
                      <SelectItem value="3">3 - {isAr ? "ممكن" : "Possible"}</SelectItem>
                      <SelectItem value="4">4 - {isAr ? "مرجح" : "Likely"}</SelectItem>
                      <SelectItem value="5">5 - {isAr ? "شبه مؤكد" : "Almost Certain"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? "الشدة المتبقية S" : "Residual Severity S"}</Label>
                  <Select value={String(formData.residualSeverity)} onValueChange={(val) => setFormData({ ...formData, residualSeverity: Number(val) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - {isAr ? "طفيف" : "Insignificant"}</SelectItem>
                      <SelectItem value="2">2 - {isAr ? "بسيط" : "Minor"}</SelectItem>
                      <SelectItem value="3">3 - {isAr ? "متوسط" : "Moderate"}</SelectItem>
                      <SelectItem value="4">4 - {isAr ? "جسيم" : "Major"}</SelectItem>
                      <SelectItem value="5">5 - {isAr ? "كارثي" : "Catastrophic"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isAr ? "الشخص المسؤول" : "Responsible Action Owner"}</Label>
                <Input
                  value={formData.responsiblePerson}
                  onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "تاريخ المراجعة" : "Review Date"}</Label>
                <Input
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                {editingRisk ? (isAr ? "حفظ التغيرات" : "Save Changes") : isAr ? "حفظ التقييم" : "Save Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Sheet Preview Dialog */}
      {selectedRisk && (
        <Dialog open={!!selectedRisk} onOpenChange={(open) => !open && setSelectedRisk(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "نموذج ورقة تقييم المخاطر المعتمد" : "Official Risk Assessment Sheet Preview"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-amber-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">{selectedRisk.refNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedRisk.activity}</h3>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono">{selectedRisk.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "الموقع والمنطقة:" : "Location:"}</span> <span className="font-semibold">{selectedRisk.location}</span></div>
                <div><span className="text-slate-500">{isAr ? "القسم المسؤول:" : "Department:"}</span> <span className="font-semibold">{selectedRisk.department}</span></div>
                <div><span className="text-slate-500">{isAr ? "مسؤول التنفيذ:" : "Owner:"}</span> <span className="font-semibold">{selectedRisk.responsiblePerson}</span></div>
                <div><span className="text-slate-500">{isAr ? "تاريخ المراجعة:" : "Review Date:"}</span> <span className="font-semibold">{selectedRisk.reviewDate}</span></div>
              </div>

              <div className="border rounded-lg p-3 space-y-1.5 bg-red-50/30 border-red-200">
                <p className="font-bold text-xs uppercase text-red-900">{isAr ? "الخطر والمخاطرة المحددة" : "Identified Hazards & Risks"}</p>
                <p className="text-xs text-slate-800">{selectedRisk.hazard}</p>
                <div className="pt-2 flex items-center justify-between border-t border-red-200">
                  <span className="text-xs font-bold text-slate-700">Initial Rating (Pre-Control):</span>
                  {<RiskBadge score={selectedRisk.initialRiskScore} isAr={isAr} />}
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
                <p className="font-bold text-xs uppercase text-slate-700">{isAr ? "ضوابط التحكم والتقليل من المخاطر" : "Risk Controls & Mitigations"}</p>
                <div className="text-xs space-y-1">
                  <p><span className="font-bold">Existing:</span> {selectedRisk.existingControls}</p>
                  <p><span className="font-bold text-amber-800">Additional Required:</span> {selectedRisk.additionalControls}</p>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Residual Rating (Post-Control):</span>
                  {<RiskBadge score={selectedRisk.residualRiskScore} isAr={isAr} />}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRisk(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  if (selectedRisk) {
                    const item = selectedRisk;
                    setSelectedRisk(null);
                    handlePrintRiskSheet(item);
                  }
                }} 
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                data-testid="button-print-risk-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة النموذج" : "Print Risk Sheet"}
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

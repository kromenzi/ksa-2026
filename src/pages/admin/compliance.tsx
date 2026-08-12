"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ComplianceDashboard } from "@/components/compliance-dashboard";
import { 
  ShieldCheck, 
  Search, 
  Printer, 
  Plus, 
  FileText, 
  BarChart3, 
  Layers, 
  Link as LinkIcon,
  FileCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrintShareDialog from "@/components/print-share-dialog";


export interface ComplianceObligation {
  id: string;
  refNo: string;
  standard: "ISO 45001" | "ISO 14001" | "ISO 9001" | "OSHA" | "Saudi Building Code (SBC)" | "Civil Defense" | "Internal Standards";
  clause: string;
  title: string;
  titleAr: string;
  description: string;
  compliancePercentage: number;
  status: "Compliant" | "Partial" | "Non-Compliant" | "Under Review";
  evidence: string;
  linkedNcr?: string;
  linkedAudit?: string;
  linkedInspection?: string;
  linkedTraining?: string;
  linkedRisk?: string;
  department: string;
}

const INITIAL_OBLIGATIONS: ComplianceObligation[] = [
  {
    id: "COMP-001",
    refNo: "ISO45-01",
    standard: "ISO 45001",
    clause: "Clause 6.1.2",
    title: "Hazard Identification and Risk Assessment",
    titleAr: "تحديد المخاطر وتقييمها",
    description: "Ongoing and proactive hazard identification arising from work activities.",
    compliancePercentage: 92,
    status: "Compliant",
    evidence: "Risk Register 5x5 Rev 4, JSA Records",
    linkedNcr: "NCR-2026-001",
    linkedAudit: "AUD-2024-01",
    linkedInspection: "INS-042",
    linkedTraining: "TR-105",
    linkedRisk: "RA-5x5-01",
    department: "HSE Department"
  },
  {
    id: "COMP-002",
    refNo: "ISO14-04",
    standard: "ISO 14001",
    clause: "Clause 8.1",
    title: "Operational Control - Waste Management",
    titleAr: "التحكم التشغيلي - إدارة النفايات",
    description: "Control of hazardous waste generation, segregation, and certified disposal.",
    compliancePercentage: 88,
    status: "Compliant",
    evidence: "Waste Manifest Logs, Disposal Contracts",
    linkedAudit: "AUD-2024-02",
    linkedInspection: "INS-050",
    linkedTraining: "TR-202",
    linkedRisk: "RA-ENV-02",
    department: "Environmental"
  },
  {
    id: "COMP-003",
    refNo: "OSHA-1910",
    standard: "OSHA",
    clause: "1910.147",
    title: "Control of Hazardous Energy (LOTO)",
    titleAr: "التحكم في الطاقة الخطرة (LOTO)",
    description: "Lockout/Tagout procedures for servicing and maintenance of machines.",
    compliancePercentage: 95,
    status: "Compliant",
    evidence: "LOTO Permits, Authorized Personnel List",
    linkedInspection: "INS-012",
    linkedTraining: "TR-301",
    linkedRisk: "RA-LOTO-01",
    department: "Maintenance"
  },
  {
    id: "COMP-004",
    refNo: "SBC-801",
    standard: "Saudi Building Code (SBC)",
    clause: "Chapter 8 - Fire Safety",
    title: "Fire Protection and Evacuation Systems",
    titleAr: "أنظمة الحماية من الحريق والإخلاء",
    description: "Compliance with Saudi Fire Code requirements, sprinklers, and exits.",
    compliancePercentage: 85,
    status: "Partial",
    evidence: "Civil Defense Certificate, Fire Drill Logs",
    linkedAudit: "AUD-2024-03",
    linkedInspection: "INS-088",
    linkedTraining: "TR-404",
    department: "Facilities"
  },
  {
    id: "COMP-005",
    refNo: "ISO90-03",
    standard: "ISO 9001",
    clause: "Clause 9.1",
    title: "Monitoring, Measurement, Analysis and Evaluation",
    titleAr: "الرصد والقياس والتحليل والتقييم",
    description: "Customer satisfaction, quality audits, and process KPI tracking.",
    compliancePercentage: 90,
    status: "Compliant",
    evidence: "QMS Dashboards, Customer Feedback Logs",
    linkedAudit: "AUD-2024-04",
    linkedTraining: "TR-501",
    department: "Quality Assurance"
  }
];

export default function AdminCompliancePage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [obligations, setObligations] = useState<ComplianceObligation[]>(INITIAL_OBLIGATIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStandard, setSelectedStandard] = useState<string>("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<ComplianceObligation | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintComplianceSummary = () => {
    const listToPrint = filtered.length > 0 ? filtered : obligations;
    const printObj = {
      id: "COMP-SUMMARY-ALL",
      type: "report" as const,
      refNo: "COMP-REP-2026",
      title: isAr ? "تقرير الامتثال المؤسسي الشامل والمعايير الدولية" : "Enterprise Compliance & Standards Audit Summary",
      department: "HSE Compliance & Governance Dept",
      status: "Compliant",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "متوسط الامتثال الكلي" : "Average Overall Compliance", value: `${overallCompliance}%` },
        { label: isAr ? "إجمالي بنود الامتثال" : "Total Active Obligations", value: `${listToPrint.length} ${isAr ? "بند" : "obligations"}` },
        { label: isAr ? "المعايير المعتمدة" : "Covered Standards", value: "ISO 45001, ISO 14001, ISO 9001, OSHA, SBC, Civil Defense, Internal Standards" },
        { label: isAr ? "تفاصيل بنود الامتثال" : "Obligations Breakdown", value: listToPrint.map(o => `[${o.refNo}] ${o.standard} (${o.clause}) - ${isAr ? o.titleAr : o.title}: ${o.compliancePercentage}% (${o.status})`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintObligation = (item: ComplianceObligation) => {
    const printObj = {
      id: item.id,
      type: "report" as const,
      refNo: item.refNo,
      title: `${isAr ? "تقرير امتثال بند معيار" : "Compliance Obligation Sheet"} - ${item.standard}`,
      department: item.department,
      status: item.status,
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "رقم المرجع والبند" : "Reference & Clause", value: `${item.refNo} (${item.clause})` },
        { label: isAr ? "المعيار القياسي" : "Standard", value: item.standard },
        { label: isAr ? "العنوان" : "Title", value: isAr ? item.titleAr : item.title },
        { label: isAr ? "نسبة التوافق والامتثال" : "Compliance Adherence", value: `${item.compliancePercentage}%` },
        { label: isAr ? "الأدلة والوثائق المعتمدة" : "Verified Evidence", value: item.evidence },
        { label: isAr ? "الوصف والتفاصيل" : "Description", value: item.description },
        { label: isAr ? "الروابط بالأنظمة الفرعية" : "Linked Records", value: [item.linkedNcr && `NCR: ${item.linkedNcr}`, item.linkedAudit && `Audit: ${item.linkedAudit}`, item.linkedInspection && `Inspection: ${item.linkedInspection}`, item.linkedTraining && `Training: ${item.linkedTraining}`, item.linkedRisk && `Risk: ${item.linkedRisk}`].filter(Boolean).join(" | ") || (isAr ? "لا يوجد" : "None") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  // New obligation form state
  const [newStandard, setNewStandard] = useState<ComplianceObligation["standard"]>("ISO 45001");
  const [newRefNo, setNewRefNo] = useState("");
  const [newClause, setNewClause] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTitleAr, setNewTitleAr] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPercentage, setNewPercentage] = useState("90");
  const [newDept, setNewDept] = useState("HSE Department");
  const [newEvidence, setNewEvidence] = useState("");

  const standardsSummary = [
    { name: "ISO 45001", score: 92, color: "#10b981", target: 90 },
    { name: "ISO 14001", score: 88, color: "#06b6d4", target: 90 },
    { name: "ISO 9001", score: 90, color: "#3b82f6", target: 90 },
    { name: "OSHA", score: 95, color: "#f59e0b", target: 95 },
    { name: "Saudi Building Code", score: 85, color: "#8b5cf6", target: 85 },
    { name: "Civil Defense", score: 89, color: "#ef4444", target: 90 },
    { name: "Internal Standards", score: 94, color: "#64748b", target: 90 },
  ];

  const overallCompliance = Math.round(
    standardsSummary.reduce((acc, curr) => acc + curr.score, 0) / standardsSummary.length
  );

  const filtered = obligations.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.clause.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStandard = selectedStandard === "ALL" || item.standard === selectedStandard;
    return matchesSearch && matchesStandard;
  });

  const handleAddObligation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefNo || !newTitle) return;

    const newItem: ComplianceObligation = {
      id: `COMP-${Date.now().toString().slice(-4)}`,
      refNo: newRefNo,
      standard: newStandard,
      clause: newClause || "General",
      title: newTitle,
      titleAr: newTitleAr || newTitle,
      description: newDesc,
      compliancePercentage: parseInt(newPercentage) || 85,
      status: parseInt(newPercentage) >= 90 ? "Compliant" : "Partial",
      evidence: newEvidence || "Pending Review",
      department: newDept
    };

    setObligations([newItem, ...obligations]);
    setIsAddOpen(false);
    setNewRefNo("");
    setNewTitle("");
    setNewTitleAr("");
    setNewDesc("");
    setNewEvidence("");
  };

  return (
    <div className="space-y-6" data-testid="admin-compliance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "إدارة الامتثال والمعايير الدولية" : "Compliance Management & Standards"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "متابعة التوافق مع ISO 45001، 14001، 9001، OSHA، وكود البناء السعودي" : "ISO 45001, ISO 14001, ISO 9001, OSHA, SBC, Civil Defense & Internal Standards"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrintComplianceSummary} variant="outline" className="gap-2" data-testid="button-print-compliance-header">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة التقرير" : "Print Report"}
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة التزام" : "Add Compliance Obligation"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {isAr ? "لوحة المؤشرات" : "Compliance Dashboard"}
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-2">
            <Layers className="h-4 w-4" />
            {isAr ? "سجل الالتزامات" : "Compliance Register"}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            {isAr ? "تقارير الامتثال" : "Compliance Reports"}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <ComplianceDashboard />
        </TabsContent>

        {/* Register Tab */}
        <TabsContent value="register" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  placeholder={isAr ? "بحث في سجل الالتزامات والبنود..." : "Search compliance register and clauses..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rtl:pr-9 rtl:pl-3"
                />
              </div>

              <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={isAr ? "جميع المعايير" : "All Standards"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{isAr ? "جميع المعايير" : "All Standards"}</SelectItem>
                  <SelectItem value="ISO 45001">ISO 45001</SelectItem>
                  <SelectItem value="ISO 14001">ISO 14001</SelectItem>
                  <SelectItem value="ISO 9001">ISO 9001</SelectItem>
                  <SelectItem value="OSHA">OSHA</SelectItem>
                  <SelectItem value="Saudi Building Code (SBC)">Saudi Building Code (SBC)</SelectItem>
                  <SelectItem value="Civil Defense">Civil Defense</SelectItem>
                  <SelectItem value="Internal Standards">Internal Standards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{isAr ? "المرجع والبند" : "Ref & Clause"}</TableHead>
                    <TableHead>{isAr ? "المعيار والعنوان" : "Standard & Title"}</TableHead>
                    <TableHead>{isAr ? "القسم المسؤول" : "Department"}</TableHead>
                    <TableHead>{isAr ? "نسبة الامتثال" : "Compliance %"}</TableHead>
                    <TableHead>{isAr ? "الأدلة والروابط" : "Evidence & Links"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        <span className="font-bold text-primary">{item.refNo}</span>
                        <p className="text-[11px] text-muted-foreground">{item.clause}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] mb-1 bg-primary/5 text-primary">{item.standard}</Badge>
                        <p className="font-semibold text-sm">{isAr ? item.titleAr : item.title}</p>
                      </TableCell>
                      <TableCell className="text-xs">{item.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.compliancePercentage} className="h-2 w-16" />
                          <span className="text-xs font-mono font-bold">{item.compliancePercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium text-slate-700">{item.evidence}</p>
                        <div className="flex gap-1 mt-1">
                          {item.linkedNcr && <Badge variant="secondary" className="text-[9px]">NCR</Badge>}
                          {item.linkedAudit && <Badge variant="secondary" className="text-[9px]">Audit</Badge>}
                          {item.linkedInspection && <Badge variant="secondary" className="text-[9px]">Insp</Badge>}
                          {item.linkedTraining && <Badge variant="secondary" className="text-[9px]">Train</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handlePrintObligation(item)}
                            title={isAr ? "طباعة البند" : "Print Obligation"}
                            data-testid={`button-print-obligation-${item.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-8"
                            onClick={() => setSelectedObligation(item)}
                          >
                            {isAr ? "التفاصيل" : "View Details"}
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

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{isAr ? "تقرير الامتثال المؤسسي الشامل" : "Enterprise Compliance Summary Report"}</h3>
                <p className="text-xs text-muted-foreground">{isAr ? "جاهز للطباعة والاعتماد الإداري (300 DPI)" : "Print-ready executive compliance audit summary"}</p>
              </div>
              <Button onClick={handlePrintComplianceSummary} className="gap-2" data-testid="button-print-compliance-tab">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التقرير" : "Print Report"}
              </Button>
            </div>

            <div className="border rounded-xl p-6 bg-white space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h4 className="font-bold text-xl">{settings.siteName}</h4>
                  <p className="text-xs text-muted-foreground">{isAr ? "إدارة الصحة والسلامة والبيئة - تقرير تدقيق الامتثال" : "HSE Compliance & Standards Audit Report"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">REF: COMP-REP-2026</p>
                  <p className="text-xs text-emerald-600 font-bold">{isAr ? "الحالة العامة: متوافق" : "Overall Status: Compliant"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[11px] text-muted-foreground">{isAr ? "متوسط الامتثال" : "Average Compliance"}</p>
                  <p className="text-xl font-bold text-primary">{overallCompliance}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[11px] text-muted-foreground">{isAr ? "البنود النشطة" : "Active Obligations"}</p>
                  <p className="text-xl font-bold">{obligations.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[11px] text-muted-foreground">{isAr ? "المعايير المغطاة" : "Covered Standards"}</p>
                  <p className="text-xl font-bold">7 Standards</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-[11px] text-muted-foreground">{isAr ? "تاريخ المراجعة" : "Audit Date"}</p>
                  <p className="text-sm font-bold mt-1">2026-08-05</p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold text-sm">{isAr ? "ملخص الالتزامات الرئيسية" : "Executive Obligations Overview"}</h5>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "المعيار" : "Standard"}</TableHead>
                      <TableHead>{isAr ? "البند" : "Clause"}</TableHead>
                      <TableHead>{isAr ? "العنوان" : "Title"}</TableHead>
                      <TableHead>{isAr ? "النسبة" : "Percentage"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obligations.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-semibold">{o.standard}</TableCell>
                        <TableCell className="font-mono text-xs">{o.clause}</TableCell>
                        <TableCell>{isAr ? o.titleAr : o.title}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{o.compliancePercentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-6 border-t flex justify-between items-center text-xs text-muted-foreground">
                <p>{isAr ? "معتمد إلكترونياً من مدير السلامة المهنية" : "Electronically verified by HSE Director"}</p>
                <p>Abdulkarem Safety Board Enterprise EHS</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Obligation Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة التزام امتثال جديد" : "Add New Compliance Obligation"}</DialogTitle>
            <DialogDescription>{isAr ? "ربط بند جديد بمعايير ISO أو OSHA أو كود البناء" : "Add obligation and link evidence, audits, and NCRs"}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddObligation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "المعيار الرئيسي" : "Standard"}</Label>
                <Select value={newStandard} onValueChange={(val: any) => setNewStandard(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO 45001">ISO 45001</SelectItem>
                    <SelectItem value="ISO 14001">ISO 14001</SelectItem>
                    <SelectItem value="ISO 9001">ISO 9001</SelectItem>
                    <SelectItem value="OSHA">OSHA</SelectItem>
                    <SelectItem value="Saudi Building Code (SBC)">Saudi Building Code (SBC)</SelectItem>
                    <SelectItem value="Civil Defense">Civil Defense</SelectItem>
                    <SelectItem value="Internal Standards">Internal Standards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isAr ? "الرقم المرجعي" : "Reference No"}</Label>
                <Input placeholder="ISO45-05" value={newRefNo} onChange={e => setNewRefNo(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "رقم البند" : "Clause"}</Label>
                <Input placeholder="Clause 6.1" value={newClause} onChange={e => setNewClause(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "نسبة الامتثال (%)" : "Compliance %"}</Label>
                <Input type="number" min="0" max="100" value={newPercentage} onChange={e => setNewPercentage(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isAr ? "عنوان الالتزام (إنجليزي)" : "Title (English)"}</Label>
              <Input placeholder="Emergency Preparedness" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>{isAr ? "عنوان الالتزام (عربي)" : "Title (Arabic)"}</Label>
              <Input placeholder="الجاهزية للطوارئ" value={newTitleAr} onChange={e => setNewTitleAr(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{isAr ? "الأدلة والوثائق المرتبطة" : "Evidence & Documentation"}</Label>
              <Input placeholder="Emergency Plan Rev 3, Drill Reports" value={newEvidence} onChange={e => setNewEvidence(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "القسم المسؤول" : "Department"}</Label>
                <Input placeholder="HSE Department" value={newDept} onChange={e => setNewDept(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الوصف" : "Description"}</Label>
                <Input placeholder="Brief description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit">{isAr ? "حفظ وإضافة" : "Save Obligation"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedObligation} onOpenChange={() => setSelectedObligation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              {selectedObligation?.refNo} - {selectedObligation?.standard}
            </DialogTitle>
            <DialogDescription>{selectedObligation?.clause}</DialogDescription>
          </DialogHeader>

          {selectedObligation && (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">{isAr ? "العنوان" : "Title"}</span>
                <p className="font-bold text-base">{isAr ? selectedObligation.titleAr : selectedObligation.title}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground">{isAr ? "الوصف" : "Description"}</span>
                <p className="text-slate-600">{selectedObligation.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">{isAr ? "القسم المسؤول" : "Department"}</span>
                  <p className="font-medium">{selectedObligation.department}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">{isAr ? "نسبة الامتثال" : "Adherence"}</span>
                  <p className="font-bold text-primary">{selectedObligation.compliancePercentage}%</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground">{isAr ? "الأدلة والمستندات الموثقة" : "Verified Evidence"}</span>
                <p className="p-2 rounded bg-muted/50 font-mono text-xs mt-1">{selectedObligation.evidence}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">{isAr ? "الروابط المرتبطة بالأنظمة الفرعية" : "Linked System Records"}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedObligation.linkedNcr && <Badge variant="outline" className="gap-1"><LinkIcon className="h-3 w-3" /> {selectedObligation.linkedNcr}</Badge>}
                  {selectedObligation.linkedAudit && <Badge variant="outline" className="gap-1"><LinkIcon className="h-3 w-3" /> {selectedObligation.linkedAudit}</Badge>}
                  {selectedObligation.linkedInspection && <Badge variant="outline" className="gap-1"><LinkIcon className="h-3 w-3" /> {selectedObligation.linkedInspection}</Badge>}
                  {selectedObligation.linkedTraining && <Badge variant="outline" className="gap-1"><LinkIcon className="h-3 w-3" /> {selectedObligation.linkedTraining}</Badge>}
                  {selectedObligation.linkedRisk && <Badge variant="outline" className="gap-1"><LinkIcon className="h-3 w-3" /> {selectedObligation.linkedRisk}</Badge>}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedObligation && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handlePrintObligation(selectedObligation)}
                data-testid="button-print-obligation-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة البند" : "Print Obligation"}
              </Button>
            )}
            <Button onClick={() => setSelectedObligation(null)}>{isAr ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

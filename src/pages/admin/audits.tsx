"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Search, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PrintShareDialog from "@/components/print-share-dialog";

export interface AuditRecord {
  id: string;
  refNo: string;
  standard: "ISO 45001:2018" | "ISO 14001:2015" | "ISO 9001:2015" | "Internal Safety Audit";
  scope: string;
  auditor: string;
  date: string;
  majorNC: number;
  minorNC: number;
  observations: number;
  status: "Completed" | "Follow-up Required" | "Scheduled";
}

const SAMPLE_AUDITS: AuditRecord[] = [
  {
    id: "AUD-001",
    refNo: "AUD-2024-01",
    standard: "ISO 45001:2018",
    scope: "Annual HSE Management System Surveillance Audit",
    auditor: "Lead Auditor Abdulkarem Alanzi",
    date: "2024-04-15",
    majorNC: 0,
    minorNC: 1,
    observations: 4,
    status: "Completed"
  },
  {
    id: "AUD-002",
    refNo: "AUD-2024-02",
    standard: "ISO 14001:2015",
    scope: "Environmental Impact & Chemical Storage Surveillance Audit",
    auditor: "Dr. Sarah Ahmed - Environmental Auditor",
    date: "2024-05-10",
    majorNC: 0,
    minorNC: 0,
    observations: 2,
    status: "Completed"
  },
  {
    id: "AUD-003",
    refNo: "AUD-2024-03",
    standard: "Internal Safety Audit",
    scope: "Quarterly High-Risk Operations & LOTO System Audit",
    auditor: "Eng. Mansour Al-Harbi",
    date: "2024-05-28",
    majorNC: 1,
    minorNC: 2,
    observations: 3,
    status: "Follow-up Required"
  }
];

export default function AdminAuditsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [audits] = useState<AuditRecord[]>(SAMPLE_AUDITS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  // Print Dialog state
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const filtered = audits.filter(a => 
    a.scope.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.standard.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintAuditItem = (item: AuditRecord) => {
    const printObj = {
      id: item.id,
      type: "report" as const,
      refNo: item.refNo,
      title: `${isAr ? "تقرير تدقيق ومطابقة مواصفات" : "Safety & ISO Compliance Audit Report"} - ${item.standard}`,
      department: item.standard,
      status: item.status,
      date: item.date,
      sections: [
        { label: isAr ? "الرقم المرجعي للتدقيق" : "Audit Ref No", value: item.refNo },
        { label: isAr ? "المعيار / مواصفة ISO" : "Standard", value: item.standard },
        { label: isAr ? "نطاق وهدف التدقيق" : "Audit Scope", value: item.scope },
        { label: isAr ? "المقَيّم ورئيس الفريق" : "Lead Auditor", value: item.auditor },
        { label: isAr ? "تاريخ تنفيذ التدقيق" : "Audit Date", value: item.date },
        { label: isAr ? "حالة التدقيق" : "Audit Status", value: item.status },
        { label: isAr ? "عدم المطابقة الجسيمة (Major NC)" : "Major NCs", value: `${item.majorNC}` },
        { label: isAr ? "عدم المطابقة البسيطة (Minor NC)" : "Minor NCs", value: `${item.minorNC}` },
        { label: isAr ? "الملاحظات وفرص التحسين" : "Observations", value: `${item.observations}` },
        { label: isAr ? "ملخص نتائج عدم المطابقة" : "Findings Summary", value: isAr ? "1. عدم مطابقة بسيطة (Minor NC #1): نقص ملصقات تحذير السلامة المعتمدة على صواني كابلات المحطة الفرعية.\n2. ملاحظة تحسين رقم 1: تجديد الدهان الفوسفوري العاكس للوحة منطقة التجمع رقم B." : "1. Minor NC #1: Substation Cable Tray Labeling lacks mandatory ISO safety warning placards.\n2. Observation #1: Reflective paint on Assembly Point B sign needs repainting." },
        { label: isAr ? "التوصيات والإجراء التصحيحي" : "Recommendations & Corrective Action", value: isAr ? "تطبيق إجراء تصحيحي (CAPA) خلال 14 يوماً وتزويد فريق التدقيق الداخلي بالأدلة المصورة للإغلاق." : "CAPA must be completed within 14 days with photo verification provided to internal audit lead." }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllAudits = () => {
    const printObj = {
      id: "AUD-REPORT-ALL",
      type: "report" as const,
      refNo: "HSE-AUDIT-SUMMARY",
      title: isAr ? "التقرير الشامل لنتائج تدقيق السلامة والبيئة ومواصفات ISO" : "Comprehensive ISO & Safety Audits Report",
      department: "HSE & ISO Quality Compliance Dept",
      status: "Active",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي جلسات التدقيق المسجلة" : "Total Audits Conducted", value: `${filtered.length} ${isAr ? "تدقيق" : "audits"}` },
        { label: isAr ? "المعايير المشمولة" : "Standards Covered", value: "ISO 45001:2018 (Safety), ISO 14001:2015 (Environment), Internal Safety Audits" },
        { label: isAr ? "إجمالي حالات عدم المطابقة" : "Total Non-Conformities", value: `${filtered.reduce((acc, c) => acc + c.majorNC + c.minorNC, 0)} ${isAr ? "حالة" : "NCs"}` },
        { label: isAr ? "سجل التدقيقات" : "Audits Register", value: filtered.map(a => `[${a.refNo}] ${a.standard} - ${a.scope} (${a.auditor}) - ${a.status}`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-audits-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <FileCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "التدقيق الداخلي ومواصفات ISO" : "Safety Audits & ISO Compliance"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "تدقيق ISO 45001 / 14001 / 9001، تسجيل عدم المطابقة والملاحظات" : "ISO 45001:2018, ISO 14001 & ISO 9001 internal & external audit management"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintAllAudits} variant="outline" className="gap-2" data-testid="button-print-audits">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة التدقيق" : "Print Audit Report"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالتدقيق أو الرقم المرجعي أو المعيار..." : "Search audits..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "الرقم المرجعي" : "Ref No"}</TableHead>
                <TableHead>{isAr ? "المعيار والنطاق" : "Standard & Scope"}</TableHead>
                <TableHead>{isAr ? "المقَيّم والتاريخ" : "Auditor & Date"}</TableHead>
                <TableHead>{isAr ? "عدم المطابقة (NC)" : "Findings"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-semibold">{item.refNo}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.scope}</p>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 mt-0.5">{item.standard}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{item.auditor}</p>
                    <p className="text-[11px] text-muted-foreground">{item.date}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-bold text-red-600">{item.majorNC} Major</span> · <span className="font-bold text-amber-600">{item.minorNC} Minor</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      item.status === "Completed" 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => setSelectedAudit(item)}
                        data-testid={`button-preview-audit-${item.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isAr ? "معاينة" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                        onClick={() => handlePrintAuditItem(item)}
                        title={isAr ? "طباعة التدقيق" : "Print Audit"}
                        data-testid={`button-print-audit-${item.id}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {isAr ? "لا توجد نتائج مطابقة" : "No matching audits found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Audit Detail & Print Dialog */}
      {selectedAudit && (
        <Dialog open={!!selectedAudit} onOpenChange={(open) => !open && setSelectedAudit(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "معاينة تقرير تدقيق ISO" : "ISO Audit Findings Preview"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border rounded-xl bg-white text-slate-900 space-y-4 shadow-sm my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{selectedAudit.refNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedAudit.scope}</h3>
                </div>
                <Badge className="bg-emerald-600 text-white">{selectedAudit.standard}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "المقَيّم الرئيسي:" : "Lead Auditor:"}</span> <span className="font-semibold">{selectedAudit.auditor}</span></div>
                <div><span className="text-slate-500">{isAr ? "تاريخ التدقيق:" : "Date:"}</span> <span className="font-semibold">{selectedAudit.date}</span></div>
                <div><span className="text-slate-500">{isAr ? "الملاحظات (NCs):" : "NC Summary:"}</span> <span className="font-bold text-red-600">{selectedAudit.majorNC} Major, {selectedAudit.minorNC} Minor</span></div>
                <div><span className="text-slate-500">{isAr ? "حالة التدقيق:" : "Audit Status:"}</span> <span className="font-semibold text-emerald-700">{selectedAudit.status}</span></div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-bold text-xs uppercase text-slate-700">{isAr ? "ملخص نتائج عدم المطابقة" : "Audit Findings & Observations"}</p>
                <div className="text-xs space-y-2">
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="font-bold text-amber-900">Minor NC #1: Substation Cable Tray Labeling</p>
                    <p className="text-[11px] text-amber-800">High voltage tray 4B lacks mandatory ISO safety warning placards.</p>
                  </div>
                  <div className="p-2 bg-slate-50 border rounded">
                    <p className="font-bold text-slate-900">Observation #1: Emergency Assembly Point B</p>
                    <p className="text-[11px] text-slate-700">Reflective paint on assembly point sign is slightly faded.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAudit(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  const itemToPrint = selectedAudit;
                  setSelectedAudit(null);
                  handlePrintAuditItem(itemToPrint);
                }} 
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                data-testid="button-print-preview-audit"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التقرير" : "Print ISO Audit Sheet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Print / Share Dialog */}
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


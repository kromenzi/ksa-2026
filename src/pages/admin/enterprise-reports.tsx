"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Eye } from "lucide-react";
import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";
import PrintShareDialog from "@/components/print-share-dialog";
import { toast } from "sonner";
import JSZip from "jszip";

export default function AdminEnterpriseReportsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [selectedModule, setSelectedModule] = useState("ncr");
  const [reportDate] = useState(new Date().toISOString().split("T")[0]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const moduleColumns: ExportColumnDef[] = [
    { id: "docRef", labelEn: "Doc Reference", labelAr: "مرجع المستند" },
    { id: "title", labelEn: "Report Title / Topic", labelAr: "عنوان التقرير" },
    { id: "location", labelEn: "Facility / Location", labelAr: "الموقع / المنشأة" },
    { id: "severity", labelEn: "Severity", labelAr: "مستوى الخطورة" },
    { id: "inspector", labelEn: "Inspector / Owner", labelAr: "المراقب / المسئول", isSensitive: true },
    { id: "status", labelEn: "Status", labelAr: "الحالة" },
    { id: "date", labelEn: "Date", labelAr: "التاريخ" },
  ];

  const sampleModuleData = [
    {
      docRef: `${selectedModule.toUpperCase()}-2026-001`,
      title: `${selectedModule.toUpperCase()} Main Plant Audit Report`,
      location: "Main Assembly Line 1",
      severity: "High (Level 3)",
      inspector: "Eng. Abdulkarem Alanzi",
      status: "Approved & Certified",
      date: reportDate,
    },
    {
      docRef: `${selectedModule.toUpperCase()}-2026-002`,
      title: `${selectedModule.toUpperCase()} Substation Electrical Check`,
      location: "Zone B Power Plant",
      severity: "Medium",
      inspector: "Mohammad Hassan",
      status: "In Progress",
      date: reportDate,
    },
    {
      docRef: `${selectedModule.toUpperCase()}-2026-003`,
      title: `${selectedModule.toUpperCase()} Environmental Chemical Inspection`,
      location: "Hazardous Chemical Warehouse",
      severity: "Critical",
      inspector: "Tariq Mansoor",
      status: "Pending Signature",
      date: reportDate,
    },
  ];

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrint = () => {
    const printObj = {
      id: `ENT-REP-${selectedModule.toUpperCase()}`,
      type: "report" as const,
      refNo: `${selectedModule.toUpperCase()}-2026-9901`,
      title: `${selectedModule.toUpperCase()} Enterprise Executive Safety Report`,
      department: "HSE Enterprise Systems & Audits",
      status: "Approved & Certified",
      date: reportDate,
      sections: sampleModuleData.map(item => ({
        label: `${item.docRef} - ${item.title}`,
        value: `Location: ${item.location} | Severity: ${item.severity} | Inspector: ${item.inspector} | Status: ${item.status}`
      }))
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handleConfirmEnterpriseExport = async (opts: ExportOptions) => {
    const activeCols = moduleColumns.filter((c) => !opts.hiddenColumns.includes(c.id));
    const processVal = (row: any, col: ExportColumnDef) => {
      if (col.isSensitive && opts.hideSensitiveData) {
        return "██████ (PROTECTED)";
      }
      return row[col.id] || "";
    };

    if (opts.format === "csv") {
      const headers = activeCols.map((c) => (isAr ? c.labelAr : c.labelEn));
      const rows = sampleModuleData.map((r) =>
        activeCols.map((c) => `"${String(processVal(r, c)).replace(/"/g, '""')}"`)
      );
      const csv = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedModule}_enterprise_report_${reportDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(isAr ? "تم تصدير تقرير CSV المخصص" : "Exported customized CSV report");
    } else if (opts.format === "doc") {
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'></head>
        <body style="direction: ${isAr ? "rtl" : "ltr"}; font-family: sans-serif;">
          <h1 style="color: ${opts.headerColor}">${opts.companyName}</h1>
          <h2>${selectedModule.toUpperCase()} Enterprise Report</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: ${opts.headerColor}; color: white;">
                ${activeCols.map((c) => `<th>${isAr ? c.labelAr : c.labelEn}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${sampleModuleData
                .map(
                  (r) => `
                <tr>
                  ${activeCols.map((c) => `<td>${processVal(r, c)}</td>`).join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedModule}_enterprise_report_${reportDate}.doc`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(isAr ? "تم تصدير مستند Word المخصص" : "Exported customized Word report");
    } else if (opts.format === "json") {
      const sanitized = sampleModuleData.map((r) => {
        const obj: any = {};
        activeCols.forEach((c) => (obj[c.id] = processVal(r, c)));
        return obj;
      });
      const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedModule}_enterprise_report_${reportDate}.json`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(isAr ? "تم تصدير ملف JSON المخصص" : "Exported customized JSON report");
    } else if (opts.format === "pdf") {
      handlePrint();
    } else {
      const zip = new JSZip();
      zip.file(`${selectedModule}_data.json`, JSON.stringify(sampleModuleData, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${selectedModule}_enterprise_package_${reportDate}.zip`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(isAr ? "تم تصدير حزمة ZIP المخصصة" : "Exported customized ZIP package");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-enterprise-reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "مركز التقارير الموحد والـ PDFs" : "Enterprise HSE Report Generator (300 DPI)"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "طباعة التقارير الرسمية القياسية لكل الأقسام مع تصميم NCR الموحد" : "Generate high resolution 300 DPI A4 reports matching NCR standard design language"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-[220px] rounded-xl">
              <SelectValue placeholder="Select Report Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ncr">NCR - Non-Conformance Report</SelectItem>
              <SelectItem value="sor">SOR - Safety Observation Report</SelectItem>
              <SelectItem value="tbt">TBT & Training Session Report</SelectItem>
              <SelectItem value="employee">Employee Safety Passport</SelectItem>
              <SelectItem value="incident">Incident & Near Miss (RCA)</SelectItem>
              <SelectItem value="risk">Risk Assessment 5x5 Sheet</SelectItem>
              <SelectItem value="inspection">HSE Safety Inspection Checklist</SelectItem>
              <SelectItem value="audit">ISO 45001 / 14001 Audit Report</SelectItem>
              <SelectItem value="loto">LOTO Energy Isolation Permit</SelectItem>
              <SelectItem value="asset">Asset Safety Register</SelectItem>
              <SelectItem value="visitor">Visitor Safety Pass</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-md font-bold text-xs"
          >
            <Eye className="h-4 w-4" />
            {isAr ? "معاينة وتخصيص التصدير" : "Preview Before Export"}
          </Button>

          <Button onClick={handlePrint} variant="outline" className="gap-2 rounded-xl border-slate-700 text-xs">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة 300 DPI" : "Print PDF"}
          </Button>
        </div>
      </div>

      {/* Printable Sheet (NCR Standard Visual Language) */}
      <Card className="p-8 max-w-4xl mx-auto bg-white text-slate-900 shadow-2xl rounded-none border-2 border-slate-900 font-sans print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Company Header Block */}
        <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase text-slate-950">ABDULKAREM SAFETY BOARD HSE ENTERPRISE</h1>
            <p className="text-xs font-semibold text-slate-600">ABDULKAREM SAFETY BOARD MANAGEMENT SYSTEM · ISO 45001 CERTIFIED</p>
          </div>
          <div className="text-right rtl:text-left font-mono text-xs">
            <p className="font-bold text-sm text-slate-950">DOC REF: {selectedModule.toUpperCase()}-2024-9901</p>
            <p className="text-slate-500">Date: {reportDate}</p>
          </div>
        </div>

        {/* Dynamic Report Content Based on Selected Module */}
        {selectedModule === "ncr" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              NON-CONFORMANCE REPORT (NCR)
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Plant / Unit:</span> Main Assembly Factory 1</div>
              <div><span className="font-bold">Location:</span> Zone B High Voltage Substation</div>
              <div><span className="font-bold">Severity Level:</span> HIGH (Immediate Stop Work)</div>
              <div><span className="font-bold">Auditor / Inspector:</span> Eng. Abdulkarem S. Alanzi</div>
            </div>
            <div className="border p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">Non-Conformance Description</h4>
              <p className="text-xs text-slate-800 leading-relaxed">
                During safety walkdown, high voltage distribution panel #3 was found operating without interlock safety covers, exposing live 480V conductors to unauthorized operators.
              </p>
            </div>
            <div className="border p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">Immediate Corrective Action Required</h4>
              <p className="text-xs text-slate-800 leading-relaxed">
                Apply Lockout Tagout (LOTO) immediately, de-energize panel CB-3, and install certified polycarbonate barriers.
              </p>
            </div>
          </div>
        )}

        {selectedModule === "sor" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              SAFETY OBSERVATION REPORT (SOR)
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Observation Ref:</span> SOR-2024-884</div>
              <div><span className="font-bold">Category:</span> Unsafe Condition</div>
              <div><span className="font-bold">Observer:</span> Tariq Mansoor</div>
              <div><span className="font-bold">Date & Time:</span> 2024-05-19 09:15 AM</div>
            </div>
            <div className="border p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">Observation Details</h4>
              <p className="text-xs text-slate-800 leading-relaxed">
                Oil spill detected near hydraulic press #2 on warehouse floor. Spill kit was deployed immediately and area cordoned off with caution tape.
              </p>
            </div>
          </div>
        )}

        {selectedModule === "tbt" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              TOOLBOX TALK (TBT) & TRAINING SESSION REPORT
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Course Title:</span> Electrical Hazard Awareness & LOTO</div>
              <div><span className="font-bold">Trainer:</span> Abdulkarem S. Alanzi</div>
              <div><span className="font-bold">Duration:</span> 60 Minutes</div>
              <div><span className="font-bold">Language:</span> Arabic & English</div>
            </div>
            <div className="border p-4">
              <h4 className="font-bold text-xs uppercase mb-2">Verified Attendance Log</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between py-1 border-b font-mono">
                  <span>1. Abdulkarem Alanzi (EMP-1001)</span>
                  <span className="text-emerald-700 font-bold">PASSED & VERIFIED</span>
                </div>
                <div className="flex justify-between py-1 border-b font-mono">
                  <span>2. Mohammad Hassan (EMP-1002)</span>
                  <span className="text-emerald-700 font-bold">PASSED & VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedModule === "employee" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              EMPLOYEE SAFETY PASSPORT & MEDICAL CLEARANCE
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Employee Name:</span> Abdulkarem S. Alanzi</div>
              <div><span className="font-bold">Employee ID:</span> EMP-1001</div>
              <div><span className="font-bold">Department:</span> HSE Administration</div>
              <div><span className="font-bold">Medical Fitness:</span> Fit for Heavy Duty</div>
            </div>
          </div>
        )}

        {selectedModule === "incident" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              INCIDENT & NEAR MISS ROOT CAUSE ANALYSIS (RCA)
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Incident Ref:</span> INC-2024-101</div>
              <div><span className="font-bold">Type:</span> Near Miss</div>
              <div><span className="font-bold">Severity:</span> Medium</div>
              <div><span className="font-bold">Location:</span> High Bay Storage Warehouse B</div>
            </div>
            <div className="border p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">Root Cause (5-Why Analysis)</h4>
              <p className="text-xs text-slate-800 leading-relaxed font-mono">
                1. Scaffold board slipped -&gt; 2. No toe-board lock -&gt; 3. Pin damaged -&gt; 4. No spare pins in crib -&gt; 5. Re-order threshold missing in CMMS system.
              </p>
            </div>
          </div>
        )}

        {selectedModule === "risk" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              RISK ASSESSMENT 5x5 MATRIX SHEET
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Assessment Ref:</span> RA-2024-05</div>
              <div><span className="font-bold">Activity:</span> Forklift Material Loading & Unloading</div>
              <div><span className="font-bold">Initial Risk Score:</span> 16 (High Red)</div>
              <div><span className="font-bold">Residual Risk Score:</span> 6 (Low Medium)</div>
            </div>
          </div>
        )}

        {selectedModule === "inspection" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              HSE SAFETY INSPECTION CHECKLIST SHEET
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Inspection Ref:</span> INS-2024-08</div>
              <div><span className="font-bold">Scope:</span> Overhead Crane & Hoist Checklist</div>
              <div><span className="font-bold">Compliance Score:</span> 96% Passed</div>
              <div><span className="font-bold">Inspector:</span> Abdulkarem Alanzi</div>
            </div>
          </div>
        )}

        {selectedModule === "audit" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              ISO 45001:2018 INTERNAL AUDIT REPORT
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Audit Ref:</span> AUD-2024-01</div>
              <div><span className="font-bold">Standard:</span> ISO 45001 Management System</div>
              <div><span className="font-bold">Major NC:</span> 0</div>
              <div><span className="font-bold">Minor NC:</span> 1</div>
            </div>
          </div>
        )}

        {selectedModule === "loto" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              LOTO ENERGY ISOLATION PERMIT CERTIFICATE
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Permit Ref:</span> LOTO-2024-19</div>
              <div><span className="font-bold">Equipment:</span> Main Hydraulic Stamping Press #4</div>
              <div><span className="font-bold">Lock / Tag ID:</span> LOCK-RED-9921</div>
              <div><span className="font-bold">Authorized Person:</span> Mohammad Hassan</div>
            </div>
          </div>
        )}

        {selectedModule === "asset" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              SAFETY ASSETS & EQUIPMENT REGISTER
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Asset Tag:</span> FE-CO2-091</div>
              <div><span className="font-bold">Asset Name:</span> CO2 Fire Extinguisher 5KG</div>
              <div><span className="font-bold">Location:</span> Substation Room 2</div>
              <div><span className="font-bold">Status:</span> Operational</div>
            </div>
          </div>
        )}

        {selectedModule === "visitor" && (
          <div className="space-y-6">
            <div className="bg-slate-100 p-3 font-bold text-center border text-sm uppercase tracking-wider">
              VISITOR & CONTRACTOR SAFETY INDUCTION PASS
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs border p-4 bg-slate-50">
              <div><span className="font-bold">Visitor Badge:</span> VIS-901</div>
              <div><span className="font-bold">Name & Company:</span> Eng. Khalid Mansour (Siemens)</div>
              <div><span className="font-bold">Safety Briefing:</span> Passed & Cleared</div>
              <div><span className="font-bold">Host Person:</span> Abdulkarem Alanzi</div>
            </div>
          </div>
        )}

        {/* Footer & Signatures */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="font-bold">HSE Inspector</p>
            <p className="text-[10px] text-slate-500 mt-6">Signature & Stamp</p>
          </div>
          <div>
            <p className="font-bold">Department Manager</p>
            <p className="text-[10px] text-slate-500 mt-6">Signature & Stamp</p>
          </div>
          <div>
            <p className="font-bold">Plant Director</p>
            <p className="text-[10px] text-slate-500 mt-6">Signature & Stamp</p>
          </div>
        </div>
      </Card>

      {/* Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        titleEn={`Enterprise Report - ${selectedModule.toUpperCase()}`}
        titleAr={`تقرير المؤسسة الموحد - ${selectedModule.toUpperCase()}`}
        data={sampleModuleData}
        columns={moduleColumns}
        onConfirmExport={handleConfirmEnterpriseExport}
      />

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

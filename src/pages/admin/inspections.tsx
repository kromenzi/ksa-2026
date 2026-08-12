"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Search, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PrintShareDialog from "@/components/print-share-dialog";

export interface InspectionRecord {
  id: string;
  refNo: string;
  title: string;
  type: "Daily" | "Weekly" | "Monthly" | "Machine" | "Forklift" | "Electrical" | "Fire Equipment" | "PPE" | "Housekeeping";
  factory: string;
  department: string;
  inspector: string;
  date: string;
  score: number;
  status: "Passed" | "Conditional" | "Failed";
  itemsCount: number;
  passedCount: number;
}

const SAMPLE_INSPECTIONS: InspectionRecord[] = [
  {
    id: "INS-001",
    refNo: "INS-2024-08",
    title: "Weekly Overhead Crane & Hoist Safety Inspection",
    type: "Machine",
    factory: "Main Factory 1",
    department: "Maintenance",
    inspector: "Abdulkarem Alanzi",
    date: "2024-05-19",
    score: 96,
    status: "Passed",
    itemsCount: 25,
    passedCount: 24
  },
  {
    id: "INS-002",
    refNo: "INS-2024-09",
    title: "Forklift Pre-Operational Safety Checklist",
    type: "Forklift",
    factory: "Warehouse B",
    department: "Logistics",
    inspector: "Khaled Al-Mansoor",
    date: "2024-05-20",
    score: 100,
    status: "Passed",
    itemsCount: 18,
    passedCount: 18
  },
  {
    id: "INS-003",
    refNo: "INS-2024-10",
    title: "Monthly Fire Extinguisher & Alarm Systems Audit",
    type: "Fire Equipment",
    factory: "Production Plant 2",
    department: "HSE Safety",
    inspector: "Tariq Mahmood",
    date: "2024-05-21",
    score: 88,
    status: "Conditional",
    itemsCount: 30,
    passedCount: 26
  }
];

export default function AdminInspectionsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [inspections] = useState<InspectionRecord[]>(SAMPLE_INSPECTIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);

  // Print Dialog State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const filtered = inspections.filter(i => 
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.inspector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintInspection = (item: InspectionRecord) => {
    const printObj = {
      id: item.id,
      type: "report" as const,
      refNo: item.refNo,
      title: `${isAr ? "تقرير فحص السلامة الدوري" : "HSE Safety Inspection Sheet"} - ${item.title}`,
      department: item.department,
      status: item.status,
      date: item.date,
      sections: [
        { label: isAr ? "الرقم المرجعي" : "Ref No", value: item.refNo },
        { label: isAr ? "عنوان الفحص" : "Inspection Title", value: item.title },
        { label: isAr ? "نوع الفحص" : "Inspection Type", value: item.type },
        { label: isAr ? "المصنع / الموقع" : "Factory / Location", value: item.factory },
        { label: isAr ? "القسم المعني" : "Department", value: item.department },
        { label: isAr ? "اسم المفتش" : "Inspector Name", value: item.inspector },
        { label: isAr ? "تاريخ الفحص" : "Inspection Date", value: item.date },
        { label: isAr ? "نتيجة الفحص (النسبة)" : "Inspection Score", value: `${item.score}%` },
        { label: isAr ? "الحالة النهائية" : "Final Status", value: item.status },
        { label: isAr ? "عدد البنود المفحوصة" : "Items Evaluated", value: `${item.passedCount} / ${item.itemsCount} ${isAr ? "ناجح" : "Passed"}` },
        { label: isAr ? "ملخص البنود الحيوية" : "Checklist Highlights", value: isAr ? "1. أزرار الطوارئ والحمايات (ناجح)\n2. حبال السحب وقفيل خطاف الرافعة (ناجح)\n3. مفاتيح نهاية المشوار (ناجح)" : "1. Emergency Stop Controls & Interlocks (PASSED)\n2. Wire Rope & Hook Safety Latch (PASSED)\n3. Limit Switch Operation (PASSED)" }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllInspections = () => {
    const printObj = {
      id: "INS-REPORT-ALL",
      type: "report" as const,
      refNo: "HSE-INS-SUMMARY",
      title: isAr ? "التقرير الشامل لفحوصات السلامة والصحة المهنية" : "Comprehensive HSE Safety Inspections Summary",
      department: "HSE & Maintenance Department",
      status: "Completed",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي الفحوصات المسجلة" : "Total Inspections Recorded", value: `${filtered.length} ${isAr ? "فحص" : "records"}` },
        { label: isAr ? "متوسط نسبة الالتزام" : "Average Score", value: filtered.length ? `${Math.round(filtered.reduce((acc, curr) => acc + curr.score, 0) / filtered.length)}%` : "N/A" },
        { label: isAr ? "نطاق الفحوصات" : "Inspection Scope", value: isAr ? "فحوصات الرافعات، معدات الحريق، الرافعة الشوكية، واللوحات الكهربائية" : "Cranes, Fire Equipment, Forklifts, Electrical Panels & Housekeeping" },
        { label: isAr ? "قائمة الفحوصات" : "Inspections List", value: filtered.map(i => `[${i.refNo}] ${i.title} - ${i.inspector} (${i.score}% - ${i.status})`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-inspections-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "فحوصات السلامة الدورية" : "HSE Safety Inspections"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "فحص الرافعة الشوكية، معدات الحريق، الكهرباء والبيئة" : "Daily/Weekly/Monthly checklists for machinery, forklift, fire gear & housekeeping"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrintAllInspections} variant="outline" className="gap-2" data-testid="button-print-inspections">
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة الفحوصات" : "Print Inspection Report"}
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالفحص أو الرقم المرجعي أو المفتش..." : "Search inspections..."}
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
                <TableHead>{isAr ? "عنوان الفحص والنوع" : "Inspection Title & Type"}</TableHead>
                <TableHead>{isAr ? "المفتش والقسم" : "Inspector & Dept"}</TableHead>
                <TableHead>{isAr ? "نسبة النجاح" : "Score"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-semibold">{item.refNo}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-600 mt-0.5">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{item.inspector}</p>
                    <p className="text-[11px] text-muted-foreground">{item.department}</p>
                  </TableCell>
                  <TableCell className="font-bold text-sm text-emerald-600">{item.score}%</TableCell>
                  <TableCell>
                    <Badge className={
                      item.status === "Passed" 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : item.status === "Conditional"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
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
                        onClick={() => setSelectedInspection(item)}
                        data-testid={`button-preview-inspection-${item.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isAr ? "معاينة" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                        onClick={() => handlePrintInspection(item)}
                        title={isAr ? "طباعة الفحص" : "Print Inspection"}
                        data-testid={`button-print-inspection-${item.id}`}
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
                    {isAr ? "لا توجد نتائج مطابقة" : "No matching inspections found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail / Printable Inspection Dialog */}
      {selectedInspection && (
        <Dialog open={!!selectedInspection} onOpenChange={(open) => !open && setSelectedInspection(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "معاينة تقرير الفحص الدوري" : "Inspection Checklist Details"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border rounded-xl bg-white text-slate-900 space-y-4 shadow-sm my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">{selectedInspection.refNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedInspection.title}</h3>
                </div>
                <Badge className="bg-emerald-600 text-white">{selectedInspection.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "المفتش:" : "Inspector:"}</span> <span className="font-semibold">{selectedInspection.inspector}</span></div>
                <div><span className="text-slate-500">{isAr ? "القسم / المصنع:" : "Dept / Factory:"}</span> <span className="font-semibold">{selectedInspection.department} ({selectedInspection.factory})</span></div>
                <div><span className="text-slate-500">{isAr ? "تاريخ الفحص:" : "Date:"}</span> <span className="font-semibold">{selectedInspection.date}</span></div>
                <div><span className="text-slate-500">{isAr ? "النسبة والبنود:" : "Score & Items:"}</span> <span className="font-bold text-emerald-700">{selectedInspection.score}% ({selectedInspection.passedCount}/{selectedInspection.itemsCount} Passed)</span></div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-bold text-xs uppercase text-slate-700">{isAr ? "تفاصيل بنود الفحص والسلامة" : "Inspection Checklist Highlights"}</p>
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between py-1 border-b">
                    <span>1. Emergency Stop Controls & Interlocks</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">PASSED</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b">
                    <span>2. Wire Rope & Crane Hook Safety Latch</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">PASSED</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>3. Limit Switch Operation Verification</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">PASSED</Badge>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInspection(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  const itemToPrint = selectedInspection;
                  setSelectedInspection(null);
                  handlePrintInspection(itemToPrint);
                }} 
                className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
                data-testid="button-print-preview-inspection"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التقرير" : "Print Inspection Sheet"}
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


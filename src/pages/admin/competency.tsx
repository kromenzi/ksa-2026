"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Award, Plus, Search, Eye, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface CompetencyItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  licenseName: string;
  category: "License" | "Certification" | "Medical" | "Operator Authorization";
  certificateNo: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  status: "Valid" | "Expiring Soon" | "Expired";
}

const SAMPLE_COMPETENCIES: CompetencyItem[] = [
  {
    id: "COMP-001",
    employeeId: "EMP-1001",
    employeeName: "Abdulkarem S. Alanzi",
    department: "Production",
    licenseName: "NEBOSH International General Certificate",
    category: "Certification",
    certificateNo: "NEB-IGC-998811",
    issuer: "NEBOSH UK",
    issueDate: "2021-04-10",
    expiryDate: "2027-04-10",
    status: "Valid"
  },
  {
    id: "COMP-002",
    employeeId: "EMP-1002",
    employeeName: "Mohammad Hassan",
    department: "Maintenance",
    licenseName: "High Voltage Electrical Systems Operator",
    category: "Operator Authorization",
    certificateNo: "HV-AUTH-4411",
    issuer: "Saudi Electricity Company Authority",
    issueDate: "2022-02-15",
    expiryDate: "2026-09-01",
    status: "Expiring Soon"
  }
];

export default function AdminCompetencyPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [competencies, setCompetencies] = useState<CompetencyItem[]>(SAMPLE_COMPETENCIES);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CompetencyItem | null>(null);
  const [newComp, setNewComp] = useState<Partial<CompetencyItem>>({
    employeeName: "",
    employeeId: "",
    department: "Production",
    licenseName: "",
    category: "Certification",
    certificateNo: "",
    issuer: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "2027-01-01",
    status: "Valid"
  });

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintLicense = () => {
    if (selectedCert) {
      const printObj = {
        id: selectedCert.id,
        type: "certificate" as const,
        refNo: selectedCert.certificateNo,
        title: `${isAr ? "ترخيص / كفاءة السلامة المعتمدة" : "Certified Safety License"} - ${selectedCert.employeeName}`,
        department: selectedCert.department,
        status: selectedCert.status,
        date: selectedCert.issueDate,
        sections: [
          { label: isAr ? "اسم الموظف" : "Employee Name", value: selectedCert.employeeName },
          { label: isAr ? "الرقم الوظيفي" : "Employee ID", value: selectedCert.employeeId },
          { label: isAr ? "مسمى الترخيص" : "License Name", value: selectedCert.licenseName },
          { label: isAr ? "الفئة التصنيفية" : "Category", value: selectedCert.category },
          { label: isAr ? "جهة الإصدار" : "Issuer", value: selectedCert.issuer },
          { label: isAr ? "رقم الشهادة" : "Cert No", value: selectedCert.certificateNo },
          { label: isAr ? "تاريخ الإصدار" : "Issue Date", value: selectedCert.issueDate },
          { label: isAr ? "تاريخ الانتهاء" : "Expiry Date", value: selectedCert.expiryDate },
        ]
      };
      setPrintItem(printObj);
      setIsPrintOpen(true);
    }
  };

  const filtered = competencies.filter(c => 
    c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.licenseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificateNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!newComp.employeeName || !newComp.licenseName) return;
    const item: CompetencyItem = {
      id: `COMP-${Date.now()}`,
      employeeId: newComp.employeeId || "EMP-1004",
      employeeName: newComp.employeeName || "",
      department: newComp.department || "Production",
      licenseName: newComp.licenseName || "",
      category: newComp.category as any || "Certification",
      certificateNo: newComp.certificateNo || `CERT-${Math.floor(1000 + Math.random()*9000)}`,
      issuer: newComp.issuer || "Ministry of Labor",
      issueDate: newComp.issueDate || "2024-01-01",
      expiryDate: newComp.expiryDate || "2027-01-01",
      status: "Valid"
    };
    setCompetencies([item, ...competencies]);
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6" data-testid="admin-competency-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "إدارة الكفاءات والتراخيص" : "Competency & Licenses Management"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "تتبع المؤهلات، تراخيص التشغيل، والشهادات الطبية والتذكير التلقائي بالانتهاء" : "Track heavy equipment licenses, medical certificates & automated expiry reminders"}
            </p>
          </div>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="h-4 w-4" />
          {isAr ? "إضافة مؤهل / ترخيص" : "Add Competency"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالاسم، الترخيص، أو رقم الشهادة..." : "Search competency..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{isAr ? "الترخيص / الشهادة" : "License / Certification"}</TableHead>
                <TableHead>{isAr ? "جهة الإصدار" : "Issuer"}</TableHead>
                <TableHead>{isAr ? "رقم الشهادة" : "Cert No"}</TableHead>
                <TableHead>{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.employeeName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.employeeId} · {item.department}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-xs">{item.licenseName}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.issuer}</TableCell>
                  <TableCell className="font-mono text-xs">{item.certificateNo}</TableCell>
                  <TableCell className="text-xs">{item.expiryDate}</TableCell>
                  <TableCell>
                    {item.status === "Valid" && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{isAr ? "ساري" : "Valid"}</Badge>
                    )}
                    {item.status === "Expiring Soon" && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">{isAr ? "ينتهي قريباً" : "Expiring Soon"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-8 text-xs"
                      onClick={() => setSelectedCert(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Competency Preview & Printable License Dialog */}
      {selectedCert && (
        <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <DialogTitle>{isAr ? "ترخيص / كفاءة السلامة المعتمدة" : "Certified Safety License Preview"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-purple-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-lg my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left rtl:text-right">
                  <p className="font-bold text-xs text-purple-900">ABDULKAREM SAFETY BOARD ISO CERTIFICATION</p>
                  <p className="text-[10px] text-slate-500">Official License & Qualification</p>
                </div>
                <Badge className="bg-purple-600 text-white text-[10px]">{selectedCert.status}</Badge>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-500">{isAr ? "اسم الموظف" : "Employee Name"}</p>
                <h3 className="font-bold text-lg text-slate-900">{selectedCert.employeeName}</h3>
                <p className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 inline-block px-2 py-0.5 rounded">{selectedCert.employeeId} · {selectedCert.department}</p>
              </div>

              <div className="p-3 bg-slate-50 border rounded-lg space-y-1 text-left rtl:text-right">
                <p className="text-xs font-bold text-slate-900">{selectedCert.licenseName}</p>
                <p className="text-[11px] text-slate-600"><span className="font-semibold">{isAr ? "جهة الإصدار:" : "Issuer:"}</span> {selectedCert.issuer}</p>
                <p className="text-[11px] text-slate-600"><span className="font-semibold">{isAr ? "رقم الشهادة:" : "Cert No:"}</span> <span className="font-mono">{selectedCert.certificateNo}</span></p>
                <p className="text-[11px] text-slate-600"><span className="font-semibold">{isAr ? "تاريخ الانتهاء:" : "Expiry:"}</span> {selectedCert.expiryDate}</p>
              </div>

              <div className="flex flex-col items-center pt-2">
                <div className="p-2 bg-white border rounded-lg shadow-sm">
                  <QRCodeSVG value={`COMPETENCY:${selectedCert.certificateNo}:${selectedCert.employeeId}`} size={110} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Verified Qualification Token</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCert(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button onClick={() => { setSelectedCert(null); handlePrintLicense(); }} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة الشهادة" : "Print License"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة مؤهل جديد" : "Add Competency Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm py-2">
            <div>
              <label className="text-xs font-semibold">{isAr ? "اسم الموظف" : "Employee Name"}</label>
              <Input value={newComp.employeeName} onChange={(e) => setNewComp({ ...newComp, employeeName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold">{isAr ? "مسمى الترخيص / الشهادة" : "License / Cert Title"}</label>
              <Input value={newComp.licenseName} onChange={(e) => setNewComp({ ...newComp, licenseName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">{isAr ? "جهة الإصدار" : "Issuer"}</label>
                <Input value={newComp.issuer} onChange={(e) => setNewComp({ ...newComp, issuer: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold">{isAr ? "رقم الشهادة" : "Cert No"}</label>
                <Input value={newComp.certificateNo} onChange={(e) => setNewComp({ ...newComp, certificateNo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</label>
              <Input type="date" value={newComp.expiryDate} onChange={(e) => setNewComp({ ...newComp, expiryDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAdd} className="bg-amber-600 hover:bg-amber-700 text-white">{isAr ? "حفظ" : "Save Competency"}</Button>
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

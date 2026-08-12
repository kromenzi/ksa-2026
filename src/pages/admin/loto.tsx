"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Search, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PrintShareDialog from "@/components/print-share-dialog";

export interface LotoRecord {
  id: string;
  refNo: string;
  equipmentName: string;
  location: string;
  energyTypes: string[];
  isolationPoints: string;
  lockTagNo: string;
  authorizedPerson: string;
  appliedDate: string;
  releasedDate?: string;
  status: "Active Isolation" | "De-isolated" | "Pending Release";
}

const SAMPLE_LOTO: LotoRecord[] = [
  {
    id: "LOTO-001",
    refNo: "LOTO-2024-19",
    equipmentName: "Main Hydraulic Stamping Press #4",
    location: "Press Shop Floor - Plant 1",
    energyTypes: ["Electrical 480V", "Hydraulic 210 Bar", "Pneumatic 6 Bar"],
    isolationPoints: "Main Circuit Breaker CB-4, Hydraulic Valve HV-02, Pneumatic Dump Valve PV-01",
    lockTagNo: "LOCK-RED-9921",
    authorizedPerson: "Mohammad Hassan",
    appliedDate: "2024-05-19 07:00 AM",
    status: "Active Isolation"
  }
];

export default function AdminLotoPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [records] = useState<LotoRecord[]>(SAMPLE_LOTO);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoto, setSelectedLoto] = useState<LotoRecord | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintLotoPermit = (item: LotoRecord) => {
    const printObj = {
      id: item.id,
      type: "permit" as const,
      refNo: item.refNo,
      title: `${isAr ? "تصريح عزل الطاقة وعزل الأجهزة (LOTO)" : "Lockout Tagout (LOTO) Energy Isolation Certificate"} - ${item.equipmentName}`,
      department: "Maintenance & Plant Operations",
      status: item.status,
      date: item.appliedDate,
      createdAt: item.appliedDate,
      sections: [
        { label: isAr ? "رقم التصريح المرجعي" : "Permit Reference No", value: item.refNo },
        { label: isAr ? "المعدة / الجهاز" : "Equipment Name", value: item.equipmentName },
        { label: isAr ? "الموقع التفصيلي" : "Location", value: item.location },
        { label: isAr ? "رقم القفل / البطاقة" : "Lock / Tag Identification", value: item.lockTagNo },
        { label: isAr ? "مصادر الطاقة المعزولة" : "Isolated Energy Types", value: item.energyTypes.join(", ") },
        { label: isAr ? "نقاط العزل المحققة" : "Verified Isolation Points", value: item.isolationPoints },
        { label: isAr ? "المسؤول المخول بالعزل" : "Authorized Lead Personnel", value: item.authorizedPerson },
        { label: isAr ? "تاريخ ووقت تطبيق العزل" : "Applied Date & Time", value: item.appliedDate },
        { label: isAr ? "حالة العزل الحالية" : "Current Isolation Status", value: item.status }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllLoto = () => {
    const listToPrint = filtered.length > 0 ? filtered : records;
    const printObj = {
      id: "LOTO-SUMMARY-ALL",
      type: "report" as const,
      refNo: "HSE-LOTO-REGISTER",
      title: isAr ? "السجل الموحد لتصاريح عزل الطاقة (LOTO Register)" : "Unified Lockout Tagout (LOTO) Isolation Register",
      department: "HSE & Maintenance Dept",
      status: "Active",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي تصاريح العزل" : "Total LOTO Permits", value: `${listToPrint.length} ${isAr ? "تصريح" : "permits"}` },
        { label: isAr ? "عزل نشط" : "Active Isolations", value: `${listToPrint.filter(r => r.status === "Active Isolation").length}` },
        { label: isAr ? "سجل التصاريح التفصيلي" : "Permit Register", value: listToPrint.map(r => `[${r.refNo}] ${r.equipmentName} (${r.location}) - Lock: ${r.lockTagNo} - Auth: ${r.authorizedPerson} [${r.status}]`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const filtered = records.filter(r => r.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) || r.refNo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="admin-loto-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "عزل الطاقة والقفال (LOTO)" : "Lockout Tagout (LOTO) & Energy Isolation"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "تتبع نقاط العزل الكهربائية والهيدروليكية، أرقام الأقفال والمخولين" : "Electrical, hydraulic & pneumatic isolation logs, padlock tag IDs & zero-energy verifications"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintAllLoto} variant="outline" className="gap-2" data-testid="button-print-loto-header">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة تصريح العزل" : "Print Isolation Permit"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالسجل..." : "Search LOTO records..."}
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
                <TableHead>{isAr ? "المعدة والموقع" : "Equipment & Location"}</TableHead>
                <TableHead>{isAr ? "مصادر الطاقة" : "Energy Sources"}</TableHead>
                <TableHead>{isAr ? "رقم القفل" : "Lock / Tag No"}</TableHead>
                <TableHead>{isAr ? "المسؤول والموعد" : "Authorized & Date"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.refNo}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  </TableCell>
                  <TableCell className="text-xs">{item.energyTypes.join(", ")}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-red-600">{item.lockTagNo}</TableCell>
                  <TableCell className="text-xs">
                    <p>{item.authorizedPerson}</p>
                    <p className="text-[11px] text-muted-foreground">{item.appliedDate}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => handlePrintLotoPermit(item)}
                        title={isAr ? "طباعة التصريح" : "Print Permit"}
                        data-testid={`button-print-loto-${item.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => setSelectedLoto(item)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isAr ? "معاينة" : "Preview"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* LOTO Isolation Permit Preview Dialog */}
      {selectedLoto && (
        <Dialog open={!!selectedLoto} onOpenChange={(open) => !open && setSelectedLoto(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "معاينة تصريح عزل الطاقة (LOTO Certificate)" : "Lockout Tagout (LOTO) Permit Preview"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-red-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{selectedLoto.refNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedLoto.equipmentName}</h3>
                </div>
                <Badge className="bg-red-600 text-white font-mono">{selectedLoto.lockTagNo}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "الموقع:" : "Location:"}</span> <span className="font-semibold">{selectedLoto.location}</span></div>
                <div><span className="text-slate-500">{isAr ? "المسؤول المخول:" : "Authorized Lead:"}</span> <span className="font-semibold">{selectedLoto.authorizedPerson}</span></div>
                <div><span className="text-slate-500">{isAr ? "تطبيق العزل:" : "Applied Date:"}</span> <span className="font-semibold">{selectedLoto.appliedDate}</span></div>
                <div><span className="text-slate-500">{isAr ? "الحالة:" : "Status:"}</span> <span className="font-bold text-red-600">{selectedLoto.status}</span></div>
              </div>

              <div className="border border-red-200 bg-red-50/50 rounded-lg p-3 space-y-1.5 text-xs">
                <p className="font-bold text-red-900 uppercase">{isAr ? "نقاط ومصادر العزل المحددة" : "Verified Isolation Points"}</p>
                <p className="text-slate-800 font-mono text-[11px] leading-relaxed">{selectedLoto.isolationPoints}</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold">Energy Types:</span> {selectedLoto.energyTypes.join(" · ")}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLoto(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  if (selectedLoto) {
                    const item = selectedLoto;
                    setSelectedLoto(null);
                    handlePrintLotoPermit(item);
                  }
                }} 
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-print-loto-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التصريح" : "Print LOTO Certificate"}
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

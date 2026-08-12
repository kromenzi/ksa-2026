"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Search, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface VisitorRecord {
  id: string;
  visitorName: string;
  company: string;
  nationalId: string;
  hostPerson: string;
  inductionStatus: "Passed" | "Pending";
  checkInTime: string;
  checkOutTime?: string;
  badgeNo: string;
}

const SAMPLE_VISITORS: VisitorRecord[] = [
  {
    id: "VIS-001",
    visitorName: "Eng. Khalid Mansour",
    company: "Siemens Saudi Arabia",
    nationalId: "1099887766",
    hostPerson: "Abdulkarem Alanzi",
    inductionStatus: "Passed",
    checkInTime: "2024-05-19 08:30 AM",
    badgeNo: "VIS-901"
  }
];

export default function AdminVisitorsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [visitors] = useState<VisitorRecord[]>(SAMPLE_VISITORS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintVisitorBadge = (item: VisitorRecord) => {
    const printObj = {
      id: item.id,
      type: "license" as const,
      refNo: item.badgeNo,
      title: `${isAr ? "بطاقة تصريح ودخول زائر / مقاول" : "Visitor & Contractor Safety Pass"} - ${item.visitorName}`,
      department: `Host: ${item.hostPerson}`,
      status: item.inductionStatus === "Passed" ? "Safety Cleared" : "Pending Induction",
      date: item.checkInTime,
      createdAt: item.checkInTime,
      sections: [
        { label: isAr ? "رقم الشارة / التصريح" : "Badge No", value: item.badgeNo },
        { label: isAr ? "اسم الزائر / المقاول" : "Visitor Name", value: item.visitorName },
        { label: isAr ? "الشركة التابع لها" : "Company", value: item.company },
        { label: isAr ? "الهوية الوطنية / الإقامة" : "National ID", value: item.nationalId },
        { label: isAr ? "المستضيف المسؤول" : "Host Person", value: item.hostPerson },
        { label: isAr ? "حالة تعريف قواعد السلامة" : "Safety Briefing Status", value: item.inductionStatus },
        { label: isAr ? "تاريخ ووقت تسجيل الدخول" : "Check-In Time", value: item.checkInTime }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllVisitors = () => {
    const listToPrint = filtered.length > 0 ? filtered : visitors;
    const printObj = {
      id: "VISITOR-REGISTER-ALL",
      type: "report" as const,
      refNo: "HSE-VISITOR-LOG-2026",
      title: isAr ? "السجل الموحد لدخول الزوار والمقاولين والتعريف بالسلامة" : "Unified Visitor & Contractor Safety Induction Log",
      department: "Security & Industrial Safety Gate",
      status: "Active Log",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "عدد الزوار المسجلين" : "Total Logged Visitors", value: `${listToPrint.length} ${isAr ? "زائر" : "visitors"}` },
        { label: isAr ? "سجل حركة الزوار" : "Visitor Log Entries", value: listToPrint.map(v => `[${v.badgeNo}] ${v.visitorName} (${v.company}) - Host: ${v.hostPerson} - In: ${v.checkInTime} - Safety Status: ${v.inductionStatus}`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const filtered = visitors.filter(v => v.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) || v.company.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="admin-visitors-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <UserCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "سجل الزوار والمقاولين والسلامة" : "Visitor & Contractor Safety Induction"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "تسجيل الحضور، التعريف بقواعد السلامة، وطباعة تصريح الزائر (Visitor Badge)" : "Visitor safety briefings, contractor induction tracking & QR badge printing"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintAllVisitors} variant="outline" className="gap-2" data-testid="button-print-visitor-log">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة البطاقات" : "Print Visitor Badges"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالزائر أو الشركة..." : "Search visitors..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "شارة الزائر" : "Badge No"}</TableHead>
                <TableHead>{isAr ? "الزائر والشركة" : "Visitor & Company"}</TableHead>
                <TableHead>{isAr ? "المستضيف" : "Host Person"}</TableHead>
                <TableHead>{isAr ? "تعريف السلامة" : "Induction"}</TableHead>
                <TableHead>{isAr ? "وقت الدخول" : "Check In"}</TableHead>
                <TableHead>{isAr ? "رمز QR" : "QR Badge"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.badgeNo}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.visitorName}</p>
                    <p className="text-xs text-muted-foreground">{item.company}</p>
                  </TableCell>
                  <TableCell className="text-xs">{item.hostPerson}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{item.inductionStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.checkInTime}</TableCell>
                  <TableCell>
                    <QRCodeSVG value={`VISITOR:${item.badgeNo}`} size={30} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        onClick={() => handlePrintVisitorBadge(item)}
                        title={isAr ? "طباعة تصريح الزائر" : "Print Visitor Badge"}
                        data-testid={`button-print-visitor-${item.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => setSelectedVisitor(item)}
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

      {/* Visitor Safety Badge Preview Dialog */}
      {selectedVisitor && (
        <Dialog open={!!selectedVisitor} onOpenChange={(open) => !open && setSelectedVisitor(null)}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <DialogTitle>{isAr ? "شارة دخول الزائر وتصريح السلامة" : "Visitor Safety Entry Pass Badge"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-indigo-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-lg my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left rtl:text-right">
                  <p className="font-bold text-xs text-indigo-900">ABDULKAREM SAFETY BOARD VISITOR PASS</p>
                  <p className="text-[10px] text-slate-500">Temporary Site Access & Briefing</p>
                </div>
                <Badge className="bg-indigo-600 text-white font-mono">{selectedVisitor.badgeNo}</Badge>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-900">{selectedVisitor.visitorName}</h3>
                <p className="text-xs font-semibold text-indigo-700">{selectedVisitor.company}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left rtl:text-right text-[11px] bg-slate-50 p-2.5 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "المستضيف:" : "Host:"}</span> <span className="font-semibold">{selectedVisitor.hostPerson}</span></div>
                <div><span className="text-slate-500">{isAr ? "التعريف بالسلامة:" : "Induction:"}</span> <span className="font-bold text-emerald-600">{selectedVisitor.inductionStatus}</span></div>
                <div><span className="text-slate-500">{isAr ? "وقت الدخول:" : "Check In:"}</span> <span className="font-semibold">{selectedVisitor.checkInTime}</span></div>
                <div><span className="text-slate-500">{isAr ? "الهوية:" : "National ID:"}</span> <span className="font-mono">{selectedVisitor.nationalId}</span></div>
              </div>

              <div className="flex flex-col items-center pt-2">
                <div className="p-2 bg-white border rounded-lg shadow-sm">
                  <QRCodeSVG value={`VISITOR:${selectedVisitor.badgeNo}:${selectedVisitor.visitorName}`} size={110} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Scan at Gate Barrier</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedVisitor(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  if (selectedVisitor) {
                    const item = selectedVisitor;
                    setSelectedVisitor(null);
                    handlePrintVisitorBadge(item);
                  }
                }} 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                data-testid="button-print-visitor-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة شارة الزائر" : "Print Visitor Badge"}
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

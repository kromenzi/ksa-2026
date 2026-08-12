"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Flame, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PrintShareDialog from "@/components/print-share-dialog";

export interface DrillRecord {
  id: string;
  refNo: string;
  drillType: "Fire Evacuation Drill" | "Chemical Spill Drill" | "Medical Emergency Drill" | "Confined Space Rescue Drill";
  location: string;
  factory: string;
  date: string;
  evacuationTimeSeconds: number;
  participantsCount: number;
  status: "Successful" | "Action Required";
}

const SAMPLE_DRILLS: DrillRecord[] = [
  {
    id: "DRL-001",
    refNo: "DRILL-2024-03",
    drillType: "Fire Evacuation Drill",
    location: "Main Production Floor & Office Block",
    factory: "Main Factory 1",
    date: "2024-04-10",
    evacuationTimeSeconds: 142, // 2 mins 22 sec
    participantsCount: 380,
    status: "Successful"
  }
];

export default function AdminEmergencyPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [drills] = useState<DrillRecord[]>(SAMPLE_DRILLS);
  const [selectedDrill, setSelectedDrill] = useState<DrillRecord | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintDrillReport = (item: DrillRecord) => {
    const printObj = {
      id: item.id,
      type: "report" as const,
      refNo: item.refNo,
      title: `${isAr ? "تقرير تقييم تمرين الإخلاء والطوارئ" : "Emergency Drill Evaluation Report"} - ${item.drillType}`,
      department: "Emergency Response & Industrial Security",
      status: item.status,
      date: item.date,
      createdAt: item.date,
      sections: [
        { label: isAr ? "الرقم المرجعي للتمرين" : "Drill Ref No", value: item.refNo },
        { label: isAr ? "نوع التمرين الوهمي" : "Drill Type", value: item.drillType },
        { label: isAr ? "موقع التمرين والمصنع" : "Location & Plant", value: `${item.location} (${item.factory})` },
        { label: isAr ? "تاريخ تنفيذ التمرين" : "Execution Date", value: item.date },
        { label: isAr ? "زمن الإخلاء الكلي (ثانية)" : "Evacuation Time", value: `${item.evacuationTimeSeconds} Seconds (2m 22s)` },
        { label: isAr ? "عدد المشاركين في الإخلاء" : "Total Participants", value: `${item.participantsCount} Employees & Contractors` },
        { label: isAr ? "نتيجة التمرين والتقييم" : "Overall Assessment", value: item.status },
        { label: isAr ? "ملاحظات فريق الطوارئ" : "Emergency Observations", value: "1. Alarm Siren Activation: EXCELLENT\n2. Assembly Point Rollcall: COMPLETED IN 2m 22s\n3. Fire Hydrant & Hose Reel Readiness: VERIFIED" }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintEmergencyPlan = () => {
    const listToPrint = drills;
    const printObj = {
      id: "EMERGENCY-PLAN-SUMMARY",
      type: "report" as const,
      refNo: "HSE-ERP-PLAN-2026",
      title: isAr ? "خطة وسجل الاستجابة للطوارئ وحوادث الحريق" : "Master Emergency Response & Evacuation Plan",
      department: "HSE Emergency Response Division",
      status: "Approved Plan",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "نطاق خطة الطوارئ" : "ERP Plan Scope", value: "Comprehensive emergency response, fire evacuation drills, assembly points, and medical response protocols." },
        { label: isAr ? "سجل تمارين الإخلاء المنفذة" : "Executed Drills Log", value: listToPrint.map(d => `[${d.refNo}] ${d.drillType} - Loc: ${d.location} - Time: ${d.evacuationTimeSeconds}s - Participants: ${d.participantsCount} [${d.status}]`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-emergency-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/20">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "إدارة الطوارئ والإخلاء (Emergency Response)" : "Emergency Management & Fire Drills"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "سجل تمارين الإخلاء الوهمي، وقت الإخلاء، ونقاط التجمع" : "Evacuation drills, emergency team leads, assembly points & evacuation timing logs"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintEmergencyPlan} variant="outline" className="gap-2" data-testid="button-print-emergency-plan">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة خطة الإخلاء" : "Print Emergency Plan"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "الرقم المرجعي" : "Ref No"}</TableHead>
                <TableHead>{isAr ? "نوع التمرين والموقع" : "Drill Type & Location"}</TableHead>
                <TableHead>{isAr ? "زمن الإخلاء (ثانية)" : "Evacuation Time"}</TableHead>
                <TableHead>{isAr ? "المشاركون" : "Participants"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drills.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.refNo}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.drillType}</p>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  </TableCell>
                  <TableCell className="font-bold text-sm text-emerald-600">{item.evacuationTimeSeconds}s (2m 22s)</TableCell>
                  <TableCell className="text-xs">{item.participantsCount} Persons</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => handlePrintDrillReport(item)}
                        title={isAr ? "طباعة تقرير التمرين" : "Print Drill Report"}
                        data-testid={`button-print-drill-${item.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => setSelectedDrill(item)}
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

      {/* Emergency Drill Evaluation Dialog */}
      {selectedDrill && (
        <Dialog open={!!selectedDrill} onOpenChange={(open) => !open && setSelectedDrill(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isAr ? "تقرير تقييم تمرين الإخلاء والطوارئ" : "Emergency Drill Evaluation Report"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-red-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{selectedDrill.refNo}</span>
                  <h3 className="font-bold text-base mt-1">{selectedDrill.drillType}</h3>
                </div>
                <Badge className="bg-emerald-600 text-white">{selectedDrill.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "الموقع والمصنع:" : "Location & Plant:"}</span> <span className="font-semibold">{selectedDrill.location} ({selectedDrill.factory})</span></div>
                <div><span className="text-slate-500">{isAr ? "تاريخ التمرين:" : "Date:"}</span> <span className="font-semibold">{selectedDrill.date}</span></div>
                <div><span className="text-slate-500">{isAr ? "زمن الإخلاء الإجمالي:" : "Evacuation Time:"}</span> <span className="font-bold text-emerald-700">{selectedDrill.evacuationTimeSeconds} Seconds</span></div>
                <div><span className="text-slate-500">{isAr ? "عدد المشاركين:" : "Participants:"}</span> <span className="font-semibold">{selectedDrill.participantsCount} Employees & Contractors</span></div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-bold text-xs uppercase text-slate-700">{isAr ? "نتائج وملاحظات فريق السلامة" : "Drill Key Performance & Observations"}</p>
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between py-1 border-b">
                    <span>1. Alarm Siren Activation & PA System Clarity</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">EXCELLENT</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b">
                    <span>2. Assembly Point Headcount & Warden Rollcall</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">COMPLETED IN 2m 22s</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>3. Fire Hydrant & Hose Reel Readiness Check</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">VERIFIED</Badge>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDrill(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  if (selectedDrill) {
                    const item = selectedDrill;
                    setSelectedDrill(null);
                    handlePrintDrillReport(item);
                  }
                }} 
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-print-emergency-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة التقرير" : "Print Drill Report"}
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

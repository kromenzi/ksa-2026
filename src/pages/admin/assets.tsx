"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Search, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface AssetRecord {
  id: string;
  assetTag: string;
  name: string;
  category: "Fire Extinguisher" | "Emergency Light" | "Eyewash Station" | "Crane" | "Forklift" | "Scaffolding Set";
  location: string;
  factory: string;
  lastInspectionDate: string;
  nextDueDate: string;
  status: "Operational" | "Maintenance Due" | "Out of Service";
}

const SAMPLE_ASSETS: AssetRecord[] = [
  {
    id: "AST-001",
    assetTag: "FE-CO2-091",
    name: "CO2 Fire Extinguisher 5KG",
    category: "Fire Extinguisher",
    location: "Substation Room 2",
    factory: "Main Factory 1",
    lastInspectionDate: "2024-05-01",
    nextDueDate: "2024-06-01",
    status: "Operational"
  }
];

export default function AdminAssetsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [assets] = useState<AssetRecord[]>(SAMPLE_ASSETS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintAssetTag = (item: AssetRecord) => {
    const printObj = {
      id: item.id,
      type: "equipment" as const,
      refNo: item.assetTag,
      title: `${isAr ? "بطاقة وسجل ملصق أصول السلامة" : "Safety Asset Inspection & QR Tag"} - ${item.name}`,
      department: "Safety & Asset Maintenance Division",
      status: item.status,
      date: item.nextDueDate,
      createdAt: item.lastInspectionDate,
      sections: [
        { label: isAr ? "رمز الأصل (Asset Tag)" : "Asset Tag", value: item.assetTag },
        { label: isAr ? "اسم الأصل والمعدة" : "Asset Name", value: item.name },
        { label: isAr ? "الفئة التصنيفية" : "Category", value: item.category },
        { label: isAr ? "الموقع التفصيلي والمصنع" : "Location & Factory", value: `${item.location} (${item.factory})` },
        { label: isAr ? "تاريخ آخر فحص معتمد" : "Last Inspection Date", value: item.lastInspectionDate },
        { label: isAr ? "تاريخ الفحص والمكافحة القادم" : "Next Due Inspection Date", value: item.nextDueDate },
        { label: isAr ? "حالة الأصل التشغيلية" : "Operational Status", value: item.status }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handlePrintAllAssets = () => {
    const listToPrint = filtered.length > 0 ? filtered : assets;
    const printObj = {
      id: "ASSET-SUMMARY-ALL",
      type: "report" as const,
      refNo: "HSE-ASSET-REGISTER-2026",
      title: isAr ? "السجل الموحد لأصول السلامة ومعدات الطوارئ" : "Unified Safety Assets & Emergency Equipment Register",
      department: "HSE Safety Assets Dept",
      status: "Active",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي الأصول المسجلة" : "Total Assets Tracked", value: `${listToPrint.length} ${isAr ? "أصل/معدة" : "assets"}` },
        { label: isAr ? "سجل الأصول التفصيلي" : "Asset Register List", value: listToPrint.map(a => `[${a.assetTag}] ${a.name} (${a.category}) - Loc: ${a.location} - Last Check: ${a.lastInspectionDate} - Next: ${a.nextDueDate} [${a.status}]`).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const filtered = assets.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="admin-assets-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <HardDrive className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "إدارة أصول السلامة والمعدات" : "Safety Asset Management & QR Tracking"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "معدة الإطفاء، الإضاءة الطارئة، الرافعات والـ QR Code" : "Track fire extinguishers, eyewash, cranes, forklifts & generate QR tags"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintAllAssets} variant="outline" className="gap-2" data-testid="button-print-asset-register">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة سجل الأصول" : "Print Asset Register"}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
          <Input
            placeholder={isAr ? "البحث بالأصل..." : "Search safety assets..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{isAr ? "رمز الأصل" : "Asset Tag"}</TableHead>
                <TableHead>{isAr ? "اسم الأصل والفئة" : "Asset Name & Category"}</TableHead>
                <TableHead>{isAr ? "الموقع والمصنع" : "Location & Factory"}</TableHead>
                <TableHead>{isAr ? "موعد الفحص القادم" : "Next Due Date"}</TableHead>
                <TableHead>{isAr ? "رمز QR" : "QR Tag"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.assetTag}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 mt-0.5">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p>{item.location}</p>
                    <p className="text-[11px] text-muted-foreground">{item.factory}</p>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{item.nextDueDate}</TableCell>
                  <TableCell>
                    <QRCodeSVG value={`ASSET:${item.assetTag}`} size={30} />
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => handlePrintAssetTag(item)}
                        title={isAr ? "طباعة الملصق" : "Print Asset Tag"}
                        data-testid={`button-print-asset-${item.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => setSelectedAsset(item)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isAr ? "معاينة QR" : "Preview Tag"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Asset QR Sticker Printable Dialog */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <DialogTitle>{isAr ? "بطاقة ملصق الأصل والسلامة (QR Tag)" : "Printable Asset QR Safety Tag"}</DialogTitle>
            </DialogHeader>

            <div className="p-6 border-2 border-blue-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-lg my-2">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left rtl:text-right">
                  <p className="font-bold text-xs text-blue-900">ABDULKAREM SAFETY BOARD ASSET TAG</p>
                  <p className="text-[10px] text-slate-500">Official HSE Equipment Register</p>
                </div>
                <Badge className="bg-blue-600 text-white font-mono">{selectedAsset.assetTag}</Badge>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900">{selectedAsset.name}</h3>
                <p className="text-xs text-slate-600 font-medium">{selectedAsset.location} ({selectedAsset.factory})</p>
              </div>

              <div className="flex flex-col items-center pt-2">
                <div className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-md">
                  <QRCodeSVG value={`ASSET:${selectedAsset.assetTag}:${selectedAsset.name}`} size={130} />
                </div>
                <p className="font-mono text-xs font-bold text-slate-900 mt-2">{selectedAsset.assetTag}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left rtl:text-right text-[11px] bg-slate-50 p-2.5 rounded-lg border">
                <div><span className="text-slate-500">{isAr ? "آخر فحص:" : "Last Check:"}</span> <span className="font-semibold">{selectedAsset.lastInspectionDate}</span></div>
                <div><span className="text-slate-500">{isAr ? "الفحص القادم:" : "Next Due:"}</span> <span className="font-bold text-blue-700">{selectedAsset.nextDueDate}</span></div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAsset(null)}>{isAr ? "إغلاق" : "Close"}</Button>
              <Button 
                onClick={() => {
                  if (selectedAsset) {
                    const item = selectedAsset;
                    setSelectedAsset(null);
                    handlePrintAssetTag(item);
                  }
                }} 
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-print-asset-dialog"
              >
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة ملصق QR" : "Print QR Tag"}
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

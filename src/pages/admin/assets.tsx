"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Search, Printer, Eye, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

interface AssetApiRow {
  id: string;
  refNo?: string | null;
  title?: string | null;
  status?: string | null;
  department?: string | null;
  date?: string | null;
  data?: Record<string, any> | null;
}

export interface AssetRecord {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  location: string;
  factory: string;
  lastInspectionDate: string;
  nextDueDate: string;
  status: string;
}

const toAsset = (row: AssetApiRow): AssetRecord => {
  const data = row.data || {};
  return {
    id: row.id,
    assetTag: String(row.refNo || data.assetTag || ""),
    name: String(row.title || data.name || ""),
    category: String(data.category || ""),
    location: String(data.location || ""),
    factory: String(data.factory || row.department || ""),
    lastInspectionDate: String(data.lastInspectionDate || row.date || ""),
    nextDueDate: String(data.nextDueDate || ""),
    status: String(row.status || data.status || ""),
  };
};

export default function AdminAssetsPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const queryClient = useQueryClient();
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const { data: rows = [], isLoading } = useQuery<AssetApiRow[]>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/assets");
      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    },
    staleTime: 0,
  });

  const assets = useMemo(() => rows.map(toAsset), [rows]);
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((item) => [item.assetTag, item.name, item.category, item.location, item.factory].some((value) => value.toLowerCase().includes(q)));
  }, [assets, searchTerm]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    await queryClient.refetchQueries({ queryKey: ["/api/assets"], type: "active" });
  };

  const handleDelete = async (item: AssetRecord) => {
    if (!canDelete) return;
    const confirmed = window.confirm(isAr ? `حذف الأصل ${item.assetTag || item.name} نهائياً؟` : `Permanently delete ${item.assetTag || item.name}?`);
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await apiRequest("DELETE", `/api/assets/${encodeURIComponent(item.id)}`);
      if (selectedAsset?.id === item.id) setSelectedAsset(null);
      await refresh();
      toast.success(isAr ? "تم حذف الأصل نهائياً" : "Asset deleted permanently");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حذف الأصل" : "Unable to delete asset"));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrintAssetTag = (item: AssetRecord) => {
    setPrintItem({
      id: item.id,
      type: "equipment" as const,
      refNo: item.assetTag,
      title: `${isAr ? "بطاقة وسجل أصول السلامة" : "Safety Asset Inspection & QR Tag"} - ${item.name}`,
      department: item.factory || "HSE",
      status: item.status,
      date: item.nextDueDate,
      createdAt: item.lastInspectionDate,
      sections: [
        { label: isAr ? "رمز الأصل" : "Asset Tag", value: item.assetTag },
        { label: isAr ? "اسم الأصل" : "Asset Name", value: item.name },
        { label: isAr ? "الفئة" : "Category", value: item.category },
        { label: isAr ? "الموقع" : "Location", value: item.location },
        { label: isAr ? "المصنع / القسم" : "Factory / Department", value: item.factory },
        { label: isAr ? "آخر فحص" : "Last Inspection", value: item.lastInspectionDate },
        { label: isAr ? "الفحص القادم" : "Next Due", value: item.nextDueDate },
        { label: isAr ? "الحالة" : "Status", value: item.status },
      ],
    });
    setIsPrintOpen(true);
  };

  const handlePrintAllAssets = () => {
    if (filtered.length === 0) {
      toast.info(isAr ? "لا توجد أصول محفوظة للطباعة" : "No saved assets to print");
      return;
    }
    setPrintItem({
      id: "ASSET-SUMMARY-ALL",
      type: "report" as const,
      refNo: "HSE-ASSET-REGISTER",
      title: isAr ? "السجل الموحد لأصول السلامة ومعدات الطوارئ" : "Unified Safety Assets & Emergency Equipment Register",
      department: "HSE",
      status: "Active",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "إجمالي الأصول المسجلة" : "Total Assets", value: String(filtered.length) },
        { label: isAr ? "سجل الأصول" : "Asset Register", value: filtered.map((item) => `[${item.assetTag}] ${item.name} - ${item.location} - ${item.status}`).join("\n") },
      ],
    });
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-assets-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-600/20"><HardDrive className="h-5 w-5 text-white" /></div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">{isAr ? "إدارة أصول السلامة والمعدات" : "Safety Asset Management & QR Tracking"}</h2>
            <p className="text-[12px] text-muted-foreground">{isAr ? "يعرض فقط الأصول المحفوظة فعلياً في قاعدة البيانات" : "Only assets actually saved in the database are displayed"}</p>
          </div>
        </div>
        <Button onClick={handlePrintAllAssets} variant="outline" className="gap-2"><Printer className="h-4 w-4" />{isAr ? "طباعة سجل الأصول" : "Print Asset Register"}</Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" /><Input placeholder={isAr ? "البحث بالأصل..." : "Search safety assets..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rtl:pr-9 rtl:pl-3" /></div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>{isAr ? "رمز الأصل" : "Asset Tag"}</TableHead><TableHead>{isAr ? "اسم الأصل والفئة" : "Asset Name & Category"}</TableHead><TableHead>{isAr ? "الموقع والمصنع" : "Location & Factory"}</TableHead><TableHead>{isAr ? "الفحص القادم" : "Next Due"}</TableHead><TableHead>{isAr ? "QR" : "QR"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="h-28 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">{isAr ? "لا توجد أصول محفوظة" : "No saved assets"}</TableCell></TableRow> : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">{item.assetTag || "—"}</TableCell>
                  <TableCell><p className="font-semibold text-sm">{item.name || "—"}</p>{item.category && <Badge variant="outline" className="text-[10px] mt-0.5">{item.category}</Badge>}</TableCell>
                  <TableCell className="text-xs"><p>{item.location || "—"}</p><p className="text-[11px] text-muted-foreground">{item.factory || "—"}</p></TableCell>
                  <TableCell className="text-xs">{item.nextDueDate || "—"}</TableCell>
                  <TableCell>{item.assetTag ? <QRCodeSVG value={`ASSET:${item.assetTag}`} size={30} /> : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{item.status || "—"}</Badge></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handlePrintAssetTag(item)}><Printer className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setSelectedAsset(item)}><Eye className="h-3.5 w-3.5" />{isAr ? "معاينة" : "Preview"}</Button>
                    {canDelete && <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(item)} disabled={deletingId === item.id}>{deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>}
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedAsset && <Dialog open onOpenChange={(open) => !open && setSelectedAsset(null)}><DialogContent className="max-w-md text-center"><DialogHeader><DialogTitle>{isAr ? "بطاقة الأصل" : "Asset QR Tag"}</DialogTitle></DialogHeader><div className="p-6 border rounded-xl space-y-4"><h3 className="font-bold">{selectedAsset.name}</h3>{selectedAsset.assetTag && <div className="flex justify-center"><QRCodeSVG value={`ASSET:${selectedAsset.assetTag}:${selectedAsset.name}`} size={130} /></div>}<p className="font-mono text-xs">{selectedAsset.assetTag}</p><p className="text-xs text-muted-foreground">{selectedAsset.location} {selectedAsset.factory && `• ${selectedAsset.factory}`}</p></div><DialogFooter><Button variant="outline" onClick={() => setSelectedAsset(null)}>{isAr ? "إغلاق" : "Close"}</Button><Button onClick={() => handlePrintAssetTag(selectedAsset)}><Printer className="h-4 w-4 me-2" />{isAr ? "طباعة" : "Print"}</Button></DialogFooter></DialogContent></Dialog>}
      {printItem && <PrintShareDialog open={isPrintOpen} onOpenChange={setIsPrintOpen} item={printItem} />}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { useGenericRecords, canDeleteManagedRecord } from "@/lib/generic-records";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, Trash2, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import PrintShareDialog from "@/components/print-share-dialog";

const MODULES = [
  { value: "equipment-auth", en: "Equipment Authorizations", ar: "تفويض المعدات" },
  { value: "licenses", en: "Licenses", ar: "التراخيص" },
  { value: "trainings", en: "Training Records", ar: "سجلات التدريب" },
  { value: "training-matrix", en: "Training Matrix", ar: "مصفوفة التدريب" },
  { value: "competency", en: "Competency Assessments", ar: "تقييمات الكفاءة" },
] as const;

export default function AdminEnterpriseReportsPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const [selectedModule, setSelectedModule] = useState("equipment-auth");
  const [printItem, setPrintItem] = useState<any>(null);
  const { items, loading, error, remove, refresh } = useGenericRecords<any>(selectedModule);

  const moduleLabel = MODULES.find(item => item.value === selectedModule);
  const rows = useMemo(() => items.map(row => ({
    id: row.id,
    refNo: row.refNo || "",
    title: row.title || row.data?.employeeName || row.data?.title || "",
    department: row.department || row.data?.department || "",
    date: row.date || row.data?.issueDate || row.data?.date || "",
    status: row.status || "",
    details: row.data || {},
  })), [items]);

  const detailSummary = (row: any) => {
    const data = row.details || {};
    if (selectedModule === "equipment-auth") return [data.employeeName, data.category, data.equipmentType, data.equipmentId].filter(Boolean).join(" · ");
    if (selectedModule === "licenses") return [data.employeeName, data.licenseType, data.issuingAuthority, data.expiryDate].filter(Boolean).join(" · ");
    if (selectedModule === "trainings") return [data.category, data.trainer, data.factory, data.location].filter(Boolean).join(" · ");
    if (selectedModule === "training-matrix") return [data.employeeName, data.employeeId].filter(Boolean).join(" · ");
    return [data.employeeName, data.employeeId, data.jobTitle].filter(Boolean).join(" · ");
  };

  const deleteRow = async (id: string, refNo: string) => {
    if (!canDelete || !window.confirm(isAr ? `حذف السجل ${refNo || id} نهائيًا؟` : `Permanently delete ${refNo || id}?`)) return;
    try {
      await remove(id);
      toast.success(isAr ? "تم حذف السجل نهائيًا" : "Record permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  const printReport = () => {
    setPrintItem({
      id: `AUTH-REPORT-${selectedModule}`,
      type: "report" as const,
      refNo: `AUTH-${selectedModule.toUpperCase()}`,
      title: isAr ? `تقرير ${moduleLabel?.ar || "التفويض"}` : `${moduleLabel?.en || "Authorization"} Report`,
      department: "HSE",
      status: "Current",
      date: new Date().toISOString().slice(0, 10),
      sections: rows.length ? rows.map(row => ({ label: row.refNo || row.title || row.id, value: `${row.title || ""}${row.department ? ` · ${row.department}` : ""}${row.date ? ` · ${row.date}` : ""}\n${detailSummary(row)}` })) : [{ label: isAr ? "النتيجة" : "Result", value: isAr ? "لا توجد سجلات" : "No records" }],
    });
  };

  const exportCsv = () => {
    const headers = ["Reference", "Title", "Department", "Date", "Status", "Details"];
    const csvRows = rows.map(row => [row.refNo, row.title, row.department, row.date, row.status, detailSummary(row)].map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["\uFEFF" + [headers.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedModule}-authorization-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6" data-testid="admin-enterprise-reports-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white"><FileText className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold">{isAr ? "تقارير التفويض" : "Authorization Reports"}</h1><p className="text-xs text-muted-foreground">{isAr ? "تقارير مباشرة من سجلات التراخيص والتفويض والتدريب والكفاءة" : "Live reports from license, authorization, training and competency records"}</p></div></div>
        <div className="flex flex-wrap gap-2"><Select value={selectedModule} onValueChange={setSelectedModule}><SelectTrigger className="w-[230px]"><SelectValue /></SelectTrigger><SelectContent>{MODULES.map(module => <SelectItem key={module.value} value={module.value}>{isAr ? module.ar : module.en}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => void refresh()}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button variant="outline" onClick={exportCsv}><Download className="me-2 h-4 w-4" />CSV</Button><Button onClick={printReport}><Printer className="me-2 h-4 w-4" />{isAr ? "طباعة" : "Print"}</Button></div>
      </div>

      <Card className="p-4">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "العنوان / الموظف" : "Title / Employee"}</TableHead><TableHead>{isAr ? "القسم" : "Department"}</TableHead><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "التفاصيل" : "Details"}</TableHead><TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader><TableBody>
          {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد بيانات لهذا التقرير. تمت إزالة جميع معلومات التقارير التجريبية." : "No records for this report. All demo report information has been removed."}</TableCell></TableRow>}
          {rows.map(row => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.refNo || "-"}</TableCell><TableCell className="font-medium">{row.title || "-"}</TableCell><TableCell className="text-xs">{row.department || "-"}</TableCell><TableCell className="text-xs">{row.date || "-"}</TableCell><TableCell className="max-w-[360px] text-xs text-muted-foreground">{detailSummary(row) || "-"}</TableCell><TableCell className="text-right">{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => void deleteRow(row.id, row.refNo)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
        </TableBody></Table></div>
      </Card>

      {printItem && <PrintShareDialog open={!!printItem} onOpenChange={open => !open && setPrintItem(null)} item={printItem} />}
    </div>
  );
}

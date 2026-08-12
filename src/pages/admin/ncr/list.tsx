"use client";

import { useState } from "react";
import { useData, type NCR } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Search, Edit, Trash2, Mail, AlertTriangle, Printer, Upload, FileEdit, ChevronDown, 
  Eye, ClipboardList, MapPin, Calendar, Building2, User, Clock, CheckCircle2, 
  ShieldAlert, FileText, X, Zap, Activity, Filter, XCircle, FileBarChart,
  ShieldCheck, ShieldAlert as ShieldAlertIcon, Archive, FileSpreadsheet, FileCode2, Download, FileText as FileDocIcon
} from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";
import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";

export default function AdminNCRList() {
  const { ncrs, deleteNCR, sendNCREmail, settings, hasPermission } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [, setLocation] = useLocation();
  const [shareItem, setShareItem] = useState<NCR | null>(null);
  const [previewNCR, setPreviewNCR] = useState<NCR | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const ncrColumns: ExportColumnDef[] = [
    { id: "refNo", labelEn: "Reference No", labelAr: "رقم المرجع" },
    { id: "department", labelEn: "Department", labelAr: "القسم" },
    { id: "location", labelEn: "Location", labelAr: "الموقع" },
    { id: "severity", labelEn: "Severity", labelAr: "مستوى الخطورة" },
    { id: "status", labelEn: "Status", labelAr: "الحالة" },
    { id: "date", labelEn: "Date", labelAr: "التاريخ" },
    { id: "responsiblePersonId", labelEn: "Responsible Owner", labelAr: "الشخص المسؤول", isSensitive: true },
    { id: "description", labelEn: "Description", labelAr: "وصف عدم المطابقة" },
    { id: "correctiveAction", labelEn: "Corrective Action", labelAr: "الإجراء التصحيحي" },
  ];

  const handleConfirmNCRExport = async (opts: ExportOptions) => {
    const activeCols = ncrColumns.filter((c) => !opts.hiddenColumns.includes(c.id));
    const processValue = (ncr: NCR, col: ExportColumnDef) => {
      if (col.isSensitive && opts.hideSensitiveData) {
        return "██████ (PROTECTED)";
      }
      return (ncr as any)[col.id] || "";
    };

    if (opts.format === "csv") {
      const headers = activeCols.map((c) => (isAr ? c.labelAr : c.labelEn));
      const rows = ncrs.map((n) =>
        activeCols.map((c) => `"${String(processValue(n, c)).replace(/"/g, '""')}"`)
      );
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ncr_reports_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير ملف CSV المخصص لـ NCR" : "Exported customized NCR CSV" });
    } else if (opts.format === "doc") {
      const title = opts.companyName || (isAr ? "تقرير عدم المطابقة الشامل" : "Comprehensive NCR Report");
      const rowsHtml = ncrs
        .map(
          (n) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          ${activeCols.map((c) => `<td style="padding: 8px;">${processValue(n, c)}</td>`).join("")}
        </tr>
      `
        )
        .join("");

      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'></head>
        <body style="direction: ${isAr ? "rtl" : "ltr"}; font-family: sans-serif;">
          <h1 style="color: ${opts.headerColor}">${title}</h1>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: ${opts.headerColor}; color: white;">
                ${activeCols.map((c) => `<th>${isAr ? c.labelAr : c.labelEn}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ncr_report_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير مستند Word المخصص لـ NCR" : "Exported customized NCR Word document" });
    } else if (opts.format === "json") {
      const sanitized = ncrs.map((n) => {
        const obj: any = {};
        activeCols.forEach((c) => (obj[c.id] = processValue(n, c)));
        return obj;
      });
      const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ncr_reports_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير ملف JSON المخصص لـ NCR" : "Exported customized NCR JSON file" });
    } else if (opts.format === "pdf") {
      window.print();
    } else {
      const zip = new JSZip();
      zip.file("ncr_data.json", JSON.stringify(ncrs, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `ncr_package_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير حزمة ZIP المخصصة لـ NCR" : "Exported customized NCR ZIP package" });
    }
  };
  
  const isAr = settings.language === 'ar';

  const canEdit = hasPermission('ncr', 'update');
  const canDelete = hasPermission('ncr', 'delete');
  const canCreate = hasPermission('ncr', 'create');
  const canSendEmail = hasPermission('ncr', 'send_email');

  const filteredNCRs = ncrs.filter(ncr => {
    const matchesSearch = 
        ncr.refNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ncr.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ncr.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ncr.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ncr.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || ncr.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleDelete = () => {
    if (deleteConfirmation === "DELETE") {
        if (deleteId) deleteNCR(deleteId);
        setDeleteId(null);
        setDeleteConfirmation("");
    }
  };

  const handleSendEmail = (id: string) => {
      sendNCREmail(id);
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'draft': return { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', dot: 'bg-slate-400' };
      case 'submitted': return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' };
      case 'assigned': return { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dot: 'bg-purple-500' };
      case 'in_progress': return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' };
      case 'closed': return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' };
      default: return { bg: 'bg-muted text-muted-foreground', dot: 'bg-gray-400' };
    }
  };

  const getStatusLabel = (status: string) => {
    const ar: Record<string, string> = { draft: 'مسودة', submitted: 'مُرسل', assigned: 'مُعيّن', in_progress: 'قيد التنفيذ', closed: 'مغلق' };
    const en: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', assigned: 'Assigned', in_progress: 'In Progress', closed: 'Closed' };
    return isAr ? (ar[status] || status) : (en[status] || status);
  };

  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'low': return { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10' };
      case 'medium': return { color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500', bg: 'bg-yellow-500/10' };
      case 'high': return { color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', bg: 'bg-orange-500/10' };
      case 'critical': return { color: 'text-red-600 dark:text-red-400 font-semibold', dot: 'bg-red-500', bg: 'bg-red-500/10' };
      default: return { color: 'text-muted-foreground', dot: 'bg-gray-400', bg: 'bg-muted' };
    }
  };

  const getSeverityLabel = (sev: string) => {
    const ar: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج' };
    const en: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
    return isAr ? (ar[sev] || sev) : (en[sev] || sev);
  };

  const openCount = ncrs.filter(n => ['submitted', 'assigned', 'in_progress'].includes(n.status)).length;
  const closedCount = ncrs.filter(n => n.status === 'closed').length;
  const criticalCount = ncrs.filter(n => n.severity === 'critical' || n.severity === 'high').length;

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || severityFilter !== 'all';

  const { toast } = useToast();

  const handleExportCSV = () => {
    const headers = ["Reference No", "Department", "Location", "Severity", "Status", "Date", "Description", "Corrective Action"];
    const rows = ncrs.map(n => [
      n.refNo || n.id,
      `"${(n.department || '').replace(/"/g, '""')}"`,
      `"${(n.location || '').replace(/"/g, '""')}"`,
      n.severity,
      n.status,
      n.date,
      `"${(n.description || '').replace(/"/g, '""')}"`,
      `"${(n.correctiveAction || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `ncr_reports_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast({ title: isAr ? "تم تصدير ملف CSV بنجاح" : "CSV exported successfully" });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ncrs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `ncr_reports_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.parentNode?.removeChild(dlAnchorElem);
    toast({ title: isAr ? "تم تصدير ملف JSON بنجاح" : "JSON exported successfully" });
  };

  const generateNCRWordDocHTML = () => {
    const title = isAr ? "تقرير عدم المطابقة الشامل (NCR)" : "Comprehensive Non-Conformance Reports (NCR)";
    const dir = isAr ? "rtl" : "ltr";
    
    const rowsHtml = ncrs.map(n => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold;">${n.refNo || n.id}</td>
        <td style="padding: 10px;">${n.department || ''}</td>
        <td style="padding: 10px;">${n.location || ''}</td>
        <td style="padding: 10px;">${n.severity || ''}</td>
        <td style="padding: 10px;">${n.status || ''}</td>
        <td style="padding: 10px;">${n.date || ''}</td>
        <td style="padding: 10px;">${n.description || ''}</td>
      </tr>
    `).join("");

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${dir}; text-align: ${isAr ? 'right' : 'left'}; margin: 20px; }
          h1 { color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #d97706; color: white; padding: 10px; text-align: ${isAr ? 'right' : 'left'}; }
          td { padding: 8px; border-bottom: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
        
        <h2>${isAr ? 'قائمة حالات عدم المطابقة' : 'NCR List'} (${ncrs.length})</h2>
        <table>
          <thead>
            <tr>
              <th>${isAr ? 'رقم المرجع' : 'Ref No'}</th>
              <th>${isAr ? 'القسم' : 'Department'}</th>
              <th>${isAr ? 'الموقع' : 'Location'}</th>
              <th>${isAr ? 'مستوى الخطورة' : 'Severity'}</th>
              <th>${isAr ? 'الحالة' : 'Status'}</th>
              <th>${isAr ? 'التاريخ' : 'Date'}</th>
              <th>${isAr ? 'الوصف' : 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const handleExportWordDoc = () => {
    const htmlContent = generateNCRWordDocHTML();
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ncr_comprehensive_report_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast({ title: isAr ? "تم تصدير مستند Word بنجاح" : "Word document exported successfully" });
  };

  const handleBulkExportZIP = async () => {
    try {
      const zip = new JSZip();
      
      // 1. Word Doc
      const docHtml = generateNCRWordDocHTML();
      zip.file("تقرير_عدم_المطابقة_الشامل.doc", "\ufeff" + docHtml);

      // 2. CSV
      const headers = ["Reference No", "Department", "Location", "Severity", "Status", "Date", "Description", "Corrective Action"];
      const rows = ncrs.map(n => [
        n.refNo || n.id,
        `"${(n.department || '').replace(/"/g, '""')}"`,
        `"${(n.location || '').replace(/"/g, '""')}"`,
        n.severity,
        n.status,
        n.date,
        `"${(n.description || '').replace(/"/g, '""')}"`,
        `"${(n.correctiveAction || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      zip.file("تقارير_عدم_المطابقة.csv", csvContent);

      // 3. JSON
      zip.file("بيانات_عدم_المطابقة_الكاملة.json", JSON.stringify(ncrs, null, 2));

      // 4. Individual files
      const folder = zip.folder("مستندات_NCR_الفردية");
      ncrs.forEach((n) => {
        const singleDoc = `
          <html>
          <body style="font-family: sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; padding: 20px;">
            <h2>${isAr ? 'تقرير عدم مطابقة' : 'Non-Conformance Report'}: ${n.refNo || n.id}</h2>
            <p><strong>${isAr ? 'القسم' : 'Department'}:</strong> ${n.department || '-'}</p>
            <p><strong>${isAr ? 'الموقع' : 'Location'}:</strong> ${n.location || '-'}</p>
            <p><strong>${isAr ? 'مستوى الخطورة' : 'Severity'}:</strong> ${n.severity || '-'}</p>
            <p><strong>${isAr ? 'الحالة' : 'Status'}:</strong> ${n.status || '-'}</p>
            <p><strong>${isAr ? 'الوصف' : 'Description'}:</strong> ${n.description || '-'}</p>
            <p><strong>${isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}:</strong> ${n.correctiveAction || '-'}</p>
          </body>
          </html>
        `;
        folder?.file(`${n.refNo || n.id}.doc`, "\ufeff" + singleDoc);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `حزمة_تقارير_عدم_المطابقة_NCR_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast({ title: isAr ? "تم تصدير حزمة ZIP لـ NCR بنجاح" : "NCR ZIP package exported successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: isAr ? "حدث خطأ أثناء إنشاء ZIP" : "Error generating ZIP", variant: "destructive" });
    }
  };

  if (!hasPermission('ncr', 'read')) return <div>Access Denied</div>;

  return (
    <div className="space-y-5" data-testid="admin-ncr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" data-testid="text-ncr-title">
              {isAr ? 'تقارير عدم المطابقة' : 'Non-Conformance Reports'}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? 'إدارة وتتبع حالات عدم المطابقة' : 'Manage and track non-conformance incidents'}
            </p>
          </div>
        </div>

        {/* Bulk One-Click Multi-Format Export & Preview Before Download */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-md font-bold text-xs"
          >
            <Eye className="h-4 w-4" />
            <span>{isAr ? "معاينة وتخصيص التصدير" : "Preview Before Export"}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-border/60 hover:bg-muted shadow-sm">
                <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-xs">{isAr ? "تصدير حزمة NCR" : "Bulk Export NCR"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                {isAr ? "خيارات التصدير الموحد لتقارير عدم المطابقة" : "NCR Bulk Export Options"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsPreviewOpen(true)} className="gap-2.5 py-2 cursor-pointer font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40">
                <Eye className="h-4 w-4 text-teal-600" />
                <span>{isAr ? "معاينة وتخصيص قبل التحميل" : "Preview Before Export"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkExportZIP} className="gap-2.5 py-2 cursor-pointer font-medium">
                <Archive className="h-4 w-4 text-amber-500" />
                <span>{isAr ? "تصدير حزمة ZIP شاملة (جميع تقارير NCR)" : "Export Full NCR ZIP Package"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWordDoc} className="gap-2.5 py-2 cursor-pointer">
                <FileDocIcon className="h-4 w-4 text-blue-500" />
                <span>{isAr ? "تصدير كـ مستند Word (Doc)" : "Export Word Document (.doc)"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2.5 py-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>{isAr ? "تصدير كـ جدول CSV / Excel" : "Export CSV Spreadsheet"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2.5 py-2 cursor-pointer">
                <FileCode2 className="h-4 w-4 text-purple-500" />
                <span>{isAr ? "تصدير كـ ملف JSON" : "Export JSON Data"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 p-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-sm">
              <FileBarChart className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'إجمالي' : 'Total'}</p>
              <p className="text-[26px] font-bold tracking-tight">{ncrs.length}</p>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-slate-500/5 group-hover:bg-slate-500/10 transition-colors" />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-900/20 p-4 transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Activity className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'مفتوح' : 'Open'}</p>
              <p className="text-[26px] font-bold tracking-tight text-amber-600 dark:text-amber-400">{openCount}</p>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-900/20 p-4 transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'مغلق' : 'Closed'}</p>
              <p className="text-[26px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{closedCount}</p>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-red-950/30 dark:to-rose-900/20 p-4 transition-all hover:shadow-md hover:border-red-300 dark:hover:border-red-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
              <ShieldAlertIcon className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'عالي/حرج' : 'High/Critical'}</p>
              <p className="text-[26px] font-bold tracking-tight text-red-600 dark:text-red-400">{criticalCount}</p>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={isAr ? 'بحث برقم المرجع، القسم، الوصف...' : 'Search by ref no., department, description...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-9 pe-9 h-10 rounded-xl border-border/50 bg-background text-[12px]"
            data-testid="input-search-ncr"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/50 text-[12px]" data-testid="select-filter-severity">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder={isAr ? 'الحدة' : 'Severity'} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل المستويات' : 'All Severities'}</SelectItem>
              <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
              <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
              <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
              <SelectItem value="critical">{isAr ? 'حرج' : 'Critical'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/50 text-[12px]" data-testid="select-filter-status">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder={isAr ? 'الحالة' : 'Status'} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="draft">{isAr ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="submitted">{isAr ? 'مُرسل' : 'Submitted'}</SelectItem>
              <SelectItem value="assigned">{isAr ? 'مُعيّن' : 'Assigned'}</SelectItem>
              <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
              <SelectItem value="closed">{isAr ? 'مغلق' : 'Closed'}</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 border-0 h-10 px-5 rounded-xl text-[12px]"
                  data-testid="button-add-ncr"
                >
                  {isAr ? 'تقرير جديد' : 'New NCR'}
                  <ChevronDown className="h-3.5 w-3.5 ms-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1.5" sideOffset={5}>
                <button
                  onClick={() => setLocation('/admin/ncr/new')}
                  className="flex items-center w-full rounded-lg py-2.5 px-3 cursor-pointer hover:bg-accent transition-colors text-[12px]"
                  data-testid="button-manual-entry-ncr"
                >
                  <FileEdit className="me-2 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="font-medium">{isAr ? 'إدخال يدوي' : 'Manual Entry'}</span>
                </button>
                <button
                  onClick={() => setLocation('/admin/ncr/new?mode=upload')}
                  className="flex items-center w-full rounded-lg py-2.5 px-3 cursor-pointer hover:bg-accent transition-colors text-[12px]"
                  data-testid="button-upload-ncr"
                >
                  <Upload className="me-2 h-4 w-4 shrink-0 text-blue-500" />
                  <span className="font-medium">{isAr ? 'رفع وتحليل' : 'Upload & Analyze'}</span>
                </button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isAr ? `عرض ${filteredNCRs.length} من ${ncrs.length} تقرير` : `Showing ${filteredNCRs.length} of ${ncrs.length} NCRs`}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => { setSearchTerm(""); setStatusFilter("all"); setSeverityFilter("all"); }}
          >
            <X className="h-4 w-4 me-1" />
            {isAr ? 'مسح' : 'Clear'}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'رقم المرجع' : 'Ref No.'}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'القسم' : 'Department'}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">{isAr ? 'الوصف' : 'Description'}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'الحدة' : 'Severity'}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">{isAr ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-right rtl:text-left font-semibold text-xs uppercase tracking-wider">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNCRs.length > 0 ? (
              filteredNCRs.map((ncr) => {
                const sevStyle = getSeverityStyle(ncr.severity);
                const statStyle = getStatusStyle(ncr.status);
                return (
                  <TableRow key={ncr.id} className="group hover:bg-muted/20 transition-colors" data-testid={`row-ncr-${ncr.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/20">
                          <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-mono font-semibold text-sm">{ncr.refNo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[120px]">{ncr.department}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] hidden sm:table-cell">
                      <p className="truncate text-sm text-muted-foreground" title={ncr.description}>{ncr.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", sevStyle.dot)} />
                        <span className={cn("text-sm font-medium capitalize", sevStyle.color)}>{getSeverityLabel(ncr.severity)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium border", statStyle.bg)}>
                        {getStatusLabel(ncr.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {ncr.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-500/10 hover:text-teal-600" onClick={() => setPreviewNCR(ncr)} data-testid={`button-preview-ncr-${ncr.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{isAr ? 'معاينة' : 'Preview'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600" onClick={() => setShareItem(ncr)} data-testid={`button-print-ncr-${ncr.id}`}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{isAr ? 'طباعة' : 'Print'}</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600" 
                                onClick={() => setLocation("/admin/escalations?source=" + encodeURIComponent(ncr.refNo))} 
                                data-testid={"button-escalate-ncr-" + ncr.id}
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{isAr ? 'تصعيد للإدارة' : 'Escalate to Management'}</TooltipContent>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/admin/ncr/${ncr.id}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-600" data-testid={`button-edit-ncr-${ncr.id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{isAr ? 'تعديل' : 'Edit'}</TooltipContent>
                            </Tooltip>
                          )}
                          {canSendEmail && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-purple-500/10 hover:text-purple-600" onClick={() => handleSendEmail(ncr.id)} data-testid={`button-email-ncr-${ncr.id}`}>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{isAr ? 'إرسال بريد' : 'Email'}</TooltipContent>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600" onClick={() => setDeleteId(ncr.id)} data-testid={`button-delete-ncr-${ncr.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{isAr ? 'حذف' : 'Delete'}</TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/20">
                      <ClipboardList className="h-8 w-8 text-amber-500/40" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        {hasActiveFilters
                          ? (isAr ? 'لا توجد نتائج مطابقة' : 'No matching NCRs found')
                          : (isAr ? 'لا توجد تقارير عدم مطابقة' : 'No NCR reports found')}
                      </p>
                      <p className="text-sm text-muted-foreground/60 mt-1">
                        {hasActiveFilters
                          ? (isAr ? 'جرب تغيير معايير البحث أو الفرز' : 'Try adjusting your search or filters')
                          : (isAr ? 'ابدأ بإنشاء أول تقرير' : 'Get started by creating your first report')}
                      </p>
                    </div>
                    {hasActiveFilters ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSearchTerm(""); setStatusFilter("all"); setSeverityFilter("all"); }}
                        className="mt-1 rounded-xl"
                        data-testid="button-empty-clear-filters"
                      >
                        <X className="h-4 w-4 me-1" />
                        {isAr ? 'مسح الفلاتر' : 'Clear Filters'}
                      </Button>
                    ) : canCreate && (
                      <Button
                        size="sm"
                        onClick={() => setLocation('/admin/ncr/new')}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm mt-1 rounded-xl"
                        data-testid="button-empty-create-ncr"
                      >
                        {isAr ? 'إنشاء تقرير' : 'Create NCR'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewNCR} onOpenChange={(open) => !open && setPreviewNCR(null)}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-auto p-0 rounded-2xl overflow-hidden border-border/30 !max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">{isAr ? 'معاينة تقرير NCR' : 'NCR Report Preview'}</DialogTitle>
          <DialogDescription className="sr-only">{isAr ? 'تفاصيل تقرير عدم المطابقة' : 'Non-conformance report details'}</DialogDescription>
          {previewNCR && (() => {
            const sevStyle = getSeverityStyle(previewNCR.severity);
            const statStyle = getStatusStyle(previewNCR.status);
            return (
              <>
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 px-4 sm:px-6 py-4 sm:py-5">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center ring-1 ring-white/20">
                        <ClipboardList className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{isAr ? 'تقرير عدم مطابقة' : 'NCR Report'}</p>
                        <h3 className="text-white text-xl font-bold font-mono tracking-tight">{previewNCR.refNo}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border text-xs font-semibold px-2.5 py-1 bg-white/15 text-white border-white/30")}>{getSeverityLabel(previewNCR.severity)}</Badge>
                      <Badge className={cn("border text-xs font-semibold px-2.5 py-1", statStyle.bg)}>
                        {getStatusLabel(previewNCR.status)}
                      </Badge>
                      <button onClick={() => setPreviewNCR(null)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-5 w-5 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center"><Calendar className="h-3 w-3" /></span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? 'التاريخ' : 'Date'}</span>
                      </div>
                      <p className="text-sm font-semibold">{previewNCR.date}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-5 w-5 rounded-md bg-violet-500/10 text-violet-600 flex items-center justify-center"><Building2 className="h-3 w-3" /></span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? 'القسم' : 'Dept'}</span>
                      </div>
                      <p className="text-sm font-semibold truncate">{previewNCR.department}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-5 w-5 rounded-md bg-red-500/10 text-red-600 flex items-center justify-center"><ShieldAlert className="h-3 w-3" /></span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? 'الحدة' : 'Severity'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", sevStyle.dot)} />
                        <p className={cn("text-sm font-semibold capitalize", sevStyle.color)}>{getSeverityLabel(previewNCR.severity)}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-5 w-5 rounded-md bg-teal-500/10 text-teal-600 flex items-center justify-center"><MapPin className="h-3 w-3" /></span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{isAr ? 'الموقع' : 'Location'}</span>
                      </div>
                      <p className="text-sm font-semibold truncate">{previewNCR.location || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/30 overflow-hidden">
                      <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center"><FileText className="h-4 w-4" /></span>
                        <h4 className="text-sm font-semibold">{isAr ? 'الوصف' : 'Description'}</h4>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{previewNCR.description}</p>
                      </div>
                    </div>

                    {previewNCR.immediateAction && (
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><Zap className="h-4 w-4" /></span>
                          <h4 className="text-sm font-semibold">{isAr ? 'الإجراء الفوري' : 'Immediate Action'}</h4>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{previewNCR.immediateAction}</p>
                        </div>
                      </div>
                    )}

                    {previewNCR.rootCause && (
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center"><Search className="h-4 w-4" /></span>
                          <h4 className="text-sm font-semibold">{isAr ? 'السبب الجذري' : 'Root Cause'}</h4>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{previewNCR.rootCause}</p>
                        </div>
                      </div>
                    )}

                    {previewNCR.correctiveAction && (
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></span>
                          <h4 className="text-sm font-semibold">{isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}</h4>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{previewNCR.correctiveAction}</p>
                        </div>
                      </div>
                    )}

                    {previewNCR.correctiveActions && previewNCR.correctiveActions.length > 0 && previewNCR.correctiveActions.some((ca: import("@/lib/data-context").NCRActionRow) => ca.action) && (
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center"><ClipboardList className="h-4 w-4" /></span>
                          <h4 className="text-sm font-semibold">{isAr ? 'خطة الإجراءات التصحيحية' : 'Corrective Action Plan'}</h4>
                          <Badge variant="secondary" className="text-[10px] ms-auto">{previewNCR.correctiveActions.length}</Badge>
                        </div>
                        <div className="divide-y divide-border/20">
                          {previewNCR.correctiveActions.map((ca: import("@/lib/data-context").NCRActionRow, idx: number) => (
                            <div key={idx} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-violet-600">{ca.no || idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="text-sm font-medium">{ca.action || '-'}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {ca.responsible && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" /> {ca.responsible}
                                      </span>
                                    )}
                                    {ca.dueDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> {ca.dueDate}
                                      </span>
                                    )}
                                    {ca.effectiveness && (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {ca.effectiveness}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {previewNCR.verificationNotes && (
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="bg-muted/20 px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></span>
                          <h4 className="text-sm font-semibold">{isAr ? 'ملاحظات التحقق' : 'Verification Notes'}</h4>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{previewNCR.verificationNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground/60 border-t border-border/20">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {isAr ? 'المسؤول:' : 'Responsible:'} {previewNCR.responsiblePersonId || (isAr ? 'غير محدد' : 'Not assigned')}
                    </div>
                    {previewNCR.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {isAr ? 'تاريخ الاستحقاق:' : 'Due:'} {previewNCR.dueDate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-muted/20 border-t border-border/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                  <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto" onClick={() => setPreviewNCR(null)}>
                    {isAr ? 'إغلاق' : 'Close'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl flex-1 sm:flex-none" onClick={() => { setShareItem(previewNCR); setPreviewNCR(null); }}>
                      <Printer className="h-4 w-4 me-1.5" />
                      {isAr ? 'طباعة' : 'Print'}
                    </Button>
                    {canEdit && (
                      <Link href={`/admin/ncr/${previewNCR.id}`}>
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl flex-1 sm:flex-none">
                          <Edit className="h-4 w-4 me-1.5" />
                          {isAr ? 'تعديل' : 'Edit'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription>
              {isAr 
                ? <>لا يمكن التراجع عن هذا الإجراء. اكتب <strong>DELETE</strong> أدناه للتأكيد.</>
                : <>This action cannot be undone. Type <strong>DELETE</strong> below to confirm.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input 
              value={deleteConfirmation} 
              onChange={(e) => setDeleteConfirmation(e.target.value)} 
              placeholder={isAr ? 'اكتب DELETE للتأكيد' : 'Type DELETE to confirm'}
              className="rounded-xl"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmation !== "DELETE"} className="rounded-xl">
              {isAr ? 'حذف التقرير' : 'Delete NCR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Share Dialog */}
      {shareItem && (
        <PrintShareDialog
          open={!!shareItem}
          onOpenChange={(open) => !open && setShareItem(null)}
          item={{
            id: shareItem.id,
            url: typeof window !== 'undefined' ? `${window.location.origin}/admin/ncr/${shareItem.id}` : undefined,
            type: "ncr",
            refNo: shareItem.refNo,
            title: `NCR: ${shareItem.refNo}`,
            department: shareItem.department,
            severity: shareItem.severity,
            status: shareItem.status,
            date: shareItem.date,
            images: [shareItem.image1, shareItem.image2, shareItem.image3, shareItem.image4],
            sections: [
              { label: isAr ? 'الوصف' : 'Description', value: shareItem.description || '' },
              { label: isAr ? 'الإجراء الفوري' : 'Immediate Action', value: shareItem.immediateAction || '' },
              { label: isAr ? 'السبب الجذري' : 'Root Cause', value: shareItem.rootCause || '' },
              { label: isAr ? 'الإجراء التصحيحي' : 'Corrective Action', value: shareItem.correctiveAction || '' },
              { label: isAr ? 'ملاحظات التحقق' : 'Verification Notes', value: shareItem.verificationNotes || '' },
            ].filter(s => s.value)
          }}
        />
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        titleEn="Non-Conformance Reports (NCR) Export"
        titleAr="تصدير تقارير عدم المطابقة (NCR)"
        data={ncrs}
        columns={ncrColumns}
        onConfirmExport={handleConfirmNCRExport}
      />
    </div>
  );
}

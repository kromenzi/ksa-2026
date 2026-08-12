import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { FileBarChart, Trash2, Download, AlertTriangle, Printer, Eye, Link2, Edit, Upload, PenLine, Loader2, Image as ImageIcon, X, ChevronDown, Shield, ShieldAlert, ShieldCheck, ClipboardList, TrendingUp, BarChart3, Calendar, MapPin, Activity, Sparkles, FileText, FileText as FileDocIcon, Search, Filter, XCircle, FileSearch, Copy, Archive, FileSpreadsheet, FileCode2 } from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";
import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import type { SafetyReport } from "@/lib/data-context";
import JSZip from "jszip";
import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";

const SAFETY_COLUMNS: ExportColumnDef[] = [
  { id: "reportNo", labelEn: "Report No", labelAr: "رقم التقرير" },
  { id: "category", labelEn: "Category", labelAr: "التصنيف" },
  { id: "location", labelEn: "Location", labelAr: "الموقع" },
  { id: "department", labelEn: "Department", labelAr: "القسم" },
  { id: "riskLevel", labelEn: "Risk Level", labelAr: "مستوى الخطر" },
  { id: "status", labelEn: "Status", labelAr: "الحالة" },
  { id: "date", labelEn: "Date", labelAr: "التاريخ" },
  { id: "observerName", labelEn: "Observer Name", labelAr: "اسم المراقب", isSensitive: true },
  { id: "observationDescription", labelEn: "Description", labelAr: "الوصف" },
  { id: "correctiveAction", labelEn: "Corrective Action", labelAr: "الإجراء التصحيحي" },
];

export default function AdminReports() {
  const {
    reports, deleteReport, generateReport, settings, hasPermission,
    safetyReports, reportSettingsData, addSafetyReport, updateSafetyReport, deleteSafetyReport,
    logActivity, currentUser,
  } = useData();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [shareItem, setShareItem] = useState<any>(null);
  const [shareSafetyReport, setShareSafetyReport] = useState<SafetyReport | null>(null);
  const [activeTab, setActiveTab] = useState("safety");
  const [previewReport, setPreviewReport] = useState<SafetyReport | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<SafetyReport | null>(null);
  const [deleteSafetyId, setDeleteSafetyId] = useState<string | null>(null);
  const [deleteSafetyConfirm, setDeleteSafetyConfirm] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  const isAr = settings.language === 'ar';
  const canDelete = hasPermission('reports', 'delete');
  const canCreate = hasPermission('reports', 'create');

  const getPublicUrl = useCallback((reportId: string) => {
    const base = reportSettingsData.publicBaseUrl || window.location.origin;
    return `${base.replace(/\/$/, '')}/report/${reportId}`;
  }, [reportSettingsData.publicBaseUrl]);

  const handleCopyLink = useCallback((report: SafetyReport) => {
    const url = getPublicUrl(report.id);
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: isAr ? 'تم نسخ الرابط' : 'Link Copied' });
      logActivity("Copy Report Link", `Copied public link for report ${report.reportNo}`, "reports");
    });
  }, [isAr, toast, logActivity, getPublicUrl]);

  const handlePrint = useCallback(() => {
    if (previewReport) {
      setShareSafetyReport(previewReport);
      return;
    }

    if (!printRef.current) {
      const openC = safetyReports.filter(r => r.status === 'open').length;
      const inProgC = safetyReports.filter(r => r.status === 'in_progress').length;
      const closedC = safetyReports.filter(r => r.status === 'closed').length;

      setShareItem({
        id: "RPT-SUMMARY-ALL",
        type: "report",
        refNo: "HSE-RPT-ALL",
        title: isAr ? "التقرير الموحد لجميع ملاحظات وتقارير السلامة" : "Unified HSE Safety Observations Summary",
        department: "HSE & Industrial Safety Dept",
        status: "Active",
        createdAt: new Date().toISOString().split("T")[0],
        sections: [
          { label: isAr ? "إجمالي التقارير" : "Total Reports", value: `${safetyReports.length} ${isAr ? "تقرير" : "reports"}` },
          { label: isAr ? "التقارير المفتوحة" : "Open Reports", value: `${openC}` },
          { label: isAr ? "تقارير قيد التنفيذ" : "In Progress", value: `${inProgC}` },
          { label: isAr ? "التقارير المغلقة" : "Closed Reports", value: `${closedC}` },
          { label: isAr ? "قائمة التقارير المسجلة" : "Reports Register", value: safetyReports.map(r => `[${r.reportNo}] ${r.location || 'N/A'} - ${r.riskLevel.toUpperCase()} (${r.status})`).join("\n") }
        ]
      });
      return;
    }
    
    const dir = isAr ? 'rtl' : 'ltr';
    const align = isAr ? 'right' : 'left';
    const fontFamily = isAr 
      ? "'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" 
      : "Arial, sans-serif";
    
    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>Safety Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      direction: ${dir}; 
      text-align: ${align};
      line-height: 1.7;
      padding: 15px;
    }
    @page { size: A4; margin: 10mm; }
    @media print { 
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
    }
  </style>
</head>
<body>${printRef.current.innerHTML}</body>
</html>`;

    // Remove existing print iframe if any to prevent memory leaks
    const existingIframe = document.getElementById('unified-print-iframe');
    if (existingIframe) {
      try { existingIframe.parentNode?.removeChild(existingIframe); } catch (err) { console.debug(err); }
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'unified-print-iframe';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1024px';
    iframe.style.height = '1024px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }, 1000);
    }
  }, [previewReport, safetyReports, isAr]);

  const getRiskLabel = (level: string) => {
    const key = level?.toLowerCase() || '';
    const ar: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج' };
    const en: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
    return isAr ? (ar[key] || level) : (en[key] || level);
  };

  const getStatusLabel = (status: string) => {
    const key = status?.toLowerCase() || '';
    const ar: Record<string, string> = { open: 'مفتوح', in_progress: 'قيد التنفيذ', closed: 'مغلق' };
    const en: Record<string, string> = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };  
    return isAr ? (ar[key] || status) : (en[key] || status);
  };

  const handleDeleteReport = () => {
    if (deleteConfirmation === "DELETE" && deleteId) {
      deleteReport(deleteId);
      setDeleteId(null);
      setDeleteConfirmation("");
    }
  };

  const handleDeleteSafety = () => {
    if (deleteSafetyConfirm === "DELETE" && deleteSafetyId) {
      deleteSafetyReport(deleteSafetyId);
      setDeleteSafetyId(null);
      setDeleteSafetyConfirm("");
    }
  };

  const openCount = safetyReports.filter(r => r.status === 'open').length;
  const inProgressCount = safetyReports.filter(r => r.status === 'in_progress').length;
  const closedCount = safetyReports.filter(r => r.status === 'closed').length;

  const statusStyles: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    closed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  const riskDot: Record<string, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  // Preview Before Download Modal State
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);

  const safetyColumns = SAFETY_COLUMNS;

  const handleConfirmCustomExport = useCallback(async (opts: ExportOptions) => {
    const activeCols = safetyColumns.filter(c => !opts.hiddenColumns.includes(c.id));
    
    // Prepare filtered rows
    const processValue = (r: SafetyReport, col: ExportColumnDef) => {
      if (col.isSensitive && opts.hideSensitiveData) {
        return "██████ (PROTECTED)";
      }
      return (r as any)[col.id] || "";
    };

    if (opts.format === "csv") {
      const headers = activeCols.map(c => isAr ? c.labelAr : c.labelEn);
      const rows = safetyReports.map(r => activeCols.map(c => `"${String(processValue(r, c)).replace(/"/g, '""')}"`));
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `customized_safety_reports_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير ملف CSV المخصص بنجاح" : "Customized CSV exported successfully" });
    } else if (opts.format === "doc") {
      const title = opts.companyName || (isAr ? "التقرير الشامل لتقارير السلامة" : "Comprehensive Safety Report");
      const dir = isAr ? "rtl" : "ltr";
      
      const rowsHtml = safetyReports.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          ${activeCols.map(c => `<td style="padding: 8px;">${processValue(r, c)}</td>`).join("")}
        </tr>
      `).join("");

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; direction: ${dir}; text-align: ${isAr ? 'right' : 'left'}; margin: 20px; }
            h1 { color: ${opts.headerColor}; border-bottom: 2px solid ${opts.headerColor}; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: ${opts.headerColor}; color: white; padding: 10px; text-align: ${isAr ? 'right' : 'left'}; }
            td { padding: 8px; border-bottom: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${opts.showMetadata ? `<div style="font-size: 11px; color: #64748b;">${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>` : ''}
          <table>
            <thead>
              <tr>
                ${activeCols.map(c => `<th>${isAr ? c.labelAr : c.labelEn}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `customized_report_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير مستند Word المخصص بنجاح" : "Customized Word document exported" });
    } else if (opts.format === "json") {
      const sanitized = safetyReports.map(r => {
        const obj: any = {};
        activeCols.forEach(c => {
          obj[c.id] = processValue(r, c);
        });
        return obj;
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sanitized, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `customized_reports_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(dlAnchorElem);
      dlAnchorElem.click();
      dlAnchorElem.parentNode?.removeChild(dlAnchorElem);
      toast({ title: isAr ? "تم تصدير JSON المخصص بنجاح" : "Customized JSON exported successfully" });
    } else if (opts.format === "pdf") {
      window.print();
    } else {
      // ZIP
      const zip = new JSZip();
      const headers = activeCols.map(c => isAr ? c.labelAr : c.labelEn);
      const rows = safetyReports.map(r => activeCols.map(c => `"${String(processValue(r, c)).replace(/"/g, '""')}"`));
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      
      zip.file("تقارير_السلامة_المخصصة.csv", csvContent);
      zip.file("بيانات_التقرير.json", JSON.stringify(safetyReports, null, 2));
      
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `حزمة_تقارير_مخصصة_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: isAr ? "تم تصدير حزمة ZIP المخصصة بنجاح" : "Customized ZIP package exported successfully" });
    }
  }, [safetyReports, safetyColumns, isAr, toast]);

  // Bulk Export Functions (ZIP, Doc, CSV, JSON)
  const handleExportCSV = useCallback(() => {
    const headers = ["Report No", "Category", "Location", "Department", "Risk Level", "Status", "Date", "Description"];
    const rows = safetyReports.map(r => [
      r.reportNo,
      r.category || '',
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      r.riskLevel,
      r.status,
      r.date || '',
      `"${(r.observationDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `safety_reports_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast({ title: isAr ? "تم تصدير ملف CSV بنجاح" : "CSV exported successfully" });
  }, [safetyReports, isAr, toast]);

  const handleExportJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ safetyReports, systemReports: reports }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `reports_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.parentNode?.removeChild(dlAnchorElem);
    toast({ title: isAr ? "تم تصدير ملف JSON بنجاح" : "JSON exported successfully" });
  }, [safetyReports, reports, isAr, toast]);

  const generateWordDocHTML = useCallback(() => {
    const title = isAr ? "التقرير الشامل لتقارير السلامة والنظام" : "Comprehensive Safety & System Reports";
    const dir = isAr ? "rtl" : "ltr";
    
    const rowsHtml = safetyReports.map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold;">${r.reportNo || ''}</td>
        <td style="padding: 10px;">${r.category || ''}</td>
        <td style="padding: 10px;">${r.location || ''}</td>
        <td style="padding: 10px;">${r.department || ''}</td>
        <td style="padding: 10px;">${r.riskLevel || ''}</td>
        <td style="padding: 10px;">${r.status || ''}</td>
        <td style="padding: 10px;">${r.date || ''}</td>
        <td style="padding: 10px;">${r.observationDescription || ''}</td>
      </tr>
    `).join("");

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${dir}; text-align: ${isAr ? 'right' : 'left'}; margin: 20px; }
          h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #0f766e; color: white; padding: 10px; text-align: ${isAr ? 'right' : 'left'}; }
          td { padding: 8px; border-bottom: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
        
        <h2>${isAr ? 'تقارير ملاحظات السلامة' : 'Safety Observation Reports'} (${safetyReports.length})</h2>
        <table>
          <thead>
            <tr>
              <th>${isAr ? 'رقم التقرير' : 'Report No'}</th>
              <th>${isAr ? 'التصنيف' : 'Category'}</th>
              <th>${isAr ? 'الموقع' : 'Location'}</th>
              <th>${isAr ? 'القسم' : 'Department'}</th>
              <th>${isAr ? 'مستوى الخطر' : 'Risk'}</th>
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
  }, [safetyReports, isAr]);

  const handleExportWordDoc = useCallback(() => {
    const htmlContent = generateWordDocHTML();
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comprehensive_report_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    toast({ title: isAr ? "تم تصدير مستند Word بنجاح" : "Word document exported successfully" });
  }, [generateWordDocHTML, isAr, toast]);

  const handleBulkExportZIP = useCallback(async () => {
    try {
      const zip = new JSZip();
      
      // 1. Executive Word Doc Summary
      const docHtml = generateWordDocHTML();
      zip.file("تقرير_شامل_جميع_التقارير.doc", "\ufeff" + docHtml);

      // 2. CSV Safety Reports
      const safetyCsvHeaders = ["Report No", "Category", "Location", "Department", "Risk Level", "Status", "Date", "Description"];
      const safetyCsvRows = safetyReports.map(r => [
        r.reportNo,
        r.category || '',
        `"${(r.location || '').replace(/"/g, '""')}"`,
        `"${(r.department || '').replace(/"/g, '""')}"`,
        r.riskLevel,
        r.status,
        r.date || '',
        `"${(r.observationDescription || '').replace(/"/g, '""')}"`
      ]);
      const safetyCsvContent = "\uFEFF" + [safetyCsvHeaders.join(","), ...safetyCsvRows.map(row => row.join(","))].join("\n");
      zip.file("تقارير_السلامة.csv", safetyCsvContent);

      // 3. JSON Export
      zip.file("بيانات_التقارير_الكاملة.json", JSON.stringify({ safetyReports, systemReports: reports }, null, 2));

      // 4. Individual Report Files Folder inside ZIP
      const folder = zip.folder("مستندات_التقارير_الفردية");
      safetyReports.forEach((sr) => {
        const singleDoc = `
          <html>
          <body style="font-family: sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; padding: 20px;">
            <h2>${isAr ? 'تقرير سلامة فردي' : 'Individual Safety Report'}: ${sr.reportNo}</h2>
            <p><strong>${isAr ? 'الموقع' : 'Location'}:</strong> ${sr.location || '-'}</p>
            <p><strong>${isAr ? 'القسم' : 'Department'}:</strong> ${sr.department || '-'}</p>
            <p><strong>${isAr ? 'مستوى الخطر' : 'Risk Level'}:</strong> ${sr.riskLevel || '-'}</p>
            <p><strong>${isAr ? 'الحالة' : 'Status'}:</strong> ${sr.status || '-'}</p>
            <p><strong>${isAr ? 'المراقب' : 'Observer'}:</strong> ${sr.observerName || '-'}</p>
            <p><strong>${isAr ? 'الوصف' : 'Description'}:</strong> ${sr.observationDescription || '-'}</p>
            <p><strong>${isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}:</strong> ${sr.correctiveAction || '-'}</p>
          </body>
          </html>
        `;
        folder?.file(`${sr.reportNo || 'report'}.doc`, "\ufeff" + singleDoc);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `حزمة_جميع_التقارير_الموحدة_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast({ title: isAr ? "تم تصدير حزمة ZIP الشاملة بنجاح" : "All reports ZIP package exported successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: isAr ? "حدث خطأ أثناء إنشاء حزمة ZIP" : "Error creating ZIP file", variant: "destructive" });
    }
  }, [safetyReports, reports, generateWordDocHTML, isAr, toast]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight" data-testid="text-reports-title">
              {isAr ? 'التقارير' : 'Reports'}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? 'إدارة تقارير السلامة وتقارير النظام' : 'Safety observation reports & system reports'}
            </p>
          </div>
        </div>

        {/* Bulk One-Click Multi-Format Export & Preview Before Download */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsExportPreviewOpen(true)}
            className="gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-md font-bold text-xs"
          >
            <Eye className="h-4 w-4" />
            <span>{isAr ? "معاينة وتخصيص التصدير" : "Preview Before Export"}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-border/60 hover:bg-muted shadow-sm">
                <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="font-semibold text-xs">{isAr ? "تصدير مباشر (ZIP / Doc)" : "Direct Export"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                {isAr ? "خيارات التصدير الشامل الموحد" : "Unified Bulk Export Options"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsExportPreviewOpen(true)} className="gap-2.5 py-2 cursor-pointer font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40">
                <Eye className="h-4 w-4 text-teal-600" />
                <span>{isAr ? "معاينة وتخصيص قبل التحميل" : "Preview & Customize Options"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkExportZIP} className="gap-2.5 py-2 cursor-pointer font-medium">
                <Archive className="h-4 w-4 text-amber-500" />
                <span>{isAr ? "تصدير حزمة ZIP شاملة (جميع التقارير)" : "Export Full ZIP Package"}</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint} className="gap-2.5 py-2 cursor-pointer">
                <Printer className="h-4 w-4 text-slate-500" />
                <span>{isAr ? "طباعة التقارير" : "Print All Reports"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-10 p-1 bg-muted/60 border border-border/50 rounded-xl lg:w-[420px]">
          <TabsTrigger value="safety" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md gap-2 transition-all text-[12px]" data-testid="tab-safety-reports">
            <Shield className="h-3.5 w-3.5" />
            {isAr ? 'تقارير السلامة' : 'Safety Reports'}
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md gap-2 transition-all text-[12px]" data-testid="tab-system-reports">
            <BarChart3 className="h-3.5 w-3.5" />
            {isAr ? 'تقارير النظام' : 'System Reports'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="safety" className="mt-6 space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-1 w-full">
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 p-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <FileBarChart className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'إجمالي' : 'Total'}</p>
                    <p className="text-[26px] font-bold tracking-tight">{safetyReports.length}</p>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-blue-50 to-sky-50/50 dark:from-blue-950/30 dark:to-sky-900/20 p-4 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm">
                    <ShieldAlert className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'مفتوح' : 'Open'}</p>
                    <p className="text-[26px] font-bold tracking-tight text-blue-600 dark:text-blue-400">{openCount}</p>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-900/20 p-4 transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Activity className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">{isAr ? 'قيد التنفيذ' : 'In Progress'}</p>
                    <p className="text-[26px] font-bold tracking-tight text-amber-600 dark:text-amber-400">{inProgressCount}</p>
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
            </div>

            {canCreate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md shadow-teal-500/20 border-0 h-10 px-5 rounded-xl text-[12px]"
                    data-testid="button-add-safety-report"
                  >
                    {isAr ? 'تقرير جديد' : 'New Report'}
                    <ChevronDown className="h-3.5 w-3.5 ms-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1.5" sideOffset={5}>
                  <button
                    onClick={() => { setEditingReport(null); setFormOpen(true); }}
                    className="flex items-center w-full rounded-lg py-2.5 px-3 cursor-pointer hover:bg-accent transition-colors text-[12px]"
                    data-testid="button-manual-entry-report"
                  >
                    <PenLine className="h-3.5 w-3.5 text-teal-500 me-2 shrink-0" />
                    <span className="font-medium">{isAr ? 'إدخال يدوي' : 'Manual Entry'}</span>
                  </button>
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center w-full rounded-lg py-2.5 px-3 cursor-pointer hover:bg-accent transition-colors text-[12px]"
                    data-testid="button-upload-report"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-500 me-2 shrink-0" />
                    <span className="font-medium">{isAr ? 'رفع وتحليل' : 'Upload & Analyze'}</span>
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {(() => {
            const hasActiveFilters = searchQuery || filterRisk !== 'all' || filterStatus !== 'all';
            const filteredReports = safetyReports.filter((sr) => {
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesNo = sr.reportNo?.toLowerCase().includes(q);
                const matchesLocation = sr.location?.toLowerCase().includes(q);
                const matchesDesc = sr.observationDescription?.toLowerCase().includes(q);
                const matchesDept = sr.department?.toLowerCase().includes(q);
                const matchesObserver = sr.observerName?.toLowerCase().includes(q);
                if (!matchesNo && !matchesLocation && !matchesDesc && !matchesDept && !matchesObserver) return false;
              }
              if (filterRisk !== 'all' && sr.riskLevel !== filterRisk) return false;
              if (filterStatus !== 'all' && sr.status !== filterStatus) return false;
              return true;
            });
            return (<>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={isAr ? 'بحث برقم التقرير، الموقع، الوصف...' : 'Search by report no., location, description...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 pe-9 h-10 rounded-xl border-border/50 bg-background"
                data-testid="input-search-reports"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-clear-search">
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/50 text-sm" data-testid="select-filter-risk">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder={isAr ? 'الخطر' : 'Risk'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'كل المستويات' : 'All Risks'}</SelectItem>
                  <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
                  <SelectItem value="critical">{isAr ? 'حرج' : 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/50 text-sm" data-testid="select-filter-status">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder={isAr ? 'الحالة' : 'Status'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</SelectItem>
                  <SelectItem value="open">{isAr ? 'مفتوح' : 'Open'}</SelectItem>
                  <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                  <SelectItem value="closed">{isAr ? 'مغلق' : 'Closed'}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => { setSearchQuery(""); setFilterRisk("all"); setFilterStatus("all"); }} data-testid="button-clear-filters">
                  <X className="h-4 w-4 me-1" />
                  {isAr ? 'مسح' : 'Clear'}
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="text-sm text-muted-foreground">
              {isAr ? `عرض ${filteredReports.length} من ${safetyReports.length} تقرير` : `Showing ${filteredReports.length} of ${safetyReports.length} reports`}
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'رقم التقرير' : 'Report No.'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">{isAr ? 'الموقع' : 'Location'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'مستوى الخطر' : 'Risk'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-right rtl:text-left font-semibold text-xs uppercase tracking-wider">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((sr) => (
                  <TableRow key={sr.id} className="group hover:bg-muted/20 transition-colors" data-testid={`row-safety-report-${sr.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center border border-teal-500/20">
                          <FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="font-mono font-semibold text-sm">{sr.reportNo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {sr.date}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {sr.location || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${riskDot[sr.riskLevel] || 'bg-gray-400'}`} />
                        <span className="text-sm font-medium">{getRiskLabel(sr.riskLevel)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-medium border ${statusStyles[sr.status] || 'bg-muted text-muted-foreground'}`}>
                        {getStatusLabel(sr.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-500/10 hover:text-teal-600" onClick={() => setPreviewReport(sr)} title={isAr ? 'معاينة' : 'Preview'} data-testid={`button-preview-${sr.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-violet-500/10 hover:text-violet-600" onClick={() => setShareSafetyReport(sr)} title={isAr ? 'طباعة ومشاركة' : 'Print & Share'} data-testid={`button-print-share-${sr.id}`}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-600" onClick={() => setPreviewReport(sr)} title={isAr ? 'معاينة / تحميل PDF' : 'Preview / Download PDF'} data-testid={`button-pdf-${sr.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-600" onClick={() => handleCopyLink(sr)} title={isAr ? 'نسخ الرابط' : 'Copy Link'} data-testid={`button-copy-link-${sr.id}`}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        {canCreate && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600" onClick={() => { setEditingReport(sr); setFormOpen(true); }} title={isAr ? 'تعديل' : 'Edit'} data-testid={`button-edit-${sr.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600" onClick={() => setDeleteSafetyId(sr.id)} data-testid={`button-delete-safety-${sr.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center border border-teal-500/20">
                          <Shield className="h-8 w-8 text-teal-500/40" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">
                            {hasActiveFilters
                              ? (isAr ? 'لا توجد نتائج مطابقة' : 'No matching reports found')
                              : (isAr ? 'لا توجد تقارير سلامة بعد' : 'No safety reports yet')}
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
                            onClick={() => { setSearchQuery(""); setFilterRisk("all"); setFilterStatus("all"); }}
                            className="mt-1"
                            data-testid="button-empty-clear-filters"
                          >
                            <X className="h-4 w-4 me-1" />
                            {isAr ? 'مسح الفلاتر' : 'Clear Filters'}
                          </Button>
                        ) : canCreate && (
                          <Button
                            size="sm"
                            onClick={() => { setEditingReport(null); setFormOpen(true); }}
                            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-sm mt-1"
                            data-testid="button-empty-create-report"
                          >
                            {isAr ? 'إنشاء تقرير' : 'Create Report'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </>);
          })()}
        </TabsContent>

        <TabsContent value="system" className="mt-6 space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="grid gap-3 grid-cols-3 flex-1 w-full">
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-900/20 p-4 transition-all hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'إجمالي' : 'Total'}</p>
                    <p className="text-2xl font-bold tracking-tight">{reports.length}</p>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-violet-500/5 group-hover:bg-violet-500/10 transition-colors" />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-900/20 p-4 transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'مكتمل' : 'Completed'}</p>
                    <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{reports.filter(r => r.status === 'completed').length}</p>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-red-950/30 dark:to-rose-900/20 p-4 transition-all hover:shadow-md hover:border-red-300 dark:hover:border-red-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{isAr ? 'فشل' : 'Failed'}</p>
                    <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{reports.filter(r => r.status === 'failed').length}</p>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-16 w-16 rounded-full bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
              </div>
            </div>

            {canCreate && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => generateReport('user')} className="rounded-xl border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/30">
                  <TrendingUp className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-violet-500" />
                  {isAr ? 'تقرير المستخدمين' : 'User Report'}
                </Button>
                <Button onClick={() => generateReport('content')} className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md shadow-violet-500/20 border-0">
                  <Sparkles className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {isAr ? 'توليد تقرير' : 'Generate Report'}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'اسم التقرير' : 'Report Name'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">{isAr ? 'تاريخ التوليد' : 'Generated Date'}</TableHead>
                  <TableHead className="text-right rtl:text-left font-semibold text-xs uppercase tracking-wider">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center border border-violet-500/20">
                          <FileBarChart className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-sm font-medium">{report.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs bg-muted/50 border-border/50">{report.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border ${
                          report.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        }`}
                      >
                        {report.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'فشل' : 'Failed')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {report.createdAt}
                      </div>
                    </TableCell>
                    <TableCell className="text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-violet-500/10 hover:text-violet-600" onClick={() => setShareItem(report)} data-testid={`button-share-report-${report.id}`}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-600">
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600" onClick={() => setDeleteId(report.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center border border-violet-500/20">
                          <BarChart3 className="h-8 w-8 text-violet-500/40" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">
                            {isAr ? 'لا توجد تقارير نظام' : 'No system reports yet'}
                          </p>
                          <p className="text-sm text-muted-foreground/60 mt-1">
                            {isAr ? 'قم بتوليد تقرير للبدء' : 'Generate a report to get started'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <UploadAnalyzeDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        isAr={isAr}
        addSafetyReport={addSafetyReport}
        currentUserId={currentUser?.id || ''}
      />

      <SafetyReportFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingReport={editingReport}
        isAr={isAr}
        addSafetyReport={addSafetyReport}
        updateSafetyReport={updateSafetyReport}
        currentUserId={currentUser?.id || ''}
      />

      <SafetyReportPreviewDialog
        report={previewReport}
        onClose={() => setPreviewReport(null)}
        isAr={isAr}
        reportSettings={reportSettingsData}
        getPublicUrl={getPublicUrl}
        onCopyLink={handleCopyLink}
        onPrint={handlePrint}
        printRef={printRef}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'هذا الإجراء لا يمكن التراجع عنه. اكتب DELETE للتأكيد.' : 'This action cannot be undone. Type DELETE to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Type DELETE to confirm" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDeleteReport} disabled={deleteConfirmation !== "DELETE"}>
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSafetyId} onOpenChange={(open) => !open && setDeleteSafetyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? 'حذف تقرير السلامة' : 'Delete Safety Report'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'هذا الإجراء لا يمكن التراجع عنه. اكتب DELETE للتأكيد.' : 'This action cannot be undone. Type DELETE to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteSafetyConfirm} onChange={(e) => setDeleteSafetyConfirm(e.target.value)} placeholder="Type DELETE to confirm" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteSafetyId(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDeleteSafety} disabled={deleteSafetyConfirm !== "DELETE"}>
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {shareItem && (
        <PrintShareDialog
          open={!!shareItem}
          onOpenChange={(open) => !open && setShareItem(null)}
          item={{
            type: "report",
            title: shareItem.title,
            status: shareItem.status,
            date: shareItem.createdAt,
            sections: [
              { label: isAr ? 'النوع' : 'Type', value: shareItem.type },
              { label: isAr ? 'الحالة' : 'Status', value: shareItem.status },
              { label: isAr ? 'تاريخ التوليد' : 'Generated Date', value: shareItem.createdAt },
              { label: isAr ? 'البيانات' : 'Data', value: shareItem.data ? JSON.stringify(shareItem.data, null, 2) : 'No data' },
            ],
          }}
        />
      )}



      {shareSafetyReport && (
        <PrintShareDialog
          open={!!shareSafetyReport}
          onOpenChange={(open) => !open && setShareSafetyReport(null)}
          item={{
            id: shareSafetyReport.id,
            url: getPublicUrl(shareSafetyReport.id),
            type: "report",
            refNo: shareSafetyReport.reportNo,
            title: `${isAr ? 'تقرير سلامة' : 'Safety Report'} - ${shareSafetyReport.reportNo}`,
            department: shareSafetyReport.department || undefined,
            severity: shareSafetyReport.riskLevel,
            status: shareSafetyReport.status,
            date: shareSafetyReport.date,
            sections: [
              { label: isAr ? 'رقم التقرير' : 'Report No', value: shareSafetyReport.reportNo },
              { label: isAr ? 'التاريخ' : 'Date', value: shareSafetyReport.date || '-' },
              { label: isAr ? 'الموقع' : 'Location', value: shareSafetyReport.location || '-' },
              { label: isAr ? 'القسم' : 'Department', value: shareSafetyReport.department || '-' },
              { label: isAr ? 'اسم المراقب' : 'Observer', value: shareSafetyReport.observerName || '-' },
              { label: isAr ? 'مستوى المخاطرة' : 'Risk Level', value: getRiskLabel(shareSafetyReport.riskLevel) },
              { label: isAr ? 'الحالة' : 'Status', value: getStatusLabel(shareSafetyReport.status) },
              { label: isAr ? 'وصف الملاحظة' : 'Observation Description', value: shareSafetyReport.observationDescription || '-' },
              { label: isAr ? 'الإجراء التصحيحي' : 'Corrective Action', value: shareSafetyReport.correctiveAction || '-' },
            ],
          }}
        />
      )}

      {/* Export Preview & Customization Dialog */}
      <ExportPreviewModal
        isOpen={isExportPreviewOpen}
        onClose={() => setIsExportPreviewOpen(false)}
        titleEn="Safety Observations Export"
        titleAr="تصدير ملاحظات السلامة الميدانية"
        data={safetyReports}
        columns={safetyColumns}
        onConfirmExport={handleConfirmCustomExport}
      />
    </div>
  );
}

function UploadAnalyzeDialog({
  open, onOpenChange, isAr, addSafetyReport, currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAr: boolean;
  addSafetyReport: (data: any) => Promise<SafetyReport>;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; filename: string } | null>(null);
  const [form, setForm] = useState<any>({});
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setStep('upload');
        setUploadedFile(null);
        setForm({});
        setImages([null, null, null, null]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const setDefaultFormValues = useCallback(() => {
    setForm({
      reportNo: `RPT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      location: '',
      department: '',
      observerName: '',
      riskLevel: 'medium',
      observationDescription: '',
      correctiveAction: '',
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: isAr ? 'يرجى رفع ملف PDF فقط' : 'Please upload a PDF file only', variant: 'destructive' });
      return;
    }
    setStep('analyzing');
    
    try {
      // Convert PDF to text using PDF.js or similar
      const arrayBuffer = await file.arrayBuffer();
      
      // Try to extract text from PDF
      let extractedText = '';
      try {
        // Simple text extraction attempt
        const textDecoder = new TextDecoder('utf-8');
        const pdfContent = textDecoder.decode(arrayBuffer.slice(0, 50000)); // First 50KB
        // Look for text patterns in PDF
        const textMatches = pdfContent.match(/[\x20-\x7E\xA0-\xFF]{10,}/g);
        if (textMatches) {
          extractedText = textMatches.join(' ').substring(0, 3000);
        }
      } catch {
        extractedText = '';
      }

      // Use OpenAI for intelligent analysis
      const openaiApiKey = localStorage.getItem('openai_api_key') || '';
      
      if (openaiApiKey && extractedText.length > 100) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a safety report analyzer. Extract key information from safety observation reports and return it as JSON. Fields to extract: reportNo, date (YYYY-MM-DD format), location, department, observerName, riskLevel (low/medium/high/critical), observationDescription, correctiveAction. Return ONLY valid JSON without any explanation.'
                },
                {
                  role: 'user',
                  content: `Analyze this safety report text and extract key information:\n\n${extractedText.substring(0, 2000)}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });

          if (response.ok) {
            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || '';
            
            // Parse JSON from AI response
            try {
              const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                const randomStr = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().substring(0, 6) : String(Date.now()).slice(-6);
                const todayStr = new Date().toISOString().split('T')[0];
                setForm({
                  reportNo: extracted.reportNo || `RPT-${randomStr}`,
                  date: extracted.date || todayStr,
                  location: extracted.location || '',
                  department: extracted.department || '',
                  observerName: extracted.observerName || '',
                  riskLevel: ['low', 'medium', 'high', 'critical'].includes(extracted.riskLevel) ? extracted.riskLevel : 'medium',
                  observationDescription: extracted.observationDescription || '',
                  correctiveAction: extracted.correctiveAction || '',
                });
                toast({ title: isAr ? 'تم التحليل الذكي بنجاح' : 'AI Analysis Complete', description: isAr ? 'تم استخراج البيانات باستخدام الذكاء الاصطناعي' : 'Data extracted using AI' });
              }
            } catch {
              // Fallback to default values
              setDefaultFormValues();
            }
          } else {
            setDefaultFormValues();
          }
        } catch {
          setDefaultFormValues();
        }
      } else {
        setDefaultFormValues();
      }

      const mockUrl = URL.createObjectURL(file);
      setUploadedFile({ url: mockUrl, filename: file.name });
      setStep('review');
    } catch (err: any) {
      toast({ title: isAr ? 'فشل التحليل' : 'Analysis Failed', description: err.message, variant: 'destructive' });
      setStep('upload');
    }
  }, [isAr, toast, setDefaultFormValues]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Create local object URL for the image
      const imageUrl = URL.createObjectURL(file);
      const newImages = [...images];
      newImages[idx] = imageUrl;
      setImages(newImages);
      toast({ title: isAr ? 'تم رفع الصورة' : 'Image uploaded' });
    } catch {
      toast({ title: isAr ? 'فشل رفع الصورة' : 'Image upload failed', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    try {
      await addSafetyReport({
        ...form,
        createdBy: currentUserId,
        sourceFile: uploadedFile?.url,
        sourceMetadata: { filename: uploadedFile?.filename, extractedAt: new Date().toISOString() },
        image1: images[0],
        image2: images[1],
        image3: images[2],
        image4: images[3],
      });
      toast({ title: isAr ? 'تم حفظ التقرير' : 'Report Saved' });
      onOpenChange(false);
    } catch {
      toast({ title: isAr ? 'فشل الحفظ' : 'Save Failed', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100%-1rem)] sm:w-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <FileSearch className="h-5 w-5" />
            {isAr ? 'رفع وتحليل ملف' : 'Upload & Analyze File'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && (isAr ? 'ارفع ملف PDF لاستخراج بيانات التقرير تلقائياً' : 'Upload a PDF file to auto-extract report data')}
            {step === 'analyzing' && (isAr ? 'جاري تحليل الملف...' : 'Analyzing file...')}
            {step === 'review' && (isAr ? 'راجع البيانات المستخرجة وعدّلها قبل الحفظ' : 'Review and edit extracted data before saving')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            data-testid="dropzone-upload-pdf"
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">{isAr ? 'اسحب ملف PDF هنا أو انقر للتصفح' : 'Drag & drop a PDF here, or click to browse'}</p>
            <p className="text-sm text-muted-foreground">{isAr ? 'PDF فقط، الحد الأقصى 10 ميغابايت' : 'PDF only, max 10MB'}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </div>
        )}

        {step === 'analyzing' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">{isAr ? 'جاري تحليل الملف...' : 'Analyzing file...'}</p>
            <p className="text-sm text-muted-foreground">{uploadedFile?.filename}</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 border p-3 flex items-center gap-3">
              <FileBarChart className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile?.filename}</p>
                <p className="text-xs text-muted-foreground">{isAr ? 'تم التحليل بنجاح' : 'Analysis complete'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? 'التاريخ' : 'Date'}</Label>
                <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-upload-date" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الوقت' : 'Time'}</Label>
                <Input type="time" value={form.time || ''} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الموقع' : 'Location'}</Label>
                <Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'القسم' : 'Department'}</Label>
                <Input value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'اسم المراقب' : 'Observer Name'}</Label>
                <Input value={form.observerName || ''} onChange={(e) => setForm({ ...form, observerName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الفئة' : 'Category'}</Label>
                <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'مستوى الخطر' : 'Risk Level'}</Label>
                <Select value={form.riskLevel || 'low'} onValueChange={(v) => setForm({ ...form, riskLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="critical">{isAr ? 'حرج' : 'Critical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الحالة' : 'Status'}</Label>
                <Select value={form.status || 'open'} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{isAr ? 'مفتوح' : 'Open'}</SelectItem>
                    <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                    <SelectItem value="closed">{isAr ? 'مغلق' : 'Closed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'وصف الملاحظة' : 'Observation Description'}</Label>
              <Textarea value={form.observationDescription || ''} onChange={(e) => setForm({ ...form, observationDescription: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}</Label>
              <Textarea value={form.correctiveAction || ''} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>{isAr ? 'الصور' : 'Images'}</Label>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx} className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                    {images[idx] ? (
                      <>
                        <img src={images[idx]!} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => { const n = [...images]; n[idx] = null; setImages(n); }}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-[10px]">{idx + 1}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={!form.date} data-testid="button-save-uploaded-report">
                {isAr ? 'حفظ التقرير' : 'Save Report'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SafetyReportFormDialog({
  open, onOpenChange, editingReport, isAr, addSafetyReport, updateSafetyReport, currentUserId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReport: SafetyReport | null;
  isAr: boolean;
  addSafetyReport: (data: any) => Promise<SafetyReport>;
  updateSafetyReport: (id: string, data: any) => Promise<void>;
  currentUserId: string;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    department: '',
    observerName: '',
    riskLevel: 'low',
    category: '',
    status: 'open',
    observationDescription: '',
    correctiveAction: '',
  });
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);

  const [prevEditing, setPrevEditing] = useState<SafetyReport | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen || editingReport !== prevEditing) {
    setPrevOpen(open);
    setPrevEditing(editingReport);
    if (open) {
      if (editingReport) {
        setForm({
          date: editingReport.date,
          time: editingReport.time || '',
          location: editingReport.location || '',
          department: editingReport.department || '',
          observerName: editingReport.observerName || '',
          riskLevel: editingReport.riskLevel,
          category: editingReport.category || '',
          status: editingReport.status,
          observationDescription: editingReport.observationDescription || '',
          correctiveAction: editingReport.correctiveAction || '',
        });
        setImages([editingReport.image1 || null, editingReport.image2 || null, editingReport.image3 || null, editingReport.image4 || null]);
      } else {
        setForm({
          date: new Date().toISOString().split('T')[0],
          time: '', location: '', department: '', observerName: '',
          riskLevel: 'low', category: '', status: 'open',
          observationDescription: '', correctiveAction: '',
        });
        setImages([null, null, null, null]);
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Create local object URL for the image
      const imageUrl = URL.createObjectURL(file);
      const newImages = [...images];
      newImages[idx] = imageUrl;
      setImages(newImages);
      toast({ title: isAr ? 'تم رفع الصورة' : 'Image uploaded' });
    } catch {
      toast({ title: isAr ? 'فشل رفع الصورة' : 'Image upload failed', variant: 'destructive' });
    }
  };

  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      const payload = { ...form, image1: images[0], image2: images[1], image3: images[2], image4: images[3] };
      if (editingReport) {
        await updateSafetyReport(editingReport.id, payload);
      } else {
        await addSafetyReport({ ...payload, createdBy: currentUserId });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isAr ? 'فشل في حفظ التقرير' : 'Failed to save report', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingReport ? (isAr ? 'تعديل تقرير السلامة' : 'Edit Safety Report') : (isAr ? 'تقرير سلامة جديد' : 'New Safety Report')}
          </DialogTitle>
          <DialogDescription>
            {isAr ? 'أدخل بيانات الملاحظة' : 'Enter observation details'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{isAr ? 'التاريخ' : 'Date'}</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-report-date" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'الوقت' : 'Time'}</Label>
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} data-testid="input-report-time" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'الموقع' : 'Location'}</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={isAr ? 'مثال: المنطقة أ' : 'e.g., Zone A'} data-testid="input-report-location" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'القسم' : 'Department'}</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} data-testid="input-report-department" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'اسم المراقب' : 'Observer Name'}</Label>
            <Input value={form.observerName} onChange={(e) => setForm({ ...form, observerName: e.target.value })} data-testid="input-report-observer" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'الفئة' : 'Category'}</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={isAr ? 'مثال: كهرباء، سقالات' : 'e.g., Electrical, Scaffolding'} data-testid="input-report-category" />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'مستوى الخطر' : 'Risk Level'}</Label>
            <Select value={form.riskLevel} onValueChange={(v) => setForm({ ...form, riskLevel: v })}>
              <SelectTrigger data-testid="select-risk-level"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{isAr ? 'منخفض' : 'Low'}</SelectItem>
                <SelectItem value="medium">{isAr ? 'متوسط' : 'Medium'}</SelectItem>
                <SelectItem value="high">{isAr ? 'عالي' : 'High'}</SelectItem>
                <SelectItem value="critical">{isAr ? 'حرج' : 'Critical'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'الحالة' : 'Status'}</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{isAr ? 'مفتوح' : 'Open'}</SelectItem>
                <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                <SelectItem value="closed">{isAr ? 'مغلق' : 'Closed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{isAr ? 'وصف الملاحظة' : 'Observation Description'}</Label>
          <Textarea value={form.observationDescription} onChange={(e) => setForm({ ...form, observationDescription: e.target.value })} rows={3} data-testid="textarea-observation" />
        </div>
        <div className="space-y-2">
          <Label>{isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}</Label>
          <Textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={3} data-testid="textarea-corrective-action" />
        </div>
        <div className="space-y-2">
          <Label>{isAr ? 'الصور' : 'Images'}</Label>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(idx => (
              <div key={idx} className="relative aspect-square rounded-lg border-2 border-dashed border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                {images[idx] ? (
                  <>
                    <img src={images[idx]!} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => { const n = [...images]; n[idx] = null; setImages(n); }}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-[10px]">{idx + 1}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={!form.date} data-testid="button-submit-report">
            {editingReport ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إنشاء' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SafetyReportPreviewDialog({
  report, onClose, isAr, reportSettings, getPublicUrl, onCopyLink, onPrint, printRef
}: {
  report: SafetyReport | null;
  onClose: () => void;
  isAr: boolean;
  reportSettings: any;
  getPublicUrl: (id: string) => string;
  onCopyLink: (r: SafetyReport) => void;
  onPrint: () => void;
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!report) return null;
  const publicUrl = getPublicUrl(report.id);
  const images = [report.image1, report.image2, report.image3, report.image4].filter(Boolean);
  const riskLabel = ({ low: isAr ? 'منخفض' : 'Low', medium: isAr ? 'متوسط' : 'Medium', high: isAr ? 'عالي' : 'High', critical: isAr ? 'حرج' : 'Critical' } as Record<string, string>)[report.riskLevel] || report.riskLevel;
  const statusLabel = ({ open: isAr ? 'مفتوح' : 'Open', in_progress: isAr ? 'قيد التنفيذ' : 'In Progress', closed: isAr ? 'مغلق' : 'Closed' } as Record<string, string>)[report.status] || report.status;

  const riskBg: Record<string, string> = {
    low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
  };

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[920px] w-[calc(100%-1rem)] sm:w-auto max-h-[95vh] overflow-y-auto p-0 rounded-2xl border-border/40">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-emerald-600 border-b border-teal-500/40 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <span className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center ring-1 ring-white/30">
                <FileText className="h-4 w-4 text-white" />
              </span>
              <span className="text-white">
              {isAr ? 'معاينة التقرير / A4' : 'Report Preview / A4'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-teal-100 font-mono">{report.reportNo}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => onCopyLink(report)} className="flex-1 sm:flex-none bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white" data-testid="button-copy-link-preview">
              <Copy className="h-4 w-4 me-1" />
              {isAr ? 'نسخ الرابط' : 'Copy Link'}
            </Button>
            <Button size="sm" onClick={onPrint} className="flex-1 sm:flex-none bg-white text-teal-700 hover:bg-teal-50" data-testid="button-print-preview">
              <Printer className="h-4 w-4 me-1" />
              {isAr ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider"><Calendar className="h-3.5 w-3.5" />{isAr ? 'التاريخ' : 'Date'}</div>
              <p className="mt-1 text-sm font-semibold">{report.date || '-'}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider"><MapPin className="h-3.5 w-3.5" />{isAr ? 'الموقع' : 'Location'}</div>
              <p className="mt-1 text-sm font-semibold truncate">{report.location || '-'}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider"><ShieldAlert className="h-3.5 w-3.5" />{isAr ? 'الخطر' : 'Risk'}</div>
              <p className="mt-1 text-sm font-semibold">{riskLabel}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider"><Activity className="h-3.5 w-3.5" />{isAr ? 'الحالة' : 'Status'}</div>
              <p className="mt-1 text-sm font-semibold">{statusLabel}</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl border border-border/30 p-4 mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'رابط التقرير العام' : 'Public Report Link'}</p>
              <p className="text-sm font-mono truncate">{publicUrl}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onCopyLink(report)} className="rounded-lg">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={printRef}
            className="bg-white text-black mx-auto border shadow-sm"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '10mm', 
              fontFamily: isAr 
                ? "'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" 
                : "Arial, sans-serif",
              direction: isAr ? 'rtl' : 'ltr',
              textAlign: isAr ? 'right' : 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e3a5f', paddingBottom: '8px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a5f' }}>{reportSettings.companyName || 'ABDULKAREM SAFETY BOARD'}</div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '2px' }}>{reportSettings.templateTitle || 'Safety Observation Report'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '4px' }}>{report.reportNo}</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', padding: '4px', width: '88px' }}>
                  <QRCodeSVG value={publicUrl} size={78} level="M" includeMargin />
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold', width: '20%' }}>
                    {isAr ? 'التاريخ / Date' : 'Date / التاريخ'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', width: '30%' }}>{report.date}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold', width: '20%' }}>
                    {isAr ? 'الوقت / Time' : 'Time / الوقت'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', width: '30%' }}>{report.time || '-'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'الموقع / Location' : 'Location / الموقع'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{report.location || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'القسم / Dept' : 'Dept / القسم'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{report.department || '-'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'المراقب / Observer' : 'Observer / المراقب'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{report.observerName || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'الفئة / Category' : 'Category / الفئة'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{report.category || '-'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'مستوى الخطر / Risk' : 'Risk Level / مستوى الخطر'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '3px', color: '#fff', backgroundColor: riskBg[report.riskLevel] || '#888', fontSize: '10px', fontWeight: 'bold' }}>
                      {report.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', backgroundColor: '#f0f4f8', fontWeight: 'bold' }}>
                    {isAr ? 'الحالة / Status' : 'Status / الحالة'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 'bold' }}>{report.status.toUpperCase()}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ border: '1px solid #ccc', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '5px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                {isAr ? 'وصف الملاحظة / Observation Description' : 'Observation Description / وصف الملاحظة'}
              </div>
              <div style={{ padding: '8px', fontSize: '11px', minHeight: '50px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {report.observationDescription || '-'}
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '5px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                {isAr ? 'الإجراء التصحيحي / Corrective Action' : 'Corrective Action / الإجراء التصحيحي'}
              </div>
              <div style={{ padding: '8px', fontSize: '11px', minHeight: '50px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {report.correctiveAction || '-'}
              </div>
            </div>

            {images.length > 0 && (
              <div style={{ border: '1px solid #ccc', marginBottom: '10px' }}>
                <div style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '5px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                  {isAr ? 'الصور / Images' : 'Images / الصور'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '8px' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ border: '1px solid #ddd', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
                      {images[i] ? (
                        <img src={images[i]!} alt={`Image ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '10px', color: '#ccc' }}>Image {i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '2px solid #1e3a5f', paddingTop: '6px', textAlign: 'center', fontSize: '9px', color: '#999' }}>
              <p>{reportSettings.companyName || 'ABDULKAREM SAFETY BOARD'} - {reportSettings.templateTitle || 'Safety Observation Report'}</p>
              <p>{isAr ? 'تم الإنشاء' : 'Created'}: {report.createdAt} | {isAr ? 'رابط التقرير' : 'Report Link'}: {publicUrl}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversalFileViewer } from "@/components/universal-file-viewer";
import { DocumentThumbnail, detectFileType } from "@/components/document-thumbnail";
import {
  FolderOpen, Upload, Search, File, Image, FileText,
  FileSpreadsheet, Trash2, Download, MoreHorizontal, Eye,
  Printer, X, LayoutGrid, List, HardDrive
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ViewMode = "grid" | "list";
type FilterType = "all" | "image" | "pdf" | "spreadsheet" | "document" | "word" | "powerpoint";

interface FileItem {
  id: string;
  name: string;
  type: string;        // "image" | "pdf" | "spreadsheet" | "document" | "word" | "powerpoint"
  mimeType?: string;   // raw MIME from the File API
  size: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
  thumbnail?: string;
}

// ── In-system print (no new tab) ─────────────────────
function printInSystem(url: string, type: string, name: string) {
  // Remove existing print iframe if any to prevent memory leaks
  const existingIframe = document.getElementById('unified-print-iframe-files');
  if (existingIframe) {
    try { existingIframe.parentNode?.removeChild(existingIframe); } catch (err) { console.debug(err); }
  }

  const iframe = document.createElement("iframe");
  iframe.id = 'unified-print-iframe-files';
  iframe.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;width:1024px;height:1024px;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  if (type === "image") {
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
      img{max-width:100%;max-height:100vh;object-fit:contain;page-break-inside:avoid}
      @page{margin:8mm}
    </style><title>${name}</title></head>
    <body><img src="${url}" /></body></html>`);
    doc.close();
    
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) { console.debug(err); }
    }, 1000);
  } else {
    // PDF / other – load URL and call print()
    iframe.src = url;
    iframe.onload = () => {
      try {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 1000);
      } catch (err) { console.debug(err); }
    };
  }
}

// ── Shared action props for file cards ────────────────
interface FileActionProps {
  file: FileItem;
  isAr: boolean;
  typeBadgeStyle: string;
  typeLabel: string;
  fileIcon: React.ReactNode;
  onPreview: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

// ── Grid Card ─────────────────────────────────────────
function FileCard({ file, isAr, typeBadgeStyle, typeLabel, onPreview, onPrint, onDownload, onDelete }: FileActionProps) {
  return (
    <div className="group relative border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 bg-card hover:border-primary/30 flex flex-col">
      <div className="relative h-40 bg-muted/20 flex items-center justify-center cursor-pointer overflow-hidden p-2" onClick={onPreview}>
        <DocumentThumbnail
          fileName={file.name}
          fileType={file.type}
          mimeType={file.mimeType}
          thumbnailUrl={file.thumbnail}
          fileUrl={file.url}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onPreview}><Eye className="h-4 w-4 mr-2 text-blue-500" />{isAr ? "معاينة" : "Preview"}</DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}><Printer className="h-4 w-4 mr-2 text-slate-500" />{isAr ? "طباعة" : "Print"}</DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}><Download className="h-4 w-4 mr-2 text-emerald-500" />{isAr ? "تحميل" : "Download"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{isAr ? "حذف" : "Delete"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <p className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors" title={file.name} onClick={onPreview}>{file.name}</p>
          <div className="flex items-center justify-between mt-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadgeStyle}`}>{typeLabel}</Badge>
            <span className="text-xs text-muted-foreground">{file.size}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{file.uploadedAt}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onPreview}><Eye className="h-3 w-3" />{isAr ? "معاينة" : "Preview"}</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onDownload}><Download className="h-3 w-3" />{isAr ? "تحميل" : "Download"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── List Row ──────────────────────────────────────────
function FileListRow({ file, typeBadgeStyle, typeLabel, onPreview, onPrint, onDownload, onDelete }: Omit<FileActionProps, 'isAr' | 'fileIcon'>) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl border hover:bg-background hover:border-primary/20 transition-all duration-150">
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer" onClick={onPreview}>
        <DocumentThumbnail
          fileName={file.name}
          fileType={file.type}
          mimeType={file.mimeType}
          thumbnailUrl={file.thumbnail}
          fileUrl={file.url}
          className="w-full h-full"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate cursor-pointer hover:text-primary" title={file.name} onClick={onPreview}>{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${typeBadgeStyle}`}>{typeLabel}</Badge>
          <span className="text-xs text-muted-foreground">{file.size}</span>
          <span className="text-xs text-muted-foreground">· {file.uploadedAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPreview}><Eye className="h-4 w-4 text-blue-500" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrint}><Printer className="h-4 w-4 text-slate-500" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}><Download className="h-4 w-4 text-emerald-500" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function AdminFiles() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([
    { id: "1", name: "safety-manual.pdf",        type: "pdf",         size: "2.5 MB",  sizeBytes: 2621440, uploadedAt: "2024-01-15", url: "#" },
    { id: "2", name: "inspection-checklist.xlsx", type: "spreadsheet", size: "156 KB",  sizeBytes: 159744,  uploadedAt: "2024-01-16", url: "#" },
    { id: "3", name: "site-photo.jpg",            type: "image",       size: "3.2 MB",  sizeBytes: 3355443, uploadedAt: "2024-01-17", url: "#" },
    { id: "4", name: "contract-template.docx",    type: "document",    size: "45 KB",   sizeBytes: 46080,   uploadedAt: "2024-01-18", url: "#" },
  ]);

  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterType,   setFilterType]   = useState<FilterType>("all");
  const [viewMode,     setViewMode]     = useState<ViewMode>("grid");
  const [previewFile,  setPreviewFile]  = useState<FileItem | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [uploading,    setUploading]    = useState(false);

  const processFiles = useCallback((fileList: FileList) => {
    setUploading(true);
    const newFiles: FileItem[] = Array.from(fileList).map((file) => {
      const url = URL.createObjectURL(file);
      const computedType = detectFileType(file.name, file.type);
      const isImage = computedType === "image";
      return {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: computedType,
        size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString().split("T")[0],
        url,
        thumbnail: isImage ? url : undefined,
      };
    });
    setFiles((prev) => [...newFiles, ...prev]);
    setTimeout(() => setUploading(false), 600);
    toast.success(isAr ? `تم رفع ${fileList.length} ملف بنجاح` : `${fileList.length} file(s) uploaded successfully`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isAr]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
    toast.success(isAr ? "تم حذف الملف" : "File deleted");
  };

  const handleDownload = (file: FileItem) => {
    if (file.url && file.url !== "#") {
      const a = document.createElement("a");
      a.href = file.url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.parentNode?.removeChild(a);
    } else {
      toast.info(isAr ? "الملف غير متاح للتحميل" : "File not available for download");
    }
  };

  const handlePrint = useCallback((file: FileItem) => {
    if (!file.url || file.url === "#") {
      toast.error(isAr ? "لا يمكن طباعة هذا الملف (لا يوجد رابط)" : "Cannot print: file has no URL");
      return;
    }
    toast.info(isAr ? "جاري إعداد الطباعة..." : "Preparing print...", { duration: 2000 });
    printInSystem(file.url, file.type, file.name);
  }, [isAr]);

  const getFileIcon = (type: string, sz: "sm" | "md" | "lg" = "md") => {
    const s = sz === "lg" ? "h-12 w-12" : sz === "sm" ? "h-5 w-5" : "h-9 w-9";
    if (type === "image")       return <Image className={`${s} text-purple-500`} />;
    if (type === "pdf")         return <FileText className={`${s} text-red-500`} />;
    if (type === "spreadsheet") return <FileSpreadsheet className={`${s} text-emerald-500`} />;
    return <File className={`${s} text-blue-500`} />;
  };

  const getTypeBadgeStyle = (type: string) => {
    if (type === "image")       return "bg-purple-50 text-purple-700 border-purple-200";
    if (type === "pdf")         return "bg-red-50 text-red-700 border-red-200";
    if (type === "spreadsheet") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getFileTypeLabel = (type: string) => {
    const m: Record<string, { ar: string; en: string }> = {
      image: { ar: "صورة", en: "Image" }, pdf: { ar: "PDF", en: "PDF" },
      spreadsheet: { ar: "جدول", en: "Spreadsheet" }, document: { ar: "مستند", en: "Document" },
    };
    return m[type]?.[isAr ? "ar" : "en"] || type;
  };

  const filteredFiles = files.filter(
    (f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()) && (filterType === "all" || f.type === filterType)
  );

  const counts: Record<FilterType, number> = {
    all: files.length,
    image: files.filter((f) => f.type === "image").length,
    pdf: files.filter((f) => f.type === "pdf").length,
    spreadsheet: files.filter((f) => f.type === "spreadsheet").length,
    document: files.filter((f) => f.type === "document").length,
    word: files.filter((f) => f.type === "word").length,
    powerpoint: files.filter((f) => f.type === "powerpoint").length,
  };
  const totalBytes = files.reduce((a, f) => a + f.sizeBytes, 0);
  const totalSize = totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(0)} KB` : `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all",         label: isAr ? "الكل" : "All" },
    { key: "image",       label: isAr ? "صور" : "Images" },
    { key: "pdf",         label: "PDF" },
    { key: "spreadsheet", label: isAr ? "جداول" : "Sheets" },
    { key: "document",    label: isAr ? "مستندات" : "Docs" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            {isAr ? "الملفات" : "Files"}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">{isAr ? "إدارة الملفات والمستندات" : "Manage files and documents"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar" />
          <Button className="gap-2 text-[12px]" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />{isAr ? "رفع ملف" : "Upload File"}
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isAr ? "إجمالي الملفات" : "Total Files", value: files.length, icon: <FolderOpen className="h-[18px] w-[18px] text-blue-500" />, bg: "bg-blue-50 border-blue-200" },
          { label: isAr ? "الصور" : "Images",      value: counts.image, icon: <Image className="h-[18px] w-[18px] text-purple-500" />,  bg: "bg-purple-50 border-purple-200" },
          { label: isAr ? "ملفات PDF" : "PDFs",    value: counts.pdf,   icon: <FileText className="h-[18px] w-[18px] text-red-500" />,  bg: "bg-red-50 border-red-200" },
          { label: isAr ? "الحجم الكلي" : "Total", value: totalSize,    icon: <HardDrive className="h-[18px] w-[18px] text-slate-500" />, bg:"bg-slate-50 border-slate-200" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border ${s.bg}`}>
            <div className="p-2 rounded-lg bg-white shadow-sm">{s.icon}</div>
            <div>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-[17px] font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Drop Zone ── */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
          ${dragOver ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-lg" : "border-border hover:border-blue-400 hover:bg-background"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-blue-600">{isAr ? "جاري الرفع..." : "Uploading..."}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full transition-colors ${dragOver ? "bg-blue-100" : "bg-muted"}`}>
              <Upload className={`h-6 w-6 ${dragOver ? "text-blue-600" : "text-muted-foreground"}`} />
            </div>
            <p className="font-medium text-sm">{dragOver ? (isAr ? "اتركها هنا" : "Drop to upload") : (isAr ? "اسحب ملفاتك هنا أو انقر للرفع" : "Drag & drop files here or click to browse")}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "PDF، Word، Excel، صور وأكثر" : "PDF, Word, Excel, Images and more"}</p>
          </div>
        )}
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={isAr ? "بحث في الملفات..." : "Search files..."} className="ps-10 text-[12px]"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {filterTabs.map((tab) => (
            <Button key={tab.key} variant={filterType === tab.key ? "default" : "outline"} size="sm" className="gap-1.5 h-9"
              onClick={() => setFilterType(tab.key)}>
              {tab.label}
              {counts[tab.key] > 0 && (
                <Badge variant="secondary" className={`ml-1 text-[10px] h-4 px-1 ${filterType === tab.key ? "bg-white/20 text-white" : ""}`}>
                  {counts[tab.key]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Files ── */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px]">{isAr ? "قائمة الملفات" : "Files List"}</CardTitle>
            <p className="text-[12px] text-muted-foreground">{filteredFiles.length} {isAr ? "ملف" : "file(s)"}</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{searchQuery ? (isAr ? "لا توجد نتائج" : "No results found") : (isAr ? "لا توجد ملفات" : "No files yet")}</p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4 gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />{isAr ? "رفع ملف" : "Upload File"}
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <FileCard key={file.id} file={file} isAr={isAr}
                  typeBadgeStyle={getTypeBadgeStyle(file.type)} typeLabel={getFileTypeLabel(file.type)}
                  fileIcon={getFileIcon(file.type)}
                  onPreview={() => setPreviewFile(file)} onPrint={() => handlePrint(file)}
                  onDownload={() => handleDownload(file)} onDelete={() => handleDeleteFile(file.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <FileListRow key={file.id} file={file}
                  typeBadgeStyle={getTypeBadgeStyle(file.type)} typeLabel={getFileTypeLabel(file.type)}
                  onPreview={() => setPreviewFile(file)} onPrint={() => handlePrint(file)}
                  onDownload={() => handleDownload(file)} onDelete={() => handleDeleteFile(file.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Preview Dialog ── */}
      <Dialog
        open={!!previewFile}
        onOpenChange={() => setPreviewFile(null)}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 pr-8">
              {getFileIcon(previewFile?.type || "document", "sm")}
              <span className="truncate text-sm font-semibold">{previewFile?.name}</span>
              <Badge variant="outline" className={`ml-auto flex-shrink-0 text-xs ${getTypeBadgeStyle(previewFile?.type || "")}`}>
                {getFileTypeLabel(previewFile?.type || "")}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 min-h-0 bg-background">
            {previewFile && (
              <UniversalFileViewer
                fileName={previewFile.name}
                fileUrl={previewFile.url}
                thumbnailUrl={previewFile.thumbnail}
                fileType={previewFile.type}
                mimeType={previewFile.mimeType}
                fileSize={previewFile.size}
                isAr={isAr}
                onDownload={() => handleDownload(previewFile)}
                onPrint={() => handlePrint(previewFile)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t bg-background">
            <p className="text-xs text-muted-foreground">
              {isAr ? "الحجم:" : "Size:"} {previewFile?.size}
              {previewFile?.uploadedAt && <> · {isAr ? "الرفع:" : "Uploaded:"} {previewFile?.uploadedAt}</>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
                {isAr ? "إغلاق" : "Close"}
              </Button>
              {previewFile?.url && previewFile.url !== "#" && (
                <>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => previewFile && handleDownload(previewFile)}>
                    <Download className="h-4 w-4" />{isAr ? "تحميل" : "Download"}
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => previewFile && handlePrint(previewFile)}>
                    <Printer className="h-4 w-4" />{isAr ? "طباعة" : "Print"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

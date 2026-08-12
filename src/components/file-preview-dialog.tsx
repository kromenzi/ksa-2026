import { useCallback } from "react";
import { useData } from "@/lib/data-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UniversalFileViewer } from "@/components/universal-file-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Printer,
  Share2,
  Brain,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
} from "lucide-react";

export interface FilePreviewItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  fileSize?: number;
  previewUrl: string;
  downloadUrl: string;
  viewUrl?: string;
  createdAt?: string;
  section: "files" | "documents" | "reports" | "ncr" | "forms";
}

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FilePreviewItem | null;
  onAnalyze?: (file: FilePreviewItem) => void;
  onDelete?: (file: FilePreviewItem) => void;
  showAnalyze?: boolean;
  showDelete?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

export function getFileIcon(mimeType: string) {
  if (isImageFile(mimeType)) {
    return <FileImage className="h-5 w-5 text-purple-600" />;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (
    isPdfFile(mimeType) ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  ) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  return <File className="h-5 w-5 text-gray-600" />;
}

export function isOfficeFile(mimeType: string): boolean {
  return (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("officedocument") ||
    mimeType.includes("msword") ||
    mimeType.includes("ms-excel") ||
    mimeType.includes("ms-powerpoint")
  );
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType.includes("pdf");
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  files: { en: "Files", ar: "الملفات" },
  documents: { en: "Documents", ar: "المستندات" },
  reports: { en: "Reports", ar: "التقارير" },
  ncr: { en: "NCR", ar: "عدم المطابقة" },
  forms: { en: "Forms", ar: "النماذج" },
};

export default function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  onAnalyze,
  onDelete,
  showAnalyze = false,
  showDelete = false,
}: FilePreviewDialogProps) {
  const { settings } = useData();
  const { toast } = useToast();
  const isAr = settings.language === "ar";

  const handleDownload = useCallback(() => {
    if (!file) return;
    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = file.originalName;
    link.click();
  }, [file]);

  const handlePrint = useCallback(() => {
    if (!file) return;
    const url = file.viewUrl || file.previewUrl;
    
    // Remove existing print iframe if any to prevent memory leaks
    const existingIframe = document.getElementById('unified-print-iframe-file-preview');
    if (existingIframe) {
      try { existingIframe.parentNode?.removeChild(existingIframe); } catch (err) { console.debug(err); }
    }

    const iframe = document.createElement("iframe");
    iframe.id = 'unified-print-iframe-file-preview';
    iframe.style.cssText =
      "position:absolute;top:-9999px;left:-9999px;width:1024px;height:1024px;border:0;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);

    if (isImageFile(file.mimeType)) {
      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
        img{max-width:100%;max-height:100vh;object-fit:contain;page-break-inside:avoid}
        @page{margin:8mm}
      </style><title>${file.name}</title></head>
      <body><img src="${url}" /></body></html>`);
      doc.close();
      
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) { console.debug(err); }
      }, 1000);
    } else {
      iframe.src = url;
      iframe.onload = () => {
        try {
          setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 1000);
        } catch (err) { console.debug(err); }
      };
    }
  }, [file]);

  const handleShare = useCallback(() => {
    if (!file) return;
    const sectionLabel = isAr
      ? SECTION_LABELS[file.section]?.ar || file.section
      : SECTION_LABELS[file.section]?.en || file.section;
    const sizeText = file.fileSize ? ` (${formatFileSize(file.fileSize)})` : "";
    const text = isAr
      ? `${file.name} - ${sectionLabel}${sizeText}`
      : `${file.name} - ${sectionLabel}${sizeText}`;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: isAr ? "تم النسخ" : "Copied to Clipboard",
        description: isAr
          ? "تم نسخ معلومات الملف إلى الحافظة"
          : "File info copied to clipboard",
      });
    });
  }, [file, isAr, toast]);

  const handleAnalyze = useCallback(() => {
    if (!file || !onAnalyze) return;
    onAnalyze(file);
  }, [file, onAnalyze]);

  const handleDelete = useCallback(() => {
    if (!file || !onDelete) return;
    onDelete(file);
  }, [file, onDelete]);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      onOpenChange(val);
    },
    [onOpenChange]
  );

  if (!file) return null;

  const isImage = isImageFile(file.mimeType);
  const previewSrc = isImage ? file.viewUrl || file.previewUrl : file.previewUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-auto flex flex-col p-3 sm:p-6"
        data-testid="file-preview-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            {getFileIcon(file.mimeType)}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" data-testid="text-preview-filename">
                {file.name}
              </p>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-normal mt-0.5">
                <span className="truncate" data-testid="text-preview-original-name">
                  {file.originalName}
                </span>
                {file.fileSize != null && file.fileSize > 0 && (
                  <span data-testid="text-preview-filesize">
                    {formatFileSize(file.fileSize)}
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 rounded-lg overflow-hidden my-2">
          <UniversalFileViewer
            fileName={file.name}
            fileUrl={previewSrc}
            mimeType={file.mimeType}
            fileSize={file.fileSize ? formatFileSize(file.fileSize) : undefined}
            isAr={isAr}
            onDownload={handleDownload}
            onPrint={handlePrint}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <Button
            variant="outline"
            onClick={handleDownload}
            data-testid="button-preview-download"
          >
            <Download className="h-4 w-4 me-2" />
            {isAr ? "تحميل" : "Download"}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            data-testid="button-preview-print"
          >
            <Printer className="h-4 w-4 me-2" />
            {isAr ? "طباعة" : "Print"}
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            data-testid="button-preview-share"
          >
            <Share2 className="h-4 w-4 me-2" />
            {isAr ? "مشاركة" : "Share"}
          </Button>
          {showAnalyze && onAnalyze && (
            <Button
              variant="outline"
              onClick={handleAnalyze}
              data-testid="button-preview-analyze"
            >
              <Brain className="h-4 w-4 me-2" />
              {isAr ? "تحليل" : "Analyze"}
            </Button>
          )}
          <div className="flex-1" />
          {showDelete && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              data-testid="button-preview-delete"
            >
              <Trash2 className="h-4 w-4 me-2" />
              {isAr ? "حذف" : "Delete"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

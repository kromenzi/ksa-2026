import { useState, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  Download,
  Printer,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  File,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectFileType, getFileTypeInfo } from "@/components/document-thumbnail";
import { cn } from "@/lib/utils";

interface UniversalFileViewerProps {
  fileName: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileType?: string;
  fileSize?: string | number;
  className?: string;
  isAr?: boolean;
  onDownload?: () => void;
  onPrint?: () => void;
}

export function UniversalFileViewer({
  fileName,
  fileUrl,
  thumbnailUrl,
  mimeType,
  fileType,
  fileSize,
  className,
  isAr = true,
  onDownload,
  onPrint,
}: UniversalFileViewerProps) {
  const computedType = detectFileType(fileName, mimeType || fileType);
  const typeInfo = getFileTypeInfo(computedType);

  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotate, setImgRotate] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const rawUrl = fileUrl || thumbnailUrl;
  const hasValidUrl = rawUrl && rawUrl !== "#";

  const isImage = computedType === "image";
  const isPdf = computedType === "pdf";
  const isWord = computedType === "word";
  const isExcel = computedType === "spreadsheet";
  const isPpt = computedType === "powerpoint";

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const isTextFile = ["txt", "csv", "json", "md", "xml", "html", "js", "ts", "css", "log"].includes(ext);

  // If text file, try to fetch content
  useEffect(() => {
    if (isTextFile && hasValidUrl && rawUrl) {
      fetch(rawUrl)
        .then((res) => res.text())
        .then((txt) => {
          setTextContent(txt);
        })
        .catch(() => {
          setTextContent(null);
        });
    }
  }, [isTextFile, hasValidUrl, rawUrl]);

  const handleDownloadAction = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (hasValidUrl && rawUrl) {
      const a = document.createElement("a");
      a.href = rawUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.parentNode?.removeChild(a);
    }
  };

  const handleOpenNewTab = () => {
    if (hasValidUrl && rawUrl) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render Image Viewer
  if (isImage) {
    const imageSrc = rawUrl || thumbnailUrl;
    return (
      <div className={cn("flex flex-col h-full bg-slate-950/5 dark:bg-slate-950/40 rounded-lg overflow-hidden border", className)}>
        {/* Controls toolbar */}
        <div className="flex items-center justify-between gap-2 p-2 bg-background/80 backdrop-blur border-b text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setImgZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
              title={isAr ? "تصغير" : "Zoom out"}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-xs w-12 text-center">{Math.round(imgZoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setImgZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
              title={isAr ? "تكبير" : "Zoom in"}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setImgRotate((r) => (r + 90) % 360)}
              title={isAr ? "تدوير" : "Rotate"}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                setImgZoom(1);
                setImgRotate(0);
              }}
            >
              {isAr ? "إعادة ضبط" : "Reset"}
            </Button>
          </div>
          {hasValidUrl && (
            <div className="flex items-center gap-1 ms-auto">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleOpenNewTab}>
                <ExternalLink className="h-3 w-3" />
                {isAr ? "فتح بصورة كاملة" : "Open Full"}
              </Button>
            </div>
          )}
        </div>

        {/* Image Display */}
        <div className="flex-1 min-h-[350px] max-h-[60vh] overflow-auto flex items-center justify-center p-4">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={fileName}
              referrerPolicy="no-referrer"
              className="transition-transform duration-200 max-w-full max-h-[55vh] object-contain rounded-md shadow-sm"
              style={{
                transform: `scale(${imgZoom}) rotate(${imgRotate}deg)`,
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="text-center p-6 text-muted-foreground space-y-2">
              <ImageIcon className="h-12 w-12 mx-auto text-slate-400" />
              <p className="text-sm">{isAr ? "الصورة غير متوفرة" : "Image not available"}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render PDF Viewer
  if (isPdf && hasValidUrl && !pdfError) {
    return (
      <div className={cn("flex flex-col h-full bg-slate-900/5 dark:bg-slate-900/30 rounded-lg overflow-hidden border", className)}>
        {/* PDF Header Controls */}
        <div className="flex items-center justify-between p-2.5 bg-background border-b text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-xs">
              PDF
            </span>
            <span className="font-medium text-xs truncate max-w-[200px]">{fileName}</span>
          </div>
          <div className="flex items-center gap-1.5 ms-auto">
            {onPrint && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onPrint}>
                <Printer className="h-3.5 w-3.5" />
                {isAr ? "طباعة" : "Print"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadAction}>
              <Download className="h-3.5 w-3.5" />
              {isAr ? "تحميل" : "Download"}
            </Button>
            <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleOpenNewTab}>
              <ExternalLink className="h-3.5 w-3.5" />
              {isAr ? "فتح في نافذة مستقلة" : "Open in New Tab"}
            </Button>
          </div>
        </div>

        {/* Safe Object Container (Doesn't trigger Chrome iframe blob block) */}
        <div className="flex-1 min-h-[450px] h-[60vh] relative bg-slate-800">
          <object
            data={rawUrl}
            type="application/pdf"
            className="w-full h-full border-0 rounded-b-lg"
            onError={() => setPdfError(true)}
          >
            {/* Fallback inside object if browser PDF plugin fails */}
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white space-y-4">
              <FileText className="h-16 w-16 text-red-400 animate-pulse" />
              <div>
                <h4 className="text-base font-semibold">{fileName}</h4>
                <p className="text-xs text-slate-300 mt-1">
                  {isAr ? "يمكنك عرض مستند PDF بسهولة من خلال خيارات التحكم" : "You can easily view or download this PDF document"}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleOpenNewTab}>
                  <ExternalLink className="h-4 w-4" />
                  {isAr ? "فتح في نافذة كاملة" : "Open in New Window"}
                </Button>
                <Button variant="default" size="sm" className="gap-2 bg-red-600 hover:bg-red-700" onClick={handleDownloadAction}>
                  <Download className="h-4 w-4" />
                  {isAr ? "تحميل المستند" : "Download PDF"}
                </Button>
              </div>
            </div>
          </object>
        </div>
      </div>
    );
  }

  // Render Text / CSV / Code Viewer if text content is loaded
  if (isTextFile && textContent !== null) {
    return (
      <div className={cn("flex flex-col h-full bg-slate-950 text-slate-100 rounded-lg overflow-hidden border font-mono text-xs", className)}>
        <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-300 hover:text-white" onClick={handleCopyText}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-slate-700 bg-slate-800 text-slate-200" onClick={handleDownloadAction}>
              <Download className="h-3.5 w-3.5" />
              {isAr ? "تحميل" : "Download"}
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto max-h-[55vh] whitespace-pre-wrap leading-relaxed">
          {textContent || (isAr ? "(الملف فارغ)" : "(File is empty)")}
        </div>
      </div>
    );
  }

  // Fallback Styled Card for Word, Excel, PPTX, or General Documents
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 bg-card rounded-lg border text-center space-y-5 min-h-[380px]", className)}>
      <div className={cn("p-4 rounded-2xl border shadow-sm", typeInfo.bgColor, typeInfo.borderColor)}>
        {isWord ? (
          <FileText className={cn("h-16 w-16", typeInfo.color)} />
        ) : isExcel ? (
          <FileSpreadsheet className={cn("h-16 w-16", typeInfo.color)} />
        ) : isPpt ? (
          <Presentation className={cn("h-16 w-16", typeInfo.color)} />
        ) : isPdf ? (
          <FileText className="h-16 w-16 text-red-500" />
        ) : (
          <File className="h-16 w-16 text-slate-500" />
        )}
      </div>

      <div className="space-y-1.5 max-w-md">
        <Badge className={cn("text-xs font-bold px-2.5 py-0.5", typeInfo.badgeBg)}>
          {typeInfo.label}
        </Badge>
        <h3 className="text-base font-bold text-foreground truncate px-4" title={fileName}>
          {fileName}
        </h3>
        {fileSize && <p className="text-xs text-muted-foreground">{fileSize}</p>}
        <p className="text-xs text-muted-foreground pt-1">
          {isAr
            ? "المستند جاهز للتحميل والطباعة بشكل آمن وبأعلى جودة."
            : "Document is ready for safe high-quality viewing and download."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
        {hasValidUrl && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenNewTab}>
            <ExternalLink className="h-4 w-4" />
            {isAr ? "فتح المستند" : "Open File"}
          </Button>
        )}
        {onPrint && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة" : "Print"}
          </Button>
        )}
        {hasValidUrl && (
          <Button variant="default" size="sm" className="gap-2" onClick={handleDownloadAction}>
            <Download className="h-4 w-4" />
            {isAr ? "تحميل الملف" : "Download File"}
          </Button>
        )}
      </div>
    </div>
  );
}

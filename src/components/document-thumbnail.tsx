import { FileText, FileSpreadsheet, Presentation, File } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileTypeInfo {
  type: "image" | "pdf" | "word" | "powerpoint" | "spreadsheet" | "document";
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}

export function detectFileType(fileName: string, mimeType?: string): FileTypeInfo["type"] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
    return "image";
  }
  if (mimeType?.includes("pdf") || ext === "pdf") {
    return "pdf";
  }
  if (
    mimeType?.includes("word") ||
    mimeType?.includes("document") ||
    ["doc", "docx", "dot", "dotx"].includes(ext)
  ) {
    return "word";
  }
  if (
    mimeType?.includes("presentation") ||
    mimeType?.includes("powerpoint") ||
    ["ppt", "pptx", "pot", "potx"].includes(ext)
  ) {
    return "powerpoint";
  }
  if (
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("excel") ||
    mimeType?.includes("csv") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return "spreadsheet";
  }
  return "document";
}

export function getFileTypeInfo(type: FileTypeInfo["type"]): FileTypeInfo {
  switch (type) {
    case "image":
      return {
        type: "image",
        label: "PNG/JPG",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        badgeBg: "bg-purple-500 text-white",
      };
    case "pdf":
      return {
        type: "pdf",
        label: "PDF",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        badgeBg: "bg-red-600 text-white",
      };
    case "word":
      return {
        type: "word",
        label: "WORD",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        badgeBg: "bg-blue-600 text-white",
      };
    case "powerpoint":
      return {
        type: "powerpoint",
        label: "PPTX",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        badgeBg: "bg-amber-600 text-white",
      };
    case "spreadsheet":
      return {
        type: "spreadsheet",
        label: "EXCEL",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        badgeBg: "bg-emerald-600 text-white",
      };
    default:
      return {
        type: "document",
        label: "DOC",
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-500/10",
        borderColor: "border-slate-500/30",
        badgeBg: "bg-slate-700 text-white",
      };
  }
}

interface DocumentThumbnailProps {
  fileName: string;
  fileType?: string;
  mimeType?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "portrait";
  onClick?: () => void;
}

export function DocumentThumbnail({
  fileName,
  fileType,
  mimeType,
  thumbnailUrl,
  fileUrl,
  className,
  aspectRatio = "square",
  onClick,
}: DocumentThumbnailProps) {
  const computedType = detectFileType(fileName, mimeType || fileType);

  const isImage = computedType === "image";
  const imageSrc = thumbnailUrl || (isImage && fileUrl && fileUrl !== "#" ? fileUrl : null);

  const aspectClass =
    aspectRatio === "video" ? "aspect-video" : aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-square";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg border overflow-hidden transition-all duration-200 group flex items-center justify-center select-none bg-card",
        aspectClass,
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/40",
        className
      )}
    >
      {imageSrc ? (
        <div className="relative w-full h-full overflow-hidden bg-slate-950/5 dark:bg-slate-950/40">
          <img
            src={imageSrc}
            alt={fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // fallback if image blob fails
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-black/60 text-white backdrop-blur-sm shadow-sm">
            IMG
          </div>
        </div>
      ) : computedType === "pdf" ? (
        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-red-600 text-white shadow-sm">
              PDF
            </span>
            <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="my-auto space-y-1 py-1">
            <div className="h-1.5 bg-red-200 dark:bg-red-800/40 rounded w-full" />
            <div className="h-1.5 bg-red-200 dark:bg-red-800/40 rounded w-4/5" />
            <div className="h-1.5 bg-red-200 dark:bg-red-800/40 rounded w-2/3" />
          </div>
          <p className="text-[10px] font-medium text-red-900 dark:text-red-200 truncate leading-tight">
            {fileName}
          </p>
        </div>
      ) : computedType === "word" ? (
        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-blue-600 text-white shadow-sm">
              WORD
            </span>
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="my-auto space-y-1 py-1">
            <div className="h-1.5 bg-blue-200 dark:bg-blue-800/40 rounded w-full" />
            <div className="h-1.5 bg-blue-200 dark:bg-blue-800/40 rounded w-5/6" />
            <div className="h-1.5 bg-blue-200 dark:bg-blue-800/40 rounded w-3/4" />
          </div>
          <p className="text-[10px] font-medium text-blue-900 dark:text-blue-200 truncate leading-tight">
            {fileName}
          </p>
        </div>
      ) : computedType === "powerpoint" ? (
        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-amber-600 text-white shadow-sm">
              PPTX
            </span>
            <Presentation className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-auto border border-amber-300 dark:border-amber-700/50 rounded p-1 space-y-1 bg-white/50 dark:bg-black/20">
            <div className="h-2 bg-amber-200 dark:bg-amber-800/40 rounded w-1/2" />
            <div className="h-1 bg-amber-200/70 dark:bg-amber-800/20 rounded w-full" />
          </div>
          <p className="text-[10px] font-medium text-amber-900 dark:text-amber-200 truncate leading-tight">
            {fileName}
          </p>
        </div>
      ) : computedType === "spreadsheet" ? (
        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-emerald-600 text-white shadow-sm">
              EXCEL
            </span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-auto grid grid-cols-3 gap-0.5 p-1 border border-emerald-300 dark:border-emerald-700/50 rounded bg-white/50 dark:bg-black/20">
            <div className="h-1.5 bg-emerald-300 dark:bg-emerald-700/60 rounded-xs" />
            <div className="h-1.5 bg-emerald-200 dark:bg-emerald-800/40 rounded-xs" />
            <div className="h-1.5 bg-emerald-200 dark:bg-emerald-800/40 rounded-xs" />
            <div className="h-1.5 bg-emerald-200 dark:bg-emerald-800/40 rounded-xs" />
            <div className="h-1.5 bg-emerald-300 dark:bg-emerald-700/60 rounded-xs" />
            <div className="h-1.5 bg-emerald-200 dark:bg-emerald-800/40 rounded-xs" />
          </div>
          <p className="text-[10px] font-medium text-emerald-900 dark:text-emerald-200 truncate leading-tight">
            {fileName}
          </p>
        </div>
      ) : (
        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-slate-100 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-slate-700 text-white shadow-sm">
              DOC
            </span>
            <File className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="my-auto space-y-1 py-1">
            <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-full" />
            <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
          </div>
          <p className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">
            {fileName}
          </p>
        </div>
      )}
    </div>
  );
}

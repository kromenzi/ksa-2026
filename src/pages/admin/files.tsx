"use client";

import { useMemo, useState } from "react";
import { useData, type DocumentItem } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, FolderOpen, Plus, Search, Trash2, Eye, Download, Printer, Upload, X } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const emptyForm = {
  title: "",
  refNo: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  department: "",
  description: "",
  pdfUrl: "",
};

const formatBytes = (value?: number | null) => {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getExtension = (name?: string | null) => {
  const value = String(name || "");
  const index = value.lastIndexOf(".");
  return index > -1 && index < value.length - 1 ? value.slice(index + 1).toUpperCase() : "FILE";
};

export default function AdminFiles() {
  const {
    documents,
    addDocument,
    deleteDocument,
    settings,
    hasPermission,
  } = useData();

  const isAr = settings.language === "ar";
  const canCreate = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const visibleDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = documents.filter((doc) => !["contract", "invoice"].includes(String(doc.docType || "").toLowerCase()));
    if (!q) return rows;
    return rows.filter((doc) =>
      [doc.title, doc.refNo, doc.category, doc.department, doc.description, doc.docType, doc.metadata?.fileName, doc.metadata?.mimeType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [documents, search]);

  const resetCreateForm = () => {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setSelectedFile(null);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(isAr ? "حجم الملف يتجاوز الحد المسموح 50MB" : "File exceeds the 50MB upload limit");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setForm((previous) => ({
      ...previous,
      title: previous.title.trim() ? previous.title : file.name,
    }));
  };

  const requestStorageAction = async (action: string, payload: Record<string, unknown>) => {
    const response = await apiRequest("POST", `/api/system-health?resource=document-storage&action=${encodeURIComponent(action)}`, payload);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Storage request failed");
    return data;
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error(isAr ? "اسم المستند مطلوب" : "Document title is required");
      return;
    }
    setSaving(true);
    let storagePath: string | null = null;
    try {
      let storageMetadata: Record<string, unknown> = {};

      if (selectedFile) {
        const sign = await requestStorageAction("sign-upload", {
          fileName: selectedFile.name,
          fileType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
        });
        storagePath = String(sign.path || "");
        if (!storagePath || !sign.signedUrl) throw new Error(isAr ? "تعذر تجهيز مسار رفع الملف" : "Unable to prepare file upload");

        const uploadBody = new FormData();
        uploadBody.append("cacheControl", "3600");
        uploadBody.append("", selectedFile);
        const uploadResponse = await fetch(String(sign.signedUrl), {
          method: "PUT",
          headers: { "x-upsert": "false" },
          body: uploadBody,
        });
        if (!uploadResponse.ok) {
          const message = await uploadResponse.text().catch(() => "");
          throw new Error(message || (isAr ? "فشل رفع الملف إلى التخزين" : "File upload failed"));
        }

        storageMetadata = {
          storageBucket: String(sign.bucket || "board-uploads"),
          storagePath,
          fileName: selectedFile.name,
          fileExtension: getExtension(selectedFile.name),
          mimeType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
          uploadedAt: new Date().toISOString(),
        };
      }

      await addDocument({
        docType: "document",
        refNo: form.refNo.trim() || `DOC-${Date.now().toString(36).toUpperCase()}`,
        title: form.title.trim(),
        date: form.date || new Date().toISOString().slice(0, 10),
        vendor: null,
        department: form.department.trim() || null,
        status: "active",
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        amount: null,
        expiryDate: null,
        metadata: { source: "documents-module", ...storageMetadata },
        pdfUrl: form.pdfUrl.trim() || null,
        extractedData: null,
      });
      resetCreateForm();
      setCreateOpen(false);
      toast.success(isAr ? "تم رفع الملف وحفظ المستند بنجاح" : "File uploaded and document saved successfully");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر رفع أو حفظ المستند" : "Unable to upload or save document"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    const confirmed = window.confirm(
      isAr
        ? `حذف المستند \"${doc.title}\" نهائياً؟ لن يعود بعد تحديث الصفحة.`
        : `Permanently delete \"${doc.title}\"? It will not return after refresh.`,
    );
    if (!confirmed) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      const storagePath = String(doc.metadata?.storagePath || "");
      if (storagePath) {
        try {
          await requestStorageAction("delete", { path: storagePath });
        } catch {
          // Database deletion is authoritative; an orphaned object can be cleaned by an administrator later.
        }
      }
      toast.success(isAr ? "تم حذف المستند نهائياً" : "Document permanently deleted");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "فشل حذف المستند" : "Failed to delete document"));
    } finally {
      setDeletingId(null);
    }
  };

  const resolveDocumentUrl = async (doc: DocumentItem, download = false) => {
    const storagePath = String(doc.metadata?.storagePath || "");
    if (storagePath) {
      const data = await requestStorageAction("sign-read", {
        path: storagePath,
        fileName: String(doc.metadata?.fileName || doc.title || "document"),
        download,
      });
      return String(data.signedUrl || "");
    }
    return String(doc.pdfUrl || "");
  };

  const openDocument = async (doc: DocumentItem) => {
    try {
      const url = await resolveDocumentUrl(doc, false);
      if (!url) {
        toast.info(isAr ? "لا يوجد ملف أو رابط مرفق بهذا المستند" : "No file or URL is attached to this document");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر فتح الملف" : "Unable to open file"));
    }
  };

  const downloadDocument = async (doc: DocumentItem) => {
    try {
      const url = await resolveDocumentUrl(doc, true);
      if (!url) {
        toast.info(isAr ? "لا يوجد ملف متاح للتحميل" : "No downloadable file is attached");
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = String(doc.metadata?.fileName || doc.title || "document");
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر تحميل الملف" : "Unable to download file"));
    }
  };

  const printDocument = async (doc: DocumentItem) => {
    try {
      const url = await resolveDocumentUrl(doc, false);
      if (!url) {
        toast.info(isAr ? "لا يوجد ملف متاح للطباعة" : "No printable file is attached");
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.src = url;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        window.setTimeout(() => iframe.remove(), 1500);
      };
      document.body.appendChild(iframe);
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر تجهيز الملف للطباعة" : "Unable to prepare file for printing"));
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            {isAr ? "المستندات والملفات" : "Documents & Files"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "رفع وحفظ جميع صيغ الملفات في تخزين Supabase الخاص مع صلاحيات النظام." : "Upload and store all file formats in private Supabase Storage with system permissions."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? "رفع / إضافة ملف" : "Upload / Add File"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3">
            <span>{isAr ? "التقارير والمستندات" : "Reports & Documents"}</span>
            <Badge variant="secondary">{visibleDocuments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث في المستندات والملفات..." : "Search documents and files..."}
              className="ps-9"
            />
          </div>

          {visibleDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed py-14 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">{isAr ? "لا توجد مستندات محفوظة" : "No saved documents"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isAr ? "ارفع أي صيغة ملف من زر رفع / إضافة ملف." : "Upload any file format using the Upload / Add File button."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleDocuments.map((doc) => {
                const fileName = String(doc.metadata?.fileName || "");
                const fileSize = Number(doc.metadata?.fileSize || 0);
                const fileType = String(doc.metadata?.mimeType || "");
                return (
                  <div key={doc.id} className="rounded-xl border p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{doc.title}</p>
                        <Badge variant="outline">{fileName ? getExtension(fileName) : (doc.docType || "document")}</Badge>
                        {doc.status && <Badge variant="secondary">{doc.status}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        {doc.refNo && <span>{isAr ? "المرجع:" : "Ref:"} {doc.refNo}</span>}
                        {doc.date && <span>{isAr ? "التاريخ:" : "Date:"} {doc.date}</span>}
                        {doc.department && <span>{isAr ? "القسم:" : "Department:"} {doc.department}</span>}
                        {doc.category && <span>{isAr ? "التصنيف:" : "Category:"} {doc.category}</span>}
                        {fileSize > 0 && <span>{isAr ? "الحجم:" : "Size:"} {formatBytes(fileSize)}</span>}
                      </div>
                      {fileName && <p className="mt-1 text-xs font-mono text-muted-foreground truncate">{fileName}{fileType ? ` · ${fileType}` : ""}</p>}
                      {doc.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => void openDocument(doc)} title={isAr ? "معاينة / فتح" : "Preview / Open"}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void downloadDocument(doc)} title={isAr ? "تحميل" : "Download"}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void printDocument(doc)} title={isAr ? "طباعة" : "Print"}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === doc.id}
                          onClick={() => void handleDelete(doc)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={isAr ? "حذف نهائي" : "Permanently delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open && !saving) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isAr ? "رفع ملف / إضافة مستند" : "Upload File / Add Document"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="document-file" className="flex items-center gap-2"><Upload className="h-4 w-4" />{isAr ? "اختيار ملف — جميع الصيغ مسموحة" : "Choose file — all formats allowed"}</Label>
              <Input
                id="document-file"
                type="file"
                disabled={saving}
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                {isAr ? "يدعم أي امتداد أو MIME type حتى 50MB للملف الواحد. الملفات تبقى خاصة وغير متاحة للعامة." : "Any extension or MIME type is supported up to 50MB per file. Files remain private and are not publicly accessible."}
              </p>
              {selectedFile && (
                <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{getExtension(selectedFile.name)} · {formatBytes(selectedFile.size)} · {selectedFile.type || "application/octet-stream"}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" disabled={saving} onClick={() => setSelectedFile(null)} title={isAr ? "إزالة الملف" : "Remove file"}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? "اسم المستند" : "Document title"}</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{isAr ? "رقم المرجع" : "Reference no."}</Label>
                <Input value={form.refNo} onChange={(e) => setForm((p) => ({ ...p, refNo: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{isAr ? "التاريخ" : "Date"}</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{isAr ? "التصنيف" : "Category"}</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{isAr ? "القسم" : "Department"}</Label>
                <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? "رابط خارجي للملف (اختياري وبديل للرفع)" : "External file URL (optional upload alternative)"}</Label>
              <Input value={form.pdfUrl} onChange={(e) => setForm((p) => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button disabled={saving} onClick={() => void handleCreate()}>{saving ? (isAr ? "جاري الرفع والحفظ..." : "Uploading & saving...") : (isAr ? "رفع وحفظ" : "Upload & Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

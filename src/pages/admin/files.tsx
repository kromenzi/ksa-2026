"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, FolderOpen, Plus, Search, Trash2, Eye, Download, Printer } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  title: "",
  refNo: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  department: "",
  description: "",
  pdfUrl: "",
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

  const visibleDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = documents.filter((doc) => !["contract", "invoice"].includes(String(doc.docType || "").toLowerCase()));
    if (!q) return rows;
    return rows.filter((doc) =>
      [doc.title, doc.refNo, doc.category, doc.department, doc.description, doc.docType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [documents, search]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error(isAr ? "اسم المستند مطلوب" : "Document title is required");
      return;
    }
    setSaving(true);
    try {
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
        metadata: { source: "documents-module" },
        pdfUrl: form.pdfUrl.trim() || null,
        extractedData: null,
      });
      setForm(emptyForm);
      setCreateOpen(false);
      toast.success(isAr ? "تم حفظ المستند في قاعدة البيانات" : "Document saved to the database");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حفظ المستند" : "Unable to save document"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(
      isAr
        ? `حذف المستند \"${title}\" نهائياً؟ لن يعود بعد تحديث الصفحة.`
        : `Permanently delete \"${title}\"? It will not return after refresh.`,
    );
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      toast.success(isAr ? "تم حذف المستند نهائياً" : "Document permanently deleted");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "فشل حذف المستند" : "Failed to delete document"));
    } finally {
      setDeletingId(null);
    }
  };

  const openDocument = (url?: string | null) => {
    if (!url) {
      toast.info(isAr ? "لا يوجد ملف أو رابط مرفق بهذا المستند" : "No file or URL is attached to this document");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadDocument = (url?: string | null, title?: string) => {
    if (!url) {
      toast.info(isAr ? "لا يوجد ملف متاح للتحميل" : "No downloadable file is attached");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = title || "document";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const printDocument = (url?: string | null) => {
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
            {isAr ? "تعرض هذه الصفحة السجلات المحفوظة فعلياً في Supabase فقط." : "This page shows only records actually stored in Supabase."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة مستند" : "Add Document"}
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
              placeholder={isAr ? "بحث في المستندات..." : "Search documents..."}
              className="ps-9"
            />
          </div>

          {visibleDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed py-14 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">{isAr ? "لا توجد مستندات محفوظة" : "No saved documents"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isAr ? "تمت إزالة جميع العناصر التجريبية. ستظهر هنا البيانات الحقيقية فقط." : "All demo items were removed. Only real data will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleDocuments.map((doc) => (
                <div key={doc.id} className="rounded-xl border p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold truncate">{doc.title}</p>
                      <Badge variant="outline">{doc.docType || "document"}</Badge>
                      {doc.status && <Badge variant="secondary">{doc.status}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      {doc.refNo && <span>{isAr ? "المرجع:" : "Ref:"} {doc.refNo}</span>}
                      {doc.date && <span>{isAr ? "التاريخ:" : "Date:"} {doc.date}</span>}
                      {doc.department && <span>{isAr ? "القسم:" : "Department:"} {doc.department}</span>}
                      {doc.category && <span>{isAr ? "التصنيف:" : "Category:"} {doc.category}</span>}
                    </div>
                    {doc.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openDocument(doc.pdfUrl)} title={isAr ? "معاينة" : "Preview"}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => downloadDocument(doc.pdfUrl, doc.title)} title={isAr ? "تحميل" : "Download"}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => printDocument(doc.pdfUrl)} title={isAr ? "طباعة" : "Print"}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === doc.id}
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title={isAr ? "حذف نهائي" : "Permanently delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة مستند محفوظ" : "Add Saved Document"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
              <Label>{isAr ? "رابط الملف (اختياري)" : "File URL (optional)"}</Label>
              <Input value={form.pdfUrl} onChange={(e) => setForm((p) => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button disabled={saving} onClick={handleCreate}>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

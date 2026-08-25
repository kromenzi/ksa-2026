"use client";

import { useState, useRef } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Plus, Search, Edit, Trash2, Eye, Printer, Save, MoreHorizontal, Upload, X } from "lucide-react";
import { UniversalFileViewer } from "@/components/universal-file-viewer";
import { DocumentThumbnail, detectFileType } from "@/components/document-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FormItem {
  id: string;
  title: string;
  description: string;
  category: string;
  uploadedAt: string;
  status: "active" | "draft" | "archived";
  file?: { name: string; size: string; type: string; url: string; thumbnail?: string } | null;
}

export default function AdminForms() {
  const { settings, hasPermission, forms, addForm, updateForm, deleteForm } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("forms", "create");
  const canDelete = hasPermission("forms", "delete");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingForm, setEditingForm] = useState<FormItem | null>(null);
  const [previewForm, setPreviewForm] = useState<FormItem | null>(null);
  const [formData, setFormData] = useState<Partial<FormItem>>({ status: "draft", category: "Safety" });
  const [tempFile, setTempFile] = useState<FormItem["file"]>(null);

  const filteredForms = forms.filter((f) =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingForm(null);
    setFormData({ status: "draft", category: "Safety" });
    setTempFile(null);
    setShowDialog(true);
  };

  const handleEdit = (form: FormItem) => {
    setEditingForm(form);
    setFormData(form);
    setTempFile(form.file || null);
    setShowDialog(true);
  };

  const handlePreview = (form: FormItem) => {
    setPreviewForm(form);
    setShowPreview(true);
  };

  const handlePrint = (form: FormItem) => {
    if (form.file?.url && form.file.url !== "#") {
      const printWindow = window.open(form.file.url, "_blank");
      if (printWindow) printWindow.onload = () => printWindow.print();
    } else {
      toast.error(isAr ? "لا يوجد ملف للطباعة" : "No file to print");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteForm(id);
      toast.success(isAr ? "تم حذف النموذج نهائياً" : "Form deleted permanently");
    } catch {
      toast.error(isAr ? "تعذر حذف النموذج" : "Unable to delete form");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const computedType = detectFileType(file.name, file.type);
    setTempFile({
      name: file.name,
      size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: computedType,
      url,
      thumbnail: computedType === "image" ? url : undefined,
    });
  };

  const handleRemoveFile = () => {
    if (tempFile?.url?.startsWith("blob:")) URL.revokeObjectURL(tempFile.url);
    setTempFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error(isAr ? "عنوان النموذج مطلوب" : "Form title is required");
      return;
    }
    const payload = {
      title: formData.title.trim(),
      description: formData.description || "",
      category: formData.category || "Safety",
      status: formData.status || "draft",
      file: tempFile,
    };
    try {
      if (editingForm) {
        await updateForm(editingForm.id, payload);
        toast.success(isAr ? "تم تحديث النموذج" : "Form updated");
      } else {
        await addForm(payload);
        toast.success(isAr ? "تم إضافة النموذج" : "Form added");
      }
      setTempFile(null);
      setEditingForm(null);
      setShowDialog(false);
    } catch {
      toast.error(isAr ? "تعذر حفظ النموذج" : "Unable to save form");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
      archived: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    };
    const labels = {
      active: isAr ? "نشط" : "Active",
      draft: isAr ? "مسودة" : "Draft",
      archived: isAr ? "مؤرشف" : "Archived",
    };
    return <Badge variant="outline" className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardList className="h-6 w-6 text-teal-500" />{isAr ? "النماذج" : "Forms"}</h2>
          <p className="text-muted-foreground mt-1">{isAr ? "إدارة النماذج والاستبيانات" : "Manage forms and surveys"}</p>
        </div>
        {canEdit && <Button className="gap-2" onClick={handleAdd}><Plus className="h-4 w-4" />{isAr ? "نموذج جديد" : "New Form"}</Button>}
      </div>

      <div className="relative flex-1 max-w-sm"><Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder={isAr ? "بحث في النماذج..." : "Search forms..."} className="ps-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      <Card>
        <CardHeader><CardTitle>{isAr ? "قائمة النماذج" : "Forms List"}</CardTitle></CardHeader>
        <CardContent>
          {filteredForms.length === 0 ? <div className="text-center py-12 text-muted-foreground"><ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>{isAr ? "لا توجد نماذج حالياً" : "No forms yet"}</p>{canEdit && <Button variant="outline" className="mt-4 gap-2" onClick={handleAdd}><Plus className="h-4 w-4" />{isAr ? "إضافة نموذج" : "Add Form"}</Button>}</div> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredForms.map((form) => <div key={form.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
              <div className="flex items-start justify-between mb-3"><div className="h-12 w-12 rounded-xl bg-teal-500/10 flex items-center justify-center"><ClipboardList className="h-6 w-6 text-teal-500" /></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handlePreview(form)}><Eye className="h-4 w-4 mr-2" />{isAr ? "معاينة" : "Preview"}</DropdownMenuItem><DropdownMenuItem onClick={() => handlePrint(form)}><Printer className="h-4 w-4 mr-2" />{isAr ? "طباعة" : "Print"}</DropdownMenuItem>{canEdit && <DropdownMenuItem onClick={() => handleEdit(form)}><Edit className="h-4 w-4 mr-2" />{isAr ? "تعديل" : "Edit"}</DropdownMenuItem>}{canDelete && <DropdownMenuItem onClick={() => handleDelete(form.id)} className="text-red-500"><Trash2 className="h-4 w-4 mr-2" />{isAr ? "حذف" : "Delete"}</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>
              <div className="mb-2">{getStatusBadge(form.status)}</div><h3 className="font-medium truncate">{form.title}</h3><p className="text-sm text-muted-foreground line-clamp-1 mt-1">{form.description}</p><div className="flex items-center gap-2 mt-2"><Badge variant="secondary" className="text-[10px]">{form.category}</Badge><span className="text-xs text-muted-foreground">{form.uploadedAt || ""}</span></div>
              {form.file && <div className="mt-3 space-y-1"><div className="h-28 w-full"><DocumentThumbnail fileName={form.file.name} fileType={form.file.type} thumbnailUrl={form.file.thumbnail} fileUrl={form.file.url} aspectRatio="video" className="w-full h-full" onClick={() => handlePreview(form)} /></div><div className="flex items-center justify-between text-[11px] text-muted-foreground px-1"><span className="truncate max-w-[180px]">{form.file.name}</span><span>{form.file.size}</span></div></div>}
            </div>)}</div>}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingForm ? (isAr ? "تعديل النموذج" : "Edit Form") : (isAr ? "نموذج جديد" : "New Form")}</DialogTitle></DialogHeader><div className="space-y-4 py-4">
        <div className="space-y-2"><Label>{isAr ? "العنوان" : "Title"}</Label><Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
        <div className="space-y-2"><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
        <div className="space-y-2"><Label>{isAr ? "التصنيف" : "Category"}</Label><Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Safety">{isAr ? "سلامة" : "Safety"}</SelectItem><SelectItem value="Incident">{isAr ? "حادث" : "Incident"}</SelectItem><SelectItem value="Hazard">{isAr ? "خطر" : "Hazard"}</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as FormItem["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{isAr ? "نشط" : "Active"}</SelectItem><SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem><SelectItem value="archived">{isAr ? "مؤرشف" : "Archived"}</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>{isAr ? "الملف" : "File"}</Label><input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" /><div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />{isAr ? "اختيار ملف" : "Choose file"}</Button>{tempFile && <Button type="button" variant="ghost" onClick={handleRemoveFile}><X className="h-4 w-4 mr-2" />{isAr ? "إزالة" : "Remove"}</Button>}</div></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />{isAr ? "حفظ" : "Save"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{previewForm?.title || (isAr ? "معاينة النموذج" : "Form Preview")}</DialogTitle></DialogHeader>{previewForm?.file?.url && previewForm.file.url !== "#" ? <UniversalFileViewer fileUrl={previewForm.file.url} fileName={previewForm.file.name} /> : <div className="py-12 text-center text-muted-foreground">{isAr ? "لا يوجد ملف مرتبط بهذا النموذج" : "No file attached to this form"}</div>}</DialogContent></Dialog>
    </div>
  );
}

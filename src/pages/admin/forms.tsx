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
  const { settings, hasPermission } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("forms", "create");
  const canDelete = hasPermission("forms", "delete");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [forms, setForms] = useState<FormItem[]>([
    { id: "1", title: "Safety Observation Form", description: "Form for reporting safety observations", category: "Safety", uploadedAt: "2024-01-15", status: "active", file: { name: "safety-observation.pdf", size: "1.2 MB", type: "pdf", url: "#" } },
    { id: "2", title: "Incident Report Form", description: "Form for reporting incidents", category: "Incident", uploadedAt: "2024-01-20", status: "active" },
    { id: "3", title: "Hazard Report Form", description: "Form for reporting hazards", category: "Hazard", uploadedAt: "2024-02-01", status: "draft" },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingForm, setEditingForm] = useState<FormItem | null>(null);
  const [previewForm, setPreviewForm] = useState<FormItem | null>(null);
  const [formData, setFormData] = useState<Partial<FormItem>>({
    status: "draft",
    category: "Safety",
  });
  const [tempFile, setTempFile] = useState<{ name: string; size: string; type: string; url: string; thumbnail?: string } | null>(null);

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.category.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (form.file?.url && form.file.url !== '#') {
      const printWindow = window.open(form.file.url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      toast.error(isAr ? "لا يوجد ملف للطباعة" : "No file to print");
    }
  };

  const handleDelete = (id: string) => {
    setForms(forms.filter(f => f.id !== id));
    toast.success(isAr ? "تم حذف النموذج" : "Form deleted");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const computedType = detectFileType(file.name, file.type);
      setTempFile({
        name: file.name,
        size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: computedType,
        url: url,
        thumbnail: computedType === "image" ? url : undefined,
      });
      toast.success(isAr ? "تم اختيار الملف" : "File selected");
    }
  };

  const handleRemoveFile = () => {
    if (tempFile?.url) {
      URL.revokeObjectURL(tempFile.url);
    }
    setTempFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!formData.title) {
      toast.error(isAr ? "عنوان النموذج مطلوب" : "Form title is required");
      return;
    }

    const formItemData = { ...formData, file: tempFile };

    if (editingForm) {
      setForms(forms.map(f => f.id === editingForm.id ? { ...f, ...formItemData } as FormItem : f));
      toast.success(isAr ? "تم تحديث النموذج" : "Form updated");
    } else {
      const newForm: FormItem = {
        id: Date.now().toString(),
        title: formData.title || "",
        description: formData.description || "",
        category: formData.category || "Safety",
        uploadedAt: new Date().toISOString().split("T")[0],
        status: formData.status as "active" | "draft" | "archived" || "draft",
        file: tempFile,
      };
      setForms([...forms, newForm]);
      toast.success(isAr ? "تم إضافة النموذج" : "Form added");
    }
    setTempFile(null);
    setShowDialog(false);
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
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-500" />
            {isAr ? "النماذج" : "Forms"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة النماذج والاستبيانات" : "Manage forms and surveys"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {isAr ? "نموذج جديد" : "New Form"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث في النماذج..." : "Search forms..."}
            className="ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قائمة النماذج" : "Forms List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredForms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد نماذج حالياً" : "No forms yet"}</p>
              {canEdit && (
                <Button variant="outline" className="mt-4 gap-2" onClick={handleAdd}>
                  <Plus className="h-4 w-4" />
                  {isAr ? "إضافة نموذج" : "Add Form"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredForms.map((form) => (
                <div key={form.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-teal-500" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(form)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isAr ? "معاينة" : "Preview"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(form)}>
                          <Printer className="h-4 w-4 mr-2" />
                          {isAr ? "طباعة" : "Print"}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(form)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {isAr ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(form.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isAr ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">
                    {getStatusBadge(form.status)}
                  </div>
                  <h3 className="font-medium truncate">{form.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{form.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{form.category}</Badge>
                    <span className="text-xs text-muted-foreground">{form.uploadedAt}</span>
                  </div>
                  {form.file && (
                    <div className="mt-3 space-y-1">
                      <div className="h-28 w-full">
                        <DocumentThumbnail
                          fileName={form.file.name}
                          fileType={form.file.type}
                          thumbnailUrl={form.file.thumbnail}
                          fileUrl={form.file.url}
                          aspectRatio="video"
                          className="w-full h-full"
                          onClick={() => handlePreview(form)}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="truncate max-w-[180px]">{form.file.name}</span>
                        <span>{form.file.size}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePreview(form)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePrint(form)}>
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      {isAr ? "طباعة" : "Print"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm
                ? (isAr ? "تعديل النموذج" : "Edit Form")
                : (isAr ? "نموذج جديد" : "New Form")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "العنوان" : "Title"}</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? "عنوان النموذج" : "Form title"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isAr ? "وصف النموذج" : "Form description"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "التصنيف" : "Category"}</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Safety">{isAr ? "سلامة" : "Safety"}</SelectItem>
                  <SelectItem value="Incident">{isAr ? "حادث" : "Incident"}</SelectItem>
                  <SelectItem value="Hazard">{isAr ? "خطر" : "Hazard"}</SelectItem>
                  <SelectItem value="Inspection">{isAr ? "تفتيش" : "Inspection"}</SelectItem>
                  <SelectItem value="Training">{isAr ? "تدريب" : "Training"}</SelectItem>
                  <SelectItem value="Other">{isAr ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as "active" | "draft" | "archived" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isAr ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="draft">{isAr ? "مسودة" : "Draft"}</SelectItem>
                  <SelectItem value="archived">{isAr ? "مؤرشف" : "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{isAr ? "ملف النموذج" : "Form File"}</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.xlsx,.xls,.ppt,.pptx,.txt"
              />
              {tempFile ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <div className="h-12 w-12 flex-shrink-0">
                    <DocumentThumbnail
                      fileName={tempFile.name}
                      fileType={tempFile.type}
                      thumbnailUrl={tempFile.thumbnail}
                      fileUrl={tempFile.url}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tempFile.name}</p>
                    <p className="text-xs text-muted-foreground">{tempFile.size}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemoveFile}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {isAr ? "رفع ملف النموذج" : "Upload Form File"}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {isAr ? "يدعم: PDF, Word, Excel, PowerPoint, الصور, النصوص" : "Supports: PDF, Word, Excel, PowerPoint, Images, Text"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editingForm
                ? (isAr ? "تحديث" : "Update")
                : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isAr ? "معاينة النموذج" : "Form Preview"}</DialogTitle>
          </DialogHeader>
          {previewForm && (
            <div className="py-4">
              <div className="text-center p-4 bg-teal-500/10 rounded-lg mb-4">
                <ClipboardList className="h-16 w-16 mx-auto text-teal-500 mb-2" />
                <h3 className="font-bold text-lg">{previewForm.title}</h3>
                <p className="text-sm text-muted-foreground">{previewForm.description}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary">{previewForm.category}</Badge>
                  {getStatusBadge(previewForm.status)}
                </div>
              </div>
              
              {previewForm.file?.url && previewForm.file.url !== '#' ? (
                <UniversalFileViewer
                  fileName={previewForm.file.name}
                  fileUrl={previewForm.file.url}
                  thumbnailUrl={previewForm.file.thumbnail}
                  fileType={previewForm.file.type}
                  fileSize={previewForm.file.size}
                  isAr={isAr}
                  onPrint={() => handlePrint(previewForm)}
                />
              ) : (
                <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[200px]">
                  <p className="text-muted-foreground">{isAr ? "لا يوجد ملف مرفق" : "No file attached"}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
            {previewForm?.file?.url && previewForm.file.url !== '#' && (
              <Button onClick={() => handlePrint(previewForm)}>
                <Printer className="h-4 w-4 mr-2" />
                {isAr ? "طباعة" : "Print"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

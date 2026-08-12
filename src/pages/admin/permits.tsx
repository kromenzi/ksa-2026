"use client";

import { useState, useRef } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2, Plus, Search, Edit, Trash2, Calendar, Building2, MoreHorizontal, Eye, Printer, Save, Upload, X } from "lucide-react";
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
import PrintShareDialog from "@/components/print-share-dialog";

interface Permit {
  id: string;
  refNo: string;
  title: string;
  permitType: string;
  department: string;
  issueDate: string;
  expiryDate: string;
  status: "active" | "expired" | "pending";
  issuer: string;
  description: string;
  file?: { name: string; size: string; type: string; url: string; thumbnail?: string } | null;
}

export default function AdminPermits() {
  const { settings, departments, hasPermission } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [permits, setPermits] = useState<Permit[]>([
    { id: "1", refNo: "PRM-2024-001", title: "Work at Height Permit", permitType: "Safety", department: "Operations", issueDate: "2024-01-01", expiryDate: "2024-12-31", status: "active", issuer: "HSE Department", description: "Permit for working at heights above 2 meters", file: { name: "height-permit.pdf", size: "1.2 MB", type: "pdf", url: "#" } },
    { id: "2", refNo: "PRM-2024-002", title: "Hot Work Permit", permitType: "Safety", department: "Maintenance", issueDate: "2024-02-01", expiryDate: "2024-07-31", status: "active", issuer: "HSE Department", description: "Welding and cutting operations permit" },
    { id: "3", refNo: "PRM-2023-010", title: "Confined Space Entry", permitType: "Safety", department: "Operations", issueDate: "2023-06-01", expiryDate: "2024-05-31", status: "expired", issuer: "HSE Department", description: "Entry permit for confined spaces", file: { name: "confined-space.pdf", size: "980 KB", type: "pdf", url: "#" } },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [previewPermit, setPreviewPermit] = useState<Permit | null>(null);
  const [formData, setFormData] = useState<Partial<Permit>>({
    status: "active",
    permitType: "Safety",
  });
  const [tempFile, setTempFile] = useState<{ name: string; size: string; type: string; url: string; thumbnail?: string } | null>(null);

  const filteredPermits = permits.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.permitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.refNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingPermit(null);
    setFormData({ status: "active", permitType: "Safety" });
    setTempFile(null);
    setShowDialog(true);
  };

  const handleEdit = (permit: Permit) => {
    setEditingPermit(permit);
    setFormData(permit);
    setTempFile(permit.file || null);
    setShowDialog(true);
  };

  const handlePreview = (permit: Permit) => {
    setPreviewPermit(permit);
    setShowPreview(true);
  };

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrint = (permit: Permit) => {
    if (permit.file?.url && permit.file.url !== '#') {
      const printWindow = window.open(permit.file.url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        triggerPrintDialog(permit);
      }
    } else {
      triggerPrintDialog(permit);
    }
  };

  const triggerPrintDialog = (permit: Permit) => {
    const printObj = {
      id: permit.id,
      type: "license" as const,
      refNo: permit.refNo,
      title: `${isAr ? "تصريح عمل" : "Work Permit"} - ${permit.title}`,
      department: permit.department,
      status: permit.status,
      date: permit.issueDate,
      sections: [
        { label: isAr ? "رقم التصريح" : "Permit No", value: permit.refNo },
        { label: isAr ? "عنوان التصريح" : "Title", value: permit.title },
        { label: isAr ? "نوع التصريح" : "Type", value: permit.permitType },
        { label: isAr ? "القسم / المصنع" : "Department", value: permit.department },
        { label: isAr ? "المصدر" : "Issuer", value: permit.issuer },
        { label: isAr ? "تاريخ الإصدار" : "Issue Date", value: permit.issueDate },
        { label: isAr ? "تاريخ الانتهاء" : "Expiry Date", value: permit.expiryDate },
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const handleDelete = (id: string) => {
    setPermits(permits.filter(p => p.id !== id));
    toast.success(isAr ? "تم حذف التصريح" : "Permit deleted");
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
    if (!formData.title || !formData.permitType) {
      toast.error(isAr ? "العنوان ونوع التصريح مطلوبان" : "Title and permit type are required");
      return;
    }

    const permitData = { ...formData, file: tempFile };

    if (editingPermit) {
      setPermits(permits.map(p => p.id === editingPermit.id ? { ...p, ...permitData } as Permit : p));
      toast.success(isAr ? "تم تحديث التصريح" : "Permit updated");
    } else {
      const newPermit: Permit = {
        id: Date.now().toString(),
        refNo: `PRM-${new Date().getFullYear()}-${String(permits.length + 1).padStart(3, "0")}`,
        title: formData.title || "",
        permitType: formData.permitType || "Safety",
        department: formData.department || "",
        issueDate: formData.issueDate || new Date().toISOString().split("T")[0],
        expiryDate: formData.expiryDate || "",
        status: formData.status as "active" | "expired" | "pending" || "active",
        issuer: formData.issuer || "",
        description: formData.description || "",
        file: tempFile,
      };
      setPermits([...permits, newPermit]);
      toast.success(isAr ? "تم إضافة التصريح" : "Permit added");
    }
    setTempFile(null);
    setShowDialog(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      expired: "bg-red-500/10 text-red-600 border-red-500/20",
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };
    const labels = {
      active: isAr ? "نشط" : "Active",
      expired: isAr ? "منتهي" : "Expired",
      pending: isAr ? "معلق" : "Pending",
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
            <FileCheck2 className="h-6 w-6 text-cyan-500" />
            {isAr ? "التصاريح" : "Permits"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة التصاريح والتراخيص" : "Manage permits and licenses"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {isAr ? "تصريح جديد" : "New Permit"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث في التصاريح..." : "Search permits..."}
            className="ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قائمة التصاريح" : "Permits List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPermits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد تصاريح حالياً" : "No permits yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermits.map((permit) => (
                <div key={permit.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <FileCheck2 className="h-6 w-6 text-cyan-500" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(permit)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isAr ? "معاينة" : "Preview"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(permit)}>
                          <Printer className="h-4 w-4 mr-2" />
                          {isAr ? "طباعة" : "Print"}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(permit)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {isAr ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(permit.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isAr ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">
                    {getStatusBadge(permit.status)}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">{permit.refNo}</p>
                  <h3 className="font-medium truncate">{permit.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{permit.permitType}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{permit.issueDate} - {permit.expiryDate}</span>
                  </div>
                  {permit.file && (
                    <div className="mt-3 space-y-1">
                      <div className="h-28 w-full">
                        <DocumentThumbnail
                          fileName={permit.file.name}
                          fileType={permit.file.type}
                          thumbnailUrl={permit.file.thumbnail}
                          fileUrl={permit.file.url}
                          aspectRatio="video"
                          className="w-full h-full"
                          onClick={() => handlePreview(permit)}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="truncate max-w-[180px]">{permit.file.name}</span>
                        <span>{permit.file.size}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePreview(permit)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePrint(permit)}>
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
              {editingPermit
                ? (isAr ? "تعديل التصريح" : "Edit Permit")
                : (isAr ? "تصريح جديد" : "New Permit")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "العنوان" : "Title"}</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? "عنوان التصريح" : "Permit title"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "نوع التصريح" : "Permit Type"}</Label>
              <Select
                value={formData.permitType}
                onValueChange={(v) => setFormData({ ...formData, permitType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Safety">{isAr ? "سلامة" : "Safety"}</SelectItem>
                  <SelectItem value="Environmental">{isAr ? "بيئي" : "Environmental"}</SelectItem>
                  <SelectItem value="Operational">{isAr ? "تشغيلي" : "Operational"}</SelectItem>
                  <SelectItem value="Legal">{isAr ? "قانوني" : "Legal"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "القسم" : "Department"}</Label>
              <Select
                value={formData.department}
                onValueChange={(v) => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر القسم" : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ الإصدار" : "Issue Date"}</Label>
                <Input
                  type="date"
                  value={formData.issueDate || ""}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                <Input
                  type="date"
                  value={formData.expiryDate || ""}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as "active" | "expired" | "pending" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isAr ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="expired">{isAr ? "منتهي" : "Expired"}</SelectItem>
                  <SelectItem value="pending">{isAr ? "معلق" : "Pending"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الجهة المصدرة" : "Issuer"}</Label>
              <Input
                value={formData.issuer || ""}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder={isAr ? "الجهة المصدرة للتصريح" : "Permit issuing authority"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isAr ? "وصف التصريح" : "Permit description"}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{isAr ? "ملف التصريح" : "Permit File"}</Label>
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
                  {isAr ? "رفع ملف التصريح" : "Upload Permit File"}
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
              {editingPermit
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
            <DialogTitle>{isAr ? "معاينة التصريح" : "Permit Preview"}</DialogTitle>
          </DialogHeader>
          {previewPermit && (
            <div className="py-4">
              <div className="text-center p-4 bg-cyan-500/10 rounded-lg mb-4">
                <FileCheck2 className="h-16 w-16 mx-auto text-cyan-500 mb-2" />
                <p className="font-mono text-sm text-muted-foreground">{previewPermit.refNo}</p>
                <h3 className="font-bold text-lg mt-1">{previewPermit.title}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {getStatusBadge(previewPermit.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><span className="text-muted-foreground">{isAr ? "النوع:" : "Type:"}</span> {previewPermit.permitType}</div>
                <div><span className="text-muted-foreground">{isAr ? "القسم:" : "Department:"}</span> {previewPermit.department}</div>
                <div><span className="text-muted-foreground">{isAr ? "الفترة:" : "Period:"}</span> {previewPermit.issueDate} - {previewPermit.expiryDate}</div>
                <div><span className="text-muted-foreground">{isAr ? "الجهة المصدرة:" : "Issuer:"}</span> {previewPermit.issuer}</div>
              </div>
              
              {previewPermit.file?.url && previewPermit.file.url !== '#' ? (
                <UniversalFileViewer
                  fileName={previewPermit.file.name}
                  fileUrl={previewPermit.file.url}
                  thumbnailUrl={previewPermit.file.thumbnail}
                  fileType={previewPermit.file.type}
                  fileSize={previewPermit.file.size}
                  isAr={isAr}
                  onPrint={() => handlePrint(previewPermit)}
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
            {previewPermit?.file?.url && previewPermit.file.url !== '#' && (
              <Button onClick={() => handlePrint(previewPermit)}>
                <Printer className="h-4 w-4 mr-2" />
                {isAr ? "طباعة" : "Print"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT & SHARE DIALOG */}
      {printItem && (
        <PrintShareDialog
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
          item={printItem}
        />
      )}
    </div>
  );
}

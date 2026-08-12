"use client";

import { useState, useRef } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Plus, Search, Edit, Trash2, FileText, MoreHorizontal, Calendar, Building2, Eye, Printer, Save, Upload, X } from "lucide-react";
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

interface Contract {
  id: string;
  refNo: string;
  title: string;
  vendor: string;
  department: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "pending";
  value: string;
  description: string;
  file?: { name: string; size: string; type: string; url: string; thumbnail?: string } | null;
}

export default function AdminContracts() {
  const { settings, departments, hasPermission } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contracts, setContracts] = useState<Contract[]>([
    { id: "1", refNo: "CTR-2024-001", title: "Safety Equipment Supply", vendor: "SafetyFirst Co.", department: "HSE", startDate: "2024-01-01", endDate: "2024-12-31", status: "active", value: "150,000 SAR", description: "Annual safety equipment supply contract", file: { name: "contract-001.pdf", size: "2.5 MB", type: "pdf", url: "#" } },
    { id: "2", refNo: "CTR-2024-002", title: "Training Services", vendor: "TrainPro Academy", department: "HR", startDate: "2024-02-01", endDate: "2024-08-01", status: "active", value: "75,000 SAR", description: "Safety training services" },
    { id: "3", refNo: "CTR-2023-015", title: "Maintenance Agreement", vendor: "TechMaint Ltd.", department: "Maintenance", startDate: "2023-06-01", endDate: "2024-05-31", status: "expired", value: "200,000 SAR", description: "Equipment maintenance contract", file: { name: "maintenance-contract.pdf", size: "1.8 MB", type: "pdf", url: "#" } },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Partial<Contract>>({
    status: "active",
  });
  const [tempFile, setTempFile] = useState<{ name: string; size: string; type: string; url: string; thumbnail?: string } | null>(null);

  const filteredContracts = contracts.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.refNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingContract(null);
    setFormData({ status: "active" });
    setTempFile(null);
    setShowDialog(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData(contract);
    setTempFile(contract.file || null);
    setShowDialog(true);
  };

  const handlePreview = (contract: Contract) => {
    setPreviewContract(contract);
    setShowPreview(true);
  };

  const handlePrint = (contract: Contract) => {
    if (contract.file?.url && contract.file.url !== '#') {
      const printWindow = window.open(contract.file.url, '_blank');
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
    setContracts(contracts.filter(c => c.id !== id));
    toast.success(isAr ? "تم حذف العقد" : "Contract deleted");
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
    if (!formData.title || !formData.vendor) {
      toast.error(isAr ? "العنوان والمورد مطلوبان" : "Title and vendor are required");
      return;
    }

    const contractData = { ...formData, file: tempFile };

    if (editingContract) {
      setContracts(contracts.map(c => c.id === editingContract.id ? { ...c, ...contractData } as Contract : c));
      toast.success(isAr ? "تم تحديث العقد" : "Contract updated");
    } else {
      const newContract: Contract = {
        id: Date.now().toString(),
        refNo: `CTR-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, "0")}`,
        title: formData.title || "",
        vendor: formData.vendor || "",
        department: formData.department || "",
        startDate: formData.startDate || new Date().toISOString().split("T")[0],
        endDate: formData.endDate || "",
        status: formData.status as "active" | "expired" | "pending" || "active",
        value: formData.value || "",
        description: formData.description || "",
        file: tempFile,
      };
      setContracts([...contracts, newContract]);
      toast.success(isAr ? "تم إضافة العقد" : "Contract added");
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-indigo-500" />
            {isAr ? "العقود" : "Contracts"}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {isAr ? "إدارة العقود والاتفاقيات" : "Manage contracts and agreements"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2 text-[12px]" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            {isAr ? "عقد جديد" : "New Contract"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث في العقود..." : "Search contracts..."}
            className="ps-10 text-[12px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">{isAr ? "قائمة العقود" : "Contracts List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد عقود حالياً" : "No contracts yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-indigo-500" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(contract)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isAr ? "معاينة" : "Preview"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(contract)}>
                          <Printer className="h-4 w-4 mr-2" />
                          {isAr ? "طباعة" : "Print"}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(contract)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {isAr ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isAr ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">
                    {getStatusBadge(contract.status)}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">{contract.refNo}</p>
                  <h3 className="font-medium truncate">{contract.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{contract.vendor}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{contract.startDate} - {contract.endDate}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium">{contract.value}</span>
                  </div>
                  {contract.file && (
                    <div className="mt-3 space-y-1">
                      <div className="h-28 w-full">
                        <DocumentThumbnail
                          fileName={contract.file.name}
                          fileType={contract.file.type}
                          thumbnailUrl={contract.file.thumbnail}
                          fileUrl={contract.file.url}
                          aspectRatio="video"
                          className="w-full h-full"
                          onClick={() => handlePreview(contract)}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="truncate max-w-[180px]">{contract.file.name}</span>
                        <span>{contract.file.size}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePreview(contract)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePrint(contract)}>
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
              {editingContract
                ? (isAr ? "تعديل العقد" : "Edit Contract")
                : (isAr ? "عقد جديد" : "New Contract")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "العنوان" : "Title"}</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? "عنوان العقد" : "Contract title"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المورد" : "Vendor"}</Label>
              <Input
                value={formData.vendor || ""}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder={isAr ? "اسم المورد" : "Vendor name"}
              />
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
                <Label>{isAr ? "تاريخ البداية" : "Start Date"}</Label>
                <Input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ النهاية" : "End Date"}</Label>
                <Input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
              <Label>{isAr ? "القيمة" : "Value"}</Label>
              <Input
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={isAr ? "قيمة العقد" : "Contract value"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isAr ? "وصف العقد" : "Contract description"}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{isAr ? "ملف العقد" : "Contract File"}</Label>
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
                  {isAr ? "رفع ملف العقد" : "Upload Contract File"}
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
              {editingContract
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
            <DialogTitle>{isAr ? "معاينة العقد" : "Contract Preview"}</DialogTitle>
          </DialogHeader>
          {previewContract && (
            <div className="py-4">
              <div className="text-center p-4 bg-indigo-500/10 rounded-lg mb-4">
                <FileText className="h-16 w-16 mx-auto text-indigo-500 mb-2" />
                <p className="font-mono text-sm text-muted-foreground">{previewContract.refNo}</p>
                <h3 className="font-bold text-lg mt-1">{previewContract.title}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {getStatusBadge(previewContract.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><span className="text-muted-foreground">{isAr ? "المورد:" : "Vendor:"}</span> {previewContract.vendor}</div>
                <div><span className="text-muted-foreground">{isAr ? "القسم:" : "Department:"}</span> {previewContract.department}</div>
                <div><span className="text-muted-foreground">{isAr ? "الفترة:" : "Period:"}</span> {previewContract.startDate} - {previewContract.endDate}</div>
                <div><span className="text-muted-foreground">{isAr ? "القيمة:" : "Value:"}</span> {previewContract.value}</div>
              </div>
              
              {previewContract.file?.url && previewContract.file.url !== '#' ? (
                <UniversalFileViewer
                  fileName={previewContract.file.name}
                  fileUrl={previewContract.file.url}
                  thumbnailUrl={previewContract.file.thumbnail}
                  fileType={previewContract.file.type}
                  fileSize={previewContract.file.size}
                  isAr={isAr}
                  onPrint={() => handlePrint(previewContract)}
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
            {previewContract?.file?.url && previewContract.file.url !== '#' && (
              <Button onClick={() => handlePrint(previewContract)}>
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

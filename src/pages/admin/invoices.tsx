"use client";

import { useState, useRef } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plus, Search, Edit, Trash2, Calendar, Building2, DollarSign, MoreHorizontal, Eye, Printer, Save, Upload, X } from "lucide-react";
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

interface Invoice {
  id: string;
  refNo: string;
  title: string;
  vendor: string;
  department: string;
  invoiceDate: string;
  dueDate: string;
  status: "paid" | "unpaid" | "overdue";
  amount: string;
  description: string;
  file?: { name: string; size: string; type: string; url: string; thumbnail?: string } | null;
}

export default function AdminInvoices() {
  const { settings, departments, hasPermission } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "1", refNo: "INV-2024-001", title: "Safety Equipment Purchase", vendor: "SafetyFirst Co.", department: "HSE", invoiceDate: "2024-01-15", dueDate: "2024-02-15", status: "paid", amount: "25,000 SAR", description: "Purchase of safety helmets and vests", file: { name: "invoice-001.pdf", size: "1.5 MB", type: "pdf", url: "#" } },
    { id: "2", refNo: "INV-2024-002", title: "Training Services", vendor: "TrainPro Academy", department: "HR", invoiceDate: "2024-02-01", dueDate: "2024-03-01", status: "unpaid", amount: "15,000 SAR", description: "Safety training services invoice" },
    { id: "3", refNo: "INV-2023-045", title: "Maintenance Services", vendor: "TechMaint Ltd.", department: "Maintenance", invoiceDate: "2023-12-01", dueDate: "2023-12-31", status: "overdue", amount: "45,000 SAR", description: "Monthly maintenance services", file: { name: "maintenance-invoice.pdf", size: "2.1 MB", type: "pdf", url: "#" } },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({
    status: "unpaid",
  });
  const [tempFile, setTempFile] = useState<{ name: string; size: string; type: string; url: string; thumbnail?: string } | null>(null);

  const filteredInvoices = invoices.filter(i =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.refNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingInvoice(null);
    setFormData({ status: "unpaid" });
    setTempFile(null);
    setShowDialog(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData(invoice);
    setTempFile(invoice.file || null);
    setShowDialog(true);
  };

  const handlePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setShowPreview(true);
  };

  const handlePrint = (invoice: Invoice) => {
    if (invoice.file?.url && invoice.file.url !== '#') {
      const printWindow = window.open(invoice.file.url, '_blank');
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
    setInvoices(invoices.filter(i => i.id !== id));
    toast.success(isAr ? "تم حذف الفاتورة" : "Invoice deleted");
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

    const invoiceData = { ...formData, file: tempFile };

    if (editingInvoice) {
      setInvoices(invoices.map(i => i.id === editingInvoice.id ? { ...i, ...invoiceData } as Invoice : i));
      toast.success(isAr ? "تم تحديث الفاتورة" : "Invoice updated");
    } else {
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        refNo: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
        title: formData.title || "",
        vendor: formData.vendor || "",
        department: formData.department || "",
        invoiceDate: formData.invoiceDate || new Date().toISOString().split("T")[0],
        dueDate: formData.dueDate || "",
        status: formData.status as "paid" | "unpaid" | "overdue" || "unpaid",
        amount: formData.amount || "",
        description: formData.description || "",
        file: tempFile,
      };
      setInvoices([...invoices, newInvoice]);
      toast.success(isAr ? "تم إضافة الفاتورة" : "Invoice added");
    }
    setTempFile(null);
    setShowDialog(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      unpaid: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      overdue: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    const labels = {
      paid: isAr ? "مدفوعة" : "Paid",
      unpaid: isAr ? "غير مدفوعة" : "Unpaid",
      overdue: isAr ? "متأخرة" : "Overdue",
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
            <Receipt className="h-6 w-6 text-orange-500" />
            {isAr ? "الفواتير" : "Invoices"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "إدارة الفواتير والمدفوعات" : "Manage invoices and payments"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {isAr ? "فاتورة جديدة" : "New Invoice"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAr ? "بحث في الفواتير..." : "Search invoices..."}
            className="ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قائمة الفواتير" : "Invoices List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد فواتير حالياً" : "No invoices yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-orange-500" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isAr ? "معاينة" : "Preview"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(invoice)}>
                          <Printer className="h-4 w-4 mr-2" />
                          {isAr ? "طباعة" : "Print"}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {isAr ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isAr ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">{invoice.refNo}</p>
                  <h3 className="font-medium truncate">{invoice.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{invoice.vendor}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{isAr ? "استحقاق:" : "Due:"} {invoice.dueDate}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      {invoice.amount}
                    </span>
                  </div>
                  {invoice.file && (
                    <div className="mt-3 space-y-1">
                      <div className="h-28 w-full">
                        <DocumentThumbnail
                          fileName={invoice.file.name}
                          fileType={invoice.file.type}
                          thumbnailUrl={invoice.file.thumbnail}
                          fileUrl={invoice.file.url}
                          aspectRatio="video"
                          className="w-full h-full"
                          onClick={() => handlePreview(invoice)}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                        <span className="truncate max-w-[180px]">{invoice.file.name}</span>
                        <span>{invoice.file.size}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePreview(invoice)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handlePrint(invoice)}>
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
              {editingInvoice
                ? (isAr ? "تعديل الفاتورة" : "Edit Invoice")
                : (isAr ? "فاتورة جديدة" : "New Invoice")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "العنوان" : "Title"}</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAr ? "عنوان الفاتورة" : "Invoice title"}
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
                <Label>{isAr ? "تاريخ الفاتورة" : "Invoice Date"}</Label>
                <Input
                  type="date"
                  value={formData.invoiceDate || ""}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                <Input
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as "paid" | "unpaid" | "overdue" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">{isAr ? "مدفوعة" : "Paid"}</SelectItem>
                  <SelectItem value="unpaid">{isAr ? "غير مدفوعة" : "Unpaid"}</SelectItem>
                  <SelectItem value="overdue">{isAr ? "متأخرة" : "Overdue"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المبلغ" : "Amount"}</Label>
              <Input
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={isAr ? "مبلغ الفاتورة" : "Invoice amount"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isAr ? "وصف الفاتورة" : "Invoice description"}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{isAr ? "ملف الفاتورة" : "Invoice File"}</Label>
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
                  {isAr ? "رفع ملف الفاتورة" : "Upload Invoice File"}
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
              {editingInvoice
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
            <DialogTitle>{isAr ? "معاينة الفاتورة" : "Invoice Preview"}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="py-4">
              <div className="text-center p-4 bg-orange-500/10 rounded-lg mb-4">
                <Receipt className="h-16 w-16 mx-auto text-orange-500 mb-2" />
                <p className="font-mono text-sm text-muted-foreground">{previewInvoice.refNo}</p>
                <h3 className="font-bold text-lg mt-1">{previewInvoice.title}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {getStatusBadge(previewInvoice.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><span className="text-muted-foreground">{isAr ? "المورد:" : "Vendor:"}</span> {previewInvoice.vendor}</div>
                <div><span className="text-muted-foreground">{isAr ? "القسم:" : "Department:"}</span> {previewInvoice.department}</div>
                <div><span className="text-muted-foreground">{isAr ? "تاريخ الفاتورة:" : "Invoice Date:"}</span> {previewInvoice.invoiceDate}</div>
                <div><span className="text-muted-foreground">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</span> {previewInvoice.dueDate}</div>
                <div><span className="text-muted-foreground">{isAr ? "المبلغ:" : "Amount:"}</span> {previewInvoice.amount}</div>
              </div>
              
              {previewInvoice.file?.url && previewInvoice.file.url !== '#' ? (
                <UniversalFileViewer
                  fileName={previewInvoice.file.name}
                  fileUrl={previewInvoice.file.url}
                  thumbnailUrl={previewInvoice.file.thumbnail}
                  fileType={previewInvoice.file.type}
                  fileSize={previewInvoice.file.size}
                  isAr={isAr}
                  onPrint={() => handlePrint(previewInvoice)}
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
            {previewInvoice?.file?.url && previewInvoice.file.url !== '#' && (
              <Button onClick={() => handlePrint(previewInvoice)}>
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

"use client";

import { useMemo, useState } from "react";
import { useData, type DocumentItem } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plus, Search, Edit, Trash2, Calendar, Building2, DollarSign, MoreHorizontal, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type InvoiceStatus = "paid" | "unpaid" | "overdue";

type Invoice = {
  id: string;
  refNo: string;
  title: string;
  vendor: string;
  department: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  amount: string;
  description: string;
};

function toInvoice(doc: DocumentItem): Invoice {
  return {
    id: doc.id,
    refNo: doc.refNo || "",
    title: doc.title || "",
    vendor: doc.vendor || "",
    department: doc.department || "",
    invoiceDate: doc.date || "",
    dueDate: doc.expiryDate || "",
    status: (doc.status || "unpaid") as InvoiceStatus,
    amount: doc.amount || "",
    description: doc.description || "",
  };
}

export default function AdminInvoices() {
  const { settings, departments, hasPermission, documents, addDocument, updateDocument, deleteDocument } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");

  const invoices = useMemo(
    () => documents.filter((doc) => ["invoice", "invoices"].includes(String(doc.docType || "").toLowerCase())).map(toInvoice),
    [documents],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({ status: "unpaid" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((invoice) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return invoice.title.toLowerCase().includes(q) || invoice.vendor.toLowerCase().includes(q) || invoice.refNo.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    setEditingInvoice(null);
    setFormData({ status: "unpaid", invoiceDate: new Date().toISOString().slice(0, 10) });
    setShowDialog(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData(invoice);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.vendor?.trim()) {
      toast.error(isAr ? "العنوان والمورد مطلوبان" : "Title and vendor are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        docType: "invoice",
        refNo: formData.refNo?.trim() || `INV-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`,
        title: formData.title.trim(),
        vendor: formData.vendor.trim(),
        department: formData.department || "",
        date: formData.invoiceDate || new Date().toISOString().slice(0, 10),
        expiryDate: formData.dueDate || "",
        status: formData.status || "unpaid",
        category: "Invoice",
        description: formData.description || "",
        amount: formData.amount || "",
        metadata: { source: "invoices-page" },
      };

      if (editingInvoice) {
        await updateDocument(editingInvoice.id, payload);
        toast.success(isAr ? "تم تحديث الفاتورة وحفظها" : "Invoice updated and saved");
      } else {
        await addDocument(payload);
        toast.success(isAr ? "تم إضافة الفاتورة وحفظها" : "Invoice added and saved");
      }
      setEditingInvoice(null);
      setShowDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(isAr ? "تعذر حفظ الفاتورة" : "Unable to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل تريد حذف هذه الفاتورة نهائياً؟" : "Delete this invoice permanently?")) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      toast.success(isAr ? "تم حذف الفاتورة نهائياً" : "Invoice deleted permanently");
    } catch (error) {
      console.error(error);
      toast.error(isAr ? "تعذر حذف الفاتورة" : "Unable to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      unpaid: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      overdue: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    const labels: Record<InvoiceStatus, string> = {
      paid: isAr ? "مدفوعة" : "Paid",
      unpaid: isAr ? "غير مدفوعة" : "Unpaid",
      overdue: isAr ? "متأخرة" : "Overdue",
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-orange-500" />
            {isAr ? "الفواتير" : "Invoices"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "الفواتير المحفوظة فعلياً في قاعدة البيانات" : "Invoices stored permanently in the database"}
          </p>
        </div>
        {canEdit && <Button className="gap-2" onClick={handleAdd}><Plus className="h-4 w-4" />{isAr ? "فاتورة جديدة" : "New Invoice"}</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={isAr ? "بحث في الفواتير..." : "Search invoices..."} className="ps-10" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? "قائمة الفواتير" : "Invoices List"}</CardTitle></CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد فواتير محفوظة حالياً" : "No saved invoices yet"}</p>
              {canEdit && <Button variant="outline" className="mt-4" onClick={handleAdd}>{isAr ? "إضافة فاتورة" : "Add Invoice"}</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><Receipt className="h-6 w-6 text-orange-500" /></div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && <DropdownMenuItem onClick={() => handleEdit(invoice)}><Edit className="h-4 w-4 me-2" />{isAr ? "تعديل" : "Edit"}</DropdownMenuItem>}
                        {canDelete && <DropdownMenuItem disabled={deletingId === invoice.id} onClick={() => void handleDelete(invoice.id)} className="text-red-500"><Trash2 className="h-4 w-4 me-2" />{isAr ? "حذف" : "Delete"}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">{getStatusBadge(invoice.status)}</div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">{invoice.refNo}</p>
                  <h3 className="font-medium truncate">{invoice.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Building2 className="h-3.5 w-3.5" /><span className="truncate">{invoice.vendor}</span></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Calendar className="h-3.5 w-3.5" /><span>{isAr ? "الاستحقاق:" : "Due:"} {invoice.dueDate || "-"}</span></div>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium"><DollarSign className="h-3.5 w-3.5" />{invoice.amount || "-"}</div>
                  {invoice.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{invoice.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingInvoice ? (isAr ? "تعديل الفاتورة" : "Edit Invoice") : (isAr ? "فاتورة جديدة" : "New Invoice")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{isAr ? "رقم الفاتورة" : "Reference No."}</Label><Input value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} placeholder={isAr ? "يولد تلقائياً إذا ترك فارغاً" : "Auto-generated if empty"} /></div>
            <div className="space-y-2"><Label>{isAr ? "العنوان" : "Title"}</Label><Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isAr ? "المورد" : "Vendor"}</Label><Input value={formData.vendor || ""} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isAr ? "القسم" : "Department"}</Label><Select value={formData.department || ""} onValueChange={(value) => setFormData({ ...formData, department: value })}><SelectTrigger><SelectValue placeholder={isAr ? "اختر القسم" : "Select department"} /></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>{isAr ? "تاريخ الفاتورة" : "Invoice date"}</Label><Input type="date" value={formData.invoiceDate || ""} onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} /></div><div className="space-y-2"><Label>{isAr ? "تاريخ الاستحقاق" : "Due date"}</Label><Input type="date" value={formData.dueDate || ""} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={formData.status || "unpaid"} onValueChange={(value) => setFormData({ ...formData, status: value as InvoiceStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">{isAr ? "مدفوعة" : "Paid"}</SelectItem><SelectItem value="unpaid">{isAr ? "غير مدفوعة" : "Unpaid"}</SelectItem><SelectItem value="overdue">{isAr ? "متأخرة" : "Overdue"}</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>{isAr ? "المبلغ" : "Amount"}</Label><Input value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="25,000 SAR" /></div>
            <div className="space-y-2"><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button disabled={saving} onClick={() => void handleSave()}><Save className="h-4 w-4 me-2" />{saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

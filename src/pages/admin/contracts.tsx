"use client";

import { useMemo, useState } from "react";
import { useData, type DocumentItem } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Plus, Search, Edit, Trash2, FileText, MoreHorizontal, Calendar, Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ContractStatus = "active" | "expired" | "pending";

type Contract = {
  id: string;
  refNo: string;
  title: string;
  vendor: string;
  department: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  value: string;
  description: string;
};

function toContract(doc: DocumentItem): Contract {
  return {
    id: doc.id,
    refNo: doc.refNo || "",
    title: doc.title || "",
    vendor: doc.vendor || "",
    department: doc.department || "",
    startDate: doc.date || "",
    endDate: doc.expiryDate || "",
    status: (doc.status || "active") as ContractStatus,
    value: doc.amount || "",
    description: doc.description || "",
  };
}

export default function AdminContracts() {
  const { settings, departments, hasPermission, documents, addDocument, updateDocument, deleteDocument } = useData();
  const isAr = settings.language === "ar";
  const canEdit = hasPermission("documents", "create");
  const canDelete = hasPermission("documents", "delete");

  const contracts = useMemo(
    () => documents.filter((doc) => ["contract", "contracts"].includes(String(doc.docType || "").toLowerCase())).map(toContract),
    [documents],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Partial<Contract>>({ status: "active" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredContracts = contracts.filter((contract) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return contract.title.toLowerCase().includes(q) || contract.vendor.toLowerCase().includes(q) || contract.refNo.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    setEditingContract(null);
    setFormData({ status: "active", startDate: new Date().toISOString().slice(0, 10) });
    setShowDialog(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData(contract);
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
        docType: "contract",
        refNo: formData.refNo?.trim() || `CTR-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`,
        title: formData.title.trim(),
        vendor: formData.vendor.trim(),
        department: formData.department || "",
        date: formData.startDate || new Date().toISOString().slice(0, 10),
        expiryDate: formData.endDate || "",
        status: formData.status || "active",
        category: "Contract",
        description: formData.description || "",
        amount: formData.value || "",
        metadata: { source: "contracts-page" },
      };

      if (editingContract) {
        await updateDocument(editingContract.id, payload);
        toast.success(isAr ? "تم تحديث العقد وحفظه" : "Contract updated and saved");
      } else {
        await addDocument(payload);
        toast.success(isAr ? "تم إضافة العقد وحفظه" : "Contract added and saved");
      }
      setEditingContract(null);
      setShowDialog(false);
    } catch (error) {
      console.error(error);
      toast.error(isAr ? "تعذر حفظ العقد" : "Unable to save contract");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل تريد حذف هذا العقد نهائياً؟" : "Delete this contract permanently?")) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      toast.success(isAr ? "تم حذف العقد نهائياً" : "Contract deleted permanently");
    } catch (error) {
      console.error(error);
      toast.error(isAr ? "تعذر حذف العقد" : "Unable to delete contract");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    const styles: Record<ContractStatus, string> = {
      active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      expired: "bg-red-500/10 text-red-600 border-red-500/20",
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };
    const labels: Record<ContractStatus, string> = {
      active: isAr ? "نشط" : "Active",
      expired: isAr ? "منتهي" : "Expired",
      pending: isAr ? "معلق" : "Pending",
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-indigo-500" />
            {isAr ? "العقود" : "Contracts"}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            {isAr ? "العقود المحفوظة فعلياً في قاعدة البيانات" : "Contracts stored permanently in the database"}
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2 text-[12px]" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            {isAr ? "عقد جديد" : "New Contract"}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isAr ? "بحث في العقود..." : "Search contracts..."}
          className="ps-10 text-[12px]"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-[14px]">{isAr ? "قائمة العقود" : "Contracts List"}</CardTitle></CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد عقود محفوظة حالياً" : "No saved contracts yet"}</p>
              {canEdit && <Button variant="outline" className="mt-4" onClick={handleAdd}>{isAr ? "إضافة عقد" : "Add Contract"}</Button>}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && <DropdownMenuItem onClick={() => handleEdit(contract)}><Edit className="h-4 w-4 me-2" />{isAr ? "تعديل" : "Edit"}</DropdownMenuItem>}
                        {canDelete && (
                          <DropdownMenuItem disabled={deletingId === contract.id} onClick={() => void handleDelete(contract.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4 me-2" />{isAr ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-2">{getStatusBadge(contract.status)}</div>
                  <p className="font-mono text-xs text-muted-foreground mb-1">{contract.refNo}</p>
                  <h3 className="font-medium truncate">{contract.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Building2 className="h-3.5 w-3.5" /><span className="truncate">{contract.vendor}</span></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Calendar className="h-3.5 w-3.5" /><span>{contract.startDate || "-"} - {contract.endDate || "-"}</span></div>
                  <div className="mt-3 text-sm font-medium">{contract.value || "-"}</div>
                  {contract.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{contract.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingContract ? (isAr ? "تعديل العقد" : "Edit Contract") : (isAr ? "عقد جديد" : "New Contract")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{isAr ? "رقم العقد" : "Reference No."}</Label><Input value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} placeholder={isAr ? "يولد تلقائياً إذا ترك فارغاً" : "Auto-generated if empty"} /></div>
            <div className="space-y-2"><Label>{isAr ? "العنوان" : "Title"}</Label><Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isAr ? "المورد / المتعاقد" : "Vendor / Contractor"}</Label><Input value={formData.vendor || ""} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} /></div>
            <div className="space-y-2"><Label>{isAr ? "القسم" : "Department"}</Label><Select value={formData.department || ""} onValueChange={(value) => setFormData({ ...formData, department: value })}><SelectTrigger><SelectValue placeholder={isAr ? "اختر القسم" : "Select department"} /></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>{isAr ? "تاريخ البداية" : "Start date"}</Label><Input type="date" value={formData.startDate || ""} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div><div className="space-y-2"><Label>{isAr ? "تاريخ النهاية" : "End date"}</Label><Input type="date" value={formData.endDate || ""} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={formData.status || "active"} onValueChange={(value) => setFormData({ ...formData, status: value as ContractStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{isAr ? "نشط" : "Active"}</SelectItem><SelectItem value="pending">{isAr ? "معلق" : "Pending"}</SelectItem><SelectItem value="expired">{isAr ? "منتهي" : "Expired"}</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>{isAr ? "القيمة" : "Value"}</Label><Input value={formData.value || ""} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="150,000 SAR" /></div>
            <div className="space-y-2"><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button><Button disabled={saving} onClick={() => void handleSave()}><Save className="h-4 w-4 me-2" />{saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

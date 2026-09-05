import { useMemo, useState } from "react";
import { useData, type NCR, type NCRStatus } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Plus, Search, FileWarning, Download, Trash2, MoreHorizontal, Filter, CheckCircle, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const emptyForm = () => ({
  department: "",
  location: "",
  description: "",
  severity: "medium",
  date: new Date().toISOString().slice(0, 10),
});

export default function AdminNCR() {
  const { settings, ncrs, addNCR, updateNCR, deleteNCR } = useData();
  const isAr = settings.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [newNcr, setNewNcr] = useState(emptyForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredNcrs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...ncrs]
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .filter((n) => {
        if (!q) return true;
        return [n.refNo, n.description, n.department, n.location, n.status, n.severity]
          .some((value) => String(value || "").toLowerCase().includes(q));
      });
  }, [ncrs, searchQuery]);

  const handleExportCSV = () => {
    const headers = ["Reference", "Date", "Department", "Location", "Description", "Severity", "Status"];
    const rows = filteredNcrs.map((n) => [
      n.refNo,
      n.date,
      n.department,
      n.location || "",
      `"${String(n.description || "").replace(/"/g, '""')}"`,
      n.severity,
      n.status,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ncr_reports_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    toast.success(isAr ? "تم تصدير تقارير NCR" : "NCR reports exported");
  };

  const handlePrint = () => window.print();

  const handleAddNcr = async () => {
    if (!newNcr.department.trim() || !newNcr.description.trim()) {
      toast.error(isAr ? "القسم والوصف مطلوبان" : "Department and description are required");
      return;
    }
    setSaving(true);
    try {
      const saved = await addNCR({
        department: newNcr.department.trim(),
        location: newNcr.location.trim() || null,
        description: newNcr.description.trim(),
        severity: newNcr.severity,
        date: newNcr.date,
        status: "draft",
      });
      if (!saved?.id) throw new Error("NCR was not returned after save");
      setNewNcr(emptyForm());
      setIsDialogOpen(false);
      toast.success(isAr ? `تم حفظ ${saved.refNo} في قاعدة البيانات` : `${saved.refNo} saved to the database`);
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حفظ NCR" : "Unable to save NCR"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNcr = async (ncr: NCR) => {
    const confirmed = window.confirm(
      isAr ? `هل تريد حذف ${ncr.refNo} نهائيًا؟` : `Delete ${ncr.refNo} permanently?`,
    );
    if (!confirmed) return;
    setBusyId(ncr.id);
    try {
      await deleteNCR(ncr.id);
      toast.success(isAr ? "تم حذف NCR" : "NCR deleted");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حذف NCR" : "Unable to delete NCR"));
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (ncr: NCR, status: NCRStatus) => {
    setBusyId(ncr.id);
    try {
      await updateNCR(ncr.id, { status });
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر تحديث الحالة" : "Unable to update status"));
    } finally {
      setBusyId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      low: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
      high: "bg-orange-500/15 text-orange-700 border-orange-500/30",
      critical: "bg-red-500/15 text-red-700 border-red-500/30",
    };
    const labels: Record<string, string> = {
      low: isAr ? "منخفض" : "Low",
      medium: isAr ? "متوسط" : "Medium",
      high: isAr ? "عالي" : "High",
      critical: isAr ? "حرج" : "Critical",
    };
    return <Badge variant="outline" className={styles[severity] || ""}>{labels[severity] || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-500/15 text-slate-600 border-slate-500/30",
      submitted: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      assigned: "bg-violet-500/15 text-violet-600 border-violet-500/30",
      in_progress: "bg-amber-500/15 text-amber-700 border-amber-500/30",
      closed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    };
    const labels: Record<string, string> = {
      draft: isAr ? "مسودة" : "Draft",
      submitted: isAr ? "مرفوع" : "Submitted",
      assigned: isAr ? "مُسند" : "Assigned",
      in_progress: isAr ? "قيد التنفيذ" : "In Progress",
      closed: isAr ? "مغلق" : "Closed",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            {isAr ? "عدم المطابقة (NCR)" : "Non-Conformance Reports"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "تقارير NCR محفوظة ومزامنة مباشرة مع قاعدة البيانات" : "NCR records persisted and synchronized with the database"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            {isAr ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {isAr ? "طباعة" : "Print"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isAr ? "NCR جديد" : "New NCR"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl" dir={isAr ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle>{isAr ? "إنشاء تقرير NCR" : "Create NCR"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isAr ? "القسم *" : "Department *"}</Label>
                  <Input value={newNcr.department} onChange={(e) => setNewNcr({ ...newNcr, department: e.target.value })} placeholder={isAr ? "مثال: Production" : "e.g. Production"} />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الموقع" : "Location"}</Label>
                  <Input value={newNcr.location} onChange={(e) => setNewNcr({ ...newNcr, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "التاريخ" : "Date"}</Label>
                  <Input type="date" value={newNcr.date} onChange={(e) => setNewNcr({ ...newNcr, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "مستوى الخطورة" : "Severity"}</Label>
                  <Select value={newNcr.severity} onValueChange={(value) => setNewNcr({ ...newNcr, severity: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{isAr ? "منخفض" : "Low"}</SelectItem>
                      <SelectItem value="medium">{isAr ? "متوسط" : "Medium"}</SelectItem>
                      <SelectItem value="high">{isAr ? "عالي" : "High"}</SelectItem>
                      <SelectItem value="critical">{isAr ? "حرج" : "Critical"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{isAr ? "وصف عدم المطابقة *" : "Non-conformance Description *"}</Label>
                  <Textarea value={newNcr.description} onChange={(e) => setNewNcr({ ...newNcr, description: e.target.value })} rows={5} />
                </div>
                <Button onClick={handleAddNcr} className="sm:col-span-2" disabled={saving}>
                  {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ NCR" : "Save NCR")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={isAr ? "بحث بالرقم أو القسم أو الوصف..." : "Search reference, department or description..."} className="ps-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Filter className="h-4 w-4" />
          {filteredNcrs.length}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? `قائمة NCR (${filteredNcrs.length})` : `NCR List (${filteredNcrs.length})`}</CardTitle></CardHeader>
        <CardContent>
          {filteredNcrs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>{isAr ? "لا توجد تقارير NCR محفوظة" : "No saved NCR records"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNcrs.map((ncr) => (
                <div key={ncr.id} className="flex flex-col gap-4 p-4 border rounded-xl hover:bg-muted/40 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileWarning className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold font-mono">{ncr.refNo}</p>
                      <p className="text-sm text-muted-foreground break-words">{ncr.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ncr.date} · {ncr.department}{ncr.location ? ` · ${ncr.location}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(ncr.severity)}
                    {getStatusBadge(ncr.status)}
                    {busyId === ncr.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr, "submitted")}>{isAr ? "رفع التقرير" : "Submit"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr, "assigned")}>{isAr ? "إسناد" : "Assign"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr, "in_progress")}>{isAr ? "قيد التنفيذ" : "In Progress"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(ncr, "closed")}>
                          <CheckCircle className="h-4 w-4 me-2" />{isAr ? "إغلاق" : "Close"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteNcr(ncr)} className="text-red-600">
                          <Trash2 className="h-4 w-4 me-2" />{isAr ? "حذف" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

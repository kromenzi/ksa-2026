import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ViolationRecord {
  id: string;
  refNo: string;
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  occupation: string;
  violation: string;
  notes: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  status: string;
  escalationId?: string | null;
  escalatedAt?: string | null;
  createdAt?: string;
  repeatCount: number;
  sameViolationCount: number;
  isRepeat: boolean;
  isSameViolationRepeat: boolean;
}

interface OffenderSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  occupation: string;
  count: number;
  escalated: number;
  latestViolation: string;
  latestDate: string;
}

const initialForm = () => ({
  employeeName: "",
  employeeId: "",
  department: "",
  occupation: "",
  violation: "",
  notes: "",
  severity: "medium",
  date: new Date().toISOString().slice(0, 10),
});

function severityClasses(severity: string) {
  if (severity === "critical") return "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-300";
  if (severity === "high") return "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-300";
  if (severity === "low") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  return "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function AdminEmployeeViolations() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const { data: violations = [], isLoading, isError } = useQuery<ViolationRecord[]>({
    queryKey: ["/api/employee-violations"],
    queryFn: async () => {
      const response = await fetch("/api/employee-violations", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load employee violations");
      const rows = (await response.json()) as any[];
      const employeeCounts = new Map<string, number>();
      const sameViolationCounts = new Map<string, number>();
      const employeeKey = (item: any) => String(item.employeeId || item.employeeName || "").trim().toLocaleLowerCase();
      const violationText = (item: any) => String(item.violation || item.violationDescription || "").trim();

      for (const item of rows) {
        const key = employeeKey(item);
        if (!key) continue;
        employeeCounts.set(key, (employeeCounts.get(key) || 0) + 1);
        const sameKey = `${key}::${violationText(item).toLocaleLowerCase()}`;
        sameViolationCounts.set(sameKey, (sameViolationCounts.get(sameKey) || 0) + 1);
      }

      return rows.map((item: any) => {
        const key = employeeKey(item);
        const normalizedViolation = violationText(item);
        const repeatCount = key ? employeeCounts.get(key) || 1 : 1;
        const sameViolationCount = key ? sameViolationCounts.get(`${key}::${normalizedViolation.toLocaleLowerCase()}`) || 1 : 1;
        return {
          ...item,
          department: item.department || item.data?.department || "",
          occupation: item.occupation || item.position || item.data?.occupation || "",
          violation: normalizedViolation,
          notes: item.notes || item.data?.notes || "",
          severity: item.severity || item.data?.severity || "medium",
          repeatCount,
          sameViolationCount,
          isRepeat: repeatCount > 1,
          isSameViolationRepeat: sameViolationCount > 1,
        } as ViolationRecord;
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/employee-violations", {
        ...form,
        refNo: `VIO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
        status: "open",
      });
      return response.json();
    },
    onSuccess: async () => {
      toast.success(t("تم تسجيل مخالفة السلامة", "Safety violation recorded"));
      setForm(initialForm());
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: ViolationRecord) => {
      const response = await apiRequest("DELETE", `/api/employee-violations/${encodeURIComponent(item.id)}`);
      return response.json();
    },
    onSuccess: async () => {
      toast.success(t("تم حذف المخالفة", "Violation deleted"));
      await queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const escalateMutation = useMutation({
    mutationFn: async (item: ViolationRecord) => {
      const level = item.repeatCount >= 3 ? "Level 3 - HSE Manager / HR" : "Level 2 - Department Manager";
      const severity = item.repeatCount >= 3 ? "CRITICAL" : "HIGH";
      const reason = `Employee safety violation. Employee: ${item.employeeName} (${item.employeeId}). Violation: ${item.violation}. Total recorded violations: ${item.repeatCount}.`;
      const escalationResponse = await apiRequest("POST", "/api/escalations", {
        title: `Safety Violation - ${item.employeeName}`,
        source: `SAFETY-VIOLATION:${item.id}`,
        severity,
        level,
        department: item.department || "HSE",
        responsible: "Department Manager / HSE",
        reason,
      });
      const escalation = await escalationResponse.json();
      const violationResponse = await apiRequest("PATCH", `/api/employee-violations/${encodeURIComponent(item.id)}`, {
        status: "escalated",
        escalationId: escalation.id,
        escalatedAt: new Date().toISOString(),
      });
      return { escalation, violation: await violationResponse.json() };
    },
    onSuccess: async () => {
      toast.success(t("تم إنشاء التصعيد الإداري وربطه بالمخالفة", "Administrative escalation created and linked"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/escalations"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handlePrintViolation = (item: ViolationRecord) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error(t("تعذر فتح نافذة الطباعة", "Unable to open print window"));
      return;
    }
    const dir = isAr ? "rtl" : "ltr";
    printWindow.document.write(`<!doctype html>
<html dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(item.refNo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Tahoma, sans-serif; color: #111827; margin: 0; }
  .head { border-bottom: 3px solid #0f4c81; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { margin: 0; font-size: 22px; } .sub { color: #64748b; margin-top: 5px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; min-height: 48px; }
  .wide { grid-column: 1 / -1; }
  .label { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
  .value { white-space: pre-wrap; font-size: 14px; font-weight: 600; }
  .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <h1>${isAr ? "تقرير مخالفة سلامة موظف" : "Employee Safety Violation Report"}</h1>
    <div class="sub">${escapeHtml(item.refNo)}</div>
  </div>
  <div class="grid">
    <div class="field"><span class="label">${t("التاريخ", "Date")}</span><div class="value">${escapeHtml(item.date)}</div></div>
    <div class="field"><span class="label">${t("الحالة", "Status")}</span><div class="value">${escapeHtml(item.status)}</div></div>
    <div class="field"><span class="label">${t("اسم الموظف", "Employee Name")}</span><div class="value">${escapeHtml(item.employeeName)}</div></div>
    <div class="field"><span class="label">${t("الرقم الوظيفي", "Employee ID")}</span><div class="value">${escapeHtml(item.employeeId)}</div></div>
    <div class="field"><span class="label">${t("القسم", "Department")}</span><div class="value">${escapeHtml(item.department)}</div></div>
    <div class="field"><span class="label">${t("المهنة", "Occupation")}</span><div class="value">${escapeHtml(item.occupation)}</div></div>
    <div class="field"><span class="label">${t("درجة المخالفة", "Severity")}</span><div class="value">${escapeHtml(item.severity)}</div></div>
    <div class="field"><span class="label">${t("عدد المخالفات", "Violation Count")}</span><div class="value">${escapeHtml(item.repeatCount)}</div></div>
    <div class="field wide"><span class="label">${t("المخالفة", "Violation")}</span><div class="value">${escapeHtml(item.violation)}</div></div>
    <div class="field wide"><span class="label">${t("الملاحظات", "Notes")}</span><div class="value">${escapeHtml(item.notes || "—")}</div></div>
  </div>
  <div class="footer">UTEC Safety Board · ${new Date().toLocaleString(isAr ? "ar-SA" : "en-US")}</div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const offenders = useMemo<OffenderSummary[]>(() => {
    const map = new Map<string, OffenderSummary>();
    for (const item of violations) {
      const key = item.employeeId || item.employeeName;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          department: item.department,
          occupation: item.occupation,
          count: item.repeatCount || 1,
          escalated: item.escalationId ? 1 : 0,
          latestViolation: item.violation,
          latestDate: item.date,
        });
      } else if (item.escalationId) {
        existing.escalated += 1;
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate));
  }, [violations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return violations.filter((item) => {
      if (repeatOnly && !item.isRepeat) return false;
      if (!q) return true;
      return [item.refNo, item.employeeName, item.employeeId, item.department, item.occupation, item.violation, item.notes]
        .some((value) => String(value || "").toLocaleLowerCase().includes(q));
    });
  }, [violations, search, repeatOnly]);

  const uniqueEmployees = offenders.length;
  const repeatOffenders = offenders.filter((item) => item.count > 1).length;
  const escalatedCount = violations.filter((item) => Boolean(item.escalationId)).length;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-600"><ShieldAlert className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("مخالفات السلامة للموظفين", "Employee Safety Violations")}</h1>
              <p className="text-sm text-muted-foreground">{t("سجل مركزي للمخالفات مع الطباعة والحذف والتصعيد الإداري.", "Centralized violation records with print, delete and administrative escalation.")}</p>
            </div>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{t("تسجيل مخالفة", "Record Violation")}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("قالب مخالفة سلامة موظف", "Employee Safety Violation Form")}</DialogTitle>
              <DialogDescription>{t("أدخل بيانات الموظف والمخالفة ثم احفظ السجل.", "Enter employee and violation details, then save the record.")}</DialogDescription>
            </DialogHeader>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
              <div className="space-y-2"><Label htmlFor="employeeName">{t("اسم الموظف", "Employee Name")}</Label><Input id="employeeName" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="employeeId">{t("الرقم الوظيفي", "Employee ID")}</Label><Input id="employeeId" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="department">{t("القسم", "Department")}</Label><Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="occupation">{t("المهنة", "Occupation")}</Label><Input id="occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} required /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="violation">{t("المخالفة", "Violation")}</Label><Textarea id="violation" value={form.violation} onChange={(e) => setForm({ ...form, violation: e.target.value })} rows={3} required /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">{t("ملاحظة", "Notes")}</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="space-y-2">
                <Label>{t("درجة المخالفة", "Severity")}</Label>
                <Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("منخفضة", "Low")}</SelectItem>
                    <SelectItem value="medium">{t("متوسطة", "Medium")}</SelectItem>
                    <SelectItem value="high">{t("عالية", "High")}</SelectItem>
                    <SelectItem value="critical">{t("حرجة", "Critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="date">{t("التاريخ", "Date")}</Label><Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t("إلغاء", "Cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ المخالفة", "Save Violation")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t("إجمالي المخالفات", "Total Violations")}</CardTitle><ShieldAlert className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{violations.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t("الموظفون", "Employees")}</CardTitle><Users className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{uniqueEmployees}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t("مخالفون متكررون", "Repeat Offenders")}</CardTitle><UserRoundX className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{repeatOffenders}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t("مصعّدة", "Escalated")}</CardTitle><ArrowUpRight className="h-4 w-4 text-violet-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{escalatedCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("سجل المخالفات", "Violations Register")}</CardTitle>
          <CardDescription>{t("يمكن طباعة كل مخالفة أو حذفها للمصرح لهم.", "Each violation can be printed or deleted by authorized users.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث في المخالفات...", "Search violations...")} /></div>
            <Button variant={repeatOnly ? "default" : "outline"} onClick={() => setRepeatOnly((value) => !value)}><AlertTriangle className="me-2 h-4 w-4" />{t("المتكررة فقط", "Repeat only")}</Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] })}><RefreshCcw className="me-2 h-4 w-4" />{t("تحديث", "Refresh")}</Button>
          </div>

          {isLoading ? <div className="py-10 text-center text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div> : isError ? <div className="py-10 text-center text-red-500">{t("تعذر تحميل المخالفات", "Unable to load violations")}</div> : filtered.length === 0 ? <div className="py-10 text-center text-muted-foreground">{t("لا توجد مخالفات", "No violations found")}</div> : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("المرجع", "Reference")}</th>
                    <th className="px-4 py-3 text-start">{t("الموظف", "Employee")}</th>
                    <th className="px-4 py-3 text-start">{t("المخالفة", "Violation")}</th>
                    <th className="px-4 py-3 text-start">{t("الخطورة", "Severity")}</th>
                    <th className="px-4 py-3 text-start">{t("التكرار", "Repeat")}</th>
                    <th className="px-4 py-3 text-start">{t("الحالة", "Status")}</th>
                    <th className="px-4 py-3 text-start">{t("الإجراءات", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr key={item.id} className={item.isRepeat ? "bg-red-500/[0.035]" : ""}>
                      <td className="px-4 py-4 align-top"><div className="font-mono text-xs font-semibold">{item.refNo}</div><div className="mt-1 text-xs text-muted-foreground">{item.date}</div></td>
                      <td className="px-4 py-4 align-top"><div className="font-medium">{item.employeeName}</div><div className="text-xs text-muted-foreground">{item.employeeId} · {item.department}</div><div className="text-xs text-muted-foreground">{item.occupation}</div></td>
                      <td className="px-4 py-4 align-top max-w-[320px]"><div className="font-medium whitespace-pre-wrap">{item.violation}</div>{item.notes && <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</div>}</td>
                      <td className="px-4 py-4 align-top"><Badge variant="outline" className={severityClasses(item.severity)}>{item.severity}</Badge></td>
                      <td className="px-4 py-4 align-top">{item.isRepeat ? <Badge variant="destructive">{item.repeatCount}×</Badge> : <Badge variant="secondary">1×</Badge>}</td>
                      <td className="px-4 py-4 align-top">{item.escalationId ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />{t("مصعّد", "Escalated")}</Badge> : <Badge variant="outline">{item.status}</Badge>}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handlePrintViolation(item)}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Button>
                          <Button size="sm" variant="outline" className="gap-1.5" disabled={Boolean(item.escalationId) || escalateMutation.isPending} onClick={() => { const confirmed = window.confirm(t(`هل تريد تصعيد مخالفة ${item.employeeName} للإدارة؟`, `Escalate ${item.employeeName}'s safety violation to management?`)); if (confirmed) escalateMutation.mutate(item); }}><ArrowUpRight className="h-4 w-4" />{item.escalationId ? t("مصعّد", "Escalated") : t("تصعيد", "Escalate")}</Button>
                          {canDelete && <Button size="sm" variant="destructive" className="gap-1.5" disabled={deleteMutation.isPending} onClick={() => { const confirmed = window.confirm(t(`هل تريد حذف المخالفة ${item.refNo} نهائيًا؟`, `Delete violation ${item.refNo} permanently?`)); if (confirmed) deleteMutation.mutate(item); }}><Trash2 className="h-4 w-4" />{t("حذف", "Delete")}</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

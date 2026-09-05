import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
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

export default function AdminEmployeeViolations() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const { data: violations = [], isLoading, isError } = useQuery<ViolationRecord[]>({
    queryKey: ["/api/employee-violations"],
    queryFn: async () => {
      const response = await fetch("/api/employee-violations", {
        credentials: "include",
        cache: "no-store",
      });
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
      toast.success(isAr ? "تم تسجيل مخالفة السلامة" : "Safety violation recorded");
      setForm(initialForm());
      setIsCreateOpen(false);
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
      toast.success(isAr ? "تم إنشاء التصعيد الإداري وربطه بالمخالفة" : "Administrative escalation created and linked");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employee-violations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/escalations"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
      return [
        item.refNo,
        item.employeeName,
        item.employeeId,
        item.department,
        item.occupation,
        item.violation,
        item.notes,
      ].some((value) => String(value || "").toLocaleLowerCase().includes(q));
    });
  }, [violations, search, repeatOnly]);

  const uniqueEmployees = offenders.length;
  const repeatOffenders = offenders.filter((item) => item.count > 1).length;
  const escalatedCount = violations.filter((item) => Boolean(item.escalationId)).length;

  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("مخالفات السلامة للموظفين", "Employee Safety Violations")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("سجل مركزي للمخالفات، كشف المخالفين المتكررين، والتصعيد الإداري.", "Centralized violation records, repeat-offender detection and administrative escalation.")}
              </p>
            </div>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("تسجيل مخالفة", "Record Violation")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("قالب مخالفة سلامة موظف", "Employee Safety Violation Form")}</DialogTitle>
              <DialogDescription>
                {t("الحقول الأساسية: اسم الموظف، الرقم الوظيفي، القسم، المهنة، المخالفة والملاحظة.", "Core fields: employee name, employee ID, department, occupation, violation and notes.")}
              </DialogDescription>
            </DialogHeader>

            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="employeeName">{t("اسم الموظف", "Employee Name")}</Label>
                <Input id="employeeName" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">{t("الرقم الوظيفي", "Employee ID")}</Label>
                <Input id="employeeId" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">{t("القسم", "Department")}</Label>
                <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">{t("المهنة", "Occupation")}</Label>
                <Input id="occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="violation">{t("المخالفة", "Violation")}</Label>
                <Textarea id="violation" value={form.violation} onChange={(e) => setForm({ ...form, violation: e.target.value })} rows={3} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t("ملاحظة", "Notes")}</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="date">{t("التاريخ", "Date")}</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t("إلغاء", "Cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ المخالفة", "Save Violation")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("إجمالي المخالفات", "Total Violations")}</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{violations.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("الموظفون المخالفون", "Employees with Violations")}</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{uniqueEmployees}</div></CardContent>
        </Card>
        <Card className={repeatOffenders > 0 ? "border-red-500/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("مخالفون متكررون", "Repeat Offenders")}</CardTitle>
            <RefreshCcw className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{repeatOffenders}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("تصعيدات إدارية", "Administrative Escalations")}</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{escalatedCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRoundX className="h-5 w-5 text-red-500" />
            {t("لوحة المخالفين", "Offenders Dashboard")}
          </CardTitle>
          <CardDescription>{t("يعرض الموظفين حسب عدد المخالفات مع تمييز التكرار تلقائيًا.", "Employees ranked by violation count with automatic repeat-offender highlighting.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {offenders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("لا توجد مخالفات مسجلة حتى الآن.", "No violations recorded yet.")}</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {offenders.slice(0, 9).map((offender) => (
                <div key={offender.employeeId || offender.employeeName} className={`rounded-xl border p-4 ${offender.count > 1 ? "border-red-500/40 bg-red-500/5" : "bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{offender.employeeName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{offender.employeeId} · {offender.department}</div>
                    </div>
                    {offender.count > 1 ? (
                      <Badge className="gap-1 border border-red-500/40 bg-red-500/15 text-red-600 hover:bg-red-500/15 dark:text-red-300">
                        <RefreshCcw className="h-3 w-3" /> {t("متكرر", "Repeat")} ×{offender.count}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("مرة واحدة", "Single")}</Badge>
                    )}
                  </div>
                  <div className="mt-3 line-clamp-2 text-sm">{offender.latestViolation}</div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{offender.occupation}</span>
                    <span>{offender.latestDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{t("سجل مخالفات السلامة", "Safety Violations Register")}</CardTitle>
            <CardDescription>{t("سجل تفصيلي قابل للبحث والتصفية والتصعيد.", "Detailed searchable register with repeat detection and escalation controls.")}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-64">
              <Search className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <Input className={isAr ? "pr-9" : "pl-9"} placeholder={t("بحث بالاسم، الرقم، القسم أو المخالفة...", "Search name, ID, department or violation...")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button type="button" variant={repeatOnly ? "default" : "outline"} className="gap-2" onClick={() => setRepeatOnly((value) => !value)}>
              <RefreshCcw className="h-4 w-4" />
              {t("المتكررون فقط", "Repeat Only")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("جارٍ تحميل السجل...", "Loading register...")}</div>
          ) : isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">{t("تعذر تحميل مخالفات الموظفين.", "Unable to load employee violations.")}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("لا توجد نتائج مطابقة.", "No matching records.")}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("المرجع", "Reference")}</th>
                    <th className="px-4 py-3 text-start">{t("الموظف", "Employee")}</th>
                    <th className="px-4 py-3 text-start">{t("القسم / المهنة", "Department / Occupation")}</th>
                    <th className="px-4 py-3 text-start">{t("المخالفة", "Violation")}</th>
                    <th className="px-4 py-3 text-start">{t("ملاحظة", "Notes")}</th>
                    <th className="px-4 py-3 text-start">{t("الدرجة", "Severity")}</th>
                    <th className="px-4 py-3 text-start">{t("التكرار", "Repeat")}</th>
                    <th className="px-4 py-3 text-start">{t("الحالة", "Status")}</th>
                    <th className="px-4 py-3 text-start">{t("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr key={item.id} className={item.isRepeat ? "bg-red-500/[0.035]" : ""}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-mono text-xs font-semibold">{item.refNo}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.date}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold">{item.employeeName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.employeeId}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div>{item.department}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.occupation}</div>
                      </td>
                      <td className="max-w-sm px-4 py-4 align-top">
                        <div className="font-medium">{item.violation}</div>
                        {item.isSameViolationRepeat && (
                          <div className="mt-2 text-xs font-medium text-red-600">{t("نفس المخالفة متكررة", "Same violation repeated")} ×{item.sameViolationCount}</div>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4 align-top text-muted-foreground">{item.notes || "—"}</td>
                      <td className="px-4 py-4 align-top">
                        <Badge variant="outline" className={severityClasses(item.severity)}>{item.severity}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {item.isRepeat ? (
                          <Badge className="gap-1 border border-red-500/40 bg-red-500/15 text-red-600 hover:bg-red-500/15 dark:text-red-300">
                            <RefreshCcw className="h-3 w-3" /> {t("متكرر", "Repeat")} ×{item.repeatCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline">1</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {item.escalationId ? (
                          <Badge className="gap-1 border border-violet-500/40 bg-violet-500/15 text-violet-600 hover:bg-violet-500/15 dark:text-violet-300">
                            <CheckCircle2 className="h-3 w-3" /> {t("تم التصعيد", "Escalated")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("مفتوحة", "Open")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant={item.isRepeat ? "default" : "outline"}
                          className="gap-1.5"
                          disabled={Boolean(item.escalationId) || escalateMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              t(
                                `هل تريد تصعيد مخالفة ${item.employeeName} للإدارة؟`,
                                `Escalate ${item.employeeName}'s safety violation to management?`,
                              ),
                            );
                            if (confirmed) escalateMutation.mutate(item);
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          {item.escalationId ? t("مصعّد", "Escalated") : t("تصعيد إداري", "Escalate")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {repeatOffenders > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-semibold">{t("تنبيه المخالفات المتكررة", "Repeat Violation Alert")}</div>
            <div className="mt-1 text-muted-foreground">
              {t(`يوجد ${repeatOffenders} موظف/موظفين لديهم أكثر من مخالفة. يوصى بمراجعة الحالات المتكررة والتصعيد عند الحاجة.`, `${repeatOffenders} employee(s) have more than one violation. Review repeated cases and escalate when required.`)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

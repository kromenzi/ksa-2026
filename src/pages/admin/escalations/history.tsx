import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function downloadCsv(rows: any[], isAr: boolean) {
  const headers = isAr
    ? ["التاريخ والوقت", "رقم التصعيد", "المصدر", "المستوى", "المستخدم", "الإجراء", "الحالة", "التفاصيل"]
    : ["Date & Time", "Escalation No", "Source", "Level", "User", "Action", "Status", "Details"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const dataRows = rows.length
    ? rows.map(log => [log.date, log.id, log.source, log.level, log.user, log.action, log.status, log.details])
    : [[new Date().toISOString(), "—", "—", "—", "System", isAr ? "لا توجد سجلات" : "No records", "—", ""]];
  const csv = "\uFEFF" + [headers, ...dataRows].map(row => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `escalation-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
}

export default function EscalationHistory() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest("GET", "/api/escalations")
      .then(async response => {
        if (!response.ok) throw new Error((await response.text()) || "Unable to load escalation history");
        return response.json();
      })
      .then((escalations: any[]) => {
        if (cancelled) return;
        const rows = escalations.flatMap(esc => {
          const entries = Array.isArray(esc.history) && esc.history.length > 0
            ? esc.history
            : [{ action: "Escalation Created", status: esc.status, user: "System", date: esc.createdAt, details: esc.reason || "" }];
          return entries.map((entry: any, index: number) => ({
            id: `${esc.refNo || esc.id}-${entry.id || index}`,
            source: esc.source || esc.refNo || esc.id,
            level: esc.level || "Level 2 - Dept Manager",
            user: entry.user || "System",
            date: entry.date || esc.updatedAt || esc.createdAt,
            action: entry.action || "Status Update",
            status: entry.status || esc.status,
            details: entry.details || "",
          }));
        });
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(rows);
      })
      .catch(error => {
        if (!cancelled) toast.error(isAr ? "تعذر تحميل سجل التصعيدات" : "Unable to load escalation history", { description: error?.message || "Backend error" });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAr]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(log => [log.id, log.source, log.level, log.user, log.date, log.action, log.status, log.details].some((value: any) => String(value || "").toLowerCase().includes(q)));
  }, [history, searchQuery]);

  const handleExport = () => {
    downloadCsv(filteredHistory, isAr);
    toast.success(isAr ? "تم تصدير السجل بنجاح" : "History exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><History className="h-6 w-6 text-orange-500" />{isAr ? "سجل التصعيدات" : "Escalation History"}</h2><p className="text-sm text-muted-foreground mt-1">{isAr ? "مراجعة السجل الكامل لحركات التصعيد" : "Review the complete log of escalation movements"}</p></div>
        <Button type="button" variant="outline" className="gap-2" disabled={loading} onClick={handleExport}><Download className="h-4 w-4" />{isAr ? "تصدير السجل" : "Export Log"}</Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4"><CardTitle>{isAr ? "سجل الحركات" : "Movement Log"}</CardTitle><div className="relative w-72"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? "بحث..." : "Search..."} className="ps-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr ? "التاريخ والوقت" : "Date & Time"}</TableHead><TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead><TableHead>{isAr ? "المصدر" : "Source"}</TableHead><TableHead>{isAr ? "المستوى" : "Level"}</TableHead><TableHead>{isAr ? "المستخدم" : "User"}</TableHead><TableHead>{isAr ? "الإجراء" : "Action"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead>{isAr ? "التفاصيل" : "Details"}</TableHead></TableRow></TableHeader><TableBody>
            {filteredHistory.map((log, i) => <TableRow key={`${log.id}-${i}`}><TableCell className="whitespace-nowrap text-xs">{log.date ? new Date(log.date).toLocaleString(isAr ? "ar-SA" : "en-US") : "—"}</TableCell><TableCell className="font-medium text-rose-600">{log.id}</TableCell><TableCell className="text-xs font-mono">{log.source}</TableCell><TableCell className="text-xs">{log.level}</TableCell><TableCell className="text-xs">{log.user}</TableCell><TableCell>{log.action}</TableCell><TableCell><Badge variant="outline" className={log.status === "OVERDUE" ? "border-red-500 text-red-500" : log.status === "RESOLVED" || log.status === "CLOSED" ? "border-emerald-500 text-emerald-600" : "border-orange-500 text-orange-600"}>{log.status}</Badge></TableCell><TableCell className="text-xs max-w-[320px] truncate" title={log.details}>{log.details || "—"}</TableCell></TableRow>)}
            {!loading && filteredHistory.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{isAr ? "لا توجد نتائج مطابقة" : "No matching entries"}</TableCell></TableRow>}
            {loading && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{isAr ? "جارٍ تحميل السجل..." : "Loading history..."}</TableCell></TableRow>}
          </TableBody></Table></div>
        </CardContent>
      </Card>
    </div>
  );
}

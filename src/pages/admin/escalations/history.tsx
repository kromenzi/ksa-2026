import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";
import { canDeleteManagedRecord } from "@/lib/generic-records";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, Download, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type HistoryRow = {
  id: string;
  escalationId: string;
  escalationRef: string;
  source: string;
  level: string;
  user: string;
  date: string;
  action: string;
  status: string;
  details: string;
};

function downloadCsv(rows: HistoryRow[], isAr: boolean) {
  const headers = isAr
    ? ["التاريخ والوقت", "رقم التصعيد", "المصدر", "المستوى", "المستخدم", "الإجراء", "الحالة", "التفاصيل"]
    : ["Date & Time", "Escalation No", "Source", "Level", "User", "Action", "Status", "Details"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + [headers, ...rows.map(log => [log.date, log.escalationRef, log.source, log.level, log.user, log.action, log.status, log.details])]
    .map(row => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `escalation-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EscalationHistory() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const canDelete = canDeleteManagedRecord(currentUser?.role);
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", "/api/escalations");
      const escalations = await response.json();
      const rows: HistoryRow[] = (Array.isArray(escalations) ? escalations : []).flatMap((esc: any) => {
        const entries = Array.isArray(esc.history) ? esc.history : [];
        return entries.map((entry: any, index: number) => ({
          id: `${esc.id}-${entry.id || index}`,
          escalationId: esc.id,
          escalationRef: esc.refNo || esc.id,
          source: esc.source || esc.refNo || esc.id,
          level: esc.level || "",
          user: entry.user || "",
          date: entry.date || esc.updatedAt || esc.createdAt,
          action: entry.action || "",
          status: entry.status || esc.status,
          details: entry.details || "",
        }));
      });
      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(rows);
    } catch (err: any) {
      setHistory([]);
      toast.error(err?.message || (isAr ? "تعذر تحميل سجل التصعيدات" : "Unable to load escalation history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(log => [log.escalationRef, log.source, log.level, log.user, log.date, log.action, log.status, log.details].some(value => String(value || "").toLowerCase().includes(q)));
  }, [history, searchQuery]);

  const deleteEscalationFromHistory = async (row: HistoryRow) => {
    if (!canDelete || !window.confirm(isAr ? `حذف التصعيد ${row.escalationRef} وجميع حركاته نهائيًا؟` : `Permanently delete escalation ${row.escalationRef} and all of its history?`)) return;
    setDeletingId(row.escalationId);
    try {
      await apiRequest("DELETE", `/api/escalations/${encodeURIComponent(row.escalationId)}`);
      setHistory(prev => prev.filter(item => item.escalationId !== row.escalationId));
      toast.success(isAr ? "تم حذف التصعيد وسجله نهائيًا" : "Escalation and history permanently deleted");
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h2 className="flex items-center gap-2 text-2xl font-bold"><History className="h-6 w-6 text-orange-500" />{isAr ? "سجل التصعيدات" : "Escalation History"}</h2><p className="mt-1 text-sm text-muted-foreground">{isAr ? "يعرض الحركات الفعلية فقط من قاعدة البيانات" : "Shows only real escalation movements from the database"}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</Button><Button variant="outline" onClick={() => { downloadCsv(filteredHistory, isAr); toast.success(isAr ? "تم تصدير السجل" : "History exported"); }}><Download className="me-2 h-4 w-4" />{isAr ? "تصدير" : "Export"}</Button></div>
      </div>

      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4"><CardTitle>{isAr ? "سجل الحركات" : "Movement Log"}</CardTitle><div className="relative w-72"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="ps-9" /></div></CardHeader><CardContent>
        <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "التصعيد" : "Escalation"}</TableHead><TableHead>{isAr ? "المصدر" : "Source"}</TableHead><TableHead>{isAr ? "المستوى" : "Level"}</TableHead><TableHead>{isAr ? "المستخدم" : "User"}</TableHead><TableHead>{isAr ? "الإجراء" : "Action"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead>{isAr ? "التفاصيل" : "Details"}</TableHead><TableHead className="text-right">{isAr ? "حذف" : "Delete"}</TableHead></TableRow></TableHeader><TableBody>
          {!loading && filteredHistory.length === 0 && <TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد حركات فعلية. لا توجد بيانات سجل تجريبية." : "No real history entries. No demo history data is loaded."}</TableCell></TableRow>}
          {filteredHistory.map(row => <TableRow key={row.id}><TableCell className="whitespace-nowrap text-xs">{row.date ? new Date(row.date).toLocaleString(isAr ? "ar-SA" : "en-US") : "-"}</TableCell><TableCell className="font-mono text-xs font-semibold text-rose-600">{row.escalationRef}</TableCell><TableCell className="font-mono text-xs">{row.source}</TableCell><TableCell className="text-xs">{row.level || "-"}</TableCell><TableCell className="text-xs">{row.user || "-"}</TableCell><TableCell className="text-xs">{row.action || "-"}</TableCell><TableCell><Badge variant="outline">{row.status || "-"}</Badge></TableCell><TableCell className="max-w-[300px] truncate text-xs" title={row.details}>{row.details || "-"}</TableCell><TableCell className="text-right">{canDelete && <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={deletingId === row.escalationId} onClick={() => void deleteEscalationFromHistory(row)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}

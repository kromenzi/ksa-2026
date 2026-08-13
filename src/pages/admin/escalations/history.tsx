import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EscalationHistory() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");

  const mockHistory = [
    { id: "ESC-2026-0001", source: "NCR-2026-00125", level: "Level 2", user: "John Doe", date: "2026-08-08 14:30", action: "Escalated Automatically", status: "ESCALATED" },
    { id: "ESC-2026-0001", source: "NCR-2026-00125", level: "Level 1", user: "System", date: "2026-08-07 09:00", action: "Deadline Breached", status: "OVERDUE" },
    { id: "ESC-2026-0002", source: "INC-2026-00042", level: "Level 4", user: "Jane Smith", date: "2026-08-06 11:20", action: "Assigned to Plant Manager", status: "OPEN" },
    { id: "ESC-2026-0005", source: "OBS-2026-00111", level: "Level 3", user: "HSE Admin", date: "2026-08-01 16:45", action: "Manual Escalation", status: "RESOLVED" },
  ];

  const filteredHistory = mockHistory.filter((log) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [log.id, log.source, log.level, log.user, log.date, log.action, log.status].some((value) =>
      value.toLowerCase().includes(q)
    );
  });

  const handleExportLog = () => {
    const headers = isAr
      ? ["التاريخ والوقت", "رقم التصعيد", "المصدر", "المستوى", "المستخدم", "الإجراء", "الحالة"]
      : ["Date & Time", "Escalation No", "Source", "Level", "User", "Action", "Status"];

    const rows = filteredHistory.map((log) => [
      log.date,
      log.id,
      log.source,
      log.level,
      log.user,
      log.action,
      log.status,
    ]);

    const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `escalation-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-orange-500" />
            {isAr ? "سجل التصعيدات" : "Escalation History"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "مراجعة السجل الكامل لحركات التصعيد" : "Review the complete log of escalation movements"}
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={handleExportLog}>
          <Download className="h-4 w-4" />
          {isAr ? "تصدير السجل" : "Export Log"}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{isAr ? "سجل الحركات" : "Movement Log"}</CardTitle>
          <div className="relative w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isAr ? "بحث..." : "Search..."}
              className="ps-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? "التاريخ والوقت" : "Date & Time"}</TableHead>
                  <TableHead>{isAr ? "رقم التصعيد" : "Escalation No"}</TableHead>
                  <TableHead>{isAr ? "المصدر" : "Source"}</TableHead>
                  <TableHead>{isAr ? "المستوى" : "Level"}</TableHead>
                  <TableHead>{isAr ? "المستخدم" : "User"}</TableHead>
                  <TableHead>{isAr ? "الإجراء" : "Action"}</TableHead>
                  <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((log, i) => (
                  <TableRow key={`${log.id}-${log.date}-${i}`}>
                    <TableCell className="whitespace-nowrap text-xs">{log.date}</TableCell>
                    <TableCell className="font-medium text-rose-600">{log.id}</TableCell>
                    <TableCell className="text-xs">{log.source}</TableCell>
                    <TableCell className="text-xs">{log.level}</TableCell>
                    <TableCell className="text-xs">{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.status === "OVERDUE"
                            ? "border-red-500 text-red-500"
                            : log.status === "ESCALATED"
                              ? "border-orange-500 text-orange-600"
                              : log.status === "RESOLVED"
                                ? "border-emerald-500 text-emerald-600"
                                : ""
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {isAr ? "لا توجد نتائج مطابقة" : "No matching entries"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

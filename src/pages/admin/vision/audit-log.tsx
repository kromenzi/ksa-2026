import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredAuditLogs } from "@/lib/vision-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VisionAuditLog() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [logs] = useState(() => getStoredAuditLogs());

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">AUDIT LOG TRAIL</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "سجل تدقيق نظام الرؤية (Vision Audit Log)" : "Vision System Audit Log"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "تسجيل دقيق لكافة عمليات المشغلين، تغيير إعدادات الذكاء وتأكيد التنبيهات" : "Tamper-proof audit record of operator actions, AI threshold edits and alert status overrides"}
        </p>
      </div>

      <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>{isAr ? "المستخدم" : "User"}</TableHead>
              <TableHead>{isAr ? "الإجراء المتخذ" : "Action Performed"}</TableHead>
              <TableHead>{isAr ? "العنصر المتأثر" : "Target Device / Object"}</TableHead>
              <TableHead>{isAr ? "التاريخ والوقت" : "Timestamp"}</TableHead>
              <TableHead>{isAr ? "العنوان" : "IP Address"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-bold text-xs">{log.user}</TableCell>
                <TableCell className="text-xs">{log.action}</TableCell>
                <TableCell className="text-xs font-mono">{log.deviceOrObject}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{log.timestamp}</TableCell>
                <TableCell className="text-xs font-mono">{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

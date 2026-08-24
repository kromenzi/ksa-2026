import { useEffect, useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, User, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminActivityLogs() {
  const { settings, activityLogs, logActivity } = useData();
  const isAr = settings.language === "ar";

  useEffect(() => {
    logActivity(
      isAr ? "فتح سجل النشاط" : "Viewed Activity Log",
      isAr ? "تم فتح صفحة سجل النشاط لتتبع نشاطات المستخدمين" : "Activity log page opened",
      "activity"
    );
    // Log once per mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedLogs = useMemo(
    () => [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [activityLogs]
  );

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-slate-400" />
            {isAr ? "سجل النشاط" : "Activity Log"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr ? "تتبع نشاطات المستخدمين داخل النظام" : "Track user activities across the system"}
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Activity className="h-3.5 w-3.5" />
          {sortedLogs.length} {isAr ? "نشاط" : "activities"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isAr ? "الأنشطة الأخيرة" : "Recent Activities"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{isAr ? "لا توجد أنشطة مسجلة بعد" : "No activities recorded yet"}</p>
              <p className="text-sm mt-2">{isAr ? "سيتم تسجيل الأنشطة الجديدة تلقائياً هنا." : "New user activities will be recorded here automatically."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start p-3 font-semibold">{isAr ? "التاريخ" : "Date"}</th>
                    <th className="text-start p-3 font-semibold">{isAr ? "المستخدم" : "User"}</th>
                    <th className="text-start p-3 font-semibold">{isAr ? "النشاط" : "Action"}</th>
                    <th className="text-start p-3 font-semibold">{isAr ? "القسم" : "Module"}</th>
                    <th className="text-start p-3 font-semibold">{isAr ? "التفاصيل" : "Details"}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/20">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{formatDate(log.timestamp)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.performedByName || log.performedBy || "System"}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{log.action}</td>
                      <td className="p-3">
                        <Badge variant="outline">{log.module}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[420px]">{log.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              {isAr ? "تحديث السجل" : "Refresh Log"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

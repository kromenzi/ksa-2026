import { useState } from "react";
import { useData } from "@/lib/data-context";
import { getStoredAlerts, saveStoredAlerts, addAuditEntry, type AIAlert } from "@/lib/vision-store";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera } from "lucide-react";

export default function VisionAlerts() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [alerts, setAlerts] = useState<AIAlert[]>(() => getStoredAlerts());
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const updateAlertStatus = (id: string, newStatus: AIAlert["status"]) => {
    const next = alerts.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAlerts(next);
    saveStoredAlerts(next);
    addAuditEntry("Updated AI Alert Status", id, undefined, newStatus);
    toast.success(isAr ? `تم تحديث حالة التنبيه إلى: ${newStatus}` : `Alert status set to ${newStatus}`);
  };

  const filtered = alerts.filter(a => {
    const matchSev = severityFilter === "All" || a.severity === severityFilter;
    const matchStat = statusFilter === "All" || a.status === statusFilter;
    return matchSev && matchStat;
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-border/50">
        <div>
          <Badge className="bg-rose-600 text-white font-mono text-xs mb-1">REAL-TIME AI ALERTS FEED</Badge>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAr ? "مركز تنبيهات الذكاء الاصطناعي (AI Alerts Center)" : "AI Alerts & Detection Center"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? "سجل كافة المخالفات المكتشفة مع درجات التأكيد والتحقق البشري" : "Continuous alert feed with confidence scores and human verification workflows"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs rounded-lg"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{isAr ? "كل الخطورات" : "All Severities"}</SelectItem>
              <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="LOW">LOW</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{isAr ? "كل الحالات" : "All Status"}</SelectItem>
              <SelectItem value="NEW">NEW</SelectItem>
              <SelectItem value="ACKNOWLEDGED">ACKNOWLEDGED</SelectItem>
              <SelectItem value="UNDER REVIEW">UNDER REVIEW</SelectItem>
              <SelectItem value="RESOLVED">RESOLVED</SelectItem>
              <SelectItem value="FALSE POSITIVE">FALSE POSITIVE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((alt) => (
          <Card key={alt.id} className="border border-border/70 shadow-sm bg-card rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-2xl text-white font-mono font-bold text-xs shrink-0 ${alt.severity === "CRITICAL" ? "bg-rose-600" : alt.severity === "HIGH" ? "bg-orange-600" : "bg-amber-500"}`}>
                {alt.severity}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base">{alt.violationType}</span>
                  <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700">
                    {alt.confidencePct}% Confidence
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{alt.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <Camera className="w-3.5 h-3.5 inline me-1 text-indigo-500" />
                  {alt.cameraName} ({alt.plant} - {alt.area})
                </p>
                {alt.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">"{alt.notes}"</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge className={alt.status === "NEW" ? "bg-rose-500 text-white" : alt.status === "RESOLVED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                {alt.status}
              </Badge>

              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => updateAlertStatus(alt.id, "ACKNOWLEDGED")}>
                {isAr ? "تأكيد" : "Acknowledge"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg text-emerald-600" onClick={() => updateAlertStatus(alt.id, "RESOLVED")}>
                {isAr ? "إغلاق" : "Resolve"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => updateAlertStatus(alt.id, "FALSE POSITIVE")}>
                {isAr ? "إنذار خاطئ" : "False Positive"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

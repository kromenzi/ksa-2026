import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, Plus, Search, Eye, Printer, HelpCircle, GitMerge, ShieldAlert,
  ClipboardList, CheckCircle2, Clock3, Activity, PlusCircle, X, UsersRound,
  FileSearch, Target, Trash2,
} from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";

export interface FiveWhyItem {
  whyNo: number;
  question: string;
  answer: string;
}
export interface FishboneCategory {
  category: string;
  cause: string;
}
export interface IncidentAction {
  action: string;
  responsible: string;
  targetDate: string;
  status: "Open" | "In Progress" | "Closed";
  verification?: string;
}
export interface IncidentRecord {
  id: string;
  refNo: string;
  type: "Near Miss" | "First Aid" | "Medical Treatment" | "Lost Time Injury" | "Property Damage" | "Environmental" | "Vehicle";
  title: string;
  date: string;
  time: string;
  location: string;
  department: string;
  factory: string;
  reportedBy: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  potentialConsequences: string;
  actualConsequences: string;
  immediateActions: string;
  witnesses: string;
  evidence: string;
  investigationTeam: string;
  fiveWhys: FiveWhyItem[];
  fishbone: FishboneCategory[];
  contributingFactors: string;
  rootCauseSummary: string;
  correctiveActions: IncidentAction[];
  recommendations: string;
  lessonsLearned: string;
  status: "Under Investigation" | "Actions Pending" | "Closed";
  escalation?: {
    id: string;
    refNo?: string;
    status?: string;
    createdAt?: string;
    sourceType?: string;
    sourceId?: string;
    sourceRef?: string;
  };
}

const whyTemplate = (): FiveWhyItem[] =>
  [1, 2, 3, 4, 5].map(whyNo => ({
    whyNo,
    question: whyNo === 1 ? "Why did the event occur?" : whyNo === 5 ? "What systemic/root cause allowed this condition?" : "Why did that condition exist?",
    answer: "",
  }));

const fishboneTemplate = (): FishboneCategory[] => [
  { category: "People", cause: "" },
  { category: "Machine / Equipment", cause: "" },
  { category: "Method / Process", cause: "" },
  { category: "Material", cause: "" },
  { category: "Environment", cause: "" },
  { category: "Measurement / Control", cause: "" },
];

const actionTemplate = (): IncidentAction => ({
  action: "",
  responsible: "",
  targetDate: "",
  status: "Open",
  verification: "",
});

const incidentFromApi = (row: any): IncidentRecord => ({
  id: String(row.id || ""),
  refNo: String(row.refNo || ""),
  type: (row.data?.type || "Near Miss") as IncidentRecord["type"],
  title: String(row.title || ""),
  date: String(row.date || ""),
  time: String(row.data?.time || ""),
  location: String(row.data?.location || ""),
  department: String(row.department || ""),
  factory: String(row.data?.factory || ""),
  reportedBy: String(row.data?.reportedBy || ""),
  severity: (row.data?.severity || "Medium") as IncidentRecord["severity"],
  description: String(row.data?.description || ""),
  potentialConsequences: String(row.data?.potentialConsequences || ""),
  actualConsequences: String(row.data?.actualConsequences || ""),
  immediateActions: String(row.data?.immediateActions || ""),
  witnesses: String(row.data?.witnesses || ""),
  evidence: String(row.data?.evidence || ""),
  investigationTeam: String(row.data?.investigationTeam || ""),
  fiveWhys: Array.isArray(row.data?.fiveWhys) && row.data.fiveWhys.length ? row.data.fiveWhys : whyTemplate(),
  fishbone: Array.isArray(row.data?.fishbone) && row.data.fishbone.length ? row.data.fishbone : fishboneTemplate(),
  contributingFactors: String(row.data?.contributingFactors || ""),
  rootCauseSummary: String(row.data?.rootCauseSummary || ""),
  correctiveActions: Array.isArray(row.data?.correctiveActions) ? row.data.correctiveActions.map((a: any) => ({
    action: String(a.action || ""),
    responsible: String(a.responsible || ""),
    targetDate: String(a.targetDate || ""),
    status: a.status === "Closed" ? "Closed" : a.status === "In Progress" ? "In Progress" : "Open",
    verification: String(a.verification || ""),
  })) : [],
  recommendations: String(row.data?.recommendations || ""),
  lessonsLearned: String(row.data?.lessonsLearned || ""),
  status: (row.status || "Under Investigation") as IncidentRecord["status"],
  escalation: row.data?.escalation && typeof row.data.escalation === "object" ? {
    id: String(row.data.escalation.id || ""),
    refNo: String(row.data.escalation.refNo || ""),
    status: String(row.data.escalation.status || ""),
    createdAt: String(row.data.escalation.createdAt || ""),
    sourceType: String(row.data.escalation.sourceType || "INCIDENT"),
    sourceId: String(row.data.escalation.sourceId || row.id || ""),
    sourceRef: String(row.data.escalation.sourceRef || row.refNo || ""),
  } : undefined,
});

const incidentToApi = (incident: IncidentRecord) => ({
  refNo: incident.refNo,
  title: incident.title || incident.refNo,
  status: incident.status,
  department: incident.department,
  date: incident.date,
  data: {
    type: incident.type,
    time: incident.time,
    location: incident.location,
    factory: incident.factory,
    reportedBy: incident.reportedBy,
    severity: incident.severity,
    description: incident.description,
    potentialConsequences: incident.potentialConsequences,
    actualConsequences: incident.actualConsequences,
    immediateActions: incident.immediateActions,
    witnesses: incident.witnesses,
    evidence: incident.evidence,
    investigationTeam: incident.investigationTeam,
    fiveWhys: incident.fiveWhys,
    fishbone: incident.fishbone,
    contributingFactors: incident.contributingFactors,
    rootCauseSummary: incident.rootCauseSummary,
    correctiveActions: incident.correctiveActions,
    recommendations: incident.recommendations,
    lessonsLearned: incident.lessonsLearned,
    escalation: incident.escalation || null,
  },
});

const newReference = () => {
  const year = new Date().getFullYear();
  const seed = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
    : Date.now().toString(36).toUpperCase();
  return `INC-${year}-${seed}`;
};

export default function AdminIncidentsPage() {
  const { settings, currentUser } = useData();
  const isAr = settings.language === "ar";
  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery<IncidentRecord[]>({
    queryKey: ["/api/incidents"],
    queryFn: async () => {
      const response = await fetch("/api/incidents", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load incidents");
      const rows = await response.json();
      return Array.isArray(rows) ? rows.map(incidentFromApi) : [];
    },
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [active, setActive] = useState<IncidentRecord | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [open, setOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);

  const rows = useMemo(() => incidents.filter(i => {
    const q = search.trim().toLowerCase();
    if (q && ![i.refNo, i.title, i.location, i.department, i.description, i.reportedBy].some(v => String(v || "").toLowerCase().includes(q))) return false;
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    return true;
  }), [incidents, search, typeFilter, statusFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: incidents.length,
    nearMiss: incidents.filter(i => i.type === "Near Miss").length,
    high: incidents.filter(i => ["High", "Critical"].includes(i.severity)).length,
    open: incidents.filter(i => i.status !== "Closed").length,
    closed: incidents.filter(i => i.status === "Closed").length,
  }), [incidents]);

  const newIncident = () => {
    setIsNew(true);
    setActive({
      id: "",
      refNo: newReference(),
      type: "Near Miss",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      time: "",
      location: "",
      department: "",
      factory: "",
      reportedBy: currentUser?.name || "",
      severity: "Medium",
      description: "",
      potentialConsequences: "",
      actualConsequences: "",
      immediateActions: "",
      witnesses: "",
      evidence: "",
      investigationTeam: "",
      fiveWhys: whyTemplate(),
      fishbone: fishboneTemplate(),
      contributingFactors: "",
      rootCauseSummary: "",
      correctiveActions: [actionTemplate()],
      recommendations: "",
      lessonsLearned: "",
      status: "Under Investigation",
    });
    setOpen(true);
  };

  const editIncident = (incident: IncidentRecord) => {
    setIsNew(false);
    setActive({
      ...incident,
      fiveWhys: incident.fiveWhys.map(item => ({ ...item })),
      fishbone: incident.fishbone.map(item => ({ ...item })),
      correctiveActions: incident.correctiveActions.length ? incident.correctiveActions.map(item => ({ ...item })) : [actionTemplate()],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!active) return;
    if (!active.title.trim() || !active.date || !active.location.trim() || !active.description.trim()) {
      toast.error(isAr ? "العنوان والتاريخ والموقع ووصف الحدث مطلوبة" : "Title, date, location, and event description are required");
      return;
    }
    if (["High", "Critical"].includes(active.severity) && !active.immediateActions.trim()) {
      toast.error(isAr ? "أضف الاستجابة الفورية للحوادث عالية/حرجة الخطورة" : "Add immediate response for high/critical events");
      return;
    }

    const cleaned: IncidentRecord = {
      ...active,
      correctiveActions: active.correctiveActions.filter(a => a.action.trim() || a.responsible.trim() || a.targetDate),
    };
    setSaving(true);
    try {
      const payload = incidentToApi(cleaned);
      if (isNew) {
        await apiRequest("POST", "/api/incidents", payload);
      } else {
        await apiRequest("PATCH", `/api/incidents/${encodeURIComponent(active.id)}`, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setOpen(false);
      setActive(null);
      toast.success(isAr ? "تم حفظ سجل الحادث / شبه الحادث" : "Incident / Near Miss record saved");
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر حفظ السجل" : "Unable to save record"));
    } finally {
      setSaving(false);
    }
  };

  const addAction = () => active && setActive({ ...active, correctiveActions: [...active.correctiveActions, actionTemplate()] });
  const removeAction = (index: number) => active && setActive({ ...active, correctiveActions: active.correctiveActions.filter((_, idx) => idx !== index) });
  const updateAction = (index: number, patch: Partial<IncidentAction>) => {
    if (!active) return;
    setActive({ ...active, correctiveActions: active.correctiveActions.map((item, idx) => idx === index ? { ...item, ...patch } : item) });
  };

  const escalate = async (incident: IncidentRecord) => {
    if (incident.status === "Closed") {
      toast.error(isAr ? "لا يمكن تصعيد سجل مغلق" : "Closed record cannot be escalated");
      return;
    }
    setEscalatingId(incident.id);
    try {
      const severity = String(incident.severity || "Medium").toUpperCase();
      const level = severity === "CRITICAL" ? "Level 3 - HSE / Plant Manager" : severity === "HIGH" ? "Level 2 - Department Manager" : "Level 1 - Supervisor";
      const response = await apiRequest("POST", "/api/escalations", {
        source: incident.refNo || `INCIDENT:${incident.id}`,
        sourceType: "INCIDENT",
        sourceId: incident.id,
        sourceRef: incident.refNo,
        title: `${incident.refNo || "INCIDENT"} - ${incident.type}: ${(incident.title || incident.description || "Incident / Near Miss").slice(0, 120)}`,
        severity,
        level,
        department: incident.department || "HSE",
        responsible: currentUser?.name || "HSE Lead",
        reason: incident.description || incident.title,
      });
      const escalation = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(escalation?.error || "Unable to create escalation");
      const linked: IncidentRecord = {
        ...incident,
        escalation: {
          id: String(escalation.id || ""),
          refNo: String(escalation.refNo || ""),
          status: String(escalation.status || "OPEN"),
          createdAt: String(escalation.createdAt || new Date().toISOString()),
          sourceType: "INCIDENT",
          sourceId: incident.id,
          sourceRef: incident.refNo,
        },
      };
      await apiRequest("PATCH", `/api/incidents/${encodeURIComponent(incident.id)}`, incidentToApi(linked));
      await queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast.success(isAr ? `تم التصعيد ${escalation.refNo || ""}` : `Escalated ${escalation.refNo || ""}`);
    } catch (error: any) {
      toast.error(error?.message || (isAr ? "تعذر التصعيد" : "Unable to escalate"));
    } finally {
      setEscalatingId(null);
    }
  };

  const print = (incident: IncidentRecord) => {
    setPrintItem({
      id: incident.id,
      type: "report",
      refNo: incident.refNo,
      title: isAr ? "تقرير التحقيق في الحادث / شبه الحادث وتحليل السبب الجذري" : "Incident / Near Miss Investigation & Root Cause Analysis",
      department: incident.department,
      severity: incident.severity,
      status: incident.status,
      date: incident.date,
      sections: [
        { label: isAr ? "النوع والعنوان" : "Type & Title", value: `${incident.type} — ${incident.title || "—"}` },
        { label: isAr ? "التاريخ والوقت" : "Date & Time", value: `${incident.date} ${incident.time || ""}` },
        { label: isAr ? "الموقع / القسم / المصنع" : "Location / Department / Factory", value: `${incident.location || "—"} | ${incident.department || "—"} | ${incident.factory || "—"}` },
        { label: isAr ? "المبلّغ" : "Reported By", value: incident.reportedBy || "—" },
        { label: isAr ? "ماذا حدث؟" : "What Happened?", value: incident.description || "—" },
        { label: isAr ? "العواقب الفعلية" : "Actual Consequences", value: incident.actualConsequences || "—" },
        { label: isAr ? "أسوأ نتيجة محتملة" : "Potential Consequences", value: incident.potentialConsequences || "—" },
        { label: isAr ? "الاستجابة / الإجراء الفوري" : "Immediate Response", value: incident.immediateActions || "—" },
        { label: isAr ? "الشهود والأدلة" : "Witnesses & Evidence", value: `${incident.witnesses || "—"}\n${incident.evidence || "—"}` },
        { label: isAr ? "فريق التحقيق" : "Investigation Team", value: incident.investigationTeam || "—" },
        { label: isAr ? "تحليل 5 Why" : "5-Why Analysis", value: incident.fiveWhys.map(w => `${w.whyNo}. ${w.question}\n${w.answer || "—"}`).join("\n\n") },
        { label: isAr ? "تحليل العوامل (Ishikawa)" : "Ishikawa / Fishbone Factors", value: incident.fishbone.filter(f => f.cause.trim()).map(f => `${f.category}: ${f.cause}`).join("\n") || "—" },
        { label: isAr ? "العوامل المساهمة" : "Contributing Factors", value: incident.contributingFactors || "—" },
        { label: isAr ? "ملخص السبب الجذري" : "Root Cause Summary", value: incident.rootCauseSummary || "—" },
        { label: isAr ? "الإجراءات التصحيحية والوقائية" : "Corrective / Preventive Actions", value: incident.correctiveActions.length ? incident.correctiveActions.map((a, idx) => `#${idx + 1} ${a.action} | ${a.responsible || "—"} | ${a.targetDate || "—"} | ${a.status} | ${a.verification || "—"}`).join("\n") : "—" },
        { label: isAr ? "التوصيات" : "Recommendations", value: incident.recommendations || "—" },
        { label: isAr ? "الدروس المستفادة" : "Lessons Learned", value: incident.lessonsLearned || "—" },
      ],
    });
    setPrintOpen(true);
  };

  const severityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      Low: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      Medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      High: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      Critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
    return <Badge variant="outline" className={styles[severity]}>{severity}</Badge>;
  };

  const statCards = [
    { label: isAr ? "إجمالي السجلات" : "Total Records", value: stats.total, icon: ClipboardList },
    { label: isAr ? "شبه الحوادث" : "Near Misses", value: stats.nearMiss, icon: Activity },
    { label: isAr ? "عالٍ / حرج" : "High / Critical", value: stats.high, icon: ShieldAlert },
    { label: isAr ? "مفتوح للتحقيق" : "Open", value: stats.open, icon: Clock3 },
    { label: isAr ? "مغلق" : "Closed", value: stats.closed, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"} data-testid="admin-incidents-page">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><AlertTriangle className="h-6 w-6 text-red-500" />{isAr ? "الحوادث وشبه الحوادث والتحقيق (RCA)" : "Incidents, Near Misses & Investigation (RCA)"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isAr ? "تسجيل الحدث، الاستجابة الفورية، جمع الأدلة، تحليل الأسباب، CAPA، الدروس المستفادة والإغلاق." : "Event reporting, immediate response, evidence, root cause analysis, CAPA, lessons learned, and closeout."}</p>
        </div>
        <Button onClick={newIncident} className="gap-2 bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4" />{isAr ? "تسجيل حادث / شبه حادث" : "Report Incident / Near Miss"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>)}
      </div>

      <Card><CardContent className="space-y-4 p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_160px]">
          <div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث بالرقم، العنوان، الموقع، القسم، المبلّغ..." : "Search reference, title, location, department, reporter..."} /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الأنواع" : "All Types"}</SelectItem><SelectItem value="Near Miss">Near Miss</SelectItem><SelectItem value="First Aid">First Aid</SelectItem><SelectItem value="Medical Treatment">Medical Treatment</SelectItem><SelectItem value="Lost Time Injury">Lost Time Injury</SelectItem><SelectItem value="Property Damage">Property Damage</SelectItem><SelectItem value="Environmental">Environmental</SelectItem><SelectItem value="Vehicle">Vehicle</SelectItem></SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الحالات" : "All Statuses"}</SelectItem><SelectItem value="Under Investigation">{isAr ? "قيد التحقيق" : "Under Investigation"}</SelectItem><SelectItem value="Actions Pending">{isAr ? "إجراءات معلقة" : "Actions Pending"}</SelectItem><SelectItem value="Closed">{isAr ? "مغلق" : "Closed"}</SelectItem></SelectContent></Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الخطورة" : "All Severity"}</SelectItem><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[1020px]"><TableHeader><TableRow><TableHead>{isAr ? "المرجع" : "Reference"}</TableHead><TableHead>{isAr ? "النوع والحدث" : "Type & Event"}</TableHead><TableHead>{isAr ? "الموقع / القسم" : "Location / Dept"}</TableHead><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isAr ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(incident => <TableRow key={incident.id}>
              <TableCell className="font-mono text-xs font-semibold">{incident.refNo}</TableCell>
              <TableCell className="max-w-[330px]"><p className="font-semibold">{incident.title || "—"}</p><Badge variant="outline" className="mt-1 text-[10px]">{incident.type}</Badge></TableCell>
              <TableCell><p className="text-sm">{incident.location || "—"}</p><p className="text-xs text-muted-foreground">{incident.department || "—"}</p></TableCell>
              <TableCell className="text-xs">{incident.date}</TableCell>
              <TableCell>{severityBadge(incident.severity)}</TableCell>
              <TableCell><Badge variant="outline">{incident.status}</Badge></TableCell>
              <TableCell><div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => void escalate(incident)} disabled={escalatingId === incident.id} title={isAr ? "تصعيد" : "Escalate"} className={incident.escalation?.id ? "text-emerald-600" : "text-rose-600"}><ShieldAlert className={`h-4 w-4 ${escalatingId === incident.id ? "animate-pulse" : ""}`} /></Button>
                <Button size="icon" variant="ghost" onClick={() => editIncident(incident)} title={isAr ? "فتح التحقيق" : "Open Investigation"}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => print(incident)} title={isAr ? "طباعة التحقيق" : "Print Investigation"}><Printer className="h-4 w-4" /></Button>
              </div></TableCell>
            </TableRow>)}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد سجلات مطابقة" : "No matching incident records"}</TableCell></TableRow>}
          </TableBody></Table>
        </div>
      </CardContent></Card>

      {active && <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>{isNew ? (isAr ? "تسجيل حادث / شبه حادث" : "New Incident / Near Miss") : active.refNo}</span>
              {!isNew && <Button type="button" variant="outline" size="sm" onClick={() => print(active)} className="gap-2"><Printer className="h-4 w-4" />{isAr ? "طباعة التحقيق" : "Print Investigation"}</Button>}
            </DialogTitle>
            <DialogDescription>{isAr ? "سجّل الحقائق أولًا ثم حلّل الأسباب والإجراءات. تجنب افتراض اللوم قبل اكتمال التحقيق." : "Record facts first, then analyze causes and controls. Avoid assigning blame before the investigation is complete."}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="event" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5">
              <TabsTrigger value="event">{isAr ? "1. الحدث" : "1. Event"}</TabsTrigger>
              <TabsTrigger value="response">{isAr ? "2. الاستجابة" : "2. Response"}</TabsTrigger>
              <TabsTrigger value="rca">{isAr ? "3. RCA" : "3. RCA"}</TabsTrigger>
              <TabsTrigger value="fishbone">{isAr ? "4. العوامل" : "4. Factors"}</TabsTrigger>
              <TabsTrigger value="actions">{isAr ? "5. CAPA والإغلاق" : "5. CAPA & Close"}</TabsTrigger>
            </TabsList>

            <TabsContent value="event" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2"><Label>{isAr ? "نوع الحدث" : "Event Type"}</Label><Select value={active.type} onValueChange={type => setActive({ ...active, type: type as IncidentRecord["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Near Miss">Near Miss</SelectItem><SelectItem value="First Aid">First Aid</SelectItem><SelectItem value="Medical Treatment">Medical Treatment</SelectItem><SelectItem value="Lost Time Injury">Lost Time Injury</SelectItem><SelectItem value="Property Damage">Property Damage</SelectItem><SelectItem value="Environmental">Environmental</SelectItem><SelectItem value="Vehicle">Vehicle</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{isAr ? "الخطورة" : "Severity"}</Label><Select value={active.severity} onValueChange={severity => setActive({ ...active, severity: severity as IncidentRecord["severity"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{isAr ? "التاريخ *" : "Date *"}</Label><Input type="date" value={active.date} onChange={e => setActive({ ...active, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "الوقت" : "Time"}</Label><Input type="time" value={active.time} onChange={e => setActive({ ...active, time: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "عنوان مختصر للحدث *" : "Event Title *"}</Label><Input value={active.title} onChange={e => setActive({ ...active, title: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2"><Label>{isAr ? "الموقع *" : "Location *"}</Label><Input value={active.location} onChange={e => setActive({ ...active, location: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "القسم" : "Department"}</Label><Input value={active.department} onChange={e => setActive({ ...active, department: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "المصنع / الموقع التشغيلي" : "Factory / Site"}</Label><Input value={active.factory} onChange={e => setActive({ ...active, factory: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "المبلّغ" : "Reported By"}</Label><Input value={active.reportedBy} onChange={e => setActive({ ...active, reportedBy: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "ماذا حدث؟ — وصف واقعي وتسلسل الحدث *" : "What happened? — Factual event description *"}</Label><Textarea rows={7} value={active.description} onChange={e => setActive({ ...active, description: e.target.value })} placeholder={isAr ? "اكتب التسلسل الزمني، العمل الجاري، المعدة/المادة ذات العلاقة، وما شوهد فعليًا." : "Describe sequence, task underway, involved equipment/materials, and observed facts."} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "العواقب الفعلية" : "Actual Consequences"}</Label><Textarea rows={4} value={active.actualConsequences} onChange={e => setActive({ ...active, actualConsequences: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "أسوأ نتيجة محتملة / Potential Severity" : "Potential Consequences"}</Label><Textarea rows={4} value={active.potentialConsequences} onChange={e => setActive({ ...active, potentialConsequences: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              <div className="space-y-2"><Label>{isAr ? "الاستجابة والإجراءات الفورية" : "Immediate Response / Actions"}</Label><Textarea rows={6} value={active.immediateActions} onChange={e => setActive({ ...active, immediateActions: e.target.value })} placeholder={isAr ? "الإسعاف، العزل، LOTO، إيقاف العمل، حماية الموقع، الإبلاغ..." : "First aid, isolation, LOTO, stop work, scene preservation, notifications..."} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "الشهود / الأشخاص ذوو الصلة" : "Witnesses / Relevant Persons"}</Label><Textarea rows={5} value={active.witnesses} onChange={e => setActive({ ...active, witnesses: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "الأدلة التي تم جمعها" : "Evidence Collected"}</Label><Textarea rows={5} value={active.evidence} onChange={e => setActive({ ...active, evidence: e.target.value })} placeholder={isAr ? "صور، CCTV، تصريح عمل، JSA، سجل صيانة، أقوال..." : "Photos, CCTV, PTW, JSA, maintenance record, statements..."} /></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "فريق التحقيق" : "Investigation Team"}</Label><Input value={active.investigationTeam} onChange={e => setActive({ ...active, investigationTeam: e.target.value })} placeholder={isAr ? "الأسماء / الأقسام المشاركة" : "Names / functions involved"} /></div>
            </TabsContent>

            <TabsContent value="rca" className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm">{isAr ? "استخدم 5 Why للوصول إلى سبب قابل للمعالجة. لا تجعل النتيجة النهائية «خطأ العامل» فقط؛ ابحث عن التدريب، الإجراء، التصميم، الصيانة، الإشراف والضوابط." : "Use 5-Why to reach an actionable cause. Do not stop at 'worker error'; examine training, procedures, design, maintenance, supervision, and controls."}</div>
              {active.fiveWhys.map((item, index) => <div key={index} className="rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-blue-600"><HelpCircle className="h-4 w-4" />Why #{item.whyNo}</div>
                <Input className="mb-2" value={item.question} onChange={e => { const next = active.fiveWhys.map((w, idx) => idx === index ? { ...w, question: e.target.value } : w); setActive({ ...active, fiveWhys: next }); }} />
                <Textarea rows={3} value={item.answer} onChange={e => { const next = active.fiveWhys.map((w, idx) => idx === index ? { ...w, answer: e.target.value } : w); setActive({ ...active, fiveWhys: next }); }} />
              </div>)}
              <div className="space-y-2"><Label>{isAr ? "ملخص السبب الجذري" : "Root Cause Summary"}</Label><Textarea rows={5} value={active.rootCauseSummary} onChange={e => setActive({ ...active, rootCauseSummary: e.target.value })} /></div>
            </TabsContent>

            <TabsContent value="fishbone" className="space-y-4">
              <div className="flex items-center gap-2 font-semibold"><GitMerge className="h-4 w-4" />{isAr ? "تحليل العوامل المساهمة — Ishikawa" : "Contributing Factors — Ishikawa"}</div>
              <div className="grid gap-3 md:grid-cols-2">
                {active.fishbone.map((factor, index) => <div key={index} className="rounded-xl border p-3"><Label>{factor.category}</Label><Textarea className="mt-2" rows={3} value={factor.cause} onChange={e => { const next = active.fishbone.map((f, idx) => idx === index ? { ...f, cause: e.target.value } : f); setActive({ ...active, fishbone: next }); }} /></div>)}
              </div>
              <div className="space-y-2"><Label>{isAr ? "عوامل مساهمة أخرى" : "Other Contributing Factors"}</Label><Textarea rows={5} value={active.contributingFactors} onChange={e => setActive({ ...active, contributingFactors: e.target.value })} /></div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{isAr ? "الإجراءات التصحيحية والوقائية (CAPA)" : "Corrective / Preventive Actions (CAPA)"}</h3><p className="text-xs text-muted-foreground">{isAr ? "يجب أن تعالج الإجراءات السبب الجذري وأن يكون لها مسؤول وموعد ودليل تحقق." : "Actions should address root causes and have an owner, due date, and verification evidence."}</p></div><Button type="button" variant="outline" size="sm" onClick={addAction} className="gap-2"><PlusCircle className="h-4 w-4" />{isAr ? "إضافة إجراء" : "Add Action"}</Button></div>
              <div className="space-y-3">
                {active.correctiveActions.map((action, index) => <div key={index} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between"><strong>#{index + 1}</strong><Button type="button" variant="ghost" size="icon" onClick={() => removeAction(index)}><X className="h-4 w-4" /></Button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2"><Label>{isAr ? "الإجراء" : "Action"}</Label><Textarea rows={3} value={action.action} onChange={e => updateAction(index, { action: e.target.value })} /></div>
                    <div className="space-y-2"><Label>{isAr ? "المسؤول" : "Responsible"}</Label><Input value={action.responsible} onChange={e => updateAction(index, { responsible: e.target.value })} /></div>
                    <div className="space-y-2"><Label>{isAr ? "الموعد المستهدف" : "Target Date"}</Label><Input type="date" value={action.targetDate} onChange={e => updateAction(index, { targetDate: e.target.value })} /></div>
                    <div className="space-y-2"><Label>{isAr ? "الحالة" : "Status"}</Label><Select value={action.status} onValueChange={status => updateAction(index, { status: status as IncidentAction["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>{isAr ? "دليل التحقق" : "Verification Evidence"}</Label><Input value={action.verification || ""} onChange={e => updateAction(index, { verification: e.target.value })} /></div>
                  </div>
                </div>)}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>{isAr ? "التوصيات" : "Recommendations"}</Label><Textarea rows={5} value={active.recommendations} onChange={e => setActive({ ...active, recommendations: e.target.value })} /></div>
                <div className="space-y-2"><Label>{isAr ? "الدروس المستفادة" : "Lessons Learned"}</Label><Textarea rows={5} value={active.lessonsLearned} onChange={e => setActive({ ...active, lessonsLearned: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>{isAr ? "حالة التحقيق" : "Investigation Status"}</Label><Select value={active.status} onValueChange={status => setActive({ ...active, status: status as IncidentRecord["status"] })}><SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Under Investigation">{isAr ? "قيد التحقيق" : "Under Investigation"}</SelectItem><SelectItem value="Actions Pending">{isAr ? "بانتظار الإجراءات" : "Actions Pending"}</SelectItem><SelectItem value="Closed">{isAr ? "مغلق" : "Closed"}</SelectItem></SelectContent></Select></div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-red-600 hover:bg-red-700">{saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التحقيق" : "Save Investigation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>}

      {printItem && <PrintShareDialog open={printOpen} onOpenChange={setPrintOpen} item={printItem} />}
    </div>
  );
}

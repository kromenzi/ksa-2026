import { useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, Plus, Settings2, Edit, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type MatrixRule = { severity: string; timeline: string; level: string; role: string; autoEscalate: boolean };

const STORAGE_KEY = "abdulkarem-escalation-matrix-v1";

const INITIAL_RULES: MatrixRule[] = [
  { severity: "CRITICAL", timeline: "Immediate", level: "Level 4", role: "Plant / Factory Manager", autoEscalate: true },
  { severity: "HIGH", timeline: "24 Hours", level: "Level 3", role: "HSE Manager / HSE Lead", autoEscalate: true },
  { severity: "MEDIUM", timeline: "72 Hours", level: "Level 2", role: "Department Manager", autoEscalate: true },
  { severity: "LOW", timeline: "1 Week", level: "Level 1", role: "Supervisor", autoEscalate: false },
  { severity: "INFO", timeline: "N/A", level: "Level 0", role: "Normal Follow-up", autoEscalate: false },
];

function loadRules(): MatrixRule[] {
  if (typeof window === "undefined") return INITIAL_RULES;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_RULES;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_RULES;
  } catch {
    return INITIAL_RULES;
  }
}

export default function EscalationMatrix() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [rules, setRules] = useState<MatrixRule[]>(loadRules);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "edit">("new");
  const [index, setIndex] = useState<number | null>(null);
  const [severity, setSeverity] = useState("HIGH");
  const [timeline, setTimeline] = useState("24 Hours");
  const [level, setLevel] = useState("Level 3");
  const [role, setRole] = useState("HSE Manager / HSE Lead");
  const [autoEscalate, setAutoEscalate] = useState("true");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // Keep the matrix usable even when browser storage is unavailable.
    }
  }, [rules]);

  const openNew = () => {
    setMode("new");
    setIndex(null);
    setSeverity("HIGH");
    setTimeline("24 Hours");
    setLevel("Level 3");
    setRole("HSE Manager / HSE Lead");
    setAutoEscalate("true");
    setOpen(true);
  };

  const openEdit = (rule: MatrixRule, i: number) => {
    setMode("edit");
    setIndex(i);
    setSeverity(rule.severity);
    setTimeline(rule.timeline);
    setLevel(rule.level);
    setRole(rule.role);
    setAutoEscalate(String(rule.autoEscalate));
    setOpen(true);
  };

  const saveRule = () => {
    const next: MatrixRule = {
      severity,
      timeline: timeline.trim() || (isAr ? "غير محدد" : "Not specified"),
      level,
      role: role.trim() || (isAr ? "دور مسؤول" : "Responsible Role"),
      autoEscalate: autoEscalate === "true",
    };
    setRules(prev => mode === "edit" && index !== null
      ? prev.map((r, i) => i === index ? next : r)
      : [...prev, next]);
    setOpen(false);
    toast.success(isAr ? "تم حفظ قاعدة التصعيد" : "Escalation rule saved");
  };

  const resetRules = () => {
    setRules(INITIAL_RULES);
    toast.success(isAr ? "تمت إعادة مصفوفة التصعيد للوضع الافتراضي" : "Escalation matrix reset to defaults");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Grid className="h-6 w-6 text-indigo-500" />{isAr ? "مصفوفة التصعيد" : "Escalation Matrix"}</h2><p className="text-sm text-muted-foreground mt-1">{isAr ? "تكوين قواعد التصعيد ومستويات الإدارة" : "Configure escalation rules and management levels"}</p></div>
        <div className="flex gap-2 flex-wrap"><Button type="button" variant="outline" className="gap-2" onClick={openNew}><Settings2 className="h-4 w-4" />{isAr ? "إعداد المستويات" : "Configure Levels"}</Button><Button type="button" variant="outline" className="gap-2" onClick={resetRules}><RotateCcw className="h-4 w-4" />{isAr ? "إعادة الافتراضي" : "Reset"}</Button><Button type="button" className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={openNew}><Plus className="h-4 w-4" />{isAr ? "قاعدة جديدة" : "New Rule"}</Button></div>
      </div>
      <Card><CardHeader><CardTitle>{isAr ? "قواعد التصعيد حسب الخطورة" : "Severity Escalation Rules"}</CardTitle><CardDescription>{isAr ? "تحدد هذه القواعد كيفية تحرك المشكلة تلقائياً عند تجاوز المهلة. التعديلات محفوظة على هذا المتصفح." : "These rules define how an issue escalates automatically when timelines are breached. Changes persist in this browser."}</CardDescription></CardHeader><CardContent><div className="rounded-md border overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isAr?"الخطورة":"Severity"}</TableHead><TableHead>{isAr?"المهلة الزمنية":"Timeline"}</TableHead><TableHead>{isAr?"مستوى التصعيد":"Escalation Level"}</TableHead><TableHead>{isAr?"الدور المسؤول":"Responsible Role"}</TableHead><TableHead>{isAr?"تصعيد تلقائي":"Auto Escalate"}</TableHead><TableHead className="text-end">{isAr?"إجراء":"Action"}</TableHead></TableRow></TableHeader><TableBody>{rules.map((rule,i)=><TableRow key={`${rule.severity}-${i}`}><TableCell><Badge className={rule.severity==='CRITICAL'?'bg-red-600':rule.severity==='HIGH'?'bg-orange-500':rule.severity==='MEDIUM'?'bg-amber-500':rule.severity==='LOW'?'bg-green-500':'bg-slate-400'}>{rule.severity}</Badge></TableCell><TableCell className="font-medium">{rule.timeline}</TableCell><TableCell><Badge variant="outline">{rule.level}</Badge></TableCell><TableCell className="text-sm">{rule.role}</TableCell><TableCell>{rule.autoEscalate?<Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{isAr?"نعم":"Yes"}</Badge>:<Badge variant="secondary">{isAr?"لا":"No"}</Badge>}</TableCell><TableCell className="text-end"><Button type="button" variant="ghost" size="icon" onClick={()=>openEdit(rule,i)} title={isAr?"تعديل القاعدة":"Edit rule"} aria-label={isAr?"تعديل القاعدة":"Edit rule"}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-[520px]"><DialogHeader><DialogTitle>{mode==='new'?(isAr?"إضافة قاعدة تصعيد":"Add Escalation Rule"):(isAr?"تعديل قاعدة التصعيد":"Edit Escalation Rule")}</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>{isAr?"الخطورة":"Severity"}</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["CRITICAL","HIGH","MEDIUM","LOW","INFO"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>{isAr?"المستوى":"Level"}</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Level 0","Level 1","Level 2","Level 3","Level 4"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label>{isAr?"المهلة الزمنية":"Timeline"}</Label><Input value={timeline} onChange={e=>setTimeline(e.target.value)} placeholder="24 Hours" /></div><div className="space-y-2"><Label>{isAr?"الدور المسؤول":"Responsible Role"}</Label><Input value={role} onChange={e=>setRole(e.target.value)} /></div><div className="space-y-2"><Label>{isAr?"التصعيد التلقائي":"Auto Escalate"}</Label><Select value={autoEscalate} onValueChange={setAutoEscalate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">{isAr?"نعم":"Yes"}</SelectItem><SelectItem value="false">{isAr?"لا":"No"}</SelectItem></SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>{isAr?"إلغاء":"Cancel"}</Button><Button type="button" onClick={saveRule}>{isAr?"حفظ":"Save Rule"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

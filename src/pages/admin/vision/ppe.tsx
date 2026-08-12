import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HardHat, ShieldCheck, AlertTriangle, Eye } from "lucide-react";

export default function VisionPPE() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const ppeMetrics = [
    { name: isAr ? "خوذة السلامة (Helmet)" : "Safety Helmet", compliance: 78, violations: 14, icon: HardHat, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { name: isAr ? "سترة السلامة (Vest)" : "Safety Vest", compliance: 82, violations: 11, icon: ShieldCheck, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { name: isAr ? "حذاء السلامة (Shoes)" : "Safety Shoes", compliance: 91, violations: 5, icon: ShieldCheck, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { name: isAr ? "نظارات السلامة (Glasses)" : "Safety Glasses", compliance: 85, violations: 8, icon: Eye, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { name: isAr ? "قفازات حماية (Gloves)" : "Safety Gloves", compliance: 88, violations: 7, icon: ShieldCheck, color: "text-teal-500", bgColor: "bg-teal-500/10" },
    { name: isAr ? "حزام الأمان للارتفاعات (Harness)" : "Safety Harness", compliance: 94, violations: 2, icon: AlertTriangle, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="border-b pb-4 border-border/50">
        <Badge className="bg-indigo-600 text-white font-mono text-xs mb-1">PPE AI ENFORCEMENT</Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isAr ? "كشف الالتزام بالمعدات الوقائية (PPE AI Detection)" : "PPE AI Compliance & Violation Detection"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAr ? "تحليل الكاميرات الفوري لمعدات الحماية الشخصية: الخوذة، السترة، الأحذية، النظارات وحزام الأمان" : "Real-time camera vision enforcement for PPE compliance across all plant zones"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ppeMetrics.map((item) => (
          <Card key={item.name} className="border border-border/70 shadow-sm bg-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${item.bgColor}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="font-bold text-sm">{item.name}</span>
              </div>
              <Badge className="bg-indigo-600 text-white font-mono text-xs">{item.compliance}%</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isAr ? "نسبة الالتزام العامة" : "Compliance Rate"}</span>
                <span className="font-semibold text-foreground">{item.compliance}%</span>
              </div>
              <Progress value={item.compliance} className="h-2 rounded-full" />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>{isAr ? "مخالفات اليوم:" : "Today Violations:"} <strong className="text-rose-600">{item.violations}</strong></span>
                <span className="text-emerald-600 font-semibold">{isAr ? "محرك نشط" : "Active AI"}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

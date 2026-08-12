"use client";

import { useData } from "@/lib/data-context";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, CheckCircle2, Award, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from "recharts";

export interface ComplianceStandardMetric {
  name: string;
  score: number;
  color: string;
  target: number;
  status: string;
  clausesCount: number;
}

export function ComplianceDashboard() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const standards: ComplianceStandardMetric[] = [
    { name: "ISO 45001", score: 92, color: "#10b981", target: 90, status: "Compliant", clausesCount: 14 },
    { name: "ISO 14001", score: 88, color: "#06b6d4", target: 90, status: "Partial", clausesCount: 12 },
    { name: "ISO 9001", score: 90, color: "#3b82f6", target: 90, status: "Compliant", clausesCount: 10 },
    { name: "OSHA", score: 95, color: "#f59e0b", target: 95, status: "Compliant", clausesCount: 18 },
    { name: "Saudi Building Code (SBC)", score: 85, color: "#8b5cf6", target: 85, status: "Compliant", clausesCount: 8 },
  ];

  const overallScore = Math.round(
    standards.reduce((acc, curr) => acc + curr.score, 0) / standards.length
  );

  return (
    <div className="space-y-6" data-testid="compliance-dashboard-component">
      {/* Top summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border-emerald-500/20">
          <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "متوسط الامتثال العام" : "Overall Compliance Adherence"}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-3xl font-extrabold text-emerald-700">{overallScore}%</h3>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +2.4%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "المعايير الخاضعة للرصد" : "Monitored Frameworks"}</p>
            <h3 className="text-3xl font-extrabold">5 / 5</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{isAr ? "ISO & OSHA & SBC نشطة" : "Active & Verified"}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "البنود المتوافقة" : "Compliant Clauses"}</p>
            <h3 className="text-3xl font-extrabold">58 / 62</h3>
            <p className="text-[11px] text-indigo-600 mt-0.5">{isAr ? "93.5% نسبة الإغلاق" : "High standard alignment"}</p>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Bars Card */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold">{isAr ? "نسب الامتثال للمعايير الرئيسية" : "Key Frameworks Adherence Progress"}</h3>
            <p className="text-xs text-muted-foreground">{isAr ? "تتبع مباشر لنسب التوافق مع متطلبات ISO و OSHA وكود البناء" : "Real-time progress tracking against ISO 45001, 14001, 9001, OSHA & SBC"}</p>
          </div>

          <div className="space-y-5">
            {standards.map((std, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: std.color }} />
                    <span className="font-bold">{std.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">({std.clausesCount} {isAr ? "بند" : "clauses"})</span>
                    <span className="font-mono font-bold text-primary">{std.score}%</span>
                  </div>
                </div>
                <Progress value={std.score} className="h-3" />
              </div>
            ))}
          </div>
        </Card>

        {/* Bar Chart Card */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold">{isAr ? "مقارنة أداء المعايير" : "Framework Adherence Comparison"}</h3>
            <p className="text-xs text-muted-foreground">{isAr ? "تحليل مرئي لمستويات الأداء والالتزام المؤسسي" : "Visual distribution and comparative scoring analysis"}</p>
          </div>

          <div className="h-[270px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={standards} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fontWeight: 600 }} />
                <RechartsTooltip />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {standards.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

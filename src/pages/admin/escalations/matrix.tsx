import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid, Plus, Settings2, Edit } from "lucide-react";

export default function EscalationMatrix() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const matrixRules = [
    { severity: "CRITICAL", timeline: "Immediate", level: "Level 4", role: "Plant / Factory Manager", autoEscalate: true },
    { severity: "HIGH", timeline: "24 Hours", level: "Level 3", role: "HSE Manager / HSE Lead", autoEscalate: true },
    { severity: "MEDIUM", timeline: "72 Hours", level: "Level 2", role: "Department Manager", autoEscalate: true },
    { severity: "LOW", timeline: "1 Week", level: "Level 1", role: "Supervisor", autoEscalate: false },
    { severity: "INFO", timeline: "N/A", level: "Level 0", role: "Normal Follow-up", autoEscalate: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Grid className="h-6 w-6 text-indigo-500" />
            {isAr ? "مصفوفة التصعيد" : "Escalation Matrix"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تكوين قواعد التصعيد ومستويات الإدارة" : "Configure escalation rules and management levels"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {isAr ? "إعداد المستويات" : "Configure Levels"}
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? "قاعدة جديدة" : "New Rule"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "قواعد التصعيد حسب الخطورة" : "Severity Escalation Rules"}</CardTitle>
          <CardDescription>
            {isAr ? "تحدد هذه القواعد كيفية تحرك المشكلة تلقائياً عند تجاوز المهلة" : "These rules define how an issue escalates automatically when timelines are breached"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? "الخطورة" : "Severity"}</TableHead>
                  <TableHead>{isAr ? "المهلة الزمنية" : "Timeline"}</TableHead>
                  <TableHead>{isAr ? "مستوى التصعيد" : "Escalation Level"}</TableHead>
                  <TableHead>{isAr ? "الدور المسؤول" : "Responsible Role"}</TableHead>
                  <TableHead>{isAr ? "تصعيد تلقائي" : "Auto Escalate"}</TableHead>
                  <TableHead className="text-end">{isAr ? "إجراء" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixRules.map((rule, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge className={
                        rule.severity === 'CRITICAL' ? 'bg-red-600' :
                        rule.severity === 'HIGH' ? 'bg-orange-500' :
                        rule.severity === 'MEDIUM' ? 'bg-amber-500' :
                        rule.severity === 'LOW' ? 'bg-green-500' : 'bg-slate-400'
                      }>
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{rule.timeline}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.level}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{rule.role}</TableCell>
                    <TableCell>
                      {rule.autoEscalate ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

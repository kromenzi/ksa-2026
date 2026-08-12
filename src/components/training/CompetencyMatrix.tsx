"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { MOCK_EMPLOYEES } from "./mock-data";
import { CheckCircle2, AlertCircle, XCircle, Circle } from "lucide-react";

export default function CompetencyMatrix({ isAr }: { isAr: boolean }) {
  const competencies = ["Fire Safety", "LOTO", "PPE", "Emergency Response", "Equipment Operation"];
  
  const getCompetencyStatus = (empId: string, comp: string) => {
    // Deterministic mock based on length and characters
    const hash = (empId.charCodeAt(empId.length - 1) + comp.charCodeAt(0)) % 4;
    switch (hash) {
      case 0: return { label: "Competent", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" };
      case 1: return { label: "Needs Improvement", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" };
      case 2: return { label: "Not Competent", icon: XCircle, color: "text-red-500", bg: "bg-red-50" };
      default: return { label: "Not Assessed", icon: Circle, color: "text-slate-300", bg: "bg-slate-50" };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{isAr ? "مصفوفة الكفاءة للموظفين" : "Employee Competency Matrix"}</h3>
          <p className="text-sm text-muted-foreground">{isAr ? "تحليل فجوات الكفاءة والتدريب" : "Competency gap analysis & assessment"}</p>
        </div>
        <div className="flex gap-2 text-xs font-medium">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Competent</span>
          <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4 text-amber-500" /> Needs Improvement</span>
          <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /> Not Competent</span>
          <span className="flex items-center gap-1"><Circle className="h-4 w-4 text-slate-300" /> Not Assessed</span>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[200px] border-r">{isAr ? "الموظف" : "Employee"}</TableHead>
              {competencies.map(c => (
                <TableHead key={c} className="text-center font-semibold text-xs border-r">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_EMPLOYEES.map((emp: any) => (
              <TableRow key={emp.id}>
                <TableCell className="border-r bg-white font-medium">
                  {emp.name}
                  <p className="text-[10px] text-muted-foreground">{emp.id} - {emp.title}</p>
                </TableCell>
                {competencies.map(comp => {
                  const status = getCompetencyStatus(emp.id, comp);
                  const Icon = status.icon;
                  return (
                    <TableCell key={comp} className={`text-center border-r p-0 ${status.bg}`}>
                      <div className="flex items-center justify-center h-full w-full py-3" title={status.label}>
                        <Icon className={`h-5 w-5 ${status.color}`} />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

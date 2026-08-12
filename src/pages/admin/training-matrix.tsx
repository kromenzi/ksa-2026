"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, Search, Printer, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import PrintShareDialog from "@/components/print-share-dialog";

interface MatrixRow {
  employeeId: string;
  employeeName: string;
  department: string;
  courses: Record<string, "completed" | "pending" | "expired">;
}

const COURSES = [
  "General HSE Induction",
  "Fire Safety & Extinguisher",
  "LOTO & Energy Isolation",
  "Confined Space Entry",
  "First Aid & CPR",
  "Working at Heights"
];

const SAMPLE_MATRIX: MatrixRow[] = [
  {
    employeeId: "EMP-1001",
    employeeName: "Abdulkarem S. Alanzi",
    department: "Production",
    courses: {
      "General HSE Induction": "completed",
      "Fire Safety & Extinguisher": "completed",
      "LOTO & Energy Isolation": "completed",
      "Confined Space Entry": "completed",
      "First Aid & CPR": "completed",
      "Working at Heights": "completed"
    }
  },
  {
    employeeId: "EMP-1002",
    employeeName: "Mohammad Hassan",
    department: "Maintenance",
    courses: {
      "General HSE Induction": "completed",
      "Fire Safety & Extinguisher": "completed",
      "LOTO & Energy Isolation": "completed",
      "Confined Space Entry": "pending",
      "First Aid & CPR": "expired",
      "Working at Heights": "completed"
    }
  },
  {
    employeeId: "EMP-1003",
    employeeName: "Sarah Johnson",
    department: "HSE",
    courses: {
      "General HSE Induction": "completed",
      "Fire Safety & Extinguisher": "completed",
      "LOTO & Energy Isolation": "completed",
      "Confined Space Entry": "completed",
      "First Aid & CPR": "completed",
      "Working at Heights": "pending"
    }
  }
];

export default function AdminTrainingMatrixPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Print State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);

  const handlePrintMatrix = () => {
    const listToPrint = filteredData.length > 0 ? filteredData : SAMPLE_MATRIX;
    const printObj = {
      id: "TRAINING-MATRIX-SUMMARY",
      type: "report" as const,
      refNo: "HSE-TRN-MTX-2026",
      title: isAr ? "المصفوفة الشاملة لسجلات تدريب الكوادر البشرية" : "Enterprise Training & Qualifications Matrix",
      department: "HSE Training & Human Resources Dept",
      status: "Verified",
      date: new Date().toISOString().split("T")[0],
      sections: [
        { label: isAr ? "عدد الكوادر المسجلة" : "Total Employees Tracked", value: `${listToPrint.length} ${isAr ? "موظف" : "employees"}` },
        { label: isAr ? "الدورات المشمولة بالمصفوفة" : "Tracked Courses", value: COURSES.join(", ") },
        { label: isAr ? "تفاصيل مصفوفة الكوادر" : "Employee Matrix Breakdown", value: listToPrint.map(emp => `[${emp.employeeId}] ${emp.employeeName} (${emp.department}): ` + COURSES.map(c => `${c}=${emp.courses[c] || 'pending'}`).join(" | ")).join("\n") }
      ]
    };
    setPrintItem(printObj);
    setIsPrintOpen(true);
  };

  const filteredData = SAMPLE_MATRIX.filter((item) => {
    const matchesSearch = item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || item.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "all" || item.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6" data-testid="admin-training-matrix-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Grid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">
              {isAr ? "مصفوفة التدريب الكلية" : "Enterprise Training Matrix"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? "متابعة حالة الدورات الإلزامية والمتخصصة لكل الموظفين" : "Comprehensive matrix tracking mandatory & specialized course completion per employee"}
            </p>
          </div>
        </div>

        <Button onClick={handlePrintMatrix} variant="outline" className="gap-2" data-testid="button-print-training-matrix">
          <Printer className="h-4 w-4" />
          {isAr ? "طباعة المصفوفة" : "Print Matrix"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
            <Input
              placeholder={isAr ? "البحث باسم الموظف أو الرقم الوظيفي..." : "Search employee..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rtl:pr-9 rtl:pl-3"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isAr ? "كل الأقسام" : "All Departments"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? "كل الأقسام" : "All Departments"}</SelectItem>
              <SelectItem value="Production">{isAr ? "الإنتاج" : "Production"}</SelectItem>
              <SelectItem value="Maintenance">{isAr ? "الصيانة" : "Maintenance"}</SelectItem>
              <SelectItem value="HSE">{isAr ? "السلامة" : "HSE"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Matrix Table */}
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-[180px]">{isAr ? "الموظف" : "Employee"}</TableHead>
                <TableHead>{isAr ? "القسم" : "Dept"}</TableHead>
                {COURSES.map((course) => (
                  <TableHead key={course} className="text-center min-w-[130px] text-xs">
                    {course}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>
                    <p className="font-semibold text-sm">{row.employeeName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.employeeId}</p>
                  </TableCell>
                  <TableCell className="text-xs">{row.department}</TableCell>
                  {COURSES.map((course) => {
                    const status = row.courses[course] || "pending";
                    return (
                      <TableCell key={course} className="text-center">
                        {status === "completed" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {isAr ? "مكتمل" : "Done"}
                          </Badge>
                        )}
                        {status === "pending" && (
                          <Badge variant="outline" className="text-muted-foreground gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {isAr ? "مطلوب" : "Pending"}
                          </Badge>
                        )}
                        {status === "expired" && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            {isAr ? "منتهي" : "Expired"}
                          </Badge>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* PRINT & SHARE DIALOG */}
      {printItem && (
        <PrintShareDialog
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
          item={printItem}
        />
      )}
    </div>
  );
}

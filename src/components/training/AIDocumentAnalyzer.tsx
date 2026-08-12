"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Sparkles, AlertTriangle, CheckCircle2, Search, X } from "lucide-react";

import { MOCK_EMPLOYEES } from "./mock-data";

export default function AIDocumentAnalyzer({ isAr, onCancel, onConfirm }: any) {
  const [step, setStep] = useState<"upload" | "analyzing" | "review">("upload");
  const [extractedData, setExtractedData] = useState<any[]>([]);

  const handleSimulateUpload = () => {
    setStep("analyzing");
    setTimeout(() => {
      // Simulate OCR result
      const mockResult = [
        { rawName: "Abdulkarem Alanzi", rawId: "EMP-1001", match: MOCK_EMPLOYEES[0], confidence: 99 },
        { rawName: "Mohammad Hassan", rawId: "EMP-1002", match: MOCK_EMPLOYEES[1], confidence: 97 },
        { rawName: "Sara Jhonson", rawId: "EMP-1003", match: MOCK_EMPLOYEES[2], confidence: 85 }, // Slight spelling diff
        { rawName: "Omar Nabel", rawId: "1005", match: MOCK_EMPLOYEES[4], confidence: 92 }, // Partial ID match
        { rawName: "Unknown Worker", rawId: "EMP-9999", match: null, confidence: 45 },
      ];
      setExtractedData(mockResult);
      setStep("review");
    }, 2500);
  };

  const getStatusColor = (conf: number, match: any) => {
    if (!match) return "text-red-600 bg-red-50";
    if (conf >= 95) return "text-emerald-600 bg-emerald-50";
    return "text-amber-600 bg-amber-50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            {isAr ? "تحليل مستند بالذكاء الاصطناعي" : "AI Document Analyzer"}
          </h2>
          <p className="text-muted-foreground">{isAr ? "استخراج بيانات الحضور تلقائياً من الصور وملفات PDF" : "Automatically extract attendance data from images and PDFs"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button>
      </div>

      {step === "upload" && (
        <Card className="p-12 border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-lg">{isAr ? "اسحب وأفلت المستند هنا" : "Drag & Drop Document Here"}</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, JPG, PNG, DOCX, XLSX (Max 10MB)</p>
          </div>
          <Button onClick={handleSimulateUpload} className="bg-purple-600 hover:bg-purple-700">
            {isAr ? "تصفح الملفات لبدء التحليل" : "Browse Files to Analyze"}
          </Button>
        </Card>
      )}

      {step === "analyzing" && (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-purple-600 animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-lg animate-pulse">{isAr ? "جاري تحليل المستند..." : "Analyzing Document..."}</p>
            <p className="text-sm text-muted-foreground">{isAr ? "التعرف على الأسماء والأرقام الوظيفية" : "Extracting names and employee IDs"}</p>
          </div>
        </Card>
      )}

      {step === "review" && (
        <Card className="p-6 space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="font-bold text-lg">{isAr ? "مراجعة البيانات المستخرجة" : "Review Extracted Data"}</h3>
              <p className="text-sm text-muted-foreground">{isAr ? "يرجى مراجعة وتأكيد المطابقة مع قاعدة البيانات" : "Please review and confirm database matches"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => onConfirm(extractedData.filter(d => d.match))} className="bg-emerald-600 hover:bg-emerald-700">
                {isAr ? "تأكيد واستيراد" : "Confirm & Import"}
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>{isAr ? "الاسم المستخرج (OCR)" : "Extracted Name (OCR)"}</TableHead>
                  <TableHead>{isAr ? "الرقم المستخرج" : "Extracted ID"}</TableHead>
                  <TableHead>{isAr ? "الموظف المطابق" : "Matched Employee"}</TableHead>
                  <TableHead className="text-center">{isAr ? "نسبة الثقة" : "Confidence"}</TableHead>
                  <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{row.rawName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.rawId}</TableCell>
                    <TableCell>
                      {row.match ? (
                        <div>
                          <p className="font-semibold text-sm">{row.match.name}</p>
                          <p className="text-[10px] text-muted-foreground">{row.match.id} - {row.match.department}</p>
                        </div>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold">{isAr ? "غير موجود" : "Not Found"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(row.confidence, row.match)}`}>
                        {row.confidence}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.match && row.confidence >= 95 && <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 className="h-3 w-3"/> Confirmed</div>}
                      {row.match && row.confidence < 95 && <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold"><AlertTriangle className="h-3 w-3"/> Possible Match</div>}
                      {!row.match && <div className="flex items-center gap-1 text-red-600 text-xs font-semibold"><X className="h-3 w-3"/> Unknown</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" title="Edit/Search manually">
                        <Search className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

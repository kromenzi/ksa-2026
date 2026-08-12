"use client";

import { forwardRef } from 'react';
import { ShieldAlert } from 'lucide-react';

interface PrintableAttendanceRecordProps {
  data: any;
  isAr: boolean;
}

const PrintableAttendanceRecord = forwardRef<HTMLDivElement, PrintableAttendanceRecordProps>(
  ({ data, isAr }, ref) => {
    return (
      <div 
        ref={ref} 
        className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] mx-auto text-sm print:m-0 print:p-[10mm] print:shadow-none shadow-xl border relative"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-10 w-10 text-slate-800" />
            <div>
              <h1 className="font-bold text-xl uppercase tracking-wider">UTEC ENTERPRISE</h1>
              <p className="text-xs text-slate-600 uppercase font-semibold">HSE Training & Competency</p>
            </div>
          </div>
          <div className="text-right rtl:text-left">
            <h2 className="font-bold text-lg">{isAr ? "سجل حضور التدريب" : "TRAINING ATTENDANCE RECORD"}</h2>
            <p className="text-xs font-mono text-slate-500">{data.refNo || "TRN-2026-001"}</p>
          </div>
        </div>

        {/* Training Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-2">
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "موضوع التدريب:" : "Training Topic:"}</span>
              <span className="font-medium">{data.title || data.topic}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "المصنع:" : "Factory:"}</span>
              <span>{data.factory}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "القسم:" : "Department:"}</span>
              <span>{data.department}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "التاريخ:" : "Date:"}</span>
              <span>{data.date}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "الوقت والمدة:" : "Time & Duration:"}</span>
              <span>{data.time} ({data.duration})</span>
            </div>
            <div className="flex border-b border-slate-200 pb-1">
              <span className="font-bold w-1/3">{isAr ? "المدرب:" : "Trainer:"}</span>
              <span>{data.trainer}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-slate-800 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-800 py-1.5 px-2 w-[40px]">{isAr ? "م" : "No."}</th>
                <th className="border border-slate-800 py-1.5 px-2">{isAr ? "اسم الموظف" : "Employee Name"}</th>
                <th className="border border-slate-800 py-1.5 px-2 w-[80px]">{isAr ? "الرقم الوظيفي" : "Employee ID"}</th>
                <th className="border border-slate-800 py-1.5 px-2">{isAr ? "المسمى الوظيفي" : "Job Title"}</th>
                <th className="border border-slate-800 py-1.5 px-2">{isAr ? "القسم" : "Department"}</th>
                <th className="border border-slate-800 py-1.5 px-2 w-[70px]">{isAr ? "الحضور" : "Attendance"}</th>
                <th className="border border-slate-800 py-1.5 px-2 w-[100px]">{isAr ? "التوقيع" : "Signature"}</th>
              </tr>
            </thead>
            <tbody>
              {(data.attendance || Array(10).fill({ dummy: true })).map((row: any, idx: number) => (
                <tr key={idx} className="h-8">
                  <td className="border border-slate-800 px-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-800 px-2 font-semibold">{row.employeeName || row.name || ""}</td>
                  <td className="border border-slate-800 px-2 text-center font-mono">{row.employeeId || row.id || ""}</td>
                  <td className="border border-slate-800 px-2">{row.jobTitle || row.title || ""}</td>
                  <td className="border border-slate-800 px-2">{row.department || ""}</td>
                  <td className="border border-slate-800 px-2 text-center text-[10px]">
                    {row.status ? (row.status.toUpperCase()) : ""}
                  </td>
                  <td className="border border-slate-800 px-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Photos Section */}
        <div className="grid grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
          <div>
            <h3 className="font-bold text-xs mb-2 border-b pb-1">{isAr ? "صورة نشاط التدريب" : "Training Activity"}</h3>
            <div className="h-40 border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
              {data.photo1 ? (
                <img src={data.photo1} alt="Activity" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 text-xs">Photo 1 Placeholder</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-xs mb-2 border-b pb-1">{isAr ? "صورة الحضور / المجموعة" : "Training Group / Attendance"}</h3>
            <div className="h-40 border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
              {data.photo2 ? (
                <img src={data.photo2} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 text-xs">Photo 2 Placeholder</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-300 text-xs text-center page-break-inside-avoid mt-auto">
          <div>
            <p className="font-bold mb-8">{isAr ? "المدرب" : "Trainer"}</p>
            <div className="border-b border-slate-400 w-2/3 mx-auto mb-1"></div>
            <p>{data.trainer}</p>
          </div>
          <div>
            <p className="font-bold mb-8">{isAr ? "مدير القسم" : "Department Manager"}</p>
            <div className="border-b border-slate-400 w-2/3 mx-auto mb-1"></div>
            <p>{isAr ? "الاسم والتوقيع" : "Name & Signature"}</p>
          </div>
          <div>
            <p className="font-bold mb-8">{isAr ? "مسؤول السلامة" : "HSE Officer"}</p>
            <div className="border-b border-slate-400 w-2/3 mx-auto mb-1"></div>
            <p>{isAr ? "الاعتماد" : "Approval"}</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableAttendanceRecord.displayName = 'PrintableAttendanceRecord';

export default PrintableAttendanceRecord;

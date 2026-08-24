import { useEffect, useMemo, useState } from "react";
import { FileWarning, Plus, Printer, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/data-context";
import { apiRequest } from "@/lib/queryClient";

type Violation = {
  id: string; refNo: string; date: string; employeeName: string; position: string; employeeId: string;
  referenceTo: string; violationDescription: string; reasonsRequest: string; supervisorName: string; supervisorSignature: string;
  employeeClarification: string; employeeConfirmationName: string; employeeSignature: string; employeeSignedDate: string;
  hrKeepInFile: boolean; hrMolAction: boolean; hrInvestigation: boolean; hrManagerName: string; hrManagerSignature: string; hrActionDate: string;
  status: string;
};

const blank: Omit<Violation, "id" | "refNo"> = {
  date: new Date().toISOString().slice(0, 10), employeeName: "", position: "", employeeId: "", referenceTo: "",
  violationDescription: "", reasonsRequest: "", supervisorName: "", supervisorSignature: "", employeeClarification: "",
  employeeConfirmationName: "", employeeSignature: "", employeeSignedDate: "", hrKeepInFile: false, hrMolAction: false,
  hrInvestigation: false, hrManagerName: "", hrManagerSignature: "", hrActionDate: "", status: "draft",
};

export default function AdminViolationsPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [rows, setRows] = useState<Violation[]>([]);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiRequest("GET", "/api/employee-violations");
      const data = await r.json();
      if (r.ok) setRows(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => [r.refNo, r.employeeName, r.employeeId, r.position]
    .join(" ").toLowerCase().includes(search.toLowerCase())), [rows, search]);

  const set = (key: keyof typeof blank, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.employeeName || !form.date || !form.violationDescription) return;
    const r = await apiRequest("POST", "/api/employee-violations", form);
    if (r.ok) { setForm(blank); setShowForm(false); await load(); }
  };

  const remove = async (id: string) => {
    const r = await apiRequest("DELETE", `/api/employee-violations?id=${encodeURIComponent(id)}`);
    if (r.ok) await load();
  };

  const printForm = () => window.print();

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center"><FileWarning className="h-5 w-5" /></div>
          <div>
            <h1 className="text-2xl font-bold">{isAr ? "المخالفات والمتابعة" : "Violations & Follow Up"}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? "نموذج متابعة الموظف وإفادة الموظف وإجراء الموارد البشرية" : "Employee follow-up, clarification and HR action workflow"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplate(!showTemplate)}><ShieldCheck className="h-4 w-4 mr-2" />{isAr ? "عرض القالب" : "View Template"}</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{isAr ? "مخالفة جديدة" : "New Violation"}</Button>
        </div>
      </div>

      {showTemplate && (
        <Card className="p-5 print-template">
          <div className="grid md:grid-cols-2 border rounded-md overflow-hidden">
            <div className="p-3 font-semibold bg-muted">Follow Up Form</div><div className="p-3 font-semibold bg-muted text-right">نموذج متابعة</div>
            <div className="p-3 border-t">Date: __________</div><div className="p-3 border-t text-right">التاريخ: __________</div>
            <div className="p-3 border-t">To (Employee Name): __________________</div><div className="p-3 border-t text-right">إلى (اسم الموظف): __________________</div>
            <div className="p-3 border-t">Position: __________________</div><div className="p-3 border-t text-right">المسمى الوظيفي: __________________</div>
            <div className="p-3 border-t">Employee ID: __________________</div><div className="p-3 border-t text-right">الرقم الوظيفي: __________________</div>
            <div className="p-3 border-t">In reference to: __________________</div><div className="p-3 border-t text-right">إشارة إلى: __________________</div>
            <div className="p-3 border-t min-h-24">Violations/Remarks Date and Description</div><div className="p-3 border-t min-h-24 text-right">تاريخ ووصف الملاحظات / المخالفات</div>
            <div className="p-3 border-t min-h-24">Please specify the reasons.</div><div className="p-3 border-t min-h-24 text-right">وعليه نأمل الإفادة عن الأسباب عاجلاً.</div>
            <div className="p-3 border-t">Department Supervisor or Manager — Name / Signature</div><div className="p-3 border-t text-right">مشرف أو مدير الإدارة — الاسم / التوقيع</div>
            <div className="p-3 border-t min-h-28">Employee Clarification</div><div className="p-3 border-t min-h-28 text-right">إفادة الموظف</div>
            <div className="p-3 border-t">Employee Name / Signature / Date</div><div className="p-3 border-t text-right">اسم الموظف / توقيع الموظف / التاريخ</div>
            <div className="p-3 border-t">HR Action: keep in file / MOL action / investigation</div><div className="p-3 border-t text-right">الإجراء المطلوب: حفظ بالملف / الجزاء حسب النظام / التحقيق</div>
            <div className="p-3 border-t">HR Manager — Name / Signature / Date</div><div className="p-3 border-t text-right">مدير الموارد البشرية — الاسم / التوقيع / التاريخ</div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-5 space-y-5 print:shadow-none">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{isAr ? "نموذج المخالفة والمتابعة" : "Employee Follow Up / Violation Form"}</h2><Badge>{isAr ? "مسودة" : "Draft"}</Badge></div>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label={isAr ? "التاريخ" : "Date"}><Input type="date" value={form.date} onChange={e=>set("date",e.target.value)} /></Field>
            <Field label={isAr ? "اسم الموظف" : "Employee Name"}><Input value={form.employeeName} onChange={e=>set("employeeName",e.target.value)} /></Field>
            <Field label={isAr ? "المسمى الوظيفي" : "Position"}><Input value={form.position} onChange={e=>set("position",e.target.value)} /></Field>
            <Field label={isAr ? "الرقم الوظيفي" : "Employee ID"}><Input value={form.employeeId} onChange={e=>set("employeeId",e.target.value)} /></Field>
            <Field label={isAr ? "إشارة إلى" : "In reference to"} className="md:col-span-2"><Input value={form.referenceTo} onChange={e=>set("referenceTo",e.target.value)} /></Field>
          </div>
          <Field label={isAr ? "تاريخ ووصف الملاحظات / المخالفات" : "Violations / Remarks Date and Description"}><Textarea rows={5} value={form.violationDescription} onChange={e=>set("violationDescription",e.target.value)} /></Field>
          <Field label={isAr ? "الإفادة عن الأسباب" : "Please specify the reasons"}><Textarea rows={4} value={form.reasonsRequest} onChange={e=>set("reasonsRequest",e.target.value)} /></Field>
          <div className="grid md:grid-cols-2 gap-4"><Field label={isAr ? "مشرف أو مدير الإدارة - الاسم" : "Department Supervisor / Manager - Name"}><Input value={form.supervisorName} onChange={e=>set("supervisorName",e.target.value)} /></Field><Field label={isAr ? "التوقيع" : "Signature"}><Input value={form.supervisorSignature} onChange={e=>set("supervisorSignature",e.target.value)} /></Field></div>
          <Field label={isAr ? "إفادة الموظف" : "Employee Clarification"}><Textarea rows={7} value={form.employeeClarification} onChange={e=>set("employeeClarification",e.target.value)} /></Field>
          <div className="grid md:grid-cols-3 gap-4"><Field label={isAr ? "اسم الموظف" : "Employee Name"}><Input value={form.employeeConfirmationName} onChange={e=>set("employeeConfirmationName",e.target.value)} /></Field><Field label={isAr ? "توقيع الموظف" : "Employee Signature"}><Input value={form.employeeSignature} onChange={e=>set("employeeSignature",e.target.value)} /></Field><Field label={isAr ? "التاريخ" : "Date"}><Input type="date" value={form.employeeSignedDate} onChange={e=>set("employeeSignedDate",e.target.value)} /></Field></div>
          <div className="rounded-xl border p-4 space-y-3"><h3 className="font-semibold">{isAr ? "الإجراء المطلوب - يعبأ بواسطة الموارد البشرية" : "Necessary Action — Filled by HR"}</h3>
            <CheckRow checked={form.hrKeepInFile} onChange={v=>set("hrKeepInFile",v)} label={isAr ? "للحفظ في ملف الموظف مع التعهد بعدم تكرار ذلك مستقبلاً." : "To be kept in the employee’s file with an undertaking not to repeat the violation."} />
            <CheckRow checked={form.hrMolAction} onChange={v=>set("hrMolAction",v)} label={isAr ? "إدارة الموارد البشرية لتطبيق الجزاء / العقوبة كما ينص نظام العمل." : "HR to take the necessary action / penalty as per applicable labor rules."} />
            <CheckRow checked={form.hrInvestigation} onChange={v=>set("hrInvestigation",v)} label={isAr ? "إدارة الموارد البشرية للتحقيق وإكمال اللازم." : "HR for investigation and taking necessary action."} />
          </div>
          <div className="grid md:grid-cols-3 gap-4"><Field label={isAr ? "اسم مدير الموارد البشرية" : "HR Manager - Name"}><Input value={form.hrManagerName} onChange={e=>set("hrManagerName",e.target.value)} /></Field><Field label={isAr ? "التوقيع" : "Signature"}><Input value={form.hrManagerSignature} onChange={e=>set("hrManagerSignature",e.target.value)} /></Field><Field label={isAr ? "التاريخ" : "Date"}><Input type="date" value={form.hrActionDate} onChange={e=>set("hrActionDate",e.target.value)} /></Field></div>
          <div className="flex flex-wrap gap-2 justify-end"><Button variant="outline" onClick={printForm}><Printer className="h-4 w-4 mr-2" />{isAr ? "طباعة" : "Print"}</Button><Button onClick={save}>{isAr ? "حفظ المخالفة" : "Save Violation"}</Button></div>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={isAr ? "ابحث برقم المخالفة أو اسم الموظف أو الرقم الوظيفي" : "Search by ref, employee name or employee ID"} value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <div className="rounded-lg border overflow-hidden"><Table><TableHeader><TableRow><TableHead>{isAr ? "رقم المخالفة" : "Ref"}</TableHead><TableHead>{isAr ? "التاريخ" : "Date"}</TableHead><TableHead>{isAr ? "الموظف" : "Employee"}</TableHead><TableHead>{isAr ? "المخالفة" : "Violation"}</TableHead><TableHead>{isAr ? "الحالة" : "Status"}</TableHead><TableHead className="text-right">{isAr ? "إجراء" : "Action"}</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={6}>{isAr ? "جارٍ التحميل..." : "Loading..."}</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={6}>{isAr ? "لا توجد مخالفات" : "No violations found"}</TableCell></TableRow> : filtered.map(r=><TableRow key={r.id}><TableCell className="font-medium">{r.refNo}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.employeeName}</TableCell><TableCell className="max-w-[340px] truncate">{r.violationDescription}</TableCell><TableCell><Badge variant="outline">{r.status}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={()=>{setForm({...r});setShowForm(true);}}><FileWarning className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={()=>remove(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
      </Card>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`space-y-2 block ${className}`}><span className="text-sm font-medium">{label}</span>{children}</label>; }
function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className="flex items-start gap-3 text-sm"><Checkbox checked={checked} onCheckedChange={(v)=>onChange(v === true)} /><span>{label}</span></label>; }

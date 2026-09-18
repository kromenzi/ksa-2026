"use client";

import { useMemo, useState } from "react";
import { Award, BadgeCheck, CreditCard, Flame, GraduationCap, Printer, ShieldCheck } from "lucide-react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrintShareDialog from "@/components/print-share-dialog";
import {
  OfficialHseTemplate,
  OFFICIAL_HSE_TEMPLATE_META,
  type OfficialHseTemplateData,
  type OfficialHseTemplateKind,
} from "@/components/official-templates";

const SAMPLE_DATA: Record<OfficialHseTemplateKind, OfficialHseTemplateData> = {
  "equipment-authorization": {
    reference: "AUTH-2026-0001",
    employeeName: "Employee Name",
    employeeId: "EMP-0001",
    department: "Production",
    authorizedEquipment: "Forklift / FL-01",
    issueDate: "2026-09-18",
    expiryDate: "2027-09-18",
    trainer: "Trainer Name",
    approver: "HSE Manager",
  },
  "professional-license": {
    reference: "LIC-2026-0001",
    employeeName: "Employee Name",
    employeeId: "EMP-0001",
    nationalId: "XXXXXXXXXX",
    jobTitle: "Job Title",
    department: "Department",
    qualification: "Qualified Operator",
    expiryDate: "2027-09-18",
    approver: "HSE Manager",
  },
  "fire-drill": {
    reference: "DRILL-2026-0001",
    factory: "MV/LV Factory",
    date: "2026-09-18",
    location: "Factory & Assembly Area",
    scenario: "Fire / Evacuation Scenario",
    participants: "120",
    evacuationTime: "4 min 25 sec",
    assemblyPoint: "Assembly Point A",
    coordinator: "Drill Coordinator",
    safetyOfficer: "Safety Officer",
    approver: "HSE Manager",
  },
  "safety-training": {
    reference: "CERT-2026-0001",
    participantName: "Participant Name",
    courseTitle: "Safety Training Course",
    trainingHours: "4 Hours",
    date: "2026-09-18",
    trainer: "Trainer Name",
    department: "Department",
    location: "Training Room",
    certificateNo: "CERT-2026-0001",
    approver: "HSE Manager",
  },
};

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value || ""} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

export default function AdminOfficialTemplatesPage() {
  const { settings } = useData();
  const isAr = settings.language === "ar";
  const [kind, setKind] = useState<OfficialHseTemplateKind>("equipment-authorization");
  const [data, setData] = useState<OfficialHseTemplateData>(SAMPLE_DATA["equipment-authorization"]);
  const [printOpen, setPrintOpen] = useState(false);

  const meta = useMemo(() => OFFICIAL_HSE_TEMPLATE_META.find(item => item.kind === kind)!, [kind]);
  const set = (key: keyof OfficialHseTemplateData, value: string) => setData(prev => ({ ...prev, [key]: value }));
  const qrValue = typeof window !== "undefined"
    ? window.location.origin + "/admin/official-templates?ref=" + encodeURIComponent(data.reference || data.certificateNo || kind)
    : data.reference || data.certificateNo || kind;

  const chooseTemplate = (next: OfficialHseTemplateKind) => {
    setKind(next);
    setData({ ...SAMPLE_DATA[next] });
  };

  const printItem = {
    id: data.reference || data.certificateNo || kind,
    type: (kind === "fire-drill" || kind === "safety-training" ? "certificate" : "license") as "certificate" | "license",
    refNo: data.reference || data.certificateNo,
    title: isAr ? meta.titleAr : meta.titleEn,
    department: data.department || data.factory || "HSE",
    status: "Official Template",
    date: data.date || data.issueDate || data.expiryDate,
    sections: [
      { label: isAr ? "القالب" : "Template", value: isAr ? meta.titleAr : meta.titleEn },
      { label: isAr ? "المرجع" : "Reference", value: data.reference || data.certificateNo || "—" },
    ],
  };

  const template = (
    <OfficialHseTemplate
      kind={kind}
      data={data}
      branding={settings.branding}
      qrValue={qrValue}
    />
  );

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"} data-testid="official-hse-templates-page">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Award className="h-6 w-6 text-amber-500" />
          {isAr ? "مركز القوالب الرسمية HSE" : "Official HSE Template Center"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? "بطاقات رخص وتفويضات وشهادات رسمية ثنائية اللغة مرتبطة بهوية البورد وقابلة للتعبئة والمعاينة والطباعة وPDF."
            : "Bilingual official license, authorization and certificate templates linked to board branding and ready for data entry, preview, print and PDF."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {OFFICIAL_HSE_TEMPLATE_META.map(item => {
          const Icon = item.kind === "equipment-authorization" ? ShieldCheck : item.kind === "professional-license" ? CreditCard : item.kind === "fire-drill" ? Flame : GraduationCap;
          const active = kind === item.kind;
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => chooseTemplate(item.kind)}
              className={"rounded-xl border p-4 text-start transition " + (active ? "border-teal-500 bg-teal-500/5 ring-2 ring-teal-500/20" : "hover:bg-muted/40")}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className="h-5 w-5 text-teal-600" />
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">{item.format}</span>
              </div>
              <div className="font-bold">{isAr ? item.titleAr : item.titleEn}</div>
              <p className="mt-1 text-xs text-muted-foreground">{isAr ? item.descriptionAr : item.descriptionEn}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{isAr ? "بيانات القالب" : "Template Data"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "نوع القالب" : "Template Type"}</Label>
              <Select value={kind} onValueChange={value => chooseTemplate(value as OfficialHseTemplateKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFFICIAL_HSE_TEMPLATE_META.map(item => <SelectItem key={item.kind} value={item.kind}>{isAr ? item.titleAr : item.titleEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(kind === "equipment-authorization" || kind === "professional-license") && (
              <>
                <FormField label={isAr ? "رقم البطاقة / الرخصة" : "Card / License No."} value={data.reference} onChange={v => set("reference", v)} />
                <FormField label={isAr ? "اسم الموظف" : "Employee Name"} value={data.employeeName} onChange={v => set("employeeName", v)} />
                <FormField label={isAr ? "الرقم الوظيفي" : "Employee ID"} value={data.employeeId} onChange={v => set("employeeId", v)} />
                <FormField label={isAr ? "المسمى الوظيفي" : "Job Title"} value={data.jobTitle} onChange={v => set("jobTitle", v)} />
                <FormField label={isAr ? "القسم" : "Department"} value={data.department} onChange={v => set("department", v)} />
                {kind === "professional-license" ? (
                  <>
                    <FormField label={isAr ? "رقم الهوية / المعرف" : "National ID / Identifier"} value={data.nationalId} onChange={v => set("nationalId", v)} />
                    <FormField label={isAr ? "المؤهل / نوع الرخصة" : "Qualification / License Type"} value={data.qualification} onChange={v => set("qualification", v)} />
                  </>
                ) : (
                  <FormField label={isAr ? "المعدة المصرح بها" : "Authorized Equipment"} value={data.authorizedEquipment} onChange={v => set("authorizedEquipment", v)} />
                )}
                <FormField label={isAr ? "تاريخ الإصدار" : "Issue Date"} value={data.issueDate} onChange={v => set("issueDate", v)} type="date" />
                <FormField label={isAr ? "تاريخ الانتهاء" : "Expiry Date"} value={data.expiryDate} onChange={v => set("expiryDate", v)} type="date" />
                <FormField label={isAr ? "المدرب" : "Trainer"} value={data.trainer} onChange={v => set("trainer", v)} />
                <FormField label={isAr ? "الاعتماد" : "Approver"} value={data.approver} onChange={v => set("approver", v)} />
              </>
            )}

            {kind === "safety-training" && (
              <>
                <FormField label={isAr ? "اسم المتدرب" : "Participant Name"} value={data.participantName} onChange={v => set("participantName", v)} />
                <FormField label={isAr ? "عنوان الدورة" : "Course Title"} value={data.courseTitle} onChange={v => set("courseTitle", v)} />
                <FormField label={isAr ? "ساعات التدريب" : "Training Hours"} value={data.trainingHours} onChange={v => set("trainingHours", v)} />
                <FormField label={isAr ? "التاريخ" : "Date"} value={data.date} onChange={v => set("date", v)} type="date" />
                <FormField label={isAr ? "القسم" : "Department"} value={data.department} onChange={v => set("department", v)} />
                <FormField label={isAr ? "الموقع" : "Location"} value={data.location} onChange={v => set("location", v)} />
                <FormField label={isAr ? "المدرب" : "Trainer"} value={data.trainer} onChange={v => set("trainer", v)} />
                <FormField label={isAr ? "رقم الشهادة" : "Certificate No."} value={data.certificateNo} onChange={v => set("certificateNo", v)} />
                <FormField label={isAr ? "الاعتماد" : "Approver"} value={data.approver} onChange={v => set("approver", v)} />
              </>
            )}

            {kind === "fire-drill" && (
              <>
                <FormField label={isAr ? "رقم الشهادة / التمرين" : "Certificate / Drill Ref"} value={data.reference} onChange={v => set("reference", v)} />
                <FormField label={isAr ? "المصنع / القسم" : "Factory / Department"} value={data.factory} onChange={v => set("factory", v)} />
                <FormField label={isAr ? "التاريخ" : "Date"} value={data.date} onChange={v => set("date", v)} type="date" />
                <FormField label={isAr ? "الموقع" : "Location"} value={data.location} onChange={v => set("location", v)} />
                <FormField label={isAr ? "سيناريو التمرين" : "Scenario"} value={data.scenario} onChange={v => set("scenario", v)} />
                <FormField label={isAr ? "المشاركون" : "Participants"} value={data.participants} onChange={v => set("participants", v)} />
                <FormField label={isAr ? "زمن الإخلاء" : "Evacuation Time"} value={data.evacuationTime} onChange={v => set("evacuationTime", v)} />
                <FormField label={isAr ? "نقطة التجمع" : "Assembly Point"} value={data.assemblyPoint} onChange={v => set("assemblyPoint", v)} />
                <FormField label={isAr ? "المنسق" : "Coordinator"} value={data.coordinator} onChange={v => set("coordinator", v)} />
                <FormField label={isAr ? "مسؤول السلامة" : "Safety Officer"} value={data.safetyOfficer} onChange={v => set("safetyOfficer", v)} />
                <FormField label={isAr ? "الاعتماد" : "Approver"} value={data.approver} onChange={v => set("approver", v)} />
                <div className="space-y-1.5"><Label className="text-xs">{isAr ? "ملاحظات" : "Notes"}</Label><Textarea value={data.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} /></div>
              </>
            )}

            <Button className="w-full gap-2" onClick={() => setPrintOpen(true)}>
              <Printer className="h-4 w-4" />
              {isAr ? "معاينة الطباعة / PDF" : "Print / PDF Preview"}
            </Button>
          </CardContent>
        </Card>

        <div
          className="relative min-w-0 overflow-auto rounded-2xl border border-slate-200/80 p-4 shadow-inner md:p-7"
          style={{
            background:
              "radial-gradient(circle at 12% 0%, rgba(15,143,138,.14), transparent 28%), radial-gradient(circle at 88% 100%, rgba(11,58,103,.14), transparent 32%), linear-gradient(145deg,#eef5f7 0%,#f8fbfc 48%,#e9f1f5 100%)",
          }}
        >
          <div className="relative mx-auto min-w-[900px] py-2">{template}</div>
        </div>
      </div>

      <PrintShareDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        item={printItem}
        customContent={template}
        preserveCustomColors
      />
    </div>
  );
}

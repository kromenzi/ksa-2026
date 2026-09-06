from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


# 1) Shared bilingual SOR / incident outcome classifier.
helper = '''export type SafetyPyramidLevel =
  | "fatality"
  | "lostTime"
  | "restrictedWork"
  | "medicalTreatment"
  | "firstAid"
  | "nearMiss"
  | "unsafeActs";

export function normalizeSafetyText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNearMissText(...values: unknown[]): boolean {
  const text = normalizeSafetyText(values.map((value) => String(value ?? "")).join(" "));
  return [
    "near miss",
    "شبه حادث",
    "شبه الحادث",
    "شبه الحوادث",
    "واقعه وشيكه",
    "حادث وشيك",
    "حادث وشيكه",
    "حادث كاد ان يقع",
  ].some((term) => text.includes(term));
}

export function classifySafetyOutcome(input: {
  category?: unknown;
  description?: unknown;
  riskLevel?: unknown;
  type?: unknown;
}): SafetyPyramidLevel {
  const category = normalizeSafetyText(input.category);
  const description = normalizeSafetyText(input.description);
  const type = normalizeSafetyText(input.type);
  const risk = normalizeSafetyText(input.riskLevel);
  const text = `${category} ${description} ${type}`.trim();

  if (text.includes("fatal") || text.includes("وفاه")) return "fatality";
  if (text.includes("lost time") || text.includes(" lti") || text.startsWith("lti") || text.includes("وقت ضائع")) return "lostTime";
  if (text.includes("restricted") || text.includes(" rwd") || text.startsWith("rwd") || text.includes("عمل مقيد")) return "restrictedWork";
  if (text.includes("medical") || text.includes(" mtc") || text.startsWith("mtc") || text.includes("hospital") || text.includes("علاج طبي") || text.includes("مستشفي")) return "medicalTreatment";
  if (text.includes("first aid") || text.includes(" fac") || text.startsWith("fac") || text.includes("clinic") || text.includes("اسعافات اوليه") || text.includes("اسعاف اولي")) return "firstAid";
  if (isNearMissText(category, description, type)) return "nearMiss";
  if (risk === "high" && (description.includes("injury") || description.includes("اصابه"))) return "lostTime";
  return "unsafeActs";
}
'''
write("src/lib/safety-outcome.ts", helper)

# 2) Reports: real SOR escalation button + durable linkage back to source_metadata.
path = "src/pages/admin/reports.tsx"
text = read(path)
text = replace_once(
    text,
    "FileSearch, Copy, Archive, FileSpreadsheet, FileCode2 } from \"lucide-react\";",
    "FileSearch, Copy, Archive, FileSpreadsheet, FileCode2, Send } from \"lucide-react\";",
    "reports lucide import",
)
text = replace_once(
    text,
    'import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";\n',
    'import ExportPreviewModal, { type ExportColumnDef, type ExportOptions } from "@/components/export-preview-modal";\nimport { apiRequest } from "@/lib/queryClient";\n',
    "reports apiRequest import",
)
text = replace_once(
    text,
    '  const [filterStatus, setFilterStatus] = useState<string>("all");\n',
    '  const [filterStatus, setFilterStatus] = useState<string>("all");\n  const [escalatingId, setEscalatingId] = useState<string | null>(null);\n',
    "reports escalation state",
)
marker = '  const handlePrint = useCallback(() => {\n'
handler = '''  const handleEscalateSafetyReport = useCallback(async (report: SafetyReport) => {
    const existing = report.sourceMetadata?.escalation;
    if (existing?.id) {
      window.location.assign('/admin/escalations/history');
      return;
    }
    if (report.status === 'closed') {
      toast({
        title: isAr ? 'لا يمكن تصعيد تقرير مغلق' : 'Closed report cannot be escalated',
        variant: 'destructive',
      });
      return;
    }

    setEscalatingId(report.id);
    try {
      const risk = String(report.riskLevel || 'medium').toLowerCase();
      const level = risk === 'critical'
        ? 'Level 3 - HSE / Plant Manager'
        : risk === 'high'
          ? 'Level 2 - Department Manager'
          : 'Level 1 - Supervisor';
      const description = String(report.observationDescription || '').trim();
      const response = await apiRequest('POST', '/api/escalations', {
        source: report.reportNo || `SOR:${report.id}`,
        sourceType: 'SOR',
        sourceId: report.id,
        sourceRef: report.reportNo,
        title: `${report.reportNo || 'SOR'} - ${description.slice(0, 120) || (isAr ? 'ملاحظة سلامة' : 'Safety observation')}`,
        severity: risk.toUpperCase(),
        level,
        department: report.department || 'HSE',
        responsible: currentUser?.name || 'HSE Lead',
        reason: description || (isAr ? 'تصعيد تقرير ملاحظة سلامة' : 'Safety observation report escalation'),
      });
      const escalation = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(escalation?.error || 'Unable to create escalation');

      const previousMetadata = report.sourceMetadata && typeof report.sourceMetadata === 'object'
        ? report.sourceMetadata
        : {};
      await updateSafetyReport(report.id, {
        sourceMetadata: {
          ...previousMetadata,
          escalation: {
            id: escalation.id,
            refNo: escalation.refNo,
            status: escalation.status,
            createdAt: escalation.createdAt || new Date().toISOString(),
            sourceType: 'SOR',
            sourceId: report.id,
            sourceRef: report.reportNo,
          },
        },
      });
      logActivity(
        'Escalate Safety Report',
        `Escalated ${report.reportNo} to ${escalation.refNo || 'existing escalation'}`,
        'reports',
      );
      toast({
        title: escalation.alreadyExists
          ? (isAr ? 'التقرير مصعّد مسبقاً' : 'Report already escalated')
          : (isAr ? 'تم تصعيد تقرير SOR' : 'SOR escalated successfully'),
        description: escalation.refNo || undefined,
      });
    } catch (error: any) {
      toast({
        title: isAr ? 'فشل تصعيد التقرير' : 'Escalation failed',
        description: error?.message || (isAr ? 'تعذر إنشاء التصعيد' : 'Unable to create escalation'),
        variant: 'destructive',
      });
    } finally {
      setEscalatingId(null);
    }
  }, [currentUser?.name, isAr, logActivity, toast, updateSafetyReport]);

'''
text = replace_once(text, marker, handler + marker, "reports escalation handler")
action_marker = '''                        {canCreate && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600" onClick={() => { setEditingReport(sr); setFormOpen(true); }} title={isAr ? 'تعديل' : 'Edit'} data-testid={`button-edit-${sr.id}`}>
'''
escalation_button = '''                        {canCreate && sr.status !== 'closed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-lg ${sr.sourceMetadata?.escalation?.id ? 'text-emerald-600 hover:bg-emerald-500/10' : 'hover:bg-red-500/10 hover:text-red-600'}`}
                            onClick={() => handleEscalateSafetyReport(sr)}
                            disabled={escalatingId === sr.id}
                            title={sr.sourceMetadata?.escalation?.id
                              ? (isAr ? `تم التصعيد: ${sr.sourceMetadata.escalation.refNo || ''}` : `Escalated: ${sr.sourceMetadata.escalation.refNo || ''}`)
                              : (isAr ? 'تصعيد التقرير' : 'Escalate SOR')}
                            data-testid={`button-escalate-sor-${sr.id}`}
                          >
                            {escalatingId === sr.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : sr.sourceMetadata?.escalation?.id
                                ? <ShieldCheck className="h-4 w-4" />
                                : <Send className="h-4 w-4" />}
                          </Button>
                        )}
'''
text = replace_once(text, action_marker, escalation_button + action_marker, "reports escalation button")
write(path, text)

# 3) Escalation API: preserve source type/id/ref and make creation idempotent for a source record.
path = "api/escalations/index.ts"
text = read(path)
text = replace_once(
    text,
    '    source: data.source || row.ref_no,\n',
    '    source: data.source || row.ref_no,\n    sourceType: data.sourceType || null,\n    sourceId: data.sourceId || null,\n    sourceRef: data.sourceRef || data.source || null,\n',
    "escalation toClient source linkage",
)
text = replace_once(
    text,
    '      const year = new Date().getFullYear();\n',
    '''      const sourceType = String(body.sourceType || "").trim().toUpperCase();
      const sourceId = String(body.sourceId || "").trim();
      const sourceRef = String(body.sourceRef || body.source || "").trim();
      if (sourceType && sourceId) {
        const existingResponse = await supabaseFetchForRequest(req, "/rest/v1/escalations?select=*&order=created_at.desc");
        const existingRows = await existingResponse.json();
        if (!existingResponse.ok) return json(res, existingResponse.status, { error: existingRows?.message || "Unable to verify source escalation" });
        const existing = Array.isArray(existingRows)
          ? existingRows.find((row: any) => String(row?.data?.sourceType || "").toUpperCase() === sourceType && String(row?.data?.sourceId || "") === sourceId)
          : null;
        if (existing) return json(res, 200, { ...toClient(existing), alreadyExists: true });
      }

      const year = new Date().getFullYear();
''',
    "escalation idempotency",
)
text = replace_once(
    text,
    '          source: String(body.source || "MANUAL"),\n',
    '          source: String(body.source || sourceRef || "MANUAL"),\n          sourceType: sourceType || null,\n          sourceId: sourceId || null,\n          sourceRef: sourceRef || null,\n',
    "escalation source persistence",
)
write(path, text)

# 4) Dashboard: bilingual/variant Near Miss matching for SOR.
path = "src/pages/admin/dashboard.tsx"
text = read(path)
text = replace_once(
    text,
    'import IncidentPyramid from "@/components/incident-pyramid";\n',
    'import IncidentPyramid from "@/components/incident-pyramid";\nimport { isNearMissText } from "@/lib/safety-outcome";\n',
    "dashboard outcome import",
)
old = "  const nearMissCount = safetyReports.filter(r => String(r.category || '').toLowerCase().includes('near miss')).length + incidentRecords.filter((r: any) => String(r.data?.type || '').toLowerCase() === 'near miss').length;\n"
new = "  const nearMissCount = safetyReports.filter(r => isNearMissText(r.category, r.observationDescription)).length + incidentRecords.filter((r: any) => isNearMissText(r.data?.type, r.data?.description, r.title)).length;\n"
text = replace_once(text, old, new, "dashboard near miss count")
write(path, text)

# 5) Dedicated pyramid: classify bilingual SOR outcomes consistently.
path = "src/pages/admin/safety-pyramid.tsx"
text = read(path)
text = replace_once(
    text,
    'import { toast } from "sonner";\n',
    'import { toast } from "sonner";\nimport { classifySafetyOutcome } from "@/lib/safety-outcome";\n',
    "safety pyramid outcome import",
)
start = text.index("function classifySafetyReport(r: any): LevelId {")
end = text.index("function classifyNcr", start)
replacement = '''function classifySafetyReport(r: any): LevelId {
  return classifySafetyOutcome({
    category: r.category,
    description: r.observationDescription,
    riskLevel: r.riskLevel,
  });
}

'''
text = text[:start] + replacement + text[end:]
write(path, text)

# 6) Embedded dashboard pyramid: same SOR classifier to keep board and full pyramid identical.
path = "src/components/incident-pyramid.tsx"
text = read(path)
text = replace_once(
    text,
    'import { cn } from "@/lib/utils";\n',
    'import { cn } from "@/lib/utils";\nimport { classifySafetyOutcome } from "@/lib/safety-outcome";\n',
    "embedded pyramid outcome import",
)
start_token = 'const risk=(rep.riskLevel||"").toLowerCase();'
end_token = 'list.push({id:rep.id'
start = text.index(start_token)
end = text.index(end_token, start)
text = text[:start] + 'const levelId=classifySafetyOutcome({category:rep.category,description:rep.observationDescription,riskLevel:rep.riskLevel});' + text[end:]
write(path, text)

print("SOR escalation linkage and bilingual pyramid/dashboard classification patches applied.")

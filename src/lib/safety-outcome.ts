export type SafetyPyramidLevel =
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
    .replace(/[ً-ٰٟ]/g, "")
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

export type SettingsRole = "admin" | "manager" | "editor" | "viewer";
export type SettingsModule = "users" | "content" | "sections" | "forms" | "reports" | "ncr" | "documents";
export type SettingsAction = "create" | "read" | "update" | "delete" | "send_email";

export const DEFAULT_JOB_TITLES = [
  "Safety Officer",
  "HSE Inspector",
  "Environmental Engineer",
  "LOTO Technician",
  "Industrial Hygienist",
  "Safety Director",
];

export const STANDARD_RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

export const DEFAULT_INCIDENT_CATEGORIES = [
  "Chemical Spill",
  "Near Miss",
  "Property Damage",
  "First Aid",
  "Lost Time Injury (LTI)",
  "Fire Hazard",
];

export const DEFAULT_TRAINING_CATEGORIES = [
  "General EHS",
  "Fire Safety",
  "LOTO Authorization",
  "Scaffolding Safety",
  "Hazard Communication",
  "First Aid & CPR",
];

export const DEFAULT_PERMIT_TYPES = [
  "Hot Work",
  "Cold Work",
  "Confined Space Entry",
  "Working at Height",
  "Electrical Isolation",
  "Excavation",
];

export const DEFAULT_LOTO_CATEGORIES = [
  "Electrical Substation",
  "Hydraulic Line",
  "Pneumatic Valve",
  "Chemical Line Isolation",
  "Mechanical Lockout",
];

export function createDefaultNumbering() {
  return {
    ncrPrefix: "NCR",
    incPrefix: "INC",
    tbtPrefix: "TBT",
    insPrefix: "INS",
    audPrefix: "AUD",
    ptwPrefix: "PTW",
    lotoPrefix: "LOTO",
    astPrefix: "AST",
    rptPrefix: "RPT",
    yearFormat: "YYYY" as "YYYY" | "YY",
    includeMonth: true,
    includeFactoryCode: true,
    includeDeptCode: false,
    digitLength: 6,
    separator: "-",
  };
}

export function createDefaultQrConfig() {
  return {
    qrSize: 180,
    qrPosition: "top-right" as "top-right" | "top-left" | "bottom-right" | "bottom-left",
    qrStyle: "rounded" as "square" | "rounded" | "dots",
    qrMargin: 8,
    fgColor: "#0f172a",
    bgColor: "#ffffff",
    autoGenerate: true,
  };
}

export function createDefaultPdfConfig() {
  return {
    headerLogoPosition: "left" as "left" | "center" | "right",
    watermarkText: "CONFIDENTIAL & PROPRIETARY",
    confidentialFooter: "Strictly Confidential - Abdulkarem Safety Board Platform © 2026",
    topMargin: "15mm",
    bottomMargin: "15mm",
    leftMargin: "12mm",
    rightMargin: "12mm",
    enableDpi300: true,
  };
}

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAuthUser, getProfile, json, supabaseFetch, supabaseFetchForRequest } from "./_lib/supabase.js";

const RESOURCE_MAP: Record<string, { table: string; module: string; single?: boolean; adminOnly?: boolean }> = {
  users: { table: "users", module: "users", adminOnly: true },
  posts: { table: "posts", module: "content" },
  sections: { table: "sections", module: "content" },
  forms: { table: "form_templates", module: "content" },
  reports: { table: "reports", module: "reports" },
  "activity-logs": { table: "activity_logs", module: "activity" },
  employees: { table: "employees", module: "users" },
  "routing-rules": { table: "routing_rules", module: "settings" },
  permissions: { table: "permissions", module: "settings", adminOnly: true },
  documents: { table: "documents", module: "documents" },
  "section-config": { table: "section_config", module: "settings" },
  "email-settings": { table: "email_config", module: "settings", single: true, adminOnly: true },
  "report-settings": { table: "report_settings", module: "settings", single: true, adminOnly: true },
  "site-settings": { table: "site_settings", module: "settings", single: true, adminOnly: true },
  plants: { table: "plants", module: "settings" },
  licenses: { table: "licenses", module: "reports" },
  "equipment-auth": { table: "equipment_auth", module: "reports" },
  trainings: { table: "trainings", module: "reports" },
  "training-matrix": { table: "training_matrix", module: "reports" },
  competency: { table: "competency", module: "reports" },
  inspections: { table: "inspections", module: "reports" },
  incidents: { table: "incidents", module: "reports" },
  audits: { table: "audits", module: "reports" },
  compliance: { table: "compliance", module: "reports" },
  loto: { table: "loto", module: "reports" },
  permits: { table: "permits", module: "reports" },
  "safety-reporting": { table: "safety_reporting_cases", module: "reports" },
  "safety-reporting-messages": { table: "safety_reporting_messages", module: "reports" },
  "safety-reporting-channels": { table: "safety_reporting_channels", module: "settings" },
  "escalation-matrix": { table: "escalation_matrix", module: "reports" },
};

const GENERIC_COLUMNS = new Set(["id", "ref_no", "title", "status", "department", "date", "data", "created_by", "created_at", "updated_at"]);
const GENERIC_TABLES = new Set([
  "plants", "licenses", "equipment_auth", "trainings", "training_matrix", "competency",
  "inspections", "incidents", "audits", "compliance", "loto", "permits", "escalation_matrix", "safety_reporting_cases",
]);

const COLUMNS: Record<string, Set<string>> = {
  users: new Set(["id", "name", "email", "role", "is_active", "avatar", "joined_at", "auth_user_id"]),
  posts: new Set(["id", "title", "content", "author_id", "section_id", "status", "created_at", "tags"]),
  sections: new Set(["id", "name", "slug", "description", "is_visible", "order"]),
  form_templates: new Set(["id", "title", "description", "fields", "created_at", "status"]),
  reports: new Set(["id", "title", "type", "generated_by", "created_at", "status", "data"]),
  activity_logs: new Set(["id", "action", "details", "performed_by", "performed_by_name", "timestamp", "module"]),
  employees: new Set(["id", "name", "email", "title", "department_id", "is_primary"]),
  routing_rules: new Set(["id", "department_id", "severity", "recipient_ids"]),
  permissions: new Set(["id", "role", "module", "actions"]),
  documents: new Set(["id", "doc_type", "ref_no", "title", "date", "vendor", "department", "status", "category", "description", "amount", "expiry_date", "metadata", "pdf_url", "extracted_data", "created_by", "created_at", "updated_at"]),
  section_config: new Set(["id", "section_type", "categories", "required_fields", "number_prefix", "number_format"]),
  email_config: new Set(["id", "smtp_host", "smtp_port", "username", "password", "from_name", "from_email", "enable_sending", "signature"]),
  report_settings: new Set(["id", "plant_prefix", "date_format", "reset_rule", "company_name", "company_logo", "template_title", "public_base_url"]),
  site_settings: new Set(["id", "site_name", "description", "allow_registration", "maintenance_mode", "language", "theme", "color_theme", "branding"]),
  plants: GENERIC_COLUMNS,
  licenses: GENERIC_COLUMNS,
  equipment_auth: GENERIC_COLUMNS,
  trainings: GENERIC_COLUMNS,
  training_matrix: GENERIC_COLUMNS,
  competency: GENERIC_COLUMNS,
  inspections: GENERIC_COLUMNS,
  incidents: GENERIC_COLUMNS,
  audits: GENERIC_COLUMNS,
  compliance: GENERIC_COLUMNS,
  loto: GENERIC_COLUMNS,
  permits: GENERIC_COLUMNS,
  safety_reporting_cases: GENERIC_COLUMNS,
  safety_reporting_messages: new Set(["id", "case_id", "sender_type", "message", "created_by", "created_at"]),
  safety_reporting_channels: new Set(["id", "channel", "is_enabled", "public_label_ar", "public_label_en", "destination", "config", "updated_at"]),
  escalation_matrix: GENERIC_COLUMNS,
};

const camelToSnake = (value: string) => value.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
const snakeToCamel = (value: string) => value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapClient = (row: any) => row && typeof row === "object" ? Object.fromEntries(Object.entries(row).map(([k, v]) => [snakeToCamel(k), v])) : row;

function sanitizeBody(table: string, body: any, mode: "insert" | "update") {
  const allowed = COLUMNS[table] || new Set<string>();
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(body || {})) {
    const column = camelToSnake(key);
    if (!allowed.has(column)) continue;
    if (table === "users" && column === "password") continue;
    if (mode === "update" && column === "id") continue;
    out[column] = value;
  }
  return out;
}


const REPORTING_KEY_NAMES = {
  encryption: "safety_reporting_encryption_key_v1",
  lookup: "safety_reporting_lookup_key_v1",
  tracking: "safety_reporting_tracking_key_v1",
} as const;

function cleanReporting(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

function getClientIp(req: any) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0]?.trim();
  return forwarded || String(req?.headers?.["x-real-ip"] || req?.socket?.remoteAddress || "unknown");
}

async function getReportingCryptoMaterial() {
  const response = await supabaseFetch("/rest/v1/rpc/safety_reporting_crypto_material", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const payload = await response.json();
  if (!response.ok || !payload || typeof payload !== "object") throw new Error("Safety reporting crypto material unavailable");
  const encryption = String(payload[REPORTING_KEY_NAMES.encryption] || "");
  const lookup = String(payload[REPORTING_KEY_NAMES.lookup] || "");
  const tracking = String(payload[REPORTING_KEY_NAMES.tracking] || "");
  if (!encryption || !lookup || !tracking) throw new Error("Safety reporting crypto material incomplete");
  return { encryption, lookup, tracking };
}

function reportingHmac(value: string, keyB64: string) {
  return createHmac("sha256", Buffer.from(keyB64, "base64"))
    .update(value.trim().toLowerCase(), "utf8")
    .digest("base64");
}

function safeEqualB64(a: string, b: string) {
  try {
    const left = Buffer.from(a, "base64");
    const right = Buffer.from(b, "base64");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function encryptReporterIdentity(payload: Record<string, string>, keyB64: string) {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("Invalid reporter encryption key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    encryptedPayload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptReporterIdentity(ciphertext: string, ivB64: string, authTagB64: string, keyB64: string) {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("Invalid reporter encryption key");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}

function createTrackingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

async function consumeReportingRateLimit(req: any, action: string, limit: number, windowSeconds: number, lookupKey: string) {
  const ipKey = reportingHmac(`ip:${getClientIp(req)}`, lookupKey);
  const response = await supabaseFetch("/rest/v1/rpc/consume_safety_reporting_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_key_hash: ipKey,
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error("Unable to enforce reporting rate limit");
  const row = Array.isArray(payload) ? payload[0] : payload;
  return { allowed: Boolean(row?.allowed), resetAt: row?.reset_at || null };
}

async function serviceRows(path: string, init: RequestInit = {}) {
  const response = await supabaseFetch(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Safety reporting backend request failed");
  return payload;
}

async function handlePublicSafetyReporting(req: any, res: any) {
  const action = String(req.query?.action || "channels").trim().toLowerCase();

  if (action === "channels" && req.method === "GET") {
    const rows = await serviceRows("/rest/v1/safety_reporting_channels?select=channel,is_enabled,public_label_ar,public_label_en,destination&is_enabled=eq.true&order=channel.asc");
    return json(res, 200, { channels: Array.isArray(rows) ? rows.map(mapClient) : [] });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const keys = await getReportingCryptoMaterial();
  const limits: Record<string, [number, number]> = {
    intake: [8, 3600],
    status: [30, 3600],
    message: [20, 3600],
  };
  const config = limits[action];
  if (!config) return json(res, 404, { error: "Unsupported reporting action" });
  const rate = await consumeReportingRateLimit(req, action, config[0], config[1], keys.lookup);
  if (!rate.allowed) return json(res, 429, { error: "Too many requests", resetAt: rate.resetAt });

  const body = req.body || {};
  if (cleanReporting(body.website, 200)) return json(res, 400, { error: "Invalid submission" });

  if (action === "intake") {
    const mode = ["anonymous", "confidential", "identified"].includes(body.identityMode) ? body.identityMode : "anonymous";
    const description = cleanReporting(body.description, 6000);
    if (description.length < 10) return json(res, 422, { error: "A clear report description is required" });

    const reporter = {
      name: cleanReporting(body.reporter?.name, 160),
      email: cleanReporting(body.reporter?.email, 254),
      phone: cleanReporting(body.reporter?.phone, 60),
      employeeId: cleanReporting(body.reporter?.employeeId, 100),
    };
    if (mode === "confidential" && !reporter.email && !reporter.phone) {
      return json(res, 422, { error: "Confidential reports require an email address or phone number for follow-up" });
    }
    if (mode === "identified" && (!reporter.name || (!reporter.email && !reporter.phone))) {
      return json(res, 422, { error: "Identified reports require a name and at least one contact method" });
    }

    const category = cleanReporting(body.category, 80) || "other";
    const immediate = Boolean(body.immediateLifeThreat);
    const severity = immediate ? "Critical" : ["Low", "Medium", "High", "Critical"].includes(body.severity) ? body.severity : "Medium";
    const code = createTrackingCode();
    const tokenHmac = reportingHmac(code, keys.tracking);
    const now = new Date().toISOString();

    const cases = await serviceRows("/rest/v1/safety_reporting_cases?select=id,ref_no,status,created_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: cleanReporting(body.title, 180) || `${category.replaceAll("_", " ")} report`,
        status: immediate ? "Triage" : "New",
        department: cleanReporting(body.department, 200) || null,
        date: now.slice(0, 10),
        created_by: "Public Safety Reporting Portal",
        data: {
          category,
          description,
          location: cleanReporting(body.location, 300),
          severity,
          immediateLifeThreat: immediate,
          identityMode: mode,
          sourceChannel: "WEB",
          linkedModule: null,
          linkedRecordId: null,
        },
      }),
    });
    const row = Array.isArray(cases) ? cases[0] : null;
    if (!row?.id) throw new Error("Unable to create safety report");

    try {
      await serviceRows("/rest/v1/safety_reporting_tracking", {
        method: "POST",
        body: JSON.stringify({ case_id: row.id, token_hmac: tokenHmac }),
      });

      if (mode !== "anonymous") {
        const encrypted = encryptReporterIdentity(reporter, keys.encryption);
        await serviceRows("/rest/v1/safety_reporting_identity", {
          method: "POST",
          body: JSON.stringify({
            case_id: row.id,
            encrypted_payload: encrypted.encryptedPayload,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: "v1",
            email_hmac: reporter.email ? reportingHmac(reporter.email, keys.lookup) : null,
            phone_hmac: reporter.phone ? reportingHmac(reporter.phone, keys.lookup) : null,
          }),
        });
      }
    } catch (error) {
      await supabaseFetch(`/rest/v1/safety_reporting_cases?id=eq.${encodeURIComponent(row.id)}`, { method: "DELETE" }).catch(() => null);
      throw error;
    }

    return json(res, 201, {
      ok: true,
      refNo: row.ref_no,
      trackingCode: code,
      status: row.status,
      createdAt: row.created_at,
      privacyMode: mode,
    });
  }

  const refNo = cleanReporting(body.refNo, 40).toUpperCase();
  const trackingCode = cleanReporting(body.trackingCode, 80).toUpperCase();
  if (!refNo || !trackingCode) return json(res, 422, { error: "Report reference and tracking code are required" });

  const cases = await serviceRows(`/rest/v1/safety_reporting_cases?select=id,ref_no,title,status,date,data,created_at,updated_at&ref_no=eq.${encodeURIComponent(refNo)}&limit=1`);
  const row = Array.isArray(cases) ? cases[0] : null;
  if (!row?.id) return json(res, 404, { error: "Report not found" });

  const trackingRows = await serviceRows(`/rest/v1/safety_reporting_tracking?select=token_hmac&case_id=eq.${encodeURIComponent(row.id)}&limit=1`);
  const storedHmac = Array.isArray(trackingRows) ? String(trackingRows[0]?.token_hmac || "") : "";
  const submittedHmac = reportingHmac(trackingCode, keys.tracking);
  if (!storedHmac || !safeEqualB64(storedHmac, submittedHmac)) return json(res, 404, { error: "Report not found" });

  if (action === "status") {
    const messages = await serviceRows(`/rest/v1/safety_reporting_messages?select=id,sender_type,message,created_at&case_id=eq.${encodeURIComponent(row.id)}&order=created_at.asc`);
    return json(res, 200, {
      report: {
        refNo: row.ref_no,
        title: row.title,
        status: row.status,
        date: row.date,
        category: row.data?.category,
        severity: row.data?.severity,
        immediateLifeThreat: Boolean(row.data?.immediateLifeThreat),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      messages: Array.isArray(messages) ? messages.map(mapClient) : [],
    });
  }

  const message = cleanReporting(body.message, 4000);
  if (!message) return json(res, 422, { error: "Message is required" });
  await serviceRows("/rest/v1/safety_reporting_messages", {
    method: "POST",
    body: JSON.stringify({
      case_id: row.id,
      sender_type: "reporter",
      message,
      created_by: "Reporter",
    }),
  });
  return json(res, 201, { ok: true });
}

async function handleReporterIdentityReveal(req: any, res: any, profile: any, user: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!["admin", "manager"].includes(profile?.role)) return json(res, 403, { error: "Insufficient permission" });
  const caseId = cleanReporting(req.body?.caseId, 80);
  const reason = cleanReporting(req.body?.reason, 500);
  if (!caseId || reason.length < 8) return json(res, 422, { error: "Case and a reveal reason of at least 8 characters are required" });

  const rows = await serviceRows(`/rest/v1/safety_reporting_identity?select=encrypted_payload,iv,auth_tag,key_version&case_id=eq.${encodeURIComponent(caseId)}&limit=1`);
  const identity = Array.isArray(rows) ? rows[0] : null;
  if (!identity) return json(res, 200, { identity: null, message: "No stored reporter identity" });

  const keys = await getReportingCryptoMaterial();
  const value = decryptReporterIdentity(identity.encrypted_payload, identity.iv, identity.auth_tag, keys.encryption);
  await serviceRows("/rest/v1/safety_reporting_identity_audit", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      actor_auth_user_id: user.id,
      actor_role: profile.role,
      reason,
    }),
  });
  return json(res, 200, { identity: value, keyVersion: identity.key_version });
}

function canWrite(profile: any, module: string, action: string) {
  if (!profile?.is_active) return false;
  if (module === "activity" && action === "create") return true;
  if (profile.role === "admin") return true;
  if (profile.role === "manager" && ["documents", "content", "settings", "reports"].includes(module)) return action !== "delete" || module === "reports";
  if (profile.role === "editor" && ["content", "reports", "documents"].includes(module)) return action !== "delete";
  return false;
}

const DEFAULT_REPORT_SETTINGS = {
  id: "main",
  plantPrefix: "PLT",
  dateFormat: "YYYY-MM-DD",
  resetRule: "yearly",
  companyName: "UTEC SAFETY BOARD",
  companyLogo: "/utec-logo.svg",
  templateTitle: "Safety Report",
  publicBaseUrl: null,
};

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    const resource = String(req.query?.resource || "").trim();
    if (resource === "safety-reporting-public") return await handlePublicSafetyReporting(req, res);

    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (resource === "safety-reporting-reveal") return await handleReporterIdentityReveal(req, res, profile, user);

    const config = RESOURCE_MAP[resource];
    if (!config) return json(res, 404, { error: "Unknown API resource" });
    if (config.adminOnly && profile.role !== "admin") return json(res, 403, { error: "Insufficient permission" });

    const rawId = String(req.query?.id || "").trim();
    const table = config.table;
    const base = `/rest/v1/${table}`;
    const body = req.body || {};

    if (req.method === "GET") {
      let url = `${base}?select=*`;
      if (rawId) url += table === "section_config" ? `&section_type=eq.${encodeURIComponent(rawId)}` : `&id=eq.${encodeURIComponent(rawId)}`;
      if (table === "users") url = `${base}?select=id,name,email,role,is_active,avatar,joined_at,auth_user_id${rawId ? `&id=eq.${encodeURIComponent(rawId)}` : ""}`;
      if (table === "section_config") url += "&order=section_type.asc";
      if (GENERIC_TABLES.has(table)) url += "&order=updated_at.desc";
      if (table === "safety_reporting_messages") {
        const caseId = String(req.query?.caseId || "").trim();
        if (caseId) url += `&case_id=eq.${encodeURIComponent(caseId)}`;
        url += "&order=created_at.asc";
      }
      if (table === "safety_reporting_channels") url += "&order=channel.asc";
      if (table === "activity_logs") url += "&order=timestamp.desc&limit=500";
      const r = await supabaseFetchForRequest(req, url);
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load resource" });
      if (config.single) {
        const mapped = rows[0] ? mapClient(rows[0]) : null;
        if (resource === "report-settings") return json(res, 200, mapped || DEFAULT_REPORT_SETTINGS);
        return json(res, 200, mapped);
      }
      return json(res, 200, rows.map(mapClient));
    }

    if (resource === "safety-reporting-channels" && !["GET", "PATCH", "PUT"].includes(req.method || "")) {
      return json(res, 405, { error: "Reporting channels can only be read or updated" });
    }

    const action = req.method === "POST" ? "create" : req.method === "PATCH" || req.method === "PUT" ? "update" : req.method === "DELETE" ? "delete" : "";
    if (!action) return json(res, 405, { error: "Method not allowed" });
    if (!canWrite(profile, config.module, action)) return json(res, 403, { error: "Insufficient permission" });

    if (resource === "permissions" && (req.method === "PUT" || req.method === "PATCH")) {
      const role = String(body.role || "").trim();
      const module = String(body.module || "").trim();
      const actions = Array.isArray(body.actions) ? body.actions : [];
      if (!role || !module) return json(res, 422, { error: "role and module are required" });
      const lookup = `${base}?role=eq.${encodeURIComponent(role)}&module=eq.${encodeURIComponent(module)}`;
      const existing = await supabaseFetchForRequest(req, `${lookup}&select=id`);
      const erows = await existing.json();
      if (!existing.ok) return json(res, existing.status, { error: erows?.message || "Unable to load permission" });
      const request = erows[0]
        ? await supabaseFetchForRequest(req, `${base}?id=eq.${encodeURIComponent(erows[0].id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ actions }) })
        : await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ role, module, actions }) });
      const result = await request.json();
      if (!request.ok) return json(res, request.status, { error: result?.message || "Unable to save permission" });
      return json(res, 200, mapClient(result[0]));
    }

    if (req.method === "POST") {
      const row = sanitizeBody(table, body, "insert");
      if (["documents", "reports", "posts", "form_templates", "employees", "routing_rules"].includes(table)) row.created_at = row.created_at || new Date().toISOString();
      if (table === "activity_logs") {
        row.performed_by = row.performed_by || user.id;
        row.performed_by_name = row.performed_by_name || profile.name;
        row.timestamp = row.timestamp || new Date().toISOString();
      }
      if (table === "documents") row.created_by = row.created_by || user.id;
      if (table === "posts") row.author_id = row.author_id || user.id;
      if (GENERIC_TABLES.has(table)) {
        row.data = body.data || row.data || {};
        row.created_by = row.created_by || user.id;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        if (table === "safety_reporting_cases") {
          row.status = row.status || "New";
          row.title = row.title || body.title || "Safety Report";
        } else {
          row.ref_no = row.ref_no || `${resource.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          row.status = row.status || "active";
          row.title = row.title || body.title || resource;
        }
      }
      if (table === "safety_reporting_messages") {
        row.case_id = cleanReporting(body.caseId || body.case_id, 80);
        row.message = cleanReporting(body.message, 4000);
        row.sender_type = "hse";
        row.created_by = user.id;
        row.created_at = new Date().toISOString();
        if (!row.case_id || !row.message) return json(res, 422, { error: "caseId and message are required" });
      }
      const r = await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create resource" });
      return json(res, 201, mapClient(rows[0]));
    }

    if (resource === "section-config") {
      const sectionType = rawId;
      if (!sectionType) return json(res, 400, { error: "Section type is required" });
      if (req.method === "DELETE") return json(res, 405, { error: "Deleting section configuration is not supported" });
      const patch = sanitizeBody(table, body, "update");
      patch.section_type = sectionType;
      const lookup = `${base}?section_type=eq.${encodeURIComponent(sectionType)}`;
      const existing = await supabaseFetchForRequest(req, `${lookup}&select=id`);
      const erows = await existing.json();
      if (!existing.ok) return json(res, existing.status, { error: erows?.message || "Unable to load section configuration" });
      const request = erows[0]
        ? await supabaseFetchForRequest(req, lookup, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) })
        : await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const result = await request.json();
      if (!request.ok) return json(res, request.status, { error: result?.message || "Unable to save section configuration" });
      return json(res, 200, mapClient(result[0]));
    }

    const id = rawId || (config.single ? "main" : "");
    if (!id) return json(res, 400, { error: "Resource id is required" });
    const url = `${base}?id=eq.${encodeURIComponent(id)}`;

    if (req.method === "PATCH" || req.method === "PUT") {
      const patch = sanitizeBody(table, body, "update");
      if (table === "documents" || GENERIC_TABLES.has(table) || table === "safety_reporting_channels") patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, url, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update resource" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Resource not found or could not be updated" });
      return json(res, 200, mapClient(rows[0]));
    }

    const r = await supabaseFetchForRequest(req, url, { method: "DELETE", headers: { Prefer: "return=representation" } });
    const rows = await r.json().catch(() => []);
    if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to delete resource" });
    if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Resource not found or could not be deleted" });
    return json(res, 200, { ok: true, deletedId: id });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Data API failed" });
  }
}

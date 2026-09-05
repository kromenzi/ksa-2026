import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

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
  audits: { table: "audits", module: "reports" },
  compliance: { table: "compliance", module: "reports" },
  loto: { table: "loto", module: "reports" },
  permits: { table: "permits", module: "reports" },
  "escalation-matrix": { table: "escalation_matrix", module: "reports" },
};

const GENERIC_COLUMNS = new Set(["id", "ref_no", "title", "status", "department", "date", "data", "created_by", "created_at", "updated_at"]);
const GENERIC_TABLES = new Set([
  "plants", "licenses", "equipment_auth", "trainings", "training_matrix", "competency",
  "inspections", "audits", "compliance", "loto", "permits", "escalation_matrix",
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
  audits: GENERIC_COLUMNS,
  compliance: GENERIC_COLUMNS,
  loto: GENERIC_COLUMNS,
  permits: GENERIC_COLUMNS,
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
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    const resource = String(req.query?.resource || "").trim();
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
        row.ref_no = row.ref_no || `${resource.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        row.status = row.status || "active";
        row.title = row.title || body.title || resource;
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
      if (table === "documents" || GENERIC_TABLES.has(table)) patch.updated_at = new Date().toISOString();
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

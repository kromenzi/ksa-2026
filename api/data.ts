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
  "section-config": { table: "section_config", module: "settings", single: false },
  "email-settings": { table: "email_config", module: "settings", single: true, adminOnly: true },
  "report-settings": { table: "report_settings", module: "settings", single: true, adminOnly: true },
  "site-settings": { table: "site_settings", module: "settings", single: true, adminOnly: true },
};

const COLUMNS: Record<string, Set<string>> = {
  users: new Set(["id","name","email","role","is_active","avatar","joined_at","auth_user_id"]),
  posts: new Set(["id","title","content","author_id","section_id","status","created_at","tags"]),
  sections: new Set(["id","name","slug","description","is_visible","order"]),
  form_templates: new Set(["id","title","description","fields","created_at","status"]),
  reports: new Set(["id","title","type","generated_by","created_at","status","data"]),
  activity_logs: new Set(["id","action","details","performed_by","performed_by_name","timestamp","module"]),
  employees: new Set(["id","name","email","title","department_id","is_primary"]),
  routing_rules: new Set(["id","department_id","severity","recipient_ids"]),
  permissions: new Set(["id","role","module","actions"]),
  documents: new Set(["id","doc_type","ref_no","title","date","vendor","department","status","category","description","amount","expiry_date","metadata","pdf_url","extracted_data","created_by","created_at","updated_at"]),
  section_config: new Set(["id","section_type","categories","required_fields","number_prefix","number_format"]),
  email_config: new Set(["id","smtp_host","smtp_port","username","password","from_name","from_email","enable_sending","signature"]),
  report_settings: new Set(["id","plant_prefix","date_format","reset_rule","company_name","company_logo","template_title","public_base_url"]),
  site_settings: new Set(["id","site_name","description","allow_registration","maintenance_mode","language","theme","color_theme","branding"]),
};

function camelToSnake(value: string) { return value.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`); }
function snakeToCamel(value: string) { return value.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function mapClient(row: any) {
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [snakeToCamel(k), v]));
}
function sanitizeBody(table: string, body: any, mode: "insert" | "update") {
  const allowed = COLUMNS[table] || new Set<string>();
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(body || {})) {
    const column = camelToSnake(key);
    if (!allowed.has(column)) continue;
    if (table === "users" && column === "password") continue;
    if (mode === "update" && column === "id") continue;
    result[column] = value;
  }
  return result;
}

function canWrite(profile: any, module: string, action: string) {
  if (!profile?.is_active) return false;
  if (profile.role === "admin") return true;
  if (profile.role === "manager" && ["documents", "ncr", "content", "settings", "reports"].includes(module)) return action !== "delete" || module === "reports";
  if (profile.role === "editor" && ["content", "reports", "documents"].includes(module)) return action !== "delete";
  return false;
}

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    const resource = String(req.query?.resource || "").trim();
    const config = RESOURCE_MAP[resource];
    if (!config) return json(res, 404, { error: "Unknown API resource" });
    if (config.adminOnly && profile.role !== "admin") return json(res, 403, { error: "Insufficient permission" });

    const id = String(req.query?.id || "").trim();
    const table = config.table;
    const base = `/rest/v1/${table}`;

    if (req.method === "GET") {
      let url = `${base}?select=*`;
      if (id) url += `&id=eq.${encodeURIComponent(id)}`;
      if (table === "users") url = `${base}?select=id,name,email,role,is_active,avatar,joined_at,auth_user_id${id ? `&id=eq.${encodeURIComponent(id)}` : ""}`;
      url += table === "section_config" ? "&order=section_type.asc" : "";
      const r = await supabaseFetchForRequest(req, url);
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load resource" });
      if (config.single) return json(res, 200, rows[0] ? mapClient(rows[0]) : null);
      return json(res, 200, rows.map(mapClient));
    }

    const action = req.method === "POST" ? "create" : req.method === "PATCH" || req.method === "PUT" ? "update" : req.method === "DELETE" ? "delete" : "";
    if (!action) return json(res, 405, { error: "Method not allowed" });
    if (!canWrite(profile, config.module, action)) return json(res, 403, { error: "Insufficient permission" });

    if (req.method === "POST") {
      const row = sanitizeBody(table, req.body, "insert");
      if (["documents", "reports", "posts", "form_templates", "employees", "routing_rules", "activity_logs"].includes(table)) {
        row.created_at = row.created_at || new Date().toISOString();
      }
      if (table === "activity_logs") {
        row.performed_by = row.performed_by || user.id;
        row.performed_by_name = row.performed_by_name || profile.name;
        row.timestamp = row.timestamp || new Date().toISOString();
      }
      if (table === "documents") row.created_by = row.created_by || user.id;
      if (table === "posts") row.author_id = row.author_id || user.id;
      const r = await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create resource" });
      return json(res, 201, mapClient(rows[0]));
    }

    if (!id) return json(res, 400, { error: "Resource id is required" });
    const url = `${base}?id=eq.${encodeURIComponent(id)}`;
    if (req.method === "PATCH" || req.method === "PUT") {
      const patch = sanitizeBody(table, req.body, "update");
      patch.updated_at = ["documents"].includes(table) ? new Date().toISOString() : patch.updated_at;
      const r = await supabaseFetchForRequest(req, url, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update resource" });
      return json(res, 200, mapClient(rows[0] || null));
    }

    const r = await supabaseFetchForRequest(req, url, { method: "DELETE" });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return json(res, r.status, { error: body?.message || "Unable to delete resource" });
    }
    return json(res, 200, { ok: true });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Data API failed" });
  }
}

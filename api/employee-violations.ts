import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

const TABLE = "employee_violations";
const BASE = `/rest/v1/${TABLE}`;

const allowed = new Set([
  "id", "ref_no", "date", "employee_name", "position", "employee_id", "reference_to",
  "violation_description", "reasons_request", "supervisor_name", "supervisor_signature",
  "employee_clarification", "employee_confirmation_name", "employee_signature", "employee_signed_date",
  "hr_keep_in_file", "hr_mol_action", "hr_investigation", "hr_manager_name", "hr_manager_signature",
  "hr_action_date", "status", "data", "created_by", "created_at", "updated_at",
]);

const toSnake = (v: string) => v.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (v: string) => v.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapClient = (row: any) => Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [toCamel(k), v]));

function sanitize(body: any, update = false) {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(body || {})) {
    const column = toSnake(key);
    if (!allowed.has(column) || (update && column === "id")) continue;
    out[column] = value;
  }
  return out;
}

function canWrite(profile: any, method: string) {
  if (!profile?.is_active) return false;
  if (profile.role === "admin") return true;
  if (profile.role === "manager") return method !== "DELETE";
  return false;
}

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    if (req.method === "GET") {
      const id = String(req.query?.id || "").trim();
      let url = `${BASE}?select=*&order=created_at.desc`;
      if (id) url = `${BASE}?select=*&id=eq.${encodeURIComponent(id)}`;
      const r = await supabaseFetchForRequest(req, url);
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load violations" });
      return json(res, 200, rows.map(mapClient));
    }

    if (!canWrite(profile, req.method)) return json(res, 403, { error: "Insufficient permission" });

    if (req.method === "POST") {
      const row = sanitize(req.body, false);
      row.ref_no = row.ref_no || `VR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      row.status = row.status || "draft";
      row.created_by = user.id;
      row.created_at = new Date().toISOString();
      row.updated_at = new Date().toISOString();
      row.data = row.data || {};
      const r = await supabaseFetchForRequest(req, BASE, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create violation" });
      return json(res, 201, mapClient(rows[0]));
    }

    const id = String(req.query?.id || "").trim();
    if (!id) return json(res, 400, { error: "Violation id is required" });

    if (req.method === "PATCH" || req.method === "PUT") {
      const patch = sanitize(req.body, true);
      patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, `${BASE}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update violation" });
      return json(res, 200, mapClient(rows[0]));
    }

    if (req.method === "DELETE") {
      const r = await supabaseFetchForRequest(req, `${BASE}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) { const error = await r.json().catch(() => ({})); return json(res, r.status, { error: error?.message || "Unable to delete violation" }); }
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Employee violations API failed" });
  }
}

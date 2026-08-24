import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    if (req.method === "GET") {
      const r = await supabaseFetchForRequest(req, "/rest/v1/violation_templates?select=*&active=eq.true&order=created_at.desc");
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load violation templates" });
      return json(res, 200, rows);
    }

    if (profile.role !== "admin") return json(res, 403, { error: "Admin permission required" });
    if (req.method === "POST") {
      const r = await supabaseFetchForRequest(req, "/rest/v1/violation_templates", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(req.body || {}) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create template" });
      return json(res, 201, rows[0]);
    }
    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Violation template API failed" });
  }
}

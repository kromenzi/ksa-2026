import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    const id = String(req.query?.id || "").trim();
    if (!id) return json(res, 400, { error: "Department id is required" });

    if (req.method === "PATCH") {
      const patch: any = {};
      if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
      if (req.body?.code !== undefined) patch.code = String(req.body.code).trim();
      if (!Object.keys(patch).length) return json(res, 422, { error: "No changes supplied" });
      const response = await supabaseFetchForRequest(req, `/rest/v1/departments?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      const rows = await response.json();
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to update department" });
      return json(res, 200, rows[0] || null);
    }

    if (req.method === "DELETE") {
      const response = await supabaseFetchForRequest(req, `/rest/v1/departments?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return json(res, response.status, { error: body?.message || "Unable to delete department" });
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Department API failed" });
  }
}

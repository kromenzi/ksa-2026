import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);

function toClient(row: any) {
  return { id: row.id, name: row.name, code: row.code };
}

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    if (req.method === "GET") {
      const response = await supabaseFetchForRequest(req, "/rest/v1/departments?select=id,name,code&order=name.asc");
      const rows = await response.json();
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load departments" });
      return json(res, 200, rows.map(toClient));
    }

    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    if (req.method === "POST") {
      const name = String(req.body?.name || "").trim();
      const code = String(req.body?.code || "").trim();
      if (!name || !code) return json(res, 422, { error: "Department name and code are required" });
      const response = await supabaseFetchForRequest(req, "/rest/v1/departments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name, code }),
      });
      const rows = await response.json();
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to create department" });
      return json(res, 201, toClient(rows[0]));
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Departments API failed" });
  }
}

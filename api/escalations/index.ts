import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);

function toClient(row: any) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  return {
    id: row.id,
    refNo: row.ref_no,
    source: data.source || row.ref_no,
    title: row.title,
    severity: data.severity || "HIGH",
    level: data.level || "Level 2 - Dept Manager",
    status: row.status || "OPEN",
    dueDate: data.dueDate || row.date,
    responsible: data.responsible || "HSE Lead",
    department: row.department || data.department || "HSE",
    reason: data.reason || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: Array.isArray(data.history) ? data.history : [],
  };
}

function makeHistoryEntry(action: string, user: string, status: string, details = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    user,
    status,
    date: new Date().toISOString(),
    details,
  };
}

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    if (req.method === "GET") {
      const response = await supabaseFetchForRequest(req, "/rest/v1/escalations?select=*&order=created_at.desc");
      const rows = await response.json();
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load escalations" });
      return json(res, 200, rows.map(toClient));
    }

    if (req.method === "POST") {
      if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      const body = req.body || {};
      const title = String(body.title || "").trim();
      if (!title) return json(res, 422, { error: "Issue title is required" });

      const year = new Date().getFullYear();
      const refNo = `ESC-${year}-${Date.now().toString(36).toUpperCase()}`;
      const status = String(body.status || "OPEN");
      const dueDate = body.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const entry = makeHistoryEntry("Escalation Created", profile.name || profile.email || user.email || "System", status, String(body.reason || ""));
      const row = {
        ref_no: refNo,
        title,
        status,
        department: String(body.department || "HSE"),
        date: dueDate,
        created_by: user.id,
        data: {
          source: String(body.source || "MANUAL"),
          severity: String(body.severity || "HIGH"),
          level: String(body.level || "Level 2 - Dept Manager"),
          responsible: String(body.responsible || (profile.name || "HSE Lead")),
          department: String(body.department || "HSE"),
          reason: String(body.reason || ""),
          dueDate,
          history: [entry],
        },
      };
      const response = await supabaseFetchForRequest(req, "/rest/v1/escalations", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      const result = await response.json();
      if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to create escalation" });
      return json(res, 201, toClient(result[0]));
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Escalation API failed" });
  }
}

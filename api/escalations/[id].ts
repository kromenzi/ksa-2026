import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);
const deleteRoles = new Set(["admin", "manager"]);

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    const id = String(req.query?.id || "").trim();
    if (!id) return json(res, 400, { error: "Escalation id is required" });

    if (req.method === "DELETE") {
      if (!deleteRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      const response = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to delete escalation" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Escalation not found or could not be deleted" });
      return json(res, 200, { ok: true, deletedId: id });
    }

    if (req.method !== "PATCH") return json(res, 405, { error: "Method not allowed" });
    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    const currentResponse = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}&select=*`);
    const currentRows = await currentResponse.json();
    if (!currentResponse.ok) return json(res, currentResponse.status, { error: currentRows?.message || "Unable to load escalation" });
    if (!currentRows[0]) return json(res, 404, { error: "Escalation not found" });

    const current = currentRows[0];
    const currentData = current.data && typeof current.data === "object" ? current.data : {};
    const body = req.body || {};
    const nextStatus = String(body.status || current.status || "OPEN");
    const history = Array.isArray(body.history)
      ? body.history
      : Array.isArray(currentData.history)
        ? [...currentData.history]
        : [];
    if (body.historyEntry) history.push(body.historyEntry);

    const nextData = {
      ...currentData,
      ...(body.severity !== undefined ? { severity: String(body.severity) } : {}),
      ...(body.level !== undefined ? { level: String(body.level) } : {}),
      ...(body.responsible !== undefined ? { responsible: String(body.responsible) } : {}),
      ...(body.department !== undefined ? { department: String(body.department) } : {}),
      ...(body.reason !== undefined ? { reason: String(body.reason) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: String(body.dueDate) } : {}),
      history,
    };

    const response = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: nextStatus,
        department: nextData.department || current.department,
        date: nextData.dueDate || current.date,
        data: nextData,
        updated_at: new Date().toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to update escalation" });
    if (!Array.isArray(result) || result.length === 0) return json(res, 404, { error: "Escalation not found or could not be updated" });
    return json(res, 200, result[0]);
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Escalation update failed" });
  }
}

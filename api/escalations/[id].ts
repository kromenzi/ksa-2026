import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    const id = String(req.query?.id || "").trim();
    if (!id) return json(res, 400, { error: "Escalation id is required" });
    if (req.method !== "PATCH") return json(res, 405, { error: "Method not allowed" });

    const currentResponse = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}&select=*`);
    const currentRows = await currentResponse.json();
    if (!currentResponse.ok) return json(res, currentResponse.status, { error: currentRows?.message || "Unable to load escalation" });
    if (!currentRows[0]) return json(res, 404, { error: "Escalation not found" });

    const current = currentRows[0];
    const currentData = current.data && typeof current.data === "object" ? current.data : {};
    const body = req.body || {};
    const nextStatus = String(body.status || current.status || "OPEN");
    const history = Array.isArray(currentData.history) ? [...currentData.history] : [];
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
      body: JSON.stringify({ status: nextStatus, department: nextData.department || current.department, date: nextData.dueDate || current.date, data: nextData, updated_at: new Date().toISOString() }),
    });
    const result = await response.json();
    if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to update escalation" });
    return json(res, 200, result[0] || null);
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Escalation update failed" });
  }
}

import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

const MAX_LOGS = 500;

const mapClient = (row: any) => ({
  id: row.id,
  action: row.action,
  details: row.details ?? "",
  performedBy: row.performed_by ?? "",
  performedByName: row.performed_by_name ?? "",
  timestamp: row.timestamp,
  module: row.module,
});

const cleanText = (value: unknown, maxLength: number) =>
  String(value ?? "").trim().slice(0, maxLength);

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    const user = await getAuthUser(req);
    const profile = user ? await getProfile(req, user) : null;
    if (!user || !profile || !profile.is_active) {
      return json(res, 401, { error: "Not authenticated" });
    }

    if (req.method === "GET") {
      if (!['admin', 'manager'].includes(profile.role)) {
        return json(res, 403, { error: "Insufficient permission" });
      }

      const rawId = cleanText(req.query?.id, 80);
      let url = `/rest/v1/activity_logs?select=id,action,details,performed_by,performed_by_name,timestamp,module`;
      if (rawId) url += `&id=eq.${encodeURIComponent(rawId)}`;
      url += `&order=timestamp.desc&limit=${MAX_LOGS}`;

      const response = await supabaseFetchForRequest(req, url);
      const rows = await response.json();
      if (!response.ok) {
        return json(res, response.status, { error: rows?.message || "Unable to load activity logs" });
      }

      return json(res, 200, Array.isArray(rows) ? rows.map(mapClient) : []);
    }

    if (req.method === "POST") {
      const action = cleanText(req.body?.action, 160);
      const details = cleanText(req.body?.details, 2000);
      const module = cleanText(req.body?.module, 120) || "activity";

      if (!action) {
        return json(res, 422, { error: "action is required" });
      }

      const row = {
        action,
        details,
        performed_by: user.id,
        performed_by_name: profile.name || profile.email || "User",
        timestamp: new Date().toISOString(),
        module,
      };

      const response = await supabaseFetchForRequest(req, "/rest/v1/activity_logs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      const rows = await response.json();
      if (!response.ok) {
        return json(res, response.status, { error: rows?.message || "Unable to record activity" });
      }

      return json(res, 201, mapClient(rows[0]));
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Activity log API failed" });
  }
}

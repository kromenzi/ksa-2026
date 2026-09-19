import { json, supabaseFetch } from "../_lib/supabase.js";

const PUBLIC_COLUMNS = [
  "id", "report_no", "observation_id", "date", "time", "location", "department",
  "observer_name", "risk_level", "category", "status", "observation_description",
  "corrective_action", "image1", "image2", "image3", "image4", "created_at",
].join(",");

function toClient(row: any) {
  return {
    id: String(row.id), reportNo: row.report_no, observationId: row.observation_id,
    date: row.date, time: row.time, location: row.location, department: row.department,
    observerName: row.observer_name, riskLevel: row.risk_level, category: row.category,
    status: row.status, observationDescription: row.observation_description,
    correctiveAction: row.corrective_action, image1: row.image1, image2: row.image2,
    image3: row.image3, image4: row.image4, createdAt: row.created_at,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const id = String(req.query?.id || "").trim();
  if (!id || id.length > 120) return json(res, 400, { error: "Report id is required" });
  try {
    const response = await supabaseFetch(`/rest/v1/safety_reports?id=eq.${encodeURIComponent(id)}&status=neq.draft&select=${PUBLIC_COLUMNS}&limit=1`, { cache: "no-store" });
    const rows = await response.json().catch(() => []);
    if (!response.ok) return json(res, response.status, { error: "Unable to load public report" });
    if (!rows[0]) return json(res, 404, { error: "Report not found" });
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return json(res, 200, toClient(rows[0]));
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: "Public report preview is unavailable" });
  }
}

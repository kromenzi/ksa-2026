import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const roles = ["admin", "manager", "editor"];
function toClient(row: any) { return { id: row.id, reportNo: row.report_no, observationId: row.observation_id, date: row.date, time: row.time, location: row.location, department: row.department, observerName: row.observer_name, riskLevel: row.risk_level, category: row.category, status: row.status, observationDescription: row.observation_description, correctiveAction: row.corrective_action, image1: row.image1, image2: row.image2, image3: row.image3, image4: row.image4, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, sourceFile: row.source_file, sourceMetadata: row.source_metadata }; }

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req); const profile = await getProfile(req); if (!user || !profile?.is_active) return json(res, 401, { error: "Not authenticated" });
    const id = String(req.query?.id || "").trim();
    if (req.method === "GET") {
      const path = id ? `/rest/v1/safety_reports?id=eq.${encodeURIComponent(id)}&select=*` : "/rest/v1/safety_reports?select=*&order=created_at.desc";
      const response = await supabaseFetchForRequest(req, path); const rows = await response.json(); if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load safety reports" });
      return json(res, 200, id ? (rows[0] ? toClient(rows[0]) : null) : rows.map(toClient));
    }
    if (!roles.includes(profile.role)) return json(res, 403, { error: "Insufficient permission" });
    if (req.method === "POST") {
      const body = req.body || {}; const description = String(body.observationDescription || "").trim(); if (!description) return json(res, 422, { error: "Observation description is required" });
      const row = { report_no: `SOR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`, observation_id: body.observationId || null, date: body.date || new Date().toISOString().slice(0,10), time: body.time || null, location: body.location || null, department: body.department || null, observer_name: body.observerName || null, risk_level: body.riskLevel || "medium", category: body.category || null, status: body.status || "open", observation_description: description, corrective_action: body.correctiveAction || null, image1: body.image1 || null, image2: body.image2 || null, image3: body.image3 || null, image4: body.image4 || null, created_by: user.id, source_file: body.sourceFile || null, source_metadata: body.sourceMetadata || null };
      const response = await supabaseFetchForRequest(req, "/rest/v1/safety_reports", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) }); const result = await response.json(); if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to create safety report" }); return json(res, 201, toClient(result[0]));
    }
    if (!id) return json(res, 400, { error: "Report id is required" });
    if (!["PUT","PATCH","DELETE"].includes(req.method)) return json(res, 405, { error: "Method not allowed" });
    if (req.method === "DELETE") { if (!["admin","manager"].includes(profile.role)) return json(res, 403, { error: "Delete permission required" }); const r = await supabaseFetchForRequest(req, `/rest/v1/safety_reports?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok) { const e = await r.json(); return json(res, r.status, { error: e?.message || "Unable to delete report" }); } return json(res, 200, { ok:true }); }
    const body = req.body || {}; const row: Record<string,unknown> = {}; const map:Record<string,string> = { observationId:"observation_id", date:"date", time:"time", location:"location", department:"department", observerName:"observer_name", riskLevel:"risk_level", category:"category", status:"status", observationDescription:"observation_description", correctiveAction:"corrective_action", image1:"image1", image2:"image2", image3:"image3", image4:"image4", sourceFile:"source_file", sourceMetadata:"source_metadata" }; for (const [key,column] of Object.entries(map)) if (key in body) row[column] = body[key]; row.updated_at = new Date().toISOString(); if ("observation_description" in row && !String(row.observation_description || "").trim()) return json(res,422,{error:"Observation description is required"});
    const r = await supabaseFetchForRequest(req, `/rest/v1/safety_reports?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:{Prefer:"return=representation"}, body:JSON.stringify(row) }); const result=await r.json(); if(!r.ok)return json(res,r.status,{error:result?.message||"Unable to update report"}); if(!result[0])return json(res,404,{error:"Report not found"}); return json(res,200,toClient(result[0]));
  } catch (error:any) { return json(res,error.statusCode||500,{error:error.message||"Safety reports API failed"}); }
}

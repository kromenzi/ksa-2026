import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";
const writableRoles = new Set(["admin", "manager", "editor"]);
function toClient(row: any) { return { id: row.id, refNo: row.ref_no, date: row.date, department: row.department, location: row.location, description: row.description, severity: row.severity, immediateAction: row.immediate_action, rootCause: row.root_cause, correctiveAction: row.corrective_action, correctiveActions: row.corrective_actions || [], responsiblePersonId: row.responsible_person_id, dueDate: row.due_date, verificationNotes: row.verification_notes, closedAt: row.closed_at, image1: row.image1, image2: row.image2, image3: row.image3, image4: row.image4, status: row.status, createdAt: row.created_at, createdBy: row.created_by, updatedAt: row.updated_at, sourceFile: row.source_file, sourceMetadata: row.source_metadata }; }
export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req); const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    const id = String(req.query?.id || ""); if (!id) return json(res, 400, { error: "NCR id is required" });
    if (req.method === "GET") { const r = await supabaseFetchForRequest(req, `/rest/v1/ncr?id=eq.${encodeURIComponent(id)}&select=*`); const rows = await r.json(); if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load NCR" }); if (!rows[0]) return json(res, 404, { error: "NCR not found" }); return json(res, 200, toClient(rows[0])); }
    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
    if (req.method === "PATCH") {
      const body = req.body || {}; const patch: Record<string, unknown> = {}; const map: Record<string,string> = { date:"date", department:"department", location:"location", description:"description", severity:"severity", immediateAction:"immediate_action", rootCause:"root_cause", correctiveAction:"corrective_action", correctiveActions:"corrective_actions", responsiblePersonId:"responsible_person_id", dueDate:"due_date", verificationNotes:"verification_notes", closedAt:"closed_at", image1:"image1", image2:"image2", image3:"image3", image4:"image4", status:"status", sourceFile:"source_file", sourceMetadata:"source_metadata" };
      for (const [key,column] of Object.entries(map)) if (Object.prototype.hasOwnProperty.call(body,key)) patch[column] = body[key] ?? null;
      if (patch.department !== undefined) patch.department = String(patch.department || "").trim(); if (patch.description !== undefined) patch.description = String(patch.description || "").trim();
      if (patch.department === "" || patch.description === "") return json(res, 422, { error: "Department and Description are required" }); patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, `/rest/v1/ncr?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", headers:{ Prefer:"return=representation" }, body:JSON.stringify(patch) }); const result = await r.json(); if (!r.ok) return json(res,r.status,{error:result?.message||"Unable to update NCR"}); if (!result[0]) return json(res,404,{error:"NCR not found"}); return json(res,200,toClient(result[0]));
    }
    if (req.method === "DELETE") { const r = await supabaseFetchForRequest(req, `/rest/v1/ncr?id=eq.${encodeURIComponent(id)}`, {method:"DELETE"}); if (!r.ok) { const result=await r.json(); return json(res,r.status,{error:result?.message||"Unable to delete NCR"}); } return json(res,200,{ok:true}); }
    return json(res,405,{error:"Method not allowed"});
  } catch (error:any) { return json(res,error.statusCode||500,{error:error.message||"NCR API failed"}); }
}

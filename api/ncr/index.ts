import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);
function toClient(row: any) { return { id: row.id, refNo: row.ref_no, date: row.date, department: row.department, location: row.location, description: row.description, severity: row.severity, immediateAction: row.immediate_action, rootCause: row.root_cause, correctiveAction: row.corrective_action, correctiveActions: row.corrective_actions || [], responsiblePersonId: row.responsible_person_id, dueDate: row.due_date, verificationNotes: row.verification_notes, closedAt: row.closed_at, image1: row.image1, image2: row.image2, image3: row.image3, image4: row.image4, status: row.status, createdAt: row.created_at, createdBy: row.created_by, updatedAt: row.updated_at, sourceFile: row.source_file, sourceMetadata: row.source_metadata }; }
function departmentClient(row: any) { return { id: row.id, name: row.name, code: row.code }; }
function makeDepartmentCode(name: string) { const base = name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12).toUpperCase(); return base || "DEPT"; }

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req); const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    // Departments are served through this existing function so the Hobby deployment
    // stays below Vercel's 12-serverless-function limit.
    if (req.query?.resource === "departments") {
      if (req.method === "GET") {
        const response = await supabaseFetchForRequest(req, "/rest/v1/departments?select=id,name,code&order=name.asc");
        const rows = await response.json();
        if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load departments" });
        return json(res, 200, rows.map(departmentClient));
      }
      if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      if (req.method === "POST") {
        const name = String(req.body?.name || "").trim();
        const suppliedCode = String(req.body?.code || "").trim();
        if (!name) return json(res, 422, { error: "Department name is required" });
        let code = suppliedCode || makeDepartmentCode(name);
        let response = await supabaseFetchForRequest(req, "/rest/v1/departments", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name, code }) });
        let rows = await response.json();
        if (!response.ok && !suppliedCode) {
          code = `${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
          response = await supabaseFetchForRequest(req, "/rest/v1/departments", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name, code }) });
          rows = await response.json();
        }
        if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to create department" });
        return json(res, 201, departmentClient(rows[0]));
      }
      if (req.method === "DELETE") {
        const id = String(req.query?.id || "").trim();
        if (!id) return json(res, 400, { error: "Department id is required" });
        const response = await supabaseFetchForRequest(req, `/rest/v1/departments?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) { const body = await response.json(); return json(res, response.status, { error: body?.message || "Unable to delete department" }); }
        return json(res, 200, { ok: true });
      }
      return json(res, 405, { error: "Method not allowed" });
    }

    if (req.method === "GET") {
      const response = await supabaseFetchForRequest(req, "/rest/v1/ncr?select=*&order=created_at.desc");
      const rows = await response.json(); if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load NCRs" });
      return json(res, 200, rows.map(toClient));
    }
    if (req.method === "POST") {
      if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      const body = req.body || {}; const department = String(body.department || "").trim(); const description = String(body.description || "").trim();
      if (!department || !description) return json(res, 422, { error: "Department and Description are required" });
      const row = { ref_no: `NCR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`, date: body.date || new Date().toISOString().slice(0, 10), department, location: body.location || null, description, severity: body.severity || "medium", immediate_action: body.immediateAction || null, root_cause: body.rootCause || null, corrective_action: body.correctiveAction || null, corrective_actions: Array.isArray(body.correctiveActions) ? body.correctiveActions : [], responsible_person_id: body.responsiblePersonId || null, due_date: body.dueDate || null, verification_notes: body.verificationNotes || null, status: body.status || "draft", created_by: user.id, source_file: body.sourceFile || null, source_metadata: body.sourceMetadata || null, image1: body.image1 || null, image2: body.image2 || null, image3: body.image3 || null, image4: body.image4 || null };
      const response = await supabaseFetchForRequest(req, "/rest/v1/ncr", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const result = await response.json(); if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to create NCR" });
      return json(res, 201, toClient(result[0]));
    }
    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) { return json(res, error.statusCode || 500, { error: error.message || "NCR API failed" }); }
}

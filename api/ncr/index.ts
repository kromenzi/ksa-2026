import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);
function toClient(row: any) { return { id: row.id, refNo: row.ref_no, date: row.date, department: row.department, location: row.location, description: row.description, severity: row.severity, immediateAction: row.immediate_action, rootCause: row.root_cause, correctiveAction: row.corrective_action, correctiveActions: row.corrective_actions || [], responsiblePersonId: row.responsible_person_id, dueDate: row.due_date, verificationNotes: row.verification_notes, closedAt: row.closed_at, image1: row.image1, image2: row.image2, image3: row.image3, image4: row.image4, status: row.status, createdAt: row.created_at, createdBy: row.created_by, updatedAt: row.updated_at, sourceFile: row.source_file, sourceMetadata: row.source_metadata }; }
function departmentClient(row: any) { return { id: row.id, name: row.name, code: row.code }; }
function safetySignClient(row: any) {
  return {
    id: row.id,
    signName: row.sign_name,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    category: row.category,
    subType: row.sub_type,
    zone: row.zone,
    department: row.department,
    location: row.location,
    signType: row.sign_type,
    description: row.description,
    safetyInstructionsAr: row.safety_instructions_ar || [],
    safetyInstructionsEn: row.safety_instructions_en || [],
    status: row.status,
    documentNumber: row.document_number,
    revision: row.revision,
    issueDate: row.issue_date,
    reviewDate: row.review_date,
    imageUrl: row.image_url,
    originalFileName: row.original_file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    attachmentUrl: row.attachment_url,
    attachmentName: row.attachment_name,
    attachmentType: row.attachment_type,
    attachmentSize: row.attachment_size,
    printCount: row.print_count,
    viewCount: row.view_count,
    lastPrintedAt: row.last_printed_at,
    lastPrintedBy: row.last_printed_by,
    qrCodeUrl: row.qr_code_url,
    relatedDocumentIds: row.related_document_ids || [],
    revisions: row.revisions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function safetySignPatch(body: any) {
  const patch: Record<string, unknown> = {};
  const map: Record<string, string> = {
    signName: "sign_name", titleAr: "title_ar", titleEn: "title_en", category: "category", subType: "sub_type",
    zone: "zone", department: "department", location: "location", signType: "sign_type", description: "description",
    safetyInstructionsAr: "safety_instructions_ar", safetyInstructionsEn: "safety_instructions_en", status: "status",
    documentNumber: "document_number", revision: "revision", issueDate: "issue_date", reviewDate: "review_date",
    imageUrl: "image_url", originalFileName: "original_file_name", fileSize: "file_size", mimeType: "mime_type",
    attachmentUrl: "attachment_url", attachmentName: "attachment_name", attachmentType: "attachment_type", attachmentSize: "attachment_size",
    qrCodeUrl: "qr_code_url", relatedDocumentIds: "related_document_ids", revisions: "revisions",
  };
  for (const [key, column] of Object.entries(map)) if (Object.prototype.hasOwnProperty.call(body || {}, key)) patch[column] = body[key] ?? null;
  return patch;
}
function makeDepartmentCode(name: string) { const base = name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12).toUpperCase(); return base || "DEPT"; }

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req); const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    // Departments are served through this existing function so the Hobby deployment
    // stays below Vercel's serverless-function limit.
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

    // Safety Signs are routed through this existing function to avoid creating
    // another Vercel function. CRUD and print/view counters share one endpoint.
    if (req.query?.resource === "safety-signs") {
      const id = String(req.query?.id || "").trim();
      const action = String(req.query?.action || "").trim();
      if (req.method === "GET") {
        if (id) {
          const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}&select=*`);
          const rows = await r.json();
          if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load safety sign" });
          if (!rows[0]) return json(res, 404, { error: "Safety sign not found" });
          return json(res, 200, safetySignClient(rows[0]));
        }
        const r = await supabaseFetchForRequest(req, "/rest/v1/safety_signs?select=*&order=created_at.desc");
        const rows = await r.json();
        if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load safety signs" });
        return json(res, 200, rows.map(safetySignClient));
      }
      if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

      if (req.method === "POST" && action === "print") {
        if (!id) return json(res, 400, { error: "Safety sign id is required" });
        const now = new Date().toISOString();
        const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { Prefer: "return=representation" },
          body: JSON.stringify({ print_count: { "$inc": 1 }, last_printed_at: now, last_printed_by: user.id, updated_at: now }),
        });
        if (!r.ok) {
          // PostgREST does not support a generic $inc operator. Fall back to read + write.
          const current = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}&select=print_count&limit=1`);
          const currentRows = await current.json();
          const nextCount = Number(currentRows?.[0]?.print_count || 0) + 1;
          const retry = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH", headers: { Prefer: "return=representation" },
            body: JSON.stringify({ print_count: nextCount, last_printed_at: now, last_printed_by: user.id, updated_at: now }),
          });
          const rows = await retry.json();
          if (!retry.ok) return json(res, retry.status, { error: rows?.message || "Unable to record print" });
          return json(res, 200, safetySignClient(rows[0]));
        }
        const rows = await r.json();
        return json(res, 200, safetySignClient(rows[0]));
      }

      if (req.method === "POST" && action === "view") {
        if (!id) return json(res, 400, { error: "Safety sign id is required" });
        const current = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}&select=view_count&limit=1`);
        const currentRows = await current.json();
        if (!current.ok || !currentRows?.[0]) return json(res, current.ok ? 404 : current.status, { error: currentRows?.message || "Unable to load safety sign" });
        const nextCount = Number(currentRows[0].view_count || 0) + 1;
        const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { Prefer: "return=representation" },
          body: JSON.stringify({ view_count: nextCount, updated_at: new Date().toISOString() }),
        });
        const rows = await r.json();
        if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to record view" });
        return json(res, 200, safetySignClient(rows[0]));
      }

      if (req.method === "POST") {
        const body = req.body || {};
        if (!body.titleAr && !body.signName) return json(res, 422, { error: "Safety sign title is required" });
        const row = {
          sign_name: String(body.signName || body.titleEn || body.titleAr || "Safety Sign").trim(),
          title_ar: String(body.titleAr || body.signName || "").trim(),
          title_en: String(body.titleEn || body.signName || body.titleAr || "").trim(),
          category: String(body.category || "General"),
          sub_type: body.subType || null,
          zone: body.zone || null,
          department: body.department || null,
          location: body.location || null,
          sign_type: body.signType || null,
          description: body.description || null,
          safety_instructions_ar: Array.isArray(body.safetyInstructionsAr) ? body.safetyInstructionsAr : [],
          safety_instructions_en: Array.isArray(body.safetyInstructionsEn) ? body.safetyInstructionsEn : [],
          status: body.status || "Active",
          document_number: body.documentNumber || `SS-${Date.now().toString().slice(-6)}`,
          revision: body.revision || "Rev.01",
          issue_date: body.issueDate || new Date().toISOString().slice(0, 10),
          review_date: body.reviewDate || null,
          image_url: body.imageUrl || null,
          original_file_name: body.originalFileName || null,
          file_size: body.fileSize || null,
          mime_type: body.mimeType || null,
          attachment_url: body.attachmentUrl || null,
          attachment_name: body.attachmentName || null,
          attachment_type: body.attachmentType || null,
          attachment_size: body.attachmentSize || null,
          print_count: Number(body.printCount || 0),
          view_count: Number(body.viewCount || 0),
          last_printed_at: body.lastPrintedAt || null,
          last_printed_by: body.lastPrintedBy || null,
          qr_code_url: body.qrCodeUrl || null,
          related_document_ids: Array.isArray(body.relatedDocumentIds) ? body.relatedDocumentIds : [],
          revisions: Array.isArray(body.revisions) ? body.revisions : [],
        };
        const r = await supabaseFetchForRequest(req, "/rest/v1/safety_signs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
        const rows = await r.json();
        if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create safety sign" });
        return json(res, 201, safetySignClient(rows[0]));
      }

      if (req.method === "PATCH") {
        if (!id) return json(res, 400, { error: "Safety sign id is required" });
        const patch = safetySignPatch(req.body || {});
        if (!Object.keys(patch).length) return json(res, 422, { error: "No changes supplied" });
        patch.updated_at = new Date().toISOString();
        const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
        const rows = await r.json();
        if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update safety sign" });
        if (!rows[0]) return json(res, 404, { error: "Safety sign not found" });
        return json(res, 200, safetySignClient(rows[0]));
      }

      if (req.method === "DELETE") {
        if (!id) return json(res, 400, { error: "Safety sign id is required" });
        const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!r.ok) { const rows = await r.json(); return json(res, r.status, { error: rows?.message || "Unable to delete safety sign" }); }
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

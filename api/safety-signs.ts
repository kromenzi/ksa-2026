import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);

function clientRow(row: any) {
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
    printCount: row.print_count ?? 0,
    viewCount: row.view_count ?? 0,
    lastPrintedAt: row.last_printed_at,
    lastPrintedBy: row.last_printed_by,
    qrCodeUrl: row.qr_code_url,
    relatedDocumentIds: row.related_document_ids || [],
    revisions: row.revisions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbRow(body: any) {
  const row: Record<string, any> = {};
  const map: Record<string, string> = {
    signName: "sign_name", titleAr: "title_ar", titleEn: "title_en", category: "category",
    subType: "sub_type", zone: "zone", department: "department", location: "location",
    signType: "sign_type", description: "description", safetyInstructionsAr: "safety_instructions_ar",
    safetyInstructionsEn: "safety_instructions_en", status: "status", documentNumber: "document_number",
    revision: "revision", issueDate: "issue_date", reviewDate: "review_date", imageUrl: "image_url",
    originalFileName: "original_file_name", fileSize: "file_size", mimeType: "mime_type",
    attachmentUrl: "attachment_url", attachmentName: "attachment_name", attachmentType: "attachment_type",
    attachmentSize: "attachment_size", printCount: "print_count", viewCount: "view_count",
    lastPrintedAt: "last_printed_at", lastPrintedBy: "last_printed_by", qrCodeUrl: "qr_code_url",
    relatedDocumentIds: "related_document_ids", revisions: "revisions",
  };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) row[column] = body[key] ?? null;
  }
  if (Array.isArray(row.safety_instructions_ar) === false && row.safety_instructions_ar !== undefined) row.safety_instructions_ar = [String(row.safety_instructions_ar)];
  if (Array.isArray(row.safety_instructions_en) === false && row.safety_instructions_en !== undefined) row.safety_instructions_en = [String(row.safety_instructions_en)];
  if (row.related_document_ids !== undefined && !Array.isArray(row.related_document_ids)) row.related_document_ids = [String(row.related_document_ids)];
  return row;
}

export default async function handler(req: any, res: any) {
  try {
    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });

    const id = String(req.query?.id || "").trim();
    const action = String(req.query?.action || "").trim();

    if (req.method === "GET") {
      const query = id
        ? `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
        : "/rest/v1/safety_signs?select=*&order=created_at.desc";
      const r = await supabaseFetchForRequest(req, query);
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load safety signs" });
      return json(res, 200, id ? (rows[0] ? clientRow(rows[0]) : null) : rows.map(clientRow));
    }

    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    if (req.method === "POST" && (action === "print" || action === "view")) {
      if (!id) return json(res, 400, { error: "Safety sign id is required" });
      const patch = action === "print"
        ? { print_count: "print_count + 1", last_printed_at: new Date().toISOString(), last_printed_by: user.id }
        : { view_count: "view_count + 1" };
      const select = `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`;
      const currentResp = await supabaseFetchForRequest(req, `${select}&select=print_count,view_count`);
      const currentRows = await currentResp.json();
      if (!currentResp.ok || !currentRows[0]) return json(res, currentResp.ok ? 404 : currentResp.status, { error: "Safety sign not found" });
      const current = currentRows[0];
      const actualPatch = action === "print"
        ? { print_count: Number(current.print_count || 0) + 1, last_printed_at: new Date().toISOString(), last_printed_by: user.id }
        : { view_count: Number(current.view_count || 0) + 1 };
      const r = await supabaseFetchForRequest(req, select, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(actualPatch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || `Unable to record ${action}` });
      return json(res, 200, clientRow(rows[0]));
    }

    if (req.method === "POST") {
      const row = dbRow(req.body || {});
      row.created_at = row.created_at || new Date().toISOString();
      row.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, "/rest/v1/safety_signs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create safety sign" });
      return json(res, 201, clientRow(rows[0]));
    }

    if ((req.method === "PATCH" || req.method === "PUT") && id) {
      const patch = dbRow(req.body || {});
      patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update safety sign" });
      if (!rows[0]) return json(res, 404, { error: "Safety sign not found" });
      return json(res, 200, clientRow(rows[0]));
    }

    if (req.method === "DELETE" && id) {
      const r = await supabaseFetchForRequest(req, `/rest/v1/safety_signs?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        return json(res, r.status, { error: body?.message || "Unable to delete safety sign" });
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Safety Signs API failed" });
  }
}

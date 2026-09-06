from pathlib import Path

reports_path = Path("src/pages/admin/reports.tsx")
text = reports_path.read_text(encoding="utf-8")
old = '''  const handleEscalateSafetyReport = useCallback(async (report: SafetyReport) => {
    const existing = report.sourceMetadata?.escalation;
    if (existing?.id) {
      window.location.assign('/admin/escalations/history');
      return;
    }
    if (report.status === 'closed') {'''
new = '''  const handleEscalateSafetyReport = useCallback(async (report: SafetyReport) => {
    if (report.status === 'closed') {'''
if old not in text:
    raise SystemExit("Expected SOR escalation navigation block not found")
text = text.replace(old, new, 1)
reports_path.write_text(text, encoding="utf-8")

api_path = Path("api/escalations/[id].ts")
api = api_path.read_text(encoding="utf-8")
old_delete = '''    if (req.method === "DELETE") {
      if (!deleteRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      const response = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to delete escalation" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Escalation not found or could not be deleted" });
      return json(res, 200, { ok: true, deletedId: id });
    }'''
new_delete = '''    if (req.method === "DELETE") {
      if (!deleteRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });
      const response = await supabaseFetchForRequest(req, `/rest/v1/escalations?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to delete escalation" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Escalation not found or could not be deleted" });

      const deleted = rows[0];
      const sourceData = deleted?.data && typeof deleted.data === "object" ? deleted.data : {};
      const sourceType = String(sourceData.sourceType || "").toUpperCase();
      const sourceId = String(sourceData.sourceId || "").trim();
      if (sourceId && (sourceType === "SOR" || sourceType === "NCR")) {
        const table = sourceType === "SOR" ? "safety_reports" : "ncr";
        const sourceResponse = await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}&select=source_metadata&limit=1`);
        const sourceRows = await sourceResponse.json().catch(() => []);
        if (sourceResponse.ok && Array.isArray(sourceRows) && sourceRows[0]) {
          const metadata = sourceRows[0].source_metadata && typeof sourceRows[0].source_metadata === "object"
            ? { ...sourceRows[0].source_metadata }
            : {};
          const linkedId = String(metadata?.escalation?.id || "");
          if (!linkedId || linkedId === id) {
            delete metadata.escalation;
            await supabaseFetchForRequest(req, `/rest/v1/${table}?id=eq.${encodeURIComponent(sourceId)}`, {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ source_metadata: metadata, updated_at: new Date().toISOString() }),
            });
          }
        }
      }

      return json(res, 200, { ok: true, deletedId: id });
    }'''
if old_delete not in api:
    raise SystemExit("Expected escalation DELETE block not found")
api = api.replace(old_delete, new_delete, 1)
api_path.write_text(api, encoding="utf-8")

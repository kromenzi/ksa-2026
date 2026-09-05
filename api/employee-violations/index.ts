import { getAuthUser, getProfile, json, supabaseFetchForRequest } from "../_lib/supabase.js";

const writableRoles = new Set(["admin", "manager", "editor"]);
const deleteRoles = new Set(["admin", "manager"]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalized(value: unknown) {
  return text(value).toLocaleLowerCase();
}

function employeeKey(row: any) {
  return normalized(row.employee_id) || normalized(row.employee_name);
}

function violationText(row: any) {
  return text(row.violation) || text(row.violation_description);
}

function enrichRows(rows: any[]) {
  const employeeCounts = new Map<string, number>();
  const sameViolationCounts = new Map<string, number>();

  for (const row of rows) {
    const key = employeeKey(row);
    if (!key) continue;
    employeeCounts.set(key, (employeeCounts.get(key) || 0) + 1);
    const sameKey = `${key}::${normalized(violationText(row))}`;
    sameViolationCounts.set(sameKey, (sameViolationCounts.get(sameKey) || 0) + 1);
  }

  return rows.map((row) => {
    const key = employeeKey(row);
    const repeatCount = key ? employeeCounts.get(key) || 1 : 1;
    const sameKey = `${key}::${normalized(violationText(row))}`;
    const sameViolationCount = key ? sameViolationCounts.get(sameKey) || 1 : 1;
    return toClient(row, repeatCount, sameViolationCount);
  });
}

function toClient(row: any, repeatCount = 1, sameViolationCount = 1) {
  const data = row?.data && typeof row.data === "object" ? row.data : {};
  return {
    id: row.id,
    refNo: row.ref_no,
    date: row.date,
    employeeName: row.employee_name,
    employeeId: row.employee_id,
    department: row.department || data.department || "",
    occupation: row.occupation || row.position || data.occupation || "",
    violation: row.violation || row.violation_description || "",
    notes: row.notes || data.notes || "",
    severity: row.severity || data.severity || "medium",
    status: row.status || "open",
    escalationId: row.escalation_id || null,
    escalatedAt: row.escalated_at || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    repeatCount,
    sameViolationCount,
    isRepeat: repeatCount > 1,
    isSameViolationRepeat: sameViolationCount > 1,
  };
}

async function loadRows(req: any) {
  const response = await supabaseFetchForRequest(
    req,
    "/rest/v1/employee_violations?select=*&order=created_at.desc",
  );
  const rows = await response.json();
  if (!response.ok) {
    const error = new Error(rows?.message || "Unable to load employee violations");
    (error as any).statusCode = response.status;
    throw error;
  }
  return Array.isArray(rows) ? rows : [];
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile?.is_active) return json(res, 401, { error: "Not authenticated" });

    const id = text(req.query?.id);
    const action = text(req.query?.action);

    if (req.method === "GET") {
      const rows = await loadRows(req);
      const enriched = enrichRows(rows);
      if (id) return json(res, 200, enriched.find((item) => item.id === id) || null);
      return json(res, 200, enriched);
    }

    if (!writableRoles.has(profile.role)) return json(res, 403, { error: "Insufficient permission" });

    if (req.method === "POST" && action === "escalate") {
      if (!id) return json(res, 400, { error: "Violation id is required" });

      const rows = await loadRows(req);
      const enriched = enrichRows(rows);
      const violation = enriched.find((item) => item.id === id);
      if (!violation) return json(res, 404, { error: "Violation not found" });
      if (violation.escalationId) return json(res, 409, { error: "Violation is already escalated" });

      const level = violation.repeatCount >= 3 ? "Level 3 - HSE Manager / HR" : "Level 2 - Department Manager";
      const severity = violation.repeatCount >= 3 ? "CRITICAL" : "HIGH";
      const year = new Date().getFullYear();
      const escalationRef = `ESC-${year}-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const reason = `Employee safety violation escalation. Employee: ${violation.employeeName} (${violation.employeeId}). Violation: ${violation.violation}. Total recorded violations: ${violation.repeatCount}.`;

      const escalationRow = {
        ref_no: escalationRef,
        title: `Safety Violation - ${violation.employeeName}`,
        status: "OPEN",
        department: violation.department || "HSE",
        date: dueDate,
        created_by: user.id,
        data: {
          source: `SAFETY-VIOLATION:${violation.id}`,
          violationRef: violation.refNo,
          employeeId: violation.employeeId,
          employeeName: violation.employeeName,
          severity,
          level,
          responsible: "Department Manager / HSE",
          department: violation.department || "HSE",
          reason,
          dueDate,
          history: [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              action: "Safety Violation Escalated",
              user: profile.name || user.email || "System",
              status: "OPEN",
              date: now,
              details: reason,
            },
          ],
        },
      };

      const escalationResponse = await supabaseFetchForRequest(req, "/rest/v1/escalations", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(escalationRow),
      });
      const escalationResult = await escalationResponse.json();
      if (!escalationResponse.ok) {
        return json(res, escalationResponse.status, { error: escalationResult?.message || "Unable to create escalation" });
      }

      const escalation = escalationResult?.[0];
      const updateResponse = await supabaseFetchForRequest(
        req,
        `/rest/v1/employee_violations?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            status: "escalated",
            escalation_id: escalation?.id || null,
            escalated_at: now,
            escalated_by: user.id,
            updated_at: now,
          }),
        },
      );
      const updateResult = await updateResponse.json();
      if (!updateResponse.ok) {
        return json(res, updateResponse.status, { error: updateResult?.message || "Escalation created but violation update failed" });
      }

      return json(res, 201, {
        violation: toClient(updateResult[0], violation.repeatCount, violation.sameViolationCount),
        escalation: { id: escalation?.id, refNo: escalation?.ref_no || escalationRef },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const employeeName = text(body.employeeName);
      const employeeId = text(body.employeeId);
      const department = text(body.department);
      const occupation = text(body.occupation);
      const violation = text(body.violation);
      const notes = text(body.notes);

      if (!employeeName || !employeeId || !department || !occupation || !violation) {
        return json(res, 422, {
          error: "Employee name, employee ID, department, occupation and violation are required",
        });
      }

      const severity = ["low", "medium", "high", "critical"].includes(text(body.severity).toLowerCase())
        ? text(body.severity).toLowerCase()
        : "medium";
      const year = new Date().getFullYear();
      const refNo = `VIO-${year}-${Date.now().toString(36).toUpperCase()}`;
      const row = {
        ref_no: refNo,
        date: text(body.date) || new Date().toISOString().slice(0, 10),
        employee_name: employeeName,
        employee_id: employeeId,
        department,
        occupation,
        position: occupation,
        violation,
        violation_description: violation,
        notes: notes || null,
        severity,
        status: "open",
        created_by: user.id,
        data: { department, occupation, notes, severity },
      };

      const response = await supabaseFetchForRequest(req, "/rest/v1/employee_violations", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      const result = await response.json();
      if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to create violation" });

      const rows = await loadRows(req);
      const created = enrichRows(rows).find((item) => item.id === result?.[0]?.id);
      return json(res, 201, created || toClient(result[0]));
    }

    if (!id) return json(res, 400, { error: "Violation id is required" });

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = req.body || {};
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const mapping: Record<string, string> = {
        date: "date",
        employeeName: "employee_name",
        employeeId: "employee_id",
        department: "department",
        occupation: "occupation",
        violation: "violation",
        notes: "notes",
        severity: "severity",
        status: "status",
      };
      for (const [clientKey, column] of Object.entries(mapping)) {
        if (clientKey in body) patch[column] = body[clientKey];
      }
      if ("occupation" in body) patch.position = body.occupation;
      if ("violation" in body) patch.violation_description = body.violation;

      const response = await supabaseFetchForRequest(
        req,
        `/rest/v1/employee_violations?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(patch),
        },
      );
      const result = await response.json();
      if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to update violation" });
      if (!result?.[0]) return json(res, 404, { error: "Violation not found" });
      return json(res, 200, toClient(result[0]));
    }

    if (req.method === "DELETE") {
      if (!deleteRoles.has(profile.role)) return json(res, 403, { error: "Delete permission required" });
      const response = await supabaseFetchForRequest(
        req,
        `/rest/v1/employee_violations?id=eq.${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { Prefer: "return=representation" } },
      );
      const result = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: result?.message || "Unable to delete violation" });
      if (!Array.isArray(result) || result.length === 0) return json(res, 404, { error: "Violation not found" });
      return json(res, 200, { ok: true, deletedId: id });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    return json(res, error.statusCode || 500, { error: error.message || "Employee violations API failed" });
  }
}

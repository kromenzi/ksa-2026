import { getAccessToken, getAuthUser, getProfile, hasValidCsrfToken, json, supabaseFetch, supabaseFetchForRequest } from "./_lib/supabase.js";
import { fallbackSupabaseUrl } from "./_lib/supabase-public-config.js";
import { monthlyHsePlanHandler } from "./_lib/monthly-hse-plan.js";
import { hseAssistantHandler } from "./_lib/hse-assistant.js";
import { notificationProviderStatus, processNotificationOutbox } from "./_lib/notification-delivery.js";
import { hasAppPermission } from "./_lib/authorization.js";

import { RESOURCE_MAP } from "./_lib/resource-map.js";
import { logger, requestId } from "./_lib/logger.js";

import { BULK_IMPORT_RESOURCES, COLUMNS, GENERIC_COLUMNS, GENERIC_TABLES } from "./_lib/resource-columns.js";
const camelToSnake = (value: string) => value.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
const snakeToCamel = (value: string) => value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapClient = (row: any) => row && typeof row === "object" ? Object.fromEntries(Object.entries(row).map(([k, v]) => [snakeToCamel(k), v])) : row;

function sanitizeBody(table: string, body: any, mode: "insert" | "update") {
  const allowed = COLUMNS[table] || new Set<string>();
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(body || {})) {
    const column = camelToSnake(key);
    if (!allowed.has(column)) continue;
    if (table === "users" && column === "password") continue;
    if (mode === "update" && column === "id") continue;
    out[column] = value;
  }
  return out;
}


const reportingBaseUrl = process.env.SUPABASE_URL || fallbackSupabaseUrl;
const REPORTING_EDGE_URL = `${reportingBaseUrl.endsWith("/") ? reportingBaseUrl.slice(0, -1) : reportingBaseUrl}/functions/v1/safety-reporting`;

async function sha256Hex(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function reportingClientIp(req: any) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0]?.trim();
  return forwarded || String(req?.headers?.["x-real-ip"] || req?.socket?.remoteAddress || "unknown");
}

async function proxySafetyReporting(req: any, res: any, action: string, requireUser = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-reporting-client-ip": reportingClientIp(req),
  };
  if (requireUser) {
    const token = getAccessToken(req);
    if (!token) return json(res, 401, { error: "Not authenticated" });
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${REPORTING_EDGE_URL}?action=${encodeURIComponent(action)}`, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body || {}),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ error: "Safety reporting service returned an invalid response" }));
  return json(res, response.status, payload);
}

const DEFAULT_REPORT_SETTINGS = {
  id: "main",
  plantPrefix: "PLT",
  dateFormat: "YYYY-MM-DD",
  resetRule: "yearly",
  companyName: "UTEC SAFETY BOARD",
  companyLogo: "/utec-logo.svg",
  templateTitle: "Safety Report",
  publicBaseUrl: null,
};

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const rid = requestId(req);
  const route = "/api/data";
  logger.info("api.request.start", { route, requestId: rid, method: req.method, resource: req.query?.resource || null });
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    const resource = String(req.query?.resource || "").trim();
    if (resource === "safety-reporting-public") return await proxySafetyReporting(req, res, String(req.query?.action || "channels"), false);
    if (resource === "monthly-hse-plan") return await monthlyHsePlanHandler(req, res);

    if (resource === "notification-delivery-cron") {
      if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
      const cronSecret = String(process.env.CRON_SECRET || "");
      if (!cronSecret) {
        logger.warn("notification.cron.skipped", { requestId: rid, reason: "CRON_SECRET is not configured" });
        return json(res, 200, { ok: false, skipped: true, reason: "CRON_SECRET is not configured" });
      }
      const authHeader = String(req.headers?.authorization || "");
      if (authHeader !== `Bearer ${cronSecret}`) return json(res, 401, { error: "Unauthorized cron request" });
      const result = await processNotificationOutbox(50);
      logger.info("notification.cron.processed", { requestId: rid, ...result });
      return json(res, 200, { ok: true, ...result });
    }

    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(req.method || "").toUpperCase()) && !hasValidCsrfToken(req)) {
      return json(res, 403, { error: "CSRF validation failed" });
    }
    if (resource === "hse-assistant") return await hseAssistantHandler(req,res,profile);
    if (resource === "notification-delivery") {
      if (!(await hasAppPermission(req, profile, "settings", req.method === "GET" ? "read" : "update"))) {
        return json(res, 403, { error: "Insufficient permission" });
      }
      if (req.method === "GET") {
        const status = notificationProviderStatus();
        const outboxResponse = await supabaseFetchForRequest(
          req,
          "/rest/v1/notification_outbox?select=id,status,channel,attempts,last_error,created_at&order=created_at.desc&limit=100"
        );
        const outboxRows = await outboxResponse.json().catch(() => []);
        return json(res, 200, { ...status, outbox: outboxResponse.ok ? outboxRows.map(mapClient) : [] });
      }
      if (req.method === "POST") {
        const action = String(req.body?.action || "process");
        if (action !== "process") return json(res, 422, { error: "Unsupported notification delivery action" });
        const result = await processNotificationOutbox(Number(req.body?.limit || 20));
        return json(res, 200, result);
      }
      return json(res, 405, { error: "Method not allowed" });
    }
    if (resource === "safety-intelligence") {
      if (req.method !== "GET") return json(res,405,{error:"Method not allowed"});
      if (!(await hasAppPermission(req,profile,"reports","read"))) return json(res,403,{error:"Insufficient permission"});
      const response=await supabaseFetchForRequest(req,"/rest/v1/rpc/hse_intelligence_snapshot",{method:"POST",body:"{}"});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)return json(res,response.status,{error:payload?.message||"Unable to load Safety Intelligence"});
      return json(res,200,payload);
    }

    if (resource === "live-meeting-invite") {
      if (req.method !== "POST") return json(res,405,{error:"Method not allowed"});
      if (!(await hasAppPermission(req,profile,"content","update"))) return json(res,403,{error:"Insufficient permission"});
      const meetingId=String(req.body?.meetingId||"").trim();
      if(!meetingId)return json(res,422,{error:"meetingId is required"});
      const lookup=await supabaseFetch(`/rest/v1/live_meetings?select=id,created_by,status&id=eq.${encodeURIComponent(meetingId)}&limit=1`);
      const meetings=await lookup.json().catch(()=>[]);
      if(!lookup.ok)return json(res,lookup.status,{error:meetings?.message||"Unable to load meeting"});
      const meeting=meetings[0];
      if(!meeting)return json(res,404,{error:"Meeting not found"});
      if(profile.role!=="admin"&&meeting.created_by!==profile.id)return json(res,403,{error:"Only the meeting host or an administrator can create an invite"});
      if(meeting.status!=="live")return json(res,409,{error:"Meeting is not live"});
      const token=crypto.randomUUID().replace(/-/g,"")+crypto.randomUUID().replace(/-/g,"");
      const joinTokenHash=await sha256Hex(token);
      const patch=await supabaseFetch(`/rest/v1/live_meetings?id=eq.${encodeURIComponent(meetingId)}`,{
        method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({access_mode:"invite_only",join_token_hash:joinTokenHash,waiting_room:true,updated_at:new Date().toISOString()}),
      });
      if(!patch.ok){const p=await patch.json().catch(()=>({}));return json(res,patch.status,{error:p?.message||"Unable to secure meeting"});}
      return json(res,200,{meetingId,accessMode:"invite_only",joinPath:`/admin/live-meeting?meeting=${encodeURIComponent(meetingId)}&token=${encodeURIComponent(token)}`});
    }
    if (resource === "safety-reporting-reveal") return await proxySafetyReporting(req, res, "reveal", true);

    if (resource === "bulk-import") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const entity = String(req.body?.entity || "").trim();
      if (!BULK_IMPORT_RESOURCES.has(entity)) return json(res, 422, { error: "Unsupported import entity" });
      const config = RESOURCE_MAP[entity];
      if (!config) return json(res, 422, { error: "Import resource is not configured" });
      if (!(await hasAppPermission(req, profile, config.module, "create"))) return json(res, 403, { error: "Insufficient permission" });
      const incoming = Array.isArray(req.body?.rows) ? req.body.rows : [];
      if (!incoming.length) return json(res, 422, { error: "rows are required" });
      if (incoming.length > 500) return json(res, 413, { error: "A single import is limited to 500 rows" });
      const table = config.table;
      const prepared = incoming.map((item:any)=>sanitizeBody(table,item,"insert")).filter((item:any)=>Object.keys(item).length>0).map((row:any)=>{
        if(table==="employees"){row.status=row.status||"Active";row.created_at=row.created_at||new Date().toISOString();row.updated_at=row.updated_at||new Date().toISOString();}
        if(["equipment_assets","contractors"].includes(table)){row.created_by=row.created_by||profile.id;row.created_at=row.created_at||new Date().toISOString();row.updated_at=row.updated_at||new Date().toISOString();}
        if(table==="fire_devices"){row.created_at=row.created_at||new Date().toISOString();row.updated_at=row.updated_at||new Date().toISOString();row.status=row.status||"Unknown";}
        if(table==="trainings"){row.data=row.data||{};row.ref_no=row.ref_no||`TRAIN-${crypto.randomUUID().slice(0,8).toUpperCase()}`;row.title=row.title||"Imported Training";row.status=row.status||"active";row.created_by=row.created_by||user.id;row.created_at=row.created_at||new Date().toISOString();row.updated_at=row.updated_at||new Date().toISOString();}
        return row;
      });
      if (!prepared.length) return json(res, 422, { error: "No recognized columns were found" });
      if (req.body?.dryRun === true) return json(res,200,{entity,table,rowsReceived:incoming.length,rowsAccepted:prepared.length,sample:prepared.slice(0,5).map(mapClient)});
      const inserted:any[]=[];
      for(let index=0;index<prepared.length;index+=100){
        const chunk=prepared.slice(index,index+100);
        const response=await supabaseFetchForRequest(req,`/rest/v1/${table}`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(chunk)});
        const rows=await response.json().catch(()=>[]);
        if(!response.ok)return json(res,response.status,{error:rows?.message||"Bulk import failed",imported:inserted.length,failedAtRow:index+1});
        inserted.push(...rows);
      }
      return json(res,201,{entity,imported:inserted.length,rows:inserted.slice(0,20).map(mapClient)});
    }

    // Notifications use a dedicated flow because users may only read/update
    // their own rows, while administrators can inspect the shared inbox.
    if (["notifications", "notifications-all", "notification-unread-count", "notification-read-all"].includes(resource)) {
      const isAdmin = profile.role === "admin";
      const requestedUserId = String(req.query?.userId || "").trim();
      const ownerId = requestedUserId || String(profile.id);
      if (requestedUserId && requestedUserId !== String(profile.id) && !isAdmin) {
        return json(res, 403, { error: "Insufficient permission" });
      }

      if (resource === "notifications-all" && !isAdmin) {
        return json(res, 403, { error: "Insufficient permission" });
      }

      if (resource === "notification-unread-count") {
        if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
        const filter = resource === "notification-unread-count" ? `&user_id=eq.${encodeURIComponent(ownerId)}` : "";
        const response = await supabaseFetchForRequest(req, `/rest/v1/notifications?select=id&is_read=eq.false${filter}&limit=1000`, {
          headers: { Prefer: "count=exact" },
        });
        const rows = await response.json().catch(() => []);
        if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load notification count" });
        const contentRange = response.headers.get("content-range") || "";
        const count = contentRange.includes("/") ? Number(contentRange.split("/").pop()) : rows.length;
        return json(res, 200, { count: Number.isFinite(count) ? count : rows.length });
      }

      if (resource === "notification-read-all") {
        if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
        const response = await supabaseFetchForRequest(req, `/rest/v1/notifications?user_id=eq.${encodeURIComponent(ownerId)}&is_read=eq.false`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ is_read: true }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return json(res, response.status, { error: body?.message || "Unable to mark notifications as read" });
        }
        return json(res, 200, { ok: true });
      }

      if (req.method === "GET") {
        const ownerFilter = resource === "notifications-all" ? "" : `&user_id=eq.${encodeURIComponent(ownerId)}`;
        const response = await supabaseFetchForRequest(req, `/rest/v1/notifications?select=*&order=created_at.desc&limit=100${ownerFilter}`);
        const rows = await response.json().catch(() => []);
        if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load notifications" });
        return json(res, 200, rows.map(mapClient));
      }

      const notificationId = String(req.query?.id || "").trim();
      if (!notificationId) return json(res, 400, { error: "Notification id is required" });
      const ownerFilter = isAdmin ? "" : `&user_id=eq.${encodeURIComponent(String(profile.id))}`;
      if (req.method === "PATCH") {
        const response = await supabaseFetchForRequest(req, `/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}${ownerFilter}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ is_read: true }),
        });
        const rows = await response.json().catch(() => []);
        if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to mark notification as read" });
        if (!rows[0]) return json(res, 404, { error: "Notification not found" });
        return json(res, 200, mapClient(rows[0]));
      }
      if (req.method === "DELETE") {
        const response = await supabaseFetchForRequest(req, `/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}${ownerFilter}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return json(res, response.status, { error: body?.message || "Unable to delete notification" });
        }
        return json(res, 200, { ok: true });
      }
      return json(res, 405, { error: "Method not allowed" });
    }

    if (resource === "employee-directory") {
      if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
      const type = String(req.query?.type || "").trim().toLowerCase();
      const pType = type === "hse" || type === "workforce" ? type : null;
      const response = await supabaseFetchForRequest(req, "/rest/v1/rpc/employee_directory", {
        method: "POST",
        body: JSON.stringify({ p_employee_type: pType }),
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load employee directory" });
      return json(res, 200, (rows || []).map(mapClient));
    }

    if (resource === "monthly-hse-report-generate") {
      if (req.method !== "POST") return json(res,405,{error:"Method not allowed"});
      const pMonth=Number(req.body?.month);
      const pYear=Number(req.body?.year);
      if(!Number.isInteger(pMonth)||pMonth<1||pMonth>12||!Number.isInteger(pYear)) return json(res,422,{error:"Valid month and year are required"});
      const response=await supabaseFetchForRequest(req,"/rest/v1/rpc/request_monthly_hse_report",{
        method:"POST",body:JSON.stringify({p_month:pMonth,p_year:pYear})
      });
      const row=await response.json().catch(()=>null);
      if(!response.ok) return json(res,response.status,{error:row?.message||"Unable to generate monthly HSE report"});
      return json(res,200,mapClient(row));
    }

    if (resource === "qr-lookup") {
      if (req.method !== "GET") return json(res,405,{error:"Method not allowed"});
      const code=String(req.query?.code||"").trim();
      if(!code) return json(res,422,{error:"QR code is required"});
      const response=await supabaseFetchForRequest(req,`/rest/v1/safety_qr_registry?select=*&qr_code=eq.${encodeURIComponent(code)}&status=eq.Active&limit=1`);
      const rows=await response.json().catch(()=>[]);
      if(!response.ok) return json(res,response.status,{error:rows?.message||"Unable to resolve QR"});
      return json(res,200,rows[0]?mapClient(rows[0]):null);
    }

    if (resource === "violation-templates") {
      if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
      const response = await supabaseFetchForRequest(req, "/rest/v1/rpc/active_violation_templates", {
        method: "POST",
        body: "{}",
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: rows?.message || "Unable to load violation templates" });
      return json(res, 200, (rows || []).map(mapClient));
    }

    const config = RESOURCE_MAP[resource];
    if (!config) return json(res, 404, { error: "Unknown API resource" });
    if (config.adminOnly && profile.role !== "admin") return json(res, 403, { error: "Insufficient permission" });

    const rawId = String(req.query?.id || "").trim();
    const table = config.table;
    const base = `/rest/v1/${table}`;
    const body = req.body || {};

    if (req.method === "GET") {
      if (!(await hasAppPermission(req, profile, config.module, "read"))) {
        return json(res, 403, { error: "Insufficient permission" });
      }
      // Keep large administrative lists bounded by default; detail pages can
      // still request a specific id, while dashboards avoid huge payloads.
      let url = `${base}?select=*${rawId ? "" : "&limit=500"}`;
      if (rawId) url += table === "section_config" ? `&section_type=eq.${encodeURIComponent(rawId)}` : `&id=eq.${encodeURIComponent(rawId)}`;
      if (table === "users") url = `${base}?select=id,name,email,role,is_active,avatar,joined_at,auth_user_id${rawId ? `&id=eq.${encodeURIComponent(rawId)}` : ""}`;
      if (table === "employees") url += "&order=name.asc";
      if (["fire_gateways","fire_panels","fire_devices","emergency_exits"].includes(table)) url += "&order=updated_at.desc";
      if (["fire_device_events","emergency_exit_events"].includes(table)) url += "&order=occurred_at.desc&limit=500";
      if (table === "hse_actions") url += "&order=created_at.desc";
      if (table === "hse_workflows") url += "&order=updated_at.desc";
      if (["hse_workflow_links","hse_workflow_events"].includes(table)) {
        const workflowId = String(req.query?.workflowId || "").trim();
        if (workflowId) url += `&workflow_id=eq.${encodeURIComponent(workflowId)}`;
        url += "&order=created_at.asc";
      }
      if (table === "audit_programs") url += "&order=planned_date.desc.nullslast,created_at.desc";
      if (table === "audit_findings") { const auditId=String(req.query?.auditId||"").trim(); if(auditId) url += `&audit_id=eq.${encodeURIComponent(auditId)}`; url += "&order=due_date.asc.nullslast,created_at.desc"; }
      if (table === "legal_requirements") url += "&order=next_review_date.asc.nullslast,created_at.desc";
      if (table === "compliance_evidence") { const requirementId=String(req.query?.requirementId||"").trim(); if(requirementId) url += `&requirement_id=eq.${encodeURIComponent(requirementId)}`; url += "&order=uploaded_at.desc"; }
      if (["hse_action_comments","hse_action_evidence","hse_action_history","hse_action_escalations"].includes(table)) {
        const actionId = String(req.query?.actionId || "").trim();
        if (actionId) url += `&action_id=eq.${encodeURIComponent(actionId)}`;
        const orderField = table === "hse_action_comments" ? "created_at" : table === "hse_action_evidence" ? "uploaded_at" : table === "hse_action_history" ? "changed_at" : "escalated_at";
        url += `&order=${orderField}.desc`;
      }
      if (table === "hse_escalation_rules") url += "&order=priority.asc,overdue_hours.asc";
      if (table === "ptw_permits") url += "&order=created_at.desc";
      if (table === "loto_isolations") {
        const permitId = String(req.query?.permitId || "").trim();
        if (permitId) url += `&permit_id=eq.${encodeURIComponent(permitId)}`;
        url += "&order=created_at.desc";
      }
      if (table === "inspection_templates") url += "&order=name.asc";
      if (table === "inspection_schedules") url += "&order=next_run_date.asc";
      if (table === "inspection_tasks") url += "&order=due_date.desc";
      if (table === "safety_observations") url += "&order=observed_at.desc";
      if (table === "equipment_assets") url += "&order=asset_code.asc";
      if (table === "contractors") url += "&order=name.asc";
      if (table === "monthly_hse_reports") url += "&order=year.desc,month.desc";
      if (table === "safety_qr_registry") url += "&order=resource_type.asc,label.asc";
      if (table === "site_floor_plans") url += "&order=building.asc,floor.asc";
      if (table === "safety_map_points") {
        const floorPlanId=String(req.query?.floorPlanId||"").trim();
        if(floorPlanId) url += `&floor_plan_id=eq.${encodeURIComponent(floorPlanId)}`;
        url += "&order=point_type.asc,label.asc";
      }
      if (table === "emergency_assembly_points") url += "&order=point_code.asc";
      if (table === "emergency_response_incidents") url += "&order=alarm_started_at.desc";
      if (["emergency_response_timeline","emergency_muster_entries"].includes(table)) {
        const responseId=String(req.query?.responseId||"").trim();
        if(responseId) url += `&response_id=eq.${encodeURIComponent(responseId)}`;
        url += table==="emergency_response_timeline" ? "&order=occurred_at.asc" : "&order=person_name.asc";
      }
      if (table === "risk_register") url += "&order=residual_score.desc,review_date.asc";
      if (table === "hse_events") url += "&order=occurred_at.desc&limit=500";
      if (table === "notification_outbox") url += "&order=created_at.desc&limit=500";
      if (table === "notification_rules") url += "&order=updated_at.desc";
      if (table === "integrations") url += "&order=updated_at.desc";
      if (table === "live_meetings") url = `${base}?select=id,room_code,title,provider,provider_room_name,status,created_by,started_at,ended_at,created_at,updated_at,access_mode,waiting_room&order=started_at.desc&limit=100`;
      if (["live_meeting_participants","live_meeting_messages"].includes(table)) {
        const meetingId = String(req.query?.meetingId || "").trim();
        if (meetingId) url += `&meeting_id=eq.${encodeURIComponent(meetingId)}`;
        url += table === "live_meeting_messages" ? "&order=created_at.asc" : "&order=joined_at.asc";
      }
      if (table === "risk_controls") {
        const riskId = String(req.query?.riskId || "").trim();
        if (riskId) url += `&risk_id=eq.${encodeURIComponent(riskId)}`;
        url += "&order=created_at.asc";
      }
      if (table === "chemicals") url += "&order=product_name.asc";
      if (["chemical_sds","chemical_inventory_transactions"].includes(table)) {
        const chemicalId = String(req.query?.chemicalId || "").trim();
        if (chemicalId) url += `&chemical_id=eq.${encodeURIComponent(chemicalId)}`;
        url += table === "chemical_sds" ? "&order=revision_date.desc" : "&order=occurred_at.desc";
      }
      if (["contractor_workers","contractor_documents","contractor_scorecards"].includes(table)) {
        const contractorId = String(req.query?.contractorId || "").trim();
        if (contractorId) url += `&contractor_id=eq.${encodeURIComponent(contractorId)}`;
        const workerId = String(req.query?.workerId || "").trim();
        if (workerId && table === "contractor_documents") url += `&worker_id=eq.${encodeURIComponent(workerId)}`;
        if (table === "contractor_workers") url += "&order=name.asc";
        if (table === "contractor_documents") url += "&order=expiry_date.asc";
        if (table === "contractor_scorecards") url += "&order=year.desc,month.desc";
      }
      if (["equipment_service_records","equipment_defects","equipment_operator_authorizations"].includes(table)) {
        const assetId = String(req.query?.assetId || "").trim();
        if (assetId) url += `&asset_id=eq.${encodeURIComponent(assetId)}`;
        if (table === "equipment_service_records") url += "&order=performed_at.desc";
        if (table === "equipment_defects") url += "&order=reported_at.desc";
        if (table === "equipment_operator_authorizations") url += "&order=expiry_date.asc";
      }
      if (["loto_points","loto_locks"].includes(table)) {
        const isolationId = String(req.query?.isolationId || "").trim();
        if (isolationId) url += `&isolation_id=eq.${encodeURIComponent(isolationId)}`;
        url += "&order=created_at.asc";
      }
      if (table === "section_config") url += "&order=section_type.asc";
      if (GENERIC_TABLES.has(table)) url += "&order=updated_at.desc";
      if (table === "safety_reporting_messages") {
        const caseId = String(req.query?.caseId || "").trim();
        if (caseId) url += `&case_id=eq.${encodeURIComponent(caseId)}`;
        url += "&order=created_at.asc";
      }
      if (table === "safety_reporting_channels") url += "&order=channel.asc";
      if (table === "activity_logs") url += "&order=timestamp.desc&limit=500";
      const r = await supabaseFetchForRequest(req, url);
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to load resource" });
      if (config.single) {
        const mapped = rows[0] ? mapClient(rows[0]) : null;
        if (resource === "report-settings") return json(res, 200, mapped || DEFAULT_REPORT_SETTINGS);
        return json(res, 200, mapped);
      }
      return json(res, 200, rows.map(mapClient));
    }

    if (resource === "safety-reporting-channels" && !["GET", "PATCH", "PUT"].includes(req.method || "")) {
      return json(res, 405, { error: "Reporting channels can only be read or updated" });
    }

    const action = req.method === "POST" ? "create" : req.method === "PATCH" || req.method === "PUT" ? "update" : req.method === "DELETE" ? "delete" : "";
    if (!action) return json(res, 405, { error: "Method not allowed" });
    const liveSelfServiceMutation =
      (req.method === "POST" &&
        (resource === "live-meeting-participants" || resource === "live-meeting-messages")) ||
      (req.method === "PATCH" && resource === "live-meeting-participants");
    if (!liveSelfServiceMutation && !(await hasAppPermission(req, profile, config.module, action as any))) {
      return json(res, 403, { error: "Insufficient permission" });
    }

    if (resource === "permissions" && (req.method === "PUT" || req.method === "PATCH")) {
      const role = String(body.role || "").trim();
      const module = String(body.module || "").trim();
      const actions = Array.isArray(body.actions) ? body.actions : [];
      if (!role || !module) return json(res, 422, { error: "role and module are required" });
      const lookup = `${base}?role=eq.${encodeURIComponent(role)}&module=eq.${encodeURIComponent(module)}`;
      const existing = await supabaseFetchForRequest(req, `${lookup}&select=id`);
      const erows = await existing.json();
      if (!existing.ok) return json(res, existing.status, { error: erows?.message || "Unable to load permission" });
      const request = erows[0]
        ? await supabaseFetchForRequest(req, `${base}?id=eq.${encodeURIComponent(erows[0].id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ actions }) })
        : await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ role, module, actions }) });
      const result = await request.json();
      if (!request.ok) return json(res, request.status, { error: result?.message || "Unable to save permission" });
      return json(res, 200, mapClient(result[0]));
    }

    if (req.method === "POST") {
      const row = sanitizeBody(table, body, "insert");
      if (["documents", "reports", "posts", "form_templates", "employees", "routing_rules", "fire_gateways", "fire_panels", "fire_devices", "fire_device_events", "emergency_exits", "emergency_exit_events", "hse_actions", "hse_action_comments"].includes(table)) row.created_at = row.created_at || new Date().toISOString();
      if (table === "hse_actions") row.created_by = row.created_by || profile.id;
      if (["hse_workflows","hse_workflow_links","hse_workflow_events"].includes(table)) row.created_by = row.created_by || profile.id;
      if (table === "hse_events" || table === "notification_outbox") row.created_by = row.created_by || profile.id;
      if (table === "live_meetings") {
        const entropy = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        row.room_code = row.room_code || `LIVE-${entropy.slice(0, 8)}`;
        row.provider = "jitsi";
        row.provider_room_name = row.provider_room_name || `ABDULKAREM-SAFETY-${entropy}`;
        row.status = row.status || "live";
        row.title = String(row.title || "Safety Live Meeting").slice(0, 160);
        row.created_by = profile.id;
        row.started_at = row.started_at || new Date().toISOString();
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = new Date().toISOString();
      }
      if (table === "live_meeting_participants") {
        const meetingId = String(row.meeting_id || "").trim();
        if (!meetingId) return json(res, 422, { error: "meetingId is required" });
        const meetingResponse = await supabaseFetch(
          `/rest/v1/live_meetings?select=id,created_by,status,access_mode,join_token_hash&id=eq.${encodeURIComponent(meetingId)}&limit=1`
        );
        const meetingRows = await meetingResponse.json().catch(() => []);
        if (!meetingResponse.ok) return json(res, meetingResponse.status, { error: meetingRows?.message || "Unable to validate meeting" });
        const meeting = meetingRows[0];
        if (!meeting || meeting.status !== "live") return json(res, 404, { error: "Live meeting not found" });
        if (meeting.access_mode === "invite_only" && meeting.created_by !== profile.id && profile.role !== "admin") {
          const providedToken=String(body.joinToken||"").trim();
          if(!providedToken)return json(res,403,{error:"A secure meeting invite is required"});
          const providedHash=await sha256Hex(providedToken);
          if(!meeting.join_token_hash||providedHash!==meeting.join_token_hash)return json(res,403,{error:"Invalid or expired meeting invite"});
        }
        const activeParticipantResponse = await supabaseFetchForRequest(
          req,
          `/rest/v1/live_meeting_participants?select=*&meeting_id=eq.${encodeURIComponent(meetingId)}&user_id=eq.${encodeURIComponent(String(profile.id))}&left_at=is.null&limit=1`
        );
        const activeParticipantRows = await activeParticipantResponse.json().catch(() => []);
        if (!activeParticipantResponse.ok) {
          return json(res, activeParticipantResponse.status, { error: activeParticipantRows?.message || "Unable to validate attendance" });
        }
        if (activeParticipantRows[0]) return json(res, 200, mapClient(activeParticipantRows[0]));

        row.user_id = profile.id;
        row.display_name = String(profile.name || "Participant").slice(0, 160);
        row.role = meeting.created_by === profile.id ? "host" : "participant";
        row.joined_at = new Date().toISOString();
      }
      if (table === "live_meeting_messages") {
        const meetingId = String(row.meeting_id || "").trim();
        if (!meetingId) return json(res, 422, { error: "meetingId is required" });
        row.user_id = profile.id;
        row.sender_name = String(profile.name || "Participant").slice(0, 160);
        row.created_at = new Date().toISOString();
      }
      if (["audit_programs","audit_findings","legal_requirements"].includes(table)) row.created_by = row.created_by || profile.id;
      if (table === "compliance_evidence") row.uploaded_by = row.uploaded_by || profile.id;
      if (table === "hse_action_comments") row.created_by = row.created_by || profile.id;
      if (table === "hse_action_evidence") row.uploaded_by = row.uploaded_by || profile.id;
      if (table === "ptw_permits") {
        row.created_by = row.created_by || profile.id;
        row.issuer_user_id = row.issuer_user_id || profile.id;
      }
      if (table === "loto_isolations") row.created_by = row.created_by || profile.id;
      if (["inspection_templates","inspection_schedules","safety_observations","equipment_assets","equipment_service_records","equipment_operator_authorizations","contractors","contractor_documents","chemicals","risk_register","site_floor_plans","safety_map_points"].includes(table)) row.created_by = row.created_by || profile.id;
      if (table === "emergency_response_timeline") row.recorded_by = row.recorded_by || profile.id;
      if (table === "chemical_sds") row.uploaded_by = row.uploaded_by || profile.id;
      if (table === "chemical_inventory_transactions") row.recorded_by = row.recorded_by || profile.id;
      if (table === "activity_logs") {
        row.performed_by = row.performed_by || user.id;
        row.performed_by_name = row.performed_by_name || profile.name;
        row.timestamp = row.timestamp || new Date().toISOString();
      }
      if (table === "documents") row.created_by = row.created_by || user.id;
      if (table === "posts") row.author_id = row.author_id || user.id;
      if (GENERIC_TABLES.has(table)) {
        row.data = body.data || row.data || {};
        row.created_by = row.created_by || user.id;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        if (table === "safety_reporting_cases") {
          row.status = row.status || "New";
          row.title = row.title || body.title || "Safety Report";
        } else {
          row.ref_no = row.ref_no || `${resource.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          row.status = row.status || "active";
          row.title = row.title || body.title || resource;
        }
      }
      if (table === "safety_reporting_messages") {
        row.case_id = cleanReporting(body.caseId || body.case_id, 80);
        row.message = cleanReporting(body.message, 4000);
        row.sender_type = "hse";
        row.created_by = user.id;
        row.created_at = new Date().toISOString();
        if (!row.case_id || !row.message) return json(res, 422, { error: "caseId and message are required" });
      }
      const r = await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to create resource" });

      if (table === "hse_actions" && rows?.[0]?.id && row.source_type && row.source_id) {
        const existingWorkflowResponse = await supabaseFetchForRequest(
          req,
          `/rest/v1/hse_workflows?select=id&source_type=eq.${encodeURIComponent(String(row.source_type))}&source_id=eq.${encodeURIComponent(String(row.source_id))}&status=neq.Closed&limit=1`
        );
        const existingWorkflowRows = await existingWorkflowResponse.json().catch(() => []);
        let workflowId = existingWorkflowRows?.[0]?.id;
        if (!workflowId) {
          const workflowResponse = await supabaseFetchForRequest(req, "/rest/v1/hse_workflows", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              title: row.title || "HSE Corrective Workflow",
              source_type: row.source_type,
              source_id: row.source_id,
              department: row.department || null,
              factory: row.factory || null,
              area: row.area || null,
              owner_user_id: row.owner_user_id || null,
              created_by: profile.id,
              status: "Open",
            }),
          });
          const workflowRows = await workflowResponse.json().catch(() => []);
          if (workflowResponse.ok) workflowId = workflowRows?.[0]?.id;
        }
        if (workflowId) {
          await supabaseFetchForRequest(req, "/rest/v1/hse_workflow_links", {
            method: "POST",
            headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
            body: JSON.stringify({
              workflow_id: workflowId,
              from_type: String(row.source_type),
              from_id: row.source_id,
              to_type: "hse_action",
              to_id: rows[0].id,
              relation: "corrective_action",
              created_by: profile.id,
            }),
          });
          await supabaseFetchForRequest(req, "/rest/v1/hse_workflow_events", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              workflow_id: workflowId,
              event_type: "ACTION_CREATED",
              resource_type: "hse_action",
              resource_id: rows[0].id,
              message: row.title || "Corrective action created",
              created_by: profile.id,
            }),
          });
        }
      }

      return json(res, 201, mapClient(rows[0]));
    }

    if (resource === "section-config") {
      const sectionType = rawId;
      if (!sectionType) return json(res, 400, { error: "Section type is required" });
      if (req.method === "DELETE") return json(res, 405, { error: "Deleting section configuration is not supported" });
      const patch = sanitizeBody(table, body, "update");
      patch.section_type = sectionType;
      const lookup = `${base}?section_type=eq.${encodeURIComponent(sectionType)}`;
      const existing = await supabaseFetchForRequest(req, `${lookup}&select=id`);
      const erows = await existing.json();
      if (!existing.ok) return json(res, existing.status, { error: erows?.message || "Unable to load section configuration" });
      const request = erows[0]
        ? await supabaseFetchForRequest(req, lookup, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) })
        : await supabaseFetchForRequest(req, base, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const result = await request.json();
      if (!request.ok) return json(res, request.status, { error: result?.message || "Unable to save section configuration" });
      return json(res, 200, mapClient(result[0]));
    }

    const id = rawId || (config.single ? "main" : "");
    if (!id) return json(res, 400, { error: "Resource id is required" });
    const url = `${base}?id=eq.${encodeURIComponent(id)}`;

    if (req.method === "PATCH" || req.method === "PUT") {
      if (table === "live_meeting_participants") {
        const participantResponse = await supabaseFetchForRequest(
          req,
          `${base}?select=id,user_id,meeting_id,left_at&id=eq.${encodeURIComponent(id)}&limit=1`
        );
        const participantRows = await participantResponse.json().catch(() => []);
        if (!participantResponse.ok) {
          return json(res, participantResponse.status, { error: participantRows?.message || "Unable to validate participant" });
        }
        const participant = participantRows[0];
        if (!participant) return json(res, 404, { error: "Participant not found" });
        if (participant.user_id !== profile.id && profile.role !== "admin") {
          return json(res, 403, { error: "Participants can only update their own attendance" });
        }
        if (participant.left_at) return json(res, 200, mapClient(participant));

        const leftAt = new Date().toISOString();
        const leaveResponse = await supabaseFetchForRequest(req, url, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ left_at: leftAt }),
        });
        const leaveRows = await leaveResponse.json().catch(() => []);
        if (!leaveResponse.ok) {
          return json(res, leaveResponse.status, { error: leaveRows?.message || "Unable to record meeting leave" });
        }
        if (!leaveRows[0]) return json(res, 404, { error: "Participant not found or could not be updated" });
        return json(res, 200, mapClient(leaveRows[0]));
      }

      if (table === "live_meetings") {
        const ownership = await supabaseFetchForRequest(
          req,
          `${base}?select=id,created_by,status&id=eq.${encodeURIComponent(id)}&limit=1`
        );
        const ownershipRows = await ownership.json().catch(() => []);
        if (!ownership.ok) return json(res, ownership.status, { error: ownershipRows?.message || "Unable to validate meeting" });
        const meeting = ownershipRows[0];
        if (!meeting) return json(res, 404, { error: "Meeting not found" });
        if (profile.role !== "admin" && meeting.created_by !== profile.id) {
          return json(res, 403, { error: "Only the meeting host or an administrator can update this meeting" });
        }
      }
      const patch = sanitizeBody(table, body, "update");
      if (table === "documents" || table === "employees" || table === "hse_actions" || table === "notification_outbox" || table === "live_meetings" || table === "audit_programs" || table === "audit_findings" || table === "legal_requirements" || ["ptw_permits","loto_isolations","inspection_templates","inspection_schedules","inspection_tasks","safety_observations","equipment_assets","equipment_defects","contractors","contractor_workers","contractor_documents","contractor_scorecards","chemicals","risk_register","risk_controls","site_floor_plans","safety_map_points","monthly_hse_reports","emergency_assembly_points","emergency_response_incidents","fire_gateways","fire_panels","fire_devices","emergency_exits"].includes(table) || GENERIC_TABLES.has(table) || table === "safety_reporting_channels") patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, url, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update resource" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Resource not found or could not be updated" });
      if (table === "live_meetings" && patch.status === "completed") {
        const leftAt = patch.ended_at || new Date().toISOString();
        await supabaseFetchForRequest(
          req,
          `/rest/v1/live_meeting_participants?meeting_id=eq.${encodeURIComponent(id)}&left_at=is.null`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ left_at: leftAt }),
          }
        );
      }
      return json(res, 200, mapClient(rows[0]));
    }

    const r = await supabaseFetchForRequest(req, url, { method: "DELETE", headers: { Prefer: "return=representation" } });
    const rows = await r.json().catch(() => []);
    if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to delete resource" });
    if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Resource not found or could not be deleted" });
    return json(res, 200, { ok: true, deletedId: id });
  } catch (error: any) {
    logger.error("api.request.failed", error, { route, requestId: rid, method: req.method, resource: req.query?.resource || null, durationMs: Date.now() - startedAt });
    return json(res, error.statusCode || 500, { error: error.message || "Data API failed", requestId: rid });
  } finally {
    logger.info("api.request.done", { route, requestId: rid, method: req.method, resource: req.query?.resource || null, durationMs: Date.now() - startedAt, statusCode: res.statusCode });
  }
}

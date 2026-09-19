import { getAccessToken, getAuthUser, getProfile, json, supabaseFetchForRequest } from "./_lib/supabase.js";
import { fallbackSupabaseUrl } from "./_lib/supabase-public-config.js";
import { monthlyHsePlanHandler } from "./_lib/monthly-hse-plan.js";
import { hseAssistantHandler } from "./_lib/hse-assistant.js";

import { RESOURCE_MAP } from "./_lib/resource-map.js";
import { logger, requestId } from "./_lib/logger.js";

const GENERIC_COLUMNS = new Set(["id", "ref_no", "title", "status", "department", "date", "data", "created_by", "created_at", "updated_at"]);
const GENERIC_TABLES = new Set([
  "plants", "licenses", "equipment_auth", "trainings", "training_matrix", "competency",
  "inspections", "incidents", "audits", "compliance", "loto", "permits", "escalation_matrix", "safety_reporting_cases",
]);

const COLUMNS: Record<string, Set<string>> = {
  users: new Set(["id", "name", "email", "role", "is_active", "avatar", "joined_at", "auth_user_id"]),
  posts: new Set(["id", "title", "content", "author_id", "section_id", "status", "created_at", "tags"]),
  sections: new Set(["id", "name", "slug", "description", "is_visible", "order"]),
  form_templates: new Set(["id", "title", "description", "fields", "created_at", "status"]),
  reports: new Set(["id", "title", "type", "generated_by", "created_at", "status", "data"]),
  activity_logs: new Set(["id", "action", "details", "performed_by", "performed_by_name", "timestamp", "module"]),
  employees: new Set(["id", "name", "email", "title", "department_id", "is_primary", "employee_id", "department", "factory", "section", "nationality", "joining_date", "supervisor", "phone", "medical_status", "ppe_issued", "incidents_count", "ncr_count", "trainings_completed", "status", "photo_url", "digital_signature", "qr_code_data", "user_id", "employee_type", "hse_area", "shift", "violations_count", "created_at", "updated_at"]),
  routing_rules: new Set(["id", "department_id", "severity", "recipient_ids"]),
  permissions: new Set(["id", "role", "module", "actions"]),
  documents: new Set(["id", "doc_type", "ref_no", "title", "date", "vendor", "department", "status", "category", "description", "amount", "expiry_date", "metadata", "pdf_url", "extracted_data", "created_by", "created_at", "updated_at"]),
  section_config: new Set(["id", "section_type", "categories", "required_fields", "number_prefix", "number_format"]),
  email_config: new Set(["id", "smtp_host", "smtp_port", "username", "password", "from_name", "from_email", "enable_sending", "signature"]),
  report_settings: new Set(["id", "plant_prefix", "date_format", "reset_rule", "company_name", "company_logo", "template_title", "public_base_url"]),
  site_settings: new Set(["id", "site_name", "description", "allow_registration", "maintenance_mode", "language", "theme", "color_theme", "branding"]),
  plants: GENERIC_COLUMNS,
  licenses: GENERIC_COLUMNS,
  equipment_auth: GENERIC_COLUMNS,
  trainings: GENERIC_COLUMNS,
  training_matrix: GENERIC_COLUMNS,
  competency: GENERIC_COLUMNS,
  inspections: GENERIC_COLUMNS,
  incidents: GENERIC_COLUMNS,
  audits: GENERIC_COLUMNS,
  compliance: GENERIC_COLUMNS,
  loto: GENERIC_COLUMNS,
  permits: GENERIC_COLUMNS,
  safety_reporting_cases: GENERIC_COLUMNS,
  safety_reporting_messages: new Set(["id", "case_id", "sender_type", "message", "created_by", "created_at"]),
  safety_reporting_channels: new Set(["id", "channel", "is_enabled", "public_label_ar", "public_label_en", "destination", "config", "updated_at"]),
  escalation_matrix: GENERIC_COLUMNS,
  fire_gateways: new Set(["id","gateway_code","name","protocol","host","port","manufacturer","model","firmware","building","area","status","signal_quality","connected_devices","last_heartbeat_at","last_error","notes","config","created_at","updated_at"]),
  fire_panels: new Set(["id","panel_code","name","manufacturer","model","serial_number","building","floor","area","protocol","gateway_id","host","status","last_signal_at","last_test_at","next_test_at","notes","data","floor_plan_id","map_x","map_y","created_at","updated_at"]),
  fire_devices: new Set(["id","device_code","device_type","panel_id","zone_id","gateway_id","loop_no","address_no","building","floor","area","exact_location","manufacturer","model","serial_number","protocol","status","power_status","battery_level","isolated","last_signal_at","last_test_at","next_test_at","notes","data","floor_plan_id","map_x","map_y","created_at","updated_at"]),
  fire_device_events: new Set(["id","device_id","panel_id","gateway_id","event_type","severity","status","message","occurred_at","acknowledged_at","acknowledged_by","cleared_at","source","raw_payload","created_at"]),
  emergency_exits: new Set(["id","exit_code","name","building","floor","area","assembly_point","route_description","door_type","gateway_id","status","door_status","lock_status","panic_bar_status","exit_sign_status","emergency_light_status","emergency_light_battery","obstruction_status","last_signal_at","last_inspection_at","next_inspection_at","qr_code","notes","data","floor_plan_id","map_x","map_y","created_at","updated_at"]),
  emergency_exit_events: new Set(["id","exit_id","gateway_id","event_type","severity","status","message","occurred_at","acknowledged_at","acknowledged_by","cleared_at","source","raw_payload","created_at"]),
  hse_actions: new Set(["id","action_no","title","description","source_type","source_id","category","department","factory","area","priority","status","progress","owner_user_id","assigned_employee_id","due_at","evidence_required","verification_required","verified_by","verified_at","verification_notes","effectiveness_status","effectiveness_notes","escalation_level","created_by","created_at","updated_at","closed_at","metadata"]),
  hse_action_comments: new Set(["id","action_id","comment","created_by","created_at"]),
  hse_action_evidence: new Set(["id","action_id","file_url","file_name","note","uploaded_by","uploaded_at"]),
  hse_action_history: new Set(["id","action_id","event_type","old_values","new_values","changed_by","changed_at"]),
  hse_escalation_rules: new Set(["id","name","priority","overdue_hours","escalation_level","target_role","active","created_at"]),
  hse_action_escalations: new Set(["id","action_id","rule_id","escalation_level","target_role","reason","status","escalated_at","acknowledged_at","acknowledged_by","notes"]),
  ptw_permits: new Set(["id","permit_no","permit_type","title","description","department","factory","area","location","requester_employee_id","issuer_user_id","hse_reviewer_user_id","approver_user_id","status","risk_level","start_at","expires_at","reviewed_at","approved_at","activated_at","suspended_at","closed_at","suspension_reason","closure_notes","precautions","required_ppe","gas_test_required","gas_test_result","loto_required","signatures","created_by","created_at","updated_at"]),
  loto_isolations: new Set(["id","loto_no","permit_id","equipment_name","asset_ref","department","factory","area","isolation_type","status","authorized_employee_id","verified_by_user_id","zero_energy_verified","start_at","verified_at","released_at","closed_at","notes","created_by","created_at","updated_at"]),
  loto_points: new Set(["id","isolation_id","point_code","energy_type","location","normal_state","isolated_state","verification_method","status","created_at"]),
  loto_locks: new Set(["id","isolation_id","point_id","lock_number","tag_number","applied_by_employee_id","applied_at","removed_at","status","notes"]),
  inspection_templates: new Set(["id","name","category","description","checklist","active","created_by","created_at","updated_at"]),
  inspection_schedules: new Set(["id","template_id","assigned_employee_id","factory","area","department","frequency","day_of_week","day_of_month","next_run_date","active","created_by","created_at","updated_at"]),
  inspection_tasks: new Set(["id","schedule_id","template_id","inspector_employee_id","title","department","factory","area","due_date","status","result","checklist_result","findings","notes","started_at","completed_at","action_id","created_at","updated_at"]),
  safety_observations: new Set(["id","observation_no","observed_at","observer_employee_id","observation_type","category","department","factory","area","description","severity","status","immediate_action","photo_urls","action_id","created_by","created_at","updated_at","closed_at"]),
  equipment_assets: new Set(["id","asset_code","name","equipment_type","serial_number","manufacturer","model","department","factory","area","status","risk_rating","qr_code","certificate_number","certificate_expiry","last_inspection_date","next_inspection_date","last_maintenance_date","next_maintenance_date","operator_authorization_required","loto_required","notes","data","created_by","created_at","updated_at"]),
  equipment_service_records: new Set(["id","asset_id","service_type","performed_at","next_due","result","provider","technician","notes","attachment_url","created_by","created_at"]),
  equipment_defects: new Set(["id","defect_no","asset_id","description","severity","status","reported_at","reported_by_employee_id","action_id","resolved_at","resolution_notes","verified_by_user_id","verified_at","created_at","updated_at"]),
  equipment_operator_authorizations: new Set(["id","asset_id","employee_id","authorization_type","issue_date","expiry_date","status","certificate_ref","notes","created_by","created_at"]),
  contractors: new Set(["id","contractor_code","name","company_registration","scope_of_work","main_contact","email","phone","contract_start","contract_end","insurance_expiry","status","safety_score","notes","created_by","created_at","updated_at"]),
  contractor_workers: new Set(["id","contractor_id","worker_no","name","national_id","job_title","phone","induction_date","induction_expiry","medical_expiry","competency_expiry","status","access_allowed","block_reason","created_at","updated_at"]),
  contractor_documents: new Set(["id","contractor_id","worker_id","document_type","reference_no","issue_date","expiry_date","status","critical_for_access","file_url","notes","created_by","created_at","updated_at"]),
  contractor_scorecards: new Set(["id","contractor_id","month","year","inspections","violations","incidents","overdue_actions","training_compliance","score","rating","notes","created_at","updated_at"]),
  chemicals: new Set(["id","chemical_code","product_name","manufacturer","cas_numbers","hazard_classes","pictograms","storage_area","compatibility_group","quantity","unit","max_allowed_quantity","product_expiry_date","risk_rating","required_ppe","spill_response","first_aid","disposal_method","qr_code","status","notes","created_by","created_at","updated_at"]),
  chemical_sds: new Set(["id","chemical_id","revision_date","review_due_date","language","file_url","status","notes","uploaded_by","uploaded_at"]),
  chemical_inventory_transactions: new Set(["id","chemical_id","transaction_type","quantity","occurred_at","reference","notes","recorded_by"]),
  risk_register: new Set(["id","risk_no","title","hazard","activity","department","factory","area","owner_user_id","source_assessment_id","initial_likelihood","initial_severity","initial_score","initial_level","residual_likelihood","residual_severity","residual_score","residual_level","status","review_date","accepted_by","accepted_at","action_id","notes","created_by","created_at","updated_at"]),
  risk_controls: new Set(["id","risk_id","control_type","description","owner_employee_id","due_date","status","effectiveness","verified_at","verified_by","created_at","updated_at"]),
  site_floor_plans: new Set(["id","name","building","floor","image_url","width","height","active","created_by","created_at","updated_at"]),
  emergency_assembly_points: new Set(["id","point_code","name","building","area","capacity","map_x","map_y","status","created_at","updated_at"]),
  emergency_response_incidents: new Set(["id","response_no","source_type","source_id","title","severity","building","floor","area","status","alarm_started_at","evacuation_started_at","assembly_started_at","all_clear_at","primary_assembly_point_id","nearest_exit_ids","expected_count","accounted_count","missing_count","incident_id","action_id","created_at","updated_at"]),
  emergency_response_timeline: new Set(["id","response_id","event_type","message","occurred_at","recorded_by","data"]),
  emergency_muster_entries: new Set(["id","response_id","person_type","person_ref","person_name","department","assembly_point_id","status","accounted_at","notes"]),
  safety_map_points: new Set(["id","floor_plan_id","point_type","label","resource_type","resource_id","map_x","map_y","status","icon","details","created_by","created_at","updated_at"]),
  safety_qr_registry: new Set(["id","qr_code","resource_type","resource_id","label","route","status","metadata","created_at","updated_at"]),
  monthly_hse_reports: new Set(["id","report_no","month","year","status","snapshot","highlights","management_summary","next_month_plan","generated_by","generated_at","reviewed_by","reviewed_at","approved_by","approved_at","created_at","updated_at"]),
  hse_events: new Set(["id","event_type","source_type","source_id","severity","title","message","department","factory","area","occurred_at","data","created_by","created_at"]),
  notification_outbox: new Set(["id","event_id","channel","recipient","subject","body","payload","status","attempts","next_attempt_at","sent_at","last_error","created_by","created_at","updated_at"]),
};

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

function canWrite(profile: any, module: string, action: string) {
  if (!profile?.is_active) return false;
  if (module === "activity" && action === "create") return true;
  if (profile.role === "admin") return true;
  if (profile.role === "manager" && ["documents", "content", "settings", "reports", "employees"].includes(module)) return action !== "delete" || ["reports", "employees"].includes(module);
  if (profile.role === "editor" && ["content", "reports", "documents", "employees"].includes(module)) return action !== "delete";
  return false;
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

    const user = await getAuthUser(req);
    const profile = await getProfile(req);
    if (!user || !profile || !profile.is_active) return json(res, 401, { error: "Not authenticated" });
    if (resource === "hse-assistant") return await hseAssistantHandler(req,res,profile);
    if (resource === "safety-reporting-reveal") return await proxySafetyReporting(req, res, "reveal", true);

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
      let url = `${base}?select=*`;
      if (rawId) url += table === "section_config" ? `&section_type=eq.${encodeURIComponent(rawId)}` : `&id=eq.${encodeURIComponent(rawId)}`;
      if (table === "users") url = `${base}?select=id,name,email,role,is_active,avatar,joined_at,auth_user_id${rawId ? `&id=eq.${encodeURIComponent(rawId)}` : ""}`;
      if (table === "employees") url += "&order=name.asc";
      if (["fire_gateways","fire_panels","fire_devices","emergency_exits"].includes(table)) url += "&order=updated_at.desc";
      if (["fire_device_events","emergency_exit_events"].includes(table)) url += "&order=occurred_at.desc&limit=500";
      if (table === "hse_actions") url += "&order=created_at.desc";
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
    if (!canWrite(profile, config.module, action)) return json(res, 403, { error: "Insufficient permission" });

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
      if (table === "hse_events" || table === "notification_outbox") row.created_by = row.created_by || profile.id;
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
      const patch = sanitizeBody(table, body, "update");
      if (table === "documents" || table === "employees" || table === "hse_actions" || table === "notification_outbox" || ["ptw_permits","loto_isolations","inspection_templates","inspection_schedules","inspection_tasks","safety_observations","equipment_assets","equipment_defects","contractors","contractor_workers","contractor_documents","contractor_scorecards","chemicals","risk_register","risk_controls","site_floor_plans","safety_map_points","monthly_hse_reports","emergency_assembly_points","emergency_response_incidents","fire_gateways","fire_panels","fire_devices","emergency_exits"].includes(table) || GENERIC_TABLES.has(table) || table === "safety_reporting_channels") patch.updated_at = new Date().toISOString();
      const r = await supabaseFetchForRequest(req, url, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      const rows = await r.json();
      if (!r.ok) return json(res, r.status, { error: rows?.message || "Unable to update resource" });
      if (!Array.isArray(rows) || rows.length === 0) return json(res, 404, { error: "Resource not found or could not be updated" });
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

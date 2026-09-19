import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("package scripts include release gate", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(typeof pkg.scripts["release:gate"], "string");
  assert.match(pkg.scripts["release:gate"], /typecheck/);
  assert.match(pkg.scripts["release:gate"], /test/);
  assert.match(pkg.scripts["release:gate"], /build/);
});

test("critical HSE resource mappings remain registered", async () => {
  const source = await readFile(new URL("../api/_lib/resource-map.ts", import.meta.url), "utf8");
  for (const key of ["hse-actions", "ptw-permits", "fire-devices", "risk-register", "monthly-hse-reports", "hse-events", "notification-outbox"]) {
    assert.ok(source.includes(`"${key}"`), `missing resource ${key}`);
  }
});

test("security headers remain configured", async () => {
  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  assert.ok(vercel.includes("Content-Security-Policy"));
  assert.ok(vercel.includes("X-Frame-Options"));
  assert.ok(vercel.includes("X-Content-Type-Options"));
});


test("event notification migration keeps RLS and secure RPC", async () => {
  const source = await readFile(new URL("../supabase/migrations/20260919102000_hse_event_notification_foundation.sql", import.meta.url), "utf8");
  assert.ok(source.includes("alter table public.hse_events enable row level security"));
  assert.ok(source.includes("alter table public.notification_outbox enable row level security"));
  assert.ok(source.includes("security invoker"));
  assert.ok(source.includes("revoke all on function public.enqueue_hse_notification"));
});


test("live meetings stay behind unified API and server-enforced identity", async () => {
  const resources = await readFile(new URL("../api/_lib/resource-map.ts", import.meta.url), "utf8");
  for (const key of ["live-meetings", "live-meeting-participants", "live-meeting-messages"]) {
    assert.ok(resources.includes(`"${key}"`), `missing live meeting resource ${key}`);
  }

  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  assert.ok(api.includes('row.user_id = profile.id'));
  assert.ok(api.includes('meeting.created_by === profile.id ? "host" : "participant"'));
  assert.ok(api.includes("Only the meeting host or an administrator can update this meeting"));

  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  assert.ok(vercel.includes("/api/live-meetings"));
  assert.ok(vercel.includes("https://meet.jit.si"));
});


test("live meeting migration grants authenticated access through RLS", async () => {
  const source = await readFile(new URL("../supabase/migrations/20260919131500_live_meeting_foundation_and_rls.sql", import.meta.url), "utf8");
  assert.ok(source.includes("grant select, insert, update, delete on public.live_meetings to authenticated"));
  assert.ok(source.includes("live_meetings_select_active_users"));
  assert.ok(source.includes("live_meeting_participants_insert_self"));
  assert.ok(source.includes("live_meeting_messages_insert_self"));
  assert.ok(!source.includes("live_meetings_no_direct_client_access\non public.live_meetings\nfor all"));
});


test("live meeting attendance records leave time and prevents duplicate active joins", async () => {
  const page = await readFile(new URL("../src/pages/admin/live-meeting.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("activeParticipantId"));
  assert.ok(page.includes("/api/live-meeting-participants/"));
  assert.ok(page.includes("leaveMeeting"));

  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  assert.ok(api.includes("left_at=is.null&limit=1"));
  assert.ok(api.includes("Participants can only update their own attendance"));
  assert.ok(api.includes("Unable to record meeting leave"));

  const migration = await readFile(new URL("../supabase/migrations/20260919165000_live_meeting_attendance_integrity.sql", import.meta.url), "utf8");
  assert.ok(migration.includes("live_meeting_one_active_participant_idx"));
  assert.ok(migration.includes("where user_id is not null and left_at is null"));
});


test("unified authorization is enforced across UI and API", async () => {
  const dataApi = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const systemApi = await readFile(new URL("../api/system-health.ts", import.meta.url), "utf8");
  const authz = await readFile(new URL("../api/_lib/authorization.ts", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/components/layouts/admin-layout.tsx", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/lib/route-permissions.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20260919170500_unified_application_permissions.sql", import.meta.url), "utf8");

  assert.ok(dataApi.includes("hasAppPermission"));
  assert.ok(systemApi.includes("hasAppPermission"));
  assert.ok(authz.includes("/rest/v1/permissions?select=actions"));
  assert.ok(layout.includes("currentRouteAllowed"));
  assert.ok(layout.includes("canNavigate(item.href)"));
  assert.ok(routes.includes('"/admin/live-meeting"'));
  assert.ok(routes.includes('"/admin/users"'));
  assert.ok(migration.includes("permissions_select_own_role_or_manager"));
  assert.ok(migration.includes("on conflict (role,module)"));
});


test("enterprise audit and compliance modules are backed by normalized records", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260919174500_audit_compliance_enterprise.sql", import.meta.url), "utf8");
  const auditPage = await readFile(new URL("../src/pages/admin/audits.tsx", import.meta.url), "utf8");
  const compliancePage = await readFile(new URL("../src/pages/admin/compliance.tsx", import.meta.url), "utf8");
  assert.ok(migration.includes("public.audit_programs"));
  assert.ok(migration.includes("public.audit_findings"));
  assert.ok(migration.includes("public.legal_requirements"));
  assert.ok(migration.includes("public.compliance_evidence"));
  assert.ok(auditPage.includes("/api/audit-programs"));
  assert.ok(compliancePage.includes("/api/legal-requirements"));
});


test("bulk import is bounded, permission-checked and supports dry-run", async () => {
  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/admin/import-center.tsx", import.meta.url), "utf8");
  assert.ok(api.includes("BULK_IMPORT_RESOURCES"));
  assert.ok(api.includes("A single import is limited to 500 rows"));
  assert.ok(api.includes("dryRun === true"));
  assert.ok(page.includes("/api/bulk-import"));
});


test("secure live meeting invite tokens are server-hashed and hidden from authenticated reads", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260919181000_secure_live_meeting_v2.sql", import.meta.url), "utf8");
  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/admin/live-meeting.tsx", import.meta.url), "utf8");
  assert.ok(migration.includes("join_token_hash"));
  assert.ok(migration.includes("revoke select on public.live_meetings from authenticated"));
  assert.ok(api.includes("sha256Hex"));
  assert.ok(api.includes("Invalid or expired meeting invite"));
  assert.ok(page.includes("/api/live-meeting-invite"));
  assert.ok(page.includes("Secure invite"));
  assert.ok(!page.includes("navigator.clipboard.writeText(meetingUrl)"));
});


test("final platform upgrade keeps workflow, intelligence, mobile sync and real notification delivery", async () => {
  const workflowMigration = await readFile(new URL("../supabase/migrations/20260919173000_hse_workflow_engine_v1.sql", import.meta.url), "utf8");
  const intelligenceMigration = await readFile(new URL("../supabase/migrations/20260919182500_safety_intelligence_snapshot.sql", import.meta.url), "utf8");
  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const delivery = await readFile(new URL("../api/_lib/notification-delivery.ts", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../src/pages/admin/mobile-field.tsx", import.meta.url), "utf8");
  const queue = await readFile(new URL("../src/lib/offline-field-queue.ts", import.meta.url), "utf8");

  assert.ok(workflowMigration.includes("public.hse_workflows"));
  assert.ok(api.includes("ACTION_CREATED"));
  assert.ok(api.includes('relation: "corrective_action"'));

  assert.ok(intelligenceMigration.includes("hse_intelligence_snapshot"));
  assert.ok(api.includes('resource === "safety-intelligence"'));

  assert.ok(queue.includes("indexedDB.open"));
  assert.ok(mobile.includes('window.addEventListener("online"'));
  assert.ok(mobile.includes("/api/safety-observations"));

  assert.ok(delivery.includes("RESEND_API_KEY"));
  assert.ok(delivery.includes("WHATSAPP_ACCESS_TOKEN"));
  assert.ok(delivery.includes("TEAMS_WEBHOOK_URL"));
  assert.ok(api.includes('resource === "notification-delivery"'));
});


test("data API keeps its resource registry modular without adding Vercel functions", async () => {
  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const registry = await readFile(new URL("../api/_lib/resource-columns.ts", import.meta.url), "utf8");
  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");

  assert.ok(api.includes('from "./_lib/resource-columns.js"'));
  assert.ok(!api.includes("const COLUMNS: Record<string, Set<string>>"));
  assert.ok(registry.includes("export const COLUMNS"));
  assert.ok(registry.includes("export const BULK_IMPORT_RESOURCES"));
  assert.ok(vercel.includes('"destination": "/api/data?resource='));
});


test("Supabase advisor hardening revokes public trigger RPC access and covers new foreign keys", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260919150000_security_performance_advisor_hardening_v2.sql", import.meta.url), "utf8");
  assert.ok(migration.includes("revoke all on function public.materialize_in_app_notification() from public, anon, authenticated"));
  for (const indexName of [
    "audit_findings_action_id_idx",
    "audit_findings_created_by_idx",
    "audit_findings_owner_user_id_idx",
    "audit_findings_verified_by_idx",
    "audit_programs_created_by_idx",
    "audit_programs_lead_auditor_user_id_idx",
    "compliance_evidence_uploaded_by_idx",
    "hse_workflow_events_created_by_idx",
    "hse_workflow_links_created_by_idx",
    "hse_workflows_created_by_idx",
    "hse_workflows_owner_user_id_idx",
    "legal_requirements_action_id_idx",
    "legal_requirements_created_by_idx",
    "legal_requirements_owner_user_id_idx",
  ]) assert.ok(migration.includes(indexName), `missing index ${indexName}`);
});


test("notification outbox cron reuses unified API and requires CRON_SECRET", async () => {
  const api = await readFile(new URL("../api/data.ts", import.meta.url), "utf8");
  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  assert.ok(api.includes('resource === "notification-delivery-cron"'));
  assert.ok(api.includes("process.env.CRON_SECRET"));
  assert.ok(api.includes("Unauthorized cron request"));
  assert.ok(api.includes("processNotificationOutbox(50)"));
  assert.ok(vercel.includes('"path": "/api/notification-delivery-cron"'));
  assert.ok(vercel.includes('"schedule": "0 5 * * *"'));
  assert.ok(vercel.includes('"destination": "/api/data?resource=notification-delivery-cron"'));
});


test("reports page keeps export and localized labels in a feature helper", async () => {
  const page = await readFile(new URL("../src/pages/admin/reports.tsx", import.meta.url), "utf8");
  const helper = await readFile(new URL("../src/features/reports/safety-report-format.ts", import.meta.url), "utf8");
  assert.ok(page.includes('from "@/features/reports/safety-report-format"'));
  assert.ok(helper.includes("SAFETY_REPORT_EXPORT_COLUMNS"));
  assert.ok(helper.includes("safetyRiskLabel"));
  assert.ok(helper.includes("safetyStatusLabel"));
});

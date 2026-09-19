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

-- Production security hardening for Supabase.
-- Keep privileged reminder processing server-side only and make internal tables
-- explicitly inaccessible to browser roles.

revoke execute on function public.process_environmental_measurement_reminders()
from public, anon, authenticated;
grant execute on function public.process_environmental_measurement_reminders()
to service_role;

alter function public.match_ai_knowledge(extensions.vector, double precision, integer)
set search_path = public, extensions;

-- These tables are internal/server-side modules in the current application.
-- RLS remains enabled, browser grants are removed, and explicit deny policies
-- document the intended boundary while service_role remains available server-side.
revoke all privileges on table public.ai_agent_edges from anon, authenticated;
revoke all privileges on table public.ai_agent_nodes from anon, authenticated;
revoke all privileges on table public.ai_agent_workflow_steps from anon, authenticated;
revoke all privileges on table public.ai_agent_workflows from anon, authenticated;
revoke all privileges on table public.ai_knowledge_chunks from anon, authenticated;
revoke all privileges on table public.violation_templates from anon, authenticated;

alter table public.ai_agent_edges enable row level security;
alter table public.ai_agent_nodes enable row level security;
alter table public.ai_agent_workflow_steps enable row level security;
alter table public.ai_agent_workflows enable row level security;
alter table public.ai_knowledge_chunks enable row level security;
alter table public.violation_templates enable row level security;

drop policy if exists "deny_browser_access" on public.ai_agent_edges;
create policy "deny_browser_access" on public.ai_agent_edges
for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_browser_access" on public.ai_agent_nodes;
create policy "deny_browser_access" on public.ai_agent_nodes
for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_browser_access" on public.ai_agent_workflow_steps;
create policy "deny_browser_access" on public.ai_agent_workflow_steps
for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_browser_access" on public.ai_agent_workflows;
create policy "deny_browser_access" on public.ai_agent_workflows
for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_browser_access" on public.ai_knowledge_chunks;
create policy "deny_browser_access" on public.ai_knowledge_chunks
for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_browser_access" on public.violation_templates;
create policy "deny_browser_access" on public.violation_templates
for all to anon, authenticated using (false) with check (false);

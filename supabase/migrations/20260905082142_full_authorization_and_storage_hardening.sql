-- Full production authorization and storage hardening.
-- Applied to Supabase production as migration 20260905082142.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_app_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role::text = any(allowed_roles)
  )
$$;

revoke all on function private.has_app_role(text[]) from public, anon;
grant execute on function private.has_app_role(text[]) to authenticated, service_role;

revoke all privileges on table public.ai_agent_configs from anon, authenticated;
revoke all privileges on table public.ai_agent_runs from anon, authenticated;
revoke all privileges on table public.ai_agent_steps from anon, authenticated;
revoke all privileges on table public.ai_knowledge_documents from anon, authenticated;
revoke all privileges on table public.facility_regulatory_licenses from anon, authenticated;
revoke all privileges on table public.local_ai_runtime_config from anon, authenticated;

grant select, insert, update, delete on table public.ai_agent_configs to authenticated;
grant select, insert, update, delete on table public.ai_agent_runs to authenticated;
grant select, insert, update, delete on table public.ai_agent_steps to authenticated;
grant select, insert, update, delete on table public.ai_knowledge_documents to authenticated;
grant select, insert, update, delete on table public.facility_regulatory_licenses to authenticated;
grant select, insert, update, delete on table public.local_ai_runtime_config to authenticated;

drop policy if exists "ai_agent_configs_authenticated_select" on public.ai_agent_configs;
drop policy if exists "ai_agent_configs_authenticated_write" on public.ai_agent_configs;
create policy "ai_agent_configs_role_select" on public.ai_agent_configs for select to authenticated
using ((select private.has_app_role(array['admin','manager'])));
create policy "ai_agent_configs_role_insert" on public.ai_agent_configs for insert to authenticated
with check ((select private.has_app_role(array['admin','manager'])));
create policy "ai_agent_configs_role_update" on public.ai_agent_configs for update to authenticated
using ((select private.has_app_role(array['admin','manager'])))
with check ((select private.has_app_role(array['admin','manager'])));
create policy "ai_agent_configs_role_delete" on public.ai_agent_configs for delete to authenticated
using ((select private.has_app_role(array['admin'])));

drop policy if exists "ai_agent_runs_authenticated_all" on public.ai_agent_runs;
create policy "ai_agent_runs_role_select" on public.ai_agent_runs for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_runs_role_insert" on public.ai_agent_runs for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_runs_role_update" on public.ai_agent_runs for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_runs_role_delete" on public.ai_agent_runs for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

drop policy if exists "ai_agent_steps_authenticated_all" on public.ai_agent_steps;
create policy "ai_agent_steps_role_select" on public.ai_agent_steps for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_steps_role_insert" on public.ai_agent_steps for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_steps_role_update" on public.ai_agent_steps for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_agent_steps_role_delete" on public.ai_agent_steps for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

drop policy if exists "ai_knowledge_documents_authenticated_all" on public.ai_knowledge_documents;
create policy "ai_knowledge_documents_role_select" on public.ai_knowledge_documents for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_knowledge_documents_role_insert" on public.ai_knowledge_documents for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_knowledge_documents_role_update" on public.ai_knowledge_documents for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));
create policy "ai_knowledge_documents_role_delete" on public.ai_knowledge_documents for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

drop policy if exists "facility regulatory licenses authenticated read" on public.facility_regulatory_licenses;
drop policy if exists "facility regulatory licenses authenticated write" on public.facility_regulatory_licenses;
create policy "facility_licenses_role_select" on public.facility_regulatory_licenses for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer'])));
create policy "facility_licenses_role_insert" on public.facility_regulatory_licenses for insert to authenticated
with check ((select private.has_app_role(array['admin','manager'])));
create policy "facility_licenses_role_update" on public.facility_regulatory_licenses for update to authenticated
using ((select private.has_app_role(array['admin','manager'])))
with check ((select private.has_app_role(array['admin','manager'])));
create policy "facility_licenses_role_delete" on public.facility_regulatory_licenses for delete to authenticated
using ((select private.has_app_role(array['admin'])));

drop policy if exists "local_ai_runtime_admin_select" on public.local_ai_runtime_config;
drop policy if exists "local_ai_runtime_admin_write" on public.local_ai_runtime_config;
create policy "local_ai_runtime_role_select" on public.local_ai_runtime_config for select to authenticated
using ((select private.has_app_role(array['admin','manager'])));
create policy "local_ai_runtime_role_insert" on public.local_ai_runtime_config for insert to authenticated
with check ((select private.has_app_role(array['admin'])));
create policy "local_ai_runtime_role_update" on public.local_ai_runtime_config for update to authenticated
using ((select private.has_app_role(array['admin','manager'])))
with check ((select private.has_app_role(array['admin','manager'])));
create policy "local_ai_runtime_role_delete" on public.local_ai_runtime_config for delete to authenticated
using ((select private.has_app_role(array['admin'])));

update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg','image/png','image/webp','image/svg+xml',
      'text/plain','text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]::text[]
where id = 'board-uploads';

drop policy if exists "auth_delete_board_uploads" on storage.objects;
drop policy if exists "auth_update_board_uploads" on storage.objects;
drop policy if exists "auth_upload_board_uploads" on storage.objects;
drop policy if exists "public_read_board_uploads" on storage.objects;

create policy "board_uploads_authenticated_read" on storage.objects for select to authenticated
using (
  bucket_id = 'board-uploads'
  and (select private.has_app_role(array['admin','manager','editor','viewer']))
);
create policy "board_uploads_role_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'board-uploads'
  and (select private.has_app_role(array['admin','manager','editor']))
);
create policy "board_uploads_role_update" on storage.objects for update to authenticated
using (
  bucket_id = 'board-uploads'
  and (select private.has_app_role(array['admin','manager','editor']))
)
with check (
  bucket_id = 'board-uploads'
  and (select private.has_app_role(array['admin','manager','editor']))
);
create policy "board_uploads_admin_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'board-uploads'
  and (select private.has_app_role(array['admin']))
);

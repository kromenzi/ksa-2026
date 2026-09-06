create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  ref_no text unique,
  title text,
  status text not null default 'Under Investigation',
  department text,
  date text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incidents enable row level security;

revoke all on table public.incidents from anon;
grant select, insert, update, delete on table public.incidents to authenticated;
grant all on table public.incidents to service_role;

drop policy if exists "incidents_select_authenticated" on public.incidents;
create policy "incidents_select_authenticated"
on public.incidents
for select
to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));

drop policy if exists "incidents_insert_editor" on public.incidents;
create policy "incidents_insert_editor"
on public.incidents
for insert
to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));

drop policy if exists "incidents_update_editor" on public.incidents;
create policy "incidents_update_editor"
on public.incidents
for update
to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));

drop policy if exists "incidents_delete_manager" on public.incidents;
create policy "incidents_delete_manager"
on public.incidents
for delete
to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

create index if not exists idx_incidents_updated_at on public.incidents(updated_at desc);
create index if not exists idx_incidents_date on public.incidents(date desc);
create index if not exists idx_incidents_department on public.incidents(department);

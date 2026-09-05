create table if not exists public.escalation_matrix (
  id uuid primary key default gen_random_uuid(),
  ref_no text,
  title text,
  status text default 'active',
  department text,
  date text,
  data jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.escalation_matrix enable row level security;

drop policy if exists auth_select on public.escalation_matrix;
drop policy if exists escalation_matrix_insert_editor on public.escalation_matrix;
drop policy if exists escalation_matrix_update_editor on public.escalation_matrix;
drop policy if exists escalation_matrix_delete_manager on public.escalation_matrix;

create policy auth_select on public.escalation_matrix
for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer'])));

create policy escalation_matrix_insert_editor on public.escalation_matrix
for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));

create policy escalation_matrix_update_editor on public.escalation_matrix
for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));

create policy escalation_matrix_delete_manager on public.escalation_matrix
for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

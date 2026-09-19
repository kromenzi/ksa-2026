alter table public.employee_violations
  add column if not exists department text,
  add column if not exists occupation text,
  add column if not exists violation text,
  add column if not exists notes text,
  add column if not exists severity text default 'medium',
  add column if not exists escalation_id uuid references public.escalations(id) on delete set null,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_by uuid;

update public.employee_violations
set
  department = coalesce(department, data->>'department'),
  occupation = coalesce(occupation, position, data->>'occupation'),
  violation = coalesce(violation, violation_description),
  notes = coalesce(notes, data->>'notes'),
  severity = coalesce(severity, data->>'severity', 'medium')
where department is null
   or occupation is null
   or violation is null
   or notes is null
   or severity is null;

create index if not exists employee_violations_employee_id_idx
  on public.employee_violations(employee_id);
create index if not exists employee_violations_created_at_idx
  on public.employee_violations(created_at desc);
create index if not exists employee_violations_status_idx
  on public.employee_violations(status);
create index if not exists employee_violations_escalation_id_idx
  on public.employee_violations(escalation_id);

alter table public.employee_violations enable row level security;

drop policy if exists employee_violations_select_authenticated on public.employee_violations;
drop policy if exists employee_violations_insert_editor on public.employee_violations;
drop policy if exists employee_violations_update_editor on public.employee_violations;
drop policy if exists employee_violations_delete_manager on public.employee_violations;

create policy employee_violations_select_authenticated
on public.employee_violations
for select
to authenticated
using (true);

create policy employee_violations_insert_editor
on public.employee_violations
for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
);

create policy employee_violations_update_editor
on public.employee_violations
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
);

create policy employee_violations_delete_manager
on public.employee_violations
for delete
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text])
  )
);

grant select, insert, update, delete on public.employee_violations to authenticated;

-- The existing escalation API needs authenticated write policies for real administrative escalation.
drop policy if exists escalations_insert_editor on public.escalations;
drop policy if exists escalations_update_editor on public.escalations;
drop policy if exists escalations_delete_manager on public.escalations;

create policy escalations_insert_editor
on public.escalations
for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
);

create policy escalations_update_editor
on public.escalations
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text, 'editor'::text])
  )
);

create policy escalations_delete_manager
on public.escalations
for delete
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role = any (array['admin'::text, 'manager'::text])
  )
);

grant select, insert, update, delete on public.escalations to authenticated;

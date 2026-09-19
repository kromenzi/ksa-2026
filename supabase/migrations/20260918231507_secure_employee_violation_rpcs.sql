
revoke all on function public.refresh_employee_violation_count(uuid) from public,anon,authenticated;
revoke all on function public.sync_employee_violation_count() from public,anon,authenticated;

drop policy if exists deny_browser_access on public.violation_templates;
drop policy if exists violation_templates_select_authenticated on public.violation_templates;

create policy violation_templates_select_authenticated
on public.violation_templates
for select
to authenticated
using (
  active=true
  and (select private.has_app_role(array['admin','manager','editor','viewer']::text[]))
);

drop function if exists public.employee_directory(text);
create function public.employee_directory(p_employee_type text default null)
returns table (
  id uuid,
  name text,
  employee_id text,
  department text,
  title text,
  factory text,
  section text,
  supervisor text,
  email text,
  phone text,
  status text,
  employee_type text,
  hse_area text,
  shift text,
  user_id uuid,
  violations_count integer,
  incidents_count integer,
  ncr_count integer,
  trainings_completed integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,e.name,e.employee_id,e.department,e.title,e.factory,e.section,e.supervisor,
    e.email,e.phone,e.status,e.employee_type,e.hse_area,e.shift,e.user_id,
    e.violations_count,e.incidents_count,e.ncr_count,e.trainings_completed
  from public.employees e
  where (p_employee_type is null or e.employee_type=p_employee_type)
  order by e.name;
$$;

revoke all on function public.employee_directory(text) from public,anon;
grant execute on function public.employee_directory(text) to authenticated;

drop function if exists public.active_violation_templates();
create function public.active_violation_templates()
returns table (
  id uuid,
  name text,
  name_ar text,
  description text,
  fields jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id,v.name,v.name_ar,v.description,v.fields
  from public.violation_templates v
  where v.active=true
  order by v.name;
$$;

revoke all on function public.active_violation_templates() from public,anon;
grant execute on function public.active_violation_templates() to authenticated;

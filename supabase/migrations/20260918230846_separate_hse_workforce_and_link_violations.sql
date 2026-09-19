
alter table public.employees
  add column if not exists employee_type text not null default 'workforce',
  add column if not exists hse_area text,
  add column if not exists shift text,
  add column if not exists violations_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='employees_employee_type_check'
      and conrelid='public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_employee_type_check
      check (employee_type in ('hse','workforce'));
  end if;
end $$;

update public.employees
set employee_type='hse'
where employee_type='workforce'
  and (
    lower(coalesce(department,'')) in ('hse','safety','health safety environment')
    or lower(coalesce(title,'')) like '%hse%'
    or lower(coalesce(title,'')) like '%safety%'
    or lower(coalesce(name,'')) like '%safety%'
  );

alter table public.employee_violations
  add column if not exists employee_record_id uuid references public.employees(id) on delete set null,
  add column if not exists factory text,
  add column if not exists section text;

create index if not exists employee_violations_employee_record_idx
  on public.employee_violations(employee_record_id);

create index if not exists employees_employee_type_status_idx
  on public.employees(employee_type,status,name);

update public.employee_violations v
set employee_record_id=e.id
from public.employees e
where v.employee_record_id is null
  and nullif(trim(v.employee_id),'') is not null
  and e.employee_id=v.employee_id;

create or replace function public.autofill_employee_violation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  e public.employees%rowtype;
begin
  if new.employee_record_id is null then
    return new;
  end if;

  if tg_op='UPDATE'
     and new.employee_record_id is not distinct from old.employee_record_id then
    return new;
  end if;

  select * into e
  from public.employees
  where id=new.employee_record_id;

  if not found then
    raise exception 'Employee record not found';
  end if;

  if e.employee_type <> 'workforce' then
    raise exception 'Safety violations can only be assigned to workforce employees';
  end if;

  new.employee_name := e.name;
  new.employee_id := e.employee_id;
  new.department := e.department;
  new.occupation := e.title;
  new.position := e.title;
  new.factory := e.factory;
  new.section := e.section;
  new.supervisor_name := coalesce(new.supervisor_name,e.supervisor);
  new.data := coalesce(new.data,'{}'::jsonb) || jsonb_build_object(
    'employeeRecordId',e.id,
    'employeeType',e.employee_type,
    'factory',e.factory,
    'section',e.section,
    'supervisor',e.supervisor
  );
  return new;
end;
$$;

drop trigger if exists trg_employee_violation_autofill on public.employee_violations;
create trigger trg_employee_violation_autofill
before insert or update of employee_record_id on public.employee_violations
for each row execute function public.autofill_employee_violation();

create or replace function public.refresh_employee_violation_count(p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_employee_id is null then return; end if;
  update public.employees e
  set violations_count=(
    select count(*)::int
    from public.employee_violations v
    where v.employee_record_id=p_employee_id
  )
  where e.id=p_employee_id;
end;
$$;

create or replace function public.sync_employee_violation_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='DELETE' then
    perform public.refresh_employee_violation_count(old.employee_record_id);
    return old;
  elsif tg_op='UPDATE' then
    if old.employee_record_id is distinct from new.employee_record_id then
      perform public.refresh_employee_violation_count(old.employee_record_id);
    end if;
    perform public.refresh_employee_violation_count(new.employee_record_id);
    return new;
  else
    perform public.refresh_employee_violation_count(new.employee_record_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_employee_violation_count on public.employee_violations;
create trigger trg_employee_violation_count
after insert or delete or update of employee_record_id on public.employee_violations
for each row execute function public.sync_employee_violation_count();

update public.employees e
set violations_count=(
  select count(*)::int
  from public.employee_violations v
  where v.employee_record_id=e.id
);

drop function if exists public.monthly_hse_assignees();
create function public.monthly_hse_assignees()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean,
  user_id uuid,
  title text,
  employee_id text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.name,
    'hse'::text as role,
    (coalesce(e.status,'Active')='Active') as is_active,
    e.user_id,
    e.title,
    e.employee_id
  from public.employees e
  where e.employee_type='hse'
    and coalesce(e.status,'Active')='Active'
  order by e.name;
$$;

revoke all on function public.monthly_hse_assignees() from public,anon;
grant execute on function public.monthly_hse_assignees() to authenticated;

create or replace function public.employee_directory(p_employee_type text default null)
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
security definer
set search_path = ''
as $$
  select
    e.id,e.name,e.employee_id,e.department,e.title,e.factory,e.section,e.supervisor,
    e.email,e.phone,e.status,e.employee_type,e.hse_area,e.shift,e.user_id,
    e.violations_count,e.incidents_count,e.ncr_count,e.trainings_completed
  from public.employees e
  where private.has_app_role(array['admin','manager','editor','viewer']::text[])
    and (p_employee_type is null or e.employee_type=p_employee_type)
  order by e.name;
$$;

revoke all on function public.employee_directory(text) from public,anon;
grant execute on function public.employee_directory(text) to authenticated;

create or replace function public.active_violation_templates()
returns table (
  id uuid,
  name text,
  name_ar text,
  description text,
  fields jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,v.name,v.name_ar,v.description,v.fields
  from public.violation_templates v
  where v.active=true
    and private.has_app_role(array['admin','manager','editor','viewer']::text[])
  order by v.name;
$$;

revoke all on function public.active_violation_templates() from public,anon;
grant execute on function public.active_violation_templates() to authenticated;

insert into public.violation_templates(name,name_ar,description,fields,active)
select x.name,x.name_ar,x.description,x.fields,true
from (
  values
  ('PPE Violation','مخالفة معدات الوقاية الشخصية','Failure to wear or correctly use required personal protective equipment.',
    '{"severity":"medium","referenceTo":"PPE Policy","recommendedAction":"Immediate correction and safety coaching","hrInvestigation":false}'::jsonb),
  ('Unsafe Act','تصرف غير آمن','Employee performed an unsafe act or bypassed an established safe work practice.',
    '{"severity":"high","referenceTo":"Safe Work Procedure","recommendedAction":"Stop work, coach employee and investigate repeated behavior","hrInvestigation":false}'::jsonb),
  ('Unauthorized Area','دخول منطقة غير مصرح بها','Employee entered a restricted or controlled area without authorization.',
    '{"severity":"high","referenceTo":"Access Control Procedure","recommendedAction":"Remove from area and verify authorization requirements","hrInvestigation":false}'::jsonb),
  ('LOTO Violation','مخالفة العزل وتأمين الطاقة LOTO','Failure to comply with lockout/tagout or energy isolation requirements.',
    '{"severity":"critical","referenceTo":"LOTO Procedure","recommendedAction":"Stop work immediately, secure isolation and initiate investigation","hrInvestigation":true}'::jsonb),
  ('Forklift Safety Violation','مخالفة سلامة الرافعة الشوكية','Unsafe forklift operation, pedestrian interaction or authorization violation.',
    '{"severity":"high","referenceTo":"Forklift Safety Procedure","recommendedAction":"Stop operation and verify operator authorization/training","hrInvestigation":false}'::jsonb),
  ('Working at Height Violation','مخالفة العمل على ارتفاع','Failure to follow fall protection or working-at-height requirements.',
    '{"severity":"critical","referenceTo":"Working at Height Procedure","recommendedAction":"Stop work and correct fall protection before resuming","hrInvestigation":true}'::jsonb),
  ('Electrical Safety Violation','مخالفة السلامة الكهربائية','Unsafe electrical work or failure to comply with electrical safety controls.',
    '{"severity":"critical","referenceTo":"Electrical Safety / MV-LV Procedure","recommendedAction":"Stop work, isolate hazard and investigate","hrInvestigation":true}'::jsonb),
  ('Housekeeping Violation','مخالفة النظافة والترتيب','Poor housekeeping creating slip, trip, access or fire-load hazards.',
    '{"severity":"medium","referenceTo":"Housekeeping Standard","recommendedAction":"Correct condition and brief responsible employee","hrInvestigation":false}'::jsonb),
  ('Smoking Violation','مخالفة التدخين','Smoking outside designated areas or in a prohibited industrial area.',
    '{"severity":"high","referenceTo":"Smoking Policy","recommendedAction":"Stop activity and apply site disciplinary procedure","hrInvestigation":true}'::jsonb),
  ('Mobile Phone Violation','مخالفة استخدام الجوال','Unauthorized mobile phone use in a controlled or operational work area.',
    '{"severity":"medium","referenceTo":"Site Conduct Policy","recommendedAction":"Stop use and provide corrective instruction","hrInvestigation":false}'::jsonb)
) as x(name,name_ar,description,fields)
where not exists (
  select 1 from public.violation_templates v where lower(v.name)=lower(x.name)
);

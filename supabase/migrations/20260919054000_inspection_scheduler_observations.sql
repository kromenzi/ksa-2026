
create sequence if not exists public.safety_observation_seq start 1;

create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  description text,
  checklist jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_schedules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.inspection_templates(id) on delete cascade,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  factory text,
  area text,
  department text,
  frequency text not null default 'Weekly',
  day_of_week integer,
  day_of_month integer,
  next_run_date date not null default current_date,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_schedule_frequency_check check (frequency in ('Daily','Weekly','Monthly')),
  constraint inspection_schedule_dow_check check (day_of_week is null or day_of_week between 0 and 6),
  constraint inspection_schedule_dom_check check (day_of_month is null or day_of_month between 1 and 28)
);

create table if not exists public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.inspection_schedules(id) on delete set null,
  template_id uuid references public.inspection_templates(id) on delete set null,
  inspector_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  department text,
  factory text,
  area text,
  due_date date not null,
  status text not null default 'Planned',
  result text not null default 'Pending',
  checklist_result jsonb not null default '[]'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  action_id uuid references public.hse_actions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_task_status_check check (status in ('Planned','In Progress','Completed','Overdue','Cancelled')),
  constraint inspection_task_result_check check (result in ('Pending','Pass','Fail','Conditional'))
);

create table if not exists public.safety_observations (
  id uuid primary key default gen_random_uuid(),
  observation_no text not null unique default ('OBS-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.safety_observation_seq')::text,6,'0')),
  observed_at timestamptz not null default now(),
  observer_employee_id uuid references public.employees(id) on delete set null,
  observation_type text not null,
  category text not null default 'General',
  department text,
  factory text,
  area text,
  description text not null,
  severity text not null default 'Medium',
  status text not null default 'Open',
  immediate_action text,
  photo_urls jsonb not null default '[]'::jsonb,
  action_id uuid references public.hse_actions(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint safety_observation_type_check check (observation_type in ('Near Miss','Unsafe Act','Unsafe Condition','Positive Observation')),
  constraint safety_observation_severity_check check (severity in ('Low','Medium','High','Critical')),
  constraint safety_observation_status_check check (status in ('Open','Action Required','In Progress','Closed','Cancelled'))
);

create index if not exists idx_inspection_schedules_next on public.inspection_schedules(active,next_run_date);
create index if not exists idx_inspection_tasks_due on public.inspection_tasks(status,due_date);
create index if not exists idx_inspection_tasks_inspector on public.inspection_tasks(inspector_employee_id,status);
create index if not exists idx_observations_status_severity on public.safety_observations(status,severity);
create index if not exists idx_observations_location on public.safety_observations(factory,area,observed_at desc);

create or replace function public.touch_inspection_ops_updated_at()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['inspection_templates','inspection_schedules','inspection_tasks','safety_observations']
  loop
    execute format('drop trigger if exists trg_touch_%I on public.%I',t,t);
    execute format('create trigger trg_touch_%I before update on public.%I for each row execute function public.touch_inspection_ops_updated_at()',t,t);
  end loop;
end $$;

create or replace function private.generate_due_inspection_tasks()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare r record;
declare c integer:=0;
declare next_date date;
begin
  for r in
    select s.*,t.name,t.description
    from public.inspection_schedules s
    join public.inspection_templates t on t.id=s.template_id and t.active=true
    where s.active=true and s.next_run_date<=current_date
  loop
    if not exists(
      select 1 from public.inspection_tasks x
      where x.schedule_id=r.id and x.due_date=r.next_run_date
    ) then
      insert into public.inspection_tasks(
        schedule_id,template_id,inspector_employee_id,title,department,factory,area,due_date,status,result,notes
      ) values(
        r.id,r.template_id,r.assigned_employee_id,r.name,r.department,r.factory,r.area,r.next_run_date,'Planned','Pending',r.description
      );
      c:=c+1;
    end if;
    next_date:=case r.frequency
      when 'Daily' then r.next_run_date+1
      when 'Weekly' then r.next_run_date+7
      else (r.next_run_date+interval '1 month')::date
    end;
    update public.inspection_schedules set next_run_date=next_date,updated_at=now() where id=r.id;
  end loop;

  update public.inspection_tasks
  set status='Overdue',updated_at=now()
  where status in ('Planned','In Progress') and due_date<current_date;

  return c;
end;
$$;
revoke all on function private.generate_due_inspection_tasks() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='inspection_task_generator_daily' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('inspection_task_generator_daily','10 0 * * *','select private.generate_due_inspection_tasks();');
end $$;

create or replace function private.action_from_inspection_task()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare a uuid;
begin
  if new.result='Fail' and old.result is distinct from new.result then
    a:=private.create_hse_action_if_absent(
      'Inspection',new.id,
      'Failed inspection - '||new.title,
      coalesce(new.notes,'Inspection failed and requires corrective action'),
      'Inspection',
      'High',
      new.department,
      (new.due_date::timestamptz+interval '3 days'),
      null,
      jsonb_build_object('factory',new.factory,'area',new.area,'findings',new.findings)
    );
    new.action_id:=a;
  end if;
  if new.status='Completed' and new.completed_at is null then new.completed_at:=now(); end if;
  return new;
end;
$$;
revoke all on function private.action_from_inspection_task() from public,anon,authenticated;
drop trigger if exists trg_action_from_inspection_task on public.inspection_tasks;
create trigger trg_action_from_inspection_task
before update on public.inspection_tasks
for each row execute function private.action_from_inspection_task();

create or replace function private.action_from_safety_observation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare a uuid;
begin
  if new.status='Closed' and new.closed_at is null then new.closed_at:=now(); end if;
  if new.observation_type='Near Miss' or new.severity in ('High','Critical') then
    a:=private.create_hse_action_if_absent(
      'Observation',new.id,
      new.observation_type||' - '||coalesce(new.area,new.department,'HSE'),
      new.description,
      'Observation',
      new.severity,
      new.department,
      null,
      new.created_by,
      jsonb_build_object('factory',new.factory,'area',new.area,'observationNo',new.observation_no)
    );
    new.action_id:=coalesce(new.action_id,a);
    if new.status='Open' then new.status:='Action Required'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.action_from_safety_observation() from public,anon,authenticated;
drop trigger if exists trg_action_from_safety_observation on public.safety_observations;
create trigger trg_action_from_safety_observation
before insert or update of severity,status,description on public.safety_observations
for each row execute function private.action_from_safety_observation();

do $$
declare t text;
begin
  foreach t in array array['inspection_templates','inspection_schedules','inspection_tasks','safety_observations']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I_select on public.%I',t,t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'',''viewer'']::text[])))',
      t,t
    );
    execute format('drop policy if exists %I_write on public.%I',t,t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',
      t,t
    );
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

insert into public.inspection_templates(name,category,description,checklist,active)
select x.name,x.category,x.description,x.checklist,true
from (
  values
  ('Daily Workplace Safety Inspection','Workplace','Daily housekeeping, access, PPE and unsafe-condition check',
   '[{"item":"Housekeeping clear","required":true},{"item":"Walkways unobstructed","required":true},{"item":"PPE compliance","required":true},{"item":"No unsafe electrical conditions","required":true}]'::jsonb),
  ('Weekly Fire Safety Inspection','Fire Safety','Weekly fire protection and emergency-exit inspection',
   '[{"item":"Extinguishers accessible","required":true},{"item":"Fire exits clear","required":true},{"item":"Exit signs operational","required":true},{"item":"Fire panel normal","required":true}]'::jsonb),
  ('Monthly Equipment Safety Inspection','Equipment','Monthly crane, forklift and machine safety inspection',
   '[{"item":"Inspection records current","required":true},{"item":"No critical defects","required":true},{"item":"Guards and safety devices operational","required":true}]'::jsonb)
) as x(name,category,description,checklist)
where not exists(select 1 from public.inspection_templates t where t.name=x.name);

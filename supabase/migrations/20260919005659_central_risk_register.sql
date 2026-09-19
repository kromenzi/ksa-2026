
create sequence if not exists public.risk_register_seq start 1;

create table if not exists public.risk_register (
  id uuid primary key default gen_random_uuid(),
  risk_no text not null unique default ('RISK-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.risk_register_seq')::text,5,'0')),
  title text not null,
  hazard text not null,
  activity text,
  department text,
  factory text,
  area text,
  owner_user_id uuid references public.users(id) on delete set null,
  source_assessment_id text references public.risk_assessments(id) on delete set null,
  initial_likelihood integer not null default 1,
  initial_severity integer not null default 1,
  initial_score integer not null default 1,
  initial_level text not null default 'Low',
  residual_likelihood integer not null default 1,
  residual_severity integer not null default 1,
  residual_score integer not null default 1,
  residual_level text not null default 'Low',
  status text not null default 'Open',
  review_date date,
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  action_id uuid references public.hse_actions(id) on delete set null,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_register_likelihood_check check (initial_likelihood between 1 and 5 and residual_likelihood between 1 and 5),
  constraint risk_register_severity_check check (initial_severity between 1 and 5 and residual_severity between 1 and 5),
  constraint risk_register_status_check check (status in ('Open','Treatment','Monitoring','Accepted','Closed'))
);

create table if not exists public.risk_controls (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references public.risk_register(id) on delete cascade,
  control_type text not null default 'Administrative',
  description text not null,
  owner_employee_id uuid references public.employees(id) on delete set null,
  due_date date,
  status text not null default 'Planned',
  effectiveness text not null default 'Not Reviewed',
  verified_at timestamptz,
  verified_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_control_type_check check (control_type in ('Elimination','Substitution','Engineering','Administrative','PPE')),
  constraint risk_control_status_check check (status in ('Planned','In Progress','Implemented','Verified','Cancelled')),
  constraint risk_control_effectiveness_check check (effectiveness in ('Not Reviewed','Effective','Partially Effective','Ineffective'))
);

create index if not exists idx_risk_register_level_status on public.risk_register(residual_level,status);
create index if not exists idx_risk_register_review on public.risk_register(status,review_date);
create index if not exists idx_risk_register_location on public.risk_register(factory,department,area);
create index if not exists idx_risk_controls_risk on public.risk_controls(risk_id,status,due_date);

create or replace function private.risk_level_from_score(p_score integer)
returns text language sql immutable security invoker set search_path=''
as $$
  select case
    when p_score>=20 then 'Critical'
    when p_score>=12 then 'High'
    when p_score>=6 then 'Medium'
    else 'Low'
  end;
$$;
revoke all on function private.risk_level_from_score(integer) from public,anon,authenticated;

create or replace function private.compute_risk_register()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare a uuid;
begin
  new.initial_score:=new.initial_likelihood*new.initial_severity;
  new.residual_score:=new.residual_likelihood*new.residual_severity;
  new.initial_level:=private.risk_level_from_score(new.initial_score);
  new.residual_level:=private.risk_level_from_score(new.residual_score);
  new.updated_at:=now();

  if new.status not in ('Accepted','Closed') and new.residual_level in ('High','Critical') then
    a:=private.create_hse_action_if_absent(
      'Risk Register',new.id,
      'Treat '||new.residual_level||' risk - '||new.title,
      new.hazard,
      'Risk Management',
      new.residual_level,
      new.department,
      case when new.review_date is not null then new.review_date::timestamptz else null end,
      new.created_by,
      jsonb_build_object('riskNo',new.risk_no,'factory',new.factory,'area',new.area,'residualScore',new.residual_score)
    );
    new.action_id:=coalesce(new.action_id,a);
  end if;
  return new;
end;
$$;
revoke all on function private.compute_risk_register() from public,anon,authenticated;

drop trigger if exists trg_compute_risk_register on public.risk_register;
create trigger trg_compute_risk_register
before insert or update on public.risk_register
for each row execute function private.compute_risk_register();

create or replace function public.touch_risk_control()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;
drop trigger if exists trg_touch_risk_control on public.risk_controls;
create trigger trg_touch_risk_control before update on public.risk_controls
for each row execute function public.touch_risk_control();

create or replace function private.monitor_risk_reviews()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare r record;
declare c integer:=0;
begin
  for r in select * from public.risk_register where status not in ('Closed') and review_date is not null and review_date<current_date loop
    perform private.create_hse_action_if_absent(
      'Risk Review',r.id,
      'Overdue risk review - '||r.risk_no,
      r.title,
      'Risk Management',
      case when r.residual_level in ('Critical','High') then r.residual_level else 'Medium' end,
      r.department,
      now()+interval '3 days',
      r.created_by,
      jsonb_build_object('riskNo',r.risk_no,'reviewDate',r.review_date)
    );
    c:=c+1;
  end loop;
  return c;
end;
$$;
revoke all on function private.monitor_risk_reviews() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='risk_review_monitor_daily' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('risk_review_monitor_daily','15 1 * * *','select private.monitor_risk_reviews();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['risk_register','risk_controls']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I_select on public.%I',t,t);
    execute format('create policy %I_select on public.%I for select to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'',''viewer'']::text[])))',t,t);
    execute format('drop policy if exists %I_write on public.%I',t,t);
    execute format('create policy %I_write on public.%I for all to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',t,t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

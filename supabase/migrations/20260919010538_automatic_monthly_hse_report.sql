
create table if not exists public.monthly_hse_reports (
  id uuid primary key default gen_random_uuid(),
  report_no text not null unique,
  month integer not null,
  year integer not null,
  status text not null default 'Generated',
  snapshot jsonb not null default '{}'::jsonb,
  highlights text,
  management_summary text,
  next_month_plan text,
  generated_by uuid references public.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_hse_report_month_check check(month between 1 and 12),
  constraint monthly_hse_report_status_check check(status in ('Generated','Draft Review','Reviewed','Approved','Archived')),
  unique(month,year)
);

create index if not exists idx_monthly_hse_reports_period on public.monthly_hse_reports(year desc,month desc);

create or replace function private.build_monthly_hse_snapshot(p_month integer,p_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  start_ts timestamptz;
  end_ts timestamptz;
  snapshot_result jsonb;
begin
  if p_month<1 or p_month>12 or p_year<2020 or p_year>2100 then
    raise exception 'Invalid report period';
  end if;
  start_ts:=make_timestamptz(p_year,p_month,1,0,0,0,'Asia/Riyadh');
  end_ts:=start_ts+interval '1 month';

  snapshot_result:=jsonb_build_object(
    'period',jsonb_build_object('month',p_month,'year',p_year,'start',start_ts,'end',end_ts),
    'actions',jsonb_build_object(
      'created',(select count(*) from public.hse_actions where created_at>=start_ts and created_at<end_ts),
      'closed',(select count(*) from public.hse_actions where closed_at>=start_ts and closed_at<end_ts),
      'critical',(select count(*) from public.hse_actions where created_at>=start_ts and created_at<end_ts and priority='Critical'),
      'overdue',(select count(*) from public.hse_actions where due_at<end_ts and due_at is not null and status not in ('Completed','Closed','Cancelled'))
    ),
    'incidents',(select count(*) from public.incidents where created_at>=start_ts and created_at<end_ts),
    'ncr',(select count(*) from public.ncr where created_at>=start_ts and created_at<end_ts),
    'violations',(select count(*) from public.employee_violations where created_at>=start_ts and created_at<end_ts),
    'observations',jsonb_build_object(
      'total',(select count(*) from public.safety_observations where observed_at>=start_ts and observed_at<end_ts),
      'nearMiss',(select count(*) from public.safety_observations where observed_at>=start_ts and observed_at<end_ts and observation_type='Near Miss'),
      'positive',(select count(*) from public.safety_observations where observed_at>=start_ts and observed_at<end_ts and observation_type='Positive Observation')
    ),
    'inspections',jsonb_build_object(
      'completed',(select count(*) from public.inspection_tasks where completed_at>=start_ts and completed_at<end_ts),
      'failed',(select count(*) from public.inspection_tasks where completed_at>=start_ts and completed_at<end_ts and result='Fail')
    ),
    'ptw',jsonb_build_object(
      'issued',(select count(*) from public.ptw_permits where created_at>=start_ts and created_at<end_ts),
      'closed',(select count(*) from public.ptw_permits where closed_at>=start_ts and closed_at<end_ts),
      'expired',(select count(*) from public.ptw_permits where status='Expired' and updated_at>=start_ts and updated_at<end_ts)
    ),
    'equipment',jsonb_build_object(
      'defects',(select count(*) from public.equipment_defects where reported_at>=start_ts and reported_at<end_ts),
      'criticalDefects',(select count(*) from public.equipment_defects where reported_at>=start_ts and reported_at<end_ts and severity='Critical')
    ),
    'fireEmergency',jsonb_build_object(
      'fireEvents',(select count(*) from public.fire_device_events where occurred_at>=start_ts and occurred_at<end_ts),
      'fireAlarms',(select count(*) from public.fire_device_events where occurred_at>=start_ts and occurred_at<end_ts and event_type='alarm'),
      'exitEvents',(select count(*) from public.emergency_exit_events where occurred_at>=start_ts and occurred_at<end_ts),
      'responses',(select count(*) from public.emergency_response_incidents where alarm_started_at>=start_ts and alarm_started_at<end_ts)
    ),
    'training',(select count(*) from public.trainings where created_at>=start_ts and created_at<end_ts),
    'risk',jsonb_build_object(
      'high',(select count(*) from public.risk_register where residual_level='High' and status<>'Closed'),
      'critical',(select count(*) from public.risk_register where residual_level='Critical' and status<>'Closed')
    ),
    'contractors',jsonb_build_object(
      'total',(select count(*) from public.contractors),
      'blocked',(select count(*) from public.contractors where status in ('Blocked','Suspended','Expired'))
    ),
    'chemicals',jsonb_build_object(
      'total',(select count(*) from public.chemicals where status<>'Disposed'),
      'issues',(select count(*) from public.chemicals where status in ('Expired','Restricted') or (max_allowed_quantity is not null and quantity>max_allowed_quantity))
    )
  );
  return snapshot_result;
end;
$;
revoke all on function private.build_monthly_hse_snapshot(integer,integer) from public,anon,authenticated;

create or replace function public.generate_monthly_hse_report(p_month integer,p_year integer)
returns public.monthly_hse_reports
language plpgsql
security definer
set search_path=''
as $$
declare
  actor uuid;
  result public.monthly_hse_reports;
  snap jsonb;
begin
  if not private.has_app_role(array['admin','manager','editor']::text[]) then
    raise exception 'Insufficient permission';
  end if;
  actor:=private.current_app_user_id();
  snap:=private.build_monthly_hse_snapshot(p_month,p_year);

  insert into public.monthly_hse_reports(report_no,month,year,status,snapshot,generated_by,generated_at)
  values('HSE-MR-'||p_year||'-'||lpad(p_month::text,2,'0'),p_month,p_year,'Generated',snap,actor,now())
  on conflict(month,year)
  do update set snapshot=excluded.snapshot,generated_by=actor,generated_at=now(),updated_at=now()
  returning * into result;
  return result;
end;
$$;
revoke all on function public.generate_monthly_hse_report(integer,integer) from public,anon;
grant execute on function public.generate_monthly_hse_report(integer,integer) to authenticated;

create or replace function private.generate_previous_month_hse_report()
returns void
language plpgsql
security definer
set search_path=''
as $$
declare d date:=(current_date-date '2000-01-01')::integer * interval '1 day' + date '2000-01-01';
declare prev date;
declare snap jsonb;
begin
  prev:=(date_trunc('month',current_date)-interval '1 month')::date;
  snap:=private.build_monthly_hse_snapshot(extract(month from prev)::integer,extract(year from prev)::integer);
  insert into public.monthly_hse_reports(report_no,month,year,status,snapshot,generated_at)
  values(
    'HSE-MR-'||extract(year from prev)::integer||'-'||lpad(extract(month from prev)::integer::text,2,'0'),
    extract(month from prev)::integer,extract(year from prev)::integer,'Generated',snap,now()
  )
  on conflict(month,year)
  do update set snapshot=excluded.snapshot,generated_at=now(),updated_at=now();
end;
$$;
revoke all on function private.generate_previous_month_hse_report() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='monthly_hse_report_auto_generate' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('monthly_hse_report_auto_generate','0 2 1 * *','select private.generate_previous_month_hse_report();');
end $$;

create or replace function public.touch_monthly_hse_report()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;
drop trigger if exists trg_touch_monthly_hse_report on public.monthly_hse_reports;
create trigger trg_touch_monthly_hse_report before update on public.monthly_hse_reports
for each row execute function public.touch_monthly_hse_report();

alter table public.monthly_hse_reports enable row level security;
drop policy if exists monthly_hse_reports_select on public.monthly_hse_reports;
create policy monthly_hse_reports_select on public.monthly_hse_reports for select to authenticated using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
drop policy if exists monthly_hse_reports_write on public.monthly_hse_reports;
create policy monthly_hse_reports_write on public.monthly_hse_reports for all to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
grant select,insert,update,delete on public.monthly_hse_reports to authenticated;
grant all on public.monthly_hse_reports to service_role;

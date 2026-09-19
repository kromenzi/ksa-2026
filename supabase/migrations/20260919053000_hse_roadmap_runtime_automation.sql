
create or replace function public.run_hse_automation(
  p_job text,
  p_month integer default null,
  p_year integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
  report_row public.monthly_hse_reports;
begin
  if (select auth.uid()) is null
     or not private.has_app_role(array['admin','manager']::text[]) then
    raise exception 'Insufficient permission';
  end if;

  case lower(trim(p_job))
    when 'escalations' then
      affected := private.evaluate_hse_action_escalations();
      return jsonb_build_object('job','escalations','affected',affected);
    when 'inspections' then
      affected := private.generate_due_inspection_tasks();
      return jsonb_build_object('job','inspections','affected',affected);
    when 'contractors' then
      affected := private.evaluate_contractor_compliance();
      return jsonb_build_object('job','contractors','affected',affected);
    when 'ptw-expiry' then
      affected := private.expire_ptw_and_create_actions();
      return jsonb_build_object('job','ptw-expiry','affected',affected);
    when 'risk-reviews' then
      affected := private.monitor_risk_reviews();
      return jsonb_build_object('job','risk-reviews','affected',affected);
    when 'monthly-report' then
      if p_month is null or p_year is null or p_month not between 1 and 12 or p_year < 2020 then
        raise exception 'Valid month and year are required';
      end if;
      report_row := public.generate_monthly_hse_report(p_month,p_year);
      return jsonb_build_object(
        'job','monthly-report',
        'reportId',report_row.id,
        'reportNo',report_row.report_no,
        'month',report_row.month,
        'year',report_row.year,
        'status',report_row.status
      );
    else
      raise exception 'Unknown HSE automation job: %',p_job;
  end case;
end;
$$;

revoke all on function public.run_hse_automation(text,integer,integer) from public,anon;
grant execute on function public.run_hse_automation(text,integer,integer) to authenticated;

create or replace function public.hse_executive_snapshot(
  p_month integer default extract(month from now())::integer,
  p_year integer default extract(year from now())::integer
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'actions', jsonb_build_object(
      'total', (select count(*) from public.hse_actions),
      'open', (select count(*) from public.hse_actions where status not in ('Completed','Closed','Cancelled')),
      'overdue', (select count(*) from public.hse_actions where status not in ('Completed','Closed','Cancelled') and due_at < now()),
      'critical', (select count(*) from public.hse_actions where priority='Critical' and status not in ('Completed','Closed','Cancelled'))
    ),
    'ptw', jsonb_build_object(
      'active', (select count(*) from public.ptw_permits where status='Active'),
      'expiring', (select count(*) from public.ptw_permits where status='Active' and expires_at <= now()+interval '24 hours')
    ),
    'inspections', jsonb_build_object(
      'open', (select count(*) from public.inspection_tasks where status not in ('Completed','Cancelled')),
      'overdue', (select count(*) from public.inspection_tasks where status not in ('Completed','Cancelled') and due_date < current_date)
    ),
    'observations', jsonb_build_object(
      'open', (select count(*) from public.safety_observations where status not in ('Closed','Cancelled')),
      'critical', (select count(*) from public.safety_observations where severity='Critical' and status not in ('Closed','Cancelled'))
    ),
    'equipment', jsonb_build_object(
      'assets', (select count(*) from public.equipment_assets),
      'openDefects', (select count(*) from public.equipment_defects where status not in ('Closed','Resolved')),
      'certificatesDue', (select count(*) from public.equipment_assets where certificate_expiry is not null and certificate_expiry <= current_date+30)
    ),
    'contractors', jsonb_build_object(
      'active', (select count(*) from public.contractors where status in ('Approved','Conditional','Active')),
      'blockedWorkers', (select count(*) from public.contractor_workers where access_allowed=false and status='Active')
    ),
    'chemicals', jsonb_build_object(
      'active', (select count(*) from public.chemicals where status='Active'),
      'highRisk', (select count(*) from public.chemicals where risk_rating in ('High','Critical') and status='Active'),
      'expiring', (select count(*) from public.chemicals where product_expiry_date is not null and product_expiry_date <= current_date+30 and status='Active')
    ),
    'risks', jsonb_build_object(
      'open', (select count(*) from public.risk_register where status not in ('Closed','Accepted')),
      'high', (select count(*) from public.risk_register where residual_level in ('High','Extreme','Critical') and status not in ('Closed','Accepted'))
    ),
    'fireEmergency', jsonb_build_object(
      'activeAlarms', (select count(*) from public.fire_device_events where event_type='alarm' and status='open'),
      'criticalExits', (select count(*) from public.emergency_exits where status in ('blocked','locked','fault','offline') or obstruction_status='blocked')
    ),
    'month',p_month,
    'year',p_year,
    'generatedAt',now()
  );
$$;

revoke all on function public.hse_executive_snapshot(integer,integer) from public,anon;
grant execute on function public.hse_executive_snapshot(integer,integer) to authenticated;

create or replace function public.hse_data_assistant(p_question text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  q text := lower(coalesce(p_question,''));
  snapshot jsonb;
  answer text;
  intent text := 'summary';
begin
  snapshot := public.hse_executive_snapshot();

  if q ~ '(overdue|متأخر|متأخرة|تأخير)' then
    intent := 'overdue';
    answer := format(
      'Overdue CAPA/actions: %s. Overdue inspections: %s. Review these first.',
      snapshot #>> '{actions,overdue}',
      snapshot #>> '{inspections,overdue}'
    );
  elsif q ~ '(permit|ptw|تصريح)' then
    intent := 'ptw';
    answer := format(
      'Active permits: %s. Permits expiring within 24 hours: %s.',
      snapshot #>> '{ptw,active}',
      snapshot #>> '{ptw,expiring}'
    );
  elsif q ~ '(equipment|معدات|رافعة|forklift|crane)' then
    intent := 'equipment';
    answer := format(
      'Registered equipment: %s. Open defects: %s. Certificates due within 30 days: %s.',
      snapshot #>> '{equipment,assets}',
      snapshot #>> '{equipment,openDefects}',
      snapshot #>> '{equipment,certificatesDue}'
    );
  elsif q ~ '(chemical|sds|مادة|مواد كيميائية)' then
    intent := 'chemicals';
    answer := format(
      'Active chemicals: %s. High-risk chemicals: %s. Products expiring within 30 days: %s.',
      snapshot #>> '{chemicals,active}',
      snapshot #>> '{chemicals,highRisk}',
      snapshot #>> '{chemicals,expiring}'
    );
  elsif q ~ '(risk|مخاطر|خطر)' then
    intent := 'risks';
    answer := format(
      'Open risks: %s. High residual risks: %s.',
      snapshot #>> '{risks,open}',
      snapshot #>> '{risks,high}'
    );
  elsif q ~ '(fire|alarm|exit|حريق|إنذار|مخرج)' then
    intent := 'fire-emergency';
    answer := format(
      'Active fire alarms: %s. Critical emergency exits: %s.',
      snapshot #>> '{fireEmergency,activeAlarms}',
      snapshot #>> '{fireEmergency,criticalExits}'
    );
  elsif q ~ '(contractor|مقاول)' then
    intent := 'contractors';
    answer := format(
      'Active/conditional contractors: %s. Blocked active workers: %s.',
      snapshot #>> '{contractors,active}',
      snapshot #>> '{contractors,blockedWorkers}'
    );
  else
    answer := format(
      'Open actions: %s, overdue actions: %s, active PTW: %s, open equipment defects: %s, high residual risks: %s, active fire alarms: %s.',
      snapshot #>> '{actions,open}',
      snapshot #>> '{actions,overdue}',
      snapshot #>> '{ptw,active}',
      snapshot #>> '{equipment,openDefects}',
      snapshot #>> '{risks,high}',
      snapshot #>> '{fireEmergency,activeAlarms}'
    );
  end if;

  return jsonb_build_object('intent',intent,'answer',answer,'snapshot',snapshot);
end;
$$;

revoke all on function public.hse_data_assistant(text) from public,anon;
grant execute on function public.hse_data_assistant(text) to authenticated;

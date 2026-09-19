
create or replace function private.run_hse_automation_job(
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

revoke all on function private.run_hse_automation_job(text,integer,integer) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.run_hse_automation_job(text,integer,integer) to authenticated;

create or replace function public.run_hse_automation(
  p_job text,
  p_month integer default null,
  p_year integer default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.run_hse_automation_job(p_job,p_month,p_year);
$$;

revoke all on function public.run_hse_automation(text,integer,integer) from public,anon;
grant execute on function public.run_hse_automation(text,integer,integer) to authenticated;

revoke all on function public.generate_monthly_hse_report(integer,integer) from public,anon,authenticated;
grant execute on function public.generate_monthly_hse_report(integer,integer) to postgres,service_role;

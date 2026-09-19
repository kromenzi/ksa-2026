create or replace function private.build_monthly_hse_snapshot(p_month integer, p_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
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
$$;

revoke all on function private.build_monthly_hse_snapshot(integer,integer) from public,anon,authenticated;
grant execute on function private.build_monthly_hse_snapshot(integer,integer) to postgres,service_role;

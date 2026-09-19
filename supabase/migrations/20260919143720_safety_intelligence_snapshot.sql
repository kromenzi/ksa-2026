-- Deterministic Safety Intelligence snapshot from live HSE records.
create or replace function public.hse_intelligence_snapshot()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'metrics', jsonb_build_object(
      'openObservations', (select count(*) from safety_observations where status <> 'Closed'),
      'highCriticalObservations', (select count(*) from safety_observations where status <> 'Closed' and severity in ('High','Critical')),
      'incidents30d', (select count(*) from incidents where coalesce(date::date,created_at::date) >= current_date - 30),
      'overdueActions', (select count(*) from hse_actions where status <> 'Closed' and due_at is not null and due_at < now()),
      'openHighRisks', (select count(*) from risk_register where status <> 'Closed' and (residual_score >= 15 or residual_level in ('High','Critical'))),
      'overdueInspections', (select count(*) from inspection_tasks where status not in ('Completed','Closed') and due_date < current_date),
      'openEquipmentDefects', (select count(*) from equipment_defects where status <> 'Closed'),
      'fireFaults', (select count(*) from fire_devices where status in ('Fault','Alarm','Offline')),
      'actionsClosed30d', (select count(*) from hse_actions where closed_at >= now() - interval '30 days')
    ),
    'rootCauses', coalesce((
      select jsonb_agg(jsonb_build_object('rootCause',root_cause,'count',cnt) order by cnt desc)
      from (
        select coalesce(nullif(trim(data->>'rootCause'),''),'Unspecified') root_cause, count(*) cnt
        from incidents
        group by 1
        order by cnt desc
        limit 5
      ) s
    ), '[]'::jsonb),
    'observationCategories', coalesce((
      select jsonb_agg(jsonb_build_object('category',category_name,'count',cnt) order by cnt desc)
      from (
        select coalesce(nullif(trim(category),''),'Unspecified') category_name, count(*) cnt
        from safety_observations
        where observed_at >= now() - interval '90 days'
        group by 1
        order by cnt desc
        limit 5
      ) s
    ), '[]'::jsonb),
    'departmentExposure', coalesce((
      select jsonb_agg(jsonb_build_object('department',department_name,'count',cnt) order by cnt desc)
      from (
        select coalesce(nullif(trim(department),''),'Unspecified') department_name, count(*) cnt
        from safety_observations
        where status <> 'Closed'
        group by 1
        order by cnt desc
        limit 5
      ) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.hse_intelligence_snapshot() from public, anon;
grant execute on function public.hse_intelligence_snapshot() to authenticated;

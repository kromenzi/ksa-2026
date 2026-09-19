create or replace function public.emit_hse_event_from_safety_report()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_id uuid;
  v_severity text;
begin
  v_severity := case
    when coalesce((new.data->>'immediateLifeThreat')::boolean, false) then 'critical'
    when lower(coalesce(new.data->>'severity','')) = 'critical' then 'critical'
    when lower(coalesce(new.data->>'severity','')) = 'high' then 'high'
    when lower(coalesce(new.data->>'severity','')) = 'medium' then 'warning'
    else 'info'
  end;

  insert into public.hse_events(event_type, source_type, source_id, severity, title, message, department, occurred_at, data)
  values (
    'safety_report_created',
    'safety_reporting_case',
    new.id,
    v_severity,
    coalesce(nullif(new.title,''), 'Safety report received'),
    left(coalesce(new.data->>'description',''), 4000),
    new.department,
    coalesce(new.created_at, now()),
    jsonb_build_object('refNo',new.ref_no,'status',new.status,'category',new.data->>'category','location',new.data->>'location')
  )
  returning id into v_event_id;

  insert into public.notification_outbox(event_id, channel, subject, body, payload)
  values (
    v_event_id,
    'in_app',
    'Safety report ' || coalesce(new.ref_no,''),
    coalesce(new.title,'Safety report received'),
    jsonb_build_object('sourceType','safety_reporting_case','sourceId',new.id,'refNo',new.ref_no)
  );

  return new;
end;
$$;

drop trigger if exists trg_safety_report_hse_event on public.safety_reporting_cases;
create trigger trg_safety_report_hse_event
after insert on public.safety_reporting_cases
for each row execute function public.emit_hse_event_from_safety_report();

create or replace function public.emit_hse_event_from_fire_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_id uuid;
  v_severity text;
begin
  v_severity := case
    when lower(coalesce(new.severity,'')) in ('critical','emergency') then 'critical'
    when lower(coalesce(new.severity,'')) in ('high','alarm') then 'high'
    when lower(coalesce(new.severity,'')) in ('warning','medium') then 'warning'
    else 'info'
  end;

  insert into public.hse_events(event_type, source_type, source_id, severity, title, message, occurred_at, data)
  values (
    'fire_device_event',
    'fire_device_event',
    new.id,
    v_severity,
    'Fire system: ' || coalesce(new.event_type,'event'),
    new.message,
    coalesce(new.occurred_at,new.created_at,now()),
    jsonb_build_object('deviceId',new.device_id,'panelId',new.panel_id,'gatewayId',new.gateway_id,'status',new.status,'source',new.source)
  )
  returning id into v_event_id;

  if v_severity in ('high','critical') then
    insert into public.notification_outbox(event_id, channel, subject, body, payload)
    values (
      v_event_id,
      'in_app',
      'Fire system alert',
      coalesce(new.message, 'High-severity fire system event'),
      jsonb_build_object('sourceType','fire_device_event','sourceId',new.id,'severity',v_severity)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fire_event_hse_event on public.fire_device_events;
create trigger trg_fire_event_hse_event
after insert on public.fire_device_events
for each row execute function public.emit_hse_event_from_fire_event();

create or replace function public.scan_equipment_due_events()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.hse_events(event_type,source_type,source_id,severity,title,message,department,factory,area,occurred_at,data)
  select
    'equipment_due',
    'equipment_asset',
    e.id,
    case
      when e.certificate_expiry is not null and e.certificate_expiry < current_date then 'critical'
      when e.next_inspection_date is not null and e.next_inspection_date < current_date then 'high'
      when e.next_maintenance_date is not null and e.next_maintenance_date < current_date then 'high'
      else 'warning'
    end,
    'Equipment action due: ' || coalesce(e.name,e.asset_code,'asset'),
    concat_ws(' | ',
      case when e.certificate_expiry is not null and e.certificate_expiry <= current_date + 30 then 'Certificate: '||e.certificate_expiry::text end,
      case when e.next_inspection_date is not null and e.next_inspection_date <= current_date + 14 then 'Inspection: '||e.next_inspection_date::text end,
      case when e.next_maintenance_date is not null and e.next_maintenance_date <= current_date + 14 then 'Maintenance: '||e.next_maintenance_date::text end
    ),
    e.department,e.factory,e.area,now(),
    jsonb_build_object('assetCode',e.asset_code,'equipmentType',e.equipment_type,'status',e.status)
  from public.equipment_assets e
  where (
    (e.certificate_expiry is not null and e.certificate_expiry <= current_date + 30)
    or (e.next_inspection_date is not null and e.next_inspection_date <= current_date + 14)
    or (e.next_maintenance_date is not null and e.next_maintenance_date <= current_date + 14)
  )
  and not exists (
    select 1 from public.hse_events h
    where h.event_type='equipment_due'
      and h.source_type='equipment_asset'
      and h.source_id=e.id
      and h.occurred_at >= date_trunc('day',now())
  );
  get diagnostics v_count = row_count;

  insert into public.notification_outbox(event_id,channel,subject,body,payload)
  select h.id,'in_app','Equipment due alert',h.title,
         jsonb_build_object('sourceType',h.source_type,'sourceId',h.source_id,'severity',h.severity)
  from public.hse_events h
  where h.event_type='equipment_due'
    and h.occurred_at >= date_trunc('day',now())
    and not exists (
      select 1 from public.notification_outbox n where n.event_id=h.id and n.channel='in_app'
    );

  return v_count;
end;
$$;

revoke all on function public.scan_equipment_due_events() from public;
grant execute on function public.scan_equipment_due_events() to authenticated;

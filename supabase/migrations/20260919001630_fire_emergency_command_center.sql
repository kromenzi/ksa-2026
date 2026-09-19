
create table if not exists public.fire_gateways (
  id uuid primary key default gen_random_uuid(),
  gateway_code text not null unique,
  name text not null,
  protocol text not null default 'manual',
  host text,
  port integer,
  manufacturer text,
  model text,
  firmware text,
  building text,
  area text,
  status text not null default 'offline',
  signal_quality integer,
  connected_devices integer not null default 0,
  last_heartbeat_at timestamptz,
  last_error text,
  notes text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fire_gateways_status_check check (status in ('online','offline','fault','maintenance')),
  constraint fire_gateways_signal_quality_check check (signal_quality is null or signal_quality between 0 and 100)
);

create table if not exists public.fire_panels (
  id uuid primary key default gen_random_uuid(),
  panel_code text not null unique,
  name text not null,
  manufacturer text,
  model text,
  serial_number text,
  building text,
  floor text,
  area text,
  protocol text not null default 'manual',
  gateway_id uuid references public.fire_gateways(id) on delete set null,
  host text,
  status text not null default 'normal',
  last_signal_at timestamptz,
  last_test_at timestamptz,
  next_test_at timestamptz,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fire_panels_status_check check (status in ('normal','alarm','pre_alarm','fault','supervisory','disabled','isolated','offline','maintenance'))
);

create table if not exists public.fire_devices (
  id uuid primary key default gen_random_uuid(),
  device_code text not null unique,
  device_type text not null,
  panel_id uuid references public.fire_panels(id) on delete set null,
  zone_id uuid references public.fire_alarm_zones(id) on delete set null,
  gateway_id uuid references public.fire_gateways(id) on delete set null,
  loop_no text,
  address_no text,
  building text,
  floor text,
  area text,
  exact_location text,
  manufacturer text,
  model text,
  serial_number text,
  protocol text not null default 'manual',
  status text not null default 'normal',
  power_status text not null default 'normal',
  battery_level integer,
  isolated boolean not null default false,
  last_signal_at timestamptz,
  last_test_at timestamptz,
  next_test_at timestamptz,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fire_devices_type_check check (device_type in ('smoke_detector','heat_detector','beam_detector','manual_call_point','sounder','strobe','io_module','flow_switch','pressure_switch','gas_suppression','other')),
  constraint fire_devices_status_check check (status in ('normal','alarm','pre_alarm','fault','supervisory','disabled','isolated','offline','maintenance')),
  constraint fire_devices_power_check check (power_status in ('normal','low','mains_fail','battery_fail','unknown')),
  constraint fire_devices_battery_check check (battery_level is null or battery_level between 0 and 100)
);

create table if not exists public.fire_device_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.fire_devices(id) on delete set null,
  panel_id uuid references public.fire_panels(id) on delete set null,
  gateway_id uuid references public.fire_gateways(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  status text not null default 'open',
  message text,
  occurred_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id) on delete set null,
  cleared_at timestamptz,
  source text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fire_device_events_type_check check (event_type in ('alarm','pre_alarm','fault','supervisory','offline','normal','test','maintenance')),
  constraint fire_device_events_severity_check check (severity in ('info','low','medium','high','critical')),
  constraint fire_device_events_status_check check (status in ('open','acknowledged','cleared'))
);

create table if not exists public.emergency_exits (
  id uuid primary key default gen_random_uuid(),
  exit_code text not null unique,
  name text not null,
  building text,
  floor text,
  area text,
  assembly_point text,
  route_description text,
  door_type text,
  gateway_id uuid references public.fire_gateways(id) on delete set null,
  status text not null default 'available',
  door_status text not null default 'closed',
  lock_status text not null default 'ready',
  panic_bar_status text not null default 'ok',
  exit_sign_status text not null default 'on',
  emergency_light_status text not null default 'ok',
  emergency_light_battery integer,
  obstruction_status text not null default 'clear',
  last_signal_at timestamptz,
  last_inspection_at timestamptz,
  next_inspection_at timestamptz,
  qr_code text,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_exits_status_check check (status in ('available','open','closed','blocked','locked','fault','emergency_open','inspection_due','offline')),
  constraint emergency_exits_door_check check (door_status in ('open','closed','fault','unknown')),
  constraint emergency_exits_lock_check check (lock_status in ('ready','locked','released','fault','unknown')),
  constraint emergency_exits_panic_check check (panic_bar_status in ('ok','fault','unknown')),
  constraint emergency_exits_sign_check check (exit_sign_status in ('on','off','fault','unknown')),
  constraint emergency_exits_light_check check (emergency_light_status in ('ok','fault','charging','unknown')),
  constraint emergency_exits_obstruction_check check (obstruction_status in ('clear','blocked','unknown')),
  constraint emergency_exits_battery_check check (emergency_light_battery is null or emergency_light_battery between 0 and 100)
);

create table if not exists public.emergency_exit_events (
  id uuid primary key default gen_random_uuid(),
  exit_id uuid references public.emergency_exits(id) on delete set null,
  gateway_id uuid references public.fire_gateways(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  status text not null default 'open',
  message text,
  occurred_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id) on delete set null,
  cleared_at timestamptz,
  source text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint emergency_exit_events_type_check check (event_type in ('open','closed','blocked','locked','released','panic_bar_fault','exit_sign_fault','emergency_light_fault','offline','normal','inspection_due','test')),
  constraint emergency_exit_events_severity_check check (severity in ('info','low','medium','high','critical')),
  constraint emergency_exit_events_status_check check (status in ('open','acknowledged','cleared'))
);

create index if not exists idx_fire_panels_status on public.fire_panels(status,building);
create index if not exists idx_fire_devices_status on public.fire_devices(status,device_type);
create index if not exists idx_fire_devices_panel on public.fire_devices(panel_id);
create index if not exists idx_fire_device_events_occurred on public.fire_device_events(occurred_at desc);
create index if not exists idx_fire_device_events_status on public.fire_device_events(status,severity);
create index if not exists idx_emergency_exits_status on public.emergency_exits(status,building);
create index if not exists idx_emergency_exit_events_occurred on public.emergency_exit_events(occurred_at desc);
create index if not exists idx_emergency_exit_events_status on public.emergency_exit_events(status,severity);
create index if not exists idx_fire_gateways_status on public.fire_gateways(status,last_heartbeat_at);

create or replace function public.touch_fire_emergency_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_fire_gateways_updated_at on public.fire_gateways;
create trigger trg_fire_gateways_updated_at before update on public.fire_gateways
for each row execute function public.touch_fire_emergency_updated_at();

drop trigger if exists trg_fire_panels_updated_at on public.fire_panels;
create trigger trg_fire_panels_updated_at before update on public.fire_panels
for each row execute function public.touch_fire_emergency_updated_at();

drop trigger if exists trg_fire_devices_updated_at on public.fire_devices;
create trigger trg_fire_devices_updated_at before update on public.fire_devices
for each row execute function public.touch_fire_emergency_updated_at();

drop trigger if exists trg_emergency_exits_updated_at on public.emergency_exits;
create trigger trg_emergency_exits_updated_at before update on public.emergency_exits
for each row execute function public.touch_fire_emergency_updated_at();

create or replace function public.sync_fire_device_event_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped_status text;
  device_code_value text;
begin
  mapped_status := case new.event_type
    when 'alarm' then 'alarm'
    when 'pre_alarm' then 'pre_alarm'
    when 'fault' then 'fault'
    when 'supervisory' then 'supervisory'
    when 'offline' then 'offline'
    when 'maintenance' then 'maintenance'
    when 'normal' then 'normal'
    when 'test' then 'normal'
    else null
  end;

  if new.device_id is not null and mapped_status is not null then
    update public.fire_devices
    set status=mapped_status,last_signal_at=new.occurred_at
    where id=new.device_id;

    select device_code into device_code_value
    from public.fire_devices
    where id=new.device_id;
  end if;

  if new.panel_id is not null and mapped_status is not null then
    update public.fire_panels
    set status=mapped_status,last_signal_at=new.occurred_at
    where id=new.panel_id;
  end if;

  if new.event_type in ('alarm','fault','offline') then
    insert into public.fire_alerts(type,title,title_ar,message,message_ar,equipment_ref,date,is_read)
    values(
      case when new.event_type='alarm' then 'critical' else 'warning' end,
      case when new.event_type='alarm' then 'Fire Alarm' else 'Fire System Fault' end,
      case when new.event_type='alarm' then 'إنذار حريق' else 'عطل في نظام الحريق' end,
      coalesce(new.message,'Fire system event received'),
      coalesce(new.message,'تم استقبال حدث من نظام الحريق'),
      device_code_value,
      to_char(new.occurred_at,'YYYY-MM-DD HH24:MI:SS'),
      false
    );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_fire_device_event_state() from public,anon,authenticated;

drop trigger if exists trg_sync_fire_device_event_state on public.fire_device_events;
create trigger trg_sync_fire_device_event_state
after insert on public.fire_device_events
for each row execute function public.sync_fire_device_event_state();

create or replace function public.sync_emergency_exit_event_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped_status text;
  exit_code_value text;
begin
  mapped_status := case new.event_type
    when 'open' then 'open'
    when 'closed' then 'closed'
    when 'blocked' then 'blocked'
    when 'locked' then 'locked'
    when 'offline' then 'offline'
    when 'inspection_due' then 'inspection_due'
    when 'normal' then 'available'
    when 'released' then 'available'
    when 'test' then 'available'
    else null
  end;

  if new.exit_id is not null then
    update public.emergency_exits
    set
      status=coalesce(mapped_status,status),
      door_status=case when new.event_type='open' then 'open' when new.event_type='closed' then 'closed' else door_status end,
      lock_status=case when new.event_type='locked' then 'locked' when new.event_type='released' then 'released' else lock_status end,
      obstruction_status=case when new.event_type='blocked' then 'blocked' when new.event_type='normal' then 'clear' else obstruction_status end,
      panic_bar_status=case when new.event_type='panic_bar_fault' then 'fault' else panic_bar_status end,
      exit_sign_status=case when new.event_type='exit_sign_fault' then 'fault' else exit_sign_status end,
      emergency_light_status=case when new.event_type='emergency_light_fault' then 'fault' else emergency_light_status end,
      last_signal_at=new.occurred_at
    where id=new.exit_id;

    select exit_code into exit_code_value
    from public.emergency_exits
    where id=new.exit_id;
  end if;

  if new.event_type in ('blocked','locked','offline','panic_bar_fault','exit_sign_fault','emergency_light_fault') then
    insert into public.fire_alerts(type,title,title_ar,message,message_ar,equipment_ref,date,is_read)
    values(
      case when new.event_type in ('blocked','locked','offline') then 'critical' else 'warning' end,
      'Emergency Exit Alert',
      'تنبيه مخرج طوارئ',
      coalesce(new.message,'Emergency exit requires attention'),
      coalesce(new.message,'مخرج الطوارئ يحتاج إلى متابعة'),
      exit_code_value,
      to_char(new.occurred_at,'YYYY-MM-DD HH24:MI:SS'),
      false
    );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_emergency_exit_event_state() from public,anon,authenticated;

drop trigger if exists trg_sync_emergency_exit_event_state on public.emergency_exit_events;
create trigger trg_sync_emergency_exit_event_state
after insert on public.emergency_exit_events
for each row execute function public.sync_emergency_exit_event_state();

alter table public.fire_gateways enable row level security;
alter table public.fire_panels enable row level security;
alter table public.fire_devices enable row level security;
alter table public.fire_device_events enable row level security;
alter table public.emergency_exits enable row level security;
alter table public.emergency_exit_events enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['fire_gateways','fire_panels','fire_devices','fire_device_events','emergency_exits','emergency_exit_events']
  loop
    execute format('drop policy if exists %I_select on public.%I',t,t);
    execute format('drop policy if exists %I_write on public.%I',t,t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'',''viewer'']::text[])))',
      t,t
    );
    execute format(
      'create policy %I_write on public.%I for all to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',
      t,t
    );
  end loop;
end $$;

grant select,insert,update,delete on public.fire_gateways to authenticated;
grant select,insert,update,delete on public.fire_panels to authenticated;
grant select,insert,update,delete on public.fire_devices to authenticated;
grant select,insert,update,delete on public.fire_device_events to authenticated;
grant select,insert,update,delete on public.emergency_exits to authenticated;
grant select,insert,update,delete on public.emergency_exit_events to authenticated;

grant all on public.fire_gateways to service_role;
grant all on public.fire_panels to service_role;
grant all on public.fire_devices to service_role;
grant all on public.fire_device_events to service_role;
grant all on public.emergency_exits to service_role;
grant all on public.emergency_exit_events to service_role;

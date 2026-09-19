
create table if not exists public.site_floor_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text not null,
  floor text,
  image_url text,
  width numeric(12,2) not null default 100,
  height numeric(12,2) not null default 100,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fire_panels
  add column if not exists floor_plan_id uuid references public.site_floor_plans(id) on delete set null,
  add column if not exists map_x numeric(8,3),
  add column if not exists map_y numeric(8,3);

alter table public.fire_devices
  add column if not exists floor_plan_id uuid references public.site_floor_plans(id) on delete set null,
  add column if not exists map_x numeric(8,3),
  add column if not exists map_y numeric(8,3);

alter table public.emergency_exits
  add column if not exists floor_plan_id uuid references public.site_floor_plans(id) on delete set null,
  add column if not exists map_x numeric(8,3),
  add column if not exists map_y numeric(8,3);

create table if not exists public.emergency_assembly_points (
  id uuid primary key default gen_random_uuid(),
  point_code text not null unique,
  name text not null,
  building text,
  area text,
  capacity integer,
  map_x numeric(8,3),
  map_y numeric(8,3),
  status text not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_assembly_status_check check(status in ('Available','Unavailable','Full','Maintenance'))
);

create sequence if not exists public.emergency_response_seq start 1;

create table if not exists public.emergency_response_incidents (
  id uuid primary key default gen_random_uuid(),
  response_no text not null unique default ('ER-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.emergency_response_seq')::text,5,'0')),
  source_type text not null,
  source_id uuid,
  title text not null,
  severity text not null default 'Critical',
  building text,
  floor text,
  area text,
  status text not null default 'Active',
  alarm_started_at timestamptz not null default now(),
  evacuation_started_at timestamptz,
  assembly_started_at timestamptz,
  all_clear_at timestamptz,
  primary_assembly_point_id uuid references public.emergency_assembly_points(id) on delete set null,
  nearest_exit_ids uuid[] not null default '{}'::uuid[],
  expected_count integer not null default 0,
  accounted_count integer not null default 0,
  missing_count integer not null default 0,
  incident_id uuid references public.incidents(id) on delete set null,
  action_id uuid references public.hse_actions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_response_severity_check check(severity in ('Medium','High','Critical')),
  constraint emergency_response_status_check check(status in ('Active','Evacuating','Muster','All Clear','Closed','Cancelled'))
);

create table if not exists public.emergency_response_timeline (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.emergency_response_incidents(id) on delete cascade,
  event_type text not null,
  message text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references public.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.emergency_muster_entries (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.emergency_response_incidents(id) on delete cascade,
  person_type text not null,
  person_ref text,
  person_name text not null,
  department text,
  assembly_point_id uuid references public.emergency_assembly_points(id) on delete set null,
  status text not null default 'Expected',
  accounted_at timestamptz,
  notes text,
  constraint emergency_muster_type_check check(person_type in ('Employee','Contractor','Visitor')),
  constraint emergency_muster_status_check check(status in ('Expected','Accounted','Missing','Exempt'))
);

create index if not exists idx_floor_plans_building on public.site_floor_plans(building,floor,active);
create index if not exists idx_fire_devices_floor_map on public.fire_devices(floor_plan_id,status);
create index if not exists idx_exits_floor_map on public.emergency_exits(floor_plan_id,status);
create index if not exists idx_emergency_response_status on public.emergency_response_incidents(status,alarm_started_at desc);
create index if not exists idx_emergency_timeline_response on public.emergency_response_timeline(response_id,occurred_at);
create index if not exists idx_emergency_muster_response on public.emergency_muster_entries(response_id,status);

create or replace function private.nearest_emergency_exits(p_floor_plan_id uuid,p_x numeric,p_y numeric,p_limit integer default 3)
returns uuid[]
language sql stable security definer set search_path=''
as $$
  select coalesce(array_agg(x.id order by x.distance),'{}'::uuid[])
  from (
    select e.id,
      sqrt(power(coalesce(e.map_x,0)-coalesce(p_x,0),2)+power(coalesce(e.map_y,0)-coalesce(p_y,0),2)) distance
    from public.emergency_exits e
    where e.floor_plan_id=p_floor_plan_id
      and e.status not in ('blocked','locked','fault','offline')
      and e.obstruction_status<>'blocked'
    order by distance
    limit greatest(1,least(coalesce(p_limit,3),10))
  ) x;
$$;
revoke all on function private.nearest_emergency_exits(uuid,numeric,numeric,integer) from public,anon,authenticated;

create or replace function private.create_emergency_response_from_fire_alarm()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare d record;
declare response_id uuid;
declare exits uuid[];
begin
  if new.event_type<>'alarm' or new.severity not in ('high','critical') then return new; end if;
  if exists(select 1 from public.emergency_response_incidents r where r.source_type='Fire Event' and r.source_id=new.id) then return new; end if;

  select * into d from public.fire_devices where id=new.device_id;
  exits:=case when d.floor_plan_id is not null then private.nearest_emergency_exits(d.floor_plan_id,d.map_x,d.map_y,3) else '{}'::uuid[] end;

  insert into public.emergency_response_incidents(
    source_type,source_id,title,severity,building,floor,area,nearest_exit_ids,status,alarm_started_at
  ) values(
    'Fire Event',new.id,'Fire Alarm - '||coalesce(d.device_code,'Fire system'),
    case when new.severity='critical' then 'Critical' else 'High' end,
    d.building,d.floor,d.area,exits,'Active',new.occurred_at
  ) returning id into response_id;

  insert into public.emergency_response_timeline(response_id,event_type,message,data)
  values(response_id,'Alarm Received',coalesce(new.message,'Fire alarm event received'),jsonb_build_object('deviceId',new.device_id,'panelId',new.panel_id));

  return new;
end;
$$;
revoke all on function private.create_emergency_response_from_fire_alarm() from public,anon,authenticated;

drop trigger if exists trg_create_emergency_response_from_fire_alarm on public.fire_device_events;
create trigger trg_create_emergency_response_from_fire_alarm
after insert on public.fire_device_events
for each row execute function private.create_emergency_response_from_fire_alarm();

create or replace function private.refresh_emergency_muster_counts()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare rid uuid;
begin
  rid:=coalesce(new.response_id,old.response_id);
  update public.emergency_response_incidents r
  set
    expected_count=(select count(*) from public.emergency_muster_entries m where m.response_id=rid and m.status<>'Exempt'),
    accounted_count=(select count(*) from public.emergency_muster_entries m where m.response_id=rid and m.status='Accounted'),
    missing_count=(select count(*) from public.emergency_muster_entries m where m.response_id=rid and m.status='Missing'),
    updated_at=now()
  where r.id=rid;
  return coalesce(new,old);
end;
$$;
revoke all on function private.refresh_emergency_muster_counts() from public,anon,authenticated;
drop trigger if exists trg_refresh_emergency_muster_counts on public.emergency_muster_entries;
create trigger trg_refresh_emergency_muster_counts after insert or update or delete on public.emergency_muster_entries
for each row execute function private.refresh_emergency_muster_counts();

create or replace function private.monitor_fire_emergency_connectivity()
returns integer
language plpgsql security definer set search_path=''
as $$
declare r record;
declare c integer:=0;
begin
  for r in
    update public.fire_gateways g
    set status='offline',last_error='Heartbeat timeout',updated_at=now()
    where g.status='online'
      and g.last_heartbeat_at is not null
      and g.last_heartbeat_at<now()-interval '5 minutes'
    returning *
  loop
    perform private.create_hse_action_if_absent(
      'Fire Gateway Offline',r.id,
      'Fire gateway offline - '||r.gateway_code,
      'Gateway heartbeat has not been received for more than 5 minutes',
      'Fire Safety','High',null,now()+interval '1 hour',null,
      jsonb_build_object('gatewayCode',r.gateway_code,'building',r.building,'area',r.area)
    );
    c:=c+1;
  end loop;

  update public.fire_devices d
  set status='offline',updated_at=now()
  where d.status not in ('offline','maintenance','disabled','isolated')
    and d.last_signal_at is not null
    and d.last_signal_at<now()-interval '24 hours';

  update public.emergency_exits e
  set status='offline',updated_at=now()
  where e.status not in ('offline','maintenance')
    and e.gateway_id is not null
    and exists(select 1 from public.fire_gateways g where g.id=e.gateway_id and g.status='offline');

  return c;
end;
$$;
revoke all on function private.monitor_fire_emergency_connectivity() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='fire_emergency_connectivity_monitor' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('fire_emergency_connectivity_monitor','*/5 * * * *','select private.monitor_fire_emergency_connectivity();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['site_floor_plans','emergency_assembly_points','emergency_response_incidents','emergency_response_timeline','emergency_muster_entries']
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

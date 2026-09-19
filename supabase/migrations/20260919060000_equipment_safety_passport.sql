
create sequence if not exists public.equipment_defect_seq start 1;

create table if not exists public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  name text not null,
  equipment_type text not null,
  serial_number text,
  manufacturer text,
  model text,
  department text,
  factory text,
  area text,
  status text not null default 'Operational',
  risk_rating text not null default 'Medium',
  qr_code text,
  certificate_number text,
  certificate_expiry date,
  last_inspection_date date,
  next_inspection_date date,
  last_maintenance_date date,
  next_maintenance_date date,
  operator_authorization_required boolean not null default false,
  loto_required boolean not null default false,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_assets_status_check check (status in ('Operational','Restricted','Out of Service','Maintenance','Retired')),
  constraint equipment_assets_risk_check check (risk_rating in ('Low','Medium','High','Critical'))
);

create table if not exists public.equipment_service_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  service_type text not null,
  performed_at date not null default current_date,
  next_due date,
  result text not null default 'Pass',
  provider text,
  technician text,
  notes text,
  attachment_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint equipment_service_type_check check (service_type in ('Inspection','Maintenance','Repair','Certification','Load Test','Calibration')),
  constraint equipment_service_result_check check (result in ('Pass','Fail','Conditional','Completed'))
);

create table if not exists public.equipment_defects (
  id uuid primary key default gen_random_uuid(),
  defect_no text not null unique default ('DEF-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.equipment_defect_seq')::text,6,'0')),
  asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  description text not null,
  severity text not null default 'Medium',
  status text not null default 'Open',
  reported_at timestamptz not null default now(),
  reported_by_employee_id uuid references public.employees(id) on delete set null,
  action_id uuid references public.hse_actions(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  verified_by_user_id uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_defect_severity_check check (severity in ('Low','Medium','High','Critical')),
  constraint equipment_defect_status_check check (status in ('Open','In Progress','Resolved','Verified','Cancelled'))
);

create table if not exists public.equipment_operator_authorizations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.equipment_assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  authorization_type text not null default 'Operator',
  issue_date date not null default current_date,
  expiry_date date,
  status text not null default 'Active',
  certificate_ref text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint equipment_auth_status_check check (status in ('Active','Expired','Suspended','Revoked')),
  unique(asset_id,employee_id,authorization_type)
);

create index if not exists idx_equipment_assets_due on public.equipment_assets(status,certificate_expiry,next_inspection_date,next_maintenance_date);
create index if not exists idx_equipment_defects_asset on public.equipment_defects(asset_id,status,severity);
create index if not exists idx_equipment_service_asset on public.equipment_service_records(asset_id,performed_at desc);
create index if not exists idx_equipment_auth_asset on public.equipment_operator_authorizations(asset_id,status,expiry_date);

create or replace function public.touch_equipment_ops_updated_at()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;

drop trigger if exists trg_touch_equipment_assets on public.equipment_assets;
create trigger trg_touch_equipment_assets before update on public.equipment_assets
for each row execute function public.touch_equipment_ops_updated_at();
drop trigger if exists trg_touch_equipment_defects on public.equipment_defects;
create trigger trg_touch_equipment_defects before update on public.equipment_defects
for each row execute function public.touch_equipment_ops_updated_at();

create or replace function private.action_from_equipment_defect()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare a uuid;
declare asset record;
begin
  select * into asset from public.equipment_assets where id=new.asset_id;
  if new.status in ('Resolved','Verified','Cancelled') then
    if new.status='Resolved' and new.resolved_at is null then new.resolved_at:=now(); end if;
    return new;
  end if;
  if new.severity in ('High','Critical') then
    a:=private.create_hse_action_if_absent(
      'Equipment Defect',new.id,
      'Equipment defect '||new.defect_no||' - '||coalesce(asset.name,'Asset'),
      new.description,
      'Equipment Safety',
      new.severity,
      asset.department,
      null,
      null,
      null,
      jsonb_build_object('assetId',new.asset_id,'assetCode',asset.asset_code,'factory',asset.factory,'area',asset.area)
    );
    new.action_id:=coalesce(new.action_id,a);
    update public.equipment_assets set status=case when new.severity='Critical' then 'Out of Service' else 'Restricted' end where id=new.asset_id;
  end if;
  return new;
end;
$$;
revoke all on function private.action_from_equipment_defect() from public,anon,authenticated;
drop trigger if exists trg_action_from_equipment_defect on public.equipment_defects;
create trigger trg_action_from_equipment_defect before insert or update on public.equipment_defects
for each row execute function private.action_from_equipment_defect();

create or replace function private.monitor_equipment_due_items()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare r record;
declare c integer:=0;
begin
  for r in select * from public.equipment_assets where status not in ('Retired','Out of Service') loop
    if r.certificate_expiry is not null and r.certificate_expiry<current_date then
      perform private.create_hse_action_if_absent('Equipment Certification',r.id,'Expired certificate - '||r.asset_code,'Equipment certificate expired','Equipment Safety','High',r.department,now()+interval '1 day',r.created_by,jsonb_build_object('assetCode',r.asset_code,'dueDate',r.certificate_expiry));
      c:=c+1;
    end if;
    if r.next_inspection_date is not null and r.next_inspection_date<current_date then
      perform private.create_hse_action_if_absent('Equipment Inspection',r.id,'Overdue inspection - '||r.asset_code,'Equipment inspection is overdue','Equipment Safety','High',r.department,now()+interval '1 day',r.created_by,jsonb_build_object('assetCode',r.asset_code,'dueDate',r.next_inspection_date));
      c:=c+1;
    end if;
    if r.next_maintenance_date is not null and r.next_maintenance_date<current_date then
      perform private.create_hse_action_if_absent('Equipment Maintenance',r.id,'Overdue maintenance - '||r.asset_code,'Equipment maintenance is overdue','Equipment Safety','Medium',r.department,now()+interval '3 days',r.created_by,jsonb_build_object('assetCode',r.asset_code,'dueDate',r.next_maintenance_date));
      c:=c+1;
    end if;
  end loop;
  update public.equipment_operator_authorizations set status='Expired' where status='Active' and expiry_date is not null and expiry_date<current_date;
  return c;
end;
$$;
revoke all on function private.monitor_equipment_due_items() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='equipment_due_monitor_daily' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('equipment_due_monitor_daily','30 0 * * *','select private.monitor_equipment_due_items();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['equipment_assets','equipment_service_records','equipment_defects','equipment_operator_authorizations']
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

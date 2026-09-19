
create table if not exists public.safety_qr_registry (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique,
  resource_type text not null,
  resource_id text not null,
  label text not null,
  route text not null,
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_qr_status_check check(status in ('Active','Inactive','Retired')),
  unique(resource_type,resource_id)
);

create index if not exists idx_safety_qr_resource on public.safety_qr_registry(resource_type,resource_id);
create index if not exists idx_safety_qr_code_active on public.safety_qr_registry(qr_code,status);

create or replace function private.upsert_safety_qr(
  p_code text,p_resource_type text,p_resource_id text,p_label text,p_route text,p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path=''
as $$
begin
  if nullif(trim(p_resource_id),'') is null then return; end if;
  insert into public.safety_qr_registry(qr_code,resource_type,resource_id,label,route,status,metadata)
  values(
    coalesce(nullif(trim(p_code),''),upper(p_resource_type)||'-'||replace(p_resource_id,'-','')),
    p_resource_type,p_resource_id,p_label,p_route,'Active',coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(resource_type,resource_id)
  do update set qr_code=excluded.qr_code,label=excluded.label,route=excluded.route,status='Active',metadata=excluded.metadata,updated_at=now();
end;
$$;
revoke all on function private.upsert_safety_qr(text,text,text,text,text,jsonb) from public,anon,authenticated;

create or replace function private.sync_equipment_qr()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform private.upsert_safety_qr(
    coalesce(new.qr_code,'EQUIP-'||new.asset_code),'Equipment',new.id::text,
    new.asset_code||' - '||new.name,'/admin/equipment-safety',
    jsonb_build_object('assetCode',new.asset_code,'type',new.equipment_type,'factory',new.factory,'area',new.area,'status',new.status)
  );
  return new;
end; $$;
revoke all on function private.sync_equipment_qr() from public,anon,authenticated;
drop trigger if exists trg_sync_equipment_qr on public.equipment_assets;
create trigger trg_sync_equipment_qr after insert or update of qr_code,asset_code,name,status,factory,area on public.equipment_assets for each row execute function private.sync_equipment_qr();

create or replace function private.sync_chemical_qr()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform private.upsert_safety_qr(
    coalesce(new.qr_code,'CHEM-'||new.chemical_code),'Chemical',new.id::text,
    new.chemical_code||' - '||new.product_name,'/admin/chemicals',
    jsonb_build_object('chemicalCode',new.chemical_code,'riskRating',new.risk_rating,'storageArea',new.storage_area,'status',new.status)
  );
  return new;
end; $$;
revoke all on function private.sync_chemical_qr() from public,anon,authenticated;
drop trigger if exists trg_sync_chemical_qr on public.chemicals;
create trigger trg_sync_chemical_qr after insert or update of qr_code,chemical_code,product_name,status,risk_rating,storage_area on public.chemicals for each row execute function private.sync_chemical_qr();

create or replace function private.sync_exit_qr()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform private.upsert_safety_qr(
    coalesce(new.qr_code,'EXIT-'||new.exit_code),'Emergency Exit',new.id::text,
    new.exit_code||' - '||new.name,'/admin/fire-emergency-command',
    jsonb_build_object('exitCode',new.exit_code,'building',new.building,'area',new.area,'status',new.status)
  );
  return new;
end; $$;
revoke all on function private.sync_exit_qr() from public,anon,authenticated;
drop trigger if exists trg_sync_exit_qr on public.emergency_exits;
create trigger trg_sync_exit_qr after insert or update of qr_code,exit_code,name,status,building,area on public.emergency_exits for each row execute function private.sync_exit_qr();

create or replace function private.sync_fire_device_qr()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  perform private.upsert_safety_qr(
    'FIRE-'||new.device_code,'Fire Device',new.id::text,
    new.device_code||' - '||new.device_type,'/admin/fire-emergency-command',
    jsonb_build_object('deviceCode',new.device_code,'type',new.device_type,'location',new.exact_location,'status',new.status)
  );
  return new;
end; $$;
revoke all on function private.sync_fire_device_qr() from public,anon,authenticated;
drop trigger if exists trg_sync_fire_device_qr on public.fire_devices;
create trigger trg_sync_fire_device_qr after insert or update of device_code,device_type,status,exact_location on public.fire_devices for each row execute function private.sync_fire_device_qr();

alter table public.safety_qr_registry enable row level security;
drop policy if exists safety_qr_select on public.safety_qr_registry;
create policy safety_qr_select on public.safety_qr_registry for select to authenticated using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
drop policy if exists safety_qr_write on public.safety_qr_registry;
create policy safety_qr_write on public.safety_qr_registry for all to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
grant select,insert,update,delete on public.safety_qr_registry to authenticated;
grant all on public.safety_qr_registry to service_role;

insert into public.safety_qr_registry(qr_code,resource_type,resource_id,label,route,status,metadata)
select coalesce(qr_code,'EQUIP-'||asset_code),'Equipment',id::text,asset_code||' - '||name,'/admin/equipment-safety','Active',
jsonb_build_object('assetCode',asset_code,'type',equipment_type,'factory',factory,'area',area,'status',status)
from public.equipment_assets
on conflict(resource_type,resource_id) do nothing;

insert into public.safety_qr_registry(qr_code,resource_type,resource_id,label,route,status,metadata)
select coalesce(qr_code,'CHEM-'||chemical_code),'Chemical',id::text,chemical_code||' - '||product_name,'/admin/chemicals','Active',
jsonb_build_object('chemicalCode',chemical_code,'riskRating',risk_rating,'storageArea',storage_area,'status',status)
from public.chemicals
on conflict(resource_type,resource_id) do nothing;

insert into public.safety_qr_registry(qr_code,resource_type,resource_id,label,route,status,metadata)
select coalesce(qr_code,'EXIT-'||exit_code),'Emergency Exit',id::text,exit_code||' - '||name,'/admin/fire-emergency-command','Active',
jsonb_build_object('exitCode',exit_code,'building',building,'area',area,'status',status)
from public.emergency_exits
on conflict(resource_type,resource_id) do nothing;

insert into public.safety_qr_registry(qr_code,resource_type,resource_id,label,route,status,metadata)
select 'FIRE-'||device_code,'Fire Device',id::text,device_code||' - '||device_type,'/admin/fire-emergency-command','Active',
jsonb_build_object('deviceCode',device_code,'type',device_type,'location',exact_location,'status',status)
from public.fire_devices
on conflict(resource_type,resource_id) do nothing;

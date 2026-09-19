
create table if not exists public.safety_map_points (
  id uuid primary key default gen_random_uuid(),
  floor_plan_id uuid not null references public.site_floor_plans(id) on delete cascade,
  point_type text not null,
  label text not null,
  resource_type text,
  resource_id text,
  map_x numeric(8,3) not null,
  map_y numeric(8,3) not null,
  status text not null default 'Normal',
  icon text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_map_point_type_check check(point_type in ('First Aid','Spill Kit','Chemical','Equipment','High Risk Zone','Fire Equipment','Assembly Point','Other')),
  constraint safety_map_status_check check(status in ('Normal','Warning','Critical','Offline','Maintenance'))
);
create index if not exists idx_safety_map_points_floor on public.safety_map_points(floor_plan_id,point_type,status);
create unique index if not exists uq_safety_map_resource on public.safety_map_points(floor_plan_id,resource_type,resource_id) where resource_type is not null and resource_id is not null;

create or replace function public.touch_safety_map_point()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;
drop trigger if exists trg_touch_safety_map_point on public.safety_map_points;
create trigger trg_touch_safety_map_point before update on public.safety_map_points
for each row execute function public.touch_safety_map_point();

alter table public.safety_map_points enable row level security;
drop policy if exists safety_map_points_select on public.safety_map_points;
create policy safety_map_points_select on public.safety_map_points for select to authenticated using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
drop policy if exists safety_map_points_write on public.safety_map_points;
create policy safety_map_points_write on public.safety_map_points for all to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
grant select,insert,update,delete on public.safety_map_points to authenticated;
grant all on public.safety_map_points to service_role;

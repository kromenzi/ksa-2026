
create sequence if not exists public.ptw_permit_seq start 1;
create sequence if not exists public.loto_isolation_seq start 1;

create table if not exists public.ptw_permits (
  id uuid primary key default gen_random_uuid(),
  permit_no text not null unique default ('PTW-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.ptw_permit_seq')::text,6,'0')),
  permit_type text not null,
  title text not null,
  description text,
  department text,
  factory text,
  area text,
  location text,
  requester_employee_id uuid references public.employees(id) on delete set null,
  issuer_user_id uuid references public.users(id) on delete set null,
  hse_reviewer_user_id uuid references public.users(id) on delete set null,
  approver_user_id uuid references public.users(id) on delete set null,
  status text not null default 'Draft',
  risk_level text not null default 'Medium',
  start_at timestamptz,
  expires_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  closed_at timestamptz,
  suspension_reason text,
  closure_notes text,
  precautions jsonb not null default '[]'::jsonb,
  required_ppe jsonb not null default '[]'::jsonb,
  gas_test_required boolean not null default false,
  gas_test_result jsonb not null default '{}'::jsonb,
  loto_required boolean not null default false,
  signatures jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ptw_type_check check (permit_type in ('hot_work','electrical','work_at_height','confined_space','excavation','lifting','general')),
  constraint ptw_status_check check (status in ('Draft','Pending Review','Pending Approval','Approved','Active','Suspended','Expired','Closed','Rejected')),
  constraint ptw_risk_check check (risk_level in ('Low','Medium','High','Critical'))
);

create table if not exists public.loto_isolations (
  id uuid primary key default gen_random_uuid(),
  loto_no text not null unique default ('LOTO-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.loto_isolation_seq')::text,6,'0')),
  permit_id uuid references public.ptw_permits(id) on delete set null,
  equipment_name text not null,
  asset_ref text,
  department text,
  factory text,
  area text,
  isolation_type text not null default 'multi',
  status text not null default 'Planned',
  authorized_employee_id uuid references public.employees(id) on delete set null,
  verified_by_user_id uuid references public.users(id) on delete set null,
  zero_energy_verified boolean not null default false,
  start_at timestamptz,
  verified_at timestamptz,
  released_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loto_isolation_type_check check (isolation_type in ('electrical','mechanical','hydraulic','pneumatic','thermal','chemical','gravity','multi')),
  constraint loto_isolation_status_check check (status in ('Planned','Active','Verified','Released','Closed','Cancelled'))
);

create table if not exists public.loto_points (
  id uuid primary key default gen_random_uuid(),
  isolation_id uuid not null references public.loto_isolations(id) on delete cascade,
  point_code text not null,
  energy_type text not null,
  location text,
  normal_state text,
  isolated_state text,
  verification_method text,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  constraint loto_point_status_check check (status in ('Pending','Isolated','Verified','Released'))
);
create unique index if not exists uq_loto_points_code on public.loto_points(isolation_id,point_code);

create table if not exists public.loto_locks (
  id uuid primary key default gen_random_uuid(),
  isolation_id uuid not null references public.loto_isolations(id) on delete cascade,
  point_id uuid references public.loto_points(id) on delete set null,
  lock_number text not null,
  tag_number text,
  applied_by_employee_id uuid references public.employees(id) on delete set null,
  applied_at timestamptz not null default now(),
  removed_at timestamptz,
  status text not null default 'Applied',
  notes text,
  constraint loto_lock_status_check check (status in ('Applied','Removed','Lost','Damaged'))
);
create unique index if not exists uq_loto_active_lock_number on public.loto_locks(lock_number) where status='Applied';

create index if not exists idx_ptw_status_expiry on public.ptw_permits(status,expires_at);
create index if not exists idx_ptw_department on public.ptw_permits(department,status);
create index if not exists idx_loto_status on public.loto_isolations(status,start_at);
create index if not exists idx_loto_permit on public.loto_isolations(permit_id);
create index if not exists idx_loto_points_isolation on public.loto_points(isolation_id);
create index if not exists idx_loto_locks_isolation on public.loto_locks(isolation_id,status);

create or replace function public.touch_ptw_loto_updated_at()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;

drop trigger if exists trg_touch_ptw_permits on public.ptw_permits;
create trigger trg_touch_ptw_permits before update on public.ptw_permits
for each row execute function public.touch_ptw_loto_updated_at();

drop trigger if exists trg_touch_loto_isolations on public.loto_isolations;
create trigger trg_touch_loto_isolations before update on public.loto_isolations
for each row execute function public.touch_ptw_loto_updated_at();

create or replace function private.enforce_ptw_transition()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='Active' then
    if new.start_at is null or new.expires_at is null then
      raise exception 'Active permit requires start and expiry time';
    end if;
    if new.loto_required and not exists (
      select 1 from public.loto_isolations l
      where l.permit_id=new.id and l.status in ('Active','Verified')
    ) then
      raise exception 'Permit requires an active or verified LOTO isolation';
    end if;
    new.activated_at:=coalesce(new.activated_at,now());
  elsif new.status='Approved' then
    new.approved_at:=coalesce(new.approved_at,now());
  elsif new.status='Suspended' then
    new.suspended_at:=coalesce(new.suspended_at,now());
  elsif new.status='Closed' then
    new.closed_at:=coalesce(new.closed_at,now());
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_ptw_transition() from public,anon,authenticated;

drop trigger if exists trg_enforce_ptw_transition on public.ptw_permits;
create trigger trg_enforce_ptw_transition before update on public.ptw_permits
for each row execute function private.enforce_ptw_transition();

create or replace function private.enforce_loto_state()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='Verified' then
    if not new.zero_energy_verified then
      raise exception 'LOTO cannot be Verified before zero-energy verification';
    end if;
    if exists (
      select 1 from public.loto_points p
      where p.isolation_id=new.id and p.status not in ('Isolated','Verified')
    ) then
      raise exception 'All isolation points must be isolated before verification';
    end if;
    new.verified_at:=coalesce(new.verified_at,now());
  elsif new.status='Released' then
    if exists (
      select 1 from public.loto_locks l
      where l.isolation_id=new.id and l.status='Applied'
    ) then
      raise exception 'Remove all applied locks before releasing LOTO';
    end if;
    new.released_at:=coalesce(new.released_at,now());
  elsif new.status='Closed' then
    new.closed_at:=coalesce(new.closed_at,now());
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_loto_state() from public,anon,authenticated;

drop trigger if exists trg_enforce_loto_state on public.loto_isolations;
create trigger trg_enforce_loto_state before update on public.loto_isolations
for each row execute function private.enforce_loto_state();

create or replace function private.expire_ptw_and_create_actions()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare c integer:=0;
declare r record;
begin
  for r in
    update public.ptw_permits
    set status='Expired',updated_at=now()
    where status='Active' and expires_at<now()
    returning id,permit_no,title,department,created_by
  loop
    perform private.create_hse_action_if_absent(
      'PTW Expiry',r.id,
      'Expired active permit '||r.permit_no,
      r.title,
      'PTW',
      'High',
      r.department,
      now()+interval '1 day',
      r.created_by,
      jsonb_build_object('permitNo',r.permit_no)
    );
    c:=c+1;
  end loop;
  return c;
end;
$$;
revoke all on function private.expire_ptw_and_create_actions() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='ptw_expiry_monitor' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('ptw_expiry_monitor','*/15 * * * *','select private.expire_ptw_and_create_actions();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['ptw_permits','loto_isolations','loto_points','loto_locks']
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

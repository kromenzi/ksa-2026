
create sequence if not exists public.chemical_seq start 1;

create table if not exists public.chemicals (
  id uuid primary key default gen_random_uuid(),
  chemical_code text not null unique default ('CHEM-'||lpad(nextval('public.chemical_seq')::text,5,'0')),
  product_name text not null,
  manufacturer text,
  cas_numbers text[] not null default '{}'::text[],
  hazard_classes text[] not null default '{}'::text[],
  pictograms jsonb not null default '[]'::jsonb,
  storage_area text,
  compatibility_group text,
  quantity numeric(12,3) not null default 0,
  unit text not null default 'L',
  max_allowed_quantity numeric(12,3),
  product_expiry_date date,
  risk_rating text not null default 'Medium',
  required_ppe jsonb not null default '[]'::jsonb,
  spill_response text,
  first_aid text,
  disposal_method text,
  qr_code text,
  status text not null default 'Active',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chemicals_risk_check check (risk_rating in ('Low','Medium','High','Critical')),
  constraint chemicals_status_check check (status in ('Active','Restricted','Expired','Disposed')),
  constraint chemicals_quantity_check check (quantity>=0)
);

create table if not exists public.chemical_sds (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references public.chemicals(id) on delete cascade,
  revision_date date not null,
  review_due_date date,
  language text not null default 'English',
  file_url text not null,
  status text not null default 'Current',
  notes text,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  constraint chemical_sds_status_check check (status in ('Current','Superseded','Expired','Pending Review'))
);

create table if not exists public.chemical_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references public.chemicals(id) on delete cascade,
  transaction_type text not null,
  quantity numeric(12,3) not null,
  occurred_at timestamptz not null default now(),
  reference text,
  notes text,
  recorded_by uuid references public.users(id) on delete set null,
  constraint chemical_tx_type_check check (transaction_type in ('Receive','Issue','Adjust','Dispose','Spill')),
  constraint chemical_tx_quantity_check check (quantity>0)
);

create index if not exists idx_chemicals_status_risk on public.chemicals(status,risk_rating);
create index if not exists idx_chemicals_storage on public.chemicals(storage_area,compatibility_group);
create index if not exists idx_chemical_sds_due on public.chemical_sds(status,review_due_date);
create index if not exists idx_chemical_tx on public.chemical_inventory_transactions(chemical_id,occurred_at desc);

create or replace function public.touch_chemical_updated_at()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;
drop trigger if exists trg_touch_chemicals on public.chemicals;
create trigger trg_touch_chemicals before update on public.chemicals
for each row execute function public.touch_chemical_updated_at();

create or replace function private.apply_chemical_inventory_transaction()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare delta numeric;
begin
  delta:=case new.transaction_type
    when 'Receive' then new.quantity
    when 'Issue' then -new.quantity
    when 'Dispose' then -new.quantity
    when 'Spill' then -new.quantity
    when 'Adjust' then new.quantity
    else 0
  end;
  update public.chemicals
  set quantity=greatest(0,quantity+delta),updated_at=now()
  where id=new.chemical_id;
  return new;
end;
$$;
revoke all on function private.apply_chemical_inventory_transaction() from public,anon,authenticated;
drop trigger if exists trg_apply_chemical_inventory_transaction on public.chemical_inventory_transactions;
create trigger trg_apply_chemical_inventory_transaction
after insert on public.chemical_inventory_transactions
for each row execute function private.apply_chemical_inventory_transaction();

create or replace function private.monitor_chemical_compliance()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare r record;
declare c integer:=0;
begin
  update public.chemical_sds set status='Expired'
  where status='Current' and review_due_date is not null and review_due_date<current_date;

  update public.chemicals set status='Expired',updated_at=now()
  where status='Active' and product_expiry_date is not null and product_expiry_date<current_date;

  for r in
    select c.*
    from public.chemicals c
    where c.status<>'Disposed'
  loop
    if r.max_allowed_quantity is not null and r.quantity>r.max_allowed_quantity then
      perform private.create_hse_action_if_absent(
        'Chemical Quantity',r.id,
        'Chemical quantity exceeds limit - '||r.product_name,
        'Current quantity '||r.quantity||' '||r.unit||' exceeds maximum '||r.max_allowed_quantity||' '||r.unit,
        'Chemical Safety',
        case when r.risk_rating='Critical' then 'Critical' else 'High' end,
        null,
        now()+interval '1 day',
        r.created_by,
        jsonb_build_object('chemicalCode',r.chemical_code,'storageArea',r.storage_area)
      );
      c:=c+1;
    end if;
    if not exists(
      select 1 from public.chemical_sds s
      where s.chemical_id=r.id and s.status='Current'
        and (s.review_due_date is null or s.review_due_date>=current_date)
    ) then
      perform private.create_hse_action_if_absent(
        'Chemical SDS',r.id,
        'SDS missing or expired - '||r.product_name,
        'Current Safety Data Sheet is required',
        'Chemical Safety','High',null,now()+interval '3 days',r.created_by,
        jsonb_build_object('chemicalCode',r.chemical_code)
      );
      c:=c+1;
    end if;
  end loop;
  return c;
end;
$$;
revoke all on function private.monitor_chemical_compliance() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='chemical_compliance_daily' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('chemical_compliance_daily','0 1 * * *','select private.monitor_chemical_compliance();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['chemicals','chemical_sds','chemical_inventory_transactions']
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

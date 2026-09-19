
create sequence if not exists public.contractor_seq start 1;

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  contractor_code text not null unique default ('CTR-'||lpad(nextval('public.contractor_seq')::text,5,'0')),
  name text not null,
  company_registration text,
  scope_of_work text,
  main_contact text,
  email text,
  phone text,
  contract_start date,
  contract_end date,
  insurance_expiry date,
  status text not null default 'Conditional',
  safety_score numeric(5,2) not null default 100,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contractors_status_check check (status in ('Approved','Conditional','Suspended','Expired','Blocked')),
  constraint contractors_score_check check (safety_score between 0 and 100)
);

create table if not exists public.contractor_workers (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  worker_no text,
  name text not null,
  national_id text,
  job_title text,
  phone text,
  induction_date date,
  induction_expiry date,
  medical_expiry date,
  competency_expiry date,
  status text not null default 'Active',
  access_allowed boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contractor_workers_status_check check (status in ('Active','Blocked','Suspended','Left')),
  unique(contractor_id,worker_no)
);

create table if not exists public.contractor_documents (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  worker_id uuid references public.contractor_workers(id) on delete cascade,
  document_type text not null,
  reference_no text,
  issue_date date,
  expiry_date date,
  status text not null default 'Pending',
  critical_for_access boolean not null default false,
  file_url text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contractor_documents_status_check check (status in ('Valid','Expired','Pending','Rejected'))
);

create table if not exists public.contractor_scorecards (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  month integer not null,
  year integer not null,
  inspections integer not null default 0,
  violations integer not null default 0,
  incidents integer not null default 0,
  overdue_actions integer not null default 0,
  training_compliance numeric(5,2) not null default 100,
  score numeric(5,2) not null default 100,
  rating text not null default 'Excellent',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contractor_scorecards_month_check check (month between 1 and 12),
  constraint contractor_scorecards_score_check check (score between 0 and 100),
  unique(contractor_id,month,year)
);

create index if not exists idx_contractors_status_expiry on public.contractors(status,contract_end,insurance_expiry);
create index if not exists idx_contractor_workers_access on public.contractor_workers(contractor_id,access_allowed,status);
create index if not exists idx_contractor_documents_expiry on public.contractor_documents(status,expiry_date,critical_for_access);
create index if not exists idx_contractor_scorecards on public.contractor_scorecards(contractor_id,year desc,month desc);

create or replace function public.touch_contractor_ops_updated_at()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$ begin new.updated_at:=now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['contractors','contractor_workers','contractor_documents','contractor_scorecards']
  loop
    execute format('drop trigger if exists trg_touch_%I on public.%I',t,t);
    execute format('create trigger trg_touch_%I before update on public.%I for each row execute function public.touch_contractor_ops_updated_at()',t,t);
  end loop;
end $$;

create or replace function private.evaluate_contractor_compliance()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare c integer:=0;
declare r record;
declare expired_critical integer;
declare reason text;
begin
  update public.contractor_documents
  set status='Expired',updated_at=now()
  where status='Valid' and expiry_date is not null and expiry_date<current_date;

  update public.contractors
  set status='Expired',updated_at=now()
  where status not in ('Blocked','Suspended') and contract_end is not null and contract_end<current_date;

  for r in select * from public.contractor_workers where status<>'Left' loop
    select count(*) into expired_critical
    from public.contractor_documents d
    where d.worker_id=r.id and d.critical_for_access=true
      and (d.status<>'Valid' or (d.expiry_date is not null and d.expiry_date<current_date));

    reason:=null;
    if r.induction_expiry is null or r.induction_expiry<current_date then reason:='Safety induction expired or missing';
    elsif r.medical_expiry is not null and r.medical_expiry<current_date then reason:='Medical fitness expired';
    elsif r.competency_expiry is not null and r.competency_expiry<current_date then reason:='Competency expired';
    elsif expired_critical>0 then reason:='Critical access document expired or invalid';
    end if;

    update public.contractor_workers
    set access_allowed=(reason is null),status=case when reason is null then 'Active' else 'Blocked' end,block_reason=reason,updated_at=now()
    where id=r.id;

    if reason is not null then
      perform private.create_hse_action_if_absent(
        'Contractor Worker Compliance',r.id,
        'Blocked contractor worker - '||r.name,
        reason,
        'Contractor Safety',
        'High',
        null,
        now()+interval '1 day',
        null,
        jsonb_build_object('contractorId',r.contractor_id,'workerNo',r.worker_no)
      );
      c:=c+1;
    end if;
  end loop;

  for r in select * from public.contractors where insurance_expiry is not null and insurance_expiry<current_date loop
    perform private.create_hse_action_if_absent(
      'Contractor Insurance',r.id,
      'Expired contractor insurance - '||r.name,
      'Contractor insurance has expired',
      'Contractor Safety',
      'High',
      null,
      now()+interval '1 day',
      r.created_by,
      jsonb_build_object('contractorCode',r.contractor_code,'expiry',r.insurance_expiry)
    );
    c:=c+1;
  end loop;

  return c;
end;
$$;
revoke all on function private.evaluate_contractor_compliance() from public,anon,authenticated;

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='contractor_compliance_daily' limit 1;
  if j is not null then perform cron.unschedule(j); end if;
  perform cron.schedule('contractor_compliance_daily','45 0 * * *','select private.evaluate_contractor_compliance();');
end $$;

do $$
declare t text;
begin
  foreach t in array array['contractors','contractor_workers','contractor_documents','contractor_scorecards']
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

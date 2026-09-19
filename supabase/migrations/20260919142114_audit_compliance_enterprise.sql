-- Enterprise audit and compliance management.

create table if not exists public.audit_programs (
  id uuid primary key default gen_random_uuid(),
  audit_no text not null unique,
  title text not null,
  audit_type text not null default 'Internal',
  standard text,
  department text,
  factory text,
  area text,
  lead_auditor_user_id uuid references public.users(id) on delete set null,
  planned_date date,
  completed_date date,
  status text not null default 'Planned' check (status in ('Planned','In Progress','Completed','Cancelled')),
  scope text,
  objective text,
  summary text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audit_programs(id) on delete cascade,
  finding_no text not null,
  clause text,
  finding_type text not null default 'Observation' check (finding_type in ('Major NC','Minor NC','Observation','Opportunity')),
  title text not null,
  description text,
  evidence text,
  owner_user_id uuid references public.users(id) on delete set null,
  due_date date,
  status text not null default 'Open' check (status in ('Open','In Progress','Pending Verification','Closed')),
  action_id uuid references public.hse_actions(id) on delete set null,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(audit_id,finding_no)
);

create table if not exists public.legal_requirements (
  id uuid primary key default gen_random_uuid(),
  requirement_no text not null unique,
  authority text,
  framework text,
  clause text,
  title text not null,
  requirement text not null,
  department text,
  factory text,
  owner_user_id uuid references public.users(id) on delete set null,
  applicability text not null default 'Applicable' check (applicability in ('Applicable','Not Applicable','Under Review')),
  compliance_status text not null default 'Pending' check (compliance_status in ('Compliant','Partially Compliant','Non-Compliant','Pending')),
  review_date date,
  next_review_date date,
  evidence_summary text,
  gap_description text,
  action_id uuid references public.hse_actions(id) on delete set null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.legal_requirements(id) on delete cascade,
  evidence_type text not null default 'Document',
  title text not null,
  file_url text,
  reference_no text,
  valid_from date,
  valid_until date,
  notes text,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists audit_programs_status_date_idx on public.audit_programs(status,planned_date);
create index if not exists audit_findings_audit_status_idx on public.audit_findings(audit_id,status);
create index if not exists audit_findings_due_idx on public.audit_findings(due_date) where status <> 'Closed';
create index if not exists legal_requirements_status_review_idx on public.legal_requirements(compliance_status,next_review_date);
create index if not exists compliance_evidence_requirement_idx on public.compliance_evidence(requirement_id,uploaded_at desc);

alter table public.audit_programs enable row level security;
alter table public.audit_findings enable row level security;
alter table public.legal_requirements enable row level security;
alter table public.compliance_evidence enable row level security;

grant select,insert,update,delete on public.audit_programs,public.audit_findings,public.legal_requirements,public.compliance_evidence to authenticated;

do $$
declare t text;
begin
  foreach t in array array['audit_programs','audit_findings','legal_requirements','compliance_evidence']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'',''viewer'']::text[])))',t,t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',t,t);
    execute format('create policy %I_update on public.%I for update to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',t,t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using ((select private.has_app_role(array[''admin'',''manager'']::text[])))',t,t);
  end loop;
end $$;

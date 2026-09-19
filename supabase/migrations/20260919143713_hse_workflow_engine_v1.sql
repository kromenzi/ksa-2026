-- Unified HSE workflow engine V1.
create table if not exists public.hse_workflows (
  id uuid primary key default gen_random_uuid(),
  workflow_no text not null unique default ('WF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  title text not null,
  status text not null default 'Open' check (status in ('Open','In Progress','Pending Verification','Closed','Cancelled')),
  source_type text,
  source_id uuid,
  department text,
  factory text,
  area text,
  owner_user_id uuid references public.users(id) on delete set null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.hse_workflow_links (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.hse_workflows(id) on delete cascade,
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  relation text not null default 'generated',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique(workflow_id,from_type,from_id,to_type,to_id,relation)
);

create table if not exists public.hse_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.hse_workflows(id) on delete cascade,
  event_type text not null,
  resource_type text,
  resource_id uuid,
  message text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hse_workflows_status_updated_idx on public.hse_workflows(status,updated_at desc);
create index if not exists hse_workflows_source_idx on public.hse_workflows(source_type,source_id);
create index if not exists hse_workflow_links_workflow_idx on public.hse_workflow_links(workflow_id,created_at);
create index if not exists hse_workflow_links_from_idx on public.hse_workflow_links(from_type,from_id);
create index if not exists hse_workflow_links_to_idx on public.hse_workflow_links(to_type,to_id);
create index if not exists hse_workflow_events_workflow_idx on public.hse_workflow_events(workflow_id,created_at);

alter table public.hse_workflows enable row level security;
alter table public.hse_workflow_links enable row level security;
alter table public.hse_workflow_events enable row level security;

grant select,insert,update,delete on public.hse_workflows to authenticated;
grant select,insert,update,delete on public.hse_workflow_links to authenticated;
grant select,insert on public.hse_workflow_events to authenticated;

create policy hse_workflows_select on public.hse_workflows for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
create policy hse_workflows_insert on public.hse_workflows for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
create policy hse_workflows_update on public.hse_workflows for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
create policy hse_workflows_delete on public.hse_workflows for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

create policy hse_workflow_links_select on public.hse_workflow_links for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
create policy hse_workflow_links_insert on public.hse_workflow_links for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
create policy hse_workflow_links_update on public.hse_workflow_links for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
create policy hse_workflow_links_delete on public.hse_workflow_links for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

create policy hse_workflow_events_select on public.hse_workflow_events for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));
create policy hse_workflow_events_insert on public.hse_workflow_events for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));


create sequence if not exists public.monthly_hse_task_ref_seq start with 1 increment by 1;

create or replace function public.generate_monthly_hse_task_ref()
returns text
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select 'MHT-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.monthly_hse_task_ref_seq')::text, 6, '0');
$$;

create table if not exists public.monthly_hse_tasks (
  id uuid primary key default gen_random_uuid(),
  task_no text not null unique default public.generate_monthly_hse_task_ref(),
  title_ar text not null,
  title_en text not null,
  description text,
  category text not null default 'General',
  factory text,
  department text,
  assigned_to uuid references public.users(id) on delete set null,
  backup_user_id uuid references public.users(id) on delete set null,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2020 and 2100),
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
  start_date date not null,
  due_date date not null,
  recurrence text not null default 'Monthly' check (recurrence in ('One Time','Weekly','Monthly','Quarterly','Annually','Custom')),
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Completed','Blocked','Escalated','Cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  evidence_required boolean not null default false,
  linked_module text,
  linked_record_id text,
  escalation_level integer not null default 0 check (escalation_level between 0 and 5),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  supervisor_verified_at timestamptz,
  supervisor_verified_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= start_date)
);

create table if not exists public.monthly_hse_task_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text not null,
  description text,
  category text not null default 'General',
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
  recurrence text not null default 'Monthly' check (recurrence in ('Weekly','Monthly')),
  default_start_day integer not null default 1 check (default_start_day between 1 and 31),
  default_due_day integer not null default 5 check (default_due_day between 1 and 31),
  evidence_required boolean not null default false,
  linked_module text,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_hse_task_evidence (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.monthly_hse_tasks(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  note text,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_monthly_hse_tasks_period on public.monthly_hse_tasks(year, month, due_date);
create index if not exists idx_monthly_hse_tasks_assignee on public.monthly_hse_tasks(assigned_to, year, month);
create index if not exists idx_monthly_hse_tasks_status on public.monthly_hse_tasks(status, due_date);
create index if not exists idx_monthly_hse_evidence_task on public.monthly_hse_task_evidence(task_id, created_at);

create or replace function public.touch_monthly_hse_updated_at()
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

drop trigger if exists trg_monthly_hse_tasks_updated_at on public.monthly_hse_tasks;
create trigger trg_monthly_hse_tasks_updated_at
before update on public.monthly_hse_tasks
for each row execute function public.touch_monthly_hse_updated_at();

drop trigger if exists trg_monthly_hse_templates_updated_at on public.monthly_hse_task_templates;
create trigger trg_monthly_hse_templates_updated_at
before update on public.monthly_hse_task_templates
for each row execute function public.touch_monthly_hse_updated_at();

alter table public.monthly_hse_tasks enable row level security;
alter table public.monthly_hse_task_templates enable row level security;
alter table public.monthly_hse_task_evidence enable row level security;

drop policy if exists monthly_hse_tasks_select on public.monthly_hse_tasks;
create policy monthly_hse_tasks_select
on public.monthly_hse_tasks for select to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = auth.uid() limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = auth.uid() limit 1)
  or created_by = (select id from public.users where auth_user_id = auth.uid() limit 1)
);

drop policy if exists monthly_hse_tasks_insert on public.monthly_hse_tasks;
create policy monthly_hse_tasks_insert
on public.monthly_hse_tasks for insert to authenticated
with check ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists monthly_hse_tasks_update on public.monthly_hse_tasks;
create policy monthly_hse_tasks_update
on public.monthly_hse_tasks for update to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = auth.uid() limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = auth.uid() limit 1)
)
with check (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = auth.uid() limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = auth.uid() limit 1)
);

drop policy if exists monthly_hse_tasks_delete on public.monthly_hse_tasks;
create policy monthly_hse_tasks_delete
on public.monthly_hse_tasks for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists monthly_hse_templates_select on public.monthly_hse_task_templates;
create policy monthly_hse_templates_select
on public.monthly_hse_task_templates for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));

drop policy if exists monthly_hse_templates_insert on public.monthly_hse_task_templates;
create policy monthly_hse_templates_insert
on public.monthly_hse_task_templates for insert to authenticated
with check ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists monthly_hse_templates_update on public.monthly_hse_task_templates;
create policy monthly_hse_templates_update
on public.monthly_hse_task_templates for update to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])))
with check ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists monthly_hse_templates_delete on public.monthly_hse_task_templates;
create policy monthly_hse_templates_delete
on public.monthly_hse_task_templates for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists monthly_hse_evidence_select on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_select
on public.monthly_hse_task_evidence for select to authenticated
using (
  exists (
    select 1 from public.monthly_hse_tasks t
    where t.id = task_id
      and (
        (select private.has_app_role(array['admin','manager']::text[]))
        or t.assigned_to = (select id from public.users where auth_user_id = auth.uid() limit 1)
        or t.backup_user_id = (select id from public.users where auth_user_id = auth.uid() limit 1)
        or t.created_by = (select id from public.users where auth_user_id = auth.uid() limit 1)
      )
  )
);

drop policy if exists monthly_hse_evidence_insert on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_insert
on public.monthly_hse_task_evidence for insert to authenticated
with check (
  exists (
    select 1 from public.monthly_hse_tasks t
    where t.id = task_id
      and (
        (select private.has_app_role(array['admin','manager']::text[]))
        or t.assigned_to = (select id from public.users where auth_user_id = auth.uid() limit 1)
        or t.backup_user_id = (select id from public.users where auth_user_id = auth.uid() limit 1)
      )
  )
);

drop policy if exists monthly_hse_evidence_delete on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_delete
on public.monthly_hse_task_evidence for delete to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or uploaded_by = (select id from public.users where auth_user_id = auth.uid() limit 1)
);

grant select, insert, update, delete on public.monthly_hse_tasks to authenticated;
grant select, insert, update, delete on public.monthly_hse_task_templates to authenticated;
grant select, insert, delete on public.monthly_hse_task_evidence to authenticated;
grant usage, select on sequence public.monthly_hse_task_ref_seq to authenticated, service_role;
grant all on public.monthly_hse_tasks to service_role;
grant all on public.monthly_hse_task_templates to service_role;
grant all on public.monthly_hse_task_evidence to service_role;

insert into public.monthly_hse_task_templates
(slug,title_ar,title_en,description,category,priority,recurrence,default_start_day,default_due_day,evidence_required,linked_module)
values
('workplace-inspection','تفتيش السلامة العام للمصنع','Factory Workplace Safety Inspection','Monthly planned inspection covering work areas, housekeeping, access, PPE and unsafe conditions.','Inspections','High','Monthly',1,5,true,'inspections'),
('fire-safety','فحص أنظمة ومعدات الحماية من الحريق','Fire Protection Systems Check','Verify extinguishers, fire pump records, alarms, exits and emergency equipment.','Fire Safety','High','Monthly',1,7,true,'fire-protection'),
('ncr-followup','متابعة تقارير عدم المطابقة المفتوحة','Open NCR Follow-up','Review open NCR actions, overdue corrective actions and closure evidence.','NCR Follow-up','High','Weekly',1,5,false,'ncr'),
('ptw-loto','مراجعة تصاريح العمل وعمليات LOTO','PTW & LOTO Review','Review active permits, isolation controls and LOTO compliance.','PTW / LOTO','Critical','Weekly',1,4,true,'loto'),
('tbt','تنفيذ حديث السلامة الأسبوعي TBT','Weekly Toolbox Talk','Deliver and record a toolbox talk with attendance/evidence.','TBT / Training','Medium','Weekly',1,3,true,'trainings'),
('equipment','مراجعة الرافعات الشوكية والرافعات العلوية','Forklift & Overhead Crane Safety Review','Check inspection/maintenance records, defects and certification follow-up.','Equipment Safety','High','Monthly',1,10,true,'assets'),
('electrical','تفتيش السلامة الكهربائية MV/LV','MV/LV Electrical Safety Inspection','Inspect electrical testing areas, panels, earthing, access control and LOTO readiness.','Electrical Safety','Critical','Monthly',1,12,true,'inspections'),
('contractor','متابعة سلامة المقاولين والزوار','Contractor & Visitor Safety Review','Review inductions, PPE, permits and contractor compliance.','Contractor Safety','Medium','Monthly',1,15,false,'visitors')
on conflict (slug) do update
set title_ar=excluded.title_ar,
    title_en=excluded.title_en,
    description=excluded.description,
    category=excluded.category,
    priority=excluded.priority,
    recurrence=excluded.recurrence,
    default_start_day=excluded.default_start_day,
    default_due_day=excluded.default_due_day,
    evidence_required=excluded.evidence_required,
    linked_module=excluded.linked_module,
    active=true,
    updated_at=now();

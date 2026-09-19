
alter table public.employees
  add column if not exists employee_id text,
  add column if not exists department text,
  add column if not exists factory text,
  add column if not exists section text,
  add column if not exists nationality text,
  add column if not exists joining_date date,
  add column if not exists supervisor text,
  add column if not exists phone text,
  add column if not exists medical_status text default 'Fit',
  add column if not exists ppe_issued jsonb not null default '[]'::jsonb,
  add column if not exists incidents_count integer not null default 0,
  add column if not exists ncr_count integer not null default 0,
  add column if not exists trainings_completed integer not null default 0,
  add column if not exists status text not null default 'Active',
  add column if not exists photo_url text,
  add column if not exists digital_signature text,
  add column if not exists qr_code_data text,
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.monthly_hse_tasks
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists backup_employee_id uuid references public.employees(id) on delete set null;

create unique index if not exists uq_employees_user_id
  on public.employees(user_id) where user_id is not null;

create unique index if not exists uq_employees_employee_id
  on public.employees(employee_id) where employee_id is not null;

create index if not exists idx_monthly_hse_tasks_assigned_employee
  on public.monthly_hse_tasks(assigned_employee_id, year, month);

create index if not exists idx_monthly_hse_tasks_backup_employee
  on public.monthly_hse_tasks(backup_employee_id, year, month);

create or replace function public.touch_employees_updated_at()
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

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.touch_employees_updated_at();

insert into public.employees (
  name, email, title, is_primary, user_id, employee_id, status
)
select
  u.name,
  u.email,
  initcap(u.role),
  false,
  u.id,
  'USR-' || upper(substr(replace(u.id::text,'-',''),1,8)),
  'Active'
from public.users u
where u.is_active = true
  and not exists (
    select 1 from public.employees e where e.user_id = u.id
  );

update public.monthly_hse_tasks t
set assigned_employee_id = e.id
from public.employees e
where t.assigned_employee_id is null
  and t.assigned_to is not null
  and e.user_id = t.assigned_to;

update public.monthly_hse_tasks t
set backup_employee_id = e.id
from public.employees e
where t.backup_employee_id is null
  and t.backup_user_id is not null
  and e.user_id = t.backup_user_id;

drop function if exists public.monthly_hse_assignees();

create function public.monthly_hse_assignees()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean,
  user_id uuid,
  title text,
  employee_id text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.name,
    'employee'::text as role,
    (coalesce(e.status, 'Active') = 'Active') as is_active,
    e.user_id,
    e.title,
    e.employee_id
  from public.employees e
  where coalesce(e.status, 'Active') = 'Active'
  order by e.name asc;
$$;

revoke all on function public.monthly_hse_assignees() from public, anon;
grant execute on function public.monthly_hse_assignees() to authenticated;

grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;

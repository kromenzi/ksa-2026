create extension if not exists pg_cron with schema extensions;

create table if not exists public.environmental_measurements (
  id uuid primary key default gen_random_uuid(),
  factory_name text not null,
  contractor_name text not null,
  measurement_type text not null,
  parameter_name text not null,
  unit text,
  measured_value numeric,
  limit_value numeric,
  measurement_date date not null default current_date,
  next_measurement_date date,
  compliance_status text not null default 'PENDING' check (compliance_status in ('PENDING','COMPLIANT','NON_COMPLIANT')),
  reminder_enabled boolean not null default true,
  reminder_days_before integer not null default 30 check (reminder_days_before between 1 and 365),
  notes text,
  attachment_url text,
  attachment_name text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reminder_at timestamptz
);

create index if not exists environmental_measurements_next_date_idx on public.environmental_measurements(next_measurement_date);
create index if not exists environmental_measurements_factory_idx on public.environmental_measurements(factory_name);

alter table public.environmental_measurements enable row level security;

drop policy if exists "environmental_measurements_read_authenticated" on public.environmental_measurements;
drop policy if exists "environmental_measurements_admin_manage" on public.environmental_measurements;

create policy "environmental_measurements_read_authenticated"
on public.environmental_measurements
for select to authenticated
using (true);

create policy "environmental_measurements_admin_manage"
on public.environmental_measurements
for all to authenticated
using (exists (select 1 from public.users u where u.auth_user_id = auth.uid() and u.role in ('admin','manager')))
with check (exists (select 1 from public.users u where u.auth_user_id = auth.uid() and u.role in ('admin','manager')));

create or replace function public.process_environmental_measurement_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  u record;
  due_text text;
begin
  for r in
    select *
    from public.environmental_measurements
    where reminder_enabled = true
      and next_measurement_date is not null
      and next_measurement_date <= (current_date + reminder_days_before)
      and (last_reminder_at is null or last_reminder_at < now() - interval '24 hours')
  loop
    due_text := case
      when r.next_measurement_date < current_date then 'متأخرة عن موعد القياس'
      when r.next_measurement_date = current_date then 'موعد القياس اليوم'
      else 'موعد القياس يقترب'
    end;

    for u in
      select id::text as user_id
      from public.users
      where is_active = true and role in ('admin','manager')
    loop
      insert into public.notifications (user_id, title, message, is_read, created_at)
      values (
        u.user_id,
        'تنبيه قياس بيئي',
        format('%s — مصنع: %s — المقاول: %s — نوع القياس: %s — التاريخ المستهدف: %s', due_text, r.factory_name, r.contractor_name, r.measurement_type, to_char(r.next_measurement_date,'YYYY-MM-DD')),
        false,
        now()
      );
    end loop;

    update public.environmental_measurements
    set last_reminder_at = now(), updated_at = now()
    where id = r.id;
  end loop;
end;
$$;

grant execute on function public.process_environmental_measurement_reminders() to service_role;

select cron.unschedule('environmental-measurement-reminders') where exists (select 1 from cron.job where jobname = 'environmental-measurement-reminders');
select cron.schedule('environmental-measurement-reminders', '0 * * * *', $$select public.process_environmental_measurement_reminders();$$);
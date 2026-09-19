create table if not exists public.hse_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source_type text not null,
  source_id uuid null,
  severity text not null default 'info' check (severity in ('info','warning','high','critical')),
  title text not null,
  message text null,
  department text null,
  factory text null,
  area text null,
  occurred_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hse_events_type_time on public.hse_events(event_type, occurred_at desc);
create index if not exists idx_hse_events_severity_time on public.hse_events(severity, occurred_at desc);
create index if not exists idx_hse_events_source on public.hse_events(source_type, source_id);

alter table public.hse_events enable row level security;

drop policy if exists hse_events_select on public.hse_events;
create policy hse_events_select on public.hse_events
for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer'])));

drop policy if exists hse_events_insert on public.hse_events;
create policy hse_events_insert on public.hse_events
for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.hse_events(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','whatsapp','webhook')),
  recipient text null,
  subject text null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz null,
  sent_at timestamptz null,
  last_error text null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_outbox_status_next on public.notification_outbox(status, next_attempt_at, created_at);
create index if not exists idx_notification_outbox_event on public.notification_outbox(event_id);

alter table public.notification_outbox enable row level security;

drop policy if exists notification_outbox_select on public.notification_outbox;
create policy notification_outbox_select on public.notification_outbox
for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])));

drop policy if exists notification_outbox_insert on public.notification_outbox;
create policy notification_outbox_insert on public.notification_outbox
for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));

drop policy if exists notification_outbox_update on public.notification_outbox;
create policy notification_outbox_update on public.notification_outbox
for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));

create or replace function public.enqueue_hse_notification(
  p_event_id uuid,
  p_channel text,
  p_body text,
  p_recipient text default null,
  p_subject text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_channel not in ('in_app','email','whatsapp','webhook') then
    raise exception 'Unsupported notification channel';
  end if;

  insert into public.notification_outbox(event_id, channel, recipient, subject, body, payload, created_by)
  values (
    p_event_id,
    p_channel,
    p_recipient,
    p_subject,
    p_body,
    coalesce(p_payload, '{}'::jsonb),
    (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_hse_notification(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.enqueue_hse_notification(uuid,text,text,text,text,jsonb) to authenticated;

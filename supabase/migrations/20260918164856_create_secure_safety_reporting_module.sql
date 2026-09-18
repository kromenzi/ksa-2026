create sequence if not exists public.safety_reporting_ref_seq start with 1 increment by 1;

create or replace function public.generate_safety_reporting_ref()
returns text
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select 'SR-' || to_char(current_date, 'YYYY') || '-' ||
         lpad(nextval('public.safety_reporting_ref_seq')::text, 6, '0');
$$;

create table if not exists public.safety_reporting_cases (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique default public.generate_safety_reporting_ref(),
  title text not null,
  status text not null default 'New'
    check (status in ('New','Triage','Assigned','Investigation','Action Required','Closed')),
  department text,
  date text not null default to_char(current_date, 'YYYY-MM-DD'),
  data jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_identity (
  case_id uuid primary key references public.safety_reporting_cases(id) on delete cascade,
  encrypted_payload text not null,
  iv text not null,
  auth_tag text not null,
  key_version text not null default 'v1',
  email_hmac text,
  phone_hmac text,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_tracking (
  case_id uuid primary key references public.safety_reporting_cases(id) on delete cascade,
  token_hmac text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.safety_reporting_cases(id) on delete cascade,
  sender_type text not null check (sender_type in ('reporter','hse')),
  message text not null check (char_length(message) between 1 and 4000),
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_identity_audit (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.safety_reporting_cases(id) on delete cascade,
  actor_auth_user_id uuid,
  actor_role text,
  action text not null default 'REPORTER_IDENTITY_REVEALED',
  reason text not null check (char_length(reason) between 8 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_channels (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique check (channel in ('WEB','EMAIL','WHATSAPP','INTERNAL')),
  is_enabled boolean not null default false,
  public_label_ar text,
  public_label_en text,
  destination text,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_reporting_rate_limits (
  key_hash text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 1 check (count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, action, window_start)
);

insert into public.safety_reporting_channels(channel,is_enabled,public_label_ar,public_label_en,destination)
values
 ('WEB',true,'رابط البلاغ','Web Report','/report'),
 ('EMAIL',false,'البريد الإلكتروني','Email',null),
 ('WHATSAPP',false,'واتساب','WhatsApp',null),
 ('INTERNAL',true,'بلاغ داخلي','Internal Report',null)
on conflict(channel) do update
set public_label_ar = excluded.public_label_ar,
    public_label_en = excluded.public_label_en,
    updated_at = now();

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'safety_reporting_encryption_key_v1') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'safety_reporting_encryption_key_v1',
      'AES-256-GCM key for confidential safety reporter identity'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'safety_reporting_lookup_key_v1') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'safety_reporting_lookup_key_v1',
      'HMAC key for reporter email/phone and abuse-rate identifiers'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'safety_reporting_tracking_key_v1') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'safety_reporting_tracking_key_v1',
      'HMAC key for public safety-report tracking codes'
    );
  end if;
end $$;

create or replace function public.safety_reporting_crypto_material()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, vault
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in (
    'safety_reporting_encryption_key_v1',
    'safety_reporting_lookup_key_v1',
    'safety_reporting_tracking_key_v1'
  );
$$;

create or replace function public.consume_safety_reporting_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
  v_window_seconds integer := greatest(60, least(coalesce(p_window_seconds, 3600), 86400));
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key_hash is null or length(p_key_hash) < 16 or p_action is null or length(p_action) < 1 then
    raise exception 'invalid rate limit key';
  end if;
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds
  );
  insert into public.safety_reporting_rate_limits(key_hash, action, window_start, count, updated_at)
  values (p_key_hash, left(p_action, 40), v_window_start, 1, now())
  on conflict (key_hash, action, window_start)
  do update set count = public.safety_reporting_rate_limits.count + 1, updated_at = now()
  returning count into v_count;
  return query
  select v_count <= v_limit, v_count, v_window_start + make_interval(secs => v_window_seconds);
end;
$$;

alter table public.safety_reporting_cases enable row level security;
alter table public.safety_reporting_identity enable row level security;
alter table public.safety_reporting_tracking enable row level security;
alter table public.safety_reporting_messages enable row level security;
alter table public.safety_reporting_identity_audit enable row level security;
alter table public.safety_reporting_channels enable row level security;
alter table public.safety_reporting_rate_limits enable row level security;

drop policy if exists safety_reporting_cases_select on public.safety_reporting_cases;
create policy safety_reporting_cases_select
on public.safety_reporting_cases for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));

drop policy if exists safety_reporting_cases_insert on public.safety_reporting_cases;
create policy safety_reporting_cases_insert
on public.safety_reporting_cases for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));

drop policy if exists safety_reporting_cases_update on public.safety_reporting_cases;
create policy safety_reporting_cases_update
on public.safety_reporting_cases for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor']::text[])))
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));

drop policy if exists safety_reporting_cases_delete on public.safety_reporting_cases;
create policy safety_reporting_cases_delete
on public.safety_reporting_cases for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists safety_reporting_messages_select on public.safety_reporting_messages;
create policy safety_reporting_messages_select
on public.safety_reporting_messages for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));

drop policy if exists safety_reporting_messages_insert on public.safety_reporting_messages;
create policy safety_reporting_messages_insert
on public.safety_reporting_messages for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor']::text[])));

drop policy if exists safety_reporting_messages_delete on public.safety_reporting_messages;
create policy safety_reporting_messages_delete
on public.safety_reporting_messages for delete to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists safety_reporting_identity_audit_select on public.safety_reporting_identity_audit;
create policy safety_reporting_identity_audit_select
on public.safety_reporting_identity_audit for select to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists safety_reporting_channels_select on public.safety_reporting_channels;
create policy safety_reporting_channels_select
on public.safety_reporting_channels for select to authenticated
using ((select private.has_app_role(array['admin','manager','editor','viewer']::text[])));

drop policy if exists safety_reporting_channels_update on public.safety_reporting_channels;
create policy safety_reporting_channels_update
on public.safety_reporting_channels for update to authenticated
using ((select private.has_app_role(array['admin','manager']::text[])))
with check ((select private.has_app_role(array['admin','manager']::text[])));

revoke all on public.safety_reporting_cases from anon;
revoke all on public.safety_reporting_identity from anon, authenticated;
revoke all on public.safety_reporting_tracking from anon, authenticated;
revoke all on public.safety_reporting_messages from anon;
revoke all on public.safety_reporting_identity_audit from anon;
revoke all on public.safety_reporting_channels from anon;
revoke all on public.safety_reporting_rate_limits from anon, authenticated;

grant select, insert, update, delete on public.safety_reporting_cases to authenticated;
grant select, insert, delete on public.safety_reporting_messages to authenticated;
grant select on public.safety_reporting_identity_audit to authenticated;
grant select, update on public.safety_reporting_channels to authenticated;

grant all on public.safety_reporting_cases to service_role;
grant all on public.safety_reporting_identity to service_role;
grant all on public.safety_reporting_tracking to service_role;
grant all on public.safety_reporting_messages to service_role;
grant all on public.safety_reporting_identity_audit to service_role;
grant all on public.safety_reporting_channels to service_role;
grant all on public.safety_reporting_rate_limits to service_role;

revoke all on sequence public.safety_reporting_ref_seq from anon;
grant usage, select on sequence public.safety_reporting_ref_seq to authenticated, service_role;

revoke all on function public.generate_safety_reporting_ref() from anon;
grant execute on function public.generate_safety_reporting_ref() to authenticated, service_role;

revoke all on function public.safety_reporting_crypto_material() from public, anon, authenticated;
grant execute on function public.safety_reporting_crypto_material() to service_role;

revoke all on function public.consume_safety_reporting_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_safety_reporting_rate_limit(text,text,integer,integer) to service_role;

create index if not exists idx_safety_reporting_cases_status_created
  on public.safety_reporting_cases(status, created_at desc);
create index if not exists idx_safety_reporting_cases_created_at
  on public.safety_reporting_cases(created_at desc);
create index if not exists idx_safety_reporting_cases_data_gin
  on public.safety_reporting_cases using gin(data);
create index if not exists idx_safety_reporting_messages_case_created
  on public.safety_reporting_messages(case_id, created_at);
create index if not exists idx_safety_reporting_identity_email_hmac
  on public.safety_reporting_identity(email_hmac) where email_hmac is not null;
create index if not exists idx_safety_reporting_identity_phone_hmac
  on public.safety_reporting_identity(phone_hmac) where phone_hmac is not null;
create index if not exists idx_safety_reporting_rate_limits_window
  on public.safety_reporting_rate_limits(window_start);

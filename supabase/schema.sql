-- ABDULKAREM SAFETY BOARD - production database foundation
-- Run this once in Supabase SQL Editor.
-- Do NOT put SUPABASE_SERVICE_ROLE_KEY in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'viewer' check (role in ('admin','manager','editor','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ncrs (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique,
  date date not null default current_date,
  department text not null,
  location text,
  description text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  immediate_action text,
  root_cause text,
  corrective_action text,
  corrective_actions jsonb not null default '[]'::jsonb,
  responsible_person_id uuid references public.profiles(id) on delete set null,
  due_date date,
  verification_notes text,
  closed_at timestamptz,
  image1 text,
  image2 text,
  image3 text,
  image4 text,
  status text not null default 'draft' check (status in ('draft','submitted','assigned','in_progress','closed')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_file text,
  source_metadata jsonb
);

create index if not exists ncrs_created_at_idx on public.ncrs(created_at desc);
create index if not exists ncrs_department_idx on public.ncrs(department);
create index if not exists ncrs_status_idx on public.ncrs(status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists ncrs_touch_updated_at on public.ncrs;
create trigger ncrs_touch_updated_at before update on public.ncrs
for each row execute function public.touch_updated_at();

-- RLS is enabled even though the server uses the service role. This prevents
-- accidental exposure if the client is ever connected directly to Supabase.
alter table public.profiles enable row level security;
alter table public.ncrs enable row level security;

-- No anon/authenticated direct table access is granted. All writes/read access
-- goes through the Vercel API, where role checks are enforced.
revoke all on public.profiles from anon, authenticated;
revoke all on public.ncrs from anon, authenticated;

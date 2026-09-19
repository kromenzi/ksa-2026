create table if not exists public.live_meetings (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  title text not null default 'Safety Live Meeting',
  provider text not null default 'jitsi',
  provider_room_name text not null unique,
  status text not null default 'live' check (status in ('scheduled','live','completed','cancelled')),
  created_by uuid not null references public.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.live_meetings(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  role text not null default 'participant' check (role in ('host','co_host','participant','guest')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.live_meetings(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists live_meetings_status_started_idx on public.live_meetings(status, started_at desc);
create index if not exists live_meetings_created_by_idx on public.live_meetings(created_by);
create index if not exists live_meeting_participants_meeting_idx on public.live_meeting_participants(meeting_id, joined_at);
create index if not exists live_meeting_messages_meeting_idx on public.live_meeting_messages(meeting_id, created_at);

alter table public.live_meetings enable row level security;
alter table public.live_meeting_participants enable row level security;
alter table public.live_meeting_messages enable row level security;

revoke all on table public.live_meetings from anon, authenticated;
revoke all on table public.live_meeting_participants from anon, authenticated;
revoke all on table public.live_meeting_messages from anon, authenticated;

grant select, insert, update, delete on table public.live_meetings to service_role;
grant select, insert, update, delete on table public.live_meeting_participants to service_role;
grant select, insert, update, delete on table public.live_meeting_messages to service_role;
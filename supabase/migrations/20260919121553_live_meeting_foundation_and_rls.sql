-- Live meeting foundation + RLS hardening
-- Keeps the Vercel unified API compatible with Supabase user JWT authorization.

create table if not exists public.live_meetings (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  title text not null default 'Safety Live Meeting',
  provider text not null default 'jitsi',
  provider_room_name text not null unique,
  status text not null default 'live' check (status in ('scheduled','live','completed','cancelled')),
  created_by uuid not null references public.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.live_meetings(id) on delete cascade,
  user_id uuid references public.users(id),
  display_name text not null,
  role text not null default 'participant' check (role in ('host','co_host','participant','guest')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.live_meetings(id) on delete cascade,
  user_id uuid references public.users(id),
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists live_meetings_status_started_idx
  on public.live_meetings (status, started_at desc);
create index if not exists live_meetings_created_by_idx
  on public.live_meetings (created_by);
create index if not exists live_meeting_participants_meeting_idx
  on public.live_meeting_participants (meeting_id, joined_at);
create index if not exists live_meeting_participants_user_idx
  on public.live_meeting_participants (user_id) where user_id is not null;
create index if not exists live_meeting_messages_meeting_idx
  on public.live_meeting_messages (meeting_id, created_at);
create index if not exists live_meeting_messages_user_idx
  on public.live_meeting_messages (user_id) where user_id is not null;

alter table public.live_meetings enable row level security;
alter table public.live_meeting_participants enable row level security;
alter table public.live_meeting_messages enable row level security;

grant select, insert, update, delete on public.live_meetings to authenticated;
grant select, insert, update, delete on public.live_meeting_participants to authenticated;
grant select, insert on public.live_meeting_messages to authenticated;

drop policy if exists live_meetings_no_direct_client_access on public.live_meetings;
drop policy if exists live_meeting_participants_no_direct_client_access on public.live_meeting_participants;
drop policy if exists live_meeting_messages_no_direct_client_access on public.live_meeting_messages;

drop policy if exists live_meetings_select_active_users on public.live_meetings;
drop policy if exists live_meetings_insert_hosts on public.live_meetings;
drop policy if exists live_meetings_update_owner_admin on public.live_meetings;
drop policy if exists live_meetings_delete_owner_admin on public.live_meetings;

create policy live_meetings_select_active_users
on public.live_meetings
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
  )
);

create policy live_meetings_insert_hosts
on public.live_meetings
for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.role in ('admin','manager','editor')
      and u.id = created_by
  )
);

create policy live_meetings_update_owner_admin
on public.live_meetings
for update to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (u.role = 'admin' or u.id = created_by)
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (u.role = 'admin' or u.id = created_by)
  )
);

create policy live_meetings_delete_owner_admin
on public.live_meetings
for delete to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (u.role = 'admin' or u.id = created_by)
  )
);

drop policy if exists live_meeting_participants_select_member_host on public.live_meeting_participants;
drop policy if exists live_meeting_participants_insert_self on public.live_meeting_participants;
drop policy if exists live_meeting_participants_update_self_host on public.live_meeting_participants;
drop policy if exists live_meeting_participants_delete_self_host on public.live_meeting_participants;

create policy live_meeting_participants_select_member_host
on public.live_meeting_participants
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = user_id
        or u.role = 'admin'
        or exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
        )
      )
  )
);

create policy live_meeting_participants_insert_self
on public.live_meeting_participants
for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.id = user_id
  )
  and exists (
    select 1 from public.live_meetings m
    where m.id = meeting_id
      and m.status = 'live'
  )
);

create policy live_meeting_participants_update_self_host
on public.live_meeting_participants
for update to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = user_id
        or u.role = 'admin'
        or exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
        )
      )
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = user_id
        or u.role = 'admin'
        or exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
        )
      )
  )
);

create policy live_meeting_participants_delete_self_host
on public.live_meeting_participants
for delete to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = user_id
        or u.role = 'admin'
        or exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
        )
      )
  )
);

drop policy if exists live_meeting_messages_select_members on public.live_meeting_messages;
drop policy if exists live_meeting_messages_insert_self on public.live_meeting_messages;

create policy live_meeting_messages_select_members
on public.live_meeting_messages
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.role = 'admin'
        or exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
        )
        or exists (
          select 1 from public.live_meeting_participants p
          where p.meeting_id = meeting_id
            and p.user_id = u.id
        )
      )
  )
);

create policy live_meeting_messages_insert_self
on public.live_meeting_messages
for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and u.id = user_id
      and (
        exists (
          select 1 from public.live_meetings m
          where m.id = meeting_id
            and m.created_by = u.id
            and m.status = 'live'
        )
        or exists (
          select 1 from public.live_meeting_participants p
          where p.meeting_id = meeting_id
            and p.user_id = u.id
            and p.left_at is null
        )
      )
  )
);

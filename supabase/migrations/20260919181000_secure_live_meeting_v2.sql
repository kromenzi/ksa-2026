-- Secure Live Meeting V2: app-level invite protection without exposing token hashes.

alter table public.live_meetings
  add column if not exists access_mode text not null default 'authenticated'
    check (access_mode in ('authenticated','invite_only')),
  add column if not exists join_token_hash text,
  add column if not exists waiting_room boolean not null default true;

-- Do not expose the invite hash through the authenticated Data API.
revoke select on public.live_meetings from authenticated;
grant select (
  id,room_code,title,provider,provider_room_name,status,created_by,
  started_at,ended_at,created_at,updated_at,access_mode,waiting_room
) on public.live_meetings to authenticated;

-- Existing insert/update/delete grants and RLS policies remain in force.

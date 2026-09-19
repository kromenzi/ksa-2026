create index if not exists live_meeting_participants_user_idx
  on public.live_meeting_participants(user_id)
  where user_id is not null;

create index if not exists live_meeting_messages_user_idx
  on public.live_meeting_messages(user_id)
  where user_id is not null;

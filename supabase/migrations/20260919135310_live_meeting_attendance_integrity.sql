-- Prevent duplicate active attendance rows for the same signed-in user.
create unique index if not exists live_meeting_one_active_participant_idx
  on public.live_meeting_participants (meeting_id, user_id)
  where user_id is not null and left_at is null;

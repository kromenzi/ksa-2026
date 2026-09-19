
create policy "live_meetings_no_direct_client_access"
on public.live_meetings for all to authenticated
using (false) with check (false);

create policy "live_meeting_participants_no_direct_client_access"
on public.live_meeting_participants for all to authenticated
using (false) with check (false);

create policy "live_meeting_messages_no_direct_client_access"
on public.live_meeting_messages for all to authenticated
using (false) with check (false);

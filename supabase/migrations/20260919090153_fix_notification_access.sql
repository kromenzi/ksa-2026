-- Allow authenticated users to manage their own in-app notifications.
-- Administrators may manage the shared notification inbox.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update to authenticated
using (
  (select private.has_app_role(array['admin']::text[]))
  or user_id = (select private.current_app_user_id())::text
)
with check (
  (select private.has_app_role(array['admin']::text[]))
  or user_id = (select private.current_app_user_id())::text
);

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
for delete to authenticated
using (
  (select private.has_app_role(array['admin']::text[]))
  or user_id = (select private.current_app_user_id())::text
);

grant update, delete on public.notifications to authenticated;

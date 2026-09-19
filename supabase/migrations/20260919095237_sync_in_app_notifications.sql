-- Materialize in-app outbox messages into the user-facing notifications table.
-- A NULL recipient is broadcast to active application users.
create or replace function public.materialize_in_app_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.channel <> 'in_app' then
    return new;
  end if;

  insert into public.notifications (user_id, title, message, is_read, created_at)
  select
    u.id::text,
    coalesce(new.subject, 'إشعار نظام السلامة'),
    new.body,
    false,
    coalesce(new.created_at, now())
  from public.users u
  where u.is_active = true
    and (
      new.recipient is null
      or new.recipient = u.id::text
      or new.recipient = u.auth_user_id::text
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = u.id::text
        and n.title = coalesce(new.subject, 'إشعار نظام السلامة')
        and n.message = new.body
        and n.created_at = coalesce(new.created_at, now())
    );

  return new;
end;
$$;

drop trigger if exists trg_materialize_in_app_notification on public.notification_outbox;
create trigger trg_materialize_in_app_notification
after insert or update of channel, recipient, subject, body on public.notification_outbox
for each row execute function public.materialize_in_app_notification();

-- Backfill existing in-app messages created before this trigger existed.
insert into public.notifications (user_id, title, message, is_read, created_at)
select
  u.id::text,
  coalesce(o.subject, 'إشعار نظام السلامة'),
  o.body,
  false,
  coalesce(o.created_at, now())
from public.notification_outbox o
join public.users u on u.is_active = true
where o.channel = 'in_app'
  and (o.recipient is null or o.recipient = u.id::text or o.recipient = u.auth_user_id::text)
  and not exists (
    select 1 from public.notifications n
    where n.user_id = u.id::text
      and n.title = coalesce(o.subject, 'إشعار نظام السلامة')
      and n.message = o.body
      and n.created_at = coalesce(o.created_at, now())
  );

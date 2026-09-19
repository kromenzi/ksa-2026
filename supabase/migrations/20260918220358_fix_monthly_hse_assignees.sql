
create or replace function public.monthly_hse_assignees()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.name,
    u.role::text,
    u.is_active
  from public.users u
  where u.is_active = true
    and (
      private.has_app_role(array['admin','manager']::text[])
      or u.auth_user_id = (select auth.uid())
    )
  order by u.name asc;
$$;

revoke all on function public.monthly_hse_assignees() from public;
grant execute on function public.monthly_hse_assignees() to authenticated;

-- Unify application permissions across UI, API and RLS-facing API reads.

drop policy if exists permissions_select_manager on public.permissions;
drop policy if exists permissions_select_own_role_or_manager on public.permissions;

create policy permissions_select_own_role_or_manager
on public.permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.is_active = true
      and (
        u.role in ('admin','manager')
        or u.role = permissions.role
      )
  )
);

insert into public.permissions (role,module,actions)
values
  ('admin','content',array['create','read','update','delete']),
  ('admin','documents',array['create','read','update','delete']),
  ('admin','ncr',array['create','read','update','delete']),
  ('admin','settings',array['create','read','update','delete']),
  ('admin','users',array['create','read','update','delete']),
  ('admin','violations',array['create','read','update','delete']),
  ('admin','reports',array['create','read','update','delete']),
  ('admin','employees',array['create','read','update','delete']),
  ('admin','activity',array['create','read','update','delete']),
  ('admin','assets',array['create','read','update','delete']),

  ('manager','content',array['create','read','update']),
  ('manager','documents',array['create','read','update']),
  ('manager','ncr',array['create','read','update']),
  ('manager','settings',array['read','update']),
  ('manager','users',array['read']),
  ('manager','violations',array['create','read','update']),
  ('manager','reports',array['create','read','update','delete']),
  ('manager','employees',array['create','read','update','delete']),
  ('manager','activity',array['read']),
  ('manager','assets',array['create','read','update','delete']),

  ('editor','content',array['create','read','update']),
  ('editor','documents',array['create','read','update']),
  ('editor','ncr',array['create','read','update']),
  ('editor','settings',array['read']),
  ('editor','users',array['read']),
  ('editor','violations',array['read']),
  ('editor','reports',array['create','read','update']),
  ('editor','employees',array['create','read','update']),
  ('editor','activity',array['read']),
  ('editor','assets',array['create','read','update']),

  ('viewer','content',array['read']),
  ('viewer','documents',array['read']),
  ('viewer','ncr',array['read']),
  ('viewer','settings',array['read']),
  ('viewer','users',array[]::text[]),
  ('viewer','violations',array['read']),
  ('viewer','reports',array['read']),
  ('viewer','employees',array['read']),
  ('viewer','activity',array[]::text[]),
  ('viewer','assets',array['read'])
on conflict (role,module)
do update set actions=excluded.actions;

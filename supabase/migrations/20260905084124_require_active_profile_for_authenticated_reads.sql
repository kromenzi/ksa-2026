-- Require every authenticated Data API reader to also have an active application profile.
-- This preserves read access for active admin/manager/editor/viewer profiles while
-- blocking orphan/direct Supabase Auth users that do not belong to the application.

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
      and coalesce(qual, '') in ('true', '(true)')
  loop
    execute format(
      'alter policy %I on %I.%I using ((select private.has_app_role(array[''admin'',''manager'',''editor'',''viewer''])))',
      p.policyname, p.schemaname, p.tablename
    );
  end loop;
end
$$;

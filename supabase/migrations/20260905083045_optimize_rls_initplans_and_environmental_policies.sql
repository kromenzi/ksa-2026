-- Preserve existing RLS semantics while caching stable auth values per statement.
-- Applied to production as migration 20260905083045.

do $$
declare
  p record;
  new_qual text;
  new_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
        or coalesce(qual, '') like '%auth.jwt()%'
        or coalesce(with_check, '') like '%auth.jwt()%'
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, '= auth.uid()', '= (select auth.uid())');
      new_qual := replace(new_qual, 'auth.uid() =', '(select auth.uid()) =');
      new_qual := replace(new_qual, '= auth.jwt()', '= (select auth.jwt())');
      new_qual := replace(new_qual, 'auth.jwt() =', '(select auth.jwt()) =');
    end if;

    if new_check is not null then
      new_check := replace(new_check, '= auth.uid()', '= (select auth.uid())');
      new_check := replace(new_check, 'auth.uid() =', '(select auth.uid()) =');
      new_check := replace(new_check, '= auth.jwt()', '= (select auth.jwt())');
      new_check := replace(new_check, 'auth.jwt() =', '(select auth.jwt()) =');
    end if;

    if new_qual is distinct from p.qual and new_check is distinct from p.with_check then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', p.policyname, p.schemaname, p.tablename, new_qual, new_check);
    elsif new_qual is distinct from p.qual then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, new_qual);
    elsif new_check is distinct from p.with_check then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, new_check);
    end if;
  end loop;
end
$$;

drop policy if exists "environmental_measurements_admin_manage" on public.environmental_measurements;

create policy "environmental_measurements_admin_insert"
on public.environmental_measurements
for insert to authenticated
with check ((select private.has_app_role(array['admin','manager'])));

create policy "environmental_measurements_admin_update"
on public.environmental_measurements
for update to authenticated
using ((select private.has_app_role(array['admin','manager'])))
with check ((select private.has_app_role(array['admin','manager'])));

create policy "environmental_measurements_admin_delete"
on public.environmental_measurements
for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

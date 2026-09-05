do $$
declare
  t text;
begin
  foreach t in array array['escalations','inspections','audits','compliance','loto','permits']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_insert_editor', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_editor', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_manager', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_manager', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.has_app_role(array[''admin'',''manager'',''editor''])))',
      t || '_insert_editor', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor''])))',
      t || '_update_editor', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.has_app_role(array[''admin'',''manager''])))',
      t || '_delete_manager', t
    );
  end loop;
end
$$;

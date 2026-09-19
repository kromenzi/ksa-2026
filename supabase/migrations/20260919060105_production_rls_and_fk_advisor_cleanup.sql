-- Supabase production advisor cleanup, applied to project sfdpkpqokazsegsstjfs on 2026-09-19.
-- Keeps safety-reporting identity/rate/tracking client-inaccessible, removes duplicate permissive reads,
-- optimizes Monthly HSE auth initplans, and creates missing public FK indexes.

drop policy if exists safety_reporting_identity_deny_client on public.safety_reporting_identity;
create policy safety_reporting_identity_deny_client on public.safety_reporting_identity
for all to anon, authenticated using (false) with check (false);

drop policy if exists safety_reporting_rate_limits_deny_client on public.safety_reporting_rate_limits;
create policy safety_reporting_rate_limits_deny_client on public.safety_reporting_rate_limits
for all to anon, authenticated using (false) with check (false);

drop policy if exists safety_reporting_tracking_deny_client on public.safety_reporting_tracking;
create policy safety_reporting_tracking_deny_client on public.safety_reporting_tracking
for all to anon, authenticated using (false) with check (false);

do $$
declare t text;
begin
  foreach t in array array['fire_gateways','fire_panels','fire_devices','fire_device_events','emergency_exits','emergency_exit_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))', t || '_delete', t);
  end loop;
end $$;

drop policy if exists auth_select on public.notification_rules;

drop policy if exists monthly_hse_tasks_select on public.monthly_hse_tasks;
create policy monthly_hse_tasks_select on public.monthly_hse_tasks for select to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
  or created_by = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
);

drop policy if exists monthly_hse_tasks_update on public.monthly_hse_tasks;
create policy monthly_hse_tasks_update on public.monthly_hse_tasks for update to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
)
with check (
  (select private.has_app_role(array['admin','manager']::text[]))
  or assigned_to = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
  or backup_user_id = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
);

drop policy if exists monthly_hse_evidence_select on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_select on public.monthly_hse_task_evidence for select to authenticated
using (
  exists (
    select 1 from public.monthly_hse_tasks t
    where t.id = monthly_hse_task_evidence.task_id
      and (
        (select private.has_app_role(array['admin','manager']::text[]))
        or t.assigned_to = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
        or t.backup_user_id = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
        or t.created_by = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
      )
  )
);

drop policy if exists monthly_hse_evidence_insert on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_insert on public.monthly_hse_task_evidence for insert to authenticated
with check (
  exists (
    select 1 from public.monthly_hse_tasks t
    where t.id = monthly_hse_task_evidence.task_id
      and (
        (select private.has_app_role(array['admin','manager']::text[]))
        or t.assigned_to = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
        or t.backup_user_id = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
      )
  )
);

drop policy if exists monthly_hse_evidence_delete on public.monthly_hse_task_evidence;
create policy monthly_hse_evidence_delete on public.monthly_hse_task_evidence for delete to authenticated
using (
  (select private.has_app_role(array['admin','manager']::text[]))
  or uploaded_by = (select id from public.users where auth_user_id = (select auth.uid()) limit 1)
);

do $$
declare r record; idx_name text;
begin
  for r in
    select ns.nspname schema_name, tbl.relname table_name, con.conname,
           array_agg(att.attname order by u.ord) col_names
    from pg_constraint con
    join pg_class tbl on tbl.oid=con.conrelid
    join pg_namespace ns on ns.oid=tbl.relnamespace
    join lateral unnest(con.conkey) with ordinality u(attnum,ord) on true
    join pg_attribute att on att.attrelid=con.conrelid and att.attnum=u.attnum
    where con.contype='f' and ns.nspname='public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=con.conrelid and i.indisvalid and i.indpred is null
          and (i.indkey::smallint[])[0:cardinality(con.conkey)-1]=con.conkey
      )
    group by ns.nspname,tbl.relname,con.conname,con.conkey,con.conrelid
  loop
    idx_name := 'idx_fk_' || left(r.table_name,28) || '_' || substr(md5(r.conname),1,8);
    execute format('create index if not exists %I on %I.%I (%s)', idx_name, r.schema_name, r.table_name,
      array_to_string(array(select quote_ident(x) from unnest(r.col_names) x), ', '));
  end loop;
end $$;

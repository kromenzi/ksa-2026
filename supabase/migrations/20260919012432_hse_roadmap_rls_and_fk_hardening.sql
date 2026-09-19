
do $$
declare
  r record;
  allowed_tables text[] := array[
    'hse_actions','hse_action_comments','hse_action_evidence','hse_action_history','hse_escalation_rules','hse_action_escalations',
    'ptw_permits','loto_isolations','loto_points','loto_locks',
    'inspection_templates','inspection_schedules','inspection_tasks','safety_observations',
    'equipment_assets','equipment_service_records','equipment_defects','equipment_operator_authorizations',
    'contractors','contractor_workers','contractor_documents','contractor_scorecards',
    'chemicals','chemical_sds','chemical_inventory_transactions',
    'risk_register','risk_controls',
    'site_floor_plans','emergency_assembly_points','emergency_response_incidents','emergency_response_timeline','emergency_muster_entries',
    'safety_map_points','safety_qr_registry','monthly_hse_reports'
  ];
begin
  for r in
    select tablename,policyname
    from pg_policies
    where schemaname='public'
      and cmd='ALL'
      and tablename=any(allowed_tables)
  loop
    execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename);
    execute format('drop policy if exists %I on public.%I',r.policyname||'_insert',r.tablename);
    execute format('drop policy if exists %I on public.%I',r.policyname||'_update',r.tablename);
    execute format('drop policy if exists %I on public.%I',r.policyname||'_delete',r.tablename);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',
      r.policyname||'_insert',r.tablename
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[]))) with check ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',
      r.policyname||'_update',r.tablename
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.has_app_role(array[''admin'',''manager'',''editor'']::text[])))',
      r.policyname||'_delete',r.tablename
    );
  end loop;
end $$;

do $$
declare
  r record;
  index_name text;
  allowed_tables text[] := array[
    'hse_actions','hse_action_comments','hse_action_evidence','hse_action_history','hse_escalation_rules','hse_action_escalations',
    'ptw_permits','loto_isolations','loto_points','loto_locks',
    'inspection_templates','inspection_schedules','inspection_tasks','safety_observations',
    'equipment_assets','equipment_service_records','equipment_defects','equipment_operator_authorizations',
    'contractors','contractor_workers','contractor_documents','contractor_scorecards',
    'chemicals','chemical_sds','chemical_inventory_transactions',
    'risk_register','risk_controls',
    'site_floor_plans','emergency_assembly_points','emergency_response_incidents','emergency_response_timeline','emergency_muster_entries',
    'safety_map_points','safety_qr_registry','monthly_hse_reports'
  ];
begin
  for r in
    select
      cls.relname as table_name,
      c.conname,
      string_agg(quote_ident(att.attname),',' order by x.ordinality) as columns_sql
    from pg_constraint c
    join pg_class cls on cls.oid=c.conrelid
    join pg_namespace n on n.oid=cls.relnamespace
    join lateral unnest(c.conkey) with ordinality x(attnum,ordinality) on true
    join pg_attribute att on att.attrelid=c.conrelid and att.attnum=x.attnum
    where n.nspname='public'
      and c.contype='f'
      and cls.relname=any(allowed_tables)
      and not exists (
        select 1
        from pg_index i
        where i.indrelid=c.conrelid
          and i.indisvalid
          and i.indpred is null
          and (i.indkey::smallint[] @> c.conkey)
      )
    group by cls.relname,c.conname
  loop
    index_name := 'idx_fk_' || left(r.table_name,35) || '_' || substr(md5(r.conname),1,8);
    execute format(
      'create index if not exists %I on public.%I (%s)',
      index_name,r.table_name,r.columns_sql
    );
  end loop;
end $$;

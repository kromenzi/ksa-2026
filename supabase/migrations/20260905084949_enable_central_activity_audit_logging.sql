create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.capture_activity_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_row jsonb;
  v_record_id text;
  v_action text;
  v_details text;
begin
  if v_uid is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select u.name
    into v_name
  from public.users u
  where u.auth_user_id = v_uid
  limit 1;

  if v_name is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_record_id := coalesce(
    v_row ->> 'id',
    v_row ->> 'ref_no',
    v_row ->> 'report_no',
    v_row ->> 'name',
    v_row ->> 'title',
    ''
  );

  v_action := case tg_op
    when 'INSERT' then 'إنشاء / Create'
    when 'UPDATE' then 'تعديل / Update'
    when 'DELETE' then 'حذف / Delete'
    else tg_op
  end;

  v_details := case tg_op
    when 'INSERT' then 'تم إنشاء سجل جديد في ' || tg_table_name
    when 'UPDATE' then 'تم تعديل سجل في ' || tg_table_name
    when 'DELETE' then 'تم حذف سجل من ' || tg_table_name
    else 'نشاط في ' || tg_table_name
  end;

  if v_record_id <> '' then
    v_details := v_details || ' | ID: ' || v_record_id;
  end if;

  insert into public.activity_logs(action, details, performed_by, performed_by_name, "timestamp", module)
  values (v_action, v_details, v_uid::text, v_name, now(), tg_table_name);

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.capture_activity_log() from public, anon, authenticated;

DO $$
declare
  t text;
  tables_to_audit text[] := array[
    'users','posts','sections','form_templates','reports','employees','routing_rules',
    'documents','section_config','email_config','report_settings','site_settings','plants',
    'ncr','safety_reports','departments','inspections','audits','trainings','permits','loto',
    'fire_equipment','fire_inspections','fire_maintenance_orders','fire_pump_tests',
    'environmental_measurements','employee_violations','facility_regulatory_licenses','safety_signs'
  ];
begin
  foreach t in array tables_to_audit loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists activity_audit_trigger on public.%I', t);
      execute format(
        'create trigger activity_audit_trigger after insert or update or delete on public.%I for each row execute function private.capture_activity_log()',
        t
      );
    end if;
  end loop;
end;
$$;

insert into public.activity_logs(action, details, performed_by, performed_by_name, "timestamp", module)
select
  'تهيئة / Initialize',
  'تم تفعيل سجل النشاط المركزي بنجاح / Central activity logging enabled',
  'system',
  'System',
  now(),
  'activity'
where not exists (select 1 from public.activity_logs);

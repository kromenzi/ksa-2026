do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'equipment_due_hse_event_daily'
  ) then
    perform cron.schedule(
      'equipment_due_hse_event_daily',
      '40 0 * * *',
      $cron$select public.scan_equipment_due_events();$cron$
    );
  end if;
end
$$;

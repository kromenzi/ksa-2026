create or replace function private.request_monthly_hse_report(
  p_month integer,
  p_year integer
)
returns public.monthly_hse_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  snap jsonb;
  report_row public.monthly_hse_reports;
begin
  if (select auth.uid()) is null
     or not private.has_app_role(array['admin','manager','editor']::text[]) then
    raise exception 'Insufficient permission';
  end if;

  if p_month not between 1 and 12 or p_year < 2020 or p_year > 2100 then
    raise exception 'Invalid report period';
  end if;

  actor := private.current_app_user_id();
  snap := private.build_monthly_hse_snapshot(p_month,p_year);

  insert into public.monthly_hse_reports(
    report_no,month,year,status,snapshot,generated_by,generated_at
  )
  values(
    'HSE-MR-'||p_year||'-'||lpad(p_month::text,2,'0'),
    p_month,p_year,'Generated',snap,actor,now()
  )
  on conflict(month,year)
  do update set
    snapshot=excluded.snapshot,
    generated_by=actor,
    generated_at=now(),
    updated_at=now()
  returning * into report_row;

  return report_row;
end;
$$;

revoke all on function private.request_monthly_hse_report(integer,integer) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.request_monthly_hse_report(integer,integer) to authenticated;

create or replace function public.request_monthly_hse_report(
  p_month integer,
  p_year integer
)
returns public.monthly_hse_reports
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.request_monthly_hse_report(p_month,p_year);
$$;

revoke all on function public.request_monthly_hse_report(integer,integer) from public,anon;
grant execute on function public.request_monthly_hse_report(integer,integer) to authenticated;

revoke all on function public.generate_monthly_hse_report(integer,integer) from public,anon,authenticated;
grant execute on function public.generate_monthly_hse_report(integer,integer) to postgres,service_role;

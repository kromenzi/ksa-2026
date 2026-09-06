alter table public.ncr
  add column if not exists updated_at timestamptz;

update public.ncr
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.ncr
  alter column updated_at set default now(),
  alter column updated_at set not null;

revoke all on table public.ncr from anon;
revoke all on table public.ncr from authenticated;
grant select, insert, update, delete on table public.ncr to authenticated;
grant all on table public.ncr to service_role;

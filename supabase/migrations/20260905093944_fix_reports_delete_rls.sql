drop policy if exists reports_delete_manager on public.reports;

create policy reports_delete_manager
on public.reports
for delete
to authenticated
using ((select private.has_app_role(array['admin'::text, 'manager'::text])));

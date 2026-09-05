-- Fix SOR delete authorization after public.is_admin_or_manager() was locked down.
-- The application already restricts delete requests to admin/manager roles.
-- RLS now uses the private role helper that is executable by authenticated users.

drop policy if exists safety_reports_delete_manager on public.safety_reports;

create policy safety_reports_delete_manager
on public.safety_reports
for delete
to authenticated
using ((select private.has_app_role(array['admin','manager'])));

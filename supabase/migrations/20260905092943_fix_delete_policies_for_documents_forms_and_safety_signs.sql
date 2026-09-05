grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.form_templates to authenticated;
grant select, insert, update, delete on table public.safety_signs to authenticated;

drop policy if exists documents_delete_manager on public.documents;
create policy documents_delete_manager
on public.documents
for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

drop policy if exists safety_signs_delete_manager on public.safety_signs;
create policy safety_signs_delete_manager
on public.safety_signs
for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

drop policy if exists form_templates_insert_editor on public.form_templates;
create policy form_templates_insert_editor
on public.form_templates
for insert to authenticated
with check ((select private.has_app_role(array['admin','manager','editor'])));

drop policy if exists form_templates_update_editor on public.form_templates;
create policy form_templates_update_editor
on public.form_templates
for update to authenticated
using ((select private.has_app_role(array['admin','manager','editor'])))
with check ((select private.has_app_role(array['admin','manager','editor'])));

drop policy if exists form_templates_delete_manager on public.form_templates;
create policy form_templates_delete_manager
on public.form_templates
for delete to authenticated
using ((select private.has_app_role(array['admin','manager'])));

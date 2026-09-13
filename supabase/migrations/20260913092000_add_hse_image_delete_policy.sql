drop policy if exists "board_uploads_hse_image_delete" on storage.objects;

create policy "board_uploads_hse_image_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'board-uploads'
  and (storage.foldername(name))[1] = 'hse-images'
  and (
    (select private.has_app_role(array['admin'::text, 'manager'::text]))
    or (
      (select private.has_app_role(array['editor'::text]))
      and owner_id = (select auth.uid()::text)
    )
  )
);

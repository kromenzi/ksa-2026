create index if not exists idx_hse_events_created_by on public.hse_events(created_by);
create index if not exists idx_notification_outbox_created_by on public.notification_outbox(created_by);

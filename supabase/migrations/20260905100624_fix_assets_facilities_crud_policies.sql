drop policy if exists assets_delete_manager on public.assets;
create policy assets_delete_manager on public.assets for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists visitors_delete_manager on public.visitors;
create policy visitors_delete_manager on public.visitors for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists emergency_insert_editor on public.emergency;
create policy emergency_insert_editor on public.emergency for insert to authenticated with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists emergency_update_editor on public.emergency;
create policy emergency_update_editor on public.emergency for update to authenticated using ((select private.has_app_role(array['admin','manager','editor']::text[]))) with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists emergency_delete_manager on public.emergency;
create policy emergency_delete_manager on public.emergency for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_equipment_delete_manager on public.fire_equipment;
create policy fire_equipment_delete_manager on public.fire_equipment for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_inspections_delete_manager on public.fire_inspections;
create policy fire_inspections_delete_manager on public.fire_inspections for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_pump_tests_delete_manager on public.fire_pump_tests;
create policy fire_pump_tests_delete_manager on public.fire_pump_tests for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_maintenance_orders_delete_manager on public.fire_maintenance_orders;
create policy fire_maintenance_orders_delete_manager on public.fire_maintenance_orders for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_alarm_zones_insert_editor on public.fire_alarm_zones;
create policy fire_alarm_zones_insert_editor on public.fire_alarm_zones for insert to authenticated with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists fire_alarm_zones_update_editor on public.fire_alarm_zones;
create policy fire_alarm_zones_update_editor on public.fire_alarm_zones for update to authenticated using ((select private.has_app_role(array['admin','manager','editor']::text[]))) with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists fire_alarm_zones_delete_manager on public.fire_alarm_zones;
create policy fire_alarm_zones_delete_manager on public.fire_alarm_zones for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

drop policy if exists fire_alerts_insert_editor on public.fire_alerts;
create policy fire_alerts_insert_editor on public.fire_alerts for insert to authenticated with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists fire_alerts_update_editor on public.fire_alerts;
create policy fire_alerts_update_editor on public.fire_alerts for update to authenticated using ((select private.has_app_role(array['admin','manager','editor']::text[]))) with check ((select private.has_app_role(array['admin','manager','editor']::text[])));
drop policy if exists fire_alerts_delete_manager on public.fire_alerts;
create policy fire_alerts_delete_manager on public.fire_alerts for delete to authenticated using ((select private.has_app_role(array['admin','manager']::text[])));

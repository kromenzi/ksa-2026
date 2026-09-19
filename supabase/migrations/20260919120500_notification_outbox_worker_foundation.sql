create or replace function public.claim_notification_outbox(p_limit integer default 25)
returns setof public.notification_outbox language plpgsql security definer set search_path=public as $$
begin
 return query with picked as (select id from public.notification_outbox where status='pending' and coalesce(next_attempt_at,now())<=now() order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,25),100))), updated as (update public.notification_outbox o set status='processing',attempts=coalesce(o.attempts,0)+1,updated_at=now() from picked p where o.id=p.id returning o.*) select * from updated;
end $$;
create or replace function public.complete_notification_outbox(p_id uuid) returns void language sql security definer set search_path=public as $$ update public.notification_outbox set status='sent',sent_at=now(),last_error=null,updated_at=now() where id=p_id and status='processing'; $$;
create or replace function public.retry_notification_outbox(p_id uuid,p_error text) returns void language sql security definer set search_path=public as $$ update public.notification_outbox set status=case when attempts>=5 then 'failed' else 'pending' end,last_error=left(coalesce(p_error,'delivery failed'),1000),next_attempt_at=case when attempts>=5 then next_attempt_at else now()+make_interval(mins=>least(60,greatest(1,(power(2,greatest(attempts-1,0)))::int))) end,updated_at=now() where id=p_id and status='processing'; $$;
create or replace function public.process_in_app_notification_outbox(p_limit integer default 100) returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 with done as (update public.notification_outbox set status='sent',sent_at=now(),last_error=null,attempts=coalesce(attempts,0)+1,updated_at=now() where id in (select id from public.notification_outbox where status='pending' and channel='in_app' and coalesce(next_attempt_at,now())<=now() order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,100),500))) returning 1) select count(*) into v_count from done; return v_count;
end $$;
revoke all on function public.claim_notification_outbox(integer) from public,anon,authenticated;
revoke all on function public.complete_notification_outbox(uuid) from public,anon,authenticated;
revoke all on function public.retry_notification_outbox(uuid,text) from public,anon,authenticated;
revoke all on function public.process_in_app_notification_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid) to service_role;
grant execute on function public.retry_notification_outbox(uuid,text) to service_role;
grant execute on function public.process_in_app_notification_outbox(integer) to service_role;
do $$ begin if not exists(select 1 from cron.job where jobname='notification_in_app_worker') then perform cron.schedule('notification_in_app_worker','*/5 * * * *',$cron$select public.process_in_app_notification_outbox();$cron$); end if; end $$;

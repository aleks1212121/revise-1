-- Run once after admin.sql. Push keys remain server-side; no extra paid service.
begin;
create extension if not exists pg_net with schema extensions;
create table if not exists public.study_push_config (
 id boolean primary key default true check(id),
 function_url text not null,
 hook_secret text not null,
 vapid_public text not null,
 vapid_private text not null
);
create table if not exists public.study_push_subscriptions (
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null,
 subscription jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(user_id,endpoint)
);
alter table public.study_push_subscriptions add column if not exists ready_enabled boolean not null default false;
alter table public.study_push_subscriptions add column if not exists inbox_enabled boolean not null default true;
alter table public.study_push_config enable row level security;
alter table public.study_push_subscriptions enable row level security;
revoke all on public.study_push_config,public.study_push_subscriptions from public,anon,authenticated;
grant select on public.study_admins,public.lecture_submissions,public.study_decks to service_role;
grant select,insert,update,delete on public.study_push_config,public.study_push_subscriptions to service_role;
create or replace function public.save_study_push_preferences(p_subscription jsonb,p_ready boolean,p_inbox boolean)
returns void language plpgsql security definer set search_path='' as $$
declare subscription_endpoint text:=p_subscription->>'endpoint';
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_inbox is true and not public.is_study_admin() then raise exception 'Admin access required'; end if;
 if length(p_subscription::text)>4096 or subscription_endpoint is null or length(subscription_endpoint)>2048
 or subscription_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com|web\.push\.apple\.com)/[^[:space:]]+$'
 or coalesce(p_subscription->'keys'->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}=?$'
 or coalesce(p_subscription->'keys'->>'auth','') !~ '^[A-Za-z0-9_-]{22}={0,2}$'
 then raise exception 'Invalid browser push subscription'; end if;
 insert into public.study_push_subscriptions(user_id,endpoint,subscription,ready_enabled,inbox_enabled)
 values(auth.uid(),subscription_endpoint,p_subscription,coalesce(p_ready,false),coalesce(p_inbox,false))
 on conflict(user_id,endpoint) do update set subscription=excluded.subscription,updated_at=now(),
 ready_enabled=coalesce(p_ready,study_push_subscriptions.ready_enabled),inbox_enabled=coalesce(p_inbox,study_push_subscriptions.inbox_enabled);
end;$$;
create or replace function public.save_study_push_subscription(p_subscription jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin perform public.save_study_push_preferences(p_subscription,null,true);end;$$;
create or replace function public.save_study_deck_ready_subscription(p_subscription jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin perform public.save_study_push_preferences(p_subscription,true,null);end;$$;
create or replace function public.remove_study_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 update public.study_push_subscriptions set inbox_enabled=false where user_id=auth.uid() and endpoint=p_endpoint;
 delete from public.study_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint and not ready_enabled;
end;$$;
create or replace function public.remove_study_deck_ready_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.study_push_subscriptions set ready_enabled=false where user_id=auth.uid() and endpoint=p_endpoint;
 delete from public.study_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint and not inbox_enabled;
end;$$;
create or replace function public.study_push_subscription_enabled(p_endpoint text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 return exists(select 1 from public.study_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint and inbox_enabled);
end;$$;
create or replace function public.study_deck_ready_subscription_enabled(p_endpoint text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 return exists(select 1 from public.study_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint and ready_enabled);
end;$$;
revoke all on function public.save_study_push_preferences(jsonb,boolean,boolean) from public,anon,authenticated;
revoke all on function public.save_study_push_subscription(jsonb),public.remove_study_push_subscription(text),public.study_push_subscription_enabled(text),public.save_study_deck_ready_subscription(jsonb),public.remove_study_deck_ready_subscription(text),public.study_deck_ready_subscription_enabled(text) from public,anon;
grant execute on function public.save_study_push_subscription(jsonb),public.remove_study_push_subscription(text),public.study_push_subscription_enabled(text),public.save_study_deck_ready_subscription(jsonb),public.remove_study_deck_ready_subscription(text),public.study_deck_ready_subscription_enabled(text) to authenticated;
create or replace function public.notify_study_slide_inbox()
returns trigger language plpgsql security definer set search_path='' as $$
declare config public.study_push_config%rowtype;
begin
 select * into config from public.study_push_config where id=true;
 if not found then return new; end if;
 perform net.http_post(url:=config.function_url,headers:=jsonb_build_object('Content-Type','application/json','x-chuds-push-hook',config.hook_secret),body:=jsonb_build_object('action','notify','submission_id',new.id),timeout_milliseconds:=10000);
 return new;
exception when others then
 -- A notification outage must never prevent a student uploading their slides.
 raise warning 'CHUDS push notification request could not be queued';
 return new;
end;$$;
revoke all on function public.notify_study_slide_inbox() from public,anon,authenticated;
drop trigger if exists study_slide_push on public.lecture_submissions;
create trigger study_slide_push after insert on public.lecture_submissions for each row execute function public.notify_study_slide_inbox();
create or replace function public.notify_study_deck_ready()
returns trigger language plpgsql security definer set search_path='' as $$
declare config public.study_push_config%rowtype;
begin
 if new.status<>'completed' or old.status='completed' then return new; end if;
 -- Send only when the fresh deck actually exists in its original sender's account.
 if not exists(select 1 from public.study_decks where user_id=new.user_id and lecture_id='submission-'||new.id::text) then return new; end if;
 select * into config from public.study_push_config where id=true;
 if not found then return new; end if;
 perform net.http_post(url:=config.function_url,headers:=jsonb_build_object('Content-Type','application/json','x-chuds-push-hook',config.hook_secret),body:=jsonb_build_object('action','deck-ready','submission_id',new.id),timeout_milliseconds:=10000);
 return new;
exception when others then
 raise warning 'CHUDS deck-ready notification could not be queued';
 return new;
end;$$;
revoke all on function public.notify_study_deck_ready() from public,anon,authenticated;
drop trigger if exists study_deck_ready_push on public.lecture_submissions;
create trigger study_deck_ready_push after update of status on public.lecture_submissions for each row execute function public.notify_study_deck_ready();
commit;

-- Run AFTER setup.sql in your Supabase SQL Editor. Safe to run again.
create table if not exists public.study_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Student' check(length(display_name) between 1 and 30),
 friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))
);
create table if not exists public.study_friendships (
 requester uuid not null references public.study_profiles(user_id) on delete cascade,
 recipient uuid not null references public.study_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 primary key(requester,recipient),check(requester<>recipient)
);
alter table public.study_profiles enable row level security;
alter table public.study_friendships enable row level security;
revoke all on public.study_profiles,public.study_friendships from public,anon,authenticated;
grant select on public.study_profiles,public.study_friendships to authenticated;
drop policy if exists "Read own study profile" on public.study_profiles;
create policy "Read own study profile" on public.study_profiles for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "Read own friendships" on public.study_friendships;
create policy "Read own friendships" on public.study_friendships for select to authenticated using (requester=(select auth.uid()) or recipient=(select auth.uid()));

-- Private helper. Only the checked dashboard RPC may call it for other users.
create or replace function public._study_social_summary(owner_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
 today text:=to_char(now() at time zone 'Europe/London','YYYY-MM-DD');
 cursor_day date; streak_count integer:=0; history jsonb; totals jsonb;
begin
 with card_rows as (
  select d.lecture_id,c,
   case when c->>'slide' ~ '^[1-9][0-9]{0,8}$' then (c->>'slide')::integer else 0 end slide,
   (case when c->>'reviews' ~ '^[0-9]{1,15}$' then (c->>'reviews')::bigint>0 else false end
    or case when c->>'lastReviewedAt' ~ '^[0-9]{1,15}$' then (c->>'lastReviewedAt')::bigint>0 else false end) reviewed
  from public.study_decks d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload->'cards')='array' then d.payload->'cards' else '[]'::jsonb end) c
  where d.user_id=owner_id
 ), source_slides as (
  select lecture_id,slide,bool_and(reviewed) complete from card_rows where slide>0 group by lecture_id,slide
 ) select jsonb_build_object('totalCards',(select count(*) from card_rows),'reviewedCards',(select count(*) from card_rows where reviewed),
  'totalSlides',(select count(*) from source_slides),'completedSlides',(select count(*) from source_slides where complete)) into totals;
 with days as (
  select d.lecture_id,activity.key study_day,card.key card_id,card.value slide
  from public.study_decks d
  cross join lateral jsonb_each(case when jsonb_typeof(d.payload->'_studyDays')='object' then d.payload->'_studyDays' else '{}'::jsonb end) activity
  cross join lateral jsonb_each(case when jsonb_typeof(activity.value)='object' then activity.value else '{}'::jsonb end) card
  where d.user_id=owner_id
 ), week as (
  select to_char((today::date - i),'YYYY-MM-DD') as study_day from generate_series(0,6) i
 ) select jsonb_agg(jsonb_build_object('day',w.study_day,'cards',(select count(*) from days x where x.study_day=w.study_day),
   'slides',(select count(distinct (x.lecture_id,x.slide)) from days x where x.study_day=w.study_day and x.slide::text ~ '^[1-9][0-9]{0,8}$')) order by w.study_day) into history from week w;
 cursor_day:=today::date;
 if (history->6->>'cards')::integer=0 then cursor_day:=cursor_day-1; end if;
 loop
  exit when not exists(select 1 from public.study_decks d where d.user_id=owner_id and
   case when jsonb_typeof(d.payload->'_studyDays'->to_char(cursor_day,'YYYY-MM-DD'))='object'
   then d.payload->'_studyDays'->to_char(cursor_day,'YYYY-MM-DD')<>'{}'::jsonb else false end);
  streak_count:=streak_count+1;cursor_day:=cursor_day-1;
  exit when streak_count>=36600;
 end loop;
 return totals||jsonb_build_object('todaySlides',(history->6->>'slides')::integer,'todayCards',(history->6->>'cards')::integer,
  'weekSlides',(select sum((x->>'slides')::integer) from jsonb_array_elements(history) x),'streak',streak_count,'history',history);
end;$$;
revoke all on function public._study_social_summary(uuid) from public,anon,authenticated;

create or replace function public.study_friends_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); own public.study_profiles%rowtype; board jsonb; requests jsonb;
begin
 if me is null then raise exception 'Sign in to use friends'; end if;
 insert into public.study_profiles(user_id) values(me) on conflict(user_id) do nothing;
 select * into own from public.study_profiles where user_id=me;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'stats',public._study_social_summary(p.user_id))),'[]'::jsonb) into board
 from public.study_profiles p where p.user_id=me or exists(select 1 from public.study_friendships f where f.status='accepted' and
 ((f.requester=me and f.recipient=p.user_id) or (f.recipient=me and f.requester=p.user_id)));
 select coalesce(jsonb_agg(jsonb_build_object('requester',f.requester,'recipient',f.recipient,'display_name',p.display_name,'incoming',f.recipient=me)),'[]'::jsonb) into requests
 from public.study_friendships f join public.study_profiles p on p.user_id=case when f.requester=me then f.recipient else f.requester end
 where f.status='pending' and (f.requester=me or f.recipient=me);
 return jsonb_build_object('profile',jsonb_build_object('user_id',me,'display_name',own.display_name,'friend_code',own.friend_code),'leaderboard',board,'requests',requests);
end;$$;

create or replace function public.set_study_display_name(new_name text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in to use friends'; end if;
 if new_name is null or length(trim(new_name)) not between 1 and 30 then raise exception 'Use a name with 1–30 characters'; end if;
 insert into public.study_profiles(user_id,display_name) values(auth.uid(),trim(new_name)) on conflict(user_id) do update set display_name=excluded.display_name;
end;$$;

create or replace function public.request_study_friend(code text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); other uuid; existing public.study_friendships%rowtype;
begin
 if me is null then raise exception 'Sign in to use friends'; end if;
 select user_id into other from public.study_profiles where friend_code=upper(regexp_replace(trim(code),'[ -]','','g'));
 if other is null then raise exception 'Friend code not found. Ask your friend to open Friends and share their code'; end if;
 if other=me then raise exception 'That is your own friend code'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(me::text,other::text)||greatest(me::text,other::text),0));
 select * into existing from public.study_friendships where (requester=me and recipient=other) or (requester=other and recipient=me);
 if found then
  if existing.status='accepted' then return 'You are already friends'; end if;
  if existing.recipient=me then return 'This person already invited you. Accept their request below'; end if;
  return 'Friend request already sent';
 end if;
 if (select count(*) from public.study_friendships where requester=me and status='pending')>=30 then raise exception 'You already have 30 pending requests. Cancel one first'; end if;
 insert into public.study_profiles(user_id) values(me) on conflict(user_id) do nothing;
 insert into public.study_friendships(requester,recipient) values(me,other);
 return 'Friend request sent';
end;$$;

create or replace function public.respond_study_friend(other_id uuid,accept boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in to use friends'; end if;
 if accept then
  update public.study_friendships set status='accepted' where requester=other_id and recipient=auth.uid() and status='pending';
  if not found then raise exception 'Incoming request not found'; end if;
 else
  delete from public.study_friendships where status='pending' and ((requester=other_id and recipient=auth.uid()) or (requester=auth.uid() and recipient=other_id));
 end if;
end;$$;

create or replace function public.remove_study_friend(other_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in to use friends'; end if;
 delete from public.study_friendships where (requester=auth.uid() and recipient=other_id) or (requester=other_id and recipient=auth.uid());
end;$$;
revoke all on function public.study_friends_dashboard(),public.set_study_display_name(text),public.request_study_friend(text),public.respond_study_friend(uuid,boolean),public.remove_study_friend(uuid) from public,anon;
grant execute on function public.study_friends_dashboard(),public.set_study_display_name(text),public.request_study_friend(text),public.respond_study_friend(uuid,boolean),public.remove_study_friend(uuid) to authenticated;

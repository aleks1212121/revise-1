-- Run after setup.sql in the Supabase SQL Editor. Safe to run again.
-- Admin codes are generated only in SQL Editor; browsers can redeem a valid code.
create table if not exists public.study_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.study_admins enable row level security;
revoke all on public.study_admins from public, anon, authenticated;

create table if not exists public.study_admin_codes (
 code_hash bytea primary key,
 expires_at timestamptz not null default now()+interval '7 days',
 redeemed_by uuid references auth.users(id) on delete cascade,
 redeemed_at timestamptz
);
alter table public.study_admin_codes enable row level security;
revoke all on public.study_admin_codes from public, anon, authenticated;

create or replace function public.is_study_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.study_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_study_admin() from public, anon;
grant execute on function public.is_study_admin() to authenticated;

create or replace function public.unlock_study_admin(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid:=auth.uid(); token public.study_admin_codes%rowtype;
begin
 if owner is null then raise exception 'Sign in first'; end if;
 if p_code is null or length(trim(p_code)) not between 20 and 200 then raise exception 'Invalid or expired admin code'; end if;
 select * into token from public.study_admin_codes where code_hash=sha256(convert_to(trim(p_code),'UTF8')) for update;
 if not found or token.expires_at<now() or token.redeemed_by is not null then raise exception 'Invalid or expired admin code'; end if;
 insert into public.study_admins(user_id) values(owner) on conflict(user_id) do nothing;
 update public.study_admin_codes set redeemed_by=owner,redeemed_at=now() where code_hash=token.code_hash;
end;
$$;
revoke all on function public.unlock_study_admin(text) from public, anon;
grant execute on function public.unlock_study_admin(text) to authenticated;

create table if not exists public.lecture_submissions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 160),
 module_id text not null default '',
 message text not null default '' check(length(message)<=2000),
 file_name text not null check(length(file_name) between 1 and 240),
 object_path text not null unique,
 file_size bigint not null check(file_size between 1 and 20971520),
 status text not null default 'received' check(status in ('received','reviewing','completed')),
 admin_reply text not null default '' check(length(admin_reply)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists lecture_submissions_user_idx on public.lecture_submissions(user_id,created_at desc);
alter table public.lecture_submissions enable row level security;
revoke all on public.lecture_submissions from public, anon, authenticated;
grant select on public.lecture_submissions to authenticated;
drop policy if exists "Own submissions or admin" on public.lecture_submissions;
create policy "Own submissions or admin" on public.lecture_submissions for select to authenticated
 using(user_id=(select auth.uid()) or (select public.is_study_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lecture-submissions','lecture-submissions',false,20971520,
 array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Upload own lecture submissions" on storage.objects;
create policy "Upload own lecture submissions" on storage.objects for insert to authenticated with check(
 bucket_id='lecture-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/source\.(pdf|pptx)$'
);
drop policy if exists "Read own lecture submissions or admin" on storage.objects;
create policy "Read own lecture submissions or admin" on storage.objects for select to authenticated using(
 bucket_id='lecture-submissions' and ((storage.foldername(name))[1]=(select auth.uid())::text
 or ((select public.is_study_admin()) and exists(select 1 from public.lecture_submissions s where s.object_path=name)))
);
drop policy if exists "Remove unsubmitted own lecture uploads" on storage.objects;
create policy "Remove unsubmitted own lecture uploads" on storage.objects for delete to authenticated using(
 bucket_id='lecture-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.lecture_submissions s where s.object_path=name)
);

create or replace function public.submit_study_lecture(p_id uuid,p_title text,p_module text,p_message text,p_file_name text,p_file_size bigint,p_extension text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner uuid:=auth.uid(); path text; uploaded_size bigint;
begin
 if owner is null then raise exception 'Sign in to send slides'; end if;
 if p_id is null or p_title is null or length(trim(p_title)) not between 1 and 160
 or p_message is null or length(p_message)>2000 or p_file_name is null or length(p_file_name) not between 1 and 240
 or p_file_size is null or p_file_size not between 1 and 20971520
 or p_extension is null or p_extension not in ('pdf','pptx')
 or lower(p_file_name) !~ ('[.]'||p_extension||'$')
 or p_module is null or p_module not in ('','pathobiology','infection-immunity','medical-genetics','physiology-research') then
  raise exception 'Invalid slide submission';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 if (select count(*) from public.lecture_submissions where user_id=owner and status<>'completed')>=10 then
  raise exception 'You already have ten pending submissions. Wait for the admin to review them.';
 end if;
 path:=owner::text||'/'||p_id::text||'/source.'||p_extension;
 select (metadata->>'size')::bigint into uploaded_size from storage.objects where bucket_id='lecture-submissions' and name=path;
 if uploaded_size is null or uploaded_size<>p_file_size then raise exception 'Upload the complete slide file before submitting'; end if;
 insert into public.lecture_submissions(id,user_id,title,module_id,message,file_name,object_path,file_size)
 values(p_id,owner,trim(p_title),p_module,p_message,p_file_name,path,p_file_size);
 return p_id;
end;
$$;
revoke all on function public.submit_study_lecture(uuid,text,text,text,text,bigint,text) from public, anon;
grant execute on function public.submit_study_lecture(uuid,text,text,text,text,bigint,text) to authenticated;

create or replace function public.review_study_submission(p_id uuid,p_status text,p_reply text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 if p_status is null or p_status not in ('received','reviewing','completed') or p_reply is null or length(p_reply)>2000 then raise exception 'Invalid review'; end if;
 update public.lecture_submissions set status=p_status,admin_reply=p_reply,updated_at=now() where id=p_id;
 if not found then raise exception 'Submission not found'; end if;
end;
$$;
revoke all on function public.review_study_submission(uuid,text,text) from public, anon;
grant execute on function public.review_study_submission(uuid,text,text) to authenticated;

create or replace function public.study_admin_dashboard(p_users_page integer default 0,p_submissions_page integer default 0,p_query text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare users_json jsonb; submissions_json jsonb; user_count bigint; submission_count bigint;
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 if p_users_page is null or p_users_page<0 or p_submissions_page is null or p_submissions_page<0 or p_query is null or length(p_query)>160 then raise exception 'Invalid page'; end if;
 select count(*) into user_count from auth.users u where position(lower(p_query) in lower(coalesce(u.email,'')))>0;
 select count(*) into submission_count from public.lecture_submissions;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into users_json from (
  select u.id,u.email,u.created_at,u.last_sign_in_at,
   exists(select 1 from public.study_admins a where a.user_id=u.id) as is_admin,
   (select count(*) from public.study_decks d where d.user_id=u.id) as decks,
   (select max(d.updated_at) from public.study_decks d where d.user_id=u.id) as last_synced_at,
   (select count(*) from public.study_decks d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload->'cards')='array' then d.payload->'cards' else '[]'::jsonb end) c
    where d.user_id=u.id and case when coalesce(c->>'reviews','0') ~ '^[0-9]+$' and length(coalesce(c->>'reviews','0'))<10 then (c->>'reviews')::bigint>0 else false end) as studied_cards
  from auth.users u where position(lower(p_query) in lower(coalesce(u.email,'')))>0
  order by u.created_at desc,u.id limit 25 offset p_users_page::bigint*25
 ) t;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into submissions_json from (
  select s.*,u.email as sender_email from public.lecture_submissions s join auth.users u on u.id=s.user_id
  order by s.created_at desc,s.id limit 25 offset p_submissions_page::bigint*25
 ) t;
 return jsonb_build_object('users',users_json,'submissions',submissions_json,'user_count',user_count,'submission_count',submission_count,
  'pending_count',(select count(*) from public.lecture_submissions where status<>'completed'));
end;
$$;
revoke all on function public.study_admin_dashboard(integer,integer,text) from public, anon;
grant execute on function public.study_admin_dashboard(integer,integer,text) to authenticated;

-- Grant your existing account admin access separately in SQL Editor:
-- insert into public.study_admins(user_id)
-- select id from auth.users where lower(email)=lower('YOUR_SIGN_IN_EMAIL')
-- on conflict(user_id) do nothing;

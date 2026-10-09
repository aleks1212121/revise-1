-- Small CHUDS admin setup. No lecture pictures to copy.
-- Run after the existing account and admin setup.
begin;
-- Run after setup.sql and admin.sql to allow admins to deliver a reviewed deck
-- to the original sender of a slide submission. No service key in the browser.
create or replace function public.deliver_study_submission(p_id uuid,p_deck jsonb,p_module_name text,p_module_code text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare submission public.lecture_submissions%rowtype; settings public.study_decks%rowtype;
 module_id text; target_lecture_id text; payload jsonb; card jsonb; fresh_cards jsonb:='[]'::jsonb;
 workspace jsonb; now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000); record_at bigint;
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 select * into submission from public.lecture_submissions where id=p_id for update;
 if not found then raise exception 'Submission not found'; end if;
 if p_deck is null or jsonb_typeof(p_deck->'cards') is distinct from 'array'
 or length(p_deck::text)>20971520 or jsonb_array_length(p_deck->'cards') not between 1 and 3000
 or p_deck->>'title' is null or length(p_deck->>'title') not between 1 and 160
 or p_module_name is null or length(trim(p_module_name)) not between 1 and 100
 or p_module_code is null or length(trim(p_module_code))>30 then raise exception 'Invalid deck or module'; end if;
 target_lecture_id:='submission-'||p_id::text;
 -- A delivery is additive: never overwrite a student's existing review history.
 if exists(select 1 from public.study_decks where user_id=submission.user_id and study_decks.lecture_id=target_lecture_id) then
  raise exception 'This submission already has a delivered deck. The existing deck and progress have been kept.';
 end if;
 for card in select value from jsonb_array_elements(p_deck->'cards') loop
  if jsonb_typeof(card) is distinct from 'object' or jsonb_typeof(card->'question') is distinct from 'string'
  or jsonb_typeof(card->'answer') is distinct from 'string' then raise exception 'Invalid card'; end if;
  fresh_cards:=fresh_cards||jsonb_build_array((card-array['id','noteId','status','dueAt','lastReviewedAt','intervalDays','reviews','lapses','lastRating','sessionRetry','scheduleVersion','_reviewAt','_contentAt'])
   ||jsonb_build_object('id',gen_random_uuid()::text,'noteId',coalesce(card->>'noteId',gen_random_uuid()::text),'status','new','_contentAt',now_ms,'_reviewAt',0));
 end loop;
 -- Serialize module creation with simultaneous delivery to the same student.
 perform pg_advisory_xact_lock(hashtextextended(submission.user_id::text,1));
 insert into public.study_decks(user_id,lecture_id,payload) values(submission.user_id,'__workspace-settings',
  jsonb_build_object('lectureId','__workspace-settings','title','Workspace settings','generation','settings','cards','[]'::jsonb,'_workspace',jsonb_build_object('modules','{}'::jsonb,'lectures','{}'::jsonb)))
 on conflict(user_id,lecture_id) do nothing;
 select * into settings from public.study_decks where user_id=submission.user_id and study_decks.lecture_id='__workspace-settings' for update;
 workspace:=coalesce(settings.payload->'_workspace',jsonb_build_object('modules','{}'::jsonb,'lectures','{}'::jsonb));
 workspace:=jsonb_build_object('modules',coalesce(workspace->'modules','{}'::jsonb),'lectures',coalesce(workspace->'lectures','{}'::jsonb));
 select key into module_id from jsonb_each(workspace->'modules')
  where coalesce(value->>'deleted','false')='false'
  and ((trim(p_module_code)<>'' and lower(value->>'code')=lower(trim(p_module_code))) or lower(value->>'name')=lower(trim(p_module_name)))
  order by key limit 1;
 if module_id is null then
  module_id:=case upper(trim(p_module_code)) when 'LS5009' then 'pathobiology' when 'LS5008' then 'infection-immunity'
   when 'LS5023' then 'medical-genetics' when 'LS5034' then 'physiology-research' else 'custom-'||gen_random_uuid()::text end;
  -- Keep an existing deleted module and its lectures in the Deleted folder.
  if workspace->'modules' ? module_id then module_id:='custom-'||gen_random_uuid()::text; end if;
  select greatest(now_ms,coalesce(max((value->>'_at')::bigint),0)+1) into record_at from jsonb_each(workspace->'modules');
  workspace:=jsonb_set(workspace,array['modules',module_id],jsonb_build_object('id',module_id,'name',trim(p_module_name),'code',trim(p_module_code),'deleted',false,'_at',record_at));
 end if;
 update public.study_decks set payload=settings.payload||jsonb_build_object('_workspace',workspace,'updatedAt',now_ms),revision=revision+1,updated_at=now()
  where user_id=submission.user_id and study_decks.lecture_id='__workspace-settings';
 payload:=jsonb_build_object('version',2,'lectureId',target_lecture_id,'title',p_deck->>'title','generation',coalesce(p_deck->>'generation','chatgpt'),
  'moduleId',module_id,'source',coalesce(p_deck->>'source',submission.file_name),'cards',fresh_cards,
  'slides',coalesce(p_deck->'slides','[]'::jsonb),'media',coalesce(p_deck->'media','{}'::jsonb),
  'updatedAt',now_ms,'_metaAt',now_ms,'_syncVersion',1);
 insert into public.study_decks(user_id,lecture_id,payload) values(submission.user_id,target_lecture_id,payload);
 update public.lecture_submissions set status='completed',admin_reply='Your flashcard deck is ready in '||trim(p_module_name)||'. Sign in and let your account sync to study it.',updated_at=now() where id=p_id;
 return target_lecture_id;
end;
$$;
revoke all on function public.deliver_study_submission(uuid,jsonb,text,text) from public,anon;
grant execute on function public.deliver_study_submission(uuid,jsonb,text,text) to authenticated;

-- Run after setup.sql and admin.sql. This RPC only reads stored data.
create or replace function public.study_admin_view_account(p_user_id uuid,p_lecture_id text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare account jsonb; workspace jsonb; lectures jsonb; deck jsonb;
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 select jsonb_build_object('id',id,'email',email) into account from auth.users where id=p_user_id;
 if account is null then raise exception 'Account not found'; end if;
 if p_lecture_id is not null then
  if p_lecture_id='__workspace-settings' then raise exception 'Choose a lecture'; end if;
  select payload into deck from public.study_decks where user_id=p_user_id and lecture_id=p_lecture_id;
  if deck is null then raise exception 'Lecture not found in this account'; end if;
  return jsonb_build_object('account',account,'deck',deck);
 end if;
 select payload->'_workspace' into workspace from public.study_decks where user_id=p_user_id and lecture_id='__workspace-settings';
 select coalesce(jsonb_agg(to_jsonb(t) order by t.title,t.lecture_id),'[]'::jsonb) into lectures from (
  select d.lecture_id,coalesce(d.payload->>'title','Untitled lecture') title,d.payload->>'moduleId' module_id,d.updated_at,
   jsonb_array_length(case when jsonb_typeof(d.payload->'cards')='array' then d.payload->'cards' else '[]'::jsonb end) card_count,
   (select count(*) from jsonb_array_elements(case when jsonb_typeof(d.payload->'cards')='array' then d.payload->'cards' else '[]'::jsonb end) c
    where c->>'status' in ('known','review') or case when coalesce(c->>'reviews','') ~ '^[0-9]+$' and length(c->>'reviews')<10 then (c->>'reviews')::bigint>0 else false end) studied_count,
   (select count(*) from jsonb_array_elements(case when jsonb_typeof(d.payload->'cards')='array' then d.payload->'cards' else '[]'::jsonb end) c where c->>'status'='known') known_count
  from public.study_decks d where d.user_id=p_user_id and d.lecture_id<>'__workspace-settings'
 ) t;
 return jsonb_build_object('account',account,'workspace',coalesce(workspace,'{"modules":{},"lectures":{}}'::jsonb),'lectures',lectures);
end;
$$;
revoke all on function public.study_admin_view_account(uuid,text) from public,anon;
grant execute on function public.study_admin_view_account(uuid,text) to authenticated;

-- A private server-side library: reviewed lecture files are not hosted on Pages.
-- Run after setup.sql, admin.sql and delivery.sql.
create table if not exists public.study_prepared_decks(
 id text primary key, source_name text not null, title text not null,
 module_name text not null,module_code text not null,payload jsonb not null,
 check(jsonb_typeof(payload->'cards')='array')
);
alter table public.study_prepared_decks enable row level security;
revoke all on public.study_prepared_decks from public,anon,authenticated;
create or replace function public.study_admin_prepared_decks()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'source_name',source_name,'title',title,'module_name',module_name,'module_code',module_code,'card_count',jsonb_array_length(payload->'cards')) order by title),'[]'::jsonb) from public.study_prepared_decks);
end;
$$;
create or replace function public.deliver_prepared_study_submission(p_id uuid,p_prepared_id text)
returns text language plpgsql security definer set search_path='' as $$
declare prepared public.study_prepared_decks%rowtype; submitted_name text;
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 select * into prepared from public.study_prepared_decks where id=p_prepared_id;
 if not found then raise exception 'Prepared deck not found'; end if;
 select file_name into submitted_name from public.lecture_submissions where id=p_id;
 if not found then raise exception 'Submission not found'; end if;
 if lower(regexp_replace(trim(submitted_name),'\s+',' ','g'))<>lower(regexp_replace(trim(prepared.source_name),'\s+',' ','g')) then
  raise exception 'This prepared deck does not match the submitted lecture file';
 end if;
 return public.deliver_study_submission(p_id,prepared.payload,prepared.module_name,prepared.module_code);
end;
$$;
revoke all on function public.study_admin_prepared_decks() from public,anon;
revoke all on function public.deliver_prepared_study_submission(uuid,text) from public,anon;
grant execute on function public.study_admin_prepared_decks() to authenticated;
grant execute on function public.deliver_prepared_study_submission(uuid,text) to authenticated;

-- Admin-only upload of a lecture pack; does not change any student's progress.
create or replace function public.stage_study_prepared_pack(p_pack jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare entry jsonb; deck jsonb; card jsonb; installed integer:=0;
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 if p_pack->>'format' is distinct from 'chuds-lecture-pack' or jsonb_typeof(p_pack->'decks') is distinct from 'array'
 or length(p_pack::text)>20971520 then raise exception 'Choose a valid lecture pack smaller than 20 MB'; end if;
 if jsonb_array_length(p_pack->'decks') not between 1 and 25 then raise exception 'A lecture pack needs 1 to 25 decks'; end if;
 for entry in select value from jsonb_array_elements(p_pack->'decks') loop
  deck:=entry->'payload';
  if entry->>'id' is null or entry->>'id' !~ '^[a-zA-Z0-9_-]{1,100}$'
  or jsonb_typeof(deck->'cards') is distinct from 'array'
  or coalesce(length(trim(deck->>'title')),0) not between 1 and 160
  or coalesce(length(trim(deck->>'source')),0) not between 1 and 300
  or coalesce(length(trim(deck->>'moduleName')),0) not between 1 and 100
  or coalesce(length(deck->>'moduleCode'),0)>30 then raise exception 'Invalid prepared lecture'; end if;
  if jsonb_array_length(deck->'cards') not between 1 and 3000 then raise exception 'Invalid card count'; end if;
  for card in select value from jsonb_array_elements(deck->'cards') loop
   if jsonb_typeof(card->'question') is distinct from 'string' or jsonb_typeof(card->'answer') is distinct from 'string' then raise exception 'Invalid prepared card'; end if;
  end loop;
  insert into public.study_prepared_decks(id,source_name,title,module_name,module_code,payload)
  values(entry->>'id',trim(deck->>'source'),trim(deck->>'title'),trim(deck->>'moduleName'),coalesce(deck->>'moduleCode',''),deck)
  on conflict(id) do update set source_name=excluded.source_name,title=excluded.title,module_name=excluded.module_name,module_code=excluded.module_code,payload=excluded.payload;
  installed:=installed+1;
 end loop;
 return installed;
end;
$$;
revoke all on function public.stage_study_prepared_pack(jsonb) from public,anon;
grant execute on function public.stage_study_prepared_pack(jsonb) to authenticated;

commit;

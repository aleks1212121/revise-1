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

-- One-time assistant inbox setup, after the existing admin and delivery setup.
begin;
-- Keep the submitter's selected personal module attached to the uploaded file.
alter table public.lecture_submissions add column if not exists module_name text not null default '';
alter table public.lecture_submissions add column if not exists module_code text not null default '';
create or replace function public.submit_study_lecture(p_id uuid,p_title text,p_module text,p_message text,p_file_name text,p_file_size bigint,p_extension text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner uuid:=auth.uid(); path text; uploaded_size bigint; chosen jsonb; name text:=''; code text:='';
begin
 if owner is null then raise exception 'Sign in to send slides'; end if;
 if p_id is null or p_title is null or length(trim(p_title)) not between 1 and 160
 or p_message is null or length(p_message)>2000 or p_file_name is null or length(p_file_name) not between 1 and 240
 or p_file_size is null or p_file_size not between 1 and 20971520
 or p_extension is null or p_extension not in ('pdf','pptx')
 or lower(p_file_name) !~ ('[.]'||p_extension||'$')
 or p_module is null or length(p_module)>150 then
  raise exception 'Invalid slide submission';
 end if;
 if p_module<>'' then
  select payload->'_workspace'->'modules'->p_module into chosen from public.study_decks where user_id=owner and lecture_id='__workspace-settings';
  if coalesce(chosen->>'deleted','false')='true' then raise exception 'Choose an active module'; end if;
  if p_module='pathobiology' then name:='Pathobiology';code:='LS5009';
  elsif p_module='infection-immunity' then name:='Infection and Immunity';code:='LS5008';
  elsif p_module='medical-genetics' then name:='Medical Genetics';code:='LS5023';
  elsif p_module='physiology-research' then name:='Medical Physiology, Research Methods and Skills';code:='LS5034';
  elsif p_module like 'custom-%' and chosen->>'id'=p_module and coalesce(length(chosen->>'name'),0) between 1 and 100 then name:=chosen->>'name';code:=coalesce(chosen->>'code','');
  else raise exception 'Choose a module from your own account'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 if (select count(*) from public.lecture_submissions where user_id=owner and status<>'completed')>=10 then
  raise exception 'You already have ten pending submissions. Wait for the admin to review them.';
 end if;
 path:=owner::text||'/'||p_id::text||'/source.'||p_extension;
 select (metadata->>'size')::bigint into uploaded_size from storage.objects where bucket_id='lecture-submissions' and storage.objects.name=path;
 if uploaded_size is null or uploaded_size<>p_file_size then raise exception 'Upload the complete slide file before submitting'; end if;
 insert into public.lecture_submissions(id,user_id,title,module_id,module_name,module_code,message,file_name,object_path,file_size)
 values(p_id,owner,trim(p_title),p_module,name,code,p_message,p_file_name,path,p_file_size);
 return p_id;
end;
$$;
revoke all on function public.submit_study_lecture(uuid,text,text,text,text,bigint,text) from public, anon;
grant execute on function public.submit_study_lecture(uuid,text,text,text,text,bigint,text) to authenticated;


-- Limited assistant access. Requires admin.sql, delivery.sql, submission-modules.sql.
create table if not exists public.study_worker_keys(
 id uuid primary key default gen_random_uuid(), token_hash bytea unique not null,
 issued_by uuid not null references auth.users(id) on delete cascade,
 label text not null,created_at timestamptz not null default now(),expires_at timestamptz not null,revoked_at timestamptz
);
alter table public.study_worker_keys enable row level security;
revoke all on public.study_worker_keys from public,anon,authenticated;
create or replace function public.issue_study_worker_access(p_label text default 'Codex slide inbox')
returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:='chuds_worker_'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); key_id uuid; expiry timestamptz:=now()+interval '30 days';
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 if p_label is null or length(trim(p_label)) not between 1 and 100 then raise exception 'Invalid key label'; end if;
 insert into public.study_worker_keys(token_hash,issued_by,label,expires_at) values(sha256(convert_to(token,'UTF8')),auth.uid(),trim(p_label),expiry) returning id into key_id;
 return jsonb_build_object('id',key_id,'key',token,'expires_at',expiry);
end;
$$;
create or replace function public.list_study_worker_access()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'expires_at',expires_at,'revoked',revoked_at is not null) order by created_at desc),'[]'::jsonb) from public.study_worker_keys where issued_by=auth.uid());
end;
$$;
create or replace function public.revoke_study_worker_access(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_study_admin() then raise exception 'Admin access required'; end if;
 update public.study_worker_keys set revoked_at=now() where id=p_id and issued_by=auth.uid();
 if not found then raise exception 'Access key not found'; end if;
end;
$$;
create or replace function public.study_worker_authority()
returns uuid language plpgsql stable security definer set search_path='' as $$
declare token text:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-chuds-worker-token',''); owner uuid;
begin
 if length(token)<40 or length(token)>200 then raise exception 'Invalid or expired inbox key'; end if;
 select k.issued_by into owner from public.study_worker_keys k join public.study_admins a on a.user_id=k.issued_by
  where k.token_hash=sha256(convert_to(token,'UTF8')) and k.revoked_at is null and k.expires_at>now();
 if owner is null then raise exception 'Invalid or expired inbox key'; end if;
 return owner;
end;
$$;
create or replace function public.study_worker_check()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.study_worker_authority();return jsonb_build_object('connected',true,'scope','submitted slides and fresh deck delivery');
end;
$$;
create or replace function public.study_worker_inbox(p_include_completed boolean default false,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.study_worker_authority();
 if p_limit is null or p_limit not between 1 and 200 then raise exception 'Invalid inbox limit'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at,t.id),'[]'::jsonb) from (
  select s.*,u.email as sender_email from public.lecture_submissions s join auth.users u on u.id=s.user_id
  where p_include_completed or s.status<>'completed' order by s.created_at,s.id limit p_limit
 ) t);
end;
$$;
create or replace function public.study_worker_submission(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.study_worker_authority();
 select to_jsonb(s)||jsonb_build_object('sender_email',u.email) into result from public.lecture_submissions s join auth.users u on u.id=s.user_id where s.id=p_id;
 if result is null then raise exception 'Submission not found'; end if;
 return result;
end;
$$;
create or replace function public.study_worker_deliver(p_id uuid,p_deck jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid:=public.study_worker_authority(); submission public.lecture_submissions%rowtype; chosen jsonb;
 name text; code text; target text; previous_sub text:=current_setting('request.jwt.claim.sub',true); previous_claims text:=current_setting('request.jwt.claims',true);
begin
 select * into submission from public.lecture_submissions where id=p_id for update;
 if not found then raise exception 'Submission not found'; end if;
 if p_deck->>'source' is distinct from submission.file_name then raise exception 'Deck source must match the original submitted filename'; end if;
 if submission.module_id<>'' then
  perform pg_advisory_xact_lock(hashtextextended(submission.user_id::text,1));
  select payload->'_workspace'->'modules'->submission.module_id into chosen from public.study_decks where user_id=submission.user_id and lecture_id='__workspace-settings' for update;
  if coalesce(chosen->>'deleted','false')='true' then raise exception 'The chosen module is deleted. Ask the sender to restore it first.'; end if;
  name:=case submission.module_id when 'pathobiology' then 'Pathobiology' when 'infection-immunity' then 'Infection and Immunity' when 'medical-genetics' then 'Medical Genetics' when 'physiology-research' then 'Medical Physiology, Research Methods and Skills' else chosen->>'name' end;
  code:=case submission.module_id when 'pathobiology' then 'LS5009' when 'infection-immunity' then 'LS5008' when 'medical-genetics' then 'LS5023' when 'physiology-research' then 'LS5034' else chosen->>'code' end;
  if name is null then raise exception 'The chosen module no longer exists'; end if;
 else
  name:=p_deck->>'moduleName';code:=coalesce(p_deck->>'moduleCode','');
 end if;
 -- Scoped delegation to the key's issuer, not a login or browser session change.
 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner)::text,true);
 target:=public.deliver_study_submission(p_id,p_deck||jsonb_build_object('title',submission.title),name,coalesce(code,''));
 if submission.module_id<>'' then
  update public.study_decks set payload=jsonb_set(payload,'{moduleId}',to_jsonb(submission.module_id)),revision=revision+1 where user_id=submission.user_id and lecture_id=target;
 end if;
 perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 return jsonb_build_object('lecture_id',target,'submission_id',p_id,'recipient',submission.user_id,'title',submission.title);
end;
$$;
revoke all on function public.issue_study_worker_access(text),public.list_study_worker_access(),public.revoke_study_worker_access(uuid) from public,anon;
grant execute on function public.issue_study_worker_access(text),public.list_study_worker_access(),public.revoke_study_worker_access(uuid) to authenticated;
revoke all on function public.study_worker_authority() from public,anon,authenticated;
revoke all on function public.study_worker_check(),public.study_worker_inbox(boolean,integer),public.study_worker_submission(uuid),public.study_worker_deliver(uuid,jsonb) from public;
grant execute on function public.study_worker_check(),public.study_worker_inbox(boolean,integer),public.study_worker_submission(uuid),public.study_worker_deliver(uuid,jsonb) to anon,authenticated;

commit;

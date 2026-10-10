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


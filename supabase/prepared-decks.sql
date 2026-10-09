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

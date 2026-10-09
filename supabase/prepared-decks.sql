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

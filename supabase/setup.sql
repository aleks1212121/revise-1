-- Run in the SQL Editor of your own Supabase project.
create table if not exists public.study_decks (
 user_id uuid not null references auth.users(id) on delete cascade,
 lecture_id text not null check (length(lecture_id) between 1 and 200),
 payload jsonb not null,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key (user_id, lecture_id)
);
alter table public.study_decks enable row level security;
revoke all on public.study_decks from anon;
grant select, insert, update on public.study_decks to authenticated;
drop policy if exists "Read own decks" on public.study_decks;
create policy "Read own decks" on public.study_decks for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own decks" on public.study_decks;
create policy "Insert own decks" on public.study_decks for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own decks" on public.study_decks;
create policy "Update own decks" on public.study_decks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Optimistic revisions prevent one device from silently overwriting another.
create or replace function public.save_study_deck(p_lecture_id text, p_payload jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare saved public.study_decks%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_lecture_id is null or length(p_lecture_id) not between 1 and 200
  or p_payload->>'lectureId' is distinct from p_lecture_id
  or jsonb_typeof(p_payload->'cards') is distinct from 'array'
  or p_expected_revision is null or p_expected_revision < 0 then
  raise exception 'Invalid lecture payload';
 end if;
 if p_expected_revision = 0 then
  insert into public.study_decks(user_id,lecture_id,payload,revision)
  values(auth.uid(),p_lecture_id,p_payload,1)
  on conflict (user_id,lecture_id) do nothing returning * into saved;
  if found then return jsonb_build_object('conflict',false,'payload',saved.payload,'revision',saved.revision); end if;
 end if;
 select * into saved from public.study_decks where user_id=auth.uid() and lecture_id=p_lecture_id for update;
 if not found then return jsonb_build_object('conflict',true,'payload',null,'revision',0); end if;
 if saved.revision <> p_expected_revision then
  return jsonb_build_object('conflict',true,'payload',saved.payload,'revision',saved.revision);
 end if;
 update public.study_decks set payload=p_payload, revision=revision+1, updated_at=now()
 where user_id=auth.uid() and lecture_id=p_lecture_id returning * into saved;
 return jsonb_build_object('conflict',false,'payload',saved.payload,'revision',saved.revision);
end;
$$;
revoke all on function public.save_study_deck(text,jsonb,bigint) from public, anon;
grant execute on function public.save_study_deck(text,jsonb,bigint) to authenticated;

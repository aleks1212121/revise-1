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

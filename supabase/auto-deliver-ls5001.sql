-- Run as project owner after installing the reviewed decks into the private library.
-- Only deliver when BOTH original filenames identify one submission each, from
-- the SAME account. Ambiguity leaves decks available for explicit inbox delivery.
do $auto$
declare motility public.lecture_submissions%rowtype; trafficking public.lecture_submissions%rowtype;
 motility_count bigint; trafficking_count bigint; admin_id uuid; previous_claim text:=current_setting('request.jwt.claim.sub',true);
begin
 select count(*) into motility_count from public.lecture_submissions where lower(trim(file_name))=lower('LS5001 - Cell motility_7623612.pdf');
 select count(*) into trafficking_count from public.lecture_submissions where lower(trim(file_name))=lower('LS5001 - Intracellular Trafficking _7623619..pdf');
 if motility_count<>1 or trafficking_count<>1 then
  raise notice 'Private library installed. Exact submission match is missing or ambiguous: use Send prepared deck beside the correct inbox submission.';
  return;
 end if;
 select * into motility from public.lecture_submissions where lower(trim(file_name))=lower('LS5001 - Cell motility_7623612.pdf');
 select * into trafficking from public.lecture_submissions where lower(trim(file_name))=lower('LS5001 - Intracellular Trafficking _7623619..pdf');
 if motility.user_id<>trafficking.user_id then
  raise notice 'Private library installed. These files came from different accounts: select the recipient explicitly in the inbox.';
  return;
 end if;
 select user_id into admin_id from public.study_admins order by user_id limit 1;
 if admin_id is null then raise exception 'Activate your admin account before installing these decks'; end if;
 -- Scoped to this owner-run transaction; no browser session or login is changed.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 if not exists(select 1 from public.study_decks where user_id=motility.user_id and lecture_id='submission-'||motility.id::text) then
  perform public.deliver_prepared_study_submission(motility.id,'ls5001-cell-motility');
 end if;
 if not exists(select 1 from public.study_decks where user_id=trafficking.user_id and lecture_id='submission-'||trafficking.id::text) then
  perform public.deliver_prepared_study_submission(trafficking.id,'ls5001-intracellular-trafficking');
 end if;
 perform set_config('request.jwt.claim.sub',coalesce(previous_claim,''),true);
 raise notice 'Both LS5001 decks are in the original submitter account. Existing delivered decks and progress were kept.';
end;
$auto$;

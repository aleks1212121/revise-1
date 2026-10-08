-- Run only in your project's Supabase SQL Editor after admin.sql.
-- Copy the returned code into My account -> Unlock admin access in CHUDS.org.
-- Each code works once and expires after seven days. Do not commit the result.
with new_code as materialized (
 select 'CHUDS-'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') as code
), inserted as (
 insert into public.study_admin_codes(code_hash)
 select sha256(convert_to(code,'UTF8')) from new_code returning code_hash
)
select code as admin_unlock_code from new_code
join inserted on inserted.code_hash=sha256(convert_to(new_code.code,'UTF8'));

import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('notification preferences stay private, inbox access requires admin, and ready alerts require a delivered recipient deck',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema net;
 create table auth.users(id uuid primary key);insert into auth.users values('${A}'),('${B}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.is_study_admin() returns boolean language sql stable as $$select auth.uid()='${A}'::uuid$$;
 create table public.study_admins(user_id uuid primary key);
 create table public.study_decks(user_id uuid,lecture_id text);
 create table public.lecture_submissions(id uuid primary key default gen_random_uuid(),user_id uuid,status text default 'received');
 create table public.test_requests(url text,headers jsonb,body jsonb);
 create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin insert into public.test_requests values(url,headers,body);return 1;end;$$;`);
 const sql=readFileSync(new URL('../supabase/notifications.sql',import.meta.url),'utf8').replace('create extension if not exists pg_net with schema extensions;','');await db.exec(sql);await db.exec(sql);
 const login=async id=>db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${id}';`);
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/device',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
 await login(B);await assert.rejects(db.query('select public.save_study_push_subscription($1)',[subscription]),/Admin access required/);
 await login(A);await assert.rejects(db.query('select * from public.study_push_config'),/permission denied/);await assert.rejects(db.query('select * from public.study_push_subscriptions'),/permission denied/);
 for(const endpoint of ['http://fcm.googleapis.com/device','https://evil.test/push','https://fcm.googleapis.com@evil.test/push','https://fcm.googleapis.com:444/push'])await assert.rejects(db.query('select public.save_study_push_subscription($1)',[{...subscription,endpoint}]),/Invalid browser/);
 await assert.rejects(db.query('select public.save_study_push_subscription($1)',[{...subscription,keys:{auth:'bad',p256dh:'bad'}}]),/Invalid browser/);
 await db.query('select public.save_study_push_subscription($1)',[subscription]);assert.equal((await db.query('select public.study_push_subscription_enabled($1) enabled',[subscription.endpoint])).rows[0].enabled,true);
 await db.query('select public.save_study_push_subscription($1)',[subscription]);await db.exec('reset role');assert.equal((await db.query('select * from public.study_push_subscriptions')).rows.length,1);
 await db.query('insert into public.lecture_submissions default values');assert.equal((await db.query('select * from public.test_requests')).rows.length,0);
 await db.query("insert into public.study_push_config values(true,'https://project.supabase.co/functions/v1/slide-notifications','server-secret','public-key','private-key')");
 const id=(await db.query('insert into public.lecture_submissions default values returning id')).rows[0].id;
 const request=(await db.query('select * from public.test_requests')).rows[0];assert.deepEqual(request.body,{action:'notify',submission_id:id});assert.equal(request.headers['x-chuds-push-hook'],'server-secret');assert.equal(JSON.stringify(request.body).includes('secret'),false);
 // A student opts in to their own ready alerts, without admin inbox access.
 await login(B);await db.query('select public.save_study_deck_ready_subscription($1)',[subscription]);
 assert.equal((await db.query('select public.study_deck_ready_subscription_enabled($1) enabled',[subscription.endpoint])).rows[0].enabled,true);
 await assert.rejects(db.query('select public.study_push_subscription_enabled($1)',[subscription.endpoint]),/Admin access required/);
 await assert.rejects(db.query('select public.save_study_push_preferences($1,true,true)',[subscription]),/permission denied/);
 await db.exec('reset role');await db.query('update public.lecture_submissions set user_id=$1 where id=$2',[B,id]);
 await db.query("update public.lecture_submissions set status='completed' where id=$1",[id]);assert.equal((await db.query('select * from public.test_requests')).rows.length,1,'no deck means no ready alert');
 await db.query("update public.lecture_submissions set status='reviewing' where id=$1",[id]);await db.query('insert into public.study_decks values($1,$2)',[B,'submission-'+id]);
 await db.query("update public.lecture_submissions set status='completed' where id=$1",[id]);let queued=(await db.query('select * from public.test_requests')).rows;assert.equal(queued.length,2);assert.equal(queued[1].body.action,'deck-ready');
 await db.query("update public.lecture_submissions set status='completed' where id=$1",[id]);assert.equal((await db.query('select * from public.test_requests')).rows.length,2,'repeat completed writes do not duplicate alerts');
 await login(A);await db.query('select public.save_study_deck_ready_subscription($1)',[subscription]);await db.query('select public.remove_study_push_subscription($1)',[subscription.endpoint]);assert.equal((await db.query('select public.study_deck_ready_subscription_enabled($1) enabled',[subscription.endpoint])).rows[0].enabled,true,'disabling inbox alerts preserves ready alerts');
 await db.query('select public.save_study_push_subscription($1)',[subscription]);await db.query('select public.remove_study_deck_ready_subscription($1)',[subscription.endpoint]);assert.equal((await db.query('select public.study_push_subscription_enabled($1) enabled',[subscription.endpoint])).rows[0].enabled,true,'disabling ready alerts preserves inbox alerts');
 await db.exec('reset role');
 await db.exec(`create or replace function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin raise exception 'offline';end;$$;`);await db.query('insert into public.lecture_submissions default values');assert.equal((await db.query('select * from public.lecture_submissions')).rows.length,3,'notification failures cannot block uploads');
 await login(A);await db.query('select public.remove_study_push_subscription($1)',[subscription.endpoint]);assert.equal((await db.query('select public.study_push_subscription_enabled($1) enabled',[subscription.endpoint])).rows[0].enabled,false);
 }finally{await db.close()}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {studySummary,offsetDay} from '../src/activity.js';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
test('friends database requires consent, returns accurate aggregates only, and protects private profiles/decks',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);insert into auth.users values('${A}'),('${B}'),('${C}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(readFileSync(new URL('../supabase/setup.sql',import.meta.url),'utf8'));const migration=readFileSync(new URL('../supabase/friends.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
  const today=(await db.query("select to_char(now() at time zone 'Europe/London','YYYY-MM-DD') as study_day")).rows[0].study_day;
  const login=async id=>db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${id}';`);
  const dashboard=async()=>(await db.query('select public.study_friends_dashboard() data')).rows[0].data;
  const deck={lectureId:'test',cards:[{id:'a',slide:1,reviews:1},{id:'b',slide:1},{id:'c',slide:2,lastReviewedAt:123}],_studyDays:{[today]:{a:1,b:1},[offsetDay(today,-1)]:{c:2},[offsetDay(today,1)]:{a:1}}};
  await login(A);await db.query('select public.save_study_deck($1,$2::jsonb,0)',['test',JSON.stringify(deck)]);const a=await dashboard();assert.deepEqual(a.leaderboard[0].stats,studySummary([deck],today));
  await db.query('select public.set_study_display_name($1)',['Alice']);
  await assert.rejects(db.query('select public.request_study_friend($1)',[a.profile.friend_code]),/own friend code/);
  await login(B);const b=await dashboard();await db.query('select public.set_study_display_name($1)',['Bob']);
  await login(C);await dashboard();assert.equal((await db.query('select * from public.study_profiles')).rows.length,1);assert.equal((await dashboard()).leaderboard.length,1);
  await login(A);await db.query('select public.request_study_friend($1)',[b.profile.friend_code]);await db.query('select public.request_study_friend($1)',[b.profile.friend_code]);assert.equal((await dashboard()).requests.length,1);assert.equal((await dashboard()).leaderboard.length,1);
  await assert.rejects(db.query('select public.respond_study_friend($1,true)',[B]),/Incoming request not found/);
  await login(C);await assert.rejects(db.query('select public.respond_study_friend($1,true)',[A]),/Incoming request not found/);assert.equal((await db.query('select * from public.study_friendships')).rows.length,0);
  await login(B);assert.equal((await dashboard()).requests[0].incoming,true);await db.query('select public.request_study_friend($1)',[a.profile.friend_code]);assert.equal((await dashboard()).requests.length,1);
  await db.query('select public.respond_study_friend($1,true)',[A]);const shared=await dashboard();assert.equal(shared.leaderboard.length,2);assert.deepEqual(shared.leaderboard.find(p=>p.user_id===A).stats,studySummary([deck],today));
  assert.equal(shared.leaderboard.some(p=>'friend_code'in p||'cards'in p||'email'in p),false);
  assert.equal((await db.query('select * from public.study_decks')).rows.length,0,'friend cannot read raw deck');assert.equal((await db.query('select * from public.study_profiles')).rows.length,1,'friend codes stay private');
  await assert.rejects(db.query('select public._study_social_summary($1)',[A]),/permission denied/);
  await assert.rejects(db.query('update public.study_friendships set status=\'accepted\''),/permission denied/);
  await db.query('select public.remove_study_friend($1)',[A]);assert.equal((await dashboard()).leaderboard.length,1);
  await login(A);assert.equal((await dashboard()).leaderboard.length,1);await db.query('select public.request_study_friend($1)',[b.profile.friend_code]);
  await login(B);await db.query('select public.respond_study_friend($1,false)',[A]);assert.equal((await dashboard()).requests.length,0);
  await db.exec('reset role;set role anon;');await assert.rejects(dashboard(),/permission denied/);await assert.rejects(db.query('select * from public.study_profiles'),/permission denied/);
 }finally{await db.close()}
});

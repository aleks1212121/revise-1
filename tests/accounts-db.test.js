import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('database enforces private rows, authenticated saves and optimistic revisions',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${A}'),('${B}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
 const sql=readFileSync(new URL('../supabase/setup.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 await db.exec(`set role authenticated; set request.jwt.claim.sub='${A}';`);
 const payload={lectureId:'test',cards:[{id:'one',dueAt:123}]};
 const save=async(revision,value=payload)=>(await db.query('select public.save_study_deck($1,$2::jsonb,$3) result',['test',JSON.stringify(value),revision])).rows[0].result;
 const first=await save(0);assert.equal(first.revision,1);assert.equal(first.conflict,false);
 const conflict=await save(0);assert.equal(conflict.conflict,true);assert.equal(conflict.revision,1);
 const next=await save(1,{...payload,title:'Changed'});assert.equal(next.revision,2);
 await db.exec(`set request.jwt.claim.sub='${B}';`);
 assert.equal((await db.query('select * from public.study_decks')).rows.length,0);
 await assert.rejects(db.query('insert into public.study_decks(user_id,lecture_id,payload) values($1,$2,$3::jsonb)',[A,'stolen',JSON.stringify(payload)]),/row-level security/);
 const own=await save(0);assert.equal(own.revision,1);assert.equal((await db.query('select * from public.study_decks')).rows.length,1);
 assert.equal((await db.query('update public.study_decks set revision=99 where user_id=$1',[A])).affectedRows,0);
 await db.exec('reset role; set role anon;');await assert.rejects(db.query('select * from public.study_decks'),/permission denied/);await assert.rejects(save(0),/permission denied/);
 await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${A}';`);await assert.rejects(save(2,{lectureId:'another',cards:[]}),/Invalid lecture payload/);
 }finally{await db.close()}
});

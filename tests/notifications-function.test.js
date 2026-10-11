import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {transform} from 'esbuild';import {webcrypto} from 'node:crypto';
const ADMIN='admin',STUDENT='student',ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function fixture({admin=true,configMissing=false,subscriptions=[],pushStatus=0}={}){
 let handler,config=configMissing?null:{id:true,hook_secret:'server-hook',vapid_public:'public-key',vapid_private:'private-key'},sends=[],deletes=[],keys=0;
 const createClient=(url,key)=>({auth:{getUser:async token=>['admin-session','student-session'].includes(token)?{data:{user:{id:token==='admin-session'?ADMIN:STUDENT}}}:{error:Error('bad token')}},rpc:async()=>({data:admin}),from:table=>{
  const filters={};let action='read',inserted;const chain={select(){return chain},eq(k,v){filters[k]=v;return chain},insert(value){action='insert';inserted=value;return chain},delete(){action='delete';return chain},single(){return chain},maybeSingle(){return chain},then(resolve,reject){return Promise.resolve().then(()=>{
   assert.equal(key,'server-only');
   if(table==='study_push_config'){if(action==='insert')config=inserted;return {data:config}}
   if(table==='lecture_submissions')return {data:filters.id===ID?{id:ID,user_id:STUDENT,status:'completed'}:null};
   if(table==='study_decks')return {data:filters.user_id===STUDENT?{lecture_id:'submission-'+ID}:null};
   if(table==='study_admins')return {data:[{user_id:ADMIN}]};
   if(table==='study_push_subscriptions'){if(action==='delete'){deletes.push(filters);return {data:null}}return {data:subscriptions.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v))}}
   throw Error(table);
  }).then(resolve,reject)}};return chain;
 }});
 const webpush={generateVAPIDKeys(){keys++;return {publicKey:'generated-public',privateKey:'generated-private'}},async sendNotification(sub,payload,opts){sends.push({sub,payload:JSON.parse(payload),opts});if(pushStatus)throw {statusCode:pushStatus}}};
 const source=readFileSync(new URL('../supabase/functions/slide-notifications/index.ts',import.meta.url),'utf8');const compiled=(await transform(source,{loader:'ts',format:'esm'})).code.replace(/^import.*;\n/gm,'');
 vm.runInNewContext(compiled,{createClient,webpush,Deno:{env:{get:n=>n==='SUPABASE_URL'?'https://project.supabase.co':n==='SUPABASE_SERVICE_ROLE_KEY'?'server-only':'anon'},serve:fn=>handler=fn},Response,Request,URL,TextEncoder,crypto:webcrypto,Error,Set,Uint8Array});
 const request=async(action,headers={},fields={})=>handler(new Request('https://project.supabase.co/functions/v1/slide-notifications',{method:'POST',headers,body:JSON.stringify({action,submission_id:ID,...fields})}));
 return {request,sends,deletes,keys:()=>keys};
}
const sub={user_id:ADMIN,endpoint:'https://fcm.googleapis.com/device',subscription:{endpoint:'https://fcm.googleapis.com/device',keys:{}}};
test('browser initialization verifies sign-in, restricts key creation to admins and exposes only public VAPID material',async()=>{
 const f=await fixture({configMissing:true});assert.equal((await f.request('initialize')).status,401);assert.equal((await f.request('initialize',{Authorization:'Bearer bad'})).status,401);
 const denied=await fixture({admin:false});assert.equal((await denied.request('initialize',{Authorization:'Bearer student-session'})).status,200);assert.equal((await denied.request('test',{Authorization:'Bearer student-session'})).status,403);const missing=await fixture({admin:false,configMissing:true});assert.equal((await missing.request('initialize',{Authorization:'Bearer student-session'})).status,400);
 const response=await f.request('initialize',{Authorization:'Bearer admin-session'});assert.deepEqual(await response.json(),{publicKey:'generated-public'});assert.equal(f.keys(),1);await f.request('initialize',{Authorization:'Bearer admin-session'});assert.equal(f.keys(),1,'keys never rotate during repeat enable');
 assert.equal((await f.request('initialize',{Authorization:'Bearer admin-session',Origin:'https://evil.test'})).status,403);
});
test('database hook validates its secret, notifies active admins only, and never sends slide or sender content',async()=>{
 const f=await fixture({subscriptions:[sub,{...sub,user_id:STUDENT}, {...sub,endpoint:'https://evil.test/private'}]});assert.equal((await f.request('notify')).status,401);assert.equal(f.sends.length,0);
 assert.equal((await f.request('notify',{'x-chuds-push-hook':'wrong'})).status,401);
 const r=await f.request('notify',{'x-chuds-push-hook':'server-hook'});assert.deepEqual(await r.json(),{sent:1,failed:1});assert.equal(f.sends.length,1);assert.equal(f.sends[0].opts.vapidDetails.privateKey,'private-key');assert.equal(JSON.stringify(f.sends[0].payload).includes('private-key'),false);assert.equal(f.sends[0].payload.body,'Someone uploaded lecture slides. Open your admin inbox to review them.');
 assert.equal((await f.request('notify',{'x-chuds-push-hook':'server-hook'},{submission_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'})).status,404);
});
test('test notifications target only the current admin device; expired subscriptions are removed',async()=>{
 const f=await fixture({subscriptions:[sub,{...sub,endpoint:'https://fcm.googleapis.com/other'}]});await f.request('test',{Authorization:'Bearer admin-session'},{endpoint:sub.endpoint});assert.equal(f.sends.length,1);
 const expired=await fixture({subscriptions:[sub],pushStatus:410});assert.equal((await expired.request('test',{Authorization:'Bearer admin-session'},{endpoint:sub.endpoint})).status,400);assert.equal(expired.deletes.length,1);
});

test('deck-ready alerts go only to opted-in original sender; student test is scoped to their device',async()=>{
 const recipient={...sub,user_id:STUDENT,ready_enabled:true,inbox_enabled:false};
 const f=await fixture({admin:false,subscriptions:[recipient,{...sub,ready_enabled:true},{...recipient,endpoint:'https://fcm.googleapis.com/off',ready_enabled:false}]});
 assert.equal((await f.request('deck-ready')).status,401);assert.equal(f.sends.length,0);
 const response=await f.request('deck-ready',{'x-chuds-push-hook':'server-hook'});assert.equal(response.status,200);assert.equal(f.sends.length,1);assert.equal(f.sends[0].payload.destination,'lectures');assert.equal(f.sends[0].payload.title,'Your flashcards are ready 📚');
 const testResponse=await f.request('test',{Authorization:'Bearer student-session'},{kind:'ready',endpoint:recipient.endpoint});assert.equal(testResponse.status,200);assert.equal(f.sends.length,2);
 assert.equal((await f.request('test',{Authorization:'Bearer student-session'},{kind:'ready',endpoint:'https://fcm.googleapis.com/someone-else'})).status,400);
});

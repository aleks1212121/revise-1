import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transform} from 'esbuild';
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',USER='22222222-2222-4222-8222-222222222222',TOKEN='test-worker-token-'.repeat(5);
async function fixture({authError=false,path=`${USER}/${ID}/source.pdf`}={}){
 let handler;const calls=[];const bytes=new Blob(['%PDF-1.7\nTest']);
 const createClient=(url,key,options)=>({rpc:async(name,args)=>{calls.push({name,args,key});assert.equal(options.global.headers['x-chuds-worker-token'],TOKEN);return authError?{error:{message:'Invalid or expired inbox key'}}:{data:name==='study_worker_submission'?{id:ID,user_id:USER,object_path:path,file_size:bytes.size}:{connected:true}}},storage:{from:bucket=>({download:async object=>{calls.push({bucket,object,key});return {data:bytes}}})}});
 const source=readFileSync(new URL('../supabase/functions/assistant-inbox/index.ts',import.meta.url),'utf8');const compiled=(await transform(source,{loader:'ts',format:'esm'})).code.replace(/^import.*;\n/m,'');
 vm.runInNewContext(compiled,{createClient,Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'server-only-key':name==='SUPABASE_URL'?'https://project.supabase.co':'anon-key'},serve:fn=>handler=fn},Response,Request,TextEncoder,Error});
 const request=async(action,token=TOKEN)=>handler(new Request('https://project.supabase.co/functions/v1/assistant-inbox',{method:'POST',headers:{'x-chuds-worker-token':token},body:JSON.stringify({action,submission_id:ID})}));
 return {request,calls,bytes};
}
test('inbox function gates file downloads and keeps the service key limited to submitted slides',async()=>{
 const f=await fixture();assert.equal((await f.request('download','bad')).status,401);assert.equal(f.calls.length,0);
 const response=await f.request('download');assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,f.bytes.size);assert.equal(f.calls[0].key,'anon-key');assert.equal(f.calls[1].key,'server-only-key');assert.equal(f.calls[1].bucket,'lecture-submissions');
 const blocked=await fixture({authError:true});assert.equal((await blocked.request('download')).status,401);assert.equal(blocked.calls.length,1,'storage service key is never used after invalid access');
 const wrong=await fixture({path:'other-bucket/private-file.pdf'});assert.equal((await wrong.request('download')).status,400);assert.equal(wrong.calls.length,1,'arbitrary storage paths cannot be downloaded');
});
test('inbox actions use protected scoped RPCs, without exposing server credentials',async()=>{
 const f=await fixture();for(const action of ['check','inbox','submission','deliver'])assert.equal((await f.request(action)).status,200);assert.deepEqual(f.calls.map(c=>c.name),['study_worker_check','study_worker_inbox','study_worker_submission','study_worker_deliver']);assert.ok(f.calls.every(c=>c.key==='anon-key'));assert.equal((await f.request('delete-account')).status,400);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudSync} from '../src/cloud-sync.js';
import {stampChanges,mergeDecks,cloudPayload,equivalent} from '../src/sync-model.js';
const seed=()=>stampChanges(null,{lectureId:'test',generation:'reviewed',cards:[{id:'a',text:'A',dueAt:0},{id:'b',text:'B',dueAt:0}],updatedAt:0},0);
test('sync resolves a remote revision conflict and preserves a local edit arriving during upload',async()=>{
 const initial=seed();let local={...initial,_cloudDirty:true,_cloudRevision:0},server=structuredClone(initial),revision=1,calls=0;
 const status=[];
 const client={from:()=>({select:()=>({eq:()=>({abortSignal:async()=>({data:[]})})})}),rpc:(_,args)=>({abortSignal:async()=>{
  calls++;if(args.p_expected_revision!==revision)return {data:{conflict:true,payload:server,revision}};
  local=stampChanges(local,{...local,cards:local.cards.map(c=>c.id==='b'?{...c,text:'Changed during request'}:c)},30);
  server=args.p_payload;revision++;return {data:{conflict:false,payload:server,revision}};
 }})};
 server=stampChanges(initial,{...initial,cards:initial.cards.map(c=>c.id==='a'?{...c,lastReviewedAt:20,dueAt:100,status:'known'}:c)},20);
 const storage={allLectures:async()=>[local],applyCloud:async(remote,rev)=>{const merged=mergeDecks(local,remote);local={...merged,_cloudRevision:rev,_cloudDirty:!equivalent(merged,remote)}}};
 const sync=new CloudSync({client,userId:'a',storage,onStatus:(state)=>status.push(state)});await sync.sync();sync.stop();
 assert.equal(calls,2);assert.equal(local.cards[0].dueAt,100);assert.equal(local.cards[1].text,'Changed during request');assert.equal(local._cloudDirty,true);assert.equal(status.at(-1),'pending');
});
test('network errors leave local changes pending and never report successful sync',async()=>{
 const statuses=[],sync=new CloudSync({client:{from:()=>({select:()=>({eq:()=>({abortSignal:async()=>({error:{message:'Offline'}})})})})},userId:'a',storage:{},onStatus:(state)=>statuses.push(state)});
 assert.equal(await sync.sync(),false);assert.deepEqual(statuses,['syncing','error']);sync.stop();
});

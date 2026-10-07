import test from 'node:test';
import assert from 'node:assert/strict';
import {stampChanges,mergeDecks,cloudPayload} from '../src/sync-model.js';
const base=()=>stampChanges(null,{lectureId:'sample',generation:'reviewed',title:'Sample',updatedAt:1,cards:[{id:'a',text:'Original A',status:'new',dueAt:1},{id:'b',text:'Original B',status:'new',dueAt:1}],media:{}},0);
test('independent reviews merge across devices without resetting due dates',()=>{
 const original=base(),a=structuredClone(original),b=structuredClone(original);
 a.cards[0]={...a.cards[0],dueAt:800,lastReviewedAt:100,reviews:1,status:'known'};
 b.cards[1]={...b.cards[1],dueAt:900,lastReviewedAt:200,reviews:1,status:'known'};
 const merged=mergeDecks(stampChanges(original,a,100),stampChanges(original,b,200));
 assert.equal(merged.cards[0].dueAt,800);assert.equal(merged.cards[1].dueAt,900);
 assert.deepEqual(mergeDecks(stampChanges(original,b,200),stampChanges(original,a,100)),merged);
});
test('content editing and grading merge independently; newest same-card review wins',()=>{
 const original=base(),a=structuredClone(original),b=structuredClone(original);a.cards[0].text='Edited A';b.cards[0]={...b.cards[0],lastReviewedAt:20,dueAt:500,reviews:1};
 const merged=mergeDecks(stampChanges(original,a,10),stampChanges(original,b,20));assert.equal(merged.cards[0].text,'Edited A');assert.equal(merged.cards[0].dueAt,500);
 const newer=stampChanges(merged,{...merged,cards:merged.cards.map(c=>c.id==='a'?{...c,lastReviewedAt:30,dueAt:600}:c)},30);
 assert.equal(mergeDecks(merged,newer).cards[0].dueAt,600);
});
test('deletions survive stale copies and an explicit later reset is honoured',()=>{
 const original=base(),deleted=stampChanges(original,{...original,cards:[original.cards[1]]},20);
 assert.deepEqual(mergeDecks(deleted,original).cards.map(c=>c.id),['b']);
 const graded=stampChanges(original,{...original,cards:original.cards.map(c=>({...c,lastReviewedAt:10,dueAt:99,status:'known'}))},10);
 const reset=stampChanges(graded,{...graded,cards:original.cards},30);assert.equal(mergeDecks(graded,reset).cards[0].status,'new');
});
test('fresh bundled seeds cannot overwrite remote content edits or earlier reviews',()=>{
 const original=base(),remote=stampChanges(original,{...original,cards:original.cards.map(c=>({...c,text:'My edited card',lastReviewedAt:20,dueAt:900,status:'known'}))},20);
 const fresh=stampChanges(null,{...base(),updatedAt:200,cards:base().cards.map(c=>({...c,dueAt:200}))},0);
 const merged=mergeDecks(fresh,remote);assert.equal(merged.cards[0].text,'My edited card');assert.equal(merged.cards[0].dueAt,900);
 assert.throws(()=>mergeDecks(original,{...remote,lectureId:'other'}));
 const payload=cloudPayload({...remote,_cloudDirty:true,_cloudRevision:4});assert.ok(!('_cloudDirty' in payload));
});

test('a local edit based on the displayed deck preserves a remote review applied before the local save',()=>{
 const original=stampChanges(null,{lectureId:'overlap',generation:'reviewed',cards:[{id:'a',text:'A',dueAt:0},{id:'b',text:'B',dueAt:0}]},0);
 const remote=stampChanges(original,{...original,cards:original.cards.map(c=>c.id==='a'?{...c,lastReviewedAt:20,dueAt:100,reviews:1}:c)},20);
 const local=stampChanges(original,{...original,cards:original.cards.map(c=>c.id==='b'?{...c,lastReviewedAt:30,dueAt:200,reviews:1}:c)},30);
 const saved=mergeDecks(remote,local);
 assert.equal(saved.cards.find(c=>c.id==='a').dueAt,100);assert.equal(saved.cards.find(c=>c.id==='b').dueAt,200);
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {moduleFor} from '../src/modules.js';import {lectureSummary} from '../src/summary-notes.js';import {lectureGroups} from '../src/practical-lectures.js';
const ids=['inflammation-acute','inflammation-chronic'];const decks=ids.map(id=>JSON.parse(readFileSync(new URL(`../public/${id}/deck.json`,import.meta.url))));
test('inflammation is split into two fresh Pathobiology lectures preserving every original page number',()=>{
 const allPages=[];
 for(const [i,d] of decks.entries()){
  const [first,last,count]=i?[63,109,78]:[1,62,96];assert.equal(moduleFor(d),'pathobiology');assert.equal(d.moduleCode,'LS5009');assert.equal(d.cards.length,count);assert.equal(d.slides.length,last-first+1);assert.equal(new Set(d.cards.map(c=>c.id)).size,count);assert.equal(new Set(d.cards.map(c=>c.text)).size,count);assert.equal(lectureSummary(d).reviewed,true);
  assert.deepEqual(d.slides.map(s=>s.number),Array.from({length:last-first+1},(_,j)=>j+first));allPages.push(...d.slides.map(s=>s.number));
  for(const c of d.cards){assert.equal(c.type,'cloze');assert.equal(deletions(c.text).length,1);assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.showImagesFront,false);assert.ok(d.slides.some(s=>s.number===c.slide));assert.ok(['important','standard'].includes(c.importance));assert.ok(['easy','medium','hard'].includes(c.difficulty));for(const key of c.images)assert.ok(d.media[key]);}
  for(const s of d.slides)assert.ok(d.media[s.images[0]]);for(const path of Object.values(d.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));assert.equal(Object.keys(d.media).length,d.slides.length+17);
 }
 assert.deepEqual(allPages,Array.from({length:109},(_,i)=>i+1));assert.equal(lectureGroups(decks).lectures.length,2);assert.equal(lectureGroups(decks).practical.length,0);
});
test('inflammation notes retain key mechanisms, clarify misleading source statements and label research limits',()=>{
 const content=d=>d.cards.map(c=>c.text+' '+c.explanation).join('\n'),acute=content(decks[0]),chronic=content(decks[1]);
 for(const re of [/integrins bind endothelial ligands/,/C3a is chiefly an anaphylatoxin/,/not chemokines/,/platelets.*not white blood cells/,/not guess a one-to-one mapping/,/not a granuloma/,/not simply dead neutrophils/,/not.*immediately means stasis/])assert.match(acute,re);
 for(const re of [/not an established infection/,/not exclusively/,/not a universal diagnostic definition/,/not Langerhans/,/life-threatening organ dysfunction/,/not.*every.*cancer/,/not a protocol/,/not a deterministic claim/])assert.match(chronic,re);
 for(const [d,pages] of [[decks[0],[4,5,7,8,10,16,23,27,30,31,32,33,34,35,36,37,38,40,41,45,46,47,48,50,52,54,56,57,58,59,60]],[decks[1],[64,65,66,67,69,70,72,73,74,75,77,78,79,80,84,85,86,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105]]])for(const p of pages)assert.ok(d.cards.some(c=>c.slide===p),`page ${p} covered`);
});

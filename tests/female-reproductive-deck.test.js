import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {moduleFor} from '../src/modules.js';import {lectureSummary} from '../src/summary-notes.js';
const d=JSON.parse(readFileSync(new URL('../public/female-reproductive-physiology/deck.json',import.meta.url)));
test('reproductive physiology is a fresh physiology lecture with every source page and available figures',()=>{
 assert.equal(moduleFor(d),'physiology-research');assert.equal(d.moduleCode,'LS5034');assert.equal(d.cards.length,101);assert.equal(d.slides.length,50);assert.equal(new Set(d.cards.map(c=>c.id)).size,101);assert.equal(new Set(d.cards.map(c=>c.text)).size,101);
 for(const c of d.cards){assert.equal(c.type,'cloze');assert.equal(deletions(c.text).length,1);assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.showImagesFront,false);assert.ok(c.slide>0&&c.slide<=50);assert.ok(['important','standard'].includes(c.importance));assert.ok(['easy','medium','hard'].includes(c.difficulty));for(const key of c.images)assert.ok(d.media[key]);}
 assert.deepEqual(d.slides.map(s=>s.number),Array.from({length:50},(_,i)=>i+1));for(const s of d.slides)assert.ok(d.media[s.images[0]]);for(const path of Object.values(d.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));assert.equal(Object.keys(d.media).length,66);assert.equal(lectureSummary(d).reviewed,true);
});
test('reproductive notes preserve meiotic stages, feedback and important corrections to the slides',()=>{
 const content=d.cards.map(c=>c.text+' '+c.explanation).join('\n');for(const re of [/prophase I/,/metaphase II/,/23 chromosomes/,/granulosa cells do not undergo oocyte meiosis/,/fertilisation alone does not instantly/,/reduced FSH support/,/not.*terminate an implanted pregnancy/,/apparent unit error/,/progestogen for endometrial protection/,/rather than a fixed length/,/12 months/,/emerging research/])assert.match(content,re);
 for(const page of [4,5,6,8,9,11,12,14,15,17,18,19,20,21,22,23,27,28,29,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46,47,48,49])assert.ok(d.cards.some(c=>c.slide===page),`page ${page} covered`);
 assert.ok(!d.cards.some(c=>[1,2,3,7,13,16,24,25,26,30,50].includes(c.slide)));
});

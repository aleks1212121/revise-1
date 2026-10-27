import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {moduleFor} from '../src/modules.js';import {lectureSummary} from '../src/summary-notes.js';
const d=JSON.parse(readFileSync(new URL('../public/medically-important-viruses/deck.json',import.meta.url)));
test('medically important viruses is a fresh separate LS5008 cloze lecture with every original page',()=>{
 assert.equal(d.lectureId,'medically-important-viruses');assert.equal(moduleFor(d),'infection-immunity');assert.equal(d.moduleCode,'LS5008');assert.equal(d.cards.length,50);assert.equal(d.slides.length,18);assert.equal(new Set(d.cards.map(c=>c.id)).size,50);assert.equal(new Set(d.cards.map(c=>c.text)).size,50);
 for(const c of d.cards){assert.equal(c.type,'cloze');assert.equal(deletions(c.text).length,1);assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.showImagesFront,false);assert.ok(c.slide>0&&c.slide<=18);assert.ok(['important','standard'].includes(c.importance));assert.ok(['easy','medium','hard'].includes(c.difficulty));for(const key of c.images)assert.ok(d.media[key]);}
 assert.deepEqual(d.slides.map(s=>s.number),Array.from({length:18},(_,i)=>i+1));for(const s of d.slides)assert.ok(d.media[s.images[0]]);for(const path of Object.values(d.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));
 assert.equal(Object.keys(d.media).length,23);
});
test('medical virus cards preserve core clinical distinctions and a reviewed cheat sheet',()=>{
 const content=d.cards.map(c=>c.text+' '+c.explanation).join('\n');for(const re of [/sensory neurons/,/sensory ganglia/,/do not eliminate.*latency/,/antigenic drift/,/antigenic shift/,/reassortment/,/sexual transmission/,/undetectable does not mean cured/,/not mean a person has cancer/,/not inevitable/,/clinical context/])assert.match(content,re);
 for(const page of [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18])assert.ok(d.cards.some(c=>c.slide===page));assert.ok(!d.cards.some(c=>c.slide<3));assert.equal(lectureSummary(d).reviewed,true);
});

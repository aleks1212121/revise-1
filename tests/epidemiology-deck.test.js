import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {moduleFor} from '../src/modules.js';
import {lectureGroups} from '../src/practical-lectures.js';
import {lectureSummary} from '../src/summary-notes.js';
import {deletions} from '../src/cloze.js';
const d=JSON.parse(readFileSync(new URL('../public/epidemiology-infection-spread/deck.json',import.meta.url)));
test('epidemiology is one fresh LS5008 cloze lecture with complete original references',()=>{
 assert.equal(moduleFor(d),'infection-immunity');assert.equal(d.moduleCode,'LS5008');assert.equal(d.cards.length,88);assert.equal(d.slides.length,38);assert.equal(lectureGroups([d]).lectures.length,1);assert.equal(lectureGroups([d]).practical.length,0);
 assert.equal(new Set(d.cards.map(c=>c.id)).size,88);assert.equal(new Set(d.cards.map(c=>c.text)).size,88);
 for(const c of d.cards){assert.equal(c.type,'cloze');assert.equal(deletions(c.text).length,1);assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.showImagesFront,false);assert.ok(c.slide>=1&&c.slide<=38);assert.ok(c.explanation);assert.ok(['important','standard'].includes(c.importance));assert.ok(['easy','medium','hard'].includes(c.difficulty));for(const key of c.images)assert.ok(d.media[key]);}
 assert.deepEqual(d.slides.map(s=>s.number),Array.from({length:38},(_,i)=>i+1));
 for(const s of d.slides){assert.equal(s.images.length,1);assert.ok(d.media[s.images[0]]);}
 for(const path of Object.values(d.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));
 assert.equal(Object.keys(d.media).length,60);
});
test('epidemiology retains application safeguards and a reviewed summary',()=>{
 const content=d.cards.map(c=>c.text+' '+c.explanation).join('\n');
 for(const pattern of [/incidence proportion/,/person-time/,/fully susceptible/,/effective reproduction/,/not.*prove the source/,/not use two cases as a universal reporting threshold/,/no exact transmission chain is inferred/,/exposure timeline or answer key/,/not infection-prevalence estimates/])assert.match(content,pattern);
 for(const page of [6,7,10,14,20,22,23,24,25,26,27,28,31,34,35,36])assert.ok(d.cards.some(c=>c.slide===page),`coverage for page ${page}`);
 assert.ok(!d.cards.some(c=>[1,2,3,38].includes(c.slide)));
 const summary=lectureSummary(d);assert.equal(summary.reviewed,true);assert.ok(summary.sections.length>=6);
});

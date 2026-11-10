import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {moduleFor} from '../src/modules.js';import {lectureSummary} from '../src/summary-notes.js';
const d=JSON.parse(readFileSync(new URL('../public/population-genetics-2/deck.json',import.meta.url)));
test('population genetics II is a fresh Medical Genetics deck with all source pages and figures',()=>{
 assert.equal(moduleFor(d),'medical-genetics');assert.equal(d.moduleCode,'LS5023');assert.equal(d.cards.length,90);assert.equal(d.slides.length,43);assert.equal(new Set(d.cards.map(c=>c.id)).size,90);assert.equal(new Set(d.cards.map(c=>c.text)).size,90);
 for(const c of d.cards){assert.equal(c.type,'cloze');assert.equal(deletions(c.text).length,1);assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.showImagesFront,false);assert.ok(c.slide>=1&&c.slide<=43);assert.ok(['important','standard'].includes(c.importance));assert.ok(['easy','medium','hard'].includes(c.difficulty));for(const key of c.images)assert.ok(d.media[key]);}
 assert.deepEqual(d.slides.map(s=>s.number),Array.from({length:43},(_,i)=>i+1));for(const s of d.slides)assert.ok(d.media[s.images[0]]);for(const path of Object.values(d.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));assert.equal(Object.keys(d.media).length,56);assert.equal(lectureSummary(d).reviewed,true);
});
test('worked questions match the lecture data and retain the limits of the models',()=>{
 const cardsAt=page=>d.cards.filter(c=>c.slide===page).map(c=>c.text+' '+c.explanation).join('\n');
 assert.equal((2*79+20)/200,.89);assert.equal((2*1+20)/200,.11);assert.match(cardsAt(31),/0.0121/);assert.match(cardsAt(31),/0.1958/);assert.match(cardsAt(31),/not a formal statistical test/);
 const p=(2*5+70)/200,q=1-p;assert.equal(p,.4);assert.equal(q,.6);for(const count of [Math.round(p*p*100),Math.round(2*p*q*100),Math.round(q*q*100)])assert.match(cardsAt(32),new RegExp(`c1::${count}`));assert.match(cardsAt(32),/heterozygote excess/);
 assert.equal(Math.sqrt(1/2500),.02);assert.equal(2*.98*.02,.0392);assert.match(cardsAt(33),/3.92%/);assert.match(cardsAt(33),/absolute count requires a population size/);
 for(const [page,re] of [[7,/unlinked/],[15,/multiple variants and genes/],[22,/without directly changing a single-locus allele frequency/],[29,/not universal immunity/],[38,/not identical measurements/],[40,/archaic admixture/],[41,/not discrete biological/],[42,/no full variant identifiers/]])assert.match(cardsAt(page),re);
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {moduleFor} from '../src/modules.js';import {lectureGroups} from '../src/practical-lectures.js';
const d=JSON.parse(readFileSync(new URL('../public/neoplasia/deck.json',import.meta.url)));
test('three neoplasia sources form one fresh lecture with original references and figures',()=>{
 assert.equal(moduleFor(d),'pathobiology');assert.equal(d.cards.length,109);assert.equal(new Set(d.cards.map(c=>c.id)).size,109);assert.equal(new Set(d.cards.map(c=>c.sourceFile)).size,3);
 assert.deepEqual(lectureGroups([d]).practical,[]);
 for(const c of d.cards){assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(deletions(c.text).length,1);assert.ok(d.slides.some(s=>s.number===c.slide));assert.ok(c.originalPage>=1);for(const id of c.images)assert.ok(existsSync(new URL('../public/'+d.media[id],import.meta.url)));}
 for(let i=1;i<=15;i++)assert.ok(d.cards.some(c=>c.slide===i),'source slide '+i+' covered');
 assert.ok(d.cards.some(c=>c.sourceLabel==='Outline 1 · p. 1'));assert.ok(d.cards.some(c=>c.sourceLabel==='Outline 2 · p. 2'));
});
test('neoplasia cards distinguish staging errors and avoid universal spread/survival claims',()=>{
 assert.ok(d.cards.some(c=>/T0 means/.test(c.text)&&c.answer==='no evidence of a primary tumour'));
 assert.ok(d.cards.some(c=>c.answer==='Tis'&&/incorrectly/.test(c.explanation)));
 assert.ok(d.cards.some(c=>/does not use N3/.test(c.explanation)));
 const rates=d.cards.filter(c=>c.topic==='Lecture-table examples');assert.ok(rates.length>=6);for(const c of rates)assert.match(c.explanation,/not a current|historical/);
 assert.ok(d.cards.some(c=>/not an exclusive route/.test(c.explanation)));
 assert.ok(d.cards.some(c=>/not all|Not all/.test(c.explanation)));
});

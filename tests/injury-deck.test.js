import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
import {addStudyVisuals} from '../src/visuals.js';
const deck=JSON.parse(readFileSync(new URL('../public/cell-injury/deck.json',import.meta.url),'utf8'));
test('cell injury deck contains numbered clozes, unique IDs and all 80 source pages',()=>{
 assert.equal(deck.lectureId,'cell-injury');assert.equal(deck.generation,'reviewed');
 assert.equal(deck.cards.length,196);assert.equal(deck.slides.length,80);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,deck.cards.length);
 assert.equal(addStudyVisuals(deck),deck,'microorganism diagrams must not be applied to matching page numbers');
 for(const c of deck.cards){
  assert.ok(deck.slides.some(s=>s.number===c.slide));assert.equal(c.draft,false);
  assert.equal(c.answer,deletions(c.text).filter(x=>x.number===c.clozeNumber).map(x=>x.answer).join('; '));
  for(const id of [...c.images,...(c.answerImages||[]),...c.illustrations]){
   assert.ok(deck.media[id],id);assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)),id);
  }
 }
 for(const s of deck.slides){assert.equal(s.images.length,1);assert.ok(existsSync(new URL('../public/'+deck.media[s.images[0]],import.meta.url)))}
});
test('cell injury has targeted lecture illustrations and separate visual prompt crops',()=>{
 assert.equal(deck.cards.filter(c=>c.illustrations.length).length,128);
 const ids=new Set(deck.cards.flatMap(c=>c.illustrations));assert.ok(ids.size>=20);
 for(const id of ids){assert.match(deck.media[id],/panel-/);assert.match(deck.mediaCredits[id].credit,/slide \d+/)}
 const visual=deck.cards.filter(c=>c.showImagesFront);assert.equal(visual.length,23);
 for(const c of visual){assert.match(deck.media[c.images[0]],/visual-/);assert.match(deck.media[c.answerImages[0]],/slide-/);assert.notEqual(c.images[0],c.answerImages[0])}
});
test('cell injury cards distinguish metaplasia, dysplasia and invasive cancer',()=>{
 const cin=deck.cards.find(c=>c.slide===62&&c.answer==='dysplasia');assert.ok(cin);assert.match(cin.explanation,/severe dysplasia/);
 assert.ok(deck.cards.some(c=>c.slide===78&&c.answer.includes('basement membrane')));
 assert.ok(deck.cards.some(c=>c.slide===64&&c.answer==='not inevitable'));
 assert.ok(deck.cards.some(c=>c.slide===37&&/congenital/i.test(c.text)&&c.answer==='present at birth'));
 assert.ok(deck.cards.some(c=>c.slide===72&&c.text.includes('every HPV')&&c.answer.startsWith('No')));
 assert.ok(!deck.cards.some(c=>c.slide===63),'misleading steak example should not become a recall card');
 assert.ok(deck.cards.filter(c=>c.slide>=70&&c.slide<78).every(c=>c.topic.includes('extension')));
});

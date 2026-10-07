import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
import {addStudyVisuals} from '../src/visuals.js';
const deck=JSON.parse(readFileSync(new URL('../public/cell-death/deck.json',import.meta.url),'utf8'));
test('cell death clozes have unique IDs, valid answers and all source pictures',()=>{
 assert.equal(deck.lectureId,'cell-death');assert.equal(deck.generation,'reviewed');assert.equal(deck.cards.length,115);assert.equal(deck.slides.length,30);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,115);assert.equal(addStudyVisuals(deck),deck);
 for(const c of deck.cards){
  assert.equal(c.draft,false);assert.ok(deck.slides.some(s=>s.number===c.slide));
  assert.equal(c.answer,deletions(c.text).filter(x=>x.number===c.clozeNumber).map(x=>x.answer).join('; '));
  for(const id of [...c.images,...(c.answerImages||[]),...c.illustrations])assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)),id);
 }
 for(const s of deck.slides)for(const id of s.images)assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)),id);
});
test('cell death pictures distinguish visual prompts from supporting figures and answer slides',()=>{
 const visual=deck.cards.filter(c=>c.showImagesFront);assert.equal(visual.length,15);
 for(const c of visual){assert.match(deck.media[c.images[0]],/visual-/);assert.match(deck.media[c.answerImages[0]],/slide-/);assert.notEqual(c.images[0],c.answerImages[0])}
 assert.equal(deck.cards.filter(c=>c.illustrations.length).length,100);
 const ids=new Set(deck.cards.flatMap(c=>c.illustrations));assert.equal(ids.size,13);
 for(const id of ids){assert.match(deck.media[id],/panel-/);assert.match(deck.mediaCredits[id].credit,/slide \d+/)}
});
test('cell death cards correct the lecture table and avoid universal gangrene and neurodegeneration claims',()=>{
 assert.ok(deck.cards.some(c=>c.slide===29&&c.answer==='physiological or pathological'));
 assert.ok(deck.cards.some(c=>c.slide===29&&c.text.includes('nuclear fragmentation')&&c.answer.startsWith('Yes')));
 assert.ok(deck.cards.some(c=>c.slide===18&&c.text.includes('every case')&&c.answer.startsWith('No')));
 assert.ok(deck.cards.some(c=>c.slide===25&&c.text.includes('solely')&&c.answer.startsWith('No')));
 assert.ok(deck.cards.some(c=>c.slide===13&&c.answer==='liquefactive necrosis'));
 assert.ok(deck.cards.some(c=>c.slide===16&&c.answer==='saponification'));
 assert.ok(deck.cards.some(c=>c.slide===14&&c.explanation?.includes('loses architecture')));
});

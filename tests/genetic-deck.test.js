import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
import {addStudyVisuals} from '../src/visuals.js';
const deck=JSON.parse(readFileSync(new URL('../public/genetic-variation/deck.json',import.meta.url),'utf8'));
test('genetic variation deck contains reviewed clozes and complete, valid source media',()=>{
 assert.equal(deck.lectureId,'genetic-variation');assert.equal(deck.generation,'reviewed');
 assert.equal(deck.cards.length,161);assert.equal(deck.slides.length,47);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,deck.cards.length);
 assert.equal(addStudyVisuals(deck),deck,'microorganism diagrams must not be assigned by matching slide numbers');
 for(const c of deck.cards){
  assert.equal(c.draft,false);assert.ok(deck.slides.some(s=>s.number===c.slide));
  assert.equal(c.answer,deletions(c.text).filter(x=>x.number===c.clozeNumber).map(x=>x.answer).join('; '));
 }
 for(const slide of deck.slides)assert.equal(slide.images.length,1);
 for(const id of [...deck.cards.flatMap(c=>[...c.images,...(c.answerImages||[])]),...deck.slides.flatMap(s=>s.images)]){
  assert.ok(deck.media[id],id);assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)),id);
 }
});
test('genetic visual prompts use separate crops and full source slides on reveal',()=>{
 const visual=deck.cards.filter(c=>c.showImagesFront);assert.equal(visual.length,10);
 for(const c of visual){assert.match(deck.media[c.images[0]],/visual-/);assert.match(deck.media[c.answerImages[0]],/slide-/);assert.notEqual(c.images[0],c.answerImages[0])}
});
test('clinical examples correct the source typo and distinguish in-frame from frameshift',()=>{
 const sickle=deck.cards.find(c=>c.slide===35&&c.answer.startsWith('glutamate'));
 assert.ok(sickle);assert.match(sickle.explanation,/correct.*glutamate/);
 assert.ok(deck.cards.some(c=>c.slide===36&&c.answer==='in-frame deletion'));
 assert.ok(deck.cards.some(c=>c.slide===39&&c.answer==='not divisible by three'));
 assert.ok(deck.cards.some(c=>c.slide===19&&c.text.includes('rarity alone')&&c.answer.startsWith('No')));
});

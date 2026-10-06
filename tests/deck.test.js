import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
const deck=JSON.parse(readFileSync(new URL('../public/lecture/deck.json',import.meta.url),'utf8'));
test('lecture deck has valid numbered deletions, unique IDs and source references',()=>{
 assert.equal(deck.slides.length,65);assert.equal(deck.cards.length,178);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,178);
 for(const c of deck.cards){
  assert.ok(deck.slides.some(s=>s.number===c.slide));
  assert.equal(c.answer,deletions(c.text).filter(x=>x.number===c.clozeNumber).map(x=>x.answer).join('; '));
  for(const id of [...c.images,...(c.answerImages||[])])assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)),id);
 }
});
test('visual cards show cropped prompts and separate original answer slides',()=>{
 const cards=deck.cards.filter(c=>c.showImagesFront);assert.equal(cards.length,7);
 for(const c of cards){assert.ok(deck.media[c.images[0]].includes('visual-'));assert.ok(deck.media[c.answerImages[0]].includes('slide-'))}
});
test('outbreak figure interpretation does not claim causation',()=>{
 const card=deck.cards.find(c=>c.slide===65&&c.answer==='associations');assert.match(card.text,/not prove/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
import {addStudyVisuals} from '../src/visuals.js';
const deck=JSON.parse(readFileSync(new URL('../public/viruses/deck.json',import.meta.url),'utf8'));
test('virus deck has complete source slides and valid, uniquely identified clozes',()=>{
 assert.equal(deck.lectureId,'viruses');assert.equal(deck.moduleId,'infection-immunity');assert.equal(deck.generation,'reviewed');assert.equal(deck.cards.length,200);assert.equal(deck.slides.length,43);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,200);assert.equal(addStudyVisuals(deck),deck);
 for(const c of deck.cards){assert.equal(c.draft,false);assert.equal(c.status,'new');assert.ok(deck.slides.some(s=>s.number===c.slide));assert.equal(c.answer,deletions(c.text).filter(x=>x.number===c.clozeNumber).map(x=>x.answer).join('; '));for(const id of [...c.images,...(c.answerImages||[]),...c.illustrations])assert.ok(deck.media[id],id)}
 for(const path of Object.values(deck.media))assert.ok(existsSync(new URL('../public/'+path,import.meta.url)),path);
 for(const s of deck.slides)assert.ok(s.images.length);
});
test('virus visuals use prompt crops, separate answer slides and attributed supporting panels',()=>{
 const visual=deck.cards.filter(c=>c.showImagesFront);assert.equal(visual.length,14);
 for(const c of visual){assert.match(deck.media[c.images[0]],/visual-/);assert.match(deck.media[c.answerImages[0]],/slide-/);assert.notEqual(c.images[0],c.answerImages[0]);assert.equal(c.illustrations.length,0)}
 const panels=new Set(deck.cards.flatMap(c=>c.illustrations));assert.equal(panels.size,13);
 for(const id of panels){assert.match(deck.media[id],/panel-/);assert.match(deck.mediaCredits[id].credit,/slide \d+/)}
});
test('virus cards clarify genome integration, HIV structure and unavailable source videos',()=>{
 assert.ok(deck.cards.some(c=>c.slide===36&&/episom/i.test(c.answer)));
 assert.ok(deck.cards.some(c=>c.slide===17&&/conical/i.test(c.answer)));
 assert.ok(deck.cards.every(c=>c.type==='cloze'&&!c.text.includes('?')));
 assert.ok(deck.cards.some(c=>c.slide===37&&/integration/i.test(c.text)&&/episomal/.test(c.answer)));
 assert.ok(deck.cards.some(c=>c.slide===5&&/not established/i.test(c.answer)));
 assert.equal(deck.cards.filter(c=>[23,24,40].includes(c.slide)).length,0);
 assert.ok(deck.cards.some(c=>c.slide===42&&/nucleic acid/i.test(c.text)));
 assert.ok(deck.cards.some(c=>c.slide===43&&/RNA/.test(c.answer)));
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {moduleFor,DEFAULT_MODULES} from '../src/modules.js';import {lectureGroups,practicalHeading} from '../src/practical-lectures.js';import {deletions} from '../src/cloze.js';
const ids=['coronary-artery-disease','heart-failure','anti-obesity-drugs','cardiovascular-practical'];const decks=ids.map(id=>JSON.parse(readFileSync(new URL(`../public/${id}/deck.json`,import.meta.url))));
test('four cardiovascular/obesity lectures have separate fresh clozes, original pages and existing figures',()=>{
 assert.ok(DEFAULT_MODULES.some(m=>m.id==='system-pharmacology'&&m.code==='LS5010'));
 for(const [i,d] of decks.entries()){
  assert.equal(d.lectureId,ids[i]);assert.equal(d.cards.length,[62,60,60,43][i]);assert.equal(d.slides.length,[36,27,38,26][i]);assert.equal(moduleFor(d),i===3?'physiology-research':'system-pharmacology');assert.equal(new Set(d.cards.map(c=>c.id)).size,d.cards.length);assert.equal(new Set(d.cards.map(c=>c.text)).size,d.cards.length);
  for(const c of d.cards){assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(deletions(c.text).length,1);assert.ok(c.slide>0&&c.slide<=d.slides.length);assert.ok(['important','standard'].includes(c.importance));for(const key of c.images)assert.ok(existsSync(new URL('../public/'+d.media[key],import.meta.url)));}
  for(const s of d.slides)for(const key of s.images)assert.ok(existsSync(new URL('../public/'+d.media[key],import.meta.url)));
 }
 const group=lectureGroups(decks);assert.equal(group.lectures.length,3);assert.equal(group.practical[0].lectureId,'cardiovascular-practical');assert.equal(practicalHeading(group.practical),'Cardiovascular physiology');
});
test('cards preserve important physiological and clinical distinctions',()=>{
 assert.ok(decks[0].cards.some(c=>/not direct NCX blockade/.test(c.explanation)));
 assert.ok(decks[1].cards.some(c=>/not.*complete contemporary HFrEF/.test(c.explanation)));
 assert.ok(decks[2].cards.some(c=>/different decisions/.test(c.text)));
 assert.ok(decks[2].cards.some(c=>/does not|do not|not.*directly/i.test(c.explanation)&&c.topic==='Evidence interpretation'));
 assert.ok(decks[3].cards.some(c=>/BP alone does not directly measure/.test(c.explanation)));
 assert.ok(decks[3].cards.some(c=>/not a clinical diagnosis threshold/.test(c.explanation)));
 assert.ok(decks[3].cards.some(c=>/No measured BP/.test(c.explanation)));
});

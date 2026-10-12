import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deletions} from '../src/cloze.js';
import {lectureGroups} from '../src/practical-lectures.js';
import {moduleFor} from '../src/modules.js';
const decks=['breast-cancer-revision','breast-cancer-practical'].map(id=>JSON.parse(readFileSync(new URL(`../public/${id}/deck.json`,import.meta.url))));
test('shared practical decks have stable fresh clozes, source pages and available figures',()=>{
 for(const d of decks){
  assert.equal(d.moduleId,'pathobiology');assert.equal(moduleFor(d),'pathobiology');
  assert.equal(new Set(d.cards.map(c=>c.id)).size,d.cards.length);
  for(const c of d.cards){assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(deletions(c.text).length,1);assert.ok(d.slides.some(s=>s.number===c.slide));for(const id of c.images)assert.ok(existsSync(new URL('../public/'+d.media[id],import.meta.url)));}
 }
 const practical=decks[1].cards;
 assert.ok(practical.some(c=>/cannot, by itself, establish/.test(c.text)),'IHC does not replace invasion assessment');
 assert.ok(practical.some(c=>c.topic==='Practical interpretation'&&c.images.includes('histology-dcis')));
 assert.ok(practical.some(c=>/fine focus only/.test(c.text)));
 assert.ok(practical.some(c=>/not identical/.test(c.explanation)),'receptor profile and intrinsic subtype distinction remains explicit');
});
test('practical collection groups both decks without grouping ordinary lectures',()=>{
 const group=lectureGroups([...decks,{lectureId:'cell-death'},{lectureId:'custom'}]);
 assert.deepEqual(group.practical.map(d=>d.lectureId),decks.map(d=>d.lectureId));assert.equal(group.lectures.length,2);
 assert.deepEqual(lectureGroups([]),{lectures:[],practical:[]});
});

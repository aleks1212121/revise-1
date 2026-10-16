import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {deletions} from '../src/cloze.js';import {lectureGroups,practicalHeading} from '../src/practical-lectures.js';import {moduleFor} from '../src/modules.js';
const deck=JSON.parse(readFileSync(new URL('../public/microbiology-practical/deck.json',import.meta.url)));
test('microbiology practical is a fresh LS5008 deck with valid notes and source figures',()=>{
 assert.equal(moduleFor(deck),'infection-immunity');assert.equal(deck.cards.length,103);assert.equal(deck.slides.length,17);assert.equal(new Set(deck.cards.map(c=>c.id)).size,103);
 for(const c of deck.cards){assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(deletions(c.text).length,1);assert.ok(c.slide>=1&&c.slide<=17);for(const id of c.images)assert.ok(existsSync(new URL('../public/'+deck.media[id],import.meta.url)));}
 assert.ok(deck.cards.some(c=>c.answer==='carbol fuchsin'));assert.ok(deck.cards.some(c=>/not a universal|not definitive|not sufficient proof/.test(c.explanation)));
 assert.ok(deck.cards.some(c=>/colour chart is not reproduced|chart is not reproduced/.test(c.explanation)));assert.ok(deck.cards.some(c=>c.explanation.startsWith('Principle refresher:')));
});
test('practical groups and headings distinguish microbiology from histopathology',()=>{
 const breast={lectureId:'breast-cancer-practical'},normal={lectureId:'viruses'};
 const grouped=lectureGroups([deck,normal]);assert.deepEqual(grouped.practical,[deck]);assert.match(practicalHeading([deck]),/Microbiology/);assert.match(practicalHeading([breast]),/Breast/);assert.equal(practicalHeading([deck,breast]),'Practical revision decks');
});

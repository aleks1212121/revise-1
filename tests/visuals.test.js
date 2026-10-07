import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {addStudyVisuals} from '../src/visuals.js';
test('additional diagrams exist locally and enrichment preserves saved content and progress',()=>{
 const deck=JSON.parse(readFileSync(new URL('../public/lecture/deck.json',import.meta.url),'utf8'));
 deck.cards[0].dueAt=1800000000000;deck.cards[0].question='Edited membrane question';
 const updated=addStudyVisuals(deck);assert.equal(updated.cards[0].dueAt,1800000000000);assert.equal(updated.cards[0].question,'Edited membrane question');
 assert.ok(updated.cards.filter(c=>c.illustrations.length).length>70);
 const ids=new Set(updated.cards.flatMap(c=>c.illustrations));assert.equal(ids.size,10);
 for(const id of ids){assert.ok(existsSync(new URL('../public/'+updated.media[id],import.meta.url)));assert.match(updated.mediaCredits[id].credit,/Original/)}
});
test('unrelated custom decks are not assigned lecture illustrations',()=>{
 const deck={cards:[{slide:4}],curated:false};assert.equal(addStudyVisuals(deck),deck);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDeck} from '../src/lecture.js';
test('import normalizes source-slide numbers and cloze numbers',()=>{
 const deck=normalizeDeck({cards:[{type:'cloze',text:'{{c2::test}}',question:'{{c2::test}}',answer:'test',clozeNumber:'2'}],slides:[{number:'<img onerror=bad>',topic:'Test',text:'Test',images:['image',42]}]});
 assert.equal(deck.cards[0].clozeNumber,2);assert.equal(deck.slides[0].number,0);assert.deepEqual(deck.slides[0].images,['image']);
});
test('import rejects a cloze whose active deletion does not exist',()=>{
 assert.throws(()=>normalizeDeck({cards:[{type:'cloze',question:'{{c1::test}}',answer:'test',clozeNumber:2}]}),/valid deletion/);
});

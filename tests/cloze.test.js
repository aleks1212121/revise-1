import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCloze,clozeCards,draftCloze} from '../src/cloze.js';

test('numbered clozes hide only the active deletion and preserve hints',()=>{
 const text='{{c1::Bacteria::organisms}} have {{c2::peptidoglycan}} walls.';
 assert.equal(renderCloze(text,1),'\u003cmark class="cloze "\u003e[organisms]</mark> have peptidoglycan walls.');
 assert.match(renderCloze(text,2),/^Bacteria have .*\[…\]/);
 assert.match(renderCloze(text,1,true),/>Bacteria<\/mark>/);
});
test('same-number deletions share a card and different numbers create separate cards',()=>{
 const cards=clozeCards({text:'{{c1::A}} and {{c1::B}} differ from {{c2::C}}.'});
 assert.equal(cards.length,2);assert.equal(cards[0].answer,'A; B');assert.equal(cards[1].clozeNumber,2);
});
test('slide-based drafts preserve facts and avoid generic topic questions',()=>{
 assert.equal(draftCloze('Fungi have cell walls containing chitin.'),'Fungi have {{c1::cell walls containing chitin}}.');
 assert.equal(draftCloze('Bacteria are prokaryotic organisms.'),'{{c1::Bacteria}} are prokaryotic organisms.');
 assert.equal(draftCloze('Bacterial cell walls contain peptidoglycan.',['peptidoglycan']),'Bacterial cell walls contain {{c1::peptidoglycan}}.');
 assert.equal(draftCloze('Learning outcomes: explain the cell wall.'),null);
 assert.equal(draftCloze('https://example.org/source'),null);
});
test('card content is escaped before rendering',()=>{
 assert.ok(!renderCloze('<script>alert(1)</script> {{c1::<img onerror=x>}}',1,true).includes('<img'));
});

test('numbered cards share a note identity for linked editing',()=>{
 const cards=clozeCards({text:'{{c1::A}} and {{c2::B}}.'});
 assert.equal(cards[0].noteId,cards[1].noteId);
 assert.notEqual(cards[0].id,cards[1].id);
});

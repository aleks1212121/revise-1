import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {studyNote,withStudyNotes} from '../src/study-notes.js';
import {embeddedExplanationHTML} from '../src/ai-explain.js';
import {prepareChatGPTDeck} from '../src/chatgpt-deck.js';

test('every bundled card has reasoning, a memory cue and an answerable check',()=>{
 const root=new URL('../public/',import.meta.url);
 for(const folder of readdirSync(root)){
  const file=new URL(folder+'/deck.json',root);if(!existsSync(file))continue;
  const deck=JSON.parse(readFileSync(file));
  for(const card of deck.cards){
   const note=studyNote(deck,card);
   for(const field of ['why','cue','question','answer'])assert.ok(note[field]?.trim(),folder+' '+card.id+' '+field);
   assert.doesNotMatch(note.why,/^This card supplies|^The saved answer identifies/);
  }
 }
});
test('an edited linked cloze explains its active answer and invalidates the old embedded note',()=>{
 const card={type:'cloze',text:'{{c1::First}} and {{c2::second::hint}}',clozeNumber:2,explanation:'Two different positions.',topic:'Sequence',reviews:8};
 const d=withStudyNotes({cards:[card]});const original=d.cards[0];assert.equal(studyNote(d,original),original.studyNote);assert.equal(original.reviews,8);assert.equal(card.studyNote,undefined);
 const next={...original,text:'{{c1::First}} and {{c2::<new>}}',explanation:'Revised rationale.'};
 const html=embeddedExplanationHTML(d,next);assert.match(html,/Revised rationale/);assert.match(html,/&lt;new&gt;/);assert.doesNotMatch(html,/<new>|Two different positions/);assert.match(html,/class="cloze revealed">&lt;new&gt;/);
});
test('generated notes keep an authored memory aid and check through the import path',()=>{
 const input={cards:[{slide:1,topic:'Test',text:'X is {{c1::Y}}.',explanation:'Because of Z.',memoryAid:'Remember Z.',checkQuestion:'What explains this?',checkAnswer:'Z.'}]};
 const d=prepareChatGPTDeck(JSON.stringify(input));const n=studyNote(d,d.cards[0]);
 assert.equal(n.why,'Because of Z.');assert.equal(n.cue,'Remember Z.');assert.equal(n.question,'What explains this?');assert.equal(n.answer,'Z.');
});
test('an unsupported visual recall prompt never invents a feature of the image',()=>{
 const c={type:'basic',question:'Identify the label.',answer:'A',showImagesFront:true,slide:1};
 const n=studyNote({cards:[c],slides:[{number:1,text:'Unrelated material.'}]},c);assert.match(n.why,/labelled image/);assert.equal(n.answer,'A');
});

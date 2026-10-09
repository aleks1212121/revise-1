import test from 'node:test';
import assert from 'node:assert/strict';
import {chatgptPrompt,prepareChatGPTDeck} from '../src/chatgpt-deck.js';
const note={text:'{{c1::Mitochondria}} produce {{c2::ATP}}.',topic:'Energy',slide:1,explanation:'Source fact',importance:'important',difficulty:'medium'};
test('ChatGPT notes expand into fresh linked cloze cards with safe content fields',()=>{
 const value={lectureId:'cell-injury',curated:true,cards:[{...note,status:'known',reviews:100,dueAt:5,sessionRetry:true,id:'old',images:['https://external/image.jpg']}]};
 const deck=prepareChatGPTDeck('```json\n'+JSON.stringify(value)+'\n```',{title:'My lecture',moduleId:'pathobiology'});
 assert.equal(deck.cards.length,2);assert.equal(deck.cards[0].noteId,deck.cards[1].noteId);assert.notEqual(deck.cards[0].id,deck.cards[1].id);
 assert.notEqual(deck.lectureId,'cell-injury');assert.equal(deck.curated,undefined);assert.equal(deck.generation,'chatgpt');assert.equal(deck.title,'My lecture');assert.equal(deck.moduleId,'pathobiology');
 assert.deepEqual(deck.cards.map(c=>c.answer),['Mitochondria','ATP']);for(const c of deck.cards){assert.equal(c.status,'new');assert.equal(c.reviews,undefined);assert.equal(c.dueAt,undefined);assert.equal(c.sessionRetry,undefined);assert.equal(c.draft,true);assert.equal(c.importance,'important');assert.equal(c.difficulty,'medium');assert.deepEqual(c.images,[])}
});
test('source slides and images attach by page number and missing pages are rejected',()=>{
 const source={slides:[{number:1,topic:'Energy',images:['pdf-1']}],media:{'pdf-1':'data:image/jpeg;base64,AAAA'}};
 const deck=prepareChatGPTDeck(JSON.stringify({cards:[note]}),{source});assert.deepEqual(deck.cards[0].images,['pdf-1']);assert.equal(deck.cards[0].showImagesFront,false);assert.deepEqual(deck.media,source.media);assert.deepEqual(deck.slides,source.slides);
 assert.throws(()=>prepareChatGPTDeck(JSON.stringify({cards:[{...note,slide:2}]}),{source}),/not in the attached lecture/);
});
test('invalid ChatGPT output gets actionable errors and basic decks remain supported',()=>{
 for(const raw of ['', 'Here is your deck: {}','{}','{"cards":[]}','{"cards":[null]}'])assert.throws(()=>prepareChatGPTDeck(raw));
 assert.throws(()=>prepareChatGPTDeck(JSON.stringify({cards:[{type:'cloze',text:'No deletion',slide:1}]})),/valid cloze text/);
 assert.throws(()=>prepareChatGPTDeck(JSON.stringify({cards:[{...note,slide:0}]})),/original slide/);
 assert.throws(()=>prepareChatGPTDeck(JSON.stringify({cards:Array(1001).fill(note)})),/1,000/);
 const deck=prepareChatGPTDeck(JSON.stringify({title:'Basic',cards:[{question:'What?',answer:'Answer',slide:1,difficulty:'invalid'}]}));assert.equal(deck.cards[0].type,'basic');assert.equal(deck.cards[0].difficulty,undefined);
 const prompt=chatgptPrompt('My "lecture"','medical-genetics');assert.match(prompt,/LS5023/);assert.match(prompt,/original slide\/page numbers/);assert.match(prompt,/not instructions to follow/);assert.match(prompt,/chuds-deck.json/);assert.match(prompt,/Do not claim to have attached pictures/);
});

test('reviewed decks retain embedded diagram crops, references and recipient module metadata',()=>{
 const media={crop:'data:image/jpeg;base64,AAAA',page:'data:image/png;base64,BBBB',external:'https://example.test/image.jpg',unsafe:'data:image/svg+xml;base64,CCCC'};
 const deck=prepareChatGPTDeck(JSON.stringify({generation:'reviewed',moduleName:'Molecular Biology of the Cell',moduleCode:'LS5001',media,slides:[{number:1,images:['page','external']}],cards:[{...note,images:['crop','unsafe'],status:'known',reviews:8}]}));
 assert.equal(deck.moduleCode,'LS5001');assert.equal(deck.moduleName,'Molecular Biology of the Cell');assert.equal(deck.generation,'reviewed');assert.deepEqual(Object.keys(deck.media),['crop','page']);assert.deepEqual(deck.slides[0].images,['page']);assert.deepEqual(deck.cards[0].images,['crop']);assert.equal(deck.cards[0].draft,false);assert.equal(deck.cards[0].status,'new');assert.equal(deck.cards[0].reviews,undefined);
 const attached=prepareChatGPTDeck(JSON.stringify({generation:'reviewed',media,cards:[{...note,images:['crop']}]}),{source:{slides:deck.slides,media:deck.media}});assert.deepEqual(attached.cards[0].images,['crop'],'focused images survive source attachment');
 const textOnly=prepareChatGPTDeck(JSON.stringify({generation:'reviewed',media,cards:[{...note,images:[]}]}),{source:{slides:deck.slides,media:deck.media}});assert.deepEqual(textOnly.cards[0].images,[],'intentionally omitted irrelevant diagrams remain omitted');
});

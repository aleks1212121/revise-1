import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLecturePack} from '../src/lecture-pack.js';
const entry={id:'motility',payload:{title:'Motility',source:'lecture.pdf',moduleName:'Cell biology',moduleCode:'LS5001',generation:'reviewed',cards:[{text:'Cells use {{c1::actin}}.',slide:1,images:['crop'],reviews:10,status:'known'}],media:{crop:'data:image/jpeg;base64,AAAA'}}};
test('lecture packs retain pictures and module metadata with fresh study schedules',()=>{
 const result=prepareLecturePack(JSON.stringify({format:'chuds-lecture-pack',decks:[entry]}));assert.equal(result.decks[0].payload.moduleCode,'LS5001');assert.deepEqual(result.decks[0].payload.cards[0].images,['crop']);assert.equal(result.decks[0].payload.cards[0].reviews,undefined);assert.equal(result.decks[0].payload.cards[0].status,'new');assert.equal(result.decks[0].payload.source,'lecture.pdf');
});
test('invalid or ambiguous lecture packs are rejected before upload',()=>{
 for(const value of ['invalid','{}',JSON.stringify({format:'chuds-lecture-pack',decks:[]}),JSON.stringify({format:'chuds-lecture-pack',decks:[entry,entry]}),JSON.stringify({format:'chuds-lecture-pack',decks:[{...entry,payload:{...entry.payload,source:''}}]})])assert.throws(()=>prepareLecturePack(value));
});

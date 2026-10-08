import test from 'node:test';import assert from 'node:assert/strict';
import {repairVirusCloze} from '../src/virus-cloze.js';import {migrateSchedule} from '../src/scheduler.js';import {mergeDecks} from '../src/sync-model.js';import {renderCloze} from '../src/cloze.js';
const old={lectureId:'viruses',moduleId:'infection-immunity',cards:[{id:'v-12-c1',type:'basic',text:'Which microscopy technology made virions directly visible in the 1930s? {{c1::Electron microscopy}}.',question:'Which microscopy technology made virions directly visible in the 1930s? {{c1::Electron microscopy}}.',answer:'Electron microscopy',clozeNumber:1,status:'known',reviews:5,dueAt:999999,intervalDays:7,lastReviewedAt:100,lapses:1,_contentAt:10,_reviewAt:100}]};
test('saved virus cards become cloze statements without changing reviews or due dates',()=>{
 const next=migrateSchedule(old,200);const c=next.cards[0];assert.equal(c.type,'cloze');assert.equal(c.answer,'electron microscopy');assert.equal(c.text.includes('?'),false);for(const key of ['status','reviews','dueAt','intervalDays','lastReviewedAt','lapses','_reviewAt'])assert.equal(c[key],old.cards[0][key]);assert.equal(c._contentAt,200);assert.match(renderCloze(c.text,1,false),/\[…\]/);assert.doesNotMatch(renderCloze(c.text,1,false),/electron microscopy/);assert.equal(repairVirusCloze(next,300),next);
 const merged=mergeDecks(next,old);assert.equal(merged.cards[0].type,'cloze');assert.equal(merged.cards[0].reviews,5);
});
test('personal wording and unrelated decks are preserved; mistyped cloze cards are repaired',()=>{
 const custom={...old,cards:[{...old.cards[0],type:'cloze',text:'My own {{c1::edited answer}}',question:'My own {{c1::edited answer}}'}]};assert.equal(repairVirusCloze(custom),custom);const other={...old,lectureId:'my-own-virus-upload'};assert.equal(repairVirusCloze(other),other);
 const wrong={...old,cards:[{...old.cards[0],id:'v-99-c1',text:'The genome is {{c1::RNA}}.',question:'The genome is {{c1::RNA}}.'}]};assert.equal(repairVirusCloze(wrong,200).cards[0].type,'cloze');
});

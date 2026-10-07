import test from 'node:test';
import assert from 'node:assert/strict';
import {schedule,isDue,intervalFor,migrateSchedule} from '../src/scheduler.js';
const day=86400000,now=1800000000000;
test('good reviews return after 1, 3, 7 and 14 days, never complete permanently',()=>{
 let card={id:'card',status:'new'};
 for(const days of [1,3,7,14,30,60,120,180,365,365]){
  card=schedule(card,'good',now);assert.equal(card.dueAt,now+days*day);
  assert.equal(isDue(card,now),false);assert.equal(isDue(card,card.dueAt),true);
 }
});
test('again schedules ten-minute relearning and resets the growth interval',()=>{
 const card=schedule({intervalDays:30,reviews:5,lapses:1},'again',now);
 assert.equal(card.dueAt,now+600000);assert.equal(card.lapses,2);assert.equal(card.reviews,6);
 assert.equal(intervalFor(card,'good'),day);
});
test('hard grows slowly while easy skips an interval',()=>{
 assert.equal(intervalFor({},'hard'),day);assert.equal(intervalFor({},'easy'),3*day);
 assert.equal(intervalFor({intervalDays:7},'hard'),9*day);assert.equal(intervalFor({intervalDays:7},'easy'),30*day);
});
test('legacy confident cards return and existing schedules are preserved',()=>{
 const deck=migrateSchedule({cards:[{status:'known'},{dueAt:now+day,intervalDays:1}]},now);
 assert.ok(isDue(deck.cards[0],now));assert.equal(deck.cards[0].status,'known');assert.equal(deck.cards[1].dueAt,now+day);
});
test('only known ratings are accepted',()=>assert.throws(()=>intervalFor({},'invalid'),/Unknown/));

test('linked editing preserves existing schedules but new deletion numbers do not inherit them',async()=>{
 const {preserveSchedule}=await import('../src/scheduler.js');
 const scheduled={dueAt:now+7*day,intervalDays:7,reviews:3};
 assert.equal(preserveSchedule({question:'Edited'},scheduled).dueAt,scheduled.dueAt);
 assert.equal(preserveSchedule({...scheduled,question:'New'},undefined).dueAt,undefined);
});

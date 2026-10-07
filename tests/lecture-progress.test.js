import test from 'node:test';
import assert from 'node:assert/strict';
import {lectureProgress} from '../src/lecture-progress.js';
import {schedule} from '../src/scheduler.js';
const now=1800000000000;
test('lecture coverage counts reviewed cards once, independently of confidence and due dates',()=>{
 const cards=[{reviews:4,status:'known',dueAt:now+1000},{reviews:1,status:'review',dueAt:now-1},{lastReviewedAt:now-10,status:'review',dueAt:now+1000},{status:'new'}];
 assert.deepEqual(lectureProgress(cards,now),{total:4,studied:3,confident:1,due:2,percent:75});
});
test('repeated and Again reviews preserve coverage while confidence and due counts change',()=>{
 const good=schedule({},'good',now),again=schedule(good,'again',now);
 assert.equal(lectureProgress([good,{}],now).percent,50);assert.equal(lectureProgress([again,{}],now).percent,50);
 assert.equal(lectureProgress([again],now).confident,0);assert.equal(lectureProgress([again],again.dueAt).due,1);
});
test('empty and untouched lectures display zero coverage',()=>{
 assert.deepEqual(lectureProgress([],now),{total:0,studied:0,confident:0,due:0,percent:0});
 assert.equal(lectureProgress([{},{}],now).percent,0);
});

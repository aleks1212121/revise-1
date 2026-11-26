import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {exams,courses} from '../src/exam-catalog.js';
import {examWorkspace} from '../src/exams.js';
import {navigationHash,parseNavigationHash} from '../src/browser-navigation.js';

test('exam links resolve to known modules, bundled decks and authenticated Canvas routes',()=>{
 const aliases={microorganisms:'lecture','cell-injury-2':'cell-injury'};
 for(const exam of exams){
  assert.ok(courses[exam.module]);
  assert.match(exam.brief,/^(pages\/[\w-]+|assignments\/\d+)$/);
  for(const lesson of exam.lectures){
   assert.match(lesson.page,/^[\w-]+$/);
   for(const [id,label] of lesson.files){assert.ok(Number.isInteger(id));assert.ok(label)}
   for(const id of lesson.decks)assert.ok(existsSync(new URL('../public/'+(aliases[id]||id)+'/deck.json',import.meta.url)),id);
  }
  const hash=navigationHash({view:'exams',selectedExam:exam.id});
  assert.equal(parseNavigationHash(hash).selectedExam,exam.id);
 }
});
test('slide links remain available without a saved deck and the genetics MCQ excludes practicals',()=>{
 const html=examWorkspace('genetics-mcq',[]);
 assert.match(html,/courses\/38850\/files\/7956681/);
 assert.doesNotMatch(html,/data-open-lecture|DNA extraction/);
 assert.match(examWorkspace('biostatistics',[]),/files\/7748345/);
});

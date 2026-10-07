import test from 'node:test';
import assert from 'node:assert/strict';
import {studyDay,recordStudy,studySummary,leaderboard,mergeStudyDays} from '../src/activity.js';
import {stampChanges,mergeDecks} from '../src/sync-model.js';
test('study dates use London midnight, including daylight saving changes',()=>{
 assert.equal(studyDay(Date.parse('2026-07-10T23:30:00Z')),'2026-07-11');
 assert.equal(studyDay(Date.parse('2026-12-10T23:30:00Z')),'2026-12-10');
});
test('repeat grades do not inflate daily cards/slides and overlapping source numbers stay separate between lectures',()=>{
 const first={lectureId:'one',cards:[{id:'a',slide:1,reviews:1},{id:'b',slide:1},{id:'c',slide:2,reviews:1}]},second={lectureId:'two',cards:[{id:'d',slide:1,reviews:1}]};
 const now=Date.parse('2026-10-07T12:00:00Z');recordStudy(first,first.cards[0],now);recordStudy(first,first.cards[0],now);recordStudy(first,first.cards[1],now);recordStudy(second,second.cards[0],now);
 const s=studySummary([first,second],'2026-10-07');assert.equal(s.todayCards,3);assert.equal(s.todaySlides,2);assert.equal(s.totalSlides,3);assert.equal(s.completedSlides,2);assert.equal(s.reviewedCards,3);
});
test('a streak stays alive until the end of today, breaks after a skipped day and ignores future data',()=>{
 const deck={lectureId:'one',cards:[],_studyDays:{'2026-10-05':{a:1},'2026-10-06':{a:1},'2026-10-08':{a:1}}};
 assert.equal(studySummary([deck],'2026-10-07').streak,2);assert.equal(studySummary([deck],'2026-10-09').streak,1);
 assert.equal(studySummary([deck],'2026-10-10').streak,0);
 const today=studySummary([deck],'2026-10-07');assert.equal(today.weekSlides,2);assert.equal(today.todayCards,0);
});
test('cross-device activity merges by day and card, even after a card is deleted',()=>{
 const seed=stampChanges(null,{lectureId:'one',generation:'reviewed',cards:[{id:'a',slide:1},{id:'b',slide:2}]},0),a=structuredClone(seed),b=structuredClone(seed),now=Date.parse('2026-10-07T12:00:00Z');
 recordStudy(a,a.cards[0],now);recordStudy(b,b.cards[1],now);recordStudy(b,b.cards[0],now);
 const merged=mergeDecks(stampChanges(seed,a,1),stampChanges(seed,b,2));assert.equal(studySummary([merged],'2026-10-07').todayCards,2);
 const deleted=stampChanges(merged,{...merged,cards:[]},3);assert.equal(studySummary([mergeDecks(deleted,seed)],'2026-10-07').todaySlides,2);
 assert.deepEqual(mergeStudyDays(a._studyDays,b._studyDays),mergeStudyDays(b._studyDays,a._studyDays));
});
test('leaderboard ties share a rank and last-seven-day sorting changes the order',()=>{
 const rows=[{display_name:'A',stats:{todaySlides:1,weekSlides:5}},{display_name:'B',stats:{todaySlides:2,weekSlides:3}},{display_name:'C',stats:{todaySlides:2,weekSlides:1}}];
 assert.deepEqual(leaderboard(rows).map(r=>[r.display_name,r.rank]),[['B',1],['C',1],['A',3]]);assert.equal(leaderboard(rows,'week')[0].display_name,'A');
});

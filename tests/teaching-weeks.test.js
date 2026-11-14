import test from 'node:test';import assert from 'node:assert/strict';
import {teachingWeek,weekLabel,weekGroups} from '../src/teaching-weeks.js';
import {combineInjury,injuryPart} from '../src/injury-parts.js';
import {stampChanges,mergeDecks} from '../src/sync-model.js';
import {correctBundledProtocol} from '../src/bundled-corrections.js';
import {readFileSync} from 'node:fs';
test('roadmap weeks order independently of study recency and retain practical ranges',()=>{
 const input=[{lectureId:'endotoxins',title:'E',updatedAt:99},{lectureId:'viruses',title:'V',updatedAt:1},{lectureId:'own',title:'Own'},{lectureId:'human-microbiome',title:'H'}];const before=structuredClone(input);
 assert.deepEqual(weekGroups(input).map(g=>g.week),[2,3,7,null]);assert.deepEqual(input,before);assert.equal(weekLabel({lectureId:'microbiology-practical'}),'Weeks 2–8');assert.equal(weekLabel({lectureId:'own'}),'Week not set');assert.deepEqual(teachingWeek({lectureId:'embryonic-development'}),{start:8,end:8});
});
test('personal week assignment overrides defaults, clears explicitly and survives cross-device metadata merging',()=>{
 assert.equal(weekLabel({lectureId:'endotoxins',week:4,weekEnd:5}),'Weeks 4–5');assert.equal(weekLabel({lectureId:'endotoxins',week:null,weekEnd:null}),'Week not set');assert.equal(teachingWeek({week:99}),null);
 const card={id:'a',text:'Fact',status:'review',reviews:3,dueAt:100};const base=stampChanges(null,{lectureId:'own',cards:[card]},1);const changed=stampChanges(base,{...base,week:5,weekEnd:5},2);assert.equal(mergeDecks(base,changed).week,5);assert.deepEqual(mergeDecks(base,changed).cards[0],base.cards[0]);
});
test('split cellular injury lectures retain independent week preferences and all review history',()=>{
 const source=JSON.parse(readFileSync(new URL('../public/cell-injury/deck.json',import.meta.url)));const part=injuryPart(source,2);part.week=3;part.weekEnd=3;part.cards[0].reviews=7;const combined=combineInjury(source,part,100);assert.equal(weekLabel(injuryPart(combined,2)),'Week 3');assert.equal(injuryPart(combined,2).cards[0].reviews,7);assert.equal(weekLabel(injuryPart(combined,1)),'Weeks 1–3');
});
test('current practical corrections preserve reviews and personal edits and apply once',()=>{
 const latest=JSON.parse(readFileSync(new URL('../public/cardiovascular-practical/deck.json',import.meta.url)));const target=latest.cards.find(c=>c.text.includes('150 mmHg'));const old={...latest,protocolRevision:0,cards:[{...target,text:'The protocol sets a maximum occlusion-cuff pressure of {{c1::160 mmHg}}.',reviews:8,dueAt:12345,sessionRetry:{after:3}},{id:'personal',text:'My own card',reviews:2}]};const updated=correctBundledProtocol(old);assert.match(updated.cards[0].text,/150 mmHg/);assert.equal(updated.cards[0].id,target.id);assert.equal(updated.cards[0].reviews,8);assert.equal(updated.cards[0].dueAt,12345);assert.deepEqual(updated.cards[0].sessionRetry,{after:3});assert.deepEqual(updated.cards[1],old.cards[1]);assert.equal(correctBundledProtocol(updated),updated);assert.match(old.cards[0].text,/160 mmHg/);const edited={...old,cards:[{...old.cards[0],text:'My customised note'}]};assert.equal(correctBundledProtocol(edited).cards[0].text,'My customised note');
});

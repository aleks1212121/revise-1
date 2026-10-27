import test from 'node:test';import assert from 'node:assert/strict';
import {MODULES,moduleFor,moduleTotals} from '../src/modules.js';import {stampChanges,mergeDecks} from '../src/sync-model.js';
test('bundled lecture defaults match the supplied modules without overriding manual assignments',()=>{
 assert.deepEqual(MODULES.map(m=>m.code),['LS5009','LS5008','LS5023','LS5034']);
 assert.equal(moduleFor({lectureId:'cell-injury'}),'pathobiology');assert.equal(moduleFor({lectureId:'cell-death'}),'pathobiology');assert.equal(moduleFor({lectureId:'microorganisms'}),'infection-immunity');assert.equal(moduleFor({lectureId:'genetic-variation'}),'medical-genetics');
 assert.equal(moduleFor({lectureId:'cell-injury',moduleId:''}),'');assert.equal(moduleFor({lectureId:'cell-injury',moduleId:'medical-genetics'}),'medical-genetics');assert.equal(moduleFor({lectureId:'custom'}),'');
});
test('module totals count only lectures in that module',()=>assert.deepEqual(moduleTotals([{lectureId:'cell-injury',count:10,studied:4},{lectureId:'cell-death',count:20,studied:5},{lectureId:'microorganisms',count:100,studied:90}],'pathobiology'),{lectures:2,total:30,studied:9,percent:30}));
test('module changes sync as metadata while preserving another device’s reviews',()=>{
 const original=stampChanges(null,{lectureId:'custom',moduleId:'pathobiology',cards:[{id:'a',question:'Q',reviews:0}]},10);
 const moved=stampChanges(original,{...original,moduleId:'medical-genetics'},20);
 const studied=stampChanges(original,{...original,cards:[{...original.cards[0],reviews:1,lastReviewedAt:30}]},30);
 const merged=mergeDecks(moved,studied);assert.equal(merged.moduleId,'medical-genetics');assert.equal(merged.cards[0].reviews,1);
});

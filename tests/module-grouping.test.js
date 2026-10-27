import test from 'node:test';
import assert from 'node:assert/strict';
import {configureModules,MODULES,moduleFor,moduleRegistry,moduleTotals,moduleCode} from '../src/modules.js';
import {personalStats} from '../src/review-stats.js';
const state={modules:{
 'custom-a':{id:'custom-a',name:'Molecular Biology of the Cell',code:'LS5001'},
 'custom-b':{id:'custom-b',name:'Cell Motility (LS5001)',code:''},
 'custom-c':{id:'custom-c',name:'Intracellular Trafficking',code:'ls 5001'},
 'custom-other':{id:'custom-other',name:'Other course',code:'LS5002'},
 'custom-deleted':{id:'custom-deleted',name:'Archived course',code:'LS5001',deleted:true},
}};
test('one course groups different lecture/module names and combines progress without modifying source records',()=>{
 const before=structuredClone(state);
 try{
  configureModules(state);const group=MODULES.filter(m=>m.code==='LS5001');assert.equal(group.length,1);assert.equal(group[0].name,'Molecular Biology of the Cell');
  assert.deepEqual(group[0].memberIds,['custom-a','custom-b','custom-c']);
  const lectures=['custom-a','custom-b','custom-c'].map((moduleId,i)=>({moduleId,count:10,studied:i+1}));
  assert.deepEqual(lectures.map(moduleFor),['custom-a','custom-a','custom-a']);assert.deepEqual(moduleTotals(lectures,'custom-a'),{lectures:3,total:30,studied:6,percent:20});
  assert.equal(moduleFor({moduleId:'custom-deleted'}),'');assert.equal(moduleFor({moduleId:'custom-other'}),'custom-other');
  assert.deepEqual(state,before);
 }finally{configureModules()}
});
test('codes are case/space insensitive, uncoded subjects stay separate, and registry resets between accounts',()=>{
 assert.equal(moduleCode({name:'Cell Motility - LS5001'}),'LS5001');
 try{
  configureModules({modules:{...state.modules,'custom-x':{id:'custom-x',name:'Part 1'},'custom-y':{id:'custom-y',name:'Part 2'}}});
  assert.equal(moduleFor({moduleId:'custom-x'}),'custom-x');assert.equal(moduleFor({moduleId:'custom-y'}),'custom-y');
  configureModules();assert.equal(moduleFor({moduleId:'custom-b'}),'');assert.equal(MODULES.length,4);
 }finally{configureModules()}
});
test('read-only registry is account isolated and grouped trash keeps all IDs for restoration',()=>{
 const registry=moduleRegistry(state);assert.equal(registry.aliases.get('custom-c'),'custom-a');assert.equal(MODULES.length,4);
 const trashed={modules:Object.fromEntries(Object.entries(state.modules).map(([id,m])=>[id,{...m,deleted:true}]))};
 const group=moduleRegistry(trashed,true).modules.find(m=>m.code==='LS5001');assert.deepEqual(group.memberIds,['custom-a','custom-b','custom-c','custom-deleted']);
 assert.equal(moduleRegistry(trashed).modules.some(m=>m.code==='LS5001'),false);
});
test('historic review events from duplicate module IDs combine without changing reviews',()=>{
 const decks=['custom-a','custom-b','custom-c'].map((moduleId,i)=>({lectureId:String(i),moduleId,cards:[{id:'card',reviews:1}],_reviewEvents:{event:{moduleId,cardId:'card',rating:i===0?'again':'good',topic:'Cells'}}}));
 const before=structuredClone(decks);
 try{configureModules(state);const stats=personalStats(decks,'module');assert.equal(stats.rows.length,1);assert.equal(stats.rows[0].attempts,3);assert.equal(stats.rows[0].correct,2);assert.deepEqual(decks,before)}finally{configureModules()}
});
test('uncoded lecture-named modules use their lecture filenames without combining mixed courses',()=>{
 const modules={'custom-a':{id:'custom-a',name:'Motility'},'custom-b':{id:'custom-b',name:'Trafficking'},'custom-mixed':{id:'custom-mixed',name:'Mixed'}};
 const lectures=[{moduleId:'custom-a',source:'LS5001 - Cell motility.pptx'},{moduleId:'custom-b',title:'Intracellular Trafficking - LS5001'},{moduleId:'custom-mixed',title:'LS5001'},{moduleId:'custom-mixed',title:'LS5002'}];
 try{configureModules({modules},lectures);assert.equal(MODULES.filter(m=>m.code==='LS5001').length,1);assert.equal(moduleFor(lectures[1]),'custom-a');assert.equal(moduleFor(lectures[2]),'custom-mixed')}finally{configureModules()}
});

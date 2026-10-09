import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace,setWorkspaceEntry,lectureTrashed,WORKSPACE_ID} from '../src/workspace-state.js';
import {mergeDecks,stampChanges} from '../src/sync-model.js';
import {MODULES,configureModules,moduleFor} from '../src/modules.js';
test('independent personal modules and trash changes merge across devices without resurrecting restored/deleted items',()=>{
 const base={lectureId:WORKSPACE_ID,cards:[],_workspace:emptyWorkspace()},a=setWorkspaceEntry(base._workspace,'modules','custom-a',{id:'custom-a',name:'A',deleted:false},10),b=setWorkspaceEntry(base._workspace,'modules','custom-b',{id:'custom-b',name:'B',deleted:false},20);
 const merged=mergeDecks(stampChanges(null,{...base,_workspace:a},10),stampChanges(null,{...base,_workspace:b},20));assert.equal(Object.keys(merged._workspace.modules).length,2);
 const trashed=stampChanges(merged,{...merged,_workspace:setWorkspaceEntry(merged._workspace,'lectures','cell-injury-2',{deleted:true},30)},30);
 const restored=stampChanges(trashed,{...trashed,_workspace:setWorkspaceEntry(trashed._workspace,'lectures','cell-injury-2',{deleted:false},40)},40);
 assert.equal(lectureTrashed(mergeDecks(restored,trashed)._workspace,'cell-injury-2'),false);assert.equal(lectureTrashed(mergeDecks(merged,trashed)._workspace,'cell-injury-2'),true);assert.equal(lectureTrashed(trashed._workspace,'cell-injury'),false);
});
test('personal module registry and hidden default modules reset cleanly between account scopes',()=>{
 try{configureModules({modules:{'custom-a':{id:'custom-a',name:'My subject',code:'M1'},pathobiology:{id:'pathobiology',deleted:true}}});assert.equal(MODULES.length,4);assert.equal(moduleFor({lectureId:'cell-death'}),'');assert.equal(moduleFor({moduleId:'custom-a'}),'custom-a');configureModules();assert.equal(MODULES.length,4);assert.equal(moduleFor({moduleId:'custom-a'}),'');assert.equal(moduleFor({lectureId:'cell-death'}),'pathobiology')}finally{configureModules()}
});

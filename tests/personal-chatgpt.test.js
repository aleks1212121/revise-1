import test from 'node:test';import assert from 'node:assert/strict';
import {inferredModule,personalDeckPrompt} from '../src/personal-chatgpt.js';
const modules=[{id:'a',name:'Pathobiology',code:'LS5009'},{id:'b',name:'Medical Genetics',code:'LS5023'}];
test('personal deck module inference is exact and never guesses an unknown or ambiguous module',()=>{
 assert.equal(inferredModule({moduleCode:'ls 5009'},modules),'a');assert.equal(inferredModule({moduleName:'medical genetics'},modules),'b');
 assert.equal(inferredModule({moduleCode:'LS9999',moduleName:'Pathobiology'},modules),'');assert.equal(inferredModule({moduleName:'Cell biology'},modules),'');assert.equal(inferredModule({moduleCode:'LS5009'},[...modules,{id:'c',name:'Other',code:'LS5009'}]),'');
});
test('ChatGPT generation prompt stands alone and requests module routing and source metadata',()=>{
 const prompt=personalDeckPrompt('Breast practical','pathobiology','lecture.pdf',modules);
 assert.match(prompt,/not assume access.*earlier conversations/);assert.match(prompt,/do not attempt to deliver/);assert.match(prompt,/"source": "lecture.pdf"/);assert.match(prompt,/"moduleCode"/);assert.match(prompt,/LS5009/);assert.match(prompt,/no file is attached/);assert.match(prompt,/one tested fact per note/);
});

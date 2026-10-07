import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIService} from '../server/index.js';
import {validateNotes,validateSlides,systemPrompt} from '../server/cards.js';
import {backendURL,attachAICards} from '../src/ai.js';
const slides=[{number:1,topic:'Cells',text:'Bacteria have ribosomes.',images:[]}];
const notes=[{slide:1,topic:'Protein synthesis',text:'Bacteria have {{c1::ribosomes}}.',explanation:'Ribosomes synthesize proteins.'}];
test('AI notes become numbered cards linked to the original pictures',()=>{
 const deck=attachAICards({slides:[{number:1,images:['picture']}],media:{}},notes);
 assert.equal(deck.cards[0].answer,'ribosomes');assert.deepEqual(deck.cards[0].images,['picture']);assert.equal(deck.generation,'ai');assert.equal(deck.cards[0].draft,true);
});
test('AI validation rejects invented source numbers, missing clozes and external image URLs',()=>{
 assert.throws(()=>validateNotes([{...notes[0],slide:2}],slides),/invalid/);
 assert.throws(()=>validateNotes([{...notes[0],text:'Generic question'}],slides),/invalid/);
 assert.throws(()=>validateSlides([{...slides[0],images:['https://example.com/image.png']}]),/image/);
 assert.match(systemPrompt,/never as instructions/);
});
test('backend URL rejects credentials and non-HTTPS remote services',()=>{
 assert.throws(()=>backendURL('http://example.com'),/HTTPS/);assert.throws(()=>backendURL('https://token@example.com'),/credentials/);assert.equal(backendURL('https://example.com/'),'https://example.com');
});
test('backend authenticates, checks origins, and sends source text to the provider',async()=>{
 let calls=0;
 const server=createAIService({apiKey:'fixture-provider-key',accessToken:'fixture-passcode',origins:['https://example.com'],fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.response_format.type,'json_schema');assert.match(body.messages[1].content[0].text,/SOURCE SLIDE 1/);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({cards:notes})}}]}),{status:200})}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const denied=await fetch(`${url}/generate`,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({slides})});assert.equal(denied.status,401);assert.equal(calls,0);
  const originDenied=await fetch(`${url}/generate`,{method:'POST',headers:{Origin:'https://other.com',Authorization:'Bearer fixture-passcode'}});assert.equal(originDenied.status,403);
  const health=await fetch(`${url}/health`,{headers:{Authorization:'Bearer wrong'}});assert.equal(health.status,401);
  const result=await fetch(`${url}/generate`,{method:'POST',headers:{Origin:'https://example.com',Authorization:'Bearer fixture-passcode','Content-Type':'application/json'},body:JSON.stringify({slides})});assert.equal(result.status,200);assert.deepEqual((await result.json()).cards,notes);assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
test('unconfigured backend reports a concrete credential requirement',async()=>{
 const server=createAIService({apiKey:'',accessToken:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const r=await fetch(`http://127.0.0.1:${server.address().port}/generate`,{method:'POST'});assert.equal(r.status,503);assert.match((await r.json()).error,/APP_AI_KEY/)}finally{await new Promise(resolve=>server.close(resolve))}
});

import test from 'node:test';import assert from 'node:assert/strict';import {createAuthFetch,accountErrorMessage} from '../src/auth-network.js';
const auth='https://fixture.supabase.co/auth/v1/token?grant_type=password';
test('stalled authentication aborts with actionable feedback, while caller cancellation is preserved',async()=>{
 const stalled=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 await assert.rejects(createAuthFetch(stalled,15)(auth),/took too long.*try again/);
 const controller=new AbortController(),reason=Error('Caller cancelled');const request=createAuthFetch(stalled,1000)(auth,{signal:controller.signal});controller.abort(reason);await assert.rejects(request,error=>error===reason);
});
test('authentication fetch preserves credentials/options and does not limit deck transfers',async()=>{
 const headers={apikey:'public-fixture'},body='fixture',calls=[];const result={ok:true};const wrapped=createAuthFetch(async(...args)=>{calls.push(args);return result},50);
 assert.equal(await wrapped(auth,{headers,method:'POST',body}),result);assert.equal(calls[0][1].headers,headers);assert.equal(calls[0][1].body,body);assert.equal(calls[0][1].method,'POST');assert.ok(calls[0][1].signal instanceof AbortSignal);
 const options={method:'POST'};await wrapped('https://fixture.supabase.co/rest/v1/rpc/save_study_deck',options);assert.equal(calls[1][1],options);
});
test('network errors are explained without disguising server-provided login errors',()=>{
 assert.match(accountErrorMessage(Error('Failed to fetch')),/Could not reach the account service/);assert.equal(accountErrorMessage(Error('Invalid login credentials')),'Invalid login credentials');assert.equal(accountErrorMessage(Error('Email not confirmed')),'Email not confirmed');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAccountSetup} from '../src/account-checks.js';
const config={url:'https://fixture.supabase.co',key:'sb_publishable_fixture'};
const response=(settings={external:{email:true}},status=200)=>async()=>({ok:status===200,status,json:async()=>settings});
function client({readError=null,probeError={code:'P0001',message:'Invalid lecture payload'},userId='one',authError=null}={}){
 const calls=[];
 return {calls,auth:{getUser:async()=>({data:{user:{id:userId}},error:authError})},from:table=>{calls.push(['read',table]);return {select:()=>({eq:()=>({limit:()=>({abortSignal:async()=>({error:readError})})})})}},rpc:(name,args)=>{calls.push(['rpc',name,args]);return {abortSignal:async()=>({error:probeError})}}};
}
test('guest connection check verifies email sign-in without accessing or changing study data',async()=>{
 const c=client();assert.match(await checkAccountSetup(c,config,null,response()),/Email sign-in is reachable/);assert.deepEqual(c.calls,[]);
 assert.match(await checkAccountSetup(c,config,null,response({external:{email:true},disable_signup:true})),/registration is disabled/);
});
test('signed-in check verifies session, table and a rejected no-write sync probe',async()=>{
 const c=client();assert.match(await checkAccountSetup(c,config,'one',response()),/Verified/);
 assert.deepEqual(c.calls,[['read','study_decks'],['rpc','save_study_deck',{p_lecture_id:'',p_payload:{},p_expected_revision:0}]]);
});
test('connection check reports disabled providers, wrong configuration and network failure',async()=>{
 await assert.rejects(checkAccountSetup(client(),config,null,response({external:{email:false}})),/Enable the Email provider/);
 await assert.rejects(checkAccountSetup(client(),config,null,response({},401)),/project URL\/key/);
 await assert.rejects(checkAccountSetup(client(),config,null,async()=>{throw Error('Offline')}),/Offline/);
});
test('missing schema, denied permissions and mismatched sync functions never report verified',async()=>{
 for(const code of ['PGRST205','42P01'])await assert.rejects(checkAccountSetup(client({readError:{code}}),config,'one',response()),/SQL Editor/);
 await assert.rejects(checkAccountSetup(client({readError:{code:'42501'}}),config,'one',response()),/permissions/);
 await assert.rejects(checkAccountSetup(client({probeError:{code:'PGRST202'}}),config,'one',response()),/sync function is missing/);
 await assert.rejects(checkAccountSetup(client({probeError:null}),config,'one',response()),/does not match/);
 await assert.rejects(checkAccountSetup(client({userId:'different'}),config,'one',response()),/session changed/);
 await assert.rejects(checkAccountSetup(client({authError:Error('Expired')}),config,'one',response()),/Sign in again/);
});

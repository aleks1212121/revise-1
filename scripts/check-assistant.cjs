const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture,rows,A}=require('./check-accounts.cjs');const {navigate}=require('./navigation-helper.cjs');
const TOKEN='chuds_worker_'+'testkey'.repeat(12);
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{for(const phone of [false,true]){
 rows.clear();let ready=false;const keys=[],errors=[];
 const ctx=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1280,height:800},isMobile:phone,hasTouch:phone});
 await fixture(ctx,{socialHandler:async(name,body,owner)=>{
  if(name==='is_study_admin')return {data:owner===A};
  if(name==='study_admin_dashboard')return {data:{users:[],submissions:[],user_count:0,submission_count:0,pending_count:0}};
  if(name==='study_admin_prepared_decks'||name==='lecture_submissions')return {data:[]};
  if(['issue_study_worker_access','list_study_worker_access','revoke_study_worker_access'].includes(name)){
   assert.equal(owner,A);if(!ready)return {error:{code:'PGRST202',message:'Missing worker setup'}};
   if(name==='issue_study_worker_access'){const key={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',label:body.p_label,expires_at:new Date(Date.now()+30*86400000).toISOString(),revoked:false};keys.push(key);return {data:{...key,key:TOKEN}}}
   if(name==='list_study_worker_access')return {data:keys};
   keys.find(k=>k.id===body.p_id).revoked=true;return {data:null};
  }
 }});
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text}},configurable:true}));
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4189/revise-1/');await p.locator('#flip').waitFor();await navigate(p,'account');await p.locator('#account-email').fill('a@example.test');await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await p.locator('#admin-mode').check();await navigate(p,'admin');await p.locator('#assistant-create-key:not([disabled])').waitFor();
 await p.locator('#assistant-access summary').click();await p.locator('[data-assistant-copy="sql"]').click();assert.match(await p.evaluate(()=>window.__copied),/study_worker_deliver/);await p.locator('#assistant-access summary').click();await p.locator('[data-assistant-copy="function"]').click();assert.match(await p.evaluate(()=>window.__copied),/SUPABASE_SERVICE_ROLE_KEY/);
 await p.locator('#assistant-create-key').click();await p.locator('#assistant-access [role="alert"]').filter({hasText:/Run the assistant setup/}).waitFor();ready=true;await p.locator('#assistant-create-key').click();await p.locator('#assistant-key').waitFor();assert.equal(await p.locator('#assistant-key').getAttribute('type'),'password');await p.locator('#assistant-copy-key').click();assert.equal(await p.evaluate(()=>window.__copied),TOKEN);assert.equal(await p.evaluate(t=>JSON.stringify(localStorage).includes(t),TOKEN),false,'worker key is never persisted in browser settings');
 await navigate(p,'account');await p.locator('#admin-mode').uncheck();await p.locator('#admin-mode').check();await navigate(p,'admin');assert.equal(await p.locator('#assistant-key').count(),0,'mode toggle clears the displayed secret');await p.locator('#assistant-list-keys').click();await p.locator('[data-assistant-revoke]').waitFor();await p.locator('[data-assistant-revoke]').click();await p.locator('#assistant-access [role="status"]').filter({hasText:/revoked/}).waitFor();assert.equal(keys[0].revoked,true);
 await navigate(p,'modules');await p.locator('#create-module input[name="name"]').fill('Cell biology');await p.locator('#create-module input[name="code"]').fill('LS5001');await p.locator('#create-module button').click();await p.locator('[data-module]').filter({hasText:'Cell biology'}).waitFor();await navigate(p,'submissions');await p.locator('#submission-module option').filter({hasText:'Cell biology (LS5001)'}).waitFor({state:'attached'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await ctx.close();
 }console.log('PASS: desktop/phone limited-key setup/copy, missing SQL, masked ephemeral key, revocation and personal-module submission choices.')}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

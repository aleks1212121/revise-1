const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture,A,rows}=require('./check-accounts.cjs');const {navigate}=require('./navigation-helper.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const phone of [false,true]){
 rows.clear();let enabled=false,setup=false,tests=0,saved=0;const errors=[];
 const ctx=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:800},isMobile:phone,hasTouch:phone});
 await fixture(ctx,{socialHandler:async(name,body,owner)=>{
  if(name==='is_study_admin')return {data:owner===A};
  if(name==='study_admin_dashboard')return {data:{users:[],submissions:[],user_count:0,submission_count:0,pending_count:0}};
  if(['study_admin_prepared_decks','lecture_submissions'].includes(name))return {data:[]};
  if(name==='study_push_subscription_enabled')return {data:enabled};
  if(name==='save_study_push_subscription'){assert.equal(owner,A);assert.equal(body.p_subscription.endpoint,'https://fcm.googleapis.com/device');saved++;enabled=true;return {data:null}}
  if(name==='remove_study_push_subscription'){assert.equal(owner,A);enabled=false;return {data:null}}
  if(name==='slide-notifications'){
   assert.equal(owner,A);if(!setup)return {error:{error:'Run notifications.sql first'}};
   if(body.action==='initialize')return {data:{publicKey:'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}};
   assert.equal(body.action,'test');assert.equal(body.endpoint,'https://fcm.googleapis.com/device');tests++;return {data:{sent:1,failed:0}};
  }
 }});
 await ctx.addInitScript(()=>{
  window.__permission='default';let sub=null;
  Object.defineProperty(window,'Notification',{value:{get permission(){return window.__permission},requestPermission:async()=>window.__permission},configurable:true});
  Object.defineProperty(window,'PushManager',{value:function(){},configurable:true});
  const makeSub=()=>({endpoint:'https://fcm.googleapis.com/device',toJSON:()=>({endpoint:'https://fcm.googleapis.com/device',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}}),unsubscribe:async()=>{sub=null;return true}});
  const registration={pushManager:{getSubscription:async()=>sub,subscribe:async()=>sub=makeSub()}};
  const worker=new EventTarget();worker.getRegistration=async()=>registration;worker.register=async()=>registration;worker.ready=Promise.resolve(registration);
  Object.defineProperty(navigator,'serviceWorker',{value:worker,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text},configurable:true});
 });
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4189/revise-1/');await p.locator('#flip').waitFor();await navigate(p,'account');await p.locator('#account-email').fill('a@example.test');await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await p.locator('#admin-mode').check();await navigate(p,'admin');await p.locator('#inbox-push-enable').waitFor();
 await p.evaluate(()=>window.__permission='denied');await p.locator('#inbox-push-enable').click();await p.locator('#inbox-notifications [role="alert"]').filter({hasText:/not allowed/}).waitFor();assert.equal(saved,0);
 await p.evaluate(()=>window.__permission='granted');await p.locator('#inbox-push-enable').click();await p.locator('#inbox-notifications [role="alert"]').filter({hasText:/notifications.sql/}).waitFor();assert.equal(saved,0);
 await p.locator('#inbox-notifications summary').click();await p.locator('[data-push-copy="sql"]').click();assert.match(await p.evaluate(()=>window.__copied),/study_slide_push/);await p.locator('#inbox-notifications summary').click();await p.locator('[data-push-copy="function"]').click();assert.match(await p.evaluate(()=>window.__copied),/web-push@3.6.7/);
 setup=true;await p.locator('#inbox-push-enable').click();await p.locator('#inbox-push-test').waitFor();assert.equal(saved,1);await p.locator('#inbox-push-test').click();await p.locator('#inbox-notifications [role="status"]').filter({hasText:/Test sent/}).waitFor();assert.equal(tests,1);
 await navigate(p,'lectures');await p.evaluate(()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'chuds-open-inbox'}})));await p.locator('#inbox-push-disable').waitFor();await p.locator('#inbox-push-disable').click();await p.locator('#inbox-notifications [role="status"]').filter({hasText:/turned off/}).waitFor();assert.equal(enabled,false);assert.equal(await p.locator('#inbox-push-test').count(),0);
 await navigate(p,'account');await p.locator('#admin-mode').uncheck();await p.locator('#sign-out').click();await p.locator('#account-email').waitFor();await p.locator('#account-email').fill('b@example.test');await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();assert.equal(await p.locator('#inbox-notifications').count(),0);assert.deepEqual(errors,[]);await ctx.close();
 }console.log('PASS: desktop/phone permission denial, setup errors, setup copying, admin-only enable/test/disable and sign-out isolation.')}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

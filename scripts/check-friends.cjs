const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {fixture,rows,A,B}=require('./check-accounts.cjs');
const url=process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/';
(async()=>{
 const {studySummary}=await import('../src/activity.js');const profiles=new Map(),requests=[];
 function profile(id){if(!profiles.has(id))profiles.set(id,{user_id:id,display_name:'Student',friend_code:id===A?'AAAAAAAAAAAA':'BBBBBBBBBBBB'});return profiles.get(id)}
 async function handler(name,args,id){
  const self=profile(id);
  if(name==='study_friends_dashboard'){
   const visible=[id,...requests.filter(r=>r.status==='accepted'&&(r.requester===id||r.recipient===id)).map(r=>r.requester===id?r.recipient:r.requester)];
   return {data:{profile:self,leaderboard:visible.map(user_id=>({user_id,display_name:profile(user_id).display_name,stats:studySummary([...(rows.get(user_id)?.values()||[])].map(r=>r.payload))})),requests:requests.filter(r=>r.status==='pending'&&(r.requester===id||r.recipient===id)).map(r=>({...r,incoming:r.recipient===id,display_name:profile(r.requester===id?r.recipient:r.requester).display_name}))}};
  }
  if(name==='set_study_display_name'){self.display_name=args.new_name;return {data:null}}
  if(name==='request_study_friend'){const target=[...profiles.values()].find(p=>p.friend_code===args.code);if(!target)return {error:{message:'Friend code not found'}};requests.push({requester:id,recipient:target.user_id,status:'pending'});return {data:'Friend request sent'}}
  if(name==='respond_study_friend'){const index=requests.findIndex(r=>r.requester===args.other_id&&r.recipient===id);if(index<0)return {error:{message:'Incoming request not found'}};if(args.accept)requests[index].status='accepted';else requests.splice(index,1);return {data:null}}
  if(name==='remove_study_friend'){const index=requests.findIndex(r=>(r.requester===id&&r.recipient===args.other_id)||(r.recipient===id&&r.requester===args.other_id));if(index>=0)requests.splice(index,1);return {data:null}}
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const errors=[];
 const ready=async p=>p.waitForFunction(()=>!document.querySelector('main[inert]'));
 const circle=async p=>{await ready(p);await p.locator(await p.locator('.mobile-friends').isVisible()?'.mobile-friends':'.friends-nav').click();await p.locator('#friend-name').waitFor();await p.waitForFunction(()=>!document.querySelector('#friends-refresh')?.disabled)};
 const refresh=async p=>{await p.locator('#friends-refresh').click();await p.waitForFunction(()=>!document.querySelector('#friends-refresh')?.disabled)};
 const login=async(p,email)=>{await p.goto(url);await p.locator('#flip').waitFor();await p.locator(await p.locator('.mobile-account').isVisible()?'.mobile-account':'.account-nav').click();await p.locator('#account-email').fill(email);await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await ready(p)};
 try{
  const aContext=await browser.newContext(),bContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});for(const c of [aContext,bContext])await fixture(c,{socialHandler:handler});
  const a=await aContext.newPage(),b=await bContext.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await login(a,'a@example.test');await a.locator('[data-view="study"]').click();await a.locator('#flip').click();await a.locator('#good').click();await circle(a);assert.equal(await a.locator('.social-stats>div:nth-child(2) strong').innerText(),'1');assert.equal(await a.locator('.social-stats>div:nth-child(4) strong').innerText(),'1');
  await a.locator('#friend-name').fill('Alice');await a.locator('#friend-profile button:not([type=button])').click();await a.getByText('Name saved',{exact:true}).waitFor();
  await login(b,'b@example.test');await circle(b);await b.locator('#friend-name').fill('Bob');await b.locator('#friend-profile button:not([type=button])').click();await b.getByText('Name saved',{exact:true}).waitFor();
  await a.locator('#friend-code').fill(await b.locator('#my-friend-code').innerText());await a.locator('#friend-add button').click();await a.getByText('Friend request sent',{exact:true}).waitFor();assert.equal(await a.locator('.friend-row').count(),1,'pending friend does not see progress');
  await refresh(b);await b.locator('[data-friend-accept]').click();await b.getByText('Friend added',{exact:true}).waitFor();await b.waitForFunction(()=>document.querySelectorAll('.friend-row').length===2);assert.equal(await b.locator('.friend-row').count(),2);await refresh(a);assert.equal(await a.locator('.friend-row').count(),2);
  await b.locator('[data-view="study"]').click();await b.locator('[data-filter="all"]').click();await b.locator('#phone-reveal-answer').tap();await b.locator('#good').tap();await b.locator('#prev').tap();await b.locator('#phone-reveal-answer').tap();await b.locator('#good').tap();await circle(b);assert.equal(await b.locator('.social-stats>div:nth-child(2) strong').innerText(),'1','repeat rating counts once');
  await refresh(a);await a.locator('#leaderboard-period').selectOption('week');assert.match(await a.locator('.friend-row').filter({hasText:'Bob'}).innerText(),/1/);
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'phone Friends page fits');await b.screenshot({path:'/tmp/friends-phone.png',fullPage:true});
  await a.locator('[data-friend-remove]').click();await a.getByText('Friend removed. Your progress is no longer shared with them.',{exact:true}).waitFor();await a.waitForFunction(()=>document.querySelectorAll('.friend-row').length===1);assert.equal(await a.locator('.friend-row').count(),1);await refresh(b);assert.equal(await b.locator('.friend-row').count(),1);
  await b.reload();await b.locator('#flip').waitFor();await circle(b);assert.equal(await b.locator('.social-stats>div:nth-child(2) strong').innerText(),'1','daily history survives reload');
  const guestContext=await browser.newContext();await fixture(guestContext);const guest=await guestContext.newPage();await guest.goto(url);await guest.locator('#flip').waitFor();await guest.locator('#flip').click();await guest.locator('#good').click();await guest.locator('.friends-nav').click();await guest.getByText('Your streak starts here.',{exact:true}).waitFor();assert.equal(await guest.locator('.social-stats>div:nth-child(4) strong').innerText(),'1');assert.equal(await guest.locator('#friend-name').count(),0);
  const missingContext=await browser.newContext();await fixture(missingContext,{socialHandler:name=>name==='study_friends_dashboard'?{error:{code:'PGRST202',message:'Missing migration'}}:undefined});const missing=await missingContext.newPage();await login(missing,'a@example.test');await missing.locator('.friends-nav').click();await missing.getByText(/Friends needs the new Supabase setup/).waitFor();assert.equal(await missing.locator('#friend-name').count(),0);await missing.locator('[data-view="study"]').click();await missing.locator('#flip').waitFor();
  assert.deepEqual(errors,[]);console.log('PASS Friends: activity/streaks, profile names, request/accept/remove consent, today/week leaderboard, phone layout, persistence, guest stats and missing-migration fallback.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const rows=new Map(), errors=[];let offline=false;
const user=id=>({id,aud:'authenticated',role:'authenticated',email:id===A?'a@example.test':'b@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
const token=id=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iss:'https://fixture.supabase.co/auth/v1',email:user(id).email})).toString('base64url'),'ZmFrZQ'].join('.');
async function fixture(context){
 await context.route('**/account-config.json',r=>r.fulfill({json:{supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'sb_publishable_fixture'}}));
 await context.route(/https:\/\/[^/]+\.supabase\.co\//,async r=>{
  const req=r.request(),url=new URL(req.url());if(url.hostname!=='fixture.supabase.co'){errors.push('Build uses a real Supabase project; rebuild without account configuration for fixture tests.');return r.abort()}const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers});
  const body=req.postDataJSON(),authorization=req.headers().authorization||'';
  let id;try{id=JSON.parse(Buffer.from(authorization.split('.')[1],'base64url').toString()).sub}catch{}
  const respond=(json,status=200)=>r.fulfill({json,status,headers});
  if(url.pathname.endsWith('/token')){id=body.email==='a@example.test'?A:B;return respond({access_token:token(id),refresh_token:'fixture-'+id,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user(id)})}
  if(url.pathname.endsWith('/settings'))return respond({external:{email:true},disable_signup:false});
  if(url.pathname.endsWith('/user'))return respond(user(id));
  if(url.pathname.endsWith('/logout')||url.pathname.endsWith('/recover'))return respond({});
  if(url.pathname.endsWith('/signup'))return respond({user:user(A),session:null});
  if(offline)return r.abort('internetdisconnected');
  assert.ok(id===A||id===B,'REST requires signed-in identity');
  if(!rows.has(id))rows.set(id,new Map());const collection=rows.get(id);
  if(url.pathname.endsWith('/study_decks'))return respond([...collection.values()]);
  if(url.pathname.endsWith('/save_study_deck')){
   if(body.p_lecture_id==='')return respond({code:'P0001',message:'Invalid lecture payload'},400);
   const current=collection.get(body.p_lecture_id);
   if((current?.revision||0)!==body.p_expected_revision)return respond({conflict:true,revision:current?.revision||0,payload:current?.payload||null});
   const row={lecture_id:body.p_lecture_id,payload:structuredClone(body.p_payload),revision:(current?.revision||0)+1};collection.set(row.lecture_id,row);return respond({conflict:false,revision:row.revision,payload:row.payload});
  }
  throw Error('Unhandled fixture '+url);
 });
}
async function settled(p){await p.waitForFunction(()=>!document.querySelector('main[inert]'));}
async function account(p){await settled(p);await p.locator('.account-nav').click()}
async function signin(p,email){await account(p);await p.locator('#account-email').fill(email);await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await settled(p)}
async function study(p){await settled(p);await p.locator('[data-view="study"]').click()}
async function stored(p,scope=''){return p.evaluate(async scope=>{const db=await new Promise((res,rej)=>{let q=indexedDB.open('micro-flashcards',1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});return new Promise(res=>{let q=db.transaction('decks').objectStore('decks').get(scope?`user:${scope}:lecture:microorganisms`:'lecture:microorganisms');q.onsuccess=()=>res(q.result)})},scope)}
async function grade(p,rating='good'){await study(p);await p.locator('#flip').click();await p.locator('#'+rating).click();await p.waitForTimeout(120)}
async function synced(p){await account(p);await p.locator('#sync-now').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await p.waitForTimeout(120)}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const c1=await browser.newContext(),c2=await browser.newContext();await fixture(c1);await fixture(c2);
 const p1=await c1.newPage(),p2=await c2.newPage();for(const p of [p1,p2])p.on('pageerror',e=>errors.push(e.message));
 await p1.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await p1.locator('#flip').waitFor();await grade(p1);
 const guest=await stored(p1),review=guest.cards.find(c=>c.reviews>0);assert.ok(review);
 await account(p1);await p1.locator('#check-account').click();await p1.getByText('Email sign-in is reachable. Sign in to check your database and sync function.').waitFor();
 await signin(p1,'a@example.test');const beforeCheck=JSON.stringify([...rows.get(A).values()]);await p1.locator('#check-account').click();await p1.getByText('Verified: your signed-in session, deck access and sync function are available. Use Sync now to save pending reviews.').waitFor();assert.equal(JSON.stringify([...rows.get(A).values()]),beforeCheck,'connection probe does not modify any deck');assert.equal((await stored(p1,A)).cards.find(c=>c.id===review.id).reviews||0,0,'guest does not auto leak into account');
 await p1.locator('#import-guest').click();await p1.waitForTimeout(500);await synced(p1);assert.equal((await stored(p1,A)).cards.find(c=>c.id===review.id).reviews,1);
 await p2.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await p2.locator('#flip').waitFor();await signin(p2,'a@example.test');assert.equal((await stored(p2,A)).cards.find(c=>c.id===review.id).reviews,1,'second device receives review');
 offline=true;await grade(p1,'hard');await study(p2);await p2.locator('#next').click();await p2.locator('#flip').click();await p2.locator('#easy').click();await p2.waitForTimeout(1300);
 const d1=await stored(p1,A),d2=await stored(p2,A),hard=d1.cards.find(c=>c.lastRating==='hard'),easy=d2.cards.find(c=>c.lastRating==='easy');assert.ok(hard);assert.ok(easy);assert.notEqual(hard.id,easy.id);
 offline=false;await synced(p1);await synced(p2);await synced(p1);
 for(const p of [p1,p2]){const d=await stored(p,A);assert.equal(d.cards.find(c=>c.id===hard.id).lastRating,'hard');assert.equal(d.cards.find(c=>c.id===easy.id).lastRating,'easy')}
 await settled(p1);await p1.locator('[data-view="lectures"]').click();
 const picture='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOe0AAAAASUVORK5CYII=';
 await p1.locator('#lecture-file').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({title:'Synced custom lecture',cards:[{question:'A cell contains {{c1::DNA}}.',text:'A cell contains {{c1::DNA}}.',answer:'DNA',type:'cloze',clozeNumber:1,slide:1,images:['photo'],showImagesFront:true}],media:{photo:picture},slides:[{number:1,text:'DNA',images:['photo']}]}))});
 await p1.locator('#lecture-title').fill('Synced custom lecture');await p1.locator('#lecture-upload button.primary').click();await p1.locator('#flip').waitFor();await synced(p1);await synced(p2);
 const custom=[...rows.get(A).values()].find(r=>r.payload.title==='Synced custom lecture');assert.ok(custom,'custom deck uploaded');
 await p2.locator(`.lecture-shortcut[data-open-lecture="${custom.lecture_id}"]`).click();await p2.locator('#flip img').waitFor();assert.equal(await p2.locator('#flip img').getAttribute('src'),picture,'custom pictures sync');
 await account(p1);await p1.locator('#sign-out').click();await p1.locator('#account-email').waitFor();assert.equal((await stored(p1)).cards.filter(c=>c.reviews>0).length,1,'guest unchanged');
 await p1.locator('#account-email').fill('new@example.test');await p1.locator('#account-password').fill('fixture-password');await p1.locator('button[value="signup"]').click();await p1.getByText('Check your email to confirm your account, then sign in.').waitFor();
 await p1.locator('#account-email').fill('a@example.test');await p1.locator('#password-reset').click();await p1.getByText('If this email has an account, a password reset link will arrive shortly.').waitFor();
 await signin(p1,'b@example.test');assert.equal((await stored(p1,B)).cards.filter(c=>c.reviews>0).length,0,'other account fresh');assert.equal(rows.get(B).size,4);
 await p2.reload();await p2.locator('#flip').waitFor();await account(p2);await p2.locator('#sync-status').filter({hasText:/Synced/}).waitFor();assert.match(await p2.locator('.account-panel').innerText(),/a@example.test/);
 const mobile=await browser.newContext({viewport:{width:390,height:844}});await fixture(mobile);const mp=await mobile.newPage();await mp.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await mp.locator('#flip').waitFor();await mp.locator('.mobile-account').click();await mp.locator('#account-email').waitFor();assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile no horizontal page overflow');
 const plain=await browser.newContext();await plain.route('**/account-config.json',r=>r.fulfill({json:{supabaseUrl:'',supabasePublishableKey:''}}));await plain.route(/https:\/\/[^/]+\.supabase\.co\//,r=>r.abort());const pp=await plain.newPage();await pp.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await pp.locator('#flip').waitFor();await pp.locator('.account-nav').click();await pp.getByText('Account sign-in will be available once the cloud service is connected. You can keep studying as a guest.').waitFor();assert.equal(await pp.locator('#account-auth').count(),0);
 const recovery=await browser.newContext();await fixture(recovery);const rp=await recovery.newPage();rp.on('pageerror',e=>errors.push(e.message));
 const recoveryHash=new URLSearchParams({access_token:token(A),refresh_token:'fixture-'+A,expires_in:'3600',expires_at:String(Math.floor(Date.now()/1000)+3600),token_type:'bearer',type:'recovery'});
 await rp.goto((process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/')+'#'+recoveryHash);await rp.locator('#new-password').waitFor();await settled(rp);await rp.locator('#new-password').fill('updated-fixture-password');await rp.locator('#password-update button').click();await rp.getByText('Password updated.',{exact:true}).waitFor();await rp.locator('#sync-status').filter({hasText:/Synced/}).waitFor();
 const confirmation=await browser.newContext();await fixture(confirmation);const cp=await confirmation.newPage();cp.on('pageerror',e=>errors.push(e.message));const confirmationHash=new URLSearchParams({access_token:token(A),refresh_token:'fixture-'+A,expires_in:'3600',expires_at:String(Math.floor(Date.now()/1000)+3600),token_type:'bearer',type:'signup'});
 await cp.goto((process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/')+'#'+confirmationHash);await cp.locator('#flip').waitFor();await account(cp);await cp.locator('#sync-status').filter({hasText:/Synced/}).waitFor();assert.match(await cp.locator('.account-panel').innerText(),/a@example.test/);
 assert.deepEqual(errors,[]);console.log('PASS browser: account connection checks without writes, guest isolation/import, two-device reviews, offline conflict merge, account separation, custom decks and pictures, signup/reset notices and email-link return flows, restored sessions, mobile account access, unconfigured guest fallback');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture,A,B}=require('./check-accounts.cjs');
const {navigate}=require('./navigation-helper.cjs');
const url='http://127.0.0.1:4189/revise-1/';
const code='CHUDS-private-fixture-code-not-a-real-code';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{for(const phone of [false,true]){
  let admin=false;const submissions=[],objects=new Map(),errors=[];
  const ctx=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1280,height:800},hasTouch:phone,isMobile:phone});
  await fixture(ctx,{socialHandler:async(name,body,owner)=>{
   if(name==='is_study_admin')return {data:admin&&owner===A};
   if(name==='unlock_study_admin'){if(body.p_code!==code||owner!==A)return {error:{message:'Invalid or expired admin code'}};admin=true;return {data:null}}
   if(name==='lecture_submissions')return {data:submissions.filter(s=>s.user_id===owner)};
   if(name==='submit_study_lecture'){
    const s={id:body.p_id,user_id:owner,title:body.p_title,module_id:body.p_module,message:body.p_message,file_name:body.p_file_name,file_size:body.p_file_size,object_path:`${owner}/${body.p_id}/source.${body.p_extension}`,status:'received',admin_reply:'',created_at:new Date().toISOString()};assert.ok(objects.has(s.object_path));submissions.push(s);return {data:s.id};
   }
   if(name==='study_admin_dashboard'){assert.ok(admin&&owner===A);return {data:{users:[{id:A,email:'a@example.test',created_at:new Date().toISOString(),is_admin:true,decks:6,studied_cards:5},{id:B,email:'b@example.test',created_at:new Date().toISOString(),is_admin:false,decks:6,studied_cards:0}].filter(u=>u.email.includes(body.p_query)),submissions:submissions.map(s=>({...s,sender_email:'b@example.test'})),user_count:body.p_query?1:2,submission_count:submissions.length,pending_count:submissions.filter(s=>s.status!=='completed').length}}}
   if(name==='review_study_submission'){assert.ok(admin&&owner===A);const s=submissions.find(s=>s.id===body.p_id);Object.assign(s,{status:body.p_status,admin_reply:body.p_reply});return {data:null}}
  }});
  await ctx.route('**/storage/v1/object/**',async r=>{
   const path=decodeURIComponent(new URL(r.request().url()).pathname.split('/lecture-submissions/')[1]);
   if(r.request().method()==='POST'){objects.set(path,Buffer.from('%PDF-1.7\nTest slides'));return r.fulfill({json:{Key:'lecture-submissions/'+path}})}
   if(r.request().method()==='GET'){assert.ok(objects.has(path));return r.fulfill({body:objects.get(path),contentType:'application/pdf'})}
   return r.fulfill({json:[]});
  });
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('#flip').waitFor();
  await navigate(p,'account');await p.locator('#use-guest').click();await p.locator('#flip').waitFor();assert.match(await p.locator('.notice[role="status"]').innerText(),/Guest mode/);
  await navigate(p,'submissions');await p.getByRole('heading',{name:'Sign in to send slides'}).waitFor();assert.equal(await p.locator('#submission-form').count(),0);
  async function signin(email){await navigate(p,'account');await p.locator('#account-email').fill(email);await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await p.locator('#admin-unlock button:not([disabled])').waitFor()}
  await signin('b@example.test');assert.equal(await p.locator('.simple-sidebar [data-view="admin"]').count(),0);
  await navigate(p,'submissions');await p.locator('#submission-form button').waitFor();await p.locator('#submission-title').fill('New lecture');await p.locator('#submission-module').selectOption('pathobiology');await p.locator('#submission-message').fill('Please turn this into cards');
  await p.locator('#submission-file').setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});await p.locator('#submission-form button').click();await p.getByRole('alert').filter({hasText:/does not look like a PDF/}).waitFor();assert.equal(objects.size,0);
  await p.locator('#submission-file').setInputFiles({name:'lecture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nTest slides')});await p.locator('#submission-form button').click();await p.getByRole('status').filter({hasText:/Slides sent/}).waitFor();assert.equal(submissions.length,1);assert.equal(submissions[0].user_id,B);await p.locator('.submission-entry').waitFor();
  await navigate(p,'account');await p.locator('#use-guest').click();await p.locator('#flip').waitFor();await navigate(p,'submissions');assert.equal(await p.locator('.submission-entry').count(),0);
  await signin('a@example.test');await p.locator('#admin-code').fill('wrong-code-long-enough-for-validation');await p.locator('#admin-unlock button').click();await p.getByRole('alert').filter({hasText:/Invalid or expired/}).waitFor();assert.equal(await p.locator('.simple-sidebar [data-view="admin"]').count(),0);
  await p.locator('#admin-code').fill(code);await p.locator('#admin-unlock button').click();await p.locator('#admin-mode').waitFor();assert.equal(await p.locator('#admin-mode').isChecked(),true);
  await navigate(p,'admin');await p.locator('.admin-user-list').waitFor();assert.match(await p.locator('.admin-user-list').innerText(),/b@example.test/);await p.locator('#admin-query').fill('b@');await p.locator('#admin-search button').click();await p.waitForFunction(()=>document.querySelectorAll('.admin-user-list article').length===1);
  const download=p.waitForEvent('download');await p.locator('[data-submission-download]').click();assert.equal((await download).suggestedFilename(),'lecture.pdf');
  await p.locator('[data-submission-review] select').selectOption('completed');await p.locator('[data-submission-review] textarea').fill('I have reviewed your lecture');await p.locator('[data-submission-review] button').click();await p.getByRole('status').filter({hasText:/Review saved/}).waitFor();assert.equal(submissions[0].status,'completed');
  await navigate(p,'account');await p.locator('#admin-mode').uncheck();assert.equal(await p.locator('.simple-sidebar [data-view="admin"]').count(),0);await p.reload();await p.locator('#flip').waitFor();await navigate(p,'account');await p.locator('#admin-mode').waitFor();assert.equal(await p.locator('#admin-mode').isChecked(),false);await p.locator('#admin-mode').check();await navigate(p,'admin');await p.locator('.admin-user-list').waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'admin fits phone width');
  await navigate(p,'account');await p.locator('#use-guest').click();await p.locator('#flip').waitFor();await signin('b@example.test');assert.equal(await p.locator('#admin-mode').count(),0);await navigate(p,'submissions');await p.locator('.admin-reply').waitFor();assert.match(await p.locator('.admin-reply').innerText(),/I have reviewed your lecture/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await ctx.close();
 }
 console.log('PASS: desktop/phone guest study, private submissions, file validation, code activation, user list, slide download, admin replies and persistent per-account mode toggle.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

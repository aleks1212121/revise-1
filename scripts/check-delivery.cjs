const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture,rows,A,B}=require('./check-accounts.cjs');const {navigate}=require('./navigation-helper.cjs');
const picture='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOe0AAAAASUVORK5CYII=';
const deck=title=>({title,generation:'reviewed',moduleName:'Molecular Biology of the Cell',moduleCode:'LS5001',cards:[{type:'cloze',text:'Motility depends on {{c1::actin}}.',slide:1,images:['crop'],importance:'important',difficulty:'easy'}],media:{crop:picture},slides:[{number:1,images:['crop']}]});
async function signIn(p,email){await navigate(p,'account');await p.locator('#account-email').fill(email);await p.locator('#account-password').fill('fixture-password');await p.locator('button[value="signin"]').click();await p.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await p.waitForFunction(()=>!document.querySelector('main[inert]'))}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{for(const phone of [false,true]){
 rows.clear();const errors=[],calls=[];let installed=false;
 const submissions=['Cell Motility','Intracellular Trafficking'].map((title,i)=>({id:['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'][i],user_id:B,title,module_id:'',file_name:title+'.pdf',status:'received',created_at:new Date().toISOString(),sender_email:'b@example.test'}));
 const handler=async(name,body,id)=>{
  if(name==='is_study_admin')return {data:id===A};
  if(name==='study_admin_dashboard')return {data:{users:[],user_count:0,submissions,submission_count:2,pending_count:submissions.filter(s=>s.status!=='completed').length}};
  if(name==='deliver_study_submission'){
   calls.push(body);if(!installed)return {error:{code:'PGRST202',message:'Function not installed'}};
   assert.equal(id,A);const row=submissions.find(s=>s.id===body.p_id);assert.equal(row.user_id,B);const target='submission-'+row.id;
   if(!rows.has(B))rows.set(B,new Map());const recipient=rows.get(B);if(recipient.has(target))return {error:{message:'This submission already has a delivered deck. The existing deck and progress have been kept.'}};
   recipient.set('__workspace-settings',{lecture_id:'__workspace-settings',revision:2,payload:{lectureId:'__workspace-settings',cards:[],generation:'settings',_workspace:{modules:{'custom-ls5001':{id:'custom-ls5001',name:body.p_module_name,code:body.p_module_code,deleted:false,_at:Date.now()}},lectures:{}}}});
   recipient.set(target,{lecture_id:target,revision:1,payload:{...body.p_deck,lectureId:target,moduleId:'custom-ls5001'}});row.status='completed';return {data:target};
  }
 };
 const c=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1280,height:800},hasTouch:phone,isMobile:phone});await fixture(c,{socialHandler:handler});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4189/revise-1/');await p.locator('#flip').waitFor();await signIn(p,'a@example.test');await p.locator('#admin-mode').check();await navigate(p,'admin');
 for(let i=0;i<2;i++){
  await p.locator(`[data-chatgpt-submission="${submissions[i].id}"]`).click();
  const content=process.env.DELIVERY_DECK_DIR?fs.readFileSync(process.env.DELIVERY_DECK_DIR+'/'+['cell-motility-deck.json','intracellular-trafficking-deck.json'][i]):Buffer.from(JSON.stringify(deck(submissions[i].title)));
  await p.locator('#chatgpt-json-file').setInputFiles({name:'deck.json',mimeType:'application/json',buffer:content});await p.locator('.chatgpt-preview').waitFor();assert.equal(await p.locator('#recipient-code').inputValue(),'LS5001');assert.equal(await p.locator('#recipient-module').inputValue(),'Molecular Biology of the Cell');
  p.once('dialog',d=>d.dismiss());await p.locator('#chatgpt-deliver').click();assert.equal(calls.length,i?2:0,'cancel makes no server call');
  if(!i){p.once('dialog',d=>d.accept());await p.locator('#chatgpt-deliver').click();await p.locator('#chatgpt-tools [role="alert"]').filter({hasText:/delivery.sql/}).waitFor();installed=true}
  p.once('dialog',d=>{assert.match(d.message(),/b@example.test/);return d.accept()});await p.locator('#chatgpt-deliver').click();await p.locator('#chatgpt-tools [role="status"]').filter({hasText:/Deck delivered/}).waitFor();
  const sent=calls.at(-1);assert.equal(sent.p_id,submissions[i].id);assert.equal(sent.p_module_code,'LS5001');assert.ok(sent.p_deck.cards.every(c=>c.status==='new'));assert.ok(Object.keys(sent.p_deck.media).length);assert.ok(!rows.get(A).has('submission-'+submissions[i].id),'delivery not imported into admin account');
 }
 const receiving=await browser.newContext();await fixture(receiving,{socialHandler:handler});const rp=await receiving.newPage();rp.on('pageerror',e=>errors.push(e.message));await rp.goto('http://127.0.0.1:4189/revise-1/');await rp.locator('#flip').waitFor();await signIn(rp,'b@example.test');await navigate(rp,'modules');await rp.getByText('Molecular Biology of the Cell',{exact:true}).first().waitFor();await navigate(rp,'study');await rp.locator('#lecture-switch').selectOption('submission-'+submissions[0].id);for(let attempt=0;attempt<15;attempt++){await rp.locator('#flip').click();if(await rp.locator('#flip .slide-pictures img').count())break;await rp.locator('#next').click()}await rp.locator('#flip .slide-pictures img').first().waitFor();assert.deepEqual(errors,[]);await receiving.close();await c.close();
 }console.log('PASS: desktop/phone delivery confirmation, migration error, submitter targeting, embedded pictures, fresh cards and recipient module/decks after cross-device sync.')}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

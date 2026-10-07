const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {fixture,rows,A}=require('./check-accounts.cjs');
const url=process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/';
async function ready(page){await page.waitForFunction(()=>!document.querySelector('main[inert]'))}
async function deck(page){return page.evaluate(async id=>{const db=await new Promise(resolve=>{const r=indexedDB.open('micro-flashcards',1);r.onsuccess=()=>resolve(r.result)});return new Promise(resolve=>{const r=db.transaction('decks').objectStore('decks').get(`user:${id}:lecture:microorganisms`);r.onsuccess=()=>{db.close();resolve(r.result)}})},A)}
async function heldTap(page,context,selector){
 const element=page.locator(selector);const box=await element.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=page.viewportSize().height,'phone button stays in viewport');
 await page.evaluate(selector=>{window.heldControl=document.querySelector(selector)},selector);
 const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>heldControl===document.querySelector('#'+heldControl.id)),true,'background sync keeps the pressed touch target');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);await cdp.detach();
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const errors=[];
 try{
 for(const viewport of [{width:360,height:640},{width:390,height:844},{width:412,height:915}]){
  rows.clear();const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});await fixture(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#flip').waitFor();await page.locator('.mobile-account').tap();await page.locator('#account-email').fill('a@example.test');await page.locator('#account-password').fill('fixture-password');await page.locator('button[value="signin"]').tap();await page.locator('#sync-status').filter({hasText:/Synced/}).waitFor();await ready(page);await page.locator('[data-view="study"]').tap();await page.waitForTimeout(1600);
  const initial=await page.locator('#flip h2').innerText();await heldTap(page,context,'#next');assert.notEqual(await page.locator('#flip h2').innerText(),initial,'next touch advances the question');
  await page.locator('#prev').tap();assert.equal(await page.locator('#flip h2').innerText(),initial,'previous touch returns to the question');
  assert.equal(await page.locator('#good').isEnabled(),false,'reveal is required before grading');
  await page.locator('#flip').tap();assert.equal(await page.locator('#good').isEnabled(),true);await heldTap(page,context,'#good');
  const saved=await deck(page);assert.equal(saved.cards.filter(c=>c.lastRating==='good').length,1,'one touch saves exactly one review');assert.notEqual(await page.locator('#flip h2').innerText(),initial,'grading advances');
  for(const rating of ['again','hard','easy']){await page.locator('#flip').tap();await page.locator('#'+rating).tap();await page.waitForTimeout(100)}
  assert.equal((await deck(page)).cards.filter(c=>c.reviews>0).length,4,'all four rating taps persist');
  await page.reload();await page.locator('#flip').waitFor();await ready(page);assert.equal((await deck(page)).cards.filter(c=>c.reviews>0).length,4,'phone reviews survive reload');
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.study-controls button')].map(b=>{const r=b.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom}})}));assert.equal(layout.overflow,false);
  for(const b of layout.buttons){assert.ok(b.height>=44,'touch target is at least 44px tall');assert.ok(b.top>=0&&b.bottom<=viewport.height,'controls stay on screen')}
  await page.locator('[data-open-lecture="cell-injury"]').tap();await ready(page);await page.locator('#flip').tap();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));const next=await page.locator('#next').boundingBox();assert.ok(next.y+next.height<=viewport.height,'next stays available when looking at lecture pictures');await page.locator('#next').tap();await context.close();
 }
 const context=await browser.newContext({viewport:{width:1366,height:900}});await context.route('**/account-config.json',r=>r.fulfill({json:{supabaseUrl:'',supabasePublishableKey:''}}));const page=await context.newPage();await page.goto(url);await page.locator('#flip').waitFor();assert.equal(await page.locator('.study-controls').evaluate(el=>getComputedStyle(el).display),'contents','desktop keeps its original layout');await page.locator('#next').click();await page.locator('#flip').click();await page.locator('#good').click();
 assert.deepEqual(errors,[]);console.log('PASS: Android touch next/previous and all ratings, held taps during sync, saved reviews after reload, fixed controls on three phone sizes, lecture images, desktop controls.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture}=require('./check-accounts.cjs');const {navigate}=require('./navigation-helper.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{
for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1280,height:720},isMobile:phone,hasTouch:phone});await fixture(context);
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await p.locator('#lecture-switch option[value="viruses"]').waitFor({state:'attached'});
 await p.locator('#flip h2').click();await p.locator('#good').click();await p.reload();await p.locator('#lecture-switch option[value="viruses"]').waitFor({state:'attached'});
 await navigate(p,'modules');await p.locator('[data-module="infection-immunity"]').click();assert.equal(await p.locator('.lecture-item').count(),2);assert.match(await p.locator('.lecture-item').allTextContents().then(x=>x.join(' ')),/1 \/ 178/);
 await navigate(p,'study');await p.locator('#lecture-switch').selectOption('viruses');await p.waitForFunction(()=>document.querySelector('.card-meta')?.textContent.includes('/ 200'));
 await p.locator('#flip h2').click();await p.locator('.study-diagrams img').waitFor();assert.ok(await p.locator('.study-diagrams img').evaluate(async im=>{await im.decode();return im.naturalWidth>100}));await p.locator('#good').click();
 await p.locator('#study-filter').selectOption('visual');await p.waitForFunction(()=>document.querySelector('.card-meta')?.textContent.includes('/ 14'));
 for(let i=0;i<14;i++){
  const prompt=p.locator('#flip img');assert.match(await prompt.getAttribute('src'),/\/revise-1\/viruses\/visual-/);assert.ok(await prompt.evaluate(async im=>{await im.decode();return im.naturalWidth>100}));
  await p.locator('#flip h2').click();const answer=p.locator('#flip img');assert.match(await answer.getAttribute('src'),/\/revise-1\/viruses\/slide-/);assert.ok(await answer.evaluate(async im=>{await im.decode();return im.naturalWidth>100}));
  if(phone)assert.ok(await p.locator('#good').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
  if(i<13)await p.locator('#next').click();
 }
 await p.locator('#study-filter').selectOption('all');await p.reload();await p.locator('#lecture-switch option[value="viruses"]').waitFor({state:'attached'});await navigate(p,'lectures');assert.match(await p.locator('.lecture-item').allTextContents().then(x=>x.join(' ')),/1 \/ 200/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
}
console.log('PASS: virus auto-loading/module, 14 visual crops and answer images, supporting diagram, mobile ratings, review persistence and existing progress.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

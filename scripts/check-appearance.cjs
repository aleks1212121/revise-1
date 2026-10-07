const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {fixture}=require('./check-accounts.cjs');
const url=process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/';
function contrast(a,b){const lum=c=>{const values=c.match(/[\d.]+/g).slice(0,3).map(n=>{n=Number(n)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return values[0]*.2126+values[1]*.7152+values[2]*.0722};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const errors=[];
try{
for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1366,height:900},isMobile:phone,hasTouch:phone,colorScheme:'light'});await fixture(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#flip').waitFor();await page.locator(phone?'.mobile-settings':'.settings-nav').click();
 for(const mode of ['dark','light'])for(const style of ['forest','ocean','lavender','rose']){
  await page.locator(`[data-appearance-mode="${mode}"]`).click();await page.locator(`[data-appearance-style="${style}"]`).click();
  assert.equal(await page.locator('html').getAttribute('data-mode'),mode);assert.equal(await page.locator('html').getAttribute('data-style'),style);assert.equal(await page.locator(`[data-appearance-style="${style}"]`).getAttribute('aria-pressed'),'true');
  const samples=await page.evaluate(()=>['.workspace-panel h3','.workspace-panel p','.appearance-choice small','.appearance-preview .primary','.appearance-preview .confident','.appearance-preview .cloze'].map(s=>{const el=document.querySelector(s),cs=getComputedStyle(el);let p=el,bg=cs.backgroundColor;while(bg==='rgba(0, 0, 0, 0)'&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor}return {s,fg:cs.color,bg}}));
  for(const c of samples)assert.ok(contrast(c.fg,c.bg)>=4.5,`${mode}/${style} ${c.s} text contrast: ${contrast(c.fg,c.bg)}`);
 }
 await page.locator('[data-appearance-mode="dark"]').click();await page.reload();await page.locator('#flip').waitFor();assert.equal(await page.locator('html').getAttribute('data-mode'),'dark');assert.equal(await page.locator('html').getAttribute('data-style'),'rose');
 await page.locator(phone?'.mobile-account':'.account-nav').click();await page.locator('#account-email').waitFor();const input=await page.locator('#account-email').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));assert.ok(contrast(input.fg,input.bg)>=4.5,'dark account input readable');assert.notEqual(input.bg,'rgb(251, 252, 248)');
 await page.locator(phone?'.mobile-settings':'.settings-nav').click();await page.locator('[data-appearance-mode="system"]').click();await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.mode==='light');
 await page.locator('[data-appearance-mode="dark"]').click();await page.emulateMedia({colorScheme:'light'});assert.equal(await page.locator('html').getAttribute('data-mode'),'dark');await page.screenshot({path:phone?'/tmp/settings-phone-dark.png':'/tmp/settings-desktop-dark.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('[data-view="study"]').click();await page.locator(phone?'#phone-reveal-answer':'#flip').click();const before=await page.locator('#flip h2').innerText();if(phone){const b=await page.locator('#good').boundingBox();assert.ok(b.y+b.height<=640,'dark phone rating visible without scrolling')}await page.locator('#good').click();assert.notEqual(await page.locator('#flip h2').innerText(),before,'dark theme grading advances');
 await page.locator(phone?'.mobile-settings':'.settings-nav').click();await page.locator('#appearance-reset').click();assert.equal(await page.locator('html').getAttribute('data-mode'),'light');assert.equal(await page.locator('html').getAttribute('data-style'),'forest');await context.close();
}
assert.deepEqual(errors,[]);console.log('PASS: all eight colour combinations meet text contrast, theme persistence, readable account inputs, system changes, reset, phone Settings layout and dark-mode grading.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

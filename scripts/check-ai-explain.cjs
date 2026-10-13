const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture}=require('./check-accounts.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});try{for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:360,height:640}:{width:1366,height:900},isMobile:phone,hasTouch:phone});await fixture(context);
 await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedExplanation=text}},configurable:true}));
 const requests=[];await context.route('https://chatgpt.com/**',r=>{requests.push(r.request().url());return r.fulfill({body:'ChatGPT hand-off fixture',contentType:'text/html'})});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4189/revise-1/');await p.locator('#ai-explain').waitFor();assert.equal(requests.length,0,'no card sent before user clicks');
 const target=new URL(await p.locator('#ai-explain').getAttribute('href')),prompt=target.searchParams.get('q');assert.match(prompt,/Question:/);assert.match(prompt,/Answer:/);assert.match(prompt,/Lecture explanation:/);assert.equal(target.hostname,'chatgpt.com');
 const before=await p.locator('#flip h2').innerText();const popup=context.waitForEvent('page');await p.locator('#ai-explain').click();const opened=await popup;await opened.waitForLoadState();assert.equal(await p.evaluate(()=>window.copiedExplanation),prompt);assert.equal(await p.locator('#flip h2').innerText(),before);assert.equal(await p.locator('#good').isDisabled(),true,'handoff does not reveal or grade');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.locator('#flip h2').click();assert.equal(await p.locator('#ai-explain').count(),1);assert.deepEqual(errors,[]);await context.close();
}console.log('PASS: desktop/phone ChatGPT handoff, correct prompt, clipboard fallback, no automatic external requests and unchanged study card.');}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

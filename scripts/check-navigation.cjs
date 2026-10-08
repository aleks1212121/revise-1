const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture}=require('./check-accounts.cjs');const {navigate}=require('./navigation-helper.cjs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{
 for(const viewport of [{width:1366,height:900},{width:360,height:640},{width:320,height:568},{width:844,height:390}]){
  const context=await browser.newContext({viewport});await fixture(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.ACCOUNT_TEST_URL||'http://127.0.0.1:4189/revise-1/');await page.locator('#flip').waitFor();
  assert.equal(await page.locator('.primary-nav button').count(),3);assert.equal(await page.locator('.workspace-menu').getAttribute('open'),null);assert.equal(await page.locator('.sidebar-lectures').count(),0);
  await page.locator('.workspace-menu summary').click();for(const el of await page.locator('.workspace-menu [data-view]').all()){const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=viewport.width&&r.y>=0&&r.y+r.height<=viewport.height,'More options fit screen')}
  await page.keyboard.press('Escape');assert.equal(await page.locator('.workspace-menu').getAttribute('open'),null);await page.locator('.workspace-menu summary').click();await page.mouse.click(viewport.width-3,viewport.height-3);assert.equal(await page.locator('.workspace-menu').getAttribute('open'),null,'outside click dismisses More');
  await navigate(page,'settings');await page.locator('[data-appearance-mode="dark"]').click();await navigate(page,'library');await page.locator('#search').fill('DNA');await navigate(page,'slides');await page.locator('.slide-reference article').first().waitFor();await navigate(page,'study');
  await page.locator('#study-filter').selectOption('all');await page.locator('#lecture-switch').selectOption('cell-death');await page.waitForFunction(()=>document.querySelector('#lecture-switch')?.value==='cell-death'&&document.querySelector('#study-filter')?.value==='due'&&document.querySelector('#flip'));assert.equal(await page.locator('#study-filter').inputValue(),'due');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(viewport.width===360)await page.screenshot({path:'/tmp/simple-navigation-phone.png'});if(viewport.width===1366)await page.screenshot({path:'/tmp/simple-navigation-desktop.png'});
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: primary navigation, compact selectors, More-menu bounds, Escape/outside dismissal, settings/library/slides access and lecture switching at desktop, small phone and landscape sizes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

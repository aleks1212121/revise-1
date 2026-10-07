async function navigate(page,view){
 const button=page.locator(`[data-view="${view}"]`);
 if(!await button.isVisible())await page.locator('.workspace-menu summary').click();
 await button.click();
}
module.exports={navigate};

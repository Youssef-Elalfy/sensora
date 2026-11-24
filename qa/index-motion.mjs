import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import {openBrowser,url} from "./browser.mjs";
const browser=await openBrowser({software:false}), results=[];
try {
 for(const [locale,width,height] of [["en",1440,900],["ar",390,844],["en",360,640]]) {
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto(url+"/"+locale+"#veil");await page.locator("[data-ready=true]").waitFor({timeout:90000});
  await page.waitForFunction(()=>document.querySelector(".experience")?.dataset.chapter==="3");
  const dialog=page.locator(".index"),menu=page.locator(".menu");
  const y=await page.evaluate(()=>scrollY);
  // Sample in page time so screenshot encoding and Playwright do not affect the animation window.
  const open=await page.evaluate(async()=>{
   document.querySelector(".menu").click();
   const d=document.querySelector(".index");const first=getComputedStyle(d.querySelector(".index-title")).transform;
   await new Promise(r=>setTimeout(r,320));
   return {mask:getComputedStyle(d).clipPath,first,active:d.contains(document.activeElement)};
  });
  assert.ok(open.active && open.mask.includes("inset") && open.first!=="none");
  await page.mouse.wheel(0,490);await page.waitForTimeout(1150);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2);
  const box=await dialog.boundingBox();assert.ok(Math.abs(box.width-width)<2);
  const overflow=await dialog.evaluate(d=>d.scrollWidth-d.clientWidth);assert.ok(overflow<=1);
  await page.screenshot({path:"qa/cinematic/after/index-"+locale+"-"+width+".jpg",quality:85});
  await page.keyboard.press("Escape");assert.equal(await dialog.evaluate(d=>d.open),true);
  await page.waitForSelector(".index[open]",{state:"detached"});assert.equal(await menu.evaluate(el=>el===document.activeElement),true);
  await menu.click();await page.waitForTimeout(1150);await dialog.locator('a[href="#lab"]').click();
  await page.waitForFunction(()=>Math.abs(scrollY-document.getElementById("lab").offsetTop)<3 && document.activeElement?.id==="lab",null,{timeout:14000});
  await page.emulateMedia({reducedMotion:"reduce"});await menu.click();await page.keyboard.press("Escape");
  assert.equal(await dialog.evaluate(d=>d.open),false);
  await page.waitForTimeout(320);
  const crop={x:Math.round(width*.58),y:Math.round(height*.52),width:Math.round(width*.28),height:Math.round(height*.25)};
  const still=await page.screenshot({clip:crop});await page.waitForTimeout(420);
  assert.ok(still.equals(await page.screenshot({clip:crop})),"Reduced motion should hold the frame");
  results.push({locale,width,open,scrollLocked:true,focusRestored:true,targetFocused:"lab",reduced:true,idlePixelsUnchanged:true});await page.close();
 }
} finally {await browser.close();await writeFile("qa/cinematic/after/index-motion.json",JSON.stringify(results,null,2));console.log(results);}

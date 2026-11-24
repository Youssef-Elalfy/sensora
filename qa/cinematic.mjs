import { openBrowser, url } from "./browser.mjs";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";

const phase=process.argv[2] || "after";
const dir=join("qa","cinematic",phase);
await mkdir(dir,{recursive:true});
const browser=await openBrowser({software:false});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir,size:{width:960,height:600}}});
const page=await context.newPage(); const errors=[];
page.on("pageerror",e=>{if(!errors.includes(e.message))errors.push(e.message);});
page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
const shot=name=>page.screenshot({path:join(dir,name+".jpg"),quality:88,timeout:90000});
const report={errors,idle:{}};
try{
 await page.goto(url+"/en#first-breath"); await page.locator("[data-ready=true]").waitFor({timeout:90000}); await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator(".experience").getAttribute("data-fallback"),"false");
 for(const [id,name] of [["first-breath","hero"],["veil","veil"],["tidal","tidal"]]){
  await page.locator("#"+id).evaluate(e=>window.scrollTo({top:e.offsetTop,behavior:"instant"}));await page.waitForTimeout(750);
  const a=await shot(name);await page.waitForTimeout(1800);const b=await shot(name+"-idle");
  const crop=buf=>sharp(buf).extract({left:360,top:655,width:340,height:110}).resize(140,50).removeAlpha().raw().toBuffer();
  const [before,after]=await Promise.all([crop(a),crop(b)]);let diff=0;for(let j=0;j<before.length;j++)diff+=Math.abs(before[j]-after[j]);
  report.idle[name]=+(diff/before.length).toFixed(3);
  if(phase==='after')assert.ok(report.idle[name]>2,name+' should animate while scroll and pointer are idle');
 }
 await page.locator(".menu").click();await page.waitForTimeout(230);await shot("menu-opening");await page.waitForTimeout(1150);await shot("menu");
 await page.locator('.index a[href="#ember"]').click();await page.waitForTimeout(1500);await shot("ember");
 await page.locator(".labnav").click();await page.waitForTimeout(1400);await page.getByRole("button",{name:"veil",exact:true}).click();await page.waitForTimeout(750);await shot("lab");
 assert.equal(errors.length,0,errors.join("\n"));
}finally{
 const video=page.video();await context.close();if(video)await rename(await video.path(),join(dir,"journey.webm"));
 await browser.close();await writeFile(join(dir,"observations.json"),JSON.stringify(report,null,2));
 console.log(phase,report);
}
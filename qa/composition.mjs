import {openBrowser,url} from "./browser.mjs";
import {mkdir,writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
const phase=process.argv[2]||"after",dir="qa/composition/"+phase;
await mkdir(dir,{recursive:true});
const browser=await openBrowser({software:false});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:phase==="travel"?"no-preference":"reduce"});
const sizes=[[1920,1080],[1600,900],[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844]];
const scenes=["first-breath","invisible","ember","veil","tidal","lab","ritual"];
const errors=[],results=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
await page.addInitScript(()=>{
 const gl=WebGL2RenderingContext.prototype,location=gl.getUniformLocation,matrix=gl.uniformMatrix4fv,draw=gl.drawElements;
 const names=new WeakMap(),uniforms=new WeakMap();let current;
 const use=gl.useProgram;gl.useProgram=function(p){current=p;return use.call(this,p);};
 gl.getUniformLocation=function(p,n){const l=location.call(this,p,n);if(l)names.set(l,n);return l;};
 gl.uniformMatrix4fv=function(l,t,m,...rest){const n=names.get(l);if(current&&(n==="projectionMatrix"||n==="modelViewMatrix")){let u=uniforms.get(current);if(!u){u={};uniforms.set(current,u);}u[n]=Array.from(m);}return matrix.call(this,l,t,m,...rest);};
 gl.drawElements=function(mode,count,type,offset){if(count===10752*3&&current)window.pose=uniforms.get(current);return draw.call(this,mode,count,type,offset);};
});
async function measure(id,fraction=0) {
 await page.locator("#"+id).evaluate((el,f)=>window.scrollTo({top:el.offsetTop+f*el.offsetHeight,behavior:"instant"}),fraction);
 if(!fraction)await page.waitForFunction(i=>Number(document.querySelector(".experience").dataset.chapter)===i,scenes.indexOf(id));
 await page.waitForTimeout(150);await page.evaluate(()=>window.dispatchEvent(new Event("sensora:frame")));await page.waitForTimeout(100);
 return page.evaluate(({id,fraction})=>{
 const gl=document.querySelector("canvas").getContext("webgl2"),{projectionMatrix:pr,modelViewMatrix:m}=window.pose;
 const mul=(g,v)=>[0,1,2,3].map(r=>v.reduce((s,n,i)=>s+n*g[i*4+r],0));
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const [y,rx,rz] of [[1.84,.79,.45],[.95,1.02,.53],[-1.28,.94,.52]])for(const x of [-rx,rx])for(const z of [-rz,rz]){
 const c=mul(pr,mul(m,[x,y,z,1]));const xx=(1+c[0]/c[3])*innerWidth/2,yy=(1-c[1]/c[3])*innerHeight/2;
 left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
 const header=document.querySelector(".mast").getBoundingClientRect();
 const section=fraction?document:document.getElementById(id),hits=[];
 for(const el of section.querySelectorAll("h1,h2,.dek,.poem,.eyebrow,.cta,.console,.chapter-foot,.hero-foot,.lab-number")){
 if(el.closest("dialog,header") || el.closest('.world[data-current="false"]'))continue;
 if(el.closest('.specimen') && el.closest('.act[data-current="false"]'))continue;
 const range=document.createRange();range.selectNodeContents(el);
 const r=el.matches("h1,h2,p")?range.getBoundingClientRect():el.getBoundingClientRect();
 if(right-left>.5&&bottom-top>.5&&r.width&&r.height&&r.left<right&&r.right>left&&r.top<bottom&&r.bottom>top)hits.push(el.className||el.tagName);}
 return {fraction,projectedHeight:+(bottom-top).toFixed(2),edition:document.querySelector(".experience").dataset.edition,chapter:document.querySelector(".experience").dataset.chapter,locale:document.documentElement.lang,width:innerWidth,height:innerHeight,id,headerGap:+(top-header.bottom).toFixed(1),hits,buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],overflow:document.documentElement.scrollWidth>innerWidth};
 },{id,fraction});
}
try{
for(const locale of ["en","ar"]){
 await page.goto(url+"/"+locale+"#first-breath",{timeout:90000});await page.locator("[data-ready=true][data-fallback=false]").waitFor({timeout:90000});await page.evaluate(()=>document.fonts.ready);
 for(const [width,height] of phase!=="after"?[[1440,900],[390,844]]:sizes){
  await page.setViewportSize({width,height});await page.waitForTimeout(260);
  for(const id of scenes){
    if(phase==="travel"){
      if(id==="ritual")continue;
      for(const f of [.22,.40,.5,.65,.8])results.push(await measure(id,f));
      continue;
    }
    const item=await measure(id);results.push(item);
    if(phase==="after"&&id==="first-breath")await page.screenshot({path:dir+"/"+locale+"-"+width+".jpg",quality:80});
    if((locale==="en"&&width===1440)||(locale==="ar"&&width===390))await page.screenshot({path:dir+"/"+locale+"-"+id+".png"});
  }
 }
}
assert.equal(errors.length,0,errors.join("\n"));
if(phase==="after"||phase==="travel"){
 for(const r of results){
   const expected=["ember","ember","ember","veil","tidal","ember","ember"][Number(r.chapter)];
   assert.equal(r.edition,expected,"The rendered scene and edition metadata should agree");
   assert.ok(!r.overflow&&r.headerGap>=12&&!r.hits.length,JSON.stringify(r));
 }
}
}finally{await writeFile(dir+"/measurements.json",JSON.stringify({results,errors},null,2));await browser.close();console.log("Sampled",results.length,"shots. Header or copy conflicts:",results.filter(v=>v.headerGap<12||v.hits.length).map(r=>[r.locale,r.width,r.id,r.headerGap,r.hits]));}

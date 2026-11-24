import ts from "typescript";
import sharp from "sharp";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {openBrowser,url} from "./browser.mjs";
const dir="qa/composition/quality";await mkdir(dir,{recursive:true});
const modules=new Map();
for(const n of ["three.module.js","three.core.js"])modules.set(n,await readFile("node_modules/three/build/"+n,"utf8"));
modules.set("surface.js",ts.transpileModule(await readFile("lib/surfaces.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const html=`<style>*{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/__silk/three.module.js"}}</script><script type="module">
import * as T from 'three';import {silkMaterial} from './surface.js';
const g=new T.WebGLRenderer({antialias:true});document.body.appendChild(g.domElement);g.toneMapping=T.ACESFilmicToneMapping;
const camera=new T.PerspectiveCamera(2*Math.atan(.2)*180/Math.PI,innerWidth/innerHeight,.12,70);camera.position.set(0,.24,16);camera.lookAt(0,.03,0);
const scene=new T.Scene(),m=silkMaterial(),plane=new T.Mesh(new T.PlaneGeometry(),m);
scene.add(plane);plane.position.set(.65,-1.48,-3.15);plane.rotation.z=.22;plane.scale.y=1.12;
m.uniforms.uTime.value=2.75;m.uniforms.uGather.value.set(1.22,1.2);
window.renderStudy=(dpr,nx,ny)=>{g.setPixelRatio(dpr);g.setSize(innerWidth,innerHeight);plane.geometry.dispose();plane.geometry=new T.PlaneGeometry(20.8,14,nx,ny);g.render(scene,camera);return [g.domElement.width,g.domElement.height];};
</script>`;
const b=await openBrowser({software:false});const p=await b.newPage({viewport:{width:900,height:520}});const measures={};
try{
 await p.route("**/__silk/**",async r=>{const name=r.request().url().split("/").pop();await r.fulfill({contentType:name==="study"?"text/html":"text/javascript",body:name==="study"?html:modules.get(name)});});
 await p.goto(url+"/__silk/study");await p.waitForFunction(()=>typeof window.renderStudy==="function");
 const images=[];
 for(const [name,dpr,x,y] of [["reference",2,420,300],["old-scale",.78,136,96],["native-coarse",1,136,96],["new-floor",.9,164,110],["native-refined",1,164,110],["high-density",1.5,196,132]]){
  const buffer=await p.evaluate(v=>window.renderStudy(...v),[dpr,x,y]);
  const png=await p.screenshot();if(name==='reference')await sharp(png).webp({quality:91}).toFile('public/atelier-silk.webp');const region=await sharp(png).extract({left:370,top:145,width:360,height:290}).removeAlpha().raw().toBuffer();images.push(region);
  let squared=0;for(let i=0;i<region.length;i++)squared+=(region[i]-images[0][i])**2;
  measures[name]={buffer,mesh:[x,y],pixelRMSE:+Math.sqrt(squared/region.length).toFixed(3)};
  await sharp(png).extract({left:370,top:145,width:360,height:290}).png().toFile(dir+"/"+name+".png");
 }
}finally{await b.close();await writeFile(dir+"/measurements.json",JSON.stringify(measures,null,2));console.log(measures);}

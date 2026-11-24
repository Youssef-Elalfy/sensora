import sharp from 'sharp';
import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";
import { openBrowser, url } from "./browser.mjs";
// Only the inspection browser sees these test routes. Production has no model viewer endpoint.
const source = async (path) => readFile(path, "utf8");
const modules = new Map();
for (const name of ["model", "surfaces"]) {
  const raw = await source("lib/" + name + ".ts");
  modules.set(
    name + ".js",
    ts
      .transpileModule(raw, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replaceAll('"./scents"', '"/__study/scents.js"'),
  );
}
modules.set(
  "scents.js",
  "export const scents=" +
    JSON.stringify(
      Object.keys(JSON.parse(await source("copy/en.json")).worlds),
    ) +
    ";",
);
for (const name of ["three.module.js", "three.core.js"])
  modules.set(name, await source("node_modules/three/build/" + name));
const html = `<style>*{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/__study/three.module.js"}}</script><script type="module">
import * as T from 'three';import {bottleGeometry,labelTexture,labelPanel} from '/__study/model.js';import {studioTexture,shadeLiquid} from '/__study/surfaces.js';
const gl=new T.WebGLRenderer({antialias:true,alpha:true});gl.setSize(innerWidth,innerHeight);document.body.append(gl.domElement);
gl.toneMapping=T.ACESFilmicToneMapping;gl.transmissionResolutionScale=.65;
const scene=new T.Scene(),studio=studioTexture(gl);scene.environment=studio.texture;scene.background=new T.Color('#31232c');
const cam=new T.OrthographicCamera(-2,2,1.6,-1.6,.01,40);cam.position.z=7;
const geo=bottleGeometry(),parts=new T.Group();scene.add(parts);const mats={
glass:new T.MeshPhysicalMaterial({transmission:1,ior:1.51,roughness:.095,thickness:.52,envMapIntensity:1.13,clearcoat:1,color:'#ffebe1',attenuationColor:'#9b241d',attenuationDistance:1.95}),
liquid:new T.MeshPhysicalMaterial({color:'#9b241d',roughness:.135,clearcoat:1,metalness:.19}),
cap:new T.MeshStandardMaterial({color:'#bd877a',metalness:.98,roughness:.19}),
collar:new T.MeshStandardMaterial({color:'#b89b72',metalness:.96,roughness:.19}),
band:new T.MeshStandardMaterial({color:'#d1b59e',metalness:.98,roughness:.19}),top:new T.MeshStandardMaterial({color:'#d1b59e',metalness:.98,roughness:.19})};
mats.liquid.onBeforeCompile=shadeLiquid;const counts={};
for(const [name,g] of Object.entries(geo)){const m=new T.Mesh(g,mats[name]);m.name=name;parts.add(m);counts[name]={vertices:g.attributes.position.count,triangles:g.index.count/3};}
const label=new T.Mesh(labelPanel(),new T.MeshBasicMaterial({map:labelTexture('ember'),color:'#ffffff',transparent:true,depthWrite:false,toneMapped:false}));label.renderOrder=4;label.position.y=-.21;parts.add(label);
const clay=new T.MeshStandardMaterial({color:'#bdaca4',roughness:.72}),wire=new T.MeshBasicMaterial({color:'#bea597',wireframe:true});
scene.add(new T.AmbientLight(0xffffff,1.2));const light=new T.DirectionalLight(0xffe5d4,2.5);light.position.set(-3,4,5);scene.add(light);
window.study=kind=>{for(const m of parts.children){if(m===label){m.visible=kind!=='wire'&&kind!=='clay';continue;}m.visible=(m.name!=='liquid'||(kind!=='wire'&&kind!=='clay'));m.material=kind==='wire'?wire:kind==='clay'?clay:mats[m.name];}
 const yaw={front:0,side:1.37,macro:-.63,clay:-.46,wire:-.46,beauty:-.34}[kind];
 parts.rotation.set(.1,yaw,kind==='beauty'?-.08:0);parts.scale.setScalar(kind==='macro'?2.6:.94);parts.position.y=kind==='macro'?-1.6:-.16;gl.render(scene,cam);return {parts:counts,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles};};
window.editionPoster=(scent,index)=>{
  window.study('beauty');scene.background=null;gl.setClearColor(0,0);
  for(const mesh of parts.children)if(mesh.morphTargetInfluences){mesh.morphTargetInfluences[0]=Number(index===1);mesh.morphTargetInfluences[1]=Number(index===2);}
  mats.liquid.color.set(['#9b241d','#bba1ca','#3c9490'][index]);mats.glass.attenuationColor.copy(mats.liquid.color);
  mats.cap.color.set(['#bd877a','#d0c3ce','#84afad'][index]);label.material.map=labelTexture(scent);
  parts.scale.setScalar(.87);gl.render(scene,cam);return gl.domElement.toDataURL('image/png').split(',')[1];};
window.study('beauty');</script>`;
const browser = await openBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 560 } });
  await page.route("**/__study/**", async (r) => {
    const file = r.request().url().split("/").pop();
    await r.fulfill(
      file === "view"
        ? { contentType: "text/html", body: html }
        : { contentType: "text/javascript", body: modules.get(file) },
    );
  });
  await page.goto(url + "/__study/view");
  await page.waitForFunction(() => typeof window.study === "function");
  if(process.argv.includes('--posters')){
    await mkdir('public/editions',{recursive:true});
    for(const [i,name] of ['ember','veil','tidal'].entries()){
      const bytes=await page.evaluate(([s,n])=>window.editionPoster(s,n),[name,i]);
      await sharp(Buffer.from(bytes,'base64')).trim().webp({quality:92,alphaQuality:100}).toFile('public/editions/'+name+'.webp');
    }
  } else {
  const report = {};
  for (const mode of ["beauty", "front", "side", "macro", "clay", "wire"]) {
    report[mode] = await page.evaluate((kind) => window.study(kind), mode);
    await page.screenshot({ path: "qa/model-" + mode + ".jpg", quality: 86 });
  }
  await writeFile("qa/model-statistics.json", JSON.stringify(report, null, 2));
  console.log("Captured six model angles and material studies.");
  }
} finally {
  await browser.close();
}

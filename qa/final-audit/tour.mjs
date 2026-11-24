// Real-GPU screenshot tour of every chapter. Usage: node qa/final-audit/tour.mjs <locale> <w> <h> [tag]
import { openBrowser } from "../browser.mjs";
const [locale="en", w="1440", h="900", tag=""] = process.argv.slice(2);
const base = process.env.SENSORA_QA_URL || "http://127.0.0.1:3210";
const out = new URL("./shots/", import.meta.url).pathname.replace(/^\/(\w:)/,"$1");
const browser = await openBrowser({ software: false });
const page = await browser.newPage({ viewport: { width:+w, height:+h } });
const errors = [];
page.on("pageerror", e => errors.push("pageerror " + e.message));
page.on("console", m => { if (m.type()==="error"||m.type()==="warning") errors.push(m.type()+" "+m.text()); });
page.on("response", r => { if (r.status() >= 400) errors.push(r.status()+" "+r.url()); });
await page.addInitScript(() => { try { sessionStorage.setItem("sensora-visited","1"); } catch {} });
await page.goto(`${base}/${locale}`, { waitUntil: "load" });
await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
const info = await page.evaluate(() => { const c=document.querySelector("canvas"); const gl=c?.getContext("webgl2"); const e=gl?.getExtension("WEBGL_debug_renderer_info"); return { dpr: devicePixelRatio, canvas: c && [c.width,c.height], css: c && [c.clientWidth,c.clientHeight], renderer: e? gl.getParameter(e.UNMASKED_RENDERER_WEBGL):"", overflowX: document.documentElement.scrollWidth - innerWidth }; });
console.log(JSON.stringify(info));
for (const id of ["first-breath","invisible","ember","veil","tidal","lab","ritual"]) {
  await page.evaluate(id => { const el=document.getElementById(id); window.scrollTo({top: el.offsetTop, behavior:"instant"}); }, id);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}${locale}-${w}x${h}${tag}-${id}.jpg`, quality: 80 });
}
console.log("errors", JSON.stringify(errors));
await browser.close();

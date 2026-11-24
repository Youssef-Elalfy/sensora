import { openBrowser } from "../browser.mjs";
const b = await openBrowser({software:true}); const p = await b.newPage();
await p.addInitScript(() => { try { sessionStorage.setItem("sensora-visited","1"); } catch {} });
await p.goto("http://127.0.0.1:3210/en"); await p.evaluate(()=>document.fonts.ready);
console.log(await p.evaluate(() => {
  const m = (t, style="normal") => { const s=document.createElement("span"); s.textContent=t; s.style.cssText=`font:${style} 400 160px "Bodoni Moda";position:absolute;white-space:pre`; document.body.append(s); const w=s.getBoundingClientRect().width; s.remove(); return w; };
  const out={}; for (const pair of ["We","Yo","Va","To","Ta","Wa","Ve"]) out[pair]=(m(pair)-m(pair[0])-m(pair[1])).toFixed(1);
  return out;
}));
await b.close();

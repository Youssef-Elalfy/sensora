// Composes the README cover and Open Graph card from real captures, typeset in the site's fonts.
import { openBrowser } from "../browser.mjs";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import sharp from "sharp";
const f = (p) => pathToFileURL(resolve(p)).href;
for (const [k, left] of [["ember", 1380], ["veil", 180], ["tidal", 1210]])
  await sharp(`qa/final-audit/work/detail-${k}.png`).extract({ left, top: 20, width: 1000, height: 1400 }).png().toFile(`qa/final-audit/work/arch-${k}.png`);
const fonts = `
@font-face{font-family:Bodoni;src:url(${f("node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2")})}
@font-face{font-family:Bodoni;font-style:italic;src:url(${f("node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff2")})}
@font-face{font-family:Manrope;font-weight:700;src:url(${f("node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff2")})}
@font-face{font-family:Tajawal;src:url(${f("node_modules/@fontsource/tajawal/files/tajawal-arabic-400-normal.woff2")})}`;
const rosette = `<svg viewBox="0 0 48 48" width="1em" height="1em" fill="none">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="24" cy="15" rx="6.65" ry="12.6" transform="rotate(${i * 45} 24 24)" stroke="currentColor" stroke-width="1.15"/>`).join("")}<circle cx="24" cy="24" r="2.5" fill="currentColor"/></svg>`;
const panel = (k, label, n) => `<figure class="p ${k}"><img src="${f(`qa/final-audit/work/arch-${k}.png`)}"><figcaption><span>Nº ${n}</span><em>${label}</em></figcaption></figure>`;
function html(w, h, s) {
  return `<!doctype html><meta charset="utf-8"><style>${fonts}
*{margin:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(120% 90% at 18% 30%,#3a1020 0%,#1a070e 48%,#0e0408 100%);color:#f6e9e1;font-family:Manrope;position:relative}
.copy{position:absolute;left:${74 * s}px;top:0;bottom:0;width:${520 * s}px;display:flex;flex-direction:column;justify-content:center;gap:${22 * s}px}
.mark{display:flex;align-items:center;gap:${16 * s}px;font:400 ${58 * s}px/1 Bodoni;letter-spacing:.14em;color:#f6e9e1}
.mark svg{color:#e0b6a4;font-size:${50 * s}px}
.sub{font:italic 400 ${44 * s}px/1.1 Bodoni;color:#e6b3a8;letter-spacing:-.01em}
.rule{width:${64 * s}px;height:1px;background:#c99a86;margin:${6 * s}px 0}
.line{font:700 ${12.5 * s}px/1.9 Manrope;letter-spacing:.2em;text-transform:uppercase;color:#d9bfb4}
.ar{font:400 ${19 * s}px/1 Tajawal;color:#cfb0a6}
.row{position:absolute;right:${60 * s}px;top:${60 * s}px;bottom:${60 * s}px;display:flex;gap:${20 * s}px;align-items:center}
.p{position:relative;width:${290 * s}px;height:${(h - 120 * s) * .86}px;border-radius:${145 * s}px ${145 * s}px ${10 * s}px ${10 * s}px;overflow:hidden;box-shadow:0 ${30 * s}px ${60 * s}px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,230,215,.14)}
.p.veil{height:${(h - 120 * s) * .96}px}
.p img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.p img{object-position:50% 40%}
figcaption{position:absolute;left:0;right:0;bottom:0;padding:${50 * s}px ${20 * s}px ${18 * s}px;background:linear-gradient(transparent,rgba(10,3,6,.72));display:flex;justify-content:space-between;align-items:baseline}
figcaption span{font:700 ${10.5 * s}px Manrope;letter-spacing:.2em;color:#e9d3ca}
figcaption em{font:italic 400 ${24 * s}px Bodoni;color:#fbefe8}
</style><body>
<div class="copy"><div class="mark">${rosette}<span>SENSORA</span></div><div class="sub">Digital Fragrance Lab</div><div class="rule"></div>
<div class="line">Procedural 3D perfume design<br>Cinematic WebGL · Scroll storytelling<br>Interactive scent lab</div><div class="ar">English · <span dir="rtl" lang="ar">العربية</span></div></div>
<div class="row">${panel("ember", "Ember", "01")}${panel("veil", "Veil", "02")}${panel("tidal", "Tidal", "03")}</div></body>`;
}
const browser = await openBrowser({ software: true });
for (const [name, w, h, s] of [["cover", 1600, 900, 1], ["og", 1200, 630, 0.74]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: name === "cover" ? 2 : 1 });
  const file = resolve(`qa/final-audit/work/${name}.html`);
  await writeFile(file, html(w, h, s));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa/final-audit/work/${name}.png` });
  await page.close();
}
await browser.close();
await sharp("qa/final-audit/work/cover.png").resize({ width: 2400 }).webp({ quality: 86, effort: 6 }).toFile("docs/media/cover.webp");
await sharp("qa/final-audit/work/og.png").jpeg({ quality: 86, mozjpeg: true }).toFile("public/og.jpg");
console.log("cover + og ready");

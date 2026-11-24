// GPU frame sampling on the production build. Usage:
// node qa/final-audit/performance.mjs <width> <height> <deviceScaleFactor> <label>
import { openBrowser } from "../browser.mjs";
import { writeFile } from "node:fs/promises";
const [w = "1440", h = "900", dsf = "1", label = "desktop"] = process.argv.slice(2);
const base = process.env.SENSORA_QA_URL || "http://127.0.0.1:3210";
const browser = await openBrowser({ software: false });
const context = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf });
const page = await context.newPage();
await page.addInitScript(() => {
  try { sessionStorage.setItem("sensora-visited", "1"); } catch {}
  const report = { calls: 0, triangles: 0, longTasks: [], shifts: 0, readyAt: 0 };
  window.measurement = report;
  new PerformanceObserver((l) => report.longTasks.push(...l.getEntries().map((e) => e.duration))).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) report.shifts += e.value; }).observe({ type: "layout-shift", buffered: true });
  new MutationObserver(() => { if (!report.readyAt && document.querySelector("[data-ready=true]")) report.readyAt = performance.now(); })
    .observe(document, { subtree: true, attributes: true, attributeFilter: ["data-ready"] });
  for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
    const orig = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...a) {
      report.calls++;
      if (a[0] === this.TRIANGLES) { const count = name.startsWith("drawArrays") ? a[2] : a[1]; report.triangles += (count / 3) * (name.includes("Instanced") ? a.at(-1) : 1); }
      return orig.apply(this, a);
    };
  }
});
await page.goto(base + "/en", { timeout: 120000 });
await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
const results = [];
for (const chapter of ["first-breath", "ember", "veil", "tidal", "lab", "ritual"]) {
  await page.evaluate((id) => window.scrollTo(0, document.getElementById(id).offsetTop), chapter);
  await page.waitForTimeout(1500);
  results.push(await page.evaluate(async (chapter) => {
    const metric = window.measurement, gl = document.querySelector("canvas").getContext("webgl2"), ext = gl.getExtension("WEBGL_debug_renderer_info");
    const samples = [], calls = []; let rendered = 0, last = performance.now(), lastCalls = metric.calls; const start = last;
    while (performance.now() - start < 4500) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now(); samples.push(now - last);
      const n = metric.calls - lastCalls; if (n > 0) { rendered++; calls.push(n); }
      lastCalls = metric.calls; last = now;
    }
    const pct = (v, f) => v.length ? [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * f))] : 0;
    return { chapter, viewport: [innerWidth, innerHeight], devicePixelRatio, renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      renderedFps: +((rendered * 1000) / (last - start)).toFixed(1), medianFrameMs: +pct(samples, .5).toFixed(1), p95FrameMs: +pct(samples, .95).toFixed(1),
      typicalDrawCalls: pct(calls, .5), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], readyMs: Math.round(metric.readyAt),
      longTasks: metric.longTasks.length, layoutShift: +metric.shifts.toFixed(4) };
  }, chapter));
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile(new URL(`./performance-${label}.json`, import.meta.url), JSON.stringify({ date: new Date().toISOString(), conditions: "Headless Chromium 1248 on this host, production build via next start, isolated run", results }, null, 2));
await browser.close();

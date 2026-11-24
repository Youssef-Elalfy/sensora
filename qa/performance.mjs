import { openBrowser, url } from "./browser.mjs";
import { writeFile } from "node:fs/promises";
const browser = await openBrowser({ software: false });
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() => {
    const report = {
      calls: 0,
      triangles: 0,
      longTasks: [],
      shifts: 0,
      readyAt: 0,
    };
    window.measurement = report;
    new PerformanceObserver((list) =>
      report.longTasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        if (!e.hadRecentInput) report.shifts += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new MutationObserver(() => {
      if (!report.readyAt && document.querySelector("[data-ready=true]"))
        report.readyAt = performance.now();
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-ready"],
    });
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const orig = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...a) {
        report.calls++;
        if (a[0] === this.TRIANGLES) {
          const count = name.startsWith("drawArrays") ? a[2] : a[1];
          report.triangles +=
            (count / 3) * (name.includes("Instanced") ? a.at(-1) : 1);
        }
        return orig.apply(this, a);
      };
    }
  });
  await page.goto(url + "/en#first-breath", { timeout: 120000 });
  await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
  for (const [width, height, chapter] of [
    [1440, 900, "first-breath"],
    [1440, 900, "ember"],
    [390, 844, "lab"],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .locator("#" + chapter)
      .evaluate((el) => window.scrollTo(0, el.offsetTop));
    await page.waitForTimeout(1500);
    results.push(
      await page.evaluate(async (chapter) => {
        const metric = window.measurement,
          gl = document.querySelector("canvas").getContext("webgl2"),
          ext = gl.getExtension("WEBGL_debug_renderer_info"),
          samples = [],
          calls = [],
          triangles = [];
        let last = performance.now(),
          lastCalls = metric.calls,
          lastTriangles = metric.triangles;
        const start = last;
        let rendered = 0;
        while (performance.now() - start < 4500 || samples.length < 8) {
          await new Promise((r) => requestAnimationFrame(r));
          const now = performance.now();
          samples.push(now - last);
          const n = metric.calls - lastCalls;
          if (n > 0) {
            rendered++;
            calls.push(n);
            triangles.push(Math.round(metric.triangles - lastTriangles));
          }
          lastCalls = metric.calls;
          lastTriangles = metric.triangles;
          last = now;
        }
        const percentile = (values, f) =>
          values.length
            ? [...values].sort((a, b) => a - b)[
                Math.min(values.length - 1, Math.floor(values.length * f))
              ]
            : 0;
        return {
          chapter,
          viewport: [innerWidth, innerHeight],
          renderer: ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          seconds: +((last - start) / 1000).toFixed(2),
          observedCanvasFps: +((rendered * 1000) / (last - start)).toFixed(1),
          medianFrameMs: +percentile(samples, 0.5).toFixed(1),
          p95FrameMs: +percentile(samples, 0.95).toFixed(1),
          typicalDrawCalls: percentile(calls, 0.5),
          typicalTrianglesAcrossPasses: percentile(triangles, 0.5),
          drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
          pageReadyMs: Math.round(metric.readyAt),
          longTasksSinceNavigation: metric.longTasks.length,
          layoutShiftSinceNavigation: metric.shifts,
          transferredBytes: performance
            .getEntriesByType("resource")
            .reduce((n, e) => n + e.transferSize, 0),
        };
      }, chapter),
    );
    console.log(results.at(-1));
  }
} finally {
  await writeFile("qa/performance.json", JSON.stringify(results, null, 2));
  await browser.close();
}

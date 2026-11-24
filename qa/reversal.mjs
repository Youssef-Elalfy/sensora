import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { openBrowser, url } from "./browser.mjs";
const browser = await openBrowser({ software: false }),
  results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
  });
  await page.addInitScript(() => {
    const gl = WebGL2RenderingContext.prototype,
      loc = gl.getUniformLocation,
      matrix = gl.uniformMatrix4fv,
      draw = gl.drawElements,
      names = new WeakMap();
    let last = null, projection = null;
    gl.getUniformLocation = function (p, n) {
      const v = loc.call(this, p, n);
      if (v) names.set(v, n);
      return v;
    };
    gl.uniformMatrix4fv = function (l, t, m, ...rest) {
      if (l && names.get(l) === "modelViewMatrix") last = Array.from(m);
      if(l && names.get(l)==='projectionMatrix') projection=Array.from(m);
      return matrix.call(this, l, t, m, ...rest);
    };
    gl.drawElements = function (mode, count, type, offset) {
      if (count === 10752 * 3 && last) {
        window.bottlePose = { matrix: last, projection, at: performance.now() };
      }
      return draw.call(this, mode, count, type, offset);
    };
  });
  await page.goto(url + "/en#first-breath");
  await page.waitForSelector("[data-ready=true]", { timeout: 90000 });
  const offsets = await page
    .locator("section.act")
    .evaluateAll((es) =>
      es
        .slice(0, -1)
        .map((e, i) => Math.round((e.offsetTop + es[i + 1].offsetTop) / 2)),
    );
  async function capture(y) {
    const stamp = await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: "instant" });
      return performance.now();
    }, y);
    await page.waitForFunction((t) => window.bottlePose?.at > t + 120, stamp);
    return page.evaluate(() => window.bottlePose.matrix);
  }
  for (let cycle = 0; cycle < 2; cycle++) {
    const forward = [];
    for (const y of offsets) forward.push(await capture(y));
    for (let i = offsets.length - 1; i >= 0; i--) {
      const a = forward[i],
        b = await capture(offsets[i]);
      const distance = Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]);
      const scale = (m) => Math.hypot(...m.slice(0, 3));
      const scaleError = Math.abs(scale(a) - scale(b));
      const orientationError = Math.max(
        ...[0, 1, 2, 4, 5, 6, 8, 9, 10].map((j) => Math.abs(a[j] - b[j])),
      );
      results.push({
        cycle,
        transition: i + 1,
        distance,
        scaleError,
        orientationError,
      });
      assert.ok(
        distance < 0.08 && scaleError < 0.01 && orientationError < 0.065,
        JSON.stringify(results.at(-1)),
      );
    }
  }
  console.log(
    "Compared real GPU model-view matrices on six transitions over two forward/reverse journeys.",
  );
  const clearances = [];
  for (const locale of ["en", "ar"]) {
    await page.goto(url + "/" + locale + "#first-breath");
    await page.waitForSelector("[data-ready=true]");
    for (const [width, height] of [
      [360, 640],
      [360, 780],
      [390, 844],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      await capture(0);
      const gap = await page.evaluate(() => {
        const m = window.bottlePose.matrix;
        // Project a conservative bound around the cap and upper shoulder.
        const proj=window.bottlePose.projection;
        const mul=(mat,v)=>[0,1,2,3].map(row=>v.reduce((sum,n,i)=>sum+n*mat[i*4+row],0));
        let top=Infinity;
        for(const [y,rx,rz] of [[1.84,.79,.45],[.95,1.02,.53]])for(const x of [-rx,rx])for(const z of [-rz,rz]){
          const c=mul(proj,mul(m,[x,y,z,1]));
          top=Math.min(top,innerHeight*(.5-.5*c[1]/c[3]));
        }
        return (
          top -
          document.querySelector(".hero-copy .cta").getBoundingClientRect()
            .bottom
        );
      });
      assert.ok(gap >= 12, locale + " " + width + "x" + height + ": " + gap);
      clearances.push({ locale, width, height, minimumGapPx: +gap.toFixed(1) });
    }
  }
  await writeFile(
    "qa/mobile-clearance.json",
    JSON.stringify(clearances, null, 2),
  );
  console.log(
    "Verified bottle clearance below the mobile CTA in both languages.",
  );
} finally {
  await writeFile("qa/reversal-results.json", JSON.stringify(results, null, 2));
  await browser.close();
}

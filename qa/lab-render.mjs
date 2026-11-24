import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { openBrowser, url } from "./browser.mjs";

const browser = await openBrowser({ software: false });
const results = {};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  await page.goto(url + "/en#lab");
  await page.waitForSelector('[data-ready="true"][data-chapter="5"]');
  assert.equal(
    await page.locator(".experience").getAttribute("data-fallback"),
    "false",
  );
  async function capture() {
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const crop = await page.screenshot();
    return sharp(crop)
      .extract({ left: 690, top: 115, width: 500, height: 530 })
      .resize(180, 190)
      .removeAlpha()
      .raw()
      .toBuffer();
  }
  function meanDifference(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    return +(total / a.length).toFixed(3);
  }
  let previous = await capture();
  for (const scent of ["veil", "tidal", "ember"]) {
    await page.getByRole("button", { name: scent, exact: true }).click();
    const next = await capture();
    results[scent] = meanDifference(previous, next);
    assert.ok(
      results[scent] > 3,
      "The rendered Lab should visibly change fragrance",
    );
    await page.screenshot({ path: "qa/lab-" + scent + ".jpg", quality: 84 });
    previous = next;
  }
  for (const [i, axis] of ["intensity", "warmth", "airiness"].entries()) {
    const slider = page.getByRole("slider").nth(i);
    await slider.press("Home");
    const low = await capture();
    await slider.press("End");
    results[axis] = meanDifference(low, await capture());
    assert.ok(
      results[axis] > 0.1,
      axis + " should affect pixels outside the controls",
    );
    await page.getByRole("button", { name: "Reset" }).click();
  }
  console.log(
    "Verified three Lab finishes and all three sliders against the rendered product region",
    results,
  );
} finally {
  await writeFile(
    "qa/lab-render-results.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}

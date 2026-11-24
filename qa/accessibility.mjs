import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { openBrowser, url } from "./browser.mjs";
import { webkit, firefox } from "playwright";
const browser = await openBrowser();
const report = { checks: [], otherEngines: {}, notes: [] };
const check = (message) => {
  console.log(message);
  report.checks.push(message);
};
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(url + "/en", { timeout: 120000 });
  await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
  await page.waitForSelector(".intro", { state: "detached" });
  await page.locator(".menu").tap();
  await page.locator("dialog[open] button").last().tap();
  await page.locator("#sillage[open]").waitFor();
  await page.screenshot({ path: "qa/prologue-mobile.jpg", quality: 80 });
  await page.locator("#sillage button").tap();
  await page.waitForSelector("#sillage", { state: "detached" });
  check(
    "Prologue replay, explicit continue and automatic first-visit dismissal",
  );
  await page.locator(".menu").tap();
  await page.locator('.index a[href="#lab"]').tap();
  await page.waitForSelector('[data-chapter="5"]');
  await page.getByRole("button", { name: "tidal", exact: true }).tap();
  await page
    .locator("input[type=range]")
    .first()
    .tap({ position: { x: 16, y: 16 } });
  assert.notEqual(await page.getByRole("slider").first().inputValue(), "60");
  check("Emulated touch world selector and range input");
  await page.goto(url + "/ar#veil");
  await page.waitForSelector('[data-chapter="3"]');
  await page.reload();
  await page.waitForSelector('[data-chapter="3"]');
  await page.goBack();
  assert.ok(page.url().includes("/en"));
  check("Direct chapter entry, refresh and browser back");
  await context.close();
  const p = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    reducedMotion: "reduce",
  });
  await p.goto(url + "/en#lab");
  await p.locator("[data-ready=true]").waitFor({ timeout: 90000 });
  await p.locator("canvas").evaluate((c) => {
    c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext();
  });
  await p.waitForSelector('[data-fallback=true][data-chapter="5"]');
  await p.getByRole("button", { name: "veil", exact: true }).click();
  assert.match(await p.locator(".recipe").innerText(), /VEIL/);
  await p.waitForSelector('[data-fallback=true][data-edition="veil"] #lab[data-current="true"]');
  assert.match(await p.locator("#lab .product-slot").evaluate(el=>getComputedStyle(el).backgroundImage),/editions\/veil\.webp/);
  await p.locator("#ritual").evaluate(el=>el.scrollIntoView());
  await p.waitForSelector('#ritual[data-current="true"]');
  assert.match(await p.locator("#ritual .product-slot").evaluate(el=>getComputedStyle(el).backgroundImage),/editions\/veil\.webp/);
  check("Context loss preserves Lab controls and the chosen edition through the Ritual");
  await p.addInitScript(() => sessionStorage.setItem("sensora-visited", "1"));
  await p.goto(url + "/en");
  await p.keyboard.press("Tab");
  assert.match(await p.locator(":focus").innerText(), /Skip to content/);
  await p.keyboard.press("Enter");
  await p.keyboard.press("Tab");
  check("Skip link reachable and operable by keyboard");
  await p.close();
  const noGL = await browser.newPage({ reducedMotion: "reduce" });
  await noGL.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : get.call(this, type, ...args);
    };
  });
  await noGL.goto(url + "/en#lab");
  await noGL.waitForSelector("[data-fallback=true]", { timeout: 18000 });
  await noGL.getByRole("button", { name: "tidal", exact: true }).click();
  assert.match(await noGL.locator(".recipe").innerText(), /TIDAL/);
  await noGL.waitForSelector('[data-fallback=true][data-edition="tidal"] #lab[data-current="true"]');
  assert.match(await noGL.locator("#lab .product-slot").evaluate(el=>getComputedStyle(el).backgroundImage),/editions\/tidal\.webp/);
  check("Unavailable WebGL retains the chosen Tidal edition and its recipe");
  await noGL.close();
} finally {
  await browser.close();
  for (const [name, engine] of Object.entries({ firefox, webkit })) {
    try {
      const b = await engine.launch();
      const p = await b.newPage();
      await p.goto(url + "/en");
      report.otherEngines[name] = "English route opened";
      await b.close();
    } catch (e) {
      report.otherEngines[name] = e.message.split("\n")[0];
    }
  }
  await writeFile(
    "qa/accessibility-results.json",
    JSON.stringify(report, null, 2),
  );
}

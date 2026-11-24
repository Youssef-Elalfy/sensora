import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { openBrowser, url } from "./browser.mjs";
const browser = await openBrowser(),
  chapters = [
    "first-breath",
    "invisible",
    "ember",
    "veil",
    "tidal",
    "lab",
    "ritual",
  ];
const report = { checks: [], errors: [], sizes: [], performance: {} };
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(30000);
page.on("response", (r) => {
  if (r.status() >= 400) report.errors.push(r.status() + " " + r.url());
});
page.on("pageerror", (e) => {if(!report.errors.includes(e.message))report.errors.push(e.message);});
page.on("console", (m) => {
  if (m.type() === "error") report.errors.push(m.text());
});
const check = (s) => {
  report.checks.push(s);
  console.log(s);
};
const settle = async () => {
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForTimeout(120);
};
async function scroll(id) {
  await page
    .locator("#" + id)
    .evaluate((e) =>
      window.scrollTo({ top: e.offsetTop, behavior: "instant" }),
    );
  await settle();
}
async function shot(name) {
  await page.screenshot({
    path: "qa/" + name + ".jpg",
    quality: 82,
    timeout: 90000,
  });
}
async function verifyChapterWidths(locale,width) {
  const problems=await page.locator("section.act").evaluateAll(sections=>{
    const failures=[];
    for(const section of sections){
      const bounds=section.getBoundingClientRect();
      for(const el of section.querySelectorAll("h1,h2,p,button,a,input[type=range]")){
        const r=el.getBoundingClientRect();
        if(!r.width || !r.height || getComputedStyle(el).position==="fixed")continue;
        if(r.left<-.5 || r.right>innerWidth+.5)failures.push(section.id+" "+el.tagName+" outside viewport");
        if(r.top<bounds.top-1||r.bottom>bounds.bottom+1)failures.push(section.id+" "+el.tagName+" outside chapter");
      }
    }
    return failures;
  });
  assert.deepEqual(problems,[],locale+" "+width+" "+problems.join(", "));
}
async function webgl() {
  await page.waitForSelector("[data-ready=true]");
  assert.equal(
    await page.locator(".experience").getAttribute("data-fallback"),
    "false",
  );
  await page.locator("canvas").waitFor();
  await page.waitForSelector(".intro", { state: "detached", timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
}
try {
  await page.goto(url + "/en", { timeout: 180000 });
  await webgl();
  check("English loaded with live WebGL");
  await shot("desktop-first-breath");
  await page.getByRole("button", { name: "Next fragrance" }).click();
  assert.match(await page.locator(".specimen p").innerText(), /Veil/);
  await page.getByRole("button", { name: "Previous fragrance" }).click();
  check("Hero fragrance controls");
  await page.getByRole("button", { name: "Index", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  check("Index opens and Escape returns to page");
  for (let i = 1; i < chapters.length; i++) {
    await scroll(chapters[i]);
    assert.equal(
      await page.locator(".experience").getAttribute("data-chapter"),
      String(i),
    );
    await shot("desktop-" + chapters[i]);
  }
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const id of [...chapters].reverse()) {
      await scroll(id);
      assert.equal(
        await page.locator(".experience").getAttribute("data-chapter"),
        String(chapters.indexOf(id)),
      );
    }
    await scroll("ritual");
  }
  check("All chapters and two reverse journeys");
  for (const id of ["ember", "veil", "tidal"]) {
    await scroll(id);
    const section = page.locator("#" + id);
    await section.getByRole("button", { name: "Explore notes" }).click();
    await section.getByRole("button", { name: "Heart", exact: true }).click();
    assert.equal(
      await section
        .getByRole("button", { name: "Heart", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await section.getByRole("button", { name: "Explore notes" }).click();
  }
  check("Top, heart and base note controls");
  await scroll("lab");
  await page.getByRole("button", { name: "tidal", exact: true }).click();
  const slider = page.getByRole("slider").nth(1);
  await slider.focus();
  await slider.press("ArrowRight");
  assert.equal(await slider.inputValue(), "51");
  assert.match(await page.locator(".recipe").innerText(), /TIDAL/);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save signature" }).click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), "SENSORA-TIDAL-en.txt");
  assert.match(await readFile(await download.path(), "utf8"), /Warmth 51/);
  await page.getByRole("button", { name: "Reset" }).click();
  assert.equal(await slider.inputValue(), "50");
  check("Keyboard Lab edit, live summary, actual recipe file and reset");
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [430, 932],
    [390, 844],
    [360, 780],
  ]) {
    await page.setViewportSize({ width, height });
    await scroll("first-breath");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);
    if (width !== 1440) await shot("en-" + width);
    await verifyChapterWidths("en",width);
    report.sizes.push("en " + width + "x" + height);
  }
  await scroll("lab");
  await shot("mobile-lab");
  await page.locator(".locale").click();
  await webgl();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  await page.waitForSelector('[data-chapter="5"]');
  check("Language switch preserves chapter and sets Arabic RTL");
  for (const [width, height] of [
    [360, 780],
    [430, 932],
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await scroll("first-breath");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await shot("ar-" + width);
    await verifyChapterWidths("ar",width);
    report.sizes.push("ar " + width + "x" + height);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of chapters.slice(1)) {
    await scroll(id);
    await shot("ar-mobile-" + id);
  }
  await page.getByRole("link", { name: "العودة للمختبر" }).click();
  await page.waitForSelector('[data-chapter="5"]');
  await page.getByRole("button", { name: "veil", exact: true }).click();
  const pendingAr = page.waitForEvent("download");
  await page.getByRole("button", { name: "حفظ البصمة" }).click();
  assert.match((await pendingAr).suggestedFilename(), /VEIL-ar/);
  check("Arabic Lab and finale CTA");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url + "/en#first-breath");
  await webgl();
  await settle();
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(1600);
  assert.ok(await page.evaluate(() => scrollY > 0));
  await page.mouse.wheel(0, -1100);
  await page.waitForFunction(() => scrollY < 6, {}, { timeout: 12000 });
  check("Animated wheel scroll moves and reverses");
  report.performance = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas"),
      g = canvas.getContext("webgl2"),
      ext = g.getExtension("WEBGL_debug_renderer_info"),
      deltas = [];
    let last = performance.now();
    for (let i = 0; i < 24; i++) {
      const time = await new Promise((r) => requestAnimationFrame(r));
      if (i > 2) deltas.push(time - last);
      last = time;
    }
    deltas.sort((a, b) => a - b);
    return {
      renderer: ext
        ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : g.getParameter(g.RENDERER),
      viewport: [innerWidth, innerHeight],
      drawingBuffer: [g.drawingBufferWidth, g.drawingBufferHeight],
      medianBrowserFrameMs: deltas[10],
      p95BrowserFrameMs: deltas[19],
      sample: deltas.length,
    };
  });
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
  check("Chromium console and page errors clear");
} finally {
  await writeFile("qa/browser-results.json", JSON.stringify(report, null, 2));
  await browser.close();
}

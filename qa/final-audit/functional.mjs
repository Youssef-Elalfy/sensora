// Functional QA for the SENSORA production build.
// Usage: SENSORA_QA_URL=http://127.0.0.1:3210 node qa/final-audit/functional.mjs
import { openBrowser } from "../browser.mjs";
import { writeFile } from "node:fs/promises";

const base = process.env.SENSORA_QA_URL || "http://127.0.0.1:3210";
const browser = await openBrowser({ software: false });
const results = [];
const errors = [];
const ignorable = (t) => /X4122|X4008|Program Info Log/.test(t);

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  " + detail : ""));
}
async function newPage(options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(page.url() + " pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !ignorable(m.text())) errors.push(page.url() + " console " + m.text());
  });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
  await page.addInitScript(() => { try { sessionStorage.setItem("sensora-visited", "1"); } catch {} });
  if (init) await page.addInitScript(init);
  return { page, context };
}
const ready = (page) => page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
async function jump(page, id) {
  await page.evaluate((id) => window.scrollTo({ top: document.getElementById(id).offsetTop, behavior: "instant" }), id);
  await page.waitForTimeout(700);
}
const attr = (page, name) => page.locator(".experience").getAttribute(name);

// 1. Fragrance worlds, both locales
for (const locale of ["en", "ar"]) {
  const { page, context } = await newPage();
  await page.goto(`${base}/${locale}`);
  await ready(page);
  const copy = await (await fetch(`${base}/${locale}`)).text();
  for (const [i, id, name] of [[2, "ember", "EMBER"], [3, "veil", "VEIL"], [4, "tidal", "TIDAL"]]) {
    await jump(page, id);
    const chapter = await attr(page, "data-chapter"), edition = await attr(page, "data-edition");
    const label = await page.locator(`#${id}-title`).getAttribute("aria-label");
    const desc = await page.locator(`#${id} .dek`).textContent();
    record(`${locale} ${id}: chapter, edition, title, description`, chapter === String(i) && edition === id && label === name && !!desc && copy.includes(desc), `chapter=${chapter} edition=${edition} title=${label}`);
  }
  const dir = await page.evaluate(() => [document.documentElement.dir, document.documentElement.lang]);
  record(`${locale} document direction`, locale === "ar" ? dir[0] === "rtl" && dir[1] === "ar" : dir[0] === "ltr" && dir[1] === "en", dir.join("/"));
  await context.close();
}

// 2. Hero fragrance switcher, pointer and keyboard
{
  const { page, context } = await newPage();
  await page.goto(`${base}/en`);
  await ready(page);
  const name = () => page.locator(".specimen p").textContent();
  const seen = [];
  for (let n = 0; n < 3; n++) { await page.getByRole("button", { name: "Next fragrance" }).click(); seen.push((await name()) + "/" + (await attr(page, "data-edition"))); }
  record("hero next cycles Veil → Tidal → Ember", seen.join(",") === "Veil/veil,Tidal/tidal,Ember/ember", seen.join(","));
  await page.getByRole("button", { name: "Previous fragrance" }).focus();
  await page.keyboard.press("Enter");
  record("hero previous via keyboard", (await name()) === "Tidal" && (await attr(page, "data-edition")) === "tidal", await name());
  await context.close();
}

// 3–5. Scent Lab, Ritual carry-over, language persistence
{
  const { page, context } = await newPage();
  await page.goto(`${base}/en#lab`);
  await ready(page);
  await jump(page, "lab");
  const lab = page.locator("#lab");
  const pick = async (s) => { await lab.getByRole("button", { name: s.toLowerCase(), exact: true }).click(); await page.waitForTimeout(150); };
  const sequence = [];
  for (const s of ["VEIL", "TIDAL", "EMBER", "VEIL", "TIDAL"]) {
    await pick(s);
    const pressed = await lab.locator("button[aria-pressed=true]").textContent();
    sequence.push(pressed.trim() + ":" + (await attr(page, "data-edition")) + ":" + (await lab.locator(".formula-name b").textContent()));
  }
  record("lab selection changes repeatedly", sequence.every((s) => { const [a, b, c] = s.split(":"); return a === b && c === a.toUpperCase(); }), sequence.join(" "));
  // Keyboard: focus Veil, activate with Space
  await lab.getByRole("button", { name: "veil", exact: true }).focus();
  await page.keyboard.press("Space");
  record("lab scent selection via keyboard", (await attr(page, "data-edition")) === "veil");
  const slider = lab.locator("input[type=range]").first();
  await slider.focus();
  for (let n = 0; n < 5; n++) await page.keyboard.press("ArrowRight");
  record("intensity slider via keyboard", (await lab.locator("output").first().textContent()) === "65", await lab.locator("output").first().textContent());
  await pick("TIDAL");
  await jump(page, "ritual");
  record("ritual inherits lab selection (tidal)", (await attr(page, "data-edition")) === "tidal" && (await attr(page, "data-chapter")) === "6");
  await jump(page, "lab");
  await pick("VEIL");
  await jump(page, "ritual");
  record("ritual follows a changed selection (veil)", (await attr(page, "data-edition")) === "veil");
  await jump(page, "ember");
  record("world chapters keep their own edition after lab changes", (await attr(page, "data-edition")) === "ember");
  // Language switch from the ritual keeps chapter and formula
  await jump(page, "ritual");
  await page.locator("a.locale").click();
  await page.waitForURL(/\/ar#ritual$/);
  await ready(page);
  await page.waitForTimeout(800);
  const arLab = page.locator("#lab");
  const pressed = (await arLab.locator("button[aria-pressed=true]").textContent()).trim();
  const out = await arLab.locator("output").first().textContent();
  record("language switch keeps chapter, edition and formula", (await attr(page, "data-chapter")) === "6" && (await attr(page, "data-edition")) === "veil" && pressed === "veil" && out === "٦٥", `chapter=${await attr(page, "data-chapter")} edition=${await attr(page, "data-edition")} pressed=${pressed} intensity=${out}`);
  await arLab.getByRole("button", { name: /إعادة الضبط/ }).click();
  await page.waitForTimeout(200);
  record("reset restores the original formula", (await arLab.locator("button[aria-pressed=true]").textContent()).trim() === "ember" && (await arLab.locator("output").first().textContent()) === "٦٠");
  // Recipe download
  await jump(page, "lab");
  const [download] = await Promise.all([page.waitForEvent("download"), arLab.locator(".actions .cta").click()]);
  record("signature download", /SENSORA-EMBER-ar\.txt/.test(download.suggestedFilename()), download.suggestedFilename());
  await context.close();
}

// 6. Chapter index dialog
{
  const { page, context } = await newPage();
  await page.goto(`${base}/en`);
  await ready(page);
  await page.locator("button.menu").click();
  await page.waitForTimeout(900);
  const open = await page.locator("#chapter-index").evaluate((d) => d.open);
  const expanded = await page.locator("button.menu").getAttribute("aria-expanded");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const closed = await page.locator("#chapter-index").evaluate((d) => !d.open);
  const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains("menu"));
  record("index opens, Escape closes, focus returns", open && expanded === "true" && closed && focusReturned, `open=${open} closed=${closed} focus=${focusReturned}`);
  await page.locator("button.menu").click();
  await page.waitForTimeout(900);
  await page.locator("#chapter-index a[href='#tidal']").click();
  await page.waitForTimeout(2600);
  record("index link lands on Tidal", (await attr(page, "data-chapter")) === "4" && page.url().endsWith("#tidal"), await attr(page, "data-chapter"));
  await context.close();
}

// 7. Notes explorer
{
  const { page, context } = await newPage();
  await page.goto(`${base}/en`);
  await ready(page);
  await jump(page, "ember");
  const toggle = page.locator("#ember .story-copy > button.cta");
  await toggle.click();
  await page.locator("#ember-notes").getByRole("button", { name: "Heart" }).click();
  const text = await page.locator("#ember-notes p").textContent();
  record("notes explorer opens and switches note", (await toggle.getAttribute("aria-expanded")) === "true" && text.includes("Rose"), text);
  await context.close();
}

// 8. Scroll reversal with real wheel input through Lenis
{
  const { page, context } = await newPage();
  await page.goto(`${base}/en`);
  await ready(page);
  await page.waitForTimeout(1500);
  const snapshot = () => page.evaluate(() => {
    const h = document.querySelector("#first-breath .hero-copy");
    const pieces = [...h.querySelectorAll(".type-piece")].map((e) => getComputedStyle(e).transform).join("|");
    return { chapter: document.querySelector(".experience").dataset.chapter, pieces, dek: getComputedStyle(h.querySelector(".dek")).opacity, y: scrollY };
  });
  const before = await snapshot();
  await page.mouse.move(700, 450);
  const chaptersDown = [];
  for (let n = 0; n < 40; n++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  chaptersDown.push((await snapshot()).chapter);
  for (let n = 0; n < 60; n++) { await page.mouse.wheel(0, -260); await page.waitForTimeout(60); }
  await page.waitForTimeout(1800);
  const after = await snapshot();
  record("wheel scroll forward then back restores hero state", after.chapter === "0" && after.y === 0 && after.pieces === before.pieces && after.dek === before.dek, `down→chapter ${chaptersDown[0]}, back→chapter ${after.chapter}, y=${after.y}`);
  await context.close();
}

// 9. Responsive overflow and clipping, both locales
const sizes = [[1920, 1080], [1600, 900], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844], [360, 800], [1280, 640]];
for (const locale of ["en", "ar"]) {
  const { page, context } = await newPage({ reducedMotion: "reduce" });
  await page.goto(`${base}/${locale}`);
  await ready(page);
  const failures = [];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    for (const id of ["first-breath", "invisible", "ember", "veil", "tidal", "lab", "ritual"]) {
      await page.evaluate((id) => window.scrollTo({ top: document.getElementById(id).offsetTop, behavior: "instant" }), id);
      await page.waitForTimeout(120);
      const issue = await page.evaluate((id) => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth) out.push("horizontal overflow " + (document.documentElement.scrollWidth - innerWidth));
        const header = document.querySelector("header.mast").getBoundingClientRect();
        for (const el of document.getElementById(id).querySelectorAll("h1,h2,p,button,a,input,output,legend")) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || el.closest("[hidden]")) continue;
          if (r.left < -1 || r.right > innerWidth + 1) out.push(`${el.tagName}.${el.className} x ${Math.round(r.left)}–${Math.round(r.right)}`);
          if (r.top < header.bottom - 2 && r.bottom > header.top && r.top >= 0) out.push(`${el.tagName}.${el.className} under header`);
        }
        return out;
      }, id);
      if (issue.length) failures.push(`${w}x${h} ${id}: ${issue.slice(0, 3).join("; ")}`);
    }
  }
  record(`${locale} responsive bounds at ${sizes.length} viewports × 7 chapters`, failures.length === 0, failures.slice(0, 8).join(" | "));
  await context.close();
}

// 10. Reduced motion and unavailable WebGL
{
  const { page, context } = await newPage({ reducedMotion: "reduce" });
  await page.goto(`${base}/en`);
  await ready(page);
  record("reduced motion: scene ready", (await attr(page, "data-fallback")) === "false");
  await context.close();
}
{
  const { page, context } = await newPage({}, () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto(`${base}/en`);
  await page.locator("[data-ready=true]").waitFor({ timeout: 60000 });
  await jump(page, "lab");
  await page.locator("#lab").getByRole("button", { name: "tidal", exact: true }).click();
  await jump(page, "ritual");
  const bg = await page.locator(".fallback-art").evaluate((e) => e.className);
  record("WebGL unavailable: fallback edition with working lab", (await attr(page, "data-fallback")) === "true" && bg.includes("tidal"), bg);
  await context.close();
}

// The simulated WebGL failure is expected to log Three.js's context error once.
const unexpected = errors.filter((e) => !/Error creating WebGL context/.test(e));
record("no unexpected page errors, console errors or failed requests", unexpected.length === 0, unexpected.slice(0, 5).join(" | "));
await writeFile(new URL("./functional-results.json", import.meta.url), JSON.stringify({ date: new Date().toISOString(), base, results, errors }, null, 2));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);

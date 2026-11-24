// Captures real showcase stills from the production build into qa/final-audit/work/.
import { openBrowser } from "../browser.mjs";
const base = process.env.SENSORA_QA_URL || "http://127.0.0.1:3210";
const out = (n) => new URL("./work/" + n, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const browser = await openBrowser({ software: false });
async function session(locale, width, height, dsf = 1) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf });
  const page = await context.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem("sensora-visited", "1"); } catch {} });
  await page.goto(`${base}/${locale}`);
  await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
  await page.mouse.move(width - 2, height - 2);
  await page.waitForTimeout(2500);
  return { page, context };
}
async function at(page, id, wait = 1900) {
  await page.evaluate((id) => window.scrollTo({ top: document.getElementById(id).offsetTop, behavior: "instant" }), id);
  await page.waitForTimeout(wait);
}
const shot = (page, name) => page.screenshot({ path: out(name), type: "png" });

// Desktop English
{
  const { page, context } = await session("en", 1920, 1080);
  await shot(page, "en-hero.png");
  for (const id of ["invisible", "ember", "veil", "tidal", "lab", "ritual"]) { await at(page, id); await shot(page, `en-${id}.png`); }
  // Lab in a Tidal formula, then the Ritual it carries into
  await at(page, "lab", 300);
  await page.locator("#lab").getByRole("button", { name: "tidal", exact: true }).click();
  await page.locator("#lab input[type=range]").nth(0).fill("78");
  await page.locator("#lab input[type=range]").nth(2).fill("62");
  await page.waitForTimeout(2200);
  await shot(page, "en-lab-tidal.png");
  await at(page, "ritual");
  await shot(page, "en-ritual-tidal.png");
  await at(page, "first-breath", 400);
  await page.locator("button.menu").click();
  await page.waitForTimeout(1600);
  await shot(page, "en-index.png");
  await context.close();
}
// Bottle detail at a larger native buffer
{
  const { page, context } = await session("en", 2560, 1440);
  for (const id of ["ember", "veil", "tidal"]) { await at(page, id, 1600); await shot(page, `detail-${id}.png`); }
  await context.close();
}
// Desktop Arabic
{
  const { page, context } = await session("ar", 1920, 1080);
  await shot(page, "ar-hero.png");
  for (const id of ["veil", "lab"]) { await at(page, id); await shot(page, `ar-${id}.png`); }
  await page.locator("button.menu").click();
  await page.waitForTimeout(1600);
  await shot(page, "ar-index.png");
  await context.close();
}
// Phones
for (const locale of ["en", "ar"]) {
  const { page, context } = await session(locale, 390, 844, 2);
  await shot(page, `${locale}-phone-hero.png`);
  for (const id of ["ember", "veil", "tidal", "lab", "ritual"]) { await at(page, id); await shot(page, `${locale}-phone-${id}.png`); }
  await context.close();
}
await browser.close();
console.log("done");

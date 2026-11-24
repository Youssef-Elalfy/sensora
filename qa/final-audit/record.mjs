// Records a real journey through the production build with the Chrome DevTools screencast.
import { openBrowser } from "../browser.mjs";
import { mkdir, writeFile, rm } from "node:fs/promises";
const base = process.env.SENSORA_QA_URL || "http://127.0.0.1:3210";
const dir = new URL("./work/frames/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
const browser = await openBrowser({ software: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.addInitScript(() => { try { sessionStorage.setItem("sensora-visited", "1"); } catch {} });
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  frames.push({ data, t: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await page.goto(`${base}/en`);
await page.locator("[data-ready=true]").waitFor({ timeout: 90000 });
await page.mouse.move(1100, 600);
await page.waitForTimeout(1200);
// Replay the hero title reveal on camera
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1 });
const mark = [];
await page.evaluate(() => window.dispatchEvent(new Event("sensora:arrival")));
await page.waitForTimeout(2600);
const glide = (to, ms) => page.evaluate(([to, ms]) => new Promise((done) => {
  const from = scrollY, start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    window.scrollTo(0, from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}), [to, ms]);
const top = (id) => page.evaluate((id) => document.getElementById(id).offsetTop, id);
for (const id of ["invisible", "ember", "veil", "tidal"]) { await glide(await top(id), 1900); await page.waitForTimeout(1400); }
await glide(await top("lab"), 1700);
await page.waitForTimeout(900);
const lab = page.locator("#lab");
for (const s of ["veil", "tidal"]) { await lab.getByRole("button", { name: s, exact: true }).hover(); await page.waitForTimeout(250); await lab.getByRole("button", { name: s, exact: true }).click(); await page.waitForTimeout(1500); }
const slider = lab.locator("input[type=range]").first(), box = await slider.boundingBox();
await page.mouse.move(box.x + box.width * .6, box.y + box.height / 2); await page.mouse.down();
for (let i = 0; i <= 30; i++) { await page.mouse.move(box.x + box.width * (.6 + .3 * i / 30), box.y + box.height / 2); await page.waitForTimeout(25); }
await page.mouse.up(); await page.waitForTimeout(900);
await glide(await top("ritual"), 1800);
await page.waitForTimeout(2200);
await page.locator("button.menu").click();
await page.waitForTimeout(2200);
await page.keyboard.press("Escape");
await page.waitForTimeout(1300);
await cdp.send("Page.stopScreencast");
await page.waitForTimeout(300);
const t0 = frames[0].t, lines = ["ffconcat version 1.0"];
for (let i = 0; i < frames.length; i++) {
  const name = String(i).padStart(5, "0") + ".jpg";
  await writeFile(dir + name, Buffer.from(frames[i].data, "base64"));
  const next = frames[i + 1]?.t ?? frames[i].t + 1 / 30;
  lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
}
lines.push(`file '${String(frames.length - 1).padStart(5, "0")}.jpg'`);
await writeFile(dir + "list.ffconcat", lines.join("\n"));
console.log("frames", frames.length, "seconds", (frames.at(-1).t - t0).toFixed(1), "avg fps", (frames.length / (frames.at(-1).t - t0)).toFixed(1));
await browser.close();

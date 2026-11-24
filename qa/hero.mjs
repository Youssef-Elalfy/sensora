import { openBrowser, url } from "./browser.mjs";
const browser = await openBrowser();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log(m.text());
  });
  await page.goto(url + "/en", { timeout: 120000 });
  await page.waitForSelector("[data-ready=true]", { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(550);
  await page.waitForSelector("canvas");
  console.log(
    await page.locator(".experience").evaluate((e) => ({
      fallback: e.dataset.fallback,
      canvas: !!e.querySelector("canvas"),
    })),
  );
  await page.screenshot({
    path: "qa/hero-current.jpg",
    quality: 85,
    timeout: 90000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "qa/hero-current-mobile.jpg",
    quality: 85,
    timeout: 90000,
  });
} finally {
  await browser.close();
}

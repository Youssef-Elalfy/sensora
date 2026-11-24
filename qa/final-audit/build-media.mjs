// Converts real captures in qa/final-audit/work into the published docs/media set.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const W = (n) => "qa/final-audit/work/" + n, M = (n) => "docs/media/" + n;
await mkdir("docs/media", { recursive: true });
const still = (src, dst, width = 1920) => sharp(W(src)).resize({ width }).webp({ quality: 84, effort: 6 }).toFile(M(dst));
await Promise.all([
  still("en-hero.png", "hero.webp"), still("en-invisible.png", "the-invisible.webp"),
  still("en-ember.png", "ember.webp"), still("en-veil.png", "veil.webp"), still("en-tidal.png", "tidal.webp"),
  still("en-lab-tidal.png", "scent-lab.webp"), still("en-ritual-tidal.png", "ritual.webp"),
  still("en-index.png", "chapter-index.webp"), still("ar-hero.png", "arabic-rtl.webp"),
  still("ar-veil.png", "arabic-veil.webp"), still("ar-lab.png", "arabic-scent-lab.webp"),
]);
// Bottle triptych cropped from 2560 × 1440 captures
const crops = { ember: 1440, veil: 240, tidal: 1270 };
const panels = await Promise.all(Object.entries(crops).map(([k, left]) =>
  sharp(W(`detail-${k}.png`)).extract({ left, top: 200, width: 880, height: 1180 }).resize({ width: 600 }).png().toBuffer()));
const gap = 14, pw = 600, ph = Math.round(1180 * 600 / 880);
await sharp({ create: { width: pw * 3 + gap * 2, height: ph, channels: 3, background: "#14070c" } })
  .composite(panels.map((input, i) => ({ input, left: i * (pw + gap), top: 0 }))).webp({ quality: 86, effort: 6 }).toFile(M("bottles.webp"));
for (const [k] of Object.entries(crops)) await sharp(W(`detail-${k}.png`)).extract({ left: crops[k], top: 200, width: 880, height: 1180 }).png().toFile(W(`crop-${k}.png`));
// Phone strips with rounded device masks
async function strip(locale, ids, out) {
  const w = 360, h = Math.round(844 * w / 390), r = 34, gapX = 36, pad = 56;
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  const frames = await Promise.all(ids.map((id) => sharp(W(`${locale}-phone-${id}.png`)).resize({ width: w }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer()));
  const width = pad * 2 + ids.length * w + (ids.length - 1) * gapX;
  await sharp({ create: { width, height: h + pad * 2, channels: 4, background: "#16080e" } })
    .composite(frames.map((input, i) => ({ input, left: pad + i * (w + gapX), top: pad }))).webp({ quality: 84, effort: 6 }).toFile(M(out));
}
await strip("en", ["hero", "ember", "veil", "tidal", "lab"], "mobile.webp");
await strip("ar", ["hero", "veil", "tidal", "lab", "ritual"], "arabic-mobile.webp");
console.log("media ready");

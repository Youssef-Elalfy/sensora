# SENSORA: final creative and technical audit

**Date:** 24 November 2026
**Scope:** The complete SENSORA codebase as delivered by the previous build phase (commit `5838fd7`), audited in a real browser and then refined (commit `ce25564` and later).
**Method:** Source review of every component, shader and geometry module. Real-GPU Playwright tours of all seven chapters in English and Arabic, at desktop and phone sizes. A functional suite, wheel-driven scroll reversal, isolated GPU frame sampling and a review of every capture at full size.

## Verdict

SENSORA is a strong, coherent piece. It has a persistent procedural studio, three distinct editions that morph between each other, and silk that reads as fabric rather than as a texture. The bilingual layouts are built properly, not mirrored as an afterthought. The audit found **no critical defects**. All seven chapters, the Scent Lab, the Ritual hand-off, the chapter index, keyboard access, reduced motion and the no-WebGL edition worked as specified.

The audit did find four high-severity issues. Two were visible quality problems: a broken kerning pair in the first headline every visitor reads, and faceted bottle silhouettes on two of the three editions. One was a state bug: switching language forgot the visitor's Scent Lab formula. The fourth was missing link-preview metadata. A further five medium issues affected polish and rendering density. Each one is fixed, verified in the browser and documented below with before/after evidence.

## Environment

| | |
|---|---|
| Host | Intel Core i7-9750H, **Intel UHD Graphics 630** (no discrete GPU present), Windows 11, display 1920 × 1080 at 125 % scaling |
| Browser | Playwright Chromium build 1248, headless, ANGLE Direct3D 11 (`--use-angle` default, hardware GPU) |
| Build | `next build --webpack`, served with `next start` (Next.js 16.4.6, React 19, Three.js r182) |
| Not available | Firefox, WebKit/Safari, physical phones and tablets, screen readers. Phone results below are **emulated** on the desktop GPU. |

## Findings

Severity follows the brief. **Critical** means broken functionality or a serious layout defect. **High** means a noticeable visual, interaction or accessibility problem. **Medium** means a meaningful polish opportunity. **Low** means optional.

### Critical

None found.

### High

#### H1: Broken kerning in the hero headline: "W ear what"

- **Where:** First Breath `h1`, English, all viewports. This is the first headline every visitor sees.
- **Root cause:** The hero animated its headline letter by letter, so each glyph sat in its own inline-block and could not kern. Measuring the bundled Bodoni Moda subset showed the larger problem. It kerns `Va` (−18.4 px at 160 px), `To` and `Yo`, but has **no kerning at all for `We`/`Wa`** (0.0 px). The −0.075 em display tracking then made the W gap stand out further.
- **Fix:** The hero now reveals by word, as the Arabic version already did. `MotionText` applies a −0.11 em optical correction to `W` before a lowercase vowel. That value matches what the font applies to `V`. The world names keep their letter cascade, which works for tracked capitals.
- **Status:** Fixed. [Before / after](evidence/hero-kerning.webp) · `components/MotionText.tsx`, `app/style.css`

#### H2: Faceted bottle silhouettes on Veil and Ember

- **Where:** Glass shell, inner cavity, liquid and printed label, most visible on Veil's rounded body.
- **Root cause:** Each edition bends the body width along its height (`0.70 + 0.34·sin(πu)` for Veil). The shell profile had only 5 rings between the heel and the shoulder, though, and the liquid had **one** segment for its whole height. The curve therefore resolved into straight facets with visible corners. The liquid stayed a straight-sided trapezoid inside a barrel-shaped glass. The label plane had a single row and could not follow the curve either.
- **Fix:** `densify()` resamples every profile to at most 0.075 units between rings before the edition morphs are computed. The label grid gained 16 rows. The ring topology stays shared, so morph targets and the fixed per-edition buffers still work. Vertex count rises to about 14 k on the glass, which is negligible on the measured frame times.
- **Status:** Fixed. [Before / after](evidence/veil-silhouette-label.webp) · `lib/model.ts`

#### H3: A language switch resets the visitor's Scent Lab formula and hero edition

- **Where:** Language control in the header, from any chapter.
- **Root cause:** The control correctly keeps the chapter (`/ar#ritual`), but it loads the other locale's page. The Lab state lived only in React state. After switching, the Lab and the Ritual both fell back to Ember at 60/50/40, which broke the "consistent fragrance selection" requirement.
- **Fix:** The formula is persisted to `sessionStorage` (validated on read) and the hero edition too. Both are restored after hydration, so server and client markup still match.
- **Status:** Fixed. The automated check selects Veil, sets intensity to 65, switches language at the Ritual and lands on the Arabic Ritual with Veil, `٦٥` and the Veil edition. · `components/Lab.tsx`, `components/Experience.tsx`

#### H4: No link-preview or locale metadata

- **Where:** `<head>` on `/en` and `/ar`.
- **Root cause:** A single static title and description in English for both locales. There was no `metadataBase`, canonical, `hreflang` alternates, Open Graph or Twitter card. A shared link would render as bare text, which undercuts a portfolio piece.
- **Fix:** `generateMetadata` produces localized titles and descriptions, a canonical URL, `en`/`ar`/`x-default` alternates, and Open Graph (`en_US` / `ar_EG`) and Twitter cards. They point at a 1200 × 630 card composed from real captures (`public/og.jpg`). The origin comes from `NEXT_PUBLIC_SITE_URL` or Vercel's production URL.
- **Status:** Fixed. · `app/[locale]/layout.tsx`

### Medium

#### M1: Tidal minerals looked low-poly

- **Root cause:** The mineral forms were built from an icosphere at detail 2 with `flatShading`. Three.js's polyhedron geometry is also non-indexed, so even without `flatShading` its computed normals are per-face. The stones therefore read as crude faceted rocks next to a carefully smoothed bottle.
- **Fix:** The geometry is welded with `mergeVertices` before its normals are computed, at detail 7, with a gentler low-frequency deformation. The material is now a polished sea-glass finish (clearcoat 0.85, soft sheen).
- **Status:** Fixed. [Before / after](evidence/tidal-minerals.webp) · `components/WorldObjects.tsx`

#### M2: Ritual plinth read as striped and stayed brown in every edition

- **Root cause:** The stone shader multiplied the base colour by a broad `0.7 + 0.3·sin()` band, which produced regular light and dark stripes. It used one fixed brown, so a Tidal or Veil formula carried into the Ritual sat on an off-palette block.
- **Fix:** The plinth now has a nearly even ground with sparse, fine veining, a slightly more polished response, and a dark stone tone that eases toward the carried edition (garnet, plum or deep teal).
- **Status:** Fixed. [Finish before / after](evidence/plinth-finish.webp) · [Tidal Ritual](evidence/ritual-tidal-plinth.webp) · `lib/surfaces.ts`, `components/WorldObjects.tsx`

#### M3: Veil label fine print was illegible

- **Root cause:** Veil prints dark ink on a pale liquid, but it reused the light 2 px glow from the other editions. The halo washed the small lines into the lilac.
- **Fix:** Veil now uses darker, halo-free ink. Ember and Tidal keep their soft shadow.
- **Status:** Fixed. Visible in the [Veil comparison](evidence/veil-silhouette-label.webp). · `lib/model.ts`

#### M4: Integrated graphics rendered at 1× on scaled displays

- **Root cause:** Every "Intel UHD/HD" renderer was put on a fixed `dpr = 1`. On a 125 % or 150 % laptop display, the whole scene was rendered at CSS resolution and upscaled, which softens glass edges and label type. This is the host's own display configuration.
- **Measured:** Simply allowing 1.25× on this UHD 630 (1536 × 864 CSS → 1920 × 1080 buffer) produced **35.4 fps** in the hero and 33–34 fps in Ember and Veil. That is just above the existing 35 fps slow-frame trigger, so the hero would never have stepped down.
- **Fix:** Integrated GPUs now start at up to 1.25× and **settle once, for the session**, on the CSS pixel grid if they cannot hold 45 fps for two 1.2 s windows. The existing 35 fps tier stays below that. It steps to 0.9× only on 1× displays. The step is one-way to avoid visible resolution changes. Stronger integrated GPUs keep the sharper buffer.
- **Status:** Fixed. On this host the canvas settles to 1× within about 2.5 s of first render and then holds 45–58 fps (table below). · `components/Stage.tsx`

#### M5: Orphaned "a" in the Lab headline on wide screens

- **Where:** At 1600 px and wider, the Lab headline broke as "Compose a / feeling.".
- **Fix:** Italic display phrases (`.display em`) no longer wrap internally, so the line breaks as "Compose / *a feeling.*". The responsive suite confirms no overflow at any of the 10 sizes in either language.
- **Status:** Fixed. · `app/style.css`

#### M6: Scene-ready time on integrated graphics (not fixed)

- **Measured:** The `data-ready` signal arrived after **3.4–8.1 s** across runs on the UHD 630. Most of that is ANGLE/D3D11 compiling several physically based programs (clearcoat, sheen, iridescence, transmission variants).
- **Mitigation already present:** First visits show the prologue while the scene prepares, and DOM content is usable immediately.
- **Recommendation:** Warm programs with `renderer.compileAsync` (`KHR_parallel_shader_compile`) behind the prologue, and consider merging the two iridescent materials. This is left as a measured follow-up rather than a speculative change.

### Low (recorded, not changed)

| ID | Observation | Reason left |
|---|---|---|
| L1 | Direct3D's HLSL compiler prints warnings X4122/X4008 in a program info log | These are compiler warnings, not errors. Rendering is correct and no WebGL errors occur. |
| L2 | With WebGL disabled, Three.js logs one "Error creating WebGL context" before the fallback edition appears | The fallback is correct and fully functional. Pre-detecting would cost an extra context on every visit. |
| L3 | `WorldObjects` geometries are not disposed on unmount | The canvas unmounts only when the page unloads. |
| L4 | The chapter index lets faint page typography show through the overlay | This is deliberate translucency and does not affect legibility of the index. |
| L5 | In Arabic eyebrows the Arabic-Indic zero in "Nº ٠٢" resembles a full stop at micro size | This is standard Arabic numeral typography. |
| L6 | Tidal's caustic ripples are busy behind the left copy column | This is an art-direction choice. Copy contrast stays sufficient. |
| L7 | Cumulative layout shift of 0.004 on load in emulated runs | Negligible, and well below the 0.1 threshold. |

## What was verified, and how

All checks ran against the production build. The scripts are in this folder.

| Area | Result | Evidence |
|---|---|---|
| Ember / Veil / Tidal | Correct chapter, edition, title, description and direction, in both languages | `functional.mjs` → [results](evidence/functional-results.json) |
| Hero edition switcher | Next cycles Veil → Tidal → Ember. Previous works from the keyboard. | same |
| Scent Lab | 5 consecutive selections, keyboard selection (Space) and slider (arrow keys); reset; localized signature download | same |
| Ritual hand-off | The Ritual inherits Tidal, then a changed Veil. World chapters keep their own edition. | same |
| Language switch | Keeps chapter, edition and formula (fixed in H3) | same |
| Chapter index | Opens, Escape closes, focus returns to the trigger, and links land on the chapter | same |
| Scroll reversal | 40 wheel steps down through Lenis to the Ritual, 60 back. Hero type transforms, `.dek` opacity, chapter and scroll position all restore exactly. | same |
| Responsive | **140 settled samples**: 10 viewports (1920×1080, 1600×900, 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 360×800 and a short 1280×640) × 7 chapters × 2 languages. No horizontal overflow, no copy outside the viewport, no copy under the header. | same |
| Reduced motion | Scene ready, ambience still, scroll smoothing off | same |
| No WebGL | Fallback edition follows the Lab selection into the Ritual, and the Lab still works | same |
| Errors | No page errors or failed requests. The only console error is the expected one from the simulated WebGL failure. | same |
| Visual | Full-size review of every chapter, EN/AR, desktop and phone, before and after | `tour.mjs`, `media.mjs` |

## Performance (measured)

Isolated runs: each chapter was sampled for 4.5 s of real `requestAnimationFrame` time after a 1.5 s settle. "Rendered fps" counts frames that issued WebGL draw calls. The Intel UHD 630 is the only GPU on this host. Phone figures are emulated on the same GPU.

| Configuration | Hero | Ember | Veil | Tidal | Lab | Ritual | Buffer | Draw calls |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| 1440 × 900 @1× | 56.6 | 53.3 | 53.7 | 53.3 | 51.0 | 59.3 | 1440 × 900 | 11–15 |
| 1536 × 864 @1.25× (this laptop), after M4 | 58.3 | 51.9 | 53.3 | 52.0 | 44.8 | 47.5 | settled 1536 × 864 | 11–15 |
| 1536 × 864 @1.25×, density held at 1.25× (before M4) | 35.4 | 32.9 | 33.9 | — | — | — | 1920 × 1080 | 11–12 |
| 390 × 844 @3× (emulated phone) | 59.7 | 60.1 | 60.2 | 59.6 | 60.2 | 60.2 | 487 × 1055 (1.25× cap) | 11–15 |

p95 frame times at 1440 × 900 were 20–26 ms. The previously reported Hero 53.4 / Ember 54.6 fps fall within the run-to-run spread seen here: an earlier run of the same build gave 51.8 / 49.9. Raw data: [1440](evidence/performance-desktop-1440-dpr1.json) · [1536 @1.25](evidence/performance-laptop-1536-dpr125.json) · [phone](evidence/performance-phone-390-dpr3.json).

## Limits of this audit

- Only Chromium was available. Firefox and Safari (desktop and iOS) behaviour is **not verified**.
- Phone layouts were **emulated** (viewport, DPR, touch metrics). No physical device, thermal or battery behaviour was measured.
- No discrete GPU was available. The full-transmission glass path that capable GPUs use was reviewed in code and in earlier studies, but not re-measured here.
- Assistive-technology output was not tested with a real screen reader. Semantics, labels, focus order and focus return were checked programmatically.

## Specialist agents

Your configured agents are explicit-invocation only, and every finding above needed hands-on browser measurement and source changes in the same loop. The audit was therefore done directly in one session rather than split across agents. No specialist agent was invoked.

## Production verification

**Live:** [sensora-cyan.vercel.app/en](https://sensora-cyan.vercel.app/en) · [sensora-cyan.vercel.app/ar](https://sensora-cyan.vercel.app/ar). The project is `sensora` on Vercel, built from `Youssef-Elalfy/sensora@main` with the Next.js preset, and is publicly accessible.

- `/en` and `/ar` return 200, `/` redirects (307) to `/en`, and the Open Graph card, font licences and fallback stills are served.
- `/ar` serves `lang="ar" dir="rtl"`, an Arabic title, a canonical URL, `en`/`ar`/`x-default` alternates and an absolute `og:image` on the production origin.
- The same 28-check functional suite passed **28/28 against the live deployment**. It drove the real WebGL scene in Chromium on the UHD 630. [Production results](evidence/functional-results-production.json)
- Live screenshots of the desktop (EN) and phone (AR) layouts matched the local production build, with fonts, 3D scene, Lab and Ritual all present.

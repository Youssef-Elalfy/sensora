# SENSORA — Digital Fragrance Lab

An English and Arabic fragrance film for the browser. One persistent Three.js product travels through the introduction, First Breath, The Invisible, Ember, Veil, Tidal, the Scent Lab and The Ritual. Every fragrance form is generated from editable source.

## Local development

Use Node.js 22.13 or newer and npm. From the project root run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`. The root redirects to English. The language control preserves the current chapter. The index provides direct chapter navigation and a replay of the introduction.

## Editing the experience

| Source | Responsibility |
| --- | --- |
| `copy/en.json`, `copy/ar.json`, `lib/scents.ts` | Fragrance copy, controls, chapter identifiers and color definitions |
| `lib/model.ts` | Ring profiles, superellipse cross sections, optical shell, meniscus, three stopper profiles and enamel lettering that follows the glass |
| `lib/surfaces.ts` | Procedural studio light cards, silk shader and shaped petals |
| `components/Stage.tsx`, `components/WorldObjects.tsx` | Persistent perspective studio, material interpolation, scene-specific sculptures and plinth |
| `lib/framing.ts` | Measures editorial product slots and fits the visible foreground to the space between copy, navigation and controls |
| `components/useJourney.ts` | Native chapter geometry, reversible scroll sampling, Lenis and ScrollTrigger lifecycle |
| `components/ChapterIndex.tsx`, `components/MotionText.tsx` | Masked bilingual chapter navigation, keyboard focus and word-safe typography reveals |
| `components/Stories.tsx`, `components/Lab.tsx` | Accessible scene copy, note exploration, formula editing and localized recipe download |
| `app/style.css` | Editorial typography, display breakpoints, direction-aware layout and motion preferences |

The optical shell uses a physical transmission material backed by an inset colored volume, a thick heel and a generated environment map. Lab intensity controls liquid brightness, warmth shifts its hue and the textile lighting, and airiness changes the petal scale. The three selections morph the glass, inset liquid, cap and printed label together. Ember features a flared rose-gold stopper, Veil a luminous pebble and Tidal a slanted mineral cut. Scroll position samples a paused GSAP timeline that directs camera passage, rotation, scene weights and textile gathering. The same positions are sampled on the return journey. Signatures are local text downloads. Reloading starts a fresh composition.

The studio uses full framebuffer transmission on capable hardware. Constrained graphics use view-dependent Fresnel reflections on the same fluted shell and retain the separate liquid volume. Ember's 29 petals share one instanced draw. The visible canvas renders on the browser frame clock. Reduced motion renders on demand and background tabs suspend the scene. Motion preferences suspend ambience and remove scroll smoothing. DOM content and the Lab remain available in the fallback edition. Native dialogs provide modal navigation and keyboard focus handling.

## Verification and release

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

For Vercel, import the project root, select the Next.js framework preset, and use the package-lock install and default Next.js build output. The application has no server credentials, database or external asset services. The repository contains the private creative reference kit. Publish only the application build and licensed public files.

The latest composition comparison and controlled silk-resolution study are in `qa/composition/REPORT.md`. The earlier redesign recordings and cinematic review are under `qa/cinematic/`. Run `qa/cinematic.mjs after` against the local production server to repeat the idle-motion sample. The remaining browser evidence and reproduction notes are under `qa/`. Source and font credits are in `ASSET_CREDITS.md`.
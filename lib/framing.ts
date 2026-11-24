import type { Direction } from "./scents";

export type Frame = {
  centerX: number;
  width: number;
  top: number;
  bottom: number;
  headerBottom: number;
  viewportHeight: number;
};

// Store document coordinates. No DOM measurement runs in the WebGL frame loop.
export function measureFrame(section: HTMLElement, headerBottom: number): Frame {
  const slot = section.querySelector<HTMLElement>(".product-slot");
  if (!slot) throw new Error("A chapter is missing its product frame");
  const rect = slot.getBoundingClientRect();
  return {
    centerX: rect.left + rect.width / 2 - innerWidth / 2,
    width: rect.width,
    top: rect.top + scrollY,
    bottom: rect.bottom + scrollY,
    headerBottom,
    viewportHeight: innerHeight
  };
}

export function frameAt(d: Direction) {
  const chapter = Math.round(d.progress);
  const frame = d.frames[chapter];
  if (!frame) return { x: 0, y: 0, scale: 0 };
  const units = 6.4 / frame.viewportHeight;
  const top = Math.max(frame.headerBottom + 24, frame.top - d.scrollPosition);
  const bottom = Math.min(frame.viewportHeight - 28, frame.bottom - d.scrollPosition);
  const height = Math.max(0, bottom - top);
  // Both shots meet at zero scale as the editorial column changes sides.
  const travel = Math.min(1, Math.max(0, (.5 - Math.abs(d.progress - chapter)) / .19));
  const envelope = travel * travel * (3 - 2 * travel);
  const scale = Math.min(1.43, frame.width * units / 2.48, height * units / 3.75)
    * envelope * (1 - .15 * d.passage);
  const centerY = Math.min(frame.viewportHeight - 18, top + height / 2);
  return { x: frame.centerX * units, y: 3.2 - centerY * units - scale * .24, scale };
}
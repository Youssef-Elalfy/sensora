import en from "@/copy/en.json";
import ar from "@/copy/ar.json";

export const scents = ["ember", "veil", "tidal"] as const;
export type Scent = (typeof scents)[number];
export type Locale = "en" | "ar";
export const dictionaries = { en, ar };
export const colors = {
  ember: {
    liquid: "#9b241d",
    silk: "#800f2a",
    sky: "#240b13",
    glow: "#8e233f",
  },
  veil: { liquid: "#bba1ca", silk: "#bca9bc", sky: "#493749", glow: "#a88ead" },
  tidal: {
    liquid: "#3c9490",
    silk: "#518c85",
    sky: "#072628",
    glow: "#357772",
  },
};
export function editionForChapter(chapter:number,hero:Scent,formula:Scent):Scent {
  if(chapter===0)return hero;
  if(chapter>=5)return formula;
  return chapter===3?"veil":chapter===4?"tidal":"ember";
}
export type Formula = {
  scent: Scent;
  intensity: number;
  warmth: number;
  airiness: number;
};
export const original: Formula = {
  scent: "ember",
  intensity: 60,
  warmth: 50,
  airiness: 40,
};
export type Direction = {
  frames: import('./framing').Frame[];
  scrollPosition:number;
  progress: number;
  passage:number;
  roll:number;
  hero: Scent;
  formula: Formula;
  note: number;
  reduced: boolean;
  rtl: boolean;
  pointerX: number;
  pointerY: number;
  compact: boolean;

};
// Event and render loops share a mutable director outside React's render state.
export function updateDirection(
  ref: { current: Direction },
  patch: Partial<Direction>,
) {
  Object.assign(ref.current, patch);
}
export const acts = [
  "first-breath",
  "invisible",
  "ember",
  "veil",
  "tidal",
  "lab",
  "ritual",
] as const;
export const chapterNames = {
  en: [
    "First breath",
    "The invisible",
    "Ember",
    "Veil",
    "Tidal",
    "Scent lab",
    "The ritual",
  ],
  ar: [
    "النَفَس الأول",
    "ما لا يُرى",
    "إمبر",
    "ڤيل",
    "تايدال",
    "مختبر العطر",
    "الطقس الأخير",
  ],
};
export const extra = {
  en: {
    menu: "Index",
    close: "Close",
    index: "Chapter index",
    chapter: "Chapter",
    lab: "Enter the lab",
    studio: "Digital Fragrance Lab",
    extrait: "Extrait de parfum",
    collection: "The collection",
    previous: "Previous fragrance",
    next: "Next fragrance",
    notes: "Explore notes",
    top: "Top",
    heart: "Heart",
    base: "Base",
    simple: "Text edition",
    replay: "Replay introduction",
    skip: "Skip introduction",
    scent: "Fragrance",
    rotate: "Move to explore",
  },
  ar: {
    menu: "الفهرس",
    close: "إغلاق",
    index: "فهرس الفصول",
    chapter: "الفصل",
    lab: "ادخل المختبر",
    studio: "مختبر العطر الرقمي",
    extrait: "خلاصة عطرية",
    collection: "المجموعة",
    previous: "العطر السابق",
    next: "العطر التالي",
    notes: "اكتشف النوتات",
    top: "المقدمة",
    heart: "القلب",
    base: "القاعدة",
    simple: "النسخة النصية",
    replay: "إعادة المقدّمة",
    skip: "تخطَّ المقدّمة",
    scent: "العطر",
    rotate: "حرّك لاستكشاف الشكل",
  },
};

"use client";
import { useEffect, useState, type RefObject } from "react";
import {
  updateDirection,
  scents,
  colors,
  original,
  dictionaries,
  type Scent,
  type Direction,
  type Formula,
  type Locale,
} from "@/lib/scents";
import {MotionText} from "./MotionText";
import { Arrow } from "./Marks";
const axes = ["intensity", "warmth", "airiness"] as const;
const storageKey = "sensora-formula";
// The formula survives a language switch, which loads the other locale's page.
function restore(): Formula | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const scent = scents.find((s) => s === value.scent);
    if (!scent) return null;
    const level = (k: (typeof axes)[number]) => {
      const n = value[k];
      return typeof n === "number" && n >= 0 && n <= 100 ? Math.round(n) : original[k];
    };
    return { scent, intensity: level("intensity"), warmth: level("warmth"), airiness: level("airiness") };
  } catch {
    return null;
  }
}
export default function Lab({
  locale,
  director,
  onEdition,
}: {
  locale: Locale;
  director: RefObject<Direction>;
  onEdition:(scent:Scent)=>void;
}) {
  const c = dictionaries[locale],
    ar = locale === "ar";
  const [state, setState] = useState<Formula>(original);
  const set = (next: Formula) => {
    updateDirection(director, { formula: next });
    if(next.scent!==state.scent)onEdition(next.scent);
    setState(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  useEffect(() => {
    const saved = restore();
    if (!saved) return;
    const frame = requestAnimationFrame(() => {
      updateDirection(director, { formula: saved });
      onEdition(saved.scent);
      setState(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, [director, onEdition]);
  const fmt = (v: number) => v.toLocaleString(ar ? "ar-EG" : "en");
  const world = c.worlds[state.scent],
    summary = world.notes.join(ar ? "، " : " · ");
  function save() {
    const text = [
      "SENSORA / " + c.lab.recipe,
      world.name,
      summary,
      ...axes.map((k) => c.lab[k] + " " + fmt(state[k]) + " / " + fmt(100)),
      c.lab.note,
    ].join("\n");
    const href = URL.createObjectURL(
      new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = href;
    a.download = "SENSORA-" + world.name + "-" + locale + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  return (
    <section className="act lab-act" id="lab" aria-labelledby="lab-title">
      <div className="lab-content">
        <div className="labhead">
          <p className="micro eyebrow">
            <i />
            {c.lab.eyebrow}
          </p>
          <h2 className="display" id="lab-title" aria-label={c.lab.headline}>
            <MotionText text={ar ? "اصنع" : "Compose"}/> <em><MotionText text={ar ? "إحساسًا." : "a feeling."}/></em>
          </h2>
        </div>
        <div className="console">
          <fieldset>
            <legend className="micro">{c.lab.select}</legend>
            <div className="scent-options">
              {scents.map((s) => (
                <button
                  key={s}
                  aria-pressed={state.scent === s}
                  onClick={() => set({ ...state, scent: s })}
                >
                  <i style={{ background: colors[s].glow }} />
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sliders">
            {axes.map((k) => (
              <label key={k}>
                <span>{c.lab[k]}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={state[k]}
                  onChange={(e) =>
                    set({ ...state, [k]: Number(e.target.value) })
                  }
                />
                <output>{fmt(state[k])}</output>
              </label>
            ))}
          </div>
          <div role="status" className="recipe">
            <span className="micro">{c.lab.recipe}</span>
            <p key={state.scent} className="formula-name">
              <b dir="ltr">{world.name}</b> · {summary}
            </p>
            <span className="sr-only">
              {axes.map((k) => c.lab[k] + " " + fmt(state[k])).join(", ")}
            </span>
          </div>
          <div className="actions">
            <button className="cta" onClick={save}>
              {c.lab.save}
              <Arrow dir="down" />
            </button>
            <button
              className="text-button"
              onClick={() => set({ ...original })}
            >
              {c.lab.reset} ↺
            </button>
          </div>
          <p className="lab-note">{c.lab.description}</p>
        </div>
      </div>
      <div className="product-slot" aria-hidden="true" />
    </section>
  );
}

import { useState, type RefObject } from "react";
import {
  updateDirection,
  dictionaries,
  extra,
  scents,
  type Direction,
  type Locale,
  type Scent,
} from "@/lib/scents";
import { Arrow, Brand } from "./Marks";
import Lab from "./Lab";
import {MotionText} from "./MotionText";
function World({
  scent,
  locale,
  director,
}: {
  scent: Scent;
  locale: Locale;
  director: RefObject<Direction>;
}) {
  const [open, setOpen] = useState(false),
    [note, setNote] = useState(0),
    c = dictionaries[locale],
    ui = extra[locale],
    w = c.worlds[scent];
  const accents = {
    ember: ["Velvet", "Petal", "Resin"],
    veil: ["Powder", "Green", "Skin"],
    tidal: ["Mineral", "Citrus", "Wood"],
  };
  const arabic = {
    ember: ["مخملي", "زهري", "راتنجي"],
    veil: ["بودري", "أخضر", "ناعم"],
    tidal: ["معدني", "حمضي", "خشبي"],
  };
  return (
    <section
      id={scent}
      className={"act world " + scent}
      aria-labelledby={scent + "-title"}
    >
      <div className="story-copy">
        <p className="micro eyebrow">
          <i />
          {ui.collection} / Nº {w.number}
        </p>
        <h2 className="world-name" dir="ltr" id={scent + "-title"} aria-label={w.name}>
          <MotionText text={w.name} letters/>
        </h2>
        <p className="poem">{w.headline}</p>
        <p className="dek">{w.description}</p>
        <button
          className="cta"
          aria-expanded={open}
          aria-controls={scent + "-notes"}
          onClick={() => {
            setOpen(!open);
            updateDirection(director, { note: open ? -1 : note });
          }}
        >
          {ui.notes}
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <div id={scent + "-notes"} hidden={!open} className="note-book">
          <div className="note-keys">
            {[ui.top, ui.heart, ui.base].map((k, i) => (
              <button
                aria-pressed={i === note}
                key={k}
                onClick={() => {
                  setNote(i);
                  updateDirection(director, { note: i });
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <p aria-live="polite">
            {w.notes[note]}{" "}
            <small>/ {(locale === "ar" ? arabic : accents)[scent][note]}</small>
          </p>
        </div>
      </div>
      <div className="product-slot" aria-hidden="true" />
    </section>
  );
}
export default function Stories({
  locale,
  director,
  onEdition,
}: {
  onEdition:(scent:Scent)=>void;
  locale: Locale;
  director: RefObject<Direction>;
}) {
  const ar = locale === "ar",
    c = dictionaries[locale],
    ui = extra[locale];
  return (
    <>
      <section
        className="act invisible-act"
        id="invisible"
        aria-labelledby="invisible-title"
      >
        <div className="story-copy">
          <p className="micro eyebrow">
            <i />
            {c.invisible.eyebrow}
          </p>
          <h2 className="display" id="invisible-title" aria-label={c.invisible.headline}>
            <MotionText text={ar ? "لا ترى العطر…" : "You cannot see a scent."}/>{" "}
            <em><MotionText text={ar ? "حتى الآن." : "Until now."}/></em>
          </h2>
          <p className="dek">{c.invisible.description}</p>
          <a className="text-button" href="#ember">
            {ui.collection} <Arrow dir="down" />
          </a>
        </div>
        <div className="product-slot" aria-hidden="true" />
      </section>
      {scents.map((s) => (
        <World key={s} scent={s} locale={locale} director={director} />
      ))}
      <Lab locale={locale} director={director} onEdition={onEdition} />
      <section
        className="act ritual"
        id="ritual"
        aria-labelledby="ritual-title"
      >
        <div className="story-copy">
          <p className="micro eyebrow">
            <i />
            {ar ? "٠٧ / الطقس الأخير" : "07 / THE RITUAL"}
          </p>
          <h2 className="display" id="ritual-title" aria-label={c.finale.headline}>
            <MotionText text={ar ? "اترك أثرًا" : "Leave a trace"}/>{" "}
            <em><MotionText text={ar ? "من الدهشة." : "of wonder."}/></em>
          </h2>
          <p className="dek">{c.finale.description}</p>
          <a href="#lab" className="cta">
            {c.finale.cta}
            <Arrow />
          </a>
        </div>
        <div className="product-slot" aria-hidden="true" />
        <footer className="chapter-foot">
          <Brand />
          <small>{c.finale.credit}</small>
        </footer>
      </section>
    </>
  );
}

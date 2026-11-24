"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  dictionaries,
  editionForChapter,
  scents,
  original,
  colors,
  extra,
  acts,
  type Scent,
  type Direction,
  type Locale,
} from "@/lib/scents";
import {MotionText} from "./MotionText";
import ChapterIndex from "./ChapterIndex";
import { Arrow, Brand } from "./Marks";
import Stories from "./Stories";
import Prologue from "./Prologue";
import { useJourney } from "./useJourney";
const Stage = dynamic(() => import("./Stage"), { ssr: false });
export default function Experience({ locale }: { locale: Locale }) {
  const ar = locale === "ar",
    c = dictionaries[locale],
    ui = extra[locale];
  const [hero, setHero] = useState(0),
    [ready, setReady] = useState(false),
    [fallback, setFallback] = useState(false),
    [intro, setIntro] = useState<false | "arrival" | "replay">(false),
    [active, setActive] = useState(0);

  const director = useRef<Direction>({
    progress: 0,
    passage:0,roll:0,
    hero: "ember",
    formula: original,
    note: -1,
    reduced: false,
    rtl: ar,
    pointerX: 0,
    pointerY: 0,
    compact: false,
    frames: [], scrollPosition:0,
  });
  const [labEdition,setLabEdition]=useState<Scent>(original.scent);
  const edition=editionForChapter(active,scents[hero],labEdition);
  const {lock,go}=useJourney(director,setActive);
  const finish = useCallback(() => {
    setIntro(false);
    window.dispatchEvent(new Event("sensora:arrival"));
    try {
      sessionStorage.setItem("sensora-visited", "1");
    } catch {}
  }, []);
  useEffect(() => {
    let visited = false;
    try {
      visited = sessionStorage.getItem("sensora-visited") === "1";
    } catch {}
    const frame = requestAnimationFrame(() => {
      if (!visited && !location.hash) setIntro("arrival");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const loaded = useCallback(() => setReady(true), []),
    failed = useCallback(() => {
      setFallback(true);
      setReady(true);
    }, []);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      director.current.reduced = q.matches;
      director.current.compact = innerWidth < 760;
    };
    sync();
    q.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    const pointer = (e: PointerEvent) => {
      director.current.pointerX = (e.clientX / innerWidth) * 2 - 1;
      director.current.pointerY = 1 - (e.clientY / innerHeight) * 2;
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    return () => {
      q.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("pointermove", pointer);
    };
  }, []);
  const choose = (index: number) => {
    const n = (index + 3) % 3;
    director.current.hero = scents[n];
    setHero(n);
  };
  const world = c.worlds[scents[hero]];
  return (
    <div
      className="experience"
      style={{ backgroundColor: colors[scents[hero]].sky }}
      data-edition={edition}
      data-ready={ready}
      data-fallback={fallback}
      data-chapter={active}
    >
      <a className="skip" href="#first-breath">
        {c.nav.skip}
      </a>
      {!fallback && (
        <Stage director={director} onReady={loaded} onFail={failed} />
      )}
      {fallback && (
        <div
          className={
            "fallback-art " + edition
          }
          aria-hidden="true"
        >
          <span />
        </div>
      )}
      <div className="shade" aria-hidden="true" />
      <header className="mast">
        <a href="#first-breath" aria-label="SENSORA">
          <Brand />
        </a>
        <div className="studio">
          {fallback ? ui.simple : ui.studio}
        </div>
        <nav aria-label={ui.index}>
          <a className="labnav" href="#lab">
            {c.nav.lab}
            <Arrow />
          </a>
          <a
            lang={ar ? "en" : "ar"}
            className="locale"
            href={(ar ? "/en" : "/ar") + "#" + acts[active]}
          >
            {ar ? "EN" : "عربي"}
          </a>
          <ChapterIndex locale={locale} active={active} lock={lock} go={go} replay={()=>setIntro("replay")}/>
        </nav>
      </header>
      <main>
        <section
          id="first-breath"
          className="act hero"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <p className="micro eyebrow">
              <i />
              {c.hero.eyebrow}
            </p>
            <h1 id="hero-title" aria-label={c.hero.headline}>
              <span><MotionText text={ar ? "ارتدِ ما" : "Wear what"} letters={!ar}/></span>
              <em><MotionText text={ar ? "تشعر به." : "you feel."}/></em>
            </h1>
            <p className="dek">{c.hero.description}</p>
            <a className="cta" href="#ember">
              {c.hero.cta}
              <Arrow />
            </a>
          </div>
          <div className="product-slot" aria-hidden="true" />
          <div className="hero-foot">
            <a href="#invisible" className="scroll">
              <span className="circle">
                <Arrow dir="down" />
              </span>
              <span className="micro">{c.hero.scroll}</span>
            </a>
            <div className="specimen">
              <span
                className="swatch"
                style={{ background: colors[scents[hero]].silk }}
              />
              <div>
                <span className="micro">
                  {ui.extrait} · {world.number}
                </span>
                <p dir="ltr">
                  {world.name.charAt(0) + world.name.slice(1).toLowerCase()}
                </p>
              </div>
              <div className="switch">
                <button
                  aria-label={ui.previous}
                  onClick={() => choose(hero - 1)}
                >
                  <Arrow dir={ar ? "right" : "left"} />
                </button>
                <button aria-label={ui.next} onClick={() => choose(hero + 1)}>
                  <Arrow dir={ar ? "left" : "right"} />
                </button>
              </div>
            </div>
          </div>
        </section>
        <Stories locale={locale} director={director} onEdition={setLabEdition} />
      </main>
      {intro && (
        <Prologue
          replay={intro === "replay"}
          ready={ready}
          finish={finish}
          locale={locale}
        />
      )}
    </div>
  );
}

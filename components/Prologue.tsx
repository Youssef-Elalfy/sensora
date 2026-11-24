import { useEffect, useRef } from "react";
import { dictionaries, extra, type Locale } from "@/lib/scents";
import { Brand } from "./Marks";
export default function Prologue({
  ready,
  replay,
  locale,
  finish,
}: {
  ready: boolean;
  replay: boolean;
  locale: Locale;
  finish: () => void;
}) {
  const el = useRef<HTMLDialogElement>(null),
    c = dictionaries[locale];
  useEffect(() => {
    const d = el.current;
    d?.showModal();
    const max = replay ? undefined : setTimeout(finish, 7500);
    return () => {
      clearTimeout(max);
      d?.close();
    };
  }, [finish, replay]);
  useEffect(() => {
    if (!ready || replay) return;
    const id = setTimeout(
      finish,
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 900,
    );
    return () => clearTimeout(id);
  }, [ready, finish, replay]);
  return (
    <dialog
      ref={el}
      id="sillage"
      onCancel={finish}
      className="intro"
      aria-label={c.prologue.headline}
    >
      <div className="droplet" aria-hidden="true" />
      <Brand />
      <p>{c.prologue.headline}</p>
      <div className="micro" role="status">
        {ready ? "" : c.prologue.loading}
      </div>
      <button onClick={finish}>
        {ready ? c.prologue.enter : extra[locale].skip} ↗
      </button>
    </dialog>
  );
}

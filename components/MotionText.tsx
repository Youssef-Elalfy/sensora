import {Fragment,type ReactNode} from "react";
// The bundled Bodoni Moda subset has no kerning for "W" before a lowercase
// vowel, while its "Va" and "To" pairs are kerned. Display sizes make the gap
// obvious, so "W" receives the same correction the font applies to "V".
const loose=/^W[aeo]/;
function kerned(unit:string):ReactNode{
  const m=unit.match(loose);
  if(!m)return unit;
  return <><span className="kern-pair">W</span>{unit.slice(1)}</>;
}
export function MotionText({text,letters=false}:{text:string;letters?:boolean}){
  // Keep Arabic words intact so contextual letters remain joined. Letter mode
  // splits words into separate boxes, so reserve it for tracked capitals.
  return <>{text.split(" ").map((word,i)=><Fragment key={i}>{i>0&&" "}<span className="type-word"><span className="type-mask">{(letters?[...word]:[word]).map((unit,j)=><span key={j} className="type-piece">{letters?unit:kerned(unit)}</span>)}</span></span></Fragment>)}</>;
}

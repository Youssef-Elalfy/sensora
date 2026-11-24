import {Fragment} from "react";
export function MotionText({text,letters=false}:{text:string;letters?:boolean}){
  // Keep Arabic words intact so contextual letters remain joined.
  return <>{text.split(" ").map((word,i)=><Fragment key={i}>{i>0&&" "}<span className="type-word"><span className="type-mask">{(letters?[...word]:[word]).map((unit,j)=><span key={j} className="type-piece">{unit}</span>)}</span></span></Fragment>)}</>;
}
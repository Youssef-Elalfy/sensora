"use client";
import gsap from "gsap";
import {memo,useCallback,useEffect,useRef,useState} from "react";
import {acts,chapterNames,extra,type Locale} from "@/lib/scents";
import {Brand,Arrow} from "./Marks";

type Props={locale:Locale;active:number;lock:(locked:boolean)=>void;go:(id:string)=>void;replay:()=>void};
const Engraving=memo(function Engraving(){
 return <svg className="index-engraving" viewBox="-180 -180 360 360" fill="none" aria-hidden="true">
 <g className="engraved-bloom">{Array.from({length:31},(_,j)=>{
 const r=55+j*2.9;const path=Array.from({length:299},(_,i)=>{const a=i*Math.PI*2/298;const wave=.76+.204*Math.sin(5*a+j*.028)+.085*Math.cos(3*a-.83)+.035*Math.sin(8*a-.8);
 return (i?"L":"M")+(r*wave*Math.cos(a)).toFixed(2)+","+(r*wave*Math.sin(a)).toFixed(2);}).join("")+"Z";
 return <path key={j} d={path} stroke="currentColor" strokeWidth={j%6===0?.9:.48} opacity={.4+.5*j/30}/>;})}</g></svg>;
});
export default function ChapterIndex({locale,active,lock,go,replay}:Props){
 const ui=extra[locale],rtl=locale==="ar",names=chapterNames[locale];
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const animation=useRef<gsap.core.Timeline|null>(null),after=useRef<(()=>void)|null>(null),closing=useRef(false);
 const [opened,setOpened]=useState(false);
 const release=useCallback(()=>{
  const el=dialog.current;if(!el?.open)return;
  el.close();animation.current?.revert();animation.current=null;lock(false);setOpened(false);closing.current=false;
  trigger.current?.focus({preventScroll:true});const action=after.current;after.current=null;action?.();
 },[lock]);
 function close(action?:()=>void){
  if(closing.current||!dialog.current?.open)return;closing.current=true;after.current=action??null;
  const tl=animation.current;
  if(!tl||matchMedia("(prefers-reduced-motion: reduce)").matches||tl.progress()<.015){release();return;}
  tl.timeScale(1.85).eventCallback("onReverseComplete",release).reverse();
 }
 function open(){
  const el=dialog.current;if(!el||el.open)return;setOpened(true);lock(true);el.showModal();
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const links=el.querySelectorAll(".index-title"),rules=el.querySelectorAll(".index-rule"),direction=rtl?-1:1;
  const tl=gsap.timeline({defaults:{ease:"power3.out"}});animation.current=tl;
  tl.fromTo(el,{clipPath:rtl?"inset(0 95% 98% 0 round 0 0 68% 0)":"inset(0 0 98% 95% round 0 0 0 68%)"},
    {clipPath:"inset(0% 0% 0% 0% round 0%)",duration:.62,ease:"power3.inOut"})
    .fromTo(el.querySelector(".brand"),{yPercent:75,opacity:0},{yPercent:0,opacity:1,duration:.46},.23)
    .fromTo(el.querySelector(".index-plate"),{scale:.89,rotation:-9*direction,opacity:0},{scale:1,rotation:0,opacity:1,duration:.9},.16)
    .fromTo(links,{yPercent:112,rotation:3*direction},{yPercent:0,rotation:0,duration:.54,stagger:.052},.29)
    .fromTo(rules,{scaleX:0},{scaleX:1,duration:.55,stagger:.048},.32);
 }
 useEffect(()=>{const el=dialog.current;return()=>{animation.current?.kill();if(el?.open)lock(false);};},[lock]);
 return <><button ref={trigger} className="menu" aria-label={ui.menu} aria-controls="chapter-index" aria-haspopup="dialog" aria-expanded={opened} onClick={open}><span/><span/></button>
 <dialog id="chapter-index" aria-labelledby="index-label" ref={dialog} data-lenis-prevent className="index" onCancel={e=>{e.preventDefault();close();}}>
 <div className="index-head"><Brand/><button className="index-close" onClick={()=>close()} aria-label={ui.close}><span>{ui.close}</span><i aria-hidden="true">×</i></button></div>
 <div className="index-layout"><div className="index-plate" aria-hidden="true"><Engraving/></div>
 <div className="index-contents"><h2 id="index-label" className="micro eyebrow"><i/>{ui.index}</h2>
 <div className="index-links">{acts.map((id,i)=><a key={id} href={"#"+id} aria-current={active===i?"location":undefined} onClick={e=>{
 if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();close(()=>go(id));}}>
 <small dir="ltr">0{i+1}</small><span className="index-mask"><span className="index-title">{names[i]}</span></span><Arrow/><i className="index-rule" aria-hidden="true"/></a>)}</div>
 <button className="index-replay" onClick={()=>close(replay)}>{ui.replay} <span aria-hidden="true">↺</span></button></div></div>
 </dialog></>;
}
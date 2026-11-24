import {useCallback,useEffect,useRef,type RefObject} from "react";
import {measureFrame} from "@/lib/framing";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {acts,updateDirection,type Direction} from "@/lib/scents";

const shots=[
 {hold:.12,travel:.75,focus:1,roll:.68,ease:"power2.inOut"},
 {hold:.12,travel:.72,focus:.73,roll:-.80,ease:"sine.inOut"},
 {hold:.09,travel:.84,focus:.94,roll:.92,ease:"power1.inOut"},
 {hold:.16,travel:.72,focus:.69,roll:-.65,ease:"sine.inOut"},
 {hold:.11,travel:.75,focus:.58,roll:.30,ease:"power2.inOut"},
 {hold:.18,travel:.78,focus:.47,roll:-.18,ease:"sine.inOut"},
];
export function useJourney(director:RefObject<Direction>,onChapter:(n:number)=>void){
 const lenis=useRef<Lenis|null>(null),locked=useRef(false);
 const lock=useCallback((on:boolean)=>{locked.current=on;document.documentElement.toggleAttribute("data-index-open",on);if(on)lenis.current?.stop();else lenis.current?.start();},[]);
 const go=useCallback((id:string)=>{
  const section=document.getElementById(id);if(!section)return;
  if(location.hash!=="#"+id)history.pushState(null,"","#"+id);
  const focus=()=>{section.tabIndex=-1;section.focus({preventScroll:true});};
  if(lenis.current)lenis.current.scrollTo(section,{duration:1.06,onComplete:focus});
  else {section.scrollIntoView({behavior:"instant"});focus();}
 },[]);
 useEffect(()=>{
  gsap.registerPlugin(ScrollTrigger);
  const elements=acts.map(id=>document.getElementById(id)).filter((el):el is HTMLElement=>el!==null);
  const query=matchMedia("(prefers-reduced-motion: reduce)"),notes=new Map<number,number>();
  const slots=elements.flatMap(el=>Array.from(el.querySelectorAll(".product-slot,.hero-copy,.story-copy,.labhead")));
  let live=true,bounds:number[]=[],active=-1;
  const film={progress:0,passage:0,roll:0},master=gsap.timeline({paused:true});
  shots.forEach((shot,i)=>{
   const start=i+shot.hold,half=shot.travel/2;
   master.to(film,{progress:i+1,duration:shot.travel,ease:shot.ease},start)
    .to(film,{passage:shot.focus,roll:shot.roll,duration:half,ease:"sine.inOut"},start)
    .to(film,{passage:0,roll:0,duration:half,ease:"sine.inOut"},start+half);
  });
  function resize(){bounds=elements.map(el=>el.offsetTop);const mast=document.querySelector('header.mast');const headerBottom=mast?.getBoundingClientRect().bottom??80;updateDirection(director,{frames:elements.map(el=>measureFrame(el,headerBottom))});}
  function sample(){
   if(!bounds.length)return;const y=window.scrollY,i=Math.max(0,bounds.findLastIndex(v=>v<=y+1));
   const travel=bounds[i+1]===undefined?0:gsap.utils.clamp(0,1,(y-bounds[i])/(bounds[i+1]-bounds[i]));
   master.time(i+travel,false);
   const next=Math.round(film.progress);
   updateDirection(director,{scrollPosition:y,progress:query.matches?next:film.progress,passage:query.matches?0:film.passage,roll:query.matches?0:film.roll});
   if(query.matches)window.dispatchEvent(new Event("sensora:frame"));
   if(next!==active){elements.forEach((el,idx)=>{el.dataset.current=String(idx===next);});notes.set(active,director.current.note);active=next;updateDirection(director,{note:notes.get(next)??-1});onChapter(next);}
  }
  const tick=()=>lenis.current?.raf(performance.now());
  function configure(){
   lenis.current?.destroy();lenis.current=null;gsap.ticker.remove(tick);
   if(!query.matches){const smooth=new Lenis({duration:.85,smoothWheel:true,anchors:true,stopInertiaOnNavigate:true});lenis.current=smooth;
    if(locked.current)smooth.stop();smooth.on("scroll",ScrollTrigger.update);gsap.ticker.add(tick);}
   sample();
  }
  resize();configure();
  const trigger=ScrollTrigger.create({start:0,end:"max",onUpdate:sample,onRefresh:()=>{resize();sample();}});
  const motion=gsap.matchMedia();
  motion.add("(prefers-reduced-motion: no-preference)",()=>{
   const rtl=document.dir==="rtl"?-1:1;
   const first=elements[0];const hero=gsap.timeline({paused:true}).fromTo(first.querySelectorAll(".type-piece"),{yPercent:101,rotate:3*rtl},{yPercent:0,rotate:0,stagger:.035,duration:.83,ease:"power3.out"}).fromTo(first.querySelector(".dek"),{opacity:0,y:10},{opacity:1,y:0,duration:.5},.33);
   const arrive=()=>{if(window.scrollY<innerHeight*.25)hero.restart();};arrive();window.addEventListener("sensora:arrival",arrive);
   elements.slice(1).forEach((el,i)=>{
    const tidal=el.id==="tidal",veil=el.id==="veil",ember=el.id==="ember";
    const tl=gsap.timeline({scrollTrigger:{trigger:el,start:"top 94%",end:"top 15%",scrub:true},defaults:{ease:"none"}});
    tl.fromTo(el.querySelectorAll(".type-piece"),{xPercent:(tidal?-84:veil?24:0)*rtl,yPercent:tidal?28:veil?62:108,rotation:ember?-10*rtl:tidal?6*rtl:0},
     {xPercent:0,yPercent:0,rotation:0,stagger:{each:veil?.055:.075,from:tidal?"end":"start"},duration:.74,ease:veil?"sine.out":"power2.out"},0);
    const text=el.querySelectorAll(".eyebrow,.poem,.dek,.story-copy > .cta,.console,.chapter-foot");
    tl.fromTo(text,{opacity:.15,y:veil?-10:15},{opacity:1,y:0,duration:.55,stagger:.084},.14);
    const line=el.querySelector(".eyebrow i");if(line)tl.fromTo(line,{scaleX:0},{scaleX:1,duration:.56},.08);
    if(i<5){const block=el.querySelector(".story-copy,.labhead");if(block)gsap.fromTo(block,{y:0},{y:el.id==="invisible"?-35:-18,ease:"none",scrollTrigger:{trigger:el,start:"bottom 70%",end:"bottom top",scrub:true}});}
   });
   return()=>window.removeEventListener("sensora:arrival",arrive);
  });
  const watch=new ResizeObserver(()=>ScrollTrigger.refresh());elements.forEach(el=>watch.observe(el));slots.forEach(el=>watch.observe(el));
  query.addEventListener("change",configure);window.addEventListener("pageshow",sample);document.fonts.ready.then(()=>{if(live)ScrollTrigger.refresh();});sample();
  return()=>{live=false;trigger.kill();master.kill();motion.revert();watch.disconnect();query.removeEventListener("change",configure);window.removeEventListener("pageshow",sample);lenis.current?.destroy();lenis.current=null;gsap.ticker.remove(tick);document.documentElement.removeAttribute("data-index-open");};
 },[director,onChapter]);
 return {lock,go};
}
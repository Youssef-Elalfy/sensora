"use client";
/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects. The render loop updates the GPU scene outside React rendering. */
import {
  Component,
  Suspense,
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  useSyncExternalStore,
  useMemo,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {frameAt} from "@/lib/framing";
import WorldObjects from "./WorldObjects";
import * as T from "three";
import { bottleGeometry, labelPanel, labelTexture } from "@/lib/model";
import {
  studioTexture,
  petalGeometry,
  silkMaterial,
  shadeLiquid,
  shadeReflectiveGlass,
} from "@/lib/surfaces";
import { colors, scents, editionForChapter, type Direction } from "@/lib/scents";

export type StageProps = {
  director: RefObject<Direction>;
  onReady: () => void;
  onFail: () => void;
};
class Boundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Set({
  director,
  onReady,
  onFail,
  economical,
}: StageProps & { economical: boolean }) {
  const { gl, scene, size, camera } = useThree();
  const product = useRef<T.Group>(null),
    shell = useRef<T.MeshPhysicalMaterial>(null),
    juice = useRef<T.MeshPhysicalMaterial>(null),
    label = useRef<T.MeshBasicMaterial>(null),
    cloth = useRef<T.Mesh>(null),
    petals = useRef<T.InstancedMesh>(null);
  const petalTransform=useMemo(()=>new T.Object3D(),[]);
  const pointer=useMemo(()=>new T.Vector2(),[]);
  const pointerTarget=useMemo(()=>new T.Vector2(),[]);
  const geometry = useMemo(() => bottleGeometry(), []),
    panel = useMemo(() => labelPanel(), []),
    textures = useMemo(() => scents.map(labelTexture), []);
  const editions=useMemo(()=>{
    const lookup=new Map<T.BufferGeometry,{animated:T.BufferGeometry;fixed:T.BufferGeometry[]}>();
    for(const source of [geometry.glass,geometry.liquid,geometry.cap,panel]){
      const fixed=scents.map((_,i)=>{
        const g=new T.BufferGeometry();
        g.setIndex(source.index);
        g.setAttribute("position",source.morphAttributes.position?.[i-1]??source.attributes.position);
        g.setAttribute("normal",source.morphAttributes.normal?.[i-1]??source.attributes.normal);
        if(source.attributes.uv)g.setAttribute("uv",source.attributes.uv);
        g.computeBoundingSphere();return g;
      });
      const set={animated:source,fixed};
      for(const g of [source,...fixed])lookup.set(g,set);
    }
    return lookup;
  },[geometry,panel]);
  const silk = useMemo(() => silkMaterial(), []),
    petal = useMemo(() => petalGeometry(), []),
    back = useMemo(() => new T.Color(), []);
  const palette = useMemo(
    () =>
      scents.map((s) => ({
        liquid: new T.Color(colors[s].liquid),
        silk: new T.Color(colors[s].silk),
        sky: new T.Color(colors[s].sky),
      })),
    [],
  );
  const atmosphere = useMemo(
    () =>
      new T.ShaderMaterial({
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uInk: { value: new T.Color() },
          uLight: { value: new T.Color() },
          uOrigin: { value: 0.72 },
          uTide: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader:
          "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.);}",
        fragmentShader: `
 varying vec2 vUv;uniform vec3 uInk,uLight;uniform float uOrigin,uTide,uTime;
 void main(){vec2 uv=vUv;vec2 delta=(uv-vec2(uOrigin,.65))*vec2(1.55,.95);
 float halo=exp(-dot(delta,delta)*8.2);
 float air=.5+.5*sin(uv.x*7.4+uv.y*4.1+.92*sin(uv.y*5.7-uTime*.22)+uTime*.19);
 float caustic=pow(.5+.5*cos(14.*uv.y+8.*sin(uv.x*6.+uv.y*4.+uTime*.21)),11.);
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 vec3 color=mix(uInk*.77,uLight,halo*(.49+.38*air))+caustic*uTide*vec3(.024,.065,.061)*halo;
 gl_FragColor=vec4(color+(grain-.5)*.0012,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
      }),
    [],
  );
  const pollen = useMemo(()=>makePollen(),[]);
  const signal = useRef(false),
    clock = useRef(0);
  const petalFinish = useMemo(
    () =>
      new T.MeshPhysicalMaterial({
        color: "#64142a",
        roughness: 0.48,
        metalness: 0.06,
        sheen: 0.42,
        sheenColor: "#823347",
        side: T.DoubleSide,
        vertexColors: true,
      }),
    [],
  );
  const targetSky=useMemo(()=>new T.Color(),[]),targetSilk=useMemo(()=>new T.Color(),[]);
  const caps=useMemo(()=>["#bd877a","#d0c3ce","#84afad"].map(c=>new T.Color(c)),[]);
  const metal=useRef<T.MeshPhysicalMaterial>(null);
  const targetJuice = useMemo(() => new T.Color(), []);
  useLayoutEffect(() => {
    gl.transmissionResolutionScale =
      gl.domElement.clientWidth < 760 ? 0.43 : 0.64;
    const env = studioTexture(gl);
    scene.environment = env.texture;
    scene.background = back;
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, back, onFail]);
  useEffect(
    () => () => {
      for(const [g,set] of editions)if(g!==set.animated)g.dispose();
      Object.values(geometry).forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      pollen.geometry.dispose();pollen.material.dispose();
      atmosphere.dispose();petalFinish.dispose();
      silk.dispose();
      panel.dispose();
      petal.dispose();
    },
    [geometry, textures, silk, panel, petal, atmosphere,petalFinish,pollen,editions],
  );
  const petalsData = useMemo(
    () => [
      [-1.81, 1.35, -0.65, 0.55, 1.1, 0.5, -0.4],
      [1.68, 1.86, -1.4, 0.35, 0.5, 1.1, 0.7],
      [1.58, -0.95, 0.3, 0.55, 0.8, -0.35, -1.1],
      [-2.12, -1.53, 1, 0.83, 1.1, 0.2, -1.2],
      [2.63, 0.52, -0.7, 0.62, 0.9, 0.1, 1.1],
      [-0.87, 2.3, -0.7, 0.31, 1.2, 0.6, 0.4],
      [2.33, -2.39, 1.25, 1.08, 0.9, 0.1, -1.4],
      [-1.69, -0.38, -0.6, 0.17, 0.5, 0.4, -0.3],
    ],
    [],
  );
  useFrame((_, dt) => {
    if (
      !product.current ||
      !cloth.current ||
      !juice.current ||
      !shell.current ||
      !label.current
    )
      return;
    const d = director.current,
      compact = d.compact;
    if (!d.reduced) clock.current += Math.min(dt, 0.075);
    const t = d.reduced ? 0 : clock.current;
    const p = Math.min(6, Math.max(0, d.progress)),
      a = Math.floor(p),
      b = Math.min(6, a + 1),
      k = T.MathUtils.smoothstep(p - a, 0, 1);

    const passage=d.passage;
    pointerTarget.set(d.reduced?0:d.pointerX,d.reduced?0:d.pointerY);pointer.lerp(pointerTarget,1-Math.exp(-Math.min(dt,.12)*5));
    const ia = scents.indexOf(editionForChapter(a,d.hero,d.formula.scent)),
      ib = scents.indexOf(editionForChapter(b,d.hero,d.formula.scent)),
      i = k < 0.5 ? ia : ib;
    const blend = (list: number[]) => T.MathUtils.lerp(list[a], list[b], k);
    const lab = blend([0, 0, 0, 0, 0, 1, 0]),
      abstract = blend([0, 1, 0, 0, 0, 0, 0]);
    const mix = d.reduced || !signal.current || p%1!==0 ? 1 : 1-Math.exp(-Math.min(dt,.12)*7);
    back.lerp(targetSky.copy(palette[ia].sky).lerp(palette[ib].sky,k),mix);
    targetSilk
      .copy(palette[ia].silk)
      .lerp(palette[ib].silk, k)
      .offsetHSL(0, 0, (d.formula.warmth - 50) * lab * 0.0011);
    silk.uniforms.uColor.value.lerp(targetSilk,mix);
    pollen.material.uniforms.uTime.value=t;pollen.material.uniforms.uTravel.value=p;
    pollen.material.uniforms.uTint.value.copy(silk.uniforms.uColor.value).lerp(palette[ia].liquid,.22);
    scene.environmentRotation.y=.12*Math.sin(t*.24)+.11*p+(d.rtl?1.12:0);
    silk.uniforms.uTime.value = t;
    silk.uniforms.uPassage.value=passage;
    silk.uniforms.uFocus.value.copy(pointer);silk.uniforms.uSide.value=d.rtl?-1:1;
    silk.uniforms.uVeil.value=T.MathUtils.lerp(silk.uniforms.uVeil.value,T.MathUtils.lerp(Number(ia===1),Number(ib===1),k),mix);
    silk.uniforms.uTide.value=T.MathUtils.lerp(silk.uniforms.uTide.value,T.MathUtils.lerp(Number(ia===2),Number(ib===2),k),mix);
    atmosphere.uniforms.uInk.value.copy(back);
    atmosphere.uniforms.uLight.value
      .copy(silk.uniforms.uColor.value)
      .multiplyScalar(0.77);
    atmosphere.uniforms.uOrigin.value = d.compact
      ? 0.54
      : 0.5 +
        (d.rtl ? -1 : 1) * blend([0.22, 0.2, 0.22, -0.21, 0.2, 0.25, 0.19]);
    atmosphere.uniforms.uTime.value = t;
    atmosphere.uniforms.uTide.value = silk.uniforms.uTide.value;
    targetJuice
      .copy(palette[ia].liquid)
      .lerp(palette[ib].liquid, k)
      .offsetHSL(
        (d.formula.warmth - 50) * lab * 0.00075,
        0,
        (60 - d.formula.intensity) * lab * 0.0018,
      );
    juice.current.color.lerp(
      targetJuice,
      d.reduced || p % 1 !== 0 ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 13),
    );
    shell.current.attenuationColor.copy(juice.current.color);
    label.current.map = textures[i];
    const veil=silk.uniforms.uVeil.value,tidal=silk.uniforms.uTide.value;
    for(const part of product.current.children){
      if(part instanceof T.Mesh && part.morphTargetInfluences){
        const edition=editions.get(part.geometry);
        if(edition){
          const settled=tidal>.999?2:veil>.999?1:tidal+veil<.001?0:-1;
          part.geometry=settled<0?edition.animated:edition.fixed[settled];
        }
        part.morphTargetInfluences[0]=veil;part.morphTargetInfluences[1]=tidal;
      }
    }
    if(metal.current){
      metal.current.color.copy(caps[0]).lerp(caps[1],veil/(1-tidal||1)).lerp(caps[2],tidal);
      metal.current.roughness=.19+.068*veil;
    }
    const mirror = d.rtl ? -1 : 1;
    const {x:center,y:py,scale:s}=frameAt(d);
    const scale=s*(1-.985*abstract);
    product.current.scale.setScalar(scale);
    product.current.position.set(center, py + scale*(.019*Math.sin(t*.54)+passage*.035),passage*(compact?.21:.54));
    product.current.rotation.set(
      0.075 + Math.sin(t * 0.29) * 0.016,
      (blend([-.33,1.29,-.48,.27,-.52,-.26,-.13])+passage*.49) * mirror +
        (d.reduced ? 0 : d.pointerX * 0.035),
      blend([-0.13, 0.19, -0.094, 0.055, -0.075, -0.04, 0]) * mirror,
    );
    cloth.current.position.set(center*.52+pointer.x*.11, (compact?-1.94:-1.49)+passage*.24+pointer.y*.08, -3.15);
    cloth.current.rotation.z =
      (compact ? .24 : blend([.23,.50,.35,-.26,.12,.23,.13])) *
      mirror;
    cloth.current.scale.set(1, 1.12, 1);
    petalFinish.color.copy(silk.uniforms.uColor.value).multiplyScalar(.79);
    if(petals.current) {
      const group=petals.current;
      group.visible=silk.uniforms.uTide.value<.995;
      group.count=compact?4:6;
      group.position.set(center,py,0);
      group.scale.setScalar(s*(1-silk.uniforms.uTide.value)*(1-lab*.38));
      const spread=1+lab*(d.formula.airiness-40)*.006;
      petalsData.forEach(([x,y,z,sz,rx,ry,rz],j)=>{
        const phase=j*2.39+p*(.53+j*.12), speed=.28+(j%4)*.064;
        const drift=d.reduced?0:1;
        petalTransform.position.set((x*spread+drift*(.24*Math.sin(t*speed+phase)+.09*Math.sin(t*.49-phase)))*mirror,
          y*spread+drift*(.22*Math.cos(t*speed*.67+phase)+.11*Math.sin(t*.32+j*2.9)),
          z+.34*Math.sin(t*speed*.5+phase)+passage*(j%2?.48:-.35));
        petalTransform.rotation.set(rx+.46*Math.sin(t*speed+phase),ry+t*speed*.59+phase*.18,rz+.33*Math.sin(t*speed*.61+phase));
        petalTransform.scale.setScalar(sz*(.62+abstract*.48+lab*(d.formula.airiness-40)*.004));
        petalTransform.updateMatrix();group.setMatrixAt(j,petalTransform.matrix);
      });
      group.instanceMatrix.needsUpdate=true;
    }
    const clothMesh=cloth.current;
    const gather=silk.uniforms.uGather.value;
    const xx=center-clothMesh.position.x,yy=py-.19*scale-clothMesh.position.y;
    gather.set((Math.cos(clothMesh.rotation.z)*xx+Math.sin(clothMesh.rotation.z)*yy)/clothMesh.scale.x,
      (-Math.sin(clothMesh.rotation.z)*xx+Math.cos(clothMesh.rotation.z)*yy)/clothMesh.scale.y);
    const orbit=passage*(compact?.29:1.40)*mirror;
    camera.position.set(orbit+pointer.x*.07,.24+passage*.48+pointer.y*.045,16-passage*(compact?.56:1.05));
    camera.lookAt(orbit*.18,.03+passage*.06,0);
    camera.rotateZ(d.roll*.043*mirror);
    if (!signal.current) {
      signal.current = true;
      requestAnimationFrame(onReady);
    }
  });
  return (
    <>
      <mesh visible={!economical} renderOrder={-10} frustumCulled={false} material={atmosphere}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <points geometry={pollen.geometry} material={pollen.material} frustumCulled={false} renderOrder={3}/>
      <ambientLight intensity={0.65} />
      <directionalLight position={[-3, 5, 5]} intensity={2.45} color="#ffdfc1" />
      <directionalLight position={[4, 2, 2]} intensity={1.65} color="#f7d4da" />
      <mesh ref={cloth} material={silk}>
        <planeGeometry args={[Math.max(8.6,worldPlaneWidth(size.width,size.height)),14,economical?164:196,economical?110:132]} />
      </mesh>
      <instancedMesh ref={petals} args={[petal,petalFinish,petalsData.length]} frustumCulled={false} />
      <group ref={product}>
        <mesh name="Juice and meniscus" args={[geometry.liquid]}>
          <meshPhysicalMaterial
            ref={juice}
            onBeforeCompile={shadeLiquid}
            roughness={0.135}
            metalness={0.19}
            clearcoat={1}
            ior={1.34}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.49, 16]} />
          <meshPhysicalMaterial
            color="#c4a395"
            metalness={0.52}
            roughness={0.2}
          />
        </mesh>
        <mesh name="Fluted optical glass" args={[geometry.glass]}>
          <meshPhysicalMaterial
            ref={shell}
            key={economical ? "reflective" : "transmissive"}
            color={economical ? "#dcc9bf" : "#ffebe1"}
            {...(economical ? { onBeforeCompile: shadeReflectiveGlass } : {})}
            transparent={economical}
            depthWrite={!economical}
            metalness={economical ? 0.83 : 0}
            transmission={economical ? 0 : 1}
            thickness={0.52}
            ior={1.51}
            roughness={0.095}
            attenuationDistance={1.95}
            clearcoat={1}
            envMapIntensity={1.13}
          />
        </mesh>
        <mesh geometry={geometry.collar}>
          <meshStandardMaterial
            color="#b89b72"
            metalness={0.96}
            roughness={0.19}
          />
        </mesh>
        <mesh args={[geometry.cap]}>
          <meshPhysicalMaterial
            ref={metal}
            color="#bd877a"
            roughness={0.19}
            metalness={0.98}
            clearcoat={0.25}
          />
        </mesh>
        {[geometry.band, geometry.top].map((g, i) => (
          <mesh geometry={g} key={i}>
            <meshStandardMaterial
              color="#d1b59e"
              metalness={0.98}
              roughness={0.19}
            />
          </mesh>
        ))}
        <mesh args={[panel]} position-y={-0.21} renderOrder={4}>
          <meshBasicMaterial
            ref={label}
            map={textures[0]}
            color="#ffffff"
            transparent depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <WorldObjects director={director} />
    </>
  );
}
// Integrated graphics keep up to 1.25x density so scaled laptop displays (125%)
// are not upscaled from a 1x buffer. Sustained slow frames step down to the
// display's CSS pixel grid first, and below it only on 1x displays.
function reducedDensity(){return devicePixelRatio>1?1:.9;}
function worldPlaneWidth(width:number,height:number){return 9.1*(width/height)+4.6;}
function loopMode(){return document.hidden?"never":matchMedia("(prefers-reduced-motion: reduce)").matches?"demand":"always";}
function subscribeMode(notify:()=>void){
 const motion=matchMedia("(prefers-reduced-motion: reduce)");
 document.addEventListener("visibilitychange",notify);motion.addEventListener("change",notify);
 return()=>{document.removeEventListener("visibilitychange",notify);motion.removeEventListener("change",notify);};
}
export default function Stage(props: StageProps) {
  const mode=useSyncExternalStore(subscribeMode,loopMode,()=>"demand" as const);
  const [economical, setEconomical] = useState(false);
  const [lowerResolution, setLowerResolution] = useState(false);
  const [cssDensity, setCssDensity] = useState(false);
  const lowerCost = useCallback((lower:boolean) => {
    if(lower)setEconomical(true);
    setLowerResolution(lower);
  }, []);
  const settleDensity = useCallback(() => setCssDensity(true), []);
  return (
    <div className="stage" aria-hidden="true">
      <Boundary onFail={props.onFail}>
        <Canvas
          frameloop={mode}
          camera={{ fov: 2*Math.atan(.2)*180/Math.PI, position: [0,.24,16], near:.12, far:70 }}
          dpr={lowerResolution ? reducedDensity() : economical ? (cssDensity ? 1 : [1, 1.25]) : [1, 1.5]}
          onCreated={({ gl }) => {
            const context = gl.getContext(),
              ext = context.getExtension("WEBGL_debug_renderer_info");
            const renderer = ext
              ? String(context.getParameter(ext.UNMASKED_RENDERER_WEBGL))
              : "";
            if (
              /swiftshader|llvmpipe|Intel.*(?:UHD|HD Graphics)|Microsoft Basic Render/i.test(
                renderer,
              )
            )
              setEconomical(true);
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >

          <FrameClock director={props.director} lowerCost={lowerCost} economical={economical && !cssDensity} settleDensity={settleDensity} />
          <Suspense fallback={null}>
            <Set {...props} economical={economical} />
          </Suspense>
        </Canvas>
      </Boundary>
    </div>
  );
}
function makePollen(){
 const geometry=new T.BufferGeometry(),coordinates=new Float32Array(84*3);
 let seed=1883;const unit=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<coordinates.length;i+=3){coordinates[i]=(unit()-.5)*16;coordinates[i+1]=(unit()-.5)*7.8;coordinates[i+2]=-2.3+unit()*4.3;}
 geometry.setAttribute("position",new T.BufferAttribute(coordinates,3));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uTravel:{value:0},uTint:{value:new T.Color()}},
 vertexShader:`uniform float uTime,uTravel;varying float vAlpha;
 void main(){vec3 p=position;float h=fract(sin(dot(p,vec3(31.6,21.1,7.9)))*43758.5);
 p.x+=.29*sin(uTime*(.08+h*.12)+p.y+uTravel*.73);p.y+=.28*cos(uTime*.16+p.x+uTravel*.48);
 vAlpha=(.15+.43*h)*(.66+.34*sin(uTime*.4+h*25.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=1.+h*h*2.4;}`,
 fragmentShader:`uniform vec3 uTint;varying float vAlpha;void main(){float a=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(mix(vec3(.9,.75,.64),uTint,.18),a*a*vAlpha);}`});
 return {geometry,material};
}
function FrameClock({director,lowerCost,economical,settleDensity}:{director:RefObject<Direction>;lowerCost:(lower:boolean)=>void;economical:boolean;settleDensity:()=>void}) {
  const {invalidate}=useThree();
  const sample=useRef({frames:0,seconds:0,slowWindows:0,fastWindows:0,denseWindows:0,lowered:false});
  useEffect(()=>{
    const query=matchMedia("(prefers-reduced-motion: reduce)");
    let scheduled=0;
    const wake=()=>{if(!query.matches||document.hidden)return;cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(invalidate.bind(null,1));};
    const sync=()=>{sample.current.frames=0;sample.current.seconds=0;
      invalidate();};
    query.addEventListener("change",sync);document.addEventListener("visibilitychange",sync);
    const events=["input","click","scroll","resize","keydown","sensora:frame"] as const;
    events.forEach(evt=>window.addEventListener(evt,wake,{passive:true}));sync();
    return()=>{cancelAnimationFrame(scheduled);query.removeEventListener("change",sync);document.removeEventListener("visibilitychange",sync);
      events.forEach(evt=>window.removeEventListener(evt,wake));};
  },[invalidate]);
  useFrame((_,dt)=>{
    const v=sample.current;if(director.current.reduced||document.hidden||dt<=0||dt>.5)return;
    v.frames++;v.seconds+=dt;
    if(v.seconds<1.2)return;
    const fps=v.frames/v.seconds;
    // First tier, integrated graphics on scaled displays: if the 1.25x buffer
    // cannot hold 45 fps, settle on the CSS pixel grid for the session. A
    // one-way step avoids visible resolution changes while browsing.
    if(economical&&devicePixelRatio>1){
      v.denseWindows=fps<45?v.denseWindows+1:0;
      if(v.denseWindows>=2){v.denseWindows=0;v.slowWindows=0;settleDensity();return;}
    }
    v.slowWindows=fps<35?v.slowWindows+1:0;
    v.fastWindows=fps>55?v.fastWindows+1:0;
    v.frames=0;v.seconds=0;
    if(!v.lowered&&v.slowWindows>=3){v.lowered=true;v.fastWindows=0;lowerCost(true);}
    if(v.lowered&&v.fastWindows>=7){v.lowered=false;v.slowWindows=0;lowerCost(false);}
  });
  return null;
}

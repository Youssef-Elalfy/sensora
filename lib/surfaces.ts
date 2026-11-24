import * as T from "three";
export function studioTexture(gl: T.WebGLRenderer) {
  // Light cards painted in linear radiance surround the product, including narrow kicker strips.
  const width = 384,
    height = 192,
    data = new Float32Array(width * height * 4);
  const cards = [
    [0.15, 0.49, 0.063, 0.27, 2.7, 2.25, 1.98],
    [0.61, 0.34, 0.105, 0.245, 2.65, 2.87, 3.00],
    [0.82, 0.55, 0.027, 0.19, 3.0, 1.73, 1.02],
    [0.34, 0.69, 0.022, 0.16, 2.5, 1.55, 1.16],
    [0.45, 0.18, 0.21, 0.065, 3, 2.6, 2.5],
  ];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / width,
        v = y / height,
        i = 4 * (y * width + x);
      let r = 0.15,
        g = 0.115,
        b = 0.113;
      for (const [cx, cy, rx, ry, cr, cg, cb] of cards) {
        const dx = Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx)) / rx,
          dy = Math.abs(v - cy) / ry;
        const l = Math.exp(-Math.pow(dx, 5) - Math.pow(dy, 4));
        r += l * cr;
        g += l * cg;
        b += l * cb;
      }
      data.set([r, g, b, 1], i);
    }
  const source = new T.DataTexture(
    data,
    width,
    height,
    T.RGBAFormat,
    T.FloatType,
  );
  source.mapping = T.EquirectangularReflectionMapping;
  source.needsUpdate = true;
  const generator = new T.PMREMGenerator(gl),
    result = generator.fromEquirectangular(source);
  source.dispose();
  generator.dispose();
  return result;
}
// Optical density grows through the deeper centre of the tinted liquid.
export function shadeLiquid(
  shader: Parameters<T.MeshPhysicalMaterial["onBeforeCompile"]>[0],
) {
  shader.vertexShader =
    "varying vec3 vLiquid;\n" +
    shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvLiquid=position;",
    );
  shader.fragmentShader =
    "varying vec3 vLiquid;\n" +
    shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
 float opticalPath = sqrt(max(0.02,1.-pow(min(1.,abs(vLiquid.x)/.91),3.)));
 vec3 absorption=-log(max(diffuseColor.rgb,vec3(.008)));
 float heel=smoothstep(-1.12,-.63,vLiquid.y);float edge=exp(-pow(abs(vLiquid.x+.62)*5.,2.));
 diffuseColor.rgb=exp(-absorption*(.65+.85*opticalPath))*(.34+.38*heel+.22*smoothstep(-.86,.51,vLiquid.y)+.17*edge);
 float pool=exp(-pow(abs(vLiquid.y+.91+.05*sin(vLiquid.x*2.8))*8.,2.));
 diffuseColor.rgb+=sqrt(diffuseColor.rgb)*(.16*pool+.09*edge)+vec3(.10,.057,.029)*exp(-abs(vLiquid.y-.538)*155.);`,
    );
}
// On constrained GPUs the fluted shell blends its studio reflection over the
// visible liquid using Fresnel incidence instead of rendering a second scene.
export function shadeReflectiveGlass(
  shader: Parameters<T.MeshPhysicalMaterial["onBeforeCompile"]>[0],
) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <opaque_fragment>",
    `
 float incidence=clamp(dot(normal,normalize(vViewPosition)),0.,1.);
 float fresnel=.045+.955*pow(1.-incidence,5.);
 float lightCard=dot(outgoingLight,vec3(.2126,.7152,.0722));
 diffuseColor.a=clamp(.045+fresnel*.82+smoothstep(.37,2.7,lightCard)*.61,.045,.92);
 #include <opaque_fragment>`,
  );
}
export function stoneFinish(
  shader: Parameters<T.MeshStandardMaterial["onBeforeCompile"]>[0],
) {
  shader.vertexShader =
    "varying vec3 vStone;\n" +
    shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvStone=position;",
    );
  shader.fragmentShader =
    "varying vec3 vStone;\n" +
    shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
 float line=vStone.x*7.+vStone.z*4.+vStone.y*10.+sin(vStone.x*8.+vStone.z*3.)*.7+sin(vStone.z*17.+vStone.x*5.)*.13;
 // Fine marble veining over a nearly even ground. Broad tonal bands read as stripes.
 float drift=sin(vStone.x*2.3-vStone.z*3.1+sin(vStone.y*6.+vStone.x*1.7))*.5+.5;
 float vein=pow(.5+.5*cos(line*.38),160.)+.4*pow(.5+.5*cos(line*.61+2.3),220.);
 diffuseColor.rgb=diffuseColor.rgb*(.9+.1*drift)+vec3(.075,.052,.047)*vein;
 float contact=exp(-pow(abs(vStone.x/.89),4.)-pow(abs(vStone.z/.43),4.));
 diffuseColor.rgb*=1.-.66*contact*smoothstep(.12,.24,vStone.y);`,
    );
}
export function silkMaterial() {
  return new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: {
      uColor:{value:new T.Color("#8e1538")},uTime:{value:0},uTide:{value:0},uVeil:{value:0},
      uPassage:{value:0},uFocus:{value:new T.Vector2()},uGather:{value:new T.Vector2()},uSide:{value:1}
    },
    vertexShader: `
      uniform float uTime,uTide,uVeil,uPassage,uSide;
      uniform vec2 uFocus,uGather;
      varying vec3 vNormal,vPosition; varying float vFold;
      float heightAt(vec2 q) {
        q-=uGather;
        q.x*=uSide;
        float t=uTime;
        vec2 offset=q-vec2(.19,-.32);
        float rr=length(offset*vec2(.83,1.));
        float twist=2.32*exp(-rr*.35)+.20*sin(t*.18+rr*.61);
        q=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*offset;
        q+=.36*vec2(sin(q.y*.91+t*.22),cos(q.x*.77-t*.19));
        float pressure=1.+uPassage*.43;
        if(uTide>.999)return (.53*sin(q.y*1.68+q.x*.65-t*.51+.7*sin(q.x*.54+t*.18))+.19*cos(q.x*.88-q.y*2.01+t*.43))*pressure;
        if(uVeil>.999)return (.42*cos(q.y*1.7+1.42*sin(q.x*.54-t*.17)+t*.27)+.24*sin(q.x*.6+q.y*2.05-t*.21))*pressure;
        float curl=.94*sin(q.x*.57+q.y*.23-t*.145)+.46*sin(q.x*.24-q.y*.68+t*.21);
        float pleat=q.y*2.28+q.x*.58+curl*2.05+.50*sin(q.x*.94-q.y*.19+t*.155);
        float roll=.61*sin(pleat-t*.32)+.19*sin(pleat*1.92-t*.52+.7)+.10*cos(q.x*.97+q.y*2.8+t*.23);
        float drape=roll+.42*sin(q.x*.41-q.y*.76+t*.12)+.07*sin(pleat*2.72+.6*sin(q.x*.42)-t*.76);
        drape=drape*(.65+.42*smoothstep(.7,4.1,rr))-.54*exp(-rr*.65);
        if(uVeil+uTide<.001)return drape*pressure;
        float gauze=.42*cos(q.y*1.7+1.42*sin(q.x*.54-t*.17)+t*.27)+.24*sin(q.x*.6+q.y*2.05-t*.21);
        float swell=.53*sin(q.y*1.68+q.x*.65-t*.51+.7*sin(q.x*.54+t*.18))+.19*cos(q.x*.88-q.y*2.01+t*.43);
        return mix(mix(drape,gauze,uVeil),swell,uTide)*(1.+uPassage*.43);
      }
      void main(){
        vec2 q=position.xy + uFocus*vec2(.19,.12);
        float h=heightAt(q);
        vec2 slope=vec2(heightAt(q+vec2(.025,0.))-h,heightAt(q+vec2(0.,.025))-h)/.025;
        vNormal=normalMatrix*vec3(-slope,1.);
        vPosition=vec3(q,h);vFold=h;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position.xy,h,1.);
      }`,
    fragmentShader:`
      uniform vec3 uColor; uniform float uTime,uTide,uVeil,uPassage,uSide;uniform vec2 uFocus,uGather;
      varying vec3 vNormal,vPosition;varying float vFold;
      void main(){
        vec3 n=normalize(vNormal);
        vec3 light=normalize(vec3((-.62+.19*sin(uTime*.17))*uSide+uFocus.x*.12,.84+.17*cos(uTime*.21),.52));
        vec3 halfLight=normalize(light+vec3(0.,0.,1.));
        float diffuse=max(0.,dot(n,light));
        float sheen=pow(max(0.,dot(n,halfLight)),mix(mix(22.,8.,uVeil),31.,uTide));
        float ridge=pow(max(0.,dot(n,normalize(vec3(.30*uSide,-.83,.59)))),19.);
        float lit=smoothstep(-1.1,1.15,vFold+.26*diffuse);
        float beam=.55+.45*smoothstep(-1.,1.,cos(vPosition.x*.60+vPosition.y*.27-uTime*.19));
        vec3 silkLight=mix(vec3(.78,.19,.23),vec3(.86,.77,.88),uVeil);
        silkLight=mix(silkLight,vec3(.37,.77,.69),uTide);
        float shade=mix(.32,1.,max(uVeil,uTide));
        vec3 base=uColor*((.012+.13*shade)+diffuse*(.18+.50*shade)+lit*diffuse*.46);
        float grazing=pow(1.-max(0.,n.z),2.5);
        float thread=pow(max(0.,dot(n,halfLight)),74.);
        vec3 col=base+silkLight*(sheen*(.14+.53*beam)+ridge*.15)*(lit*.74+.26)
             +mix(vec3(.92,.58,.49),silkLight,max(uVeil,uTide))*thread*.31+uColor*grazing*.16;
        col*=.68+.32*smoothstep(-.57,.7,vFold);
        if(uTide>.001){float caustic=pow(.5+.5*cos(vPosition.x*3.2+2.4*sin(vPosition.y*3.9+uTime*.43)+vFold*3.),15.);
        col+=uTide*caustic*vec3(.055,.12,.105)*diffuse;}
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
        gl_FragColor.rgb+=(dither-.5)/255.;
      }`
  });
}

export function petalGeometry() {
  // A tapered claw fans into lobed shoulders with a shallow apical notch and a rolled rim.
  const g=new T.PlaneGeometry(1,1,16,13),p=g.attributes.position,uv=g.attributes.uv,colors:number[]=[];
  for(let i=0;i<p.count;i++){
    const u=uv.getX(i)*2-1,v=uv.getY(i);
    const width=.045+.91*Math.pow(Math.sin(Math.PI*v*.86),.72);
    const rim=Math.pow(Math.abs(u),3.6);
    const x=.52*u*width+.065*v*v;
    const y=v-.48-.134*u*u*v+.09*Math.cos(u*3.7)*v**4-.095*Math.exp(-u*u*21)*v**5;
    const vein=.5+.5*Math.cos(25*u/(.65+v)+2.8*v+Math.sin(7*v)*.35);
    const z=.24*u*u*(.5+v)+.145*Math.sin(v*4.4)+.15*u*v+.047*Math.sin(8*v+u)*rim+.013*vein*v;
    p.setXYZ(i,x,y,z);
    const pigment=.37+.46*v+.20*rim-.115*Math.pow(vein,5);
    colors.push(pigment,pigment*(.57+.37*v),pigment*(.70+.22*v));
  }
  g.setAttribute("color",new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

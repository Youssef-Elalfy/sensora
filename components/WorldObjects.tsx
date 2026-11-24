import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {frameAt} from "@/lib/framing";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei/core/RoundedBox";
import * as T from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colors, scents, type Direction } from "@/lib/scents";
import { petalGeometry, stoneFinish } from "@/lib/surfaces";

function loopGeometry() {
  const points = Array.from({ length: 161 }, (_, i) => {
    const a = (i / 160) * Math.PI * 2;
    return new T.Vector3(
      Math.cos(a) * (1.12 + 0.41 * Math.cos(3 * a)),
      Math.sin(a) * (1.08 + 0.33 * Math.cos(3 * a)),
      0.64 * Math.sin(3 * a),
    );
  });
  const curve = new T.CatmullRomCurve3(points.slice(0, -1), true);
  return new T.TubeGeometry(curve, 180, 0.195, 18, true);
}
function ribbonGeometry() {
  const g = new T.PlaneGeometry(1, 1, 110, 12),
    uv = g.attributes.uv,
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i),
      v = uv.getY(i) - 0.5,
      a = u * Math.PI * 2.55 - 0.7,
      rad = 1.54 + 0.16 * Math.sin(a * 3) + v * 0.48;
    p.setXYZ(
      i,
      Math.cos(a) * rad,
      (u - 0.5) * 2.8 + v * 0.24 + 0.18 * Math.sin(a * 2.1),
      Math.sin(a) * rad * 0.61 + v * 0.42 * Math.sin(a),
    );
  }
  g.computeVertexNormals();
  return g;
}
// Polished sea-worn minerals. The icosphere is welded before its normals are
// computed so the surface shades smoothly instead of as flat facets.
function stoneGeometry(detail: number) {
  const source = new T.IcosahedronGeometry(1, detail);
  source.deleteAttribute("normal");
  source.deleteAttribute("uv");
  const g = mergeVertices(source),
    p = g.attributes.position;
  source.dispose();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      v = 1 + 0.075 * Math.sin(2.3 * x + 1.1 * y + 0.4) * Math.cos(1.9 * z - 0.6 * y) + 0.022 * Math.sin(4.1 * z + 2.7 * x);
    p.setXYZ(i, x * v, y * v * 0.71, z * v * 0.88);
  }
  g.computeVertexNormals();
  return g;
}
export default function WorldObjects({
  director,
}: {
  director: RefObject<Direction>;
}) {
  const abstract = useRef<T.Group>(null),
    pearls = useRef<T.Group>(null),
    tide = useRef<T.Group>(null),
    base = useRef<T.Group>(null),
    ember = useRef<T.Group>(null);
  const loop = useMemo(() => loopGeometry(), []),
    ribbon = useMemo(() => ribbonGeometry(), []),
    stone = useMemo(() => stoneGeometry(7), []),
    petal = useMemo(() => petalGeometry(), []);
  const beads=useRef<T.InstancedMesh>(null),beadPose=useMemo(()=>new T.Object3D(),[]);
  const knots = useRef<T.MeshPhysicalMaterial>(null),
    time = useRef(0);
  useFrame((_, dt) => {
    const d = director.current,
      p = d.progress,
      lab = Math.max(0, 1 - Math.abs(p - 5)),
      s = d.formula.scent,
      mirror = d.rtl ? -1 : 1;
    const weight = (i: number) =>
      T.MathUtils.smoothstep(1 - Math.abs(p - i), 0, 1);
    const {x,y,scale:sm}=frameAt(d);
    const t = d.reduced ? 0 : (time.current += Math.min(dt, 0.07));
    const update = (
      g: T.Group | null,
      fade: number,
      sc: number,
      xx: number,
      yy: number,
      zz: number,
    ) => {
      if (!g) return;
      g.visible = fade > 0.012;
      if (g.visible) {
        g.scale.setScalar(sc * fade);
        g.position.set(xx, yy, zz);
      }
    };
    update(abstract.current, weight(1), sm * 1.22, x, y, 0.18);
    if (abstract.current) {
      abstract.current.rotation.set(
        0.35 + d.pointerY * (d.reduced ? 0 : 0.09),
        0.4 + t * 0.1 + d.pointerX * (d.reduced ? 0 : 0.25),
        -0.23,
      );
    }
    if (knots.current)
      knots.current.color.set(colors[scents[d.note < 0 ? 0 : d.note]].glow);
    const noteLift = d.note < 0 ? 0 : (d.note + 1) * 0.09;
    update(
      pearls.current,
      Math.min(1, weight(3) + lab * Number(s === "veil")),
      sm * (1 + noteLift),
      x,
      y,
      -0.23,
    );
    if(pearls.current?.visible && beads.current){
      for(let i=0;i<12;i++){
        const a=i*.53+.09*Math.sin(t*.23+i), r=1.53+.22*Math.sin(i*1.63);
        beadPose.position.set(Math.cos(a)*r,Math.sin(a)*r+.12*Math.cos(t*.31+i*2.1),Math.sin(a*2+t*.21)*.48);
        beadPose.scale.setScalar(.068+.16*(.5+.5*Math.sin(i*2.23)));beadPose.updateMatrix();
        beads.current.setMatrixAt(i,beadPose.matrix);
      }
      beads.current.instanceMatrix.needsUpdate=true;
    }
    update(
      tide.current,
      Math.min(1, weight(4) + lab * Number(s === "tidal")),
      sm * (1 + noteLift),
      x,
      y,
      -1.27,
    );
    if (tide.current)
      tide.current.rotation.set(.09*Math.sin(t*.24),.30+Math.sin(t*.29)*.26,.06*Math.sin(t*.2+d.passage));
    update(
      ember.current,
      Math.min(1, weight(2) + lab * Number(s === "ember")),
      sm * .79 * (1 + noteLift),
      x - 1.02 * sm * mirror,
      y - 0.98 * sm,
      -0.26,
    );
    update(
      base.current,
      weight(6),
      sm * 1.12,
      x,
      y - 1.28 * sm - 0.18 * sm,
      0,
    );
  });
  return (
    <>
      <group ref={abstract} visible={false}>
        <mesh geometry={loop}>
          <meshPhysicalMaterial
            ref={knots}
            metalness={0.48}
            roughness={0.17}
            clearcoat={1}
            iridescence={0.65}
            iridescenceIOR={1.4}
          />
        </mesh>
      </group>
      <group ref={pearls} visible={false}>
        <instancedMesh ref={beads} args={[undefined,undefined,12]} frustumCulled={false}>
          <sphereGeometry args={[1,28,20]}/>
          <meshPhysicalMaterial color="#ded2df" roughness={.19} metalness={.24} clearcoat={.94} iridescence={.68} iridescenceIOR={1.32}/>
        </instancedMesh>
      </group>
      <group ref={tide} visible={false}>
        <mesh geometry={ribbon}>
          <meshPhysicalMaterial
            color="#94dace"
            metalness={0.33}
            roughness={0.13}
            clearcoat={1}
            side={T.DoubleSide}
            transparent
            opacity={0.42}
          />
        </mesh>
        {[
          [-1.4, -1.2, 0.41, 0.44],
          [1.45, 0.84, -0.22, 0.29],
          [1.14, -1.47, 0.2, 0.53],
        ].map(([x, y, z, s], i) => (
          <mesh
            key={i}
            geometry={stone}
            position={[x, y, z]}
            rotation={[i, 0.6, i * 0.4]}
            scale={s}
          >
            <meshPhysicalMaterial
              color="#5f938b"
              roughness={0.38}
              metalness={0.06}
              clearcoat={0.85}
              clearcoatRoughness={0.22}
              sheen={0.35}
              sheenColor="#a9dcd2"
            />
          </mesh>
        ))}
      </group>
      <group ref={ember} visible={false}>
        <Rose geometry={petal} />
      </group>
      <group ref={base} visible={false}>
        <RoundedBox
          args={[2.64, 0.54, 1.47]}
          radius={0.11}
          smoothness={3}
          rotation={[0.04, -0.24, 0]}
        >
          <meshStandardMaterial
            color="#34242d"
            onBeforeCompile={stoneFinish}
            roughness={0.42}
            metalness={0.12}
          />
        </RoundedBox>
      </group>
    </>
  );
}
function Rose({ geometry }: { geometry: T.BufferGeometry }) {
  const mesh = useRef<T.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new T.Object3D(),
      color = new T.Color();
    for (let i = 0; i < 29; i++) {
      const a = i * 2.4,
        r = 0.07 + (0.45 * i) / 28;
      transform.position.set(r * Math.cos(a), r * Math.sin(a), 0.2 - i * 0.016);
      transform.rotation.set(-1.19+.79*i/28,.10*Math.sin(a*2.1),a-Math.PI/2,"ZXY");
      transform.scale.set(0.46 + i * 0.014, 0.54 + i * 0.016, 0.56);
      transform.updateMatrix();
      mesh.current.setMatrixAt(i, transform.matrix);
      mesh.current.setColorAt(i, color.set(i % 3 ? "#64182e" : "#8f223b"));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, 29]}>
      <meshPhysicalMaterial
        roughness={0.64}
        vertexColors
        side={T.DoubleSide}
        sheen={0.55}
        sheenColor="#773348"
      />
    </instancedMesh>
  );
}

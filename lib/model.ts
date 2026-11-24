import * as T from "three";
import { scents, type Scent } from "./scents";

type Section = readonly [y: number, width: number, depth: number];
const shell: Section[] = [
  [-1.28, 0.72, 0.32],
  [-1.275, 0.84, 0.39],
  [-1.25, 0.93, 0.44],
  [-1.2, 0.98, 0.48],
  [-1.12, 1, 0.5],
  [-1.02, 1.005, 0.51],
  [-0.75, 1.01, 0.512],
  [-0.3, 1.014, 0.514],
  [0.28, 1.014, 0.513],
  [0.57, 1.005, 0.508],
  [0.66, 0.995, 0.501],
  [0.72, 0.975, 0.493],
  [0.775, 0.935, 0.472],
  [0.82, 0.87, 0.45],
  [0.857, 0.76, 0.409],
  [0.892, 0.59, 0.352],
  [0.928, 0.39, 0.282],
  [0.963, 0.303, 0.242],
  [1.02, 0.29, 0.238],
];
// Edition morphs bend the body width along its height. Resample long straight
// spans so those curves stay smooth instead of resolving into visible facets.
function densify(rows: readonly Section[], step = 0.075): Section[] {
  const out: Section[] = [rows[0]];
  for (let j = 1; j < rows.length; j++) {
    const [y0, w0, d0] = rows[j - 1],
      [y1, w1, d1] = rows[j],
      n = Math.ceil(Math.abs(y1 - y0) / step);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([y0 + (y1 - y0) * t, w0 + (w1 - w0) * t, d0 + (d1 - d0) * t]);
    }
  }
  return out;
}
function signed(v: number, p: number) {
  return Math.sign(v) * Math.pow(Math.abs(v), p);
}
// Horizontal sections follow a flattened superellipse. Flutes disappear into the shoulder.
export function vessel(
  rows: readonly Section[],
  fluting = 0,
  sides = 160,
  power = 0.63,
  cuts = 32,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (const [y, w, d] of rows)
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        x = signed(Math.cos(a), power),
        z = signed(Math.sin(a), power);
      const groove =
        1 +
        fluting *
          (0.5 + 0.5 * Math.cos(cuts * a)) *
          (y > 1.1 ? 1 : T.MathUtils.smoothstep(Math.abs(x), 0.56, 0.94) * (1 - T.MathUtils.smoothstep(y, 0.57, 0.94)));
      vertices.push(w * x * groove + 0.012 * y * y, y, d * z * groove);
    }
  for (let j = 1; j < rows.length; j++)
    for (let i = 0; i < sides; i++) {
      const a = (j - 1) * sides + i,
        b = (j - 1) * sides + ((i + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, c, b, b, c, d);
    }
  for (const [ring, reverse] of [
    [0, false],
    [rows.length - 1, true],
  ] as const) {
    const center = vertices.length / 3;
    vertices.push(0.012 * rows[ring][0] ** 2, rows[ring][0], 0);
    for (let i = 0; i < sides; i++) {
      const a = ring * sides + i,
        b = ring * sides + ((i + 1) % sides);
      indices.push(center, reverse ? b : a, reverse ? a : b);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
// Each edition shares ring topology so the outer glass and its contents can change
// silhouette together, including their normals, without rebuilding a scene.
function shapeEditions(g:T.BufferGeometry,part:"glass"|"cap"|"label"){
  const positions=g.attributes.position;
  const variants=scents.map(scent=>{
    const form=g.clone(),p=form.attributes.position;
    for(let i=0;i<p.count;i++){
      let x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      if(part==="cap"){
        const h=T.MathUtils.clamp((y-1.13)/.59,0,1);
        const angle=Math.atan2(z/.34,x/.48);
        const lobe=Math.cos(3*angle-.5);
        if(scent==="ember"){
          const waist=.57+.96*T.MathUtils.smoothstep(h,0,.91);
          x=x*waist+.105*h;z*=.72+.45*h;
          y+=h*(.098*Math.sin(angle+.35)+.051*lobe)*Math.min(1,Math.hypot(x,z)*2.5);
        }else if(scent==="veil"){
          const curve=.59+.94*Math.pow(Math.sin(Math.PI*(.055+.9*h)),.65);
          x=x*curve+.10*h;z*=curve;
          y=y-.04+.10*h*(1-Math.min(1,Math.hypot(x/.72,z/.52)))+.075*h*Math.sin(angle)*Math.min(1,Math.hypot(x,z)*3);
        }else{
          const cut=1-.105*Math.abs(Math.sin(3*angle));
          x=x*(.76+.49*Math.sin(h*2.4))*cut-.11*h;z*=cut*(1+.22*h);
          y+=h*.14*x;
        }
      }else{
        const level=part==="label"?y-.21:y;
        const u=T.MathUtils.clamp((level+1.28)/2.3,0,1);
        const neck=1-T.MathUtils.smoothstep(level,.63,.98);
        const width=scent==="ember"?.79+.24*Math.sin(u*1.84):scent==="veil"?.70+.34*Math.sin(u*Math.PI):.88+.09*u;
        x=x*T.MathUtils.lerp(1,width,neck)+(scent==="tidal"?-.09:.045)*Math.sin(u*Math.PI)*neck;
        z*=1+(scent==="veil"?.115:scent==="ember"?.045:-.03)*Math.sin(u*Math.PI)*neck;
      }
      p.setXYZ(i,x,y,z);
    }
    form.computeVertexNormals();
    return form;
  });
  g.setAttribute("position",variants[0].getAttribute("position"));
  g.setAttribute("normal",variants[0].getAttribute("normal"));
  g.morphAttributes.position=variants.slice(1).map(v=>v.getAttribute("position"));
  g.morphAttributes.normal=variants.slice(1).map(v=>v.getAttribute("normal"));
  g.computeBoundingSphere();return g;
}
export function bottleGeometry() {
  const cavity: Section[] = [
    [-1.09, 0.79, 0.348],
    [-1.065, 0.859, 0.39],
    [-0.99, 0.899, 0.416],
    [0.58, 0.908, 0.427],
    [0.706, 0.879, 0.412],
    [0.77, 0.775, 0.38],
    [0.862, 0.37, 0.224],
    [0.965, 0.24, 0.17],
    [1.02, 0.236, 0.165],
  ];
  // A continuous inward return makes the heavy optical heel and the shoulder lip visible.
  const glass = vessel([...densify(shell), ...densify([...cavity].reverse())], 0.0062, 192);
  const liquid = vessel(
    densify([
      [-1.072, 0.78, 0.346],
      [-1.045, 0.848, 0.38],
      [-0.977, 0.894, 0.406],
      [0.49, 0.898, 0.415],
      [0.548, 0.895, 0.413],
      [0.557, 0.891, 0.408],
      [0.546, 0.84, 0.389],
      [0.538, 0.68, 0.31],
      [0.537, 0.04, 0.02],
    ]),
    0.002,
  );
  const cap = vessel(
    [
      [1.132, 0.385, 0.295],
      [1.145, 0.449, 0.322],
      [1.172, 0.474, 0.34],
      [1.205, 0.484, 0.347],
      [1.25, .471, .344],
      [1.31, .469, .348],
      [1.37, .472, .352],
      [1.43, .481, .358],
      [1.49, .49, .364],
      [1.55, .50, .361],
      [1.60, .50, .355],
      [1.635, 0.491, 0.35],
      [1.671, 0.476, 0.34],
      [1.695, 0.456, 0.326],
      [1.704, 0.41, 0.299],
    ],
    0.0015,
    160,
    0.90,
    16,
  );
  const collar = vessel([
    [0.927, 0.32, 0.264],
    [0.941, 0.342, 0.28],
    [0.963, 0.347, 0.282],
    [0.978, 0.328, 0.274],
    [1.099, 0.328, 0.274],
    [1.115, 0.348, 0.286],
    [1.132, 0.348, 0.286],
    [1.144, 0.32, 0.265],
  ]);
  const band = vessel([
    [1.199, 0.484, 0.349],
    [1.205, 0.49, 0.354],
    [1.222, 0.49, 0.354],
    [1.228, 0.485, 0.349],
  ]);
  const top = vessel(
    [
      [1.699, 0.424, 0.308],
      [1.707, 0.432, 0.314],
      [1.716, 0.422, 0.304],
    ],
    0,
  );
  // Two fine machined rings on the atomizer collar frame the sculpted stopper.
  band.scale(.698,1,.78);band.translate(0,-.174,0);
  top.scale(.78,1,.88);top.translate(0,-.602,0);
  return {glass:shapeEditions(glass,"glass"),liquid:shapeEditions(liquid,"glass"),cap:shapeEditions(cap,"cap"),collar,band,top};
}
export function labelTexture(scent: Scent) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 688;
  const c = canvas.getContext("2d");
  if (!c) throw Error("Label surface unavailable");
  // Screen-printed enamel leaves the glass and the liquid visible around the typography.
  // Veil prints dark ink on a pale liquid. A light halo there washes the fine
  // lines into the lilac, so only the light inks keep their soft drop shadow.
  const ink=scent==="ember"?"#ffdfaa":scent==="veil"?"#1c0a1e":"#ecffff";
  c.strokeStyle=ink;c.lineWidth=3.5;
  c.textAlign = "center";
  c.fillStyle = ink;
  c.shadowColor=scent==="veil"?"transparent":"#401d21";c.shadowBlur=scent==="veil"?0:2;
  function letters(s: string, y: number, font: string, space: number) {
    if (!c) return;
    c.font = font;
    const widths = [...s].map((k) => c.measureText(k).width);
    let x =
      (768 - widths.reduce((a, b) => a + b, 0) - space * (s.length - 1)) / 2;
    [...s].forEach((k, i) => {
      c.fillText(k, x + widths[i] / 2, y);
      x += widths[i] + space;
    });
  }
  letters("SENSORA", 249, "bold 61px Georgia", 8);
  c.save();
  c.translate(384, 128);
  for (let j = 0; j < 8; j++) {
    c.rotate(Math.PI / 4);
    c.beginPath();
    c.ellipse(0, -14, 10, 24, 0, 0, 2 * Math.PI);
    c.stroke();
  }
  c.restore();
  const name = scent.charAt(0).toUpperCase()+scent.slice(1);
  letters(name, 381, "italic 124px Georgia", 0);
  c.fillRect(348, 416, 72, 3);
  letters(
    "Nº 0" + (scents.indexOf(scent) + 1) + "   /   ATELIER DE SENS",
    475,
    "bold 21px Arial",
    3,
  );
  letters("EXTRAIT DE PARFUM", 551, "bold 21px Arial", 3);
  letters("50 ML   ·   1.7 FL.OZ.", 602, "17px Arial", 2);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
export function labelPanel() {
  const g = new T.PlaneGeometry(1.26, 1.12, 40, 16),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(
      i,
      0.523 * Math.pow(1 - Math.pow(Math.abs(x) / 1.014, 2 / 0.63), 0.63 / 2) +
        0.010,
    );
  }
  g.computeVertexNormals();
  return shapeEditions(g,"label");
}

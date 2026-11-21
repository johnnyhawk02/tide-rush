// Robyn: raincoat, wellies, brown hair with a full straight fringe and a high ponytail, and a striped scarf.
// The colours come from the chosen outfit ("hat" is the scrunchie and mittens colour).
// She is a chunky cartoon figure, about three and a half heads tall, sculpted from soft shapes (see sculpt.js).
// She faces -Z. All animation is procedural.
import * as THREE from 'three';
import { Builder, C, MAT } from './kit.js';
import { Sculptor, Bendy, CHARACTER, gridGeo, mix, sstep, along } from './sculpt.js';
import { clamp, damp, lerp } from './config.js';

const PI = Math.PI;
const HIP = 0.72, THIGH = 0.33, SHIN = 0.39;      // the height of her hips, and the lengths of her legs above and below the knee
const HEAD = 0.235, HEAD_Y = 0.745;               // the size of her head, and how far above her hips its middle is
const HAIR = 0x66422d, HAIR_D = 0x4b2e1f, HAIR_L = 0x91603f, LEG = 0x24375e, SKIN = 0xf7c9a6, SKIN_D = 0xeeb190;
// Outfits unlock as the player collects shells over many runs. "need" is the lifetime shell total required.
export const OUTFITS = [
  { id: 'raincoat', name: 'Raincoat', need: 0, coat: 0xffc51f, hat: 0x14a39b, boot: 0xe5383b, scarf: 0xe5383b, scarf2: 0xfff1cf },
  { id: 'lifeguard', name: 'Lifeguard', need: 150, coat: 0xe8412f, hat: 0xfff1cf, boot: 0xffc928, scarf: 0x22365c, scarf2: 0xfff1cf },
  { id: 'mermaid', name: 'Mermaid', need: 400, coat: 0x2fc7b8, hat: 0xff8fc0, boot: 0x8a5be0, scarf: 0xff8fc0, scarf2: 0xfff1cf },
  { id: 'midnight', name: 'Midnight', need: 900, coat: 0x34459c, hat: 0xffc928, boot: 0xc9d2e0, scarf: 0xffc928, scarf2: 0x8ff0ff },
];
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
// colours of the outfit being built (set at the top of the constructor)
let COAT, COAT_D, HAT, HAT_D, BOOT, BOOT_D, SCARF, SCARF2;
// how shiny things are: a wet raincoat and rubber wellies, soft skin, matt hair and wool
const WET = 0.3, RUBBER = 0.2, SOFT = 0.62, MATT = 0.8;

// The shape of her head: a ball, a little wider than it is tall, with full cheeks and a small chin. Give it a direction
// (x, y, z) and it puts the point of the head's surface that lies that way into out (k: the size, for the shells
// that sit just outside it). Her skin, her drawn face and her hair all use it, so they fit one another.
function headShape(x, y, z, out, k = HEAD) {
  const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
  const cheek = (sx) => Math.exp(-((x - sx * 0.6) ** 2 + (y + 0.42) ** 2 + (z + 0.68) ** 2) / 0.2);
  const r = k * (1 + 0.05 * (cheek(1) + cheek(-1)) + 0.03 * Math.exp(-(x * x + (y + 0.86) ** 2 + (z + 0.5) ** 2) / 0.12));
  return out.set(x * r * 1.06, y * r * 0.98, z * r);
}

// ----- her face: flat cartoon features drawn on a canvas and wrapped round the front of her head -----
// The patch covers FACE_A radians either side of straight ahead and FACE_TL radians from brow to chin.
// Everything is measured in head radii: x to the viewer's right, y up from the middle of her head.
const FACE_A = 1.1, FACE_T0 = 0.85, FACE_TL = 1.75, FACE_W = 640, FACE_H = 512;
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
function drawFace(kind) {
  const cv = document.createElement('canvas'); cv.width = FACE_W; cv.height = FACE_H;
  const g = cv.getContext('2d'), S = FACE_W / (2 * FACE_A);   // pixels per head radius
  const at = (x, y) => { const th = Math.acos(y); return [FACE_W * (0.5 + Math.asin(x / Math.sin(th)) / (2 * FACE_A)), FACE_H * (th - FACE_T0) / FACE_TL]; };
  const oval = (x, y, rx, ry, fill) => { g.beginPath(); g.ellipse(x, y, rx * S, ry * S, 0, 0, PI * 2); g.fillStyle = fill; g.fill(); };
  const INK = '#35201a', wide = kind === 'shock';
  g.lineCap = g.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    // rosy cheeks
    const [cx, cy] = at(sx * 0.6, -0.38), blush = g.createRadialGradient(cx, cy, 0, cx, cy, 0.17 * S);
    blush.addColorStop(0, 'rgba(250,120,128,0.62)'); blush.addColorStop(0.55, 'rgba(250,120,128,0.38)'); blush.addColorStop(1, 'rgba(250,120,128,0)');
    g.fillStyle = blush; g.fillRect(cx - 0.18 * S, cy - 0.18 * S, 0.36 * S, 0.36 * S);
    // eyebrows, the colour of her hair (they lift under her fringe when she is shocked)
    const [bx, by] = at(sx * 0.375, wide ? 0.215 : 0.17);
    g.beginPath(); g.moveTo(bx - sx * 0.1 * S, by + 0.014 * S); g.quadraticCurveTo(bx + sx * 0.01 * S, by - 0.04 * S, bx + sx * 0.115 * S, by + 0.02 * S);
    g.strokeStyle = css(HAIR_D); g.lineWidth = 0.034 * S; g.stroke();
    // eyes
    const [ex, ey] = at(sx * 0.37, -0.075);
    if (kind === 'blink') {
      g.beginPath(); g.arc(ex, ey - 0.07 * S, 0.135 * S, 0.17 * PI, 0.83 * PI); g.strokeStyle = INK; g.lineWidth = 0.036 * S; g.stroke();
      for (const k of [0.78, 0.93]) { const a = sx > 0 ? PI * (1 - k) + PI * 0.02 : PI * k - PI * 0.02; g.beginPath(); g.moveTo(ex + Math.cos(a) * 0.135 * S, ey - 0.07 * S + Math.sin(a) * 0.135 * S); g.lineTo(ex + Math.cos(a) * 0.185 * S, ey - 0.07 * S + Math.sin(a) * 0.18 * S); g.lineWidth = 0.022 * S; g.stroke(); }
      continue;
    }
    const rx = wide ? 0.155 : 0.142, ry = wide ? 0.2 : 0.182, ir = wide ? 0.082 : 0.14;
    if (wide) oval(ex, ey, rx + 0.014, ry + 0.014, INK);
    oval(ex, ey, rx, ry, '#fffdf9');
    g.save(); g.beginPath(); g.ellipse(ex, ey, rx * S, ry * S, 0, 0, PI * 2); g.clip();
    const ix = ex - sx * 0.008 * S, iy = ey + (wide ? 0 : 0.02 * S);
    const iris = g.createRadialGradient(ix, iy + ir * 0.35 * S, ir * 0.1 * S, ix, iy, ir * S);        // blue-grey, lighter low down, with a dark rim
    iris.addColorStop(0, '#a9cbe2'); iris.addColorStop(0.62, '#6f97b8'); iris.addColorStop(0.9, '#48698a'); iris.addColorStop(1, '#324d69');
    oval(ix, iy, ir, ir, iris);
    oval(ix, iy, ir * 0.55, ir * 0.55, '#19212d');
    if (!wide) { const lid = g.createLinearGradient(0, ey - ry * S, 0, ey - ry * 0.25 * S); lid.addColorStop(0, 'rgba(53,32,40,0.5)'); lid.addColorStop(1, 'rgba(53,32,40,0)'); g.fillStyle = lid; g.fillRect(ex - rx * S, ey - ry * S, rx * 2 * S, ry * S); }   // the shade of her lashes
    g.restore();
    oval(ex + 0.05 * S, ey - (wide ? 0.035 : 0.055) * S, wide ? 0.026 : 0.046, wide ? 0.026 : 0.046, '#ffffff');      // catch lights
    oval(ex - 0.055 * S, ey + 0.08 * S, 0.02, 0.02, 'rgba(255,255,255,0.85)');
    if (!wide) {                                                                  // upper lid, with lashes flicking out at the corner
      g.beginPath(); g.ellipse(ex, ey, (rx + 0.006) * S, (ry + 0.006) * S, 0, PI * 1.04, PI * 1.96);
      g.strokeStyle = INK; g.lineWidth = 0.04 * S; g.stroke();
      for (const [a0, len] of [[0.1, 0.07], [0.2, 0.06]]) {
        const a = sx > 0 ? -PI * a0 : PI + PI * a0, x0 = ex + Math.cos(a) * rx * S, y0 = ey + Math.sin(a) * ry * S;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + sx * len * S, y0 - len * 0.75 * S); g.lineWidth = 0.024 * S; g.stroke();
      }
      g.beginPath(); g.ellipse(ex, ey, (rx + 0.004) * S, (ry + 0.004) * S, 0, PI * 0.25, PI * 0.75);     // a soft line under the eye
      g.strokeStyle = 'rgba(150,84,62,0.55)'; g.lineWidth = 0.014 * S; g.stroke();
    }
  }
  if (wide) {
    // mouth dropped open in an O
    const [mx, my] = at(0, -0.56);
    oval(mx, my, 0.115, 0.145, '#5a1820');
    oval(mx, my, 0.1, 0.13, '#7c212c');
    g.save(); g.beginPath(); g.ellipse(mx, my, 0.1 * S, 0.13 * S, 0, 0, PI * 2); g.clip();
    oval(mx, my + 0.125 * S, 0.085, 0.07, '#ef7f8a');                             // tongue
    g.fillStyle = '#ffffff'; g.fillRect(mx - 0.07 * S, my - 0.14 * S, 0.14 * S, 0.05 * S);   // top teeth
    g.restore();
  } else {
    // a big open smile: teeth along the top, tongue below
    const [mx, my] = at(0, -0.46), m = (dx, dy) => [mx + dx * S, my + dy * S];
    const mouth = () => { g.beginPath(); g.moveTo(...m(-0.235, -0.03)); g.quadraticCurveTo(...m(0, 0.05), ...m(0.235, -0.03)); g.bezierCurveTo(...m(0.2, 0.27), ...m(-0.2, 0.27), ...m(-0.235, -0.03)); g.closePath(); };
    mouth(); g.fillStyle = '#8c2a34'; g.fill();
    g.save(); mouth(); g.clip();
    g.beginPath(); g.moveTo(...m(-0.25, -0.06)); g.quadraticCurveTo(...m(0, 0.045), ...m(0.25, -0.06)); g.lineTo(...m(0.25, 0.0)); g.quadraticCurveTo(...m(0, 0.115), ...m(-0.25, 0.0)); g.closePath(); g.fillStyle = '#ffffff'; g.fill();   // a row of top teeth
    oval(mx, my + 0.215 * S, 0.125, 0.08, '#f2828e');                              // tongue
    g.restore();
    mouth(); g.strokeStyle = '#5a1820'; g.lineWidth = 0.02 * S; g.stroke();
    for (const sx of [-1, 1]) {                                                   // smile creases at the corners
      g.beginPath(); g.moveTo(...m(sx * 0.262, -0.07)); g.quadraticCurveTo(...m(sx * 0.285, -0.03), ...m(sx * 0.255, 0.012)); g.lineWidth = 0.016 * S; g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let FACES = null, FACE_GEO = null;
function faceMesh() {
  if (!FACES) {
    FACES = { happy: drawFace('happy'), blink: drawFace('blink'), shock: drawFace('shock') };
    FACE_GEO = gridGeo(26, 20, (u, v, out) => {
      const ph = PI * 1.5 - FACE_A + u * FACE_A * 2, th = FACE_T0 + v * FACE_TL;
      headShape(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th), out, HEAD * 1.012);
    });
  }
  const mat = new THREE.MeshStandardMaterial({ map: FACES.happy, transparent: true, depthWrite: false, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  return new THREE.Mesh(FACE_GEO, mat);
}

// a piece of Robyn herself (soft sculpted shapes), and a piece of the things she rides and carries
function part(fn, grad = 0.9) { const b = new Sculptor(grad); fn(b); return b.part(); }
function prop(fn, grad = 0.9) { const b = new Builder(grad); fn(b); return b.build({ cast: true, receive: false, material: MAT.glossy }); }

// ----- her hair -----
// It is combed back over her head to the ponytail, which is tied high at the back, so the strands are laid out like
// the lines of longitude on a globe whose pole is where the ponytail is tied: `a` goes round that pole (0 is the
// strand that runs forward over the top of her head to the middle of her fringe) and `q` is how far from it.
const PONY_UP = 0.9, STRANDS = 24;
const PONY = [0, Math.sin(PONY_UP), Math.cos(PONY_UP)], _d = new THREE.Vector3();
const hairDir = (a, q, out) => out.set(Math.sin(q) * Math.sin(a), Math.cos(q) * PONY[1] + Math.sin(q) * Math.cos(a) * PONY[2], Math.cos(q) * PONY[2] - Math.sin(q) * Math.cos(a) * PONY[1]);
// how low her hair comes (height in head radii), going round from the middle of her face (0) to the back of her head (PI)
const hairline = (phi) => (phi < 0.95 ? 0.3 : phi < 1.2 ? lerp(0.3, -0.14, sstep(0.95, 1.2, phi)) : phi < 1.75 ? -0.14 : lerp(-0.14, -0.8, sstep(1.75, 2.2, phi)));
const strand = (a, k = 1) => mix(HAIR_D, HAIR, 0.5 + 0.5 * Math.cos(a * k));
function hairCap(b) {
  const NU = 120, NV = 13, Q = [], FR = [];
  for (let i = 0; i <= NU; i++) {
    const a = (i / NU) * PI * 2; let q = 0.3;
    for (; q < 2.6; q += 0.006) { hairDir(a, q, _d); if (_d.y < hairline(Math.abs(Math.atan2(_d.x, -_d.z)))) break; }
    Q.push(q); FR.push(sstep(1.15, 0.9, Math.abs(Math.atan2(_d.x, -_d.z))));        // 1 for the strands that make her fringe
  }
  b.finish(MATT).surf(NU, NV, (u, v, out) => {
    const i = Math.round(u * NU), a = u * PI * 2, ridge = Math.cos(a * STRANDS), fr = FR[i];
    const j = Math.round(v * NV), tuck = j === NV, t = tuck ? 1 : j / (NV - 1);
    // each strand of the fringe ends in a soft rounded tip, a little lower than the gaps between them; the last row tucks the edge under
    const q = lerp(0.16, Q[i] + fr * 0.032 * Math.pow(0.5 + 0.5 * ridge, 0.6), t) + (tuck ? 0.035 : 0);
    hairDir(a, q, out);
    const lift = tuck ? 0.99 : 1.085 + 0.013 * ridge * sstep(0.3, 0.8, q) * (1 + fr * 0.7) + fr * 0.035 * sstep(0.45, 1, t);
    headShape(out.x, out.y, out.z, out, HEAD * lift);
  }, (u, v, x, y, z) => {
    const ridge = Math.cos(u * PI * 2 * STRANDS), shine = sstep(0.095, 0.15, y) * sstep(0.235, 0.18, y) * (0.55 + 0.45 * sstep(0.16, -0.02, z));     // a band of light round the top of her head
    return mix(mix(HAIR_D, HAIR, 0.55 + 0.45 * ridge), HAIR_L, shine * (0.55 + 0.3 * ridge));
  });
}
// her ponytail, hanging down from (0, 0, 0): thick ropes of hair, fullest in the middle, with the end curling under
function ponytail(b) {
  b.finish(MATT).tube([[0, 0, 0], [0, -0.16, 0], [0, -0.31, 0], [0, -0.38, 0], [0, -0.445, -0.012], [0, -0.49, -0.04]], [0.066, 0.084, 0.092, 0.088, 0.076, 0.062, 0.046, 0.014],
    (t, a) => mix(strand(a, 5), HAIR_L, 0.22 * Math.max(0, Math.sin(a))), { seg: 15, len: 20, shape: (a) => 1 + 0.06 * Math.cos(a * 5) });
}

export class Robyn {
  constructor(outfit = OUTFITS[0]) {
    COAT = outfit.coat; COAT_D = shade(COAT, 0.8); HAT = outfit.hat; HAT_D = shade(HAT, 0.78); BOOT = outfit.boot; BOOT_D = shade(BOOT, 0.78);
    SCARF = outfit.scarf; SCARF2 = outfit.scarf2;
    const stripes = (n) => (u) => (Math.floor(u * n + 0.5) % 2 ? SCARF2 : SCARF);
    this.root = new THREE.Group();
    this.lean = new THREE.Group(); this.root.add(this.lean);
    this.hips = new THREE.Group(); this.hips.position.y = HIP; this.lean.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);

    // ----- torso: the top of her raincoat, with her scarf wound round the collar -----
    const CH_Y = [0.1, 0.19, 0.29, 0.37, 0.425, 0.462, 0.48], CH_W = [0.193, 0.196, 0.2, 0.192, 0.155, 0.1, 0], CH_D = [0.183, 0.18, 0.172, 0.158, 0.135, 0.095, 0];
    this.torso.add(part((b) => {
      b.finish(WET).surf(22, 12, (u, v, out) => { const a = u * PI * 2; out.set(Math.cos(a) * Math.max(0, along(CH_W, v)), along(CH_Y, v), Math.sin(a) * Math.max(0, along(CH_D, v))); }, COAT);
      b.tube([[0, 0.135, -0.187], [0, 0.29, -0.177], [0, 0.38, -0.162], [0, 0.44, -0.125]], 0.03, COAT_D, { seg: 6, wide: 1, deep: 0.3, up: [0, 0, -1] });   // front placket
      b.finish(0.24);
      for (const [y, z] of [[0.215, -0.198], [0.335, -0.187]]) b.ball(0.021, LEG, 0, y, z, 1, 1, 0.5, { seg: 8 });        // buttons
      b.finish(SOFT).lathe([[0.184, 0.08], [0.199, 0.086], [0.204, 0.11], [0.199, 0.134], [0.184, 0.14]], LEG, 0, 0, 0, { seg: 22, deep: 0.94 });     // belt
      b.finish(0.3).box(0.074, 0.058, 0.02, C.gold, 0, 0.11, -0.193).box(0.04, 0.028, 0.024, LEG, 0, 0.11, -0.194);          // buckle
      b.finish(SOFT).cyl(0.075, 0.09, 0.1, SKIN_D, 0, 0.5, 0, 0, 0, 0, { seg: 10 });                                         // neck
      // her scarf, wound round her neck and knotted at the front, with one short end hanging down her coat
      b.finish(MATT).ring(0.122, 0.057, stripes(10), 0, 0.518, 0.004, { seg: 40, tseg: 8, tall: 0.86 });
      b.ball(0.05, SCARF, 0.064, 0.492, -0.14, 1.1, 0.95, 0.62, { seg: 10 });
      b.tube([[0.066, 0.485, -0.15], [0.082, 0.4, -0.196], [0.088, 0.3, -0.205]], [0.05, 0.052, 0.054], (t) => (Math.floor(t * 3.999) % 2 ? SCARF : SCARF2), { seg: 8, len: 8, wide: 1, deep: 0.3, up: [0, 0, -1], round: 0.5 });
      for (let k = -2; k <= 2; k++) b.tube([[0.088 + k * 0.02, 0.3, -0.205], [0.089 + k * 0.022, 0.25, -0.207]], 0.008, SCARF2, { seg: 4, len: 1 });
    }));

    // the skirt of the coat: it flares like a bell, and swishes and lifts as her knees come up
    this.skirt = new THREE.Group(); this.skirt.position.y = 0.11; this.torso.add(this.skirt);
    const pleat = (a, t) => 1 + 0.024 * t * t * Math.cos(a * 8);
    this.skirt.add(part((b) => {
      b.finish(WET).lathe([[0.186, 0.02], [0.196, -0.03], [0.222, -0.1], [0.262, -0.17], [0.298, -0.225], [0.312, -0.245]], COAT, 0, 0, 0, { seg: 32, rows: 10, shape: pleat });
      b.ring(0.312, 0.014, COAT_D, 0, -0.247, 0, { seg: 32, tseg: 6, shape: (a) => pleat(a, 1) });       // rolled hem
      b.ball(0.275, shade(COAT, 0.42), 0, -0.2, 0, 1, 0.07, 1, { seg: 12 });                             // the dark inside of the coat
      b.tube([[0, 0.012, -0.19], [0, -0.1, -0.228], [0, -0.17, -0.272], [0, -0.238, -0.317]], 0.03, COAT_D, { seg: 6, wide: 1, deep: 0.3, up: [0, 0, -1] });
      b.finish(0.24).ball(0.021, LEG, 0, -0.085, -0.229, 1, 1, 0.5, { seg: 8 });
      for (const sx of [-1, 1]) b.at(0, 0, 0, sx * -0.64, () => {                                         // pocket flaps, each with a button
        b.finish(WET).ball(1, COAT_D, 0, -0.098, -0.236, 0.06, 0.038, 0.014, { seg: 10, rx: 0.5 });
        b.finish(0.24).ball(0.013, LEG, 0, -0.112, -0.255, 1, 1, 0.5, { seg: 6 });
      });
    }));
    // her hood, worn down: it bobs on her back as she runs
    this.hood = new THREE.Group(); this.hood.position.set(0, 0.455, 0.09); this.torso.add(this.hood);
    this.hood.add(part((b) => {
      // a soft pouch that hangs to a point, wide and open at the top
      b.finish(WET).ball(1, COAT, 0, -0.07, 0.062, 0.168, 0.125, 0.082, { seg: 14, rx: 0.34, warp: (p) => { p.x *= 1 - 0.5 * sstep(0.1, -1, p.y); p.z *= 1 + 0.2 * sstep(0.5, -0.6, p.y) - 0.3 * sstep(-0.5, -1, p.y); } });
      b.ring(0.108, 0.022, COAT_D, 0, 0.012, 0.045, { seg: 18, tseg: 6, deep: 0.56, rx: 0.5 });           // the rim of the opening
      b.ball(1, shade(COAT, 0.5), 0, 0.008, 0.047, 0.1, 0.02, 0.052, { seg: 10, rx: 0.5 });
    }));

    // the long end of her scarf, which flutters behind her: one piece, which bends at five joints along its length
    const knot = [-0.045, 0.515, 0.15];
    this.tail = new Bendy(part((b) => b.at(...knot, 0, () => {
      b.finish(MATT).tube([[0, 0, -0.01], [0, 0, 0.64]], (t) => 0.062 - 0.018 * t, (t) => (Math.floor(t * 10 + 0.01) % 2 ? SCARF2 : SCARF), { seg: 8, len: 30, wide: 1, deep: 0.26, round: 0.6 });
      for (let k = -2; k <= 2; k++) b.tube([[k * 0.02, 0, 0.65], [k * 0.023, 0, 0.71]], 0.008, SCARF2, { seg: 4, len: 1 });     // fringe
    }), 1), [knot, [0, 0, 0.125], [0, 0, 0.125], [0, 0, 0.125], [0, 0, 0.125]]);
    this.torso.add(this.tail.mesh); this.scarf = this.tail.joints;

    // ----- head: big and round, with her face drawn on; brown hair with a full straight fringe -----
    this.head = new THREE.Group(); this.head.name = 'head'; this.head.position.set(0, HEAD_Y, 0); this.torso.add(this.head);
    this.head.add(part((b) => {
      b.finish(SOFT).ball(1, SKIN, 0, 0, 0, 1, 1, 1, { seg: 28, rings: 20, warp: (p) => headShape(p.x, p.y, p.z, p) });
      for (const sx of [-1, 1]) {
        b.finish(SOFT).ball(0.046, SKIN, sx * 0.243, -0.05, 0.02, 0.45, 1, 0.78, { seg: 8 }).ball(0.024, SKIN_D, sx * 0.251, -0.052, 0.014, 0.4, 1, 0.75, { seg: 6 });   // ears
        b.finish(MATT).tube([[sx * 0.226, -0.01, -0.112], [sx * 0.236, -0.06, -0.104], [sx * 0.232, -0.112, -0.092]], [0.024, 0.023, 0.017, 0.007], HAIR, { seg: 6, len: 6 });   // a wisp in front of each ear
      }
      b.finish(SOFT).ball(0.023, mix(SKIN_D, 0xf09a8c, 0.35).getHex(), 0, -0.047, -0.233, 1.12, 0.86, 0.8, { seg: 10 });   // button nose
      hairCap(b);
      // where her hair is gathered, and the scrunchie that ties it
      const at = (k) => [0, PONY[1] * HEAD * k, PONY[2] * HEAD * k];
      b.finish(MATT).tube([at(0.9), at(1.5)], [0.085, 0.07], (t, a) => strand(a, 6), { seg: 12, len: 2, shape: (a) => 1 + 0.06 * Math.cos(a * 6) });
      b.finish(SOFT).ring(0.07, 0.031, HAT, ...at(1.36), { seg: 21, tseg: 8, rx: PI / 2 - PONY_UP, shape: (a) => 1 + 0.09 * Math.cos(a * 7) });
      b.ring(0.07, 0.018, HAT_D, ...at(1.36), { seg: 21, tseg: 6, rx: PI / 2 - PONY_UP, tall: 2.1, shape: (a) => 1 - 0.07 * Math.cos(a * 7) });
    }));
    // the drawn face swaps between her big smile, a blink, and the shocked look she gives the camera when she stumbles
    this.face = faceMesh(); this.head.add(this.face);
    this.blinkT = 2;
    // ponytail: tied high with a scrunchie. It is one piece, which swings at three joints down its length.
    const tied = [0, PONY[1] * HEAD * 1.42, PONY[2] * HEAD * 1.42];
    this.hair = new Bendy(part((b) => b.at(...tied, 0, () => ponytail(b))), [tied, [0, -0.16, 0], [0, -0.15, 0]]);
    this.head.add(this.hair.mesh); [this.pony, this.pony2, this.pony3] = this.hair.joints;

    // ----- arms -----
    const arm = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.205, 0.385, 0); this.torso.add(sh);
      sh.add(part((b) => { b.finish(WET).tube([[0, 0.005, 0], [0, -0.1, 0], [0, -0.2, 0]], [0.08, 0.074, 0.066], COAT, { seg: 10, len: 5 }); }));
      const el = new THREE.Group(); el.position.set(0, -0.2, 0); sh.add(el);
      el.add(part((b) => {
        b.finish(WET).tube([[0, 0, 0], [0, -0.09, 0], [0, -0.165, 0]], [0.066, 0.066, 0.071], COAT, { seg: 10, len: 4 });
        b.ring(0.064, 0.017, COAT_D, 0, -0.166, 0, { seg: 12, tseg: 6 });                 // rolled cuff
        b.finish(MATT).ring(0.05, 0.017, HAT_D, 0, -0.186, 0, { seg: 12, tseg: 6 });      // the knitted wrist of her mitten
        b.ball(1, HAT, 0, -0.243, -0.004, 0.064, 0.08, 0.058, { seg: 12 });               // mitten
        b.ball(0.027, HAT, sx * -0.05, -0.226, -0.03, 1, 1.25, 1, { seg: 8 });            // thumb
      }));
      return { sh, el };
    };
    this.armL = arm(-1); this.armR = arm(1);

    // ----- legs: leggings and big wellies -----
    const toe = (p) => {      // a rounded toe cap, and a flat bottom to stand on
      const k = sstep(0.2, -0.9, p.z); p.x *= 1 + 0.1 * k; if (p.y > 0) p.y *= 1 + 0.2 * k;
      if (p.y < -0.5) p.y = -0.5 - (p.y + 0.5) * 0.15;
    };
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.095, 0, 0); this.hips.add(hip);
      hip.add(part((b) => { b.finish(MATT).tube([[0, 0.02, 0], [0, -0.16, 0], [0, -THIGH, 0]], [0.088, 0.082, 0.07], LEG, { seg: 10, len: 5 }); }));
      const knee = new THREE.Group(); knee.position.set(0, -THIGH, 0); hip.add(knee);
      knee.add(part((b) => {
        b.finish(MATT).tube([[0, 0, 0], [0, -0.14, 0]], [0.07, 0.064], LEG, { seg: 10, len: 2 });
        b.finish(RUBBER);
        b.lathe([[0.06, -0.082], [0.09, -0.086], [0.097, -0.098], [0.095, -0.114], [0.088, -0.128], [0.084, -0.2], [0.08, -0.29], [0.083, -0.345]], (u, v) => (v < 0.5 ? BOOT_D : BOOT), 0, 0, 0, { seg: 14 });   // welly, with a rolled top
        b.ball(1, BOOT, 0, -0.33, -0.05, 0.09, 0.07, 0.15, { seg: 14, warp: toe });       // foot
        b.finish(SOFT).add(new THREE.CylinderGeometry(1, 1, 1, 16), C.cream, 0, -SHIN + 0.016, -0.05, 0, 0, 0, 0.095, 0.032, 0.164);   // sole
        b.add(new THREE.CylinderGeometry(1, 1, 1, 12), BOOT_D, 0, -SHIN + 0.035, 0.045, 0, 0, 0, 0.086, 0.02, 0.07);                    // heel
      }));
      // spring boots (shown while the power-up is active)
      const spring = prop((b) => {
        for (let i = 0; i < 4; i++) b.tor(0.055, 0.012, 0x7dff8a, 0, -SHIN - 0.02 - i * 0.03, -0.04, PI / 2, 0, 0, { seg: 10, grad: 1 });
        b.box(0.14, 0.02, 0.24, 0x2fd35f, 0, -SHIN - 0.13, -0.04);
      });
      spring.visible = false; knee.add(spring);
      return { hip, knee, spring };
    };
    this.legL = leg(-1); this.legR = leg(1);

    // ----- shield bubble -----
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1.08, 28, 20), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uA: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uT; uniform float uA;
        void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2);
          float band = 0.5 + 0.5*sin(vP.y*9. - uT*3. + sin(vP.x*4.+uT)*1.5);
          vec3 col = mix(vec3(0.35,0.95,1.0), vec3(1.0), f*0.6 + band*0.15);
          gl_FragColor = vec4(col, (f*0.85 + 0.06 + band*0.05) * uA); }`,
    }));
    this.shield.position.y = 0.92; this.shield.visible = false; this.root.add(this.shield);

    // ----- firework rocket she rides in rocket mode (lies along z, nose forward) -----
    this.rocket = prop((b) => {
      b.cyl(0.17, 0.17, 1.25, 0xe5383b, 0, 0, 0, PI / 2, 0, 0, { seg: 14 });
      for (const z of [-0.36, 0.3]) b.cyl(0.176, 0.176, 0.13, 0xfff1cf, 0, 0, z, PI / 2, 0, 0, { seg: 14 });
      b.cone(0.17, 0.44, 0xffc928, 0, 0, -0.845, -PI / 2, 0, 0, { seg: 14 });
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.box(0.03, 0.32, 0.36, 0x22365c, -Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0.5, 0, 0, a); }
      b.cyl(0.12, 0.15, 0.12, 0x2c3640, 0, 0, 0.68, PI / 2, 0, 0, { seg: 12 });
      b.cyl(0.016, 0.016, 1.0, 0xb98f5e, 0.1, -0.12, 1.15, PI / 2, 0, 0, { seg: 6 });
      for (const sx of [-1, 1]) for (const z of [-0.14, 0.06]) b.sph(0.045, 0xffe27a, sx * 0.165, 0.03, z, 0.4, 1, 1, { seg: 6 });
    });
    this.rocket.position.set(0, HIP - 0.25, 0.02); this.rocket.visible = false; this.root.add(this.rocket);

    // ----- hoverboard: a surfboard that floats on a cushion of glowing sea spray (lies along z, nose forward) -----
    this.board = new THREE.Group(); this.board.visible = false; this.lean.add(this.board);
    this.board.add(prop((b) => {
      b.add(new THREE.SphereGeometry(1, 18, 8), (x, y, z) => (Math.abs(x) < 0.07 ? 0xfff1cf : z < -0.55 ? 0xff7a66 : z > 0.6 ? 0xffc928 : 0x18a7a0), 0, 0, 0, 0, 0, 0, 0.36, 0.05, 1.0);
      b.box(0.34, 0.014, 0.36, 0x22365c, 0, 0.046, 0.5).box(0.34, 0.014, 0.3, 0x22365c, 0, 0.046, -0.32);   // grip pads
      b.box(0.03, 0.16, 0.24, 0x22365c, 0, -0.1, 0.74, -0.3, 0, 0);                                           // fin
      for (const z of [-0.5, 0.45]) b.cyl(0.17, 0.13, 0.06, 0x2c3640, 0, -0.06, z, 0, 0, 0, { seg: 12 });       // hover pods
    }));
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.boardGlow = [];
    for (const z of [-0.5, 0.45]) { const m = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.2, 16).rotateX(PI / 2), glowMat); m.position.set(0, -0.1, z); this.board.add(m); this.boardGlow.push(m); }

    // ----- laser zapper: a chunky toy blaster in her right hand (barrel pointing down her forearm) -----
    this.blaster = new THREE.Group(); this.blaster.position.set(0, -0.275, -0.03); this.blaster.visible = false; this.armR.el.add(this.blaster);
    this.blaster.add(prop((b) => {
      b.sph(0.06, 0x18a7a0, 0, -0.03, -0.03, 0.85, 1.7, 0.95, { seg: 10 });
      b.cyl(0.03, 0.038, 0.18, 0xff9f1c, 0, -0.19, -0.03, 0, 0, 0, { seg: 8 });
      for (const y of [-0.14, -0.22]) b.tor(0.045, 0.013, 0xffc928, 0, y, -0.03, PI / 2, 0, 0, { seg: 10 });
    }));
    this.muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6ad8 }));
    this.muzzle.position.set(0, -0.3, -0.03); this.blaster.add(this.muzzle);
    this.aim = 0; this.kick = 0;

    this.phase = 0; this.lead = 1; this.t = 0; this.squash = 0; this.wasGround = true;
    this.shockT = 0; this.look = 0; this.lastSt = 0; this.p2 = this.p3 = -0.6; this.flare = 0;
    this.j = { tl: 0, kl: 0, tr: 0, kr: 0, sl: 0, el: 1.2, sr: 0, er: 1.2, slz: 0, srz: 0, tx: 0, ty: 0, hx: 0, hy: 0, hipY: HIP, pony: -0.5, splay: 0, yaw: 0, lift: 0, tuck: 0 };
  }

  setBoots(on) { this.legL.spring.visible = on; this.legR.spring.visible = on; }
  setShield(on) { this.shield.visible = on; }
  setRocket(on) { this.rocket.visible = on; }
  setBoard(on) { this.board.visible = on; }
  // mega: the bigger space version
  setBlaster(on, mega = false, size = 1.1) { this.blaster.visible = on; this.blaster.scale.setScalar(mega ? 1.45 : size); }
  fire() { this.kick = 1; }
  // (her face's shape and pictures, and the materials every Robyn shares, are kept for the next outfit)
  dispose() {
    this.root.traverse((o) => {
      if (o.geometry && o.geometry !== FACE_GEO) o.geometry.dispose();
      if (o.material && o.material !== CHARACTER && o.material !== MAT.glossy) o.material.dispose();
    });
  }

  // s: { mode, speed, vy, vx, grounded, stumble (0..1) }
  update(dt, s) {
    this.t += dt;
    const sp = s.speed;
    const amp = clamp(sp / 13, 0.5, 1);
    const cadence = 2.5 + sp * 0.05;
    if (s.mode === 'run' || s.mode === 'stumble') this.phase += cadence * PI * dt;
    const ph = this.phase, sn = Math.sin(ph), cs = Math.cos(ph);
    const T = { splay: 0, yaw: 0, lift: 0, tuck: 0 }; // targets
    const air = !s.grounded && (s.mode === 'run' || s.mode === 'stumble');
    const running = !air && (s.mode === 'run' || s.mode === 'stumble');

    if (s.mode === 'crash') {
      const w = Math.sin(this.t * 9) * 0.15;
      Object.assign(T, { tl: 0.9 + w, kl: -1.1, tr: 0.4 - w, kr: -0.7, sl: 2.4, el: 0.5, sr: 2.0, er: 0.7, slz: -0.6, srz: 0.6, tx: 0.25, ty: 0, hx: -0.3, hy: 0, hipY: HIP, pony: 0.6 });
    } else if (s.mode === 'fall') {
      const k = Math.sin(this.t * 16);
      Object.assign(T, { tl: 0.5 * k, kl: -0.6 - 0.4 * k, tr: -0.5 * k, kr: -0.6 + 0.4 * k, sl: 2.9, el: 0.2, sr: 2.9, er: 0.2, slz: -0.5 - 0.3 * k, srz: 0.5 - 0.3 * k, tx: 0.1, ty: 0, hx: -0.4, hy: 0, hipY: HIP, pony: -2.4 });
    } else if (s.mode === 'ride') {
      // astride the rocket, leaning forward and holding on
      const w = Math.sin(this.t * 7) * 0.05;
      Object.assign(T, { tl: 0.4, kl: -1.3 + w, tr: 0.4, kr: -1.3 - w, sl: 0.95, el: 0.5, sr: 0.95, er: 0.5, slz: 0.1, srz: -0.1, tx: -0.45, ty: 0, hx: 0.34, hy: 0, hipY: HIP - 0.02, pony: -1.7, splay: 0.45, tuck: 1 });
    } else if (s.mode === 'surf') {
      // side-on on the hoverboard: knees bent, arms out for balance, head turned to look ahead
      const w = Math.sin(this.t * 2.6) * 0.06, up = s.grounded ? 0 : clamp(s.vy / 9, -1, 1);
      Object.assign(T, {
        tl: 0.5 + up * 0.3, kl: -0.95 - up * 0.35, tr: 0.5 + up * 0.3, kr: -0.95 - up * 0.35,
        sl: 0.1, el: 0.25, sr: -0.1, er: 0.25, slz: -1.2 + w - up * 0.3, srz: 1.2 + w + up * 0.3,
        tx: 0.12, ty: 0, hx: 0, hy: -0.8, hipY: HIP - 0.13 + Math.sin(this.t * 5) * 0.012, pony: -0.95 - clamp(-s.vy * 0.06, -0.3, 0.8), splay: 0.36, yaw: 0.95, lift: 0.2,
      });
      if (s.grounded && !this.wasGround) this.squash = 1;
    } else if (air) {
      const up = clamp(s.vy / 9, -1, 1) * 0.5 + 0.5;
      const L = this.lead > 0;
      const lead = { t: lerp(0.3, 1.3, up), k: -lerp(0.3, 1.65, up) }, trail = { t: lerp(-0.1, -0.55, up), k: -lerp(0.25, 1.25, up) };
      const a = L ? lead : trail, b2 = L ? trail : lead;
      Object.assign(T, {
        tl: a.t, kl: a.k, tr: b2.t, kr: b2.k,
        sl: lerp(0.5, 2.5, up), el: lerp(0.9, 0.5, up), sr: lerp(0.3, 2.1, up), er: lerp(0.9, 0.6, up),
        slz: -lerp(1.0, 0.35, up), srz: lerp(1.0, 0.35, up),
        tx: lerp(0.06, -0.22, up), ty: 0, hx: lerp(-0.1, 0.15, up), hy: 0, hipY: HIP, pony: -0.5 - clamp(-s.vy * 0.09, -0.4, 1.3),
      });
    } else {
      const A = 0.92 * amp;
      Object.assign(T, {
        tl: 0.12 + A * sn, kl: -(0.22 + 1.35 * amp * Math.max(0, cs)),
        tr: 0.12 - A * sn, kr: -(0.22 + 1.35 * amp * Math.max(0, -cs)),
        sl: -1.0 * amp * sn, el: 1.35 - 0.35 * sn, sr: 1.0 * amp * sn, er: 1.35 + 0.35 * sn,
        slz: -0.16, srz: 0.16,
        tx: -0.1 - 0.12 * amp, ty: 0.2 * amp * sn, hx: 0.08, hy: -0.2 * amp * sn,
        hipY: HIP - 0.02 + 0.055 * amp * Math.cos(2 * ph + 0.6), pony: -0.5 - 0.22 * amp + 0.22 * Math.sin(2 * ph + 1.2),
      });
      if (!this.wasGround) { this.squash = 1; this.lead = -this.lead; }
    }
    this.wasGround = s.grounded;

    const j = this.j, k = s.mode === 'run' && !air ? 28 : 16;
    for (const key in T) j[key] = damp(j[key], T[key], k, dt);

    // stumble: flail on top of the base pose
    const st = s.stumble || 0;
    // a new stumble: she looks back over her shoulder at the camera, wide-eyed, for about a second
    if (st > this.lastSt + 0.2) this.shockT = 1.15;
    this.lastSt = st; this.shockT = Math.max(0, this.shockT - dt);
    const dying = s.mode === 'crash' || s.mode === 'fall';
    this.look = damp(this.look, this.shockT > 0.28 && !dying ? 1 : 0, 16, dt);
    const shocked = this.shockT > 0.12 || dying;
    this.blinkT -= dt; if (this.blinkT < -0.11) this.blinkT = 2.2 + Math.random() * 3.2;
    const face = FACES[shocked ? 'shock' : this.blinkT < 0 ? 'blink' : 'happy'];
    if (this.face.material.map !== face) this.face.material.map = face;
    const fl = Math.sin(this.t * 26) * st;
    this.legL.hip.rotation.x = j.tl; this.legL.knee.rotation.x = j.kl; this.legL.hip.rotation.z = -j.splay;
    this.legR.hip.rotation.x = j.tr; this.legR.knee.rotation.x = j.kr; this.legR.hip.rotation.z = j.splay;
    // the skirt of her coat lifts at the front as each knee comes up, opens out as she drops through the air, and rocks with her stride
    const flare = this.flare = damp(this.flare, air ? clamp(-s.vy * 0.016, 0, 0.16) : 0, 10, dt);
    this.skirt.rotation.set(clamp((Math.max(j.tl, j.tr) - 0.3) * 0.46, 0, 0.4) - st * 0.1, 0, (j.tl - j.tr) * 0.035);
    this.skirt.scale.set(1 + flare + j.splay * 0.2, 1 - flare * 0.6 - j.tuck * 0.5, 1 + flare + j.tuck * 0.06);
    this.armL.sh.rotation.set(j.sl + fl * 1.1 + st * 1.2, 0, j.slz - st * 0.7);
    this.armR.sh.rotation.set(j.sr - fl * 1.1 + st * 1.2, 0, j.srz + st * 0.7);
    this.armL.el.rotation.x = j.el * (1 - st * 0.6); this.armR.el.rotation.x = j.er * (1 - st * 0.6);
    // with the zapper out, her right arm points straight ahead and kicks back a little with each shot
    this.aim = damp(this.aim, this.blaster.visible && !dying ? 1 - st : 0, 12, dt); this.kick = Math.max(0, this.kick - dt * 7);
    if (this.aim > 0.01) {
      const a = this.aim, R = this.armR;
      R.sh.rotation.set(lerp(R.sh.rotation.x, 1.5 - j.tx + this.kick * 0.3, a), 0, lerp(R.sh.rotation.z, -0.08, a));
      R.el.rotation.x = lerp(R.el.rotation.x, 0.06, a);
      this.muzzle.scale.setScalar(1 + this.kick * 2.2);
    }
    this.torso.rotation.set(j.tx - st * 0.45, j.ty + this.look * 0.95, fl * 0.12);
    this.head.rotation.set(j.hx + st * 0.3 - this.look * 0.2, j.hy + this.look * 1.9, this.look * -0.12);
    this.squash = Math.max(0, this.squash - dt * 7);
    const sq = 1 - 0.13 * Math.sin(this.squash * PI) * (this.squash > 0 ? 1 : 0);
    this.lean.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
    this.hips.position.y = j.hipY - (1 - sq) * 0.3;
    this.hips.rotation.y = -j.ty * 0.5 + j.yaw;
    this.lean.position.y = j.lift;
    if (this.board.visible) {
      this.board.position.y = -0.07 + Math.sin(this.t * 5) * 0.02; this.board.rotation.x = clamp(-s.vy * 0.025, -0.3, 0.3);
      this.boardGlow.forEach((m, i) => m.scale.setScalar(1 + 0.25 * Math.sin(this.t * 16 + i * 2)));
    }

    // lean into lane changes
    const vx = s.vx || 0;
    this.lean.rotation.z = damp(this.lean.rotation.z, clamp(-vx * 0.035, -0.4, 0.4) + fl * 0.2, 14, dt);
    this.lean.rotation.y = damp(this.lean.rotation.y, clamp(-vx * 0.03, -0.35, 0.35), 14, dt);

    // hair and scarf
    this.pony.rotation.x = j.pony; this.pony.rotation.z = clamp(vx * 0.05, -0.5, 0.5);
    this.p2 = damp(this.p2, j.pony, 13, dt); this.p3 = damp(this.p3, this.p2, 13, dt);
    this.pony2.rotation.x = clamp((this.p2 - j.pony) * 1.5, -0.7, 0.7) + 0.1; this.pony3.rotation.x = clamp((this.p3 - this.p2) * 1.5, -0.7, 0.7) + 0.12;
    this.pony2.rotation.z = this.pony.rotation.z * 0.6; this.pony3.rotation.z = this.pony.rotation.z * 0.5;
    this.hood.rotation.x = running ? 0.07 * amp * Math.sin(2 * ph + 2.4) : air ? clamp(s.vy * 0.03, -0.25, 0.3) : 0;
    const wind = clamp(sp / 16, 0.15, 1);
    for (let i = 0; i < this.scarf.length; i++) {
      const g = this.scarf[i];
      g.rotation.x = (i === 0 ? lerp(1.0, 0.12, wind) : lerp(0.12, 0, wind)) + Math.sin(this.t * 12 - i * 1.15) * 0.24 * wind - (air ? clamp(s.vy * 0.03, -0.3, 0.3) : 0);
      g.rotation.y = Math.sin(this.t * 8.3 - i * 0.9) * 0.22 * wind + clamp(vx * 0.03, -0.3, 0.3);
    }
    this.hair.update(); this.tail.update();
    if (this.shield.visible) { this.shield.material.uniforms.uT.value = this.t; this.shield.rotation.y = this.t * 0.6; }
  }
}

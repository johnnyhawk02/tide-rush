// Robyn's pets, who join her run every so often: Izzi the border collie and Pixel the black and white cat.
// They follow the exact path Robyn took a moment ago, so they dodge and jump everything she did.
// Like Robyn they are chunky cartoon animals sculpted from soft shapes (see sculpt.js): big heads, big eyes, fluffy tails.
import * as THREE from 'three';
import { C } from './kit.js';
import { Sculptor, Bendy, mix, sstep } from './sculpt.js';
import { clamp, damp, lerp, smooth } from './config.js';

const PI = Math.PI, K = 0x2a2a33, K_L = 0x41414f, W = 0xf7f5ef, PINK = 0xf59aa8, TONGUE = 0xf27c92, NOSE = 0x17171c;
const FUR = 0.82, SHINY = 0.14;      // how the light catches fur, and wet noses and eyes
const rand = (a, b) => a + Math.random() * (b - a);
function part(fn) { const b = new Sculptor(0.86); fn(b); return b.part(); }
function limb(parent, x, y, z, fn) { const g = new THREE.Group(); g.position.set(x, y, z); if (fn) g.add(part(fn)); parent.add(g); return g; }

// A big cartoon eye at (x, y, z), r across, looking forwards and turned a little outwards (o.turn): a glossy dome with the
// pupil, the iris and its rim painted on in rings, and two catch lights.
//   o.white: show the white of the eye round the iris (a dog's eye); otherwise the iris fills it (a cat's)   o.slit: an upright oval pupil
function eye(b, x, y, z, r, iris, o = {}) {
  const I = o.white ? 0.8 : 0.9, oval = (a, ax, ay) => 1 / Math.hypot(Math.cos(a) / ax, Math.sin(a) / ay);
  const P = (a) => I * (o.slit ? oval(a, 0.42, 0.9) : 0.64), bulge = 0.42;
  const rows = [() => 0, P, (a) => P(a) + 0.03, (a) => (P(a) + I) / 2 + 0.02, () => I, () => I + 0.03, () => 1];
  const dark = mix(iris, 0x000000, 0.5).getHex(), light = mix(iris, 0xffffff, 0.22).getHex(), rim = o.white ? 0xfdfbf6 : 0x0b0b0f;
  const paint = [0x0b0b0f, 0x0b0b0f, light, iris, dark, rim, rim];
  b.at(x, y, z, o.turn || 0, () => {
    b.finish(SHINY, 0).surf(18, 6, (u, v, out) => {
      const a = u * PI * 2, q = rows[Math.round(v * 6)](a);
      out.set(Math.cos(a) * q * r, Math.sin(a) * q * r * 1.08, -r * bulge * Math.sqrt(Math.max(0, 1 - q * q)));
    }, (u, v) => paint[Math.round(v * 6)], 0, 0, 0, { grad: 1 });
    b.ball(r * 0.25, 0xffffff, r * 0.3, r * 0.36, -r * 0.38, 1, 1, 0.3, { seg: 6, grad: 1 });      // catch lights
    b.ball(r * 0.11, 0xffffff, -r * 0.3, -r * 0.34, -r * 0.36, 1, 1, 0.3, { seg: 5, grad: 1 });
  });
}
// a rounded paw at the bottom of a leg, with toes
function paw(b, y, z, r, c) {
  b.finish(FUR).ball(r, c, 0, y, z, 1, 0.64, 1.3, { seg: 10 });
  for (const k of [-1, 0, 1]) b.ball(r * 0.36, c, k * r * 0.52, y - r * 0.12, z - r * 0.98 + Math.abs(k) * r * 0.2, 1, 0.9, 1.1, { seg: 6 });
}
const CHEEK = (r) => [r * 0.85, r, r * 0.62, r * 0.14];     // cheek fur comes to a soft point
const CURL = [0, -0.2, -0.3, -0.38, -0.42];                   // how far each length of the cat's tail turns from the one before

// Both animals are built facing -Z, like Robyn.
function buildIzzi() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(part((b) => {
    b.finish(FUR);
    // black back and sides (a little paler along the top, where the light catches her coat), white chest and tummy
    b.tube([[0, 0.455, -0.26], [0, 0.465, -0.1], [0, 0.455, 0.1], [0, 0.445, 0.3]], [0.15, 0.188, 0.172, 0.152, 0.166, 0.135],
      (t, a, x, y, z) => mix(mix(K, K_L, sstep(0.52, 0.64, y)), W, Math.max(sstep(-0.1, -0.2, z) * sstep(0.5, 0.4, y), sstep(0.34, 0.3, y) * sstep(0.2, 0.05, z))), { seg: 18, len: 14, wide: 0.9 });
    // her neck, and the thick white ruff round it that runs down her chest
    b.tube([[0, 0.47, -0.25], [0, 0.6, -0.33], [0, 0.69, -0.4]], [0.15, 0.135, 0.112], W, { seg: 12, len: 6 });
    b.ball(1, W, 0, 0.5, -0.295, 0.172, 0.165, 0.15, { seg: 14, rx: -0.55 });
    for (let k = -2; k <= 2; k++) b.tuft(k * 0.06, 0.435 + Math.abs(k) * 0.04, -0.375 + Math.abs(k) * 0.04, k * 0.01, -0.075, 0.03, 0.082 - Math.abs(k) * 0.008, W);     // the fluffy edge of her bib
    b.finish(0.5).ring(0.117, 0.02, C.red, 0, 0.652, -0.372, { seg: 18, tseg: 6, rx: -0.6 });       // collar and tag
    b.finish(0.3).ball(0.03, C.gold, 0, 0.585, -0.48, 1, 1, 0.5, { seg: 8 });
  }));
  const head = limb(body, 0, 0.745, -0.445, (b) => {
    b.finish(FUR).ball(0.155, K, 0, 0, 0, 1.08, 0.97, 1.02, { seg: 18 });
    for (const sx of [-1, 1]) for (const k of [0, 1]) b.tuft(sx * 0.118, -0.01 - k * 0.04, 0.005 - k * 0.02, sx * (0.06 - k * 0.025), -0.055 - k * 0.03, 0.075, 0.05, K, { r: CHEEK(0.05) });    // fluffy cheeks
    b.tube([[0, -0.035, -0.08], [0, -0.043, -0.16], [0, -0.048, -0.225]], [0.104, 0.09, 0.074], W, { seg: 12, len: 6, wide: 1.06, deep: 0.88 });     // white muzzle
    b.tube([[0, -0.01, -0.15], [0, 0.07, -0.149], [0, 0.13, -0.095], [0, 0.156, -0.02]], [0.044, 0.028, 0.018, 0.005], W, { seg: 8, len: 8, deep: 0.5, up: [0, 0, -1] });   // the white blaze up her forehead
    b.finish(0.2).ball(0.04, NOSE, 0, -0.026, -0.258, 1.25, 0.9, 0.85, { seg: 10 });
    for (const sx of [-1, 1]) {
      eye(b, sx * 0.07, 0.03, -0.126, 0.047, 0xa9652b, { white: 1, turn: sx * -0.3 });
      b.finish(FUR).ball(1, K, sx * 0.07, 0.1, -0.112, 0.036, 0.012, 0.024, { seg: 8, rz: sx * -0.18 });    // soft brows, clear of her eyes so they stay round and bright
    }
  });
  // her mouth hangs open in a pant, tongue lolling out
  const jaw = limb(head, 0, -0.088, -0.07, (b) => {
    b.finish(FUR).tube([[0, 0, 0], [0, -0.01, -0.075], [0, -0.014, -0.14]], [0.064, 0.055, 0.044], W, { seg: 10, len: 5, deep: 0.55 });
    b.finish(0.6).ball(1, 0x6a1c28, 0, 0.022, -0.075, 0.048, 0.012, 0.072, { seg: 8 });
    b.finish(0.4).tube([[0, 0.018, -0.03], [0, 0.02, -0.105], [0, 0.004, -0.16], [0, -0.06, -0.176]], [0.037, 0.038, 0.036, 0.031], TONGUE, { seg: 8, len: 9, deep: 0.32, up: [0, 1, 0] });
  });
  const ears = [-1, 1].map((sx) => limb(head, sx * 0.1, 0.09, 0.02, (b) => {      // pricked ears whose tips flop forwards
    b.finish(FUR).tube([[0, -0.035, 0], [sx * 0.03, 0.055, 0], [sx * 0.052, 0.108, -0.022], [sx * 0.062, 0.088, -0.078]], [0.068, 0.06, 0.044, 0.017], K, { seg: 8, len: 9, deep: 0.36, up: [0, 0, 1] });
    b.tube([[sx * 0.008, 0, -0.022], [sx * 0.03, 0.05, -0.022], [sx * 0.046, 0.085, -0.032]], [0.03, 0.03, 0.014], 0x40343c, { seg: 6, len: 5, deep: 0.3, up: [0, 0, 1] });
  }));
  const leg = (x, z, back) => {
    const hip = limb(body, x, back ? 0.412 : 0.378, z, (b) => {
      if (back) b.finish(FUR).tube([[0, 0.04, 0], [0, -0.07, -0.03], [0, -0.17, -0.045]], [0.098, 0.082, 0.05], K, { seg: 12, len: 7 });
      else b.finish(FUR).tube([[0, 0.05, 0], [0, -0.07, 0], [0, -0.18, 0.005]], [0.072, 0.06, 0.047], K, { seg: 10, len: 5 });
    });
    const knee = limb(hip, 0, back ? -0.17 : -0.18, back ? -0.045 : 0.005, (b) => {
      if (back) { b.finish(FUR).tube([[0, 0, 0], [0, -0.08, 0.05], [0, -0.2, 0.035]], [0.05, 0.042, 0.041], (t) => mix(K, W, sstep(0.4, 0.55, t)), { seg: 8, len: 7 }); paw(b, -0.205, 0.012, 0.058, W); }
      else { b.finish(FUR).tube([[0, 0, 0], [0, -0.09, 0], [0, -0.155, -0.004]], [0.047, 0.041, 0.043], W, { seg: 8, len: 5 }); paw(b, -0.16, -0.028, 0.058, W); }       // white socks
    });
    return { hip, knee };
  };
  const legs = [leg(-0.095, -0.2), leg(0.095, -0.2), leg(-0.105, 0.25, 1), leg(0.105, 0.25, 1)];
  // a plume of a tail with a white tip: one piece, which bends at three joints
  const tail = new Bendy(part((b) => {
    b.finish(FUR).tube([[0, 0.5, 0.38], [0, 0.496, 0.46], [0, 0.492, 0.53], [0, 0.492, 0.67], [0, 0.504, 0.77], [0, 0.537, 0.87]], [0.052, 0.07, 0.086, 0.099, 0.092, 0.084, 0.062, 0.018],
      (t, a) => mix(K, W, sstep(0.7, 0.765, t + 0.022 * Math.cos(a * 4))), { seg: 16, len: 22, deep: 1.16 });
  }), [[0, 0.5, 0.38], [0, -0.008, 0.15], [0, 0, 0.14]]);
  body.add(tail.mesh);
  return { root, body, head, jaw, ears, legs, tail: tail.joints, skin: tail, wag: 15, reach: 0.95 };
}
function buildPixel() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(part((b) => {
    b.finish(FUR);
    // black, with a white bib and tummy
    // (and a white patch on her back, a little to one side)
    const patch = (x, y, z) => sstep(1.12, 0.8, Math.hypot((x - 0.038) / 0.07, (z - 0.085) / 0.085)) * sstep(0.325, 0.345, y);
    b.tube([[0, 0.265, -0.15], [0, 0.288, -0.02], [0, 0.288, 0.1], [0, 0.265, 0.21]], [0.088, 0.114, 0.114, 0.106, 0.086],
      (t, a, x, y, z) => mix(mix(K, K_L, sstep(0.34, 0.4, y)), W, Math.max(sstep(-0.04, -0.11, z) * sstep(0.31, 0.25, y), sstep(0.215, 0.19, y), patch(x, y, z))), { seg: 24, len: 20, wide: 0.92 });
    b.tube([[0, 0.3, -0.13], [0, 0.4, -0.2]], [0.085, 0.08], (t, a, x, y, z) => mix(K, W, sstep(-0.14, -0.2, z - (y - 0.3) * 0.5)), { seg: 10, len: 3 });     // neck
    b.tuft(0, 0.27, -0.21, 0, -0.08, 0.012, 0.06, W);                                 // chest fluff
    b.finish(0.5).ring(0.083, 0.016, C.teal, 0, 0.368, -0.178, { seg: 16, tseg: 6, rx: -0.55 });      // collar and bell
    b.finish(0.28).ball(0.024, C.gold, 0, 0.318, -0.245, 1, 1, 1, { seg: 8 }).ball(0.009, 0x6b4a10, 0, 0.306, -0.262, 1, 1, 1, { seg: 5 });
  }));
  const head = limb(body, 0, 0.445, -0.225, (b) => {
    b.finish(FUR).ball(0.128, K, 0, 0, 0, 1.13, 0.95, 0.97, { seg: 18 });
    for (const sx of [-1, 1]) {
      for (const k of [0, 1]) b.finish(FUR).tuft(sx * 0.118, -0.012 - k * 0.035, -0.012, sx * (0.058 - k * 0.02), -0.03 - k * 0.032, 0.05, 0.04, K, { r: CHEEK(0.04) });      // cheek fluff
      b.ball(0.043, W, sx * 0.03, -0.05, -0.1, 1.12, 0.82, 0.8, { seg: 10 });                // whisker pads
      eye(b, sx * 0.058, 0.016, -0.104, 0.046, 0x8fdc50, { slit: 1, turn: sx * -0.3 });
      for (const k of [-1, 0, 1]) b.finish(0.5, 0.3).tube([[sx * 0.05, -0.048, -0.118], [sx * 0.125, -0.04 + k * 0.022, -0.105], [sx * 0.19, -0.046 + k * 0.05, -0.085]], [0.0045, 0.003, 0.0012], 0xffffff, { seg: 4, len: 4 });   // whiskers
    }
    b.finish(FUR).ball(0.034, W, 0, -0.078, -0.088, 1.1, 0.8, 0.9, { seg: 8 });     // chin
    b.tube([[0, -0.03, -0.122], [0, 0.04, -0.124], [0, 0.092, -0.088]], [0.03, 0.017, 0.005], W, { seg: 8, len: 6, deep: 0.5, up: [0, 0, -1] });     // blaze
    b.finish(0.3).ball(0.016, PINK, 0, -0.024, -0.143, 1.3, 0.8, 0.8, { seg: 6 });
  });
  const ears = [-1, 1].map((sx) => limb(head, sx * 0.076, 0.085, 0.0, (b) => {     // tall pointed ears, pink inside
    b.finish(FUR).tube([[0, -0.03, 0], [sx * 0.012, 0.05, 0], [sx * 0.024, 0.125, 0.004]], [0.06, 0.047, 0.007], K, { seg: 8, len: 7, deep: 0.4, up: [0, 0, 1], round: 0.4 });
    b.finish(0.6).tube([[sx * 0.002, 0, -0.016], [sx * 0.012, 0.045, -0.015], [sx * 0.021, 0.098, -0.007]], [0.036, 0.027, 0.004], PINK, { seg: 6, len: 5, deep: 0.3, up: [0, 0, 1], round: 0.4 });
  }));
  const leg = (x, z, back) => {
    const hip = limb(body, x, back ? 0.242 : 0.216, z, (b) => {
      if (back) b.finish(FUR).tube([[0, 0.03, 0], [0, -0.04, -0.02], [0, -0.1, -0.03]], [0.064, 0.054, 0.035], K, { seg: 10, len: 5 });
      else b.finish(FUR).tube([[0, 0.03, 0], [0, -0.05, 0], [0, -0.1, 0]], [0.044, 0.037, 0.031], K, { seg: 8, len: 5 });
    });
    const knee = limb(hip, 0, -0.1, back ? -0.03 : 0, (b) => {
      if (back) { b.finish(FUR).tube([[0, 0, 0], [0, -0.05, 0.03], [0, -0.116, 0.022]], [0.034, 0.029, 0.029], (t) => mix(K, W, sstep(0.38, 0.52, t)), { seg: 8, len: 7 }); paw(b, -0.12, 0.006, 0.037, W); }
      else { b.finish(FUR).tube([[0, 0, 0], [0, -0.088, 0]], [0.031, 0.03], (t) => mix(K, W, sstep(0.25, 0.42, t)), { seg: 8, len: 5 }); paw(b, -0.093, -0.014, 0.037, W); }
    });
    return { hip, knee };
  };
  const legs = [leg(-0.055, -0.115), leg(0.055, -0.115), leg(-0.06, 0.17, 1), leg(0.06, 0.17, 1)];
  // her tail, held high and curled over at the top like a question mark: one piece, which bends at five joints; the tip is white
  const tail = new Bendy(part((b) => {
    b.finish(FUR).tube([[0, 0.335, 0.205], [0, 0.762, 0.205]], [0.034, 0.033, 0.032, 0.031, 0.03, 0.029, 0.027, 0.021], (t) => mix(K, W, sstep(0.82, 0.88, t)), { seg: 10, len: 24 });
  }), [[0, 0.335, 0.205], [0, 0.085, 0], [0, 0.085, 0], [0, 0.085, 0], [0, 0.085, 0]]);
  body.add(tail.mesh);
  root.scale.setScalar(1.2);
  return { root, body, head, ears, legs, tail: tail.joints, skin: tail, wag: 5, reach: 1.05 };
}

// Just Izzi's head, for the giant Izzi who floats over her own world (izzihead.js). It still faces -Z.
export function buildIzziHead() {
  const iz = buildIzzi(), head = iz.head;
  head.parent.remove(head); head.position.set(0, 0, 0);
  return { head, jaw: iz.jaw, ears: iz.ears };
}
const KINDS = {
  izzi: { build: buildIzzi, lag: 1.55, off: -0.42, stay: 16, first: [14, 22], again: [45, 70], title: [-1.2, 0.35] },
  pixel: { build: buildPixel, lag: 2.5, off: 0.46, stay: 13, first: [50, 65], again: [60, 90], title: [1.05, 0.7] },
};

class Pet {
  constructor(kind) {
    Object.assign(this, KINDS[kind], KINDS[kind].build());
    this.kind = kind; this.ph = Math.random() * 6; this.y = 0; this.hop = 0; this.state = 'away'; this.timer = 0; this.k = 0; this.left = 0; this.twitch = 2;
  }
  // speed in m/s, air: off the ground
  animate(dt, t, speed, air) {
    const run = clamp(speed / 10, 0, 1), still = 1 - run, dog = this.kind === 'izzi';
    this.ph += dt * (11 + speed * 0.4) * (run > 0.05 ? 1 : 0);
    const ph = this.ph, A = this.reach * run;
    // a bounding run: the front pair land almost together, the back pair half a stride later, and each knee folds as its leg swings forwards
    for (let i = 0; i < 4; i++) {
      const L = this.legs[i], front = i < 2, p = ph + (front ? 0 : PI) + (i % 2) * 0.55;
      const hip = air ? (front ? 1.0 : -0.9) : A * Math.sin(p) + (front ? 0.06 : -0.04) * run;
      const knee = air ? (front ? -0.3 : -0.15) : -(0.12 + 1.1 * Math.max(0, Math.cos(p))) * run;
      L.hip.rotation.x = damp(L.hip.rotation.x, hip, 22, dt); L.knee.rotation.x = damp(L.knee.rotation.x, knee, 22, dt);
    }
    const pitch = air ? 0.12 : Math.sin(ph + 0.8) * 0.09 * run;
    this.body.position.y = air ? 0 : Math.abs(Math.sin(ph)) * 0.05 * run + Math.sin(t * 2.2 + this.wag) * 0.004 * still;
    this.body.rotation.x = pitch;
    // the head stays level while the body rocks; standing still, they look about and tilt their heads
    this.head.rotation.set(-pitch * 0.8 + Math.sin(ph + 1.2) * 0.05 * run, Math.sin(t * 1.3 + this.wag) * 0.16 * still, Math.sin(t * 0.8 + this.wag * 2) * 0.12 * still);
    const sweep = air ? 0.5 : 0.3 * run;          // ears swept back by the wind
    if (dog) {
      this.ears.forEach((e, i) => { e.rotation.x = sweep + Math.sin(ph + 0.5 + i * 0.4) * 0.22 * run; e.rotation.z = (i ? 1 : -1) * Math.sin(ph * 0.5 + i) * 0.06 * run; });
      this.jaw.rotation.x = 0.12 + 0.07 * Math.sin(t * (9 + run * 6));              // panting
      // a big wag when she is standing, a streaming plume when she runs; each length follows the one before
      const wag = 0.6 - 0.3 * run, lift = -0.5 + 0.38 * run - (air ? 0.25 : 0);
      this.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * this.wag - i * 0.9) * wag * (i ? 0.75 : 1); g.rotation.x = i ? -0.14 + Math.sin(ph - i * 0.8) * 0.08 * run : lift; });
    } else {
      // every so often an ear flicks
      this.twitch -= dt; if (this.twitch < -0.18) this.twitch = 1.5 + Math.random() * 3;
      const flick = this.twitch < 0 ? Math.sin((-this.twitch / 0.18) * PI) : 0, which = Math.floor(this.wag + t * 0.31) % 2;
      this.ears.forEach((e, i) => { e.rotation.x = sweep * 0.8; e.rotation.z = (i ? -1 : 1) * (0.12 + (i === which ? flick * 0.35 : 0)); });
      // her tail is held high and sways from the root to the tip like a question mark; running, it streams back a little
      const back = 0.45 + 0.3 * run + (air ? 0.25 : 0);
      this.tail.forEach((g, i) => { g.rotation.x = (i ? CURL[i] : back) + Math.sin(t * 3.1 - i * 0.7) * 0.06; g.rotation.z = Math.sin(t * this.wag * 0.6 - i * 0.7) * (0.09 + i * 0.045); });
    }
    this.skin.update();
  }
}

export class Pets {
  constructor(scene) {
    this.list = [new Pet('izzi'), new Pet('pixel')];
    for (const p of this.list) scene.add(p.root);
    this.hist = [];
    this.onEvent = null;   // (kind, 'join' | 'leave')
    this.reset();
  }
  reset() {
    this.hist.length = 0;
    for (const p of this.list) { p.state = 'away'; p.timer = rand(...p.first); p.root.visible = false; p.y = 0; p.hop = 0; }
  }
  get(kind) { return this.list.find((p) => p.kind === kind); }
  has(kind) { return this.get(kind).state === 'with'; }
  frac(kind) { const p = this.get(kind); return p.state === 'with' ? p.left / p.stay : 0; }
  // Where Robyn was when she had covered distance d.
  sample(d, fx, fy) {
    const h = this.hist;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].d <= d) {
      const a = h[i], b = h[i + 1];
      if (!b) return [a.x, a.y];
      const k = clamp((d - a.d) / Math.max(1e-4, b.d - a.d), 0, 1);
      return [lerp(a.x, b.x, k), lerp(a.y, b.y, k)];
    }
    return h.length ? [h[0].x, h[0].y] : [fx, fy];
  }
  // ctx: { mode, dist, x, y, speed, busy (on the rocket or in the warp tunnel), floorAt(x, s) }
  update(dt, t, ctx) {
    const run = ctx.mode === 'run';
    if (run) { this.hist.push({ d: ctx.dist, x: ctx.x, y: ctx.y }); while (this.hist.length > 2 && this.hist[1].d < ctx.dist - 14) this.hist.shift(); }
    for (const p of this.list) {
      if (ctx.mode === 'title') {
        // on the title screen they trot along either side of her
        p.root.visible = true; p.root.position.set(ctx.x + p.title[0], 0, p.title[1]); p.animate(dt, t, ctx.speed, false);
        continue;
      }
      if (!run) { if (p.root.visible) p.animate(dt, t, 0, false); continue; }
      if (ctx.busy) { if (p.state !== 'away') { const was = p.state; p.state = 'away'; p.timer = rand(5, 9); p.root.visible = false; if (was !== 'out' && this.onEvent) this.onEvent(p.kind, 'leave'); } continue; }
      let lag = p.lag;
      if (p.state === 'away') {
        p.root.visible = false;
        // (they wait their turn: not while something else is going on, and one of them at a time)
        if ((p.timer -= dt) > 0 || ctx.hold || this.list.some((q) => q !== p && q.state !== 'away')) continue;
        p.state = 'in'; p.k = 0; if (this.onEvent) this.onEvent(p.kind, 'join');
      }
      if (p.state === 'in') { p.k += dt / 0.9; lag = lerp(9, p.lag, smooth(p.k)); if (p.k >= 1) { p.state = 'with'; p.left = p.stay; } }
      else if (p.state === 'with') { if ((p.left -= dt) <= 0) { p.state = 'out'; p.k = 0; if (this.onEvent) this.onEvent(p.kind, 'leave'); } }
      else if (p.state === 'out') { p.k += dt / 1.2; lag = lerp(p.lag, 11, p.k * p.k); if (p.k >= 1) { p.state = 'away'; p.timer = rand(...p.again); p.root.visible = false; continue; } }
      const d = ctx.dist - lag, [hx, hy] = this.sample(d, ctx.x, ctx.y);
      const x = hx + p.off, over = ctx.floorAt(x, d) < -1 && hy < 0.6;      // skip over a gap Robyn glided across
      p.hop = damp(p.hop, over ? 1.0 : 0, 14, dt);
      const y = Math.max(0, hy) + p.hop;
      p.root.visible = true; p.root.position.set(x, y, lag);
      p.animate(dt, t, ctx.speed, hy > 0.25 && ctx.floorAt(hx, d) < hy - 0.2 || p.hop > 0.3);
    }
  }
}

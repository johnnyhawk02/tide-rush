// Robyn's pets, who join her run every so often: Izzi the border collie and Pixel the black and white cat.
// They follow the exact path Robyn took a moment ago, so they dodge and jump everything she did.
import * as THREE from 'three';
import { Builder, C, MAT } from './kit.js';
import { clamp, damp, lerp, smooth } from './config.js';

const PI = Math.PI, K = 0x1d1d23, W = 0xf7f5ef, PINK = 0xf59aa8;
const rand = (a, b) => a + Math.random() * (b - a);
function part(fn) { const b = new Builder(0.86); fn(b); return b.build({ cast: true, receive: false, material: MAT.glossy }); }
function limb(parent, x, y, z, fn) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(part(fn)); parent.add(g); return g; }

// Both animals are built facing -Z, like Robyn.
function buildIzzi() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(part((b) => {
    b.sph(0.19, K, 0, 0.44, 0.03, 0.95, 0.95, 2.1, { seg: 12 });               // black back and sides
    b.sph(0.17, W, 0, 0.4, -0.27, 0.95, 1.0, 1.1, { seg: 10 });                // white chest
    b.sph(0.19, W, 0, 0.5, -0.29, 1.03, 0.92, 0.55, { seg: 10 });              // the white ruff round her neck
    b.sph(0.13, W, 0, 0.32, 0.0, 0.8, 0.5, 1.9, { seg: 8 });                   // pale tummy
    b.sph(0.175, K, 0, 0.47, 0.3, 1.0, 1.0, 0.9, { seg: 10 });                 // haunches
    for (const sx of [-1, 1]) b.cap(0.04, 0.12, K, sx * 0.1, 0.36, 0.43, 0.5, 0, 0);   // feathery fur behind the back legs
    b.tor(0.118, 0.022, C.red, 0, 0.56, -0.33, 1.15, 0, 0, { seg: 12 }).sph(0.03, C.gold, 0, 0.46, -0.41, 1, 1, 0.5);   // collar and tag
  }));
  const head = limb(body, 0, 0.66, -0.42, (b) => {
    b.sph(0.135, K, 0, 0, 0, 1, 0.95, 1.05, { seg: 12 });
    b.sph(0.05, W, 0, 0.055, -0.095, 0.55, 1.4, 1.1, { seg: 8 });              // white blaze up her forehead
    b.sph(0.085, W, 0, -0.045, -0.14, 0.9, 0.75, 1.5, { seg: 10 });            // white muzzle
    b.sph(0.032, 0x15151a, 0, -0.02, -0.265, 1.2, 0.9, 0.9, { seg: 8 });       // nose
    b.box(0.05, 0.012, 0.1, 0xf07f95, 0, -0.105, -0.2, 0.3, 0, 0);             // tongue out
    for (const sx of [-1, 1]) b.sph(0.024, 0x6b3f1d, sx * 0.062, 0.025, -0.115, 1, 1, 0.6, { seg: 7, grad: 1 }).sph(0.008, 0xffffff, sx * 0.066, 0.034, -0.132, 1, 1, 1, { seg: 5, grad: 1 });
  });
  const ears = [-1, 1].map((sx) => limb(head, sx * 0.085, 0.09, 0.02, (b) => {
    b.cone(0.055, 0.13, K, 0, 0.05, -0.012, -0.45, 0, sx * -0.3, { seg: 5 });   // half-pricked ears, tipped forward
  }));
  const leg = (x, z) => limb(body, x, 0.36, z, (b) => {
    b.cap(0.045, 0.14, K, 0, -0.1, 0).cap(0.036, 0.1, W, 0, -0.24, 0).sph(0.05, W, 0, -0.33, -0.015, 1, 0.6, 1.35, { seg: 7 });      // white socks
  });
  const legs = [leg(-0.1, -0.26), leg(0.1, -0.26), leg(-0.11, 0.3), leg(0.11, 0.3)];
  const tail = limb(body, 0, 0.5, 0.4, (b) => {
    b.cap(0.048, 0.2, K, 0, -0.035, 0.12, 1.85, 0, 0).cap(0.06, 0.12, K, 0, -0.06, 0.3, 1.45, 0, 0).sph(0.064, W, 0, -0.035, 0.43, 1, 1, 1.25, { seg: 8 });   // a plume of a tail with a white tip
  });
  return { root, body, head, ears, legs, tail, wag: 15, hip: 0.36 };
}
function buildPixel() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(part((b) => {
    b.sph(0.12, K, 0, 0.28, 0.02, 0.95, 0.95, 2.0, { seg: 12 });
    b.sph(0.1, W, 0, 0.25, -0.16, 0.9, 1.0, 1.0, { seg: 9 });                  // white bib
    b.sph(0.085, W, 0, 0.21, 0.0, 0.8, 0.5, 1.7, { seg: 8 });                  // white tummy
    b.sph(0.08, W, 0.07, 0.34, 0.1, 0.9, 0.7, 1.2, { seg: 8 });                // a white patch on her back
    b.tor(0.075, 0.016, C.teal, 0, 0.36, -0.2, 1.2, 0, 0, { seg: 10 }).sph(0.022, C.gold, 0, 0.29, -0.26);   // collar and bell
  }));
  const head = limb(body, 0, 0.44, -0.25, (b) => {
    b.sph(0.115, K, 0, 0, 0, 1.05, 0.92, 0.95, { seg: 12 });
    b.sph(0.06, W, 0, -0.035, -0.085, 1.2, 0.7, 0.9, { seg: 8 }).sph(0.035, W, 0, 0.03, -0.09, 0.5, 1.3, 0.8, { seg: 6 });   // white muzzle and blaze
    b.sph(0.014, PINK, 0, -0.018, -0.138, 1.2, 0.8, 1, { seg: 5 });
    for (const sx of [-1, 1]) {
      b.sph(0.03, 0x9be05a, sx * 0.052, 0.02, -0.09, 1, 1.1, 0.5, { seg: 8, grad: 1 }).sph(0.012, 0x101014, sx * 0.052, 0.02, -0.105, 0.5, 1.6, 0.5, { seg: 5, grad: 1 });   // green eyes
      b.cone(0.05, 0.11, K, sx * 0.07, 0.115, 0.0, 0, 0, sx * -0.2, { seg: 4 }).cone(0.028, 0.065, PINK, sx * 0.07, 0.105, -0.02, 0, 0, sx * -0.2, { seg: 4 });               // pointy ears
      for (const a of [-0.2, 0.15]) b.box(0.14, 0.006, 0.006, 0xffffff, sx * 0.1, -0.03 + a * 0.1, -0.1, 0, sx * 0.3, sx * a);                                                // whiskers
    }
  });
  const leg = (x, z) => limb(body, x, 0.22, z, (b) => {
    b.cap(0.03, 0.09, K, 0, -0.07, 0).cap(0.028, 0.04, W, 0, -0.15, 0).sph(0.035, W, 0, -0.2, -0.01, 1, 0.6, 1.25, { seg: 6 });
  });
  const legs = [leg(-0.06, -0.14), leg(0.06, -0.14), leg(-0.065, 0.17), leg(0.065, 0.17)];
  const tail = limb(body, 0, 0.33, 0.24, (b) => {
    b.cap(0.028, 0.16, K, 0, 0.1, 0.03, 0.25, 0, 0).cap(0.026, 0.14, K, 0, 0.28, 0.06, -0.1, 0, 0).sph(0.034, W, 0, 0.39, 0.05, 1, 1.2, 1, { seg: 7 });   // tail held high, white tip
  });
  root.scale.setScalar(1.22);
  return { root, body, head, ears: [], legs, tail, wag: 5, hip: 0.22 };
}

const KINDS = {
  izzi: { build: buildIzzi, lag: 1.55, off: -0.42, stay: 16, first: [14, 22], again: [45, 70], title: [-1.2, 0.35] },
  pixel: { build: buildPixel, lag: 2.5, off: 0.46, stay: 13, first: [50, 65], again: [60, 90], title: [1.05, 0.7] },
};

class Pet {
  constructor(kind) {
    Object.assign(this, KINDS[kind], KINDS[kind].build());
    this.kind = kind; this.ph = Math.random() * 6; this.y = 0; this.hop = 0; this.state = 'away'; this.timer = 0; this.k = 0; this.left = 0;
  }
  // speed in m/s, air: off the ground
  animate(dt, t, speed, air) {
    const run = clamp(speed / 10, 0, 1);
    this.ph += dt * (11 + speed * 0.4) * (run > 0.05 ? 1 : 0);
    const ph = this.ph, L = this.legs, A = 0.95 * run;
    const tgt = air ? [1.0, 1.0, -0.9, -0.9] : [A * Math.sin(ph), A * Math.sin(ph + 0.55), A * Math.sin(ph + PI), A * Math.sin(ph + PI + 0.55)];
    for (let i = 0; i < 4; i++) L[i].rotation.x = damp(L[i].rotation.x, tgt[i], 22, dt);
    this.body.position.y = air ? 0 : Math.abs(Math.sin(ph)) * 0.05 * run;
    this.body.rotation.x = air ? 0.12 : Math.sin(ph + 0.8) * 0.09 * run;
    this.head.rotation.x = Math.sin(ph + 1.2) * 0.07 * run; this.head.rotation.y = Math.sin(t * 1.3 + this.wag) * 0.12 * (1 - run);
    for (const e of this.ears) e.rotation.x = Math.sin(ph * 1 + 0.5) * 0.25 * run;
    if (this.kind === 'izzi') { this.tail.rotation.y = Math.sin(t * this.wag) * 0.55; this.tail.rotation.x = -0.3 * run; }
    else { this.tail.rotation.z = Math.sin(t * this.wag) * 0.22; this.tail.rotation.x = Math.sin(t * 3.1) * 0.1 - 0.35 * run; }
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

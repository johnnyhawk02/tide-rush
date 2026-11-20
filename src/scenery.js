// Scenery prefabs and the thirteen levels: the Promenade, the Grand Pier, the Old Harbour, the Midnight Funfair, Storm Point,
// Sandcastle Bay, Smugglers' Cove, Frosty Pier, the Sewers, Space Pier, Christmas Pier, Marshmallow Shore and Spiral Bay (in zone-id order; config.js sets the order they are played in).
// Chunk-local coordinates: x across, z from 0 (near end) to -CHUNK (far end).
import * as THREE from 'three';
import { Builder, C, MAT, makeRng, pick, signMesh, puffTexture, brickTexture } from './kit.js';
import { CHUNK, DECK_HALF, WATER_Y, ZONE_CHUNKS, lerp } from './config.js';
import { crateInto, chestInto, crystalInto, ratInto, alienInto, giftInto, caneInto, mallowInto, donutInto, lollyInto, cupcakeInto, painted, helix, swirlDisc, swirlWheelInto, coilInto, turretInto, SAND, SAND_D } from './obstacles.js';

const PI = Math.PI;
const cache = new Map();
function prefab(name, make) {
  if (!cache.has(name)) cache.set(name, make());
  return cache.get(name).clone();
}
function place(parent, obj, x, y, z, ry = 0, s = 1) {
  obj.position.set(x, y, z); obj.rotation.y = ry; if (s !== 1) obj.scale.setScalar(s);
  parent.add(obj);
  return obj;
}
const PIER_GREEN = 0x1f5a55;
const shadeHex = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// ---------- shared furniture ----------
const lamp = () => prefab('lamp', () => {
  const b = new Builder(0.8);
  b.cyl(0.17, 0.22, 0.28, PIER_GREEN, 0, 0.14, 0).cyl(0.1, 0.15, 0.5, PIER_GREEN, 0, 0.5, 0).cyl(0.13, 0.13, 0.06, C.gold, 0, 0.78, 0);
  b.cyl(0.05, 0.075, 3.3, PIER_GREEN, 0, 2.4, 0, 0, 0, 0, { seg: 8 }).sph(0.1, C.gold, 0, 4.08, 0);
  b.box(1.3, 0.055, 0.055, PIER_GREEN, 0, 3.92, 0).cone(0.06, 0.22, PIER_GREEN, 0, 4.26, 0);
  for (const sx of [-1, 1]) {
    b.tor(0.2, 0.022, PIER_GREEN, sx * 0.32, 3.72, 0, 0, 0, 0, { arc: PI, seg: 8 });
    b.cyl(0.015, 0.015, 0.14, PIER_GREEN, sx * 0.6, 3.84, 0);
    b.cone(0.19, 0.14, PIER_GREEN, sx * 0.6, 3.76, 0).cyl(0.14, 0.09, 0.3, 0xfff1c2, sx * 0.6, 3.54, 0, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 });
    b.cyl(0.1, 0.06, 0.06, PIER_GREEN, sx * 0.6, 3.36, 0, 0, 0, 0, { seg: 8 });
  }
  // hanging flower basket
  b.dome(0.26, 0x6b4a2f, 0, 2.55, 0.34, PI, 0, 0, 1, 1, 1, { seg: 10 }).cyl(0.012, 0.012, 0.4, C.iron, 0, 2.8, 0.34).box(0.03, 0.03, 0.36, PIER_GREEN, 0, 3.0, 0.17);
  for (let i = 0; i < 7; i++) b.sph(0.1, [C.pink, C.rose, C.yellow, C.leaf][i % 4], Math.cos(i * 0.9) * 0.16, 2.62 + (i % 3) * 0.04, 0.34 + Math.sin(i * 0.9) * 0.16, 1, 0.8, 1, { seg: 6 });
  return b.build({ cast: true });
});

const rail40 = () => prefab('rail40', () => {
  const b = new Builder(0.86);
  for (let i = 0; i < CHUNK / 2; i++) {
    const z = -1 - i * 2, big = i % 5 === 0;
    b.box(big ? 0.14 : 0.09, big ? 1.22 : 1.08, big ? 0.14 : 0.09, C.white, 0, big ? 0.61 : 0.54, z);
    if (big) b.sph(0.1, PIER_GREEN, 0, 1.3, z, 1, 1, 1, { seg: 8 });
    else for (const dz of [-0.5, 0.5]) b.box(0.035, 0.66, 0.035, C.white, 0, 0.6, z + dz * 1.0);
  }
  b.box(0.16, 0.07, CHUNK, 0x2a7a72, 0, 1.1, -CHUNK / 2).box(0.05, 0.05, CHUNK, C.white, 0, 0.93, -CHUNK / 2).box(0.05, 0.05, CHUNK, C.white, 0, 0.27, -CHUNK / 2);
  b.box(0.06, 0.14, CHUNK, C.white, 0, 0.09, -CHUNK / 2);
  return b.build({ cast: true });
});

const under40 = () => prefab('under40', () => {
  const b = new Builder(0.6);
  for (const sx of [-1, 1]) b.box(0.3, 0.45, CHUNK, C.woodDeep, sx * (DECK_HALF - 0.4), -0.5, -CHUNK / 2);
  b.box(0.25, 0.4, CHUNK, C.woodDeep, 0, -0.48, -CHUNK / 2);
  for (let i = 0; i < 8; i++) b.box(DECK_HALF * 2, 0.3, 0.22, C.woodDark, 0, -0.42, -2.5 - i * 5);
  for (let i = 0; i < 4; i++) {
    const z = -5 - i * 10;
    for (const sx of [-1, 1]) {
      b.cyl(0.22, 0.25, 4.6, 0x5a4634, sx * (DECK_HALF - 0.5), -2.9, z, 0, 0, 0, { seg: 8 });
      b.cyl(0.27, 0.27, 0.5, 0x3d4a3f, sx * (DECK_HALF - 0.5), WATER_Y + 0.15, z, 0, 0, 0, { seg: 8 });   // weed line
    }
    b.box(DECK_HALF * 2 - 1, 0.25, 0.25, C.woodDeep, 0, -0.85, z);
    b.box(8.4, 0.14, 0.14, C.woodDark, 0, -1.7, z + 0.1, 0, 0, 0.2).box(8.4, 0.14, 0.14, C.woodDark, 0, -1.7, z - 0.1, 0, 0, -0.2);
  }
  return b.build({ receive: false });
});

const bunting20 = () => prefab('bunting20', () => {
  const b = new Builder(1);
  const cols = [C.red, C.yellow, C.teal, C.pink, C.white, C.blue, C.orange];
  const N = 18;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
    const y = (t) => -4 * 0.5 * t * (1 - t);
    const z0 = -t0 * 20, z1 = -t1 * 20;
    b.box(0.015, 0.015, Math.hypot(20 / N, y(t1) - y(t0)), C.rope, 0, (y(t0) + y(t1)) / 2, (z0 + z1) / 2, Math.atan2(y(t1) - y(t0), 20 / N), 0, 0);
    b.flat([[[0, y(t0), z0 - 0.12], [0, y(t1), z1 + 0.12], [0, y(tm) - 0.46, (z0 + z1) / 2]]], cols[i % cols.length]);
  }
  return b.build({ material: MAT.double, receive: false });
});

const bench = () => prefab('bench', () => {
  const b = new Builder(0.85);
  for (let i = 0; i < 4; i++) b.box(0.1, 0.035, 1.7, C.woodLight, -0.2 + i * 0.13, 0.46, 0);
  for (let i = 0; i < 3; i++) b.box(0.035, 0.1, 1.7, C.woodLight, -0.28 - i * 0.03, 0.62 + i * 0.14, 0);
  for (const sz of [-1, 1]) {
    b.box(0.5, 0.05, 0.06, PIER_GREEN, -0.05, 0.42, sz * 0.75).box(0.05, 0.42, 0.06, PIER_GREEN, 0.17, 0.21, sz * 0.75).box(0.05, 0.95, 0.06, PIER_GREEN, -0.3, 0.475, sz * 0.75, 0, 0, 0.12);
    b.tor(0.13, 0.025, PIER_GREEN, -0.03, 0.6, sz * 0.75, 0, 0, 0, { arc: PI, seg: 8 });
  }
  return b.build({ cast: true });
});

const lifeRing = () => prefab('lifering', () => {
  const b = new Builder(0.9);
  b.box(0.12, 1.7, 0.12, C.white, 0, 0.85, 0).box(0.7, 0.8, 0.06, C.red, 0, 1.35, 0.08).box(0.74, 0.06, 0.1, C.white, 0, 1.78, 0.08);
  b.tor(0.26, 0.075, C.white, 0, 1.35, 0.15, 0, 0, 0, { seg: 16 });
  for (let a = 0; a < 4; a++) b.tor(0.26, 0.078, C.orange, 0, 1.35, 0.15, 0, 0, a * PI / 2 + 0.4, { arc: 0.75, seg: 5 });
  return b.build({ cast: true });
});

const telescope = () => prefab('telescope', () => {
  const b = new Builder(0.85);
  b.cyl(0.2, 0.24, 0.1, C.iron, 0, 0.05, 0).cyl(0.07, 0.09, 1.2, C.steel, 0, 0.7, 0).box(0.26, 0.26, 0.2, C.blue, 0, 1.4, 0);
  b.cyl(0.085, 0.1, 0.5, C.blue, 0, 1.46, 0.3, PI / 2 - 0.15, 0, 0).cyl(0.105, 0.105, 0.05, C.gold, 0, 1.5, 0.55, PI / 2 - 0.15, 0, 0).box(0.1, 0.06, 0.04, C.gold, 0, 1.25, 0.11);
  return b.build({ cast: true });
});

const planter = () => prefab('planter', () => {
  const b = new Builder(0.85);
  b.box(1.5, 0.5, 0.7, C.woodDark, 0, 0.25, 0).box(1.56, 0.07, 0.76, C.wood, 0, 0.5, 0).box(1.4, 0.05, 0.6, 0x4a3a2c, 0, 0.52, 0);
  for (let i = 0; i < 9; i++) b.sph(0.17, C.leaf, -0.56 + i * 0.14, 0.62 + (i % 2) * 0.05, (i % 3 - 1) * 0.16, 1, 0.8, 1, { seg: 6 });
  for (let i = 0; i < 12; i++) b.sph(0.065, [C.pink, C.yellow, C.red, C.white][i % 4], -0.6 + i * 0.11, 0.78 + (i % 3) * 0.03, ((i * 7) % 5 - 2) * 0.1, 1, 1, 1, { seg: 5, grad: 1 });
  return b.build({ cast: true });
});

const kiosk = (col, text) => prefab('kiosk' + col + text, () => {
  const b = new Builder(0.85);
  const stripe = (x) => (Math.floor((x + 20) / 0.3) % 2 ? col : C.white);
  b.cyl(1.5, 1.5, 0.2, C.woodDark, 0, 0.1, 0, 0, 0, 0, { seg: 8 }).cyl(1.3, 1.3, 2.4, C.cream, 0, 1.4, 0, 0, 0, 0, { seg: 8 });
  b.cyl(1.36, 1.36, 0.9, col, 0, 0.65, 0, 0, 0, 0, { seg: 8 }).cyl(1.42, 1.42, 0.08, C.white, 0, 1.12, 0, 0, 0, 0, { seg: 8 });
  b.box(1.0, 0.9, 0.1, C.glassDark, 0, 1.7, 1.2).box(1.3, 0.08, 0.5, C.white, 0, 1.2, 1.35);
  const roof = new THREE.ConeGeometry(1.9, 1.1, 8, 1, true).toNonIndexed();
  b.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? col : C.white), 0, 3.15, 0, 0, PI / 8, 0);
  b.cyl(1.9, 1.9, 0.1, col, 0, 2.6, 0, 0, PI / 8, 0, { seg: 8 }).sph(0.16, C.gold, 0, 3.78, 0).cyl(0.02, 0.02, 0.6, C.gold, 0, 4.1, 0);
  b.flat([[[0, 4.4, 0], [0, 4.1, 0], [0.5, 4.25, 0]]], C.red);
  b.add(new THREE.BoxGeometry(1.6, 0.4, 0.06, 6, 1, 1), stripe, 0, 2.38, 1.3, 0.2, 0, 0);
  const g = new THREE.Group(); const m = b.build({ cast: true, material: MAT.double }); g.add(m);
  const s = signMesh(text, 1.5, 0.38, '#fff3d6', '#1c3b5a', '#e5383b'); s.position.set(0, 2.82, 1.62); s.rotation.x = -0.25; g.add(s);
  return g;
});

// ---------- promenade ----------
function windowInto(b, x, y, w, h, lit, rng) {
  b.box(w, h, 0.08, lit ? 0xffe9a8 : (rng() < 0.5 ? C.glassDark : 0x4a7088), x, y, 0.02, 0, 0, 0, lit ? { glow: true, grad: 0.9 } : { grad: 0.8 });
  b.box(w + 0.18, 0.09, 0.14, C.white, x, y + h / 2 + 0.04, 0.03).box(w + 0.26, 0.08, 0.2, C.white, x, y - h / 2 - 0.04, 0.05);
  for (const sx of [-1, 1]) b.box(0.09, h, 0.14, C.white, x + sx * (w / 2 + 0.04), y, 0.03);
  b.box(0.04, h, 0.1, C.white, x, y, 0.04).box(w, 0.04, 0.1, C.white, x, y + h * 0.12, 0.04);
}
const SHOPS = [
  { w: 8, floors: 2, wall: 0xfff0c9, awn: C.navy, sign: 'FISH & CHIPS', roof: 'gable', rc: C.slate },
  { w: 8, floors: 3, wall: 0xffc7d9, awn: C.rose, sign: 'ICES', roof: 'flat', rc: C.slate, top: 'cone' },
  { w: 8, floors: 2, wall: 0xb8ead8, awn: C.teal, sign: 'ROCK SHOP', roof: 'gable', rc: C.brick },
  { w: 10, floors: 3, wall: 0xffe08a, awn: C.red, sign: 'PENNY ARCADE', roof: 'flat', rc: C.slate, top: 'bulbs' },
  { w: 10, floors: 2, wall: 0xd9cdf2, awn: 0x7e62c4, sign: 'TEA ROOMS', roof: 'gable', rc: C.slate },
  { w: 10, floors: 3, wall: 0xa9dcf2, awn: C.blue, sign: 'BUCKETS & SPADES', roof: 'gable', rc: C.brick },
  { w: 12, floors: 4, wall: 0xfdf6ea, awn: 0x2a7a72, sign: 'SEA VIEW HOTEL', roof: 'flat', rc: C.slate, top: 'hotel', balcony: true },
  { w: 12, floors: 3, wall: 0xffb59e, awn: C.navy, sign: 'THE WHELK & ANCHOR', roof: 'gable', rc: C.slate },
  { w: 12, floors: 2, wall: 0xc9e6b0, awn: C.leaf, sign: 'SURF & KITES', roof: 'gable', rc: C.brick },
];
function shop(i) {
  return prefab('shop' + i, () => {
    const o = SHOPS[i], rng = makeRng(100 + i * 31), b = new Builder(0.86);
    const w = o.w - 0.25, d = 9, gh = 3.2, fh = 2.7, h = gh + (o.floors - 1) * fh;
    b.box(w, h, d, o.wall, 0, h / 2, -d / 2).box(w + 0.12, 0.45, d + 0.12, C.stoneDark, 0, 0.225, -d / 2);
    // shopfront
    const dx = -w / 2 + 1.0;
    b.box(1.05, 2.2, 0.1, o.awn, dx, 1.3, 0.03).box(0.7, 0.9, 0.12, C.glass, dx, 1.75, 0.04).box(0.06, 0.16, 0.14, C.gold, dx + 0.35, 1.2, 0.05);
    const wx0 = dx + 0.95, wx1 = w / 2 - 0.45, ww = wx1 - wx0, wc = (wx0 + wx1) / 2;
    b.box(ww, 1.9, 0.08, 0x3c6076, wc, 1.5, 0.02).box(ww + 0.2, 0.12, 0.2, C.white, wc, 0.5, 0.05).box(ww + 0.2, 0.1, 0.16, C.white, wc, 2.5, 0.04);
    const nm = Math.max(2, Math.round(ww / 1.6));
    for (let k = 0; k <= nm; k++) b.box(0.08, 1.9, 0.14, C.white, wx0 + (ww * k) / nm, 1.5, 0.04);
    for (let k = 0; k < nm; k++) b.box(ww / nm * 0.6, 0.5, 0.3, [C.pink, C.yellow, C.aqua, C.coral][k % 4], wx0 + (ww * (k + 0.5)) / nm, 0.86, -0.2, 0, 0, 0, { grad: 1 }); // window display
    // awning
    const stripe = (x) => (Math.floor((x + 40) / 0.42) % 2 ? o.awn : C.white);
    b.add(new THREE.BoxGeometry(w - 0.6, 0.06, 1.7, Math.round(w / 0.42), 1, 1), stripe, 0.1, 2.72, 0.8, 0.28, 0, 0, 1, 1, 1, { grad: 1 });
    b.add(new THREE.BoxGeometry(w - 0.6, 0.26, 0.04, Math.round(w / 0.42), 1, 1), stripe, 0.1, 2.38, 1.63, 0, 0, 0, 1, 1, 1, { grad: 1 });
    b.box(w - 0.4, 0.75, 0.14, o.awn, 0, gh + 0.15, 0.04);
    // upper floors
    const n = Math.max(2, Math.floor(w / 2.3));
    for (let f = 1; f < o.floors; f++) {
      const y = gh + (f - 1) * fh + 1.55;
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + (w * (k + 0.5)) / n;
        windowInto(b, x, y, 1.0, 1.4, rng() < 0.25, rng);
        if (o.balcony) {
          b.box(1.7, 0.08, 0.7, C.white, x, y - 0.85, 0.35);
          b.box(1.7, 0.05, 0.05, o.awn, x, y - 0.2, 0.68);
          for (let q = -3; q <= 3; q++) b.box(0.04, 0.62, 0.04, C.white, x + q * 0.27, y - 0.5, 0.68);
        }
      }
      b.box(w + 0.1, 0.1, 0.12, C.white, 0, gh + (f - 1) * fh + 0.55, 0.03);
    }
    b.box(w + 0.35, 0.22, d + 0.35, C.white, 0, h + 0.05, -d / 2);
    if (o.roof === 'gable') {
      b.prism(d + 0.5, 2.3, w + 0.3, o.rc, 0, h + 0.16, -d / 2, PI / 2);
      for (const sx of [-1, 1]) { b.box(0.7, 2.2, 0.7, C.brick, sx * (w / 2 - 1.0), h + 1.6, -d / 2 - 1.0); b.cyl(0.14, 0.17, 0.4, 0xd98a5a, sx * (w / 2 - 1.0), h + 2.9, -d / 2 - 1.0); }
      // dormer
      b.box(1.5, 1.2, 1.6, o.wall, 0, h + 1.0, -1.7).prism(1.8, 0.7, 1.9, o.rc, 0, h + 1.6, -1.7).box(0.9, 0.8, 0.06, C.glassDark, 0, h + 1.0, -0.88);
    } else {
      b.box(w, 0.6, 0.25, o.wall, 0, h + 0.4, -0.12).box(w + 0.2, 0.12, 0.35, C.white, 0, h + 0.74, -0.12);
      b.box(1.4, 1.2, 1.4, C.stone, w / 2 - 1.6, h + 0.6, -d / 2).box(0.5, 1.6, 0.5, C.brick, -w / 2 + 1.2, h + 0.8, -d + 1.2);
    }
    if (o.top === 'cone') {
      b.cone(0.75, 2.0, C.woodLight, 0, h + 1.8, -1.3, PI, 0, 0).sph(0.82, C.pink, 0, h + 3.1, -1.3).sph(0.66, C.cream, 0, h + 3.95, -1.3).sph(0.2, C.red, 0, h + 4.65, -1.3);
      b.cyl(0.05, 0.05, 1.0, C.woodDark, 0.35, h + 4.3, -1.3, 0, 0, -0.4);
    }
    if (o.top === 'bulbs') {
      for (let k = 0; k < 13; k++) b.sph(0.13, k % 2 ? 0xffe27a : 0xff7a7a, -w / 2 + 0.5 + (k * (w - 1)) / 12, h + 0.95, 0.02, 1, 1, 1, { glow: true, grad: 1, seg: 6 });
      b.box(3.6, 2.0, 0.3, C.red, 0, h + 1.9, -0.6).cyl(1.0, 1.0, 0.32, C.yellow, 0, h + 2.9, -0.6, PI / 2, 0, 0, { seg: 16 }).cyl(0.7, 0.7, 0.36, C.red, 0, h + 2.9, -0.6, PI / 2, 0, 0, { seg: 16 });
    }
    if (o.top === 'hotel') {
      b.cyl(0.04, 0.04, 2.6, C.white, 0, h + 2.0, -1.0).flat([[[0, h + 3.3, -1.0], [0, h + 2.6, -1.0], [1.2, h + 2.95, -1.0]]], C.red);
      b.box(2.4, 0.9, 0.2, C.navy, 0, h + 1.2, -0.3);
    }
    const g = new THREE.Group(); g.add(b.build({ material: MAT.double }));
    const s = signMesh(o.sign, Math.min(w - 0.8, 6.5), 0.62, '#fff3d6', '#22365c', '#ffc928'); s.position.set(0, gh + 0.15, 0.13); g.add(s);
    return g;
  });
}
const promGround = () => prefab('promGround', () => {
  const b = new Builder(0.75);
  b.box(46, 3.6, CHUNK, 0x8f918d, DECK_HALF + 23, -1.8 - 0.02, -CHUNK / 2);
  b.box(2.9, 0.06, CHUNK, 0xcfc8b6, DECK_HALF + 1.45, 0.01, -CHUNK / 2, 0, 0, 0, { grad: 1 });
  for (let i = 0; i < 20; i++) b.box(2.9, 0.012, 0.05, 0xa8a293, DECK_HALF + 1.45, 0.045, -1 - i * 2, 0, 0, 0, { grad: 1 });
  b.box(0.3, 0.12, CHUNK, 0xe6e0d0, DECK_HALF + 0.15, 0.03, -CHUNK / 2);
  // big stone blocks on the sea wall face
  for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) b.box(0.05, 0.9, 3.85, k % 2 ? 0x84867f : 0x9b9d97, DECK_HALF - 0.01, -0.6 - k * 0.95, -2 - i * 4 + (k % 2) * 2 - 1, 0, 0, 0, { grad: 0.9 });
  return b.build();
});
const backRow = (v) => prefab('backrow' + v, () => {
  const rng = makeRng(900 + v), b = new Builder(0.8);
  b.box(30, 6, CHUNK, 0x7ea36a, 34, 1.2, -CHUNK / 2, 0, 0, 0.3);   // hillside
  const cols = [0xf3e6cf, 0xe9c9b0, 0xcfe0e6, 0xf2d9a0, 0xd9c3dc, 0xc9d9b8];
  let z = -2;
  while (z > -CHUNK + 4) {
    const w = 5 + rng() * 4, h = 9 + rng() * 6, x = 21.5 + rng() * 3;
    b.box(7, h, w, pick(rng, cols), x, h / 2, z - w / 2);
    b.prism(7.4, 2.2, w + 0.3, rng() < 0.5 ? C.slate : C.brick, x, h, z - w / 2);
    for (let f = 0; f < Math.floor(h / 3) - 1; f++) for (let k = 0; k < 2; k++) b.box(0.1, 1.2, 0.9, C.glassDark, x - 3.52, 5 + f * 2.8, z - w * (0.3 + k * 0.4));
    z -= w + 0.3;
  }
  if (v === 0) { b.box(4, 16, 4, 0xd8d2c4, 30, 12, -20).cone(3.2, 7, C.slate, 30, 23.5, -20, 0, PI / 4, 0, { seg: 4 }).cyl(0.9, 0.9, 0.2, C.white, 27.95, 16, -20, 0, 0, PI / 2); }
  for (let i = 0; i < 7; i++) { const x = 28 + rng() * 10, zz = -rng() * CHUNK, y = 5.5 + (x - 28) * 0.3; b.cyl(0.25, 0.3, 2, C.woodDark, x, y + 1, zz).sph(1.8 + rng(), i % 2 ? C.leaf : C.green, x, y + 3.4, zz, 1, 1.1, 1, { seg: 7 }); }
  return b.build({ receive: false });
});
const cafeSet = () => prefab('cafe', () => {
  const b = new Builder(0.85);
  b.cyl(0.5, 0.5, 0.05, C.white, 0, 0.75, 0).cyl(0.04, 0.04, 0.75, C.steel, 0, 0.375, 0).cyl(0.25, 0.28, 0.04, C.steel, 0, 0.02, 0);
  b.cyl(0.03, 0.03, 1.7, C.white, 0, 1.6, 0);
  const par = new THREE.ConeGeometry(1.25, 0.5, 8, 1, true).toNonIndexed();
  b.add(par, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.coral : C.cream), 0, 2.55, 0);
  for (const sx of [-1, 1]) b.at(sx * 0.85, 0, 0, sx > 0 ? -PI / 2 : PI / 2, () => {
    b.box(0.42, 0.04, 0.42, C.aqua, 0, 0.45, 0).box(0.42, 0.5, 0.04, C.aqua, 0, 0.72, -0.2);
    for (const a of [-1, 1]) for (const c of [-1, 1]) b.box(0.035, 0.45, 0.035, C.steel, a * 0.18, 0.225, c * 0.18);
  });
  b.cyl(0.06, 0.05, 0.12, C.red, 0.15, 0.84, 0.1).cyl(0.06, 0.05, 0.12, C.yellow, -0.18, 0.84, -0.05);
  return b.build({ cast: true, material: MAT.double });
});
const pillarBox = () => prefab('pillarbox', () => {
  const b = new Builder(0.85);
  b.cyl(0.3, 0.32, 0.12, C.black, 0, 0.06, 0).cyl(0.27, 0.27, 1.25, C.red, 0, 0.74, 0).cyl(0.31, 0.31, 0.08, C.red, 0, 1.38, 0).dome(0.3, C.red, 0, 1.42, 0, 0, 0, 0, 1, 0.45, 1);
  b.box(0.3, 0.05, 0.03, C.black, 0, 1.1, 0.265).box(0.22, 0.26, 0.02, C.white, 0, 0.82, 0.27);
  return b.build({ cast: true });
});
const groyne = () => prefab('groyne', () => {
  const b = new Builder(0.7);
  for (let i = 0; i < 14; i++) { const h = 2.6 - i * 0.12; b.cyl(0.2, 0.22, h + 2, 0x5c4a38, -i * 1.25, WATER_Y + h / 2 - 1, (i % 2) * 0.12, 0, 0, 0, { seg: 7 }); }
  b.box(17, 0.5, 0.14, 0x6b563f, -8, WATER_Y + 0.9, 0.2, 0, 0, -0.05);
  b.cyl(0.07, 0.07, 2.6, C.woodDark, -16.5, WATER_Y + 2, 0).box(0.5, 0.5, 0.06, C.red, -16.5, WATER_Y + 3.2, 0, 0, 0, PI / 4);
  return b.build({ receive: false });
});
const rowBoat = (col) => prefab('rowboat' + col, () => {
  const b = new Builder(0.8);
  b.dome(1, (x, y) => (y > -0.12 ? col : C.white), 0, 0.35, 0, 0, 0, 0, 0.75, 0.6, 2.0, { t0: PI / 2, tl: PI / 2, seg: 12 });
  b.add(new THREE.TorusGeometry(1, 0.06, 5, 16), C.woodDark, 0, 0.35, 0, PI / 2, 0, 0, 0.75, 2.0, 1);
  b.add(new THREE.CylinderGeometry(1, 1, 0.04, 14), 0x8a6a48, 0, 0.12, 0, 0, 0, 0, 0.6, 1, 1.8);
  for (const z of [-0.8, 0.1, 0.9]) b.box(1.3, 0.06, 0.26, C.woodLight, 0, 0.3, z);
  for (const sx of [-1, 1]) b.box(0.06, 0.04, 2.4, C.woodLight, sx * 0.9, 0.48, 0.2, 0.08, sx * 0.25, 0);
  return b.build({ receive: false });
});
const buoy = (col) => prefab('buoy' + col, () => {
  const b = new Builder(0.8);
  b.cyl(0.55, 0.7, 0.5, col, 0, 0.15, 0).cone(0.55, 1.1, col, 0, 0.95, 0).cyl(0.05, 0.05, 0.6, C.iron, 0, 1.7, 0).sph(0.12, 0xfff3a0, 0, 2.05, 0, 1, 1, 1, { glow: true, grad: 1 });
  b.cyl(0.72, 0.72, 0.1, C.white, 0, 0.42, 0);
  return b.build({ receive: false });
});
const dinghy = (col) => prefab('dinghy' + col, () => {
  const b = new Builder(0.85);
  b.dome(1, C.white, 0, 0.45, 0, 0, 0, 0, 0.8, 0.7, 2.3, { t0: PI / 2, tl: PI / 2, seg: 12 });
  b.add(new THREE.CylinderGeometry(1, 1, 0.05, 14), C.woodLight, 0, 0.4, 0, 0, 0, 0, 0.76, 1, 2.25);
  b.cyl(0.05, 0.05, 5.4, C.woodLight, 0, 3.1, -0.3).box(0.06, 0.06, 2.6, C.woodLight, 0, 1.0, 1.0);
  b.flat([[[0, 5.6, -0.25], [0, 1.1, -0.25], [0, 1.1, 2.3]], [[0, 4.8, -0.36], [0, 1.0, -2.1], [0, 1.0, -0.36]]], col);
  return b.build({ material: MAT.double, receive: false });
});
const rocks = () => prefab('rocks', () => {
  const b = new Builder(0.7), rng = makeRng(5);
  for (let i = 0; i < 7; i++) b.add(new THREE.DodecahedronGeometry(0.9 + rng() * 1.3), i % 2 ? 0x6f7477 : 0x858a8c, (rng() - 0.5) * 6, WATER_Y + rng() * 0.6, (rng() - 0.5) * 5, rng() * 3, rng() * 3, 0, 1, 0.7, 1);
  return b.build({ receive: false });
});

// ---------- pier ----------
const sidePlatform = () => prefab('sideplat', () => {
  // a 13 x 16 deck that juts out from the pier (built for the right-hand side; mirror for the left)
  const b = new Builder(0.8), W = 13, D = 16, x0 = DECK_HALF;
  b.box(W, 0.3, D, 0xa9855a, x0 + W / 2, -0.16, 0);
  for (let i = 0; i < 16; i++) b.box(W, 0.012, 0.05, 0x7a5d3e, x0 + W / 2, 0.0, -D / 2 + 0.5 + i, 0, 0, 0, { grad: 1 });
  for (const ix of [2, 11]) for (const iz of [-6, 0, 6]) b.cyl(0.25, 0.28, 4.4, 0x5a4634, x0 + ix, -2.5, iz, 0, 0, 0, { seg: 8 });
  // railings on three sides
  const post = (x, z) => b.box(0.1, 1.1, 0.1, C.white, x, 0.55, z);
  for (let i = 0; i <= 6; i++) { post(x0 + 1 + i * 2, -D / 2 + 0.1); post(x0 + 1 + i * 2, D / 2 - 0.1); }
  for (let i = 0; i <= 8; i++) post(x0 + W - 0.1, -D / 2 + i * 2);
  for (const z of [-D / 2 + 0.1, D / 2 - 0.1]) b.box(W - 0.5, 0.07, 0.14, 0x2a7a72, x0 + W / 2 + 0.2, 1.1, z).box(W - 0.5, 0.05, 0.05, C.white, x0 + W / 2 + 0.2, 0.6, z);
  b.box(0.14, 0.07, D, 0x2a7a72, x0 + W - 0.1, 1.1, 0).box(0.05, 0.05, D, C.white, x0 + W - 0.1, 0.6, 0);
  return b.build({ cast: false });
});
function ferris() {
  const key = 'ferris';
  if (!cache.has(key)) {
    const g = new THREE.Group(), R = 8.5, HUB = 10.5;
    const b = new Builder(0.85);
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) b.box(0.4, 11.6, 0.4, C.white, sx * 2.6, HUB / 2, sz * 1.5, 0, 0, sx * 0.245);
    for (const sz of [-1, 1]) b.box(5.6, 0.3, 0.3, C.white, 0, 3.4, sz * 1.5).box(8.4, 0.4, 0.6, C.navy, 0, 0.2, sz * 1.5);
    b.cyl(0.5, 0.5, 3.6, C.red, 0, HUB, 0, PI / 2, 0, 0).box(3, 2.2, 2.4, C.coral, -3.6, 1.1, 0).prism(3.4, 0.9, 2.8, C.white, -3.6, 2.2, 0, PI / 2);
    g.add(b.build({ material: MAT.double }));
    const wheel = new THREE.Group(); wheel.position.y = HUB; wheel.name = 'wheel';
    const wb = new Builder(1);
    for (const sz of [-1, 1]) {
      wb.tor(R, 0.14, C.white, 0, 0, sz * 0.9, 0, 0, 0, { seg: 36 }).tor(R * 0.55, 0.08, C.white, 0, 0, sz * 0.9, 0, 0, 0, { seg: 28 });
      for (let i = 0; i < 12; i++) wb.box(0.1, R, 0.1, i % 2 ? C.red : C.white, Math.sin(i * PI / 6) * R / 2, Math.cos(i * PI / 6) * R / 2, sz * 0.9, 0, 0, -i * PI / 6);
    }
    for (let i = 0; i < 12; i++) {
      wb.cyl(0.07, 0.07, 1.9, C.steel, Math.sin(i * PI / 6) * R, Math.cos(i * PI / 6) * R, 0, PI / 2, 0, 0, { seg: 6 });
      wb.sph(0.2, i % 2 ? 0xffe27a : 0xff8a8a, Math.sin((i + 0.5) * PI / 6) * R, Math.cos((i + 0.5) * PI / 6) * R, 1.0, 1, 1, 1, { glow: true, seg: 6 });
    }
    wheel.add(wb.build());
    const cols = [C.red, C.yellow, C.teal, C.pink, C.blue, C.orange];
    for (let i = 0; i < 12; i++) {
      const gb = new Builder(0.85), col = cols[i % 6];
      gb.cyl(0.03, 0.03, 0.7, C.steel, 0, -0.35, 0).cyl(0.75, 0.6, 0.8, col, 0, -1.3, 0, 0, 0, 0, { seg: 10 }).cone(0.95, 0.45, C.white, 0, -0.55, 0, 0, 0, 0, { seg: 10 });
      gb.cyl(0.78, 0.78, 0.08, C.white, 0, -0.92, 0, 0, 0, 0, { seg: 10 });
      const gm = gb.build(); gm.position.set(Math.sin(i * PI / 6) * R, Math.cos(i * PI / 6) * R, 0); gm.name = 'gondola';
      wheel.add(gm);
    }
    g.add(wheel);
    cache.set(key, g);
  }
  return cache.get(key).clone();
}
const helter = () => prefab('helter', () => {
  const b = new Builder(0.85), H = 11;
  const stripe = (x, y, z) => (Math.floor(((Math.atan2(z, x) + PI) / (PI * 2)) * 8 + y * 0.5) % 2 ? C.red : C.cream);
  b.add(new THREE.CylinderGeometry(1.7, 2.6, H, 24, 12), stripe, 0, H / 2, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  b.cyl(2.1, 1.8, 0.4, C.navy, 0, H + 0.2, 0, 0, 0, 0, { seg: 16 }).cyl(1.5, 1.5, 1.4, C.cream, 0, H + 1.1, 0, 0, 0, 0, { seg: 12 });
  b.cone(2.2, 2.2, C.navy, 0, H + 2.9, 0, 0, 0, 0, { seg: 12 }).sph(0.25, C.gold, 0, H + 4.1, 0).cyl(0.03, 0.03, 1.4, C.gold, 0, H + 4.8, 0);
  b.flat([[[0, H + 5.5, 0], [0, H + 5.0, 0], [0.9, H + 5.25, 0]]], C.yellow);
  // spiral slide
  const N = 44;
  for (let i = 0; i < N; i++) {
    const t = i / N, a = t * PI * 5, y = H - 0.5 - t * (H - 1.2), r = 1.7 + (0.9 * t) + 0.75;
    b.box(1.2, 0.1, 1.15, C.yellow, Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, 0, { grad: 1 });
    b.box(0.08, 0.5, 1.15, C.teal, Math.cos(a) * (r + 0.6), y + 0.25, Math.sin(a) * (r + 0.6), 0, -a, 0, { grad: 1 });
  }
  b.box(1.2, 2.0, 0.2, C.navy, 0, 1.0, 2.55).box(1.5, 0.3, 0.3, C.gold, 0, 2.2, 2.55);
  return b.build({ material: MAT.double });
});
function carousel() {
  const key = 'carousel';
  if (!cache.has(key)) {
    const g = new THREE.Group(), b = new Builder(0.85);
    b.cyl(4.2, 4.4, 0.4, C.red, 0, 0.2, 0, 0, 0, 0, { seg: 20 }).cyl(0.5, 0.5, 4.2, C.cream, 0, 2.4, 0);
    const roof = new THREE.ConeGeometry(4.8, 2.2, 16, 1, true).toNonIndexed();
    b.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.red : C.cream), 0, 5.6, 0);
    b.cyl(4.8, 4.8, 0.45, C.gold, 0, 4.4, 0, 0, 0, 0, { seg: 16, open: true }).sph(0.35, C.gold, 0, 6.9, 0);
    for (let i = 0; i < 16; i++) b.sph(0.14, 0xfff0a0, Math.cos(i * PI / 8) * 4.82, 4.4, Math.sin(i * PI / 8) * 4.82, 1, 1, 1, { glow: true, seg: 6 });
    g.add(b.build({ material: MAT.double }));
    const spin = new THREE.Group(); spin.name = 'spin';
    const sb = new Builder(0.85), cols = [C.white, C.pink, C.aqua, C.yellow];
    for (let i = 0; i < 8; i++) sb.at(Math.cos(i * PI / 4) * 3.2, 0.4 + (i % 2) * 0.5, Math.sin(i * PI / 4) * 3.2, -i * PI / 4, () => {
      sb.cyl(0.04, 0.04, 4, C.gold, 0, 2 - (i % 2) * 0.5, 0, 0, 0, 0, { seg: 6 });
      sb.cap(0.3, 0.8, cols[i % 4], 0, 1.1, 0, PI / 2, 0, 0).cap(0.16, 0.5, cols[i % 4], 0, 1.55, -0.62, -0.6, 0, 0).cap(0.14, 0.3, cols[i % 4], 0, 1.85, -0.92, PI / 2 - 0.3, 0, 0);
      for (const sx of [-1, 1]) for (const z of [-0.4, 0.4]) sb.cyl(0.07, 0.05, 0.7, cols[i % 4], sx * 0.15, 0.55, z, z < 0 ? -0.4 : 0.4, 0, 0, { seg: 6 });
      sb.box(0.5, 0.08, 0.5, C.red, 0, 1.42, 0.1).cap(0.06, 0.4, C.gold, 0, 1.2, 0.72, 0.9, 0, 0);
    });
    spin.add(sb.build());
    g.add(spin);
    cache.set(key, g);
  }
  return cache.get(key).clone();
}
const pavilion = () => prefab('pavilion', () => {
  const b = new Builder(0.85);
  b.box(10, 5, 11, 0xfdf3df, 0, 2.5, 0).box(10.4, 0.4, 11.4, C.white, 0, 5.2, 0).box(10.3, 0.5, 11.3, 0x2a7a72, 0, 0.25, 0);
  for (let i = 0; i < 4; i++) {
    const z = -4.1 + i * 2.75;
    b.box(0.12, 3.0, 1.7, C.glassDark, -5.02, 2.3, z).cyl(0.85, 0.85, 0.12, C.glassDark, -5.02, 3.8, z, 0, 0, PI / 2, { seg: 12 }).box(0.2, 4.4, 0.3, C.white, -5.05, 2.4, z + 1.37);
  }
  b.box(0.2, 4.4, 0.3, C.white, -5.05, 2.4, -5.47);
  for (const sz of [-1, 1]) {
    b.cyl(1.5, 1.5, 1.6, 0xfdf3df, -3.4, 6.2, sz * 3.9, 0, 0, 0, { seg: 10 }).sph(1.6, 0x2a7a72, -3.4, 7.3, sz * 3.9, 1, 1.25, 1, { seg: 12 }).cone(0.25, 1.6, C.gold, -3.4, 9.8, sz * 3.9);
  }
  b.sph(2.6, 0x2a7a72, 0.5, 5.6, 0, 1, 0.9, 1, { seg: 14 }).cyl(0.3, 0.3, 1.0, C.gold, 0.5, 8.3, 0).sph(0.4, C.gold, 0.5, 9.0, 0);
  const g = new THREE.Group(); g.add(b.build());
  const s = signMesh('PAVILION', 5.5, 0.9, '#22365c', '#fff3d6', '#ffc928'); s.position.set(-5.13, 4.7, 0); s.rotation.y = -PI / 2; g.add(s);
  return g;
});

// ---------- harbour ----------
const quay = () => prefab('quay', () => {
  const b = new Builder(0.75);
  b.box(50, 3.8, CHUNK, 0x9b9e99, DECK_HALF + 25, -1.92, -CHUNK / 2);
  b.box(0.5, 0.04, CHUNK, C.yellow, DECK_HALF + 0.6, 0.0, -CHUNK / 2, 0, 0, 0, { grad: 1 });
  for (let i = 0; i < 5; i++) {
    const z = -4 - i * 8;
    b.cyl(0.24, 0.3, 0.5, C.iron, DECK_HALF + 0.6, 0.25, z).sph(0.3, C.iron, DECK_HALF + 0.6, 0.55, z, 1, 0.5, 1);
    b.cyl(0.55, 0.55, 0.5, C.rubber, DECK_HALF - 0.05, -1.2, z + 4, PI / 2, 0, PI / 2, { seg: 10 });   // tyre fenders
  }
  for (let i = 0; i < 4; i++) b.box(30, 0.012, 0.06, 0x80837f, DECK_HALF + 16, 0.0, -5 - i * 10, 0, 0, 0, { grad: 1 });
  return b.build();
});
const warehouse = (col, text) => prefab('warehouse' + col + text, () => {
  const b = new Builder(0.85), w = 15, d = 13, h = 6.5;
  b.box(d, h, w, col, 0, h / 2, 0);
  for (let i = 0; i < 30; i++) b.box(0.06, h, 0.2, col, -d / 2 - 0.02, h / 2, -w / 2 + 0.25 + i * 0.5, 0, 0, 0, { grad: 0.72 });
  b.prism(d + 0.6, 2.6, w + 0.6, 0x5a6470, 0, h, 0);
  b.box(0.16, 4.4, 5.2, 0x3a4652, -d / 2 - 0.04, 2.2, 1.5).box(0.2, 0.25, 6.2, C.iron, -d / 2 - 0.06, 4.55, 1.5);
  for (let i = 0; i < 5; i++) b.box(0.2, 4.3, 0.1, 0x2c3640, -d / 2 - 0.1, 2.2, -0.9 + i * 1.2);
  b.box(0.12, 1.1, 1.6, C.glassDark, -d / 2 - 0.03, 4.0, -4.6).box(0.16, 0.1, 1.8, C.white, -d / 2 - 0.05, 3.42, -4.6);
  b.cyl(0.3, 0.3, 1.4, C.steel, 2, h + 2.2, -3).cone(0.42, 0.4, C.steel, 2, h + 3.1, -3);
  const g = new THREE.Group(); g.add(b.build());
  const s = signMesh(text, 6, 1.0, '#fff3d6', '#22365c', '#e5383b'); s.position.set(-d / 2 - 0.16, 5.6, 0.5); s.rotation.y = -PI / 2; g.add(s);
  return g;
});
const crane = () => prefab('crane', () => {
  const b = new Builder(0.85), Y = C.yellow;
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) b.box(0.6, 12, 0.6, Y, sx * 3.5, 6, sz * 3.5);
  for (const sz of [-1, 1]) { b.box(7.6, 0.5, 0.5, Y, 0, 11.8, sz * 3.5).box(8.6, 0.25, 0.25, Y, 0, 6, sz * 3.5, 0, 0, 0.95).box(0.5, 0.5, 7.6, Y, sz * 3.5, 11.8, 0).box(0.25, 0.25, 8.6, Y, sz * 3.5, 6, 0, 0.95, 0, 0); }
  b.box(5, 2.6, 5, 0x3a4652, 0, 13.4, 0).box(2.2, 1.8, 2.4, C.white, -2.8, 13.2, 1.6).box(0.1, 1.0, 2.0, C.glassDark, -3.92, 13.4, 1.6);
  b.box(22, 0.9, 0.9, Y, -8, 16.5, 0, 0, 0, -0.25).box(0.5, 6, 0.5, Y, 0, 17.5, 0).box(11, 0.2, 0.2, C.iron, -5, 19.3, 0, 0, 0, -0.52).box(7, 0.7, 0.7, Y, 4.5, 15.2, 0);
  b.box(2.5, 2, 2.2, C.stoneDark, 6.5, 14.2, 0).cyl(0.04, 0.04, 9, C.iron, -17.5, 14.3, 0).box(0.5, 0.6, 0.3, C.iron, -17.5, 9.6, 0).tor(0.3, 0.07, C.iron, -17.5, 9.0, 0, 0, 0, PI, { arc: PI * 1.3, seg: 8 });
  for (let i = 0; i < 8; i++) b.box(1.3, 0.14, 0.14, Y, -15.5 + i * 2.4, 14.6 + i * 0.61 - 0.45 + 0.6, 0.38, 0, 0, i % 2 ? 0.6 : -1.1);
  return b.build({ receive: false });
});
const containerPile = (v) => prefab('cpile' + v, () => {
  const b = new Builder(0.8), rng = makeRng(40 + v), cols = [0x2f7fb6, 0xc65a3a, 0x3f9a78, 0xd9a13a, 0x7a4f9a, 0xb9433f, 0x4a6fa8];
  const one = (x, y, z, col, ry) => b.at(x, y, z, ry, () => {
    b.box(2.4, 2.5, 6.0, col, 0, 1.25, 0);
    for (let i = 0; i < 12; i++) for (const sx of [-1, 1]) b.box(0.05, 2.3, 0.2, col, sx * 1.21, 1.25, -2.75 + i * 0.5, 0, 0, 0, { grad: 0.7 });
    b.box(2.44, 0.1, 6.04, col, 0, 2.5, 0, 0, 0, 0, { grad: 0.6 }).box(0.04, 2.2, 0.04, C.iron, 0, 1.25, 3.02);
  });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const hgt = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < hgt; k++) one(c * 2.7, k * 2.52, -r * 6.4, pick(rng, cols), (rng() - 0.5) * 0.04);
  }
  return b.build({ receive: false });
});
function trawler(col) {
  return prefab('trawler' + col, () => {
    const b = new Builder(0.82);
    b.dome(1, (x, y) => (y > 0.7 ? C.white : y > -0.1 ? col : 0x7a2f2a), 0, 1.3, 0, 0, 0, 0, 1.9, 1.7, 6.2, { t0: PI / 2, tl: PI / 2, seg: 16 });
    b.add(new THREE.TorusGeometry(1, 0.05, 5, 20), C.woodDark, 0, 1.3, 0, PI / 2, 0, 0, 1.9, 6.2, 2.4);
    b.add(new THREE.CylinderGeometry(1, 1, 0.08, 18), 0x9a7a54, 0, 1.2, 0, 0, 0, 0, 1.82, 1, 6.1);
    b.box(2.3, 2.2, 3.0, C.white, 0, 2.3, 1.6).box(2.6, 0.14, 3.4, col, 0, 3.45, 1.6).box(2.0, 0.6, 0.06, C.glassDark, 0, 2.8, 0.08);
    for (const sx of [-1, 1]) b.box(0.06, 0.6, 2.2, C.glassDark, sx * 1.16, 2.8, 1.5);
    b.box(1.2, 1.0, 1.2, C.white, 0, 4.0, 2.0).cyl(0.2, 0.25, 1.2, C.red, 0.5, 4.4, 2.9).cyl(0.06, 0.06, 5.5, C.woodLight, 0, 4.2, -1.6).box(0.08, 0.08, 4.4, C.woodLight, 0, 3.6, -3.4, 0.5, 0, 0);
    b.cyl(0.6, 0.6, 1.5, 0x3a8a80, 0, 1.65, -3.4, 0, 0, PI / 2, { seg: 10 });                // net drum
    for (let i = 0; i < 5; i++) b.sph(0.22, i % 2 ? C.orange : C.yellow, -1.2 + i * 0.6, 1.5, -4.6 + (i % 2) * 0.3, 1, 1, 1, { seg: 6 });
    b.at(0.9, 1.25, -1.0, 0.3, () => crateInto(b, 0.9, 0.6, 0.8));
    b.tor(0.3, 0.09, C.orange, -1.2, 2.4, 1.6, 0, PI / 2, 0, { seg: 10 }).sph(0.1, C.red, 0, 7.0, -1.6, 1, 1, 1, { glow: true });
    for (const sx of [-1, 1]) for (const z of [-2, 0.5, 3]) b.sph(0.35, 0x2c2f33, sx * 1.75, 0.9, z, 0.5, 1, 1, { seg: 6 });   // fenders
    return b.build({ receive: false });
  });
}
const lighthouse = () => prefab('lighthouse', () => {
  const b = new Builder(0.85);
  const stripe = (x, y) => (Math.floor((y + 30) / 4) % 2 ? C.red : C.white);
  for (let i = 0; i < 9; i++) b.add(new THREE.DodecahedronGeometry(3 + (i % 3)), i % 2 ? 0x6f7477 : 0x858a8c, Math.cos(i * 0.7) * 5, WATER_Y + 0.3, Math.sin(i * 0.7) * 5, i, i * 2, 0, 1, 0.6, 1);
  b.add(new THREE.CylinderGeometry(2.0, 3.2, 20, 16, 10), stripe, 0, 10.5, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  b.cyl(3.0, 3.0, 0.4, C.iron, 0, 20.7, 0, 0, 0, 0, { seg: 16 }).cyl(1.6, 1.6, 2.6, 0xfff3b0, 0, 22.2, 0, 0, 0, 0, { glow: true, grad: 0.8, seg: 10 });
  b.cone(2.3, 2.0, C.red, 0, 24.5, 0, 0, 0, 0, { seg: 12 }).sph(0.35, C.gold, 0, 25.7, 0);
  for (let i = 0; i < 12; i++) b.box(0.08, 1.0, 0.08, C.iron, Math.cos(i * PI / 6) * 2.9, 21.4, Math.sin(i * PI / 6) * 2.9);
  b.tor(2.9, 0.06, C.iron, 0, 21.9, 0, PI / 2, 0, 0, { seg: 16 }).box(1.2, 2.2, 0.3, C.navy, 0, 1.6, 3.15);
  return b.build({ receive: false });
});
const netRack = () => prefab('netrack', () => {
  const b = new Builder(0.85);
  for (const sz of [-1, 1]) b.box(0.14, 2.6, 0.14, C.woodDark, 0, 1.3, sz * 2.2);
  b.box(0.12, 0.12, 4.8, C.woodDark, 0, 2.55, 0);
  b.add(new THREE.BoxGeometry(0.06, 2.0, 4.2, 1, 4, 10), (x, y, z, i) => (i % 3 ? 0x2f8f86 : 0x3fb0a4), 0, 1.45, 0, 0, 0, 0.12);
  for (let i = 0; i < 6; i++) b.sph(0.2, i % 2 ? C.orange : C.red, 0.3, 0.2, -2 + i * 0.8, 1, 1, 1, { seg: 6 });
  b.at(1.2, 0, 1.0, 0.4, () => crateInto(b, 1.0, 0.8, 1.0)).at(1.4, 0, -0.6, -0.2, () => crateInto(b, 0.8, 0.6, 0.8));
  return b.build({ cast: true });
});

// ---------- midnight funfair ----------
const BULBS = [0xffe27a, 0xff8ab0, 0x8ff0ff, 0xa6ff9a];
const FUN_PURPLE = 0x6a2fb0;
const bulbArch = () => prefab('bulbarch', () => {
  const b = new Builder(0.85), RX = 4.3, RY = 2.5, Y0 = 5.2;
  for (const sx of [-1, 1]) {
    b.box(0.5, 0.6, 0.5, C.navy, sx * RX, 0.3, 0).cyl(0.12, 0.15, 4.7, FUN_PURPLE, sx * RX, 2.9, 0, 0, 0, 0, { seg: 8 }).sph(0.2, C.gold, sx * RX, 5.3, 0);
    for (let i = 0; i < 6; i++) b.sph(0.085, BULBS[i % 4], sx * RX, 1.0 + i * 0.72, 0.16, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  }
  b.add(new THREE.TorusGeometry(RX, 0.1, 6, 30, PI), FUN_PURPLE, 0, Y0, 0, 0, 0, 0, 1, RY / RX, 1);
  b.add(new THREE.TorusGeometry(RX - 0.5, 0.05, 6, 30, PI), C.gold, 0, Y0, 0, 0, 0, 0, 1, (RY - 0.4) / (RX - 0.5), 1);
  for (let i = 1; i < 24; i++) { const a = (PI * i) / 24; b.sph(0.1, BULBS[i % 4], Math.cos(a) * RX, Y0 + Math.sin(a) * RY, 0.14, 1, 1, 1, { glow: true, seg: 6, grad: 1 }); }
  // a glowing star at the top
  b.sph(0.26, 0xfff3b0, 0, Y0 + RY + 0.5, 0, 1, 1, 0.5, { glow: true, seg: 8, grad: 1 });
  for (let i = 0; i < 5; i++) { const a = (i * PI * 2) / 5 + PI / 2; b.cone(0.13, 0.5, 0xffe27a, Math.cos(a) * 0.42, Y0 + RY + 0.5 + Math.sin(a) * 0.42, 0, 0, 0, a - PI / 2, { glow: true, seg: 4, grad: 1 }); }
  return b.build({ cast: false });
});
const bigTop = () => prefab('bigtop', () => {
  const b = new Builder(0.85), R = 5.4;
  const stripe = (x, y, z) => (Math.floor(((Math.atan2(z, x) + PI) / (PI * 2)) * 16) % 2 ? C.red : C.cream);
  b.add(new THREE.CylinderGeometry(R, R, 3.4, 32, 1, true), stripe, 0, 1.7, 0, 0, 0, 0, 1, 1, 1, { grad: 0.85 });
  const roof = new THREE.ConeGeometry(R + 0.7, 4.6, 16, 1, true).toNonIndexed();
  b.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.red : C.cream), 0, 5.7, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  b.cyl(R + 0.7, R + 0.7, 0.5, C.gold, 0, 3.5, 0, 0, 0, 0, { seg: 16, open: true });
  for (let i = 0; i < 20; i++) b.sph(0.14, BULBS[i % 4], Math.cos(i * PI / 10) * (R + 0.74), 3.3, Math.sin(i * PI / 10) * (R + 0.74), 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  b.cyl(0.08, 0.08, 2.4, C.gold, 0, 9.0, 0).flat([[[0, 10.2, 0], [0, 9.5, 0], [1.3, 9.85, 0]]], C.yellow).sph(0.22, C.gold, 0, 8.05, 0);
  // entrance facing -x (toward the boardwalk when placed on the right)
  b.box(0.4, 2.6, 2.4, 0x2a1238, -R + 0.05, 1.3, 0).box(0.3, 0.5, 3.2, C.gold, -R - 0.1, 2.85, 0);
  for (const sz of [-1, 1]) b.box(0.3, 3.0, 0.3, C.navy, -R - 0.1, 1.5, sz * 1.45);
  const g = new THREE.Group(); g.add(b.build({ material: MAT.double }));
  const s = signMesh('BIG TOP', 3.0, 0.5, '#22365c', '#fff3d6', '#ffc928'); s.position.set(-R - 0.27, 2.85, 0); s.rotation.y = -PI / 2; g.add(s);
  return g;
});
function swingRide() {
  const key = 'swing';
  if (!cache.has(key)) {
    const g = new THREE.Group(), b = new Builder(0.85);
    b.cyl(3.2, 3.5, 0.4, C.navy, 0, 0.2, 0, 0, 0, 0, { seg: 18 });
    b.add(new THREE.CylinderGeometry(0.5, 0.65, 7, 12, 8), (x, y) => (Math.floor(y / 0.875) % 2 ? C.cream : C.rose), 0, 3.9, 0);
    g.add(b.build());
    const spin = new THREE.Group(); spin.name = 'spin';
    const sb = new Builder(0.88);
    const roof = new THREE.ConeGeometry(4.3, 1.5, 16, 1, true).toNonIndexed();
    sb.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.rose : C.cream), 0, 8.2, 0);
    sb.cyl(4.3, 4.3, 0.45, C.gold, 0, 7.25, 0, 0, 0, 0, { seg: 16, open: true }).sph(0.3, C.gold, 0, 9.1, 0);
    for (let i = 0; i < 16; i++) sb.sph(0.13, BULBS[i % 4], Math.cos(i * PI / 8) * 4.33, 7.25, Math.sin(i * PI / 8) * 4.33, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
    const cols = [C.red, C.yellow, C.teal, C.pink];
    for (let i = 0; i < 8; i++) sb.at(Math.cos(i * PI / 4) * 3.8, 7.0, Math.sin(i * PI / 4) * 3.8, -i * PI / 4, () => {
      sb.cyl(0.025, 0.025, 3.4, C.steel, 0.815, -1.49, 0, 0, 0, 0.5, { seg: 5 });
      sb.box(0.5, 0.08, 0.5, cols[i % 4], 1.63, -3.0, 0, 0, 0, 0.5).box(0.08, 0.5, 0.5, cols[i % 4], 1.9, -2.72, 0, 0, 0, 0.5);
      sb.cap(0.14, 0.26, [C.blue, C.coral, C.mint][i % 3], 1.55, -2.62, 0, 0, 0, 0.5).sph(0.13, C.skin, 1.38, -2.3, 0);
    });
    spin.add(sb.build({ material: MAT.double }));
    g.add(spin);
    cache.set(key, g);
  }
  return cache.get(key).clone();
}
// Roller coaster: one 40 m section that tiles from chunk to chunk. The train is animated in animate().
export const coasterY = (z) => 7.2 + 3.4 * Math.sin((z * PI) / 20) + 1.3 * Math.sin((z * PI) / 10 + 1.0);
function coaster() {
  const key = 'coaster';
  if (!cache.has(key)) {
    const g = new THREE.Group(), b = new Builder(0.85), N = 40, L = CHUNK / N;
    for (let i = 0; i < N; i++) {
      const z0 = -i * L, z1 = z0 - L, y0 = coasterY(z0), y1 = coasterY(z1), dy = y1 - y0, len = Math.hypot(L, dy), th = Math.atan2(dy, L);
      for (const sx of [-1, 1]) b.box(0.12, 0.12, len + 0.02, C.red, sx * 0.55, (y0 + y1) / 2, (z0 + z1) / 2, th, 0, 0);
      b.box(1.4, 0.07, 0.16, C.white, 0, (y0 + y1) / 2 - 0.08, (z0 + z1) / 2, th, 0, 0);
      if (i % 2 === 0) b.sph(0.1, BULBS[(i / 2) % 4], -0.72, y0 + 0.02, z0, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
      if (i % 4 === 2) {
        const h = y0 - WATER_Y + 0.4;
        for (const sx of [-1, 1]) b.box(0.22, h, 0.22, C.white, sx * 0.75, y0 - h / 2, z0, 0, 0, sx * -0.04);
        b.box(1.7, 0.14, 0.14, C.white, 0, y0 - 0.5, z0);
        if (h > 6) b.box(2.4, 0.1, 0.1, C.white, 0, y0 - h * 0.5, z0, 0, 0, 0.9).box(2.4, 0.1, 0.1, C.white, 0, y0 - h * 0.5, z0, 0, 0, -0.9);
      }
    }
    g.add(b.build({ receive: false }));
    const train = new THREE.Group(); train.name = 'train';
    const tb = new Builder(0.85);
    for (let k = 0; k < 3; k++) {
      const col = [C.yellow, C.teal, C.rose][k], z = k * 1.5;
      tb.box(1.0, 0.5, 1.3, col, 0, 0.4, z).box(1.0, 0.3, 0.12, col, 0, 0.75, z - 0.6).box(0.9, 0.5, 0.1, C.navy, 0, 0.8, z + 0.55);
      for (const sx of [-1, 1]) { tb.sph(0.15, C.skin, sx * 0.24, 1.05, z + 0.1, 1, 1, 1, { seg: 6 }).cap(0.13, 0.12, [C.blue, C.coral, C.mint][(k + (sx > 0 ? 1 : 0)) % 3], sx * 0.24, 0.78, z + 0.1); }
    }
    for (const sx of [-1, 1]) tb.sph(0.1, 0xfff3b0, sx * 0.3, 0.45, -0.68, 1, 1, 0.6, { glow: true, seg: 6, grad: 1 });
    train.add(tb.build({ receive: false }));
    g.add(train);
    cache.set(key, g);
  }
  return cache.get(key).clone();
}
// warm pool of light under a lamp (night level)
const poolMat = new THREE.MeshBasicMaterial({ map: puffTexture(), color: 0xffc56e, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const poolGeo = new THREE.PlaneGeometry(7, 7).rotateX(-PI / 2);
const lightPool = () => { const m = new THREE.Mesh(poolGeo, poolMat); m.renderOrder = 1; return m; };

// ---------- storm point ----------
const cliff = (v) => prefab('cliff' + v, () => {
  const b = new Builder(0.55), rng = makeRng(90 + v * 17), cols = [0x4f565c, 0x5d656b, 0x444a50, 0x6a7278];
  const rock = (x, z, r, h) => b.add(new THREE.DodecahedronGeometry(1), pick(rng, cols), x, h * 0.4, z, rng() * 3, rng() * 3, rng() * 3, r, h * 0.62, r);
  for (let k = 0; k < 6; k++) rock(5.2 + rng() * 1.2, -3.3 - k * 6.7 + (rng() - 0.5) * 2, 4.4 + rng(), 7 + rng() * 3.5);
  for (let i = 0; i < 20; i++) { const d = rng(); rock(8 + d * 24, -rng() * CHUNK, 4.5 + rng() * 4, 9 + d * 10 + rng() * 4); }
  for (let i = 0; i < 12; i++) b.add(new THREE.DodecahedronGeometry(1), i % 2 ? 0x3f6f4a : 0x4a7d52, 9 + rng() * 22, 11 + rng() * 7, -rng() * CHUNK, rng() * 3, rng() * 3, 0, 3 + rng() * 2.5, 0.9, 3 + rng() * 2.5);   // grass caps
  if (v === 1) {
    // coastguard cottage with lit windows
    b.cyl(5, 6, 3, 0x5d656b, 15, 13.2, -20, 0, 0, 0, { seg: 9 });
    b.box(5, 2.8, 4, C.white, 15, 16.1, -20).prism(4.6, 1.6, 5.6, 0x56606d, 15, 17.5, -20, PI / 2).box(0.7, 1.4, 0.7, C.brick, 16.4, 18.3, -21);
    for (const z of [-21, -19]) b.box(0.06, 0.8, 0.8, 0xffe08a, 12.47, 16.2, z, 0, 0, 0, { glow: true, grad: 1 });
    b.cyl(0.06, 0.06, 5, C.white, 11.5, 17.2, -17).flat([[[11.5, 19.6, -17], [11.5, 18.8, -17], [11.5, 19.2, -15.6]]], C.red);
  } else if (v === 2) {
    // signal mast with warning lights
    b.cyl(3.5, 4.5, 3, 0x5d656b, 13, 12.6, -24, 0, 0, 0, { seg: 8 });
    b.box(0.3, 12, 0.3, C.red, 13, 20, -24).box(0.3, 12, 0.3, C.white, 13.5, 20, -24.5).box(2.4, 0.14, 0.14, C.white, 13.2, 23, -24.2).box(1.6, 0.14, 0.14, C.white, 13.2, 20, -24.2);
    for (const y of [26.2, 22, 18]) b.sph(0.28, 0xff4a3a, 13.2, y, -24.2, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  }
  return b.build({ receive: false });
});
const seaWall = () => prefab('seawall', () => {
  const b = new Builder(0.7);
  b.box(6, 3.8, CHUNK, 0x7d8185, DECK_HALF + 3, -1.92, -CHUNK / 2);
  b.box(0.7, 0.9, CHUNK, 0x8d9195, DECK_HALF + 1.6, 0.45, -CHUNK / 2).box(0.9, 0.12, CHUNK, 0x9da1a4, DECK_HALF + 1.6, 0.93, -CHUNK / 2);
  for (let i = 0; i < 10; i++) b.box(0.74, 0.86, 0.06, 0x6a6f73, DECK_HALF + 1.6, 0.45, -2 - i * 4);
  for (let i = 0; i < 4; i++) {   // storm lanterns on the wall
    const z = -5 - i * 10;
    b.cyl(0.04, 0.04, 0.5, C.iron, DECK_HALF + 1.6, 1.24, z).cyl(0.13, 0.13, 0.26, 0xffd27a, DECK_HALF + 1.6, 1.6, z, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 }).cone(0.18, 0.16, C.iron, DECK_HALF + 1.6, 1.81, z, 0, 0, 0, { seg: 8 });
  }
  return b.build();
});
const seaStack = (v) => prefab('seastack' + v, () => {
  const b = new Builder(0.6), rng = makeRng(300 + v);
  for (let i = 0; i < 5; i++) b.add(new THREE.DodecahedronGeometry(1), i % 2 ? 0x50575d : 0x626a70, (rng() - 0.5) * 3, WATER_Y + 2 + i * 2.6, (rng() - 0.5) * 3, rng() * 3, rng() * 3, 0, 3.6 - i * 0.45, 2.4, 3.6 - i * 0.45);
  for (let i = 0; i < 4; i++) b.add(new THREE.DodecahedronGeometry(1), 0x5d656b, (rng() - 0.5) * 9, WATER_Y + 0.3, (rng() - 0.5) * 9, rng() * 3, rng() * 3, 0, 1.6 + rng(), 1, 1.6 + rng());
  return b.build({ receive: false });
});
const wreck = () => prefab('wreck', () => {
  const b = new Builder(0.72);
  b.dome(1, (x, y) => (y > -0.5 ? 0x5a4634 : 0x3a2f28), 0, 0, 0, 0, 0, 0, 2.4, 2.6, 8, { t0: PI / 2, tl: PI / 2, seg: 14 });
  for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(1, 0.06, 5, 12, PI), 0x2e2520, 0, 0.05, -5.4 + i * 1.8, 0, 0, PI, 2.4 * Math.sqrt(1 - Math.pow((-5.4 + i * 1.8) / 8, 2)), 2.55, 1);
  b.cyl(0.16, 0.22, 7, 0x4d3927, 0, 3.4, 1, 0, 0, 0.12, { seg: 8 }).box(4.2, 0.14, 0.14, 0x4d3927, -0.4, 5.6, 1, 0, 0, 0.12);
  b.flat([[[-2.2, 5.4, 1.05], [1.2, 5.8, 1.05], [-1.6, 3.2, 1.05]], [[1.2, 5.8, 1.05], [0.9, 4.0, 1.05], [-0.4, 4.6, 1.05]]], 0xc9c2ae);
  const m = b.build({ material: MAT.double, receive: false }); m.rotation.set(0.16, 0, 0.5); m.position.y = WATER_Y + 1.1;
  const g = new THREE.Group(); g.add(m);
  return g;
});
const beacon = () => prefab('beacon', () => {
  const b = new Builder(0.8);
  for (let i = 0; i < 4; i++) b.add(new THREE.DodecahedronGeometry(1), i % 2 ? 0x50575d : 0x626a70, Math.cos(i * 1.7) * 1.2, WATER_Y + 0.5, Math.sin(i * 1.7) * 1.2, i, i * 2, 0, 1.6, 1.1, 1.6);
  b.add(new THREE.CylinderGeometry(0.22, 0.3, 5.6, 8, 6), (x, y) => (Math.floor((y + 10) / 0.93) % 2 ? C.red : C.white), 0, WATER_Y + 3.6, 0);
  b.sph(0.34, 0xff4a3a, 0, WATER_Y + 6.7, 0, 1, 1, 1, { glow: true, seg: 8, grad: 1 }).tor(0.4, 0.04, C.iron, 0, WATER_Y + 6.4, 0, PI / 2, 0, 0, { seg: 10 });
  return b.build({ receive: false });
});
const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending });
function stormLighthouse() {
  return prefab('stormlight', () => {
    const g = new THREE.Group(); g.add(lighthouse());
    const spin = new THREE.Group(); spin.name = 'spin'; spin.position.y = 22.2;
    const geo = new THREE.ConeGeometry(7, 90, 12, 1, true); geo.translate(0, -45, 0); geo.rotateZ(-PI / 2);
    const a = new THREE.Mesh(geo, beamMat), c = new THREE.Mesh(geo, beamMat); c.rotation.y = PI;
    spin.add(a, c); g.add(spin);
    return g;
  });
}

// ---------- sandcastle bay ----------
const SAND_L = 0xf6e8bd;
const beachGround = () => prefab('beachGround', () => {
  const b = new Builder(0.8), rng = makeRng(77);
  b.box(46, 3.6, CHUNK, SAND, DECK_HALF + 23, -1.82, -CHUNK / 2);
  b.box(0.3, 0.16, CHUNK, 0xb99468, DECK_HALF + 0.15, 0.02, -CHUNK / 2);                       // timber kerb
  for (let i = 0; i < 20; i++) b.box(0.05, 1.0, 1.9, i % 2 ? 0x9a7a52 : 0xa98a60, DECK_HALF - 0.01, -0.55, -1 - i * 2, 0, 0, 0, { grad: 0.9 });
  for (let i = 0; i < 24; i++) b.sph(1, i % 2 ? SAND_D : SAND_L, DECK_HALF + 2.2 + rng() * 20, -0.03, -rng() * CHUNK, 1.2 + rng() * 2.4, 0.07 + rng() * 0.12, 0.8 + rng() * 1.6, { seg: 7 });
  for (let i = 0; i < 4; i++) {   // beach towels
    const x = DECK_HALF + 3 + rng() * 9, z = -3 - rng() * 34, ry = rng() * 3, c = pick(rng, [C.coral, C.teal, C.yellow, C.rose, C.blue]);
    b.at(x, 0.09, z, ry, () => { b.box(1.0, 0.03, 1.9, c, 0, 0, 0, 0, 0, 0, { grad: 1 }); for (const tz of [-0.6, 0, 0.6]) b.box(1.01, 0.032, 0.16, C.white, 0, 0.002, tz, 0, 0, 0, { grad: 1 }); });
  }
  for (let i = 0; i < 12; i++) {   // shells, starfish and pebbles
    const x = DECK_HALF + 1 + rng() * 14, z = -rng() * CHUNK;
    if (i % 3 === 0) for (let k = 0; k < 5; k++) b.cone(0.07, 0.3, 0xff8f6b, x + Math.cos(k * 1.257) * 0.13, 0.1, z + Math.sin(k * 1.257) * 0.13, PI / 2, 0, k * 1.257 - PI / 2, { seg: 4 });
    else b.sph(0.11, i % 3 === 1 ? C.white : 0xf5b8c4, x, 0.1, z, 1, 0.5, 0.8, { seg: 6 });
  }
  return b.build();
});
const duneRow = (v) => prefab('dunes' + v, () => {
  const b = new Builder(0.8), rng = makeRng(410 + v);
  for (let i = 0; i < 9; i++) {
    const cx = 27 + rng() * 16, cz = -rng() * CHUNK, sx = 7 + rng() * 5, sy = 2.5 + rng() * 3.5 + (cx - 27) * 0.2, sz = 6 + rng() * 5;
    b.sph(1, i % 2 ? SAND : SAND_D, cx, 0, cz, sx, sy, sz, { seg: 9 });
    for (let t = 0; t < 4; t++) {   // marram grass on top
      const dx = (rng() - 0.5) * sx * 0.9, dz = (rng() - 0.5) * sz * 0.9, y = sy * Math.sqrt(Math.max(0.05, 1 - (dx / sx) ** 2 - (dz / sz) ** 2));
      for (let k = 0; k < 4; k++) b.cone(0.1, 1.2 + rng() * 0.7, k % 2 ? 0x8fae5d : 0x7a9a4e, cx + dx + (k - 1.5) * 0.16, y + 0.45, cz + dz + rng() * 0.3, (rng() - 0.5) * 0.6, 0, (k - 1.5) * 0.25, { seg: 4 });
    }
  }
  // a row of striped beach huts facing the boardwalk
  const cols = [C.red, C.teal, C.yellow, C.blue, C.rose, C.green];
  for (let i = 0; i < 6; i++) {
    const z = -3.4 - i * 6.6, col = cols[(i + v * 2) % 6], x = 20.5;
    b.box(3.2, 0.4, 3.0, 0x8a6d43, x, 0.2, z);
    b.add(new THREE.BoxGeometry(3, 2.5, 2.8, 1, 1, 7), (px, py, pz) => (Math.floor((pz + 1.4) / 0.4) % 2 ? col : C.white), x, 1.65, z);
    b.prism(3.1, 1.15, 3.4, col, x, 2.9, z, PI / 2).box(0.06, 1.75, 0.9, shadeHex(col, 0.7), x - 1.52, 1.3, z).sph(0.06, C.gold, x - 1.57, 1.3, z + 0.3);
    b.box(0.7, 0.2, 2.0, 0x8a6d43, x - 1.9, 0.1, z);
  }
  return b.build({ receive: false });
});
const palm = (v) => prefab('palm' + v, () => {
  const b = new Builder(0.85), h = 5.4 + v * 1.2, bend = v ? -1.0 : 0.85, N = 8;
  for (let i = 0; i < N; i++) { const t = i / N; b.cyl(0.2 - t * 0.07, 0.23 - t * 0.07, h / N + 0.08, i % 2 ? 0x9a7a52 : 0x86683f, bend * t * t, h * (t + 0.5 / N), 0, 0, 0, -bend * t * 0.3, { seg: 8 }); }
  b.sph(0.34, 0x86683f, 0, 0.1, 0, 1.2, 0.6, 1.2, { seg: 7 });
  const tx = bend * 0.86, ty = h + 0.05, tris = [[], []];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.698 + v * 0.3, L = 2.9 + (i % 3) * 0.35, ca = Math.cos(a), sa = Math.sin(a);
    const pt = (s, side) => { const w = 0.52 * Math.sin(Math.min(1, s * 1.15 + 0.12) * PI) * side; return [tx + ca * L * s - sa * w, ty + 1.0 * s - 2.1 * s * s - Math.abs(side) * 0.12, sa * L * s + ca * w]; };
    for (let k = 0; k < 4; k++) {
      const s0 = k / 4, s1 = (k + 1) / 4;
      for (const side of [-1, 1]) tris[(i + (side > 0 ? 1 : 0)) % 2].push([pt(s0, 0), pt(s1, 0), pt(s1, side)], [pt(s0, 0), pt(s1, side), pt(s0, side)]);
    }
  }
  b.flat(tris[0], 0x3f9a4f).flat(tris[1], 0x2f8444);
  for (let i = 0; i < 3; i++) b.sph(0.17, 0x6b4a2c, tx + Math.cos(i * 2.1) * 0.2, ty - 0.18, Math.sin(i * 2.1) * 0.2, 1, 1.1, 1, { seg: 7 });
  return b.build({ material: MAT.double, cast: true, receive: false });
});
const sandcastleBig = () => prefab('sandcastleBig', () => {
  const b = new Builder(0.85);
  const band = (x, y) => (Math.floor((y + 9) / 0.3) % 4 === 0 ? SAND_D : SAND);
  const tower = (x, z, r, h) => {
    b.add(new THREE.CylinderGeometry(r * 0.9, r, h, 12, 4), band, x, h / 2, z);
    b.cyl(r * 1.08, r * 1.0, 0.22, SAND, x, h + 0.05, z, 0, 0, 0, { seg: 12 });
    for (let i = 0; i < 6; i++) b.box(r * 0.45, 0.24, 0.2, SAND, x + Math.cos(i * PI / 3) * r * 0.92, h + 0.27, z + Math.sin(i * PI / 3) * r * 0.92, 0, -i * PI / 3 + PI / 2, 0);
    b.cone(r * 0.72, r * 1.1, SAND_D, x, h + 0.2 + r * 0.55, z, 0, 0, 0, { seg: 10 });
  };
  b.sph(1, SAND_D, 0, 0, 0, 3.6, 0.5, 3.6, { seg: 12 });                                       // mound
  b.tor(3.5, 0.3, 0x5fc3e0, 0, 0.02, 0, PI / 2, 0, 0, { seg: 18, tseg: 5 });                    // moat
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(sx * 1.75, sz * 1.75, 0.62, 1.9);
  for (let i = 0; i < 4; i++) { const a = i * PI / 2; b.box(3.2, 1.2, 0.4, SAND, Math.sin(a) * 1.75, 0.9, Math.cos(a) * 1.75, 0, a, 0); for (let k = -3; k <= 3; k++) b.box(0.26, 0.2, 0.42, SAND, Math.sin(a) * 1.75 + Math.cos(a) * k * 0.42, 1.58, Math.cos(a) * 1.75 - Math.sin(a) * k * 0.42, 0, a, 0); }
  tower(0, 0, 1.05, 3.1);
  b.box(0.7, 0.9, 0.08, 0x8a6d43, -1.98, 0.75, 0).cyl(0.03, 0.03, 0.8, C.woodLight, 0, 4.9, 0).flat([[[0, 5.3, 0], [0, 4.9, 0], [0.7, 5.1, 0]]], C.red);
  for (const [sx, sz, c] of [[-1, -1, C.blue], [1, 1, C.yellow]]) b.cyl(0.02, 0.02, 0.5, C.woodLight, sx * 1.75, 3.25, sz * 1.75).flat([[[sx * 1.75, 3.5, sz * 1.75], [sx * 1.75, 3.24, sz * 1.75], [sx * 1.75 + 0.42, 3.37, sz * 1.75]]], c);
  // a giant bucket and spade left beside it
  b.cyl(0.62, 0.46, 0.95, C.red, 3.4, 0.5, 2.6, 0, 0, 0.12, { seg: 12 }).tor(0.62, 0.05, C.yellow, 3.34, 0.97, 2.6, PI / 2, 0.12, 0, { seg: 12 });
  b.cyl(0.05, 0.05, 1.5, C.yellow, 3.0, 0.75, -2.9, 0.5, 0, 0.3).box(0.42, 0.55, 0.05, C.blue, 2.76, 0.18, -3.25, 0.5, 0, 0.3);
  return b.build({ material: MAT.double, cast: true });
});
const parasolSet = (col) => prefab('parasol' + col, () => {
  const b = new Builder(0.85);
  b.cyl(0.04, 0.04, 2.5, C.white, 0, 1.25, 0, 0, 0, 0.08);
  const roof = new THREE.ConeGeometry(1.75, 0.6, 10, 1, true).toNonIndexed();
  b.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? col : C.white), 0.1, 2.5, 0, 0, 0, 0.08).sph(0.07, col, 0.12, 2.84, 0);
  for (const sx of [-1, 1]) {   // sun loungers
    b.box(0.62, 0.08, 1.3, C.white, sx * 1.0, 0.34, 0.25).box(0.62, 0.08, 0.75, C.white, sx * 1.0, 0.58, -0.66, 0.75, 0, 0).box(0.56, 0.05, 1.1, col, sx * 1.0, 0.4, 0.3);
    for (const z of [-0.5, 0.75]) b.box(0.6, 0.3, 0.06, C.woodLight, sx * 1.0, 0.16, z);
  }
  b.box(0.42, 0.34, 0.3, C.blue, 0.1, 0.2, 1.1).box(0.44, 0.06, 0.32, C.white, 0.1, 0.4, 1.1);
  return b.build({ material: MAT.double, cast: true });
});
const lifeguardTower = () => prefab('lgtower', () => {
  const b = new Builder(0.85);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.16, 2.6, 0.16, C.white, sx * 1.1, 1.3, sz * 1.1, sz * 0.06, 0, sx * -0.06);
  for (const sz of [-1, 1]) b.box(2.5, 0.1, 0.1, C.white, 0, 1.2, sz * 1.14, 0, 0, 0.5);
  b.box(3.0, 0.16, 3.0, C.woodLight, 0, 2.62, 0);
  b.box(2.0, 1.7, 1.8, C.white, 0, 3.55, -0.4).box(2.02, 0.5, 1.82, C.red, 0, 3.0, -0.4).box(1.2, 0.8, 0.06, C.glassDark, 0, 3.75, 0.52);
  b.box(2.7, 0.12, 2.6, C.red, 0, 4.5, -0.2, 0.12, 0, 0);
  for (const sx of [-1, 1]) b.box(0.06, 0.9, 0.06, C.white, sx * 1.44, 3.15, 1.4).box(0.06, 0.06, 1.3, C.white, sx * 1.44, 3.6, 0.85);
  b.box(2.9, 0.06, 0.06, C.white, 0, 3.6, 1.44);
  b.box(0.9, 0.08, 3.4, C.woodLight, -1.95, 1.3, 0.3, -0.87, 0, 0);                              // ramp
  b.cyl(0.03, 0.03, 2.2, C.white, 1.2, 5.5, -1.1).box(0.9, 0.3, 0.02, C.red, 1.66, 6.42, -1.1).box(0.9, 0.3, 0.02, C.yellow, 1.66, 6.12, -1.1);
  b.tor(0.3, 0.09, C.orange, 0.72, 3.5, 0.53, 0, 0, 0, { seg: 12 });
  const g = new THREE.Group(); g.add(b.build({ material: MAT.double, cast: true }));
  const s = signMesh('LIFEGUARD', 1.9, 0.36, '#fff3d6', '#c4412f', '#ffc928'); s.position.set(0, 3.05, 0.53); g.add(s);
  return g;
});
const windbreak = () => prefab('windbreak', () => {
  const b = new Builder(0.9), cols = [C.red, C.white, C.blue, C.white, C.yellow, C.white];
  b.add(new THREE.BoxGeometry(6, 1.1, 0.04, 12, 1, 1), (x) => cols[Math.floor((x + 3) / 0.5) % 6], 0, 0.7, 0);
  for (let i = 0; i <= 4; i++) b.cyl(0.04, 0.04, 1.6, C.woodLight, -3 + i * 1.5, 0.8, 0.03);
  b.box(0.9, 0.05, 1.5, 0x8ad1e6, -1, 0.08, 1.2, 0, 0.3, 0).sph(0.3, C.red, 1.4, 0.36, 1.0, 1, 1, 1, { seg: 8 });
  return b.build({ material: MAT.double, cast: true });
});
const pedalo = (col) => prefab('pedalo' + col, () => {
  const b = new Builder(0.85);
  for (const sx of [-1, 1]) b.cap(0.32, 2.2, C.white, sx * 0.62, 0.2, 0, PI / 2, 0, 0);
  b.box(1.5, 0.12, 2.0, col, 0, 0.5, 0).box(1.3, 0.5, 0.12, col, 0, 0.8, 0.7, -0.2, 0, 0).box(1.3, 0.1, 0.6, C.white, 0, 0.62, 0.42);
  b.cyl(0.42, 0.42, 0.5, C.yellow, 0, 0.6, -0.9, 0, 0, PI / 2, { seg: 10 });
  for (const sx of [-1, 1]) b.cyl(0.03, 0.03, 1.3, C.white, sx * 0.68, 1.2, 0.2);
  b.box(1.6, 0.06, 1.5, C.white, 0, 1.86, 0.2);
  return b.build({ receive: false });
});

// ---------- smugglers' cove ----------
const CAVE = [0x2c3843, 0x36434f, 0x232d37, 0x414f5c];
const XTAL = [0x4ff2ff, 0xff6fe0, 0x7dffb0, 0xb99bff];
const xtal = (b, x, y, z, s, col, rx, rz) => b.add(new THREE.OctahedronGeometry(1), col, x, y, z, rx, 0, rz, s * 0.34, s * 1.3, s * 0.34, { glow: true, grad: 0.55 });
const caveWall = (v) => prefab('cave' + v, () => {
  // local x = 0 is roughly the wall's face; the rock runs away to +x (mirror it for the seaward side)
  const b = new Builder(0.6), rng = makeRng(520 + v * 13);
  const rock = (x, z, r, h) => b.add(new THREE.DodecahedronGeometry(1), pick(rng, CAVE), x, -3 + h * 0.4, z, rng() * 3, rng() * 3, rng() * 3, r, h * 0.62, r);
  for (let k = 0; k < 7; k++) rock(3.9 + rng() * 1.1, -2.8 - k * 5.8 + (rng() - 0.5) * 2, 4 + rng() * 1.1, 11 + rng() * 6);
  for (let i = 0; i < 13; i++) { const d = rng(); rock(8.5 + d * 18, -rng() * CHUNK, 5 + rng() * 4, 16 + d * 12 + rng() * 5); }
  for (let i = 0; i < 6; i++) {   // crystals growing out of the rock
    const z = -3 - rng() * 34, y = 1 + rng() * 7.5, col = XTAL[(i + v) % 4];
    xtal(b, 0.5, y, z, 1.0 + rng() * 0.8, col, 0.2, 0.9);
    xtal(b, 0.7, y + 0.5, z + 0.5, 0.6 + rng() * 0.4, col, -0.5, 0.5);
    xtal(b, 0.7, y - 0.3, z - 0.5, 0.5 + rng() * 0.4, XTAL[(i + v + 1) % 4], 0.7, 1.2);
  }
  if (v === 1) {   // a hidden waterfall
    b.box(0.3, 13, 2.2, 0xa9ecf5, 0.1, 4.2, -21, 0, 0, 0.1, { glow: true, grad: 0.5 }).box(0.34, 13, 0.5, 0xe3fbff, 0.02, 4.2, -21.4, 0, 0, 0.1, { glow: true, grad: 0.6 });
    b.sph(1.6, 0xe3fbff, -0.8, WATER_Y + 0.2, -21, 1, 0.4, 1.3, { glow: true, seg: 8, grad: 0.7 });
  }
  return b.build({ receive: false });
});
const caveArch = (v) => prefab('arch' + v, () => {
  const b = new Builder(0.6), rng = makeRng(700 + v * 7);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = lerp(-19, 11, t), y = 15 + 2.4 * Math.sin(t * PI) + rng();
    b.add(new THREE.DodecahedronGeometry(1), pick(rng, CAVE), x, y, (rng() - 0.5) * 3, rng() * 3, rng() * 3, rng() * 3, 3.2, 2.2, 3 + rng() * 2);
    if (i % 2 === 0 || rng() < 0.4) {   // stalactites, some tipped with a crystal
      const h = 1.2 + rng() * 2, sx = x + (rng() - 0.5) * 1.5, sz = (rng() - 0.5) * 4;
      b.cone(0.4 + rng() * 0.3, h, CAVE[i % 4], sx, y - 1.9 - h / 2, sz, PI, 0, 0, { seg: 6 });
      if (i % 4 === 0) xtal(b, sx, y - 1.9 - h - 0.3, sz, 0.5, XTAL[(i / 4 + v) % 4], PI, 0);
    }
  }
  for (const x of [-9, 6.5]) {   // lanterns on chains
    b.cyl(0.02, 0.02, 2.6, C.iron, x, 12.2, 0).cyl(0.16, 0.16, 0.34, 0xffd27a, x, 10.75, 0, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 }).cone(0.24, 0.2, C.iron, x, 11.02, 0, 0, 0, 0, { seg: 8 }).cyl(0.18, 0.18, 0.05, C.iron, x, 10.56, 0);
  }
  return b.build({ receive: false });
});
const coveLedge = (v) => prefab('ledge' + v, () => {
  const b = new Builder(0.7), rng = makeRng(610 + v);
  b.box(5.2, 3.7, CHUNK, 0x34414c, DECK_HALF + 2.6, -1.9, -CHUNK / 2);
  for (let i = 0; i < 14; i++) b.add(new THREE.DodecahedronGeometry(1), pick(rng, CAVE), DECK_HALF + 1 + rng() * 3.6, 0, -rng() * CHUNK, rng() * 3, rng() * 3, 0, 0.5 + rng() * 0.7, 0.2 + rng() * 0.25, 0.5 + rng() * 0.7);
  for (let i = 0; i < 5; i++) {   // crystal clusters along the ledge
    const x = DECK_HALF + 1.6 + rng() * 2.6, z = -3 - i * 7.6 - rng() * 3, c = XTAL[(i + v) % 4];
    xtal(b, x, 0.75, z, 0.7 + rng() * 0.4, c, 0, 0); xtal(b, x + 0.3, 0.5, z + 0.2, 0.45, c, 0.4, -0.5); xtal(b, x - 0.28, 0.45, z - 0.15, 0.4, XTAL[(i + v + 2) % 4], -0.4, 0.5);
  }
  for (let i = 0; i < 10; i++) b.cyl(0.09, 0.09, 0.03, 0xffd24a, DECK_HALF + 0.6 + rng() * 2.5, 0.05, -rng() * CHUNK, 0, 0, 0, { glow: true, grad: 0.8, seg: 8 });   // dropped coins
  return b.build();
});
const treasurePile = (v) => prefab('tpile' + v, () => {
  const b = new Builder(0.85);
  b.cone(1.5, 0.9, 0xffc93a, 0, 0.45, 0, 0, 0, 0, { glow: true, grad: 0.6, seg: 10 });                 // heap of gold
  for (let i = 0; i < 14; i++) b.sph(0.1, i % 3 ? 0xffe27a : 0xfff3b8, Math.cos(i * 2.4) * (0.3 + (i % 5) * 0.22), 0.75 - (0.3 + (i % 5) * 0.22) * 0.5, Math.sin(i * 2.4) * (0.3 + (i % 5) * 0.22), 1, 0.5, 1, { glow: true, grad: 0.8, seg: 6 });
  b.at(-0.2, 0.55, 0.1, 0.5, () => chestInto(b, 1.15, 0.6, 0.75, true));
  b.at(1.5, 0, -0.5, -0.4, () => chestInto(b, 1.0, 0.55, 0.7, v === 0));
  b.at(-1.5, 0, 0.6, 0.3, () => crateInto(b, 0.9, 0.9, 0.9, 0x7b5a3c, 0x4d3927));
  b.cyl(0.36, 0.36, 0.95, 0x8a5a3c, -1.3, 0.48, -0.8, 0, 0, 0, { seg: 10 }).cyl(0.375, 0.375, 0.07, C.iron, -1.3, 0.75, -0.8, 0, 0, 0, { seg: 10 }).cyl(0.375, 0.375, 0.07, C.iron, -1.3, 0.22, -0.8, 0, 0, 0, { seg: 10 });
  xtal(b, 0.5, 1.15, 0.1, 0.42, 0xff6fe0, 0.2, -0.3); xtal(b, 1.0, 0.3, 0.9, 0.36, 0x4ff2ff, 0.5, 0.4);
  b.cyl(0.03, 0.03, 1.5, C.iron, 1.6, 0.75, 0.8).cyl(0.13, 0.13, 0.26, 0xffd27a, 1.6, 1.62, 0.8, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 }).cone(0.19, 0.16, C.iron, 1.6, 1.84, 0.8, 0, 0, 0, { seg: 8 });
  return b.build({ cast: true });
});
const lugger = () => prefab('lugger', () => {
  const b = new Builder(0.8);
  b.dome(1, (x, y) => (y > -0.25 ? 0x3d2c22 : 0x241a15), 0, 1.5, 0, 0, 0, 0, 2.0, 2.0, 6.5, { t0: PI / 2, tl: PI / 2, seg: 14 });
  b.add(new THREE.CylinderGeometry(1, 1, 0.1, 14), 0x6b4f37, 0, 1.4, 0, 0, 0, 0, 1.9, 1, 6.3).add(new THREE.TorusGeometry(1, 0.05, 5, 18), 0xd1a548, 0, 1.52, 0, PI / 2, 0, 0, 2.0, 6.5, 1.6);
  b.box(1.9, 0.9, 2.0, 0x4d3927, 0, 1.9, 4.0).box(2.1, 0.12, 2.2, 0x6b4f37, 0, 2.4, 4.0);
  for (const sx of [-1, 1]) b.box(0.06, 0.4, 0.5, 0xffd27a, sx * 0.96, 1.95, 4.0, 0, 0, 0, { glow: true, grad: 0.9 });
  for (const [z, h] of [[-1.6, 9], [2.0, 7]]) {
    b.cyl(0.11, 0.15, h, 0x4d3927, 0, 1.4 + h / 2, z, 0, 0, 0, { seg: 7 }).box(4.4, 0.12, 0.12, 0x4d3927, 0, h + 0.3, z, 0, 0, 0.08);
    b.flat([[[-2.2, h + 0.1, z + 0.1], [2.2, h + 0.45, z + 0.1], [2.0, 3.0, z + 0.5]], [[-2.2, h + 0.1, z + 0.1], [2.0, 3.0, z + 0.5], [-2.0, 2.8, z + 0.5]]], z < 0 ? 0x8f2f2a : 0x7a2824);
  }
  b.cyl(0.06, 0.06, 3.2, 0x4d3927, 0, 2.3, -6.6, -1.0, 0, 0);
  for (const [x, y, z] of [[0, 2.0, -6.0], [0.9, 2.2, 1.0], [-0.9, 2.9, 4.9]]) b.cyl(0.13, 0.13, 0.26, 0xffd27a, x, y, z, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 }).cone(0.19, 0.16, C.iron, x, y + 0.2, z, 0, 0, 0, { seg: 8 });
  b.at(0.3, 1.45, -3.2, 0.3, () => crateInto(b, 0.9, 0.8, 0.9, 0x7b5a3c, 0x4d3927));
  b.flat([[[0, 10.9, -1.6], [0, 10.3, -1.6], [0, 10.6, -0.5]]], 0x1b1b22);
  return b.build({ material: MAT.double, receive: false });
});
const tealPoolMat = new THREE.MeshBasicMaterial({ map: puffTexture(), color: 0x45e8e0, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const tealPool = () => { const m = new THREE.Mesh(poolGeo, tealPoolMat); m.renderOrder = 1; return m; };

// ---------- frosty pier ----------
const SNOW = 0xf2f7ff, SNOW_D = 0xd6e4f5, ICE = 0xbfe6f5;
const FAIRY = [0xffe27a, 0xff6f6f, 0x8ff0ff, 0xa6ff9a];
function penguinInto(b, x, y, z, ry, s = 1) {
  b.at(x, y, z, ry, () => {
    b.sph(0.34, 0x1f2933, 0, 0.44, 0, 0.95, 1.25, 0.92, { seg: 10 }).sph(0.27, 0xf6f8fb, 0, 0.4, 0.15, 0.9, 1.18, 0.85, { seg: 9 });
    b.sph(0.22, 0x1f2933, 0, 0.9, 0.03, 1, 1, 1, { seg: 9 }).cone(0.06, 0.2, C.orange, 0, 0.87, 0.3, PI / 2, 0, 0, { seg: 6 });
    for (const sx of [-1, 1]) b.sph(0.2, 0x1f2933, sx * 0.33, 0.5, -0.02, 0.3, 1.2, 0.35, { seg: 7 }).sph(0.11, C.orange, sx * 0.14, 0.04, 0.1, 0.9, 0.4, 1.5, { seg: 7 }).sph(0.045, C.white, sx * 0.1, 0.96, 0.2, 1, 1, 0.6, { seg: 5 });
  }, s);
}
function firInto(b, x, y, z, h, rng, lights) {
  const r0 = h * 0.26;
  b.cyl(h * 0.035, h * 0.045, h * 0.2, 0x5a4030, x, y + h * 0.1, z, 0, 0, 0, { seg: 6 });
  for (let i = 0; i < 4; i++) {
    const r = r0 * (1 - i * 0.2), ty = y + h * (0.17 + i * 0.2), th = h * 0.36;
    b.cone(r, th, i % 2 ? 0x2f7d4f : 0x286c45, x, ty + th / 2, z, 0, i * 0.6, 0, { seg: 8 });
    b.cone(r * 0.62, th * 0.62, SNOW, x, ty + th * 0.7, z, 0, i * 0.6, 0, { seg: 8 });
    if (lights) for (let k = 0; k < 6; k++) { const a = k * 1.047 + i * 0.5; b.sph(h * 0.022, FAIRY[(k + i) % 4], x + Math.cos(a) * r * 0.74, ty + th * 0.2, z + Math.sin(a) * r * 0.74, 1, 1, 1, { glow: true, seg: 5, grad: 1 }); }
  }
  if (lights) b.add(new THREE.OctahedronGeometry(h * 0.045), 0xffe27a, x, y + h * 1.16, z, 0, 0.6, 0, 1, 1.3, 0.5, { glow: true, grad: 0.8 });
}
const snowGround = () => prefab('snowGround', () => {
  const b = new Builder(0.85), rng = makeRng(88);
  b.box(46, 3.6, CHUNK, SNOW, DECK_HALF + 23, -1.82, -CHUNK / 2);
  b.box(0.36, 0.2, CHUNK, SNOW_D, DECK_HALF + 0.18, 0.02, -CHUNK / 2);
  for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) b.box(0.05, 0.9, 3.85, k % 2 ? 0x8b9bb0 : 0xa3b2c6, DECK_HALF - 0.01, -0.6 - k * 0.95, -2 - i * 4 + (k % 2) * 2 - 1, 0, 0, 0, { grad: 0.9 });
  for (let i = 0; i < 22; i++) b.sph(1, i % 3 ? SNOW : SNOW_D, DECK_HALF + 1.6 + rng() * 20, -0.05, -rng() * CHUNK, 1.4 + rng() * 2.6, 0.2 + rng() * 0.4, 1.0 + rng() * 2, { seg: 7 });
  for (let i = 0; i < 12; i++) b.sph(0.11, 0xc3d3e8, DECK_HALF + 1.1 + (i % 2) * 0.34, 0.0, -2 - i * 3.2, 0.8, 0.3, 1.3, { seg: 5 });   // footprints
  return b.build();
});
const snowHills = (v) => prefab('snowhills' + v, () => {
  const b = new Builder(0.85), rng = makeRng(830 + v);
  const hills = [];
  for (let i = 0; i < 8; i++) { const hl = { x: 28 + rng() * 15, z: -rng() * CHUNK, sx: 8 + rng() * 6, sy: 4 + rng() * 5, sz: 7 + rng() * 6 }; hl.sy += (hl.x - 28) * 0.3; hills.push(hl); b.sph(1, i % 2 ? SNOW : SNOW_D, hl.x, 0, hl.z, hl.sx, hl.sy, hl.sz, { seg: 9 }); }
  const top = (hl, dx, dz) => hl.sy * Math.sqrt(Math.max(0.05, 1 - (dx / hl.sx) ** 2 - (dz / hl.sz) ** 2)) - 0.3;
  for (const hl of hills) for (let t = 0; t < 2; t++) { const dx = (rng() - 0.6) * hl.sx * 0.9, dz = (rng() - 0.5) * hl.sz * 0.9; firInto(b, hl.x + dx, top(hl, dx, dz), hl.z + dz, 4.5 + rng() * 3, rng, false); }
  for (let i = 0; i < 3; i++) {   // cabins with lit windows
    const hl = hills[i * 2 + v], dx = -hl.sx * 0.45, y = top(hl, dx, 0) - 0.5, x = hl.x + dx, z = hl.z;
    b.box(3.6, 2.6, 4.4, 0x7a5236, x, y + 1.3, z).prism(4.9, 1.7, 4.2, SNOW, x, y + 2.6, z, PI / 2).box(0.6, 1.3, 0.6, 0x6b4a3a, x + 0.8, y + 3.8, z + 1.2).box(0.7, 0.14, 0.7, SNOW, x + 0.8, y + 4.5, z + 1.2);
    for (const wz of [-1.1, 1.1]) b.box(0.08, 0.8, 0.8, 0xffd27a, x - 1.82, y + 1.5, z + wz, 0, 0, 0, { glow: true, grad: 1 });
    b.box(0.08, 1.5, 0.7, 0x4d3927, x - 1.82, y + 0.9, z);
  }
  return b.build({ receive: false });
});
const fir = (v) => prefab('fir' + v, () => {
  const b = new Builder(0.85), rng = makeRng(40 + v);
  firInto(b, 0, 0, 0, 5.2 + v * 1.3, rng, v > 0);
  b.sph(1, SNOW, 0, 0, 0, 1.5, 0.3, 1.5, { seg: 7 });
  return b.build({ cast: true, receive: false });
});
const cabinStall = (col, text) => prefab('stall' + col + text, () => {
  // a log-cabin market stall; the counter faces +z like the kiosk
  const b = new Builder(0.85);
  b.box(3.6, 0.2, 2.8, 0x6b4a3a, 0, 0.1, 0);
  for (let i = 0; i < 6; i++) b.cyl(0.13, 0.13, 3.3, i % 2 ? 0x8a5f3e : 0x7a5236, 0, 0.33 + i * 0.25, -1.2, 0, 0, PI / 2, { seg: 6 });
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) b.cyl(0.13, 0.13, 2.5, i % 2 ? 0x8a5f3e : 0x7a5236, sx * 1.6, 0.33 + i * 0.25, 0, PI / 2, 0, 0, { seg: 6 });
  b.box(3.3, 1.0, 0.2, col, 0, 0.7, 1.15).box(3.5, 0.1, 0.6, 0xc9a26a, 0, 1.25, 1.3);
  b.box(3.1, 1.25, 0.08, 0xffd98a, 0, 1.95, -0.6, 0, 0, 0, { glow: true, grad: 0.8 });                // warm light inside
  for (let i = 0; i < 3; i++) b.cyl(0.14, 0.11, 0.22, [C.red, C.white, C.teal][i], -0.9 + i * 0.5, 1.41, 1.3, 0, 0, 0, { seg: 8 });
  b.prism(3.3, 1.5, 4.3, 0x6b4a3a, 0, 2.75, 0.1, PI / 2).prism(3.5, 1.6, 4.5, SNOW, 0, 2.83, 0.1, PI / 2);
  for (let i = 0; i < 9; i++) b.cone(0.05, 0.22 + (i % 3) * 0.12, 0xdff2ff, -1.8 + i * 0.45, 2.72 - (i % 3) * 0.06, 1.82, PI, 0, 0, { seg: 5 });   // icicles
  for (let i = 0; i < 10; i++) b.sph(0.065, FAIRY[i % 4], -1.8 + i * 0.4, 2.6 + Math.abs((i % 2) - 0.5) * 0.08, 1.78, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  const g = new THREE.Group(); g.add(b.build({ cast: true }));
  const s = signMesh(text, 2.6, 0.42, '#fff3d6', '#1c3b5a', '#e5383b'); s.position.set(0, 0.72, 1.26); g.add(s);
  return g;
});
const igloo = () => prefab('igloo', () => {
  const b = new Builder(0.9);
  b.add(new THREE.SphereGeometry(2.3, 14, 7, 0, PI * 2, 0, PI / 2), (x, y, z) => ((Math.floor(y / 0.46) + Math.floor((Math.atan2(z, x) + PI) * 2.6 + (Math.floor(y / 0.46) % 2) * 0.5)) % 2 ? SNOW : SNOW_D), 0, 0, 0);
  b.add(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 10, 1, false, 0, PI), SNOW_D, 0, 0, 2.5, PI / 2, PI / 2, 0).box(1.5, 1.0, 0.06, 0xffc46b, 0, 0.5, 2.0, 0, 0, 0, { glow: true, grad: 0.7 });
  b.sph(1, SNOW, 0, 0, 0, 3.0, 0.25, 3.0, { seg: 8 });
  penguinInto(b, 1.9, 0.1, 2.6, 0.6, 0.9);
  return b.build({ cast: true });
});
const frozenPond = () => prefab('pond', () => {
  const b = new Builder(0.95);
  b.cyl(3.6, 3.6, 0.06, ICE, 0, 0.16, 0, 0, 0, 0, { seg: 14 }).cyl(2.2, 2.2, 0.065, 0xd9f3fb, 0.5, 0.162, -0.3, 0, 0, 0, { seg: 10 });
  b.tor(3.7, 0.35, SNOW, 0, 0.1, 0, PI / 2, 0, 0, { seg: 14, tseg: 5 });
  penguinInto(b, -1.2, 0.2, 0.6, 2.2); penguinInto(b, 1.3, 0.2, -1.0, -0.7, 0.8); penguinInto(b, 0.4, 0.2, 1.6, 3.6, 0.7);
  b.cyl(0.04, 0.04, 1.2, C.woodDark, -3.2, 0.7, 2.4).box(0.9, 0.5, 0.05, C.red, -3.2, 1.3, 2.4);
  return b.build({ cast: true });
});
const iceFloe = (v) => prefab('floe' + v, () => {
  const b = new Builder(0.9), r = 2.2 + v * 0.9;
  b.cyl(r, r * 0.8, 0.7, (x, y) => (y > 0.2 ? SNOW : ICE), 0, 0.05, 0, 0, v, 0, { seg: 6 + v });
  b.sph(1, SNOW, 0.3, 0.4, -0.2, r * 0.5, 0.25, r * 0.4, { seg: 6 });
  penguinInto(b, -0.5, 0.4, 0.5, 1.0 + v * 2); if (v) penguinInto(b, 0.9, 0.4, -0.6, -1.8, 0.8);
  return b.build({ receive: false });
});
const iceberg = (v) => prefab('berg' + v, () => {
  const b = new Builder(0.75), rng = makeRng(950 + v);
  for (let i = 0; i < 6; i++) b.add(new THREE.OctahedronGeometry(1), i % 2 ? 0xdff2ff : 0xa9d9f0, (rng() - 0.5) * 8, WATER_Y + 1 + rng() * 2, (rng() - 0.5) * 8, rng() * 0.3, rng() * 3, rng() * 0.3, 3 + rng() * 3, 4 + rng() * 6, 3 + rng() * 3);
  return b.build({ receive: false });
});

// ---------- Christmas Pier ----------
const XR = 0xd8342f, XG = 0x2f9d5c, XGOLD = 0xffd24a, GINGER = 0xb5713a, ICING = 0xfffaf0;
const GIFTS = [[XR, XGOLD], [XG, 0xffffff], [0x2f6fd0, XGOLD], [0xff7ab8, 0xffffff], [0xf2c23a, XR], [0x8a4fd0, 0x9ff0e0]];
// A candy-cane arch over the whole pier, hung with fairy lights and a big star.
const candyArch = () => prefab('candyarch', () => {
  const b = new Builder(0.88), RX = 4.5, Y0 = 4.6, N = 18;
  for (const sx of [-1, 1]) {
    b.box(0.7, 0.5, 0.7, ICING, sx * RX, 0.25, 0).sph(0.55, SNOW, sx * RX, 0.5, 0, 1, 0.4, 1, { seg: 8 });
    for (let i = 0; i < 9; i++) b.cyl(0.2, 0.2, 0.47, i % 2 ? 0xffffff : 0xe5383b, sx * RX, 0.6 + 0.455 * (i + 0.5), 0, 0, 0, 0, { seg: 10 });
    // a bow of holly where the arch springs
    for (const s2 of [-1, 1]) b.sph(0.3, XG, sx * RX + s2 * 0.26, Y0 + 0.05, 0.22, 1, 0.5, 0.3, { seg: 7 });
    for (const [x, y] of [[0, 0], [0.09, 0.09], [-0.09, 0.09]]) b.sph(0.08, XR, sx * RX + x, Y0 + y, 0.32, 1, 1, 1, { seg: 6 });
  }
  for (let k = 0; k < N; k++) b.tor(RX, 0.2, k % 2 ? 0xffffff : 0xe5383b, 0, Y0, 0, 0, 0, k * (PI / N), { arc: PI / N + 0.01, seg: 3, tseg: 10 });
  for (let i = 1; i < 26; i++) { const a = (PI * i) / 26, sag = 0.5 + Math.abs(Math.sin(a * 6.5)) * 0.25; b.sph(0.11, FAIRY[i % 4], Math.cos(a) * (RX - sag), Y0 + Math.sin(a) * (RX - sag), 0.1, 1, 1, 1, { glow: true, seg: 6, grad: 1 }); }
  b.cyl(0.02, 0.02, 0.9, XGOLD, 0, Y0 + RX - 0.6, 0);
  b.add(new THREE.OctahedronGeometry(0.42), 0xfff3b0, 0, Y0 + RX - 1.3, 0, 0, 0.6, 0, 1, 1.35, 0.45, { glow: true, grad: 0.85 });
  b.add(new THREE.OctahedronGeometry(0.42), 0xfff3b0, 0, Y0 + RX - 1.3, 0, 0, 0.6, PI / 2, 1, 1.35, 0.45, { glow: true, grad: 0.85 });
  return b.build({ cast: true });
});
// The giant Christmas tree of the pier, with baubles, lights, a star and presents underneath.
const giantTree = () => prefab('gianttree', () => {
  const b = new Builder(0.84), rng = makeRng(1225);
  b.cyl(0.55, 0.7, 2.0, 0x5a4030, 0, 1.0, 0, 0, 0, 0, { seg: 8 }).sph(1, SNOW, 0, 0, 0, 5.2, 0.4, 5.2, { seg: 10 });
  for (let i = 0; i < 6; i++) {
    const r = 4.3 - i * 0.66, y = 1.5 + i * 1.75, h = 3.1;
    b.cone(r, h, i % 2 ? 0x2f7d4f : 0x286c45, 0, y + h / 2, 0, 0, i * 0.5, 0, { seg: 12 }).cone(r * 0.6, h * 0.6, SNOW, 0, y + h * 0.71, 0, 0, i * 0.5, 0, { seg: 12 });
    const n = 10 - i;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * PI * 2 + i * 0.4, rr = r * 0.8;
      if (k % 2) b.sph(0.24, [XR, XGOLD, 0x2f6fd0, 0xff7ab8][(k + i) % 4], Math.cos(a) * rr, y + 0.28, Math.sin(a) * rr, 1, 1, 1, { seg: 8 });
      else b.sph(0.13, FAIRY[(k + i) % 4], Math.cos(a) * rr, y + 0.5, Math.sin(a) * rr, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
    }
  }
  for (const rz of [0, PI / 2]) b.add(new THREE.OctahedronGeometry(0.7), 0xfff3b0, 0, 14.1, 0, 0, 0.5, rz, 1, 1.4, 0.4, { glow: true, grad: 0.85 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, d = 2.4 + rng() * 1.6, sz = 0.7 + rng() * 0.8, g = GIFTS[i % 6]; giftInto(b, sz, sz * (0.6 + rng() * 0.5), sz, g[0], g[1], Math.cos(a) * d, 0.25, Math.sin(a) * d, rng() * 3); }
  return b.build({ cast: true, receive: false });
});
// Santa's toy workshop; the front faces +z.
const workshop = () => prefab('workshop', () => {
  const b = new Builder(0.85);
  b.box(7, 3.6, 5, 0xc23b2e, 0, 1.8, 0).box(7.15, 0.3, 5.15, ICING, 0, 0.15, 0).box(7.1, 0.2, 5.1, XG, 0, 3.5, 0);
  for (const sx of [-1, 1]) b.box(0.3, 3.6, 0.3, ICING, sx * 3.45, 1.8, 2.45);
  b.prism(5.8, 2.3, 7.8, 0x6b4a3a, 0, 3.6, 0, PI / 2).prism(6.0, 2.4, 8.0, SNOW, 0, 3.7, 0, PI / 2);
  b.box(1.4, 2.3, 0.12, XG, 0, 1.15, 2.5).box(1.6, 0.14, 0.16, ICING, 0, 2.36, 2.52).sph(0.08, XGOLD, 0.45, 1.1, 2.6, 1, 1, 1, { seg: 6 });
  b.tor(0.34, 0.1, 0x286c45, 0, 1.75, 2.6, 0, 0, 0, { seg: 12 }).sph(0.1, XR, 0, 1.42, 2.66, 1.6, 1, 0.6, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.box(1.5, 1.3, 0.08, 0xffd98a, sx * 2.2, 2.0, 2.5, 0, 0, 0, { glow: true, grad: 0.8 });
    b.box(1.7, 0.12, 0.14, ICING, sx * 2.2, 2.7, 2.52).box(1.7, 0.16, 0.26, ICING, sx * 2.2, 1.3, 2.56).box(0.08, 1.3, 0.12, ICING, sx * 2.2, 2.0, 2.53).box(1.5, 0.08, 0.12, ICING, sx * 2.2, 2.0, 2.53);
    caneInto(b, sx * 1.0, 0, 2.75, 1.9, 0.09, -sx);
  }
  for (let i = 0; i < 18; i++) b.sph(0.085, FAIRY[i % 4], -3.4 + i * 0.4, 3.42 + Math.abs((i % 2) - 0.5) * 0.1, 2.62, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  for (let i = 0; i < 12; i++) b.cone(0.06, 0.25 + (i % 3) * 0.15, 0xdff2ff, -3.3 + i * 0.6, 3.52 - (i % 3) * 0.07, 2.95, PI, 0, 0, { seg: 5 });
  b.box(1.0, 2.2, 1.0, 0x8a4a3a, 2.2, 5.3, -0.9).box(1.2, 0.2, 1.2, SNOW, 2.2, 6.45, -0.9);
  for (let i = 0; i < 4; i++) b.sph(0.4 + i * 0.16, i % 2 ? 0xe6ecf5 : 0xffffff, 2.2 + i * 0.35, 7.1 + i * 0.75, -0.9, 1, 0.9, 1, { seg: 7 });
  // a big cog over the door, because toys are made here
  b.cyl(0.55, 0.55, 0.1, XGOLD, 0, 3.05, 2.56, PI / 2, 0, 0, { seg: 12 }).cyl(0.2, 0.2, 0.14, 0xc23b2e, 0, 3.05, 2.58, PI / 2, 0, 0, { seg: 8 });
  for (let i = 0; i < 8; i++) b.box(0.2, 0.2, 0.1, XGOLD, Math.cos(i * 0.785) * 0.62, 3.05 + Math.sin(i * 0.785) * 0.62, 2.56, 0, 0, i * 0.785);
  giftInto(b, 0.9, 0.7, 0.9, GIFTS[2][0], GIFTS[2][1], -2.9, 0, 3.4, 0.3); giftInto(b, 0.6, 0.5, 0.6, GIFTS[3][0], GIFTS[3][1], -2.1, 0, 3.6, -0.4); giftInto(b, 0.7, 0.9, 0.7, GIFTS[4][0], GIFTS[4][1], 3.0, 0, 3.3, 0.5);
  const g = new THREE.Group(); g.add(b.build({ cast: true }));
  const s = signMesh('TOY WORKSHOP', 3.4, 0.5, '#fff3d6', '#1f6b3e', '#e5383b'); s.position.set(0, 4.35, 2.2); s.rotation.x = -0.25; g.add(s);
  return g;
});
// A gingerbread house iced with sweets; the front faces +z.
const gingerHouse = () => prefab('gingerhouse', () => {
  const b = new Builder(0.86), SW = [XR, 0x8ff0ff, XGOLD, 0xff7ab8, 0xa6ff9a];
  b.box(4.4, 2.7, 3.6, GINGER, 0, 1.35, 0).box(4.6, 0.22, 3.8, ICING, 0, 0.11, 0);
  b.prism(4.4, 2.2, 5.0, 0x9a5a2c, 0, 2.7, 0, PI / 2).prism(4.6, 2.25, 5.2, ICING, 0, 2.82, 0, PI / 2);
  for (let i = 0; i < 11; i++) b.sph(0.26, ICING, -2.5 + i * 0.5, 2.78, 2.28, 1, 1.1 + (i % 2) * 0.5, 0.7, { seg: 7 });      // icing dripping off the eaves
  for (let i = 0; i < 14; i++) { const u = (i % 7) / 6, row = i < 7 ? 0 : 1; b.sph(0.17, SW[i % 5], -2.1 + u * 4.2, 3.35 + row * 0.75, 1.55 - row * 0.85, 1, 0.8, 1, { seg: 7 }); }
  b.cyl(0.6, 0.6, 0.12, 0x7a3f1d, 0, 1.25, 1.8, PI / 2, 0, 0, { seg: 12 }).box(1.2, 1.25, 0.12, 0x7a3f1d, 0, 0.62, 1.8).tor(0.64, 0.07, ICING, 0, 1.25, 1.84, 0, 0, 0, { arc: PI, seg: 10 }).sph(0.07, XGOLD, 0.35, 0.8, 1.9, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.box(0.85, 0.85, 0.08, 0xffd98a, sx * 1.45, 1.55, 1.8, 0, 0, 0, { glow: true, grad: 0.8 });
    b.tor(0.5, 0.07, ICING, sx * 1.45, 1.55, 1.84, 0, 0, PI / 4, { seg: 4 });
    b.cyl(0.36, 0.36, 0.1, ICING, sx * 1.45, 0.55, 1.84, PI / 2, 0, 0, { seg: 12 }).cyl(0.2, 0.2, 0.12, XR, sx * 1.45, 0.55, 1.86, PI / 2, 0, 0, { seg: 8 });     // peppermint swirls
    caneInto(b, sx * 2.3, 0, 1.95, 2.3, 0.1, -sx);
    // lollipop trees in the front garden
    b.cyl(0.05, 0.05, 1.6, ICING, sx * 3.1, 0.8, 2.6).cyl(0.55, 0.55, 0.14, SW[sx > 0 ? 3 : 1], sx * 3.1, 1.9, 2.6, PI / 2, 0, 0, { seg: 14 }).cyl(0.3, 0.3, 0.16, ICING, sx * 3.1, 1.9, 2.6, PI / 2, 0, 0, { seg: 10 }).cyl(0.12, 0.12, 0.18, SW[sx > 0 ? 3 : 1], sx * 3.1, 1.9, 2.6, PI / 2, 0, 0, { seg: 8 });
  }
  b.box(0.6, 1.2, 0.6, GINGER, -1.3, 4.3, -0.5).box(0.75, 0.16, 0.75, ICING, -1.3, 4.95, -0.5);
  b.sph(1, SNOW, 0, 0, 1.2, 3.6, 0.22, 2.6, { seg: 8 });
  return b.build({ cast: true });
});
// One of the reindeer, waiting by the workshop; v 1 has the shiny nose. Faces +z.
const reindeer = (v) => prefab('reindeer' + v, () => {
  const b = new Builder(0.85), BR = 0x8a5a36, BR_D = 0x5f3d24, CR = 0xe9d9bf;
  b.cap(0.33, 0.85, BR, 0, 1.2, 0, PI / 2, 0, 0, { seg: 10 }).sph(0.3, CR, 0, 1.08, 0.42, 0.8, 0.8, 0.7, { seg: 8 }).sph(0.12, CR, 0, 1.38, -0.78, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) for (const z of [-0.42, 0.42]) b.cyl(0.07, 0.055, 0.95, BR, sx * 0.2, 0.52, z, 0, 0, 0, { seg: 6 }).cyl(0.075, 0.085, 0.14, 0x2a1d14, sx * 0.2, 0.07, z, 0, 0, 0, { seg: 6 });
  b.cyl(0.15, 0.2, 0.75, BR, 0, 1.66, 0.62, 0.55, 0, 0, { seg: 8 }).sph(0.22, BR, 0, 2.02, 0.86, 1, 1, 1.25, { seg: 9 }).sph(0.14, CR, 0, 1.96, 1.1, 1, 0.9, 1.1, { seg: 7 });
  if (v) b.sph(0.085, 0xff4a3a, 0, 1.99, 1.25, 1, 1, 1, { glow: true, seg: 7, grad: 0.9 }); else b.sph(0.07, 0x2a1d14, 0, 1.99, 1.24, 1, 1, 1, { seg: 6 });
  b.tor(0.2, 0.05, XR, 0, 1.6, 0.6, 1.0, 0, 0, { seg: 10 }).sph(0.07, XGOLD, 0, 1.44, 0.76, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.sph(0.045, 0x1f2933, sx * 0.15, 2.08, 1.0, 1, 1, 0.6, { seg: 5 }).sph(0.1, BR_D, sx * 0.24, 2.18, 0.78, 0.5, 1, 0.4, { seg: 6 });
    b.cyl(0.03, 0.04, 0.6, CR, sx * 0.2, 2.45, 0.78, 0, 0, sx * -0.45, { seg: 5 }).cyl(0.025, 0.03, 0.3, CR, sx * 0.38, 2.6, 0.78, 0, 0, sx * -1.1, { seg: 5 }).cyl(0.025, 0.03, 0.26, CR, sx * 0.22, 2.72, 0.78, 0, 0, sx * 0.2, { seg: 5 });
  }
  return b.build({ cast: true });
});
// A heap of giant presents.
const presentPile = (v) => prefab('presents' + v, () => {
  const b = new Builder(0.86), rng = makeRng(770 + v);
  b.sph(1, SNOW, 0, 0, 0, 3.0, 0.25, 2.6, { seg: 8 });
  for (let i = 0; i < 6; i++) { const g = GIFTS[(i + v * 2) % 6], sz = 1.5 - i * 0.14, a = i * 1.3 + v; giftInto(b, sz, sz * (0.6 + rng() * 0.5), sz * (0.8 + rng() * 0.4), g[0], g[1], i ? Math.cos(a) * (1.1 + rng() * 0.8) : 0, 0.15, i ? Math.sin(a) * (1.0 + rng() * 0.7) : 0, rng() * 3); }
  { const g = GIFTS[(v + 4) % 6]; giftInto(b, 0.8, 0.7, 0.8, g[0], g[1], 0.1, 1.1, 0, 0.5); }
  return b.build({ cast: true });
});
// A giant bauble bobbing on the sea.
const floatBauble = (col) => prefab('fbauble' + col, () => {
  const b = new Builder(0.8);
  b.add(new THREE.SphereGeometry(1.3, 16, 12), (x, y, z) => (Math.abs(y - 0.35) < 0.14 ? XGOLD : Math.abs(y - 0.35) < 0.3 ? 0xffffff : col), 0, 0.35, 0);
  b.cyl(0.26, 0.3, 0.3, XGOLD, 0, 1.7, 0, 0, 0, 0, { seg: 10 }).tor(0.14, 0.035, XGOLD, 0, 1.92, 0, 0, 0, 0, { seg: 8 });
  return b.build({ receive: false });
});

// ---------- Marshmallow Shore ----------
const CREAM = 0xfff1dc, CREAM_D = 0xffdcc0, MP = 0xffb3d4, MW = 0xfff6ee, MINT = 0xb8f0d0, CHOCO = 0x6b3a22;
const SWEETS = [0xff5a8a, 0x5ac8ff, 0xffe24a, 0x7be07b, 0xb07bff, 0xffb347];
// Ground of smooth icing, scattered with sprinkles, with a wafer kerb along the pier.
const sweetGround = () => prefab('sweetGround', () => {
  const b = new Builder(0.86), rng = makeRng(1111);
  b.box(46, 3.6, CHUNK, CREAM, DECK_HALF + 23, -1.82, -CHUNK / 2);
  for (let i = 0; i < 20; i++) b.box(0.3, 0.2, 1.94, i % 2 ? 0xe9c27a : 0xd9ad62, DECK_HALF + 0.15, 0.04, -1 - i * 2);      // wafer kerb
  for (let i = 0; i < 16; i++) b.sph(1, i % 2 ? CREAM_D : 0xffffff, DECK_HALF + 2.2 + rng() * 20, -0.03, -rng() * CHUNK, 1.2 + rng() * 2.4, 0.08 + rng() * 0.14, 0.8 + rng() * 1.6, { seg: 7 });
  for (let i = 0; i < 70; i++) b.box(0.09, 0.07, 0.34, SWEETS[i % 6], DECK_HALF + 0.9 + rng() * 14, 0.03, -rng() * CHUNK, 0, rng() * 3, 0, { grad: 1 });
  return b.build();
});
// Far hills of pink, white and mint marshmallow, each with icing on top and a cherry.
const mallowHills = (v) => prefab('mallowhills' + v, () => {
  const b = new Builder(0.84), rng = makeRng(1120 + v);
  for (let i = 0; i < 8; i++) {
    const cx = 27 + rng() * 16, cz = -rng() * CHUNK, sx = 7 + rng() * 5, sy = 3 + rng() * 4 + (cx - 27) * 0.25, sz = 6 + rng() * 5, col = [MP, MW, MINT][i % 3];
    b.sph(1, col, cx, 0, cz, sx, sy, sz, { seg: 10 }).sph(1, 0xffffff, cx, sy * 0.72, cz, sx * 0.62, sy * 0.32, sz * 0.62, { seg: 9 });
    b.sph(0.7, 0xe5283b, cx, sy * 1.04 + 0.5, cz, 1, 1, 1, { seg: 8 });
  }
  for (let i = 0; i < 3; i++) { const x = 20 + rng() * 6, z = -4 - i * 13 - rng() * 5, h = 1.6 + rng() * 0.5; mallowInto(b, 1.7, h, i % 2 ? MW : MP, x, 0, z); mallowInto(b, 1.5, h, i % 2 ? MP : MW, x + 0.2, h * 0.97, z + 0.1); }
  return b.build({ receive: false });
});
// A pile of giant marshmallows by the pier.
const mallowPile = (v) => prefab('mallowpile' + v, () => {
  const b = new Builder(0.86);
  mallowInto(b, 1.5, 1.5, MP, 0, 0, 0); mallowInto(b, 1.3, 1.4, MW, 2.4, 0, 0.8); mallowInto(b, 1.25, 1.3, v ? MINT : MW, 0.9, 1.45, 0.3); mallowInto(b, 1.0, 1.1, MP, -1.9, 0, 1.4);
  if (v) { mallowInto(b, 0.9, 1.0, MW, 1.0, 2.7, 0.4); b.sph(0.95, CHOCO, 1.0, 3.6, 0.4, 1, 0.25, 1, { seg: 12 }); }
  for (let i = 0; i < 3; i++) b.sph(0.4, SWEETS[i + v], -2.6 + i * 2.6, 0.2, 2.4 - i * 0.5, 1, 0.9, 1, { seg: 9 });      // gumdrops
  return b.build({ cast: true });
});
// Lollipop and candyfloss trees.
const lollyTree = (v) => prefab('lollytree' + v, () => {
  const b = new Builder(0.86);
  b.sph(1, CREAM_D, 0, 0, 0, 1.0, 0.2, 1.0, { seg: 8 });
  if (v < 3) lollyInto(b, 0, 0, 0, 4.6 + v * 0.7, 1.45 - v * 0.15, SWEETS[v], 0xffffff, 0);
  else {
    // candyfloss: a paper cone and a big soft puff
    const col = v === 3 ? 0xff9fd0 : 0x9fd8ff;
    b.cone(0.5, 2.6, MW, 0, 1.3, 0, PI, 0, 0, { seg: 8 });
    for (const [x, y, z, r] of [[0, 3.6, 0, 1.5], [-0.9, 3.2, 0.3, 1.0], [0.9, 3.3, -0.2, 1.05], [0.2, 4.5, 0.2, 1.0], [-0.4, 4.2, -0.6, 0.9], [0.5, 3.0, 0.7, 0.85]]) b.sph(r, col, x, y, z, 1, 0.92, 1, { seg: 9 });
  }
  return b.build({ cast: true, receive: false });
});
// A cupcake as big as a house, with a little door and windows; the front faces +z.
const cupcakeHouse = () => prefab('cupcakehouse', () => {
  const b = new Builder(0.86);
  cupcakeInto(b, 0, 0, 0, 3.0, 0xff9fd0, 0xffffff, 0x9fe0ff);
  b.box(1.1, 1.9, 0.2, 0x8a4a2a, 0, 0.95, 2.05, -0.2, 0, 0).tor(0.55, 0.09, MW, 0, 1.9, 1.9, -0.2, 0, 0, { arc: PI, seg: 10 }).sph(0.08, 0xffd24a, 0.32, 0.95, 2.14, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) b.cyl(0.42, 0.42, 0.12, 0xffe9a8, sx * 1.35, 2.1, 1.95, PI / 2 - 0.2, 0, sx * -0.6, { seg: 12, glow: true, grad: 0.85 }).tor(0.44, 0.07, MW, sx * 1.35, 2.1, 2.02, -0.2, sx * 0.6, 0, { seg: 12 });
  lollyInto(b, -3.2, 0, 2.2, 2.2, 0.7, SWEETS[0], 0xffffff, 0.3); lollyInto(b, 3.2, 0, 2.0, 2.6, 0.75, SWEETS[4], 0xffffff, -0.3);
  return b.build({ cast: true });
});
// A wobbly jelly castle on a plate.
const jellyCastle = () => prefab('jellycastle', () => {
  const b = new Builder(0.84);
  b.cyl(4.6, 4.2, 0.25, 0xffffff, 0, 0.12, 0, 0, 0, 0, { seg: 18 });
  const tier = (rb, rt, h, y, c1, c2, x = 0, z = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, 14, 1).toNonIndexed(); b.add(g, (px, py, pz, i) => (i < 84 ? (Math.floor(i / 6) % 2 ? c1 : c2) : c1), x, y + h / 2, z); b.sph(rt, c1, x, y + h, z, 1, 0.3, 1, { seg: 12 }); };
  tier(3.6, 3.0, 2.0, 0.25, 0xff5a6e, 0xff7d8c); tier(2.4, 1.9, 1.7, 2.25, 0xffa43a, 0xffbb62); tier(1.4, 0.9, 1.4, 3.95, 0x7be07b, 0x97ea97);
  b.sph(0.7, MW, 0, 5.5, 0, 1, 0.6, 1, { seg: 9 }).sph(0.3, 0xe5283b, 0, 5.95, 0, 1, 1, 1, { seg: 8 });
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; tier(0.8, 0.5, 1.5, 0.25, 0xb07bff, 0xc79bff, Math.cos(a) * 3.6, Math.sin(a) * 3.6); }
  return b.build({ cast: true });
});
// Somebody dropped a giant ice cream: the scoop has gone splat and the cone sticks up in the air.
const droppedIce = () => prefab('droppedice', () => {
  const b = new Builder(0.86);
  b.sph(1, 0xfff1dc, 0, 0, 0, 3.4, 0.35, 3.0, { seg: 12 }).sph(2.0, 0xffb3d4, 0, 1.1, 0, 1.1, 0.8, 1.05, { seg: 14 });
  for (let i = 0; i < 6; i++) b.sph(0.5, 0xffb3d4, Math.cos(i * 1.05) * 2.6, 0.2, Math.sin(i * 1.05) * 2.4, 1.3, 0.4, 1.2, { seg: 7 });
  b.cone(1.5, 4.6, 0xe0aa60, 0.6, 4.3, -0.2, 0, 0, -0.28, { seg: 14 });
  for (let i = 0; i < 5; i++) b.tor(1.36 - i * 0.26, 0.05, 0xc48f48, 0.6 + (i * 0.25 + 0.2) * 0.9 * 0.3, 2.6 + i * 0.85, -0.2, PI / 2, -0.28, 0, { seg: 14 });
  b.box(0.5, 2.4, 0.14, CHOCO, -1.5, 2.6, 0.6, 0.2, 0, 0.5);      // the chocolate flake
  for (let i = 0; i < 14; i++) { const a = i * 1.9; b.box(0.09, 0.09, 0.3, SWEETS[i % 6], Math.cos(a) * 1.6, 1.9 + (i % 3) * 0.35, Math.sin(a) * 1.5, 0.5, a, 0); }
  return b.build({ cast: true });
});
// A rainbow of sour-belt sweets over the pier, standing on two marshmallow clouds.
const rainbowArch = () => prefab('rainbowarch', () => {
  const b = new Builder(0.9), cols = [0xff5a6e, 0xffa43a, 0xffe24a, 0x7be07b, 0x5ac8ff, 0xb07bff];
  cols.forEach((c, i) => b.tor(5.55 - i * 0.24, 0.13, c, 0, 2.6, 0, 0, 0, 0, { arc: PI, seg: 28, tseg: 6 }));
  for (const sx of [-1, 1]) for (const [x, y, z, r] of [[0, 2.6, 0, 1.0], [-0.7, 2.3, 0.2, 0.7], [0.7, 2.35, -0.1, 0.72], [0.1, 3.1, 0.1, 0.7], [0, 1.2, 0, 0.5]]) b.sph(r, MW, sx * 4.95 + x * 0.8, y, z, 1, 0.9, 1, { seg: 9 });
  for (const sx of [-1, 1]) b.cyl(0.16, 0.2, 2.2, 0xffb3d4, sx * 4.95, 1.1, 0, 0, 0, 0, { seg: 8 });
  return b.build({ cast: true });
});
// Things bobbing in the milkshake.
const floatSweet = (v) => prefab('floatsweet' + v, () => {
  const b = new Builder(0.86);
  if (v === 0) { mallowInto(b, 1.5, 1.3, MP, 0, -0.3, 0); mallowInto(b, 1.0, 0.9, MW, 2.6, -0.25, 0.8); }
  else if (v === 1) donutInto(b, 1.5, 0.75, 0xff8fc0, 0, 0.2, 0);
  else { donutInto(b, 1.3, 0.65, 0x8fd8ff, 0, 0.15, 0); mallowInto(b, 0.9, 0.8, MW, -2.6, -0.2, 0.5); }
  return b.build({ receive: false });
});

// ---------- Spiral Bay ----------
const SP_A = 0xff5fb0, SP_B = 0x35d6c8, SP_C = 0xffd23f, SP_D = 0x7a4fe0, SP_W = 0xfff8ee, SP_DK = 0x3a2a7a;
// A great hoop right round the pier, centred on the line the world twists about, with a spiral medallion at the top:
// one after another they show the corkscrew.
const spiralHoop = (v) => prefab('spiralhoop' + v, () => {
  const b = new Builder(0.92), R = 7.6, cy = 3, c1 = v ? SP_B : SP_A, c2 = SP_W;
  b.add(...painted(new THREE.TorusGeometry(R, 0.3, 7, 56), (x, y) => ((((Math.floor((Math.atan2(y, x) / (PI * 2)) * 28) % 2) + 2) % 2) ? c1 : c2)), 0, cy, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  swirlWheelInto(b, 1.25, 0, cy + R, 0.1, v ? SP_A : SP_D, SP_W, SP_C, 1, 2.2, 36);
  b.add(...swirlDisc(1.16, v ? SP_A : SP_D, SP_W, 1, 2.2, 36, 8), 0, cy + R, 0.1 - 0.11, 0, PI, 0, 1, 1, 1, { grad: 1 });
  for (let i = 1; i < 8; i++) { const a = PI / 2 + i * PI / 4; b.sph(0.42, [SP_C, SP_B, SP_A, SP_D][i % 4], Math.cos(a) * R, cy + Math.sin(a) * R, 0, 1, 1, 1, { seg: 9, glow: i % 2 === 0, grad: i % 2 ? 0.85 : 1 }); }
  return b.build({ receive: false });
});
// A twisted spire of rock standing in the sea, like a stick of barley sugar.
const twistSpire = (v) => prefab('twistspire' + v, () => {
  const b = new Builder(0.8), n = 16, h = 26 + v * 8, cols = v === 1 ? [0x8f6fe0, 0x6a4ac8] : v === 2 ? [0x3fc8c0, 0x2aa3a8] : [0xe070b8, 0xc050a0];
  for (let i = 0; i < n; i++) { const t = i / n, w = 6.5 * (1 - t * 0.78); b.box(w, h / n + 0.05, w, cols[i % 2], 0, WATER_Y - 1 + (h * (i + 0.5)) / n, 0, 0, i * 0.3, 0); }
  b.sph(1.1, SP_C, 0, WATER_Y - 1 + h + 0.8, 0, 1, 1, 1, { seg: 10, glow: true, grad: 1 });
  b.sph(5.2, 0xffffff, 0, WATER_Y, 0, 1, 0.06, 1, { seg: 12 });      // foam round the foot
  return b.build({ receive: false });
});
// A whirlpool turning in the sea.
const whirlpool = (v) => prefab('whirlpool' + v, () => {
  const g = new THREE.Group(), b = new Builder(1), R = v ? 5 : 7.5;
  b.add(...swirlDisc(R, 0xffffff, v ? 0x8ff0e6 : 0xb9a8ff, 2, 1.4, 48, 10), 0, 0, 0, -PI / 2, 0, 0, 1, 1, 1, { grad: 1 });
  const m = b.build({ material: MAT.double, receive: false }); m.name = 'spin'; g.add(m);
  return g;
});
// A giant spiral wheel turning on top of a striped tower.
const hypnoTower = () => prefab('hypnotower', () => {
  const g = new THREE.Group(), b = new Builder(0.86);
  b.cyl(2.3, 2.6, 0.5, SP_DK, 0, 0.25, 0, 0, 0, 0, { seg: 16 });
  b.add(...painted(new THREE.CylinderGeometry(1.1, 1.7, 7.4, 16, 12), helix(SP_D, SP_W, 6, 0.5)), 0, 4.2, 0);
  b.cyl(1.5, 1.2, 0.4, SP_C, 0, 8.0, 0, 0, 0, 0, { seg: 14 }).cyl(0.3, 0.3, 1.2, SP_DK, 0, 8.3, 0.9, PI / 2, 0, 0, { seg: 8 });
  for (let i = 0; i < 16; i++) { const a = i * PI / 8; b.sph(0.16, i % 2 ? SP_C : 0xffffff, Math.cos(a) * 4.25, 8.3 + Math.sin(a) * 4.25, 1.3, 1, 1, 1, { seg: 6, glow: true, grad: 1 }); }
  b.tor(4.25, 0.14, SP_DK, 0, 8.3, 1.3, 0, 0, 0, { seg: 40, tseg: 6 });
  g.add(b.build({ cast: true }));
  const w = new Builder(1);
  swirlWheelInto(w, 4.1, 0, 0, 0, SP_A, SP_W, SP_C, 2, 1.6, 56);
  const wm = w.build({ receive: false }); wm.position.set(0, 8.3, 1.5); wm.name = 'whirl'; g.add(wm);
  return g;
});
// A house made out of an enormous turret shell.
const shellHouse = () => prefab('shellhouse', () => {
  const b = new Builder(0.86);
  b.sph(3.6, SAND, 0, 0, 0, 1, 0.12, 1, { seg: 12 });
  turretInto(b, 0, 0, 0, 12.5, 3.3, 0xffb86b, SP_W, 30);
  b.box(1.3, 2.1, 0.3, 0x7a3f8a, 0, 1.05, 3.1).sph(0.65, 0x7a3f8a, 0, 2.1, 3.1, 1, 1, 0.23, { seg: 10 }).sph(0.09, SP_C, 0.4, 1.05, 3.28, 1, 1, 1, { seg: 6 });
  for (const [x, y, z] of [[-1.5, 3.4, 2.0], [1.3, 5.2, 1.3]]) b.sph(0.5, 0xffe9a8, x, y, z, 1, 1, 0.5, { seg: 9, glow: true, grad: 1 }).tor(0.52, 0.09, 0x7a3f8a, x, y, z + 0.14, 0, 0, 0, { seg: 12 });
  b.cyl(0.05, 0.05, 1.6, SP_DK, 0, 13.2, 0, 0, 0, 0, { seg: 5 }).flat([[[0, 14.0, 0], [0, 13.4, 0], [1.1, 13.7, 0]]], SP_A);
  return b.build({ cast: true, material: MAT.double });
});
// Seaside pinwheels as tall as houses, whirling in the wind.
const pinwheel = (v) => prefab('pinwheel' + v, () => {
  const g = new THREE.Group(), b = new Builder(0.86), h = 6.5 + v * 2.2;
  b.add(...painted(new THREE.CylinderGeometry(0.16, 0.2, h, 10, 12), helix([SP_A, SP_B, SP_D][v % 3], SP_W, 4, 1.2)), 0, h / 2, 0);
  g.add(b.build({ cast: true }));
  const w = new Builder(1), cols = [[SP_A, SP_C], [SP_B, SP_W], [SP_D, SP_A]][v % 3], r = 2.3 + v * 0.3;
  for (let i = 0; i < 4; i++) {
    const a = i * PI / 2, c = Math.cos(a), s = Math.sin(a), P = (x, y, z = 0) => [x * c - y * s, x * s + y * c, z];
    w.flat([[P(0, 0), P(r, 0), P(r * 0.5, r * 0.5, 0.45)]], cols[0], 0, 0, 0, 0, 0, 0, { grad: 1 }).flat([[P(0, 0), P(r * 0.5, r * 0.5, 0.45), P(0, r * 0.55, 0.1)]], cols[1], 0, 0, 0, 0, 0, 0, { grad: 1 });
  }
  w.sph(0.28, SP_C, 0, 0, 0.3, 1, 1, 0.7, { seg: 8 });
  const wm = w.build({ material: MAT.double, receive: false }); wm.position.set(0, h, 0.3); wm.name = 'whirl'; g.add(wm);
  return g;
});
// A coiled shell bobbing in the sea.
const floatShell = (v) => prefab('floatshell' + v, () => {
  const b = new Builder(0.88);
  coilInto(b, 0, 0.5, 0, 1.7, v ? SP_B : SP_A, SP_W, 16);
  return b.build({ receive: false });
});

// ---------- the sewers ----------
// A brick tunnel: walls SEW_W either side of the centre line, then a tall vault that springs at SEW_SPR and rises SEW_RISE.
const SEW_W = 8.2, SEW_SPR = 3, SEW_RISE = 9, SEW_BOT = -3.6, SLIME = 0x8dff5a;
let brickMat = null;
const getBrick = () => brickMat || (brickMat = new THREE.MeshLambertMaterial({ map: brickTexture(), side: THREE.DoubleSide }));
// the tunnel's inside outline, from the foot of the left wall over the vault to the foot of the right wall
function sewerProfile(n = 16) {
  const pts = [[-SEW_W, SEW_BOT], [-SEW_W, 0]];
  for (let i = 0; i <= n; i++) { const a = PI - (i / n) * PI; pts.push([Math.cos(a) * SEW_W, SEW_SPR + Math.sin(a) * SEW_RISE]); }
  pts.push([SEW_W, 0], [SEW_W, SEW_BOT]);
  return pts;
}
function meshGeo(pos, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const sewerShell = () => prefab('sewerShell', () => {
  const pts = sewerProfile(), n = pts.length, nz = 10, pos = [], uv = [], idx = [];
  let u = 0; const us = pts.map((p, i) => (i ? (u += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])) : 0) / 4);
  for (let k = 0; k <= nz; k++) pts.forEach((p, i) => { pos.push(p[0], p[1], (-k * CHUNK) / nz); uv.push(us[i], (k * CHUNK) / nz / 4); });
  for (let k = 0; k < nz; k++) for (let i = 0; i < n - 1; i++) { const a = k * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
  return new THREE.Mesh(meshGeo(pos, uv, idx), getBrick());
});
// The wall across each end of the tunnel, with the tunnel's outline cut out of it.
const sewerMouth = () => prefab('sewerMouth', () => {
  const pts = sewerProfile(), n = pts.length, X = 70, Y = 34, pos = [], uv = [], idx = [];
  const outer = pts.map(([x, y]) => {
    if (y <= SEW_SPR + 0.001) return [Math.sign(x) * X, y];
    const dy = y - SEW_SPR, t = Math.min(X / Math.max(1e-6, Math.abs(x)), (Y - SEW_SPR) / dy);
    return [x * t, SEW_SPR + dy * t];
  });
  const vert = (q) => { pos.push(q[0], q[1], 0); uv.push(q[0] / 4, q[1] / 4); return pos.length / 3 - 1; };
  const ids = pts.map((p, i) => [vert(p), vert(outer[i])]);
  for (let i = 0; i < n - 1; i++) {
    const [a, b] = ids[i], [c, d] = ids[i + 1];
    idx.push(a, b, c, b, d, c);
    const o0 = outer[i], o1 = outer[i + 1];
    if (Math.abs(Math.abs(o0[0]) - X) < 0.01 !== Math.abs(Math.abs(o1[0]) - X) < 0.01 && o0[1] > SEW_SPR && o1[1] > SEW_SPR) idx.push(b, vert([Math.sign(o0[0] + o1[0]) * X, Y]), d);   // fill the top corner
  }
  const g = new THREE.Group(); g.add(new THREE.Mesh(meshGeo(pos, uv, idx), getBrick()));
  // dressed stone round the opening
  const b = new Builder(0.85);
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -Math.sin(ang), ny = Math.cos(ang), out = nx * mx + ny * (my - SEW_SPR) > 0 ? 1 : -1;
    b.box(len * 0.96, 1.0, 0.8, i % 2 ? 0xb5ae9b : 0x9f9886, mx + nx * out * 0.5, my + ny * out * 0.5, 0, 0, 0, ang);
  }
  b.box(1.5, 1.7, 1.0, 0xc4bda9, 0, SEW_SPR + SEW_RISE + 0.75, 0);   // keystone
  g.add(b.build({ receive: false }));
  return g;
});
const sewerRibs = () => prefab('sewerRibs', () => {
  const b = new Builder(0.8), pts = sewerProfile(12);
  for (let i = 1; i < pts.length - 2; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -Math.sin(ang), ny = Math.cos(ang), inw = nx * mx + ny * (my - SEW_SPR) > 0 ? -1 : 1;
    b.box(len * 1.02, 0.5, 0.9, i % 2 ? 0x77725f : 0x868170, mx + nx * inw * 0.2, my + ny * inw * 0.2, 0, 0, 0, ang);
  }
  return b.build({ receive: false });
});
const sewerSide = (v) => prefab('sewerSide' + v, () => {
  // everything along the right-hand wall (mirror it for the left)
  const b = new Builder(0.75), rng = makeRng(1200 + v * 17), X = SEW_W;
  b.cyl(0.36, 0.36, CHUNK, 0x9a5a36, X - 0.55, 3.4, -CHUNK / 2, PI / 2, 0, 0, { seg: 10 });
  b.cyl(0.17, 0.17, CHUNK, 0x4f8a5c, X - 0.32, 4.5, -CHUNK / 2, PI / 2, 0, 0, { seg: 8 });
  b.cyl(0.11, 0.11, CHUNK, 0x8f9bb0, X - 0.26, 2.4, -CHUNK / 2, PI / 2, 0, 0, { seg: 6 });
  for (let i = 0; i < 8; i++) {
    const z = -2.5 - i * 5;
    b.cyl(0.44, 0.44, 0.14, 0x7a4628, X - 0.55, 3.4, z, PI / 2, 0, 0, { seg: 10 }).box(0.56, 0.1, 0.16, C.iron, X - 0.3, 2.98, z).cyl(0.22, 0.22, 0.1, 0x3d6f49, X - 0.32, 4.5, z + 1.2, PI / 2, 0, 0, { seg: 8 });
  }
  for (const z of [-5, -15, -25, -35]) {   // caged lamps
    b.box(0.4, 0.12, 0.3, C.iron, X - 0.2, 6.42, z).sph(0.22, 0xffd98a, X - 0.46, 6.1, z, 1, 1.25, 1, { glow: true, seg: 8, grad: 0.9 });
    b.tor(0.27, 0.02, C.iron, X - 0.46, 6.1, z, 0, 0, 0, { seg: 8 }).tor(0.27, 0.02, C.iron, X - 0.46, 6.1, z, 0, PI / 2, 0, { seg: 8 });
  }
  for (const z of v ? [-12, -31] : [-8, -27]) {   // outfalls pouring glowing slime into the channel
    b.cyl(0.95, 0.95, 1.3, 0x8f918a, X - 0.5, 0.9, z, 0, 0, PI / 2, { seg: 14 }).cyl(0.78, 0.78, 1.32, 0x15181a, X - 0.52, 0.9, z, 0, 0, PI / 2, { seg: 12, grad: 1 });
    b.tor(0.95, 0.1, 0x777a72, X - 1.14, 0.9, z, 0, PI / 2, 0, { seg: 14 });
    b.box(0.22, 3.4, 1.0, SLIME, X - 1.27, -1.0, z, 0, 0, 0.05, { glow: true, grad: 0.5 }).box(0.26, 3.4, 0.3, 0xd6ffb0, X - 1.3, -1.0, z + 0.2, 0, 0, 0.05, { glow: true, grad: 0.6 });
    b.sph(0.9, 0xc8ff9a, X - 1.5, WATER_Y + 0.1, z, 1.1, 0.3, 1.3, { glow: true, seg: 8, grad: 0.7 }).sph(0.3, SLIME, X - 1.1, 0.22, z, 1, 0.5, 2.2, { glow: true, seg: 7, grad: 0.8 });
  }
  const ez = v ? -21 : -18;   // a barred side tunnel with eyes in the dark
  b.box(0.2, 2.6, 2.4, 0x101314, X - 0.06, 1.7, ez, 0, 0, 0, { grad: 1 }).box(0.3, 0.3, 2.9, 0x868170, X - 0.1, 3.1, ez).box(0.3, 0.2, 2.9, 0x868170, X - 0.1, 0.35, ez);
  for (let k = 0; k < 6; k++) b.cyl(0.05, 0.05, 2.6, C.iron, X - 0.22, 1.7, ez - 1.0 + k * 0.4, 0, 0, 0, { seg: 6 });
  for (const [dy, dz] of [[1.3, -0.5], [2.2, 0.45], [0.9, 0.6]]) for (const e of [-0.09, 0.09]) b.sph(0.045, 0xffe27a, X - 0.17, dy, ez + dz + e, 1, 1, 1, { glow: true, seg: 5, grad: 1 });
  ratInto(b, false, 0.36, X - 0.55, 3.76, -10 - v * 7, -PI / 2); ratInto(b, true, 0.32, X - 0.55, 3.76, -31 + v * 4, -PI / 2 + 0.4);   // rats on the pipe
  for (let i = 0; i < 7; i++) b.sph(0.5 + rng() * 0.4, i % 2 ? 0x3f6a3a : 0x4f7f3f, X - 0.1, WATER_Y + 0.3 + rng() * 1.2, -rng() * CHUNK, 0.3, 0.6, 1.4, { seg: 6 });   // moss at the waterline
  b.cyl(0.04, 0.04, 0.5, C.iron, X - 0.75, 3.4, -20.5, 0, 0, PI / 2, { seg: 6 }).tor(0.3, 0.045, C.red, X - 1.0, 3.4, -20.5, 0, PI / 2, 0, { seg: 12 });
  for (let k = 0; k < 8; k++) b.box(0.08, 0.05, 0.5, C.iron, X - 0.14, -2.4 + k * 0.45, -37);          // ladder
  for (const sz of [-0.27, 0.27]) b.box(0.05, 3.6, 0.05, C.iron, X - 0.14, -0.8, -37 + sz);
  return b.build({ receive: false });
});
const shaftMat = new THREE.MeshBasicMaterial({ color: 0xd6f0b0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const sewerGrate = () => prefab('sewerGrate', () => {
  // a street grating in the crown of the vault, with daylight falling through it
  const g = new THREE.Group(), b = new Builder(1), top = SEW_SPR + SEW_RISE;
  b.box(3.0, 0.5, 3.0, 0x77725f, 0, top - 0.1, 0).box(2.4, 0.1, 2.4, 0xe9f7cf, 0, top - 0.38, 0, 0, 0, 0, { glow: true, grad: 1 });
  for (let k = 0; k < 6; k++) b.box(0.1, 0.08, 2.4, C.iron, -1.0 + k * 0.4, top - 0.44, 0);
  g.add(b.build({ receive: false }));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, top, 12, 6, true), shaftMat); shaft.position.y = top / 2 - 0.4; shaft.renderOrder = 2; g.add(shaft);
  return g;
});
const rubberDuck = () => prefab('duck', () => {
  const b = new Builder(0.9);
  b.sph(0.55, 0xffd23a, 0, 0.3, 0, 1, 0.8, 1.25, { seg: 12 }).sph(0.34, 0xffd23a, 0, 0.9, -0.42, 1, 1, 1, { seg: 12 }).cone(0.2, 0.3, 0xffd23a, 0, 0.55, 0.7, -0.9, 0, 0, { seg: 8 });
  b.sph(0.14, C.orange, 0, 0.84, -0.76, 1.2, 0.5, 1.2, { seg: 8 });
  for (const sx of [-1, 1]) b.sph(0.05, 0x1b1f24, sx * 0.17, 1.0, -0.68, 1, 1, 1, { seg: 6 }).sph(0.3, 0xffc21a, sx * 0.48, 0.36, 0.1, 0.4, 0.6, 1, { seg: 8 });
  return b.build({ receive: false });
});
const SEWER_SIGNS = ['MIND THE RATS', 'NO SWIMMING', 'RAT RUN', 'TO THE SEASIDE'];

// ---------- space pier ----------
const MOON = 0xbdb9d2, MOON_D = 0x9a96b2, MOON_DD = 0x7a7694;
const moonGround = () => prefab('moonGround', () => {
  const b = new Builder(0.85), rng = makeRng(990);
  b.box(46, 3.6, CHUNK, MOON, DECK_HALF + 23, -1.82, -CHUNK / 2);
  b.box(0.36, 0.2, CHUNK, MOON_D, DECK_HALF + 0.18, 0.02, -CHUNK / 2);
  for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) b.box(0.05, 0.9, 3.85, k % 2 ? 0x5b6770 : 0x6c7983, DECK_HALF - 0.01, -0.6 - k * 0.95, -2 - i * 4 + (k % 2) * 2 - 1, 0, 0, 0, { grad: 0.9 });
  for (let i = 0; i < 14; i++) {   // craters
    const x = DECK_HALF + 2.2 + rng() * 22, z = -rng() * CHUNK, r = 0.6 + rng() * 1.8;
    b.cyl(r, r * 0.85, 0.05, MOON_DD, x, 0.0, z, 0, 0, 0, { seg: 10 }).tor(r, r * 0.14, MOON_D, x, 0.02, z, PI / 2, 0, 0, { seg: 12, tseg: 5 });
  }
  for (let i = 0; i < 12; i++) b.add(new THREE.DodecahedronGeometry(1), i % 2 ? MOON_D : MOON_DD, DECK_HALF + 1.5 + rng() * 24, 0.1, -rng() * CHUNK, rng() * 3, rng() * 3, 0, 0.2 + rng() * 0.4, 0.15 + rng() * 0.25, 0.2 + rng() * 0.4);
  return b.build();
});
const moonHills = (v) => prefab('moonHills' + v, () => {
  const b = new Builder(0.8), rng = makeRng(1010 + v);
  for (let i = 0; i < 8; i++) { const x = 29 + rng() * 15; b.sph(1, i % 2 ? MOON : MOON_D, x, 0, -rng() * CHUNK, 8 + rng() * 6, 3 + rng() * 5 + (x - 29) * 0.3, 7 + rng() * 6, { seg: 9 }); }
  for (let i = 0; i < 3; i++) b.cone(4 + rng() * 3, 11 + rng() * 9, MOON_DD, 40 + rng() * 9, 5, -6 - i * 13 - rng() * 5, 0, rng() * 3, 0, { seg: 5 });
  return b.build({ receive: false });
});
const habDome = () => prefab('habDome', () => {
  const b = new Builder(0.85);
  b.cyl(3.3, 3.5, 0.7, 0xd9dee8, 0, 0.35, 0, 0, 0, 0, { seg: 18 }).dome(3.1, 0x8fd0ee, 0, 0.7, 0, 0, 0, 0, 1, 0.9, 1, { seg: 18 });
  for (let a = 0; a < 3; a++) b.tor(3.12, 0.08, 0xf4f6fa, 0, 0.7, 0, 0, a * 1.047, 0, { arc: PI, seg: 18 });
  b.tor(3.3, 0.1, 0x7a4fd0, 0, 0.72, 0, PI / 2, 0, 0, { seg: 20 });
  for (let a = 0; a < 10; a++) b.box(0.5, 0.26, 0.06, 0xffe27a, Math.sin(a * 0.628) * 3.42, 0.36, Math.cos(a * 0.628) * 3.42, 0, a * 0.628, 0, { glow: true, grad: 1 });
  b.box(1.5, 1.9, 1.3, 0xd9dee8, -3.4, 0.95, 0).box(0.08, 1.4, 0.8, 0x58e6ff, -4.07, 0.85, 0, 0, 0, 0, { glow: true, grad: 0.8 });   // airlock facing the pier
  b.cyl(0.04, 0.04, 1.6, C.steel, 0, 4.2, 0).sph(0.12, 0xff5a5a, 0, 5.05, 0, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  return b.build({ cast: true });
});
const bigRocket = (v) => prefab('bigRocket' + v, () => {
  const b = new Builder(0.85), col = v ? 0x2f6fd0 : C.red;
  b.cyl(3.4, 3.8, 0.5, 0x5b6770, 0, 0.25, 0, 0, 0, 0, { seg: 8 });
  b.cyl(1.25, 1.1, 5.2, 0xf4f1ea, 0, 4.4, 0, 0, 0, 0, { seg: 16 }).cyl(1.1, 1.25, 0.9, 0xf4f1ea, 0, 7.45, 0, 0, 0, 0, { seg: 16 }).cone(1.1, 2.4, col, 0, 9.1, 0, 0, 0, 0, { seg: 16 }).sph(0.16, C.gold, 0, 10.35, 0);
  b.cyl(1.27, 1.27, 0.4, col, 0, 3.0, 0, 0, 0, 0, { seg: 16 }).cyl(1.26, 1.26, 0.3, col, 0, 6.6, 0, 0, 0, 0, { seg: 16 });
  for (let a = 0; a < 3; a++) b.at(0, 0, 0, a * 2.094, () => b.flat([[[0, 4.2, 1.05], [0, 0.6, 2.5], [0, 2.2, 1.05]], [[0, 0.6, 2.5], [0, 1.2, 1.05], [0, 2.2, 1.05]]], col));
  for (const [y, a] of [[5.6, -PI / 2], [4.2, -PI / 2]]) b.at(0, 0, 0, a, () => b.cyl(0.42, 0.42, 0.14, C.gold, 0, y, 1.2, PI / 2, 0, 0, { seg: 12 }).cyl(0.32, 0.32, 0.16, 0x8ff0ff, 0, y, 1.21, PI / 2, 0, 0, { seg: 12, glow: true, grad: 0.8 }));
  b.cyl(0.8, 1.0, 0.8, C.iron, 0, 1.5, 0, 0, 0, 0, { seg: 12 });
  // launch tower
  for (const [x, z] of [[2.6, -0.6], [2.6, 0.6], [3.6, -0.6], [3.6, 0.6]]) b.box(0.12, 8.6, 0.12, 0xc94f3a, x, 4.8, z);
  for (let k = 0; k < 5; k++) b.box(1.1, 0.1, 1.3, 0xc94f3a, 3.1, 1.3 + k * 1.9, 0).box(1.5, 0.08, 0.08, 0xc94f3a, 3.1, 2.2 + k * 1.9, 0.6, 0, 0, 0.9);
  b.box(1.6, 0.14, 0.5, C.steel, 1.9, 6.6, 0).sph(0.14, 0xff5a5a, 3.1, 9.3, 0, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  return b.build({ cast: true, material: MAT.double });
});
const radar = () => prefab('radar', () => {
  const b = new Builder(0.85);
  b.cyl(1.0, 1.2, 0.5, 0x5b6770, 0, 0.25, 0, 0, 0, 0, { seg: 10 }).cyl(0.22, 0.3, 2.6, 0xd9dee8, 0, 1.8, 0, 0, 0, 0, { seg: 8 }).sph(0.34, C.iron, 0, 3.2, 0);
  b.dome(1.9, 0xe9eef5, 0, 4.3, 0.9, PI * 0.72, 0, 0, 1, 0.5, 1, { seg: 16 });
  b.cyl(0.04, 0.04, 1.7, C.steel, 0, 4.3, 0.9, -PI * 0.28, 0, 0, { seg: 5 }).sph(0.16, 0xff5a5a, 0, 4.9, 1.55, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  return b.build({ cast: true, material: MAT.double });
});
const alienGroup = (v) => prefab('aliens' + v, () => {
  const b = new Builder(0.85);
  alienInto(b, 0, 0, 0, 0, 1.25); alienInto(b, 1.3, 0, -0.4, -0.4, 1.0, v === 0); if (v) alienInto(b, -1.2, 0, 0.3, 0.5, 0.8);
  b.cyl(0.035, 0.035, 2.6, C.steel, v ? 2.3 : -1.4, 1.3, -0.6).box(1.0, 0.6, 0.03, v ? 0xff7ad9 : 0x58e6ff, v ? 2.82 : -0.88, 2.25, -0.6).add(new THREE.OctahedronGeometry(0.16), 0xffe27a, v ? 2.82 : -0.88, 2.25, -0.58, 0, 0, 0, 1, 1, 0.2, { glow: true, grad: 1 });
  return b.build({ cast: true });
});
const asteroidFloat = (v) => prefab('astf' + v, () => {
  const b = new Builder(0.6), rng = makeRng(1100 + v * 5), cols = [0x7c7896, 0x8f8aa8, 0x6a6684];
  for (let i = 0; i < 3 + v; i++) b.add(new THREE.DodecahedronGeometry(1, i === 0 ? 1 : 0), cols[i % 3], i ? (rng() - 0.5) * 3 : 0, i ? (rng() - 0.5) * 1.6 : 0, i ? (rng() - 0.5) * 3 : 0, rng() * 3, rng() * 3, 0, i ? 0.5 + rng() * 0.6 : 1.5, i ? 0.4 + rng() * 0.5 : 1.15, i ? 0.5 + rng() * 0.6 : 1.4);
  for (let i = 0; i < 3; i++) { const a = rng() * 6.28; b.cyl(0.3, 0.24, 0.06, 0x56526e, Math.cos(a) * 0.9, 0.95 - i * 0.2, Math.sin(a) * 0.9, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7, { seg: 8 }); }
  crystalInto(b, 0.3, 0.9, 0.2, 0.5, [0x58e6ff, 0xff7ad9, 0xb99bff][v % 3], 0.4, 1); crystalInto(b, -0.6, 0.6, -0.3, 0.38, 0x58e6ff, -0.6, 2);
  return b.build({ receive: false });
});

// ---------- zone gateways ----------
const ZONE_NAMES = ['THE PROMENADE', 'GRAND PIER', 'OLD HARBOUR', 'MIDNIGHT FUNFAIR', 'STORM POINT', 'SANDCASTLE BAY', "SMUGGLERS' COVE", 'FROSTY PIER', 'THE SEWERS', 'SPACE PIER', 'CHRISTMAS PIER', 'MARSHMALLOW SHORE', 'SPIRAL BAY'];
const gateway = (zone) => prefab('gate' + zone, () => {
  const b = new Builder(0.85), col = [C.coral, 0x2a7a72, C.navy, FUN_PURPLE, 0x3d4a57, 0xff8a3c, 0x245f6b, 0x6fa8dc, 0x4f6a3a, 0x3a2a8a, 0xc23b2e, 0xff7ab8, 0x7a4fe0][zone];
  for (const sx of [-1, 1]) {
    b.box(0.7, 0.9, 0.7, C.white, sx * 4.15, 0.45, 0).box(0.45, 5.4, 0.45, col, sx * 4.15, 3.6, 0).box(0.6, 0.2, 0.6, C.gold, sx * 4.15, 6.3, 0).sph(0.32, C.gold, sx * 4.15, 6.7, 0);
    b.box(0.3, 0.3, 1.6, col, sx * 3.5, 5.2, 0, 0, 0, sx * 0.8);
  }
  b.box(8.6, 1.25, 0.3, col, 0, 5.85, 0).box(8.9, 0.14, 0.42, C.gold, 0, 6.52, 0).box(8.9, 0.14, 0.42, C.gold, 0, 5.2, 0);
  for (let i = 0; i < 15; i++) b.sph(0.11, zone === 3 || zone === 7 || zone === 9 || zone === 10 ? BULBS[i % 4] : zone === 6 ? XTAL[i % 4] : zone === 8 ? (i % 2 ? 0xc8ff9a : SLIME) : i % 2 ? 0xffe27a : 0xffffff, -3.9 + i * 0.557, 6.72, 0.1, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  const g = new THREE.Group(); g.add(b.build({ cast: true }));
  const s = signMesh(ZONE_NAMES[zone], 7.2, 0.95, '#fff3d6', ['#c4412f', '#17544f', '#22365c', '#4a1f86', '#2c3640', '#c9601c', '#143f4a', '#2f5f96', '#2f4a22', '#2a1a6a', '#1f6b3e', '#b8327e', '#5a2fb0'][zone], '#ffc928');
  s.position.set(0, 5.86, 0.17); g.add(s);
  return g;
});

// ---------- populate a chunk ----------
export function zoneName(z) { return ZONE_NAMES[z]; }
export function populate(group, rawIndex, zone, anim) {
  const index = Math.abs(rawIndex);
  const rng = makeRng(index * 7919 + 13);
  const L = -DECK_HALF + 0.08, R = DECK_HALF - 0.08;
  place(group, under40(), 0, 0, 0);
  place(group, rail40(), L, 0, 0);
  const open = zone === 0 || zone === 5 || zone === 7 || (zone >= 9 && zone !== 12);   // the right-hand side opens onto ground at deck level
  if (!open && zone !== 2) place(group, rail40(), R, 0, 0);
  if (zone !== 8) for (const z of [-10, -30]) {
    const flags = zone !== 4 && zone !== 6;
    place(group, lamp(), -4.05, 0, z, 0, 1.24); if (flags) place(group, bunting20(), -4.05, 4.86, z);
    if (zone !== 2) { place(group, lamp(), open ? 4.75 : 4.05, 0, z, 0, 1.24); if (flags) place(group, bunting20(), open ? 4.75 : 4.05, 4.86, z); }
    if (zone === 3 || zone === 10) for (const x of [-4.05, 4.05]) place(group, lightPool(), x * 0.82, 0.03, z);
  }
  // furniture along the shoulders
  const fz = [-4, -16, -24, -36];
  if (zone !== 8) for (const z of fz) {
    const r = rng();
    if (r < 0.4) place(group, bench(), -3.95, 0, z, PI);
    else if (r < 0.55) place(group, lifeRing(), -4.2, 0, z, PI / 2);
    else if (r < 0.7) place(group, telescope(), -4.0, 0, z, -PI / 2);
  }
  if (index > 0 && index % ZONE_CHUNKS === 0) place(group, gateway(zone), 0, 0, -1.5);

  if (zone === 0) {
    place(group, promGround(), 0, 0, 0);
    place(group, backRow(index % 2), 0, 0, 0);
    const patterns = [[8, 12, 10, 10], [10, 8, 12, 10], [12, 10, 8, 10], [10, 10, 12, 8]];
    const pat = patterns[index % 4], byW = { 8: [0, 1, 2], 10: [3, 4, 5], 12: [6, 7, 8] };
    let z = 0, k = index;
    for (const w of pat) { place(group, shop(byW[w][(k++) % 3]), DECK_HALF + 2.9, 0, z - w / 2, -PI / 2); z -= w; }
    for (const pz of [-6, -15, -25, -34]) {
      const r = rng();
      if (r < 0.45) place(group, cafeSet(), 6.0, 0, pz, rng() * 3);
      else if (r < 0.7) place(group, planter(), 5.6, 0, pz, PI / 2);
      else if (r < 0.85) place(group, pillarBox(), 5.5, 0, pz, -PI / 2);
    }
    place(group, groyne(), -5.5, 0, -8 - rng() * 20);
    if (rng() < 0.7) anim.push({ o: place(group, rowBoat(pick(rng, [C.red, C.teal, C.blue])), -9 - rng() * 8, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
    if (rng() < 0.6) anim.push({ o: place(group, dinghy(pick(rng, [C.coral, C.yellow, C.white])), -22 - rng() * 25, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
    if (rng() < 0.5) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -14 - rng() * 10, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
  } else if (zone === 1) {
    for (const z of fz) { const r = rng(); if (r < 0.4) place(group, bench(), 3.95, 0, z, 0); else if (r < 0.55) place(group, lifeRing(), 4.2, 0, z, -PI / 2); else if (r < 0.7) place(group, planter(), 3.95, 0, z, PI / 2); }
    const side = index % 2 ? 1 : -1, kind = index % 4;
    const plat = place(group, sidePlatform(), 0, 0, -20);
    if (side < 0) plat.scale.x = -1;
    const cx = side * (DECK_HALF + 6.5);
    if (kind === 0) { const f = place(group, ferris(), cx + side * 1, 0, -20, 0); anim.push({ o: f, kind: 'wheel' }); }
    else if (kind === 1) place(group, helter(), cx, 0, -20, side > 0 ? PI : 0);
    else if (kind === 2) { const c = place(group, carousel(), cx, 0, -20); anim.push({ o: c, kind: 'spin' }); }
    else place(group, pavilion(), cx + side * 0.8, 0, -20, side > 0 ? 0 : PI);
    place(group, kiosk(pick(rng, [C.red, C.teal, C.blue, C.rose]), pick(rng, ['ICES', 'TICKETS', 'DOUGHNUTS', 'CANDY FLOSS'])), side * (DECK_HALF + 2.2), 0, -20 + (rng() < 0.5 ? -6 : 6), side > 0 ? -PI / 2 : PI / 2);
    for (const s of [-1, 1]) {
      if (rng() < 0.55) anim.push({ o: place(group, dinghy(pick(rng, [C.coral, C.yellow, C.white, C.aqua])), s * (24 + rng() * 25), WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
      if (rng() < 0.4) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), s * (10 + rng() * 10) + (s === side ? s * 14 : 0), WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
    }
  } else if (zone === 3) {
    place(group, bulbArch(), 0, 0, -20);
    const side = index % 2 ? 1 : -1, kind = index % 4;
    const plat = place(group, sidePlatform(), 0, 0, -20);
    if (side < 0) plat.scale.x = -1;
    const cx = side * (DECK_HALF + 6.5);
    if (kind === 0) { const f = place(group, ferris(), cx + side * 1, 0, -20, 0); anim.push({ o: f, kind: 'wheel' }); }
    else if (kind === 1) place(group, bigTop(), cx + side * 0.4, 0, -20, side > 0 ? 0 : PI);
    else if (kind === 2) { const c = place(group, swingRide(), cx, 0, -20); anim.push({ o: c, kind: 'spin', v: 1.1 }); }
    else { const c = place(group, carousel(), cx, 0, -20); anim.push({ o: c, kind: 'spin' }); }
    place(group, kiosk(pick(rng, [C.red, C.teal, C.blue, C.rose]), pick(rng, ['HOOK-A-DUCK', 'COCONUTS', 'CANDY FLOSS', 'TOFFEE APPLES', 'PRIZES'])), side * (DECK_HALF + 2.2), 0, -20 + (rng() < 0.5 ? -6 : 6), side > 0 ? -PI / 2 : PI / 2);
    const co = place(group, coaster(), -side * (DECK_HALF + 8.5), 0, 0);
    anim.push({ o: co, kind: 'train' });
    for (const z of fz) { const r = rng(); if (r < 0.35) place(group, bench(), 3.95, 0, z, 0); else if (r < 0.55) place(group, planter(), 3.95, 0, z, PI / 2); }
  } else if (zone === 4) {
    place(group, seaWall(), 0, 0, 0);
    place(group, cliff(index % 3), DECK_HALF + 3, 0, 0);
    for (let k = 0; k < 2; k++) place(group, rocks(), -8.5 - rng() * 6, 0, -6 - k * 20 - rng() * 8, rng() * 6, 1.2 + rng() * 0.5);
    if (index % ZONE_CHUNKS === 4) { const lh = place(group, stormLighthouse(), -36, 0, -20); anim.push({ o: lh, kind: 'spin', v: 0.9 }); }
    else if (index % 4 === 1) place(group, wreck(), -17 - rng() * 6, 0, -12 - rng() * 16, rng() * 6);
    else if (index % 4 === 3) place(group, seaStack(index % 2), -26 - rng() * 12, 0, -rng() * CHUNK, rng() * 6);
    place(group, beacon(), -13 - rng() * 5, 0, -30 - rng() * 8);
    if (rng() < 0.6) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -18 - rng() * 12, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6, amp: 3 });
    if (rng() < 0.5) anim.push({ o: place(group, rowBoat(pick(rng, [C.red, C.teal, C.blue])), -10 - rng() * 5, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6, amp: 3 });
  } else if (zone === 5) {
    place(group, beachGround(), 0, 0, 0);
    place(group, duneRow(index % 2), 0, 0, 0);
    const k = index % 3, stall = () => kiosk(pick(rng, [C.red, C.teal, C.blue, C.rose]), pick(rng, ['ICES', 'SURF HIRE', 'COLD DRINKS', 'SUN HATS']));
    if (k === 0) { place(group, sandcastleBig(), 11.5, 0, -12, rng() * 6); place(group, lifeguardTower(), 9.5, 0, -31, -PI / 2); }
    else if (k === 1) { place(group, stall(), DECK_HALF + 2.6, 0, -9, -PI / 2); place(group, windbreak(), 12.5, 0, -22, 1.2 + rng() * 0.6); place(group, sandcastleBig(), 15.5, 0, -33, rng() * 6, 0.75); }
    else { place(group, stall(), DECK_HALF + 2.6, 0, -31, -PI / 2); place(group, sandcastleBig(), 10.8, 0, -19, rng() * 6, 0.9); place(group, windbreak(), 15, 0, -6, 1.3); }
    for (const z of [-3, -16, -27, -38]) if (rng() < 0.75) place(group, palm(rng() < 0.5 ? 0 : 1), 6.4 + rng() * 1.6, 0, z + rng() * 3, rng() * 6);
    for (let i = 0; i < 2; i++) place(group, parasolSet(pick(rng, [C.red, C.teal, C.yellow, C.blue, C.rose])), 8.5 + rng() * 9, 0, -4 - i * 19 - rng() * 12, rng() * 6);
    place(group, groyne(), -5.5, 0, -8 - rng() * 20);
    if (rng() < 0.8) anim.push({ o: place(group, pedalo(pick(rng, [C.red, C.yellow, C.teal, C.rose])), -9 - rng() * 9, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
    if (rng() < 0.6) anim.push({ o: place(group, dinghy(pick(rng, [C.coral, C.yellow, C.white])), -22 - rng() * 25, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
    if (rng() < 0.5) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -14 - rng() * 10, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
  } else if (zone === 6) {
    place(group, coveLedge(index % 2), 0, 0, 0);
    place(group, caveWall(index % 3), DECK_HALF + 4.6, 0, 0);
    const lw = place(group, caveWall((index + 1) % 3), -17, 0, 0); lw.scale.x = -1;
    place(group, caveArch(index % 2), 0, 0, -20 + (index % 2) * 6);
    place(group, treasurePile(index % 2), DECK_HALF + 2.5, 0, -8 - rng() * 24, rng() * 6);
    for (const z of [-10, -30]) place(group, tealPool(), DECK_HALF + 2.6, 0.06, z + rng() * 6);
    if (index % 3 === 1) anim.push({ o: place(group, lugger(), -10.5, WATER_Y - 0.9, -20, (rng() - 0.5) * 0.2), kind: 'bob', p: rng() * 6, amp: 0.5 });
    else if (rng() < 0.8) anim.push({ o: place(group, rowBoat(pick(rng, [C.red, C.teal, C.blue])), -7.5 - rng() * 4, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6 });
    for (let i = 0; i < 2; i++) place(group, rocks(), -8 - rng() * 5, 0, -4 - i * 20 - rng() * 10, rng() * 6, 0.9 + rng() * 0.4);
  } else if (zone === 7) {
    place(group, snowGround(), 0, 0, 0);
    place(group, snowHills(index % 2), 0, 0, 0);
    const k = index % 3;
    if (k === 0) { place(group, cabinStall(C.red, 'HOT CHOCOLATE'), DECK_HALF + 3.5, 0, -11, -PI / 2); place(group, igloo(), 12.5, 0, -29, -PI / 2 - 0.4); }
    else if (k === 1) { place(group, frozenPond(), 11, 0, -12, rng() * 6); place(group, cabinStall(C.teal, 'MINCE PIES'), DECK_HALF + 3.5, 0, -30, -PI / 2); }
    else { place(group, cabinStall(C.blue, 'SKATE HIRE'), DECK_HALF + 3.5, 0, -20, -PI / 2); place(group, igloo(), 14, 0, -5, -PI / 2 + 0.5); place(group, frozenPond(), 15, 0, -34, rng() * 6, 0.8); }
    for (const z of [-3, -16, -26, -37]) if (rng() < 0.7) place(group, fir(rng() < 0.5 ? 1 : 0), 6.6 + rng() * 1.2 + (rng() < 0.3 ? 10 : 0), 0, z + rng() * 2, rng() * 6);
    for (let i = 0; i < 2; i++) anim.push({ o: place(group, iceFloe((index + i) % 2), -8 - rng() * 12, WATER_Y, -5 - i * 19 - rng() * 10, rng() * 6), kind: 'bob', p: rng() * 6, amp: 0.6 });
    if (index % 2) place(group, iceberg(index % 4 === 1 ? 0 : 1), -32 - rng() * 12, 0, -rng() * CHUNK, rng() * 6);
    if (rng() < 0.5) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -16 - rng() * 10, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
  } else if (zone === 10) {
    place(group, snowGround(), 0, 0, 0);
    place(group, snowHills(index % 2), 0, 0, 0);
    place(group, candyArch(), 0, 0, -20);
    const k = index % 3;
    if (k === 0) {
      place(group, workshop(), DECK_HALF + 6.2, 0, -13, -PI / 2);
      place(group, reindeer(1), 7.4, 0, -27, -PI / 2 - 0.5); place(group, reindeer(0), 9.2, 0, -30.5, -PI / 2 + 0.2, 0.92); place(group, reindeer(0), 7.0, 0, -34, -PI / 2 - 0.2, 1.05);
      place(group, presentPile(0), 13, 0, -33, rng() * 6);
    } else if (k === 1) {
      place(group, giantTree(), 12.5, 0, -20, rng() * 6);
      place(group, cabinStall(XG, 'GINGERBREAD'), DECK_HALF + 3.5, 0, -6, -PI / 2);
      place(group, presentPile(1), 7.4, 0, -34, rng() * 6, 0.8);
    } else {
      place(group, gingerHouse(), DECK_HALF + 5.4, 0, -27, -PI / 2);
      place(group, cabinStall(XR, 'ROAST CHESTNUTS'), DECK_HALF + 3.5, 0, -9, -PI / 2);
      place(group, reindeer(0), 12.5, 0, -14, -PI / 2 + 0.6);
    }
    for (const z of [-3, -17, -37]) if (rng() < 0.75) place(group, fir(1), 16 + rng() * 6, 0, z + rng() * 2, rng() * 6, 0.8 + rng() * 0.5);
    for (let i = 0; i < 2; i++) anim.push({ o: place(group, iceFloe((index + i) % 2), -8 - rng() * 12, WATER_Y, -5 - i * 19 - rng() * 10, rng() * 6), kind: 'bob', p: rng() * 6, amp: 0.6 });
    if (rng() < 0.75) anim.push({ o: place(group, floatBauble(pick(rng, [XR, XG, 0x2f6fd0, 0x8a4fd0])), -14 - rng() * 14, WATER_Y, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6, amp: 1.2 });
    if (index % 2) place(group, iceberg(index % 4 === 1 ? 0 : 1), -34 - rng() * 12, 0, -rng() * CHUNK, rng() * 6);
  } else if (zone === 11) {
    place(group, sweetGround(), 0, 0, 0);
    place(group, mallowHills(index % 2), 0, 0, 0);
    place(group, rainbowArch(), 0, 0, -20);
    const k = index % 3, stall = (z) => place(group, kiosk(pick(rng, [C.rose, C.teal, C.blue, C.red]), pick(rng, ['FUDGE', 'CANDY FLOSS', 'TOFFEE', 'SHERBET', 'JELLY BEANS'])), DECK_HALF + 2.6, 0, z, -PI / 2);
    if (k === 0) { place(group, cupcakeHouse(), DECK_HALF + 7.5, 0, -13, -PI / 2); place(group, mallowPile(0), 9.5, 0, -31, rng() * 6); }
    else if (k === 1) { stall(-8); place(group, jellyCastle(), 12.5, 0, -24, rng() * 6); place(group, mallowPile(1), 17, 0, -6, rng() * 6, 0.9); }
    else { place(group, droppedIce(), 11, 0, -12, rng() * 6); stall(-30); place(group, mallowPile(1), 14.5, 0, -33, rng() * 6); }
    for (const z of [-3, -16, -27, -38]) if (rng() < 0.75) place(group, lollyTree(Math.floor(rng() * 5)), 6.3 + rng() * 1.2 + (rng() < 0.3 ? 12 : 0), 0, z + rng() * 2, -PI / 2 + (rng() - 0.5) * 0.8, 0.85 + rng() * 0.3);
    for (let i = 0; i < 2; i++) anim.push({ o: place(group, floatSweet((index + i) % 3), -9 - rng() * 14, WATER_Y + 0.2, -5 - i * 19 - rng() * 10, rng() * 6), kind: 'bob', p: rng() * 6, amp: 1.2 });
    if (rng() < 0.5) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -16 - rng() * 10, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
  } else if (zone === 12) {
    for (const z of [-5, -25]) place(group, spiralHoop(((index * 2 + (z < -10 ? 1 : 0)) % 2)), 0, 0, z);
    for (const z of fz) { const r = rng(); if (r < 0.35) place(group, bench(), 3.95, 0, z, 0); else if (r < 0.5) place(group, lifeRing(), 4.2, 0, z, -PI / 2); }
    const side = index % 2 ? 1 : -1, kind = index % 4;
    const plat = place(group, sidePlatform(), 0, 0, -20);
    if (side < 0) plat.scale.x = -1;
    const cx = side * (DECK_HALF + 6.5);
    if (kind === 0) place(group, helter(), cx, 0, -20, side > 0 ? PI : 0);
    else if (kind === 1) anim.push({ o: place(group, hypnoTower(), cx, 0, -20, side > 0 ? -0.5 : 0.5), kind: 'whirl', v: side * 0.9 });
    else if (kind === 2) place(group, shellHouse(), cx, 0, -20, side > 0 ? -PI / 2 : PI / 2, 0.8);
    else for (let i = 0; i < 3; i++) anim.push({ o: place(group, pinwheel(i), cx + side * (i - 1) * 2.2, 0, -24 + i * 4.2, side > 0 ? -0.6 : 0.6), kind: 'whirl', v: (i % 2 ? -1 : 1) * (2.2 + i * 0.5) });
    place(group, kiosk(pick(rng, [C.rose, C.teal, C.blue, C.red]), pick(rng, ['SPINNING TOPS', 'YO-YOS', 'PINWHEELS', 'SEA SHELLS', 'TWISTY ROCK'])), side * (DECK_HALF + 2.2), 0, -20 + (rng() < 0.5 ? -6 : 6), side > 0 ? -PI / 2 : PI / 2);
    for (const s of [-1, 1]) {
      anim.push({ o: place(group, whirlpool(s === side ? 1 : 0), s * (16 + rng() * 8) + (s === side ? s * 12 : 0), WATER_Y + 0.5, -4 - rng() * 30), kind: 'spin', v: s * (0.8 + rng() * 0.5) });
      place(group, twistSpire((index + (s > 0 ? 1 : 0)) % 3), s * (34 + rng() * 14), 0, -rng() * CHUNK, rng() * 6, 0.8 + rng() * 0.4);
      if (rng() < 0.6) anim.push({ o: place(group, floatShell(rng() < 0.5 ? 1 : 0), s * (8 + rng() * 6) + (s === side ? s * 14 : 0), WATER_Y - 0.3, -rng() * CHUNK, rng() * 6), kind: 'bob', p: rng() * 6, amp: 1.2 });
    }
  } else if (zone === 8) {
    place(group, sewerShell(), 0, 0, 0);
    place(group, sewerSide(index % 2), 0, 0, 0);
    const ls = place(group, sewerSide((index + 1) % 2), 0, 0, 0); ls.scale.x = -1;
    for (const z of [-0.6, -20.6]) place(group, sewerRibs(), 0, 0, z);
    place(group, sewerGrate(), index % 2 ? -2.2 : 2.2, 0, -10 - (index % 3) * 9);
    place(group, signMesh(pick(rng, SEWER_SIGNS), 2.8, 0.75, '#f4d35e', '#1b1f24', '#1b1f24'), -(SEW_W - 0.08), 5.3, -6 - rng() * 28, PI / 2);
    place(group, signMesh(pick(rng, SEWER_SIGNS), 2.8, 0.75, '#f4d35e', '#1b1f24', '#1b1f24'), SEW_W - 0.08, 5.3, -6 - rng() * 28, -PI / 2);
    for (const sd of [-1, 1]) if (rng() < 0.6) anim.push({ o: place(group, rubberDuck(), sd * (5.7 + rng() * 1.4), WATER_Y - 0.1, -rng() * CHUNK, rng() * 6, 0.8), kind: 'bob', p: rng() * 6, amp: 0.8 });
    const k = index % ZONE_CHUNKS;
    if (k === 0) place(group, sewerMouth(), 0, 0, 0.4);
    if (k === ZONE_CHUNKS - 1) place(group, sewerMouth(), 0, 0, -CHUNK - 0.4);
  } else if (zone === 9) {
    place(group, moonGround(), 0, 0, 0);
    place(group, moonHills(index % 2), 0, 0, 0);
    const k = index % 3;
    if (k === 0) { place(group, habDome(), 11.5, 0, -12); place(group, alienGroup(0), 7.2, 0, -27, -PI / 2 - 0.3); place(group, radar(), 17, 0, -33, rng() * 6); }
    else if (k === 1) { place(group, bigRocket(index % 2), 12.5, 0, -20, PI); place(group, alienGroup(1), 6.9, 0, -8, -PI / 2 + 0.3); }
    else { place(group, habDome(), 14, 0, -28, 0, 0.8); place(group, radar(), 8.6, 0, -9, rng() * 6); place(group, alienGroup(0), 7.5, 0, -36, -PI / 2); }
    for (let i = 0; i < 3; i++) anim.push({ o: place(group, asteroidFloat((index + i) % 3), -9 - rng() * 22, 1 + rng() * 11, -3 - i * 13 - rng() * 8, rng() * 6, 0.7 + rng() * 0.9), kind: 'bob', p: rng() * 6, amp: 1.6 });
    if (rng() < 0.7) anim.push({ o: place(group, asteroidFloat(index % 3), 16 + rng() * 14, 11 + rng() * 8, -rng() * CHUNK, rng() * 6, 1 + rng()), kind: 'bob', p: rng() * 6, amp: 1.6 });
  } else {
    place(group, quay(), 0, 0, 0);
    const k = index % 3;
    if (k === 0) { place(group, warehouse(pick(rng, [0x7fa8b8, 0xb86a4a, 0x8aa07a]), pick(rng, ['FISH MARKET', 'CHANDLERY', 'ICE WORKS', 'NET LOFT'])), DECK_HALF + 14, 0, -12); place(group, containerPile(index % 2), DECK_HALF + 9, 0, -26, 0.05); }
    else if (k === 1) { place(group, crane(), DECK_HALF + 16, 0, -20); place(group, containerPile((index + 1) % 2), DECK_HALF + 26, 0, -8); place(group, netRack(), DECK_HALF + 4.5, 0, -32); }
    else { place(group, warehouse(pick(rng, [0x7fa8b8, 0xb86a4a, 0x8aa07a]), pick(rng, ['BOAT YARD', 'SMOKEHOUSE', 'COLD STORE'])), DECK_HALF + 13, 0, -27); place(group, netRack(), DECK_HALF + 4.2, 0, -8); place(group, containerPile(index % 2), DECK_HALF + 24, 0, -6, -0.05); }
    for (const z of [-9, -29]) if (rng() < 0.85) anim.push({ o: place(group, trawler(pick(rng, [0x2f6fd0, 0x18a7a0, 0xe5383b, 0x22365c])), -8.6 - rng() * 1.5, WATER_Y - 0.2, z + rng() * 4, PI + (rng() - 0.5) * 0.1), kind: 'bob', p: rng() * 6, amp: 0.6 });
    if (index % ZONE_CHUNKS === 3) place(group, lighthouse(), -34, 0, -20);
    if (rng() < 0.5) anim.push({ o: place(group, buoy(pick(rng, [C.red, C.green])), -20 - rng() * 12, WATER_Y, -rng() * CHUNK), kind: 'bob', p: rng() * 6 });
    if (rng() < 0.5) place(group, rocks(), -24 - rng() * 14, 0, -rng() * CHUNK, rng() * 6);
  }
}

export function animate(anim, t, dt) {
  for (const a of anim) {
    if (a.kind === 'bob') {
      const amp = a.amp || 1;
      a.o.position.y = (a.baseY ?? (a.baseY = a.o.position.y)) + Math.sin(t * 1.3 + a.p) * 0.18 * amp;
      a.o.rotation.z = Math.sin(t * 1.1 + a.p * 1.7) * 0.07 * amp; a.o.rotation.x = Math.sin(t * 0.9 + a.p) * 0.04 * amp;
    } else if (a.kind === 'spin') {
      const s = a.s || (a.s = a.o.getObjectByName('spin')); if (s) s.rotation.y += dt * (a.v || 0.7);
    } else if (a.kind === 'whirl') {
      const w = a.w || (a.w = a.o.getObjectByName('whirl')); if (w) w.rotation.z += dt * (a.v || 1.5);
    } else if (a.kind === 'train') {
      const tr = a.tr || (a.tr = a.o.getObjectByName('train'));
      const z = -((t * 11) % CHUNK), y = coasterY(z), dy = coasterY(z - 0.5) - y;
      tr.position.set(0, y, z); tr.rotation.x = Math.atan2(dy, 0.5);
    } else if (a.kind === 'wheel') {
      const w = a.w || (a.w = a.o.getObjectByName('wheel'));
      if (w) { w.rotation.z += dt * 0.22; for (const c of w.children) if (c.name === 'gondola') c.rotation.z = -w.rotation.z; }
    }
  }
}

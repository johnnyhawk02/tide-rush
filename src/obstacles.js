// Obstacle, platform and pickup models. Each prefab is centred on its lane with its base at y = 0.
// "low" obstacles can be jumped; "tall" ones are full height and must be dodged. Nothing needs ducking.
import * as THREE from 'three';
import { Builder, C, MAT, signMesh, BEND_GLSL, addTwist } from './kit.js';
import { PLAT_H } from './config.js';

const PI = Math.PI;

export { crystalInto, chestInto, SAND, SAND_D };
export function crateInto(b, w, h, d, col = C.wood, dark = C.woodDark) {
  const t = 0.08, e = 0.035;
  b.box(w, h, d, col, 0, h / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(t, h + e, t, dark, sx * (w / 2 - t / 2 + e / 2), h / 2, sz * (d / 2 - t / 2 + e / 2));
  for (const y of [t / 2, h - t / 2]) {
    for (const sz of [-1, 1]) b.box(w + e, t, t, dark, 0, y, sz * (d / 2 - t / 2 + e / 2));
    for (const sx of [-1, 1]) b.box(t, t, d + e, dark, sx * (w / 2 - t / 2 + e / 2), y, 0);
  }
  const a1 = Math.atan2(h - 2 * t, w - 2 * t), a2 = Math.atan2(h - 2 * t, d - 2 * t);
  for (const sz of [-1, 1]) b.box(Math.hypot(w - 2 * t, h - 2 * t), t * 0.8, 0.03, dark, 0, h / 2, sz * (d / 2 + 0.006), 0, 0, sz * a1);
  for (const sx of [-1, 1]) b.box(0.03, t * 0.8, Math.hypot(d - 2 * t, h - 2 * t), dark, sx * (w / 2 + 0.006), h / 2, 0, sx * a2, 0, 0);
  // lid planks
  for (let i = -1; i <= 1; i++) b.box(0.02, 0.012, d - 2 * t, dark, i * w * 0.22, h + 0.004, 0);
}

function barrelInto(b, r, len, col = C.wood, hoop = C.iron) {
  // upright barrel, base at y=0
  b.cyl(r, r * 0.86, len / 2, col, 0, len * 0.75, 0, 0, 0, 0, { seg: 14 }).cyl(r * 0.86, r, len / 2, col, 0, len * 0.25, 0, 0, 0, 0, { seg: 14 });
  for (const y of [0.1, 0.5, 0.9]) b.cyl(r * (0.895 + 0.12 * (1 - Math.abs(y - 0.5) * 2)), r * (0.895 + 0.12 * (1 - Math.abs(y - 0.5) * 2)), 0.05, hoop, 0, len * y, 0, 0, 0, 0, { seg: 14 });
  b.cyl(r * 0.8, r * 0.8, 0.02, C.woodDark, 0, len - 0.02, 0, 0, 0, 0, { seg: 14 });
}

function wheelInto(b, r, x, y, z, w = 0.1) {
  b.cyl(r, r, w, C.rubber, x, y, z, 0, 0, PI / 2, { seg: 14 });
  b.cyl(r * 0.55, r * 0.55, w + 0.02, C.steel, x, y, z, 0, 0, PI / 2, { seg: 10 });
  b.cyl(r * 0.16, r * 0.16, w + 0.06, C.iron, x, y, z, 0, 0, PI / 2, { seg: 8 });
}

function fishBoxInto(b, col) {
  b.box(0.68, 0.26, 0.48, col, 0, 0.13, 0);
  b.box(0.72, 0.05, 0.52, col, 0, 0.255, 0);
  b.box(0.6, 0.02, 0.4, 0xe9f6fb, 0, 0.275, 0, 0, 0, 0, { grad: 1 });
  for (const sx of [-1, 1]) b.box(0.03, 0.08, 0.2, C.black, sx * 0.345, 0.17, 0);
}

function lobsterPotInto(b) {
  // D-shaped pot lying along z
  b.box(0.62, 0.05, 0.8, C.woodDark, 0, 0.025, 0);
  b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.78, 10, 1, false, 0, PI), 0x2c6f72, 0, 0.04, 0, PI / 2, 0, PI / 2);
  for (const z of [-0.39, -0.13, 0.13, 0.39]) b.tor(0.305, 0.022, C.woodLight, 0, 0.04, z, 0, 0, 0, { arc: PI, seg: 10 });
  for (const a of [0.5, PI / 2, PI - 0.5]) b.box(0.03, 0.03, 0.8, C.woodLight, Math.cos(a) * 0.305, 0.04 + Math.sin(a) * 0.305, 0);
  b.cyl(0.1, 0.1, 0.02, C.black, 0, 0.2, 0.395, PI / 2, 0, 0, { seg: 8 });
}

const DEF = {};
function def(name, kind, w, h, d, fn, o = {}) { DEF[name] = { name, kind, w, h, d, fn, ...o }; }

// ---------- low obstacles ----------
def('crate', 'low', 1.35, 0.92, 1.1, (b) => {
  b.at(0, 0, 0, 0.14, () => crateInto(b, 1.25, 0.86, 1.0));
  b.at(0.1, 0.87, 0.05, 0, () => { for (let i = 0; i < 3; i++) b.tor(0.26 - i * 0.015, 0.035, C.rope, 0, 0.035 + i * 0.045, 0, PI / 2, 0, 0, { seg: 12 }); });
});
def('pots', 'low', 1.5, 0.85, 1.0, (b) => {
  b.at(-0.36, 0, 0, 0.1, () => lobsterPotInto(b)); b.at(0.36, 0, 0, -0.08, () => lobsterPotInto(b));
  b.at(0.02, 0.36, 0, 0.3, () => lobsterPotInto(b));
  b.sph(0.17, C.orange, 0.62, 0.17, 0.42).cyl(0.02, 0.02, 0.18, C.black, 0.62, 0.38, 0.42);
  b.tor(0.08, 0.02, C.rope, 0.62, 0.3, 0.42, PI / 2, 0, 0, { seg: 8 });
});
def('barrier', 'low', 2.0, 1.0, 0.55, (b) => {
  const stripe = (x) => (Math.floor((x + 10) / 0.24) % 2 ? C.red : C.white);
  for (const sx of [-1, 1]) {
    b.box(0.07, 1.02, 0.07, C.yellow, sx * 0.8, 0.47, 0.17, -0.34, 0, 0).box(0.07, 1.02, 0.07, C.yellow, sx * 0.8, 0.47, -0.17, 0.34, 0, 0);
    b.box(0.07, 0.06, 0.36, C.yellow, sx * 0.8, 0.3, 0);
  }
  b.add(new THREE.BoxGeometry(1.94, 0.24, 0.05, 16, 1, 1), stripe, 0, 0.8, 0.045, -0.05, 0, 0, 1, 1, 1, { grad: 1 });
  b.add(new THREE.BoxGeometry(1.94, 0.16, 0.05, 16, 1, 1), stripe, 0.12, 0.45, 0.12, -0.2, 0, 0, 1, 1, 1, { grad: 1 });
  for (const sx of [-1, 1]) {
    b.cyl(0.06, 0.07, 0.07, C.iron, sx * 0.8, 0.98, 0);
    b.sph(0.075, 0xffb300, sx * 0.8, 1.06, 0, 1, 1, 1, { glow: true, grad: 1 });
  }
});
def('bollard', 'low', 1.35, 0.78, 1.0, (b) => {
  b.cyl(0.3, 0.33, 0.09, C.iron, -0.28, 0.045, 0).cyl(0.19, 0.22, 0.5, C.iron, -0.28, 0.33, 0);
  b.sph(0.3, C.iron, -0.28, 0.62, 0, 1, 0.5, 1).cyl(0.31, 0.31, 0.05, C.yellow, -0.28, 0.5, 0);
  for (let i = 0; i < 3; i++) b.tor(0.225, 0.04, C.rope, -0.28, 0.15 + i * 0.075, 0, PI / 2, 0, 0, { seg: 12 });
  for (let i = 0; i < 5; i++) b.tor(0.32 - (i % 2) * 0.03, 0.045, C.rope, 0.36, 0.05 + i * 0.075, 0.05, PI / 2, 0, 0, { seg: 12 });
  b.cyl(0.04, 0.04, 0.5, C.rope, 0.05, 0.3, 0.05, 0, 0, 1.0);
  b.at(0.3, 0, -0.38, 0.5, () => { b.box(0.3, 0.3, 0.2, C.steel, 0, 0.15, 0); b.tor(0.12, 0.03, C.steel, 0, 0.36, 0, 0, 0, 0, { seg: 8 }); }); // cleat block
});
def('deckchair', 'low', 1.35, 0.95, 1.15, (b) => {
  const stripe = (x) => (Math.floor((x + 10) / 0.11) % 2 ? C.teal : C.cream);
  b.at(-0.05, 0, 0, 0.25, () => {
    for (const sx of [-1, 1]) {
      b.box(0.045, 0.05, 1.25, C.woodLight, sx * 0.33, 0.48, 0.02, 0.72, 0, 0);
      b.box(0.045, 0.05, 1.0, C.woodLight, sx * 0.29, 0.34, 0.1, -0.62, 0, 0);
      b.box(0.045, 0.05, 0.7, C.woodLight, sx * 0.37, 0.24, -0.25, 0.5, 0, 0);
    }
    b.box(0.72, 0.045, 0.05, C.woodLight, 0, 0.9, -0.42).box(0.64, 0.045, 0.05, C.woodLight, 0, 0.1, 0.5).box(0.64, 0.045, 0.05, C.woodLight, 0, 0.62, 0.44);
    b.add(new THREE.BoxGeometry(0.6, 0.015, 1.05, 12, 1, 4), stripe, 0, 0.5, 0.0, 0.8, 0, 0, 1, 1, 1, { grad: 1 });
  });
  // a folded spare and a bucket and spade
  b.box(0.08, 0.7, 0.9, C.woodLight, 0.56, 0.36, -0.05, 0, 0, -0.16).box(0.03, 0.62, 0.8, C.coral, 0.51, 0.36, -0.05, 0, 0, -0.16);
  b.cyl(0.13, 0.1, 0.2, C.yellow, 0.48, 0.1, 0.46).tor(0.1, 0.012, C.white, 0.48, 0.22, 0.46, 0, 0, 0, { arc: PI, seg: 8 });
  b.cyl(0.015, 0.015, 0.34, C.red, 0.5, 0.27, 0.46, 0.2, 0, 0.2);
});
def('fishbox', 'low', 1.45, 0.82, 1.0, (b) => {
  b.at(-0.36, 0, 0.05, 0.08, () => fishBoxInto(b, C.blue)); b.at(-0.36, 0.28, 0.05, -0.1, () => fishBoxInto(b, C.teal));
  b.at(0.36, 0, -0.03, -0.06, () => fishBoxInto(b, C.blue)); b.at(0.36, 0.28, -0.03, 0.12, () => fishBoxInto(b, C.orange));
  b.at(0.02, 0.56, 0, 0.5, () => fishBoxInto(b, C.blue));
  for (let i = 0; i < 4; i++) b.cap(0.04, 0.26, 0xb9c7d4, -0.1 + i * 0.07, 0.86, 0.02 + (i % 2) * 0.05, PI / 2, 0.5 + i * 0.2, 0, { grad: 1 });
});

// ---------- tall obstacles ----------
def('cart', 'tall', 1.55, 3.0, 1.9, (b) => {
  const stripe = (x) => (Math.floor((x + 10) / 0.2) % 2 ? C.pink : C.cream);
  b.add(new THREE.BoxGeometry(1.3, 0.95, 1.5, 8, 1, 1), stripe, 0, 0.95, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  b.box(1.4, 0.08, 1.6, C.white, 0, 1.46, 0).box(1.36, 0.1, 1.56, C.rose, 0, 0.47, 0);
  b.box(1.2, 0.36, 0.04, C.glass, 0, 1.68, 0.72).box(1.26, 0.04, 0.5, C.white, 0, 1.87, 0.5);
  for (const sx of [-1, 1]) { wheelInto(b, 0.36, sx * 0.72, 0.36, 0.15, 0.09); b.box(0.04, 0.36, 0.5, C.glass, sx * 0.6, 1.68, 0.5); }
  b.cyl(0.05, 0.05, 0.45, C.steel, 0, 0.23, -0.7).box(0.9, 0.05, 0.05, C.steel, 0, 1.2, -0.95).box(0.05, 0.05, 0.3, C.steel, -0.45, 1.2, -0.82).box(0.05, 0.05, 0.3, C.steel, 0.45, 1.2, -0.82);
  b.cyl(0.035, 0.035, 1.6, C.white, 0, 2.2, -0.2);
  // parasol with alternating panels
  const par = new THREE.ConeGeometry(1.05, 0.5, 12, 1, true).toNonIndexed();
  b.add(par, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.rose : C.cream), 0, 2.72, -0.2, 0, 0, 0, 1, 1, 1, { grad: 0.92 });
  b.cyl(1.05, 1.05, 0.06, C.rose, 0, 2.46, -0.2, 0, 0, 0, { seg: 12, open: true });
  b.sph(0.07, C.gold, 0, 3.0, -0.2);
  // a giant cone on the counter and tubs
  b.cone(0.16, 0.42, C.woodLight, 0.35, 1.72, 0.25, PI, 0, 0).sph(0.17, C.pink, 0.35, 1.98, 0.25).sph(0.14, C.cream, 0.35, 2.15, 0.25).sph(0.05, C.red, 0.35, 2.3, 0.25);
  for (let i = 0; i < 3; i++) b.cyl(0.13, 0.13, 0.04, [C.pink, C.mint, C.cream][i], -0.4 + i * 0.3, 1.51, 0.4 - i * 0.02, 0, 0, 0, { seg: 10 });
}, { cols: 1 });
def('stack', 'tall', 1.65, 2.9, 1.65, (b) => {
  b.at(0, 0, 0, 0.06, () => crateInto(b, 1.55, 1.45, 1.55));
  b.at(0.05, 1.46, -0.03, -0.3, () => crateInto(b, 1.15, 1.1, 1.15, C.woodLight, C.wood));
  b.sph(0.72, 0x3f7f5f, 0.05, 2.5, -0.03, 1, 0.42, 1, { seg: 10 });                 // tarp
  b.box(1.25, 0.25, 1.25, 0x3f7f5f, 0.05, 2.45, -0.03, 0, -0.3, 0);
  b.tor(0.6, 0.025, C.rope, 0.05, 2.5, -0.03, PI / 2, 0, 0, { seg: 14 });
  b.box(0.4, 0.28, 0.02, C.cream, 0, 0.9, 0.79, 0, 0.06, 0).box(0.3, 0.05, 0.025, C.red, 0, 0.95, 0.795, 0, 0.06, 0);
});
function hutDef(name, col) {
  def(name, 'tall', 1.85, 3.15, 1.9, (b) => {
    const stripe = (x) => (Math.floor((x + 10) / 0.2) % 2 ? col : C.white);
    b.box(1.9, 0.12, 1.95, C.woodDark, 0, 0.06, 0);
    b.add(new THREE.BoxGeometry(1.7, 2.1, 1.7, 9, 1, 1), stripe, 0, 1.17, 0, 0, 0, 0, 1, 1, 1, { grad: 0.88 });
    b.prism(1.7, 0.7, 1.7, C.white, 0, 2.22, 0);
    for (const sx of [-1, 1]) b.box(1.3, 0.07, 2.0, col, sx * 0.52, 2.62, 0, 0, 0, sx * -0.69);
    b.box(0.1, 0.1, 2.02, C.white, 0, 3.02, 0).sph(0.08, C.gold, 0, 3.1, 1.0);
    b.box(0.7, 1.5, 0.05, col, -0.25, 0.9, 0.86).box(0.6, 0.6, 0.04, C.white, -0.25, 1.25, 0.875).box(0.05, 0.1, 0.06, C.gold, 0.0, 0.85, 0.89);
    b.box(0.42, 0.42, 0.05, C.glassDark, 0.5, 1.4, 0.86).box(0.5, 0.05, 0.07, C.white, 0.5, 1.63, 0.87).box(0.5, 0.05, 0.07, C.white, 0.5, 1.17, 0.87).box(0.04, 0.42, 0.07, C.white, 0.5, 1.4, 0.87);
    b.tor(0.2, 0.05, C.red, 0, 2.4, 0.87, 0, 0, 0, { seg: 12 });                    // lifebuoy on the gable
    for (let a = 0; a < 4; a++) b.box(0.07, 0.11, 0.02, C.white, Math.cos(a * PI / 2 + 0.78) * 0.2, 2.4 + Math.sin(a * PI / 2 + 0.78) * 0.2, 0.9, 0, 0, a * PI / 2 + 0.78);
  });
}
hutDef('hutA', C.teal); hutDef('hutB', C.coral);
def('boat', 'tall', 1.8, 3.3, 4.6, (b) => {
  const hullCol = (x, y) => (y > 1.42 ? C.red : y > 0.72 ? C.white : 0x2d5b86);
  b.dome(1, hullCol, 0, 1.6, 0, 0, 0, 0, 0.86, 1.05, 2.25, { t0: PI / 2, tl: PI / 2, seg: 16, grad: 0.85 });
  b.add(new THREE.TorusGeometry(1, 0.06, 6, 20), C.woodDark, 0, 1.6, 0, PI / 2, 0, 0, 0.86, 2.25, 1);
  b.add(new THREE.CylinderGeometry(1, 1, 0.05, 20), C.woodLight, 0, 1.56, 0, 0, 0, 0, 0.82, 1, 2.2);
  b.box(1.1, 0.95, 1.5, C.white, 0, 2.05, 0.3).box(1.2, 0.08, 1.7, 0x2d5b86, 0, 2.56, 0.3);     // wheelhouse
  for (const sx of [-1, 1]) for (const z of [-0.1, 0.7]) b.box(0.03, 0.34, 0.5, C.glassDark, sx * 0.56, 2.22, z);
  b.box(0.8, 0.34, 0.03, C.glassDark, 0, 2.22, 1.06);
  b.cyl(0.04, 0.04, 0.75, C.steel, 0, 2.95, 0.1).box(0.5, 0.03, 0.03, C.steel, 0, 3.15, 0.1).sph(0.06, C.red, 0, 3.3, 0.1, 1, 1, 1, { glow: true, grad: 1 });
  b.tor(0.22, 0.06, C.orange, 0.88, 1.35, -0.5, 0, PI / 2, 0, { seg: 12 });
  b.box(0.5, 0.25, 0.7, C.wood, 0, 1.7, -1.3);
  // props and keel block
  b.box(0.5, 0.5, 3.2, C.woodDark, 0, 0.3, 0);
  for (const sx of [-1, 1]) for (const z of [-1.2, 0, 1.2]) b.box(0.1, 1.3, 0.1, C.wood, sx * 0.72, 0.6, z, 0, 0, sx * 0.42);
  for (const z of [-1.2, 1.2]) b.box(1.7, 0.1, 0.16, C.woodDark, 0, 0.05, z);
});
function containerDef(name, col) {
  def(name, 'tall', 1.95, 2.75, 5.0, (b) => {
    b.box(1.86, 2.6, 4.9, col, 0, 1.4, 0);
    for (let i = 0; i < 20; i++) for (const sx of [-1, 1]) b.box(0.035, 2.36, 0.11, col, sx * 0.945, 1.4, -2.3 + i * 0.242, 0, 0, 0, { grad: 0.7 });
    for (let i = 0; i < 8; i++) b.box(0.11, 0.035, 4.7, col, -0.8 + i * 0.228, 2.715, 0, 0, 0, 0, { grad: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.1, 2.68, 0.1, col, sx * 0.9, 1.4, sz * 2.42, 0, 0, 0, { grad: 0.6 });
    b.box(1.9, 0.12, 5.0, C.iron, 0, 0.06, 0).box(1.9, 0.08, 4.96, col, 0, 2.7, 0, 0, 0, 0, { grad: 0.6 });
    // doors face the player
    b.box(0.03, 2.4, 0.03, C.iron, 0, 1.4, 2.47);
    for (const sx of [-1, 1]) for (const dx of [0.3, 0.62]) b.cyl(0.02, 0.02, 2.3, C.steel, sx * dx, 1.4, 2.48, 0, 0, 0, { seg: 6 });
    for (const sx of [-1, 1]) b.box(0.22, 0.05, 0.05, C.steel, sx * 0.45, 1.25, 2.5);
    b.box(0.7, 0.34, 0.02, C.cream, -0.42, 2.25, 2.465).box(0.5, 0.07, 0.025, col, -0.42, 2.3, 2.47, 0, 0, 0, { grad: 0.5 });
  });
}
containerDef('containerA', 0x2f7fb6); containerDef('containerB', 0xc65a3a); containerDef('containerC', 0x3f9a78);

hutDef('hutC', 0x8a4fd0);
// funfair popcorn cart
def('popcorn', 'tall', 1.6, 3.2, 1.8, (b) => {
  const stripe = (x) => (Math.floor((x + 10) / 0.2) % 2 ? C.red : C.cream);
  b.add(new THREE.BoxGeometry(1.4, 1.0, 1.4, 8, 1, 1), stripe, 0, 0.92, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
  for (const sx of [-1, 1]) wheelInto(b, 0.38, sx * 0.76, 0.38, -0.2, 0.09);
  b.cyl(0.05, 0.05, 0.42, C.steel, 0, 0.21, 0.55).box(1.5, 0.08, 1.5, C.gold, 0, 1.46, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.06, 0.95, 0.06, C.red, sx * 0.64, 1.97, sz * 0.64);
  b.sph(0.6, 0xfff3c4, 0, 1.55, 0, 1, 0.75, 1, { seg: 10 });
  for (let i = 0; i < 14; i++) b.sph(0.1, i % 3 ? 0xfff3c4 : 0xffe08a, Math.cos(i * 2.4) * 0.38, 1.86 + (i % 4) * 0.05, Math.sin(i * 2.4) * 0.38, 1, 1, 1, { seg: 6 });
  b.box(1.26, 0.9, 0.03, C.glass, 0, 1.97, 0.66).box(0.03, 0.9, 1.26, C.glass, 0.66, 1.97, 0).box(0.03, 0.9, 1.26, C.glass, -0.66, 1.97, 0);
  const roof = new THREE.ConeGeometry(1.15, 0.6, 12, 1, true).toNonIndexed();
  b.add(roof, (x, y, z, i) => (Math.floor(i / 6) % 2 ? C.red : C.cream), 0, 2.76, 0, 0, 0, 0, 1, 1, 1, { grad: 0.92 });
  b.cyl(1.15, 1.15, 0.1, C.gold, 0, 2.46, 0, 0, 0, 0, { seg: 12, open: true }).sph(0.08, C.gold, 0, 3.12, 0);
  for (let i = 0; i < 12; i++) b.sph(0.06, i % 2 ? 0xffe27a : 0xff8ab0, Math.cos(i * PI / 6) * 1.16, 2.42, Math.sin(i * PI / 6) * 1.16, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  b.box(0.9, 0.3, 0.04, C.navy, 0, 1.0, 0.72).box(0.7, 0.07, 0.05, C.gold, 0, 1.05, 0.725).box(0.5, 0.06, 0.05, C.cream, 0, 0.93, 0.725);
});
// storm level: a boulder pile and a beached navigation buoy
def('rock', 'tall', 1.9, 2.9, 1.9, (b) => {
  const g1 = 0x6f7477, g2 = 0x858a8c, g3 = 0x5c6266;
  b.add(new THREE.DodecahedronGeometry(1.0), g1, 0, 0.78, 0, 0.3, 0.5, 0, 0.94, 0.88, 0.9);
  b.add(new THREE.DodecahedronGeometry(0.8), g2, 0.12, 1.72, -0.05, 1.1, 0.2, 0.4, 0.95, 0.9, 0.95);
  b.add(new THREE.DodecahedronGeometry(0.52), g3, -0.18, 2.42, 0.05, 0.4, 1.3, 0.2);
  b.add(new THREE.DodecahedronGeometry(0.42), g3, -0.55, 0.32, 0.55, 2, 1, 0).add(new THREE.DodecahedronGeometry(0.38), g2, 0.6, 0.28, 0.5, 1, 2, 0.5);
  for (let i = 0; i < 6; i++) b.cone(0.06, 0.42 + (i % 3) * 0.12, i % 2 ? 0x3d8b4f : 0x2f6f4a, -0.7 + i * 0.26, 0.2 + (i % 3) * 0.06, 0.82 - (i % 2) * 0.08, (i % 3 - 1) * 0.25, 0, (i % 2 ? 1 : -1) * 0.22, { seg: 5 });
  for (let i = 0; i < 5; i++) b.sph(0.05, 0xe9e2cf, Math.cos(i * 1.9) * 0.6, 0.9 + (i % 3) * 0.3, 0.72 - (i % 2) * 0.1, 1, 1, 0.5, { seg: 6 });   // barnacles
  for (let a = 0; a < 5; a++) b.cap(0.035, 0.16, C.orange, 0.3 + Math.cos(a * 1.257) * 0.12, 1.35 + Math.sin(a * 1.257) * 0.12, 0.72, 0, 0, a * 1.257 + PI / 2);   // starfish
  b.cyl(0.03, 0.03, 1.3, C.steel, 0.72, 0.65, 0.78).flat([[[0.42, 1.3, 0.8], [1.02, 1.3, 0.8], [0.72, 1.85, 0.8]]], C.yellow)
    .box(0.05, 0.22, 0.02, C.black, 0.72, 1.56, 0.815).box(0.05, 0.05, 0.02, C.black, 0.72, 1.39, 0.815);
});
def('buoyBig', 'tall', 1.7, 3.2, 1.7, (b) => {
  b.cyl(0.6, 0.5, 0.14, C.iron, 0, 0.07, 0, 0, 0, 0, { seg: 14 });
  b.cyl(0.82, 0.62, 0.8, C.red, 0, 0.52, 0, 0, 0, 0, { seg: 14 }).cyl(0.84, 0.84, 0.14, C.white, 0, 0.82, 0, 0, 0, 0, { seg: 14 }).cyl(0.82, 0.7, 0.2, C.red, 0, 1.0, 0, 0, 0, 0, { seg: 14 });
  for (let a = 0; a < 4; a++) { const cx = Math.cos(a * PI / 2 + 0.78), cz = Math.sin(a * PI / 2 + 0.78); b.box(0.07, 1.5, 0.07, C.red, cx * 0.4, 1.8, cz * 0.4, -cz * 0.2, 0, cx * 0.2); }
  b.tor(0.42, 0.03, C.red, 0, 1.8, 0, PI / 2, 0, 0, { seg: 12 }).sph(0.19, C.gold, 0, 1.52, 0, 1, 1.1, 1).cyl(0.02, 0.02, 0.3, C.iron, 0, 1.8, 0);
  b.cyl(0.3, 0.3, 0.07, C.red, 0, 2.56, 0, 0, 0, 0, { seg: 10 }).cyl(0.15, 0.15, 0.32, 0xfff3b0, 0, 2.76, 0, 0, 0, 0, { glow: true, grad: 0.8, seg: 8 });
  b.cone(0.2, 0.2, C.iron, 0, 3.02, 0, 0, 0, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) b.tor(0.72 - i * 0.05, 0.04, C.iron, 0.2, 0.05 + i * 0.07, 0.25, PI / 2, 0, 0, { seg: 12 });    // chain coil
  b.box(0.4, 0.3, 0.02, C.white, 0, 0.5, 0.79).box(0.26, 0.06, 0.025, C.navy, 0, 0.54, 0.795);
});

// sandcastle bay: a sandcastle tower and a rack of surfboards
const SAND = 0xedd9a3, SAND_D = 0xd6bd84;
def('castleOb', 'tall', 1.85, 3.1, 1.85, (b) => {
  b.cyl(0.9, 0.98, 0.3, SAND_D, 0, 0.15, 0, 0, 0, 0, { seg: 14 });
  b.add(new THREE.CylinderGeometry(0.72, 0.84, 1.9, 14, 4), (x, y) => (Math.floor(y / 0.24) % 4 === 0 ? SAND_D : SAND), 0, 1.25, 0);
  b.cyl(0.86, 0.8, 0.22, SAND, 0, 2.3, 0, 0, 0, 0, { seg: 14 });
  for (let i = 0; i < 8; i++) b.box(0.3, 0.26, 0.2, SAND, Math.cos(i * PI / 4) * 0.74, 2.52, Math.sin(i * PI / 4) * 0.74, 0, -i * PI / 4 + PI / 2, 0);
  b.cone(0.5, 0.5, SAND_D, 0, 2.62, 0, 0, 0, 0, { seg: 10 }).cyl(0.02, 0.02, 0.5, C.woodLight, 0, 2.9, 0).flat([[[0, 3.12, 0], [0, 2.84, 0], [0.42, 2.98, 0]]], C.red);
  b.box(0.42, 0.7, 0.06, 0x8a6d43, 0, 0.62, 0.81).cyl(0.21, 0.21, 0.06, 0x8a6d43, 0, 0.97, 0.81, PI / 2, 0, 0, { seg: 10 });
  for (const sx of [-1, 1]) b.box(0.14, 0.3, 0.05, 0x8a6d43, sx * 0.4, 1.7, 0.66, 0, sx * 0.5, 0);
  for (let i = 0; i < 5; i++) b.sph(0.07, i % 2 ? C.pink : C.white, Math.cos(i * 1.3 + 0.4) * 0.84, 0.36, Math.sin(i * 1.3 + 0.4) * 0.84, 1, 0.6, 1, { seg: 6 });
  b.cyl(0.17, 0.13, 0.26, C.blue, 0.72, 0.13, 0.62, 0, 0, 0, { seg: 10 }).cyl(0.015, 0.015, 0.4, C.yellow, -0.7, 0.2, 0.66, 0.3, 0, 0.4).box(0.12, 0.16, 0.02, C.yellow, -0.78, 0.4, 0.72, 0.3, 0, 0.4);
});
def('surfRack', 'tall', 1.9, 3.0, 1.2, (b) => {
  b.box(1.9, 0.14, 0.9, C.woodDark, 0, 0.07, 0);
  for (const sx of [-1, 1]) b.box(0.1, 1.5, 0.1, C.wood, sx * 0.88, 0.75, -0.2).box(0.1, 0.1, 0.8, C.wood, sx * 0.88, 0.3, 0.1);
  b.box(1.86, 0.1, 0.1, C.wood, 0, 1.45, -0.2).box(1.86, 0.08, 0.08, C.wood, 0, 0.7, -0.14);
  const cols = [[C.coral, C.cream], [C.teal, C.yellow], [C.blue, C.white]];
  for (let i = 0; i < 3; i++) {
    const [c1, c2] = cols[i], x = -0.6 + i * 0.6;
    b.add(new THREE.SphereGeometry(1, 12, 10), (px, py) => (Math.abs(px - x) < 0.045 ? c2 : py > 2.2 ? c2 : c1), x, 1.58, 0.05 + i * 0.04, -0.13, 0, 0, 0.27, 1.42, 0.05, { grad: 0.9 });
    b.box(0.03, 0.2, 0.16, C.navy, x, 0.5, -0.06 + i * 0.04, -0.13, 0, 0);
  }
  b.box(0.7, 0.3, 0.03, C.cream, 0, 0.36, 0.47).box(0.5, 0.06, 0.035, C.coral, 0, 0.4, 0.475);
});
// smugglers' cove: a cluster of glowing crystals and a pile of treasure
function crystalInto(b, x, y, z, s, col, lean = 0, ry = 0) {
  b.add(new THREE.OctahedronGeometry(1), col, x, y + s * 1.25, z, lean, ry, lean * 0.7, s * 0.34, s * 1.3, s * 0.34, { glow: true, grad: 0.55 });
}
def('crystal', 'tall', 1.8, 3.1, 1.8, (b) => {
  b.add(new THREE.DodecahedronGeometry(0.75), 0x37474f, 0, 0.42, 0, 0.4, 0.3, 0, 1.15, 0.6, 1.1);
  b.add(new THREE.DodecahedronGeometry(0.4), 0x2f3d46, 0.6, 0.25, 0.5, 1, 2, 0).add(new THREE.DodecahedronGeometry(0.36), 0x41525a, -0.62, 0.22, 0.4, 2, 1, 0);
  crystalInto(b, 0, 0.35, 0, 1.05, 0x4ff2ff);
  crystalInto(b, 0.42, 0.3, 0.12, 0.7, 0xff6fe0, 0.3, 0.5);
  crystalInto(b, -0.45, 0.3, 0.05, 0.62, 0x7dffb0, -0.34, 2.2);
  crystalInto(b, 0.1, 0.25, 0.5, 0.42, 0xb99bff, 0.5, 1.2);
  crystalInto(b, -0.2, 0.25, -0.45, 0.5, 0x4ff2ff, -0.45, 4);
});
function chestInto(b, w, h, d, open) {
  b.box(w, h, d, 0x8a5a3c, 0, h / 2, 0);
  for (const sx of [-0.36, 0, 0.36]) b.box(0.07, h + 0.02, d + 0.03, C.gold, sx * w, h / 2, 0);
  b.box(w + 0.03, 0.07, d + 0.03, 0x5c3a25, 0, h - 0.03, 0);
  if (open) {
    b.add(new THREE.CylinderGeometry(d / 2, d / 2, w, 10, 1, false, 0, PI), 0x8a5a3c, 0, h + d * 0.36, -d * 0.52, 0.5, 0, PI / 2);
    for (let i = 0; i < 12; i++) b.sph(0.085, i % 3 ? 0xffd24a : 0xffef9a, (i % 4 - 1.5) * w * 0.2, h + 0.05 + (i % 3) * 0.04, (Math.floor(i / 4) - 1) * d * 0.25, 1, 0.5, 1, { glow: true, seg: 6, grad: 0.8 });
    b.add(new THREE.OctahedronGeometry(0.12), 0xff5a7a, w * 0.2, h + 0.2, 0.05, 0, 0.5, 0, 1, 1, 1, { glow: true, grad: 0.7 }).add(new THREE.OctahedronGeometry(0.1), 0x58e6ff, -w * 0.22, h + 0.18, -0.08, 0, 0.2, 0, 1, 1, 1, { glow: true, grad: 0.7 });
  } else {
    b.add(new THREE.CylinderGeometry(d / 2, d / 2, w, 10, 1, false, 0, PI), 0x9a6746, 0, h, 0, 0, 0, PI / 2);
    b.box(0.14, 0.18, 0.04, C.gold, 0, h - 0.02, d / 2 + 0.02);
  }
}
def('treasure', 'tall', 1.8, 2.9, 1.7, (b) => {
  b.at(0, 0, 0, 0.08, () => crateInto(b, 1.6, 1.0, 1.5, 0x7b5a3c, 0x4d3927));
  b.at(-0.1, 1.01, 0, -0.12, () => chestInto(b, 1.25, 0.62, 0.8, false));
  b.at(0.08, 2.03, 0.02, 0.2, () => chestInto(b, 0.95, 0.5, 0.66, true));
  b.at(0.78, 0, 0.62, 0, () => barrelInto(b, 0.2, 0.5));
  b.cyl(0.03, 0.03, 0.16, C.iron, -0.6, 1.72, 0.5).cyl(0.11, 0.11, 0.22, 0xffd27a, -0.6, 1.9, 0.5, 0, 0, 0, { glow: true, grad: 0.85, seg: 8 }).cone(0.15, 0.12, C.iron, -0.6, 2.07, 0.5, 0, 0, 0, { seg: 8 });
  for (let i = 0; i < 5; i++) b.cyl(0.09, 0.09, 0.03, 0xffd24a, -0.55 + i * 0.16, 0.02 + (i % 2) * 0.03, 0.9, 0, 0, 0, { glow: true, grad: 0.8, seg: 8 });
});
// frosty pier: a giant snowman and a decorated fir tree in a tub
def('snowman', 'tall', 1.75, 3.1, 1.75, (b) => {
  const W = 0xf4f8ff;
  b.sph(0.82, W, 0, 0.74, 0, 1, 0.92, 1, { seg: 14 }).sph(0.6, W, 0, 1.78, 0, 1, 0.95, 1, { seg: 14 }).sph(0.44, W, 0, 2.54, 0, 1, 1, 1, { seg: 14 });
  b.cone(0.07, 0.42, C.orange, 0, 2.52, 0.6, PI / 2, 0, 0, { seg: 8 });
  for (const sx of [-1, 1]) b.sph(0.055, C.black, sx * 0.16, 2.66, 0.39, 1, 1, 0.6, { grad: 1 });
  for (let i = -2; i <= 2; i++) b.sph(0.035, C.black, i * 0.08, 2.4 - Math.abs(i) * -0.025, 0.41 - Math.abs(i) * 0.012, 1, 1, 0.6, { grad: 1 });
  for (const y of [1.6, 1.85, 2.08]) b.sph(0.06, C.black, 0, y, 0.57 - Math.abs(y - 1.8) * 0.25, 1, 1, 0.6, { grad: 1 });
  b.tor(0.4, 0.1, C.red, 0, 2.2, 0, PI / 2, 0, 0, { seg: 14, tseg: 8 }).box(0.2, 0.6, 0.08, C.red, 0.26, 1.92, 0.42, 0, 0, -0.15).box(0.2, 0.08, 0.08, C.cream, 0.3, 1.66, 0.42, 0, 0, -0.15);
  b.cyl(0.52, 0.52, 0.05, C.black, 0, 2.88, 0, 0.1, 0, 0, { seg: 14 }).cyl(0.33, 0.35, 0.34, C.black, 0, 3.02, -0.02, 0.1, 0, 0, { seg: 14 }).cyl(0.36, 0.36, 0.07, C.red, 0, 2.94, -0.01, 0.1, 0, 0, { seg: 14 });
  for (const sx of [-1, 1]) { b.cyl(0.03, 0.04, 0.9, C.woodDark, sx * 0.86, 1.95, 0, 0, 0, sx * -1.0, { seg: 6 }); b.cyl(0.02, 0.02, 0.26, C.woodDark, sx * 1.12, 2.26, 0, 0, 0, sx * -0.2, { seg: 5 }); }
});
def('firPot', 'tall', 1.8, 3.25, 1.8, (b) => {
  const G = 0x2f7d4f, G2 = 0x3a9460, W = 0xf4f8ff, L = [0xffe27a, 0xff6f6f, 0x8ff0ff, 0xff9ee0];
  b.cyl(0.5, 0.4, 0.5, C.red, 0, 0.25, 0, 0, 0, 0, { seg: 12 }).cyl(0.53, 0.53, 0.08, C.gold, 0, 0.5, 0, 0, 0, 0, { seg: 12 }).cyl(0.1, 0.12, 0.4, C.woodDark, 0, 0.7, 0);
  for (let i = 0; i < 4; i++) {
    const r = 0.88 - i * 0.18, y = 1.1 + i * 0.52;
    b.cone(r, 0.85, i % 2 ? G2 : G, 0, y + 0.1, 0, 0, i * 0.5, 0, { seg: 10 }).cone(r * 0.55, 0.5, W, 0, y + 0.31, 0, 0, i * 0.5, 0, { seg: 10 });
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + i * 0.5; b.sph(0.065, L[(k + i) % 4], Math.cos(a) * r * 0.72, y - 0.12, Math.sin(a) * r * 0.72, 1, 1, 1, { glow: true, seg: 6, grad: 1 }); }
  }
  b.add(new THREE.OctahedronGeometry(0.16), 0xffe27a, 0, 3.12, 0, 0, 0.6, 0, 1, 1.3, 0.5, { glow: true, grad: 0.8 });
  for (const [x, z, c] of [[0.62, 0.5, C.blue], [-0.6, 0.55, C.rose]]) b.box(0.34, 0.26, 0.34, c, x, 0.13, z, 0, 0.4, 0).box(0.36, 0.05, 0.08, C.gold, x, 0.2, z, 0, 0.4, 0).box(0.08, 0.05, 0.36, C.gold, x, 0.2, z, 0, 0.4, 0);
});

// ---------- Christmas Pier ----------
// A wrapped present with a ribbon both ways and a bow on top; (x, y, z) is the middle of its base.
export function giftInto(b, w, h, d, col, rib, x = 0, y = 0, z = 0, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.box(w, h, d, col, 0, h / 2, 0).box(w + 0.03, h * 0.16, d + 0.03, shade(col, 0.82), 0, h * 0.9, 0);
    b.box(w * 0.16, h + 0.03, d + 0.05, rib, 0, h / 2, 0).box(w + 0.05, h + 0.03, d * 0.16, rib, 0, h / 2, 0);
    for (const sx of [-1, 1]) b.sph(0.5, rib, sx * w * 0.16, h + w * 0.07, 0, w * 0.34, w * 0.2, w * 0.2, { seg: 8 });
    b.sph(0.5, shade(rib, 0.85), 0, h + w * 0.06, 0, w * 0.16, w * 0.16, w * 0.16, { seg: 6 });
  });
}
// A giant candy cane standing at (x, y, z): h is the height of the straight part, dir the side the crook bends to.
export function caneInto(b, x, y, z, h, r, dir = 1, ry = 0) {
  b.at(x, y, z, ry, () => {
    const n = Math.max(4, Math.round(h / (r * 2.6))), seg = h / n, R = r * 3.2;
    for (let i = 0; i < n; i++) b.cyl(r, r, seg + 0.01, i % 2 ? 0xffffff : 0xe5383b, 0, seg * (i + 0.5), 0, 0, 0, 0, { seg: 9 });
    // the crook: five short arcs over the top, from the shaft across to the far side
    for (let k = 0; k < 5; k++) b.tor(R, r, (k + (dir > 0 ? n : n + 1)) % 2 ? 0xffffff : 0xe5383b, dir * R, h, 0, 0, 0, k * (PI / 5), { arc: PI / 5 + 0.03, seg: 5, tseg: 9 });
    b.sph(r, 0xe5383b, dir * R * 2, h, 0, 1, 1, 1, { seg: 8 });
  });
}
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const GIFT = [[0xe5383b, 0xffd24a], [0x2f9d5c, 0xffffff], [0x2f6fd0, 0xffd24a], [0xff7ab8, 0xffffff], [0xf2c23a, 0xe5383b], [0x8a4fd0, 0x9ff0e0]];
def('gift', 'low', 1.35, 0.92, 1.1, (b) => {
  giftInto(b, 1.25, 0.84, 1.0, GIFT[0][0], GIFT[0][1]);
  for (let i = 0; i < 6; i++) b.sph(0.045, 0xffffff, -0.5 + i * 0.2, 0.3 + (i % 2) * 0.28, 0.51, 1, 1, 0.4, { seg: 5 });      // a spotty wrapping paper
});
def('pudding', 'low', 1.3, 0.92, 1.3, (b) => {
  // a Christmas pudding the size of a barrel, with icing running down it and a sprig of holly
  b.cyl(0.66, 0.6, 0.07, 0xf4f8ff, 0, 0.035, 0, 0, 0, 0, { seg: 16 }).cyl(0.7, 0.66, 0.03, 0xd9e6f5, 0, 0.08, 0, 0, 0, 0, { seg: 16 });
  b.sph(0.56, 0x6b3a22, 0, 0.44, 0, 1, 0.78, 1, { seg: 16 });
  for (let i = 0; i < 14; i++) { const a = i * 2.4, u = 0.35 + (i % 4) * 0.25; b.sph(0.045, i % 2 ? 0x3a1d10 : 0xb5562a, Math.cos(a) * Math.sin(u) * 0.56, 0.44 + Math.cos(u) * 0.43, Math.sin(a) * Math.sin(u) * 0.56, 1, 1, 1, { seg: 5 }); }
  b.sph(0.4, 0xfffaf0, 0, 0.7, 0, 1, 0.42, 1, { seg: 14 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9; b.sph(0.14, 0xfffaf0, Math.cos(a) * 0.36, 0.62 - (i % 3) * 0.07, Math.sin(a) * 0.36, 1, 1.5 + (i % 3) * 0.5, 1, { seg: 7 }); }
  for (const sx of [-1, 1]) b.sph(0.16, 0x2f9d5c, sx * 0.12, 0.89, 0, 1, 0.22, 0.5, { seg: 7 });
  for (const [x, z] of [[0, 0.06], [0.07, -0.04], [-0.07, -0.04]]) b.sph(0.055, 0xe5383b, x, 0.92, z, 1, 1, 1, { seg: 6 });
});
def('sledge', 'low', 1.4, 0.9, 1.3, (b) => {
  for (const sx of [-1, 1]) {
    b.box(0.07, 0.07, 1.25, 0xc23b2e, sx * 0.48, 0.05, 0).tor(0.16, 0.035, 0xc23b2e, sx * 0.48, 0.2, 0.62, 0, PI / 2, 0, { arc: PI, seg: 8 });
    for (const z of [-0.4, 0.3]) b.box(0.06, 0.26, 0.06, 0x8a5f3e, sx * 0.48, 0.2, z);
  }
  for (let i = 0; i < 4; i++) b.box(0.26, 0.05, 1.2, i % 2 ? 0xc9a26a : 0xb88d55, -0.39 + i * 0.26, 0.35, 0);
  b.sph(0.38, 0x8a5f3e, -0.1, 0.62, -0.25, 1, 0.75, 1, { seg: 10 }).cyl(0.1, 0.16, 0.14, 0x8a5f3e, -0.1, 0.9, -0.25, 0, 0, 0, { seg: 8 }).tor(0.12, 0.025, 0xffd24a, -0.1, 0.86, -0.25, PI / 2, 0, 0, { seg: 8 });
  giftInto(b, 0.42, 0.34, 0.42, GIFT[2][0], GIFT[2][1], 0.3, 0.38, 0.3, 0.3);
  giftInto(b, 0.3, 0.26, 0.3, GIFT[3][0], GIFT[3][1], -0.28, 0.38, 0.36, -0.4);
});
def('giftStack', 'tall', 1.65, 2.95, 1.65, (b) => {
  giftInto(b, 1.5, 1.1, 1.5, GIFT[1][0], GIFT[1][1], 0, 0, 0, 0);
  giftInto(b, 1.15, 0.9, 1.15, GIFT[4][0], GIFT[4][1], 0.05, 1.1, 0, 0.3);
  giftInto(b, 0.8, 0.7, 0.8, GIFT[5][0], GIFT[5][1], -0.05, 2.0, 0.02, -0.25);
  for (let i = 0; i < 5; i++) b.sph(0.07, 0xffffff, -0.6 + i * 0.3, 0.3 + (i % 2) * 0.45, 0.76, 1, 1, 0.4, { seg: 5 });
});
def('nutcracker', 'tall', 1.5, 3.15, 1.3, (b) => {
  // a toy soldier as tall as a beach hut, standing to attention on a little drum
  const RED = 0xd8342f, BLUE = 0x2a4fa8, GOLD = 0xffd24a, SKIN = 0xf2c9a4;
  b.cyl(0.62, 0.62, 0.42, 0xfffaf0, 0, 0.21, 0, 0, 0, 0, { seg: 14 }).cyl(0.65, 0.65, 0.07, GOLD, 0, 0.42, 0, 0, 0, 0, { seg: 14 }).cyl(0.65, 0.65, 0.07, GOLD, 0, 0.04, 0, 0, 0, 0, { seg: 14 });
  for (let i = 0; i < 8; i++) b.box(0.03, 0.34, 0.03, RED, Math.cos(i * 0.785) * 0.63, 0.22, Math.sin(i * 0.785) * 0.63, 0, 0, (i % 2 ? 0.35 : -0.35));
  for (const sx of [-1, 1]) {
    b.box(0.3, 0.26, 0.42, 0x1f2933, sx * 0.2, 0.58, 0.04).box(0.26, 0.72, 0.28, BLUE, sx * 0.2, 1.06, 0).box(0.05, 0.72, 0.29, GOLD, sx * 0.34, 1.06, 0);
    b.box(0.2, 0.82, 0.24, RED, sx * 0.5, 1.8, 0).box(0.21, 0.1, 0.25, GOLD, sx * 0.5, 1.44, 0).sph(0.12, 0xfffaf0, sx * 0.5, 1.32, 0, 1, 1, 1, { seg: 7 });
    b.box(0.3, 0.09, 0.34, GOLD, sx * 0.5, 2.24, 0);
  }
  b.box(0.74, 0.86, 0.42, RED, 0, 1.84, 0).box(0.76, 0.1, 0.44, 0x1f2933, 0, 1.47, 0).box(0.16, 0.14, 0.05, GOLD, 0, 1.47, 0.22);
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) b.sph(0.045, GOLD, sx * 0.13, 1.7 + i * 0.2, 0.22, 1, 1, 0.5, { seg: 6 });
  b.box(0.52, 0.5, 0.44, SKIN, 0, 2.52, 0).box(0.54, 0.16, 0.2, 0xfffaf0, 0, 2.36, 0.16).box(0.36, 0.09, 0.05, 0xfffaf0, 0, 2.4, 0.23);
  for (let i = 0; i < 4; i++) b.box(0.012, 0.09, 0.055, 0x8a5f3e, -0.135 + i * 0.09, 2.4, 0.235);
  b.box(0.1, 0.12, 0.1, 0xe89a7a, 0, 2.56, 0.24).box(0.42, 0.07, 0.06, 0x3a2a20, 0, 2.47, 0.23, 0, 0, 0);
  for (const sx of [-1, 1]) b.sph(0.05, 0x1f2933, sx * 0.13, 2.64, 0.22, 1, 1, 0.5, { seg: 6 }).box(0.16, 0.04, 0.04, 0x3a2a20, sx * 0.13, 2.72, 0.23, 0, 0, sx * -0.25).sph(0.07, 0xff9a8a, sx * 0.2, 2.53, 0.2, 1, 0.7, 0.4, { seg: 6 });
  b.box(0.56, 0.3, 0.3, 0xfffaf0, 0, 2.5, -0.2);
  b.cyl(0.3, 0.27, 0.42, 0x1f2933, 0, 2.94, 0, 0, 0, 0, { seg: 12 }).cyl(0.31, 0.31, 0.06, GOLD, 0, 2.77, 0, 0, 0, 0, { seg: 12 }).box(0.14, 0.14, 0.04, GOLD, 0, 2.94, 0.29).sph(0.09, RED, 0, 3.15, 0, 1, 1.2, 1, { seg: 7 });
});
def('candyCanes', 'tall', 1.7, 3.0, 1.2, (b) => {
  b.sph(1, 0xf4f8ff, 0, 0, 0, 0.85, 0.3, 0.6, { seg: 9 });
  caneInto(b, 0.52, 0, 0, 2.5, 0.13, -1); caneInto(b, -0.52, 0, 0.05, 2.2, 0.13, 1); caneInto(b, 0.05, 0, -0.2, 1.6, 0.1, 1, 0.5);
  b.tor(0.16, 0.05, 0x2f9d5c, 0, 1.3, 0.16, 0, 0, 0, { seg: 10 }).sph(0.07, 0xffd24a, 0, 1.3, 0.2, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) b.sph(0.2, 0x2f9d5c, sx * 0.24, 1.3, 0.16, 1, 0.55, 0.3, { seg: 7 }).box(0.09, 0.4, 0.03, 0x2f9d5c, sx * 0.1, 1.02, 0.18, 0, 0, sx * 0.3);
});
def('toyTrain', 'low', 1.5, 0.98, 1.15, (b) => {
  // a clockwork engine that trundles from side to side across the pier; it faces +x
  const RED = 0xd8342f, GREEN = 0x2f9d5c, GOLD = 0xffd24a;
  b.box(1.4, 0.12, 0.7, 0x1f2933, 0, 0.28, 0).cyl(0.27, 0.27, 0.78, RED, 0.22, 0.6, 0, 0, 0, PI / 2, { seg: 12 }).cyl(0.29, 0.29, 0.06, GOLD, 0.62, 0.6, 0, 0, 0, PI / 2, { seg: 12 }).cyl(0.29, 0.29, 0.05, GOLD, 0.1, 0.6, 0, 0, 0, PI / 2, { seg: 12 });
  b.sph(0.1, 0xfff1c2, 0.66, 0.6, 0, 0.5, 1, 1, { seg: 7, glow: true, grad: 0.9 });
  b.box(0.5, 0.62, 0.72, GREEN, -0.42, 0.65, 0).box(0.6, 0.07, 0.82, GOLD, -0.42, 0.97, 0).box(0.3, 0.26, 0.74, 0xbfe6f5, -0.42, 0.74, 0);
  b.cyl(0.07, 0.07, 0.22, 0x1f2933, 0.42, 0.9, 0, 0, 0, 0, { seg: 8 }).cyl(0.12, 0.07, 0.1, GOLD, 0.42, 0.98, 0, 0, 0, 0, { seg: 8 }).sph(0.1, GOLD, 0.1, 0.87, 0, 1, 0.8, 1, { seg: 8 });
  b.prism(0.5, 0.26, 0.36, GOLD, 0.84, 0.2, 0, PI / 2);
  for (const sz of [-1, 1]) for (const [x, r] of [[-0.42, 0.24], [0.12, 0.17], [0.5, 0.17]]) b.cyl(r, r, 0.08, GOLD, x, r, sz * 0.39, PI / 2, 0, 0, { seg: 10 }).cyl(r * 0.4, r * 0.4, 0.1, RED, x, r, sz * 0.39, PI / 2, 0, 0, { seg: 6 });
  b.cyl(0.05, 0.05, 0.16, GOLD, -0.42, 1.08, 0, 0, 0, 0, { seg: 6 });      // the key in the top
  for (const sx of [-1, 1]) b.cyl(0.07, 0.07, 0.03, GOLD, -0.42 + sx * 0.08, 1.2, 0, PI / 2, 0, 0, { seg: 8 });
});
def('bauble', 'low', 1.1, 1.0, 1.0, (b) => {
  // a giant tree bauble that rolls down the lane
  b.add(new THREE.SphereGeometry(0.5, 18, 12), (x, y, z) => (Math.abs(x) < 0.1 ? 0xffd24a : Math.abs(x) < 0.17 ? 0xffffff : 0xd8342f), 0, 0, 0, 0, 0, 0, 1, 1, 1, { grad: 0.85 });
  for (const sx of [-1, 1]) b.cyl(0.11, 0.11, 0.1, 0xffd24a, sx * 0.5, 0, 0, 0, 0, PI / 2, { seg: 8 });
  for (let i = 0; i < 8; i++) b.sph(0.05, 0xffffff, 0.3 * (i % 2 ? 1 : -1), Math.cos(i * 0.785) * 0.39, Math.sin(i * 0.785) * 0.39, 1, 1, 1, { seg: 5 });
}, { center: true });
def('giftBomb', 'low', 1.05, 1.0, 1.0, (b) => {
  // what Grumpy Santa lobs from his sleigh: a present that tumbles along the lane
  giftInto(b, 0.82, 0.82, 0.82, 0x2f9d5c, 0xe5383b, 0, -0.41, 0);
  for (const [x, y] of [[-0.22, 0.14], [0.2, -0.16], [0.22, 0.2], [-0.2, -0.2]]) for (const sz of [-1, 1]) b.sph(0.05, 0xffe27a, x, y, sz * 0.42, 1, 1, 0.4, { seg: 5 });
}, { center: true });

// ---------- Marshmallow Shore ----------
const MALLOW_P = 0xffb3d4, MALLOW_W = 0xfff6ee, DOUGH = 0xdba15c, CHOC = 0x6b3a22, SPRINK = [0xff5a8a, 0x5ac8ff, 0xffe24a, 0x7be07b, 0xffffff, 0xb07bff];
// A puffy marshmallow: (x, y, z) is the middle of its base.
export function mallowInto(b, r, h, col, x = 0, y = 0, z = 0) {
  b.cyl(r, r, h * 0.74, col, x, y + h / 2, z, 0, 0, 0, { seg: 16 }).sph(r * 0.985, col, x, y + h / 2, z, 1, (h * 0.5) / (r * 0.985), 1, { seg: 16 });
}
// A cute sleepy face on the front (+z) of something round of radius r, centred at height y.
function faceInto(b, r, y, s = 1, x = 0, z = 0) {
  for (const sx of [-1, 1]) b.tor(0.07 * s, 0.018 * s, 0x4a2a20, x + sx * 0.2 * s, y + 0.05 * s, z + r, 0, 0, PI, { arc: PI, seg: 7 }).sph(0.07 * s, 0xff8fb0, x + sx * 0.33 * s, y - 0.07 * s, z + r - 0.02, 1, 0.65, 0.3, { seg: 6 });
  b.tor(0.08 * s, 0.02 * s, 0x4a2a20, x, y - 0.03 * s, z + r, 0, 0, PI, { arc: PI, seg: 7 });
}
// A ring doughnut with icing and sprinkles. flat: lying down (centre at x, y, z); otherwise standing, facing +z.
export function donutInto(b, R, tube, icing, x, y, z, flat = true, ry = 0) {
  b.at(x, y, z, ry, () => {
    const rx = flat ? PI / 2 : 0;
    b.tor(R, tube, DOUGH, 0, 0, 0, rx, 0, 0, { seg: 18, tseg: 9 });
    if (flat) b.tor(R, tube * 0.86, icing, 0, tube * 0.3, 0, rx, 0, 0, { seg: 18, tseg: 8 }); else b.tor(R, tube * 0.86, icing, 0, 0, tube * 0.3, rx, 0, 0, { seg: 18, tseg: 8 });
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.2, rr = R + ((i % 3) - 1) * tube * 0.35, c = SPRINK[i % 6]; if (flat) b.box(0.035, 0.03, 0.11, c, Math.cos(a) * rr, tube * 1.12, Math.sin(a) * rr, 0, a * 2, 0); else b.box(0.035, 0.11, 0.03, c, Math.cos(a) * rr, Math.sin(a) * rr, tube * 1.12, 0, 0, a * 2); }
  });
}
// A swirl lollipop on a stick, facing +z; (x, y, z) is the foot of the stick, h the height of the middle of the sweet.
export function lollyInto(b, x, y, z, h, r, c1, c2 = 0xffffff, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.cyl(r * 0.07, r * 0.07, h, 0xfff6ee, 0, h / 2, 0, 0, 0, 0, { seg: 6 });
    b.cyl(r, r, r * 0.26, c1, 0, h, 0, PI / 2, 0, 0, { seg: 18 }).cyl(r * 0.72, r * 0.72, r * 0.3, c2, 0, h, 0, PI / 2, 0, 0, { seg: 16 }).cyl(r * 0.46, r * 0.46, r * 0.34, c1, 0, h, 0, PI / 2, 0, 0, { seg: 12 }).cyl(r * 0.2, r * 0.2, r * 0.38, c2, 0, h, 0, PI / 2, 0, 0, { seg: 8 });
  });
}
// A cupcake: fluted paper case, a swirl of icing, sprinkles and a cherry. s is its overall size (about 2.9 s tall).
export function cupcakeInto(b, x, y, z, s, caseA, caseB, icing) {
  b.at(x, y, z, 0, () => {
    const g = new THREE.CylinderGeometry(0.86, 0.6, 1.1, 16, 1).toNonIndexed();
    b.add(g, (px, py, pz, i) => (i < 96 ? (Math.floor(i / 6) % 2 ? caseA : caseB) : caseA), 0, 0.55, 0);
    b.sph(0.95, DOUGH, 0, 1.1, 0, 1, 0.3, 1, { seg: 14 });
    for (let i = 0; i < 4; i++) b.sph(0.88 - i * 0.2, icing, (i % 2 ? 0.05 : -0.05), 1.42 + i * 0.36, 0, 1, 0.42, 1, { seg: 14 });
    b.sph(0.2, icing, 0, 2.62, 0, 1, 1.2, 1, { seg: 8 }).sph(0.17, 0xe5283b, 0, 2.8, 0, 1, 1, 1, { seg: 9 }).cyl(0.012, 0.012, 0.22, 0x4f8a3a, 0.04, 2.98, 0, 0, 0, -0.3, { seg: 4 });
    for (let i = 0; i < 12; i++) { const a = i * 1.9, yy = 1.5 + (i % 4) * 0.3, rr = 0.86 - (i % 4) * 0.19; b.box(0.04, 0.04, 0.13, SPRINK[i % 6], Math.cos(a) * rr, yy, Math.sin(a) * rr, 0.6, a, 0); }
  }, s);
}
def('mallow', 'low', 1.3, 0.92, 1.3, (b) => {
  mallowInto(b, 0.6, 0.9, MALLOW_P); faceInto(b, 0.6, 0.48, 1.1);
});
def('donut', 'low', 1.4, 0.9, 1.4, (b) => {
  donutInto(b, 0.42, 0.23, 0xff8fc0, 0, 0.23, 0); donutInto(b, 0.38, 0.21, CHOC, 0.05, 0.66, -0.03, true, 0.8);
});
def('jellyLow', 'low', 1.3, 0.92, 1.3, (b) => {
  b.cyl(0.66, 0.6, 0.06, 0xffffff, 0, 0.03, 0, 0, 0, 0, { seg: 16 });
  const g = new THREE.CylinderGeometry(0.34, 0.58, 0.74, 12, 1).toNonIndexed();
  b.add(g, (x, y, z, i) => (i < 72 ? (Math.floor(i / 6) % 2 ? 0xff4a6a : 0xff6f88) : 0xff8fa2), 0, 0.43, 0);
  b.sph(0.34, 0xff8fa2, 0, 0.8, 0, 1, 0.3, 1, { seg: 12 }).sph(0.15, 0xfff6ee, 0, 0.86, 0, 1, 0.8, 1, { seg: 8 });
});
def('toffees', 'low', 1.4, 0.86, 1.1, (b) => {
  // a heap of wrapped sweets
  const wrap = (x, y, z, ry, c, s = 1) => b.at(x, y, z, ry, () => { b.sph(0.3, c, 0, 0, 0, 1.25, 0.9, 0.9, { seg: 10 }); for (const sx of [-1, 1]) b.cone(0.2, 0.26, c, sx * 0.48, 0, 0, 0, 0, sx * PI / 2, { seg: 8 }); b.box(0.07, 0.56, 0.56, 0xffffff, 0, 0, 0, 0.78, 0, 0); }, s);
  wrap(-0.3, 0.27, 0.18, 0.3, 0xff5a8a); wrap(0.34, 0.27, -0.1, -0.5, 0x5ac8ff); wrap(0.0, 0.62, 0.02, 1.2, 0xffe24a, 0.85); wrap(0.25, 0.22, 0.42, 1.9, 0x7be07b, 0.7);
});
def('chocBar', 'low', 1.5, 0.92, 0.7, (b) => {
  // a slab of chocolate standing on its edge, half out of its wrapper
  b.box(1.3, 0.5, 0.26, 0xe5283b, 0, 0.25, 0).box(1.32, 0.1, 0.28, 0xffd24a, 0, 0.5, 0).box(1.34, 0.04, 0.3, 0xdfe6ee, 0, 0.57, 0);
  b.box(1.2, 0.36, 0.2, CHOC, 0, 0.74, 0);
  for (let i = 0; i < 4; i++) b.box(0.26, 0.26, 0.26, 0x7d4529, -0.45 + i * 0.3, 0.74, 0, 0, 0, 0);
});
def('mallowTower', 'tall', 1.7, 3.0, 1.7, (b) => {
  mallowInto(b, 0.8, 1.0, MALLOW_W); mallowInto(b, 0.74, 0.95, MALLOW_P, 0.04, 0.98, 0); mallowInto(b, 0.68, 0.9, MALLOW_W, -0.03, 1.9, 0.02);
  faceInto(b, 0.68, 2.36, 1.3, -0.03, 0.02);
  b.sph(0.7, CHOC, -0.03, 2.72, 0.02, 1, 0.22, 1, { seg: 14 });      // dipped in chocolate
  for (let i = 0; i < 6; i++) b.sph(0.13, CHOC, -0.03 + Math.cos(i * 1.05) * 0.62, 2.6 - (i % 3) * 0.07, 0.02 + Math.sin(i * 1.05) * 0.62, 1, 1.6, 1, { seg: 6 });
});
def('lollyBig', 'tall', 1.8, 3.15, 1.0, (b) => {
  b.sph(1, 0xfff1dc, 0, 0, 0, 0.8, 0.22, 0.5, { seg: 9 });
  lollyInto(b, 0, 0, 0, 2.3, 0.82, 0xff5a8a); lollyInto(b, -0.6, 0, 0.2, 1.1, 0.42, 0x5ac8ff, 0xffffff, 0.2); lollyInto(b, 0.62, 0, 0.18, 1.3, 0.38, 0xffb347, 0xffffff, -0.2);
  for (const sx of [-1, 1]) b.sph(0.18, 0xb07bff, sx * 0.17, 1.38, 0.1, 1, 0.6, 0.4, { seg: 7 });
});
def('cupcakeOb', 'tall', 1.8, 3.05, 1.8, (b) => cupcakeInto(b, 0, 0, 0, 1.0, 0x8fd8ff, 0xffffff, 0xff9fd0));
def('jellyOb', 'tall', 1.7, 2.9, 1.7, (b) => {
  b.cyl(0.84, 0.76, 0.08, 0xffffff, 0, 0.04, 0, 0, 0, 0, { seg: 16 });
  [[0.78, 0.66, 1.0, 0x7be07b, 0x5fd06a], [0.6, 0.5, 0.85, 0xffe24a, 0xf5c93a], [0.44, 0.3, 0.75, 0xff5a8a, 0xf04478]].reduce((y, [rb, rt, h, c1, c2]) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, 12, 1).toNonIndexed();
    b.add(g, (px, py, pz, i) => (i < 72 ? (Math.floor(i / 6) % 2 ? c1 : c2) : c1), 0, y + h / 2, 0);
    return y + h;
  }, 0.08);
  b.sph(0.3, 0xfff6ee, 0, 2.7, 0, 1, 0.5, 1, { seg: 9 }).sph(0.12, 0xe5283b, 0, 2.86, 0, 1, 1, 1, { seg: 7 });
});
def('sundae', 'tall', 1.6, 3.2, 1.6, (b) => {
  b.cyl(0.5, 0.56, 0.1, 0xcfeaff, 0, 0.05, 0, 0, 0, 0, { seg: 14 }).cyl(0.1, 0.12, 0.6, 0xcfeaff, 0, 0.4, 0, 0, 0, 0, { seg: 8 }).cyl(0.72, 0.16, 1.2, 0xdff2ff, 0, 1.3, 0, 0, 0, 0, { seg: 14 });
  b.cyl(0.66, 0.4, 0.5, 0xff9fd0, 0, 1.62, 0, 0, 0, 0, { seg: 14 });
  b.sph(0.46, 0xfff1dc, -0.24, 2.1, 0.1, 1, 1, 1, { seg: 11 }).sph(0.46, 0xff9fd0, 0.26, 2.12, 0.02, 1, 1, 1, { seg: 11 }).sph(0.44, 0x8a5a3a, 0.02, 2.5, -0.12, 1, 1, 1, { seg: 11 });
  b.sph(0.3, CHOC, 0.02, 2.82, -0.12, 1.1, 0.4, 1.1, { seg: 9 }).sph(0.13, 0xe5283b, 0.02, 3.02, -0.12, 1, 1, 1, { seg: 7 });
  b.box(0.3, 0.9, 0.05, 0xe9c27a, -0.42, 2.7, -0.2, 0, 0, 0.35).box(0.05, 1.3, 0.05, 0xff5a8a, 0.5, 2.6, -0.1, 0, 0, -0.3);
});
def('gingerMan', 'low', 1.15, 0.98, 1.0, (b) => {
  // a gingerbread man who has run away from the bakery; he faces +z and jogs from side to side
  const G = 0xc2783c, I = 0xfffaf0;
  b.sph(0.2, G, 0, 0.78, 0, 1, 1, 0.45, { seg: 12 }).sph(0.24, G, 0, 0.44, 0, 1, 1.1, 0.42, { seg: 12 });
  for (const sx of [-1, 1]) {
    b.cap(0.085, 0.24, G, sx * 0.31, 0.52, 0, 0, 0, sx * -1.15, { seg: 7 }).cap(0.095, 0.22, G, sx * 0.13, 0.13, 0, 0, 0, sx * -0.2, { seg: 7 });
    b.tor(0.085, 0.018, I, sx * 0.4, 0.57, 0.03, 0, PI / 2, 0, { seg: 8 }).tor(0.095, 0.018, I, sx * 0.14, 0.08, 0.03, PI / 2, 0, 0, { seg: 8 });
    b.sph(0.03, 0x3a1d10, sx * 0.075, 0.82, 0.09, 1, 1, 0.5, { seg: 6 }).sph(0.04, 0xff8fb0, sx * 0.13, 0.75, 0.08, 1, 0.7, 0.4, { seg: 6 });
  }
  b.tor(0.06, 0.014, I, 0, 0.75, 0.09, 0, 0, PI, { arc: PI, seg: 7 });
  for (let i = 0; i < 3; i++) b.sph(0.035, [0xff5a8a, 0x5ac8ff, 0x7be07b][i], 0, 0.56 - i * 0.12, 0.1, 1, 1, 0.6, { seg: 6 });
});
def('gobstopper', 'low', 1.1, 1.0, 1.0, (b) => {
  const band = [0xff5a8a, 0xffb347, 0xffe24a, 0x7be07b, 0x5ac8ff, 0xb07bff];
  b.add(new THREE.SphereGeometry(0.5, 20, 14), (x) => band[Math.min(5, Math.floor(((x + 0.5) / 1.0) * 6))], 0, 0, 0, 0, 0, 0, 1, 1, 1, { grad: 0.88 });
  for (let i = 0; i < 10; i++) { const a = i * 2.4, c = Math.cos(i * 1.7); b.sph(0.04, 0xffffff, Math.sin(i * 1.7) * 0.45, Math.cos(a) * 0.47 * Math.abs(c), Math.sin(a) * 0.47 * Math.abs(c), 1, 1, 1, { seg: 5 }); }
}, { center: true });
def('bonbon', 'low', 1.05, 1.0, 1.0, (b) => {
  // what the candyfloss clouds drop: a striped sweet in a twist of paper, rolling down the lane
  b.add(new THREE.SphereGeometry(0.44, 16, 12), (x, y, z) => (Math.floor((Math.atan2(z, y) + PI) / (PI / 4)) % 2 ? 0xff5a8a : 0xffffff), 0, 0, 0, 0, 0, 0, 1.0, 1, 1, { grad: 0.9 });
  for (const sx of [-1, 1]) b.cone(0.3, 0.3, 0xfff1a8, sx * 0.52, 0, 0, 0, 0, sx * PI / 2, { seg: 9 });
}, { center: true });
cloudDef('flosscloud', 0xff9fd0, 0xe772ae, (b) => {
  // candyfloss on a paper cone, with a few sweets ready to drop
  b.cone(0.3, 0.9, 0xfff1dc, 0, -0.85, 0, PI, 0, 0, { seg: 8 });
  for (let i = 0; i < 4; i++) b.sph(0.07, [0xffe24a, 0x5ac8ff, 0x7be07b, 0xffffff][i], -0.55 + i * 0.36, -0.6 - (i % 2) * 0.12, 0.25, 1, 1, 1, { seg: 6 });
});

// ---------- Spiral Bay ----------
const SWIRL_A = 0xff5fb0, SWIRL_B = 0x35d6c8, SWIRL_C = 0xffd23f, SWIRL_D = 0x7a4fe0, SWIRL_W = 0xfff8ee;
// Paint a geometry one flat colour per triangle, chosen from the middle of each triangle (in the geometry's own
// coordinates). Returns [geometry, colour function], ready to spread into Builder.add.
export function painted(geo, pickCol) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, cols = [];
  for (let i = 0; i < p.count; i += 3) cols.push(pickCol((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3));
  return [g, (x, y, z, i) => cols[(i / 3) | 0]];
}
// barber-pole stripes round the y axis: n bands (an even number) that climb "pitch" bands for every metre of height
export const helix = (c1, c2, n = 4, pitch = 2) => (x, y, z) => ((((Math.floor((Math.atan2(z, x) / (PI * 2)) * n + y * pitch) % 2) + 2) % 2) ? c1 : c2);
// A flat disc facing +z painted with a spiral: "arms" arms of each colour that wind "turns" times on the way out.
export function swirlDisc(R, c1, c2, arms = 1, turns = 2, seg = 40, rings = 9) {
  return painted(new THREE.RingGeometry(0.0001, R, seg, rings), (x, y) => ((((Math.floor(((Math.atan2(y, x) / (PI * 2)) + (Math.hypot(x, y) / R) * turns) * arms * 2) % 2) + 2) % 2) ? c1 : c2));
}
// A spiral wheel: a thick disc facing +z with a swirl on its face and a rim.
export function swirlWheelInto(b, R, x, y, z, c1, c2, rim = SWIRL_C, arms = 1, turns = 2, seg = 36) {
  b.cyl(R, R, R * 0.16, rim, x, y, z, PI / 2, 0, 0, { seg: Math.round(seg * 0.6) });
  b.add(...swirlDisc(R * 0.93, c1, c2, arms, turns, seg, 8), x, y, z + R * 0.085, 0, 0, 0, 1, 1, 1, { grad: 1 });
  b.sph(R * 0.11, rim, x, y, z + R * 0.09, 1, 1, 0.6, { seg: 8 });
}
// A coiled snail shell facing +z (the coil turns in the x-y plane); (x, y, z) is its middle and R its radius.
export function coilInto(b, x, y, z, R, c1, c2, n = 15) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = -0.6 - t * PI * 3.4, r = R * 0.74 * Math.pow(1 - t, 1.25) + 0.001, s = R * (0.3 - 0.21 * t);
    b.sph(s, i % 2 ? c1 : c2, x + Math.cos(a) * r, y + Math.sin(a) * r, z + t * R * 0.16, 1, 1, 1.15, { seg: 9 });
  }
}
// A tall pointed turret shell standing on its open end at (x, y, z): whorl upon whorl, narrowing to the tip.
export function turretInto(b, x, y, z, h, R, c1, c2, n = 26) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = i * 0.82, r = R * 0.3 * (1 - t), s = R * (0.74 - 0.64 * t);
    b.sph(s, i % 2 ? c1 : c2, x + Math.cos(a) * r, y + R * 0.4 + t * (h - R * 0.5), z + Math.sin(a) * r, 1, 0.82, 1, { seg: 9 });
  }
}
// A coil spring standing at (x, y, z).
export function springInto(b, x, y, z, r, h, turns, col, tube = 0.05) {
  for (let i = 0; i < turns; i++) b.tor(r, tube, col, x, y + (h * (i + 0.5)) / turns, z, PI / 2 + (i % 2 ? 0.14 : -0.14), 0, 0, { seg: 14, tseg: 5 });
}
def('snail', 'low', 1.35, 0.98, 1.0, (b) => {
  // a giant sea snail crossing the pier, in no hurry at all; side on, so its shell shows its spiral
  const S = 0xf2c49a;
  b.sph(0.5, S, 0, 0.14, 0, 1.25, 0.28, 0.62, { seg: 12 }).sph(0.2, S, 0.5, 0.36, 0, 0.9, 1.25, 0.9, { seg: 10 });
  coilInto(b, -0.08, 0.55, 0, 0.44, SWIRL_A, SWIRL_W);
  coilInto(b, -0.08, 0.55, 0, 0.44, SWIRL_A, SWIRL_W, 6); // thicken the outer whorl
  for (const sz of [-1, 1]) {
    b.cyl(0.022, 0.022, 0.3, S, 0.56, 0.68, sz * 0.09, 0, 0, -0.2, { seg: 5 }).sph(0.07, 0xffffff, 0.6, 0.85, sz * 0.09, 1, 1, 1, { seg: 7, grad: 1 }).sph(0.035, 0x1b1f24, 0.63, 0.86, sz * 0.09 + 0.045, 1, 1, 0.6, { seg: 5, grad: 1 });
  }
  b.tor(0.07, 0.016, 0x8a5a3a, 0.6, 0.36, 0.17, 0, 0, PI, { arc: PI, seg: 7 });
});
def('springLow', 'low', 1.25, 0.95, 1.25, (b) => {
  // a fat rainbow spring, the sort that walks down stairs, with a ball balanced on top
  b.cyl(0.56, 0.6, 0.07, SWIRL_D, 0, 0.035, 0, 0, 0, 0, { seg: 16 });
  [SWIRL_A, SWIRL_C, SWIRL_B, SWIRL_D, SWIRL_A].forEach((c, i) => b.tor(0.46 - i * 0.012, 0.06, c, i % 2 ? 0.03 : -0.03, 0.14 + i * 0.125, 0, PI / 2 + (i % 2 ? 0.12 : -0.12), 0, 0, { seg: 16, tseg: 6 }));
  b.add(new THREE.SphereGeometry(0.2, 12, 9), helix(SWIRL_W, SWIRL_A, 4, 6), 0, 0.76, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
});
def('ammonite', 'low', 1.3, 0.98, 0.6, (b) => {
  // a spiral shell as big as a cartwheel, propped up on a stand
  b.box(1.1, 0.08, 0.5, 0x6a4a8a, 0, 0.04, 0).box(0.12, 0.2, 0.4, 0x6a4a8a, -0.34, 0.14, 0).box(0.12, 0.2, 0.4, 0x6a4a8a, 0.34, 0.14, 0);
  swirlWheelInto(b, 0.44, 0, 0.53, 0.05, SWIRL_B, SWIRL_W, SWIRL_D, 1, 2.2, 32);
  b.add(...swirlDisc(0.41, SWIRL_B, SWIRL_W, 1, 2.2, 32, 8), 0, 0.53, 0.05 - 0.038, 0, PI, 0, 1, 1, 1, { grad: 1 });
});
def('whelk', 'low', 1.45, 0.9, 1.0, (b) => {
  // a pointed whelk shell lying on its side
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = i * 0.9, r = 0.16 * (1 - t), s = 0.4 - 0.33 * t;
    b.sph(s, i % 2 ? 0xffb86b : SWIRL_W, -0.36 + t * 1.02, 0.4 - t * 0.27 + Math.cos(a) * r, Math.sin(a) * r, 0.8, 1, 1, { seg: 9 });
  }
  b.sph(0.26, 0x8a4a5a, -0.56, 0.36, 0.1, 0.5, 1, 0.85, { seg: 8 });
});
def('hypnoWheel', 'tall', 1.9, 3.1, 0.9, (b) => {
  // a great hypnotic wheel on an easel
  for (const sx of [-1, 1]) b.box(0.1, 2.3, 0.1, SWIRL_D, sx * 0.62, 1.1, -0.12, 0.1, 0, sx * -0.2);
  b.box(0.1, 2.2, 0.1, SWIRL_D, 0, 1.05, -0.42, -0.32, 0, 0).box(1.5, 0.1, 0.12, SWIRL_D, 0, 0.5, -0.08);
  swirlWheelInto(b, 0.94, 0, 2.12, 0.06, SWIRL_A, SWIRL_W, SWIRL_C, 1, 2.6, 44);
  for (let i = 0; i < 12; i++) b.sph(0.055, i % 2 ? 0xffffff : SWIRL_B, Math.cos(i * 0.5236) * 0.94, 2.12 + Math.sin(i * 0.5236) * 0.94, 0.16, 1, 1, 1, { seg: 5, glow: true, grad: 1 });
});
def('twistPole', 'tall', 1.6, 3.2, 1.6, (b) => {
  // three twisty barber poles
  b.cyl(0.74, 0.8, 0.14, 0x4a3a8a, 0, 0.07, 0, 0, 0, 0, { seg: 16 });
  for (const [x, z, h, c1, r] of [[0, -0.1, 2.75, SWIRL_A, 0.2], [-0.42, 0.22, 1.9, SWIRL_B, 0.17], [0.44, 0.2, 2.3, SWIRL_D, 0.17]]) {
    b.add(...painted(new THREE.CylinderGeometry(r, r, h, 12, Math.round(h * 4)), helix(c1, SWIRL_W, 4, 2.6)), x, 0.14 + h / 2, z);
    b.cyl(r * 1.3, r * 1.3, 0.08, SWIRL_C, x, 0.16 + h, z, 0, 0, 0, { seg: 10 }).sph(r * 1.25, SWIRL_C, x, 0.16 + h + r * 1.2, z, 1, 1, 1, { seg: 10 });
  }
});
def('jackBox', 'tall', 1.5, 3.1, 1.5, (b) => {
  // a jack-in-the-box, sprung
  b.box(1.25, 1.1, 1.25, SWIRL_D, 0, 0.55, 0).box(1.3, 0.1, 1.3, SWIRL_C, 0, 1.12, 0).box(1.3, 0.1, 1.3, SWIRL_C, 0, 0.05, 0);
  b.add(...swirlDisc(0.42, SWIRL_C, SWIRL_D, 1, 1.8, 28, 6), 0, 0.58, 0.632, 0, 0, 0, 1, 1, 1, { grad: 1 });
  b.box(1.25, 0.08, 1.25, SWIRL_D, 0, 1.5, -0.86, -1.15, 0, 0);                                           // the lid, flung open
  b.cyl(0.04, 0.04, 0.3, 0xdfe6ee, 0.7, 0.6, 0, 0, 0, PI / 2, { seg: 6 }).sph(0.09, 0xe5383b, 0.9, 0.6, 0, 1, 1, 1, { seg: 7 });   // the crank
  springInto(b, 0, 1.15, 0, 0.26, 0.95, 5, 0xdfe6ee, 0.04);
  b.cone(0.42, 0.34, SWIRL_A, 0, 2.2, 0, PI, 0, 0, { seg: 10 });                                         // ruff
  b.sph(0.34, 0xffe2c8, 0, 2.52, 0, 1, 1, 1, { seg: 12 });
  for (const sx of [-1, 1]) b.sph(0.05, 0x1b1f24, sx * 0.12, 2.58, 0.31, 1, 1.2, 0.5, { seg: 6, grad: 1 }).sph(0.07, 0xff8fb0, sx * 0.2, 2.46, 0.28, 1, 0.7, 0.4, { seg: 6, grad: 1 });
  b.sph(0.07, 0xe5383b, 0, 2.5, 0.34, 1, 1, 1, { seg: 7 }).tor(0.12, 0.022, 0x8a2a2a, 0, 2.44, 0.3, 0, 0, PI, { arc: PI, seg: 8 });
  b.add(...painted(new THREE.ConeGeometry(0.3, 0.55, 10, 4), helix(SWIRL_B, SWIRL_W, 4, 5)), 0, 3.0, 0);
  b.sph(0.08, SWIRL_C, 0, 3.3, 0, 1, 1, 1, { seg: 6 });
});
def('shellTower', 'tall', 1.6, 3.2, 1.6, (b) => {
  // a turret shell as tall as a lamp post, with somebody peeping out of it
  b.sph(0.8, SAND, 0, 0, 0, 1, 0.14, 1, { seg: 10 });
  turretInto(b, 0, 0, 0, 3.1, 0.78, 0xffb86b, SWIRL_W);
  for (const sx of [-1, 1]) b.sph(0.1, 0xffffff, sx * 0.15, 0.62, 0.72, 1, 1.1, 0.6, { seg: 8, grad: 1 }).sph(0.05, 0x1b1f24, sx * 0.15, 0.61, 0.78, 1, 1, 0.5, { seg: 6, grad: 1 });
  b.tor(0.09, 0.02, 0x8a4a2a, 0, 0.42, 0.78, 0, 0, PI, { arc: PI, seg: 7 });
});
def('miniHelter', 'tall', 1.8, 3.25, 1.8, (b) => {
  // a toy helter-skelter
  b.cyl(0.86, 0.9, 0.12, 0x4a3a8a, 0, 0.06, 0, 0, 0, 0, { seg: 16 });
  b.add(...painted(new THREE.CylinderGeometry(0.42, 0.66, 2.3, 14, 9), helix(0xe5383b, SWIRL_W, 6, 1.3)), 0, 1.27, 0);
  b.cyl(0.56, 0.48, 0.12, SWIRL_D, 0, 2.48, 0, 0, 0, 0, { seg: 12 }).cone(0.6, 0.6, SWIRL_D, 0, 2.84, 0, 0, 0, 0, { seg: 12 }).sph(0.08, SWIRL_C, 0, 3.17, 0, 1, 1, 1, { seg: 6 });
  for (let i = 0; i < 44; i++) { const t = i / 44, a = t * PI * 5, y = 2.32 - t * 2.1, r = 0.42 + 0.24 * t + 0.15; b.box(0.3, 0.05, 0.3, SWIRL_C, Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, 0, { grad: 1 }).box(0.04, 0.14, 0.3, SWIRL_B, Math.cos(a) * (r + 0.15), y + 0.07, Math.sin(a) * (r + 0.15), 0, -a, 0, { grad: 1 }); }
});
def('spinTop', 'low', 1.15, 1.0, 1.15, (b) => {
  // a humming top that whirls from side to side across the pier
  b.cone(0.5, 0.42, SWIRL_D, 0, 0.21, 0, PI, 0, 0, { seg: 16 });
  b.add(...painted(new THREE.SphereGeometry(0.52, 16, 8), (x, y, z) => helix([SWIRL_A, SWIRL_C, SWIRL_B][Math.max(0, Math.min(2, Math.floor((y + 0.52) / 0.35)))], SWIRL_W, 4, 3)(x, y, z)), 0, 0.52, 0, 0, 0, 0, 1, 0.42, 1, { grad: 0.92 });
  b.cyl(0.07, 0.1, 0.26, SWIRL_C, 0, 0.84, 0, 0, 0, 0, { seg: 8 }).sph(0.1, 0xe5383b, 0, 1.0, 0, 1, 0.9, 1, { seg: 8 });
});
def('marble', 'low', 1.1, 1.0, 1.0, (b) => {
  // a giant glass marble with a twist of colour through it, rolling down the lane
  const band = [SWIRL_A, SWIRL_W, SWIRL_B, SWIRL_W, SWIRL_C, SWIRL_W];
  b.add(...painted(new THREE.SphereGeometry(0.5, 20, 12).rotateZ(PI / 2), (x, y, z) => band[((Math.floor((Math.atan2(z, y) / (PI * 2)) * 6 + x * 5) % 6) + 6) % 6]), 0, 0, 0, 0, 0, 0, 1, 1, 1, { grad: 0.9 });
}, { center: true });
def('whirl', 'low', 1.05, 1.0, 1.0, (b) => {
  // what the little twisters fling: a ball of spinning wind
  b.add(...painted(new THREE.SphereGeometry(0.4, 14, 9), helix(0xbff6f0, SWIRL_W, 4, 5)), 0, 0, 0, 0, 0, 0, 1, 1, 1, { grad: 0.92 });
  for (let i = 0; i < 3; i++) b.tor(0.5 - i * 0.08, 0.035, i % 2 ? SWIRL_W : SWIRL_B, 0, -0.2 + i * 0.2, 0, PI / 2 + 0.2 * (i - 1), 0, 0.15, { seg: 14, tseg: 5, arc: PI * 1.5 });
}, { center: true });
def('twister', 'deco', 2.2, 2.0, 1.8, (b) => {
  // a cheeky little whirlwind
  const cols = [0xdffbf7, 0x9fece4, 0xdffbf7, 0x7fdcd2, 0xdffbf7, 0x9fece4, 0x7fdcd2];
  for (let i = 0; i < 7; i++) { const t = i / 6, r = 1.05 - 0.86 * t; b.sph(r, cols[i], Math.sin(i * 1.1) * 0.12 * t * 2, 0.38 - t * 1.5, Math.cos(i * 1.3) * 0.06, 1, 0.3 / Math.max(r, 0.3), 0.8, { seg: 12 }); }
  b.tor(1.12, 0.045, 0xffffff, 0, 0.44, 0, PI / 2 + 0.12, 0, 0, { seg: 18, tseg: 5, arc: PI * 1.6 }).tor(0.7, 0.04, 0xffffff, 0.05, -0.3, 0, PI / 2 - 0.15, 0, 2, { seg: 14, tseg: 5, arc: PI * 1.5 });
  for (const sx of [-1, 1]) {
    b.sph(0.14, 0xffffff, sx * 0.26, 0.42, 0.74, 1, 1.15, 0.5, { seg: 8, grad: 1 }).sph(0.065, 0x15151f, sx * 0.24, 0.4, 0.8, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.box(0.28, 0.055, 0.04, 0x15151f, sx * 0.26, 0.62, 0.78, 0, 0, sx * -0.45);
    b.sph(0.1, 0xf5a9b0, sx * 0.46, 0.26, 0.68, 1, 0.7, 0.4, { seg: 6, grad: 1 });
  }
  b.tor(0.09, 0.03, 0x15151f, 0, 0.2, 0.8, 0, 0, 0, { seg: 9 });                                         // puckered up to blow
});

// ---------- Sky-High Mountain ----------
const BARK = 0x7a5236, BARK_D = 0x5f3f2a, WOOD_END = 0xe2c08a, STONE = 0x8d9399, STONE_D = 0x70767c, MOSS = 0x6fae52, PINE = 0x2f7d4f, PINE_D = 0x286c45;
// A log lying along x, centred on (x, y, z): bark, pale sawn ends with a ring, and a knot.
export function logInto(b, x, y, z, len, r, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.cyl(r, r, len, BARK, 0, 0, 0, 0, 0, PI / 2, { seg: 10 });
    for (const sx of [-1, 1]) b.cyl(r * 0.9, r * 0.9, 0.02, WOOD_END, sx * (len / 2 + 0.006), 0, 0, 0, 0, PI / 2, { seg: 10, grad: 1 }).cyl(r * 0.45, r * 0.45, 0.02, 0xcfa56e, sx * (len / 2 + 0.012), 0, 0, 0, 0, PI / 2, { seg: 8, grad: 1 });
    b.sph(r * 0.3, BARK_D, len * 0.18, r * 0.86, r * 0.3, 1, 0.5, 1, { seg: 6 });
  });
}
// A mountain goat facing +x, standing at (x, y, z); s is its size (about 1 high).
export function goatInto(b, x, y, z, s = 1, ry = 0) {
  b.at(x, y, z, ry, () => {
    const W = 0xf6f1e7, D = 0xd9d0bf, H = 0x4a4038;
    b.sph(0.3, W, 0, 0.56, 0, 1.45, 0.95, 0.9, { seg: 12 });
    for (const [lx, lz] of [[0.28, 0.13], [0.28, -0.13], [-0.28, 0.13], [-0.28, -0.13]]) b.cyl(0.045, 0.035, 0.36, D, lx, 0.2, lz, 0, 0, 0, { seg: 6 }).cyl(0.045, 0.05, 0.07, H, lx, 0.035, lz, 0, 0, 0, { seg: 6 });
    b.sph(0.17, W, 0.47, 0.84, 0, 1.15, 1, 0.9, { seg: 10 }).sph(0.09, D, 0.62, 0.78, 0, 1.1, 0.8, 0.9, { seg: 8 }).sph(0.03, 0x2a2420, 0.7, 0.8, 0, 1, 0.8, 1.4, { seg: 5 });
    b.cone(0.06, 0.22, W, 0.56, 0.62, 0, PI, 0, 0.2, { seg: 6 });                                         // beard
    for (const sz of [-1, 1]) {
      b.cone(0.035, 0.26, 0xb8a888, 0.4, 1.06, sz * 0.08, 0, 0, 0.5, { seg: 6 });                          // horns
      b.sph(0.06, D, 0.38, 0.9, sz * 0.16, 0.6, 0.4, 1.2, { seg: 6 });                                    // ears
      b.sph(0.032, 0x1b1f24, 0.57, 0.89, sz * 0.12, 1, 1.2, 0.6, { seg: 6, grad: 1 });
    }
    b.sph(0.07, W, -0.44, 0.7, 0, 1, 1, 1, { seg: 6 });                                                   // tail
    b.tor(0.13, 0.022, 0xd8342f, 0.38, 0.72, 0, 0, PI / 2, 0.5, { seg: 10 }).sph(0.05, 0xffd24a, 0.44, 0.58, 0, 1, 1.1, 1, { seg: 6 });   // collar and bell
  }, s);
}
// A pine tree standing at (x, y, z).
export function pineInto(b, x, y, z, h, snowy = false) {
  b.cyl(h * 0.04, h * 0.055, h * 0.24, BARK_D, x, y + h * 0.12, z, 0, 0, 0, { seg: 6 });
  for (let i = 0; i < 4; i++) {
    const r = h * 0.25 * (1 - i * 0.2), ty = y + h * (0.18 + i * 0.2), th = h * 0.36;
    b.cone(r, th, i % 2 ? PINE : PINE_D, x, ty + th / 2, z, 0, i * 0.6, 0, { seg: 8 });
    if (snowy) b.cone(r * 0.6, th * 0.6, 0xf4f8ff, x, ty + th * 0.71, z, 0, i * 0.6, 0, { seg: 8 });
  }
}
// A grey boulder sitting at (x, y, z), about 2 r across, with moss on top.
export function boulderInto(b, x, y, z, r, seed = 0, moss = true) {
  b.add(new THREE.DodecahedronGeometry(r), seed % 2 ? STONE : STONE_D, x, y + r * 0.62, z, seed * 0.9, seed * 1.7, 0.3, 1.15, 0.8, 1);
  b.add(new THREE.DodecahedronGeometry(r * 0.55), seed % 2 ? STONE_D : STONE, x + r * 0.75, y + r * 0.34, z + r * 0.3, seed, seed * 0.6, 0);
  if (moss) b.sph(r * 0.62, MOSS, x - r * 0.1, y + r * 1.02, z, 1, 0.22, 0.9, { seg: 7 });
}
def('log', 'low', 1.7, 0.86, 0.9, (b) => {
  logInto(b, 0, 0.38, 0, 1.56, 0.38, 0.06);
  b.cyl(0.07, 0.09, 0.4, BARK, -0.36, 0.78, -0.05, 0.2, 0, 0.5, { seg: 6 }).sph(0.14, 0x6fae52, -0.52, 0.95, -0.08, 1.2, 0.5, 0.9, { seg: 6 });
  for (const [x, c] of [[0.2, 0xe5383b], [0.42, 0xfff1dc]]) b.cyl(0.03, 0.035, 0.12, 0xfff6ee, x, 0.8, 0.12, 0, 0, 0, { seg: 5 }).sph(0.09, c, x, 0.88, 0.12, 1, 0.6, 1, { seg: 7 });   // toadstools
});
def('boulder', 'low', 1.45, 0.95, 1.2, (b) => {
  boulderInto(b, -0.1, 0, 0, 0.56, 1);
  for (let i = 0; i < 3; i++) b.sph(0.045, [0xffe24a, 0xffffff, 0xff8fd0][i], -0.35 + i * 0.22, 0.68 - Math.abs(i - 1) * 0.04, 0.2 + (i % 2) * 0.12, 1, 0.7, 1, { seg: 5 });   // alpine flowers in the moss
});
def('cheese', 'low', 1.35, 0.92, 1.35, (b) => {
  // two wheels of mountain cheese, one with a wedge out of it
  const Y = 0xf6c64a, R = 0xe2a02c;
  b.cyl(0.62, 0.62, 0.42, R, 0, 0.21, 0, 0, 0, 0, { seg: 18 }).cyl(0.58, 0.58, 0.02, Y, 0, 0.425, 0, 0, 0, 0, { seg: 18, grad: 1 });
  b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16, 1, false, 0.5, PI * 1.7), R, 0.05, 0.64, 0.02).add(new THREE.CylinderGeometry(0.47, 0.47, 0.02, 16, 1, false, 0.5, PI * 1.7), Y, 0.05, 0.845, 0.02, 0, 0, 0, 1, 1, 1, { grad: 1 });
  b.box(0.02, 0.38, 0.48, Y, 0.17, 0.64, 0.23, 0, 0.5 - PI / 2, 0, { grad: 1 }).box(0.02, 0.38, 0.48, Y, 0.07, 0.64, 0.26, 0, 0.5 + PI * 1.7 - PI / 2, 0, { grad: 1 });
  for (const [x, y, z] of [[0.3, 0.2, 0.55], [-0.2, 0.26, 0.59], [-0.45, 0.16, 0.43], [0.52, 0.28, 0.34]]) b.sph(0.06, 0xc98a1e, x, y, z, 1, 1, 0.4, { seg: 6 });
});
def('hay', 'low', 1.5, 0.98, 1.0, (b) => {
  // a round bale of mountain hay with a pitchfork in it
  b.add(...painted(new THREE.CylinderGeometry(0.49, 0.49, 1.36, 16, 1), (x, y, z) => (((Math.floor((Math.atan2(z, x) / (PI * 2)) * 16) % 2) + 2) % 2 ? 0xe8c860 : 0xd9b64a)), 0, 0.49, 0, 0, 0, PI / 2);
  for (const sx of [-1, 1]) b.add(...swirlDisc(0.47, 0xf2d878, 0xd9b64a, 1, 2.5, 20, 5), sx * 0.685, 0.49, 0, 0, sx * PI / 2, 0, 1, 1, 1, { grad: 1 });
  for (const x of [-0.3, 0.3]) b.tor(0.5, 0.02, 0xc0563a, x, 0.49, 0, 0, PI / 2, 0, { seg: 16, tseg: 4 });
});
def('pineOb', 'tall', 1.8, 3.4, 1.8, (b) => {
  b.sph(0.7, MOSS, 0, 0, 0, 1, 0.12, 1, { seg: 9 });
  pineInto(b, 0, 0, 0, 3.4);
  for (let i = 0; i < 5; i++) b.sph(0.06, 0x8a5a3a, Math.cos(i * 1.4) * (0.6 - i * 0.08), 0.95 + i * 0.42, Math.sin(i * 1.4) * (0.6 - i * 0.08) + 0.1, 0.8, 1.4, 0.8, { seg: 5 });   // cones
});
def('cairn', 'tall', 1.6, 3.0, 1.6, (b) => {
  // a walkers' cairn: stones balanced one on top of another, with a little flag
  let y = 0;
  [[0.78, 0.5], [0.66, 0.46], [0.56, 0.42], [0.46, 0.38], [0.36, 0.34], [0.27, 0.3], [0.19, 0.24]].forEach(([r, h], i) => {
    b.add(new THREE.DodecahedronGeometry(1), i % 2 ? STONE : STONE_D, Math.sin(i * 2.1) * 0.07, y + h * 0.5, Math.cos(i * 1.7) * 0.06, i * 1.3, i * 2.1, 0.2, r, h * 0.62, r * 0.92);
    y += h * 0.86;
  });
  b.cyl(0.02, 0.02, 0.6, BARK_D, 0, y + 0.25, 0, 0, 0, 0, { seg: 5 }).flat([[[0, y + 0.55, 0], [0, y + 0.3, 0], [0.42, y + 0.42, 0]]], 0xe5383b);
});
def('fingerpost', 'tall', 1.8, 3.2, 0.8, (b) => {
  // a signpost pointing every way at once
  b.cyl(0.36, 0.42, 0.16, STONE_D, 0, 0.08, 0, 0, 0, 0, { seg: 10 }).cyl(0.085, 0.1, 3.0, BARK, 0, 1.6, 0, 0, 0, 0, { seg: 8 }).cone(0.14, 0.2, 0xffd24a, 0, 3.2, 0, 0, 0, 0, { seg: 8 });
  [[2.75, 1, 0xe5383b], [2.3, -1, 0xffd24a], [1.85, 1, 0x35a7d6], [1.4, -1, 0x6fae52]].forEach(([y, sx, c], i) => {
    b.box(0.74, 0.3, 0.07, c, sx * 0.4, y, 0.06, 0, 0, sx * (i % 2 ? -0.06 : 0.08));
    b.flat([[[sx * 0.77, y + 0.2, 0.06], [sx * 0.77, y - 0.2, 0.06], [sx * 1.0, y, 0.06]]], c, 0, 0, 0, 0, 0, 0, { grad: 1 });
    b.box(0.5, 0.05, 0.02, 0xffffff, sx * 0.4, y, 0.105, 0, 0, sx * (i % 2 ? -0.06 : 0.08), { grad: 1 });
  });
});
def('woodShed', 'tall', 1.8, 2.95, 1.2, (b) => {
  // a store of firewood for the winter
  for (const sx of [-1, 1]) b.box(0.12, 2.3, 1.0, BARK, sx * 0.8, 1.15, 0);
  b.box(1.72, 2.3, 0.08, BARK_D, 0, 1.15, -0.46).box(1.72, 0.1, 1.0, BARK, 0, 0.05, 0);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 5 - (r % 2); c++) { const x = -0.6 + c * 0.3 + (r % 2) * 0.15, y = 0.27 + r * 0.33; b.cyl(0.16, 0.16, 0.9, (r + c) % 2 ? BARK : BARK_D, x, y, 0, PI / 2, 0, 0, { seg: 8 }).cyl(0.14, 0.14, 0.02, WOOD_END, x, y, 0.455, PI / 2, 0, 0, { seg: 8, grad: 1 }); }
  b.prism(2.1, 0.6, 1.3, 0xa33a2c, 0, 2.3, 0, 0).box(2.14, 0.08, 1.34, 0x8a2f24, 0, 2.3, 0);
});
def('goat', 'low', 1.2, 1.0, 1.0, (b) => goatInto(b, 0, 0, 0, 0.98));
def('pinecone', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the eagles drop: a giant pine cone that tumbles down the lane
  for (let i = 0; i < 6; i++) { const t = i / 5, r = 0.44 * Math.sin(0.5 + t * 2.3); for (let k = 0; k < 7; k++) { const a = k * 0.898 + i * 0.45; b.cone(0.15, 0.3, (i + k) % 2 ? 0x8a5a3a : 0x6f4528, -0.4 + t * 0.8, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, a + PI / 2, 0, -0.9, { seg: 5 }); } }
  b.sph(0.3, 0x5f3f2a, 0, 0, 0, 1.45, 1, 1, { seg: 8 });
}, { center: true });
const EAGLE_B = 0x6b4a2e, EAGLE_D = 0x4f3520;
def('eagle', 'deco', 3.0, 1.0, 1.7, (b) => {
  // a grumpy eagle with a pine cone in its claws
  b.sph(0.4, EAGLE_B, 0, 0, 0, 0.95, 0.85, 1.5, { seg: 14 });
  b.sph(0.27, 0xfaf7ef, 0, 0.2, 0.5, 1, 1, 1, { seg: 12 });
  b.cone(0.1, 0.3, 0xffb300, 0, 0.14, 0.82, PI / 2 + 0.25, 0, 0, { seg: 8 }).cone(0.06, 0.14, 0xffb300, 0, 0.03, 0.92, PI, 0, 0, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.sph(0.07, 0xffe27a, sx * 0.13, 0.27, 0.71, 1, 1, 0.5, { seg: 8, grad: 1 }).sph(0.035, 0x1b1f24, sx * 0.13, 0.26, 0.75, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.box(0.2, 0.05, 0.04, EAGLE_D, sx * 0.13, 0.38, 0.72, 0, 0, sx * -0.5);                              // fierce brows
    b.cap(0.035, 0.12, 0xffb300, sx * 0.12, -0.36, 0.1, 0.4, 0, 0).sph(0.08, 0xffb300, sx * 0.12, -0.46, 0.16, 1, 0.5, 1.3, { seg: 6 });
  }
  for (const k of [-1, 0, 1]) b.sph(0.24, k ? EAGLE_D : 0xfaf7ef, k * 0.15, 0.0, -0.7 + Math.abs(k) * 0.05, 0.5, 0.12, 1.15, { seg: 8 });   // tail
}, {
  wings: (b, sx) => {
    b.sph(0.55, EAGLE_B, sx * 0.66, 0, 0, 1.3, 0.09, 0.7, { seg: 12 });
    for (let i = 0; i < 4; i++) b.sph(0.2, EAGLE_D, sx * (1.05 + i * 0.12), 0.005, 0.3 - i * 0.24, 1.3, 0.1, 0.5, { seg: 6 });   // fingered wing tips
  }, wingAt: [0.2, 0.12, 0.02],
});

// ---------- Rollercoaster World ----------
const RC_RED = 0xe5383b, RC_YEL = 0xffc928, RC_BLUE = 0x2f7fe0, RC_WHITE = 0xf4f6fa, RC_NAVY = 0x22365c, RC_TEAL = 0x18a7a0, RC_PINK = 0xff6fae;
// A rollercoaster car facing +z, standing at (x, y, z): a scooped body with a grinning front, headlamps, a lap bar and wheels.
export function carInto(b, x, y, z, col, s = 1, ry = 0, riders = false) {
  b.at(x, y, z, ry, () => {
    b.box(1.15, 0.5, 1.5, col, 0, 0.47, 0).box(1.15, 0.32, 0.14, col, 0, 0.86, -0.68).box(1.0, 0.3, 0.5, col, 0, 0.74, 0.56, -0.5, 0, 0);
    b.box(1.19, 0.1, 1.54, RC_YEL, 0, 0.28, 0).box(0.9, 0.06, 0.06, 0xdfe6ee, 0, 0.92, 0.1);
    for (const sx of [-1, 1]) {
      b.sph(0.11, 0xfff6c8, sx * 0.36, 0.56, 0.76, 1, 1, 0.5, { seg: 8, glow: true, grad: 1 });
      for (const sz of [-1, 1]) b.cyl(0.16, 0.16, 0.1, 0x2a2f36, sx * 0.6, 0.16, sz * 0.48, 0, 0, PI / 2, { seg: 10 }).cyl(0.07, 0.07, 0.12, 0xdfe6ee, sx * 0.6, 0.16, sz * 0.48, 0, 0, PI / 2, { seg: 6 });
    }
    b.tor(0.2, 0.035, 0xffffff, 0, 0.5, 0.762, 0, 0, PI, { arc: PI, seg: 9 });                              // a grin on the front
    if (riders) for (const sx of [-1, 1]) b.sph(0.17, 0xf2c49a, sx * 0.27, 1.12, -0.1, 1, 1, 1, { seg: 7 }).cap(0.14, 0.12, sx > 0 ? RC_TEAL : RC_PINK, sx * 0.27, 0.86, -0.1).cyl(0.04, 0.04, 0.36, 0xf2c49a, sx * 0.42, 1.3, -0.08, 0, 0, sx * -0.5, { seg: 5 });
  }, s);
}
// A bunch of balloons on strings, tied at (x, y, z).
export function balloonsInto(b, x, y, z, n = 5, h = 1.6, r = 0.3) {
  const cols = [RC_RED, RC_YEL, RC_BLUE, RC_PINK, 0x6fd06a, 0xb07bff];
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, dx = Math.cos(a) * r * (0.9 + (i % 3) * 0.5), dz = Math.sin(a) * r * 0.9, hy = h + (i % 3) * r * 0.9, L = Math.hypot(dx, hy, dz);
    b.cyl(0.008, 0.008, L, 0xffffff, x + dx / 2, y + hy / 2, z + dz / 2, Math.atan2(dz, hy), 0, -Math.atan2(dx, hy), { seg: 3 });
    b.sph(r, cols[i % 6], x + dx, y + hy + r * 0.9, z + dz, 1, 1.18, 1, { seg: 9 }).cone(r * 0.2, r * 0.22, cols[i % 6], x + dx, y + hy - r * 0.15, z + dz, 0, 0, 0, { seg: 5 });
  }
}
def('coasterCar', 'low', 1.4, 0.98, 1.5, (b) => carInto(b, 0, 0, 0, RC_RED, 1.0, 0.12));
def('turnstile', 'low', 1.7, 1.0, 0.8, (b) => {
  for (const sx of [-1, 1]) b.box(0.3, 0.96, 0.6, RC_BLUE, sx * 0.68, 0.48, 0).box(0.34, 0.08, 0.64, RC_YEL, sx * 0.68, 0.98, 0).sph(0.07, 0x6fd06a, sx * 0.68, 0.8, 0.31, 1, 1, 0.5, { seg: 6, glow: true, grad: 1 });
  b.cyl(0.09, 0.09, 0.3, 0xdfe6ee, 0, 0.62, 0, 0, 0, PI / 2, { seg: 8 });
  for (let i = 0; i < 3; i++) b.cyl(0.035, 0.035, 0.62, 0xdfe6ee, 0, 0.62 + Math.cos(i * 2.094) * 0.3, Math.sin(i * 2.094) * 0.3, i * 2.094, 0, 0, { seg: 6 }).cyl(0.035, 0.035, 0.9, 0xdfe6ee, 0, 0.62 + Math.cos(i * 2.094) * 0.58, Math.sin(i * 2.094) * 0.58 * 0.6, 0, 0, PI / 2, { seg: 6 });
});
def('duckTub', 'low', 1.5, 0.92, 1.5, (b) => {
  // hook-a-duck
  b.cyl(0.72, 0.62, 0.62, RC_RED, 0, 0.31, 0, 0, 0, 0, { seg: 16 }).cyl(0.74, 0.74, 0.07, RC_YEL, 0, 0.63, 0, 0, 0, 0, { seg: 16 }).cyl(0.66, 0.66, 0.02, 0x6fd0f0, 0, 0.66, 0, 0, 0, 0, { seg: 16, grad: 1 });
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4, x = Math.cos(a) * 0.36, z = Math.sin(a) * 0.36; b.sph(0.13, 0xffd23f, x, 0.74, z, 1.2, 0.9, 1, { seg: 8 }).sph(0.085, 0xffd23f, x + 0.1, 0.87, z, 1, 1, 1, { seg: 7 }).cone(0.04, 0.09, 0xff8a3c, x + 0.2, 0.86, z, 0, 0, -PI / 2, { seg: 5 }); }
});
def('striker', 'tall', 1.5, 3.3, 1.0, (b) => {
  // test your strength: hit the pad and ring the bell
  b.box(1.3, 0.2, 0.9, RC_NAVY, 0, 0.1, 0).box(0.5, 0.16, 0.4, RC_RED, 0.3, 0.28, 0.2);
  b.add(new THREE.BoxGeometry(0.5, 2.6, 0.12, 1, 10, 1), (x, y) => [0x6fd06a, 0x6fd06a, RC_YEL, RC_YEL, 0xff8a3c, RC_RED][Math.max(0, Math.min(5, Math.floor((y - 0.2) / 0.44)))], -0.2, 1.5, -0.1, 0, 0, 0, 1, 1, 1, { grad: 1 });
  b.box(0.62, 2.72, 0.08, RC_WHITE, -0.2, 1.5, -0.17).box(0.06, 2.5, 0.04, 0x2a2f36, -0.2, 1.5, -0.03);
  b.sph(0.22, RC_YEL, -0.2, 3.0, -0.1, 1, 0.8, 1, { seg: 10 }).cyl(0.03, 0.03, 0.12, 0x2a2f36, -0.2, 2.82, -0.1, 0, 0, 0, { seg: 5 }).sph(0.07, RC_RED, -0.2, 1.9, 0.0, 1, 1, 1, { seg: 6 });
  b.cyl(0.035, 0.035, 0.9, 0x8a5a36, 0.42, 0.72, 0.2, 0, 0, -0.35, { seg: 6 }).box(0.34, 0.2, 0.2, 0x5a5f66, 0.58, 1.14, 0.2, 0, 0, -0.35);   // the mallet
});
def('balloonCart', 'tall', 1.6, 3.3, 1.2, (b) => {
  b.box(1.2, 0.6, 0.8, RC_PINK, 0, 0.7, 0).box(1.28, 0.08, 0.88, RC_WHITE, 0, 1.03, 0);
  for (const sx of [-1, 1]) b.cyl(0.3, 0.3, 0.07, 0x2a2f36, sx * 0.64, 0.3, 0, 0, 0, PI / 2, { seg: 12 }).cyl(0.1, 0.1, 0.09, RC_YEL, sx * 0.64, 0.3, 0, 0, 0, PI / 2, { seg: 8 });
  b.cyl(0.03, 0.03, 0.7, 0xdfe6ee, 0, 0.5, 0.62, 1.1, 0, 0, { seg: 5 });
  balloonsInto(b, 0, 1.05, 0, 7, 1.3, 0.34);
});
def('ticketBooth', 'tall', 1.7, 3.2, 1.5, (b) => {
  b.add(...painted(new THREE.BoxGeometry(1.4, 2.2, 1.3, 8, 1, 1), (x) => (((Math.floor((x + 0.7) / 0.175) % 2) + 2) % 2 ? RC_RED : RC_WHITE)), 0, 1.1, 0);
  b.box(0.9, 0.7, 0.06, 0x8fd8ff, 0, 1.5, 0.66, 0, 0, 0, { grad: 1 }).box(1.1, 0.1, 0.3, RC_YEL, 0, 1.1, 0.76).box(1.0, 0.3, 0.06, RC_NAVY, 0, 2.0, 0.67);
  b.add(new THREE.ConeGeometry(1.2, 0.9, 4, 1), RC_BLUE, 0, 2.65, 0, 0, PI / 4, 0).sph(0.12, RC_YEL, 0, 3.14, 0, 1, 1, 1, { seg: 7 });
  b.sph(0.2, 0xf2c49a, 0, 1.52, 0.5, 1, 1, 1, { seg: 8 }).sph(0.22, RC_RED, 0, 1.64, 0.48, 1.05, 0.5, 1.05, { seg: 8 });     // the ticket seller in a cap
});
def('carStack', 'tall', 1.6, 3.0, 1.6, (b) => {
  // spare cars waiting their turn, one on top of another
  carInto(b, 0, 0, 0, RC_BLUE, 1.0, 0.1); carInto(b, 0.03, 0.98, 0, RC_YEL, 0.98, -0.2); carInto(b, -0.02, 1.94, 0, RC_RED, 0.96, 0.25);
});
def('bumperCar', 'low', 1.3, 1.0, 1.5, (b) => {
  // a dodgem with nobody steering; it faces +x and slides from side to side
  b.sph(0.72, 0x2a2f36, 0, 0.26, 0, 1.08, 0.3, 0.86, { seg: 16 });                                         // rubber bumper
  b.sph(0.62, RC_TEAL, 0, 0.42, 0, 1.05, 0.55, 0.82, { seg: 14 }).box(0.5, 0.36, 0.86, 0x1b1f24, -0.12, 0.66, 0).box(0.14, 0.5, 0.8, RC_TEAL, -0.5, 0.74, 0);
  b.cyl(0.03, 0.03, 0.34, 0xdfe6ee, 0.2, 0.84, 0, 0, 0, -0.6, { seg: 5 }).tor(0.13, 0.03, 0x1b1f24, 0.1, 0.96, 0, 0, PI / 2, -0.6, { seg: 10 });
  for (const sz of [-1, 1]) b.sph(0.09, 0xfff6c8, 0.62, 0.5, sz * 0.28, 0.6, 1, 1, { seg: 7, glow: true, grad: 1 });
  b.box(0.5, 0.05, 0.9, RC_YEL, 0.3, 0.63, 0, 0, 0, -0.3);
});
def('runawayCar', 'low', 1.25, 0.95, 1.5, (b) => carInto(b, 0, 0, 0, RC_YEL, 0.9, 0, true));
def('waterBalloon', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the balloon bandits drop: a wobbly balloon full of water
  b.sph(0.44, 0x4fb6f0, 0, 0, 0, 1.05, 0.92, 1.05, { seg: 14 }).sph(0.16, 0xdff4ff, -0.16, 0.2, 0.2, 1, 0.8, 0.5, { seg: 6 }).cone(0.09, 0.14, 0x4fb6f0, 0, 0.46, 0, 0, 0, 0, { seg: 6 });
}, { center: true });
def('bandit', 'deco', 2.2, 2.4, 1.6, (b) => {
  // a cheeky monkey in a basket under a bunch of balloons
  const M = 0x8a5a36, F = 0xf2c9a0;
  b.cyl(0.5, 0.4, 0.5, 0xc99a5a, 0, -0.55, 0, 0, 0, 0, { seg: 12 }).tor(0.5, 0.05, 0x8a5a36, 0, -0.3, 0, PI / 2, 0, 0, { seg: 12 });
  b.sph(0.3, M, 0, 0.05, 0.05, 1, 1, 0.95, { seg: 12 }).sph(0.2, F, 0, 0.0, 0.24, 1.1, 0.95, 0.6, { seg: 10 });
  for (const sx of [-1, 1]) {
    b.sph(0.12, M, sx * 0.31, 0.1, 0.02, 0.5, 1, 1, { seg: 7 }).sph(0.07, F, sx * 0.33, 0.1, 0.06, 0.4, 0.9, 0.8, { seg: 6 });
    b.sph(0.055, 0xffffff, sx * 0.1, 0.1, 0.33, 1, 1.1, 0.5, { seg: 6, grad: 1 }).sph(0.03, 0x1b1f24, sx * 0.1, 0.09, 0.36, 1, 1, 0.5, { seg: 5, grad: 1 });
    b.box(0.14, 0.035, 0.03, 0x3a2416, sx * 0.1, 0.19, 0.34, 0, 0, sx * -0.4);
    b.cap(0.06, 0.2, M, sx * 0.42, -0.2, 0.12, 0, 0, sx * 0.5, { seg: 6 });
  }
  b.tor(0.08, 0.02, 0x3a2416, 0, -0.08, 0.34, 0, 0, PI, { arc: PI, seg: 7 });
  b.sph(0.2, 0x4fb6f0, 0.5, -0.12, 0.2, 1, 0.92, 1, { seg: 9 });                                          // a water balloon ready to drop
  balloonsInto(b, 0, -0.25, 0, 6, 1.0, 0.36);
});

// ---------- the Glass Tunnel ----------
def('clam', 'low', 1.5, 0.95, 1.2, (b) => {
  // a giant clam showing off its pearl
  const S = 0xc7a8e6, SD = 0x9a7ac8, rib = (x) => (Math.sin(x * 15) > 0 ? S : SD);
  b.add(new THREE.SphereGeometry(0.72, 16, 8, 0, PI * 2, 0, PI / 2), rib, 0, 0.38, 0, PI, 0, 0, 1, 0.52, 0.8);
  b.add(new THREE.SphereGeometry(0.72, 16, 8, 0, PI * 2, 0, PI / 2), rib, 0, 0.42, -0.3, -0.8, 0, 0, 1, 0.5, 0.8);
  b.sph(0.6, 0x4fd0c8, 0, 0.36, 0, 1, 0.16, 0.76, { seg: 12 }).sph(0.2, 0xfff6fb, 0, 0.52, 0.12, 1, 1, 1, { seg: 10, glow: true, grad: 1 });
});
def('wetSign', 'low', 1.3, 1.0, 0.9, (b) => {
  // a "mind the puddle" sign: the tunnel has sprung a tiny leak
  b.box(0.72, 1.02, 0.05, 0xffd23f, 0, 0.48, 0.17, -0.3, 0, 0).box(0.72, 1.02, 0.05, 0xf2b90f, 0, 0.48, -0.17, 0.3, 0, 0);
  b.sph(0.13, 0x2f7fe0, 0, 0.5, 0.24, 1, 1.25, 0.3, { seg: 8 }).cone(0.1, 0.2, 0x2f7fe0, 0, 0.7, 0.19, -0.3, 0, 0, { seg: 8 });
  b.cyl(0.62, 0.62, 0.02, 0x9fe0f6, 0.15, 0.012, 0.25, 0, 0, 0, { seg: 14, grad: 1 }).cyl(0.3, 0.3, 0.02, 0x9fe0f6, -0.4, 0.012, 0.1, 0, 0, 0, { seg: 10, grad: 1 });
});
def('bucket', 'low', 1.3, 1.0, 0.9, (b) => {
  // a mop and bucket
  b.cyl(0.36, 0.28, 0.52, 0x2f7fe0, -0.25, 0.26, 0, 0, 0, 0, { seg: 12 }).cyl(0.38, 0.38, 0.05, 0xdfe6ee, -0.25, 0.53, 0, 0, 0, 0, { seg: 12 }).cyl(0.32, 0.32, 0.02, 0x9fe0f6, -0.25, 0.56, 0, 0, 0, 0, { seg: 12, grad: 1 });
  b.tor(0.36, 0.02, 0xdfe6ee, -0.25, 0.55, 0, 0, PI / 2, 0, { arc: PI, seg: 10 });
  b.cyl(0.03, 0.03, 1.1, 0xb98a5a, 0.36, 0.56, 0, 0, 0, -0.32, { seg: 6 });
  for (let i = 0; i < 6; i++) b.cap(0.05, 0.22, 0xf2f2ea, 0.5 + Math.cos(i * 1.05) * 0.09, 0.1, Math.sin(i * 1.05) * 0.09, Math.sin(i * 1.05) * 0.5, 0, -Math.cos(i * 1.05) * 0.5 - 0.3, { seg: 5 });
});
def('tanks', 'tall', 1.5, 2.3, 1.0, (b) => {
  // a rack of divers' air tanks
  b.box(1.5, 0.22, 0.9, 0x4a626e, 0, 0.11, 0).box(1.5, 2.2, 0.08, 0x6f8a96, 0, 1.1, -0.38).box(1.5, 0.1, 0.5, 0x4a626e, 0, 2.25, -0.15);
  [0xffd23f, 0xff8a3c, 0x2fb0c8].forEach((c, i) => {
    const x = -0.46 + i * 0.46;
    b.cyl(0.2, 0.2, 1.4, c, x, 0.95, 0, 0, 0, 0, { seg: 12 }).sph(0.2, c, x, 1.65, 0, 1, 0.8, 1, { seg: 12 }).cyl(0.06, 0.06, 0.2, 0xdfe6ee, x, 1.88, 0, 0, 0, 0, { seg: 6 }).box(0.2, 0.07, 0.07, 0x2a2f36, x, 1.98, 0);
    b.box(0.44, 0.07, 0.03, 0x2a2f36, x, 1.2, 0.2).box(0.44, 0.07, 0.03, 0x2a2f36, x, 0.6, 0.2);
  });
});
def('divingSuit', 'tall', 1.3, 2.6, 1.0, (b) => {
  // an old brass-helmet diving suit on show
  const CV = 0xd9c9a0, BR = 0xc98a3c, BRD = 0x9a6424;
  b.box(1.2, 0.26, 0.9, 0x55707c, 0, 0.13, 0);
  for (const sx of [-1, 1]) {
    b.box(0.3, 0.2, 0.46, 0x4a3a2a, sx * 0.24, 0.36, 0.06).cyl(0.16, 0.18, 0.8, CV, sx * 0.24, 0.84, 0, 0, 0, 0, { seg: 8 });
    b.cap(0.13, 0.62, CV, sx * 0.56, 1.55, 0, 0, 0, sx * 0.22, { seg: 8 }).sph(0.15, 0x4a3a2a, sx * 0.66, 1.16, 0.02, 1, 1, 1, { seg: 7 });
  }
  b.cap(0.36, 0.42, CV, 0, 1.6, 0, 0, 0, 0, { seg: 12 }).box(0.6, 0.12, 0.5, 0x4a3a2a, 0, 1.24, 0).cyl(0.4, 0.46, 0.2, BR, 0, 1.98, 0, 0, 0, 0, { seg: 12 });
  b.sph(0.42, BR, 0, 2.3, 0, 1, 1, 1, { seg: 14 }).cyl(0.24, 0.24, 0.08, BRD, 0, 2.3, 0.4, PI / 2, 0, 0, { seg: 12 }).cyl(0.18, 0.18, 0.1, 0x2f6f9a, 0, 2.3, 0.41, PI / 2, 0, 0, { seg: 12, grad: 1 });
  for (const sx of [-1, 1]) b.cyl(0.13, 0.13, 0.06, BRD, sx * 0.4, 2.32, 0.08, 0, 0, PI / 2, { seg: 8 }).cyl(0.09, 0.09, 0.08, 0x2f6f9a, sx * 0.41, 2.32, 0.08, 0, 0, PI / 2, { seg: 8, grad: 1 });
  b.sph(0.07, BRD, 0, 2.74, 0, 1, 1, 1, { seg: 6 });
});
def('miniSub', 'tall', 1.9, 2.4, 2.6, (b) => {
  // a little yellow submarine on its stand
  const Y = 0xffd23f, YD = 0xe0a800;
  for (const z of [-0.7, 0.7]) b.box(1.5, 0.14, 0.2, 0x4a626e, 0, 0.07, z).box(0.14, 0.62, 0.14, 0x4a626e, -0.5, 0.36, z).box(0.14, 0.62, 0.14, 0x4a626e, 0.5, 0.36, z);
  b.sph(1, Y, 0, 1.35, 0, 0.8, 0.74, 1.25, { seg: 16 }).box(1.7, 0.1, 0.5, YD, 0, 1.3, -0.3).cyl(0.36, 0.42, 0.5, YD, 0, 2.1, -0.1, 0, 0, 0, { seg: 12 }).cyl(0.04, 0.04, 0.4, 0x4a626e, 0.1, 2.45, -0.1, 0, 0, 0, { seg: 5 }).box(0.2, 0.08, 0.08, 0x4a626e, 0.1, 2.62, -0.03);
  b.cyl(0.42, 0.42, 0.1, 0x4a626e, 0, 1.4, 1.08, PI / 2, 0, 0, { seg: 14 }).sph(0.36, 0x9fe0f6, 0, 1.4, 1.02, 1, 1, 0.5, { seg: 12, grad: 1 });
  for (const sx of [-1, 1]) b.cyl(0.17, 0.17, 0.08, 0x4a626e, sx * 0.76, 1.45, 0.25, 0, 0, PI / 2, { seg: 10 }).cyl(0.12, 0.12, 0.1, 0x9fe0f6, sx * 0.77, 1.45, 0.25, 0, 0, PI / 2, { seg: 10, grad: 1 });
  b.cyl(0.1, 0.16, 0.3, YD, 0, 1.35, -1.3, PI / 2, 0, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) b.box(0.12, 0.62, 0.04, 0xff5a4a, 0, 1.35, -1.46, 0, 0, i * 2.094);
});
def('fishTank', 'tall', 1.6, 2.4, 1.1, (b) => {
  // a tank of tropical fish on a cupboard
  b.box(1.5, 0.95, 1.0, 0x6a4a34, 0, 0.475, 0).box(1.56, 0.08, 1.06, 0x4a3324, 0, 0.98, 0).box(0.05, 0.6, 0.02, 0x4a3324, 0, 0.5, 0.51);
  b.box(1.44, 1.2, 0.94, 0x58c4e6, 0, 1.62, 0, 0, 0, 0, 0, 0, 0, { grad: 0.75 }).box(1.56, 0.12, 1.06, 0x2a3440, 0, 2.28, 0).box(1.5, 0.1, 1.0, 0xe9dcb0, 0, 1.07, 0);
  for (const sx of [-1, 1]) b.box(0.06, 1.2, 0.06, 0x2a3440, sx * 0.73, 1.62, 0.48);
  [[-0.4, 1.9, 0xff8a2a], [0.3, 1.55, 0xffd23f], [-0.1, 1.4, 0xff6fae], [0.45, 2.0, 0x9a6fe0]].forEach(([x, y, c], i) => {
    const d = i % 2 ? 1 : -1;
    b.sph(0.14, c, x, y, 0.48, 1.4, 0.9, 0.3, { seg: 8, grad: 1 }).flat([[[-0.16 * d, 0, 0], [-0.34 * d, 0.13, 0], [-0.34 * d, -0.13, 0]]], c, x, y, 0.5).sph(0.03, 0x1b1f24, x + 0.11 * d, y + 0.03, 0.53, 1, 1, 0.5, { seg: 5, grad: 1 });
  });
  for (let i = 0; i < 4; i++) b.box(0.07, 0.5 + (i % 2) * 0.2, 0.02, 0x3fa85a, -0.55 + i * 0.36, 1.37 + (i % 2) * 0.1, 0.48, 0, 0, (i % 2 ? 1 : -1) * 0.15);
});
def('puffer', 'low', 1.1, 1.0, 1.0, (b) => {
  // a puffed-up puffer fish, rolling along like a ball
  b.add(new THREE.SphereGeometry(0.44, 16, 12), (x, y) => (y < -0.12 ? 0xfff6e0 : 0xf2c94c), 0, 0, 0);
  for (let i = 0; i < 26; i++) {
    const u = (i + 0.5) / 26, ph = Math.acos(1 - 2 * u), th = i * 2.4, x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th);
    if (z > 0.55 && Math.abs(y) < 0.5) continue;
    b.cone(0.05, 0.16, 0xd9a520, x * 0.5, y * 0.5, z * 0.5, Math.atan2(z, Math.max(1e-3, Math.hypot(x, y))) * (y >= 0 ? 1 : -1), 0, -Math.atan2(x, y), { seg: 4 });
  }
  for (const sx of [-1, 1]) b.sph(0.12, 0xffffff, sx * 0.18, 0.12, 0.38, 1, 1, 0.6, { seg: 8, grad: 1 }).sph(0.06, 0x1b1f24, sx * 0.18, 0.12, 0.44, 1, 1, 0.5, { seg: 6, grad: 1 });
  b.sph(0.07, 0xff8a6a, 0, -0.08, 0.43, 1, 0.8, 0.5, { seg: 7, grad: 1 });
}, { center: true });
def('inkBlob', 'low', 1.0, 1.0, 1.0, (b) => {
  // a wobbly blob of ink
  b.sph(0.45, 0x3a2a6a, 0, 0, 0, 1, 0.94, 1, { seg: 12, grad: 0.6 }).sph(0.14, 0xb9a8ff, -0.14, 0.18, 0.3, 1, 0.8, 0.5, { seg: 7, grad: 1 });
  for (let i = 0; i < 6; i++) { const a = i * 1.05; b.sph(0.12, 0x2a1d52, Math.cos(a) * 0.42, Math.sin(i * 2.3) * 0.28, Math.sin(a) * 0.42, 1, 1, 1, { seg: 6, grad: 0.7 }); }
}, { center: true });
def('inkOcto', 'deco', 1.8, 1.7, 1.2, (b) => {
  // a cheeky little octopus with a propeller hat, who squirts ink
  const O = 0x9a6fe0, OD = 0x7a4fc0;
  b.sph(0.42, O, 0, 0.1, 0, 1, 1.08, 1, { seg: 14 });
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.5, x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3; b.cap(0.07, 0.42, i % 2 ? O : OD, x * 1.1, -0.42, z * 1.1, z * 0.5, 0, -x * 0.5, { seg: 6 }).sph(0.09, OD, x * 1.35, -0.7, z * 1.35, 1, 1, 1, { seg: 6 }); }
  for (const sx of [-1, 1]) {
    b.sph(0.13, 0xffffff, sx * 0.17, 0.2, 0.34, 1, 1.1, 0.6, { seg: 8, grad: 1 }).sph(0.065, 0x1b1f24, sx * 0.17, 0.19, 0.41, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.box(0.2, 0.04, 0.03, 0x3a2a6a, sx * 0.17, 0.37, 0.38, 0, 0, sx * -0.35);
    b.box(0.5, 0.03, 0.14, 0xffd23f, sx * 0.27, 0.86, 0, 0, 0, sx * 0.12);
  }
  b.tor(0.09, 0.022, 0x3a2a6a, 0, 0.02, 0.4, 0.1, 0, PI, { arc: PI, seg: 7 });
  b.dome(0.26, 0xff5a4a, 0, 0.44, 0, 0, 0, 0, 1, 0.7, 1, { seg: 10 }).cyl(0.025, 0.025, 0.24, 0x2a2f36, 0, 0.74, 0, 0, 0, 0, { seg: 5 }).sph(0.05, 0xffd23f, 0, 0.87, 0, 1, 1, 1, { seg: 6 });
});

// ---------- Chocolate Coast ----------
export const MILK = 0x7a4526, MILK_L = 0x93592f, DARKC = 0x4a2412, WHITEC = 0xfff0d8, FOIL = 0xf2c230, CARAMEL = 0xd9902f, BISC = 0xe0b070, WRAP = 0xd2302c;
// A strawberry dipped in chocolate, point down; (x, y, z) is its middle, s its size.
export function dippedInto(b, x, y, z, s = 1, choc = DARKC) {
  b.cone(0.3 * s, 0.62 * s, 0xe5283b, x, y, z, PI, 0, 0, { seg: 10 }).cone(0.31 * s, 0.4 * s, choc, x, y - 0.12 * s, z, PI, 0, 0, { seg: 10 });
  for (let i = 0; i < 5; i++) b.cone(0.07 * s, 0.22 * s, 0x3fa85a, x + Math.cos(i * 1.26) * 0.14 * s, y + 0.33 * s, z + Math.sin(i * 1.26) * 0.14 * s, Math.sin(i * 1.26) * 0.9, 0, -Math.cos(i * 1.26) * 0.9, { seg: 4 });
}
// A sandwich biscuit lying flat: two dark biscuits with cream between; (x, y, z) is the middle of its base.
export function sandwichInto(b, r, x, y, z) {
  b.cyl(r, r, r * 0.22, DARKC, x, y + r * 0.11, z, 0, 0, 0, { seg: 16 }).cyl(r * 0.93, r * 0.93, r * 0.16, WHITEC, x, y + r * 0.3, z, 0, 0, 0, { seg: 16 }).cyl(r, r, r * 0.22, DARKC, x, y + r * 0.49, z, 0, 0, 0, { seg: 16 });
  for (let i = 0; i < 8; i++) b.sph(r * 0.07, MILK, x + Math.cos(i * 0.785) * r * 0.72, y + r * 0.6, z + Math.sin(i * 0.785) * r * 0.72, 1, 0.5, 1, { seg: 5 });
}
def('chocBar', 'low', 1.6, 0.92, 0.6, (b) => {
  // a giant bar of chocolate on its edge, half out of its wrapper
  b.box(1.5, 0.86, 0.26, MILK, 0, 0.43, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (const sz of [-1, 1]) b.box(0.2, 0.2, 0.05, MILK_L, -0.02 + i * 0.235, 0.17 + j * 0.26, sz * 0.14);
  b.box(0.62, 0.9, 0.3, WRAP, -0.46, 0.45, 0).box(0.63, 0.3, 0.31, WHITEC, -0.46, 0.45, 0).box(0.07, 0.92, 0.32, FOIL, -0.13, 0.45, 0);
  for (let i = 0; i < 5; i++) b.cone(0.06, 0.14, FOIL, -0.08, 0.1 + i * 0.18, 0, 0, 0, -PI / 2, { seg: 4 });
  for (const sz of [-1, 1]) b.sph(0.09, 0x7a1a18, -0.46, 0.45, sz * 0.16, 1.6, 1, 0.3, { seg: 8 });
});
def('truffleBox', 'low', 1.5, 0.96, 1.2, (b) => {
  // an open box of chocolates
  b.box(1.36, 0.22, 1.0, 0xb5202c, 0, 0.11, 0.05).box(1.24, 0.04, 0.88, 0x3a1d10, 0, 0.23, 0.05);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = -0.4 + i * 0.4, z = -0.17 + j * 0.42, k = i + j * 3, c = [MILK, WHITEC, DARKC, DARKC, MILK, WHITEC][k];
    b.cyl(0.17, 0.13, 0.08, FOIL, x, 0.27, z, 0, 0, 0, { seg: 10 });
    if (k % 3 === 0) b.sph(0.15, c, x, 0.31, z, 1, 0.9, 1, { seg: 9 }); else if (k % 3 === 1) b.box(0.24, 0.16, 0.24, c, x, 0.36, z, 0, 0.5, 0); else b.cone(0.15, 0.24, c, x, 0.4, z, 0, 0, 0, { seg: 9 });
    b.sph(0.04, k % 2 ? 0xe5283b : WHITEC, x, k % 3 === 2 ? 0.51 : 0.45, z, 1, 0.7, 1, { seg: 5 });
  }
  b.box(1.36, 0.92, 0.05, 0xb5202c, 0, 0.6, -0.6, -0.36, 0, 0).box(0.12, 0.94, 0.06, FOIL, 0, 0.6, -0.59, -0.36, 0, 0).box(1.38, 0.12, 0.06, FOIL, 0, 0.62, -0.585, -0.36, 0, 0);
  for (const sx of [-1, 1]) b.sph(0.14, FOIL, sx * 0.14, 0.66, -0.56, 1.2, 0.7, 0.4, { seg: 7 });
});
def('cocoaMug', 'low', 1.4, 1.0, 1.1, (b) => {
  // a mug of hot chocolate piled with cream
  b.cyl(0.6, 0.5, 0.05, 0xffffff, 0, 0.025, 0, 0, 0, 0, { seg: 16 }).cyl(0.42, 0.36, 0.6, 0xe84a4a, 0, 0.35, 0, 0, 0, 0, { seg: 16 }).tor(0.17, 0.045, 0xe84a4a, 0.5, 0.36, 0, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 6; i++) b.sph(0.06, 0xffffff, Math.cos(i * 1.05 + 0.5) * 0.4, 0.26 + (i % 2) * 0.2, Math.sin(i * 1.05 + 0.5) * 0.4, 1, 1, 1, { seg: 6 });
  b.cyl(0.39, 0.39, 0.03, MILK, 0, 0.65, 0, 0, 0, 0, { seg: 14 });
  b.sph(0.3, WHITEC, 0, 0.72, 0, 1, 0.6, 1, { seg: 10 }).sph(0.21, WHITEC, 0.02, 0.86, 0, 1, 0.6, 1, { seg: 9 }).sph(0.11, WHITEC, 0, 0.96, 0.01, 1, 0.8, 1, { seg: 8 });
  b.box(0.09, 0.5, 0.03, BISC, 0.22, 0.86, -0.08, 0, 0, -0.4);
  for (let i = 0; i < 5; i++) b.box(0.03, 0.025, 0.09, DARKC, Math.cos(i * 1.4) * 0.18, 0.86 + (i % 2) * 0.06, Math.sin(i * 1.4) * 0.18, 0, i, 0);
});
def('cookies', 'low', 1.4, 0.95, 1.3, (b) => {
  // a wobbly stack of chocolate-chip cookies
  for (let i = 0; i < 4; i++) {
    const x = Math.sin(i * 2.1) * 0.08, z = Math.cos(i * 1.7) * 0.07, y = 0.11 + i * 0.22;
    b.cyl(0.56, 0.52, 0.2, i % 2 ? 0xd9a25a : 0xcf9548, x, y, z, 0, i, 0, { seg: 14 });
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + i; b.sph(0.065, DARKC, x + Math.cos(a) * 0.52, y + ((k % 3) - 1) * 0.04, z + Math.sin(a) * 0.52, 1, 1, 1, { seg: 5 }); }
    if (i === 3) for (let k = 0; k < 6; k++) { const a = k * 1.05, r = k % 2 ? 0.34 : 0.16; b.sph(0.07, DARKC, x + Math.cos(a) * r, y + 0.1, z + Math.sin(a) * r, 1, 0.6, 1, { seg: 5 }); }
  }
});
def('chocFountain', 'tall', 1.6, 2.8, 1.6, (b) => {
  // a chocolate fountain, with strawberries ready for dipping
  const SV = 0xdfe6ee;
  b.cyl(0.74, 0.6, 0.3, SV, 0, 0.15, 0, 0, 0, 0, { seg: 16 }).cyl(0.68, 0.68, 0.06, MILK, 0, 0.31, 0, 0, 0, 0, { seg: 16 }).cyl(0.1, 0.1, 2.3, SV, 0, 1.4, 0, 0, 0, 0, { seg: 8 });
  for (const [rt, rb, h, y] of [[0.44, 0.6, 0.7, 0.7], [0.3, 0.46, 0.6, 1.42], [0.16, 0.32, 0.55, 2.08]]) {
    b.cyl(rt, rb, h, MILK, 0, y, 0, 0, 0, 0, { seg: 16 }).cyl(rt + 0.07, rt * 0.6, 0.1, SV, 0, y + h / 2 + 0.03, 0, 0, 0, 0, { seg: 16 }).cyl(rt + 0.03, rt + 0.03, 0.03, MILK_L, 0, y + h / 2 + 0.09, 0, 0, 0, 0, { seg: 16 });
  }
  b.sph(0.17, MILK, 0, 2.48, 0, 1, 1.1, 1, { seg: 9 });
  for (let i = 0; i < 3; i++) dippedInto(b, Math.cos(i * 2.09 + 0.6) * 0.62, 0.62, Math.sin(i * 2.09 + 0.6) * 0.62, 0.55, MILK);
});
def('chocBunny', 'tall', 1.4, 2.75, 1.2, (b) => {
  // a chocolate bunny in gold foil, with a red ribbon and a bell
  const G = FOIL, GD = 0xd9a520;
  b.cyl(0.62, 0.66, 0.1, DARKC, 0, 0.05, 0, 0, 0, 0, { seg: 14 });
  b.sph(0.52, G, 0, 0.78, -0.04, 1, 1.28, 0.9, { seg: 14 }).sph(0.4, G, 0, 1.7, 0.08, 1, 1, 0.95, { seg: 14 }).sph(0.17, G, 0, 0.5, -0.5, 1, 1, 1, { seg: 8 });
  for (const sx of [-1, 1]) {
    b.sph(0.3, GD, sx * 0.34, 0.36, 0.1, 0.8, 1, 1.25, { seg: 10 }).sph(0.13, GD, sx * 0.2, 0.98, 0.4, 1, 1.4, 1, { seg: 8 });
    b.sph(0.14, G, sx * 0.17, 2.36, 0, 1, 3.0, 0.55, { seg: 9 }).sph(0.07, 0xff9fb0, sx * 0.17, 2.36, 0.07, 1, 3.4, 0.3, { seg: 7 });
    b.sph(0.055, 0x3a1d10, sx * 0.15, 1.78, 0.43, 1, 1.2, 0.5, { seg: 7 }).sph(0.1, 0xffe9a8, sx * 0.1, 1.6, 0.42, 1, 0.8, 0.6, { seg: 7 });
  }
  b.sph(0.05, 0xff7a9a, 0, 1.67, 0.47, 1.2, 0.8, 0.6, { seg: 6 });
  b.tor(0.32, 0.06, WRAP, 0, 1.36, 0.02, PI / 2, 0, 0, { seg: 14 }).sph(0.1, 0xffe27a, 0, 1.24, 0.36, 1, 1, 1, { seg: 8, glow: true, grad: 0.8 });
  for (const sx of [-1, 1]) b.sph(0.13, WRAP, sx * 0.16, 1.4, 0.3, 1.3, 0.8, 0.4, { seg: 7 });
});
def('foilEgg', 'tall', 1.6, 2.7, 1.6, (b) => {
  // a giant chocolate egg in bright foil, sitting in an egg cup with a bow on top
  b.cyl(0.5, 0.6, 0.1, 0xffffff, 0, 0.05, 0, 0, 0, 0, { seg: 14 }).cyl(0.2, 0.3, 0.3, 0xffffff, 0, 0.25, 0, 0, 0, 0, { seg: 10 }).cyl(0.62, 0.3, 0.55, 0xffffff, 0, 0.66, 0, 0, 0, 0, { seg: 16 }).tor(0.62, 0.035, 0x5ac8ff, 0, 0.93, 0, PI / 2, 0, 0, { seg: 16 });
  const band = (x, y) => { const v = (y - 0.62) / 1.9; return v < 0.24 ? 0x8a4fd0 : v < 0.3 ? FOIL : v < 0.5 ? (Math.floor((Math.atan2(x, 0.3) + 4) * 3) % 2 ? 0xff7ab8 : 0x8a4fd0) : v < 0.56 ? FOIL : v < 0.8 ? 0x5ac8ff : 0x8a4fd0; };
  b.add(new THREE.SphereGeometry(0.7, 20, 16), band, 0, 1.58, 0, 0, 0, 0, 1, 1.34, 1, { grad: 0.9 });
  for (let i = 0; i < 8; i++) b.sph(0.07, FOIL, Math.cos(i * 0.785) * 0.62, 2.0, Math.sin(i * 0.785) * 0.62, 1, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) b.sph(0.2, WRAP, sx * 0.24, 2.58, 0, 1.3, 0.75, 0.5, { seg: 8 }).box(0.1, 0.4, 0.03, WRAP, sx * 0.14, 2.32, 0.1, 0.3, 0, sx * 0.5);
  b.sph(0.09, WRAP, 0, 2.56, 0, 1, 1, 1, { seg: 7 });
});
def('biscuitTower', 'tall', 1.5, 2.8, 1.5, (b) => {
  // a tottering tower of sandwich biscuits with a dipped strawberry on top
  for (let i = 0; i < 6; i++) sandwichInto(b, 0.62 - i * 0.02, Math.sin(i * 2.3) * 0.07, i * 0.38, Math.cos(i * 1.9) * 0.06);
  dippedInto(b, 0, 2.56, 0, 0.9);
});
def('cakeSlice', 'tall', 1.5, 2.6, 1.6, (b) => {
  // a slice of chocolate cake on a tall cake stand
  b.cyl(0.5, 0.62, 0.1, 0xffffff, 0, 0.05, 0, 0, 0, 0, { seg: 14 }).cyl(0.11, 0.16, 0.8, 0xffffff, 0, 0.5, 0, 0, 0, 0, { seg: 8 }).cyl(0.82, 0.7, 0.1, 0xffffff, 0, 0.95, 0, 0, 0, 0, { seg: 18 }).tor(0.82, 0.03, 0xff9fd0, 0, 1.0, 0, PI / 2, 0, 0, { seg: 18 });
  const wedge = (h, c, y, r = 1.42) => b.add(new THREE.CylinderGeometry(r, r, h, 6, 1, false, -0.42, 0.84), c, 0, y + h / 2, -0.72);
  wedge(0.36, DARKC, 1.0); wedge(0.1, WHITEC, 1.36, 1.38); wedge(0.36, DARKC, 1.46); wedge(0.1, WHITEC, 1.82, 1.38); wedge(0.34, DARKC, 1.92); wedge(0.09, MILK, 2.26, 1.44);
  b.sph(0.18, WHITEC, 0, 2.42, 0.4, 1, 0.8, 1, { seg: 8 }).sph(0.12, 0xe5283b, 0, 2.56, 0.4, 1, 1, 1, { seg: 7 }).cyl(0.01, 0.01, 0.16, 0x4f8a3a, 0.03, 2.7, 0.4, 0, 0, -0.3, { seg: 4 });
  for (let i = 0; i < 3; i++) b.sph(0.08, MILK, -0.3 + i * 0.3, 2.2 - (i % 2) * 0.1, 0.66 - Math.abs(i - 1) * 0.06, 1, 1.8, 0.6, { seg: 6 });      // icing running down the front
});
def('truffle', 'low', 1.1, 1.0, 1.0, (b) => {
  // a rolling chocolate truffle, drizzled with white chocolate
  b.sph(0.48, DARKC, 0, 0, 0, 1, 1, 1, { seg: 16, grad: 0.85 });
  for (let i = 0; i < 4; i++) b.tor(0.485, 0.022, WHITEC, 0, 0, 0, 0.5 + i * 0.5, i * 0.9, 0, { seg: 18, tseg: 4 });
  for (let i = 0; i < 12; i++) { const u = (i + 0.5) / 12, ph = Math.acos(1 - 2 * u), th = i * 2.4; b.sph(0.04, FOIL, Math.sin(ph) * Math.cos(th) * 0.49, Math.cos(ph) * 0.49, Math.sin(ph) * Math.sin(th) * 0.49, 1, 1, 1, { seg: 5 }); }
}, { center: true });
def('chocDrop', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the flying jug pours: a great big chocolate drop
  b.sph(0.44, MILK, 0, -0.05, 0, 1, 0.9, 1, { seg: 14, grad: 0.85 }).cone(0.3, 0.42, MILK, 0, 0.42, 0, 0, 0, 0, { seg: 12 }).sph(0.07, MILK, 0.03, 0.62, 0, 1, 1, 1, { seg: 6 });
  b.sph(0.12, MILK_L, -0.16, 0.12, 0.34, 1, 1.4, 0.4, { seg: 7 });
}, { center: true });
def('cakeTrolley', 'low', 1.5, 0.98, 1.15, (b) => {
  // a runaway tea trolley with a chocolate cake on it
  b.box(1.4, 0.06, 1.0, 0xfff6ee, 0, 0.32, 0).box(1.4, 0.05, 1.0, 0xfff6ee, 0, 0.12, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.cyl(0.11, 0.11, 0.06, C.rubber, sx * 0.58, 0.11, sz * 0.46, PI / 2, 0, 0, { seg: 10 }); b.box(0.05, 0.3, 0.05, FOIL, sx * 0.64, 0.2, sz * 0.44); }
  for (const sz of [-1, 1]) b.cyl(0.022, 0.022, 0.5, FOIL, -0.68, 0.58, sz * 0.4);
  b.cyl(0.028, 0.028, 0.84, FOIL, -0.68, 0.84, 0, PI / 2, 0, 0);
  b.cyl(0.5, 0.5, 0.04, 0xffffff, 0.1, 0.37, 0, 0, 0, 0, { seg: 16 }).cyl(0.42, 0.42, 0.34, DARKC, 0.1, 0.56, 0, 0, 0, 0, { seg: 16 }).cyl(0.44, 0.44, 0.07, MILK, 0.1, 0.75, 0, 0, 0, 0, { seg: 16 });
  for (let i = 0; i < 8; i++) { const a = i * 0.785; b.sph(0.07, WHITEC, 0.1 + Math.cos(a) * 0.34, 0.83, Math.sin(a) * 0.34, 1, 0.9, 1, { seg: 6 }); b.sph(0.06, MILK, 0.1 + Math.cos(a + 0.4) * 0.43, 0.6, Math.sin(a + 0.4) * 0.43, 1, 1.8, 1, { seg: 5 }); }
  b.sph(0.08, 0xe5283b, 0.1, 0.87, 0, 1, 1, 1, { seg: 7 });
});
def('chocJug', 'deco', 2.2, 1.6, 1.4, (b) => {
  // a cheeky flying jug of chocolate sauce
  const CH = 0xfff6ee, BL = 0x4f8fe0;
  b.cyl(0.36, 0.5, 0.84, CH, 0, 0, 0, 0, 0, 0, { seg: 16 }).sph(0.5, CH, 0, -0.42, 0, 1, 0.3, 1, { seg: 14 }).cyl(0.37, 0.37, 0.06, MILK, 0, 0.42, 0, 0, 0, 0, { seg: 14 });
  b.tor(0.46, 0.035, BL, 0, -0.2, 0, PI / 2, 0, 0, { seg: 16 }).tor(0.385, 0.03, BL, 0, 0.3, 0, PI / 2, 0, 0, { seg: 16 });
  b.cone(0.16, 0.34, CH, 0, 0.36, 0.42, 1.0, 0, 0, { seg: 8 }).sph(0.09, MILK, 0, 0.3, 0.56, 1, 1.5, 1, { seg: 7 }).sph(0.06, MILK, 0, 0.12, 0.6, 1, 1.6, 1, { seg: 6 });
  b.tor(0.2, 0.05, CH, 0, 0, -0.48, 0, PI / 2, 0, { seg: 10 });
  for (const sx of [-1, 1]) {
    b.sph(0.11, 0xffffff, sx * 0.16, 0.05, 0.4, 1, 1.15, 0.5, { seg: 8, grad: 1 }).sph(0.055, 0x1b1f24, sx * 0.15, 0.03, 0.45, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.box(0.2, 0.04, 0.03, 0x3a1d10, sx * 0.16, 0.22, 0.42, 0, 0, sx * -0.4).sph(0.08, 0xff9fb0, sx * 0.3, -0.1, 0.4, 1, 0.7, 0.4, { seg: 6, grad: 1 });
  }
  b.tor(0.1, 0.022, 0x3a1d10, 0, -0.14, 0.47, 0, 0, PI, { arc: PI, seg: 7 });
}, {
  wings: (b, sx) => { for (let i = 0; i < 3; i++) b.sph(0.3 - i * 0.05, 0xffffff, sx * (0.3 + i * 0.26), 0.02 + i * 0.03, -i * 0.06, 1.25, 0.14, 0.62 - i * 0.1, { seg: 8 }); }, wingAt: [0.36, 0.1, 0],
});

// ---------- Moo Town ----------
export const COW_W = 0xfffaf2, COW_B = 0x2a2420, COW_BR = 0x9a5a2e, COW_P = 0xf7b6b8, HOOF = 0x3a2a22, HORN = 0xf0e2c0, STRAW = 0xe6c462, STRAW_D = 0xc9a13e;
// A friendly cow person, standing on two legs and facing +z. (x, y, z) is the ground under the hooves and s the size
// (1 is a grown-up, about 2.3 tall). o.top: the colour of the clothes; o.kind: 'dungarees', 'dress', 'jumper' or 'apron';
// o.hat: 'straw', 'cap', 'bow', 'flower' or 'chef'; o.brown: a brown-and-white cow; o.arm false leaves off the right arm
// (scenery adds it as a separate part, so that it can wave); o.specs: glasses.
export function cowInto(b, x, y, z, ry = 0, s = 1, o = {}) {
  const W = COW_W, B = o.brown ? COW_BR : COW_B, top = o.top ?? 0x3f7fd0, kind = o.kind || 'dungarees';
  b.at(x, y, z, ry, () => {
    for (const sx of [-1, 1]) b.cyl(0.13, 0.12, 0.62, kind === 'dungarees' ? top : W, sx * 0.19, 0.43, 0, 0, 0, 0, { seg: 8 }).cyl(0.15, 0.17, 0.16, HOOF, sx * 0.19, 0.08, 0.02, 0, 0, 0, { seg: 8 });
    b.sph(0.44, W, 0, 1.12, 0, 1, 1.2, 0.88, { seg: 14 });
    b.sph(0.22, B, -0.37, 1.3, 0.02, 0.4, 1.0, 0.9, { seg: 8 }).sph(0.24, B, 0.16, 1.0, -0.33, 1, 0.9, 0.4, { seg: 8 });
    if (kind === 'dungarees') {
      b.sph(0.455, top, 0, 0.9, 0, 1, 0.72, 0.9, { seg: 12 }).box(0.5, 0.42, 0.08, top, 0, 1.24, 0.37, -0.08, 0, 0);
      for (const sx of [-1, 1]) b.box(0.07, 0.52, 0.05, top, sx * 0.2, 1.52, 0.27, -0.42, 0, 0).sph(0.035, 0xffc928, sx * 0.2, 1.4, 0.4, 1, 1, 0.5, { seg: 6 });
    } else if (kind === 'dress') {
      b.cyl(0.3, 0.64, 0.82, top, 0, 0.88, 0, 0, 0, 0, { seg: 12 }).sph(0.455, top, 0, 1.24, 0, 1, 0.86, 0.9, { seg: 12 }).tor(0.26, 0.05, 0xffffff, 0, 1.58, 0.03, PI / 2, 0, 0, { seg: 12 });
      for (let i = 0; i < 6; i++) b.sph(0.05, 0xffffff, Math.cos(i * 1.05) * 0.5, 0.62 + (i % 2) * 0.1, Math.sin(i * 1.05) * 0.5, 1, 1, 1, { seg: 5 });
    } else if (kind === 'jumper') {
      b.sph(0.46, top, 0, 1.16, 0, 1, 1.02, 0.9, { seg: 12 });
      for (let i = 0; i < 2; i++) b.tor(0.445 - i * 0.03, 0.035, 0xffffff, 0, 1.05 + i * 0.26, 0, PI / 2, 0, 0, { seg: 14 });
    } else {
      b.sph(0.455, top, 0, 1.16, 0, 1, 1.02, 0.9, { seg: 12 }).box(0.56, 0.9, 0.06, 0xffffff, 0, 1.0, 0.39, -0.05, 0, 0).box(0.3, 0.2, 0.07, 0xffffff, 0, 1.5, 0.33, -0.3, 0, 0).box(0.2, 0.16, 0.07, 0xffd9e2, 0, 0.9, 0.42, -0.05, 0, 0);
    }
    b.cap(0.09, 0.42, kind === 'dungarees' ? W : top, -0.52, 1.26, 0.02, 0, 0, -0.34, { seg: 7 }).sph(0.1, HOOF, -0.63, 0.96, 0.02, 1, 1, 1, { seg: 7 });
    if (o.arm !== false) b.cap(0.09, 0.42, kind === 'dungarees' ? W : top, 0.62, 1.66, 0.02, 0, 0, -0.72, { seg: 7 }).sph(0.1, HOOF, 0.84, 1.92, 0.02, 1, 1, 1, { seg: 7 });
    // head
    b.sph(0.34, W, 0, 1.95, 0.04, 1, 0.95, 0.95, { seg: 14 }).sph(0.16, B, 0.17, 2.05, 0.2, 1, 1.1, 0.7, { seg: 8 }).sph(0.25, COW_P, 0, 1.82, 0.28, 1.12, 0.72, 0.75, { seg: 12 });
    b.tor(0.1, 0.02, 0x8a4a50, 0, 1.79, 0.45, 0.25, 0, PI, { arc: PI, seg: 8 }).sph(0.1, B, 0, 2.27, 0.1, 1.3, 0.7, 1, { seg: 7 });
    for (const sx of [-1, 1]) {
      b.sph(0.032, 0x8a4a50, sx * 0.09, 1.87, 0.46, 1, 1.3, 0.5, { seg: 6 });
      b.sph(0.078, 0xffffff, sx * 0.14, 2.04, 0.3, 1, 1.15, 0.5, { seg: 8 }).sph(0.04, 0x1b1f24, sx * 0.14, 2.03, 0.335, 1, 1, 0.5, { seg: 6 });
      b.sph(0.13, sx > 0 ? B : W, sx * 0.41, 2.02, 0, 1.5, 0.6, 0.5, { seg: 8 }).sph(0.07, COW_P, sx * 0.42, 2.02, 0.04, 1.4, 0.55, 0.4, { seg: 6 });
      b.cone(0.055, 0.22, HORN, sx * 0.2, 2.3, 0, 0, 0, sx * -0.5, { seg: 6 });
      if (o.specs) b.tor(0.1, 0.015, 0x3a2a22, sx * 0.14, 2.04, 0.36, 0, 0, 0, { seg: 10 });
    }
    b.tor(0.25, 0.035, 0xd2302c, 0, 1.64, 0.04, PI / 2 - 0.15, 0, 0, { seg: 12 }).cyl(0.06, 0.1, 0.13, 0xffc928, 0, 1.52, 0.3, 0, 0, 0, { seg: 8 });      // a collar and a bell
    b.cap(0.03, 0.4, W, 0, 0.78, -0.47, -0.6, 0, 0, { seg: 5 }).sph(0.075, B, 0, 0.55, -0.62, 1, 1.3, 1, { seg: 6 });
    if (o.hat === 'straw') b.cyl(0.52, 0.52, 0.04, STRAW, 0, 2.25, 0.02, 0, 0, 0, { seg: 14 }).cyl(0.25, 0.3, 0.2, STRAW, 0, 2.36, 0.02, 0, 0, 0, { seg: 12 }).cyl(0.305, 0.305, 0.06, 0xd2302c, 0, 2.3, 0.02, 0, 0, 0, { seg: 12 });
    else if (o.hat === 'cap') b.sph(0.3, 0x6f7a5a, 0, 2.24, 0, 1, 0.42, 1, { seg: 10 }).box(0.34, 0.04, 0.22, 0x6f7a5a, 0, 2.2, 0.3, 0.15, 0, 0);
    else if (o.hat === 'bow') { for (const sx of [-1, 1]) b.sph(0.11, 0xff5a8a, sx * 0.1, 2.32, 0.06, 1.2, 0.8, 0.5, { seg: 7 }); b.sph(0.05, 0xd2306a, 0, 2.32, 0.08, 1, 1, 1, { seg: 6 }); }
    else if (o.hat === 'flower') { b.sph(0.06, 0xffd23f, 0.27, 2.24, 0.14, 1, 1, 1, { seg: 6 }); for (let i = 0; i < 5; i++) b.sph(0.06, 0xffffff, 0.27 + Math.cos(i * 1.26) * 0.09, 2.24 + Math.sin(i * 1.26) * 0.09, 0.12, 1, 1, 0.4, { seg: 5 }); }
    else if (o.hat === 'chef') b.cyl(0.24, 0.22, 0.3, 0xffffff, 0, 2.4, 0, 0, 0, 0, { seg: 10 }).sph(0.3, 0xffffff, 0, 2.62, 0, 1, 0.6, 1, { seg: 9 });
  }, s);
}
// A milk churn; (x, y, z) is the middle of its base.
export function churnInto(b, x, y, z, s = 1) {
  const M = 0xc9d2d8, MD = 0x9aa6ae;
  b.cyl(0.3 * s, 0.32 * s, 0.6 * s, M, x, y + 0.3 * s, z, 0, 0, 0, { seg: 12 }).cyl(0.18 * s, 0.3 * s, 0.16 * s, M, x, y + 0.68 * s, z, 0, 0, 0, { seg: 12 }).cyl(0.2 * s, 0.18 * s, 0.1 * s, M, x, y + 0.81 * s, z, 0, 0, 0, { seg: 12 }).cyl(0.23 * s, 0.23 * s, 0.05 * s, MD, x, y + 0.88 * s, z, 0, 0, 0, { seg: 12 });
  b.tor(0.325 * s, 0.02 * s, MD, x, y + 0.12 * s, z, PI / 2, 0, 0, { seg: 12 }).tor(0.315 * s, 0.02 * s, MD, x, y + 0.5 * s, z, PI / 2, 0, 0, { seg: 12 });
  for (const sx of [-1, 1]) b.tor(0.07 * s, 0.018 * s, MD, x + sx * 0.3 * s, y + 0.66 * s, z, 0, 0, 0, { seg: 8 });
}
// A milk bottle with a foil top; (x, y, z) is the middle of its base, s its size (1 is 1 m tall).
export function bottleInto(b, x, y, z, s = 1, cap = 0xd2302c) {
  b.cyl(0.2 * s, 0.2 * s, 0.6 * s, 0xfffdf6, x, y + 0.3 * s, z, 0, 0, 0, { seg: 12 }).cyl(0.1 * s, 0.2 * s, 0.2 * s, 0xfffdf6, x, y + 0.7 * s, z, 0, 0, 0, { seg: 12 }).cyl(0.1 * s, 0.1 * s, 0.14 * s, 0xfffdf6, x, y + 0.87 * s, z, 0, 0, 0, { seg: 10 }).cyl(0.115 * s, 0.115 * s, 0.06 * s, cap, x, y + 0.97 * s, z, 0, 0, 0, { seg: 10 });
}
// A rectangular bale of hay tied with twine; (x, y, z) is the middle of its base.
export function baleInto(b, w, h, d, x, y, z, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.box(w, h, d, STRAW, 0, h / 2, 0);
    for (const sx of [-1, 1]) b.box(0.05, h + 0.03, d + 0.03, 0xb98a3a, sx * w * 0.28, h / 2, 0);
    for (let i = 0; i < 6; i++) b.box(0.05, 0.03, 0.26, STRAW_D, -w * 0.4 + i * w * 0.16, h + 0.012, ((i % 3) - 1) * d * 0.25, 0, i, 0);
  });
}
def('churns', 'low', 1.4, 0.95, 1.0, (b) => {
  churnInto(b, -0.36, 0, 0.05); churnInto(b, 0.34, 0, -0.08, 0.92);
  b.sph(0.3, 0xfffdf6, 0.3, 0.012, 0.42, 1, 0.04, 0.7, { seg: 8 });      // a little spilt milk
});
def('milkCrate', 'low', 1.4, 0.95, 1.0, (b) => {
  // a crate of milk bottles
  b.box(1.26, 0.1, 0.86, 0x4f8fe0, 0, 0.05, 0);
  for (const sx of [-1, 1]) b.box(0.07, 0.5, 0.86, 0x4f8fe0, sx * 0.6, 0.3, 0).box(1.26, 0.12, 0.07, 0x4f8fe0, 0, 0.46, sx * 0.4).box(1.26, 0.1, 0.07, 0x4f8fe0, 0, 0.2, sx * 0.4);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bottleInto(b, -0.38 + i * 0.38, 0.1, -0.2 + j * 0.4, 0.82, (i + j) % 2 ? 0xd2302c : 0xf2c230);
});
def('trough', 'low', 1.7, 0.9, 1.0, (b) => {
  // a water trough with a rubber duck in it
  const WD = 0x8a5a3c, WDD = 0x6a4326;
  b.box(1.56, 0.5, 0.74, WD, 0, 0.45, 0).box(1.4, 0.04, 0.6, 0x5ac8e6, 0, 0.71, 0, 0, 0, 0, { grad: 1 });
  for (const sx of [-1, 1]) b.box(0.12, 0.72, 0.8, WDD, sx * 0.68, 0.36, 0).box(1.6, 0.08, 0.07, WDD, 0, 0.7, sx * 0.37);
  b.sph(0.13, 0xffd23f, 0.3, 0.8, 0.02, 1.2, 0.9, 1, { seg: 8 }).sph(0.085, 0xffd23f, 0.4, 0.93, 0.02, 1, 1, 1, { seg: 7 }).cone(0.035, 0.08, 0xff8a3c, 0.5, 0.92, 0.02, 0, 0, -PI / 2, { seg: 5 });
});
def('bigBottle', 'tall', 1.5, 2.8, 1.5, (b) => {
  // an enormous bottle of milk with a cow-patch label
  b.cyl(0.62, 0.62, 1.7, 0xfffdf6, 0, 0.85, 0, 0, 0, 0, { seg: 18 }).cyl(0.3, 0.62, 0.55, 0xfffdf6, 0, 1.97, 0, 0, 0, 0, { seg: 18 }).cyl(0.3, 0.3, 0.36, 0xfffdf6, 0, 2.42, 0, 0, 0, 0, { seg: 14 }).cyl(0.34, 0.34, 0.14, 0xd2302c, 0, 2.66, 0, 0, 0, 0, { seg: 14 }).cyl(0.33, 0.28, 0.06, 0xb5202c, 0, 2.76, 0, 0, 0, 0, { seg: 14 });
  b.cyl(0.635, 0.635, 0.8, 0x5ab0f0, 0, 0.95, 0, 0, 0, 0, { seg: 18 });
  for (const [a, y, r] of [[0.2, 1.05, 0.2], [1.3, 0.8, 0.16], [-0.9, 1.1, 0.18], [2.6, 1.0, 0.2], [-2.2, 0.85, 0.15], [3.6, 1.15, 0.13]]) b.sph(r, COW_B, Math.sin(a) * 0.62, y, Math.cos(a) * 0.62, 1, 1.1, 1, { seg: 7 });
  b.sph(0.14, 0xffffff, -0.25, 1.9, 0.42, 0.6, 1.8, 0.3, { seg: 6 });
});
def('hayStack', 'tall', 1.7, 2.7, 1.3, (b) => {
  // bales of hay piled up, with a pitchfork stuck in the top
  baleInto(b, 1.6, 0.85, 1.1, 0, 0, 0, 0.05); baleInto(b, 1.5, 0.85, 1.05, 0.04, 0.85, 0, -0.08); baleInto(b, 1.3, 0.8, 1.0, -0.05, 1.7, 0, 0.1);
  b.cyl(0.03, 0.03, 1.1, 0x8a5a3c, 0.3, 2.9, 0, 0, 0, 0.25, { seg: 6 });
});
def('scareCow', 'tall', 1.9, 2.9, 1.0, (b) => {
  // a scarecrow, made to look like a cow, with a crow's nest in its hat (it scares nobody)
  b.cyl(0.07, 0.07, 2.2, 0x8a5a3c, 0, 1.1, 0, 0, 0, 0, { seg: 6 }).cyl(0.05, 0.05, 1.8, 0x8a5a3c, 0, 1.75, 0, 0, 0, PI / 2, { seg: 6 });
  b.box(0.8, 1.0, 0.36, 0xd2302c, 0, 1.5, 0).box(0.82, 0.14, 0.38, 0xf2c230, 0, 1.2, 0);
  for (const sx of [-1, 1]) { b.box(0.62, 0.24, 0.26, 0xd2302c, sx * 0.62, 1.75, 0); for (let i = 0; i < 4; i++) b.box(0.03, 0.3, 0.03, STRAW, sx * (0.92 + (i % 2) * 0.06), 1.62 + (i % 2) * 0.1, (i - 1.5) * 0.06, 0, 0, sx * (0.6 + i * 0.3)); }
  for (let i = 0; i < 6; i++) b.box(0.04, 0.34, 0.03, STRAW, -0.3 + i * 0.12, 0.92, 0.1, 0, 0, (i - 2.5) * 0.12);
  b.sph(0.36, 0xfff6e0, 0, 2.36, 0.02, 1, 0.95, 0.9, { seg: 12 }).sph(0.24, COW_P, 0, 2.24, 0.26, 1.1, 0.7, 0.7, { seg: 10 }).sph(0.15, COW_B, 0.18, 2.46, 0.2, 1, 1.1, 0.6, { seg: 7 });
  for (const sx of [-1, 1]) { b.box(0.1, 0.03, 0.02, 0x1b1f24, sx * 0.14, 2.46, 0.33, 0, 0, 0.78).box(0.1, 0.03, 0.02, 0x1b1f24, sx * 0.14, 2.46, 0.33, 0, 0, -0.78); b.cone(0.05, 0.2, HORN, sx * 0.2, 2.7, 0, 0, 0, sx * -0.5, { seg: 6 }); }
  b.tor(0.1, 0.018, 0x8a4a50, 0, 2.21, 0.41, 0.25, 0, PI, { arc: PI, seg: 8 });
  b.cyl(0.56, 0.56, 0.04, STRAW, 0, 2.68, 0, 0, 0, 0.08, { seg: 12 }).cyl(0.26, 0.32, 0.22, STRAW, 0, 2.8, 0, 0, 0, 0.08, { seg: 10 });
});
def('milkFloat', 'tall', 1.9, 2.4, 2.6, (b) => {
  // the milk cart, loaded with crates and churns
  const BL = 0x5ab0f0;
  b.box(1.7, 0.5, 2.4, 0xfffdf6, 0, 0.62, 0).box(1.72, 0.14, 2.42, BL, 0, 0.9, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.3, 0.3, 0.16, 0x2a2f36, sx * 0.86, 0.3, sz * 0.75, 0, 0, PI / 2, { seg: 12 }).cyl(0.13, 0.13, 0.18, 0xd2302c, sx * 0.86, 0.3, sz * 0.75, 0, 0, PI / 2, { seg: 8 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.04, 0.04, 1.3, 0xdfe6ee, sx * 0.78, 1.6, sz * 1.1, 0, 0, 0, { seg: 6 });
  b.box(1.9, 0.12, 2.6, BL, 0, 2.3, 0);
  for (let i = 0; i < 5; i++) b.box(0.38, 0.14, 2.62, i % 2 ? 0xfffdf6 : BL, -0.76 + i * 0.38, 2.31, 0);
  churnInto(b, -0.42, 0.97, 0.7); churnInto(b, 0.38, 0.97, 0.75, 0.9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bottleInto(b, -0.4 + i * 0.4, 0.97, -0.75 + j * 0.42, 0.8, i % 2 ? 0xd2302c : 0xf2c230);
  for (const [x, y, r] of [[-0.5, 0.6, 0.16], [0.3, 0.68, 0.2], [0.62, 0.5, 0.12]]) b.sph(r, COW_B, x, y, 1.2, 1, 1, 0.12, { seg: 7 });
});
def('butterChurn', 'tall', 1.4, 2.6, 1.4, (b) => {
  // an old wooden butter churn with a pat of butter on the stool beside it
  const WD = 0xb07a4a, WDD = 0x7a4f2c;
  b.cyl(0.42, 0.6, 1.7, WD, 0, 0.85, -0.1, 0, 0, 0, { seg: 14 });
  for (const y of [0.3, 0.9, 1.5]) b.tor(0.6 - y * 0.106 + 0.01, 0.03, 0x5a6068, 0, y, -0.1, PI / 2, 0, 0, { seg: 14 });
  b.cyl(0.46, 0.44, 0.1, WDD, 0, 1.74, -0.1, 0, 0, 0, { seg: 14 }).cyl(0.04, 0.04, 0.9, WDD, 0, 2.2, -0.1, 0, 0, 0, { seg: 6 }).cyl(0.04, 0.04, 0.5, WDD, 0, 2.6, -0.1, 0, 0, PI / 2, { seg: 6 });
  b.cyl(0.24, 0.24, 0.06, WDD, 0.42, 0.5, 0.46, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 3; i++) b.cyl(0.03, 0.03, 0.5, WDD, 0.42 + Math.cos(i * 2.09) * 0.17, 0.25, 0.46 + Math.sin(i * 2.09) * 0.17, 0, 0, 0, { seg: 5 });
  b.box(0.3, 0.14, 0.2, 0xffe27a, 0.42, 0.6, 0.46, 0, 0.4, 0);
});
def('roundBale', 'low', 1.2, 1.0, 1.0, (b) => {
  // a big round bale of hay, rolling down the lane
  b.cyl(0.5, 0.5, 1.0, STRAW, 0, 0, 0, 0, 0, PI / 2, { seg: 18 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.tor(0.14 + i * 0.14, 0.02, STRAW_D, sx * 0.505, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 4 });
  for (const x of [-0.25, 0.25]) b.tor(0.505, 0.018, 0xb98a3a, x, 0, 0, 0, PI / 2, 0, { seg: 18, tseg: 4 });
}, { center: true });
def('cornCob', 'low', 1.1, 1.0, 1.0, (b) => {
  // what the crows drop: a great big cob of corn
  b.cap(0.3, 0.44, 0xffd23f, 0, 0, 0, 0, 0, PI / 2, { seg: 12 });
  for (let i = 0; i < 6; i++) b.tor(0.3, 0.035, 0xf2b90f, -0.25 + i * 0.1, 0, 0, 0, PI / 2, 0, { seg: 12, tseg: 4 });
  for (let i = 0; i < 4; i++) b.cone(0.14, 0.5, 0x4fae56, -0.5, Math.sin(i * 1.57) * 0.16, Math.cos(i * 1.57) * 0.16, 0, 0, PI / 2 + 0.3, { seg: 5 });
}, { center: true });
def('calfScoot', 'low', 1.2, 0.98, 1.0, (b) => {
  // a calf whizzing along on a scooter; it faces +x
  b.box(0.9, 0.05, 0.22, 0xd2302c, 0, 0.14, 0);
  for (const sx of [-1, 1]) b.cyl(0.1, 0.1, 0.06, 0x2a2f36, sx * 0.42, 0.1, 0, PI / 2, 0, 0, { seg: 10 });
  b.cyl(0.02, 0.02, 0.72, 0xdfe6ee, 0.4, 0.5, 0, 0, 0, -0.12, { seg: 6 }).cyl(0.02, 0.02, 0.4, 0x2a2f36, 0.44, 0.86, 0, PI / 2, 0, 0, { seg: 6 });
  cowInto(b, -0.02, 0.16, 0, PI / 2, 0.36, { top: 0xf2c230, kind: 'jumper', hat: 'cap', arm: false });
  b.cap(0.035, 0.2, 0xf2c230, 0.24, 0.72, 0.14, 0, 0, -1.2, { seg: 5 }).cap(0.035, 0.2, 0xf2c230, 0.24, 0.72, -0.14, 0, 0, -1.2, { seg: 5 });
});
def('crow', 'deco', 2.4, 1.0, 1.5, (b) => {
  // a bossy crow in a straw hat, with a cob of corn to drop
  const K = 0x2a2a36, KD = 0x1b1b24;
  b.sph(0.36, K, 0, 0, 0, 0.95, 0.9, 1.4, { seg: 12 }).sph(0.26, K, 0, 0.2, 0.42, 1, 1, 1, { seg: 12 });
  b.cone(0.1, 0.34, 0xffb300, 0, 0.16, 0.74, PI / 2 + 0.15, 0, 0, { seg: 7 });
  for (const sx of [-1, 1]) {
    b.sph(0.08, 0xffffff, sx * 0.12, 0.28, 0.6, 1, 1, 0.5, { seg: 8, grad: 1 }).sph(0.04, 0x1b1f24, sx * 0.12, 0.27, 0.64, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.box(0.18, 0.04, 0.03, KD, sx * 0.12, 0.39, 0.6, 0, 0, sx * -0.45);
    b.cap(0.03, 0.1, 0xffb300, sx * 0.1, -0.34, 0.05, 0.3, 0, 0, { seg: 5 });
  }
  for (const k of [-1, 0, 1]) b.sph(0.2, KD, k * 0.12, 0.02, -0.62, 0.5, 0.12, 1.1, { seg: 7 });
  b.cyl(0.3, 0.3, 0.03, STRAW, 0, 0.42, 0.4, 0.1, 0, 0, { seg: 10 }).cyl(0.14, 0.17, 0.14, STRAW, 0, 0.5, 0.39, 0.1, 0, 0, { seg: 8 });
  b.cap(0.1, 0.2, 0xffd23f, 0, -0.44, 0.08, 0, 0, PI / 2, { seg: 8 });
}, {
  wings: (b, sx) => {
    b.sph(0.5, 0x2a2a36, sx * 0.56, 0, 0, 1.25, 0.09, 0.7, { seg: 10 });
    for (let i = 0; i < 4; i++) b.sph(0.18, 0x1b1b24, sx * (0.92 + i * 0.1), 0.005, 0.28 - i * 0.2, 1.3, 0.1, 0.5, { seg: 6 });
  }, wingAt: [0.2, 0.1, 0],
});

// ---------- the Land of Mirrors ----------
export const MGOLD = 0xf2c230, MGOLD_D = 0xc9962a, MSILV = 0xe2eaf4, PEARL = 0xfbf6ff, GEMS = [0xff8fc8, 0x8fe6ff, 0xfff3a8, 0xc8a8ff, 0x9ff5c8];
const _g1 = new THREE.Color(), _g2 = new THREE.Color(), _gw = new THREE.Color(0xffffff);
// The colour of looking-glass: sky blue at the top fading to pearl at the foot, with streaks of light slanting across it.
export const glassCol = (y0, h, ph = 0) => (x, y, z) => {
  const u = Math.min(1, Math.max(0, (y - y0) / h)), t = (((x + z) * 0.33 + y * 0.3 + ph) % 1 + 1) % 1;
  const streak = Math.max(0, 1 - Math.abs(t - 0.42) / 0.11) + 0.7 * Math.max(0, 1 - Math.abs(t - 0.66) / 0.05);
  return _g1.set(0xdff3ff).lerp(_g2.set(0x4f9cf0), u).lerp(_gw, Math.min(1, streak) * 0.92);
};
// A flat pane of looking-glass, w wide and h high, standing on (x, y, z) and facing along z (turned by ry).
export function glassInto(b, w, h, x, y, z, ry = 0, ph = 0) {
  b.add(new THREE.BoxGeometry(w, h, 0.03, Math.min(12, Math.ceil(w * 5)), Math.min(16, Math.ceil(h * 5)), 1), glassCol(y, h, ph), x, y + h / 2, z, 0, ry, 0, 1, 1, 1, { glow: true, grad: 1 });
}
// A round or oval looking-glass, centred on (x, y, z).
export function ovalGlassInto(b, rx, ryy, x, y, z, ry = 0, ph = 0) {
  b.add(new THREE.SphereGeometry(1, 16, 12), glassCol(y - ryy, ryy * 2, ph), x, y, z, 0, ry, 0, rx, ryy, 0.035, { glow: true, grad: 1 });
}
// A mirror ball: every little facet catches the light differently.
const BALL = [0xffffff, 0x8fc0f0, 0xdfe8f2, 0x5a9be0, 0xffd0ea, 0xbfe8ff];
export function mirrorBallInto(b, r, x, y, z) {
  b.add(new THREE.IcosahedronGeometry(r, 2), (px, py, pz, i) => BALL[(Math.floor(i / 3) * 7 + Math.floor(i / 9)) % 6], x, y, z, 0, 0, 0, 1, 1, 1, { glow: true, grad: 1 });
}
// A cut gem.
export function gemInto(b, x, y, z, s, col, ry = 0, rz = 0) {
  b.add(new THREE.OctahedronGeometry(1), col, x, y + s * 0.62, z, 0, ry, rz, s * 0.5, s * 0.62, s * 0.5, { glow: true, grad: 0.6 });
  b.add(new THREE.OctahedronGeometry(1), 0xffffff, x, y + s * 0.9, z, 0, ry, rz, s * 0.2, s * 0.3, s * 0.2, { glow: true, grad: 1 });
}
// A four-pointed sparkle.
export function sparkleInto(b, x, y, z, s, col = 0xffffff) {
  b.add(new THREE.OctahedronGeometry(1), col, x, y, z, 0, 0, 0, s * 0.16, s, s * 0.16, { glow: true, grad: 1 });
  b.add(new THREE.OctahedronGeometry(1), col, x, y, z, 0, 0, 0, s, s * 0.16, s * 0.16, { glow: true, grad: 1 });
}
def('handMirror', 'low', 1.45, 0.95, 1.0, (b) => {
  // a giant hand mirror, propped up on a little gold easel
  b.cyl(0.05, 0.05, 1.0, MGOLD_D, 0, 0.4, -0.3, -0.55, 0, 0, { seg: 6 });
  for (const sx of [-1, 1]) b.cyl(0.045, 0.045, 0.9, MGOLD_D, sx * 0.36, 0.42, 0.05, 0.32, 0, sx * 0.1, { seg: 6 });
  b.box(1.0, 0.07, 0.16, MGOLD, 0, 0.16, 0.22);
  b.at(0.1, 0.52, 0.07, 0, () => {
    b.cyl(0.42, 0.42, 0.07, MGOLD, 0, 0, 0, PI / 2 - 0.32, 0, 0, { seg: 18 }).tor(0.42, 0.05, MGOLD_D, 0, 0, 0.0, -0.32, 0, 0, { seg: 18 });
    b.add(new THREE.SphereGeometry(1, 14, 10), glassCol(0.2, 0.75), 0, 0.012, 0.04, -0.32, 0, 0, 0.36, 0.36, 0.02, { glow: true, grad: 1 });
  });
  b.cap(0.07, 0.4, MGOLD, -0.5, 0.3, 0.2, 0, 0, 1.1, { seg: 8 }).sph(0.1, MGOLD_D, -0.74, 0.19, 0.2, 1, 1, 1, { seg: 7 });
});
def('gemPile', 'low', 1.45, 0.95, 1.0, (b) => {
  // a heap of cut gems, each as big as a football
  b.cyl(0.7, 0.76, 0.1, PEARL, 0, 0.05, 0, 0, 0, 0, { seg: 14 });
  for (const [x, z, s, i, r] of [[-0.4, 0.1, 0.5, 0, 0.3], [0.4, 0.12, 0.52, 1, -0.2], [0, 0.2, 0.62, 2, 0], [-0.15, -0.25, 0.5, 3, 0.2], [0.25, -0.2, 0.46, 4, -0.3]]) gemInto(b, x, 0.08, z, s, GEMS[i], i * 0.7, r);
  gemInto(b, 0.02, 0.42, 0, 0.42, 0xffffff, 0.4, 0);
});
def('glassBricks', 'low', 1.6, 0.92, 0.9, (b) => {
  // a little wall of glass bricks
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3 - j; i++) {
    const x = (i - (2 - j) / 2) * 0.5, y = 0.22 + j * 0.44, c = [0xbfeaff, 0xd8f4ff, 0xa8dcf8][(i + j) % 3];
    b.box(0.46, 0.4, 0.46, c, x, y, 0, 0, 0, 0, { grad: 0.9 }).box(0.3, 0.26, 0.48, 0xf4fcff, x, y, 0).box(0.1, 0.05, 0.49, 0xffffff, x - 0.07, y + 0.07, 0, 0, 0, 0.6, { glow: true, grad: 1 });
  }
  sparkleInto(b, 0.55, 0.78, 0.2, 0.16);
});
def('miniBall', 'low', 1.2, 0.98, 1.0, (b) => {
  // a little mirror ball in a gold cradle
  b.cyl(0.4, 0.46, 0.1, MGOLD_D, 0, 0.05, 0, 0, 0, 0, { seg: 12 }).cyl(0.07, 0.1, 0.2, MGOLD, 0, 0.18, 0, 0, 0, 0, { seg: 8 }).tor(0.26, 0.04, MGOLD, 0, 0.3, 0, PI / 2, 0, 0, { seg: 14 });
  mirrorBallInto(b, 0.36, 0, 0.6, 0);
  sparkleInto(b, 0.3, 0.86, 0.22, 0.14); sparkleInto(b, -0.32, 0.5, 0.26, 0.1);
});
def('standMirror', 'tall', 1.5, 2.8, 1.0, (b) => {
  // a tall dressing mirror in a gold frame
  for (const sx of [-1, 1]) {
    b.cyl(0.08, 0.08, 2.1, MGOLD, sx * 0.64, 1.15, 0, 0, 0, 0, { seg: 8 }).sph(0.11, MGOLD_D, sx * 0.64, 2.22, 0, 1, 1, 1, { seg: 7 });
    b.box(0.14, 0.1, 0.9, MGOLD_D, sx * 0.64, 0.06, 0).sph(0.08, MGOLD, sx * 0.64, 0.08, 0.45, 1, 1, 1, { seg: 6 }).sph(0.08, MGOLD, sx * 0.64, 0.08, -0.45, 1, 1, 1, { seg: 6 });
  }
  b.tor(0.64, 0.08, MGOLD, 0, 2.15, 0, 0, 0, 0, { arc: PI, seg: 14 }).box(1.36, 0.12, 0.12, MGOLD, 0, 0.34, 0);
  b.cyl(0.6, 0.6, 0.05, 0xb8c4d0, 0, 2.15, -0.03, PI / 2, 0, 0, { seg: 20 }).box(1.2, 1.8, 0.05, 0xb8c4d0, 0, 1.28, -0.03);
  glassInto(b, 1.16, 1.78, 0, 0.4, 0.01);
  b.add(new THREE.CylinderGeometry(0.58, 0.58, 0.03, 20, 1, false, -PI / 2, PI), glassCol(0.4, 2.33), 0, 2.17, 0.01, PI / 2, 0, 0, 1, 1, 1, { glow: true, grad: 1 });
  b.sph(0.14, MGOLD_D, 0, 2.82, 0, 1, 1, 0.7, { seg: 8 }).cone(0.08, 0.2, MGOLD, 0, 2.98, 0, 0, 0, 0, { seg: 6 });
});
def('mirrorPillar', 'tall', 1.3, 2.9, 1.3, (b) => {
  // an obelisk of looking-glass
  b.box(1.2, 0.2, 1.2, MGOLD_D, 0, 0.1, 0).box(1.0, 0.14, 1.0, MGOLD, 0, 0.27, 0);
  b.add(new THREE.CylinderGeometry(0.42, 0.62, 2.2, 4, 8), glassCol(0.34, 2.2), 0, 1.44, 0, 0, PI / 4, 0, 1, 1, 1, { glow: true, grad: 1 });
  for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2; b.cyl(0.03, 0.035, 2.22, MGOLD, Math.sin(a) * 0.52, 1.44, Math.cos(a) * 0.52, Math.cos(a) * -0.09, 0, Math.sin(a) * 0.09, { seg: 5 }); }
  b.box(0.66, 0.08, 0.66, MGOLD, 0, 2.56, 0).cone(0.44, 0.36, MGOLD_D, 0, 2.78, 0, 0, PI / 4, 0, { seg: 4 });
  sparkleInto(b, 0.38, 2.2, 0.45, 0.2);
});
def('wonkyMirror', 'tall', 1.6, 2.7, 1.0, (b) => {
  // a wobbly mirror from the hall of mirrors, in a striped frame
  for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) b.cyl(0.1, 0.1, 0.3, i % 2 ? 0xfffdf6 : 0xe5383b, sx * 0.7, 0.3 + i * 0.3, 0, 0, 0, 0, { seg: 8 });
  b.box(1.6, 0.16, 0.5, 0x3a4a8a, 0, 0.08, 0).box(1.62, 0.2, 0.3, 0x3a4a8a, 0, 2.6, 0);
  for (let i = 0; i < 5; i++) b.sph(0.07, i % 2 ? 0xffe27a : 0xffffff, -0.6 + i * 0.3, 2.62, 0.17, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  b.box(1.24, 2.34, 0.05, 0xb8c4d0, 0, 1.33, -0.04);
  // the glass bulges in and out
  b.add(new THREE.BoxGeometry(1.2, 2.3, 0.03, 8, 16, 1), glassCol(0.18, 2.3, 0.3), 0, 1.33, 0, 0, 0, 0, 1, 1, 1, { glow: true, grad: 1 });
  for (const [y, r, c] of [[0.75, 0.42, 0xd8f0ff], [1.5, 0.3, 0xffffff], [2.1, 0.22, 0xd8f0ff]]) b.add(new THREE.SphereGeometry(1, 12, 8), glassCol(y - r, r * 2, y), 0, y, 0.02, 0, 0, 0, r * 1.15, r, 0.05, { glow: true, grad: 1 });
});
def('prismTower', 'tall', 1.4, 2.8, 1.2, (b) => {
  // crystals growing out of a pearl rock, shining in every colour
  b.sph(0.66, PEARL, 0, 0.12, 0, 1, 0.34, 0.9, { seg: 10 });
  for (const [x, z, s, i, rz] of [[0, 0, 2.05, 1, 0], [-0.36, 0.1, 1.3, 0, 0.22], [0.38, 0.05, 1.45, 3, -0.2], [0.1, 0.34, 0.9, 2, -0.08], [-0.12, -0.3, 1.1, 4, 0.1]]) {
    b.add(new THREE.CylinderGeometry(0.2, 0.24, s * 0.82, 6), GEMS[i], x + Math.sin(-rz) * s * 0.4, 0.1 + s * 0.41, z, 0, i, rz, 1, 1, 1, { glow: true, grad: 0.62 });
    b.add(new THREE.ConeGeometry(0.2, s * 0.3, 6), 0xffffff, x + Math.sin(-rz) * s * 0.96, 0.1 + s * 0.96, z, 0, i, rz, 1, 1, 1, { glow: true, grad: 0.8 });
  }
  sparkleInto(b, -0.45, 2.1, 0.3, 0.2); sparkleInto(b, 0.5, 1.2, 0.4, 0.13);
});
def('vanity', 'tall', 1.8, 2.6, 1.1, (b) => {
  // a dressing table with a round mirror ringed with light bulbs
  b.box(1.7, 0.1, 0.8, PEARL, 0, 0.9, 0).box(1.6, 0.3, 0.72, 0xff9fd0, 0, 0.72, 0);
  for (const sx of [-1, 1]) { for (const sz of [-1, 1]) b.cyl(0.05, 0.035, 0.6, MGOLD, sx * 0.72, 0.3, sz * 0.3, 0, 0, 0, { seg: 6 }); b.sph(0.045, MGOLD, sx * 0.36, 0.72, 0.37, 1, 1, 1, { seg: 6 }); }
  b.cyl(0.1, 0.16, 0.2, MGOLD, 0, 1.05, -0.2, 0, 0, 0, { seg: 8 }).cyl(0.82, 0.82, 0.08, MGOLD, 0, 1.86, -0.2, PI / 2, 0, 0, { seg: 22 });
  ovalGlassInto(b, 0.7, 0.7, 0, 1.86, -0.15);
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; b.sph(0.075, i % 2 ? 0xfff3a8 : 0xffffff, Math.cos(a) * 0.79, 1.86 + Math.sin(a) * 0.79, -0.12, 1, 1, 1, { glow: true, seg: 6, grad: 1 }); }
  b.cyl(0.09, 0.11, 0.24, 0x8fe6ff, -0.55, 1.07, 0.1, 0, 0, 0, { seg: 8 }).sph(0.06, MGOLD, -0.55, 1.23, 0.1, 1, 1, 1, { seg: 6 });
  b.cyl(0.13, 0.13, 0.1, 0xc8a8ff, 0.5, 1.0, 0.12, 0, 0, 0, { seg: 10 }).box(0.34, 0.03, 0.08, MGOLD, 0.15, 0.97, 0.22, 0, 0.5, 0);
});
def('mirrorBall', 'low', 1.1, 1.0, 1.0, (b) => {
  // a mirror ball that has got loose and rolls down the lane
  mirrorBallInto(b, 0.5, 0, 0, 0);
  b.tor(0.5, 0.025, MGOLD, 0, 0, 0, 0, PI / 2, 0, { seg: 18, tseg: 4 });
}, { center: true });
def('sparkle', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the flying mirror flashes down the lane: a dazzle of light
  sparkleInto(b, 0, 0, 0, 0.5, 0xfffbe0);
  b.add(new THREE.OctahedronGeometry(1), 0xffffff, 0, 0, 0, 0, 0, PI / 4, 0.3, 0.3, 0.12, { glow: true, grad: 1 });
  b.sph(0.2, 0xffffff, 0, 0, 0, 1, 1, 1, { glow: true, seg: 8, grad: 1 });
}, { center: true });
def('mirrorCart', 'low', 1.5, 0.98, 1.1, (b) => {
  // a runaway gold trolley carrying a looking-glass; it faces +x
  b.box(1.4, 0.08, 0.9, MGOLD, 0, 0.26, 0).box(1.3, 0.05, 0.8, 0xc23b6a, 0, 0.32, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.12, 0.12, 0.07, 0x3a4252, sx * 0.5, 0.12, sz * 0.44, PI / 2, 0, 0, { seg: 10 }).cyl(0.05, 0.05, 0.09, MGOLD, sx * 0.5, 0.12, sz * 0.44, PI / 2, 0, 0, { seg: 6 });
  b.cyl(0.025, 0.025, 0.5, MGOLD_D, -0.66, 0.56, 0.36, 0, 0, 0.2, { seg: 5 }).cyl(0.025, 0.025, 0.5, MGOLD_D, -0.66, 0.56, -0.36, 0, 0, 0.2, { seg: 5 }).cyl(0.03, 0.03, 0.76, MGOLD, -0.71, 0.8, 0, PI / 2, 0, 0, { seg: 6 });
  b.box(0.95, 0.6, 0.1, MGOLD, 0.1, 0.65, 0, 0, 0.5, 0);
  b.add(new THREE.BoxGeometry(0.8, 0.46, 0.03, 5, 4, 1), glassCol(0.4, 0.5), 0.1, 0.65, 0, 0, 0.5, 0, 1, 1, 4, { glow: true, grad: 1 });
});
def('flashMirror', 'deco', 2.2, 1.6, 1.3, (b) => {
  // a cheeky flying hand mirror that dazzles the lane below
  b.cyl(0.56, 0.56, 0.1, MGOLD, 0, 0.1, 0, PI / 2, 0, 0, { seg: 20 }).tor(0.56, 0.06, MGOLD_D, 0, 0.1, 0, 0, 0, 0, { seg: 20 });
  ovalGlassInto(b, 0.48, 0.48, 0, 0.1, 0.05);
  b.cap(0.08, 0.34, MGOLD, 0, -0.68, 0, 0, 0, 0, { seg: 8 }).sph(0.11, MGOLD_D, 0, -0.92, 0, 1, 1, 1, { seg: 7 }).sph(0.1, MGOLD_D, 0, -0.45, 0, 1.3, 0.8, 1, { seg: 7 });
  for (const sx of [-1, 1]) {
    b.sph(0.1, 0xffffff, sx * 0.17, 0.2, 0.09, 1, 1.15, 0.4, { glow: true, seg: 8, grad: 1 }).sph(0.055, 0x1b1f24, sx * 0.16, 0.18, 0.12, 1, 1.1, 0.4, { glow: true, seg: 6, grad: 1 });
    b.box(0.18, 0.035, 0.02, 0x3a4a8a, sx * 0.17, 0.36, 0.1, 0, 0, sx * -0.4, { glow: true, grad: 1 }).sph(0.07, 0xff9fc0, sx * 0.3, 0.02, 0.09, 1, 0.7, 0.3, { glow: true, seg: 6, grad: 1 });
  }
  b.tor(0.1, 0.02, 0x3a4a8a, 0, -0.02, 0.1, 0, 0, PI, { arc: PI, seg: 7, glow: true, grad: 1 });
  b.sph(0.08, MGOLD_D, 0, 0.72, 0, 1.6, 1, 1, { seg: 6 });
}, {
  wings: (b, sx) => {
    b.sph(0.4, 0xffffff, sx * 0.46, 0, 0, 1.2, 0.1, 0.55, { seg: 9 });
    for (let i = 0; i < 3; i++) b.sph(0.16, 0xeaf6ff, sx * (0.74 + i * 0.1), 0.005, 0.2 - i * 0.2, 1.3, 0.1, 0.5, { seg: 6 });
  }, wingAt: [0.5, 0.1, -0.05],
});

// ---------- the Museum ----------
export const MARBLE = 0xf4f0e8, MARBLE_D = 0xd9d2c4, VELVET = 0xb0203a, BONE = 0xf6eed8, BONE_D = 0xdccfae, STEEL = 0xc4ccd6, STEEL_D = 0x8c96a4;
// A brass post for a velvet rope.
export function stanchionInto(b, x, z, h = 0.92) {
  b.cyl(0.2, 0.22, 0.06, MGOLD_D, x, 0.03, z, 0, 0, 0, { seg: 10 }).cyl(0.04, 0.05, h - 0.1, MGOLD, x, h / 2, z, 0, 0, 0, { seg: 7 }).sph(0.085, MGOLD, x, h - 0.03, z, 1, 1, 1, { seg: 8 });
}
// A velvet rope sagging between (x0, z0) and (x1, z1), hung at height y.
export function ropeInto(b, x0, z0, x1, z1, y = 0.8, sag = 0.2, col = VELVET) {
  const n = 6, L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
  b.at(x0, 0, z0, ry, () => { for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, a = [u0 * L, y - sag * Math.sin(PI * u0)], c = [u1 * L, y - sag * Math.sin(PI * u1)]; b.cyl(0.04, 0.04, Math.hypot(c[0] - a[0], c[1] - a[1]) + 0.03, col, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0, 0, 0, Math.atan2(c[1] - a[1], c[0] - a[0]) - PI / 2, { seg: 6 }); } });
}
// A marble plinth, w square and h high, standing on (x, y, z).
export function plinthInto(b, w, h, x, y, z) {
  b.box(w + 0.16, 0.12, w + 0.16, MARBLE_D, x, y + 0.06, z).box(w, h - 0.22, w, MARBLE, x, y + h / 2, z).box(w + 0.14, 0.1, w + 0.14, MARBLE_D, x, y + h - 0.05, z);
}
// A fluted column, h high.
export function columnInto(b, r, h, x, y, z) {
  b.box(r * 2.7, 0.2, r * 2.7, MARBLE_D, x, y + 0.1, z).cyl(r * 1.15, r * 1.25, 0.16, MARBLE, x, y + 0.28, z, 0, 0, 0, { seg: 12 }).cyl(r * 0.88, r, h - 0.7, MARBLE, x, y + h / 2, z, 0, 0, 0, { seg: 12 });
  b.cyl(r * 1.2, r * 0.9, 0.18, MARBLE, x, y + h - 0.27, z, 0, 0, 0, { seg: 12 }).box(r * 2.7, 0.18, r * 2.7, MARBLE_D, x, y + h - 0.09, z);
}
// A marble head and shoulders; it faces +z and is about 1.15 s high.
export function bustInto(b, x, y, z, s = 1, col = MARBLE) {
  b.at(x, y, z, 0, () => {
    b.sph(0.46, col, 0, 0.2, 0, 1, 0.5, 0.6, { seg: 12 }).cyl(0.22, 0.3, 0.14, col, 0, 0.04, 0, 0, 0, 0, { seg: 10 }).cyl(0.12, 0.15, 0.24, col, 0, 0.5, 0, 0, 0, 0, { seg: 8 });
    b.sph(0.27, col, 0, 0.82, 0.02, 0.92, 1.05, 1, { seg: 12 }).sph(0.05, col, 0, 0.8, 0.28, 0.8, 1.3, 1, { seg: 6 }).sph(0.29, MARBLE_D, 0, 0.9, -0.05, 0.98, 0.9, 0.95, { seg: 10 });
    for (const sx of [-1, 1]) b.sph(0.035, 0x6a6258, sx * 0.1, 0.86, 0.25, 1, 1, 0.5, { seg: 5 }).sph(0.06, col, sx * 0.27, 0.8, 0, 0.5, 1, 0.8, { seg: 5 });
    b.tor(0.07, 0.014, 0x6a6258, 0, 0.72, 0.25, 0, 0, PI, { arc: PI, seg: 6 });
    for (let i = 0; i < 7; i++) b.sph(0.06, MGOLD, Math.cos(PI * i / 6) * 0.25, 1.0 + Math.sin(PI * i / 6) * 0.07, Math.sin(PI * i / 6) * 0.1 - 0.02, 1, 0.6, 1.2, { seg: 5 });
  }, s);
}
// A big painted vase, about 2 s high.
export function vaseInto(b, x, y, z, s = 1, c1 = 0xfdfaf2, c2 = 0x2f62c0) {
  b.at(x, y, z, 0, () => {
    b.cyl(0.3, 0.36, 0.14, c2, 0, 0.07, 0, 0, 0, 0, { seg: 12 }).cyl(0.2, 0.3, 0.2, c1, 0, 0.24, 0, 0, 0, 0, { seg: 12 }).sph(0.56, c1, 0, 0.92, 0, 1, 1.15, 1, { seg: 14 });
    b.cyl(0.3, 0.22, 0.4, c1, 0, 1.62, 0, 0, 0, 0, { seg: 12 }).cyl(0.36, 0.3, 0.1, c2, 0, 1.87, 0, 0, 0, 0, { seg: 12 });
    for (const yy of [0.55, 1.3]) b.tor(0.47, 0.035, c2, 0, yy, 0, PI / 2, 0, 0, { seg: 14, tseg: 5 });
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; b.sph(0.11, c2, Math.cos(a) * 0.55, 0.95, Math.sin(a) * 0.55, 1, 1.5, 0.35, { seg: 6 }).sph(0.05, MGOLD, Math.cos(a + 0.52) * 0.56, 0.95, Math.sin(a + 0.52) * 0.56, 1, 1, 1, { seg: 5 }); }
    for (const sx of [-1, 1]) b.tor(0.2, 0.04, c2, sx * 0.42, 1.5, 0, 0, 0, sx * -0.5, { arc: PI * 1.1, seg: 8 });
  }, s);
}
// A suit of armour, standing to attention with a shield; it faces +z and is about 2.3 s high.
export function armourInto(b, x, y, z, s = 1) {
  b.at(x, y, z, 0, () => {
    for (const sx of [-1, 1]) {
      b.cap(0.12, 0.6, STEEL, sx * 0.17, 0.52, 0, 0, 0, 0, { seg: 8 }).sph(0.14, STEEL_D, sx * 0.17, 0.62, 0.04, 1, 0.8, 1, { seg: 7 }).sph(0.16, STEEL_D, sx * 0.17, 0.08, 0.08, 0.9, 0.55, 1.5, { seg: 7 });
      b.sph(0.2, STEEL_D, sx * 0.46, 1.58, 0, 1, 0.8, 1, { seg: 8 }).cap(0.09, 0.5, STEEL, sx * 0.52, 1.2, 0.02, 0, 0, sx * 0.1, { seg: 7 }).sph(0.11, STEEL_D, sx * 0.56, 0.86, 0.04, 1, 1, 1, { seg: 6 });
    }
    b.sph(0.4, STEEL, 0, 1.36, 0, 1, 1.0, 0.72, { seg: 12 }).cyl(0.3, 0.36, 0.3, STEEL_D, 0, 0.98, 0, 0, 0, 0, { seg: 10 }).box(0.06, 0.5, 0.03, MGOLD, 0, 1.4, 0.28);
    b.sph(0.25, STEEL, 0, 1.98, 0, 1, 1.12, 1, { seg: 12 }).box(0.34, 0.05, 0.1, 0x2a2f38, 0, 2.02, 0.21).box(0.04, 0.22, 0.1, STEEL_D, 0, 1.9, 0.23).cyl(0.2, 0.24, 0.1, STEEL_D, 0, 1.74, 0, 0, 0, 0, { seg: 10 });
    for (let i = 0; i < 5; i++) b.sph(0.1, 0xd2302c, 0, 2.3 + Math.sin(i * 0.7) * 0.1, 0.04 - i * 0.09, 0.7, 1.2 - i * 0.1, 1, { seg: 6 });
    // the shield, on the left arm
    b.cyl(0.36, 0.36, 0.06, 0x2f62c0, -0.56, 1.05, 0.2, PI / 2, 0, 0, { seg: 5 }).cyl(0.2, 0.2, 0.07, MGOLD, -0.56, 1.05, 0.21, PI / 2, 0, 0, { seg: 5 }).sph(0.07, STEEL, -0.56, 1.05, 0.26, 1, 1, 0.6, { seg: 6 });
    b.cyl(0.02, 0.02, 2.1, 0x8a5a3c, 0.6, 1.05, 0.1, 0, 0, 0, { seg: 5 }).box(0.26, 0.3, 0.03, STEEL, 0.6, 2.1, 0.1).cone(0.05, 0.3, STEEL, 0.6, 2.38, 0.1, 0, 0, 0, { seg: 5 });
  }, s);
}
// A painted mummy case, standing up; friendly, with a big smile. It faces +z and is about 2.4 s high.
export function mummyInto(b, x, y, z, s = 1) {
  const BL = 0x2f62c0, TQ = 0x3fc0b0;
  b.at(x, y, z, 0, () => {
    b.cap(0.42, 1.2, MGOLD, 0, 1.0, 0, 0, 0, 0, { seg: 12 }).sph(0.4, MGOLD, 0, 0.3, 0.06, 1, 0.6, 1.1, { seg: 10 });
    for (let i = 0; i < 6; i++) b.tor(0.425, 0.035, [BL, TQ, 0xd2302c][i % 3], 0, 0.5 + i * 0.17, 0, PI / 2, 0, 0, { seg: 14, tseg: 5 });
    b.sph(0.5, BL, 0, 1.95, -0.06, 1, 1.05, 0.8, { seg: 12 }).sph(0.3, 0xf2c98a, 0, 1.92, 0.2, 1, 1.1, 0.7, { seg: 10 });
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) b.box(0.16, 0.05, 0.1, MGOLD, sx * 0.4, 1.56 + i * 0.16, 0.16, 0, sx * 0.5, 0);
    for (const sx of [-1, 1]) b.sph(0.06, 0xffffff, sx * 0.11, 1.98, 0.39, 1, 0.8, 0.4, { seg: 6, grad: 1 }).sph(0.035, 0x1b1f24, sx * 0.11, 1.98, 0.41, 1, 1, 0.4, { seg: 5, grad: 1 }).box(0.16, 0.025, 0.02, 0x1b1f24, sx * 0.14, 2.05, 0.4, 0, 0, sx * 0.1);
    b.tor(0.08, 0.016, 0x8a3a2a, 0, 1.84, 0.4, 0, 0, PI, { arc: PI, seg: 7 }).cyl(0.04, 0.06, 0.24, BL, 0, 1.62, 0.36, 0.2, 0, 0, { seg: 6 });
    b.sph(0.08, MGOLD, 0, 2.42, 0.2, 0.7, 1.5, 0.7, { seg: 6 });
    for (const sx of [-1, 1]) b.cap(0.07, 0.4, 0xf2c98a, sx * 0.12, 1.2, 0.4, 0, 0, sx * 0.9, { seg: 6 });
    b.box(0.03, 0.44, 0.03, TQ, -0.26, 1.26, 0.46, 0, 0, 0.5).box(0.03, 0.44, 0.03, 0xd2302c, 0.26, 1.26, 0.46, 0, 0, -0.5);
  }, s);
}
// A picture in a gold frame, w by h, centred on (x, y, z) and facing +z (turned by ry). Six pictures: 0 a sailing boat, 1 Pixel the cat,
// 2 Izzi the dog, 3 coloured squares, 4 a bowl of fruit, 5 sunflowers.
export function pictureInto(b, w, h, x, y, z, ry = 0, kind = 0) {
  b.at(x, y, z, ry, () => {
    const t = 0.16, u = Math.min(w, h) - 0.3, f = 0.07;
    b.box(w + t * 2, h + t * 2, 0.1, MGOLD, 0, 0, 0).box(w + t * 2 + 0.1, 0.1, 0.16, MGOLD_D, 0, h / 2 + t, 0).box(w + t * 2 + 0.1, 0.1, 0.16, MGOLD_D, 0, -h / 2 - t, 0);
    const bg = [0x8fd0f5, 0x3fb0a0, 0xf08fb0, 0xfdf6e6, 0x6a4a8a, 0x8fd0f5][kind];
    b.box(w, h, 0.04, bg, 0, 0, 0.04, 0, 0, 0, { grad: 1 });
    const d = (r, c, px, py, sx = 1, sy = 1) => b.sph(r * u, c, px * u, py * u, f, sx, sy, 0.06, { seg: 10, grad: 1 });
    if (kind === 0) { b.box(w, h * 0.36, 0.05, 0x2f62c0, 0, -h * 0.32, 0.045, 0, 0, 0, { grad: 1 }); d(0.13, 0xffd23f, 0.28, 0.3); b.box(u * 0.5, u * 0.08, 0.03, 0xd2302c, -0.05 * u, -0.14 * u, f); b.flat([[[-0.06 * u, -0.08 * u, f], [-0.06 * u, 0.36 * u, f], [0.22 * u, -0.08 * u, f]], [[-0.1 * u, -0.08 * u, f], [-0.28 * u, -0.08 * u, f], [-0.1 * u, 0.26 * u, f]]], 0xffffff); }
    else if (kind === 1) { d(0.3, 0x24262c, 0, -0.04, 1, 0.92); d(0.16, 0xffffff, 0, -0.14, 1.1, 1); b.flat([[[-0.3 * u, 0.1 * u, f], [-0.24 * u, 0.36 * u, f], [-0.08 * u, 0.2 * u, f]], [[0.3 * u, 0.1 * u, f], [0.08 * u, 0.2 * u, f], [0.24 * u, 0.36 * u, f]]], 0x24262c); for (const sx of [-1, 1]) { d(0.06, 0x9fe04a, sx * 0.12, 0.04, 1, 1.1); b.sph(0.02 * u, 0x1b1f24, sx * 0.12 * u, 0.04 * u, f + 0.012, 1, 2, 0.4, { seg: 5, grad: 1 }); } d(0.03, 0xff9fb0, 0, -0.1); }
    else if (kind === 2) { d(0.3, 0x24262c, 0, 0, 1, 1); d(0.14, 0xffffff, 0, 0.05, 0.7, 2.0); d(0.17, 0xffffff, 0, -0.16, 1.1, 0.9); for (const sx of [-1, 1]) { d(0.12, 0x24262c, sx * 0.27, 0.24, 0.8, 1.2); d(0.04, 0x6a4326, sx * 0.13, 0.06); } d(0.05, 0x1b1f24, 0, -0.1, 1.2, 0.9); d(0.05, 0xff8fa0, 0, -0.25, 1, 1.4); }
    else if (kind === 3) { const cs = [0xd2302c, 0xffd23f, 0x2f62c0, 0xfdf6e6, 0x1b1f24]; let i = 0; for (const [px, py, sw, sh] of [[-0.25, 0.2, 0.4, 0.5], [0.2, 0.28, 0.5, 0.34], [0.26, -0.14, 0.36, 0.5], [-0.2, -0.26, 0.5, 0.36]]) b.box(sw * w, sh * h, 0.02, cs[i++], px * w, py * h, f, 0, 0, 0, { grad: 1 }); b.box(0.04, h, 0.025, cs[4], -0.02 * w, 0, f + 0.005).box(w, 0.04, 0.025, cs[4], 0, 0.02 * h, f + 0.005); }
    else if (kind === 4) { b.box(w, h * 0.3, 0.05, 0x8a5a3c, 0, -h * 0.35, 0.045, 0, 0, 0, { grad: 1 }); d(0.26, 0xfdf6e6, 0, -0.18, 1.3, 0.55); d(0.11, 0xe5283b, -0.14, 0.0); d(0.11, 0xffd23f, 0.02, 0.05, 1.5, 0.7); d(0.1, 0xff8a3c, 0.16, 0.0); d(0.08, 0x6fc24a, 0.04, 0.16); }
    else { b.box(w, h * 0.25, 0.05, 0x6fc24a, 0, -h * 0.375, 0.045, 0, 0, 0, { grad: 1 }); for (const [px, py] of [[-0.2, 0.08], [0.12, 0.2], [0.24, -0.08]]) { b.box(0.03 * u, 0.4 * u, 0.02, 0x3f9a4a, px * u, (py - 0.22) * u, f - 0.01); for (let i = 0; i < 8; i++) d(0.05, 0xffd23f, px + Math.cos(i * 0.785) * 0.1, py + Math.sin(i * 0.785) * 0.1); d(0.07, 0x6a4326, px, py); } }
  });
}
def('ropeBarrier', 'low', 1.6, 0.96, 0.6, (b) => {
  // "keep back, please": a velvet rope between two brass posts
  for (const sx of [-1, 1]) stanchionInto(b, sx * 0.68, 0);
  ropeInto(b, -0.68, 0, 0.68, 0, 0.82, 0.2);
});
def('displayCase', 'low', 1.4, 0.96, 1.0, (b) => {
  // a show case with a crown in it
  b.box(1.3, 0.42, 0.9, 0x6a4326, 0, 0.21, 0).box(1.36, 0.06, 0.96, 0x8a5a3c, 0, 0.45, 0).box(1.1, 0.07, 0.7, VELVET, 0, 0.5, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.035, 0.46, 0.035, MGOLD, sx * 0.64, 0.7, sz * 0.44);
  b.box(1.32, 0.035, 0.035, MGOLD, 0, 0.93, 0.44).box(1.32, 0.035, 0.035, MGOLD, 0, 0.93, -0.44).box(0.035, 0.035, 0.92, MGOLD, 0.64, 0.93, 0).box(0.035, 0.035, 0.92, MGOLD, -0.64, 0.93, 0);
  b.cyl(0.2, 0.2, 0.14, MGOLD, 0, 0.6, 0, 0, 0, 0, { seg: 12 });
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; b.cone(0.06, 0.16, MGOLD, Math.cos(a) * 0.18, 0.74, Math.sin(a) * 0.18, 0, 0, 0, { seg: 5 }).sph(0.035, [0xe5283b, 0x3f8fe0, 0x4fae56][i % 3], Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2, 1, 1, 1, { seg: 5 }); }
  b.box(0.3, 0.02, 0.003, 0xffffff, -0.3, 0.75, 0.45, 0, 0, 0.7, { glow: true, grad: 1 }).box(0.16, 0.02, 0.003, 0xffffff, -0.16, 0.72, 0.45, 0, 0, 0.7, { glow: true, grad: 1 });
});
def('dinoEggs', 'low', 1.4, 0.95, 1.1, (b) => {
  // a nest of dinosaur eggs, and one of them is hatching
  b.tor(0.5, 0.17, 0xb98a3a, 0, 0.17, 0, PI / 2, 0, 0, { seg: 14 }).cyl(0.5, 0.5, 0.1, 0x8a6a34, 0, 0.1, 0, 0, 0, 0, { seg: 12 });
  for (let i = 0; i < 9; i++) b.box(0.5, 0.03, 0.03, STRAW, Math.cos(i * 0.7) * 0.5, 0.3 + (i % 3) * 0.03, Math.sin(i * 0.7) * 0.5, 0, -i * 0.7 + 1.4, 0.2);
  for (const [x, z, r] of [[-0.24, 0.1, 0.2], [0.26, 0.16, -0.25]]) { b.sph(0.21, 0xfdf3dc, x, 0.46, z, 1, 1.3, 1, { seg: 10 }); for (let i = 0; i < 5; i++) b.sph(0.035, 0x9fb8a0, x + Math.cos(i * 1.3) * 0.17, 0.4 + (i % 3) * 0.1, z + Math.sin(i * 1.3) * 0.17, 1, 1, 1, { seg: 5 }); }
  b.sph(0.2, 0xfdf3dc, 0.02, 0.36, -0.2, 1, 0.9, 1, { seg: 10 });
  b.sph(0.16, 0x6fc24a, 0.02, 0.62, -0.18, 1, 0.95, 1.1, { seg: 9 }).sph(0.09, 0x6fc24a, 0.02, 0.58, -0.04, 1, 0.8, 1, { seg: 7 });
  for (const sx of [-1, 1]) b.sph(0.05, 0xffffff, 0.02 + sx * 0.08, 0.7, -0.07, 1, 1, 0.6, { seg: 6, grad: 1 }).sph(0.026, 0x1b1f24, 0.02 + sx * 0.08, 0.7, -0.035, 1, 1, 0.6, { seg: 5, grad: 1 });
  b.sph(0.08, 0xfdf3dc, 0.04, 0.8, -0.24, 1.2, 0.5, 1.2, { seg: 6 });
});
def('noTouch', 'low', 1.2, 0.98, 0.8, (b) => {
  // "please do not touch"
  b.cyl(0.28, 0.3, 0.06, MGOLD_D, 0, 0.03, 0, 0, 0, 0, { seg: 12 }).cyl(0.035, 0.035, 0.42, MGOLD, 0, 0.24, 0, 0, 0, 0, { seg: 6 });
  b.box(0.96, 0.56, 0.05, 0xfdfaf2, 0, 0.68, 0, -0.12, 0, 0).box(1.02, 0.62, 0.03, MGOLD, 0, 0.68, -0.02, -0.12, 0, 0);
  b.at(0, 0.68, 0.04, 0, () => {
    b.box(0.16, 0.14, 0.02, 0xf2c98a, 0, -0.06, 0); for (let i = 0; i < 4; i++) b.box(0.03, 0.14 - Math.abs(i - 1.5) * 0.02, 0.02, 0xf2c98a, -0.06 + i * 0.04, 0.07, 0);
    b.box(0.035, 0.09, 0.02, 0xf2c98a, 0.1, -0.03, 0, 0, 0, -0.7);
    b.tor(0.2, 0.03, 0xd2302c, 0, 0, 0.01, 0, 0, 0, { seg: 18, tseg: 5 }).box(0.38, 0.04, 0.02, 0xd2302c, 0, 0, 0.012, 0, 0, 0.785);
  });
});
def('artCrate', 'low', 1.4, 0.94, 1.1, (b) => {
  // a packing case, with the corner of a painting showing
  b.at(0, 0, 0, -0.12, () => crateInto(b, 1.25, 0.84, 1.0, 0xc9a26b, 0x8a6a48));
  b.box(0.5, 0.36, 0.06, MGOLD, 0.2, 0.9, 0.0, 0, -0.12, 0.3).box(0.38, 0.26, 0.07, 0x8fd0f5, 0.2, 0.9, 0.0, 0, -0.12, 0.3, { grad: 1 });
  for (let i = 0; i < 6; i++) b.box(0.4, 0.025, 0.025, STRAW, -0.25 + (i % 3) * 0.15, 0.86 + (i % 2) * 0.03, -0.2 + i * 0.07, 0, i * 1.1, 0.25);
  b.cone(0.09, 0.14, 0xd2302c, -0.3, 0.52, 0.51, PI, -0.12, 0, { seg: 8 }).cyl(0.012, 0.012, 0.14, 0xd2302c, -0.3, 0.4, 0.51, 0, 0, 0, { seg: 4 }).cyl(0.06, 0.06, 0.015, 0xd2302c, -0.3, 0.33, 0.51, 0, 0, 0, { seg: 8 });
});
def('statueBust', 'tall', 1.3, 2.8, 1.3, (b) => {
  // a marble head on a column
  columnInto(b, 0.34, 1.6, 0, 0, 0);
  bustInto(b, 0, 1.6, 0, 1.05);
});
def('bigVase', 'tall', 1.4, 2.6, 1.4, (b) => {
  // a priceless vase (mind your elbows)
  plinthInto(b, 0.9, 0.6, 0, 0, 0);
  vaseInto(b, 0, 0.6, 0, 1.0);
});
def('armour', 'tall', 1.6, 2.7, 1.0, (b) => {
  // a suit of armour standing guard
  b.cyl(0.6, 0.66, 0.18, MARBLE_D, 0, 0.09, 0, 0, 0, 0, { seg: 12 });
  armourInto(b, 0, 0.18, 0, 1.04);
});
def('easel', 'tall', 1.6, 2.7, 1.2, (b) => {
  // a painting on an easel
  for (const sx of [-1, 1]) b.box(0.08, 2.7, 0.08, 0x8a5a3c, sx * 0.5, 1.33, 0.12, -0.12, 0, sx * -0.14);
  b.box(0.08, 2.6, 0.08, 0x8a5a3c, 0, 1.28, -0.32, 0.26, 0, 0).box(1.3, 0.08, 0.2, 0x6a4326, 0, 0.92, 0.26);
  pictureInto(b, 1.1, 1.3, 0, 1.75, 0.2, 0, 0);
  b.sph(0.1, 0xd2302c, 0.36, 1.0, 0.36, 1, 0.5, 1, { seg: 6 }).sph(0.1, 0xffd23f, 0.16, 1.0, 0.36, 1, 0.5, 1, { seg: 6 }).sph(0.1, 0x2f62c0, -0.04, 1.0, 0.36, 1, 0.5, 1, { seg: 6 });
});
def('mummyCase', 'tall', 1.3, 2.75, 1.1, (b) => {
  // a painted mummy case, smiling politely
  b.box(1.1, 0.2, 0.9, MARBLE_D, 0, 0.1, 0);
  mummyInto(b, 0, 0.2, 0, 1.03);
});
def('globe', 'low', 1.1, 1.0, 1.0, (b) => {
  // the museum's globe has rolled off its stand
  b.sph(0.5, 0x3f8fe0, 0, 0, 0, 1, 1, 1, { seg: 18, grad: 0.85 });
  for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9, ph = Math.acos(1 - 2 * u), th = i * 2.4, r = 0.46; b.sph(0.2 - (i % 3) * 0.04, i % 4 === 3 ? 0xe6c462 : 0x4fae56, Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r, Math.sin(ph) * Math.sin(th) * r, 1.2, 0.5 + (i % 2) * 0.4, 1, { seg: 7 }); }
  b.tor(0.52, 0.02, MGOLD, 0, 0, 0, 0, PI / 2, 0, { seg: 18, tseg: 4 });
}, { center: true });
def('ammonite', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the little pterodactyl drops: a fossil that rolls like a wheel
  b.cyl(0.46, 0.46, 0.22, 0xc9a87a, 0, 0, 0, 0, 0, PI / 2, { seg: 18 });
  for (const sx of [-1, 1]) { for (let i = 0; i < 4; i++) b.tor(0.4 - i * 0.1, 0.035, i % 2 ? 0xb08a5a : 0xe0c49a, sx * 0.115, 0, (i % 2) * 0.03, 0, PI / 2, 0, { seg: 14, tseg: 5 }); b.sph(0.07, 0xb08a5a, sx * 0.13, 0, 0, 0.5, 1, 1, { seg: 6 }); }
  for (let i = 0; i < 12; i++) b.box(0.24, 0.05, 0.03, 0xb08a5a, 0, Math.cos(i * PI / 6) * 0.46, Math.sin(i * PI / 6) * 0.46, i * PI / 6, 0, 0);
}, { center: true });
def('polisher', 'low', 1.5, 0.98, 1.1, (b) => {
  // a floor polisher that has set off on its own; it faces +x
  b.sph(0.5, 0xffc928, 0, 0.42, 0, 1.2, 0.6, 0.95, { seg: 12 }).cyl(0.56, 0.56, 0.1, 0x3a4252, 0.1, 0.1, 0, 0, 0, 0, { seg: 16 }).cyl(0.6, 0.6, 0.04, 0xfdfaf2, 0.1, 0.03, 0, 0, 0, 0, { seg: 16 });
  b.cyl(0.03, 0.03, 0.7, STEEL, -0.52, 0.66, 0, 0, 0, 0.5, { seg: 6 }).cyl(0.035, 0.035, 0.5, 0x3a4252, -0.7, 0.94, 0, PI / 2, 0, 0, { seg: 6 });
  for (const sz of [-1, 1]) b.sph(0.11, 0xffffff, 0.5, 0.56, sz * 0.17, 0.5, 1.1, 1, { seg: 8, grad: 1 }).sph(0.055, 0x1b1f24, 0.55, 0.55, sz * 0.17, 0.5, 1, 1, { seg: 6, grad: 1 });
  b.tor(0.1, 0.02, 0x8a3a2a, 0.58, 0.4, 0, PI / 2, PI / 2, 0, { arc: PI, seg: 7 }).sph(0.07, 0xe5283b, 0, 0.74, 0, 1, 0.8, 1, { glow: true, seg: 6, grad: 1 });
  b.box(0.5, 0.05, 0.02, 0x3a4252, 0, 0.5, 0.47).box(0.5, 0.05, 0.02, 0x3a4252, 0, 0.5, -0.47);
});
def('pteroBones', 'deco', 2.4, 1.2, 1.6, (b) => {
  // a little pterodactyl skeleton that has flapped down off its stand, with a fossil to drop
  b.sph(0.26, BONE, 0, 0, 0, 0.9, 0.8, 1.3, { seg: 10 });
  for (let i = 0; i < 4; i++) b.tor(0.25, 0.028, BONE_D, 0, 0, -0.24 + i * 0.16, 0, 0, 0, { seg: 10, tseg: 4 });
  b.cyl(0.05, 0.05, 0.3, BONE, 0, 0.12, 0.42, 1.0, 0, 0, { seg: 6 });
  b.sph(0.2, BONE, 0, 0.26, 0.62, 0.9, 0.9, 1.1, { seg: 10 }).cone(0.1, 0.62, BONE, 0, 0.2, 1.08, PI / 2 + 0.1, 0, 0, { seg: 7 }).cone(0.08, 0.5, BONE_D, 0, 0.4, 0.34, -1.1, 0, 0, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.sph(0.085, 0xffffff, sx * 0.12, 0.32, 0.72, 1, 1.1, 0.6, { seg: 8, grad: 1 }).sph(0.045, 0x1b1f24, sx * 0.12, 0.31, 0.76, 1, 1, 0.6, { seg: 6, grad: 1 });
    b.cap(0.025, 0.2, BONE_D, sx * 0.1, -0.3, -0.05, 0.3, 0, 0, { seg: 5 });
  }
  b.box(0.2, 0.02, 0.02, 0x6a5a48, 0, 0.17, 0.95, 0, 0, 0);
  for (let i = 0; i < 4; i++) b.sph(0.045 - i * 0.006, BONE, 0, -0.02 - i * 0.02, -0.4 - i * 0.13, 1, 1, 1.5, { seg: 5 });
  b.cyl(0.2, 0.2, 0.1, 0xc9a87a, 0, -0.42, 0.05, 0, 0, PI / 2, { seg: 10 });
}, {
  wings: (b, sx) => {
    b.cap(0.035, 0.6, BONE, sx * 0.36, 0, 0.05, 0, 0, PI / 2, { seg: 6 }).cap(0.03, 0.56, BONE, sx * 0.94, 0, -0.06, 0, sx * 0.3, PI / 2, { seg: 6 });
    for (let i = 0; i < 3; i++) b.cap(0.018, 0.4 - i * 0.06, BONE_D, sx * (0.5 + i * 0.26), -0.005, -0.3, PI / 2, 0, sx * 0.25, { seg: 5 });
    b.sph(0.5, 0xfdf3dc, sx * 0.62, -0.012, -0.22, 1.2, 0.03, 0.62, { seg: 9 });
  }, wingAt: [0.2, 0.06, 0],
});

// ---------- Dream Time ----------
export const DREAM = { lilac: 0xc8b8f0, deep: 0x5a4aa8, cream: 0xfff6e0, blue: 0x8fb8f5, pink: 0xf7a8c8, star: 0xffe27a, mint: 0xa8e6cf, teddy: 0xc9955a, teddyL: 0xecd0a0 };
// A plump pillow, lying flat; s is its length.
export function pillowInto(b, x, y, z, s = 1, col = 0xffffff, ry = 0, rz = 0, trim = DREAM.lilac) {
  b.at(x, y, z, ry, () => {
    b.sph(1, col, 0, 0.17 * s, 0, 0.5 * s, 0.17 * s, 0.34 * s, { seg: 12 });
    b.add(new THREE.SphereGeometry(1, 12, 8), col, 0, 0.17 * s, 0, 0, 0, rz, 0.5 * s, 0.17 * s, 0.34 * s);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sph(0.07 * s, trim, sx * 0.43 * s, 0.17 * s, sz * 0.27 * s, 1, 0.7, 1, { seg: 5 });
    b.box(0.9 * s, 0.03 * s, 0.03 * s, trim, 0, 0.17 * s, 0.33 * s).box(0.9 * s, 0.03 * s, 0.03 * s, trim, 0, 0.17 * s, -0.33 * s);
  });
}
// A five-pointed star, flat on to +z.
export function starInto(b, x, y, z, s = 1, col = DREAM.star, o) {
  for (let i = 0; i < 5; i++) { const a = PI / 2 + i * PI * 0.4; b.add(new THREE.ConeGeometry(0.21 * s, 0.56 * s, 4), col, x + Math.cos(a) * 0.36 * s, y + Math.sin(a) * 0.36 * s, z, 0, 0, a - PI / 2, 1, 1, 0.45, o); }
  b.sph(0.3 * s, col, x, y, z, 1, 1, 0.4, { seg: 8, ...o });
}
// A crescent moon, flat on to +z, with a sleepy smile; s is its height.
export function moonInto(b, x, y, z, s = 1, col = 0xfff3b0, o = { glow: true, grad: 0.9 }) {
  for (let i = 0; i <= 12; i++) { const a = -1.9 + i * (3.8 / 12), r = 0.17 * s * Math.sin((i + 0.6) / 13.2 * PI) + 0.02 * s; b.sph(r, col, x - Math.cos(a) * 0.36 * s + 0.1 * s, y + Math.sin(a) * 0.42 * s, z, 1, 1, 0.55, { seg: 8, ...o }); }
  b.tor(0.05 * s, 0.012 * s, 0x6a5a9a, x - 0.22 * s, y + 0.1 * s, z + 0.1 * s, 0, 0, 0, { arc: PI, seg: 6, ...o }).tor(0.07 * s, 0.012 * s, 0x6a5a9a, x - 0.2 * s, y - 0.06 * s, z + 0.1 * s, 0, 0, PI, { arc: PI, seg: 6, ...o });
  b.sph(0.045 * s, 0xffb0c0, x - 0.3 * s, y - 0.02 * s, z + 0.09 * s, 1, 0.7, 0.4, { seg: 5, ...o });
}
// A letter Z, for somebody fast asleep.
export function zedInto(b, x, y, z, s = 1, col = 0xffffff) {
  const o = { glow: true, grad: 1 };
  b.box(0.5 * s, 0.1 * s, 0.06 * s, col, x, y + 0.26 * s, z, 0, 0, 0, o).box(0.5 * s, 0.1 * s, 0.06 * s, col, x, y - 0.26 * s, z, 0, 0, 0, o).box(0.66 * s, 0.1 * s, 0.06 * s, col, x, y, z, 0, 0, 0.9, o);
}
// A nightcap with a bobble, to sit on a head of radius r at (x, y, z); it flops over to one side.
export function nightcapInto(b, x, y, z, r, col = DREAM.blue, side = 1) {
  b.cyl(r * 0.92, r * 1.02, r * 0.3, 0xffffff, x, y, z, 0, 0, 0, { seg: 10 }).cone(r * 0.88, r * 1.3, col, x + side * r * 0.2, y + r * 0.7, z, 0, 0, side * -0.45, { seg: 10 });
  b.cap(r * 0.16, r * 0.6, col, x + side * r * 0.9, y + r * 1.0, z, 0, 0, side * 0.9, { seg: 6 }).sph(r * 0.26, 0xffffff, x + side * r * 1.25, y + r * 0.72, z, 1, 1, 1, { seg: 7 });
}
// A teddy bear facing +z: sitting (about 0.92 s high and 0.85 s wide) or, with o.stand, standing (about 1.5 s high and 0.8 s wide).
export function teddyInto(b, x, y, z, s = 1, o = {}) {
  const T = o.col || DREAM.teddy, L = DREAM.teddyL, st = !!o.stand, by = st ? 0.78 : 0.3, hy = by + 0.44;
  b.at(x, y, z, o.ry || 0, () => {
    b.sph(0.3, o.pj || T, 0, by, 0, 1, st ? 1.25 : 1.05, 0.9, { seg: 12 }).sph(0.19, L, 0, by - 0.02, 0.17, 1, 1.05, 0.6, { seg: 9 });
    if (o.pj) for (let i = 0; i < 3; i++) b.sph(0.03, 0xffffff, 0, by - 0.16 + i * 0.14, 0.28 - Math.abs(i - 1) * 0.02, 1, 1, 0.6, { seg: 5 });
    b.sph(0.24, T, 0, hy, 0.02, 1.05, 0.95, 1, { seg: 12 }).sph(0.11, L, 0, hy - 0.06, 0.2, 1.15, 0.85, 0.8, { seg: 8 }).sph(0.04, 0x3a2a22, 0, hy - 0.02, 0.29, 1.2, 0.8, 0.7, { seg: 6 });
    for (const sx of [-1, 1]) {
      b.sph(0.09, T, sx * 0.19, hy + 0.2, 0, 1, 1, 0.6, { seg: 7 }).sph(0.05, L, sx * 0.19, hy + 0.2, 0.04, 1, 1, 0.5, { seg: 6 });
      if (o.asleep) b.tor(0.04, 0.01, 0x3a2a22, sx * 0.1, hy + 0.04, 0.22, 0, 0, PI, { arc: PI, seg: 6 }); else b.sph(0.03, 0x1b1f24, sx * 0.1, hy + 0.05, 0.22, 1, 1, 0.6, { seg: 6 });
      if (st) { b.cap(0.085, 0.3, o.pj || T, sx * 0.34, by + 0.02, 0.02, 0, 0, sx * 0.3, { seg: 7 }).sph(0.09, T, sx * 0.42, by - 0.2, 0.04, 1, 1, 1, { seg: 6 }); b.cap(0.11, 0.36, o.pj || T, sx * 0.15, 0.3, 0, 0, 0, 0, { seg: 7 }).sph(0.13, T, sx * 0.15, 0.08, 0.05, 1, 0.6, 1.3, { seg: 7 }); }
      else { b.cap(0.085, 0.22, T, sx * 0.32, by + 0.05, 0.1, 0.9, 0, sx * 0.4, { seg: 7 }); b.cap(0.11, 0.2, T, sx * 0.2, 0.12, 0.3, PI / 2, sx * 0.25, 0, { seg: 7 }).sph(0.08, L, sx * 0.25, 0.12, 0.5, 1, 1, 0.4, { seg: 6 }); }
    }
    if (o.cap) nightcapInto(b, 0, hy + 0.18, 0, 0.2, o.cap, 1);
  }, s);
}
// A woolly sheep facing +x, about 0.95 s high; o.ball curls it up into a ball of wool (for rolling).
export function sheepInto(b, x, y, z, s = 1, o = {}) {
  const W = 0xffffff, K = 0x3a3440;
  b.at(x, y, z, o.ry || 0, () => {
    const cy = o.ball ? 0 : 0.52, R = o.ball ? 0.4 : 0.3;
    for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14, ph = Math.acos(1 - 2 * u), th = i * 2.4; b.sph(0.17, i % 3 ? W : 0xf0ecff, Math.sin(ph) * Math.cos(th) * R * (o.ball ? 1 : 1.25), cy + Math.cos(ph) * R, Math.sin(ph) * Math.sin(th) * R, 1, 1, 1, { seg: 7 }); }
    b.sph(R * 0.95, W, 0, cy, 0, o.ball ? 1 : 1.25, 1, 1, { seg: 9 });
    const hx = o.ball ? 0.36 : 0.46, hy = o.ball ? 0.12 : 0.66;
    b.sph(0.15, K, hx, hy, 0, 1.15, 1, 0.9, { seg: 9 }).sph(0.12, W, hx - 0.07, hy + 0.12, 0, 1, 0.7, 1, { seg: 7 });
    for (const sz of [-1, 1]) {
      b.sph(0.06, K, hx - 0.05, hy + 0.05, sz * 0.15, 0.6, 0.5, 1.2, { seg: 5 });
      if (o.asleep || o.ball) b.tor(0.03, 0.008, 0xffffff, hx + 0.1, hy + 0.03, sz * 0.09, 0, PI / 2, PI, { arc: PI, seg: 5 }); else b.sph(0.03, 0xffffff, hx + 0.1, hy + 0.04, sz * 0.08, 0.6, 1, 1, { seg: 5, grad: 1 }).sph(0.015, 0x1b1f24, hx + 0.12, hy + 0.04, sz * 0.08, 0.6, 1, 1, { seg: 4, grad: 1 });
      if (!o.ball) for (const sx of [-1, 1]) b.cap(0.04, 0.2, K, sx * 0.2, 0.14, sz * 0.14, 0, 0, 0, { seg: 5 });
    }
  }, s);
}
def('pillowPile', 'low', 1.5, 0.95, 1.0, (b) => {
  // a heap of pillows
  pillowInto(b, 0, 0, 0, 1.3, 0xffffff, 0.1, 0, DREAM.lilac); pillowInto(b, 0.06, 0.3, 0.02, 1.15, DREAM.pink, -0.25, 0, 0xffffff); pillowInto(b, -0.05, 0.58, 0, 1.0, DREAM.blue, 0.3, 0, 0xffffff);
  starInto(b, 0.3, 0.86, 0.2, 0.2, DREAM.star, { glow: true, grad: 1 });
});
def('sleepyTeddy', 'low', 1.25, 0.98, 1.0, (b) => {
  // a teddy bear, fast asleep in its nightcap
  teddyInto(b, 0, 0, 0, 0.98, { asleep: true, cap: DREAM.pink });
});
def('slippers', 'low', 1.5, 0.85, 1.1, (b) => {
  // a giant pair of bunny slippers
  for (const sx of [-1, 1]) b.at(sx * 0.38, 0, 0, sx * -0.12, () => {
    b.sph(0.34, DREAM.pink, 0, 0.26, 0.05, 1, 0.75, 1.5, { seg: 10 }).sph(0.27, 0xffffff, 0, 0.36, -0.2, 1, 0.5, 1, { seg: 8 }).sph(0.2, 0x6a5a9a, 0, 0.4, -0.22, 1, 0.3, 1, { seg: 7 });
    for (const s2 of [-1, 1]) { b.sph(0.07, DREAM.pink, s2 * 0.12, 0.66, 0.26, 0.8, 2.2, 0.5, { seg: 6 }).sph(0.04, 0xffffff, s2 * 0.12, 0.66, 0.29, 0.8, 2.0, 0.4, { seg: 5 }); b.sph(0.035, 0x1b1f24, s2 * 0.1, 0.42, 0.5, 1, 1, 0.6, { seg: 5 }); }
    b.sph(0.045, 0xff7aa8, 0, 0.34, 0.55, 1.2, 0.8, 0.7, { seg: 5 }).sph(0.06, 0xffffff, 0, 0.2, -0.46, 1, 1, 1, { seg: 5 });
  });
});
def('nightLight', 'low', 1.2, 0.98, 1.0, (b) => {
  // a toadstool night-light
  b.cyl(0.2, 0.28, 0.44, DREAM.cream, 0, 0.22, 0, 0, 0, 0, { seg: 10 }).cyl(0.34, 0.38, 0.06, DREAM.lilac, 0, 0.03, 0, 0, 0, 0, { seg: 12 });
  b.add(new THREE.SphereGeometry(0.52, 14, 8, 0, PI * 2, 0, PI / 2), 0xffb0c8, 0, 0.42, 0, 0, 0, 0, 1, 0.95, 1, { glow: true, grad: 0.8 });
  for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 0.3 + (i % 2) * 0.12; b.sph(0.07, 0xffffff, Math.cos(a) * r, 0.44 + Math.sqrt(Math.max(0, 0.27 - r * r)) * 0.95, Math.sin(a) * r, 1, 0.5, 1, { glow: true, seg: 6, grad: 1 }); }
  for (const sx of [-1, 1]) b.tor(0.03, 0.01, 0x6a5a9a, sx * 0.08, 0.28, 0.2, 0, 0, PI, { arc: PI, seg: 5 });
  b.tor(0.04, 0.01, 0x6a5a9a, 0, 0.18, 0.24, 0, 0, PI, { arc: PI, seg: 5 });
});
def('toyBlocks', 'low', 1.4, 0.96, 1.0, (b) => {
  // building blocks left out at bedtime
  for (const [x, y, z, c, r] of [[-0.3, 0.22, 0, DREAM.blue, 0.15], [0.3, 0.22, 0.05, DREAM.pink, -0.2], [0.02, 0.66, 0, DREAM.mint, 0.4]]) {
    b.box(0.46, 0.44, 0.46, c, x, y, z, 0, r, 0).box(0.36, 0.34, 0.47, 0xffffff, x, y, z, 0, r, 0);
    starInto(b, x + Math.sin(r) * 0.24, y, z + Math.cos(r) * 0.24, 0.16, c);
  }
});
def('grandClock', 'tall', 1.3, 2.9, 1.0, (b) => {
  // a grandfather clock, nodding off
  const WD = 0x7a5a9a, WDD = 0x5a4280;
  b.box(1.0, 0.3, 0.7, WDD, 0, 0.15, 0).box(0.8, 1.4, 0.56, WD, 0, 1.0, 0).box(1.0, 0.9, 0.66, WD, 0, 2.1, 0).box(1.1, 0.12, 0.74, WDD, 0, 2.6, 0);
  b.box(0.5, 1.1, 0.04, 0x2a2450, 0, 1.0, 0.27).cyl(0.012, 0.012, 0.8, DREAM.star, 0.08, 1.15, 0.3, 0, 0, 0.12, { seg: 4 }).sph(0.11, DREAM.star, 0.13, 0.74, 0.3, 1, 1, 0.5, { glow: true, seg: 8, grad: 1 });
  b.cyl(0.38, 0.38, 0.05, DREAM.cream, 0, 2.1, 0.33, PI / 2, 0, 0, { seg: 18 }).tor(0.38, 0.03, DREAM.star, 0, 2.1, 0.35, 0, 0, 0, { seg: 18, tseg: 5 });
  for (const sx of [-1, 1]) b.tor(0.06, 0.014, 0x3a2a5a, sx * 0.14, 2.16, 0.37, 0, 0, PI, { arc: PI, seg: 6 }).sph(0.05, 0xffb0c0, sx * 0.24, 2.04, 0.36, 1, 0.7, 0.4, { seg: 5 });
  b.sph(0.04, 0x3a2a5a, 0, 1.98, 0.37, 1, 1.2, 0.5, { seg: 6 });
  nightcapInto(b, 0, 2.66, 0, 0.36, DREAM.blue, 1);
  zedInto(b, 0.5, 2.5, 0.4, 0.22); zedInto(b, 0.62, 2.78, 0.4, 0.15);
});
def('pillowTower', 'tall', 1.5, 2.75, 1.0, (b) => {
  // a wobbly tower of pillows with a sheep asleep on top
  const cols = [0xffffff, DREAM.pink, DREAM.blue, DREAM.mint, DREAM.lilac, DREAM.cream];
  for (let i = 0; i < 6; i++) pillowInto(b, Math.sin(i * 1.9) * 0.08, i * 0.34, 0, 1.25 - i * 0.03, cols[i], Math.sin(i * 2.3) * 0.3, 0, i % 2 ? 0xffffff : DREAM.lilac);
  sheepInto(b, -0.05, 2.02, 0, 0.72, { asleep: true, ry: -0.5 });
});
def('bigTeddy', 'tall', 1.5, 2.8, 1.0, (b) => {
  // a great big teddy in stripy pyjamas, out of bed
  teddyInto(b, 0, 0, 0, 1.78, { stand: true, pj: DREAM.blue, cap: DREAM.pink });
});
def('moonLamp', 'tall', 1.4, 2.85, 1.0, (b) => {
  // a bedside lamp like a crescent moon, with a star on a string
  b.cyl(0.42, 0.5, 0.14, DREAM.deep, 0, 0.07, 0, 0, 0, 0, { seg: 12 }).cyl(0.05, 0.07, 1.7, DREAM.lilac, 0, 0.98, 0, 0, 0, 0, { seg: 8 }).sph(0.1, DREAM.star, 0, 1.84, 0, 1, 1, 1, { seg: 7 });
  moonInto(b, 0.02, 2.35, 0, 1.15);
  b.cyl(0.008, 0.008, 0.5, 0xffffff, 0.38, 2.36, 0, 0, 0, 0, { seg: 3 });
  starInto(b, 0.38, 2.02, 0, 0.26, DREAM.star, { glow: true, grad: 1 });
});
def('wardrobe', 'tall', 1.6, 2.8, 1.0, (b) => {
  // a wardrobe with the door ajar and a scarf escaping
  const WD = 0x8fb8f5, WDD = 0x6f98d8;
  b.box(1.5, 2.5, 0.8, WD, 0, 1.4, -0.05).box(1.6, 0.14, 0.9, WDD, 0, 2.72, -0.05).box(1.56, 0.16, 0.86, WDD, 0, 0.1, -0.05);
  for (const sx of [-1, 1]) b.sph(0.08, WDD, sx * 0.62, 0.02, 0.2, 1, 0.5, 1, { seg: 6 });
  b.box(0.7, 2.2, 0.05, 0xa8c8fa, -0.37, 1.4, 0.37).box(0.7, 2.2, 0.05, 0xa8c8fa, 0.44, 1.4, 0.5, 0, -0.4, 0).box(0.1, 2.2, 0.3, 0x2a2450, 0.06, 1.4, 0.3);
  b.sph(0.05, DREAM.star, -0.1, 1.4, 0.42, 1, 1, 1, { seg: 6 }).sph(0.05, DREAM.star, 0.2, 1.4, 0.62, 1, 1, 1, { seg: 6 });
  starInto(b, -0.37, 2.1, 0.41, 0.22, DREAM.star); moonInto(b, -0.37, 0.9, 0.41, 0.4, 0xfff3b0, { grad: 1 });
  for (let i = 0; i < 6; i++) b.box(0.16, 0.16, 0.05, i % 2 ? 0xe5483b : 0xffffff, 0.1, 0.95 - i * 0.15, 0.48 + i * 0.012, 0, 0, 0.1);
  b.sph(0.1, DREAM.teddy, 0.1, 1.55, 0.44, 1, 1.4, 0.8, { seg: 6 });
});
def('woolBall', 'low', 1.1, 1.0, 1.0, (b) => {
  // a sheep that has curled up and rolled out of somebody's dream
  sheepInto(b, 0, 0, 0, 1.0, { ball: true, ry: -PI / 2 });
}, { center: true });
def('sockBall', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the owl drops: a rolled-up pair of stripy socks
  b.sph(0.44, 0xffffff, 0, 0, 0, 1, 1, 1, { seg: 14, grad: 0.88 });
  for (let i = 0; i < 4; i++) b.tor(0.44 * Math.cos((i - 1.5) * 0.5), 0.05, i % 2 ? DREAM.pink : DREAM.blue, (i - 1.5) * 0.21, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 5 });
  b.sph(0.14, DREAM.pink, 0, 0.36, 0.2, 1.3, 0.7, 1, { seg: 6 });
}, { center: true });
def('sheepHop', 'low', 1.2, 0.98, 0.9, (b) => {
  // one of the sheep you count, hopping across; it faces +x
  sheepInto(b, 0, 0, 0, 1.0);
  b.cyl(0.07, 0.09, 0.08, DREAM.star, 0.36, 0.5, 0, 0, 0, 0, { seg: 7 });
});
def('nightOwl', 'deco', 2.2, 1.4, 1.3, (b) => {
  // an owl in a nightcap, up past bedtime, with socks to drop
  const O = 0x9a7ab8, OL = 0xe6d8f5;
  b.sph(0.46, O, 0, 0, 0, 1, 1.15, 0.95, { seg: 12 }).sph(0.32, OL, 0, -0.12, 0.2, 1, 1.1, 0.7, { seg: 10 });
  for (let i = 0; i < 5; i++) b.sph(0.05, O, -0.16 + (i % 3) * 0.16, -0.2 + Math.floor(i / 3) * 0.16, 0.42, 1, 0.6, 0.4, { seg: 5 });
  for (const sx of [-1, 1]) {
    b.sph(0.17, 0xffffff, sx * 0.17, 0.2, 0.36, 1, 1, 0.5, { seg: 10, grad: 1 }).sph(0.08, 0x1b1f24, sx * 0.16, 0.19, 0.44, 1, 1, 0.5, { seg: 7, grad: 1 }).sph(0.03, 0xffffff, sx * 0.14, 0.22, 0.48, 1, 1, 0.5, { seg: 5, grad: 1 });
    b.box(0.24, 0.05, 0.04, 0x5a4280, sx * 0.18, 0.39, 0.4, 0, 0, sx * 0.2).cone(0.08, 0.2, O, sx * 0.3, 0.52, 0.05, 0, 0, sx * -0.3, { seg: 5 });
    b.cap(0.03, 0.08, 0xffb347, sx * 0.14, -0.52, 0.12, 0.4, 0, 0, { seg: 5 });
  }
  b.cone(0.07, 0.16, 0xffb347, 0, 0.08, 0.5, PI / 2 + 0.5, 0, 0, { seg: 5 });
  nightcapInto(b, 0, 0.46, 0, 0.3, DREAM.blue, -1);
  b.sph(0.2, 0xffffff, 0, -0.62, 0.1, 1, 1, 1, { seg: 8 }).tor(0.2, 0.03, DREAM.pink, 0, -0.62, 0.1, 0, PI / 2, 0, { seg: 10, tseg: 4 });
}, {
  wings: (b, sx) => {
    b.sph(0.44, 0x9a7ab8, sx * 0.46, 0, 0, 1.25, 0.1, 0.7, { seg: 10 });
    for (let i = 0; i < 4; i++) b.sph(0.17, 0x7a5a9a, sx * (0.78 + i * 0.09), 0.005, 0.26 - i * 0.18, 1.3, 0.1, 0.5, { seg: 6 });
  }, wingAt: [0.3, 0.1, 0],
});

// ---------- Pixel Land ----------
export const PXPAL = { R: 0xe5383b, W: 0xffffff, Y: 0xffd23f, K: 0x24262c, G: 0x7fe04a, P: 0xff8fb0, B: 0x4f8fe0, E: 0x8a5a3c, N: 0x1b1f24, T: 0xff8fa0, O: 0xff8a3c, L: 0x4fae56, D: 0x2f7a34, S: 0x9aa6ae, V: 0xa070e0, C: 0x5ad0e0 };
export const PXART = {
  heart: ['.RR...RR.', 'RWRR.RRRR', 'RRRRRRRRR', 'RRRRRRRRR', '.RRRRRRR.', '..RRRRR..', '...RRR...', '....R....'],
  star: ['....Y....', '....Y....', '...YYY...', 'YYYYYYYYY', '.YYYYYYY.', '..YYYYY..', '..YYYYY..', '.YYY.YYY.', '.Y.....Y.'],
  cat: ['K........K', 'KK......KK', 'KKKKKKKKKK', 'KKKKKKKKKK', 'KGKKKKKKGK', 'KKKWWWWKKK', 'KKWWPPWWKK', '.KWWWWWWK.', '..KKKKKK..'],
  dog: ['KK......KK', 'KKK....KKK', 'KKKKWWKKKK', 'KKKKWWKKKK', 'KEKWWWWKEK', 'KKWWWWWWKK', '.KWWNNWWK.', '.KWWWWWWK.', '..KWTTWK..'],
  smiley: ['..YYYY..', '.YYYYYY.', 'YYKYYKYY', 'YYYYYYYY', 'YKYYYYKY', 'YYKKKKYY', '.YYYYYY.', '..YYYY..'],
  rocket: ['...R...', '..RRR..', '..WWW..', '.WWBWW.', '.WWBWW.', '.WWWWW.', 'RWWWWWR', 'RR.O.RR', '...O...', '...Y...'],
  duck: ['...YYY...', '..YYKY...', '..YYYOO..', '..YYY....', 'YYYYYYY..', 'YYYYYYYY.', '.YYYYYYY.', '..YYYYY..'],
  flower: ['..P.P..', '.PPPPP.', '..PYP..', '.PPPPP.', '..P.P..', '...L...', '.L.L...', '..LL.L.', '...LL..'],
};
// A picture made of cubes: rows of letters (see PXPAL), the top row first; s is the size of a cube. It stands on (x, y, z) and faces +z.
export function pixelArtInto(b, rows, x, y, z, s = 0.2, ry = 0, depth = 1) {
  b.at(x, y, z, ry, () => {
    const w = rows[0].length, h = rows.length;
    rows.forEach((row, j) => { let i = 0; while (i < w) { const c = row[i]; if (c === '.') { i++; continue; } let n = 1; while (i + n < w && row[i + n] === c) n++; b.box(n * s, s, s * depth, PXPAL[c], (i + n / 2 - w / 2) * s, (h - j - 0.5) * s, 0, 0, 0, 0, { grad: 0.92 }); i += n; } });
  });
}
// A cube with a darker rim round its top and foot, like a block out of an old computer game.
export function blockInto(b, s, col, x, y, z, ry = 0, dark) {
  const d = dark ?? new THREE.Color(col).multiplyScalar(0.72).getHex();
  b.box(s, s, s, d, x, y + s / 2, z, 0, ry, 0, { grad: 1 }).box(s * 0.8, s * 0.8, s * 1.02, col, x, y + s / 2, z, 0, ry, 0, { grad: 1 }).box(s * 1.02, s * 0.8, s * 0.8, col, x, y + s / 2, z, 0, ry, 0, { grad: 1 }).box(s * 0.8, s * 1.02, s * 0.8, col, x, y + s / 2, z, 0, ry, 0, { grad: 1 });
}
// A tree made of cubes: a trunk h high and a blocky crown.
export function cubeTreeInto(b, x, y, z, s = 1, crown = 0x4fae56, crown2 = 0x3f9a4a) {
  b.box(0.4 * s, 1.4 * s, 0.4 * s, 0x8a5a3c, x, y + 0.7 * s, z).box(1.6 * s, 0.8 * s, 1.6 * s, crown2, x, y + 1.8 * s, z).box(1.2 * s, 0.6 * s, 1.2 * s, crown, x, y + 2.5 * s, z).box(0.6 * s, 0.4 * s, 0.6 * s, crown, x, y + 3.0 * s, z);
  b.box(0.2 * s, 0.2 * s, 0.2 * s, 0xe5383b, x + 0.5 * s, y + 1.9 * s, z + 0.82 * s).box(0.2 * s, 0.2 * s, 0.2 * s, 0xe5383b, x - 0.4 * s, y + 2.4 * s, z + 0.62 * s);
}
// Square eyes, looking along +z from (x, y, z); gap is how far apart they are.
const pxEyes = (b, x, y, z, s, gap) => { for (const sx of [-1, 1]) b.box(s, s * 1.3, 0.03, 0xffffff, x + sx * gap, y, z, 0, 0, 0, { grad: 1 }).box(s * 0.5, s * 0.6, 0.04, 0x1b1f24, x + sx * gap, y - s * 0.2, z + 0.01, 0, 0, 0, { grad: 1 }); };
def('pxCrate', 'low', 1.4, 0.95, 1.0, (b) => {
  // two blocks and a little one, stacked like a staircase
  blockInto(b, 0.62, 0xffb347, -0.34, 0, 0, 0.1); blockInto(b, 0.62, 0x5ad0e0, 0.34, 0, 0.05, -0.12); blockInto(b, 0.32, 0xe5383b, 0.02, 0.62, 0, 0.3);
});
def('cubeJelly', 'low', 1.3, 0.95, 1.0, (b) => {
  // a wobbly green cube of jelly, very pleased to see you
  b.box(1.0, 0.8, 0.9, 0x5fd06a, 0, 0.4, 0, 0, 0, 0, { grad: 0.8 }).box(0.8, 0.12, 0.7, 0xa8f0a0, 0, 0.84, 0).box(0.2, 0.2, 0.02, 0xd8ffd0, -0.3, 0.6, 0.46);
  pxEyes(b, 0, 0.5, 0.46, 0.16, 0.2);
  b.box(0.3, 0.06, 0.03, 0x1b1f24, 0, 0.26, 0.46).box(0.06, 0.06, 0.03, 0x1b1f24, -0.18, 0.32, 0.46).box(0.06, 0.06, 0.03, 0x1b1f24, 0.18, 0.32, 0.46);
});
def('retroTV', 'low', 1.4, 0.98, 1.0, (b) => {
  // an old telly showing a smiley
  b.box(1.2, 0.8, 0.8, 0x8a5a3c, 0, 0.5, 0).box(0.84, 0.6, 0.04, 0x24262c, -0.12, 0.5, 0.4).box(0.14, 0.14, 0.06, 0xe5383b, 0.44, 0.66, 0.4).box(0.14, 0.14, 0.06, 0xffd23f, 0.44, 0.44, 0.4);
  for (const sx of [-1, 1]) b.box(0.12, 0.12, 0.12, 0x24262c, sx * 0.4, 0.05, 0.2).box(0.04, 0.4, 0.04, 0x9aa6ae, sx * 0.2, 1.0, -0.1, 0, 0, sx * -0.5);
  pixelArtInto(b, PXART.smiley, -0.12, 0.24, 0.425, 0.065, 0, 0.3);
});
def('joystick', 'low', 1.3, 0.98, 1.0, (b) => {
  // a great big joystick
  b.box(1.1, 0.3, 0.9, 0x24262c, 0, 0.15, 0).box(1.0, 0.06, 0.8, 0x3a4252, 0, 0.33, 0).box(0.14, 0.5, 0.14, 0x9aa6ae, -0.15, 0.6, -0.05, 0.12, 0, 0.14).box(0.34, 0.3, 0.34, 0xe5383b, -0.2, 0.86, -0.02, 0.12, 0, 0.14);
  b.box(0.2, 0.08, 0.2, 0xffd23f, 0.3, 0.4, 0.2).box(0.2, 0.08, 0.2, 0x5ad0e0, 0.3, 0.4, -0.15);
});
def('pxBush', 'low', 1.5, 0.92, 1.0, (b) => {
  // a bush made of cubes, with berries
  b.box(1.3, 0.5, 0.8, 0x3f9a4a, 0, 0.25, 0).box(0.9, 0.3, 0.6, 0x4fae56, -0.1, 0.65, 0).box(0.4, 0.14, 0.4, 0x6fc24a, 0.1, 0.86, 0);
  for (const [x, y] of [[-0.4, 0.3], [0.1, 0.5], [0.45, 0.2], [-0.2, 0.7]]) b.box(0.12, 0.12, 0.06, 0xe5383b, x, y, 0.41 - (y > 0.5 ? 0.1 : 0));
});
def('arcade', 'tall', 1.4, 2.7, 1.1, (b) => {
  // an arcade machine with a game of hearts and stars on its screen
  b.box(1.2, 1.2, 0.9, 0x3a4aa8, 0, 0.6, 0).box(1.2, 0.2, 1.0, 0x24262c, 0, 1.3, 0.1, -0.2, 0, 0).box(1.2, 1.0, 0.7, 0x3a4aa8, 0, 1.9, -0.1).box(1.24, 0.3, 0.8, 0xe5383b, 0, 2.52, -0.05);
  b.box(0.96, 0.76, 0.04, 0x10142a, 0, 1.92, 0.26).box(0.12, 0.2, 0.12, 0x9aa6ae, -0.3, 1.44, 0.3).box(0.2, 0.16, 0.2, 0xe5383b, -0.3, 1.6, 0.3).box(0.14, 0.06, 0.14, 0xffd23f, 0.16, 1.39, 0.36).box(0.14, 0.06, 0.14, 0x5ad0e0, 0.38, 1.39, 0.36);
  pixelArtInto(b, PXART.heart, -0.2, 1.72, 0.285, 0.045, 0, 0.3); pixelArtInto(b, PXART.star, 0.24, 1.86, 0.285, 0.04, 0, 0.3);
  for (let i = 0; i < 5; i++) b.box(0.14, 0.14, 0.03, [0xffd23f, 0xffffff, 0x5ad0e0, 0xffffff, 0xffd23f][i], -0.44 + i * 0.22, 2.52, 0.36, 0, 0, 0, { glow: true, grad: 1 });
  b.box(0.3, 0.1, 0.04, 0x24262c, 0, 0.6, 0.46).box(1.24, 0.1, 0.94, 0x24262c, 0, 0.05, 0);
});
def('pxTree', 'tall', 1.7, 2.9, 1.7, (b) => {
  // a tree made of cubes
  cubeTreeInto(b, 0, 0, 0, 0.9);
});
def('blockTower', 'tall', 1.2, 2.8, 1.2, (b) => {
  // a tower of blocks; the top one keeps a look out
  [0xe5383b, 0xffb347, 0xffd23f, 0x4fae56].forEach((c, i) => blockInto(b, 0.68, c, Math.sin(i * 2.1) * 0.06, i * 0.68, 0, Math.sin(i * 1.7) * 0.25));
  pxEyes(b, 0.05, 2.42, 0.36, 0.14, 0.15);
  b.box(0.2, 0.05, 0.03, 0x1b1f24, 0.05, 2.2, 0.36);
});
def('boxRobot', 'tall', 1.5, 2.7, 1.0, (b) => {
  // a robot made of boxes, waving hello
  const M = 0xb8c4d0, MD = 0x8c96a4;
  for (const sx of [-1, 1]) b.box(0.3, 0.8, 0.3, MD, sx * 0.25, 0.4, 0).box(0.4, 0.16, 0.5, 0x3a4252, sx * 0.25, 0.08, 0.06).box(0.22, 0.8, 0.22, MD, sx * 0.62, sx > 0 ? 1.9 : 1.3, 0, 0, 0, sx > 0 ? -0.5 : 0).box(0.28, 0.24, 0.28, 0xe5383b, sx > 0 ? 0.84 : -0.62, sx > 0 ? 2.32 : 0.86, 0);
  b.box(0.96, 0.9, 0.6, M, 0, 1.25, 0).box(0.5, 0.36, 0.04, 0x10142a, 0, 1.3, 0.3).box(0.1, 0.1, 0.06, 0x7fe04a, -0.12, 1.34, 0.31, 0, 0, 0, { glow: true, grad: 1 }).box(0.1, 0.1, 0.06, 0xffd23f, 0.1, 1.26, 0.31, 0, 0, 0, { glow: true, grad: 1 });
  b.box(0.2, 0.14, 0.2, MD, 0, 1.77, 0).box(0.8, 0.66, 0.6, M, 0, 2.17, 0).box(0.06, 0.24, 0.06, MD, 0, 2.62, 0).box(0.14, 0.14, 0.14, 0xe5383b, 0, 2.78, 0, 0, 0, 0, { glow: true, grad: 1 });
  pxEyes(b, 0, 2.24, 0.31, 0.16, 0.18);
  b.box(0.36, 0.06, 0.03, 0x1b1f24, 0, 1.98, 0.31).box(0.06, 0.06, 0.03, 0x1b1f24, -0.2, 2.04, 0.31).box(0.06, 0.06, 0.03, 0x1b1f24, 0.2, 2.04, 0.31);
});
def('heartSign', 'tall', 1.5, 2.8, 0.9, (b) => {
  // a great big heart on a post
  b.box(0.7, 0.2, 0.7, 0x8c96a4, 0, 0.1, 0).box(0.2, 1.3, 0.2, 0x9aa6ae, 0, 0.85, 0);
  pixelArtInto(b, PXART.heart, 0, 1.5, 0, 0.16, 0, 1.6);
});
def('rollCube', 'low', 1.1, 1.0, 1.0, (b) => {
  // a cube tumbling down the lane
  b.box(0.74, 0.74, 0.74, 0xa070e0, 0, 0, 0, 0, 0, 0, { grad: 1 });
  [[0.38, 0, 0, 0xffd23f, 0.02, 0.5, 0.5], [-0.38, 0, 0, 0x5ad0e0, 0.02, 0.5, 0.5], [0, 0.38, 0, 0xff8fb0, 0.5, 0.02, 0.5], [0, -0.38, 0, 0x7fe04a, 0.5, 0.02, 0.5], [0, 0, 0.38, 0xffb347, 0.5, 0.5, 0.02], [0, 0, -0.38, 0xffffff, 0.5, 0.5, 0.02]].forEach(([x, y, z, c, w, h, d]) => b.box(w, h, d, c, x, y, z, 0, 0, 0, { grad: 1 }));
}, { center: true });
def('cubeEgg', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the block bird drops: a square egg (it still rolls, somehow)
  b.box(0.6, 0.72, 0.6, 0xfff6e0, 0, 0, 0, 0, 0, 0, { grad: 0.92 }).box(0.44, 0.9, 0.44, 0xfff6e0, 0, 0, 0, 0, 0, 0, { grad: 0.92 });
  for (const [x, y, z] of [[0.31, 0.1, 0.1], [-0.31, -0.15, -0.1], [0.1, 0.2, 0.31], [-0.12, -0.1, -0.31], [0.05, 0.46, 0.05]]) b.box(0.14, 0.14, 0.14, 0x5ad0e0, x * 0.94, y, z * 0.94);
}, { center: true });
def('cubePillar', 'low', 1.5, 0.9, 0.9, (b) => {
  // a caterpillar made of cubes, humping across; it faces +x
  [0x7fe04a, 0x4fae56, 0x7fe04a, 0x4fae56].forEach((c, i) => b.box(0.36, 0.36, 0.44, c, -0.52 + i * 0.3, 0.2 + (i % 2) * 0.08, 0, 0, 0, 0, { grad: 0.9 }));
  b.box(0.46, 0.46, 0.5, 0xffd23f, 0.52, 0.34, 0, 0, 0, 0, { grad: 0.9 });
  for (const sz of [-1, 1]) b.box(0.03, 0.16, 0.14, 0xffffff, 0.76, 0.4, sz * 0.13, 0, 0, 0, { grad: 1 }).box(0.04, 0.08, 0.07, 0x1b1f24, 0.77, 0.37, sz * 0.13, 0, 0, 0, { grad: 1 }).box(0.05, 0.22, 0.05, 0x1b1f24, 0.56, 0.66, sz * 0.13).box(0.1, 0.1, 0.1, 0xe5383b, 0.56, 0.8, sz * 0.13);
  b.box(0.03, 0.05, 0.2, 0x1b1f24, 0.76, 0.22, 0);
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) b.box(0.08, 0.1, 0.08, 0x2f7a34, -0.52 + i * 0.3, 0.05, sz * 0.2);
});
def('blockBird', 'deco', 2.2, 1.2, 1.4, (b) => {
  // a bird made of blocks, with a square egg to drop
  b.box(0.7, 0.6, 0.9, 0x4f8fe0, 0, 0, 0, 0, 0, 0, { grad: 0.9 }).box(0.5, 0.3, 0.6, 0xffffff, 0, -0.2, 0.06).box(0.5, 0.5, 0.5, 0x4f8fe0, 0, 0.34, 0.5, 0, 0, 0, { grad: 0.9 }).box(0.2, 0.14, 0.3, 0xffb347, 0, 0.26, 0.86);
  pxEyes(b, 0, 0.42, 0.76, 0.14, 0.15);
  b.box(0.16, 0.26, 0.16, 0xe5383b, 0, 0.7, 0.44).box(0.3, 0.1, 0.5, 0x3a6ac0, 0, 0.1, -0.6).box(0.2, 0.1, 0.3, 0x3a6ac0, 0, 0.2, -0.86);
  for (const sx of [-1, 1]) b.box(0.08, 0.2, 0.08, 0xffb347, sx * 0.16, -0.4, 0.05);
  b.box(0.3, 0.36, 0.3, 0xfff6e0, 0, -0.6, 0.05);
}, {
  wings: (b, sx) => { b.box(0.7, 0.1, 0.6, 0x4f8fe0, sx * 0.4, 0, 0).box(0.4, 0.1, 0.44, 0x3a6ac0, sx * 0.9, 0, -0.06).box(0.2, 0.1, 0.26, 0x3a6ac0, sx * 1.16, 0, -0.14); }, wingAt: [0.3, 0.1, 0],
});

// ---------- Disco Land ----------
export const NEON = { pink: 0xff3fa4, cyan: 0x2fe0ff, yellow: 0xffe23f, purple: 0x9a4fff, green: 0x5fff8f, orange: 0xff8a3c };
export const NEONS = [NEON.pink, NEON.cyan, NEON.yellow, NEON.purple, NEON.green, NEON.orange];
const GLITTER = [0xffffff, 0xff9fd8, 0x9fe8ff, 0xfff0a0, 0xd0b0ff, 0xe8e8f0];
const GLOW = { glow: true, grad: 1 };
// A glitter ball: every little mirror a different colour.
export function discoBallInto(b, r, x, y, z) {
  b.add(new THREE.IcosahedronGeometry(r, 2), (px, py, pz, i) => GLITTER[(Math.floor(i / 3) * 5 + Math.floor(i / 12)) % 6], x, y, z, 0, 0, 0, 1, 1, 1, GLOW);
}
// A loudspeaker, w wide, h high and d deep, standing on (x, y, z) and facing +z.
export function speakerInto(b, x, y, z, w, h, d, col = NEON.pink) {
  b.box(w, h, d, 0x24202c, x, y + h / 2, z, 0, 0, 0, { grad: 0.85 }).box(w * 0.9, h * 0.94, 0.04, 0x3a3444, x, y + h / 2, z + d / 2);
  const R = Math.min(w, h * 0.6) * 0.36, f = z + d / 2 + 0.03;
  b.cyl(R, R, 0.05, 0x15121a, x, y + h * 0.36, f, PI / 2, 0, 0, { seg: 14 }).tor(R, 0.035, col, x, y + h * 0.36, f + 0.02, 0, 0, 0, { seg: 16, tseg: 4, ...GLOW }).sph(R * 0.4, 0x4a4456, x, y + h * 0.36, f, 1, 1, 0.5, { seg: 8 });
  b.cyl(R * 0.45, R * 0.45, 0.05, 0x15121a, x, y + h * 0.8, f, PI / 2, 0, 0, { seg: 10 }).sph(R * 0.2, 0xd8d0e8, x, y + h * 0.8, f, 1, 1, 0.5, { seg: 6 });
}
// A record: a black disc with a bright label. It lies flat unless it is turned.
export function recordInto(b, r, x, y, z, rx = 0, ry = 0, rz = 0, col = NEON.pink) {
  b.at(x, y, z, ry, () => { b.cyl(r, r, 0.04, 0x1b1820, 0, 0, 0, rx, 0, rz, { seg: 18 }).cyl(r * 0.72, r * 0.72, 0.046, 0x2c2834, 0, 0, 0, rx, 0, rz, { seg: 18 }).cyl(r * 0.38, r * 0.38, 0.056, col, 0, 0, 0, rx, 0, rz, { seg: 12 }).cyl(r * 0.06, r * 0.06, 0.066, 0xffffff, 0, 0, 0, rx, 0, rz, { seg: 6 }); });
}
// A music note, about 1.1 s high, flat in x and y.
export function noteInto(b, x, y, z, s = 1, col = NEON.cyan, two = false, o = GLOW) {
  b.at(x, y, z, 0, () => {
    b.sph(0.2, col, 0, 0.15, 0, 1.25, 0.85, 0.6, { seg: 9, ...o }).box(0.07, 0.85, 0.07, col, 0.2, 0.6, 0, 0, 0, 0, o);
    if (two) b.sph(0.2, col, 0.62, 0.27, 0, 1.25, 0.85, 0.6, { seg: 9, ...o }).box(0.07, 0.85, 0.07, col, 0.82, 0.72, 0, 0, 0, 0, o).box(0.7, 0.16, 0.07, col, 0.51, 1.04, 0, 0, 0, 0.19, o);
    else b.box(0.34, 0.14, 0.07, col, 0.36, 0.92, 0, 0, 0, -0.5, o);
  }, s);
}
// A dancer, about 1.75 s tall, facing +z: flared trousers, a big round hairdo and one arm pointing at the sky.
export function dancerInto(b, x, y, z, s = 1, o = {}) {
  const top = o.top ?? NEON.pink, legs = o.legs ?? 0xffffff, skin = o.skin ?? 0xc98a5a, hair = o.hair ?? 0x2a1c16, left = o.left ? -1 : 1;
  b.at(x, y, z, o.ry || 0, () => {
    for (const sx of [-1, 1]) b.cyl(0.09, 0.2, 0.8, legs, sx * (0.14 + 0.06), 0.42, 0, 0, 0, sx * -0.12, { seg: 8 }).box(0.2, 0.08, 0.3, 0xffe23f, sx * 0.25, 0.04, 0.05);
    b.cap(0.2, 0.36, top, 0, 1.08, 0, 0, 0, 0, { seg: 9 }).cyl(0.21, 0.21, 0.07, 0xffe23f, 0, 0.84, 0, 0, 0, 0, { seg: 9 });
    b.sph(0.2, skin, 0, 1.56, 0, 1, 1.05, 1, { seg: 10 }).sph(0.3, hair, 0, 1.68, -0.06, 1.1, 0.95, 1, { seg: 10 });
    for (const sx of [-1, 1]) b.sph(0.03, 0x1b1f24, sx * 0.08, 1.57, 0.18, 1, 1.2, 0.6, { seg: 5 });
    b.tor(0.07, 0.014, 0x7a2a2a, 0, 1.5, 0.17, 0.3, 0, PI, { arc: PI, seg: 7, tseg: 3 });
    // one arm up, pointing; the other on the hip
    b.cap(0.065, 0.5, top, left * 0.36, 1.5, 0, 0, 0, left * -0.6, { seg: 6 }).sph(0.08, skin, left * 0.54, 1.8, 0, 1, 1, 1, { seg: 6 });
    b.cap(0.065, 0.3, top, -left * 0.3, 1.12, 0, 0, 0, -left * 0.9, { seg: 6 }).sph(0.075, skin, -left * 0.24, 0.94, 0.06, 1, 1, 1, { seg: 6 });
  }, s);
}
def('recordStack', 'low', 1.3, 0.7, 1.1, (b) => {
  // a pile of records, with two leaning against it
  for (let i = 0; i < 7; i++) recordInto(b, 0.42, Math.sin(i * 2.3) * 0.05, 0.03 + i * 0.07, Math.cos(i * 1.7) * 0.05, 0, i, 0, NEONS[i % 6]);
  recordInto(b, 0.38, 0.5, 0.36, 0.1, 0, 0, PI / 2 - 0.3, NEON.cyan); recordInto(b, 0.36, -0.52, 0.34, 0.12, 0, 0, PI / 2 + 0.3, NEON.yellow);
});
def('boomBox', 'low', 1.5, 0.95, 0.8, (b) => {
  // a big portable stereo
  b.box(1.4, 0.7, 0.5, 0x3a3444, 0, 0.35, 0, 0, 0, 0, { grad: 0.85 }).box(1.4, 0.08, 0.5, 0xc8c0d8, 0, 0.72, 0).box(0.5, 0.22, 0.03, 0x15121a, 0, 0.5, 0.26).box(0.42, 0.14, 0.04, NEON.cyan, 0, 0.5, 0.265, 0, 0, 0, GLOW);
  for (const sx of [-1, 1]) { b.cyl(0.24, 0.24, 0.05, 0x15121a, sx * 0.44, 0.34, 0.26, PI / 2, 0, 0, { seg: 14 }).tor(0.24, 0.03, sx > 0 ? NEON.pink : NEON.yellow, sx * 0.44, 0.34, 0.28, 0, 0, 0, { seg: 14, tseg: 4, ...GLOW }).sph(0.1, 0x4a4456, sx * 0.44, 0.34, 0.27, 1, 1, 0.5, { seg: 7 }); b.box(0.05, 0.2, 0.05, 0xc8c0d8, sx * 0.5, 0.84, 0); }
  b.box(1.05, 0.05, 0.05, 0xc8c0d8, 0, 0.93, 0);
  for (let i = 0; i < 4; i++) b.box(0.07, 0.05, 0.04, NEONS[i], -0.15 + i * 0.1, 0.24, 0.26, 0, 0, 0, GLOW);
});
def('platformShoes', 'low', 1.3, 0.75, 1.0, (b) => {
  // a pair of glittery platform shoes
  for (const sx of [-1, 1]) {
    const c = sx > 0 ? NEON.purple : NEON.pink, x = sx * 0.3;
    b.box(0.34, 0.26, 0.8, 0xffe23f, x, 0.13, 0, 0, sx * 0.14, 0, { grad: 0.9 }).box(0.34, 0.2, 0.26, 0xffe23f, x - sx * 0.04, 0.34, -0.26, 0, sx * 0.14, 0);
    b.sph(0.2, c, x + sx * 0.03, 0.36, 0.22, 0.9, 0.7, 1.3, { seg: 9 }).cyl(0.17, 0.19, 0.3, c, x - sx * 0.04, 0.56, -0.24, 0, 0, 0, { seg: 9 });
    b.add(new THREE.OctahedronGeometry(0.07), 0xffffff, x + sx * 0.03, 0.5, 0.26, 0, 0.6, 0, 1, 1, 1, GLOW);
  }
});
def('floorLights', 'low', 1.5, 0.8, 0.8, (b) => {
  // three stage lights on a bar, pointing up
  b.box(1.4, 0.1, 0.4, 0x24202c, 0, 0.05, 0).box(1.3, 0.06, 0.06, 0x4a4456, 0, 0.3, 0);
  for (let i = -1; i <= 1; i++) { const c = [NEON.pink, NEON.yellow, NEON.cyan][i + 1]; b.box(0.05, 0.3, 0.05, 0x4a4456, i * 0.46, 0.2, 0).cyl(0.2, 0.15, 0.34, 0x24202c, i * 0.46, 0.52, 0, 0.25, 0, i * -0.2, { seg: 10 }).cyl(0.17, 0.17, 0.04, c, i * 0.46 + i * 0.035, 0.7, 0.045, 0.25, 0, i * -0.2, { seg: 10, ...GLOW }); }
});
def('speakerStack', 'tall', 1.4, 2.7, 1.1, (b) => {
  // two great loudspeakers, one on top of the other
  speakerInto(b, 0, 0, 0, 1.3, 1.4, 1.0, NEON.pink); speakerInto(b, 0, 1.4, 0, 1.15, 1.2, 0.9, NEON.cyan);
  noteInto(b, 0.36, 2.55, 0.1, 0.4, NEON.yellow);
});
def('lavaLamp', 'tall', 1.1, 2.8, 1.1, (b) => {
  // a lava lamp as tall as a lamp-post
  b.cyl(0.3, 0.5, 0.6, 0xc8c0d8, 0, 0.3, 0, 0, 0, 0, { seg: 12 }).cyl(0.42, 0.3, 0.3, 0xc8c0d8, 0, 0.75, 0, 0, 0, 0, { seg: 12 });
  b.cyl(0.24, 0.44, 1.5, NEON.purple, 0, 1.65, 0, 0, 0, 0, { seg: 12, ...GLOW }).cyl(0.16, 0.24, 0.36, 0xc8c0d8, 0, 2.58, 0, 0, 0, 0, { seg: 12 });
  for (const [x, y, r] of [[0.08, 1.2, 0.2], [-0.1, 1.65, 0.15], [0.06, 2.0, 0.12], [-0.04, 2.25, 0.08]]) b.sph(r, NEON.orange, x, y, 0.42 - (y - 0.9) * 0.133, 1, 1.25, 0.5, { seg: 8, ...GLOW });
});
def('jukebox', 'tall', 1.5, 2.6, 1.0, (b) => {
  // a jukebox with a round top and glowing tubes
  b.box(1.3, 1.5, 0.8, 0x7a2a5a, 0, 0.75, 0, 0, 0, 0, { grad: 0.85 }).cyl(0.65, 0.65, 0.8, 0x7a2a5a, 0, 1.5, 0, PI / 2, 0, 0, { seg: 18 });
  b.tor(0.58, 0.07, NEON.yellow, 0, 1.5, 0.4, 0, 0, 0, { arc: PI, seg: 14, tseg: 5, ...GLOW }).tor(0.42, 0.06, NEON.cyan, 0, 1.5, 0.41, 0, 0, 0, { arc: PI, seg: 12, tseg: 5, ...GLOW });
  for (const sx of [-1, 1]) b.box(0.13, 1.4, 0.06, NEON.yellow, sx * 0.58, 0.8, 0.4, 0, 0, 0, GLOW).box(0.11, 1.4, 0.06, NEON.cyan, sx * 0.42, 0.8, 0.41, 0, 0, 0, GLOW);
  b.box(0.66, 0.5, 0.04, 0x15121a, 0, 1.2, 0.41).box(0.66, 0.6, 0.04, 0xe8c070, 0, 0.5, 0.41);
  recordInto(b, 0.2, 0, 1.22, 0.44, PI / 2, 0, 0, NEON.pink);
  for (let i = 0; i < 5; i++) b.box(0.07, 0.07, 0.03, NEONS[i], -0.22 + i * 0.11, 0.86, 0.42, 0, 0, 0, GLOW);
  b.box(1.4, 0.12, 0.9, 0x3a1830, 0, 0.06, 0);
});
def('neonNote', 'tall', 1.4, 2.8, 0.9, (b) => {
  // a giant neon note on a little stage
  b.cyl(0.6, 0.7, 0.3, 0x24202c, 0, 0.15, 0, 0, 0, 0, { seg: 12 }).tor(0.62, 0.04, NEON.pink, 0, 0.3, 0, PI / 2, 0, 0, { seg: 16, tseg: 4, ...GLOW });
  noteInto(b, -0.5, 0.42, 0, 2.0, NEON.cyan, true);
});
def('ballStand', 'tall', 1.4, 2.8, 1.2, (b) => {
  // a glitter ball on a tripod
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; b.cyl(0.035, 0.035, 1.5, 0xc8c0d8, Math.sin(a) * 0.3, 0.7, Math.cos(a) * 0.3, Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42, { seg: 5 }); }
  b.cyl(0.05, 0.05, 0.5, 0xc8c0d8, 0, 1.55, 0, 0, 0, 0, { seg: 6 });
  discoBallInto(b, 0.6, 0, 2.2, 0);
  b.tor(0.6, 0.03, 0xc8c0d8, 0, 2.2, 0, PI / 2, 0, 0, { seg: 16, tseg: 4 });
});
def('glitterBall', 'low', 1.1, 1.0, 1.0, (b) => {
  // a glitter ball rolling down the lane
  discoBallInto(b, 0.5, 0, 0, 0);
  b.tor(0.5, 0.025, 0xc8c0d8, 0, 0, 0, 0, PI / 2, 0, { seg: 18, tseg: 4 });
}, { center: true });
def('vinyl', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the flying stereo throws: a record, tumbling end over end
  b.cyl(0.5, 0.5, 0.09, 0x1b1820, 0, 0, 0, 0, 0, 0, { seg: 18 }).cyl(0.36, 0.36, 0.1, 0x2c2834, 0, 0, 0, 0, 0, 0, { seg: 18 }).cyl(0.2, 0.2, 0.11, NEON.yellow, 0, 0, 0, 0, 0, 0, { seg: 12, ...GLOW }).cyl(0.04, 0.04, 0.12, 0xffffff, 0, 0, 0, 0, 0, 0, { seg: 6 });
  b.tor(0.5, 0.03, NEON.pink, 0, 0, 0, PI / 2, 0, 0, { seg: 18, tseg: 4, ...GLOW });
}, { center: true });
def('rollerBoot', 'low', 1.4, 0.95, 0.9, (b) => {
  // a roller boot that has skated off by itself; it faces +x
  b.box(0.9, 0.1, 0.34, 0xc8c0d8, 0, 0.26, 0).sph(0.2, 0xffffff, 0.26, 0.42, 0, 1.5, 0.75, 0.85, { seg: 9 }).cyl(0.17, 0.19, 0.5, 0xffffff, -0.2, 0.58, 0, 0, 0, 0.06, { seg: 9 }).cyl(0.2, 0.19, 0.08, NEON.pink, -0.22, 0.86, 0, 0, 0, 0.06, { seg: 9 });
  b.box(0.3, 0.05, 0.36, NEON.pink, 0.1, 0.5, 0, 0, 0, -0.5).box(0.7, 0.07, 0.36, NEON.cyan, 0.05, 0.34, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.13, 0.13, 0.1, NEON.yellow, sx * 0.3, 0.13, sz * 0.19, PI / 2, 0, 0, { seg: 10 }).cyl(0.05, 0.05, 0.11, 0xffffff, sx * 0.3, 0.13, sz * 0.19, PI / 2, 0, 0, { seg: 6 });
  b.cyl(0.07, 0.09, 0.12, NEON.orange, 0.5, 0.14, 0, 0, 0, -0.5, { seg: 7 });
  for (let i = 0; i < 3; i++) b.box(0.03, 0.03, 0.2, NEON.pink, -0.02 + i * 0.07, 0.56 + i * 0.07 - i * i * 0.03, 0);
});
def('flyBox', 'deco', 2.4, 1.2, 1.2, (b) => {
  // a stereo that has grown wings, with a record ready to throw
  b.box(1.3, 0.66, 0.6, 0x3a3444, 0, 0, 0, 0, 0, 0, { grad: 0.85 }).box(1.3, 0.07, 0.6, 0xc8c0d8, 0, 0.36, 0).box(0.36, 0.16, 0.04, NEON.cyan, 0, 0.14, 0.31, 0, 0, 0, GLOW);
  for (const sx of [-1, 1]) { b.cyl(0.22, 0.22, 0.05, 0x15121a, sx * 0.4, -0.04, 0.31, PI / 2, 0, 0, { seg: 12 }).tor(0.22, 0.03, sx > 0 ? NEON.pink : NEON.yellow, sx * 0.4, -0.04, 0.33, 0, 0, 0, { seg: 12, tseg: 4, ...GLOW }); b.sph(0.07, 0xffffff, sx * 0.14, 0.14, 0.34, 1, 1.2, 0.5, { seg: 7 }).sph(0.035, 0x1b1f24, sx * 0.14, 0.13, 0.37, 1, 1.2, 0.5, { seg: 6 }); }
  b.tor(0.1, 0.02, 0x15121a, 0, -0.16, 0.32, 0, 0, PI, { arc: PI, seg: 7, tseg: 3 }).box(0.9, 0.05, 0.05, 0xc8c0d8, 0, 0.56, 0).box(0.05, 0.2, 0.05, 0xc8c0d8, -0.44, 0.46, 0).box(0.05, 0.2, 0.05, 0xc8c0d8, 0.44, 0.46, 0);
  recordInto(b, 0.3, 0, -0.5, 0.05, 0, 0, 0, NEON.yellow);
}, {
  wings: (b, sx) => { for (let i = 0; i < 4; i++) b.sph(0.2, i % 2 ? 0xffffff : 0xffd0ea, sx * (0.3 + i * 0.26), 0.02 - i * 0.02, -0.04 * i, 1.5, 0.3, 1.4 - i * 0.22, { seg: 8 }); }, wingAt: [0.62, 0.1, 0],
});

// ---------- the Upside-Down World ----------
export const UPS = { wall: 0xfff3d6, roofs: [0xe5383b, 0x4f8fe0, 0xffb347, 0x7fc46a], leaf: 0x5fbf4a, leafD: 0x3f9a4a, trunk: 0x8a5a3c, earth: 0x9a6a44, rock: 0x8c8478 };
// A round tree, about 2.6 s high, standing on (x, y, z).
export function roundTreeInto(b, x, y, z, s = 1, leaf = UPS.leaf, fruit = 0xe5383b) {
  b.cyl(0.14 * s, 0.2 * s, 1.3 * s, UPS.trunk, x, y + 0.65 * s, z, 0, 0, 0, { seg: 7 }).sph(0.8 * s, leaf, x, y + 1.8 * s, z, 1, 0.95, 1, { seg: 10 }).sph(0.5 * s, UPS.leafD, x + 0.4 * s, y + 1.5 * s, z + 0.3 * s, 1, 1, 1, { seg: 8 }).sph(0.45 * s, leaf, x - 0.45 * s, y + 2.1 * s, z - 0.2 * s, 1, 1, 1, { seg: 8 });
  for (const [dx, dy, dz] of [[0.5, 1.9, 0.55], [-0.3, 1.6, 0.7], [0.1, 2.3, 0.5], [-0.7, 1.9, 0.2], [0.75, 1.5, -0.1]]) b.sph(0.1 * s, fruit, x + dx * s, y + dy * s, z + dz * s, 1, 1, 1, { seg: 6 });
}
// A cottage, w wide: walls, a pitched roof, a door, two lit windows and a chimney. It faces +z.
export function cottageInto(b, x, y, z, ry = 0, w = 2.4, roof = UPS.roofs[0], wall = UPS.wall) {
  b.at(x, y, z, ry, () => {
    const h = w * 0.7, d = w * 0.8;
    b.box(w, h, d, wall, 0, h / 2, 0, 0, 0, 0, { grad: 0.9 }).prism(w * 1.14, w * 0.5, d * 1.12, roof, 0, h, 0, 0);
    b.box(w * 0.2, h * 0.56, 0.06, 0x7a4a2e, 0, h * 0.28, d / 2 + 0.02).sph(0.04 * w, 0xffd23f, w * 0.06, h * 0.28, d / 2 + 0.06, 1, 1, 1, { seg: 5 });
    for (const sx of [-1, 1]) b.box(w * 0.2, w * 0.2, 0.06, 0xffe9a0, sx * w * 0.3, h * 0.58, d / 2 + 0.02, 0, 0, 0, { glow: true, grad: 1 }).box(w * 0.24, 0.05, 0.08, 0xffffff, sx * w * 0.3, h * 0.58 - w * 0.12, d / 2 + 0.03);
    b.box(w * 0.14, w * 0.4, w * 0.14, 0xb5553c, w * 0.3, h + w * 0.32, -d * 0.15);
    for (let i = 0; i < 3; i++) b.sph(w * (0.07 + i * 0.025), 0xffffff, w * 0.3 + i * 0.06 * w, h + w * (0.62 + i * 0.16), -d * 0.15, 1, 1, 1, { seg: 6 });
  });
}
def('upCone', 'low', 1.2, 0.98, 1.0, (b) => {
  // somebody has dropped an ice cream as big as a bollard: scoop down, cone up
  b.sph(0.52, 0xff9fc0, 0, 0.1, 0, 1.15, 0.5, 1.15, { seg: 12 }).sph(0.4, 0xff9fc0, 0, 0.3, 0, 1, 0.8, 1, { seg: 12 });
  for (const [x, z, r] of [[0.6, 0.1, 0.16], [-0.5, 0.4, 0.14], [-0.3, -0.6, 0.12], [0.4, -0.5, 0.1]]) b.sph(r, 0xff9fc0, x, 0.03, z, 1, 0.3, 1, { seg: 7 });
  b.cone(0.34, 0.75, 0xe0a85a, 0, 0.6, 0, 0, 0, 0.08, { seg: 12 });
  for (let i = 0; i < 3; i++) b.tor(0.3 - i * 0.09, 0.012, 0xb5803c, 0.01 * i, 0.36 + i * 0.2, 0, PI / 2, 0, 0, { seg: 10, tseg: 3 });
  for (const [x, y, z, c] of [[0.2, 0.42, 0.3, 0xffffff], [-0.25, 0.38, 0.25, 0x5ad0e0], [0, 0.34, 0.42, 0xffd23f]]) b.cap(0.02, 0.07, c, x, y, z, 0.6, x * 3, 0.5, { seg: 4 });
});
def('upBoat', 'low', 1.6, 0.9, 1.0, (b) => {
  // a rowing boat, keel up, with a crab sunbathing on it
  b.sph(1, 0x4f8fe0, 0, 0, 0, 0.78, 0.62, 0.44, { seg: 14 }).tor(0.5, 0.035, 0xffffff, 0, 0.14, 0, 0, PI / 2, 0, { arc: PI, seg: 12, tseg: 4 });
  b.add(new THREE.TorusGeometry(1, 0.04, 4, 20), 0xffffff, 0, 0.04, 0, PI / 2, 0, 0, 0.79, 0.45, 1);
  b.sph(0.12, 0xe5553b, 0.2, 0.64, 0, 1.3, 0.7, 1, { seg: 7 });
  for (const sx of [-1, 1]) b.sph(0.05, 0xe5553b, 0.2 + sx * 0.18, 0.7, 0.06, 1, 1, 1, { seg: 5 }).sph(0.02, 0x1b1f24, 0.2 + sx * 0.05, 0.74, 0.08, 1, 1, 1, { seg: 4 });
});
def('upTable', 'low', 1.4, 0.95, 1.0, (b) => {
  // a café table on its back with its legs in the air, and a cup that has somehow stayed on
  b.box(1.2, 0.1, 0.8, 0xffffff, 0, 0.05, 0).box(1.1, 0.03, 0.7, 0xe5383b, 0, 0.115, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.04, 0.05, 0.75, 0x9aa6ae, sx * 0.5, 0.48, sz * 0.3, 0, 0, 0, { seg: 6 }).sph(0.06, 0x24262c, sx * 0.5, 0.86, sz * 0.3, 1, 0.6, 1, { seg: 6 });
  b.cyl(0.1, 0.14, 0.16, 0x5ad0e0, 0.1, 0.21, 0, 0, 0, 0, { seg: 9 }).tor(0.06, 0.016, 0x5ad0e0, 0.24, 0.21, 0, 0, 0, 0, { seg: 8, tseg: 3 });
});
def('upBucket', 'low', 1.2, 0.9, 1.0, (b) => {
  // a seaside bucket, upside down, with the spade stuck in the top and a starfish
  b.cyl(0.3, 0.44, 0.64, 0xe5383b, 0, 0.32, 0, 0, 0, 0, { seg: 12 }).cyl(0.46, 0.46, 0.06, 0xffd23f, 0, 0.03, 0, 0, 0, 0, { seg: 12 });
  b.tor(0.42, 0.02, 0xffffff, 0, 0.05, 0.1, PI / 2.3, 0, 0, { arc: PI, seg: 10, tseg: 3 });
  b.cyl(0.025, 0.025, 0.4, 0x8a5a3c, 0.08, 0.8, 0, 0, 0, 0.3, { seg: 5 }).box(0.16, 0.2, 0.03, 0x4f8fe0, 0.0, 0.66, 0, 0, 0, 0.3);
  for (let i = 0; i < 5; i++) b.cone(0.05, 0.2, 0xffb347, 0.5 + Math.cos(i * 1.257) * 0.1, 0.04, 0.3 + Math.sin(i * 1.257) * 0.1, PI / 2, 0, 0, { seg: 4 });
});
def('upHat', 'low', 1.2, 0.98, 1.0, (b) => {
  // a top hat, brim up, with the rabbit looking out
  b.cyl(0.4, 0.34, 0.6, 0x24262c, 0, 0.3, 0, 0, 0, 0, { seg: 12 }).cyl(0.6, 0.6, 0.05, 0x24262c, 0, 0.6, 0, 0, 0, 0, { seg: 14 }).cyl(0.41, 0.36, 0.1, 0xe5383b, 0, 0.5, 0, 0, 0, 0, { seg: 12 });
  b.sph(0.2, 0xffffff, 0, 0.72, 0.06, 1, 0.9, 1, { seg: 9 }).sph(0.035, 0xff8fb0, 0, 0.7, 0.25, 1, 0.8, 0.6, { seg: 5 });
  for (const sx of [-1, 1]) b.sph(0.03, 0x1b1f24, sx * 0.08, 0.76, 0.22, 1, 1.2, 0.6, { seg: 5 }).cap(0.05, 0.2, 0xffffff, sx * 0.09, 0.9, 0, 0, 0, sx * -0.2, { seg: 6 }).cap(0.025, 0.14, 0xff8fb0, sx * 0.09, 0.9, 0.035, 0, 0, sx * -0.2, { seg: 5 });
});
def('upTree', 'tall', 1.6, 2.8, 1.6, (b) => {
  // a tree standing on its head, with its roots in the air and a bird's nest in them
  b.flip(0, 2.7, 0, () => { roundTreeInto(b, 0, 0, 0, 1); for (let i = 0; i < 5; i++) b.cyl(0.03, 0.08, 0.5, UPS.trunk, Math.cos(i * 1.257) * 0.24, -0.1, Math.sin(i * 1.257) * 0.24, Math.sin(i * 1.257) * 0.9, 0, -Math.cos(i * 1.257) * 0.9, { seg: 5 }); });
  b.cyl(0.2, 0.14, 0.12, 0xb5803c, 0, 2.86, 0, 0, 0, 0, { seg: 8 });
  for (const sx of [-1, 1]) b.sph(0.06, 0xcfeeff, sx * 0.06, 2.94, 0, 1, 1.2, 1, { seg: 6 });
});
def('upLamp', 'tall', 1.1, 2.8, 1.1, (b) => {
  // a lamp-post standing on its lamp
  b.flip(0, 2.8, 0, () => {
    b.cyl(0.26, 0.32, 0.24, 0x1f4a44, 0, 0.12, 0, 0, 0, 0, { seg: 8 }).cyl(0.07, 0.1, 1.9, 0x1f4a44, 0, 1.15, 0, 0, 0, 0, { seg: 7 }).cyl(0.2, 0.08, 0.14, 0x1f4a44, 0, 2.14, 0, 0, 0, 0, { seg: 8 });
    b.cyl(0.26, 0.2, 0.42, 0xfff3c0, 0, 2.42, 0, 0, 0, 0, { seg: 8, glow: true, grad: 1 }).cone(0.32, 0.2, 0x1f4a44, 0, 2.73, 0, 0, 0, 0, { seg: 8 });
  });
});
def('upHut', 'tall', 1.5, 2.7, 1.2, (b) => {
  // a beach hut balancing on the point of its roof
  b.flip(0, 2.66, 0, () => {
    b.box(1.3, 1.7, 1.0, 0xffffff, 0, 0.85, 0, 0, 0, 0, { grad: 0.9 }).prism(1.5, 0.9, 1.16, 0x4f8fe0, 0, 1.7, 0, 0);
    for (let i = -2; i <= 2; i += 2) b.box(0.26, 1.7, 0.03, 0x4f8fe0, i * 0.26, 0.85, 0.51);
    b.box(0.44, 1.0, 0.04, 0xffd23f, 0, 0.5, 0.52).sph(0.04, 0x24262c, 0.14, 0.5, 0.56, 1, 1, 1, { seg: 5 }).box(1.4, 0.1, 1.1, 0x9a6a44, 0, 0.05, 0);
  });
});
def('headTeddy', 'tall', 1.3, 2.6, 1.0, (b) => {
  // a bear standing on its head
  b.flip(0, 2.62, 0, () => teddyInto(b, 0, 0, 0, 1.65, { stand: true, pj: 0xe5383b }));
  b.cyl(0.5, 0.5, 0.06, 0x5ad0e0, 0, 0.03, 0, 0, 0, 0, { seg: 12 });
});
def('upBrolly', 'tall', 1.7, 2.7, 1.7, (b) => {
  // a beach umbrella standing on its point, with a duck having a bath in it
  b.cyl(0.035, 0.035, 1.5, 0xfff3d6, 0, 0.75, 0, 0, 0, 0, { seg: 6 }).cone(0.07, 0.2, 0x9aa6ae, 0, 0.1, 0, PI, 0, 0, { seg: 6 });
  b.add(new THREE.ConeGeometry(0.85, 1.0, 8, 1, true), (x, y, z, i) => (Math.floor(((Math.atan2(z, x) + PI) / (PI / 4)) + 0.5) % 2 ? 0xe5383b : 0xffffff), 0, 1.95, 0, PI, 0, 0);
  b.cyl(0.8, 0.8, 0.04, 0x5ad0e0, 0, 2.38, 0, 0, 0, 0, { seg: 8 }).tor(0.85, 0.03, 0xffd23f, 0, 2.45, 0, PI / 2, 0, 0, { seg: 8, tseg: 4 });
  b.sph(0.2, 0xffd23f, 0, 2.5, 0, 1.2, 0.8, 1, { seg: 8 }).sph(0.14, 0xffd23f, 0.16, 2.68, 0, 1, 1, 1, { seg: 8 }).cone(0.05, 0.12, 0xff8a3c, 0.32, 2.66, 0, 0, 0, -PI / 2, { seg: 5 });
  for (const sz of [-1, 1]) b.sph(0.02, 0x1b1f24, 0.22, 2.72, sz * 0.09, 1, 1, 1, { seg: 4 });
});
def('turtleSkate', 'low', 1.5, 0.9, 0.9, (b) => {
  // a tortoise riding a skateboard on its back, feet in the air; it faces +x
  b.box(1.3, 0.06, 0.44, 0xe5383b, 0, 0.2, 0).box(0.2, 0.06, 0.44, 0xe5383b, 0.72, 0.24, 0, 0, 0, 0.4).box(0.2, 0.06, 0.44, 0xe5383b, -0.72, 0.24, 0, 0, 0, -0.4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.09, 0.09, 0.08, 0xffd23f, sx * 0.42, 0.09, sz * 0.2, PI / 2, 0, 0, { seg: 8 });
  b.sph(0.42, 0x4f8f4a, 0, 0.24, 0, 1.15, 0.5, 0.9, { seg: 11 }).sph(0.4, 0xe8d8a0, 0, 0.36, 0, 1.1, 0.5, 0.85, { seg: 11 });
  b.sph(0.16, 0x7fc46a, 0.56, 0.44, 0, 1.1, 0.9, 0.9, { seg: 8 }).tor(0.05, 0.012, 0x1b1f24, 0.7, 0.42, 0, 0, PI / 2, 0, { arc: PI, seg: 6, tseg: 3 });
  for (const sz of [-1, 1]) { b.sph(0.03, 0x1b1f24, 0.66, 0.5, sz * 0.09, 1, 1, 1, { seg: 5 }); for (const sx of [-1, 1]) b.cap(0.06, 0.2, 0x7fc46a, sx * 0.26, 0.66, sz * 0.24, 0, 0, sx * -0.4, { seg: 6 }); }
  b.cone(0.04, 0.16, 0x7fc46a, -0.52, 0.42, 0, 0, 0, PI / 2 + 0.3, { seg: 5 });
});
def('flipGull', 'deco', 2.2, 1.1, 1.3, (b) => {
  // a seagull that flies on its back, feet in the air, with an egg tucked under one wing
  b.sph(0.36, 0xffffff, 0, 0, 0, 0.85, 0.75, 1.3, { seg: 10 }).sph(0.3, 0xb8c4d0, 0, -0.14, -0.04, 0.85, 0.5, 1.25, { seg: 9 });
  b.sph(0.22, 0xffffff, 0, -0.08, 0.5, 1, 1, 1, { seg: 9 }).cone(0.07, 0.24, 0xffb347, 0, -0.1, 0.76, PI / 2, 0, 0, { seg: 6 });
  for (const sx of [-1, 1]) { b.sph(0.035, 0x1b1f24, sx * 0.12, -0.14, 0.66, 1, 1, 0.6, { seg: 5 }); b.cyl(0.018, 0.018, 0.24, 0xffb347, sx * 0.1, 0.36, -0.05, 0, 0, 0, { seg: 4 }).box(0.1, 0.02, 0.14, 0xffb347, sx * 0.1, 0.48, 0.0); }
  b.cone(0.16, 0.36, 0xb8c4d0, 0, -0.06, -0.6, -PI / 2, 0, 0, { seg: 5 });
  b.sph(0.18, 0xfff6e0, 0.2, 0.24, 0.1, 0.85, 1.1, 0.85, { seg: 8 });
}, {
  wings: (b, sx) => { b.sph(0.5, 0xffffff, sx * 0.45, 0, 0, 1.2, 0.12, 0.6, { seg: 8 }).sph(0.3, 0xb8c4d0, sx * 0.95, 0.0, -0.05, 1.3, 0.1, 0.5, { seg: 7 }); }, wingAt: [0.25, -0.05, 0],
});

// ---------- Giraffe World ----------
export const GIR = { coat: 0xf2c14e, pale: 0xfbe3a0, spot: 0xa85a24, hoof: 0x4a3424, horn: 0x6a4428, grass: 0xe0c060, grassD: 0xc8a848, leaf: 0x6fa83c, leafD: 0x4f8a34, bark: 0x7a5a3c };
// A giraffe's head, about 0.6 long, facing +z, with the top of the neck at the origin.
export function giraffeHeadInto(b, o = {}) {
  const C = o.coat ?? GIR.coat;
  b.sph(0.25, C, 0, 0.12, 0.1, 0.9, 0.9, 1.2, { seg: 10 }).sph(0.18, GIR.pale, 0, 0.02, 0.42, 0.9, 0.75, 1.3, { seg: 9 });
  b.tor(0.09, 0.014, GIR.hoof, 0, -0.03, 0.52, PI / 2 - 0.5, 0, PI, { arc: PI, seg: 7, tseg: 3 });
  for (const sx of [-1, 1]) {
    b.sph(0.018, GIR.hoof, sx * 0.06, 0.06, 0.65, 1, 1, 1, { seg: 4 });
    if (o.asleep) b.tor(0.045, 0.012, GIR.hoof, sx * 0.19, 0.2, 0.2, 0, sx * 1.1, PI, { arc: PI, seg: 6, tseg: 3 });
    else b.sph(0.055, 0x1b1f24, sx * 0.19, 0.22, 0.2, 0.6, 1.15, 1, { seg: 7 }).sph(0.018, 0xffffff, sx * 0.215, 0.25, 0.22, 1, 1, 1, { seg: 4 });
    b.sph(0.13, C, sx * 0.3, 0.3, -0.04, 1.2, 0.5, 0.7, { seg: 7 }).sph(0.08, 0xf4a8a0, sx * 0.31, 0.3, -0.01, 1.1, 0.35, 0.6, { seg: 6 });
    b.cyl(0.03, 0.04, 0.22, C, sx * 0.1, 0.44, 0.02, 0, 0, sx * -0.12, { seg: 6 }).sph(0.06, GIR.horn, sx * 0.115, 0.57, 0.02, 1, 1, 1, { seg: 6 });
  }
  b.sph(0.07, GIR.spot, 0, 0.33, 0.14, 1.2, 0.5, 1.3, { seg: 6 });
}
// A neck L long with the head on top, leaning forward (towards +z) by `tilt`; the bottom of the neck is at the origin.
export function giraffeNeckInto(b, L = 2.2, tilt = 0.35, o = {}) {
  const C = o.coat ?? GIR.coat, ca = Math.cos(tilt), sa = Math.sin(tilt);
  b.cyl(0.15, 0.3, L, C, 0, L / 2 * ca, L / 2 * sa, tilt, 0, 0, { seg: 9 });
  b.box(0.05, L * 0.9, 0.1, GIR.spot, 0, L * 0.52 * ca + 0.2 * sa, L * 0.52 * sa - 0.2 * ca, tilt, 0, 0);
  const n = Math.max(3, Math.round(L / 0.36));
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    const u = (i + 0.5) / n, r = 0.3 - 0.15 * u, a = k * 2.094 + i * 1.05 + 0.5, lx = Math.sin(a) * r * 0.96, lz = Math.cos(a) * r * 0.96, ly = u * L;
    b.sph(0.11 - 0.03 * u, GIR.spot, lx, ly * ca - lz * sa, ly * sa + lz * ca, 1, 1.25, 1, { seg: 5 });
  }
  b.at(0, L * ca, L * sa, 0, () => giraffeHeadInto(b, o));
}
// The rest of a giraffe: body, legs and tail, facing +z, about 2.5 high at the shoulder. The neck starts at (0, 2.35, 0.62).
export function giraffeBodyInto(b, o = {}) {
  const C = o.coat ?? GIR.coat;
  b.sph(0.56, C, 0, 2.08, 0.34, 0.85, 0.85, 1.05, { seg: 11 }).sph(0.5, C, 0, 1.94, -0.42, 0.85, 0.82, 1.05, { seg: 10 }).sph(0.4, GIR.pale, 0, 1.76, 0, 0.8, 0.5, 1.6, { seg: 8 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.cyl(0.12, 0.075, 1.75, C, sx * 0.27, 0.95, sz * 0.52 - 0.05, 0, 0, 0, { seg: 7 }).sph(0.1, C, sx * 0.27, 0.95, sz * 0.52 - 0.05, 1, 1, 1, { seg: 6 }).cyl(0.085, 0.1, 0.16, GIR.hoof, sx * 0.27, 0.08, sz * 0.52 - 0.05, 0, 0, 0, { seg: 7 });
    b.sph(0.09, GIR.spot, sx * 0.36, 1.55, sz * 0.52 - 0.05, 0.5, 1.3, 1, { seg: 5 });
  }
  for (let i = 0; i < 16; i++) {
    const u = (i + 0.5) / 16, ph = Math.acos(1 - 1.5 * u), th = i * 2.4, sx = Math.sin(ph) * Math.cos(th), sy = Math.cos(ph), sz = Math.sin(ph) * Math.sin(th), front = i % 2 === 0;
    if (front) b.sph(0.14 + (i % 3) * 0.02, GIR.spot, sx * 0.56 * 0.83, 2.08 + sy * 0.56 * 0.83, 0.34 + sz * 0.56 * 1.02, 1, 1, 1, { seg: 5 });
    else b.sph(0.13 + (i % 3) * 0.02, GIR.spot, sx * 0.5 * 0.83, 1.94 + sy * 0.5 * 0.8, -0.42 + sz * 0.5 * 1.02, 1, 1, 1, { seg: 5 });
  }
  b.cyl(0.025, 0.035, 0.85, C, 0, 1.6, -0.98, -0.18, 0, 0, { seg: 5 }).sph(0.08, GIR.hoof, 0, 1.15, -1.06, 1, 1.5, 1, { seg: 6 });
}
// A whole giraffe, about 5 s tall, standing on (x, y, z) and facing +z (turned by o.ry).
export function giraffeInto(b, x, y, z, s = 1, o = {}) {
  b.at(x, y, z, o.ry || 0, () => { giraffeBodyInto(b, o); b.at(0, 2.35, 0.62, 0, () => giraffeNeckInto(b, o.neck ?? 2.2, o.tilt ?? 0.35, o)); }, s);
}
// A flat-topped thorn tree, about 4 s high.
export function acaciaInto(b, x, y, z, s = 1, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.cyl(0.14, 0.24, 2.2, GIR.bark, 0, 1.1, 0, 0, 0, 0.08, { seg: 7 });
    for (const [a, l] of [[0.8, 1.5], [-0.9, 1.4], [0.2, 1.1]]) b.cyl(0.06, 0.1, l, GIR.bark, Math.sin(a) * l * 0.42 + 0.15, 2.2 + Math.cos(a) * l * 0.42, a * 0.2, 0, 0, -a, { seg: 5 });
    b.sph(1.7, GIR.leaf, 0.1, 3.3, 0, 1, 0.22, 0.85, { seg: 10 }).sph(1.1, GIR.leafD, -0.9, 3.05, 0.3, 1, 0.22, 0.9, { seg: 8 }).sph(1.0, GIR.leaf, 1.1, 3.0, -0.3, 1, 0.22, 0.9, { seg: 8 }).sph(0.8, GIR.leafD, 0.2, 3.62, 0.1, 1, 0.22, 0.9, { seg: 8 });
  }, s);
}
def('calfNap', 'low', 1.5, 0.9, 1.1, (b) => {
  // a giraffe calf having a nap, its long neck curled round to its tail
  b.sph(0.42, GIR.coat, 0, 0.3, 0, 1.3, 0.72, 0.9, { seg: 10 }).sph(0.3, GIR.pale, 0, 0.16, 0.1, 1.3, 0.5, 0.9, { seg: 8 });
  for (let i = 0; i < 7; i++) b.sph(0.1, GIR.spot, -0.36 + i * 0.12, 0.5 + Math.sin(i * 0.5) * 0.06, (i % 2 ? 0.2 : -0.15), 1, 0.6, 1, { seg: 5 });
  for (let i = 0; i < 6; i++) { const a = -0.4 + i * 0.42; b.sph(0.15 - i * 0.008, GIR.coat, 0.5 + Math.sin(a) * 0.1 - i * 0.02, 0.26 - i * 0.012, 0.1 + Math.cos(a) * 0.1 + i * 0.07, 1, 1, 1, { seg: 7 }); }
  b.at(0.34, 0.2, 0.5, -1.7, () => giraffeHeadInto(b, { asleep: true }), 0.9);
  for (const sx of [-1, 1]) b.cap(0.06, 0.4, GIR.coat, sx * 0.3, 0.07, -0.42, PI / 2, sx * 0.5, 0, { seg: 6 }).sph(0.065, GIR.hoof, sx * 0.4, 0.07, -0.66, 1, 1, 1, { seg: 5 });
  zedInto(b, -0.3, 0.84, 0, 0.5);
});
def('leafBasket', 'low', 1.3, 0.92, 1.1, (b) => {
  // lunch: a basket piled with leaves
  b.cyl(0.56, 0.42, 0.5, 0xc8964a, 0, 0.25, 0, 0, 0, 0, { seg: 12 }).tor(0.56, 0.04, 0xa87a3a, 0, 0.5, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 }).tor(0.5, 0.03, 0xa87a3a, 0, 0.26, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.1 + (i % 3) * 0.14; b.sph(0.2, i % 2 ? GIR.leaf : GIR.leafD, Math.cos(a) * r, 0.58 + (i % 4) * 0.07, Math.sin(a) * r, 1.3, 0.35, 0.7, { seg: 6 }); }
});
def('hoofBoots', 'low', 1.5, 0.8, 0.9, (b) => {
  // four wellies in a row: one for each foot
  for (let i = 0; i < 4; i++) { const x = -0.54 + i * 0.36, c = [0xe5383b, 0xffd23f, 0x4f8fe0, 0x7fc46a][i]; b.cyl(0.13, 0.12, 0.56, c, x, 0.36, -0.06, 0, 0, 0, { seg: 8 }).sph(0.14, c, x, 0.12, 0.1, 0.95, 0.8, 1.5, { seg: 8 }).cyl(0.14, 0.14, 0.05, 0xffffff, x, 0.64, -0.06, 0, 0, 0, { seg: 8 }).box(0.3, 0.05, 0.5, 0x4a3424, x, 0.025, 0.06); }
});
def('scarfPile', 'low', 1.4, 0.75, 1.2, (b) => {
  // a very, very long scarf, coiled up ready for a very long neck
  for (let i = 0; i < 4; i++) for (let k = 0; k < 10; k++) { const a = k * 0.628 + i * 0.3, r = 0.52 - i * 0.1; b.sph(0.12, (k + i) % 2 ? 0xe5383b : 0xfff3d6, Math.cos(a) * r, 0.1 + i * 0.16, Math.sin(a) * r, 1.4, 0.7, 1.4, { seg: 5 }); }
  b.cap(0.09, 0.36, 0xe5383b, 0.62, 0.1, 0.3, PI / 2, 0.5, 0, { seg: 6 });
  for (let i = -1; i <= 1; i++) b.box(0.03, 0.03, 0.14, 0xfff3d6, 0.74 + i * 0.05, 0.08, 0.56 + Math.abs(i) * -0.02, 0, 0.5, 0);
});
def('antHill', 'low', 1.2, 0.95, 1.1, (b) => {
  // a termite mound with somebody at home
  b.cone(0.55, 0.9, 0xb5814f, 0, 0.45, 0, 0, 0, 0, { seg: 9 }).cone(0.3, 0.55, 0xa87444, 0.3, 0.27, 0.2, 0, 0, -0.15, { seg: 7 }).cone(0.26, 0.45, 0xc08a58, -0.32, 0.22, 0.14, 0, 0, 0.2, { seg: 7 });
  for (const [x, y, z] of [[0.05, 0.4, 0.36], [-0.14, 0.62, 0.2], [0.3, 0.24, 0.42]]) b.sph(0.055, 0x3a2a1c, x, y, z, 1, 1, 0.5, { seg: 6 });
  b.sph(0.045, 0x3a2a1c, 0.05, 0.42, 0.42, 1, 1, 1, { seg: 5 }).sph(0.012, 0xffffff, 0.035, 0.435, 0.46, 1, 1, 1, { seg: 4 }).sph(0.012, 0xffffff, 0.065, 0.435, 0.46, 1, 1, 1, { seg: 4 });
});
def('youngGiraffe', 'tall', 1.3, 2.8, 1.4, (b) => {
  // two young giraffes, who are only as tall as lamp-posts so far; one has a bow on
  giraffeInto(b, -0.3, 0, -0.1, 0.56, { neck: 2.0, tilt: 0.25, ry: 0.2 }); giraffeInto(b, 0.34, 0, 0.05, 0.5, { neck: 2.0, tilt: 0.3, ry: -0.25 });
  b.at(-0.3, 0, -0.1, 0.2, () => b.tor(0.12, 0.05, 0xe5383b, 0, 2.3, 0.44, PI / 2 - 0.25, 0, 0, { seg: 9, tseg: 5 }).cap(0.045, 0.3, 0xe5383b, 0.1, 2.1, 0.52, 0.2, 0, 0.2, { seg: 5 }));
});
def('acaciaTree', 'tall', 1.7, 2.8, 1.5, (b) => {
  // a little thorn tree with a flat top
  acaciaInto(b, 0, 0, 0, 0.72);
});
def('tallDoor', 'tall', 1.3, 2.8, 0.7, (b) => {
  // a front door for somebody tall, with the letter box at giraffe height
  b.box(1.2, 2.8, 0.16, 0xfff3d6, 0, 1.4, -0.06).box(0.9, 2.6, 0.1, 0x3f8fd8, 0, 1.34, 0.04).box(0.7, 0.9, 0.04, 0x5aa8f0, 0, 0.6, 0.1).box(0.7, 0.9, 0.04, 0x5aa8f0, 0, 1.65, 0.1);
  b.box(0.4, 0.08, 0.05, 0xffd23f, 0, 2.3, 0.1).sph(0.06, 0xffd23f, 0.32, 2.0, 0.12, 1, 1, 1, { seg: 6 }).box(0.3, 0.3, 0.02, 0xffe9a0, 0, 2.52, 0.1, 0, 0, 0, { glow: true, grad: 1 });
  b.box(1.1, 0.08, 0.5, 0xc8964a, 0, 0.04, 0.2);
  for (let i = 0; i < 5; i++) b.sph(0.07, GIR.spot, -0.36 + ((i * 7) % 5) * 0.18, 0.3 + i * 0.5, 0.11, 1.2, 1, 0.3, { seg: 5 });
});
def('topiary', 'tall', 1.3, 2.8, 1.4, (b) => {
  // a bush clipped into the shape of a giraffe, in a pot
  b.cyl(0.42, 0.32, 0.5, 0xc8704a, 0, 0.25, 0, 0, 0, 0, { seg: 10 }).cyl(0.45, 0.45, 0.08, 0xb5603c, 0, 0.5, 0, 0, 0, 0, { seg: 10 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.09, 0.09, 0.7, GIR.leafD, sx * 0.17, 0.85, sz * 0.26, 0, 0, 0, { seg: 6 });
  b.sph(0.4, GIR.leaf, 0, 1.4, 0, 0.8, 0.75, 1.3, { seg: 9 }).cyl(0.13, 0.2, 1.0, GIR.leaf, 0, 2.05, 0.42, 0.3, 0, 0, { seg: 7 }).sph(0.2, GIR.leaf, 0, 2.58, 0.62, 0.9, 0.85, 1.4, { seg: 8 });
  for (const sx of [-1, 1]) b.cyl(0.03, 0.03, 0.18, GIR.leafD, sx * 0.08, 2.8, 0.56, 0, 0, 0, { seg: 5 }).sph(0.07, GIR.leafD, sx * 0.2, 2.68, 0.52, 1.2, 0.5, 0.8, { seg: 5 });
  for (const [x, y, z] of [[0.3, 1.5, 0.2], [-0.3, 1.36, -0.2], [0.1, 2.1, 0.56]]) b.sph(0.05, 0xff8fb0, x, y, z, 1, 1, 1, { seg: 5 });
});
def('heightChart', 'tall', 1.2, 2.8, 0.8, (b) => {
  // "how tall are you today?": a measuring post, with a little bird on top who is the tallest of all
  b.box(0.9, 0.16, 0.7, 0xc8964a, 0, 0.08, 0).box(0.5, 2.5, 0.12, 0xfff3d6, 0, 1.4, 0);
  for (let i = 0; i < 12; i++) b.box(i % 3 ? 0.14 : 0.26, 0.03, 0.02, i % 3 ? 0x3a4252 : 0xe5383b, -0.25 + (i % 3 ? 0.07 : 0.13), 0.36 + i * 0.2, 0.07);
  for (let i = 0; i < 4; i++) b.sph(0.06, GIR.spot, 0.12 + (i % 2) * 0.06, 0.6 + i * 0.55, 0.065, 1.2, 1, 0.3, { seg: 5 });
  b.box(0.7, 0.08, 0.2, 0xe5383b, 0.1, 2.6, 0).sph(0.11, 0x8a5a3c, 0, 2.78, 0, 1, 0.9, 1.2, { seg: 7 }).sph(0.07, 0x8a5a3c, 0, 2.9, 0.1, 1, 1, 1, { seg: 6 }).cone(0.025, 0.08, 0xe5383b, 0, 2.89, 0.19, PI / 2, 0, 0, { seg: 4 });
});
def('spottyBall', 'low', 1.1, 1.0, 1.0, (b) => {
  // a ball in a giraffe's coat, rolling down the lane
  b.sph(0.5, GIR.coat, 0, 0, 0, 1, 1, 1, { seg: 12 });
  for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14, ph = Math.acos(1 - 2 * u), th = i * 2.4; b.sph(0.15, GIR.spot, Math.sin(ph) * Math.cos(th) * 0.42, Math.cos(ph) * 0.42, Math.sin(ph) * Math.sin(th) * 0.42, 1, 1, 1, { seg: 5 }); }
}, { center: true });
def('marula', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the oxpecker drops: a big yellow fruit with a leaf on it
  b.sph(0.46, 0xffd23f, 0, 0, 0, 1, 0.94, 1, { seg: 11 }).sph(0.2, 0xffe680, 0.18, 0.22, 0.2, 1, 1, 1, { seg: 6 });
  b.cyl(0.03, 0.03, 0.16, GIR.bark, 0, 0.48, 0, 0, 0, 0.3, { seg: 4 }).sph(0.16, GIR.leaf, 0.14, 0.52, 0, 1.4, 0.25, 0.7, { seg: 6 });
}, { center: true });
def('calfTrot', 'low', 1.5, 0.98, 0.8, (b) => {
  // a very small giraffe at a gallop, neck stretched out in front; it faces +x
  b.sph(0.26, GIR.coat, 0, 0.5, 0, 1.5, 0.85, 0.85, { seg: 9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.05, 0.035, 0.44, GIR.coat, sx * 0.24 + sx * 0.08, 0.22, sz * 0.11, 0, 0, sx * -0.4, { seg: 5 }).sph(0.045, GIR.hoof, sx * 0.24 + sx * 0.17, 0.04, sz * 0.11, 1, 0.8, 1, { seg: 5 });
  b.cyl(0.07, 0.12, 0.5, GIR.coat, 0.5, 0.72, 0, 0, 0, -0.95, { seg: 7 });
  b.at(0.7, 0.82, 0, PI / 2, () => giraffeHeadInto(b), 0.6);
  for (let i = 0; i < 7; i++) b.sph(0.06, GIR.spot, -0.3 + i * 0.1, 0.62 + (i % 2) * 0.06, (i % 2 ? 0.14 : -0.14), 1, 1, 0.6, { seg: 5 });
  b.cyl(0.015, 0.02, 0.3, GIR.coat, -0.46, 0.62, 0, 0, 0, 1.0, { seg: 4 }).sph(0.04, GIR.hoof, -0.6, 0.72, 0, 1, 1, 1, { seg: 5 });
});
def('oxpecker', 'deco', 2.0, 1.0, 1.2, (b) => {
  // the little bird that rides about on giraffes, with a fruit in its feet
  b.sph(0.34, 0x8a6a4a, 0, 0, 0, 0.85, 0.8, 1.3, { seg: 10 }).sph(0.26, 0xf0d8a8, 0, -0.1, 0.06, 0.8, 0.6, 1.2, { seg: 8 });
  b.sph(0.2, 0x8a6a4a, 0, 0.14, 0.44, 1, 1, 1, { seg: 9 }).cone(0.07, 0.2, 0xe5383b, 0, 0.1, 0.68, PI / 2, 0, 0, { seg: 6 }).cone(0.045, 0.1, 0xffd23f, 0, 0.1, 0.78, PI / 2, 0, 0, { seg: 5 });
  for (const sx of [-1, 1]) b.sph(0.05, 0xffd23f, sx * 0.13, 0.2, 0.56, 0.6, 1, 1, { seg: 6 }).sph(0.028, 0x1b1f24, sx * 0.15, 0.2, 0.58, 0.6, 1, 1, { seg: 5 }).cyl(0.016, 0.016, 0.2, 0x4a3424, sx * 0.1, -0.34, 0, 0, 0, 0, { seg: 4 });
  b.cone(0.14, 0.4, 0x6a4f38, 0, 0.02, -0.56, -PI / 2, 0, 0, { seg: 5 });
  b.sph(0.2, 0xffd23f, 0, -0.56, 0, 1, 0.94, 1, { seg: 8 });
}, {
  wings: (b, sx) => { b.sph(0.42, 0x8a6a4a, sx * 0.4, 0, 0, 1.2, 0.12, 0.6, { seg: 8 }).sph(0.26, 0x6a4f38, sx * 0.82, 0, -0.06, 1.3, 0.1, 0.5, { seg: 7 }); }, wingAt: [0.24, 0.06, 0],
});

// ---------- Orchard Land ----------
export const ORCH = { leaf: 0x5fae3c, leafD: 0x4a9432, bark: 0x7a5a3c, apple: 0xe5383b, pear: 0xd8d04a, orange: 0xff9a2e, plum: 0x8a4fb0, cherry: 0xc8203a, blossom: 0xffc0d8, blossomW: 0xfff0f4, crate: 0xc8964a, crateD: 0xa87a3a, straw: 0xe8c860 };
const FRUITS = [ORCH.apple, ORCH.pear, ORCH.orange, ORCH.plum, ORCH.cherry];
// One fruit, r across: 0 an apple, 1 a pear, 2 an orange, 3 a plum, 4 a cherry.
export function fruitInto(b, kind, x, y, z, r = 0.12, seg = 7) {
  const c = FRUITS[kind];
  if (kind === 1) b.sph(r, c, x, y, z, 1, 1, 1, { seg }).sph(r * 0.66, c, x, y + r * 0.8, z, 1, 1.1, 1, { seg });
  else b.sph(r, c, x, y, z, 1, kind === 3 ? 1.2 : 0.92, 1, { seg });
  b.cyl(r * 0.07, r * 0.07, r * 0.5, ORCH.bark, x, y + r * (kind === 1 ? 1.6 : 1.05), z, 0, 0, 0.3, { seg: 4 });
  if (kind !== 2) b.sph(r * 0.4, ORCH.leaf, x + r * 0.4, y + r * (kind === 1 ? 1.7 : 1.15), z, 1.5, 0.3, 0.8, { seg: 5 });
}
// A slatted crate, w wide, heaped with fruit of one kind.
export function fruitCrateInto(b, x, y, z, w = 1.0, kind = 0, ry = 0) {
  b.at(x, y, z, ry, () => {
    const d = w * 0.7, h = w * 0.5;
    b.box(w, h * 0.3, d, ORCH.crateD, 0, h * 0.15, 0);
    for (let i = 0; i < 3; i++) b.box(w, h * 0.22, 0.04, ORCH.crate, 0, h * (0.14 + i * 0.36), d / 2).box(w, h * 0.22, 0.04, ORCH.crate, 0, h * (0.14 + i * 0.36), -d / 2).box(0.04, h * 0.22, d, ORCH.crate, w / 2, h * (0.14 + i * 0.36), 0).box(0.04, h * 0.22, d, ORCH.crate, -w / 2, h * (0.14 + i * 0.36), 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.06, h, 0.06, ORCH.crateD, sx * w / 2, h / 2, sz * d / 2);
    const r = w * 0.13;
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) fruitInto(b, kind, (i - 1) * w * 0.29, h * 0.95 + (i === 1 ? r * 0.5 : 0), (k - 0.5) * d * 0.5 + (i % 2) * 0.03, r);
    fruitInto(b, kind, w * 0.1, h * 0.95 + r * 1.5, 0, r);
  });
}
// A fruit tree made of few, flat faces (there are whole rows of them): about 3.6 s high. `kind` is its fruit (see fruitInto), or 5 and
// 6 for a tree all in pink or white blossom.
export function orchTreeInto(b, x, y, z, s = 1, kind = 0, a0 = 0) {
  const leaf = kind === 5 ? ORCH.blossom : kind === 6 ? ORCH.blossomW : (kind % 2 ? ORCH.leafD : ORCH.leaf);
  b.cyl(0.13 * s, 0.2 * s, 1.5 * s, ORCH.bark, x, y + 0.75 * s, z, 0, 0, 0, { seg: 5 });
  b.add(new THREE.IcosahedronGeometry(1, 1), leaf, x, y + 2.4 * s, z, 0, a0, 0, 1.35 * s, 1.15 * s, 1.35 * s, { grad: 0.72 });
  b.add(new THREE.IcosahedronGeometry(1, 0), kind >= 5 ? 0xffffff : ORCH.leaf, x + 0.5 * s, y + 3.05 * s, z - 0.2 * s, 0, a0 * 2, 0, 0.75 * s, 0.6 * s, 0.75 * s, { grad: 0.8 });
  if (kind < 5) for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8, ph = Math.acos(0.9 - 1.5 * u), th = i * 2.4 + a0; b.add(new THREE.OctahedronGeometry(1, 0), FRUITS[kind], x + Math.sin(ph) * Math.cos(th) * 1.33 * s, y + 2.4 * s + Math.cos(ph) * 1.1 * s, z + Math.sin(ph) * Math.sin(th) * 1.33 * s, 0, 0, 0, 0.14 * s, 0.14 * s, 0.14 * s); }
}
// A hedgehog facing +x, about 0.5 high, with something speared on its prickles.
function hedgehogInto(b, x, y, z, s = 1) {
  b.at(x, y, z, 0, () => {
    b.sph(0.34, 0x6a4a32, 0, 0.3, 0, 1.25, 0.85, 1, { seg: 9 }).sph(0.2, 0xe0c090, 0.36, 0.22, 0, 1.3, 0.85, 0.9, { seg: 8 }).sph(0.045, 0x1b1f24, 0.62, 0.2, 0, 1, 1, 1, { seg: 5 });
    for (const sz of [-1, 1]) { b.sph(0.03, 0x1b1f24, 0.46, 0.3, sz * 0.11, 1, 1, 1, { seg: 5 }).sph(0.06, 0x6a4a32, 0.3, 0.4, sz * 0.16, 0.6, 1, 1, { seg: 5 }); for (const sx of [-1, 1]) b.sph(0.06, 0xe0c090, sx * 0.2 + 0.05, 0.05, sz * 0.18, 1.3, 0.7, 1, { seg: 5 }); }
    for (let i = 0; i < 22; i++) { const u = (i + 0.5) / 22, ph = Math.acos(1 - 1.15 * u), th = i * 2.4; const nx = Math.sin(ph) * Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph) * Math.sin(th); if (nx > 0.75) continue; b.cone(0.045, 0.2, 0x4a3424, nx * 0.42 - 0.02, 0.3 + ny * 0.3, nz * 0.34, nz * 1.2, 0, -nx * 1.2, { seg: 4 }); }
  }, s);
}
def('fruitCrate', 'low', 1.4, 0.9, 1.0, (b) => {
  // a crate heaped with apples, and a smaller one of pears on the side
  fruitCrateInto(b, -0.12, 0, 0, 1.1, 0, 0.1); fruitCrateInto(b, 0.5, 0, 0.3, 0.5, 1, -0.5);
});
def('fruitBaskets', 'low', 1.5, 0.85, 1.0, (b) => {
  // two baskets, one of plums and one of oranges
  for (const sx of [-1, 1]) {
    b.cyl(0.36, 0.28, 0.4, 0xc8964a, sx * 0.36, 0.2, 0, 0, 0, 0, { seg: 10 }).tor(0.36, 0.03, 0xa87a3a, sx * 0.36, 0.4, 0, PI / 2, 0, 0, { seg: 10, tseg: 4 }).tor(0.34, 0.025, 0xa87a3a, sx * 0.36, 0.4, 0, 0, 0.4, 0, { arc: PI, seg: 10, tseg: 4 });
    for (let i = 0; i < 6; i++) fruitInto(b, sx > 0 ? 2 : 3, sx * 0.36 + Math.cos(i * 1.05) * (i < 5 ? 0.18 : 0), 0.44 + (i === 5 ? 0.14 : 0), Math.sin(i * 1.05) * (i < 5 ? 0.18 : 0), 0.11, 6);
  }
});
def('wheelbarrow', 'low', 1.3, 0.95, 1.4, (b) => {
  // a wheelbarrow full of oranges
  b.box(0.8, 0.36, 1.0, 0x4f8f4a, 0, 0.52, 0, 0.12, 0, 0, { grad: 0.85 }).box(0.7, 0.04, 0.9, 0x3a6f38, 0, 0.36, 0, 0.12, 0, 0);
  b.cyl(0.2, 0.2, 0.1, 0x24262c, 0, 0.2, 0.62, 0, 0, PI / 2, { seg: 10 }).cyl(0.07, 0.07, 0.12, 0xc8c0d8, 0, 0.2, 0.62, 0, 0, PI / 2, { seg: 6 });
  for (const sx of [-1, 1]) b.cyl(0.03, 0.03, 0.9, 0x8a5a3c, sx * 0.34, 0.5, -0.76, PI / 2 - 0.25, 0, 0, { seg: 5 }).cyl(0.03, 0.03, 0.42, 0x3a4252, sx * 0.3, 0.2, -0.34, 0.2, 0, 0, { seg: 5 });
  for (let i = 0; i < 9; i++) fruitInto(b, 2, (i % 3 - 1) * 0.24, 0.76 + (i > 5 ? 0.14 : 0), (Math.floor(i / 3) - 1) * 0.28 * (i > 5 ? 0.4 : 1), 0.13, 6);
});
def('wormApple', 'low', 1.2, 0.98, 1.1, (b) => {
  // an enormous apple, and the worm who lives in it saying hello
  b.sph(0.46, ORCH.apple, 0, 0.44, 0, 1.08, 0.96, 1.08, { seg: 12 }).sph(0.2, 0xff8a7a, 0.2, 0.62, 0.3, 1, 1, 0.5, { seg: 6 });
  b.cyl(0.03, 0.03, 0.16, ORCH.bark, 0, 0.9, 0, 0, 0, 0.2, { seg: 5 }).sph(0.14, ORCH.leaf, 0.14, 0.94, 0, 1.5, 0.3, 0.8, { seg: 6 });
  b.sph(0.11, 0x4a2c20, -0.14, 0.5, 0.46, 1, 1, 0.3, { seg: 7 });
  for (let i = 0; i < 4; i++) b.sph(0.085, i % 2 ? 0xa8e070 : 0x8fd058, -0.14 - i * 0.012, 0.5 + i * 0.05, 0.5 + i * 0.075, 1, 1, 1, { seg: 7 });
  for (const sx of [-1, 1]) b.sph(0.022, 0x1b1f24, -0.18 + sx * 0.04, 0.68, 0.79, 1, 1, 1, { seg: 4 });
  b.tor(0.03, 0.008, 0x1b1f24, -0.18, 0.63, 0.795, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
});
def('wateringCan', 'low', 1.4, 0.9, 1.0, (b) => {
  // a watering can and three pots of seedlings
  b.cyl(0.3, 0.3, 0.56, 0x5ad0e0, -0.3, 0.28, 0, 0, 0, 0, { seg: 10 }).cyl(0.045, 0.06, 0.6, 0x5ad0e0, 0.1, 0.4, 0, 0, 0, -0.9, { seg: 6 }).cyl(0.12, 0.05, 0.1, 0x5ad0e0, 0.36, 0.6, 0, 0, 0, -0.9, { seg: 8 }).tor(0.2, 0.03, 0x3ab0c0, -0.56, 0.36, 0, 0, 0, 0, { seg: 9, tseg: 4 });
  for (let i = 0; i < 3; i++) { const x = 0.22 + i * 0.2, z = 0.36 - i * 0.26; b.cyl(0.1, 0.075, 0.16, 0xc8704a, x, 0.08, z, 0, 0, 0, { seg: 7 }).cyl(0.012, 0.012, 0.16, ORCH.leafD, x, 0.24, z, 0, 0, 0, { seg: 3 }); for (const s of [-1, 1]) b.sph(0.05, ORCH.leaf, x + s * 0.05, 0.32, z, 1.3, 0.3, 0.8, { seg: 5 }); }
});
def('stepLadder', 'tall', 1.4, 2.7, 1.2, (b) => {
  // a picker's ladder with a basket of cherries on the top step
  for (const sx of [-1, 1]) b.box(0.07, 2.5, 0.07, 0xc8964a, sx * 0.4, 1.2, 0.32, 0.26, 0, 0).box(0.07, 2.5, 0.07, 0xa87a3a, sx * 0.4, 1.2, -0.32, -0.26, 0, 0);
  for (let i = 0; i < 6; i++) b.box(0.86, 0.05, 0.14, 0xc8964a, 0, 0.3 + i * 0.36, 0.56 - i * 0.097, 0.26, 0, 0);
  b.box(0.95, 0.07, 0.4, 0xc8964a, 0, 2.38, 0).cyl(0.26, 0.2, 0.26, 0xc8964a, 0, 2.54, 0, 0, 0, 0, { seg: 9 });
  for (let i = 0; i < 5; i++) fruitInto(b, 4, Math.cos(i * 1.257) * 0.12, 2.7, Math.sin(i * 1.257) * 0.12, 0.08, 6);
});
def('sapling', 'tall', 1.6, 2.8, 1.6, (b) => {
  // a young tree in blossom, tied to its stake
  orchTreeInto(b, 0, 0, 0, 0.8, 5, 0.4);
  b.cyl(0.035, 0.045, 1.5, 0xc8964a, 0.24, 0.75, 0, 0, 0, 0, { seg: 5 }).tor(0.14, 0.02, 0xe5383b, 0.12, 1.0, 0, PI / 2, 0, 0, { seg: 8, tseg: 3 });
  for (const [x, z] of [[0.5, 0.4], [-0.4, 0.5], [0.1, -0.5]]) b.sph(0.06, ORCH.blossom, x, 0.03, z, 1, 0.3, 1, { seg: 5 });
});
def('beeHives', 'tall', 1.3, 2.6, 1.2, (b) => {
  // a tall stack of beehive boxes, with the bees at home
  b.box(1.0, 0.1, 0.9, 0x8a5a3c, 0, 0.3, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, 0.3, 0.08, 0x8a5a3c, sx * 0.4, 0.15, sz * 0.34);
  for (let i = 0; i < 4; i++) b.box(0.95 - (i % 2) * 0.04, 0.46, 0.85, [0xfff3d6, 0xffe27a, 0xfff3d6, 0xa8dcf0][i], 0, 0.58 + i * 0.47, 0, 0, 0, 0, { grad: 0.9 });
  b.prism(1.1, 0.34, 1.0, 0xc94a3a, 0, 2.28, 0, PI / 2).box(0.3, 0.05, 0.04, 0x24262c, 0, 0.42, 0.44).box(0.4, 0.04, 0.16, 0x8a5a3c, 0, 0.37, 0.5);
  for (const [x, y, z] of [[0.3, 1.0, 0.5], [-0.34, 1.7, 0.52], [0.1, 2.2, 0.56], [-0.2, 0.62, 0.56], [0.56, 1.9, 0.2]]) { b.sph(0.06, 0xffd23f, x, y, z, 1.4, 1, 1, { seg: 6 }).sph(0.045, 0x24262c, x - 0.04, y, z, 0.5, 1.02, 1.02, { seg: 5 }).sph(0.04, 0xffffff, x, y + 0.06, z, 1.2, 0.3, 1.6, { seg: 4 }); }
});
def('scareFriend', 'tall', 1.5, 2.8, 0.9, (b) => {
  // a scarecrow who has made friends with the birds
  b.cyl(0.05, 0.05, 2.3, 0x8a5a3c, 0, 1.15, 0, 0, 0, 0, { seg: 5 }).cyl(0.045, 0.045, 1.5, 0x8a5a3c, 0, 1.8, 0, 0, 0, PI / 2, { seg: 5 });
  b.box(0.62, 0.8, 0.3, 0x4f8fe0, 0, 1.56, 0, 0, 0, 0, { grad: 0.85 }).box(0.5, 0.7, 0.34, 0xe5383b, 0, 1.2, 0.0).box(0.16, 0.16, 0.02, 0xffd23f, 0.12, 1.3, 0.18);
  for (const sx of [-1, 1]) { b.box(0.5, 0.26, 0.26, 0x4f8fe0, sx * 0.5, 1.8, 0); for (let i = 0; i < 3; i++) b.cone(0.03, 0.2, ORCH.straw, sx * (0.8 + i * 0.02), 1.8 + (i - 1) * 0.06, 0, 0, 0, sx * -PI / 2 + (i - 1) * 0.3, { seg: 4 }); }
  b.sph(0.28, 0xf0d8a8, 0, 2.2, 0, 1, 1, 1, { seg: 10 }).cone(0.5, 0.16, ORCH.straw, 0, 2.42, 0, 0, 0, 0, { seg: 12 }).cyl(0.2, 0.24, 0.2, ORCH.straw, 0, 2.54, 0, 0, 0, 0, { seg: 9 }).tor(0.23, 0.025, 0xe5383b, 0, 2.47, 0, PI / 2, 0, 0, { seg: 9, tseg: 3 });
  for (const sx of [-1, 1]) b.sph(0.04, 0x1b1f24, sx * 0.1, 2.24, 0.26, 1, 1, 0.5, { seg: 5 });
  b.cone(0.05, 0.16, 0xff8a3c, 0, 2.17, 0.3, PI / 2, 0, 0, { seg: 5 }).tor(0.1, 0.014, 0x7a2a2a, 0, 2.12, 0.25, 0.2, 0, PI, { arc: PI, seg: 7, tseg: 3 });
  b.sph(0.08, 0x3a4252, 0.66, 1.98, 0, 1, 0.9, 1.3, { seg: 6 }).sph(0.05, 0x3a4252, 0.66, 2.06, 0.08, 1, 1, 1, { seg: 5 }).cone(0.02, 0.06, 0xffb347, 0.66, 2.05, 0.14, PI / 2, 0, 0, { seg: 4 });
});
def('juiceBarrels', 'tall', 1.4, 2.6, 1.2, (b) => {
  // three barrels of apple juice, one on top of another, with a tap and a cup
  for (let i = 0; i < 3; i++) {
    const y = 0.42 + i * 0.84, r = 0.52 - i * 0.04;
    b.cyl(r * 0.84, r * 0.84, 0.8, 0xb5814f, 0, y, 0, 0, 0, 0, { seg: 12 }).cyl(r, r, 0.36, 0xc8964a, 0, y, 0, 0, 0, 0, { seg: 12 });
    for (const dy of [-0.3, 0.3]) b.tor(r * 0.9, 0.025, 0x4a4456, 0, y + dy, 0, PI / 2, 0, 0, { seg: 12, tseg: 3 });
  }
  b.cyl(0.03, 0.03, 0.2, 0xc8c0d8, 0, 0.36, 0.54, PI / 2, 0, 0, { seg: 5 }).box(0.1, 0.03, 0.03, 0xe5383b, 0, 0.42, 0.62).cyl(0.07, 0.055, 0.12, 0xffffff, 0, 0.06, 0.66, 0, 0, 0, { seg: 7 });
  fruitInto(b, 0, 0, 2.62, 0, 0.16);
});
def('rollApple', 'low', 1.1, 1.0, 1.0, (b) => {
  // a great big apple rolling down the lane
  b.sph(0.5, ORCH.apple, 0, 0, 0, 1, 0.94, 1, { seg: 12 }).sph(0.3, 0xffd23f, 0.2, -0.1, 0.28, 1, 1, 0.5, { seg: 6 });
  b.cyl(0.035, 0.035, 0.2, ORCH.bark, 0, 0.5, 0, 0, 0, 0.3, { seg: 5 }).sph(0.16, ORCH.leaf, 0.16, 0.54, 0, 1.5, 0.3, 0.8, { seg: 6 }).sph(0.07, 0x4a3424, 0, -0.46, 0, 1, 0.4, 1, { seg: 5 });
}, { center: true });
def('honeyPot', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the bumblebee drops: a pot of honey, rolling
  b.sph(0.44, 0xe0a030, 0, 0, 0, 1, 0.92, 1, { seg: 11 }).cyl(0.3, 0.34, 0.14, 0xfff3d6, 0, 0.36, 0, 0, 0, 0, { seg: 10 }).sph(0.3, 0xffd23f, 0, 0.4, 0, 1, 0.3, 1, { seg: 8 });
  b.box(0.36, 0.2, 0.02, 0xfff3d6, 0, 0, 0.43).sph(0.1, 0xffd23f, 0.3, 0.2, 0.22, 1, 1.6, 0.6, { seg: 6 });
}, { center: true });
def('hedgeTrot', 'low', 1.3, 0.95, 0.9, (b) => {
  // a hedgehog hurrying home with an apple on its prickles; it faces +x
  hedgehogInto(b, 0, 0, 0, 1.1);
  fruitInto(b, 0, -0.08, 0.78, 0, 0.17);
});
def('bumble', 'deco', 2.0, 1.1, 1.3, (b) => {
  // a bumblebee as big as a football, carrying a pot of honey
  b.sph(0.4, 0xffd23f, 0, 0, 0, 1, 0.95, 1.25, { seg: 11 });
  for (const z of [-0.2, 0.14]) b.cyl(0.39 - Math.abs(z) * 0.2, 0.39 - Math.abs(z) * 0.2, 0.14, 0x24262c, 0, 0, z, PI / 2, 0, 0, { seg: 12 });
  b.sph(0.26, 0x24262c, 0, 0.04, 0.48, 1, 1, 0.9, { seg: 9 }).cone(0.07, 0.2, 0x24262c, 0, -0.02, -0.56, -PI / 2, 0, 0, { seg: 5 });
  for (const sx of [-1, 1]) { b.sph(0.08, 0xffffff, sx * 0.12, 0.1, 0.68, 1, 1.15, 0.6, { seg: 7 }).sph(0.04, 0x1b1f24, sx * 0.12, 0.09, 0.73, 1, 1.15, 0.6, { seg: 5 }).sph(0.05, 0xff8fb0, sx * 0.2, -0.04, 0.66, 1, 0.7, 0.4, { seg: 5 }); b.cyl(0.012, 0.012, 0.26, 0x24262c, sx * 0.08, 0.36, 0.5, 0.3, 0, sx * -0.3, { seg: 3 }).sph(0.035, 0x24262c, sx * 0.12, 0.48, 0.54, 1, 1, 1, { seg: 4 }); }
  b.tor(0.07, 0.014, 0xffffff, 0, -0.04, 0.7, 0.2, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  b.sph(0.22, 0xe0a030, 0, -0.56, 0.05, 1, 0.92, 1, { seg: 8 }).cyl(0.15, 0.17, 0.08, 0xfff3d6, 0, -0.38, 0.05, 0, 0, 0, { seg: 8 });
  for (const sx of [-1, 1]) b.cyl(0.014, 0.014, 0.22, 0x24262c, sx * 0.12, -0.3, 0.05, 0, 0, sx * 0.3, { seg: 3 });
}, {
  wings: (b, sx) => { b.sph(0.36, 0xeaf6ff, sx * 0.3, 0.08, 0, 1.2, 0.08, 0.6, { seg: 8 }).sph(0.24, 0xd8ecfa, sx * 0.26, 0.04, -0.3, 1.1, 0.08, 0.55, { seg: 7 }); }, wingAt: [0.16, 0.3, 0],
});

// ---------- the Friendly Ghost World ----------
export const BOO = { white: 0xffffff, hem: 0xe2fff4, eye: 0x24263a, cheek: 0xffa8c0, purple: 0x6a4aa8, purpleL: 0x7a5ab8, purpleD: 0x4a3280, pumpkin: 0xff9a3c, pumpkinD: 0xf08424, stalk: 0x5a8a3a, glow: 0xffe27a, wisp: 0xbffff0, iron: 0x2a2a44 };
// A friendly ghost, facing +z: about 0.95 s high, more with a hat on. (x, y, z) is the bottom of its wavy hem. Options: ry; hat (1 a
// bobble hat, 2 a top hat, 3 a party hat, 4 a nightcap, 5 a bow) in colour hatC; scarf and bow (tie) are colours; wave lifts an arm;
// face 1 is singing and 2 is fast asleep; arms: false leaves the arms off.
export function ghostInto(b, x, y, z, s = 1, o = {}) {
  const W = BOO.white, hc = o.hatC ?? 0xe5383b, seg = o.seg || 12;
  b.at(x, y, z, o.ry || 0, () => {
    b.sph(0.3, W, 0, 0.62, 0, 1, 1, 1, { seg }).cyl(0.3, 0.35, 0.46, W, 0, 0.39, 0, 0, 0, 0, { seg });
    for (let i = 0; i < 7; i++) { const a = i * 0.898; b.sph(0.118, BOO.hem, Math.cos(a) * 0.245, 0.15, Math.sin(a) * 0.245, 1, 1.2, 1, { seg: seg > 12 ? 9 : 6 }); }
    if (o.arms !== false) {
      b.sph(0.1, W, -0.37, 0.42, 0.06, 0.9, 1.3, 0.9, { seg: 6 });
      if (o.wave) b.cap(0.08, 0.2, W, 0.42, 0.66, 0.04, 0, 0, -0.7, { seg: 6 }); else b.sph(0.1, W, 0.37, 0.42, 0.06, 0.9, 1.3, 0.9, { seg: 6 });
    }
    const f = o.face || 0;
    for (const sx of [-1, 1]) {
      if (f === 2) b.tor(0.05, 0.013, BOO.eye, sx * 0.115, 0.68, 0.276, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
      else b.sph(0.055, BOO.eye, sx * 0.115, 0.67, 0.262, 1, 1.35, 0.5, { seg: 7 }).sph(0.02, 0xffffff, sx * 0.115 + 0.018, 0.7, 0.288, 1, 1, 0.5, { seg: 4 });
      b.sph(0.045, BOO.cheek, sx * 0.2, 0.56, 0.228, 1, 0.7, 0.4, { seg: 5 });
    }
    if (f === 1) b.sph(0.04, BOO.eye, 0, 0.535, 0.288, 1, 1.25, 0.4, { seg: 6 });
    else b.tor(0.05, 0.012, BOO.eye, 0, 0.57, 0.29, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
    const h = o.hat || 0;
    if (h === 1) b.sph(0.27, hc, 0, 0.8, 0, 1, 0.75, 1, { seg: 10 }).tor(0.265, 0.045, 0xffffff, 0, 0.775, 0, PI / 2, 0, 0, { seg: 12, tseg: 5 }).sph(0.075, 0xffffff, 0, 1.03, 0, 1, 1, 1, { seg: 6 });
    else if (h === 2) b.cyl(0.3, 0.3, 0.035, BOO.purpleD, 0, 0.875, 0, 0, 0, 0, { seg: 12 }).cyl(0.18, 0.19, 0.28, BOO.purpleD, 0, 1.03, 0, 0, 0, 0, { seg: 12 }).cyl(0.195, 0.195, 0.07, hc, 0, 0.93, 0, 0, 0, 0, { seg: 12 });
    else if (h === 3) b.cone(0.15, 0.36, hc, 0, 1.05, 0, 0, 0, 0, { seg: 8 }).sph(0.05, 0xffd23f, 0, 1.24, 0, 1, 1, 1, { seg: 5 });
    else if (h === 4) b.cone(0.22, 0.44, hc, 0.07, 1.02, 0, 0, 0, -0.45, { seg: 8 }).tor(0.2, 0.04, 0xffffff, 0, 0.85, 0, PI / 2, 0, 0, { seg: 10, tseg: 4 }).sph(0.065, 0xffffff, 0.18, 1.2, 0, 1, 1, 1, { seg: 5 });
    else if (h === 5) { for (const sx of [-1, 1]) b.sph(0.09, hc, sx * 0.09, 0.94, 0.05, 1.2, 0.9, 0.6, { seg: 6 }); b.sph(0.045, hc, 0, 0.94, 0.08, 1, 1, 1, { seg: 5 }); }
    if (o.scarf != null) b.tor(0.31, 0.055, o.scarf, 0, 0.4, 0, PI / 2, 0, 0, { seg: 12, tseg: 5 }).box(0.11, 0.26, 0.05, o.scarf, 0.15, 0.27, 0.34, 0.1, 0, -0.1);
    if (o.bow != null) { for (const sx of [-1, 1]) b.cone(0.07, 0.13, o.bow, sx * 0.08, 0.43, 0.34, 0, 0, sx * PI / 2, { seg: 5 }); b.sph(0.035, o.bow, 0, 0.43, 0.345, 1, 1, 1, { seg: 5 }); }
  }, s);
}
// A pumpkin lantern with a big smile, lit from inside: 2 r across and about 1.7 r high, the face towards +z.
export function pumpkinInto(b, x, y, z, r = 0.3, ry = 0, lit = true) {
  b.at(x, y, z, ry, () => {
    b.sph(1, BOO.pumpkin, 0, 0.8, 0, 1, 0.8, 1, { seg: 10 });
    for (let i = 0; i < 3; i++) b.at(0, 0, 0, i * PI / 3 + 0.5, () => b.sph(1, BOO.pumpkinD, 0, 0.8, 0, 0.42, 0.83, 1.03, { seg: 8 }));
    b.cyl(0.08, 0.12, 0.28, BOO.stalk, 0.02, 1.68, 0, 0, 0, 0.2, { seg: 5 });
    if (lit) {
      for (const sx of [-1, 1]) b.sph(0.13, BOO.glow, sx * 0.32, 0.98, 0.9, 1, 1.25, 0.4, { seg: 6, glow: true, grad: 1 });
      b.tor(0.34, 0.06, BOO.glow, 0, 0.74, 0.93, 0, 0, PI, { arc: PI, seg: 8, tseg: 4, glow: true, grad: 1 });
    }
  }, r);
}
def('ghostNap', 'low', 1.3, 0.95, 1.0, (b) => {
  // a little ghost fast asleep on a cushion in its nightcap, with a night light
  b.sph(0.6, BOO.purple, 0, 0.15, 0, 1, 0.28, 0.75, { seg: 10 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sph(0.06, 0xffd23f, sx * 0.5, 0.15, sz * 0.36, 1, 1, 1, { seg: 5 });
  ghostInto(b, -0.06, 0.14, 0, 0.62, { face: 2, hat: 4, hatC: 0x5ad0e0 });
  b.cyl(0.07, 0.09, 0.06, BOO.iron, 0.5, 0.03, 0.34, 0, 0, 0, { seg: 6 }).sph(0.1, BOO.glow, 0.5, 0.15, 0.34, 1, 1, 1, { seg: 7, glow: true, grad: 1 });
});
def('pumpkinPals', 'low', 1.5, 0.85, 1.1, (b) => {
  // three pumpkin lanterns, all smiles
  pumpkinInto(b, -0.38, 0, -0.05, 0.42, 0.15); pumpkinInto(b, 0.4, 0, 0, 0.33, -0.2); pumpkinInto(b, 0.04, 0, 0.5, 0.2, 0.1);
});
def('ghostTea', 'low', 1.4, 0.95, 1.1, (b) => {
  // a table laid for tea, where the teapot pours all by itself
  b.cyl(0.52, 0.57, 0.42, 0xffffff, 0, 0.21, 0, 0, 0, 0, { seg: 12, grad: 0.88 }).cyl(0.54, 0.54, 0.04, BOO.cheek, 0, 0.44, 0, 0, 0, 0, { seg: 12 });
  b.sph(0.15, 0x5ad0e0, -0.1, 0.74, 0, 1, 0.9, 1, { seg: 9 }).cyl(0.03, 0.045, 0.2, 0x5ad0e0, 0.08, 0.76, 0, 0, 0, -0.9, { seg: 5 }).tor(0.08, 0.02, 0x5ad0e0, -0.27, 0.74, 0, 0, 0, 0, { seg: 7, tseg: 3 }).sph(0.04, 0xffd23f, -0.1, 0.89, 0, 1, 1, 1, { seg: 5 });
  b.cyl(0.012, 0.012, 0.26, 0xd8904a, 0.17, 0.66, 0, 0, 0, 0, { seg: 3 });
  for (const [x, z] of [[0.17, 0], [-0.26, 0.26]]) b.cyl(0.11, 0.11, 0.015, 0xffffff, x, 0.47, z, 0, 0, 0, { seg: 8 }).cyl(0.075, 0.055, 0.08, 0xffffff, x, 0.51, z, 0, 0, 0, { seg: 7 }).cyl(0.06, 0.06, 0.01, 0xd8904a, x, 0.55, z, 0, 0, 0, { seg: 6 });
  b.cyl(0.15, 0.15, 0.1, 0xff8fb0, 0.02, 0.51, -0.26, 0, 0, 0, { seg: 9 }).cyl(0.155, 0.155, 0.03, 0xffffff, 0.02, 0.57, -0.26, 0, 0, 0, { seg: 9 }).sph(0.035, 0xe5383b, 0.02, 0.61, -0.26, 1, 1, 1, { seg: 5 });
  ghostInto(b, 0.52, 0.05, 0.36, 0.42, { hat: 3, hatC: 0xffd23f, ry: -0.5 });
});
def('sheetBasket', 'low', 1.3, 0.95, 1.0, (b) => {
  // a basket of clean sheets, and somebody small hiding in them
  b.cyl(0.46, 0.36, 0.44, 0xc8964a, 0, 0.22, 0, 0, 0, 0, { seg: 12, grad: 0.85 }).tor(0.46, 0.035, 0xa87a3a, 0, 0.44, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 }).tor(0.415, 0.02, 0xa87a3a, 0, 0.24, 0, PI / 2, 0, 0, { seg: 12, tseg: 3 });
  b.sph(0.3, 0xffffff, -0.12, 0.46, 0.05, 1.2, 0.4, 1, { seg: 8 }).sph(0.24, BOO.hem, 0.18, 0.47, -0.1, 1.1, 0.45, 1, { seg: 7 });
  ghostInto(b, 0.02, 0.3, 0, 0.62, { wave: true });
  b.box(0.1, 0.26, 0.05, 0xe5383b, -0.36, 0.36, 0.33, 0.25, 0.7, 0).box(0.1, 0.05, 0.055, 0xffffff, -0.36, 0.4, 0.34, 0.25, 0.7, 0).box(0.1, 0.05, 0.055, 0xffffff, -0.36, 0.3, 0.36, 0.25, 0.7, 0);
});
def('booBooks', 'low', 1.4, 0.9, 1.0, (b) => {
  // a pile of bedtime stories, with a small ghost reading one by lantern light
  const cols = [BOO.purple, 0x5ad0e0, 0xff8fb0];
  for (let i = 0; i < 3; i++) b.box(0.9 - i * 0.08, 0.14, 0.66, cols[i], -0.12 + i * 0.03, 0.07 + i * 0.15, 0, 0, (i - 1) * 0.18, 0).box(0.84 - i * 0.08, 0.1, 0.7, 0xfff8e0, -0.12 + i * 0.03, 0.07 + i * 0.15, 0, 0, (i - 1) * 0.18, 0);
  ghostInto(b, -0.12, 0.4, -0.04, 0.46);
  for (const sx of [-1, 1]) b.box(0.15, 0.2, 0.02, 0xffd23f, -0.12 + sx * 0.07, 0.56, 0.17, -0.35, sx * -0.3, 0);
  b.cyl(0.09, 0.09, 0.04, BOO.iron, 0.52, 0.02, 0.2, 0, 0, 0, { seg: 6 }).box(0.13, 0.2, 0.13, BOO.glow, 0.52, 0.14, 0.2, 0, 0, 0, { glow: true, grad: 1 }).cone(0.12, 0.09, BOO.iron, 0.52, 0.285, 0.2, 0, PI / 4, 0, { seg: 4 }).tor(0.06, 0.012, BOO.iron, 0.52, 0.35, 0.2, 0, 0, 0, { seg: 7, tseg: 3 });
});
def('tallGhost', 'tall', 1.6, 2.75, 1.0, (b) => {
  // a very tall ghost in a top hat and bow tie, waving hello
  ghostInto(b, 0, 0.2, 0, 2.15, { hat: 2, hatC: BOO.cheek, bow: 0xe5383b, wave: true, seg: 16 });
  pumpkinInto(b, -0.62, 0, 0.5, 0.17, 0.3);
});
def('ghostStack', 'tall', 1.4, 2.7, 1.0, (b) => {
  // three ghosts standing on one another's heads
  ghostInto(b, 0, 0.05, 0, 1.0, { scarf: 0xe5383b });
  ghostInto(b, 0, 0.82, 0, 0.92, { bow: 0xffd23f, ry: 0.15 });
  ghostInto(b, 0, 1.54, 0, 0.84, { hat: 3, hatC: 0x5ad0e0, wave: true, face: 1, ry: -0.1 });
});
def('grandClock', 'tall', 1.5, 2.75, 0.9, (b) => {
  // a grandfather clock, and the ghost who lives inside it
  b.box(0.95, 0.2, 0.6, BOO.purpleD, -0.12, 0.1, 0).box(0.75, 1.5, 0.5, BOO.purple, -0.12, 0.95, 0, 0, 0, 0, { grad: 0.85 }).box(0.95, 0.75, 0.58, BOO.purpleL, -0.12, 2.05, 0).prism(1.05, 0.3, 0.62, BOO.purpleD, -0.12, 2.42, 0, 0);
  b.cyl(0.3, 0.3, 0.04, 0xfff8e0, -0.12, 2.05, 0.3, PI / 2, 0, 0, { seg: 14 }).box(0.03, 0.2, 0.02, BOO.eye, -0.12, 2.13, 0.33).box(0.14, 0.03, 0.02, BOO.eye, -0.06, 2.05, 0.33).sph(0.03, 0xffd23f, -0.12, 2.05, 0.33, 1, 1, 0.5, { seg: 5 });
  b.box(0.38, 0.95, 0.03, 0x2a1a4a, -0.12, 0.98, 0.25).cyl(0.012, 0.012, 0.5, 0xffd23f, -0.08, 1.12, 0.28, 0, 0, 0.14, { seg: 3 }).sph(0.09, 0xffd23f, -0.045, 0.86, 0.28, 1, 1, 0.4, { seg: 7, glow: true, grad: 0.9 });
  ghostInto(b, 0.46, 0.5, -0.02, 0.8, { ry: 0.3, wave: true, hat: 5, hatC: 0xff8fb0 });
});
def('ghostLamp', 'tall', 1.4, 2.8, 1.0, (b) => {
  // an old street lamp, with a ghost keeping warm by it
  b.cyl(0.2, 0.26, 0.2, BOO.iron, 0, 0.1, 0, 0, 0, 0, { seg: 8 }).cyl(0.06, 0.08, 2.0, BOO.iron, 0, 1.2, 0, 0, 0, 0, { seg: 7 }).box(0.42, 0.05, 0.42, BOO.iron, 0, 2.18, 0);
  b.box(0.34, 0.4, 0.34, BOO.glow, 0, 2.4, 0, 0, 0, 0, { glow: true, grad: 1 }).cone(0.32, 0.2, BOO.iron, 0, 2.7, 0, 0, PI / 4, 0, { seg: 4 });
  ghostInto(b, 0.1, 1.0, 0.18, 0.95, { scarf: 0x5ad0e0, ry: -0.2 });
  ghostInto(b, -0.42, 0.05, 0.22, 0.6, { hat: 1, hatC: 0xff8fb0, ry: 0.3 });
  pumpkinInto(b, 0.46, 0, 0.3, 0.2, -0.2);
});
def('sheetLine', 'tall', 1.6, 2.75, 0.9, (b) => {
  // washing day: a sheet, a sock, and one ghost who has been pegged out by mistake
  for (const sx of [-1, 1]) b.cyl(0.05, 0.06, 2.7, 0xc8964a, sx * 0.72, 1.35, 0, 0, 0, 0, { seg: 6 }).cyl(0.14, 0.18, 0.12, 0xa87a3a, sx * 0.72, 0.06, 0, 0, 0, 0, { seg: 7 });
  b.cyl(0.012, 0.012, 1.44, 0xe8d8a0, 0, 2.6, 0, 0, 0, PI / 2, { seg: 3 });
  b.box(0.5, 1.5, 0.03, 0xffffff, -0.4, 1.85, 0, 0.04, 0, 0, { grad: 0.9 });
  ghostInto(b, 0.1, 1.72, 0, 0.9);
  b.box(0.12, 0.3, 0.04, 0xe5383b, 0.55, 2.44, 0).box(0.2, 0.1, 0.04, 0xe5383b, 0.59, 2.26, 0).box(0.125, 0.05, 0.045, 0xffffff, 0.55, 2.5, 0).box(0.125, 0.05, 0.045, 0xffffff, 0.55, 2.4, 0);
  for (const x of [-0.58, -0.22, 0.1, 0.55]) b.box(0.035, 0.09, 0.06, 0xffd23f, x, 2.6, 0);
  ghostInto(b, -0.4, 0.05, 0.14, 0.7, { hat: 1, hatC: 0x5ad0e0 });
  b.cyl(0.3, 0.24, 0.28, 0xc8964a, 0.24, 0.14, 0.12, 0, 0, 0, { seg: 9 }).sph(0.24, 0xffffff, 0.24, 0.3, 0.12, 1, 0.4, 1, { seg: 7 });
});
def('rollPumpkin', 'low', 1.15, 1.0, 1.0, (b) => {
  // a big pumpkin lantern rolling down the lane, smiling all the way
  pumpkinInto(b, 0, -0.47, 0, 0.58);
}, { center: true });
def('wispBall', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the cheeky ghost drops: a glowing will-o'-the-wisp with a smile, rolling
  b.sph(0.42, BOO.wisp, 0, 0, 0, 1, 1, 1, { seg: 12, glow: true, grad: 0.8 }).cone(0.2, 0.3, 0xe6fff8, 0.05, 0.46, 0, 0, 0, -0.3, { seg: 6, glow: true, grad: 1 });
  for (const sx of [-1, 1]) b.sph(0.065, BOO.eye, sx * 0.15, 0.08, 0.385, 1, 1.3, 0.5, { seg: 6 }).sph(0.05, BOO.cheek, sx * 0.26, -0.04, 0.32, 1, 0.7, 0.5, { seg: 5 });
  b.tor(0.07, 0.016, BOO.eye, 0, -0.07, 0.41, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  for (let i = 0; i < 5; i++) b.sph(0.05, 0xffffff, Math.cos(i * 1.257) * 0.52, Math.sin(i * 1.257) * 0.52, -0.1, 1, 1, 1, { seg: 4, glow: true, grad: 1 });
}, { center: true });
def('ghostPup', 'low', 1.3, 0.95, 0.9, (b) => {
  // a ghost puppy scampering across with its favourite bone; it faces +x
  const W = BOO.white;
  b.sph(0.3, W, -0.05, 0.44, 0, 1.45, 0.95, 1, { seg: 10 });
  for (let i = 0; i < 6; i++) b.sph(0.1, BOO.hem, -0.4 + i * 0.15, 0.2, (i % 2 ? 0.14 : -0.14), 1, 1.2, 1, { seg: 5 });
  b.sph(0.24, W, 0.4, 0.66, 0, 1, 0.95, 1, { seg: 10 }).sph(0.13, W, 0.6, 0.6, 0, 1.2, 0.8, 0.9, { seg: 7 }).sph(0.045, BOO.eye, 0.75, 0.63, 0, 1, 1, 1, { seg: 5 });
  for (const sz of [-1, 1]) b.sph(0.11, 0xcfeee2, 0.34, 0.66, sz * 0.24, 0.7, 1.5, 0.4, { seg: 6 }).sph(0.04, BOO.eye, 0.57, 0.74, sz * 0.13, 0.6, 1.2, 1, { seg: 5 }).sph(0.04, BOO.cheek, 0.52, 0.6, sz * 0.19, 1, 0.7, 0.5, { seg: 5 });
  b.cone(0.08, 0.3, W, -0.54, 0.6, 0, 0, 0, 0.9, { seg: 5 });
  b.tor(0.2, 0.035, 0xe5383b, 0.25, 0.56, 0, 0, PI / 2, 0, { seg: 10, tseg: 4 }).sph(0.04, 0xffd23f, 0.3, 0.37, 0, 1, 1, 1, { seg: 5 });
  b.cyl(0.03, 0.03, 0.34, 0xfff3d6, 0.73, 0.54, 0, PI / 2, 0, 0, { seg: 5 });
  for (const sz of [-1, 1]) b.sph(0.05, 0xfff3d6, 0.73, 0.54, sz * 0.18, 1, 1, 1, { seg: 5 });
});
def('booFlyer', 'deco', 2.0, 1.2, 1.3, (b) => {
  // a cheeky ghost in flying goggles and a cape, with a will-o'-the-wisp ready to drop
  ghostInto(b, 0, -0.55, 0, 1.1, { arms: false });
  for (const sx of [-1, 1]) b.tor(0.085, 0.022, 0xc8964a, sx * 0.127, 0.19, 0.31, 0, 0, 0, { seg: 8, tseg: 4 });
  b.tor(0.335, 0.025, 0x7a4a2e, 0, 0.2, 0, PI / 2, 0, 0, { seg: 12, tseg: 3 });
  b.box(0.62, 0.72, 0.04, 0xe5383b, 0, -0.22, -0.42, 0.35, 0, 0).tor(0.36, 0.045, 0xe5383b, 0, -0.1, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 });
  b.sph(0.15, BOO.wisp, 0, -0.66, 0.1, 1, 1, 1, { seg: 7, glow: true, grad: 0.9 });
}, {
  wings: (b, sx) => { b.sph(0.3, 0xffffff, sx * 0.3, 0, 0, 1.3, 0.3, 0.6, { seg: 8 }).sph(0.13, BOO.hem, sx * 0.64, -0.02, 0, 1, 0.5, 0.8, { seg: 6 }); }, wingAt: [0.28, -0.05, 0],
});

// ---------- Ancient Greece ----------
export const GRK = { marble: 0xf6f2e8, marbleD: 0xdcd6c8, blue: 0x2f6fd8, blueD: 0x1f4fa8, terra: 0xd8703a, terraD: 0xb85a2a, black: 0x2a2420, gold: 0xf2c230, olive: 0x9ab878, oliveD: 0x7a9a5a, bark: 0x8a7a5a, wood: 0xb5814f, woodD: 0x8a5a3c };
// A marble column with its foot at (x, y, z): r is its radius and h its height. flutes: n draws n grooves down the shaft.
export function greekColInto(b, x, y, z, r, h, o = {}) {
  const c = o.c ?? GRK.marble, seg = o.seg || 10;
  b.cyl(r * 1.3, r * 1.4, h * 0.05, GRK.marbleD, x, y + h * 0.025, z, 0, 0, 0, { seg }).cyl(r * 0.88, r * 0.96, h * 0.86, c, x, y + h * 0.48, z, 0, 0, 0, { seg, grad: 0.9 });
  b.cyl(r * 1.25, r * 0.9, h * 0.05, c, x, y + h * 0.935, z, 0, 0, 0, { seg }).box(r * 2.7, h * 0.04, r * 2.7, GRK.marbleD, x, y + h * 0.98, z);
  if (o.flutes) for (let i = 0; i < o.flutes; i++) { const a = i * 6.283 / o.flutes; b.box(r * 0.1, h * 0.84, r * 0.1, GRK.marbleD, x + Math.cos(a) * r * 0.94, y + h * 0.48, z + Math.sin(a) * r * 0.94, 0, -a, 0); }
}
// A painted jar with two handles, about h high: one colour for the clay and another for the band round its middle.
export function amphoraInto(b, x, y, z, h = 1, c = GRK.terra, band = GRK.black) {
  b.at(x, y, z, 0, () => {
    b.cyl(0.12, 0.16, 0.06, c, 0, 0.03, 0, 0, 0, 0, { seg: 8 }).sph(0.3, c, 0, 0.42, 0, 1, 1.25, 1, { seg: 10 }).cyl(0.312, 0.312, 0.13, band, 0, 0.46, 0, 0, 0, 0, { seg: 10 });
    b.cyl(0.1, 0.16, 0.26, c, 0, 0.84, 0, 0, 0, 0, { seg: 8 }).cyl(0.16, 0.11, 0.06, band, 0, 0.98, 0, 0, 0, 0, { seg: 8 });
    for (const sx of [-1, 1]) b.tor(0.13, 0.025, c, sx * 0.2, 0.8, 0, 0, 0, 0, { seg: 7, tseg: 3 });
    for (let i = 0; i < 8; i++) b.sph(0.03, c, Math.cos(i * 0.785) * 0.315, 0.46, Math.sin(i * 0.785) * 0.315, 1, 1, 1, { seg: 4 });
  }, h);
}
// An olive tree, about 3 s high: a twisted trunk and a cloud of silvery leaves.
export function oliveInto(b, x, y, z, s = 1, a0 = 0) {
  b.at(x, y, z, a0, () => {
    b.cyl(0.14, 0.24, 0.9, GRK.bark, 0.05, 0.45, 0, 0, 0, -0.14, { seg: 6 }).cyl(0.1, 0.15, 0.8, GRK.bark, 0.02, 1.2, 0, 0, 0, 0.3, { seg: 6 }).cyl(0.07, 0.1, 0.7, GRK.bark, 0.2, 1.4, 0.1, 0.3, 0, -0.6, { seg: 5 });
    for (const [px, py, pz, r] of [[0, 2.2, 0, 0.85], [-0.6, 1.9, 0.2, 0.6], [0.65, 1.95, -0.1, 0.62], [0.1, 2.75, -0.1, 0.5]]) b.add(new THREE.IcosahedronGeometry(1, 1), py > 2.1 ? GRK.olive : GRK.oliveD, px, py, pz, 0, px * 3, 0, r, r * 0.72, r, { grad: 0.75 });
    for (let i = 0; i < 7; i++) b.sph(0.045, i % 2 ? 0x3a3a2a : 0x6a7a3a, Math.cos(i * 2.4) * 0.75, 1.75 + (i % 3) * 0.2, Math.sin(i * 2.4) * 0.7, 1, 1.3, 1, { seg: 4 });
  }, s);
}
// A wise little owl, about s high, facing +z.
export function owlInto(b, x, y, z, s = 1, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.sph(0.36, 0x9a7a5a, 0, 0.4, 0, 1, 1.1, 0.9, { seg: 9 }).sph(0.26, 0xe8d8b8, 0, 0.34, 0.14, 1, 1.1, 0.7, { seg: 8 }).sph(0.3, 0x9a7a5a, 0, 0.78, 0, 1.05, 0.85, 0.9, { seg: 9 });
    for (const sx of [-1, 1]) {
      b.sph(0.11, 0xffffff, sx * 0.12, 0.8, 0.22, 1, 1, 0.5, { seg: 7 }).sph(0.06, GRK.gold, sx * 0.12, 0.8, 0.26, 1, 1, 0.5, { seg: 6 }).sph(0.032, 0x1b1f24, sx * 0.12, 0.8, 0.285, 1, 1, 0.5, { seg: 5 });
      b.cone(0.07, 0.16, 0x7a5a3c, sx * 0.2, 1.02, 0, 0, 0, sx * -0.3, { seg: 5 }).sph(0.14, 0x7a5a3c, sx * 0.34, 0.42, 0, 0.5, 1.5, 1, { seg: 6 }).sph(0.06, 0xffb347, sx * 0.12, 0.03, 0.1, 1, 0.5, 1.4, { seg: 5 });
    }
    b.cone(0.045, 0.1, 0xffb347, 0, 0.71, 0.28, PI, 0, 0, { seg: 5 });
  }, s);
}
def('amphorae', 'low', 1.4, 0.95, 1.0, (b) => {
  // painted jars, and a bowl of olives
  amphoraInto(b, -0.36, 0, 0, 0.9); amphoraInto(b, 0.28, 0, -0.08, 0.72, GRK.black, GRK.terra);
  b.cyl(0.2, 0.12, 0.12, GRK.blue, 0.42, 0.06, 0.4, 0, 0, 0, { seg: 9 });
  for (let i = 0; i < 6; i++) b.sph(0.045, i % 2 ? 0x3a3a2a : 0x7a9a3a, 0.42 + Math.cos(i * 1.05) * 0.09, 0.14, 0.4 + Math.sin(i * 1.05) * 0.09, 1, 1.2, 1, { seg: 5 });
});
def('laurelPrize', 'low', 1.3, 0.92, 1.0, (b) => {
  // first prize: a crown of golden leaves on a cushion, and a medal
  b.box(1.1, 0.14, 0.86, GRK.marbleD, 0, 0.07, 0).box(0.9, 0.34, 0.7, GRK.marble, 0, 0.31, 0, 0, 0, 0, { grad: 0.92 });
  for (let i = 0; i < 5; i++) b.box(0.09, 0.09, 0.02, i % 2 ? GRK.blue : GRK.blueD, -0.36 + i * 0.18, 0.31, 0.36);
  b.sph(0.36, GRK.blue, 0, 0.56, 0, 1, 0.3, 0.8, { seg: 9 });
  b.tor(0.22, 0.03, GRK.gold, 0, 0.72, 0, PI / 2 - 0.45, 0, 0, { seg: 12, tseg: 4 });
  for (let i = 0; i < 12; i++) { const a = i * 0.524; b.sph(0.06, GRK.gold, Math.cos(a) * 0.23, 0.72 - Math.sin(a) * 0.1, Math.sin(a) * 0.2, 1.4, 0.5, 0.7, { seg: 5 }); }
  b.box(0.1, 0.24, 0.02, 0xe5383b, 0.3, 0.3, 0.37, 0, 0, 0.2).cyl(0.09, 0.09, 0.03, GRK.gold, 0.33, 0.17, 0.38, PI / 2, 0, 0, { seg: 9 });
});
def('lyreScrolls', 'low', 1.3, 0.95, 1.0, (b) => {
  // a lyre, and the songs to play on it
  b.box(0.7, 0.1, 0.5, GRK.marbleD, -0.2, 0.05, 0).sph(0.2, GRK.woodD, -0.2, 0.3, 0, 1, 0.8, 0.5, { seg: 8 });
  b.tor(0.26, 0.04, GRK.gold, -0.2, 0.44, 0, 0, 0, PI, { arc: PI, seg: 10, tseg: 4 });
  for (const sx of [-1, 1]) b.cyl(0.035, 0.04, 0.36, GRK.gold, -0.2 + sx * 0.26, 0.62, 0, 0, 0, 0, { seg: 5 }).sph(0.05, GRK.gold, -0.2 + sx * 0.26, 0.82, 0, 1, 1, 1, { seg: 5 });
  b.cyl(0.03, 0.03, 0.64, GRK.wood, -0.2, 0.76, 0, 0, 0, PI / 2, { seg: 5 });
  for (let i = 0; i < 5; i++) b.cyl(0.008, 0.008, 0.52, 0xffffff, -0.36 + i * 0.08, 0.5, 0.03, 0, 0, 0, { seg: 3 });
  for (let i = 0; i < 3; i++) b.cyl(0.07, 0.07, 0.5, 0xfff3d6, 0.38 + (i % 2) * 0.1, 0.07 + i * 0.12, 0.1 - i * 0.03, PI / 2, 0.3 * (i - 1), 0, { seg: 7 }).cyl(0.073, 0.073, 0.06, 0xe5383b, 0.38 + (i % 2) * 0.1, 0.07 + i * 0.12, 0.1 - i * 0.03, PI / 2, 0.3 * (i - 1), 0, { seg: 7 });
});
def('oliveBaskets', 'low', 1.4, 0.9, 1.0, (b) => {
  // baskets of green and black olives, and a little jug of oil
  for (const sx of [-1, 1]) {
    b.cyl(0.36, 0.28, 0.4, GRK.wood, sx * 0.36, 0.2, 0, 0, 0, 0, { seg: 10, grad: 0.85 }).tor(0.36, 0.03, GRK.woodD, sx * 0.36, 0.4, 0, PI / 2, 0, 0, { seg: 10, tseg: 4 });
    for (let i = 0; i < 9; i++) b.sph(0.085, sx > 0 ? 0x3a3a2a : 0x8aa83a, sx * 0.36 + Math.cos(i * 0.9) * (i < 7 ? 0.2 : 0.05), 0.43 + (i > 6 ? 0.1 : 0), Math.sin(i * 0.9) * (i < 7 ? 0.2 : 0.05), 1, 1.25, 1, { seg: 5 });
  }
  b.sph(0.14, GRK.terra, 0.02, 0.16, 0.4, 1, 1.1, 1, { seg: 7 }).cyl(0.05, 0.07, 0.14, GRK.terra, 0.02, 0.34, 0.4, 0, 0, 0, { seg: 6 }).tor(0.07, 0.016, GRK.terra, 0.13, 0.28, 0.4, 0, 0, 0, { seg: 6, tseg: 3 });
});
def('colDrums', 'low', 1.5, 0.92, 1.1, (b) => {
  // a column that fell over long ago, and the tortoise who sunbathes on it
  b.cyl(0.36, 0.36, 0.6, GRK.marble, -0.36, 0.36, 0, 0, 0.12, PI / 2, { seg: 12 }).cyl(0.36, 0.36, 0.5, GRK.marble, 0.3, 0.36, 0.1, 0, -0.2, PI / 2, { seg: 12 });
  for (const x of [-0.62, -0.1, 0.08, 0.52]) b.tor(0.36, 0.02, GRK.marbleD, x, 0.36, x > 0 ? 0.1 : 0, 0, PI / 2 + (x > 0 ? -0.2 : 0.12), 0, { seg: 12, tseg: 3 });
  b.box(0.5, 0.12, 0.5, GRK.marbleD, 0.45, 0.06, 0.52, 0, 0.5, 0);
  b.sph(0.17, 0x6a8a4a, -0.3, 0.74, 0, 1.15, 0.7, 1, { seg: 8 }).sph(0.07, 0x9ab868, -0.08, 0.76, 0, 1, 1, 1, { seg: 6 }).sph(0.018, 0x1b1f24, -0.03, 0.78, 0.04, 1, 1, 1, { seg: 4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sph(0.05, 0x9ab868, -0.3 + sx * 0.13, 0.7, sz * 0.14, 1, 0.7, 1, { seg: 4 });
});
def('owlColumn', 'tall', 1.3, 2.75, 1.0, (b) => {
  // a column with a wise owl on top
  b.box(1.0, 0.14, 1.0, GRK.marbleD, 0, 0.07, 0);
  greekColInto(b, 0, 0.14, 0, 0.32, 1.95, { flutes: 10 });
  owlInto(b, 0, 2.09, 0, 0.62);
});
def('heroStatue', 'tall', 1.4, 2.8, 1.0, (b) => {
  // a marble champion holding up a torch
  const M = GRK.marble;
  b.box(0.95, 0.5, 0.8, GRK.marbleD, 0, 0.25, 0, 0, 0, 0, { grad: 0.9 }).box(1.05, 0.08, 0.9, M, 0, 0.54, 0);
  b.cyl(0.22, 0.34, 1.0, M, 0, 1.08, 0, 0, 0, 0, { seg: 10, grad: 0.9 }).sph(0.27, M, 0, 1.66, 0, 1.1, 0.9, 0.85, { seg: 9 }).box(0.5, 0.1, 0.36, GRK.gold, 0, 1.36, 0.02);
  for (let i = 0; i < 6; i++) b.box(0.03, 0.9, 0.03, GRK.marbleD, -0.2 + i * 0.08, 1.05, 0.26 + (i % 2) * 0.01, -0.12, 0, 0);
  b.sph(0.2, M, 0, 2.04, 0, 1, 1.05, 1, { seg: 10 }).tor(0.19, 0.035, GRK.gold, 0, 2.12, 0, PI / 2 - 0.2, 0, 0, { seg: 10, tseg: 4 });
  for (const sx of [-1, 1]) b.sph(0.028, 0x3a4252, sx * 0.07, 2.06, 0.18, 1, 1.2, 0.5, { seg: 5 });
  b.tor(0.045, 0.011, 0x3a4252, 0, 1.98, 0.19, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  b.cap(0.07, 0.5, M, 0.42, 1.95, 0, 0, 0, -0.5, { seg: 6 }).cone(0.08, 0.3, GRK.gold, 0.6, 2.36, 0, PI, 0, 0, { seg: 6 }).sph(0.1, 0xffb347, 0.6, 2.56, 0, 1, 1.5, 1, { seg: 6, glow: true, grad: 0.9 });
  b.cap(0.07, 0.4, M, -0.36, 1.45, 0.08, 0.3, 0, 0.3, { seg: 6 }).cyl(0.26, 0.26, 0.05, GRK.blue, -0.42, 1.25, 0.26, PI / 2, 0, 0, { seg: 10 }).cyl(0.1, 0.1, 0.06, GRK.gold, -0.42, 1.25, 0.27, PI / 2, 0, 0, { seg: 8 });
});
def('templeFront', 'tall', 1.6, 2.8, 1.0, (b) => {
  // a little temple, with a jar of something precious inside
  b.box(1.6, 0.12, 0.9, GRK.marbleD, 0, 0.06, 0).box(1.4, 0.12, 0.75, GRK.marble, 0, 0.18, 0);
  for (const sx of [-1, 1]) greekColInto(b, sx * 0.55, 0.24, 0, 0.14, 1.8, { flutes: 8, seg: 8 });
  b.box(1.5, 0.22, 0.5, GRK.marble, 0, 2.15, 0);
  for (let i = 0; i < 6; i++) b.box(0.1, 0.16, 0.02, GRK.blue, -0.6 + i * 0.24, 2.15, 0.26);
  b.prism(1.6, 0.45, 0.5, GRK.marble, 0, 2.26, 0, 0).cyl(0.11, 0.11, 0.03, GRK.gold, 0, 2.42, 0.26, PI / 2, 0, 0, { seg: 9 });
  for (const sx of [-1, 0, 1]) b.sph(0.07, GRK.gold, sx * 0.78, sx ? 2.33 : 2.76, 0, 1, 1.3, 1, { seg: 5 });
  b.box(0.5, 0.3, 0.4, GRK.marbleD, 0, 0.39, 0); amphoraInto(b, 0, 0.54, 0, 1.15, GRK.terra, GRK.black);
});
def('oliveTree', 'tall', 1.6, 2.9, 1.6, (b) => {
  // an old olive tree in a ring of white stones
  oliveInto(b, 0, 0, 0, 0.95, 0.4);
  for (let i = 0; i < 7; i++) b.sph(0.12, i % 2 ? GRK.marble : GRK.marbleD, Math.cos(i * 0.9) * 0.55, 0.06, Math.sin(i * 0.9) * 0.55, 1, 0.7, 1, { seg: 5 });
});
def('bigVase', 'tall', 1.4, 2.75, 1.2, (b) => {
  // an enormous painted vase on a stand
  b.box(0.9, 0.3, 0.9, GRK.marbleD, 0, 0.15, 0).box(0.75, 0.1, 0.75, GRK.marble, 0, 0.35, 0);
  amphoraInto(b, 0, 0.4, 0, 2.3, GRK.terra, GRK.black);
  for (let i = 0; i < 10; i++) { const a = i * 0.628; b.box(0.12, 0.12, 0.03, GRK.gold, Math.cos(a) * 0.73, 1.46, Math.sin(a) * 0.73, 0, -a + PI / 2, PI / 4); }
});
def('rollDrum', 'low', 1.2, 1.0, 1.0, (b) => {
  // a piece of marble column rolling down the lane
  b.cyl(0.5, 0.5, 1.0, GRK.marble, 0, 0, 0, 0, 0, PI / 2, { seg: 14, grad: 0.95 });
  for (const x of [-0.46, 0.46]) b.tor(0.5, 0.03, GRK.marbleD, x, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 3 });
  for (let i = 0; i < 10; i++) { const a = i * 0.628; b.box(0.86, 0.04, 0.05, GRK.marbleD, 0, Math.cos(a) * 0.49, Math.sin(a) * 0.49, a, 0, 0); }
  for (const sx of [-1, 1]) b.cyl(0.2, 0.2, 0.02, GRK.blue, sx * 0.505, 0, 0, 0, 0, PI / 2, { seg: 8 });
}, { center: true });
def('goldApple', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the flying horse drops: a golden apple, rolling
  b.sph(0.44, GRK.gold, 0, 0, 0, 1, 0.94, 1, { seg: 12 }).sph(0.13, 0xffe680, 0.16, 0.18, 0.33, 1, 1, 0.4, { seg: 6 });
  b.cyl(0.03, 0.03, 0.18, GRK.woodD, 0, 0.46, 0, 0, 0, 0.3, { seg: 5 }).sph(0.14, 0x6fae3c, 0.14, 0.5, 0, 1.5, 0.3, 0.8, { seg: 6 });
}, { center: true });
// A wooden horse on wheels, facing +x: about 1.1 high and 1.3 long.
export function woodHorseInto(b) {
  const W = GRK.wood, D = GRK.woodD;
  b.box(1.1, 0.07, 0.5, D, 0, 0.17, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.13, 0.13, 0.06, D, sx * 0.4, 0.13, sz * 0.28, PI / 2, 0, 0, { seg: 10 }).cyl(0.04, 0.04, 0.07, GRK.gold, sx * 0.4, 0.13, sz * 0.28, PI / 2, 0, 0, { seg: 6 }).box(0.1, 0.3, 0.1, W, sx * 0.3, 0.35, sz * 0.13);
  b.box(0.78, 0.3, 0.36, W, -0.02, 0.62, 0, 0, 0, 0, { grad: 0.9 }).box(0.2, 0.42, 0.26, W, 0.36, 0.84, 0, 0, 0, -0.5).box(0.34, 0.18, 0.24, W, 0.56, 0.93, 0, 0, 0, -0.15);
  for (let i = 0; i < 4; i++) b.box(0.06, 0.12, 0.05, D, 0.22 + i * 0.07, 0.84 + i * 0.07, 0, 0, 0, -0.5);
  for (const sz of [-1, 1]) b.sph(0.03, 0x1b1f24, 0.58, 0.97, sz * 0.125, 1, 1, 0.5, { seg: 5 }).cone(0.04, 0.1, W, 0.44, 1.07, sz * 0.08, 0, 0, 0, { seg: 4 }).box(0.16, 0.16, 0.01, D, -0.05, 0.62, sz * 0.185);
  b.box(0.06, 0.3, 0.06, D, -0.44, 0.6, 0, 0, 0, 0.5);
  for (let i = 0; i < 5; i++) b.box(0.01, 0.3, 0.37, D, -0.34 + i * 0.17, 0.62, 0);
}
def('woodHorse', 'low', 1.3, 0.95, 0.9, (b) => {
  // a wooden horse on wheels, trundling across; it faces +x
  b.at(0, 0, 0, 0, () => woodHorseInto(b), 0.86);
});
def('pegasus', 'deco', 2.2, 1.2, 1.5, (b) => {
  // a little white horse with wings, carrying a golden apple
  const W = 0xffffff;
  b.sph(0.34, W, 0, 0, -0.05, 0.9, 0.85, 1.4, { seg: 10 }).cap(0.15, 0.3, W, 0, 0.26, 0.4, 0.7, 0, 0, { seg: 7 }).sph(0.2, W, 0, 0.46, 0.6, 0.9, 0.95, 1, { seg: 9 }).sph(0.13, 0xfff0f4, 0, 0.4, 0.78, 0.9, 0.8, 1, { seg: 7 });
  for (const sx of [-1, 1]) b.sph(0.045, 0x1b1f24, sx * 0.13, 0.5, 0.72, 0.6, 1.2, 1, { seg: 5 }).cone(0.05, 0.13, W, sx * 0.1, 0.68, 0.56, 0, 0, sx * -0.2, { seg: 4 }).sph(0.04, 0xffa8c0, sx * 0.14, 0.4, 0.74, 0.6, 0.7, 1, { seg: 4 }).sph(0.02, 0x3a4252, sx * 0.05, 0.38, 0.9, 1, 1, 0.5, { seg: 4 });
  for (let i = 0; i < 5; i++) b.sph(0.09, GRK.gold, 0, 0.62 - i * 0.09, 0.5 - i * 0.1, 0.7, 1, 1, { seg: 5 });
  for (let i = 0; i < 4; i++) b.sph(0.1 - i * 0.012, GRK.gold, 0, 0.02 - i * 0.07, -0.52 - i * 0.1, 0.8, 1, 1, { seg: 5 });
  for (const sx of [-1, 1]) for (const z of [0.26, -0.3]) b.cap(0.06, 0.2, W, sx * 0.16, -0.3, z, z > 0 ? -0.5 : 0.5, 0, 0, { seg: 5 }).sph(0.065, GRK.gold, sx * 0.16, -0.44, z + (z > 0 ? 0.09 : -0.09), 1, 0.8, 1, { seg: 5 });
  b.sph(0.17, GRK.gold, 0, -0.56, 0, 1, 0.94, 1, { seg: 8 }).cyl(0.01, 0.01, 0.2, GRK.woodD, 0, -0.36, 0, 0, 0, 0, { seg: 3 });
}, {
  wings: (b, sx) => { for (let i = 0; i < 4; i++) b.sph(0.3 - i * 0.03, i % 2 ? 0xeaf6ff : 0xffffff, sx * (0.22 + i * 0.2), 0.02 - i * 0.01, -0.02 - i * 0.07, 1.1, 0.1, 0.62, { seg: 7 }); }, wingAt: [0.18, 0.16, -0.05],
});

// ---------- Ancient Time (dinosaurs and cave people) ----------
export const DINO = { green: 0x6fbf5a, greenD: 0x4f9a48, teal: 0x4fb8a8, orange: 0xff9a4a, purple: 0x9a7ad8, yellow: 0xffd23f, belly: 0xfff0c8, rock: 0x9a8f88, rockD: 0x7a706a, bone: 0xfff3d6, fern: 0x3f9a4a, fernD: 0x2f7a3a, bark: 0x7a5a3c, lava: 0xff7a2a, skin: 0xf0c098, fur: 0xc8823a, eye: 0x1b1f24, cheek: 0xff9ab0 };
// A fern: a ring of fronds about s long.
export function fernInto(b, x, y, z, s = 1, n = 7) {
  for (let i = 0; i < n; i++) { const a = i * 6.283 / n + x; b.cone(0.15 * s, 0.95 * s, i % 2 ? DINO.fern : DINO.fernD, x + Math.cos(a) * 0.3 * s, y + 0.3 * s, z + Math.sin(a) * 0.3 * s, Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0, { seg: 4 }); }
}
// A cycad: a fat ringed trunk with a crown of long fronds and an orange cone in the middle, about 2.6 s high.
export function cycadInto(b, x, y, z, s = 1) {
  b.at(x, y, z, 0, () => {
    b.cyl(0.22, 0.3, 1.4, DINO.bark, 0, 0.7, 0, 0, 0, 0, { seg: 8 });
    for (let i = 0; i < 4; i++) b.tor(0.27 - i * 0.015, 0.035, 0x5a4230, 0, 0.2 + i * 0.34, 0, PI / 2, 0, 0, { seg: 8, tseg: 3 });
    for (let i = 0; i < 12; i++) { const a = i * 0.524, lean = i % 3 ? 1.15 : 0.5, l = i % 3 ? 1.5 : 1.2; b.cone(0.17, l, i % 2 ? DINO.fern : DINO.fernD, Math.cos(a) * Math.sin(lean) * l * 0.5, 1.4 + Math.cos(lean) * l * 0.5, Math.sin(a) * Math.sin(lean) * l * 0.5, Math.sin(a) * lean, 0, -Math.cos(a) * lean, { seg: 4 }); }
    b.cone(0.16, 0.4, DINO.orange, 0, 1.6, 0, 0, 0, 0, { seg: 6 });
  }, s);
}
// The neck and head of a long-necked dinosaur, drawn from its shoulder at (0, 0, 0) and reaching up towards +x.
export function dinoNeckInto(b, col = DINO.green) {
  for (let i = 0; i < 7; i++) b.sph(0.24 - i * 0.012, col, i * 0.14, i * 0.3, 0, 1, 1.1, 1, { seg: 7 });
  b.sph(0.26, col, 1.1, 2.0, 0, 1.4, 0.95, 1, { seg: 9 }).sph(0.18, col, 1.36, 1.95, 0, 1.2, 0.8, 0.95, { seg: 7 });
  for (const sz of [-1, 1]) b.sph(0.075, 0xffffff, 1.18, 2.1, sz * 0.2, 1, 1.1, 0.6, { seg: 6 }).sph(0.04, DINO.eye, 1.21, 2.1, sz * 0.24, 1, 1.1, 0.5, { seg: 5 }).sph(0.05, DINO.cheek, 1.28, 1.93, sz * 0.165, 1, 0.7, 0.4, { seg: 5 }).sph(0.018, DINO.eye, 1.52, 2.0, sz * 0.07, 1, 1, 1, { seg: 4 });
}
// A long-necked dinosaur facing +x, about 3.5 s to the top of its head. neck: false leaves the neck and head off (they join at
// (0.85, 1.35, 0) s).
export function longNeckInto(b, x, y, z, s = 1, o = {}) {
  const col = o.col ?? DINO.green, spot = o.spot ?? DINO.greenD;
  b.at(x, y, z, o.ry || 0, () => {
    b.sph(0.6, col, 0, 1.0, 0, 1.5, 0.95, 1.0, { seg: 10 }).sph(0.5, DINO.belly, 0, 0.82, 0, 1.4, 0.7, 0.9, { seg: 8 });
    for (const sx of [-0.5, 0.5]) for (const sz of [-0.32, 0.32]) b.cyl(0.17, 0.2, 0.75, col, sx, 0.38, sz, 0, 0, 0, { seg: 7 }).sph(0.2, spot, sx + 0.04, 0.06, sz, 1, 0.4, 1, { seg: 6 });
    for (let i = 0; i < 6; i++) b.sph(0.3 - i * 0.04, col, -0.9 - i * 0.3, 0.95 - i * 0.1, 0, 1.2, 1, 1, { seg: 6 });
    for (const [px, pz] of [[-0.3, 0.2], [0.2, -0.25], [0.45, 0.15], [-0.6, -0.1], [0, 0]]) b.sph(0.13, spot, px, 1.5 - Math.abs(px) * 0.12, pz, 1, 0.5, 1, { seg: 5 });
    if (o.neck !== false) b.at(0.85, 1.35, 0, 0, () => dinoNeckInto(b, col));
  }, s);
}
// A three-horned dinosaur facing +x: about 2.4 s long and 1.5 s high.
export function trikeInto(b, x, y, z, s = 1, col = DINO.teal, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.sph(0.55, col, 0, 0.75, 0, 1.4, 0.95, 1.0, { seg: 10 }).sph(0.45, DINO.belly, 0, 0.6, 0, 1.3, 0.7, 0.9, { seg: 8 });
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.3, 0.3]) b.cyl(0.15, 0.18, 0.5, col, sx, 0.25, sz, 0, 0, 0, { seg: 7 });
    for (let i = 0; i < 4; i++) b.sph(0.28 - i * 0.055, col, -0.8 - i * 0.24, 0.7 - i * 0.08, 0, 1.2, 1, 1, { seg: 6 });
    b.sph(0.5, DINO.orange, 0.66, 1.06, 0, 0.3, 1.0, 1.15, { seg: 9 }).sph(0.36, col, 0.95, 0.85, 0, 1.2, 1, 0.95, { seg: 9 }).sph(0.15, 0xffd890, 1.36, 0.76, 0, 1, 0.8, 0.8, { seg: 6 });
    for (let i = 0; i < 7; i++) { const a = -1.3 + i * 0.433; b.sph(0.07, DINO.yellow, 0.64, 1.06 + Math.cos(a) * 0.5, Math.sin(a) * 0.57, 1, 1, 1, { seg: 5 }); }
    b.cone(0.06, 0.24, DINO.bone, 1.3, 1.02, 0, 0, 0, -0.5, { seg: 5 });
    for (const sz of [-1, 1]) b.cone(0.065, 0.42, DINO.bone, 1.08, 1.26, sz * 0.17, 0, 0, -0.7, { seg: 5 }).sph(0.075, 0xffffff, 1.14, 0.95, sz * 0.29, 1, 1.1, 0.6, { seg: 6 }).sph(0.04, DINO.eye, 1.17, 0.95, sz * 0.33, 1, 1.1, 0.5, { seg: 5 }).sph(0.05, DINO.cheek, 1.2, 0.76, sz * 0.27, 1, 0.7, 0.4, { seg: 5 });
  }, s);
}
// A friendly tyrannosaur standing up and facing +z, with a big smile and very small arms: about 2.4 s high.
export function rexInto(b, x, y, z, s = 1, col = DINO.orange, ry = 0) {
  b.at(x, y, z, ry, () => {
    for (const sx of [-1, 1]) {
      b.cyl(0.2, 0.24, 0.7, col, sx * 0.3, 0.35, 0, 0, 0, 0, { seg: 7 }).sph(0.24, col, sx * 0.3, 0.1, 0.15, 1, 0.5, 1.4, { seg: 6 });
      for (let i = 0; i < 3; i++) b.sph(0.05, 0xffffff, sx * 0.3 + (i - 1) * 0.12, 0.07, 0.48, 1, 1, 1, { seg: 4 });
      b.cap(0.055, 0.2, col, sx * 0.44, sx > 0 ? 1.34 : 1.2, 0.42, sx > 0 ? -0.6 : -1.1, 0, sx * -0.5, { seg: 5 });
      b.sph(0.11, 0xffffff, sx * 0.24, 2.08, 0.5, 1, 1.1, 0.7, { seg: 7 }).sph(0.06, DINO.eye, sx * 0.25, 2.09, 0.58, 1, 1.1, 0.6, { seg: 5 }).sph(0.08, DINO.cheek, sx * 0.34, 1.82, 0.6, 1, 0.7, 0.5, { seg: 5 }).sph(0.025, DINO.eye, sx * 0.1, 1.92, 0.87, 1, 1, 1, { seg: 4 });
    }
    b.sph(0.6, col, 0, 1.0, -0.05, 1, 1.15, 1.0, { seg: 10 }).sph(0.46, DINO.belly, 0, 0.95, 0.2, 1, 1.15, 0.8, { seg: 8 });
    for (let i = 0; i < 5; i++) b.sph(0.36 - i * 0.06, col, 0, 0.75 - i * 0.1, -0.55 - i * 0.32, 1, 1, 1.2, { seg: 6 });
    b.sph(0.48, col, 0, 1.85, 0.15, 1, 0.9, 1.15, { seg: 10 }).sph(0.36, col, 0, 1.76, 0.55, 1, 0.75, 1, { seg: 9 });
    b.tor(0.22, 0.022, DINO.eye, 0, 1.72, 0.84, 0.3, 0, PI, { arc: PI, seg: 8, tseg: 3 });
    for (let i = 0; i < 4; i++) b.sph(0.035, 0xffffff, -0.15 + i * 0.1, 1.56 + Math.abs(i - 1.5) * 0.05, 0.86 - Math.abs(i - 1.5) * 0.03, 1, 1, 1, { seg: 4 });
    for (let i = 0; i < 6; i++) b.cone(0.07, 0.18, DINO.yellow, 0, i < 2 ? 2.34 - i * 0.14 : 1.75 - (i - 2) * 0.3, i < 2 ? 0.0 - i * 0.3 : -0.5 - (i - 2) * 0.2, i < 2 ? -0.4 : -1.0, 0, 0, { seg: 4 });
  }, s);
}
// A cave child about s high, facing +z, in a spotted fur tunic with a bone in their hair. wave lifts an arm.
export function caveKidInto(b, x, y, z, s = 1, o = {}) {
  const hair = o.hair ?? 0x5a3a24, fur = o.fur ?? DINO.fur;
  b.at(x, y, z, o.ry || 0, () => {
    for (const sx of [-1, 1]) b.cyl(0.055, 0.055, 0.26, DINO.skin, sx * 0.09, 0.14, 0, 0, 0, 0, { seg: 5 }).sph(0.07, DINO.skin, sx * 0.09, 0.03, 0.03, 1, 0.5, 1.4, { seg: 5 });
    b.cyl(0.15, 0.24, 0.42, fur, 0, 0.44, 0, 0, 0, 0, { seg: 9 }).box(0.09, 0.22, 0.3, fur, -0.1, 0.66, 0, 0, 0, 0.5);
    for (let i = 0; i < 8; i++) b.cone(0.07, 0.12, fur, Math.cos(i * 0.785) * 0.2, 0.2, Math.sin(i * 0.785) * 0.2, PI, 0, 0, { seg: 4 });
    for (const [px, py, pz] of [[0.1, 0.5, 0.17], [-0.08, 0.36, 0.2], [0.02, 0.56, -0.16], [-0.16, 0.44, -0.1]]) b.sph(0.035, 0x7a4a24, px, py, pz, 1, 1, 0.6, { seg: 4 });
    b.cap(0.045, 0.18, DINO.skin, -0.24, 0.5, 0, 0, 0, -0.4, { seg: 5 });
    if (o.wave) b.cap(0.045, 0.2, DINO.skin, 0.27, 0.74, 0, 0, 0, -0.7, { seg: 5 }); else b.cap(0.045, 0.18, DINO.skin, 0.24, 0.5, 0, 0, 0, 0.4, { seg: 5 });
    b.sph(0.2, DINO.skin, 0, 0.84, 0, 1, 1, 1, { seg: 10 }).sph(0.21, hair, 0, 0.9, -0.04, 1.02, 0.8, 1, { seg: 8 });
    for (let i = 0; i < 5; i++) b.cone(0.06, 0.14, hair, -0.14 + i * 0.07, 1.06, -0.02 + (i % 2) * 0.05, 0, 0, (2 - i) * 0.25, { seg: 4 });
    b.cyl(0.018, 0.018, 0.22, DINO.bone, 0.02, 1.08, -0.1, 0, 0, PI / 2 - 0.3, { seg: 4 });
    for (const sx of [-1, 1]) b.sph(0.032, DINO.bone, 0.02 + sx * 0.11, 1.08 + sx * 0.035, -0.1, 1, 1, 1, { seg: 4 }).sph(0.028, DINO.eye, sx * 0.075, 0.86, 0.18, 1, 1.2, 0.5, { seg: 5 }).sph(0.035, DINO.cheek, sx * 0.13, 0.79, 0.15, 1, 0.7, 0.4, { seg: 4 });
    b.tor(0.04, 0.01, DINO.eye, 0, 0.79, 0.19, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  }, s);
}
// A big speckled egg standing on end, about 2.6 r high.
function spotEggInto(b, x, y, z, r, col = 0xfff3d6, spot = DINO.teal) {
  b.sph(r, col, x, y + r * 1.25, z, 1, 1.3, 1, { seg: 9 });
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + x * 5, h = (i % 3 - 1) * 0.6; b.sph(r * 0.2, spot, x + Math.cos(a) * r * 0.92 * Math.sqrt(1 - h * h * 0.5), y + r * 1.25 + h * r, z + Math.sin(a) * r * 0.92 * Math.sqrt(1 - h * h * 0.5), 1, 1, 1, { seg: 4 }); }
}
def('eggNest', 'low', 1.4, 0.95, 1.2, (b) => {
  // a nest of speckled eggs, and somebody small looking out of one of them
  b.tor(0.5, 0.14, DINO.bark, 0, 0.14, 0, PI / 2, 0, 0, { seg: 10, tseg: 5 }).cyl(0.5, 0.5, 0.1, 0x9a7a4a, 0, 0.08, 0, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 9; i++) b.cyl(0.02, 0.02, 0.5, i % 2 ? 0x9a7a4a : 0x5a4230, Math.cos(i * 0.7) * 0.52, 0.22, Math.sin(i * 0.7) * 0.52, 0.4, i * 0.7, 1.2, { seg: 3 });
  spotEggInto(b, -0.24, 0.1, -0.05, 0.2); spotEggInto(b, 0.26, 0.1, -0.1, 0.18, 0xfff3d6, DINO.purple);
  b.sph(0.2, 0xfff3d6, 0.02, 0.3, 0.22, 1, 1, 1, { seg: 8 }).sph(0.16, DINO.green, 0.02, 0.52, 0.22, 1, 0.95, 1, { seg: 8 }).sph(0.1, DINO.green, 0.02, 0.48, 0.34, 1, 0.75, 1, { seg: 6 });
  for (const sx of [-1, 1]) b.sph(0.045, 0xffffff, 0.02 + sx * 0.07, 0.58, 0.33, 1, 1.1, 0.6, { seg: 5 }).sph(0.024, DINO.eye, 0.02 + sx * 0.07, 0.58, 0.36, 1, 1.1, 0.5, { seg: 4 }).cone(0.07, 0.1, 0xfff3d6, 0.02 + sx * 0.12, 0.42, 0.26, 0, 0, sx * -0.5, { seg: 3 });
  b.sph(0.1, 0xfff3d6, 0.02, 0.7, 0.16, 1, 0.5, 1, { seg: 5 });
});
def('babyTrike', 'low', 1.5, 0.95, 1.0, (b) => {
  // a baby three-horn having a rest
  trikeInto(b, -0.1, -0.08, 0, 0.62, DINO.teal, -0.5);
  fernInto(b, 0.55, 0, -0.3, 0.4, 5);
});
def('boneXylo', 'low', 1.4, 0.85, 1.0, (b) => {
  // a xylophone made of bones, with two beaters
  for (const sz of [-1, 1]) b.cyl(0.07, 0.07, 1.3, DINO.bark, 0, 0.3, sz * 0.2, 0, 0, PI / 2, { seg: 6 });
  for (const sx of [-1, 1]) b.cyl(0.06, 0.08, 0.6, DINO.bark, sx * 0.6, 0.16, 0.22, 0.3, 0, 0, { seg: 5 }).cyl(0.06, 0.08, 0.6, DINO.bark, sx * 0.6, 0.16, -0.22, -0.3, 0, 0, { seg: 5 });
  for (let i = 0; i < 7; i++) { const l = 0.72 - i * 0.055, x = -0.51 + i * 0.17; b.cyl(0.045, 0.045, l, DINO.bone, x, 0.4, 0, PI / 2, 0, 0, { seg: 5 }); for (const sz of [-1, 1]) b.sph(0.065, DINO.bone, x, 0.4, sz * l / 2, 1, 1, 1, { seg: 5 }); }
  for (const sx of [-1, 1]) b.cyl(0.02, 0.02, 0.5, DINO.bark, sx * 0.3, 0.62, 0.3, 0.9, 0, sx * 0.3, { seg: 4 }).sph(0.07, DINO.rock, sx * 0.24, 0.48, 0.1, 1, 1, 1, { seg: 5 });
});
def('stewPot', 'low', 1.3, 0.95, 1.2, (b) => {
  // supper: a stone pot of soup on warm embers, with steam coming off it
  for (let i = 0; i < 8; i++) b.sph(0.13, i % 2 ? DINO.rock : DINO.rockD, Math.cos(i * 0.785) * 0.5, 0.08, Math.sin(i * 0.785) * 0.5, 1, 0.8, 1, { seg: 5 });
  for (let i = 0; i < 3; i++) b.cyl(0.06, 0.06, 0.7, DINO.bark, 0, 0.1, 0, PI / 2, i * 1.05, 0, { seg: 5 });
  for (let i = 0; i < 5; i++) b.sph(0.07, DINO.lava, Math.cos(i * 1.257) * 0.22, 0.14, Math.sin(i * 1.257) * 0.22, 1, 0.7, 1, { seg: 4, glow: true, grad: 1 });
  b.sph(0.38, DINO.rockD, 0, 0.5, 0, 1, 0.8, 1, { seg: 10 }).cyl(0.34, 0.36, 0.08, DINO.rock, 0, 0.74, 0, 0, 0, 0, { seg: 10 }).cyl(0.3, 0.3, 0.03, 0x8fd058, 0, 0.78, 0, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 3; i++) b.sph(0.05, 0xb8e878, -0.1 + i * 0.1, 0.8, (i % 2) * 0.12 - 0.06, 1, 0.6, 1, { seg: 5 });
  b.cyl(0.02, 0.02, 0.5, DINO.bone, 0.16, 0.9, 0, 0, 0, -0.4, { seg: 4 });
});
def('shellFossils', 'low', 1.5, 0.9, 1.0, (b) => {
  // boulders with curly shells in them, a fern, and a snail going past
  b.sph(0.46, DINO.rock, -0.3, 0.36, 0, 1.1, 0.85, 0.9, { seg: 7 }).sph(0.34, DINO.rockD, 0.34, 0.27, 0.05, 1.1, 0.85, 1, { seg: 6 });
  for (const [x, y, z, r] of [[-0.3, 0.42, 0.4, 0.2], [0.36, 0.3, 0.37, 0.14]]) b.tor(r, r * 0.3, DINO.bone, x, y, z, 0, 0, 0, { seg: 10, tseg: 4 }).tor(r * 0.5, r * 0.26, DINO.bone, x + r * 0.1, y, z + 0.01, 0, 0, 0, { seg: 8, tseg: 4 }).sph(r * 0.22, DINO.bone, x + r * 0.1, y, z + 0.02, 1, 1, 0.6, { seg: 5 });
  fernInto(b, 0.06, 0.3, -0.3, 0.5, 6);
  b.sph(0.1, DINO.orange, 0.62, 0.14, 0.4, 1, 1, 0.6, { seg: 6 }).sph(0.06, 0xe8d8a0, 0.62, 0.05, 0.42, 2.2, 0.6, 1, { seg: 5 });
  for (const sz of [-1, 1]) b.cyl(0.008, 0.008, 0.08, 0xe8d8a0, 0.73, 0.11, 0.42 + sz * 0.02, 0, 0, -0.3, { seg: 3 });
});
def('paintRock', 'tall', 1.6, 2.75, 1.0, (b) => {
  // a standing stone covered in cave paintings, and the artist
  b.box(1.4, 2.6, 0.5, DINO.rock, 0, 1.3, -0.1, 0.03, 0, 0.02, { grad: 0.85 }).sph(0.72, DINO.rock, 0, 2.55, -0.1, 1, 0.35, 0.36, { seg: 7 });
  const R = 0xc8503a, O = 0xe8a040, K = 0x4a3428, z = 0.17;
  b.sph(0.26, R, -0.2, 2.0, z, 1.3, 0.8, 0.08, { seg: 7 }).sph(0.13, R, 0.1, 2.08, z, 1, 1, 0.08, { seg: 6 });   // a mammoth
  for (const x of [-0.36, -0.08]) b.box(0.07, 0.24, 0.02, R, x, 1.78, z);
  b.tor(0.12, 0.02, K, 0.22, 1.96, z, 0, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  b.cyl(0.14, 0.14, 0.02, O, 0.42, 2.34, z, PI / 2, 0, 0, { seg: 8 });   // the sun
  for (let i = 0; i < 8; i++) b.box(0.03, 0.1, 0.02, O, 0.42 + Math.cos(i * 0.785) * 0.22, 2.34 + Math.sin(i * 0.785) * 0.22, z, 0, 0, i * 0.785 - PI / 2);
  for (const [x, y, c] of [[0.38, 1.5, O], [-0.42, 1.36, R], [0.12, 1.3, K]]) { b.sph(0.08, c, x, y, z, 1, 1.1, 0.08, { seg: 5 }); for (let f = 0; f < 4; f++) b.box(0.025, 0.1, 0.02, c, x - 0.06 + f * 0.04, y + 0.12, z, 0, 0, (1.5 - f) * 0.15); }   // handprints
  b.tor(0.1, 0.018, R, -0.3, 1.0, z, 0, 0, 0, { seg: 8, tseg: 3 }).tor(0.05, 0.016, R, -0.29, 1.0, z, 0, 0, 0, { seg: 6, tseg: 3 });
  caveKidInto(b, 0.34, 0, 0.42, 1.05, { wave: true, ry: -0.3 });
  b.cyl(0.12, 0.09, 0.1, DINO.rockD, -0.3, 0.05, 0.5, 0, 0, 0, { seg: 6 }).cyl(0.1, 0.1, 0.02, R, -0.3, 0.1, 0.5, 0, 0, 0, { seg: 6 });
});
def('longNeckCalf', 'tall', 1.6, 2.8, 1.6, (b) => {
  // a young long-neck, already taller than you
  longNeckInto(b, 0.1, 0, -0.3, 0.76, { ry: -PI / 2 + 0.35 });
  fernInto(b, -0.5, 0, 0.5, 0.5, 6);
});
def('stoneTotem', 'tall', 1.4, 2.75, 1.0, (b) => {
  // three boulders with painted faces, balanced on top of one another
  const cols = [DINO.rockD, DINO.rock, 0xb0a498], R = 0xc8503a;
  for (let i = 0; i < 3; i++) {
    const r = 0.56 - i * 0.07, y = [0.46, 1.3, 2.02][i];
    b.sph(r, cols[i], 0, y, 0, 1.05, 0.88, 0.9, { seg: 8 });
    for (const sx of [-1, 1]) b.sph(0.07, DINO.eye, sx * r * 0.36, y + 0.08, r * 0.82, 1, 1.2, 0.4, { seg: 5 }).sph(0.06, R, sx * r * 0.62, y - 0.06, r * 0.7, 1, 0.7, 0.4, { seg: 5 });
    b.tor(r * 0.22, 0.02, DINO.eye, 0, y - 0.06, r * 0.86, 0.15, 0, PI, { arc: PI, seg: 6, tseg: 3 });
  }
  for (let i = 0; i < 5; i++) b.cone(0.1, 0.4, i % 2 ? DINO.fern : DINO.fernD, (i - 2) * 0.12, 2.5, 0, 0, 0, (2 - i) * 0.3, { seg: 4 });
});
def('cycadTree', 'tall', 1.6, 2.9, 1.6, (b) => {
  // a cycad with an orange cone
  cycadInto(b, 0, 0, 0, 1.08);
  b.sph(0.2, DINO.rock, 0.42, 0.12, 0.36, 1, 0.7, 1, { seg: 5 }).sph(0.14, DINO.rockD, -0.4, 0.08, 0.3, 1, 0.7, 1, { seg: 5 });
});
def('rexHello', 'tall', 1.6, 2.8, 1.4, (b) => {
  // a young tyrannosaur waving both of its very small arms
  rexInto(b, 0, 0, 0.1, 1.12);
});
def('stoneWheel', 'low', 1.2, 1.0, 1.0, (b) => {
  // the very first wheel, rolling down the lane on its log axle
  b.cyl(0.5, 0.5, 0.34, DINO.rock, 0, 0, 0, 0, 0, PI / 2, { seg: 14, grad: 0.95 }).cyl(0.09, 0.09, 1.15, DINO.bark, 0, 0, 0, 0, 0, PI / 2, { seg: 6 });
  for (const sx of [-1, 1]) { b.tor(0.44, 0.03, DINO.rockD, sx * 0.175, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 3 }).cyl(0.18, 0.18, 0.02, DINO.rockD, sx * 0.18, 0, 0, 0, 0, PI / 2, { seg: 8 }); for (let i = 0; i < 3; i++) b.sph(0.05, 0xc8503a, sx * 0.18, Math.cos(i * 2.09) * 0.32, Math.sin(i * 2.09) * 0.32, 0.4, 1, 1, { seg: 5 }); }
}, { center: true });
def('rollEgg', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the pterosaur drops: a big speckled egg, rolling
  b.sph(0.4, 0xfff3d6, 0, 0, 0, 1.2, 1, 1, { seg: 12 });
  for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9, ph = Math.acos(1 - 2 * u), th = i * 2.4; b.sph(0.085, i % 2 ? DINO.teal : DINO.purple, Math.cos(ph) * 0.47, Math.sin(ph) * Math.cos(th) * 0.39, Math.sin(ph) * Math.sin(th) * 0.39, 1, 1, 1, { seg: 5 }); }
}, { center: true });
def('compy', 'low', 1.3, 0.95, 0.9, (b) => {
  // a very small dinosaur running across with a leaf it has found; it faces +x
  const c = DINO.yellow;
  b.sph(0.26, c, -0.02, 0.5, 0, 1.4, 0.9, 0.9, { seg: 9 }).sph(0.2, DINO.belly, 0.02, 0.44, 0, 1.3, 0.7, 0.8, { seg: 7 });
  for (let i = 0; i < 5; i++) b.sph(0.14 - i * 0.022, c, -0.38 - i * 0.15, 0.52 + i * 0.03, 0, 1.3, 1, 1, { seg: 5 });
  for (let i = 0; i < 3; i++) b.sph(0.13 - i * 0.01, c, 0.3 + i * 0.07, 0.6 + i * 0.1, 0, 1, 1.1, 1, { seg: 6 });
  b.sph(0.17, c, 0.5, 0.86, 0, 1.25, 0.9, 0.95, { seg: 8 }).sph(0.1, c, 0.68, 0.82, 0, 1.2, 0.7, 0.9, { seg: 6 });
  for (const sz of [-1, 1]) {
    b.sph(0.06, 0xffffff, 0.54, 0.92, sz * 0.14, 1, 1.1, 0.6, { seg: 6 }).sph(0.034, DINO.eye, 0.56, 0.92, sz * 0.17, 1, 1.1, 0.5, { seg: 5 }).sph(0.035, DINO.cheek, 0.6, 0.8, sz * 0.13, 1, 0.7, 0.4, { seg: 4 });
    b.cyl(0.045, 0.045, 0.34, c, sz * 0.12 * 0 + (sz > 0 ? 0.08 : -0.12), 0.22, sz * 0.13, 0, 0, sz * 0.5, { seg: 5 }).sph(0.07, DINO.orange, (sz > 0 ? 0.2 : -0.22), 0.04, sz * 0.13, 1.6, 0.5, 1, { seg: 5 }).cap(0.03, 0.1, c, 0.26, 0.5, sz * 0.2, 0, 0, -1.0, { seg: 4 });
  }
  for (let i = 0; i < 4; i++) b.sph(0.05, DINO.orange, -0.2 + i * 0.13, 0.73, 0, 1.4, 0.6, 1, { seg: 4 });
  b.sph(0.16, DINO.fern, 0.86, 0.8, 0, 1.4, 0.2, 0.8, { seg: 6 }).cyl(0.012, 0.012, 0.12, DINO.fernD, 0.76, 0.8, 0, 0, 0, PI / 2, { seg: 3 });
});
def('ptero', 'deco', 2.4, 1.1, 1.4, (b) => {
  // a pterosaur with a long beak and a crest, carrying an egg
  const c = DINO.orange;
  b.sph(0.28, c, 0, 0, -0.05, 0.9, 0.8, 1.3, { seg: 9 }).sph(0.22, DINO.belly, 0, -0.08, 0, 0.8, 0.6, 1.1, { seg: 7 }).cap(0.1, 0.2, c, 0, 0.14, 0.34, 0.9, 0, 0, { seg: 6 });
  b.sph(0.2, c, 0, 0.3, 0.52, 0.9, 0.9, 1.1, { seg: 8 }).cone(0.1, 0.6, DINO.yellow, 0, 0.24, 0.98, PI / 2, 0, 0, { seg: 5 }).cone(0.09, 0.46, DINO.purple, 0, 0.5, 0.24, -1.1, 0, 0, { seg: 4 });
  for (const sx of [-1, 1]) b.sph(0.07, 0xffffff, sx * 0.14, 0.36, 0.62, 0.6, 1.1, 1, { seg: 6 }).sph(0.04, DINO.eye, sx * 0.17, 0.36, 0.65, 0.6, 1.1, 1, { seg: 5 }).sph(0.04, DINO.cheek, sx * 0.15, 0.24, 0.66, 0.6, 0.7, 1, { seg: 4 }).cyl(0.02, 0.02, 0.26, c, sx * 0.1, -0.3, 0, 0, 0, sx * 0.25, { seg: 4 });
  b.cone(0.07, 0.36, c, 0, -0.02, -0.56, -PI / 2, 0, 0, { seg: 4 });
  b.sph(0.17, 0xfff3d6, 0, -0.56, 0, 1, 1.25, 1, { seg: 8 }); for (let i = 0; i < 4; i++) b.sph(0.04, DINO.teal, Math.cos(i * 1.6) * 0.15, -0.56 + (i % 2) * 0.12 - 0.06, Math.sin(i * 1.6) * 0.15, 1, 1, 1, { seg: 4 });
}, {
  wings: (b, sx) => { b.sph(0.5, DINO.orange, sx * 0.48, 0, 0, 1.2, 0.07, 0.72, { seg: 7 }).sph(0.3, 0xffb878, sx * 0.86, 0, -0.14, 1.2, 0.07, 0.6, { seg: 6 }).cyl(0.03, 0.03, 1.2, 0xe07a2a, sx * 0.6, 0.03, 0.3, 0, 0, PI / 2, { seg: 4 }); }, wingAt: [0.14, 0.05, 0],
});

// ---------- Ancient Egypt ----------
export const EGY = { sand: 0xe8c88a, sandD: 0xd0a868, stone: 0xe6cfa0, stoneD: 0xc8a870, gold: 0xf2c230, blue: 0x2f5fd0, teal: 0x2fb8a8, red: 0xd8503a, black: 0x2a2630, palm: 0x4f9a48, palmD: 0x3a7a3a, bark: 0x9a7a4a, white: 0xfff8e8, camel: 0xd8a860, camelD: 0xb88848, eye: 0x1b1f24, cheek: 0xff9ab0 };
// A pyramid with a golden tip: its base is 2 r square at (x, y, z) and it is h high.
export function pyramidInto(b, x, y, z, r, h, c = EGY.stone) {
  b.cone(r * 1.414, h, c, x, y + h / 2, z, 0, PI / 4, 0, { seg: 4, grad: 0.8 }).cone(r * 1.414 * 0.16, h * 0.16, EGY.gold, x, y + h * 0.923, z, 0, PI / 4, 0, { seg: 4 });
}
// A date palm about 3.6 s high, leaning a little, with bunches of dates.
export function datePalmInto(b, x, y, z, s = 1, a0 = 0) {
  b.at(x, y, z, a0, () => {
    for (let i = 0; i < 4; i++) b.cyl(0.13 - i * 0.012, 0.16 - i * 0.012, 0.74, i % 2 ? EGY.bark : 0x8a6a40, i * i * 0.035, 0.35 + i * 0.68, 0, 0, 0, -0.05 - i * 0.07, { seg: 6 });
    const tx = 0.42, ty = 2.74;
    for (let i = 0; i < 9; i++) { const a = i * 0.698, lean = i % 3 === 0 ? 0.7 : 1.35, l = 1.5; b.cone(0.2, l, i % 2 ? EGY.palm : EGY.palmD, tx + Math.cos(a) * Math.sin(lean) * l * 0.5, ty + Math.cos(lean) * l * 0.5, Math.sin(a) * Math.sin(lean) * l * 0.5, Math.sin(a) * lean, 0, -Math.cos(a) * lean, { seg: 4 }); }
    for (const sz of [-1, 1]) for (let q = 0; q < 5; q++) b.sph(0.07, 0xd8843a, tx + (q % 2) * 0.08 - 0.04, ty - 0.14 - q * 0.07, sz * 0.2 + (q % 3) * 0.03, 1, 1.2, 1, { seg: 4 });
  }, s);
}
// A cat sitting up very straight, like a statue, facing +z: about 1.15 s high, with a golden collar and an earring.
export function sitCatInto(b, x, y, z, s = 1, col = EGY.black, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.sph(0.3, col, 0, 0.36, -0.04, 0.85, 1.2, 1, { seg: 9 }).sph(0.2, col, 0, 0.56, 0.1, 0.9, 1.3, 0.8, { seg: 8 }).sph(0.2, col, 0, 0.9, 0.08, 1, 0.9, 0.9, { seg: 9 });
    for (const sx of [-1, 1]) {
      b.cyl(0.055, 0.06, 0.44, col, sx * 0.1, 0.22, 0.22, 0, 0, 0, { seg: 6 }).sph(0.07, col, sx * 0.1, 0.04, 0.26, 1, 0.6, 1.3, { seg: 5 }).cone(0.07, 0.2, col, sx * 0.11, 1.12, 0.06, 0, 0, sx * -0.15, { seg: 4 });
      b.sph(0.04, EGY.gold, sx * 0.08, 0.93, 0.25, 1, 1.2, 0.5, { seg: 5 }).sph(0.018, EGY.eye, sx * 0.08, 0.93, 0.27, 0.6, 1.3, 0.5, { seg: 4 });
    }
    b.sph(0.03, EGY.cheek, 0, 0.86, 0.26, 1, 0.7, 0.6, { seg: 4 }).tor(0.165, 0.035, EGY.gold, 0, 0.72, 0.08, PI / 2, 0, 0, { seg: 9, tseg: 4 }).sph(0.04, EGY.teal, 0, 0.7, 0.25, 1, 1, 0.6, { seg: 5 }).tor(0.035, 0.01, EGY.gold, 0.18, 1.04, 0.06, 0, 0, 0, { seg: 6, tseg: 3 });
    b.tor(0.24, 0.045, col, 0.02, 0.06, 0.02, PI / 2, 0, 0.3, { arc: PI * 1.1, seg: 8, tseg: 4 });
  }, s);
}
// A camel with one hump and a striped saddle blanket, facing +x: about 2.3 s high.
export function camelInto(b, x, y, z, s = 1, ry = 0) {
  const c = EGY.camel, d = EGY.camelD;
  b.at(x, y, z, ry, () => {
    b.sph(0.5, c, 0, 1.3, 0, 1.5, 0.85, 0.9, { seg: 10 }).sph(0.36, c, -0.05, 1.72, 0, 1.1, 0.9, 0.85, { seg: 8 });
    for (const sx of [-0.5, 0.5]) for (const sz of [-0.22, 0.22]) b.cyl(0.11, 0.1, 0.95, c, sx, 0.52, sz, 0, 0, 0, { seg: 6 }).sph(0.13, d, sx + 0.02, 0.05, sz, 1.2, 0.5, 1, { seg: 5 });
    for (let i = 0; i < 5; i++) b.sph(0.17 - i * 0.012, c, 0.72 + i * 0.1, 1.42 + i * 0.17, 0, 1, 1.1, 0.9, { seg: 6 });
    b.sph(0.18, c, 1.24, 2.16, 0, 1.3, 0.85, 0.9, { seg: 8 }).sph(0.12, c, 1.44, 2.1, 0, 1.2, 0.8, 0.9, { seg: 6 }).cyl(0.02, 0.03, 0.5, d, -0.8, 1.15, 0, 0, 0, -0.3, { seg: 4 }).sph(0.05, d, -0.88, 0.9, 0, 1, 1.4, 1, { seg: 4 });
    for (const sz of [-1, 1]) b.sph(0.05, 0xffffff, 1.3, 2.22, sz * 0.14, 1, 1, 0.6, { seg: 5 }).sph(0.028, EGY.eye, 1.32, 2.21, sz * 0.165, 1, 1, 0.6, { seg: 4 }).sph(0.04, EGY.cheek, 1.4, 2.1, sz * 0.1, 1, 0.7, 0.5, { seg: 4 }).sph(0.06, c, 1.14, 2.3, sz * 0.12, 0.6, 1.2, 0.5, { seg: 4 });
    b.sph(0.4, EGY.red, -0.05, 1.72, 0, 1.04, 0.92, 0.9, { seg: 9 }).sph(0.41, EGY.gold, -0.05, 1.72, 0, 0.26, 0.92, 0.9, { seg: 9 });
    for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) b.sph(0.05, i % 2 ? EGY.gold : EGY.teal, -0.25 + i * 0.2, 1.5, sz * 0.36, 1, 1.5, 1, { seg: 4 });
  }, s);
}
// An obelisk h high with a golden tip and a few painted signs down the front (+z).
export function obeliskInto(b, x, y, z, h, w = 0.36) {
  b.cyl(w * 0.78, w * 1.1, h * 0.88, EGY.stone, x, y + h * 0.44, z, 0, PI / 4, 0, { seg: 4, grad: 0.85 }).cone(w * 0.78, h * 0.12, EGY.gold, x, y + h * 0.94, z, 0, PI / 4, 0, { seg: 4 });
  const cols = [EGY.blue, EGY.red, EGY.teal, EGY.black];
  for (let i = 0; i < 5; i++) { const yy = y + h * (0.2 + i * 0.13), zz = z + w * (0.76 - i * 0.03); if (i % 2) b.cyl(w * 0.2, w * 0.2, 0.03, cols[i % 4], x, yy, zz, PI / 2, 0, 0, { seg: 7 }); else b.box(w * 0.5, w * 0.16, 0.03, cols[i % 4], x, yy, zz); }
}
def('miniPyramid', 'low', 1.5, 0.95, 1.3, (b) => {
  // a little step pyramid of sandstone blocks, with a golden top and a beetle climbing it
  for (let i = 0; i < 3; i++) b.box(1.3 - i * 0.4, 0.27, 1.1 - i * 0.34, i % 2 ? EGY.stoneD : EGY.stone, 0, 0.135 + i * 0.27, 0, 0, 0, 0, { grad: 0.92 });
  b.cone(0.16, 0.14, EGY.gold, 0, 0.88, 0, 0, PI / 4, 0, { seg: 4 });
  for (let i = 0; i < 3; i++) for (let q = 0; q < 3 - i; q++) b.box(0.01, 0.27, 0.02, EGY.sandD, -0.4 + i * 0.2 + q * 0.42, 0.135 + i * 0.27, 0.56 - i * 0.17);
  b.sph(0.08, EGY.teal, 0.36, 0.33, 0.44, 1, 0.6, 1.3, { seg: 6 }).sph(0.045, EGY.gold, 0.36, 0.33, 0.54, 1, 0.7, 1, { seg: 5 });
});
def('catStatue', 'low', 1.4, 0.98, 1.0, (b) => {
  // a black cat who sits so still she might be a statue, between two pots of lotus flowers
  b.box(0.6, 0.08, 0.6, EGY.stone, 0, 0.04, 0);
  sitCatInto(b, 0, 0.08, -0.02, 0.76);
  for (const sx of [-1, 1]) {
    b.cyl(0.16, 0.11, 0.26, EGY.blue, sx * 0.5, 0.13, 0.1, 0, 0, 0, { seg: 8 }).tor(0.16, 0.02, EGY.gold, sx * 0.5, 0.26, 0.1, PI / 2, 0, 0, { seg: 8, tseg: 3 }).cyl(0.012, 0.012, 0.26, EGY.palmD, sx * 0.5, 0.39, 0.1, 0, 0, 0, { seg: 3 });
    for (let i = 0; i < 5; i++) b.cone(0.045, 0.16, i % 2 ? 0xffc0d8 : 0xffffff, sx * 0.5 + Math.cos(i * 1.257) * 0.05, 0.58, 0.1 + Math.sin(i * 1.257) * 0.05, Math.sin(i * 1.257) * 0.5, 0, -Math.cos(i * 1.257) * 0.5, { seg: 4 });
  }
});
def('scarabChest', 'low', 1.4, 0.9, 1.0, (b) => {
  // a chest of treasure with its lid up
  b.box(1.0, 0.5, 0.66, EGY.blue, 0, 0.25, 0, 0, 0, 0, { grad: 0.85 });
  for (const x of [-0.5, -0.17, 0.17, 0.5]) b.box(0.06, 0.52, 0.68, EGY.gold, x, 0.25, 0);
  b.box(1.0, 0.07, 0.66, EGY.blue, 0, 0.72, -0.4, -1.1, 0, 0).box(1.04, 0.08, 0.08, EGY.gold, 0, 0.5, -0.33);
  for (let i = 0; i < 12; i++) b.cyl(0.085, 0.085, 0.025, EGY.gold, -0.36 + (i % 5) * 0.18, 0.52 + (i % 3) * 0.03, -0.18 + Math.floor(i / 5) * 0.16, 0.3 * (i % 3), i, 0.2, { seg: 7 });
  b.sph(0.1, EGY.teal, 0.05, 0.63, 0.05, 1, 0.6, 1.3, { seg: 6 }).sph(0.05, EGY.gold, 0.05, 0.63, 0.17, 1, 0.7, 1, { seg: 5 }).tor(0.13, 0.025, EGY.red, -0.3, 0.6, 0.02, PI / 2 - 0.3, 0, 0, { seg: 9, tseg: 3 }).sph(0.07, EGY.red, 0.34, 0.6, 0.1, 1, 1, 1, { seg: 5 });
  b.cyl(0.09, 0.09, 0.025, EGY.gold, 0.6, 0.02, 0.36, 0, 0, 0, { seg: 7 }).cyl(0.09, 0.09, 0.025, EGY.gold, -0.62, 0.02, 0.3, 0, 0, 0, { seg: 7 });
});
def('lotusPond', 'low', 1.4, 0.8, 1.2, (b) => {
  // a stone pool of lotus flowers, with a frog on a lily pad
  b.cyl(0.62, 0.66, 0.34, EGY.stone, 0, 0.17, 0, 0, 0, 0, { seg: 12, grad: 0.9 }).cyl(0.54, 0.54, 0.02, 0x5ab8e0, 0, 0.34, 0, 0, 0, 0, { seg: 12 }).tor(0.6, 0.05, EGY.stoneD, 0, 0.34, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 });
  for (let i = 0; i < 6; i++) b.box(0.1, 0.1, 0.02, [EGY.blue, EGY.red, EGY.teal][i % 3], Math.cos(i * 1.047 + 0.5) * 0.65, 0.17, Math.sin(i * 1.047 + 0.5) * 0.65, 0, -(i * 1.047 + 0.5) + PI / 2, 0);
  for (const [x, z, h] of [[-0.24, -0.1, 0.34], [0.26, -0.18, 0.24], [0.1, 0.24, 0.0]]) {
    b.cyl(0.16, 0.16, 0.015, EGY.palm, x + 0.14, 0.36, z + 0.1, 0, 0, 0, { seg: 7 });
    if (h) { b.cyl(0.012, 0.012, h, EGY.palmD, x, 0.35 + h / 2, z, 0, 0, 0, { seg: 3 }); for (let i = 0; i < 6; i++) b.cone(0.05, 0.18, i % 2 ? 0xffc0d8 : 0xffffff, x + Math.cos(i * 1.047) * 0.06, 0.4 + h, z + Math.sin(i * 1.047) * 0.06, Math.sin(i * 1.047) * 0.55, 0, -Math.cos(i * 1.047) * 0.55, { seg: 4 }); b.sph(0.04, EGY.gold, x, 0.38 + h, z, 1, 1, 1, { seg: 4 }); }
  }
  b.sph(0.09, 0x6fbf5a, 0.24, 0.44, 0.34, 1.1, 0.8, 1.2, { seg: 7 });
  for (const sx of [-1, 1]) b.sph(0.04, 0x6fbf5a, 0.24 + sx * 0.06, 0.52, 0.4, 1, 1, 1, { seg: 5 }).sph(0.02, EGY.eye, 0.24 + sx * 0.06, 0.53, 0.435, 1, 1, 0.5, { seg: 4 });
});
def('scribeDesk', 'low', 1.4, 0.92, 1.0, (b) => {
  // a scribe's things: a stone tablet of picture writing, scrolls, and ink with a reed pen
  b.box(0.8, 0.84, 0.12, EGY.stone, -0.22, 0.44, -0.1, -0.18, 0.1, 0, { grad: 0.9 });
  const z = 0.02, cols = [EGY.blue, EGY.red, EGY.black, EGY.teal];
  b.sph(0.1, 0xffffff, -0.36, 0.66, z + 0.03, 1.5, 0.8, 0.2, { seg: 6 }).sph(0.05, EGY.blue, -0.36, 0.66, z + 0.045, 1, 1, 0.3, { seg: 5 }).box(0.3, 0.025, 0.02, EGY.black, -0.36, 0.74, z + 0.04);
  b.sph(0.08, EGY.gold, -0.04, 0.68, z + 0.03, 1, 1, 0.3, { seg: 6 }).cone(0.05, 0.1, cols[1], 0.06, 0.66, z + 0.03, 0, 0, -PI / 2, { seg: 3 });
  for (let i = 0; i < 4; i++) b.box(0.1, 0.04, 0.02, cols[i], -0.46 + i * 0.16, 0.48 - (i % 2) * 0.03, z + 0.07, 0, 0, (i % 2 ? 0.5 : -0.5));
  for (let i = 0; i < 3; i++) b.sph(0.045, cols[(i + 1) % 4], -0.4 + i * 0.18, 0.3, z + 0.1, 1, 1, 0.3, { seg: 5 });
  for (let i = 0; i < 3; i++) b.cyl(0.07, 0.07, 0.5, EGY.white, 0.42 + (i % 2) * 0.08, 0.07 + i * 0.12, 0.1, PI / 2, 0.3 * (i - 1), 0, { seg: 7 }).cyl(0.074, 0.074, 0.06, EGY.red, 0.42 + (i % 2) * 0.08, 0.07 + i * 0.12, 0.1, PI / 2, 0.3 * (i - 1), 0, { seg: 7 });
  b.cyl(0.08, 0.06, 0.1, EGY.black, 0.1, 0.05, 0.4, 0, 0, 0, { seg: 7 }).cyl(0.012, 0.012, 0.34, EGY.palmD, 0.14, 0.22, 0.4, 0, 0, -0.35, { seg: 3 });
});
def('obelisk', 'tall', 1.4, 2.85, 1.0, (b) => {
  // a pointed stone with a golden tip, and a cat keeping it company
  b.box(0.9, 0.2, 0.9, EGY.stoneD, 0, 0.1, 0);
  obeliskInto(b, 0, 0.2, 0, 2.6, 0.34);
  sitCatInto(b, 0.5, 0, 0.3, 0.5, 0xe8a040, -0.3);
});
def('camelCalf', 'tall', 1.6, 2.7, 1.6, (b) => {
  // a young camel in her best blanket
  camelInto(b, -0.05, 0, -0.25, 1.12, -PI / 2 + 0.4);
});
def('potPalm', 'tall', 1.6, 2.9, 1.6, (b) => {
  // a date palm in a painted pot
  b.cyl(0.36, 0.26, 0.44, EGY.blue, 0, 0.22, 0, 0, 0, 0, { seg: 10 }).tor(0.36, 0.035, EGY.gold, 0, 0.44, 0, PI / 2, 0, 0, { seg: 10, tseg: 4 }).tor(0.315, 0.03, EGY.gold, 0, 0.22, 0, PI / 2, 0, 0, { seg: 10, tseg: 3 });
  datePalmInto(b, -0.08, 0.3, 0, 0.72, 0.5);
});
def('falconStatue', 'tall', 1.4, 2.8, 1.0, (b) => {
  // a golden falcon in a crown, on a painted stand
  b.box(0.9, 1.0, 0.8, EGY.stone, 0, 0.5, 0, 0, 0, 0, { grad: 0.88 }).box(1.0, 0.1, 0.9, EGY.gold, 0, 1.05, 0);
  for (let i = 0; i < 4; i++) b.box(0.14, 0.5, 0.02, [EGY.blue, EGY.red, EGY.teal, EGY.blue][i], -0.3 + i * 0.2, 0.5, 0.41);
  b.sph(0.36, EGY.gold, 0, 1.56, 0, 1, 1.25, 0.95, { seg: 10 }).sph(0.26, EGY.white, 0, 1.5, 0.16, 1, 1.2, 0.7, { seg: 8 }).sph(0.26, EGY.gold, 0, 2.14, 0.02, 1, 0.95, 0.95, { seg: 9 });
  for (const sx of [-1, 1]) b.sph(0.16, EGY.blue, sx * 0.34, 1.54, -0.02, 0.5, 1.6, 1, { seg: 6 }).sph(0.06, 0xffffff, sx * 0.1, 2.18, 0.22, 1, 1, 0.6, { seg: 5 }).sph(0.034, EGY.eye, sx * 0.1, 2.18, 0.25, 1, 1, 0.6, { seg: 4 }).sph(0.07, 0xffb347, sx * 0.12, 1.12, 0.14, 1, 0.5, 1.5, { seg: 5 });
  b.cone(0.06, 0.16, 0xffb347, 0, 2.1, 0.3, PI * 0.65, 0, 0, { seg: 5 });
  b.cyl(0.2, 0.24, 0.22, EGY.red, 0, 2.44, 0, 0, 0, 0, { seg: 9 }).cyl(0.13, 0.19, 0.24, EGY.white, 0, 2.62, -0.02, 0, 0, 0, { seg: 8 }).sph(0.05, EGY.gold, 0, 2.5, 0.22, 1, 1.4, 1, { seg: 5 });
});
def('lotusColumn', 'tall', 1.4, 2.8, 1.0, (b) => {
  // a painted pillar that opens at the top like a flower
  b.cyl(0.42, 0.46, 0.16, EGY.stoneD, 0, 0.08, 0, 0, 0, 0, { seg: 12 }).cyl(0.3, 0.34, 2.0, EGY.stone, 0, 1.16, 0, 0, 0, 0, { seg: 12, grad: 0.9 });
  [[0.4, EGY.red], [0.56, EGY.gold], [0.72, EGY.blue], [1.3, EGY.teal], [1.46, EGY.gold], [1.9, EGY.red], [2.04, EGY.blue]].forEach(([y, c]) => b.cyl(0.345 - y * 0.02, 0.345 - y * 0.02, 0.12, c, 0, y, 0, 0, 0, 0, { seg: 12 }));
  b.cyl(0.58, 0.3, 0.42, EGY.teal, 0, 2.37, 0, 0, 0, 0, { seg: 12 }).box(1.0, 0.16, 1.0, EGY.stoneD, 0, 2.66, 0);
  for (let i = 0; i < 8; i++) b.cone(0.1, 0.4, i % 2 ? EGY.gold : EGY.red, Math.cos(i * 0.785) * 0.47, 2.36, Math.sin(i * 0.785) * 0.47, Math.sin(i * 0.785) * 0.6, 0, -Math.cos(i * 0.785) * 0.6, { seg: 4 });
  b.sph(0.1, EGY.blue, 0, 1.02, 0.33, 1.5, 0.9, 0.3, { seg: 6 }).sph(0.05, EGY.black, 0, 1.02, 0.35, 1, 1, 0.3, { seg: 5 });
});
def('scarabBall', 'low', 1.1, 1.0, 1.0, (b) => {
  // a beetle's great big ball rolling down the lane, with the beetle still holding on
  b.sph(0.5, EGY.sandD, 0, 0, 0, 1, 1, 1, { seg: 12 });
  for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, ph = Math.acos(1 - 2 * u), th = i * 2.4; b.sph(0.1, EGY.sand, Math.sin(ph) * Math.cos(th) * 0.46, Math.cos(ph) * 0.46, Math.sin(ph) * Math.sin(th) * 0.46, 1, 1, 1, { seg: 4 }); }
  b.sph(0.17, EGY.teal, 0, 0.5, 0.1, 1, 0.6, 1.3, { seg: 7 }).sph(0.09, EGY.gold, 0, 0.47, 0.32, 1, 0.7, 1, { seg: 5 }).box(0.01, 0.06, 0.4, EGY.gold, 0, 0.6, 0.08);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.cyl(0.015, 0.015, 0.2, EGY.black, sx * 0.2, 0.44, -0.06 + i * 0.14, 0, 0, sx * 1.0, { seg: 3 });
}, { center: true });
def('sunBall', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the falcon drops: a little golden sun, rolling
  b.sph(0.38, EGY.gold, 0, 0, 0, 1, 1, 1, { seg: 12, glow: true, grad: 0.85 });
  for (let i = 0; i < 10; i++) { const a = i * 0.628; b.sph(0.1, 0xffb347, 0, Math.cos(a) * 0.43, Math.sin(a) * 0.43, 1, 1, 1, { seg: 5 }); }
  for (const sx of [-1, 1]) b.sph(0.1, 0xffb347, sx * 0.4, 0, 0, 1, 1, 1, { seg: 5 });
}, { center: true });
def('babyCamel', 'low', 1.3, 0.98, 0.9, (b) => {
  // a baby camel trotting across in a tiny blanket; it faces +x
  camelInto(b, -0.12, 0, 0, 0.42);
});
def('falcon', 'deco', 2.2, 1.1, 1.4, (b) => {
  // a falcon in a striped headcloth, carrying a little sun
  const c = 0xc89850;
  b.sph(0.3, c, 0, 0, -0.05, 0.95, 0.85, 1.3, { seg: 9 }).sph(0.24, EGY.white, 0, -0.08, 0.06, 0.85, 0.7, 1.1, { seg: 7 }).sph(0.21, c, 0, 0.2, 0.4, 1, 0.95, 1, { seg: 8 });
  b.sph(0.225, EGY.blue, 0, 0.26, 0.34, 1.05, 0.9, 0.95, { seg: 8 });
  for (let i = 0; i < 3; i++) b.tor(0.2 - i * 0.02, 0.022, EGY.gold, 0, 0.22 + i * 0.09, 0.34, PI / 2, 0, 0, { seg: 8, tseg: 3 });
  for (const sx of [-1, 1]) b.sph(0.06, 0xffffff, sx * 0.1, 0.22, 0.56, 1, 1, 0.6, { seg: 5 }).sph(0.034, EGY.eye, sx * 0.1, 0.22, 0.59, 1, 1, 0.6, { seg: 4 }).box(0.09, 0.3, 0.05, EGY.blue, sx * 0.2, 0.06, 0.36).cyl(0.018, 0.018, 0.24, 0xffb347, sx * 0.1, -0.32, 0, 0, 0, sx * 0.25, { seg: 4 });
  b.cone(0.055, 0.15, 0xffb347, 0, 0.14, 0.62, PI * 0.65, 0, 0, { seg: 5 });
  for (let i = 0; i < 3; i++) b.box(0.12, 0.03, 0.34, i % 2 ? EGY.blue : c, (i - 1) * 0.12, -0.04, -0.52, 0.1, (i - 1) * -0.25, 0);
  b.sph(0.16, EGY.gold, 0, -0.56, 0, 1, 1, 1, { seg: 8, glow: true, grad: 0.85 });
}, {
  wings: (b, sx) => { for (let i = 0; i < 4; i++) b.sph(0.3 - i * 0.03, [0xc89850, EGY.blue, 0xc89850, EGY.gold][i], sx * (0.24 + i * 0.2), 0.02 - i * 0.01, -0.02 - i * 0.07, 1.1, 0.1, 0.62, { seg: 7 }); }, wingAt: [0.18, 0.08, -0.05],
});

// ---------- Ancient Rome ----------
export const ROM = { brick: 0xc8643a, brickD: 0xa84f30, roof: 0xd8703a, roofD: 0xb85a30, stucco: 0xf2d8a8, stuccoD: 0xe0b878, red: 0xc8282a, redD: 0x9a1f24, gold: 0xf2c230, purple: 0x7a3a9a, stone: 0xe0d6c0, stoneD: 0xb8ac98, pine: 0x3a7a4a, pineD: 0x2a5f3a, bark: 0x8a5a3a, bronze: 0xc88a3a, grape: 0x7a3a9a, leaf: 0x5fa84a, beak: 0xffa030, eye: 0x1b1f24, cheek: 0xff9ab0, water: 0x6fc8e8 };
// A goose, the proudest citizen of Rome, facing +z and about 1 s high. Options: ry, col, helmet (a soldier's, with a red crest), wreath, sash (a purple one), wave (one wing up).
export function gooseInto(b, x, y, z, s = 1, o = {}) {
  b.at(x, y, z, o.ry || 0, () => {
    const W = o.col || 0xffffff, BK = o.col ? ROM.gold : ROM.beak;
    b.sph(0.26, W, 0, 0.36, -0.04, 0.95, 0.9, 1.25, { seg: 9 }).cone(0.14, 0.3, W, 0, 0.46, -0.4, -1.1, 0, 0, { seg: 5 });
    for (let i = 0; i < 4; i++) b.sph(0.1 - i * 0.004, W, 0, 0.5 + i * 0.09, 0.14 + Math.sin(i * 0.5) * 0.03, 1, 1, 1, { seg: 6 });
    b.sph(0.13, W, 0, 0.86, 0.18, 1, 0.95, 1.05, { seg: 8 }).cone(0.06, 0.18, BK, 0, 0.83, 0.37, PI / 2, 0, 0, { seg: 5 });
    for (const sx of [-1, 1]) {
      b.sph(0.028, ROM.eye, sx * 0.085, 0.87, 0.28, 0.6, 1.2, 0.6, { seg: 4 }).sph(0.03, o.col ? W : ROM.cheek, sx * 0.105, 0.81, 0.25, 0.6, 0.7, 1, { seg: 4 });
      b.cyl(0.022, 0.022, 0.16, BK, sx * 0.1, 0.09, 0, 0, 0, 0, { seg: 4 }).sph(0.07, BK, sx * 0.1, 0.02, 0.05, 1, 0.3, 1.5, { seg: 5 });
      if (o.wave && sx > 0) b.sph(0.17, W, 0.32, 0.62, 0, 0.35, 1.3, 0.8, { seg: 6 });
      else b.sph(0.17, W, sx * 0.24, 0.38, -0.06, 0.35, 0.9, 1.3, { seg: 6 });
    }
    if (o.helmet) b.sph(0.14, ROM.bronze, 0, 0.97, 0.16, 1, 0.6, 1.05, { seg: 8 }).sph(0.16, ROM.red, 0, 1.06, 0.13, 0.25, 0.62, 1.1, { seg: 7 }).box(0.3, 0.025, 0.05, ROM.gold, 0, 0.93, 0.29);
    if (o.wreath) b.tor(0.115, 0.028, o.col ? ROM.gold : ROM.leaf, 0, 0.96, 0.16, PI / 2 - 0.25, 0, 0, { seg: 8, tseg: 4 });
    if (o.sash) b.tor(0.262, 0.035, ROM.purple, 0, 0.38, -0.02, 0, 0, 0.75, { seg: 10, tseg: 4 });
  }, s);
}
// An umbrella pine: a tall bare trunk and a wide flat top. About 3.6 s high.
export function stonePineInto(b, x, y, z, s = 1, a0 = 0) {
  b.at(x, y, z, a0, () => {
    b.cyl(0.1, 0.17, 2.8, ROM.bark, 0.08, 1.4, 0, 0, 0, -0.06, { seg: 6 });
    for (const [bx, bz, l] of [[0.5, 0.1, 0.9], [-0.4, -0.2, 0.8], [0.1, 0.5, 0.7]]) b.cyl(0.04, 0.06, l, ROM.bark, 0.16 + bx * 0.5, 2.9, bz * 0.5, bz * 1.1, 0, -bx * 1.4, { seg: 4 });
    b.sph(1.15, ROM.pine, 0.16, 3.15, 0, 1, 0.34, 1, { seg: 9 }).sph(0.8, ROM.pineD, 0.7, 3.3, 0.25, 1, 0.36, 1, { seg: 8 }).sph(0.75, ROM.pineD, -0.45, 3.32, -0.3, 1, 0.36, 1, { seg: 8 }).sph(0.6, ROM.pine, 0.2, 3.45, 0.1, 1, 0.4, 1, { seg: 7 });
  }, s);
}
// A cypress: a tall dark green spire. About 3.4 s high.
export function cypressInto(b, x, y, z, s = 1) {
  b.cyl(0.06 * s, 0.08 * s, 0.4 * s, ROM.bark, x, y + 0.2 * s, z, 0, 0, 0, { seg: 5 }).sph(0.42 * s, ROM.pineD, x, y + 0.8 * s, z, 1, 1.3, 1, { seg: 7 }).cone(0.4 * s, 2.7 * s, ROM.pineD, x, y + 2.05 * s, z, 0, 0, 0, { seg: 7 });
}
// A wall with a round-topped arch through it: w wide, h high and d thick, standing on (x, y, z) and facing +z. Each side of the
// opening is `pier` wide, and the round top springs from `spring` above the ground.
export function archWallInto(b, x, y, z, w, h, d, c, pier, spring, ry = 0, o) {
  const r = w / 2 - pier, s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-r, 0); s.lineTo(-r, spring); s.absarc(0, spring, r, PI, 0, true); s.lineTo(r, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 7 }); g.translate(0, 0, -d / 2);
  b.add(g, c, x, y, z, 0, ry, 0, 1, 1, 1, o);
}
// A soldier's tall red shield with a golden middle and wings, standing up and facing +z.
export function shieldInto(b, x, y, z, rx, ry, s = 1) {
  b.at(x, y, z, ry, () => {
    b.box(0.5, 0.82, 0.06, ROM.red, 0, 0.41 * Math.cos(rx), 0.41 * Math.sin(rx), rx, 0, 0).sph(0.1, ROM.gold, 0, 0.41 * Math.cos(rx) - 0.05 * Math.sin(rx), 0.41 * Math.sin(rx) + 0.05 * Math.cos(rx), 1, 1, 0.6, { seg: 6 });
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) { const u = 0.41 + sy * 0.2; b.box(0.16, 0.05, 0.02, ROM.gold, sx * 0.13, u * Math.cos(rx) - 0.035 * Math.sin(rx), u * Math.sin(rx) + 0.035 * Math.cos(rx), rx, 0, sx * sy * 0.5); }
    for (const sy of [0.03, 0.79]) b.box(0.5, 0.05, 0.07, ROM.gold, 0, sy * Math.cos(rx), sy * Math.sin(rx), rx, 0, 0);
  }, s);
}
// A bunch of grapes hanging down from (x, y, z), with a leaf at the top.
const grapesInto = (b, x, y, z, s = 1, c = ROM.grape) => {
  let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) { const a = i * 6.28 / (4 - r) + r; b.sph(0.065 * s, n++ % 3 ? c : 0x9a5ac0, x + Math.cos(a) * (0.11 - r * 0.03) * s, y - (0.05 + r * 0.09) * s, z + Math.sin(a) * (0.11 - r * 0.03) * s, 1, 1, 1, { seg: 5 }); }
  b.sph(0.1 * s, ROM.leaf, x + 0.06 * s, y + 0.02 * s, z, 1.2, 0.25, 1, { seg: 5 });
};
// A round loaf scored into wedges.
const loafInto = (b, x, y, z, r) => { b.sph(r, 0xd8a058, x, y, z, 1, 0.5, 1, { seg: 9 }); for (let i = 0; i < 4; i++) b.box(r * 1.8, 0.012, 0.02, 0xb88040, x, y + r * 0.47, z, 0, i * 0.785, 0); };
def('helmetPair', 'low', 1.4, 0.92, 1.0, (b) => {
  // two soldiers' helmets with red crests, polished and waiting on a bench
  b.box(1.24, 0.08, 0.56, ROM.bark, 0, 0.3, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, 0.28, 0.08, 0x7a4f30, sx * 0.52, 0.14, sz * 0.2);
  for (const sx of [-1, 1]) {
    const x = sx * 0.32;
    b.sph(0.23, ROM.bronze, x, 0.56, 0, 1, 0.95, 1.05, { seg: 10 }).cyl(0.245, 0.26, 0.06, ROM.gold, x, 0.45, 0, 0, 0, 0, { seg: 10 }).box(0.34, 0.04, 0.1, ROM.gold, x, 0.47, 0.25);
    for (const s2 of [-1, 1]) b.box(0.03, 0.2, 0.14, ROM.bronze, x + s2 * 0.22, 0.4, 0.1);
    for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; b.box(0.05, 0.18, 0.09, i % 2 ? ROM.red : ROM.redD, x, 0.56 + Math.cos(a) * 0.3, Math.sin(a) * 0.31, a, 0, 0); }
  }
  b.cyl(0.1, 0.1, 0.56, ROM.red, 0, 0.1, 0.4, 0, 0, PI / 2, { seg: 7 }).tor(0.1, 0.02, ROM.gold, 0, 0.1, 0.4, 0, PI / 2, 0, { seg: 7, tseg: 3 });
});
def('mosaicFountain', 'low', 1.4, 0.95, 1.3, (b) => {
  // a little fountain with a mosaic rim and a bronze fish spouting in the middle
  b.cyl(0.62, 0.66, 0.34, ROM.stone, 0, 0.17, 0, 0, 0, 0, { seg: 12, grad: 0.9 }).cyl(0.54, 0.54, 0.02, ROM.water, 0, 0.34, 0, 0, 0, 0, { seg: 12 }).tor(0.6, 0.05, ROM.stoneD, 0, 0.34, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 });
  for (let i = 0; i < 12; i++) { const a = i * 0.524; b.box(0.13, 0.13, 0.02, [ROM.red, ROM.gold, 0x2f6fd8, ROM.leaf][i % 4], Math.cos(a) * 0.655, 0.17, Math.sin(a) * 0.655, 0, -a + PI / 2, 0); }
  b.cyl(0.1, 0.14, 0.3, ROM.stone, 0, 0.49, 0, 0, 0, 0, { seg: 8 }).sph(0.14, ROM.bronze, 0, 0.7, 0, 0.8, 1.2, 0.8, { seg: 7 }).cone(0.1, 0.16, ROM.bronze, 0, 0.56, -0.02, PI, 0, 0, { seg: 4 }).sph(0.03, ROM.eye, 0.06, 0.74, 0.09, 1, 1, 1, { seg: 4 }).sph(0.03, ROM.eye, -0.06, 0.74, 0.09, 1, 1, 1, { seg: 4 });
  for (let i = 0; i < 5; i++) { const a = i * 1.257; for (let q = 1; q < 4; q++) b.sph(0.045 - q * 0.005, 0xd8f4ff, Math.cos(a) * q * 0.11, 0.86 - q * q * 0.045, Math.sin(a) * q * 0.11, 1, 1, 1, { seg: 4, glow: true }); }
});
def('grapeBowl', 'low', 1.4, 0.9, 1.0, (b) => {
  // a feast laid out: a big bronze bowl of grapes and figs, and a jug
  b.cyl(0.6, 0.6, 0.06, ROM.stone, 0, 0.36, 0, 0, 0, 0, { seg: 12 });
  for (let i = 0; i < 3; i++) b.cyl(0.04, 0.03, 0.36, ROM.bronze, Math.cos(i * 2.094 + 0.5) * 0.42, 0.17, Math.sin(i * 2.094 + 0.5) * 0.42, 0, 0, 0, { seg: 5 }).sph(0.05, ROM.bronze, Math.cos(i * 2.094 + 0.5) * 0.42, 0.03, Math.sin(i * 2.094 + 0.5) * 0.42, 1.2, 0.6, 1.2, { seg: 5 });
  b.cyl(0.36, 0.16, 0.2, ROM.bronze, -0.1, 0.49, 0, 0, 0, 0, { seg: 10 }).tor(0.36, 0.025, ROM.gold, -0.1, 0.59, 0, PI / 2, 0, 0, { seg: 10, tseg: 3 });
  grapesInto(b, -0.2, 0.76, 0.1, 1.1); grapesInto(b, 0.06, 0.72, -0.08, 1.0, 0x8fc85a); grapesInto(b, -0.3, 0.62, 0.36, 0.9);
  for (let i = 0; i < 3; i++) b.sph(0.08, i % 2 ? 0x6a3a6a : 0x9a4a7a, -0.3 + i * 0.16, 0.66, -0.16, 1, 1.15, 1, { seg: 5 });
  b.sph(0.14, ROM.roof, 0.38, 0.54, 0.06, 1, 1.15, 1, { seg: 8 }).cyl(0.05, 0.07, 0.16, ROM.roof, 0.38, 0.74, 0.06, 0, 0, 0, { seg: 6 }).tor(0.07, 0.016, ROM.roof, 0.47, 0.68, 0.06, 0, 0, 0, { seg: 6, tseg: 3 });
});
def('shieldStack', 'low', 1.4, 0.95, 1.0, (b) => {
  // three red shields leaning together, with a rolled cloak
  shieldInto(b, -0.3, 0, -0.05, -0.25, 0.25); shieldInto(b, 0.34, 0, -0.05, -0.25, -0.25); shieldInto(b, 0.02, 0, 0.2, -0.35, 0, 1.05);
  b.cyl(0.11, 0.11, 0.7, ROM.red, 0, 0.11, 0.34, 0, 0, PI / 2, { seg: 7 });
  for (const sx of [-1, 1]) b.tor(0.11, 0.02, ROM.gold, sx * 0.2, 0.11, 0.34, 0, PI / 2, 0, { seg: 7, tseg: 3 });
});
def('gooseGuards', 'low', 1.4, 0.98, 0.9, (b) => {
  // two geese in helmets, standing to attention
  gooseInto(b, -0.32, 0, 0, 0.84, { helmet: true, ry: 0.15 }); gooseInto(b, 0.32, 0, 0, 0.84, { helmet: true, ry: -0.15 });
  b.box(1.2, 0.03, 0.5, ROM.red, 0, 0.015, 0.02).box(1.2, 0.035, 0.06, ROM.gold, 0, 0.018, 0.26);
});
def('breadTray', 'low', 1.4, 0.85, 1.0, (b) => {
  // a baker's table: round loaves, a wheel of cheese and a jar of oil
  b.box(1.2, 0.08, 0.7, ROM.bark, 0, 0.4, 0).box(1.24, 0.03, 0.74, ROM.red, 0, 0.455, 0);
  for (const sx of [-1, 1]) b.box(0.1, 0.4, 0.6, 0x7a4f30, sx * 0.5, 0.2, 0);
  loafInto(b, -0.34, 0.54, 0.12, 0.2); loafInto(b, 0.02, 0.54, 0.14, 0.2); loafInto(b, -0.16, 0.68, 0.1, 0.18); loafInto(b, -0.3, 0.53, -0.2, 0.16);
  b.cyl(0.18, 0.18, 0.12, 0xf2d060, 0.36, 0.53, 0.16, 0, 0, 0, { seg: 10 }).cyl(0.12, 0.08, 0.26, ROM.roof, 0.34, 0.6, -0.18, 0, 0, 0, { seg: 7 }).cyl(0.06, 0.08, 0.08, ROM.roof, 0.34, 0.77, -0.18, 0, 0, 0, { seg: 6 });
});
def('eagleStandard', 'tall', 1.3, 2.9, 1.0, (b) => {
  // the army's golden eagle on a pole, with a red banner, and a goose to look after it
  b.cyl(0.26, 0.3, 0.16, ROM.stoneD, -0.12, 0.08, 0, 0, 0, 0, { seg: 8 }).cyl(0.035, 0.035, 2.3, ROM.bark, -0.12, 1.3, 0, 0, 0, 0, { seg: 5 });
  for (let i = 0; i < 3; i++) b.cyl(0.12, 0.12, 0.04, ROM.gold, -0.12, 1.0 + i * 0.22, 0.04, PI / 2, 0, 0, { seg: 9 });
  b.box(0.6, 0.5, 0.04, ROM.red, -0.12, 1.92, 0.04).box(0.64, 0.05, 0.05, ROM.gold, -0.12, 2.18, 0.04).tor(0.14, 0.03, ROM.gold, -0.12, 1.94, 0.07, 0, 0, 0, { seg: 9, tseg: 3 });
  for (let i = 0; i < 5; i++) b.cone(0.05, 0.12, ROM.gold, -0.36 + i * 0.12, 1.62, 0.04, PI, 0, 0, { seg: 3 });
  b.sph(0.15, ROM.gold, -0.12, 2.56, 0, 0.9, 1.1, 0.9, { seg: 8, grad: 0.85 }).sph(0.1, ROM.gold, -0.12, 2.76, 0.05, 1, 1, 1, { seg: 7 }).cone(0.035, 0.1, ROM.bronze, -0.12, 2.74, 0.16, PI * 0.6, 0, 0, { seg: 4 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.sph(0.16, i % 2 ? ROM.bronze : ROM.gold, -0.12 + sx * (0.2 + i * 0.13), 2.62 + i * 0.07, -0.02, 1, 0.9 - i * 0.2, 0.25, { seg: 6 });
  gooseInto(b, 0.34, 0, 0.1, 0.9, { helmet: true, ry: -0.2 });
});
def('victoryColumn', 'tall', 1.3, 2.9, 1.0, (b) => {
  // a tall column with a ribbon of pictures winding up it and a golden goose on top
  b.box(0.9, 0.36, 0.9, ROM.stoneD, 0, 0.18, 0, 0, 0, 0, { grad: 0.9 }).box(0.74, 0.1, 0.74, ROM.stone, 0, 0.41, 0).cyl(0.28, 0.31, 1.6, ROM.stone, 0, 1.26, 0, 0, 0, 0, { seg: 12, grad: 0.92 });
  for (let i = 0; i < 6; i++) b.tor(0.3, 0.03, ROM.bronze, 0, 0.62 + i * 0.26, 0, PI / 2 + 0.16, i * 1.1, 0, { seg: 12, tseg: 3 });
  for (let i = 0; i < 9; i++) b.sph(0.035, [ROM.red, ROM.gold, ROM.leaf][i % 3], Math.cos(i * 2.2) * 0.305, 0.62 + i * 0.16, Math.sin(i * 2.2) * 0.305, 1, 1, 1, { seg: 4 });
  b.cyl(0.38, 0.28, 0.14, ROM.stone, 0, 2.13, 0, 0, 0, 0, { seg: 12 }).box(0.72, 0.08, 0.72, ROM.stoneD, 0, 2.24, 0);
  gooseInto(b, 0, 2.28, -0.02, 0.62, { col: ROM.gold, wreath: true });
});
def('togaStatue', 'tall', 1.4, 2.8, 1.0, (b) => {
  // a marble goose in a purple sash and a wreath, making a speech
  b.box(0.95, 0.9, 0.85, ROM.stoneD, 0, 0.45, 0, 0, 0, 0, { grad: 0.88 }).box(1.06, 0.1, 0.96, ROM.stone, 0, 0.95, 0).box(1.06, 0.1, 0.96, ROM.stone, 0, 0.05, 0);
  b.tor(0.2, 0.04, ROM.gold, 0, 0.5, 0.44, 0, 0, 0, { seg: 10, tseg: 4 });
  for (let i = 0; i < 6; i++) b.sph(0.05, ROM.leaf, Math.cos(i * 1.047) * 0.2, 0.5 + Math.sin(i * 1.047) * 0.2, 0.46, 1.3, 0.7, 0.5, { seg: 4 });
  gooseInto(b, 0, 1.0, 0, 1.7, { col: ROM.stone, wreath: true, sash: true, wave: true });
});
def('pinePlanter', 'tall', 1.6, 3.0, 1.6, (b) => {
  // an umbrella pine in a round stone tub
  b.cyl(0.44, 0.36, 0.44, ROM.stone, 0, 0.22, 0, 0, 0, 0, { seg: 10, grad: 0.9 }).tor(0.44, 0.04, ROM.stoneD, 0, 0.44, 0, PI / 2, 0, 0, { seg: 10, tseg: 4 }).cyl(0.4, 0.4, 0.03, 0x6a4a30, 0, 0.44, 0, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 4; i++) b.box(0.16, 0.16, 0.02, i % 2 ? ROM.red : ROM.gold, Math.cos(i * 1.571 + 0.785) * 0.41, 0.24, Math.sin(i * 1.571 + 0.785) * 0.41, 0, -(i * 1.571 + 0.785) + PI / 2, 0);
  stonePineInto(b, -0.06, 0.4, 0, 0.7, 0.6);
});
def('archDoor', 'tall', 1.5, 2.8, 0.9, (b) => {
  // a brick archway with a little tiled roof, its green door shut and a wreath hung on it
  archWallInto(b, 0, 0, 0, 1.44, 2.5, 0.5, ROM.brick, 0.26, 1.4, 0, { grad: 0.9 });
  for (let i = 0; i < 5; i++) b.box(1.46, 0.02, 0.52, ROM.brickD, 0, 0.3 + i * 0.5, 0);
  b.box(1.56, 0.14, 0.62, ROM.stone, 0, 2.57, 0).prism(1.56, 0.2, 0.62, ROM.roof, 0, 2.64, 0, 0);
  b.box(0.92, 1.42, 0.1, 0x3f8a5a, 0, 0.71, 0.05).cyl(0.46, 0.46, 0.1, 0x3f8a5a, 0, 1.4, 0.05, PI / 2, 0, 0, { seg: 12 }).box(0.03, 1.8, 0.11, 0x2f6a44, 0, 0.9, 0.06).sph(0.05, ROM.gold, 0.12, 0.8, 0.12, 1, 1, 1, { seg: 5 }).sph(0.05, ROM.gold, -0.12, 0.8, 0.12, 1, 1, 1, { seg: 5 });
  b.tor(0.16, 0.04, ROM.leaf, 0, 1.4, 0.12, 0, 0, 0, { seg: 9, tseg: 4 }).sph(0.045, ROM.red, 0, 1.24, 0.14, 1, 1, 1, { seg: 4 });
});
def('chariotWheel', 'low', 1.2, 1.0, 1.0, (b) => {
  // a pair of chariot wheels that got away, rolling down the lane on their axle
  b.cyl(0.05, 0.05, 1.1, ROM.bark, 0, 0, 0, 0, 0, PI / 2, { seg: 6 });
  for (const sx of [-1, 1]) {
    b.tor(0.44, 0.06, ROM.red, sx * 0.4, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 5 }).tor(0.49, 0.025, ROM.gold, sx * 0.4, 0, 0, 0, PI / 2, 0, { seg: 14, tseg: 3 }).cyl(0.11, 0.11, 0.16, ROM.gold, sx * 0.4, 0, 0, 0, 0, PI / 2, { seg: 8 }).sph(0.07, ROM.gold, sx * 0.56, 0, 0, 1, 1, 1, { seg: 5 });
    for (let i = 0; i < 4; i++) b.box(0.05, 0.84, 0.05, i % 2 ? ROM.gold : ROM.bronze, sx * 0.4, 0, 0, i * 0.785, 0, 0);
  }
}, { center: true });
def('bigGrape', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the eagle drops: one enormous grape, rolling
  b.sph(0.4, ROM.grape, 0, 0, 0, 1, 1, 1, { seg: 12, grad: 0.85 }).sph(0.1, 0xb07ad0, 0.18, 0.24, 0.2, 1, 1, 1, { seg: 5 }).cyl(0.03, 0.03, 0.16, ROM.bark, 0, 0.44, 0, 0, 0, 0, { seg: 4 }).sph(0.16, ROM.leaf, 0.1, 0.46, 0, 1.3, 0.2, 0.9, { seg: 5 });
}, { center: true });
def('gooseChariot', 'low', 1.3, 0.98, 0.9, (b) => {
  // a goose out for a drive in a little red chariot pulled by two goslings; it faces +x
  b.box(0.5, 0.06, 0.52, ROM.bark, -0.22, 0.24, 0).box(0.06, 0.36, 0.56, ROM.red, 0.04, 0.44, 0).box(0.06, 0.06, 0.6, ROM.gold, 0.04, 0.64, 0).cyl(0.02, 0.02, 0.5, ROM.bark, 0.3, 0.22, 0, 0, 0, PI / 2 + 0.1, { seg: 4 });
  for (const sz of [-1, 1]) {
    b.box(0.5, 0.3, 0.05, ROM.red, -0.2, 0.42, sz * 0.27).box(0.5, 0.05, 0.06, ROM.gold, -0.2, 0.58, sz * 0.27);
    b.tor(0.2, 0.035, ROM.gold, -0.24, 0.22, sz * 0.34, 0, 0, 0, { seg: 10, tseg: 4 }).sph(0.05, ROM.gold, -0.24, 0.22, sz * 0.36, 1, 1, 1, { seg: 5 });
    for (let i = 0; i < 3; i++) b.box(0.03, 0.38, 0.02, ROM.bronze, -0.24, 0.22, sz * 0.34, 0, 0, i * 1.047);
    b.sph(0.1, 0xffe27a, 0.5, 0.14, sz * 0.14, 1.2, 1, 1, { seg: 6 }).sph(0.075, 0xffe27a, 0.58, 0.27, sz * 0.14, 1, 1, 1, { seg: 6 }).cone(0.03, 0.08, ROM.beak, 0.67, 0.26, sz * 0.14, 0, 0, -PI / 2, { seg: 4 }).sph(0.016, ROM.eye, 0.62, 0.3, sz * 0.14 + 0.055, 1, 1, 1, { seg: 4 }).sph(0.016, ROM.eye, 0.62, 0.3, sz * 0.14 - 0.055, 1, 1, 1, { seg: 4 });
  }
  gooseInto(b, -0.24, 0.27, 0, 0.58, { helmet: true, ry: PI / 2 });
});
def('aquila', 'deco', 2.2, 1.1, 1.4, (b) => {
  // a golden eagle in a laurel wreath, carrying an enormous grape
  const G = 0xd8a030, GL = 0xf2c860;
  b.sph(0.3, G, 0, 0, -0.05, 0.95, 0.85, 1.3, { seg: 9 }).sph(0.24, GL, 0, -0.08, 0.08, 0.85, 0.7, 1.1, { seg: 7 }).sph(0.21, GL, 0, 0.2, 0.4, 1, 0.95, 1, { seg: 8 });
  b.tor(0.17, 0.035, ROM.leaf, 0, 0.3, 0.38, PI / 2 - 0.3, 0, 0, { seg: 9, tseg: 4 }).cone(0.06, 0.16, ROM.beak, 0, 0.14, 0.62, PI * 0.65, 0, 0, { seg: 5 });
  for (const sx of [-1, 1]) b.sph(0.06, 0xffffff, sx * 0.1, 0.22, 0.56, 1, 1, 0.6, { seg: 5 }).sph(0.034, ROM.eye, sx * 0.1, 0.22, 0.59, 1, 1, 0.6, { seg: 4 }).sph(0.04, ROM.cheek, sx * 0.15, 0.14, 0.55, 0.7, 0.7, 0.6, { seg: 4 }).cyl(0.018, 0.018, 0.24, ROM.beak, sx * 0.1, -0.32, 0, 0, 0, sx * 0.25, { seg: 4 });
  for (let i = 0; i < 3; i++) b.box(0.12, 0.03, 0.34, i % 2 ? ROM.red : G, (i - 1) * 0.12, -0.04, -0.52, 0.1, (i - 1) * -0.25, 0);
  b.sph(0.17, ROM.grape, 0, -0.58, 0, 1, 1, 1, { seg: 8, grad: 0.85 }).sph(0.07, ROM.leaf, 0.05, -0.42, 0, 1.3, 0.25, 0.9, { seg: 5 });
}, {
  wings: (b, sx) => { for (let i = 0; i < 4; i++) b.sph(0.3 - i * 0.03, [0xd8a030, 0xf2c860, 0xd8a030, ROM.red][i], sx * (0.24 + i * 0.2), 0.02 - i * 0.01, -0.02 - i * 0.07, 1.1, 0.1, 0.62, { seg: 7 }); }, wingAt: [0.18, 0.08, -0.05],
});

// ---------- Izzi World ----------
// Izzi the border collie's own world: a sunny dog park with kennels, giant bones, tennis balls and a flock of sheep to round up.
export const IZ = { grass: 0x7cc850, grassL: 0x98d868, grassD: 0x5fae48, red: 0xe0483a, redD: 0xb8342c, blue: 0x3f7fd8, blueD: 0x2f5fa8, bone: 0xfff1d8, boneD: 0xe8d6b4, ball: 0xd8f03a, ballD: 0xb8d02a,
  fur: 0x2a2a33, furL: 0x41414f, white: 0xf7f5ef, eye: 0x1b1f24, iris: 0xa9652b, tongue: 0xf27c92, nose: 0x17171c, gold: 0xf2c230, wood: 0xc8964a, woodD: 0x9a6a3a, pink: 0xff8fb8, purple: 0x9a6fe0, acorn: 0xb8783a, cap: 0x7a4f2e };
// A cartoon bone: a shaft with two round knobs at each end, lying along x and `len` long.
export function boneInto(b, x, y, z, len, r, c = IZ.bone, ry = 0, rz = 0) {
  const cz = Math.cos(rz), sz = Math.sin(rz);
  b.at(x, y, z, ry, () => {
    b.cyl(r, r, len, c, 0, 0, 0, 0, 0, PI / 2 + rz, { seg: 10 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const u = sx * len / 2, v = sy * r * 0.95; b.sph(r * 1.45, c, u * cz - v * sz, u * sz + v * cz, 0, 1, 1, 1, { seg: 10 }); }
  });
}
// A tennis ball: fuzzy yellow-green with its white seam.
// (lo: a plainer one for far away, with fewer triangles)
export function tennisBallInto(b, x, y, z, r, ry = 0, lo = false) {
  b.sph(r, IZ.ball, x, y, z, 1, 1, 1, { seg: lo ? 7 : 12, grad: 0.85 });
  b.tor(r * 1.005, r * 0.05, 0xffffff, x, y, z, 0.5, ry, 0.9, { seg: lo ? 9 : 18, tseg: lo ? 2 : 3 });
  if (!lo) b.tor(r * 1.005, r * 0.05, 0xffffff, x, y, z, -0.5, ry + PI / 2, -0.9, { arc: PI * 1.1, seg: 12, tseg: 3 });
}
// A dog bowl of colour c, r across at the top, filled with kibble (or water, if o.water).
export function bowlInto(b, x, y, z, r, c, o = {}) {
  b.cyl(r, r * 1.15, r * 0.5, c, x, y + r * 0.25, z, 0, 0, 0, { seg: 14, grad: 0.85 }).tor(r, r * 0.08, c, x, y + r * 0.5, z, PI / 2, 0, 0, { seg: 14, tseg: 4 });
  if (o.water) b.cyl(r * 0.92, r * 0.92, 0.02, 0x8fd8f8, x, y + r * 0.44, z, 0, 0, 0, { seg: 14, glow: true, grad: 1 });
  else for (let i = 0; i < 9; i++) { const a = i * 2.4, q = Math.sqrt((i + 0.5) / 9) * r * 0.75; b.sph(r * 0.2, i % 2 ? 0xa86a3a : 0x8a5a30, x + Math.cos(a) * q, y + r * 0.5, z + Math.sin(a) * q, 1, 0.6, 1, { seg: 5 }); }
}
// A dog kennel facing +z, about 1.6 s high: walls of colour c, a blue roof, a round-topped doorway and a bone over the door.
export function kennelInto(b, x, y, z, s = 1, c = IZ.red, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.box(1.4, 1.0, 1.4, c, 0, 0.5, 0, 0, 0, 0, { grad: 0.85 }).box(1.5, 0.08, 1.5, IZ.woodD, 0, 0.04, 0);
    for (let i = 0; i < 4; i++) b.box(1.42, 0.02, 1.42, new THREE.Color(c).multiplyScalar(0.78).getHex(), 0, 0.22 + i * 0.22, 0);
    b.prism(1.7, 0.75, 1.65, IZ.blue, 0, 1.0, 0, 0).box(0.1, 0.1, 1.7, IZ.blueD, 0, 1.74, 0);
    b.box(0.6, 0.6, 0.04, 0x2a1d24, 0, 0.3, 0.7).cyl(0.3, 0.3, 0.04, 0x2a1d24, 0, 0.6, 0.7, PI / 2, 0, 0, { seg: 12 });
    boneInto(b, 0, 1.22, 0.8, 0.46, 0.06);
  }, s);
}
// Izzi herself, sitting up nicely and facing +z, about 1 s high: black and white, a white blaze, brown eyes, a red collar with a gold tag,
// and her tongue out. (She is built from simple shapes here so that she can be copied all over her world cheaply; the Izzi who runs
// with Robyn is in pets.js.)
export function izziInto(b, x, y, z, s = 1, o = {}) {
  const K = IZ.fur, W = IZ.white;
  b.at(x, y, z, o.ry || 0, () => {
    // body, sitting: haunches, a white chest and front legs with white socks
    b.sph(0.26, K, 0, 0.26, -0.08, 1.05, 0.95, 1.15, { seg: 10 }).sph(0.2, K, 0, 0.5, 0.0, 0.95, 1.2, 0.9, { seg: 10 }).sph(0.17, W, 0, 0.46, 0.12, 0.85, 1.2, 0.6, { seg: 9 });
    for (const sx of [-1, 1]) {
      b.sph(0.14, K, sx * 0.17, 0.16, -0.06, 0.8, 0.9, 1.3, { seg: 7 }).cyl(0.055, 0.06, 0.34, K, sx * 0.09, 0.2, 0.13, 0, 0, 0, { seg: 6 }).sph(0.065, W, sx * 0.09, 0.04, 0.17, 1, 0.65, 1.3, { seg: 6 });
    }
    // the plume of a tail, curled round her feet, with a white tip
    b.sph(0.1, K, 0.2, 0.06, 0.12, 1.4, 0.6, 0.8, { seg: 6 }).sph(0.07, W, 0.32, 0.05, 0.22, 1, 0.8, 1, { seg: 6 });
    // collar and tag
    b.tor(0.13, 0.025, C.red, 0, 0.66, 0.03, PI / 2 - 0.3, 0, 0, { seg: 12, tseg: 4 }).sph(0.035, IZ.gold, 0, 0.6, 0.16, 1, 1, 0.5, { seg: 6 });
    // head: black, with a white muzzle and blaze, pricked ears with floppy tips
    b.sph(0.17, K, 0, 0.84, 0.04, 1.08, 0.97, 1.0, { seg: 12 }).sph(0.1, W, 0, 0.78, 0.17, 1.05, 0.85, 1.1, { seg: 9 }).sph(0.04, W, 0, 0.92, 0.17, 0.7, 1.6, 0.6, { seg: 6 });
    b.sph(0.035, IZ.nose, 0, 0.81, 0.27, 1.25, 0.9, 0.9, { seg: 7 }).sph(0.04, IZ.tongue, 0, 0.71, 0.21, 0.9, 1.3, 0.5, { seg: 6 });
    for (const sx of [-1, 1]) {
      b.sph(0.038, 0xffffff, sx * 0.07, 0.87, 0.16, 1, 1.05, 0.6, { seg: 7 }).sph(0.026, o.eyes || IZ.iris, sx * 0.07, 0.87, 0.18, 1, 1.05, 0.5, { seg: 6, glow: !!o.eyes }).sph(0.012, 0xffffff, sx * 0.07 + 0.01, 0.885, 0.195, 1, 1, 0.5, { seg: 4 });
      b.cone(0.06, 0.15, K, sx * 0.1, 1.0, 0.0, 0.25, 0, -sx * 0.25, { seg: 6 }).sph(0.035, K, sx * 0.13, 1.06, 0.05, 1, 0.6, 1.2, { seg: 5 });
    }
  }, s);
}
// A paw print on the ground, s across: a pad and four toes.
export function pawPrintInto(b, x, y, z, s, c, ry = 0) {
  b.at(x, y, z, ry, () => {
    b.cyl(0.32, 0.32, 0.02, c, 0, 0, 0.05, 0, 0, 0, { seg: 10 });
    for (let i = 0; i < 4; i++) { const a = -0.95 + i * 0.63; b.cyl(0.13, 0.13, 0.02, c, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.45, 0, 0, 0, { seg: 8 }); }
  }, s);
}
// A tree clipped into a round ball, with tennis balls caught in it, about 3 s high.
export function ballTreeInto(b, x, y, z, s = 1, lo = false) {
  b.at(x, y, z, 0, () => {
    b.cyl(0.08, 0.12, 1.6, IZ.woodD, 0, 0.8, 0, 0, 0, 0, { seg: 6 }).sph(0.95, IZ.grassD, 0, 2.2, 0, 1, 0.95, 1, { seg: lo ? 9 : 12, grad: 0.75 }).sph(0.6, IZ.grass, 0.3, 2.6, 0.3, 1, 1, 1, { seg: lo ? 7 : 9 });
    for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, ph = Math.acos(0.7 - 1.2 * u), th = i * 2.4; tennisBallInto(b, Math.sin(ph) * Math.cos(th) * 0.98, 2.2 + Math.cos(ph) * 0.92, Math.sin(ph) * Math.sin(th) * 0.98, 0.13, th, lo); }
  }, s);
}

def('bigBone', 'low', 1.4, 0.72, 0.8, (b) => {
  // a giant bone that somebody left right across the lane
  boneInto(b, 0, 0.32, 0, 0.9, 0.17);
  b.sph(0.05, IZ.boneD, 0.1, 0.48, 0.1, 1.5, 0.3, 1, { seg: 5 }).sph(0.04, IZ.boneD, -0.2, 0.47, 0.06, 1.5, 0.3, 1, { seg: 5 });
});
def('dogBowls', 'low', 1.4, 0.62, 1.0, (b) => {
  // Izzi's dinner: a bowl of biscuits and a bowl of water on a mat
  b.box(1.36, 0.03, 0.8, IZ.blue, 0, 0.015, 0).box(1.2, 0.035, 0.64, 0x6fa8f0, 0, 0.02, 0);
  bowlInto(b, -0.34, 0.03, 0, 0.3, IZ.red); bowlInto(b, 0.34, 0.03, 0, 0.3, IZ.blue, { water: true });
  boneInto(b, -0.34, 0.24, 0.02, 0.22, 0.04, IZ.boneD, 0.6);
  pawPrintInto(b, 0.0, 0.04, 0.3, 0.16, 0xffffff);
});
def('ballBasket', 'low', 1.3, 0.95, 1.0, (b) => {
  // a wicker basket so full of tennis balls that they are spilling out
  b.cyl(0.5, 0.42, 0.55, IZ.wood, 0, 0.275, 0, 0, 0, 0, { seg: 14, grad: 0.85 });
  for (let i = 0; i < 3; i++) b.tor(0.47 - i * 0.03, 0.03, IZ.woodD, 0, 0.12 + i * 0.18, 0, PI / 2, 0, 0, { seg: 14, tseg: 3 });
  for (let i = 0; i < 8; i++) { const a = i * 2.4, q = i ? 0.3 : 0; tennisBallInto(b, Math.cos(a) * q, 0.6 + (i % 3) * 0.06 + (i ? 0 : 0.14), Math.sin(a) * q, 0.14, a); }
  tennisBallInto(b, 0.48, 0.14, 0.36, 0.14, 1); tennisBallInto(b, -0.5, 0.14, 0.3, 0.14, 2);
});
def('squeakyPile', 'low', 1.4, 0.8, 1.0, (b) => {
  // a heap of squeaky toys: a rubber duck, a rope to tug and a red ring
  b.sph(0.26, 0xffd23f, -0.3, 0.24, 0, 1.15, 0.9, 1, { seg: 10 }).sph(0.17, 0xffd23f, -0.3, 0.55, 0.12, 1, 1, 1, { seg: 9 }).cone(0.07, 0.14, 0xff8a1a, -0.3, 0.52, 0.32, PI / 2, 0, 0, { seg: 6 });
  for (const sx of [-1, 1]) b.sph(0.03, IZ.eye, -0.3 + sx * 0.07, 0.6, 0.27, 1, 1, 0.6, { seg: 5 });
  b.tor(0.2, 0.07, C.red, 0.32, 0.2, 0.1, 0.4, 0, 0, { seg: 14, tseg: 6 });
  for (let i = 0; i < 6; i++) b.sph(0.07, i % 2 ? 0x2f8fe0 : 0xffffff, -0.05 + i * 0.09, 0.07, -0.25 + Math.sin(i) * 0.05, 1.3, 1, 1, { seg: 6 });
  for (const sx of [-1, 1]) b.sph(0.1, sx > 0 ? 0x2f8fe0 : 0xffffff, 0.2 + sx * 0.33, 0.09, -0.25, 1, 1, 1, { seg: 6 });
});
def('dogBed', 'low', 1.4, 0.6, 1.1, (b) => {
  // a round squashy dog bed with a blanket and a chewed slipper in it
  b.tor(0.52, 0.18, IZ.purple, 0, 0.2, 0, PI / 2, 0, 0, { seg: 18, tseg: 8 }).cyl(0.52, 0.52, 0.16, 0xc8b0f0, 0, 0.1, 0, 0, 0, 0, { seg: 18 });
  b.box(0.6, 0.04, 0.5, 0xffffff, -0.08, 0.2, 0.04, 0, 0.4, 0.05);
  for (let i = 0; i < 4; i++) b.box(0.62, 0.045, 0.05, IZ.pink, -0.08, 0.205, -0.15 + i * 0.13, 0, 0.4, 0.05);
  b.sph(0.12, 0x8fd0f0, 0.2, 0.26, -0.05, 1.8, 0.6, 0.9, { seg: 8 }).sph(0.07, 0xffffff, 0.06, 0.3, -0.05, 1.2, 0.7, 1.1, { seg: 6 });
});
def('hurdleBar', 'low', 1.4, 0.95, 0.5, (b) => {
  // a jump from the agility course: two stripy posts and a bar
  for (const sx of [-1, 1]) {
    b.box(0.3, 0.06, 0.4, 0xffffff, sx * 0.6, 0.03, 0).cyl(0.04, 0.04, 0.9, 0xffffff, sx * 0.6, 0.48, 0, 0, 0, 0, { seg: 6 });
    for (let i = 0; i < 4; i++) b.cyl(0.042, 0.042, 0.1, i % 2 ? IZ.blue : IZ.red, sx * 0.6, 0.15 + i * 0.22, 0, 0, 0, 0, { seg: 6 });
    b.sph(0.06, IZ.gold, sx * 0.6, 0.95, 0, 1, 1, 1, { seg: 6 });
  }
  b.cyl(0.035, 0.035, 1.16, 0xffffff, 0, 0.62, 0, 0, 0, PI / 2, { seg: 6 });
  for (let i = 0; i < 6; i++) b.cyl(0.037, 0.037, 0.1, i % 2 ? IZ.red : IZ.blue, -0.5 + i * 0.2, 0.62, 0, 0, 0, PI / 2, { seg: 6 });
});
def('kennelTall', 'tall', 1.5, 2.8, 1.4, (b) => {
  // a big kennel with a weathervane in the shape of a bone
  kennelInto(b, 0, 0, 0, 1.05);
  b.cyl(0.025, 0.025, 0.9, IZ.gold, 0, 2.2, 0, 0, 0, 0, { seg: 4 });
  boneInto(b, 0, 2.62, 0, 0.3, 0.05, IZ.gold);
  b.sph(0.09, IZ.ball, 0.5, 0.09, 0.85, 1, 1, 1, { seg: 7 });
  izziInto(b, -0.45, 0, 0.75, 0.55, { ry: 0.3 });
});
def('izziStatue', 'tall', 1.4, 2.9, 1.0, (b) => {
  // a statue of Izzi on a plinth, with a rosette for Best in Show
  b.box(1.0, 1.0, 0.9, IZ.blue, 0, 0.5, 0, 0, 0, 0, { grad: 0.88 }).box(1.12, 0.1, 1.0, 0xffffff, 0, 1.05, 0).box(1.12, 0.1, 1.0, 0xffffff, 0, 0.05, 0);
  for (let i = 0; i < 10; i++) { const a = i * 0.628; b.sph(0.09, i % 2 ? IZ.red : IZ.gold, Math.cos(a) * 0.2, 0.55 + Math.sin(a) * 0.2, 0.46, 1, 1, 0.4, { seg: 5 }); }
  b.cyl(0.13, 0.13, 0.03, IZ.gold, 0, 0.55, 0.47, PI / 2, 0, 0, { seg: 10 });
  for (const sx of [-1, 1]) b.box(0.09, 0.3, 0.02, IZ.red, sx * 0.07, 0.26, 0.47, 0, 0, sx * 0.2);
  izziInto(b, 0, 1.1, 0, 1.7);
});
def('ballTree', 'tall', 1.5, 3.0, 1.5, (b) => {
  // a round little tree in a tub, full of lost tennis balls
  b.cyl(0.46, 0.38, 0.5, IZ.red, 0, 0.25, 0, 0, 0, 0, { seg: 12, grad: 0.88 }).tor(0.46, 0.05, IZ.redD, 0, 0.5, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 }).cyl(0.42, 0.42, 0.03, 0x6a4a30, 0, 0.5, 0, 0, 0, 0, { seg: 12 });
  for (let i = 0; i < 6; i++) pawPrintInto(b, Math.cos(i * 1.047) * 0.43, 0.27, Math.sin(i * 1.047) * 0.43, 0.1, 0xffffff, -(i * 1.047) + PI / 2);
  ballTreeInto(b, 0, 0.3, 0, 0.88);
});
def('boneTower', 'tall', 1.3, 2.9, 1.0, (b) => {
  // a giant bone standing on end in a stand, with a ribbon round it
  b.cyl(0.5, 0.56, 0.3, IZ.blue, 0, 0.15, 0, 0, 0, 0, { seg: 12, grad: 0.9 }).tor(0.5, 0.05, IZ.gold, 0, 0.3, 0, PI / 2, 0, 0, { seg: 12, tseg: 4 });
  b.cyl(0.17, 0.17, 2.0, IZ.bone, 0, 1.4, 0, 0, 0, 0, { seg: 10 });
  for (const sx of [-1, 1]) for (const y of [0.42, 2.38]) b.sph(0.26, IZ.bone, sx * 0.17, y, 0, 1, 1, 1, { seg: 10 });
  b.cyl(0.19, 0.19, 0.16, IZ.red, 0, 1.4, 0, 0, 0, 0, { seg: 10 });
  for (const sx of [-1, 1]) b.box(0.1, 0.4, 0.03, IZ.red, sx * 0.1, 1.2, 0.2, 0, 0, sx * 0.3);
});
def('treatJar', 'tall', 1.3, 2.8, 1.3, (b) => {
  // a giant jar of dog biscuits with a bone on the lid
  b.cyl(0.56, 0.56, 1.9, 0xd8f0ff, 0, 1.05, 0, 0, 0, 0, { seg: 16, glow: false, grad: 0.95 });
  for (let i = 0; i < 26; i++) { const a = i * 2.4, q = 0.2 + (i % 3) * 0.14; boneInto(b, Math.cos(a) * q, 0.3 + i * 0.055, Math.sin(a) * q + 0.15, 0.14, 0.035, i % 3 ? 0xc8803a : 0xa8602a, a, 0.3 * (i % 2)); }
  b.cyl(0.6, 0.6, 0.16, IZ.red, 0, 2.08, 0, 0, 0, 0, { seg: 16 }).cyl(0.62, 0.62, 0.12, IZ.red, 0, 0.06, 0, 0, 0, 0, { seg: 16 });
  boneInto(b, 0, 2.32, 0, 0.36, 0.08, IZ.bone);
  b.box(0.8, 0.36, 0.02, 0xffffff, 0, 1.2, 0.565).box(0.7, 0.26, 0.025, IZ.blue, 0, 1.2, 0.567);
  for (const sx of [-1, 1]) pawPrintInto(b, sx * 0.2, 1.2, 0.585, 0.12, 0xffffff, 0);
});
def('rollTennis', 'low', 1.0, 1.0, 1.0, (b) => {
  // an enormous tennis ball bowling down the lane
  tennisBallInto(b, 0, 0, 0, 0.45);
}, { center: true });
def('sheepTrot', 'low', 1.2, 0.98, 0.9, (b) => {
  // a sheep that has wandered off, hurrying back across to the flock; it faces +x
  sheepInto(b, 0, 0, 0, 1.0);
  b.tor(0.09, 0.025, C.red, 0.38, 0.52, 0, 0, PI / 2, 0, { seg: 8, tseg: 3 }).sph(0.05, IZ.gold, 0.44, 0.44, 0, 1, 1, 1, { seg: 5 });
});
def('bigAcorn', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the squirrel drops: an acorn the size of a football, rolling
  b.sph(0.36, IZ.acorn, 0, -0.05, 0, 1, 1.1, 1, { seg: 12, grad: 0.85 }).sph(0.38, IZ.cap, 0, 0.17, 0, 1, 0.55, 1, { seg: 10 }).cyl(0.04, 0.05, 0.16, IZ.cap, 0, 0.42, 0, 0, 0, 0.3, { seg: 5 });
  for (let i = 0; i < 8; i++) b.sph(0.06, 0x5a3a20, Math.cos(i * 0.785) * 0.3, 0.22, Math.sin(i * 0.785) * 0.3, 1, 0.6, 1, { seg: 4 });
}, { center: true });
def('flySquirrel', 'deco', 2.2, 1.1, 1.4, (b) => {
  // a cheeky flying squirrel in goggles, carrying an acorn to drop
  const F = 0xc8783a, FL = 0xf0c890;
  b.sph(0.28, F, 0, 0, -0.05, 0.95, 0.75, 1.3, { seg: 9 }).sph(0.22, FL, 0, -0.1, 0.06, 0.8, 0.55, 1.1, { seg: 7 }).sph(0.21, F, 0, 0.14, 0.4, 1.05, 0.95, 1, { seg: 9 });
  b.sph(0.12, FL, 0, 0.08, 0.56, 1.1, 0.8, 0.8, { seg: 7 }).sph(0.035, 0x2a1d14, 0, 0.12, 0.65, 1.2, 1, 1, { seg: 5 }).box(0.07, 0.06, 0.02, 0xffffff, 0, 0.0, 0.62);
  for (const sx of [-1, 1]) {
    b.cone(0.07, 0.16, F, sx * 0.13, 0.34, 0.36, 0, 0, -sx * 0.3, { seg: 5 }).sph(0.04, FL, sx * 0.13, 0.33, 0.39, 1, 1.3, 0.5, { seg: 4 });
    b.tor(0.055, 0.016, 0x3a3a44, sx * 0.08, 0.22, 0.58, 0, 0, 0, { seg: 8, tseg: 3 }).cyl(0.05, 0.05, 0.02, 0x8fe0ff, sx * 0.08, 0.22, 0.585, PI / 2, 0, 0, { seg: 8, glow: true });
    b.sph(0.035, IZ.pink, sx * 0.14, 0.06, 0.55, 1, 0.7, 0.5, { seg: 4 });
  }
  b.box(0.26, 0.03, 0.03, 0x3a3a44, 0, 0.22, 0.5);
  // the big bushy tail, curling up behind
  for (let i = 0; i < 5; i++) b.sph(0.17 - i * 0.012, i % 2 ? F : 0xd8884a, 0, 0.05 + i * 0.12, -0.42 - Math.sin(i * 0.6) * 0.18, 1, 1, 1.1, { seg: 7 });
  bigAcornMini(b);
}, {
  wings: (b, sx) => { b.sph(0.36, 0xc8783a, sx * 0.34, 0, 0, 1.2, 0.07, 0.75, { seg: 9 }); b.sph(0.3, 0xf0c890, sx * 0.34, -0.012, 0, 1.05, 0.06, 0.62, { seg: 8 }); b.sph(0.06, 0xf0c890, sx * 0.72, -0.01, 0.2, 1, 0.6, 1, { seg: 5 }); }, wingAt: [0.18, 0.04, 0],
});
function bigAcornMini(b) { b.sph(0.13, IZ.acorn, 0, -0.33, 0.2, 1, 1.1, 1, { seg: 8 }).sph(0.14, IZ.cap, 0, -0.25, 0.2, 1, 0.55, 1, { seg: 7 }); }

// ---------- movers ----------
def('crab', 'low', 1.5, 0.95, 1.0, (b) => {
  // a giant crab that scuttles from side to side; it faces the player
  const R = 0xe8492f, D = 0xb9331f;
  b.sph(0.5, R, 0, 0.5, 0, 1.2, 0.6, 0.92, { seg: 14 }).sph(0.42, 0xf5b49a, 0, 0.4, 0.06, 1.15, 0.42, 0.9, { seg: 10 });
  for (let i = 0; i < 5; i++) b.sph(0.06, D, -0.3 + i * 0.15, 0.76 - Math.abs(i - 2) * 0.03, -0.1 + (i % 2) * 0.16, 1, 0.4, 1, { seg: 6 });
  b.tor(0.12, 0.016, 0x7a1f14, 0, 0.46, 0.43, 0.1, 0, PI, { arc: PI, seg: 8 });
  for (const sx of [-1, 1]) {
    b.cyl(0.028, 0.028, 0.2, D, sx * 0.16, 0.84, 0.3).sph(0.075, 0xffffff, sx * 0.16, 0.96, 0.3, 1, 1, 1, { grad: 1 }).sph(0.04, 0x1b1f24, sx * 0.16, 0.965, 0.36, 1, 1, 0.5, { grad: 1 });
    b.cap(0.06, 0.2, R, sx * 0.55, 0.64, 0.3, 0, 0, sx * -0.7);                       // claw arm
    b.sph(0.17, R, sx * 0.62, 0.9, 0.34, 1, 1.25, 0.8, { seg: 10 });                   // claw
    b.cone(0.07, 0.24, D, sx * 0.57, 1.08, 0.34, 0, 0, sx * 0.25, { seg: 6 }).cone(0.055, 0.2, D, sx * 0.7, 1.04, 0.34, 0, 0, sx * -0.45, { seg: 6 });
    for (let i = 0; i < 3; i++) { const z = -0.3 + i * 0.2; b.cap(0.04, 0.2, D, sx * 0.56, 0.36, z, 0, 0, sx * -1.05).cap(0.03, 0.2, D, sx * 0.7, 0.16, z, 0, 0, sx * 0.3); }
  }
}, { zap: true });
def('penguin', 'low', 1.15, 0.98, 1.0, (b) => {
  // waddles across the lanes; built facing +x
  const K = 0x1f2933, W = 0xf6f8fb;
  b.sph(0.34, K, 0, 0.44, 0, 0.92, 1.25, 0.95, { seg: 14 }).sph(0.27, W, 0.15, 0.4, 0, 0.85, 1.18, 0.9, { seg: 12 });
  b.sph(0.22, K, 0.03, 0.9, 0, 1, 1, 1, { seg: 12 }).sph(0.14, W, 0.17, 0.86, 0, 0.65, 0.8, 1.15, { seg: 10 });
  b.cone(0.06, 0.2, C.orange, 0.3, 0.87, 0, 0, 0, -PI / 2, { seg: 6 });
  for (const sz of [-1, 1]) {
    b.sph(0.05, W, 0.13, 0.96, sz * 0.18, 1, 1, 0.5, { seg: 7, grad: 1 }).sph(0.024, K, 0.14, 0.96, sz * 0.2, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.sph(0.2, K, -0.02, 0.5, sz * 0.33, 0.35, 1.2, 0.3, { seg: 8 });                 // flippers
    b.sph(0.11, C.orange, 0.1, 0.04, sz * 0.14, 1.5, 0.4, 0.9, { seg: 8 });           // feet
  }
  b.tor(0.2, 0.05, C.red, 0.03, 0.74, 0, PI / 2, 0, 0, { seg: 12 }).box(0.08, 0.26, 0.05, C.red, 0.06, 0.6, 0.2, 0.2, 0, 0);
});
def('beachball', 'low', 1.1, 1.0, 1.0, (b) => {
  const cols = [C.red, C.yellow, C.blue, C.white, C.green, C.orange];
  b.add(new THREE.SphereGeometry(0.5, 18, 12), (x, y, z) => (Math.abs(x) > 0.44 ? C.white : cols[Math.floor(((Math.atan2(z, y) + PI) / (PI * 2)) * 6) % 6]), 0, 0, 0, 0, 0, 0, 1, 1, 1, { grad: 1 });
}, { center: true });
def('snowball', 'low', 1.15, 1.0, 1.0, (b) => {
  b.sph(0.5, 0xf4f8ff, 0, 0, 0, 1, 1, 1, { seg: 12, grad: 0.9 });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, c = Math.cos(i * 1.7); b.sph(0.1, i % 2 ? 0xdbe6f4 : 0xffffff, Math.sin(i * 1.7) * 0.43, Math.cos(a) * 0.43 * Math.abs(c), Math.sin(a) * 0.43 * Math.abs(c), 1, 1, 1, { seg: 6, grad: 1 }); }
}, { center: true });
def('barrel', 'low', 1.45, 1.0, 1.0, (b) => {
  // lies across the lane, centred on its axle so it can spin
  b.cyl(0.5, 0.42, 0.68, C.wood, 0.34, 0, 0, 0, 0, PI / 2, { seg: 16, grad: 1 }).cyl(0.42, 0.5, 0.68, C.wood, -0.34, 0, 0, 0, 0, PI / 2, { seg: 16, grad: 1 });
  for (const x of [-0.56, -0.2, 0.2, 0.56]) { const r = 0.5 - Math.abs(x) * 0.118 + 0.012; b.cyl(r, r, 0.07, C.iron, x, 0, 0, 0, 0, PI / 2, { seg: 16, grad: 1 }); }
  for (const sx of [-1, 1]) {
    b.cyl(0.38, 0.38, 0.03, C.woodDark, sx * 0.67, 0, 0, 0, 0, PI / 2, { seg: 16, grad: 1 });
    b.box(0.02, 0.7, 0.05, C.woodDeep, sx * 0.69, 0, 0, 0, 0, 0, { grad: 1 }).box(0.02, 0.05, 0.7, C.woodDeep, sx * 0.69, 0, 0, 0, 0, 0, { grad: 1 });
  }
  for (let a = 0; a < 8; a++) b.box(1.3, 0.012, 0.02, C.woodDark, 0, Math.sin(a * PI / 4) * 0.478, Math.cos(a * PI / 4) * 0.478, a * -PI / 4, 0, 0, { grad: 1 });
}, { center: true });
def('trolley', 'low', 1.5, 0.98, 1.15, (b) => {
  b.box(1.4, 0.07, 1.0, C.steel, 0, 0.3, 0).box(1.44, 0.05, 0.06, C.red, 0, 0.32, 0.5).box(1.44, 0.05, 0.06, C.red, 0, 0.32, -0.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.cyl(0.13, 0.13, 0.07, C.rubber, sx * 0.55, 0.13, sz * 0.38, PI / 2, 0, 0, { seg: 10 }); b.box(0.05, 0.14, 0.05, C.iron, sx * 0.55, 0.22, sz * 0.38); }
  for (const sz of [-1, 1]) b.cyl(0.025, 0.025, 0.72, C.red, -0.68, 0.66, sz * 0.4);
  b.cyl(0.03, 0.03, 0.86, C.red, -0.68, 1.0, 0, PI / 2, 0, 0);
  b.at(0.2, 0.34, 0.12, 0.1, () => { b.box(0.8, 0.32, 0.5, 0x8a5a3c, 0, 0.16, 0); b.box(0.82, 0.04, 0.52, C.woodDeep, 0, 0.16, 0); b.box(0.16, 0.05, 0.03, C.gold, 0, 0.2, 0.26); });
  b.at(0.25, 0.67, 0.05, -0.2, () => { b.box(0.6, 0.24, 0.4, C.teal, 0, 0.12, 0); b.box(0.62, 0.03, 0.42, C.navy, 0, 0.12, 0); });
  b.at(-0.3, 0.34, -0.2, 0, () => barrelInto(b, 0.17, 0.42, C.yellow, C.iron));
});

// ---------- the sewers: giant rats, pipes and slime ----------
const RAT = 0x9a9186, RAT_D = 0x756c61, RAT_P = 0xf5a9b0, RAT_W = 0xe4ddd2;
// A giant cartoon rat, built facing +z (toward the player). sit: up on its haunches, otherwise on all fours.
export function ratInto(b, sit, s = 1, x = 0, y = 0, z = 0, ry = 0) {
  b.at(x, y, z, ry, () => {
    const head = (hy, hz) => {
      b.sph(0.32, RAT, 0, hy, hz, 1, 0.95, 1.02, { seg: 12 });
      b.cone(0.21, 0.4, RAT, 0, hy - 0.07, hz + 0.36, PI / 2, 0, 0, { seg: 10 });                         // snout
      b.sph(0.075, RAT_P, 0, hy - 0.07, hz + 0.56, 1, 0.9, 0.9, { seg: 8 });                               // nose
      b.box(0.1, 0.11, 0.03, 0xffffff, 0, hy - 0.2, hz + 0.44, 0.2, 0, 0).box(0.012, 0.11, 0.035, 0xc9c9c9, 0, hy - 0.2, hz + 0.445, 0.2, 0, 0);   // buck teeth
      for (const sx of [-1, 1]) {
        b.cyl(0.2, 0.2, 0.05, RAT_D, sx * 0.27, hy + 0.3, hz - 0.06, PI / 2, sx * 0.25, 0, { seg: 12 });    // big round ears
        b.cyl(0.14, 0.14, 0.055, RAT_P, sx * 0.265, hy + 0.3, hz - 0.045, PI / 2, sx * 0.25, 0, { seg: 12 });
        b.sph(0.075, 0xffffff, sx * 0.13, hy + 0.1, hz + 0.25, 1, 1.1, 0.7, { seg: 8, grad: 1 });           // cheeky eyes
        b.sph(0.04, 0x1b1f24, sx * 0.125, hy + 0.09, hz + 0.3, 1, 1, 0.6, { seg: 6, grad: 1 });
        b.box(0.34, 0.012, 0.012, 0xf2f2f2, sx * 0.24, hy - 0.06, hz + 0.47, 0, sx * -0.35, sx * 0.1);     // whiskers
        b.box(0.32, 0.012, 0.012, 0xf2f2f2, sx * 0.23, hy - 0.11, hz + 0.47, 0, sx * -0.35, sx * -0.18);
      }
    };
    if (sit) {
      b.sph(0.46, RAT, 0, 0.6, -0.05, 1.0, 1.28, 0.95, { seg: 12 });
      b.sph(0.34, RAT_W, 0, 0.58, 0.19, 0.85, 1.25, 0.6, { seg: 10 });                                     // pale tummy
      head(1.4, 0.06);
      for (const sx of [-1, 1]) {
        b.cap(0.075, 0.2, RAT, sx * 0.36, 0.95, 0.22, 1.0, 0, sx * -0.3).sph(0.085, RAT_P, sx * 0.33, 0.86, 0.42, 1, 0.8, 1, { seg: 7 });   // arms and paws
        b.sph(0.13, RAT_P, sx * 0.27, 0.07, 0.3, 0.9, 0.5, 1.7, { seg: 8 });                                // feet
        b.sph(0.2, RAT, sx * 0.3, 0.26, 0.05, 1, 1.1, 1.3, { seg: 8 });                                     // haunches
      }
      b.tor(0.46, 0.05, RAT_P, 0.2, 0.06, -0.42, PI / 2, 0, 0.6, { arc: PI * 1.25, seg: 14 });             // tail curled on the floor
    } else {
      b.sph(0.4, RAT, 0, 0.45, -0.28, 1.0, 0.95, 1.45, { seg: 12 });
      b.sph(0.3, RAT_W, 0, 0.33, -0.2, 0.9, 0.6, 1.5, { seg: 9 });
      head(0.52, 0.36);
      for (const sx of [-1, 1]) for (const fz of [0.12, -0.6]) b.sph(0.11, RAT_P, sx * 0.3, 0.06, fz, 0.9, 0.5, 1.6, { seg: 7 }).sph(0.15, RAT, sx * 0.3, 0.22, fz - 0.06, 0.9, 1.1, 1.0, { seg: 7 });
      b.tor(0.34, 0.045, RAT_P, 0.25, 0.3, -0.86, 0, -0.5, 0, { arc: PI * 1.1, seg: 12 });                 // tail curling up behind
    }
  }, s);
}
def('ratBig', 'tall', 1.5, 2.6, 1.4, (b) => ratInto(b, true, 1.44, 0, 0, -0.1), { rat: true });
def('rat', 'low', 1.3, 0.92, 1.3, (b) => ratInto(b, false, 0.92, 0, 0, -0.1), { rat: true });
// a rat that scurries across the lanes; built facing +x like the other movers
def('ratRun', 'low', 1.5, 0.92, 1.0, (b) => ratInto(b, false, 0.9, -0.1, 0, 0, PI / 2), { rat: true });
// a rat that charges straight down its lane at Robyn
def('ratCharge', 'low', 1.0, 0.92, 1.5, (b) => ratInto(b, false, 0.9, 0, 0, 0.1, 0), { rat: true });
const PIPE = 0x9c9e96, PIPE_D = 0x777a72, RUST = 0x9a5a36, SLIME = 0x8dff5a;
def('pipeStack', 'tall', 1.7, 2.75, 1.5, (b) => {
  // concrete pipe sections stacked in a pyramid, with a small rat keeping watch on top
  const ring = (x, y) => {
    b.cyl(0.5, 0.5, 1.4, PIPE, x, y, 0, PI / 2, 0, 0, { seg: 14 }).cyl(0.4, 0.4, 1.42, 0x1f2326, x, y, 0, PI / 2, 0, 0, { seg: 12, grad: 1 });
    b.tor(0.5, 0.045, PIPE_D, x, y, 0.66, 0, 0, 0, { seg: 14 }).tor(0.5, 0.045, PIPE_D, x, y, -0.66, 0, 0, 0, { seg: 14 });
  };
  ring(-0.42, 0.5); ring(0.42, 0.5); ring(0, 1.37);
  for (const sx of [-1, 1]) b.box(0.16, 0.14, 1.3, C.woodDark, sx * 0.86, 0.07, 0);                        // chocks
  b.sph(0.1, SLIME, 0.42, 0.14, 0.72, 1.4, 0.5, 1, { glow: true, seg: 7, grad: 0.8 });                     // a drip of slime
  ratInto(b, true, 0.5, 0.05, 1.86, 0.1, 0.3);
});
def('valve', 'tall', 1.5, 2.8, 1.3, (b) => {
  const G = 0x4f8a5c, G2 = 0x3d6f49;
  b.cyl(0.5, 0.56, 0.16, C.iron, 0, 0.08, 0, 0, 0, 0, { seg: 12 }).cyl(0.3, 0.3, 2.2, G, 0, 1.2, 0, 0, 0, 0, { seg: 12 });
  for (const y of [0.5, 1.9]) b.cyl(0.36, 0.36, 0.1, G2, 0, y, 0, 0, 0, 0, { seg: 12 });
  b.cyl(0.26, 0.26, 1.46, G, 0, 2.42, 0, 0, 0, PI / 2, { seg: 12 });                                       // T-piece across the top
  for (const sx of [-1, 1]) b.cyl(0.32, 0.32, 0.1, G2, sx * 0.7, 2.42, 0, 0, 0, PI / 2, { seg: 12 }).sph(0.07, SLIME, sx * 0.72, 2.1, 0, 1, 1.6, 1, { glow: true, seg: 6, grad: 0.8 });
  // the big red wheel
  b.cyl(0.05, 0.05, 0.34, C.iron, 0, 1.25, 0.42, PI / 2, 0, 0, { seg: 8 });
  b.tor(0.42, 0.05, C.red, 0, 1.25, 0.6, 0, 0, 0, { seg: 18 }).sph(0.09, C.red, 0, 1.25, 0.6, 1, 1, 0.8, { seg: 8 });
  for (let i = 0; i < 4; i++) b.box(0.8, 0.045, 0.045, C.red, 0, 1.25, 0.6, 0, 0, i * PI / 4);
  // a pressure gauge
  b.cyl(0.03, 0.03, 0.2, C.gold, 0.3, 0.72, 0.2, 0, 0, -0.9).cyl(0.14, 0.14, 0.06, C.gold, 0.42, 0.82, 0.24, PI / 2, 0, 0, { seg: 12 }).cyl(0.11, 0.11, 0.065, 0xfdf6ea, 0.42, 0.82, 0.245, PI / 2, 0, 0, { seg: 12 });
  b.box(0.012, 0.09, 0.01, C.red, 0.44, 0.85, 0.28, 0, 0, -0.6);
  b.box(0.5, 0.36, 0.03, C.yellow, -0.02, 0.36, 0.31, 0, 0, 0.04).box(0.4, 0.07, 0.035, 0x1b1f24, -0.02, 0.4, 0.315, 0, 0, 0.04).box(0.4, 0.07, 0.035, 0x1b1f24, -0.02, 0.28, 0.315, 0, 0, 0.04);
});
def('slimeTank', 'tall', 1.5, 2.75, 1.5, (b) => {
  b.cyl(0.74, 0.8, 0.22, C.iron, 0, 0.11, 0, 0, 0, 0, { seg: 14 }).cyl(0.66, 0.66, 0.5, 0x5b6770, 0, 0.47, 0, 0, 0, 0, { seg: 14 });
  b.cyl(0.62, 0.62, 1.1, SLIME, 0, 1.27, 0, 0, 0, 0, { seg: 14, glow: true, grad: 0.55 });               // the glowing slime behind glass
  for (const y of [0.74, 1.82]) b.cyl(0.67, 0.67, 0.09, C.iron, 0, y, 0, 0, 0, 0, { seg: 14 });
  for (let a = 0; a < 6; a++) b.box(0.07, 1.1, 0.07, C.iron, Math.sin(a * 1.047) * 0.65, 1.27, Math.cos(a * 1.047) * 0.65, 0, a * 1.047, 0);
  b.cyl(0.66, 0.66, 0.4, 0x5b6770, 0, 2.06, 0, 0, 0, 0, { seg: 14 }).dome(0.66, 0x6c7983, 0, 2.26, 0, 0, 0, 0, 1, 0.55, 1, { seg: 14 });
  b.add(new THREE.CylinderGeometry(0.672, 0.672, 0.16, 16, 1, true), (x, y, z) => (Math.floor((Math.atan2(z, x) + PI) * 3.2) % 2 ? C.yellow : 0x1b1f24), 0, 2.02, 0, 0, 0, 0, 1, 1, 1, { grad: 1 });
  b.cyl(0.09, 0.09, 0.3, C.iron, 0, 2.7, 0, 0, 0, 0, { seg: 8 });
  for (let i = 0; i < 5; i++) b.sph(0.07 + (i % 3) * 0.03, 0xc8ff9a, Math.sin(i * 2.2) * 0.4, 1.0 + i * 0.16, Math.cos(i * 2.2) * 0.45, 1, 1, 1, { glow: true, seg: 6, grad: 1 });   // bubbles
  b.sph(0.22, SLIME, 0.5, 0.04, 0.7, 1.5, 0.3, 1, { glow: true, seg: 8, grad: 0.8 });
});
def('pipeLow', 'low', 1.7, 0.86, 1.0, (b) => {
  // a fat pipe lying across the lane
  b.cyl(0.36, 0.36, 1.6, RUST, 0, 0.4, 0, 0, 0, PI / 2, { seg: 14 });
  for (const x of [-0.8, 0, 0.8]) b.cyl(0.44, 0.44, 0.1, x ? PIPE_D : 0x7a4628, x, 0.4, 0, 0, 0, PI / 2, { seg: 14 });
  for (const x of [-0.8, 0.8]) for (let a = 0; a < 6; a++) b.sph(0.035, C.iron, x + Math.sign(x) * 0.06, 0.4 + Math.sin(a * 1.047) * 0.39, Math.cos(a * 1.047) * 0.39, 1, 1, 1, { seg: 5 });
  for (const x of [-0.45, 0.45]) b.box(0.2, 0.12, 0.7, C.iron, x, 0.06, 0);
  b.cyl(0.035, 0.035, 0.22, C.iron, 0.3, 0.84, 0, 0, 0, 0, { seg: 6 }).tor(0.14, 0.03, C.red, 0.3, 0.96, 0, PI / 2, 0, 0, { seg: 12 });
  b.sph(0.2, SLIME, -0.35, 0.03, 0.42, 1.4, 0.25, 1, { glow: true, seg: 8, grad: 0.8 }).sph(0.05, SLIME, -0.35, 0.2, 0.34, 1, 1.8, 1, { glow: true, seg: 6, grad: 0.8 });
});

// ---------- space pier: asteroids, a toy rocket, a radar dish, aliens and UFOs ----------
const ROCK_S = [0x7c7896, 0x8f8aa8, 0x6a6684], ALIEN = 0x7be07a, ALIEN_D = 0x4fb85a;
const crater = (b, x, y, z, r, rx, rz) => b.cyl(r, r * 0.8, 0.06, 0x56526e, x, y, z, rx, 0, rz, { seg: 8 }).tor(r, r * 0.16, 0xa7a2c0, x, y, z, PI / 2 + rx, 0, rz, { seg: 10 });
export function alienInto(b, x, y, z, ry, s = 1, wave = true) {
  b.at(x, y, z, ry, () => {
    b.sph(0.26, 0x7a4fd0, 0, 0.42, 0, 1, 1.15, 0.9, { seg: 10 });                                           // purple space suit
    b.sph(0.3, ALIEN, 0, 0.98, 0, 1.15, 0.95, 1, { seg: 12 });                                              // big head
    for (const sx of [-1, 1]) {
      b.sph(0.1, 0x15151f, sx * 0.13, 1.0, 0.22, 0.9, 1.25, 0.6, { seg: 8, grad: 1 }).sph(0.03, 0xffffff, sx * 0.15, 1.05, 0.28, 1, 1, 0.6, { seg: 5, grad: 1 });   // huge dark eyes
      b.cyl(0.015, 0.015, 0.26, ALIEN_D, sx * 0.14, 1.36, 0, 0, 0, sx * -0.3, { seg: 5 }).sph(0.05, 0xffe27a, sx * 0.18, 1.5, 0, 1, 1, 1, { glow: true, seg: 6, grad: 1 });   // antennae
      b.sph(0.1, 0x5a3aa8, sx * 0.13, 0.07, 0.04, 1, 0.6, 1.4, { seg: 7 });                                  // boots
      if (wave && sx > 0) b.cap(0.05, 0.22, ALIEN, 0.36, 0.72, 0, 0, 0, -0.9).sph(0.07, ALIEN, 0.5, 0.86, 0, 1, 1, 1, { seg: 6 });
      else b.cap(0.05, 0.2, ALIEN, sx * 0.3, 0.42, 0.02, 0, 0, sx * 0.35);
    }
    b.tor(0.07, 0.014, 0x2a6b3a, 0, 0.84, 0.25, 0.2, 0, PI, { arc: PI, seg: 8 });                           // smile
    b.tor(0.2, 0.04, 0xffc928, 0, 0.68, 0, PI / 2, 0, 0, { seg: 12 });
  }, s);
}
def('asteroid', 'tall', 1.7, 2.7, 1.7, (b) => {
  b.add(new THREE.DodecahedronGeometry(1, 1), ROCK_S[0], 0, 1.3, 0, 0.3, 0.5, 0.2, 0.84, 1.3, 0.84);
  b.add(new THREE.DodecahedronGeometry(1), ROCK_S[1], 0.45, 0.4, 0.4, 1, 2, 0, 0.5, 0.42, 0.5).add(new THREE.DodecahedronGeometry(1), ROCK_S[2], -0.5, 0.35, -0.3, 2, 1, 0, 0.45, 0.38, 0.45);
  crater(b, -0.2, 1.75, 0.72, 0.26, PI / 2 - 0.15, 0); crater(b, 0.42, 1.0, 0.7, 0.18, PI / 2 + 0.2, 0); crater(b, 0.1, 2.5, 0.25, 0.2, 0.5, 0);
  crystalInto(b, 0.55, 1.7, 0.3, 0.55, 0x58e6ff, -0.7, 0.4); crystalInto(b, -0.6, 1.1, 0.4, 0.45, 0xff7ad9, 0.8, 0); crystalInto(b, 0.1, 2.5, -0.1, 0.5, 0xb99bff, 0.2, 1);
});
def('rocketOb', 'tall', 1.5, 3.1, 1.5, (b) => {
  // a little rocket parked on its fins
  b.cyl(0.42, 0.36, 1.5, 0xf4f1ea, 0, 1.45, 0, 0, 0, 0, { seg: 14 }).cyl(0.36, 0.42, 0.3, 0xf4f1ea, 0, 2.35, 0, 0, 0, 0, { seg: 14 });
  b.cone(0.36, 0.7, C.red, 0, 2.85, 0, 0, 0, 0, { seg: 14 }).sph(0.06, C.gold, 0, 3.2, 0);
  b.cyl(0.43, 0.43, 0.14, C.red, 0, 1.0, 0, 0, 0, 0, { seg: 14 }).cyl(0.425, 0.425, 0.1, 0x2f6fd0, 0, 2.18, 0, 0, 0, 0, { seg: 14 });
  for (let a = 0; a < 3; a++) { const an = a * 2.094 + 0.5; b.at(0, 0, 0, an, () => b.flat([[[0, 1.3, 0.34], [0, 0, 0.8], [0, 0.55, 0.34]], [[0, 0, 0.8], [0, 0.2, 0.34], [0, 0.55, 0.34]]], C.red).box(0.07, 0.1, 0.16, C.iron, 0, 0.05, 0.78)); }
  b.cyl(0.19, 0.19, 0.08, C.gold, 0, 1.7, 0.39, PI / 2, 0, 0, { seg: 12 }).cyl(0.14, 0.14, 0.09, 0x8ff0ff, 0, 1.7, 0.4, PI / 2, 0, 0, { seg: 12, glow: true, grad: 0.8 });
  b.cyl(0.26, 0.34, 0.3, C.iron, 0, 0.55, 0, 0, 0, 0, { seg: 12 }).cone(0.22, 0.4, 0xffa62b, 0, 0.22, 0, PI, 0, 0, { seg: 8, glow: true, grad: 0.6 });
}, { cols: 1 });
def('satDish', 'tall', 1.6, 2.8, 1.5, (b) => {
  for (let a = 0; a < 3; a++) b.cyl(0.04, 0.05, 1.5, C.steel, Math.sin(a * 2.094) * 0.4, 0.7, Math.cos(a * 2.094) * 0.4, Math.cos(a * 2.094) * 0.5, 0, -Math.sin(a * 2.094) * 0.5, { seg: 6 });
  b.cyl(0.1, 0.1, 0.5, C.iron, 0, 1.55, 0, 0, 0, 0, { seg: 8 }).sph(0.14, C.iron, 0, 1.8, 0);
  b.at(0, 1.95, 0, 0, () => {
    b.dome(0.75, 0xe9eef5, 0, 0.42, 0.42, PI * 0.75, 0, 0, 1, 0.5, 1, { seg: 14, t0: 0, tl: PI / 2 });
    b.cyl(0.02, 0.02, 0.7, C.steel, 0, 0.45, 0.45, -PI / 4, 0, 0, { seg: 5 }).sph(0.08, 0xff5a5a, 0, 0.7, 0.7, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  });
  b.box(0.5, 0.42, 0.4, 0x5b6770, 0.42, 0.21, -0.3, 0, 0.4, 0);
  for (let i = 0; i < 3; i++) b.sph(0.035, [0x7dff8a, 0xffe27a, 0xff5a5a][i], 0.3 + i * 0.12, 0.33, -0.06 - i * 0.05, 1, 1, 1, { glow: true, seg: 5, grad: 1 });
}, { cols: 1 });
def('alienPod', 'tall', 1.5, 2.6, 1.5, (b) => {
  // a friendly alien waving from the top of a landing pod
  b.cyl(0.62, 0.72, 0.9, 0xd9dee8, 0, 0.6, 0, 0, 0, 0, { seg: 12 }).cyl(0.74, 0.74, 0.1, 0x7a4fd0, 0, 0.2, 0, 0, 0, 0, { seg: 12 }).cyl(0.64, 0.64, 0.08, 0x7a4fd0, 0, 1.06, 0, 0, 0, 0, { seg: 12 });
  for (let a = 0; a < 3; a++) b.cyl(0.04, 0.04, 0.5, C.iron, Math.sin(a * 2.094) * 0.7, 0.2, Math.cos(a * 2.094) * 0.7, Math.cos(a * 2.094) * 0.6, 0, -Math.sin(a * 2.094) * 0.6, { seg: 5 }).sph(0.09, C.iron, Math.sin(a * 2.094) * 0.84, 0.05, Math.cos(a * 2.094) * 0.84, 1, 0.5, 1, { seg: 6 });
  for (let a = 0; a < 4; a++) b.cyl(0.13, 0.13, 0.04, 0x8ff0ff, Math.sin(a * 1.571) * 0.67, 0.62, Math.cos(a * 1.571) * 0.67, PI / 2, 0, a * -1.571, { seg: 10, glow: true, grad: 0.8 });
  alienInto(b, 0, 1.1, 0, 0, 1.0);
});
def('moonRock', 'low', 1.45, 0.86, 1.1, (b) => {
  b.add(new THREE.DodecahedronGeometry(1, 1), ROCK_S[1], -0.2, 0.36, 0, 0.4, 0.2, 0, 0.52, 0.42, 0.48).add(new THREE.DodecahedronGeometry(1), ROCK_S[0], 0.42, 0.24, 0.12, 1, 2, 0.3, 0.34, 0.28, 0.34);
  crater(b, -0.25, 0.74, 0.12, 0.17, 0.25, 0.1); crater(b, 0.44, 0.44, 0.34, 0.1, 0.9, 0);
  b.cyl(0.015, 0.015, 0.5, C.steel, 0.3, 0.6, -0.2).box(0.24, 0.15, 0.012, 0xffc928, 0.42, 0.76, -0.2);     // a little flag
  crystalInto(b, -0.55, 0.2, 0.35, 0.3, 0x58e6ff, 0.5, 0.3);
});
def('starCrate', 'low', 1.3, 0.9, 1.1, (b) => {
  b.box(1.2, 0.84, 1.0, 0x5b6770, 0, 0.42, 0, 0, 0.1, 0);
  b.at(0, 0, 0, 0.1, () => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.1, 0.88, 0.1, 0x3d4650, sx * 0.57, 0.44, sz * 0.47);
    for (const y of [0.04, 0.82]) b.box(1.24, 0.07, 1.04, 0x3d4650, 0, y, 0);
    b.box(0.8, 0.07, 0.02, 0x58e6ff, 0, 0.6, 0.51, 0, 0, 0, { glow: true, grad: 1 }).box(0.8, 0.07, 0.02, 0x58e6ff, 0, 0.26, 0.51, 0, 0, 0, { glow: true, grad: 1 });
    b.add(new THREE.OctahedronGeometry(0.13), 0xffe27a, 0, 0.43, 0.52, 0, 0, 0, 1, 1, 0.3, { glow: true, grad: 1 });
  });
});
def('rover', 'low', 1.5, 0.95, 1.1, (b) => {
  // a little moon rover that trundles across the lanes; built facing +x
  b.box(1.1, 0.26, 0.7, 0xe9eef5, 0, 0.42, 0).box(0.5, 0.2, 0.5, 0xffc928, -0.15, 0.64, 0);
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) b.cyl(0.17, 0.17, 0.12, 0x2c3640, sx * 0.42, 0.17, sz * 0.44, PI / 2, 0, 0, { seg: 10 }).cyl(0.07, 0.07, 0.13, C.steel, sx * 0.42, 0.17, sz * 0.44, PI / 2, 0, 0, { seg: 6 });
  b.cyl(0.03, 0.03, 0.32, C.steel, 0.38, 0.7, 0).box(0.2, 0.14, 0.26, 0x5b6770, 0.42, 0.9, 0).cyl(0.06, 0.06, 0.03, 0x58e6ff, 0.53, 0.9, 0, 0, 0, PI / 2, { seg: 8, glow: true, grad: 1 });
  b.cyl(0.012, 0.012, 0.4, C.steel, -0.4, 0.84, 0.2).sph(0.04, 0xff5a5a, -0.4, 1.05, 0.2, 1, 1, 1, { glow: true, seg: 5, grad: 1 });
  b.box(0.5, 0.02, 0.6, 0x2f4fa8, -0.15, 0.76, 0, 0, 0, 0.15);                                             // solar panel
}, { zap: true });
def('plasma', 'low', 1.1, 1.0, 1.0, (b) => {
  // a UFO's shot: a crackling ball that skims along the lane
  b.sph(0.46, 0xff5ae0, 0, 0, 0, 1, 1, 1, { seg: 12, glow: true, grad: 0.6 }).sph(0.3, 0xffffff, 0, 0.05, 0, 1, 1, 1, { seg: 8, glow: true, grad: 0.9 });
  b.tor(0.56, 0.04, 0x8ff0ff, 0, 0, 0, PI / 2, 0, 0.4, { seg: 16, glow: true, grad: 1 }).tor(0.56, 0.04, 0xffe27a, 0, 0, 0, 0.3, 0, 0, { seg: 16, glow: true, grad: 1 });
}, { center: true });
def('ufo', 'deco', 2.4, 1.3, 2.4, (b) => {
  b.sph(1.15, 0xc9d2e0, 0, 0, 0, 1, 0.2, 1, { seg: 18 }).cyl(0.7, 1.0, 0.2, 0x8f9bb0, 0, -0.2, 0, 0, 0, 0, { seg: 16 });
  b.tor(1.12, 0.07, 0x7a4fd0, 0, 0, 0, PI / 2, 0, 0, { seg: 22 });
  for (let i = 0; i < 10; i++) b.sph(0.085, [0xffe27a, 0xff7ad9, 0x8ff0ff][i % 3], Math.cos(i * 0.628) * 0.92, 0.1, Math.sin(i * 0.628) * 0.92, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  b.cyl(0.5, 0.56, 0.16, 0x7a4fd0, 0, 0.22, 0, 0, 0, 0, { seg: 14 });                                      // cockpit rim
  b.dome(0.48, 0x9fe8ff, 0, 0.28, 0, 0, 0, 0, 1, 1.05, 1, { seg: 14, t0: 0, tl: PI * 0.32 });              // the top of the glass canopy
  // the pilot peeking out of the cockpit
  b.sph(0.27, ALIEN, 0, 0.5, 0.06, 1.15, 0.95, 1, { seg: 10 });
  for (const sx of [-1, 1]) b.sph(0.09, 0x15151f, sx * 0.12, 0.52, 0.27, 0.9, 1.2, 0.6, { seg: 7, grad: 1 }).cyl(0.012, 0.012, 0.2, ALIEN_D, sx * 0.12, 0.82, 0.05, 0, 0, sx * -0.3, { seg: 5 }).sph(0.04, 0xffe27a, sx * 0.15, 0.93, 0.05, 1, 1, 1, { glow: true, seg: 5, grad: 1 });
  b.cyl(0.38, 0.5, 0.1, 0x58e6ff, 0, -0.33, 0, 0, 0, 0, { seg: 14, glow: true, grad: 0.7 });              // the glow underneath
  b.cyl(0.1, 0.16, 0.34, C.iron, 0, -0.36, 0.5, -0.9, 0, 0, { seg: 8 }).sph(0.1, 0xff5ae0, 0, -0.47, 0.64, 1, 1, 1, { glow: true, seg: 6, grad: 1 });   // its blaster
});


// ---------- flying attackers and what they drop ----------
// Each one hovers over a lane and lobs a shot that rolls along it. The laser zaps them in a harmless puff.
// "wings" builds one wing (side -1 or 1) as its own mesh so that it can flap.
const GULL_W = 0xf7f7f2, GULL_G = 0x9aa4b0, GULL_O = 0xf5a623, LEATHER = 0x6b4a2b;
def('gull', 'deco', 2.8, 1.0, 1.7, (b) => {
  // a bomber gull in flying goggles
  b.sph(0.38, GULL_W, 0, 0, 0, 0.95, 0.85, 1.5, { seg: 14 }).sph(0.36, GULL_G, 0, 0.1, -0.1, 0.9, 0.7, 1.3, { seg: 12 });
  b.sph(0.27, GULL_W, 0, 0.22, 0.5, 1, 1, 1, { seg: 12 });
  b.cone(0.09, 0.36, GULL_O, 0, 0.16, 0.86, PI / 2, 0, 0, { seg: 8 }).sph(0.04, 0xd8362b, 0, 0.11, 0.93, 1, 1, 1, { seg: 5 });
  b.tor(0.275, 0.028, LEATHER, 0, 0.3, 0.5, PI / 2 - 0.25, 0, 0, { seg: 14 });                            // goggle strap
  b.sph(0.2, LEATHER, 0, 0.36, 0.44, 1.1, 0.7, 1.1, { seg: 8 });                                          // flying cap
  for (const sx of [-1, 1]) {
    b.tor(0.1, 0.03, LEATHER, sx * 0.125, 0.3, 0.72, 0, 0, 0, { seg: 10 });
    b.sph(0.085, 0x8fd8ff, sx * 0.125, 0.3, 0.725, 1, 1, 0.4, { seg: 8, grad: 1 }).sph(0.04, 0x1b1f24, sx * 0.125, 0.29, 0.76, 1, 1, 0.4, { seg: 6, grad: 1 });
    b.box(0.17, 0.04, 0.03, 0x1b1f24, sx * 0.125, 0.425, 0.74, 0, 0, sx * -0.45);                         // cross brows
    b.cap(0.028, 0.12, GULL_O, sx * 0.1, -0.33, 0.12, 0.6, 0, 0).sph(0.07, GULL_O, sx * 0.1, -0.4, 0.2, 1, 0.4, 1.3, { seg: 6 });
  }
  for (const k of [-1, 0, 1]) b.sph(0.22, k ? GULL_G : GULL_W, k * 0.13, 0.02, -0.66 + Math.abs(k) * 0.05, 0.5, 0.12, 1.1, { seg: 8 });
}, {
  wings: (b, sx) => {
    b.sph(0.5, GULL_G, sx * 0.62, 0, 0, 1.25, 0.09, 0.62, { seg: 12 }).sph(0.36, GULL_W, sx * 0.42, -0.02, 0.08, 1, 0.08, 0.6, { seg: 8 });
    b.sph(0.3, 0x2a2f36, sx * 1.18, 0.005, -0.05, 1, 0.1, 0.72, { seg: 8 });
  }, wingAt: [0.2, 0.12, 0.02],
});
def('egg', 'low', 1.0, 1.0, 1.0, (b) => {
  // what the gulls drop: a big speckled egg that rolls down the lane
  b.sph(0.47, 0xfff3d6, 0, 0, 0, 0.9, 1, 1.05, { seg: 14, grad: 0.9 });
  for (let i = 0; i < 12; i++) { const a = i * 2.4, c = Math.cos(i * 1.7); b.sph(0.05 + (i % 3) * 0.015, i % 2 ? 0xc99a5b : 0x9b7440, Math.sin(i * 1.7) * 0.4, Math.cos(a) * 0.44 * Math.abs(c), Math.sin(a) * 0.46 * Math.abs(c), 1, 1, 1, { seg: 5, grad: 1 }); }
}, { center: true });
const BAT = 0x5a4686, BAT_D = 0x34284f;
def('bat', 'deco', 2.6, 1.0, 1.2, (b) => {
  // a round, grumpy slime bat with glowing eyes
  b.sph(0.38, BAT, 0, 0, 0, 1, 1.05, 0.95, { seg: 12 }).sph(0.27, 0x7d68ad, 0, -0.1, 0.14, 0.9, 0.8, 0.8, { seg: 10 });
  for (const sx of [-1, 1]) {
    b.cone(0.14, 0.4, BAT_D, sx * 0.22, 0.44, 0, 0, 0, sx * -0.3, { seg: 6 }).cone(0.075, 0.24, 0xf5a9b0, sx * 0.22, 0.42, 0.05, 0, 0, sx * -0.3, { seg: 5 });
    b.sph(0.09, 0xffe27a, sx * 0.14, 0.1, 0.32, 1, 1, 0.5, { seg: 7, glow: true, grad: 1 }).sph(0.038, 0x15151f, sx * 0.14, 0.09, 0.36, 1, 1, 0.5, { seg: 5, grad: 1 });
    b.box(0.17, 0.04, 0.03, 0x15151f, sx * 0.14, 0.22, 0.34, 0, 0, sx * -0.4);
    b.cone(0.032, 0.1, 0xffffff, sx * 0.06, -0.14, 0.34, PI, 0, 0, { seg: 4 });
    b.cap(0.025, 0.1, BAT_D, sx * 0.1, -0.42, 0.04);
  }
  b.sph(0.05, 0x15151f, 0, -0.01, 0.38, 1, 0.7, 0.5, { seg: 5 }).tor(0.1, 0.016, 0x15151f, 0, -0.06, 0.345, 0, 0, PI, { arc: PI, seg: 8 });
}, {
  wings: (b, sx) => {
    b.sph(0.5, BAT_D, sx * 0.56, 0, 0, 1.2, 0.05, 0.78, { seg: 10 }).sph(0.32, BAT_D, sx * 1.0, 0, -0.12, 1.1, 0.05, 0.85, { seg: 8 });
    for (let i = 0; i < 3; i++) b.cyl(0.022, 0.012, 1.0, BAT, sx * 0.56, 0.035, -0.02, 0, sx * (i - 1) * 0.42, PI / 2, { seg: 5 });
    b.cone(0.04, 0.14, 0xe9e2f5, sx * 1.12, 0.03, 0.26, PI / 2, 0, 0, { seg: 4 });                         // thumb claw
  }, wingAt: [0.26, 0.08, 0],
});
def('slime', 'low', 1.05, 1.0, 1.0, (b) => {
  // a wobbling ball of glowing slime
  b.sph(0.46, 0x8dff5a, 0, 0, 0, 1, 0.95, 1, { seg: 12, glow: true, grad: 0.55 }).sph(0.2, 0xe9ffd6, -0.12, 0.16, 0.2, 1, 1, 1, { seg: 7, glow: true, grad: 1 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9; b.sph(0.13, 0x6fe03a, Math.cos(a) * 0.4, Math.sin(i * 2.1) * 0.3, Math.sin(a) * 0.4, 1, 1, 1, { seg: 6, glow: true, grad: 0.7 }); }
}, { center: true });
function cloudDef(name, col, dark, under) {
  def(name, 'deco', 2.7, 1.4, 1.6, (b) => {
    // a cross little cloud
    for (const [x, y, z, r] of [[0, 0, 0, 0.62], [-0.62, -0.08, 0, 0.46], [0.62, -0.08, 0, 0.46], [-0.3, 0.3, -0.05, 0.44], [0.34, 0.32, -0.05, 0.4], [0, -0.1, -0.35, 0.5], [-0.98, -0.2, 0, 0.28], [0.98, -0.2, 0, 0.28]]) b.sph(r, col, x, y, z, 1, 0.9, 0.9, { seg: 10 });
    b.sph(1.0, dark, 0, -0.36, 0, 1.08, 0.2, 0.62, { seg: 10 });
    for (const sx of [-1, 1]) {
      b.sph(0.13, 0xffffff, sx * 0.23, 0.06, 0.55, 1, 1.15, 0.5, { seg: 8, grad: 1 }).sph(0.06, 0x15151f, sx * 0.21, 0.03, 0.61, 1, 1, 0.5, { seg: 6, grad: 1 });
      b.box(0.27, 0.055, 0.04, 0x15151f, sx * 0.23, 0.25, 0.6, 0, 0, sx * -0.45);
      b.sph(0.1, 0xf5a9b0, sx * 0.42, -0.1, 0.5, 1, 0.7, 0.4, { seg: 6, grad: 1 });                         // puffed cheeks
    }
    b.tor(0.12, 0.024, 0x15151f, 0, -0.26, 0.58, 0, 0, 0, { arc: PI, seg: 8 });
    under(b);
  });
}
cloudDef('stormcloud', 0x6f7890, 0x4a5268, (b) => {
  // a lightning bolt underneath
  b.box(0.12, 0.34, 0.06, 0xffe27a, 0.06, -0.62, 0.15, 0, 0, 0.5, { glow: true, grad: 1 }).box(0.12, 0.34, 0.06, 0xffe27a, -0.03, -0.86, 0.15, 0, 0, -0.5, { glow: true, grad: 1 });
  b.cone(0.07, 0.22, 0xffe27a, 0.05, -1.08, 0.15, PI, 0, 0.35, { seg: 4, glow: true, grad: 1 });
});
cloudDef('snowcloud', 0xe6eef8, 0xb9c8dc, (b) => {
  // icicles and a few snowflakes underneath
  for (let i = 0; i < 5; i++) b.cone(0.06, 0.2 + (i % 2) * 0.14, 0xcfeaff, -0.6 + i * 0.3, -0.56 - (i % 2) * 0.07, 0.05, PI, 0, 0, { seg: 5 });
  for (let i = 0; i < 4; i++) b.sph(0.05, 0xffffff, -0.5 + i * 0.34, -0.9 - (i % 2) * 0.16, 0.2, 1, 1, 1, { seg: 5, glow: true, grad: 1 });
});
def('spark', 'low', 1.05, 1.0, 1.0, (b) => {
  // ball lightning from a storm cloud
  b.sph(0.42, 0xffe27a, 0, 0, 0, 1, 1, 1, { seg: 12, glow: true, grad: 0.6 }).sph(0.26, 0xffffff, 0, 0, 0, 1, 1, 1, { seg: 8, glow: true, grad: 0.9 });
  for (let i = 0; i < 8; i++) { const a = i * 0.785, t = i % 2 ? 0.5 : -0.4; b.cone(0.07, 0.3, i % 2 ? 0x8ff0ff : 0xfff6c2, Math.cos(a) * 0.5, Math.sin(a) * 0.5 * Math.cos(t), Math.sin(t) * 0.4, t, 0, a - PI / 2, { seg: 4, glow: true, grad: 1 }); }
}, { center: true });

// ---------- alien invaders ----------
// Tide Rush's own little invaders: three kinds, one for each row of the formation. Each rides a glowing hover-jet.
// They are lit partly by their own colours so that they stand out against a night sky.
const INV_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
INV_MAT.onBeforeCompile = (sh) => { addTwist(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.6;'); };
INV_MAT.customProgramCacheKey = () => 'invader';
function hoverJet(b, col = 0x58e6ff) { b.cyl(0.24, 0.13, 0.09, col, 0, -0.52, 0, 0, 0, 0, { seg: 10, glow: true, grad: 0.7 }).cone(0.1, 0.22, 0xffffff, 0, -0.66, 0, PI, 0, 0, { seg: 6, glow: true, grad: 1 }); }
def('invTop', 'deco', 1.2, 1.1, 0.9, (b) => {
  // Peeper: a one-eyed purple ball with golden horns and a toothy grin
  const P = 0xa56bff, D = 0x7443d6;
  b.sph(0.44, P, 0, 0, 0, 1, 0.95, 0.9, { seg: 14 }).sph(0.3, 0xc7a3ff, 0, -0.16, 0.12, 1, 0.7, 0.8, { seg: 10 });
  b.sph(0.23, 0xffffff, 0, 0.1, 0.29, 1, 1, 0.6, { seg: 10, grad: 1 }).sph(0.125, 0x22c7d6, 0, 0.1, 0.41, 1, 1, 0.5, { seg: 8, grad: 1 }).sph(0.06, 0x15151f, 0, 0.1, 0.46, 1, 1, 0.5, { seg: 6, grad: 1 });
  b.tor(0.14, 0.022, 0x15151f, 0, -0.17, 0.35, 0, 0, PI, { arc: PI, seg: 8 });
  for (const sx of [-1, 1]) {
    b.cone(0.09, 0.36, 0xffe27a, sx * 0.3, 0.47, 0, 0, 0, sx * -0.6, { seg: 6 });
    b.box(0.055, 0.06, 0.03, 0xffffff, sx * 0.05, -0.215, 0.375);
    b.cap(0.055, 0.16, D, sx * 0.52, -0.02, 0.05, 0, 0, sx * 0.9).sph(0.085, 0xffe27a, sx * 0.66, 0.08, 0.05, 1, 1, 1, { seg: 6 });
  }
  hoverJet(b);
}, { mat: INV_MAT });
def('invMid', 'deco', 1.2, 1.1, 0.9, (b) => {
  // Boxbot: a teal box-headed robot with eyes on stalks and a spring aerial
  const T = 0x2fc7b0, D = 0x1d8f80;
  b.box(0.74, 0.62, 0.6, T, 0, 0, 0).box(0.78, 0.1, 0.64, D, 0, -0.28, 0).box(0.5, 0.2, 0.05, 0x15323a, 0, -0.08, 0.3);
  for (let i = 0; i < 4; i++) b.box(0.07, 0.12, 0.03, i % 2 ? 0xffe27a : 0xff7ad9, -0.165 + i * 0.11, -0.08, 0.33, 0, 0, 0, { glow: true, grad: 1 });      // a row of lights for a mouth
  for (const sx of [-1, 1]) {
    b.cyl(0.03, 0.03, 0.22, D, sx * 0.2, 0.41, 0.1).sph(0.12, 0xffffff, sx * 0.2, 0.56, 0.12, 1, 1, 1, { seg: 8, grad: 1 }).sph(0.055, 0x15151f, sx * 0.2, 0.56, 0.22, 1, 1, 0.5, { seg: 6, grad: 1 });
    b.cap(0.05, 0.18, D, sx * 0.5, -0.08, 0.05, 0, 0, sx * 1.2).tor(0.09, 0.03, 0xffb347, sx * 0.66, -0.16, 0.05, 0, 0, sx * 0.6, { arc: PI * 1.3, seg: 8 });   // clamp hands
  }
  for (let i = 0; i < 3; i++) b.tor(0.05, 0.014, 0xc9d2e0, 0, 0.36 + i * 0.07, -0.12, PI / 2, 0, 0, { seg: 8 });
  b.sph(0.07, 0xff5a5a, 0, 0.6, -0.12, 1, 1, 1, { seg: 6, glow: true, grad: 1 });
  hoverJet(b, 0xffb347);
}, { mat: INV_MAT });
def('invLow', 'deco', 1.2, 1.1, 0.9, (b) => {
  // Blobby: an orange gumdrop with three eyes, a wide smile and little boots
  const O = 0xff8a3c, D = 0xd9601c;
  b.sph(0.46, O, 0, -0.06, 0, 1, 0.8, 0.9, { seg: 14 }).sph(0.34, O, 0, 0.2, 0, 1, 1, 0.9, { seg: 12 }).sph(0.3, 0xffc48a, 0, -0.14, 0.14, 1, 0.6, 0.8, { seg: 10 });
  for (const [x, y, r] of [[-0.2, 0.2, 0.1], [0, 0.32, 0.12], [0.2, 0.2, 0.1]]) b.sph(r, 0xffffff, x, y, 0.27, 1, 1, 0.6, { seg: 8, grad: 1 }).sph(r * 0.48, 0x15151f, x, y, 0.33, 1, 1, 0.5, { seg: 6, grad: 1 });
  b.tor(0.2, 0.024, 0x15151f, 0, 0.02, 0.36, 0.15, 0, PI, { arc: PI, seg: 10 });
  for (const sx of [-1, 1]) {
    b.sph(0.07, 0xf5a9b0, sx * 0.3, 0.0, 0.34, 1, 0.7, 0.4, { seg: 6, grad: 1 });
    b.cap(0.05, 0.14, D, sx * 0.5, 0.0, 0.05, 0, 0, sx * -0.8).sph(0.075, D, sx * 0.6, 0.13, 0.05, 1, 1, 1, { seg: 6 });
    b.sph(0.13, 0x3f7fe0, sx * 0.2, -0.44, 0.06, 1, 0.7, 1.3, { seg: 8 });
  }
  b.cyl(0.012, 0.012, 0.22, D, 0, 0.6, 0).sph(0.06, 0x8dff5a, 0, 0.73, 0, 1, 1, 1, { seg: 6, glow: true, grad: 1 });
  hoverJet(b, 0x8dff5a);
}, { mat: INV_MAT });

// ---------- platform pieces ----------
function platBlockDef(name, col, dark) {
  def(name, 'plat', 2.1, PLAT_H, 3.0, (b) => {
    const w = 2.08, h = PLAT_H - 0.06, d = 2.98, t = 0.11;
    b.box(w, h, d, col, 0, h / 2, 0);
    for (const sx of [-1, 1]) for (const z of [-1.44, -0.48, 0.48, 1.44]) b.box(t, h, t, dark, sx * (w / 2 - 0.02), h / 2, z);
    for (const y of [t / 2, h - t / 2]) for (const sx of [-1, 1]) b.box(t, t, d, dark, sx * (w / 2 - 0.02), y, 0);
    for (const sz of [-1, 1]) { b.box(w, t, t, dark, 0, t / 2, sz * (d / 2 - 0.02)); b.box(w, t, t, dark, 0, h - t / 2, sz * (d / 2 - 0.02)); }
    for (const sx of [-1, 1]) for (const z of [-0.96, 0.96]) b.box(0.03, 0.09, 1.3, dark, sx * (w / 2 + 0.01), h / 2, z, sx * (z > 0 ? 0.74 : -0.74), 0, 0);
    // plank top, slightly lighter so the walkable surface reads clearly
    for (let i = 0; i < 6; i++) b.box(w + 0.06, 0.06, 0.47, i % 2 ? C.woodLight : 0xdcb986, 0, PLAT_H - 0.03, -1.25 + i * 0.5, 0, 0, 0, { grad: 1 });
    b.box(0.5, 0.3, 0.02, C.cream, 0.5, 0.95, d / 2 + 0.005).box(0.34, 0.05, 0.025, C.navy, 0.5, 1.0, d / 2 + 0.008).box(0.2, 0.05, 0.025, C.navy, 0.43, 0.9, d / 2 + 0.008);
  });
}
platBlockDef('platA', C.wood, C.woodDark); platBlockDef('platB', 0x9c7a55, C.woodDeep);
def('ramp', 'plat', 2.1, PLAT_H, 3.2, (b) => {
  const L = 3.2, a = Math.atan2(PLAT_H, L), hyp = Math.hypot(PLAT_H, L);
  b.box(2.0, 0.08, hyp, C.woodLight, 0, PLAT_H / 2 - 0.04, 0, a, 0, 0, { grad: 1 });
  for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9; b.box(1.9, 0.045, 0.07, C.woodDark, 0, PLAT_H * t + 0.02, L / 2 - L * t, a, 0, 0); }
  for (const sx of [-1, 1]) {
    b.box(0.09, 0.2, hyp, C.woodDark, sx * 1.0, PLAT_H / 2 - 0.1, 0, a, 0, 0);
    for (const t of [0.4, 0.7, 0.97]) b.box(0.1, PLAT_H * t, 0.1, C.woodDark, sx * 0.98, PLAT_H * t / 2 - 0.05, L / 2 - L * t);
    b.box(0.05, 0.05, hyp * 0.55, C.wood, sx * 0.98, PLAT_H * 0.36, -0.55, -0.5 + a, 0, 0);
  }
  b.box(1.9, 0.07, 0.07, C.woodDark, 0, PLAT_H * 0.35, L / 2 - L * 0.7).box(2.0, 0.03, 0.22, C.yellow, 0, 0.02, L / 2 - 0.1, a, 0, 0, { grad: 1 });
});

// Broken plank ends and a painted warning line at the near edge of a gap (the gap lies toward -z).
def('holeTrim', 'deco', 2.2, 0.2, 0.6, (b) => {
  const stripe = (x) => (Math.floor((x + 20) / 0.28) % 2 ? 0xffc928 : 0x2b2b2b);
  b.add(new THREE.BoxGeometry(2.16, 0.012, 0.3, 16, 1, 1), stripe, 0, 0.008, 0.3, 0, 0, 0, 1, 1, 1, { grad: 1 });
  const L = [0.5, 0.18, 0.62, 0.3, 0.1, 0.44, 0.22, 0.55];
  for (let i = 0; i < 8; i++) {
    const x = -0.96 + i * 0.274;
    b.box(0.25, 0.07, L[i], i % 2 ? C.wood : C.woodLight, x, -0.05 - (i % 3) * 0.03, -L[i] / 2 + 0.02, (i % 3) * 0.12, (i % 2 ? 1 : -1) * 0.05, 0);
  }
  b.box(2.2, 0.26, 0.12, C.woodDeep, 0, -0.16, 0.05);
});

// A bounce pad: step on it and Robyn is launched high into the air.
def('pad', 'deco', 1.7, 0.34, 1.7, (b) => {
  b.cyl(0.8, 0.86, 0.1, C.navy, 0, 0.05, 0, 0, 0, 0, { seg: 18 });
  for (let i = 0; i < 3; i++) b.tor(0.56, 0.035, C.steel, 0, 0.13 + i * 0.055, 0, PI / 2, 0, 0, { seg: 18 });
  b.cyl(0.8, 0.8, 0.07, 0xff4fa3, 0, 0.3, 0, 0, 0, 0, { seg: 18 });
  b.cyl(0.66, 0.66, 0.075, 0xffe27a, 0, 0.302, 0, 0, 0, 0, { seg: 18, glow: true, grad: 1 });
  b.cyl(0.54, 0.54, 0.08, 0xff4fa3, 0, 0.304, 0, 0, 0, 0, { seg: 18, grad: 1 });
  for (const z of [0.16, -0.14]) for (const sx of [-1, 1]) b.box(0.34, 0.012, 0.1, 0xffffff, sx * 0.11, 0.35, z, 0, sx * -0.7, 0, { glow: true, grad: 1 });   // chevrons pointing ahead
});

// ---------- pickups ----------
const coinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15, emissive: 0xff9d00, emissiveIntensity: 0.38 });
function buildShell() {
  const b = new Builder(1);
  // a golden scallop shell
  b.sph(0.3, 0xffd04a, 0, 0.02, 0, 1, 0.98, 0.2, { seg: 14 });
  for (let i = -3; i <= 3; i++) { const a = i * 0.27; b.box(0.034, 0.46, 0.085, 0xffe389, Math.sin(a) * 0.13, 0.03 + Math.cos(a) * 0.02, 0, 0, 0, -a); }
  b.box(0.26, 0.09, 0.09, 0xffb000, 0, -0.26, 0).tor(0.3, 0.025, 0xffb000, 0, 0.02, 0, 0, 0, 0, { seg: 18 });
  const m = b.build({ material: coinMat, receive: false });
  return m;
}
const gemMat = (col, em) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1, emissive: em ?? col, emissiveIntensity: 0.45 });
function buildPower(type) {
  const b = new Builder(1), g = new THREE.Group();
  let ring = 0xffffff;
  if (type === 'magnet') {
    ring = 0xff5a5a;
    b.tor(0.2, 0.075, C.red, 0, 0.06, 0, 0, 0, 0, { arc: PI, seg: 12, tseg: 8 });
    for (const sx of [-1, 1]) { b.cyl(0.075, 0.075, 0.2, C.red, sx * 0.2, -0.04, 0, 0, 0, 0, { seg: 8 }); b.cyl(0.078, 0.078, 0.12, 0xe8eef2, sx * 0.2, -0.2, 0, 0, 0, 0, { seg: 8 }); }
    g.add(b.build({ material: gemMat(0xffffff, 0xaa2020), receive: false }));
  } else if (type === 'shield') {
    ring = 0x58e6ff;
    b.sph(0.3, 0x8ff0ff, 0, 0, 0, 1, 1, 1, { seg: 16 });
    b.sph(0.12, 0xffffff, -0.1, 0.12, 0.2, 1, 1, 0.5);
    g.add(b.build({ material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, transparent: true, opacity: 0.8, emissive: 0x2ab5d6, emissiveIntensity: 0.6 }), receive: false }));
  } else if (type === 'boots') {
    ring = 0x6dff7f;
    b.cyl(0.11, 0.1, 0.3, 0x35c95f, 0, 0.1, 0.03).sph(0.11, 0x35c95f, 0, -0.06, -0.07, 0.95, 0.75, 1.7).box(0.2, 0.04, 0.38, C.cream, 0, -0.13, -0.06);
    for (let i = 0; i < 3; i++) b.tor(0.08, 0.018, 0xe8eef2, 0, -0.18 - i * 0.05, -0.05, PI / 2, 0, 0, { seg: 10 });
    b.box(0.2, 0.03, 0.34, 0x35c95f, 0, -0.33, -0.05);
    g.add(b.build({ material: gemMat(0xffffff, 0x1c8a3c), receive: false }));
  } else if (type === 'board') {
    ring = 0x3fe8dc;
    b.add(new THREE.SphereGeometry(1, 14, 8), (x, y, z) => (Math.abs(x) < 0.07 ? 0xfff1cf : y > 0.45 ? 0xff7a66 : y < -0.5 ? 0xffc928 : 0x18a7a0), 0, 0, 0, 0, 0, 0, 0.16, 0.42, 0.04);
    b.box(0.02, 0.1, 0.1, C.navy, 0, -0.3, -0.07);
    const m = b.build({ material: gemMat(0xffffff, 0x0d7d78), receive: false }); m.rotation.z = -0.45; m.scale.setScalar(1.15);
    g.add(m);
  } else if (type === 'laser') {
    ring = 0xff6ad8;
    // a chunky toy zapper
    b.sph(0.13, 0x18a7a0, 0, 0.04, 0.02, 0.8, 0.9, 1.7, { seg: 10 }).cyl(0.05, 0.06, 0.26, C.orange, 0, 0.05, -0.3, PI / 2, 0, 0, { seg: 8 });
    b.tor(0.075, 0.02, C.yellow, 0, 0.05, -0.24, 0, 0, 0, { seg: 10 }).tor(0.065, 0.018, C.yellow, 0, 0.05, -0.34, 0, 0, 0, { seg: 10 });
    b.sph(0.055, 0xff6ad8, 0, 0.05, -0.45).box(0.07, 0.2, 0.09, C.navy, 0, -0.13, 0.12, 0.3, 0, 0).box(0.03, 0.09, 0.2, C.orange, 0, 0.17, 0.08, -0.2, 0, 0);
    const m = b.build({ material: gemMat(0xffffff, 0xb0208a), receive: false }); m.rotation.set(0.2, 0.9, 0); m.scale.setScalar(1.3);
    g.add(m);
  } else if (type === 'rocket') {
    ring = 0xff9a3c;
    b.cyl(0.1, 0.1, 0.4, C.red, 0, 0.02, 0, 0, 0, 0, { seg: 10 }).cyl(0.104, 0.104, 0.08, C.cream, 0, 0.06, 0, 0, 0, 0, { seg: 10 });
    b.cone(0.1, 0.2, C.yellow, 0, 0.32, 0, 0, 0, 0, { seg: 10 }).cyl(0.07, 0.09, 0.06, C.iron, 0, -0.2, 0, 0, 0, 0, { seg: 8 });
    for (let a = 0; a < 3; a++) b.box(0.02, 0.16, 0.14, C.navy, Math.sin(a * 2.094) * 0.13, -0.13, Math.cos(a * 2.094) * 0.13, 0, a * 2.094, 0);
    b.cyl(0.012, 0.012, 0.3, C.woodLight, 0.05, -0.36, 0);
    const m = b.build({ material: gemMat(0xffffff, 0xb0401a), receive: false }); m.rotation.z = -0.5; m.scale.setScalar(1.15);
    g.add(m);
  } else {
    ring = 0xffd24a;
    b.add(new THREE.OctahedronGeometry(0.3), 0xc56bff, 0, 0, 0, 0, 0, 0, 0.85, 1.15, 0.85);
    b.add(new THREE.OctahedronGeometry(0.12), 0xffffff, 0, 0.42, 0, 0, 0.6, 0);
    g.add(b.build({ material: gemMat(0xffffff, 0x8a2be2), receive: false }));
  }
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: ring }));
  r.name = 'ring'; g.add(r);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.018, 6, 28), new THREE.MeshBasicMaterial({ color: ring, transparent: true, opacity: 0.55 }));
  r2.name = 'ring2'; g.add(r2);
  g.userData.color = ring;
  return g;
}

function buildPearl() {
  const b = new Builder(1), g = new THREE.Group();
  b.sph(0.27, 0xfff4fa, 0, 0, 0, 1, 1, 1, { seg: 16 }).sph(0.08, 0xffffff, -0.09, 0.1, 0.19, 1, 1, 0.5);
  g.add(b.build({ material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.2, emissive: 0xff8fcf, emissiveIntensity: 0.4 }), receive: false }));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd0ee })));
  return g;
}
function letterTexture(ch) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.font = '104px "Lilita One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#0e4c58'; g.strokeText(ch, 64, 70);
  g.fillStyle = '#fff6d8'; g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildLetter(ch) {
  const g = new THREE.Group(), b = new Builder(1);
  b.cyl(0.46, 0.46, 0.1, 0x18b5ac, 0, 0, 0, PI / 2, 0, 0, { seg: 22 }).tor(0.47, 0.055, 0xffc928, 0, 0, 0, 0, 0, 0, { seg: 26 });
  g.add(b.build({ material: gemMat(0xffffff, 0x0c6f6a), receive: false }));
  const mat = new THREE.MeshBasicMaterial({ map: letterTexture(ch), transparent: true });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.74), mat); f.position.z = 0.056; g.add(f);
  const k = new THREE.Mesh(f.geometry, mat); k.position.z = -0.056; k.rotation.y = PI; g.add(k);
  g.userData.color = 0x7ff3e8;
  return g;
}
// The portal to the Star Tunnel: a glowing ring with a window on to space. The shared material is animated from track.js.
export const portalMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; ${BEND_GLSL} void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * bendWorld(modelMatrix * vec4(position, 1.0)); }`,
  fragmentShader: `varying vec2 vUv; uniform float uT;
    float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard; float a = atan(p.y, p.x);
      // a window on to space: a little galaxy turning in the dark, with stars drifting round it
      float arm = pow(0.5 + 0.5 * cos(2.0 * a - 7.0 * log(r + 0.06) + uT * 1.6), 2.0);
      vec3 c = vec3(0.03, 0.02, 0.13) + mix(vec3(1.0, 0.92, 0.8), vec3(0.45, 0.4, 1.0), smoothstep(0.0, 0.6, r)) * exp(-r * 2.6) * (0.25 + 1.3 * arm);
      float ca = cos(uT * 0.5), sa = sin(uT * 0.5); vec2 q = mat2(ca, -sa, sa, ca) * p * 7.0, id = floor(q), f = fract(q) - 0.5;
      c += vec3(0.85, 0.95, 1.0) * step(0.72, ph(id)) * smoothstep(0.16, 0.0, length(f - (vec2(ph(id + 3.1), ph(id + 7.7)) - 0.5) * 0.6));
      c += vec3(0.35, 0.85, 1.0) * smoothstep(0.78, 1.0, r) * (0.6 + 0.4 * sin(a * 6.0 - uT * 4.0));
      c += vec3(1.0) * smoothstep(0.2, 0.0, r) * 0.8;
      gl_FragColor = vec4(c, smoothstep(1.0, 0.86, r) * 0.96);
      #include <colorspace_fragment>
    }`,
});
function buildPortal() {
  const g = new THREE.Group(), b = new Builder(0.85), CY = 1.34, R = 1.04;
  for (const sx of [-1, 1]) b.box(0.42, 0.34, 0.5, C.navy, sx * 0.86, 0.17, 0).box(0.46, 0.07, 0.54, C.gold, sx * 0.86, 0.36, 0).box(0.18, 0.5, 0.2, 0x6a2fb0, sx * 0.94, 0.6, 0);
  b.add(new THREE.TorusGeometry(R, 0.1, 8, 36), (x, y) => [0xb46bff, 0x58e6ff, 0xff7ad9][Math.floor(((Math.atan2(y - CY, x) + PI) / (PI * 2)) * 12) % 3], 0, CY, 0, 0, 0, 0, 1, 1, 1, { glow: true, grad: 1 });
  b.tor(R + 0.14, 0.035, 0x6a2fb0, 0, CY, 0, 0, 0, 0, { seg: 36 });
  for (let i = 0; i < 8; i++) b.add(new THREE.OctahedronGeometry(0.09), 0xffffff, Math.cos(i * PI / 4) * (R + 0.14), CY + Math.sin(i * PI / 4) * (R + 0.14), 0, 0, 0, 0, 1, 1, 1, { glow: true, grad: 1 });
  g.add(b.build());
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R - 0.04, 32), portalMat); disc.position.y = CY; disc.renderOrder = 3; g.add(disc);
  const s = signMesh('SPACE', 1.5, 0.38, '#1a1450', '#fff3d6', '#58e6ff'); s.position.set(0, CY + R + 0.42, 0); g.add(s);
  return g;
}

// ---------- registry with pooling ----------
const prefabs = new Map(), pools = new Map();
export function obstacleDef(name) { return DEF[name]; }
export function obtain(name) {
  const pool = pools.get(name);
  if (pool && pool.length) return pool.pop();
  if (!prefabs.has(name)) {
    let obj;
    if (name === 'shell') obj = buildShell();
    else if (name === 'pearl') obj = buildPearl();
    else if (name === 'portal') obj = buildPortal();
    else if (name.startsWith('letter:')) obj = buildLetter(name.slice(7));
    else if (name.startsWith('pw:')) obj = buildPower(name.slice(3));
    else {
      const d = DEF[name], b = new Builder(0.8); d.fn(b); obj = b.build({ cast: !d.mat, material: d.mat });
      // flapping wings are separate meshes hung on the body
      if (d.wings) for (const sx of [-1, 1]) { const wb = new Builder(0.8); d.wings(wb, sx); const w = wb.build({ cast: true }); w.position.set(sx * d.wingAt[0], d.wingAt[1], d.wingAt[2]); w.userData.wing = sx; obj.add(w); }
    }
    prefabs.set(name, obj);
  }
  const o = prefabs.get(name).clone();
  o.userData.pool = name;
  return o;
}
export function release(obj) {
  const name = obj.userData.pool;
  if (obj.parent) obj.parent.remove(obj);
  obj.rotation.set(0, 0, 0); obj.scale.set(1, 1, 1); obj.visible = true;
  if (!pools.has(name)) pools.set(name, []);
  pools.get(name).push(obj);
}
export function prewarm() {
  for (const n of Object.keys(DEF)) release(obtain(n));
  for (const n of ['shell', 'pearl', 'portal']) release(obtain(n));
  for (const t of ['magnet', 'shield', 'boots', 'gem', 'rocket', 'board', 'laser']) release(obtain('pw:' + t));
  for (const ch of 'ROBYN') release(obtain('letter:' + ch));
}

export const LOW_TYPES = ['crate', 'pots', 'bollard', 'deckchair', 'fishbox', 'barrier'];
export const TALL_TYPES = {
  0: ['cart', 'hutA', 'hutB', 'stack', 'cart', 'hutA'], 1: ['cart', 'hutA', 'hutB', 'stack', 'boat'], 2: ['stack', 'boat', 'containerA', 'containerB', 'containerC', 'stack'],
  3: ['popcorn', 'hutC', 'cart', 'popcorn', 'hutC', 'stack'], 4: ['rock', 'buoyBig', 'rock', 'stack', 'boat', 'buoyBig'],
  5: ['castleOb', 'surfRack', 'cart', 'hutA', 'castleOb', 'hutB'], 6: ['crystal', 'treasure', 'rock', 'crystal', 'stack', 'treasure'], 7: ['snowman', 'firPot', 'hutA', 'snowman', 'stack', 'firPot'],
  8: ['ratBig', 'pipeStack', 'ratBig', 'valve', 'slimeTank', 'ratBig'], 9: ['asteroid', 'rocketOb', 'satDish', 'alienPod', 'asteroid', 'rocketOb'],
  10: ['giftStack', 'nutcracker', 'candyCanes', 'firPot', 'nutcracker', 'giftStack', 'snowman'],
  11: ['mallowTower', 'lollyBig', 'cupcakeOb', 'jellyOb', 'sundae', 'mallowTower'],
  12: ['hypnoWheel', 'twistPole', 'jackBox', 'shellTower', 'miniHelter', 'hypnoWheel'],
  13: ['pineOb', 'cairn', 'rock', 'fingerpost', 'woodShed', 'pineOb'],
  14: ['striker', 'balloonCart', 'ticketBooth', 'carStack', 'popcorn', 'striker'],
  15: ['tanks', 'divingSuit', 'miniSub', 'fishTank', 'tanks', 'divingSuit'],
  16: ['chocFountain', 'chocBunny', 'foilEgg', 'biscuitTower', 'cakeSlice', 'chocBunny'],
  17: ['bigBottle', 'hayStack', 'scareCow', 'milkFloat', 'butterChurn', 'bigBottle'],
  18: ['standMirror', 'mirrorPillar', 'wonkyMirror', 'prismTower', 'vanity', 'standMirror'],
  19: ['statueBust', 'bigVase', 'armour', 'easel', 'mummyCase', 'bigVase'],
  20: ['grandClock', 'pillowTower', 'bigTeddy', 'moonLamp', 'wardrobe', 'pillowTower'],
  21: ['arcade', 'pxTree', 'blockTower', 'boxRobot', 'heartSign', 'blockTower'],
  22: ['speakerStack', 'lavaLamp', 'jukebox', 'neonNote', 'ballStand', 'speakerStack'],
  23: ['upTree', 'upLamp', 'upHut', 'headTeddy', 'upBrolly', 'upTree'],
  24: ['youngGiraffe', 'acaciaTree', 'tallDoor', 'topiary', 'heightChart', 'youngGiraffe'],
  25: ['stepLadder', 'sapling', 'beeHives', 'scareFriend', 'juiceBarrels', 'sapling'],
  26: ['tallGhost', 'ghostStack', 'grandClock', 'ghostLamp', 'sheetLine', 'ghostStack'],
  27: ['owlColumn', 'heroStatue', 'templeFront', 'oliveTree', 'bigVase', 'owlColumn'],
  28: ['paintRock', 'longNeckCalf', 'stoneTotem', 'cycadTree', 'rexHello', 'stoneTotem'],
  29: ['obelisk', 'camelCalf', 'potPalm', 'falconStatue', 'lotusColumn', 'obelisk'],
  30: ['eagleStandard', 'victoryColumn', 'togaStatue', 'pinePlanter', 'archDoor', 'eagleStandard'],
  31: ['kennelTall', 'izziStatue', 'ballTree', 'boneTower', 'treatJar', 'kennelTall'],
};
// the sewers and space have their own low obstacles in place of the seaside ones
export const LOW_BY_ZONE = { 8: ['rat', 'pipeLow', 'crate', 'rat', 'pipeLow', 'barrier'], 9: ['moonRock', 'starCrate', 'moonRock', 'starCrate', 'barrier', 'crate'], 10: ['gift', 'pudding', 'sledge', 'gift', 'pudding', 'barrier'], 11: ['mallow', 'donut', 'jellyLow', 'toffees', 'chocBar', 'mallow'], 12: ['snail', 'springLow', 'ammonite', 'whelk', 'snail', 'springLow'], 13: ['log', 'boulder', 'cheese', 'hay', 'log', 'boulder'], 14: ['coasterCar', 'turnstile', 'duckTub', 'coasterCar', 'barrier', 'duckTub'], 15: ['clam', 'wetSign', 'bucket', 'clam', 'wetSign', 'bucket'], 16: ['chocBar', 'truffleBox', 'cocoaMug', 'cookies', 'chocBar', 'cocoaMug'], 17: ['churns', 'hay', 'milkCrate', 'trough', 'cheese', 'churns'], 18: ['handMirror', 'gemPile', 'glassBricks', 'miniBall', 'gemPile', 'handMirror'], 19: ['ropeBarrier', 'displayCase', 'dinoEggs', 'noTouch', 'artCrate', 'ropeBarrier'], 20: ['pillowPile', 'sleepyTeddy', 'slippers', 'nightLight', 'toyBlocks', 'pillowPile'],
  21: ['pxCrate', 'cubeJelly', 'retroTV', 'joystick', 'pxBush', 'cubeJelly'],
  22: ['recordStack', 'boomBox', 'platformShoes', 'floorLights', 'miniBall', 'boomBox'],
  23: ['upCone', 'upBoat', 'upTable', 'upBucket', 'upHat', 'upCone'],
  24: ['calfNap', 'leafBasket', 'hoofBoots', 'scarfPile', 'antHill', 'calfNap'],
  25: ['fruitCrate', 'fruitBaskets', 'wheelbarrow', 'wormApple', 'wateringCan', 'fruitCrate'],
  26: ['ghostNap', 'pumpkinPals', 'ghostTea', 'sheetBasket', 'booBooks', 'pumpkinPals'],
  27: ['amphorae', 'laurelPrize', 'lyreScrolls', 'oliveBaskets', 'colDrums', 'amphorae'],
  28: ['eggNest', 'babyTrike', 'boneXylo', 'stewPot', 'shellFossils', 'eggNest'],
  29: ['miniPyramid', 'catStatue', 'scarabChest', 'lotusPond', 'scribeDesk', 'miniPyramid'],
  30: ['helmetPair', 'mosaicFountain', 'grapeBowl', 'shieldStack', 'gooseGuards', 'breadTray'],
  31: ['bigBone', 'dogBowls', 'ballBasket', 'squeakyPile', 'dogBed', 'hurdleBar'] };

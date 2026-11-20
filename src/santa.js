// Grumpy Santa, the villain of Christmas Pier: a giant Santa with glowing red eyes who hovers ahead of Robyn in a
// rocket sleigh and lobs presents down the lanes. Robyn zaps him by herself; when his grumpiness runs out his eyes
// stop glowing, he remembers he is meant to be jolly, and he flies off with a "ho ho ho".
// Like the alien invaders he is only for show and for points: the presents he throws are laid by the track
// generator like any rolling barrel, so the safe path is never blocked.
import * as THREE from 'three';
import { Builder, signMesh, puffTexture } from './kit.js';
import { giftInto } from './obstacles.js';

const PI = Math.PI, AHEAD = 27, SIZE = 2.4, BASE_Y = 3.2, HP = 14;
const RED = 0xd8342f, RED_D = 0xa8241f, FUR = 0xfffaf0, GOLD = 0xffd24a, SKIN = 0xf2c0a0, MITT = 0x2f9d5c, DARK = 0x1f2933;
const FAIRY = [0xffe27a, 0x8ff0ff, 0xa6ff9a, 0xff9ee0];
const ring = (b, col, x, y, z, rx, rz, tube) => b.add(new THREE.TorusGeometry(1, tube, 8, 20), col, x, y, z, PI / 2, 0, 0, rx, rz, 1);

function buildSleighAndBody() {
  const b = new Builder(0.8);
  // the sleigh: a red hull with gold trim, a curled dash, a high back and two runners
  b.box(2.7, 0.95, 2.0, RED, 0, 0.85, -0.1).box(2.8, 0.14, 2.1, GOLD, 0, 1.36, -0.1).box(2.8, 0.1, 2.1, GOLD, 0, 0.4, -0.1);
  b.box(2.7, 1.0, 0.16, RED, 0, 1.45, 0.98, -0.35, 0, 0).cyl(0.16, 0.16, 2.8, GOLD, 0, 1.95, 1.16, 0, 0, PI / 2, { seg: 8 });
  b.box(2.7, 1.5, 0.18, RED_D, 0, 1.7, -1.15, 0.15, 0, 0).cyl(0.14, 0.14, 2.8, GOLD, 0, 2.45, -1.26, 0, 0, PI / 2, { seg: 8 });
  for (const sx of [-1, 1]) {
    b.box(0.12, 0.1, 2.9, GOLD, sx * 1.05, 0.05, -0.1).tor(0.3, 0.06, GOLD, sx * 1.05, 0.35, 1.35, 0, -PI / 2, -PI / 2, { arc: PI, seg: 8 });
    for (const z of [-0.8, 0.6]) b.box(0.08, 0.36, 0.08, GOLD, sx * 1.05, 0.22, z);
    // rocket boosters down each side, and hover jets underneath
    b.cyl(0.3, 0.3, 1.5, 0xc9d3dc, sx * 1.68, 0.8, -0.3, PI / 2, 0, 0, { seg: 10 }).cone(0.3, 0.45, RED, sx * 1.68, 0.8, 0.67, PI / 2, 0, 0, { seg: 10 }).cyl(0.33, 0.33, 0.12, GOLD, sx * 1.68, 0.8, -0.2, PI / 2, 0, 0, { seg: 10 });
    b.cone(0.26, 1.0, 0xffb347, sx * 1.68, 0.8, -1.55, -PI / 2, 0, 0, { glow: true, grad: 0.6, seg: 8 });
    for (const z of [-0.7, 0.5]) b.cyl(0.2, 0.26, 0.2, 0xc9d3dc, sx * 0.75, 0.28, z, 0, 0, 0, { seg: 8 }).cone(0.2, 0.7, 0x8ff0ff, sx * 0.75, -0.15, z, PI, 0, 0, { glow: true, grad: 0.5, seg: 8 });
  }
  for (let i = 0; i < 10; i++) b.sph(0.085, FAIRY[i % 4], -1.26 + i * 0.28, 1.28 - Math.abs((i % 2) - 0.5) * 0.1, 0.93, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  // Santa himself, sat in the middle: a big round red coat, fur down the front, a belt and a buckle
  b.sph(1.0, RED, 0, 2.3, -0.1, 1.2, 1.15, 1.0, { seg: 16 }).sph(1.0, FUR, 0, 2.3, -0.06, 0.2, 1.12, 1.0, { seg: 12 });
  ring(b, DARK, 0, 2.05, -0.1, 1.19, 1.0, 0.12);
  b.box(0.44, 0.38, 0.1, GOLD, 0, 2.05, 0.92).box(0.22, 0.18, 0.12, DARK, 0, 2.05, 0.93);
  ring(b, FUR, 0, 3.22, 0, 0.6, 0.52, 0.17);
  // the arm that rests on the dash
  b.cap(0.27, 0.8, RED, -1.14, 2.4, 0.45, -0.9, 0, 0, { seg: 9 }).sph(0.31, FUR, -1.14, 2.02, 0.92, 1, 0.6, 1, { seg: 8 }).sph(0.3, MITT, -1.14, 1.92, 1.08, 1, 0.9, 1.1, { seg: 9 });
  // the sack on the back, stuffed with presents
  b.sph(0.95, 0x8a5f3e, 0, 2.9, -1.75, 1.25, 1.2, 0.9, { seg: 12 });
  giftInto(b, 0.55, 0.5, 0.55, 0x2f6fd0, GOLD, -0.7, 3.75, -1.7, 0.4); giftInto(b, 0.5, 0.6, 0.5, 0xff7ab8, 0xffffff, 0.75, 3.7, -1.72, -0.3); giftInto(b, 0.45, 0.4, 0.45, 0xf2c23a, RED, 0.05, 4.0, -1.8, 0.7);
  return b.build({ cast: false });
}
function buildHead() {
  const b = new Builder(0.84);
  b.sph(0.62, SKIN, 0, 0.45, 0, 1, 1, 1, { seg: 14 }).sph(0.64, FUR, 0, 0.45, -0.14, 1.03, 0.96, 0.9, { seg: 12 });
  // the beard, the moustache and a round red nose
  b.sph(0.62, FUR, 0, 0.1, 0.28, 1.05, 0.95, 0.75, { seg: 12 });
  for (let i = -2; i <= 2; i++) b.sph(0.25, FUR, i * 0.26, -0.3 - (2 - Math.abs(i)) * 0.13, 0.42, 1, 1, 1, { seg: 8 });
  b.sph(0.2, FUR, 0, -0.76, 0.4, 1, 1.4, 1, { seg: 8 });
  for (const sx of [-1, 1]) b.sph(0.2, FUR, sx * 0.2, 0.3, 0.6, 1.3, 0.55, 0.6, { seg: 8 }).sph(0.13, 0xf09a8a, sx * 0.38, 0.4, 0.46, 1, 0.8, 0.6, { seg: 7 });
  b.sph(0.13, 0xe86a5a, 0, 0.44, 0.63, 1, 1, 1, { seg: 9 });
  // the hat: a fur band, a floppy red cone and a bobble
  ring(b, FUR, 0, 0.93, -0.02, 0.6, 0.58, 0.16);
  b.cone(0.55, 1.0, RED, 0.08, 1.4, -0.05, 0, 0, -0.3, { seg: 12 }).cone(0.3, 0.85, RED, 0.5, 1.84, -0.05, 0, 0, -1.3, { seg: 10 }).sph(0.23, FUR, 0.95, 1.95, -0.05, 1, 1, 1, { seg: 9 });
  return b.build({ cast: false });
}

export class Santa {
  constructor(scene) {
    this.scene = scene; this.root = null; this.wave = null; this.state = 'off'; this.onEvent = null; this.hp = HP; this.max = HP; this.progress = 0;
    this.aim = { santa: true, alive: false, aimed: false, wx: 0, wy: 0, wz: -AHEAD };
  }
  build() {
    const root = (this.root = new THREE.Group());
    root.add(buildSleighAndBody());
    const plate = signMesh('HO HO 1', 1.1, 0.32, '#fff3d6', '#1f2933', '#ffd24a'); plate.position.set(0, 0.85, 0.92); root.add(plate);
    const head = (this.head = new THREE.Group()); head.position.set(0, 3.25, 0.1); root.add(head);
    head.add(buildHead());
    // the glowing eyes, each with a soft halo and a bright speck; they are their own materials so that they can pulse
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2010 });
    this.haloMat = new THREE.MeshBasicMaterial({ map: puffTexture(), color: 0xff3018, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeGeo = new THREE.SphereGeometry(0.15, 12, 9), haloGeo = new THREE.CircleGeometry(0.4, 20), dotGeo = new THREE.SphereGeometry(0.045, 6, 5);
    this.halos = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, this.eyeMat); e.position.set(sx * 0.25, 0.55, 0.52); head.add(e);
      const h = new THREE.Mesh(haloGeo, this.haloMat); h.position.set(sx * 0.25, 0.55, 0.6); h.renderOrder = 3; head.add(h); this.halos.push(h);
      const d = new THREE.Mesh(dotGeo, white); d.position.set(sx * 0.25 + 0.04, 0.6, 0.655); head.add(d);
    }
    // eyebrows and mouth are separate so that his face can change from grumpy to jolly
    this.brows = [];
    for (const sx of [-1, 1]) { const b = new Builder(0.9); b.box(0.36, 0.11, 0.12, FUR, 0, 0, 0); const m = b.build({ cast: false }); m.position.set(sx * 0.26, 0.73, 0.57); m.userData.sx = sx; head.add(m); this.brows.push(m); }
    { const b = new Builder(1); b.tor(0.14, 0.035, 0x5a2a20, 0, 0, 0, 0, 0, 0, { arc: PI, seg: 8 }); this.mouth = b.build({ cast: false }); this.mouth.position.set(0, 0.08, 0.74); head.add(this.mouth); }
    // the throwing arm, hinged at the shoulder, with a present in its mitten
    const arm = (this.arm = new THREE.Group()); arm.position.set(1.14, 2.85, -0.05); root.add(arm);
    { const b = new Builder(0.84); b.cap(0.27, 0.75, RED, 0, 0.6, 0, 0, 0, 0, { seg: 9 }).sph(0.31, FUR, 0, 1.15, 0, 1, 0.6, 1, { seg: 8 }).sph(0.31, MITT, 0, 1.4, 0, 1, 1, 1, { seg: 9 }); arm.add(b.build({ cast: false })); }
    { const b = new Builder(0.84); giftInto(b, 0.75, 0.7, 0.75, 0x2f9d5c, 0xe5383b, 0, 0, 0, 0.4); this.gift = b.build({ cast: false }); this.gift.position.set(0, 1.62, 0); arm.add(this.gift); }
    root.scale.setScalar(SIZE);
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  }
  get active() { return this.state !== 'off'; }
  get fighting() { return this.state === 'fight'; }
  get flee() { return this.state !== 'fight'; }      // a bolt in flight gives up once he has stopped fighting
  begin(wave) {
    if (!this.root) this.build();
    this.scene.add(this.root);
    Object.assign(this, { wave, state: 'in', st: 0, hp: HP, x: 0, vx: 0, y: BASE_Y, flinch: 0, wind: 0, throwT: 0, load: 1, progress: 0 });
    this.aim.alive = true; this.aim.aimed = false;
    this.face(false);
  }
  clear() { if (this.root && this.root.parent) this.scene.remove(this.root); this.state = 'off'; this.wave = null; this.aim.alive = false; }
  // grumpy: red eyes, cross brows and a frown; jolly: twinkly dark eyes, raised brows and a smile
  face(jolly) {
    this.eyeMat.color.set(jolly ? 0x2a1d14 : 0xff1408); this.haloMat.opacity = jolly ? 0 : 0.6;
    for (const b of this.brows) { b.rotation.z = b.userData.sx * (jolly ? -0.22 : 0.5); b.position.y = jolly ? 0.82 : 0.73; }
    this.mouth.rotation.z = jolly ? PI : 0; this.mouth.position.y = jolly ? 0.2 : 0.08;
  }
  // next: the present he is about to throw ({ x: its lane, d: metres until it goes }), or null
  update(dt, t, dist, busy, px, next) {
    const w = this.wave; if (!w) return;
    const p = (this.progress = (dist - w.s0) / (w.s1 - w.s0)), r = this.root;
    this.st += dt;
    if ((this.state === 'in' || this.state === 'fight') && (busy || p >= 1)) { this.state = 'out'; this.st = 0; this.aim.alive = false; this.onEvent && this.onEvent('fled'); }
    if (this.state === 'in' && this.st > 1.3) { this.state = 'fight'; this.st = 0; }
    if (this.state === 'jolly' && this.st > 2.6) { this.state = 'out'; this.st = 0; }
    if (this.state === 'out' && this.st > 1.5) { this.clear(); this.onEvent && this.onEvent('gone'); return; }

    // he drifts across the pier, and lines himself up over the lane he is about to bomb
    const fight = this.state === 'fight';
    const want = fight && next && next.d < 45 ? next.x : this.state === 'jolly' ? px * 0.5 : Math.sin(t * 0.7) * 2.6;
    const ax = (want - this.x) * 14 - this.vx * 6; this.vx += ax * dt; this.x += this.vx * dt;
    this.wind += ((fight && next && next.d < 14 ? 1 : 0) - this.wind) * Math.min(1, dt * 6);
    this.throwT = Math.max(0, this.throwT - dt); this.flinch = Math.max(0, this.flinch - dt * 4);
    if (this.throwT <= 0 && this.load < 1) this.load = Math.min(1, this.load + dt * 2.5);

    let y = BASE_Y + Math.sin(t * 2.1) * 0.25, z = -AHEAD, x = this.x, spin = 0;
    if (this.state === 'in') { const k = 1 - Math.min(1, this.st / 1.3), e = k * k; x += e * 16; y += e * 15; z -= e * 40; }
    else if (this.state === 'out') { const e = this.st * this.st; y += e * 16; z -= e * 30; x += e * 6; spin = e * 0.5; }
    else if (this.state === 'jolly') y += Math.abs(Math.sin(this.st * 7)) * 0.5;
    r.position.set(x, y, z);
    r.rotation.set(-this.flinch * 0.16, Math.atan2(px - x, AHEAD) * 0.7 + spin, -this.vx * 0.05 + Math.sin(t * 1.3) * 0.04 + (this.state === 'jolly' ? Math.sin(this.st * 9) * 0.07 : 0));
    r.scale.setScalar(SIZE * (1 + this.flinch * 0.05));

    // head: it follows Robyn, shakes when he is hit, and nods along once he is jolly
    this.head.rotation.set((this.state === 'jolly' ? Math.sin(this.st * 9) * 0.12 : 0.12) - this.flinch * 0.2, Math.atan2(px - x, AHEAD) * 0.4, Math.sin(t * 40) * this.flinch * 0.12);
    // eyes: a slow angry pulse that flares just before a throw
    if (this.state !== 'jolly' && this.state !== 'out') {
      const k = 0.5 + 0.5 * Math.sin(t * 6), flare = this.wind;
      this.eyeMat.color.setRGB(1, 0.08 + 0.14 * k + 0.5 * flare, 0.03 + 0.2 * flare, THREE.SRGBColorSpace);
      this.haloMat.opacity = 0.45 + 0.2 * k + 0.35 * flare;
      for (const h of this.halos) h.scale.setScalar(0.85 + 0.15 * k + 0.6 * flare + this.flinch * 0.3);
    }
    // the arm: held up, drawn back before a throw, flung forward, and waved about once he is jolly
    const th = this.throwT > 0 ? 1 - this.throwT / 0.35 : 0;
    const swing = this.throwT > 0 ? Math.sin(th * PI) * 1.9 : 0;
    this.arm.rotation.set(-0.3 - this.wind * 0.8 + swing, 0, this.state === 'jolly' ? -0.5 + Math.sin(this.st * 11) * 0.5 : -0.3);
    this.gift.visible = this.state !== 'jolly' && this.load >= 1 && this.throwT <= 0; this.gift.rotation.y = t * 1.5;

    this.aim.wx = x; this.aim.wy = y + 2.45 * SIZE; this.aim.wz = z + 0.9 * SIZE;
  }
  throwNow() { this.throwT = 0.35; this.load = 0; }
  // where his raised mitten is, for sparkles
  hand() { return { x: this.root.position.x + 1.3 * SIZE, y: this.root.position.y + 4.3 * SIZE, z: this.root.position.z }; }
  target() { return this.state === 'fight' && this.progress > 0.05 ? this.aim : null; }
  // One of Robyn's bolts has landed. Returns true if that was the last of his grumpiness.
  hit() {
    if (this.state !== 'fight') return false;
    this.hp--; this.flinch = 1;
    if (this.hp > 0) return false;
    this.state = 'jolly'; this.st = 0; this.aim.alive = false; this.face(true);
    this.onEvent && this.onEvent('beaten');
    return true;
  }
}

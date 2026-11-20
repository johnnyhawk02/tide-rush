// Things that pass through the sky now and then: a plane towing a banner, a high jet with a vapour trail, a skein of geese,
// and (very occasionally) the Tide TV helicopter, which flies in to film Robyn for a few seconds.
// Positions are relative to Robyn, who always stands at the origin. None of it can be touched.
import * as THREE from 'three';
import { Builder, C, MAT, signMesh } from './kit.js';

const PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
// sky things ignore the fog and the bend of the world
const skyMat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }); skyMat.defines = { NO_BEND: '' };
const skyGlow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); skyGlow.defines = { NO_BEND: '' };
const blurMat = new THREE.MeshBasicMaterial({ color: 0xdfe8f2, fog: false, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }); blurMat.defines = { NO_BEND: '' };
function skyBuild(b) {
  const m = b.build({ material: skyMat, receive: false });
  m.traverse((o) => { if (o.material === MAT.glow) o.material = skyGlow; });
  return m;
}

function bannerPlane() {
  // nose towards -z
  const g = new THREE.Group(), b = new Builder(0.85);
  b.add(new THREE.SphereGeometry(1, 12, 8), (x, y, z) => (Math.abs(y) < 0.16 ? C.yellow : C.red), 0, 0, 0, 0, 0, 0, 0.55, 0.6, 2.6);
  b.box(8.2, 0.12, 1.3, C.cream, 0, 0.75, -0.6).box(7.4, 0.12, 1.2, C.cream, 0, -0.45, -0.5);                 // two wings
  for (const sx of [-1, 1]) { b.box(0.07, 1.2, 0.07, C.navy, sx * 2.6, 0.15, -0.55).box(0.07, 1.2, 0.07, C.navy, sx * 1.0, 0.15, -0.55); b.box(8.2 / 2 - 0.3, 0.13, 0.3, C.red, sx * 2.2, 0.76, -0.2); }
  b.box(2.6, 0.1, 0.8, C.cream, 0, 0.15, 2.3).box(0.1, 1.0, 0.8, C.red, 0, 0.6, 2.4);                            // tail
  b.cone(0.34, 0.5, C.navy, 0, 0, -2.75, -PI / 2, 0, 0, { seg: 8 });
  b.sph(0.26, 0x9a6a4a, 0, 0.62, 0.1, 1, 1, 1, { seg: 8 }).sph(0.27, 0x6b4a3a, 0, 0.7, 0.16, 1, 0.8, 1, { seg: 8 });   // pilot in a flying helmet
  for (const sx of [-1, 1]) b.cyl(0.04, 0.04, 0.8, C.navy, sx * 0.5, -0.8, -0.8, 0, 0, sx * 0.3).cyl(0.26, 0.26, 0.12, C.iron, sx * 0.64, -1.15, -0.8, 0, 0, PI / 2, { seg: 10 });
  g.add(skyBuild(b));
  const prop = new THREE.Mesh(new THREE.CircleGeometry(1.15, 16), blurMat); prop.position.z = -2.95; g.add(prop);
  const pb = new Builder(1); pb.box(2.3, 0.16, 0.05, C.woodDark, 0, 0, 0);
  const blade = skyBuild(pb); blade.position.z = -2.93; blade.name = 'prop'; g.add(blade);
  return g;
}
function banner(text) {
  const g = new THREE.Group();
  const s = signMesh(text, 15, 2.5, '#fff3d6', '#c4412f', '#ffc928');
  s.material = s.material.clone(); s.material.defines = { NO_BEND: '' }; s.material.fog = false; s.material.side = THREE.DoubleSide;
  g.add(s);
  for (const sx of [-1, 1]) { const p = skyBuild(new Builder(1).box(0.12, 2.9, 0.12, C.woodLight, 0, 0, 0)); p.position.x = sx * 7.6; g.add(p); }
  return g;
}
function jet() {
  // nose towards +x, with a long vapour trail behind
  const g = new THREE.Group(), b = new Builder(1);
  b.add(new THREE.SphereGeometry(1, 8, 6), 0xf4f7fb, 0, 0, 0, 0, 0, 0, 9, 1, 1);
  b.flat([[[2, 0, 0], [-4, 0, 9], [-5, 0, 0]], [[2, 0, 0], [-5, 0, 0], [-4, 0, -9]], [[-7, 0, 0], [-9, 3.4, 0], [-9, 0, 0]]], 0xdfe6ee);
  g.add(skyBuild(b));
  const trail = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-10, 0.9, 0, -10, -0.9, 0, -260, 0, 0], 3)), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  trail.material.defines = { NO_BEND: '' }; trail.frustumCulled = false; g.add(trail);
  return g;
}
function goose() {
  const g = new THREE.Group(), b = new Builder(1);
  b.sph(0.2, 0x4a4f58, 0, 0, 0, 1, 1, 2.6, { seg: 6 }).sph(0.12, 0x2c3038, 0, 0.06, -0.75, 1, 1, 1.6, { seg: 6 }).cone(0.05, 0.2, C.orange, 0, 0.05, -1.0, -PI / 2, 0, 0, { seg: 5 });
  g.add(skyBuild(b));
  const wing = (sx) => { const w = new Builder(1); w.flat([[[0, 0, -0.25], [0, 0, 0.3], [sx * 1.1, 0.05, 0.1]], [[sx * 1.1, 0.05, 0.1], [sx * 1.1, 0.05, -0.15], [0, 0, -0.25]], [[sx * 1.1, 0.05, 0.1], [sx * 2.0, 0, 0.2], [sx * 1.1, 0.05, -0.15]]], 0x5d636e); return skyBuild(w); };
  g.userData.l = wing(-1); g.userData.r = wing(1); g.add(g.userData.l, g.userData.r);
  return g;
}
function helicopter() {
  // nose towards +z; the Tide TV news helicopter, with a camera ball under its chin
  const g = new THREE.Group(), b = new Builder(0.85);
  b.add(new THREE.SphereGeometry(1, 14, 10), (x, y, z) => (y < -0.35 ? C.navy : Math.abs(y + 0.2) < 0.1 ? C.white : C.yellow), 0, 0, 0, 0, 0, 0, 1.15, 1.2, 1.9);
  b.add(new THREE.SphereGeometry(1, 12, 8, 0, PI * 2, 0, PI * 0.55), 0x9fd3e8, 0, 0.12, 0.75, 1.15, 0, 0, 1.0, 1.0, 1.0, { grad: 0.6 });   // glass nose
  b.cyl(0.28, 0.5, 3.6, C.yellow, 0, 0.25, -3.2, PI / 2, 0, 0, { seg: 8 }).box(0.12, 1.5, 0.9, C.navy, 0, 0.9, -4.9, -0.3, 0, 0).box(1.5, 0.1, 0.5, C.navy, 0, 0.3, -4.6);
  b.cyl(0.14, 0.14, 0.6, C.iron, 0, 1.4, -0.1).box(1.0, 0.5, 1.5, C.navy, 0, 1.15, -0.2);
  for (const sx of [-1, 1]) {
    b.box(0.1, 0.1, 3.3, C.iron, sx * 0.95, -1.55, 0.1).box(0.1, 0.1, 0.5, C.iron, sx * 0.95, -1.42, 1.85, -0.6, 0, 0);
    for (const z of [-0.8, 0.9]) b.box(0.08, 0.6, 0.08, C.iron, sx * 0.85, -1.25, z, 0, 0, sx * 0.3);
    b.box(0.04, 0.7, 0.9, C.navy, sx * 1.14, 0.0, -0.5);                                                         // door
  }
  b.sph(0.34, C.iron, 0, -1.05, 1.25, 1, 1, 1, { seg: 10 }).cyl(0.16, 0.16, 0.2, 0x8ff0ff, 0, -1.12, 1.56, PI / 2 + 0.3, 0, 0, { glow: true, grad: 0.8, seg: 10 });   // camera
  b.sph(0.12, 0xff4a3a, 0, 0.75, -4.95, 1, 1, 1, { glow: true, seg: 6, grad: 1 }).sph(0.1, 0x7dff8a, 1.15, -0.2, 0.4, 1, 1, 1, { glow: true, seg: 6, grad: 1 }).sph(0.1, 0xff4a3a, -1.15, -0.2, 0.4, 1, 1, 1, { glow: true, seg: 6, grad: 1 });
  g.add(skyBuild(b));
  for (const sx of [-1, 1]) {
    const s = signMesh('TIDE TV', 1.9, 0.5, '#22365c', '#ffc928', '#fff3d6'); s.material = s.material.clone(); s.material.defines = { NO_BEND: '' }; s.material.fog = false;
    s.position.set(sx * 0.36, 0.25, -3.1); s.rotation.y = sx * PI / 2; s.scale.setScalar(0.8); s.position.x = sx * 0.42; g.add(s);
  }
  const rotor = new THREE.Group(); rotor.position.set(0, 1.72, -0.1); rotor.name = 'rotor';
  const rb = new Builder(1); rb.box(10.5, 0.06, 0.34, C.iron, 0, 0, 0).box(0.34, 0.06, 10.5, C.iron, 0, 0, 0).cyl(0.3, 0.3, 0.2, C.navy, 0, 0, 0);
  rotor.add(skyBuild(rb));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.3, 24).rotateX(-PI / 2), blurMat); rotor.add(disc);
  g.add(rotor);
  const tail = new THREE.Group(); tail.position.set(0.2, 0.95, -4.95); tail.name = 'tail';
  const tb = new Builder(1); tb.box(0.05, 1.7, 0.16, C.iron, 0, 0, 0).box(0.05, 0.16, 1.7, C.iron, 0, 0, 0);
  tail.add(skyBuild(tb)); g.add(tail);
  // searchlight for the night and the storm
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 16, 14, 1, true).translate(0, -8, 0), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.material.defines = { NO_BEND: '' }; beam.position.set(0, -1.0, 1.2); beam.name = 'beam'; g.add(beam);
  return g;
}

const BANNERS = ['GO ROBYN GO!', 'TIDE RUSH', 'HELLO ROBYN!', 'ICE CREAM 99p', 'MIND THE CRABS'];

export class SkyLife {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.planeT = rand(9, 16); this.flockT = rand(4, 9); this.jetT = rand(15, 30); this.heliT = rand(32, 50);
    this.onHeli = null; this.onPlane = null;   // callbacks: (phase) => {}
    this.plane = null; this.flock = null; this.jet = null; this.heli = null; this.bi = Math.floor(Math.random() * BANNERS.length);
  }
  make(key, fn) { const k = '_' + key; if (!this[k]) { this[k] = fn(); this[k].visible = false; this.group.add(this[k]); } return this[k]; }
  reset() {
    for (const k of ['plane', 'flock', 'jet', 'heli']) { if (this[k]) this[k].o.visible = false; this[k] = null; }
    this.heliT = rand(32, 50); this.planeT = rand(9, 16); this.flockT = rand(4, 9);
  }

  // ctx: { run (playing), hidden (in the warp tunnel), clear (no cave roof overhead for a while), calm (no storm), night (0..1) }
  update(dt, t, ctx) {
    this.group.visible = !ctx.hidden;
    const go = ctx.run && !ctx.hidden && ctx.clear;
    if (ctx.run) { this.planeT -= dt; this.flockT -= dt; this.jetT -= dt; this.heliT -= dt; }

    // a plane towing a banner across the view
    if (!this.plane && this.planeT <= 0 && go && ctx.calm) {
      const dir = Math.random() < 0.5 ? 1 : -1, o = this.make('plane', () => { const g = new THREE.Group(); g.add(bannerPlane()); return g; });
      if (this._banner) { o.remove(this._banner); this._banner.children[0].geometry.dispose(); }
      this._banner = banner(BANNERS[this.bi++ % BANNERS.length]); o.add(this._banner);
      o.children[0].rotation.y = dir > 0 ? -PI / 2 : PI / 2; o.children[0].scale.setScalar(1.25);
      this._banner.position.set(-dir * 15, -0.3, 0);
      this.plane = { o, dir, x: -dir * 135, y: rand(24, 31), z: -rand(85, 105) };
      o.visible = true; this.planeT = rand(28, 50);
      if (this.onPlane) this.onPlane();
    }
    if (this.plane) {
      const p = this.plane; p.x += p.dir * 15 * dt;
      p.o.position.set(p.x, p.y + Math.sin(t * 0.8) * 0.8, p.z); p.o.children[0].rotation.z = Math.sin(t * 0.8) * 0.06;
      p.o.children[0].getObjectByName('prop').rotation.z += dt * 40;
      this._banner.rotation.y = Math.sin(t * 3) * 0.1; this._banner.position.y = -0.3 + Math.sin(t * 2.2) * 0.25;
      if (Math.abs(p.x) > 150) { p.o.visible = false; this.plane = null; }
    }

    // a jet, high and far away
    if (!this.jet && this.jetT <= 0 && go && ctx.calm) {
      const dir = Math.random() < 0.5 ? 1 : -1, o = this.make('jet', jet);
      o.rotation.y = dir > 0 ? 0 : PI; o.rotation.z = 0.05;
      this.jet = { o, dir, x: -dir * 620, y: rand(150, 210), z: -rand(430, 520) };
      o.visible = true; this.jetT = rand(40, 75);
    }
    if (this.jet) {
      const j = this.jet; j.x += j.dir * 55 * dt; j.o.position.set(j.x, j.y + (j.x * j.dir + 620) * 0.03, j.z);
      if (Math.abs(j.x) > 900) { j.o.visible = false; this.jet = null; }
    }

    // a skein of geese
    if (!this.flock && this.flockT <= 0 && go && ctx.calm) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const o = this.make('flock', () => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const b = goose(), k = Math.ceil(i / 2), side = i % 2 ? 1 : -1; b.position.set(-k * 1.9, k * 0.25, side * k * 1.7); b.userData.p = i * 0.9; b.rotation.y = -PI / 2; b.scale.setScalar(1.3); g.add(b); } return g; });
      o.rotation.y = dir > 0 ? 0 : PI;
      this.flock = { o, dir, x: -dir * 95, y: rand(15, 24), z: -rand(45, 80), dz: rand(-2.5, 2.5) };
      o.visible = true; this.flockT = rand(16, 32);
    }
    if (this.flock) {
      const f = this.flock; f.x += f.dir * 10.5 * dt; f.z += f.dz * dt;
      f.o.position.set(f.x, f.y + Math.sin(t * 0.6) * 0.6, f.z);
      for (const b of f.o.children) { const a = Math.sin(t * 8 + b.userData.p) * 0.6; b.userData.l.rotation.z = -a; b.userData.r.rotation.z = a; }
      if (Math.abs(f.x) > 110) { f.o.visible = false; this.flock = null; }
    }

    // the Tide TV helicopter: in, hover and film, away
    if (!this.heli && this.heliT <= 0 && go) {
      const side = -1, o = this.make('heli', helicopter);   // it comes in from the sea
      this.heli = { o, side, t: 0, phase: 'in', from: new THREE.Vector3(side * 70, 34, -150), hover: new THREE.Vector3(side * 4.6, 11.4, -25), to: new THREE.Vector3(-side * 85, 40, -70), told: false };
      o.visible = true; this.heliT = rand(95, 170);
      if (this.onHeli) this.onHeli('in');
    }
    if (this.heli) {
      const h = this.heli, o = h.o; h.t += dt;
      const ease = (k) => k * k * (3 - 2 * k);
      let bank = 0, pitch = 0.12;
      if (h.phase === 'in') {
        const k = Math.min(1, h.t / 3.2); o.position.lerpVectors(h.from, h.hover, ease(k)); pitch = 0.3 * (1 - k) + 0.1; bank = -h.side * 0.35 * Math.sin(k * PI);
        if (k >= 1) { h.phase = 'hover'; h.t = 0; }
      } else if (h.phase === 'hover') {
        o.position.set(h.hover.x + Math.sin(t * 0.7) * 1.4, h.hover.y + Math.sin(t * 1.3) * 0.45, h.hover.z + Math.sin(t * 0.5) * 1.5); bank = Math.cos(t * 0.7) * 0.08;
        if (!h.told && h.t > 0.4) { h.told = true; if (this.onHeli) this.onHeli('hover'); }
        if (h.t > 7.5 || !ctx.run || !ctx.clear) { h.phase = 'out'; h.t = 0; h.from.copy(o.position); if (this.onHeli) this.onHeli('out'); }
      } else {
        const k = Math.min(1, h.t / 3.4), e = k * k; o.position.lerpVectors(h.from, h.to, e); pitch = 0.12 + 0.3 * k; bank = h.side * 0.4 * Math.sin(k * PI * 0.7);
        if (k >= 1) { o.visible = false; this.heli = null; return; }
      }
      // keep its nose (and the camera) pointing at Robyn while it is near; fly nose-first when leaving
      const yawTo = h.phase === 'out' ? Math.atan2(h.to.x - h.from.x, h.to.z - h.from.z) : Math.atan2(-o.position.x, 1 - o.position.z);
      let d = yawTo - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      o.rotation.order = 'YXZ'; o.rotation.y += d * Math.min(1, dt * 3.5); o.rotation.x = pitch; o.rotation.z = bank;
      o.getObjectByName('rotor').rotation.y += dt * 30; o.getObjectByName('tail').rotation.x += dt * 44;
      const beam = o.getObjectByName('beam'); beam.visible = ctx.night > 0.5 || !ctx.calm; beam.rotation.x = -0.5;
    }
  }
}

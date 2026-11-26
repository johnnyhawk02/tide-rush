// Big Izzi: in Izzi World a giant Izzi head floats up over the far end of the boards and fires laser beams from her eyes.
// The beams are only for fun. Each one lands on the planks in a lane and runs back along it towards Robyn, and if it
// reaches her she glows all over for a few seconds. It never makes her stumble, and it never touches the obstacles.
// Like Grumpy Santa she is a "show": while she is about, the pets, planes and flying attackers wait (showOn in main.js).
import * as THREE from 'three';
import { puffTexture } from './kit.js';
import { buildIzziHead } from './pets.js';
import { LANE_W, clamp } from './config.js';

const PI = Math.PI, AHEAD = 34, BASE_Y = 9.6, SIZE = 26;
const EYE = [0.07, 0.03, -0.15];                      // where her eyes are on the pet model's head (it faces -Z)
const PINK = 0xff4fd8, CORE = 0xfff0ff;
const LOCK = 0.2, T_IN = 1.6, T_LOOK = 0.95, T_CHARGE = 0.85, T_FIRE = 0.8, T_HAPPY = 1.4, T_OUT = 1.5;
const SPOT_Z0 = -22, SPOT_Z1 = 4;                     // where a beam first lands, and how far it runs (Robyn is at z = 0)

// a unit beam: a cylinder from y = 0 to y = 1, cut into lengths so that it follows the bend of the world
const BEAM_GEO = new THREE.CylinderGeometry(1, 1, 1, 10, 18, true).translate(0, 0.5, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

export class BigIzzi {
  constructor(scene) {
    this.scene = scene; this.root = null; this.state = 'off'; this.wave = null; this.onEvent = null;
  }
  build() {
    const root = (this.root = new THREE.Group());
    const { head, jaw, ears } = buildIzziHead();
    head.rotation.y = PI;                                   // turn her round to face Robyn
    const holder = (this.holder = new THREE.Group()); holder.add(head); holder.scale.setScalar(SIZE); root.add(holder);
    this.jaw = jaw; this.ears = ears;
    head.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    // the eyes light up pink: a bright bead and a soft halo over each one
    this.eyeMat = new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.haloMat = new THREE.MeshBasicMaterial({ map: puffTexture(), color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const bead = new THREE.SphereGeometry(0.03, 12, 9), halo = new THREE.CircleGeometry(0.075, 20);
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const at = new THREE.Group(); at.position.set(sx * EYE[0], EYE[1], EYE[2]); head.add(at);
      const e = new THREE.Mesh(bead, this.eyeMat); e.renderOrder = 4; at.add(e);
      const h = new THREE.Mesh(halo, this.haloMat); h.position.z = -0.01; h.rotation.y = PI; h.renderOrder = 4; at.add(h);
      this.eyes.push({ at, halo: h });
    }
    // the two beams, each a pink glow round a bright core
    this.beamMat = new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.coreMat = new THREE.MeshBasicMaterial({ color: CORE, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.beams = [0, 1].map(() => {
      const g = new THREE.Group(), glow = new THREE.Mesh(BEAM_GEO, this.beamMat), core = new THREE.Mesh(BEAM_GEO, this.coreMat);
      glow.scale.set(0.3, 1, 0.3); core.scale.set(0.09, 1, 0.09); glow.renderOrder = 4; core.renderOrder = 4;
      g.add(glow, core); g.visible = false; this.scene.add(g);
      return g;
    });
    // where the beams meet the planks: a bright splash
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: puffTexture(), color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.spot.rotation.x = -PI / 2; this.spot.renderOrder = 4; this.spot.visible = false; this.scene.add(this.spot);
    // and a faint line along the lane she is about to fire down, so that you can see it coming
    this.aimLine = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1, 1, 12).rotateX(-PI / 2).translate(0, 0, -0.5), new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.aimLine.renderOrder = 3; this.aimLine.visible = false; this.scene.add(this.aimLine);
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    for (const b of this.beams) b.traverse((o) => { o.frustumCulled = false; });
    this.spot.frustumCulled = false; this.aimLine.frustumCulled = false;
  }
  get active() { return this.state !== 'off'; }
  get firing() { return this.state === 'fire'; }
  begin(wave) {
    if (!this.root) this.build();
    this.scene.add(this.root);
    Object.assign(this, { wave, state: 'in', st: 0, x: 0, vx: 0, lane: 0, n: 0, decoy: false, hitDone: false, spotZ: SPOT_Z0, tilt: 0 });
  }
  clear() {
    if (this.root && this.root.parent) this.scene.remove(this.root);
    if (this.beams) { for (const b of this.beams) b.visible = false; this.spot.visible = false; this.aimLine.visible = false; }
    this.state = 'off'; this.wave = null;
  }
  // a beam's spot is passing Robyn's place on the boards: is she in its lane?
  // dist: metres run, busy: in the warp tunnel or on the rocket, px: Robyn's x, plane: the lane she is in (or heading for)
  update(dt, t, dist, busy, px, plane) {
    const w = this.wave; if (!w) return;
    this.st += dt;
    const go = (s) => { this.state = s; this.st = 0; };
    const over = dist >= w.s1;
    if (busy && this.state !== 'out') go('out');
    switch (this.state) {
      case 'in': if (this.st > T_IN) go('look'); break;
      case 'look': if (this.st > T_LOOK) { if (over) go('happy'); else { go('charge'); this.decoy = this.n % 3 === 2; this.lane = this.decoy ? ((plane + 2 + (t * 7 | 0) % 2) % 3) - 1 : plane; this.onEvent && this.onEvent('charge'); } } break;
      // (she keeps her eyes on Robyn's lane while she charges, and locks on just before she fires, so a quick hop sideways dodges it;
      // every third beam goes down another lane, just to show off)
      case 'charge': if (!this.decoy && this.st < T_CHARGE - LOCK) this.lane = plane; if (this.st > T_CHARGE) { go('fire'); this.hitDone = false; this.onEvent && this.onEvent('fire'); } break;
      case 'fire': if (this.st > T_FIRE) { this.n++; go('look'); } break;
      case 'happy': if (this.st > T_HAPPY) { go('out'); this.onEvent && this.onEvent('bye'); } break;
      case 'out': if (this.st > T_OUT) { this.clear(); this.onEvent && this.onEvent('gone'); return; } break;
    }
    const st = this.state;
    // she drifts over the lane she is aiming at, and otherwise sways gently from side to side
    const want = st === 'charge' || st === 'fire' ? this.lane * LANE_W * 0.6 : Math.sin(t * 0.6) * 2.2;
    const ax = (want - this.x) * 6 - this.vx * 4; this.vx += ax * dt; this.x += this.vx * dt;
    let y = BASE_Y + Math.sin(t * 1.7) * 0.35, z = -AHEAD, x = this.x;
    if (st === 'in') { const k = 1 - clamp(this.st / T_IN, 0, 1), e = k * k; y -= e * 16; z -= e * 18; }       // she rises up from behind the far end of the boards
    else if (st === 'out') { const e = clamp(this.st / T_OUT, 0, 1) ** 2; y += e * 22; z -= e * 20; }
    else if (st === 'happy') y += Math.abs(Math.sin(this.st * 8)) * 0.9;
    this.root.position.set(x, y, z);
    // she tilts her head like a dog listening, looks down the lane when she fires, and wags it about when she is happy
    const look = st === 'charge' || st === 'fire' ? 0.3 : 0.12;
    this.tilt += ((st === 'look' ? Math.sin(t * 0.9) * 0.22 : st === 'happy' ? Math.sin(this.st * 10) * 0.18 : 0) - this.tilt) * Math.min(1, dt * 4);
    this.holder.rotation.set(look, Math.atan2(px - x, AHEAD) * 0.5, this.tilt);
    // ears perk up as she charges; her mouth pants, and opens wide in a grin when she is happy
    const perk = st === 'charge' ? clamp(this.st / T_CHARGE, 0, 1) : st === 'fire' ? 1 : 0;
    this.ears.forEach((e, i) => { e.rotation.x = -0.25 * perk + Math.sin(t * 3 + i) * 0.06; e.rotation.z = (i ? 1 : -1) * (st === 'happy' ? 0.25 + Math.sin(this.st * 10 + i) * 0.15 : 0.05); });
    this.jaw.rotation.x = st === 'happy' ? 0.45 : st === 'fire' ? 0.05 : 0.14 + 0.07 * Math.sin(t * 9);

    // the eyes: dark until she charges up, then brighter and brighter; blazing while she fires
    const glow = st === 'charge' ? perk * perk : st === 'fire' ? 1 : 0;
    this.eyeMat.opacity = glow; this.haloMat.opacity = 0.9 * glow;
    for (const e of this.eyes) e.halo.scale.setScalar(0.6 + 0.7 * glow + (st === 'fire' ? Math.sin(t * 40) * 0.12 : 0));
    // the aiming line along her lane
    const lx = this.lane * LANE_W;
    this.aimLine.visible = st === 'charge';
    if (this.aimLine.visible) { this.aimLine.position.set(lx, 0.04, 2); this.aimLine.scale.set(1, 1, 2 - SPOT_Z0); this.aimLine.material.opacity = 0.12 + 0.2 * perk * (0.6 + 0.4 * Math.sin(t * 24)); }
    // the beams, from her eyes down to the spot, which runs back along the lane
    const fire = st === 'fire', u = fire ? this.st / T_FIRE : 0;
    for (const b of this.beams) b.visible = fire;
    this.spot.visible = fire;
    this.result = null;
    if (fire) {
      const z0 = this.spotZ, z1 = (this.spotZ = SPOT_Z0 + (SPOT_Z1 - SPOT_Z0) * Math.min(1, u * 1.15));
      const fade = Math.min(1, this.st * 10) * Math.min(1, (1 - u) * 6);
      this.beamMat.opacity = 0.55 * fade; this.coreMat.opacity = 0.95 * fade; this.spot.material.opacity = 0.9 * fade;
      _b.set(lx, 0.05, z1);
      this.root.updateMatrixWorld(true);
      this.eyes.forEach((e, i) => {
        e.at.getWorldPosition(_a);
        const g = this.beams[i]; _d.subVectors(_b, _a); const len = _d.length();
        g.position.copy(_a); g.quaternion.setFromUnitVectors(UP, _d.normalize()); g.scale.set(1 + Math.sin(t * 50 + i) * 0.15, len, 1 + Math.sin(t * 50 + i) * 0.15);
      });
      this.spot.position.set(lx, 0.06, z1); this.spot.scale.setScalar(0.9 + Math.sin(t * 30) * 0.15);
      // has the spot just run over Robyn's place, in her lane?
      if (!this.hitDone && z0 < 0.3 && z1 >= -0.3) { this.hitDone = true; if (Math.abs(px - lx) < LANE_W * 0.55) this.result = 'hit'; }
      this.spotAt = { x: lx, z: z1 };
    } else this.spotAt = null;
  }
}

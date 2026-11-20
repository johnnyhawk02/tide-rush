// Alien invader waves: a formation of little aliens that marches from side to side in the sky ahead of Robyn,
// stepping lower and lower, while she shoots them down by herself. Clear the whole wave for a bonus.
// The formation is only for show and for points: what must be dodged are the bombs it drops, and those are
// laid by the track generator like any rolling barrel, so the safe path is never blocked.
import * as THREE from 'three';
import { obtain, release } from './obstacles.js';

const ROWS = ['invTop', 'invMid', 'invLow'], COLS = 5, GAP_X = 1.9, GAP_Y = 1.6, AHEAD = 16, SIZE = 1.5;
const TOP = 7.0, BOTTOM = 4.5, STEPS = 8;

export class Invaders {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.list = []; this.wave = null; this.flee = false; this.onEvent = null; this.progress = 0;
  }
  get active() { return !!this.wave; }
  get alive() { let n = 0; for (const a of this.list) if (a.alive) n++; return n; }
  begin(wave) {
    this.clear();
    this.wave = wave; this.flee = false; this.x = -GAP_X * 0.6; this.dir = 1; this.beatT = 0.4; this.beat = 0; this.y = TOP + 9; this.fleeT = 0; this.progress = 0;
    ROWS.forEach((name, r) => {
      for (let c = 0; c < COLS; c++) {
        const mesh = obtain(name); this.group.add(mesh);
        this.list.push({ mesh, r, c, alive: true, aimed: false, zap: 0, wx: 0, wy: 30, wz: -AHEAD, p: Math.random() * 6, vx: (Math.random() - 0.5) * 8 });
      }
    });
    this.total = this.list.length;
  }
  clear() {
    for (const a of this.list) release(a.mesh);
    this.list = []; this.wave = null; this.flee = false;
  }
  // busy: Robyn is on the rocket or in a warp tunnel, so the invaders give up and zoom away
  update(dt, t, dist, busy) {
    const w = this.wave; if (!w) return;
    const p = (this.progress = (dist - w.s0) / (w.s1 - w.s0)), alive = this.alive;
    if (!this.flee && alive && (busy || p >= 1)) { this.flee = true; this.onEvent && this.onEvent('fled', alive); }
    // the march: a step sideways on every beat, quicker as their numbers thin, turning round at each edge
    if (!this.flee && alive) {
      this.beatT -= dt;
      if (this.beatT <= 0) {
        this.beatT = 0.13 + 0.34 * (alive / this.total); this.beat++;
        this.x += this.dir * 0.42; if (Math.abs(this.x) > 1.4) this.dir = -Math.sign(this.x);
        this.onEvent && this.onEvent('step', this.beat);
      }
    }
    // they come down a step at a time as the wave goes on
    const target = TOP - (TOP - BOTTOM) * (Math.floor(Math.min(1, Math.max(0, p)) * STEPS) / STEPS);
    this.y += (target - this.y) * Math.min(1, dt * 7);
    if (this.flee) this.fleeT += dt;
    const pose = this.beat % 2 ? 1 : -1;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i], m = a.mesh;
      if (a.zap > 0) {
        // zapped: a quick spin and it is gone
        a.zap += dt; m.rotation.y += dt * 20; m.scale.setScalar(Math.max(0.02, 1 - a.zap / 0.22) * SIZE);
        if (a.zap > 0.22) { release(m); this.list.splice(i, 1); }
        continue;
      }
      if (this.flee) { a.wy += (8 + this.fleeT * 40) * dt; a.wx += a.vx * dt; m.rotation.z += dt * 6; }
      else {
        a.wx = this.x + (a.c - (COLS - 1) / 2) * GAP_X; a.wy = this.y + (ROWS.length - 1 - a.r) * GAP_Y + Math.sin(t * 3 + a.p) * 0.07;
        m.rotation.z = pose * (a.r % 2 ? -0.16 : 0.16); m.rotation.y = Math.sin(t * 1.7 + a.p) * 0.2;
        m.scale.set(SIZE * (1 + pose * 0.05), SIZE * (1 - pose * 0.05), SIZE);
      }
      m.position.set(a.wx, a.wy, a.wz);
    }
    if (!this.list.length || (this.flee && this.fleeT > 1.3)) this.clear();
  }
  // The next one for Robyn to shoot: the lowest row first, and in that row whichever is nearest to her lane.
  target(px) {
    if (this.flee || this.progress < 0.1) return null;
    let best = null, score = -1e9;
    for (const a of this.list) { if (!a.alive || a.aimed) continue; const sc = a.r * 100 - Math.abs(a.wx - px); if (sc > score) { score = sc; best = a; } }
    return best;
  }
  hit(a) {
    a.alive = false; a.zap = 0.0001;
    if (!this.alive) this.onEvent && this.onEvent('cleared', this.total);
  }
}

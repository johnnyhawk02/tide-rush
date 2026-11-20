// The endless boardwalk: scenery chunks, the deck (with real gaps), and the obstacle pattern generator.
// The generator keeps one "safe" lane per row that only ever needs a lane change or a jump, so every run is fair.
import * as THREE from 'three';
import { Builder, C, makeRng, pick, plankTexture, sliceZ } from './kit.js';
import { CHUNK, DECK_HALF, LANE_W, laneX, PLAT_H, ZONE_CHUNKS, ZONE_LEN, zoneOfLevel, JUMP_H, speedAt, diffAt, jumpTimeAt, lerp, clamp, ROOFED } from './config.js';
import { obtain, release, obstacleDef, portalMat, LOW_TYPES, LOW_BY_ZONE, TALL_TYPES } from './obstacles.js';
import { populate, animate } from './scenery.js';

const LANES = [-1, 0, 1];
export const zoneAtS = (s) => zoneOfLevel(Math.floor(Math.max(0, s) / ZONE_LEN));
const POWER_TYPES = ['magnet', 'shield', 'boots', 'gem'];
export const LETTERS = 'ROBYN';
// Flying on the rocket and running the warp tunnel are faster than normal running (main.js uses these too).
export const WARP_SPEED = 1.3, WARP_TIME = 9, PAD_BOOST = 1.55;

function deckTopGeo(rects) {
  const n = rects.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
  rects.forEach(([x0, x1, s0, s1], i) => {
    const p = [[x0, -s0], [x1, -s0], [x1, -s1], [x0, -s1]];
    p.forEach(([x, z], k) => {
      pos.set([x, 0, z], i * 12 + k * 3); nor.set([0, 1, 0], i * 12 + k * 3);
      uv.set([x / (LANE_W * 2), -z / 4], i * 8 + k * 2);
    });
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return sliceZ(g);
}

// The flying attackers: how high each hovers, how big it is drawn, and what it lobs down the lane.
const FLYERS = {
  ufo: { y: 5.4, size: 1.5, shot: 'plasma', crackle: true },
  gull: { y: 4.7, size: 1.35, shot: 'egg' },
  bat: { y: 4.5, size: 1.4, shot: 'slime', crackle: true },
  stormcloud: { y: 5.0, size: 1.3, shot: 'spark', crackle: true },
  snowcloud: { y: 5.0, size: 1.3, shot: 'snowball' },
  flosscloud: { y: 5.0, size: 1.3, shot: 'bonbon' },
  twister: { y: 5.0, size: 1.3, shot: 'whirl', crackle: true },
  eagle: { y: 4.8, size: 1.35, shot: 'pinecone' },
  bandit: { y: 5.2, size: 1.35, shot: 'waterBalloon' },
  inkOcto: { y: 4.5, size: 1.3, shot: 'inkBlob' },
  chocJug: { y: 4.8, size: 1.3, shot: 'chocDrop' },
  crow: { y: 4.8, size: 1.35, shot: 'cornCob' },
};
// Which attacker each level has, and how often a "roller" row is one of them rather than a plain rolling thing.
const ATTACKER = { 0: ['gull', 0.6], 1: ['gull', 0.6], 2: ['gull', 0.6], 3: ['bat', 0.65], 4: ['stormcloud', 0.75], 5: ['gull', 0.6], 6: ['bat', 0.7], 7: ['snowcloud', 0.7], 8: ['bat', 0.5], 9: ['ufo', 1], 10: ['snowcloud', 0.3], 11: ['flosscloud', 0.65], 12: ['twister', 0.65], 13: ['eagle', 0.6], 14: ['bandit', 0.55], 15: ['inkOcto', 0.6], 16: ['chocJug', 0.6], 17: ['crow', 0.6] };

export class Track {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.world = new THREE.Group(); this.group.add(this.world);     // scenery and deck; hidden inside the warp tunnel
    this.deckMat = new THREE.MeshLambertMaterial({ map: plankTexture() });
    this.fullTop = deckTopGeo([[-DECK_HALF, DECK_HALF, 0, CHUNK]]);
    const ub = new Builder(0.7); ub.box(DECK_HALF * 2, 0.28, CHUNK, C.woodDeep, 0, -0.145, -CHUNK / 2);
    this.fullUnder = ub.build({ receive: false }).geometry;
    this.underMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.chunks = new Map();
    this.obstacles = []; this.holes = []; this.platforms = []; this.coins = []; this.powerups = []; this.decos = []; this.rows = [];
    this.pads = []; this.portals = []; this.letters = []; this.ufos = []; this.waves = [];
    this.wantLetter = 0;      // index into LETTERS of the next letter to offer, or -1 for none (set by the game)
    this.rng = makeRng((Math.random() * 1e9) | 0);
    this.genEnabled = false; this.runStart = 0; this.noGapBefore = 0;
    this.gen = this.newGen(0);
    this.t = 0;
  }

  newGen(s) { return { s, safe: 0, last: '', plat: null, clear: null, nextPower: s + 200 + this.rng() * 120, lastPower: '', nextLetter: s + 60 + this.rng() * 60, portalLevel: -1, laserLevel: -1, laserWant: false, waveLevel: -1 }; }
  clearObjects() {
    for (const o of this.obstacles) { o.mesh.position.y = 0; release(o.mesh); }
    for (const a of [this.pads, this.portals, this.letters, this.ufos]) for (const p of a) release(p.mesh);
    this.pads = []; this.portals = []; this.letters = []; this.ufos = []; this.waves = [];
    for (const c of this.coins) release(c.mesh);
    for (const p of this.powerups) release(p.mesh);
    for (const d of this.decos) release(d.mesh);
    for (const p of this.platforms) p.meshes.forEach(release);
    this.obstacles = []; this.holes = []; this.platforms = []; this.coins = []; this.powerups = []; this.decos = []; this.rows = [];
  }
  clearChunks() {
    for (const [, c] of this.chunks) { this.world.remove(c.group); c.own.forEach((g) => g.dispose()); }
    this.chunks.clear();
  }
  // Full restart from distance 0.
  reset() {
    this.clearObjects(); this.clearChunks();
    this.rng = makeRng((Math.random() * 1e9) | 0);
    this.genEnabled = false; this.runStart = 0; this.noGapBefore = 0;
    this.gen = this.newGen(0);
  }
  // Begin generating obstacles for a run that starts at `dist`.
  startRun(dist) {
    this.runStart = dist; this.genEnabled = true;
    let maxEnd = 0;
    for (const [i] of this.chunks) maxEnd = Math.max(maxEnd, (i + 1) * CHUNK);
    this.noGapBefore = maxEnd + 1;
    this.gen = this.newGen(dist + 58);
    // a welcome trail of shells
    for (let i = 0; i < 8; i++) this.addCoin(0, 0.95, dist + 22 + i * 1.8);
  }
  // Carry on generating after the warp tunnel (which clears the track), starting a little way ahead in the player's lane.
  resumeGen(dist, lane) {
    this.genEnabled = true; this.gen.waveLevel = -1;      // the tunnel swept away any wave that was waiting, so the level may plan one afresh
    let maxEnd = 0;
    for (const [i] of this.chunks) maxEnd = Math.max(maxEnd, (i + 1) * CHUNK);
    this.noGapBefore = maxEnd + 1;
    const g = this.gen;
    Object.assign(g, { s: dist + 52, safe: lane, last: '', plat: null, clear: null, nextPower: Math.max(g.nextPower, dist + 120), nextLetter: Math.max(g.nextLetter, dist + 70) });
  }

  // ---------- spawning ----------
  spawnObstacle(name, lane, s, extra) {
    const def = obstacleDef(name), mesh = obtain(name);
    const o = { name, kind: def.kind, lane, x: laneX(lane), s: s + def.d / 2, w: def.w, h: def.h, d: def.d, mesh, y: def.center ? def.h / 2 : 0, rat: !!def.rat, zappable: !!(def.rat || def.zap), ...extra };
    mesh.position.set(o.x, o.y, -o.s);
    if (def.d < 2.5 && !def.center && name !== 'barrier') mesh.rotation.y = (this.rng() - 0.5) * 0.16;
    this.group.add(mesh); this.obstacles.push(o);
    return o;
  }
  addCoin(x, y, s, pearl = false) {
    const mesh = obtain(pearl ? 'pearl' : 'shell'); mesh.position.set(x, y, -s);
    this.group.add(mesh); this.coins.push({ x, y, s, mesh, y0: y, pearl });
  }
  coinsLine(lane, s0, s1, y = 0.95, step = 1.7) { for (let s = s0; s <= s1 + 0.01; s += step) this.addCoin(laneX(lane), y, s); }
  coinsArc(lane, sc, len, base = 0, peak = JUMP_H * 0.82, n = clamp(Math.round(len / 2.1), 4, 7)) {
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; this.addCoin(laneX(lane), base + 0.95 + peak * 4 * t * (1 - t), sc - len / 2 + len * t); }
  }
  addPad(lane, s) {
    const mesh = obtain('pad'); mesh.position.set(laneX(lane), 0, -s);
    this.group.add(mesh); this.pads.push({ lane, x: laneX(lane), s, mesh, t: 0 });
  }
  addPortal(lane, s) {
    const mesh = obtain('portal'); mesh.position.set(laneX(lane), 0, -s);
    this.group.add(mesh); this.portals.push({ lane, x: laneX(lane), s, mesh });
  }
  // A flying attacker (a UFO, bomber gull, slime bat or cross cloud) hovers over the lane and lobs `ball`,
  // a shot that drops to the deck and comes along the lane toward the player.
  addUfo(lane, s, ball, kind = 'ufo') {
    const F = FLYERS[kind], mesh = obtain(kind); mesh.position.set(laneX(lane), F.y, -s);
    this.group.add(mesh); this.ufos.push({ kind, lane, x: laneX(lane), y: F.y, size: F.size, s, mesh, ball, p: this.rng() * 6 });
  }
  addLetter(i, x, y, s) {
    const mesh = obtain('letter:' + LETTERS[i]); mesh.position.set(x, y, -s);
    this.group.add(mesh); this.letters.push({ i, x, y, s, mesh });
  }
  addPower(type, x, y, s) {
    const mesh = obtain('pw:' + type); mesh.position.set(x, y, -s);
    this.group.add(mesh); this.powerups.push({ type, x, y, s, mesh });
  }

  generateTo(sMax) { if (this.genEnabled) { let guard = 0; while (this.gen.s < sMax && guard++ < 200) this.genRow(); } }

  genRow() {
    const g = this.gen, rng = this.rng;
    const s = g.s, run = s - this.runStart;
    const v = speedAt(run), diff = diffAt(run), jt = jumpTimeAt(run);
    // a run starts gently: over the first two levels the rows are further apart and emptier, and the trickier
    // things (barriers, gaps, rollers, attackers, things that cross) join in one at a time
    const ease = clamp(run / 560, 0, 1);
    const spacing = v * lerp(1.12, 0.8, diff) * lerp(1.25, 1, ease);
    const jumpLen = v * jt;
    const zone = zoneAtS(s), prevSafe = g.safe;
    if (g.clear && s > g.clear.until) g.clear = null;
    if (g.plat && s > g.plat.s2 + 0.5) { g.clear = { lane: g.plat.lane, until: g.plat.s2 + v * 1.0, s2: g.plat.s2 }; g.plat = null; }

    // alien invaders: at most one wave a level, early on so that it is over well before the next gateway.
    // Space Pier always gets one; other open-air levels get one now and then.
    const lvl0 = Math.floor(s / ZONE_LEN);
    if (g.waveLevel !== lvl0) {
      g.waveLevel = lvl0;
      // (on Christmas Pier it is Grumpy Santa in his sleigh instead, and he always turns up)
      const santa = zone === 10;
      // (an optional wave needs two quiet levels since the last visitors, so that they stay a treat)
      if (!ROOFED(zone) && (run > 520 || santa) && (zone === 9 || santa || this.waveAlways || (lvl0 - (g.lastWave ?? -9) >= 3 && rng() < 0.4))) {
        // (Santa waits for the level's name to clear, and makes do with a shorter visit if the level is nearly over)
        const s0 = s + (santa ? 40 : 14), room = (lvl0 + 1) * ZONE_LEN - 6 - s0, want = Math.min(v * (santa ? 9 : 7.5), 215), len = santa ? Math.min(want, room - 1) : want;
        if (len < room && len > v * 5) { this.waves.push({ s0, s1: s0 + len, done: false, santa }); g.lastWave = lvl0; }
      }
    }
    // while a wave is overhead its bombs take the place of rollers and flying attackers
    const wave = this.waves.find((w) => s > w.s0 + 4 && s < w.s1 - 22), inWave = !!wave;
    // visitors overhead are the show: while they are about (and just before and after) the deck stays simpler
    const nearWave = this.waves.some((w) => s > w.s0 - 20 && s < w.s1 + 10);
    // one thing at a time: after any special row come a couple of plain ones
    const calm = (g.quiet || 0) > 0;

    let type = 'scatter';
    if (!g.plat) {
      const early = run < 200, cl = !!g.clear;
      const w = {
        scatter: 46,
        breather: g.last === 'breather' ? 0 : 7,
        barrier: early || calm || g.last === 'barrier' || cl ? 0 : 7 + 6 * diff,
        gap: early || calm || s < this.noGapBefore || g.last === 'gap' || cl ? 0 : (9 + 5 * diff) * (zone === 4 || zone === 6 ? 1.3 : zone === 15 ? 0 : 1),     // (no holes in the floor of the Glass Tunnel)
        platform: run < 230 || calm || nearWave || g.last === 'platform' || cl ? 0 : 9,
        roller: (run < 290 && !inWave) || calm || g.last === 'gap' || g.last === 'roller' || cl ? 0 : (6 + 6 * diff) * (zone === 9 || inWave ? 3.5 : zone === 3 ? 1.3 : 1.8),
        trolley: run < 380 || calm || nearWave || g.last === 'trolley' || cl ? 0 : (5 + 4 * diff) * (zone === 8 ? 2 : 1.4),
        pad: run < 150 || calm || nearWave || g.last === 'pad' || g.last === 'gap' || cl ? 0 : zone === 3 || zone === 5 || zone === 11 ? 9 : 4.5,
      };
      let tot = 0; for (const k in w) tot += w[k];
      let r = rng() * tot;
      for (const k in w) { r -= w[k]; if (r <= 0) { type = k; break; } }
      // one chance per level of a warp portal, placed so that the tunnel comes out at the next level's gateway
      const level = Math.floor(s / ZONE_LEN), zoneEnd = (level + 1) * ZONE_LEN;
      // (never while Grumpy Santa is about: a warp tunnel would whisk Robyn straight past him)
      if (!cl && g.portalLevel !== level && run > 240 && s >= zoneEnd - v * WARP_SPEED * WARP_TIME - 24 && !this.waves.some((q) => q.santa && s < q.s1 + 12)) {
        g.portalLevel = level;
        if (zoneEnd - s > 110 && rng() < 0.62) type = 'portal';
      }
    }

    if (this.force && this.force.length && !g.plat) type = this.force.shift();
    let newSafe = prevSafe, extra = 0, skip = [], needJump = false;
    const wantCoins = rng() < 0.55;

    if (type === 'barrier') {
      for (const l of LANES) this.spawnObstacle('barrier', l, s);
      if (wantCoins) this.coinsArc(prevSafe, s + 0.28, jumpLen * 0.9);
      needJump = true;
    } else if (type === 'gap') {
      const L = clamp(v * 0.2, 3.0, 5.4);
      let lanes = [true, true, true];
      if (rng() < 0.42) { const keep = pick(rng, LANES); lanes[keep + 1] = false; }
      const hole = { s0: s, s1: s + L, lanes };
      this.holes.push(hole);
      LANES.forEach((l) => {
        if (!lanes[l + 1]) return;
        const a = obtain('holeTrim'); a.position.set(laneX(l), 0, -s); this.group.add(a); this.decos.push({ s, mesh: a });
        const b = obtain('holeTrim'); b.position.set(laneX(l), 0, -(s + L)); b.rotation.y = Math.PI; this.group.add(b); this.decos.push({ s: s + L, mesh: b });
      });
      needJump = lanes[prevSafe + 1];
      if (wantCoins) { if (needJump) this.coinsArc(prevSafe, s + L / 2, Math.max(jumpLen * 0.9, L + 2.5)); else this.coinsLine(prevSafe, s - 2, s + L + 2); }
      extra = L;
    } else if (type === 'trolley') {
      // something that crosses all three lanes: a runaway luggage trolley, or a giant crab on the beach levels
      // (a waddling penguin on the Frosty Pier)
      // (a scurrying giant rat in the sewers, a moon rover in space, a clockwork toy train on Christmas Pier, a runaway gingerbread man on Marshmallow Shore, a humming top in Spiral Bay, a mountain goat on Sky-High Mountain, a dodgem in Rollercoaster World, a cake trolley on Chocolate Coast, a calf on a scooter in Moo Town)
      const rat = zone === 8, rover = zone === 9, train = zone === 10, ginger = zone === 11, top = zone === 12, goat = zone === 13, dodgem = zone === 14, cake = zone === 16, calf = zone === 17;
      const crab = zone === 15 || (zone < 7 && rng() < (zone === 0 || zone === 4 || zone === 5 ? 0.75 : 0.2)), penguin = zone === 7 && rng() < 0.8;
      this.spawnObstacle(rat ? 'ratRun' : rover ? 'rover' : train ? 'toyTrain' : ginger ? 'gingerMan' : top ? 'spinTop' : goat ? 'goat' : dodgem ? 'bumperCar' : cake ? 'cakeTrolley' : calf ? 'calfScoot' : crab ? 'crab' : penguin ? 'penguin' : 'trolley', 0, s, { mover: { type: 'cross', amp: LANE_W, w: crab ? 2.2 : penguin || rover || train || ginger || top || goat || dodgem || calf ? 1.9 : 2.5, phase: rng() * 6.28, crab, penguin, rat, ginger, top, goat } });
      needJump = true;
    } else if (type === 'pad') {
      // a bounce pad on the safe path, with a high arc of shells and a pearl at the top
      const fl = v * jt * PAD_BOOST, peak = JUMP_H * PAD_BOOST * PAD_BOOST * 0.92;
      this.addPad(prevSafe, s);
      this.coinsArc(prevSafe, s - 0.5 + fl / 2, fl * 0.9, 0, peak, 2 * clamp(Math.round(fl / 4.4), 3, 6));
      this.addCoin(laneX(prevSafe), 0.95 + peak, s - 0.5 + fl / 2, true);
      extra = fl + 3;
    } else if (type === 'portal') {
      // one lane over from the safe path, set well back from the row before so there is time to steer into it (or not)
      const lane = pick(rng, LANES.filter((l) => Math.abs(l - prevSafe) === 1)), lead = v * 0.55;
      this.addPortal(lane, s + lead);
      this.coinsLine(lane, s + lead - 10.5, s + lead - 2.5, 0.95, 2);
      extra = lead + 8;
    } else if (type === 'breather') {
      let l = prevSafe;
      for (let k = 0; k < 3; k++) {
        this.coinsLine(l, s - 3 + k * 4.2, s - 3 + k * 4.2 + 3.4);
        const opts = [l - 1, l + 1].filter((x) => x >= -1 && x <= 1);
        if (k === 1 && rng() < 0.3) this.addCoin(laneX(l), 2.7, s + 2.9, true);     // a pearl to jump for
        l = pick(rng, opts);
      }
    } else {
      if (type === 'platform') {
        const opts = LANES.filter((l) => l !== prevSafe);
        const p = prevSafe === 0 ? pick(rng, opts) : (rng() < 0.4 ? 0 : -prevSafe);
        const ramp = rng() < 0.72, n = 3 + Math.floor(rng() * 4);
        const s0 = s, s1 = s + (ramp ? 3.2 : 0), s2 = s1 + n * 3;
        const plat = { lane: p, x: laneX(p), s0, s1, s2, h: PLAT_H, meshes: [] };
        if (ramp) { const m = obtain('ramp'); m.position.set(plat.x, 0, -(s0 + 1.6)); this.group.add(m); plat.meshes.push(m); }
        else for (let k = 0; k < 3; k++) this.addCoin(plat.x, 1.3 + k * 0.75, s1 - 3.6 + k * 1.3);
        for (let k = 0; k < n; k++) { const m = obtain(k % 2 ? 'platA' : 'platB'); m.position.set(plat.x, 0, -(s1 + 1.5 + k * 3)); this.group.add(m); plat.meshes.push(m); }
        this.coinsLine(p, s1 + 1.2, s2 - 1.2, PLAT_H + 0.95);
        if (rng() < 0.3 && run > 250) this.addPower(this.pickPower(), plat.x, PLAT_H + 1.2, s2 - 2.2);
        this.platforms.push(plat); g.plat = plat;
      }
      // choose where the safe lane goes next
      const avail = LANES.filter((l) => !g.plat || l !== g.plat.lane);
      const split = g.plat && g.plat.lane === 0;
      let cand = [prevSafe];
      // just after a platform ends, its lane was walled off until a moment ago, so the safe path may not swing into it yet
      const walled = (l) => g.clear && l === g.clear.lane && s - g.clear.s2 < v * 0.6;
      if (!split) for (const l of [prevSafe - 1, prevSafe + 1]) if (avail.includes(l) && !walled(l)) { cand.push(l); cand.push(l); }
      newSafe = pick(rng, cand);
      if (type === 'roller') {
        const free = LANES.filter((l) => l !== prevSafe && l !== newSafe);
        const count = free.length > 1 && diff > 0.35 && rng() < 0.3 ? 2 : 1;
        const lanes = free.length > 1 && count === 1 ? [pick(rng, free)] : free.slice(0, count);
        lanes.forEach((l, k) => {
          const [kind, chance] = ATTACKER[zone];
          if (inWave && wave.santa) {
            // a present lobbed out of Grumpy Santa's sleigh: it drops to the deck and tumbles along the lane
            const o = this.spawnObstacle('giftBomb', l, s + 2 + k * 3, { mover: { type: 'roll', v: 5, on: false, range: 27, shot: true, santa: true, wave, drop: 6.5, age: 0 } });
            o.mesh.visible = false;
          } else if (inWave) {
            // a bomb from the invaders overhead: it falls to the deck and skims along the lane
            const o = this.spawnObstacle('plasma', l, s + 2 + k * 3, { mover: { type: 'roll', v: 6, on: false, range: 32, shot: true, plasma: true, bomb: true, drop: 7, age: 0 } });
            o.mesh.visible = false;
          } else if (k === 0 && s >= (g.nextFlyer || 0) && rng() < chance * lerp(0.5, 1, clamp((run - 280) / 560, 0, 1))) {
            // a flying attacker waits over the lane and lets fly as Robyn comes into range (in space it is always a UFO)
            // (one at a time, and a few seconds apart)
            g.nextFlyer = s + v * (zone === 9 ? 3 : 5);
            const F = FLYERS[kind];
            const o = this.spawnObstacle(F.shot, l, s + 2 + k * 3, { mover: { type: 'roll', v: 6, on: false, range: 34, shot: true, plasma: F.crackle, drop: F.y - 1.2, age: 0 } });
            o.mesh.visible = false; this.addUfo(l, o.s, o, kind);
          } else if (zone === 14) this.spawnObstacle('runawayCar', l, s + 2 + k * 3, { mover: { type: 'roll', v: 6.5, on: false, run: true } });     // a runaway coaster car full of screaming riders
          else if (zone === 8) this.spawnObstacle('ratCharge', l, s + 2 + k * 3, { mover: { type: 'roll', v: 6.5, on: false, run: true } });     // a rat charging down the lane
          else this.spawnObstacle(zone === 5 ? 'beachball' : zone === 7 || zone === 13 ? 'snowball' : zone === 10 ? 'bauble' : zone === 11 ? 'gobstopper' : zone === 12 ? 'marble' : zone === 15 ? 'puffer' : zone === 16 ? 'truffle' : zone === 17 ? 'roundBale' : 'barrel', l, s + 2 + k * 3, { mover: { type: 'roll', v: 5, on: false } });
          skip.push(l);
        });
        extra = (count - 1) * 3;   // the second roller trails the row, so leave room to cut back in behind it
      }
      const early = run < 200;
      const pTall = lerp(0.28, 0.5, diff) * lerp(0.6, 1, ease) * (nearWave ? 0.7 : 1), pLow = 0.16 * lerp(0.7, 1, ease), pSafeLow = early ? 0.08 : lerp(0.2, 0.38, diff) * lerp(0.6, 1, ease);
      let any = false;
      for (const l of avail) {
        if (skip.includes(l)) continue;
        let cell;
        if (l === newSafe) cell = rng() < pSafeLow ? 'low' : 'empty';
        else { const r = rng(); cell = r < pTall ? 'tall' : r < pTall + pLow ? 'low' : 'empty'; if (cell === 'tall' && split) cell = 'low'; }
        if (g.clear && l === g.clear.lane) cell = 'empty';
        if (cell === 'empty') continue;
        any = true;
        let name;
        if (cell === 'low') name = pick(rng, LOW_BY_ZONE[zone] || LOW_TYPES);
        else { name = pick(rng, TALL_TYPES[zone]); if (obstacleDef(name).d > 3 && spacing - obstacleDef(name).d < 7) name = 'stack'; }
        const o = this.spawnObstacle(name, l, s);
        if (l === newSafe) { needJump = true; if (wantCoins) this.coinsArc(l, o.s, jumpLen * 0.9); }
      }
      if (!needJump && wantCoins) this.coinsLine(newSafe, s - 3.4, s + 1.7);
      if (!any && type === 'scatter') type = 'breather';
      // power-up between rows, on the safe path
      // (the sewers always offer a laser zapper soon after the way in, and power-ups come round faster down there)
      // (most levels also hand out a laser zapper early on, and the sewers always do; in space the mega laser is built in)
      const lvl = Math.floor(s / ZONE_LEN);
      if (g.laserLevel !== lvl) { g.laserLevel = lvl; g.laserWant = zone !== 9 && (zone === 8 || (s >= (g.nextLaser || 0) && rng() < 0.5)); }
      // (pick-ups come one at a time, a few seconds apart, and wait until any visitors overhead have gone)
      const free = s >= (g.nextPickup || 0), firstLaser = free && g.laserWant && s - lvl * ZONE_LEN > 22 && run > 60;
      if (((run > 140 && s >= g.nextPower && free && !nearWave) || firstLaser) && type !== 'platform') {
        if (firstLaser) { g.laserWant = false; g.lastPower = 'laser'; g.nextLaser = s + 420; }
        this.addPower(firstLaser ? 'laser' : this.pickPower(), laneX(newSafe), 1.2, s - spacing * 0.5);
        g.nextPower = s + (zone === 8 ? 170 + rng() * 90 : 300 + rng() * 170); g.nextPickup = s + v * 4;
      } else if (run > 60 && free && !nearWave && s >= g.nextLetter && this.wantLetter >= 0 && !this.letters.length && type !== 'platform') {
        // the next letter of ROBYN, on the safe path between two rows
        this.addLetter(this.wantLetter, laneX(newSafe), 1.25, s - spacing * 0.5);
        g.nextLetter = s + 200 + rng() * 150; g.nextPickup = s + v * 4;
      }
    }
    this.rows.push({ s, safe: newSafe, type, needJump });
    g.quiet = type === 'scatter' || type === 'breather' ? Math.max(0, (g.quiet || 0) - 1) : diff > 0.75 ? 1 : 2;
    g.safe = newSafe; g.last = type; g.s = s + spacing + extra;
  }
  pickPower() {
    const g = this.gen; let t;
    const far = g.s - this.runStart;
    let pool = far > 380 ? [...POWER_TYPES, 'board', 'board', 'rocket', 'rocket'] : far > 120 ? [...POWER_TYPES, 'board', 'board'] : POWER_TYPES;
    const zone = zoneAtS(g.s);
    if (zone === 8) pool = [...POWER_TYPES, 'board', 'laser', 'laser', 'laser', 'laser'];   // the sewers are full of laser zappers
    else if (zone !== 9 && far > 120) pool = [...pool, 'laser', 'laser', 'laser'];          // and they turn up everywhere else too
    do { t = pick(this.rng, pool); } while (t === g.lastPower && t !== 'laser');
    g.lastPower = t; return t;
  }

  // ---------- chunks ----------
  buildChunk(i) {
    const c0 = i * CHUNK, c1 = c0 + CHUNK;
    this.generateTo(c1 + 14);
    const group = new THREE.Group(); group.position.z = -c0;
    const zone = i < 0 ? 0 : zoneOfLevel(Math.floor(i / ZONE_CHUNKS));
    const anim = [], own = [];
    populate(group, i, zone, anim);
    const holes = this.holes.filter((h) => h.s1 > c0 && h.s0 < c1);
    let top, under;
    if (!holes.length) { top = this.fullTop; under = this.fullUnder; }
    else {
      const rects = [[-DECK_HALF, -1.5 * LANE_W, 0, CHUNK], [1.5 * LANE_W, DECK_HALF, 0, CHUNK]];
      for (const l of LANES) {
        let a = 0;
        const hs = holes.filter((h) => h.lanes[l + 1]).sort((p, q) => p.s0 - q.s0);
        for (const h of hs) {
          const h0 = clamp(h.s0 - c0, 0, CHUNK), h1 = clamp(h.s1 - c0, 0, CHUNK);
          if (h0 > a) rects.push([laneX(l) - LANE_W / 2, laneX(l) + LANE_W / 2, a, h0]);
          a = Math.max(a, h1);
        }
        if (a < CHUNK) rects.push([laneX(l) - LANE_W / 2, laneX(l) + LANE_W / 2, a, CHUNK]);
      }
      top = deckTopGeo(rects);
      const ub = new Builder(0.7);
      for (const [x0, x1, s0, s1] of rects) ub.box(x1 - x0, 0.28, s1 - s0, C.woodDeep, (x0 + x1) / 2, -0.145, -(s0 + s1) / 2);
      under = ub.build().geometry;
      own.push(top, under);
    }
    const tm = new THREE.Mesh(top, this.deckMat); tm.receiveShadow = true; group.add(tm);
    group.add(new THREE.Mesh(under, this.underMat));
    this.world.add(group);
    this.chunks.set(i, { group, anim, own });
  }

  update(dist, dt, budget = 1) {
    this.t += dt;
    this.group.position.z = dist;
    const i0 = Math.floor((dist - 26) / CHUNK), i1 = Math.floor((dist + 232) / CHUNK);
    for (const [i, c] of this.chunks) if (i < i0 || i > i1) { this.world.remove(c.group); c.own.forEach((g) => g.dispose()); this.chunks.delete(i); }
    for (let i = i0; i <= i1 && budget > 0; i++) if (!this.chunks.has(i)) { this.buildChunk(i); budget--; }
    this.generateTo(dist + 150);

    // movers
    for (const o of this.obstacles) {
      const m = o.mover; if (!m) continue;
      if (m.type === 'roll') {
        if (!m.on && o.s - dist < (m.range || 30)) { m.on = true; if (m.shot) o.mesh.visible = true; }
        if (m.on && !o.flung) { o.s -= m.v * dt; o.mesh.position.z = -o.s; if (m.run) o.mesh.position.y = Math.abs(Math.sin(this.t * 15)) * 0.09; else o.mesh.rotation.x += (m.v / 0.5) * dt; }
        // an attacker's shot drops out of it to lane height; plasma, sparks and slime crackle and wobble as they come
        if (m.shot && m.on && !o.flung) { m.age += dt; o.mesh.position.y = o.y + Math.max(0, 1 - m.age / 0.4) * m.drop; if (m.plasma) { o.mesh.rotation.y += dt * 7; if (!o.zap) o.mesh.scale.setScalar(1 + Math.sin(this.t * 22) * 0.08); } }
      } else if (m.type === 'cross' && !o.flung) {
        o.x = Math.sin(this.t * m.w + m.phase) * m.amp; o.mesh.position.x = o.x;
        if (m.ginger) { o.mesh.rotation.y = 0; o.mesh.position.y = Math.abs(Math.sin(this.t * 12)) * 0.1; o.mesh.rotation.z = Math.sin(this.t * 12) * 0.22; }      // he jogs along facing Robyn
        else if (m.top) { o.mesh.rotation.y = this.t * 11; o.mesh.rotation.z = Math.sin(this.t * 3.1) * 0.14; o.mesh.rotation.x = Math.cos(this.t * 3.1) * 0.14; }      // it whirls and wobbles
        else if (m.crab) { o.mesh.rotation.y = 0; o.mesh.position.y = Math.abs(Math.sin(this.t * 13)) * 0.07; o.mesh.rotation.z = Math.sin(this.t * 13) * 0.05; }
        else o.mesh.rotation.y = Math.cos(this.t * m.w + m.phase) > 0 ? 0 : Math.PI;
        if (m.goat) o.mesh.position.y = Math.abs(Math.sin(this.t * 9)) * 0.22;      // it skips along
        if (m.penguin) o.mesh.rotation.z = Math.sin(this.t * 11) * 0.16;      // waddle
        if (m.rat) o.mesh.position.y = Math.abs(Math.sin(this.t * 15)) * 0.09;   // scurry
      }
    }
    // obstacles knocked away by the shield
    for (const o of this.obstacles) if (o.flung) {
      o.flung.t += dt; o.mesh.position.x += o.flung.vx * dt; o.mesh.position.y += (o.flung.vy -= 20 * dt) * dt; o.mesh.position.z -= o.flung.vz * dt;
      o.mesh.rotation.x += 6 * dt; o.mesh.rotation.z += 4 * dt;
    }
    // things the laser has zapped shrink away to nothing
    for (const o of this.obstacles) if (o.zap) { o.zap.t += dt; o.mesh.scale.setScalar(Math.max(0.02, 1 - o.zap.t / 0.2)); o.mesh.rotation.y += dt * 18; }
    // UFOs hover and wobble; a zapped one spins away into the sky
    for (const u of this.ufos) {
      const m = u.mesh;
      // wings flap (faster when it has been zapped and is tumbling away)
      for (const w of m.children) if (w.userData.wing) w.rotation.z = w.userData.wing * (Math.sin(this.t * (u.zap ? 30 : u.kind === 'bat' ? 15 : 9) + u.p) * 0.6 + 0.12);
      if (u.zap) { u.zap.t += dt; m.position.y += (9 + u.zap.t * 30) * dt; m.position.x += u.zap.vx * dt; m.rotation.y += dt * 16; m.rotation.z += dt * 5; m.scale.setScalar(Math.max(0.05, 1 - u.zap.t / 0.9) * u.size); continue; }
      m.scale.setScalar(u.size);
      if (u.kind === 'ufo') { m.position.y = u.y + Math.sin(this.t * 2.3 + u.p) * 0.25; m.rotation.y = Math.sin(this.t * 1.1 + u.p) * 0.5; m.rotation.z = Math.sin(this.t * 1.7 + u.p) * 0.1; }
      else {
        // gulls and bats bob with each wing beat and weave a little; clouds puff in and out
        const cloud = u.kind.endsWith('cloud'), beat = u.kind === 'bat' ? 15 : 9;
        m.position.y = u.y + (cloud ? Math.sin(this.t * 2 + u.p) * 0.2 : Math.cos(this.t * beat + u.p) * 0.12 + Math.sin(this.t * 1.9 + u.p) * 0.2);
        m.position.x = u.x + Math.sin(this.t * 1.3 + u.p) * 0.25; m.rotation.y = Math.sin(this.t * 1.3 + u.p) * 0.3; m.rotation.z = -Math.cos(this.t * 1.3 + u.p) * 0.12;
        if (cloud) m.scale.set(u.size * (1 + Math.sin(this.t * 4 + u.p) * 0.05), u.size * (1 - Math.sin(this.t * 4 + u.p) * 0.05), u.size);
      }
      m.rotation.x = u.recoil > 0 ? -(u.recoil = Math.max(0, u.recoil - dt * 3)) * 0.5 : 0;
    }
    // recycle what is behind the player
    const back = dist - 14;
    const keep = (arr, test, drop) => { let k = 0; for (let i = 0; i < arr.length; i++) { const a = arr[i]; if (test(a)) arr[k++] = a; else drop(a); } arr.length = k; };
    keep(this.obstacles, (o) => o.s + o.d / 2 > back && !(o.flung && o.flung.t > 1.6) && !(o.zap && o.zap.t > 0.2), (o) => { o.mesh.position.y = 0; release(o.mesh); });
    keep(this.waves, (w) => w.s1 > back - 60, () => {});
    keep(this.ufos, (u) => u.s > back - 4 && !(u.zap && u.zap.t > 0.9), (u) => release(u.mesh));
    keep(this.coins, (c) => c.s > back && !c.gone, (c) => release(c.mesh));
    keep(this.powerups, (p) => p.s > back && !p.gone, (p) => release(p.mesh));
    keep(this.decos, (d) => d.s > back - 6, (d) => release(d.mesh));
    keep(this.platforms, (p) => p.s2 > back - 4, (p) => p.meshes.forEach(release));
    keep(this.pads, (p) => p.s > back, (p) => release(p.mesh));
    keep(this.portals, (p) => p.s > back, (p) => release(p.mesh));
    keep(this.letters, (l) => l.s > back && !l.gone, (l) => release(l.mesh));
    keep(this.holes, (h) => h.s1 > back - CHUNK - 30, () => {});
    keep(this.rows, (r) => r.s > back - 10, () => {});

    const t = this.t;
    for (const c of this.coins) { c.mesh.rotation.y = t * 3.2 + c.s * 0.35; if (!c.pull) c.mesh.position.y = c.y0 + Math.sin(t * 3 + c.s) * 0.06; }
    for (const p of this.powerups) {
      p.mesh.rotation.y = t * 1.6; p.mesh.position.y = p.y + Math.sin(t * 2.4 + p.s) * 0.14;
      const r = p.mesh.getObjectByName('ring'), r2 = p.mesh.getObjectByName('ring2');
      if (r) r.rotation.x = t * 2.2; if (r2) { r2.rotation.y = t * 1.3; r2.rotation.x = 1.2 + Math.sin(t) * 0.4; }
    }
    for (const p of this.pads) if (p.t > 0) { p.t = Math.max(0, p.t - dt * 2.2); p.mesh.scale.y = 1 + Math.sin(p.t * Math.PI * 3) * 0.5 * p.t; }
    for (const l of this.letters) { l.mesh.rotation.y = Math.sin(t * 2.2 + l.s) * 0.6; l.mesh.position.y = l.y + Math.sin(t * 2.6 + l.s) * 0.12; }
    portalMat.uniforms.uT.value = t;
    if (this.world.visible) for (const [, c] of this.chunks) animate(c.anim, t, dt);
  }

  // ---------- queries used by the player physics ----------
  // Height of the walkable surface under (x, s). Gaps in the deck return a deep negative value.
  floorAt(x, s) {
    let f = 0;
    for (const h of this.holes) {
      if (s > h.s0 + 0.3 && s < h.s1 - 0.3) {
        for (const l of LANES) if (h.lanes[l + 1] && Math.abs(x - laneX(l)) < LANE_W / 2 - 0.22) f = -20;
      }
    }
    for (const p of this.platforms) {
      if (Math.abs(x - p.x) > LANE_W / 2 + 0.05) continue;
      if (s >= p.s1 - 0.05 && s <= p.s2 + 0.1) f = Math.max(f, p.h);
      else if (s >= p.s0 && s < p.s1) f = Math.max(f, (p.h * (s - p.s0)) / (p.s1 - p.s0));
    }
    return f;
  }
}

// The camera's views, and the survey of what hangs over the pier that lets a high view keep clear of it.
import * as THREE from 'three';

// The views the player can choose between with the camera button (or the C key). Each is a set of numbers for the chase
// camera in main.js (updateCamera), and changing view glides from one set to the next:
//   back, up          how far behind Robyn the camera sits and how high, in metres
//   ahead, aim        the point it looks at: how far in front of her, and how high
//   side, sideAim     how much of her sideways position the camera and that point take (0 stays over the middle lane, 1 follows her)
//   hop, hopAim       how much of her height (a jump, a platform, the rocket) they add
//   fly, flyAim       extra height on the rocket ride
//   tideBack, tideUp  how far the camera pulls back and up when the tide is at her heels, so that the wave is in the picture
//   zoom              1 is the normal lens; less is a longer one, which makes everything bigger and flatter
//   clear             1 if the camera flies high enough to meet arches and roofs, and so has to keep clear of them (Headroom, below)
// Classic is the camera the game has always had, and its numbers must stay as they are.
export const VIEWS = [
  { id: 'classic', name: 'Classic', back: 6.3, up: 3.45, ahead: 7.5, aim: 1.25, side: 0.58, sideAim: 0.78, hop: 0.42, hopAim: 0.5, fly: 3.0, flyAim: 1.6, tideBack: 2.3, tideUp: 1.0, zoom: 1, clear: 0 },
  { id: 'sky', name: 'Sky view', back: 11.5, up: 10.5, ahead: 7.5, aim: 0.5, side: 0.5, sideAim: 0.7, hop: 0.3, hopAim: 0.45, fly: 2.0, flyAim: 1.6, tideBack: 4.0, tideUp: 0.5, zoom: 0.75, clear: 1 },
  { id: 'close', name: 'Close-up', back: 3.8, up: 2.5, ahead: 2.2, aim: 1.0, side: 0.7, sideAim: 0.85, hop: 0.5, hopAim: 0.55, fly: 3.0, flyAim: 1.8, tideBack: 2.3, tideUp: 1.0, zoom: 1, clear: 0 },
];
export const VIEW_KEYS = Object.keys(VIEWS[0]).filter((k) => typeof VIEWS[0][k] === 'number');
export const viewIndex = (id) => Math.max(0, VIEWS.findIndex((v) => v.id === id));

// ---------- what hangs over the pier ----------
// A high camera flies along a strip above the lanes, and every level hangs something across that strip: its gateway, arches,
// hoops, bunting, and in a few levels a whole roof. surveyOverhead() looks through a freshly built chunk of scenery and notes,
// for each metre along it, the heights between which there is something solid over the lanes. It is asked once per chunk, when
// the chunk is built, and only reads geometry: nothing about a level has to be described by hand.
const HALF = 1.6;            // half the width of the strip (the camera stays within about 1.3 m of the middle)
const LOW = 2.4;             // nothing lower than this counts as overhead
const PAD = 8;               // the survey starts this far before the chunk and ends this far after it, to catch what overhangs its ends
const ROOM = 1.2;            // two things with a gap smaller than this between them count as one: the camera would not fit through
const ROOF = 7;              // something that carries on for this many metres is a roof to go under, never an arch to fly over
const _inv = new THREE.Matrix4(), _mat = new THREE.Matrix4(), _box = new THREE.Box3();
let _buf = new Float32Array(3 * 4096);

// Cut a polygon (x, y, z triples in `src`, `n` corners) down to the side of the plane `axis = limit` where sign * (limit - value) >= 0.
function clip(src, n, axis, limit, sign, dst) {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 3, b = ((i + 1) % n) * 3, da = sign * (limit - src[a + axis]), db = sign * (limit - src[b + axis]);
    if (da >= 0) { dst[m * 3] = src[a]; dst[m * 3 + 1] = src[a + 1]; dst[m * 3 + 2] = src[a + 2]; m++; }
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); dst[m * 3] = src[a] + (src[b] - src[a]) * t; dst[m * 3 + 1] = src[a + 1] + (src[b + 1] - src[a + 1]) * t; dst[m * 3 + 2] = src[a + 2] + (src[b + 2] - src[a + 2]) * t; m++; }
  }
  return m;
}
const _p0 = new Float64Array(36), _p1 = new Float64Array(36), _p2 = new Float64Array(36);

// group: a chunk of scenery, placed so that the chunk begins at its z = 0 and runs towards -z; length: how long it is.
// Returns { from, rows }: rows[i] is null, or the things over the lanes between (from + i) and (from + i + 1) metres along the
// chunk, as a list of pairs [underside, top, underside, top, ...] from the lowest up. A top of Infinity marks a roof.
export function surveyOverhead(group, length) {
  const n = Math.ceil(length) + 2 * PAD, raw = new Array(n).fill(null);
  const note = (i, a, b) => { if (i >= 0 && i < n && b >= LOW) (raw[i] || (raw[i] = [])).push(a, b); };
  group.updateMatrixWorld(true);
  _inv.copy(group.matrixWorld).invert();
  group.traverse((o) => {
    const geo = o.geometry, mat = o.material;
    if (!o.isMesh || !geo || !geo.attributes.position || !mat) return;
    if (mat.transparent || mat.depthWrite === false) return;      // shafts of light, glows and glass are not in the way
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.light) return;      // nor is anything marked as only light (the disco's beams)
    _mat.multiplyMatrices(_inv, o.matrixWorld);
    if (!geo.boundingBox) geo.computeBoundingBox();
    _box.copy(geo.boundingBox).applyMatrix4(_mat);
    if (_box.min.x > HALF || _box.max.x < -HALF || _box.max.y < LOW || _box.max.z < -(length + PAD) || _box.min.z > PAD) return;
    // every corner of the model, in the chunk's own measurements
    const pa = geo.attributes.position, nv = pa.count, e = _mat.elements;
    if (_buf.length < nv * 3) _buf = new Float32Array(nv * 3 + 3072);
    for (let i = 0; i < nv; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      _buf[i * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; _buf[i * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; _buf[i * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    const idx = geo.index ? geo.index.array : null, nt = Math.floor((idx ? idx.length : nv) / 3);
    for (let t = 0; t < nt; t++) {
      const a = (idx ? idx[t * 3] : t * 3) * 3, b = (idx ? idx[t * 3 + 1] : t * 3 + 1) * 3, c = (idx ? idx[t * 3 + 2] : t * 3 + 2) * 3;
      const xa = _buf[a], xb = _buf[b], xc = _buf[c], ya = _buf[a + 1], yb = _buf[b + 1], yc = _buf[c + 1];
      if ((xa > HALF && xb > HALF && xc > HALF) || (xa < -HALF && xb < -HALF && xc < -HALF) || (ya < LOW && yb < LOW && yc < LOW)) continue;
      // the part of the triangle that lies over the strip
      _p0[0] = xa; _p0[1] = ya; _p0[2] = _buf[a + 2]; _p0[3] = xb; _p0[4] = yb; _p0[5] = _buf[b + 2]; _p0[6] = xc; _p0[7] = yc; _p0[8] = _buf[c + 2];
      let m = clip(_p0, 3, 0, HALF, 1, _p1); if (m < 3) continue;
      m = clip(_p1, m, 0, -HALF, -1, _p0); if (m < 3) continue;
      let y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < m; i++) { const y = _p0[i * 3 + 1], z = _p0[i * 3 + 2]; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      if (y1 < LOW) continue;
      const i0 = Math.floor(-z1) + PAD, i1 = Math.floor(-z0) + PAD;
      if (i0 === i1 || y1 - y0 < 0.6) { for (let i = i0; i <= i1; i++) note(i, y0, y1); continue; }
      // a long sloping piece: take its height metre by metre
      for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) {
        const zf = -(i - PAD), zb = zf - 1;      // this metre runs from zf back to zb
        let k = clip(_p0, m, 2, zf, 1, _p1); if (k < 3) continue;
        k = clip(_p1, k, 2, zb, -1, _p2); if (k < 3) continue;
        let lo = Infinity, hi = -Infinity;
        for (let j = 0; j < k; j++) { const y = _p2[j * 3 + 1]; if (y < lo) lo = y; if (y > hi) hi = y; }
        note(i, lo, hi);
      }
    }
  });
  // tidy each metre into a short list of separate things, lowest first
  const rows = raw.map((r) => {
    if (!r) return null;
    const pairs = []; for (let i = 0; i < r.length; i += 2) pairs.push([r[i], r[i + 1]]);
    pairs.sort((p, q) => p[0] - q[0]);
    const out = []; let [a, b] = pairs[0];
    for (const p of pairs) { if (p[0] <= b + ROOM) b = Math.max(b, p[1]); else { out.push(a, b); a = p[0]; b = p[1]; } }
    out.push(a, b);
    return out;
  });
  // anything that carries on for a long way is a roof
  const roofs = [];
  for (let i = 0; i < n; i++) {
    const r = rows[i]; if (!r) continue;
    for (let j = 0; j < r.length; j += 2) {
      let run = 1;
      for (const step of [1, -1]) {
        let a = r[j], b = r[j + 1];
        for (let k = i + step; k >= 0 && k < n && run < ROOF; k += step) {
          const q = rows[k]; let hit = -1;
          if (q) for (let h = 0; h < q.length; h += 2) if (q[h] <= b + 0.3 && q[h + 1] >= a - 0.3) { hit = h; break; }
          if (hit < 0) break;
          a = q[hit]; b = q[hit + 1]; run++;
        }
      }
      if (run >= ROOF) roofs.push(i, j);
    }
  }
  for (let k = 0; k < roofs.length; k += 2) rows[roofs[k]][roofs[k + 1] + 1] = Infinity;
  for (const r of rows) if (r) for (let j = r.length - 4; j >= 0; j -= 2) if (r[j + 1] === Infinity) r.length = j + 2;      // nothing above a roof matters
  return { from: -PAD, rows };
}

// ---------- keeping clear of it ----------
// Headroom decides how high a high camera flies. Every frame it plans the next couple of seconds of flight from where the
// camera is: it finds the way past everything coming up over the lanes that costs least, where it costs to be away from the
// height asked for (more for higher than lower, and a lot for very low), to move (more the faster it moves, so that it swoops
// gently rather than darts, and a little for every metre, so that it does not bob up between two things close together),
// to change its mind from the last plan, and a great deal to be in the way of anything. Then it follows the start of that
// plan. The plan is a path through a grid of heights and moments, found by working back from the end of it: each point on
// the grid learns the cheapest way on from there (dynamic programming).
const UNDER = 0.5, OVER = 0.6;      // the gap to leave below a thing and above it
const LEAD = 1, MARGIN = 0.05;      // ...and in front of it and behind it, in metres and then in seconds
const FLOOR = 3.0;                  // it costs extra to go lower than this
const BOTTOM = 2.0;                 // and it never plans to go lower than this
const TAU = 1 / 24, N = 54;         // the plan is made in steps this long, in seconds, and this many of them (2.25 s)
const DH = 0.125, MOVE = 3;         // with heights this far apart; in one step the camera moves up to this many of them (9 m/s)
const KMAX = 200;                   // the most heights it looks at
// What things cost: being a metre below or above the height asked for, for a second; each metre under FLOOR, for a second;
// at the end of the plan, each metre away from the height asked for; each metre away from the last plan, for a second;
// moving, for a second, for each (metre a second) squared, and for each metre; and each step spent in the way of something.
const W_LOW = 1, W_HIGH = 1.5, W_FLOOR = 4, W_END = 1.5, W_KEEP = 0.3, W_SPEED = 0.05, W_DIST = 0.5, HIT = 50;
const LAG = 0.11;                   // the camera trails the height given here by about this long (main.js eases it there)
export class Headroom {
  constructor() {
    this.list = [];
    this.cost = new Float32Array((N + 1) * KMAX); this.next = new Uint8Array(N * KMAX); this.hit = new Uint8Array((N + 1) * KMAX);
    this.plan = new Float32Array(N + 1); this.last = new Float32Array(N + 1);      // the plan: a height for each moment ahead
    this.move = new Float32Array(2 * MOVE + 1);
    for (let d = -MOVE; d <= MOVE; d++) { const v = d * DH / TAU; this.move[d + MOVE] = W_SPEED * v * v * TAU + W_DIST * Math.abs(d) * DH; }
    this.reset();
  }
  reset() { this.h = null; this.off = null; }      // h: the height the plan has got to; off: how far that is from the height asked for
  // y: the height the camera would like; now: the height it is at (both measured from the road under the camera, as every
  // height here is, so the hills need no special care); dt: the time since the last frame; camS: how far along the coast the
  // camera is; speed: how fast Robyn is running; still: true while the game is paused; overhead(s0, s1, list): adds
  // [underside, top, where] to list for everything over the lanes between s0 and s1 (Track.overhead); cap: a height not to go
  // above. Returns the height to fly at.
  fit(y, now, dt, camS, speed, still, overhead, cap = Infinity) {
    const fresh = this.h === null, hs = Math.min(cap, fresh ? now : this.h);      // where the camera has got to (so when the height asked for jumps, as it does when a rocket ride starts or ends, getting there is planned too)
    // the heights in the grid: hs itself is height k0, and they go from BOTTOM up to a little over whichever is higher, hs or y
    const k0 = Math.min(KMAX - 1, Math.max(0, Math.floor((hs - BOTTOM) / DH)));
    const K = Math.min(KMAX, k0 + 1 + Math.max(0, Math.ceil((Math.min(cap, Math.max(y, hs) + 5) - hs) / DH)));
    // 1. Mark the points of the grid that are in the way of something: the moments the camera is passing it, and its heights.
    const v = Math.max(speed, 1), list = this.list, hit = this.hit;
    list.length = 0;
    overhead(camS - LEAD - 1, camS + v * (N * TAU + MARGIN) + LEAD + 1, list);
    hit.fill(0, 0, (N + 1) * K);
    let any = false;
    for (let i = 0; i < list.length; i += 3) {
      const s = list[i + 2] - camS, ja = Math.max(1, Math.ceil(((s - 0.5 - LEAD) / v - MARGIN) / TAU)), jb = Math.min(N, Math.floor(((s + 0.5 + LEAD) / v + MARGIN) / TAU));
      if (ja > jb) continue;
      const ka = Math.max(0, Math.floor((list[i] - UNDER - hs) / DH) + k0 + 1), kb = Math.min(K - 1, Math.ceil((list[i + 1] + OVER - hs) / DH) + k0 - 1);
      if (ka <= kb) { any = true; for (let j = ja; j <= jb; j++) hit.fill(1, j * K + ka, j * K + kb + 1); }
    }
    // (With nothing in the way and the camera all but where it was asked to be, it just settles there: the grid is too coarse for the last few centimetres.)
    if (!any && Math.abs(hs - y) < 2 * DH) { this.off = still ? hs - y : (hs - y) * Math.exp(-6 * dt); this.h = y + this.off; this.plan.fill(this.h); this.last.fill(this.h); return this.h; }
    // 2. Work back from the end of the plan: the cheapest way on from each point.
    const cost = this.cost, next = this.next, mv = this.move, last = this.last, keep = !fresh, sh = still ? 0 : dt / TAU;
    for (let j = N; j >= 1; j--) {
      let lo = 0;      // the last plan's height, here (it has moved on sh steps since)
      if (keep) { const x = Math.min(N, j + sh), f = Math.min(N - 1, Math.floor(x)); lo = last[f] + (last[f + 1] - last[f]) * Math.min(1, x - f); }
      const row = j * K, r1 = row + K;
      for (let k = 0; k < K; k++) {
        const hk = hs + (k - k0) * DH, d = hk - y;
        let c = (d < 0 ? -d * W_LOW : d * W_HIGH) + (hk < FLOOR ? (FLOOR - hk) * W_FLOOR : 0) + (keep ? Math.abs(hk - lo) * W_KEEP : 0);
        c = c * TAU + (hit[row + k] ? HIT : 0);
        if (j === N) { cost[row + k] = c + Math.abs(d) * W_END; continue; }
        let best = Infinity, arg = k;
        for (let m = Math.max(0, k - MOVE), m1 = Math.min(K - 1, k + MOVE); m <= m1; m++) { const q = cost[r1 + m] + mv[m - k + MOVE]; if (q < best) { best = q; arg = m; } }
        cost[row + k] = c + best; next[row + k] = arg;
      }
    }
    // 3. Then forward from where the camera is: that is the plan.
    let best = Infinity, k = k0;
    for (let m = Math.max(0, k0 - MOVE), m1 = Math.min(K - 1, k0 + MOVE); m <= m1; m++) { const q = cost[K + m] + mv[m - k0 + MOVE]; if (q < best) { best = q; k = m; } }
    const plan = this.plan; plan[0] = hs;
    for (let j = 1; j <= N; j++) { plan[j] = hs + (k - k0) * DH; if (j < N) k = next[j * K + k]; }
    last.set(plan);
    // 4. Follow it: the camera gets as far along it as this frame takes; and main.js is given a height a little further on, as it trails.
    this.h = this.along(still ? 0 : dt / TAU); this.off = this.h - y;
    return this.along(still ? 0 : dt / TAU + LAG / TAU);
  }
  along(x) { const p = this.plan, f = Math.min(N - 1, Math.floor(x)); return p[f] + (p[f + 1] - p[f]) * Math.min(1, x - f); }
}

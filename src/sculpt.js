// Sculpting kit for the characters. The modelling kit's Builder makes things out of boxes, cylinders and balls; this adds
// the soft shapes a cartoon character needs (reshaped balls, tubes that taper along a curve, turned and free-form
// surfaces), lets each piece say how shiny it is, and supplies the material Robyn and her pets are drawn with.
import * as THREE from 'three';
import { Builder, addTwist } from './kit.js';

const PI = Math.PI, _v = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// A colour part-way between two others. (The results come from a small pool, so use each one straight away.)
const POOL = Array.from({ length: 12 }, () => new THREE.Color()), _b = new THREE.Color();
let pool = 0;
export const mix = (c1, c2, t) => { const c = POOL[pool = (pool + 1) % POOL.length]; return c.set(c1).lerp(_b.set(c2), Math.max(0, Math.min(1, t))); };
// a value from a list of evenly spaced values, smoothly (t from 0 to 1)
export function along(list, t) {
  const n = list.length - 1, f = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
  const p0 = list[Math.max(0, i - 1)], p1 = list[i], p2 = list[i + 1], p3 = list[Math.min(n, i + 2)];
  return 0.5 * (2 * p1 + (p2 - p0) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k * k + (3 * p1 - p0 - 3 * p2 + p3) * k * k * k);
}

// Shade a shape smoothly: points that share a place share a normal (otherwise a ball shows a seam up its back).
function smoothNormals(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, sum = new Map(), keys = new Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const k = keys[i] = Math.round(p.getX(i) * 2e4) + ',' + Math.round(p.getY(i) * 2e4) + ',' + Math.round(p.getZ(i) * 2e4);
    let s = sum.get(k); if (!s) sum.set(k, s = [0, 0, 0]);
    s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i);
  }
  for (let i = 0; i < p.count; i++) { const s = sum.get(keys[i]), l = Math.hypot(s[0], s[1], s[2]) || 1; n.setXYZ(i, s[0] / l, s[1] / l, s[2] / l); }
  return g;
}
// Make the triangles face outwards (a closed shape's outward faces enclose a positive volume).
function faceOut(pos, idx, flip) {
  let cx = 0, cy = 0, cz = 0; const n = pos.length / 3;
  for (let i = 0; i < n; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; }
  cx /= n; cy /= n; cz /= n;
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ax = pos[a] - cx, ay = pos[a + 1] - cy, az = pos[a + 2] - cz, bx = pos[b] - cx, by = pos[b + 1] - cy, bz = pos[b + 2] - cz, dx = pos[c] - cx, dy = pos[c + 1] - cy, dz = pos[c + 2] - cz;
    vol += ax * (by * dz - bz * dy) + ay * (bz * dx - bx * dz) + az * (bx * dy - by * dx);
  }
  if ((vol < 0) !== !!flip) for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; }
}
function meshOf(pos, idx, uv, flip) {
  faceOut(pos, idx, flip);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return smoothNormals(g);
}

// A surface over a grid: at(u, v, out) puts the point for u, v (each from 0 to 1) into out.
// The surface's u and v are kept in userData for colouring; uv holds (u, 1 - v) for anything that wants a picture on it.
export function gridGeo(nu, nv, at, flip) {
  const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), U = new Float32Array(n), V = new Float32Array(n), idx = [];
  for (let j = 0, k = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
    at(i / nu, j / nv, _v); pos[k * 3] = _v.x; pos[k * 3 + 1] = _v.y; pos[k * 3 + 2] = _v.z;
    U[k] = uv[k * 2] = i / nu; V[k] = j / nv; uv[k * 2 + 1] = 1 - j / nv;
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = meshOf(pos, idx, uv, flip); g.userData.u = U; g.userData.v = V;
  return g;
}

// A tube that follows a path and changes thickness along the way, with rounded ends.
//   path: [[x, y, z], ...] (the tube curves smoothly through them);  r: one radius, a list spread evenly along the path, or (t) => radius
//   o.seg: sides (8)   o.len: rings along it   o.wide, o.deep: stretch of the cross-section sideways and along o.up ([0, 1, 0])
//   o.round: how rounded the ends are (1; 0 leaves them open)   o.shape(a, t): extra stretch round the tube (a: angle) and along it
export function tubeGeo(path, r, o = {}) {
  const seg = o.seg || 8, pts = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.LineCurve3(pts[0], pts[1]);
  const len = o.len || Math.max(2, (pts.length - 1) * 4), round = o.round === undefined ? 1 : o.round, capN = round > 0 ? 3 : 0;
  const rad = typeof r === 'function' ? r : Array.isArray(r) ? (t) => along(r, t) : () => r;
  const wide = o.wide || 1, deep = o.deep || 1, up = o.up || [0, 1, 0], squat = Math.min(1, (wide + deep) / 2);
  const rings = [];       // each: centre, side axis, up axis, radius, t
  const S = new THREE.Vector3(), U = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i <= len; i++) {
    const t = i / len; curve.getPointAt(t, C); curve.getTangentAt(t, _t).normalize();
    if (i === 0) { S.set(up[0], up[1], up[2]).cross(_t); if (S.lengthSq() < 1e-4) S.set(0, 0, 1).cross(_t); if (S.lengthSq() < 1e-4) S.set(1, 0, 0); }
    else S.addScaledVector(_t, -S.dot(_t));
    S.normalize(); U.crossVectors(_t, S);
    const R = Math.max(1e-4, rad(t));
    if (i === 0) for (let m = capN; m >= 1; m--) { const a = (PI / 2) * (m / capN); rings.push({ c: C.clone().addScaledVector(_t, -R * Math.sin(a) * round * squat), s: S.clone(), u: U.clone(), r: R * Math.cos(a), t: 0 }); }
    rings.push({ c: C.clone(), s: S.clone(), u: U.clone(), r: R, t });
    if (i === len) for (let m = 1; m <= capN; m++) { const a = (PI / 2) * (m / capN); rings.push({ c: C.clone().addScaledVector(_t, R * Math.sin(a) * round * squat), s: S.clone(), u: U.clone(), r: R * Math.cos(a), t: 1 }); }
  }
  const nr = rings.length, n = nr * (seg + 1), pos = new Float32Array(n * 3), T = new Float32Array(n), A = new Float32Array(n), idx = [];
  rings.forEach((g, j) => {
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * PI * 2, k = j * (seg + 1) + i, sh = o.shape ? o.shape(a, g.t) : 1;
      _v.copy(g.c).addScaledVector(g.s, Math.cos(a) * g.r * wide * sh).addScaledVector(g.u, Math.sin(a) * g.r * deep * sh);
      pos[k * 3] = _v.x; pos[k * 3 + 1] = _v.y; pos[k * 3 + 2] = _v.z; T[k] = g.t; A[k] = a;
    }
  });
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = meshOf(pos, idx, null, false); g.userData.u = T; g.userData.v = A;
  return g;
}

export class Sculptor extends Builder {
  constructor(grad = 0.88) { super(grad); this.rough = 0.62; this.rim = 1; }
  // How what is added next catches the light: rough from 0 (wet and shiny) to 1 (chalky), and how strongly the sky lights its edges.
  finish(rough, rim = 1) { this.rough = rough; this.rim = rim; return this; }
  add(g, ...rest) {
    const n = g.attributes.position.count, uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv[i * 2] = this.rough; uv[i * 2 + 1] = this.rim; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return super.add(g, ...rest);
  }
  // A ball, optionally reshaped: o.warp(p) moves each point p of a ball of radius 1 (before it is scaled, turned and placed).
  ball(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, o = {}) {
    const seg = o.seg || 14, g = new THREE.SphereGeometry(1, seg, o.rings || Math.max(6, Math.round(seg * 0.7)));
    if (o.warp) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i); o.warp(_v); p.setXYZ(i, _v.x, _v.y, _v.z); } }
    smoothNormals(g);
    return this.add(g, c, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, r * sx, r * sy, r * sz, o);
  }
  // A tapering tube along a path (see tubeGeo). A colour function is given (t along it, angle round it, x, y, z).
  tube(path, r, c, o = {}) {
    const g = tubeGeo(path, r, o), T = g.userData.u, A = g.userData.v;
    return this.add(g, typeof c === 'function' ? (x, y, z, i) => c(T[i], A[i], x, y, z) : c, 0, 0, 0, 0, 0, 0, 1, 1, 1, o);
  }
  // A free-form surface (see gridGeo). A colour function is given (u, v, x, y, z).
  surf(nu, nv, at, c, x = 0, y = 0, z = 0, o = {}) {
    const g = gridGeo(nu, nv, at, o.flip), U = g.userData.u, V = g.userData.v;
    return this.add(g, typeof c === 'function' ? (px, py, pz, i) => c(U[i], V[i], px, py, pz) : c, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || 1, o.sy || 1, o.sz || 1, o);
  }
  // A shape turned on a lathe about the y axis. profile: [[radius, y], ...] from one end to the other.
  //   o.seg: sides (16)   o.rows: smooth the profile into this many steps   o.wide, o.deep: stretch along x and z
  //   o.shape(a, t): extra stretch at angle a round it (0 is +x, PI / 2 is +z) and t along the profile
  lathe(profile, c, x = 0, y = 0, z = 0, o = {}) {
    const seg = o.seg || 16, rows = o.rows || profile.length - 1, R = profile.map((p) => p[0]), Y = profile.map((p) => p[1]);
    const smooth = !!o.rows, wide = o.wide || 1, deep = o.deep || 1;
    const at = (u, v, out) => {
      const a = u * PI * 2, f = v * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(f)), k = f - i;
      const r = Math.max(0, smooth ? along(R, v) : R[i] + (R[i + 1] - R[i]) * k) * (o.shape ? o.shape(a, v) : 1), h = smooth ? along(Y, v) : Y[i] + (Y[i + 1] - Y[i]) * k;
      out.set(Math.cos(a) * r * wide, h, Math.sin(a) * r * deep);
    };
    return this.surf(seg, rows, at, c, x, y, z, o);
  }
  // A ring (a doughnut lying flat): ring radius R, thickness r. o.tall squashes or stretches its thickness upwards.
  ring(R, r, c, x = 0, y = 0, z = 0, o = {}) {
    const n = o.tseg || 8, prof = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * PI * 2; prof.push([R - Math.cos(a) * r, -Math.sin(a) * r * (o.tall || 1)]); }
    return this.lathe(prof, c, x, y, z, { ...o, rows: 0 });
  }
  // A soft tuft of fur, fat near its root and rounded at the end: from (x, y, z) towards (x + dx, y + dy, z + dz).
  tuft(x, y, z, dx, dy, dz, r, c, o = {}) {
    return this.tube([[x, y, z], [x + dx * 0.5, y + dy * 0.5, z + dz * 0.5], [x + dx, y + dy, z + dz]], o.r || [r * 0.72, r, r * 0.8, r * 0.4], c, { seg: 8, len: 5, ...o });
  }
  part(o = {}) { return this.build({ cast: true, receive: false, material: CHARACTER, ...o }); }
}

// One skin over a chain of joints, for a tail, a ponytail or the end of a scarf: it bends smoothly from joint to joint
// instead of in stiff lengths, and it is drawn as a single piece.
//   mesh: built in the space of whatever the chain hangs from, with every joint at rest (not turned)
//   joints: where it bends, [[x, y, z], ...]: the first measured from the mesh's own origin, each of the others from the one before
// Turn the joints (bendy.joints[i].rotation), then call update().
export class Bendy {
  constructor(mesh, joints) {
    const g = mesh.geometry, pos = g.attributes.position, n = pos.count, nj = joints.length;
    this.mesh = mesh;
    this.joints = joints.map((p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); return o; });
    this.rest = Float32Array.from(pos.array); this.restN = Float32Array.from(g.attributes.normal.array);
    // where each joint sits at rest, and the way from it to the next (the last carries on the way the one before it was going)
    const at = [], dir = [], len = [];
    this.joints.forEach((o, i) => at.push(i ? at[i - 1].clone().add(o.position) : o.position.clone()));
    for (let i = 0; i < nj; i++) {
      const d = i < nj - 1 ? at[i + 1].clone().sub(at[i]) : i ? dir[i - 1].clone().multiplyScalar(len[i - 1]) : new THREE.Vector3(0, 0, 1);
      len.push(d.length() || 1); dir.push(d.normalize());
    }
    // each point of the skin follows the joint before it, and from half-way to the next joint it starts to follow that one too
    this.bone = new Uint8Array(n); this.share = new Float32Array(n);
    let far = 0;
    for (let k = 0; k < n; k++) {
      _v.fromBufferAttribute(pos, k);
      let best = Infinity, c = 0;
      for (let i = 0; i < nj; i++) {
        let f = _t.copy(_v).sub(at[i]).dot(dir[i]) / len[i];
        if (i > 0) f = Math.max(0, f);
        if (i < nj - 1) f = Math.min(1, f);
        const d = _s.copy(at[i]).addScaledVector(dir[i], f * len[i]).distanceToSquared(_v);
        if (d < best - 1e-9) { best = d; c = i + f; }
      }
      const cc = Math.max(0, Math.min(nj - 1, c - 0.5)), b = Math.min(nj - 1, Math.floor(cc));
      this.bone[k] = b; this.share[k] = b < nj - 1 ? sstep(0, 1, cc - b) : 0;
      far = Math.max(far, _v.distanceTo(at[0]));
    }
    g.boundingSphere = new THREE.Sphere(at[0].clone(), far * 1.2);      // (it swings about its first joint, so it never leaves this)
    pos.setUsage(THREE.DynamicDrawUsage); g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    this.at = at;
    this.chain = this.joints.map(() => new THREE.Matrix4()); this.skin = this.joints.map(() => new THREE.Matrix4());
  }
  update() {
    const J = this.joints, C = this.chain, S = this.skin, at = this.at;
    for (let i = 0; i < J.length; i++) {
      J[i].updateMatrix();
      if (i) C[i].multiplyMatrices(C[i - 1], J[i].matrix); else C[i].copy(J[i].matrix);
      S[i].copy(C[i]).multiply(_m.makeTranslation(-at[i].x, -at[i].y, -at[i].z));
    }
    const g = this.mesh.geometry, P = g.attributes.position, N = g.attributes.normal, p = P.array, q = N.array, r = this.rest, rn = this.restN;
    for (let k = 0, o = 0, n = this.bone.length; k < n; k++, o += 3) {
      const e = S[this.bone[k]].elements, w = this.share[k], x = r[o], y = r[o + 1], z = r[o + 2], a = rn[o], b = rn[o + 1], c = rn[o + 2];
      let px = e[0] * x + e[4] * y + e[8] * z + e[12], py = e[1] * x + e[5] * y + e[9] * z + e[13], pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
      if (w > 0) {
        const f = S[this.bone[k] + 1].elements, u = 1 - w;
        px = px * u + (f[0] * x + f[4] * y + f[8] * z + f[12]) * w; py = py * u + (f[1] * x + f[5] * y + f[9] * z + f[13]) * w; pz = pz * u + (f[2] * x + f[6] * y + f[10] * z + f[14]) * w;
        nx = nx * u + (f[0] * a + f[4] * b + f[8] * c) * w; ny = ny * u + (f[1] * a + f[5] * b + f[9] * c) * w; nz = nz * u + (f[2] * a + f[6] * b + f[10] * c) * w;
      }
      p[o] = px; p[o + 1] = py; p[o + 2] = pz; q[o] = nx; q[o + 1] = ny; q[o + 2] = nz;
    }
    P.needsUpdate = true; N.needsUpdate = true;
  }
}

// The characters' material: the colours painted on each model, a shine that varies from piece to piece (it rides in
// the otherwise unused uv: x is roughness, y the strength of the edge light), and a soft light from the sky round
// their edges, which lifts them off the background and shows the shape of dark fur and hair.
export const CHARACTER = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
CHARACTER.onBeforeCompile = (shader) => {
  addTwist(shader);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFinish;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinish = uv;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vFinish;')
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp( vFinish.x, 0.05, 1.0 );')
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      float edgeLight = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 2.6 );
      reflectedLight.indirectDiffuse += irradiance * RECIPROCAL_PI * edgeLight * vFinish.y * 0.55;`);
};
// (a different name from the built-in materials' programs, so the edits above are compiled in)
CHARACTER.customProgramCacheKey = () => 'tide-rush-character';

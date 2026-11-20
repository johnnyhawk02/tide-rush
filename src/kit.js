// Modelling kit: builds detailed low-poly models out of primitives and merges each
// model into a single vertex-coloured mesh, so detail costs almost nothing to draw.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WATER_Y } from './config.js';

// ---------- world bend ----------
// The whole world curves down and away ahead of Robyn (she always stands at z = 0, and the ground is flat for the first few
// metres in front of her, so nothing about the play area changes). It is done in the vertex shader of every material:
// built-in materials through the shared project_vertex chunk, custom shaders by calling bendWorld().
// Shadows are untouched because the shadow camera is orthographic.
// Materials with the define FAR_BEND (the far coastline, sails, lightning) are set down on the curved sea horizon instead,
// and NO_BEND leaves a material alone.
export const BEND_K = 0.0008, BEND_START = 6;
// The spiral world also twists everything ahead of Robyn around a line that runs up the middle of the track, so the pier
// corkscrews away into the distance. TWIST.value is (turn in radians per metre, height of the line, unused); it is zero
// everywhere else. The twist grows gently from nothing at Robyn's feet, so the lanes right in front of her stay level.
export const TWIST = { value: new THREE.Vector3(0, 3, 0) }, TWIST_SOFT = 34;
// The mountain and rollercoaster levels are real hills: the road rises and falls with the distance along it, and everything
// standing on it goes up and down with it (the sea and the far coast stay where they are, far below). HILL.value is
// (height in metres, how far Robyn is into the hill, the hill's length, the height of the road under Robyn) and
// HILL_SHAPE.value is (number of dips, how deep they are: 0 for one smooth mountain). hillHeight() is the same sum for the camera.
export const HILL = { value: new THREE.Vector4(0, 0, 280, 0) }, HILL_SHAPE = { value: new THREE.Vector2(1, 0) };
export function hillHeight(s, A = HILL.value.x, L = HILL.value.z, n = HILL_SHAPE.value.x, dip = HILL_SHAPE.value.y) {
  const u = Math.max(0, Math.min(1, s / L)) * Math.PI * 2;
  return A * 0.5 * (1 - Math.cos(u)) * (1 - dip * 0.5 * (1 - Math.cos(u * n)));
}
const TWIST_DECL = `
#ifndef TWIST_DECL
#define TWIST_DECL
uniform vec3 uTwist;
uniform vec4 uHill;
uniform vec2 uHillB;
float hillAt( float s ) { float hu = clamp( s / uHill.z, 0.0, 1.0 ) * 6.2831853; return uHill.x * 0.5 * ( 1.0 - cos( hu ) ) * ( 1.0 - uHillB.y * 0.5 * ( 1.0 - cos( hu * uHillB.x ) ) ); }
#endif
`;
const HILL_BODY = (p) => `if ( uHill.x != 0.0 ) ${p}.y += hillAt( uHill.y - ${p}.z ) - uHill.w;`;
const TWIST_BODY = (p, d) => `if ( uTwist.x != 0.0 ) { float twA = uTwist.x * ${d} * ${d} / ( ${d} + ${TWIST_SOFT.toFixed(1)} ); float twC = cos( twA ), twS = sin( twA ); vec2 twP = vec2( ${p}.x, ${p}.y - uTwist.y ); ${p}.x = twC * twP.x - twS * twP.y; ${p}.y = twS * twP.x + twC * twP.y + uTwist.y; }`;
export const BEND_GLSL = `${TWIST_DECL}
vec4 bendWorld(vec4 wp){ float bz = max(0.0, -wp.z - ${BEND_START.toFixed(1)}); ${TWIST_BODY('wp', 'bz')} ${HILL_BODY('wp')} wp.y -= ${BEND_K} * bz * bz; return wp; }
// the sea and other things that stay at sea level while the road climbs
vec4 bendSea(vec4 wp){ float bz = max(0.0, -wp.z - ${BEND_START.toFixed(1)}); ${TWIST_BODY('wp', 'bz')} wp.y -= uHill.w + ${BEND_K} * bz * bz; return wp; }
`;
THREE.ShaderChunk.common = TWIST_DECL + THREE.ShaderChunk.common;
// every material shares the one twist uniform
export const addTwist = (shader) => { shader.uniforms.uTwist = TWIST; shader.uniforms.uHill = HILL; shader.uniforms.uHillB = HILL_SHAPE; };
THREE.Material.prototype.onBeforeCompile = addTwist;
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;', `
mvPosition = modelMatrix * mvPosition;
#ifndef NO_BEND
if ( ! isOrthographic ) {
  float bendZ = max( 0.0, - mvPosition.z - ${BEND_START.toFixed(1)} );
  ${TWIST_BODY('mvPosition', 'bendZ')}
  #ifdef FAR_BEND
    mvPosition.y -= uHill.w;
    float bendH = max( 0.5, cameraPosition.y - ( ${WATER_Y.toFixed(2)} ) );
    float bendS = max( 1.0, ${BEND_START.toFixed(1)} + cameraPosition.z );
    float bendU = sqrt( bendS * bendS + bendH / ${BEND_K} ) - bendS;
    mvPosition.y += bendH - 2.0 * ${BEND_K} * bendU * max( 0.0, cameraPosition.z - mvPosition.z );
  #else
    ${HILL_BODY('mvPosition')}
    mvPosition.y -= ${BEND_K} * bendZ * bendZ;
  #endif
}
#endif
mvPosition = viewMatrix * mvPosition;`);
if (!THREE.ShaderChunk.project_vertex.includes('bendZ')) console.warn('world bend: shader chunk was not patched');

// Split any triangle that is longer than "step" along z, so long flat things (the deck, rails, sea walls) follow the bend
// instead of cutting straight across it. Short triangles are left alone.
export function sliceZ(g, step = 8) {
  const pos = g.attributes.position;
  if (!pos || !g.index) return g;
  const idx = g.index.array, pa = pos.array;
  let long = false;
  for (let i = 0; i < idx.length && !long; i += 3) {
    const a = pa[idx[i] * 3 + 2], b = pa[idx[i + 1] * 3 + 2], c = pa[idx[i + 2] * 3 + 2];
    if (Math.max(a, b, c) - Math.min(a, b, c) > step) long = true;
  }
  if (!long) return g;
  const names = Object.keys(g.attributes), size = names.map((n) => g.attributes[n].itemSize), data = names.map((n) => Array.from(g.attributes[n].array));
  const P = data[names.indexOf('position')], out = [];
  let count = pos.count;
  const Z = (i) => P[i * 3 + 2];
  const mix = (i, j, zp) => {
    const t = (zp - Z(i)) / (Z(j) - Z(i));
    for (let a = 0; a < data.length; a++) { const d = data[a], s = size[a]; for (let k = 0; k < s; k++) d.push(d[i * s + k] + (d[j * s + k] - d[i * s + k]) * t); }
    return count++;
  };
  const tri = (a, b, c) => {
    const za = Z(a), zb = Z(b), zc = Z(c), lo = Math.min(za, zb, zc), hi = Math.max(za, zb, zc);
    if (hi - lo <= step) { out.push(a, b, c); return; }
    let p = Math.round((lo + hi) / 2 / step) * step;
    if (!(p > lo + 0.01 && p < hi - 0.01)) p = (lo + hi) / 2;
    const v = [a, b, c], s = [za, zb, zc].map((z) => (z > p + 1e-4 ? 1 : z < p - 1e-4 ? -1 : 0));
    const zi = s.indexOf(0);
    if (zi >= 0) {   // the plane passes through one corner: two pieces
      const v0 = v[zi], v1 = v[(zi + 1) % 3], v2 = v[(zi + 2) % 3], q = mix(v1, v2, p);
      tri(v0, v1, q); tri(v0, q, v2);
    } else {         // one corner on its own side: a triangle and a quad
      const li = s[0] !== s[1] && s[0] !== s[2] ? 0 : s[1] !== s[0] && s[1] !== s[2] ? 1 : 2;
      const v0 = v[li], v1 = v[(li + 1) % 3], v2 = v[(li + 2) % 3], q1 = mix(v0, v1, p), q2 = mix(v2, v0, p);
      tri(v0, q1, q2); tri(q1, v1, v2); tri(q1, v2, q2);
    }
  };
  for (let i = 0; i < idx.length; i += 3) tri(idx[i], idx[i + 1], idx[i + 2]);
  const ng = new THREE.BufferGeometry();
  names.forEach((n, a) => ng.setAttribute(n, new THREE.BufferAttribute(new Float32Array(data[a]), size[a])));
  ng.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1));
  g.dispose();
  return ng;
}

export const C = {
  wood: 0xb98f5e, woodLight: 0xd3ab78, woodDark: 0x7b5a3c, woodDeep: 0x4d3927,
  white: 0xf6f1e7, cream: 0xfff1cf, iron: 0x2c3640, steel: 0x8a96a3, stone: 0xa7a9a6, stoneDark: 0x7d8185,
  red: 0xe5383b, coral: 0xff7a66, orange: 0xff9a3c, yellow: 0xffc928, gold: 0xffb400,
  teal: 0x18a7a0, aqua: 0x7fd9d2, mint: 0xa8e6cf, sky: 0x6cc4f0, blue: 0x2f6fd0, navy: 0x22365c,
  pink: 0xff9ec4, rose: 0xf06292, lilac: 0xb9a3e3, green: 0x4caf6a, leaf: 0x3d8b4f,
  sand: 0xe9d3a1, slate: 0x56606d, brick: 0xc0694b, glass: 0x9fd3e8, glassDark: 0x35576e,
  rope: 0xd8bd8a, black: 0x1b1f24, rubber: 0x23272c, skin: 0xf5c7a3,
};

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

export const MAT = {
  solid: new THREE.MeshLambertMaterial({ vertexColors: true }),
  double: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  glossy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.0 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
};

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();
const _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

// Flat-shaded geometry from a list of triangles: [[x,y,z],[x,y,z],[x,y,z]] each.
export function flatGeo(tris) {
  const pos = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => { for (let k = 0; k < 3; k++) pos.set(t[k], i * 9 + k * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(tris.length * 6), 2));
  g.computeVertexNormals();
  return g;
}
// Quad helper for flatGeo (a,b,c,d counter-clockwise seen from outside).
export const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];

// Triangular prism: base w wide on x at y=0, apex at y=h, extruded d along z (centred).
export function prismGeo(w, h, d) {
  const x = w / 2, z = d / 2;
  const A = [-x, 0, z], B = [x, 0, z], T = [0, h, z], A2 = [-x, 0, -z], B2 = [x, 0, -z], T2 = [0, h, -z];
  return flatGeo([[A, B, T], [B2, A2, T2], ...quad(B, B2, T2, T), ...quad(A2, A, T, T2), ...quad(A, A2, B2, B)]);
}

export class Builder {
  constructor(grad = 0.82) {
    this.solid = []; this.glowParts = []; this.grad = grad;
    this.cur = new THREE.Matrix4(); this.stack = [];
  }
  // Run fn with everything it adds placed relative to (x,y,z) and rotated by ry (and optionally scaled).
  at(x, y, z, ry, fn, scale = 1) {
    this.stack.push(this.cur.clone());
    _e.set(0, ry || 0, 0); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
    this.cur.multiply(_m);
    fn(this);
    this.cur.copy(this.stack.pop());
    return this;
  }
  add(g, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, o) {
    if (!g.index) {
      const n = g.attributes.position.count, idx = new Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(idx);
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    _m.premultiply(this.cur);
    g.applyMatrix4(_m);
    const pos = g.attributes.position, n = pos.count, arr = new Float32Array(n * 3);
    const grad = o && o.grad !== undefined ? o.grad : this.grad;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { const v = pos.getY(i); if (v < y0) y0 = v; if (v > y1) y1 = v; }
    const span = Math.max(1e-4, y1 - y0);
    const fn = typeof color === 'function' ? color : null;
    if (!fn) _c.set(color);
    for (let i = 0; i < n; i++) {
      if (fn) _c.set(fn(pos.getX(i), pos.getY(i), pos.getZ(i), i));
      const k = grad + (1 - grad) * ((pos.getY(i) - y0) / span);
      arr[i * 3] = _c.r * k; arr[i * 3 + 1] = _c.g * k; arr[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    (o && o.glow ? this.glowParts : this.solid).push(g);
    return this;
  }
  box(w, h, d, c, x, y, z, rx, ry, rz, o) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz, 1, 1, 1, o); }
  cyl(rt, rb, h, c, x, y, z, rx, ry, rz, o) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, (o && o.seg) || 12, 1, !!(o && o.open)), c, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  sph(r, c, x, y, z, sx = 1, sy = 1, sz = 1, o) {
    const seg = (o && o.seg) || 12;
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), c, x, y, z, 0, 0, 0, sx, sy, sz, o);
  }
  // Partial sphere: top dome by default (theta 0..thetaLen).
  dome(r, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, o) {
    const seg = (o && o.seg) || 14;
    const g = new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, (o && o.t0) || 0, (o && o.tl) || Math.PI / 2);
    return this.add(g, c, x, y, z, rx, ry, rz, sx, sy, sz, o);
  }
  cone(r, h, c, x, y, z, rx, ry, rz, o) { return this.add(new THREE.ConeGeometry(r, h, (o && o.seg) || 12), c, x, y, z, rx, ry, rz, 1, 1, 1, o); }
  cap(r, len, c, x, y, z, rx, ry, rz, o) { return this.add(new THREE.CapsuleGeometry(r, len, 4, (o && o.seg) || 10), c, x, y, z, rx, ry, rz, 1, 1, 1, o); }
  tor(r, tube, c, x, y, z, rx, ry, rz, o) {
    return this.add(new THREE.TorusGeometry(r, tube, (o && o.tseg) || 6, (o && o.seg) || 16, (o && o.arc) || Math.PI * 2), c, x, y, z, rx, ry, rz, 1, 1, 1, o);
  }
  prism(w, h, d, c, x, y, z, ry, o) { return this.add(prismGeo(w, h, d), c, x, y, z, 0, ry || 0, 0, 1, 1, 1, o); }
  flat(tris, c, x, y, z, rx, ry, rz, o) { return this.add(flatGeo(tris), c, x, y, z, rx, ry, rz, 1, 1, 1, o); }

  build(o = {}) {
    const out = [];
    if (this.solid.length) {
      const m = new THREE.Mesh(sliceZ(mergeGeometries(this.solid)), o.material || MAT.solid);
      m.castShadow = !!o.cast; m.receiveShadow = o.receive !== false;
      out.push(m);
    }
    if (this.glowParts.length) out.push(new THREE.Mesh(sliceZ(mergeGeometries(this.glowParts)), MAT.glow));
    this.solid.forEach((g) => g.dispose()); this.glowParts.forEach((g) => g.dispose());
    this.solid = []; this.glowParts = [];
    if (out.length === 1) return out[0];
    const grp = new THREE.Group();
    out.forEach((m) => grp.add(m));
    return grp;
  }
}

// ---------- canvas textures ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export let MAX_ANISO = 4;
export function setMaxAniso(v) { MAX_ANISO = Math.min(8, v || 1); }

// Deck planks. One tile covers 4.4 m across (u) and 4 m along the walk (v): 16 planks.
export function plankTexture() {
  const S = 512, cv = canvas(S, S), g = cv.getContext('2d');
  const rng = makeRng(77);
  const n = 16, ph = S / n;
  for (let i = 0; i < n; i++) {
    const l = 52 + rng() * 14, hue = 27 + rng() * 8, sat = 34 + rng() * 10;
    g.fillStyle = `hsl(${hue} ${sat}% ${l}%)`;
    g.fillRect(0, i * ph, S, ph);
    // grain streaks
    for (let k = 0; k < 26; k++) {
      const y = i * ph + 2 + rng() * (ph - 4), x = rng() * S, len = 40 + rng() * 160;
      g.strokeStyle = `hsla(${hue} ${sat}% ${l + (rng() < 0.5 ? -9 : 7)}% / ${0.25 + rng() * 0.3})`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (rng() - 0.5) * 2);
      g.stroke();
      if (x + len > S) { g.beginPath(); g.moveTo(x - S, y); g.lineTo(x + len - S, y); g.stroke(); }
    }
    // butt joints
    const j = Math.floor(rng() * 4) * (S / 4) + (i % 2) * (S / 8);
    g.fillStyle = 'rgba(40,26,14,0.55)'; g.fillRect(j, i * ph, 2, ph);
    // gap between planks with a soft highlight on the leading edge
    g.fillStyle = 'rgba(30,20,12,0.85)'; g.fillRect(0, i * ph, S, 2.2);
    g.fillStyle = 'rgba(255,240,210,0.16)'; g.fillRect(0, i * ph + 2.2, S, 1.5);
    // nails along the joists (lane seams sit at u = 0.25 and 0.75 of the tile)
    for (const u of [0.25, 0.75]) {
      g.fillStyle = 'rgba(35,30,28,0.8)';
      g.beginPath(); g.arc(u * S - 5, i * ph + ph / 2, 1.7, 0, 7); g.arc(u * S + 5, i * ph + ph / 2, 1.7, 0, 7); g.fill();
    }
  }
  // worn running lines down the middle of each lane
  for (const u of [0.0, 0.5, 1.0]) {
    const gr = g.createLinearGradient(u * S - 70, 0, u * S + 70, 0);
    gr.addColorStop(0, 'rgba(255,236,200,0)'); gr.addColorStop(0.5, 'rgba(255,236,200,0.13)'); gr.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = gr; g.fillRect(u * S - 70, 0, 140, S);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

// Old brickwork for the sewers. One tile is 4 m wide and 4 m high: 8 bricks by 16 courses, with moss and damp streaks.
export function brickTexture() {
  const S = 512, cv = canvas(S, S), g = cv.getContext('2d'), rng = makeRng(91);
  g.fillStyle = '#3b382f'; g.fillRect(0, 0, S, S);
  const rows = 16, cols = 8, bh = S / rows, bw = S / cols;
  for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
    const x = c * bw + (r % 2) * bw / 2, y = r * bh, mossy = rng() < 0.15;
    g.fillStyle = mossy ? `hsl(${95 + rng() * 30} 30% ${27 + rng() * 10}%)` : `hsl(${14 + rng() * 16} ${30 + rng() * 14}% ${32 + rng() * 15}%)`;
    g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = 'rgba(255,232,200,0.1)'; g.fillRect(x + 2, y + 2, bw - 4, 2);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + 2, y + bh - 5, bw - 4, 3);
    for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,235,210'},0.07)`; g.fillRect(x + 4 + rng() * (bw - 18), y + 4 + rng() * (bh - 12), 4 + rng() * 10, 2 + rng() * 4); }
  }
  for (let i = 0; i < 12; i++) {
    const x = rng() * S, w = 10 + rng() * 30, gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, 'rgba(24,52,28,0)'); gr.addColorStop(0.5, `rgba(24,${52 + rng() * 30},28,0.3)`); gr.addColorStop(1, 'rgba(24,52,28,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, S);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}

export function signTexture(text, bg = '#1c3b5a', fg = '#fff3d6', border = '#ffc928') {
  const cv = canvas(512, 128), g = cv.getContext('2d');
  g.fillStyle = border; g.fillRect(0, 0, 512, 128);
  g.fillStyle = bg; g.fillRect(8, 8, 496, 112);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 84;
  do { g.font = `${size}px "Lilita One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`; size -= 4; } while (g.measureText(text).width > 460 && size > 20);
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return t;
}
const signMats = new Map();
export function signMesh(text, w, h, bg, fg, border) {
  const key = [text, bg, fg, border].join('|');
  if (!signMats.has(key)) signMats.set(key, new THREE.MeshLambertMaterial({ map: signTexture(text, bg, fg, border) }));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMats.get(key));
}

export function puffTexture() {
  const cv = canvas(128, 128), g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

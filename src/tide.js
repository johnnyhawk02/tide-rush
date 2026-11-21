// The tide: the wave that chases Robyn along the coast. It only comes into view when she stumbles.
// It is one sculpted roller (a long back, a crest, a lip that curls over and a hollow face) with the flooded water behind it, and it is
// drawn with the same water code as the sea (water.js), in the colours of whichever sea she is running beside. Where the sea is at
// its usual level the whole sea rises behind the wave (the sea's own shader does that part: see uTide in sky.js), so the flood
// joins up with it. On the hills, in the Glass Tunnel and where there is no sea at all, the water follows the road and pours off both sides of it.
import * as THREE from 'three';
import { BEND_GLSL, HILL, hillHeight } from './kit.js';
import { WATER_Y, clamp, lerp, smooth } from './config.js';
import { WATER_GLSL, waterUniforms } from './water.js';

const FLOOD = 0.55;         // how deep the water stands on the deck behind the wave
const CREST = 1.7;          // how high the wave stands when it is following her
const WIDTH = 13;           // half the width of the sculpted wave
const SEA_GAP = 0.08;       // the raised sea lies this far under the water on the deck, so the two never flicker against each other

// The shape of the wave, cut through from back to front: a list of points (z, y) with z = 0 near the front (Robyn is at -z).
// Each point also says how it behaves:
//   up     0 on the flat water to 1 on the wave              curl   how much it moves when the lip curls over
//   glow   how thin the water is, so how much light shows through it      foam   how much foam gathers there
//   base   the height it grows from when the wave rears up   shade  how much of the sky it can see (the hollow under the lip is dim)
function crossSection() {
  const pts = [];
  const add = (z, y, o) => pts.push({ z, y, up: 0, curl: 0, glow: 0, foam: 0, shade: 1, base: FLOOD, ...o });
  for (const z of [36, 30, 24, 19, 15, 12, 9.5, 7.6, 6.4]) add(z, FLOOD);                                   // the flood
  for (let i = 0; i <= 16; i++) {                                                                          // the back, up to the crest: glassy below, with a crown of foam
    const t = i / 16, e = t * t * (3 - 2 * t);
    add(lerp(5.6, -0.55, t), lerp(FLOOD, CREST, e), { up: Math.min(1, e * 1.6), glow: e * e * 0.62, foam: smooth((t - 0.68) / 0.32) * 0.8 });
  }
  for (let i = 1; i <= 8; i++) {                                                                           // the lip rolls forward and over
    const k = i / 8, a = k * 2.3;
    add(-0.55 - 0.75 * Math.sin(a), CREST - 0.42 + 0.42 * Math.cos(a), { up: 1, curl: 0.3 + 0.7 * k, glow: 1, foam: 0.8 - 0.3 * Math.sin(Math.PI * k) + 0.16 * k, base: FLOOD * (1 - 0.5 * k), shade: 1 - 0.25 * k * k });
  }
  for (const [z, y, c, sh] of [[-0.98, 1.05, 0.9, 0.6], [-0.9, 1.19, 0.7, 0.5], [-0.76, 1.29, 0.45, 0.45], [-0.6, 1.33, 0.22, 0.45]]) add(z, y, { up: 1, curl: c, glow: 0.85, foam: c * 0.8, base: FLOOD * 0.3, shade: sh });      // its underside
  for (const [z, y, g, f, sh] of [[-0.44, 1.3, 0.8, 0, 0.55], [-0.25, 1.15, 0.72, 0, 0.7], [-0.11, 0.93, 0.6, 0.1, 0.85], [-0.06, 0.67, 0.46, 0.22, 0.95], [-0.15, 0.43, 0.32, 0.38, 1], [-0.38, 0.23, 0.2, 0.62, 1], [-0.72, 0.1, 0.1, 0.9, 1], [-1.1, 0.03, 0.05, 1, 1]]) add(z, y, { up: 1, glow: g, foam: f, shade: sh, base: 0 });   // the hollow face
  for (const [z, y] of [[-1.34, -0.04], [-1.4, -0.6], [-1.4, -3.8]]) add(z, y, { up: 1, foam: 1, base: 0 });      // and on down, out of sight below the deck (out at sea this is the foot of the wave)
  // which way the surface faces at each point, and how far along the surface each point is from the tip of the lip (behind it is minus):
  // the foam is drawn in those measurements, so that it follows the shape of the wave
  const tip = pts.reduce((b, p, i) => (p.curl > pts[b].curl ? i : b), 0);
  const len = (i, j) => { let s = 0; for (let k = Math.min(i, j); k < Math.max(i, j); k++) s += Math.hypot(pts[k + 1].z - pts[k].z, pts[k + 1].y - pts[k].y); return s; };
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dz = b.z - a.z, dy = b.y - a.y, l = Math.hypot(dz, dy) || 1;
    p.nz = dy / l; p.ny = -dz / l; p.q = len(i, tip) * (i < tip ? -1 : 1);
  });
  return pts;
}

export class Tide {
  constructor(scene, fx, sky) {
    this.fx = fx; this.sky = sky;
    this.group = new THREE.Group(); scene.add(this.group);
    this.sea = sky.seaMat.uniforms;      // the sea's colours and light, which the wave shares

    const prof = crossSection(), P = prof.length, xs = [], pos = [], nor = [], kk = [], ff = [], idx = [];
    for (let x = -WIDTH; x < WIDTH + 0.01; x += Math.abs(x + 0.08) < 6.6 ? 0.16 : 0.32) xs.push(Math.min(x, WIDTH));      // the columns stand closer together over the pier, where the wave is seen close to
    const cols = xs.length - 1;
    for (const x of xs) for (const p of prof) { pos.push(x, p.y, p.z); nor.push(0, p.ny, p.nz); kk.push(p.glow, p.curl, p.up, p.base); ff.push(p.q, p.foam, p.shade); }
    // (strip by strip from the back of the wave to the front: the camera is behind it, so what it hides is drawn last and costs nothing)
    for (let k = 0; k < P - 1; k++) for (let i = 0; i < cols; i++) { const a = i * P + k, b = a + P; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 4)); g.setAttribute('aF', new THREE.Float32BufferAttribute(ff, 3));
    g.setIndex(idx);
    this.uWave = { value: new THREE.Vector4(1, 0.6, 1, 5.2) };     // (how tall, how far the lip curls over, 1 where the sea is at its usual level and 0 where the water can only follow the road, half the width of the water on the road)
    this.waveMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { ...waterUniforms(this.sea), uScroll: this.sea.uScroll, uWave: this.uWave },
      vertexShader: `attribute vec4 aK; attribute vec3 aF; uniform vec4 uWave; uniform float uTime;
        varying vec3 vPos, vN; varying vec4 vK; varying vec4 vF; varying float vDepth; ${BEND_GLSL}
        void main(){
          float curl = aK.y, up = aK.z, base = aK.w, q = aF.x, t = uTime, open = uWave.z, edge = uWave.w;
          vec3 p = position, n = normal; float ax = abs(p.x), sx = sign(p.x);
          // the crest stands a little higher in some places than in others and the humps travel along it; the front bulges, and the lip rolls over in pulses
          float hv = 1.0 + 0.08 * sin(p.x * 0.6 + t * 1.3) + 0.045 * sin(p.x * 1.45 - t * 1.9 + 1.0);
          float fw = 0.3 * sin(p.x * 0.55 - t * 1.1) + 0.13 * sin(p.x * 1.7 + t * 2.0 + 2.0);
          float over = uWave.y * (0.55 + 0.45 * sin(p.x * 0.7 - t * 2.3));
          // beside the pier the wave slopes away into the swell that crosses the sea (or, on a hill, stops at the edge of the road)
          float sh = mix(1.0, 1.0 - smoothstep(6.5, 12.6, ax), open);
          float tall = uWave.x * mix(1.0, hv, up) * sh, deep = 1.0 + (uWave.x - 1.0) * 0.5;
          if (p.y > base) p.y = base + (p.y - base) * tall;
          p.z = p.z * mix(1.0, deep, up) + fw * up * sh;
          p.z -= curl * over * 0.34 * sh; p.y -= curl * over * 0.22 * sh * uWave.x;
          // where the foam is thick it stands up in soft round puffs, which drift along the wave
          float la = p.x * 2.9 + q * 1.9 + t * 1.3, lb = p.x * 1.7 - q * 2.6 - t * 0.9 + 1.7, sa = sin(la), sb = sin(lb);
          float lump = aF.y * aF.y * up * 0.16 * sh;
          p.yz += n.yz * lump * (0.6 * abs(sa) + 0.4 * abs(sb));
          float ca = 0.6 * sign(sa) * cos(la), cb = 0.4 * sign(sb) * cos(lb);
          n -= lump * (vec3(ca * 2.9 + cb * 1.7, 0.0, 0.0) + vec3(0.0, n.z, -n.y) * (ca * 1.9 - cb * 2.6));
          float e = max(0.0, ax - edge), so = smoothstep(8.0, 12.6, ax);
          p.y -= mix(2.04 * e * e, 2.8 * so * sqrt(so), open);
          n = normalize(vec3(n.x + sx * mix(4.08 * e, 0.9 * sqrt(so), open) * max(n.y, 0.0), n.y, n.z));
          p.x = mix(clamp(p.x, -edge - 1.4, edge + 1.4), p.x, open);
          vK = vec4(aK.x, aF.y, up, sh); vF = vec4(q, position.z, aF.z, e);
          vec4 wp = modelMatrix * vec4(p, 1.0); vPos = wp.xyz; vN = n; wp = bendWorld(wp);
          vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uScroll; varying vec3 vPos, vN; varying vec4 vK; varying vec4 vF; varying float vDepth; ${WATER_GLSL}
        void main(){
          float glow = vK.x, froth = vK.y, up = vK.z;
          vec4 rp = waterRipple(vec2(vPos.x, vPos.z - uScroll));
          vec3 V = normalize(cameraPosition - vPos), N = normalize(vN);
          if (!gl_FrontFacing) N = -N;
          vec3 Nw = normalize(N + (vec3(-rp.x, 0.0, 0.0) + cross(N, vec3(1.0, 0.0, 0.0)) * rp.y) * 0.16);
          // the flat water is the sea's colour; the wave is deep below and pale near the top, where it is thin and the light comes through
          vec3 c = waterColour(Nw, V, mix(0.4 + (rp.w - 0.5) * 0.5 - rp.y * 0.12, 0.16 + glow * 0.8, up), 1.0 - 0.7 * up);
          c = mix(c, uShal * 1.12 + uSun * 0.07, glow * glow * glow * 0.6 * up) * mix(1.0, vF.z, up);
          // the wave's own foam: a net of it that thickens into a white roll along the lip and round the foot, and slides back off the crest
          float crown = 0.0, trail = 0.0;
          if (froth > 0.004) crown = foamLace(vec2(vPos.x, vF.x + uTime * 1.2), froth);
          // and the foam that it leaves behind on the flood, which lies still on the water as the wave runs on
          if (up < 0.996) trail = foamLace(vec2(vPos.x, vPos.z - uScroll), foamWake(rp, vF.y) * (1.0 - up));
          c = mix(c, foamColour(N) * mix(1.0, 0.55 + 0.45 * vF.z, up), max(crown, trail * 0.8));
          c = waterFog(c, vDepth);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.wave = new THREE.Mesh(g, this.waveMat); this.wave.frustumCulled = false;
    this.group.add(this.wave);

    this.z = 24; this.spray = 0;      // z: where the wave is (Robyn is at 0, and 24 is out of sight behind the camera)
    this.group.position.z = this.z;
  }

  // closeness: 0 (out of sight) to 1 (at her heels); surge: more than 0 during the wipe-out, when the wave runs on over her; shown: false in the Star Tunnel
  update(dt, closeness, surge, shown = true) {
    const target = surge > 0 ? lerp(4.2, -9, smooth(surge)) : lerp(24, 4.2, smooth(closeness));
    const z0 = this.z;
    this.z = surge > 0 ? target : lerp(this.z, target, 1 - Math.exp(-5 * dt));
    const h = surge > 0 ? 1.05 + smooth(surge) * 1.0 : 0.92 + closeness * 0.13;      // it rears up as it breaks over her
    this.group.position.z = this.z;
    this.group.visible = shown && this.z < 20;
    // where the road is at sea level the sea itself rises behind the wave; on a hill (or where there is no sea) the water keeps to the road
    const road = hillHeight(HILL.value.y - this.z), c = this.sky.cur;
    const open = (1 - smooth(Math.abs(road) / 1.0)) * (1 - smooth((c.nosea || 0) * 4));
    const near = 1 - smooth((this.z - 17) / 4);
    this.uWave.value.set(h, surge > 0 ? 0.7 + smooth(surge) * 0.5 : 0.55 + closeness * 0.2, open, lerp(5.2, 4.1, clamp(-road / 3, 0, 1)));
    this.sea.uTide.value.set(this.z, this.group.visible ? (FLOOD - SEA_GAP - WATER_Y) * near * open : 0, 0.38 * near * open, 0);
    // spray: a few drops thrown forward off the lip (many more as the wave breaks over her), which travel with the wave
    if (this.group.visible) {
      this.spray += dt * (surge > 0 ? 150 : 40);
      const reach = this.uWave.value.w + 0.6, zl = this.z - 1.15 - (h - 1) * 0.5, run = dt > 0 ? Math.max(-30, Math.min(0, (this.z - z0) / dt)) : 0;
      for (; this.spray > 1; this.spray--) {
        this.fx.emit({ x: (Math.random() - 0.5) * 2 * reach, y: CREST * h * (0.86 + Math.random() * 0.2), z: zl + Math.random() * 0.5, vx: (Math.random() - 0.5) * 1.6, vy: 1.2 + Math.random() * 2.6, vz: run - (1.5 + Math.random() * 3), life: 0.32 + Math.random() * 0.3, size: (0.06 + Math.random() * 0.08) * (surge > 0 ? 1.3 : 1), color: 0xffffff, g: 9, world: false, a: 0.9 });
      }
    }
  }
}

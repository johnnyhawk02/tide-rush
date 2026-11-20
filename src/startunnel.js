// The Star Tunnel: what is on the far side of a portal. Robyn runs along a see-through tunnel of glowing wire
// through deep space, so there is nothing between her and the stars: a starry sky with drifting clouds of gas,
// three spiral galaxies turning slowly far away, star dust streaming past, and one sight after another sailing
// by outside the wire (a ringed planet, an ocean world with its moons, a comet, tumbling asteroids, a satellite,
// a striped giant, a baby sun). The sights take turns, so that there is always something to look at and never a crowd.
// The tunnel and its floor follow the world's bend and curve (kit.js); everything outside stands still in space.
import * as THREE from 'three';
import { BEND_GLSL } from './kit.js';

const PI = Math.PI;
const NOISE = `
float hash3(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise3(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
`;
const BENT_VERT = `varying vec3 vP; varying vec2 vUv; ${BEND_GLSL} void main(){ vP = position; vUv = uv; gl_Position = projectionMatrix * viewMatrix * bendWorld(modelMatrix * vec4(position, 1.0)); }`;
// things out in space: lit from one side by a far-off sun, never bent and never fogged
const SPACE_VERT = `varying vec3 vO; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  void main(){ vO = position; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SUN_DIR = new THREE.Vector3(-0.55, 0.5, 0.67).normalize();
const add = (o) => Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }, o);
const col = (h) => new THREE.Color(h);

// a planet: bands of two colours, wobbled by noise, with a soft rim of air
function planetMat(c1, c2, c3, bands, rim, spot = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { uL: { value: SUN_DIR }, c1: { value: col(c1) }, c2: { value: col(c2) }, c3: { value: col(c3) }, uB: { value: bands }, uRim: { value: col(rim) }, uSpot: { value: spot } },
    vertexShader: SPACE_VERT,
    fragmentShader: `varying vec3 vO; varying vec3 vW; varying vec3 vN; uniform vec3 uL, c1, c2, c3, uRim; uniform float uB, uSpot; ${NOISE}
      void main(){ vec3 o = normalize(vO), n = normalize(vN);
        float w = fbm3(o * 3.0), b = sin(o.y * uB + w * 3.0) * 0.5 + 0.5;
        vec3 c = mix(c1, c2, smoothstep(0.25, 0.75, b)); c = mix(c, c3, smoothstep(0.55, 0.8, fbm3(o * 5.0 + 3.0)));
        if (uSpot > 0.0) { float s = length((o - normalize(vec3(0.5, -0.25, 0.83))) * vec3(1.0, 1.9, 1.0)); c = mix(c, c3 * 1.25, smoothstep(0.3, 0.18, s)); }
        float l = max(dot(n, uL), 0.0), rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 2.5);
        c = c * (0.1 + 1.05 * l) + uRim * rim * (0.25 + 0.6 * l);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
// rocks, panels and other hard things: flat faces, one colour each
function hardMat(c, glow = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { uL: { value: SUN_DIR }, c1: { value: col(c) }, uG: { value: glow } },
    vertexShader: SPACE_VERT,
    fragmentShader: `varying vec3 vW; uniform vec3 uL, c1; uniform float uG;
      void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); float l = max(dot(n, uL), 0.0);
        gl_FragColor = vec4(c1 * (0.16 + 0.95 * l + uG), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
// a soft glow on a flat card: a halo, a comet's tail, a sun's rays
function glowMat(c, kind = 0) {
  return new THREE.ShaderMaterial(add({
    side: THREE.DoubleSide, uniforms: { c1: { value: col(c) }, uT: { value: 0 }, uK: { value: kind } },
    vertexShader: SPACE_VERT,
    fragmentShader: `varying vec2 vUv; uniform vec3 c1; uniform float uT, uK;
      void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p), a;
        if (uK < 0.5) a = pow(max(0.0, 1.0 - r), 2.2);                                   // halo
        else if (uK < 1.5) { float t = vUv.x; a = pow(t, 1.6) * smoothstep(1.0, 0.0, abs(p.y) / (0.12 + 0.88 * (1.0 - t))) * smoothstep(1.0, 0.92, t); }   // tail: bright at one end, fanning out
        else { float an = atan(p.y, p.x); a = pow(max(0.0, 1.0 - r), 1.6) * (0.55 + 0.45 * sin(an * 9.0 + uT * 0.8) * sin(an * 5.0 - uT * 0.5)); }   // rays
        gl_FragColor = vec4(c1 * a, a);
        #include <colorspace_fragment>
      }`,
  }));
}
const ball = (r, mat, seg = 28) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat);
function ring(r0, r1, c1, c2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { c1: { value: col(c1) }, c2: { value: col(c2) }, uR: { value: new THREE.Vector2(r0, r1) } },
    vertexShader: SPACE_VERT,
    fragmentShader: `varying vec3 vO; uniform vec3 c1, c2; uniform vec2 uR;
      void main(){ float t = (length(vO.xy) - uR.x) / (uR.y - uR.x);
        float b = 0.55 + 0.45 * sin(t * 38.0) * sin(t * 13.0 + 1.0), gap = smoothstep(0.02, 0.06, abs(t - 0.62));
        gl_FragColor = vec4(mix(c1, c2, t) * (0.7 + 0.5 * b), (0.35 + 0.5 * b) * gap * smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.93, t));
        #include <colorspace_fragment>
      }`,
  }));
  m.rotation.x = -PI / 2;
  return m;
}
function rock(r, seed, mat) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.34 * (Math.sin(x * 2.1 / r + seed) * Math.cos(y * 2.7 / r + seed * 1.7) * 0.5 + 0.5) + 0.12 * Math.sin(z * 4.3 / r + seed * 2.3);
    p.setXYZ(i, x * k, y * k * 0.85, z * k);
  }
  return new THREE.Mesh(g, mat);
}

// ---- the sights that sail past, one after another ----
// Each is { make(), spin(o, t, dt), from: [x, y] far ahead, to: [x, y] as it passes (for the right-hand side), secs }
const SIGHTS = [
  { // a ringed planet
    from: [120, 34], to: [62, 14], secs: 9,
    make() { const g = new THREE.Group(); g.add(ball(22, planetMat(0xe9c98a, 0xb9793f, 0xf6e7c0, 13, 0xffe2a8))); const r = ring(30, 47, 0xf3dfb2, 0xa98a5c); g.add(r); g.rotation.set(0.42, 0, 0.3); return g; },
    spin(o, t, dt) { o.children[0].rotation.y += dt * 0.12; },
  },
  { // a comet
    from: [70, 60], to: [30, 20], secs: 7,
    make() { const g = new THREE.Group(); g.add(ball(2.6, hardMat(0xdff6ff, 0.9), 12));
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), glowMat(0x9fe8ff, 0)); halo.name = 'face'; g.add(halo);
      for (const [len, w, c, rz] of [[95, 26, 0x7fdcff, 0.0], [70, 14, 0xfff2c8, 0.12]]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(len, w), glowMat(c, 1)); t.position.x = -len / 2; const h = new THREE.Group(); h.add(t); h.rotation.z = rz; g.add(h); }
      g.rotation.set(0, -0.5, -0.5); return g; },
    spin() {},
  },
  { // an ocean world with two moons
    from: [95, -6], to: [48, -4], secs: 9,
    make() { const g = new THREE.Group(); g.add(ball(15, planetMat(0x1f6fd6, 0x2fb0c8, 0xf4fbff, 5, 0x8fd8ff)));
      const orbit = new THREE.Group(); orbit.rotation.z = 0.3; orbit.name = 'orbit';
      const m1 = rock(2.6, 1.3, hardMat(0xbfb8ae)); m1.position.x = 27; const m2 = rock(1.5, 4.1, hardMat(0xe2b48f)); m2.position.set(-36, 0, 6);
      orbit.add(m1, m2); g.add(orbit); return g; },
    spin(o, t, dt) { o.children[0].rotation.y += dt * 0.2; o.getObjectByName('orbit').rotation.y += dt * 0.5; },
  },
  { // a family of tumbling asteroids, two of them full of glowing crystal
    from: [60, 26], to: [26, 9], secs: 7.5,
    make() { const g = new THREE.Group(), grey = hardMat(0x8d8478), brown = hardMat(0x9a7350), cry = hardMat(0x5ff0d8, 0.55);
      [[0, 0, 0, 4.6], [9, 4, -7, 2.4], [-8, -3, 5, 3.0], [4, -7, 9, 1.7], [-5, 7, -12, 2.0], [13, -2, 12, 1.4], [-13, 2, -4, 1.2], [2, 9, 16, 1.0]].forEach(([x, y, z, r], i) => {
        const m = rock(r, i * 1.9 + 0.4, i === 3 || i === 6 ? cry : i % 2 ? brown : grey); m.position.set(x, y, z); m.userData.w = [0.5 - (i % 3) * 0.3, 0.3 + (i % 4) * 0.15, (i % 2) * 0.4]; g.add(m);
      });
      return g; },
    spin(o, t, dt) { for (const m of o.children) { m.rotation.x += m.userData.w[0] * dt; m.rotation.y += m.userData.w[1] * dt; m.rotation.z += m.userData.w[2] * dt; } o.rotation.y += dt * 0.08; },
  },
  { // a striped giant with a great round storm
    from: [170, 10], to: [95, 6], secs: 10,
    make() { const g = new THREE.Group(); g.add(ball(34, planetMat(0xff9fc6, 0x8c5fd6, 0xffe1f0, 17, 0xffb8e6, 1), 36)); g.rotation.z = -0.2; return g; },
    spin(o, t, dt) { o.children[0].rotation.y += dt * 0.09; },
  },
  { // a little satellite, tumbling slowly, with a winking light
    from: [34, 16], to: [15, 7.5], secs: 6.5,
    make() { const g = new THREE.Group(), box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
      box(1.6, 1.6, 2.4, hardMat(0xe9d27a), 0, 0, 0); box(1.0, 1.0, 0.5, hardMat(0xd9dde6), 0, 0, 1.4);
      for (const sx of [-1, 1]) { box(1.2, 0.12, 0.12, hardMat(0x9aa3b5), sx * 1.4, 0, 0); box(3.4, 0.08, 1.9, hardMat(0x2f6fe0, 0.15), sx * 3.7, 0, 0); }
      const dish = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.6, 12, 1, true), hardMat(0xf2f4f8)); dish.material.side = THREE.DoubleSide; dish.position.set(0, 1.25, -0.4); g.add(dish);
      const lamp = ball(0.22, hardMat(0xff5a5a, 1.2), 8); lamp.position.set(0, -0.9, 1.0); lamp.name = 'lamp'; g.add(lamp);
      g.scale.setScalar(1.5); return g; },
    spin(o, t, dt) { o.rotation.y += dt * 0.5; o.rotation.x += dt * 0.17; o.getObjectByName('lamp').visible = (t * 1.6) % 1 < 0.5; },
  },
  { // a baby sun, with rays
    from: [150, 52], to: [84, 30], secs: 10,
    make() { const g = new THREE.Group(); g.add(ball(12, hardMat(0xffd76a, 1.6), 20));
      const rays = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), glowMat(0xffb347, 2)); rays.name = 'face'; g.add(rays);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), glowMat(0xfff0b0, 0)); halo.name = 'face'; g.add(halo); return g; },
    spin(o, t) { o.children[1].material.uniforms.uT.value = t; },
  },
];

export class Tunnel {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const u = (this.uniforms = { uT: { value: 0 }, uS: { value: 0 }, uEnd: { value: 400 } });

    // ---- far away: the starry sky and three galaxies, all turning very slowly as the tunnel sweeps round ----
    this.far = new THREE.Group(); this.group.add(this.far);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1050, 32, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: u,
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vD; uniform float uT; ${NOISE}
        vec3 stars(vec3 d, float sc, float thr){ vec3 p = d * sc, id = floor(p), f = fract(p) - 0.5; float h = hash3(id); if (h < thr) return vec3(0.0);
          vec3 o = (vec3(hash3(id + 1.7), hash3(id + 5.3), hash3(id + 9.1)) - 0.5) * 0.6; float b = (h - thr) / (1.0 - thr);
          float tw = 0.75 + 0.25 * sin(uT * (2.0 + 6.0 * hash3(id + 3.3)) + h * 40.0);
          return mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.86, 0.7), hash3(id + 2.2)) * smoothstep(0.1 + 0.08 * b, 0.0, length(f - o)) * (0.5 + b) * tw; }
        void main(){ vec3 d = normalize(vD);
          vec3 c = vec3(0.003, 0.003, 0.012);
          float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.9, 0.2))) * 3.2, 2.0));
          // clouds of glowing gas, in patches with dark sky between them
          c += vec3(0.3, 0.1, 0.5) * smoothstep(0.5, 0.82, fbm3(d * 2.2)) * 0.3;
          c += vec3(0.05, 0.32, 0.45) * smoothstep(0.52, 0.85, fbm3(d * 3.1 + 11.0)) * 0.28;
          c += vec3(0.55, 0.16, 0.3) * smoothstep(0.55, 0.85, fbm3(d * 1.6 + 4.0)) * 0.26;
          c += vec3(0.3, 0.33, 0.5) * band * smoothstep(0.3, 0.75, fbm3(d * 6.0)) * 0.16;
          c += stars(d, 90.0, 0.93) + stars(d, 45.0, 0.965) * 1.7 + stars(d, 170.0, 0.9) * 0.6 * (1.0 + band * 2.0);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    sky.renderOrder = -20; sky.frustumCulled = false; this.far.add(sky);
    this.galaxies = [];
    for (const [dir, size, c1, c2, tilt, arms] of [[[-0.62, 0.36, -0.7], 760, 0xfff0d0, 0x6f8dff, [1.0, 0.5, 0.3], 2], [[0.8, 0.2, -0.56], 580, 0xffe0f0, 0xd060ff, [-0.9, -0.6, 1.1], 2], [[0.25, 0.55, 0.8], 600, 0xf0fff8, 0x35d6c0, [0.7, 0.2, -0.4], 3]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial(add({
        side: THREE.DoubleSide, uniforms: { c1: { value: col(c1) }, c2: { value: col(c2) }, uR: { value: 0 }, uA: { value: arms } },
        vertexShader: SPACE_VERT,
        fragmentShader: `varying vec2 vUv; uniform vec3 c1, c2; uniform float uR, uA; ${NOISE}
          void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
            float arm = pow(0.5 + 0.5 * cos(uA * a - 8.0 * log(r + 0.05) + uR), 2.0);
            float dust = fbm3(vec3(p * 6.0, 1.0)), specks = smoothstep(0.86, 1.0, noise3(vec3(p * 46.0, 3.0)));
            float I = exp(-r * 3.4) * (0.2 + 1.5 * arm * (0.45 + 0.9 * dust)) + exp(-r * r * 55.0) * 1.5 + specks * arm * exp(-r * 2.2) * 0.9;
            I *= smoothstep(1.0, 0.7, r);
            gl_FragColor = vec4(mix(c1, c2, smoothstep(0.0, 0.55, r)) * I, I);
            #include <colorspace_fragment>
          }`,
      })));
      const v = new THREE.Vector3(...dir).normalize().multiplyScalar(900); m.position.copy(v); m.lookAt(0, 0, 0); m.rotateX(tilt[0]); m.rotateY(tilt[1]); m.rotateZ(tilt[2]);
      m.renderOrder = -19; this.far.add(m); this.galaxies.push(m);
    }

    // ---- star dust streaming past, to show the speed ----
    const N = 260, pos = new Float32Array(N * 3), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.random() * PI * 2, r = 12 + Math.random() * 58; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 2.5 + Math.sin(a) * r; pos[i * 3 + 2] = Math.random() * 320; sz[i] = 0.5 + Math.random(); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('aS', new THREE.BufferAttribute(sz, 1));
    this.dustU = { uZ: { value: 0 } };
    const dust = new THREE.Points(dg, new THREE.ShaderMaterial(add({
      uniforms: this.dustU,
      vertexShader: `attribute float aS; uniform float uZ; varying float vA; void main(){ vec3 p = position; p.z = mod(p.z + uZ, 320.0) - 300.0;
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aS * 150.0 / -mv.z, 1.0, 5.0); vA = smoothstep(-300.0, -200.0, p.z) * (0.35 + 0.4 * aS); }`,
      fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.8, 0.92, 1.0) * vA, vA * smoothstep(0.5, 0.1, r)); }`,
    })));
    dust.frustumCulled = false; this.group.add(dust);

    // ---- the sights (built the first time each is wanted) ----
    this.near = new THREE.Group(); this.group.add(this.near);
    this.sights = SIGHTS.map((def) => ({ def, o: null, on: false, k: 0, side: 1 }));
    this.order = 0; this.sightT = 0; this.side = Math.random() < 0.5 ? 1 : -1;

    // ---- the wire tunnel: rings and long wires of light, and nothing between them ----
    const tube = new THREE.CylinderGeometry(8.4, 8.4, 300, 48, 60, true); tube.rotateX(PI / 2); tube.translate(0, 2.6, -136);
    const wire = new THREE.Mesh(tube, new THREE.ShaderMaterial(add({
      side: THREE.BackSide, uniforms: u, vertexShader: BENT_VERT,
      fragmentShader: `varying vec3 vP; varying vec2 vUv; uniform float uT, uS, uEnd; ${NOISE}
        float wireAt(float x, float w){ float d = abs(fract(x - 0.5) - 0.5), aa = fwidth(x); return (1.0 - smoothstep(w, w + aa * 1.3, d)) * mix(0.3, 1.0, clamp(w * 2.0 / max(aa, 1e-5), 0.0, 1.0)); }
        void main(){ float s = uS - vP.z;
          float rings = wireAt(s / 9.0, 0.0065), longs = wireAt(vUv.x * 14.0 + s * 0.004, 0.011);
          float halo = exp(-abs(fract(s / 9.0 - 0.5) - 0.5) * 42.0) * 0.14 + exp(-abs(fract(vUv.x * 14.0 + s * 0.004 - 0.5) - 0.5) * 30.0) * 0.1;
          float pulse = 0.7 + 0.3 * sin(s * 0.12 - uT * 5.0);
          vec3 c = mix(pal(s * 0.006 + uT * 0.05), vec3(0.25, 0.9, 1.0), 0.3);
          float a = (max(rings, longs) * pulse + halo) * smoothstep(285.0, 120.0, -vP.z) * step(-vP.z, uEnd);
          gl_FragColor = vec4(c + vec3(0.12) * max(rings, longs), a);
          #include <colorspace_fragment>
        }`,
    })));
    wire.renderOrder = 1; wire.frustumCulled = false; this.group.add(wire);

    // ---- the floor: three lanes of light on smoked glass ----
    const floor = new THREE.PlaneGeometry(7.8, 300, 1, 60); floor.rotateX(-PI / 2); floor.translate(0, 0, -136);
    const fl = new THREE.Mesh(floor, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: u, vertexShader: BENT_VERT,
      fragmentShader: `varying vec3 vP; uniform float uT, uS, uEnd;
        void main(){ float s = uS - vP.z, ax = abs(vP.x);
          float lines = smoothstep(0.09, 0.0, abs(ax - 1.1)) + smoothstep(0.14, 0.0, abs(ax - 3.72));
          float xl = abs(mod(vP.x + 1.1, 2.2) - 1.1);
          float ch = fract((s + xl * 1.4) / 9.0);
          float chev = smoothstep(0.0, 0.03, ch) * smoothstep(0.11, 0.08, ch) * step(ax, 3.3) * smoothstep(1.0, 0.75, xl);
          float cross = smoothstep(0.05, 0.0, abs(fract(s / 4.5 - 0.5) - 0.5) * 4.5) * 0.35;
          float glow = lines + chev * 0.55 + cross;
          vec3 c = vec3(0.03, 0.02, 0.1) + vec3(0.2, 0.85, 1.0) * (lines + cross) + vec3(0.75, 0.3, 1.0) * chev * 0.6;
          float a = mix(0.42, 1.0, clamp(glow, 0.0, 1.0)) * smoothstep(285.0, 150.0, -vP.z) * step(-vP.z, uEnd);
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }`,
    }));
    fl.frustumCulled = false; this.group.add(fl);

    // ---- the way out: a bright gate at the far end ----
    this.gate = new THREE.Mesh(new THREE.CircleGeometry(8.4, 48), new THREE.ShaderMaterial(add({
      side: THREE.DoubleSide, uniforms: u, vertexShader: BENT_VERT,
      fragmentShader: `varying vec2 vUv; uniform float uT;
        void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
          float sw = 0.5 + 0.5 * sin(a * 4.0 + r * 7.0 - uT * 4.0);
          float I = smoothstep(1.0, 0.9, r) * (0.35 + 0.65 * smoothstep(1.0, 0.0, r)) + smoothstep(0.08, 0.0, abs(r - 0.94)) * 1.2;
          gl_FragColor = vec4(mix(vec3(0.75, 0.9, 1.0), vec3(1.0, 0.8, 1.0), sw) * I, I);
          #include <colorspace_fragment>
        }`,
    })));
    this.gate.position.y = 2.6; this.gate.frustumCulled = false; this.group.add(this.gate);
  }

  // Show or hide the tunnel. On the way in, `curve` says which way it sweeps (+1 right, -1 left).
  show(v, curve = 1) {
    this.group.visible = v;
    if (!v) { for (const s of this.sights) if (s.on) { s.on = false; s.o.visible = false; } return; }
    this.turn = curve; this.sightT = 0.5; // (turned so that one of the galaxies starts just off the way ahead, and drifts across as the tunnel sweeps round)
    this.far.rotation.set(0, (curve > 0 ? -0.5 : 0.75) + Math.random() * 0.16 - 0.08, 0);
  }

  // dist: how far Robyn has run; toEnd: how far it is to the way out
  update(dist, t, dt, toEnd) {
    const u = this.uniforms; u.uT.value = t; u.uS.value = dist % 20000; u.uEnd.value = toEnd;
    this.dustU.uZ.value = dist % 320;
    this.gate.position.z = -toEnd; this.gate.visible = toEnd < 300;
    this.far.rotation.y += (this.turn || 1) * 0.045 * dt;
    for (const g of this.galaxies) g.material.uniforms.uR.value = t * 0.25;
    // the next sight sets off when the one before is well on its way (and not when the way out is close)
    if ((this.sightT -= dt) <= 0 && toEnd > 60) {
      const s = this.sights[this.order++ % this.sights.length];
      if (!s.on) {
        if (!s.o) { s.o = s.def.make(); s.o.traverse((m) => { m.frustumCulled = false; }); this.near.add(s.o); }
        s.on = true; s.k = 0; s.side = this.side; this.side = -this.side; s.o.visible = true;
        this.sightT = s.def.secs * 0.55;
      }
    }
    for (const s of this.sights) {
      if (!s.on) continue;
      const d = s.def; s.k += dt / d.secs;
      if (s.k >= 1) { s.on = false; s.o.visible = false; continue; }
      const k = s.k, e = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
      s.o.position.set(s.side * (d.from[0] + (d.to[0] - d.from[0]) * e), d.from[1] + (d.to[1] - d.from[1]) * e, -430 + 500 * e);
      s.o.scale.setScalar((s.o.userData.s0 || (s.o.userData.s0 = s.o.scale.x)) * Math.min(1, k * 7));
      d.spin(s.o, t, dt);
      if (this.faceQ) s.o.traverse((m) => { if (m.name === 'face') m.parent.getWorldQuaternion(m.quaternion).invert().multiply(this.faceQ); });
    }
  }
  // cards that should face the camera (halos and rays) borrow its rotation
  face(camera) { (this.faceQ || (this.faceQ = new THREE.Quaternion())).copy(camera.quaternion); }
}

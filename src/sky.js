// Sky dome, sun and stars, clouds, far headlands, gulls, the sea, rain and lightning, and the lighting for each level.
import * as THREE from 'three';
import { Builder, C, makeRng, puffTexture, BEND_GLSL } from './kit.js';
import { WATER_Y, ZONE_LEN, zoneOfLevel, lerp, smooth } from './config.js';

const col = (h) => new THREE.Color(h);
const PI = Math.PI;
// One lighting palette per level, indexed by zone id; each blends into the next over the last stretch of the level.
const PAL = [
  { top: 0x4a7fc4, hor: 0xffd3a1, sun: 0xffd9a8, sunI: 2.5, hemiS: 0xcfe3ff, hemiG: 0xd8b48e, hemiI: 1.25, deep: 0x1f6f95, shal: 0x63c1c6, cloud: 0xffe6d0, el: 0.3, az: -0.75, stars: 0, storm: 0 },   // promenade: sunrise
  { top: 0x2f83dc, hor: 0xc6e9fb, sun: 0xfff5e0, sunI: 2.9, hemiS: 0xd6ecff, hemiG: 0xc9c2a8, hemiI: 1.35, deep: 0x12689a, shal: 0x45c6cf, cloud: 0xffffff, el: 0.85, az: -0.2, stars: 0, storm: 0 },   // pier: midday
  { top: 0x41468f, hor: 0xffa173, sun: 0xffb27a, sunI: 2.3, hemiS: 0xc9c4ff, hemiG: 0xd9a58a, hemiI: 1.15, deep: 0x27507f, shal: 0xe08f84, cloud: 0xffc1a6, el: 0.2, az: 0.7, stars: 0, storm: 0 },     // harbour: sunset
  { top: 0x070b2e, hor: 0x35256e, sun: 0xcfdcff, sunI: 1.75, hemiS: 0x9aa8ff, hemiG: 0x6b5a94, hemiI: 1.3, deep: 0x0a1a44, shal: 0x2c4f96, cloud: 0x3d3a78, el: 0.62, az: -0.38, stars: 1, storm: 0, fun: 1 },  // funfair: night
  { top: 0x353d4a, hor: 0x77858f, sun: 0xcbd8e2, sunI: 1.5, hemiS: 0xb3c2cf, hemiG: 0x70777a, hemiI: 1.4, deep: 0x1c3948, shal: 0x4f838c, cloud: 0x4c5560, el: 0.75, az: 0.2, stars: 0, storm: 1 },     // storm point
  { top: 0x1e90e6, hor: 0xbff3ff, sun: 0xfff2c8, sunI: 3.0, hemiS: 0xdff3ff, hemiG: 0xe8d5a8, hemiI: 1.4, deep: 0x0f8fb5, shal: 0x4fe0d8, cloud: 0xffffff, el: 0.95, az: 0.35, stars: 0, storm: 0 },    // sandcastle bay: high summer
  { top: 0x06202e, hor: 0x0f4a5a, sun: 0x9ff0e0, sunI: 1.5, hemiS: 0x8fe6e0, hemiG: 0x3a5a6a, hemiI: 1.35, deep: 0x04202e, shal: 0x1fd6c0, cloud: 0x14424e, el: 0.7, az: 0.3, stars: 1, storm: 0 },    // smugglers' cove: glowing sea cave
  { top: 0x16245a, hor: 0x9fb4e0, sun: 0xdfe8ff, sunI: 1.9, hemiS: 0xcfe0ff, hemiG: 0xaab8d8, hemiI: 1.45, deep: 0x1d4a7a, shal: 0x8fd0e8, cloud: 0x6f80b0, el: 0.55, az: -0.5, stars: 0.6, storm: 0, aurora: 1, snow: 1 },   // frosty pier: winter dusk
  { top: 0x07100b, hor: 0x1c3524, sun: 0xd9f0b0, sunI: 1.25, hemiS: 0xb4e6a8, hemiG: 0x55664a, hemiI: 1.6, deep: 0x0d2414, shal: 0x7fe04a, cloud: 0x12281a, el: 0.9, az: 0.1, stars: 0, storm: 0, under: 1 },   // the sewers: underground, lit green
  { top: 0x03031a, hor: 0x2b1660, sun: 0xdfe6ff, sunI: 2.1, hemiS: 0xbcaaff, hemiG: 0x6a5aa0, hemiI: 1.45, deep: 0x0a0630, shal: 0x7a4ae0, cloud: 0x3a2a80, el: 0.6, az: -0.4, stars: 1, storm: 0, space: 1 },   // space pier: deep space
  { top: 0x0a1036, hor: 0x6a3a5e, sun: 0xffe6c4, sunI: 2.0, hemiS: 0xffe1cf, hemiG: 0x9a7f96, hemiI: 1.5, deep: 0x10244f, shal: 0x6fa6d8, cloud: 0x4a3a6a, el: 0.6, az: 0.45, stars: 0.9, storm: 0, snow: 1 },   // Christmas pier: a snowy night lit by fairy lights
  { top: 0x86c8f7, hor: 0xffd3e9, sun: 0xfff1dc, sunI: 2.8, hemiS: 0xffe9f4, hemiG: 0xf3c6d8, hemiI: 1.4, deep: 0xdb5f9c, shal: 0xffc6e0, cloud: 0xffbfdd, el: 0.8, az: 0.3, stars: 0, storm: 0 },   // Marshmallow Shore: candyfloss clouds over a strawberry-milkshake sea
  { top: 0x2a1a8c, hor: 0x46e0d0, sun: 0xfff0d0, sunI: 2.4, hemiS: 0xddd4ff, hemiG: 0x8f7fc0, hemiI: 1.45, deep: 0x3a1f9c, shal: 0x4fe6d6, cloud: 0xff8fd6, el: 0.7, az: -0.3, stars: 0.5, storm: 0, swirl: 1 },   // Spiral Bay: a violet sky with a great pink whirl turning in it
  { top: 0x1f6fdc, hor: 0xd8ecff, sun: 0xfff6e0, sunI: 3.0, hemiS: 0xdfeeff, hemiG: 0xa8b89a, hemiI: 1.4, deep: 0x155a8a, shal: 0x4fb6c8, cloud: 0xffffff, el: 0.8, az: 0.45, stars: 0, storm: 0 },   // Sky-High Mountain: clear, bright mountain air
  { top: 0x1a9be8, hor: 0xfff0c8, sun: 0xfff4d8, sunI: 2.9, hemiS: 0xe6f4ff, hemiG: 0xd8c8a0, hemiI: 1.4, deep: 0x0f7fa8, shal: 0x4fd8d0, cloud: 0xffffff, el: 0.7, az: -0.5, stars: 0, storm: 0 },   // Rollercoaster World: a bright afternoon at the theme park
  { top: 0x1689e0, hor: 0xc8f0ff, sun: 0xfff6dc, sunI: 2.9, hemiS: 0xdff4ff, hemiG: 0xd8d0a8, hemiI: 1.4, deep: 0x0d6fa8, shal: 0x3fd0d8, cloud: 0xffffff, el: 0.9, az: 0.25, stars: 0, storm: 0 },   // the Glass Tunnel: a clear tropical day up top (under the water the dive takes over; see update)
  { top: 0xe9a85c, hor: 0xfff1d2, sun: 0xfff3dc, sunI: 2.7, hemiS: 0xfff0dc, hemiG: 0xc08a5a, hemiI: 1.45, deep: 0x3a1a0c, shal: 0x7d4420, foam: 0xb98552, cloud: 0xfff8ea, el: 0.72, az: 0.4, stars: 0, storm: 0 },   // Chocolate Coast: a caramel sky with whipped-cream clouds over a sea of melted chocolate
  { top: 0x3f9be8, hor: 0xdff5ff, sun: 0xfffbe8, sunI: 3.0, hemiS: 0xeaf6ff, hemiG: 0x9fc878, hemiI: 1.4, deep: 0x1a78b0, shal: 0x58c8d8, cloud: 0xffffff, el: 0.8, az: -0.4, stars: 0, storm: 0 },   // Moo Town: a bright spring morning over green meadows
  { top: 0x2f7fe0, hor: 0xcbe4ff, sun: 0xfffaf0, sunI: 2.9, hemiS: 0xe6f0ff, hemiG: 0xc8d8f0, hemiI: 1.4, deep: 0x4f90d0, shal: 0xa8d4f0, cloud: 0xffffff, el: 0.6, az: 0.5, stars: 0, storm: 0, mirror: 1 },   // the Land of Mirrors: a clear pearly sky, and a sea as still as glass
  { top: 0x4f93e6, hor: 0xe2eefa, sun: 0xfff4dc, sunI: 2.6, hemiS: 0xfff6e6, hemiG: 0xd8c8a8, hemiI: 1.5, deep: 0x12689a, shal: 0x45c6cf, cloud: 0xffffff, el: 0.95, az: 0.05, stars: 0, storm: 0 },   // the Museum: high noon, pouring in through the open roof
  { top: 0x1c1a5a, hor: 0xa88ae0, sun: 0xfff0d0, sunI: 2.0, hemiS: 0xd8ccff, hemiG: 0x9a88d8, hemiI: 1.55, deep: 0x8a78d8, shal: 0xe6dcff, foam: 0xffffff, cloud: 0xd8c8ff, el: 0.55, az: -0.3, stars: 0.8, storm: 0 },   // Dream Time: a starry lilac dusk over a sea of cloud
  // 21 Pixel Land: a bright games-machine day; the sea is drawn in square tiles (pixel)
  { top: 0x2f86e8, hor: 0xbfe6ff, sun: 0xfff6d8, sunI: 2.9, hemiS: 0xd8f0ff, hemiG: 0x8fc070, hemiI: 1.25, deep: 0x2f6fd8, shal: 0x5ad0e0, foam: 0xffffff, cloud: 0xffffff, el: 0.8, az: 0.4, stars: 0, storm: 0, pixel: 1 },
];
const BLEND = 0.2;   // share of a level over which the sky changes to the next palette

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;
    this.group = new THREE.Group(); scene.add(this.group);
    this.cur = { top: col(0), hor: col(0), sun: col(0), hemiS: col(0), hemiG: col(0), deep: col(0), shal: col(0), cloud: col(0), stars: 0, storm: 0, fun: 0, snow: 0, aurora: 0, under: 0, space: 0, swirl: 0, mirror: 0, pixel: 0 };
    this.flash = 0; this.boltT = 0; this.hidden = false;
    this.sunDir = new THREE.Vector3(0, 1, 0);

    scene.fog = new THREE.Fog(0xffffff, 70, 300);

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: col(0) }, uHor: { value: col(0) }, uSun: { value: col(0) }, uSunDir: { value: this.sunDir }, uStars: { value: 0 }, uFlash: { value: 0 }, uAurora: { value: 0 }, uSwirl: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uStars, uFlash, uAurora, uSwirl, uTime;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){ vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(uHor, uTop, pow(smoothstep(0.0, 0.62, h), 0.55));
          float s = max(dot(d, uSunDir), 0.0);
          c += uSun * (pow(s, 900.0) * 4.0 + pow(s, 40.0) * 0.42 + pow(s, 5.0) * 0.16);
          if (uStars > 0.01) {
            vec3 g = d * 190.0, f = fract(g) - 0.5; float h = hash(floor(g));
            c += vec3(0.9, 0.95, 1.0) * step(0.9972, h) * smoothstep(0.42, 0.05, length(f)) * smoothstep(0.03, 0.3, d.y) * (0.6 + 0.8 * fract(h * 91.7)) * min(uStars, 1.0);
          }
          if (uStars > 1.01) {   // deep space: a second, denser field of coloured stars and a soft band of nebula
            vec3 g = d * 110.0, f = fract(g) - 0.5; float h = hash(floor(g) + 7.0);
            vec3 tint = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.75, 0.9), fract(h * 53.1));
            c += tint * step(0.985, h) * smoothstep(0.4, 0.04, length(f)) * smoothstep(0.0, 0.2, d.y) * (0.5 + fract(h * 31.7)) * (uStars - 1.0);
            float neb = smoothstep(0.35, 0.0, abs(d.y - 0.32 - 0.12 * sin(atan(d.x, -d.z) * 2.0)));
            c += mix(vec3(0.35, 0.1, 0.55), vec3(0.1, 0.3, 0.6), 0.5 + 0.5 * sin(atan(d.x, -d.z) * 3.0)) * neb * 0.35 * (uStars - 1.0);
          }
          if (uAurora > 0.01) {
            float az = atan(d.x, -d.z);
            float wv = sin(az * 3.0 + uTime * 0.22) * 0.5 + sin(az * 7.0 - uTime * 0.35 + 1.3) * 0.25;
            float band = d.y - (0.24 + wv * 0.1);
            float cur = smoothstep(0.0, 0.025, band) * smoothstep(0.38, 0.0, band);
            float rays = 0.55 + 0.45 * sin(az * 64.0 + sin(az * 9.0 + uTime * 0.5) * 4.0);
            c += mix(vec3(0.15, 1.0, 0.55), vec3(0.62, 0.3, 1.0), smoothstep(0.0, 0.3, band)) * cur * rays * 0.7 * uAurora;
          }
          if (uSwirl > 0.01) {   // Spiral Bay: a great whirl turning slowly in the sky straight ahead
            vec3 ax = normalize(vec3(0.0, 0.42, -1.0)), rt = normalize(cross(ax, vec3(0.0, 1.0, 0.0))), up = cross(rt, ax);
            float r = acos(clamp(dot(d, ax), -1.0, 1.0)), a = atan(dot(d, up), dot(d, rt));
            float arm = smoothstep(-0.3, 0.3, sin(a * 3.0 + log(r + 0.04) * 6.5 + uTime * 0.6));
            c = mix(c, vec3(1.0, 0.24, 0.7), arm * smoothstep(1.7, 0.15, r) * 0.42 * uSwirl);
            c += vec3(1.0, 0.85, 0.95) * smoothstep(0.22, 0.0, r) * 0.7 * uSwirl;
          }
          c = mix(c, uHor, smoothstep(0.03, -0.02, d.y));
          c += vec3(0.55, 0.6, 0.75) * uFlash;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // clouds
    const puff = puffTexture(), rng = makeRng(31);
    this.cloudMat = new THREE.SpriteMaterial({ map: puff, fog: false, depthWrite: false, transparent: true, opacity: 0.92 });
    this.clouds = [];
    for (let i = 0; i < 13; i++) {
      const g = new THREE.Group();
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.6, r = 520 + rng() * 240;
      g.position.set(Math.cos(a) * r, 70 + rng() * 170, Math.sin(a) * r);
      const n = 5 + Math.floor(rng() * 4), w = 60 + rng() * 60;
      for (let k = 0; k < n; k++) {
        const s = new THREE.Sprite(this.cloudMat);
        const t = k / (n - 1) - 0.5;
        s.position.set(t * w, (0.25 - t * t) * 30 + rng() * 8, rng() * 10);
        const sc = (0.6 + rng() * 0.5) * (1 - Math.abs(t) * 0.7) * 62;
        s.scale.set(sc * 1.5, sc, 1);
        g.add(s);
      }
      g.userData.v = 1.5 + rng() * 2;
      this.group.add(g); this.clouds.push(g);
    }

    // far headlands with a lighthouse and a hill-top town; these ignore fog and are tinted by hand
    this.farMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); this.farMat.defines = { FAR_BEND: '' };
    const hb = new Builder(1), hr = makeRng(8);
    const hill = (x, z, w, h, d, c) => hb.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, x, WATER_Y, z, 0, 0, 0, w, h, d);
    for (let i = 0; i < 6; i++) hill(-640 + i * 60 + hr() * 30, -520 - i * 30, 120 + hr() * 60, 26 + hr() * 30, 80, 0x6f8f86);
    for (let i = 0; i < 5; i++) hill(420 + i * 70 + hr() * 30, -560 - i * 20, 130 + hr() * 60, 30 + hr() * 34, 80, 0x7a9488);
    hb.cyl(4, 6, 44, 0xf2efe6, -470, 60, -560).cyl(6, 6, 6, 0xd9534a, -470, 84, -560).cone(7, 8, 0xd9534a, -470, 91, -560);
    for (let i = 0; i < 9; i++) hb.box(12 + hr() * 10, 10 + hr() * 14, 10, [0xf0e2c8, 0xe7c7b4, 0xcfdde2][i % 3], 470 + i * 26, 34 + hr() * 14, -560);
    this.far = hb.build({ material: this.farMat, receive: false });
    this.far.renderOrder = -5;
    this.group.add(this.far);

    // sailing boats near the horizon
    this.sails = [];
    for (let i = 0; i < 5; i++) {
      const b = new Builder(1);
      b.box(1.2, 0.8, 5, 0xf4efe6, 0, 0.4, 0).flat([[[0, 8, 0.4], [0, 1, 0.4], [0, 1, -3.4]], [[0, 7, 0.7], [0, 1, 2.8], [0, 1, 0.7]]], [0xffffff, 0xff9a8a, 0xffe08a][i % 3]);
      const m = b.build({ material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }), receive: false });
      m.material.defines = { FAR_BEND: '' }; m.scale.setScalar(2.4);
      m.position.set((i % 2 ? 1 : -1) * (90 + i * 50), WATER_Y, -230 - i * 45);
      m.rotation.y = 0.5 + i;
      this.group.add(m); this.sails.push(m);
    }

    // space pier: a ringed planet, a blue world and a small moon hang in the sky (faded in for that level only)
    this.spaceMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0 }); this.spaceMat.defines = { NO_BEND: '' };
    {
      const b = new Builder(0.4);
      const bands = (cy, r, cols) => (x, y) => cols[Math.floor(((y - cy) / r * 0.5 + 0.5) * cols.length * 0.999 + Math.sin(x * 0.05) * 0.3 + 10) % cols.length];
      b.add(new THREE.SphereGeometry(70, 28, 20), bands(200, 70, [0xffc98a, 0xf2a66a, 0xffe0b0, 0xd98a5a, 0xffd3a0, 0xe89a62, 0xffe6c0]), -330, 200, -620);
      b.add(new THREE.TorusGeometry(118, 16, 2, 56), (x, y, z, i) => (i % 3 ? 0xe8c9a0 : 0xbfa07a), -330, 200, -620, PI / 2 - 0.42, 0, 0.25, 1, 1, 0.04, { grad: 1 });
      b.add(new THREE.SphereGeometry(46, 24, 16), (x, y, z) => (y > 165 + 38 ? 0xf4f8ff : Math.sin(x * 0.07) + Math.sin(y * 0.09 + 1) + Math.sin(z * 0.06) > 0.55 ? 0x5fd08a : 0x3a7fe0), 380, 165, -640);
      b.add(new THREE.SphereGeometry(17, 16, 12), (x, y, z) => (Math.sin(x * 0.4) * Math.sin(y * 0.37) * Math.sin(z * 0.3) > 0.25 ? 0xa9a6bd : 0xd6d3e4), 90, 300, -560);
      this.planets = b.build({ material: this.spaceMat, receive: false });
      this.planets.renderOrder = -6; this.planets.visible = false; this.group.add(this.planets);
    }

    // gulls
    this.gulls = [];
    const wing = (sx) => { const b = new Builder(1); b.flat([[[0, 0, -0.18], [0, 0, 0.18], [sx * 0.9, 0.05, 0.05]], [[sx * 0.9, 0.05, 0.05], [sx * 0.9, 0.05, -0.1], [0, 0, -0.18]], [[sx * 0.9, 0.05, 0.05], [sx * 1.7, -0.02, 0.12], [sx * 0.9, 0.05, -0.1]]], 0xf7f7f2); return b.build({ material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), receive: false }); };
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), body = new Builder(1);
      body.sph(0.16, 0xf7f7f2, 0, 0, 0, 1, 1, 2.6, { seg: 6 }).cone(0.05, 0.2, 0xffb300, 0, 0, -0.5, -Math.PI / 2, 0, 0, { seg: 5 });
      g.add(body.build({ material: new THREE.MeshBasicMaterial({ vertexColors: true }), receive: false }));
      const l = wing(-1), r = wing(1); g.add(l, r);
      g.userData = { l, r, p: i * 1.7, r0: 14 + i * 7, h: 9 + (i % 3) * 4, cx: (i % 2 ? 1 : -1) * (8 + i * 3), cz: -30 - i * 14, sp: 0.35 + (i % 3) * 0.1 };
      this.group.add(g); this.gulls.push(g);
    }

    // sea
    const seg = quality.low ? 72 : 120;
    const geo = new THREE.PlaneGeometry(700, 700, seg, seg); geo.rotateX(-Math.PI / 2);
    this.seaMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,     // (seen from underneath in the Glass Tunnel)
      uniforms: {
        uTime: { value: 0 }, uScroll: { value: 0 }, uDeep: { value: col(0) }, uShal: { value: col(0) }, uFog: { value: col(0) },
        uSun: { value: col(0) }, uSky: { value: col(0) }, uSunDir: { value: this.sunDir }, uNear: { value: 70 }, uFar: { value: 300 }, uAmp: { value: 1 }, uFoam: { value: col(0xffffff) }, uMirror: { value: 0 }, uPixel: { value: 0 }, uTop: { value: col(0) }, uHor: { value: col(0) },
      },
      vertexShader: `uniform float uTime, uScroll, uAmp, uMirror; varying vec2 vW; varying float vH; varying float vDepth; varying vec3 vPos; ${BEND_GLSL}
        void main(){ vec3 p = position; vec2 w = vec2(p.x, p.z - uScroll);
          float fade = 1.0 - smoothstep(120.0, 300.0, length(p.xz));
          float h = (sin(w.x * 0.21 + uTime * 0.9) * 0.2 + sin(w.y * 0.33 + uTime * 1.25 + w.x * 0.12) * 0.16 + sin((w.x - w.y) * 0.5 + uTime * 1.7) * 0.07) * fade * uAmp * (1.0 - 0.94 * uMirror);
          p.y += h; vH = h; vW = w;
          vec4 wp = modelMatrix * vec4(p, 1.0); vPos = wp.xyz; wp = bendSea(wp);
          vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime, uNear, uFar, uAmp, uMirror, uPixel; uniform vec3 uDeep, uShal, uFog, uSun, uSky, uSunDir, uFoam, uTop, uHor;
        varying vec2 vW; varying float vH; varying float vDepth; varying vec3 vPos; ${BEND_GLSL}
        void main(){
          // Pixel Land: the sea is laid in square tiles, each one a flat colour
          vec2 W = vW; float H = vH;
          if (uPixel > 0.5) { W = floor(vW / 1.6) * 1.6 + 0.8; H = floor(vH * 5.0 + 0.5) / 5.0; }
          // where the Glass Tunnel dives through the surface, the water stands back from the glass
          if (uHill.x < 0.0) { float sl = uHill.y - vPos.z; if (sl > 0.0 && sl < uHill.z) { float hg = ${WATER_Y.toFixed(1)} - hillAt(sl); if (hg > -0.4 && hg < 6.8) { float dy = max(hg - 1.2, 0.0); if (abs(vPos.x) < sqrt(max(31.36 - dy * dy, 0.0))) discard; } } }
          float n1 = sin(W.x * 1.7 + uTime * 1.3) * sin(W.y * 1.3 - uTime * 1.1);
          float n2 = sin(W.x * 0.63 - W.y * 0.9 + uTime * 0.7);
          float n3 = sin(W.x * 4.3 + W.y * 3.1 + uTime * 2.3) * sin(W.x * 2.9 - W.y * 4.7 - uTime * 1.9);
          vec3 c = mix(uDeep, uShal, clamp(smoothstep(-0.3, 0.35, H / uAmp) * 0.75 + n1 * 0.1 + n2 * 0.08, 0.0, 1.0));
          vec3 N = normalize(vec3(cos(W.x * 1.7 + uTime * 1.3) * 0.22 + n3 * 0.12 + cos(W.x * 0.21 + uTime * 0.9) * 0.1, 1.0, cos(W.y * 1.3 - uTime * 1.1) * 0.22 + n3 * 0.12));
          vec3 V = normalize(cameraPosition - vPos);
          float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          c = mix(c, uSky, fr * 0.55);
          vec3 R = reflect(-uSunDir, N);
          c += uSun * pow(max(dot(R, V), 0.0), 70.0) * 0.9;
          float th = 0.3 + (uAmp - 1.0) * 0.25;
          float foam = smoothstep(th, th + 0.1 * uAmp, H + n1 * 0.07 + n3 * 0.05);
          c = mix(c, uFoam, foam * 0.55);
          // the Land of Mirrors: the sea lies still and shows the sky (and, through it, the upside-down copies of the scenery)
          float alpha = 1.0;
          if (uMirror > 0.0) {
            vec3 Nm = normalize(vec3(cos(W.x * 0.9 + uTime * 0.6) * 0.03 + n3 * 0.012, 1.0, cos(W.y * 0.7 - uTime * 0.5) * 0.03 + n3 * 0.012));
            vec3 m = mix(mix(uHor, uTop, 0.3), uTop, pow(clamp(reflect(-V, Nm).y, 0.0, 1.0), 0.5));
            m += uSun * pow(max(dot(reflect(-uSunDir, Nm), V), 0.0), 240.0) * 0.8 + vec3(0.06) * smoothstep(0.55, 0.9, n1 * n2);
            c = mix(c, m, uMirror); alpha = 1.0 - 0.56 * uMirror;
          }
          // from underneath: a bright, rippling ceiling of light
          if (!gl_FrontFacing) c = mix(uShal * 1.1 + vec3(0.08, 0.2, 0.24), vec3(0.92, 1.0, 1.0), smoothstep(0.1, 0.8, n1 * 0.55 + n3 * 0.4 + n2 * 0.3));
          c = mix(c, uFog, smoothstep(uNear, uFar, vDepth));
          gl_FragColor = vec4(c, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sea = new THREE.Mesh(geo, this.seaMat); this.sea.position.y = WATER_Y; this.sea.frustumCulled = false;
    scene.add(this.sea);

    // rain (storm level): streaks that fall around the player; all the motion is in the vertex shader
    {
      const N = quality.low ? 420 : 760, base = new Float32Array(N * 6), end = new Float32Array(N * 2), rr = makeRng(5);
      for (let i = 0; i < N; i++) {
        const x = (rr() - 0.5) * 34, y = rr() * 17, z = rr() * 44;
        base.set([x, y, z, x, y, z], i * 6); end[i * 2] = 0; end[i * 2 + 1] = 1;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(base, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      this.rainMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uA: { value: 0 } },
        vertexShader: `attribute float aEnd; uniform float uTime, uScroll; varying float vE;
          void main(){ vec3 p = position;
            p.y = mod(p.y - uTime * 26.0, 17.0) - 1.5;
            p.z = mod(p.z + uScroll, 44.0) - 36.0;
            p.x += (15.5 - p.y) * 0.16 - 1.2;
            p.y += aEnd * 0.95; p.x -= aEnd * 0.15; p.z -= aEnd * 0.5; vE = aEnd;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `uniform float uA; varying float vE;
          void main(){ gl_FragColor = vec4(0.82, 0.9, 1.0, uA * (0.12 + 0.5 * vE)); }`,
      });
      this.rain = new THREE.LineSegments(g, this.rainMat); this.rain.frustumCulled = false; this.rain.renderOrder = 6; this.rain.visible = false;
      scene.add(this.rain);
    }
    // snow (frosty pier): soft flakes that drift down around the player
    {
      const N = quality.low ? 360 : 640, pos = new Float32Array(N * 3), rr = makeRng(11);
      for (let i = 0; i < N; i++) pos.set([(rr() - 0.5) * 36, rr() * 16, rr() * 46], i * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.snowMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uA: { value: 0 }, uScale: { value: 400 } },
        vertexShader: `uniform float uTime, uScroll, uScale;
          void main(){ vec3 p = position; float id = position.x * 7.3 + position.z * 3.1;
            p.y = mod(p.y - uTime * (1.7 + fract(id) * 1.3), 16.0) - 1.0;
            p.z = mod(p.z + uScroll, 46.0) - 38.0;
            p.x += sin(uTime * 0.9 + id) * 0.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uScale * (0.05 + fract(id * 1.7) * 0.06) / max(0.5, -mv.z);
            gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uA;
          void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 1.0, 1.0, uA * 0.9 * smoothstep(0.5, 0.15, d)); }`,
      });
      this.snow = new THREE.Points(g, this.snowMat); this.snow.frustumCulled = false; this.snow.renderOrder = 6; this.snow.visible = false;
      scene.add(this.snow);
    }
    // bubbles (under the sea): they wobble up through the water on either side of the glass tunnel
    {
      const N = quality.low ? 110 : 200, pos = new Float32Array(N * 3), rr = makeRng(17);
      for (let i = 0; i < N; i++) pos.set([(rr() < 0.5 ? -1 : 1) * (6.6 + rr() * 16), rr() * 22, rr() * 60], i * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.bubbleMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uA: { value: 0 }, uScale: { value: 400 }, uTop: { value: 0 } },
        vertexShader: `uniform float uTime, uScroll, uScale, uTop; varying float vK;
          void main(){ vec3 p = position; float id = position.x * 7.3 + position.z * 3.1;
            p.y = mod(p.y + uTime * (1.2 + fract(id) * 1.6), 22.0) - 5.0;
            p.z = mod(p.z + uScroll, 60.0) - 52.0;
            p.x += sin(uTime * 1.7 + id) * 0.25; vK = smoothstep(uTop, uTop - 1.5, p.y);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uScale * (0.05 + fract(id * 1.7) * 0.09) / max(0.5, -mv.z);
            gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uA; varying float vK;
          void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.28, 0.42, d), shine = smoothstep(0.16, 0.0, length(q - vec2(-0.14, -0.14)));
            gl_FragColor = vec4(0.86, 0.97, 1.0, uA * vK * (ring * 0.75 + shine * 0.9 + smoothstep(0.5, 0.4, d) * 0.12)); }`,
      });
      this.bubbles = new THREE.Points(g, this.bubbleMat); this.bubbles.frustumCulled = false; this.bubbles.renderOrder = 6; this.bubbles.visible = false;
      scene.add(this.bubbles);
    }
    // lightning bolts: three jagged shapes far out to sea, shown for a few frames at a time
    this.bolts = [];
    for (let v = 0; v < 3; v++) {
      const b = new Builder(1), rr = makeRng(60 + v), tris = [];
      let x = 0, y = 230;
      while (y > 0) {
        const nx = x + (rr() - 0.5) * 46, ny = y - (14 + rr() * 22), w = 1.6 + rr() * 1.6;
        tris.push([[x - w, y, 0], [nx - w, ny, 0], [nx + w, ny, 0]], [[x - w, y, 0], [nx + w, ny, 0], [x + w, y, 0]]);
        if (rr() < 0.4) { const bx = nx + (rr() - 0.5) * 70, by = ny - 30 - rr() * 30; tris.push([[nx - 1, ny, 0], [bx, by, 0], [nx + 1, ny, 0]]); }
        x = nx; y = ny;
      }
      b.flat(tris, 0xffffff);
      const m = b.build({ material: new THREE.MeshBasicMaterial({ color: 0xeef3ff, fog: false, side: THREE.DoubleSide }), receive: false });
      m.material.defines = { FAR_BEND: '' };
      m.visible = false; m.renderOrder = -4; this.group.add(m); this.bolts.push(m);
    }

    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5); scene.add(this.sun); scene.add(this.sun.target);
    if (quality.shadows) {
      this.sun.castShadow = true;
      const s = this.sun.shadow; s.mapSize.set(quality.shadowSize, quality.shadowSize);
      const c = s.camera; c.left = -13; c.right = 13; c.top = 40; c.bottom = -14; c.near = 1; c.far = 160;
      s.bias = -0.0006; s.normalBias = 0.04;
    }
    this._a = col(0); this._b = col(0);
    this.dive = 0; this.fogNear = scene.fog.near; this.fogFar = scene.fog.far;
  }

  setVisible(v) { this.hidden = !v; this.group.visible = v; this.sea.visible = v; }
  // A lightning strike somewhere out to sea.
  strike() {
    this.flash = 1; this.boltT = 0.3;
    for (const b of this.bolts) b.visible = false;
    this.bolt = this.bolts[Math.floor(Math.random() * this.bolts.length)];
    this.bolt.position.set((Math.random() - 0.5) * 560, WATER_Y, -420 - Math.random() * 80);
    this.bolt.scale.x = Math.random() < 0.5 ? -1 : 1;
  }

  // dive: how far under the sea the camera is (0 above the water, 1 well under); depth: how far down the road is, in metres
  update(dist, t, dt, dive = 0, depth = 0) {
    const deep = Math.max(0, Math.min(1, (depth - 8) / 18));
    const zf = Math.max(0, dist) / ZONE_LEN, zi = Math.floor(zf), fr = zf - zi;
    const A = PAL[zoneOfLevel(zi)], B = PAL[zoneOfLevel(zi + 1)], k = smooth((fr - (1 - BLEND)) / BLEND);
    const c = this.cur;
    for (const key of ['top', 'hor', 'sun', 'hemiS', 'hemiG', 'deep', 'shal', 'cloud']) c[key].copy(this._a.set(A[key])).lerp(this._b.set(B[key]), k);
    c.stars = lerp(A.stars, B.stars, k); c.storm = lerp(A.storm, B.storm, k);
    for (const key of ['fun', 'snow', 'aurora', 'under', 'space', 'swirl', 'mirror', 'pixel']) c[key] = lerp(A[key] || 0, B[key] || 0, k);
    // under the sea everything takes on the colour of the water, and gets bluer the deeper it goes
    this.dive = dive;
    if (dive > 0) {
      const water = this._a.set(0x1a94c8).lerp(this._b.set(0x0a5a92), deep);
      c.hor.lerp(water, dive); c.top.lerp(this._b.set(0xdff6ff), dive * 0.75);     // (the top of the sky stays bright: it is the daylight seen up the mouth of the tunnel)
      c.hemiS.lerp(this._b.set(0xa8e6ff), dive * 0.6); c.hemiG.lerp(this._b.set(0x4fa0c0), dive * 0.6); c.cloud.lerp(water, dive);
    }
    this.scene.fog.near = lerp(this.fogNear, 3, dive); this.scene.fog.far = lerp(this.fogFar, lerp(105, 88, deep), dive);
    const el = lerp(A.el, B.el, k), az = lerp(A.az, B.az, k);
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.flash = Math.max(0, this.flash - dt * 2.6); this.boltT = Math.max(0, this.boltT - dt);
    const fl = this.flash * this.flash * (this.boltT > 0.12 && this.boltT < 0.2 ? 0.35 : 1);
    if (this.bolt) this.bolt.visible = this.boltT > 0.2 || (this.boltT > 0 && this.boltT < 0.12);

    const du = this.dome.material.uniforms;
    du.uTop.value.copy(c.top); du.uHor.value.copy(c.hor); du.uSun.value.copy(c.sun).multiplyScalar(1 - dive); du.uStars.value = c.stars + c.space; du.uFlash.value = fl; du.uAurora.value = c.aurora; du.uSwirl.value = c.swirl; du.uTime.value = t % 1000;
    this.scene.fog.color.copy(c.hor).lerp(this._a.set(0xdfe8ff), fl * 0.5);
    this.cloudMat.color.copy(c.cloud).lerp(this._a.set(0xffffff), fl * 0.6);
    this.farMat.color.copy(c.hor).lerp(this._a.set(0xffffff), 0.35).multiplyScalar(1 - 0.45 * Math.max(c.stars, c.storm));
    const su = this.seaMat.uniforms;
    su.uTime.value = t; su.uScroll.value = dist; su.uDeep.value.copy(c.deep); su.uShal.value.copy(c.shal); su.uFog.value.copy(this.scene.fog.color);
    su.uSun.value.copy(c.sun); su.uSky.value.copy(c.top).lerp(c.hor, 0.5); su.uAmp.value = 1 + 1.7 * c.storm;
    su.uMirror.value = c.mirror; su.uPixel.value = c.pixel; su.uTop.value.copy(c.top); su.uHor.value.copy(c.hor);
    this.seaMat.transparent = c.mirror > 0.003; this.sea.renderOrder = this.seaMat.transparent ? -1 : 0;   // (see-through only here, so the reflections show)
    su.uFoam.value.copy(this._a.set(A.foam ?? 0xffffff)).lerp(this._b.set(B.foam ?? 0xffffff), k).lerp(c.hemiS, 0.5 * c.stars).multiplyScalar(1 - 0.5 * c.stars - 0.12 * c.storm);
    su.uNear.value = this.scene.fog.near; su.uFar.value = this.scene.fog.far;
    this.rain.visible = c.storm > 0.02 && !this.hidden;
    if (this.rain.visible) { const ru = this.rainMat.uniforms; ru.uTime.value = t % 1000; ru.uScroll.value = dist % 44; ru.uA.value = c.storm; }

    this.snow.visible = c.snow > 0.02 && !this.hidden;
    this.bubbles.visible = dive > 0.02 && !this.hidden;
    if (this.bubbles.visible) { const bu = this.bubbleMat.uniforms; bu.uTime.value = t % 1000; bu.uScroll.value = dist % 60; bu.uA.value = dive; bu.uTop.value = depth + WATER_Y; }
    if (this.snow.visible) { const nu = this.snowMat.uniforms; nu.uTime.value = t % 1000; nu.uScroll.value = dist % 46; nu.uA.value = c.snow; }

    this.hemi.color.copy(c.hemiS); this.hemi.groundColor.copy(c.hemiG); this.hemi.intensity = lerp(A.hemiI, B.hemiI, k) + fl * 2.4;
    this.sun.color.copy(c.sun).lerp(this._a.set(0xbfeaff), dive * 0.5); this.sun.intensity = lerp(A.sunI, B.sunI, k) * (1 - 0.4 * dive);
    // keep the shadow light in front-left/right but never too flat, so shadows stay readable
    const sx = this.sunDir.x, sy = Math.max(this.sunDir.y, 0.55), sz = this.sunDir.z * 0.35;
    this.sun.position.set(sx * 60, sy * 60, sz * 60 - 12);
    this.sun.target.position.set(0, 0, -12);

    // nothing earthly on the horizon in space, and no gulls in space or underground
    const earth = c.space < 0.5 && dive < 0.5;
    this.far.visible = earth; for (const m of this.sails) m.visible = earth;
    for (const g of this.gulls) g.visible = earth && c.under < 0.5;
    for (const g of this.clouds) g.visible = dive < 0.5;
    this.planets.visible = c.space > 0.01; this.spaceMat.opacity = c.space;
    for (const g of this.clouds) { g.position.x += g.userData.v * dt; if (g.position.x > 800) g.position.x = -800; }
    for (const g of this.gulls) {
      const u = g.userData, a = t * u.sp + u.p;
      g.position.set(u.cx + Math.cos(a) * u.r0, u.h + Math.sin(a * 1.7) * 1.2, u.cz + Math.sin(a) * u.r0 * 0.6);
      g.rotation.y = -a - Math.PI;
      const f = Math.sin(t * 7 + u.p) * 0.55;
      u.l.rotation.z = -f; u.r.rotation.z = f;
    }
    for (let k2 = 0; k2 < this.sails.length; k2++) this.sails[k2].rotation.z = Math.sin(t * 0.8 + k2) * 0.06;
  }
}

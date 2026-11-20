// Particles, the chasing tide wave, the warp tunnel and Robyn's ground shadow.
import * as THREE from 'three';
import { Builder, BEND_GLSL } from './kit.js';
import { clamp, lerp, smooth } from './config.js';

export class Particles {
  constructor(scene, max = 1100) {
    this.max = max; this.items = []; this.free = [];
    for (let i = max - 1; i >= 0; i--) this.free.push(i);
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.sz = new Float32Array(max * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSA', new THREE.BufferAttribute(this.sz, 2));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute vec3 aColor; attribute vec2 aSA; varying vec3 vC; varying float vA; uniform float uScale; ${BEND_GLSL}
        void main(){ vC = aColor; vA = aSA.y; vec4 mv = viewMatrix * bendWorld(modelMatrix * vec4(position, 1.0)); gl_PointSize = aSA.x * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.18, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a);
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
    this._c = new THREE.Color();
    for (let i = 0; i < max; i++) this.sz[i * 2] = 0;
  }
  emit(p) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this._c.set(p.color ?? 0xffffff);
    this.items.push({ i, x: p.x, y: p.y, z: p.z, vx: p.vx || 0, vy: p.vy || 0, vz: p.vz || 0, life: p.life || 0.6, t: 0, size: p.size || 0.2, g: p.g ?? 9, drag: p.drag || 0, world: p.world !== false, grow: p.grow || 0, a: p.a ?? 1 });
    this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
  }
  burst(n, f) { for (let k = 0; k < n; k++) this.emit(f(k)); }
  update(dt, speed) {
    const it = this.items; let k = 0;
    for (let n = 0; n < it.length; n++) {
      const p = it[n]; p.t += dt;
      if (p.t >= p.life) { this.sz[p.i * 2] = 0; this.sz[p.i * 2 + 1] = 0; this.free.push(p.i); continue; }
      p.vy -= p.g * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += (p.vz + (p.world ? speed : 0)) * dt;
      const u = p.t / p.life;
      const j = p.i * 3; this.pos[j] = p.x; this.pos[j + 1] = p.y; this.pos[j + 2] = p.z;
      this.sz[p.i * 2] = p.size * (1 + p.grow * u); this.sz[p.i * 2 + 1] = p.a * (1 - u * u);
      it[k++] = p;
    }
    it.length = k;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aColor.needsUpdate = true; g.attributes.aSA.needsUpdate = true;
  }
}

// The tide: a rolling wave that follows Robyn. It only comes into view when she stumbles.
export class Tide {
  constructor(scene, fx) {
    this.fx = fx;
    this.group = new THREE.Group(); scene.add(this.group);
    const W = 26;
    // wave body: a rounded roller with a curling lip, coloured from deep teal to pale foam
    const prof = [[1.6, 0], [1.2, 0.55], [0.55, 1.05], [-0.25, 1.32], [-0.95, 1.38], [-1.45, 1.18], [-1.62, 0.86], [-1.4, 0.72], [-1.0, 0.82], [-0.7, 0.6], [-0.9, 0.2], [-1.3, 0]];
    const segs = 40, pos = [], colr = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= segs; i++) {
      const x = -W / 2 + (W * i) / segs;
      prof.forEach(([z, y], k) => {
        const wob = Math.sin(i * 0.9 + k) * 0.06;
        pos.push(x, y + wob, z + Math.sin(i * 0.55) * 0.12);
        const foam = k >= 5 && k <= 9 ? 1 : k === 4 ? 0.75 : k === 10 ? 0.5 : k === 3 ? 0.12 : 0;
        c.set(0x147f96).lerp(new THREE.Color(0x4fc9cf), clamp(y / 1.4, 0, 1) * 0.7).lerp(new THREE.Color(0xffffff), foam);
        colr.push(c.r, c.g, c.b);
      });
    }
    const P = prof.length;
    for (let i = 0; i < segs; i++) for (let k = 0; k < P - 1; k++) {
      const a = i * P + k, b = (i + 1) * P + k;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    g.setIndex(idx); g.computeVertexNormals();
    this.wave = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.96 }));
    this.group.add(this.wave);
    // flooded water behind the wave
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(W, 0.9, 60), new THREE.MeshLambertMaterial({ color: 0x1f93a6, transparent: true, opacity: 0.93 }));
    sheet.position.set(0, 0.1, 31.4); this.group.add(sheet);
    // foam balls along the lip
    const fb = new Builder(1);
    for (let i = 0; i < 46; i++) { const x = -W / 2 + (W * (i + 0.5)) / 46; fb.sph(0.2 + (i * 7 % 5) * 0.045, 0xffffff, x, 0.95 + (i % 3) * 0.12, -1.5 - (i % 2) * 0.15, 1, 0.85, 1, { seg: 6 }); }
    this.foam = fb.build({ receive: false, material: new THREE.MeshBasicMaterial({ vertexColors: true }) });
    this.group.add(this.foam);
    this.z = 24; this.h = 1; this.t = 0;
    this.group.position.z = this.z;
  }
  // closeness 0..1; surge > 0 during the wipe-out
  update(dt, closeness, surge, speed) {
    this.t += dt;
    const target = surge > 0 ? lerp(4.2, -9, smooth(surge)) : lerp(24, 4.2, smooth(closeness));
    this.z = surge > 0 ? target : lerp(this.z, target, 1 - Math.exp(-5 * dt));
    const h = surge > 0 ? 1.1 + smooth(surge) * 1.3 : 0.95 + closeness * 0.15;
    this.group.position.z = this.z;
    this.group.visible = this.z < 20;
    this.wave.scale.set(1, h * (1 + Math.sin(this.t * 5) * 0.04), 1 + Math.sin(this.t * 3.1) * 0.05);
    this.foam.position.y = (h - 1) * 1.1 + Math.sin(this.t * 9) * 0.05; this.foam.position.z = Math.sin(this.t * 6) * 0.06;
    if (this.group.visible) {
      const n = surge > 0 ? 10 : 3;
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * 12;
        this.fx.emit({ x, y: 0.9 * h + Math.random() * 0.5, z: this.z - 1.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3.5, vz: -(2 + Math.random() * 4) - (surge > 0 ? 6 : 0), life: 0.5 + Math.random() * 0.4, size: 0.16 + Math.random() * 0.22, color: 0xffffff, g: 9, world: false, a: 0.9 });
      }
    }
  }
}

// The warp tunnel: a neon tube and a glowing three-lane floor, shown while the normal world is hidden.
export class Tunnel {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const u = (this.uniforms = { uT: { value: 0 }, uS: { value: 0 } });
    const tube = new THREE.CylinderGeometry(7.6, 7.6, 280, 44, 40, true); tube.rotateX(Math.PI / 2); tube.translate(0, 2.3, -128);
    this.group.add(new THREE.Mesh(tube, new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: u,
      vertexShader: `varying vec3 vP; ${BEND_GLSL} void main(){ vP = position; gl_Position = projectionMatrix * viewMatrix * bendWorld(modelMatrix * vec4(position, 1.0)); }`,
      fragmentShader: `varying vec3 vP; uniform float uT, uS;
        vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
        void main(){
          float a = atan(vP.y - 2.3, vP.x), s = uS - vP.z;
          float stripes = smoothstep(0.62, 0.96, sin((a + s * 0.05 + uT * 0.4) * 6.0) * 0.5 + 0.5);
          float rings = smoothstep(0.8, 1.0, sin(s * 0.7) * 0.5 + 0.5);
          vec3 c = mix(vec3(0.05, 0.02, 0.16), vec3(0.15, 0.05, 0.38), sin(s * 0.07 + a * 2.0) * 0.5 + 0.5);
          c += pal(s * 0.011 + uT * 0.07) * stripes * 0.8 + pal(s * 0.011 + 0.45) * rings * 0.95;
          c = mix(c, vec3(1.0, 0.93, 1.0), smoothstep(70.0, 250.0, -vP.z));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })));
    const floor = new THREE.PlaneGeometry(7.8, 280, 1, 40); floor.rotateX(-Math.PI / 2); floor.translate(0, 0, -128);
    this.group.add(new THREE.Mesh(floor, new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: `varying vec3 vP; ${BEND_GLSL} void main(){ vP = position; gl_Position = projectionMatrix * viewMatrix * bendWorld(modelMatrix * vec4(position, 1.0)); }`,
      fragmentShader: `varying vec3 vP; uniform float uT, uS;
        void main(){
          float s = uS - vP.z, ax = abs(vP.x);
          float lines = smoothstep(0.09, 0.0, abs(ax - 1.1)) + smoothstep(0.14, 0.0, abs(ax - 3.55));
          float xl = abs(mod(vP.x + 1.1, 2.2) - 1.1);
          float ch = fract((s + xl * 1.4) / 7.0);
          float chev = smoothstep(0.0, 0.03, ch) * smoothstep(0.13, 0.09, ch) * step(ax, 3.3) * smoothstep(1.0, 0.75, xl);
          vec3 c = vec3(0.07, 0.03, 0.2) + vec3(0.2, 0.85, 1.0) * lines + vec3(0.75, 0.3, 1.0) * chev * 0.6;
          c = mix(c, vec3(1.0, 0.93, 1.0), smoothstep(70.0, 250.0, -vP.z));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })));
  }
  show(v) { this.group.visible = v; }
  update(dist, t) { this.uniforms.uT.value = t; this.uniforms.uS.value = dist % 20000; }
}

export function makeBlobShadow() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
  return m;
}

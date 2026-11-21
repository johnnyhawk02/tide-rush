// Particles and Robyn's ground shadow. (The tide that chases her is in tide.js, and the Star Tunnel in startunnel.js.)
import * as THREE from 'three';
import { BEND_GLSL } from './kit.js';

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

export function makeBlobShadow() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
  return m;
}

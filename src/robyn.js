// Robyn: raincoat, wellies, dark hair with a thick blunt fringe and a low ponytail, and a striped scarf.
// The colours come from the chosen outfit ("hat" is the scrunchie and mittens colour).
// She is a chunky cartoon figure, about three and a half heads tall, modelled in Blender (blender/build_robyn.py).
// She faces -Z. All animation is procedural.
import * as THREE from 'three';
import { Builder, C, MAT } from './kit.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bendy, CHARACTER } from './sculpt.js';
import ROBYN_GLB from './models/robyn.glb?inline';
import { clamp, damp, lerp } from './config.js';

const PI = Math.PI;
const HIP = 0.72, THIGH = 0.33, SHIN = 0.39;      // the height of her hips, and the lengths of her legs above and below the knee
const HEAD = 0.235, HEAD_Y = 0.745;               // the size of her head, and how far above her hips its middle is
// Outfits unlock as the player collects shells over many runs. "need" is the lifetime shell total required.
export const OUTFITS = [
  { id: 'raincoat', name: 'Raincoat', need: 0, coat: 0xffc51f, hat: 0x14a39b, boot: 0xe5383b, scarf: 0xe5383b, scarf2: 0xfff1cf },
  { id: 'lifeguard', name: 'Lifeguard', need: 150, coat: 0xe8412f, hat: 0xfff1cf, boot: 0xffc928, scarf: 0x22365c, scarf2: 0xfff1cf },
  { id: 'mermaid', name: 'Mermaid', need: 400, coat: 0x2fc7b8, hat: 0xff8fc0, boot: 0x8a5be0, scarf: 0xff8fc0, scarf2: 0xfff1cf },
  { id: 'midnight', name: 'Midnight', need: 900, coat: 0x34459c, hat: 0xffc928, boot: 0xc9d2e0, scarf: 0xffc928, scarf2: 0x8ff0ff },
];
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
// colours of the outfit being built (set at the top of the constructor)
let COAT, COAT_D, HAT, HAT_D, BOOT, BOOT_D, SCARF, SCARF2;
// how shiny things are: a wet raincoat and rubber wellies, soft skin, matt hair and wool
const WET = 0.3, RUBBER = 0.2, SOFT = 0.62, MATT = 0.8;

// ----- the model: sculpted in Blender (see blender/build_robyn.py) and kept inside the game's own code -----
// It is one .glb, read once. Its empty nodes are her joints, named like the groups below; the meshes under each joint
// move into the group of the same name. The colours come from each mesh's material name, so outfits can recolour her,
// and every piece is drawn with the shared CHARACTER material (its vertex colours carry the colour, its uv the finish).
const MODEL = await new GLTFLoader().parseAsync(Uint8Array.from(atob(ROBYN_GLB.split(',')[1]), (c) => c.charCodeAt(0)).buffer, '');
const lin = (hex) => new THREE.Color(hex);
// how shiny each material is (roughness, then the strength of the sky's edge light)
const FINISH = { Coat: [WET, 1], CoatDark: [WET, 1], CoatInside: [SOFT, 0.4], Boot: [RUBBER, 1], BootDark: [RUBBER, 1], Sole: [SOFT, 1], Gold: [0.3, 1], Navy: [0.24, 1],
  Hat: [MATT, 1], HatDark: [MATT, 1], Scarf: [MATT, 1], Scarf2: [MATT, 1], Leggings: [MATT, 1], Hair: [MATT, 1.3], Skin: [SOFT, 1], SkinPlain: [SOFT, 1], SkinDark: [SOFT, 1], Nose: [SOFT, 1] };
// the outfit's colour for each material that changes with the outfit
const outfitColour = (name) => ({ Coat: COAT, CoatDark: COAT_D, CoatInside: shade(COAT, 0.42), Hat: HAT, HatDark: HAT_D, Boot: BOOT, BootDark: BOOT_D, Scarf: SCARF, Scarf2: SCARF2 })[name];
// a mesh from the model, recoloured for this outfit, with its own geometry (so it can be bent and thrown away)
function ownMesh(m) {
  const g = m.geometry.clone(), n = g.attributes.position.count, name = m.material.name;
  const src = g.attributes.color;      // (where the model has painted colours, they are the whole colour: hair, skin with its rosy cheeks)
  const c = outfitColour(name) !== undefined ? lin(outfitColour(name)) : src ? new THREE.Color(1, 1, 1) : m.material.color.clone();
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2), [rough, rim] = FINISH[name] || [0.45, 0.6];
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r * (src ? src.getX(i) : 1); col[i * 3 + 1] = c.g * (src ? src.getY(i) : 1); col[i * 3 + 2] = c.b * (src ? src.getZ(i) : 1);
    uv[i * 2] = rough; uv[i * 2 + 1] = rim;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(g, CHARACTER); mesh.name = m.name;
  mesh.castShadow = true; mesh.receiveShadow = false;
  return mesh;
}
const JOINTS = new Set(['Robyn', 'lean', 'hips', 'torso', 'skirt', 'hood', 'head', 'pony', 'scarf', 'face_happy', 'face_blink', 'face_smile', 'face_shock',
  'armL_sh', 'armL_el', 'armR_sh', 'armR_el', 'legL_hip', 'legL_knee', 'legR_hip', 'legR_knee']);
// Everything that hangs straight off the joint `name` (not its child joints), as this outfit's meshes in the joint's space
// (or in its parent's space, for the bendy pieces, whose first joint is measured from where they hang).
function piecesOf(name, inParent = false) {
  const joint = MODEL.scene.getObjectByName(name), out = [];
  joint.updateWorldMatrix(true, true);
  const inv = (inParent ? joint.parent : joint).matrixWorld.clone().invert();
  const walk = (o) => {
    for (const c of o.children) {
      if (JOINTS.has(c.name)) continue;
      if (c.isMesh) { const m = ownMesh(c); m.geometry.applyMatrix4(inv.clone().multiply(c.matrixWorld)); out.push(m); }
      walk(c);
    }
  };
  walk(joint);
  return out;
}
// the pieces of a joint as one group
function group(name) { const g = new THREE.Group(); piecesOf(name).forEach((m) => g.add(m)); return g; }
// the pieces of a joint merged into one mesh (for the bendy ponytail and scarf)
function merged(name) {
  const ms = piecesOf(name, true), g = mergeGeometries(ms.map((m) => m.geometry));
  ms.forEach((m) => m.geometry.dispose());
  const mesh = new THREE.Mesh(g, CHARACTER); mesh.castShadow = true; mesh.receiveShadow = false;
  return mesh;
}
const jointAt = (name) => MODEL.scene.getObjectByName(name).position.toArray();

// a piece of the things she rides and carries
function prop(fn, grad = 0.9) { const b = new Builder(grad); fn(b); return b.build({ cast: true, receive: false, material: MAT.glossy }); }

export class Robyn {
  constructor(outfit = OUTFITS[0]) {
    COAT = outfit.coat; COAT_D = shade(COAT, 0.8); HAT = outfit.hat; HAT_D = shade(HAT, 0.78); BOOT = outfit.boot; BOOT_D = shade(BOOT, 0.78);
    SCARF = outfit.scarf; SCARF2 = outfit.scarf2;
    const stripes = (n) => (u) => (Math.floor(u * n + 0.5) % 2 ? SCARF2 : SCARF);
    this.root = new THREE.Group();
    this.lean = new THREE.Group(); this.root.add(this.lean);
    this.hips = new THREE.Group(); this.hips.position.y = HIP; this.lean.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);

    // ----- her body, from the model: the raincoat with its scarf, the skirt of the coat, and the hood worn down -----
    this.torso.add(group('torso'));
    // the skirt of the coat: it flares like a bell, and swishes and lifts as her knees come up
    this.skirt = new THREE.Group(); this.skirt.position.y = 0.11; this.torso.add(this.skirt);
    this.skirt.add(group('skirt'));
    // her hood, worn down: it bobs on her back as she runs
    this.hood = new THREE.Group(); this.hood.position.set(0, 0.455, 0.09); this.torso.add(this.hood);
    this.hood.add(group('hood'));
    // the long end of her scarf, which flutters behind her: one piece, which bends at five joints along its length
    const knot = jointAt('scarf');
    this.tail = new Bendy(merged('scarf'), [knot, [0, 0, 0.125], [0, 0, 0.125], [0, 0, 0.125], [0, 0, 0.125]]);
    this.torso.add(this.tail.mesh); this.scarf = this.tail.joints;

    // ----- head: dark hair with a thick, blunt fringe, gathered into a low ponytail with a scrunchie -----
    this.head = new THREE.Group(); this.head.name = 'head'; this.head.position.set(0, HEAD_Y, 0); this.torso.add(this.head);
    this.head.add(group('head'));
    // her face is modelled on (so it stays sharp up close): happy or blinking eyes with her big smile, or the shocked look
    this.faces = {};
    for (const k of ['happy', 'blink', 'smile', 'shock']) { this.faces[k] = group('face_' + k); this.head.add(this.faces[k]); }
    this.faceNow = ''; this.setFace('happy');
    this.blinkT = 2;
    // ponytail: tied low at the nape with a scrunchie. It is one piece, which swings at three joints down its length.
    const tied = jointAt('pony');
    this.hair = new Bendy(merged('pony'), [tied, [0, -0.16, 0], [0, -0.15, 0]]);
    this.head.add(this.hair.mesh); [this.pony, this.pony2, this.pony3] = this.hair.joints;

    // ----- arms -----
    const arm = (side) => {
      const sh = new THREE.Group(); sh.position.fromArray(jointAt(`arm${side}_sh`)); this.torso.add(sh);
      sh.add(group(`arm${side}_sh`));
      const el = new THREE.Group(); el.position.fromArray(jointAt(`arm${side}_el`)); sh.add(el);
      el.add(group(`arm${side}_el`));
      return { sh, el };
    };
    this.armL = arm('L'); this.armR = arm('R');

    // ----- legs: leggings and big wellies -----
    const leg = (side) => {
      const hip = new THREE.Group(); hip.position.fromArray(jointAt(`leg${side}_hip`)); this.hips.add(hip);
      hip.add(group(`leg${side}_hip`));
      const knee = new THREE.Group(); knee.position.fromArray(jointAt(`leg${side}_knee`)); hip.add(knee);
      knee.add(group(`leg${side}_knee`));
      // spring boots (shown while the power-up is active)
      const spring = prop((b) => {
        for (let i = 0; i < 4; i++) b.tor(0.055, 0.012, 0x7dff8a, 0, -SHIN - 0.02 - i * 0.03, -0.04, PI / 2, 0, 0, { seg: 10, grad: 1 });
        b.box(0.14, 0.02, 0.24, 0x2fd35f, 0, -SHIN - 0.13, -0.04);
      });
      spring.visible = false; knee.add(spring);
      return { hip, knee, spring };
    };
    this.legL = leg('L'); this.legR = leg('R');

    // ----- shield bubble -----
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1.08, 28, 20), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uA: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uT; uniform float uA;
        void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2);
          float band = 0.5 + 0.5*sin(vP.y*9. - uT*3. + sin(vP.x*4.+uT)*1.5);
          vec3 col = mix(vec3(0.35,0.95,1.0), vec3(1.0), f*0.6 + band*0.15);
          gl_FragColor = vec4(col, (f*0.85 + 0.06 + band*0.05) * uA); }`,
    }));
    this.shield.position.y = 0.92; this.shield.visible = false; this.root.add(this.shield);

    // ----- firework rocket she rides in rocket mode (lies along z, nose forward) -----
    this.rocket = prop((b) => {
      b.cyl(0.17, 0.17, 1.25, 0xe5383b, 0, 0, 0, PI / 2, 0, 0, { seg: 14 });
      for (const z of [-0.36, 0.3]) b.cyl(0.176, 0.176, 0.13, 0xfff1cf, 0, 0, z, PI / 2, 0, 0, { seg: 14 });
      b.cone(0.17, 0.44, 0xffc928, 0, 0, -0.845, -PI / 2, 0, 0, { seg: 14 });
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.box(0.03, 0.32, 0.36, 0x22365c, -Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0.5, 0, 0, a); }
      b.cyl(0.12, 0.15, 0.12, 0x2c3640, 0, 0, 0.68, PI / 2, 0, 0, { seg: 12 });
      b.cyl(0.016, 0.016, 1.0, 0xb98f5e, 0.1, -0.12, 1.15, PI / 2, 0, 0, { seg: 6 });
      for (const sx of [-1, 1]) for (const z of [-0.14, 0.06]) b.sph(0.045, 0xffe27a, sx * 0.165, 0.03, z, 0.4, 1, 1, { seg: 6 });
    });
    this.rocket.position.set(0, HIP - 0.25, 0.02); this.rocket.visible = false; this.root.add(this.rocket);

    // ----- hoverboard: a surfboard that floats on a cushion of glowing sea spray (lies along z, nose forward) -----
    this.board = new THREE.Group(); this.board.visible = false; this.lean.add(this.board);
    this.board.add(prop((b) => {
      b.add(new THREE.SphereGeometry(1, 18, 8), (x, y, z) => (Math.abs(x) < 0.07 ? 0xfff1cf : z < -0.55 ? 0xff7a66 : z > 0.6 ? 0xffc928 : 0x18a7a0), 0, 0, 0, 0, 0, 0, 0.36, 0.05, 1.0);
      b.box(0.34, 0.014, 0.36, 0x22365c, 0, 0.046, 0.5).box(0.34, 0.014, 0.3, 0x22365c, 0, 0.046, -0.32);   // grip pads
      b.box(0.03, 0.16, 0.24, 0x22365c, 0, -0.1, 0.74, -0.3, 0, 0);                                           // fin
      for (const z of [-0.5, 0.45]) b.cyl(0.17, 0.13, 0.06, 0x2c3640, 0, -0.06, z, 0, 0, 0, { seg: 12 });       // hover pods
    }));
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.boardGlow = [];
    for (const z of [-0.5, 0.45]) { const m = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.2, 16).rotateX(PI / 2), glowMat); m.position.set(0, -0.1, z); this.board.add(m); this.boardGlow.push(m); }

    // ----- laser zapper: a chunky toy blaster in her right hand (barrel pointing down her forearm) -----
    this.blaster = new THREE.Group(); this.blaster.position.set(0, -0.275, -0.03); this.blaster.visible = false; this.armR.el.add(this.blaster);
    this.blaster.add(prop((b) => {
      b.sph(0.06, 0x18a7a0, 0, -0.03, -0.03, 0.85, 1.7, 0.95, { seg: 10 });
      b.cyl(0.03, 0.038, 0.18, 0xff9f1c, 0, -0.19, -0.03, 0, 0, 0, { seg: 8 });
      for (const y of [-0.14, -0.22]) b.tor(0.045, 0.013, 0xffc928, 0, y, -0.03, PI / 2, 0, 0, { seg: 10 });
    }));
    this.muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6ad8 }));
    this.muzzle.position.set(0, -0.3, -0.03); this.blaster.add(this.muzzle);
    this.aim = 0; this.kick = 0;

    this.phase = 0; this.lead = 1; this.t = 0; this.squash = 0; this.wasGround = true;
    this.shockT = 0; this.look = 0; this.lastSt = 0; this.p2 = this.p3 = -0.6; this.flare = 0;
    this.j = { tl: 0, kl: 0, tr: 0, kr: 0, sl: 0, el: 1.2, sr: 0, er: 1.2, slz: 0, srz: 0, tx: 0, ty: 0, hx: 0, hy: 0, hipY: HIP, pony: -0.5, splay: 0, yaw: 0, lift: 0, tuck: 0 };
  }

  // which face she shows: 'happy', 'blink' or 'shock'
  setFace(k) {
    if (k === this.faceNow) return;
    this.faceNow = k; const F = this.faces;
    F.happy.visible = k === 'happy'; F.blink.visible = k === 'blink'; F.smile.visible = k !== 'shock'; F.shock.visible = k === 'shock';
  }
  setBoots(on) { this.legL.spring.visible = on; this.legR.spring.visible = on; }
  setShield(on) { this.shield.visible = on; }
  setRocket(on) { this.rocket.visible = on; }
  setBoard(on) { this.board.visible = on; }
  // mega: the bigger space version
  setBlaster(on, mega = false, size = 1.1) { this.blaster.visible = on; this.blaster.scale.setScalar(mega ? 1.45 : size); }
  fire() { this.kick = 1; }
  // (the model, and the materials every Robyn shares, are kept for the next outfit)
  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== CHARACTER && o.material !== MAT.glossy) o.material.dispose();
    });
  }

  // s: { mode, speed, vy, vx, grounded, stumble (0..1) }
  update(dt, s) {
    this.t += dt;
    const sp = s.speed;
    const amp = clamp(sp / 13, 0.5, 1);
    const cadence = 2.5 + sp * 0.05;
    if (s.mode === 'run' || s.mode === 'stumble') this.phase += cadence * PI * dt;
    const ph = this.phase, sn = Math.sin(ph), cs = Math.cos(ph);
    const T = { splay: 0, yaw: 0, lift: 0, tuck: 0 }; // targets
    const air = !s.grounded && (s.mode === 'run' || s.mode === 'stumble');
    const running = !air && (s.mode === 'run' || s.mode === 'stumble');

    if (s.mode === 'crash') {
      const w = Math.sin(this.t * 9) * 0.15;
      Object.assign(T, { tl: 0.9 + w, kl: -1.1, tr: 0.4 - w, kr: -0.7, sl: 2.4, el: 0.5, sr: 2.0, er: 0.7, slz: -0.6, srz: 0.6, tx: 0.25, ty: 0, hx: -0.3, hy: 0, hipY: HIP, pony: 0.6 });
    } else if (s.mode === 'fall') {
      const k = Math.sin(this.t * 16);
      Object.assign(T, { tl: 0.5 * k, kl: -0.6 - 0.4 * k, tr: -0.5 * k, kr: -0.6 + 0.4 * k, sl: 2.9, el: 0.2, sr: 2.9, er: 0.2, slz: -0.5 - 0.3 * k, srz: 0.5 - 0.3 * k, tx: 0.1, ty: 0, hx: -0.4, hy: 0, hipY: HIP, pony: -2.4 });
    } else if (s.mode === 'ride') {
      // astride the rocket, leaning forward and holding on
      const w = Math.sin(this.t * 7) * 0.05;
      Object.assign(T, { tl: 0.4, kl: -1.3 + w, tr: 0.4, kr: -1.3 - w, sl: 0.95, el: 0.5, sr: 0.95, er: 0.5, slz: 0.1, srz: -0.1, tx: -0.45, ty: 0, hx: 0.34, hy: 0, hipY: HIP - 0.02, pony: -1.7, splay: 0.45, tuck: 1 });
    } else if (s.mode === 'surf') {
      // side-on on the hoverboard: knees bent, arms out for balance, head turned to look ahead
      const w = Math.sin(this.t * 2.6) * 0.06, up = s.grounded ? 0 : clamp(s.vy / 9, -1, 1);
      Object.assign(T, {
        tl: 0.5 + up * 0.3, kl: -0.95 - up * 0.35, tr: 0.5 + up * 0.3, kr: -0.95 - up * 0.35,
        sl: 0.1, el: 0.25, sr: -0.1, er: 0.25, slz: -1.2 + w - up * 0.3, srz: 1.2 + w + up * 0.3,
        tx: 0.12, ty: 0, hx: 0, hy: -0.8, hipY: HIP - 0.13 + Math.sin(this.t * 5) * 0.012, pony: -0.95 - clamp(-s.vy * 0.06, -0.3, 0.8), splay: 0.36, yaw: 0.95, lift: 0.2,
      });
      if (s.grounded && !this.wasGround) this.squash = 1;
    } else if (air) {
      const up = clamp(s.vy / 9, -1, 1) * 0.5 + 0.5;
      const L = this.lead > 0;
      const lead = { t: lerp(0.3, 1.3, up), k: -lerp(0.3, 1.65, up) }, trail = { t: lerp(-0.1, -0.55, up), k: -lerp(0.25, 1.25, up) };
      const a = L ? lead : trail, b2 = L ? trail : lead;
      Object.assign(T, {
        tl: a.t, kl: a.k, tr: b2.t, kr: b2.k,
        sl: lerp(0.5, 2.5, up), el: lerp(0.9, 0.5, up), sr: lerp(0.3, 2.1, up), er: lerp(0.9, 0.6, up),
        slz: -lerp(1.0, 0.35, up), srz: lerp(1.0, 0.35, up),
        tx: lerp(0.06, -0.22, up), ty: 0, hx: lerp(-0.1, 0.15, up), hy: 0, hipY: HIP, pony: -0.5 - clamp(-s.vy * 0.09, -0.4, 1.3),
      });
    } else {
      const A = 0.92 * amp;
      Object.assign(T, {
        tl: 0.12 + A * sn, kl: -(0.22 + 1.35 * amp * Math.max(0, cs)),
        tr: 0.12 - A * sn, kr: -(0.22 + 1.35 * amp * Math.max(0, -cs)),
        sl: -1.0 * amp * sn, el: 1.35 - 0.35 * sn, sr: 1.0 * amp * sn, er: 1.35 + 0.35 * sn,
        slz: -0.16, srz: 0.16,
        tx: -0.1 - 0.12 * amp, ty: 0.2 * amp * sn, hx: 0.08, hy: -0.2 * amp * sn,
        hipY: HIP - 0.02 + 0.055 * amp * Math.cos(2 * ph + 0.6), pony: -0.5 - 0.22 * amp + 0.22 * Math.sin(2 * ph + 1.2),
      });
      if (!this.wasGround) { this.squash = 1; this.lead = -this.lead; }
    }
    this.wasGround = s.grounded;

    const j = this.j, k = s.mode === 'run' && !air ? 28 : 16;
    for (const key in T) j[key] = damp(j[key], T[key], k, dt);

    // stumble: flail on top of the base pose
    const st = s.stumble || 0;
    // a new stumble: she looks back over her shoulder at the camera, wide-eyed, for about a second
    if (st > this.lastSt + 0.2) this.shockT = 1.15;
    this.lastSt = st; this.shockT = Math.max(0, this.shockT - dt);
    const dying = s.mode === 'crash' || s.mode === 'fall';
    this.look = damp(this.look, this.shockT > 0.28 && !dying ? 1 : 0, 16, dt);
    const shocked = this.shockT > 0.12 || dying;
    this.blinkT -= dt; if (this.blinkT < -0.11) this.blinkT = 2.2 + Math.random() * 3.2;
    this.setFace(shocked ? 'shock' : this.blinkT < 0 ? 'blink' : 'happy');
    const fl = Math.sin(this.t * 26) * st;
    this.legL.hip.rotation.x = j.tl; this.legL.knee.rotation.x = j.kl; this.legL.hip.rotation.z = -j.splay;
    this.legR.hip.rotation.x = j.tr; this.legR.knee.rotation.x = j.kr; this.legR.hip.rotation.z = j.splay;
    // the skirt of her coat lifts at the front as each knee comes up, opens out as she drops through the air, and rocks with her stride
    const flare = this.flare = damp(this.flare, air ? clamp(-s.vy * 0.016, 0, 0.16) : 0, 10, dt);
    this.skirt.rotation.set(clamp((Math.max(j.tl, j.tr) - 0.3) * 0.46, 0, 0.4) - st * 0.1, 0, (j.tl - j.tr) * 0.035);
    this.skirt.scale.set(1 + flare + j.splay * 0.2, 1 - flare * 0.6 - j.tuck * 0.5, 1 + flare + j.tuck * 0.06);
    this.armL.sh.rotation.set(j.sl + fl * 1.1 + st * 1.2, 0, j.slz - st * 0.7);
    this.armR.sh.rotation.set(j.sr - fl * 1.1 + st * 1.2, 0, j.srz + st * 0.7);
    this.armL.el.rotation.x = j.el * (1 - st * 0.6); this.armR.el.rotation.x = j.er * (1 - st * 0.6);
    // with the zapper out, her right arm points straight ahead and kicks back a little with each shot
    this.aim = damp(this.aim, this.blaster.visible && !dying ? 1 - st : 0, 12, dt); this.kick = Math.max(0, this.kick - dt * 7);
    if (this.aim > 0.01) {
      const a = this.aim, R = this.armR;
      R.sh.rotation.set(lerp(R.sh.rotation.x, 1.5 - j.tx + this.kick * 0.3, a), 0, lerp(R.sh.rotation.z, -0.08, a));
      R.el.rotation.x = lerp(R.el.rotation.x, 0.06, a);
      this.muzzle.scale.setScalar(1 + this.kick * 2.2);
    }
    this.torso.rotation.set(j.tx - st * 0.45, j.ty + this.look * 0.95, fl * 0.12);
    this.head.rotation.set(j.hx + st * 0.3 - this.look * 0.2, j.hy + this.look * 1.9, this.look * -0.12);
    this.squash = Math.max(0, this.squash - dt * 7);
    const sq = 1 - 0.13 * Math.sin(this.squash * PI) * (this.squash > 0 ? 1 : 0);
    this.lean.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
    this.hips.position.y = j.hipY - (1 - sq) * 0.3;
    this.hips.rotation.y = -j.ty * 0.5 + j.yaw;
    this.lean.position.y = j.lift;
    if (this.board.visible) {
      this.board.position.y = -0.07 + Math.sin(this.t * 5) * 0.02; this.board.rotation.x = clamp(-s.vy * 0.025, -0.3, 0.3);
      this.boardGlow.forEach((m, i) => m.scale.setScalar(1 + 0.25 * Math.sin(this.t * 16 + i * 2)));
    }

    // lean into lane changes
    const vx = s.vx || 0;
    this.lean.rotation.z = damp(this.lean.rotation.z, clamp(-vx * 0.035, -0.4, 0.4) + fl * 0.2, 14, dt);
    this.lean.rotation.y = damp(this.lean.rotation.y, clamp(-vx * 0.03, -0.35, 0.35), 14, dt);

    // hair and scarf
    this.pony.rotation.x = j.pony; this.pony.rotation.z = clamp(vx * 0.05, -0.5, 0.5);
    this.p2 = damp(this.p2, j.pony, 13, dt); this.p3 = damp(this.p3, this.p2, 13, dt);
    this.pony2.rotation.x = clamp((this.p2 - j.pony) * 1.5, -0.7, 0.7) + 0.1; this.pony3.rotation.x = clamp((this.p3 - this.p2) * 1.5, -0.7, 0.7) + 0.12;
    this.pony2.rotation.z = this.pony.rotation.z * 0.6; this.pony3.rotation.z = this.pony.rotation.z * 0.5;
    this.hood.rotation.x = running ? 0.07 * amp * Math.sin(2 * ph + 2.4) : air ? clamp(s.vy * 0.03, -0.25, 0.3) : 0;
    const wind = clamp(sp / 16, 0.15, 1);
    for (let i = 0; i < this.scarf.length; i++) {
      const g = this.scarf[i];
      g.rotation.x = (i === 0 ? lerp(1.0, 0.12, wind) : lerp(0.12, 0, wind)) + Math.sin(this.t * 12 - i * 1.15) * 0.24 * wind - (air ? clamp(s.vy * 0.03, -0.3, 0.3) : 0);
      g.rotation.y = Math.sin(this.t * 8.3 - i * 0.9) * 0.22 * wind + clamp(vx * 0.03, -0.3, 0.3);
    }
    this.hair.update(); this.tail.update();
    if (this.shield.visible) { this.shield.material.uniforms.uT.value = this.t; this.shield.rotation.y = this.t * 0.6; }
  }
}

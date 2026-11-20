// Robyn: raincoat, wellies, brown hair with a full straight fringe and a high ponytail, and a striped scarf.
// The colours come from the chosen outfit ("hat" is the scrunchie and mittens colour).
// She faces -Z. All animation is procedural.
import * as THREE from 'three';
import { Builder, C, MAT } from './kit.js';
import { clamp, damp, lerp } from './config.js';

const PI = Math.PI;
const HIP = 0.845;
const HAIR = 0x553727, HAIR_D = 0x42291c, HAIR_L = 0x6d4832, LEG = 0x24375e, SKIN = 0xf6c8a5, SKIN_D = 0xe9ad8a;
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

// ----- her face: flat cartoon features drawn on a canvas and wrapped round the front of a smooth head -----
// The patch covers FACE_A radians either side of straight ahead and FACE_TL radians from brow to chin.
const FACE_R = 0.18, FACE_A = 1.1, FACE_T0 = 0.85, FACE_TL = 1.75, FACE_W = 640, FACE_H = 512;
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
function drawFace(kind) {
  const cv = document.createElement('canvas'); cv.width = FACE_W; cv.height = FACE_H;
  const g = cv.getContext('2d'), S = FACE_W / (2 * FACE_A * FACE_R);   // pixels per metre
  // a point on the head (metres: x to the viewer's right, y up) to canvas pixels
  const at = (x, y) => { const th = Math.acos(y / FACE_R); return [FACE_W * (0.5 + Math.asin(x / (FACE_R * Math.sin(th))) / (2 * FACE_A)), FACE_H * (th - FACE_T0) / FACE_TL]; };
  const oval = (x, y, rx, ry, fill) => { g.beginPath(); g.ellipse(x, y, rx * S, ry * S, 0, 0, PI * 2); g.fillStyle = fill; g.fill(); };
  const INK = '#2b1a14', wide = kind === 'shock';
  g.lineCap = g.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    // rosy cheeks
    const [cx, cy] = at(sx * 0.112, -0.056), blush = g.createRadialGradient(cx, cy, 0, cx, cy, 0.036 * S);
    blush.addColorStop(0, 'rgba(246,128,128,0.7)'); blush.addColorStop(0.6, 'rgba(246,128,128,0.5)'); blush.addColorStop(1, 'rgba(246,128,128,0)');
    g.fillStyle = blush; g.fillRect(cx - 0.04 * S, cy - 0.04 * S, 0.08 * S, 0.08 * S);
    // eyebrows, the colour of her hair (they lift under her fringe when she is shocked)
    const [bx, by] = at(sx * 0.07, wide ? 0.058 : 0.049);
    g.beginPath(); g.moveTo(bx - 0.026 * S, by + 0.005 * S); g.quadraticCurveTo(bx, by - 0.009 * S, bx + 0.026 * S, by + 0.005 * S);
    g.strokeStyle = css(HAIR_D); g.lineWidth = 0.008 * S; g.stroke();
    // eyes
    const [ex, ey] = at(sx * 0.068, wide ? 0.002 : 0.004);
    if (kind === 'blink') {
      g.beginPath(); g.arc(ex, ey - 0.014 * S, 0.027 * S, 0.14 * PI, 0.86 * PI); g.strokeStyle = INK; g.lineWidth = 0.008 * S; g.stroke();
      continue;
    }
    const rx = wide ? 0.033 : 0.026, ry = wide ? 0.04 : 0.03, ir = wide ? 0.015 : 0.0225;
    oval(ex, ey, rx + 0.0028, ry + 0.0028, INK);
    oval(ex, ey, rx, ry, '#ffffff');
    g.save(); g.beginPath(); g.ellipse(ex, ey, rx * S, ry * S, 0, 0, PI * 2); g.clip();
    oval(ex, ey, ir, ir, '#4f7596');                                              // blue-grey iris with a darker rim
    oval(ex, ey, ir * 0.84, ir * 0.84, '#7fa3c2');
    oval(ex, ey, ir * 0.5, ir * 0.5, '#18202a');
    g.restore();
    oval(ex + 0.008 * S, ey - 0.009 * S, 0.0066, 0.0066, '#ffffff');              // catch light
    if (!wide) {                                                                  // upper lid with a little flick at the outer corner
      g.beginPath(); g.ellipse(ex, ey, (rx + 0.002) * S, (ry + 0.002) * S, 0, PI * 1.06, PI * 1.94);
      g.strokeStyle = INK; g.lineWidth = 0.0085 * S; g.stroke();
      g.beginPath(); g.moveTo(ex + sx * (rx + 0.001) * S, ey - 0.006 * S); g.lineTo(ex + sx * (rx + 0.012) * S, ey - 0.017 * S); g.lineWidth = 0.006 * S; g.stroke();
    }
  }
  if (wide) {
    // mouth dropped open in an O
    const [mx, my] = at(0, -0.09);
    oval(mx, my, 0.0275, 0.0345, '#5a1820');
    oval(mx, my, 0.024, 0.031, '#7c212c');
    g.save(); g.beginPath(); g.ellipse(mx, my, 0.024 * S, 0.031 * S, 0, 0, PI * 2); g.clip();
    oval(mx, my + 0.03 * S, 0.02, 0.017, '#ef7f8a');                              // tongue
    g.fillStyle = '#ffffff'; g.fillRect(mx - 0.016 * S, my - 0.034 * S, 0.032 * S, 0.012 * S);   // top teeth
    g.restore();
  } else {
    // a big open smile: teeth along the top, tongue below
    const [mx, my] = at(0, -0.064), m = (dx, dy) => [mx + dx * S, my + dy * S];
    const mouth = () => { g.beginPath(); g.moveTo(...m(-0.057, -0.006)); g.quadraticCurveTo(...m(0, 0.012), ...m(0.057, -0.006)); g.bezierCurveTo(...m(0.05, 0.064), ...m(-0.05, 0.064), ...m(-0.057, -0.006)); g.closePath(); };
    mouth(); g.fillStyle = '#8c2a34'; g.fill();
    g.save(); mouth(); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(mx - 0.06 * S, my - 0.01 * S, 0.12 * S, 0.026 * S);
    oval(mx, my + 0.05 * S, 0.032, 0.02, '#ef7f8a');
    g.restore();
    mouth(); g.strokeStyle = '#5a1820'; g.lineWidth = 0.0048 * S; g.stroke();
    for (const sx of [-1, 1]) {                                                   // smile creases at the corners
      g.beginPath(); g.moveTo(...m(sx * 0.063, -0.014)); g.quadraticCurveTo(...m(sx * 0.068, -0.004), ...m(sx * 0.061, 0.004)); g.lineWidth = 0.004 * S; g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let FACES = null, FACE_GEO = null;
function faceMesh() {
  if (!FACES) {
    FACES = { happy: drawFace('happy'), blink: drawFace('blink'), shock: drawFace('shock') };
    FACE_GEO = new THREE.SphereGeometry(FACE_R * 1.012, 22, 16, PI * 1.5 - FACE_A, FACE_A * 2, FACE_T0, FACE_TL);
    FACE_GEO.scale(1.05, 1.03, 1);
  }
  const mat = new THREE.MeshStandardMaterial({ map: FACES.happy, transparent: true, depthWrite: false, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  return new THREE.Mesh(FACE_GEO, mat);
}

function part(fn, grad = 0.9) {
  const b = new Builder(grad);
  fn(b);
  return b.build({ cast: true, receive: false, material: MAT.glossy });
}

export class Robyn {
  constructor(outfit = OUTFITS[0]) {
    COAT = outfit.coat; COAT_D = shade(COAT, 0.84); HAT = outfit.hat; HAT_D = shade(HAT, 0.8); BOOT = outfit.boot; BOOT_D = shade(BOOT, 0.8);
    SCARF = outfit.scarf; SCARF2 = outfit.scarf2;
    this.root = new THREE.Group();
    this.lean = new THREE.Group(); this.root.add(this.lean);
    this.hips = new THREE.Group(); this.hips.position.y = HIP; this.lean.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);

    // ----- torso: raincoat -----
    this.torso.add(part((b) => {
      b.cyl(0.215, 0.29, 0.3, COAT, 0, 0, 0, 0, 0, 0, { seg: 16 });                 // skirt of the coat
      b.cyl(0.296, 0.296, 0.035, COAT_D, 0, -0.15, 0, 0, 0, 0, { seg: 16 });        // hem trim
      b.cyl(0.185, 0.215, 0.36, COAT, 0, 0.33, 0, 0, 0, 0, { seg: 16 });            // chest
      b.sph(0.2, COAT, 0, 0.465, 0, 1.13, 0.42, 0.94, { seg: 14 });                 // shoulders
      b.cyl(0.224, 0.228, 0.05, LEG, 0, 0.145, 0, 0, 0, 0, { seg: 16 });            // belt
      b.box(0.07, 0.06, 0.03, C.gold, 0, 0.145, -0.225);                            // buckle
      b.box(0.055, 0.64, 0.02, COAT_D, 0, 0.175, -0.243, 0.153, 0, 0);              // front placket
      for (const y of [0.43, 0.3, 0.02, -0.08]) b.cyl(0.017, 0.017, 0.02, LEG, 0, y, -0.262 + (y - 0.175) * 0.154 - 0.004, PI / 2, 0, 0, { seg: 8 });
      for (const sx of [-1, 1]) {
        b.box(0.11, 0.1, 0.02, COAT_D, sx * 0.135, 0.0, -0.228, 0.2, sx * -0.5, 0);  // pocket flaps
        b.box(0.11, 0.03, 0.03, COAT, sx * 0.135, 0.045, -0.236, 0.2, sx * -0.5, 0);
      }
      b.sph(0.165, COAT, 0, 0.47, 0.15, 1.02, 0.78, 0.72, { seg: 12 });             // hood, worn down
      b.sph(0.12, COAT_D, 0, 0.5, 0.13, 1.0, 0.6, 0.7, { seg: 10 });
      b.cyl(0.07, 0.085, 0.09, SKIN_D, 0, 0.535, 0, 0, 0, 0, { seg: 10 });          // neck
      b.tor(0.118, 0.052, SCARF, 0, 0.535, 0.005, PI / 2, 0, 0, { seg: 14, tseg: 8 }); // scarf wrap
      b.tor(0.119, 0.054, SCARF2, 0, 0.535, 0.005, PI / 2, 0, 0, { seg: 14, tseg: 8, arc: 0.7 });
      b.sph(0.062, SCARF, 0.075, 0.5, -0.105, 1, 0.9, 0.8);                         // knot
    }));

    // scarf tail: a chain that flutters behind her
    this.scarf = [];
    let parent = this.torso;
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.position.set(i === 0 ? 0.07 : 0, i === 0 ? 0.53 : 0, i === 0 ? 0.13 : 0.13);
      const w = 0.12 - i * 0.008;
      g.add(part((b) => {
        b.box(w, 0.028, 0.14, i % 2 ? SCARF2 : SCARF, 0, 0, 0.065);
        if (i === 4) for (let k = -2; k <= 2; k++) b.box(0.012, 0.02, 0.06, SCARF2, k * 0.02, 0, 0.16);
      }, 1));
      parent.add(g); parent = g; this.scarf.push(g);
    }

    // ----- head: smooth and round, with her face drawn on; brown hair with a full straight fringe -----
    this.head = new THREE.Group(); this.head.position.set(0, 0.725, 0); this.torso.add(this.head);
    const strands = (x, y, z) => [HAIR, HAIR_D, HAIR, HAIR_L][Math.floor((Math.atan2(x, z) + PI) * 9) % 4];
    this.head.add(part((b) => {
      b.sph(0.18, SKIN, 0, 0, 0, 1.05, 1.03, 1, { seg: 22 });
      for (const sx of [-1, 1]) {
        b.sph(0.04, SKIN, sx * 0.186, -0.01, 0.01, 0.5, 1, 0.8);                    // ears
        b.cap(0.02, 0.1, HAIR, sx * 0.174, -0.035, -0.05, 0.15, 0, sx * 0.06);      // wisps in front of the ears
        b.cap(0.012, 0.07, HAIR_L, sx * 0.168, -0.03, -0.085, 0.3, 0, sx * 0.1);
      }
      b.sph(0.019, SKIN_D, 0, -0.028, -0.179, 1.05, 0.85, 0.75);                     // button nose
      // hair swept back over the head to the ponytail
      b.dome(0.192, strands, 0, 0.0, 0.01, 0.78, 0, 0, 1.05, 1.04, 1.03, { tl: PI * 0.535, seg: 18 });
      // full straight fringe: chunky strands cut level just above the eyes
      for (let k = -4; k <= 4; k++) b.at(0, 0, 0, k * 0.215, () => {
        b.box(0.041, 0.092, 0.014, k % 2 ? HAIR : HAIR_L, 0, 0.108, -0.165 - Math.abs(k) * 0.0012, 0.56, 0, 0);
        b.sph(0.0205, k % 2 ? HAIR : HAIR_L, 0, 0.07, -0.184 - Math.abs(k) * 0.0012, 1, 0.45, 0.4);   // soft cut ends
      });
      b.sph(0.062, HAIR_D, 0, 0.115, 0.16, 1.1, 1, 0.9);                             // where the hair is gathered
    }));
    // the drawn face swaps between her big smile, a blink, and the shocked look she gives the camera when she stumbles
    this.face = faceMesh(); this.head.add(this.face);
    this.blinkT = 2;
    // ponytail: tied high with a scrunchie, in three swinging sections
    this.pony = new THREE.Group(); this.pony.position.set(0, 0.12, 0.175); this.head.add(this.pony);
    this.pony.add(part((b) => {
      b.tor(0.05, 0.026, HAT, 0, 0.0, 0, PI / 2, 0, 0, { seg: 12 });                 // scrunchie
      b.tor(0.052, 0.014, HAT_D, 0, -0.012, 0, PI / 2, 0, 0, { seg: 12 });
      b.cap(0.062, 0.12, strands, 0, -0.12, 0);
    }));
    this.pony2 = new THREE.Group(); this.pony2.position.set(0, -0.22, 0); this.pony.add(this.pony2);
    this.pony2.add(part((b) => { b.cap(0.055, 0.12, strands, 0, -0.085, 0); b.cap(0.04, 0.09, HAIR_D, 0, -0.2, 0); b.sph(0.026, HAIR, 0, -0.29, 0, 1, 1.5, 1); }));

    // ----- arms -----
    const arm = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.238, 0.43, 0); this.torso.add(sh);
      sh.add(part((b) => { b.sph(0.078, COAT, 0, 0, 0); b.cap(0.066, 0.15, COAT, 0, -0.135, 0); }));
      const el = new THREE.Group(); el.position.set(0, -0.27, 0); sh.add(el);
      el.add(part((b) => {
        b.cap(0.06, 0.12, COAT, 0, -0.1, 0);
        b.cyl(0.066, 0.066, 0.035, COAT_D, 0, -0.2, 0, 0, 0, 0, { seg: 10 });        // cuff
        b.sph(0.062, HAT, 0, -0.262, 0, 1, 1.15, 1);                                 // mitten
        b.sph(0.026, HAT, sx * -0.05, -0.25, -0.02);                                 // thumb
      }));
      return { sh, el };
    };
    this.armL = arm(-1); this.armR = arm(1);

    // ----- legs -----
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0, 0); this.hips.add(hip);
      hip.add(part((b) => { b.cap(0.085, 0.23, LEG, 0, -0.2, 0); }));
      const knee = new THREE.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
      knee.add(part((b) => {
        b.cap(0.07, 0.1, LEG, 0, -0.09, 0);
        b.cyl(0.088, 0.078, 0.27, BOOT, 0, -0.255, 0, 0, 0, 0, { seg: 12 });         // welly shaft
        b.cyl(0.095, 0.095, 0.035, BOOT_D, 0, -0.125, 0, 0, 0, 0, { seg: 12 });      // welly rim
        b.sph(0.088, BOOT, 0, -0.385, -0.055, 0.95, 0.72, 1.6);                      // foot
        b.box(0.155, 0.035, 0.29, C.cream, 0, -0.432, -0.05);                        // sole
        b.box(0.155, 0.02, 0.07, BOOT_D, 0, -0.415, 0.07);                           // heel
      }));
      // spring boots (shown while the power-up is active)
      const spring = part((b) => {
        for (let i = 0; i < 4; i++) b.tor(0.055, 0.012, 0x7dff8a, 0, -0.47 - i * 0.03, -0.04, PI / 2, 0, 0, { seg: 10, grad: 1 });
        b.box(0.14, 0.02, 0.24, 0x2fd35f, 0, -0.58, -0.04);
      });
      spring.visible = false; knee.add(spring);
      return { hip, knee, spring };
    };
    this.legL = leg(-1); this.legR = leg(1);

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
    this.rocket = part((b) => {
      b.cyl(0.17, 0.17, 1.25, 0xe5383b, 0, 0, 0, PI / 2, 0, 0, { seg: 14 });
      for (const z of [-0.36, 0.3]) b.cyl(0.176, 0.176, 0.13, 0xfff1cf, 0, 0, z, PI / 2, 0, 0, { seg: 14 });
      b.cone(0.17, 0.44, 0xffc928, 0, 0, -0.845, -PI / 2, 0, 0, { seg: 14 });
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.box(0.03, 0.32, 0.36, 0x22365c, -Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0.5, 0, 0, a); }
      b.cyl(0.12, 0.15, 0.12, 0x2c3640, 0, 0, 0.68, PI / 2, 0, 0, { seg: 12 });
      b.cyl(0.016, 0.016, 1.0, 0xb98f5e, 0.1, -0.12, 1.15, PI / 2, 0, 0, { seg: 6 });
      for (const sx of [-1, 1]) for (const z of [-0.14, 0.06]) b.sph(0.045, 0xffe27a, sx * 0.165, 0.03, z, 0.4, 1, 1, { seg: 6 });
    });
    this.rocket.position.set(0, 0.6, 0.02); this.rocket.visible = false; this.root.add(this.rocket);

    // ----- hoverboard: a surfboard that floats on a cushion of glowing sea spray (lies along z, nose forward) -----
    this.board = new THREE.Group(); this.board.visible = false; this.lean.add(this.board);
    this.board.add(part((b) => {
      b.add(new THREE.SphereGeometry(1, 18, 8), (x, y, z) => (Math.abs(x) < 0.07 ? 0xfff1cf : z < -0.55 ? 0xff7a66 : z > 0.6 ? 0xffc928 : 0x18a7a0), 0, 0, 0, 0, 0, 0, 0.36, 0.05, 1.0);
      b.box(0.34, 0.014, 0.36, 0x22365c, 0, 0.046, 0.5).box(0.34, 0.014, 0.3, 0x22365c, 0, 0.046, -0.32);   // grip pads
      b.box(0.03, 0.16, 0.24, 0x22365c, 0, -0.1, 0.74, -0.3, 0, 0);                                           // fin
      for (const z of [-0.5, 0.45]) b.cyl(0.17, 0.13, 0.06, 0x2c3640, 0, -0.06, z, 0, 0, 0, { seg: 12 });       // hover pods
    }));
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.boardGlow = [];
    for (const z of [-0.5, 0.45]) { const m = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.2, 16).rotateX(PI / 2), glowMat); m.position.set(0, -0.1, z); this.board.add(m); this.boardGlow.push(m); }

    // ----- laser zapper: a chunky toy blaster in her right hand (barrel pointing down her forearm) -----
    this.blaster = new THREE.Group(); this.blaster.position.set(0, -0.3, -0.03); this.blaster.visible = false; this.armR.el.add(this.blaster);
    this.blaster.add(part((b) => {
      b.sph(0.06, 0x18a7a0, 0, -0.03, -0.03, 0.85, 1.7, 0.95, { seg: 10 });
      b.cyl(0.03, 0.038, 0.18, 0xff9f1c, 0, -0.19, -0.03, 0, 0, 0, { seg: 8 });
      for (const y of [-0.14, -0.22]) b.tor(0.045, 0.013, 0xffc928, 0, y, -0.03, PI / 2, 0, 0, { seg: 10 });
    }));
    this.muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6ad8 }));
    this.muzzle.position.set(0, -0.3, -0.03); this.blaster.add(this.muzzle);
    this.aim = 0; this.kick = 0;

    this.phase = 0; this.lead = 1; this.t = 0; this.squash = 0; this.wasGround = true;
    this.shockT = 0; this.look = 0; this.lastSt = 0;
    this.j = { tl: 0, kl: 0, tr: 0, kr: 0, sl: 0, el: 1.2, sr: 0, er: 1.2, slz: 0, srz: 0, tx: 0, ty: 0, hx: 0, hy: 0, hipY: HIP, pony: -0.5, splay: 0, yaw: 0, lift: 0 };
  }

  setBoots(on) { this.legL.spring.visible = on; this.legR.spring.visible = on; }
  setShield(on) { this.shield.visible = on; }
  setRocket(on) { this.rocket.visible = on; }
  setBoard(on) { this.board.visible = on; }
  // mega: the bigger space version
  setBlaster(on, mega = false) { this.blaster.visible = on; this.blaster.scale.setScalar(mega ? 1.45 : 1.1); }
  fire() { this.kick = 1; }
  dispose() { this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }

  // s: { mode, speed, vy, vx, grounded, stumble (0..1) }
  update(dt, s) {
    this.t += dt;
    const sp = s.speed;
    const amp = clamp(sp / 13, 0.5, 1);
    const cadence = 2.5 + sp * 0.05;
    if (s.mode === 'run' || s.mode === 'stumble') this.phase += cadence * PI * dt;
    const ph = this.phase, sn = Math.sin(ph), cs = Math.cos(ph);
    const T = { splay: 0, yaw: 0, lift: 0 }; // targets
    const air = !s.grounded && (s.mode === 'run' || s.mode === 'stumble');

    if (s.mode === 'crash') {
      const w = Math.sin(this.t * 9) * 0.15;
      Object.assign(T, { tl: 0.9 + w, kl: -1.1, tr: 0.4 - w, kr: -0.7, sl: 2.4, el: 0.5, sr: 2.0, er: 0.7, slz: -0.6, srz: 0.6, tx: 0.25, ty: 0, hx: -0.3, hy: 0, hipY: HIP, pony: 0.6 });
    } else if (s.mode === 'fall') {
      const k = Math.sin(this.t * 16);
      Object.assign(T, { tl: 0.5 * k, kl: -0.6 - 0.4 * k, tr: -0.5 * k, kr: -0.6 + 0.4 * k, sl: 2.9, el: 0.2, sr: 2.9, er: 0.2, slz: -0.5 - 0.3 * k, srz: 0.5 - 0.3 * k, tx: 0.1, ty: 0, hx: -0.4, hy: 0, hipY: HIP, pony: -2.4 });
    } else if (s.mode === 'ride') {
      // astride the rocket, leaning forward and holding on
      const w = Math.sin(this.t * 7) * 0.05;
      Object.assign(T, { tl: 0.4, kl: -1.3 + w, tr: 0.4, kr: -1.3 - w, sl: 0.95, el: 0.5, sr: 0.95, er: 0.5, slz: 0.1, srz: -0.1, tx: -0.45, ty: 0, hx: 0.34, hy: 0, hipY: HIP - 0.02, pony: -1.7, splay: 0.45 });
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
        hipY: HIP - 0.02 + 0.055 * amp * Math.cos(2 * ph + 0.6), pony: -0.55 + 0.32 * Math.sin(2 * ph + 1.2),
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
    const face = FACES[shocked ? 'shock' : this.blinkT < 0 ? 'blink' : 'happy'];
    if (this.face.material.map !== face) this.face.material.map = face;
    const fl = Math.sin(this.t * 26) * st;
    this.legL.hip.rotation.x = j.tl; this.legL.knee.rotation.x = j.kl; this.legL.hip.rotation.z = -j.splay;
    this.legR.hip.rotation.x = j.tr; this.legR.knee.rotation.x = j.kr; this.legR.hip.rotation.z = j.splay;
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
    this.pony2.rotation.x = (j.pony + 0.55) * 0.8 - 0.15;
    const wind = clamp(sp / 16, 0.15, 1);
    for (let i = 0; i < this.scarf.length; i++) {
      const g = this.scarf[i];
      g.rotation.x = (i === 0 ? lerp(1.0, 0.12, wind) : lerp(0.12, 0, wind)) + Math.sin(this.t * 12 - i * 1.15) * 0.24 * wind - (air ? clamp(s.vy * 0.03, -0.3, 0.3) : 0);
      g.rotation.y = Math.sin(this.t * 8.3 - i * 0.9) * 0.22 * wind + clamp(vx * 0.03, -0.3, 0.3);
    }
    if (this.shield.visible) { this.shield.material.uniforms.uT.value = this.t; this.shield.rotation.y = this.t * 0.6; }
  }
}

// Tide Rush: game loop, player physics, collisions, scoring and camera.
import * as THREE from 'three';
import { setMaxAniso, TWIST, HILL, HILL_SHAPE, hillHeight } from './kit.js';
import { laneX, WATER_Y, JUMP_H, ZONE_LEN, ROOFED, SPIRAL, MOUNTAIN, COASTER, DEEP, HILLS, zoneOfLevel, speedAt, diffAt, jumpTimeAt, clamp, lerp, damp, smooth } from './config.js';
import { Sky } from './sky.js';
import { Track, zoneAtS, LETTERS, WARP_SPEED, PAD_BOOST } from './track.js';
import { Robyn, OUTFITS } from './robyn.js';
import { Particles, Tide, makeBlobShadow } from './fx.js';
import { Tunnel } from './startunnel.js';
import { GameAudio } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { prewarm } from './obstacles.js';
import { zoneName } from './scenery.js';
import { SkyLife } from './skylife.js';
import { Pets } from './pets.js';
import { Invaders } from './invaders.js';
import { Santa } from './santa.js';

const POWER_TIME = { magnet: 9, shield: 22, boots: 10, gem: 10, rocket: 6.5, board: 12, laser: 13 };
const POWER_KEYS = Object.keys(POWER_TIME);
const POWER_POP = { magnet: 'Shell magnet!', shield: 'Bubble shield!', boots: 'Spring boots! Double jump', gem: 'Double score!', rocket: 'Rocket ride!', board: 'Hoverboard!', laser: 'Laser zapper!' };
// Robyn can take five stumbles: each lets the tide gain a fifth of the way (TIDE_STEP), and a stumble while it is
// closer than TIDE_LIMIT ends the run. The tide falls back all the way in TIDE_FADE seconds, so a stumble is
// forgiven after about eight seconds of clean running.
const WARP_CURVE = 0.0016;  // how sharply the Star Tunnel sweeps round
const TWIST_MAX = 0.013;   // how tightly Spiral Bay corkscrews, in radians per metre
const CURVE_MAX = 0.0042, BANK_MAX = 0.1;   // Rollercoaster World: how sharply the road ahead bends sideways, and how far the view leans into each bend (radians)
const TIDE_STEP = 0.2, TIDE_LIMIT = 0.81, TIDE_FADE = 40;
const PIXEL = 21;   // zone id of Pixel Land, where the picture is drawn in chunky pixels
const ROCKET_SPEED = 1.5, FLY_Y = 6.0, FLY_Y_TUBE = 3.9;
// how high the rocket cruises at a point along the coast: lower inside the Glass Tunnel, so that she stays under its roof
const flyYAt = (s) => {
  const here = zoneAtS(s) === DEEP, m = ((s % ZONE_LEN) + ZONE_LEN) % ZONE_LEN;
  const k = here ? 1 : zoneAtS(s + 14) === DEEP ? 1 - (ZONE_LEN - m) / 14 : zoneAtS(s - 14) === DEEP ? 1 - m / 14 : 0;
  return lerp(FLY_Y, FLY_Y_TUBE, clamp(k, 0, 1));
};
const SPACE = 9;
// the flying attackers: what to call each one when it is zapped, and the colours of its puff
const FLYER = {
  ufo: ['UFO', [0xff7ad9, 0x8ff0ff, 0xffe27a, 0xffffff]], gull: ['Bomber gull', [0xffffff, 0xf5a623, 0xdfe6ee, 0xffe27a]], bat: ['Slime bat', [0x8dff5a, 0xb59cff, 0xffe27a, 0xffffff]],
  stormcloud: ['Storm cloud', [0xffe27a, 0x9aa4c0, 0xffffff, 0x8ff0ff]], snowcloud: ['Snow cloud', [0xffffff, 0xcfeaff, 0x8ff0ff, 0xe6eef8]], flosscloud: ['Candyfloss cloud', [0xff9fd0, 0xffffff, 0xffe24a, 0x8fd8ff]], twister: ['Little twister', [0x9fece4, 0xffffff, 0xff8fd6, 0xffd23f]], eagle: ['Grumpy eagle', [0x6b4a2e, 0xffffff, 0xffb300, 0xd9c7a8]], bandit: ['Balloon bandit', [0xe5383b, 0xffc928, 0x2f7fe0, 0xff6fae]], inkOcto: ['Inky octopus', [0x9a6fe0, 0x3a2a6a, 0xffd23f, 0xffffff]], chocJug: ['Chocolate jug', [0x7a4526, 0xfff6ee, 0x4f8fe0, 0xffe27a]], crow: ['Bossy crow', [0x2a2a34, 0xffc928, 0xffffff, 0xf2c230]], flashMirror: ['Flying mirror', [0xf2c230, 0xffffff, 0x8fcaff, 0xfff3a8]], pteroBones: ['Bony pterodactyl', [0xf6eed8, 0xffffff, 0xdccfae, 0xffd23f]], nightOwl: ['Night owl', [0x9a7ab8, 0xffffff, 0x8fb8f5, 0xffe27a]], blockBird: ['Block bird', [0x4f8fe0, 0xffffff, 0xffb347, 0xe5383b]], flyBox: ['Flying stereo', [0xff3fa4, 0x2fe0ff, 0xffe23f, 0xffffff]], flipGull: ['Upside-down gull', [0xffffff, 0xb8c4d0, 0xffb347, 0x5ad0e0]], oxpecker: ['Cheeky oxpecker', [0x8a6a4a, 0xffd23f, 0xe5383b, 0xf0d8a8]],
};
// picking up a laser while one is already running powers it up: it fires faster and reaches further
const LASER_LV = [null, { name: 'Laser zapper!', gap: 0.16, reach: 0, col: 0x6ff6ff, size: 1.1 }, { name: 'Double laser!', gap: 0.1, reach: 4, col: 0x9dff6a, size: 1.25 }, { name: 'Triple laser!', gap: 0.065, reach: 8, col: 0xffb347, size: 1.4 }];
// what her footsteps sound like in each world
const STEP_SOUND = { 1: 'wood', 2: 'wood', 3: 'wood', 6: 'wet', 7: 'snow', 8: 'wet', 9: 'metal', 10: 'snow', 12: 'wood', 13: 'wood', 14: 'wood', 15: 'wood', 17: 'wood', 18: 'wood', 19: 'wood', 20: 'wood', 21: 'wood', 22: 'wood', 23: 'wood', 24: 'wood' };   // zone id of Space Pier, where Robyn's mega laser fires by itself
const PET_POP = { izzi: ['Izzi is here! She rounds up shells', "Izzi's off for a sniff"], pixel: ['Pixel is here! Shells count double', 'Pixel wandered off'] };
const FW_COLORS = [0xffe27a, 0xff8ab0, 0x8ff0ff, 0xa6ff9a, 0xffb36b, 0xd9a6ff];
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => Math.floor(n).toLocaleString('en-GB');
const OVER_TEXT = {
  crash: ['Wiped out!', 'One bump too many, and the tide caught up.'],
  tide: ['The tide got you!', 'Three stumbles in a row and the sea catches up.'],
  hole: ['Splash!', 'Mind the gaps in the planks.'],
};

class Game {
  constructor() {
    this.canvas = document.getElementById('c');
    this.app = document.getElementById('app');
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;   // phones get a lighter setup than tablets and desktops
    this.quality = { low: coarse && small, shadows: true, shadowSize: coarse && small ? 1024 : 2048, maxPR: coarse && small ? 1.5 : 2 };
    this.pr = Math.min(window.devicePixelRatio || 1, this.quality.maxPR); this.chunky = 1;

    this.audio = new GameAudio();
    this.ui = new UI({
      start: () => this.start(), pause: () => this.pause(), resume: () => this.resume(), restart: () => this.restart(),
      home: () => this.home(), mute: () => this.toggleMute(), outfit: (i) => this.setOutfit(i),
    });
    this.ui.setSound(this.audio.muted);

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(this.pr);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.02;
    r.shadowMap.enabled = this.quality.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x03020a);     // deep space: only ever seen in the Star Tunnel
    setMaxAniso(r.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
    this.camPos = new THREE.Vector3(2, 2, -4); this.camLook = new THREE.Vector3(0, 1.1, 0);
    this.sky = new Sky(this.scene, this.quality);
    this.track = new Track(this.scene);
    // saved progress: best score, shells collected over all runs (they unlock outfits) and the chosen outfit
    this.best = 0; this.bank = 0; this.outfit = 0;
    try {
      this.best = parseInt(localStorage.getItem('tiderush.best') || '0', 10) || 0;
      this.bank = parseInt(localStorage.getItem('tiderush.bank') || '0', 10) || 0;
      const o = OUTFITS.findIndex((x) => x.id === localStorage.getItem('tiderush.outfit'));
      if (o > 0 && OUTFITS[o].need <= this.bank) this.outfit = o;
    } catch (e) { /* storage may be blocked */ }
    this.robyn = new Robyn(OUTFITS[this.outfit]); this.scene.add(this.robyn.root);
    this.blob = makeBlobShadow(); this.scene.add(this.blob);
    this.fx = new Particles(this.scene);
    this.tideWave = new Tide(this.scene, this.fx);
    this.tunnel = new Tunnel(this.scene);
    this.skylife = new SkyLife(this.scene);
    this.skylife.onPlane = () => this.audio.plane();
    this.skylife.onHeli = (phase) => {
      if (phase === 'in') this.audio.chopper(14.5);
      else if (phase === 'hover' && this.mode === 'run') { const pts = 500 * this.x2; this.score += pts; this.ui.popup("You're on Tide TV! +" + pts, 'gold'); }
    };
    // Izzi the border collie and Pixel the cat, who join the run every so often
    this.pets = new Pets(this.scene);
    // alien invader waves
    this.invaders = new Invaders(this.scene);
    this.invaders.onEvent = (what, n) => {
      if (what === 'step') this.audio.invStep(n);
      else if (what === 'cleared') {
        const bonus = 1500 * this.x2; this.score += bonus; this.addCombo(0.4);
        this.ui.popup('Wave cleared! +' + fmt(bonus), 'gold'); this.audio.invClear(); this.celebrate(3);
      } else if (what === 'fled' && this.mode === 'run') { this.ui.popup('The invaders zoomed off!'); this.audio.invFlee(); }
    };
    // Grumpy Santa, the villain of Christmas Pier
    this.santa = new Santa(this.scene);
    this.santa.onEvent = (what) => {
      if (what === 'beaten') {
        const bonus = 2500 * this.x2; this.score += bonus; this.addCombo(0.5);
        this.ui.popup("Santa's jolly again! +" + fmt(bonus), 'gold'); this.audio.santaJolly(); this.celebrate(5);
        // every present he has already thrown pops in a puff of glitter
        for (const o of this.track.obstacles) if (o.mover && o.mover.santa && o.mover.on && !o.zap && !o.flung) { o.zap = { t: 0 }; o.hit = true; this.glitter(o.x, 0.6, -(o.s - this.dist), 12); }
      } else if (what === 'fled' && this.mode === 'run') { this.ui.popup('Grumpy Santa zoomed off!'); this.audio.santaFlee(); }
    };
    this.pets.onEvent = (kind, what) => {
      if (what === 'join') { this.ui.popup(PET_POP[kind][0], 'gold'); if (kind === 'izzi') this.audio.bark(); else this.audio.meow(); }
      else { this.ui.power(kind, 0); if (this.mode === 'run' && !this.warp && this.pw.rocket <= 0) { if (kind === 'izzi') this.audio.whine(); else this.audio.mew(); } }
    };
    // laser bolts in flight
    this.bolts = [];
    const boltGeo = new THREE.CapsuleGeometry(0.07, 1.2, 2, 6).rotateX(Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: 0x6ff6ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      m.visible = false; m.renderOrder = 4; this.scene.add(m); this.bolts.push({ mesh: m, live: false });
    }
    prewarm();

    this.input = new Input(this.canvas, {
      left: () => this.move(-1), right: () => this.move(1), jump: () => this.jump(),
      pause: () => (this.mode === 'pause' ? this.resume() : this.pause()),
      confirm: () => { if (this.mode === 'title') this.start(); else if (this.mode === 'over' && this.time - this.overAt > 0.5) this.restart(); else if (this.mode === 'pause') this.resume(); },
      mute: () => this.toggleMute(), touch: () => this.audio.unlock(),
    });
    window.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    window.addEventListener('keydown', () => this.audio.unlock());
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (this.mode === 'run') this.pause(); this.audio.suspend(); } else if (this.mode !== 'pause') this.audio.resume(); });
    window.addEventListener('blur', () => { if (this.mode === 'run') this.pause(); });

    this.mode = 'title'; this.time = 0; this.dist = 0; this.speed = 6; this.camT = 0; this.shake = 0;
    this.resetPlayer();
    this.track.update(0, 0, 99);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.app);
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));

    this.ui.show('title', this.best); this.ui.outfits(OUTFITS, this.outfit, this.bank);
    this.ui.loaded();
    this.last = performance.now(); this.acc = 0; this.frames = 0;
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  resetPlayer() {
    this.p = { lane: 0, fromLane: 0, x: 0, y: 0, vy: 0, vx: 0, grounded: true, coyote: 0, jumpBuf: 0, airJumps: 0, stumbleT: 0, invuln: 0, laneT: 9, float: 0, blast: false };
    this.score = 0; this.shells = 0; this.mult = 1; this.topMult = 1; this.combo = 0; this.tide = 0;
    this.pw = { magnet: 0, shield: 0, boots: 0, gem: 0, rocket: 0, board: 0, laser: 0 };
    this.laserT = 0; this.laserLv = 0; this.zapPopT = 0; if (this.bolts) for (const b of this.bolts) { b.live = false; b.mesh.visible = false; }
    if (this.pets) this.pets.reset(); this.robyn.setBlaster(false);
    if (this.invaders) this.invaders.clear(); this.invT = 0; this.invN = 0;
    if (this.santa) this.santa.clear(); this.santaT = 0; this.santaN = 0;
    this.robyn.setBoots(false); this.robyn.setShield(false); this.robyn.setRocket(false); this.robyn.setBoard(false);
    if (this.skylife) this.skylife.reset();
    this.robyn.root.visible = true; this.robyn.root.rotation.set(0, 0, 0); this.robyn.root.position.set(0, 0, 0);
    this.zone = -1; this.dy = null; this.gullT = 6; this.petT = 4; this.foot = 0;
    // levels are counted from wherever this run starts
    this.level = 1; this.levelBase = Math.floor(Math.max(0, this.dist) / ZONE_LEN);
    this.got = [0, 0, 0, 0, 0]; this.wordT = 0; this.track.wantLetter = 0;
    this.warp = null; this.setWorld(true); this.flyK = 0;
    this.fwT = 1; this.boltT = 2.5; this.sprayT = 1;
  }
  // Show the normal world, or hide it and show the warp tunnel instead.
  setWorld(on) { this.track.world.visible = on; this.sky.setVisible(on); this.tunnel.show(!on, this.warp ? this.warp.turn : 1); }
  setOutfit(i) {
    if (this.mode !== 'title' || i === this.outfit || OUTFITS[i].need > this.bank) return;
    this.outfit = i;
    try { localStorage.setItem('tiderush.outfit', OUTFITS[i].id); } catch (e) { /* ignore */ }
    this.scene.remove(this.robyn.root); this.robyn.dispose();
    this.robyn = new Robyn(OUTFITS[i]); this.scene.add(this.robyn.root);
    this.ui.outfits(OUTFITS, i, this.bank);
    this.audio.unlock(); this.audio.power(); this.sparkle(0, 1.1, 0, OUTFITS[i].coat, 22);
  }

  // Pixel Land is drawn in big chunky pixels: the picture is rendered small and stretched without smoothing.
  // `chunky` is how many screen points wide each of those pixels is (1 = the normal, sharp picture).
  setChunky(on) {
    const h = Math.max(1, this.app.clientHeight), n = on ? clamp(Math.round(h / 250), 2, 4) : 1;
    if (n === this.chunky) return;
    this.chunky = n; this.renderer.domElement.style.imageRendering = n > 1 ? 'pixelated' : '';
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.app.clientWidth), h = Math.max(1, this.app.clientHeight), pr = this.chunky > 1 ? 1 / this.chunky : this.pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.sky.snowMat.uniforms.uScale.value = h * pr; this.sky.bubbleMat.uniforms.uScale.value = h * pr;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // keep all three lanes in view: widen the vertical field of view on tall screens, then pull the camera back
    const need = Math.max(60, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(31.5)) / aspect)));
    this.baseFov = clamp(need, 60, 86);
    this.camBack = Math.tan(THREE.MathUtils.degToRad(need / 2)) / Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2));
    this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix();
    this.fx.mat.uniforms.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)));
  }

  // ---------- flow ----------
  start() {
    if (this.mode !== 'title') return;
    this.audio.unlock(); this.audio.setIntensity(1); this.audio.muffle(false); this.audio.setTheme(zoneAtS(this.dist)); this.audio.go();
    this.resetPlayer();
    this.track.startRun(this.dist);
    this.mode = 'run'; this.camT = 0;
    this.ui.resetHud(); this.ui.show('hud'); this.ui.wash('off'); this.ui.popup('Go!', 'gold');
    this.canvas.focus({ preventScroll: true });
  }
  restart() {
    this.audio.unlock(); this.audio.setIntensity(1); this.audio.muffle(false); this.audio.setTheme(zoneAtS(0)); this.audio.go();
    this.track.reset(); this.dist = 0; this.speed = 8;
    this.resetPlayer();
    this.track.startRun(0);
    this.track.noGapBefore = 0;
    this.track.update(0, 0, 99);
    this.mode = 'run'; this.camT = 1;
    this.tideWave.z = 24;
    this.ui.resetHud(); this.ui.show('hud'); this.ui.wash('off'); this.ui.popup('Go!', 'gold');
    this.canvas.focus({ preventScroll: true });
  }
  home() {
    this.track.reset(); this.dist = 0; this.speed = 6;
    this.resetPlayer();
    this.track.update(0, 0, 99);
    this.mode = 'title'; this.camT = 0; this.tideWave.z = 24;
    this.audio.setIntensity(0); this.audio.muffle(false); this.audio.setTheme(0); this.audio.click();
    this.ui.show('title', this.best); this.ui.outfits(OUTFITS, this.outfit, this.bank); this.ui.wash('off');
  }
  pause() {
    if (this.mode !== 'run') return;
    this.mode = 'pause'; this.audio.click(); this.audio.muffle(true); this.ui.show('pause');
  }
  resume() {
    if (this.mode !== 'pause') return;
    this.mode = 'run'; this.audio.unlock(); this.audio.muffle(false); this.audio.click(); this.ui.show('hud'); this.last = performance.now();
    this.canvas.focus({ preventScroll: true });
  }
  toggleMute() { this.audio.unlock(); this.audio.setMuted(!this.audio.muted); this.audio.click(); this.ui.setSound(this.audio.muted); }

  // ---------- player actions ----------
  move(dir) {
    if (this.mode !== 'run') return;
    const P = this.p, nl = clamp(P.lane + dir, -1, 1);
    if (nl === P.lane) return;
    P.fromLane = P.lane; P.lane = nl; P.laneT = 0;
    this.audio.swish();
  }
  jump() {
    if (this.mode === 'run') this.p.jumpBuf = 0.14;
    else if (this.mode === 'title' && this.time > 0.6) this.start();
  }

  addCombo(v) {
    this.combo += v / (0.7 + this.mult * 0.3);
    if (this.combo >= 1) {
      if (this.mult < 8) { this.mult++; this.combo = 0; this.topMult = Math.max(this.topMult, this.mult); this.ui.popup('Combo x' + this.mult, 'gold'); this.audio.multUp(); }
      else this.combo = 1;
    }
  }
  get x2() { return this.pw.gem > 0 ? 2 : 1; }

  // how many more stumbles she can take before the tide catches her
  stumblesLeft() { return this.tide > TIDE_LIMIT ? 0 : Math.floor((TIDE_LIMIT - this.tide) / TIDE_STEP) + 1; }
  // cause: how the run ends if this is one stumble too many ('tide', or 'crash' for a head-on hit)
  stumble(cause = 'tide') {
    const P = this.p;
    if (P.invuln > 0) return;
    if (this.pw.board > 0) { this.popBoard(); return; }   // the hoverboard takes the knock instead
    // each stumble lets the tide gain on her; she can take five, and a sixth while it is this close ends the run
    if (this.tide > TIDE_LIMIT) { this.die(cause); return; }
    if (this.mult >= 3) this.audio.comboLost();
    P.stumbleT = 0.7; P.invuln = 0.7; this.tide = Math.min(1, this.tide + TIDE_STEP); this.mult = 1; this.combo = 0; this.shake = 0.5;
    const left = this.stumblesLeft();
    this.audio.stumble(); if (!left) this.audio.tideWarn(); this.ui.popup(!left ? 'Last chance!' : left === 1 ? 'Careful! 1 stumble left' : `Careful! ${left} stumbles left`, 'warn');
    this.dust(P.x, P.y + 0.3, 10, 0xfff3d6);
  }
  // The hoverboard and the bubble shield each soak up one hit; the board goes first.
  get guarded() { return this.pw.shield > 0 || this.pw.board > 0; }
  popGuard() { if (this.pw.board > 0) this.popBoard(); else this.popShield(); }
  popBoard() {
    const P = this.p;
    this.pw.board = 0; this.ui.power('board', 0);
    P.invuln = 1.0; P.float = Math.max(P.float, 1.4); this.shake = 0.4; this.audio.shieldPop(); this.ui.popup('Board wiped out!', 'warn');
    this.robyn.shockT = 1.0;
    for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28; this.fx.emit({ x: P.x + Math.cos(a) * 0.4, y: P.y + 0.2, z: Math.sin(a) * 0.6, vx: Math.cos(a) * 4, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 4, life: 0.5, size: 0.2, color: i % 2 ? 0x7ff6ff : 0xffffff, g: 6 }); }
  }
  popShield() {
    this.pw.shield = 0; this.robyn.setShield(false); this.ui.power('shield', 0);
    this.p.invuln = 0.9; this.shake = 0.4; this.audio.shieldPop(); this.ui.popup('Shield popped!', 'warn');
    this.robyn.shockT = 1.0;
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, b = Math.random() * 3.14; this.fx.emit({ x: this.p.x + Math.cos(a) * Math.sin(b), y: this.p.y + 0.9 + Math.cos(b), z: Math.sin(a) * Math.sin(b), vx: Math.cos(a) * 5, vy: Math.cos(b) * 5, vz: Math.sin(a) * 5, life: 0.5, size: 0.2, color: 0x8ff0ff, g: 2 }); }
  }
  fling(o) { o.flung = { vx: (o.x >= this.p.x ? 1 : -1) * (3 + Math.random() * 4), vy: 7 + Math.random() * 3, vz: 12, t: 0 }; }
  dust(x, y, n, color = 0xe9d9b8) {
    for (let i = 0; i < n; i++) this.fx.emit({ x: x + (Math.random() - 0.5) * 0.5, y: y + 0.05, z: (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 2.4, vy: 0.6 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 1.5, life: 0.35 + Math.random() * 0.25, size: 0.22, grow: 1.4, color, g: 1, a: 0.55 });
  }
  sparkle(x, y, z, color = 0xffe27a, n = 7) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; this.fx.emit({ x, y, z, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 + 1.4, vz: (Math.random() - 0.5) * 2, life: 0.4, size: 0.13, color, g: 3, world: false }); }
  }

  die(cause) {
    if (this.mode !== 'run') return;
    this.mode = 'dying'; this.dy = { cause, t: 0, vy: cause === 'crash' ? 5 : 0, back: 0, splashed: false };
    this.shake = 1; this.audio.muffle(true);
    if (cause === 'hole') this.audio.fall();      // the splash plays when she reaches the water
     else { this.audio.crash(); this.audio.whoosh(1.3); }
    if (cause === 'crash') this.dust(this.p.x, this.p.y + 0.8, 16, 0xfff3d6);
    this.tide = 1;
    this.audio.gameOver();
  }
  finish() {
    const total = Math.floor(this.score);
    const newBest = total > this.best;
    if (newBest) { this.best = total; try { localStorage.setItem('tiderush.best', String(total)); } catch (e) { /* ignore */ } }
    this.bank += this.shells;
    try { localStorage.setItem('tiderush.bank', String(this.bank)); } catch (e) { /* ignore */ }
    const unlocked = OUTFITS.find((o) => o.need > this.bank - this.shells && o.need <= this.bank);
    const [title, sub] = OVER_TEXT[this.dy.cause];
    this.mode = 'over'; this.overAt = this.time; this.audio.setIntensity(0);
    if (newBest) this.audio.newBest(); else if (unlocked) this.audio.unlockOutfit();
    this.ui.wash('dim');
    this.ui.over({ title, sub: unlocked ? `New outfit unlocked: ${unlocked.name}!` : sub, score: total, dist: this.dist - this.track.runStart, shells: this.shells, mult: this.topMult, level: this.level, newBest });
  }

  // ---------- simulation ----------
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    if (this.mode !== 'pause') this.update(dt);
    this.setChunky(zoneAtS(this.dist) === PIXEL);
    this.renderer.render(this.scene, this.camera);
    // adapt resolution if the device is struggling
    if (this.mode === 'run') {
      this.acc += dt; this.frames++;
      if (this.frames >= 120) {
        const avg = this.acc / this.frames; this.acc = 0; this.frames = 0;
        if (avg > 1 / 44) {
          if (this.chunky > 1) { /* already drawing very few pixels */ } else if (this.pr > 1.01) { this.pr = Math.max(1, this.pr - 0.25); this.resize(); }
          else if (this.renderer.shadowMap.enabled) { this.renderer.shadowMap.enabled = false; this.sky.sun.castShadow = false; this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
        }
      }
    }
  }

  update(dt) {
    this.time += dt;
    const P = this.p;
    if (this.mode === 'title') {
      this.speed = damp(this.speed, 6, 3, dt);
      this.dist += this.speed * dt;
    } else if (this.mode === 'run') {
      if (this.bot) this.botStep();
      this.updateRun(dt);
      this.camT = Math.min(1, this.camT + dt / 1.1);
    } else if (this.mode === 'dying') {
      this.updateDying(dt);
    } else if (this.mode === 'over') {
      this.speed = 0;
    }
    this.track.update(this.dist, dt);
    this.sky.update(this.dist, this.time, dt, this.warp ? 0 : this.dive || 0, this.depth || 0);
    {
      // Spiral Bay corkscrews: the twist winds one way through the first half of the level, unwinds, then winds the other way
      const zf = Math.max(0, this.dist) / ZONE_LEN, u = zf - Math.floor(zf);
      const z = this.warp ? -1 : zoneAtS(this.dist), wave = Math.sin(u * Math.PI * 2);
      // Rollercoaster World swings the road ahead from side to side, and banks it into each bend
      const sway = z === COASTER ? Math.sin(u * Math.PI * 4) * Math.sin(u * Math.PI) : 0;
      const want = this.twistForce ?? (z === SPIRAL ? wave * TWIST_MAX : 0);
      this.twist = damp(this.twist || 0, want, 3, dt);
      // (the Star Tunnel sweeps gently round to one side all the way along)
      this.curve = damp(this.curve || 0, this.warp ? this.warp.turn * WARP_CURVE : sway * CURVE_MAX, 3, dt);
      this.lean = damp(this.lean || 0, this.mode === 'run' ? -sway * BANK_MAX : 0, 3, dt);
      TWIST.value.x = Math.abs(this.twist) < 1e-5 ? 0 : this.twist;
      TWIST.value.z = Math.abs(this.curve) < 1e-6 ? 0 : this.curve;
    }
    {
      // the hill levels: tell the shader where Robyn is on the nearest hill (this one, or one coming up ahead)
      const lv = Math.floor(Math.max(0, this.dist) / ZONE_LEN);
      let hill = null, s0 = 0;
      if (!this.warp) for (let k = lv; k <= lv + 2 && !hill; k++) { hill = HILLS[zoneOfLevel(k)]; s0 = k * ZONE_LEN; }
      const sl = this.dist - s0;
      if (hill) { HILL_SHAPE.value.set(hill[1], hill[2]); HILL.value.set(hill[0], sl, ZONE_LEN, hillHeight(sl, hill[0], ZONE_LEN, hill[1], hill[2])); } else HILL.value.set(0, 0, ZONE_LEN, 0);
      const slope = hill ? (hillHeight(sl + 1.5) - hillHeight(sl - 1.5)) / 3 : 0;
      this.slope = damp(this.slope || 0, slope, 5, dt);
      // over the top of a hump: the road was rising a moment ago, is falling now, and this is well up the hill
      if (hill && this.mode === 'run' && zoneOfLevel(lv) === COASTER && slope > 0.12 && (this.clackT = (this.clackT || 0) - dt) <= 0) { this.clackT = 0.5; this.audio.clack(4); }      // the clack of the lift hill
      const rising = this.rising; this.rising = hill ? slope > 0 : null;
      if (hill && hill[0] > 0 && this.mode === 'run' && rising === true && slope <= 0 && HILL.value.w > hill[0] * 0.5) this.summit(zoneOfLevel(lv));
      // in the Glass Tunnel the road is under the sea: how deep it is, and how far under the surface the camera has gone
      this.depth = hill && hill[0] < 0 ? -HILL.value.w : 0; this.dive = smooth((this.depth - 3.2) / 3.8);
    }
    this.audio.setSea(1 - Math.min(1, Math.max(this.sky.cur.under, this.sky.cur.space, (this.dive || 0) * 0.7)));
    if (this.warp) {
      // inside the tunnel the lighting is the tunnel's own
      this.tunnel.update(this.dist, this.time, dt, this.warp.end - this.dist);
      const sk = this.sky; sk.hemi.intensity = 1.6; sk.hemi.color.set(0xe6ecff); sk.hemi.groundColor.set(0x8f9dff); sk.sun.intensity = 1.2; sk.sun.color.set(0xffffff);
      this.scene.fog.color.set(0x06041a);
    }
    this.ambience(dt);
    { const c = this.sky.cur, roof = (d) => { const z = zoneAtS(d); return ROOFED(z) || z === SPACE; }; this.skylife.update(dt, this.time, { run: this.mode === 'run', hidden: !!this.warp, clear: !roof(this.dist) && !roof(this.dist + 150), calm: c.storm < 0.4, night: c.stars, hold: this.showOn() }); }

    // Robyn
    const rb = this.robyn, fly = this.mode === 'run' && this.pw.rocket > 0, surf = this.pw.board > 0 && !fly && (this.mode === 'run' || this.mode === 'title');
    rb.setBoard(surf);
    if (this.mode !== 'dying' && this.mode !== 'over') {
      rb.root.position.set(P.x, P.y, 0);
      rb.root.rotation.z = damp(rb.root.rotation.z, fly ? clamp(-P.vx * 0.05, -0.5, 0.5) : 0, 10, dt);
      rb.update(dt, { mode: fly ? 'ride' : surf ? 'surf' : 'run', speed: this.speed, vy: P.vy, vx: P.vx, grounded: P.grounded, stumble: P.stumbleT > 0 ? P.stumbleT / 0.7 : 0 });
    }
    this.flyK = damp(this.flyK, fly ? 1 : 0, 3, dt);
    this.pets.update(dt, this.time, { mode: this.mode, dist: this.dist, x: P.x, y: P.y, speed: this.speed, busy: fly || !!this.warp, hold: this.showOn() || !!this.skylife.heli, floorAt: (x, s) => this.track.floorAt(x, s) });
    this.updateBolts(dt);
    const f = Math.max(0, this.track.floorAt(P.x, this.dist));
    this.blob.visible = this.mode !== 'over' && (P.float > 0 || surf || this.track.floorAt(P.x, this.dist) > -1) && rb.root.visible;
    const hgt = Math.max(0, P.y - f);
    this.blob.position.set(P.x, f + 0.03, 0.05); this.blob.scale.setScalar(Math.max(0.35, 1 - hgt * 0.28)); this.blob.material.opacity = 0.75 * Math.max(0.25, 1 - hgt * 0.3);

    this.tide = Math.max(0, this.tide - (this.mode === 'run' ? dt / TIDE_FADE : 0));
    const surge = this.dy ? clamp((this.dy.t - (this.dy.cause === 'hole' ? 0.55 : 0.2)) / 0.9, 0, 1) : 0;
    this.tideWave.update(dt, this.mode === 'title' ? 0 : this.tide, this.mode === 'dying' || this.mode === 'over' ? Math.max(surge, 0.001) : 0, this.speed);
    if (this.warp) this.tideWave.group.visible = false;
    this.fx.update(dt, this.speed);
    this.updateCamera(dt);
  }

  updateRun(dt) {
    const P = this.p, tr = this.track;
    const run = this.dist - tr.runStart, diff = diffAt(run);
    const fly = this.pw.rocket > 0;
    P.stumbleT = Math.max(0, P.stumbleT - dt);
    this.speed = damp(this.speed, speedAt(run) * (P.stumbleT > 0 ? 0.72 : 1) * (this.warp ? WARP_SPEED : fly ? ROCKET_SPEED : 1), 5, dt);
    const prevX = P.x, prevY = P.y;
    this.dist += this.speed * dt;
    const s = this.dist;
    P.jumpBuf -= dt; P.coyote -= dt; P.invuln -= dt; P.laneT += dt; P.float -= dt;

    // lanes
    const dx = laneX(P.lane) - P.x;
    P.x += Math.sign(dx) * Math.min(Math.abs(dx), (Math.abs(dx) * 15 + 3.5) * dt);
    P.vx = dt > 0 ? (P.x - prevX) / dt : 0;

    const boots = this.pw.boots > 0;
    const jt = jumpTimeAt(run), H = JUMP_H * (boots ? 1.1 : 1), G = (8 * H) / (jt * jt), V0 = (4 * H) / jt;
    // while Robyn is "floating" (on the hoverboard, just off the rocket or out of the tunnel) gaps in the planks cannot swallow her
    const hover = this.pw.board > 0;
    const floorAt = (x) => { const f = tr.floorAt(x, s); return P.float > 0 || hover ? Math.max(f, 0) : f; };
    if (fly) {
      // rocket mode: cruise above everything
      P.y = damp(P.y, flyYAt(s + 6) + Math.sin(this.time * 3.2) * 0.16, 3.4, dt); P.vy = 0; P.grounded = false; P.coyote = 0; P.jumpBuf = 0;
      for (let i = 0; i < 3; i++) this.fx.emit({ x: P.x + rnd(0.1), y: P.y + 0.6 + rnd(0.1), z: 0.9, vx: rnd(1.3), vy: rnd(1.3), vz: 7 + Math.random() * 6, life: 0.28 + Math.random() * 0.2, size: 0.34, grow: -0.7, color: i ? 0xffa62b : 0xfff3b0, g: 0, world: false });
      if (Math.random() < 0.5) this.fx.emit({ x: P.x + rnd(0.15), y: P.y + 0.6, z: 1.6, vx: rnd(0.6), vy: 0.4 + Math.random(), vz: 4, life: 0.8, size: 0.3, grow: 1.6, color: 0xe6e9f2, g: -0.5, world: false, a: 0.4 });
    } else {
      // jumping
      if (P.jumpBuf > 0) {
        if (P.grounded || P.coyote > 0) {
          P.vy = V0; P.grounded = false; P.coyote = 0; P.jumpBuf = 0; P.airJumps = boots ? 1 : 0;
          this.audio.jump(); this.dust(P.x, P.y, 5);
        } else if (P.airJumps > 0) {
          P.vy = V0 * 0.94; P.airJumps--; P.jumpBuf = 0; this.audio.doubleJump();
          for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; this.fx.emit({ x: P.x + Math.cos(a) * 0.3, y: P.y, z: Math.sin(a) * 0.3, vx: Math.cos(a) * 3, vy: -0.5, vz: Math.sin(a) * 3, life: 0.35, size: 0.16, color: 0x7dff8a, g: 0 }); }
        }
      }
      let f = floorAt(P.x);
      if (P.grounded) {
        if (f - P.y > 0.5) { if (this.wall(prevX, s, f)) return; f = floorAt(P.x); }
        if (f < P.y - 0.02) { P.grounded = false; P.coyote = 0.1; P.vy = 0; P.airJumps = boots ? 1 : 0; }
        else if (f - P.y <= 0.5) P.y = f;
      }
      if (!P.grounded) {
        P.vy -= G * dt; P.y += P.vy * dt;
        if (P.y <= f) {
          if (prevY >= f - 0.01 || f - P.y <= 0.5) {
            P.y = f; P.vy = 0; P.grounded = true; this.audio.land(); this.dust(P.x, P.y, 7);
          } else if (this.wall(prevX, s, f)) return;
        }
        if (P.y < -0.4) {
          if (this.guarded) { P.y = -0.39; P.vy = 15; this.popGuard(); }
          else { this.die('hole'); return; }
        }
      }
      if (P.blast && P.grounded) this.landBlast();

      // bounce pads
      for (const pad of tr.pads) {
        if (pad.used || Math.abs(pad.s - s) > 0.95 || Math.abs(pad.x - P.x) > 0.85 || P.y > 0.5) continue;
        pad.used = true; pad.t = 1;
        P.vy = V0 * PAD_BOOST; P.y = Math.max(P.y, 0.05); P.grounded = false; P.coyote = 0; P.jumpBuf = 0; P.airJumps = boots ? 1 : 0;
        this.audio.boing(); this.addCombo(0.15);
        for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; this.fx.emit({ x: P.x + Math.cos(a) * 0.5, y: 0.3, z: Math.sin(a) * 0.5, vx: Math.cos(a) * 3.5, vy: 2.5, vz: Math.sin(a) * 3.5, life: 0.45, size: 0.18, color: i % 2 ? 0xff7ac0 : 0xffe27a, g: 5 }); }
      }
      // warp portals
      if (!this.warp) for (const po of tr.portals) {
        if (!po.used && Math.abs(po.s - s) < 1.0 && Math.abs(po.x - P.x) < 0.95 && P.y < 2.1) { po.used = true; this.enterWarp(); return; }
      }
    }

    // obstacles
    for (const o of tr.obstacles) {
      if (o.flung || o.zap) continue;
      const dz = o.s - s, half = o.d / 2 + 0.3;
      if (dz < -half) {
        if (!o.passed) { o.passed = true; this.onPass(o); }
        // a tall thing Robyn has cut in front of would sit between her and the camera, so take it out of view
        if (o.kind === 'tall' && Math.abs(o.x - P.x) < o.w / 2 + 0.45) o.mesh.visible = false;
        continue;
      }
      if (dz > half) continue;
      const xr = (o.w / 2) * 0.86 + 0.3, top = o.name === 'barrel' ? 1.0 : o.h;
      const over = Math.abs(P.x - o.x) < xr;
      if (over && P.y >= top - 0.22) o.cleared = true;
      else if (over) {
        if (P.invuln > 0) continue;
        o.hit = true;
        if (o.mover) { this.fling(o); if (this.guarded) this.popGuard(); else this.stumble(); if (this.mode !== 'run') return; }
        else if (Math.abs(prevX - o.x) >= xr) { P.x = prevX; const t = P.lane; P.lane = P.fromLane; P.fromLane = t; this.stumble(); if (this.mode !== 'run') return; }
        else if (this.guarded) { this.fling(o); this.popGuard(); }
        else { this.fling(o); this.stumble('crash'); if (this.mode !== 'run') return; }   // a head-on hit, even with something big, is a stumble too
      } else if (o.kind === 'tall' && dz > -o.d / 2 && P.laneT < 0.42 && P.fromLane === o.lane && Math.abs(P.x - o.x) < xr + 1.2) o.close = true;
    }

    // shells and pearls
    const izzi = this.pets.has('izzi'), lucky = this.pets.has('pixel') ? 2 : 1;
    const mag = this.pw.magnet > 0 || izzi, reach = 0.85 + this.speed * dt * 0.5;
    for (const c of tr.coins) {
      if (c.gone) continue;
      const dz = c.s - s;
      if (mag && !c.pull && dz < 10 && dz > -2 && Math.abs(c.y - P.y) < 4) c.pull = true;
      if (c.pull) {
        const k = 1 - Math.exp(-14 * dt);
        c.x = lerp(c.x, P.x, k); c.y = lerp(c.y, P.y + 0.9, k); c.s = lerp(c.s, s + 0.2, k);
        c.mesh.position.set(c.x, c.y, -c.s);
      }
      if (Math.abs(c.s - s) < reach && Math.abs(c.x - P.x) < 0.9 && Math.abs(c.y - (P.y + 0.85)) < 1.2) {
        c.gone = true;
        if (c.pearl) {
          this.shells += 5 * lucky; const pts = 100 * this.mult * this.x2 * lucky; this.score += pts; this.addCombo(0.2);
          this.audio.pearl(); this.ui.popup('Pearl! +' + fmt(pts)); this.sparkle(c.x, c.y, s - c.s, 0xffc4ec, 14);
        } else {
          this.shells += lucky; this.score += 10 * this.mult * this.x2 * lucky; this.addCombo(0.045);
          this.audio.coin(); this.sparkle(c.x, c.y, s - c.s, 0xffe27a, 4);
        }
      }
    }
    // the letters of ROBYN
    for (const l of tr.letters) {
      if (!l.gone && Math.abs(l.s - s) < 1.0 && Math.abs(l.x - P.x) < 1.0 && Math.abs(l.y - (P.y + 0.85)) < 1.5) { l.gone = true; this.gotLetter(l.i, l.x, l.y); }
    }
    if (this.wordT > 0) { this.wordT -= dt; if (this.wordT <= 0) { this.got = [0, 0, 0, 0, 0]; tr.wantLetter = 0; this.ui.letters(this.got); } }
    // power-ups
    const mega0 = zoneAtS(s) === SPACE;
    for (const p of tr.powerups) {
      if (p.gone) continue;
      if (Math.abs(p.s - s) < 1.0 && Math.abs(p.x - P.x) < 1.0 && Math.abs(p.y - (P.y + 0.85)) < 1.5) {
        if (p.type === 'laser') this.laserLv = this.pw.laser > 0 && !mega0 ? Math.min(3, this.laserLv + 1) : 1;
        p.gone = true; this.pw[p.type] = POWER_TIME[p.type]; this.addCombo(0.2);
        this.audio.power(p.type); this.ui.popup(p.type === 'laser' ? LASER_LV[this.laserLv].name : POWER_POP[p.type], 'gold');
        this.sparkle(p.x, p.y, 0, p.mesh.userData.color, 18);
        if (p.type === 'boots') { this.robyn.setBoots(true); if (!P.grounded) P.airJumps = 1; }
        if (p.type === 'shield') this.robyn.setShield(true);
        if (p.type === 'rocket') this.startRocket();
        if (p.type === 'board') this.audio.board();
      }
    }
    for (const k of POWER_KEYS) {
      if (this.pw[k] > 0) {
        this.pw[k] -= dt;
        // three warning ticks as a power-up runs out
        if (k !== 'rocket' && this.pw[k] > 0 && this.pw[k] < 1.55 && Math.floor((this.pw[k] + dt) * 2) !== Math.floor(this.pw[k] * 2)) this.audio.tick();
        if (this.pw[k] <= 0) {
          this.pw[k] = 0; this.audio.powerEnd(); if (k === 'laser') this.laserLv = 0;
          if (k === 'boots') this.robyn.setBoots(false); if (k === 'shield') this.robyn.setShield(false); if (k === 'rocket') this.endRocket(); if (k === 'board') P.float = Math.max(P.float, 1.2);
        }
        if (k !== 'laser' || zoneAtS(s) !== SPACE) this.ui.power(k, this.pw[k] / POWER_TIME[k]);
      }
    }
    for (const k of ['izzi', 'pixel']) { const f = this.pets.frac(k); if (f > 0) this.ui.power(k, f); }
    // Space Pier: the mega laser switches itself on for the whole level
    const mega = zoneAtS(s) === SPACE && !this.warp;
    if (mega) {
      if (this.pw.laser <= 0) { this.ui.popup('Mega laser!', 'gold'); this.audio.megaUp(); }
      this.pw.laser = Math.max(this.pw.laser, 1.2); this.ui.power('laser', 0); this.ui.power('mega', 1);
    } else this.ui.power('mega', 0);
    this.updateInvaders(dt, fly, mega);
    this.updateSanta(dt, mega);
    this.robyn.setBlaster((this.pw.laser > 0 || this.invaders.active || this.santa.fighting) && !fly && !this.warp, mega, LASER_LV[this.laserLv || 1].size);
    this.updateLaser(dt, mega);
    if (this.pw.shield > 0) this.robyn.shield.material.uniforms.uA.value = this.pw.shield < 3 ? 0.55 + 0.45 * Math.sin(this.time * 14) : 1;
    if (hover && !fly) for (let i = 0; i < 2; i++) this.fx.emit({ x: P.x + rnd(0.25), y: P.y + 0.08, z: 0.5 + Math.random() * 0.5, vx: rnd(1.2), vy: 0.3 + Math.random() * 0.8, vz: 3 + Math.random() * 3, life: 0.3 + Math.random() * 0.25, size: 0.2, grow: 1.2, color: i ? 0x7ff6ff : 0xffffff, g: 1, a: 0.5, world: false });
    if (this.pw.gem > 0 && Math.random() < 0.3) this.fx.emit({ x: P.x + (Math.random() - 0.5) * 0.5, y: P.y + 0.4 + Math.random(), z: 0.2, vy: 0.5, life: 0.5, size: 0.12, color: 0xd58bff, g: 0 });

    // inside the warp tunnel: keep laying shells ahead, and leave at the far end
    if (this.warp) {
      const w = this.warp;
      while (w.nextS < Math.min(s + 110, w.end - 12)) w.nextS = this.warpPattern(w);
      for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = 4.5 + Math.random() * 2.6; this.fx.emit({ x: Math.cos(a) * r, y: 2.3 + Math.sin(a) * r, z: -(50 + Math.random() * 50), life: 1.6, size: 0.3, color: pickOf(FW_COLORS), g: 0, a: 0.9 }); }
      this.ui.power('warp', Math.max(0.001, (w.end - s) / w.len));
      if (s >= w.end) this.exitWarp();
    }

    // score and HUD
    this.score += this.speed * dt * this.mult * this.x2;
    this.combo = Math.max(0, this.combo - dt * 0.025);
    const lv = Math.floor(s / ZONE_LEN) - this.levelBase + 1, z = zoneAtS(s);
    if (lv !== this.level || z !== this.zone) {
      if (this.zone !== -1) {
        // a new level
        const bonus = 250 * lv * this.x2; this.score += bonus;
        this.ui.zone(`LEVEL ${lv} · ${zoneName(z)}`); this.ui.popup('Level bonus +' + fmt(bonus), 'gold'); this.audio.levelUp(); this.audio.sting(z); this.celebrate(2); this.gullT = 1.6 + Math.random() * 1.6;
      }
      this.level = lv; this.zone = z;
    }
    this.ui.score(this.score, run, this.level); this.ui.shells(this.shells); this.ui.mult(this.mult, this.combo, this.x2 > 1); this.ui.tide(this.tide, this.mode === 'dying' || this.mode === 'over' ? 0 : this.stumblesLeft());
    this.audio.setTempo(126 + diff * 26 + (this.warp || fly ? 10 : 0));
    this.audio.setTheme(this.warp ? 'warp' : fly ? 'rocket' : z);
    this.updateSounds(dt, z, fly, hover);
    if (P.grounded && this.speed > 18 && Math.random() < 0.25) this.fx.emit({ x: P.x + (Math.random() - 0.5) * 0.3, y: P.y + 0.05, z: 0.3, vx: (Math.random() - 0.5), vy: 0.6, life: 0.3, size: 0.14, grow: 1, color: 0xe9d9b8, g: 0, a: 0.4 });
  }

  // ---------- sounds of the run ----------
  // Footsteps, the creatures and machines coming up ahead, the pets, and each world's own background sounds.
  updateSounds(dt, z, fly, hover) {
    const A = this.audio, P = this.p, tr = this.track, s = this.dist, sky = this.sky.cur;
    // footsteps, in time with her run
    const foot = Math.floor(this.robyn.phase / Math.PI);
    if (foot !== this.foot) { this.foot = foot; if (P.grounded && !fly && !hover && !this.warp) A.footstep(STEP_SOUND[z]); }
    // things on the path make themselves heard as they come close
    for (const o of tr.obstacles) {
      if (o.heard || o.zap || o.s - s > 26 || o.s < s) continue;
      const m = o.mover;
      if (m && m.type === 'roll' && !m.on) continue;      // a roller sounds when it sets off
      o.heard = true;
      if (o.rat) A.squeak(o.name === 'ratBig' ? 3 : 2, o.name === 'ratBig' ? 0.8 : 1);
      else if (o.name === 'crab') A.crabClack();
      else if (o.name === 'penguin') A.penguin();
      else if (o.name === 'trolley') A.trolley();
      else if (o.name === 'toyTrain') A.toot();
      else if (o.name === 'gingerMan') A.giggle();
      else if (o.name === 'spinTop') A.topHum();
      else if (o.name === 'goat') A.bleat();
      else if (o.name === 'bumperCar') A.honk();
      else if (o.name === 'striker') A.ding();
      else if (o.name === 'runawayCar') { A.rumble(0.8); A.whee(0.7); }
      else if (o.name === 'springLow' || o.name === 'jackBox') A.twang();
      else if (o.name === 'rover') A.roverBeep();
      else if (m && m.type === 'roll' && !m.shot) A.rumble();
    }
    for (const u of tr.ufos) if (!u.heard && !u.zap && u.s - s < 62 && u.s > s) { u.heard = true; A.flyerNear(u.kind); }
    // Izzi and Pixel pipe up now and then
    if ((this.petT -= dt) < 0) {
      this.petT = 3.5 + Math.random() * 4;
      const iz = this.pets.has('izzi'), px = this.pets.has('pixel');
      if (iz && (!px || Math.random() < 0.5)) { if (Math.random() < 0.6) A.yip(); else A.pant(); }
      else if (px) { if (Math.random() < 0.5) A.mew(); else A.purr(); }
    }
    // background sounds of the place
    if ((this.gullT -= dt) < 0 && !this.warp) {
      this.gullT = 4.5 + Math.random() * 6;
      const r = Math.random();
      if (z === 8) { this.gullT = 1.2 + Math.random() * 2.6; if (r < 0.75) A.drip(); else if (r < 0.9) A.gurgle(); else A.squeak(2, 1.2); }
      else if (z === 6) { this.gullT = 2 + Math.random() * 4; if (r < 0.7) A.drip(); else A.squeak(3, 1.6); }
      else if (z === 9) A.blips();
      else if (z === 7) { if (r < 0.5) A.gust(); else A.chime(); }
      else if (z === 24) { this.gullT = 3.5 + Math.random() * 4; if (r < 0.35) A.munch(); else if (r < 0.7) A.tweet(); else A.giraffeHum(); }
      else if (z === 23) { this.gullT = 3.5 + Math.random() * 4; if (r < 0.3) A.whistle(true); else if (r < 0.6) A.whistle(false); else if (r < 0.8) A.wobble(); else A.gull(); }
      else if (z === 22) { this.gullT = 3.5 + Math.random() * 4; if (r < 0.35) A.whoop(); else if (r < 0.65) A.claps(); else if (r < 0.85) A.funkStab(); else A.twinkle(); }
      else if (z === 21) { this.gullT = 3 + Math.random() * 4; if (r < 0.35) A.blip(); else if (r < 0.6) A.bloop(); else if (r < 0.8) A.coin8(); else A.powerDown8(); }
      else if (z === 20) { this.gullT = 3 + Math.random() * 4; if (r < 0.35) A.hoot(); else if (r < 0.6) A.snore(); else if (r < 0.8) A.bleat(); else A.twinkle(); }
      else if (z === 19) { this.gullT = 3 + Math.random() * 4; if (r < 0.3) A.bingBong(); else if (r < 0.75) A.tock(); else A.chime(); }
      else if (z === 18) { this.gullT = 2.6 + Math.random() * 4; if (r < 0.45) A.twinkle(); else if (r < 0.8) A.glassTing(); else A.chime(); }
      else if (z === 17) { this.gullT = 2.8 + Math.random() * 4; if (r < 0.5) A.moo(); else if (r < 0.75) A.cowbell(); else if (r < 0.9) A.caw(); else A.gull(); }
      else if (z === 16) { this.gullT = 2.5 + Math.random() * 4; if (r < 0.6) A.glug(); else if (r < 0.8) A.crunch(); else A.gull(); }
      else if (z === 15) { this.gullT = 2.5 + Math.random() * 4; if (this.dive < 0.5) A.gull(); else if (r < 0.7) A.blub(); else if (r < 0.85) A.whaleSong(); else A.sonar(); }
      else if (z === 14) { this.gullT = 2.5 + Math.random() * 4; if (r < 0.35) A.whee(0.5); else if (r < 0.6) A.cheer(); else if (r < 0.8) A.organToot(); else A.gull(); }
      else if (z === 13) { this.gullT = 2.5 + Math.random() * 4; if (r < 0.5) A.cowbell(); else if (r < 0.75) A.gust(); else if (r < 0.9) A.bleat(); else A.eagle(); }
      else if (z === 12) { this.gullT = 2.5 + Math.random() * 4; if (r < 0.6) A.whirl(); else if (r < 0.8) A.chime(); else A.gull(); }
      else if (z === 11) { this.gullT = 2.5 + Math.random() * 4; if (r < 0.7) A.pop(); else A.gull(); }
      else if (z === 10) { this.gullT = 3 + Math.random() * 4; if (r < 0.6) A.jingle(3 + ((Math.random() * 3) | 0), 0.05); else A.chime(); }
      else if (z === 4) A.gust();
      else if (z === 3) { if (r < 0.5) A.organToot(); else A.cheer(); }
      else if (z === 2) { if (r < 0.35) A.horn(); else if (r < 0.7) A.buoy(); else A.gull(); }
      else if (sky.stars < 0.5 && sky.storm < 0.5) A.gull();
    }
  }

  // ---------- alien invaders ----------
  // A wave starts when Robyn reaches the stretch of coast the track set aside for it. While it is overhead she
  // shoots the invaders down by herself, whether or not she has a laser pickup.
  updateInvaders(dt, fly, mega) {
    const iv = this.invaders, tr = this.track, s = this.dist, P = this.p, busy = !!this.warp;      // she can shoot from the rocket too
    if (!iv.active && !this.santa.active && !busy) {
      const w = tr.waves.find((q) => !q.done && s >= q.s0 - 6 && s < q.s0 + 25);
      if (w && w.santa) { w.done = true; this.santa.begin(w); this.santaN = 0; this.santaT = 0.3; this.ui.popup('Grumpy Santa!', 'warn'); this.audio.santaArrive(); }
      else if (w) { w.done = true; iv.begin(w); this.invN = 0; this.invT = 0.5; this.ui.popup('Alien invaders!', 'warn'); this.audio.invArrive(); }
    }
    // a bomb from the formation: mark where it came from with a flash
    for (const o of tr.obstacles) { const m = o.mover; if (m && m.bomb && m.on && !m.flashed) { m.flashed = true; this.audio.invBomb(); for (let i = 0; i < 6; i++) this.fx.emit({ x: o.x + rnd(0.3), y: 6.5, z: -(o.s - s), vx: rnd(1.5), vy: -2 - Math.random() * 2, vz: rnd(1.5), life: 0.35, size: 0.24, color: i % 2 ? 0xff5ae0 : 0xffffff, g: 0 }); } }
    iv.update(dt, this.time, s, busy);
    if (!iv.active || busy) return;
    if ((this.invT -= dt) > 0) return;
    const a = iv.target(P.x), b = a && this.bolts.find((q) => !q.live);
    if (!b) return;
    a.aimed = true; this.invT = clamp(((iv.wave.s1 - iv.wave.s0) / Math.max(this.speed, 8)) * 0.036, 0.16, 0.3);      // paced to clear the wave a little past half way
    const L = LASER_LV[this.laserLv || 1];
    Object.assign(b, { live: true, inv: true, host: iv, target: a, ufo: false, x: P.x + 0.3, y: P.y + 1.05, z: -0.75, t: 0, mega });
    b.mesh.material.color.set(mega ? 0xff5ae0 : L.col); b.mesh.scale.set(mega ? 2.6 : 1.7, mega ? 2.6 : 1.7, mega ? 2.2 : 1.8);
    this.robyn.fire(); this.audio.zap(mega);
  }
  invaderZapped(a) {
    const pts = 60 * this.mult * this.x2; this.score += pts; this.invN++;
    this.audio.invPop(this.invN);
    const cols = [[0xa56bff, 0xffe27a, 0xffffff], [0x2fc7b0, 0xffb347, 0xffffff], [0xff8a3c, 0x8dff5a, 0xffffff]][a.r];
    for (let i = 0; i < 14; i++) { const an = Math.random() * 6.28, u = Math.random() * 3.14, sp = 2 + Math.random() * 4; this.fx.emit({ x: a.wx, y: a.wy, z: a.wz, vx: Math.cos(an) * Math.sin(u) * sp, vy: Math.cos(u) * sp + 1, vz: Math.sin(an) * Math.sin(u) * sp, life: 0.4 + Math.random() * 0.3, size: i % 3 ? 0.22 : 0.4, color: cols[i % 3], g: 3, world: false }); }
    this.invaders.hit(a);
  }

  // ---------- Grumpy Santa ----------
  // He turns up on Christmas Pier. Robyn zaps him by herself, laser pickup or not, until he cheers up.
  updateSanta(dt, mega) {
    const sa = this.santa, tr = this.track, s = this.dist, P = this.p, busy = !!this.warp;
    // the presents he lobs: he lines up over the next one, and flings his arm as it goes.
    // Any that are still waiting once he has cheered up or gone are quietly taken away.
    let next = null;
    for (const o of tr.obstacles) {
      const m = o.mover; if (!m || !m.santa || o.zap) continue;
      if (m.on) { if (!m.flashed) { m.flashed = true; if (sa.fighting) { sa.throwNow(); this.audio.santaThrow(); const h = sa.hand(); this.glitter(h.x, h.y, h.z, 8); } } }
      else if (m.wave.done && !(sa.active && (sa.state === 'in' || sa.fighting))) { o.zap = { t: 0 }; o.hit = true; }
      else if (!next || o.s < next.s) next = o;
    }
    if (!sa.active) { this.ui.power('santa', 0); return; }
    sa.update(dt, this.time, s, busy, P.x, next ? { x: next.x, d: next.s - s - next.mover.range } : null);
    this.ui.power('santa', sa.fighting ? Math.max(0.02, sa.hp / sa.max) : 0);
    if (!sa.fighting || busy) return;
    if ((this.santaT -= dt) > 0) return;
    const a = sa.target(), b = a && this.bolts.find((q) => !q.live);
    if (!b) return;
    const w = sa.wave;
    this.santaT = clamp((((w.s1 - w.s0) / Math.max(this.speed, 8)) * 0.6 - 1.6) / sa.max, 0.14, 0.45);      // paced so that he cheers up a little past half way
    const L = LASER_LV[this.laserLv || 1];
    Object.assign(b, { live: true, inv: true, host: sa, target: a, ufo: false, x: P.x + 0.3, y: P.y + 1.05, z: -0.75, t: 0, mega });
    b.mesh.material.color.set(mega ? 0xff5ae0 : L.col); b.mesh.scale.set(2.0, 2.0, 2.0);
    this.robyn.fire(); this.audio.zap(mega);
  }
  santaZapped(a) {
    const pts = 40 * this.mult * this.x2; this.score += pts; this.santaN++;
    this.audio.santaHit(this.santaN);
    this.glitter(a.wx + rnd(1.2), a.wy + rnd(1), a.wz + 0.5, 10);
    const left = this.santa.hp - 1;
    if (left === 9 || left === 4) { this.audio.santaOof(); if (left === 4) this.ui.popup('Nearly jolly!'); }
    this.santa.hit();
  }
  // a burst of Christmas glitter in the world ahead of Robyn
  glitter(x, y, z, n) {
    const cols = [0xffe27a, 0xff6f6f, 0xa6ff9a, 0xffffff];
    for (let i = 0; i < n; i++) { const an = Math.random() * 6.28, u = Math.random() * 3.14, sp = 2 + Math.random() * 5; this.fx.emit({ x, y, z, vx: Math.cos(an) * Math.sin(u) * sp, vy: Math.cos(u) * sp + 1.5, vz: Math.sin(an) * Math.sin(u) * sp, life: 0.45 + Math.random() * 0.35, size: i % 3 ? 0.26 : 0.5, color: cols[i % 4], g: 3, world: false }); }
  }

  // ---------- laser zapper ----------
  // Picks the nearest rat or UFO ahead and fires a bolt at it. UFOs are only in range once they have had time to shoot.
  updateLaser(dt, mega) {
    const tr = this.track, s = this.dist, P = this.p;
    // a UFO that has just loosed its shot
    for (const u of tr.ufos) if (!u.shot && !u.zap && u.ball.mover.on) {
      u.shot = true; u.recoil = 1; this.audio.attack(u.kind);
      const cols = FLYER[u.kind][1];
      for (let i = 0; i < 8; i++) this.fx.emit({ x: u.x + rnd(0.3), y: u.y - 0.5, z: -(u.s - s) + 0.6, vx: rnd(2), vy: -1 - Math.random() * 2, vz: rnd(2), life: 0.3, size: 0.22, color: cols[i % 2 ? 0 : 3], g: 0 });
    }
    this.zapPopT -= dt;
    if (this.pw.laser <= 0 || this.pw.rocket > 0 || this.warp) return;
    if ((this.laserT -= dt) > 0) return;
    let best = null, bd = 1e9;
    const L = LASER_LV[this.laserLv || 1], reach = mega ? 4 : L.reach;
    for (const o of tr.obstacles) { const dz = o.s - s; if (o.zappable && !o.zap && !o.flung && !o.aimed && dz > 1.5 && dz < 27 + reach && dz < bd) { best = o; bd = dz; } }
    for (const u of tr.ufos) { const dz = u.s - s; if (!u.zap && !u.aimed && dz > 1.5 && dz < 21 + reach && dz < bd) { best = u; bd = dz; } }
    if (!best) return;
    const b = this.bolts.find((q) => !q.live);
    if (!b) return;
    best.aimed = true; this.laserT = mega ? 0.14 : L.gap;
    Object.assign(b, { live: true, inv: false, target: best, ufo: best.ball !== undefined, x: P.x + 0.3, y: P.y + 1.05, z: -0.75, t: 0, mega });
    b.mesh.material.color.set(mega ? 0xff5ae0 : L.col); b.mesh.scale.set(mega ? 2.6 : 1.5, mega ? 2.6 : 1.5, mega ? 2.2 : 1.7);
    this.robyn.fire(); this.audio.zap(mega);
  }
  updateBolts(dt) {
    const s = this.dist;
    for (const b of this.bolts) {
      if (!b.live) continue;
      const tg = b.target; b.t += dt;
      if (b.inv) {
        // a shot at one of the invaders, which are placed in the world rather than on the track
        const dx = tg.wx - b.x, dy = tg.wy - b.y, dz = tg.wz - b.z, len = Math.hypot(dx, dy, dz), step = 70 * dt;
        if (this.mode !== 'run' || b.t > 1.2 || !tg.alive || b.host.flee) { b.live = false; b.mesh.visible = false; tg.aimed = false; continue; }
        if (len <= step + 0.6) { b.live = false; b.mesh.visible = false; if (tg.santa) this.santaZapped(tg); else this.invaderZapped(tg); continue; }
        b.x += (dx / len) * step; b.y += (dy / len) * step; b.z += (dz / len) * step;
        b.mesh.visible = true; b.mesh.position.set(b.x, b.y, b.z); b.mesh.lookAt(tg.wx, tg.wy, tg.wz);
        continue;
      }
      const gone = this.mode !== 'run' || b.t > 1.2 || tg.flung || tg.zap || (b.ufo ? !this.track.ufos.includes(tg) : !this.track.obstacles.includes(tg));
      if (gone) { b.live = false; b.mesh.visible = false; tg.aimed = false; continue; }
      const tx = tg.x, ty = b.ufo ? tg.mesh.position.y : tg.y + (tg.y ? 0 : tg.h * 0.55), tz = -(tg.s - s);
      const dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, len = Math.hypot(dx, dy, dz), step = 70 * dt;
      if (len <= step + 0.6) { b.live = false; b.mesh.visible = false; this.zapped(tg, b.ufo, tx, ty, tz); continue; }
      b.x += (dx / len) * step; b.y += (dy / len) * step; b.z += (dz / len) * step;
      b.mesh.visible = true; b.mesh.position.set(b.x, b.y, b.z); b.mesh.lookAt(tx, ty, tz);
    }
  }
  // A rat or a UFO hit by the laser vanishes in a harmless puff of sparkles.
  zapped(tg, ufo, x, y, z) {
    tg.zap = { t: 0, vx: rnd(5) }; tg.hit = true;
    if (ufo && !tg.ball.mover.on && !tg.ball.zap) tg.ball.zap = { t: 0 };      // it never got its shot off
    const pts = (ufo ? 120 : 40) * this.mult * this.x2; this.score += pts; this.addCombo(ufo ? 0.12 : 0.06);
    if (ufo) this.ui.popup(FLYER[tg.kind][0] + ' zapped! +' + fmt(pts), 'gold');
    this.audio.poof(ufo); if (ufo) this.audio.flyerDown(tg.kind); else if (tg.rat) this.audio.ratPop();
    const cols = ufo ? FLYER[tg.kind][1] : [0xffffff, 0xd6ffb0, 0xffe27a, 0xf2f2f2];
    for (let i = 0; i < (ufo ? 26 : 16); i++) { const a = Math.random() * 6.28, u = Math.random() * 3.14, sp = 2 + Math.random() * (ufo ? 6 : 3.5); this.fx.emit({ x, y, z, vx: Math.cos(a) * Math.sin(u) * sp, vy: Math.cos(u) * sp + 1.5, vz: Math.sin(a) * Math.sin(u) * sp, life: 0.45 + Math.random() * 0.3, size: i % 3 ? 0.2 : 0.42, grow: i % 3 ? 0 : 1.6, color: cols[i % 4], g: i % 3 ? 4 : -0.5, a: i % 3 ? 1 : 0.6 }); }
  }

  // ---------- rocket mode ----------
  startRocket() {
    const P = this.p, tr = this.track, s = this.dist;
    this.robyn.setRocket(true);
    P.grounded = false; P.vy = 0; P.blast = false; P.invuln = Math.max(P.invuln, 0.6); P.stumbleT = 0; this.tide = 0;
    this.audio.rocket(POWER_TIME.rocket); this.shake = 0.5;
    for (let i = 0; i < 20; i++) this.fx.emit({ x: P.x + rnd(0.4), y: P.y + 0.3, z: rnd(0.4), vx: rnd(3), vy: 1 + Math.random() * 2, vz: rnd(3), life: 0.6, size: 0.3, grow: 1.5, color: 0xf2f2f2, g: 0, a: 0.6 });
    // a trail of shells in the sky for the length of the flight
    this.shellTrail(s + 26, s + speedAt(s - tr.runStart) * ROCKET_SPEED * POWER_TIME.rocket - 18, null, P.lane, 2.7);
  }
  endRocket() {
    const P = this.p;
    this.robyn.setRocket(false);
    P.float = 2.6; P.invuln = 0.9; P.blast = true; P.vy = -1; P.airJumps = this.pw.boots > 0 ? 1 : 0;
    // the spent rocket goes off like the firework it is
    this.firework(P.x, P.y + 1.5, -6, pickOf(FW_COLORS), 30, 0.26, 0.9, 0.9);
  }
  // Robyn drops off the rocket and lands with a bang that clears the boardwalk just ahead of her.
  landBlast() {
    const P = this.p, s = this.dist, reach = this.speed * 1.5 + 8;
    P.blast = false; P.invuln = 1.3; P.float = Math.max(P.float, 1.5); this.shake = 0.8;
    for (const o of this.track.obstacles) if (!o.flung && !o.zap && o.s - s > -3 && o.s - s < reach) { o.hit = true; this.fling(o); }
    this.audio.blast(); this.ui.popup('Boom!', 'gold');
    for (let i = 0; i < 28; i++) { const a = (i / 28) * 6.28; this.fx.emit({ x: P.x + Math.cos(a) * 0.4, y: P.y + 0.15, z: Math.sin(a) * 0.4, vx: Math.cos(a) * 9, vy: 1.2, vz: Math.sin(a) * 9, life: 0.55, size: 0.34, grow: 1.4, color: i % 2 ? 0xfff3d6 : 0xffd27a, g: 2, drag: 2.5, a: 0.75 }); }
  }
  // A wandering line of shells from s0 to s1 at height y. Every twelfth one is a pearl.
  shellTrail(s0, s1, y, lane, step) {
    let l = lane, n = 0;
    for (let ss = s0; ss < s1; ss += step) {
      if (n > 0 && n % 6 === 0) { l = pickOf([l - 1, l + 1].filter((v) => v >= -1 && v <= 1)); ss += step * 1.7; if (ss >= s1) break; }
      this.track.addCoin(laneX(l), y ?? flyYAt(ss) + 0.9, ss, n % 12 === 11); n++;
    }
  }

  // ---------- warp tunnel ----------
  enterWarp() {
    const P = this.p, tr = this.track, s = this.dist;
    const end = (Math.floor(s / ZONE_LEN) + 1) * ZONE_LEN - 14;     // come out just before the next level's gateway
    this.warp = { end, len: end - s, nextS: s + 18, lane: P.lane, turn: Math.random() < 0.5 ? 1 : -1 };
    tr.genEnabled = false; tr.clearObjects(); tr.clearChunks();
    this.setWorld(false);
    this.tide = 0; P.stumbleT = 0; P.float = 1; this.shake = 0.6;
    this.ui.flash(); this.ui.popup('Star Tunnel!', 'gold'); this.audio.warp();
  }
  exitWarp() {
    const P = this.p;
    this.warp = null; this.ui.power('warp', 0);
    this.setWorld(true);
    this.track.resumeGen(this.dist, P.lane);
    P.invuln = 1.0; P.float = 1.5; this.shake = 0.5;
    this.ui.flash(); this.audio.warpOut();
  }
  // Lay the next group of shells in the tunnel and return where the group after it should start.
  warpPattern(w) {
    const tr = this.track, r = Math.random(), s0 = w.nextS;
    if (r < 0.55) {
      let l = w.lane, ss = s0;
      for (let seg = 0; seg < 3; seg++) {
        for (let i = 0; i < 4; i++) { tr.addCoin(laneX(l), 0.95, ss); ss += 2.8; }
        l = pickOf([l - 1, l + 1].filter((v) => v >= -1 && v <= 1)); ss += 6;
      }
      w.lane = l;
      return ss;
    }
    if (r < 0.8) {
      const len = this.speed * jumpTimeAt(this.dist - tr.runStart) * 0.9;
      tr.coinsArc(w.lane, s0 + len / 2, len);
      tr.addCoin(laneX(w.lane), 0.95 + JUMP_H * 0.82 + 0.8, s0 + len / 2, true);
      return s0 + len + 7;
    }
    for (let i = 0; i < 3; i++) for (const l of [-1, 0, 1]) tr.addCoin(laneX(l), 0.95, s0 + i * 3);
    return s0 + 17;
  }

  // ---------- letters, fireworks and weather ----------
  gotLetter(i, x, y) {
    this.got[i] = 1; this.audio.letter(i); this.sparkle(x, y, 0, 0x7ff3e8, 16);
    this.score += 100 * this.mult * this.x2; this.addCombo(0.2);
    if (this.got.every(Boolean)) {
      const bonus = 2500 * this.mult * this.x2; this.score += bonus;
      this.ui.popup('ROBYN! +' + fmt(bonus), 'gold'); this.ui.letters(this.got, true); this.audio.fanfare(); this.celebrate(5);
      this.pw.magnet = POWER_TIME.magnet; this.pw.gem = POWER_TIME.gem;
      this.wordT = 2.4; this.track.wantLetter = -1;
    } else {
      this.ui.letters(this.got);
      this.track.wantLetter = this.got.indexOf(0);
    }
  }
  firework(x, y, z, color, n = 30, size = 0.3, spread = 1, vol = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), sp = (6 + Math.random() * 5) * spread;
      this.fx.emit({ x, y, z, vx: Math.sin(b) * Math.cos(a) * sp, vy: Math.cos(b) * sp, vz: Math.sin(b) * Math.sin(a) * sp, life: 0.9 + Math.random() * 0.5, size, color: i % 5 ? color : 0xffffff, g: 2.5, drag: 1.8 });
    }
    this.audio.firework(vol);
  }
  // is one of the big shows on (invaders, Grumpy Santa, or a flying attacker close ahead)? Pets, planes and geese wait until it is over
  showOn() { const d = this.dist; return this.invaders.active || this.santa.active || this.track.ufos.some((u) => u.s - d > -5 && u.s - d < 70); }
  celebrate(n) { for (let i = 0; i < n; i++) this.firework(rnd(7), 5 + Math.random() * 5, -(12 + Math.random() * 18), pickOf(FW_COLORS), 26, 0.28, 0.9, i ? 0 : 0.8); }
  // Fireworks over the Midnight Funfair; lightning, thunder and sea spray at Storm Point.
  // Robyn has reached the top of a hill level.
  summit(zone) {
    const pts = (zone === MOUNTAIN ? 500 : 250) * this.x2; this.score += pts;
    this.ui.popup((zone === MOUNTAIN ? 'Top of the mountain! +' : 'Wheee! +') + pts, 'gold');
    if (zone === MOUNTAIN) this.audio.yodel(); else this.audio.whee();
  }

  ambience(dt) {
    if (this.warp || (this.mode !== 'run' && this.mode !== 'title')) return;
    const c = this.sky.cur;
    if (c.fun > 0.5) {
      this.fwT -= dt;
      if (this.fwT <= 0) {
        this.fwT = 0.5 + Math.random() * 1.4;
        this.firework((Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 34), 15 + Math.random() * 17, -(45 + Math.random() * 80), pickOf(FW_COLORS), 30, 0.8, 2.2, 0.22);
      }
    }
    if (c.storm > 0.5) {
      this.boltT -= dt;
      if (this.boltT <= 0) { this.boltT = 3.5 + Math.random() * 6; this.sky.strike(); this.audio.thunder(0.2 + Math.random() * 0.5); }
      this.sprayT -= dt;
      if (this.sprayT <= 0) {
        // a wave breaks over the seaward rail
        this.sprayT = 0.45 + Math.random() * 1.0;
        const z = -(8 + Math.random() * 44);
        for (let i = 0; i < 18; i++) this.fx.emit({ x: -5.4 - Math.random() * 1.6, y: -1.2, z: z + rnd(1.6), vx: 1 + Math.random() * 2.6, vy: 7 + Math.random() * 6, vz: rnd(1.5), life: 0.95, size: 0.3 + Math.random() * 0.25, color: 0xffffff, g: 15, a: 0.8 });
      }
    }
  }

  // Robyn has run or stepped into something solid that is too high to step onto.
  wall(prevX, s, f) {
    const P = this.p, lateral = this.track.floorAt(prevX, s) - P.y <= 0.5;
    if (lateral) {
      P.x = prevX; const t = P.lane; P.lane = P.fromLane; P.fromLane = t;
      this.stumble();
      return this.mode !== 'run';
    }
    // head-on into the front of a platform: she scrambles up onto it, and it counts as a stumble
    const safe = this.guarded || P.invuln > 0;
    if (this.guarded && P.invuln <= 0) this.popGuard();
    else if (!safe) { this.stumble('crash'); if (this.mode !== 'run') return true; }
    P.y = f; P.vy = 0; P.grounded = true;
    return false;
  }

  onPass(o) {
    if (o.hit) return;
    if (o.close) { this.score += 50 * this.mult * this.x2; this.addCombo(0.3); this.ui.popup('Close call! +' + 50 * this.mult * this.x2); this.audio.nearMiss(); }
    else if (o.kind === 'low' && o.cleared) { this.score += 15 * this.mult * this.x2; this.addCombo(0.1); }
  }

  updateDying(dt) {
    const d = this.dy, P = this.p, rb = this.robyn; d.t += dt;
    this.speed = damp(this.speed, 0, d.cause === 'hole' ? 4 : 10, dt);
    this.dist += this.speed * dt;
    if (d.cause === 'hole') {
      P.vy -= 30 * dt; P.y += P.vy * dt;
      rb.root.position.set(P.x, P.y, 0);
      rb.update(dt, { mode: 'fall', speed: 0, vy: P.vy, vx: 0, grounded: false });
      if (P.y < WATER_Y && !d.splashed) {
        d.splashed = true; rb.root.visible = false; this.audio.splash();
        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random(); this.fx.emit({ x: P.x + Math.cos(a) * r * 0.5, y: WATER_Y + 0.2, z: Math.sin(a) * r * 0.5, vx: Math.cos(a) * 3 * r, vy: 5 + Math.random() * 6, vz: Math.sin(a) * 3 * r, life: 0.9, size: 0.2 + Math.random() * 0.2, color: 0xffffff, g: 14 }); }
      }
    } else {
      const dir = d.cause === 'crash' ? 1 : -1;
      d.vy -= 28 * dt; P.y = Math.max(Math.max(0, this.track.floorAt(P.x, this.dist)), P.y + d.vy * dt);
      d.back = Math.min(1, d.back + dt * 3.5);
      rb.root.position.set(P.x, P.y + Math.sin(d.back * Math.PI) * 0.15, dir > 0 ? smooth(d.back) * 1.3 : -smooth(d.back) * 0.8);
      rb.root.rotation.x = dir * smooth(d.back) * 1.42;
      rb.update(dt, { mode: 'crash', speed: 0, vy: 0, vx: 0, grounded: true });
    }
    if (d.t > 0.8 && !d.washed) { d.washed = true; this.ui.wash('on'); }
    if (d.t > 1.75) this.finish();
  }

  updateCamera(dt) {
    const P = this.p, cam = this.camera, t = this.time;
    const run = this.dist - this.track.runStart, diff = this.mode === 'title' ? 0 : diffAt(run);
    const back = this.camBack || 1;
    // title: a slow orbit in front of Robyn. In play: a chase camera that swings round behind her.
    const k = smooth(this.camT);
    const ang = lerp(0.62 + Math.sin(t * 0.35) * 0.22, Math.PI, k);
    const tideK = this.mode === 'run' || this.mode === 'dying' || this.mode === 'over' ? smooth(this.tide) : 0;
    const rad = lerp(4.9 * Math.pow(60 / this.baseFov, 1.1), (6.3 + tideK * 2.3) * back, k), hgt = lerp(1.7, (3.45 + tideK * 1.0) * (0.75 + back * 0.25) + P.y * 0.42 + this.flyK * 3.0, k);
    const tx = P.x * lerp(1, 0.58, k);
    const want = this._v || (this._v = new THREE.Vector3());
    want.set(tx + Math.sin(ang) * rad, hgt, -Math.cos(ang) * rad);
    if (this.mode === 'over') { const a = Math.PI - 0.5 + Math.sin(t * 0.25) * 0.25; want.set(P.x * 0.5 + Math.sin(a) * 7.5 * back, 4.4, -Math.cos(a) * 7.5 * back); }
    const slope = (this.slope || 0) * k;      // on a hill the camera rides the slope: it sits lower going up, higher coming down, and looks along the road
    want.y -= slope * rad * 0.55;
    if (k > 0.5 && (zoneAtS(this.dist + 10) === DEEP || zoneAtS(this.dist - 8) === DEEP)) want.y = Math.min(want.y, 5.5);     // stay under the roof of the Glass Tunnel
    this.camPos.lerp(want, 1 - Math.exp(-(this.mode === 'over' ? 1.5 : 9) * dt));
    const look = this._l || (this._l = new THREE.Vector3());
    look.set(P.x * lerp(1, 0.78, k), lerp(1.32, 1.25 + P.y * 0.5 + this.flyK * 1.6, k), lerp(0, -7.5, k));
    look.y += slope * 7.5 * 0.8;
    this.camLook.lerp(look, 1 - Math.exp(-10 * dt));
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const sh = this.shake * this.shake * 0.35;
    cam.position.set(this.camPos.x + (Math.random() - 0.5) * sh, this.camPos.y + (Math.random() - 0.5) * sh, this.camPos.z);
    cam.lookAt(this.camLook);
    if (this.warp) this.tunnel.face(cam);
    if (this.lean) cam.rotateZ(this.lean);
    if (this.debugCam) { cam.position.fromArray(this.debugCam.pos); cam.lookAt(new THREE.Vector3().fromArray(this.debugCam.look)); }
    const fov = this.baseFov + (this.mode === 'run' ? diff * 9 + (this.pw.gem > 0 ? 1 : 0) + (this.warp || this.pw.rocket > 0 ? 7 : 0) + Math.max(0, -(this.slope || 0)) * 22 : 0) * (this.baseFov > 75 ? 0.4 : 1);
    if (Math.abs(fov - cam.fov) > 0.05) { cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-3 * dt)); cam.updateProjectionMatrix(); }
  }

  // ---------- auto-play, used for testing that the obstacle patterns are fair ----------
  botStep() {
    const P = this.p, tr = this.track, s = this.dist, v = this.speed, jt = jumpTimeAt(s - tr.runStart);
    const row = tr.rows.find((r) => r.s > s - 0.5);
    let want = row ? row.safe : P.lane;
    if (this.botWarp) { const po = tr.portals.find((p) => !p.used && p.s > s); if (po && !tr.rows.some((r) => r.type !== 'portal' && r.s > s - 0.5 && r.s < po.s)) want = po.lane; }
    if (want !== P.lane && Math.abs(P.x - laneX(P.lane)) < 0.3) {
      const nl = P.lane + Math.sign(want - P.lane), nx = laneX(nl);
      let blocked = tr.floorAt(nx, s) - P.y > 0.4 || tr.floorAt(nx, s + 1) - P.y > 0.4;
      for (const o of tr.obstacles) if (!o.zap && (!o.mover || o.mover.type === 'roll') && Math.abs(o.x - nx) < 1.0 && Math.abs(o.s - s) < o.d / 2 + 1.4 && P.y < o.h - 0.1) blocked = true;
      if (!blocked) this.move(Math.sign(want - P.lane));
    }
    if (P.grounded) {
      let need = false;
      for (const o of tr.obstacles) {
        if (o.kind !== 'low' || o.flung || o.zap) continue;
        const closing = v + (o.mover && o.mover.type === 'roll' && o.mover.on ? o.mover.v : 0);
        const tc = (o.s - s) / closing;
        const xc = o.mover && o.mover.type === 'cross' ? true : Math.abs(o.x - P.x) < o.w / 2 + 0.55 || Math.abs(o.x - laneX(P.lane)) < o.w / 2 + 0.55;
        if (xc && tc > 0 && tc < jt * 0.5) need = true;
      }
      for (const h of tr.holes) { const tc = ((h.s0 + h.s1) / 2 - s) / v; if (tc > 0 && tc < jt * 0.5 && tr.floorAt(laneX(P.lane), (h.s0 + h.s1) / 2) < -1) need = true; }
      if (need) this.jump();
    }
  }
  // Begin a run part-way along the coast (testing only).
  startAt(dist, force) {
    this.restart(); this.track.reset(); this.dist = dist; this.resetPlayer(); this.track.force = force;
    this.track.startRun(dist); this.track.noGapBefore = 0; this.track.update(dist, 0, 99);
  }
  // Run the simulation without drawing (testing only).
  simulate(seconds, step = 1 / 60) {
    let n = Math.round(seconds / step);
    while (n-- > 0 && this.mode === 'run') this.update(step);
    return { mode: this.mode, dist: this.dist - this.track.runStart, cause: this.dy && this.dy.cause, score: Math.floor(this.score) };
  }
}

// When the game is on a real web host (not inside another page), register the service worker so that it can be
// installed to the home screen and still opens without a connection.
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* fine without it */ }); });
}

async function boot() {
  try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('40px "Lilita One"'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* use fallback font */ }
  try {
    window.__game = new Game();
    window.__game.THREE = THREE;      // for the scripts that render the app icon and test models
  } catch (err) {
    console.error(err);
    const el = document.getElementById('loading');
    el.hidden = false; el.classList.remove('done');
    el.innerHTML = '<span style="animation:none;max-width:80vw;text-align:center;font-size:20px">Tide Rush needs WebGL to run. Try a newer browser or turn on hardware acceleration.</span>';
  }
}
boot();

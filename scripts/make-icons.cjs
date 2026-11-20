// Draws the app icon: a 3D portrait of Robyn from the game over a painted sunrise and wave, saved at every size
// the manifest and iPad need. Not part of the normal build. To redo the icons:
//   npm run build && npx vite preview --port 4173 &      then      node scripts/make-icons.cjs
// It needs Playwright (npm i -D playwright), which is not otherwise a dependency of the game.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const out = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const sizes = { 'icon-1024.png': 1024, 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180, 'apple-touch-icon-167.png': 167, 'apple-touch-icon-152.png': 152, 'favicon-64.png': 64 };
  const images = await page.evaluate(async (sizes) => {
    const g = window.__game, T = g.THREE, S = 1024;
    // ---- the 3D part: Robyn's head and shoulders, lit from the front ----
    const r = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(S, S); r.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    g.robyn.update(0.016, { mode: 'idle', speed: 0, vy: 0, vx: 0, grounded: true, stumble: 0 });
    const robyn = g.robyn.root.clone(true); robyn.position.set(0, 0, 0); robyn.rotation.set(0, 0.4, 0); scene.add(robyn);      // turned a little so that her ponytail shows
    scene.add(new T.HemisphereLight(0xffffff, 0xffc9a0, 1.25));
    const sun = new T.DirectionalLight(0xfff1d6, 1.9); sun.position.set(-2.5, 3.5, -4); scene.add(sun);
    const rim = new T.DirectionalLight(0x9fe8ff, 0.9); rim.position.set(3, 2, 3); scene.add(rim);
    const box = new T.Box3().setFromObject(robyn), top = box.max.y;
    const cam = new T.PerspectiveCamera(26, 1, 0.1, 50);
    cam.position.set(0.1, top - 0.28, -2.6); cam.lookAt(-0.04, top - 0.42, 0);
    r.render(scene, cam);
    // ---- the painted part ----
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, S); sky.addColorStop(0, '#ffd166'); sky.addColorStop(0.38, '#ff9f6b'); sky.addColorStop(0.62, '#ff7a8a'); sky.addColorStop(1, '#c95fa8');
    x.fillStyle = sky; x.fillRect(0, 0, S, S);
    // sun with soft rays
    const sg = x.createRadialGradient(760, 300, 20, 760, 300, 520); sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.2, 'rgba(255,240,180,0.75)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    x.fillStyle = sg; x.fillRect(0, 0, S, S);
    x.fillStyle = '#fffbe6'; x.beginPath(); x.arc(760, 300, 120, 0, 7); x.fill();
    x.save(); x.translate(760, 300); x.globalAlpha = 0.16; x.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.beginPath(); x.moveTo(0, 0); x.lineTo(-46, -900); x.lineTo(46, -900); x.closePath(); x.fill(); }
    x.restore();
    // the sea
    const sea = x.createLinearGradient(0, 600, 0, S); sea.addColorStop(0, '#2fd0c8'); sea.addColorStop(1, '#12629a');
    x.fillStyle = sea; x.beginPath(); x.moveTo(0, 640);
    for (let i = 0; i <= 16; i++) x.quadraticCurveTo(i * 64 - 32, 640 + (i % 2 ? -18 : 18), i * 64, 640);
    x.lineTo(S, S); x.lineTo(0, S); x.closePath(); x.fill();
    // the great curling wave that chases her, rising on the left
    const wave = (ox, oy, k, body, foam) => {
      x.save(); x.translate(ox, oy); x.scale(k, k);
      const wg = x.createLinearGradient(0, -520, 0, 300); wg.addColorStop(0, body[0]); wg.addColorStop(1, body[1]);
      x.fillStyle = wg; x.beginPath(); x.moveTo(-260, 420); x.bezierCurveTo(-240, -40, -120, -470, 210, -520); x.bezierCurveTo(430, -545, 560, -400, 520, -250);
      x.bezierCurveTo(505, -330, 420, -400, 320, -372); x.bezierCurveTo(140, -322, 150, -30, 330, 190); x.lineTo(470, 420); x.closePath(); x.fill();
      // foam along the crest and the curl
      x.fillStyle = foam;
      for (const [fx, fy, fr] of [[210, -520, 46], [290, -532, 50], [370, -520, 54], [440, -486, 52], [492, -430, 46], [522, -366, 40], [528, -300, 34], [516, -246, 28], [130, -500, 42], [60, -462, 40], [0, -410, 38], [-50, -350, 36], [-95, -280, 34], [-130, -205, 32]]) { x.beginPath(); x.arc(fx, fy, fr, 0, 7); x.fill(); }
      x.globalAlpha = 0.35; x.strokeStyle = '#ffffff'; x.lineWidth = 14; x.lineCap = 'round';
      for (const [a, b2, c2, d] of [[-150, 200, -60, -260], [-60, 240, 40, -200], [40, 270, 110, -90]]) { x.beginPath(); x.moveTo(a, b2); x.quadraticCurveTo(a - 30, (b2 + d) / 2, c2, d); x.stroke(); }
      x.restore();
    };
    wave(150, 700, 1.05, ['#3fe0d0', '#1478b0'], '#ffffff');
    // Robyn on top
    x.drawImage(r.domElement, 20, 60, S, S);
    // foam and spray in front, along the bottom edge
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 13; i++) { x.beginPath(); x.arc(i * 86 - 10, S + 18 - (i % 3) * 14, 70 + (i % 2) * 16, 0, 7); x.fill(); }
    x.globalAlpha = 0.9;
    for (const [fx, fy, fr] of [[120, 250, 16], [70, 330, 11], [200, 180, 12], [905, 720, 14], [950, 640, 9], [860, 800, 10], [300, 120, 9]]) { x.beginPath(); x.arc(fx, fy, fr, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    const res = {};
    for (const [name, size] of Object.entries(sizes)) { const d = document.createElement('canvas'); d.width = d.height = size; const dx = d.getContext('2d'); dx.imageSmoothingQuality = 'high'; dx.drawImage(c, 0, 0, size, size); res[name] = d.toDataURL('image/png'); }
    return res;
  }, sizes);
  for (const [name, url] of Object.entries(images)) fs.writeFileSync(path.join(out, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', Object.keys(images).join(', '));
  await browser.close();
})();

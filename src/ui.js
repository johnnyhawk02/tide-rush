// DOM overlay: HUD, menus and pop-up messages.
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('en-GB');

const SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 8.500a5 5 0 0 1 0 7M18.500 6a8.500 8.500 0 0 1 0 12" fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.500 9.500l5 5M21.500 9.500l-5 5" fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round"/></svg>';
const POWER = { magnet: ['M', '#ff7a7a', 'Shell magnet'], shield: ['S', '#6fe6ff', 'Bubble shield'], boots: ['B', '#7dff8a', 'Spring boots'], gem: ['2', '#d58bff', 'Double score'], rocket: ['R', '#ffa24a', 'Rocket ride'], board: ['H', '#3fe8dc', 'Hoverboard'], warp: ['W', '#c79bff', 'Warp tunnel'], laser: ['L', '#6ff6ff', 'Laser zapper'], mega: ['L', '#ff6ad8', 'Mega laser'], izzi: ['I', '#ffe9b8', 'Izzi rounds up shells'], pixel: ['P', '#b8f08a', 'Pixel: double shells'], santa: ['S', '#ff5a5a', "Santa's grumpiness"] };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  constructor(on) {
    this.on = on; this.last = {}; this.chips = {};
    const tap = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); fn(); });
    tap('startBtn', on.start); tap('pauseBtn', on.pause); tap('resumeBtn', on.resume); tap('restartBtn', on.restart);
    tap('againBtn', on.restart); tap('homeBtn', on.home); tap('soundBtn', on.mute); tap('soundBtn2', on.mute);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    $('hints').innerHTML = coarse
      ? '<span>Swipe left or right to change lane</span><span>Swipe up or tap to jump</span><span>Spell ROBYN for a bonus</span>'
      : '<span><kbd>←</kbd><kbd>→</kbd> change lane</span><span><kbd>↑</kbd> or <kbd>Space</kbd> jump</span><span><kbd>Esc</kbd> pause</span>';
    this.letterEls = [...$('letters').children];
  }
  // Outfit picker on the title screen. list: [{ name, need, coat, hat, boot }], bank: lifetime shells.
  outfits(list, selected, bank) {
    const row = $('outfits'); row.innerHTML = '';
    list.forEach((o, i) => {
      const b = document.createElement('button'), locked = o.need > bank;
      b.className = 'swatch' + (i === selected ? ' sel' : '') + (locked ? ' locked' : '');
      b.style.setProperty('--k', hex(o.coat)); b.style.setProperty('--h', hex(o.hat)); b.style.setProperty('--b', hex(o.boot));
      b.setAttribute('aria-label', o.name + (locked ? ', locked' : '')); b.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (locked) $('outfitNote').textContent = `${o.name}: collect ${fmt(o.need - bank)} more shells to unlock`;
        else this.on.outfit(i);
      });
      row.appendChild(b);
    });
    const next = list.find((o) => o.need > bank);
    $('outfitNote').textContent = `${list[selected].name} outfit · ${fmt(bank)} shells collected` + (next ? ` · next at ${fmt(next.need)}` : '');
  }
  loaded() { $('loading').classList.add('done'); setTimeout(() => { $('loading').hidden = true; }, 700); }
  fatal(msg) { $('loading').classList.remove('done'); $('loading').hidden = false; $('loading').innerHTML = `<span style="animation:none;max-width:80vw;text-align:center">${msg}</span>`; }
  setSound(muted) { $('soundBtn').innerHTML = $('soundBtn2').innerHTML = muted ? SOUND_OFF : SOUND_ON; }
  show(name, best) {
    for (const id of ['title', 'pause', 'over']) $(id).hidden = id !== name;
    $('hud').hidden = !(name === 'hud' || name === 'pause');
    if (name === 'title') { $('bestLine').hidden = !(best > 0); $('bestVal').textContent = fmt(best || 0); }
  }
  resetHud() {
    this.last = {}; this.chips = {}; $('powers').innerHTML = ''; $('popups').innerHTML = ''; this.popQ = []; this.popBusy = false; clearTimeout(this.popTimer);
    this.score(0, 0, 1); this.shells(0); this.mult(1, 0, false); this.tide(0, 5); this.letters([0, 0, 0, 0, 0]);
  }
  score(score, dist, level) {
    const s = Math.floor(score), d = Math.floor(dist);
    if (s !== this.last.s) { $('score').textContent = fmt(s); this.last.s = s; }
    if (d !== this.last.d || level !== this.last.lv) { $('dist').textContent = `Level ${level} · ${fmt(d)} m`; this.last.d = d; this.last.lv = level; }
  }
  letters(got, done) {
    this.letterEls.forEach((el, i) => el.classList.toggle('on', !!got[i]));
    $('letters').classList.toggle('done', !!done);
  }
  flash() { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  shells(n) { if (n !== this.last.sh) { $('shells').textContent = fmt(n); this.last.sh = n; } }
  mult(level, progress, x2) {
    const el = $('mult'), shown = level * (x2 ? 2 : 1);
    if (shown !== this.last.m) {
      $('multv').textContent = 'x' + shown;
      if (this.last.m !== undefined && shown > this.last.m) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 180); }
      this.last.m = shown;
    }
    el.classList.toggle('x2', !!x2);
    const p = Math.round(progress * 50) / 50;
    if (p !== this.last.p) { el.style.setProperty('--p', p); this.last.p = p; }
  }
  power(type, frac) {
    let c = this.chips[type];
    if (frac <= 0) { if (c) { c.remove(); delete this.chips[type]; } return; }
    if (!c) {
      const [letter, col, label] = POWER[type];
      c = document.createElement('div'); c.className = 'chip pill' + (type === 'rocket' || type === 'warp' ? ' hot' : ''); c.style.setProperty('--c', col);
      c.innerHTML = `<b>${letter}</b><span>${label}</span><i><u></u></i>`;
      $('powers').appendChild(c); this.chips[type] = c;
    }
    c.querySelector('u').style.transform = `scaleX(${Math.max(0, Math.min(1, frac)).toFixed(3)})`;
  }
  // v: how close the tide is (0..1); left: how many more stumbles Robyn can take, shown as hearts
  tide(v, left) {
    if (left !== this.last.lives) {
      const box = $('lives');
      [...box.children].forEach((el, i) => el.classList.toggle('lost', i >= left));
      box.classList.toggle('low', left <= 1);
      if (this.last.lives !== undefined && left < this.last.lives) { box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit'); }
      this.last.lives = left;
    }
    const st = left === 0 ? 2 : v > 0.04 ? 1 : 0;
    if (st !== this.last.t) {
      const e = $('tide'); e.classList.toggle('on', st === 2); e.classList.toggle('near', st === 1);
      if (st) e.querySelector('span').textContent = st === 2 ? 'The tide is right behind you!' : 'The tide is closing in';
      this.last.t = st;
    }
    if (v > 0) $('tidebar').style.transform = `scaleX(${v.toFixed(2)})`;
  }
  // One message at a time, so that they never pile up or sit on top of each other: a message that arrives while
  // another is showing waits its turn (a warning jumps the queue, and a third message waiting pushes out the oldest).
  popup(text, cls = '') {
    const q = this.popQ || (this.popQ = []), box = $('popups');
    if (this.popBusy && cls !== 'warn') { if (q.length >= 2) q.shift(); q.push([text, cls]); return; }
    if (cls === 'warn') box.innerHTML = '';
    const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = text;
    box.appendChild(el); setTimeout(() => el.remove(), 1150);
    this.popBusy = true; clearTimeout(this.popTimer);
    this.popTimer = setTimeout(() => { this.popBusy = false; const n = q.shift(); if (n) this.popup(n[0], n[1]); }, 950);
  }
  zone(name) { const el = $('zone'); el.textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  wash(state) { const w = $('wash'); w.classList.toggle('on', state === 'on'); w.classList.toggle('dim', state === 'dim'); }
  over(o) {
    $('overTitle').textContent = o.title; $('overSub').textContent = o.sub;
    $('overScore').textContent = fmt(o.score); $('stLevel').textContent = o.level; $('stDist').textContent = fmt(o.dist); $('stShells').textContent = fmt(o.shells); $('stMult').textContent = 'x' + o.mult;
    $('newBest').hidden = !o.newBest;
    this.show('over');
  }
}

// All sound is synthesised live with the Web Audio API: original tunes (see music.js) plus effects. No audio files.
import { THEMES } from './music.js';
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

export class GameAudio {
  constructor() {
    this.ctx = null; this.muted = false; this.intensity = 0; this.tempo = 126;
    this.step = 0; this.nextT = 0; this.timer = null; this.lastCoin = 0; this.coinStreak = 0;
    this.theme = THEMES[0]; this.next = null; this.prevLead = 0; this.lastStep = 0;
    try { this.muted = localStorage.getItem('tiderush.muted') === '1'; } catch (e) { /* storage may be blocked */ }
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      this.music = c.createGain(); this.music.gain.value = 0.5;
      this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000;
      this.music.connect(this.musicLP); this.musicLP.connect(this.master);
      this.sfx = c.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
      const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      // sea ambience
      const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const ag = c.createGain(); ag.gain.value = 0.05;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.14; const lg = c.createGain(); lg.gain.value = 0.035;
      lfo.connect(lg); lg.connect(ag.gain); n.connect(lp); lp.connect(ag); this.sea = c.createGain(); ag.connect(this.sea); this.sea.connect(this.master); n.start(); lfo.start();
      this.nextT = c.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 30);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('tiderush.muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }
  // 0 = title (soft), 1 = full band
  setIntensity(v) { this.intensity = v; }
  setTempo(bpm) { this.tempo = bpm; }
  // the sea fades out underground and in space
  setSea(v) { if (this.sea && Math.abs(v - (this.seaV ?? 1)) > 0.02) { this.seaV = v; this.sea.gain.setTargetAtTime(Math.max(0.0001, v), this.ctx.currentTime, 0.3); } }
  muffle(on) { if (this.musicLP) this.musicLP.frequency.setTargetAtTime(on ? 500 : 18000, this.ctx.currentTime, on ? 0.25 : 0.4); }

  // ---------- music ----------
  // Change tune: a world id (0 to 9), 'warp' or 'rocket'. The new tune comes in on the next beat.
  setTheme(id) {
    const T = THEMES[id] || THEMES[0];
    if (T === this.theme) { this.next = null; return; }
    this.next = T;
  }
  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    if (this.nextT < c.currentTime - 0.3) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.14) {
      if (this.next && this.step % 4 === 0) { this.theme = this.next; this.next = null; this.step = 0; this.prevLead = 0; this.music.gain.setTargetAtTime(0.5 * (this.theme.gain || 1), this.nextT, 0.05); }
      const T = this.theme, sd = 60 / (this.tempo * T.tempo) / 4, s = this.step % T.len;
      // swing pushes the off-beat notes late, for a shuffle
      const sw = T.swing ? (s % 4 === 2 ? T.swing : s % 4 === 3 ? T.swing * 0.5 : 0) * sd : 0;
      this.playStep(this.step, this.nextT + sw, sd);
      this.nextT += sd; this.step = (this.step + 1) % (T.len * T.bars.length * 2);
    }
  }
  tone(type, f, t, dur, vol, dest, o = {}) {
    vol = Math.max(vol, 0.0002);
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.from) { osc.frequency.setValueAtTime(o.from, t); osc.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.09, dur * 0.5)); }
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    if (o.det) osc.detune.value = o.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.att || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); osc.connect(f2); node = f2; }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibHz || 5.5; lg.gain.value = f * (o.vib === true ? 0.007 : o.vib); l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    node.connect(g); g.connect(dest || this.sfx);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  noise(t, dur, vol, o = {}) {
    vol = Math.max(vol, 0.0002);
    const c = this.ctx, n = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    n.buffer = this.noiseBuf; n.loop = true;
    f.type = o.type || 'highpass'; f.frequency.setValueAtTime(o.f || 6000, t); if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.att || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
  }
  // the lead instruments: each world's tune has its own voice
  leadNote(v, n, t, dur, k, m) {
    const f = midi(n);
    switch (v) {
      case 'piccolo': this.tone('triangle', f, t, dur, 0.085 * k, m, { vib: dur > 0.3, att: 0.015 }); this.tone('sine', f * 2, t, dur, 0.035 * k, m, { att: 0.015 }); this.tone('square', f, t, Math.min(dur, 0.08), 0.03 * k, m, { lp: 5000 }); break;
      case 'accordion': for (const d of [-8, 8]) this.tone('sawtooth', f, t, dur, 0.04 * k, m, { lp: 2600, att: 0.02, det: d }); this.tone('square', f * 2, t, dur, 0.012 * k, m, { lp: 3200, att: 0.02 }); break;
      case 'organ': this.tone('square', f, t, dur, 0.04 * k, m, { lp: 2400, att: 0.012 }); this.tone('sine', f * 2, t, dur, 0.045 * k, m, { att: 0.012 }); this.tone('sine', f * 3, t, dur, 0.016 * k, m, { att: 0.012, vib: 0.004 }); break;
      case 'brass': this.tone('sawtooth', f, t, dur, 0.075 * k, m, { lp: 1100, lpTo: 3600, att: 0.025, vib: dur > 0.5 }); this.tone('square', f / 2, t, dur, 0.022 * k, m, { lp: 1400, att: 0.025 }); break;
      case 'pan': { const d = Math.min(dur + 0.12, 0.42); this.tone('sine', f, t, d, 0.11 * k, m); this.tone('sine', f * 2, t, d * 0.6, 0.05 * k, m); this.tone('triangle', f * 3, t, 0.07, 0.03 * k, m); break; }
      case 'pluck': this.tone('sine', f, t, Math.min(dur + 0.1, 0.34), 0.12 * k, m); this.tone('triangle', f * 2, t, 0.07, 0.05 * k, m); break;
      case 'bell': this.tone('sine', f, t, 0.55, 0.085 * k, m); this.tone('sine', f * 2, t, 0.4, 0.04 * k, m); this.tone('sine', f * 4.2, t, 0.12, 0.014 * k, m); break;
      case 'clarinet': this.tone('square', f, t, dur * 0.62, 0.05 * k, m, { lp: 1300, att: 0.02 }); this.tone('triangle', f, t, dur * 0.62, 0.07 * k, m, { att: 0.02 }); break;
      case 'theremin': this.tone('sine', f, t, dur, 0.1 * k, m, { att: 0.05, vib: 0.011, vibHz: 6, from: this.prevLead || 0 }); this.tone('triangle', f * 2, t, dur, 0.012 * k, m, { att: 0.08 }); break;
      default: this.tone('square', f, t, dur, 0.055 * k, m, { lp: 4200, vib: dur > 0.42, att: 0.012 }); this.tone('triangle', f, t, dur, 0.07 * k, m, { att: 0.012 });
    }
  }
  bassNote(v, n, t, sd, full, m) {
    const f = midi(n);
    switch (v) {
      case 'tuba': this.tone('triangle', f, t, sd * 2.6, full ? 0.34 : 0.2, m, { lp: 700, att: 0.014 }); this.tone('sine', f, t, sd * 2.2, 0.14, m); break;
      case 'pizz': this.tone('triangle', f, t, 0.19, full ? 0.38 : 0.24, m, { lp: 800 }); this.tone('sine', f * 2, t, 0.05, 0.06, m); break;
      case 'synth': this.tone('sawtooth', f, t, sd * 1.7, full ? 0.13 : 0.07, m, { lp: 320, lpTo: 1300 }); this.tone('sine', f, t, sd * 1.7, 0.2, m); break;
      case 'gallop': this.tone('sawtooth', f, t, sd * 0.9, full ? 0.11 : 0.05, m, { lp: 650 }); this.tone('triangle', f, t, sd * 0.95, full ? 0.28 : 0.18, m, { lp: 900 }); break;
      case 'band': this.tone('triangle', f, t, sd * 1.7, full ? 0.34 : 0.2, m, { lp: 900 }); if (full) this.tone('sawtooth', f, t, sd * 1.5, 0.07, m, { lp: 500 }); break;
      default: this.tone('triangle', f, t, sd * 1.9, full ? 0.32 : 0.2, m, { lp: 900 });
    }
  }
  stabNote(v, n, t, sd, full, m, len) {
    const f = midi(n), k = full ? 1 : 0.7;
    switch (v) {
      case 'brass': this.tone('sawtooth', f, t, sd * 1.5, 0.04 * k, m, { lp: 1900 }); break;
      case 'reed': this.tone('square', f, t, sd * 1.9, 0.026 * k, m, { lp: 1700, att: 0.015 }); break;
      case 'organ': this.tone('square', f, t, sd * 2.6, 0.022 * k, m, { lp: 2000 }); this.tone('sine', f * 2, t, sd * 2.6, 0.016 * k, m); break;
      case 'pluck': this.tone('triangle', f, t, 0.15, 0.065 * k, m); break;
      case 'pad': this.tone('sawtooth', f, t, sd * len * 0.98, 0.03 * k, m, { lp: 500, lpTo: 1700, att: 0.18 }); this.tone('triangle', f, t, sd * len * 0.98, 0.03 * k, m, { att: 0.18 }); break;
      default: this.tone('sawtooth', f, t, sd * 1.6, 0.045 * k, m, { lp: 2600, lpTo: 700 });
    }
  }
  drum(name, c, t, s, m, tones) {
    switch (name) {
      case 'kick': this.tone('sine', 150, t, 0.16, 0.55, m, { slide: 42 }); this.noise(t, 0.02, 0.1, { dest: m, f: 2000 }); break;
      case 'thump': this.tone('sine', 118, t, 0.15, 0.4, m, { slide: 46 }); break;
      case 'snare': this.noise(t, 0.14, s % 4 ? 0.1 : 0.22, { dest: m, type: 'bandpass', f: 1900, q: 0.8 }); this.tone('triangle', 190, t, 0.08, s % 4 ? 0.07 : 0.15, m, { slide: 120 }); break;
      case 'hat': this.noise(t, c === 'o' ? 0.12 : 0.035, c === 'o' ? 0.07 : s % 4 === 2 ? 0.06 : 0.035, { dest: m, f: 8000 }); break;
      case 'clap': for (const d of [0, 0.012, 0.026]) this.noise(t + d, d ? 0.1 : 0.02, 0.13, { dest: m, type: 'bandpass', f: 1500, q: 1.3 }); break;
      case 'snap': this.noise(t, 0.035, 0.2, { dest: m, type: 'bandpass', f: 2700, q: 3 }); break;
      case 'rim': this.tone('triangle', 820, t, 0.03, 0.12, m); this.noise(t, 0.015, 0.07, { dest: m, type: 'bandpass', f: 3200, q: 2 }); break;
      case 'shake': this.noise(t, 0.035, s % 4 === 0 ? 0.045 : s % 2 ? 0.016 : 0.028, { dest: m, f: 7000, att: 0.012 }); break;
      case 'sleigh': this.noise(t, 0.06, s % 4 === 0 ? 0.05 : 0.03, { dest: m, f: 9000 }); this.tone('square', 5300, t, 0.05, 0.006, m); this.tone('square', 6700, t, 0.04, 0.005, m); break;
      case 'tom': this.tone('sine', s % 2 ? 150 : 200, t, 0.16, 0.34, m, { slide: s % 2 ? 80 : 110 }); break;
      case 'tick': this.tone('sine', 1050, t, 0.03, 0.08, m); break;
      case 'brush': this.noise(t, 0.07, s % 4 === 2 ? 0.035 : 0.02, { dest: m, type: 'bandpass', f: 4200, q: 0.5, att: 0.02 }); break;
      case 'bell': this.tone('sine', midi(tones[tones.length - 1] + 24), t, 0.35, 0.035, m); break;
      default:
    }
  }
  playStep(step, t, sd) {
    const T = this.theme, L = T.len, nb = T.bars.length, m = this.music;
    const bar = Math.floor(step / L) % nb, s = step % L, full = this.intensity > 0.5, again = step >= L * nb;
    const [root, tones] = T.bars[bar];
    // bass
    const b = T.bass[s];
    if (b !== null && b !== undefined) this.bassNote(T.bassVoice, root + b, t, sd, full, m);
    // chords
    if (T.stabs[s] === 'x') for (const n of tones) this.stabNote(T.stab, n, t, sd, full, m, L);
    // arpeggio
    const A = T.arp;
    if (A && s % (A.every || 1) === 0) {
      const n = tones[A.pat[(s / (A.every || 1)) % A.pat.length]] + A.oct;
      this.tone(A.wave, midi(n), t, sd * (A.every || 1) * 0.9, full ? A.vol : A.vol * 1.3, m, { lp: A.lp, lpTo: A.lpTo });
    }
    // the tune (on the title screen only the last bar of each line is played, softly)
    if (full || bar % 4 === 3) for (const [st, n, len] of T.lead[bar]) if (st === s) {
      const dur = sd * len * 0.92;
      this.leadNote(T.voice, n, t, dur, 1, m);
      if (again && full) this.tone('sine', midi(n + 12), t, Math.min(dur, 0.25), 0.02, m);        // second time round: a sparkle on top
      if (T.echo) { this.leadNote(T.voice, n, t + sd * 3, dur, T.echo, m); this.leadNote(T.voice, n, t + sd * 6, dur, T.echo * 0.4, m); }
      this.prevLead = midi(n);
    }
    // drums
    if (full) {
      const D = T.drums, B = bar >= nb / 2;
      for (const name in D) {
        if (name === 'fill' || name.endsWith('B')) continue;
        const pat = (B && D[name + 'B']) || D[name], c = pat[s];
        if (name === 'cymbal') { if (c === 'x' && bar % (nb / 2) === 0) this.noise(t, 0.9, 0.07, { dest: m, f: 5200 }); continue; }
        if (c === 'x' || c === 'o') this.drum(name, c, t, s, m, tones);
      }
      if (D.fill && bar % 8 === 7 && s >= L - 4) this.noise(t, 0.08, 0.12, { dest: m, type: 'bandpass', f: 900 + s * 150, q: 1 });
      if (T.blips && Math.random() < 0.07) this.tone('sine', midi(tones[(Math.random() * tones.length) | 0] + 36), t, 0.05, 0.016, m);
    }
  }


  // ---------- effects ----------
  get ok() { return this.ctx && this.ctx.state === 'running' && !this.muted; }
  jump() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 330, t, 0.16, 0.22, null, { slide: 720 }); this.noise(t, 0.08, 0.05, { type: 'bandpass', f: 1500 }); } }
  doubleJump() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 520, t, 0.18, 0.22, null, { slide: 1250 }); this.tone('triangle', 780, t + 0.04, 0.14, 0.1, null, { slide: 1560 }); } }
  land() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.09, 0.2, { type: 'lowpass', f: 420 }); this.tone('sine', 110, t, 0.08, 0.2, null, { slide: 60 }); } }
  swish() { if (this.ok) this.noise(this.ctx.currentTime, 0.09, 0.07, { type: 'bandpass', f: 2400, fTo: 900, q: 1.2 }); }
  coin() {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.coinStreak = t - this.lastCoin < 0.5 ? Math.min(this.coinStreak + 1, 12) : 0; this.lastCoin = t;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28], n = 81 + scale[this.coinStreak] ;
    this.tone('triangle', midi(n), t, 0.09, 0.2); this.tone('sine', midi(n + 7), t + 0.045, 0.16, 0.16);
  }
  // picking up a power-up: a rising flourish, then a little tail that tells you which one it is
  power(type) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    [72, 76, 79, 84, 88].forEach((n, i) => this.tone('square', midi(n), t + i * 0.055, 0.16, 0.09, null, { lp: 3500 }));
    const u = t + 0.3;
    if (type === 'magnet') this.wobble('sine', 300, 620, u, 0.5, 0.1, 16, 60);
    else if (type === 'shield') { this.tone('sine', 700, u, 0.5, 0.1, null, { slide: 1500, att: 0.1 }); this.noise(u, 0.5, 0.05, { f: 5000, att: 0.2 }); }
    else if (type === 'boots') for (let i = 0; i < 2; i++) this.tone('sine', 240, u + i * 0.13, 0.13, 0.16, null, { slide: 900 });
    else if (type === 'gem') [96, 100, 103, 108].forEach((n, i) => this.tone('sine', midi(n), u + i * 0.045, 0.3, 0.07));
    else if (type === 'laser') this.laserUp();
  }
  powerEnd() { if (this.ok) { const t = this.ctx.currentTime; [79, 74].forEach((n, i) => this.tone('triangle', midi(n), t + i * 0.09, 0.14, 0.1)); } }
  multUp() { if (this.ok) { const t = this.ctx.currentTime; [84, 91, 96].forEach((n, i) => this.tone('triangle', midi(n), t + i * 0.06, 0.2, 0.14)); } }
  nearMiss() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.2, 0.12, { type: 'bandpass', f: 700, fTo: 3600, q: 1.5 }); this.tone('sine', 880, t + 0.05, 0.12, 0.08, null, { slide: 1320 }); } }
  stumble() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 260, t, 0.25, 0.2, null, { slide: 90, lp: 1400 }); this.noise(t, 0.18, 0.2, { type: 'lowpass', f: 900 }); this.whoosh(0.9); } }
  whoosh(dur = 1.2) { if (this.ok) this.noise(this.ctx.currentTime, dur, 0.28, { type: 'bandpass', f: 300, fTo: 1400, q: 0.6, att: dur * 0.5 }); }
  crash() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.35, 0.5, { type: 'lowpass', f: 1800, fTo: 200 }); this.tone('sine', 140, t, 0.4, 0.5, null, { slide: 38 }); this.tone('square', 196, t, 0.12, 0.12, null, { slide: 98, lp: 900 }); } }
  splash() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.7, 0.45, { type: 'bandpass', f: 2600, fTo: 500, q: 0.5 }); this.tone('sine', 220, t, 0.3, 0.25, null, { slide: 60 }); } }
  shieldPop() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 1200, t, 0.25, 0.2, null, { slide: 300 }); this.noise(t, 0.2, 0.25, { type: 'highpass', f: 3000 }); } }
  gameOver() { if (this.ok) { const t = this.ctx.currentTime + 0.5; [69, 66, 62, 57].forEach((n, i) => this.tone('triangle', midi(n), t + i * 0.16, 0.34, 0.16, null, { vib: i === 3 })); } }
  warp() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 110, t, 1.0, 0.16, null, { slide: 1760, lp: 3200 }); this.noise(t, 0.9, 0.22, { type: 'bandpass', f: 300, fTo: 5200, q: 2, att: 0.5 }); [72, 79, 84, 91, 96].forEach((n, i) => this.tone('triangle', midi(n), t + 0.45 + i * 0.07, 0.3, 0.12)); } }
  warpOut() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 1500, t, 0.6, 0.14, null, { slide: 160, lp: 3200 }); this.noise(t, 0.5, 0.2, { type: 'bandpass', f: 4000, fTo: 400, q: 1.5 }); [96, 91, 84, 79].forEach((n, i) => this.tone('triangle', midi(n), t + i * 0.06, 0.25, 0.1)); } }
  rocket(dur) { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 90, t, 0.7, 0.2, null, { slide: 620, lp: 2400 }); this.noise(t, dur, 0.16, { type: 'bandpass', f: 500, fTo: 1100, q: 0.7, att: 0.3 }); this.noise(t, 0.35, 0.3, { type: 'highpass', f: 2500 }); } }
  // the helicopter: chopped low noise that swells and fades over "dur" seconds
  chopper(dur = 13) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime, n = c.createBufferSource(), f = c.createBiquadFilter(), am = c.createGain(), env = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    n.buffer = this.noiseBuf; n.loop = true; f.type = 'lowpass'; f.frequency.value = 520;
    am.gain.value = 0.55; lfo.type = 'square'; lfo.frequency.value = 13; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.22, t + 3); env.gain.setValueAtTime(0.22, t + dur - 3.5); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(am); am.connect(env); env.connect(this.sfx);
    n.start(t); lfo.start(t); n.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    this.tone('sawtooth', 70, t, dur, 0.035, null, { lp: 300, att: 2.5 });
  }
  plane() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 104, t, 9, 0.03, null, { slide: 84, lp: 420, att: 3.5 }); } }
  board() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 220, t, 0.55, 0.14, null, { slide: 700 }); this.tone('triangle', 330, t + 0.08, 0.5, 0.08, null, { slide: 1050 }); this.noise(t, 0.7, 0.14, { type: 'bandpass', f: 700, fTo: 2600, q: 1.2, att: 0.25 }); } }
  zap(big) { if (this.ok) { const t = this.ctx.currentTime; this.tone('square', big ? 1500 : 1900, t, big ? 0.16 : 0.1, 0.07, null, { slide: big ? 220 : 520, lp: 5200 }); this.noise(t, 0.06, 0.06, { type: 'highpass', f: 4200 }); } }
  poof(big) { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, big ? 0.3 : 0.16, big ? 0.2 : 0.12, { type: 'bandpass', f: 1000, fTo: 280, q: 0.8 }); this.tone('sine', big ? 300 : 620, t, 0.12, 0.1, null, { slide: big ? 90 : 1100 }); } }
  ufoShot() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 980, t, 0.32, 0.09, null, { slide: 170, lp: 2600 }); this.tone('sine', 1500, t, 0.2, 0.06, null, { slide: 400 }); } }
  bark() { if (this.ok) { const t = this.ctx.currentTime; for (const d of [0, 0.17]) { this.tone('sawtooth', 430, t + d, 0.1, 0.2, null, { slide: 240, lp: 1900 }); this.noise(t + d, 0.07, 0.1, { type: 'bandpass', f: 1300, q: 1 }); } } }
  meow() { if (this.ok) { const t = this.ctx.currentTime; this.tone('triangle', 640, t, 0.2, 0.14, null, { slide: 1000 }); this.tone('triangle', 1000, t + 0.19, 0.32, 0.14, null, { slide: 560, vib: true }); } }
  boing() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 170, t, 0.34, 0.3, null, { slide: 760 }); this.tone('triangle', 340, t + 0.03, 0.26, 0.12, null, { slide: 1200 }); } }
  letter(i) { if (this.ok) { const t = this.ctx.currentTime, n = 76 + [0, 2, 4, 7, 9][i % 5]; this.tone('square', midi(n), t, 0.14, 0.1, null, { lp: 3800 }); this.tone('triangle', midi(n + 12), t + 0.07, 0.3, 0.16); } }
  pearl() { if (this.ok) { const t = this.ctx.currentTime; [88, 95, 100].forEach((n, i) => this.tone('sine', midi(n), t + i * 0.05, 0.3, 0.14)); } }
  thunder(delay = 0.3) { if (this.ok) { const t = this.ctx.currentTime + delay; this.noise(t, 0.1, 0.3, { type: 'highpass', f: 1800 }); this.noise(t + 0.03, 2.4, 0.5, { type: 'lowpass', f: 420, fTo: 55, att: 0.06 }); this.tone('sine', 62, t, 1.2, 0.3, null, { slide: 36 }); } }
  firework(vol = 1) { if (this.ok && vol > 0) { const t = this.ctx.currentTime; this.noise(t, 0.5, 0.11 * vol, { type: 'bandpass', f: 1500, fTo: 300, q: 0.6 }); this.tone('sine', 95, t, 0.22, 0.22 * vol, null, { slide: 42 }); this.noise(t + 0.12, 0.6, 0.05 * vol, { f: 5000 }); } }
  levelUp() { if (this.ok) { const t = this.ctx.currentTime; [74, 78, 81, 86, 90].forEach((n, i) => { this.tone('square', midi(n), t + i * 0.08, 0.2, 0.08, null, { lp: 3800 }); this.tone('triangle', midi(n), t + i * 0.08, 0.26, 0.12); }); } }
  fanfare() { if (this.ok) { const t = this.ctx.currentTime; [[74, 0], [74, 0.12], [74, 0.24], [78, 0.36], [81, 0.56], [86, 0.76]].forEach(([n, d], i) => { this.tone('square', midi(n), t + d, i > 3 ? 0.5 : 0.14, 0.09, null, { lp: 4200, vib: i === 5 }); this.tone('triangle', midi(n + 12), t + d, i > 3 ? 0.5 : 0.14, 0.1); }); } }
  blast() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.5, 0.45, { type: 'lowpass', f: 1400, fTo: 120 }); this.tone('sine', 120, t, 0.45, 0.45, null, { slide: 34 }); } }
  gull() {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.tone('sawtooth', 1500, t + i * 0.2, 0.16, 0.035, null, { slide: 900, lp: 2600, att: 0.03 });
  }

  // ---------- more effects ----------
  // a tone that wobbles (UFOs, magnets): slides from f to fTo while an LFO shakes the pitch
  wobble(type, f, fTo, t, dur, vol, rate = 9, depth = 80, o = {}) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), lp = c.createBiquadFilter();
    osc.type = type; osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(osc.frequency);
    lp.type = 'lowpass'; lp.frequency.value = o.lp || 4000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + (o.att || 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(this.sfx);
    osc.start(t); l.start(t); osc.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  }
  // footsteps: a soft pat, splashy in the sewers, crunchy on snow, a clonk on the moon
  footstep(kind) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, alt = (this.lastStep ^= 1);
    if (kind === 'wet') { this.noise(t, 0.07, 0.05, { type: 'bandpass', f: alt ? 1900 : 2300, q: 0.8 }); this.tone('sine', 300, t, 0.05, 0.03, null, { slide: 700 }); }
    else if (kind === 'snow') this.noise(t, 0.08, 0.085, { type: 'bandpass', f: alt ? 3200 : 3800, q: 1.6, att: 0.012 });
    else if (kind === 'metal') { this.tone('triangle', alt ? 240 : 270, t, 0.05, 0.045); this.noise(t, 0.03, 0.03, { type: 'bandpass', f: 1500, q: 2 }); }
    else if (kind === 'wood') { this.tone('sine', alt ? 150 : 170, t, 0.05, 0.045, null, { slide: 90 }); this.noise(t, 0.03, 0.035, { type: 'lowpass', f: 700 }); }
    else { this.noise(t, 0.05, 0.11, { type: 'bandpass', f: alt ? 800 : 950, q: 1 }); this.tone('sine', 120, t, 0.04, 0.03, null, { slide: 80 }); }
  }
  // rats and bats: a burst of tiny chirps
  squeak(n = 2, hi = 1) { if (this.ok) { const t = this.ctx.currentTime; for (let i = 0; i < n; i++) { const f = rnd(2300, 3000) * hi; this.tone('triangle', f, t + i * 0.085, 0.065, 0.1, null, { slide: f * 1.45 }); } } }
  ratPop() { if (this.ok) { const t = this.ctx.currentTime; this.tone('triangle', 3200, t, 0.16, 0.08, null, { slide: 1500 }); this.tone('sine', 520, t + 0.03, 0.12, 0.1, null, { slide: 1300 }); } }
  drip(echo = true) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, f = rnd(700, 1300);
    this.tone('sine', f, t, 0.07, 0.09, null, { slide: f * 2.2 });
    if (echo) { this.tone('sine', f, t + 0.19, 0.07, 0.035, null, { slide: f * 2.2 }); this.tone('sine', f, t + 0.38, 0.07, 0.014, null, { slide: f * 2.2 }); }
  }
  gurgle() { if (this.ok) { const t = this.ctx.currentTime; for (let i = 0; i < 5; i++) { const f = rnd(160, 320); this.tone('sine', f, t + i * 0.09, 0.09, 0.09, null, { slide: f * 1.9 }); } } }
  // UFOs: a warbling hum as one swoops in, and a wobbly dive when it is zapped
  ufoHum() { if (this.ok) { const t = this.ctx.currentTime; this.wobble('sine', 520, 760, t, 1.1, 0.07, 11, 90, { att: 0.3 }); this.wobble('triangle', 262, 380, t, 1.1, 0.04, 11, 40, { att: 0.3 }); } }
  ufoDown() { if (this.ok) { const t = this.ctx.currentTime; this.wobble('sawtooth', 1100, 110, t, 0.7, 0.09, 17, 160, { lp: 2600 }); this.noise(t + 0.5, 0.3, 0.14, { type: 'lowpass', f: 900, fTo: 200 }); } }
  laserUp() { if (this.ok) { const t = this.ctx.currentTime + 0.3; this.tone('sawtooth', 180, t, 0.4, 0.09, null, { slide: 2000, lp: 3400 }); for (let i = 0; i < 3; i++) this.tone('square', 1900, t + 0.42 + i * 0.07, 0.06, 0.06, null, { slide: 700, lp: 5200 }); } }
  megaUp() {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    for (const d of [-12, 12]) this.tone('sawtooth', 110, t, 0.7, 0.08, null, { slide: 1760, lp: 3600, det: d });
    this.noise(t, 0.7, 0.12, { type: 'bandpass', f: 400, fTo: 5000, q: 2, att: 0.4 });
    [69, 76, 81, 88].forEach((n) => this.tone('square', midi(n), t + 0.7, 0.5, 0.035, null, { lp: 3600 }));
    this.tone('sine', 110, t + 0.7, 0.5, 0.15, null, { slide: 45 });
  }
  // Izzi and Pixel
  yip() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sawtooth', 560, t, 0.09, 0.15, null, { slide: 330, lp: 2300 }); this.noise(t, 0.06, 0.07, { type: 'bandpass', f: 1600, q: 1 }); } }
  pant() { if (this.ok) { const t = this.ctx.currentTime; for (let i = 0; i < 4; i++) this.noise(t + i * 0.16, 0.1, i % 2 ? 0.07 : 0.1, { type: 'bandpass', f: i % 2 ? 1500 : 2300, q: 1.2, att: 0.03 }); } }
  whine() { if (this.ok) { const t = this.ctx.currentTime; this.tone('triangle', 980, t, 0.4, 0.1, null, { slide: 640, vib: 0.02, vibHz: 7, att: 0.05 }); } }
  mew() { if (this.ok) { const t = this.ctx.currentTime; this.tone('triangle', 780, t, 0.24, 0.1, null, { slide: 1080, vib: true, att: 0.03 }); this.tone('sine', 1560, t, 0.2, 0.02, null, { slide: 2100 }); } }
  purr() {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime, osc = c.createOscillator(), lp = c.createBiquadFilter(), am = c.createGain(), env = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 54; lp.type = 'lowpass'; lp.frequency.value = 420;
    am.gain.value = 0.5; lfo.frequency.value = 24; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.1, t + 0.3); env.gain.setValueAtTime(0.1, t + 0.9); env.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    osc.connect(lp); lp.connect(am); am.connect(env); env.connect(this.sfx);
    osc.start(t); lfo.start(t); osc.stop(t + 1.4); lfo.stop(t + 1.4);
  }
  // warnings and screens
  tick() { if (this.ok) { const t = this.ctx.currentTime; this.tone('square', 1320, t, 0.05, 0.075, null, { lp: 3200 }); } }
  tideWarn() { if (this.ok) { const t = this.ctx.currentTime + 0.25; for (let i = 0; i < 2; i++) this.tone('sawtooth', 233, t + i * 0.3, 0.26, 0.14, null, { slide: 175, lp: 1200, att: 0.03 }); this.noise(t, 0.9, 0.12, { type: 'lowpass', f: 300, fTo: 900, att: 0.6 }); } }
  fall() { if (this.ok) { const t = this.ctx.currentTime; this.tone('sine', 1250, t, 0.7, 0.12, null, { slide: 190, vib: 0.02, vibHz: 9 }); } }
  click() { if (this.ok) { const t = this.ctx.currentTime; this.tone('triangle', 620, t, 0.05, 0.12, null, { slide: 880 }); } }
  go() { if (this.ok) { const t = this.ctx.currentTime; [[81, 0, 0.1], [81, 0.13, 0.1], [88, 0.26, 0.3]].forEach(([n, d, l]) => { this.tone('square', midi(n), t + d, l, 0.07, null, { lp: 3800 }); this.tone('triangle', midi(n + 12), t + d, l, 0.08); }); } }
  newBest() {
    if (!this.ok) return;
    const t = this.ctx.currentTime + 0.2;
    [[74, 0], [78, 0.1], [81, 0.2], [86, 0.3], [85, 0.48], [86, 0.58], [90, 0.7]].forEach(([n, d], i) => { this.tone('square', midi(n), t + d, i === 6 ? 0.7 : 0.14, 0.07, null, { lp: 4200, vib: i === 6 }); this.tone('triangle', midi(n + 12), t + d, i === 6 ? 0.7 : 0.14, 0.09); });
    for (let i = 0; i < 6; i++) this.tone('sine', midi(98 + [0, 4, 7, 12, 7, 4][i]), t + 0.75 + i * 0.07, 0.2, 0.04);
  }
  unlockOutfit() { if (this.ok) { const t = this.ctx.currentTime; [76, 80, 83, 88, 92, 95].forEach((n, i) => this.tone('sine', midi(n), t + i * 0.06, 0.35, 0.09)); } }
  comboLost() { if (this.ok) { const t = this.ctx.currentTime; [76, 72, 67].forEach((n, i) => this.tone('triangle', midi(n), t + i * 0.07, 0.12, 0.07)); } }
  // creatures and things on the path
  crabClack() { if (this.ok) { const t = this.ctx.currentTime; for (const d of [0, 0.09, 0.2, 0.29]) { this.tone('square', 1500, t + d, 0.025, 0.075, null, { lp: 4000 }); this.noise(t + d, 0.02, 0.09, { type: 'bandpass', f: 2600, q: 3 }); } } }
  penguin() { if (this.ok) { const t = this.ctx.currentTime; for (let i = 0; i < 2; i++) this.tone('sawtooth', 520, t + i * 0.2, 0.15, 0.11, null, { slide: 380, lp: 1700, vib: 0.03, vibHz: 22, att: 0.02 }); } }
  trolley() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 0.8, 0.2, { type: 'bandpass', f: 300, fTo: 520, q: 1.5, att: 0.3 }); for (let i = 0; i < 5; i++) this.tone('triangle', 1900, t + i * 0.15, 0.03, 0.06); } }
  rumble(dur = 1.1) { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, dur, 0.16, { type: 'lowpass', f: 150, fTo: 360, att: dur * 0.5 }); this.tone('sine', 62, t, dur, 0.12, null, { slide: 92, att: dur * 0.4 }); } }
  roverBeep() { if (this.ok) { const t = this.ctx.currentTime; [1400, 1900, 1400].forEach((f, i) => this.tone('square', f, t + i * 0.09, 0.06, 0.06, null, { lp: 4200 })); } }
  // sounds of each place, played now and then
  horn() { if (this.ok) { const t = this.ctx.currentTime; for (const f of [98, 147]) this.tone('sawtooth', f, t, 1.5, 0.06, null, { lp: 460, att: 0.2 }); } }
  buoy() { if (this.ok) { const t = this.ctx.currentTime; for (const d of [0, 0.9]) { this.tone('sine', 640, t + d, 1.1, 0.05); this.tone('sine', 1710, t + d, 0.5, 0.018); } } }
  gust() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 2.4, 0.24, { type: 'bandpass', f: 380, fTo: 950, q: 1.8, att: 1.1 }); } }
  chime() { if (this.ok) { const t = this.ctx.currentTime; for (let i = 0; i < 4; i++) this.tone('sine', midi(87 + [0, 3, 7, 10, 12, 15][(Math.random() * 6) | 0]), t + i * 0.11, 0.6, 0.035); } }
  blips() { if (this.ok) { const t = this.ctx.currentTime, n = 3 + ((Math.random() * 4) | 0); for (let i = 0; i < n; i++) this.tone('sine', rnd(1100, 2600), t + i * 0.075, 0.05, 0.05); } }
  organToot() { if (this.ok) { const t = this.ctx.currentTime; [[72, 0], [76, 0.11], [79, 0.22], [84, 0.33]].forEach(([n, d]) => { this.tone('square', midi(n), t + d, 0.1, 0.03, null, { lp: 2400 }); this.tone('sine', midi(n + 12), t + d, 0.1, 0.035); }); } }
  cheer() { if (this.ok) { const t = this.ctx.currentTime; this.noise(t, 1.5, 0.09, { type: 'bandpass', f: 1100, fTo: 1900, q: 0.9, att: 0.5 }); for (let i = 0; i < 3; i++) this.tone('sine', rnd(700, 1000), t + 0.2 + i * 0.12, 0.6, 0.012, null, { slide: rnd(1300, 1700), att: 0.2 }); } }
  // arriving in a new world: a short sting in that world's style, just after the level-up jingle
  sting(zone) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + 0.45;
    const run = (notes, type, gap = 0.07, vol = 0.07) => notes.forEach((n, i) => this.tone(type, midi(n), t + i * gap, 0.22, vol, null, { lp: 4000 }));
    if (zone === 8) { this.tone('sine', 520, t, 0.6, 0.12, null, { slide: 85 }); this.drip(); }
    else if (zone === 9) { this.tone('sine', 220, t, 0.7, 0.08, null, { slide: 1900, vib: 0.02, vibHz: 8 }); this.blips(); }
    else if (zone === 3) run([72, 76, 79, 84, 79, 84], 'square', 0.08, 0.06);
    else if (zone === 4) { run([64, 67, 71, 76], 'sawtooth', 0.07, 0.05); this.thunder(0.5); }
    else if (zone === 7) run([87, 91, 94, 99, 103], 'sine', 0.06, 0.06);
    else if (zone === 6) { this.tone('sine', 147, t, 0.9, 0.16); this.tone('sine', 147, t + 0.35, 0.9, 0.06); }
    else if (zone === 2) { for (const f of [98, 147]) this.tone('sawtooth', f, t, 0.9, 0.06, null, { lp: 460, att: 0.15 }); }
    else if (zone === 5) run([81, 85, 88, 93, 88, 93], 'sine', 0.055, 0.08);
    else if (zone === 1) run([77, 81, 84, 89], 'sawtooth', 0.09, 0.075);
    else run([74, 78, 81, 86], 'triangle', 0.07, 0.08);
  }
}

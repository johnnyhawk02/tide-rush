// The Tide Rush songbook: one original tune for every world, plus the warp tunnel and the rocket.
// Tunes are written as scale degrees so they are easy to read and change:
//   "5:2"  = fifth note of the scale, two steps long (a step is a 16th note)
//   "1'"   = up an octave, "5," = down an octave, "b3" / "#7" = flattened / sharpened, "-" = rest
// Chords are roman numerals in the tune's key (lower case = minor, "b" = flattened root, "7" = added seventh).
const SCALES = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10] };
const ROMAN = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };
const place = (p, lo) => lo + (((p - lo) % 12) + 12) % 12;

function chord(key, name) {
  const m = /^([b#]?)([ivIV]+)(7?)$/.exec(name);
  const minor = m[2] === m[2].toLowerCase();
  const pc = key + ROMAN[m[2].toLowerCase()] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0);
  const tones = [0, minor ? 3 : 4, 7].concat(m[3] ? [10] : []).map((o) => place(pc + o, 58)).sort((a, b) => a - b);
  return [place(pc, 35), tones];
}
function melody(bars, base, scale, len, name) {
  return bars.map((bar, bi) => {
    let s = 0; const out = [];
    for (const tok of bar.trim().split(/\s+/)) {
      const m = /^(-|([b#]?)([1-7]))([',]*)(?::(\d+))?$/.exec(tok);
      if (!m) { console.warn('music: bad note', name, bi, tok); continue; }
      const n = +(m[5] || 2);
      if (m[1] !== '-') {
        let p = base + scale[m[3] - 1] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
        for (const ch of m[4]) p += ch === "'" ? 12 : -12;
        out.push([s, p, n]);
      }
      s += n;
    }
    if (s !== len) console.warn('music: bar length', name, bi, s);
    return out;
  });
}
const theme = (name, o) => {
  const len = o.len || 16;
  return {
    name, len, tempo: 1, swing: 0, echo: 0, voice: 'chip', bassVoice: 'tri', stab: 'saw', stabs: '..x...x...x...x.', arp: null, drums: {}, ...o,
    bars: o.bars || o.chords.trim().split(/\s+/).map((c) => chord(o.key, c)),
    lead: o.lead || melody(o.tune, o.base, SCALES[o.scale], len, name),
  };
};
const _ = null;

// ---- 0. The Promenade: "Tide Rush", the main theme (D major) ----
const CH = { D: [38, [62, 66, 69]], Bm: [35, [59, 62, 66]], G: [43, [59, 62, 67]], A: [45, [61, 64, 69]], Fsm: [42, [61, 66, 69]] };
const PROM_BARS = ['D', 'D', 'Bm', 'Bm', 'G', 'G', 'A', 'A', 'G', 'A', 'Fsm', 'Bm', 'G', 'A', 'D', 'D'];
const PROM_LEAD = [
  [[0, 74, 2], [2, 78, 2], [4, 81, 3], [8, 78, 2], [10, 76, 2], [12, 74, 4]],
  [[0, 74, 2], [2, 78, 2], [4, 81, 2], [6, 83, 2], [8, 81, 4], [14, 78, 2]],
  [[0, 83, 3], [4, 81, 2], [6, 78, 2], [8, 74, 4], [12, 76, 2], [14, 78, 2]],
  [[0, 78, 6], [8, 76, 2], [10, 74, 2], [12, 71, 4]],
  [[0, 71, 2], [2, 74, 2], [4, 79, 3], [8, 78, 2], [10, 74, 2], [12, 71, 4]],
  [[0, 74, 2], [2, 79, 2], [4, 83, 2], [6, 81, 2], [8, 79, 4], [14, 78, 2]],
  [[0, 76, 3], [4, 81, 2], [6, 85, 2], [8, 88, 4], [12, 85, 2], [14, 81, 2]],
  [[0, 81, 6], [8, 83, 2], [10, 85, 2], [12, 81, 4]],
  [[0, 86, 3], [4, 83, 2], [6, 79, 2], [8, 83, 4], [12, 86, 2], [14, 83, 2]],
  [[0, 85, 3], [4, 81, 2], [6, 76, 2], [8, 81, 6]],
  [[0, 81, 2], [2, 78, 2], [4, 73, 3], [8, 78, 2], [10, 81, 2], [12, 85, 4]],
  [[0, 83, 6], [8, 78, 2], [10, 74, 2], [12, 71, 4]],
  [[0, 79, 2], [2, 83, 2], [4, 86, 3], [8, 83, 2], [10, 79, 2], [12, 83, 4]],
  [[0, 81, 2], [2, 85, 2], [4, 88, 3], [8, 85, 2], [10, 81, 2], [12, 85, 4]],
  [[0, 86, 4], [4, 81, 2], [6, 78, 2], [8, 74, 2], [10, 78, 2], [12, 81, 2], [14, 86, 2]],
  [[0, 86, 8], [12, 81, 2], [14, 78, 2]],
];
const BOUNCE = [0, _, 0, _, 12, _, 0, _, 7, _, 0, _, 12, _, 7, _];

export const THEMES = {
  0: theme('Tide Rush', {
    bars: PROM_BARS.map((n) => CH[n]), lead: PROM_LEAD, bass: BOUNCE, bassVoice: 'band',
    arp: { pat: [0, 1, 2, 1, 2, 1, 0, 1], wave: 'square', oct: 12, vol: 0.022, lp: 3200 },
    drums: { kick: 'x......xx.x.....', kickB: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.o.', fill: 1 },
  }),

  // ---- 1. The Grand Pier: "Pier Parade", a seaside brass-band march (F major) ----
  1: theme('Pier Parade', {
    key: 5, scale: 'maj', base: 77, voice: 'piccolo', bassVoice: 'tuba', stab: 'brass',
    chords: 'I IV I V I IV V I',
    tune: [
      '5,:2 1:2 3:2 5:2 3:4 1:2 3:2',
      '4:2 6:2 1\':2 6:2 4:4 -:2 6:2',
      '5:3 3:1 5:2 1\':2 5:4 3:2 1:2',
      '2:4 7,:2 2:2 5,:6 -:2',
      '5,:2 1:2 3:2 5:2 1\':4 5:2 3:2',
      '6:3 1\':1 6:2 4:2 6:4 4:2 2:2',
      '5:2 4:2 2:2 7,:2 2:2 4:2 5:2 7:2',
      '1\':6 5:2 1\':4 -:4',
    ],
    bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, 0, _],
    drums: { kick: 'x.......x.......', snare: '....x..x....x.xx', hat: 'x.x.x.x.x.x.x.x.', cymbal: 'x...............', fill: 1 },
  }),

  // ---- 2. The Old Harbour: "Harbour Hornpipe", a swung accordion reel (G major) ----
  2: theme('Harbour Hornpipe', {
    key: 7, scale: 'maj', base: 67, gain: 1.15, voice: 'accordion', bassVoice: 'tuba', stab: 'reed', swing: 0.5,
    chords: 'I IV I V vi IV V I',
    tune: [
      '1\':2 7:2 1\':2 3\':2 5\':2 3\':2 1\':2 5:2',
      '6:2 1\':2 4\':2 3\':2 1\':2 6:2 5:2 6:2',
      '1\':2 3\':2 5\':2 3\':2 1\':2 5:2 3:2 5:2',
      '2\':2 7:2 5:2 7:2 2\':4 -:2 5:2',
      '3\':2 6:2 1\':2 3\':2 6\':2 3\':2 1\':2 6:2',
      '4\':2 6:2 1\':2 4\':2 6\':2 4\':2 3\':2 1\':2',
      '2\':2 7:2 2\':2 5\':2 4\':2 2\':2 7:2 5:2',
      '1\':2 5:2 3:2 5:2 1\':6 -:2',
    ],
    bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, _, _],
    stabs: '..x...x...x...x.',
    drums: { thump: 'x.......x.......', clap: '....x.......x...', tick: '..x...x...x...x.' },
  }),

  // ---- 3. The Midnight Funfair: "Carousel Lights", a fairground-organ waltz (C major, 3/4) ----
  3: theme('Carousel Lights', {
    key: 0, scale: 'maj', base: 60, len: 12, tempo: 1.3, gain: 1.5, voice: 'organ', bassVoice: 'tuba', stab: 'organ',
    chords: 'I I V7 V7 V7 V7 I I IV IV I I II7 V7 I I',
    tune: [
      '3:4 5:2 3:2 1\':4', '7:4 1\':2 7:2 5:4', '2:4 4:2 2:2 7:4', '6:4 7:2 6:2 5:4',
      '4:4 5:2 4:2 2\':4', '7:4 2\':2 7:2 5:4', '3:4 5:2 3:2 1\':4', '3\':8 -:4',
      '4\':4 3\':2 4\':2 6\':4', '1\':4 6:2 1\':2 4\':4', '3\':4 2\':2 3\':2 5\':4', '1\':4 5:2 1\':2 3\':4',
      '6\':4 #4\':2 2\':2 1\':4', '7:4 2\':2 4\':2 5\':4', '3\':4 1\':2 3\':2 5\':2 3\':2', '1\':8 -:4',
    ],
    bass: [0, _, _, _, _, _, _, _, _, _, _, _],
    stabs: '....x...x...',
    drums: { thump: 'x...........', hat: '....x...x...', cymbal: 'x...........', bell: '........x...' },
  }),

  // ---- 4. Storm Point: "Storm Chase", a galloping minor-key chase (E minor) ----
  4: theme('Storm Chase', {
    key: 4, scale: 'min', base: 76, voice: 'brass', bassVoice: 'gallop', stab: 'brass',
    chords: 'i i bVI bVII i i bVI V',
    tune: [
      '1:6 5,:2 1:2 3:2 5:4',
      '4:2 3:2 1:4 -:2 5,:2 1:2 3:2',
      '6:6 3:2 6:2 1\':2 6:4',
      '7:2 6:2 4:4 -:2 2:2 4:2 7:2',
      '1\':6 5:2 1\':2 7:2 5:4',
      '3:2 5:2 7:4 5:2 3:2 1:4',
      '6,:2 1:2 3:2 6:2 3:4 1:4',
      '2:4 #7,:4 5,:4 #7,:2 2:2',
    ],
    bass: [0, _, 0, 0, 0, _, 0, 0, 0, _, 0, 0, 0, _, 12, 0],
    stabs: 'x.......x.......',
    drums: { kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', tom: '..............xx', cymbal: 'x...............', fill: 1 },
  }),

  // ---- 5. Sandcastle Bay: "Bucket and Spade", a sunny steel-pan calypso (A major) ----
  5: theme('Bucket and Spade', {
    key: 9, scale: 'maj', base: 69, voice: 'pan', bassVoice: 'tuba', stab: 'pluck',
    chords: 'I IV V I I IV V I',
    tune: [
      '3\':3 1\':3 5:2 1\':3 3\':3 5\':2',
      '6\':3 4\':3 1\':2 4\':3 6\':3 4\':2',
      '5\':3 2\':3 7:2 2\':3 4\':3 2\':2',
      '3\':3 1\':3 5:2 1\':6 -:2',
      '5:2 1\':2 3\':2 5\':3 3\':3 1\':2 3\':2',
      '4\':2 6\':2 4\':2 1\':3 4\':3 6\':2 4\':2',
      '2\':3 4\':3 2\':2 7:3 2\':3 5\':2',
      '3\':2 2\':2 1\':4 5:2 1\':6',
    ],
    bass: [0, _, _, 7, _, _, 12, _, 0, _, _, 7, _, _, 12, _],
    stabs: '..x..x....x..x..',
    drums: { thump: 'x.......x.......', rim: '...x..x....x..x.', shake: 'xxxxxxxxxxxxxxxx', clap: '............x...' },
  }),

  // ---- 6. Smugglers' Cove: "Lantern Jig", a sneaky echoing jig (D minor, 6/8) ----
  6: theme('Lantern Jig', {
    key: 2, scale: 'min', base: 74, len: 12, tempo: 1.12, gain: 1.25, echo: 0.4, voice: 'pluck', bassVoice: 'pizz', stab: 'reed',
    chords: 'i i bVII i bIII bVII V i',
    tune: [
      '1:4 3:2 5:4 3:2', '4:2 3:2 2:2 1:4 5,:2', '7,:4 2:2 4:4 2:2', '3:2 2:2 #7,:2 1:6',
      '3:4 5:2 7:4 5:2', '4:2 5:2 4:2 2:4 7,:2', '5,:2 #7,:2 2:2 4:2 2:2 #7,:2', '1:4 5,:2 1:6',
    ],
    bass: [0, _, _, _, _, _, 7, _, _, _, 0, _],
    stabs: '....x.....x.',
    drums: { thump: 'x.....x.....', tick: '....x.....x.', shake: '..x.....x...' },
  }),

  // ---- 7. Frosty Pier: "Sparkle Frost", twinkling bells over sleigh bells (E flat major) ----
  7: theme('Sparkle Frost', {
    key: 3, scale: 'maj', base: 75, gain: 1.3, voice: 'bell', bassVoice: 'tri', stab: 'pad',
    chords: 'I vi IV V I vi ii V',
    tune: [
      '5:2 3:2 1:2 3:2 5:4 1\':4',
      '6:2 3:2 1:2 3:2 6:4 3:4',
      '4:2 6:2 1\':2 6:2 4:2 6:2 1\':4',
      '7:4 5:2 2:2 5:6 -:2',
      '5:2 3:2 1:2 3:2 5:2 1\':2 3\':4',
      '1\':2 6:2 3:2 6:2 1\':4 3\':4',
      '2\':2 6:2 4:2 6:2 2\':2 4\':2 2\':4',
      '7:2 2\':2 5\':4 2\':2 7:2 5:4',
    ],
    bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, 12, _],
    stabs: 'x...............',
    arp: { pat: [0, 2, 1, 2], wave: 'sine', oct: 24, vol: 0.03, every: 2 },
    drums: { thump: 'x.......x.......', sleigh: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...' },
  }),

  // ---- 8. The Sewers: "Sneaky Pipes", a tip-toe swung blues with an echo (G minor) ----
  8: theme('Sneaky Pipes', {
    key: 7, scale: 'min', base: 67, tempo: 0.9, gain: 1.4, swing: 0.6, echo: 0.3, voice: 'clarinet', bassVoice: 'pizz', stab: 'pluck',
    chords: 'i i iv i bVI V i V',
    tune: [
      '1:2 -:2 3:2 1:2 4:2 b5:2 5:4',
      '7:2 5:2 -:2 3:2 1:4 -:4',
      '4:2 -:2 6:2 4:2 1\':2 7:2 6:4',
      '5:2 b5:2 4:2 3:2 1:4 -:4',
      '6,:2 1:2 3:2 6:2 5:2 3:2 1:4',
      '2:2 #7,:2 5,:2 #7,:2 2:4 5:4',
      '1\':2 -:2 7:2 5:2 3:2 4:2 b5:2 5:2',
      '2:2 -:2 #7,:2 -:2 5,:4 -:4',
    ],
    bass: [0, _, _, _, 7, _, _, _, 12, _, _, _, 7, _, 10, _],
    stabs: '......x.......x.',
    drums: { thump: 'x.........x.....', snap: '....x.......x...', brush: 'x.x.x.x.x.x.x.x.' },
    drips: 1,
  }),

  // ---- 9. Space Pier: "Moon Hop", a floaty space-disco tune (A minor) ----
  9: theme('Moon Hop', {
    key: 9, scale: 'min', base: 69, voice: 'theremin', bassVoice: 'synth', stab: 'pad',
    chords: 'i bVI bIII bVII i bVI bIII bVII',
    tune: [
      '5:6 1\':2 3\':8',
      '1\':4 6:4 3\':6 1\':2',
      '5\':8 3\':4 7:4',
      '2\':6 7:2 4\':4 2\':4',
      '1\':2 3\':2 5\':4 3\':2 1\':2 5:4',
      '6:2 1\':2 3\':4 4\':2 3\':2 1\':4',
      '7:2 3\':2 5\':4 3\':2 7:2 5:4',
      '7:4 2\':4 4\':4 5\':4',
    ],
    bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, 12],
    stabs: 'x...............',
    arp: { pat: [0, 1, 2, 1, 2, 0, 1, 2], wave: 'sawtooth', oct: 12, vol: 0.02, lp: 900, lpTo: 3600 },
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..o...o...o...o.', fill: 1 },
    blips: 1,
  }),

  // ---- the warp tunnel: "Warp Dash", racing runs (B minor) ----
  warp: theme('Warp Dash', {
    key: 11, scale: 'min', base: 71, voice: 'chip', bassVoice: 'synth', stab: 'pad',
    chords: 'i bVI bVII i',
    tune: [
      '1:1 3:1 5:1 1\':1 3:1 5:1 1\':1 3\':1 5:1 1\':1 3\':1 5\':1 3\':2 5\':2',
      '6,:1 1:1 3:1 6:1 1:1 3:1 6:1 1\':1 3:1 6:1 1\':1 3\':1 1\':2 3\':2',
      '7,:1 2:1 4:1 7:1 2:1 4:1 7:1 2\':1 4:1 7:1 2\':1 4\':1 2\':2 4\':2',
      '5\':2 3\':2 1\':2 5:2 1\':2 3\':2 5\':4',
    ],
    bass: [0, _, 12, 0, _, 12, 0, _, 12, 0, _, 12, 0, _, 12, _],
    stabs: 'x...............',
    drums: { kick: 'x...x...x...x...', hat: 'xxoxxxoxxxoxxxox', clap: '....x.......x...' },
  }),

  // ---- the rocket: "Lift Off", a short brass fanfare (D major) ----
  rocket: theme('Lift Off', {
    key: 2, scale: 'maj', base: 62, voice: 'brass', bassVoice: 'band', stab: 'brass',
    chords: 'I IV V I',
    tune: [
      '1\':2 1\':1 1\':1 3\':2 5\':2 1\'\':6 5\':2',
      '6\':2 6\':1 6\':1 4\':2 6\':2 1\'\':6 6\':2',
      '7\':2 7\':1 7\':1 5\':2 7\':2 2\'\':6 7\':2',
      '1\'\':4 5\':2 3\':2 5\':2 1\'\':6',
    ],
    bass: [0, _, 0, 0, 12, _, 0, _, 7, _, 0, 0, 12, _, 7, _],
    stabs: 'x.....x...x.....',
    drums: { kick: 'x...x...x...x...', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.x.x.', cymbal: 'x...............' },
  }),
};

// handy for the README and for tests
// ---- 10. Christmas Pier: "Grumpy Santa Stomp", a sneaky sleigh-bell march that cannot help being jolly (C minor) ----
THEMES[10] = theme('Grumpy Santa Stomp', {
  key: 0, scale: 'min', base: 72, gain: 1.05, tempo: 1.04, voice: 'bell', bassVoice: 'tuba', stab: 'brass',
  chords: 'i i iv V i bVI iv V',
  tune: [
    "5,:2 1:2 3:2 1:2 5:4 3:2 1:2",
    "2:2 3:2 2:2 7,:2 1:6 -:2",
    "4:2 6:2 1':2 6:2 4:4 6:2 4:2",
    "5:2 #7:2 2':2 #7:2 5:6 -:2",
    "5,:2 1:2 3:2 5:2 1':4 5:2 3:2",
    "6:2 1':2 3':2 1':2 6:4 1':4",
    "4':2 3':2 2':2 1':2 6:2 4:2 2:2 4:2",
    "5:2 5:2 #7:2 2':2 5':4 -:4",
  ],
  bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, 5, _],
  stabs: '....x.......x...',
  arp: { pat: [0, 1, 2, 1], wave: 'sine', oct: 24, vol: 0.022, every: 2 },
  drums: { thump: 'x.......x.......', sleigh: 'x.x.x.x.x.x.x.x.', snare: '....x.......x..x', tick: '..x...x...x...x.' },
});

// ---- 11. Marshmallow Shore: "Sherbet Skip", a bubbly, bouncy skip (B flat major) ----
THEMES[11] = theme('Sherbet Skip', {
  key: 10, scale: 'maj', base: 70, gain: 1.1, tempo: 1.1, swing: 0.25, voice: 'pluck', bassVoice: 'pizz', stab: 'pluck',
  chords: 'I IV I V vi IV ii V',
  tune: [
    "3:2 5:2 1':2 5:2 3:2 5:2 1':4",
    "6:3 6:1 1':2 6:2 4:4 6:4",
    "5:2 3:2 5:2 1':2 3':4 1':4",
    "2':3 2':1 7:2 5:2 2:4 -:4",
    "6:2 1':2 3':2 1':2 6:2 1':2 3':4",
    "4':2 1':2 6:2 1':2 4':4 6:4",
    "2:2 4:2 6:2 4:2 2':4 6:4",
    "5:2 7:2 2':2 5':2 5':4 -:4",
  ],
  bass: [0, _, 7, _, 0, _, 7, _, 0, _, 7, _, 12, _, 7, _],
  stabs: '..x...x...x...x.',
  arp: { pat: [0, 1, 2, 1], wave: 'triangle', oct: 12, vol: 0.02 },
  drums: { kick: 'x.......x.......', clap: '....x.......x...', shake: 'x.x.x.x.x.x.x.x.', snap: '..........x...x.' },
});

// ---- 12. Spiral Bay: "Round and Round", a tune that keeps circling down the same four chords (A minor) ----
THEMES[12] = theme('Round and Round', {
  key: 9, scale: 'min', base: 69, gain: 1.0, tempo: 1.08, echo: 0.3, voice: 'pan', bassVoice: 'synth', stab: 'pluck',
  chords: 'i bVII bVI V i bVII bVI V',
  tune: [
    "1:2 2:2 3:2 2:2 1:2 3:2 5:4",
    "7,:2 1:2 2:2 1:2 7,:2 2:2 4:4",
    "6,:2 7,:2 1:2 7,:2 6,:2 1:2 3:4",
    "5,:2 6,:2 #7,:2 6,:2 5,:2 #7,:2 2:4",
    "5:2 1':2 3':2 1':2 5:2 1':2 3':4",
    "4:2 7:2 2':2 7:2 4:2 7:2 2':4",
    "3:2 6:2 1':2 6:2 3:2 6:2 1':4",
    "2:2 5:2 #7:2 5:2 2':4 -:4",
  ],
  bass: [0, _, 0, 12, _, 0, 7, _, 0, _, 0, 12, _, 7, 12, _],
  stabs: '....x.......x...',
  arp: { pat: [0, 1, 2, 1], wave: 'sine', oct: 12, vol: 0.024 },
  drums: { kick: 'x...x...x...x...', clap: '....x.......x...', shake: 'x.xxx.xxx.xxx.xx', rim: '......x.......x.' },
});

export const THEME_NAMES = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.name]));

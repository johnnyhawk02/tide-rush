// Shared constants for Tide Rush.
// Distances are in metres. "s" is distance along the boardwalk; the player runs toward -Z.

export const LANE_W = 2.2;
export const laneX = (lane) => lane * LANE_W;
export const DECK_HALF = 4.5;      // half width of the boardwalk deck
export const CHUNK = 40;           // length of one scenery chunk
export const WATER_Y = -2.6;
export const PLAT_H = 1.5;         // height of cargo platforms
export const ZONE_CHUNKS = 7;      // chunks per level
export const ZONE_LEN = CHUNK * ZONE_CHUNKS;
// Zone ids: 0 promenade, 1 grand pier, 2 old harbour, 3 midnight funfair, 4 storm point, 5 sandcastle bay, 6 smugglers' cove, 7 frosty pier,
// 8 the sewers (underground), 9 space pier, 10 Christmas pier (where Grumpy Santa lives), 11 Marshmallow Shore (the sweets world),
// 12 Spiral Bay (where the whole world corkscrews; see TWIST in kit.js), 13 Sky-High Mountain (one great hill; see HILL in kit.js).
// The levels are played in this order, then the cycle repeats.
export const ZONE_ORDER = [0, 8, 12, 13, 10, 11, 1, 9, 5, 2, 3, 6, 4, 7];
export const XMAS = 10, SPIRAL = 12, MOUNTAIN = 13;
// The levels whose road is a hill: [height in metres, number of dips along it, how deep the dips are (0 to 1)].
export const HILLS = { 13: [40, 1, 0] };
export const ZONES = ZONE_ORDER.length;
// underground levels have a roof, so nothing in the sky can be seen from them
export const ROOFED = (zone) => zone === 6 || zone === 8;
export const zoneOfLevel = (i) => ZONE_ORDER[((i % ZONES) + ZONES) % ZONES];

export const SPEED0 = 11;      // a gentle jog to start with
export const SPEED1 = 31;

// Running speed as a function of distance covered in this run.
export function speedAt(run) {
  return SPEED0 + (SPEED1 - SPEED0) * (1 - Math.exp(-Math.max(0, run) / 2100));
}
// 0..1 difficulty derived from speed.
export function diffAt(run) {
  return (speedAt(run) - SPEED0) / (SPEED1 - SPEED0);
}
// Jump airtime shortens a little as the game speeds up so jumps stay snappy.
export function jumpTimeAt(run) {
  return 0.62 - 0.1 * diffAt(run);
}
export const JUMP_H = 2.0;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

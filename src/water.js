// What water looks like: shared by the sea (sky.js) and by the tide that chases Robyn (tide.js), so that the two always match.
// Everything is made in code: a small repeating picture of ripples and foam, and the shader code that lights the water with it.
import * as THREE from 'three';
import { makeRng } from './kit.js';

// A 256 x 256 tile that repeats without a seam. It is not a picture to look at: each channel is a different ingredient.
//   red, green: which way the surface tilts at each point of a patch of wind ripples (used for glints and reflections)
//   blue: a field of round bubbles, as how far each point is from the middle of the nearest one: the foam is whatever lies furthest
//         from them all, which makes a net with rounded holes (a distance, not a drawing, so its edges stay crisp close to the camera)
//   alpha: big soft blotches, for patches of lighter and darker water
let noise = null;
export function waterNoise() {
  if (noise) return noise;
  const S = 256, data = new Uint8Array(S * S * 4), rng = makeRng(90210), TAU = Math.PI * 2;
  // ripples: a sum of little waves, each of which fits the tile a whole number of times
  const waves = [];
  while (waves.length < 30) {
    const ang = (rng() - 0.5) * 2.4 + (waves.length % 5 === 0 ? 1.6 : 0), k = 2 + Math.floor(Math.pow(rng(), 1.6) * 15);
    const kx = Math.round(Math.cos(ang) * k), ky = Math.round(Math.sin(ang) * k);
    if (kx || ky) waves.push([kx, ky, 1 / Math.pow(Math.hypot(kx, ky), 0.85), rng() * TAU]);
  }
  const blots = [];
  for (let i = 0; i < 9; i++) blots.push([Math.round((rng() - 0.5) * 6), Math.round((rng() - 0.5) * 6), 0.5 + rng(), rng() * TAU]);
  // the foam net: the edges between the cells round a scatter of points (one to each square of a grid, so they are evenly spread)
  const G = 7, pts = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([(i + 0.04 + rng() * 0.92) / G, (j + 0.04 + rng() * 0.92) / G]);
  const gx = new Float32Array(S * S), gy = new Float32Array(S * S);
  let gMax = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, n = y * S + x;
    let dx = 0, dy = 0;
    for (const [kx, ky, a, p] of waves) { const c = Math.cos(TAU * (kx * u + ky * v) + p) * a; dx += c * kx; dy += c * ky; }
    gx[n] = dx; gy[n] = dy; gMax = Math.max(gMax, Math.abs(dx), Math.abs(dy));
    let f1 = 9, f2 = 9;
    const ci = Math.floor(u * G), cj = Math.floor(v * G);
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ii = ci + a, jj = cj + b, pt = pts[((jj + G) % G) * G + ((ii + G) % G)];
      const d = Math.hypot(pt[0] + Math.floor(ii / G) - u, pt[1] + Math.floor(jj / G) - v);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    let s = 0, w = 0;
    for (const [kx, ky, a, p] of blots) { s += Math.sin(TAU * (kx * u + ky * v) + p) * a; w += a; }
    data[n * 4 + 2] = Math.max(0, Math.min(255, f1 * G * 0.95 * 255));
    data[n * 4 + 3] = Math.max(0, Math.min(255, (0.5 + (s / w) * 1.1) * 255));
  }
  for (let n = 0; n < S * S; n++) { data[n * 4] = 127.5 + (gx[n] / gMax) * 127.5; data[n * 4 + 1] = 127.5 + (gy[n] / gMax) * 127.5; }
  noise = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.magFilter = THREE.LinearFilter; noise.minFilter = THREE.LinearMipmapLinearFilter;
  noise.generateMipmaps = true; noise.anisotropy = 4; noise.needsUpdate = true;
  return noise;
}

// The long, slow swell of the open sea: four trains of waves, each with rounded troughs and slightly sharper crests.
// seaSwell(w, t) gives (height, slope along x, slope along z) for a wave height of 1, at a point of the sea (w, in metres)
// The vertex shader uses it to move the surface and the fragment shader to light every pixel of it, so there are no facets.
export const SWELL_GLSL = `
vec3 seaWave( vec2 w, vec2 dir, float len, float amp, float speed, float t ) {
  float k = 6.2831853 / len, ph = dot( w, dir ) * k + t * speed;
  float s = 0.5 + 0.5 * sin( ph ), c = cos( ph ), p = pow( s, 1.5 );
  return vec3( amp * ( 2.0 * p - 1.0 ), amp * 1.5 * sqrt( s ) * c * k * dir );
}
vec3 seaSwell( vec2 w, float t ) {
  return seaWave( w, vec2( 0.34, 0.94 ), 33.0, 0.2, 0.9, t ) + seaWave( w, vec2( -0.62, 0.78 ), 20.0, 0.15, 1.2, t + 2.0 )
    + seaWave( w, vec2( 0.88, 0.47 ), 12.5, 0.07, 1.65, t + 4.0 ) + seaWave( w, vec2( -0.17, -0.98 ), 7.5, 0.035, 2.1, t + 1.0 );
}
`;

// The colours and the light. Every material that draws water has these uniforms (see waterUniforms) and calls:
//   waterRipple(w)        two layers of ripples drifting across one another: xy is the tilt of the surface, z the bubbles and w the blotches
//   waterColour(...)      the colour of a patch of water, before any foam
//   foamNet(r, amount)    lacy foam: amount 0 is none, 0.5 is a net of thin lines, 1 is solid white with a few holes
//   foamLace(w, amount)   the same, in a finer net, for water that is seen close to
export const WATER_GLSL = `
uniform sampler2D uNoise;
uniform vec3 uDeep, uShal, uFoam, uSun, uSky, uSunDir, uFog;
uniform float uTime, uNear, uFar;
vec4 waterRipple( vec2 w ) {
  vec4 a = texture2D( uNoise, w * 0.058 + uTime * vec2( 0.011, 0.017 ) );
  vec4 b = texture2D( uNoise, w.yx * 0.139 + uTime * vec2( -0.021, 0.013 ) + 0.37 + ( a.rg - 0.5 ) * 0.05 );
  return vec4( ( a.rg - 0.5 ) * 1.5 + ( b.gr - 0.5 ) * 0.9, a.b * 0.55 + b.b * 0.45, a.a );
}
float foamNet( vec4 r, float amount ) {
  float th = mix( 0.8, 0.1, amount );
  return smoothstep( th - 0.035, th + 0.035, r.z ) * smoothstep( 0.0, 0.1, amount );
}
// N: the surface normal (with the ripples in it), V: towards the eye, tone: 0 for the darkest water to 1 for the palest
vec3 waterColour( vec3 N, vec3 V, float tone, float glint ) {
  vec3 c = mix( uDeep, uShal, clamp( tone, 0.0, 1.0 ) );
  // light from the sky above and from the sun; flat water in the open comes out at 1, so the palette's colours are the sea's colours
  c *= ( 0.6 + 0.26 * N.y + 0.3 * max( dot( N, uSunDir ), 0.0 ) ) / ( 0.86 + 0.3 * uSunDir.y );
  float fr = pow( 1.0 - max( dot( N, V ), 0.0 ), 4.0 );
  c = mix( c, uSky, fr * 0.62 );
  float sp = max( dot( reflect( -uSunDir, N ), V ), 0.0 );
  c += uSun * ( pow( sp, 160.0 ) * 1.5 + pow( sp, 24.0 ) * 0.1 ) * glint;
  return c;
}
// finer foam, for water that is seen close to: the wave of the tide, and what it leaves behind it
float foamLace( vec2 w, float amount ) {
  vec4 a = texture2D( uNoise, w * 0.28 );
  vec4 b = texture2D( uNoise, w.yx * 0.5 + 0.31 + ( a.rg - 0.5 ) * 0.06 );
  return foamNet( vec4( 0.0, 0.0, a.b * 0.55 + b.b * 0.45, 0.0 ), amount * ( 0.82 + 0.36 * a.a ) );
}
// how much foam a breaking wave leaves on the water behind it: patches that thin out with distance (d: how far behind the front of the wave)
float foamWake( vec4 r, float d ) { return ( 0.2 + 0.5 * smoothstep( 0.32, 0.66, r.w + ( r.z - 0.4 ) * 0.3 ) ) * exp( -max( d, 0.0 ) * 0.07 ); }
// foam has some body to it: bright where it faces the sky, and tinted by the water in its hollows
vec3 foamColour( vec3 N ) { return mix( mix( uShal, uFoam, 0.55 ), uFoam, clamp( 0.45 + 0.6 * N.y + 0.25 * dot( N, uSunDir ), 0.0, 1.0 ) ); }
vec3 waterFog( vec3 c, float depth ) { return mix( c, uFog, smoothstep( uNear, uFar, depth ) ); }
`;

// The uniforms that WATER_GLSL needs. The sea owns the real ones; anything else that draws water shares them (pass the sea's as "from").
export function waterUniforms(from) {
  const col = () => ({ value: new THREE.Color(0) });
  const u = from || { uNoise: { value: waterNoise() }, uDeep: col(), uShal: col(), uFoam: { value: new THREE.Color(0xffffff) }, uSun: col(), uSky: col(), uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uFog: col(), uTime: { value: 0 }, uNear: { value: 70 }, uFar: { value: 300 } };
  const out = {};
  for (const k of ['uNoise', 'uDeep', 'uShal', 'uFoam', 'uSun', 'uSky', 'uSunDir', 'uFog', 'uTime', 'uNear', 'uFar']) out[k] = u[k];
  return out;
}

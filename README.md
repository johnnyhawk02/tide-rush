# Tide Rush

A 3D endless lane runner for the browser. Robyn sprints along the coast while the tide chases her, through ten levels that repeat and get faster: the Promenade at sunrise, the Sewers, the Grand Pier, Space Pier, Sandcastle Bay, the Old Harbour at sunset, the Midnight Funfair, Smugglers' Cove, Storm Point and Frosty Pier. Her pets join in: Izzi the border collie and Pixel the black and white cat. Robyn has brown hair with a full straight fringe and a high ponytail, modelled on the real Robyn. Her face is drawn rather than modelled: flat cartoon features painted on a canvas in `src/robyn.js` (`drawFace`) and wrapped round the front of a smooth head, with a smile, a blink and a shocked look. She can only change lane and jump. Nothing in the game ever needs a slide or a duck.

Everything is original and generated in code: the models, the textures, the music and the sound effects. There are no downloaded assets.

## Play

Play it in the browser at https://johnnyhawk02.github.io/tide-rush/. Every push to `main` rebuilds the game and republishes that page (`.github/workflows/pages.yml` pushes the build to the `gh-pages` branch).

To run it yourself:

```
npm install
npm run dev        # local server with hot reload
npm run build      # production build in dist/ (index.html + game.js, runs from any static host)
```

`dist/` is a plain static site. Open it through any web server (for example `npm run preview`).

## Controls

| | Keyboard | Touch |
|---|---|---|
| Change lane | Left / Right arrows, or A / D | Swipe left or right |
| Jump | Up arrow, W or Space | Swipe up, or tap |
| Pause | Esc or P | Pause button |
| Sound on or off | M | Speaker button |

Jumps are buffered and you can change lane in mid-air.

## Rules

- Low obstacles (crates, lobster pots, barriers, deckchairs, rolling barrels, beach balls and snowballs, a crossing trolley, gaps in the planks) are jumped or dodged.
- Tall obstacles (ice cream cart, beach huts, cargo stacks, a boat, containers, sandcastle towers, surfboard racks, crystals, treasure, snowmen, fir trees) are full height and must be dodged.
- Cargo platforms give a high route with bonus shells. Use the ramp, or jump on.
- Hitting anything is a stumble, even running head-on into something big (it gets knocked flying). Robyn looks back at the camera in shock, and each stumble lets the tide gain on her; it falls back again over a few seconds. She can take two stumbles in a row. A third while the tide is "right behind you" ends the run (`TIDE_STEP`, `TIDE_LIMIT` and `TIDE_FADE` in `main.js`). Only a fall through a gap in the planks ends the run straight away.
- Score comes from distance and golden shells. The combo multiplier (up to x8) grows with shell streaks, clean hops and close calls, and resets on a stumble.
- Power-ups: shell magnet, bubble shield (absorbs one hit), spring boots (double jump), double score.
- Hoverboard: a hovering surfboard. For 12 seconds Robyn glides over gaps in the planks, and the board soaks up one hit (it breaks instead of her stumbling or crashing). Low obstacles still need a jump.
- Rocket ride: the firework rocket power-up lifts Robyn above everything for a few seconds, with a trail of shells in the sky. She lands with a bang that clears the boardwalk ahead.
- Warp tunnels: most levels have one glowing portal, one lane over from the safe path. Run into it for a bonus tunnel full of shells and pearls that comes out at the next level.
- Bounce pads launch Robyn into a high arc of shells with a pearl at the top. Pearls are worth 100 points and count as 5 shells.
- Giant crabs scuttle across all three lanes on the beach levels, and penguins waddle across on Frosty Pier. Jump them.
- The Sewers: an underground brick tunnel with giant rats. Big ones sit up in a lane and must be dodged, small ones are jumped, and some scurry across all three lanes. A laser zapper pickup always appears soon after the way in. While it lasts (11 seconds) Robyn fires at the nearest rat ahead by herself, and each one vanishes in a puff of sparkles for 40 points.
- Space Pier: UFOs hover over the lanes and fire a plasma ball that skims along a lane toward Robyn. Dodge it or jump it. Her mega laser is switched on for the whole level and shoots each UFO down once it is close (120 points). The plasma balls are generated like rolling barrels, so the safe path is never blocked.
- Izzi and Pixel: every so often one of them runs in from behind and follows Robyn's exact path for a while. Izzi (about 16 seconds) rounds up shells like a magnet. While Pixel is there (about 13 seconds) every shell and pearl counts double. They leave when the rocket or a warp tunnel starts, and trot beside Robyn on the title screen.
- Letters: collect R, O, B, Y and N for a big bonus, a magnet and double score.
- Each level is 280 m long, so a new one arrives about every 20 seconds at first and sooner as she speeds up, and each pays a level bonus. The Midnight Funfair has fireworks, Storm Point has rain, lightning and waves breaking over the rail, Smugglers' Cove glows with crystals, and Frosty Pier has snow and the northern lights.
- In the sky: now and then a plane tows a banner past, a jet leaves a vapour trail, and geese fly over. Very occasionally the Tide TV helicopter flies in to film Robyn for a few seconds (worth 500 points). None of it can be hit.
- Outfits: shells from every run are banked, and the total unlocks new outfits for Robyn (150, 400 and 900 shells). Pick one on the title screen.

## Code map

| File | What it does |
|---|---|
| `src/main.js` | Game loop, player physics, collisions, scoring, rocket mode, warp tunnels, weather, camera, quality scaling |
| `src/track.js` | Endless track: scenery chunks, deck with real gaps, the fair pattern generator (obstacles, pads, portals, letters) |
| `src/obstacles.js` | Obstacle, platform, pad, portal, shell, pearl, letter and power-up models, with pooling |
| `src/scenery.js` | Scenery for the ten levels |
| `src/pets.js` | Izzi and Pixel: their models, animation, and when they join and leave |
| `src/config.js` | Sizes, speeds, level length (`ZONE_CHUNKS`) and the order the levels are played in (`ZONE_ORDER`) |
| `src/robyn.js` | Robyn's model, outfits, rocket and procedural animation |
| `src/sky.js` | Sky, stars, northern lights, clouds, rain, snow, lightning, sea shader, and one lighting palette per level |
| `src/skylife.js` | The banner plane, jet, geese and the Tide TV helicopter |
| `src/fx.js` | Particles, the tide wave, the warp tunnel, ground shadow |
| `src/music.js` | The songbook: one original tune per level, plus the warp tunnel and rocket tunes |
| `src/audio.js` | The synthesiser that plays the songbook, and every sound effect (Web Audio) |
| `src/input.js`, `src/ui.js` | Keyboard and touch input, HUD and menus |
| `src/kit.js` | Modelling kit that merges each model into one vertex-coloured mesh, and the world bend |

## Music and sound

Every level has its own original tune, and the warp tunnel and the rocket each have one too. They are written in `src/music.js` as scale degrees (`"5:2"` is the fifth note of the scale held for two 16th-note steps, `'` and `,` move up and down an octave, `-` is a rest), with chords as roman numerals, so a tune is easy to read and change.

| Level | Tune | Style |
| --- | --- | --- |
| The Promenade (and the title screen) | Tide Rush | The main theme |
| The Sewers | Sneaky Pipes | Tip-toe swung blues with an echo |
| The Grand Pier | Pier Parade | Brass-band march |
| Space Pier | Moon Hop | Floaty space disco |
| Sandcastle Bay | Bucket and Spade | Steel-pan calypso |
| The Old Harbour | Harbour Hornpipe | Swung accordion reel |
| The Midnight Funfair | Carousel Lights | Fairground-organ waltz |
| Smugglers' Cove | Lantern Jig | Echoing minor-key jig |
| Storm Point | Storm Chase | Galloping chase |
| Frosty Pier | Sparkle Frost | Bells and sleigh bells |
| Warp tunnel, rocket | Warp Dash, Lift Off | Racing runs, a fanfare |

`audio.setTheme(id)` changes tune on the next beat. The sound effects are methods on `GameAudio` in `src/audio.js`: footsteps that change with the ground, rats, UFOs, the lasers, Izzi and Pixel, each level's background sounds (drips, a ship's horn, wind, fairground organ), warning ticks as a power-up runs out, and jingles for a new level and a new best score.

Nobody can listen in the build environment, so the tunes and effects are checked by rendering them offline and measuring how loud each one is. If something sounds off, the notes and volumes are all in those two files.

## The curved world

The coast curves down and away ahead of Robyn, so things rise over the horizon as she runs. It is a vertex-shader bend (`BEND_K` and `BEND_START` in `src/kit.js`), flat for the first few metres in front of her, so collisions and the pattern generator still work in a flat world. Built-in three.js materials get it through a patched `project_vertex` shader chunk, and custom shaders call `bendWorld()`. `Builder.build()` splits long triangles (`sliceZ`) so the deck, rails and sea walls follow the curve.

## How fairness is guaranteed

The generator in `track.js` keeps one safe lane per row. The safe lane moves by at most one lane between rows, and its cell is always empty or jumpable. Row spacing scales with speed, so there is always time to react.

For testing, the game has a simple auto-player that follows the safe lane:

```js
__game.restart(); __game.bot = true;
__game.simulate(420);   // seven minutes of play without drawing
```

If the auto-player ever stumbles, a pattern is unfair. Set `__game.botWarp = true` as well to make it take every warp portal. `__game.startAt(distance, ['pad', 'portal'])` begins a run part-way along the coast, optionally forcing the first row types, which is handy for looking at a level (each level is 280 m long, so level N of the first lap starts at (N - 1) x 280 m: the Sewers at 280 m and Space Pier at 840 m).

Saved in the browser (localStorage): best score, sound on or off, shells banked, chosen outfit.

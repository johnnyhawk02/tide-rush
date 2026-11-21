# Tide Rush

A 3D endless lane runner for the browser. Robyn sprints along the coast while the tide chases her, through nineteen levels that repeat and get faster: the Promenade at sunrise, the Glass Tunnel under the sea, Chocolate Coast, Moo Town, Spiral Bay, the Sewers, the Land of Mirrors, Sky-High Mountain, Christmas Pier, Rollercoaster World, Marshmallow Shore, the Grand Pier, Space Pier, Sandcastle Bay, the Old Harbour at sunset, the Midnight Funfair, Smugglers' Cove, Storm Point and Frosty Pier. Her pets join in: Izzi the border collie and Pixel the black and white cat. Robyn has brown hair with a full straight fringe and a high ponytail, modelled on the real Robyn. Her face is drawn rather than modelled: flat cartoon features painted on a canvas in `src/robyn.js` (`drawFace`) and wrapped round the front of a smooth head, with a smile, a blink and a shocked look. She can only change lane and jump. Nothing in the game ever needs a slide or a duck.

Everything is original and generated in code: the models, the textures, the music and the sound effects. There are no downloaded assets.

## Play

Play it in the browser at https://johnnyhawk02.github.io/tide-rush/. Every push to `main` rebuilds the game and republishes that page (`.github/workflows/pages.yml` pushes the build to the `gh-pages` branch).

On an iPad or phone it installs like an app: open the page in Safari, tap Share, then "Add to Home Screen". It gets its own icon, opens full screen, and still starts without a connection once it has been opened once (`public/manifest.webmanifest`, `public/sw.js` and the icons in `public/icons/`, which `node scripts/make-icons.cjs` redraws from Robyn's model while `npm run preview` is running).

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

On a touch screen one swipe is one move: however long or fast the swipe is, Robyn changes lane once, and the finger has to lift before the next move (`src/input.js`).

Jumps are buffered and you can change lane in mid-air.

## Rules

- Low obstacles (crates, lobster pots, barriers, deckchairs, rolling barrels, beach balls and snowballs, a crossing trolley, gaps in the planks) are jumped or dodged.
- Tall obstacles (ice cream cart, beach huts, cargo stacks, a boat, containers, sandcastle towers, surfboard racks, crystals, treasure, snowmen, fir trees) are full height and must be dodged.
- Cargo platforms give a high route with bonus shells. Use the ramp, or jump on.
- Hitting anything is a stumble, even running head-on into something big (it gets knocked flying). Robyn looks back at the camera in shock, and each stumble lets the tide gain on her. She has five stumbles, shown as five hearts under the ROBYN letters. A heart comes back after about eight seconds of clean running, and a stumble with no hearts left ends the run (`TIDE_STEP`, `TIDE_LIMIT` and `TIDE_FADE` in `main.js`). Only a fall through a gap in the planks ends the run straight away.
- Score comes from distance and golden shells. The combo multiplier (up to x8) grows with shell streaks, clean hops and close calls, and resets on a stumble.
- Power-ups: shell magnet, bubble shield (absorbs one hit), spring boots (double jump), double score.
- Hoverboard: a hovering surfboard. For 12 seconds Robyn glides over gaps in the planks, and the board soaks up one hit (it breaks instead of her stumbling or crashing). Low obstacles still need a jump.
- Rocket ride: the firework rocket power-up lifts Robyn above everything for a few seconds, with a trail of shells in the sky. She lands with a bang that clears the boardwalk ahead.
- The Star Tunnel: most levels have one glowing portal marked SPACE, one lane over from the safe path, with a little galaxy turning in it. Run into it and Robyn is in deep space, running along a see-through tunnel of glowing wire that sweeps gently round to one side, with shells and pearls to collect and nothing to dodge. Through the wire are a starry sky with clouds of glowing gas, three spiral galaxies turning slowly far away, star dust streaming past, and sights that sail by one after another: a ringed planet, a comet, an ocean world with two moons, tumbling asteroids with glowing crystals, a striped giant with a great storm, a little satellite and a baby sun. Each trip shows the next two or three, so there is always something new to see and never a crowd. The tunnel comes out through a bright gate at the next level's gateway (`src/startunnel.js`; it took the place of the old neon warp tunnel).
- Bounce pads launch Robyn into a high arc of shells with a pearl at the top. Pearls are worth 100 points and count as 5 shells.
- Giant crabs scuttle across all three lanes on the beach levels, and penguins waddle across on Frosty Pier. Jump them.
- The Sewers: an underground brick tunnel with giant rats. Big ones sit up in a lane and must be dodged, small ones are jumped, and some scurry across all three lanes. A laser zapper pickup always appears soon after the way in. While it lasts (13 seconds) Robyn fires at the nearest rat ahead by herself, and each one vanishes in a puff of sparkles for 40 points.
- Space Pier: UFOs hover over the lanes and fire a plasma ball that skims along a lane toward Robyn. Dodge it or jump it. Her mega laser is switched on for the whole level and shoots each UFO down once it is close (120 points). The plasma balls are generated like rolling barrels, so the safe path is never blocked.
- Attackers everywhere: every level has its own flying attacker that hovers over a lane and lobs something down it. Bomber gulls in flying goggles drop giant eggs (Promenade, Grand Pier, Old Harbour, Sandcastle Bay), slime bats spit slime (Funfair, Smugglers' Cove, Sewers), cross storm clouds throw ball lightning (Storm Point), snow clouds drop snowballs (Frosty Pier and Christmas Pier) candyfloss clouds drop bonbons (Marshmallow Shore) little twisters fling balls of wind (Spiral Bay) and grumpy eagles drop giant pine cones (Sky-High Mountain), and a cheeky balloon bandit, a monkey in a basket under a bunch of balloons, lobs water balloons (Rollercoaster World). In the Glass Tunnel a little octopus in a propeller hat squirts blobs of ink, and on Chocolate Coast a cheeky flying jug pours giant chocolate drops, and over Moo Town a bossy crow in a straw hat drops cobs of corn. In the Land of Mirrors a cheeky flying hand mirror flashes dazzles of light down the lane. In the sewers some rats also charge straight down a lane. Their shots are generated like rolling barrels, never on the safe path (`FLYERS` and `ATTACKER` in `src/track.js`).
- One thing at a time: the game paces itself so the screen never gets crowded. After any special row (a barrier, a gap, a platform, a roller, an attacker, something crossing, a bounce pad) come a couple of plain rows (`g.quiet` in `genRow`, `src/track.js`); flying attackers come one at a time, a few seconds apart; pick-ups and letters are spaced out and wait while invaders or Grumpy Santa are overhead; optional invader waves need two quiet levels since the last visitors; Izzi and Pixel take turns and wait until a big show is over, as do the banner plane, the geese and the helicopter (`showOn()` in `src/main.js`); and messages appear one at a time instead of piling up (`popup` in `src/ui.js`).
- Laser zappers everywhere: most levels hand one out early on and they also turn up among the other power-ups. The laser lasts 13 seconds and zaps flying attackers, rats, crabs and moon rovers in a harmless puff. Picking up another while one is running powers it up to a double and then a triple laser, which fires faster and reaches further (`LASER_LV` in `src/main.js`).
- Alien invaders: a formation of fifteen little aliens (one-eyed Peepers, box-headed Boxbots and three-eyed Blobbies, all Tide Rush's own) marches from side to side in the sky ahead of Robyn, stepping lower as it goes and quicker as its numbers thin. Robyn shoots them down by herself, lowest row first and nearest her lane first, with or without a laser pickup. Each is worth 60 points and clearing the wave earns a 1,500 point bonus. Space Pier always has a wave, and other open-air levels get one now and then. The formation itself cannot hurt her. Its bombs can, and those are laid by the track generator like rolling barrels, so the safe path is never blocked (`src/invaders.js`, and `waves` in `src/track.js`).
- Christmas Pier and Grumpy Santa: a snowy night-time pier with candy-cane arches, a giant Christmas tree, Santa's toy workshop, a gingerbread house and reindeer. The obstacles are giant presents, Christmas puddings, sledges, nutcracker soldiers, candy canes and rolling baubles, and a clockwork toy train trundles across the lanes. A giant Santa with glowing red eyes hovers ahead in a rocket sleigh, lines himself up over a lane (his eyes flare just before he throws) and lobs presents down it. Robyn zaps him by herself, with or without a laser pickup, and the "Santa's grumpiness" bar runs down with every hit. When it is empty his eyes stop glowing, he smiles, goes "ho ho ho" and flies off, for a 2,500 point bonus. He cannot hurt Robyn himself, and his presents are laid by the track generator like rolling barrels, so the safe path is never blocked. No portal appears while he is about (`src/santa.js`, and `waves` in `src/track.js`).
- Marshmallow Shore: the sweets world, under candyfloss clouds beside a strawberry-milkshake sea. Sour-belt rainbows arch over the pier, and beside it are marshmallow hills, lollipop and candyfloss trees, a cupcake house, a jelly castle and a giant dropped ice cream. The obstacles are sleepy-faced marshmallows, doughnuts, jellies, wrapped toffees, chocolate bars, giant lollipops, cupcakes and sundaes. A runaway gingerbread man jogs across the lanes, rainbow gobstoppers roll down them, and grumpy candyfloss clouds drop striped bonbons. There are extra bounce pads.
- Spiral Bay: the whole world corkscrews. Everything ahead of Robyn twists round a line that runs up the middle of the pier, so the track, the sea and the scenery wind away into the distance like a helter-skelter, first one way, then back, then the other way (`TWIST` in `src/kit.js`, `TWIST_MAX` in `src/main.js`). The twist is nothing at Robyn's feet and grows gently, so the lanes just in front of her stay level and the controls are exactly the same. Striped hoops with spiral medallions ring the pier, and beside it are a helter-skelter, a tower with a giant turning spiral wheel, a house in a turret shell, giant pinwheels, whirlpools and twisted rock spires, under a violet sky with a great pink whirl in it. The obstacles are sea snails, rainbow springs, spiral shells, hypnotic wheels, barber poles, a jack-in-the-box and toy helter-skelters; a humming top whirls across the lanes and giant marbles roll down them.
- Sky-High Mountain: the road goes up and up, then down and down. The level is one real hill, 40 m high: the boardwalk climbs out of the sea to a snowy summit with a banner over the top (500 points for reaching it), then drops away to the next level far below, and the camera tips to follow the slope. Everything standing on the road rises with it, while the sea stays where it is, with little boats far below the cliff (`HILL` and `hillHeight` in `src/kit.js`, `HILLS` in `src/config.js`). The hill is drawn by the shader, so the lanes, jumps and the fair path are exactly the same as on the flat. On the way are meadows with flowers and sheep, a chalet, a waterfall, goats on boulders, a cable car, pine woods and snowy peaks. The obstacles are logs, boulders, cheeses, hay bales, pine trees, cairns, signposts and wood stores; a mountain goat skips across the lanes and snowballs roll down them.
- The Glass Tunnel: the road dips down through the surface of the sea and runs along the sea bed inside a glass tube, 26 m down at its deepest, then climbs back out into the daylight. All round the glass there is kelp swaying, coral, rocks and sea grass on the sand, shoals of little fish, and one big friendly creature at a time: a turtle, a shark cruising round and round over the roof, jellyfish, a manta ray, a whale far off in the blue, a sunken rowing boat, a huge spotted whale shark and an octopus sitting on a rock. The water gets bluer the deeper it goes, light ripples across the floor, bubbles drift up and the surface shimmers overhead. Like the mountain, the dive is drawn by the shader (a hill with a negative height in `HILLS` in `src/config.js`), so the lanes, jumps and the fair path are exactly the same as on the flat; the sea surface is drawn from both sides and stands back from the glass where the tube passes through it (`src/sky.js`). The obstacles are giant clams showing off their pearls, "mind the puddle" signs, mops and buckets, racks of divers' air tanks, an old brass diving suit, a little yellow submarine and a tank of tropical fish; a crab scuttles across the lanes and puffed-up puffer fish roll down them. There are no gaps in the floor, and the rocket flies lower so that it stays under the roof.
- Chocolate Coast: the shore is the squares of an enormous chocolate bar beside a sea of melted chocolate, under a caramel sky with whipped-cream clouds. Alongside are the Cocoa Works (a little factory with wafer-roll chimneys puffing cream), the chocolate falls pouring over a cliff of fudge, a chocolate cottage with a wafer roof, cocoa trees hung with pods, truffle hills, and an eclair laid over the pier as an arch. Cookies, dipped strawberries and sandwich biscuits bob in the chocolate. The obstacles are a giant chocolate bar, an open box of chocolates, a mug of hot chocolate, cookie stacks, a chocolate fountain, a gold-foil bunny, a foil-wrapped egg in an egg cup, a tower of sandwich biscuits and a slice of cake on a stand; a tea trolley with a cake on it runs across the lanes and truffles roll down them.
- Moo Town: the land of the cow people. A green meadow runs beside the pier under a spring sky, and the townsfolk (friendly cartoon cows in dungarees, dresses and jumpers) stand at the fence and wave as Robyn runs by: the farmer with a pitchfork, granny with her handbag, a calf with a balloon, the cook from the milk bar, the farmhand with a bucket. Alongside are the red barn with a cow waving from the hayloft, a milk bar shaped like a carton of milk with milkshakes on the counter, a windmill with turning sails, the town band on their bandstand, and hills with oak and apple trees (one hill has a coat like a cow's). A cow goes fishing from a rowing boat. The obstacles are milk churns, a crate of milk bottles, a water trough with a duck in it, bales of hay, a cheese, a giant milk bottle, a haystack, a scarecrow, a milk float and a butter churn; a calf on a scooter crosses the lanes and round bales roll down them.
- The Land of Mirrors: the sea lies as still as glass and reflects everything that stands in it, and the left side of the world is the mirror image of the right. Giant looking-glasses in gold frames stand on pearl islands (an arched one, a great round one ringed with gems, and a folding one with three panels), with a glass palace with a mirrored dome, crystals, mirror balls turning on gold posts, floating gems, glass swans that glide in step, and a gold picture frame over the pier to run through. The obstacles are a hand mirror on an easel, a heap of gems, glass bricks, a mirror ball in a cradle, a dressing mirror, an obelisk of looking-glass, a wobbly mirror from a hall of mirrors, a tower of crystals and a dressing table ringed with light bulbs; a trolley carrying a looking-glass crosses the lanes and mirror balls roll down them. (The reflections are real geometry: each model in `src/scenery.js` is built with an upside-down copy of itself under the water, see `reflectInto`, and the sea shader in `src/sky.js` turns see-through and still when the level's palette has `mirror: 1`.)
- Rollercoaster World: the boardwalk becomes a rollercoaster. It is carried high over the sea on a white lattice frame with red and yellow coaster rails, climbs a clacking lift hill, goes over two 18 m humps with a plunge between them (250 points and a "Wheee!" over each), swings left and right through sweeping bends while the view leans into each one (`CURVE_MAX` and `BANK_MAX` in `src/main.js`), and runs straight through giant loop-the-loops with a little train whizzing round each. Like the mountain, the humps and bends are drawn by the shader, so the lanes, jumps and the fair path are exactly the same as on the flat. Alongside are a big wheel, a drop tower, a swing ride, a carousel, a second coaster and bunches of balloons. The obstacles are parked coaster cars, turnstiles, hook-a-duck tubs, high strikers, balloon carts, ticket booths and stacks of cars; a dodgem skids across the lanes and runaway coaster cars full of cheering riders roll down them. Christmas Pier sits between the mountain and the coaster on purpose: the shader draws one hill at a time, so two hill levels must not be next to each other.
- A gentle start: a run begins at a jog (`SPEED0` in `src/config.js`). Over the first two levels the rows of obstacles are further apart and emptier, and the trickier things join in one at a time: barriers and gaps after 200 m, rollers and flying attackers only after the first level, things that cross the lanes after 380 m, and alien invaders after 520 m (`ease` in `genRow` in `src/track.js`).
- Izzi and Pixel: every so often one of them runs in from behind and follows Robyn's exact path for a while. Izzi (about 16 seconds) rounds up shells like a magnet. While Pixel is there (about 13 seconds) every shell and pearl counts double. They leave when the rocket or the Star Tunnel starts, and trot beside Robyn on the title screen.
- Letters: collect R, O, B, Y and N for a big bonus, a magnet and double score.
- Each level is 280 m long, so a new one arrives about every 20 seconds at first and sooner as she speeds up, and each pays a level bonus. The Midnight Funfair has fireworks, Storm Point has rain, lightning and waves breaking over the rail, Smugglers' Cove glows with crystals, and Frosty Pier has snow and the northern lights.
- In the sky: now and then a plane tows a banner past, a jet leaves a vapour trail, and geese fly over. Very occasionally the Tide TV helicopter flies in to film Robyn for a few seconds (worth 500 points). None of it can be hit.
- Outfits: shells from every run are banked, and the total unlocks new outfits for Robyn (150, 400 and 900 shells). Pick one on the title screen.

## Code map

| File | What it does |
|---|---|
| `src/main.js` | Game loop, player physics, collisions, scoring, rocket mode, the Star Tunnel, weather, camera, quality scaling |
| `src/track.js` | Endless track: scenery chunks, deck with real gaps, the fair pattern generator (obstacles, pads, portals, letters) |
| `src/obstacles.js` | Obstacle, platform, pad, portal, shell, pearl, letter and power-up models, with pooling |
| `src/scenery.js` | Scenery for the nineteen levels |
| `src/pets.js` | Izzi and Pixel: their models, animation, and when they join and leave |
| `src/invaders.js` | The alien invader waves: the marching formation and which one Robyn shoots next |
| `src/santa.js` | Grumpy Santa: his model, his face (grumpy and jolly), how he moves, throws and is beaten |
| `src/config.js` | Sizes, speeds, level length (`ZONE_CHUNKS`) and the order the levels are played in (`ZONE_ORDER`) |
| `src/robyn.js` | Robyn's model, outfits, rocket and procedural animation |
| `src/sky.js` | Sky, stars, northern lights, clouds, rain, snow, lightning, sea shader, and one lighting palette per level |
| `src/skylife.js` | The banner plane, jet, geese and the Tide TV helicopter |
| `src/fx.js` | Particles, the tide wave, ground shadow |
| `src/startunnel.js` | The Star Tunnel: the wire tunnel, the starry sky, galaxies and the sights that sail past |
| `src/music.js` | The songbook: one original tune per level, plus the Star Tunnel and rocket tunes |
| `src/audio.js` | The synthesiser that plays the songbook, and every sound effect (Web Audio) |
| `src/input.js`, `src/ui.js` | Keyboard and touch input, HUD and menus |
| `src/kit.js` | Modelling kit that merges each model into one vertex-coloured mesh, the world bend, the corkscrew twist of Spiral Bay, and the hills |

## Music and sound

Every level has its own original tune, and the Star Tunnel and the rocket each have one too. They are written in `src/music.js` as scale degrees (`"5:2"` is the fifth note of the scale held for two 16th-note steps, `'` and `,` move up and down an octave, `-` is a rest), with chords as roman numerals, so a tune is easy to read and change.

| Level | Tune | Style |
| --- | --- | --- |
| The Promenade (and the title screen) | Tide Rush | The main theme |
| The Glass Tunnel | Deep Blue | Floating bells that rise like bubbles and drift back down, with an echo |
| Chocolate Coast | Cocoa Stroll | Smooth swinging clarinet stroll with brushes |
| Moo Town | Moo Town Hoedown | Bouncy barn dance on a banjo with an oom-pah bass |
| The Land of Mirrors | Mirror, Mirror | Glassy bells; the second half is the first half played backwards |
| Spiral Bay | Round and Round | Circling pan-pipe tune over four falling chords |
| The Sewers | Sneaky Pipes | Tip-toe swung blues with an echo |
| Sky-High Mountain | Up and Up | Oom-pah climb with yodelling leaps |
| Christmas Pier | Grumpy Santa Stomp | Sneaky minor-key sleigh-bell march |
| Rollercoaster World | Loop the Loop | Fast chip-tune runs up and long swoops down, with brass stabs |
| Marshmallow Shore | Sherbet Skip | Bubbly plucked skip |
| The Grand Pier | Pier Parade | Brass-band march |
| Space Pier | Moon Hop | Floaty space disco |
| Sandcastle Bay | Bucket and Spade | Steel-pan calypso |
| The Old Harbour | Harbour Hornpipe | Swung accordion reel |
| The Midnight Funfair | Carousel Lights | Fairground-organ waltz |
| Smugglers' Cove | Lantern Jig | Echoing minor-key jig |
| Storm Point | Storm Chase | Galloping chase |
| Frosty Pier | Sparkle Frost | Bells and sleigh bells |
| Star Tunnel, rocket | Warp Dash, Lift Off | Racing runs, a fanfare |

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

If the auto-player ever stumbles, a pattern is unfair. Set `__game.botWarp = true` as well to make it take every portal. `__game.startAt(distance, ['pad', 'portal'])` begins a run part-way along the coast, optionally forcing the first row types, which is handy for looking at a level (each level is 280 m long, so level N of the first lap starts at (N - 1) x 280 m: the Glass Tunnel at 280 m, Chocolate Coast at 560 m, Moo Town at 840 m, Spiral Bay at 1,120 m, the Sewers at 1,400 m, the Land of Mirrors at 1,680 m, Sky-High Mountain at 1,960 m, Christmas Pier at 2,240 m, Rollercoaster World at 2,520 m, Marshmallow Shore at 2,800 m and Space Pier at 3,360 m).

Saved in the browser (localStorage): best score, sound on or off, shells banked, chosen outfit.

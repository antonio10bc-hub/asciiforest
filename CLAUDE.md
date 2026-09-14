# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ASCII FOREST` / `SPIRIT_GROVE.EXE` — a browser game with no build step, no package manager, no dependencies, no tests and no linter. An ASCII ecosystem simulation rendered to a 2D canvas with a green-phosphor CRT aesthetic. The player taps to plant seeds; everything after that grows and behaves on its own.

`index.html` is markup only. The stylesheet is `css/style.css` and the game is ten plain `<script>` files in `js/`, loaded in order at the end of `<body>`. `Sounds/` holds four `.wav` assets.

| file | holds |
|---|---|
| `js/state.js` | the canvas handle, tuning constants, every mutable global, the audio system, `SYM`/`COL`/`GAL`/`TASKS`, grid + noise init, and the baked grass/`EL` caches |
| `js/world.js` | draw helpers, occupancy utilities, discovery banners, the CTA prompt, particles, the animal factory and movement, bird/beaver/frog/bee AI, plant growth, river/reeds/flowers, `chkSpawn`, `updTasks` |
| `js/deer.js` | the deer/herd system |
| `js/fire.js` | wildfire spread, `burnPlants`, `applyWater` |
| `js/game.js` | day clock, pause, game over, `restartGame`, tutorial bubbles, tap labels, flicker, `update()` |
| `js/hints.js` | the idle call-to-action layer for the first two tasks |
| `js/render.js` | `render()` and its highlight helpers |
| `js/ui.js` | the gallery/log modal |
| `js/input.js` | `handleTap` and every pointer, touch and keyboard listener |
| `js/debug.js` | the debug panel |
| `js/main.js` | game-over flames and `loop()` |

**These are classic scripts, not modules.** Top-level `let`/`const`/`function` in one file is visible to every file after it, which is what lets the globals stay globals; the cost is that load order in `index.html` is load-bearing, and any code that *runs at load time* (not inside a function) can only reach declarations from files above it. Everything else resolves at call time, after all ten have loaded.

## Running

```bash
python3 -m http.server 8000    # then open http://localhost:8000
```

Serve over HTTP rather than opening the file directly — `file://` breaks the `Sounds/*.wav` loads in most browsers. The page is deployed as-is (GitHub Pages from the repo root); there is nothing to build.

In-game dev affordances:
- **Debug panel** — red `[DEBUG]` button, bottom-right. Buttons jump the simulation to any progression stage (`renderDbg()` builds them, `runDbg(cmd)` executes, both in `js/debug.js`); `UNLOCK ALL` fast-forwards everything; `LOSE GAME` triggers the fire game-over.
- **Speed** — keys `Q`/`W`/`E`/`R` = ×1/×2/×5/×10, `P` = pause. The in-settings speed control stays hidden until the player has lost once (`hasLostOnce`).

## Architecture

### Loop

`loop()` (`js/main.js`) → `update(dt)` → `render()` → `updGOFlames()`. `update()` scales `dt` by the speed multiplier `gS` and accumulates it into **`tt`**, the simulation clock that drives every timer, animation phase, and the 300-second day cycle (`dayCount = floor(tt/300)+1`). Pausing sets `gS = 0`, so paused time genuinely does not advance. `render()` is stateless and reads globals directly. `dt` is clamped to 0.1s per frame.

### The two-layer world model — the key invariant

The world is held **twice**, and both copies must be kept in sync:

1. **`grid[gy][gx]`** — a 60×60 array of cell-type strings (`'empty'`, `'altar'`, `'seed'`, `'bushSprout'`, `'bush'`, `'treeSeedPlaced'`, `'treeSprout'`, `'tree'`, `'flower'`, `'burned'`). This is the occupancy/collision layer that `isOcc`, `isOccNR`, and all spot-finding read.
2. **Parallel object arrays** — `seeds`, `bushes`, `trees`, `tSP` (planted tree seeds), `flowers`, `reeds` — holding the per-object state (`st`, growth `timer`, `hasSeed`, …).

Any code that creates, moves, or destroys a plant must update **both** (see `chopAt`, `updRiver`, `chk2x2`, the `flower` branch of `handleTap`). Forgetting one leaves phantom occupancy or invisible objects.

Three systems sit *outside* `grid`, keyed by `` `${x},${y}` `` strings: `river` (a `Set`), `fireTiles` (a `Set`), and `burnedTiles` (an object mapping key → remaining seconds; it also writes `'burned'` into `grid`). Occupancy checks have to consult these separately, which is what `isOccNR()` and `isFB()` are for. `reeds` is also off-grid — reeds live on river tiles and never touch `grid`.

**Animals are not on the grid at all.** They carry float pixel coordinates (`x`, `y`), are built by `mkA(type, gx, gy)`, and run a small string-state FSM (`'idle'` → `'wander'` / `'gSeed'` / `'gPlant'` / `'goT'`) in per-species `upd*` functions. Movement goes through `mvTo` (deflects around fire/burned) or `mvAv` (also deflects around plants, for beavers). Deer have their own system (`mkDeer`, `updDeer`, `deerMvTo`) with a herd leader and a `deerPhase` state machine (`'waiting'` → `'initial'` → `'herd'`).

### Progression chain

The whole game is one causal chain; changing any link changes everything downstream. Read it before touching spawn or unlock logic:

```
altar regenerates a seed every SCD ms (updAltar), capped at MAX_SEEDS in play
  → player taps seed, taps ground → seeds[]        (totalSP counts lifetime plants)
  → 3 seeds planted → red birds spawn (chkSpawn) → they replant seeds → bushes
  → 3 bushes → blue birds → tree seeds → trees
  → trees → beavers; player taps beaver then a tree → chopAt()
  → FIRST chop calls genRiver() — two paths carve from the chop site to the map
    edge, destroying whatever they cross (updRiver animates ~20 tiles/sec)
  → reeds grow on river tiles; tapping an adult reed has a 10% chance to release a frog
  → 3 frogs → flowers start blooming; player drags flowers into a 2x2 square
    (chk2x2 consumes the four flowers) → a bee
  → 6 bees (MAX_BEES) → 10s later deer arrive; player taps deer to reunite them,
    growing the herd to 10 (MAX_DEER)
  → 30s after the full herd, a WILDFIRE starts (startFire) — tap river to pick up
    water (hasWater), tap fire to apply
  → 3 water hits (fireHP) extinguish it; each hit clears ~40% of tiles and leaves
    burned ground for 900s; 50% chance of recurrence every 180s thereafter
  → if fireTiles reaches 75% of the map: triggerGameOver()
```

Two gates do **not** match their task text, and that is load-bearing if you touch them:

- **Beavers.** `chkSpawn` gates on `cntT() >= 6` but then computes `tBV = min(MAX_BV, floor((cntT()-10)/10))`, which is ≤ 0 until **20** trees. In normal play beavers appear at 20/30/40 trees, not 6 — while the `tree20` task and the debug button both say 6. The `> Spawn beavers` debug button is the only fast path.
- **Flowers.** `updFlowers` returns early while `frogs.length < 3`, so blooming starts at 3 frogs; `MAX_FROGS = 5` is only the population cap.

`TASKS` (`js/state.js`) is the machine-readable version of the chain — each entry is a `check()` predicate polled every frame by `updTasks()`, with completions kept in the `tasksDone` Set. The `disc` object is the discovery-flag store; `disc_(key, message)` sets a flag, queues the banner, and flashes the border. Several task checks read `disc` directly, and `removeReed` sets `disc['reedCleared']` **without** `disc_` (flag only, no banner) — keep that distinction when adding flags. `GAL` (`js/state.js`) drives the FLORA/FAUNA gallery pages; the TASKS tab renders from `TASKS` instead.

### Rendering

`render()` draws in fixed layers into one canvas under a camera transform (`cam.x/y/z`, pan + pinch/wheel zoom), with viewport culling (`s0/s1/e0/e1`) computed from `cam`: terrain (grass noise, river, fire, burned) → altar center + seed → grid objects (seeds, reeds, flowers, plants) → entities, depth-sorted by `y` → particles/CTA/tutorial → screen-space HUD (`X.setTransform(1,0,0,1,0,0)` inside a `save`/`restore`) → warm phosphor tint → day/night alpha overlay. The whole frame is wrapped in `X.globalAlpha = flickerA` for the CRT flicker.

All glyphs and colors are centralized in **`SYM`** and **`COL`** (`js/state.js`). Use them rather than inlining characters or hex values. Grass variation comes from `gV`/`gD`, two 60×60 noise arrays generated **once at load** and deliberately not regenerated on restart. Scanlines, vignette, and the border flash are CSS (`#scanlines`, `#vignette`, `#border-flash`), not canvas.

The UI chrome (banner, task bubble, gallery modal, settings, debug panel, game-over screen, hint strip) is DOM inside `#ui-overlay`, styled in `css/style.css` and mutated imperatively. The day/night clock is its own small 52×56 canvas, redrawn by `updDay()` only when the sun actually moves a step.

### Performance invariants

`update()` and `render()` run 60×/second, so a few things are cached or batched. Each has a matching obligation:

- **`setFont(...)`, never `X.font = ...`.** Assigning `font` re-parses the shorthand, and the draw loops flip sizes hundreds of times a frame, so `setFont` (`js/state.js`) skips no-op writes. Its shadow copy goes stale whenever the real context state is rolled back, so **every `X.restore()` must be followed by `resetFontState()`**, and `resize()` calls it too (setting `canvas.width` wipes context state). Use `fontPx(n)` for a computed size rather than building the string inline.
- **Grass is baked.** `gCh`/`gCI`/`GRASS_COLS` (`js/state.js`) precompute each tile's glyph and a quantised shade from `gV`/`gD` at load. The terrain pass queues tiles into `gBuf` per colour bucket and flushes one run each. If you ever make grass dynamic, that bake has to move or go.
- **`EL` caches every node touched per frame.** Add new per-frame DOM nodes to its id list instead of calling `getElementById` in a loop. One-shot paths (game over, restart) still use `getElementById` and that is fine.
- **Ask the set about the plants, not the plants about the set.** `burnPlants()` (`js/fire.js`) sweeps the plant arrays once and does a `fireTiles.has()` per plant. Do not invert it back into a loop over `fireTiles` that scans arrays — that was O(tiles × plants) per frame.
- **Throttled writes.** The day label, the clock canvas, the log badge (`js/game.js`) and the burned-ground countdown (`burnedDecayT`, `js/fire.js`) only run when their value actually changes. `updTasks()` rebuilds the log's DOM only when a task flips — never unconditionally.
- **No per-frame allocation in the draw path.** `entBuf` pools the depth-sort wrappers, `FIRE_COLS`/`FIRE_DIRS` are hoisted, and counters (`cntB`, `cntT`, `cntDeer`) loop instead of `filter().length`. Keep new hot-path code allocation-free.

### Idle prompts

Two systems nudge an idle player, and they deliberately do not overlap:

- **`updTut()`/`drawTut()`** (`js/game.js`) — the one-time scripted tutorial, world-anchored, skipped entirely once `hasLostOnce`.
- **`updHints()`** (`js/hints.js`) — recurring prompts for anyone who stalls during the **first two tasks** (`plant3`, `bush10`). After `HINT_IDLE` seconds of real silence it pulses the LOG button (`.idle-cta`) and fades in `#hint-strip`, which cycles one state-aware line from `hintLines()` every `HINT_CYCLE`. It stays quiet while the tutorial is up, while the log is open, while the task-completion bubble is showing, and after a loss.

Idle is tracked by **`idleSince`**, not `lastPA` — `updateCTA` resets `lastPA` whenever it fires a bracket prompt, so `lastPA` never exceeds `CTA_IDLE` for long. `idleSince` is zeroed only by a real gesture: `playerAction()` (every tap) and `noteInput()` (pan, wheel, pinch). It is ticked in `loop()` with the **unscaled** `dt`, so prompts neither freeze on pause nor race at ×10. `ctaIdle()` shortens the in-world bracket delay to 3s during those same first two tasks.

## Conventions

Globals are aggressively abbreviated and declared with `let` near the top of `js/state.js`; tuning constants and population caps are the two `const` lines just below the font helpers. Match that style; the file has no modules, no classes, and mostly single-line function bodies.

| | | | |
|---|---|---|---|
| `gS` game speed | `tt` sim clock | `aT` animation clock | `T` tile size (20) |
| `GW`/`GH` grid dims (60) | `CX`/`CY` altar center | `AR` altar radius | `MW`/`MH` world px |
| `rB` red birds | `bB` blue birds | `tSP` planted tree seeds | `sel` held selection |
| `totalSP` seeds planted | `disc` discoveries | `gV`/`gD` grass noise | `X` canvas 2D context |

Four places must be updated whenever you add state or content:

- **`restartGame()`** (`js/game.js`) resets every global by hand and rebuilds `grid`. A new global that isn't reset there leaks across a restart. Three things are *intentionally* not reset: `hasLostOnce` (unlocks the speed control), `volMusic`/`volSFX`, and the `gV`/`gD` grass noise.
- **`handleTap(sx, sy)`** (`js/input.js`) is the single input entry point, and its ordering is the interaction priority: held-selection branches (`sel.type`) first, then water pickup/apply, then altar seed, then reed, then entities by proximity (`HR = T*0.8`), then grid tap-to-name. Insert new interactions at the right precedence. It is called from both `mousedown` (left button) and `touchend`; `touchConsumed` suppresses the synthetic mouse event that follows a tap. Middle-drag and one-finger drag pan; wheel and pinch zoom (`cam.z` clamped 0.5–6).
- **`index.html`'s script list** — a new `js/*.js` file is invisible until it has a `<script>` tag, in the right order (see the load-order note above).
- **`runDbg()`** (`js/debug.js`) — new progression content should get a debug button, otherwise it takes minutes of real play to reach. Add the button in `renderDbg()` and the branch in `runDbg()`; branches are written as `if(cmd==='x'||cmd==='all')` so `UNLOCK ALL` picks them up in order.

Audio can only start from a user gesture: `initAudio()` is called on the first tap and `playS()` no-ops until then. `playS` clones the `Audio` node per play, so overlapping sounds are fine. `Sounds/firesound.wav` is 8 MB — avoid adding more large binaries.

# Kestrel Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/jokelord45/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/jokelord45/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Entry for the [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) bounty on [make.fun](https://make.fun).

## The game

**Kestrel Courier** is an original chase-view flight game: you fly a single-engine
courier plane, the Kestrel, over a seeded valley at dawn. The aircraft stays in frame
with its instruments lit — airspeed, altitude, vertical speed, a compass tape, an
artificial horizon, fuel and damage — while the valley scrolls beneath you in
perspective: ridges, fields, drifting clouds, hot-air balloons, and a runway waiting
at the end of the day.

Three sorties, picked on the title screen:

1. **Ring Run** — thread 12 golden rings over the valley before your fuel runs dry.
   A near miss still pays a little; a clean pass pays 100.
2. **Airmail Drop** — drop 5 parcels onto the marked rooftops. You carry 8 parcels,
   so a bad release costs you, and every parcel keeps the plane's forward speed when
   it leaves the bay — release early and let it carry.
3. **Dawn Landing** — follow 6 beacon rings to runway 27 and put her down gently:
   on the strip, slower than 72 m/s, sinking slower than 6 m/s. Too hard, or short
   of the threshold, and the Kestrel is down.

Fuel burns with the throttle, balloons cost 34 damage a strike, and terrain is
unforgiving everywhere except the strip. The best score is kept in your browser.

## Controls

- **↑ / ↓** pitch · **← / →** turn · **W / S** throttle
- **Space** drop a parcel · **P** pause · **M** mute
- **1 / 2 / 3** pick a sortie on the title screen · **Enter** fly
- Mouse drag steers too. All sound is synthesised with WebAudio — no audio files.

## Run

```sh
node serve.ts
```

then open http://localhost:8080. No build step, no network requests: `game/` is
plain static files.

Screenshots are real renders of the game's own code, staged deterministically with
`?shot=start|play|drop|end&seed=1` (see `shots.json`); an autopilot flies each scene
by the same rules a player does. The drop scene ends 5/5 delivered, the landing
scene ends in a touchdown — both verified headlessly, as is a live keyboard
play-through (mission pick, 12 s of flight, pause/resume, mute, parcel drop) with
zero page errors.

## Layout

- `game/index.html` + `game/src/` — the game: `config.js` (tuning), `world.js`
  (flight model, rings, drops, balloons, runway), `render.js` (chase view and HUD),
  `input.js`, `audio.js` (synthesised sound), `shots.js` (autopilot staging),
  `main.js` (boot and loop).
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
- `screenshots/` — 1-start, 2-play, 3-drop, 4-end (the cover is first by name).
- `serve.ts` — a tiny static server for local play-testing.

## License

MIT — see [LICENSE](LICENSE).

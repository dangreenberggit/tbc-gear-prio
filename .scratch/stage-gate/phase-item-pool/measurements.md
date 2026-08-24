# Measurements — phase-item-pool, Step 9 (served page)

Uncommitted Step 10 artifact. Recorded 2026-08-23 by the executor seat.

## Surface and method

- Built from the corrected recipe (`.scratch/stage-gate/finish-the-tab/measurements.md:1054-1075`):
  protoc x4, `GOOS=js GOARCH=wasm go build` (21,515,392-byte `dist/tbc/lib.wasm`),
  `npx tsx vite.build-workers.mts` (112,563-byte `sim_worker.js`), `npx vite build`.
  Fork tip at build time: `eb65670764d42a5b919dded5f8252ddf3a3f5bc4`.
- Served with `python -m http.server 8975` from **`vendor/tbc-new-fork/dist`**, not
  `dist/tbc`. The bundle hardcodes a `/tbc/` prefix, so serving `dist/tbc` as the web
  root makes `/tbc/bundle/...entry.js` return 404 and the page renders blank white.
  Re-runnable:

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8975/tbc/druid/feralcat/
  ```

- Browser: the owner's Brave (`navigator.brave === true`), Chrome/151.
- **Visibility.** The extension first placed the tab in a 0x0 window, which reports
  `visibilityState: hidden` permanently however the owner fronts their windows.
  `resize_window` to 1600x1000 fixed it: `outerWidth`/`outerHeight` 0x0 to 1600x1000,
  `visibilityState` hidden to **visible**, `hasFocus()` false to **true**.
  A `visibilitychange` recorder ran for the whole timed run and logged **zero hidden
  intervals**, so no part of the wall-clock was throttled.

## (a) Rendered strings at phase 2 and phase 3

`document.body.innerText.includes('this phase')` is **false** on every page and phase
checked: ret p2, ret p3, feral p2, feral p3.

Retribution paladin page (`/tbc/paladin/retribution/`):

| Control | Phase 2 | Phase 3 |
|---|---|---|
| prune checkbox | `Sim only Phase 2 (2.1 - T5) BiS-list items` | `Sim only Phase 3 (2.2 - T6) BiS-list items` |
| BiS view filter | `Only items on a Phase 2 (2.1 - T5) BIS list` | `Only items on a Phase 3 (2.2 - T6) BIS list` |

Feral cat page (`/tbc/druid/feralcat/`):

| Control | Phase 2 | Phase 3 |
|---|---|---|
| prune checkbox | `Sim only Phase 2 (2.1 - T5) BiS-list items` | `Sim only Phase 3 (2.2 - T6) BiS-list items` |
| BiS view filter | `Only items on a Phase 2 (2.1 - T5) BIS list` | `Only items on a Phase 3 (2.2 - T6) BIS list` |
| candidates placeholder | `all 228 eligible` | `all 366 eligible` |

The feral phase-3 count **366** equals the local membership the committed
`data/pool-listings/feral-p3.md` records, so the bundled universe and the committed
artifact agree.

Assumptions drawer after the completed run, phase named rather than numbered:

```
Seeds                 11, 22, 33, 44, 55
Iterations            3000
Max phase             Phase 3 (2.2 - T6)
Candidate pool        BiS-list items for Phase 3 (2.2 - T6)
Pool source           feral-p3.universe.json (366 entries)
Engine (fork commit)  8db275d7d
Sim version           api-v15
```

`Max phase` renders through `common.phases.N`, and the new `Pool source` row names the
file the run drew from and its entry count.

## (b) Shared-state phase selector

Proven in both directions on the loaded ret page. The tab mounts exactly one selector,
`.upgrades-phase-selector select`, carrying all five `common.phases.N` strings.

1. **Upgrades tab to page.** Setting the tab selector to 3 made every phase picker on
   the page read `3`, and both tab labels re-rendered to `Phase 3 (2.2 - T6)`.
2. **Page to Upgrades tab.** Opening the Gear tab item-selector modal mounts the page's
   own pickers (five `.phase-selector` selects, all already reading `3` because they
   had followed step 1). Driving a **Gear-side** picker to 5 moved the Upgrades tab
   selector to `5` and re-rendered its labels to
   `Sim only Phase 5 (2.4 - SWP) BiS-list items` and
   `Only items on a Phase 5 (2.4 - SWP) BIS list`.

There is no tab-local phase state, so tab and page cannot disagree.

## (c) Completed feral prune-on run and the raid filter

Run: `/tbc/druid/feralcat/`, phase 3, prune checkbox on, 3000 iterations, seeds
11/22/33/44/55. Prune narrowed the candidate placeholder from `all 366 eligible` to
`all 17 eligible`.

Status line on completion, quoted:

```
Your current gear: 2132.2 DPS. Took 302 s.
```

**302 s against the plan's ~61 s estimate.** The tab was visible and unthrottled for the
whole run (zero hidden intervals), so the gap is real cost on this machine rather than a
measurement artifact. Progress advanced steadily: `Simming 8/54`, `22/54`, `34/54`,
`51/54`.

The raid filter is `d-none` before a run and visible after one, the same
hide-when-absent lifecycle as the set-potential and BiS-only toggles.

Filter options offered, in order, zones first and then only the zoneless buckets present
in this pool:

```
All, Serpentshrine Cavern, Black Temple, Hyjal Summit, Tempest Keep,
PvP vendor, Reputation vendor, Badge vendor, Crafted
```

Per filter value, with row count, zoneless-item count and slot-tab set:

| Filter | rows | zoneless rows | slot tabs |
|---|---|---|---|
| All | 17 | 5 | Head, Neck, Shoulder, Back, Chest, Wrist, Hands, Waist, Legs, Feet, Finger 1, Trinket 1, Trinket 2, Main Hand |
| Serpentshrine Cavern | 2 | 0 | Waist, Trinket 1 |
| Black Temple | 8 | 0 | Neck, Shoulder, Back, Chest, Legs, Feet, Finger 1 |
| Hyjal Summit | 1 | 0 | Hands |
| Tempest Keep | 1 | 0 | Back |
| PvP vendor | 2 | 2 | Wrist, Main Hand |
| Reputation vendor | 1 | 1 | Finger 1 |
| Badge vendor | 1 | 1 | Trinket 2 |
| Crafted | 1 | 1 | Head |

Returning to **All** restores all 17 rows and the full 14-slot strip.

**The F4 ruling holds, measured rather than asserted.** The eight non-All values sum to
**17**, exactly the All count; no item matched two filter values, and none was
unreachable under every value. That is the same exactly-one-bucket property the core
unit test asserts, now confirmed on a served page.

Counting note: rows were filtered to `cells.length >= 5`. An empty filter view renders a
one-cell `No upgrades found above the cutoff.` message row, which a naive `tbody tr`
count double-counts. It inflated Tempest Keep from 1 to 2 on a first pass.

**Zoneless gear is reachable and ranked, not hidden.** The largest upgrade in the whole
run is a PvP-vendor item that a zone-only filter would have made invisible:

```
Vengeful Gladiator's Staff        BiS | Main Hand | +90.9 | PvP vendor
Belt of One-Hundred Deaths        BiS | Waist     | +33.1 | Serpentshrine Cavern
Vindicator's Dragonhide Bracers   BiS | Wrist     | +22.0 | PvP vendor
Band of the Eternal Champion      BiS | Finger 1  | +15.5 | Reputation vendor
Thunderheart Leggings             BiS | Legs      | +15.4 | Black Temple
Wolfshead Helm            BiS (Owned) | Head      |  +0.0 | Crafted
Bloodlust Brooch          BiS (Owned) | Trinket 2 |  +0.0 | Badge vendor
```

**Confirmed consequence, accepted under the bucket ruling:** the slot-tab strip narrows
with the filtered view — Black Temple shows 7 slot tabs against All's 14 — because
`renderSubTabs()` derives the slot set from the same filtered view. Every item stays
reachable under its own bucket, so nothing is lost, only regrouped.

## (d) Engine is wasm-backed

The literal `Worker[0] Ready, isWasm: true` console line could **not** be captured by
the tooling. The extension's console tracker re-initialises on every navigation and so
never observes load-time logs, and an in-page `console.log` tap installed after the
first run sees no banner because the workers are already initialised. Rather than
report the fact unverified, it was measured at the source.

`sim_worker.js` does not log the banner itself; it posts `ready(isWasm)` to the main
thread. Spawning the worker exactly as the page does returns:

```json
{"msg":"ready","outputData":{"0":1}}
```

`outputData[0] === 1` is the `isWasm` boolean **true**, the same fact the console line
reports. Re-runnable from the served page's console:

```js
const w = new Worker('/tbc/sim_worker.js');
w.onmessage = e => console.log(JSON.stringify(e.data));
```

Corroborating evidence: the run completed 54 sim jobs and produced real DPS numbers,
which the JS fallback could not do at this speed, and `lib.wasm` served HTTP 200 at
21,515,392 bytes.

## Bundle provenance

The refreshed universes reached `dist`. Item ids `29297` (Band of the Eternal Defender)
and `34470` (Timbal's Focusing Crystal), both added by the Step 2 refresh, are present
in the built `bundle/preset_utils-*.chunk.js` chunks. Verified by gear-set item id per
C23, never by a source identifier.

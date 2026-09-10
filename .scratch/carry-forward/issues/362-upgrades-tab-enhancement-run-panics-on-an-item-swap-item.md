Status: open
Type: bug
Origin: .scratch/stage-gate/reforge-catchup-leftovers/brief.md
Blocks: none
Blocked by: none

# The Upgrades tab aborts on any page whose defaults enable item swap

**This ticket carries two things under one number:** the open defect in its
title, and the build/run evidence for the merged tab that had never been
recorded anywhere (§ "Build and run evidence" below). They are filed together
because one investigation produced both — the panic was found *while* recording
the evidence — and splitting them would scatter a single run's observations
across two numbers. The defect is what keeps this ticket `open`; the evidence
half is complete and needs nothing further.

**What is NOT claimed: this is not a merge regression, and the ret page is
unaffected.** The merged tab builds and runs.

## The defect

On `/tbc/shaman/enhancement/`, pressing Run in the Upgrades tab aborts the whole
ranking before any candidate is priced:

```
Ranking failed: sim error (0): No item with id: 30832 Stack Trace: goroutine 10 [running]:
  ... core.NewItem                      sim/core/database.go:489
  ... core.toItem                       sim/core/item_swaps.go:500
  ... core.(*Character).enableItemSwap  sim/core/item_swaps.go:57
```

Mechanism, read from source:

- `ui/shaman/enhancement/sim.ts:96` sets the page default
  `itemSwap: Presets.P1_TRUNCHEON_ITEMSWAP_PRESET.itemSwap`.
- That preset references item 30832 (*Gavel of Unearthed Secrets*) —
  `ui/shaman/enhancement/gear_sets/p1.truncheon.itemswap.json:17`.
- `enableItemSwap` (`sim/core/item_swaps.go:50-57`) calls `toItem` on every swap
  entry unconditionally, and `NewItem` (`sim/core/database.go:485-490`) **panics**
  rather than erroring when the id is absent from `itemsByID`.
- The request's embedded `SimDatabase` is built by ticket 212's `simDatabaseFor`
  from the **composed equipment** only — worn gear plus the candidate. Item-swap
  items are neither, so 30832 never enters the request.

**Not a data gap.** 30832 is present in the fork's `assets/database/db.json` and
in `data/items/index.json`. Only the request is missing it.

**Relationship to ticket 212 (resolved).** 212 fixed the same class of panic for
*candidates* and its slice 4 recorded the deliberate choice not to fall back
when an id fails to resolve. Item-swap slots were not in its scope, so this is a
new gap rather than a regression of it. Any page whose defaults enable item swap
is affected; ret is not, which is why the ret run below is clean.

## Build and run evidence (what had never been recorded)

The catch-up did run the fork Go suite (22 packages `ok`) and a browser load,
but only into a session transcript, never a repo file. `tsc --noEmit` is
recorded in fork commit `ab59127d` and the layout gate in `4dcafcd`. What had
never run at all was `vite build` as a verification step and an interactive Run.
Both were run here, 2026-09-10, fork clone at `6ef5679`.

**Build.** Baseline before: `index.html` 13:12, `lib.wasm.gz` 11:07; start 15:03:07.

```
$ make.exe --version                 # GNU Make 4.4.1 (the 3.81 silently builds nothing)
$ make.exe -C vendor/tbc-new-fork dist/tbc/.dirstamp > make-dirstamp.log 2>&1; echo "rc=$?"
rc=0
```

`vite build` reported `✓ built in 3.80s`, zero `error` matches in the log, and
`touch dist/tbc/.dirstamp`. After: `index.html` 15:04 (rebuilt), spec pages
present for both `paladin/retribution` and `shaman/enhancement`.

**`lib.wasm.gz` stayed at 11:07, and that is correct, not stale.**
`makefile:104` makes it depend on `sim/wasm/*`, `sim/core/proto/api.pb.go` and
every `sim/**/*.go`. Zero Go files are newer than it
(`find vendor/tbc-new-fork/sim -name '*.go' -newer .../lib.wasm.gz | wc -l` → 0)
and `make -n dist/tbc/lib.wasm.gz` prints "is up to date". So the wasm predating
the merge commit does not mean the bundle is stale — the merge carried no `sim/`
change that would rebuild it. This retires the earlier worry that the previous
browser load ran against a partially stale bundle.

**Run — ret, clean.** Served the built `dist` on `http://127.0.0.1:8099`, opened
`/tbc/paladin/retribution/`, Upgrades tab, Run.

| Check | Pre-registered | Seen |
| --- | --- | --- |
| Page header | `Phase 3 (2.2 - T6) - Alpha` | exact match |
| Eligible items | 467 | **467** |
| Ranked rows appear | yes | yes — `Simming 10/504`, 9 rows landed |
| Console errors | none | none |

The rows are real: rank 1 *Choker of Endless Nightmares*, Neck, +0.5 DPS, Black
Temple (N) / Supremus; then *Shadowmoon Destroyer's Drape* (Back, −3.0) and
*Madness of the Betrayer* (Trinket 1, −16.9). 504 attempts against 467 eligible
items is expected — paired slots (finger, trinket) try both placements. The run
was left partway rather than to completion; "the tab builds and ranks" is what
was being established, and it is established.

**Run — enhancement, failed.** Same server, `/tbc/shaman/enhancement/`, header
`Phase 3 (2.2 - T6) - Alpha`, **954 eligible items**, default gear wearing
*Syphon of the Nathrezim* in both weapon slots. Run aborts with the panic above,
zero rows, no console error (the failure is surfaced in the tab, not the
console).

## Cost beyond the page itself

The enhancement page was the one available live observation for **ticket 350**
(what the engine does with a 2H + off-hand set): enh composes two-hander
candidates itself, so a rejects outcome would have shown up as a run error or
missing rows. Because the run aborts earlier, in the item-swap path, it
separates none of the three candidate answers. Recorded in 350's Decision and in
`.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`.

## What to do

1. Decide where item-swap items enter the composed request. The narrow fix is to
   widen `simDatabaseFor`'s input to the union of the composed equipment and the
   request's item-swap items; the alternative is for the tab to drop item swap
   from the skeleton it captures, since a ranking run does not exercise swaps.
   Both change what the request says, so pick one deliberately.
2. Whichever is chosen must hold for every page with item-swap defaults, not
   just enhancement — `grep -rn "itemSwap:" vendor/tbc-new-fork/ui/*/*/sim.ts`.
3. A regression test at the `rankUpgrades` interface with an item-swap set
   naming an unworn item, asserting the composed request carries a database row
   for it (or that the swap is absent).

## Acceptance

- [ ] The enhancement page's Upgrades tab completes a run without panicking.
- [ ] The chosen option is recorded with its reason.
- [ ] A test covers the item-swap id at the `rankUpgrades` interface.

## Notes

Found while recording build/run evidence for the merged tab, not by a failing
test. Related: 212 (the same panic for candidates, resolved), 350 (whose live
observation this blocks).

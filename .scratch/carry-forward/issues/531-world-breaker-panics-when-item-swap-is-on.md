Status: closed
Type: bug
Origin: owner's Cherryboom test runs, 2026-09-29 and 2026-09-30 (three Enhancement Shaman rankings in the Upgrades (New) tab); split out of ticket 529, item 2
Blocks: none
Blocked by: none
Related: 529, 362, 366, 311

# World Breaker is dropped from every ranking when item swap is on

## What was seen

The owner ran three Upgrades (New) rankings for Cherryboom, an Enhancement
Shaman, on 2026-09-29 and 2026-09-30. Each run used the page defaults,
which include the Fire Elemental item swap
`P1_TRUNCHEON_ITEMSWAP_PRESET` (swap main hand 30832, swap off hand 27901).
Each run dropped the candidate World Breaker (item 30090, main hand) and
logged this in the browser console:

```
[upgrades] candidate 30090 (mainhand): World Breaker was dropped from the
ranking: … sim error (0): Tried to add a new item swap callback for slots in
a finalized environment!
```

Ticket 529 records the third run: 957 candidates, 956 rows.

**Consequence.** World Breaker never gets a DPS number, so a weapon that
may be a real upgrade is missing from the ranking.

## Repro (about one second per sim)

The pinned engine CLI reproduces the panic outside the tab. Both pins name
upstream `17a8fb28c5ad14b649acecdaacd488594048f467`, and the four Go files
below are identical in the fork and at that commit
(`git -C vendor/tbc-new-fork diff --quiet 17a8fb28c5ad14b649acecdaacd488594048f467 HEAD -- sim/common/tbc/items_weapons.go sim/core/item_swaps.go sim/core/character.go sim/core/procs.go`
exits 0 at fork `bb9e925e`).

Save this as `repro531.py`. Run it from the repo root as
`python repro531.py <out_dir> <item_id> <1 if two-handed else 0>`. It
writes two 20-iteration requests: P1 enhancement gear with the item in
the main hand, one request with the Truncheon swap enabled and one
without.

```python
import copy, json, sys
out, item, two_hand = sys.argv[1], int(sys.argv[2]), sys.argv[3] == "1"
enh = "vendor/tbc-new-fork/ui/shaman/enhancement/"
sk = json.load(open("data/presets/ret/p2.raid-sim-skeleton.json"))
gear = json.load(open(enh + "gear_sets/p1.gear.json"))["items"]
gear[14] = {"id": item}
if two_hand:
    gear[15] = {}
for name, swap in (("swap", True), ("noswap", False)):
    req = copy.deepcopy(sk)
    base = req["raid"]["parties"][0]["players"][0]
    p = {k: base[k] for k in ("apiVersion", "consumables", "buffs")}
    p.update(name="repro", race="RaceOrc", **{"class": "ClassShaman"},
             equipment={"items": gear},
             talentsString="03-500502210501133531151-50005301",
             rotation=json.load(open(enh + "apls/default.apl.json")),
             enhancementShaman={"options": {"imbueOh": "WindfuryWeapon",
                 "classOptions": {"imbueMh": "WindfuryWeapon"}}})
    if swap:
        p["itemSwap"] = json.load(open(enh + "gear_sets/p1.truncheon.itemswap.json"))
        p["enableItemSwap"] = True
    req["raid"]["parties"] = [{"players": [p]}]
    req["simOptions"] = {"iterations": 20, "randomSeed": "1"}
    json.dump(req, open(f"{out}/{item}-{name}.json", "w", newline="\n"))
```

Then run each request:
`vendor/wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64/wowsimcli-windows.exe sim --infile <out_dir>/30090-swap.json --outfile <out>.json`
and read `error.message` in the output file.

Results on 2026-10-01:

| Item (main hand) | Swap on | Swap off |
| --- | --- | --- |
| 30090 World Breaker | panic | 1379.4 DPS |
| 28573 Despair | panic | 1333.6 DPS |
| 30316 Devastation | panic | 1665.4 DPS |
| 30312 Infinity Blade | panic | 1688.0 DPS |
| 29996 Rod of the Sun King | 1653.7 DPS | 1607.8 DPS |

`"enableItemSwap": true` is required. With `itemSwap` set and the flag
absent, the swap stays off and World Breaker sims cleanly
(`character.go`, grep `player.EnableItemSwap && player.ItemSwap`).

## What the code shows

Lines are at fork `bb9e925e`. Each citation also gives a grep anchor,
because line numbers in the gitignored fork go stale (ticket 368).

The repro's stack trace, innermost frame first:

1. `sim/core/item_swaps.go:136`, the panic in `RegisterItemSwapCallback`
   (grep `finalized environment`).
2. `sim/core/character.go:604`, in `getDynamicProcMaskPointer`, which
   registers a callback for every weapon slot each time it is called
   (grep `func (character \*Character) getDynamicProcMaskPointer`).
3. `sim/core/character.go:624`, `GetDynamicProcMaskForWeaponEffect`.
4. `sim/common/tbc/items_weapons.go:190`, World Breaker's `getDpm`
   closure, which calls `GetDynamicProcMaskForWeaponEffect(30090)`
   (grep `// World Breaker`).
5. `sim/common/tbc/items_weapons.go:210`, World Breaker's main-hand swap
   callback, `dpm = getDpm()`.
6. `sim/core/item_swaps.go:376`, `SwapItems` runs the callbacks for each
   swapped slot.
7. `sim/core/item_swaps.go:458`, `ItemSwap.reset` calls
   `SwapItems(..., isReset=true)`.
8. `sim/core/character.go:517`, the per-iteration character reset. This is
   after `environment.go:201` (`env.State = Finalized`).

So the late registration is in the item's own code. The swap callback
calls `getDpm()` again, and `getDpm()` registers a new item-swap callback
on every call. The first call, at setup, is legal. The second call
happens inside the callback, after the environment is finalized, and
panics. The reset path runs the callbacks for every slot in the swap set
before every iteration. So the run fails even when the rotation never
swaps.

**Which items.** Every weapon whose swap callback calls `getDpm()` again
has the same code (grep `dpm = getDpm()` in `items_weapons.go`):
Despair 28573, Bonereaver's Edge 17076, World Breaker 30090, Warp Slicer
30311, Devastation 30316 and Infinity Blade 30312. Rod of the Sun King
29996 and Blinkstrike 31332 call `GetDynamicProcMaskForWeaponEffect` the
same way through their own closures. Rod's effect returns before it
registers anything when the character has no energy or rage bar (grep
`// Rod of the Sun King`), so it passed for the shaman in the repro. That Rod, Blinkstrike, Bonereaver's Edge and Warp
Slicer panic for other specs is a **hypothesis, untested**.

**Which specs.** Any spec whose request sets `enableItemSwap` with a swap
set that includes the candidate's slot. Enhancement is the only spec whose
`sim.ts` sets a default item swap
(`grep -rn "itemSwap: " vendor/tbc-new-fork/ui --include=sim.ts` gives one
hit, `ui/shaman/enhancement/sim.ts`). Other specs hit this only when a
player turns item swap on (**hypothesis, untested**).

**Side observation (code reading, untested).** If the panic were removed
by itself, the callback would still have no effect. `dpm = getDpm()`
rebinds a local pointer. The proc trigger keeps the pointer it was given
(`aura_helpers.go`, grep `procAura.Dpm = config.DPM`).

## Engine provenance

These are upstream wowsims files, not fork edits. The four files match
upstream `17a8fb2` (the `git diff --quiet` above). The fork's PROVENANCE
cycle covers only `ui/core/components/individual_sim_ui/upgrades/engine/`.
A Go change here would be a new fork divergence from upstream, like ticket
311's `sim/hunter/item_sets.go` guard (fork commit `c4d1cb661`). That
makes an upstream report or PR a reasonable companion to any fork fix.
The local `upstream/master` ref is `17a8fb2` (2026-09-14). Nobody has
checked whether a newer upstream master fixes this.

A fork fix is a fork commit plus a re-pin. See `AGENTS.md`, "The forked
tab repo". Changing the engine CLI (`data/wowsims.lock.json`) is a
separate pin move.

## How the tab reports a dropped candidate

- When a candidate's sim throws, the run skips that candidate and records
  a `kind: "sim"` entry in `candidateSkips` (`rank.ts:1215-1226` in
  `ui/core/components/individual_sim_ui/upgrades/engine/`, grep
  `candidateSkips.push`). The entry becomes a `substitutions` line,
  "`<name>` was dropped from the ranking: …" (`rank.ts:1588`).
- In the done and stopped states, the page renders those lines under
  "Dropped candidates and substitutions (N)", at the bottom of the tab
  below the export box (`upgrades_tab.tsx:3499-3525`, grep
  `private substitutionsContent`; the title string is
  `upgrades_tab.assumptions.substitutions_title`). The page shows the
  first line of each entry and adds "… (full text in the
  browser console)". The full text goes to `console.warn`
  (`upgrades_tab.tsx:3514`).
- So the drop is shown in the UI, as one line at the bottom of the page.
  Whether that line was on the page in the owner's three runs was not
  checked.
- The console warning appeared 4 times in one console buffer.
  `substitutionsContent` runs on every `render()` (`upgrades_tab.tsx:1937`),
  so a single drop logs again on each re-render. Four renders of one
  run is the likely reading (**hypothesis, untested**). The run summary
  in ticket 529 (957 candidates, 956 rows) shows one drop in that run.

## Proposed directions (options, not decided)

- **A. Fix the registration in the Go item effects.** Stop the swap
  callbacks from registering new callbacks after the environment is
  finalized, for every item in "Which items". See "Engine provenance" for
  how the change lands.
- **B. Skip the default swap for the candidate's request.** Send that
  candidate's request without `enableItemSwap`, or without the swap
  slots the candidate occupies. This changes what the candidate's DPS
  means, because the baseline keeps the swap. The ticket that picks this
  option has to say how the two numbers stay comparable.
- **C. Make dropped candidates easier to see.** The list already exists
  at the bottom of the tab. Moving it up or naming the count in the status
  line would make a missing item obvious. This does not fix the missing
  number.

## Acceptance

With the repro above, `30090-swap.json` returns a DPS result with no
`error` field. Also, an Enhancement Shaman ranking in the Upgrades (New)
tab with the default Truncheon swap shows World Breaker as a ranked row
when it is a candidate, and "Dropped candidates and substitutions" does
not list item 30090. A test, or the gate-visual seat reading a capture of
the settled tab, can judge both. If option C alone is chosen, the
acceptance is different: the dropped item and its count show without
scrolling past the results table.

## Closed 2026-10-02: fixed at fork 2b0fece2f

Fixed by fork commit `2b0fece2ff98cc5ce972ace1f64c9cc9fc0d0d12`
("Stop weapon procs panicking on item swap (531)",
`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`, not pushed) and
the main-repo re-pin `f7cd7051` ("Re-pin fork to 2b0fece2f for ticket
531"). Plan, logs and results are in
`.scratch/stage-gate/531-world-breaker-swap/` (gitignored, so a fresh
checkout does not have them). An independent reviewer passed the work
before this close.

### Orchestrator rulings

As recorded in the plan's Rulings section:

1. **R1, test seam.** A fork Go test calling `core.RunRaidSim` is
   approved, as for ticket 532. AGENTS.md's three seams are about
   adapters, not where a test goes, and no TS seam can see a fork-only Go
   change.
2. **R2, the CLI acceptance sentence.** The "Acceptance" section asks
   that `30090-swap.json` return DPS through the repro's CLI. That CLI is
   the engine-pin CLI, built from upstream `17a8fb2`, and no fork commit
   can change it. The sentence is met by a CLI built from the fork
   instead (table below). The pinned upstream CLI still panics on the
   request; that is expected.

### The option chosen

Option A. The eight weapon effects in `sim/common/tbc/items_weapons.go`
now build their proc manager with core's
`NewDynamicLegacyProcForWeapon(<item id>, <same ppm>, 0)`, as Syphon of
the Nathrezim already did, and their item-swap callbacks are deleted.
That helper registers one swap callback at setup and rebuilds the proc
manager in place, so the proc trigger sees each rebuild. Nothing under
`sim/core/` changed. This is an upstream file, so the change is a new
fork divergence. No ported engine file changed, so no PROVENANCE row
moved.

Option B was not chosen: ticket 362's resolution rejected stripping the
swap, because the candidate's number stops being comparable to the
baseline's, and it would leave the baseline panicking when the swap set
holds one of these weapons. Option C was not chosen: World Breaker would
still get no number.

### Red and green

Tests in the new fork file `sim/item_swap_weapon_proc_test.go`, through
`core.RunRaidSim` with `IsTest: false`, a 180 s fight, 10 iterations and
seed 531. `TestWeaponProcsWithItemSwap` checks, per weapon, the swap-off
DPS against a literal recorded before the fix, and that with item swap on
the sim has no error and the effect fires. `TestWeaponProcSwappedIn` puts
World Breaker in the swap set, swaps it in at the start, and checks that
it procs.

Command:
`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run TestWeaponProc -count=1 -v`.

- Slice 1, only the World Breaker row: rc=1 before the fix. The
  World Breaker row and `TestWeaponProcSwappedIn` both failed with
  "Tried to add a new item swap callback for slots in a finalized
  environment!". The World Breaker trace, innermost first:
  `item_swaps.go:136` (`RegisterItemSwapCallback`), `character.go:604`
  (`getDynamicProcMaskPointer`), `character.go:624`
  (`GetDynamicProcMaskForWeaponEffect`), `items_weapons.go:190` (the
  closure), `items_weapons.go:210` (the swap callback),
  `item_swaps.go:376` (`SwapItems`), `item_swaps.go:458`
  (`ItemSwap.reset`), `character.go:517` (`Character.reset`). rc=0 after
  the World Breaker fix.
- Slice 2, the other seven rows added: rc=1, each of the seven failed
  with the same error, through its own block. rc=0 after the full fix.
  No swap-off check failed in either red run.

| Weapon (spec) | Swap off, before and after | Swap on, red | Swap on, green |
| --- | --- | --- | --- |
| World Breaker 30090 (enh) | 694.888225 | panic | PASS |
| Despair 28573 (enh) | 700.757428 | panic | PASS |
| Bonereaver's Edge 17076 (enh) | 600.407765 | panic | PASS |
| Devastation 30316 (enh) | 852.737327 | panic | PASS |
| Warp Slicer 30311 (enh) | 974.986922 | panic | PASS |
| Infinity Blade 30312 (enh) | 886.523976 | panic | PASS |
| Blinkstrike 31332 (enh) | 809.797248 | panic | PASS |
| Rod of the Sun King 29996 (fury warrior) | 633.261564 | panic | PASS |

Also at the fork commit:
`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ ./sim/shaman/... ./sim/warrior/... ./sim/rogue/... ./sim/hunter/... ./sim/paladin/... ./sim/druid/... ./sim/mage/... ./sim/priest/... ./sim/warlock/... -count=1`
rc=0; `go vet ./sim/ ./sim/common/tbc/` rc=0; `gofmt -l` clean; the
ten fork-gated vitest suites rc=0 (135 passed, 1 skipped); `pnpm verify`
rc=0.

From the independent review: the swap-off results are byte-identical
before and after the fix. With alternative 1 (delete only the callbacks
and keep the static proc managers), `TestWeaponProcSwappedIn` fails:
World Breaker averaged 3.7 procs with the fix and 0 under alternative 1.

### The repro, through two CLIs (ruling R2)

The fork CLI was built with
`go -C vendor/tbc-new-fork/cmd/wowsimcli build -tags=with_db -o <out>.exe .`
at `2b0fece2f`; the requests come from the "Repro" script with arguments
`30090 1`.

| CLI | `30090-swap.json` | `30090-noswap.json` |
| --- | --- | --- |
| Engine pin, `vendor/wowsimcli-17a8fb28...-win32-x64/wowsimcli-windows.exe` | error: "Tried to add a new item swap callback for slots in a finalized environment!" | 1379.384247 DPS |
| Built from fork `2b0fece2f` | 1361.982023 DPS, no error | 1379.384247 DPS |

### Live tab check

Enhancement Shaman, page defaults with the Truncheon swap, phase-2 preset
gear on the phase-3 page, 1000 iterations, the tab's own 957-entry pool,
on the `:5173` tab against a backend rebuilt from fork `2b0fece2f`:
`node .scratch/stage-gate/511-512-set-credit/k5p/run-check.mjs .scratch/stage-gate/531-world-breaker-swap/ENH-531.json .scratch/stage-gate/531-world-breaker-swap/ENH-531-after.json`
rc=0. The first request had `enableItemSwap` true; 1230 sims started,
1230 completed, 0 failed; no dropped candidates; 957 rows, one of them
World Breaker at −552.84 DPS. From the independent review: that is in
line with the other two-handers in the same run (−500 to −800).

### Upstream status

Upstream master is `d80ed2f132574c43b750a3c11f25d69dabb56f64` (checked
with `git ls-remote https://github.com/wowsims/tbc-new refs/heads/master`
on 2026-10-02). PR #520 (`fd8149869`, `ccf7eb19a`, merged 2026-09-15)
moved seven of the eight weapons onto helpers that use
`NewDynamicLegacyProcForWeapon`. Blinkstrike still has the old closure
and callback on master, so the Blinkstrike change is an upstream
candidate. Opening an upstream PR is the owner's call. When the fork next
merges upstream master, `items_weapons.go` is likely to conflict in the
six blocks PR #520 rewrote (hypothesis, untested); take upstream's
version of those and keep the Blinkstrike change unless upstream has
fixed it.

### The open questions above, answered

- **Side observation.** Confirmed: the old callbacks rebound a local
  pointer that the proc trigger never read, so they had no effect. The
  new proc manager follows a swap; `TestWeaponProcSwappedIn` shows it.
- **Which items.** Rod of the Sun King panics for a fury warrior (the
  test's Rod row). Blinkstrike, Warp Slicer and Bonereaver's Edge also
  panicked for a fury warrior in the planner's scratch run of 2026-10-02;
  that run was not kept. All eight are fixed.

### Same pattern, no panic (no ticket)

These swap callbacks also assign a new proc manager to a local variable
(`dpm = ...`), so they have no effect. They do not panic, because they
build the mask with `GetProcMaskForTypes`, which registers nothing:

- Twin Blades of Azzinoth 2-piece (`sim/common/tbc/items_weapons.go`,
  grep `hasteDPM`), `NewStaticLegacyPPMManager` + `GetProcMaskForTypes`.
- Warrior Mace Specialization (`sim/warrior/talents_arms.go`, grep
  `newMaceSpecializationDPM`), the same.
- Hand of Justice (`sim/common/classic/items_trinkets.go:45-47`),
  `NewFixedProcChanceManager` + `GetProcMaskForTypes` (reviewer F1).
- Warrior Sword Specialization (`sim/warrior/talents_arms.go:441-443`),
  the same (reviewer F1).

Whether their proc masks go stale after a swap is a hypothesis,
untested.

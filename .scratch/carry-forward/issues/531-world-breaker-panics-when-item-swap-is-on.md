Status: open
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

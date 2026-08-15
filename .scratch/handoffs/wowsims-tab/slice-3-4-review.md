# Slices 3 and 4 — combined review (fork-integration gate)

Reviewer: review lane (Opus, effort medium), 2026-08-14.
Gate: [`docs/plans/wowsims-tab/orchestration.md`](../../../docs/plans/wowsims-tab/orchestration.md)
§"Review points" item b — the gate before any fork integration merge.

Range reviewed: fork `e49dcf23c..6cf6dc28a` (`vendor/tbc-new-fork`, branch
`feat/upgrades-tab`) — `f7146dd69` (slice 3) and `6cf6dc28a` (slice 4) — plus
[`slice-3/HANDOFF.md`](slice-3/HANDOFF.md),
[`slice-4/HANDOFF.md`](slice-4/HANDOFF.md), and
[`scripts/check_engine_port_drift.py`](../../../scripts/check_engine_port_drift.py).

Spec: [`plan.md`](../../../docs/plans/wowsims-tab/plan.md) §2.2–§2.5, §4, §5,
§9 slices 3–4; decisions D4, D5, D7; PLAN.md §12 legibility rules.

## Verdict

**Pass with findings.** No finding blocks the fork-integration gate. One
medium finding (F1) is a real user-visible defect that should be fixed before
the tab is shown to anyone as complete, but it is a bug inside slice 4's own
new rendering code, not an integration hazard: it changes nothing about the
engine, the adapters, or this repo.

Not re-litigated per the review brief: E-W2 is blocked (ticket 156); slice 4's
sub-tab click and cutoff-toggle were not verified live. Both are judged
statically below.

## Findings

### F1 — `weapon` pool rows appear in no slot sub-tab (medium, does not block)

`upgrades_tab.tsx:489` computes a row's effective slot as
`row.slotChoice ?? row.slot` and casts it to `SimOrderName`, then
`slotsInView` filters `SIM_ORDER` by that set. But `row.slot` is a pool
`ItemSlot`, whose `weapon`, `finger` and `trinket` values are **not**
`SIM_ORDER` members (`engine/pool.ts:218-230` defines `SimSlotName` as
`Exclude<ItemSlot, "finger" | "trinket" | "weapon">` plus the numbered
variants). `slotChoice` rescues `finger` and `trinket` because
`engine/rank.ts:557-559` sets it only `if (slotNames.length > 1)` — which is
exactly the finger/trinket case. `weapon` maps to the single-element
`["mainhand"]` (`engine/pool.ts:232-241`), so `slotChoice` stays undefined and
the effective slot remains the literal string `weapon`.

Consequence: `slotsInView` never yields a `mainhand` tab, and
`slotPaneContent`'s filter (`upgrades_tab.tsx:345`) matches no pane, so every
weapon candidate is silently absent from the per-slot view. The shopping list
is unaffected — it does not group by slot.

Scale, measured against the committed fork data:

```bash
cd vendor/tbc-new-fork && python -c "
import json,collections
for f in ['ret-p2','ret-p3','feral-p2']:
    d=json.load(open('ui/core/components/individual_sim_ui/upgrades/data/%s.universe.json'%f))
    print(f, collections.Counter(e['slot'] for e in d['entries'])['weapon'])"
```

gives `ret-p2 12`, `ret-p3 18`, `feral-p2 57` — for feral p2, `weapon` is the
single largest slot in the universe, so the defect hides the largest group of
candidates for one of the two shipped specs.

The `as SimOrderName` cast at `upgrades_tab.tsx:489` is what let this through
the typechecker: it asserts a union membership the value does not have. Fix
direction (not applied — this review is read-only): map the effective slot
through `simSlotsForPoolSlot` rather than casting, or set `slotChoice`
unconditionally in `rank.ts` — but the latter is engine code and per plan §1
a shared-engine change routes through a design discussion here first, so the
tab-side mapping is the in-scope fix.

### F2 — `activeSubTab` is tracked but never restored (low, does not block)

`upgrades_tab.tsx:125-129` records the shown sub-tab into `this.activeSubTab`,
and `renderSubTabs` (`:286-293`) tears down and rebuilds every non-shopping-list
nav item and pane on each render. Nothing reads `activeSubTab` afterwards
(`grep -n activeSubTab ui/core/components/individual_sim_ui/upgrades_tab.tsx`
returns only the declaration at `:65` and the write at `:128`), so the field is
dead and the user is bounced back to the Shopping List sub-tab on every
re-render. Re-renders happen on each staleness event
(`wireStalenessListeners`, `:176-185`), so browsing a slot pane and then
nudging any setting silently loses the user's place.

This is cosmetic and it does not change a number, so it does not touch the
legibility rules. It is noted mainly because the dead field reads as an
intended behaviour that was not finished.

### F3 — `hideOwned` is a fixed `false` with no control (low, does not block)

`upgrades_tab.tsx:67` declares `private hideOwned = false` and `:334-336`
feeds it to `applyView`; nothing ever sets it. Plan §4's list for sub-tab 1 is
"BiS tags, `source` labels, owned greyed, cutoff behind an expand" — greying
is implemented (`:420`, `:425`) and hiding is not on that list, so this is not
a spec miss. The dead field is the same shape of unfinished intent as F2.

### F4 — `ENGINE_FORK_COMMIT` is one commit stale (low, does not block)

`upgrades/engine_provenance.ts:14` reads `"f7146dd69"` while the tip of the
range is `6cf6dc28a`. Slice 4's handoff states this plainly and explains it is
inherent (a commit cannot contain its own hash). The assumptions drawer will
therefore name slice 3's commit while running slice 4's code. Verified:
`git log --oneline -1` in the fork gives `6cf6dc28a`, and
`grep -n ENGINE_FORK_COMMIT ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`
gives `f7146dd69`. Disclosed, not hidden; the next `upgrades/` commit should
bump it as that file's own doc comment instructs.

### F5 — D7's visible iteration control is still absent (low, does not block)

D7 is "3,000 with a visible control". `rank.ts`'s `DEFAULT_ITERATIONS` is used
unconditionally and no control exists. Both handoffs state this: slice 3 calls
D7 "half-satisfied", and slice 4 flags that plan §4's behaviour list (which
its done-when is scoped to) does not name the control, so it was left out
rather than silently dropped. That reasoning is sound — the control is not in
§4 — but D7 remains unsatisfied at the end of slice 4 and no slice currently
owns it. Flagged so it does not fall between slices, not as a defect in either.

## Axis 1 — spec fidelity

**Views are pure renderings; no view toggle can sim or change a number.**
Confirmed by reading the call graph rather than by trusting the claim. The
only path to `rankUpgrades` is `run()` (`upgrades_tab.tsx:192-236`), and the
only caller of `run()` is the Run button's click listener (`:160-164`). Every
other interactive element in the file — the below-cutoff toggle (`:403-409`)
and the Bootstrap sub-tab buttons (`:304-324`) — mutates DOM classes or
Bootstrap tab state only. `resultsContent` and `slotPaneContent`
(`:338-349`) both re-derive from `applyView(this.state.ranking, …)`, and
`view.ts`'s own header states it is pure with no seam and no I/O; slice 4's
harness additionally asserted `applyView` does not mutate its input. So
PLAN.md §12's "no view changes a number" holds on this surface.

**No mid-run re-sorting; one re-sort at completion.** Satisfied trivially and
structurally: `render()` (`:238-243`) only reaches `resultsContent` /
`renderSubTabs`, and both return an empty fragment or bail unless
`state.kind === 'done'` (`:295`, `:339`, `:435`). During `'running'` the tab
shows only `progressLabel`, so there are no rows on screen to re-sort. The
single ordering happens when the terminal `'done'` state lands at `:235`.

**Staleness on gear change.** `wireStalenessListeners` (`:176-185`) subscribes
`player.gearChangeEmitter`, `player.talentsChangeEmitter` and
`sim.changeEmitter`, and the handler only flips `stale: true` on an existing
`'done'` state — it never re-runs. Plan §4's "never auto-rerun a multi-second
job on a checkbox" is respected. The `'done'` branch of `statusContent`
(`:255-266`) renders an `alert alert-warning` block when stale, which meets
§4's "visible banner" more literally than slice 3's inline text.

**Assumptions drawer vs §4's list.** §4 asks for "seed, iterations,
`maxPhase`, engine provenance (fork commit), and sim version". All five are
present (`:441-452`): seeds, iterations, max phase, `ENGINE_FORK_COMMIT`, and
`api-v${CURRENT_API_VERSION}`. Rendering seeds plural is correct rather than
loose — `rank.ts`'s `DEFAULT_SEEDS` is a list and paired replication can
consume more than the first. Subject to F4 on the commit value's freshness.

**Slice done-whens.** Slice 3's "a ret ranking completes in the tab" is *not*
demonstrated — the pipeline is shown starting (`Simming 0/277…`) and never
completing, because E-W2 is blocked. Slice 3's handoff says this in those
words and does not claim otherwise. Slice 4's "every view behaviour in §4
works without triggering a sim" holds except for F1's slot-pane gap.

## Axis 2 — adapter correctness

**`PlayerGearSource`** (`adapters/player_gear_source.ts`). The plan §2.2 open
item — what stands in for `talentPointsByTree` — was resolved rather than
worked around: `player.getTalentTreePoints()` is the page's own per-tree sum,
and `talentPointsByTree()` (`:97-113` of that file) throws on any length other
than 3 instead of defaulting, which is the right call for a malformed talents
string. The slot mapping deserves the scrutiny it got: `readGear` indexes
`equipped[i]` positionally against `SIM_ORDER`, which is only sound because
`Gear.getEquippedItems()` returns `Object.values` over an integer-keyed
partial record and the fork's `ItemSlot` enum runs `Head = 0 … Ranged = 16` in
`SIM_ORDER`'s order. Both the handoff and the file's doc comment say this was
verified by reading the two enumerations side by side. **Caveat, untested:**
`Object.values` over a *partial* record yields only the *present* keys, so if
a slot is empty the array is shorter and every later index shifts. The code's
`if (!eq) return { id: 0, slot }` guard handles a trailing gap but not a
middle one. I did not exercise this against a page with an empty middle slot,
so whether a partially-geared character mis-maps is **hypothesis, untested** —
worth a targeted check before the tab is trusted on a fresh character.

**Skeleton per D5 / [R6]** (`adapters/skeleton.ts`). Correct and minimal. It
calls upstream's own `Sim.makeRaidSimRequest(false)` — confirmed to exist at
`ui/core/sim.ts:246`, and confirmed that upstream's own real-run callers pass
`false` (`:276`, `:321`) while only the logs path passes `true` (`:370`), so
the `debug: true` forces `iterations: 1` reasoning is sound. It then deletes
`simOptions` and `requestId`, so the cache key is formed before seed and
iterations exist, exactly as [R6] requires. This is D5 satisfied by
construction: the skeleton is literally the request the user's own Simulate
button would send.

**`WasmSimRunner`** (`adapters/wasm_sim_runner.ts`). Seed and iterations are
injected in `run()` only, after the skeleton has been composed — the correct
side of the [R6] boundary. `raidSimAsync`'s signature is confirmed at
`ui/core/worker_pool.ts:100` and matches the three-argument call. The decision
*not* to use `runConcurrentSim` is well-argued and correct for this workload:
seed-sharding changes the float per shard count, which is precisely wrong for
many small independent requests, and upstream's own Batch tab establishes the
one-sim-per-candidate loop as the native idiom. Observation mapping
(`raidMetrics.dps.avg/stdev`, `iterationsDone`) matches the engine's shape,
and both the `result.error` and the missing-`dps` cases throw rather than
producing a silent zero. Owning a second `WorkerPool` is justified — `Sim`
exposes no accessor and the constructor is self-contained.

## Axis 3 — port discipline

All three checks pass, verified independently rather than taken from the
orchestrator's earlier diff:

- **No `engine/` file changed in the range.**
  `git diff --name-only e49dcf23c..6cf6dc28a -- 'ui/core/components/individual_sim_ui/upgrades/engine/'`
  returns empty.
- **No npm dependencies added.**
  `git diff e49dcf23c..6cf6dc28a -- package.json package-lock.json` returns
  empty.
- **No React habits.** `grep -rn "useState\|useEffect\|react"` over
  `upgrades_tab.tsx` and `upgrades/adapters/` returns nothing. The tab is a
  `SimTab` subclass using `element`/`fragment` JSX to real DOM, `ref()`,
  `TypedEvent` subscriptions, and `bootstrap`'s `Tab` — the tsx-vanilla idiom.
  The sub-tab strip is the hand-rolled `nav-tabs`/`tab-pane` pattern the plan
  asked for, copied rather than abstracted.

Independently re-run in this repo, both green:

```
pnpm engine-port-drift:check
  → engine port drift check ok: 30 ported files match PROVENANCE.md

npx vitest run packages/core/test/wowsims-fork-parity.test.ts
  → 1 passed | 1 skipped, 2512ms
```

The E-W3 timeout scare in slice 3's handoff did not reproduce here — the test
ran in 2512 ms against vitest's 5000 ms default, consistent with that
handoff's own explanation that the earlier timeout was CPU contention with a
stuck browser sim rather than a regression.

## Axis 4 — honesty of the handoffs

Both handoffs meet the durable-claims bar, and slice 3's is unusually good
about it. Specific checks:

- Slice 3 states E-W2 was **not** measured, in those words, and explicitly
  warns against letting "the pipeline starts" read as "the tab is fast
  enough". It then records the orchestrator's refutation of its *own* stated
  mechanism (Worker throttling, refuted by a 1.1× busy-loop ratio) rather than
  leaving the original story standing. Self-correction recorded against
  measurement is the right pattern.
- Slice 3's E-W1 pass is backed by exact commands, exact figures, and an
  independent reproduction with a separately written harness; the delta
  (1.8e-12 DPS) is correctly characterised as smaller than native's spread
  against itself.
- Slice 3 is candid that its harness scripts are session-scoped, and the
  orchestrator's correction about them still existing is recorded rather than
  quietly fixed.
- Slice 4 states plainly which two behaviours were not clicked live, and does
  not imply otherwise anywhere else in the document.
- Slice 4's "no `engine/` file was touched" and "30/30" claims both reproduce
  (above). Its `git status --short packages/core/src` empty claim is
  consistent with what I see: this review changed nothing under
  `packages/core/src`.

One overstatement worth naming, though it is contained: slice 4 says its
16-assertion harness verifies view behaviour "more thoroughly than eyeballing
a DOM after a lucky fast run would." That is true of `applyView`'s logic and
false of the rendering layer — and F1 is exactly the kind of defect the
harness could not catch, because it lives in `slotsInView`'s cast in the tab,
not in `applyView`. The harness tested the engine's view function; the bug is
in the code that consumes it. This does not make the handoff dishonest — it
lists sub-tab behaviour as untested — but the confidence in that sentence is
placed slightly wider than the evidence supports.

### On the two known-unverified items, judged statically

- **Below-cutoff toggle** (`upgrades_tab.tsx:396-414`): convincing. The
  handler closes over `belowTable`, a JSX-produced element that is in the
  returned fragment, and `classList.toggle('d-none')` returns the new
  presence, so `=== false` correctly reads "now shown" and the label swap
  follows. The toggle button and the table are siblings in one fragment, so
  the closure cannot outlive its target. Per-table state is independent
  because `rowsTable` builds a fresh closure per call, which is what the
  per-slot panes need.
- **Sub-tab click-switching** (`:301-331`): convincing as far as it goes. Each
  button gets `new Tab(btnRef.value!)` with matching `data-bs-target` and pane
  `id` from the shared `paneId()` helper, so targets cannot drift from ids —
  that is the usual failure mode here and it is designed out. The residual
  risk is not the click but the rebuild: see F2.

## Disposition

Gate: **pass with findings.** Nothing here blocks fork integration.

- F1 (medium) — fix before the tab is presented as feature-complete for feral
  in particular. Belongs to whoever next touches `upgrades_tab.tsx`.
- F2, F3 (low) — dead fields signalling unfinished intent; fix or delete.
- F4 (low) — bump `ENGINE_FORK_COMMIT` in the next `upgrades/` commit.
- F5 (low) — D7's visible iteration control is unowned; assign it to a slice.

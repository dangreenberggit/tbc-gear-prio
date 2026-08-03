Status: open
Type: task
Origin: `docs/reviews/phase-1-five-seed-spread.md` Standards finding ST4
Blocks: none
Blocked by: none

# Standards smells worth a cleanup pass

Judgement calls from the pre-merge review's Standards axis. None is a
correctness risk; each is a refactor with its own blast radius, so they were
deferred rather than done mid-review. Grouped roughly by value.

## Duplicated pinned-fetch logic — DONE 2026-07-30 (`d4ae638`)

`scripts/pinned_fetch.py` now carries `fetch`, `digest`, `lock_entry` and
`verify`; all three scripts delegate. Each keeps its own REPO, lockfile and
layout. Verified with `pnpm fetch:protos:check` and
`python scripts/sync_atlasloot.py --check` (both "in sync.") plus direct calls
over a known sha256 vector.

Original text:

`scripts/sync_atlasloot.py`, `scripts/sync_wowsims.py` and
`scripts/fetch_protos.py` each carry their own `fetch(sha, path)` with
`urllib.request.urlopen(url, timeout=120)`, a `hashlib.sha256(blob).hexdigest()`
check, and the same `{"path":…, "sha256":…, "bytes":…}` lock-entry shape. One
shared `scripts/pinned_fetch.py` would carry all three. Highest value of the
group: three implementations of "download and verify against a pin" is three
places for a supply-chain check to rot.

## Data clumps and duplicate `EpWeights` — DONE 2026-07-30 (`EpWeights` half only)

Checked actual usage before merging: `candidate-gems.ts`'s `EpWeights`
(`Readonly<Record<string, number>>`) never receives the array form anywhere in
its call graph — every caller into `fillCandidateGems` /
`fillEmptyCandidateGems` / `gemFillWeights` passes the record shape, confirmed
by reading `rank.ts`'s call sites. `meta-repair.ts`'s `EpWeights` genuinely
needs the union because it forwards `opts.epWeights` straight into `stats.ts`'s
`epScore(stats, weights: Record | number[])`. These were never the same type —
one is a strict subset of the other wearing the same name.

Resolved by **renaming, not merging**: moved the wide union to `stats.ts` as
the exported `EpWeights` (the module that owns `epScore` and already declared
this exact union inline), and imported it into `meta-repair.ts`. Renamed
`candidate-gems.ts`'s local record-only type to `EpWeightRecord` (kept local,
not exported — only that module uses it) so it stops colliding with the wider
name while keeping its narrower guarantee. `grep -rn "type EpWeights"
packages/core/src/` now shows exactly one declaration
(`packages/core/src/stats.ts`). Types-only change; `pnpm verify` (including
existing `candidate-gems.test.ts`, `meta-repair.test.ts`, `stats.test.ts`,
`rank.test.ts`) is green — typecheck is the actual evidence here since no test
can distinguish a type-only refactor.

The `(palette, epWeightRecord, epWeights)` data-clump / `GemContext` framing
and `rank.ts`/`slots.ts` changes are **not** done — out of scope for this pass
(another agent owns those two files concurrently). Re-open a follow-up ticket
if that grouping is still wanted.

Original text:

`(palette, epWeightRecord, epWeights)` travel together through `rank.ts`'s
`equipmentForCandidateSwap` → `swapItemAt` → `fillOptsForSwap`, and `epWeights`
is passed in *both* record and union form to the same chain. `EpWeights` is
declared independently in `candidate-gems.ts`
(`Readonly<Record<string, number>>`) and `meta-repair.ts` (a union including
`readonly number[]`) — same concept, two definitions. Wants one `GemContext`
type and one shared `EpWeights`.

## Slot names as bare strings — PARTLY RESOLVED 2026-07-30

`SIM_ORDER`, `simSlotsForPoolSlot()` (then `readonly string[]`) and `LoggedItem.slot`
use `string` while `ItemSlot` is a proper union next door. The cost is real:
`SIM_ORDER.indexOf(slotName)` returns `-1` on a typo and the guarded `continue`
silently drops the candidate rather than failing loudly.

**The silent drop is fixed** (`rank.ts`): the `continue` is now a throw naming
the slot, the mapped name and the item. An unmapped slot was never a fact about
the character's gear — it means `simSlotsForPoolSlot` and `slots-table.json`
disagree, i.e. a table bug — so failing loudly is right.

`pool.test.ts` now pins the invariant that makes the throw unreachable: all 14
`ItemSlot` values map onto names present in `SIM_ORDER`, plus the paired-slot
and two-hander cases. Nothing tested the mapping before, which is how the trap
survived. Mutation-checked: changing `weapon -> ["mainhand"]` to `["twohand"]`
fails with `weapon -> twohand: expected [...] to include 'twohand'`. Note
`rank.test.ts` does **not** catch that mutation — its fixtures carry no weapon
candidate — which is why the mapping needed its own test.

**RESOLVED 2026-08-02.** `simSlotsForPoolSlot` now returns
`readonly SimSlotName[]`.

The earlier text here concluded this "would need the table emitted as a `.ts`
const with `as const`, or a generated union — a codegen change." **That was
wrong, and it is the mistake worth remembering:** the `resolveJsonModule`
finding is true (deriving `(typeof SIM_ORDER)[number]` really does widen to
`string`, and really would be decorative), but `simSlotsForPoolSlot` never
touches `slots-table.json`. It is a hand-written `switch` over string
literals, so its own arms give the union for free. I measured one approach,
found it blocked, and wrote down "impossible" instead of "that approach is
blocked."

The drift worry ("a hand-written union could drift from `slots-table.json`")
is handled where it always was — `pool.test.ts` asserts every `ItemSlot` maps
onto a name present in `SIM_ORDER`, so a union that drifts from the table
fails a test rather than type-checking quietly.

## Unused `Deps` breadth

`rank.ts` ends with `void deps.store; void deps.clock;`. Both ports are required
by callers and unused by `rankUpgrades`; `Store`'s full `job.create/update/read`
surface plus `Job`/`JobCreateInput`/`JobUpdateInput` is exported and tested with
no consumer. The seams themselves are fixed at three by AGENTS.md and are not in
question — it is the unused breadth that reads speculative. Overlaps ticket 19
(second adapter) and ticket 23 (Deps shape); resolve alongside those.

## Feature envy in `fillOptsForSwap` — PARTLY RESOLVED 2026-08-02

`rank.ts`'s `fillOptsForSwap` and `findMetaGemId` walk `equipment[i].gems` and
call `getGem(...).unique` / `.colour` throughout. That reasoning belongs next to
the gem data (`candidate-gems.ts` or `gems.ts`), not in the ranking
orchestrator.

**`findMetaGemId` moved to `gems.ts`** — it was pure gem reasoning ("which of
these ids is a meta") with no reference to equipment or ranking, and `gems.ts`
already owns `getGem`. `rank.ts` no longer imports `GemColor` at all, which is
the tell that the move was complete rather than cosmetic (lint caught the
now-unused import).

Nothing tested it in its old home. It is a pure function, so it is now unit
tested directly per AGENTS.md — 5 cases in `items-gems.test.ts` covering the
mixed set, no-meta, ids absent from the palette, and the multi-meta tiebreak.

**`fillOptsForSwap` itself stays in `rank.ts`.** Its remaining envy is the
`getGem(id)?.unique` lookup, but the function's actual job is walking
*equipment* to build `FillEmptyOpts` for one swap — that is ranking
orchestration, and moving it to `gems.ts` would invert the dependency (gem
data importing the equipment shape). The clean version of this is the
`GemContext` grouping listed under "Data clumps" above, which is still open.

## `rank-report.ts` divergent change

588 lines holding slot ordering, source formatting, shortlist partitioning, HTML
structure and ~260 lines of inline CSS. Restyling and changing shortlist rules
edit the same file for unrelated reasons. Note the inline CSS is deliberate and
must stay inline — the report is self-contained by design — so the split is
template vs. rules, not extracting a stylesheet.

## Mysterious names — DONE 2026-08-02

`RankedItem.slotChoice` and `ReportItem.alternateSlot.choice` are now the sim
slot name (`finger1` / `trinket2`) instead of `"a" | "b"`. The value was
already in scope — `slotName`, from the loop over `simSlotsForPoolSlot` — so
this reads the real name rather than re-deriving one from the index.

**Corrected 2026-08-02 after pre-merge review.** This section first said the
field was typed `string` because "the honest union would come from
`simSlotsForPoolSlot`, which still returns `readonly string[]` for the codegen
reason recorded above." **That reasoning was false**, and both the Standards
and Spec axes caught it independently.

The `resolveJsonModule` problem is real but irrelevant here:
`simSlotsForPoolSlot` never reads `slots-table.json`. It is a hand-written
`switch` returning string literals (`pool.ts`), so a union follows directly
from its own arms — no JSON, no codegen. I cited a true fact about an
approach nobody needed.

Now typed `SimSlotName`, exported from `pool.ts`:
`Exclude<ItemSlot, "finger" | "trinket" | "weapon"> | "finger1" | "finger2" |
"trinket1" | "trinket2" | "mainhand"`. Verified it is not decorative —
assigning `"not-a-real-slot"` fails with TS2322, which is exactly what the
JSON-derived version could not do.

`PLAN.md` §4 pinned `'a' | 'b'`, so it is amended in place with the reason
(the branch wrote ADRs for comparable drift; this one is a rename of the same
fact, not a new decision).

**This was user-visible.** `fmtSlotChoice` falls back to `slotChoice` when
there is no worn item to name — i.e. when the paired slot is empty — so a
bare `a` reached the HTML report. It now renders `Into finger2`; a bare sim
slot name is jargon on its own.

Covered by a new `rank-report.test.ts` case for the no-equipped-item path,
which nothing exercised before (the existing test only asserted `a` must
*not* appear, which passed vacuously once the value was reachable).
Mutation-checked by reverting the formatter: `expected ... to contain 'Into
finger2'`.

## Added 2026-07-30 — folded in from ticket 22 — DONE 2026-08-02

Pair the hard-coded universe counts with membership assertions:
`pool-hardening.test.ts` (`toBe(362)`) and `pool.test.ts` (`toBe(238)`) detect
*change*, not correctness — a regression admitting 10 junk items while dropping
10 real ones keeps the count and passes. Wants a sampled set of ids that must
be present and a set that must be absent alongside the count tripwire.

**Done.** The must-be-present half already existed
(`WOWSIMS_ADMITTED_IN_P3`, 24 ids). Added `MUST_BE_ABSENT_FROM_P3`, five ids
each naming the rule that excludes it, so a failure says *which* rule broke:

- **30115 / 30118 / 30121 Destroyer** — Warrior T5. Phase 2, epic, plate, in
  body slots ret uses; only `classAllowlist: [1]` keeps them out, which is
  exactly the ticket-25 regression.
- **30318 Netherstrand Longbow** — Kael temp legendary.
- **34431 Lightbringer Bands** — a *paladin* item, excluded purely by phase
  (5 > 3), so it covers the phase gate rather than the class gate.

Absence assertions pass just as well when the item was never a candidate, so
a second test pins that all five are real, at-least-rare db items — otherwise
a typo'd id would make the test permanently, silently green.

Mutation-checked against the exact scenario the ticket describes: swapping a
real row for Destroyer Breastplate keeps the count at 354 and still fails —
`30118 Destroyer Breastplate should be excluded: classAllowlist is [1]
(warrior)`.

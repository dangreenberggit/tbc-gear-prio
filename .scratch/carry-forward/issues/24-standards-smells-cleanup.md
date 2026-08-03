Status: open
Type: task
Origin: `docs/reviews/phase-1-five-seed-spread.md` Standards finding ST4
Blocks: none
Blocked by: none

# Standards smells worth a cleanup pass

Judgement calls from the pre-merge review's Standards axis. None is a
correctness risk; each is a refactor with its own blast radius, so they were
deferred rather than done mid-review. Grouped roughly by value.

**Status 2026-08-03.** Everything here is done except one item, which is
blocked rather than forgotten:

- **Unused `Deps` breadth** — its own text says resolve alongside tickets 19
  and 23, and ticket 23's `Deps` item is itself waiting on `contentHash`
  becoming real. **This is the only thing left on this ticket.**
  **Handed off** in `.scratch/handoffs/contenthash-and-deps-shape.md`:
  implementing the ranking cache gives `deps.store` its first production
  consumer, which retires `void deps.store; void deps.clock;` as a side effect
  rather than as its own refactor. Note the pointer to ticket **19 is stale** —
  19 is closed, deferred to Phase 2 by ADR-0016.

Closed this round: `ITEM_SOURCE_KINDS` duplicated three ways, the `GemContext`
grouping, the JSON-widening trap behind both of them, and the
`rank-report.ts` split.

Nothing here blocks a phase gate.

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

## `ITEM_SOURCE_KINDS` duplicated three ways — DONE 2026-08-03 (`93cbb02`)

The list existed as a Python `frozenset`, a `Set` literal in
`pool-hardening.test.ts`, and implicitly in `pool.ts`'s `ItemSource` union.
Cross-language, so the fix is a shared JSON as this ticket predicted:
`packages/core/src/item-source-kinds.json`, following the `slots-table.json`
precedent — TypeScript imports it, `assemble_universe.py` reads it, the test
literal is gone.

Only the **kind names** are shared. The per-kind field shapes (`zone` vs
`dungeon` vs `cost`) cannot be expressed in JSON and stay in the union.

**The interesting part is how the JSON is kept honest**, and the first attempt
got it wrong in the way this ticket had already recorded once.

The obvious move is a type-level `extends` assertion in both directions. One
is rejected by typecheck and the other **passes vacuously** —
`resolveJsonModule` widens `kinds` to `string[]`, so `(typeof kinds)[number]`
is `string` and asserting against it proves nothing while looking rigorous.
Same trap as "Slot names as bare strings" below, hit from the other side.

That was first shipped as a runtime test plus a comment explaining the
widening. **A comment is not a guard**, and the trap had now bitten twice, so
it was fixed properly in `d1ba49b` — see the next section.

## The JSON-widening trap, fixed at the root — DONE 2026-08-03 (`d1ba49b`)

This ticket recorded the trap twice and drew the wrong conclusion the first
time ("would need the table emitted as a `.ts` const … a codegen change",
filed under impossible). It is not impossible. It is exactly the fix, and it
is now in place.

Measured with a standalone compiler probe rather than repeating the received
explanation:

- `(typeof jsonImport.list)[number]` really is `string` — assigning
  `"not-a-kind"` to it compiles clean.
- `as const` on a JSON import is **TS1355**, so it cannot rescue the type.
- Every other route either casts (a lie) or reintroduces the third copy inside
  the validator.

So the JSON stays the **value** source of truth and
`scripts/generate_json_literal_types.py` derives the **type** as committed
`as const` code. No typed module imports those JSON files any more — the
widening has nowhere to happen.

**Audited all six `with { type: "json" }` imports in `packages/core` first.**
No vacuous assertion had shipped, but `SimSlotName` was a second live instance
of the same shape: `SIM_ORDER` widened to `string[]`, the union hand-written
next to it, held together only by a runtime test. Now
`Extract<SimOrderName, …>` — still hand-written, because it is a deliberate
*subset* (`SIM_ORDER` carries `offhand`, which ret never fills), but now
constrained against the real list.

Three drift directions, each mutation-checked:

| mutation | caught by |
|---|---|
| JSON edited, generated file stale | `codegen:json-types:check` (new first step of `verify`) |
| JSON has a kind the union lacks | TS2344 at `_JsonCoversUnion` |
| union has a kind the JSON lacks | TS2344 at `_UnionCoversJson`, plus a missing-return in `rank-report.ts` |

The generator pipes output through the repo's Prettier (`--stdin-filepath`);
without that, codegen and `format:check` disagree forever. Confirmed
idempotent.

The rule is now written down in `docs/workflow.md` and `AGENTS.md` rather than
living as a comment in one file — comments were what failed the first two
times.

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

### `GemContext` — DONE 2026-08-03 (`c644776`)

`GemContext` lives in `candidate-gems.ts`, not `rank.ts`: it is gem
vocabulary, and that module already owned `EpWeightRecord`.
`equipmentForCandidateSwap` and `swapItemAt` now take one context instead of
three parameters, and `rank.ts`'s `weightRecord()` helper is deleted — its
logic is the context's constructor.

The two weight fields were never independent inputs; `epWeightRecord` was
always `weightRecord(epWeights)` computed at the call site. Nothing stopped a
caller passing shapes that disagreed, and `rank.test.ts` demonstrated the
failure mode by passing `epWeights, epWeights` — correct only because its
fixture weights are already a record. That is no longer expressible.

Behaviour unchanged: `rank.test.ts` still pins `deltaDps` to 7.15 at 5
decimals through the recorded adapters.

**Found a genuinely untested branch on the way.** No test fed dense-array
weights through a candidate swap, so deleting the array→record conversion
passed all 158 tests. Three direct cases now pin it (`candidate-gems.test.ts`),
and deleting the conversion fails two. The gap predates this change — the code
moved rather than appeared — but naming the function is what made it cheap to
test.

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

**Amended 2026-08-03 (`d1ba49b`).** The paragraph above is right that
`simSlotsForPoolSlot` never reads the JSON, so its own arms gave the union.
But "a codegen change" was dismissed as though it were out of reach, and the
drift was left to a runtime test. Codegen is now in place
(`scripts/generate_json_literal_types.py`), `SIM_ORDER` is `as const`, and
`SimSlotName` is `Extract<SimOrderName, …>` — so a member that is not a real
sim slot is a compile error rather than a test failure. The runtime assertion
stays as a second check on the values.

The lesson stands and gets sharper: the first version measured one approach,
found it blocked, and wrote "impossible"; the second version found the right
scope but treated the blocked approach as permanently unavailable instead of
asking what it would cost. It cost one script.

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

## `rank-report.ts` divergent change — DONE 2026-08-03 (`95ff955`, `ab4e261`)

Split along the axis this ticket named:

| file | lines | holds |
|---|---:|---|
| `rank-report-rules.ts` | 101 | `SLOT_ORDER`, `partitionShortlist`, `groupBySlot` |
| `rank-report.ts` | 274 | escaping, formatting, document structure |
| `rank-report-css.ts` | 277 | the stylesheet |

591 → 274 for the part you edit when changing markup.

**The stylesheet still ships inline**, as the ticket required: the report is
written to `.scratch/rank-reports/` and opened straight from disk, so it must
be one self-contained artifact with no sibling assets. `REPORT_CSS` is
interpolated back into the same `<style>` element — it moved out of the
template's way, not out of the document.

The seam was already in the code: the three rules are pure, carry no HTML, and
were exactly the functions with their own unit tests. Moving them left two
imports unreachable in the template file, which lint caught — the tell that
the move was complete rather than cosmetic.

**How it was made safe.** Every existing case in `rank-report.test.ts` asserts
on a substring, so all twelve would pass while the markup or CSS silently
changed. `1e93c8e` added a full-document sha256 first; it never moved across
either half of the split, so the emitted report is byte-identical. Public API
verified by compiling a probe against every name `index.ts` re-exports, rather
than by eyeballing the export list.

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

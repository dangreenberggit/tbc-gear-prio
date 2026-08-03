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

## Slot names as bare strings

`SIM_ORDER`, `simSlotsForPoolSlot(): readonly string[]` and `LoggedItem.slot`
use `string` while `ItemSlot` is a proper union next door. The cost is real:
`SIM_ORDER.indexOf(slotName)` returns `-1` on a typo and the guarded `continue`
silently drops the candidate rather than failing loudly.

## Unused `Deps` breadth

`rank.ts` ends with `void deps.store; void deps.clock;`. Both ports are required
by callers and unused by `rankUpgrades`; `Store`'s full `job.create/update/read`
surface plus `Job`/`JobCreateInput`/`JobUpdateInput` is exported and tested with
no consumer. The seams themselves are fixed at three by AGENTS.md and are not in
question — it is the unused breadth that reads speculative. Overlaps ticket 19
(second adapter) and ticket 23 (Deps shape); resolve alongside those.

## Feature envy in `fillOptsForSwap`

`rank.ts`'s `fillOptsForSwap` and `findMetaGemId` walk `equipment[i].gems` and
call `getGem(...).unique` / `.colour` throughout. That reasoning belongs next to
the gem data (`candidate-gems.ts` or `gems.ts`), not in the ranking
orchestrator.

## `rank-report.ts` divergent change

588 lines holding slot ordering, source formatting, shortlist partitioning, HTML
structure and ~260 lines of inline CSS. Restyling and changing shortlist rules
edit the same file for unrelated reasons. Note the inline CSS is deliberate and
must stay inline — the report is self-contained by design — so the split is
template vs. rules, not extracting a stylesheet.

## Mysterious names

`ReportItem.alternateSlot.choice: "a" | "b"` and `RankedItem.slotChoice?:
"a" | "b"` don't reveal which ring or trinket is meant. `simSlotsForPoolSlot`
already returns `["finger1", "finger2"]`, so `"finger1" | "finger2"` would be
honest.

## Added 2026-07-30 — folded in from ticket 22

Pair the hard-coded universe counts with membership assertions:
`pool-hardening.test.ts` (`toBe(362)`) and `pool.test.ts` (`toBe(238)`) detect
*change*, not correctness — a regression admitting 10 junk items while dropping
10 real ones keeps the count and passes. Wants a sampled set of ids that must
be present and a set that must be absent alongside the count tripwire.

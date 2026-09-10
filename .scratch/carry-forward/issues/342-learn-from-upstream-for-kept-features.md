Status: closed
Type: task
Origin: docs/fork-tab-native-bulk-sim-finding.md + code review (investigation 2026-08-31)
Blocks: none
Blocked by: none

# Learn from wowsims' code to improve the features we keep

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

The investigation confirmed our upgrades tab has real features wowsims' bulk code
does NOT have, and they are ours to keep — we are differently shaped, not behind:

- Per-item multi-slot best-of (rings/trinkets/weapons: try each placement, keep
  the better) — `upgrades/engine/rank.ts:648-770`.
- Per-swap gem/meta repair — `candidateSwapWithRepairs`, `rank.ts:1574-1594`.
- Per-request item-database injection the browser WASM sim needs (no `with_db`) —
  `rank.ts:167-169`, `simDatabaseFor`.
- A Stop that returns resumable partial work instead of discarding it —
  `rank.ts:844-877`.

These stay. But wowsims solves adjacent problems too, and their implementations
may teach us improvements — sharper primitives, a cleaner idiom, a correctness
edge, or a shared helper we could reuse. This ticket is a **learn-from-them pass**
over the features we keep, not a rewrite.

## Approach

For each kept feature, compare against how wowsims does the nearest equivalent:
- Their candidate/gear handling (`sim/core/bulk/generator.go`, `candidates.go`)
  vs our multi-slot best-of + swap repair.
- Their worker/DB assumptions vs our per-request DB injection.
- Their abort handling (`ui/core/wasm/bulk_sim/`) vs our resumable partial Stop.
- Their concurrency (`async.queue` in `batch.ts`) vs our `promise-pool.ts` — note
  this overlaps ticket 344's `async.queue` question; coordinate so they don't
  duplicate.

Note anything worth adopting; note anything where ours is already better (keep +
document why). Fork code only.

## Acceptance

- [x] A short comparison per kept feature: keep-as-is / adopt-their-idea / adopt +
      note.
- [x] Any adopted improvement implemented in our `upgrades/` code, or ticketed if
      large.

---

## Resolution (2026-09-09, stage-gate 342-learn-from-upstream)

Comparison: `.scratch/stage-gate/342-learn-from-upstream/comparison.md`, read
against fork HEAD `6d0edd69d` and upstream `feature/backend-reforge` @
`cbf6b75a8` (the ref `data/wowsims.lock.json` already watches, and an ancestor of
the fork HEAD, so both sides were read from the one clone without re-pinning).

**Two of the four features are keep-as-is; two produced a real finding, and both
findings are ticketed rather than implemented.** Nothing was adopted into this
branch, so no fork engine file was edited and the PROVENANCE / re-pin cycle was
not triggered.

### Verdicts

**F1 per-item multi-slot best-of — adopt + note** (§ "F1"). The ring/trinket
best-of, the off-hand eligibility guard and the `HandTypeMainHand` exclusion are
equivalent to upstream or deliberate recorded scope decisions (tickets 308/309);
we need no dedup pass because we emit one row per item, not per combination. The
note: upstream's `bb4e77528` has two halves, and while the 2x2H half cannot reach
us, the 2H+OH half does — `attemptEligibility` guards only the off-hand
direction, so a two-handed candidate entering `mainhand` leaves a worn off-hand
item in the composed request. → **ticket 350**.

**F2 per-swap gem/meta repair — adopt + note** (§ "F2"). Gem handling is
deliberately richer than upstream's (we migrate and repair where `replaceItem`
discards, and `candidate-gems.ts` warns against drifting toward their re-gem
button), and our enchant validation calls upstream's own predicate. The note:
upstream keeps the Adamantite stone matched to the weapon's type family both on
the bulk path (`adjustWeaponImbueID`) and in `Player.setGear` on every gear
change, and our engine passes through neither because it composes from a pinned
skeleton and never touches consumables. → **ticket 351**, which deliberately
does *not* prescribe the mirror: `sim/druid/forms.go:51-56` grants the feral
paw-damage bonus for id 34340 only, so adopting upstream's rule as-is would rank
sharp and blunt feral candidates under different damage models. Settling that
fork-engine omission comes first.

**F3 per-request item-database injection — keep-as-is** (§ "F3"). Nothing
adopted. Our adapter is not a reimplementation: it routes through
`Gear.toDatabase`, the helper upstream attaches to every page sim, so there is no
idiom left to borrow. Upstream's bulk helper is not type-reachable from our
`SimItemSpec[]` signature and would not be byte-identical if forced.
`mergeSimDatabases` in `composeForBulk` is reachable but would move typed protos
into `engine/`, which the port's layering forbids, for no correctness gain.

**F4 resumable-Stop partial work — keep-as-is** (§ "F4"). Nothing adopted. Ours
retains strictly more: upstream discards partial simming results entirely
(`index.ts:115/151` omit the payload argument) and retains only its reforge
pre-pass output, which is the analogue of our per-sim cache that already survives
Stop. Upstream's retain-the-reusable-input / discard-the-half-finished-output
split is the line our code already draws, and independently supports ticket 286's
Stop ruling.

### Concurrency

Handed to **ticket 344** with no verdict, as that ticket's theme 3 asked
(§ "Concurrency (hand-off to 344)"). The measurement it wanted: `async.queue` as
used at `batch.ts:101` supplies neither of our two guarantees — upstream
hand-rolls result-at-index by carrying `idx` in the task payload and then drops it
in a `.filter()` compaction, and its error race is wall-clock, though it recovers
a comparable lowest-index error at the consumer via an ordered `.find()`. Both of
our guarantees are pinned by name in `packages/core/test/promise-pool.test.ts`.
344's theme 3 now points here; the fold-or-keep decision stays with 344.

### What is not claimed

Neither finding was measured in DPS. For 350, what the engine does with a
2H + off-hand request is unestablished, so how wrong today's two-hander rows are
is unknown; reachability *is* established — enh, warrior and hunter carry
two-handers in every committed universe, rogue carries none. For 351, the
mismatched stone and the candidate counts are confirmed from committed data and
the engine's two handling paths were read, but no DPS figure was taken on either
side of a change, and the ticket is explicit that the naive mirror would make
feral worse before it makes it better.

Both tickets were amended during this branch's own pre-merge review, which
caught two errors in their first drafts: a claim that `packages/core` exposes
`attemptEligibility` (it inlines the guard instead), and a directional claim
about the weapon stone that the fork's `sim/druid/forms.go` reverses.

### Commits

- `44f1083` baseline and document header (fork HEAD, upstream ref, E-W3 status)
- `e1ce197` the comparison document
- `0ee96dc` tickets 350 and 351, `NEXT` → 352, the 344 hand-off pointer, group
  README rows
- this commit: closure

E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) **ran and passed** on
Node 22.16.0. It cannot collect on Node 20 (`No such built-in module:
node:sqlite`), and `package.json` requires `node >=22.5.0`, so re-run it on a
Node 22 toolchain.

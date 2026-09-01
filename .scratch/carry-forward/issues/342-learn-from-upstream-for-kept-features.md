Status: open
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

- [ ] A short comparison per kept feature: keep-as-is / adopt-their-idea / adopt +
      note.
- [ ] Any adopted improvement implemented in our `upgrades/` code, or ticketed if
      large.

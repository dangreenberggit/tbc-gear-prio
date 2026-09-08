# Should the upgrades tab use wowsims' native bulk sim? — the finding

Plain-language answer to a question that has come up repeatedly: the upgrades
tab runs its own loop of per-candidate sims instead of calling wowsims' built-in
"Batch tab" bulk sim. Is that reinventing the wheel? **Mostly no — with one real
opportunity we should take.** This doc records the reasoning so it is not
re-litigated again.

Companion to [`fork-tab-batch-sim-architecture.md`](fork-tab-batch-sim-architecture.md)
(the mechanics of how our tab dispatches sims) and
[ADR-0025](adr/0025-upstream-has-a-gem-optimizer-we-stay-pinned-and-borrow-only-its-rules.md)
(the reforge/gem optimizer, a separate question).

## How this was produced

Read-only investigation of the fork clone `vendor/tbc-new-fork` at HEAD
`cab940c` (branch `feat/upgrades-tab`, on upstream `feature/backend-reforge`),
2026-08-31, over several focused agents. Every claim below traces to fork
source; `vendor/` is gitignored and lives only in the main checkout, so re-run
the reads there to re-verify.

## The one-paragraph answer

Our tab and wowsims' Batch tab sit on the **same underlying engine call** — one
ordinary sim per gear set, spread across a worker pool. We did not fail to use
their engine; we use it at the right layer. What differs is the **wrapper**
around that call. Their "bulk sim" wraps it in a _tournament_ that races gear
sets against each other, drops the losers, and returns only the top few. Our tab
wraps it in a _flat pass_ that sims every item once and keeps each item's gain
over your current gear — because the tab must **show every item**, including the
near-misses, with set-bonus context. For the tab's main "rank everything" view,
the tournament is the wrong wrapper: it throws away exactly the results we must
display. **But for the small-pool "best-in-slot" mode, the tournament fits — and
may be more efficient than what we do.** That mode is a real opportunity, tracked
as a ticket.

## Why the tournament is wrong for the rank-everything view

The tournament (`ui/core/wasm/bulk_sim/`) culls: it sims candidates cheaply,
drops any that fall behind the current leader, re-sims the survivors harder, and
returns baseline + the top-N survivors (`index.ts:114-168`,
`proto/api.proto:758-771`). A candidate that loses is gone — it has no returned
DPS number.

Our tab needs the opposite:

- **Every item's gain over your worn gear**, measured against a fixed baseline —
  not "is this behind the best item." Our cutoff is absolute-vs-baseline per row
  (`upgrades/engine/cutoff.ts`), and even items below the cutoff are shown as
  rows.
- **Set-bonus math** needs each set-piece candidate's individual number; culled
  candidates have none.

So routing the full ranking through the tournament would delete the data the tab
renders. Keeping our own flat pass is correct, not lazy — confirmed by an
independent code review, which found the divergence principled and the
implementation sound.

## The correction worth recording

Earlier notes in this session over-claimed twice, and both are fixed here so the
wrong version does not get re-cited:

1. **"Bulk sim is unreachable in the browser."** False. There is a full
   in-browser (WASM) reimplementation of the tournament
   (`ui/core/wasm/bulk_sim/index.ts`, reached via `ui/core/sim.ts:565`). The
   stubbed `bulkSimAsync` in `sim_worker.ts` is a _different, legacy_ path. Bulk
   sim runs fine on a static-hosted page.
2. **"The tournament's result shape fundamentally conflicts, always."**
   Over-claimed. It conflicts for a _large_ pool (culled to top-N). For a
   _small_ pool it does not — see below.

## The real opportunity: the tournament fits the best-in-slot (small-pool) mode

The tab has a "BiS-prune" mode that sims only a curated best-in-slot list (~16–27
items). For a pool that small, the tournament **does not cull**:

- Pools under 20 items take a single-stage path
  (`sim/core/bulk/estimate.go:7-18`); the culling stages only trigger when the
  pool exceeds their survivor caps of 100 then 25
  (`sim/core/bulk/stage.go:24-59`). A ~20-item pool trips neither.
- Even when a stage runs, it culls nothing if the pool already fits under the cap
  (`sim/core/bulk/statistics.go:57-61`).
- The only remaining trim is the final `top_results` count — a **tunable knob**
  (`sim/core/bulk/bulk_sim.go:86-89`), currently hardcoded to 5 in the caller
  (`ui/core/sim.ts:552`) but freely overridable in an adapter. Set it to the pool
  size and every item is returned.

And the inputs/outputs line up: the request takes your current gear as the
baseline and sims it; each result carries the candidate's DPS and the baseline's
DPS (`proto/api.proto:758-771`), so **item gain = candidate DPS − baseline DPS**
by direct subtraction, for every fed item. Candidates can be "your gear with one
slot swapped" — exactly our tab's unit.

In that mode the tournament also brings, for free, two things our flat pass lacks:
**adaptive iterations** (raises accuracy per item until it hits a target error,
instead of a fixed count for all) and **paired variance reduction**. So for the
BiS mode it could do our job, possibly more efficiently.

**The shared caveat:** the tournament sims candidates exactly as handed to it — it
will not repair gems or meta on a swap. We would repair candidates _before_
feeding them, which our own pass already does. (Re-optimizing gems is the
separate reforge-optimizer question, ADR-0025 and its own ticket.)

## What we keep, and what we could still learn

Our flat pass has real features their bulk code lacks, worth keeping: per-item
multi-slot best-of (rings/trinkets/weapons), per-swap gem/meta repair, the
item-database injection the browser sim needs, below-cutoff classification and
set-bonus synergy, and a Stop that returns resumable partial work instead of
discarding it. We are not behind — we are differently shaped. There is still one
of their tricks worth adopting into our pass regardless of the BiS question:
**adaptive iterations**. Both are tracked as tickets.

## Follow-up work

Tracked as a grouped to-do under
[`.scratch/upgrades-tab-sim-followups/`](../.scratch/upgrades-tab-sim-followups/README.md)
(tickets 339–344). None is started; all are deferred by the owner for focused,
separate work.

# Carry-forward backlog: delegation plan

Routing for handing the 16 open carry-forward tickets to small agents: what
each one touches, what may run beside what, and what a worker must be told.
The ticket file stays the source of truth for the problem itself.

Written 2026-08-06 against `phase-2/trust` at `d1da985`. `pnpm issues:open` is
the live inventory; where it disagrees with this file, it wins.

`parallel-phase` owns isolation and fan-in mechanics. This file supplies the
routing decisions that skill assumes you have already made.

## The two traps

Everything below is arrangement around these. They are why this file exists.

**Contention.** Five tickets edit `scripts/assemble_universe.py` and three edit
`view.ts`. Workers sharing a file share an index, so one worker's `git add`
sweeps in another's half-finished edit. Check the contention table before every
fan-out — "mostly disjoint" is a claim to verify, not eyeball.

**Stale diagnosis.** These tickets carry their filing agent's hypothesis, and
that hypothesis is sometimes wrong. Ticket 47 was just closed after its stated
cause turned out false and the real defect was larger and elsewhere. Tickets
41, 36 and 45 were each rewritten after a first draft asserted a wrong cause —
41 still says at its top that two of its own claims were deleted. A worker must
reproduce the cause before fixing it, and say so when it does not survive.

## Waves

Ordered by dependency, not importance.

### Wave 0 — raise the floor first

| # | Type | Touches |
|---|---|---|
| [34](issues/34-tests-are-never-typechecked.md) | bug | `packages/core/tsconfig.json` |

`pnpm verify` never typechecks `test/**`, so every other worker writes tests
into an unchecked suite where a test can typecheck-pass vacuously — the failure
class AGENTS.md § Types from JSON warns about. Running this first raises the
floor for all of them.

It costs: the ticket measures **18 errors in 3 files already on `dev`**. That
makes it its own slot with a real budget, not a warm-up.

### Wave 1 — independent, fan out freely

Six tickets, six modules, no shared files.

| # | Type | Touches | Delegator note |
|---|---|---|---|
| [33](issues/33-caps-blind-to-talent-hit.md) | bug | `caps.ts` | Sibling of the just-closed 47 — that fixed a pick contradicting the cap, this fixes the cap value itself (~2.5× understated). Ticket carries the talent-string decode. |
| [35](issues/35-groupby-raid-picks-an-arbitrary-zone.md) | task | `view.ts` | Unreachable at `maxPhase: 2`, real at P3+. Ticket names the 5 affected items. Pair with 39. |
| [36](issues/36-relative-cutoff-within-a-filtered-view.md) | question | `cutoff.ts` | **Answer, don't code** — see Lanes. |
| [38](issues/38-two-offline-recording-builders-diverge.md) | task | `fixtures/*-offline.ts` | Pure dedup; ticket already diffs the two and names the 3 real differences. |
| [39](issues/39-belowcutoff-derived-twice-untested.md) | task | `rank.ts`, `view.ts` | Mostly a test ticket: assert two paths agree. Collides with 35/45 on `view.ts` — hand to whoever takes 35. |
| [40](issues/40-fight-resolution-is-not-spec-aware.md) | task | `spec.ts` | `classifySpec` exists and nothing on the resolution path calls it. |
| [44](issues/44-sources0-order-is-arbitrary.md) | bug | `pool.ts` | Needs a source-precedence **policy**, not just a sort — see Lanes. |

### Wave 2 — one file, strictly serial

Four tickets edit `scripts/assemble_universe.py`. Give them to one worker in
sequence, or run them one at a time.

| # | Type | Order | Note |
|---|---|---|---|
| [42](issues/42-crafted-profession-is-a-numeric-id.md) | bug | 1st | Smallest and most contained: a proto enum id needs a name map. Suspected root of 47 §3's profession contradiction. |
| [45](issues/45-unparsed-wowhead-prose-and-unknown-bucket.md) | task | 2nd | 87 unparsed rows, plus an `unknown` group surfacing in `view.ts` — so it also reaches Wave 1's 35/39. |
| [41](issues/41-ranged-slot-thin-and-worn-item-uncomparable.md) | bug | 3rd | Already partly fixed (worn-absent 24 → 14). Only the remainder is open. |
| [17](issues/17-phase2-plus-no-source-gap.md) | task | 4th | Triage, already done once — inventory at `.scratch/carry-forward/ticket-17-excluded-inventory.json`. Judgment work; see Lanes. |

Ticket [37](issues/37-token-boss-unguarded-and-fixtures-bypass-the-map.md)
touches this file *and* test fixtures. Sequence it into this wave.

### Wave 3 — blocked by design

| # | Blocked on |
|---|---|
| [31](issues/31-sqlitestore-job-ids-and-kv-created-at.md) | `SqliteStore` has no production call site; needs >1 writer to bite. |
| [32](issues/32-no-instrument-for-wcl-point-budget.md) | Needs a WCL adapter that does not exist — nowhere for the code to live. |
| [43](issues/43-random-suffix-items-have-no-simmable-stats.md) | Data, not code: the pinned db stores only base items. Wants a vendoring decision. |

31 and 32 are the only tickets carrying `Blocks: phase-4`, which makes
`pnpm land` refuse on a `phase-4/*` branch. On phase-2 they are inert, so
**nothing in this backlog gates landing the current branch.**

## File contention

Grepped per ticket. Bold rows are the ones that force serialisation.

| File | Tickets |
|---|---|
| `scripts/assemble_universe.py` | **17, 37, 41, 42, 45** |
| `packages/core/src/view.ts` | **35, 39, 45** |
| `packages/core/src/pool.ts` | 17, 44 |
| `packages/core/src/rank.ts` | 39 |
| `packages/core/src/caps.ts` | 33 |
| `packages/core/src/cutoff.ts` | 36 |
| `packages/core/src/spec.ts` | 40 |
| `packages/core/src/seams/store.ts` | 31 |
| `packages/core/src/fixtures/*-offline.ts` | 38 |
| `packages/core/tsconfig.json` | 34 |

## Lanes

Workhorse per `docs/agents/model-policy.md` for implementation slices — most of
this backlog. Three want the sharp lane or the user, because each needs a
judgment call rather than a known fix:

- **36** is `Type: question`. It wants a decision recorded, possibly an ADR.
  Handing it to a worker that writes code produces code for an open question.
- **44** needs a precedence policy over source kinds before any code.
- **17** is triage: which of the excluded items deserve to exist.

## Worker prompt

Fill and hand to one agent. It points at the ticket rather than restating it,
so the brief cannot drift from the file.

```
Fix carry-forward ticket <NN>, at .scratch/carry-forward/issues/<NN>-<slug>.md.

Read the whole ticket file first. Some of these were rewritten after a first
draft asserted a wrong cause, so the top of a file may retract claims made
lower down. Reproduce the cause yourself before fixing it. If your measurement
contradicts the ticket's stated hypothesis, report that and fix the real cause.

AGENTS.md is binding — read it. It governs the comment policy, durable claims
(a causal claim in a commit or ticket needs a re-runnable command or the word
"hypothesis"), types from JSON, and where tests go.

Work test-first via the `tdd` skill. Prove each new test RED against the
pre-fix tree before making it green.

If you touch a committed generated artifact (data/universes/**), regenerate it
from the committed sources and show the diff contains only your intended change.

`pnpm verify` green before you hand back.

Scope is this ticket. File anything else you find as a new carry-forward
ticket.

When done: set `Status: closed`, append a `## Closed <date>` section stating
what the cause actually was and what you verified, and commit on this branch.
Stop there — landing and merging to dev are the delegator's call.
```

## Suggested path

1. **34** alone — absorb the 18 existing errors, raise the typecheck floor.
2. **Wave 1** — six workers: 33, 35+39, 36, 38, 40, 44.
3. **Wave 2** — one worker, serial: 42 → 45 → 41 → 17 (+37).
4. **Wave 3** — revisit when phase-4 opens or the WCL adapter lands.

Between waves: `pnpm verify` on the integrated tip, then `pre-merge-review`,
then ask before landing.

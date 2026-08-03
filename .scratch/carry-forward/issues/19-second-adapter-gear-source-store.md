Status: closed
Type: task
Origin: `docs/reviews/phase-1-five-seed-spread.md` Spec finding 1
Blocks: phase-2
Blocked by: none
Resolution: third option taken —
  `docs/adr/0016-second-adapters-for-gearsource-and-store-move-to-phase-2.md`
  records the deferral. The §5 two-adapter rule stands; only the phase moves,
  and Phase 2 is not complete until both adapters exist. 2026-07-30.

# Two of three seams ship with one adapter

## Problem

PLAN.md §5 states the rule plainly:

> Three, and only three. The discipline being applied: _one adapter is a
> hypothetical seam; two adapters is a real one._ Each seam below has two
> adapters that **both actually get built, in Phase 1, and both actually get
> used**.

Shipped after Phase 1:

| Seam | Adapters |
|---|---|
| `SimRunner` | `CliSimRunner` + `RecordedSimRunner` — **compliant** |
| `GearSource` | `RecordedGearSource` only — no live WCL adapter |
| `Store` | `MemoryStore` only — `SqliteStore` is a comment, "(production, later)" |

Consequence, in the reviewer's words: every "runs offline from fixtures" claim
is true but **unfalsifiable**, because there is nothing else it could run from.
A seam with one implementation has never been shown to vary, so the abstraction
is unproven — which is exactly what the two-adapter rule exists to prevent.

This does not make the Phase 1 offline evidence wrong. `rank.test.ts` really
does drive `rankUpgrades` through recorded adapters at all three seams, and
`RecordedSimRunner` throws on a cache miss, so containment is proven. What is
unproven is that the seams would survive contact with a live implementation.

## Why it was not fixed in the review

Building `WclGearSource` means live Warcraft Logs auth, rate limiting and point
budgeting (PLAN.md §4 measured ~10.6 points per resolve). `SqliteStore` means
schema, migrations and a file lifecycle. Both are substantial features, not
review-sized fixes, and `WclGearSource` in particular is most of what PLAN.md
§14 calls Phase 2's "caches" and the report-events fallback route.

## Done when

- `GearSource` has a live WCL adapter that is exercised by at least one test or
  a documented manual run against a real character.
- `Store` has a persistent adapter (SQLite per §5) that is actually used by a
  caller, not just defined.
- Or: PLAN.md §5 is amended by ADR to say the second adapter for these two seams
  lands in Phase 2, with the reasoning recorded — so the plan and the code agree.

The third option is legitimate and may be the right call, but it must be a
recorded decision rather than silent drift.

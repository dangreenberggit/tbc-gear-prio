# Sub-plans for raid-scoped pool formation

Read `.scratch/handoffs/raid-scoped-pool-plan.md` first. It is the parent plan.
Every document in this directory assumes you have read it and know the terms
defined in its section 1.

Those terms, repeated here so you do not have to go back:

- **False negative** — a real upgrade that a narrowing rule threw away before it
  could be simulated. This is the error that matters. A rule that keeps too much
  costs time; a rule that drops a real upgrade gives the wrong answer.
- **Recall** — the percentage of real upgrades a rule keeps.
- **Spearman correlation** — how well two rankings agree, from -1 to 1. Zero
  means no agreement. The EP score's correlation with simulated DPS gain is
  0.183.
- **EP** — the linear stat score the current pool generator uses to rank items.
- **Two-hop** — an item you cannot loot directly. Something else drops (a tier
  token, or a crafting recipe) and you exchange or use it to get the item. The
  pool must record the zone where that intermediate object drops.
- **maxPhase** — the content phase the game is on, 1 to 5. Note that Wowhead's
  guide URLs do not use the same numbering. See the parent plan section 5.2.

## Order

| Sub-phase | File | Depends on |
|---|---|---|
| 0 | `00-decisions.md` | nothing — settle these first |
| 1 | `01-atlasloot.md` | 0 |
| 2 | `02-two-hop.md` | 0 |
| 3 | `03-wowhead-lists.md` | 0 |
| 4 | `04-universe.md` | 1, 2, 3 |
| 5 | `05-rank-wiring.md` | 4 |
| 6 | `06-hardening.md` | 4, 5 |

Sub-phases 1, 2, and 3 are independent of each other and can run in parallel
once sub-phase 0's decisions are written down.

`WRITING-REVIEW.md` is a review of these documents for clarity. It does not
change any technical decision.

`00-measure.py` is the measurement script that produced sub-phase 0's numbers.

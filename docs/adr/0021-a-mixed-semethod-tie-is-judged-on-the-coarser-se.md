# ADR-0021 — A mixed-`seMethod` tie is judged on the coarser SE, and the cutoff stays independent-scaled

**Status:** accepted
**Date:** 2026-08-08
**Relates to:** PLAN.md §10 (statistical methodology), ADR-0020 (the cutoff is absolute)
**Tickets:** `.scratch/phase-2/issues/08-tie-groups-mix-two-se-scales.md`
**Origin:** fallout from 9c62693, which let paired replication run by default

## Context

Two `seMethod`s now ship in a single ranking. `replicateTopItems` rewrites the
top 8 **above-cutoff** rows to `paired-replicate`; every row below them keeps
`independent`. `assignTieGroups` compared the two with `Math.min(row.se,
leader.se) * 2`, under a comment (`view.ts`, point 2) that reasoned explicitly
about **two SEs of the same kind**. That assumption no longer holds, so the
tie decision at the boundary was being made implicitly by whichever value `min`
happened to pick.

### The two scales, measured

The ticket's figures were an unmeasured upper bound derived from
`docs/five-seed-spread.json` — a file whose two arms both re-ran _identical_
gear, so it measures baseline wobble, not the spread of a paired **delta**.
Measured directly instead, on ret P2, 240 rows, 3,000 iterations, seeds
11/22/33/44/55:

```bash
pnpm rank --region US --realm dreamscythe --character slamaltman \
  --offline --max-phase 2 --report <path>.html
```

Read `se` and `seMethod` per row from the `.json` written alongside the report.
The numbers below were observed on a local run on 2026-08-08 (Windows, Node
22.16.0, wowsimcli per `data/wowsims.lock.json`); `.scratch/` is gitignored, so
no artifact is committed and a fresh worktree must re-run the command to check
them.

| method             | rows | mean SE    | tie window (`2×se`) |
| ------------------ | ---- | ---------- | ------------------- |
| `independent`      | 232  | 2.149 DPS  | 4.30                |
| `paired-replicate` | 8    | 0.0155 DPS | 0.031               |

**~139×**, close to the ticket's estimated ~127× and in the same direction. Two
corrections to the ticket's arithmetic, both now measured rather than derived:
the paired SEs are _not_ uniform — rank 1 is 0.0994 while the other seven run
0.0005–0.0068 — and the `independent` figure at 3,000 iterations is 2.149, not
the 2.166 obtained by scaling 1.678 by `1/sqrt(N)`.

One correction to the ticket's method: `--raid Karazhan` filters the rows
_written to the JSON_ (`cli.ts`, `reportRanking`), so the command as filed emits
no `paired-replicate` row at all — every row in that file reads `independent`.
The ticket's own reproduction step could not have observed the thing it
describes. The command above omits `--raid`.

### The boundary is real, and the two scales disagree about it

On the measured run rows 8 and 9 sit **0.440 DPS** apart:

|                              | window | verdict  |
| ---------------------------- | ------ | -------- |
| paired side (`min`, shipped) | 0.0011 | not tied |
| independent side (`max`)     | 4.362  | tied     |

So this is not a theoretical concern that rounds away — it is a live
disagreement about a specific adjacent pair, decided today by an accident of
`min`. Every other adjacent pair in the top 14 is decided _within_ one method:
pairs 1–8 are all-paired and none tie, pairs 9–14 are all-independent and all
tie.

## Decision

**Within one `seMethod`, keep `Math.min`. Across two, use the coarser (`max`).**

Implemented as `tieWindow(a, b)` in `view.ts`, a named function rather than an
expression inline in the loop, so the rule has somewhere to be stated.

The reasoning is that a tie is a claim about **both** rows. Row 9 carries a
±2.18 DPS interval; no amount of precision on row 8 shrinks it, and the pair
cannot be resolved more finely than its worse-measured member. `max` is the only
scale both rows were actually measured on. Reading it the other way — the paired
row's window governing — asserts a resolution row 9 never bought, which is
exactly what §10 means by "resolution, not correctness": Stage 2's 5× budget was
spent on 8 rows and its resolution belongs to those 8 rows.

`Math.min` survives within a method because point 2 in `view.ts` still applies
there and both figures mean the same thing: it stops one wide-SE row bridging a
gap its partner's own interval never spans.

### The cutoff stays calibrated to the `independent` scale, deliberately

`CUTOFF = { absDps: 3.4, pct: 0.15 }` is `max(3.0, 2 × mean reported SE 1.678)`
(PLAN.md §10:715), an `independent` figure. The ticket asks whether the top 8,
measured ~139× more precisely, should still be gated by it. **They should, and
the constant does not move.**

The cutoff is evaluated **before** replication, and it is what _selects_ which
rows get replicated (`replicateTopItems` takes the top N of the above-cutoff
rows). A cutoff derived from the paired scale would therefore be circular: it
would need the paired SEs of rows that are only replicated because they cleared
the cutoff. The ordering is a fixed point of the current design, not an
oversight.

It is also the right bar on its own terms. The cutoff answers "is this delta
distinguishable from zero **at the precision the tool ran the pool at**" — and
the whole 240-row pool was ranked at `independent` precision. A row clears the
bar on the same evidence every other row was judged by; replication then refines
what is already in the shortlist. Re-deriving the bar from the 8 replicated rows
would move the line for the top 8 only, so an item's admission would depend on
whether it happened to fall inside a budget of 8.

`rank.ts:755` re-checks `meetsCutoff` against the replicated mean. That is
correct and stays: it re-evaluates the same absolute bar against a **better
estimate of the delta**, which is different from re-deriving the bar itself.

## Consequences

- **The mixed-scale boundary is decided in one named place.** `tieWindow` is the
  only expression that reads `seMethod` for grouping, so PLAN.md §3's
  "a change to how ties are grouped touches one file" still holds.
- **Ties at the boundary get wider, not narrower, than what shipped since
  9c62693.** On the measured run, rows 8 and 9 now read as tied. This is a
  behaviour change to the emitted grouping and is the intended one.
- **Stage 2's resolution is bounded by what paid for it.** Tighter grouping
  applies among the 8 replicated rows and nowhere else.
- **`PAIRED_REPLICATE_TOP_N` is now visible in the output.** Whether row 9 is
  tied to row 8 depends on where the budget of 8 fell. That is inherent in
  replicating a prefix, not introduced here, but it is worth stating: raising
  the constant moves the boundary rather than removing it.
- **If the cutoff is ever re-derived from paired SEs**, the circularity above has
  to be broken first — e.g. by replicating a fixed slice independent of the
  cutoff. That would supersede this ADR and ADR-0020's re-sim note applies
  (`engineVersion` must bump).

## Alternatives considered

**Compare only within a method** — never group a paired row with an independent
one. Rejected: it does not decide the boundary, it declares it undecidable, and
the boundary pair is a real adjacency a reader sees. It would also make the tie
structure depend on the replication budget in a way that reads as arbitrary —
row 8 and row 9 would be permanently ungroupable regardless of their deltas.

**Normalise the two SEs onto a common scale.** Rejected: there is no defensible
conversion. The two quantities measure different things (spread of a paired
delta vs. per-run mean error), and the shared-seed correlation that makes the
paired figure small is explicitly _not observable_ from one pair of runs
(PLAN.md §10:707). Any factor would be invented.

**Widen the paired rows' reported SE to the independent scale.** Rejected: it
throws away the measurement §10 Stage 2 exists to make, and `se` is a reported
field on `RankedItem`, not a grouping-only intermediate.

**Keep `Math.min` and document it.** Rejected: documenting it would mean writing
down that a pair is resolved to a precision one of its members does not have.
The ticket is right that the direction is "not obviously wrong" — tighter groups
at the top are what Stage 2 buys — but that argument justifies tighter grouping
_among replicated rows_, which `min`-within-method already delivers, not tighter
grouping across the boundary.

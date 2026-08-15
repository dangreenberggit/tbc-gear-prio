Status: resolved (regenerated data/universes/feral-p2.json and
feral-p2.report.json from the current generator and vendored pin; see commit
that closes this ticket for the exact regen command and field-level diff)
Type: bug
Origin: worker B1, ticket-sweep fan-out (spec named this ticket but the file
did not exist in this worktree's `.scratch/carry-forward/issues/` at the base
commit `cffaee0`, so it is filed fresh here rather than mirrored)
Blocks: none
Blocked by: none

# feral-p2 universe was stale against the generator

`python scripts/assemble_universe.py --spec feral --max-phase 2 --out <tmp>`
did not reproduce the committed `data/universes/feral-p2.json`. Confirmed with
`git diff --numstat` and a field-level compare
(`git show HEAD:data/universes/feral-p2.json` vs a fresh run): item id sets
were identical (253 entries both sides) — this was not a membership change.

Five `curatedSets` entries differed, always by the presence of `p3_6p` /
`p3_9p`: item ids `29994`, `8345`, `30627`, `29383`, `30106`. Example: `29994`
regenerates as `["p2_6p", "p3_6p"]`; the (now superseded) committed file held
only `["p2_6p"]`. `feral-p2.report.json`'s `sourceRecordAdds.curated` (2 vs 4)
and `excludedNoSource` (1480 vs 1478) moved by the same two items' provenance
gaining a curated-source record at p2.

## Root cause (confirmed, not hypothesis)

`entry["curatedSets"] = curated_sets_by_item[iid]` at
`scripts/assemble_universe.py` (near the entries loop, see the comment
"curatedSets is the full provenance and stays unscoped") reads the **unscoped**
map built by `wowsims_curated_sets_by_item`, which lists every curated-set
label an item appears in at *any* phase — not `bis_sets_at_phase[iid]`, which
is what `bis_set_labels_for_max_phase` scopes to `max_phase`. This is
deliberate and documented as of commit `d1da985` ("Scope BiS to a phase, and
say when a pick costs hit"): `curatedSets` is meant to show full provenance
even for phases the item is no longer BiS in.

Commit `02f2f85` ("Pin feral's p3 curated sets so a P3 rank tags BiS from P3",
2026-08-10) added `feral_p3_6p.gear.json` / `feral_p3_9p.gear.json` to
`profile.gear_sets` for feral. Its regen accounting predicted "feral-p2.json
... sha256 unchanged ... a p3 set cannot leak into a p2 universe" — true for
`bisTags`/`bisSets` (phase-scoped), false for `curatedSets` (deliberately
unscoped). `feral-p3.json` was regenerated and is correct; `feral-p2.json` was
never regenerated after that commit and drifted from what the generator (with
p3 gear sets now vendored) actually produces, given the code's own documented
`curatedSets` semantics.

`data/universes/feral-p3.json` and all four `data/universes/ret-p*.json` were
checked the same way (fresh regen, field-level compare against the committed
files) and are already byte-identical in content — no drift found there.

## Verdict

**Superseded 2026-08-14 — see the correction below. The original verdict read:**

> **253 is correct** — item-id membership was never in question (both sides
> agree at 253; the earlier report of 256 in a different worktree/branch traces
> to different code, not this repo state, and this ticket does not investigate
> that number further). The `curatedSets` gap and the (nonexistent, here)
> entry-count gap do not share a cause — no entry-count gap was observed on
> this base.

### Correction — the entry-count gap was real, and 254 is the right number

That verdict was measured honestly at `c37b8e7` and was already wrong by the
branch tip. Two commits later `c718d38` (ticket 157) added
`TICKET_157_FORCE_INCLUDE` **with no spec gate**, so three ret trinkets began
entering the feral universes too. A feral regen at that tip produced **256**
against the committed 253 — the very figure the original verdict dismissed as
another branch's artifact. It was reproducible here in one command:

```bash
python scripts/assemble_universe.py --spec feral --max-phase 2 \
  --out /tmp/f2.json --report /tmp/f2r.json
```

The disposal clause was also a causal claim with no command behind it and no
**hypothesis** / **untested** marker — what AGENTS.md § Durable claims forbids.
"I cannot reproduce 256" would have been fine; "256 traces to different code"
was not.

**Resolved at `b2da640`**, which gates the force-include to ret. With that in
place all six universes reproduce byte-identically, and the correct feral-p2
count is **254** — one more than the committed 253, not 256:

| | committed at `c37b8e7` | force-include, ungated | after `b2da640` |
| --- | --- | --- | --- |
| `feral-p2` | 253 | 256 | **254** |
| `feral-p3` | 407 | 410 | **408** |

The one added entry in each is **28034 Hourglass of the Unraveller**, and it
belongs there: it is a real member of upstream's feral pre-raid gear set
(`vendor/wowsims/feral_preraid.gear.json`), which the same unparseable-source
gap ticket 157 documents had been silently dropping. So the feral artifacts
were stale for two independent reasons — the `curatedSets` drift this ticket
was filed for, and this membership drop — and `c37b8e7` fixed only the first.

Three numbers, three causes, none of them "another branch".

## Reproduce

```
python scripts/assemble_universe.py --spec feral --max-phase 2 \
  --out /tmp-or-scratch/feral-p2.json --report /tmp-or-scratch/feral-p2.report.json
git diff -- data/universes/feral-p2.json data/universes/feral-p2.report.json
```
Two runs of the same command are `cmp`-identical to each other and to the
regenerated committed file (checked locally on Windows; no CI run read, so no
cross-platform byte-identity claim is made here per AGENTS.md § Durable
claims).

## Done when

- [x] `feral-p2.json` regenerated and committed; matches what the generator
      produces from the current vendored pin (`8aa378b3`).
- [x] `feral-p3.json` checked against a fresh regen — already matched, no
      change needed.
- [x] Both `ret-p*.json` (p2-p5) checked the same way — already matched, no
      change needed.
- [x] `pnpm verify` green (see closing commit).

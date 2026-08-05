# Phase 2 — Trust, and the second spec

Decomposition of PLAN.md §14's Phase 2 into five subplan branches, each landing
onto the Phase 2 feature branch rather than into one long-lived branch.

## Branch topology

```
dev
 └── phase-2/trust                       ← the integration branch. Nothing lands
      ├── phase-2/caches                   into dev until the whole gate closes.
      ├── phase-2/disclosure-and-caps
      ├── phase-2/apply-view
      ├── phase-2/resolution-and-fallback
      └── phase-2/feral
```

Each subplan branches off `phase-2/trust`, is reviewed with `pre-merge-review`
against `phase-2/trust` as its merge base, and merges back into
`phase-2/trust`. Only when the §14 Phase 2 gate is fully checked off does
`phase-2/trust` land on `dev` via `pnpm land` — and that is a separate ask.

**These are sequential, not a `parallel-phase` fan-out.** Ticket 03 (`applyView`)
and ticket 04 (paired-replicate SE) both edit `rank.ts` and both change the
`Ranking` / `RankedItem` shape; ticket 02 also adds a required `caps` field to
`Ranking`. Three slices editing one file is a sequencing problem, and the
disjointness precondition in AGENTS.md § Parallel agents is not met. Run them in
the order below, one at a time, each rebased on the integrated tip.

Ordering rationale, which is the whole reason for this shape:

1. **Caches first** — it is the only slice that does not change `Ranking`'s
   shape, so it lands while the type is still stable.
2. **Disclosure and caps second** — adds the required `caps` field. Doing this
   before the view layer means `applyView` is written against the final type.
3. **`applyView` third** — pure, no seams, and it needs `bisTags` and `caps` to
   already be real.
4. **Resolution and fallback fourth** — `seMethod: 'paired-replicate'` rewrites
   the SE half of the ranking loop, which is easier once the view layer above it
   is fixed and tested.
5. **Feral last, deliberately.** It is the gate's falsification test: *"feral
   shipped without a structural change to `rankUpgrades` or its seams — if it
   needed one, stop and fix the seam before Phase 3."* Running it last means the
   four trust slices have already applied whatever pressure they were going to
   apply to the seams, so any structural change feral forces is a finding about
   those slices, not noise. Running it first would prove nothing, because the
   seams would then be reshaped four more times before the gate is read.

## Gate-box ownership

Every §14 Phase 2 box is owned by exactly one ticket. No box is unowned, and no
box is claimed twice.

| Gate box | Ticket |
|---|---|
| re-run hits cache; deltas stable | 01 |
| inactive-meta baseline auto-repaired and disclosed | 02 |
| a meta repair that would break a socket bonus picks the other move (§9, R4) | 02 |
| ≥3 real characters produce believable shortlists | 05 |
| fallback route exercised on a character with no ranked kills | 04 |
| a raid filter on a tier-token slot returns the tier piece (§8.3.2) | 03 |
| toggling any `ViewOptions` field does not change `contentHash` or trigger a sim | 03 |
| feral shipped without a structural change to `rankUpgrades` or its seams | 05 |

Note ticket 05 owns the "≥3 real characters" box: it is the only slice that has
more than one spec available, and a believable-shortlist check across three
characters is more informative once feral exists than three ret characters
would be.

## What Phase 2 does not include

- **Ticket 17** (`.scratch/carry-forward/issues/17-phase2-plus-no-source-gap.md`)
  — the phase-1 pre-raid / heroic-dungeon remainder. It carries `Blocks: none`,
  sits on no Phase 2 gate box, and the ticket records it as lowest priority
  needing its own before/after measurement. It stays open as carry-forward.
  No Phase 2 branch should touch `data/universes/*.json`.
- The web shell (§12) — Phase 3. `applyView` lands here, but nothing that
  renders it does.
- SQLite as the deployed store — Phase 4. Ticket 01 builds the adapter and its
  contract tests; deployment concerns stay out.

## Why these tickets carry `Blocks: none`

`scripts/check_merge_ready.py` scans **only** `.scratch/carry-forward/issues/`
(`CARRY` at line 29). A `Blocks: phase-2` header on a file under
`.scratch/phase-2/issues/` is therefore inert — it neither appears in
`pnpm issues:open` nor gates `pnpm land` on a `phase-2/*` branch. Writing one
would imply a gate that does not exist, so these use `Blocks: none` and rely on
`Blocked by:` for ordering, which is convention rather than a gate in any case.

The one ticket that *does* gate Phase 2 is carry-forward 30, which is correctly
filed under `carry-forward/` with `Blocks: phase-2`. Verified by calling the
gate's own detector:

```bash
python -c "import sys; sys.path.insert(0,'scripts'); import check_merge_ready as m; print(m.open_blockers_for_phase('phase-2'))"
```

It returns ticket 30 and none of the five subplan tickets. So `pnpm land` on
`phase-2/trust` will refuse while 30 is open — which is the desired behaviour,
since ticket 03 is what closes it. (Note the review-file check runs first, so a
land attempt fails on the missing review before it ever reports the blocker.)

## Verification

Each ticket names its own evidence. The phase gate is written into
`docs/verification-log.md` before `phase-2/trust` merges to `dev`, per §14's
"no phase starts until the previous gate is written" rule.

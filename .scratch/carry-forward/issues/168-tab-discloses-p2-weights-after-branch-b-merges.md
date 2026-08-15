Status: open
Type: disclosure defect (latent)
Origin: domain axis, pre-merge review of `feat/sweep-tab-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-tab-tickets.md`, finding D3)
Blocks: none
Blocked by: none

# The tab will name the wrong EP-weights file once branch B merges

The Upgrades tab's assumptions drawer discloses which EP-weights file produced
a shortlist. On `feat/sweep-tab-tickets` that disclosure is **correct**:
`EP_WEIGHTS_SOURCE_BY_SPEC` in the fork's
`ui/core/components/individual_sim_ui/upgrades/data/data.ts` names
`ret-p2.ep-weights.json`, there is no p3 weights file in that lineage, and
`SPEC_PROFILES["ret"]` in `scripts/assemble_universe.py` hardcodes the p2 file.
Every ret universe there was scored with p2 weights, so tab and artifacts
agree.

`feat/sweep-ret-tickets` breaks that agreement. It carries (from
`feat/ret-p3-data`) `data/presets/ret/p3.ep-weights.json`, an
`ep_weights_path_for` resolver, and `data/presets/ep-weights-by-phase.json`, so
ret p3/p4/p5 universes are scored with **p3** weights. The tab would then
disclose `ret-p2.ep-weights.json` for a shortlist built from p3-scored
artifacts.

A disclosure that confidently names the wrong file is worse than no disclosure,
because its whole purpose is letting a reader tell which weights produced a
`curationHint` without re-deriving it.

## Verify the two states

On `feat/sweep-tab-tickets`:

```bash
ls data/presets/ret/                                    # only p2.*
grep -n "ep_weights=" scripts/assemble_universe.py      # hardcoded p2
```

On `feat/sweep-ret-tickets`:

```bash
ls data/presets/ret/                                    # p2.* and p3.*
grep -n "ep_weights_path_for" scripts/assemble_universe.py
```

## Done when

Whichever of the two sweep branches merges **second** updates the fork's
`EP_WEIGHTS_SOURCE_BY_SPEC` so the disclosed file is resolved the same way the
assembler resolves it — per spec **and phase** — rather than being a fixed
per-spec constant. Ideally it reads the same
`data/presets/ep-weights-by-phase.json` the assembler and
`packages/core/src/ep-weights.ts` already share, so this cannot drift a third
time (ticket 102 is the standing precedent against hand-copying such a map).

Until then, treat the drawer's file name as trustworthy only on a branch where
`data/presets/ret/` contains p2 alone.

## Note

This is latent, not live: neither branch is merged, and on each branch in
isolation the disclosure is accurate. It is filed because the defect appears at
**merge time** without either branch changing, which is exactly the kind of
thing a per-branch review does not catch.

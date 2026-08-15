Status: resolved
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

## 2026-08-15 — resolved

Fixed ahead of the merge this ticket warned about, as part of the same slice
that built ticket 162 v2 (the user asked for both together). `data.ts`'s
`EP_WEIGHTS_SOURCE_BY_SPEC` fixed per-spec constant is gone; EP weights are
now resolved per spec **and** phase via a copied
`ep-weights-by-phase.json` (same file `scripts/assemble_universe.py` and
`packages/core/src/ep-weights.ts` read on `feat/sweep-ret-tickets`, copied
byte-for-byte apart from rewriting its `byPhase`/`fallback` string values
from that repo's `data/presets/<spec>/<phase>.ep-weights.json` paths to this
directory's flat `<spec>-p<phase>.ep-weights.json` filenames — the fork has
no `data/presets/<spec>/` tree to mirror the nesting). `ret-p3.ep-weights.json`
was copied alongside it, both from `feat/sweep-ret-tickets` commit
`23153d27db20ef9bb2ea4a958470ff1cf963e5e0` (read via the sibling worktree
`tbc-gear-prio-wt-sweep-ret`, since that branch does not exist on the outer
checkout this worker ran under).

`epWeightsFor`/`epWeightsSourceFor` now take `(spec, maxPhase)` instead of
just `spec`, resolving the highest `byPhase` key `<= maxPhase` else
`fallback` — the exact rule this ticket's "Done when" asked for, verified by
a test asserting `epWeightsFor("ret", 2)` and `epWeightsFor("ret", 3)` differ
and that p4/p5 fall back to p3 (`engine/ep-weights-v1.test.ts`, 2026-08-15,
6/6 pass). `data/PROVENANCE.md` in the fork's data directory documents the
copy and the one field-level edit (the path rewrite).

Fork commit: `3000b2f6b7178c2e98e994583f4e3300e0ceb269` on `w/a2-162-v1`.
Outer repo: `data/wowsims-fork.lock.json` bumped to that commit on
`feat/sweep-tab-tickets`. The disclosure line itself (ticket 162's own
concern) was extended in the same commit — see ticket 162's 2026-08-15
comment.

Not addressed by this fix: feral still has no `byPhase` entries (no feral
EP preset beyond p1 exists upstream at this pin), so it still resolves to
`feral-p1.ep-weights.json` at every phase — same "usable but degraded"
situation as before, just no longer mislabeled once `feat/sweep-ret-tickets`
merges, since this resolver reads the shared mapping file rather than a
hand-copied constant.

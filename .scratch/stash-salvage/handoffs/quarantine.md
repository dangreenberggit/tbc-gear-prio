# Handoff — salvage worker E (quarantine)

**Branch:** `phase-1/w-salvage-quarantine`  
**Base:** `25de532f3a5001344494ed74e550d9ef3550c6cc`  
**pathsAllowed:** `.scratch/stash-salvage/quarantine/**`, this handoff  
**pathsForbidden:** everything else (tip pool/scripts/packages untouched)

## Done

- [x] Branch created from base SHA (HEAD was already at base).
- [x] `quarantine/from-stash/` already held frozen stash copies (6 files); not modified.
- [x] `.scratch/stash-salvage/quarantine/UNRESOLVED.md` — owner decision gate: what the pile is, D1/D2/S4 conflict, scavenged slices A–D, unknowns, explicit no-stash-pop.
- [x] `.scratch/stash-salvage/quarantine/README.md` — filename index for `from-stash/`.

## Not done (by design)

- No changes to `data/pools/**`, `scripts/generate_pool.py`, `scripts/curate_ret_pool.py`, or `packages/**`.
- No stash apply/pop/drop.
- No merge of quarantine artifacts into live rank path.

## Fan-in notes for delegator

- **Conflict risk:** none with A/B/C/D — scratch-only paths.
- **Acceptance (PROCESS.md §E):** quarantine copies + UNRESOLVED note explaining unknowns and merge blockers — met.
- **Re-check at fan-in:** `rg "prefilterPool|--full-pool" packages/core` on integrated tip; stash still listed (`git stash list`, SHA in `stash0-refs.txt`).

## Owner follow-ups (optional, unresolved)

1. Diff HAND/FORCE in quarantine `curate_ret_pool.py` vs universe source metadata — any rows worth explicit universe inclusion?
2. Close or update `.scratch/carry-forward/issues/11-retire-ep-generate-pool.md` once tip legacy generator fate is decided.
3. Delete quarantine folder after decisions recorded, or keep as permanent archaeology — **owner choice**.

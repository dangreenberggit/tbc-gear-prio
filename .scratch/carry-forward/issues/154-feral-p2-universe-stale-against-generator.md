Status: open
Type: data drift
Origin: orchestrator verification of slice 6b, 2026-08-14
(`.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md`, slice 6b section)
Blocks: none
Blocked by: none

# `feral-p2.json` is stale against its own generator

Regenerating `data/universes/feral-p2.json` from committed sources does not
reproduce the committed file. Found while verifying slice 6b's claim that its
phase-guard fix changed feral output — it does not; this drift is separate and
predates that branch.

## Reproduce

From a checkout at `3673b24` (or later — the drift is not branch-specific):

```bash
python scripts/assemble_universe.py --spec feral --max-phase 2 --out /tmp/rf.json
```

then compare `/tmp/rf.json` to `data/universes/feral-p2.json`.

## What differs

- **Item id sets are identical.** This is not a membership change.
- **Five entries differ, all in `curatedSets`:** `29994`, `8345`, `30627`,
  `29383`, `30106`. Example — `29994`: regen produces `['p2_6p', 'p3_6p']`,
  committed holds `['p2_6p']`.
- A fresh regen reports 256 entries against the committed 253. **Untested**
  which of the two counts is correct; the entry-count gap and the
  `curatedSets` gap have not been shown to have the same cause.

## Why it matters

`data-pipeline-work`'s standing rule is that a committed generated artifact
must match what the generator produces from committed sources, or the
disagreement must be written down. Right now it is neither matching nor
documented, so any future feral regen silently folds this drift into an
unrelated diff — which is exactly what made it awkward to review inside slice
6b.

The `p3_6p` value appearing in a regen but not in the committed file suggests
the committed artifact predates a feral gear-set vendoring, but that is a
**hypothesis** — not traced.

## Not caused by the phase guard

`d96c044` (guard curated-item membership by the item's own phase) is
spec-agnostic and does affect feral's generated output in principle. It is
**not** the cause here: regenerating at the base commit, without that change
present, reproduces the same gap and the same five entries.

## Acceptance criteria

- [ ] A feral regen reproduces `feral-p2.json` byte-for-byte, or the
      disagreement is documented with which side is wrong and why.
- [ ] Whoever does it states whether 253 or 256 is correct, with evidence.
- [ ] Check `feral-p3.json` the same way — untested, and it may carry the
      same drift.
- [ ] `pnpm verify` green.

Status: open
Type: task (comment/test-comment accuracy — no behavioral defect)
Origin: docs/reviews/fix-ticket-257-feral-meta-preference.md
Blocks: none
Blocked by: none

# Shipped comment inaccuracies from the ticket-257 feral-meta-preference fix

Four small, independently-confirmed inaccuracies in comments shipped on
`fix/ticket-257-feral-meta-preference` (commit `601dfd8` / `39eb131`). None
changes ranking behavior — all are in prose that will mislead the next
reader. Bundled into one ticket because they are all "comment trustworthiness"
issues in the same block of code the branch just finished correcting once.

## 1. Factually wrong phase claim (highest priority — a wrong domain fact)

`packages/core/src/candidate-gems.ts` (block comment on `SPEC_PREFERRED_METAS`)
says `p5` uses "Powerful Earthstorm Diamond 25896, **outside this project's
phase range**." This is wrong. Verified independently twice (pre-merge domain
axis, and again directly for this ticket):

```
node -e "console.log(JSON.stringify(require('./data/gems/palette.json').find(g => g.id === 25896)))"
```

returns `{"id":25896,...,"phase":1,"quality":3,...}`. `gemsForPhase` (`packages/core/src/gems.ts:40-42`)
filters `phase <= maxPhase`, so a phase-1 gem is available at every supported
`maxPhase` (1 through 5) — it is inside every phase range this project
supports, not outside any of them. The real, defensible reason to prefer
32409 over 25896 is that 7 of 11 bear sets choose 32409 and only one (`p5`)
chooses 25896 — say that, not a phase claim that doesn't hold.

## 2. `feral-tank` "currently inert" claim is imprecise

Same comment block says the `feral-tank` row "is currently inert... nothing
reads it today," reasoning from `SpecId = "ret" | "feral"` (`types.ts:12`).
True for the *fill* path (nothing ranks `feral-tank` gear), but
`missingMetaPreferenceNote` and `metaSocketUnpriced` both take
`DetectedSpecId`, not `SpecId`, and the branch's own tests
(`candidate-gems.test.ts`) assert `missingMetaPreferenceNote("feral-tank")`
is `undefined` — which is a real read of that row through the disclosure
functions. "Nothing reads it" should be scoped to "nothing ranks it" or
similar, so a future reader doesn't conclude the row is safe to delete.

## 3. Stale provenance claim survives in two test-file comments

Commit `39eb131` corrected `candidate-gems.ts`'s claim that upstream records
no feral meta at all (true for cat, false for bear) — but the same wrong
claim was introduced in test comments by the earlier commit `601dfd8` and
was not corrected alongside the source fix:

- `packages/core/test/candidate-gems.test.ts` (~line 171-173): "Feral and
  feral-tank have no such preset... so those two rows rest on the owner's
  ruling instead" — wrong for feral-tank, which rests on upstream bear-preset
  evidence, not the ruling (the ruling text itself, quoted in the ticket, says
  "just for feral dps").
- `packages/core/test/rank.test.ts` (~line 3488): same claim, same fix needed.

This is exactly the class of drift ticket 257 itself exists to describe (a
hand-copied claim that goes stale in one copy while another copy is
corrected) — it just recurred one file further out.

## 4. Typo

`packages/core/test/rank.test.ts` (~line 3566): "Relentish Earthstorm
Diamond" — missing the second `l` in "Relentless". Cosmetic; the item id
(32409) alongside it is correct.

## 5. Re-check command has no stated precondition (durable-claims gap)

The `node -e "..."` command embedded in the `candidate-gems.ts` block comment
reads `vendor/tbc-new-fork/ui/druid/feralbear/gear_sets/`, which is
gitignored (`.gitignore:13`) and untracked (`git ls-files` confirms it is not
in the repo). On a fresh clone the command fails with `ENOENT`, not because
the claim is wrong but because the precondition isn't stated. Existing repo
precedent for referencing this same path states the gitignored/absent case
explicitly (e.g. `packages/core/src/rank.ts:513`, and every
`check_*_drift.py` / `check_sim_implemented_effects.py` script docstring
under `scripts/`, which "skip cleanly (exit 0) when vendor/tbc-new-fork is
absent"). The new comment should say the same: state plainly that the path
may not exist on a fresh checkout, per AGENTS.md's durable-claims rule
("never assert that a gitignored or untracked generated input is present for
a fresh worktree — give the regen/sync command and how to verify"). Note:
there does not appear to be an automated sync command for this specific fork
clone (unlike `vendor/wowsims`, which has `pnpm sync:wowsims:restore`) — if
so, say that plainly rather than inventing one.

## Acceptance criteria

- [ ] `candidate-gems.ts`'s `p5`/25896 phase claim corrected or removed.
- [ ] `feral-tank` "inert" language scoped to what's actually inert (fill,
      not disclosure).
- [ ] Both test-file comments (`candidate-gems.test.ts`,
      `rank.test.ts`) corrected to match the current, corrected provenance
      claim (feral-tank = upstream evidence, not ruling).
- [ ] Typo fixed.
- [ ] The re-check command's comment states the gitignored/possibly-absent
      precondition, matching existing repo convention for the same path.
- [ ] `pnpm verify` green.

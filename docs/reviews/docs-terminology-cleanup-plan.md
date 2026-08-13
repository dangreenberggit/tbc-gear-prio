# Pre-merge review — docs/terminology-cleanup-plan

Diffed against: `5d5dffa..HEAD` (14 commits)

**Scope deviation, deliberate.** The skill specifies `dev...HEAD`. This branch was
cut from `feat/set-bonus-value` (at `5d5dffa`), not from `dev`, so `dev...HEAD`
pulls in ~180 unrelated set-bonus commits across 120 files. All reviewers were
scoped to `5d5dffa..HEAD` — the 14 commits of terminology work. The tag
`terminology-cleanup-base` points at the same commit.

**Dispatch.** `codex` is not on `PATH`, so all three axes ran as fresh subagents
on the review lane (Opus), in one parallel batch, with no memory of the
authoring conversation. A fourth **independent commentator** ran separately at
the user's request and is reconciled below.

**Diff size.** `--shortstat` reads 6,105 / 5,866. The real content diff is
**567 / 328**; the remainder is line-ending normalisation (see A1). Read this
branch with `--ignore-cr-at-eol`.

---

## Adversarial

Four findings, all confirmed by execution rather than reasoning.

**A1 — 54 files silently flipped LF → CRLF.** Prettier, run by `lint-staged` on
every commit, rewrote files the terminology work never touched. The diff read
12,885 / 12,652 where the content change was 554 / 321 — 96% noise, which is
the condition under which a real defect goes unread. It also reassigned
`git blame` for every line of `PLAN.md`, `assemble_universe.py`,
`view.test.ts` and 51 others to a terminology commit.

This is the second occurrence: `.gitattributes` already carried
`package.json text eol=lf` with a comment recording ticket 129 — the identical
bug on one file, fixed by pinning that one file. It did not generalise.

**A2 — `.gitignore:63`** read "whose fixes have merged"; the fixes were merged.
A blanket-replace artifact.

**A3 — five dangling links** to `docs/phase0-findings.md`, which this branch
renamed, in `.agents/reviews/domain.md` (×3) and `pre-merge-review/SKILL.md`
(both mirrors).

**A4 — `check_rename_contradictions.py` lacks `sys.stdout.reconfigure`.** It
reads UTF-8 but prints to a cp1252 console, so `§` renders as `?`. Sibling
`merge_to_dev.py` handles this.

Verified clean: frozen identifiers byte-identical; the `dev` gate's logic,
flags, exit codes and `TBC_ALLOW_DEV_MERGE` unchanged; `.githooks/pre-commit`
still LF and executable; no semantic inversion; no test assertion changed.

## Domain

**D1 — `PLAN.md:168` "candidates: tier ≤ 2" should be "phase ≤ 2".** The
strongest finding of the review, and it reverses an issue-04 decision. The
control is 1–5 and phase does not map one-to-one onto tier, so no single tier
number identifies P5. (The reviewer's stated reason — that P4 and P5 drop no
tier token — is **wrong for P5**: Sunwell drops the belt/boots/bracers of the
same T6 sets P3 begins. Owner-corrected 2026-08-12; the conclusion stands on
the split, not on absence.) The CLI flag is
`--max-phase`, so labelling input "phase" and output "tier" contradicts itself.
Confirmed against `data/phase_raids.json`. Also confirmed docs-only — no such
string ships today.

**D2 — `CONTEXT.md` omitted the armour-set sense of "tier"** (_tier set_, _tier
piece_, _tier token_), which the repo uses constantly (`PLAN.md:548`, `:857`,
`:1012`, ADR 0023).

**D3 — the 163/6/39/0/6 gem figure** is from upstream `db.json` (214 total);
the curated palette is 156/6/39/0/6 (207). Both right for their source, but
unsourced.

**The P→T mapping is correct** — P1=T4, P2=T5, P3=T6, P4/P5 later T6-era —
independently confirmed against `data/phase_raids.json` (Kara/Gruul/Mag → T4;
SSC/TK → T5; BT/Hyjal → T6). This was the claim that would have poisoned prose
repo-wide had it been wrong. Gem counts, meta-gem counts and the epic-gem
gating all verified against committed data.

## Standards + Spec

**S1 — `PLAN.md:631` `[**P0**]` survived.** The sweep grepped the literal
`[P0]`, so a marker with non-adjacent brackets evaded both the edit and issue
05's gate. 28 of 29 markers had converted, not 29.

**S2 — `packages/core/src/cli.ts:407` "layer lands in Stage 2".** The Stage
rename edited this very line and left the banned verb — verbatim `CONTEXT.md`'s
own headline example of what not to write.

**S3 — AGENTS.md and skills edited without in-chat approval** (AGENTS.md:39).
Flagged as unverifiable rather than a violation: spec §6.2 was ruled by the user
on 2026-08-12, §2 D6 names both skills as first-party and in scope, and skipping
them would have left every skill pointing at a deleted command.

**Spec fidelity is high.** §6.1(b) honoured exactly — zero paths under
`docs/reviews/` changed, exactly two authorised `git mv` renames with history
preserved, `phase-N/*` and `Blocks: phase-N` intact. §6.2(b) done. All five
literal "land" sites verifiably untouched. The 6 extra marker variants
((P0), [R8, P0], [**P0**]) were judged justified scope expansion, not overreach,
since leaving them would reintroduce the ambiguity the issue exists to kill.

Durable claims spot-checked and true: the frozen-identifier count, the palette
buckets, the `PLAN.md:448` baseline claim, "`pnpm land` no longer exists".

## Independent commentary

Reconciled against the three axes. It agreed the work was worth doing and that
the central bet largely holds — it independently verified the 11 residual
`Phase [0-9]` hits are all game-sense, and confirmed the invariant empirically
rather than accepting it as claimed. It converged with the axes on A1, A3 and S1.

**Its unique finding, C1 — `PLAN.md:906` `[P1] Mitigated` → `[S1]`.** No other
reviewer caught this. Every check was written around the literal string `[P0]`,
so the one delivery marker that was not `P0` fell through. Confirmed
delivery-sense: the `[Rn]` series is separate, and the five-seed experiment it
records is a Stage 1 deliverable (`PLAN.md:717`, `:837`).

**C2 — "stage" is triple-booked, and the glossary documents only two senses.**
Delivery step, `rankUpgrades` pipeline step, _and_ content tier — the third at
`pool.ts:123`, `rank-report.ts:585`, `check_curated_set_phase.py:4`, whose
`pnpm verify` line prints "4 stages in step" meaning P1–P4. This branch created
none of those, but it promoted "stage" to the primary delivery word without
noticing the word was already overloaded. Worse, `CONTEXT.md` resolves the
collision with a **capitalisation rule** — the same mechanism the file itself
spends a paragraph explaining cannot work.

**C3 — `check_rename_contradictions.py` is closer to ceremony than tool.** It
was written after the bug it targets, its only live true positive is its own
docstring, and its regex requires both tokens on one line — so it would miss the
same bug across a line wrap, which in an 80-column hard-wrapped repo is the
common case.

## Summary

The rename itself is sound and was verified by execution, not assertion: frozen
identifiers byte-identical, the `dev` gate intact and reaching its pre-rename
verdict, `sync_wowsims.py --check` still parsing `CURRENT_PHASE = 2`, no
semantic inversion, `pnpm verify` green. Spec fidelity is high on both dangerous
instructions — `docs/reviews/` untouched, the gate unbroken.

Every finding was about **collateral damage or incompleteness**, not the rename:
line endings, five stale links, two missed markers, one missed verb. All were
fixed on the branch. Two judgment items are deferred as tickets.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                  |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | 54 files back to LF; `* text=auto eol=lf` pinned in `.gitattributes` (`40fc2df`, `54a0863`)    |
| A2  | Adversarial | fixed       | `.gitignore:63` "have shipped" (`eb41a4b`)                                                     |
| A3  | Adversarial | fixed       | 5 links → `stage0-findings.md`, both mirrors (`eb41a4b`)                                       |
| A4  | Adversarial | fixed       | stdout reconfigured to UTF-8 (`e39ba46`); ticket 137 closed                                    |
| D1  | Domain      | fixed       | `PLAN.md:168` reverted to "phase ≤ 2" (`58fb5ce`)                                              |
| D2  | Domain      | fixed       | `CONTEXT.md` records the tier-set sense and the P4/P5 gap (`58fb5ce`)                          |
| D3  | Domain      | fixed       | gem figure now names `db.json` and the palette (`58fb5ce`)                                     |
| S1  | Standards   | fixed       | `PLAN.md:631` `[**S0**]` (`eb41a4b`)                                                           |
| S2  | Standards   | fixed       | `cli.ts:407` "is built in Stage 2" (`eb41a4b`)                                                 |
| S3  | Standards   | wontfix     | Within the user's 2026-08-12 §6.2 ruling; skipping would leave skills naming a deleted command |
| C1  | Commentary  | fixed       | `PLAN.md:906` `[S1]`, legend updated (`eb41a4b`)                                               |
| C2  | Commentary  | fixed       | "stage" no longer names game content anywhere (`e39ba46`); ticket 138 closed                   |
| C3  | Commentary  | fixed       | scanner now sees wrapped sentences and identical table cells (`e39ba46`)                       |

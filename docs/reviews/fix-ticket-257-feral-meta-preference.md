# Pre-merge review — fix/ticket-257-feral-meta-preference

Reviewed range: `8a1c01a..bbcb911`

Dispatch: four fresh subagents (adversarial, domain, standards, spec), Claude
Code review lane (Opus, effort medium), one parallel batch. `codex exec` was
checked and is not on `PATH`, so this repo's fallback (fresh review-lane
subagents) was used per `docs/agents/model-policy.md`. All four ran read-only
against `git diff dev...HEAD`; none reported a dirty tree or ran a mutating
git command.

`dev`'s tip moved from `8a1c01a` (the sha named when this review was
dispatched) to `efc5165` ("Park ticket 227...") partway through this review.
The three-dot diff (`dev...HEAD`) compares against the merge-base, which is
still `8a1c01a` regardless of where `dev`'s tip sits, so this movement did not
change what was reviewed.

## Adversarial

The core change is sound: the table addition is a two-line data edit,
`metaSocketUnpriced` and `missingMetaPreferenceNote` both key off the same
`SPEC_PREFERRED_METAS[spec]` truthiness, so they stay consistent for all
three `DetectedSpecId`s. No `RankError` kind handling is touched. Purity is
clean.

**Findings:**

1. **`candidate-gems.ts` — the documented re-check command points at a
   gitignored, untracked path with no stated precondition.**
   `git check-ignore -v vendor/tbc-new-fork/ui/druid/feralbear/gear_sets/p1.gear.json`
   confirms `.gitignore:13:vendor/`; `git ls-files --error-unmatch` on it
   errors. The comment presents the command as durable evidence, but on a
   fresh clone it fails with ENOENT. The underlying fact is true — the
   reviewer ran the command and it reproduces the comment's counts exactly
   (7 sets socket 32409; three wear Wolfshead 8345; `p5` uses 25896) — only
   the reproducibility is broken. Matches AGENTS.md's durable-claims rule.

2. **`rank.test.ts` — `expect(row?.emptyMetaSocket).toBeFalsy()` is weaker
   than what it replaced, and the optional chain in front of it can hide a
   dropped row.** The old assertion was `toBe(true)`. `toBeFalsy()` passes on
   `undefined` as well as `false`; `rank.ts:1013` only ever assigns `true`
   explicitly, so today the value is genuinely `undefined`, not vacuous — but
   `row?.` means a future regression that silently drops this candidate from
   `ranking.items` would still pass the test. Reviewer probed this directly
   (temporary console instrumentation, run, deleted; tree confirmed clean
   before and after) and confirmed `row` is defined today with `gems`
   correctly seated.

3. **`candidate-gems.ts` — the "currently inert" claim about `feral-tank`
   contradicts the code two functions below.** The comment says the row "is
   currently inert... nothing reads it today," reasoning from
   `SpecId = "ret" | "feral"`. True for the fill/ranking path; false for the
   disclosure functions, which take `DetectedSpecId` and are exercised
   against `"feral-tank"` by this branch's own tests.

4. **Dead disclosure surfaces (`cli.ts`, `rank-report.ts`) now claim
   something structurally impossible.** With all three `DetectedSpecId`s
   covered, the "no meta gem preference is recorded" string is unreachable
   through any spec the pipeline can detect today. Not a bug — the comment
   already anticipates the next spec added without a row — but nothing marks
   these particular strings as reserved for that case.

**On the synthetic `"unlisted-future-spec"` cast:** judged **sound, with one
caveat**. It drives the real public function with a real value and asserts
real observable output — not mocking a collaborator. The branch it pins is
genuinely reachable the moment `DetectedSpecId` widens without a matching
row, which is exactly the ticket-142 / review-row-5-D4 case, and the test
comments say so honestly. Caveat: `missingMetaPreferenceNote(unlistedSpec)`
asserting `.toContain("unlisted-future-spec")` only checks template-literal
interpolation, not real behavior — the neighboring
`toContain("no meta preference recorded")` assertion carries the actual
weight.

**Unexamined:** full `pnpm verify` (out of scope for a read-only adversarial
pass — run separately by the review author, see below); the
`.scratch/carry-forward/issues/*.md` ticket prose (informational only, per
brief); the game-domain correctness of 32409 itself (domain axis's job);
`data/presets/feral/p1.ep-weights.json`'s tracked status (would fail loudly
if missing, unlike finding 1).

## Domain

Source of truth: `docs/stage0-findings.md`, `docs/verification-log.md`, plus
direct verification against `vendor/tbc-new-fork` and `data/gems/palette.json`
(both present on this machine).

**Verified — claims that hold:**

- **Bear preset evidence (7 of 11) is exactly right.** Running the comment's
  own embedded command against `vendor/tbc-new-fork` reproduces its claim
  verbatim: `p1, p2_balanced, p2_offensive, p2_survival, p3, p4, preraid`
  each return 1; `p2_hydross_frost, p2_hydross_nature, p2_warden, p5` return 0. The three exceptions wear socketless Wolfshead 8345; `p5` wears head
  34404 with gems `[32212, 25896]`.
- **Cat presets: no meta to copy.** All five `vendor/wowsims/feral_*.gear.json`
  files have head `8345` with no `gems` key and zero occurrences of 32409.
  The "owner ruling, not preset evidence" framing for `feral` is honest.
- **Meta activation (PLAN.md §9) is not contravened.** This diff only adds
  table rows; the activation-not-checked-at-seating rationale is unchanged
  and governs preference seating, not the repair pass. Nothing here
  re-derives phase, spec, or slot facts independently of their owning seam.

**Finding 1 (confirmed independently by the review author, not just the
domain subagent) — factually wrong phase claim.**
`candidate-gems.ts` says `p5` uses "Powerful Earthstorm Diamond 25896,
**outside this project's phase range**." `data/gems/palette.json` records
`{"id":25896,...,"phase":1,"quality":3}`, and `gemsForPhase`
(`packages/core/src/gems.ts:40-42`) filters `phase <= maxPhase` — so a
phase-1 gem is available at every supported `maxPhase` (1 through 5). It is
inside every phase range this project supports, not outside any of them.
Reproduce: `node -e "console.log(JSON.stringify(require('./data/gems/palette.json').find(g => g.id === 25896)))"`.
Consequence: a future reader dismisses a live alternative meta as
out-of-range on a false premise. The defensible reason to prefer 32409 is
simply that 7 of 11 sets choose it and one doesn't — that's true and doesn't
need the phase claim.

**Finding 2 — source and test comments disagree on `feral-tank`'s
provenance.** `candidate-gems.ts` says the row "is read from upstream, like
ret's." `candidate-gems.test.ts` and `rank.test.ts` both say "Feral and
feral-tank have no such preset... so those two rows rest on the owner's
ruling instead" — the exact claim commit `39eb131` was written to correct in
the source file, surviving uncorrected in two test files.

**Finding 3 — typo.** `rank.test.ts`: "Relentish Earthstorm Diamond" →
Relentless.

**Unexamined:** no sim run — read-only brief, so whether the under-pricing
asymmetry ticket 257 describes is numerically real at the magnitude claimed
was not re-measured here (it was measured on the ticket's own branch history,
outside this review's scope); `.scratch/carry-forward/issues/261-*.md`
(skimmed only, concerns fork-base pinning, not a domain fact this diff
touches).

## Standards + Spec

### Standards

**Hard violations:**

1. **Typo** in a durable claim, confirmed by `git grep` to be the sole
   occurrence in tracked code.
2. **Commit body wrap ≥72 chars in 4 of 5 commits** (rule 6, cbea.ms/git-commit).
   Violated in `39eb131` (up to 77 chars), `bbcb911` (up to 75), `b989902`
   (73). `31df84e` is clean. All five subjects pass rules 1, 3, 4, 5; `601dfd8`'s
   subject is 60 chars, over the ≤50 guideline but under the 72-char hard
   limit.
3. **Comment policy / durable claims — the `node -e` re-check command.**
   Including a re-runnable command is the right instinct, but it points at a
   gitignored, untracked path (confirmed via `git check-ignore` and
   `git ls-files`) with no sync/precondition stated, which AGENTS.md's
   durable-claims rule specifically calls out ("give the regen/sync command
   and how to verify"). Existing repo precedent for the same path
   (`packages/core/src/rank.ts:513`, and every `check_*.py` docstring under
   `scripts/`) states the gitignored/possibly-absent case explicitly; this
   comment doesn't.

**Judgement calls (baseline smells):**

4. **Duplicated Code / Shotgun Surgery** — the same provenance prose appears
   in three places (`candidate-gems.ts`, `candidate-gems.test.ts`,
   `rank.test.ts`), and the branch's own `39eb131`/`b989902` pair exists
   because one copy drifted from another. `rank.test.ts`'s copy already
   points back at the source comment; `candidate-gems.test.ts`'s could be cut
   to the same pointer.
5. **Duplicated Code** — the `"unlisted-future-spec" as unknown as
Parameters<typeof X>[N]` cast is re-derived four times against three
   different signatures in `candidate-gems.test.ts`. A single shared
   describe-scoped constant would remove the repetition.

**Not flagged:** block-comment length is justified (why, not what; points at
the ticket); test placement is compliant — assertions sit on `rankUpgrades`
and pure functions, never stage internals.

### Spec

Spec source: the full ticket at
`.scratch/carry-forward/issues/257-meta-socket-candidates-underpriced-against-repaired-baseline.md`.

**(a) Missing/partial:** none of substance. The code change matches "### The
change" exactly (both new rows, both `[32409]`); the new `rank.test.ts` test
matches the specified template (worn head 8345, candidate 30228, feral p2
context, three assertions including `metaStatus(...).kind === "active"` and
`metaSocketUnpriced(...) === false`); the synthetic-spec test rewrites are
necessary consequences the ticket itself anticipates under "Disclosure
paths," not creep.

**(b) Scope creep:** ticket 263 (filed by commit `bbcb911`) was not asked for
by 257's acceptance criteria — its own Origin line says it comes from a
separate owner question ("what would deriving this table take"). Authorized
by that separate ask, but outside 257's scope proper; likewise the `Blocks:`
edit to ticket 251 riding the same commit. The `feral-tank` row itself is
also beyond the literal ruling — the ticket concedes this ("added on top of
it without authorisation") — but it survives on separately-gathered bear
preset evidence rather than on the ruling, which is the correct resolution.

**(c) Implemented but wrong:**

- The same test-comment provenance drift the domain axis found (finding 2
  above): `candidate-gems.test.ts` and `rank.test.ts` still say "feral and
  feral-tank rest on the owner's ruling," which the ticket's own correction
  section says is wrong for feral-tank.
- The typo, again independently confirmed.
- The ticket's "red before" claim (`expected [ 24028, +0 ] to include
32409`) is corroborated (it matches the verification section's own probe
  table row for the same input) but not stated with the pre-fix sha needed
  to literally reproduce it today; a minor durable-claims gap, not a false
  claim.

## Summary

No blocking finding. The fix does what ticket 257 specifies, the new test is
genuinely red-before/green-after (corroborated, not just asserted), and the
`feral-tank` row's evidence is independently reproducible on this machine.
Every finding across all four axes is a documentation/comment-accuracy or
test-hardening issue — the two most concrete are a factually wrong "outside
phase range" claim (a real domain-fact error, independently confirmed twice)
and stale test comments repeating the exact provenance error the branch's
own `39eb131` commit was written to fix in the source file. `pnpm verify`
failed on first run, but the failures are three timeouts on the `feral-p3`
universe in test files this branch does not touch, confirmed pre-existing
and confirmed to be timeout flakiness rather than a real failure (see
below).

## `pnpm verify`

First run: **FAIL** — 3 of 864 tests failed, all on the `feral-p3`
universe, all `Test timed out in 5000ms`:
`synthetic-fixtures.test.ts > synthetic roster fixture: feral-p3 > replays
the recorded full-sweep ranking...` (6013ms), `full-sweep-recall.test.ts >
full-sweep recall — 'feral-p3' > reproduces the recorded above-cutoff set`
(9287ms), and `> ranks every above-cutoff row` (9966ms). Everything else
passed: 44 of 46 test files green, typecheck/lint/format not reached as
failures (vitest is the stage that failed).

Confirmed unrelated to this branch: `git diff dev...HEAD --name-only`
contains neither failing test file; both were last touched by `28b00f9`,
predating this branch. Confirmed to be a timeout, not a logic failure:

```
pnpm -C packages/core exec vitest run full-sweep-recall.test.ts synthetic-fixtures.test.ts -t "feral-p3" --testTimeout=60000
```

passed all 6 feral-p3-specific cases on the same checkout, with individual
cases taking 3.7s-7.3s — near or above the default 5000ms `testTimeout`,
which is not overridden anywhere in this repo. Filed as ticket 266 rather
than treated as a merge blocker, since it reproduces on `dev`'s tip and this
branch's diff cannot be the cause.

`pnpm merge-to-dev --check-only` was not run as part of this stop-after-review
task per the task's own instructions (review only, no merge action) — see
Disposition below for how the ticket/review-file gate is expected to read.

## Post-review fixes, 2026-08-22 (`980a87f`)

Every `defer` above that pointed at tickets 264 or 265 was **fixed on this
branch instead**, before any merge. Three of them were false statements in
shipped comments (the 25896 phase claim, the stale feral-tank provenance in
two test files, the overstated "inert" note) and one was the weakened
`emptyMetaSocket` assertion. Tickets 264 and 265 are `resolved`; the
Disposition rows below are kept as the review found them, not rewritten.

Ticket 266 (feral-p3 timeouts) remains open and deferred, correctly: it
reproduces on `dev`'s tip and this branch's diff cannot be its cause. The
re-run of `pnpm verify` after these fixes came back fully green — 861
passed, no timeouts — which is consistent with the review's flakiness
diagnosis rather than evidence against it.

## Disposition

| ID       | Axis            | Disposition | Ticket / note                                                                                                                      |
| -------- | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Adv-1    | Adversarial     | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 5)                                     |
| Adv-2    | Adversarial     | fixed       | `.scratch/carry-forward/issues/265-weakened-emptymetasocket-assertion-swallows-missing-row.md`                                     |
| Adv-3    | Adversarial     | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 2)                                     |
| Adv-4    | Adversarial     | wontfix     | Matches the repo's existing documented plan (comment already names the next-spec case); not a new defect                           |
| Dom-1    | Domain          | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 1)                                     |
| Dom-2    | Domain          | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 3)                                     |
| Dom-3    | Domain          | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 4)                                     |
| Std-1    | Standards       | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 4, typo)                               |
| Std-2    | Standards       | wontfix     | Commit-message wrap is a style nit on already-merged-worthy commits; not worth a rewrite of shipped history                        |
| Std-3    | Standards       | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 5)                                     |
| Std-4    | Standards       | wontfix     | Judgement call; the duplication is between a comment and its two test-file echoes, already captured by ticket 264's scope          |
| Std-5    | Standards       | wontfix     | Judgement call; the repeated cast is 4 short lines, low cost to leave                                                              |
| Spec-1   | Spec            | wontfix     | Ticket 263 and the ticket-251 edit are separately authorized by the owner, not undisclosed scope creep                             |
| Spec-2   | Spec            | fixed       | `.scratch/carry-forward/issues/264-shipped-comment-inaccuracies-in-ticket-257-fix.md` (item 3, same as Dom-2)                      |
| Spec-3   | Spec            | wontfix     | Minor durable-claims gap (missing pre-fix sha); the claim is corroborated by the verification section's own probe table, not false |
| Verify-1 | (review author) | defer       | `.scratch/carry-forward/issues/266-feral-p3-full-sweep-tests-time-out-at-default-5s.md`                                            |

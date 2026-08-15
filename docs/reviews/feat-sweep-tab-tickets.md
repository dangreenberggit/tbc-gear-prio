# Pre-merge review — feat/sweep-tab-tickets

Reviewed range: `5be6a814d97488201a09f7b3f709ea144e83b1e9..cab44cb03677c9a42ff367167c97c383328cea6f`

Three axes, all Opus at effort `medium`, fresh context, dispatched in one
parallel batch. `codex` is not on `PATH` on this machine
(`which codex` → no match), so the cross-vendor first choice was unavailable;
this is a harness ceiling, not a downgrade.

**Read this first: part of the branch is not in this repository.** The Upgrades
tab and the ported ranking engine live in a nested, gitignored clone at
`vendor/tbc-new-fork`, which is its own git repo. Ticket 162's implementation
is fork commits `57a84f1e4`, `3bd0cd997`, `179de35a4`, `63494ce7b` on fork
branch `w/a2-162-v1`. **None of them appear in this repo's `git log`**, and a
reader who looks only here will conclude the tab work never shipped. The fork
clone is also unrecoverable from a fresh checkout — its pinned commit was never
pushed (`git ls-remote` finds neither the branch nor `adb0d13`; the lockfile's
own `"pushed": false` agrees).

Scope: tickets 155, 156, and the v1 half of 162.

## Adversarial

Two blockers, both about what the parity gate can and cannot catch. Both were
verified by mutation, not argued.

**A1 — E-W3 could not fail on the two files whose hashes were re-blessed.**
Ticket 162 changed `disclosure.ts` and `rank.ts`. E-W3 never passed
`epWeightsSource` and never asserted on `Ranking.assumptions`, so the entire new
code path was unreachable from the test. The reviewer replaced the whole
standing-assumption array with an empty one — deleting _every_ disclosure,
including race and hit-cap — and E-W3 still passed. This mattered because the
orchestrator had re-run E-W3, seen green, and updated those two `PROVENANCE.md`
hashes on that basis. The checker's own warning ("a hash match proves nothing
about behaviour by itself — only E-W3 does") was therefore load-bearing and,
for those two files, false in practice.

**A2 — the fixture is self-keying, so request composition is invisible.**
`buildRecordingsAndRun` computes candidate equipment with the engine under
test, derives recording keys from that equipment via `engine.simCacheKey`, and
the same mutated engine looks the observation up under the same mutated key.
Key and lookup move together, so any mutation confined to request _composition_
— gem fill, meta repair, enchant carry-over, `compose` itself — cannot fail the
test. Only arithmetic downstream of the observation can. That is why exactly
the three mutations in the handoff table fail, and it means the test header's
claim ("a behaviour-changing edit to either copy fails this test") is untrue for
roughly half the ported modules. The self-reported `fillEmptyCandidateGems`
blind spot is a symptom of this, not an isolated gap.

**A3 — `combineSe` treats added-piece samples as `dps: 0`** (`set-value.ts:260-264`),
safe only if `combineSe` ignores `dps` entirely. Suspicion, not traced, not
touched by this diff.

**A4 — plan §5's bolded heading is stronger than its body.** The data (n=1 per
configuration, 5,000 iterations varying 2.3× between back-to-back runs) cannot
support a _rate_, but the conclusion actually drawn is ordinal — "seconds, not
the 93 s+ dev-server figure" — and that survives the noise. Nit.

Clean: `AGENTS.md` § Types from JSON is correctly respected in the fork's
`data.ts` (hand-written types, TS1355 cited by name); the drift checker's own
mechanics are sound and it genuinely fails on real drift.

## Domain

**D1 — the EP-weights disclosure was misleading by omission.** It said weights
"gate candidate selection only". But `assemble_universe.py:1602` sorts every
universe entry by `(slot, -curationHint, itemId)` and `curationHint` is the EP
score, so **within-slot ordering is an EP artifact the reader sees directly**.
Separately, `build_percentiles` ranks by `curationHint` and `measure_junk_filter`
can reject the bottom decile — currently inert (`junkFilter.applied` is `false`
in all six committed reports, verified) but the old wording would have silently
become false if that flag ever flipped.

**D2 — the parity fixture's domain facts all check out.** Verified against
`data/items/index.json` rather than the code comments: `30989` and `30997` are
both `setId 680` (Lightbringer Battlegear), head and shoulder, both genuinely
socketed; slamaltman's `CombatantInfo` carries zero `setId 680` pieces, so 0→2
really does cross the 2pc threshold, and `set-value.ts` lists 2pc as
measurable. `29983` is genuinely socketless and a sane P2 ret head.

**D3 — `ret-p2.ep-weights.json` is the correct file to name _on this branch_.**
There is no p3 weights file here and `SPEC_PROFILES["ret"]` hardcodes p2, so
the disclosure agrees with the artifacts. **This becomes wrong the moment
branch B merges**, which adds `data/presets/ret/p3.ep-weights.json` and
per-phase resolution — see the cross-branch note below.

**D4 — no contradictions with `docs/stage0-findings.md`.** Enchants resolve
through effectId not itemId, spec comes from `talentPointsByTree` summing to 61
rather than `specID`, `temporaryEnchant` is disclosed as omitted rather than
scored, meta activation goes through minimum-EP repair.

**D5 — the fork-side `enchantAppliesToItem` mock is faked on one side only**,
so E-W3 proves agreement given an oracle this repo's side takes from real code.
A bug in the port's enchant bridge would be invisible. Nit; documented in the
test.

## Standards + Spec

**S1 — the fork's only test is invisible to `pnpm verify`.** `vendor/` is
gitignored but not excluded in `vitest.config.ts`, so vitest collects
`ep-weights-v1.test.ts`, finds no vitest-registered tests (it uses `node:test`),
and reports "1 passed / no tests". The reviewer broke the assertion
deliberately and `pnpm verify` still reported it passing. Ticket 162's only
test passes the gate in every state, including broken.

**S2 — ticket 155 is genuinely resolved.** The reviewer re-ran the mutations
rather than trusting the ticket: `pairedReplicateSe +0.001` and
`computeSynergy +0.001` both fail, and the headline criterion — the mutation
that _passed_ before this ticket — now correctly fails.

**S3 — ticket 162's comment was stale and understated delivery**, still
describing the drawer wiring as an open gap after `179de35a4` closed it. A
reader following it would redo finished work.

**S4 — ticket 162's v1 pinning test is weaker than its own criterion.** It
builds a `pageWeights` local, asserts it differs from committed, then calls
`epWeightsFor("ret")` twice and asserts the two agree. `pageWeights` never
reaches a `Player`, `Deps`, or `rankUpgrades`. That pins a **type signature**,
not behaviour — and the exact v2 change it exists to catch would add the
parameter and leave it passing. Compounded by S1: it is not gated either.

**S5 — ticket 156's comment is a model of honest reporting**, and there is no
v2 scope breach: no toggle, no `Player` shim, no pseudo-stat channel;
`player.tsx`, `stats.ts` and `sim/**` are untouched. `dev` is unmoved, and no
`AGENTS.md` / `CLAUDE.md` / `.claude/skills/**` edits are in the range.

**S6 — four commit subjects exceed AGENTS.md's 50-character limit** (longest
62). Bodies are correct throughout. Nit.

**S7 — the hand-rolled `test-ts-loader.mjs` has no recorded decision.** It is
well-justified in its own header and the constraint was real, but it is a
fork-side toolchain divergence from a vitest repo, which is ADR-shaped. Nit.

## Summary

The branch delivers what it set out to: ticket 155 is properly resolved and
independently re-verified by mutation, ticket 156 answered its leading
hypothesis and honestly left the rest open, and ticket 162's v1 half now works
end to end after the fan-in wiring fix.

The serious findings are not about the features but about the **gate behind
them**. E-W3's claim to catch any behaviour change is untrue for every
request-composition module (A2), which is what made A1 possible: two ported
files were re-hashed on a green run that could not have failed. I fixed the
specific hole and left the general one ticketed, because closing it properly
means changing what the fixture asserts on, not adding pool entries.

Two gate defects compound in an unfortunate way: the fork's only test asserts
nothing under `pnpm verify` (S1), and what it asserts is the wrong thing (S4).
Ticket 162's regression protection is materially weaker than its ticket says.
Both are ticketed rather than fixed here, since strengthening the test is v2's
job and v2 is deliberately unbuilt.

**Cross-branch hazard for the merge decision.** D3 is only true while branch B
is unmerged. `feat/sweep-ret-tickets` adds `data/presets/ret/p3.ep-weights.json`
and per-phase resolution, at which point the tab's drawer will name the p2 file
while the ret p3/p4/p5 universes were scored with p3 weights — a disclosure
naming the wrong file, which is worse than no disclosure. **Whichever of these
two branches merges second must update `EP_WEIGHTS_SOURCE_BY_SPEC` in the
fork's `upgrades/data/data.ts` before it lands.** Filed as ticket 168.

No blockers remain unaddressed. Nothing here argues against merging; the
ticketed items are follow-ups, not regressions introduced by this branch.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                          |
| --- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial  | fixed       | `5cb013c` adds a standing-assumption parity assertion to E-W3. Verified by mutation both directions: gutting `disclosure.ts` now fails, unmutated passes. Residual (the narrow `epWeightsSource`-only case, absent on both sides) folded into ticket 165               |
| A2  | Adversarial  | defer       | `.scratch/carry-forward/issues/165-ew3-cannot-fail-on-request-composition.md` — needs E-W3 to assert on composed requests or recording keys; not a pool-size fix                                                                                                       |
| A3  | Adversarial  | defer       | Folded into ticket 165's done-when as the `combineSe` invariant to pin. Untraced suspicion, not touched by this diff                                                                                                                                                   |
| A4  | Adversarial  | wontfix     | The body already says "do not read 5.3 s as _the_ production-build number" and labels the variance untested. A bolded heading slightly ahead of its own hedged body is not worth a commit                                                                              |
| D1  | Domain       | fixed       | Fork commit `63494ce7b` rewrites the disclosure to name within-slot ordering and drops the absolute "selection only" phrasing. E-W3 re-run before re-hashing                                                                                                           |
| D2  | Domain       | wontfix     | No defect — fixture facts verified correct against `data/items/index.json`                                                                                                                                                                                             |
| D3  | Domain       | defer       | `.scratch/carry-forward/issues/168-tab-discloses-p2-weights-after-branch-b-merges.md` — correct today, wrong after branch B lands                                                                                                                                      |
| D4  | Domain       | wontfix     | No defect — no contradictions found                                                                                                                                                                                                                                    |
| D5  | Domain       | wontfix     | Known and documented in the test; closing it means importing Vite-only upstream modules into vitest, which plan §8 already rejected                                                                                                                                    |
| S1  | Standards    | defer       | `.scratch/carry-forward/issues/166-fork-tests-are-invisible-to-pnpm-verify.md`                                                                                                                                                                                         |
| S2  | Spec         | wontfix     | No defect — ticket 155 verified genuinely resolved                                                                                                                                                                                                                     |
| S3  | Spec         | fixed       | Ticket 162's comment now records `179de35a4` closing the wiring, plus the S4 caveat                                                                                                                                                                                    |
| S4  | Spec         | defer       | Recorded in ticket 162's comment. Strengthening the test is v2 work, and v2 is deliberately unbuilt                                                                                                                                                                    |
| S5  | Spec         | wontfix     | No defect — no scope breach found                                                                                                                                                                                                                                      |
| S6  | Standards    | wontfix     | Four subjects over 50 chars, bodies correct. Rewriting history to fix subject length costs more than it returns                                                                                                                                                        |
| S7  | Standards    | defer       | Folded into ticket 166, which forces the same decision about how fork tests are run                                                                                                                                                                                    |
| O1  | Orchestrator | fixed       | `.scratch/carry-forward/issues/167-engine-drift-gate-is-line-ending-sensitive.md` — the drift gate hashes raw bytes, so a Windows checkout of a ported file fails it on line endings alone. Hit twice during fan-in; diagnosed and normalized, ticketed for a real fix |

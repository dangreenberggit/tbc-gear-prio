# Pre-merge review — feat/upgrades-dedup-wowsims

Removes hand-mirrored wowsims re-implementations from the upgrades pipeline:
equip eligibility borrowed from the fork's own `canEquipItem` via a pin-gated
export; semantic union gates; EP-preset and meta-gem drift gates; named,
justified, published pool policies; ADR-0029. Stage artifacts in
`.scratch/stage-gate/upgrades-dedup-wowsims/`. Stacked on the unmerged
`feat/upgrades-all-dps-specs` (base `c77b720`, not `dev`). Companion fork
commits `32c5584..fd4d65c4a` on `feat/upgrades-tab`.

Reviewed range: `c77b7208028d589fea494d52bc6752acae40d382..bbb063298c02beda3756f2b357c8fb3928d2ab22`

Dispatch: no `codex` on PATH; adversarial + domain as fresh-context Opus
subagents (review lane); Standards + Spec via the `code-review` skill. Fix
batch by the stage-gate executor seat; round 2 below covers the fix commits.

## Adversarial

No blocking findings; core cleared under scrutiny (deltas independently
reconstructed for 10 universes; every addition armorType 1 to ret, every
removal handType 3 on a non-dual-wield spec with WeaponType 5/7 frills
retained; rogue now carries zero handType 4 — ticket 301's Ashbringer case
closed in the data; compacted JSON round-trips; harness shims proven inert to
`canEquipItem`'s reads; pin refusal enforced in all three checkers; the three
test edits are corrections, not weakenings; nothing depends on `dev`).
A1 **material** — `d7_note` publishes nothing for a spec setting only
`policy_two_hand_only` (constructor demands the note; publisher branches only
on weapon-type exclusions; reproduced). A2 **material** — the vendor-absent
skip in `check_equip_eligibility.py` returns 0 before the slug-map
totality/injectivity check, which needs no fork — on CI/fresh clones a broken
`SLUG_TO_FORK_SPEC` passes verify. A3 minor — the machine-readable exclusions
manifest cannot express the 2H-only policy (376 ret items outside the test's
join; prose note does explain it).

## Domain

**Domain-correct, no blocking findings**; every load-bearing number re-derived
independently (99 removals: all 14 distinct ids handType 3 on exactly the six
`canDualWield = false` specs, enh untouched, frills and ele's 27 shields
correctly kept, 34183 correctly NOT removed from ret; 306 additions: all
armorType 1 body-slot, zero weapons, all 36 ret cloaks preserved — the F3
data-loss trap avoided; feral 49 AP items = 10 maces + 39 staves + 0 polearms
reproduced; ret 23/23 2H; eligibility counts and spot checks all match).
D1 medium — shipped justification cites "Bulwark of Azzinoth (id 28593)" but
28593 is Eternium Greathelm, a plate helm legitimately in the pool (Bulwark is
32375); text-only. D2 low — ADR-0029's "warrior shipped 241 cloth" silently
includes 64 cloaks (177 body-slot) — the exact conflation the cloak trap warns
about.

## Standards + Spec

Standards: no hard violations beyond — ST1: the pin-refusal/vendor-skip
contract copy-pasted across the three new checkers and **already drifted**
(meta-conditions' `fork_commit` lost a type guard); ST2: a comment claiming
"exact compare" above a 1e-9 tolerance; ST3: the same latent `d7_note` hole
adversarial found as A1. Judgement calls: repeated full `db.json` loads
(~22 parses per manifest write); `policy_*` data clump. Compliant: WHY-shaped
comments with re-runnable commands, no JSON-derived types, artifact-level
tests, fork harness modifies no inherited file.

Spec: everything asked for present and verified against the user's four
failure criteria (no broken / duplicated / excessive code, no inherited-fork
edits — `git -C vendor/tbc-new-fork diff --name-only` outside `upgrades/` is
empty); zero scope creep. S1 — the EP gate's honest 19/20 state (ret/p3's
named symbol absent at every held pin) had no explicit acceptance on record.

## Summary

Four axes, 8 findings, none blocking: 2 material (both silent-disclosure gaps
of exactly the class the branch hunts — the 2H-policy note and the CI-skipped
slug-map gate), 1 drifted-duplication irony in the new gate scripts, and 5
minor/doc items. The substance held: both reviewers independently reproduced
the membership deltas, the policies, and the eligibility artifact. All items
were fixed or ticketed in one batch (commits `31f8409`, `f354ea8`, `124ab54`,
`3631e12`; fork `fd4d65c4a`); round 2 below verifies them.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                               |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `d7_note` accumulates scopes; new `scripts/check_policy_notes.py` in verify, red-before/green-after on exactly the missing kind (`31f8409`)                                                                                                 |
| A2  | Adversarial | fixed       | `slug_map_only()` runs unconditionally; reproduced the CI hole first; failure names the collision (`f354ea8`)                                                                                                                               |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/302-exclusions-manifest-cannot-express-hand-type-policy.md` — measured 285-item description gap; schema + test restructuring needed (points at 300); behaviour gate exists via check_policy_notes            |
| ST1 | Standards   | fixed       | `scripts/_fork_gate.py` single implementation; all three checkers refuse a null-commit lockfile identically; all nine mutation shapes re-run printing what they changed (`124ab54`)                                                         |
| ST2 | Standards   | fixed       | comment now states what the 1e-9 tolerance is for; headroom measured (smallest non-zero weight 0.01 across 199 values), not asserted (`124ab54`)                                                                                            |
| ST4 | Standards   | fixed       | repeated `db.json` parses cached on a separate `load_db()` (not `load_json`); full sweep 19.2 s, byte-identical (`3631e12`)                                                                                                                 |
| D1  | Domain      | fixed       | 28593 → 32375 at the source; ret p2–p5 regenerated, text-only (0 added/0 removed); SME handoff kept intact with an appended correction; fork bundled copies refreshed + re-pin (`31f8409`, fork `fd4d65c4a`)                                |
| D2  | Domain      | fixed       | figure qualified in place: 241 = 177 body-slot + 64 cloaks (`3631e12`)                                                                                                                                                                      |
| S1  | Spec        | fixed       | 19/20 state explicitly accepted; `.scratch/carry-forward/issues/303-ret-p3-ep-preset-names-a-symbol-absent-at-every-pin.md` filed (carries the pin-bump constraint: the matching gear file landed in `5c7491899`, 26 min after `ac0ed034b`) |

## Round 2 — fix verification

Reviewed range: `bbb063298c02beda3756f2b357c8fb3928d2ab22..3631e12d5d8ea75060a90a17e5c6e755099b69c6`

Fork range `ae5a7cc82..fd4d65c4a` included. Reviewer: the round-1 adversarial
seat (fix-verification round; not fresh-context, noted).

All six fix claims **verified, no regressions**: `d7_note` accumulates scopes
and the new `check_policy_notes.py` gate is non-vacuous (the reviewer
monkey-patched the A1 bug back in and the gate reported exactly it — its
one-synthetic-profile-per-policy-kind design is why a both-kinds spec cannot
mask a third); `slug_map_only()` runs fork-absent and fails naming the
injected collision while the vendor-absent clean-skip contract survives;
`_fork_gate.py` is the sole contract and uniformly rejects `null`/non-string/
malformed pins; the D1 id fix is text-only (0 membership movement, `d7Note`
the only differing field); the db cache has no self-recursion, is proven
non-mutating empirically (stable object hash after all call paths), and four
specs regenerate byte-identically in one process; tickets 302/303 open,
296/301 closed, `NEXT` = 304.

| ID  | Axis    | Disposition | Ticket / note                                                                                                                                                                                                        |
| --- | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Round 2 | fixed       | `_fork_gate.py` `relative_to(ROOT)` raised ValueError for out-of-repo lock paths instead of the module's printable message (latent; production callers use the default path) — fallback added, mutation shape re-run |
| B2  | Round 2 | fixed       | the review file itself was untracked at review time — committed with this round's close-out                                                                                                                          |

---

# Round 3 — Upgrades tab UI quality pass (ticket 304)

Reviewed range: `3631e12d5d8ea75060a90a17e5c6e755099b69c6..607fb79bd3478437d7ebf21feba376a0bf02f234`

**Dispatch note.** Three axes, fresh context, review lane (Claude Code: Opus,
effort medium). Reviewers were given BOTH diffs: the main-repo range above, and
the fork UI diff `fd4d65c4a..0666c60ba` (770 lines, 5 files) captured to the
session scratchpad. That second diff is the actual product change — the UI lives
in the gitignored clone `vendor/tbc-new-fork`, so a reviewer given only the
main-repo range would review tickets and plans and miss every line of code.

## Adversarial

Opus, fresh context, both diffs. The axis attacked four load-bearing claims and
each held up under its own greps:

- **`belowCutoffCount` has no reader in the fork UI** — 4 hits, all declaration
  or construction. The deliberate divergence is safe _within that scope_. See
  the orchestrator note below for the scope caveat.
- **Badge and pane cannot diverge** — `renderSubTabs` computes one `view` and
  hands the same object to both; the badge predicate at :1168 is
  character-identical to the pane's at :1381, and both run in one synchronous
  call, so no filter toggle or sub-tab restore can interleave.
- **The below-cutoff summary count** reads `rows.length` on the same filtered
  array it renders, so it matches its own contents after the owned drop.
- **i18n keys are complete in both files** — all five new keys present in
  `translation.json` and in the schema's `properties` _and_ `required`.

**A1 (low, FIXED) — the `console.info` was skipped on the error path.** Its own
comment said the build metadata must stay recoverable "when someone is
diagnosing a bad ranking", but the call sat after the `try/finally`, so a throw
from `rankUpgrades` propagated past it. That lost the metadata in exactly the
named case, and in the one case with no fallback — the drawer renders only for
`done`/`stopped`. Fixed on the fork in `c17f256d2` by moving the call into the
`finally`.

**A2 (low) — dirty working tree** during review: ` M docs/reviews/…` — this
file, being written by the orchestrator. Expected, not a defect.

No silent-failure mode found. The axis did not review the SCSS for visual
correctness (not verifiable by reading) and ran nothing inside the fork.

## Domain

Opus, fresh context, grounded in `docs/stage0-findings.md` and
`docs/verification-log.md`.

**No domain contradictions.**

- **D1 — the owned-row drop is safe, but not for the reason the code gives.**
  The real guarantee is `rank.ts:680-681`: an owned item is only ever simmed
  back into the slot it already occupies (`findIndex` + `continue`), so its
  delta is ~0 by construction. The code comment argues from `belowCutoffCount`
  having no reader, which is true but is not what makes the drop safe. All
  three hazard cases resolve — second copy in the paired slot, differently
  gemmed candidate, dual-slot buckets.
- **D2 — every degradation disclosure survives on-page.** Enumerated: EP-weight
  fallback, BiS-tag phase, unmeasured cutoff basis, partial source attribution,
  and the substitutions list. Only `engine_provenance` and `sim_version` moved
  to the console; `pool_universe` correctly stayed, and its retained comment is
  the accurate statement of the fallback it discloses.
- **D3 — the 17-slot vocabulary is intact.** `SLOT_LABELS` enumerates exactly
  the 17 `SIM_ORDER` members matching R17 character for character, with shirt
  and tabard correctly absent and `back` at index 3 — the exact position R17
  says a drop-only mapping gets wrong. The new badge reuses `effectiveSlot`,
  introducing no new slot arithmetic, so no 19-vs-17 error is reintroduced.
- **D4 — BiS/phase display unchanged** beyond `dl` grid classes.

The axis spun out one pre-existing engine gap it found while verifying D1: a
second copy of a non-unique ring or trinket is unrankable today. Filed as 308.

## Standards + Spec

Opus, fresh context, judged hardest on the owner's central complaint — does each
visual decision borrow an existing site idiom, or quietly invent one?

**Standards: pass with corrections.** The borrow-first discipline is real and
written into the code: three local rules announce themselves as inventions at
their own selector, which is what the ticket asked for. Defects:

- **T1 — three SCSS comments drifted into lab-notebook narration**, and
  `:188-192` **contradicts its own rule** (comment says 17.5px measured, rule
  says `min-height: 1.5rem` = 24px).
- **T2 — an unannounced third invention**: the two-row strip's
  `min-height: calc(2 * 45.6px + 1px)`, a constant measured in one browser at
  one font that no gate protects.
- **T3 — the three-column status grid does not match every state**:
  `done + stale` renders four children, four states render one bare text node,
  and `> span:first-child` does not apply where there is no span — yet the
  comment claims "one line, one idiom, for all seven run states".
- **T4 — `.upgrades-subtab-empty` is applied unconditionally**, including to an
  active tab, where it competes with `.nav-link.active`.

**Spec: substantially met, two claims outran the code.** Nine of eleven findings
verified fully fixed — `text-muted` at zero occurrences, three distinct empty
states, owned rows out of the below-cutoff group, drawer re-laid, build metadata
moved. The two gaps are both in the borrow theme:

- **S1 — the promised `.content-block-header` with title and row count was
  never added** (0 occurrences). What was borrowed is the `gap` value, not the
  header/body structure.
- **S2 — the bulk renderer's divider idiom was never adopted**, though it was
  chosen explicitly in place of the dropped hero card. Ticket 304 recorded item
  10's batch-UI sub-ask as "Fixed".
- **S3 — the residual five-digit clip** is honest in the ticket but absent from
  the code comment.

**Deferrals and ticket hygiene: honest.** 305 and 306 pass the
convenient-deferral test; 306 in particular reports a red gate with a baseline
comparison rather than burying it. Ticket 290's middle bullet is closed by a
negative grep with "no change was needed, and none was made" — the right thing
to write. Commit messages are strong against the seven rules.

## Summary

Three axes, fresh context each. **No blocking finding.** The shipped behaviour
is correct and measured: the adversarial axis found no silent-failure mode and
its four attacks on the load-bearing claims all failed to break them; the domain
axis found no contradiction with the repo's verified TBC facts, and confirmed
the 17-slot vocabulary and ordering are intact.

The most valuable findings were about **honesty of the record rather than
correctness of the code**. Two claims in ticket 304 outran what shipped (S1, S2)
and have been corrected in the ticket rather than left standing. One real bug
was found and fixed (A1). The domain axis showed the owned-drop is safe for a
_different reason_ than the code states — worth knowing, because if ticket 308
is ever fixed that safety argument expires.

## Orchestrator note — a scope caveat on the adversarial axis

The `belowCutoffCount` claim was verified against the fork's `ui/` only, which is
the scope the plan used. Checked across the whole repo,
`packages/core/src/cli.ts:454` **does** read it — but that is a separate parallel
implementation (`packages/core/src/view.ts`), untouched by this change, and its
rows are ~0 delta by construction per D1. So the CLI and the tab now describe the
below-cutoff group slightly differently: the CLI keeps owned rows unless
`--hide-owned`, the tab always drops them. Cosmetic given D1, and recorded in 308
because fixing 308 would make it matter.

## Disposition

| ID  | Axis           | Disposition | Ticket / note                                                                                                                                                                   |
| --- | -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial    | fixed       | `console.info` moved into the `finally`; fork `c17f256d2`, tsc and oxlint green                                                                                                 |
| A2  | Adversarial    | wontfix     | Dirty tree was this review file being written; not a defect                                                                                                                     |
| D1  | Domain         | fixed       | Safety confirmed; the real guarantee (`rank.ts:680-681`) recorded in `.scratch/carry-forward/issues/308-duplicate-non-unique-item-unrankable.md`                                |
| D2  | Domain         | wontfix     | No change needed — every degradation disclosure verified still on-page                                                                                                          |
| D3  | Domain         | wontfix     | No change needed — 17-slot vocabulary verified intact against R17                                                                                                               |
| D4  | Domain         | wontfix     | No change needed — BiS/phase display untouched                                                                                                                                  |
| D5  | Domain         | defer       | Second copy of a non-unique item unrankable: `.scratch/carry-forward/issues/308-duplicate-non-unique-item-unrankable.md`                                                        |
| S1  | Standards+Spec | fixed       | Ticket 304's acceptance corrected — the `.content-block` borrow is spacing-only; code work in `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md` |
| S2  | Standards+Spec | fixed       | Ticket 304's disposition corrected — item 10's batch-UI sub-ask is **not** done; carried by `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md`   |
| S3  | Standards+Spec | defer       | `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md`                                                                                               |
| T1  | Standards+Spec | defer       | `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md` — includes the `:188-192` contradiction                                                       |
| T2  | Standards+Spec | defer       | `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md`                                                                                               |
| T3  | Standards+Spec | defer       | `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md`                                                                                               |
| T4  | Standards+Spec | defer       | `.scratch/carry-forward/issues/307-upgrades-tab-borrow-gaps-and-comment-drift.md`                                                                                               |
| T5  | Standards+Spec | wontfix     | Commit-message nits only; the messages pass the seven rules                                                                                                                     |
| T6  | Standards+Spec | wontfix     | 304 carries the `pnpm sync:wowsims` precondition; 307 repeats it                                                                                                                |
| T7  | Standards+Spec | wontfix     | Same dirty file as A2                                                                                                                                                           |

---

# Round 4 — Upgrades tab UI rebuild (tickets 312, 313, 314, 311 presentation half)

Reviewed range: `607fb79bd3478437d7ebf21feba376a0bf02f234..cdb0a5c4c917cfee3ed36c3cd2d344c84238a493`

**Dispatch note.** Four reviewers, fresh context, review lane (Claude Code: Opus)
— adversarial and domain per `.agents/reviews/`, plus the `code-review` skill's
Standards and Spec axes. `codex exec` is not on `PATH` in this environment, so
option 2 of the skill's dispatch order was used; that is the harness's review
lane, not a downgrade.

As in round 3, every reviewer was given **both** diffs: the main-repo range above
and the fork UI diff `342f6a74..97a326e49` (six commits, four files) in the
gitignored clone `vendor/tbc-new-fork`. A reviewer given only the main-repo range
would read tickets and plans and miss every line of the product change — the
main-repo half of this round is almost entirely process artifacts, one `rank.ts`
change, the fork pin, and a regenerated artifact.

## Adversarial

Opus, fresh context, both diffs. The axis ran all five fork gates itself
(PowerShell, per the documented fnm shim trap) and confirmed both trees clean
before reporting. It attacked the four claims the stage flagged as load-bearing,
and **all four held**:

- **C23, the silent SCSS break, was genuinely fixed rather than gated past.**
  `.upgrades-toolbar` was _deleted_, not orphaned — `grep -c upgrades-toolbar`
  returns zero code matches, the only three occurrences being comments that
  explain the removal. Each moved row re-declares its own layout on its own
  class (`_upgrades_tab.scss:100-107`, `:47-70`).
- **Grid containment is sound**, and correctly applied to _both_ children —
  spanning only the new child would have stranded the sub-tab area in one
  `auto-fit` track.
- **The anti-jitter reservation is two rules, not one** (`align-self: start` plus
  `grid-template-rows: max-content auto`); either alone leaves a path to the
  ~50px jump.
- **The export tracks displayed order**, computed in `resultsContent` rather than
  the pane-shared `rowsTable` — which is exactly why the last-pane-overwrite bug
  ticket 314 names cannot recur.

Two findings, neither a live failure:

- **A1 (medium)** — `settingsChangedEmitter` is declared and wired to three
  pickers but never emitted; the four emit sites in `ui/` are all in
  `bulk_tab.tsx`. Independently re-verified by the orchestrator. Latent, because
  the pickers write through their own DOM listener, but invisible to every gate.
  Ticket 317.
- **A2 (low)** — `readIterations`/`readCandidateCap` still guard against `NaN`
  and `Infinity`, which `NumberPicker.getInputValue()` can no longer produce.
  Harmless, but the doc comments above both still describe parsing a string
  input, which is now false and will mislead the next reader. Ticket 319.

The axis noted it verified the CSS by reasoning about the cascade, not by
driving the page — the orchestrator measured those two claims live instead (see
the decision log), so that gap is closed by a different lane rather than left
open.

## Domain

Opus, fresh context. Four clean answers, one major narrowing, one minor
unverified label question. No contradictions of `docs/stage0-findings.md` or
`docs/verification-log.md`.

- **D1 — the corrected set-bonus understanding is right.** `rankableSetPotential`
  (`engine/view.ts:169-172`) returns the **raw** `prospectiveBonusDps` and
  `sortKeyFor` adds that same raw value to `deltaDps`; `SET_POTENTIAL_WEIGHTS`
  lives on the report path and is never referenced by the fork's view. So the
  displayed figure reconciles as a player reads it. The ticket correction made
  in `b8c0d8e` was correct, and the earlier "discounted" claim was wrong.
- **D2 (major, but it sharpens ticket 315 rather than opposing it)** — the "one
  added piece" explanation covers only the 3/5 sweep. At 2/5 only the 4pc row is
  built, needing two pieces, so `unmeasurable-at-this-worn-count` is not the
  cause there. The likelier cause is that `selectPackage` requires each
  completing piece to be in-pool _and individually simmed_. Folded into ticket
  315 as the first thing to instrument. Domain's verdict: the feature is **not**
  structurally dead, but far narrower than the toggle's presence implies.
- **D3 (minor, unverified)** — any source carrying a `zone` lands under the
  "Raid zones" group label, so a normal dungeon or world boss would read as a
  raid zone. Heroics are correctly bucketed elsewhere. Whether this actually
  occurs depends on source data the axis did not enumerate. Ticket 320.
- **D4, D5, D6 — clean.** Phase strings are TBC-accurate and, importantly, are
  read from the page's own phase picker rather than hardcoded. The TMB payload
  matches the report path's shape byte-for-byte and is ids-only, which is
  domain-correct since a candidate is an item the player does not own. The
  `rank.ts` comment's TBC claim about non-unique rings and trinkets is accurate.

## Standards + Spec

Both axes on Opus, fresh context, via the `code-review` skill.

**Standards — no hard violations.** Every added comment was checked against
`AGENTS.md`'s comment policy and is _why_, not _what_: ticket references,
rejected alternatives, measured numbers with the width they were measured at.
No JSON-derived types. The ported-file trap does not apply (these files are not
under `upgrades/engine/`), and the re-pin's steps 3-5 were done. Four judgement
calls, all already commented with their constraint in the code: three duplicated
helpers that mirror `packages/core` functions the fork cannot import; two
`querySelector` reaches into picker internals; a hand-rolled re-spelling of
`ToggleControl.visible`; and one import-order deviation in a file whose import
block was already unsorted and which no tooling enforces.

**Spec — the structural half of the brief is delivered.** The settings card,
picker rows and the view controls' move above the sub-tabs all borrow real site
idioms rather than inventing a second one, which was the owner's overriding
complaint (ask 10, ask 3). Three gaps:

- **A1** — the export includes owned shortlist rows. Ticket 316.
- **A2** — the five-digit iterations clip measurement the plan demanded _before_
  deleting the `8ch` rule has no recorded result; the deletion was justified by
  an argument about `NumberPicker.updateSize` instead. The executor reports
  measuring it (`scrollWidth` 281 == `clientWidth` 281 with "30000" typed), so
  the measurement was taken but not written where the plan said to record it.
- **A3** — slice 4 shipped past its own written stop-and-report condition. See
  the summary below.

Ask 9 has no disposition anywhere in this stage. Ticket 318.

## Summary

Four axes, eight findings, **no correctness bug that produces a wrong number and
no test theatre**. The three claims most likely to fail silently — the C23 SCSS
re-homing, the F11 grid containment, and the export's displayed order — were
each attacked directly and each held, verified twice over: statically by the
adversarial axis, and live in the running page by the orchestrator.

The one finding that deserves the owner's eye is not a bug. **Slice 4 shipped
past a stop-and-report condition the plan itself wrote** ("State (c) must be
observed, not assumed... do not ship (c) unobserved"). The executor could not
observe any of the four set-bonus display states, said so plainly rather than
claiming success, and filed ticket 315. Filing rather than stopping was the
better engineering call — the cause is upstream in byte-gated engine code this
stage was forbidden to touch — but it means **ticket 313 is committed unmet, not
met**, and `setBonusLine`'s four branches have never once executed. That is the
honest state, and 313 should not be closed on this branch.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                             |
| ----- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial | defer       | `.scratch/carry-forward/issues/317-upgrades-settings-emitter-never-emitted.md` — emitter wired to three pickers, never emitted; latent, no gate sees it                                   |
| A2    | Adversarial | defer       | `.scratch/carry-forward/issues/319-stale-guard-comments-in-read-helpers.md` — unreachable `NaN`/`Infinity` guards, and doc comments that describe parsing a string input                  |
| D1    | Domain      | wontfix     | No defect — confirms the ticket correction made in `b8c0d8e` was right                                                                                                                    |
| D2    | Domain      | fixed       | Narrowing folded into ticket 315: `unmeasurable-at-this-worn-count` cannot explain the 2/5 sweep; instrument `setIdsWithCandidates.size` and `selection.ok` for setId 629 first           |
| D3    | Domain      | defer       | `.scratch/carry-forward/issues/320-raid-zones-group-may-cover-non-raid-zones.md` — unverified; depends on source data nobody enumerated                                                   |
| D4-D6 | Domain      | wontfix     | No defect found on phase framing, TMB format, or the `rank.ts` TBC claim                                                                                                                  |
| S1-S4 | Standards   | wontfix     | Four judgement calls, each already carrying a code comment naming the constraint that forced it; no documented standard breached                                                          |
| Sp1   | Spec        | defer       | `.scratch/carry-forward/issues/316-tmb-export-includes-owned-shortlist-rows.md` — owner's call: "displayed rows" honestly covers greyed owned rows, and no ticket ruled on them           |
| Sp2   | Spec        | wontfix     | Clip measurement was taken (executor reports `scrollWidth` 281 == `clientWidth` 281) but recorded in a session scratchpad rather than the plan's acceptance box; the rule deletion stands |
| Sp3   | Spec        | defer       | Ticket 315 — 313 committed unmet; see Summary. Do not close 313 on this branch                                                                                                            |
| Sp4   | Spec        | defer       | `.scratch/carry-forward/issues/318-ask-9-pool-source-line-is-dev-noise.md` — the eleven asks outrank the plan, so an ask cannot be narrowed away by omission                              |

---

# Round 5 — the six-ticket batch (315, 317, 319, 320, 322, 324) + re-pins

Reviewed range: `cdb0a5c4c917cfee3ed36c3cd2d344c84238a493..8edf764ff1b3dfa65d3cd1b96ddf4880cf4cd157`
Companion fork range: `97a326e497da29aceb70c2530ce2463b5719bc7c..e7f147443` (the
actual code — the main-repo diff over this round is ticket markdown + re-pins).

Dispatch: no `codex` on PATH; adversarial + domain + standards/spec as three
fresh-context Opus (4.8) subagents on the review lane, one parallel batch, each
handed both diffs (main + fork). Fixes for this round's findings land in fork
commit `bc7925362` and the re-pin above it (`8edf764`'s successor); a round 6
window opens at fork `bc7925362` / main `<next through-sha>` and is not covered
here.

## Adversarial

No correctness bug that yields a wrong number, no test theatre that inverts a
real result. The guard removal (317/319), the emitter fix (317, no re-render
loop or double-emit), the noise-gate ordering (315, `> 10` guards only the
prospective branch), and the owned-row export filter were each cleared under
scrutiny with the traced reason.

- **A1 (medium)** — the layout gate is invoked by nothing. `grep test:layout`
  across the fork's yml/json/mjs hits only the `package.json` script definition;
  `pnpm verify` does not see the fork and no fork CI calls it. Ticket 322's "a
  gate that runs" premise is half-met — the script must be run by hand.
- **A2 (low)** — layout assertion #5 (`ok = spans || widthMatch`) can pass with
  the F11 span dropped in a one-column layout. Non-vacuous at 1280's two-column
  layout, so sound as it stands, but the `|| widthMatch` fallback is a
  robustness hole under a future layout change.
- **A3 (unverified → resolved)** — reviewer could not byte-compare the re-pinned
  `sim-implemented-effects.json` against a regen (fnm blocked their Node).
  Settled after the review: regenerating at the pin produces no diff.

## Domain

- **320 — verified correct (no defect).** Enumerated every distinct `zone` value
  across all 44 built universes: 9 genuine TBC raids + `World Bosses` (Doom Lord
  Kazzak, Doomwalker — real outdoor world bosses, not raid encounters). The
  ticket's claim that World Bosses is the only non-raid zone value holds against
  the data; renaming the group to "Content" is correct, spec-neutral terminology.
- **315 — floor is safe, but the comment's figure was wrong.** The `10` floor is
  a defensible ~4-SE conservative bar (reported per-run SE ~1.678 DPS per
  `docs/verification-log.md`; a set bonus folds two deltas so its noise is
  ~2.37 SE), and hiding a near-zero bonus is domain-correct. But the comment
  claimed a "~5 DPS run-to-run spread" that appears nowhere in the tree and is
  ~3x the measured SE, and the floor is a fixed global where this project's
  cutoffs are per-spec (`cutoff.ts` ret 3.4 / feral 3.6).
- Re-pin (217 implemented / 451 stub-only) is domain-plausible; no sync anomaly.

## Standards + Spec

- **SP-1 / SP-2 / STD-1 (major, one defect from three angles)** — the shipped
  315 display floor is a different change from what the (open) ticket asked
  (reachability), and its `~5 DPS` justification is an unsourced causal claim in
  committed code with the owner's "at or below noise, don't show it" ruling
  recorded nowhere in the tree — an AGENTS.md durable-claims breach.
- **SP-3 (clean)** — 317, 319, 320, 322, 324 each match their ticket: 317 emits
  coherently; 319 did both halves (dropped the unreachable finite guard, fixed
  both comments); 320 renamed the one i18n value; 322 is a zero-dependency
  DOM-geometry gate asserting real geometry at 375/768/1280; 324 closed as a
  read-only investigation with no code.
- **STD-2/3/4 (clean)** — comment policy (why not what), `SET_BONUS_MIN_DISPLAY_DPS`
  naming idiom, and `test-layout.mjs` house style all hold.
- **Minor** — the stage `decision-log.md` / `map.md` were not updated for this
  round's fork work; the decision trail lived only in commit messages and ticket
  prose until this review.

## Summary

The batch is clean on 317/319/320/322/324 — five tickets implemented to spec
with no correctness or standards defect. The one substantive finding, raised
independently by all three axes, was ticket **315**: the display floor was
shipped with an unsourced `~5 DPS` comment and the owner ruling recorded nowhere.
Fixed in-round — both comments now cite the measured SE (1.678) and the
quadrature reasoning (fork `bc7925362`), and ticket 315 now records the owner
ruling, the reachability answer (reachable), the on-screen validation, and that
the `-47.3` was a non-reproducing fluke. 315 and 313 stay open pending the owner
viewing the running tab. Two adversarial findings on the layout gate (A1 not
wired, A2 assertion escape hatch) are deferred to new tickets.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                            |
| ---- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Adversarial | defer       | `.scratch/carry-forward/issues/325-layout-gate-is-wired-into-no-gate.md` — `test:layout` runs by hand; wire it into a fork gate/CI       |
| A2   | Adversarial | defer       | `.scratch/carry-forward/issues/326-layout-gate-span-assertion-has-an-escape-hatch.md` — assert `grid-column` directly, not width parity  |
| A3   | Adversarial | fixed       | Regenerating `sim-implemented-effects.json` at the pin produces no diff — artifact is byte-identical to a fresh regen at HEAD            |
| D1   | Domain      | fixed       | 320 verified correct against all 44 universes; enumeration closed as not-a-defect (World Bosses is the only non-raid zone; "Content" ok) |
| D2   | Domain      | fixed       | 315 floor comment corrected to cite the measured SE 1.678 and the quadrature reasoning (fork `bc7925362`)                                |
| SP1  | Spec        | fixed       | 315 owner ruling ("at or below noise, don't show it"), reachability answer, and on-screen validation recorded in ticket 315              |
| SP2  | Spec        | fixed       | Same as D2/STD1 — the unsourced `~5 DPS` claim replaced with the sourced figure and reasoning (fork `bc7925362`)                         |
| SP3  | Spec        | wontfix     | No defect — 317/319/320/322/324 match their tickets                                                                                      |
| STD1 | Standards   | fixed       | Durable-claims breach fixed with SP2                                                                                                     |
| STD2 | Standards   | fixed       | decision-log / map.md updated this round (325, 326 mapped; 315 resolution recorded in-ticket)                                            |
| STD3 | Standards   | wontfix     | No defect — comment policy, naming, gate house style all hold                                                                            |

# Round 6 — the 331 noise-floor ranking gate + the 327/328/329/330 presentation batch

Reviewed range: `8edf764ff1b3dfa65d3cd1b96ddf4880cf4cd157..e10581b3e4b218612617177c74d432229b526705`
Companion fork range: `bc79253625b040bd04718b141cbf94ffc75e20fe..4ae6afe988208fd7acaf1304d2fa1b3c80718cac`

Two stage-gate runs land in this round: the **331** set-bonus noise-floor gate
(a single shared `SET_BONUS_NOISE_FLOOR_DPS = 10` in `packages/core/src/cutoff.ts`,
imported by both the display gate and the ranking gate; `rankableSetPotential`
now returns 0 for a sub-floor prospective bonus so it moves neither the sort key
nor the cutoff; byte-identical ported fork twin + full drift cycle) and the
**327/328/329/330** presentation batch (native auto-layout results table with an
`overflow-x:auto` fallback, native-styled controls, a layout gate that now drives
a real headless WASM run to assert legibility on real rows, and one reworded
set-bonus line). Stage artifacts in `.scratch/stage-gate/upgrades-331-noise-rank/`
and `.scratch/stage-gate/upgrades-css-controls-copy/`; the round-6 review plan is
`.scratch/review-plans/round-6-plan.md`.

Dispatch: no `codex` on PATH; three fresh-context Opus subagents (review lane),
one parallel batch — adversarial + domain briefs, Standards+Spec via the
`code-review` skill (its own two sub-agents). Each axis handed both diffs and the
stage-gate/ticket inputs; each told it writes nothing. **No blocking or material
finding on any axis.** Five minor findings; three become follow-up tickets
(332/333/334), two are recorded as known limitations.

## Adversarial

**No blocking or material findings; all three priority targets sound.** The
reviewer ran the layout gate twice, mutation-tested the noise boundary offline,
and verified twin identity by sha256; working tree clean in both repos.

- **Headless WASM gate (`test-layout.mjs`) — cannot pass vacuously.** A timed-out
  run pushes a failure; `legibilityProbeExpression` returns `{error:'only N rows'}`
  below `MIN_ROWS`, `assertLegibility` pushes `ok:false` on any error, and
  `failures.length` drives `process.exit(1)`. The legibility phase cannot pass
  without >=5 landed rows. A missing `lib.wasm`/assets makes `build()` **throw**
  (fail loudly), not skip. Ran `node ./test-layout.mjs` (fork, Node v22.16.0)
  **twice: exit 0, 68s and 69s wall** (7 rows in 26.4s, well inside the 120s
  deadline), 37 assertions across 375/653/768/1280, deterministic — no flakiness.
- **A6 minor (new, not 325/326):** the assertion-(7) scroller check is guarded by
  `needsScroll`, so at 653 (table == wrap) and 768/1280 (`overflow-x visible`) it
  passes without exercising the scroll path; only 375 (`table 407 vs wrap 319`,
  `overflow-x auto`) truly bites. Low harm — the 375 case does exercise it.
- **Noise gate boundary — not test theatre.** Strict `>` routes through the one
  `rankableSetPotential` on both feed paths (`sortKeyFor`, `belowCutoffUnderView`);
  a negative bonus returns 0. Offline mutation: gate-removed fails 3 assertions,
  `>=` fails the "exactly 10 -> 0" test (pins the operator), floor->0 fails 2.
  `vitest run view.test.ts` -> 56 passed.
- **A7 minor (new):** the just-above boundary is only tested at 18.039, never
  ~10.001 — a constant change `10->15` would slip the unit suite (operator pinned,
  value not). -> ticket 333.
- **Twin identity holds by measurement:** committed `cutoff.ts` (`4efa3639...`) and
  `view.ts` (`d23bc93c...`) sha256 exactly match the PROVENANCE rows; the gate
  bodies are byte-identical (only the recorded `setPotentialIsConfounded` inlining
  differs).

## Domain

**Domain reasoning sound; no blocking or material finding.** Every load-bearing
number re-derived independently.

- **The floor value 10 as a ranking gate — defensible, one bounded limitation.**
  Re-derived: per-run SE ~1.678 (ret)/1.774 (feral); a prospective bonus folds two
  deltas -> noise ~~sqrt(2)xSE~~2.373 SE; a strict 2xSE bar ~4.75/5.02, so 10 ~4xSE
  (conservative). The distribution of every committed `prospectiveBonusDps` is
  either sub-floor noise (-4.10, -3.88, +0.31, +0.545) or far above (17.14, 18.04,
  20.29, 32.26, 43.09, 114, 119, 185): the **(0.545, 17.14] band is empty** —
  nothing lands in 10-15. A **display** false-negative is invisible-vs-shown; a
  **ranking** false-negative is a genuinely-missed upgrade — higher stakes for the
  same number. A real set bonus is quantized, so a true 10-15 DPS 4pc is
  physically possible on a not-yet-measured spec. **D3 minor:** record as a known
  limitation; the per-spec/CUTOFF-derived floor (`cutoff.ts:32-33`) is the
  documented follow-up. -> ticket 332.
- **ADR-0024 reconciliation on ticket 331 — correct, no amendment needed.**
  ADR-0024 decision 2 governs `packageDeltaDps` in package mode ("never `bonusDps`").
  `rankableSetPotential` reads `prospectiveBonusDps` = `rank.ts:1850`'s
  `matching.bonusDps` — the increment currency the ADR excludes, in the toggle path
  it makes no decision about. Gating it amends nothing. (The earlier handoff wrongly
  called an amendment "bookkeeping"; the landed ticket text corrected to
  "un-amended" — the right call.)
- **The 330 reword — game-honest.** Landed P1 no longer implies arrival; `after <
threshold` always (`nextThreshold > piecesAfterSwap`), `{{threshold}}` is
  `ctx.nextThreshold` (2/4), and `rank.ts:1849` pins `bonusDps` to that threshold,
  so "more at {{threshold}}pc" correctly describes what the sim credits, against the
  threshold never piece count.
- **Copy-string domain sanity — clean.** "raid-drop upgrades", "loot-priority tool"
  (TMB), the tooltip's "complete a set bonus"/"too small ... ignored", and "BiS" all
  used the project's way.

## Standards + Spec

**No hard violations of a documented standard; no spec-conformance defect; no
scope creep.**

- **Drift cycle (331) — clean, verified reproducible.** PROVENANCE hashes match
  `git show 4ae6afe98:` sha256sum; the lock (`ad965d1`) pins the actual fork tip;
  the effects stamp (`e10581b`) is **stamp-only** (net diff is the single
  `forkCommit` line, id set 217/451 unchanged); regenerating at the pin left
  `git status` clean — reproducible, as round 5's A3 required. Order correct:
  fork edit+PROVENANCE -> re-pin -> stamp.
- **Spec conformance — every change traces to a ticket + plan step.** 327
  (auto-layout, `overflow-x:auto` fallback, **nowrap on both Slot and DPS** per the
  Gate-B F3-new requirement, desktop `up(md)` block untouched); 328 (native
  CopyButton filled+icon, dropdown matches the phase selector, tippy tooltip); 329
  (real-run gate at 375/653/768/1280, one-line Slot+DPS assertion, assertion #1
  exempts sanctioned scrollers); 330 (**exactly one** string reworded;
  `crosses`/`confounded` untouched; `{{before}}` var removed from string and call
  site); 331 (gate + tests, ADR reconciliation on the ticket).
- **Honest-deferral check PASSES.** Ticket 331 records the weighted/full path
  `rank-report-rules.ts:697-714` as "a second, still-unfixed instance of the same
  defect ... out of scope," notes the `* factor` discount, stays `Status: open`; no
  round-6 prose claims 331 is fully fixed.
- **Gate-C deviation re-judgment.** The checkbox fix deleted the 40px inflation
  SCSS rule rather than adopting `BooleanPicker` — plan-sanctioned (Step 2(2)
  allowed either path), honestly recorded in the SCSS comment, **not** a silent
  drop. **STD4 minor:** the `BooleanPicker` idiom is deferred, worth a follow-up.
  -> ticket 334. Assertion (8)'s row-height ceiling 4x->7x is a documented backstop,
  not an escape hatch (assertion (6) asserts one-line Slot/DPS directly). The
  effects regen is stamp-only (above).
- **Comments / commits / durable claims — clean.** `cutoff.ts:20-34` and
  `view.ts:337-341` explain _why_ (floor + strict comparison for cross-layer
  agreement); all five commit subjects are imperative <=50 chars with wrapped
  why-bodies (`68fc6e0` exemplary); the handoff and `README-set-bonus-truth.md`
  cite re-runnable commands for causal claims or mark open questions unresolved.
- **STD5 minor (Fowler judgement call):** the floor is a bare `number` reused
  across display and ranking (Primitive Obsession) — deliberate and documented
  (one shared constant is the point of the drift); not worth a wrapper type. No
  ticket.

## Owner decision — three copy strings (surfaced, not resolved)

The three copy strings landed as sensible defaults; **the owner picks the final
wording.** Each landed default plus its alternatives:

**Set-bonus line** (`set_bonus.prospective`) — landed **P1**:

- **P1 (landed):** `+{{dps}} more at {{threshold}}pc {{set}} ({{after}}/{{threshold}} after this swap)` — keeps the `+dps` scan anchor; honest; shows progress.
- P2: `{{after}}/{{threshold}} {{set}} after this swap — {{threshold}}pc bonus adds +{{dps}}` — progress-first; longest.
- P3: `counts toward {{threshold}}pc {{set}} (+{{dps}} when complete)` — tersest; drops numeric progress.

**Set-potential tooltip** (`view.set_potential_tooltip`) — landed **T1**:

- **T1 (landed):** `Include set bonuses in the ranking. An item that would complete a set bonus gets credit for it; bonuses too small to change the ranking are ignored.`
- T2: `When on, a row's DPS gain includes any set bonus the swap would unlock. Very small bonuses are left out.` — shorter, per-row framing.

**TMB export blurb** (`export.caveat`) — landed **B2**:

- B1: `A ranked list of raid-drop upgrades, as JSON for your guild's loot planning.` — purpose-first.
- **B2 (landed):** `Copy your best raid-drop upgrades as JSON to import into a loot-priority tool.` — native verb-first house pattern.
- B3: `Your BiS raid-drop upgrade list, as JSON.` — tersest.

If the owner's pick differs from a landed default, the change is a follow-up edit
after this review (fork commit + re-pin), not an in-review fix.

## Summary

Round 6 covers the 331 noise-floor ranking gate and the 327/328/329/330
presentation batch. All four axes clear it with **no blocking or material
findings**: the noise gate is not test theatre and its currency reconciles with
ADR-0024 without amendment; the drift cycle is complete and reproducible; the
headless-run layout gate cannot pass vacuously and runs deterministically in ~68s;
every change traces to a ticket, and 331's still-open weighted/full instance is
honestly recorded. Five minor findings — three filed as follow-up tickets (332
per-spec ranking floor, 333 near-boundary test, 334 BooleanPicker idiom), two
recorded as known limitations (the scroller check only bites at 375; the shared
floor constant's Primitive Obsession is deliberate). The three copy strings are
surfaced for the owner's pick above. 331 is **not** claimed fully fixed — the
weighted/full report path remains open on ticket 331.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                       |
| ---- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A6   | Adversarial | wontfix     | Scroller check only exercised at 375 (table==wrap at 653, overflow-x visible at 768/1280) — low harm; the 375 case does exercise it |
| A7   | Adversarial | fixed       | superseded in round 7 — ticket 333 closed (`b037498`): near-boundary passthrough assertions added                                   |
| D3   | Domain      | fixed       | superseded in round 7 — ticket 332 closed (fork `4a76e06` + `7c10366`): per-spec √2 ranking floor landed                            |
| SP4  | Spec        | wontfix     | No defect — every change traces to a ticket + plan step; no scope creep; honest-deferral of the weighted/full path confirmed        |
| STD4 | Standards   | fixed       | superseded in round 7 — ticket 334 closed (fork `f17b77d` + `2c14735`): native BooleanPicker idiom adopted via ViewToggle           |
| STD5 | Standards   | wontfix     | Primitive Obsession on the shared floor constant is deliberate and documented (one shared value for display + ranking); no wrapper  |

# Round 7 — the three round-6 follow-up tickets (333, 334, 332)

Reviewed range: `e10581b3e4b218612617177c74d432229b526705..8bad70258d0cbfef41759bd9a333f580b4dc6d79`
Companion fork range: `4ae6afe988208fd7acaf1304d2fa1b3c80718cac..4a76e06f54dcd016448296735134a98d6239868c`

Closes the three tickets the round-6 review deferred (A7/D3/STD4), each through a
stage-gate run:

- **333** (`b037498`): near-boundary tests pin `SET_BONUS_NOISE_FLOOR_DPS` from
  both sides — core `packages/core/test/view.test.ts` only, no fork.
- **334** (fork `f17b77d` + re-pin `2c14735`): the two Upgrades view checkboxes
  render via native `BooleanPicker(inline:true)` behind a `ViewToggle` wrapper
  preserving the old external surface — fork-only, non-ported.
- **332** (fork `4a76e06` + core `7c10366` + re-pin `5bce509`): the flat 10 DPS
  ranking floor becomes a per-spec `setBonusNoiseFloorDps(cutoff) = √2 ×
cutoff.absDps`, read by both the ranking and display gates off the same frozen
  ranking cutoff — ported drift cycle (cutoff.ts + view.ts) + fork tab display
  gate. The plan-before-code review blocked two would-be crashes (stale-spec
  divergence; skeleton null-deref) before any code was written.

Also in-window (not this three-ticket job, carried for coverage): the
orchestrator conduct guidance in `AGENTS.md` + `stage-gate/SKILL.md` (mirror pair)
and the copy reword (fork `2f992cc`), both from `542651d`/`e6d7777`.

## Adversarial

Nothing survives scrutiny as a defect. The ticket-332 change holds on every axis:

- **Display/ranking floor agreement (central risk) — sound.** `applyView` derives
  the floor from `r.cutoff` where `r = this.state.ranking`; the fork display gate
  (`renderSubTabs`/`render`) derives from the same `this.state.ranking.cutoff`.
  Same frozen object → same `√2 × absDps` → the two layers cannot diverge for a
  displayed row.
- **Skeleton null-deref — absent.** `setBonusLine` reads only the control's
  `checked`, `row`, and the `noiseFloorDps` param — no `this.state`
  (grep-confirmed). The mid-run skeleton passes `undefined`; the strict
  `noiseFloorDps !== undefined &&` guard skips the prospective line.
- **Fork twin agreement — byte-identical code regions** (both `cutoff.ts` and
  `view.ts`; only comment prose differs).
- **No fixture changes tier.** Band (0.545, 17.14) empty; floor 10 → ~4.81/5.09
  moves nothing across a boundary.
- **Tests not theatre.** Boundaries written as `setBonusNoiseFloorDps(CUTOFF)` /
  `Math.SQRT2 * absDps`, never decimals — a derivation mutation reds them.
- Incidental non-defect: the i18n `prospective` reword drops `{{after}}` and the
  code correctly removed the matching `after:` arg — no orphan placeholder.

Unexamined: SCSS (presentational), `BooleanPicker`/`ViewToggle` runtime DOM (no
fork test harness — surface verified statically), PROVENANCE re-hash/E-W3 run
(pipeline gate, not code correctness). The fork display-gate end-to-end agreement
the domain axis left unexamined is covered here.

## Domain

Verdict: domain-sound and safe to merge. Two accuracy caveats, neither a blocker.

- **√2 is right for a 2pc, approximate for a 4pc.** The `1.678`/`1.774` figures
  are `meanReportedSe` (single-run SE). A bonus's measured SE is
  `combineSe = sqrt(Σ se_i²)` over folded sims: single delta folds 2 (√2×SE), a
  2pc folds 4 (2×SE), a 4pc folds 6 (√6×SE). So the bonus/single ratio is exactly
  √2 for 2pc but √3 for 4pc — the code applies the same `√2 × absDps ≈ 4.81` floor
  to both, so 4pc bonuses in ~(4.8, 6) DPS are slightly under-filtered, and the
  `cutoff.ts` doc comment overstates the floor as the 2×SE bar for 4pc rows.
  Empty band → no effect today. **Filed as ticket 335.**
- **Untested-spec inheritance — mostly defensible.** The 9 specs inherit ret's
  floor (only available default, debt annotated in one place). Feral already
  measured 6% noisier; among the inheritors, enh shaman (windfury), aff/destro
  warlock (DoT+proc), and rogue (combo-point RNG) are the likeliest to exceed
  ret's floor if ever measured. Anticipated by `cutoff.ts`'s own comment; folded
  into ticket 335's note, not a separate finding.
- **Empty-band safety — verified** (max-below 0.545, min-above 17.14); the right
  necessary property; the ticket correctly scopes the unmeasured-spec case as a
  follow-up, not a gap.
- **Per-spec-for-ranking vs flat-10 display floor — sound call** (the
  false-negative asymmetry argument is correct).
- No TBC/wowsims fact misstated.

## Standards + Spec

### Standards

Verdict: clean. No hard violations; three defensible judgement calls.

- **Comment policy — PASS.** The 332 rewrites (`cutoff.ts`, `view.ts`, the tab
  comments) are load-bearing WHY (frozen-cutoff invariant, √2 derivation,
  why-by-parameter), not WHAT restatement.
- **`ViewToggle` (334) — NOT a Middle Man.** Owns the two-state `value`/`emitter`,
  drives the `BooleanPicker` triad, confines two-state semantics inside the class;
  same external surface as the old `ToggleControl`.
- **Threaded `noiseFloorDps: number` — no finding.** One scalar derived once at
  the done-narrowing point, `undefined` cleanly encodes the skeleton; STD5's
  round-6 ruling (primitive shape deliberate) still holds.
- **Commit messages — PASS** (seven rules; `7c10366`'s "why √2" body exemplary).
  Minor cosmetic: `2c14735` uses `--` where siblings use `—`.
- **Mirror pairs + fork twins — VERIFIED byte-identical** (`.claude/skills` vs
  `.agents/skills`; fork `cutoff.ts`/`view.ts` code regions vs core; PROVENANCE
  updated).

### Spec

Verdict: all three tickets met, faithfully.

- **333 — met.** Both-sides near-boundary assertions, expressed against the
  per-spec floor (`retFloor ± 0.001`, plus the exactly-floor strict-`>` case) —
  the intent held and is stronger than the literal 10.001/9.999 asked.
- **332 — met, gates reconciled.** `setBonusNoiseFloorDps(cutoff) = √2 ×
cutoff.absDps` (≈4.81 ret / ≈5.09 feral, inside the ticket's ≈4.75-5.02 band);
  the ticket left display/ranking reconciliation open and the implementation
  **reconciled** — both gates read the same per-spec floor from the frozen ranking
  cutoff by parameter. Explicit in comments; honest.
- **334 — met.** Both checkboxes render via native `BooleanPicker(inline:true)`
  behind `ViewToggle`; event wiring, BiS qualifier `setText`, and Set-potential
  `labelTooltip` preserved. The idiom, not just the sizing.
- **Scope-creep flag (b):** a copy reword (`translation.json` tooltip/caveat/
  prospective/crosses + the `after:` param drop) appears in-window. Traced: the
  string rewords are the round-6 css-controls boundary commit (`4ae6afe`) and the
  handoff-documented, independently-reviewed reword (`2f992cc`) — pre-authorized
  work from before this three-ticket job, not stray scope. Dispositioned wontfix.

## Summary

Round 7 reviews the three round-6 follow-up tickets (333, 334, 332). **No blocking
or material findings across any axis.** All three tickets are met and spec-faithful;
the ticket-332 ported-engine change is byte-identical across the fork twins, the
two feared crashes (stale-spec divergence, skeleton null-deref) are independently
confirmed absent in the landed code, and no committed fixture changes tier. One
enhancement deferred (335: the √2 floor under-models 4pc noise — empty band today,
so a doc-accuracy + future-refinement item). Everything else is clean or a
documented judgement call. `pnpm merge-to-dev --check-only` green.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                          |
| ---- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1   | Adversarial | wontfix     | No defect — display/ranking agreement, skeleton-deref absence, fork twin byte-identity, empty-band tier-stability, and test integrity all verified     |
| D1   | Domain      | defer       | `.scratch/carry-forward/issues/335-set-bonus-floor-under-models-4pc-noise.md` — √2 is the 2pc fold factor; 4pc folds 6 sims (√3); empty band today     |
| D2   | Domain      | wontfix     | Untested-spec inheritance (enh/warlock/rogue likeliest to exceed ret's floor) — folded into 335's note; already anticipated by cutoff.ts's own comment |
| SP1  | Spec        | wontfix     | Copy-reword scope flag — pre-authorized work (`4ae6afe` round-6 boundary + `2f992cc` handoff-documented independent reword), not this job's scope      |
| STD1 | Standards   | wontfix     | `2c14735` commit body uses `--` where siblings use `—` — cosmetic, no standard breached                                                                |

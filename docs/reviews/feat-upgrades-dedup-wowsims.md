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

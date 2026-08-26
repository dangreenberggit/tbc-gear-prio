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

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `d7_note` accumulates scopes; new `scripts/check_policy_notes.py` in verify, red-before/green-after on exactly the missing kind (`31f8409`)                                                                                  |
| A2  | Adversarial | fixed       | `slug_map_only()` runs unconditionally; reproduced the CI hole first; failure names the collision (`f354ea8`)                                                                                                                |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/302-manifest-cannot-express-two-hand-policy.md` — measured 285-item description gap; schema + test restructuring needed (points at 300); behaviour gate exists via check_policy_notes         |
| ST1 | Standards   | fixed       | `scripts/_fork_gate.py` single implementation; all three checkers refuse a null-commit lockfile identically; all nine mutation shapes re-run printing what they changed (`124ab54`)                                          |
| ST2 | Standards   | fixed       | comment now states what the 1e-9 tolerance is for; headroom measured (smallest non-zero weight 0.01 across 199 values), not asserted (`124ab54`)                                                                             |
| ST4 | Standards   | fixed       | repeated `db.json` parses cached on a separate `load_db()` (not `load_json`); full sweep 19.2 s, byte-identical (`3631e12`)                                                                                                  |
| D1  | Domain      | fixed       | 28593 → 32375 at the source; ret p2–p5 regenerated, text-only (0 added/0 removed); SME handoff kept intact with an appended correction; fork bundled copies refreshed + re-pin (`31f8409`, fork `fd4d65c4a`)                 |
| D2  | Domain      | fixed       | figure qualified in place: 241 = 177 body-slot + 64 cloaks (`3631e12`)                                                                                                                                                       |
| S1  | Spec        | fixed       | 19/20 state explicitly accepted; `.scratch/carry-forward/issues/303-ret-p3-ep-symbol-unverifiable-at-pin.md` filed (carries the pin-bump constraint: the matching gear file landed in `5c7491899`, 26 min after `ac0ed034b`) |

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

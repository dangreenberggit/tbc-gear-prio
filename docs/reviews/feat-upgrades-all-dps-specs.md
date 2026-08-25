# Pre-merge review — feat/upgrades-all-dps-specs

All-DPS-spec support for the wowsims-fork Upgrades tab (11 specs). Stage-gate
artifacts (brief, plan rev 3 + amendment 1, plan reviews, execution report,
decision log) in `.scratch/stage-gate/upgrades-all-dps-specs/`. Companion fork
commits on `feat/upgrades-tab` (`282d7b7..32c5584`); the lock re-pin spans
ticket-290's `282d7b7`.

Reviewed range: `2b9df9a2473f248767676987641f2b9a56ee75ea..6728d627961c147f0c062d5432d2d1122e0f4777`

Dispatch: no `codex` on PATH; adversarial + domain ran as fresh-context Opus
subagents (review lane); Standards + Spec via the `code-review` skill
(general-purpose subagents). Fix batch executed by the stage-gate executor
seat; round 2 below covers the fix commits.

## Adversarial

A1 **blocking** — arena `exclude_ids` applies inside `eligible_d7`, silently
deleting items upstream's curated BiS sets equip (rogue 28295/32027, enh 28308) with no report key or disclosure; ships in the fork's bundled data too.
A2 **material** — dual-wield specs with a worn two-hander get one-handers
simmed into the empty offhand alongside it (unequippable configuration,
plausible DPS, `slotChoice: "offhand"` ships). A3 **material** — the archetype
offhand test only asserted no-2H-in-offhand; cannot catch A2. A4 minor —
`SyntheticSimRunner` responds to any id in any slot; no behavioural swap
coverage. A5 minor — latent tier-vs-phase token precedence in
`curatedSetPhase`. A6 minor — nine ret-borrowed `untested` cutoffs had no
output disclosure. Follow-up sweep (coverage gaps): port-drift green, ported
engine logic substantively identical; A7 **material** — fork `pool.ts`
hand-mirrors slot unions and drops the three compile-time keep-assertions
(byte-hash gate cannot catch semantic staleness); A8 **material** —
`sync_wowsims.py --update` swallowed fetch failures with exit 0; A9
**material** — a truncated/empty fetch locked its own hash and self-certified;
A10 minor — `DB_PHASE_MIN_QUALITY` comment figures unscoped (post-`eligible_d7`
ret numbers presented as db-wide); A11 minor — epic floor unconditionally
drops the rare band. Verified clean: tier-piece id sets (162 ids, both
directions), falsy-phase default latent-only, admit-rule guard placement, tab
wiring.

## Domain

D1 **material** — one-directional hand-type gate: classes that cannot use
two-handers had them in pool (rogue 37 incl. Ashbringer; shadow 13; mage 11;
warlock 11; other specs correctly clean; staves correctly retained for
casters). D2 minor — token-map notes called the T4/T5 Hero column
"unwitnessed"; stale, since each piece's db `classAllowlist` pins the class.
D3 minor — feral lacks the three SWP token entries (pre-existing, deliberate).
D4 minor/unverified — badge `kind` classification thin (29 vs 17,861
`unknown`); no wrong phase found in sampling. D5 not-a-finding — healer/tank/
PvP items are 20–25% of every pool with `junkFilter applied:false`; deliberate
"let the sim decide", flagged for owner confirmation. Verified correct against
fork sim source: all 10 talent-string decodes, per-point values and scope
caveats; 16% spell cap derivation; hunter on `StatMeleeHitRating`; all 54
tokens / 195 pairings incl. the T6 re-cut; all 20 EP files byte-match their
cited upstream symbols; all nine meta gems; equip rules vs
`capabilities_auto_gen.ts`; the 505-id arena exclusion (all epic, honor lines
retained, zero vanilla collateral); warlock tier→phase via median-ilvl join;
zero duplicate ids / slot mismatches across 44 files.

## Standards + Spec

Standards: no hard violations. Types-from-JSON clean; testing placement
compliant (synthetic adapter flagged as judgement call vs the recorded-adapter
default); durable-claims borderline on one measured-medians comment; smells:
~200 duplicated comment/constant lines across the nine Python spec profiles
(strongest), mitigated shotgun surgery (totality is the documented guard),
minor data clump and dual-accept generality.

Spec: S1 **material** — plan step 8's "BiS tags: P≤N sets" disclosure never
reached the tab's Assumptions block (mirror landed only in the CLI report
path); the smoke checklist had claimed it. S2 minor — actual regen sweep time
not recorded against the C42 projection. Verified conforming: total
`Record<SpecId,…>` tables, tripwire log, EP-phase and source-attribution
disclosures, 44 universes + reports, ret/feral byte-unchanged, token maps
(18 rows each, `tokenId != pieceId`), archetype interface tests, all-11 proto
mapping, tickets 291–293, fork re-pin. No unledgered scope creep.

## Summary

Four axes, 19 findings: 1 blocking (A1 — silence, not the exclusion itself),
6 material (A2/A3/A7/A8/A9, D1, S1 — counting A3 with A2), the rest minor or
confirm-intent. The engine/domain substance held up well — every game-fact
table checked against the fork sim source was correct; the failures clustered
in silent-degradation paths (undisclosed exclusions, missing disclosures,
swallowed sync errors) and in hand-type legality. Nine items were fixed on the
branch (commits `c4b6d1a`, `0759ed7`, fork `32c5584`); seven deferred to
tickets 294–300; one wontfix (D5, deliberate design pending owner
confirmation). Round 2 below reviews the fix commits.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                       |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `excludedIds` + `curatedSetCollisions` in every report.json (`c4b6d1a`); membership unchanged per the SME F3 ruling                                                 |
| A2  | Adversarial | fixed       | offhand candidates skipped when worn mainhand is two-handed; non-vacuous regression on warrior_p5_arms/Apolyon (`0759ed7`, fork `32c5584`)                          |
| A3  | Adversarial | fixed       | offhand assertion now requires one-hander or dedicated offhand, names the hand type on failure (`0759ed7`)                                                          |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/294-archetype-tests-lack-swap-semantics-coverage.md`                                                                                 |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/295-curated-set-phase-token-precedence-latent.md`                                                                                    |
| A6  | Adversarial | fixed       | `cutoffIsUnmeasuredFor` + Assumptions line in the tab (fork `32c5584`); ret shows nothing                                                                           |
| A7  | Adversarial | defer       | `.scratch/carry-forward/issues/296-fork-hand-mirrored-slot-unions-ungated.md`                                                                                       |
| A8  | Adversarial | fixed       | fetch failures collected → nonzero exit; proven by injection (`0759ed7`)                                                                                            |
| A9  | Adversarial | fixed       | zero-byte blobs refused before lockfile write; proven by injection (`0759ed7`)                                                                                      |
| A10 | Adversarial | fixed       | comment scoped to post-`eligible_d7`/ret, re-runnable command embedded, verified to print `1213 594` (`0759ed7`)                                                    |
| A11 | Adversarial | defer       | `.scratch/carry-forward/issues/297-db-phase-epic-floor-rare-band.md`                                                                                                |
| D1  | Domain      | fixed       | per-profile `two_hand_weapon_types` from fork `canUseTwoHand`; rogue 37→0, staves retained, other specs unchanged (`c4b6d1a`)                                       |
| D2  | Domain      | fixed       | notes replaced in all nine token maps with the `classAllowlist` derivation command (`0759ed7`)                                                                      |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/298-feral-swp-token-pieces-unmapped.md`                                                                                              |
| D4  | Domain      | defer       | `.scratch/carry-forward/issues/299-badge-source-classification-breadth.md`                                                                                          |
| D5  | Domain      | wontfix     | deliberate "let the sim decide" (`junkFilter applied:false` recorded per report); owner confirmation requested in the merge summary                                 |
| ST1 | Standards   | defer       | `.scratch/carry-forward/issues/300-assemble-universe-spec-profile-duplication.md`                                                                                   |
| S1  | Spec        | fixed       | `bisTagProvenance` in reports; tab Assumptions renders "BiS tags — from P≤N sets" for exactly hunter p5, shadow/rogue p4–p5, mage p4–p5 (`c4b6d1a`, fork `32c5584`) |
| S2  | Spec        | fixed       | assembly sweep 33–35 s (76 generations, byte-identical), recorded as distinct from the C42 sim budget (0.577 s/sim, 5.93 h projected)                               |

## Round 2 — fix verification

Reviewed range: `6728d627961c147f0c062d5432d2d1122e0f4777..0759ed77d7baee92410337fd616e801528b60e3c`

Fork range `3ad2a9f..32c5584` included. Reviewer: the round-1 adversarial seat
(retains the findings; fix-verification round, noted as not fresh-context).

Verdicts: 9 of 10 fixes verified real and complete (D2 is documentation-only,
not re-examined). Regression hunt clean on all three named risks: the A2 guard
fires only on `HandTypeTwoHand` (empty and MainHand-only mainhands keep their
offhand candidates — an allowlist would have silently cost every Warglaive
rogue the slot); the D1 regen changed only the four specs it claimed and every
removed id is a genuinely illegal two-hander; no disclosure leaks into
ret/feral (`excludedIds: None`, `bisTagProvenance: None`, cutoff line absent
for both). A10's embedded command re-run prints `1213 594` as documented. The
reviewer also self-corrected a near-miss: an apparent ret/feral universe
change was a CRLF checkout artifact (`git diff HEAD` clean).

| ID  | Axis    | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                    |
| --- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | Round 2 | wontfix     | Correct behaviour, claim inaccuracy only: the S1 BiS-tag disclosure also fires for feral p4/p5 (upstream ships only p3 cat sets — the degradation is real and previously undisclosed). The "ret/feral unaffected" invariant holds for universe payloads, not for reports/tab disclosures; recorded here so nobody rediscovers it as a regression |
| N2  | Round 2 | wontfix     | Informational: fork i18n keys confirmed present (`assets/locales/`); resolves a round-1 open question                                                                                                                                                                                                                                            |
| A7  | Round 2 | defer       | re-confirmed still open; `.scratch/carry-forward/issues/296-fork-hand-mirrored-slot-unions-ungated.md`                                                                                                                                                                                                                                           |

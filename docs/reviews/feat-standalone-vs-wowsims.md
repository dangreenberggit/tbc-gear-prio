# Pre-merge review — feat/standalone-vs-wowsims

Diffed against: `dev...feat/standalone-vs-wowsims` (2303d2d at dispatch; fixes
landed after)

**Scope.** Three commits, documentation only: a new `docs/plans/wowsims-reuse/`
folder and pointer edits to `PLAN.md` §4, §5.2 and §16. No TypeScript, no tests,
no `packages/core` change. The branch records an audit of `wowsims/tbc-new`
beyond `wowsimcli` — what upstream already has that we would otherwise write —
and corrects an earlier revision of that audit which wrongly recommended porting
upstream's WCL importer.

**Dispatch.** `codex` was not on `PATH`. Four fresh subagents on the sharp lane
(Opus), each with the diff and its own brief, none with access to the authoring
session: Adversarial (`.agents/reviews/adversarial.md`), Domain
(`.agents/reviews/domain.md`), and Standards + Spec via the `code-review` skill.
All three axes were run despite the diff being docs-only: the branch asserts a
large number of checkable TBC/WCL/wowsims facts, which is squarely the Domain
axis, and the adversarial brief was re-aimed at documentation failure modes
(false claims stated as fact, checkable-and-wrong claims, internal
contradiction, advice that would misdirect a future agent).

---

## Adversarial

Every checkable claim in the diff was re-run by the reviewer and **all of them
held**: `gear-source.ts` is 73 lines; both python repros in `take-list.md` §1.1
and §1.2 reproduce exactly (`actors: 74 / with icon: 0`; `combatants: 25 /
id-sums: [61]`); upstream at the pin is 776 lines with **0** hits for
`encounterRankings|recentReports|zoneRankings|characterData`, `eventID` 26×,
`simUI` 12×, line 63 is `data.icon.split('-')[1]`, line 121 is
`talents[i]?.guid`; `9 × 15.769233 = 141.923…` ≈ 142; the 813 and 253 line sums
are exact. All section numbers and relative links resolve.

Two findings, both "advice that would misdirect a future agent" — the highest
severity available on a docs diff.

**A1 (HIGH).** `standalone-app.md` build order step 1 still read "**WCL client**
— port from upstream". This is precisely the instruction the branch exists to
retract: `take-list.md` says "take ~nothing", `README.md` says "Reference only",
and PLAN.md's new §5.2 paragraph says "read it, don't port it". But
`standalone-app.md` is the file a reader consults for _what to do next_, and the
corrective commit `2303d2d` never touched it. Worse, "add our fight-selection
policy" implied the missing half is bolt-on, when §1.3 proved there is no
counterpart to lift.

**A2 (MEDIUM).** `fork-wowsims-app.md`'s superseded banner — whose job is to name
what is wrong below it — itself asserted "Their importer is the clearest
take-don't-build item we have". The banner propagated the very error it existed
to fence off, and it was the first thing a reader saw in the file.

Explicitly **not** findings: the §16 intro rewrite is accurate; the §4/§5.2
pointers corroborate rather than re-litigate those sections; nothing else in
PLAN.md goes stale; the durable-claims rule is respected throughout, with the
genuinely untested items labelled.

## Domain

**Verdict: domain-clean.** No claim in the diff contradicts
`docs/phase0-findings.md` or `docs/verification-log.md`, and every falsifiable
one the reviewer re-ran reproduced exactly.

Verified independently: the spec-classifier claim (actors carry
`['id','name','server','subType']`, zero `icon` fields, `subType` class-level
only; upstream line 63 verbatim, line 69 throws `Player type not implemented`);
the [R18] talent trap (25 combatants, `id-sums: [61]`, and 61 is the correct TBC
level-70 budget — levels 10–70 — matching `phase0-findings.md`'s `21/40/0`
shape); the hit cap (`PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233`,
`9 × … = 141.923` → ~142, `capUncertainty: 16` ≈ one percent, consistent with
R8, and 9% = 8% base miss vs a +3-level target plus 1% suppression is right for
TBC); zero character-first discovery upstream; the `effectId` enchant namespace
per R19/R14; `atlasloot.go` MoP-only; all four compare-colour metas carrying no
min-colour keys; 8257/8257 items carrying `phase`.

**D1 (HIGH, meta — a defect in the review brief, not in the diff).**
`.agents/reviews/domain.md` told reviewers that spec is classified from
"`CombatantInfo.specID` / talent-tree point distribution". That contradicts
`docs/phase0-findings.md` and PLAN.md §5.2's [P0]: `specID` is **always 0** on
TBC Anniversary and is unusable. The diff's docs were correct and the _brief_ was
wrong — left unfixed, a future domain reviewer would flag correct code as wrong.

**D2 (note).** `take-list.md`'s claim that upstream hardcodes a shared `Basic`
auth pair was not fully verified — the reviewer confirmed `getWCLBearerToken`
posts to the OAuth endpoint but did not read the credential literal. Low stakes:
the recommendation (use our own `WCL_CLIENT_ID`/`SECRET`) holds either way.

Correctly self-labelled as hypotheses, and left as such: the OAuth host question
(`www` vs `classic`), the Bulk tab's full behaviour, and whether upstream's query
shapes still work against the current API.

## Standards + Spec

### Standards

Repro commands are attached to nearly every load-bearing claim, `hypothesis` /
`untested` labels appear where required, and the `> CORRECTED 2026-08-04` block
in `take-list.md` §1 is exactly what the durable-claims rule is for. All 18
relative links in the new folder resolve; PLAN.md's §4/§5.2/§16/§17/§18
cross-references all still exist; voice and format match the `docs/plans/`
siblings; nothing leaked into a skill file.

**ST1 (hard violation).** The `fork-wowsims-app.md` banner — same defect as A2,
found independently. Flagged as the one item to block on: a fresh artifact
stating a disproven causal claim as fact, with no re-runnable command and no
label. AGENTS.md § Durable claims.

**ST2 (hard violation, minor).** `take-list.md`'s bare "Assessed on `dev` @
`23c3291`" is an environment assertion without the durable-claims contract the
sibling files state in their preambles.

**ST3 (judgement — Shotgun Surgery).** The WCL finding lived in five places, with
the `~10%` / `776 lines` / "classifier throws" triple restated independently in
four of them. A2/ST1 is the proof this matters: one copy drifted before the
branch even landed.

**ST4–ST6 (judgement, not taken).** Duplicated line-count tables between
`standalone-app.md` and the superseded file; the "~1,066 lines" conclusion in
both `README.md` and `take-list.md`; and `standalone-app.md` as a possibly
mysterious name.

### Spec

There is no ticket governing this branch; the spec is the user's explicit
requests in conversation. Requests #1–#4 (audit upstream for reuse; split into
plan files; brief architectural sketch of the two functionalities; don't rebuild
what exists unless substantially superior; standalone independence; licensing out
of scope) are **delivered**.

**SP1.** The "don't take the WCL importer" verdict is **consistent with**, not an
abandonment of, the don't-reinvent goal — request #4's "unless its substantially
superior" exception fires with falsifiable evidence.

**SP2 (scope creep, accepted).** The §4 mechanics-constants paragraph was not
requested by #7, which asked only for a §5.2 pointer. Judged justified
housekeeping — it is the second of the audit's two genuine "take" findings and
belongs at its point of decision — but it is invented scope and is recorded as
such.

**SP3.** Keeping a 155-line superseded document contradicted request #5's "so
they dont clutter", and its §5/§6 still weighed licensing and upstream drift,
both explicitly ruled out of scope.

**SP4.** "stick them on dev" is unmet at HEAD by construction — that is the land
step, not a diff defect.

---

## Summary

Four axes, nine findings. **Domain is clean** — every falsifiable claim in the
diff reproduced exactly, and the one HIGH domain finding is a defect in the
review brief itself rather than in the branch. The two independent HIGH/hard
findings (A1, A2/ST1) are the same class of error the branch was written to
correct: stale "port upstream's WCL client" advice surviving in files the
corrective commit missed. Both are fixed. All fixes are documentation-only; no
code, tests or data changed anywhere in this branch.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                    |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `standalone-app.md` build order step 1 now says build per §5.2 and **do not port**, with the reason and a link to `take-list.md` §1                                              |
| A2  | Adversarial | fixed       | Same as ST1 — banner corrected                                                                                                                                                   |
| D1  | Domain      | fixed       | `.agents/reviews/domain.md` corrected: talent-tree plurality is the only classifier; `specID` is [P0] always 0 and unusable; `talents[].id` is points-spent, summing to 61       |
| D2  | Domain      | wontfix     | The shared-credentials literal was not read. The recommendation (use our own `WCL_CLIENT_ID`/`SECRET`) is unaffected either way                                                  |
| ST1 | Standards   | fixed       | `fork-wowsims-app.md` deleted (see SP3), which removes the offending banner entirely                                                                                             |
| ST2 | Standards   | fixed       | `take-list.md` preamble now names the observed environment and states the durable-claims contract, matching the sibling files                                                    |
| ST3 | Standards   | fixed       | `README.md` no longer restates the WCL argument; it routes to `take-list.md` §1 as the single copy, with an explicit note not to restate it                                      |
| SP2 | Spec        | wontfix     | §4 mechanics-constants pointer kept. Unrequested, but it is the audit's other genuine "take" finding and belongs at its point of decision. Recorded here as accepted scope creep |
| SP3 | Spec        | fixed       | `fork-wowsims-app.md` (155 lines, superseded) deleted; git history is the record. `README.md`'s file table updated                                                               |

ST4–ST6 and SP1/SP4 were raised and judged not actionable — see the axis
sections above. No deferred findings, so no carry-forward tickets were filed.

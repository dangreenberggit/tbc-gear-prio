# Pre-merge review — feat/342-learn-from-upstream

Reviewed range: `64268a1f49ccd878af1aee553e446d832ff2d64b..e3ae198abc6ecbd17ab602022bd99063de485e07`

Dispatch: three axes in one parallel batch on the review lane (Claude Code, Opus
at effort medium, fresh context each, no access to the authoring conversation).
`codex` is not on `PATH`, so option 1 of the skill's dispatch order did not
apply. A fourth targeted investigation was spawned during aggregation to settle
the domain axis's crux (see Domain, D1).

The diff contains **no source code**: four commits of documentation, two new
tickets, a ticket closure, a one-line `.gitignore` change and a `NEXT` bump.
The axes were therefore aimed at whether the documents' claims are true and
whether the closure is honest, rather than at code correctness.

## Adversarial

**No blockers, no majors.** The axis attempted to falsify every load-bearing
claim and reported that all of them hold. Independently reproduced:

- F1's core claim — the sole hand guard is off-hand-directional; `itemFitsSimSlot`
  admits `HandTypeTwoHand` at `mainhand` while `offhand` is an allowlist;
  `swapItemAt` returns `spec` by identity for every `i !== slotIndex`. The
  2H-into-mainhand-over-worn-offhand path is genuinely unguarded in both engine
  copies.
- F2's core claim — `compose.ts` contains no reference to `consumables`;
  `data/presets/feral/p2.raid-sim-skeleton.json` pins `mhImbueId: 34340` and
  ret's skeleton has no imbue field; `disclosure.ts` does assert "Constant
  across baseline and candidates, so deltas survive".
- **The whole sharp/blunt table, re-derived independently** — all four rows and
  feral-p2's breakdown (Dagger 7, Mace 11, Staff 9, Fist 2) reproduce exactly,
  with the `WeaponType` enum read from the generated `common_pb.ts`.
- `adjustWeaponImbueID`'s behaviour, commit `bb4e77528`'s content and its
  ancestry, and that `cbf6b75a8` matches `wowsims.lock.json`'s watched ref.
- That both keep-as-is verdicts are **earned on the code, not asserted** — F3's
  adapter really does route through upstream's own page-sim helper and the bulk
  helper's signature really is incompatible; F4's partial really is built and
  returned before the ranking-cache write.

Findings:

- **A1 (minor) — a symbol named on a side where it does not exist.** The
  comparison and ticket 350 both wrote `attemptEligibility` as if it existed in
  `packages/core/src/rank.ts`. It does not: `grep` returns zero hits, and core
  inlines the same guard in the `runCandidate` loop as `... continue;`. The
  substantive claim is correct in both copies; the naming would have cost a
  context-free executor time. **Fixed** — both documents now state the
  divergence explicitly and tell the reader to grep the condition, not the name.
- **A2 (nit) — two comment citations given as unqualified fork line numbers.**
  Left as-is; both documents already instruct locating by symbol, and ticket 350
  qualifies its own citation. **wontfix.**
- **A3 (nit) — `test/fixtures/...` is repo-root-relative and unmarked.** Path is
  correct and the file does pin `34340`. **wontfix.**

On honesty, the axis looked specifically for a slide from "the mechanism exists"
to "the output is wrong" and did not find one, noting that each ticket's
`## What is NOT claimed` section disclaims the right things.

## Domain

TBC facts and upstream facts check out, with one major correction.

Verified correct: item ids 29453 / 34340; the sharp/blunt families including
**fist weapons being blunt for stone purposes**; Titan's Grip being Wrath and not
TBC (and correctly unmentioned); warglaives raising no exception; and
`DUAL_WIELD_SPECS` (rogue, enh, warrior, hunter) being domain-correct across the
eleven specs this repo supports. No contradiction with `docs/stage0-findings.md`,
which contains nothing on weapon stones.

- **D1 (major) — ticket 351's feral impact claim was directionally wrong.** The
  axis found `sim/druid/forms.go:51-56`, a second, druid-local stone
  implementation that grants the paw-damage bonus on **id equality with 34340
  alone**, with no weapon-type test; and that `consumes.go:81` gates the generic
  imbue path on `WindfuryTotem == TristateEffectMissing` while the feral skeleton
  pins `TristateEffectImproved`. So a feral dagger candidate is _not_ currently
  underpriced — it receives the bonus — and applying upstream's rule would
  rewrite `34340 → 29453` and remove it. The ticket's claim that the error
  "biases sharp against blunt" had the sign backwards.

  A targeted follow-up investigation confirmed the mechanism and sharpened it:
  `34340` appears exactly once in `sim/druid/` and `29453` **zero** times, added
  by fork commit `db05fed93` ("fix adamantite weightstone not giving paw
  damage"), and the bonus enters pre-scaling so it lands as roughly
  `12 / swingSpeed` per paw swing. The consequence is the ranking-relevant one:
  today every feral candidate shares one stone id and so one damage model, and
  it is _adopting upstream's rule_ that would split sharp and blunt candidates
  across two models. That makes the fork-engine omission the thing to settle
  first, not our missing adjustment. **Fixed** — ticket 351 was rewritten: the
  engine behaviour is now stated up front, the acceptance boxes lead with the
  TBC question and the `forms.go` omission, and the "mirror upstream" work is
  explicitly conditional on that answer. The comparison document and the 342
  resolution carry the same correction.

  The same follow-up corrected two of its own supporting claims that did not
  survive checking: `runRaidSimLightweight` is **not** dead code (called from
  `sim_ui.tsx:358`), and `Gear.adjustImbues` has a third caller the first pass
  missed — **`Player.setGear` (`ui/core/player.tsx:713`)**, whose comment
  identifies it as the frontend auto-switch upstream's Go comment mirrors. That
  reframes the finding usefully: upstream corrects the stone at the seam where
  gear changes, and our engine bypasses that seam entirely by composing from a
  pinned skeleton. Recorded in ticket 351.

- **D3 (minor) — 351's universe table is arithmetically right but partly
  inflated.** The counts reproduce exactly, but a feral pool carrying 7–13
  off-hand items per phase is not domain-plausible, and `itemFitsSimSlot` should
  filter those from `mainhand` anyway, so some counted rows never become
  candidate rows. **Noted in the review only.** The table's purpose is to size
  exposure, the ticket no longer rests an impact claim on it, and pool
  composition is a separate question from this ticket's.

- **D4 (nit) — reachability was already answerable, and the reviewer's own
  numbers were wrong.** The axis reported 52/78/79/14 two-handers for
  rogue/enh/warrior/hunter using `handType === 2`. The generated
  `common_pb.ts` gives `HandTypeOneHand = 2` and `HandTypeTwoHand = 4`, so those
  figures count one-handers. Re-derived with value 4: **rogue carries zero
  two-handers in every phase** (correct for TBC, so the bug is unreachable for
  rogues), while enh, warrior and hunter carry 42–77 per universe. **Fixed** —
  ticket 350 now carries the corrected table, and its step 4 no longer asks an
  executor to re-derive what is settled.

## Standards + Spec

### Standards

- **S1 (hard) — one commit subject exceeds 50 characters.** `44f1083` "Open the
  342 upstream comparison with a verified baseline" is 57. The other three (39,
  46, 47) pass, and all four satisfy the remaining six rules. **wontfix on this
  branch** — the fix is a history rewrite of an already-reviewed range, which
  costs more than the defect; recorded here so the range is not silently clean.
- **S2 (hard) — nine body lines at 73–74 columns against the 72-column rule.**
  Same disposition and same reason as S1.
- **S3 — the ticket-number allocation rule contradicts itself across two
  documents.** `issue-tracker.md` says "Never allocate by listing the directory"
  (two branches collided on 232/233); `known-traps.md` says "the directory
  listing is the authority" (`NEXT` has been stale). Both incidents are real, so
  neither document is simply wrong. Pre-existing, not introduced here.
  **Deferred** → `.scratch/carry-forward/issues/352-ticket-number-allocation-rule-contradicts-itself.md`.
  This branch used the conjunction (allocate from `NEXT`, verify against the
  listing), so no collision occurred.
- **Durable claims — clean.** The axis sampled for unmarked causal claims and
  found none: the E-W3 line names its command and Node version, the exposure
  table names its re-derivation inputs, and both tickets separate confirmed
  mechanism from unmeasured effect.
- **S4 (judgement) — the F1/F2 verdict prose exists in four places** (comparison
  section, 342 resolution, group README row, commit body) and will go stale
  together when 350 is settled. The 344 hand-off avoided this by pointing at a
  section instead of restating it. **wontfix** — the audiences differ (working
  document, closure record, group index), and the review's own amendments were
  applied to all three, which is the maintenance cost being accepted knowingly.

### Spec

Steps 0–8 each meet their stated acceptance line; the axis walked them
individually and confirmed the symbol table, all twelve numbered feature
questions, the verdict-per-feature shape, the no-verdict concurrency section
with its 344 pointer, the implement-or-ticket classification, and the closure
with both boxes ticked and `Status: closed`.

- **P1 — Step 9's review file was missing at dispatch time.** Correct at the
  time and expected: this file is Step 9's deliverable. **Fixed** by this
  commit.
- **P2 — the two deferrals are correctly classified.** The axis checked the
  load-bearing premise rather than the claim: `rank.ts`'s PROVENANCE row is
  `adapted`, not `none`/`import paths only`, so limb (b) of the size rule fails
  on its face for both findings, independently of the control-flow clause. 350
  changes which rows `rankUpgrades` emits; 351 needs a new fixture. Both
  correctly ticketed.
- **P3 — the two out-of-manifest paths are justified, not creep.** `.gitignore`
  and `plan.md` are both consequences of one manifest entry: `.scratch/stage-gate/*`
  is ignored, so committing the comparison document requires an un-ignore line,
  and every other retained stage-gate slug commits its plan alongside. The
  `.gitignore` entry is the tenth in an established per-slug allowlist whose own
  comment explains why these directories are tracked. Nothing in the plan's
  "Never touched" list moved, and `git -C vendor/tbc-new-fork status --short` is
  empty.
- **P4 (minor) — the plan's own verify-recipe regex is broken.** It greps
  `^(Verdict|verdict): (keep-as-is|...)` expecting 4, and returns **0**, because
  the verdicts are written as `**Verdict: ...**` with bold markers. The four
  verdicts exist and are correct, one per feature; a later reader running the
  recipe verbatim would get a false negative. **wontfix** — the plan is a
  historical artifact of a completed stage, and the working check is recorded
  below.

## Summary

Two real defects in the deliverable, both found and both fixed: a symbol named
on the wrong side of the engine split (A1), and a directionally wrong impact
claim in ticket 351 that the fork's own druid code reverses (D1). D1 is the
substantive one — it changed ticket 351 from "adopt upstream's rule" to "settle
whether the fork's single-id paw bonus is the real defect first", which is a
different and better ticket. A third correction came from re-deriving a
reviewer's own figures: the `handType` enum value it used was wrong, and the
corrected counts show the 350 bug is unreachable for rogues but live for the
other three dual-wield specs (D4).

Both keep-as-is verdicts (F3, F4) were independently confirmed as earned on the
code rather than waved through. The two deferrals were confirmed correctly
classified against the plan's size rule, on a premise the axis verified itself.

Outstanding: two commit-message mechanics violations accepted rather than
rewritten (S1, S2), one deferred docs contradiction (S3 → ticket 352), and three
nits declined.

`pnpm verify` exits 0. E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`)
**ran and passed** on Node 22.16.0; it cannot collect on the Node 20 that leads
`PATH` here, because `node:sqlite` does not exist there and `package.json`
requires `node >=22.5.0`.

Working verdict-count check, replacing the plan's broken regex:

```
grep -c '^\*\*Verdict: \(keep-as-is\|adopt-their-idea\|adopt + note\)\*\*' \
  .scratch/stage-gate/342-learn-from-upstream/comparison.md   # 4
```

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                  |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `attemptEligibility` does not exist in `packages/core`; comparison and ticket 350 now state the fork/core divergence and say to grep the condition                                                                                                                                             |
| A2  | Adversarial | wontfix     | Fork line numbers in two comment citations; both documents already say to locate by symbol                                                                                                                                                                                                     |
| A3  | Adversarial | wontfix     | `test/fixtures/...` path is repo-root-relative and correct, just terse                                                                                                                                                                                                                         |
| D1  | Domain      | fixed       | Ticket 351 rewritten: `sim/druid/forms.go:51-56` grants the paw bonus for id 34340 only, so the naive mirror would split sharp/blunt across two damage models; acceptance now leads with the TBC question and the `forms.go` omission. Comparison and 342 resolution carry the same correction |
| D3  | Domain      | wontfix     | Feral pools carry off-hand entries that never become rows, inflating the exposure table; the table only sizes exposure and no impact claim rests on it. Pool composition is a separate question                                                                                                |
| D4  | Domain      | fixed       | Reviewer's two-hander counts used `handType === 2` (`HandTypeOneHand`); re-derived with `HandTypeTwoHand = 4`. Ticket 350 now carries the corrected table — rogue 0, enh/warrior/hunter 42–77 — and no longer asks for a re-derivation                                                         |
| S1  | Standards   | wontfix     | Commit `44f1083` subject is 57 chars against the 50-char rule; a history rewrite of a reviewed range costs more than the defect                                                                                                                                                                |
| S2  | Standards   | wontfix     | Nine commit-body lines at 73–74 columns against the 72-column rule; same reason as S1                                                                                                                                                                                                          |
| S3  | Standards   | defer       | `.scratch/carry-forward/issues/352-ticket-number-allocation-rule-contradicts-itself.md`                                                                                                                                                                                                        |
| S4  | Standards   | wontfix     | F1/F2 verdict prose duplicated across four artifacts; audiences differ and this review's amendments were applied to all of them                                                                                                                                                                |
| P1  | Spec        | fixed       | Step 9's review file — this file                                                                                                                                                                                                                                                               |
| P2  | Spec        | fixed       | No action needed; deferral classification confirmed correct against a verified PROVENANCE row                                                                                                                                                                                                  |
| P3  | Spec        | fixed       | No action needed; `.gitignore` and `plan.md` confirmed as consequences of a manifest entry, not creep                                                                                                                                                                                          |
| P4  | Spec        | wontfix     | The plan's verify-recipe regex misses bold verdict lines and returns 0 instead of 4; working replacement recorded in Summary                                                                                                                                                                   |

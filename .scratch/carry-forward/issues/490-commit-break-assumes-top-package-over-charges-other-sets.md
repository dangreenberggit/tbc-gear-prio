Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (SME verdict, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 476, 477, 478

# "Set potential" ON charges a Thunderheart 2pc break that the game does not impose

With "Set potential" ON, a row's credit subtracts every worn bonus that
completing its set's TOP implemented package would break (`commitBreaks`,
fork `rank.ts` `applySetContext` via `substitutedPackageBreaks` and
`topMeasuredPackage`). At worn Thunderheart hands + legs (2pc active), a
Malorne or Nordrassil **head, shoulder or chest** piece is charged −108.6 for
breaking the Thunderheart 2pc. That break happens only on the way to the
Malorne or Nordrassil 4pc, whose net is at or below the noise floor and is not
credited. The Malorne 2pc can be completed in head, shoulder and chest while
the Thunderheart 2pc stays active, so the ON figure is wrong for those rows.
This is a correctness bug in the ON view; the OFF view is trusted.

## Evidence

- SME handoff `.scratch/handoffs/sme-rank-judgment-467-net-set-bonus.md`,
  sections "Verdict" and "Findings" (F1–F3): **do-not-trust** for ON, trust
  for OFF.
- Breastplate of Malorne: OFF +8.6; ON **−37.7** (ON rank 66) = 8.6 + 62.3
  (Malorne 2pc) − 108.6 (Thunderheart 2pc). By the game it is about **+70.9**
  (8.6 + 62.3), which would be ON rank 3.
- Nordrassil Chestplate: OFF +15.1 (rank 5), ON −93.5 (rank 207). No
  Nordrassil gain is credited; the full −108.6 is charged.
- Captures (gitignored) in `.scratch/stage-gate/upgrades-tab-closeout/round-2/`:
  `feral-worn2-tip-Malorne-{off,on}.png`, `feral-worn2-tip-Nordrassil-{off,on}.png`;
  row lists in `feral-worn2.json` and `sme-feral-worn2-{off,on}.json`. The
  same pattern shows at worn 3: `feral-worn3-tip-Malorne-on.png`
  (−15.9 + 63.5 + 69.5 − 115.3 = +1.8).
- Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb` (main re-pin `7f4b98af`),
  feralcat, 3000 iterations, backend :3333, baseline 2603.6 DPS.
- **Contested wording:** the round-2 Step 5 brief described the Malorne and
  Nordrassil rows as rows "which break the worn Thunderheart 2pc". That is
  true only for their hands and legs pieces. It is false for Breastplate,
  Mantle and Stag-Helm of Malorne and for Nordrassil Chestplate, Feral-Mantle
  and Headdress.

## Design question the fix raises

Which package should a commit break assume? Today it is always the top
implemented package (the 4pc when measured). Candidates: the package of each
credited future threshold, so a row is charged only for breaks the credited
gain needs; the best-net package; or a break attached to each future line.
This needs an owner or orchestrator decision before any code. The rest of
467's design stays settled.

## What would close this

1. A decision, recorded here, on which package a commit break assumes.
2. A fixture in `packages/core/test/fork-set-net.test.ts` for this geometry
   (worn set Y at 2 in two slots; another set X whose 2pc fits in free slots
   and whose 4pc would displace Y), red today, asserting the ON credit the
   decision implies.
3. The engine change, PROVENANCE cycle, re-pin, `pnpm verify` rc=0, and a real
   layout gate run.
4. A new SME verdict on the same worn-Thunderheart-2 state that is not
   `do-not-trust` for the ON view.

## Comments

- 2026-09-24 (round 2b, Step 0): the owner has not chosen the stopping
  rule, so **best-stop** ships provisionally. Full-path is one constant
  (`RULE_490` in `packages/core/test/fork-set-net.test.ts`) and one
  function (`view.ts` `setPotentialCredit`) away.
- 2026-09-24 (round 2b, Step 1): red fixtures committed. Observed on fork
  `371da7dce`, matching the plan's "today" column: 490-A chest/head/shoulder
  full −10, split −30, futures carry no `breaks`, `packageItemIds` 640:2
  {29096, 29098} and 640:4 {29096, 29097, 29098, 29100}, runs 10 → 11 with the
  flag, B(676,2) = 50; 490-B chest full 20, split −22.5; 490-C Nordrassil
  chest/head/shoulder full −50. Command:
  `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?`
  → rc=1, 8 failed (490-A/B/C, 491-P/L, 492-F, 477-T, credit-view), parity
  green.
- 2026-09-24 (round 2b, Step 7): SME verdict: **trust-with-caveats** for
  "Set potential" ON, **trust** for OFF, at worn Thunderheart 2 (feralcat,
  phase 3, constructed state: Thunderheart hands + legs, 3000 iterations,
  baseline 2603.6 DPS, fork f6355d529). Handoff:
  `.scratch/handoffs/sme-rank-judgment-490-per-future-breaks.md`. No Malorne
  or Nordrassil head, shoulder or chest row is charged the Thunderheart 2pc:
  Breastplate of Malorne +8.6 OFF → +70.9 ON (its 2pc, +62.3); Nordrassil
  Chestplate +15.1 in both. Every ON figure matches the best-stop rule from
  its own tooltip. Caveats filed as 497 (4pc values vary with the worn
  Thunderheart count) and 498 (a head piece is credited a 4pc a cat reaches
  without it).
- 2026-09-24 (round 2b, Step 8): **closed.** Fork `7b7f2da281dd9ddc00faa4c216ff539ca40b2fe6`
  (engine + tab), re-pinned with the follow-up fork commits
  `f6355d529742cb13575e7329d0f3b9e86bdaef7a` (479) and
  `5e00931759b3ff1b30495f705a81e77381fb95f3` (tooltip width) in main
  `f72f1a6b` and `cf51f4f4`. Rule in force: **best-stop, provisional**; the
  owner question is open, and full-path is `RULE_490` plus
  `view.ts` `setPotentialCredit` away. Path rule: each future's breaks are
  those of the candidate plus the best remaining pieces of that threshold's
  measured package (the whole package when the candidate is in it), minus
  the row's single breaks; the view charges each key once and stops at the
  largest full-value running total. Fixtures (red on 371da7dce → green):
  490-A chest full −10 → 40, split −30 → 20; 490-B chest full 20 → 40,
  split −22.5 → 20; 490-C Nordrassil chest −50 → 0; 477-T legs 90 → 130;
  credit-view break-on-future 80 → 40. `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?` → rc=0 (22 passed, 1 skipped);
  `pnpm verify` rc=0; layout gate `{"outcome":"measured","passed":57,"failed":0,"a11yFailed":0,"a11yWarned":29}`.
  ADR-0034 updated (`f1150137`).
- 2026-09-24: **owner confirmed 2026-09-24** the best-stop rule (assume
  the player collects a set only while each step pays) as final. It
  supersedes "provisional" in the comments above. No code change; the
  "provisional" wording left in the fork's `view.ts` comment and PROVENANCE
  row is to be corrected with the next fork edit.
- 2026-09-25 (targeted engine review, findings P5 and S5;
  `docs/reviews/feat-tab-signoff-followups.md`): the "provisional" wording
  was corrected in fork `7ed8c9941` (comment-only edit of `view.ts` and its
  PROVENANCE row). `git -C vendor/tbc-new-fork grep -n -i provisional
  7ed8c9941 -- ui/core/components/individual_sim_ui/upgrades/engine` finds
  no hit (rc=1). That commit and its main re-pin `f6bc9087` did not
  record the fork-gated run. The run at `7ed8c9941`, before this review's
  edits: `npx vitest run packages/core/test/fork-set-net.test.ts
  packages/core/test/wowsims-fork-parity.test.ts` → rc=0 (22 passed, 1
  skipped).
- 2026-10-02 (stage-gate 511-512-set-credit, step 39; owner-quote
  correction): the parenthetical in the 2026-09-24 "owner confirmed" entry
  above, "assume the player collects a set only while each step pays", is
  an agent's gloss of the best-stop rule, not the owner's words. The owner
  chose best-stop over full-path; the owner's own words are in
  `.scratch/handoffs/owner-quotes-upgrades-tab-closeout.md` lines 57–66.
  Gate B ruling N1 of that stage (its `decision-log.md`, gitignored) bars
  quoting the gloss as the owner's words. The same gloss was removed from
  ADR-0034 lines 72–74 with ADR-0035
  (`docs/adr/0035-set-rows-valued-by-simmed-gear.md`). The entry above is
  left as written; this comment corrects it. Status unchanged.

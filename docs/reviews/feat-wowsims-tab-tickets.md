# Pre-merge review — feat/wowsims-tab-tickets

Reviewed range: `65e6a48ad5896e98d0a994eeb7a603c322d70c1d..a663c58d1d335f3dfb95b0fd9c8a56c76baf32b6`

Dispatch: three axes in one parallel batch, fresh subagents on the review lane
(Opus, effort medium). `codex` not on `PATH`.

The diff is large by line count (~9.3k/7.7k) but dominated by regenerated
`data/universes/**` artifacts (feral-p3.json alone ~14k lines, a documented
CRLF→LF / reorder churn, membership unchanged 364→364) and a one-line
`data/wowsims-fork.lock.json` re-pin. The hand-written logic is a small set:
`packages/core/src/{cutoff,pool,rank-report-rules,rank-report}.ts`, their tests,
and `scripts/assemble_universe.py`. Reviewers were scoped to that surface.

## Adversarial

**Clean — nothing survives scrutiny as a defect.** The silent-wrong-number
class the brief prioritizes does not occur.

- The report's cutoff-arm annotation cannot contradict the ranking's cutoff
  verdict: `rank-report.ts:506` gates `pctArmOnly` on `!item.belowCutoff` and
  re-runs `cutoffAdmittingArm` over the same `deltaDps`/`deltaPct`/`cutoff` pair
  the ranking used, so the "cleared by %-arm" marker can never fire on a
  below-cutoff row.
- `cutoffAdmittingArm` mirrors `meetsCutoff` exactly (`arm !== "none"` ⇔
  `abs || pct`, `>=` on both arms) — no off-by-one.
- `tokenIdForExport` reads all sources, returns the first `token` source with a
  numeric `tokenId`, else falls through to the gear id; Sunmote rows carry no
  `tokenId` (`assemble_universe.py` Sunmote block never sets it) so they keep the
  gear id correctly.
- Purity: new `src` code has no fs/network/process/console; the `readFileSync`
  is in `test/` (allowed).
- No `RankError`-handling code is touched by this diff.
- Test integrity: the "agrees with `meetsCutoff`" test compares two independent
  implementations (not tautological); the whole-set TMB test reads
  `data/two-hop/ret-tokens.json` as its expected list, so a mis-keyed remap
  fails it (load-bearing, not theatre).

## Domain

**Clean — nothing contradicts `docs/stage0-findings.md` or
`docs/verification-log.md`.**

- Cutoff constants match the verified figures: `CUTOFF = {absDps: 3.4,
pct: 0.15}`, `CUTOFF_FERAL.absDps = 3.6`. `cutoffAdmittingArm` (254) is a pure
  re-read of `meetsCutoff`'s OR and adds no new game assumption; the boundary-row
  fixtures are internally consistent (abs fails, pct clears → `"pct"`).
- Token→gear mapping is faithful: e.g. 31089 Chestguard of the Forgotten
  Conqueror → 30990 Lightbringer Breastplate, landing under Black Temple /
  Illidan. Per-class token names correct — ret (paladin) Champion/Conqueror,
  balance (druid) Defender — matching the real TBC token-class split.
- No membership churn: new-spec universes gained only additive `tokenId` fields;
  feral-p3 itemId count 364→364.
- Set-bonus threshold logic (`rank-report-rules.ts` 2pc/4pc paths) is untouched
  here; ticket 330 is filed **open**, not fixed in this diff, so no incorrect
  threshold claim ships.

**Unverified (not a contradiction):** the concrete `tokenId` values (30236,
30237, 29753, …) are new data outside both truth files. `ret-tokens.json`
records them as checked against Wowhead pages + AtlasLoot — a documented
provenance, just not one of the two truth files. To confirm, resolve each
`tokenId` against `vendor/wowsims/db.json` by item name. Flagged, not blocking.

## Standards + Spec

**0 hard standards violations; 0 spec violations.**

- Comment policy passes despite large new doc blocks — each carries genuine
  non-obvious _why_ (raid drops the token not the gear; the Sunmote
  fall-through; the SME-flagged OR-arm misread; a pointer to the unbuilt
  `crafted` branch), not restatement.
- Types-from-JSON clean; durable claims anchor to ticket ids / commands / paths.
- **Judgement-call smell:** `CutoffArm` (cutoff.ts) is a four-value enum
  (`abs`/`pct`/`both`/`none`) but production reads only `=== "pct"`; the other
  arms live only in the type, the `if` ladder, and tests. It is the total
  function over the OR and is documented — the reviewer calls it a reasonable
  "complete the enum" choice, a flag not a defect.
- Duplication `wowsimsTmbItemIdsJson` vs `wowsimsItemIdsJson` is acceptable
  (they differ only by `tokenIdForExport(i) ?? i.itemId`; extracting the two-line
  `JSON.stringify` envelope is not worth it — ticket 126).
- Spec: 254 (cutoff-arm marker) correct and unit-asserted; box 2 (fresh SME read)
  explicitly deferred, not counted missing. 126 (TMB token-id export) report half
  correct. 211/330/331/336 annotation-only here with no code over-claiming a fix.

**Spec note (unverifiable, not missing):** `wowsimsTmbItemIdsJson` (and
`wowsimsItemIdsJson`) have no production caller _in this diff_ — the wired-in
captioned export lives on the tab path (`upgrades_tab.tsx`), which is gitignored
fork code reachable only through the `data/wowsims-fork.lock.json` re-pin. This
matches ticket 126's split (the report half is a tested library function; the
user-facing half is on the fork), so it is not a defect — but the rendered TMB
export and its caption cannot be confirmed from the visible diff.

## Summary

All three axes came back clean. No correctness defects, no domain
contradictions, no standards or spec violations. The only smell is a documented
Speculative-Generality enum (`CutoffArm`'s three unused arms), which the
Standards axis itself judges reasonable — recorded `wontfix`, not ticketed. The
one domain flag (concrete `tokenId` values verified against Wowhead+AtlasLoot
rather than the two truth files) and the one spec note (the TMB export's
user-facing half lives on the gitignored fork tab path) are both accounted-for
consequences of this branch's design, not deferred work.

The tab tickets carried by this branch (254, 311, 313, 314, 315) are
engineering-resolved and pending **owner sign-off** only; 330/331/336 are
deliberately-deferred disclosure tickets with owner rulings recorded. None
blocks the merge gate. No new tickets filed; nothing to route through the
orchestration pipeline.

The tab-facing surface (the 254 arm marker, the 330 reworded set-bonus line, the
wired TMB export + caption) lives in the gitignored fork and is **unexamined by
all three axes** — it is not in this repo's diff. It is exercised by the fork's
own gates via the lockfile re-pin, and several of the carried tickets note
owner-checklist visual sign-off is still pending on exactly that surface.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                               |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | No defects found. Cutoff-arm annotation, `tokenIdForExport` fallthrough, purity, and test integrity all verified clean.                                                                                                                     |
| D1  | Domain      | wontfix     | No truth-file contradictions. Concrete `tokenId` values are new data verified against Wowhead+AtlasLoot per `ret-tokens.json` provenance; to double-check, resolve each against `vendor/wowsims/db.json` by name. Not blocking.             |
| S1  | Standards   | wontfix     | `CutoffArm` four-value enum has three arms unread by production — total function over the OR, documented; Standards axis judges it reasonable. Cosmetic.                                                                                    |
| S2  | Spec        | wontfix     | `wowsimsTmbItemIdsJson` has no production caller in this diff — user-facing captioned export is on the gitignored fork tab path (`upgrades_tab.tsx`), matching ticket 126's split. Not a defect; fork surface unreviewable from this range. |

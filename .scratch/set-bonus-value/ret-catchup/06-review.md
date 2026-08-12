# W6 fresh-context review — commit 3a40889 (ret catch-up round, docs-only)

Reviewer: W6, fresh context, 2026-08-11. Scope: tickets 118–125, appends to
tickets 94/117, the handoff's "Ret catch-up round" section, plus worker logs
01–05 as evidence base. Independently re-derived (not just re-read) against
`artifacts/slamaltman-p3.{json,console.log}`, `data/items/index.json`,
`data/universes/ret-p3.json`, `test/fixtures/slamaltman.raw.json`, and the
source files each ticket cites.

## Verdicts

- **Adversarial axis: PASS with findings** (all low; no figure is wrong, no
  claim is unsupported in substance — three precision slips).
- **Spec axis: PASS with findings** (all six brief items delivered; one
  arguable "cheap fix ticketed instead of done", one process footnote).

## What was independently verified (spot-checks, all confirmed)

1. **Baseline 2003.51 ± 118.93** — console.log:441, verbatim.
2. **Lightbringer 2pc +0.55 / pkg +11.31; 4pc −9.31 / −6.83; Crystalforge 2pc
   0.00 / −0.47; 4pc −9.92 / −26.77; Justicar 4pc −3.88 / −80.56** —
   console.log:448–457 and JSON `ranking.setBonuses` (0.545/11.314,
   −9.310/−6.835, 0 exact/−0.470, −9.925/−26.772, −3.876/−80.557). Unmeasured
   five (Justicar 2pc, Gladiator 2/4, Burning Rage 2/4) match.
3. **12/14 slots alive** — recomputed per-slot max deltaDps from the JSON:
   14 slot buckets, 12 with best > 0; dead = ranged (max −13.81, n=4) and
   trinket (max 0.00, n=21). Matches ticket 94's note and the handoff.
4. **13 meta-socket heads incl. 30989 (T6)** — recomputed: 25 unique head
   candidates in the artifact, 13 whose `sockets` include GemColorMeta (=1,
   proto/common_pb.ts:2727), 30989 among them, id list matches 03-verify's
   table. Ticket 117's "no T6 escape on ret" claim holds.
5. **rank.ts largest-threshold-wins** — confirmed at rank.ts:1225–1236
   (`.sort((a, b) => b.threshold - a.threshold)[0]`), exactly as tickets
   118/119 and 04-surfaces describe.
6. **cli.ts:79 `--spec` gap** — confirmed: `usage()` string lists 12 flags,
   no `--spec`; `parseArgs` accepts it. Ticket 125 correct.
7. **Ticket 119 algebra** — checked against `computeSynergy`
   (set-value.ts:337-350) and `brokenSetBonuses` (set-value.ts:260-282,
   `if (setId === completingSetId) continue` — self-set genuinely invisible
   to `breaks`). At 1 worn: packageΔ contains B2 once, each of the 3 singles
   crosses to 2pc so Σ singles carries 3·B2, subtracted twoPieceBonus is the
   measured 0 (Anomaly B) → bonus(4) = B4 − 2·B2. **Algebra correct.** The
   ~−262 Malorne figure is 2×131 from ticket 92's measured 131.1 and is
   explicitly marked "Hypothesis, untested" in the ticket. Anomaly B's
   identity (2pc package sim = single-swap sim at 1 worn) also checks out;
   the reported se 3.80 ≈ √3·(118.93/√3000) as 03-verify derives.
8. **Ticket 120/124 code claims** — plausibility.ts:115 `bonusDps <= 0)
   continue` with the negative-exemption comment, dead-slots.ts `wornRowOf`
   zeroed.length===1-or-null and the two skip paths: all as cited. −9.92 at
   ~2σ (se 4.96) arithmetic correct.
9. **Ticket 122** — the Go panic in console.log:445 names
   `sim/hunter/item_sets.go:244` and the HunterAgent assertion; drop is in
   `ranking.substitutions[0]` (length 1). The "only such item?" question is
   marked hypothesis/untested. Correct.
10. **Universe 394 entries** (data/universes/ret-p3.json `entries.length` =
    394), **393 ranking rows** (394 − 1 dropped), **431 sims** (console
    "simming N/431"), **10 setBonuses / 19 setContext rows / no
    plausibilityWarnings key** — all recomputed from the artifacts, matching
    the handoff and logs.
11. **Ticket 117's 0/13 method honesty** — the append states plainly that
    the JSON carries no gem-fill data and the table came from replaying the
    swap path (`equipmentForCandidateSwap` + `gemsForPhase(3)`) offline. The
    method is disclosed, the "latent, not disproven" framing is right, and
    the record-only constraint (no fix) was respected. I did not re-run the
    probe; the claim is honestly scoped either way.
12. **Commit hygiene** — `git show --stat 3a40889`: exactly 11 files, all
    in-scope (8 new tickets, 94, 117, handoff). No foreign files swept. The
    handoff's 108 deleted lines are a prettier rewrap: the deleted
    "Follow-up round" section reappears re-wrapped in the additions; content
    intact on spot-check.

## Findings

1. **Low (accuracy) — ticket 94's note says "the setId join across all 15
   worn items"; the worn set is 16 items.** Recomputed from the fixture
   event carrying 30129 (combatant_info_events[11]): 18 non-empty gear slots
   minus shirt/tabard, off-hand empty (2H) → **16** sim-relevant worn items,
   all 16 present in `data/items/index.json`, exactly one with a set
   (30129, setId 629). The load-bearing conclusion — one set piece, below
   threshold, no toll possible — is confirmed; only the count is off by one.
   Fix: s/15/16/ in the ticket 94 note (03-verify.md task 3 has the same
   slip).
2. **Low (traceability) — the handoff's "~65 min wall" is not re-derivable
   and its cited evidence contradicts it as written.** The console log has
   no timestamps; the only source is the director-reconstructed
   02-generate.md, whose parenthetical "(11:03–18:09Z)" spans 7h06m, not
   65 min (almost certainly a local-time start mislabeled Z against a UTC
   report stamp of 18:09:56Z). Durable-claims risk is mild (runtime, not
   causal), but the committed handoff repeats a figure whose only written
   support is self-contradictory. Fix: correct the range in 02-generate.md
   or soften the handoff to "single run, 431 sims" without the wall figure.
3. **Low (framing) — ticket 94's append header "ret 'benign' VERIFIED"
   slightly overstates what was verified.** The original benign call was
   about specific dead zones (shoulder/head/hands/wrist, gaps −0.2…−16); in
   this run those slots are alive, so that classification was never
   re-tested — it is moot, as the body and 03-verify say plainly ("the
   'benign' question is moot for them"). What the join verified is the
   stronger generic fact (no worn set piece at threshold → no ret slot can
   be a toll), which does retire the ticket's concern. Body is honest; a
   skimmer reading only the header gets a mild overclaim. Optional wording
   fix; no reopen warranted.
4. **Low (spec) — brief item 6 said ret-lacks items get "done cheap or
   ticketed with a plan"; ticket 125 (`--spec` missing from usage) is a
   self-described one-line trivial fix that was ticketed, not done.**
   Defensible — the round was declared docs-only and a code change would
   have pulled in verify/TDD obligations — but it is the one place a "cheap
   fix" was available and deliberately deferred. Owner may want to just do
   it next code slice.
5. **Info (process) — W4 is listed in DIRECTOR.md as "resumed after
   session-limit cutoff (running)" while W5's tickets (118, 123) already
   cite 04-surfaces.md findings "via coordinator relay".** The log now
   exists, is complete, and matches every claim made from it (I re-verified
   the package-mode no-op chain: 393 rows with data-package === data-delta
   is consistent with all attached packages being negative 4pcs under the
   largest-threshold sort, and the +11.31 LB 2pc attaching to no row). No
   misstatement found — recorded only so the fan-in ordering is visible to
   the owner.

Nothing else to report on the adversarial axis: every ticket carries the
verbatim re-run command; every unproven causal claim I found (119's −262,
122's "only item?" sweep, 124's fix sketch, 03-verify's deterministic-
interaction residual) is marked hypothesis/untested in the same sentence;
ticket 94's note does not contradict the original closed rationale; the
handoff table matches the console log line-for-line; and the "closed this
handoff's own standing gap" claim is accurate (the disposition's "not run
here" sentence is quoted correctly and the run now exists).

## Spec-axis checklist (owner brief → delivered)

1. Ret rank artifact with setContext — **DONE** (artifacts/, 19 setContext
   rows, 10 setBonuses, JSON+HTML+console archived, re-run command recorded).
2. CF/LB 2pc/4pc through the measurement path, ADR-0023 confirmed — **DONE**
   (03-verify tasks 1–2: composition, worn-piece counting, added-only
   packageItemIds, correctly-empty breaks; two first-exercised anomalies
   honestly escalated as ticket 119 rather than papered over).
3. Ticket 94 verified via setId join, appended, not reopened — **DONE**
   (findings 1 and 3 above are wording-level).
4. All report surfaces on ret HTML incl. four toggle states — **DONE**
   (04-surfaces checks 1–8, four set-weight states driven live in a browser
   plus static sort simulation; the package-mode no-op became ticket 118
   instead of being called a pass — correct posture).
5. Ticket 117 ret data set without fixing — **DONE** (append is record-only,
   policy options untouched).
6. Ret missing pieces found and done-cheap-or-ticketed — **DONE with
   finding 4** (121 carries the gh api evidence for the W2b cancellation and
   a costed plan; 122/125 ticketed; 125 arguably should have been "done
   cheap").

Silently dropped or substituted: **nothing found.** The one cancelled wave
(W2b) is disclosed in DIRECTOR.md, the handoff, and ticket 121 with the
verification command that justified cancelling it.

## Disposition

Pass with findings on both axes. This is an unusually well-evidenced docs
round: every headline number in the committed tickets and handoff traces to
the archived artifact or to code I could open at the cited lines, the two
genuinely novel measurement anomalies (self-set multi-charge, zero-by-
construction 2pc) are algebraically correct as stated and properly marked
where extrapolated, and the commit swept nothing foreign. The four low
findings are precision slips — a 15-vs-16 worn-item count, an
internally-inconsistent wall-time citation in a reconstructed log that the
committed handoff repeats, an over-strong "VERIFIED" header whose body is
honest, and one trivial fix ticketed where the brief allowed doing it — none
of which changes any conclusion this round shipped. Recommend: fix findings
1–2 as one-line edits, optionally soften the ticket 94 header, and leave the
rest to the filed tickets.

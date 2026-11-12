# Pre-merge review — fix/623-set-floor

Diffed against: main `59e48629...ee077c79` (dev = origin/dev at the start)
and fork `bf9c26a00...adf591743`. The review's own fix is main `287ef9b0`
(tickets, ADR-0037, the scope doc and three tracked scripts; no code, so no
fork change and no re-pin). Upstream footprint:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6bae2601e5ca3985431c8c1da2ab422c0 HEAD`
prints only `6	0	ui/app/SimTabsSection.tsx`, the one owner-approved
edit, and `git cat-file -e 24606be6b:<path>` fails for each of the seven
fork files the branch changes, so all are fork-added.

What the owner asked for (2026-11-12, quoted in the child plan
`.scratch/plans/tickets-672-811-623-635-2026-11-12.md` in the main
checkout): "Launch a session to handle 672, 811, 623, 635. It should oversee
them and make sure they get done but not get in the weeds itself (that's for
its subagents)". This branch fixes ticket 623 and closes ticket 635.

Reviewers, each with no part in writing the branch:

- Adversarial, standards and spec: one Opus `general-task` (the agent that
  ran this skill). It ran `pnpm verify`, checked the statistics and the four
  changed tests, scanned the six tab recordings, and wrote the fixes.
- Domain: one Opus `general-task` at effort xhigh, read-only, which also
  re-ran 635's sims at 10,000 iterations. Report:
  `.scratch/agent-reports/2026-11-12-general-task-pmr623-domain-axis.md` in
  the pair (gitignored).
- Fix check (step 3): one fresh Opus `general-task`. Report:
  `.scratch/agent-reports/2026-11-12-general-task-pmr623-fix-check.md` in the
  pair (gitignored).

## Summary

The code fix is right. Every value the tab now holds to the 3 DPS bar is one
sim minus another, and the √2 × 3 ≈ 4.24 floor is left only on the four-sim
bonus of a ranking made without the step path, which the tab never makes.
The four changed tests each assumed the √2 floor on a two-sim value, which
was the bug; none was bent to pass. No tab text becomes untrue. The branch's
new tests fail on the old fork code and pass on the new (step 3). Five
findings, all in tickets and docs, all fixed in `287ef9b0`: the 635 close
named the rotation as the one cause of the 2pc's lower price, which the
owner's set-bonus ruling rules out and its own runs contradict (D1); 635's
re-run needed gitignored scripts (D3); ADR-0037's new sentence read as if
the step credit had a gate (D2); the 623 close understated feral's bar drop
(A1); and the scope doc kept rows for both closed tickets (A2).

## Verify

Before the fixes, `node --version; pnpm -C /home/daniel/Code/lulz/tbc-wt/t623 verify; echo "rc=$?"`
at main `ee077c79`, fork `adf591743`
(log `.scratch/agent-reports/2026-11-12-pmr623-verify-1.log` in the pair):

```
v22.23.2
fork tests check ok at fork commit adf591743a29: ... (Test Files  74 passed (74); Tests  901 passed (901))
gates: 1665 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest f92803aa0113...). Nothing to re-test.
rc=0
```

After the fixes, the same command at main `287ef9b0`, fork `adf591743`, run
by the step-3 agent (log `.scratch/agent-reports/2026-11-12-pmr623-verify-2.log`):

```
v22.23.2
fork tests check ok at fork commit adf591743a29: ... (Test Files  74 passed (74); Tests  901 passed (901))
gates: 1665 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest f92803aa0113...). Nothing to re-test.
rc=0
```

The verify log also prints `engine port drift check ok: 36 ported files match
engine.md` and `fork lint check ok ... fork type-check clean`.

## Layout gate

Not re-run. The executor measured it at fork `adf591743` (verdict
`measured`, pass, 496 of 496 checks, and advanced
`data/wowsims-fork-layout.lock.json` to `f92803aa0113...` in `ee077c79`; its
report `.scratch/agent-reports/2026-11-12-general-task-623-fix.md` in the
main checkout). The review's fix touches no fork file, and verify reports the
layout source unchanged since that run.

## The statistics (question 1)

Under the doc comment's own model (independent sims with equal error σ), an
item delta is two sims, variance 2σ², and the 3 DPS bar is set against it. A
2pc prospective bonus pkg − s1 − s2 + base folds four, variance 4σ², so its
noise is √(4/2) = √2 times an item delta's; that is where √2 × 3 comes from.
Each value the branch moves to the bar is A − B for two sims, variance 2σ²,
the same as an item delta, so the bar itself is the matching floor:

| Gate                                                                             | Value                                            | Sims | Source                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ---- | ---------------------------------- |
| same-gear (`rank.ts:2475`), step eligibility (`rank.ts:3007`, `view.ts:491-501`) | on − off                                         | 2    | `set-less-copies.ts:184-187`       |
| crossing (`rank.ts:2757`)                                                        | on − off on the crossing build                   | 2    | `rank.ts:2707-2725`                |
| worn-set ladder (`rank.ts:3667`)                                                 | R(c) − R(c − 1)                                  | 2    | `set-less-copies.ts:244-255`       |
| popover gap (`set_bonus_tip.ts:212-215`)                                         | stepGear_f − stepGear_stop; the baseline cancels | 2    | `rank.ts` step sims                |
| split view `floored` (`view.ts:530`)                                             | a ladder value, or sameGearDps ÷ t               | 2    | unreachable from the tab (Note N1) |

`setBonusNoiseFloorDps` is now called once, in `walkCredit`'s flag-off branch
(`view.ts:417`; `git grep setBonusNoiseFloorDps` in the fork). The tab never
reaches it: `run.ts:128` sets `measureBrokenSetValue`, `rank.ts:1694` makes
that the step path, and a stopped run deletes every `setContext`. That
branch also floors 4pc bonuses that fold more than four sims at √2; the doc
comment already calls that deliberate, and the branch does not change it.
One caveat the triage states: the sims share a seed, so neither 3 nor 4.24 is
a measured noise bound, and the `2·se` half of `max(3, 2·se)` is the real
noise test. The fix makes the floor consistent with the owner's rough 3 DPS
cut (ADR-0037); it does not make it more accurate.

## The four changed tests (question 2)

- `fork-set-fixtures.test.ts`: `referenceStep` is the step rule written from
  the plan, `B' > max(floor, 2·se)`, and its floor followed the rule ADR-0035
  set; ticket 623 amends that rule, so the reference walk follows.
  `referenceR1` (flag-off) keeps the √2 floor. The six recordings hold no
  gated value in (3, 4.24] (my scan of `wornSetLadder`, `crossingGates`,
  `brokenSetValues` and `sameGearDps` printed none for each file), so this
  test cannot tell the two floors apart either way; 623-A and 623-C can.
- `fork-set-net.test.ts` 502-G is "a worn bonus below the gate is not a
  break". Its 2pc was worth 4, below the gate only under the √2 floor, which
  was the bug. Moving it to 2 keeps the case's premise; the figures follow by
  arithmetic: `300 + 40 + 30 − 2 = 368`, credit `368 − 100 = 268`, the same
  derivation as before with 4 replaced by 2
  (`docs/set-bonus-fixture-derivations.md` 502-G). 623-C now covers a worn
  2pc of 3.5 being counted.
- Fork `set_bonus_tip.test.ts` "within the noise": a 3.5 gap was hidden only
  under the √2 floor. It now hides a gap of exactly 3 (the gate is strict) and
  shows a 3.5 gap. Step 3 ran it against the old `set_bonus_tip.ts` and engine:
  it fails at `set_bonus_tip.test.ts:363` (`"belowNoise": true` where
  `"dps": -3.5` is expected).
- The other `fork-set-net.test.ts` cases changed only for the signature
  (`FLOOR = 5` became `{ absDps: 5 }`). Their flag-off cases now gate at
  √2 × 5 ≈ 7.07; no flag-off figure in the file sits in (5, 7.07]
  (`grep -nE 'dps: (5\.[0-9]+|6(\.[0-9]+)?|7(\.0[0-7]?)?)\b'` printed nothing).

## Findings

**D1 (medium, domain F1): the 635 close named one cause for the 2pc's lower
price.** It said: "That is upstream wowsims' deliberate rotation choice, not a
tab bug". The owner's 2026-10-02 ruling (memory
`feedback-set-bonus-value-is-worth-when-lost`) is that a bonus's two prices
come from the rest of the gear differing, and not to explain them by one
cause; it names ticket text. The note's own attribution runs contradict the
one cause: with the rotation line held fixed, the 2pc is still worth 80.5
against 105.1 (Wolfshead line) and 51.5 against 150.0 (no-Wolfshead line)
with and without the helm's effect. The triage's draft had "the 2pc's price
differs because the gear differs"; the final note dropped it. Fixed in
`287ef9b0`: the note leads with the bonus's worth on that gear, says the gap
has two measured parts, neither a bug, and renames "Why" to where the two
effects meet in the code. Its heading no longer says "the sim is right",
which the note's own "Game truth is unverified" did not support.

**D2 (low, domain F2): ADR-0037's new sentence read as if every set figure
on the tab's path had a gate.** "Every set value on its path is one sim minus
another … held to the 3 DPS bar itself" (ADR-0037, Consequences) sits beside
ADR-0035 Known limits (a), "The running total has no noise gate of its own
(C84)": the step credit `c = stepGearDps − singleDeltaDps` (`view.ts:543-545`)
counts whenever it is above 0. No player-visible effect. Fixed in `287ef9b0`:
the sentence says "every value a set gate reads", and adds that the step
credit has no gate of its own while the row's total meets the 3 DPS bar
(`belowCutoffUnderView`). The fork's `cutoff.ts` comment is left as it is: it
names the four gated figures it means, and a comment-only edit there costs a
fork commit, a re-pin and a layout run for no behaviour.

**D3 (low, domain F3): 635's re-run could not be followed from the note.**
It said to build the requests "from the feral page's `p2_6p` request", but
there is no such request; `make_requests.py` writes the buffs, talents,
target, gems and bonus stats out by hand, and the three scripts were only in
the main checkout's gitignored `.scratch/agent-reports/`, with no arguments
given. Fixed in `287ef9b0`: the scripts are tracked as
`.scratch/carry-forward/notes/635-{make_requests,summarize,make_attribution}.py`
(the repo's place for ticket scripts), and the note gives the exact
commands. Step 3 ran the block as written at 10,000 iterations, every step
rc 0, and got the note's figures.

**A1 (low): the 623 close understated feral's bar drop.** It said 2·se "is
about 3.8 to 4.5 DPS for feral … so the bar drops by at most about 0.4".
In the six recordings the feral two-sim se runs 1.81 to 2.23 (my scan; step 3
got 1.814 to 2.231), so 2·se starts at 3.62 and the bar drops by up to 0.62.
Fixed in `287ef9b0`: the note gives the se ranges, the 0.6 figure, that the
popover gap's 2·se (two se in quadrature, at least 5.41 in the recordings)
stays above 4.24 at 3000 iterations, and that a player who raises the
iteration count sees the bar decide more often.

**A2 (low): the scope doc kept rows for the two tickets the branch closed.**
`docs/upgrades-tab-scope.md` § Maintenance says the doc changes in the same
commit as any ticket's `Status:` line; its STALE loop printed
`STALE 623 (closed)` and `STALE 635 (closed)` at `ee077c79`. Fixed in
`287ef9b0`: both rows removed, item 12 points at the close, and judgment
call 15 says what each close found. Both loops now print nothing. 672's and
811's branches also add a call 15; whichever lands second renumbers (the
child plan's merge-order note).

**S1 (low, standards): `FLOOR` and `floor` in `fork-set-net.test.ts` now
hold a `Cutoff`.** Wontfix: the constant's doc comment says it is the cutoff
and which floor each path derives from it, and renaming about 80 call sites
in a test adds diff noise for no behaviour.

## The 635 close (question 4)

Every code line the note cites holds at fork `adf591743` (domain axis, by
`git show adf591743:<path>`; I read `rotation.go:11,52,189,264-273`,
`items.go:212-231`, `item_sets.go:224-235` and `default.apl.json:54`
myself). `rotation.go:266-272` started one line early (266 is a closing
brace); `287ef9b0` cites `:267-273`. `git diff --stat bf9c26a00 adf591743 --
sim proto cmd ui/specs` prints nothing, so the engine the triage measured is
the one at the pin. The re-run at 10,000 iterations, seed 635, on fork
`adf591743` (my run with the tracked scripts, then step 3's run of the
note's block):

| Rotation        | Wolfshead effect | 2pc worth, 10k | Note, 100k  |
| --------------- | ---------------- | -------------- | ----------- |
| Default APL     | on               | 81.2 ± 1.1     | 80.5 ± 0.4  |
| Default APL     | off              | 149.6 ± 1.1    | 150.0 ± 0.4 |
| Simple rotation | on               | 48.9 ± 1.1     | 49.8 ± 0.3  |
| Simple rotation | off              | 155.2 ± 1.0    | 154.6 ± 0.3 |

The two flipped default-APL lines gave 2123.2 and 2386.9 against the note's
2124.4 and 2387.5. All agree within about 1 SE. The runs share seed 635 with
the triage's, so this shows the recipe reproduces; it is not an independent
replication.

## Tab text (question 3)

No player-facing string names 4.24, a floor or the cutoff; the popover's
noise label says only "too small" (`utils/set_bonus_labels.ts:115`). The
domain axis checked five states and found no untrue string: a worn bonus
between 3 and 4.24 now counted and charged ("Breaks {set} {n}pc" and the
balancing "Item stats" line); a step past the stop with a gap in that band
now shown with a signed figure, which under best-stop is never above the
stop; a future in that band now an eligible stop rather than a "too small"
line (rank-time `belowGate` and the view's `stepEligible` use the same gate
on the same `Cutoff`); a row that now leaves the below-cutoff group, which
needs `deltaDps + credit ≥ 3`, matching the group's "gain less than 3 DPS";
and an old saved ranking made at 4.24, which renders as before because
`stepEligible` reads its stored `belowGate` first. No figure is explained by
a cause in any of them.

## Check the fixes

Step 3 ran once, by a fresh agent, on main `287ef9b0`, fork `adf591743`:

- Scope loops: at `287ef9b0` both print nothing; the STALE loop over the
  `ee077c79` copy prints `STALE 623 (closed)` and `STALE 635 (closed)`.
- The branch's new tests, with the six changed fork source files written
  back to their `bf9c26a00` text: `vitest run packages/core/test/fork-set-net.test.ts -t "623"`
  printed `Tests 2 failed | 1 passed | 117 skipped` (623-A
  `expected [ [ 2, false ], [ 1, true ] ] to deeply equal [ [ 1, false ], [ 2, false ] ]`,
  623-C `expected false to be true`; 623-B, the flag-off guard, passes), and
  the fork's `set_bonus_tip.test.ts -t "within the noise"` failed at line 363. Restored with `git checkout HEAD -- <six paths>` (fork status empty),
  the same commands printed `Tests 3 passed | 117 skipped` and
  `Tests 3 passed | 31 skipped`, rc 0.
- The 635 re-run block as written, at 10,000 iterations: the figures above,
  every step rc 0, nothing missing from the note.
- The 623 figures: feral two-sim se 1.814 to 2.231, ret 3.156 to 3.282;
  smallest popover-gap 2·hypot 5.41.
- `pnpm verify`: rc 0 (above).

## Notes

- **N1:** the split view floors `sameGearDps / t` at the bar, though that
  share's noise is se/t; the flag-off branch does the same at √2 × the bar.
  The tab never asks for the split view (`results_view.ts:244` passes no
  `setCredit`; `results_view.ts:261` and `set_bonus_tip.ts:301` use
  `'full'`).
- **N2:** the rank-time call sites (same-gear `rank.ts:2475`, crossing
  `:2757`, step eligibility `:3007`) have no test of their own at a value in
  (3, 4.24]. They share `clearsSameGearGate`, which 623-A and 623-C test, and
  pass the one `cutoff` (`rank.ts:781`); passing the √2 number is a type
  error, and verify runs the fork type-check.
- **N3:** no `ENGINE_VERSION` bump. The tab keeps its ranking cache in memory
  for one mounted tab (`content-hash.ts:49-55`), and an old saved ranking
  renders as before (question 3).
- **N4 (domain):** a K6B "Breaks" line is `offDps − prevTotal` with no gate,
  so with more bonuses counted it may a little more often show near 0 or with
  the wrong sign (hypothesis, untested). Predates this branch.
- **N5:** the item bar is `deltaDps >= absDps` (`cutoff.ts` `meetsCutoff`)
  and the set gate is strict (`>`). Predates this branch.
- **N6 (question 5):** row D2 of `docs/reviews/feat-flat-cutoff.md` still
  says `defer` to 623. It needs no note. Merged review files record the call
  made then and the ticket records what happened: 133 of the 280 `defer` rows
  in `docs/reviews/` link a closed ticket (a scan of every Disposition row),
  and `merge-ready` reads only the branch's own review
  (`scripts/check_merge_ready.py`, `review_path`). Ticket 623's `Origin:` line
  points back to that review.
- **N7:** `docs/set-bonus-fixture-derivations.md` 502-G still says, of the
  case before ticket 512, "which gives the same 266". It is history of the
  4-valued case; cosmetic.
- **N8 (merge order):** the lock names fork `adf591743`, one commit past
  `bf9c26a00`, the tip of the lock's branch `feat/upgrades-tab-react` today.
  If this branch lands first, the fork merge in the main folder fast-forwards;
  after 672 or 811 it will not, and this branch merges `dev` and re-pins
  first (`docs/agents/paired-worktrees.md` § Land it on dev; the child plan's
  § Branches).
- **Modes:** the change is where the step path meets the flag-off path. The
  pairs are step or flag-off ranking, and a gated value at most 3, in
  (3, 4.24], or above 4.24. 623-A covers step and in-band through the view,
  623-C step and in-band through the ladder, 623-B flag-off and in-band; the
  outer bands were covered before.
- Nothing on the branch goes beyond what the tickets asked for. The layout
  lock advance is the layout gate's own output.
- `pnpm merge-ready` warns that three open tickets name a file this branch
  changed. None bears on it: 519 (a question about Thunderheart Cover
  figures) cites `fork-set-fixtures.test.ts` as a check, 563 (Stop aborting
  sims) cites `fork-set-net.test.ts` as a pattern, and 795 (verify under
  load) cites its run time.
- **Unexamined:** the body of the 554 KB `data/wowsims-fork.lock.json` diff
  (only the `commit` change and the appended `_comment` sentence, by
  `--word-diff`); the NerdEgghead quote at commit 59cc8576 (the domain axis
  matched the triage's local copy; no one re-fetched it).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                               |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Domain      | fixed       | 635 close leads with the bonus's worth on that gear and gives the gap's two measured parts (`287ef9b0`)                                     |
| D2  | Domain      | fixed       | ADR-0037 sentence scoped to the values a set gate reads; names the step credit's missing gate (`287ef9b0`); fork comment left, reason above |
| D3  | Domain      | fixed       | 635 scripts tracked under `.scratch/carry-forward/notes/635-*.py`, exact commands in the note; step 3 ran them as written (`287ef9b0`)      |
| A1  | Adversarial | fixed       | 623 close gives the recordings' se ranges and a drop of up to 0.6 DPS for feral (`287ef9b0`); step 3's scan matches                         |
| A2  | Adversarial | fixed       | scope rows for 623 and 635 removed, call 15 added; both Maintenance loops print nothing (`287ef9b0`)                                        |
| S1  | Standards   | wontfix     | `FLOOR` holds a `Cutoff`; its doc comment says so, and renaming about 80 test call sites adds noise for no behaviour                        |

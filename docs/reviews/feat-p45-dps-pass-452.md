# Pre-merge review — feat/p45-dps-pass-452

Reviewed range: `cf8e37a176f4aa0cb45e4a036567483e1bf2b4b7..e4956a638aaf780907b00068c39463d0774a24ae`

Dispatch note, round 1:

- Requested by the dispatching session on 2026-11-03. The tree was clean at
  dispatch and the tip was `e4956a63` (`git status --short` empty,
  `git log -1`). The fork is detached at `13a980cf3` and this branch does
  not move the fork pin.
- Tooling check: `python scripts/check_merge_ready.py --product-files`
  printed the four handoffs under `.scratch/handoffs/` and
  `docs/live-runs/2026-11-03-p45-dps-pass.md` (rc 0). The other changed
  files are tickets under `.scratch/carry-forward/issues/` (in
  `TOOLING_PATHS`): new tickets 750-753, dated entries on 309, 452, 523,
  620, 641, and `NEXT`. The branch is mixed. The axes got the whole diff,
  not only the five product files, because the ticket text restates the
  report's claims and the claims had to be checked in both places.
  `instruction-review` ran on the ticket files (§ Instruction review).
- Lane: `git diff --shortstat cf8e37a1...e4956a63` gives 15 files, 854
  insertions, 1 deletion, so this is not a small change; full axes ran. The
  domain axis ran: the diff is game-domain content (TBC item, set and class
  facts, wowsims presets and engine lines).
- Models: `codex` is not on `PATH`. Four fresh `general-task` agents on
  Opus were sent in one batch (adversarial, domain, code-review Standards,
  code-review Spec). Three of them stopped on HTTP 429 rate limits; the
  Standards result is from that batch. Adversarial, domain and Spec were
  then run again one at a time on the same review lane, with the same
  briefs. Each axis was told it writes nothing.

## Adversarial

The run table, "all counted" and most numbers match the run JSON: all 22
JSONs have `done: true` and no panic, failure or timeout flag, `.wall`
rc=0, and the baseline DPS, eligible count, row count, above-cutoff count,
wall clock and start preset of each table row match (python loop over
`.scratch/agent-reports/2026-11-03-p45-runs/*-p[45].json`, main checkout).
The 6 `trust` / 16 `trust-with-caveats` split matches the four handoffs.

- **A1 (wrong result in the report).** `docs/live-runs/2026-11-03-p45-dps-pass.md:8-10`:
  "the items that preset adds show as gains, with one known exception:
  at phase 5, single swaps that break a worn 4-piece set". The run data has
  other preset items that show as losses or have no row: feralcat p5
  Thunderheart Waistguard -24.9 and Cursed Vision of Sargeras -60.8 (the
  handoff gives lost expertise and Wolfshead Helm, not a set break,
  `sme-rank-judgment-452-p5-physical.md:66-67`); enhancement p5 Hand of the
  Deceiver -18.3, Mounting Vengeance -33.1, Skyshatter Pauldrons -9.9 (the
  report's own line 175 lists the two weapons as losses); warlock p4 Carved
  Witch Doctor's Stick -2; hunter p4 Shadowmoon Destroyer's Drape -0.5;
  balance, elemental and warlock p5 Sunflare and Heart of the Pit have no
  row because one-handers are held out. The report's ticket-309 row (line 156) is another exception. Same overstatement at
  `sme-rank-judgment-452-p5-physical.md:10`. Fix: list the exceptions in
  the Verdict, or say "most".
- **A2 (wrong result in a ticket and the report).** Ticket 641's 2026-11-03
  entry, report line 159 and `p5-physical.md:23` (K1) say The 2 Ring is
  offered "on all six physical DPS tabs at phases 4 and 5". It has one row
  in each of the 22 runs, casters included (checked by the dispatcher:
  name count over the 22 JSONs, 1 each). Ticket 641:13-15 dates the ring
  to patch 2.4.0, and this repo's P5 is Sunwell (`CONTEXT.md:44`). If
  Sunwell came with patch 2.4 (recalled, unverified), phase 5 is the
  ring's real phase and the phase-5 rows are right by 641's own Done when;
  a fixer who follows the entry could remove a correct row.
  `p4-casters.md:55` ("No item from after phase 4 appears") is wrong by
  641's own source. Fix: "offered at phase 4 on all 11 tabs; whether phase
  5 is its real phase is for 641 to settle", and correct p4-casters:55.
- **A3 (wrong count).** Report line 171 and `p4-physical.md:12,85`: "32 of
  41 rows at phase 4", range "+13 to +192". 34 of the 41 rows above the
  cutoff in hunter-p4 are two-handers (db.json `handType` 4), from +12.5 to
  +192 (checked by the dispatcher: db.json join over hunter-p4 rows with
  `belowCutoff` false). Fix: 34, +12.5.
- **A4.** Bullet 2 of the epic judged in part. Same finding as P1; disposed
  there.
- **A5.** Bulwark of Kings placed on the feral tab. Same finding as D7.
- **A6.** Ticket 523 slot list. Same finding as D3.
- **A7.** Ticket 751 warlock "no row". Same finding as D6.
- **A8 (wrong count).** `p4-physical.md:23`: three Band of Eternity rows
  "and 7 more rows"; every run has 12 Band of Eternity rows, so 9 more.
- **A9 (bookkeeping).** Report lines 20 and 92 cite
  `.scratch/stage-gate/p45-dps-pass-452/brief.md:7` and `progress.md`,
  which exist only in the main checkout (gitignored), but only the run
  folder is flagged as main-checkout-only. Suggested text: add
  "(gitignored; main checkout only)" after each.

The known slip "(same as p4-casters F6)" is not in `e4956a63`:
`git grep -n "same as p4" e4956a63 -- .scratch/handoffs/` shows
`p5-casters.md:23` citing "(same as p4-casters F5)", and every other
"same as" points at the right id.

## Domain

Every repo-data claim the axis checked holds at fork `13a980cf3`: db.json
23047 (on-use 4:450, 5:150 for 30 s, no charge field),
`stat_bonus_cds_auto_gen.go:179`, Earthstrike and Bulwark use effects and
item levels, the Fury and feralcat APL trinket lists (28485 listed;
21180, 23570, 28484, 14554 not), `character_constants.go:52`, the preset
diffs, the ADR-0038 quotes at 85-90, and the same-name pairs (2 rows each
in all 22 runs). Tickets 750, 751 and 752 each say that a change to an
existing wowsims file needs the owner's OK of that exact edit, and none
reads as an order to edit one.

- **D1.** The 2 Ring at phase 5. Same finding as A2.
- **D2.** Verdict overstated. Same finding as A1.
- **D3 (wrong result in a ticket and the report).** Ticket 523's
  2026-11-03 entry and report line 157: "the new head, chest, hand and leg
  pieces ... show as losses". Warlock p5 Sunfire Robe is +52.7, and
  Leggings of Calamity is +47.5 on balance and +41 on elemental (checked
  by the dispatcher in the p5 run JSONs). Balance's new shoulders
  (Spaulders of Devastation -60.4, `p5-casters.md:104`) are left out. Fix:
  give the losing slots per spec.
- **D4 (recalled fact stated as fact).** No "recalled, unverified" label on
  `p4-physical.md:11` and `p5-physical.md:12` ("axes, which a TBC rogue
  cannot equip"), `p4-casters.md:8` ("whose value is mostly party-wide"),
  `p4-casters.md:19` and `p5-casters.md:19` ("A caster who knows the game
  ranks Icon ... above Eye"). The same facts are labelled in the F rows.
  Fix: add the label on each line.
- **D5 (wrong source).** Ticket 753:30-32 (and `p4-casters.md:22`) gives
  db.json as the source of "a melee and a caster version" of Mark of the
  Champion. db.json gives both only as "Champion of the Dawn" (29112, 29113) with no stats; the split is in the engine,
  `sim/common/tbc/items_trinkets.go:737` (+150 AP vs Undead and Demons) and
  `:760` (+85 spell damage). Fix: cite those lines.
- **D6 (wrong cell, misquoted JSON).** Ticket 751:28 gives warlock p4 Icon
  of the Silver Crescent as "no row"; the start preset wears it
  (`ui/specs/warlock/dps/gear_sets/t6.gear.json`, slot 13), so it is
  "worn", as the shadow row says. Lines 33-34 print a flattened JSON that
  is not db.json's form (the stats sit under `scalingOptions."0"`, with a
  120000 ms cooldown). Fix: "worn", and quote the real path.
- **D7 (wrong title).** Ticket 750's title and report line 147 put Bulwark
  of Kings on the feral cat tab. It is plate and has rows only in the ret
  and warrior runs (checked by the dispatcher: name count, 1 row each in
  ret-p4/p5 and warrior-p4/p5, 0 elsewhere). The rows also show values
  (-50.4, -94.8); what is missing is the use effect's value. Fix: "Earthstrike
  and Jom Gabbar (feral cat, Fury) and Bulwark of Kings (Fury) get no value
  from their use effects".

## Standards + Spec

### Standards

- **S1 (bookkeeping).** Three commit subjects pass 50 characters:
  `fd4d52f0` (54), `1a6b3021` (52), `1717acdd` (52) (`git log --format=%s
cf8e37a1..e4956a63 | awk '{print length}'`).
- **S2 (code quality).** The word "carries"/"carry", on the global
  plain-English list, at `p4-physical.md:31` and `p5-physical.md:26,33,70`.
- **S3 (other).** Two harness limits found by the pass have no ticket:
  the tracked `run-tab-cdp.mjs` cannot load a preset on pages with no phase
  tabs, and it loads the first gear set of a repeated name, so Survival and
  Arms were not run (report lines 31-36, 47-49). Same as P3.
- **S4 (other).** Re-running 6 of 11 specs needs the patched harness and
  `run-one.sh` in the gitignored run folder, main checkout only.
- **S5.** Report Verdict contradicts the report's 309 row. Same as A1.
- **S6 (code quality).** The report's "Known defects" rows (156-159) are
  restated almost word for word in the 309, 523, 620 and 641 entries; A2
  and D3 are wrong in both copies.
- **S7.** Ticket 750's title. Same as D7.
- **S8 (bookkeeping).** Ticket 753 states "a name count over each file's
  `rows`" with no command to re-run.
- **S9 (code quality).** In 750-753 the `Serves:` line comes second,
  before `Type:`; tickets 745-749 put it after `Origin:`.
- **S10 (bookkeeping).** The epic note sits under `## Notes`, where
  `docs/agents/issue-tracker.md` § Conventions says notes go under
  `## Comments`.

Checked, no finding: `NEXT` moves with each new ticket (750→754);
tickets 750-753 have no map line, which `known-traps.md` § Before filing a
ticket requires only for review-born tickets.

### Spec

Spec: `.scratch/stage-gate/p45-dps-pass-452/brief.md` and `plan.md`
(revision 5), from the owner's words of 2026-11-02 "continue from there:
the three remaining tab items ... (phase 4/5 pass over all DPS specs for
epic 452 ...)". The runs, the four SME seats, the ticket filing and the
epic note match them; no scope creep (15 files, all in the plan's paths).
Every handoff finding rated `new` has a ticket and every `matches ticket`
finding has a dated entry.

- **P1 (wrong conclusion offered to the owner).** The epic at the merge
  base (`git show cf8e37a1:<452 path>`, lines 54-57) asks under bullet 2
  for "golden coverage across representative specs (melee + caster +
  hybrid), the a11y/layout/visual harness able to scan more than one spec
  page, EP-presets and universe/sim-effects pipeline validated per spec".
  The report's § For epic 452 item 2 covers the mock fixtures and the one
  ret golden, not the EP-presets or the pipeline part. Q-452-golden says
  "If yes, bullet (b) is met by the mock fixtures", which is not true while
  the pipeline part is unjudged, and "If no, 452 also needs a caster
  golden" leaves out hybrid. The plan's C28 shortened the bullet. Fix:
  quote the whole bullet, mark the unjudged parts, and word the question
  so neither answer claims more than it settles.
- **P2 (spec gap).** brief.md Done means asks for "the coverage bar,
  which parts are met, and what is left". Item 3 says "six of the 11
  specs" without naming the five left (balance, shadow, elemental,
  warlock, enhancement); item 1 says "met by this pass's spec list" without
  saying Survival and Arms were not run (allowed by plan § Out of scope,
  C22, and stated only in § Setup).
- **P3 (other).** Harness limits with no ticket: same as S3. The SME also
  noted that the JSON `rank` field is a string that restarts at 1 per
  table, and that `sample` stops after "Showing" so the notice lines
  cannot be read.
- **P4 (bookkeeping).** Q-452-golden says "bullet (b)"; the report numbers
  the bullets 1-4 and says "for bullet 2".
- **P5.** The "(same as p4-casters F6)" slip. Checked by the dispatcher:
  not present at `e4956a63` (see the end of § Adversarial).

### Instruction review (ticket files)

Path: full for the four new tickets (new files), light for the five dated
entries (added evidence, no rule). One cold reader, a fresh Opus
`general-task` given only the role "assigned these tickets" and the file
paths, read all nine (one reader, not one per file, because of the rate
limit wall above). Its dry run took every action as meant: it checks the
APL guess before acting, takes 750's two options to the owner, makes no
wowsims edit without the owner's OK of the exact edit (750, 751, 752),
looks for a primary source before acting on 751 and 752, and reads the
five dated entries as evidence with no task. Check 2: the tickets agree
with `docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:85-90`
(quoted correctly, per the domain axis) and the repo's rule against
wowsims file edits. Check 3: no trial run applies; the tickets change no
agent rule and have no earlier text to compare.

- **IR1 (bookkeeping).** Ticket 750 lists Cloudkeeper Legplates at -138.1
  but its Done when names only three items; the reader could not tell
  whether Cloudkeeper is in scope. Suggested text: say in Done when whether
  it is.

## Code quality

| ID  | Row                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2  | Replace "carries"/"carry" in `p4-physical.md:31` and `p5-physical.md:26,33,70` with plain words ("has", "keeps").                                                                         |
| S6  | After the A2 and D3 fixes, keep each 2026-11-03 entry on 309, 523, 620 and 641 to the observation and a pointer to its row in the report and handoff, so the report is the one full copy. |
| S9  | Put `Serves:` after `Origin:` in tickets 750-753, as in 745-749.                                                                                                                          |

## Summary

Round 1 found no defect in the runs: all 22 completed and the run table
matches the JSON. It found wrong statements in the report, handoffs and
tickets that a reader would act on, and these block the merge until fixed
(they are wrong outputs with no warning): A1, A2, A3, A8, D3, D4, D5, D6,
D7 and P1. P2 is a spec gap this branch introduced and also blocks the
merge unless the owner allows a deferral. Bookkeeping still open, with
suggested text: A9, S8, P4, IR1. Code quality: S2, S6, S9 go to one
code-quality pass. The fixes touch `docs/live-runs/`, `.scratch/handoffs/`
and tickets 523, 641, 750, 751, 753; this review edited none of them, so
the report and its ticket copies change in one fix commit. Then round 2
(focused check) runs from `e4956a63`.

Filed during this review: ticket 754 (harness limits, S3/P3), with its map
line.

Merge with `feat/620-item-level`: that branch closes ticket 620 and rewrites
its body (Status `closed`, a `Verified by:` line, `## Owner rulings`,
`## Closing note`; no `## Comments` heading), and this branch appends a
`## Comments` heading and one entry. Resolve 620 by taking the other
branch's whole text and appending this branch's `## Comments` section and
entry after it, with "on fork `13a980cf3`, before the item-level line
(tbc-new-fork@594d07f66)" added to the entry, because the runs predate the
"ILvl N" line (`git -C vendor/tbc-new-fork merge-base --is-ancestor
13a980cf3 594d07f66` exits 0). `NEXT` also conflicts (this branch 755,
that branch 796): take 796. `map.md`: keep both branches' new lines.
Ticket 753 stays valid after that merge: each same-name pair shares one
item level in db.json (23206 and 23207 both 90; 28377-28380 all 123), so
the ILvl line does not tell them apart.

Tickets: filed 5, closed 0 (counted with the step 3 commands after the
review commit). Filed is higher than closed because this branch is a
findings pass: it records what 22 runs showed and closes nothing.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4  | Adversarial | wontfix     | Same finding as P1; tracked there.                                                                                                                                                                                                                                                       |
| A5  | Adversarial | wontfix     | Same finding as D7; tracked there.                                                                                                                                                                                                                                                       |
| A6  | Adversarial | wontfix     | Same finding as D3; tracked there.                                                                                                                                                                                                                                                       |
| A7  | Adversarial | wontfix     | Same finding as D6; tracked there.                                                                                                                                                                                                                                                       |
| D1  | Domain      | wontfix     | Same finding as A2; tracked there.                                                                                                                                                                                                                                                       |
| D2  | Domain      | wontfix     | Same finding as A1; tracked there.                                                                                                                                                                                                                                                       |
| S1  | Standards   | wontfix     | Bookkeeping: rewording the subjects rewrites the reviewed shas and breaks the `Reviewed range:` chain, for subject length alone.                                                                                                                                                         |
| S3  | Standards   | defer       | .scratch/carry-forward/issues/754-tab-harness-cannot-load-presets-on-six-spec-pages.md — from before this branch; the pass found it.                                                                                                                                                     |
| S4  | Standards   | wontfix     | The plan put the patched copy in the gitignored run folder (plan § Out of scope), the report says the folder is main-checkout-only, and the cause is ticket 754.                                                                                                                         |
| S5  | Standards   | wontfix     | Same finding as A1; tracked there.                                                                                                                                                                                                                                                       |
| S7  | Standards   | wontfix     | Same finding as D7; tracked there.                                                                                                                                                                                                                                                       |
| S10 | Standards   | wontfix     | Bookkeeping: the epic's earlier dated notes are under `## Notes`; the new note follows the file.                                                                                                                                                                                         |
| P3  | Spec        | defer       | .scratch/carry-forward/issues/754-tab-harness-cannot-load-presets-on-six-spec-pages.md — preset-loading part. `rank` is the on-screen text of each table by design (`run-tab-cdp.mjs:438`) and `sample` is the first 700 characters of the page by design (`:469`); neither is a defect. |
| P5  | Spec        | wontfix     | Not present: `p5-casters.md:23` at `e4956a63` cites "(same as p4-casters F5)" (`git grep -n "same as p4" e4956a63 -- .scratch/handoffs/`).                                                                                                                                               |

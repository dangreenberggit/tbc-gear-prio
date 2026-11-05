# Pre-merge review — feat/p45-dps-pass-452

Reviewed range: `cf8e37a176f4aa0cb45e4a036567483e1bf2b4b7..e4956a638aaf780907b00068c39463d0774a24ae`

Reviewed range: `e4956a638aaf780907b00068c39463d0774a24ae..b2d864cffd2daca5463b3fb98123c3a48e881f7b`

Reviewed range: `b2d864cffd2daca5463b3fb98123c3a48e881f7b..5a00aa3aa7f81a58d64c06def86a9cae4163b5bb`

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

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4  | Adversarial        | wontfix     | Same finding as P1; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A5  | Adversarial        | wontfix     | Same finding as D7; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A6  | Adversarial        | wontfix     | Same finding as D3; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A7  | Adversarial        | wontfix     | Same finding as D6; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D1  | Domain             | wontfix     | Same finding as A2; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D2  | Domain             | wontfix     | Same finding as A1; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S1  | Standards          | wontfix     | Bookkeeping: rewording the subjects rewrites the reviewed shas and breaks the `Reviewed range:` chain, for subject length alone.                                                                                                                                                                                                                                                                                                                                                   |
| S3  | Standards          | defer       | .scratch/carry-forward/issues/754-tab-harness-cannot-load-presets-on-six-spec-pages.md — from before this branch; the pass found it.                                                                                                                                                                                                                                                                                                                                               |
| S4  | Standards          | wontfix     | The plan put the patched copy in the gitignored run folder (plan § Out of scope), the report says the folder is main-checkout-only, and the cause is ticket 754.                                                                                                                                                                                                                                                                                                                   |
| S5  | Standards          | wontfix     | Same finding as A1; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S7  | Standards          | wontfix     | Same finding as D7; tracked there.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S10 | Standards          | wontfix     | Bookkeeping: the epic's earlier dated notes are under `## Notes`; the new note follows the file.                                                                                                                                                                                                                                                                                                                                                                                   |
| P3  | Spec               | defer       | .scratch/carry-forward/issues/754-tab-harness-cannot-load-presets-on-six-spec-pages.md — preset-loading part. `rank` is the on-screen text of each table by design (`run-tab-cdp.mjs:438`) and `sample` is the first 700 characters of the page by design (`:469`); neither is a defect.                                                                                                                                                                                           |
| P5  | Spec               | wontfix     | Not present: `p5-casters.md:23` at `e4956a63` cites "(same as p4-casters F5)" (`git grep -n "same as p4" e4956a63 -- .scratch/handoffs/`).                                                                                                                                                                                                                                                                                                                                         |
| A3  | Adversarial        | fixed       | 58f6ff47, 82904825: 34 of 41 at phase 4, +12.5 to +192 (db.json `handType` 4 join over hunter-p4 rows with `belowCutoff` false), in the report and `p4-physical.md` Verdict and Caveats.                                                                                                                                                                                                                                                                                           |
| A8  | Adversarial        | fixed       | 82904825: "and 9 more rows" (12 Band of Eternity rows in each of the 22 runs).                                                                                                                                                                                                                                                                                                                                                                                                     |
| A9  | Adversarial        | fixed       | 58f6ff47: "(gitignored; main checkout only)" after the `brief.md:7` and `progress.md` paths.                                                                                                                                                                                                                                                                                                                                                                                       |
| D4  | Domain             | fixed       | 82904825: "recalled, unverified" added on `p4-physical.md:11`, `p5-physical.md:12`, `p4-casters.md:8`, `p4-casters.md:19` and `p5-casters.md:19`.                                                                                                                                                                                                                                                                                                                                  |
| D5  | Domain             | fixed       | 6fda899d, 82904825: ticket 753 and `p4-casters.md` F5 say db.json gives both items only "Champion of the Dawn" and no stats, and cite `sim/common/tbc/items_trinkets.go:737-738` (+150 AP vs Undead and Demons) and `:760-761` (+85 spell damage).                                                                                                                                                                                                                                 |
| D6  | Domain             | fixed       | 6fda899d: warlock p4 Icon is "worn" (`t6.gear.json` slot 13 is 29370); the db.json quote gives `effectDurationMs`, `scalingOptions."0".stats` and `onUse.cooldownMs` 120000 as db.json stores them.                                                                                                                                                                                                                                                                                |
| D7  | Domain             | fixed       | 6fda899d, 58f6ff47: ticket 750's title is the review's text; the body and report row 750 say Bulwark of Kings is plate with rows only on ret and warrior (name count over the 22 runs).                                                                                                                                                                                                                                                                                            |
| P1  | Spec               | fixed       | 58f6ff47, efd400b5: report § For epic 452 quotes each bullet whole and splits it into met, not met and left; Q-452-golden now says either answer leaves the harness, EP-preset and pipeline parts of bullet 2 open, and that "no" needs melee, caster and hybrid goldens.                                                                                                                                                                                                          |
| P2  | Spec               | fixed       | 58f6ff47: item 1 names Survival and Arms as not run (ticket 754). For item 3 the source disagrees with the review's "six of 11": the axe scan reaches only the ret tab before a run and the warrior `mock-set-bonus` page after one (`scripts/tab-harness/test-layout.mjs:39-40`, `:504-526`). Item 3 now names the five specs with no fixture (balance, shadow, elemental, warlock, enhancement) and the four whose fixture page axe does not reach (mage, feral, rogue, hunter). |
| P4  | Spec               | fixed       | 58f6ff47: Q-452-golden says "bullet 2".                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| IR1 | Instruction review | fixed       | 6fda899d: Done when names Cloudkeeper Legplates as in scope on the Fury tab; 14554 is on neither rotation's item list (`grep -o '"itemId": *[0-9]*'`).                                                                                                                                                                                                                                                                                                                             |
| S2  | Standards          | fixed       | 82904825: "carry"/"carries" replaced with "have"/"has" at the four lines.                                                                                                                                                                                                                                                                                                                                                                                                          |
| S6  | Standards          | fixed       | efd400b5: each 2026-11-03 entry on 309, 523, 620 and 641 keeps a one-line observation and points at its row in the report and its handoff finding.                                                                                                                                                                                                                                                                                                                                 |
| S8  | Standards          | fixed       | 6fda899d: ticket 753 gives the `python3 -I` name-count command; each of the 22 lines prints `[2, 2, 2]`, so "two or more" is now "exactly two".                                                                                                                                                                                                                                                                                                                                    |
| S9  | Standards          | fixed       | 6fda899d: `Serves:` after `Origin:` in tickets 750-753.                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Focused check (round 2)

Range: `e4956a63..b2d864cf`. Other repo: none; the fork pin does not move
(`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0),
so the fork condition holds. Dispatch note, round 2: run on 2026-11-05
after `dev` moved to `6a4e0f33`; the dispatcher re-read the
`pre-merge-review` skill, which is the same file as dev's
`docs/agents/home/skills/pre-merge-review/SKILL.md` (`diff` prints
nothing). One fresh Opus `general-task`, told it writes nothing; a first
attempt stopped on an HTTP 429 rate limit. The dispatcher re-checked each
finding below against the run JSON itself.

Conditions before dispatch: every commit is a fix that names finding IDs
in its message (58f6ff47, 82904825, 6fda899d, efd400b5), the review
commit 51c4d359 (review file, ticket 754 and its `NEXT` and map line), or
b2d864cf (review file only). The code-quality rows S2, S6 and S9 were
fixed inside those fix commits, which name them, not in a separate pass.
Every changed line is under `docs/` or `.scratch/`.

Results of the four checks:

1. Conditions 1 to 3 hold: **pass**.
2. The fix commits change only what each finding asks for: **pass** for
   scope. The three places where the fixer went past the round-1 text
   hold against the data (checked by the dispatcher with a slot-by-slot
   preset diff joined to the run rows): feralcat p5 Clutch of Demise
   -10.1, Gloves of Immortal Dusk -17.3 and warlock p5 Loop of Forged
   Power -4.5 are losses; feralcat p5 chest, hands and legs replace worn
   Thunderheart pieces; the balance and elemental P5 leg pieces are
   Breeches of Natural Aggression +26 and Chain Links of the Tumultuous
   Storm +41.3; axe runs only on the ret page before a run and on the
   warrior `mock-set-bonus` fixture after one
   (`scripts/tab-harness/test-layout.mjs:39-40`, `:504-526`).
3. Each new test asserts its finding: no tests on this branch. In place
   of tests, each fixed text was checked against the data. **Fail**: two
   fixed statements are still wrong (R2-2, R2-3), and one fix is missing
   in two lines (R2-4).
4. The tests the fixes touch pass: none.

Findings:

- **R2-1 (raised, not a defect).** The checker said
  `p5-physical.md:10` "8 of the 14 items ... are gains above the cutoff"
  should be 7, with Thunderheart Treads +3.4 below the cutoff.
  Re-checked by the dispatcher: feralcat-p5.json has Thunderheart Treads
  `Feet`, 3.4, `belowCutoff` false; all 8 gains among the 14 changed
  slots of `p4_6p` → `p5` are above the cutoff. The text is right.
- **R2-2 (wrong statement).** `docs/live-runs/2026-11-03-p45-dps-pass.md:183`,
  row 523: "New pieces for other slots are gains, for example warlock
  Sunfire Robe +52.7." Feralcat p5 Cursed Vision of Sargeras -60.8,
  Thunderheart Waistguard -24.9, Clutch of Demise -10.1 and warlock p5
  Loop of Forged Power -4.5 are new pieces for other slots and are
  losses; the report's own Verdict lists them. Checked by the dispatcher
  in feralcat-p5.json and warlock-p5.json. Suggested text: "Most new
  pieces for other slots are gains (for example warlock Sunfire Robe
  +52.7); the exceptions are in § Verdict." This leaves D3 open.
- **R2-3 (incomplete list given as complete).** Report § Verdict
  introduces the list with "The exceptions, found by diffing each start
  preset slot by slot against the next preset". wowsims'
  `hunter/dps/gear_sets/phase_4/bm/dw_6p.gear.json` (the hunter p4
  comparison preset) wears Dagger of Bad Mojo (33389) in slots 14 and 15;
  hunter-p4.json has one row for it (`36 | Off Hand | 9.5`), so the
  second copy has no row, the same case as elemental p4's second Ring of
  Ancient Knowledge (ticket 309). Checked by the dispatcher. Suggested
  text: add "hunter p4's second Dagger of Bad Mojo (ticket 309)" to the
  "No row" bullet. This leaves A1 open.
- **R2-4 (fix missing; wording).** `p4-physical.md:22` and
  `p5-physical.md:23` (K1) do not say that whether phase 5 is The 2
  Ring's real phase is for ticket 641 to settle, which A2's fix asked
  for. Suggested text: append "Whether phase 5 is its real phase is for
  641 to settle." This leaves A2 open.
- **R2-5 (bookkeeping).** efd400b5 rewrites the epic 452 note, part of
  P1's fix, but its message names only A2, D3 and S6. The P1 row cites
  the commit; no change needed.

The round-1 Disposition rows for A1, A2 and D3 said `fixed`; this round
removed them, because R2-2 to R2-4 show those findings are still open.
The round-2 agent re-checked every other fixed row against the data and
found it holds (A3, A8, A9, D4, D5, D6, D7, P1, P2, P4, IR1, S2, S6, S8,
S9); the dispatcher re-checked only R2-1 to R2-3 and the three places
listed under check 2.

Round 2 is the last round (`~/.claude/AGENTS.md` § Review round limits),
and it leaves A1, A2 and D3 open, so the review stops here and step 4 is
not run as the review's proof. The dispatching session asked for
`pnpm merge-to-dev --check-only` anyway; that check reads only the
Disposition rows, so it says nothing about A1, A2 and D3.

Assessment (one fresh Opus `general-task` that neither wrote nor
reviewed the work; its view, with the sources it gave):

- Something went wrong in a small way: two of the three open findings
  are in text the round-1 fixes added. A1 offered "list the exceptions in
  the Verdict, or say 'most'"; the fixer wrote a full list, introduced as
  complete, and added a general claim to row 523. The report grew from
  242 to 320 lines (`git show e4956a63:docs/live-runs/2026-11-03-p45-dps-pass.md | wc -l`
  and `wc -l` at the tip, checked by the assessor). R2-4 is a missed edit.
- Doing less would fix it: make the Verdict list examples only, so it
  claims no completeness; delete row 523's sentence "New pieces for other
  slots are gains, for example warlock Sunfire Robe +52.7."; add the one
  missing sentence to the two K1 rows.
- A further round would settle the findings after those cuts. If the full
  list stays and only the dagger is added, a further round would probably
  find more, because checking it means diffing all 13 preset pairs again
  (the assessor's view, untested).

## Focused check (round 3)

Range: `b2d864cf..5a00aa3a` (8e18cf7b, the round-2 record in this file
only, and 5a00aa3a, the fix). The dispatching session started this round
under `~/.claude/AGENTS.md` § Review round limits: every open finding asked
for a wording change, so one further round runs and the review then stops
whatever it finds. No other repo range; the fork pin does not move.
Dispatch note, round 3: the dispatcher checked the three edits itself with
a direct diff, as the assessor suggested, and dispatched no fresh agent,
because the fix is three sentences in three files.

1. Conditions: **pass.** 5a00aa3a names R2-2, R2-3 and R2-4 in its
   message; 8e18cf7b edits only this file. `git diff -w --stat
8e18cf7b..5a00aa3a` shows 3 files, 6 insertions, 6 deletions; the rest
   of the commit is the table padding lint-staged rewrote in the report.
2. Scope: **pass.** Each edit is the text the round-2 section suggested:
   - R2-3: report lines 11-12 now introduce the list as "Some of the
     exceptions"; no item was added or removed.
   - R2-2: report row 523 no longer has "New pieces for other slots are
     gains, for example warlock Sunfire Robe +52.7."
   - R2-4: both K1 rows (`p4-physical.md:22`, `p5-physical.md:23`) end
     with "Whether phase 5 is its real phase is for 641 to settle."
3. Each fix against the data: **pass.** The edits remove two claims and
   add one hedge; they add no number, count or game fact. `git grep -n -i
"exceptions\|other slots are gains\|every exception" 5a00aa3a` over the
   report, the four handoffs and tickets 452 and 523 finds only the new
   "Some of the exceptions" line, so no other text still says the list is
   complete or that the other-slot pieces are gains.
4. Tests: none on this branch.

No new finding. Round 3 is the last round.

## Disposition (round 3)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                                             |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Adversarial   | fixed       | 58f6ff47, 82904825, 5a00aa3a: the Verdict lists the exceptions found, introduced as "Some of the exceptions", so it no longer claims completeness (round 2 R2-3).                                                         |
| A2   | Adversarial   | fixed       | 58f6ff47, 82904825, efd400b5, 5a00aa3a: report row 641, ticket 641's entry and both K1 rows give The 2 Ring one row in each of the 22 runs and say whether phase 5 is its real phase is for 641 to settle (round 2 R2-4). |
| D3   | Domain        | fixed       | 58f6ff47, efd400b5, 5a00aa3a: row 523 gives the losing set slots per spec, feralcat included, and no longer says the other-slot pieces are gains (round 2 R2-2).                                                          |
| R2-1 | Focused check | wontfix     | Not a defect: feralcat-p5.json has Thunderheart Treads `belowCutoff` false at +3.4, so all 8 gains are above the cutoff, as `p5-physical.md:10` says.                                                                     |
| R2-2 | Focused check | fixed       | 5a00aa3a: sentence deleted from report row 523.                                                                                                                                                                           |
| R2-3 | Focused check | fixed       | 5a00aa3a: "Some of the exceptions" at report lines 11-12.                                                                                                                                                                 |
| R2-4 | Focused check | fixed       | 5a00aa3a: sentence added to both K1 rows.                                                                                                                                                                                 |
| R2-5 | Focused check | wontfix     | Bookkeeping: efd400b5's message omits P1, which the P1 row already cites; rewording would rewrite the reviewed commits.                                                                                                   |

Tickets after the last table: filed 5, closed 0 (`git diff --name-status
dev...HEAD -- '.scratch/carry-forward/issues/*.md'` gives 5 `A` rows; the
`Status:` count command gives 0; merge base `cf8e37a1`). Filed is higher
than closed because this branch records what the 22 runs showed and closes
nothing.

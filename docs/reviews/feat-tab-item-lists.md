# Pre-merge review — feat/tab-item-lists

Reviewed range: `a283d3f58dda9c1863b1f82dbc09f915d8b3a039..3b9bb6903dc6fd89f392ee70f7c99609fcee0156`

Reviewed range: `3b9bb6903dc6fd89f392ee70f7c99609fcee0156..7e3a489f740449a981a13792a4ee5ab73ecbecc8`

Fork range (round 1): `000b7be81c75330b6742f925f39fae51f97c00e9..8cd8d1c80a0930e396159ef205aca10304ff2347` in `vendor/tbc-new-fork`, branch `feat/tab-item-lists` (dev's fork pin to this branch's pin in `data/wowsims-fork.lock.json`).

The branch applies one item-list rule set to all 11 DPS specs, generates the
tier-token maps and Sunmote pairs from AtlasLoot and the wowsims database,
admits rewards of rep factions that were not listed, admits arena gear as a
source once its season is open in the selected phase, and adds a
completeness gate over every spec and phase (tickets 500, 609-613, 642).
It was built through two stage-gate runs, `.scratch/stage-gate/tab-item-lists/`
and K2 and K4 of `.scratch/stage-gate/tab-blocking-finish/` (main checkout,
gitignored). `dev` (`a283d3f5`) is merged into the branch, so the merge-base
is `dev` itself.

**Dispatch.** Full axes. `git diff --shortstat dev...HEAD` prints
`184 files changed, 318182 insertions(+), 188057 deletions(-)`, and
`git diff --name-only dev...HEAD` lists paths under `data/`, so the
small-change lane does not apply. `codex` is not on `PATH` (`which codex`,
rc 1), so each axis ran as a fresh `general-task` subagent on Opus (review
lane), in one parallel batch: adversarial, domain, and the `code-review`
skill's Standards and Spec sub-axes, each told it writes nothing. The domain
axis ran because the diff decides which game items each spec's list holds.
The owner's rulings given to the domain and spec axes, verbatim: arena gear,
2026-10-15T21:21Z, "the "dropping arena gear"--whether it requires a rating
doesn't matter to us. only whether the user is allowing or filtering out pvp
weapons from an existing season as a source."; 2026-10-16, "Yeah sure arena
items as a source are fine. If it's good it's good, as long as it's the
season is open for the selected phase"; Empty Mug of Direbrew topping
trinket lists, "this is fine." No axis started a sim or a backend.

**Upstream-file audit (owner rule).**
`git -C vendor/tbc-new-fork diff --name-only 000b7be81..8cd8d1c80 | grep -v '^ui/features/upgrades/'`
prints nothing: every fork change in this range is under the tab's own
folder. The `docs/fork-upstream-touchpoints.md` check at the new tip,
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 8cd8d1c80`,
prints only `6 0 ui/app/SimTabsSection.tsx` (the approved edit), and
`--name-status` counts 268 A, 1 M. `5262ff38` is the merge-base of
`5262ff38` and `8cd8d1c80`.

**Verify.** `pnpm verify` in the pair at `3b9bb690` on Node 22.17.1:
rc 0, `gates: 1538 ran, 0 skipped`; the layout gate skipped because the
tab's layout source is unchanged since its last green run.

## Adversarial

No blocking defect. The axis rebuilt all 44 universes and their reports
with `scripts/assemble_universe.py` into a scratch folder at `3b9bb690`;
every file matched the committed bytes. `check_pool_completeness.py --check`,
`check_atlasloot_regen.py` (16 outputs), `sync_fork_universes.py --check`
(63 copies) and `sync_atlasloot.py --verify-local` exit 0; the pool,
pool-hardening and fork-set-fixtures vitest files pass (278 tests). Planting
a Brutal (season 4) piece in ret-p4, removing a Vengeful piece from ret-p3,
or giving it a wrong season each made the gate fail with rc 1 (scratch
copies through `--universes-dir`). Every item the nine other specs lost
against `dev` is a sourceless item below item level 100 (the intended
vanilla floor); ret and feral lost nothing.

- **A1.** `scripts/check_pool_completeness.py:427-455` checks a present
  entry only against the hard policies and the arena, token and Sunmote
  source kinds. Planted into scratch lists, each of these passed with rc 0:
  34241 (a Sunwell cloak) in ret-p2, 31056 (a mage T6 piece) in ret-p3, a
  duplicated entry, and 32323 (a raid drop) relabelled `{kind: unknown}`,
  which the player's Sources filter could then not remove. None is in
  today's lists. Ticket 610 asked only for absent items to fail, and the
  gate's docstring says a soft-policy item that is present "is allowed".
- **A2.** The gate restates the builder's Sunmote item-level rule
  (`check_pool_completeness.py:267`, `assemble_universe.py:1427`), so it
  cannot catch that rule being wrong. The rule rejects 5 helm pairs
  (34400-34404, 164 -> 159), which ship in p5 lists with source `unknown`.
- **A3.** `packages/core/test/pool-hardening.test.ts:1077` compares db.json
  set pieces with `data/two-hop/<spec>-tokens.json`, which
  `generate_tier_tokens.py:151-166` writes from the same db pieces; it
  fails only on drift that `atlasloot:regen:check` also catches.
- **A4.** `scripts/check_atlasloot_regen.py:76-81` skips the token check
  and exits 0 when `vendor/wowsims/db.json` is absent.
- **A5.** Four ticket files changed during the axis's run
  (`609`, `612`, `613`, `628`).

Unexamined: `check_desktop_tab.py`'s `CAPPED_ROWS=40` and the desktop
golden (they need a live desktop run); the real opening date of arena
season 4 (domain axis); the 44 listings and fixture recordings beyond the
byte-compare gates.

## Domain

No blocking finding. Arena weapons topping the feral lists are the faithful
result of the player's own settings: every arena row in the 6 tab fixtures
has a season whose db.json phase is at or below the fixture's phase
(feral-p2 seasons 1-2, feral-p3 1-3, feral-p5 1-4); the fork's default
`excludedSources` is `[]` (`settings_state.ts:42`) and the "PvP vendor"
source removes those rows (`view.ts:154`); upstream's own feral presets wear
32014 and 33716 (`vendor/wowsims/feral_p2_6p`, `p2_9p`, `p3_6p`, `p3_9p`
`.gear.json`). `grep` finds no Brutal row in any p2-p4 list and no Vengeful
row in any p2 list, in the main-repo universes and the fork copies. Five
tier tokens (29758, 30240, 34852, 34855, 34858) match their AtlasLoot boss
blocks, and the token-group class ids match `data/proto/common.proto:95-105`.
All 28 Sunmote pairs share a slot and armour type.

- **D1.** `scripts/check_pool_completeness.py:103-107`
  (`ARENA_SEASON_OPENS = {1: 1, 2: 2, 3: 3, 4: 5}`) states when each season
  opened and cites no source. The builder gates on db.json `phase`
  (`assemble_universe.py:2327`), and the two agree today: by season
  prefix, db.json puts S1's 119 items at phase 1, S2's 121 at 2, S3's 131
  at 3 and S4's 134 at 5.
- **D2.** `data/phase_raids.json:3` (`repFactionNote`, unchanged by the
  branch) says The Violet Eye and Keepers of Time items "already reach the
  universe by other routes". Commit `c346071c`
  (`assemble_universe.py:2459-2463`) says those items "reached no list at
  all" and admits them; Violet Eye (faction 967) items in `ret-p3.json`
  went from 0 on `dev` to 13.
- **U1-U4 (unverified).** Two Kil'jaeden Sunmote pairs (34339 -> 34405,
  34342 -> 34406) come from the same commented AtlasLoot block as the 5
  rejected heads and pass only on equal item level; the 5 rejected helms
  ship with source `unknown` (A2); Ogri'la rewards (32645-32651, db phase
  1. enter p2 lists through the new rep route, though Ogri'la was patch 2.1
     content; Band of Eternity (29298, 29302, db phase 2, also on `dev`) is in
     four specs' p2 lists. Each is a hypothesis, untested. The token class
     groups in `data/two-hop/token-groups.json` also cite no source.

Unexamined: stat and EP correctness of the newly admitted rows (SME lane);
all 44 listings row by row (spot checks only); the brief's WCL and
slot-mapping facts, which the diff does not touch.

## Standards + Spec

### Standards

- **S1 (hard).** Three commit subjects exceed 50 characters (rule 2 of
  the seven commit rules, `~/.claude/AGENTS.md`): `3b9bb690` 51,
  `f1022c37` 52, `3854d7e8` 51. Every body is 6 lines or fewer.
- **S2 (hard).** Comments cite gitignored stage-gate decisions as their
  evidence (AGENTS.md, Durable claims): `scripts/assemble_universe.py`
  ("decision N4" at `DB_PHASE_MIN_ILVL`, "K3-rep-items", "OQ-23206"),
  `packages/core/test/pool-hardening.test.ts:472,478,1228`,
  `packages/core/test/pool.test.ts`, and `scripts/check_desktop_tab.py:111-150`
  (the readback JSON files behind `CAPPED_ROWS`). `.gitignore:59` ignores
  `.scratch/stage-gate/*`. Cite the tracked tickets (613, 642) instead.
- **S3 (judgement).** `generate_tier_tokens.py` keeps `collectedDate`,
  `notes` and row order from the committed `<spec>-tokens.json`, and
  `check_atlasloot_regen.py` compares its output with that same file, so a
  hand edit to those three fields passes.
- **S4 (judgement, Duplicated Code).** `assemble_universe.py` writes the
  db-phase rule (phase <= max, quality >= `DB_PHASE_MIN_QUALITY`, item
  level >= `DB_PHASE_MIN_ILVL` or an implemented effect) twice: in the
  db-phase loop and in `in_rep_item_phase`.
- **S5 (judgement, Shotgun Surgery).** `TOKEN_SPECS` in
  `check_atlasloot_regen.py` and `toHaveLength(11)` in
  `pool-hardening.test.ts` hard-code the 11 specs, while
  `check_pool_completeness.py` reads `spec-registry.json`; a new spec's
  token file would go unchecked.
- **S6 (judgement).** Test comments hold change history
  (`fork-set-fixtures.test.ts`, 12 lines of re-record history;
  `fork-meta-repair.test.ts`; `pool.test.ts` and `pool-hardening.test.ts`,
  chains such as "288 -> 480 -> 502 -> 541"). The Comment policy says why,
  not what; history belongs in commit messages.
- **S7 (judgement).** `pool-hardening.test.ts:1125` "does not rank a
  competitive weapon last" now asserts that the last-ranked weapon swings
  below 80% of the best.
- **S8 (judgement).** In `check_pool_completeness.py`, `w = out.append`
  (Mysterious Name) and `[p for p in (DB,)]` (Speculative Generality).
- **S9 (outside the diff).** `.claude/skills/data-pipeline-work/SKILL.md:26`
  says `atlasloot:regen:check` compares "the three committed parse
  outputs"; it now compares 16 (4 parse outputs and 12 tier-token files).

Clean: no banned style word added (the three in `upgrades-tab-scope.md`
are already on `dev`); no live doc points at the deleted
`list_phase_pool.py`; the `docs/fork-provenance/data.md` claim "no existing
entry changed" held for ret-p4, feral-p5, rogue-p3 and warrior-p5 between
`3854d7e8^` and `d74d5fcc`.

### Spec

The branch does what both plans and the owner's rulings ask: arena gear is a
source the player can untick and appears only once its season is open; ret
and feral follow the same rules as the other nine specs; the completeness
gate covers all 11 specs at phases 2-5 in `pnpm verify` (`package.json:81`);
`list_phase_pool.py` is deleted. The done-when of each closed ticket (500,
609-613, 642; 640 wontfix by the owner's Mug ruling, its remainder in open
ticket 660) is met by evidence on the branch. No material scope creep: the
rep route comes from decision K3-rep-items of the tab-item-lists stage and
`P-season-closed` from the owner's 2026-10-16 ruling.

- **P1.** Ticket 613's close note, condition 2 ("lists, per phase, how
  many items ret's and feral's lists gained and lost"), left out the
  rep-reward route (`c346071c`): its figures add to ret 519/772/895/1134
  and feral 453/660/741/936, against real counts 541/794/917/1156 and
  479/686/767/962.
- **P2.** The gate reads `data/weapon-type-exclusions.json`
  (`check_pool_completeness.py:199-203`), which the builder rewrites from
  its own `SPEC_PROFILES` on every run (`assemble_universe.py:11-13,720`).
  A change to the builder's weapon rules therefore changes the gate's in
  the same regen and cannot fail it. This goes against brief Q1
  ("independent of the code that builds the item list") and the gate's own
  docstring (`:10-15`). Plan C26 listed the file as an input.
- **P3.** Ticket 609's close note says `token-groups.json` is "the only
  hand-written input", while condition 1 names a "6-row token-group ->
  classes table"; the file holds four tables (`groups` 6, `labels` 17,
  `tiers` 3, `slots` 8), each explained in its `note`.
- **P4.** Ticket 612's close note says a pair is kept when the upgrade's
  item level is "higher than" the base's; the code keeps it when it is not
  below (`assemble_universe.py:1427`, decision K2-7-ilvl).
- **P5.** The gate expects a Sunmote upgrade only when its base drops in a
  listed raid zone (`check_pool_completeness.py:269-273`); the builder has
  no such condition.

Upstream audit: passed (see the dispatch note).

## Code quality

These rows await one code-quality pass by a fresh workhorse-lane agent
before round 2; each then gets a Disposition row. The pass changes no
behaviour and must leave `pnpm verify` green.

| ID  | From | What to change                                                                                                                                                                                                                                |
| --- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1 | D1   | `check_pool_completeness.py:103-107`: give `ARENA_SEASON_OPENS` a source, or say it is db.json's own arena phases written out so the builder's db-phase gate is checked against a second statement of them.                                   |
| CQ2 | D2   | `data/phase_raids.json:3` `repFactionNote`: say that The Violet Eye and Keepers of Time rewards now reach the lists through the unlisted-faction rep route (`c346071c`), not "by other routes".                                               |
| CQ3 | S2   | Replace citations of gitignored stage-gate decisions in `assemble_universe.py`, `pool-hardening.test.ts:472,478,1228`, `pool.test.ts` and `check_desktop_tab.py:111-150` with tracked tickets (613, 642) or say the cited file is gitignored. |
| CQ4 | S4   | One predicate for the db-phase rule, called from the db-phase loop and from `in_rep_item_phase` in `assemble_universe.py`.                                                                                                                    |
| CQ5 | S5   | Read the spec list from `spec-registry.json` in `check_atlasloot_regen.py` (`TOKEN_SPECS`) and in `pool-hardening.test.ts` (`toHaveLength(11)`).                                                                                              |
| CQ6 | S6   | Move change-history comments out of `fork-set-fixtures.test.ts`, `fork-meta-repair.test.ts`, `pool.test.ts` and `pool-hardening.test.ts`; keep only the why.                                                                                  |
| CQ7 | S8   | `check_pool_completeness.py`: rename `w = out.append`; replace `[p for p in (DB,)]` with the plain value.                                                                                                                                     |

## Summary

Round 1 found no data loss and no silent wrong result in today's lists: the
44 lists rebuild byte for byte from committed sources, the arena season
gate fails when a season is planted early, and arena weapons in the feral
lists follow the player's own Sources setting. `pnpm verify` is green at
`3b9bb690`.

**Blocking the merge (no Disposition row until resolved):**

- **P2**, ticket `.scratch/carry-forward/issues/671-completeness-gate-reads-the-builders-weapon-exclusions.md`:
  the new gate reads a file the builder writes, against its own stated
  independence. This branch introduced it and it is not a code-quality
  row, so it blocks until it is fixed or the owner allows a `defer`.
- **CQ1-CQ7**: the code-quality pass, then round 2.
- **S9**: an edit to `.claude/skills/data-pipeline-work/SKILL.md:26`
  (an agent file) needs the owner's approval before any fix.

Bookkeeping applied in this commit: the close notes of tickets 613 (P1),
609 (P3) and 612 (P4) are corrected; ticket 628 has a dated note on the
`locale_keys.test.ts` timeout in K4's step-17 full fork run.

Tickets after round 1: this branch filed 9 (640-644, 660, 671-673) and
closed 8 (500, 609-613, 640 wontfix, 642). Filed is higher than closed by
one.

## Disposition

| ID    | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                            |
| ----- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial  | defer       | `.scratch/carry-forward/issues/673-completeness-gate-does-not-check-present-entries.md` — outside ticket 610's scope (absent items only; the docstring allows a present soft-policy item); none of the planted cases is in today's lists |
| A2    | Adversarial  | wontfix     | Restating builder rules is the gate's design (its docstring); whether the Sunmote rule is right, and what source the 5 rejected helms should show, is U1-U2 in ticket 672                                                                |
| A3    | Adversarial  | wontfix     | Ticket 610 condition 3 asks for this all-spec token test; it fails correctly on drift, so it never passes when it should fail                                                                                                            |
| A4    | Adversarial  | wontfix     | The skip prints `vendor/wowsims/db.json absent -- skipping tier-token regen check`; inside `pnpm verify`, `pool-listings:check` exits 2 on the same missing input (`check_pool_completeness.py` docstring, "2 an input is missing")      |
| A5    | Adversarial  | wontfix     | The four files were this review's own bookkeeping edits (P1, P3, P4 and the 628 note), committed with this review file                                                                                                                   |
| U1-U4 | Domain       | defer       | `.scratch/carry-forward/issues/672-check-new-list-routes-against-a-game-data-source.md` — unverified hypotheses, no source settles them yet                                                                                              |
| S1    | Standards    | wontfix     | The subjects are 1-2 characters over; rewording them means rewriting a branch history that contains merge commits                                                                                                                        |
| S3    | Standards    | wontfix     | `generate_tier_tokens.py:20` documents that these three fields are kept from the committed file; they hold no membership data, and every entry's content is regenerated and compared                                                     |
| S7    | Standards    | wontfix     | "The worst-ranked weapon is below 80% of the best" is the same statement as "no competitive weapon is last", so the test asserts its title                                                                                               |
| P1    | Spec         | fixed       | Ticket 613's close note now gives the rep route's +22 ret and +26 feral per list, with counts at `c346071c^` and `c346071c`                                                                                                              |
| P3    | Spec         | fixed       | Ticket 609's close note now names the four tables in `token-groups.json` and why none can be read from a vendored source                                                                                                                 |
| P4    | Spec         | fixed       | Ticket 612's close note now says "not below", matching `assemble_universe.py:1427`                                                                                                                                                       |
| P5    | Spec         | wontfix     | Stricter than the builder; a mismatch would fail the gate loudly, and it changes no result today                                                                                                                                         |
| P2    | Spec         | fixed       | `eec7d346` closes ticket 671: the gate states its own weapon policy and no longer reads `data/weapon-type-exclusions.json`; checked in round 2                                                                                           |
| CQ1   | Code quality | fixed       | `8174dce5` (round-2 mapping)                                                                                                                                                                                                             |
| CQ2   | Code quality | fixed       | `8be00576` (round-2 mapping)                                                                                                                                                                                                             |
| CQ3   | Code quality | fixed       | `52583606` (round-2 mapping)                                                                                                                                                                                                             |
| CQ4   | Code quality | fixed       | `08edae86` (round-2 mapping)                                                                                                                                                                                                             |
| CQ5   | Code quality | fixed       | `b04544c3` (round-2 mapping)                                                                                                                                                                                                             |
| CQ6   | Code quality | fixed       | `7e3a489f` (round-2 mapping)                                                                                                                                                                                                             |
| CQ7   | Code quality | fixed       | `8174dce5` (round-2 mapping)                                                                                                                                                                                                             |
| F1    | Code quality | fixed       | `f5587ad0`: separate `--out` and `--report` paths, and a note to restore `data/weapon-type-exclusions.json`; the orchestrator decided F1 and F2 inline, without a round 3                                                                |
| F2    | Code quality | fixed       | `f5587ad0`: comment rewrapped; the orchestrator decided F1 and F2 inline, without a round 3                                                                                                                                              |
| S9    | Standards    | pending     | Pending the owner's approval (Q-S9). It is a line in an agent doc (`.claude/skills/data-pipeline-work/SKILL.md:26`), not code                                                                                                            |

## Focused check (round 2)

Main range `3b9bb690..7e3a489f`: the round-1 review commit `60f08375`,
the P2 fix `eec7d346` (closes ticket 671), and the code-quality pass
`8174dce5` (CQ1, CQ7), `8be00576` (CQ2), `52583606` (CQ3), `08edae86`
(CQ4), `b04544c3` (CQ5), `7e3a489f` (CQ6). Fork range: empty; the fork is
at `8cd8d1c80` before and after, and `data/wowsims-fork.lock.json` is
unchanged in the range. One fresh `general-task` agent on Opus (review
lane) ran the four checks and wrote nothing.

**Conditions.** The six code-quality commits have subject-only messages
with no CQ ids, so condition 1 does not hold as written. The reviewer of
this file judged it settled from this file instead: each commit's diff
matches the CQ rows named above and touches only the files those rows
cite (the check agent's commit-by-commit mapping). `eec7d346` also adds
the scope-doc rows for tickets 672 and 673 in `docs/upgrades-tab-scope.md`;
the rows match their tickets. Condition 3 holds:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 8cd8d1c80`
prints only `6 0 ui/app/SimTabsSection.tsx`.

1. **Conditions hold: pass,** with the commit-message note above.
2. **Each diff changes only what its finding asks: pass.** The gate's
   restated `POLICY_EXCLUDED_WEAPON_TYPES` (ret {5, 7}, feral {6}) and
   `TWO_HAND_ONLY_SPECS = {"ret"}` match the only two `SPEC_PROFILES` that
   set weapon policy (`assemble_universe.py:449-450`, `:493`). The
   present-weapon check in `eec7d346` is needed: without it a builder rule
   that is removed (a polearm newly admitted to feral) is never compared,
   because `wearable()` skips policy-excluded weapons. `08edae86`'s
   `passes_db_phase_rule` (`assemble_universe.py:1404-1420`) is the same
   expression both call sites held; checked by reading, not by a rebuild,
   because the builder always rewrites the tracked
   `data/weapon-type-exclusions.json` (`:2826`). `b04544c3` still checks
   all 11 token files (`atlasloot:regen:check`: "16 committed outputs
   match"). No comment that explained a why was deleted.
3. **Tests assert their findings: pass.** Planted into scratch copies of
   the 44 lists (`check_pool_completeness.py --check --universes-dir`,
   which writes nothing at that path, `:556-558`): unchanged rc 0; 17074
   (polearm) in feral-p3, 1728 (one-hand) in ret-p3 and 1168 (shield) in
   ret-p3 each rc 1, "present but <spec>'s weapon policy excludes it".
   The two builder red runs recorded in ticket 671 (87 and 24 findings)
   were not repeated, for the tracked-file write above.
4. **Touched tests pass: pass.** `vitest run` on `pool.test.ts`,
   `pool-hardening.test.ts`, `fork-meta-repair.test.ts`,
   `fork-set-fixtures.test.ts`: rc 0, 308 passed, 2 todo.
   `pnpm pool-listings:check`: rc 0, 44 lists, 0 findings.
   `pnpm atlasloot:regen:check`: rc 0. `check_desktop_tab.py --compare`
   of the golden with itself: rc 0 (the range changed only comments there).

**Findings in the lines the fixes wrote:**

- **F1 (code quality).** `packages/core/test/pool.test.ts:422-424`, added
  by `7e3a489f` (CQ6): the re-run recipe passes `<scratch>` to both
  `--out` and `--report`, so followed as written the report overwrites the
  list and the `len(...['entries'])` step raises a KeyError. It also runs
  the builder, which rewrites the tracked `data/weapon-type-exclusions.json`.
  The worker copied the recipe from `pool-hardening.test.ts:400-402`,
  which has the same text on `dev`
  (`git show dev:packages/core/test/pool-hardening.test.ts | grep -c 'report <scratch>'` prints 1).
- **F2 (code quality, nit).** `scripts/check_desktop_tab.py:139`, rewritten
  by `52583606` (CQ3): one comment line is 104 characters among lines
  wrapped near 78. No lint rule sets a line length.

**Round 2 stops here.** Both findings are code-quality findings in lines
the fixes wrote, so the skill's "Round limit" stops the review: no round-2
Disposition table is written and `pnpm merge-to-dev --check-only` is not
re-run for this round. P2 and CQ1-CQ7 are fixed as checked above; their
rows (P2, CQ1-CQ7: `fixed`) are written when the owner decides what
happens to F1 and F2. S9 (the `data-pipeline-work` skill line) is pending
the owner's answer to Q-S9.

**After round 2.** The orchestrator decided F1 and F2 inline, without a
round 3, under the owner's standing rule that small review findings are
fixed inline. `f5587ad0` fixes both. The corrected recipe was run as
written at `35003338` for ret phases 2 and 3 into a folder outside the
repo: rc 0, 541 and 794 entries (the counts the two tests pin), and
`git status --porcelain` printed nothing afterwards. The Disposition rows
for P2, CQ1-CQ7, F1, F2 and S9 are in the table above.

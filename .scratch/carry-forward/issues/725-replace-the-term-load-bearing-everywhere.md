Status: open
Type: process
Origin: owner request in session, 2026-10-27, on branch feat/stage-gate-open-faults
Blocks: none
Blocked by: none
Related: 723

# Replace the term "load-bearing" everywhere, in one change

The owner bans the term "load-bearing". Owner, 2026-10-27: "I'm going to
delete everything if something uses the term load bearing". The owner
was then told that the stage-gate Claims-register column is named
`Load-bearing`, and answered: "Fine use it but make a follow up to
replace it everywhere at once".

This ticket is that follow-up. Make all the edits in one change.

## Where the term is

Line numbers in this ticket are at `80c08777`. Ticket 723 edits
`.claude/agents/gate-planner.md` lines 75-79 and 112-121, so that
file's lines will move. Re-find every line with the grep below before
you edit.

`git grep -c -i -E 'load[- ]?bearing'` at the repo root finds 504
matching lines in 282 tracked files. The full list:
`git grep -n -i -E 'load[- ]?bearing'`.

The lines fall into four groups.

| Group                                   | Lines     | Files                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Claims-register term (stage-gate)    | 24        | `.claude/skills/stage-gate/SKILL.md` (8), `.claude/skills/stage-gate/plan-template.md` (2), the same two under `.agents/skills/stage-gate/` (8 + 2), `.claude/agents/gate-executor.md` (1), `.claude/agents/gate-planner.md` (1), `.claude/agents/gate-reviewer.md` (2) |
| B. Other live files ("essential")       | 49        | skills (5 per mirror, 10 total), `CONTEXT.md` (1), `PLAN.md` (4), ADRs 0017/0024/0030/0032 (4), `docs/fork-phase-seams.md` (1), `docs/plans/**` (12), `packages/core` (4), `scripts/*.py` (5), open tickets (8)                                         |
| C. Ban lists that name the word to ban it | 3       | `docs/agents/home/AGENTS.md:13`, `.claude/skills/writing-great-skills/GLOSSARY.md:187`, its `.agents` mirror                                                                                                                                             |
| D. History                              | about 428 | `.scratch/**` except open tickets, `docs/reviews/**`, `docs/verification-log.md`, `docs/stage0-findings.md`, `PLAN-REVIEW.md`                                                                                                                           |

Keep group C as it is. Removing the word there removes the ban.

### Facts that limit the change

- No script or hook reads the Claims-register column by name.
  `git grep -n -i -E 'load[- ]?bearing' -- scripts .claude/hooks` finds
  only five comments in `scripts/` (group B) and nothing in
  `.claude/hooks/`. `git grep -n -i -E 'claims|\| *ID *\| *Claim' --
  scripts .claude/hooks` finds no parser of the register table.
  `scripts/check_merge_ready.py:112` reads `Verified by:` lines in
  tickets, not in the plan's register.
- Every skill edit goes in both `.claude/skills` and `.agents/skills`.
  `pnpm mirrors:check` (`scripts/check_skill_mirrors.py`) fails when the
  two copies differ.
- Skill files need the owner's approval before an edit (`AGENTS.md`,
  "Propose changes to `AGENTS.md`, `CLAUDE.md` and skill files in
  chat").
- The fork repo `vendor/tbc-new-fork` has 11 matching lines in 10 files
  (`git -C vendor/tbc-new-fork grep -c -i -E 'load[- ]?bearing'`). Some
  of these may be upstream wowsims files, which need the owner's OK for
  each exact edit: hypothesis, untested. A fork edit needs a pair
  (`docs/agents/paired-worktrees.md`).
- Prettier re-pads the markdown tables in `docs/plans/compute-topology.md`
  and `docs/plans/upstream-data-redundancy.md` after the edit.
- No link points at an anchor that changes:
  `git grep -n -E 'the-load-bearing-check|apl-is-load'` returns nothing.

## Group A: the Claims-register term

The table uses the recommended new term, `Approach claim`. If the owner
picks another term, use it in the same places. Make each
`.claude/skills/stage-gate/` change in the matching
`.agents/skills/stage-gate/` file too (same line numbers).

| File:line                              | Current                                                                                              | Replacement                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `plan-template.md:19`                  | ``Load-bearing: yes` when refuting the claim invalidates the approach, not``                         | ``Approach claim: yes` when refuting the claim invalidates the approach, not``                       |
| `plan-template.md:22`                  | `\| ID \| Claim \| Load-bearing \| Verified by \|`                                                   | `\| ID \| Claim \| Approach claim \| Verified by \|`                                                 |
| `SKILL.md:334`                         | `reviewer's. A **refuted load-bearing claim** is a Claims-register row`                              | `reviewer's. A **refuted approach claim** is a Claims-register row`                                  |
| `SKILL.md:335`                         | ``whose `Load-bearing` cell is `yes` (`plan-template.md` § Claims``                                  | ``whose `Approach claim` cell is `yes` (`plan-template.md` § Claims``                                |
| `SKILL.md:338`                         | ``- **Loop back.** A `blocking` finding, or a refuted load-bearing``                                 | ``- **Loop back.** A `blocking` finding, or a refuted approach``                                     |
| `SKILL.md:343`                         | `refuted load-bearing claim. After the revision of the second`                                       | `refuted approach claim. After the revision of the second`                                           |
| `SKILL.md:347`                         | ``- No `blocking` finding and no refuted load-bearing claim, but one or``                            | ``- No `blocking` finding and no refuted approach claim, but one or``                                |
| `SKILL.md:355`                         | ``re-review has a `blocking` finding or a refuted load-bearing claim,``                              | ``re-review has a `blocking` finding or a refuted approach claim,``                                  |
| `SKILL.md:381`                         | `load-bearing claim, the session spawns no revision: it stops, gives`                                | `approach claim, the session spawns no revision: it stops, gives`                                    |
| `SKILL.md:401`                         | ``check. No revision follows this review. When it has a `blocking` finding or a refuted load-bearing`` | ``check. No revision follows this review. When it has a `blocking` finding or a refuted approach``   |
| `.claude/agents/gate-executor.md:87`   | ``  load-bearing: stop work, report `Status: blocked`.``                                             | ``  as an approach claim: stop work, report `Status: blocked`.``                                     |
| `.claude/agents/gate-planner.md:75`    | `  Verify to the depth of the claim you are about to make: a load-bearing`                           | `  Verify to the depth of the claim you are about to make: an approach`                              |
| `.claude/agents/gate-reviewer.md:60-61` | `   plan survives the hypothesis being false; a load-bearing untested` / `   hypothesis is a finding.` | `   plan survives the hypothesis being false; an untested approach claim` / `   is a finding.`       |
| `.claude/agents/gate-reviewer.md:138`  | ``Severity: `blocking` (the approach or a load-bearing claim fails, or a``                           | ``Severity: `blocking` (the approach or an approach claim fails, or a``                              |

`gate-executor.md:86` ("the disagreement refutes a claim the register
marks") stays. With the new line 87 it reads "...a claim the register
marks as an approach claim: stop work...".

## Group B: other live files

These lines use the word to mean "essential", not the register column.
Each one needs its own plain word. Skill lines need the owner's approval
first, and each goes in both mirrors.

| File:line                                                               | Current (excerpt)                                                                                         | Replacement (excerpt)                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/diagnosing-bugs/SKILL.md:74` (+ mirror)                 | `— keep only what's load-bearing for the failure.`                                                        | `— keep only what the failure needs.`                                                                        |
| `.claude/skills/diagnosing-bugs/SKILL.md:78` (+ mirror)                 | `Done when **every remaining element is load-bearing** — removing any one of them makes the loop go green.` | `Done when **the failure needs every remaining element** — removing any one of them makes the loop go green.` |
| `.claude/skills/improve-codebase-architecture/SKILL.md:70` (+ mirror)   | `**User rejects the candidate with a load-bearing reason?**`                                              | `**User rejects the candidate with a lasting reason?**`                                                      |
| `.claude/skills/parallel-phase/SKILL.md:42` (+ mirror)                  | `**Isolation is load-bearing, not bookkeeping.**`                                                         | `**Isolation is a safety rule, not bookkeeping.**`                                                           |
| `.claude/skills/writing-fragments/SKILL.md:38` (+ mirror)               | `It is load-bearing: name the right one in explore`                                                       | `It matters most: name the right one in explore`                                                             |
| `CONTEXT.md:87`                                                         | `**Inclusive is the load-bearing word** — at`                                                             | `**Inclusive is the key word** — at`                                                                         |
| `PLAN.md:168`                                                           | `and inclusive is the load-bearing word** (review R2).`                                                   | `and inclusive is the key word** (review R2).`                                                               |
| `PLAN.md:528`                                                           | `The APL block is load-bearing; the `TypeSimple` label is not.`                                           | `The APL block changes the result; the `TypeSimple` label does not.`                                         |
| `PLAN.md:633`                                                           | `**The load-bearing field is `CURRENT_PHASE`, and it settles`                                             | `**The key field is `CURRENT_PHASE`, and it settles`                                                         |
| `PLAN.md:670`                                                           | `metadata is now load-bearing for **gear reading at Stage 1**`                                            | `metadata is now required for **gear reading at Stage 1**`                                                   |
| `docs/adr/0017-...md:58`                                                | `**R2's load-bearing rule is unaffected and stays.**`                                                     | `**R2's main rule is unaffected and stays.**`                                                                |
| `docs/adr/0024-...md:69`                                                | `The row label is load-bearing and is asserted in test.`                                                  | `The row label is required and is asserted in test.`                                                         |
| `docs/adr/0030-...md:49`                                                | `a separate, load-bearing command, because`                                                               | `a separate, required command, because`                                                                      |
| `docs/adr/0032-...md:17`                                                | `deliberate and load-bearing: a missing per-spec`                                                         | `deliberate and necessary: a missing per-spec`                                                               |
| `docs/fork-phase-seams.md:64`                                           | `These are the load-bearing filters.`                                                                     | `These are the main filters.`                                                                                |
| `docs/plans/all-wowsims-specs/foundation.md:75`                         | `This is the load-bearing finding.`                                                                       | `This is the main finding.`                                                                                  |
| `docs/plans/all-wowsims-specs/foundation.md:179`                        | `**Two-copy caveat, load-bearing for the plan.**`                                                         | `**Two-copy caveat; the plan depends on it.**`                                                               |
| `docs/plans/all-wowsims-specs/healer-support-blocked.md:79`             | `This is the load-bearing signal;`                                                                        | `This is the main signal;`                                                                                   |
| `docs/plans/all-wowsims-specs/options.md:179`                           | `This is the load-bearing unknown for B`                                                                  | `This is the main unknown for B`                                                                             |
| `docs/plans/compute-topology.md:59`                                     | `\| The "needs process spawn" justification is load-bearing \|`                                           | `\| The plan depends on the "needs process spawn" justification \|`                                          |
| `docs/plans/ep-weights-from-sim.md:77`                                  | `longer load-bearing for weapon _membership_.`                                                            | `longer decides weapon _membership_.`                                                                        |
| `docs/plans/ep-weights-from-sim.md:162`                                 | `**Caveat, load-bearing:**`                                                                               | `**Important caveat:**`                                                                                      |
| `docs/plans/upstream-data-redundancy.md:54`                             | `### 2.1 The load-bearing check`                                                                          | `### 2.1 The key check`                                                                                      |
| `docs/plans/upstream-data-redundancy.md:413`                            | `\| **yes, load-bearing** \|`                                                                             | `\| **yes, required** \|`                                                                                    |
| `docs/plans/upstream-data-redundancy.md:464`                            | `§6.2 marks it load-bearing;`                                                                             | `§6.2 marks it required;`                                                                                    |
| `docs/plans/upstream-data-redundancy.md:466`                            | ``\| `stats[27] = 54` is load-bearing and re-rooting``                                                    | ``\| `stats[27] = 54` is needed and re-rooting``                                                             |
| `docs/plans/wowsims-tab/research/research-core-portability.md:111`      | `This split is load-bearing (PLAN.md §7/R6,`                                                              | `This split is required (PLAN.md §7/R6,`                                                                     |
| `packages/core/src/items.ts:3`                                          | ` * the candidate pool. Load-bearing for gear the player is *already wearing*:`                           | ` * the candidate pool. Needed for gear the player is *already wearing*:`                                    |
| `packages/core/test/meta-repair.test.ts:368`                            | `it("is a no-op when every swap is load-bearing", () => {`                                                | `it("is a no-op when every swap is needed", () => {`                                                         |
| `packages/core/test/pool.test.ts:87`                                    | `    // called load-bearing, since a per-tier gate would strand Karazhan gear.`                           | `    // requires, since a per-tier gate would strand Karazhan gear.` (line 86 ends "the property R2")        |
| `packages/core/test/slot-mapping.test.ts:78`                            | `    // The load-bearing half of the filter: without it every two-hander in the`                          | `    // The half of the filter that matters: without it every two-hander in the`                             |
| `scripts/assemble_universe.py:2476`                                     | `    # Placement is load-bearing and deliberate:`                                                         | `    # Placement matters and is deliberate:`                                                                 |
| `scripts/build_feral_skeleton.py:102`                                   | `# Those two lists are load-bearing, not decoration.`                                                     | `# Those two lists are required, not decoration.`                                                            |
| `scripts/compose_feral_raid_sim.py:165`                                 | `# Drop any requestId from the live export — not load-bearing for cli sim.`                               | `# Drop any requestId from the live export — not needed for cli sim.`                                        |
| `scripts/compose_slamaltman_raid_sim.py:156`                            | same as the line above                                                                                    | same as the line above                                                                                       |
| `scripts/sync_wowsims.py:14`                                            | `The load-bearing field is CURRENT_PHASE.`                                                                | `The key field is CURRENT_PHASE.`                                                                            |

Open tickets (status `open` on the first `Status:` line):

| File:line                                     | Current (excerpt)                                                       | Replacement (excerpt)                                |
| --------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `.scratch/carry-forward/issues/165-...md:112` | `the load-bearing fix rather than a`                                    | `the real fix rather than a`                         |
| `.scratch/carry-forward/issues/240-...md:49`  | `correct where the assertion is load-bearing and the vendor`            | `correct where the assertion matters and the vendor` |
| `.scratch/carry-forward/issues/255-...md:12`  | `True, and load-bearing.`                                               | `True, and important.`                               |
| `.scratch/carry-forward/issues/344-...md:29`  | `the load-bearing *reason* in a sentence`                               | `the *reason* that matters in a sentence`            |
| `.scratch/carry-forward/issues/404-...md:30`  | `so the load-bearing output is the **top-1`                             | `so the output that matters is the **top-1`          |
| `.scratch/carry-forward/issues/452-...md:15`  | `leaked into load-bearing gates, fixtures,`                             | `leaked into required gates, fixtures,`              |
| `.scratch/carry-forward/issues/405-...md:28`  | quotes an old rule: `load-bearing only: a non-obvious constraint, ...`  | leave: it quotes old text word for word              |
| `.scratch/carry-forward/issues/407-...md:56`  | quotes an old rule: `"... Load-bearing comments only"`                  | leave: it quotes old text word for word              |

Some group B lines also use other banned words that this rename does not
fix: `writing-fragments/SKILL.md:38` ("land", "shapes"),
`docs/adr/0030-...md:49` ("carries"), `foundation.md:181` ("land").

## Questions for the owner

**Q-725-term: what is the new term?** Today the Claims-register column
is named `Load-bearing`. It marks a claim that, if false, makes the
whole approach wrong, not just one step. The options:

- `Approach claim` (recommended). It says the claim works at the level
  of the whole approach. It pairs with "step-local claim", which
  `gate-planner.md:76` already uses. It is two words, and
  `git grep -n -i 'approach claim'` finds no clash.
- `Critical`. It is short, but it reads like a severity level. The
  review already has three levels (`blocking`, `material`, `minor`), so
  a reader may take it as a fourth.
- `Approach depends on it`. It is the most literal, but it is four words
  in a table header and makes the eight rule sentences in `SKILL.md`
  longer.

**Q-725-history: what happens to the history files (group D)?** These
are old plans, reviews, closed tickets and logs, about 428 lines. The
options:

- Leave them as they are (recommended). They record what was written at
  the time, and later records quote them. No agent rule points an agent
  at them as current guidance.
- Rewrite them. This makes the grep return only the ban lists. A
  `sed` swap is not safe, because each line uses the word in its own
  context, so it needs a line-by-line pass like group B.

## Done when

- `git grep -n -i -E 'load[- ]?bearing'` lists only the lines the owner
  agreed to keep: the group C ban lists, the two quotes in tickets 405
  and 407, and group D if the owner keeps it.
- `pnpm mirrors:check` passes.

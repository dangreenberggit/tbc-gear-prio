Status: open
Type: task
Origin: owner remark, 2026-10-20, after the feat/dps-spec-coverage live run
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# Lines in the tab's "Dropped candidates and substitutions" list read like engineering notes

## What the player sees

The Upgrades tab's "Dropped candidates and substitutions" list holds lines
that a player cannot read. Examples:

- "Meta inactive — repaired with N min-EP gem swap(s): …"
- "Meta repair valued hit at full weight: …"
- "no meta preference recorded for <spec> — meta sockets on candidate items
  were left empty, so …"
- "the <set> <N>pc completion package could not be measured: …"

The owner, 2026-10-20, on a similar line: "These are words but this is
illiterate in any language or jargon."

The off-hand line that `feat/dps-spec-coverage` added is the model to
follow: "29 off-hand items were not ranked, because you wear a two-handed
weapon." It says what happened and why, in words a player uses.

## Where the text is

Fork (`vendor/tbc-new-fork`), under `ui/features/upgrades/model/engine/`:

- `rank.ts`: "Meta repair valued hit at full weight" (lines 1074 and 1090)
  and "completion package could not be measured" (line 1770), on
  `tbc-new-fork@b908771dd`.
- `disclosure.ts:161`: "Meta inactive — repaired with …".
- `candidate-gems.ts:266`: "no meta preference recorded for …".

Core mirror in this repo: `packages/core/src/rank.ts` (completion package,
line 1427), `packages/core/src/disclosure.ts` and
`packages/core/src/candidate-gems.ts` (the meta lines), on `dev` after the
`feat/dps-spec-coverage` merge. Find them with
`grep -rn "Meta inactive\|valued hit at full weight\|no meta preference recorded\|completion package could not" packages/core/src vendor/tbc-new-fork/ui/features/upgrades/model/engine`.

## Done when

- Every line in the "Dropped candidates and substitutions" list is a plain
  sentence that states a fact. No line gives the player advice.
- The tab fixtures that hold these lines are re-recorded
  (`data/tab-fixtures/README.md` gives the command).

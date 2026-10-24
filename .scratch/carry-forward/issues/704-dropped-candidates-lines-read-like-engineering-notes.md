Status: closed
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

## Notes

2026-10-24, closed on `feat/704-plain-drop-lines`. Each line now opens with
one plain sentence; ids, the sim slot, raw errors and the spec id follow a
line break, so the tab shows "… (full text in the browser console)" and logs
the rest. Label — first line:

- S1 Meta gem — "Your meta gem was not active, so the ranking swapped 1 gem
  in its own copy of your gear to turn it on; your gear itself was not
  changed."
- S2 Meta gem and hit rating — "If gems were swapped to turn your meta gem
  on, hit rating was treated as always useful, because the hit cap is only
  known for a fight where every target is level 73."
- S3 Meta gem and hit rating — "If gems were swapped to turn your meta gem
  on, hit rating was treated as always useful, because your hit rating could
  not be read."
- S4 Meta gem and hit rating — "The set-bonus sims used the same gems at
  every piece count, because the hit rating of one of them could not be
  read."
- S5 Meta gem — "No meta gem is known for your spec, so meta sockets on
  candidate items were left empty and those items are priced without a meta
  gem and without their socket bonus."
- S6 the item's name — "A sim of this item failed, so that try was left out
  of the ranking." or "No gem swap could turn your meta gem on with this
  item equipped, so that try was left out of the ranking."
- S7 "<set> <n>-piece set bonus" — "The <set> <n>-piece set bonus was not
  measured, because its sim failed." (or "because no gem swap could turn
  your meta gem on." or "because the sims that measure it failed.")

No committed fixture held these lines (fixtures hold only off-hand and
one-hand substitutions), so none was re-recorded. Owner ruling 2026-10-24:
no live run for a text change; the check is the component test.

Verified by: `tbc-new-fork@6324167c5`, `tbc-gear-prio@6d027406`, and
`pnpm fork-tests:check` (the SubstitutionsList test "shows every engine line
as one plain sentence").

2026-10-24, review round 1 (`docs/reviews/feat-704-plain-drop-lines.md`):
the S2 to S5 labels and the S4, S5 and S6 texts above changed again at
`tbc-new-fork@91bc01b8c`. The SubstitutionsList test "shows every engine
line as one plain sentence" lists the current text of every line.

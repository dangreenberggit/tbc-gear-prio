Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F6)
Blocks: none
Blocked by: none
Related: 500

# A ranking lists Thunderheart Harness at a 5-piece threshold the set does not have

`data/tab-fixtures/feral-p5-th4pc.json` (recorded 2026-10-15, fork
`2d168e74f`) has `ranking.setBonuses[0]` for Thunderheart Harness with
`"threshold": 5`. The set's bonuses are at 2 and 4 pieces only
(`vendor/tbc-new-fork/sim/druid/item_sets.go:224-250`). Whether any screen
shows this entry, and whether the engine meant a step entry rather than a
bonus, is untested.

Re-run: `python -c "import json;r=json.load(open('data/tab-fixtures/feral-p5-th4pc.json',encoding='utf-8'))['ranking'];print([(b.get('setId'),b.get('setName'),b.get('threshold')) for b in r['setBonuses']])"`

Done when: the cause is found, and a ranking either has no set-bonus entry
at a threshold the set lacks or the entry is shown to mean something else
and is labelled so.

## Owner, 2026-10-16

Verbatim: "Nonexistent set bonuses is on obviously wrong too"

The owner rules that a set-bonus entry at a threshold the set does not
have is a defect, not a judgment call. "Labelled so" in Done when is
therefore not enough if a screen shows the entry as a bonus.

On 2026-10-16 the re-run above prints the Thunderheart Harness entry
second in the list (index 1, not 0), still with `threshold` 5. The fork's
`sim/druid/item_sets.go:224-250` still defines only the 2-piece and
4-piece bonuses.

Other open tickets that describe a set bonus that does not exist: none.
Checked by reading every open ticket under `.scratch/carry-forward/issues/`
that mentions a set bonus, threshold or piece count. Ticket 621 is related
but different: those bonuses exist, and the sim panics when another class
reaches them.

Status: open
Type: task
Origin: human review of .scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html, 2026-08-12
Blocks: none
Blocked by: none

# P3 report's curated list is pinned to the P2 BiS set

On a P3 ret rank report, the "Curated ranked list" box at the top shows only
3 items and stays checked to "BiS only — the 15 items on upstream's ret gear
set (p2)". The report's own caption says as much: "No curated set is pinned
for P3, so these are the newest that is — an older phase's list."

Black Temple / Hyjal (real P3 content) items are correctly simmed and ranked
further down the page (per-slot sections, ~20 Black Temple items present) —
they're just invisible in the curated box because no P3 curated set exists to
filter against.

Confusing at a glance: phase says P3, raid checkboxes say P3, but the
headline curated list is silently showing P2 picks.

## Confirmed: upstream has no ret P3 set (2026-08-12)

Checked `wowsims/tbc-new` three ways. Each returns exactly `p1.gear.json`,
`p2.gear.json`, `preraid.gear.json` under
`ui/paladin/retribution/gear_sets/` — no p3 on any of them:

    gh api repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=v0.0.101 --jq '.[].name'
    gh api repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=master --jq '.[].name'
    gh api repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=feature/backend-reforge --jq '.[].name'

Also: `CURRENT_PHASE` on `master` is still `Phase.Phase2`, and a code search
for a p3 set under that path returns nothing. Upstream is 13 tags ahead of our
pin (`v0.0.114` latest vs `v0.0.101` pinned), so this is not our pin being
stale — the set does not exist on their tip either.

So this is **not** a wrong-branch or stale-pin artifact, and the fallback in
`scripts/assemble_universe.py` (`bis_set_labels_for_max_phase`) is doing the
only thing available to it. The `--ref`/`watchedRefs` machinery in
`scripts/sync_wowsims.py` cannot fix this; there is nothing on any ref to pin.

## The wider point: upstream is not complete, and we should not assume it is

The p2-only ret sets are one instance of a general condition — upstream ships
what its maintainers happened to curate, not a full matrix. `sync_wowsims.py`
already notes ret stops at p2 while feral cat runs to p5, which is the same
gap seen from the other side.

Two consequences worth carrying beyond this ticket:

- Anywhere we treat "upstream has it" as a precondition, absence is a normal
  case to design for, not an error to report. A missing curated set should
  degrade to a legible state rather than to a control that silently filters
  against the wrong phase.
- Filling a gap ourselves (generating a P3 ret set, or sourcing one elsewhere)
  is a real option, but it changes the provenance story: a set we produced is
  not a set upstream curated, and the report's labelling rules exist precisely
  to stop that distinction being lost. Not doing this now.

## Still outstanding: the feature needs BiS lists from somewhere

Presentation fixes below make the gap legible; none of them make the curated
list *work* at P3+. That functionality needs curated set data, and upstream is
confirmed not to be the source for ret beyond p2. This does not go away by
labelling it better, and it recurs every time the content tier advances.

The data itself is cheap — `vendor/wowsims/ret_p2.gear.json` is a 17-slot
array of item ids with optional `enchant` and `gems`:

    {"items": [{"id": 32461, "enchant": 3003, "gems": [32409, 30546]},
               {"id": 30022}, ..., {}, {"id": 27484}]}

(Empty object = an unfilled slot; the array is positional.) Producing a file
in that shape is not the problem. **Authority is.** A curated set's whole
value is that someone who tracks the spec decided these 17 pieces belong
together; a list we generate is our own optimizer's output wearing the word
"BiS", which is exactly the per-item overclaim carry-forward 47 §1 was filed
for, one level up.

So whatever fills this gap has to answer: who curated it, and does the report
say so? Options, unevaluated:

- **Another community source** (a spec discord's BiS list, a guide site). Has
  real authority; needs a provenance/licensing story and a sync path, and none
  will ship in wowsims' file shape.
- **Generate from our own ranking.** Always available, no external dependency.
  Must NOT be labelled "BiS" or share the curated-set vocabulary — it is a
  different claim and needs its own name and its own visual treatment.
- **Hand-maintain a small pinned set per phase**, committed with a source
  citation. Honest and low-tech; the cost is that it goes stale silently and
  someone has to own it each tier.

Whichever is chosen, the labelling rules in `rank-report.ts` need to carry the
source, not just the phase — today they can name a set (`p2`) but have no way
to say where a set came from, because so far there has only ever been one
origin.

## Fix

Pinning a P3 curated set from upstream is ruled out by the check above, so the
remaining levers are display-side and generate-our-own. Untriaged, in rough
order of confidence:

1. The stale-set warning already exists and fires correctly
   (`packages/core/src/rank-report.ts`, `bisStale`) — but it sits in the note
   *below* the checkbox, subordinate to the "3 items / BiS" claim it corrects.
   Placement and default (checked vs unchecked on phase advance) are the
   cheapest change.
2. `bisStale` can only detect *older*, never *absent*. It is derived from
   labels present on tagged rows, so it cannot distinguish "upstream will never
   ship a P3 ret set" from "we have not vendored P3 yet" — a distinction
   `bis_set_labels_for_max_phase`'s docstring draws but never surfaces.
3. **Unmeasured:** the box shows 3 items where p2's ret set has ~15 members.
   Why most p2 picks are absent from the P3 candidate pool has not been
   investigated, and until it is, it is not established that this is purely a
   display problem.

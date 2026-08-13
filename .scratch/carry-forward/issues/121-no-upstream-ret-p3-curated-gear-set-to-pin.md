Status: open
Type: data gap (design decision if pursued)
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/01-survey.md` §3; W2b cancelled in
`.scratch/set-bonus-value/ret-catchup/DIRECTOR.md`)

# No upstream ret P3 curated gear set to pin

Feral's p3 BiS pin (commit `02f2f85`) has no ret equivalent because there is
nothing upstream to pin. Verified read-only (01-survey.md §3):

```
gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=v0.0.101"
```

returns `p1.gear.json, p2.gear.json, preraid.gear.json` only; the same dir on
today's default branch is identical, and the latest release (v0.0.113) still
ships no ret p3. Contrast feral at v0.0.101: 16 files up to p5.

Consequence (documented behaviour, not a defect): a ret max-phase-3 run tags
BiS from **p2's list** via the documented degrade
(`bis_set_labels_for_max_phase`, assemble_universe.py:366), and the report
says so — 04-surfaces.md check 7 verified the rendered wording verbatim
("**No curated set is pinned for P3**, so these are the newest that is — an
older phase's list, not a P3 recommendation"). Nothing on the page claims a
P3 curated list. `--pin-bis` prints its no-P3-data note (cli.ts:455-460).

## Options

1. **Wait for upstream.** Recheck the gear_sets dir at future releases; if a
   ret p3 file appears, the mechanical pin+regen recipe from `02f2f85`
   (runbook at `scripts/sync_wowsims.py:52-58`) applies and costs ~an hour.
2. **Hand-curate a local ret p3 list.** A design decision, not a pin: needs a
   new tag vocabulary / source-of-truth story and owner sign-off on the list
   itself. Expensive; do not start without an explicit ask.

Until either happens, the degrade + disclosure is the accepted behaviour.

## Carried in from review round 3 (3-D3, 2026-08-12)

Every ret figure this round rests on the one unverified fixture snapshot,
including ADR-0024's +11.31 Lightbringer 2pc, which drives package-mode sort
order. That bonus is a mana proc, so its value is unusually sensitive to how
mana-starved the gear makes the rotation; a newer snapshot could move it.
When this ticket is worked (either option), add a reference-gear caveat to
ADR-0024 for the +11.31 figure, in the style ADR-0023 already carries for its
own figures.

## Relationship to ticket 153

Ticket 153 (`153-p3-curated-list-pinned-to-p2-set.md`, formerly filed as an
id-colliding `100-`) covers the same upstream gap — no ret P3 curated set
exists to pin — from the report-display side. It adds two things this ticket
lacks: a critique of where the `bisStale` warning sits in
`packages/core/src/rank-report.ts` (below the checkbox it corrects, so
subordinate to the claim it contradicts), and the observation that `bisStale`
can only detect a curated set as *older*, never *absent*. Not a duplicate;
not merging.

## Acceptance criteria (whichever option lands)

- [ ] Ret max-phase-3 BiS tags come from a genuinely-P3 list, or this ticket
      is re-closed as wontfix with the degrade reaffirmed.
- [ ] `CURATED_SET_PHASE` (both the Python source and the gate-checked TS
      mirror) covers the new label if one is introduced.
- [ ] `pnpm verify` green.

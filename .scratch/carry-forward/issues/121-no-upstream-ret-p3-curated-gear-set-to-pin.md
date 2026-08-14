Status: resolved via Option 1 — 2026-08-14 (pending review; see "Resolution")
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

## Resolution — Option 1 fired, 2026-08-14

**Upstream shipped a ret P3 set.** This ticket's Option 1 ("wait for upstream…
the mechanical pin+regen recipe applies") is what happened, ~2 days after the
ticket was filed:

- `ac0ed034b` (2026-08-13T18:15:10Z, "RetP3 Gear and Presets") — adds
  `P3_EP_PRESET` to `ui/paladin/retribution/presets.ts`, **no gear JSONs**.
- `5c7491899` (2026-08-13T18:41:45Z, "missed jsons") — adds
  `gear_sets/p3.gear.json` and `p3Bulwark.gear.json`. **This is the commit that
  matters for this ticket**; a bump aimed at `ac0ed034b` would fetch weights
  and leave the tags where they were.

Done on branch `feat/ret-p3-data` (commits `621b8af`, `7aaff35`, `896c6d8`,
`d96c044`):

- `ret_p3.gear.json` vendored via a new **per-file pin override** in
  `sync_wowsims.py`, so the main `8aa378b3` pin stays put — plan decision D2
  keeps it deliberate, and nothing else changed between the two commits.
- Wired into `SPEC_PROFILES["ret"].gear_sets`; ret-p3/p4/p5 regenerated.
- `p3.gear.json` chosen over `p3Bulwark.gear.json`: upstream's own
  `P3_PRESET_BUILD_RET` wires `P3_GEAR_PRESET`, and Bulwark has no
  `PresetBuild`. Settled by upstream's wiring, not by our inference.
- Ret p3 EP weights now score p3+ universes (`p3.ep-weights.json`), replacing
  the p2 weights all higher phases used.

Verified by the orchestrator, not accepted on report: ret-p3/p4/p5 tagged rows
now carry `bisSets: ["p3"]` (was `["p2"]`); the tagged ids match upstream's set
15/16 with **zero** spurious tags; and a fresh regen of ret-p3 is byte-identical
to the committed artifact.

The one untagged member, `27484`, is **absent from the candidate pool** at p2
and p3 alike, so it is a pool-membership question rather than a tagging bug —
and it is not a regression, since it behaved the same way before.

**The reference-gear caveat carried in from review round 3 (ADR-0024's +11.31
Lightbringer 2pc) is NOT addressed** by this work and remains open.

## Acceptance criteria (whichever option lands)

- [x] Ret max-phase-3 BiS tags come from a genuinely-P3 list — upstream's own,
      vendored at `5c7491899`.
- [x] `CURATED_SET_PHASE` covers the label — `"p3": 3` already existed;
      verified rather than assumed, and `curated-set-phase:check` passes.
- [x] `pnpm verify` green — exit 0, run independently in the worktree.
- [ ] ADR-0024 reference-gear caveat (carried in from round 3) — still open.
- [ ] `sme-rank-review` on the refreshed ranking — plan §9.6's gate, not yet run.

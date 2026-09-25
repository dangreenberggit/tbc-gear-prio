# Brief: upgrades-tab-closeout, Round 2e (set credit noise and non-tier sets)

The owner wants both problems fixed before the merge (2026-09-25).

## The two problems (from the targeted engine review)

The source for both is `.scratch/stage-gate/upgrades-tab-closeout/engine-review/domain.md`, findings D1 and D3. The engine-review fix worker is filing them as tickets. Look them up with `pnpm issues:open`, or search `.scratch/carry-forward/issues/` for "ret set credit" and "non-tier".

**D1: ret gets set credit that can only be noise.**
- With "Set potential" on, ret rows gain credit from set bonuses that cannot raise ret DPS. The Crystalforge 4pc is a party heal (fork `sim/paladin/item_sets.go` lines 30–75). The Justicar 4pc only changes Judgement of Command, and the default ret rotation never casts it (`.scratch/set-bonus-value/verification.md` V0).
- The set-rule scenarios still credited them +9.5 to +21.1 (`.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md`, scenarios H and I).
- The owner's words: "i assume its either a threshold or 'sim more so less noise' situation since the dps gain makes no sense other than from noise."
- The reviewer's hypothesis, untested: the credit floor (4.81) is √2 × a single-sim cutoff, but a net set value is a difference of five or more sims at 3000 iterations, so its noise is much larger than the floor allows for.

**D3: breaks cover only six tier sets, at 2pc and 4pc.**
- The sim also implements Wastewalker 2pc/4pc, Burning Rage 2pc and Primal Intent 3pc (`sim/common/tbc/items_sets.go` in the fork).
- Pre-raid feral wears Wastewalker 4pc, and pre-raid ret wears Ragesteel 2pc (Burning Rage). A phase-1 run starts from that gear, by the owner's rule (previous phase's preset). The path into tier gear loses those bonuses and nothing charges it.
- `SetThreshold = 2 | 4` cannot represent a 3pc.
- The hand-written `IMPLEMENTED_IN_SIM` table is the root. The owner's standing direction is to take facts from wowsims, not re-mirror them (memory: fork items come from wowsims; ticket 301's lesson). A table derived from the sim's own item-set registrations may be the right fix. Investigate it.

## How to plan

Use investigator subagents: opus for anything that needs judgment, sonnet for lookups. Run independent questions in parallel, and wait for all of them inside your turn. Investigators may write only under `.scratch/stage-gate/upgrades-tab-closeout/round-2e/`.

Another agent is editing the engine right now. It is fixing the 492 pair-sim guard in `rank.ts`, plus comments and tests, and will re-pin the fork. Treat `rank.ts`'s pair-sim block as changing. Plan against the tickets and the design, and have the executor re-read the files at its base SHA.

Live sims need the backend on :3333 and vite on :5173 (Node 22). Only one agent may drive them at a time, and none may while the other agent is committing.

## Open questions (answer each with: a candidate that is not just the same approach with different constants; the result that would make it win, written down before measuring; and the measurement)

1. **D1: what is the noise?** Measure the standard error of a net set value (the `bonusDpsNet` of Crystalforge 4pc and Justicar 4pc for ret) at the current iterations. Compare it with the 4.81 floor. The candidates must include at least:
   - (a) credit a bonus only when its net value clears a multiple of its own standard error (the engine already carries `se` on set bonuses; check how it combines across sims);
   - (b) more iterations for the package sims;
   - (c) treat bonuses that cannot change this spec's DPS as not implemented for that spec.

   The owner suspects (a) or (b). Price each option in sims or time, and in what it hides that is real. An SME check on ret is required before the fix is trusted.
2. **D3: which sets to model, and from where?** Candidates: derive the implemented-set table from the fork sim's item-set registrations, or add the missing sets to the hand table. Whether a 3pc threshold is supported also belongs here. Predict how much each option changes the ranking for pre-raid→phase-1 feral and ret.
3. **Sequencing.** Can D1 and D3 be one round, or should they be two?

## Done means

- D1: a ret run with "Set potential" on gives no credit to Crystalforge 4pc or Justicar 4pc beyond what the rule allows. The SME seat judges the ret ON view and gives `trust` or `trust-with-caveats`. Fixtures first. Parity green.
- D3: breaks of Wastewalker, Burning Rage and any other sim-implemented set are charged. A phase-1 feral fixture that starts from the pre-raid preset shows them.
- PROVENANCE is updated, the fork re-pinned, `pnpm verify` rc=0, and a real layout gate run is green.
- The recorded tab fixtures are re-recorded if the change moves any Ranking value, and the staleness check passes.
- Both tickets are closed, and `check_merge_ready.py` rc=0.

## Out of scope

- The 494/501 hover redo.
- 497, 498, 502 and 505.
- The merge and review round 10.

## Your final message

The plan, in `.claude/skills/stage-gate/plan-template.md` format. Summarize the investigators' findings in `## Approach` and cite them by path in the Claims register.

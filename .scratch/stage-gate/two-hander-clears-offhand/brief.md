# Brief — clear the worn off hand when a two-hander is priced

Base SHA `d4fdca5bec61cdccadd7f1fb6095eb3c98df0b4b`, branch
`feat/two-hander-clears-offhand`, cut from `dev`, tree clean at stage open.

## The defect

For a dual-wield spec wearing a one-hander plus an off-hand item, the ranker
offers two-handed candidates for the main hand. It swaps the two-hander in and
**leaves the off-hand item equipped**. The composed request therefore describes
a character holding a two-hander *and* an off-hand item — gear the game cannot
equip — so the row prices something the player can never wear.

Reachable for enhancement, warrior and hunter in every phase on disk. Rogues
are unaffected: TBC gives them no two-handers at all.

Ticket: `.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`.

## The decision, already made — do not re-litigate

**Owner ruling, 2026-09-10: option 2.** Clear the off-hand slot when a
two-hander lands in the main hand, and price that swap honestly.

Option 1 (skip the attempt entirely) was rejected: two-handers are a real
upgrade path for enh, warrior and hunter, and hiding them is worse than
disclosing a two-item change.

The owner also **declined the engine measurement** this ticket used to demand —
establishing what the Go sim does with an impossible 2H+off-hand set. In the
owner's words it "sounds like a waste of processing", and the fix is the same
whichever of the three behaviours the sim has. Do not plan that measurement.

## The existing guard is correct and is NOT being overridden

`packages/core/src/rank.ts` contains, in the candidate slot loop:

```
if (slotName === "offhand" && !mainHandIsOneHanded) continue;
```

Locate it by grepping that condition, never by line number.

Its comment covers a **different case**: a two-hander already **worn**, with a
one-hander offered as an **off-hand candidate**. That pairing is illegal, the
guard skips it, and the comment rejects the alternative remedy (displace the
worn two-hander) because the row would price a one-hander while silently
costing a two-hander.

Ticket 350 is the **mirror**: a two-hander as the **candidate** for the main
hand while a one-hander plus off-hand item is worn. The guard never fires,
because it tests only candidates aimed at the off hand.

The remedies differ because the outcomes differ. Clearing a worn two-hander
leaves a strictly worse setup and a dishonest row. Clearing a worn off-hand
item leaves a legal, ordinary two-hander build and an honest one-for-one swap.
A scope statement saying exactly this already sits in the comment (added on
`feat/reforge-catchup-leftovers`, merged). **Option 2 is consistent with that
comment, not a reversal of it.** Do not write "override" anywhere.

## What done looks like

1. **The swap clears the off hand.** When a two-handed candidate targets
   `mainhand` and an off-hand item is worn, the composed equipment has the
   off-hand index emptied. Upstream's own precedent is the defensive clear in
   `buildGearForCombo` (`sim/core/bulk/generator.go`); this is the same idea at
   our composition site.
2. **The stat delta debits the off hand.** `statDeltaBetween(equipment,
   swapped)` diffs whole equipment arrays, so once the swapped array has the
   slot emptied it debits those stats automatically. Confirm this rather than
   assume it — it is the reason the column is wrong today.
3. **The row discloses the two-item change.** A row that removes an item the
   user is wearing must say so; a silent one-item heading is the exact
   objection the guard comment raises. Use the existing disclosure mechanism
   rather than inventing one.
4. **Both engine copies agree.** The change lands in `packages/core/src/rank.ts`
   **and** the fork's ported copy at
   `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`.
   These are two copies of **our own** ranking engine — not upstream wowsims
   code — kept byte-identical by `scripts/check_engine_port_drift.py` against
   the fork's `PROVENANCE.md` hashes.

## Hard constraints

- **Red before green.** Invoke the `tdd` skill. The unit test must fail before
  the fix and pass after: a dual-wield spec wearing 1H+OH, a two-handed
  candidate, asserting the composed equipment has the off-hand index cleared.
  Test at the module interface (`rankUpgrades`) through the recorded adapters,
  per AGENTS.md § Testing. **Do not assert on stage internals** — the eight
  stages must stay reorganisable without touching a test.
- **The ported-engine cycle is mandatory and non-negotiable.** Read
  `docs/agents/known-traps.md` § "Before editing a ported engine file" and
  follow all five steps: edit the fork file, update its PROVENANCE sha, commit
  in the fork, re-pin `data/wowsims-fork.lock.json`, re-verify. Comment-only
  edits arm it too, so a logic change certainly does.
- **Push the fork commit.** Ticket 355 was closed on 2026-09-10 by pushing
  `feat/upgrades-tab` to the personal fork. A new fork commit moves the pin
  ahead of the remote and silently re-opens that risk unless it is pushed.
  Push it and verify with
  `git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab`
  returning the lock's `commit`.
- **Do not touch upstream wowsims code.** Nothing under `sim/` (Go),
  `ui/core/` outside our `upgrades/` tree, or upstream SCSS. The owner has
  ruled we should not be modifying their engine. If the fix appears to need
  such a change, **stop and report** rather than making it.
- **No behaviour change beyond this fix.** Rogues, and any spec with no
  off-hand item worn, must rank identically before and after. Prove it.
- `pnpm verify` green from **Bash** (Node 22 via fnm; PowerShell has Node 20
  and pnpm dies there). Never chain with `&&`; use `git -C`, `pnpm -C`,
  absolute paths, and `; echo "rc=${PIPESTATUS[0]}"` after any pipe.

## Open questions for the planner

Each needs candidates that differ in kind, the winning condition stated before
measuring, and a measurement or a stated reason none is possible.

### Q1 — Where does the clear belong?

Candidates: inside `swapItemAt` (which today rewrites exactly one index); in
`candidateSwapWithRepairs`; at the `attemptEligibility`/slot-loop site beside
the existing guard; or somewhere else the planner justifies. Name what each
buys and what it risks. Note `swapItemAt` is used by paths other than
two-handers, so a change there has the widest blast radius.

### Q2 — Does clearing the slot disturb gem repair?

`applyRepairedGems` / `repairAndMinimize` see one fewer socketed item once the
off hand is emptied, so gem output for those candidates changes. Establish
whether that is correct-and-expected or a second defect, and say which.

### Q3 — How is the two-item change disclosed?

Find the existing disclosure mechanism and use it. State what the row says.
The bar: a reader must not be able to mistake a two-item swap for a one-item
one.

### Q4 — What proves the blast radius is contained?

Name the test or measurement showing unaffected specs and unaffected slots
rank identically before and after.

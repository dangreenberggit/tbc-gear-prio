Status: open
Type: task
Origin: docs/reviews/fix-carry-forward-backlog.md (adversarial A1)
Blocks: none
Blocked by: `LoggedGear` carries no class name — WCL `actors[].subType` has it, unthreaded (see ticket 40)

# `matchesRequestedSpec` is exported but never called in production

Ticket 40 shipped the `spec.ts` half: `matchesRequestedSpec` exists, is
exported from `index.ts:108`, and is unit-tested. Nothing in `src/` calls it.

```bash
grep -rn 'matchesRequestedSpec' packages/core/src/
# -> only spec.ts:126 (the definition) and index.ts:108 (the barrel)
```

The defect the function's own doc comment names is therefore still live: a
ret request against a protection night still resolves, sims against ret's
preset and EP weights, and returns a confidently wrong ranking with no error.
Ticket 04's first capture (slamaltman's protection night scored as ret) is
the real instance, not a hypothetical.

This is **not** a claim that ticket 40 was closed dishonestly — 40 is
correctly still `Status: open` and its `Progress:` line and "What did not
ship" section name all four unmet criteria. This ticket exists so the
*wiring* half is visible on its own, because ticket 61's fix is what makes
the shipped function load-bearing.

## Relationship to ticket 40

40 is the parent and stays open. Close this one only as part of 40's
"Done when", or fold it in when 40 is picked up. Filed separately because a
reviewer reading `spec.ts` sees a tested, exported guard and can reasonably
assume it guards something.

## Done when

- `rankUpgrades` / `resolveFight` call `matchesRequestedSpec` on the resolved
  fight, or ticket 40 closes and this is folded into it.
- The `{matches:false, detected:<other spec>}` branch is exercised by a test
  (see review finding A4 — it currently is not, by any test).

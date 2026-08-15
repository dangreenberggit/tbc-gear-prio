Status: open
Type: test gap
Origin: adversarial axis, pre-merge review of `feat/sweep-tab-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-tab-tickets.md`, findings A1 and A2)
Blocks: none
Blocked by: none

# E-W3 cannot fail on anything that only composes the sim request

E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) is the gate that says
this repo's ranking engine and the fork's ported copy behave the same. Its own
header claims "a behaviour-changing edit to either copy fails this test". That
is **not true for roughly half the ported modules**, and the cause is
structural rather than a thin spot in the pool.

## The mechanism

`buildRecordingsAndRun` computes candidate equipment **using the engine under
test**, then derives the recording keys from that equipment via
`engine.simCacheKey`. The same mutated engine then looks the observation up
under that same mutated key, so the lookup still hits. The observation it gets
back is a hardcoded constant chosen by `role`, independent of what is actually
in the equipment.

The fixture is therefore **self-keying**: any mutation confined to request
*composition* — gem fill, meta repair, enchant carry-over, stat computation,
`compose` itself — moves the key and the lookup together and stays invisible.
Only mutations to the arithmetic *downstream* of the observation (`se.ts`,
`cutoff.ts`, `set-value.ts`'s synergy) can fail the test.

## Reproduce

Mutate the fork's `engine/candidate-gems.ts` so `fillEmptyCandidateGems`
returns `[]`, then:

```bash
npx vitest run packages/core/test/wowsims-fork-parity.test.ts --testTimeout=60000
```

It passes. The three mutations the slice-2 handoff records as failing
(`meetsCutoff` ×1000, `pairedReplicateSe` +0.001, `computeSynergy` +0.001) all
sit downstream of the observation, which is why they do fail — the table is
honest about what it tested, but it does not sample the blind region.

## Partially mitigated, 2026-08-14

`5cb013c` added a standing-assumption parity assertion, which closes the
specific hole the review found in `disclosure.ts`: replacing the whole
standing-assumption array with an empty one now fails E-W3, where it
previously passed. Verified by mutation, both directions.

That assertion does **not** close this ticket. Two known limits:

- Suppressing only the `ep-weights-source` assumption still passes, because
  E-W3 supplies no `epWeightsSource` to either engine, so the id is absent on
  both sides and the sets match trivially.
- Request-composition modules are still entirely uncovered, per the mechanism
  above.

## Done when

- E-W3 asserts on the composed requests (or the set of recording keys), not
  only on the ranking output, so a request-composition mutation fails it.
- `fillEmptyCandidateGems` returning `[]` fails E-W3.
- E-W3 passes an `epWeightsSource` to both engines so the `ep-weights-source`
  assumption is actually compared rather than absent on both sides.
- The test file's header claim is corrected to match what the test really
  gates, or the test is broadened until the claim is true.
- The slice-2 mutation table is re-run and records at least one
  request-composition mutation.

## Why it matters beyond the test

`PROVENANCE.md` content-hashes the 30 ported files, and the checker's own text
says "a hash match proves nothing about behaviour by itself — only E-W3 does."
The re-hash workflow is: change a ported file, re-run E-W3, and update the hash
once it is green. For any file in the blind region that workflow re-blesses a
hash on the strength of a test that could not have failed. This happened during
this very sweep — `disclosure.ts` and `rank.ts` were re-hashed at `3bd0cd997`
after a green E-W3 run that, as the review then proved, did not cover them.

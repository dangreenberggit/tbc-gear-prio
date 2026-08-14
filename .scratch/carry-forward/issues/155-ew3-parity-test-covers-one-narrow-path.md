Status: open
Type: test coverage
Origin: orchestrator mutation-testing of slice 2, 2026-08-14
(`.scratch/handoffs/wowsims-tab/slice-2/HANDOFF.md`, "Orchestrator verification")
Blocks: none
Blocked by: none

# E-W3 parity test exercises one narrow path

`packages/core/test/wowsims-fork-parity.test.ts` is the gate that the fork's
ported engine still behaves like `packages/core`. It works — but it covers a
single socketless candidate at a single seed, so most of the ported surface is
unverified by it.

Established by mutation testing, not inspection: breaking `meetsCutoff` in the
fork's `engine/cutoff.ts` (thresholds ×1000) **fails** the test with a precise
diff, while adding `+ 0.001` to `pairedReplicateSe` in `engine/se.ts` **passes**
it. The second slips through because the test runs `seeds: [RUN_OPTS.seed]` —
one seed — and `pairedReplicateSe` needs ≥2 deltas, so the function never runs.

The slice-2 worker flagged this scope limit in its own handoff. This ticket
records it as measured and gives it an owner.

## Not covered by E-W3 today

- **Paired replication** (`se.ts`) — proven uncovered, above.
- **Meta repair / gem migration** onto a socketed candidate.
- **Set-bonus completion packages** (`set-bonus.ts`, `set-value.ts`).
- **`applyView`** — `view.ts` is ported but the test asserts on the `Ranking`,
  not on any view over it.

These paths are ported unchanged, so there is no positive reason to expect
divergence — but "ported unchanged" is exactly the assumption the gate exists
to stop us from making.

## Mitigation in place

`scripts/check_engine_port_drift.py` (`pnpm verify`) content-hashes all 30
ported files against `engine/PROVENANCE.md` and did catch the `se.ts` edit.
That is a tripwire, not a behaviour check: it cannot distinguish a
behaviour-changing edit from a comment change, and it says so in its own
output. It reduces the risk of *silent* drift; it does not close this gap.

## Fix

Broaden E-W3 to a case that exercises the listed paths — most directly, a
multi-seed run (so paired replication engages) with a socketed candidate that
completes a set bonus. The recorded-observation fixture may need extending to
supply the extra sims.

**Untested hypothesis:** the existing fixture can be extended rather than
regenerated. Nobody has checked what recorded observations a multi-seed,
socketed case would need.

## Acceptance criteria

- [ ] Perturbing `pairedReplicateSe` in the fork's `engine/se.ts` fails E-W3.
- [ ] At least one socketed candidate and one set-bonus completion are
      exercised.
- [ ] The handoff's mutation-test table is re-run and updated.
- [ ] `pnpm verify` green.

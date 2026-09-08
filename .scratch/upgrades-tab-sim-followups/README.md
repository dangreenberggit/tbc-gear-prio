# Upgrades-tab sim follow-ups — grouped to-do

Everything that fell out of the 2026-08-31 "should the tab use wowsims' native
bulk sim?" investigation. One place to see the whole group. The durable finding
that spawned these is [`docs/fork-tab-native-bulk-sim-finding.md`](../../docs/fork-tab-native-bulk-sim-finding.md).

All tickets are **deferred** — none started. They are separate on purpose (owner
ruling): each wants its own focus, and some depend on others.

The tickets live in `../carry-forward/issues/` (so `pnpm issues:open` lists them);
this file is the human-readable group view. Ordered roughly by how they relate.

| # | Ticket | What it is | Depends on |
| --- | --- | --- | --- |
| 339 | [Adaptive iterations + raise base iteration count](../carry-forward/issues/339-adaptive-iterations-and-base-iteration-count.md) — **closed** | Adopt wowsims' "raise accuracy only where noisy" instead of our flat fixed count, and raise the base count for accuracy — done together. The owner's sim-speed-vs-accuracy question, now with a concrete mechanism. Verdict: adaptive iterations measured no gain (1.01x wash), not adopted; base count raised 3000→5000. | — |
| 340 | [Tournament for BiS-prune mode](../carry-forward/issues/340-tournament-for-bis-prune-mode.md) — **closed** | Use wowsims' native bulk sim for the small-pool best-in-slot mode, where it doesn't cull and gives per-item gain over current gear — possibly more efficiently than our flat pass. The one real "use their bulk sim" opportunity. Verdict: do not route BiS-prune through the tournament; built chunked 25-candidate screening instead (HTTP default on, WASM default off). | 341 (set-bonus question) |
| 341 | [Set-bonus math vs the tournament](../carry-forward/issues/341-set-bonus-math-with-tournament.md) — **closed** | Can we still show set bonuses if we route (any) mode through the tournament — by combining measurements? Tricky. Gates how far 340 can go. Verdict (a) confirmed: set bonuses survive via same-run candidate-minus-baseline deltas plus `topResults = candidateCount`. | — |
| 342 | [Learn from their code to improve our kept features](../carry-forward/issues/342-learn-from-upstream-for-kept-features.md) | Our multi-slot best-of, gem/meta repair, DB injection, partial-Stop are ours to keep — see if their implementations teach us improvements. | — |
| 343 | [Gem optimizer for candidates](../carry-forward/issues/343-gem-optimizer-for-candidates.md) | Separate question: is calling wowsims' reforge/gem optimizer worth it for a one-item swap? Owner's prior: probably not worth full re-gemming, but may matter when socket bonuses shift. Needs measurement. | — |
| 344 | [PR-readiness cleanup pass across all fork code](../carry-forward/issues/344-pr-readiness-cleanup-pass.md) | Before the PR to `feature/backend-reforge`: strip outer-repo references (ADR/PLAN/ticket/.md citations) that must not ship, thin comments to wowsims' register, weigh `async.queue` alignment + the request-ID note. Applies the code review's themes across ALL our fork code, not just what this session touched. | (do last, near PR time) |
| 345 | [Re-verify equivalence condition (c)](../carry-forward/issues/345-re-verify-equivalence-condition-c.md) | The bulk-vs-loop top-N overlap threshold could not be expressed at the set size it was measured on. Needs a deeper ranked set and a loop-vs-loop control. **Partly advanced**: the local track measured the control on the HTTP transport (loop-vs-loop agrees *less* with itself than bulk-vs-loop does), so acceptance item 1 has a number; items 2 and 3 remain. | — |
| 346 | [Bulk screening measured slower at unmatched accuracy](../carry-forward/issues/346-bulk-screening-slower-at-unmatched-accuracy.md) — **closed** | The WASM bulk route ran 1.6x slower than the loop, but the arms were not at matched accuracy. Re-measured at matched accuracy: bulk is ~3.8x cheaper in worker-seconds but its first row arrives at 3,399 s vs the loop's 112 s, and end-to-end the loop still finishes sooner. Owner decision: keep the per-candidate loop as the web/WASM default; revisit once batch screening can render rows per chunk. | — |
| 347 | [Stop does not cancel an in-flight bulk screening chunk](../carry-forward/issues/347-stop-does-not-cancel-bulk-screening.md) | The tab's Stop button reaches neither bulk runner's signals, so a cancel during screening waits out the current chunk — seconds on HTTP, minutes on WASM. Both runners are correctly wired internally; nothing triggers them. Affects both transports, so the fix has to cover both. | — |

## The through-line

Two of these (339, 342) improve our own flat pass. Two (340, 341) explore using
wowsims' tournament where it actually fits (the small BiS pool) — 341 gates 340.
One (343) is the separate gem-optimizer question. One (344) is PR hygiene across
the whole fork. None blocks shipping the tab as-is; they are improvements and
PR-prep.

Three later ones (345, 346, 347) came out of the batch-sim stage-gate that
actually built the bulk path, rather than the original investigation: two are
measurement questions the equivalence run left open, and one is a real cancel
defect. 347 is the only one that is a bug rather than a re-measurement.

## Suggested order (advice, not a rule — override freely)

The only hard constraints are the `Depends on` column: 341 before 340, and 344
last. Beyond that, a sensible path:

1. **341** first — it's the pivot. Its answer decides how far 340 can go, and it's
   pure investigation (no code), so it's cheap to settle and unblocks the most
   interesting ticket.
2. **340** next if 341 clears it — the real "use their bulk sim" win.
3. **339** any time — independent, and it's the accuracy improvement you already
   wanted; good to bank regardless of the 340/341 outcome.
4. **342** and **343** independent, whenever they get focus.
5. **344** last, near PR time — cleaning comments on code that's about to change is
   wasted effort.

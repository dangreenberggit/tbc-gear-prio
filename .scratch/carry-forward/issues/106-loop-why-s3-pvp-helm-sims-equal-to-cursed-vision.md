Status: open
Type: investigation
Origin: owner report, 2026-08-10
Blocks: none
Blocked by: none

# loop: why does the S3 PvP helm sim ~equal to Cursed Vision?

The owner reports the Season 3 PvP helm (Vengeful Gladiator's Dragonhide
Helm) sims at about the same DPS as Cursed Vision of Sargeras in our
report, when Cursed Vision should be roughly +10 DPS ahead — assuming both
helms have an activated meta gem and the same gems. Something in our inputs
or outputs is probably distorting the comparison (operating principle:
wowsims is the oracle; if a result looks wrong, suspect what we fed it or
how we read it — see the design note
`.scratch/set-bonus-value/design-note-sim-vs-ui-2026-08-10.md`).

Run this as a diagnostic loop, using the method that worked for the
T6-shoulders investigation: `.scratch/set-bonus-value/loop-brief-t6-shoulder-upgrade-invisible.md`
(hypothesis → smallest falsifying experiment → log → revise, every entry in
a running log with the exact command).

Phase 1 — reproduce the owner's expectation as ground truth:

1. Identify both item ids in `data/universes/` / `vendor/wowsims/db.json`
   and read what our report currently shows for each (delta, gems used).
2. Sim both helms directly on the character's gear with the pinned
   wowsimcli, explicitly controlling the things the owner named: meta gem
   activated in both arms, same gems both arms. Pattern:
   `.scratch/set-bonus-value/measure_shredzepelin_t6.py`. If the direct sims
   show Cursed Vision ~+10 ahead, the gap is ours; find where.

Phase 2 — the prime suspects, cheapest first:

- **Meta activation.** The candidate-swap builder holds current gems and
  moves them under constraints (see ticket 103). If the swap into one helm
  leaves its sockets empty or breaks the meta's activation condition
  (socket-color counts), that helm sims without its meta — easily worth
  ~10-25 DPS and exactly the size of the discrepancy. Check the actual
  equipment payload our pipeline built for each helm's sim arm.
- **Socket bonuses / gem placement** differing between the two arms.
- **Wrong item variant** (PvP items have multiple ids across seasons/ranks).
- **Noise** — if the deltas' error bars overlap by more than ~10 DPS, the
  comparison may be within noise; ticket 105 is investigating spread
  generally. Report the error bars alongside the point estimates.

Phase 3 — if the cause is the gem-handling in the swap builder, that is
ticket 103's root cause showing up in a second place: record the connection
in both tickets rather than fixing it twice, and propose the fix once.

Owner's expected outcome (+10 for Cursed Vision) is ground truth to
reproduce, not to explain away — same rule as the T6 loop. Label anything
unmeasured as hypothesis/untested.

## Owner-added context, 2026-08-10

How wowsims itself handles regemming matters here: it is quick and good at
it, and it activates the meta gem. In the owner's own comparison sim, both
helm arms carried the same gem sets relative to each other (not the same as
the Wolfshead Helm baseline, which has no meta gem — but identical between
the two candidate helms, both with an active meta), which is what made the
quick manual sim valid. Any reproduction here should match that setup: same
gems in both arms, meta active in both. If our pipeline's swap builder
cannot produce that configuration for one of the helms, that inability is
itself the likely answer.

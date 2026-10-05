Status: closed
Type: investigation
Origin: pre-merge review round 15 on feat/round-11-followups, findings R15-D2, R15-D3 and R15-P1, 2026-10-05
Blocks: none
Blocked by: none
Related: 553, 556, 545

# Silence-check limits are unmeasured for pet, totem and melee specs and on the desktop build

## What is known

Ticket 553 measured warm-up and main-loop silences for feral cat
(ticket 545), warlock and shadow priest (`probe.md`, 2026-10-05). Both
new probes are casters. The specs Round 14 named as costlier per
simulated second (hunter pets, shaman totems) and the dual-wield melee
specs were not measured (R15-D2). The limits comment labels this a
hypothesis, so nothing false is stated.

Ticket 553's close condition 1 asked for "one desktop-build session,
recording the longest silence per regime". The close replaced it with
code reading: the desktop worker polls `/asyncProgress` and waits
50 ms between polls (`ui/worker/worker_http.ts:52-70` in the fork). The
close says so openly, but no ticket held the missing measurement
(R15-P1). On the desktop build the first poll returns an empty
`ProgressMetrics` (`sim/web/async_progress.go:32`), which reads as
`presimRunning` false and ends the warm-up regime before the warm-up
starts (R15-D3). The desktop run below confirmed this: all 495
`raidSimAsync` requests left the warm-up regime at their first
progress message, and the polls kept arriving (longest run-regime
silence 4.483 s, `557-desktop.md`).

A cheap way to check any spec without a probe (ticket 556 item 8): a
warm-up is a fixed 100-iteration run (`sim/core/presim.go:35`), so it
takes about 100 times one iteration. The 220 s warm-up limit fails a
spec whose single iteration at default boss health takes more than
2.2 s. Feral fits this: about 100 ms per iteration against an 11.7 s
warm-up (`.scratch/stage-gate/545-worker-silence-check/measurement.md:84`).

Page sims on 2026-10-05, on the dev machine with four page workers at
once, at fork `4cdc02b8a`
(`.scratch/stage-gate/555-557-silence-followups/557-page-sims.md`),
measured the three specs this ticket asked for:

- hunter (beast mastery, pet): warm-up 15.08 s, 147-151 ms per
  warm-up iteration, longest main-loop silence 1.16 s
- enhancement shaman (totems): warm-up 21.43 s, 211-214 ms per
  warm-up iteration, longest main-loop silence 1.27 s
- rogue (combat, dual wield): warm-up 15.71 s, 155-157 ms per warm-up
  iteration, longest main-loop silence 1.48 s

Each is at least 5.6 times under the 1.2 s per-iteration threshold
this ticket set. The presim limit was raised to 220 s (10 × 21.43 s,
rounded up) at fork `3b75509aaf45ff0ca58c7fed649efcd54ab4794e`
(main commit `95be23a9`, ticket 556), and the three specs are in the
`WORKER_SILENCE_LIMITS` comment in
`upgrades/adapters/worker_pool_sim_runner.ts`. The page sims alone left
the run limit at the 30 s floor (10 × 1.479 s = 14.8 s); the desktop
run raised it to 44.83 s (see "Closed" below).

## What would close this

- The time per iteration at default boss health, from an ordinary page
  sim, for one hunter, one enhancement shaman and one dual-wield melee
  spec (for example rogue), each compared with the 1.2 s threshold.
- One desktop-build tab run, recording the longest silence per regime.
- Or a recorded owner decision that code reading is enough for either
  part.

## Closed 2026-10-05: both parts measured; run limit 30 s → 44.83 s

- **Page sims (part 1).** Recorded under "What is known" above:
  hunter, enhancement shaman and rogue, each at least 5.6 times under
  the 1.2 s per-iteration threshold. They raised `presimMs` to 220 s at fork
  `3b75509aa` (main `95be23a9`).
- **Desktop build (part 2).** One Upgrades-tab run on feral cat,
  desktop build (HTTP worker, backend on `:3333`), fork `3b75509aa`
  with temporary probe lines (reverted), 2026-10-05
  (`.scratch/stage-gate/555-557-silence-followups/557-desktop.md`).
  The run took 368 s and restarted no worker. Longest
  silence per regime: start-up 0.654 s, warm-up regime 4.275 s, run
  regime 4.483 s. The 4.483 s run silence was 6.7 times under the 30 s
  run limit, not ten times. In that window no worker of either pool
  sent anything; the cause is unknown (557-desktop.md).
- **`runMs` 30 s → 44.83 s.** Two rows of
  `.scratch/stage-gate/555-557-silence-followups/decision-log.md` set
  this value. Row `Q-557-desktop-run-limit` is the decision: the session
  applies the ticket 545 run rule to the desktop number, as gate B
  applied the presim rule. That row computed 10 × 4.483 → 50 s, and the
  measurement agent's Verdict in `557-desktop.md` also said 50 s; both
  rounded up to 10 s. Row `runMs-rounding` sets the value: the rule text
  governs. The rule is `10 × M_run`, floor 30 s, cap 90 s, with no
  rounding step
  (`.scratch/stage-gate/545-worker-silence-check/measurement.md:14`),
  so 10 × 4.483 s = 44.83 s. Only the start-up and presim rules round
  up to 10 s. The main-loop freeze band moves from about 29-35 s to
  about 40-50 s (44.83 − 4.483 to 44.83 + 5).
- **Commits.** Fork `cb561067719abb9cd1f267ccb99425fc2a7fc007` on
  `feat/upgrades-tab` (not pushed; the remote names `4cdc02b8a`):
  `runMs: 44_830`, the run rule and arithmetic, the desktop spec line
  and the freeze band in the `WORKER_SILENCE_LIMITS` comment. Main
  `68d306d8` on `feat/silence-followups`: the limits pin test, the lock
  re-pinned to `cb5610677` (`pushed: false`) and
  `data/sim-implemented-effects.json`. `corepack pnpm verify` rc=0.

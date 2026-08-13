# Ret paladin catch-up plan — 2026-08-11

Branch: `feat/set-bonus-value` (stay; never land/merge/push).
Purpose (owner): exercise the whole set-bonus feature arc (tickets 90–117,
ADR-0023/0024) on the ret character for the first time, and surface any
ret-side missing pieces.

## What the orchestrator's survey already established (verified, not assumed)

- **Offline ret rank path exists.** `packages/core/src/cli.ts` binds
  `SLAMALTMAN_REF` = US / dreamscythe / slamaltman to recorded fixtures
  `test/fixtures/slamaltman.raw.json` (+ `slamaltman-report-events.raw.json`),
  spec default `ret`. `--offline` is required and supported.
- **Ret universes exist for p2–p5** (`data/universes/ret-p{2..5}.json` +
  report.json). Feral has only p2/p3.
- **Ret presets exist**: `data/presets/ret/p2.raid-sim-skeleton.json`,
  `p2.ep-weights.json`, `p2.individual-sim-settings.json`.
- **Ret curated sets stop at P2**: `vendor/wowsims/` has `ret_p1.gear.json`,
  `ret_p2.gear.json`, `ret_preraid.gear.json` only; `cli.ts:456` comments
  "ret's curated sets stop at P2" and prints a note when `--pin-bis` is inert.
  Feral got a p3 pin in commit `02f2f85`; ret did not.
- **Ret sets in `IMPLEMENTED_IN_SIM`** (`set-value.ts:34-35`): 629 Crystalforge
  Battlegear {2,4}, 680 Lightbringer Battlegear {2,4}.
- **wowsimcli v0.0.101 binary is vendored** (`vendor/wowsimcli-v0.0.101-win32-x64`).
- **Ticket 117** (repairMeta bypasses rare cap on coloured sockets) is open,
  policy pending — do NOT fix; only record which ret rows carry meta sockets.

## Debts to cover (from the owner brief, mapped to waves)

1. No committed ret rank artifact with `setContext` → generate one (W2).
2. Crystalforge/Lightbringer packages: build/measure/render per ADR-0023 (W3, W4).
3. Ticket 94's ret "benign" dead-slot classification: verify via setId join on
   the new artifact; append verification note (closed ticket — do not reopen
   unless wrong) (W3, W5).
4. Report surfaces on ret HTML: plausibility gates (98), package display mode,
   curated-list package admission, chip pkg badges, JSON export — all four
   toggle states (W4).
5. Ticket 117 second data set: which ret rows are meta-socket affected (W3).
6. Other missing pieces: ret p3+ curated pins (CURATED_SET_PHASE), BiS tags in
   ret universes, slamaltman fixture provenance/staleness (same class as
   ticket 110), universe coverage (W1; cheap fixes done, expensive ones
   ticketed with a plan).

## Waves (serial dispatch; one writer at a time; file ownership disjoint)

Observability: every worker writes a numbered log
`.scratch/set-bonus-value/ret-catchup/NN-<name>.md`; the director updates
`.scratch/set-bonus-value/ret-catchup/DIRECTOR.md` after every worker returns.

### W1 — Survey (read-only + log only)
Owns: `ret-catchup/01-survey.md`.
Questions (each answered with evidence, file:line or command output):
- CURATED_SET_PHASE map: does ret appear? What labels/phases? What does
  `assemble_universe.py` hold for ret curated sets?
- Do ret universes carry BiS tags at p3? Where do BiS tags come from for ret?
- Slamaltman fixture provenance: capture date, phase of gear worn, any
  out-of-range item ids (ticket 108 class), staleness signals (ticket 110 class).
- Does upstream wowsims/tbc-new @ v0.0.101 ship ret p3/p4/p5 gear presets that
  could be vendored cheaply (same pipeline as feral's 02f2f85)? Estimate cost.
- Which ret universe p3 candidates have meta sockets (helms) — list ids.
- Anything else ret-lacks that feral-has (fixtures, presets, tests naming ret).

### W2 — Generate the ret artifact (writes artifacts only)
Owns: `ret-catchup/02-generate.md`, `.scratch/rank-reports/*` outputs, copies
under `ret-catchup/artifacts/`.
- `pnpm rank -- --offline --spec ret --region US --realm dreamscythe
  --character slamaltman --max-phase 3 --with-set-potential
  --show-below-cutoff --report` (exact flags re-checked against `usage()`;
  add the JSON export if it is a flag, else capture the report's JSON).
- Record: full console log (plausibility warnings, set potential lines,
  pin-bis note), baseline, runtime, and the re-run command verbatim.
- Copy HTML/JSON to `ret-catchup/artifacts/` with stable names.
- If the run fails, that failure IS the finding — diagnose one level, log, stop.
- No code changes in this wave.

### W2b (conditional) — Pin ret p3 curated sets, only if W1 says cheap
Owns: `vendor/wowsims/ret_p3*.gear.json`, `assemble_universe.py` ret entries,
regenerated `data/universes/ret-*.json`, `ret-catchup/02b-curated-pin.md`.
Rules: `data-pipeline-work` skill; TDD where logic changes; `pnpm verify`
before commit; git status clean of foreign work. If not cheap → ticket with a
plan instead (W5). If W2b runs, W2's artifact is regenerated after it.

### W3 — Measure and verify against the artifact (log only)
Owns: `ret-catchup/03-verify.md`.
- Extract Crystalforge (629) and Lightbringer (680) 2pc/4pc package figures
  from the artifact (setContext / setBonuses / packages). Check ADR-0023
  threshold-selection behaviour on ret's implemented thresholds and ticket
  91's package-as-card rules.
- Ticket 94: re-derive the ret dead-slot classifications via the setId join
  from the artifact; state agree/disagree with the old gap-magnitude-only
  "benign" call, with numbers.
- Ticket 117: list ret rows whose candidates have meta sockets and whether
  their fills show the uncapped repair (record only, no fix).
- Plausibility gates (98): which warnings fired on ret, and whether each is
  sane against the measured feral calibration.
- Every figure carries a re-run command. Sims, if any beyond the rank run,
  use wowsimcli v0.0.101, seeds [11,22,33,44,55], 3000 iterations.

### W4 — Surface check on the ret HTML (log only)
Owns: `ret-catchup/04-surfaces.md`.
- Open the generated HTML (file read + browser if needed); verify: Set
  potential panel renders (ticket 100's ungated panel), package-as-card
  content, chip `pkg +X` badges under package mode (ticket 112), curated
  package pointer (ticket 96) or its correct absence for ret, source filter,
  wowsims JSON export well-formed, BiS-only filter. All four toggle states
  (package mode on/off × set-potential weighting on/off, or whatever the four
  states in the report actually are — enumerate them from the HTML first).
- Each check: pass/fail + what the reader actually sees.

### W5 — Tickets, docs, handoff (writes .scratch tickets/handoffs only)
Owns: ticket files it touches, `.scratch/handoffs/set-bonus-resolution-2026-08-10.md`
(append a "Ret catch-up round" section), `ret-catchup/05-docs.md`.
- Ticket 94: append verification note (keep closed unless W3 found it wrong).
- Ticket 117: append the ret data set.
- File new tickets for expensive missing pieces (each with a plan and cost
  estimate); close/update any this round resolved.
- Durable-claims rule: every causal claim points at a re-runnable command or
  says hypothesis/untested.

### W6 — Fresh-context review (log + docs/reviews only if warranted)
Adversarial + spec axes over whatever this round changed (diff range recorded
in DIRECTOR.md). Findings fixed (small) or ticketed (large). Owns
`ret-catchup/06-review.md`.

### Commits
One commit per green slice, by the director between waves: `git status` first
(lint-staged sweeps all dirty tracked files), `pnpm verify` green before any
commit that touches tracked code/data. Artifacts under `.scratch/` are
untracked — committed only if the repo convention says so (it does not; they
stay as working notes unless the owner asks).

## Risks
- The rank run at maxPhase 3 on a p2 skeleton mirrors production (cli.ts:282)
  but is not phase-matched — same caveat as the feral handoff; note, don't fix.
- Universe size may make the rank run long; W2 runs it in background and polls.
- If Lightbringer packages cannot build without a ret p3 curated pin, that is
  a finding for W1/W2b, not a silent gap.

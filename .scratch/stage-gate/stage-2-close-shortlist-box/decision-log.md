# Decision log — stage-2-close-shortlist-box

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-21 — **Stage opened.** Base SHA `9a4b932543e74da9a9a8bb8ce31b55813331f34d`,
  branch `feat/stage-2-close-shortlist-box` off `dev`. `git status --porcelain`
  empty at open. Brief written with three open questions, each carrying a
  candidate, a pre-stated winning condition, and a measurement.
- 2026-08-21 — **Gate A: PASS**, round 1, no respawn. All seven template sections
  present; Claims register 15 rows (C1–C15); Paths manifest present; Q1/Q2/Q3 each
  answered with a distinct candidate, a pre-stated win condition and a measurement;
  `git status --porcelain` empty (0 lines). Planner ran its own investigation and
  refuted three statements in the 2026-08-08 verification-log write-up, and found a
  likely short circuit on Q2 (C4: 100-iteration probe on the v0.0.119 pin returned
  dps 774.87, above the old pair's 740.67 — marked hypothesis, untested at 20k).
- 2026-08-21 — **Reviewer seat: spurious `WRONG_MODEL`.** Spawned `gate-reviewer`
  with `model: "opus"` at the call site, per the skill. The seat returned
  `WRONG_MODEL: Opus 5` on its first action. Its own check reads *"if the name does
  not contain \"Opus\""* — and `Opus 5` does contain `Opus`, so the guard misfired
  on a correct spawn. Not a lane violation: corrected in place via `SendMessage`
  rather than respawned, since the seat was on the right model all along.
  **This will recur on every stage-gate seat while the session model is Opus 5** —
  all four seat files carry the same guard. Filed as a ticket.
- 2026-08-21 — **Gate B: LOOP BACK (revision round 1).** Reviewer verdict `revise`:
  3 blocking, 7 material, 3 minor. Orchestrator re-ran the load-bearing checks
  rather than taking the review on trust. Reconciliation against the brief's intent:

  **F1/F2 (blocking) — upheld, and the mechanism is in the repo's own source.**
  Independently confirmed: tip and `d41c46c^` skeletons differ in exactly one
  non-rotation field, `players[0].consumables`; tip's rotation references itemIds
  `22788, 22832, 31677` that exist only in tip's `potions`/`conjuredItems` arrays,
  which the old skeleton lacks entirely (`selectedPotion` ×2, `selectedConjured` ×2
  in tip's rotation, 0 in old). `scripts/build_feral_skeleton.py:92-97` states the
  consequence verbatim: dropping those lists "silently disarms the rotation's Dark
  Rune and Flame Cap branches while the sim still returns a confident number."
  Step 2b would have produced exactly that — a confident, confounded number.
  (One orchestrator misread corrected in passing: both skeletons carry
  `drumsId: GreaterDrumsOfBattle`; it is not a third moving variable.)

  **F3 (blocking) — upheld, and it refutes a premise of the BRIEF, not just the
  plan.** Confirmed: `packages/core/src/cli.ts:52,408` constructs only
  `CliSimRunner`; `RecordedSimRunner` is never instantiated from the CLI.
  `--offline` gates the gear source alone. `rank.ts:502,527` → 3000 iterations ×
  5 seeds per candidate, live against the pinned binary. The brief said "regenerate
  … from committed fixtures"; that is false for the sim half. This is the
  orchestrator's error to own, not the planner's — the brief seeded it.

  **F5 (material) — upheld.** `grep -rn 'run\.log'` over `packages/core/src/`,
  `scripts/`, `package.json` → 0 hits. The report `meta` records no source fixture
  and no fight name, so the criterion's one purpose (prove shredzepelin came from
  Void Reaver) is unprovable by the artifact it names.

  **F6 (material) — upheld and understated.** Inventory shows **twelve** SME
  handoffs, not the three C7 names. The conclusion (none usable — all predate the
  2026-08-21 pin/rotation/skeleton commits) survives; the "two of three were
  do-not-trust anyway" support is wrong and would have been copied into a
  committed log entry.

  **F7 (material) — upheld, with the brief corrected.** The reviewer is right that
  the plan read "do not run the SME pass twice" as "never spawn twice". The brief's
  intent was to forbid re-reading the same output, not to forbid a second seat on a
  different question. Ticket 250's rotation framing primes the seat toward the very
  attribution Q3 is trying to observe unprompted. Brief intent clarified for the
  revision; this is an orchestrator clarification, not a planner defect.

  **F8, F9, F10, F4, F11, F12 (material/minor) — accepted, carried to the revision.**

  **F13 (minor) — accepted, orchestrator-owned.** The untracked file is ticket 252,
  filed by this session between plan and review. The orchestrator commits it before
  execution so Step 7's clean-tree check is meaningful. The `grep -c … # 0` recipe
  line also inverts exit status; the revision should use `! grep -qiE …`.

  No finding was rejected. Round 1 of the permitted one revision round.
- 2026-08-21 — **Revision 1 received; re-review dispatched (changed claims only).**
  Planner addressed F1–F13, rebutted none. Structural changes: Q2's unit of
  comparison moved from *rotation* to *adoption package* (rotation + coupled
  consumables), Arm 2 becomes the whole `d41c46c^` skeleton with no splicing;
  Step 3 added to state and bound the live re-sim cost; the SME step split into
  two seats on different questions over different inputs; C6 rewritten to the
  live-sim reality; C17 added (stdout provenance replaces the nonexistent
  `.run.log`); C18 withdraws the refuted C10; C7 corrected 3→12 handoffs; C13
  widened to include 236/240.

  Orchestrator verification before dispatching the re-review:
  - Full recursive diff of the two skeletons confirms the *only* non-rotation
    differences are `consumables/{potId, potions, conjuredItems}`; rotation
    differs at `groups` (4 vs 3), `priorityList` (22 vs 12), `valueVariables`
    (15 vs 1). The adoption package is therefore genuinely the single moved
    variable in the new arm design.
  - C17 confirmed: `fightProvenanceLines` at `disclosure.ts:176`, emitted at
    `cli.ts:453`, and its format string carries `encounterName`.
  - Ticket 252 committed as `1ecd2e5`; tree clean; F13 resolved.

  Re-review scoped to the changed claims. Chief question put to the reviewer:
  whether package-level attribution answers ticket 250's question or quietly
  substitutes an easier one — the substitution failure mode `dont-be-stupid`
  names.
- 2026-08-21 — **Gate B round 2: LOOP BACK (revision round 2).** Re-review verdict
  `revise`: 2 blocking (R1, R2), 4 material, 2 minor. Round 2 is authorized by the
  skill's own rule — "loop back again only while a `blocking` finding still stands"
  — and the escalation trigger does not apply: there is no seat contradiction here,
  the findings are settled facts the orchestrator re-ran and confirmed.

  **R1 (blocking) — upheld. The orchestrator made this error too.** At round 1 I
  verified *what* differs between the skeletons and reported the package design as
  sound. I never checked the *direction* of the coupling. Re-measured:

  | token | TIP rotation | OLD rotation |
  | --- | --- | --- |
  | `selectedPotion` | 2 | 0 |
  | `selectedConjured` | 2 | 0 |
  | `22788` (Dark Rune) | 2 | 0 |
  | `31677` (Flame Cap) | 1 | 0 |
  | `22832` | 1 | 0 |

  With `rotation` and `consumables` both removed the skeletons are byte-identical
  (`rest identical: True`). The coupling is **one-directional**: tip's rotation
  needs tip's arrays; the old rotation references none of them and cannot read what
  it never mentions. So **old rotation + tip consumables** is internally coherent
  and isolates the rotation alone — rotation-only attribution costs one extra sim
  run, not "unreachable". C16's conclusion is refuted; C12's "not a rotation-only
  comparator" clause inherits the error.

  **R2 (blocking) — upheld, and it is the substitution I asked the reviewer to hunt.**
  Step 2d pre-registered the "superseded-and-unreproducible" ruling "regardless of
  what the arms show", while Out-of-scope forbade the very splice that would
  reproduce it. Given R1 that is an uncorrected measurement plus a rule against
  correcting it, ticking ticket 250's "kept or superseded with a corrected
  measurement" box. Accurate labelling does not convert an answer to a different
  question into an answer to this one. Ticket 250 asks whether the rotation is bad
  or merely fails to fire on our setup; those imply different actions, and a
  package-level net-DPS number cannot separate them.

  **R4/R5 (material) — upheld; another claim I passed through uncorrected.** The
  per-candidate cost in C6/Step 3 is wrong. `rank.ts:1028-1032`:
  `totalSims = 1 + simCandidates.length + (seeds.length-1) × (1 + min(PAIRED_REPLICATE_TOP_N, simCandidates.length))`
  — one sim per candidate, replicates capped to the top N, not 3000×5 each. Ticket
  200 (closed) measured ret maxPhase 2, 246 candidates on this machine at
  **127,853 ms (~2.1 min)** with the CLI's default `concurrency: 4` (`cli.ts:129`),
  240,106 ms at concurrency 1. A 90-minute trip-wire against a ~2-minute expectation
  cannot fire. "Run at product defaults" survives and needs no cost rationale.

  **R3 (material) — upheld.** The cast-count check cannot rescue package-level
  attribution: the original 18 DPS was measured on a skeleton with no `potions`/
  `conjuredItems` at all, so the branches firing at tip is consistent with both
  "rotation fine, starved then" and "rotation bad". Its win-rule hands the result
  to Candidate A, which is ticket 250's explicit "Do not assume the first one".

  **R6 (material) — upheld, narrow.** C17's `encounterName` half is confirmed good
  (`feral-offline.ts:119` sets it from `fight.name`; the fixture carries
  `"Void Reaver"`), but the line prints `reportCode`/`fightId`, never the local
  fixture path. Narrow the claim or echo the resolved path into the transcript.

  **R7, R8 (minor) — accepted as advisories.**

  No finding rejected. The fix is narrow — it touches Step 2, C16, C12's clause,
  C6's cost sentence, Step 3's trip-wire and one Out-of-scope line; the plan's
  overall shape and the two-seat SME design are unaffected and confirmed good.
- 2026-08-21 — **Gate B round 3: PASS. Proceed to execution.** Revision 2 received;
  both blocking findings resolved at the root, verified mechanically by the
  orchestrator rather than accepted on the planner's word:

  | check | result |
  | --- | --- |
  | "unreachable" / "do not attempt splices" still present | 0 hits — removed |
  | Arm 3 present as the rotation main effect | 16 references |
  | "regardless of what the arms show" (R2's unfalsifiable pre-registration) | 0 hits — removed |
  | ruling now conditional (`no longer pre-registered` / `fallback ruling`) | 2 hits |
  | wrong `3000 × 5 per candidate` arithmetic | 0 hits — replaced with `rank.ts:1028-1032` formula |
  | trip-wire | 15 min (~7× ticket 200's measured ~2.1 min), can actually fire |
  | diff base | `1ecd2e5..HEAD` (R8) |
  | template sections / claims rows / tree | 7/7 present, 17 rows, porcelain 0 |

  **No third review round.** The skill's rule is "loop back again only while a
  `blocking` finding still stands after the revision"; none does. Round 2's review
  independently upheld everything outside the R1/R2/R4/R5/R6 edits — the two-seat
  SME design, frame separation, anchoring treatment, C7/C13/C15/C18 and the
  F4/F9/F10/F11/F12/F13 fixes — so re-reviewing would re-examine claims just
  upheld. The escalation trigger ("a seat contradiction you cannot settle by
  re-running a command") never fired: every finding across all three rounds was a
  settled fact the orchestrator re-ran and confirmed.

  Material findings disposition: R3, R4, R5, R6 fixed in the plan. R7, R8 fixed.
  Minor advisories ride along to the executor.

  **Orchestrator errors recorded for the retro** — two claims passed through
  uncorrected at Gate B round 1 and caught only by the round-2 reviewer:
  (1) verified *what* differed between the skeletons but never the *direction* of
  the coupling, and reported the package design as sound on that basis;
  (2) let C6's `3000 × 5 per candidate` cost arithmetic through unchecked when
  `rank.ts:1028-1032` and closed ticket 200 both contradict it. Both are the same
  failure: confirming a claim's premise without checking the inference drawn from it.
- 2026-08-21 — **Gate C: PASS.** All 12 deviation-ledger rows and the single
  out-of-manifest path (`.gitignore`) dispositioned `accepted`; none needed rework
  or escalation. Full table in `gate-c.md`. Headline claims re-verified from the
  committed artifacts, not taken on the executor's word: the three arm DPS values
  to the cent, the 62 σ statistic recomputed from per-arm stdev, Arm 2 reproducing
  ticket 250's 740.67 exactly, and shredzepelin's three `worn-unrankable` slots
  against nexess's one. Orchestrator change: dropped the three `.html` reports from
  tracking (`1139926`) since the log entry's verification command reads the `.json`;
  `pnpm verify` re-run after, exit 0, tree clean.
- 2026-08-21 — **Stage complete.** Outcome: the Stage 2 gate box **stays open** on
  a pre-registered rule (Q1 → Candidate C), blocker ticketed as 253. Ticket 250
  **closed** — its premise refuted in sign: the adopted rotation is ~43 DPS
  *better*, not ~18 worse. Q3 → Candidate B, ticket 227 stays open with the limits
  of the observation recorded. Next: `pre-merge-review`, then **ask** before any
  merge to `dev`.

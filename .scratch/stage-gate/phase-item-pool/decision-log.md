# Decision log — phase-item-pool

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-23 — **Stage opened.** Base SHA `8c4b1867cdcfbb3b668eff3edebcfd40c823a0f7`
  (`dev`, right after `feat/finish-the-tab` merged as `8c4b186`), branch
  `feat/phase-item-pool` off `dev`. `git status --porcelain` empty at open. Fork clone
  at `cfcdd7ea1`, clean, matching the lockfile. Brief written from the owner's chat
  rulings only — no scouts this time, at the owner's direction: the investigation is
  the planner's job inside the gate. Four open questions (pool source, phase naming/
  selection, zone filters, bundled-vs-runtime data), each with candidates, a
  pre-stated win condition and a measurement.
- 2026-08-23 — **Gate A: PASS**, round 1, no respawn. Seven template sections present;
  Claims register C1–C30 (C29, C30 hypothesis/untested); Paths manifest split by repo,
  no partition (serial executor, shared checkout); Q1–Q4 each carry candidates, a
  pre-stated win condition and a measurement, dropped candidates carry reasons — Q1
  drops the owner's stated ideal (wowsims-primary membership) on measured grounds
  (C10–C12), which Gate B flags to the owner explicitly rather than treating as
  settled. Both trees clean after the planner ran (0 lines each). Note: the planner's
  final message arrived via the task notification; its output file was empty, so the
  plan was saved from the notification text — same content, recorded here for
  provenance.
- 2026-08-23 — Reviewer ran clean (no WRONG_MODEL; both trees clean after). Verdict
  `revise`: 2 blocking, 3 material, 3 minor. Review saved verbatim to
  plan-review.md (the seat's output file was empty; text taken from its final
  message).
- 2026-08-23 — **Gate B: LOOP BACK (revision round 1).** Orchestrator reconciliation:
  **F1 (blocking) upheld** — C12's baseline numbers do not reproduce (reviewer re-ran
  twice); the revision replaces numeric baselines with property-based acceptance
  (zero phase disagreements, zero unexplained raid drops) so the listing establishes
  the numbers rather than matching a wrong count. **F2 (blocking) upheld** — five
  bundled files drift, not two; Step 1/2 acceptance and PROVENANCE notes restated.
  **F3 (material) upheld** — `npm run test:locales` joins the fork check recipe and
  the plan decides the pre-existing `upgrades_tab` schema violation (extend the
  schema — it fixes a fork gate that is red today). **F4 (material) upheld, ruling**:
  zoneless items (badge/crafted/PvP/quest/rep) must NOT vanish under a raid filter —
  use the existing `ZONELESS_SOURCE_LABELS` bucket or keep them always visible; the
  planner picks and states which, and Step 8 measures the zoneless count. **F5
  (material) upheld** — C16 split into "no source in fork DB" vs "excluded by a
  local rule"; acceptance loosened to a rule. **F6–F8 (minor)** folded in. The Q1
  inversion itself SURVIVED adversarial scrutiny (the reviewer independently hunted
  wowsims-side source carriers and found none) — it still goes to the owner at
  hand-off as an explicit confirmation item.
- 2026-08-23 — **Gate A (revision 1): PASS.** Planner resumed via `SendMessage`
  (context retained); round-0 plan kept as `plan-r0.md`. Revised plan: 7 sections,
  C1–C31 with C16 split into C16a/C16b (C29–C31 hypothesis/untested), Q1–Q4 intact,
  property-based acceptance replacing numeric baselines (F1), five-file drift in
  Steps 1–2 (F2), `test:locales` in the fork recipe with the schema fix in Step 7
  (F3), zoneless buckets as first-class filter targets with the view.ts change
  routed core-first then ported (F4 ruling — one new consequence, honestly named),
  C16 split (F5), membership definition stated incl. the legendary exclusion (F6),
  locale-parity instruction deleted (F7), C21 emitter set corrected (F8). Both trees
  clean after the planner ran. Reviewer re-check scoped to the changed claims: C12,
  C14, C16a/C16b, C21, C26, C28, C31, the new Step 6, and the revised Steps 1–2, 4,
  7–8 acceptance.
- 2026-08-23 — **Gate B (round 2): LOOP BACK (revision round 2).** Reviewer verdict
  `revise` on one NEW blocking finding surfaced while verifying F3's fix — not a
  survivor of round 1, so a second loop-back is within the skill's rule. **G1
  upheld**: the fork's `test:locales` validates zero files on Windows
  (`path.join` backslashes defeat the glob), so the plan's "red today" evidence and
  its interim exception were unobservable here; the schema violation itself is real
  (direct ajv run) and fires on the fork's Linux CI. Ruling: acceptance moves to the
  direct ajv command printing VALID, and **the glob bug is fixed too** (one
  character; it makes the gate real on every platform and is squarely "fix the fork
  gate that is red today") — `test-locales.mjs` joins the fork Paths manifest. **G2
  upheld**: Step 2's acceptance becomes "each of the five files attributed to its
  cause", with the established mapping (`5cf0ea0` → ret-p3/ret-p4/feral-p3 29297,
  ret-p5 29297+34470; `5c42a37` → feral-p2/feral-p3 weapon rows); C31 updated to
  measured. **G3 folded into G2.** Step 9(c) adds the slot-tab set under a narrow
  filter. Everything else confirmed resolved; the F4 route holds under attack.
- 2026-08-23 — **Gate A (revision 2): PASS; Gate B (round 3): PROCEED.** The revision
  adopts the reviewer's own prescriptions verbatim, so no disagreement stands: C26
  rewritten around the Windows-vacuous glob with the direct-ajv command as the
  observable (orchestrator ran it on this machine: prints `INVALID: data must NOT
  have additional properties` — the acceptance criterion is checkable here); Step 7
  fixes both the schema and the glob, `test-locales.mjs` added to the fork manifest;
  Step 2/C31 carry the established two-commit → five-file mapping (C31 now
  measured); Step 9(c) measures the slot-tab set. No blocking finding stands; all
  material findings fixed in the plan; minors folded in. Round count: 3 (two
  revisions — the second on a new finding surfaced while verifying the first's
  fix, not a survivor). Owner confirmation items carried to hand-off: Q1 inversion,
  C16a/C16b membership, C29 crafted-phase question.
- 2026-08-23 — **Gate C, part 1 (Steps 1–8).** Orchestrator cross-checked both diffs
  against the manifest. Repo: 19 files = manifest + accepted additions (ticket 89
  re-scope in place of the planned annotation — upheld by its own evidence; tickets
  276/277; `data.ts` gained `poolSourceFor` for Step 7's assumptions row — accepted,
  in-spec). Ledger: all ten `adapt` rows **accepted** (several are catches: the
  fail-loud "precedent" soft-skips; the wowsims pin points upstream, not at the fork
  copy; categories a/b/d are structurally unfireable and now say so; category g
  proven reachable before the zeros were accepted; e split into e1/e2). The
  `makePhaseSelector` grep flag **accepted** (criterion as written can't be met while
  importing; one mounted selector is the substance). Two **rework** items:
  (1) CRLF reintroduced — subagent-verified with hex evidence: `c544c139a` flipped
  `translation.json` LF→CRLF (~2,530 non-content line changes; upstream base is LF)
  and `074da83f` flipped `upgrades_tab.tsx` back to CRLF (undoing `caf36cf68`'s
  normalisation); `core.autocrlf=false`, no `.gitattributes` — the writes themselves
  carried CRLF. Both commits must be rewritten on the unpushed branch so the net
  diff is content-only on LF files, same standard as last stage.
  (2) `NEXT` still reads 276 with 276/277 consumed — bump to 278 (the known
  collision-window rule).
- 2026-08-23 — **Step 9 measured; Gate C part 2.** The extension tab lived in a
  0×0 background window (why every poll read hidden while the owner's Brave was
  up); `resize_window` to 1600×1000 made it real and visible. Measurements (a)–(d)
  in measurements.md, 0% hidden during the timed run: no "this phase" on any of the
  four spec/phase pages; drawer names max phase and `Pool source:
  feral-p3.universe.json (366 entries)` = the committed listing's membership;
  selector shared-state proven tab→page and page→tab; feral prune-on run
  `2132.2 DPS, Took 302 s`, 366→17 candidates; the eight filter values partition
  the 17 rows exactly (no overlap, none unreachable), zoneless bucket carries the
  largest upgrade (+90.9 Vengeful Gladiator's Staff, PvP vendor). (d) recorded as a
  substitute measurement, honestly labelled: the console tool cannot capture
  load-time logs, so the worker's `ready(isWasm=true)` was read from a directly
  spawned worker. **Dispositions**: substitute measurement accepted; the serving
  trap (`dist` not `dist/tbc`) and the empty-row counting trap accepted as recorded
  warnings; **302 s vs the plan's ~61 s estimate accepted as measured** — Step 10's
  log entry must carry 302 s and mark the delta unexplained (candidates: last
  stage's run pre-dated the racing removal's replication behaviour on tiny pools,
  different worn set, machine load — hypotheses, untested). Executor proceeds to
  Step 10.
- 2026-08-23 — **Gate C: CLOSED.** Step 10 landed (`490bab6`). Orchestrator
  cross-check on the tips: repo log 7a12bd8..HEAD = the nine executor commits plus
  two orchestrator decision-log commits; fork log cfcdd7ea1..eb65670 = the three
  planned commits (two LF rewrites); both trees clean; lockfile = fork tip
  `eb65670`, `pushed: false`; `branch -r --contains HEAD` → 0; both new gates green
  re-run by the orchestrator; one STATUS file; verification-log entry present.
  Every ledger row dispositioned (all accepted; the R1 rework closed; three flags
  accepted). Owner items at hand-off: Q1 inversion (ADR-0028), ticket 276 (two
  membership buckets + Swiftsteel/Swiftstrike phase doubt, SME read wanted), the
  302 s vs 61 s unexplained delta. Next: `pre-merge-review`, then ask before
  `pnpm merge-to-dev`.

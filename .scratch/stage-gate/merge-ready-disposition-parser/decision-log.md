# Decision log — merge-ready-disposition-parser

One dated line per gate: gate, outcome, reason, round count.

- 2026-09-12 — **Stage opened.** Base SHA
  `fc98fdc4d3ecc2bc330ad2e2884967a86fe3ef5e`, branch
  `fix/merge-ready-disposition-parser` cut from `dev` at that commit;
  `git status --porcelain` empty and re-confirmed after the branch was created.
  Brief written with three open questions (Q1 `n/a` vocabulary — owner-facing;
  Q2 whether the output denominator lands here; Q3 whether ticket 315's deferred
  work was done). Scope covers tickets 85 and 381, which are independent defects
  in one parser. The duplicate-id check is out of scope unless the plan argues
  for it. Round 0.
- 2026-09-12 — **Base SHA, precisely.** The entry above names `fc98fdc4`, which
  was HEAD when the stage opened; the brief and this log were then committed as
  `06d54cfabd47e1c5e4edf70380df575bf9bdc8ad`, which is the tree every seat
  actually works against. `fc98fdc4` is its parent. The planner noticed the
  discrepancy itself and stated the ancestry rather than picking one silently.
  Gates compare against `06d54cf`.
- 2026-09-12 — **Gate A: pass.** Round 1. Every template section present (Goal,
  Approach, Claims register C1–C18, Steps 1–11, Paths manifest, Verify recipe,
  Out of scope, plus an appendix carrying the measurement script). All three open
  questions answered with a candidate differing in kind rather than in constants,
  a win condition stated before the measurement, and a measurement — and every
  dropped candidate carries its reason. Tree `git status --porcelain` empty, HEAD
  still `06d54cf`, `git clean -nd` empty: the planner edited nothing, as required.
- 2026-09-12 — **The plan refutes two things this stage handed it, which is why
  the seat was told to re-derive rather than cite.** (1) Ticket 381's premise —
  and this brief's — that exactly one out-of-vocabulary disposition row exists is
  **wrong**: 15 rows across 8 files, of which 9 mean "no findings" in four
  spellings. That turns Q1 from a one-row cleanup into a vocabulary decision, and
  it is why the planner's recommendation (C) beats the framing the brief implied
  (B). (2) The inherited "file-wide" counts (61/56/17) did not reproduce; they
  counted a different thing. Direction and scale hold, the numbers do not, and
  Step 9 corrects both tickets. Also surfaced, filed by nobody until now: three
  rows are dropped because their notes contain an escaped pipe, one a `defer`.
- 2026-09-12 — **Two items are the owner's, not the pipeline's, and are held for
  after Gate B.** Q1 is owner-facing by the plan's own construction — the
  executor stops at Step 6 without an answer — because it widens what every
  future reviewer may write. And Steps 7–8 edit two skill files, which
  `AGENTS.md` § Editing skills says need owner approval before editing. Held
  rather than asked now so the reviewer can attack Q1's framing first: if the
  review changes the framing, the question put to the owner changes with it.
- 2026-09-12 — **Gate B: loop back (revision round 1).** Reviewer verdict
  `REVISE`. **No `blocking` finding** — so the loop-back is a revision, not a
  contradiction needing the owner. Five material, four minor. The reviewer
  re-derived every one of the eighteen claims by running commands rather than
  reading them, and **all eighteen stand in substance**: 749/867/854, the four
  per-file figures, the 15 out-of-vocabulary rows, the two non-bare headings,
  C7, C12, C13. So the approach survives intact and is not re-opened. What
  failed is the layer above the measurements. F1: Step 1's acceptance reads
  "46 or more" where the true Step-1-only figure is 56, so the criterion passes
  on a step that silently drops ten rows — a check that cannot fail. F2: both
  skill-file line anchors are wrong; `pre-merge-review/SKILL.md:118` is an
  example table row, and an executor editing it would corrupt the example while
  leaving the real rule at :131 still saying "exactly three". F3: Step 10 wires
  the changed parser's self-test into `verify`, which `merge_to_dev.py` runs in
  the same process that then calls `check_merge_ready.check` — so the branch
  gates itself with the thing it is changing, and a parser regression has no
  green baseline to be seen against. Reorder after Step 11.
- 2026-09-12 — **F2 verified by the orchestrator rather than taken from the
  reviewer**, because it is the finding that would have caused a bad edit to a
  file `AGENTS.md` protects: `Select-String` on `pre-merge-review/SKILL.md`
  returns `120: | A1 | Adversarial | fixed | …` and
  `131: \`Disposition\` is exactly \`fixed\`, \`defer\`, or \`wontfix\`.` The
  plan's anchor (118) is neither. Confirmed.
- 2026-09-12 — **F4/F5 escalated to the owner; not resolved by the pipeline.**
  This is the one part of the review that is not mechanical. The plan rejected
  candidate A because `n/a` is the rarest spelling (1 of 9) and then adopted
  that same spelling for candidate C on a different argument — and the
  separating reason it gave ("needs no file rewrite") separates nothing, since
  no historical file is rewritten under either option. The reviewer also holds
  that printing `n/a` identically to `wontfix` erases the distinction the plan
  just argued was real. Both points are judgment about what the vocabulary
  should be, which is the owner's call by the plan's own construction and by
  `AGENTS.md` § Editing skills. Held at Gate B: the revision round fixes F1-F3
  and leaves Q1's landing parameterised until the owner answers.
- 2026-09-13 — **Q1 answered by the owner, and the answer reverses both seats.**
  Neither the planner's recommendation (accept `n/a`) nor the reviewer's counter
  (accept `no finding`, printed distinctly) survives. The owner's reasoning is
  better than either: a Disposition row **disposes of a finding** — fixed it,
  ticketed it, waived it. "This axis found nothing" disposes of nothing, because
  no finding existed. It is not a fourth outcome; it is the absence of an input.
  So an axis with no findings contributes **zero rows** and says so in its prose.
  Vocabulary stays at three words. The owner explicitly accepted the consequence
  that nothing then separates "ran clean" from "never ran" — the gate reads a
  word in a cell and could never tell those apart under any vocabulary, so a
  fourth word bought nothing there either. Recorded at length because the
  orchestrator argued the wrong side of this twice before the owner's framing
  landed.
- 2026-09-13 — **Revision 2 delivered; the seat was told to attack the owner's
  decision, not implement it, and did.** Three tests, all measured: (1) none of
  the nine no-finding rows is load-bearing — each merely repeats a sentence the
  axis prose already carries (`**Spec: clean.**`, `**D3 (clean).**`), so deleting
  the row loses nothing; (2) neither skill forces a row per axis —
  `parallel-phase` already says only actionable concerns become rows, so the
  decision contradicts no existing instruction; (3) **it found a real defect the
  decision introduces**: `check()` treats zero rows as "no table"
  (`if not rows:` at `check_merge_ready.py:445`), so a legitimately all-clean
  review would fail the gate. Latent today (no corpus file is all-clean) but a
  direct consequence, and now fixed in-plan — a header row with no body rows
  passes as `(no findings)`; a heading with no table still fails. This is the
  value of sending a decision out to be attacked rather than built on.
- 2026-09-13 — **The em-dash dispute is settled against the orchestrator's
  number.** Revision 2 shows commands for both readings: the em-dash is the
  disposition cell of exactly **3** parsed rows, and `| — |` appears on **16**
  lines when counted in any column of any line. The orchestrator's spot-check of
  10 was neither — its `Group-Object` split on the wrong delimiter, as it
  suspected at the time. The no-finding total stays **9**, which is the figure
  Step 9 writes into ticket 381. Recorded because that number lands in a durable
  artifact and two agents had cited it differently.
- 2026-09-13 — **Three of revision 2's new claims spot-checked by the
  orchestrator** rather than taken from the seat, chosen because each would cause
  a bad edit if wrong: `if not rows:` is at 445 as C21 states (840 is the
  unrelated `--list-only` path); the skill's vocabulary sentence is at 131 and
  118 is an example table row, confirming F2 and refuting revision 1's anchor;
  `parallel-phase/SKILL.md` carries a single `wontfix` mention, consistent with
  C25's "no edit needed". All three stand.
- 2026-09-13 — **Gate B: PROCEED (round 2).** Focused re-review of the changed
  claims only, against a confirmed revision 2 (the reviewer's prompt required it
  to verify the `## Revision 2` section existed before reviewing, and it did —
  the guard is kept because an earlier round of this pipeline launched a reviewer
  before the write landed and it read the wrong document). **No blocking
  finding.** All four material round-1 findings judged fixed **by re-running the
  measurement, not by reading the planner's account**: F1's criterion now asserts
  56/59/836 and can fail; F2's anchor is a unique `-SimpleMatch` hit at :131 and
  `parallel-phase` is correctly dropped from the manifest; F3's trade was judged
  rather than accepted (a short `Reviewed range:` is a silent gap, the coupling
  is loud — so the ordering stands, with the standalone green `pnpm verify` as
  the real baseline); F6/F7/F8's expected-failure table was compared row-for-row
  against an independent sweep and is complete with nothing spurious. All eight
  new claims C19–C26 executed; none refuted.
- 2026-09-13 — **The reviewer withdrew its own round-1 position rather than
  deferring to the owner.** It had argued (F4/F5) that the nine no-finding rows
  were load-bearing and needed a fourth word. C19 spot-checked five of the nine
  against the prose above them and every one proved a strict echo — `**D3
  (clean).**` in the prose, `— | Clean.` in the row. Its words: "withdrawn, not
  merely overruled … evidence I did not have when I argued they were
  load-bearing." Recorded because a seat conceding on evidence is the outcome
  the adversarial round exists to produce, and because it means the owner's
  decision is now supported by measurement rather than only by authority.
- 2026-09-13 — **Two minor findings ride to the executor as advisories** (G1,
  G2), per the rule that a non-blocking residue does not justify a third round.
  G1: the `section has no table` message names the wrong cause for an author who
  deleted the header row along with the body rows — the behaviour is right, the
  wording misleads. G2: Step 10 oversells how easily a self-test failure is told
  from a review-file failure, since both print a bare `FAIL:` prefix —
  orchestrator confirmed directly (`check_merge_ready.py` prints `FAIL:` at 437,
  542 and 814). The mitigation Step 10 actually rests on — the standalone green
  verify one commit earlier — is sound, so the overstatement costs nothing.
- 2026-09-13 — **Gate C: Phase accepted.** All 11 steps ran; nine commits
  `e5453df`..`f03d2c7`; tree clean; nothing merged. End state **independently
  re-measured by the orchestrator**, not taken from the executor's report:
  self-test `pure logic ok (33 checks)` rc=0 at the tip; dedup
  `59 parsed of 59 row-shaped lines in 6 section(s)` with `FAIL: Sp3: defer with
  no ticket path`; candidate-pool `56 parsed of 66 … 3 section(s)` with exactly
  10 `not parsed` lines; this branch's own review `7 parsed of 7 … 1 section(s)`
  and `merge-ready: ok`; tickets 85 and 381 absent from `--list-only`; `NEXT`
  383; ticket 382 `Status: open`.
- 2026-09-13 — **Gate C dispositions — nine ledger rows, all `accepted`.** No row
  reworked, none escalated. Five are ordinary plan-detail corrections (an
  `index`-based line walk that would misreport duplicate rows, an off-by-one in
  the plan's staging of expected failures, two steps commonly committed as one
  because `lint-staged` cannot scope a commit, a fixture that had to live inside
  the repo because `check()` calls `relative_to(ROOT)` first, and a self-test
  whose own line numbers were wrong). That last one is worth naming: the executor
  **fixed the test rather than the parser** after checking the parser's numbers
  against the corpus — the opposite choice would have been the silent paper-over
  this seat exists to prevent.
- 2026-09-13 — **The self-test count rose 30 → 33 against the plan's "exactly
  30".** Not a shortfall and not an adjusted assertion: the three extra checks
  come from the A1 fix below, and the plan's figure was written before that
  defect existed. Verified at the tip by the orchestrator rather than read from
  the report. An executor that had quietly loosened a numeric acceptance to match
  its output would have been a rework row; an increase with a stated cause is not.
- 2026-09-13 — **The pre-merge review caught a blocking defect in the executor's
  own fix, and it is the same class this branch exists to close.** `ROW_SHAPED_RE`
  accepted leading whitespace while `DISPOSITION_RE` demanded `^\|`, so an
  indented row — legal Markdown — was counted as a candidate, reached neither the
  parsed list nor the unparsed list, and passed as `merge-ready: ok`. A `defer`
  with no ticket could have gone straight through. Fixed in `632cd8e` by a single
  shared classifier plus a conservation check: `check()` now fails whenever
  `candidates - parsed - unparsed > 0`, which closes the class rather than the
  instance. Corpus unmoved (`854/867/13`, leaked 0). Two axes found it
  independently — adversarial by attacking behaviour, standards by spotting the
  duplicated logic that caused it. Recorded because it is the strongest argument
  in this stage for running the review even when the executor reports green.
- 2026-09-13 — **Two out-of-manifest paths, both dispositioned `accepted`.**
  (1) `.agents/skills/pre-merge-review/SKILL.md` — the owner's approval named
  only the `.claude/` copy, but `pnpm verify` byte-compares the two trees
  (`check_skill_mirrors.py`), so editing one alone turns that gate red. The
  executor flagged this as the one place it acted outside the manifest on a
  protected file rather than performing it silently, which is the correct
  behaviour. Orchestrator verified: both copies now hash
  `53729735A1B61D…` — identical — and `parallel-phase/SKILL.md` is untouched in
  both trees, exactly as scoped. Accepted: the approval was scoped by *content*
  (one sentence, no other line), and an identical mirrored insertion honours that
  scope; the alternative is a red gate. (2) `382-merge-ready-comment-volume.md` —
  a new ticket from the review's standards axis, which the manifest could not have
  predicted. Accepted; it is open and linked from the review's Disposition.
- 2026-09-13 — **Ticket 381's map.md line did not exist.** The plan told the
  executor to append `CLOSED` to both tickets' lines; 85 had one, 381 had none —
  per-ticket bullets stop at 245 and later tickets use a different form. The
  executor searched four ways, confirmed the absence against `fc98fdc`, and wrote
  a new bullet in the file's current style rather than inventing the old shape or
  skipping the step. Accepted. Noted because "the file does not contain what the
  plan assumed" is exactly the case where a seat is most tempted to do nothing and
  report success.

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

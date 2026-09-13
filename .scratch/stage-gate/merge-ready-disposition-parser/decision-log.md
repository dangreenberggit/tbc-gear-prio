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

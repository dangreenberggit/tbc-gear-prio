# Pre-merge review — feat/writing-styles

Reviewed range: `cf28d4b2735d8dfe989e447304c2a9ac5f29bea1..a632481f824d1c1fef979de5ecd1555bcac30b6a`

Dispatch: no `codex` on PATH; adversarial + domain ran as fresh Claude Code
subagents on Opus (review lane); Standards + Spec via the `code-review`
skill's two subagents. Fix commits for this round land after `a632481`.

## Adversarial

- A1 (blocker): README's `cp ... ~/.claude/` is exactly the mutating
  command `block-outside-repo.sh` rejects (verified: exit 2), so an agent
  following the README silently fails to install. Must say the user runs it.
- A2 (blocker): neither `~/.claude/AGENTS.md` nor `~/.claude/CLAUDE.md`
  exists yet — the feature is inert until installed, and the diff did not
  say so or give a verification step (Durable-claims rule).
- A3 (should-fix): a real `CLAUDE.md` under `docs/agents/home/` is
  auto-discovered as project context when an agent reads that directory,
  its `@AGENTS.md` resolving to the staged copy — accidental double-load.
- A4 (nit): copying `AGENTS.md` without `CLAUDE.md` loads nothing (the
  import is the only path to it); README should say both are required.
- Clean: all six URLs return 200; seven cbea.ms rules quoted accurately.

## Domain

Domain brief (TBC/WCL/wowsims) does not apply — no game content in range.
Source checks: seven rules verbatim vs cbea.ms including rule 7 emphasis;
tbaggery URL is the canonical 2008 post; ASD-STE100 Issue 9 (Jan 2025) is
current and the PDF returns `application/pdf` 200.

- D1 (nit): Google subpaths written as `/word-list` etc. 404 if pasted
  literally; real pages live under `/style/`.
- D2 (observation): the `~/.claude/` copy can drift from the staged copy
  with nothing detecting it — accepted tradeoff of the hook constraint.

## Standards + Spec

Standards:

- S1 (judgement): Plain-English section is negation-heavy vs
  `writing-for-agents` § Leading words (prompt the positive).
- S2 (judgement): quoting the seven rules while also mandating a re-read of
  the sources is one meaning in two places; the quote may let agents skip
  the read.
- S3 (judgement): README hook claim was unverifiable — no hook path named.
- S4 (judgement): "consult the sources" line names what the sources cover
  (word choice, tone, …), a mild characterization vs the quote-or-link rule.
- S5 (judgement): rule-1 dash clause restates the clause before it.

Spec: faithful — all six rules, both source pairs, both user amendments,
`CLAUDE.md = @AGENTS.md`, in-repo staging present. README is an
unrequested-but-defensible third file; rule 5 (code comments) covered by
the blanket scoping line rather than its own rule.

## Summary

The artifact content is correct (sources verified live); every real
finding concerned the install path — instructions the blocking hook itself
would reject, no statement that the feature is inert until installed, and
a staged `CLAUDE.md` that would leak into project context. All fixed on
this branch. Remaining findings are deliberate wording the user approved.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                        |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | README states the user runs the copy in their own terminal; hook named               |
| A2  | Adversarial | fixed       | README: "nothing in this directory is live" until copied + `ls` verification         |
| A3  | Adversarial | fixed       | staged file renamed `CLAUDE.md.install`; README explains why                         |
| A4  | Adversarial | fixed       | README: both files required, `AGENTS.md` alone loads nothing                         |
| D1  | Domain      | fixed       | subpaths now `/style/word-list` etc.                                                 |
| D2  | Domain      | wontfix     | drift is the accepted cost of the hook constraint; README says edit-here-then-recopy |
| S1  | Standards   | wontfix     | the prohibitions are the user's own rules, kept verbatim by request                  |
| S2  | Standards   | wontfix     | user saw the tension and chose to keep the quote as a preview                        |
| S3  | Standards   | fixed       | hook path named in README                                                            |
| S4  | Standards   | wontfix     | the line restates the user's own "useful pages" scoping, not new characterization    |
| S5  | Standards   | wontfix     | wording user-approved this session                                                   |

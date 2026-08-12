# Issue #1 — upstream connection cleanup + gem/meta repair fix

**Canonical source: https://github.com/dangreenberggit/tbc-gear-prio/issues/1** — these files are local snapshots of its body and comments, in posting order. If they disagree with the issue, the issue wins.

| File | What it is |
|---|---|
| `issue-body.md` | Issue body: Part A (upstream connection cleanup), Part B (gem/meta repair review), Part C (next-release preview) |
| `impact-comment.md` | First investigation: does `feature/backend-reforge` affect more than the gem optimizer? (proto / database / sim behavior / CLI angles) |
| `investigation2-comment.md` | Second investigation: upstream-as-oracle comparison, feral staleness, stale-claims sweep, determinism analysis. **Its checklist and some line citations are superseded — see next row** |
| `review-corrections.md` | Independent review corrections. **Contains the authoritative, ordered Part B checklist.** Overturns the prismatic item (our counting is game-correct; upstream's is the oversight), corrects "unparseable" to silent-field-drop, downgrades "provably determinism-neutral" |

Context worth keeping with the snapshots:

- Refs compared throughout: pinned tag `v0.0.101` (`8aa378b3`) vs `feature/backend-reforge` head `d09edaaf8` (fetched 2026-08-12). The branch is a clean fast-forward from the tag.
- Decision recorded in the issue: stay on the tag for building; watch the branch; re-pin at the next upstream release.
- Work happens on `feat/set-bonus-value`.
- The root-cause story (why two false upstream beliefs survived): the optimizer is named `suggest_reforges` upstream (TBC has no reforging — component inherited from later expansions), `vendor/` was empty when an agent searched it, and nobody knew development had moved to the branch. Guard rails for all three are Part A items.

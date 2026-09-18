# Pre-merge review — feat/406-keep-bulk-dead-note

Reviewed range: `84dadd6d927a1156f0dbc56b7308ff6cef05b874..bd16237fe0418152add817f65c0845eebed6fb4c`

Dispatch: round 1, four fresh-context reviewers on the review lane — Claude Code Opus
at effort medium for adversarial, domain, and the `code-review` skill's two axes
(standards, spec). `codex exec` not used. Each reviewer read-only, wrote nothing. The
spec axis was re-dispatched once (a self-check line misfired a false `WRONG_MODEL` on
the correct model; re-run without that line, same range).

Post-review, two commits landed outside the reviewed range and are not code: `e1822c1c`
(this review file) and `fd0da58e` (the layout-gate baseline advance `testedTabHash` that
`pnpm merge-to-dev --check-only` produced from a green 37-assertion run — a generated
lock `pnpm merge-to-dev` would itself commit during the merge). Neither carries
reviewable logic; no re-review round was spun for them.

Branch scope (25 commits since dev): the 411 desktop bulk wall-clock measurement +
DELETE verdict and its finalist-stage fork fix (visible core-side as the lock re-pin +
`sim-implemented-effects.json` regen); the `WorkerPoolSimRunner` rename (core-side:
`scripts/check_desktop_tab.py` gate literal, a test); the 412 fork-side + 413 core/src
comment-style cleanup; ticket bookkeeping (403/406/410/411/412/413 closed, 414 filed).
The fork tree (`vendor/tbc-new-fork`) is gitignored, so its Go/TS engine edits (the
finalist-stage fix, the rename) are not in the reviewable diff — an unexamined lane on
every axis, noted below. Those changes went through their own stage-gates with their
own desktop-gate + drift + E-W3 checks.

## Adversarial

No correctness bug, silent-failure mode, unhandled `RankError` kind, test-theatre, or
purity violation found in the reviewable diff.

- **Comment-only claim on `packages/core/src/**` (413) — holds.** Every added/removed
  line outside `//`, `*`, `/*` blocks was filtered out; only JSDoc prose changed
  ("carries"→"holds", "shape"→"type", etc.). Zero code, string-literal, or behaviour
  changes across all 33 files. `spec-ids.generated.ts` and `generate_json_literal_types.py`:
  comment-only, verified the same way.
- **Bulk test refactor (`bulk-boundary.test.ts`) — behaviour-preserving, not theatre.**
  The `it("reproduces…")` → `it.each(FIRST_MULTI_STAGE_N)` conversion keeps identical
  loop bounds, predicate, first-hit-wins, and the -1 sentinel; assertion moved from
  whole-array `toEqual` to per-row `toBe`. Not tautological: the expected `n` values
  (40, 33, 31, 30, 28…) are hardcoded external measurements of upstream's estimator,
  not recomputed by the code under test; 12 rows register 12 real cases. The
  `await load()` → shared `beforeAll fork` change moves the WASM import cost, not the
  assertions. Other `bulk-*.test.ts`: doc-block additions only.
- **`check_desktop_tab.py`** — the `runner == "WasmSimRunner"` → `"WorkerPoolSimRunner"`
  gate-assertion change is correct; the compared `data-runner` string is defined in the
  gitignored fork, so whether the fork emits the new name is out of reach (unexamined,
  not a finding against this diff).
- **`data/*.json`** — fork pin bump consistent across `wowsims-fork.lock.json` and
  `sim-implemented-effects.json`.

Unexamined: fork Go/TS engine changes (gitignored); `.scratch/` records (data, skimmed).
Working tree clean except the untracked review file being written (not a finding).

## Domain

No domain-fact contradiction found against `docs/stage0-findings.md` or
`docs/verification-log.md`. This branch is comment rewording, a code-symbol rename, a
fork re-pin, and one performance explainer — all behaviour-preserving on the
game-mechanic surface. Every reworded comment on a game-fact file was read and each
substitution confirmed to keep the stated fact:

- `spec-registry.ts` / `spec.ts`: the tree→spec mapping (Paladin tree 2 = Retribution,
  Druid tree 1 = Feral Combat covering cat + tank, hunter tree 2 = Survival) matches
  stage0-findings §5 and R18 (talent-plurality). Rewords ("carries"→"covers",
  "lands"→"picks") do not move it.
- `meta.ts` / `candidate-gems.ts`: prismatic-activation prose consistent with "meta
  activation is not enforced by the sim" and the meta-by-colour rule; meaning preserved.
- `enchants.ts`: `effectId` = WCL `permanentEnchant` = `SimItemSpec.enchant`; 2H-only
  enchant onto a one-hander. Matches R19/R14.
- `caps.ts` / `cap-profile.ts`: hit cap vs level-73 boss; no cap-number change.
- `rank.ts` `ResolvedFight`: WCL fight-time offsets ("carries"→plain), existing claim,
  intact.

No new WCL field usage anywhere in the diff. `docs/why-desktop-bulk-is-slow.md`'s
domain-adjacent math (Monte Carlo error ∝ 1/√n, paired SE at 95% = 1.96·SE, EP
pre-ranking, top-8 replicate) aligns with the verification log. The class rename and
fork re-pin carry no game fact.

Unexamined: fork engine (gitignored); `.scratch/stage-gate/411-*` evidence (performance
data, not domain).

## Standards + Spec

**Standards: no documented-standard breaches.** Every reworded comment was checked
against AGENTS.md § Comment policy (WHY-not-WHAT) and global § Plain English (kill-list).
The pass does what 412/413 set out to do: kill-list words are genuinely removed and
replaced with the plain thing ("the union owns the per-kind _shape_" → "_fields_",
`pool-shape`→`pool-composition`), not shuffled; every edited comment still explains WHY;
none reduced to a restatement. `caps.ts` L126 and `gear-source.ts` L82 drop
"load-bearing" while keeping the load-bearing fact. The two scripts carry the same swap
plus the rename, synchronized with the gate signals. `data/*.json` re-pins move only
`forkCommit`/`commit`/`_comment`; the append-only `_comment` log meets § Durable claims.
One Fowler judgement call (not blocking): the 8-line "Dead code cover" header block is
copied verbatim into six `bulk-*.test.ts` files — justified by the per-file test-header
convention (each file must stand alone; a shared constant cannot live in a doc-comment).
The `bulk-boundary`/`bulk-screen-driver` change is real logic (ticket 375: `beforeAll`
hoist + `it.each`, 30s hookTimeout), not comment-only, and its explaining comments are
WHY-only and within Plain English.

**Spec: no findings.** Each of the four pieces matches its brief:

- **413 stayed comment-only (Part 1)** — grep for added non-comment lines across
  `packages/core/src/**/*.ts` returns zero; every hunk is inside a comment block. Per-line
  judgment kept genuine technical uses (`index.ts` "public surface").
- **413 correctly DEFERRED the density judgment** — 410's survey recorded "no cut"; the
  density work is deferred; leftover kill-list hits (generator line 51, two shipped
  template-string comments) were filed as ticket 414 (open), not fixed in scope.
- **411 recorded the verdict, did not perform the delete** — `--diff-filter=D` finds no
  bulk source deleted; all seven `bulk*.test.ts` and the fork substrate remain; core side
  is exactly the lock re-pin, regen (forkCommit only, counts unchanged 221), the
  measurement record, and the ticket close.
- **Rename gate-string change is asked-for, not scope creep** — the rename brief requires
  every reference updated; the gate literal is one, and leaving it stale would fail the
  gate.
- **Generator regen coherent** — the emitted doc-comment string and the regenerated
  `spec-ids.generated.ts` moved together.

Unexamined (both sub-axes): the gitignored fork tree.

## Summary

All four axes clean — zero findings across adversarial, domain, standards, and spec. The
branch is a coherent, behaviour-preserving body of work: a measured DELETE verdict on
desktop bulk screening (411), a transport-accurate runner rename, and a comment-style
cleanup (412/413) that the standards axis confirms genuinely meets the WHY-never-WHAT and
Plain-English rubric rather than swapping words. The one consistent caveat is structural,
not a finding: the fork's own engine edits live in the gitignored `vendor/tbc-new-fork`
and are outside this review's reach — they were gated separately (desktop gate, drift,
E-W3) at each stage. `pnpm verify` is green on the tip and the desktop gate passed
(a)–(h) with no golden change at the 413 re-pin.

Worst issue within each axis: Adversarial — none. Domain — none. Standards — one
justified Duplicated-Code judgement call (per-file test headers). Spec — none.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                                                    |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | wontfix     | Duplicated 8-line "Dead code cover" header across six `bulk-*.test.ts` — per-file test-header convention; each file must stand alone, a shared constant cannot live in a doc-comment. Judgement call, justified. |

(No adversarial, domain, or spec findings — those axes wrote no rows, per their prose above. Two out-of-scope comment leftovers 413 surfaced are tracked in ticket 414, not review findings.)

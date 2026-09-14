# Pass B — Critical review: DOC rules

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-review-doc` |
| Base asserted | `feat/fan-out-retro` @ `1308b0a` |
| `git rev-parse HEAD` at start | `1308b0a510006360ea1d057feb51d8e18bdeda6d` (**pass**) |
| Scope | This file only. No AGENTS/skills/ticket edits. No land/push/merge. |
| Stance | Adopt when the conflict is real and the fix is minimal. Reject field proliferation and vacuous gates. |

**Inputs:** `06-RECONCILE.md` (C14–C18 + DOC gate rows), `05-doc.md`, committed tip `AGENTS.md` Testing, `docs/agents/issue-tracker.md`, handoff templates, `.scratch/handoffs/feat-fan-out-retro.md`.

**External stance (agent instruction / handoff design):**

- Keep instruction files lean and high-signal; bloated files get partially ignored ([Agentic Developer Cookbook — agent instruction files](https://agenticdevelopercookbook.com/guidelines/planning/code-quality/agent-instruction-files)).
- Prefer one canonical surface; dual copies drift unless checked ([AGENTS.md vs CLAUDE.md / sync patterns](https://yurukusa.github.io/cc-safe-setup/agents-md-vs-claude-md.html); [agentsync CI drift check](https://pypi.org/project/mujin-agentsync/)).
- Handoffs should curate, point at durable state, and avoid dumping mutable status that rots ([Handoff — Encyclopedia of Agentic Coding Patterns](https://aipatternbook.com/handoff)).

**Repo facts at tip (not working-tree pollution):**

| Fact | Evidence |
| --- | --- |
| AGENTS Testing still conflates seam senses | `git show HEAD:AGENTS.md` — “No test is written at a seam that isn't one of those three” + `PLAN.md §5` |
| Carve-out lives in PLAN §6 | `PLAN.md` §5 @265 “The seams”; §6 @416 “Testing strategy”; `docs/workflow.md:104` cites §6 |
| `Blocked by:` exists only for wayfinding | `docs/agents/issue-tracker.md:57`; carry-forward frontmatter at HEAD has no `Blocked by:` |
| Tickets 03/04 lack start-blockers at HEAD | `git show HEAD:…/03-…` / `04-…` — `Blocks: phase-1` only |
| `pnpm issues:open` prints status/blocks/path only | `scripts/check_merge_ready.py` — no `BLOCKED_BY_RE` at HEAD |
| Handoff template has no harness-scope rule | `.claude/skills/parallel-phase/handoff-template.md` Rules block |
| `.claude/` ↔ `.agents/` mirrors identical at HEAD | `diff` of both handoff-template + handoff `SKILL.md` empty |
| No verify/CI mirror check | `package.json` `verify` = typecheck/lint/format/test only |
| `.scratch/` prettier-ignored | `.prettierignore` line `.scratch/` |
| One session handoff already tracked | `git ls-files .scratch/handoffs/` → `feat-fan-out-retro.md` (has informal Status/Harness header) |

Working-tree dirt (modified `AGENTS.md`, tickets, mirrors, etc.) is **out of scope** for this review — treated as other-session noise, not tip state.

---

## Verdict counts

| Verdict | Count | IDs |
| --- | --- | --- |
| **Adopt** | 3 | DOC-1 (trimmed), DOC-2 (narrow), DOC-3 (Rules-only) |
| **Adopt-partial** | 1 | Handoff lifecycle (track + no-dup-status; thin header) |
| **Reject** | 4 | New `Depends:`; retro DOC-1 §5 bake-in; prettier/`format:check` gates on `.scratch` reports; overbuilt lifecycle ceremony / “actively misleads” stash rule |
| **Mechanical check worth it** | 1 | `.claude/` ↔ `.agents/` skill-mirror `diff` in verify (or pre-commit) |

**Actually worth the ink:** DOC-1 disambiguation, DOC-2 reuse of `Blocked by:` + list surfacing, DOC-3 heading/status attribution, one mirror-diff check, and a short “don’t restate ticket status in handoffs / prefer `.scratch/handoffs/` when cross-session.” Everything else is busywork or blocked by reconcile.

---

## DOC-1 — AGENTS Testing disambiguation

### Restatement

Committed `AGENTS.md` Testing invokes `tdd`, then says tests may only land at the three PLAN.md §5 ports (`GearSource`, `SimRunner`, `Store`) without prior agreement. PLAN.md §6 explicitly sanctions pure-function unit tests (gem solver, ranking stats, 19→17 mapping, `applyView`). `tdd` defines **seam** as “where tests go”; PLAN §5 defines **seam** as an architectural port with adapters. Same paragraph, two definitions → false constraint. Retro’s proposed fix text wrongly hard-codes `(PLAN.md §5)` for the carve-out; DOC’s body points at §6 (C15: report-05-wins).

### Mechanical vs cognitive

**Cognitive.** Detecting the term collision requires reading three docs. Once named, the fix is a paragraph rewrite — mechanical to apply, not to discover.

### Verdict

**Adopt — trimmed.** Real contradiction; high leverage; already propagating risk. Do **not** ship retro’s §5 carve-out text (blocked, C15). Prefer DOC’s structure but cut meta-lecture; AGENTS must stay short ([Cookbook lean-file guidance](https://agenticdevelopercookbook.com/guidelines/planning/code-quality/agent-instruction-files)).

### Evidence

- HEAD AGENTS: “The seams are the three PLAN.md §5… No test is written at a seam that isn't one of those three…”
- PLAN §6 lists four pure-function suites; `packages/core/test/` includes `slots.test.ts`, `items-gems.test.ts`, `spec.test.ts` outside the three ports.
- `docs/workflow.md:104` already cites §6 correctly.
- `.claude/skills/tdd/SKILL.md` “Seams — where tests go” vs PLAN §5 “Three, and only three” ports.

### Failure mode if adopted badly

A chatty AGENTS rewrite that narrates the collision history burns context every turn and still gets skimmed past. Baking the wrong section number (§5) into the “fix” re-poisons the summary.

### Minimal wording (recommend)

```markdown
### Testing

Invoke the `tdd` skill for any red/green work.

**Ports (PLAN.md §5):** only `GearSource`, `SimRunner`, `Store` — each with a
recorded adapter. Do not add a fourth port without agreeing it first. That is an
adapter rule, not a test-placement rule.

**Tests:** primary coverage is `rankUpgrades` through those recorded adapters.
Pure functions named in PLAN.md §6 (gem solver, ranking statistics, 19→17 slot
mapping, `applyView`) are unit-tested directly — no agreement needed. Do not
assert on stage internals.
```

(DOC’s longer “seam means two things” essay is correct analysis; it does not need to live in AGENTS.)

### Confidence

**High (0.9)** on the conflict being real and worth fixing. **Medium-high (0.75)** that the trimmed wording above is enough without the essay.

---

## DOC-2 — Extend / surface `Blocked by:` (not new `Depends:`)

### Restatement

Open carry-forward tickets can be unstartable while looking identical in `pnpm issues:open` (status + blocks + path). Retro wants a new `Depends:` field. DOC/reconcile: reuse existing wayfinding `Blocked by:`, document it for carry-forward, allow non-ticket component names, print it in `issues:open`, do **not** land-gate it (C16).

### Mechanical vs cognitive

**Mostly mechanical** once the field choice is settled. Surfacing is ~10 lines of Python. Choosing *not* to invent `Depends:` is the cognitive half (and the part that matters).

### Verdict

**Adopt — narrow.** Field proliferation rejected. Backfill 03/04 with DOC’s blocker text (04 ≠ compose — C17). Surface in `--list-only`. No land enforcement.

### Evidence

- At HEAD, carry-forward template omits `Blocked by:`; wayfinding docs already define it (`issue-tracker.md:57`).
- `pnpm issues:open` at tip: three identical rows; no readiness signal.
- Ticket 03 Done-when needs normalize/compose; ticket 04 needs gem solver + baseline path — DOC’s correction vs retro’s “both blocked on compose.”
- `Blocks:` is already machine-checked against phase branch names; “is compose built?” is not.

### Failure mode if adopted badly

Adding `Depends:` beside `Blocked by:` guarantees synonym roulette. Gating `pnpm land` on start-readiness invents a stale component registry. A paragraph-long `Blocked by:` bullet nobody reads is worse than a one-line field + indented print.

### Minimal wording (recommend)

In carry-forward frontmatter example, add `Blocked by: none` (or a one-line dependency). One short bullet:

> **`Blocked by:`** — what must exist before this ticket can start, or `none`. Tickets (`03`, `04`) or a not-yet-built component with PLAN cite (e.g. `compose stage (PLAN.md §8.2) — not yet built`). Inverse of `Blocks:`. Convention only — `pnpm land` does not read it; `pnpm issues:open` should print it.

Script: parse `Blocked by:`, print an indented second line when present and not `none`. Absent field → today’s output unchanged.

### Confidence

**High (0.85)** adopt field + surface. **High (0.95)** reject `Depends:` and land-gate.

---

## DOC-3 — Harness attribution in headings / status lines

### Restatement

Session handoff framed a Cursor model-quota wall as “Parallel workers (failed — no branches).” Body attributed correctly; heading did not. Repo already says what to *do* on walls (`AGENTS.md` Models and walls; `parallel-phase` SKILL). Missing: how to *report* harness vs repo failures so skims don’t inherit a false “parallelism failed here.” Retro put the fix under `Notes / concerns` only — wrong place (DOC correction).

### Mechanical vs cognitive

**Cognitive** framing rule; **mechanical** edit (one Rules bullet; optional Notes prompt). Must dual-edit mirrors.

### Verdict

**Adopt — Rules-only.** One constraint on headings/status lines. Skip or keep-optional the Notes bullet; the Rules line is the load-bearing part. Do not invent a new handoff genre doc.

### Evidence

- Template Rules today: success criteria, branch naming, no land — no scope attribution.
- Complementary walls guidance already exists in two places (asymmetry DOC named).
- Feat handoff already uses `Harness:` in its header — organic evidence the label helps.

### Failure mode if adopted badly

A long essay in every template that agents ritualistically paste without changing headings. Over-fitting to Cursor quota wording. Putting the rule only under Notes (retro) so bespoke section headings stay wrong.

### Minimal wording (recommend)

Append to `handoff-template.md` Rules (both mirrors):

> **Attribute failures in the heading/`Status` line, not only the body.** Mark harness/infra (quota, sandbox, missing tool) vs repo/code. Harness-specific → close with “re-evaluate on another harness.” Never let a title say “X failed here” when only the harness blocked the attempt.

### Confidence

**High (0.8).** Cheap, complements existing walls rules, matches handoff-pattern advice to curate framing for the next reader ([Handoff pattern](https://aipatternbook.com/handoff)).

---

## Handoff lifecycle — track / status header / no-duplicate-status

### Restatement

DOC: `.scratch/handoffs/` was the untracked-but-unignored subtree; three contradictory locations (OS temp skill, `handoffs/<slice>.md` on worker branch, reality `.scratch/handoffs/`); stale handoffs duplicated ticket/stash status contrary to existing no-duplication rule. Propose: commit under `.scratch/handoffs/`, required Status/Harness/Superseded header, retire by flipping status, sharpen no-dup-status. C14 **weakens** DOC’s “actively misleads about stash contents” — ENV-5/feat handoff: stash inventory was accurate; residual hazard is dangling superseded stash + duplicated ticket status.

### Mechanical vs cognitive

**Mixed.** Tracking is mechanical. “Don’t restate `pnpm issues:open`” is cognitive discipline. Full retirement ceremony (must supersede in same commit as first real change) is process theatre.

### Verdict

**Adopt-partial.**

| Piece | Call |
| --- | --- |
| Prefer / track `.scratch/handoffs/<branch-slug>.md` for cross-session/cross-harness handoffs | **Adopt** (feat handoff already tracked at tip — precedent exists) |
| Sharpen existing no-duplication: especially ticket/verify/stash **status** → cite command/path | **Adopt** (one sentence in handoff skill) |
| Thin header: Status + Harness + Branch@SHA | **Adopt** (feat handoff already informal-Status/Harness) |
| Mandatory `Superseded by:` + “same commit as first real change” ritual | **Reject** as rule — nice practice, not ink-worthy law |
| Rewrite OS-temp as only for same-session detours | **Adopt** (current `handoff/SKILL.md` line 8 is wrong for cross-day Cursor→Claude) |
| Build lifecycle rules on “stash actively misleads” | **Reject** (C14: weaken; dangling stash ≠ false inventory) |
| `check_handoff_stale.py` / land gate | **Reject** |

### Evidence

- Tip: `feat-fan-out-retro.md` tracked; already has Status/Harness/Date; deliberately avoids duplicating status facts (`pnpm issues:open`).
- Tip: `handoff/SKILL.md` still says “Save to the temporary directory of the user's OS.”
- C14: report-01-wins on stash wording; do not overbuild.
- Handoff pattern literature: point at concrete artifacts; don’t dump mutable reasoning/status ([aipatternbook handoff](https://aipatternbook.com/handoff)).

### Failure mode if adopted badly

A six-field mandatory schema for a directory with one file. Treating every OS-temp handoff as policy violation. Re-litigating stash contents in agent docs after reconcile weakened that claim.

### Minimal wording (recommend)

Replace OS-temp absolute in `handoff/SKILL.md` (both mirrors) with:

> Cross-session / cross-harness / cross-day → `.scratch/handoffs/<branch-slug>.md` on that branch (commit it). OS temp only for a same-session detour you will return from immediately.
>
> Do not restate mutable status (ticket open/closed, verify green/red, stash contents) — write the command or path (`pnpm issues:open`, `git stash show -p`).

Header guidance: Status · Harness · Branch@SHA. Optional `Superseded by:` when known — not a gate.

### Confidence

**Medium-high (0.75)** on location + no-dup-status. **Low (0.4)** that a rigid supersede ritual earns its keep.

---

## Blocked / vacuous candidates (explicit rejects)

| Candidate | Verdict | Why |
| --- | --- | --- |
| New `Depends:` field | **Reject** | C16; near-synonym of `Blocked by:`; misapplication tax > value |
| Retro DOC-1 text baking PLAN.md §5 for carve-out | **Reject** | C15; would ship wrong cite into the summary |
| Claim prettier / `format:check` gates `.scratch` reports | **Reject** | C18; `.prettierignore` has `.scratch/` — vacuous today |
| Lifecycle rules justified by “handoff actively misleads on stash” | **Reject / weaken** | C14; dangling stash, not false inventory |

---

## Dual-edit: `.claude/` ↔ `.agents/` — mechanical check vs prose?

### Restatement

DOC consolidated edits require touching both skill trees; tip mirrors are byte-identical; “nothing checks for divergence.” Question: is a `diff` in CI/verify worth it, or only a prose reminder?

### Verdict

**Mechanical check — yes, minimal.** Prose reminder alone is insufficient: this worktree already shows one-sided uncommitted edits to `.claude/skills/parallel-phase/handoff-template.md` that diverge from `.agents/` (noise from parallel sessions). Industry pattern for dual instruction surfaces is fail-on-drift, not “please remember” ([agentsync check](https://pypi.org/project/mujin-agentsync/); [sync patterns gist](https://gist.github.com/yurukusa/d36197848911f025add142abefcde685)).

### Minimal shape

Not a new skill rule. A tiny verify (or pre-commit) step, e.g.:

```bash
diff -qr .claude/skills/parallel-phase .agents/skills/parallel-phase
diff -qr .claude/skills/handoff .agents/skills/handoff
# extend path list only when a skill is intentionally dual-homed
```

Or symlink one tree to the other later — structural fix beats perpetual dual-edit prose. Until then, **diff-in-verify > reminder-in-DOC**.

### Confidence

**High (0.85)** that mechanical check beats prose. **Medium (0.6)** on exact path list / whether to symlink instead — product choice, out of DOC scope.

---

## Adoption order (if Pass B applies later)

1. DOC-1 trimmed AGENTS Testing (blocks false constraint now).
2. Mirror `diff` in verify (prevents silent half-applies of 3–5).
3. DOC-2 field docs + `issues:open` surface + ticket backfill (03/04/05).
4. DOC-3 Rules bullet on both handoff-template mirrors.
5. Handoff skill location + no-dup-status sentence on both mirrors.

Do **not** spend a session on Depends, prettier-for-scratch, stash-mislead mythology, or supersede-commit rituals.

---

## Non-goals / what this pass did not do

- Edit AGENTS, skills, tickets, scripts, or shared docs
- Merge, push, or land
- Trust working-tree modifications as tip state
- Re-open C14–C18 resolutions
- Adopt ORCH/ENV/RSN rules

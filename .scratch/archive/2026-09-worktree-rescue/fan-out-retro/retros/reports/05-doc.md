# W5 — DOC-1, DOC-2, DOC-3 (+ handoff lifecycle)

Input: [`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md) ·
[`00-FAN-IN.md`](00-FAN-IN.md). Every claim below was re-checked against repo
state at `94debea`. Report only — no shared file was edited; all remedies are
quoted here as literal replacement text.

**Base-SHA note (ORCH-1).** The worktree was checked out at `55b5a51` — an
ancestor four commits back, not `94debea`. Corrected with
`git checkout -b retro/w-doc 94debea`. This is the second recorded instance of
`isolation: worktree` producing a stale base; ORCH-1's "assert the SHA first"
boilerplate is what caught it, again.

---

## Summary

| Finding                   | Verdict                                             | Classification   | Action                                                                                                     |
| ------------------------- | --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **DOC-1** AGENTS vs PLAN  | **Real — worse than the retro says.** Fix.          | MIXED            | Reword AGENTS.md → Testing. Root cause is a **term collision**, not summary loss. Retro cites the wrong §.  |
| **DOC-2** ticket deps     | **Real, but the retro over-scopes it.** Fix narrow. | MIXED            | Reuse the **existing `Blocked by:`** field — do _not_ add `Depends:`. Surface in `issues:open`. No gate.    |
| **DOC-3** harness attrib. | **Real; retro's fix is in the wrong place.** Fix.   | GENERAL          | Rule targets **headings and status lines**, not just `Notes / concerns`. Both skill mirrors.                |
| **Handoff lifecycle**     | **Real.** Fix minimally.                            | MIXED            | Track `.scratch/handoffs/`; add a `Status:`/`Superseded by:` header; enforce the _existing_ no-duplication rule. |

**One thing I would not do:** add a `Depends:` field. The repo already has two
blocking fields; a third whose name is a near-synonym of the second is the kind
of rule proliferation that costs more to misapply than it saves.

---

## Corrections to the retro

The fan-in brief asks workers not to inherit the retro uncritically. Four
defects found in the DOC block:

1. **DOC-1 cites the wrong section.** The stage-level-test carve-out is
   **PLAN.md §6 "Testing strategy"** (§6 starts at line 416; the sentence is
   line 431). §5 is "The seams". The retro says "§5" twice, and its proposed
   AGENTS.md replacement text bakes `(PLAN.md §5)` into the fix — which would
   have shipped a wrong cross-reference into the file whose job is to be the
   authoritative summary. `docs/workflow.md:104` already cites §6 correctly.

2. **DOC-2 over-attributes ticket 04.** The retro says tickets 03 _and_ 04
   "both read as though a `compose` stage exists", but quotes only 03. Ticket 04
   never mentions compose. Its blockers are the **gem solver** (no meta-condition
   evaluation and no min-EP-loss repair exists — `packages/core/src/gems.ts`
   exports only `gemPalette`, `getGem`, `gemsForPhase`) and the baseline execute
   path. The retro's prescribed backfill —
   `Depends: compose stage (PLAN.md §8.2) — not yet built` — is therefore
   correct for 03 and wrong for 04.

3. **DOC-2's counterfactual is overstated.** "Had the dependency been declared,
   `compose` could have been scoped as a third worker slice … plausibly finishing
   Phase 1 this session." Unblocking 03 needs normalize + compose + a
   consumables/imbue table; unblocking 04 needs the gem solver + the execute
   path. That is most of the Phase-1 engine, not one slice. The field's value is
   **sizing visibility**, not a recovered session.

4. **DOC-3 understates the handoff body and overstates the fix location.** The
   handoff's _body_ does attribute correctly ("Terra usage wall before first tool
   call", "still good partition if another harness can fan out"). The defect is
   isolated to the **heading** — `### B. Parallel workers (failed — no branches)`.
   And the retro puts its fix under `Notes / concerns`, a section the offending
   artifact does not have: that failure was reported in a bespoke session-handoff
   section. The fix must be a rule about how failures are _framed anywhere_, not
   a bullet in one optional section.

**Confirmed correct** (I initially doubted it): `compose stage (PLAN.md §8.2)` is
a valid citation — §8.2 spans lines 484–495 and line 494 reads "the **`compose`
stage owns the lift**".

---

## DOC-1 — AGENTS.md testing rule vs PLAN.md §6

**Verdict: real, and the mechanism is worse than "a summary lost nuance". Fix.**

### The two texts, verbatim

`AGENTS.md` → Engineering workflow → Testing:

> Invoke the `tdd` skill for any red/green work. The seams are the three
> PLAN.md §5 already defines — `GearSource`, `SimRunner`, `Store` — each with a
> recorded adapter, so the engine runs deterministically offline from committed
> fixtures. No test is written at a seam that isn't one of those three without
> agreeing it first.

`PLAN.md:431` (§6, **not** §5):

> Stage-level tests exist only where the logic is genuinely intricate and
> independently valuable: the **gem solver** (including the socket-bonus case,
> §9), the **ranking statistics**, the **19→17 slot mapping** (§8.4 — asserted
> item-by-item against the fixture, because this one fails silently), and
> **`applyView`** (§4.1). All four are pure functions over in-memory data
> (dependency category: in-process), so they need no adapters at all.

### Why it is a real conflict and not a nuance loss

The word **seam** carries two different definitions in two documents AGENTS.md
loads in the same paragraph.

- `.claude/skills/tdd/SKILL.md:20` — "A **seam** is the public boundary you test
  at: the interface where you observe behavior without reaching inside. Tests
  live at seams, never against internals." Line 22: "**Test only at pre-agreed
  seams.** … No test is written at an unconfirmed seam."
- `PLAN.md:267` (§5) — "Three, and only three. … _one adapter is a hypothetical
  seam; two adapters is a real one._" Here a seam is an **architectural port
  with two adapters**.

AGENTS.md's sentence begins by invoking the `tdd` skill and then uses `tdd`'s
sentence pattern ("No test is written at a seam that isn't …") with PLAN.md's
noun. Read with `tdd`'s definition — which is the definition in the reader's
context, because the previous sentence just told them to load it — the rule says
**no test may exist at any boundary other than those three**. That forbids
exactly the tests PLAN.md §6 mandates.

**This is checkable in committed state, not just the transcript.**
`packages/core/test/` contains `spec.test.ts`, `slots.test.ts`, and
`items-gems.test.ts` — three suites at boundaries that are not `GearSource`,
`SimRunner`, or `Store`. Under AGENTS.md read literally, all three required prior
agreement. Under PLAN.md §6, `slots.ts` is _explicitly named_ as sanctioned. The
repo's own test suite violates its own summary.

**The misreading has already propagated into an artifact.**
`.scratch/handoffs/phase-1-five-seed-spread.md:130` carries it forward as:

> Seams to test at (only these three unless agreed): `GearSource`, `SimRunner`,
> `Store`

The parenthetical "only these three" is the `tdd` reading, written into a
handoff, ready to constrain the next session. That is the retro's
"re-derived twice" cost made durable — and it is the argument that settles the
"is a summary allowed to lose nuance?" question. A summary may lose nuance. It
may not silently redefine a term that a skill it invokes defines differently,
because the loss then transmits as a false constraint.

**Cost of fixing: one paragraph. Cost of not fixing: recurring.** Every session
that writes a test outside the three seams must re-derive the carve-out, and any
session that does not re-derive it writes the false constraint into its handoff.

### Remedy — replace the AGENTS.md `### Testing` section body

```markdown
### Testing

Invoke the `tdd` skill for any red/green work. Note the word **seam** means two
different things across the docs you are about to read, so this section fixes
both.

**Architectural seams are three and only three** — `GearSource`, `SimRunner`,
`Store` (PLAN.md §5) — each with a recorded adapter, so the engine runs
deterministically offline from committed fixtures. Do not introduce a fourth
port without agreeing it first. That is a rule about **adapters, not about test
placement.**

**Where tests go.** The primary test is at the module interface (`rankUpgrades`)
through the recorded adapters — that is what `tdd`'s "test at the seam" means
here. **Pure functions are also unit-tested directly**, no agreement needed,
where the logic is intricate and independently valuable: the gem solver, the
ranking statistics, the 19→17 slot mapping, `applyView` (PLAN.md §6). They touch
no port and need no adapter. What is banned is asserting on **stage internals** —
the eight stages must stay reorganisable without touching a test.
```

### Classification: **MIXED**

General rule, portable to any project:

> **When a project doc reuses a term that a skill it invokes already defines
> differently, disambiguate at the point of reuse.** A summary may lose detail;
> it may not silently rebind vocabulary, because the reader resolves the word
> against the skill and inherits a constraint the summary never intended.

Project-specific: the three named ports, the §6 carve-out list, `rankUpgrades`.

---

## DOC-2 — tickets carry no dependency field

**Verdict: the blockage is real and verified. The proposed field is the wrong
shape. Fix narrowly — reuse `Blocked by:`, surface it, do not gate it.**

### Verification of the blockage

Both tickets are `Status: open`, `Blocks: phase-1`, and neither can be started:

| Ticket                          | "Done when" requires                                                       | Repo state                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `03-temporary-enchant-imbue.md` | "Normalize/compose applies weapon imbues from `temporaryEnchant`"          | **No `packages/core/src/stages/` directory exists.** No normalize, no compose, no consumables table.                     |
| `04-meta-activation-check.md`   | "Baseline path records meta active/inactive"; repair at min EP loss (PLAN §9) | `rankUpgrades` throws `RankError("not-implemented")`. `gems.ts` is a palette lookup only — no meta check, no EP repair.  |

`compose` exists **only** as the Phase-0 one-off
`scripts/compose_slamaltman_raid_sim.py`, which drops `temporaryEnchant` on
purpose (lines 57–61):

> `permanentEnchant` is already the tbc-new effectId namespace (R19).
> `temporaryEnchant` is a consumable — different namespace; omit it.

So the retro's core claim holds: two of the three open tickets are unstartable,
and nothing in the tracker says so.

### Why this actually cost something — and it is not the missing field alone

`pnpm issues:open` (`scripts/check_merge_ready.py --list-only`) prints:

```
status     blocks               path
open       phase-1              .scratch/carry-forward/issues/03-temporary-enchant-imbue.md
open       phase-1              .scratch/carry-forward/issues/04-meta-activation-check.md
open       phase-1              .scratch/carry-forward/issues/05-proto-codegen-cross-platform-drift.md
```

Three rows, identical but for the filename. No title, no readiness signal. An
agent picking up Phase 1 sees three equally-available tasks and only discovers
otherwise by opening each file and cross-checking `packages/core/src/` — which
is precisely what happened, and only after everything else was done. The gap is
**as much in the listing as in the ticket format**; adding a field nobody prints
would fix nothing.

Note also that ticket authors already write dependencies — as prose.
`02-shared-slot-map.md` ends "Phase 1 `slots.ts` is that module (or is generated
from the same table)". The instinct is there; there is no structured place for
it, so it is invisible to tooling and to a skim.

### Why `Depends:` is the wrong shape

The repo already has **two** blocking fields, both documented in
`docs/agents/issue-tracker.md`:

| Field        | Direction                            | Where documented          | Machine-checked?                              |
| ------------ | ------------------------------------ | ------------------------- | --------------------------------------------- |
| `Blocks:`    | downstream — which _phase_ must deal with this | carry-forward tickets | **Yes** — `check_merge_ready.py:37,97–116`    |
| `Blocked by:` | upstream — which _tickets_ must resolve first | wayfinding tickets    | No — no script parses it                      |

`Blocked by:` already means exactly "what must exist before this can start". A
third field named `Depends:` would sit alongside it with a near-identical
meaning, and no agent will reliably choose between "blocked by" and "depends on".
That misapplication risk is the whole cost of a documentation rule.

**Recommendation: extend `Blocked by:` to carry-forward tickets and allow a
non-ticket entry.** One field, already named, already inverse to `Blocks:`.

### Should the land gate enforce it?

**No.** `Blocks:` is enforceable because it is a closed vocabulary matched
against the branch name (`phase-1` vs `phase-1/…`). "Is the compose stage built?"
is not machine-checkable without inventing a component registry — a much larger
convention that would then itself go stale. Enforcement would also gate
_landing_ on a fact about _starting_, which is the wrong hook entirely: a blocked
ticket is not a reason to refuse a merge.

Surfacing costs ~8 lines and zero behaviour change. Enforcement costs a registry
and a new failure mode. Surface only.

### Remedy 1 — `docs/agents/issue-tracker.md`, carry-forward frontmatter block

Replace:

```
Status: open
Type: task
Origin: docs/reviews/<branch>.md
Blocks: phase-1
```

with:

```
Status: open
Type: task
Origin: docs/reviews/<branch>.md
Blocks: phase-1
Blocked by: none
```

and add this bullet after the `Blocks:` bullet:

```markdown
- **`Blocked by:`** — what must exist before this ticket can be _started_, or
  `none`. Either other ticket files (`03`, `04` — clears when those close), or a
  **component that does not exist yet**, named with its PLAN.md section:
  `compose stage (PLAN.md §8.2) — not yet built`. It is the inverse of `Blocks:`
  — `Blocks:` says which phase must deal with the ticket, `Blocked by:` says what
  the ticket is waiting on. **Convention, not a gate:** `pnpm land` never reads
  it, because "is the compose stage built?" is not machine-checkable. It exists
  so `pnpm issues:open` can show that a ticket is unstartable _before_ someone
  sizes it. Write it when you file the ticket; a review that defers a finding
  into a component that is not built yet must fill it in.
```

### Remedy 2 — backfill the three open tickets

```
03-temporary-enchant-imbue.md
  Blocked by: normalize + compose stages (PLAN.md §5.1 stages/, §8.2) and a
    consumables/imbue table — not yet built

04-meta-activation-check.md
  Blocked by: gem solver — meta conditions + min-EP-loss repair (PLAN.md §9) —
    and the baseline execute path (PLAN.md §5.1 stages/) — neither built

05-proto-codegen-cross-platform-drift.md
  Blocked by: none
```

(Not the retro's text. 04 is not blocked on compose; see Corrections #2.)

### Remedy 3 — `scripts/check_merge_ready.py`, surface it

Add beside the existing `BLOCKS_RE` (line 37):

```python
BLOCKED_BY_RE = re.compile(r"(?im)^\s*Blocked by:\s*(.+)$")
```

Replace `list_open_carry_forward` (lines 119–131):

```python
def list_open_carry_forward() -> list[tuple[Path, str, str, str]]:
    out = []
    if not CARRY.is_dir():
        return out
    for path in sorted(CARRY.glob("*.md")):
        status = read_status(path) or "?"
        if status not in ("open", "claimed"):
            continue
        text = path.read_text(encoding="utf-8")
        blocks_m = BLOCKS_RE.search(text)
        blocks = blocks_m.group(1).strip() if blocks_m else "(none)"
        blocked_m = BLOCKED_BY_RE.search(text)
        blocked_by = blocked_m.group(1).strip() if blocked_m else ""
        out.append((path, status, blocks, blocked_by))
    return out
```

Replace the `--list-only` print loop (lines 238–241):

```python
        print(f"{'status':<10} {'blocks':<20} path")
        for path, status, blocks, blocked_by in rows:
            print(f"{status:<10} {blocks:<20} {path.relative_to(ROOT).as_posix()}")
            if blocked_by and blocked_by.lower() != "none":
                print(f"{'':<32}blocked by: {blocked_by}")
```

Free text goes on its own indented line, so a long dependency never wrecks the
column layout. Absent field → prints exactly as today, so no ticket is forced to
be rewritten before this ships.

_Optional, same pattern:_ `open_blockers_for_phase` (the pre-land listing) could
print it too. Skipped deliberately — that listing exists to answer "may I land",
and readiness-to-start is not part of that question.

### Classification: **MIXED**

General rule:

> **A ticket that cannot be started must say what it is waiting on in a
> structured field, and the command that lists open tickets must print it —
> otherwise the blockage is discovered at sizing time, which is the most
> expensive moment to discover it.**

Project-specific: `.scratch/carry-forward/`, the `Blocks:`/`Blocked by:` field
names, `check_merge_ready.py`, PLAN.md section numbering.

---

## DOC-3 — handoff template does not attribute failures to a harness

**Verdict: real. Worth fixing — it is one rule, and the repo already has its
mirror-image twice. The retro's placement is wrong.**

### Verification

`.scratch/handoffs/phase-1-five-seed-spread.md:91–101`:

> ### B. Parallel workers (failed — no branches)
>
> Three `best-of-n-runner` workers were spawned with `model: gpt-5.6-terra-medium`.
> All died immediately:
>
> ```
> API usage limit reached Switched to grok-4.5 after reaching API limit.
> ```
>
> No worker branches, no worktrees, no commits. Not a prompt/path bug — Terra
> usage wall before first tool call.
>
> Planned slices (still good partition if another harness can fan out):

The body is **better than the retro credits it**: it names the mechanism, rules
out a repo cause, and explicitly offers the partition to another harness. The
defect is entirely in the **heading** — `Parallel workers (failed — no branches)`
— which is what survives a skim, a table of contents, and a summary. A reader
scanning section titles gets "parallelism failed here"; the disclaimer is two
paragraphs down and does not travel with the heading.

**The handling rule already exists twice, in both directions:**

- `.claude/skills/parallel-phase/SKILL.md:14` — "On a rate-limit wall, serialise
  or wait — do not silently drop to a toy model for implementation."
- `AGENTS.md` → Models and walls — "go slower or serial on walls; never invent a
  weaker substitute."

So the repo tells you what to _do_ about a wall in two places and nothing tells
you how to _report_ one. That asymmetry is the actual gap, and it makes the fix
cheap and non-duplicative: one rule, complementary to two that already exist.

### Why the retro's placement would not have worked

The retro proposes adding the rule under `handoff-template.md`'s
`## Notes / concerns`. The offending artifact has no `Notes / concerns` entry for
this — the failure was reported under a bespoke `## What was in flight` → `### B`.
More fundamentally, `handoff-template.md` is titled **"Worker handoff"** and
opens "Workers produce exactly one handoff when done"; the Cursor artifact is a
**session→session** handoff, a genre the template does not cover at all (see the
next section). A rule placed only in the `Notes / concerns` bullet list governs
neither the heading nor the genre that failed.

The rule therefore belongs in the template's **Rules** block, phrased as a
constraint on _framing anywhere in the document_, and the same rule should be
referenced from the session-handoff conventions.

### Remedy — `.claude/skills/parallel-phase/handoff-template.md`

Both this file and its identical mirror at
`.agents/skills/parallel-phase/handoff-template.md` (verified byte-identical).

(a) In the fenced template, replace:

```markdown
## Notes / concerns

- <collisions, deviations, underspecified prompts>
```

with:

```markdown
## Notes / concerns

- <collisions, deviations, underspecified prompts>
- <every failure, with its scope: harness-specific or repo-specific>
```

(b) Append to the `Rules:` list:

```markdown
- **Attribute every failure to its scope, in the heading as well as the body.**
  A failure caused by the **harness** — model pool, quota or rate-limit wall,
  sandbox, permission classifier, missing tool — is not a property of this repo.
  Say which it is in the same sentence as the failure, and close a
  harness-specific one with **"re-evaluate on another harness."** Never let a
  heading or a `Status` line generalise a harness wall into "X failed here": the
  next session inherits the heading, not the transcript. (What to _do_ about a
  wall is already covered — `SKILL.md` "serialise or wait"; this is about how to
  report one.)
```

Applied to the artifact in question, the heading becomes:

```markdown
### B. Parallel workers — not attempted (Cursor model-quota wall; harness-specific)
```

…and the section ends "Re-evaluate on another harness; the partition below is
unaffected." Note "not attempted" rather than "failed": nothing about the plan
was tested.

### Classification: **GENERAL**

> **Report every failure with its scope attached — harness/infrastructure vs
> repo/code — in the heading, not only the body, because the next reader
> inherits the framing and not the transcript.**

Nothing in this is `tbc-gear-prio`-specific. The only project-flavoured detail is
that the edit must be applied to two mirrored skill trees.

---

## Handoff lifecycle

**Verdict: real problem, minimal fix. The strongest remedy is enforcing a rule
that already exists rather than adding one.**

### What is actually wrong

**1. It is untracked but _not_ ignored.**

```
git ls-files .scratch/handoffs/   → (empty)
git check-ignore -v .scratch/handoffs/phase-1-five-seed-spread.md   → (no match)
```

Meanwhile the rest of `.scratch/` **is** tracked — five carry-forward tickets,
`carry-forward/map.md`, `phase0-close/spec.md`, the retro, this report's
directory. So handoffs are the sole untracked subtree in an otherwise-tracked
directory: not a policy, an omission. It is also the same near-miss shape as
ENV-1 — untracked-but-unignored means one `git add -A` decides its fate by
accident.

**2. Three documented locations, mutually contradictory.**

| Source                                       | Says                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `.claude/skills/handoff/SKILL.md:8`          | "Save to the temporary directory of the user's OS - not the current workspace." |
| `parallel-phase/handoff-template.md:3`       | "optionally write `handoffs/<slice>.md` on the worker branch" (committed)   |
| Reality                                      | `.scratch/handoffs/`, workspace, untracked                                 |

The `handoff` skill's OS-temp instruction is **actively wrong for the case that
occurred**: a Cursor session handing off to a different harness, on a different
day. An OS temp directory is the one place that cannot survive that. It is
defensible for a same-machine `/prototype` detour; it is not a general rule, and
it is the general rule as written.

**3. It is stale in exactly the way a duplicated artifact goes stale.**

- Lines 62–66 list ticket **01 as open**. `01-specid-unusable.md` now reads
  `Status: closed`, `Closed: 2026-07-26`.
- Line 84 advertises `stash@{0}` as carrying spec-classifier work. The stash
  still exists (`stash@{0}: On phase-1/five-seed-spread: phase-1 wip before
  model-policy tweak`) and is fully superseded by committed `spec.ts`. ENV-5
  records that the `stash drop` was permission-denied, so the misleading pointer
  and the stash it points at both persist.

Every stale claim is a **restatement of tracked state**. The SHA pin
(`bc148e8`), the cutoff constants, and the file paths have not rotted at all.
And the `handoff` skill **already forbids exactly this**:

> Do not duplicate content already captured in other artifacts (specs, plans,
> ADRs, issues, commits, diffs). Reference them by path or URL instead.

The handoff violated it (it enumerates ticket statuses inline) while
simultaneously complying (line 68: "List: `pnpm issues:open`"). The enumeration
is the part that rotted. **The rule that would have prevented this is already
written; it needs teeth, not a sibling.**

### Recommended lifecycle

**Where:** `.scratch/handoffs/<branch-slug>.md`, **committed**, on the branch it
describes. Rationale: a handoff's entire purpose is transmitting state to a
different session, machine, or harness — the same reason tickets are tracked.
Committing it also dates it automatically and makes staleness a diffable fact.

**Rejected alternative:** gitignore `.scratch/handoffs/`. This makes the artifact
invisible to a clean checkout, which defeats the one job it has. If the objection
is noise in history, note that the retro and the tickets set the precedent
already.

**Header, required at the top of every handoff:**

```markdown
# Handoff — <what> (`<branch>`)

Status: active | superseded
Written: <YYYY-MM-DD> · Harness: <cursor | claude-code | codex> · Branch:
`<branch>` @ `<sha>`
Superseded by: <path, branch, or commit> <!-- required when Status: superseded -->
```

`Harness:` is the DOC-3 rule applied to the document as a whole: a reader who
knows the handoff came from Cursor discounts Cursor-shaped failures for free.

**Retirement:** the session that consumes a handoff sets `Status: superseded` and
fills `Superseded by:` **in the same commit as its first real change** — not at
the end, when it is out of context and out of budget. A superseded handoff is
kept, not deleted; the history of how a branch was carried across sessions is the
thing that made this retro possible.

**Content:** enforce the existing no-duplication rule by naming the failure mode.
Proposed addition to `.claude/skills/handoff/SKILL.md` (and its `.agents/`
mirror), replacing line 8 and extending line 12:

```markdown
Write a handoff document summarising the current conversation so a fresh agent
can continue the work.

**Where it goes.** If the next session may be a different harness, a different
machine, or a different day, commit it to `.scratch/handoffs/<branch-slug>.md` on
the branch it describes — that is the only location that survives all three. Use
the OS temp directory only for a same-session, same-machine detour (e.g. a
`/prototype` fork you will return from immediately).

Do not duplicate content already captured in other artifacts (specs, plans, ADRs,
issues, commits, diffs). Reference them by path or URL instead — **especially
anything with a status** (ticket open/closed, verify green/red, stash contents).
Duplicated status is the first thing to rot, and a handoff is read precisely when
nobody remembers which half is stale. Write "open tickets: `pnpm issues:open`",
not a list of them.
```

**Explicitly not recommended:** any gate. No script should check handoff
freshness. The header makes staleness legible in one glance, which is the whole
requirement; a `check_handoff_stale.py` would be a maintenance liability
protecting a directory with one file in it.

**Note on the existing file:** I did not edit, move, or delete it, per scope. If
the owner adopts the above, the one-pass action is
`git add .scratch/handoffs/phase-1-five-seed-spread.md` with a header setting
`Status: superseded` / `Superseded by: .scratch/retros/2026-07-26-phase-1-fan-out.md`
— the retro plus the merged branch together now carry everything it said.

### Classification: **MIXED**

General rule:

> **A handoff is a message to a stranger: it must live where a clean checkout can
> find it, state the harness and commit it was written from, and reference
> mutable state by the command that reads it rather than by transcribing it.**

Project-specific: `.scratch/handoffs/`, `pnpm issues:open`, the branch-slug
naming, the two mirrored skill trees.

---

## Consolidated edits — one pass

Five files, plus two `.agents/` mirrors. No two edits touch the same file.

| #   | File                                                        | Edit                                                          |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | `AGENTS.md`                                                 | Replace `### Testing` body (DOC-1)                            |
| 2   | `docs/agents/issue-tracker.md`                              | Add `Blocked by:` to the frontmatter block + one bullet (DOC-2) |
| 3   | `.scratch/carry-forward/issues/0{3,4,5}-*.md`               | Add one `Blocked by:` line each (DOC-2)                       |
| 4   | `scripts/check_merge_ready.py`                              | Parse + print `Blocked by:` (DOC-2)                           |
| 5   | `.claude/` **and** `.agents/skills/parallel-phase/handoff-template.md` | One template bullet + one rule (DOC-3)             |
| 6   | `.claude/` **and** `.agents/skills/handoff/SKILL.md`        | Location + no-duplicate-status wording (lifecycle)            |
| 7   | `.gitignore` / `git add`                                    | Track `.scratch/handoffs/` — do **not** ignore it (lifecycle) |

Verification after applying:

```bash
pnpm issues:open                       # 03/04 now show a "blocked by:" line, 05 does not
git ls-files .scratch/handoffs/        # non-empty
grep -c "PLAN.md §6" AGENTS.md         # 1
npx prettier --check AGENTS.md docs/agents/issue-tracker.md
diff .claude/skills/parallel-phase/handoff-template.md \
     .agents/skills/parallel-phase/handoff-template.md   # must stay identical
diff .claude/skills/handoff/SKILL.md .agents/skills/handoff/SKILL.md
```

The mirror `diff`s matter: `.claude/` and `.agents/` are byte-identical today and
an edit to one only is a silent divergence nothing checks.

---

## Re-ranking

The fan-in brief permits re-ranking with justification.

| ID    | Retro | Mine   | Why                                                                                                                                                              |
| ----- | ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-1 | P1    | **P1** | Unchanged, but the reason is stronger: the false constraint is already written into a handoff, so it is propagating, not merely re-derived.                       |
| DOC-2 | P1    | **P2** | Real, but the retro's cost model is inflated (Corrections #3) and the remedy is a listing improvement plus a convention — no session was lost to the missing field alone. |
| DOC-3 | P2    | **P2** | Unchanged. One rule, cheap, complements two existing ones.                                                                                                       |
| —     | —     | **P1** | **Handoff lifecycle** (untracked + stale) deserves its own ranked entry; the retro folds it into ENV-5's evidence and never proposes a remedy.                    |

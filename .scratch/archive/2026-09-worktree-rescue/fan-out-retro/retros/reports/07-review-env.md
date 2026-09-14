# Pass B — Critical review: ENV portable rules

## 0. Base assertion

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-review-env` |
| Expected base | `feat/fan-out-retro` @ `1308b0a` |
| `git rev-parse HEAD` at start | `1308b0a510006360ea1d057feb51d8e18bdeda6d` |
| Matches `feat/fan-out-retro`? | **yes** (tip unchanged from brief) |
| Isolation | Dedicated worktree `.scratch/wt-review-env` (main tree was on `retro/w-review-doc` with unrelated dirty edits) |

**Stance applied:** prefer reject / defer / weaken when evidence is thin or the rule over-scripts cognition. Distinguish mechanical rails from cognitive process prescriptions. Honor `06-RECONCILE.md` Pass-B **Blocked** list — none of those are recommended below.

**Web research (primary / high-trust):**

- Anthropic Claude Code [CLAUDE.md](https://code.claude.com/docs/en/claude-md): instructions are *context, not enforced config*; “To block an action regardless of what Claude decides, use a PreToolUse hook instead”; target under ~200 lines; contradictory rules → arbitrary pick.
- Anthropic Claude Code [worktrees](https://code.claude.com/docs/en/worktrees): default path is **in-repo** `.claude/worktrees/`; docs explicitly say add that path to `.gitignore`; out-of-repo placement needs manual `git worktree`, desktop “Worktree location”, or a `WorktreeCreate` hook; subagents with `isolation: worktree` are constrained under `.claude/worktrees/`.
- Cursor [Rules](https://cursor.com/docs/rules.md): “Start simple. Add rules only when you notice Agent making the same mistake repeatedly”; avoid documenting every command / rare edge cases; prefer linters over style prose.
- OpenAI [GPT-4.1 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide): “Instructing a model to always follow a specific behavior can occasionally induce adverse effects” (e.g. forced tool calls → hallucinated args); models follow instructions more *literally* → brittle checklists hurt.
- GitHub [Configuring Git to handle line endings](https://docs.github.com/en/get-started/git-basics/configuring-git-to-handle-line-endings): commit `.gitattributes`; recommended default is `* text=auto` (not necessarily global `eol=lf`).
- Git [gitattributes](https://git-scm.com/docs/gitattributes): `eol=lf` forces LF *working-tree* checkout when text conversion is on.

---

## 1. ENV-1 project — vitest `exclude` + tracked `.gitignore`

**Rule (one line):** Exclude `**/.claude/worktrees/**` in vitest (restating `node_modules`/`dist`) and add `.claude/worktrees/` to tracked `.gitignore`.

**Class:** mechanical rail

**Verdict:** **adopt**

**Why:** At committed tip `1308b0a`, `vitest.config.ts` still has **no** `exclude`, and tracked `.gitignore` has **no** worktrees line (only `.git/info/exclude` / harness per-clone). ESLint already ignores `.claude/**`; Prettier ignores `.claude/`. That matches `01-env` / reconcile C20: only vitest is exposed. Live cost was real (duplicate suites → misdiagnosis). Claude’s own worktree docs tell you to gitignore `.claude/worktrees/`. Rails do not script how the agent thinks; they stop tools from walking N copies of the tree.

**Failure mode if adopted blindly:** Supplying `exclude` *replaces* vitest defaults — omitting `node_modules`/`dist` would break the suite. Adding dead eslint/prettier entries wastes review attention (already covered).

**Minimal wording accepted:**

> In `vitest.config.ts`, set `test.exclude` to `**/node_modules/**`, `**/dist/**`, and `**/.claude/worktrees/**`. Add `.claude/worktrees/` to tracked `.gitignore`. Do not add eslint/prettier entries for the same path.

**Explicitly refuse to prescribe:** A standing “audit every new verify tool forever” checklist in AGENTS.md (process tax); ORCH teardown language (owned by ORCH review).

**Confidence:** high

---

## 2. ENV-1 GENERAL — worktrees outside the repo

**Rule (one line):** Agent worktrees / secondary checkouts “belong outside” the repository working tree as portable doctrine.

**Class:** cognitive prescription (policy), with a mechanical motive

**Verdict:** **reject** (as GENERAL doctrine) · product placement **defer**

**Why:** The *hazard* of in-repo copies is real (ENV-1 project). Elevating “always outside” to GENERAL fights the **vendor default**: Claude Code creates under `.claude/worktrees/` and documents that; desktop can relocate, CLI needs a hook or manual `git worktree`; subagent `isolation: worktree` still targets under `.claude/worktrees/` of the session repo ([worktrees docs](https://code.claude.com/docs/en/worktrees)). A GENERAL rule that agents “must” place worktrees outside would (a) fail for the default harness path, (b) burn context on relocation ritual, (c) **blind** agents to the cheap exclude that Claude itself recommends. Cursor’s “start simple / add when repeated” and Anthropic’s “hooks for hard blocks, keep CLAUDE.md lean” argue for fixing exposure mechanically, not rewriting harness geography in prose.

`01-env` left Claude relocate support **unverified**; reconcile §6 #3 still open. Blog “siblings are best practice” is weaker than primary docs that ship in-repo defaults.

**Failure mode if adopted blindly:** Agents fight `EnterWorktree` / desktop defaults; invent unsupported settings; skip vitest/gitignore fixes because “we’ll move them out”; false confidence that out-of-repo ends all tool pollution (ripgrep from parent still can see siblings if cwd is wrong).

**Minimal wording accepted:** none as GENERAL. Project ENV-1 adopt is enough. Optional later: “prefer sibling / hooked location *when the harness is configured for it*; otherwise maintain excludes.”

**Explicitly refuse to prescribe:** Unconditional “never put worktrees inside the repo” in shared agent docs.

**Confidence:** high (reject GENERAL) · med (product defer)

---

## 3. ENV-2 — global `* text=auto eol=lf`

**Rule (one line):** Ship repo-wide `* text=auto eol=lf` on top of existing path `text eol=lf` for proto trees.

**Class:** mechanical rail

**Verdict:** **defer**

**Why:** Path-specific `data/proto/**` and `packages/core/src/proto/** text eol=lf` already landed (`749aa02`) for the files that caused permanent `M` / lint-staged pain. Global `* text=auto eol=lf` was **never** applied (reconcile C4). GitHub’s recommended baseline is `* text=auto` without forcing working-tree `eol=lf` everywhere ([docs](https://docs.github.com/en/get-started/git-basics/configuring-git-to-handle-line-endings)); git’s `eol=lf` changes checkout shape for *all* text ([gitattributes](https://git-scm.com/docs/gitattributes)). Warning-noise win in `01-env` is real but modest (P2). Reconcile C6 weakens any promise that attributes alone → forever-clean status after Windows regen.

**Failure mode if adopted blindly:** Repo-wide renormalize churn; surprise LF-only working trees on Windows; agents cite attributes as fixing ticket-05 trailing spaces / CI (Blocked C8) — **false confidence**.

**Minimal wording accepted:** none now. If revisited: prefer GitHub-shaped `* text=auto` *without* blanket `eol=lf`, keep path `eol=lf` for CI-compared generated trees; never promise empty `git status` after every `proto:generate`.

**Explicitly refuse to prescribe:** Global `eol=lf` as a correctness / CI / trailing-space fix; any “renormalize to purge spaces” stack (Blocked).

**Confidence:** med

---

## 4. ENV-3 — rename adapters + GENERAL name-collision rule

**Rule (one line):** Rename `adapters/claude.md` → `claude-code.md` (both skill trees); GENERAL: no file may be named like an agent instruction file (`claude.md`, `agents.md`, …) except intentional instruction files.

**Class:** mixed — rename = mechanical rail; GENERAL = cognitive / policy

**Verdict:** **adopt-narrowed**

**Why (rename):** `01-env` reproduced live in two sessions: reading lowercase `adapters/claude.md` on Windows surfaced a system-reminder as `CLAUDE.md` project instructions — channel promotion, not just tokens. Official CLAUDE.md discovery walks directories and loads instruction files ([docs](https://code.claude.com/docs/en/claude-md)); on case-insensitive FS, a lowercase `claude.md` is a footgun even if docs say “must be CLAUDE.md.” Rename is cheap and targeted.

**Why (GENERAL narrowed, not as written):** The absolute ban (“anywhere in a repository”) is instruction-overload: Cursor warns against rare-edge encyclopedia rules; Anthropic warns contradictory / sprawling memory reduces adherence. `agents.md` generalization was **inconclusive** in `01-env` (out-of-project probe failed). Broad bans can **blind** agents into renaming legitimate reference docs or claiming “we’re safe” while skill text still injects when the skill loads.

**Failure mode if adopted blindly:** Drive-by renames of unrelated docs; false safety; still leaking imperative adapter prose globally via other paths; spending context policing filenames instead of reading skill scope.

**Minimal wording accepted:**

> Rename parallel-phase adapters `claude.md` → `claude-code.md` (`.claude/` and `.agents/`) and update SKILL links. Avoid creating non-instruction files whose names case-fold to harness instruction filenames (`CLAUDE.md`, and any other names the *active* harness documents as auto-loaded). Do not treat this as proof that `agents.md` collides until probed in-repo.

**Explicitly refuse to prescribe:** A repo-wide filename denylist essay; “token cost” as the primary framing; untested `agents.md`/`GEMINI.md` bans.

**Confidence:** high (rename) · med (narrowed GENERAL)

---

## 5. ENV-4 — CI `fetch_wowsimcli` remainder

**Rule (one line):** Before `pnpm verify` in CI, run `python scripts/fetch_wowsimcli.py --platform linux-x64` so skipIf cannot hide the real cli-sim tests on the runner.

**Class:** mixed — fetch step = mechanical; “CI must always fetch gitignored artifacts” GENERAL = cognitive/policy

**Verdict:** **defer** (fetch) · **reject** elevating the GENERAL as mandatory doctrine

**Why:** `describe.skipIf(!existsSync(binaryPath))` already landed (`749aa02`); `.github/workflows/verify.yml` still has no fetch (reconcile C9). That closes “next land turns CI red.” The workflow header still states the design intent: no native binary; seams covered by recorded adapters. Fetching is a *coverage upgrade*, not a land-blocker, and reconcile §6 #2 leaves it as a human product call. GPT-4.1 / Cursor guidance: don’t encode every optional coverage preference as always-on agent law — it burns context and creates false “CI is the real sim” confidence when skipIf + fixtures were the intentional offline path.

**Failure mode if adopted blindly:** CI time/size/flake on binary fetch; agents treat skipIf as “broken CI” and reintroduce hard fails locally; GENERAL forces fetch for every gitignored fixture forever.

**Minimal wording accepted:** none as adopt. Keep existing skipIf. If humans later want live-sim CI: add the fetch step *and* optionally assert the suite did not skip — as a tracked workflow change, not an AGENTS cognitive rule.

**Explicitly refuse to prescribe:** “ENV-4 fully closed only when CI fetches”; rewriting AGENTS “CI backstop” prose here (DOC lane).

**Confidence:** med-high

---

## 6. ENV-5 — permission denial behaviour + tracked allow-list

**Rule (one line):** On denial: retry once verbatim, then stop and report; never silently replan or fan out without preconditions; commit a tracked `.claude/settings.json` allow-list for common git read/write commands (not push/reset/land).

**Class:** mixed — allow-list = mechanical rail; retry/stop/no-replan = cognitive prescription

**Verdict:** **adopt-narrowed** (behaviour) · **defer** (allow-list shape)

### Behaviour

**Why narrowed:** The session damage was **silent plan change** and fan-out without `spec.ts` — that is a real coordination failure. Anthropic: CLAUDE.md is not enforcement; hard stops belong in hooks. OpenAI: absolute “always” rituals cause adverse effects. A rigid “retry once verbatim then stop” **sabotages** diagnosis when denial depends on command *shape* (ENV-5’s own compound `cd`+`rm` hook example: split succeeded). Literal retry burns a turn and can teach the wrong lesson (“harness forbids git commit”) when the classifier is noisy.

**Minimal wording accepted:**

> A permission denial is evidence about that call, not a capability model. Do not silently drop or rewrite the plan. If a fan-out / land precondition cannot be established, stop and report the exact blocked command. Prefer asking the user over inventing a workaround that changes shared state.

**Explicitly refuse to prescribe:** Mandatory single verbatim retry; “never reroute” as an absolute (asking the user *is* a route); treating two denials as proof of harness policy.

### Allow-list

**Why defer:** Tracked allow for `git add`/`commit` reduces prompt fatigue **if** hooks remain the real gate — but Cursor/Anthropic prefer not documenting every command, and a committed allow-list can create **false confidence** if hooks are skipped or copied to a repo without them (`01-env` already notes non-portability). No authoritative primary doc says “allow-list commit in settings.json”; it’s harness-specific taste. Defer until a repeated, measured pain on this repo after ENV-3/hooks are stable.

**Explicitly refuse to prescribe:** Shipping the exact eight-entry JSON from `01-env` as portable GENERAL.

**Confidence:** med (behaviour) · med (defer allow-list)

---

## 7. ENV-6 — deny interactive `pnpm approve-builds`

**Rule (one line):** Deny `Bash(pnpm approve-builds:*)` in tracked settings (no new known-walls doc); prefer declarative `pnpm.onlyBuiltDependencies` (already present).

**Class:** mixed — deny line = mechanical rail; “all interactive TUIs → deny-rules” = cognitive/policy

**Verdict:** **adopt-narrowed**

**Why:** Instance already mitigated (`package.json` `onlyBuiltDependencies`). Interactive TUI + non-interactive agent stdin is a known hang class; Anthropic’s “use a hook/deny to block regardless of model decision” fits better than a discoverable markdown wall. Creating `docs/agents/known-walls.md` fails the discovery problem `01-env` names. Cursor: don’t document every command in always-on rules.

**Failure mode if adopted blindly:** Deny-list whack-a-mole for every interactive CLI; agents stop trying legitimate `pnpm` subcommands; prose GENERAL sprawl.

**Minimal wording accepted:**

> Do not create a known-walls doc for this. If a tracked Claude permissions file is introduced, add `deny: ["Bash(pnpm approve-builds:*)"]`. Prefer `pnpm.onlyBuiltDependencies` (already set) over interactive approve.

**Explicitly refuse to prescribe:** A family-level encyclopedia of TUIs in AGENTS; requiring settings.json solely for this one deny.

**Confidence:** high (narrow) · med (broader family rule → leave out)

---

## 8. Fix `.gitattributes` comment

**Rule (one line):** Rewrite or delete the landed `.gitattributes` header comment that asserts CRLF→orphan-trailing-space and cites `05-proto-codegen-crlf-contamination.md`.

**Class:** mechanical rail (correctness of tracked docs) — not a cognitive process rule

**Verdict:** **adopt**

**Why:** Reconcile C5/C23: comment encodes the **retracted** RSN-2 mechanism and a **nonexistent** ticket filename. Handoff + ticket 05 + `749aa02` message: attributes exist for dirty-status / lint-staged under `autocrlf`, and do **not** change committed trailing-space bytes. Leaving the false comment is a durable instruction-channel hazard — exactly the failure mode the retro studied. Primary docs are unnecessary; repo facts suffice. Pass-B Blocked already forbids citing this comment as mechanism evidence.

**Failure mode if adopted blindly:** Replacing the lie with a new speculative cause; “fixing” the comment by regenerating protos to drop spaces (Blocked C8).

**Minimal wording accepted:**

> Replace the comment with a short accurate note: path `text eol=lf` pins checkout/normalization for these trees so Windows `autocrlf` does not leave generated protos permanently modified for lint-staged; see ticket `05-proto-codegen-byte-stability.md` for the separate trailing-space / Linux CI question. Or delete the comment entirely.

**Explicitly refuse to prescribe:** Any restatement of CRLF-orphan-space; any Done-when that regenerates to purge the seven lines.

**Confidence:** high

---

## Blocked candidates (do not adopt) — honored

Per `06-RECONCILE.md` §5 and this pass’s stance — **reject / do not recommend:**

| Item | Notes |
| --- | --- |
| Retro ENV-2 `packages/core/src/proto/** -text -diff` (and `data/proto` `-text`) | Commits platform CRLFs; breaks ubuntu `git diff --exit-code` gate (`01-env` experiment) |
| Cite `.gitattributes` comment as CRLF mechanism evidence | Comment is false (C5/C23); fix the comment instead |
| Pseudo-stack: attributes + LF regen to purge trailing spaces / force CI green | Falsified (C8); ticket 05 is read-CI, not purge-spaces |
| Other ENV/RSN Blocked rows that encode CRLF→orphan-space or `04-rsn` ticket paste | Out of scope to re-litigate; not adopted |

---

## Summary table

| ID | Candidate | Class | Verdict | Conf |
| --- | --- | --- | --- | --- |
| ENV-1 project | vitest exclude + tracked `.gitignore` | mechanical | **adopt** | high |
| ENV-1 GENERAL | worktrees outside repo | cognitive | **reject** (defer product) | high |
| ENV-2 | global `* text=auto eol=lf` | mechanical | **defer** | med |
| ENV-3 | rename + name-collision GENERAL | mixed | **adopt-narrowed** | high/med |
| ENV-4 | CI `fetch_wowsimcli` | mixed | **defer** (reject strong GENERAL) | med-high |
| ENV-5 behaviour | retry once / stop / no silent replan | cognitive | **adopt-narrowed** | med |
| ENV-5 allow-list | tracked `.claude/settings.json` allows | mechanical | **defer** | med |
| ENV-6 | deny `pnpm approve-builds` | mixed | **adopt-narrowed** | high |
| ATTR comment | fix false `.gitattributes` comment | mechanical | **adopt** | high |

### Verdict counts

| Verdict | Count |
| --- | --- |
| adopt | 2 |
| adopt-narrowed | 3 |
| defer | 3 |
| reject | 1 (+ Blocked list honored, not counted as fresh rejects) |

*(ENV-5 counted as two rows: narrowed behaviour + deferred allow-list. ENV-1 GENERAL = reject.)*

### Do not adopt (explicit list)

1. GENERAL “worktrees belong outside the repo” as unconditional doctrine  
2. Global `* text=auto eol=lf` (for now)  
3. CI fetch of wowsimcli as a required portable rule / “ENV-4 incomplete until fetch”  
4. Rigid “retry denial once verbatim then stop” checklist  
5. Tracked git allow-list JSON as written in `01-env` (yet)  
6. New `docs/agents/known-walls.md`  
7. Broad untested ban on all `agents.md` / every instruction-like filename  
8. Anything on the Pass-B **Blocked** list (proto `-text`/`-diff`, citing the false attributes comment as evidence, attributes+regen purge/CI-green stack, CRLF-contamination ticket text)

### Top risks if someone adopted *everything* uncritically

1. **False causal certainty:** global attributes + comment + regen stack re-teaches the retracted CRLF→orphan-space story and “fixes” CI that may already be green.  
2. **Harness fight + blind spots:** forcing out-of-repo worktrees against Claude Code defaults while under-maintaining excludes; filename denylists create safety theater.  
3. **Over-scripted cognition:** retry-once/stop and fat always-on permission/allow doctrine burn context, induce adverse literal compliance (OpenAI), and hide shape-sensitive denials — while silent-replan *prevention* was the only load-bearing part of ENV-5.

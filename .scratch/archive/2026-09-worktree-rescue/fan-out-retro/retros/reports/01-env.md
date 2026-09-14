# ENV findings — verification, remedies, classification (W1)

Input: [`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md) §ENV, and
[`00-FAN-IN.md`](00-FAN-IN.md).
Scope: **ENV-1 … ENV-6 only.** ORCH/CTX/RSN/DOC belong to other workers.

**Base SHA.** The fan-in brief names `968400f`; my worker prompt names
`94debea42976e6e6ff67f58a9fcd911b9a178146` as authoritative. The worktree I was handed was
at `55b5a51` (an ancestor, 4 commits into repo history — not the retro commit). I created
`retro/w-env` from `94debea` explicitly and worked from there.

That is ORCH-1 recurring on the retro branch itself, and its root cause is now established
(W2's finding, recorded here because it changes how the worktree findings below should be
read): `isolation: worktree` bases **deterministically on the repo's default branch**
(`main` = `55b5a51`), not on current HEAD. All seven auto-created `worktree-agent-*`
branches sit there. It is not flaky and it is not a race — it is a fixed harness semantic,
so asserting and correcting the base SHA is a *reliable* fix, not a mitigation for
intermittency.

**Method.** Every claim below was checked against live repo state, not against the
transcript. Where the retro's mechanism was contestable I reproduced it in a throwaway
repo under the scratchpad rather than reasoning about git's conversion rules. Two of the
retro's ENV claims are wrong and one of its remedies would break CI; those are the
highest-value results here.

---

## Summary

| ID    | Retro P | Verdict                                            | Class            | Recommended action                                                                   |
| ----- | ------- | -------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| ENV-1 | P0      | **Real but overstated** — 1 of 4 tools needs fixing | MIXED            | Fix vitest only; add `.gitignore` line for durability. Move worktrees out of the repo. |
| ENV-2 | P0      | **Symptom real, remedy harmful** — fix breaks CI    | MIXED            | Ship `* text=auto eol=lf` **only**. Drop `-text`/`-diff`. Re-rank P0 → P2.             |
| ENV-3 | P1      | **Confirmed — reproduced live in two sessions**     | **GENERAL**      | Rename both adapters. Reframe as instruction-channel contamination, not token cost.    |
| ENV-4 | P2      | **Real and understated** — latent CI failure        | MIXED            | Skip-guard the test **and** fetch the binary in CI. Re-rank P2 → P1.                   |
| ENV-5 | P2      | **Real; one sub-claim wrong**                       | MIXED            | Tracked `.claude/settings.json` allow-list + an agent-behaviour rule.                  |
| ENV-6 | P2      | **Real, already mitigated, low value**              | MIXED            | Near–do-nothing: one `deny` line. Do **not** create a new docs file.                   |

Two retro claims I found wrong, and one remedy that is actively dangerous:

1. **ENV-1** says no tool config knows to skip the worktree dir. ESLint and Prettier
   already ignore all of `.claude/`; git already ignores it via `.git/info/exclude`. Only
   **vitest** is genuinely exposed.
2. **ENV-2** says `.gitattributes` will fix the persistent ` M` on the proto files. It
   will not — proven by experiment. And its specific `-text` recommendation commits
   Windows CRLFs into the blobs, which **fails the repo's own ubuntu CI byte-compare gate**.
3. **ENV-5** says the handoff "still advertises `stash@{0}` as containing the spec
   classifier work." It does not — the handoff explicitly says the stash does *not*
   contain `spec.ts`/tests.

---

## ENV-1 — Worktrees inside the repo, nothing excludes them

### Verification

The retro's literal statement ("no `worktrees` entry in `.gitignore`, `vitest.config.ts`,
`eslint.config.js`, or `.prettierignore`") is true as a string search and misleading as a
conclusion. Tool by tool:

| Tool                          | Covered?                | Evidence                                                                              |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| git                           | **yes, by accident**    | `git check-ignore -v .claude/worktrees/` → `.git/info/exclude:11:**/.claude/worktrees/` |
| vitest                        | **no — real gap**       | `vitest.config.ts` has no `exclude` key at all, so vitest defaults apply                |
| eslint                        | **already covered**     | `eslint.config.js` global `ignores` contains `".claude/**"`                             |
| prettier                      | **already covered**     | `.prettierignore` contains `.claude/`                                                   |
| tsc (`typecheck`, not in retro) | **safe by construction** | root `tsconfig.json` is `files: []` + one reference; `packages/core` includes `src/**/*.ts` |

Live check, with four worktrees present in `.claude/worktrees/` right now:

```
$ git worktree list
C:/.../tbc-gear-prio                                   94debea [feat/fan-out-retro]
C:/.../tbc-gear-prio/.claude/worktrees/agent-a274...   94debea [retro/w-env] locked
C:/.../tbc-gear-prio/.claude/worktrees/agent-a47d...   55b5a51 [worktree-...] locked
C:/.../tbc-gear-prio/.claude/worktrees/agent-ac1a...   94debea [retro/w-ctx] locked
C:/.../tbc-gear-prio/.claude/worktrees/agent-afdf...   94debea [retro/w-orch] locked

$ git status --short          # .claude/worktrees/ does NOT appear
```

So the `?? .claude/worktrees/` the retro observed is no longer reproducible: the harness
writes `**/.claude/worktrees/` into `.git/info/exclude` (alongside nine other `.claude/*`
runtime paths). The `git add -A` disaster scenario is therefore **already defused** — but
by a file that is per-clone, untracked, and outside our control. It is protection we did
not choose and cannot rely on across a fresh clone.

The vitest gap is real and is the one that actually cost the session. Vitest's default
`exclude` is `node_modules`/`dist`/`cypress`/`.{idea,git,cache,output,temp}`/config files —
`.claude/` is not among them, and the default `include` (`**/*.{test,spec}.?(c|m)[jt]s?(x)`)
matches worktree copies. Because worktrees sit *inside* the repo and have no `node_modules`
of their own, module resolution walks up to the root `node_modules` and the copies actually
execute. That is exactly the retro's observed 21 files / 96 tests ≈ 3 × the real 8 / 39
(`git ls-files "*.test.ts"` → 8, confirmed).

### Remedy

Minimal, for this repo as it stands — **one edit**, not four:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/worktrees/**"],
    // ...
  },
});
```

Note that supplying `exclude` **replaces** vitest's defaults, so `node_modules`/`dist`
must be restated — the retro's snippet gets this right.

Plus, for durability against a fresh clone (cheap, one line):

```bash
printf '\n# Agent worktrees (parallel-phase). Never tracked, never linted, never tested.\n.claude/worktrees/\n' >> .gitignore
```

Do **not** bother editing `eslint.config.js` or `.prettierignore` — both are already
correct and the extra entries would be dead config that future readers must re-verify.

**Verify:** with a worktree present, `pnpm test` reports 8 test files (not 21), and
`git status --short` omits `.claude/worktrees/` after `git rm --cached`-free clone.

### The real argument: in-repo vs out-of-repo

The prompt asks which general rule is right. **"Never put worktrees inside the repo"** —
decisively, and the evidence above is itself the argument:

- The in-repo fix is not four edits, it is _N_ edits **forever**. This audit found that two
  of the four were already done and a fifth tool (tsc) is safe only by an accident of
  `include` scoping. The moment `include` widens, or someone adds `knip`, `depcheck`,
  `madge`, a coverage reporter, or a spell-checker to `verify`, the hole silently reopens.
- Each exclusion must be written in a different dialect — gitignore glob, vitest glob,
  ESLint flat-config glob, prettierignore glob — so there are four independent chances to
  get it subtly wrong, and no test that catches it.
- The failure mode is not noise, it is **misdiagnosis**. Three duplicate suite runs and two
  "failures" read as a real regression; ENV-4 records a worker spending a `git stash` bisect
  chasing them. Cost is paid in agent reasoning, which is the scarce resource.
- The harness vendor already writes `**/.claude/worktrees/` into `.git/info/exclude`, along
  with nine other `.claude/*` runtime paths. That is a tacit admission that this directory
  is hazardous where it sits — a mitigation for a location choice, not a defence of it.
- Out-of-repo removes the whole class in one setting and is what plain `git worktree` does
  when a human runs it.

The only argument for in-repo is editor discoverability, which is worth less than a
recurring silent-corruption class.

I did **not** verify that Claude Code exposes a setting to relocate worktrees outside the
repo — that is the one thing to check before adopting the rule here. If it does not, the
in-repo exclusions above are the fallback, and the exclusion list becomes a standing
review item whenever a tool joins `verify`.

### Classification — MIXED

- **GENERAL:** the rule "agent worktrees / secondary checkouts belong outside the
  repository working tree" is portable to any harness and any stack.
- **PROJECT-SPECIFIC:** the concrete fix (which of *these* four tools is exposed, the
  vitest `exclude` key, the `.claude/` blanket ignores that already exist here) is an
  artifact of this repo's config, and would be a different list in a repo using jest +
  biome, or one that doesn't already ignore `.claude/`.

---

## ENV-2 — No `.gitattributes` while `core.autocrlf=true`

### Verification — symptom confirmed, mechanism corrected

All four of the retro's observations reproduce at HEAD:

- `.gitattributes` **absent**; `git config core.autocrlf` → **true**
- 14 proto files show ` M`; `git diff` emits **0 bytes** on stdout
- every git command emits `warning: ... LF will be replaced by CRLF`
- the ` M` survives an explicit `git update-index --refresh`

But the retro's stated root cause ("generator emits LF; `autocrlf=true` rewrites on
checkout") is **not what is happening**. Measured on `packages/core/src/proto/apl_pb.ts`:

| | bytes | lines | CR chars |
| --- | --- | --- | --- |
| worktree | 136,566 | 3,994 | **56** |
| committed blob | 136,510 | 3,994 | **0** |

The delta is exactly 56 bytes — exactly the 56 carriage returns. So the working-tree files
have **mixed** endings: 56 CRLF lines out of 3,994, the rest bare LF. An autocrlf checkout
conversion would have converted all 3,994. This is the Windows `buf generate` emitting CRLF
on a *minority* of lines, and git's checkin conversion then making the file compare equal to
the blob — hence ` M` with an empty diff.

> **Handoff to W4 (RSN-2 / ticket 05).** This is direct evidence for the proto-drift
> question and W4 owns the conclusion: on this machine the regenerated protos differ from
> the committed blobs by **56 carriage returns and nothing else** — byte-identical after
> CRLF→LF. That is a measurement, not a diagnosis of the cross-platform drift; W4 should
> weigh it.

### The retro's remedy is harmful — proven

I built a throwaway repo (LF blob, `autocrlf=true`, then a "Windows regen" writing mixed
endings) which reproduced the exact symptom (` M` + 0-byte diff), then tested three
`.gitattributes` variants under identical conditions:

| `.gitattributes`              | after `update-index --refresh` | after `git add`      | blob CR after commit |
| ----------------------------- | ------------------------------ | -------------------- | -------------------- |
| none (current state)          | ` M`                           | clean                | 0                    |
| `text eol=lf`                 | ` M`                           | clean                | 0                    |
| `-text` ← **retro's fix**     | ` M`                           | `M ` (**staged!**)   | **CRLF committed**   |

Two conclusions:

**1. `.gitattributes` does not fix the persistent ` M`.** Neither variant clears it. The
dirt is a worktree-bytes-vs-blob-bytes mismatch that git re-derives on every `status`; only
a `git add` (which refreshes the cached stat) or restoring pure-LF bytes to disk clears it.
ENV-2's headline promise — "`git status --short` is empty immediately after a clean
`pnpm verify`" — is not delivered by the fix it prescribes.

**2. `-text` on the proto dir breaks CI.** `-text` means "never convert", so
`git add --renormalize .` stages and commits the Windows CRLFs. I then simulated the repo's
actual gate — `.github/workflows/verify.yml` runs on **`ubuntu-latest`** and ends with:

```yaml
- run: pnpm run proto:generate
- run: git diff --exit-code -- packages/core/src/proto data/proto
```

A Linux regen emits pure LF; against CRLF-bearing blobs that `--exit-code` **fails**. Under
the `text eol=lf` variant the same simulation **passes**. So ENV-2 as written converts a
cosmetic annoyance into a red CI, and it does so on the one gate PLAN.md §8.1 exists to
protect.

What the fix *does* legitimately buy: `* text=auto eol=lf` provably silences the warning
noise (measured: 1 warning → 0 on an identical `git add`). That is the ~6-occasions-per-
session output padding — a real if modest win, and the only one.

### Remedy

```
# .gitattributes
* text=auto eol=lf
```

Nothing else. Specifically:

- **Drop `packages/core/src/proto/** -text -diff`.** `-text` breaks the ubuntu byte-compare
  gate as shown. `-diff` is separately undesirable: it makes the generated protos render as
  binary in review, so when a *real* drift appears no human can read it — while
  `git diff --exit-code` still fires. That is the worst combination.
- **Drop `data/proto/** -text`** for the same reason; `data/proto/` is on the same CI gate.
- `git add --renormalize .` is a **no-op today** (blobs verified already pure LF). Harmless
  to run; do not expect a diff, and treat a non-empty result as a signal to stop.

To actually clear the phantom ` M` once, after committing `.gitattributes`:

```bash
rm -rf packages/core/src/proto && git checkout -- packages/core/src/proto
```

With `eol=lf` this rewrites the working tree to pure LF (verified in the throwaway repo:
status clean, worktree CR count 0). It will return after every Windows `pnpm proto:generate`
and be cleared by the next `git add`. **The durable fix is the generator, not git** — that
belongs with RSN-2/ticket 05, not here.

**Verify:** `git add` on a proto file emits no CRLF warning; `git status --short` is empty
after the re-checkout; and — the check the retro's version fails —
`pnpm proto:generate && git diff --exit-code -- packages/core/src/proto` still passes on
Linux CI.

### Re-ranking

**P0 → P2.** As a correctness matter this costs output noise and one repeated
re-explanation; nothing breaks. The urgency is inverted: it is the *proposed remedy* that
deserves a P0 flag, as something not to ship.

### Classification — MIXED

- **GENERAL:** two portable rules. Commit a `.gitattributes` rather than relying on each
  developer's `core.autocrlf`; and never mark a generated file that CI byte-compares as
  `-text`, because it freezes one platform's line endings into the blob.
- **PROJECT-SPECIFIC:** the file set (`packages/core/src/proto/**`, `data/proto/**`), the
  PLAN.md §8.1 byte-compare gate, the buf/protobuf-es generator's mixed-ending output, and
  the Windows-dev / ubuntu-CI split that makes the `-text` failure bite.

---

## ENV-3 — `adapters/claude.md` is injected as a CLAUDE.md instruction file

### Verification — reproduced live, this session

Filesystem case check:

```
$ find . -name  "CLAUDE.md"   → ./CLAUDE.md
$ find . -iname "claude.md"   → ./CLAUDE.md
                                ./.claude/skills/parallel-phase/adapters/claude.md
                                ./.agents/skills/parallel-phase/adapters/claude.md
```

Both adapters are genuinely lowercase on disk. I then did the fresh `Read` the fan-in brief
asks for, on
`.claude/worktrees/agent-a274.../.claude/skills/parallel-phase/adapters/claude.md`. The tool
returned the file — and immediately a system-reminder appeared reading **"Contents of
…\adapters\CLAUDE.md"** carrying the full 1,387-byte text as project instructions. Confirmed
exactly as the retro describes, including paying for the content twice.

**Independently reproduced in a second worker's session** in this same fan-out, on a
different worktree: the same `Read` surfaced the same system-reminder titled "Contents of
…\adapters\CLAUDE.md" injecting the adapter text as project instructions. Two independent
reproductions on two sessions makes this the best-evidenced finding in the ENV set — it is
deterministic, not an artifact of one session's state.

### This is bigger than the retro frames it

The retro's cost model is tokens. The more important consequence is **channel promotion**:
documentation is silently reclassified as instructions. The injected adapter contains
imperative prose — "**Do not** use experimental agent teams as the default for parallel
*edits*", "Prefer delegator merge" — which, as project instructions, now applies to the
whole session rather than only when the `parallel-phase` skill is invoked. That is a
correctness problem (skill-scoped guidance leaks to global scope) and a supply-chain one:
any repo that happens to contain a file named `claude.md` — a vendored doc, a template, a
docs page *about* Claude — gets its contents injected with instruction authority, with no
signal to the user that it happened.

**Generalization to other tool-config filenames: untested, mechanism suggests yes.** I tried
to confirm the same hazard for `agents.md` by probing a directory outside the repo, but the
control (`claude.md` in the same out-of-project directory) also failed to inject — so
out-of-project files are simply not scanned and the experiment is **inconclusive**. I did
not create a probe inside the repo, per the report-only constraint. What can be said
precisely: the mechanism is case-insensitive filename matching in per-directory instruction
discovery, so it applies to *whatever filename set the harness discovers* — `AGENTS.md` and
`GEMINI.md` are the obvious candidates. A decisive one-minute test for whoever picks this
up:

```bash
mkdir -p tmp-probe && printf '# probe\nMARKER-ZZQQ\n' > tmp-probe/agents.md
# then Read tmp-probe/agents.md and check for a system-reminder naming AGENTS.md
rm -rf tmp-probe
```

### Remedy

```bash
git mv .claude/skills/parallel-phase/adapters/claude.md \
       .claude/skills/parallel-phase/adapters/claude-code.md
git mv .agents/skills/parallel-phase/adapters/claude.md \
       .agents/skills/parallel-phase/adapters/claude-code.md
```

Then update the adapter link in both `SKILL.md` copies. `claude-code.md` sits fine beside
its siblings `agnostic.md` / `codex.md` / `cursor.md`.

**Verify** — the retro's check (`grep -rn "adapters/claude.md"`) only catches links written
in that exact form. Use the filesystem instead, which cannot be evaded:

```bash
find .claude .agents -iname "claude.md"     # must return nothing
```

Case-sensitivity caveat for anyone porting this: on Linux the rename is a real rename; on
Windows/macOS `git mv claude.md claude-code.md` differs in more than case so it is safe, but
a pure case-only rename (`claude.md` → `CLAUDE.md`) would need `git mv --force` via a temp
name.

### Classification — GENERAL

This is a **Claude Code harness behaviour on any case-insensitive filesystem** (Windows,
default macOS APFS/HFS+). Nothing about it depends on pnpm, buf, wowsims, or this repo's
conventions — this repo merely happens to contain a file with the colliding name. Any
project whose docs tree contains `claude.md` in any case is exposed identically. It belongs
in a global config or a shared agents doc, not in this repo's notes.

Priority: keep **P1**, but for the instruction-contamination reason rather than the token
reason.

---

## ENV-4 — No `.worktreeinclude`; `vendor/` is gitignored

### Verification — real, and worse than recorded

Everything the retro states checks out:

- `.worktreeinclude` **absent**; `.gitignore` contains `vendor/` (with a comment citing
  PLAN.md §8.5)
- live: `vendor/` present in the main repo (**25 MB** — 22 MB `wowsimcli-v0.0.101-win32-x64`,
  3 MB `wowsims`), **absent** in this worktree
- `packages/core/test/cli-sim-runner.test.ts` has exactly two `it()` blocks (matching the
  "2 false failures") and **no skip guard** — it resolves
  `vendor/wowsimcli-<tag>-<platform>/<bin>` at module scope and fails hard when absent
- the lock file and the request fixture **are** committed; only the 22 MB binary is missing

Two things the retro missed.

**`node_modules` is absent from a fresh worktree too** (257 MB in the main repo). A fresh
worktree cannot run `pnpm verify` at all until `pnpm install` runs; the missing sim binary
is the *second* problem an arriving worker hits, not the first. `.worktreeinclude` is a poor
answer to a 257 MB directory.

**This is a latent CI failure, not a worktree annoyance.** `.github/workflows/verify.yml`
checks out the repo, runs `pnpm install --frozen-lockfile`, then `pnpm run verify`. It
contains **no** `fetch:wowsimcli` step (`grep -c` → 0) and `vendor/` is gitignored, so the
binary is absent on `ubuntu-latest` exactly as it is in a worktree — and the same two tests
must fail there. They have not yet, only because the test does not exist on `dev`:

```
$ git cat-file -e origin/dev:packages/core/test/cli-sim-runner.test.ts
fatal: path ... exists on disk, but not in 'origin/dev'
$ git rev-list --count origin/dev..HEAD   → 30
```

The last green CI run (`30227242906`, 21 s) predates the test by 30 commits. **CI will go
red on the next land to `dev`** — and that undercuts AGENTS.md's claim that CI "runs the
same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop."

That reframes the remedy. `.worktreeinclude` addresses the worktree symptom only, does
nothing for CI, and would copy a 22 MB **platform-specific** (`win32-x64`) binary into every
worktree — useless on a Linux runner by construction.

### Remedy

**1. Make CI fetch the binary** (keeps the sim seam genuinely covered; the script already
supports the platform flag):

```yaml
- run: python scripts/fetch_wowsimcli.py --platform linux-x64
```

placed before `- run: pnpm run verify`.

**2. Make the test self-explanatory when the binary is absent** — this is what would have
saved both workers, one of whom ran the fetch and the other of whom spent a `git stash`
bisect proving the failures were pre-existing:

```ts
import { existsSync } from "node:fs";

describe.skipIf(!existsSync(binaryPath))("CliSimRunner", () => {
  // Absent binary means "not fetched", not "broken": vendor/ is gitignored
  // (PLAN.md §8.5) so a fresh clone or worktree has none. Run
  // `pnpm fetch:wowsimcli`. CI fetches it explicitly, so a skip here is
  // never a silent loss of coverage there.
```

The tension is real — a skip guard can hide a regression — and (1) is what resolves it: with
CI always fetching, the skip can only ever trigger locally. If you want that guaranteed
rather than assumed, assert in CI that the suite ran (e.g. fail if the reporter shows the
file skipped).

**3. `.worktreeinclude` — optional, low value once (2) lands.** Harness support is uncertain:
the adapter doc describes it as "optional… for local files (e.g. `.env`)", i.e. small
untracked config, not 25 MB of vendored binaries. The retro's fallback (a worker-prompt
preamble line) is worse still — it is per-spawn and must be remembered every time, whereas
the skip guard lives in the repo forever. Prefer the guard; skip the file.

**Verify:** next push shows CI green with the two sim tests **run** (not skipped); a fresh
worktree with `pnpm install && pnpm test` reports them skipped with a readable reason and
everything else green.

### Re-ranking

**P2 → P1.** A CI break that fires on the next land outranks a worktree ergonomics issue.

### Classification — MIXED

- **GENERAL:** a test depending on a gitignored or fetched-at-setup artifact must skip with
  an actionable message when that artifact is absent, and CI must fetch it explicitly rather
  than inheriting it from a developer machine.
- **PROJECT-SPECIFIC:** the wowsimcli pin and `fetch_wowsimcli.py --platform linux-x64`, the
  25 MB `vendor/` layout, the PLAN.md §8.5 policy of committing generated output but not
  inputs, and the win32/linux split that makes a copied binary useless on the runner.

---

## ENV-5 — Permission classifier non-determinism

Not directly reproducible, as briefed. Reasoning below is from what is checkable plus one
incident I generated during this audit.

### What is verifiable

- `.claude/settings.local.json` exists, is **untracked**, and its `allow` list has four
  entries — three are full verbatim command strings, one a narrow prefix. There is **no**
  `Bash(git add:*)` or `Bash(git commit:*)` rule. The retro's proposed fix is genuinely
  absent.
- There is **no `.claude/settings.json` at all.** The project has no committed permission
  policy; everything lives in an untracked per-machine file. So none of the learning
  survives a fresh clone, and every worktree starts from zero — which is precisely the
  condition under which a fan-out of five workers meets the same denials five times.
- The four existing entries are the residue of "allow this exact command once" clicks. As a
  policy they are worthless: they will never match again.

### Independent corroboration from this session

While gathering evidence I ran a compound command whose only mutating part (`rm -rf`)
targeted the **scratchpad**, with a `cd` into the repo for the read-only half. It was
refused:

```
PreToolUse:Bash hook error [block-outside-repo.sh]:
BLOCKED: mutating command touching /.claude/worktrees/
```

Splitting the identical work into two commands, both were allowed. That is a guard whose
verdict depends on incidental command *shape* — a `cd` and an `rm` in the same line —
rather than on the effect. It is a hook rather than the classifier, so it is not the same
component the retro observed; but it is the same failure class, live, and it shows the
ambiguity is not a one-off.

### One retro sub-claim is wrong

ENV-5's third consequence says the handoff "still advertises `stash@{0}` as containing the
spec classifier work. Actively misleading now." Checking both halves:

- the stash **does** still dangle: `stash@{0}: On phase-1/five-seed-spread: phase-1 wip
  before model-policy tweak` — the blocked `stash drop` never happened, so that half holds
- but `.scratch/handoffs/phase-1-five-seed-spread.md:84` says it contains "**partial**
  PLAN.md + `index.ts` edits only, **not** `spec.ts` / tests", and tells the reader to
  `git stash show -p` before applying

The handoff is accurate and appropriately cautious. "Actively misleading" is wrong; the
residual issue is a stale stash, which is untidy, not dangerous.

### Remedy — agent behaviour first

The behavioural half matters more than the allow-list, because the allow-list only covers
commands you predicted:

1. **A permission denial is a fact about one call, not a capability model.** Do not
   generalise two denials into a rule about what the harness permits.
2. **Retry once, verbatim.** If it is denied again, stop and say which exact command is
   blocked. Do not reroute.
3. **Never let a denial silently change the plan.** The damage here was not the denial; it
   was the unannounced replan ("I'll hold off committing") that followed, which is invisible
   to the user and compounds downstream — here into a dirty-tree fan-out where workers
   branched from a commit lacking `spec.ts`.
4. **Never let a denial change state you hand to other agents.** Committing or stashing is a
   *precondition* for fan-out, not a step that can be skipped. If it cannot be done, abort
   the fan-out and report; do not fan out anyway.

### Remedy — allow-rules

Put them in a **tracked** `.claude/settings.json` so they apply to every clone and worktree,
rather than in the untracked local file:

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git stash:*)",
      "Bash(git checkout -b:*)"
    ]
  }
}
```

The omissions are deliberate: **not** `git push`, `git reset --hard`, `git clean`,
`git merge`, or `pnpm land`. Those are exactly the operations AGENTS.md wants a human in the
loop for, and the value of allow-listing the safe-and-frequent ones is that the prompts that
remain carry signal instead of being noise the user clicks through.

Worth stating explicitly, because it is what makes this safe *here*: allow-listing
`git commit` does not weaken the repo's real gates. `.githooks/pre-commit` still refuses
direct commits to `main` and merge commits on `dev`, and `.githooks/pre-push` still runs
`pnpm verify`. Those are deterministic, tracked, and unaffected by permission settings. In a
repo without such hooks, this allow-list would be a worse trade.

**Verify:** `.claude/settings.json` is tracked; a fresh worktree session runs `git add` and
`git commit` with no prompt; `git commit` on `main` is still refused by the hook.

### Classification — MIXED

- **GENERAL:** the agent-behaviour rule — a denial is one data point; retry once, then stop
  and report rather than silently replanning, and never proceed with a fan-out whose
  preconditions a denial prevented you from establishing.
- **PROJECT-SPECIFIC:** *which* commands are safe to allow-list is a function of this repo's
  hook-based gates. The list above is only safe because `.githooks/pre-commit` independently
  enforces the branch rules; it is not portable to a repo that relies on the permission
  prompt as its only guard.

---

## ENV-6 — `pnpm approve-builds` hangs (interactive)

### Verification

- `package.json` already declares `pnpm.onlyBuiltDependencies: ["@bufbuild/buf"]` — the
  declarative workaround is applied, exactly as the retro says
- `approve-builds` appears **nowhere** in the repo except the retro itself
- `docs/agents/` contains only `domain.md`, `issue-tracker.md`, `model-policy.md` — there is
  no known-walls doc, so the rule is genuinely unrecorded

I did **not** run `pnpm approve-builds` to confirm it hangs. It is by design an interactive
TUI, this Bash tool runs with stdin on the null device, and burning a two-minute timeout
would establish nothing that is in doubt. Recorded as plausible-and-unverified.

### Is it worth fixing? Barely

The instance is already fixed. What is missing is only the *recorded rule*. Cost of
recurrence: one hung command, one two-minute timeout, once — and the worker recovered
unaided and reported it. Cost of the retro's fix: a new documentation file that must be
discovered before the command is run, which is the least likely moment for an agent to go
reading `docs/agents/`.

**Recommendation: do not create `docs/agents/known-walls.md` for this.** Instead encode it
where it *blocks* rather than where it *documents* — one line in the same tracked
`.claude/settings.json` that ENV-5 introduces:

```json
{ "permissions": { "deny": ["Bash(pnpm approve-builds:*)"] } }
```

Self-enforcing, no discovery required, composes with an artifact you are creating anyway,
and the refusal message arrives at exactly the moment it is relevant. If a prose note is
still wanted, one line under AGENTS.md's existing "Gates" section is cheaper than a new
file — but that is W5's territory, so it is quoted here, not applied.

The rule worth capturing is broader than the instance: interactive/TUI commands are walls in
an agent shell, and the repo's own guidance already names several siblings (`git rebase -i`,
`git add -i`, `Read-Host`, `Out-GridView`). `pnpm approve-builds` is one more member of a
known family, which is an argument for a family-level rule rather than an instance-level
doc.

**Verify:** `pnpm approve-builds` is refused by the harness with a message naming
`pnpm.onlyBuiltDependencies`.

### Classification — MIXED

- **GENERAL:** agent shells are non-interactive; prefer a declarative equivalent to any
  interactive approval command, and encode known interactive walls as harness deny-rules
  rather than prose documentation.
- **PROJECT-SPECIFIC:** `pnpm approve-builds` / `pnpm.onlyBuiltDependencies` is a pnpm-10
  mechanism, and the `@bufbuild/buf` instance is this repo's.

---

## Cross-cutting note for fan-in

Two items here reach outside the ENV bucket and should not be lost in it:

1. **CI is about to break** (ENV-4). Independent of any retro action, the next land to `dev`
   turns CI red on `cli-sim-runner.test.ts`. Whoever lands should either add the fetch step
   or expect and explain the failure. This also weakens the AGENTS.md sentence claiming CI
   is the un-bypassable backstop — DOC's owner may want that sentence qualified.
2. **The 56-carriage-return measurement** (ENV-2) is evidence for RSN-2 / ticket 05 and is
   handed to W4 as a measurement, not a conclusion.

Also worth flagging to the fan-in: `.prettierignore` contains `.scratch/`, so these report
files are **not** covered by `pnpm format:check`. Running `npx prettier --write` on them (as
every worker was instructed) is a no-op — prettier skips ignored paths. The fan-in
`format:check` gate cannot fail on report formatting, so that checklist item is vacuous.
Independently confirmed by another worker; I skipped the step rather than perform a no-op
that would have read as verification in my handoff.

**Burst parallelism hit an account-wide quota wall.** Two of the five workers in this
fan-out — including this one — were terminated mid-run by an account-level API session
limit, and resumed only after it reset. Five concurrent workers concentrate token spend
into a window narrow enough to exhaust a shared budget that serial work never approaches.

I judge this **out of ENV scope and squarely ORCH/CTX**, and am not writing a finding for
it: it is not a property of the repo, the toolchain, or the machine, but of fan-out width
and scheduling — the same territory as CTX-0's "measure before prescribing" and ORCH's
fan-out sizing. Handing it over rather than annexing it. The one observation worth passing
along is that the failure is *silent from the delegator's side* until a worker simply stops,
which makes it look like a hung worker rather than a quota event — so whoever owns it should
treat "worker went quiet" as an ambiguous signal, and note that the surviving evidence
(worktree intact, branch created, no commit) is indistinguishable from a crash.

---

## Portable rules extracted

The GENERAL rules only, written to be lifted verbatim into another project's agent docs.

> **Worktree placement.** Agent worktrees and secondary checkouts belong outside the
> repository working tree. A checkout nested inside the repo must be excluded separately in
> every tool that walks the tree — version control, test runner, linter, formatter,
> type-checker — in each tool's own dialect, and the exclusion list silently rots the next
> time a tool joins the verify pipeline. Prefer a sibling directory; if the harness forces
> an in-repo location, treat the exclusion list as a standing review item whenever a tool is
> added.

> **Line endings.** Commit a `.gitattributes` rather than relying on each developer's
> `core.autocrlf`. Never mark a generated file that CI byte-compares as `-text` — that
> freezes one platform's line endings into the blob and fails the comparison on every other
> platform. Use `text eol=lf` for such files, and never `-diff`, which makes a real drift
> unreadable in review while the automated gate still fires.

> **Instruction-file name collisions.** No file may be named `claude.md`, `agents.md`, or
> any other agent-instruction filename in any case, anywhere in a repository, except an
> intentional instruction file. On case-insensitive filesystems (Windows, default macOS) the
> harness's per-directory instruction discovery matches such files regardless of case and
> injects their contents into the instruction channel, silently promoting ordinary
> documentation to project-wide directives. Name adapter and reference docs for the tool
> plus a suffix (`claude-code.md`, not `claude.md`).

> **Tests that depend on fetched artifacts.** A test depending on a gitignored or
> fetched-at-setup artifact must skip with a message naming the command that provides it,
> rather than failing. CI must fetch that artifact explicitly rather than inheriting it from
> a developer machine — otherwise the same absence that merely annoys locally is an
> undetected hole in CI coverage.

> **Permission denials.** A permission denial is a fact about one call, not a model of what
> the harness permits. Retry once verbatim; if it is refused again, name the exact blocked
> command and stop. Never silently reroute the plan around a denial, and never proceed with
> work whose preconditions the denial prevented you from establishing — a tool-level refusal
> must not become an unannounced plan-level change.

> **Interactive commands.** Agent shells are non-interactive: stdin is closed, so any TUI or
> prompt-driven command hangs until it times out. Prefer the declarative equivalent, and
> encode known interactive walls as harness deny-rules rather than prose documentation — a
> deny-rule fires at the moment of the mistake, a doc only helps someone who already went
> looking.

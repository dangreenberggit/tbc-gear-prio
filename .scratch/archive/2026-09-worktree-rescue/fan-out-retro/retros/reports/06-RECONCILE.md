# Pass A — Cross-report reconciliation

## 1. Status / base

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-reconcile` |
| Branched from | `feat/fan-out-retro` |
| Base SHA asserted | `2ba85c72c71714bf6f19f494f47cd06338934e9d` |
| `git rev-parse HEAD` | equals `feat/fan-out-retro` at start of work (**pass**) |
| Scope | Documentation / verification only — this file is the only allowed edit under `reports/` |

**Base assertion:** passed. Worktree was initially on `phase-1/five-seed-spread` (`81ca81b`); corrected with `git checkout -B retro/w-reconcile feat/fan-out-retro` before any reading.

## 2. Method + precedence

**Precedence (mandatory):** repo (reproducible commands / committed files) > verification reports > handoff > original retro.

The original retro (`.scratch/retros/2026-07-26-phase-1-fan-out.md`) is unverified input. Reports that still echo a wrong retro cause are noted even when the owning report already corrected the mechanism.

**Method:** for each disagreement, quote both sides briefly, run or cite a cheap repo check, then assign one of: `repo-wins` | `report-X-wins` | `both-partially-right` | `unresolved-needs-CI` | `unresolved-needs-human`. No new orchestration doctrine invented; no shared docs edited.

**Known hard facts** (re-listed with evidence so this file is complete; not re-litigated as open):

| Fact | Evidence |
| --- | --- |
| `04-rsn.md` CRLF “controlled experiment” does not reproduce; trailing spaces are ordinary `protoc-gen-es` output from bare `//` source lines; Windows regen reproduces `HEAD` | Ticket `05-proto-codegen-byte-stability.md`; handoff Live bugs §1 RETRACTED; `api.proto` bare `//` → `api_pb.ts:324` = `'   * '`; `c0acbfc^` has 0 trailing-space blank JSDoc lines where current generator emits 7 |
| Ring-enchant cause: `d77cba5` / profession gate, not “probe never included an enchanted ring” | `git log -1 d77cba5`; fan-in Known Defects; `04-rsn` RSN-2b |
| ORCH-1: `isolation: worktree` bases at `main`/`origin/main` (`55b5a51`), deterministic 7/7 | `git branch` on all `worktree-agent-*`; `00-FAN-IN.md`; `02-orch.md` |

---

## 3. Contradiction table

| ID | Parties | One-line conflict | Resolution |
| --- | --- | --- | --- |
| C1 | `04-rsn` vs handoff + ticket 05 | Proto trailing spaces = CRLF contamination / `c0acbfc` corruption vs ordinary generator output | **repo-wins** (retraction) |
| C2 | `04-rsn` vs ticket 05 | CI byte-compare “proven red” (14/16 sim) vs “read a real CI run; do not predict” | **unresolved-needs-CI** (proof claim overturned) |
| C3 | `04-rsn` proposed ticket text vs current ticket 05 | Replace ticket with CRLF-contamination rewrite vs byte-stability rewrite already landed | **repo-wins** |
| C4 | `01-env` ENV-2 vs `04-rsn` Done-when vs landed `.gitattributes` | Global `* text=auto eol=lf` only vs path-specific `text eol=lf` vs what shipped | **both-partially-right** |
| C5 | `04-rsn` / `.gitattributes` comment vs `749aa02` + ticket 05 Notes | Attributes exist to stop orphan trailing spaces / keep CI honest vs dirty-status / lint-staged only | **repo-wins** |
| C6 | `01-env` ENV-2 vs `749aa02` message | Attributes alone do not clear phantom `M` vs attributes address permanent modified protos | **both-partially-right** |
| C7 | `01-env` → W4 handoff vs retraction | “56 CR delta is drift evidence for ticket 05” as causal vs WT CRs ≠ committed trailing-space story | **repo-wins** (measurement keeps; causal link dies) |
| C8 | Pseudo-agreement `01`+`04`+retro | Ship `.gitattributes` / regen-from-LF to fix “corruption” and turn CI green | **pseudo-agreement falsified** for that purpose |
| C9 | `01-env` ENV-4 vs handoff “FIXED” | Skip-guard **and** CI fetch vs skipIf only landed; `verify.yml` still fetches nothing | **both-partially-right** |
| C10 | Retro vs `02-orch`/`00-FAN-IN`/`01-env` | ORCH-1 “flaky HEAD” vs deterministic default-branch base | **repo-wins** (known) |
| C11 | Retro / RSN-2c vs `d77cba5` / `04-rsn` 2b | “Never included enchanted ring” vs enchanter-only `requiredProfession` | **repo-wins** (known) |
| C12 | `04-rsn` severity vs handoff | RSN-2 proto instance is session’s highest-leverage / above ENV-1 vs never-a-bug retraction | **both-partially-right** (pattern ≠ instance) |
| C13 | `04-rsn` durable-claim rule vs handoff stronger rule | “Cite the command” sufficient vs regen must reproduce committed bytes | **both-partially-right** (strengthen) |
| C14 | `01-env` ENV-5 vs `05-doc` lifecycle | Handoff stash wording accurate / not “actively misleading” vs “misleading pointer” / “advertises spec-classifier work” | **report-01-wins** |
| C15 | Retro DOC-1 vs `05-doc`/`03-ctx` | Testing carve-out at PLAN.md §5 vs §6 | **report-05-wins** |
| C16 | Retro DOC-2 vs `05-doc` | Add new `Depends:` vs reuse existing `Blocked by:` | **report-05-wins** |
| C17 | Retro / handoff slip vs `05-doc` | Ticket 04 blocked on `compose` vs gem solver + execute path | **report-05-wins** |
| C18 | `00-FAN-IN` rule 8 vs `01`/`03`/`04` + `.prettierignore` | `format:check` gates reports vs `.scratch/` ignored (vacuous) | **repo-wins** |
| C19 | `02-orch` ORCH-4 vs `01-env` ENV-1 | Teardown-before-verify is load-bearing vs move worktrees out of repo (softens ORCH-4) | **both-partially-right** (coupled) |
| C20 | `02-orch` vs `01-env` on tool visibility | ORCH-4 names vitest/eslint/prettier as all exposed vs ENV-1: only vitest is | **report-01-wins** |
| C21 | `03-ctx` CTX-3 vs `02-orch` default | Fan-in ownership by mechanical/editorial shape vs “delegator preferred” boilerplate | **both-partially-right** |
| C22 | `02-orch` ORCH-5 vs retro | Reject ScheduleWakeup rule / no such guidance in repo vs retro’s cancel-timer rule | **report-02-wins** |
| C23 | Landed `.gitattributes` comment vs ticket path | Comment cites `05-proto-codegen-crlf-contamination.md` | **repo-wins** (stale false comment; file does not exist) |

**Counts:** 23 contradictions/pseudo-agreements catalogued · **20 resolved** (incl. known facts + both-partially-right) · **1 unresolved-needs-CI** (C2) · **0 unresolved-needs-human** as a blocker (see §6 for soft opens).

---

## 4. Detailed writeups

### C1 — Proto trailing-space mechanism (`04-rsn` vs retraction)

**`04-rsn.md` (RSN-2a):** Controlled experiment: LF `.proto` sources → 0 CR / byte-identical to `c0acbfc^`; CRLF sources → 474 CR; mechanism is comment-copied `\r` → autocrlf orphan trailing space; `c0acbfc` *introduced* corruption over correct output.

**Handoff Live bugs §1 + ticket 05:** RETRACTED. Regenerating on Windows reproduces `HEAD` exactly. The 7 `   * `/` * ` lines are ordinary `protoc-gen-es` output from bare `//` lines (e.g. `data/proto/api.proto` empty comment line → `api_pb.ts` `'   * '`). `c0acbfc^` is the state that *disagrees* with the generator (0 trailing-space blanks). Stripping `\r` cannot explain the space: `\r` sits *after* the space.

**Repo check:** `git show` counts — `c0acbfc^` blank trailing-space JSDoc = 0/0; `HEAD` = 1 in `api_pb.ts` + 6 in `common_pb.ts` (indent ` * `). Working-tree regen claim is the ticket’s verified Windows result (not re-run here: vendor/`@bufbuild` may be missing; ticket + `749aa02` message already record it).

**Resolution: `repo-wins`.** Do not treat `04-rsn`’s experiment table or “CI doom from orphan spaces” as established.

**Pass B:** Block any GENERAL/PROJECT rule or ticket text that encodes CRLF→orphan-space as the cause. Epistemic *pattern* rules from `04-rsn` remain eligible (see C12–C13).

---

### C2 — “CI proto byte-compare proven red”

**`04-rsn.md`:** Simulated 14/16 match; `api_pb.ts`/`common_pb.ts` differ → check fails; “now proven.”

**Ticket 05 Done-when:** Read a real CI run; do not predict. If green, trailing spaces are a non-issue. If red, *then* ask whether Linux `protoc-gen-es` differs.

**Why the simulation is not proof:** It assumed Linux generation emits blank JSDoc *without* the trailing space. After C1, Windows LF generation *includes* those spaces and matches `HEAD`. Linux may do the same → green. Nobody has read the run.

**Resolution: `unresolved-needs-CI`.** The *claim that failure is proven* loses; the *open question* stands as ticket 05.

**Pass B:** Do not adopt “fix trailing spaces before land” or “CI is already red on protos” as a P0. Push/read CI to close ticket 05.

---

### C3 — Ticket 05 replacement text

**`04-rsn.md`:** Quotes a full replacement framing CRLF contamination and Done-when = attributes + regen to *remove* the 7 lines.

**Repo:** `.scratch/carry-forward/issues/05-proto-codegen-byte-stability.md` (renamed; `cb5b2cd`) explicitly supersedes that text and records why the experiment does not reproduce.

**Resolution: `repo-wins`.** Applying the quoted block in `04-rsn` would re-corrupt the tracker.

**Pass B:** **Blocked** — do not paste `04-rsn`’s ticket markdown. Ticket already rewritten.

---

### C4 — `.gitattributes` shape

**`01-env` ENV-2:** Ship only `* text=auto eol=lf`. Drop path `-text`/`-diff`. Path `-text` would commit CRLFs and fail ubuntu byte-compare.

**`04-rsn` Done-when (pre-retraction):** Path rules `data/proto/**` + `packages/core/src/proto/**` `text eol=lf`, then regen to clear “corruption.”

**Repo (`749aa02`):** Path-specific `text eol=lf` for those two trees — **not** ENV-2’s global rule, **not** `-text`. Commit message: pins LF because CRLF checkouts left 14 generated files permanently modified for lint-staged — **not** a trailing-space fix.

**Resolution: `both-partially-right`.** ENV-2 wins on “never `-text`/`-diff`” (ticket 05 Notes agree). Landed shape matches `04-rsn`’s *paths*, not ENV-2’s global `*`. Global `* text=auto eol=lf` was never applied — still an open ENV-2 recommendation, independent of protos.

**Pass B:** **Unchanged** for anti-`-text`. **Recheck** whether to add global `* text=auto eol=lf` on top of existing path rules (noise reduction). **Do not** treat path rules as closing ticket 05’s trailing-space/CI question.

---

### C5 — Why `.gitattributes` exists (comment vs commits)

**Landed comment** (still in tree): claims protoc-gen-es + CRLF checkout → orphan trailing space; pinning LF “keeps the CI byte-compare honest”; cites `05-proto-codegen-crlf-contamination.md`.

**`749aa02` + ticket 05 Notes + handoff:** Attributes for dirty `git status` / lint-staged stash-restore; do **not** change committed bytes; not a trailing-space fix. Ticket file is `05-proto-codegen-byte-stability.md`.

**Resolution: `repo-wins`.** The comment is a durable false cause (exactly the RSN-2 failure mode) sitting in a tracked file.

**Pass B:** **Must-recheck / blocked-as-authority** — rewrite or delete that comment before anyone cites `.gitattributes` as evidence of the CRLF mechanism. Not a report contradiction alone: **report claim vs current repo state**.

---

### C6 — Does attributes clear phantom `M`?

**`01-env` ENV-2:** Neither `text eol=lf` nor `-text` clears persistent `M` by itself; need re-checkout / `git add`; dirt returns after Windows `proto:generate` until next add.

**`749aa02`:** Attributes address permanently modified protos under `autocrlf=true`.

**Resolution: `both-partially-right`.** Attributes change checkout/normalization going forward; ENV-2’s “status may still look dirty until renormalize/re-checkout” remains operationally true. At this tip, `git status --short packages/core/src/proto/` was empty despite WT still containing CR bytes on disk earlier in checks — git’s index/attr view can be clean while raw bytes are mixed.

**Pass B:** Soften any rule that promises “`.gitattributes` alone ⇒ immediately empty status forever after Windows regen.”

---

### C7 — ENV-2’s 56-CR measurement as RSN evidence

**`01-env`:** On `apl_pb.ts`, WT vs blob differs by exactly 56 CR bytes; handed to W4 as drift evidence.

**After C1:** WT CR noise under Windows generation/checkout is real; it does **not** establish that committed trailing spaces are autocrlf orphans, nor that Linux CI must fail.

**Resolution: `repo-wins` on causality.** Keep the measurement as ENV-2 symptom evidence (dirty status / warnings).

**Pass B:** **Weaken** any narrative that chains “56 CRs” → “ticket 05 corruption” → “must regen to purge spaces.”

---

### C8 — Pseudo-agreement: attributes + LF regen fix corruption / CI

Several artifacts agreed on a remedy stack: add `.gitattributes`, regenerate from LF, drop trailing spaces, CI goes green.

**Falsified purpose:** regen from LF *reproduces* the spaces (`749aa02` note; ticket 05). Attributes do not remove them. CI outcome unknown (C2).

**Resolution: pseudo-agreement falsified** for corruption/CI-green. Attributes may still be correct for status/lint-staged (already landed).

**Pass B:** **Blocked** — do not adopt “regen and commit to remove 7 lines” from `04-rsn` Done-when.

---

### C9 — ENV-4 “fixed” completeness

**`01-env` ENV-4:** (1) CI `fetch_wowsimcli.py --platform linux-x64` before verify; (2) `describe.skipIf(!existsSync(binaryPath))`; (3) `.worktreeinclude` low value.

**Handoff:** Live bug 2 FIXED (`749aa02`) with skipIf.

**Repo:** skipIf present; `.github/workflows/verify.yml` has **no** fetch step — still install → verify → proto:generate only.

**Resolution: `both-partially-right`.** “CI won’t go red on missing binary” is fixed. “CI exercises the real cli-sim-runner” is **not** — those tests skip on the runner too. ENV-4’s critique of AGENTS.md’s “CI is the un-bypassable backstop” still applies to this seam.

**Pass B:** **Recheck** — decide whether CI fetch is still wanted. Do not mark ENV-4 fully closed.

---

### C10 — ORCH-1 root cause (known)

**Retro:** Non-deterministic / flaky HEAD.

**`00-FAN-IN` / `02-orch` / `01-env`:** All 7 `worktree-agent-*` at `55b5a51` = `main` = `origin/main`. Deterministic default-branch basing.

**Repo check:** Confirmed at reconcile time — seven branches at `55b5a51`; `main`/`origin/main` same.

**Resolution: `repo-wins`.**

**Pass B:** **Strengthened** — unconditional base-SHA assert + correct `adapters/claude.md` (still says prefer feature-branch HEAD / `baseRef: head` when available). Retro’s “flaky” wording must not re-enter.

---

### C11 — Ring-enchant cause (known)

**Retro L695–696** (and RSN-2c): still praises verification with “never happened to include an enchanted ring.”

**`d77cba5` / `04-rsn` 2b / fan-in:** Profession gate; 4/141 enchants have `requiredProfession`.

**Resolution: `repo-wins`.**

**Pass B:** Any retro edit / success-story reprint must use `d77cba5`’s cause. Rule “praise suppresses scrutiny” from `04-rsn` remains eligible.

---

### C12 — Severity: RSN-2 instance vs ENV-1

**`04-rsn`:** Raise RSN-2 above ENV-1; put regression in ancestry, wrong ticket, wrong retro; ENV-1 fails loudly, RSN-2 silently.

**Handoff after retraction:** Proto “corruption” was never a bug; one live bug (cli-sim) fixed; priority to reconcile then adopt rules carefully.

**Resolution: `both-partially-right`.** The *epistemic pattern* (untested causes in durable artifacts) is still the retro’s disease — Instance 4 / ORCH-1 / DOC cites still illustrate it. The *proto-instance severity* (CI doom, corrupted bytes, “fix spaces first”) is overturned. ENV-1 (vitest exclude / out-of-repo worktrees) remains an open, loud, real gap (`vitest.config.ts` still has no `exclude`).

**Pass B:** **Weaken** “land RSN-2 proto fix before ENV-1.” **Unchanged/strengthened** for durable-artifact discipline *as process*, not as proto mechanics.

---

### C13 — “Cite the command” vs “regen reproduces bytes”

**`04-rsn` GENERAL rule:** Causal claim must cite the establishing command or say `hypothesis`.

**Handoff:** That report followed its own rule and still published a false cause; for generated artifacts, the check that cannot be spun is **regeneration reproduces committed bytes**.

**Resolution: `both-partially-right`.** Cite-the-command is necessary, not sufficient. Handoff strengthens the generated-artifact subcase without discarding the rest.

**Pass B:** **Strengthen** generated-artifact rule along handoff lines; do not adopt `04-rsn`’s weaker form alone as if it would have caught C1.

---

### C14 — Stash wording in five-seed handoff

**`01-env` ENV-5:** Retro’s “actively misleading” is wrong; handoff says stash has **partial** PLAN/`index.ts` only, **not** `spec.ts`/tests, and says `git stash show -p` first.

**`05-doc` lifecycle:** “Line 84 advertises `stash@{0}` as carrying spec-classifier work” and calls it a “misleading pointer.”

**Feat handoff Loose ends:** phase-1 handoff is *accurate* about `stash@{0}` (retro wrongly claimed otherwise).

**Hazard:** `.scratch/handoffs/phase-1-five-seed-spread.md` is **not** on this branch tip (only `feat-fan-out-retro.md` under handoffs/). Cannot re-quote line 84 here; rely on ENV-5’s quotation + feat handoff.

**Resolution: `report-01-wins`.** DOC overstates. Residual issue = dangling superseded stash, not a false inventory of stash contents.

**Pass B:** **Weaken** any DOC-driven claim that the handoff falsely lists `spec.ts` in the stash. Lifecycle “don’t duplicate status” still fine.

---

### C15 — PLAN.md §5 vs §6 (DOC-1 cite)

**Retro / baked AGENTS proposal:** “PLAN.md §5 (~line 431).”

**`05-doc` / `03-ctx`:** Carve-out is §6 “Testing strategy” (starts line 416); §5 is “The seams.” `docs/workflow.md` already cites §6.

**Repo:** `PLAN.md` headings confirm §5 @ 265, §6 @ 416. Current `AGENTS.md` still says “PLAN.md §5” for the three seams (correct for *ports*) while the testing placement rule conflates seam senses — DOC-1’s conflict claim remains real.

**Resolution: `report-05-wins` on the cite.**

**Pass B:** **Unchanged** — apply DOC-1 AGENTS rewrite; **blocked** to ship retro’s replacement text that hard-codes §5 for the carve-out.

---

### C16 — `Depends:` vs `Blocked by:`

**Retro DOC-2:** Add `Depends:`.

**`05-doc`:** `Blocked by:` already documented in `docs/agents/issue-tracker.md:57`; third near-synonym field is rule proliferation.

**Repo check:** `Blocked by:` present in issue-tracker; no `Depends:` field in tracker docs.

**Resolution: `report-05-wins`.**

**Pass B:** **Blocked** — do not add `Depends:`. **Unchanged** — DOC-2 narrow fix (extend/surface `Blocked by:`).

---

### C17 — Ticket 04’s blocker

**Retro:** 03 *and* 04 read as if `compose` exists; prescribed `Depends: compose` for both.

**`05-doc`:** 04 never mentions compose; blocked on gem solver + baseline execute path. Handoff open items briefly say both blocked on compose, then points at DOC-2’s correction.

**Resolution: `report-05-wins`.**

**Pass B:** Backfill `Blocked by:` using DOC-2’s text, not the retro’s.

---

### C18 — Prettier / `format:check` gate for reports

**`00-FAN-IN` rule 8 + checklist:** prettier or fan-in `format:check` fails.

**`01-env` / `03-ctx` / `04-rsn`:** `.prettierignore` contains `.scratch/`; `npx prettier --write` on reports is a no-op.

**Repo:** `.prettierignore` line `.scratch/` confirmed.

**Resolution: `repo-wins`.** Vacuous instruction; verification reports correctly agree with each other against the brief.

**Pass B:** **Blocked** to keep claiming format gates these reports unless `.scratch/` (or the reports subtree) is un-ignored. Drop or fix the brief/checklist claim.

---

### C19 — ORCH-4 ↔ ENV-1 coupling

**`02-orch` ORCH-4:** Teardown before integrated verify is mandatory because in-repo worktrees pollute vitest/lint; `agnostic.md` documents the *broken* order (verify then optional cleanup).

**`01-env` ENV-1:** Prefer worktrees *outside* the repo; if adopted, ORCH-4’s verify-pollution justification softens (ORCH itself flags this).

**Repo:** `adapters/agnostic.md` still has `## Cleanup (optional)` after verify; vitest still has no worktree exclude; `.git/info/exclude` has `**/.claude/worktrees/` (per-clone).

**Resolution: `both-partially-right`.** Land ordering fix now *or* relocate worktrees; do not argue past each other.

**Pass B:** If ENV-1 out-of-repo lands, **weaken** ORCH-4’s “corrupt the run” language to ordinary cleanup hygiene. If not, **strengthen** teardown-before-verify + vitest exclude.

---

### C20 — Which tools see in-repo worktrees?

**`02-orch` ORCH-4 patch prose:** “visible to vitest / eslint / prettier.”

**`01-env` ENV-1:** eslint already ignores `.claude/**`; prettier ignores `.claude/`; only vitest lacks exclude. git ignore is via `.git/info/exclude`, not tracked `.gitignore`.

**Resolution: `report-01-wins` on the tool audit.**

**Pass B:** Prefer ENV-1’s minimal vitest + tracked `.gitignore` line; do not add dead eslint/prettier entries. Soften ORCH-4’s “trio” wording when applying the patch.

---

### C21 — Fan-in ownership default

**`03-ctx`:** Decide merger vs delegator from partition shape (mechanical vs editorial), not context %; keep delegator default when editorial.

**`02-orch`:** Keeps “Delegator (preferred) or merger”; focuses on base SHA, teardown, disposition — does not encode mechanical/editorial test. Notes textual collision with CTX on Step 3.

**Resolution: `both-partially-right`.** Compatible if interleaved by hand (ORCH already warned). Not a hard contradiction of remedies.

**Pass B:** **Recheck** — merge Step 3 edits carefully; do not let unconditional “delegator merges” prose erase CTX-3’s mechanical exception, and do not flip the default to “always merger.”

---

### C22 — ORCH-5 ScheduleWakeup

**Retro:** Cancel wakeup / add to loop guidance.

**`02-orch`:** No `ScheduleWakeup` in worker roster; no wakeup guidance in repo; reject retro remedy; one clause: don’t arm redundant polling timers.

**Resolution: `report-02-wins`.**

**Pass B:** **Blocked** — do not create wakeup-cancellation docs. **Unchanged** — ORCH’s smaller idle/no-redundant-timer clause is eligible.

---

### C23 — Stale ticket filename in `.gitattributes` comment

Comment points at `05-proto-codegen-crlf-contamination.md`. Directory has only `05-proto-codegen-byte-stability.md`.

**Resolution: `repo-wins` (comment is wrong).** Same fix bucket as C5.

---

## 5. Pass-B gate list

Candidate rules/edits that are **blocked**, **must-recheck**, **weakened**, **unchanged**, or **strengthened** before adoption. Citations are report sections.

### Blocked (do not adopt as written)

| Candidate | Source | Why |
| --- | --- | --- |
| Ticket 05 replacement markdown (CRLF contamination / regen to remove 7 lines) | `04-rsn.md` “Ticket 05 — what needs correcting” | C1, C3 — superseded by byte-stability ticket |
| Treat trailing spaces as committed corruption / CI-proven-red P0 | `04-rsn` RSN-2a, severity | C1, C2 |
| Retro ENV-2: `packages/core/src/proto/** -text -diff` (and data/proto `-text`) | retro (via `01-env` rejection) | ENV-2 experiment; ticket 05 Notes |
| New ticket field `Depends:` | retro DOC-2 | C16 — use `Blocked by:` |
| Retro DOC-1 AGENTS text baking `(PLAN.md §5)` for carve-out | retro / contrast `05-doc` | C15 |
| `ScheduleWakeup` / wakeup-guidance doc | retro ORCH-5 | C22 |
| “Reports must prettier or `format:check` fails” | `00-FAN-IN` rule 8 | C18 |
| ORCH-1 framing as intermittent flake | retro | C10 |
| Ring success-story cause “unlucky sample” | retro L695–696 | C11 |
| Cite `.gitattributes` comment as mechanism evidence | landed file | C5, C23 |
| Pseudo-stack: attributes + LF regen to purge spaces / force CI green | `01-env`↔`04-rsn` interaction | C8 |

### Must-recheck before adoption

| Candidate | Source | Why |
| --- | --- | --- |
| Global `* text=auto eol=lf` on top of existing path rules | `01-env` ENV-2 Remedy | C4 — path rules already landed; global still optional |
| CI `fetch_wowsimcli` step | `01-env` ENV-4 Remedy 1 | C9 — skipIf landed; coverage half still open |
| ORCH-4 teardown-before-verify severity language | `02-orch` consolidated patch | C19 — depends on ENV-1 placement decision |
| ORCH + CTX Step 3 interleaved patch | `02-orch` merger note; `03-ctx` §C | C21 — textual collision |
| ENV-3 rename `claude.md` → `claude-code.md` | `01-env` ENV-3 | Still present on disk; no cross-report dispute, but apply ORCH’s content edit to final name (`02-orch` note) |
| Whether out-of-repo worktree relocation is supported by Claude Code | `01-env` ENV-1 | Report left unverified |
| Linux CI proto byte-compare outcome | ticket 05 | C2 |

### Weakened

| Candidate | Source | Why |
| --- | --- | --- |
| “RSN-2 proto fix before ENV-1” priority | `04-rsn` Severity | C12 |
| ENV-2 promise that attributes yield empty status immediately forever | `01-env` ENV-2 Verify | C6 |
| Causal chain 56 CR → ticket 05 corruption | `01-env` cross-cutting | C7 |
| DOC “handoff actively misleads about stash contents” | `05-doc` lifecycle | C14 |
| `04-rsn` “cite the command” as sufficient for generated artifacts | `04-rsn` Rules | C13 — strengthen instead with regen-reproduce |
| ORCH-4 “vitest/eslint/prettier” exposure trio | `02-orch` ORCH-4 | C20 |

### Unchanged (still eligible; no cross-report kill)

| Candidate | Source |
| --- | --- |
| ENV-1 vitest `exclude` + tracked `.gitignore` for `.claude/worktrees/` | `01-env` |
| ENV-1 GENERAL: worktrees outside repo | `01-env` |
| ENV-3 rename adapters (instruction-channel contamination) | `01-env` |
| ENV-5 behaviour rules + tracked allow-list shape | `01-env` |
| ENV-6 deny `pnpm approve-builds` (no new known-walls doc) | `01-env` |
| ORCH-1/2 combined base-SHA + clean-tree spawn rule | `02-orch` |
| ORCH-3 shared-manifest ownership via pathsAllowed/Forbidden | `02-orch` |
| ORCH-6 route concerns into existing Disposition / `check_merge_ready.py` | `02-orch` |
| CTX-1/2/4/5/6 operational rules (map-then-seek, bound output, etc.) | `03-ctx` |
| DOC-1 AGENTS testing disambiguation (DOC’s quoted body) | `05-doc` |
| DOC-2 `Blocked by:` + `issues:open` surfacing | `05-doc` |
| DOC-3 harness-scope in headings | `05-doc` |
| Handoff lifecycle (track `.scratch/handoffs/`, status header) | `05-doc` |
| RSN-1 cwd / unfinished-investigation rules | `04-rsn` |
| DOC-4 never assert gitignored input present | `04-rsn` |

### Strengthened

| Candidate | Source | Why |
| --- | --- | --- |
| Unconditional base-SHA assert (not “when base matters”) | `02-orch` ORCH-1 | C10 — 100% failure without it |
| Generated-artifact check: regen must reproduce committed bytes | handoff + C13 | Overturns confidence in cite-only |
| Correct `adapters/claude.md` default-branch warning | `02-orch` §3 | Adapter text still wrong at tip |
| Durable-artifact / “hypothesis” labelling for causes | `04-rsn` Rules (pattern) | Still the retro-wide defect after instance collapse |
| Fix `.gitattributes` comment (remove false mechanism + bad ticket path) | C5/C23 | Prevents re-deriving retracted cause |

---

## 6. Open unresolved items for a human

1. **Linux CI proto byte-compare (C2 / ticket 05).** Only a real `ubuntu-latest` run closes this. Do not pre-normalize trailing spaces.
2. **ENV-4 remainder:** whether to fetch wowsimcli in CI so skipIf is local-only, or accept offline-recorded coverage as enough.
3. **ENV-1 product decision:** relocate worktrees out of repo (if harness allows) vs in-repo exclusions forever — gates ORCH-4 wording (C19).
4. **Global vs path-only `.gitattributes` (C4):** path rules landed; ENV-2’s repo-wide `* text=auto eol=lf` still unapplied.
5. **Stale `.gitattributes` comment (C5/C23):** factual falsehood in tree; needs an edit outside this Pass A file.
6. **Five-seed handoff file absent on this tip** — C14 could not re-read line 84; if that file returns on another branch, spot-check ENV-5’s quote.
7. **ENV-3 generalization to `agents.md`:** report left inconclusive; optional one-minute probe still open.
8. **Provenance of `c0acbfc^` space-free bytes:** ticket 05 labels trim-on-save as guess — leave labelled; do not promote.

---

## 7. Explicit non-goals

This pass did **not**:

- Edit `AGENTS.md`, skills, `PLAN.md`, `.gitattributes`, tickets, workflows, or any shared config
- Merge into `feat/fan-out-retro`, push, or land
- Run full `pnpm verify` or `pnpm proto:generate` (vendor/generator may be absent; not required once ticket 05 + `749aa02` already record Windows regen)
- Re-open settled hard facts as undecided controversies
- Invent new orchestration doctrine beyond gating what Pass B may adopt
- Reconcile *within*-report taste (P-rank taste without fact conflict) except where severity rested on overturned facts (C12)
- Apply Pass B rule adoption

---

## Verification notes (reconcile worker)

```text
HEAD == feat/fan-out-retro == 2ba85c72c71714bf6f19f494f47cd06338934e9d  (asserted before work)
worktree-agent-* ×7 → 55b5a51; main/origin/main → 55b5a51
.gitattributes → path eol=lf + false CRLF comment + missing ticket filename
cli-sim-runner.test.ts → describe.skipIf(!existsSync(binaryPath)) present
verify.yml → no fetch_wowsimcli
vitest.config.ts → no exclude / worktrees
.prettierignore → .scratch/
PLAN.md → §5 The seams @265; §6 Testing strategy @416
ticket 05 → 05-proto-codegen-byte-stability.md (not crlf-contamination)
blank trailing-space JSDoc: c0acbfc^ 0+0; HEAD 1+6
```

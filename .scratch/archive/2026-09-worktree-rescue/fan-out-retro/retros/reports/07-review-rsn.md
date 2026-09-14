# Pass B — Independent critical review: RSN / durable-artifact rules

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-review-rsn` |
| Branched from | `feat/fan-out-retro` @ `1308b0a` |
| Base assertion | **pass** (`git rev-parse HEAD` == `feat/fan-out-retro` == `1308b0a510006360ea1d057feb51d8e18bdeda6d`) |
| Scope | This file only. No ticket / `AGENTS.md` / shared-doc edits. No land / push / merge. |

## Stance and method

RSN rules sound virtuous (“cite the command”, “label hypothesis”) but can create **false rigor theater**, chill useful speculative chat by over-applying durable-artifact rules to the wrong surface, and overfit one proto incident into a religion.

This review is deliberately conservative:

- Prefer **narrow, testable** rules (regen reproduces bytes; do not assert gitignored inputs; do not `cd` in a persistent shell) over broad cognitive laws (“always verify mechanism”, “praise suppresses scrutiny”).
- Honor Pass A + handoff retractions (C1–C3, C8, C13): the `04-rsn` CRLF “controlled experiment” does not reproduce; ticket 05’s CRLF rewrite is blocked; cite-command alone is insufficient for generated artifacts.
- Treat `04-rsn` itself as Exhibit A that citing a command does not prove the conclusion.

External anchors (epistemology / prompting pitfalls / generated-artifact CI):

- Postmortems reconstruct causality backwards; hindsight and confirmation bias are structural, not just skill failures — [PMC: Why postmortems fail](https://pmc.ncbi.nlm.nih.gov/articles/PMC8784092/); [epistemology of production incidents](https://www.javacodegeeks.com/2026/05/the-epistemology-of-production-incidents-what-post-mortems-actually-tell-you-and-what-they-systematically-cannot.html).
- LLM / CoT “show your work” can be plausible and unfaithful — rationalization that raises trust without raising truth — [Turpin et al., arXiv:2305.04388](https://arxiv.org/html/2305.04388); [Oxford AIGI: CoT is not explainability](https://aigi.ox.ac.uk/wp-content/uploads/2025/07/Cot_Is_Not_Explainability-1.pdf); [LLM post-mortem theater](https://whyisthisdown.com/posts/llm-post-mortem-theater).
- Generated-artifact honesty is a **reproduce-and-diff** problem, not a narrative problem — build twice / compare digests in CI ([reproducible builds practice](https://oneuptime.com/blog/post/2026-01-24-fix-build-reproducibility-issues/view); [verify by building twice](https://secure-pipelines.com/ci-cd-security/lab-reproducible-container-builds-pinning-verifying-diffing/)).
- Google SRE: action items must be specific and bounded; overfit to one incident is a named anti-pattern (“incidents that rhyme”) — [USENIX / Lunney PDF](https://www.usenix.org/system/files/login/articles/login_spring17_09_lunney.pdf); [SRE Workbook postmortem analysis](https://sre.google/workbook/postmortem-analysis/).

**Precedence used here:** repo + ticket 05 + handoff Live-bugs retraction > `06-RECONCILE` > `04-rsn` proposed rules. `04-rsn` remains useful as a catalog of *failure shapes*, not as an authority on the proto mechanism.

### Verdict vocabulary

| Verdict | Meaning for Pass B adoption |
| --- | --- |
| **Adopt** | Eligible as written (or with trivial tightening). |
| **Adopt-narrowed** | Eligible only with the minimal wording below; broader form blocked. |
| **Adopt-strengthened** | Eligible; must include the stronger check (not cite-only). |
| **Defer** | Real concern; too cognitive / untestable / chill-risk for `AGENTS.md` now. |
| **Block** | Do not adopt; Pass A / candidate-set blocked, or creates rigor theater. |

---

## Verdict summary

| # | Rule family | Verdict | Mech / cog |
| --- | --- | --- | --- |
| R1 | Durable-artifact causal claims (surfaces + `hypothesis`) | **Adopt-narrowed** | Mixed → keep mechanical half |
| R2 | Generated-artifact: regen must reproduce committed bytes | **Adopt-strengthened** | Mechanical |
| R3 | Cite-the-command as sufficient for generated artifacts | **Block** | Cognitive theater |
| R4 | Never attribute diffs to unobserved environments | **Adopt-narrowed** | Mechanical (commit text) |
| R5 | RSN-1: never `cd` in persistent-cwd shells | **Adopt** | Mechanical |
| R6 | RSN-1: unfinished investigation / wrong postmortem | **Adopt-narrowed** | Mixed |
| R7 | RSN-1: boring hypothesis first / tool-behaviour tested | **Defer** (keep as chat norms, not AGENTS law) | Cognitive |
| R8 | DOC-4: never assert gitignored input present | **Adopt** | Mechanical |
| R9 | Ticket 05 CRLF rewrite / purge-spaces Done-when | **Block** | N/A (retracted) |
| R10 | “Explain absences”, “praise = same scrutiny”, “transcript retro = symptoms only” as AGENTS laws | **Defer** | Cognitive / overfit |

**Counts:** Adopt 2 · Adopt-narrowed 3 · Adopt-strengthened 1 · Defer 2 · Block 2.

---

## Per-rule reviews

### R1 — Durable-artifact discipline / hypothesis labelling

**Restatement (from `04-rsn`):** Before writing “because / due to / caused by / versus / this happens when” into a durable artifact, name the establishing command, or write **hypothesis** / **untested** in the same sentence. Chat may speculate; committed text may not.

**Mechanical vs cognitive:** The *label* is mechanical and reviewable. The *urge to always deepen to mechanism* is cognitive and unbounded (`04-rsn` “verification-depth” section already admits this).

**Verdict: Adopt-narrowed.**

**Evidence:**

- Real defect, multi-instance: invented Linux/WSL in `c0acbfc`, wrong ring cause in `119c0b7`, retro L695–696 repeating it, ORCH-1 “flake”, DOC cites, vacuous prettier gate (`04-rsn` Instances 1–4; `06-RECONCILE` C10–C13, C18). Pattern survives after proto-instance collapse (`06` C12).
- Same rule **failed to save `04-rsn` itself**: it cited a “controlled experiment” and still published a false cause (handoff; ticket 05; C1/C13). So labelling is necessary hygiene, not a correctness proof.
- Postmortem literature: confident causal narratives are structurally biased ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8784092/)); LLM “show your work” adds plausible-but-unfaithful rationales ([arXiv:2305.04388](https://arxiv.org/html/2305.04388)).

**Surfaces that count (narrow answer):** Only **committed, shared, or handed-to-another-agent** text:

| In scope | Out of scope |
| --- | --- |
| Commit messages, tickets under `.scratch/carry-forward/issues/`, ADRs, tracked plan/docs (`PLAN.md`, `AGENTS.md`, skills), committed retros/reports, prompts/briefs dispatched to workers | Ordinary chat speculation, scratch notes not committed, exploratory tool output, in-progress draft files the author still owns |

Do **not** redefine “chat” as a durable surface. The chill risk is real: if every speculative “maybe because…” in conversation must carry ceremony, useful diagnosis dies and gets replaced by performative citations.

**How the rule could still fail (04-rsn mode):** Agent cites `git show` / a generator run, misreads the bytes, labels nothing as hypothesis because “I ran a command,” and the durable artifact inherits theater. Label without a falsifiable check is costume.

**Minimal wording:**

> In **committed or dispatched** artifacts (commit messages, tickets, ADRs, tracked docs/skills, retros, worker prompts), a causal claim (“because / caused by / versus / this happens when”) must either (a) point at a command whose output a reader can re-run, or (b) say **hypothesis** / **untested** in the same sentence. Chat and private scratch may speculate freely. Citing a command is not proof the conclusion follows — see generated-artifact rule.

**Confidence:** High that the narrow form is worth adopting; high that the broad “always mechanism” form would overfit.

---

### R2 — Generated-artifact: regeneration must reproduce committed bytes

**Restatement (handoff + `06` C13 strengthened):** For committed generated files, the check that cannot be spun is: **regenerate from the committed inputs and compare to the committed outputs**. If they differ, establish which side is wrong *before* committing either. Do not treat “I ran `proto:generate`” or a narrative about platforms as sufficient.

**Mechanical vs cognitive:** Mechanical. Matches industry reproduce-and-diff practice ([build twice / compare](https://secure-pipelines.com/ci-cd-security/lab-reproducible-container-builds-pinning-verifying-diffing/); [reproducible builds](https://oneuptime.com/blog/post/2026-01-24-fix-build-reproducibility-issues/view)).

**Verdict: Adopt-strengthened** (this is the load-bearing RSN adoption).

**Evidence:**

- Windows regen reproduces `HEAD` exactly; trailing spaces are ordinary `protoc-gen-es` output from bare `//` (ticket 05; handoff Live bugs §1 RETRACTED).
- `04-rsn` cite-command + experiment table still produced a false causal story (C1, C13).
- Pseudo-stack “attributes + LF regen to purge spaces / force CI green” is falsified for that purpose (C8) — regen *reproduces* the spaces.

**How the rule could still fail:**

1. Regen with **wrong inputs** (CRLF checkout, wrong plugin version, dirty vendor) and treat mismatch as “corruption” — the `04-rsn` failure mode.
2. Assume local regen matches **CI’s** inputs without reading a CI run (ticket 05 Done-when; C2 still open).
3. Expand “reproduce bytes” into “normalize / strip trailing spaces until green” without a red CI — blocked Done-when territory (C2/C3/C8).

Companion clause (keep short): a byte-compare CI gate is only interpreted from a **real** CI run (or an environment proven identical to CI), not from a local simulation of what Linux “must” emit.

**Minimal wording:**

> When changing committed generated artifacts: regenerate from the committed sources with the pinned toolchain; the working tree must match `HEAD` (or you must document which side is wrong and why) before commit. For CI byte-compare gates, read a real CI run — do not predict from a local story about another OS.

**Confidence:** High.

---

### R3 — “Cite the command” alone as generated-artifact correctness

**Restatement:** `04-rsn` GENERAL portable rule: causal claim must cite establishing command or say hypothesis — presented as what would have prevented the proto incident.

**Verdict: Block** as a *sufficient* rule for generated artifacts (candidate set + C13). Keep only as the weaker half of R1 for non-generated causal prose.

**Evidence:** Handoff explicitly: the report followed cite-the-command and still published a false cause; strengthen with regen-reproduce. CoT / show-your-work literature: intermediate steps can be coherent and wrong ([arXiv:2305.04388](https://arxiv.org/html/2305.04388); [CoT is not explainability](https://aigi.ox.ac.uk/wp-content/uploads/2025/07/Cot_Is_Not_Explainability-1.pdf)).

**How it fails:** Exactly as `04-rsn` failed — command citation becomes a badge (“verified by controlled experiment”) that suppresses re-checking.

**Minimal wording:** None as standalone. Fold into R1 + R2.

**Confidence:** High (block).

---

### R4 — Never attribute an observed difference to an unobserved environment

**Restatement (`04-rsn`):** Do not write “generated on Linux / another machine / CI version” without checking `git log`, worktree path, or a CI run. “I don’t know why these differ” is acceptable to commit.

**Mechanical vs cognitive:** Mechanical when scoped to **committed claims about environments**. Cognitive if expanded to “never hypothesize about environments in chat.”

**Verdict: Adopt-narrowed** (this is the *ban* on promoting untested environment attributions — not a ban on saying “unknown”).

**Evidence:** `c0acbfc` Linux/WSL claim; ticket 05 records no Linux/WSL run; C1/C2. Candidate set: do not promote untested environment attributions.

**How it could still fail:** Agent writes “hypothesis: Linux differs” without running CI — still better than asserted fact, but readers may treat hypothesis as soft fact. Mitigate by requiring the next step (“read CI”) when the claim gates a remedy.

**Minimal wording:**

> Do not state as fact that an artifact was produced on an environment you did not observe. Prefer “unknown” or an explicit **hypothesis**, and do not base Done-when / remedies on that hypothesis until checked (`git log`, worktree paths, or a real CI run).

**Confidence:** High.

---

### R5 — RSN-1: never `cd` in a shell whose cwd persists

**Restatement:** Use `git -C`, absolute paths, or root-relative invocations. Path-scoped git commands silently change meaning with cwd.

**Mechanical vs cognitive:** Mechanical. One-command falsifiable (`git ls-tree` from root vs `packages/core` — `04-rsn` table).

**Verdict: Adopt.**

**Evidence:** Postmortem that `git ls-tree` “always lists from repo root” is false; 357 vs 41 paths (`04-rsn` RSN-1). Harness asymmetry (main session persists cwd; agent threads reset) is project/MIXED — mention as note, not as universal law.

**How it could still fail:** Absolute paths to the wrong clone; `git -C` to a nested worktree; agents that *do* reset cwd and then ignore the rule harmlessly. Failure mode is mild (extra verbosity), not false rigor.

**Minimal wording:**

> In shells where cwd persists across calls: do not `cd` for repo work. Use `git -C <repo>`, absolute paths, or root-relative paths. Do not assume `git ls-tree` / `git ls-files` are repo-root-global without `--full-tree` / pathspecs.

**Confidence:** High.

---

### R6 — RSN-1: unfinished investigation / wrong postmortem

**Restatement:** An investigation ends when the mechanism is named and demonstrated; “strange, anyway —” / “everything resolved fine” arms the next session with a wrong belief.

**Mechanical vs cognitive:** The *anti-pattern markers* are reviewable. Demanding a demonstrated mechanism for every closed thread is cognitive and unbounded.

**Verdict: Adopt-narrowed.**

**Evidence:** False `git ls-tree` postmortem is worse than none (`04-rsn`). Aligns with “wrong but convincing postmortem is worse than missing” ([LLM post-mortem theater](https://whyisthisdown.com/posts/llm-post-mortem-theater)).

**How it could still fail:** Agents pad closings with fake mechanisms to satisfy the rule — `04-rsn`’s false experiment is the template. Prefer “unresolved — mechanism unknown” over a wrong mechanism.

**Minimal wording:**

> Do not close an investigation with a confident tool/environment claim you did not test. If the symptom is gone but the mechanism is unknown, write **unresolved** (or **hypothesis**) — not a reassuring wrong postmortem.

**Confidence:** Medium-high.

---

### R7 — RSN-1 extras: boring-hypothesis-first; always test tool behaviour claims

**Restatement:** When the hypothesis requires a bizarre environment, test the mundane one first; claims about what a tool “always” does need a run both ways.

**Verdict: Defer** as `AGENTS.md` law. Keep as reviewer/chat norms.

**Why not Adopt:** Good advice; hard to enforce without becoming a ritual checklist that every thread must narrate. SRE guidance prefers **specific, bounded** action items over culture slogans ([Lunney](https://www.usenix.org/system/files/login/articles/login_spring17_09_lunney.pdf)). R5 + R6 already catch the load-bearing cwd/postmortem cases.

**How it could still fail if adopted broadly:** Performative `pwd` / dual-invocation theater on every git question; latency and noise without catching the next novel failure.

**Minimal wording (if ever promoted):** one line under R5/R6 is enough — do not add a separate section.

**Confidence:** Medium (defer is the conservative call).

---

### R8 — DOC-4: never assert gitignored / generated input is present

**Restatement:** Give the regeneration command and verification (e.g. `pnpm sync:wowsims` + sha256) instead of “already in the repo, gitignored.”

**Mechanical vs cognitive:** Mechanical. Self-refuting phrase detectible in review.

**Verdict: Adopt.**

**Evidence:** Delegator prompt asserted `db.json` present; `.gitignore:13:vendor/`; fresh worktree had no `vendor/` (`04-rsn` DOC-4). Same family as R1 pointed at file presence.

**How it could still fail:** Author gives a regen command that itself assumes network/credentials the recipient lacks; or asserts “lockfile pin is enough” without the fetch step. Still far better than “already present.”

**Minimal wording:**

> Never assert that a gitignored or untracked generated input is present for a fresh worktree/clone. Give the regen/sync command and how to verify (e.g. pinned checksum).

**Confidence:** High.

---

### R9 — Ticket 05 CRLF rewrite / trailing spaces as corruption / regen-to-purge Done-when

**Restatement (`04-rsn` quoted ticket):** Replace ticket with CRLF-contamination mechanism; Done-when = attributes + regen to remove 7 trailing-space lines; treat spaces as corruption; CI “proven” red via local simulation.

**Verdict: Block** (candidate set; `06` C1, C2, C3, C8).

**Evidence:** Ticket `05-proto-codegen-byte-stability.md` already supersedes; Windows regen matches `HEAD`; spaces are ordinary generator output; CI outcome unread (C2). Applying `04-rsn`’s markdown would re-corrupt the tracker.

**How “adopting” it would fail:** Exactly the religion risk — one unreproduced experiment becomes policy, CI “fixed” by deleting generator-faithful bytes, and the next agent re-derives CRLF myth from a durable false comment (C5/C23 — out of scope to edit here, but note: do not cite `.gitattributes` comment as mechanism evidence).

**Minimal wording:** None. Do not paste. Do not encode “regen to purge spaces” anywhere.

**Confidence:** High (block).

---

### R10 — Broader cognitive pack from `04-rsn` (“explain absences”, “praise = scrutiny”, “transcript retros are symptoms only”)

**Restatement:** Absences need mechanisms; success stories get failure-level scrutiny; transcript-only retros must mark mechanisms unverified and not apply remedies yet.

**Verdict: Defer** for AGENTS adoption as separate laws.

**Why:**

- **Useful as Pass A/B process** (this retro fan-out already did the right thing: verify before adopt). Encoding it as forever-agent law invites ceremony on every absence explanation.
- “Praise suppresses scrutiny” is a social heuristic, not a testable gate — easy to cargo-cult into “never write wins.”
- Transcript-vs-cause is already covered operationally by R1’s hypothesis label + this review loop; Google’s caution is against **overfitting one incident into unbounded process** ([Lunney](https://www.usenix.org/system/files/login/articles/login_spring17_09_lunney.pdf)).

**How it could still fail if Adopted wholesale:** Agents refuse to record useful provisional causes; every retro becomes unreadable disclaimer soup; speculative chat migrates into “hypothesis:” spam that nobody re-checks (theater again).

**Optional one-liner** if a doc must mention retros (not required for Pass B):

> Treat transcript-only retros as symptom lists until mechanisms are re-derived against the repo; do not apply their remedies verbatim.

**Confidence:** Medium (defer). The ring/ORCH examples are real; the generalization is the overfit.

---

## Explicitly out of scope / do not smuggle back

| Item | Why |
| --- | --- |
| `04-rsn` ticket replacement markdown | C3 / R9 Block |
| “CI proto byte-compare proven red” / fix spaces before land | C2; ticket 05 says read CI |
| Promoting Linux/WSL or autocrlf-orphan-space as established | C1; R4 |
| Cite `.gitattributes` comment as CRLF-mechanism proof | C5/C23 |
| “RSN-2 proto fix before ENV-1” priority | C12 weakened |
| Expanding durable-artifact rules to ordinary chat | Stance / chill risk |

---

## Sharpest critique of the “cite the command” family

**Citing a command proves a command was run, not that its output entails the claim.**  
`04-rsn` followed its own rule, attached byte tables, labelled the story “controlled experiment, not inference,” and still got the proto mechanism wrong — then prescribed a ticket rewrite that would have encoded the error. That is rigor theater: the citation *increases reader trust* the same way unfaithful chain-of-thought increases trust ([arXiv:2305.04388](https://arxiv.org/html/2305.04388); [LLM post-mortem theater](https://whyisthisdown.com/posts/llm-post-mortem-theater)) without increasing truth. For generated artifacts the non-theatrical check is mechanical and boring: **regen, diff, match `HEAD` (or justify the mismatch)** — and for CI gates, **read the run**. Everything else in the cite-command family is optional labelling hygiene (R1), not a correctness proof.

---

## Adoption pack (if Pass B applies rules next)

Ship only these, in this shape:

1. **R2** generated-artifact regen-reproduce (+ “read real CI”, no predicted red).
2. **R1** narrowed durable-artifact / `hypothesis` labelling (committed + dispatched surfaces only).
3. **R4** no untested environment attributions as fact.
4. **R5** no `cd` in persistent-cwd shells.
5. **R6** narrowed: no reassuring wrong postmortems; prefer **unresolved**.
6. **R8** DOC-4 regen command instead of “gitignored but present.”

Do **not** ship R3, R9, or the R10 cognitive pack as AGENTS laws.

---

## Verification notes

```text
Base: feat/fan-out-retro @ 1308b0a510006360ea1d057feb51d8e18bdeda6d
Branch: retro/w-review-rsn (created with git checkout -B)
Inputs read: 06-RECONCILE.md (C1–C3,C8,C13 + strengthened table), 04-rsn.md
  Rules/RSN-1/DOC-4, feat-fan-out-retro.md Live bugs retractions,
  05-proto-codegen-byte-stability.md
No shared docs / tickets edited.
```

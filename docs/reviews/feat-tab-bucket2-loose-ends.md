# Pre-merge review — feat/tab-bucket2-loose-ends

Reviewed range: `dc83b5542cd00146e7f2f2d697b15aefbbb51977..3190a4359599e9c50def93d116f4ec320000bd2e`

Dispatch: round 1, four axes (adversarial, domain, standards, spec), fresh
context, review lane (Opus, effort medium), in parallel. Note for reviewers:
the fork-side code changes (ticket 326 layout-gate assertion, ticket 335 fork
twin of the cutoff.ts doc comment) live in the gitignored `vendor/tbc-new-fork/`
and are NOT visible in `dev...HEAD`. The in-repo diff carries the core-side
change (`cutoff.ts` doc comment), the regenerated data artifacts from 335's port
cycle, the ticket/doc updates, the human-inspection checklist, and the
`scripts/dev-tab.ps1` dev-server helper.

Fixes for this round's two findings (A1, A2) landed in `cc3895c`, after the
reviewed through-sha. Post-fix tip for a follow-up round if one runs:
`cc3895c`.

## Adversarial

Verdict: **no correctness defect in the reviewed code changes.** The reviewer
re-derived every quantitative claim in the `cutoff.ts` comment against
`set-value.ts`'s `combineSe`/`computeSynergy` (2pc folds 4 sims → √2×single-SE;
4pc folds 6 → √6; band (4.808, 5.889)) and confirmed the comment is true and the
code logic is unchanged. The regenerated `data/*.json` artifacts are consistent
(both moved to fork commit `cab940cd`, expected from 335's port cycle, not
drift). `scripts/dev-tab.ps1` is a faithful port of the launch.json cmd
one-liner with a checked `go build` exit code and no silent-failure path.

- **A1 (low, process):** dirty working tree — uncommitted 325 ticket edit +
  untracked `325-options.md`. Live options-pass work legitimately outside the
  range; reviewer left it untouched (ticket 261 precedent).
- **A2 (low, code):** `$Node22Home` (`scripts/dev-tab.ps1:72`) assigned but never
  read; `Start-Frontend` pins Node via `fnm exec --using=22` instead. Dead line
  that hardcodes a patch version and would mislead a future reader.

Unverifiable from this checkout (fork gitignored): that `cab940cd` descends from
335's cited `03f5f003c`, and the `pnpm verify` EXIT 0 the tickets record. Closed
independently below — see Summary.

## Domain

Verdict: **sound; no domain contradiction against the sources of truth.**

- **D1 (335 SE accounting) — CONFIRMED CORRECT.** The sims-folded accounting and
  SE-scaling in `cutoff.ts:36-54` match the engine (`set-value.ts:304-315`) and
  the V0 worked examples (`.scratch/set-bonus-value/verification.md`) to the
  digit: 2pc folds 4 sims, 4pc folds 6, ratios √2 / √3, floor `√2×3.4≈4.81` ret,
  4pc bar `≈5.89`, band `(4.81, 5.89)` = [2pc floor, 4pc bar]. The doc comment is
  true.
- **D2 (320 World Bosses) — CONFIRMED domain-accurate.** `assemble_universe.py:76`
  - `parse_atlasloot.py:65` show AtlasLoot's own `WorldBossesBC` bucket; Doomwalker
    / Doom Lord Kazzak are raid-required outdoor encounters. Option-C accept is
    defensible.
- **D3 (337 content tier in checklist) — CONFIRMED CORRECT.** Matches ticket 337
  and `data/wowsims.lock.json` (`currentPhase: 2`, tier from upstream
  `CURRENT_PHASE`, never inferred).
- **D4** — the 317/319/322/326/329 ticket updates make no TBC/wowsims mechanic
  claim that touches the sources of truth.

## Standards + Spec

**Standards — clean to standard.** No hard documented-standard violations.

- Comment policy (`AGENTS.md` "why not what"): PASS — every `dev-tab.ps1` comment
  and the `cutoff.ts` rewrite is load-bearing _why_ (fnm shim drift, absent
  `make`, the go:embed empty-file constraint, the SE reasoning), none restates
  code.
- Durable-claims: PASS — spot-checked causal claims in the ticket updates; each
  points at a re-runnable command or marks itself hypothesis/measured.
- Judgement-call smells (minor, not violations): weak Duplicated Code in the
  `Push/Pop-Location` skeleton across `Start-Backend`/`Start-Frontend`; mild
  Speculative Generality in the non-default `-BackendPort` path (builds
  `wowsimtbc-$Port.exe` against a frontend hardcoded to 3333 — the doc comment
  honestly flags the constraint).

**Spec — faithful; no missing requirement, no scope creep, no wrong
implementation.**

- 335: chose option (b) faithfully — `cutoff.ts` comment corrected as the ticket
  described, ticket closed with the measurement + `pnpm verify` EXIT 0.
- 317/319: closed honest about the fix living on the fork tip (no in-repo change).
- 320: Option C recorded with the ruling and the measurement; no code snuck in.
- 322/326/329 closed, 325 correctly left open pointing at `325-options.md`.
- Human-inspection checklist covers all 7 bucket-1 tickets (313/315/330/336/314/
  328/327) + the 4 owner-decision items (320/325/270/337).
- dev-server request delivered: `scripts/dev-tab.ps1` + `tab:dev`/`tab:backend`/
  `tab:frontend`.
- Minor doc nit (not filed): 335's ticket body enumeration (`≤0.545`) differs
  from the closure re-scan (`≤−3.88`); both agree the under-filtered band is
  empty, so it is a fuller re-measure, not a contradiction.

## Summary

Four axes, all clean. Two findings, both low and both handled:

- **A2** (dead `$Node22Home` line) — **fixed** in `cc3895c`.
- **A1** (uncommitted 325 options work) — **fixed** in `cc3895c` (committed, not
  a code defect).

Zero correctness defects, zero domain contradictions, zero spec gaps, zero hard
standards violations. The one genuinely domain-bearing change (335's SE
reasoning) was independently re-derived to the digit by both the adversarial and
domain axes. Fork-side claims (326 assertion, 335 twin, the `pnpm verify` EXIT 0)
rest on gitignored `vendor/` work not visible in this diff; the orchestrating
session ran `pnpm verify` to EXIT 0 on the branch tip under Node 22 earlier this
session, and the equip-eligibility gate passing at fork commit `cab940cd`
independently confirms the fork commits are real and the pins point at them.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                     |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | 325 options work committed in `cc3895c` (live work, not a code defect)            |
| A2  | Adversarial | fixed       | dead `$Node22Home` line removed from `scripts/dev-tab.ps1` in `cc3895c`           |
| D1  | Domain      | wontfix     | 335 SE accounting CONFIRMED correct — nothing to fix                              |
| D2  | Domain      | wontfix     | 320 World Bosses grouping CONFIRMED domain-accurate                               |
| D3  | Domain      | wontfix     | 337 content-tier claim CONFIRMED correct                                          |
| S1  | Standards   | wontfix     | weak `Push/Pop-Location` duplication — below extract threshold                    |
| S2  | Standards   | wontfix     | `-BackendPort` non-default path — mild speculative generality, doc-flagged        |
| SP1 | Spec        | wontfix     | 335 ticket-body vs closure figure differ — fuller re-measure, not a contradiction |

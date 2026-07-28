# Stash leftovers — do not merge without an owner decision

These files are a **frozen copy** of EP-membership pool work from `stash@{0}` (see `.scratch/stash-salvage/stash0-refs.txt`). They live under `.scratch/stash-salvage/quarantine/from-stash/` for archaeology only.

**Do not `git stash pop` this pile onto tip.** Do not copy these paths back into `data/pools/**`, `scripts/generate_pool.py`, `scripts/curate_ret_pool.py`, or `packages/core/src/{cli,rank}.ts` without an explicit owner decision.

---

## What these files are

| Artifact | Role |
|----------|------|
| `generate_pool.py` | EP-ranks equippables from `vendor/wowsims/db.json`, keeps **top 12 per slot** (`TOP_N = 12`), writes `ret.generated.json`. |
| `curate_ret_pool.py` | Trims generated rows toward ~8/slot; fills `source:null` via a large **HAND** map; **FORCE**-includes known-good pieces that EP ranked out. |
| `ret.generated.json` | Generator output at stash time. |
| `ret.json` | Curated EP pool (~12/slot) — the membership set the stash-era rank path consumed. |
| `cli.ts` | Stash-era `pnpm rank`: loads **`data/pools/ret.json`**, exposes **`--full-pool`**, no universe path. |
| `rank.ts` | Stash-era rank core: **`prefilterPool`** + optional **`fullPool: true`** — EP gates membership a second time after generate. |

Together this is the **pre-universe** path: EP top-N → human curation → rank over a small curated pool (or “full” pool escape hatch), not raid-scoped universes.

---

## Why this conflicts with the raid-scoped plan

Tip (base `25de532f`) already moved rank membership to **`data/universes/ret-p*.json`**. The redesign locked:

| Decision | Meaning for this pile |
|----------|----------------------|
| **D1** | EP does **not** decide membership. Any EP top-N / per-slot cap rule is rejected — ep-vs-sim recall data showed even “generous” cuts drop real upgrades. |
| **D2** | The same EP score must **not gate twice**. Stash flow: generate writes `ep` on rows → `prefilterPool` sorts/filters on it again. That double-poison ends on tip. |
| **S4** | **No EP top-N membership anywhere.** Junk filter only; universes are built from raid-scoped rules, not `TOP_N = 12`. |

Tip `packages/core/src/cli.ts` loads `data/universes/ret-p${maxPhase}.json` — not `data/pools/ret.json` as the rank pool.

**Legacy note:** tip may still ship `data/pools/ret.json`, `scripts/generate_pool.py`, and `scripts/curate_ret_pool.py` for older tests or generator plumbing. That is **not** permission to restore stash versions or wire rank back to the EP pool. Rank CLI must stay on universes.

---

## Already scavenged elsewhere — do not “rescue” this pile for these

The stash was mislabeled “unrelated”; most of it was useful and is being ported on **other salvage branches** (see `.scratch/stash-salvage/PROCESS.md`):

| Slice | Branch | What moved | Why this quarantine pile is irrelevant |
|-------|--------|------------|----------------------------------------|
| A gems | `phase-1/w-salvage-gems` | `fillCandidateGems`, rank gem fill (PLAN §9) | Gem logic lives in `candidate-gems.ts` / rank — not in pool scripts. |
| B report | `phase-1/w-salvage-report` | `rank-report.ts`, `--report` on CLI | Report uses **universe** load; no `--full-pool`. |
| C sme | `phase-1/w-salvage-sme` | `sme-rank-review` skill (both mirrors) | Skill files only; AGENTS already references them. |
| D docs | `phase-1/w-salvage-docs` | AGENTS / model-policy / skill archaeology | Tip may already be better; stash hunks need sharp review, not blind restore. |

If you need gem fill, HTML report, or SME review workflow — use those branches, not this folder.

---

## Unknown / needs owner decision

Nothing below has a merge plan. Treat as **hypothesis** until an owner picks a direction.

1. **HAND / FORCE lists in `curate_ret_pool.py`** — Hundreds of hand-filled `ItemSource` rows and FORCE includes (e.g. Belt of One-Hundred Deaths, Cloak of Darkness). Some overlap may already exist in universe source metadata or future raid-recipe work; diff against tip before any port. **Unknown** whether any FORCE row should become explicit universe inclusions vs. obsolete under raid-scoped rules.

2. **Measurement / ep-vs-sim archaeology** — Stash `ret.json` snapshot may differ from tip’s legacy pool file. Useful only for comparing “what EP curation thought” vs universe membership — not for restoring rank input. **Unknown** if anyone still wants a one-off diff report.

3. **Stash `cli.ts` / `rank.ts` hunks** — Contain `--full-pool`, `prefilterPool`, and pool-file load paths explicitly rejected by D1/D2/S4. **Unknown** if any non-membership hunk (e.g. report wiring already taken by slice B) remains worth cherry-picking; default is **no**.

4. **Retire vs keep legacy generator** — Carry-forward issue `.scratch/carry-forward/issues/11-retire-ep-generate-pool.md` tracks removing EP membership from tip scripts entirely. This quarantine folder does **not** resolve that ticket.

---

## Safe uses

- Read-only reference when writing universe source gaps or reviewing FORCE/HAND candidates.
- Diff stash `ret.json` vs tip `data/pools/ret.json` or vs `data/universes/ret-p*.json` (local only; do not commit diffs without a ticket).
- Confirm what **not** to merge during fan-in (grep tip for `prefilterPool`, `--full-pool`, `data/pools/ret.json` in rank path).

## Forbidden

- `git stash pop` / apply stash onto tip for these paths.
- Dropping `stash@{0}` (PROCESS.md: stash stays until salvage fan-in is verified).
- Copying quarantine files into live `data/pools/**`, `scripts/`, or `packages/` without a new ADR or explicit owner sign-off.

---

*Salvage worker E · branch `phase-1/w-salvage-quarantine` · base `25de532f3a5001344494ed74e550d9ef3550c6cc`*

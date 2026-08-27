# Handoff — execute the plan for tickets 306 and 308

You are the execution seat. A plan has been written, adversarially reviewed
twice, and cleared. **Nothing has been implemented yet.** Your job is to execute
it.

## Start here

1. **The plan — your instructions:**
   `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tickets-306-308\plan.md`
2. **The review** (advisories that ride along, and the reasoning behind the
   choices): `.scratch/stage-gate/tickets-306-308/plan-review.md`
3. **The brief** (goal and constraints):
   `.scratch/stage-gate/tickets-306-308/brief.md` — **but see the warning below.**
4. **Gate commands, measured and working:**
   `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`
5. **Before your first edit to a ported engine file:**
   `docs/agents/known-traps.md` §"Before editing a ported engine file"

## Base state

- Main repo: `C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch
  `feat/upgrades-dedup-wowsims`, base SHA `b1d4467bfeae86310f33f29a5dd93dc6bd6e0a2f`.
  Assert this before your first write.
- Fork (gitignored, present on this machine): `vendor/tbc-new-fork`, branch
  `feat/upgrades-tab`, HEAD `38cb8ff80b438c8c31cbd8a868b7a6d45fe747bd`, matching
  the pin in `data/wowsims-fork.lock.json`.
- Both trees were clean at handoff. `pnpm verify` was green.

## What the plan does, in one paragraph

**306** — the fork's formatter is red on 194 files, but 85 of those fail on
pristine upstream too, so the redness is inherited, not ours. The plan formats
only the **10 files this project owns** and adds a scoped `fmt` row to
`fork-gates.md` documenting why upstream's files and the generated/ported trees
are excluded. **308** — "rank a second copy of a non-unique ring" turns out not
to be a guard-clause fix: the ranker emits one row per *item*, not per
*placement*, so relaxing the guard would silently overwrite the owned row's
meaning. It is recorded as **deliberately out of scope** with the reasoning
written at the guard in both engine copies and at the owned-row filter, plus a
follow-up design ticket carrying the redesign map. **No ranking behaviour
changes anywhere.**

## Warnings — read these before you trust anything

**The brief contains a wrong number.** It says 157 files fail at pristine
upstream. That is wrong — it was measured with oxfmt run against a worktree
*path*, which silently loses `.oxfmtrc.json` and scans the wrong file set. The
correct figure, measured from *inside* the worktree, is **85 over 529 files**.
The plan's C3 carries the corrected value and explains the artifact. Where the
brief and the plan disagree, **the plan wins.**

**Verify the oxfmt invocation form by scan counts, not by a config message.**
oxfmt 0.62.0 prints no "No config found" diagnostic in the bad case, and the only
line containing "config" is the filename `preset_configuration_picker.tsx` — so a
string check passes on exactly the run it should reject. Correct form: from
inside the tree, base scans **529** files and reports **85**; the wrong by-path
form scans 674 and reports 157.

**The `.bin` shims fail with an fnm error.** Invoke every gate through `node`
against the real entry point. A `cd` into the fork inside a compound Bash command
also trips it — prefer absolute paths or PowerShell's `Push-Location`. All
working commands are in `fork-gates.md`.

**`pnpm verify` does not cover the fork at all** (`grep -c vendor package.json`
→ 0). The fork's own four gates are the only signal over UI code. `oxfmt` is red
tree-wide by design after this work — that is what the new scoped gate row is
for.

**Any touch of a fork engine file — including a comment-only edit — arms the
five-step cycle** in `known-traps.md`: parity test green *before* any hash moves,
then `PROVENANCE.md` (Edit tool, never sed), then fork commit, then re-pin +
`pnpm sim-implemented-effects:generate`, then `pnpm verify`. The plan's B1/B4/B6
are those steps; keep their order.

**A1 has a deliberate stop-and-report.** If the recomputed owned set does not
equal the plan's 10-file list exactly, **stop and report** — do not format a
different set. 65 of the nearby files are committed *generated* artifacts and
must never be hand-reformatted.

## Sequencing

**Track B (308) first, then Track A (306). Strictly serial.** They are not
file-disjoint — B extends a comment in `upgrades_tab.tsx` and A formats that same
file. Write B's new comment lines already oxfmt-clean so A2 does not rewrite
them. Each track ends in its own fork commit + re-pin; do not interleave them.

## Your latitude

The plan is reviewed but not sacred. Where reality disagrees with it, you hold
the adapt-vs-flag-vs-stop call — that judgment is why this seat exists. Record
every deviation in a Deviation ledger in your final report. A silent paper-over
is the failure mode to avoid; a flagged deviation is not a failure at all.

Two things specifically worth flagging rather than absorbing:

- If `sim_header.tsx`'s authorship check comes back empty (no commits from this
  branch), drop it from the set and report the anomaly — do not format it anyway.
- If the parity test is red *before* you touch anything, stop. That is a
  pre-existing condition the plan does not cover.

## Commit discipline

Commit per green slice, not one commit at the end. `git status` must be clean of
work you did not do before each commit — pre-commit runs lint-staged against `*`,
so unrelated dirty files ride along. Read the commit-message rules in
`AGENTS.md` (the seven rules) before writing one.

## Do not

- Merge to `dev`, run `pnpm merge-to-dev`, or set `TBC_ALLOW_DEV_MERGE=1`. The
  owner asks for merges separately, after seeing a review.
- Push anything. The fork has never been pushed (`pushed: false` in the lock
  file) and flipping that is a deliberate act needing the owner's say-so.
- Commit the fork checkout into the main repo.
- Reformat `upgrades/engine/**`, `upgrades/data/**`, or upstream's 85.
- Fabricate a `RecordedSimRunner` fixture. If something seems to need one, that
  is a signal to stop and flag, not to invent data.

## When you are done

`pre-merge-review` runs after execution, then the owner is asked about merging —
both outside this pipeline. End with: what you did per step, the Deviation
ledger, gate results with actual command output, and anything you could not
complete.

## One piece of context worth having

An orchestrator measurement (plan C20, marked unverified there, since
independently reproduced by the reviewer): the committed `ret-p3` pool contains
exactly **3** non-unique rings/trinkets — Band of Devastation, Blessed Band of
Karabor, Ring of Ancient Knowledge. It is why implementing 308 would have served
almost nothing in practice. It is **not** load-bearing: the out-of-scope decision
rests on C13/C14/C15, three structural facts about the code, and would stand
unchanged without it. Do not quote C20 as the reason.

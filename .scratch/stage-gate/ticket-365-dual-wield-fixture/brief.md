# Brief — ticket 365, the dual-wield fixture

Mini-loop off `feat/reforge-catchup-leftovers`. Ticket:
`.scratch/carry-forward/issues/365-no-committed-dual-wield-raid-sim-request-fixture.md`
— **read it in full first; it is the spec.** This brief adds only what the
ticket does not carry.

## Why this exists, and why it is not deferrable

Ticket 350 asks what the engine does when a two-handed candidate is swapped into
the main hand while a worn off-hand item stays equipped — a gear set the game
cannot produce. The `feat/reforge-catchup-leftovers` branch could not answer it,
because ticket 350 is reachable only for `DUAL_WIELD_SPECS` (rogue, enh,
warrior, hunter) and every committed request fixture and loadable skeleton is
for one of the two specs deliberately excluded from that set. So 350 is
`Blocked by: 365`, and 350 stays unanswerable until this fixture exists. Nothing
here is optional groundwork — it is the measurement's missing input.

## What done looks like

The ticket's Acceptance section governs. In short: a dual-wield
`RaidSimRequest` fixture captured **through the ranker's own composition path**,
ticket 350 step 1 run against it, and the iteration count justified against the
noise floor.

## The one rule that decides whether this work is worth anything

**Capture, do not hand-author.** `packages/core/test/direct-sim-support.ts:15`
warns that hand-built character JSON — "the ticket 106 style" — can differ from
what `rank.ts` actually sends in gems and buffs. A hand-written request would
answer a question about a document nobody's code produces. The helper to use is
`CapturingSimRunner` (`direct-sim-support.ts:76`), which keeps every
`RaidSimRequest` the ranker produced; `:235` shows it being wired around an
inner runner.

If capture turns out to be impossible for a spec with no committed skeleton,
**that is a finding to report, not a licence to hand-author.** Say so and stop
rather than producing a fixture whose provenance defeats its purpose.

## Measurement sizing (from the ticket, do not re-derive)

- The effect must be the off-hand **swing**, not the off-hand stats: a 1H+OH set
  versus the same set with a two-hander in the main hand and the off hand left
  in place.
- A stat-only delta cannot be resolved at 3000 iterations. The committed feral
  result has `stdev = 127.9659250680645` at 3000 iterations, so the 3σ floor on
  the mean is `3 · 127.966 / √3000 = 7.01 DPS`.
- Raise iterations until that floor sits well under the expected effect, and say
  what floor the chosen count gives.
- **Compare with a tolerance, never exact equality.** Same seed, `simVersion`
  and core count give bit-identical results, but across core counts the sim
  splits iterations over `runtime.NumCPU()` shards and agrees only to ~1e-12 DPS
  (`docs/plans/compute-topology.md:177`; standing rule at `:207-209` — live
  binary float assertions use `toBeCloseTo`).

## Source material

- Enhancement gear: the fork's `ui/shaman/enhancement/gear_sets/p1.gear.json`
  wears item 28308 in both index 14 and index 15 — a 1H+OH set, the right shape.
  Its APL is `ui/shaman/enhancement/apls/default.apl.json`.
- Warrior equivalent: `ui/warrior/dps/gear_sets/p*_fury.gear.json` with
  `apls/fury.apl.json`.
- Runner: the pinned CLI at
  `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64`, which
  reports its own pin via `wowsimcli-windows.exe version`.

**The enhancement page cannot substitute for this today** — its Upgrades run
aborts on an item-swap item (ticket 362, being fixed in a parallel mini-loop).
Do not wait on that fix; this fixture goes through the ranking engine, not
through the tab's UI.

## Open question the plan must answer

Per stage-gate step 1, with a candidate approach, the result that would make it
win written down **before** measuring, and a measurement:

**Q. What does the engine do with a two-hander in the main hand and an off-hand
item still equipped?** The three candidate answers are already named in ticket
350: it silently drops the off hand (today's numbers are right by accident), it
counts both (rows are mispriced), or it rejects the set (runs abort). Say which
observation would select which answer before running anything. Ticket 350's two
candidate fixes are selected by this result, so do not choose a fix here — this
mini-loop measures, 350 decides.

## Constraints

- Bash and PowerShell share no state. Run `pnpm`/`node`/`npx`/`python` from
  **Bash**; PowerShell gives Node 20 and dies on `node:sqlite`.
- Git Bash prints an `fnm env` error on stderr that **breaks `&&` chains and
  heredocs**. Run git standalone with `git -C`, use `pnpm -C` / `npm --prefix`,
  and write real script files instead of heredocs. This has already cost this
  session four commands.
- **Exit codes lie.** A pipe reports the last command's status. Append
  `; echo "rc=${PIPESTATUS[0]}"` or redirect to a file and read it separately.
  Confirm the artifact — the fixture file, the row count, the recorded request —
  before reporting anything as done.
- `git add <paths>` does not scope a commit; pre-commit runs `lint-staged`
  against `*`. `git status` must be clean of work you did not do before each
  commit. Commit per green slice.
- If any fork `upgrades/engine/**` file is edited, the full five-step
  ported-engine cycle in `docs/agents/known-traps.md` applies. This work should
  not need to touch one — if it does, that is a finding worth flagging.

## Out of scope

- **Choosing ticket 350's fix.** Measure and record; 350 owns the decision.
- Fixing ticket 362 (the item-swap panic) — a parallel mini-loop owns it.
- Editing fork Go, or moving the engine pin.
- Re-measuring the feral rotation: the "−18 DPS" figure is superseded and
  reversed in sign (`docs/verification-log.md:1654-1669`, +42.91 DPS).
- Ticket 355 (pushing or archiving the fork branch) — owner's call.
- `pnpm merge-to-dev`, `pre-merge-review`, any merge into `dev`.

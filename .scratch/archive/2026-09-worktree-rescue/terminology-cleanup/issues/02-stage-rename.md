# 02 — Rename delivery "Phase N" → "Stage N"

Type: task
Status: open
Assignee: 3 × haiku, parallel
Blocked by: 01

Three sub-agents. File sets are **disjoint**, so they run in parallel safely.
Nothing here needs judgment — it is find-and-replace against a blocklist, which
is why haiku is the right tier.

## Constraints — paste verbatim into every sub-agent prompt

> **NEVER modify these tokens, anywhere, for any reason:**
> `CURRENT_PHASE`, `currentPhase`, `defaultMaxPhase`, `maxPhase`, `ContentPhase`,
> `DEFAULT_MAX_PHASE`, `Phase.Phase1`–`Phase.Phase5`, `export enum Phase`.
> This includes inside quoted upstream source blocks and inside regex literals.
>
> **NEVER touch these paths:** `.agents/**`, `.claude/**`, `test/fixtures/**`,
> `data/wowsims.lock.json`, `vendor/**`.
>
> **The rule:** rename "Phase" only where it means *a step in our build plan*.
> Leave it wherever it means *TBC game content tier*. When a single sentence is
> genuinely ambiguous, leave it and report the line — do not guess.
>
> **No behaviour changes.** Comments and prose only, except for the file rename
> in Agent B. Change no logic.

## Agent A — `PLAN.md`

The spine is §14 (`PLAN.md:758-825`), which is entirely delivery-sense.

1. `## 14. Phases and gates` → `## 14. Stages and gates`
2. All six headings: `### Phase 0 — De-risk` → `### Stage 0 — De-risk`, and the
   same for Phase 1 (`:791`), 2 (`:799`), 3 (`:809`), 4 (`:815`), 5+ (`:821`)
3. `PLAN.md:760` — "No phase starts until the previous gate…" → "No stage starts…"
4. Scattered delivery refs, ~25 total. Known sites: `:6` (×2), `:30`, `:31`,
   `:113`, `:267`, `:317`, `:322`, `:389` (×2), `:394`, `:490`, `:502`, `:572`,
   `:591`, `:624`, `:669`, `:673` (×2), `:674`, `:690`, `:726` (×2), `:737`,
   `:780`, `:789`, `:791`, `:795`, `:803`, `:813`, `:842`, `:881`.
   **Treat this list as a starting point, not as complete** — sweep the whole file.
5. **The `[P0]` marker → `[S0]`.** ~14 sections carry `**[P0]**` meaning "verified
   in Phase 0". Under the rename that reads as the game's P0. Rename every one,
   and update the legend at `:6` to match.
   - Do **not** touch `[R2]`, `[R3]`, `[Rn]` review markers — unrelated.
   - Do **not** touch `P1`/`P2`/`P3` where they mean game tiers (`:259`, `:510`,
     `:825`, the T4/P1…T6/P5 notation).
6. Update the `docs/phase0-findings.md` references at `:6`, `:322`, `:770` to
   `docs/stage0-findings.md` (Agent B does the actual file rename).

**Leave alone in `PLAN.md`** — these are game-sense: `:29`, `:134`, `:163`,
`:180`, `:296`, `:300`, `:305`, `:308`, `:311-312`, `:422`, `:448`, `:504`,
`:516`, `:599-612`, `:631`, `:650`, `:847`, `:868`, `:873`, `:889`.
Issue `04` handles prose polish on those — **do not pre-empt it**.

## Agent B — `docs/`

1. **`git mv docs/phase0-findings.md docs/stage0-findings.md`** (use `git mv`,
   not delete-and-create — preserve history)
2. Inside it: `# Phase 0 findings` → `# Stage 0 findings`; `:10`, `:28`, `:47`,
   `:58`, `:86`, `:90` (×2). Line `:58` says "per spec/phase" in the **game**
   sense — leave it.
3. `.prettierignore:20` → `docs/stage0-findings.md`
4. `docs/verification-log.md`: `:3` ("No phase starts…" — quotes PLAN §14),
   `:9` ("Phase 0, second sitting"), `:155`, `:163`.
   **Leave** `:90`, `:129-130`, `:133-138`, `:147`, `:150-151` — all game-sense,
   and `:129-130` is quoted upstream source.
5. Do **not** edit `PLAN.md` or `PLAN-REVIEW.md` — Agent A owns `PLAN.md`, and
   `PLAN-REVIEW.md` is out of scope pending the §6 ruling.

## Agent C — code comments

Comments and strings only. Change no logic.

1. `scripts/verify_fixture.py:3` — "closes three PLAN.md Phase 0 gate boxes" →
   "Stage 0". **Leave `:214`, `:219-221`** — game-sense gem phases.
2. `wcl_probe.py:3` — "Phase 0 validation probe" → "Stage 0"
3. `wcl_probe.py:562` — argparse description "Phase 0 Warcraft Logs probe" → "Stage 0"
4. `packages/core/src/index.ts:1` — "Phase 1 adds rankUpgrades() here" → "Stage 1"
5. `scripts/sync_wowsims.py:160` — the printed string `"PLAN.md 14, Phase 5+"` →
   `"PLAN.md 14, Stage 5+"`. **This is the only line in that file you may touch.**
   Everything else there is game-sense, and `:85`/`:88` are regexes that parse
   upstream — breaking them breaks the sync.

## Done when

- [ ] `pnpm verify` passes
- [ ] `python scripts/sync_wowsims.py --check` passes
- [ ] `git grep -n "Phase [0-9]"` returns only game-sense hits and excluded paths
- [ ] `git grep -n "\[P0\]"` returns nothing
- [ ] No dangling `phase0-findings` links
- [ ] Committed

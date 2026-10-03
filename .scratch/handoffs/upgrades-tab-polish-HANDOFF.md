# Handoff: Upgrades tab — finish the polish arc, then review

**For a fresh session on branch `feat/tab-signoff-followups`.** The fork clone
`vendor/tbc-new-fork` is on `feat/upgrades-tab`; `data/wowsims-fork.lock.json`
names its HEAD and its `_comment` history is the log of every fork commit.
Overview plan for the overseer: `upgrades-tab-polish-PLAN.md` beside this file.

## Where the work stands

- 472 (rows restyled after the Gear-tab item list) + 473/474/475: closed,
  reviewed in round 9 of `docs/reviews/feat-tab-signoff-followups.md`.
- The owner's polish arc 483–488: closed, landed after round 9 (main
  e8666023..ef5c84ac, fork 9b7a57036..5d84ffff9), **unreviewed**. Round 10
  chains from round 9's through-sha: `Reviewed range: 7c54848f..<HEAD>`.
- Owner's live look (2026-09-22) accepted the arc with one change, ticket
  489 (widen the Source column cap). No other feedback.
- Open set: `pnpm issues:open`. Each ticket's Comments hold what was done,
  the fork sha, and what was measured; read those before the ticket body.
- The merge to `dev` is held for the owner's separate ask (AGENTS.md § The
  loop, step 6). Several arcs have landed under that hold; stopping after
  the review is the expected end state.

## Gotchas this session paid for (not in any config)

- **Live runs need both servers.** vite `:5173` serves the live tree, but its
  default worker calls the Go backend on `:3333`; without it every sim
  fails with "Failed to fetch" / "Something went wrong running the sim".
  Start `wowsims-backend` then `wowsims-fork` from `.claude/launch.json`.
  With the backend a feralcat run takes ~3 min. The owner allows stopping a
  stray `wowsimtbc.exe` holding :3333.
- **The browser tab resets to `/tbc/` when the session's turn ends
  mid-run.** Keep the tab fronted and poll with ≤30 s JS waits until
  `.upgrades-baseline-summary` shows "Took"; the two runs left alone during
  a turn boundary were lost, the runs polled through survived.
- `pnpm tab-review` photographs only a mid-run table of ~6 usually untagged
  rows. It gives facts and gates; the owner's look needs the live page,
  fronted, or a PNG via SendUserFile.
- Three separate `<table>`s share one `resultsColgroup()`; the desktop gate
  reads `td[0..4]` by position, so the star and batch cells stay last.
  Widths and measurements: 481/483 Comments.
- lint-staged sweeps every dirty file into whatever commit is next: commit
  ticket files before a worker's re-pin lands.
- A worker that spawns its own worker stalled twice. Tell each worker to
  make the fork edits itself and to report shas and `rc=` lines; confirm the
  shas exist before closing the ticket.
- A literal `\u0000` in prose written with the Write tool lands as a NUL
  byte (ticket 473 needed a fix commit). Escape it.

## Suggested skills

- `stage-gate` for 476/477 (engine math with fixtures; a wrong plan is
  expensive). `tdd` for the fixtures.
- `pre-merge-review` for round 10; `dont-be-stupid` before reporting any
  ticket done; `writing-for-agents` before editing this file or the plan.
- `handoff` at the end of the session.

## Talking to the owner

Plain words the owner already uses; lead with the state; give a decision as
prose with the reasoning that separates the options. The owner asked twice
this session for plainer English — a term coined during the work reads as
jargon to them. To show a render, front the live page in the browser pane or
send a PNG, and say in one sentence what they are looking at.

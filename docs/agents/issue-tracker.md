# Issue tracker: Local Markdown

Issues and specs (you may know a spec as a PRD) for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

### Carry-forward tickets (deferred from a review)

**Tickets are the source of truth** for “fix later” work — not the review
prose, not chat. Findings that aren’t fixed on the branch that found them
become:

```
.scratch/carry-forward/issues/<NN>-<slug>.md
```

**Allocating `<NN>`:** read `.scratch/carry-forward/issues/NEXT`, use that
number, and write the incremented value back to `NEXT` in the same commit
as the new ticket. Never allocate by listing the directory — two branches
doing that pick the same number and merge cleanly under different
filenames (it happened: two 232s and two 233s on 2026-08-19). Editing
`NEXT` forces the collision into a git conflict instead.

Each file starts with these lines (machine-readable; `pnpm merge-to-dev` / `merge-ready` parse them):

```
Status: open
Type: task
Origin: docs/reviews/<branch>.md
Blocks: phase-1
Blocked by: none
```

- **`Status:`** — one of exactly six words, and nothing else:
  `open` / `claimed` / `blocked` / `closed` / `resolved` / `wontfix`
  (`scripts/check_merge_ready.py`, `KNOWN_STATUSES`). Anything the gate cannot
  read is an error that fails the merge, not a shrug — a ticket the tooling
  cannot see cannot block anything (tickets 85, 88/89, 147). Put commentary in
  the body, never on the `Status:` line.
- **`blocked`** — open work that only a _named human_ can move, such as an
  owner ruling. It behaves exactly like `open` in every gate scan: it shows in
  `pnpm issues:open`, its `Blocks: phase-N` line still gates phase merges, and a
  review `defer` may target it. It is not a merge veto on its own — veto power
  lives in `Blocks:`, not in the status word.
- **`Origin:`** — the review that created it.
- **`Blocks:`** — which phase must deal with this (e.g. `phase-1`). On
  `phase-N/*`, `pnpm merge-to-dev` refuses while matching tickets are still open,
  unless you pass `--ack-open-blockers`. Prefer closing or rewriting
  `Blocks:` with a note over ritual acknowledgment.
- **`Blocked by:`** — what must exist before this ticket can be _started_, or
  `none`. Either other ticket files (`03`, `04` — clears when those close), or a
  **component that does not exist yet**, named with its PLAN.md section:
  `compose stage (PLAN.md §8.2) — not yet built`. It is the inverse of `Blocks:`
  — `Blocks:` says which phase must deal with the ticket, `Blocked by:` says what
  the ticket is waiting on. **Convention, not a gate:** `pnpm merge-to-dev` never reads
  it, because "is the compose stage built?" is not machine-checkable. It exists
  so `pnpm issues:open` can show that a ticket is unstartable _before_ someone
  sizes it. Write it when you file the ticket; a review that defers a finding
  into a component that is not built yet must fill it in.

The review’s Disposition table **links** tickets for `defer` rows; it does
not replace them. List open ones anytime: `pnpm issues:open`.

**Ticket files are copied, not shared, across unmerged branches.** Two
branches that both file or update tickets end up with diverging copies of
the same file: their `Status:` lines disagree, `pnpm issues:open` shows
whichever branch you are standing on, and merging the second branch to
`dev` conflicts on every ticket both branches touched (this happened on
2026-08-15 — eight ticket files, see ticket 175). Two rules follow:

- Read a ticket's `Status:` **on the branch you will base from**, not the
  branch you happen to be on.
- When two branches will run in parallel and both may file tickets, give
  each a distinct number range up front (e.g. branch A files 165+, branch B
  files 169+), or file only from one of them.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).
For a deferred pre-merge finding, publish under `.scratch/carry-forward/issues/`
instead and link it from the review's `## Disposition` table.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

## Triage

This solo project doesn't use triage labels or a formal triage workflow. Skip triage-related steps in other skills.

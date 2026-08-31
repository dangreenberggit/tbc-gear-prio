Status: open
Type: enhancement
Origin: pre-merge review round 5, Adversarial finding A1, 2026-08-28
Blocks: none
Blocked by: none

## Investigated 2026-08-30 (bucket-2 pass) — the constraint decides against CI wiring; left open for an owner placement ruling

Researched how the fork's other gates are invoked, as the ticket directs. The
finding rules out the ticket's assumed home ("the fork's own lint/CI path"):

- **The fork's CI runs almost none of its own npm gates.** The only fork
  workflow that runs tests is `.github/workflows/run_tests.yml`, and it invokes
  exactly one npm script — `npm run test:locales` (line 54) — plus the Go sim
  tests. `npm run lint`, `npm run type-check`, and `npm run test:layout` are
  invoked by **nothing** in `.github/` (grep over `.github/` for `npm run`
  returns only `test:locales` in a workflow; the two other hits are handoff
  SKILL.md docs). So there is no existing fork "lint/CI aggregate" to hook the
  layout gate into — the premise doesn't exist.
- **That CI never fires for this project anyway.** `run_tests.yml` triggers on
  `pull_request` to `master` (upstream wowsims' branch). This fork opens no such
  PRs: `data/wowsims-fork.lock.json` records `"pushed": false`, and the plan (§1)
  keeps any push behind a separate explicit ask. The fork's `.github/` is
  upstream's CI for upstream's PRs, dormant for our work.
- **No headless Chromium in that CI, and the ticket says that decides it.**
  `run_tests.yml` runs on `ubuntu-latest` with Go + Node 22 + protoc and **no**
  Playwright/Chromium install. `test-layout.mjs` drives an on-disk Playwright
  Chromium (`findChromium()` under `~/…/ms-playwright`). Even if the workflow
  fired, the gate could not run there without adding a browser-install step.
- **`pnpm verify` can't be the hard gate either.** It runs on machines where the
  fork is absent (CI, fresh clones) — the engine-port-drift and fork-universe
  checks all *skip* when `vendor/` is missing. A gate that renders the fork's
  built `dist/` can only run from the main checkout, which has the fork + a
  built `dist/tbc` + Chromium.

So the layout gate can only run automatically from **the main checkout, as a
local/pre-merge step**, never in either repo's CI.

## Decision-ready options written 2026-08-30 — awaiting an owner pick

A full plain-English options write-up is at
[`.scratch/carry-forward/325-options.md`](../325-options.md). It lays out four
distinct homes (A: documented pre-merge-review step; B: a warn-only self-skipping
check chained onto `pnpm verify`, modeled on `upstream-drift:warn`; C: just
document the test's existence; D: run it in CI — ruled out, blocked on the
fork's environment and the deferred split-repo thread). Each option has its
cost, what it protects, what it leaves exposed, and its blockers, with every
claim grounded in a file path.

**Recommendation (write-up's):** do **Option B** — wire the layout test onto
`pnpm verify` as a warn-only check that self-skips when the fork / its `dist/` /
Chromium is absent (the `warn_upstream_drift.py` + `_fork_gate.py` pattern this
repo already uses), so it runs unprompted on every push and merge from the main
checkout — and fold in Option A's one useful half (a pre-merge-review line so a
tab-touching branch records the `test:layout` result in `docs/reviews/<branch>.md`).
B is the only option that makes the test run without a human remembering; A and C
keep it a reminder. **Not blocked on the 251/263 split-repo thread** — that thread
is about which upstream source supplies gear presets, which the layout test does
not read. Only Option D (CI) is entangled with it, and D is ruled out.

The gate itself is done and biting (ticket 322, closed); this ticket is only the
"where does it run" decision. On the human-inspection checklist.

# The Upgrades-tab layout gate runs by hand, not as a gate

Ticket 322 shipped `test-layout.mjs` (fork), a DOM-geometry gate that renders
the Upgrades tab headless and asserts layout facts at 375/768/1280. It works and
it bites (proven by a deliberate-failure run). But it is invoked by **nothing**:
`grep test:layout` across the fork's `*.yml`, `package.json`, and `*.mjs`
returns a single hit — the `package.json` script definition itself.

`pnpm verify` does not see the fork (a documented fact, ticket 322 itself), and
no fork CI or aggregate script calls `test:layout`. So ticket 322's own premise —
"a gate that runs and catches the next regression" — is only half met: the script
exists but must be run **by hand**, exactly like the manual browser checks it was
meant to replace. The next layout regression will not be caught unless someone
remembers to type `npm run test:layout`.

## Why it wasn't wired this round

The fork's gate set is its own `npm run` scripts; the natural home is the fork's
lint/CI path, not the main repo's `pnpm verify`. Wiring it there is a small but
real decision (does it run on every fork push? only pre-merge? is a headless
Chromium available in whatever CI the fork uses?) that was out of scope for the
322 build, which was told to build the gate, not re-architect the fork's CI.

## What is wanted

Decide where `test:layout` should run automatically and wire it there — the
fork's own gate aggregate (`npm run lint` / a CI step), or a documented pre-merge
step the merge-to-dev path checks. If headless Chromium isn't reliably present in
the target CI, that constraint decides the answer and should be recorded.

Cheap to do once the "where" is decided; the gate itself is done.

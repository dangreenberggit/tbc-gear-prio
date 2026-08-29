Status: open
Type: enhancement
Origin: pre-merge review round 5, Adversarial finding A1, 2026-08-28
Blocks: none
Blocked by: none

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

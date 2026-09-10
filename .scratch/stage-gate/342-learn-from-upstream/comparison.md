# Upstream comparison for the four kept features (ticket 342)

Fork HEAD: `6d0edd69d237e725de8ec5d034c28aa10171bd21` (`feat/upgrades-tab`), working tree clean at read time.
Upstream ref: `origin/feature/backend-reforge` @ `cbf6b75a889e52c4106351976db66efd914ea349`, equal to `watchedRefs["feature/backend-reforge"].commit` in `data/wowsims.lock.json` and an ancestor of the fork HEAD. Every upstream claim below is stamped to this commit.
E-W3 status: **ran and passed** — `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` on Node 22.16.0 reports `1 passed | 1 skipped (2)`; the passing test is "the ported fork engine reproduces this repo's ranked deltas" and the skipped entry is only the placeholder `it.skip` that fires when the fork's protos are absent. On the default `C:\Program Files\nodejs\node.exe` (v20.18.1) the suite fails to collect with `Error: No such built-in module: node:sqlite`; `package.json` requires `node >=22.5.0`, so every parity claim in this document was measured on Node 22.16.0.

Scope note: this is a read-and-compare pass. Upstream code is reference material only (ADR-0025); nothing here imports from or re-pins upstream.

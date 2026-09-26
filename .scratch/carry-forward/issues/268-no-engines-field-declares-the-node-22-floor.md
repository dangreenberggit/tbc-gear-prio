Status: closed
Type: task
Origin: Stage 3 web shell execution, 2026-08-22 (docs/verification-log.md, "What the harness could not show")
Blocks: none
Blocked by: none

# No `engines` field declares the Node 22 floor, and the failure is opaque

## Problem

`packages/core/src/seams/store.ts` imports `node:sqlite` at module scope. That
built-in landed in Node 22, so on Node 20 the module fails to load at all:

```
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

Because the import is static and `store.ts` is on the path to `index.ts`,
this fires even when the caller only ever wanted `MemoryStore` — the default
for the web shell and every test.

Neither the root `package.json` nor `apps/web/package.json` has an `engines`
field, so nothing warns at install time. The first signal is a stack trace at
startup naming a built-in module, which does not obviously read as "your Node
is too old".

Hit for real: Claude Code's preview harness runs Node 20.18.1, and
`apps/web/dist-server/main.js` would not boot under it. The dev shell and CI
both run Node 22 (`.github/workflows/verify.yml` pins `node-version: 22`), so
`pnpm verify` never sees this.

Verify the gap:

```bash
node -e "const p=require('./package.json');console.log(p.engines)"            # undefined
node -e "const p=require('./apps/web/package.json');console.log(p.engines)"   # undefined
grep -n "node:sqlite" packages/core/src/seams/store.ts
```

## What to do

Add `"engines": { "node": ">=22" }` to the root and `apps/web` manifests so
pnpm reports the mismatch at install rather than at runtime. Consider also
whether `SqliteStore` should be imported lazily — a consumer that only wants
`MemoryStore` currently pays for a built-in it never calls, which is what
turns a version mismatch into a hard startup failure instead of a missing
optional adapter.

Not urgent: every supported path already runs Node 22. This is about the error
being legible when someone lands on an older runtime.

## 2026-08-30 — resolved on `fix/node-22-engines-floor` (commit 733d4a4), pending merge

Fixed after it bit for real: `pnpm verify` failed on `node:sqlite` because the
shell defaulted to Node 20 (the tool's PowerShell reads `v20.18.1`). Measured
floor is **Node >=22.5.0** — `node:sqlite` first shipped in Node 22.5.0
(experimental built-in); it does not exist in Node 20 or Node 22.0–22.4. The
import site is `packages/core/src/seams/store.ts` (`import { DatabaseSync } from
"node:sqlite"`), on the path to `packages/core`'s index, so it loads even for
`MemoryStore`-only callers.

Landed (all measured, not the coarse `>=22` the ticket suggested):

- `engines.node ">=22.5.0"` on root, `apps/web`, and `packages/core` (the
  package that actually owns the import).
- `.npmrc` `engine-strict=true` — the ticket's `engines` alone only warns;
  pnpm enforces it at install only with this flag.
- `.node-version` `22.17.1` (matches the vendored fork's pin; confirmed
  installed in fnm) so `cd`/`fnm use` auto-selects a good Node.
- a `preflight:node` guard prepended to the `verify` script. **Verified**: run
  under Node 20.18.1 it exits 1 with
  `[tbc-gear-prio] Node 20.18.1 is too old. This repo needs Node >=22.5.0
  (node:sqlite). Use fnm/nvm: fnm use (see .node-version).` — instead of the
  opaque `node:sqlite` trace deep in verify.

**Untested here:** `pnpm install` under `engine-strict` on Node 22 (the tool
shell defaults to Node 20; run it once on Node 22 before merge to confirm it
stays green). CI already pins `node-version: 22` (`.github/workflows/verify.yml`),
so this is purely local-dev legibility.

**Not done (deliberate, follow-up):** the lazy-`SqliteStore`-import idea the
ticket floats — a code change with test implications, out of scope for a
config-only fix. Close 268 on merge; open a separate ticket if the lazy import
is still wanted.

## 2026-09-25 — closed

Closed per the note above ("Close 268 on merge"). `fix/node-22-engines-floor`
(`5c01b5aa`) is in dev through merge `dc83b554`:
`git merge-base --is-ancestor fix/node-22-engines-floor dev` exits 0. The
lazy-`SqliteStore` import stays out of scope; no ticket is filed for it.

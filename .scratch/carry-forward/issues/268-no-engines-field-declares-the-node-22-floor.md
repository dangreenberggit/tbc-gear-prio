Status: open
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

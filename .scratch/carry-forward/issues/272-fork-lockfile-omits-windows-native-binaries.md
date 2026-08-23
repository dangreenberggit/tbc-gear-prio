Status: open
Type: defect
Origin: stage-gate finish-the-tab, executor Step 1b, 2026-08-22
Blocks: none
Blocked by: none

# The fork's `package-lock.json` carries no Windows native binaries

A committed lockfile cannot install a working toolchain on this machine.

`vendor/tbc-new-fork/package-lock.json` was generated on Linux by an npm that
pruned every foreign-platform optional dependency. A clean `npm ci` from it on
Windows therefore installs no native binary for six packages that need one, and
**`npm run type-check` and the vite build cannot run at all**.

## What was measured

The lockfile lists only Linux bindings for rolldown, and none of TypeScript 7's
twenty platform packages:

```
$ python -c "<list package-lock entries matching 'rolldown'>"
node_modules/@rolldown/binding-linux-x64-gnu   1.2.3
node_modules/@rolldown/binding-linux-x64-musl  1.2.3
node_modules/@rolldown/pluginutils             1.0.1
node_modules/rolldown                          1.2.3

$ python -c "<list package-lock entries matching 'typescript'>"
node_modules/@protobuf-ts/plugin-framework/node_modules/typescript 3.9.10
node_modules/@protobuf-ts/plugin/node_modules/typescript           3.9.10
node_modules/typescript                                            7.0.2
```

`typescript@7.0.2` ships its compiler as twenty platform-specific optional
dependencies (`@typescript/typescript-win32-x64` and friends). **None appears in
the lockfile**, so this is not a Windows-only inconvenience — a clean `npm ci`
of this lockfile cannot type-check on *any* platform, including the Linux one it
was generated on, unless npm resolves the optional deps outside the lockfile.

Symptoms hit in order, each hiding the next:

```
Error: Unable to resolve @typescript/typescript-win32-x64.        # tsc
Cannot find module '@rolldown/binding-win32-x64-msvc'             # vite build
Cannot find module '../lightningcss.win32-x64-msvc.node'          # css minify
sass --embedded is unavailable in pure JS mode.                   # scss (degrades)
```

Separately, six *declared* dependencies were simply absent from the installed
tree before a fresh `npm ci` was run (`idb`, `@types/async`, `oxfmt`, `oxlint`,
`sass-embedded`, `vite-plugin-watch-and-run`). `vite-plugin-watch-and-run` is
imported by `vite.config.mts`, so every vite command failed with
`ERR_MODULE_NOT_FOUND` until that install happened.

## The workaround in use (not a fix)

The finish-the-tab executor installed the six binaries without touching the
manifest or lockfile:

```
npm install --prefix <fork> --no-save --no-audit --no-fund \
  @typescript/typescript-win32-x64@7.0.2 \
  @rolldown/binding-win32-x64-msvc@1.2.3 \
  @oxlint/binding-win32-x64-msvc@1.77.0 \
  @oxfmt/binding-win32-x64-msvc@0.62.0 \
  sass-embedded-win32-x64@1.100.0 \
  lightningcss-win32-x64-msvc@1.33.0
```

They must go in **one** command: `--no-save` installs do not compose, and a
second one prunes the first (observed — the TypeScript binary disappeared when
rolldown's was added separately).

This state lives only in the working clone's `node_modules`. It does **not**
survive `rm -rf node_modules && npm ci`, and it is not reproducible for anyone
else, because nothing on disk records it. Any future session that reinstalls
will hit the same four errors in the same order.

## What would close this

Regenerate `package-lock.json` so the optional platform packages are present for
every platform the project is built on — on npm 10+, `npm install
--os=win32 --cpu=x64` (repeated per platform) or removing the lockfile and
reinstalling on a machine whose npm records optional deps for all platforms.
Then verify from scratch on Windows:

```
rm -rf <fork>/node_modules && npm ci --prefix <fork>
node <fork>/node_modules/typescript/bin/tsc --noEmit -p <fork>/tsconfig.json   # 0 errors
cd <fork> && npx tsx vite.build-workers.mts && npx vite build                  # exit 0
```

Both must pass with **no** `--no-save` installs. Until then, treat any fork
build or type-check on a fresh clone as blocked, and re-run the workaround.

## Notes

- The fork clone is gitignored and pushes to a personal remote, so this fix is a
  fork-side commit, not a change to this repo. Coordinate with ticket 251, which
  already holds an open decision about the fork's branch point.
- Two *generated* trees were also stale in the same session and needed
  regenerating before anything compiled — the TypeScript protos
  (`ui/core/proto/`, 108 tsc errors) and the Go protos (`sim/core/proto/*.pb.go`,
  every Go package failed to build). Both are gitignored and both regenerate
  from the makefile's own recipes (`makefile:76-78` and `makefile:223-225`).
  That is a separate gap from this ticket's lockfile defect, but a fresh clone
  hits all three together.

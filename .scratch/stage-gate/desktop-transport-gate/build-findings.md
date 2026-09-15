# Build findings — desktop-transport-gate

## Step 1 — first `make wowsimtbc` on this machine

Command: `fnm exec --using=22 -- make -C <fork> wowsimtbc` → `rc=0`.
Log: `build-tip.log`. Ran ~end-to-end: WASM compile, `gzip -9`, `npm ci`,
`protoc`, `tsc --noEmit`, `vite build`, `binary_dist` copy+strip, `go build -o
wowsimtbc.exe ./sim/web` → "Build Completed Successfully".

C20 verified **true**: the make recipe resolves `npx`, `tsc`, `gzip`, `go`
under `fnm exec --using=22 -- make` in this shell; no by-hand recipe fallback
was needed.

`wasm-opt not found` is a benign skip (binaryen not installed) — the recipe
downgrades to unoptimised wasm and continues; not a failure.

Acceptance:

- `wowsimtbc.exe` present, 106442752 bytes.
- `binary_dist/tbc/paladin/retribution/index.html` present (1968 bytes).
- `binary_dist/tbc/lib.wasm` absent; `binary_dist/tbc/assets/database/db.bin`
  absent — C4 strip list applied.
- `sha256(wowsimtbc.exe)` = `f0582d53b335bea9019f778ba4ce4a6928f7161a1169b16b05dd171e1d017876`.

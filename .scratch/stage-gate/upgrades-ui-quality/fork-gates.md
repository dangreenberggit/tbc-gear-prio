# Fork gate commands (measured, not assumed)

Orchestrator note for the executor, written 2026-08-27. Relevant to review
finding F5: `pnpm verify` in the main repo does not see the fork at all
(`grep -c vendor package.json` → `0`), so these are the gates that actually
cover the code this stage changes.

All commands run from `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork`.

## The fnm trap

The `node_modules/.bin/` shims fail in this environment:

```
error: We can't find the necessary environment variables to replace the Node version.
You should setup your shell profile to evaluate `fnm env`
```

`node` itself works. The shim wrapper is what breaks, so **invoke each tool's
entry point through `node` directly** rather than through `.bin/` or the
`npm run` script that calls it.

Measured, on the tree at stage open:

All four gates were run at stage open. Every one works when invoked through
`node` against the package's real entry point:

| Gate | Command that works | Result at stage open |
| --- | --- | --- |
| `test:locales` | `node ./test-locales.mjs` | **exit 0** — validated 3 locale files; `en/translation.json` valid |
| `lint:css` | `node ./node_modules/stylelint/bin/stylelint.mjs "<path>"` | **exit 0** on `_upgrades_tab.scss` |
| `type-check` | `node ./node_modules/typescript/bin/tsc --noEmit` | **exit 0**, clean |
| `lint:js` | `node ./node_modules/oxlint/dist/cli.js ./ui` | **exit 0** with pre-existing warnings |

Failing invocations, for contrast — these are shim failures, not gate failures,
and must not be read as a red gate:

- `node ./node_modules/.bin/stylelint` → exit 1, fnm error
- `node ./node_modules/oxlint/bin/oxlint` → exit 1, fnm error
- `./node_modules/@oxlint/binding-win32-x64-msvc/oxlint.exe` → no such file;
  the native artifact is a `.node` module loaded by the JS wrapper, not an exe

## Baseline noise to expect

`lint:js` exits 0 but prints `no-unused-vars` warnings from files unrelated to
this stage — `ui/shaman/inputs.ts` among them. That is the **pre-existing
baseline**, not something this work introduced. Judge the gate by its exit code
and by whether new warnings name files this stage touched.

## Why `test:locales` matters here

Adding any new UI string touches three places, per review finding F4:

1. `assets/locales/en/translation.json` — the string itself.
2. `schemas/translation.schema.json` — `additionalProperties: false` plus the
   key listed in `required` at three levels, so an unlisted key fails.
3. The call site in `upgrades_tab.tsx`.

CI runs this at `.github/workflows/run_tests.yml:54`, so skipping it locally
only defers the failure.

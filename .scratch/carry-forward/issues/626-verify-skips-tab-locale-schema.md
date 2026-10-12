Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/feat-bis-rows.md (finding S6)
Blocks: none
Blocked by: none
Related: 578

# `pnpm verify` does not check the tab's locale strings against their schema

The fork's `schemas/upgrades.schema.json` sets `additionalProperties: false`
and lists required keys, so every new or removed string in
`assets/locales/en/upgrades.json` must change the schema too. Nothing in this
repo's gates checks that. `feat/flat-cutoff` (fork `be3d703a1`) and
`feat/bis-rows` (fork `72de95a28`, `08afcdcce`) each changed the strings
without the schema, and `pnpm verify` passed on both. The `feat/bis-rows`
review fixed the schema in fork `49836e4e5`.

The fork's own `node ./test-locales.mjs` prints nothing on this Windows
machine; `docs/fork-upstream-touchpoints.md` (lines 208-227 at this
review) records that its glob matches no file on Windows, and gives an Ajv
command that does validate. Re-run from the main repo root
(prints `upgrades valid` and `translation valid` when they match):

    node --input-type=module -e "import path from 'node:path';import fs from 'node:fs';import {createRequire} from 'node:module';const f=path.resolve('vendor/tbc-new-fork');const A=createRequire(f+'/package.json')('ajv');const ajv=new (A.default??A)({allErrors:true});for(const n of ['upgrades','translation']){const v=ajv.compile(JSON.parse(fs.readFileSync(path.join(f,'schemas',n+'.schema.json'),'utf8')));console.log(n,v(JSON.parse(fs.readFileSync(path.join(f,'assets/locales/en',n+'.json'),'utf8')))?'valid':ajv.errorsText(v.errors))}"

Whether wowsims' CI `test-locales.mjs` job would have caught it on Linux is a
hypothesis, untested.

Done when: a `pnpm verify` step runs this check (skipping with a message when
`vendor/tbc-new-fork` is absent, like `scripts/check_engine_port_drift.py`)
and fails on a key that the schema does not list.

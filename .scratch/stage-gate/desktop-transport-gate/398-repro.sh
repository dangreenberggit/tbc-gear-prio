#!/usr/bin/env bash
# Reproduces ticket 398's native-vs-WASM measurement on P3 ret gear.
# Native ~2s; WASM ~70s plus a one-off go build.
set -euo pipefail
C="C:/Users/dgree/Code/lulz/tbc-gear-prio"
F="$C/vendor/tbc-new-fork"
OUT="${1:?usage: 398-repro.sh <output-dir>}"
BIN="$C/vendor/wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64/wowsimcli-windows.exe"

# 1. Build the request: committed skeleton, P3 equipment swapped in, nothing
#    else touched (seed 443754031 and iterations 25000 come from the skeleton).
python - "$C" "$OUT" <<'PY'
import json, sys
C, OUT = sys.argv[1], sys.argv[2]
sk = json.load(open(f'{C}/data/presets/ret/p2.raid-sim-skeleton.json'))
p3 = json.load(open(f'{C}/vendor/tbc-new-fork/ui/paladin/retribution/gear_sets/p3.gear.json'))
n = 0
for pa in sk['raid']['parties']:
    for pl in pa.get('players', []):
        if pl.get('equipment', {}).get('items'):
            pl['equipment']['items'] = p3['items']; n += 1
assert n == 1, f'expected exactly 1 real player, got {n}'
json.dump(sk, open(f'{OUT}/req_p3.json', 'w'))
PY

# 2. Native.
"$BIN" sim --infile "$OUT/req_p3.json" --outfile "$OUT/out_native_p3.json"

# 3. WASM. dist/ is gitignored, so lib.wasm must be built. Use `go build -C`:
#    a `cd $F && go build` chain breaks under fnm.
mkdir -p "$F/dist/tbc"
GOOS=js GOARCH=wasm go build -C "$F" -o "$F/dist/tbc/lib.wasm" ./sim/wasm/

N="C:/Users/dgree/AppData/Roaming/fnm/node-versions/v22.17.1/installation"
PATH="$N:$PATH" "$N/npx.cmd" tsx "$(dirname "$0")/398-wasm-harness.mjs" "$OUT"

# 4. Compare.
python - "$OUT" <<'PY'
import json, math, sys
OUT = sys.argv[1]
nat = json.load(open(f'{OUT}/out_native_p3.json'))
was = json.load(open(f'{OUT}/out_wasm_p3.json'))
a, sa = nat['raidMetrics']['dps']['avg'], nat['raidMetrics']['dps']['stdev']
b, sb = was['avg'], was['stdev']
d = abs(a - b)
band = 3 * math.sqrt(sa**2 + sb**2) / math.sqrt(25000)
print(f'native {a!r}\nwasm   {b!r}\ndelta  {d:.6e} DPS ({d/(abs(a)*2.22e-16):.0f} ulps)')
print(f'band   {band:.6f} DPS   |delta|<=band: {d <= band}')
PY

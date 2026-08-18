import fs from 'node:fs';
const f = JSON.parse(fs.readFileSync('packages/core/test/fixtures/synthetic-roster-recordings.json','utf8'));
const dps = Object.values(f.rows['feral-p3'].recordings).map(r=>r.dps).sort((a,b)=>b-a);
const baseline = dps[85] - 3.6, CUT = 3.6, SE = 5.128;
for (const k of [1,2,3]) {
  // promote: clearly above cutoff, OR within k*SE of the cutoff line
  const n = dps.filter(x => {
    const d = x - baseline;
    return d >= CUT + k*SE || Math.abs(d - CUT) < k*SE;
  }).length;
  console.log(`noise-band rule at k=${k}: promotes ${n} of 398 (${(n/398*100).toFixed(1)}%)`);
}
console.log(`\nfor comparison, K=210 promotes 210 (52.8%)`);
console.log(`and 45 items are solidly above cutoff`);

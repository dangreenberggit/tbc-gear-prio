import fs from 'node:fs';
const f = JSON.parse(fs.readFileSync('packages/core/test/fixtures/synthetic-roster-recordings.json','utf8'));
const recs = Object.values(f.rows['feral-p3'].recordings);
const dps = recs.map(r=>r.dps).sort((a,b)=>b-a);
const SE = 5.128;
// how many items lie within +/- 1 SE of the item at rank R?
for (const R of [86, 150, 195, 210]) {
  const v = dps[R-1];
  const within = dps.filter(x => Math.abs(x - v) <= SE).length;
  console.log(`rank ${R}: dps ${v.toFixed(2)}  items within +/-1 SE (${SE}): ${within}`);
}
const v86 = dps[85], v150 = dps[149];
console.log(`\nDPS gap between rank 86 and rank 150: ${(v86-v150).toFixed(2)} DPS`);
console.log(`That gap in units of screening SE: ${((v86-v150)/SE).toFixed(2)}`);
console.log(`\nDPS gap between rank 86 and rank 210: ${(v86-dps[209]).toFixed(2)} DPS = ${((v86-dps[209])/SE).toFixed(2)} SE`);

// Second half: how solid is the "86 above cutoff" figure?
// Baseline inferred as dps[85] - CUTOFF_FERAL.absDps, since rank 86 is the
// last above-cutoff row.
{
  const baseline = dps[85] - 3.6;
  const CUT = 3.6, SE2 = 5.128;
  const clear = dps.filter(x => (x - baseline) >= CUT + SE2).length;
  const band  = dps.filter(x => Math.abs((x - baseline) - CUT) < SE2).length;
  console.log(`\ninferred baseline ~ ${baseline.toFixed(1)}`);
  console.log(`clearly above cutoff (> cut + 1 SE): ${clear}`);
  console.log(`within +/-1 SE of the cutoff (undecidable at screening): ${band}`);
}

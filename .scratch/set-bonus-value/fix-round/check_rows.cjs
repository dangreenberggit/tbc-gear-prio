// Log-05 helper: pull row tags whose row text mentions a set name, show data-package.
const fs = require("fs");
const [path, name] = process.argv.slice(2);
const h = fs.readFileSync(path, "utf8");
const re = /<div class="row[^"]*"[^>]*>/g;
let m;
const out = [];
while ((m = re.exec(h))) {
  const seg = h.slice(m.index, m.index + 2500);
  if (seg.includes(name)) out.push(m[0]);
}
console.log("rows mentioning", name, ":", out.length);
for (const t of new Set(out)) console.log(" ", t.slice(0, 260));

// Crystalforge 2pc set-entry
const ci = h.indexOf("Crystalforge Battlegear 2pc");
if (ci >= 0) console.log("\nCrystalforge 2pc entry:\n", h.slice(ci - 60, ci + 700).replace(/\s+/g, " "));

// plausibility warnings section
const pi = h.search(/[Pp]lausibility warning/);
console.log("\nplausibility warning section index:", pi);
if (pi >= 0) console.log(h.slice(pi - 120, pi + 600).replace(/\s+/g, " "));

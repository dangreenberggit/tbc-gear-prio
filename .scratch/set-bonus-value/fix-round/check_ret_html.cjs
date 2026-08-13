// Quick inspection of the regenerated ret HTML (log 05). Not part of the build.
const fs = require("fs");
const path = process.argv[2];
const h = fs.readFileSync(path, "utf8");

const detail = new Set((h.match(/[^<>]*pc package[^<]*/g) || []).map((s) => s.trim()));
console.log("row-detail package lines (unique):");
for (const s of detail) console.log(" ", s);

const chips = new Set(h.match(/<span class="pkg">[^<]*<[/]span>/g) || []);
console.log("pkg chips (unique):");
for (const s of chips) console.log(" ", s);

const dp = h.match(/data-package="[^"]+"/g) || [];
console.log("data-package attrs total:", dp.length);

// Lightbringer member items: 30990 30993 30989 30997 — find their row's data-package value
for (const id of [30990, 30993, 30989, 30997, 30131]) {
  const re = new RegExp(`<li[^>]*data-item-id="${id}"[^>]*>`);
  const m = h.match(re);
  if (m) console.log(id, "row tag:", m[0].slice(0, 300));
  else {
    // fallback: find any tag containing the id and a data-package nearby
    const idx = h.indexOf(String(id));
    if (idx >= 0) {
      const back = h.lastIndexOf("<li", idx);
      console.log(id, "context:", h.slice(back, back + 400).replace(/\s+/g, " ").slice(0, 380));
    } else console.log(id, "not found");
  }
}

// unmeasurable text
const um = new Set((h.match(/[^<>]*measured[^<]*/g) || []).map((s) => s.trim()));
console.log("'measured' phrases (unique, first 10):");
let n = 0;
for (const s of um) { if (n++ >= 10) break; console.log(" ", s); }

// substitution entry for 30892 — how many lines does the detail carry?
const si = h.indexOf("30892");
if (si >= 0) {
  const seg = h.slice(si - 200, si + 1200);
  console.log("substitution context around 30892:");
  console.log(seg.replace(/\s+/g, " ").slice(0, 900));
  console.log("contains goroutine?", seg.includes("goroutine"), "| contains Stack Trace?", seg.includes("Stack Trace"));
} else console.log("30892 not in HTML");

// plausibility warnings in HTML
console.log("plausibility text present:", /plausib/i.test(h));

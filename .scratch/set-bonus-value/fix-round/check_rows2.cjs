// Log-05 helper: find every element carrying data-package whose following text
// mentions the given name; print the tag (so we can read the data-package value).
const fs = require("fs");
const [path, name] = process.argv.slice(2);
const h = fs.readFileSync(path, "utf8");
const re = /<[a-z]+ [^>]*data-package="[^"]*"[^>]*>/g;
let m;
while ((m = re.exec(h))) {
  const seg = h.slice(m.index, m.index + 1200);
  if (seg.includes(name)) console.log(m[0].slice(0, 400), "\n");
}

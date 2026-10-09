// Open every recorded fixture's ?upgrades-fixture link on the fork dev server
// (ticket 520). TBC_FORK_PORT picks the port (default 5173), so a second
// checkout's fork can serve on its own port (ticket 558).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const FORK = path.join(ROOT, "vendor/tbc-new-fork");
const FIXDIR = path.join(ROOT, "data/tab-fixtures");
const OUT = path.join(ROOT, ".scratch/tab-fixtures-smoke");
const PORT = process.env.TBC_FORK_PORT ?? "5173";
const BASE = `http://localhost:${PORT}`;
const PROBE = `[document.documentElement.dataset.upgradesFixture, document.querySelectorAll('[data-testid="upgrades-results-table"] tbody tr').length, document.querySelector('#upgrades-fixture-error')?.textContent]`;
const H = await import(
  pathToFileURL(path.join(ROOT, "scripts/tab-harness/test-tab-harness.mjs"))
);
const t0 = Date.now();
const secs = (t) => ((Date.now() - t) / 1000).toFixed(1);
const fail = (msg) => (console.log(`FAIL ${msg}`), process.exit(1));
const until = async (fn, ms, t = Date.now()) => {
  while (!(await fn()) && Date.now() - t < ms) await H.sleep(100);
  return fn();
};
const up = () => fetch(`${BASE}/tbc/`).catch(() => null);
let vite = null;
if (!(await up())) {
  // Our config wraps upstream's and adds the fixture plugin; cwd stays the
  // fork because upstream's config resolves some paths against it.
  const config = path.join(ROOT, "scripts/tab-harness/vite.config.mjs");
  const args = ["node_modules/vite/bin/vite.js", "serve", "--config", config];
  args.push("--port", PORT, "--strictPort");
  const opts = { cwd: FORK, stdio: "ignore" };
  vite = spawn(process.execPath, args, opts);
  const kill = ["/PID", String(vite.pid), "/T", "/F"];
  process.on("exit", () =>
    process.platform === "win32" ? spawnSync("taskkill", kill) : vite.kill()
  );
  if (!(await until(up, 60000))) fail(`dev server: did not start on :${PORT}`);
}
console.log(`dev server ${vite ? "started" : "reused"} in ${secs(t0)}s`);
if (!(await fetch(`${BASE}/tbc/tab-fixtures/`)).ok)
  fail("dev server: no /tbc/tab-fixtures/ index -- fork predates ticket 520");
fs.mkdirSync(OUT, { recursive: true });
const chrome = await H.launchChrome();
let failed = 0;
try {
  const client = H.cdp(chrome.wsUrl);
  await client.ready;
  const { send } = await H.attachPage(client);
  const size = { width: 1280, height: 900, deviceScaleFactor: 1 };
  await send("Emulation.setDeviceMetricsOverride", { ...size, mobile: false });
  const probe = () => H.evaluate(send, PROBE).catch(() => []);
  for (const file of fs.readdirSync(FIXDIR).sort()) {
    if (!file.endsWith(".json")) continue;
    const name = file.slice(0, -5);
    const { spec } = JSON.parse(fs.readFileSync(path.join(FIXDIR, file)));
    const t = Date.now();
    const url = `${BASE}${H.pagePathFor(spec)}?upgrades-fixture=${name}`;
    await send("Page.navigate", { url });
    await H.sleep(300);
    let state, rows, err;
    await until(async () => ([state, rows, err] = await probe())[0], 150000, t);
    const s = secs(t);
    const png = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, `${name}.png`), png.data, "base64");
    failed += state === "loaded" ? 0 : 1;
    const tag = state === "loaded" ? "ok  " : "FAIL";
    const note = err ?? (state ? "" : "no result after 150s");
    console.log(`${tag} ${name}: ${rows} rows in ${s}s${note && ` (${note})`}`);
  }
} finally {
  chrome.kill();
  const rm = { recursive: true, force: true };
  await fs.promises.rm(chrome.userDataDir, rm).catch(() => {});
}
console.log(`total ${secs(t0)}s, ${failed} failed`);
process.exit(failed ? 1 : 0);

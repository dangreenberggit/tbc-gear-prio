/**
 * extract_sim_defaults.mjs — read a spec's buff/debuff defaults out of upstream
 * TypeScript, without executing it.
 *
 * ADR-0022. The values we need (raidBuffs / partyBuffs / individualBuffs /
 * debuffs) live in ui/<class>/<spec>/sim.ts as `RaidBuffs.create({...})` calls.
 * They are not JSON, so sync_wowsims.py can pin the file but cannot extract the
 * values; they are also not importable, because sim.ts pulls in the whole
 * upstream ui/ tree (widgets, SCSS, the works). So: parse with the TypeScript
 * compiler API and statically evaluate the literals.
 *
 * Two spread helpers from ui/core/proto_utils/utils.ts are resolved by reading
 * that file the same way, rather than being hardcoded here:
 *   ...defaultRaidBuffMajorDamageCooldowns()      -> a flat object literal
 *   ...defaultExposeWeaknessSettings(Phase.PhaseN) -> a Map keyed by phase
 *
 * Enum members (TristateEffect.X, Drums.X) are emitted as the bare member name,
 * which is what proto JSON uses and what the skeleton carries.
 *
 *     node scripts/extract_sim_defaults.mjs --spec feral
 *     node scripts/extract_sim_defaults.mjs --spec feral --check
 *
 * Exit 0 ok, 1 drift (--check), 2 missing inputs or an unresolvable expression.
 */

import ts from "typescript";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Which upstream file holds each spec's defaults. Ret is deliberately absent:
// its skeleton is a wowsimcli decodelink export, not generated, so nothing
// would consume an extraction of it (ADR-0022).
const SPECS = {
  feral: {
    sim: "vendor/wowsims/feral_sim.ts",
    out: "data/presets/feral/buff-defaults.json",
  },
};

const UTILS = "vendor/wowsims/proto_utils.ts";
const WANTED = ["raidBuffs", "partyBuffs", "individualBuffs", "debuffs"];

class Unresolved extends Error {}

function parse(file) {
  return ts.createSourceFile(
    path.basename(file),
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
}

/**
 * Statically evaluate an expression node to a JSON value.
 *
 * Throws Unresolved rather than guessing. A silently-wrong default here would
 * be worse than a hard failure: it would look like a successful regeneration
 * and ship a raid the user never configured.
 */
function evaluate(node, ctx) {
  if (ts.isObjectLiteralExpression(node)) {
    let out = {};
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) {
        // Spread order matters: later keys win, so merge in sequence.
        out = { ...out, ...evaluate(prop.expression, ctx) };
      } else if (ts.isPropertyAssignment(prop)) {
        out[prop.name.getText()] = evaluate(prop.initializer, ctx);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        throw new Unresolved(`shorthand property ${prop.name.getText()}`);
      }
    }
    return out;
  }

  // `Foo.create({...})` — the proto constructors. Also covers the two helper
  // calls, which are dispatched by name against utils.ts.
  if (ts.isCallExpression(node)) {
    const name = node.expression.getText();
    if (name.endsWith(".create")) {
      return node.arguments.length ? evaluate(node.arguments[0], ctx) : {};
    }
    return callHelper(name, node.arguments, ctx);
  }

  // TristateEffect.TristateEffectImproved -> "TristateEffectImproved"
  if (ts.isPropertyAccessExpression(node)) return node.name.getText();

  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    const v = Number(node.operand.text);
    if (node.operator === ts.SyntaxKind.MinusToken) return -v;
  }

  throw new Unresolved(
    `${ts.SyntaxKind[node.kind]} \`${node.getText().slice(0, 60)}\``
  );
}

/** Find `export const <name> = ...` and return its initializer. */
function findConst(source, name) {
  let found;
  const walk = (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      n.name.getText() === name &&
      n.initializer
    ) {
      found = n.initializer;
    }
    ts.forEachChild(n, walk);
  };
  walk(source);
  return found;
}

/**
 * Resolve the two known utils.ts helpers.
 *
 * Both are arrow functions. `defaultRaidBuffMajorDamageCooldowns` returns a
 * constructor call directly; `defaultExposeWeaknessSettings` indexes a
 * `new Map([[Phase.PhaseN, {...}], ...])` by its argument, defaulting to
 * CURRENT_PHASE — but every call site we parse passes an explicit phase, and we
 * refuse to invent one if that ever stops being true.
 */
function callHelper(name, args, ctx) {
  const decl = findConst(ctx.utils, name);
  if (!decl) throw new Unresolved(`helper ${name}() not found in ${UTILS}`);

  if (name === "defaultExposeWeaknessSettings") {
    if (args.length !== 1) {
      throw new Unresolved(
        `${name}() called with no explicit phase; refusing to assume CURRENT_PHASE`
      );
    }
    const phase = evaluate(args[0], ctx); // e.g. "Phase1"
    const mapName = decl.body?.expression?.getText?.() ?? "";
    const table = findConst(ctx.utils, mapName.split(".")[0]);
    if (!table) throw new Unresolved(`phase map for ${name}() not found`);

    // new Map([[Phase.Phase1, {...}], [Phase.Phase2, {...}], ...])
    const entries = table.arguments?.[0];
    if (!entries || !ts.isArrayLiteralExpression(entries)) {
      throw new Unresolved(`${name}() backing store is not an array literal`);
    }
    for (const pair of entries.elements) {
      if (!ts.isArrayLiteralExpression(pair) || pair.elements.length !== 2) {
        continue;
      }
      if (evaluate(pair.elements[0], ctx) === phase) {
        return evaluate(pair.elements[1], ctx);
      }
    }
    throw new Unresolved(`${name}(): no entry for ${phase}`);
  }

  // Plain nullary helper: evaluate whatever its body returns.
  const body = decl.body;
  if (!body) throw new Unresolved(`helper ${name}() has no body`);
  if (ts.isBlock(body)) {
    const ret = body.statements.find((s) => ts.isReturnStatement(s));
    if (!ret?.expression)
      throw new Unresolved(`helper ${name}() has no return`);
    return evaluate(ret.expression, ctx);
  }
  return evaluate(body, ctx);
}

/** Pull the four buff objects out of a spec's `defaults` block. */
function extract(simSource, ctx) {
  const defaults = findConst(simSource, "SPEC_CONFIG") ?? simSource;
  const out = {};
  const walk = (n) => {
    if (ts.isPropertyAssignment(n)) {
      const key = n.name.getText();
      // First occurrence wins: `defaults` sits above the presets//UI blocks,
      // which mention the same identifiers in other roles.
      if (WANTED.includes(key) && !(key in out)) {
        out[key] = evaluate(n.initializer, ctx);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(defaults);

  const missing = WANTED.filter((k) => !(k in out));
  if (missing.length) {
    throw new Unresolved(`no ${missing.join(", ")} in sim.ts defaults block`);
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const specName = argv[argv.indexOf("--spec") + 1];
  const check = argv.includes("--check");
  const spec = SPECS[specName];

  if (!spec) {
    console.error(`usage: --spec <${Object.keys(SPECS).join("|")}> [--check]`);
    return 2;
  }

  const simPath = path.join(ROOT, spec.sim);
  const utilsPath = path.join(ROOT, UTILS);
  for (const p of [simPath, utilsPath]) {
    if (!existsSync(p)) {
      console.error(`missing ${path.relative(ROOT, p)}`);
      console.error("  run: pnpm sync:wowsims:restore");
      return 2;
    }
  }

  let extracted;
  try {
    const ctx = { utils: parse(utilsPath) };
    extracted = extract(parse(simPath), ctx);
  } catch (e) {
    if (e instanceof Unresolved) {
      console.error(`cannot statically resolve: ${e.message}`);
      console.error(
        "  upstream changed shape — read the file and fix the extractor;\n" +
          "  do NOT hand-edit the generated JSON (ADR-0022)."
      );
      return 2;
    }
    throw e;
  }

  const outPath = path.join(ROOT, spec.out);
  const text =
    JSON.stringify(
      {
        _comment:
          `Generated by scripts/extract_sim_defaults.mjs from ${spec.sim} ` +
          `at the commit pinned in data/wowsims.lock.json. Do not edit by hand.`,
        ...extracted,
      },
      null,
      2
    ) + "\n";

  if (check) {
    if (!existsSync(outPath)) {
      console.error(`missing ${spec.out} — run the generator`);
      return 1;
    }
    if (readFileSync(outPath, "utf8") !== text) {
      console.error(`DRIFT: ${spec.out} does not match ${spec.sim}`);
      console.error("  run: pnpm sim-defaults:build");
      return 1;
    }
    console.log(`ok: ${spec.out} matches upstream ${specName} sim.ts`);
    return 0;
  }

  writeFileSync(outPath, text, "utf8");
  const counts = WANTED.map(
    (k) => `${k}=${Object.keys(extracted[k]).length}`
  ).join(" ");
  console.log(`wrote ${spec.out}`);
  console.log(`  ${counts}`);
  return 0;
}

process.exit(main());

/**
 * One pi-tui module identity per process.
 *
 * npm materializes @earendil-works/pi-tui twice under A1's package root: once
 * as A1's direct dependency at the node_modules root, and once nested inside
 * @earendil-works/pi-coding-agent, whose published npm-shrinkwrap.json makes
 * npm build its dependency tree exactly as shrinkwrapped instead of sharing a
 * hoisted copy. Both are the same version; npm just cannot tell them apart.
 *
 * Two copies means two of every TUI class. Pinned Pi hands extensions the
 * nested copy — its extension loader aliases the specifier to whatever it
 * resolves from its own directory — so an extension's `instanceof` check and
 * its prototype patches land on classes A1's renderer never uses. Extension
 * chrome silently disappears and routed input dead-ends, with no error.
 *
 * A1 therefore does not import the specifier at all. Its package declares the
 * subpath import `#pi-tui`, resolving to pinned Pi's copy first and to the
 * hoisted one only when that is absent — which is exactly the case where there
 * is one copy and both sides agree anyway. Every A1 module imports `#pi-tui`,
 * so which copy A1 uses is stated in package.json and enforced by Node at
 * resolution, rather than arranged by rewriting an installed tree.
 *
 * What remains here is the check that it worked. The alias names one path
 * inside pinned Pi; if a future layout moved that copy, resolution would fall
 * back to A1's own and the split would return — silently, which is what made
 * this expensive the first time. So launch compares the two resolutions and
 * says so when they differ, loudly and once, instead of leaving a user to
 * discover it as missing extension UI.
 *
 * This lives in bin/ (shipped, plain JS) because it inspects dependency
 * resolution, which the Pi API boundary policy rightly forbids ordinary
 * production code from touching.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * What A1's own modules resolve `#pi-tui` to, as a real path.
 *
 * The alias is read from the manifest and its entries tried in order, which is
 * what Node does for a subpath import: a relative target is a file within the
 * package, and a bare one goes through ordinary resolution. Asking Node
 * directly is not an option here — `import.meta.resolve` ignores the parent it
 * is given unless an experimental flag is set, so it would always answer for
 * the running process rather than for the installation being inspected.
 */
function resolveOwnPiTui(packageRoot) {
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const alias = manifest.imports?.["#pi-tui"];
  const targets = Array.isArray(alias) ? alias : alias === undefined ? [] : [alias];
  if (targets.length === 0) throw new Error("package.json declares no #pi-tui alias");
  for (const target of targets) {
    if (typeof target !== "string") continue;
    if (target.startsWith("./") || target.startsWith("../")) {
      const candidate = join(packageRoot, target);
      if (existsSync(candidate)) return canonical(candidate);
      continue;
    }
    try {
      return canonical(createRequire(pathToFileURL(join(packageRoot, "package.json")).href).resolve(target));
    } catch {
      continue;
    }
  }
  throw new Error(`no #pi-tui target resolves: ${targets.join(", ")}`);
}

/**
 * What pinned Pi resolves the same specifier to, as a real path — asked from
 * inside Pi's own directory, which is where Pi asks it.
 *
 * Pi's directory is located by walking node_modules outward, the way Node
 * itself would, rather than by resolving Pi's entry: its `exports` map offers
 * no CommonJS condition, so an ordinary require cannot name it. From there a
 * require resolves pi-tui, which publishes no `exports` map at all.
 */
function resolvePinnedPiTui(packageRoot) {
  let directory = packageRoot;
  while (true) {
    const candidate = join(directory, "node_modules", "@earendil-works", "pi-coding-agent");
    if (existsSync(join(candidate, "package.json"))) {
      return canonical(createRequire(pathToFileURL(join(candidate, "package.json")).href).resolve("@earendil-works/pi-tui"));
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error("pinned Pi is not installed beneath this package root");
    directory = parent;
  }
}

function canonical(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/**
 * Report whether A1 and pinned Pi resolve pi-tui to the same file.
 * Returns a discriminated outcome; never throws.
 */
export function inspectPiTuiModuleIdentity(packageRoot) {
  let own;
  let pinned;
  try {
    own = resolveOwnPiTui(packageRoot);
  } catch (error) {
    return { kind: "unresolved", side: "a1", message: message(error) };
  }
  try {
    pinned = resolvePinnedPiTui(packageRoot);
  } catch (error) {
    return { kind: "unresolved", side: "pi", message: message(error) };
  }
  return own === pinned ? { kind: "unified", path: own } : { kind: "split", own, pinned };
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

/** Launch-entry wrapper: warn on stderr when the two sides disagree. */
export function assertSinglePiTuiModuleAtLaunch(packageRoot, warn) {
  const outcome = inspectPiTuiModuleIdentity(packageRoot);
  if (outcome.kind === "split") {
    warn(`a1: pi-tui resolves to two different copies (${outcome.own} for a1, ${outcome.pinned} for Pi); extension UI may not render. The #pi-tui alias in a1's package.json no longer names Pi's copy.\n`);
  } else if (outcome.kind === "unresolved") {
    warn(`a1: could not resolve pi-tui from ${outcome.side === "a1" ? "a1" : "pinned Pi"} (${outcome.message}); extension UI may not render.\n`);
  }
}

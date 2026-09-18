/**
 * One pi-tui module identity per process: the check that the resolver hook worked.
 *
 * bin/module-resolver.js decides identity at the loader by rewriting every pi-tui module
 * URL to the copy pinned Pi resolves. What remains here is the assertion, made by asking
 * Node itself: with the hook installed, resolving `@earendil-works/pi-tui` from A1's own
 * package root must answer with the same real path pinned Pi answers with. When it does not,
 * launch says so loudly and once, instead of leaving a user to discover it as missing
 * extension UI.
 *
 * This lives in bin/ (shipped, plain JS) because it inspects dependency resolution, which
 * the Pi API boundary policy rightly forbids ordinary production code from touching.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { pinnedPiTuiPackageRoot } from "./module-resolver.js";

/** What A1's own modules resolve `@earendil-works/pi-tui` to, as a real path. */
function resolveOwnPiTui(packageRoot) {
  const requireFromRoot = createRequire(pathToFileURL(join(packageRoot, "package.json")).href);
  return canonical(requireFromRoot.resolve("@earendil-works/pi-tui"));
}

/** What pinned Pi resolves `@earendil-works/pi-tui` to, as a real path. */
export function resolvePinnedPiTui(packageRoot) {
  return canonical(join(pinnedPiTuiPackageRoot(packageRoot), "dist", "index.js"));
}

export function configurePinnedPiPublicPackage(packageRoot, environment = process.env) {
  const pinnedRoot = resolvePinnedPiRoot(packageRoot);
  const manifest = JSON.parse(readFileSync(join(pinnedRoot, "package.json"), "utf8"));
  if (manifest.name !== "@earendil-works/pi-coding-agent" || typeof manifest.version !== "string") {
    throw new Error("pinned Pi public package identity is invalid");
  }
  environment.PI_PACKAGE_DIR = pinnedRoot;
  return { root: pinnedRoot, version: manifest.version };
}

function resolvePinnedPiRoot(packageRoot) {
  let directory = packageRoot;
  while (true) {
    const candidate = join(directory, "node_modules", "@earendil-works", "pi-coding-agent");
    if (existsSync(join(candidate, "package.json"))) return canonical(candidate);
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
 * Compare what A1 and pinned Pi resolve. With the resolver hook installed in this process the
 * two agree whatever layout npm built; without it they agree only when npm hoisted one copy.
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

/** A release copy is launchable when pinned Pi inside it resolves its terminal package. */
export function releaseCopyIsLaunchable(releaseRoot) {
  try {
    resolvePinnedPiTui(releaseRoot);
    return true;
  } catch {
    return false;
  }
}

export function assertSinglePiTuiModuleAtLaunch(packageRoot, warn) {
  const outcome = inspectPiTuiModuleIdentity(packageRoot);
  if (outcome.kind === "split") {
    warn(`a1: pi-tui resolves to two different copies (${outcome.own} for a1, ${outcome.pinned} for Pi); extension UI may not render. The pinned pi-tui resolver hook is not active in this process.\n`);
  } else if (outcome.kind === "unresolved") {
    warn(`a1: could not resolve pi-tui from ${outcome.side === "a1" ? "a1" : "pinned Pi"} (${outcome.message}); extension UI may not render.\n`);
  }
}

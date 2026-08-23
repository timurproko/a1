/**
 * One pi-tui module identity per process.
 *
 * npm can materialize @earendil-works/pi-tui twice under A1's package root:
 * once as A1's direct dependency at the node_modules root, and once nested
 * inside @earendil-works/pi-coding-agent's isolated dependency tree. A1's
 * owned UI imports the root copy while pinned Pi's extension loader hands
 * extensions the nested copy, so every TUI class exists twice: `instanceof`
 * checks and prototype patches made by extensions land on classes the
 * renderer never uses — extension chrome silently disappears and routed
 * input dead-ends.
 *
 * Repair runs at launch, not at install: npm's `prepare` hook is skipped for
 * registry installs, so an installed A1 must self-heal the same way a source
 * checkout does. The root copy is replaced with a junction (Windows) or
 * directory symlink to the nested copy so every loader resolves the same
 * files and therefore the same module instances.
 *
 * This lives in bin/ (shipped, plain JS) rather than src/ deliberately: its
 * whole job is repairing the node_modules layout, which the Pi API boundary
 * policy rightly forbids ordinary production code from touching.
 *
 * The repair is idempotent and fail-open: a hoisted tree (single copy), an
 * already-linked root, a version mismatch, or a filesystem that refuses the
 * link all leave the tree as it was — launch proceeds with a warning rather
 * than failing, because a degraded UI beats no UI.
 */
import { existsSync, lstatSync, readFileSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

function packageVersion(directory) {
  return JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version;
}

/**
 * Collapse a duplicated @earendil-works/pi-tui under `packageRoot` onto the
 * copy pinned Pi resolves, so extensions and the owned UI share one module
 * instance. Must run before anything in the process imports pi-tui.
 * Returns a discriminated outcome; never throws.
 */
export function ensureSinglePiTuiModule(packageRoot) {
  const rootCopy = join(packageRoot, "node_modules", "@earendil-works", "pi-tui");
  const nestedCopy = join(
    packageRoot,
    "node_modules", "@earendil-works", "pi-coding-agent",
    "node_modules", "@earendil-works", "pi-tui",
  );
  try {
    if (!existsSync(nestedCopy)) return { kind: "single-copy" };
    if (existsSync(rootCopy) && lstatSync(rootCopy).isSymbolicLink()) return { kind: "already-linked" };
    if (existsSync(rootCopy)) {
      const rootVersion = packageVersion(rootCopy);
      const nestedVersion = packageVersion(nestedCopy);
      if (rootVersion !== nestedVersion) return { kind: "version-mismatch", rootVersion, nestedVersion };
      const retired = `${rootCopy}.duplicate`;
      rmSync(retired, { recursive: true, force: true });
      renameSync(rootCopy, retired);
      rmSync(retired, { recursive: true, force: true });
    }
    symlinkSync(nestedCopy, rootCopy, "junction");
    return { kind: "linked" };
  } catch (error) {
    return { kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Launch-entry wrapper: repair, and warn on stderr when the tree stays split. */
export function ensureSinglePiTuiModuleAtLaunch(packageRoot, warn) {
  const outcome = ensureSinglePiTuiModule(packageRoot);
  if (outcome.kind === "version-mismatch") {
    warn(`a1: pi-tui is duplicated at incompatible versions (${outcome.rootVersion} vs ${outcome.nestedVersion}); extension UI may not render.\n`);
  } else if (outcome.kind === "failed") {
    warn(`a1: could not unify the duplicated pi-tui module (${outcome.message}); extension UI may not render.\n`);
  }
}

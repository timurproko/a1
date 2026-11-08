import { isAbsolute, relative, resolve, sep } from "node:path";

/** Whether two paths name the same location; Windows paths compare without case. */
export function samePath(left: string, right: string): boolean {
  const canonicalLeft = resolve(left);
  const canonicalRight = resolve(right);
  return process.platform === "win32"
    ? canonicalLeft.toLowerCase() === canonicalRight.toLowerCase()
    : canonicalLeft === canonicalRight;
}

/**
 * Whether `child` is exactly one non-empty segment below `parent`.
 * Invariant: release storage operations act only on such paths, never on the root itself, another drive, a nested descendant,
 * or anything reached through `..`. `path.relative` already ignores case on Windows.
 */
export function isDirectChild(parent: string, child: string): boolean {
  const fromParent = relative(resolve(parent), resolve(child));
  return fromParent.length > 0
    && fromParent !== ".."
    && !fromParent.startsWith(`..${sep}`)
    && !isAbsolute(fromParent)
    && !fromParent.includes(sep);
}

/** The message of a thrown value, whatever was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

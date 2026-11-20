import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

/** The repository's committed statement of the commands A1 runs for its task checkouts. */
export const WORKTREE_DECLARATION = ".a1/worktree.json";
const MAX_DECLARATION_BYTES = 16 * 1024;

export type DeclaredWorktreeCommand = "cleanup" | "start";

/**
 * One declared command as an argument list. Null when the repository declares none, including a
 * file that declares only the other command; "invalid" when the entry cannot be run as written.
 *
 * Security: callers pass the verified primary checkout, never a task checkout, so the command is
 * the repository's committed declaration and not a file a task could have changed.
 */
export async function readDeclaredWorktreeCommand(
  primaryRoot: string,
  name: DeclaredWorktreeCommand,
): Promise<readonly string[] | "invalid" | null> {
  const path = join(primaryRoot, WORKTREE_DECLARATION);
  const metadata = await lstat(path).catch(error => { if (isRecord(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) return null; throw error; });
  if (metadata === null) return null;
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_DECLARATION_BYTES) return "invalid";
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isRecord(value)) return "invalid";
    const command = value[name];
    if (command === undefined) return null;
    return Array.isArray(command) && command.length > 0 && command.length <= 64
      && command.every(part => typeof part === "string" && part.length > 0 && part.length <= 2_048 && !part.includes("\0"))
      // Compatibility: the element check above establishes the string array.
      ? command as readonly string[] : "invalid";
  } catch {
    return "invalid";
  }
}

/**
 * Fill `{name}` placeholders. A placeholder with no value is reported, never replaced by an empty
 * argument, because a command run with a silently missing argument does something else.
 */
export function fillDeclaredWorktreeCommand(
  declared: readonly string[],
  values: Readonly<Record<string, string | undefined>>,
): { readonly command: readonly string[]; readonly missing: readonly string[] } {
  const missing = new Set<string>();
  const command = declared.map(part => part.replace(/\{([a-z]+)\}/gu, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) missing.add(name);
    return value ?? "";
  }));
  return { command, missing: [...missing] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

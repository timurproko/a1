import { lstat, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const PI_PROFILE_RESOURCE_DIRECTORIES = Object.freeze([
  "extensions",
  "skills",
  "prompts",
  "themes",
] as const);

export interface InitializedProfile {
  readonly root: string;
  readonly directories: readonly string[];
}

export async function initializeProductProfile(root: string): Promise<InitializedProfile> {
  const normalizedRoot = resolve(root);
  await ensureSafeDirectoryChain(normalizedRoot);
  const directories: string[] = [];
  for (const name of PI_PROFILE_RESOURCE_DIRECTORIES) {
    const path = resolve(normalizedRoot, name);
    await ensureOwnedDirectory(path);
    directories.push(path);
  }
  return Object.freeze({ root: normalizedRoot, directories: Object.freeze(directories) });
}

async function ensureSafeDirectoryChain(root: string): Promise<void> {
  const missing: string[] = [];
  let current = root;
  while (true) {
    const metadata = await lstat(current).catch(error => {
      if (isMissing(error)) return null;
      throw error;
    });
    if (metadata) {
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`profile path is not an owned directory: ${current}`);
      break;
    }
    missing.push(current);
    const parent = dirname(current);
    if (parent === current) throw new Error(`profile path has no existing directory ancestor: ${root}`);
    current = parent;
  }
  for (const path of missing.reverse()) await createOwnedDirectory(path, "profile path");
}

async function ensureOwnedDirectory(path: string): Promise<void> {
  const metadata = await lstat(path).catch(error => {
    if (isMissing(error)) return null;
    throw error;
  });
  if (metadata) {
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`profile resource path is not an owned directory: ${path}`);
    return;
  }
  await createOwnedDirectory(path, "profile resource path");
}

/**
 * Creates a directory, treating "it already exists" as another launch having won
 * the race rather than as a failure — but still refusing what it finds if that is
 * not an owned directory.
 */
async function createOwnedDirectory(path: string, subject: string): Promise<void> {
  try {
    await mkdir(path, { mode: 0o700 });
    return;
  } catch (error) {
    if (!isAlreadyThere(error)) throw error;
  }
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`${subject} is not an owned directory: ${path}`);
}

function isAlreadyThere(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "EEXIST";
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

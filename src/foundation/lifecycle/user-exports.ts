import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

/** Persistent user-owned exports; development data/config overrides never relocate user files. */
function resolveUserExportsDirectory(home = process.env[PRODUCT_IDENTITY.environment.profileHome] ?? homedir()): string {
  if (!isAbsolute(home) || home.includes("\0")) throw new TypeError("User export home must be absolute");
  return resolve(home, dirname(PRODUCT_IDENTITY.state.piAgentProfile), "exports");
}

/** Exclusively reserve a default export; failure cleanup may remove only this same regular file. */
export async function reserveUserExport(sessionId: string, format: "html" | "jsonl", home?: string): Promise<{
  readonly path: string;
  failed(): Promise<void>;
}> {
  const directory = resolveUserExportsDirectory(home);
  const parent = dirname(directory);
  await mkdir(parent, { recursive: true });
  if (!(await lstat(parent)).isDirectory()) throw new Error("User export directory must not traverse a link");
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) throw new Error("User export directory must not traverse a link");
  const id = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "session";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(directory, `${PRODUCT_IDENTITY.filesystem.slug}-session-${stamp}-${id}-${randomUUID()}.${format}`);
  const file = await open(path, "wx", 0o600);
  const identity = await file.stat();
  await file.close();
  return {
    path,
    async failed() {
      const current = await lstat(path).catch(error => { if (error.code !== "ENOENT") throw error; });
      if (current?.isFile() && current.dev === identity.dev && current.ino === identity.ino) await unlink(path);
    },
  };
}

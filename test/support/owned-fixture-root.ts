import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Hermetic test storage on the owning checkout's volume, not a caller's redirected/profile TEMP. */
export async function ownedFixtureRoot(prefix: string): Promise<string> {
  if (!/^[a-z0-9-]+$/u.test(prefix)) throw new Error("invalid fixture prefix");
  const parent = fileURLToPath(new URL("../../.artifacts/test/", import.meta.url));
  await mkdir(parent, { recursive: true });
  return mkdtemp(join(parent, prefix));
}

/** Only the isolated child sees these overrides; ordinary runtime/session environment is unchanged. */
export function fixtureEnvironment(directory: string): NodeJS.ProcessEnv {
  return { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory };
}

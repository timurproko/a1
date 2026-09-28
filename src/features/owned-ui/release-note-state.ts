import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import semver from "semver";

const STATE_VERSION = 1;
const MAX_STATE_BYTES = 4096;
const CLAIM_MAX_AGE_MS = 60 * 60_000;
const PROFILE = /^[a-z][a-z0-9-]{0,63}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

export interface ReleaseNoteClaim {
  readonly version: string;
  acknowledge(): Promise<void>;
  release(): Promise<void>;
}

export interface ReleaseNoteStateOptions {
  readonly configDir: string;
  readonly profileId: string;
  readonly version: string;
  readonly now?: () => number;
}

/** Claims one stable note across concurrent sessions and acknowledges it only after presentation closes. */
export async function claimReleaseNote(options: ReleaseNoteStateOptions): Promise<ReleaseNoteClaim | null> {
  if (!PROFILE.test(options.profileId)) throw new Error("release-note profile is invalid");
  if (!STABLE.test(options.version) || semver.valid(options.version) !== options.version) return null;
  const directory = resolve(options.configDir, "release-notes");
  const statePath = join(directory, `${options.profileId}.json`);
  const claimPath = join(directory, `${options.profileId}.claim.json`);
  const acknowledged = await readAcknowledged(statePath);
  if (acknowledged !== null && semver.gte(acknowledged, options.version)) return null;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const now = options.now ?? Date.now;
  const token = randomUUID();
  const claim = { version: STATE_VERSION, token, release: options.version, claimedAt: now() };
  if (!await createClaim(claimPath, claim)) {
    if (!await staleClaim(claimPath, now())) return null;
    await rm(claimPath, { force: true });
    if (!await createClaim(claimPath, claim)) return null;
  }
  let settled = false;
  const ownsClaim = async (): Promise<boolean> => {
    try {
      const current = await boundedJson(claimPath) as { token?: unknown };
      return current.token === token;
    } catch { return false; }
  };
  const release = async (): Promise<void> => {
    if (settled) return;
    settled = true;
    if (await ownsClaim()) await rm(claimPath, { force: true });
  };
  return Object.freeze({
    version: options.version,
    acknowledge: async () => {
      if (settled || !await ownsClaim()) return;
      const prior = await readAcknowledged(statePath);
      const version = prior !== null && semver.gt(prior, options.version) ? prior : options.version;
      const temporary = `${statePath}.${process.pid}.${token}.tmp`;
      await writeFile(temporary, `${JSON.stringify({ version: STATE_VERSION, acknowledged: version }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, statePath);
      settled = true;
      await rm(claimPath, { force: true });
    },
    release,
  });
}

async function readAcknowledged(path: string): Promise<string | null> {
  try {
    const value = await boundedJson(path) as { version?: unknown; acknowledged?: unknown };
    if (value.version !== STATE_VERSION || typeof value.acknowledged !== "string"
      || !STABLE.test(value.acknowledged) || semver.valid(value.acknowledged) !== value.acknowledged) return null;
    return value.acknowledged;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "ENOENT" ? null : null;
  }
}

async function boundedJson(path: string): Promise<unknown> {
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_STATE_BYTES) throw new Error("release-note state is invalid");
  return JSON.parse(await readFile(path, "utf8"));
}

async function createClaim(path: string, value: object): Promise<boolean> {
  try {
    const handle = await open(path, "wx", 0o600);
    try { await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8"); } finally { await handle.close(); }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return false;
    throw error;
  }
}

async function staleClaim(path: string, now: number): Promise<boolean> {
  try {
    const value = await boundedJson(path) as { claimedAt?: unknown };
    return typeof value.claimedAt !== "number" || !Number.isFinite(value.claimedAt) || now - value.claimedAt > CLAIM_MAX_AGE_MS;
  } catch { return true; }
}

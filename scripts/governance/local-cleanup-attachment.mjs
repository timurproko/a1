import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const CLAIM_SCHEMA = "a1-session-worktree-claim-v1";
const MAX_RECORD_BYTES = 16 * 1024;
const absent = error => error?.code === "ENOENT" || error?.code === "ENOTDIR";
const key = value => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);

/** The product's editing-claim store, resolved the way the product resolves its data directory; no installation is required. */
async function claimStore(environment) {
  const identity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));
  const home = environment.HOME ?? environment.USERPROFILE ?? homedir();
  const dataDir = environment[identity.environment.dataDir] ?? (process.platform === "win32"
    ? join(environment.LOCALAPPDATA ?? home, identity.state.windowsControlDirectory)
    : join(environment.XDG_DATA_HOME ?? join(home, ".local", "share"), identity.state.unixControlDirectory));
  return join(resolve(dataDir), identity.state.sessionWorktreeClaimDirectory, "worktrees");
}

function processAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code === "EPERM"; }
}

/**
 * Report a blocker when a running product session still has this exact checkout attached.
 * Reads one claim record and never modifies it; an absent checkout, store, or claim blocks nothing.
 */
export async function inspectSessionAttachment(path, { environment = process.env, alive = processAlive, store } = {}) {
  let gitDir, commonDir;
  try {
    const pointer = (await readFile(join(path, ".git"), "utf8")).trim();
    if (!pointer.startsWith("gitdir: ")) return null;
    gitDir = await realpath(resolve(path, pointer.slice("gitdir: ".length)));
    commonDir = await realpath(resolve(gitDir, (await readFile(join(gitDir, "commondir"), "utf8")).trim()));
  } catch (error) {
    // Rationale: a checkout without its Git pointer cannot be attached; the product releases such an attachment itself.
    if (absent(error) || error?.code === "EISDIR") return null;
    return { reason: "attached-session-unverifiable" };
  }
  const name = `${createHash("sha256").update(`${key(commonDir)}\0${key(gitDir)}`).digest("hex")}.json`;
  try {
    const record = join(store ?? await claimStore(environment), name);
    const metadata = await lstat(record);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0 || metadata.size > MAX_RECORD_BYTES) return { reason: "attached-session-unverifiable" };
    const claim = JSON.parse(await readFile(record, "utf8"));
    if (claim?.schema !== CLAIM_SCHEMA || !Number.isSafeInteger(claim.pid) || claim.pid <= 0
      || typeof claim.worktreeGitDir !== "string" || key(claim.worktreeGitDir) !== key(gitDir)) return { reason: "attached-session-unverifiable" };
    return alive(claim.pid) ? { reason: "attached-session" } : null;
  } catch (error) {
    return absent(error) ? null : { reason: "attached-session-unverifiable" };
  }
}

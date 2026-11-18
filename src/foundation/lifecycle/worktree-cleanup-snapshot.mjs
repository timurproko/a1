import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, join } from "node:path";

const key = value => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
const fingerprint = stat => {
  if (stat.ino === 0n || stat.birthtimeNs <= 0n) throw failure();
  return `${stat.dev}:${stat.ino}:${stat.birthtimeNs}`;
};
const failure = () => Object.assign(new Error("the approved checkout snapshot changed; files were retained"), { code: "worktree-cleanup-snapshot-changed", cleanupCode: "worktree-cleanup-snapshot-changed" });
async function regular(path, limit = 4 * 1024 * 1024) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) throw failure();
  return readFile(path, "utf8");
}
async function commit(commonDir, gitDir) {
  const raw = (await regular(join(gitDir, "HEAD"), 4096)).trim();
  if (/^[a-f0-9]{40}$/u.test(raw)) return { head: raw, ref: "HEAD" };
  const ref = raw.startsWith("ref: ") ? raw.slice(5) : "";
  if (!/^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(ref) || ref.includes("..") || ref.endsWith("/")) throw failure();
  let head;
  try { head = (await regular(join(commonDir, ref), 4096)).trim(); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const matches = (await regular(join(commonDir, "packed-refs"))).split(/\r?\n/u).filter(line => line.endsWith(` ${ref}`));
    if (matches.length !== 1) throw failure();
    head = matches[0].split(" ")[0];
  }
  if (!/^[a-f0-9]{40}$/u.test(head)) throw failure();
  return { head, ref };
}

/** Read Git's loose/packed HEAD and physical generations directly, without starting extra Git children on every attachment. */
export async function captureWorktreeCleanupSnapshot(path) {
  const root = await realpath(path), pointer = join(root, ".git");
  const rootStat = await lstat(root, { bigint: true }), pointerStat = await lstat(pointer, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !pointerStat.isFile() || pointerStat.isSymbolicLink()) throw failure();
  const pointerBytes = await regular(pointer, 4096);
  if (!/^gitdir: [^\r\n]+\r?\n?$/u.test(pointerBytes)) throw failure();
  const gitDir = await realpath(resolve(root, pointerBytes.trim().slice(8)));
  const commonDir = await realpath(resolve(gitDir, (await regular(join(gitDir, "commondir"), 4096)).trim()));
  if (key(await realpath((await regular(join(gitDir, "gitdir"), 4096)).trim())) !== key(pointer)) throw failure();
  const admin = fingerprint(await lstat(gitDir, { bigint: true })), first = await commit(commonDir, gitDir);
  const snapshot = { version: 1, path: root, commonDir, gitDir, ...first, filesystem: fingerprint(rootStat), pointer: fingerprint(pointerStat), admin, pointerBytes };
  if (fingerprint(await lstat(root, { bigint: true })) !== snapshot.filesystem || fingerprint(await lstat(pointer, { bigint: true })) !== snapshot.pointer
    || fingerprint(await lstat(gitDir, { bigint: true })) !== admin || await regular(pointer, 4096) !== pointerBytes
    || JSON.stringify(await commit(commonDir, gitDir)) !== JSON.stringify(first)) throw failure();
  return snapshot;
}

/** Reject legacy, incomplete or altered approval snapshots; a path/branch name is never a physical identity. */
export function assertWorktreeCleanupSnapshot(expected, actual) {
  const fields = ["version", "path", "commonDir", "gitDir", "head", "ref", "filesystem", "pointer", "admin", "pointerBytes"];
  if (expected?.version !== 1 || fields.some(field => expected[field] === undefined || expected[field] !== actual?.[field])) throw failure();
}

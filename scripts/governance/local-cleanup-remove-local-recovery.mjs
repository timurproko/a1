import { lstat, readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { exists, inspectResidue, retireRegistration } from "./local-cleanup-git.mjs";
import { fail } from "./local-cleanup-state.mjs";

const fingerprint = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
const key = path => process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);

/** Recover only the journaled checkout. Residual user-tree removal uses individual unlink/rmdir, never recursive fallback. */
export async function repairPublishedRemoval(identity, entry, { git, cwd, deadline, now, inspect, preflight, remove, purge }) {
  const residue = await inspectResidue(identity, entry, { git, cwd, deadline, now, inspect });
  if (!residue.clean) return residue;
  if (residue.shape === "worktree") {
    const content = await preflight(identity, entry, { inspect, git, cwd, deadline, now, preserveKeep: true });
    if (!content.clean) return content;
    await purge(entry, { deadline, now, containedLinks: content.containedLinks });
    const fresh = await preflight(identity, entry, { inspect, git, cwd, deadline, now, preserveKeep: true });
    if (!fresh.clean) return fresh;
    await remove(identity, entry, git);
    return { clean: true, step: "worktree-removed" };
  }
  if (residue.shape === "residue") {
    const assertRoot = async () => {
      if (now() >= deadline) fail("content-inspection-budget");
      const stat = await lstat(entry.path);
      if (!stat.isDirectory() || stat.isSymbolicLink() || fingerprint(stat) !== entry.filesystem || await exists(join(entry.path, ".git"))) fail("residual-or-reused-path");
    };
    await assertRoot();
    const content = await preflight(identity, entry, { inspect: async () => residue, git, cwd, deadline, now });
    if (!content.clean) return content;
    const tracked = new Map((await git(identity.primary, ["ls-tree", "-r", "-z", entry.head])).split("\0").filter(Boolean).map(line => {
      const tab = line.indexOf("\t"); const [mode, type, sha] = line.slice(0, tab).split(" ");
      return [line.slice(tab + 1), { mode, type, sha }];
    }));
    const files = [], directories = [];
    async function walk(path) {
      await assertRoot();
      for (const item of await readdir(path, { withFileTypes: true })) {
        if (files.length + directories.length >= 20_000) fail("content-inspection-budget");
        const full = join(path, item.name), name = relative(entry.path, full).replaceAll("\\", "/");
        if (item.name === ".git" || item.name === "KEEP" || item.isSymbolicLink()) fail("residual-content", { paths: [name] });
        if (item.isDirectory()) { directories.push({ path: full, filesystem: fingerprint(await lstat(full)) }); await walk(full); }
        else if (item.isFile() && tracked.get(name)?.type === "blob" && tracked.get(name)?.mode !== "120000") {
          files.push({ path: full, sha: tracked.get(name).sha, filesystem: fingerprint(await lstat(full)) });
        } else fail("residual-content", { paths: [name] });
      }
    }
    await walk(entry.path);
    const assertParents = async path => {
      await assertRoot();
      let parent = dirname(path);
      while (key(parent) !== key(entry.path)) {
        const recorded = directories.find(item => item.path === parent), stat = await lstat(parent);
        if (!recorded || !stat.isDirectory() || stat.isSymbolicLink() || fingerprint(stat) !== recorded.filesystem) fail("residual-or-reused-path");
        parent = dirname(parent);
      }
    };
    for (const file of files) {
      await assertParents(file.path);
      const stat = await lstat(file.path);
      if (!stat.isFile() || stat.isSymbolicLink() || fingerprint(stat) !== file.filesystem
        || (await git(identity.primary, ["hash-object", file.path])).trim() !== file.sha) fail("residual-content");
      await unlink(file.path);
    }
    for (const directory of directories.reverse()) {
      await assertParents(directory.path);
      const stat = await lstat(directory.path);
      if (!stat.isDirectory() || stat.isSymbolicLink() || fingerprint(stat) !== directory.filesystem) fail("residual-or-reused-path");
      await rmdir(directory.path);
    }
    await assertRoot(); await rmdir(entry.path);
  }
  await retireRegistration(identity, entry, git, { deadline, now });
  return { clean: true, step: residue.shape === "residue" ? "residue-removed" : "worktree-already-absent" };
}

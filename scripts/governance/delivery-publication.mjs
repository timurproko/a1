import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { captureWorktree, gitRunner } from "./local-cleanup-git.mjs";
import { parseImplementation } from "./openspec-archive-policy.mjs";
import { readDeliveryAdapter } from "./delivery-contract.mjs";

/** Read the live named remote twice around a fetch; tracking refs or a clean index are not publication proof. */
export async function inspectPublication(identity, entry, { git = gitRunner() } = {}) {
  const result = { localHead: entry.head, remoteHead: null, publicationVerified: false, relation: "unverified" };
  if (!entry.ref?.startsWith("refs/heads/")) return { ...result, reason: "publication-branch-required" };
  const readRemote = async () => {
    const lines = (await git(identity.primary, ["ls-remote", "--heads", identity.remote, entry.ref])).trim().split(/\r?\n/u).filter(Boolean);
    if (lines.length !== 1) return null;
    const [sha, ref] = lines[0].split(/\s+/u);
    return /^[a-f0-9]{40}$/u.test(sha) && ref === entry.ref ? sha : null;
  };
  try {
    const remoteHead = await readRemote();
    if (remoteHead === null) return { ...result, reason: "publication-remote-absent" };
    result.remoteHead = remoteHead;
    await git(identity.primary, ["fetch", "--no-tags", "--no-write-fetch-head", identity.remote, remoteHead]);
    if (await readRemote() !== remoteHead) return { ...result, reason: "publication-remote-changed" };
    try { await git(identity.primary, ["merge-base", "--is-ancestor", entry.head, remoteHead]); }
    catch (error) {
      if (error.code === 1) return { ...result, relation: "unpublished-or-diverged", reason: "publication-not-contained" };
      throw error;
    }
    return { ...result, publicationVerified: true, relation: entry.head === remoteHead ? "equal" : "remote-descendant" };
  } catch { return { ...result, reason: "publication-evidence-unavailable" }; }
}

/** Portable review handoff; this operation never registers/releases cleanup ownership or infers acceptance. */
export async function inspectDeliveryHandoff({ identity, path, branch, change, pr, unfinished = [], checks = [], readRemotePlanning = defaultRemotePlanning, git = gitRunner() }) {
  const adapter = await readDeliveryAdapter();
  if (identity.repository !== adapter.repository || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(change ?? "") || !Number.isSafeInteger(pr) || pr < 1) throw new Error("handoff-identity");
  if (path === undefined) {
    if (typeof branch !== "string" || !branch.includes("/")) throw new Error("handoff-remote-publication-required");
    const snapshot = await readRemotePlanning(identity.repository, pr, branch);
    if (snapshot.pr.head?.repo?.full_name !== identity.repository || snapshot.pr.head?.ref !== branch
      || snapshot.pr.base?.repo?.full_name !== identity.repository || snapshot.pr.base?.ref !== adapter.baseBranch
      || snapshot.pr.state !== "open" || snapshot.pr.head.sha !== snapshot.refHead
      || !/^[a-f0-9]{40}$/u.test(snapshot.refHead) || parseImplementation(snapshot.pr.body)?.change !== change) throw new Error("handoff-remote-identity");
    return { repository: identity.repository, branch, change, pr, localHead: null, remoteHead: snapshot.refHead,
      publicationVerified: true, unfinished, checks };
  }
  const entry = await captureWorktree(identity, path, git);
  if (branch !== undefined && entry.ref !== `refs/heads/${branch}`) throw new Error("handoff-branch-mismatch");
  const publication = await inspectPublication(identity, entry, { git });
  const status = await git(entry.path, ["status", "--porcelain", "--untracked-files=all"]);
  const after = await captureWorktree(identity, path, git);
  const stable = after.head === entry.head && after.ref === entry.ref && after.filesystem === entry.filesystem;
  const published = stable && publication.publicationVerified && status.trim() === "";
  return { repository: identity.repository, branch: entry.ref?.slice("refs/heads/".length) ?? null, change, pr, path: entry.path,
    localHead: entry.head, remoteHead: publication.remoteHead, publicationVerified: published,
    unpublishedWork: !published, ...(published ? {} : { reason: !stable ? "handoff-context-changed" : status.trim() ? "handoff-local-edits" : publication.reason }),
    unfinished, checks };
}

async function defaultRemotePlanning(repository, pr, branch) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "")) throw new Error("handoff-repository");
  const read = async path => JSON.parse((await promisify(execFile)("gh", ["api", path], { timeout: 15_000, maxBuffer: 1024 * 1024 })).stdout);
  const pull = await read(`repos/${repository}/pulls/${pr}`);
  const ref = await read(`repos/${repository}/git/ref/heads/${encodeURIComponent(branch)}`);
  return { pr: pull, refHead: ref.object.sha };
}

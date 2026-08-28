import { classifyMergedBranchCleanup, decideMergedBranchCleanup } from "./merged-branch-cleanup.mjs";

/**
 * Execute one exact-SHA reconciliation with a caller-provided GitHub requester.
 * This is shared by the close-event workflow and documentation auto-merge's
 * synchronous fallback because GITHUB_TOKEN-authored merges do not emit another
 * workflow run.
 */
export async function executeMergedBranchCleanup({ pull, repository, request }) {
  const eligibility = classifyMergedBranchCleanup(pull, repository);
  if (eligibility.disposition !== "eligible") return eligibility;

  const encoded = encodeURIComponent(eligibility.ref);
  const [gitRef, branch] = await Promise.all([
    request(`/repos/${repository}/git/ref/heads/${encoded}`, { expected: [200, 404] }),
    request(`/repos/${repository}/branches/${encoded}`, { expected: [200, 404] }),
  ]);
  let live;
  if (gitRef.status === 404 && branch.status === 404) live = { kind: "absent" };
  else if (gitRef.status === 404 || branch.status === 404) throw new Error(`inconsistent live metadata for ${eligibility.ref}`);
  else live = { kind: "present", sha: gitRef.body?.object?.sha, protected: branch.body?.protected };

  const decision = decideMergedBranchCleanup(eligibility, live);
  if (decision.disposition !== "delete") return decision;

  await request(`/repos/${repository}/git/refs/heads/${encoded}`, { method: "DELETE", expected: [204] });
  const verification = await request(`/repos/${repository}/git/ref/heads/${encoded}`, { expected: [200, 404] });
  if (verification.status !== 404) {
    return { ...decision, disposition: "failure", actualSha: verification.body?.object?.sha ?? null, reason: "ref still exists after deletion" };
  }
  return { ...decision, disposition: "deleted", actualSha: null };
}

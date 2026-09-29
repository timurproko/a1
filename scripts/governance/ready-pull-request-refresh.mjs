const FULL_SHA = /^[0-9a-f]{40}$/;
const TARGET = "develop";
const PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 10;

/**
 * Classify one freshly read pull request for base-branch refresh. Only an
 * open, non-draft pull request whose base and head both live in the governed
 * repository and whose base is `develop` may be updated.
 */
export function classifyRefreshCandidate(pull, repository) {
  const number = pull?.number;
  const headSha = pull?.head?.sha;
  const skip = reason => ({ disposition: "skipped", number, headSha, reason });
  const fail = reason => ({ disposition: "failed", number: Number.isSafeInteger(number) ? number : null, headSha: headSha ?? null, reason });
  if (!Number.isSafeInteger(number) || number < 1) return fail("malformed pull request number");
  if (pull.state !== "open") return skip("pull request is not open");
  if (typeof pull.draft !== "boolean") return fail("draft state is malformed");
  if (pull.draft) return skip("draft pull request");
  if (pull.base?.ref !== TARGET) return skip("base branch is not develop");
  if (pull.base?.repo?.full_name !== repository) return skip("base repository is not the governed repository");
  if (pull.head?.repo?.full_name !== repository) return skip("head repository is a fork or unavailable");
  if (typeof headSha !== "string" || !FULL_SHA.test(headSha)) return fail("head SHA is malformed or missing");
  return { disposition: "eligible", number, headSha };
}

/**
 * Decide whether an eligible head already contains the current target, using
 * a GitHub comparison of `target...head`.
 */
export function decideRefresh(eligibility, comparison, targetSha) {
  if (eligibility.disposition !== "eligible") return eligibility;
  const behindBy = comparison?.behind_by;
  if (!Number.isSafeInteger(behindBy) || behindBy < 0) {
    return { ...eligibility, disposition: "failed", targetSha, reason: "comparison response is malformed" };
  }
  if (behindBy === 0) return { ...eligibility, disposition: "current", targetSha };
  return { ...eligibility, disposition: "update", targetSha, behindBy };
}

/**
 * Interpret GitHub's update-branch response. Accepted updates, expected-head
 * races, already-current heads, and merge conflicts are bounded outcomes;
 * anything else is an operational failure.
 */
export function interpretBranchUpdate(decision, response) {
  if (response.status === 202) return { ...decision, disposition: "updated" };
  const message = typeof response.body?.message === "string" ? response.body.message : "";
  if (response.status === 422) {
    if (/expected head sha/i.test(message)) return { ...decision, disposition: "deferred", reason: "head changed after it was read" };
    if (/no new commits/i.test(message)) return { ...decision, disposition: "current" };
    if (/conflict/i.test(message)) return { ...decision, disposition: "blocked", reason: "merge conflict requires manual resolution" };
  }
  return { ...decision, disposition: "failed", reason: `update-branch returned ${response.status}: ${message.slice(0, 200) || "no message"}` };
}

/**
 * Reconcile every open pull request targeting `develop`. Each candidate is
 * re-read and compared against a freshly read target before an expected-head
 * update, so a stale decision can never replace a newer head. Per-candidate
 * failures are reported without stopping independent candidates; listing and
 * credential failures abort the pass.
 */
export async function refreshReadyPullRequests({ repository, request, maxPages = DEFAULT_MAX_PAGES }) {
  const prefix = `/repos/${repository}`;
  const numbers = [];
  for (let page = 1; ; page += 1) {
    if (page > maxPages) throw new Error(`open pull-request listing exceeded ${maxPages} pages`);
    const listing = await request(`${prefix}/pulls?state=open&base=${TARGET}&per_page=${PAGE_SIZE}&page=${page}`);
    if (!Array.isArray(listing.body)) throw new Error("open pull-request listing was not an array");
    for (const pull of listing.body) {
      if (!Number.isSafeInteger(pull?.number) || pull.number < 1) throw new Error("open pull-request listing contained a malformed number");
      if (!numbers.includes(pull.number)) numbers.push(pull.number);
    }
    if (listing.body.length < PAGE_SIZE) break;
  }

  const results = [];
  for (const number of numbers) {
    try {
      results.push(await refreshCandidate(number));
    } catch (error) {
      // Security: a rejected credential fails every later mutation the same way, so stop instead of retrying it per candidate.
      if (error?.status === 401 || error?.status === 403) throw error;
      results.push({ disposition: "failed", number, headSha: null, reason: String(error?.message ?? error).slice(0, 300) });
    }
  }
  return results;

  async function refreshCandidate(number) {
    const pull = (await request(`${prefix}/pulls/${number}`)).body;
    const eligibility = classifyRefreshCandidate(pull, repository);
    if (eligibility.disposition !== "eligible") return eligibility;
    if (eligibility.number !== number) return { ...eligibility, disposition: "failed", reason: "pull request identity changed while reading" };

    const targetSha = (await request(`${prefix}/git/ref/heads/${TARGET}`)).body?.object?.sha;
    if (typeof targetSha !== "string" || !FULL_SHA.test(targetSha)) return { ...eligibility, disposition: "failed", reason: "target ref is malformed" };
    const comparison = (await request(`${prefix}/compare/${targetSha}...${eligibility.headSha}?per_page=1`)).body;
    const decision = decideRefresh(eligibility, comparison, targetSha);
    if (decision.disposition !== "update") return decision;

    // Concurrency: the expected head binds this decision to the exact SHA just compared; GitHub rejects it if the branch moved.
    const response = await request(`${prefix}/pulls/${number}/update-branch`, {
      method: "PUT", body: { expected_head_sha: decision.headSha }, expected: [202, 422],
    });
    return interpretBranchUpdate(decision, response);
  }
}

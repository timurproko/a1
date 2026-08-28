const FULL_SHA = /^[0-9a-f]{40}$/;
const NORMAL_REF = /^(?![./])(?!.*(?:\.\.|\/\.|\.\/|\/\/|@\{|\\|[~^:?*\[]))(?!.*[./]$)[A-Za-z0-9._/-]+$/;
const RESERVED_REFS = new Set(["develop", "master", "HEAD"]);
const RESERVED_PREFIXES = ["release/", "releases/", "refs/", "tags/"];

/**
 * Validate untrusted pull-request metadata before any branch API is called.
 * The live ref SHA and protection state are checked separately immediately
 * before deletion.
 */
export function classifyMergedBranchCleanup(pull, repository) {
  const number = pull?.number;
  const ref = pull?.head?.ref;
  const expectedSha = pull?.head?.sha;
  const base = pull?.base?.ref;
  const headRepository = pull?.head?.repo?.full_name;

  const refuse = reason => ({ disposition: "refused", number, ref, expectedSha, reason });
  if (!Number.isSafeInteger(number) || number < 1) return refuse("malformed pull request number");
  if (pull?.merged !== true || !pull?.merged_at) return refuse("pull request was closed without merge");
  if (base !== "develop") return refuse("base branch is not develop");
  if (headRepository !== repository) return refuse("head repository is not the governed repository");
  if (typeof ref !== "string" || !NORMAL_REF.test(ref)) return refuse("head ref is malformed");
  if (RESERVED_REFS.has(ref) || RESERVED_PREFIXES.some(prefix => ref.startsWith(prefix)) || /^v\d/.test(ref)) {
    return refuse("head ref is reserved or release-owned");
  }
  if (typeof expectedSha !== "string" || !FULL_SHA.test(expectedSha)) return refuse("head SHA is malformed or missing");
  return { disposition: "eligible", number, ref, expectedSha };
}

export function decideMergedBranchCleanup(eligibility, live) {
  if (eligibility.disposition !== "eligible") return eligibility;
  if (live.kind === "absent") return { ...eligibility, disposition: "already-absent", actualSha: null };
  if (live.kind !== "present" || typeof live.sha !== "string" || !FULL_SHA.test(live.sha)) {
    return { ...eligibility, disposition: "refused", actualSha: live.sha ?? null, reason: "live ref metadata is malformed" };
  }
  if (live.protected !== false) {
    return { ...eligibility, disposition: "refused", actualSha: live.sha, reason: "live branch is protected or protection is unknown" };
  }
  if (live.sha !== eligibility.expectedSha) {
    return { ...eligibility, disposition: "refused", actualSha: live.sha, reason: "live branch advanced after merge" };
  }
  return { ...eligibility, disposition: "delete", actualSha: live.sha };
}

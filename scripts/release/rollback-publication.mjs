import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SHA = /^[a-f0-9]{40}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Publish-job steps that contact npm; once either starts, the registry may hold the version. */
export const NPM_UPLOAD_STEPS = Object.freeze([
  "Publish the exact validated installer package",
  "Publish the exact validated application package",
]);

/** Whether any attempt of the publication run started an npm upload step. */
export function npmUploadStarted(jobs) {
  return jobs.some(job => (Array.isArray(job?.steps) ? job.steps : []).some(step => NPM_UPLOAD_STEPS.includes(step?.name)
    && step.status !== "queued" && step.conclusion !== "skipped"));
}

/**
 * Decides how a failed stable publication recovers. Before npm, the Release returns to draft
 * and the unconsumed tag at its bound source is deleted so the maintainer can publish again.
 * After npm may have been reached, both stay and recovery reruns the same run's failed jobs.
 */
export function planPublicationRollback(input) {
  const { version, release, tag, application, installer, jobs, jobsComplete } = input ?? {};
  if (typeof version !== "string" || !STABLE.test(version)) throw new Error("rollback version is invalid");
  if (!release || !Number.isSafeInteger(release.id) || release.tag_name !== `v${version}` || release.prerelease !== false
    || !SHA.test(release.target_commitish ?? "")) {
    throw new Error(`Release ${release?.id ?? "unknown"} is not the source-bound stable Release for v${version}`);
  }
  if (application || installer) {
    const present = [application && "application", installer && "installer"].filter(Boolean).join(" and ");
    return { action: "keep", reason: `npm already serves the ${present} package for ${version}; keep the Release and tag and rerun the failed jobs of this run` };
  }
  // Rationale: npm ingests a provenance-signed upload asynchronously, so an absent registry
  // version does not prove an upload that already started was rejected.
  if (!Array.isArray(jobs) || !jobsComplete || npmUploadStarted(jobs)) {
    return { action: "keep", reason: `an npm upload for ${version} may have started; confirm the registry, then rerun the failed jobs of this run` };
  }
  if (tag !== null && (tag?.object?.type !== "commit" || tag.object.sha !== release.target_commitish)) {
    throw new Error(`v${version} does not point at the bound source ${release.target_commitish}; refusing to delete or move it`);
  }
  return { action: "rollback", returnToDraft: release.draft === false, deleteTag: tag !== null,
    reason: `neither package reached npm; v${version} returns to an editable draft without its tag` };
}

async function main() {
  const { GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: runId, RELEASE_ID: releaseId, RELEASE_VERSION: version } = process.env;
  const github = async (token, path, init = {}) => {
    const response = await fetch(`https://api.github.com/${path}`, { ...init, headers: {
      accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", ...(init.headers ?? {}),
    } });
    if (init.allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API ${init.method ?? "GET"} ${path} returned HTTP ${response.status}`);
    return response.status === 204 ? null : await response.json();
  };
  const npm = async name => {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}?rollback=${Date.now()}`, {
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`npm registry ${name}@${version} returned HTTP ${response.status}`);
    return await response.json();
  };
  const token = process.env.GH_TOKEN;
  const application = JSON.parse(await readFile("package.json", "utf8")).name;
  const installer = JSON.parse(await readFile("packages/a1-install/package.json", "utf8")).name;
  const [release, tag, applicationVersion, installerVersion, runJobs] = await Promise.all([
    github(token, `repos/${repository}/releases/${releaseId}`),
    github(token, `repos/${repository}/git/ref/tags/v${version}`, { allowMissing: true }),
    npm(application), npm(installer),
    github(token, `repos/${repository}/actions/runs/${runId}/jobs?filter=all&per_page=100`),
  ]);
  const jobs = Array.isArray(runJobs?.jobs) ? runJobs.jobs : null;
  const plan = planPublicationRollback({ version, release, tag, application: applicationVersion, installer: installerVersion,
    jobs, jobsComplete: jobs !== null && runJobs.total_count === jobs.length });
  if (plan.action === "rollback") {
    // Invariant: the Release stops consuming the tag before the tag is deleted, and only
    // the release-automation App may bypass the tag ruleset's deletion rule.
    if (plan.returnToDraft) {
      await github(token, `repos/${repository}/releases/${release.id}`, { method: "PATCH", body: JSON.stringify({ draft: true }) });
    }
    if (plan.deleteTag) {
      await github(process.env.TAG_TOKEN, `repos/${repository}/git/refs/tags/v${version}`, { method: "DELETE" });
    }
  }
  const summary = `## v${version} publication ${plan.action === "rollback" ? "returned to draft" : "kept"}\n\n${plan.reason}.\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  process.stdout.write(summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

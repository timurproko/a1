import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/**
 * Decides whether a stable tag left behind by a deleted Release may be removed. The tag ruleset
 * blocks deletion for people, so only the release-automation App deletes it, and only while no
 * Release uses the tag and npm serves neither package: a published version's tag is permanent.
 */
export function planOrphanTagDeletion(input) {
  const { version, releases, releasesComplete, tag, application, installer } = input ?? {};
  if (typeof version !== "string" || !STABLE.test(version)) throw new Error(`tag cleanup version '${version}' is not a stable X.Y.Z version`);
  if (tag === null) return { action: "none", reason: `v${version} does not exist; nothing to delete` };
  if (tag?.object?.type !== "commit") throw new Error(`v${version} is not a lightweight tag of a commit; refusing to delete it`);
  if (!Array.isArray(releases) || !releasesComplete) {
    return { action: "keep", reason: `the Release list could not be read completely, so v${version} may still be in use` };
  }
  const user = releases.find(release => release?.tag_name === `v${version}`);
  if (user) return { action: "keep", reason: `Release ${user.id} (${user.draft ? "draft" : "published"}) still uses v${version}; delete that Release first` };
  if (application || installer) {
    const present = [application && "application", installer && "installer"].filter(Boolean).join(" and ");
    return { action: "keep", reason: `npm already serves the ${present} package for ${version}; a published version's tag is permanent` };
  }
  return { action: "delete", reason: `no Release uses v${version} and npm serves neither package, so the unconsumed tag at ${tag.object.sha} was deleted` };
}

async function main() {
  const { GITHUB_REPOSITORY: repository, RELEASE_VERSION: requested } = process.env;
  const version = String(requested ?? "").replace(/^v/u, "");
  const github = async (token, path, init = {}) => {
    const response = await fetch(`https://api.github.com/${path}`, { ...init, headers: {
      accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", ...(init.headers ?? {}),
    } });
    if (init.allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API ${init.method ?? "GET"} ${path} returned HTTP ${response.status}`);
    return response.status === 204 ? null : await response.json();
  };
  const npm = async name => {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}?cleanup=${Date.now()}`, {
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`npm registry ${name}@${version} returned HTTP ${response.status}`);
    return await response.json();
  };
  if (!STABLE.test(version)) throw new Error(`tag cleanup version '${requested}' is not a stable X.Y.Z version`);
  const token = process.env.GH_TOKEN;
  const application = JSON.parse(await readFile("package.json", "utf8")).name;
  const installer = JSON.parse(await readFile("packages/a1-install/package.json", "utf8")).name;
  const [releases, tag, applicationVersion, installerVersion] = await Promise.all([
    github(token, `repos/${repository}/releases?per_page=100`),
    github(token, `repos/${repository}/git/ref/tags/v${version}`, { allowMissing: true }),
    npm(application), npm(installer),
  ]);
  const plan = planOrphanTagDeletion({
    version, releases, releasesComplete: Array.isArray(releases) && releases.length < 100,
    tag, application: applicationVersion, installer: installerVersion,
  });
  // Invariant: only the release-automation App may bypass the tag ruleset's deletion rule.
  if (plan.action === "delete") await github(process.env.TAG_TOKEN, `repos/${repository}/git/refs/tags/v${version}`, { method: "DELETE" });
  const summary = `## v${version} tag ${plan.action === "delete" ? "deleted" : plan.action === "none" ? "absent" : "kept"}\n\n${plan.reason}.\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  process.stdout.write(summary);
  if (plan.action === "keep") throw new Error(plan.reason);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

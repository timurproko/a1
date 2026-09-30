import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** The first npm CLI that exchanges a GitHub OIDC identity for a publish token. */
export const MINIMUM_TRUSTED_PUBLISHING_NPM = "11.5.1";
export const NPM_PUBLISH_ENVIRONMENT = "npm-publish";
const REGISTRY = "https://registry.npmjs.org";
const AUDIENCE = "npm:registry.npmjs.org";

// Rationale: the publish job installs no dependencies, so the version comparison is local.
export function assertTrustedPublishingNpm(version) {
  const parsed = String(version).trim();
  const core = /^(\d+)\.(\d+)\.(\d+)$/u.exec(parsed)?.slice(1).map(Number);
  const minimum = MINIMUM_TRUSTED_PUBLISHING_NPM.split(".").map(Number);
  const difference = core?.map((part, index) => part - minimum[index]).find(delta => delta !== 0) ?? 0;
  if (core === undefined || difference < 0) {
    throw new Error(`npm ${String(version).trim()} cannot publish through trusted publishing; npm >= ${MINIMUM_TRUSTED_PUBLISHING_NPM} is required`);
  }
  return parsed;
}

/** Names the calling workflow file, which is what npm matches against its trusted publishers. */
export function callingWorkflow(workflowRef) {
  const match = /^([^/]+\/[^/]+)\/\.github\/workflows\/([^/@]+\.ya?ml)@/u.exec(workflowRef ?? "");
  if (match === null) throw new Error(`GITHUB_WORKFLOW_REF '${workflowRef ?? ""}' does not name a workflow file`);
  return { repository: match[1], file: match[2] };
}

/**
 * Performs the token exchange npm publish performs, for every package, before any upload.
 * Rationale: npm otherwise refuses only at the upload, and a refusal for the second package
 * would leave a half-published pair. The exchanged tokens are discarded, never printed.
 */
export async function proveTrustedPublishing({ packages, env, fetch }) {
  const workflow = callingWorkflow(env.GITHUB_WORKFLOW_REF);
  const registration = `register ${workflow.file} (repository ${workflow.repository}, environment ${NPM_PUBLISH_ENVIRONMENT}) as a trusted publisher`;
  if (!env.ACTIONS_ID_TOKEN_REQUEST_URL || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw new Error("this job has no GitHub OIDC identity; npm publication requires permission id-token: write");
  }
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", AUDIENCE);
  const identity = await fetch(url, { headers: { authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  const idToken = identity.ok ? (await identity.json())?.value : undefined;
  if (typeof idToken !== "string" || idToken.length === 0) throw new Error(`GitHub did not issue an OIDC token for ${AUDIENCE} (HTTP ${identity.status})`);
  const refused = [];
  for (const name of packages) {
    // Compatibility: the same escaped package name npm-package-arg gives the npm CLI.
    const escaped = name.replace("/", "%2f");
    const response = await fetch(`${REGISTRY}/-/npm/v1/oidc/token/exchange/package/${escaped}`, {
      method: "POST", headers: { authorization: `Bearer ${idToken}`, accept: "application/json" },
    });
    const token = response.ok ? (await response.json().catch(() => null))?.token : undefined;
    if (typeof token !== "string" || token.length === 0) refused.push(`${name} (HTTP ${response.status})`);
  }
  if (refused.length > 0) {
    throw new Error(`npm refused trusted publishing for ${refused.join(" and ")}; nothing was uploaded. On npmjs.com, ${registration} of each refused package, then publish again`);
  }
  return { workflow: workflow.file, packages: [...packages] };
}

async function main() {
  const npm = execFileSync("npm", ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  const version = assertTrustedPublishingNpm(npm);
  const packages = await Promise.all(["package.json", "packages/a1-install/package.json"]
    .map(async path => JSON.parse(await readFile(path, "utf8")).name));
  const proven = await proveTrustedPublishing({ packages, env: process.env, fetch });
  process.stdout.write(`npm ${version} trusts ${proven.workflow} to publish ${proven.packages.join(" and ")}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

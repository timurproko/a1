import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u;
const ACCEPTANCE_PATH = /^openspec\/acceptance\/(?=.{1,100}\/)[a-z0-9]+(?:-[a-z0-9]+)*\/[a-f0-9]{40}\.json$/u;

export function classifyAcceptanceValidationRoute(files, changedFileCount) {
  if (!Array.isArray(files) || !Number.isSafeInteger(changedFileCount) || changedFileCount !== files.length) {
    return { acceptanceOnly: false, reason: "incomplete-diff" };
  }
  if (files.length !== 1) return { acceptanceOnly: false, reason: "not-single-file" };
  const [file] = files;
  if (!file || file.status !== "added" || file.previous_filename !== undefined
    || typeof file.filename !== "string" || !ACCEPTANCE_PATH.test(file.filename)) {
    return { acceptanceOnly: false, reason: "not-canonical-added-record" };
  }
  return { acceptanceOnly: true, reason: "exact-acceptance-record", path: file.filename };
}

export async function inspectAcceptanceValidationRoute({ event, repository, request }) {
  const expectedHead = event?.pull_request?.head?.sha;
  const expectedBase = event?.pull_request?.base?.sha;
  const number = event?.pull_request?.number;
  if (!REPOSITORY.test(repository ?? "") || !Number.isSafeInteger(number) || number < 1
    || !SHA.test(expectedHead ?? "") || !SHA.test(expectedBase ?? "")) {
    throw new Error("invalid pull-request routing identity");
  }
  const prefix = `/repos/${repository}`;
  const pull = await request(`${prefix}/pulls/${number}`);
  if (pull?.number !== number || pull.state !== "open" || pull.draft !== false
    || pull.base?.ref !== "develop" || pull.base?.sha !== expectedBase
    || pull.head?.sha !== expectedHead || pull.head?.repo?.full_name !== repository) {
    throw new Error("pull-request routing identity changed");
  }
  const files = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = await request(`${prefix}/pulls/${number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error("changed-file response was not an array");
    files.push(...batch);
    if (batch.length < 100) return { headSha: expectedHead,
      ...classifyAcceptanceValidationRoute(files, pull.changed_files) };
  }
  throw new Error("changed-file response exceeded GitHub's reviewable limit");
}

export async function routeAcceptanceValidationFromEnvironment(environment = process.env, fetchImpl = fetch) {
  const event = JSON.parse(await readFile(environment.GITHUB_EVENT_PATH, "utf8"));
  const headSha = event?.pull_request?.head?.sha;
  let decision;
  try {
    decision = await inspectAcceptanceValidationRoute({
      event,
      repository: environment.GITHUB_REPOSITORY,
      request: async path => {
        const response = await fetchImpl(`${environment.GITHUB_API_URL ?? "https://api.github.com"}${path}`, {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${environment.GITHUB_TOKEN}`,
            "x-github-api-version": "2022-11-28",
          },
        });
        if (!response.ok) throw new Error(`GitHub routing request failed (${response.status})`);
        return await response.json();
      },
    });
  } catch (error) {
    decision = { acceptanceOnly: false, headSha,
      reason: `generic-fallback:${error instanceof Error ? error.message : String(error)}` };
  }
  if (!SHA.test(decision.headSha ?? "")) throw new Error("acceptance routing head is unavailable");
  const output = [
    `acceptance_only=${decision.acceptanceOnly}`,
    `head_sha=${decision.headSha}`,
    `route_reason=${decision.reason}`,
  ].join("\n");
  if (environment.GITHUB_OUTPUT) await appendFile(environment.GITHUB_OUTPUT, `${output}\n`);
  return decision;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const decision = await routeAcceptanceValidationFromEnvironment();
  process.stdout.write(`${JSON.stringify(decision)}\n`);
}

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { planRulesetChanges, validateRulesetDefinition } from "./github-rulesets.mjs";

const definitionPath = resolve(valueAfter("--definition") ?? "config/github-rulesets.json");
const definition = validateRulesetDefinition(JSON.parse(await readFile(definitionPath, "utf8")));
const repository = valueAfter("--repository") ?? definition.repository;
if (repository !== definition.repository) throw new Error(`definition is bound to ${definition.repository}, not ${repository}`);
const token = resolveToken();
const api = createApi(repository, token);
let live = await loadLiveRulesets(api);
let report = planRulesetChanges(definition, live);
report.api = { repository, fetchedAt: new Date().toISOString(), liveRulesetCount: live.length };

if (process.argv.includes("--apply")) {
  if (valueAfter("--confirm") !== "apply-a1-ci-rulesets") throw new Error("--apply requires --confirm apply-a1-ci-rulesets");
  const mutations = [];
  for (const change of report.changes) {
    if (change.action === "none") continue;
    const path = change.action === "create" ? "rulesets" : `rulesets/${change.id}`;
    const method = change.action === "create" ? "POST" : "PUT";
    const response = await api(path, { method, body: change.desired });
    mutations.push({ name: change.name, action: change.action, id: response.id });
  }
  live = await loadLiveRulesets(api);
  const verification = planRulesetChanges(definition, live);
  if (verification.changes.some(change => change.action !== "none")) throw new Error("ruleset verification differs after apply");
  report = { ...verification, mode: "apply", mutationPerformed: mutations.length > 0, mutations, api: { repository, fetchedAt: new Date().toISOString(), liveRulesetCount: live.length } };
}

const output = valueAfter("--output");
if (output) {
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}
if (process.argv.includes("--json") || !output) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else process.stdout.write(`GitHub ruleset ${report.mode}: ${report.summary.create} create, ${report.summary.update} update, ${report.summary.unchanged} unchanged; mutation=${report.mutationPerformed}\n`);
if (process.argv.includes("--check") && report.changes.some(change => change.action !== "none")) process.exitCode = 1;

async function loadLiveRulesets(api) {
  const summaries = await api("rulesets?includes_parents=false");
  return await Promise.all(summaries.map(summary => api(`rulesets/${summary.id}`)));
}
function createApi(repository, token) {
  const headers = { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", "user-agent": "a1-ruleset-check" };
  return async (path, options = {}) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      method: options.method ?? "GET",
      headers: { ...headers, ...(options.body ? { "content-type": "application/json" } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`GitHub API ${options.method ?? "GET"} ${path} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : undefined;
  };
}
function resolveToken() {
  const environment = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (environment) return environment;
  try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { throw new Error("GitHub ruleset inspection requires GH_TOKEN, GITHUB_TOKEN, or authenticated gh"); }
}
function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

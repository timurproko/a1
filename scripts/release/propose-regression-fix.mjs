/**
 * Turns a failed nightly validation run into a draft fix pull request. Given a run id it reads the
 * run through `gh`, downloads each lane's evidence artifact, extracts a bounded excerpt of the failed
 * job logs, finds the last successful run of the same workflow and the `develop` commits since,
 * and then either refreshes the open triage pull request whose failed scope set matches or opens a
 * new `fix/nightly-regression-<date>` draft carrying an OpenSpec scaffold. It re-runs nothing,
 * never writes `develop`, never marks the pull request ready, and with `--dry-run` writes only the
 * report and body under `--output`. A run that is not a failure, or a manual publication, records
 * why it proposed nothing and exits successfully.
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  BRANCH_PREFIX,
  appendRunToBody,
  appendRunToDesign,
  branchName,
  changeId,
  extractLogExcerpts,
  isTierResult,
  parseTriageKey,
  renderTriageBody,
  renderTriageChange,
  summarizeLanes,
  triageDecision,
  triageKey,
} from "./regression-triage-report.mjs";

const REPORT_SCHEMA = "a1-regression-triage-proposal-v1";
const COMMIT_SEPARATOR = "\u001f";

/**
 * Propose the fix for one run. `gh` and `git` are `(args) => Promise<{ stdout }>` executors so tests
 * inject recorded answers; `files` abstracts the working tree the scaffold is written to.
 */
export async function proposeRegressionFix({ runId, repository, output, gh, git, files, dryRun = false, today = new Date() }) {
  await files.mkdir(output);
  const view = JSON.parse((await gh(["run", "view", String(runId), "--json", "databaseId,number,attempt,workflowName,conclusion,event,headSha,url,createdAt,jobs"])).stdout);
  const run = { id: view.databaseId, number: view.number, attempt: view.attempt, workflowName: view.workflowName, conclusion: view.conclusion, event: view.event, headSha: view.headSha, url: view.url, createdAt: view.createdAt };
  const decision = triageDecision(run);
  if (!decision.triage) return finish({ changed: false, run, message: decision.reason }, output, files);
  const { workflow } = decision;

  const artifactRoot = join(output, "artifacts");
  await files.mkdir(artifactRoot);
  await gh(["run", "download", String(run.id), "--dir", artifactRoot]).catch(error => {
    // Rationale: a run that failed before any lane uploaded has no artifacts; that is itself evidence, not a triage failure.
    if (!/no artifacts|no valid artifacts/i.test(String(error?.stderr ?? error?.message ?? ""))) throw error;
  });
  const excerpts = extractLogExcerpts((await gh(["run", "view", String(run.id), "--log-failed"]).catch(() => ({ stdout: "" }))).stdout);
  const lanes = await collectLanes(artifactRoot, view.jobs ?? [], excerpts, files);
  const summary = summarizeLanes(lanes);
  const key = triageKey(workflow.file, summary);

  const lastGreen = await findLastGreen(gh, workflow);
  const commits = lastGreen ? await commitsSince(git, lastGreen.headSha, run.headSha) : [];
  const evidence = { workflow, run, summary, lastGreen, commits };

  const existing = await findOpenCandidate(gh, key);
  const report = { schema: REPORT_SCHEMA, workflow: workflow.name, run, key, summary, lastGreen, commits, existing: existing ? { number: existing.number, branch: existing.headRefName, url: existing.url } : null };

  if (existing) {
    const body = appendRunToBody(existing.body, evidence);
    await files.write(join(output, "body.md"), body);
    if (dryRun) return finish({ ...report, changed: false, mode: "refresh", branch: existing.headRefName, pr: existing.number, message: `dry run: would refresh #${existing.number}` }, output, files);
    await git(["fetch", "origin", existing.headRefName]);
    await git(["checkout", "-B", existing.headRefName, `origin/${existing.headRefName}`]);
    const designPath = join(repository, "openspec", "changes", changeId(existing.headRefName.slice(BRANCH_PREFIX.length)), "design.md");
    const design = await files.read(designPath).catch(() => null);
    if (design !== null) await files.write(designPath, appendRunToDesign(design, evidence));
    await git(["add", "-A"]);
    await git(["commit", "--allow-empty", "-m", `chore(regression): record the ${date(today)} ${workflow.name} failure`, "-m", `Appended by the nightly regression triage from run ${run.url}.`]);
    await git(["push", "origin", existing.headRefName]);
    await gh(["pr", "edit", String(existing.number), "--body-file", join(output, "body.md")]);
    return finish({ ...report, changed: true, mode: "refresh", branch: existing.headRefName, pr: existing.number, message: `refreshed #${existing.number}` }, output, files);
  }

  const stamp = await freeDateStamp(git, date(today), run.number);
  const branch = branchName(stamp);
  const body = renderTriageBody({ ...evidence, date: stamp, key });
  const scaffold = renderTriageChange({ ...evidence, date: stamp });
  await files.write(join(output, "body.md"), body);
  if (dryRun) return finish({ ...report, changed: false, mode: "new", branch, pr: null, message: `dry run: would open ${branch}` }, output, files);
  await git(["checkout", "-B", branch, run.headSha]);
  for (const [path, content] of Object.entries(scaffold)) await files.write(join(repository, path), content);
  await git(["add", "-A"]);
  await git(["commit", "-m", `chore(regression): propose the fix for the ${stamp} ${workflow.name} failure`, "-m", `Opened by the nightly regression triage from run ${run.url}; the evidence is in the pull request and the change's design.`]);
  await git(["push", "--force-with-lease", "origin", branch]);
  const created = (await gh(["pr", "create", "--draft", "--base", "develop", "--head", branch, "--title", `fix(regression): repair the ${stamp} ${workflow.name.toLowerCase()} failure`, "--body-file", join(output, "body.md")])).stdout.trim();
  const number = Number(/\/pull\/(\d+)\s*$/.exec(created)?.[1] ?? 0) || null;
  return finish({ ...report, changed: true, mode: "new", branch, pr: number, change: changeId(stamp), message: `opened ${branch}${number ? ` as #${number}` : ""}` }, output, files);
}

/** One lane per failed or evidence-bearing job: its tier result when the artifact holds one, and its log excerpt. */
async function collectLanes(artifactRoot, jobs, excerpts, files) {
  const artifacts = await files.list(artifactRoot).catch(() => []);
  const lanes = [];
  for (const artifact of artifacts) {
    const result = await findTierResult(join(artifactRoot, artifact), files);
    if (result === null) continue;
    const id = laneId(artifact);
    const job = jobs.find(candidate => laneMatchesJob(id, candidate.name));
    lanes.push({ id, job: job?.name ?? artifact, conclusion: job?.conclusion ?? (result.passed ? "success" : "failure"), result, excerpt: job ? excerpts.get(job.name) ?? [] : [] });
  }
  for (const job of jobs) {
    if (job.conclusion !== "failure" || lanes.some(lane => lane.job === job.name)) continue;
    lanes.push({ id: laneId(job.name), job: job.name, conclusion: "failure", result: null, excerpt: excerpts.get(job.name) ?? [] });
  }
  return lanes;
}

async function findTierResult(directory, files) {
  for (const entry of await files.list(directory).catch(() => [])) {
    const path = join(directory, entry);
    if (entry.endsWith(".json")) {
      const parsed = await files.read(path).then(text => JSON.parse(text)).catch(() => null);
      if (isTierResult(parsed)) return parsed;
    } else {
      const nested = await findTierResult(path, files);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** The lane of an artifact or job name: `...-windows-2025-node24`, `(windows-2025, node 24)`, or `Validate win32-node24`. */
function laneId(name) {
  const lane = /((?:windows|ubuntu|macos|win32|linux|darwin)[-\w.]*?node\s?\d+)/i.exec(String(name).replace(/,\s*node\s*/i, "-node"));
  return lane ? lane[1].replace(/\s+/g, "") : String(name);
}

function laneMatchesJob(lane, jobName) {
  return laneId(jobName) === lane || jobName.toLowerCase().includes(lane.toLowerCase());
}

async function findLastGreen(gh, workflow) {
  const args = ["run", "list", "--workflow", workflow.file, "--branch", "develop", "--status", "success", "--limit", "1", "--json", "databaseId,number,headSha,url"];
  if (workflow.scheduledOnly) args.push("--event", "schedule");
  const list = JSON.parse((await gh(args).catch(() => ({ stdout: "[]" }))).stdout || "[]");
  const green = list[0];
  return green ? { id: green.databaseId, number: green.number, headSha: green.headSha, url: green.url } : null;
}

async function commitsSince(git, from, to) {
  const { stdout } = await git(["log", "--first-parent", `--format=%H${COMMIT_SEPARATOR}%s`, `${from}..${to}`]).catch(() => ({ stdout: "" }));
  return stdout.split("\n").filter(line => line.includes(COMMIT_SEPARATOR)).map(line => {
    const [sha, subject] = line.split(COMMIT_SEPARATOR);
    return { sha, subject, pr: Number(/\(#(\d+)\)\s*$/.exec(subject)?.[1] ?? 0) || null };
  });
}

async function findOpenCandidate(gh, key) {
  const list = JSON.parse((await gh(["pr", "list", "--base", "develop", "--state", "open", "--limit", "100", "--json", "number,headRefName,body,url"])).stdout || "[]");
  return list.find(pull => pull.headRefName.startsWith(BRANCH_PREFIX) && parseTriageKey(pull.body) === key) ?? null;
}

/** The date alone unless that branch already exists on origin for a different failure; then the run number disambiguates. */
async function freeDateStamp(git, today, runNumber) {
  for (const stamp of [today, `${today}-${runNumber}`]) {
    const { stdout } = await git(["ls-remote", "--heads", "origin", branchName(stamp)]).catch(() => ({ stdout: "" }));
    if (!stdout.trim()) return stamp;
  }
  return `${today}-${runNumber}-${Date.now()}`;
}

function date(value) {
  return value.toISOString().slice(0, 10);
}

async function finish(result, output, files) {
  await files.write(join(output, "report.json"), `${JSON.stringify(result, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nmode=${result.mode ?? "none"}\nbranch=${result.branch ?? ""}\npr=${result.pr ?? ""}\n`, { flag: "a" });
  }
  process.stdout.write(`${result.message}; report in ${output}\n`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const execute = promisify(execFile);
  const repository = fileURLToPath(new URL("../..", import.meta.url));
  const runId = argumentValue("--run");
  if (!runId) throw new Error("--run <workflow run id> is required");
  const files = {
    mkdir: path => mkdir(path, { recursive: true }),
    list: path => readdir(path),
    read: path => readFile(path, "utf8"),
    write: async (path, content) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); },
  };
  // Rationale: reads may use the workflow token (GH_READ_TOKEN) while pushes and pull-request writes use the App token in GH_TOKEN.
  const readToken = process.env.GH_READ_TOKEN;
  // Platform: gh is a .cmd shim on Windows and needs a shell; git does not.
  const gh = args => {
    const write = args[0] === "pr" && ["create", "edit"].includes(args[1]);
    const env = readToken && !write ? { ...process.env, GH_TOKEN: readToken } : process.env;
    return execute("gh", args, { cwd: repository, env, maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32", windowsHide: true });
  };
  const git = args => execute("git", args, { cwd: repository, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  await proposeRegressionFix({
    runId,
    repository,
    output: resolve(argumentValue("--output") ?? join(repository, ".artifacts", "regression-triage")),
    gh,
    git,
    files,
    dryRun: process.argv.includes("--dry-run"),
  });
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

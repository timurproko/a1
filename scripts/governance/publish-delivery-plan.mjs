#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDeliveryBody } from "./check-delivery-body.mjs";
import { readDeliveryAdapter } from "./delivery-contract.mjs";
import { parseImplementation } from "./openspec-archive-policy.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const branchPattern = /^(?:feature|fix|refactor|docs|test|chore|style)\/[a-z0-9][a-z0-9._/-]*$/u;
const failure = code => Object.assign(new Error(code), { deliveryCode: code });

/** Explicit identity and stdin payloads deliberately have no Git cwd, dependency or runtime prerequisite. */
export async function publishDeliveryPlan(input, remote = githubPlanningRemote()) {
  const { repository, base, baseHead, branch, expectedHead, change, files, body, title } = input;
  const adapter = await readDeliveryAdapter();
  if (repository !== adapter.repository || base !== adapter.baseBranch) throw failure("planning-adapter-identity");
  if (!repositoryPattern.test(repository ?? "") || !SHA.test(baseHead ?? "") || !base || base.startsWith("-")
    || !branchPattern.test(branch ?? "") || branch.includes("..") || branch === base
    || expectedHead !== null && !SHA.test(expectedHead ?? "") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(change ?? "")) throw failure("planning-identity");
  const prefix = `openspec/changes/${change}/`;
  if (!Array.isArray(files) || files.length === 0 || files.length > 100
    || new Set(files.map(file => file.path)).size !== files.length
    || files.some(file => typeof file.path !== "string" || !file.path.startsWith(prefix)
      || file.path.includes("\\") || file.path.split("/").some(part => !part || part === "." || part === "..")
      || typeof file.contents !== "string" || Buffer.byteLength(file.contents) > 1024 * 1024)) throw failure("planning-paths");
  if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !/^## Proposal\r?\n/u.test(body)
    || !inspectDeliveryBody(body).ok || !/^- \[ \] .+/mu.test(body) || /^- \[[xX]\] /mu.test(body)
    || parseImplementation(body)?.change !== change) throw failure("planning-body");
  let stage = "read", publishedHead = null, pr = null;
  try {
    if (await remote.baseHead(repository, base) !== baseHead) throw failure("planning-base-changed");
    if (await remote.matches(repository, baseHead, files)) throw failure("planning-no-change");
    let head = await remote.head(repository, branch);
    // A retry may discover that its prior commit/PR succeeded even when the response was lost.
    if (head !== null && head !== baseHead && await remote.matches(repository, head, files)) {
      const existing = await remote.findPr(repository, base, branch);
      if (existing && (!existing.draft || existing.body !== body)) throw failure("planning-pr-conflict");
      publishedHead = head;
      pr = existing;
    } else {
      if (head !== expectedHead) throw failure("planning-head-changed");
      if (head === null) {
        stage = "create-ref";
        await remote.createRef(repository, branch, baseHead); // create-only, never force or delete
        head = baseHead;
      }
      stage = "commit";
      publishedHead = await remote.commit(repository, branch, head, files, `docs(openspec): plan ${change}`);
    }
    stage = "pull-request";
    if (await remote.head(repository, branch) !== publishedHead) throw failure("planning-head-changed");
    pr ??= await remote.findPr(repository, base, branch);
    if (pr && (!pr.draft || pr.body !== body)) throw failure("planning-pr-conflict");
    pr ??= await remote.createPr(repository, base, branch, title, body);
    return { status: "published", repository, base, branch, head: publishedHead, pr: pr.number, draft: pr.draft };
  } catch (error) {
    // Report uncertain publication rather than rolling back refs or hiding a possibly successful write.
    return { status: "blocked", repository, base, branch, stage, head: publishedHead, pr: pr?.number ?? null,
      reason: error.deliveryCode ?? "planning-remote-unavailable", partial: stage !== "read" || publishedHead !== null };
  }
}

function ghJson(args, payload) {
  return new Promise((resolveResult, reject) => {
    const child = spawn("gh", args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let output = "", errorOutput = "";
    const timer = setTimeout(() => { child.kill(); reject(failure("planning-remote-timeout")); }, 30_000);
    child.stdout.on("data", chunk => { output += chunk; if (output.length > 4 * 1024 * 1024) child.kill(); });
    child.stderr.on("data", chunk => { errorOutput = (errorOutput + chunk).slice(-8192); });
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) { reject(Object.assign(failure("planning-remote-unavailable"), { statusNotFound: /HTTP 404/u.test(errorOutput) })); return; }
      try { const parsed = JSON.parse(output); if (parsed.errors?.length) throw failure("planning-concurrency-or-api-error"); resolveResult(parsed); }
      catch (error) { reject(error); }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(payload === undefined ? undefined : JSON.stringify(payload));
  });
}

export function githubPlanningRemote(api = ghJson) {
  const rest = (path, payload) => api(["api", path, ...(payload === undefined ? [] : ["--method", "POST", "--input", "-"])], payload);
  const readHead = async (repository, branch) => {
    try { return (await rest(`repos/${repository}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha; }
    catch (error) { if (error.statusNotFound) return null; throw error; }
  };
  return {
    baseHead: readHead,
    head: readHead,
    createRef: (repository, branch, sha) => rest(`repos/${repository}/git/refs`, { ref: `refs/heads/${branch}`, sha }),
    async matches(repository, head, files) {
      for (const file of files) {
        try {
          const value = await rest(`repos/${repository}/contents/${file.path}?ref=${head}`);
          if (value.type !== "file" || value.encoding !== "base64" || Buffer.from(value.content, "base64").toString("utf8") !== file.contents) return false;
        } catch (error) { if (error.statusNotFound) return false; throw error; }
      }
      return true;
    },
    async commit(repository, branch, expectedHeadOid, files, headline) {
      const value = await api(["api", "graphql", "--input", "-"], {
        query: "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }",
        variables: { input: { branch: { repositoryNameWithOwner: repository, branchName: branch }, expectedHeadOid,
          message: { headline }, fileChanges: { additions: files.map(file => ({ path: file.path, contents: Buffer.from(file.contents).toString("base64") })) } } },
      });
      return value.data.createCommitOnBranch.commit.oid;
    },
    async findPr(repository, base, branch) {
      const owner = repository.split("/")[0];
      const prs = await rest(`repos/${repository}/pulls?state=open&base=${encodeURIComponent(base)}&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`);
      if (prs.length > 1) throw failure("planning-pr-ambiguous");
      return prs[0] ?? null;
    },
    createPr: (repository, base, head, title, body) => rest(`repos/${repository}/pulls`, { base, head, title, body, draft: true }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let text = "";
  for await (const chunk of process.stdin) { text += chunk; if (text.length > 8 * 1024 * 1024) throw failure("planning-payload-size"); }
  publishDeliveryPlan(JSON.parse(text)).then(result => { console.log(JSON.stringify(result, null, 2)); if (result.status !== "published") process.exitCode = 1; })
    .catch(error => { console.error(error.deliveryCode ?? error.message); process.exitCode = 1; });
}

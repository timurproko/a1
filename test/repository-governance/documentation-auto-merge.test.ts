import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  classifyDocumentationAutoMerge,
  planDocumentationAutoMerge,
  type PullRequestChangedFile,
} from "../../scripts/governance/documentation-auto-merge.mjs";

const execFileAsync = promisify(execFile);
const headSha = "a".repeat(40);

function files(...paths: string[]): PullRequestChangedFile[] {
  return paths.map(filename => ({ filename, status: "modified" }));
}

describe("documentation auto-merge path policy", () => {
  it("allows OpenSpec, maintained docs, and the root README in any combination", () => {
    expect(classifyDocumentationAutoMerge(files("openspec/changes/example/proposal.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files("docs/ci-release-runbook.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files("docs/README.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files("README.md")).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge(files(
      "openspec/specs/example/spec.md",
      "docs/architecture/example.md",
      "README.md",
    )).eligible).toBe(true);
  });

  it.each([
    ["arbitrary root markdown", ["CONTRIBUTING.md"]],
    ["source", ["src/index.ts"]],
    ["tests", ["test/example.test.ts"]],
    ["scripts", ["scripts/example.mjs"]],
    ["configuration", ["config/validation-suites.json"]],
    ["workflow", [".github/workflows/ci.yml"]],
    ["generated baseline", ["config/baselines/example.json"]],
    ["mixed docs and code", ["docs/architecture/example.md", "src/index.ts"]],
    ["mixed spec and code", ["openspec/changes/example/proposal.md", "src/index.ts"]],
  ])("rejects %s changes", (_label, paths) => {
    const result = classifyDocumentationAutoMerge(files(...paths));
    expect(result.eligible).toBe(false);
    expect(result.disallowedPaths.length).toBeGreaterThan(0);
  });

  it("fails closed for empty or malformed metadata", () => {
    expect(classifyDocumentationAutoMerge([]).eligible).toBe(false);
    expect(classifyDocumentationAutoMerge([{ filename: "", status: "modified" }]).eligible).toBe(false);
    expect(classifyDocumentationAutoMerge([{ filename: "openspec/new.md", status: "renamed" }]).eligible).toBe(false);
  });

  it("examines both sides of a rename", () => {
    expect(classifyDocumentationAutoMerge([{
      filename: "docs/architecture/unsafe.md",
      previous_filename: "src/unsafe.ts",
      status: "renamed",
    }])).toMatchObject({ eligible: false, disallowedPaths: ["src/unsafe.ts"] });
    expect(classifyDocumentationAutoMerge([{
      filename: "openspec/specs/new/spec.md",
      previous_filename: "openspec/specs/old/spec.md",
      status: "renamed",
    }]).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge([{
      filename: "docs/architecture/new.md",
      previous_filename: "docs/architecture/old.md",
      status: "renamed",
    }]).eligible).toBe(true);
  });
});

describe("documentation auto-merge planning", () => {
  it("arms eligible PRs while required validation is pending", () => {
    expect(planDocumentationAutoMerge({
      validation: "pending",
      autoMergeArmed: false,
      mergeableState: "blocked",
    })).toBe("arm");
  });

  it("directly merges a validated clean head and arms a validated blocked head", () => {
    expect(planDocumentationAutoMerge({
      validation: "success",
      autoMergeArmed: false,
      mergeableState: "clean",
    })).toBe("merge");
    expect(planDocumentationAutoMerge({
      validation: "success",
      autoMergeArmed: false,
      mergeableState: "blocked",
    })).toBe("arm");
  });

  it("does not arm a failed head or disturb auto-merge that is already armed", () => {
    expect(planDocumentationAutoMerge({
      validation: "failure",
      autoMergeArmed: false,
      mergeableState: "blocked",
    })).toBe("wait");
    expect(planDocumentationAutoMerge({
      validation: "pending",
      autoMergeArmed: true,
      mergeableState: "blocked",
    })).toBe("unchanged");
  });
});

describe("documentation auto-merge workflow", () => {
  it("runs trusted policy after validation and when auto-merge state can become unsafe", async () => {
    const workflow = await readFile(".github/workflows/documentation-auto-merge.yml", "utf8");
    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain("workflows: [Development validation]");
    expect(workflow).toContain("pull_request_target:");
    expect(workflow).toContain("auto_merge_enabled");
    expect(workflow).toContain("ref: ${{ github.event.repository.default_branch }}");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("manage-documentation-auto-merge.mjs");
    expect(workflow).not.toContain("github.event.pull_request.head.sha");
  });

  it("arms an eligible trusted PR before validation finishes", async () => {
    const result = await runManager({ pull_request: { number: 42 } }, pullFixture({ mergeable_state: "blocked" }));
    const graphql = result.requests.find(request => request.url === "/graphql");
    expect(graphql?.method).toBe("POST");
    expect(graphql?.body).toContain("enablePullRequestAutoMerge");
    expect(result.stdout).toContain("squash auto-merge armed behind required validation");
  });

  it("squash-merges only the current successfully validated clean head", async () => {
    const result = await runManager({
      workflow_run: {
        id: 9001,
        name: "Development validation",
        event: "pull_request",
        conclusion: "success",
        head_sha: headSha,
        pull_requests: [{ number: 42 }],
      },
    }, pullFixture({ mergeable_state: "clean" }));
    const merge = result.requests.find(request => request.url === "/repos/owner/repository/pulls/42/merge");
    expect(merge).toMatchObject({ method: "PUT" });
    expect(JSON.parse(merge?.body ?? "{}")).toEqual({ sha: headSha, merge_method: "squash" });
    expect(result.requests.some(request => request.body.includes("enablePullRequestAutoMerge"))).toBe(false);
    expect(result.stdout).toContain("squash-merged with expected head SHA");
  });

  it("synchronously merges and cleans an armed current head after validation", async () => {
    const result = await runManager({
      workflow_run: {
        id: 9003,
        name: "Development validation",
        event: "pull_request",
        conclusion: "success",
        head_sha: headSha,
        pull_requests: [{ number: 42 }],
      },
    }, pullFixture({ mergeable_state: "clean", auto_merge: { merge_method: "squash" } }));
    expect(result.requests.some(request => request.url === "/repos/owner/repository/pulls/42/merge" && request.method === "PUT")).toBe(true);
    expect(result.requests.some(request => request.url.includes("/git/refs/heads/") && request.method === "DELETE")).toBe(true);
    expect(result.stdout).toContain('documentation branch cleanup {"disposition":"deleted"');
  });

  it("cleans when token-authored auto-merge closes during the validation fallback", async () => {
    const open = pullFixture({ mergeable_state: "blocked", auto_merge: { merge_method: "squash" } });
    const merged = pullFixture({ state: "closed", merged: true, merged_at: "2026-08-28T15:43:23Z", mergeable_state: "unknown", auto_merge: null });
    const result = await runManager({
      workflow_run: {
        id: 9004,
        name: "Development validation",
        event: "pull_request",
        conclusion: "success",
        head_sha: headSha,
        pull_requests: [{ number: 42 }],
      },
    }, [open, merged]);
    expect(result.requests.some(request => request.url.includes("/git/refs/heads/") && request.method === "DELETE")).toBe(true);
    expect(result.stdout).toContain('documentation branch cleanup {"disposition":"deleted"');
  });

  it("never directly merges when successful validation belongs to an older head", async () => {
    const result = await runManager({
      workflow_run: {
        id: 9002,
        name: "Development validation",
        event: "pull_request",
        conclusion: "success",
        head_sha: "old-head",
        pull_requests: [{ number: 42 }],
      },
    }, pullFixture({ mergeable_state: "blocked" }));
    expect(result.requests.some(request => request.method === "PUT")).toBe(false);
    expect(result.requests.some(request => request.body.includes("enablePullRequestAutoMerge"))).toBe(true);
  });

  it("retains trusted classification and ineligible disable guards", async () => {
    const manager = await readFile("scripts/governance/manage-documentation-auto-merge.mjs", "utf8");
    expect(manager).toContain('event.workflow_run.conclusion === "success"');
    expect(manager).toContain('run.validatedHeadSha === pull.head?.sha');
    expect(manager).toContain('pull.head?.repo?.full_name === repositoryName');
    expect(manager).toContain('pull.base?.ref === "develop"');
    expect(manager).toContain("enablePullRequestAutoMerge");
    expect(manager).toContain("mergeMethod: SQUASH");
    expect(manager).toContain('body: { sha: pull.head.sha, merge_method: "squash" }');
    expect(manager).toContain("disablePullRequestAutoMerge");
    expect(manager).toContain("await disableIfArmed(pull, `classification failed:");
    expect(manager).toContain("awaitAutomaticIntegration");
    expect(manager).toContain("executeMergedBranchCleanup");
  });
});

interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly body: string;
}

function pullFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: 42,
    state: "open",
    node_id: "pull-request-node-42",
    draft: false,
    base: { ref: "develop" },
    head: { ref: "docs/example", sha: headSha, repo: { full_name: "owner/repository" } },
    auto_merge: null,
    mergeable_state: "blocked",
    ...overrides,
  };
}

async function runManager(
  event: Record<string, unknown>,
  pull: Record<string, unknown> | readonly Record<string, unknown>[],
): Promise<{ readonly requests: RecordedRequest[]; readonly stdout: string }> {
  const requests: RecordedRequest[] = [];
  let branchExists = true;
  let pullRead = 0;
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", chunk => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      const recorded = {
        method: request.method ?? "GET",
        url: request.url ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(recorded);

      let body: unknown;
      if (recorded.url.includes("/git/refs/heads/") && recorded.method === "DELETE") {
        branchExists = false;
        response.writeHead(204);
        response.end();
        return;
      } else if (recorded.url.includes("/git/ref/heads/") && recorded.method === "GET") {
        if (!branchExists) {
          response.writeHead(404, { "content-type": "application/json" });
          response.end(JSON.stringify({ message: "Not Found" }));
          return;
        }
        body = { object: { sha: headSha } };
      } else if (recorded.url.includes("/branches/") && recorded.method === "GET") {
        body = { protected: false };
      } else if (recorded.url === "/repos/owner/repository/pulls/42") {
        body = Array.isArray(pull) ? pull[Math.min(pullRead++, pull.length - 1)] : pull;
      } else if (recorded.url === "/repos/owner/repository/pulls/42/files?per_page=100&page=1") {
        body = [{ filename: "docs/architecture/example.md", status: "modified" }];
      } else if (recorded.url === "/repos/owner/repository/pulls/42/merge" && recorded.method === "PUT") {
        body = { merged: true };
      } else if (recorded.url === "/graphql") {
        body = { data: { pullRequest: { number: 42 } } };
      } else {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: `unexpected request: ${recorded.method} ${recorded.url}` }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test API server did not expose a TCP address");

  const temporary = await mkdtemp(join(tmpdir(), "a1-documentation-auto-merge-"));
  const eventPath = join(temporary, "event.json");
  await writeFile(eventPath, JSON.stringify(event));
  try {
    const result = await execFileAsync(process.execPath, ["scripts/governance/manage-documentation-auto-merge.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GITHUB_TOKEN: "test-token",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: "owner/repository",
        GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
        GITHUB_GRAPHQL_URL: `http://127.0.0.1:${address.port}/graphql`,
        A1_AUTO_MERGE_POLL_ATTEMPTS: "3",
        A1_AUTO_MERGE_POLL_MS: "0",
      },
    });
    return { requests, stdout: result.stdout };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(temporary, { recursive: true, force: true });
  }
}

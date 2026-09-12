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
  it.each(["blocked", "behind"])("arms eligible %s PRs behind pending validation", mergeableState => {
    for (const validation of ["pending", "success"] as const) {
      expect(planDocumentationAutoMerge({
        validation, autoMergeArmed: false, mergeableState, mergeable: true,
      })).toBe("arm");
    }
  });

  it.each(["clean", "unstable"])("reconciles validated %s heads regardless of armed state", mergeableState => {
    for (const autoMergeArmed of [false, true]) {
      expect(planDocumentationAutoMerge({
        validation: "success", autoMergeArmed, mergeableState, mergeable: true,
      })).toBe("merge");
      expect(planDocumentationAutoMerge({
        validation: "pending", autoMergeArmed, mergeableState, mergeable: true,
      })).toBe(autoMergeArmed ? "unchanged" : "wait");
    }
  });

  it.each([false, null, undefined])("requires positive mergeability, not %s", mergeable => {
    for (const mergeableState of ["clean", "unstable", "blocked", "behind", "dirty", "unknown"]) {
      expect(planDocumentationAutoMerge({
        validation: "success", autoMergeArmed: false, mergeableState, mergeable,
      })).toBe("wait");
    }
  });

  it.each(["dirty", "unknown", "draft", "unexpected", null, undefined])("defers unsupported state %s", mergeableState => {
    expect(planDocumentationAutoMerge({
      validation: "success", autoMergeArmed: true, mergeableState, mergeable: true,
    })).toBe("wait");
  });

  it("does not arm a failed head or disturb a pending armed head", () => {
    for (const autoMergeArmed of [false, true]) {
      for (const mergeableState of ["clean", "unstable", "blocked", "behind"]) {
        expect(planDocumentationAutoMerge({
          validation: "failure", autoMergeArmed, mergeableState, mergeable: true,
        })).toBe("wait");
      }
    }
    expect(planDocumentationAutoMerge({
      validation: "pending", autoMergeArmed: true, mergeableState: "blocked", mergeable: true,
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
    expect(manager).toContain("mergeValidatedHead");
    expect(manager).toContain("executeMergedBranchCleanup");
  });
});

describe("documentation auto-merge state recovery", () => {
  it.each([false, true])("merges a validated unstable head (armed=%s) and cleans its branch", async armed => {
    const result = await runManager(validationEvent(), pullFixture({
      mergeable_state: "unstable", auto_merge: armed ? { merge_method: "squash" } : null,
    }));
    expectMerge(result.requests);
    expect(result.requests.some(request => request.body.includes("enablePullRequestAutoMerge"))).toBe(false);
    expect(result.requests.some(request => request.method === "DELETE")).toBe(true);
    expect(result.stdout).toContain("current head passed validation (unstable)");
  });

  it.each(["clean", "unstable"])("does not merge %s without positive mergeability", async mergeable_state => {
    for (const mergeable of [null, false]) {
      const result = await runManager(validationEvent(), pullFixture({ mergeable_state, mergeable }));
      expectNoMutation(result.requests);
      expect(result.stdout).toContain("waiting for mergeability");
      expect(result.requests.filter(request => request.url === pullUrl).length).toBeLessThanOrEqual(4);
    }
  });

  it.each(["unknown", "dirty", "unexpected"])("defers %s without pretending validation failed", async mergeable_state => {
    const result = await runManager(validationEvent(), pullFixture({ mergeable_state }));
    expectNoMutation(result.requests);
    expect(result.stdout).toContain("deferred; waiting for mergeability");
    expect(result.stdout).not.toContain("validation failed");
  });

  it.each([
    ["missing", { pull_request: { number: 42 } }],
    ["stale", validationEvent({ head_sha: "b".repeat(40) })],
    ["failed", validationEvent({ conclusion: "failure" })],
    ["cancelled", validationEvent({ conclusion: "cancelled" })],
  ])("never merges an unstable head with %s validation", async (_label, event) => {
    const result = await runManager(event, pullFixture({ mergeable_state: "unstable" }));
    expectNoMutation(result.requests);
    expect(result.stdout).not.toContain("squash-merged");
  });

  it("rechecks a blocked-to-unstable arming rejection and merges the validated head", async () => {
    const result = await runManager(validationEvent(), [
      pullFixture(), pullFixture({ mergeable_state: "unstable" }),
    ], { respond: rejectUnstableEnable });
    expectMerge(result.requests);
    expect(result.requests.filter(request => request.body.includes("enablePullRequestAutoMerge"))).toHaveLength(1);
    expect(result.requests.filter(request => request.url.includes("/files?"))).toHaveLength(2);
    expect(result.stdout).toContain("unstable-status arming rejection; refreshing eligibility and validation");
  });

  it("waits for validation rather than merging after a pending arming race", async () => {
    const result = await runManager({ pull_request: { number: 42 } }, [
      pullFixture(), pullFixture({ mergeable_state: "unstable" }),
    ], { respond: rejectUnstableEnable });
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
    expect(result.stdout).toContain("deferred; waiting for successful current-head validation");
  });

  it("bounds repeated arming rejections and performs a final fresh read", async () => {
    const result = await runManager(validationEvent(), pullFixture(), { respond: rejectUnstableEnable });
    expect(result.requests.filter(request => request.body.includes("enablePullRequestAutoMerge"))).toHaveLength(3);
    expect(result.requests.filter(request => request.url === pullUrl)).toHaveLength(4);
    expect(result.requests.filter(request => request.url.includes("/files?"))).toHaveLength(4);
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
    expect(result.stdout).toContain("deferred; waiting for mergeability");
  });

  it("reconciles after unknown mergeability becomes positive", async () => {
    const result = await runManager(validationEvent(), [
      pullFixture({ mergeable: null, mergeable_state: "unknown" }),
      pullFixture({ mergeable: true, mergeable_state: "unstable" }),
    ]);
    expectMerge(result.requests);
    expect(result.requests.some(request => request.url === "/graphql")).toBe(false);
  });

  it.each([
    ["head", { head: { ref: "docs/example", sha: "b".repeat(40), repo: { full_name: "owner/repository" } } }, false],
    ["identity", { node_id: "different-node" }, false],
    ["draft", { draft: true }, true],
    ["base", { base: { ref: "master" } }, true],
    ["repository", { head: { ref: "docs/example", sha: headSha, repo: { full_name: "fork/repository" } } }, true],
  ] as const)("does not reuse eligibility after refreshed %s changes", async (_label, changed, disabled) => {
    const result = await runManager(validationEvent(), [
      pullFixture(),
      pullFixture({ mergeable_state: "unstable", auto_merge: { merge_method: "squash" }, ...changed }),
    ], { respond: rejectUnstableEnable });
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
    expect(result.requests.filter(request => request.url.includes("/files?"))).toHaveLength(2);
    expect(result.requests.some(request => request.body.includes("disablePullRequestAutoMerge"))).toBe(disabled);
  });

  it.each([false, true])("reclassifies the complete refreshed diff including renamed-from code (rename=%s)", async renamed => {
    const result = await runManager(validationEvent(), [
      pullFixture(), pullFixture({ mergeable_state: "unstable", auto_merge: { merge_method: "squash" } }),
    ], {
      respond: (request, requests) => {
        if (requests.filter(item => item.url === pullUrl).length > 1 && request.url.includes("/files?")) {
          return { body: request.url.endsWith("page=1")
            ? Array.from({ length: 100 }, (_, index) => ({ filename: `docs/${index}.md`, status: "modified" }))
            : [renamed
              ? { filename: "docs/new.md", previous_filename: "src/code.ts", status: "renamed" }
              : { filename: "src/code.ts", status: "modified" }] };
        }
        return rejectUnstableEnable(request);
      },
    });
    expect(result.requests.some(request => request.url.endsWith("page=2"))).toBe(true);
    expect(result.requests.some(request => request.body.includes("disablePullRequestAutoMerge"))).toBe(true);
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
  });

  it("disables an armed PR and fails if refreshed classification cannot be read", async () => {
    const result = await runManager(validationEvent(), [
      pullFixture(), pullFixture({ mergeable_state: "unstable", auto_merge: { merge_method: "squash" } }),
    ], {
      expectFailure: true,
      respond: (request, requests) => requests.filter(item => item.url === pullUrl).length > 1 && request.url.includes("/files?")
        ? { status: 503, body: { message: "unavailable" } }
        : rejectUnstableEnable(request),
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("GitHub REST 503");
    expect(result.requests.some(request => request.body.includes("disablePullRequestAutoMerge"))).toBe(true);
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
  });

  it.each([
    ["auth", { status: 401, body: { errors: [unstableError()] } }],
    ["permissions", { body: { errors: [{ ...unstableError(), type: "FORBIDDEN" }] } }],
    ["wrong mutation", { body: { errors: [{ ...unstableError(), path: ["disablePullRequestAutoMerge"] }] } }],
    ["nested path", { body: { errors: [{ ...unstableError(), path: ["enablePullRequestAutoMerge", "other"] }] } }],
    ["other error", { body: { errors: [{ ...unstableError(), message: "another rejection" }] } }],
    ["mixed errors", { body: { errors: [unstableError(), { type: "FORBIDDEN", message: "no permission" }] } }],
    ["null body", { body: null }],
    ["missing data", { body: {} }],
    ["null errors", { body: { errors: [null] } }],
    ["malformed errors", { body: { errors: "unstable" } }],
    ["wrong PR", { body: { data: { enablePullRequestAutoMerge: { pullRequest: { number: 43 } } } } }],
    ["invalid JSON", { raw: "not json" }],
    ["transport", { disconnect: true }],
  ] satisfies Array<[string, FakeResponse]>)("keeps %s errors fatal without recovery", async (_label, reply) => {
    const result = await runManager(validationEvent(), pullFixture(), {
      expectFailure: true,
      respond: request => request.url === "/graphql" ? reply : undefined,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.requests.filter(request => request.url === pullUrl)).toHaveLength(1);
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
    expect(result.stdout).not.toContain("unstable-status arming rejection");
  });

  it.each(["Pull request is in unstable status", "Pull request Pull request is in unstable status."])("recognizes the narrow alternate message: %s", async message => {
    const result = await runManager(validationEvent(), [pullFixture(), pullFixture({ mergeable_state: "unstable" })], {
      respond: request => request.url === "/graphql" ? { body: { errors: [{ ...unstableError(), message }] } } : undefined,
    });
    expectMerge(result.requests);
  });

  it.each([false, true])("handles another actor merging the expected head (armed=%s)", async armed => {
    const result = await runManager(validationEvent(), [
      pullFixture({ mergeable_state: "unstable", auto_merge: armed ? { merge_method: "squash" } : null }),
      pullFixture({ state: "closed", merged: true, merged_at: "2026-09-12T12:00:00Z" }),
    ], { respond: request => request.method === "PUT" ? { status: 409, body: { message: "already merged" } } : undefined });
    expect(result.stdout).toContain("already merged at expected head");
    expect(result.requests.filter(request => request.method === "DELETE")).toHaveLength(1);
  });

  it.each([
    ["open", {}],
    ["closed unmerged", { state: "closed", merged: false }],
    ["different merged head", { state: "closed", merged: true, head: { ref: "docs/example", sha: "b".repeat(40), repo: { full_name: "owner/repository" } } }],
  ])("does not hide merge refusal when refreshed PR is %s", async (_label, changed) => {
    const result = await runManager(validationEvent(), [
      pullFixture({ mergeable_state: "unstable" }), pullFixture(changed),
    ], {
      expectFailure: true,
      respond: request => request.method === "PUT" ? { status: 405, body: { message: "protected merge refused" } } : undefined,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("protected merge refused");
    expect(result.requests.some(request => request.method === "DELETE")).toBe(false);
  });

  it("rejects a successful HTTP response that did not actually merge", async () => {
    const result = await runManager(validationEvent(), pullFixture({ mergeable_state: "unstable" }), {
      expectFailure: true,
      respond: request => request.method === "PUT" ? { body: { merged: false } } : undefined,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("GitHub did not merge");
    expect(result.requests.some(request => request.method === "DELETE")).toBe(false);
  });

  it.each([
    ["merged", { merged: true }, true],
    ["closed", { merged: false }, false],
    ["different head", { merged: true, head: { ref: "docs/example", sha: "b".repeat(40), repo: { full_name: "owner/repository" } } }, false],
  ] as const)("handles a %s PR after the arming rejection", async (_label, changed, cleanup) => {
    const result = await runManager(validationEvent(), [
      pullFixture(), pullFixture({ state: "closed", merged_at: "2026-09-12T12:00:00Z", ...changed }),
    ], { respond: rejectUnstableEnable });
    expect(result.requests.some(request => request.method === "PUT")).toBe(false);
    expect(result.requests.some(request => request.method === "DELETE")).toBe(cleanup);
  });

  it("fails closed on malformed refreshed PR identity", async () => {
    const result = await runManager(validationEvent(), [pullFixture(), pullFixture({ number: 43 })], {
      expectFailure: true, respond: rejectUnstableEnable,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("malformed PR #42 metadata");
    expect(result.requests.some(request => request.method === "PUT" || request.method === "DELETE")).toBe(false);
  });
});

const pullUrl = "/repos/owner/repository/pulls/42";

function validationEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { workflow_run: {
    id: 9001, name: "Development validation", event: "pull_request", conclusion: "success",
    head_sha: headSha, pull_requests: [{ number: 42 }], ...overrides,
  } };
}

function unstableError() {
  return { type: "UNPROCESSABLE", path: ["enablePullRequestAutoMerge"], message: "Pull request Pull request is in unstable status" };
}

function rejectUnstableEnable(request: RecordedRequest): FakeResponse | undefined {
  return request.url === "/graphql" && request.body.includes("enablePullRequestAutoMerge")
    ? { body: { errors: [unstableError()] } } : undefined;
}

function expectMerge(requests: readonly RecordedRequest[]): void {
  const merges = requests.filter(request => request.method === "PUT");
  expect(merges).toHaveLength(1);
  expect(merges[0]?.url).toBe(`${pullUrl}/merge`);
  expect(JSON.parse(merges[0]?.body ?? "{}")).toEqual({ sha: headSha, merge_method: "squash" });
}

function expectNoMutation(requests: readonly RecordedRequest[]): void {
  expect(requests.every(request => request.method === "GET")).toBe(true);
}

interface FakeResponse {
  readonly status?: number;
  readonly body?: unknown;
  readonly raw?: string;
  readonly disconnect?: boolean;
}

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
    mergeable: true,
    mergeable_state: "blocked",
    ...overrides,
  };
}

async function runManager(
  event: Record<string, unknown>,
  pull: Record<string, unknown> | readonly Record<string, unknown>[],
  options: {
    readonly expectFailure?: boolean;
    readonly respond?: (request: RecordedRequest, requests: readonly RecordedRequest[]) => FakeResponse | undefined;
  } = {},
): Promise<{ readonly requests: RecordedRequest[]; readonly stdout: string; readonly stderr: string; readonly exitCode: number }> {
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
      const override = options.respond?.(recorded, requests);
      if (override !== undefined) {
        if (override.disconnect) {
          request.socket.destroy();
          return;
        }
        response.writeHead(override.status ?? 200, { "content-type": "application/json" });
        response.end(override.raw ?? JSON.stringify(override.body));
        return;
      }

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
        const mutation = recorded.body.includes("disablePullRequestAutoMerge") ? "disablePullRequestAutoMerge" : "enablePullRequestAutoMerge";
        body = { data: { [mutation]: { pullRequest: { number: 42 } } } };
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
        DOCS_AUTO_MERGE_POLL_ATTEMPTS: "3",
        DOCS_AUTO_MERGE_POLL_MS: "0",
      },
    });
    return { requests, stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error) {
    if (!options.expectFailure || !(error instanceof Error) || !("code" in error) || typeof error.code !== "number"
      || !("stdout" in error) || !("stderr" in error)) throw error;
    return { requests, stdout: String(error.stdout), stderr: String(error.stderr), exitCode: error.code };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(temporary, { recursive: true, force: true });
  }
}

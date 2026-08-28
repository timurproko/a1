import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { classifyMergedBranchCleanup, decideMergedBranchCleanup } from "../../scripts/governance/merged-branch-cleanup.mjs";

const execFileAsync = promisify(execFile);
const headSha = "1".repeat(40);
const advancedSha = "2".repeat(40);

function pull(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: 164,
    merged: true,
    merged_at: "2026-08-28T15:03:58Z",
    base: { ref: "develop" },
    head: { ref: "implementation/topic", sha: headSha, repo: { full_name: "owner/repository" } },
    ...overrides,
  };
}

describe("merged branch cleanup policy", () => {
  it("deletes only an unprotected exact live head and treats absence as success", () => {
    const eligible = classifyMergedBranchCleanup(pull(), "owner/repository");
    expect(decideMergedBranchCleanup(eligible, { kind: "present", sha: headSha, protected: false }).disposition).toBe("delete");
    expect(decideMergedBranchCleanup(eligible, { kind: "absent" }).disposition).toBe("already-absent");
  });

  it("preserves an advanced or protected branch", () => {
    const eligible = classifyMergedBranchCleanup(pull(), "owner/repository");
    expect(decideMergedBranchCleanup(eligible, { kind: "present", sha: advancedSha, protected: false })).toMatchObject({
      disposition: "refused", expectedSha: headSha, actualSha: advancedSha,
    });
    expect(decideMergedBranchCleanup(eligible, { kind: "present", sha: headSha, protected: true })).toMatchObject({
      disposition: "refused", reason: expect.stringContaining("protected"),
    });
  });

  it.each([
    ["unmerged", { merged: false, merged_at: null }],
    ["wrong base", { base: { ref: "master" } }],
    ["fork", { head: { ref: "topic", sha: headSha, repo: { full_name: "other/fork" } } }],
    ["default", { head: { ref: "develop", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["release", { head: { ref: "release/1.0.0", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["tag-like", { head: { ref: "v1.0.0", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["malformed ref", { head: { ref: "bad..ref", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["missing head", { head: null }],
    ["malformed sha", { head: { ref: "topic", sha: "short", repo: { full_name: "owner/repository" } } }],
  ])("fails closed for %s metadata", (_label, override) => {
    expect(classifyMergedBranchCleanup(pull(override), "owner/repository").disposition).toBe("refused");
  });
});

describe("merged branch cleanup workflow", () => {
  it("uses trusted default-branch code, close-only authority, and no dependencies", async () => {
    const workflow = await readFile(".github/workflows/merged-branch-cleanup.yml", "utf8");
    expect(workflow).toContain("types: [closed]");
    expect(workflow).toContain("contents: write");
    expect(workflow).not.toContain("pull-requests: write");
    expect(workflow).toContain("ref: ${{ github.event.repository.default_branch }}");
    expect(workflow).not.toContain("github.event.pull_request.head.sha");
    expect(workflow).not.toMatch(/npm (?:ci|install)|pnpm|yarn/);
  });

  it("deletes a matching ref and verifies absence", async () => {
    const result = await runReconciler({ liveSha: headSha });
    expect(result.methods).toEqual(["GET", "GET", "DELETE", "GET"]);
    expect(result.stdout).toContain('"disposition":"deleted"');
  });

  it("succeeds without deletion when GitHub already removed the ref", async () => {
    const result = await runReconciler({ absent: true });
    expect(result.methods).toEqual(["GET", "GET"]);
    expect(result.stdout).toContain('"disposition":"already-absent"');
  });

  it("preserves an advanced branch without issuing DELETE", async () => {
    const result = await runReconciler({ liveSha: advancedSha });
    expect(result.methods).toEqual(["GET", "GET"]);
    expect(result.stdout).toContain('"disposition":"refused"');
    expect(result.stdout).toContain(advancedSha);
  });

  it("fails on deletion API errors and failed post-delete verification", async () => {
    await expect(runReconciler({ liveSha: headSha, deleteStatus: 500 })).rejects.toThrow();
    await expect(runReconciler({ liveSha: headSha, verificationSha: headSha })).rejects.toThrow();
  });
});

async function runReconciler(options: {
  readonly liveSha?: string;
  readonly absent?: boolean;
  readonly deleteStatus?: number;
  readonly verificationSha?: string;
}): Promise<{ readonly methods: string[]; readonly stdout: string }> {
  const methods: string[] = [];
  let deleted = false;
  const server = createServer((request, response) => {
    const method = request.method ?? "GET";
    methods.push(method);
    const isBranch = request.url?.includes("/branches/");
    const isRef = request.url?.includes("/git/ref/");
    const isDelete = request.url?.includes("/git/refs/") && method === "DELETE";
    if (isDelete) {
      const status = options.deleteStatus ?? 204;
      if (status === 204) deleted = true;
      response.writeHead(status, { "content-type": "application/json" });
      response.end(status === 204 ? "" : JSON.stringify({ message: "delete failed" }));
      return;
    }
    if (isRef && method === "GET") {
      if (options.absent || (deleted && !options.verificationSha)) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "Not Found" }));
      } else {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ object: { sha: deleted ? options.verificationSha : options.liveSha } }));
      }
      return;
    }
    if (isBranch && method === "GET") {
      if (options.absent) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "Not Found" }));
      } else {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ protected: false }));
      }
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  const temporary = await mkdtemp(join(tmpdir(), "a1-branch-cleanup-"));
  const eventPath = join(temporary, "event.json");
  await writeFile(eventPath, JSON.stringify({ pull_request: pull() }));
  try {
    const result = await execFileAsync(process.execPath, ["scripts/governance/reconcile-merged-branch.mjs"], {
      env: { ...process.env, GITHUB_TOKEN: "test", GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: "owner/repository", GITHUB_API_URL: `http://127.0.0.1:${address.port}` },
    });
    return { methods, stdout: result.stdout };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(temporary, { recursive: true, force: true });
  }
}

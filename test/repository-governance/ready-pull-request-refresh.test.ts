import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { inspectWorkflowSource } from "../../scripts/governance/github-repository-governance.mjs";
import {
  classifyRefreshCandidate,
  decideRefresh,
  interpretBranchUpdate,
  refreshReadyPullRequests,
  type RefreshRequester,
} from "../../scripts/governance/ready-pull-request-refresh.mjs";

const execFileAsync = promisify(execFile);
const repository = "timurproko/a1";
const target = "d".repeat(40);
const sha = (value: number): string => value.toString(16).padStart(40, "0");

interface FakePull {
  number: number;
  state?: string;
  draft?: boolean;
  base?: string;
  baseRepository?: string;
  headRepository?: string | null;
  head: string;
  behind?: number;
  conflict?: boolean;
  raceTo?: string;
  updateStatus?: number;
  readStatus?: number;
}

function metadata(pull: FakePull): Record<string, unknown> {
  return {
    number: pull.number,
    state: pull.state ?? "open",
    draft: pull.draft ?? false,
    base: { ref: pull.base ?? "develop", repo: { full_name: pull.baseRepository ?? repository } },
    head: { sha: pull.head, repo: pull.headRepository === null ? null : { full_name: pull.headRepository ?? repository } },
  };
}

class FakeGitHub {
  readonly calls: string[] = [];
  readonly updates: Array<{ number: number; expected: unknown }> = [];
  private readonly pulls: Map<number, FakePull>;
  private revision = 1000;

  constructor(pulls: readonly FakePull[]) {
    this.pulls = new Map(pulls.map(pull => [pull.number, { ...pull }]));
  }

  readonly request: RefreshRequester = async (path, options = {}) => {
    const method = options.method ?? "GET";
    const expected = options.expected ?? [200];
    this.calls.push(`${method} ${path}`);
    const response = this.respond(method, path, options.body);
    if (!expected.includes(response.status)) throw Object.assign(new Error(`${method} ${path} returned ${response.status}`), { status: response.status });
    return response;
  };

  private respond(method: string, path: string, body: unknown): { status: number; body?: any } {
    const prefix = `/repos/${repository}`;
    const listing = new RegExp(`^${prefix}/pulls\\?state=open&base=develop&per_page=100&page=(\\d+)$`).exec(path);
    if (listing) {
      const page = Number(listing[1]);
      return { status: 200, body: [...this.pulls.values()].slice((page - 1) * 100, page * 100).map(pull => ({ number: pull.number })) };
    }
    if (path === `${prefix}/git/ref/heads/develop`) return { status: 200, body: { object: { sha: target } } };
    const compare = new RegExp(`^${prefix}/compare/${target}\\.\\.\\.([0-9a-f]{40})\\?per_page=1$`).exec(path);
    if (compare) {
      const pull = [...this.pulls.values()].find(candidate => candidate.head === compare[1]);
      return { status: 200, body: { behind_by: pull?.behind ?? 0 } };
    }
    const update = new RegExp(`^${prefix}/pulls/(\\d+)/update-branch$`).exec(path);
    if (update && method === "PUT") {
      const pull = this.pulls.get(Number(update[1]))!;
      const expectedHead = (body as { expected_head_sha?: unknown }).expected_head_sha;
      this.updates.push({ number: pull.number, expected: expectedHead });
      if (pull.updateStatus) return { status: pull.updateStatus, body: { message: "Server Error" } };
      if (pull.raceTo) {
        pull.head = pull.raceTo;
        return { status: 422, body: { message: "expected head sha didn't match current head ref." } };
      }
      if (expectedHead !== pull.head) return { status: 422, body: { message: "expected head sha didn't match current head ref." } };
      if (pull.conflict) return { status: 422, body: { message: "merge conflict between base and head" } };
      pull.head = sha(this.revision += 1);
      pull.behind = 0;
      return { status: 202, body: { message: "Updating pull request branch.", url: "https://github.com/" } };
    }
    const read = new RegExp(`^${prefix}/pulls/(\\d+)$`).exec(path);
    if (read) {
      const pull = this.pulls.get(Number(read[1]));
      if (!pull) return { status: 404, body: { message: "Not Found" } };
      if (pull.readStatus) return { status: pull.readStatus, body: { message: "unavailable" } };
      return { status: 200, body: metadata(pull) };
    }
    return { status: 404, body: { message: "Not Found" } };
  }
}

describe("ready pull-request refresh classification", () => {
  it.each([
    ["draft", { draft: true }, "skipped"],
    ["closed", { state: "closed" }, "skipped"],
    ["other base", { base: "master" }, "skipped"],
    ["fork", { headRepository: "someone/fork" }, "skipped"],
    ["deleted fork", { headRepository: null }, "skipped"],
    ["foreign base repository", { baseRepository: "someone/a1" }, "skipped"],
    ["same-repository ready", {}, "eligible"],
  ])("classifies a %s pull request explicitly", (_label, override, disposition) => {
    expect(classifyRefreshCandidate(metadata({ number: 7, head: sha(1), ...override }), repository).disposition).toBe(disposition);
  });

  it("fails visibly on malformed identity instead of skipping it", () => {
    expect(classifyRefreshCandidate(null, repository)).toMatchObject({ disposition: "failed", reason: expect.stringContaining("number") });
    expect(classifyRefreshCandidate(metadata({ number: 7, head: "short" }), repository)).toMatchObject({ disposition: "failed" });
    expect(classifyRefreshCandidate({ ...metadata({ number: 7, head: sha(1) }), draft: "no" } as never, repository)).toMatchObject({ disposition: "failed" });
  });

  it("updates only heads that lack the current target", () => {
    const eligible = classifyRefreshCandidate(metadata({ number: 7, head: sha(1) }), repository);
    expect(decideRefresh(eligible, { behind_by: 0 }, target).disposition).toBe("current");
    expect(decideRefresh(eligible, { behind_by: 3 }, target)).toMatchObject({ disposition: "update", behindBy: 3, targetSha: target });
    expect(decideRefresh(eligible, { behind_by: "3" }, target).disposition).toBe("failed");
    expect(decideRefresh(eligible, undefined, target).disposition).toBe("failed");
  });

  it("bounds every update-branch response", () => {
    const decision = { disposition: "update" as const, number: 7, headSha: sha(1) };
    expect(interpretBranchUpdate(decision, { status: 202, body: {} }).disposition).toBe("updated");
    expect(interpretBranchUpdate(decision, { status: 422, body: { message: "expected head sha didn't match current head ref." } }).disposition).toBe("deferred");
    expect(interpretBranchUpdate(decision, { status: 422, body: { message: "There are no new commits on the base branch." } }).disposition).toBe("current");
    expect(interpretBranchUpdate(decision, { status: 422, body: { message: "merge conflict between base and head" } }).disposition).toBe("blocked");
    expect(interpretBranchUpdate(decision, { status: 422, body: { message: "Validation Failed" } }).disposition).toBe("failed");
    expect(interpretBranchUpdate(decision, { status: 422 }).disposition).toBe("failed");
  });
});

describe("ready pull-request refresh reconciliation", () => {
  it("updates every stale ready branch with its observed expected head and leaves controls unchanged", async () => {
    const github = new FakeGitHub([
      { number: 1, head: sha(1), behind: 2 },
      { number: 2, head: sha(2), behind: 1 },
      { number: 3, head: sha(3), behind: 0 },
      { number: 4, head: sha(4), behind: 5, draft: true },
      { number: 5, head: sha(5), behind: 5, headRepository: "someone/fork" },
      { number: 6, head: sha(6), behind: 5, conflict: true },
    ]);
    const results = await refreshReadyPullRequests({ repository, request: github.request });
    expect(results.map(result => [result.number, result.disposition])).toEqual([
      [1, "updated"], [2, "updated"], [3, "current"], [4, "skipped"], [5, "skipped"], [6, "blocked"],
    ]);
    expect(github.updates).toEqual([
      { number: 1, expected: sha(1) }, { number: 2, expected: sha(2) }, { number: 6, expected: sha(6) },
    ]);
    expect(github.calls.filter(call => call.startsWith("PUT")).every(call => call.endsWith("/update-branch"))).toBe(true);
    expect(github.calls.some(call => /merge|auto_merge|dispatches|check-runs|statuses|reviews/.test(call))).toBe(false);
  });

  it("is idempotent across duplicate triggers", async () => {
    const github = new FakeGitHub([{ number: 1, head: sha(1), behind: 2 }, { number: 2, head: sha(2), behind: 0 }]);
    await refreshReadyPullRequests({ repository, request: github.request });
    const second = await refreshReadyPullRequests({ repository, request: github.request });
    expect(second.map(result => result.disposition)).toEqual(["current", "current"]);
    expect(github.updates).toHaveLength(1);
  });

  it("defers a candidate whose head changed and continues with independent candidates", async () => {
    const github = new FakeGitHub([
      { number: 1, head: sha(1), behind: 2, raceTo: sha(99) },
      { number: 2, head: sha(2), behind: 1 },
    ]);
    const results = await refreshReadyPullRequests({ repository, request: github.request });
    expect(results.map(result => result.disposition)).toEqual(["deferred", "updated"]);
    expect(results[0]).toMatchObject({ headSha: sha(1), reason: expect.stringContaining("head changed") });
  });

  it("pages the complete open set", async () => {
    const pulls = Array.from({ length: 205 }, (_, index) => ({ number: index + 1, head: sha(index + 1), behind: index === 204 ? 1 : 0 }));
    const github = new FakeGitHub(pulls);
    const results = await refreshReadyPullRequests({ repository, request: github.request });
    expect(results).toHaveLength(205);
    expect(github.calls.filter(call => call.includes("state=open"))).toHaveLength(3);
    expect(github.updates).toEqual([{ number: 205, expected: sha(205) }]);
  });

  it("fails the pass when pagination is unbounded or malformed", async () => {
    const endless: RefreshRequester = async () => ({ status: 200, body: Array.from({ length: 100 }, (_, index) => ({ number: index + 1 })) });
    await expect(refreshReadyPullRequests({ repository, request: endless, maxPages: 2 })).rejects.toThrow("exceeded 2 pages");
    await expect(refreshReadyPullRequests({ repository, request: async () => ({ status: 200, body: {} }) })).rejects.toThrow("not an array");
    await expect(refreshReadyPullRequests({ repository, request: async () => ({ status: 200, body: [{ number: "1" }] }) })).rejects.toThrow("malformed");
  });

  it("reports operational candidate failures without hiding them or stopping independent candidates", async () => {
    const github = new FakeGitHub([
      { number: 1, head: sha(1), behind: 2, updateStatus: 500 },
      { number: 2, head: sha(2), behind: 1, readStatus: 502 },
      { number: 3, head: sha(3), behind: 1 },
    ]);
    const results = await refreshReadyPullRequests({ repository, request: github.request });
    expect(results.map(result => result.disposition)).toEqual(["failed", "failed", "updated"]);
  });

  it("aborts on credential failures instead of reporting a refresh", async () => {
    for (const status of [401, 403]) {
      const github = new FakeGitHub([{ number: 1, head: sha(1), behind: 2, updateStatus: status }, { number: 2, head: sha(2), behind: 1 }]);
      await expect(refreshReadyPullRequests({ repository, request: github.request })).rejects.toMatchObject({ status });
      expect(github.updates.map(update => update.number)).toEqual([1]);
    }
  });
});

describe("ready pull-request refresh command", () => {
  it("requires the App token and never falls back to GITHUB_TOKEN", async () => {
    await expect(runCommand({ GITHUB_TOKEN: "workflow-token" }, [])).rejects.toThrow(/App token/);
  });

  it("refuses a repository other than the governed one", async () => {
    await expect(runCommand({ BRANCH_REFRESH_TOKEN: "app", GITHUB_REPOSITORY: "someone/a1" }, [])).rejects.toThrow(/governed repository/);
  });

  it("reports each candidate and fails when a candidate failed", async () => {
    const success = await runCommand({ BRANCH_REFRESH_TOKEN: "app" }, [{ number: 1, head: sha(1), behind: 1 }, { number: 2, head: sha(2), behind: 0, draft: true }]);
    expect(success.stdout).toContain('"disposition":"updated","pullRequest":1');
    expect(success.stdout).toContain('"disposition":"skipped","pullRequest":2');
    expect(success.authorization).toEqual(["Bearer app"]);
    await expect(runCommand({ BRANCH_REFRESH_TOKEN: "app" }, [{ number: 1, head: sha(1), behind: 1, updateStatus: 500 }])).rejects.toThrow(/branch refresh failed for #1/);
  });
});

describe("ready pull-request refresh workflow", () => {
  it("runs trusted default-branch policy after merges and documentation integration, serialized without cancellation", async () => {
    const workflow = await readFile(".github/workflows/ready-pull-request-refresh.yml", "utf8");
    expect(workflow).toMatch(/pull_request_target:\n {4}branches: \[develop\]\n {4}types: \[closed\]/);
    expect(workflow).toMatch(/workflow_run:\n {4}workflows: \[Documentation auto-merge\]\n {4}types: \[completed\]/);
    expect(workflow).toContain("if: github.event_name == 'workflow_run' || github.event.pull_request.merged == true");
    expect(workflow).toMatch(/concurrency:\n {2}group: ready-pull-request-refresh\n {2}cancel-in-progress: false/);
    expect(workflow).toContain("ref: ${{ github.event.repository.default_branch }}");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toMatch(/github\.event\.pull_request\.head|workflow_run\.head_(?:sha|branch)|npm (?:ci|install)|pnpm|yarn/);
  });

  it("updates branches only with a scoped event-producing App token", async () => {
    const workflow = await readFile(".github/workflows/ready-pull-request-refresh.yml", "utf8");
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n\n/m);
    expect(workflow).toContain("permission-contents: write");
    expect(workflow).toContain("permission-pull-requests: write");
    expect(workflow).toContain("BRANCH_REFRESH_TOKEN: ${{ steps.app.outputs.token }}");
    expect(workflow).not.toContain("secrets.GITHUB_TOKEN");
    expect(workflow).not.toMatch(/git push|gh pr merge|--auto|enablePullRequestAutoMerge|check-runs|workflow_dispatch|dispatches/);
    const helper = await readFile("scripts/governance/refresh-ready-pull-requests.mjs", "utf8");
    expect(helper).not.toMatch(/process\.env\.(?:GITHUB_TOKEN|GH_TOKEN)/);
  });

  it("drifts from the inventory when the App token loses its scope", async () => {
    const workflow = await readFile(".github/workflows/ready-pull-request-refresh.yml", "utf8");
    const path = ".github/workflows/ready-pull-request-refresh.yml";
    expect(inspectWorkflowSource(path, workflow).authority).toEqual(["ready-pull-request-branch-refresh"]);
    for (const drifted of [
      workflow.replace(/^\s+permission-pull-requests: write\n/m, ""),
      workflow.replace("permission-contents: write", "permission-contents: write\n          permission-workflows: write"),
      workflow.replace("${{ steps.app.outputs.token }}", "${{ secrets.GITHUB_TOKEN }}"),
    ]) {
      expect(inspectWorkflowSource(path, drifted).authority).toEqual(["unscoped-branch-refresh"]);
    }
  });
});

async function runCommand(
  environment: Record<string, string>,
  pulls: readonly FakePull[],
): Promise<{ readonly stdout: string; readonly authorization: string[] }> {
  const github = new FakeGitHub(pulls);
  const authorization: string[] = [];
  const server = createServer((request, response) => {
    authorization.push(String(request.headers.authorization));
    let text = "";
    request.on("data", chunk => { text += chunk; });
    request.on("end", () => {
      github.request(request.url ?? "", { method: request.method ?? "GET", body: text ? JSON.parse(text) : undefined, expected: [200, 202, 404, 422, 500, 502] })
        .then(result => {
          response.writeHead(result.status, { "content-type": "application/json" });
          response.end(JSON.stringify(result.body ?? {}));
        });
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:GITHUB_|GH_|BRANCH_REFRESH_)/.test(key)));
  try {
    const result = await execFileAsync(process.execPath, ["scripts/governance/refresh-ready-pull-requests.mjs"], {
      env: { ...inherited, GITHUB_REPOSITORY: repository, GITHUB_API_URL: `http://127.0.0.1:${address.port}`, ...environment },
    });
    return { stdout: result.stdout, authorization: [...new Set(authorization)] };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

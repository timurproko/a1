import { describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../../../src/product-identity.js";
import { parsePullRequest, readPullRequest } from "../../../../src/integrations/pi/engine/repository-pr.js";
import {
  parseGitHubPullRequests,
  parseGitHubRepositoryRemote,
  readPullRequestFromGitHub,
} from "../../../../src/integrations/pi/engine/repository-pr-rest.js";

const BRANCH = "feature/show-pr-id-status-bar";
const REPOSITORY = { owner: "timurproko", repository: "a1" } as const;

const payload = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  number: 540,
  url: "https://github.com/timurproko/a1/pull/540",
  state: "OPEN",
  headRefName: BRANCH,
  ...overrides,
});

const restPull = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  number: 540,
  html_url: "https://github.com/timurproko/a1/pull/540",
  state: "open",
  merged_at: null,
  head: { ref: BRANCH, repo: { full_name: "timurproko/a1" } },
  base: { repo: { full_name: "timurproko/a1" } },
  ...overrides,
});

const response = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" },
});

describe("branch pull request metadata", () => {
  it.each(["OPEN", "MERGED"])("accepts an exact %s branch association and canonical GitHub URL", state => {
    expect(parsePullRequest(payload({ state }), BRANCH)).toEqual({
      number: 540,
      url: "https://github.com/timurproko/a1/pull/540",
    });
  });

  it("uses a validated merged development preview without invoking discovery", async () => {
    const executeGh = vi.fn(async () => null);
    await expect(readPullRequest(
      "ignored",
      BRANCH,
      new AbortController().signal,
      { [PRODUCT_IDENTITY.environment.prFooterPreview]: payload({ state: "MERGED" }) },
      { executeGh },
    )).resolves.toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    expect(executeGh).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{"],
    ["closed PR", payload({ state: "CLOSED" })],
    ["mismatched branch", payload({ headRefName: "other" })],
    ["nonpositive number", payload({ number: 0 })],
    ["wrong PR path", payload({ url: "https://github.com/timurproko/a1/pull/541" })],
    ["insecure URL", payload({ url: "http://github.com/timurproko/a1/pull/540" })],
    ["non-GitHub host", payload({ url: "https://example.com/timurproko/a1/pull/540" })],
    ["URL credentials", payload({ url: "https://user@github.com/timurproko/a1/pull/540" })],
    ["URL query", payload({ url: "https://github.com/timurproko/a1/pull/540?diff=split" })],
  ])("rejects %s from GitHub CLI", (_label, stdout) => {
    expect(parsePullRequest(stdout, BRANCH)).toBeNull();
  });

  it.each([
    "https://github.com/timurproko/a1.git",
    "ssh://git@github.com/timurproko/a1.git",
    "git@github.com:timurproko/a1.git",
  ])("parses supported GitHub remote %s", remote => {
    expect(parseGitHubRepositoryRemote(remote)).toEqual(REPOSITORY);
  });

  it.each([
    "",
    "https://user@github.com/timurproko/a1.git",
    "https://github.com:8443/timurproko/a1.git",
    "https://example.com/timurproko/a1.git",
    "ssh://other@github.com/timurproko/a1.git",
    "git@github.com:timurproko/a1/extra.git",
    "git@github.com:bad_owner/a1.git",
    "git@github.com:timurproko/../a1.git",
    "git@github.com:timurproko/a1.git\nhttps://github.com/other/repo",
  ])("rejects unsafe or ambiguous remote %s", remote => {
    expect(parseGitHubRepositoryRemote(remote)).toBeNull();
  });

  it.each([
    ["open", restPull()],
    ["merged", restPull({ state: "closed", merged_at: "2026-09-25T10:00:00Z" })],
  ])("accepts one exact %s REST association", (_state, pull) => {
    expect(parseGitHubPullRequests([pull], REPOSITORY, BRANCH)).toEqual({
      number: 540,
      url: "https://github.com/timurproko/a1/pull/540",
    });
  });

  it.each([
    ["non-array", {}],
    ["empty response", []],
    ["closed-unmerged PR", [restPull({ state: "closed" })]],
    ["invalid merge time", [restPull({ state: "closed", merged_at: "not-a-date" })]],
    ["mismatched branch", [restPull({ head: { ref: "other", repo: { full_name: "timurproko/a1" } } })]],
    ["mismatched head repository", [restPull({ head: { ref: BRANCH, repo: { full_name: "other/a1" } } })]],
    ["mismatched base repository", [restPull({ base: { repo: { full_name: "other/a1" } } })]],
    ["unsafe URL", [restPull({ html_url: "https://example.com/timurproko/a1/pull/540" })]],
    ["wrong URL repository", [restPull({ html_url: "https://github.com/other/a1/pull/540" })]],
    ["ambiguous response", [restPull(), restPull({ number: 541, html_url: "https://github.com/timurproko/a1/pull/541" })]],
  ])("rejects REST %s", (_label, value) => {
    expect(parseGitHubPullRequests(value, REPOSITORY, BRANCH)).toBeNull();
  });

  it("prefers a valid GitHub CLI result without calling REST", async () => {
    const executeGh = vi.fn(async () => payload());
    const restProbe = vi.fn(async () => ({ number: 541, url: "https://github.com/timurproko/a1/pull/541" }));
    await expect(readPullRequest("repo", BRANCH, new AbortController().signal, {}, {
      executeGh,
      restProbe,
    })).resolves.toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    expect(restProbe).not.toHaveBeenCalled();
  });

  it("falls back to an unauthenticated exact-head REST request", async () => {
    const fetcher = vi.fn(async (_input: string | URL, _init?: RequestInit): Promise<Response> => response([restPull()]));
    await expect(readPullRequestFromGitHub("repo", BRANCH, new AbortController().signal, {}, {
      readOriginUrl: async () => "git@github.com:timurproko/a1.git",
      fetch: fetcher,
    })).resolves.toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    const endpoint = new URL(url);
    expect(endpoint.origin + endpoint.pathname).toBe("https://api.github.com/repos/timurproko/a1/pulls");
    expect(endpoint.searchParams.get("state")).toBe("all");
    expect(endpoint.searchParams.get("head")).toBe(`timurproko:${BRANCH}`);
    expect(init?.headers).not.toHaveProperty("authorization");
  });

  it.each(["GH_TOKEN", "GITHUB_TOKEN"])("uses optional %s only as an authorization header", async tokenName => {
    const fetcher = vi.fn(async (_input: string | URL, _init?: RequestInit): Promise<Response> => response([restPull()]));
    await readPullRequestFromGitHub("repo", BRANCH, new AbortController().signal, { [tokenName]: "secret-token" }, {
      readOriginUrl: async () => "https://github.com/timurproko/a1.git",
      fetch: fetcher,
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).not.toContain("secret-token");
    expect(init?.headers).toMatchObject({ authorization: "Bearer secret-token" });
  });

  it("falls back when GitHub CLI returns an ineligible payload", async () => {
    const restProbe = vi.fn(async () => ({ number: 540, url: "https://github.com/timurproko/a1/pull/540" }));
    await expect(readPullRequest("repo", BRANCH, new AbortController().signal, {}, {
      executeGh: async () => payload({ state: "CLOSED" }),
      restProbe,
    })).resolves.toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
    expect(restProbe).toHaveBeenCalledOnce();
  });

  it("aborts an active REST fallback with the lifecycle signal", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn((_input: string | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    const result = readPullRequestFromGitHub("repo", BRANCH, controller.signal, {}, {
      readOriginUrl: async () => "git@github.com:timurproko/a1.git",
      fetch: fetcher,
    });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    controller.abort();
    await expect(result).resolves.toBeNull();
  });

  it("fails closed for malformed or oversized REST bodies", async () => {
    const malformed = new Response("{");
    const oversized = new Response(" ".repeat(1024 * 1024 + 1));
    for (const restResponse of [malformed, oversized]) {
      await expect(readPullRequestFromGitHub("repo", BRANCH, new AbortController().signal, {}, {
        readOriginUrl: async () => "git@github.com:timurproko/a1.git",
        fetch: async () => restResponse,
      })).resolves.toBeNull();
    }
  });

  it("fails closed for an invalid origin without issuing REST", async () => {
    const fetcher = vi.fn(async (_input: string | URL, _init?: RequestInit): Promise<Response> => response([restPull()]));
    await expect(readPullRequestFromGitHub("repo", BRANCH, new AbortController().signal, {}, {
      readOriginUrl: async () => "git@example.com:timurproko/a1.git",
      fetch: fetcher,
    })).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([403, 429, 500])("fails closed for REST status %i", async status => {
    await expect(readPullRequestFromGitHub("repo", BRANCH, new AbortController().signal, {}, {
      readOriginUrl: async () => "git@github.com:timurproko/a1.git",
      fetch: async () => response({ message: "unavailable" }, status),
    })).resolves.toBeNull();
  });

  it("cancels discovery before invoking any collaborator", async () => {
    const controller = new AbortController();
    controller.abort();
    const executeGh = vi.fn(async () => payload());
    await expect(readPullRequest("repo", BRANCH, controller.signal, {}, { executeGh })).resolves.toBeNull();
    expect(executeGh).not.toHaveBeenCalled();
  });
});

import { execFile } from "node:child_process";

interface PiPullRequestIdentity {
  readonly number: number;
  readonly url: string;
}

export interface PiGitHubRepositoryIdentity {
  readonly owner: string;
  readonly repository: string;
}

type PiGitHubFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
type PiCommandReader = (cwd: string, signal: AbortSignal) => Promise<string | null>;

export interface PiPullRequestRestDependencies {
  readonly readOriginUrl?: PiCommandReader;
  readonly fetch?: PiGitHubFetch;
}

const PROBE_TIMEOUT_MS = 5_000;
const COMMAND_MAX_BUFFER_BYTES = 64 * 1024;
const RESPONSE_MAX_BUFFER_BYTES = 1024 * 1024;
const GITHUB_API_ORIGIN = "https://api.github.com";

/** Discover one exact branch pull request through GitHub's read-only REST API. */
export async function readPullRequestFromGitHub(
  cwd: string,
  branch: string,
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv = process.env,
  dependencies: PiPullRequestRestDependencies = {},
): Promise<PiPullRequestIdentity | null> {
  if (branch.length === 0 || signal.aborted) return null;
  const remote = await (dependencies.readOriginUrl ?? executeGitOriginUrl)(cwd, signal);
  if (remote === null || signal.aborted) return null;
  const repository = parseGitHubRepositoryRemote(remote);
  if (repository === null) return null;

  const endpoint = new URL(`/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}/pulls`, GITHUB_API_ORIGIN);
  endpoint.searchParams.set("state", "all");
  endpoint.searchParams.set("head", `${repository.owner}:${branch}`);
  endpoint.searchParams.set("per_page", "100");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "a1-pr-footer",
    "x-github-api-version": "2022-11-28",
  };
  const token = environment.GH_TOKEN || environment.GITHUB_TOKEN;
  if (token !== undefined && token.trim().length > 0) headers.authorization = `Bearer ${token}`;

  try {
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(PROBE_TIMEOUT_MS)]);
    const response = await (dependencies.fetch ?? fetch)(endpoint, { headers, signal: requestSignal });
    if (!response.ok || response.redirected) return null;
    const length = response.headers.get("content-length");
    if (length !== null && (!/^\d+$/u.test(length) || Number(length) > RESPONSE_MAX_BUFFER_BYTES)) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > RESPONSE_MAX_BUFFER_BYTES || signal.aborted) return null;
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
    return parseGitHubPullRequests(value, repository, branch);
  } catch {
    return null;
  }
}

/** Parse a supported GitHub origin URL without accepting credentials or non-GitHub hosts. */
export function parseGitHubRepositoryRemote(remote: string): PiGitHubRepositoryIdentity | null {
  const value = remote.trim();
  if (value.length === 0 || /[\r\n]/u.test(value)) return null;
  const scp = /^git@github\.com:([^/]+)\/([^/]+)$/iu.exec(value);
  if (scp !== null) return normalizeRepository(scp[1], scp[2]);

  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "ssh:")
      || url.hostname.toLowerCase() !== "github.com"
      || url.password !== ""
      || url.port !== ""
      || url.search !== ""
      || url.hash !== ""
      || (url.protocol === "https:" && url.username !== "")
      || (url.protocol === "ssh:" && url.username !== "git")) return null;
    const path = /^\/([^/]+)\/([^/]+)$/u.exec(url.pathname);
    return path === null ? null : normalizeRepository(path[1], path[2]);
  } catch {
    return null;
  }
}

/** Validate a GitHub REST pull list as one exact branch association. */
export function parseGitHubPullRequests(
  value: unknown,
  expectedRepository: PiGitHubRepositoryIdentity,
  branch: string,
): PiPullRequestIdentity | null {
  if (!Array.isArray(value)) return null;
  const fullName = `${expectedRepository.owner}/${expectedRepository.repository}`;
  const matches: PiPullRequestIdentity[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)
      || !Number.isSafeInteger(candidate.number)
      || (candidate.number as number) <= 0
      || typeof candidate.html_url !== "string"
      || !isRecord(candidate.head)
      || candidate.head.ref !== branch
      || !isRecord(candidate.head.repo)
      || typeof candidate.head.repo.full_name !== "string"
      || candidate.head.repo.full_name.toLowerCase() !== fullName.toLowerCase()
      || !isRecord(candidate.base)
      || !isRecord(candidate.base.repo)
      || typeof candidate.base.repo.full_name !== "string"
      || candidate.base.repo.full_name.toLowerCase() !== fullName.toLowerCase()) continue;
    const eligible = candidate.state === "open"
      || (candidate.state === "closed" && typeof candidate.merged_at === "string" && Number.isFinite(Date.parse(candidate.merged_at)));
    if (!eligible) continue;
    const pullRequest = normalizePullRequest(candidate.number as number, candidate.html_url, expectedRepository);
    if (pullRequest !== null) matches.push(pullRequest);
  }
  return matches.length === 1 ? matches[0]! : null;
}

function normalizePullRequest(
  number: number,
  value: string,
  expectedRepository: PiGitHubRepositoryIdentity,
): PiPullRequestIdentity | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:"
      || url.hostname.toLowerCase() !== "github.com"
      || url.username !== ""
      || url.password !== ""
      || url.port !== ""
      || url.search !== ""
      || url.hash !== "") return null;
    const path = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/u.exec(url.pathname);
    if (path === null
      || Number(path[3]) !== number
      || path[1]!.toLowerCase() !== expectedRepository.owner.toLowerCase()
      || path[2]!.toLowerCase() !== expectedRepository.repository.toLowerCase()) return null;
    return { number, url: url.href.replace(/\/$/u, "") };
  } catch {
    return null;
  }
}

function normalizeRepository(ownerValue: string | undefined, repositoryValue: string | undefined): PiGitHubRepositoryIdentity | null {
  if (ownerValue === undefined || repositoryValue === undefined) return null;
  const repository = repositoryValue.replace(/\.git$/iu, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/u.test(ownerValue)
    || !/^[A-Za-z0-9_.-]+$/u.test(repository)
    || repository === "."
    || repository === "..") return null;
  return { owner: ownerValue, repository };
}

function executeGitOriginUrl(cwd: string, signal: AbortSignal): Promise<string | null> {
  return new Promise(resolve => {
    try {
      execFile(
        "git",
        ["config", "--get", "remote.origin.url"],
        { cwd, windowsHide: true, timeout: PROBE_TIMEOUT_MS, maxBuffer: COMMAND_MAX_BUFFER_BYTES, signal, encoding: "utf8" },
        (error, stdout) => { resolve(error === null && typeof stdout === "string" ? stdout : null); },
      );
    } catch {
      resolve(null);
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

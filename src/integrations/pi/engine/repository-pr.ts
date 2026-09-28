import { execFile } from "node:child_process";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";

export interface PiPullRequestIdentity {
  readonly number: number;
  readonly url: string;
}

export type PiPullRequestProbe = (
  cwd: string,
  branch: string,
  signal: AbortSignal,
) => Promise<PiPullRequestIdentity | null>;

type PiCommandReader = (cwd: string, signal: AbortSignal) => Promise<string | null>;
type PiPullRequestRestProbe = (
  cwd: string,
  branch: string,
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv,
) => Promise<PiPullRequestIdentity | null>;

export interface PiPullRequestDiscoveryDependencies {
  readonly executeGh?: PiCommandReader;
  readonly restProbe?: PiPullRequestRestProbe;
}

const GH_TIMEOUT_MS = 5_000;
const GH_MAX_BUFFER_BYTES = 64 * 1024;

/** Read an exact branch's open or merged PR, preferring GitHub CLI before the REST fallback. */
export async function readPullRequest(
  cwd: string,
  branch: string,
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv = process.env,
  dependencies: PiPullRequestDiscoveryDependencies = {},
): Promise<PiPullRequestIdentity | null> {
  if (branch.length === 0 || signal.aborted) return null;
  const preview = environment[PRODUCT_IDENTITY.environment.prFooterPreview];
  if (preview !== undefined) return parsePullRequest(preview, branch);

  const stdout = await (dependencies.executeGh ?? executeGh)(cwd, signal);
  if (stdout !== null) {
    const pullRequest = parsePullRequest(stdout, branch);
    if (pullRequest !== null) return pullRequest;
  }
  if (signal.aborted) return null;
  return (dependencies.restProbe ?? readPullRequestFromRest)(cwd, branch, signal, environment);
}

/** Parse and validate the normalized payload emitted by `gh pr view`. */
export function parsePullRequest(stdout: string, branch: string): PiPullRequestIdentity | null {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!isRecord(value)
    || !Number.isSafeInteger(value.number)
    || (value.number as number) <= 0
    || (value.state !== "OPEN" && value.state !== "MERGED")
    || value.headRefName !== branch
    || typeof value.url !== "string") return null;

  const number = value.number as number;
  try {
    const url = new URL(value.url);
    if (url.protocol !== "https:"
      || url.hostname.toLowerCase() !== "github.com"
      || url.username !== ""
      || url.password !== ""
      || url.port !== ""
      || url.search !== ""
      || url.hash !== ""
      || !new RegExp(`^/[^/]+/[^/]+/pull/${number}/?$`, "u").test(url.pathname)) return null;
    return { number, url: url.href.replace(/\/$/u, "") };
  } catch {
    return null;
  }
}

async function readPullRequestFromRest(
  cwd: string,
  branch: string,
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv,
): Promise<PiPullRequestIdentity | null> {
  try {
    const fallback = await import("./repository-pr-rest.js");
    if (signal.aborted) return null;
    return fallback.readPullRequestFromGitHub(cwd, branch, signal, environment);
  } catch {
    return null;
  }
}

function executeGh(cwd: string, signal: AbortSignal): Promise<string | null> {
  return new Promise(resolve => {
    try {
      execFile(
        "gh",
        ["pr", "view", "--json", "number,url,state,headRefName"],
        { cwd, windowsHide: true, timeout: GH_TIMEOUT_MS, maxBuffer: GH_MAX_BUFFER_BYTES, signal, encoding: "utf8" },
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

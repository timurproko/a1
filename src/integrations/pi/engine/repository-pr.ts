import { execFile } from "node:child_process";

export interface PiPullRequestIdentity {
  readonly number: number;
  readonly url: string;
}

export type PiPullRequestProbe = (
  cwd: string,
  branch: string,
  signal: AbortSignal,
) => Promise<PiPullRequestIdentity | null>;

const GH_TIMEOUT_MS = 5_000;
const GH_MAX_BUFFER_BYTES = 64 * 1024;

/** Read the open GitHub pull request associated with one exact local branch. */
export const readOpenPullRequest: PiPullRequestProbe = async (cwd, branch, signal) => {
  if (branch.length === 0 || signal.aborted) return null;
  const stdout = await executeGh(cwd, signal);
  if (stdout === null) return null;
  return parseOpenPullRequest(stdout, branch);
};

export function parseOpenPullRequest(stdout: string, branch: string): PiPullRequestIdentity | null {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!isRecord(value)
    || !Number.isSafeInteger(value.number)
    || (value.number as number) <= 0
    || value.state !== "OPEN"
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

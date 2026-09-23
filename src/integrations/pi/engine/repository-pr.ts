import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { executeAbortableFile } from "./abortable-exec-file.js";

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
export async function readOpenPullRequest(
  cwd: string,
  branch: string,
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<PiPullRequestIdentity | null> {
  if (branch.length === 0 || signal.aborted) return null;
  const preview = environment[PRODUCT_IDENTITY.environment.prFooterPreview];
  if (preview !== undefined) return parseOpenPullRequest(preview, branch);
  const stdout = await executeGh(cwd, signal);
  if (stdout === null) return null;
  return parseOpenPullRequest(stdout, branch);
}

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
  try {
    return executeAbortableFile("gh", ["pr", "view", "--json", "number,url,state,headRefName"], {
      cwd,
      signal,
      timeoutMs: GH_TIMEOUT_MS,
      maxBufferBytes: GH_MAX_BUFFER_BYTES,
    });
  } catch {
    return Promise.resolve(null);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

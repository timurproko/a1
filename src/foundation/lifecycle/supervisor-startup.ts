import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const STARTUP_SCHEMA = "a1-supervisor-startup-v1";
const MAX_RESULT_BYTES = 8 * 1024;
const MAX_MESSAGE_LENGTH = 1_024;
const MAX_RETAINED_RESULTS = 16;
const MAX_RESULT_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const ATTEMPT_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export interface SupervisorStartupAttemptIdentity {
  readonly attemptId: string;
  readonly releaseId: string;
  readonly resultPath: string;
}

export type SupervisorStartupResult = {
  readonly schema: typeof STARTUP_SCHEMA;
  readonly attemptId: string;
  readonly releaseId: string;
  readonly outcome: "ready";
  readonly pid: number;
} | {
  readonly schema: typeof STARTUP_SCHEMA;
  readonly attemptId: string;
  readonly releaseId: string;
  readonly outcome: "failure";
  readonly stage: string;
  readonly code: string | null;
  readonly message: string;
};

/** Create one unguessable startup result authority under the protected runtime root. */
export async function createSupervisorStartupAttempt(runtimeDir: string, releaseId: string): Promise<SupervisorStartupAttemptIdentity> {
  const attemptId = randomUUID();
  const directory = resolve(runtimeDir, "supervisor-startup");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await pruneSupervisorStartupResults(directory);
  return { attemptId, releaseId, resultPath: supervisorStartupResultPath(runtimeDir, attemptId) };
}

export function supervisorStartupResultPath(runtimeDir: string, attemptId: string): string {
  if (!ATTEMPT_PATTERN.test(attemptId)) throw new TypeError("supervisor startup attempt identity is invalid");
  return resolve(runtimeDir, "supervisor-startup", `${attemptId}.json`);
}

/** Atomically publish the bounded result for one detached supervisor startup attempt. */
export async function publishSupervisorStartupResult(path: string, result: SupervisorStartupResult): Promise<void> {
  validateSupervisorStartupResult(result, result.attemptId, result.releaseId);
  const body = `${JSON.stringify(result)}\n`;
  if (Buffer.byteLength(body) > MAX_RESULT_BYTES) throw new Error("supervisor startup result exceeds its size bound");
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, body, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

export async function readSupervisorStartupResult(
  path: string,
  attemptId: string,
  releaseId: string,
): Promise<SupervisorStartupResult | null> {
  let metadata;
  try {
    metadata = await stat(path);
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return null;
    throw error;
  }
  if (!metadata.isFile() || metadata.size > MAX_RESULT_BYTES) throw new Error("supervisor startup result is invalid or oversized");
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  return validateSupervisorStartupResult(value, attemptId, releaseId);
}

export function supervisorStartupFailure(error: unknown, attemptId: string, releaseId: string, stage: string): SupervisorStartupResult {
  const source = error instanceof Error ? error : new Error(String(error));
  return {
    schema: STARTUP_SCHEMA,
    attemptId,
    releaseId,
    outcome: "failure",
    stage: boundedToken(stage, "unknown"),
    code: "code" in source && typeof source.code === "string" ? boundedToken(source.code, "UNKNOWN") : null,
    message: sanitizeMessage(source.message),
  };
}

export function supervisorStartupReady(attemptId: string, releaseId: string): SupervisorStartupResult {
  return { schema: STARTUP_SCHEMA, attemptId, releaseId, outcome: "ready", pid: process.pid };
}

async function pruneSupervisorStartupResults(directory: string): Promise<void> {
  const now = Date.now();
  const entries = await readdir(directory, { withFileTypes: true });
  const files = (await Promise.all(entries.filter(entry => entry.isFile() && entry.name.endsWith(".json")).map(async entry => {
    const path = resolve(directory, entry.name);
    const metadata = await stat(path).catch(() => null);
    return metadata ? { path, modified: metadata.mtimeMs } : null;
  }))).filter((file): file is { path: string; modified: number } => file !== null);
  files.sort((left, right) => right.modified - left.modified);
  await Promise.all(files.flatMap((file, index) => index >= MAX_RETAINED_RESULTS - 1 || now - file.modified > MAX_RESULT_AGE_MS
    ? [rm(file.path, { force: true })]
    : []));
}

function validateSupervisorStartupResult(value: unknown, attemptId: string, releaseId: string): SupervisorStartupResult {
  if (!value || typeof value !== "object") throw new Error("supervisor startup result is malformed");
  const result = value as Partial<SupervisorStartupResult>;
  if (result.schema !== STARTUP_SCHEMA || result.attemptId !== attemptId || result.releaseId !== releaseId) {
    throw new Error("supervisor startup result does not match the selected attempt and release");
  }
  if (result.outcome === "ready" && Number.isSafeInteger(result.pid) && Number(result.pid) > 0) return result as SupervisorStartupResult;
  if (result.outcome === "failure" && typeof result.stage === "string" && result.stage.length > 0 && result.stage.length <= 128
    && (result.code === null || typeof result.code === "string") && typeof result.message === "string" && result.message.length <= MAX_MESSAGE_LENGTH) {
    return result as SupervisorStartupResult;
  }
  throw new Error("supervisor startup result is malformed");
}

function sanitizeMessage(message: string): string {
  let value = message.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/:\/\/[^\s/@:]+:[^\s/@]+@/g, "://<redacted>@");
  for (const [name, secret] of Object.entries(process.env)) {
    if (!secret || secret.length < 4 || !/(?:TOKEN|SECRET|PASSWORD|COOKIE|CREDENTIAL|AUTH)/i.test(name)) continue;
    value = value.split(secret).join("<redacted>");
  }
  return value.trim().slice(0, MAX_MESSAGE_LENGTH) || "supervisor startup failed";
}

function boundedToken(value: string, fallback: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 128);
  return normalized || fallback;
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { TerminalHostArtifactError, verifyTerminalHostArtifact } from "./terminal-host-artifact.js";

export type TerminalHostFallbackReason =
  | "unsupported platform"
  | "no interactive terminal"
  | "terminal host not installed"
  | "terminal host not verified"
  | "host probe failed"
  | "incompatible generation"
  | "registry unreadable"
  | "recovery blocked"
  | "launch not verified"
  | "host startup timed out";

export type EnsureTerminalHostResult =
  | { readonly status: "ready"; readonly executable: string; readonly endpoint: string }
  | { readonly status: "fallback"; readonly reason: TerminalHostFallbackReason };

interface HostCommandResult { readonly code: number; readonly stdout: string; readonly stderr: string }
export interface EnsureTerminalHostOptions {
  readonly releaseRoot: string;
  readonly profileRoot: string;
  readonly dataDir: string;
  readonly runtimeDir: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly timeoutMs?: number;
  readonly maxConcurrentStarts?: number;
  readonly unresponsiveRestartSeconds?: number;
  readonly run?: (executable: string, arguments_: readonly string[], environment: NodeJS.ProcessEnv, timeoutMs: number) => Promise<HostCommandResult>;
  readonly verify?: (executable: string, platform: NodeJS.Platform, architecture: string) => Promise<unknown>;
}

export function resolveTerminalHostPath(
  releaseRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
): string {
  const override = developmentOverride(environment);
  if (override) return resolve(override);
  const executable = platform === "win32" ? `${PRODUCT_IDENTITY.artifacts.nativeExecutable}.exe` : PRODUCT_IDENTITY.artifacts.nativeExecutable;
  return resolve(releaseRoot, "dist", "native", `${platform}-${architecture}`, executable);
}

/** The terminal-host override is a development aid; installed releases always run their own verified artifact. */
function developmentOverride(environment: NodeJS.ProcessEnv): string | undefined {
  if (!environment[PRODUCT_IDENTITY.environment.developmentInstanceId]) return undefined;
  return environment[PRODUCT_IDENTITY.environment.terminalHostPath]?.trim() || undefined;
}

export async function ensureTerminalHost(options: EnsureTerminalHostOptions): Promise<EnsureTerminalHostResult> {
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  if (!supported(platform, architecture)) return { status: "fallback", reason: "unsupported platform" };
  const executable = resolveTerminalHostPath(options.releaseRoot, options.environment, platform, architecture);
  if (developmentOverride(options.environment)) {
    try { await access(executable, constants.R_OK | (platform === "win32" ? 0 : constants.X_OK)); }
    catch { return { status: "fallback", reason: "terminal host not installed" }; }
  } else {
    try { await (options.verify ?? verifyTerminalHostArtifact)(executable, platform, architecture); }
    catch (error) { return { status: "fallback", reason: verificationReason(error) }; }
  }

  const run = options.run ?? runHostCommand;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const common = ["--profile", options.profileRoot, "--data-dir", options.dataDir, "--runtime-dir", options.runtimeDir];
  const environment = { ...options.environment };
  try {
    const probe = await run(executable, ["probe", ...common], environment, Math.min(4_000, timeoutMs));
    const existing = parseResult(probe.stdout);
    if (probe.code === 0) {
      if (existing?.generation === 1 && typeof existing.endpoint === "string") {
        return { status: "ready", executable, endpoint: existing.endpoint };
      }
      return {
        status: "fallback",
        reason: typeof existing?.generation === "number" ? "incompatible generation" : "host probe failed",
      };
    }
    if (probe.code === 4 || existing?.outcome === "incompatible-generation") return { status: "fallback", reason: "incompatible generation" };
    if (existing?.outcome !== "not-running" && probe.code !== 3) return { status: "fallback", reason: classifiedReason(existing?.reason, "host probe failed") };

    const maximum = Math.max(1, Math.min(8, Math.trunc(options.maxConcurrentStarts ?? 2)));
    const unresponsiveRestartSeconds = Math.max(30, Math.min(600, Math.trunc(options.unresponsiveRestartSeconds ?? 120)));
    const start = await run(executable, [
      "server", "--detach", ...common,
      "--max-concurrent-starts", String(maximum),
      "--unresponsive-restart-seconds", String(unresponsiveRestartSeconds),
    ], environment, timeoutMs);
    const started = parseResult(start.stdout);
    if (start.code !== 0) return { status: "fallback", reason: classifiedReason(started?.reason, "launch not verified") };
    if (started?.verified !== true || typeof started.endpoint !== "string") return { status: "fallback", reason: "launch not verified" };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await run(executable, ["probe", ...common], environment, Math.min(1_000, Math.max(1, deadline - Date.now())));
      const ready = parseResult(result.stdout);
      if (result.code === 0) {
        if (ready?.generation === 1 && typeof ready.endpoint === "string") {
          return { status: "ready", executable, endpoint: ready.endpoint };
        }
        return {
          status: "fallback",
          reason: typeof ready?.generation === "number" ? "incompatible generation" : "host probe failed",
        };
      }
      if (result.code === 4 || ready?.outcome === "incompatible-generation") return { status: "fallback", reason: "incompatible generation" };
      await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
    }
    return { status: "fallback", reason: "host startup timed out" };
  } catch (error) {
    return { status: "fallback", reason: isTimeout(error) ? "host startup timed out" : "host probe failed" };
  }
}

function supported(platform: NodeJS.Platform, architecture: string): boolean {
  return (platform === "win32" || platform === "linux") && architecture === "x64"
    || platform === "darwin" && (architecture === "arm64" || architecture === "x64");
}

function verificationReason(error: unknown): TerminalHostFallbackReason {
  if (!(error instanceof TerminalHostArtifactError)) return "terminal host not verified";
  if (error.code === "TERMINAL_HOST_ARTIFACT_MISSING") return "terminal host not installed";
  if (error.code === "TERMINAL_HOST_ARTIFACT_UNSUPPORTED") return "unsupported platform";
  return "terminal host not verified";
}

function parseResult(output: string): Record<string, unknown> | null {
  const line = output.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) return null;
  try { const parsed: unknown = JSON.parse(line); return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; }
  catch { return null; }
}

function classifiedReason(value: unknown, fallback: TerminalHostFallbackReason): TerminalHostFallbackReason {
  if (value === "registry-unreadable") return "registry unreadable";
  if (value === "blocked") return "recovery blocked";
  if (value === "incompatible-generation") return "incompatible generation";
  return fallback;
}

function isTimeout(error: unknown): boolean { return error instanceof Error && "code" in error && error.code === "ETIMEDOUT"; }

async function runHostCommand(executable: string, arguments_: readonly string[], environment: NodeJS.ProcessEnv, timeoutMs: number): Promise<HostCommandResult> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...arguments_], { env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = []; const stderr: Buffer[] = [];
    child.stdout.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", chunk => stderr.push(Buffer.from(chunk)));
    child.once("error", rejectPromise);
    child.once("close", code => { clearTimeout(timer); resolvePromise({ code: code ?? 1, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") }); });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(Object.assign(new Error("terminal host command timed out"), { code: "ETIMEDOUT" }));
    }, timeoutMs);
    timer.unref();
  });
}

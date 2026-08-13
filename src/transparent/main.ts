import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { SupervisorClient } from "../protocol/client.js";
import { resolveAddOnePaths } from "../supervisor/paths.js";
import type { TransparentTerminalLaunchProfile } from "../domain/index.js";
import { runForegroundBroker, type TransparentStopReason } from "./foreground-broker.js";
import { createPlatformTransparentLauncher } from "./native-launcher.js";

export interface TransparentForegroundOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly cwd?: string;
  readonly executable?: string;
  readonly arguments?: readonly string[];
}

export async function runTransparentForeground(options: TransparentForegroundOptions = {}): Promise<number> {
  const environment = { ...(options.environment ?? process.env) };
  const paths = resolveAddOnePaths(environment);
  const client = new SupervisorClient(environment.ADDONE_RELEASE_ID);
  await client.connect(paths.endpoint);
  const ownerId = `foreground-broker-${randomUUID()}`;
  const profile = await launchProfile(environment, options);
  const stop = stopSignal();
  try {
    const result = await runForegroundBroker(
      { leaseId: randomUUID(), generationId: randomUUID(), ownerId, profile, stopRequested: stop.requested },
      client,
      createPlatformTransparentLauncher(),
      randomUUID,
    );
    if (result.outcome.kind === "exited") return result.outcome.exitCode;
    if (result.outcome.kind === "signaled") return 1;
    if (result.outcome.kind === "stopped" || result.outcome.kind === "detached") return 0;
    throw Object.assign(new Error(result.outcome.message), { code: result.outcome.code ?? undefined });
  } finally {
    stop.dispose();
    client.close();
  }
}

async function launchProfile(
  environment: NodeJS.ProcessEnv,
  options: TransparentForegroundOptions,
): Promise<TransparentTerminalLaunchProfile> {
  const executable = options.executable ?? environment.ADDONE_TERMINAL_EXECUTABLE ?? "pi";
  const arguments_ = options.arguments ?? parseArguments(environment.ADDONE_TERMINAL_ARGUMENTS_JSON);
  const cwd = await realpath(options.cwd ?? process.cwd());
  const terminalType = environment.TERM?.trim() || "xterm-256color";
  return {
    id: `transparent-${randomUUID()}`,
    terminalCapability: "transparent",
    executable,
    arguments: arguments_,
    cwd,
    environment: selectedChildEnvironment(environment),
    terminalType,
    dimensions: terminalDimensions(environment),
    ownerDisconnect: "stop",
    recovery: "none",
    surface: "none",
    visualReconnection: "none",
  };
}

function parseArguments(source: string | undefined): readonly string[] {
  if (!source) return [];
  const value: unknown = JSON.parse(source);
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new TypeError("ADDONE_TERMINAL_ARGUMENTS_JSON must be a JSON array of strings");
  }
  return value;
}

function selectedChildEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  const selected: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment)) {
    if (value !== undefined && !name.startsWith("ADDONE_")) selected[name] = value;
  }
  return selected;
}

function terminalDimensions(environment: NodeJS.ProcessEnv) {
  const columns = positiveInteger(environment.COLUMNS) ?? 80;
  const rows = positiveInteger(environment.LINES) ?? 24;
  return { columns: Math.min(500, Math.max(2, columns)), rows: Math.min(300, Math.max(1, rows)) };
}

function positiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function stopSignal() {
  let resolveStop!: (reason: TransparentStopReason) => void;
  let settled = false;
  const requested = new Promise<TransparentStopReason>(resolve => { resolveStop = resolve; });
  const request = (reason: TransparentStopReason) => {
    if (settled) return;
    settled = true;
    resolveStop(reason);
  };
  const onSigterm = () => request("user-request");
  // The attached child shares foreground signal delivery. Keep the broker alive
  // without translating or forwarding Ctrl+C.
  const onSigint = () => undefined;
  process.once("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  return {
    requested,
    dispose() {
      process.off("SIGTERM", onSigterm);
      process.off("SIGINT", onSigint);
    },
  };
}

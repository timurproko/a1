import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { loadProcessGuardianAddon, type ProcessGuardianAddon } from "../process-containment/index.js";

interface ExitWatcherOptions {
  readonly guardianPid: number;
  readonly noticePath: string;
  readonly encodedModes: string;
  readonly addonPath: string;
  readonly runtimePid: number;
  readonly processGroup: number | null;
  readonly foregroundGroup: number | null;
}

/** Waits outside launch containment, then performs the cleanup its dead guardian could not. */
export async function runExitWatcher(
  arguments_: readonly string[],
  platform: NodeJS.Platform = process.platform,
  loadAddon: (path: string) => ProcessGuardianAddon = loadProcessGuardianAddon,
): Promise<number> {
  const options = parseArguments(arguments_);
  const addon = loadAddon(options.addonPath);
  if (platform === "win32") addon.ignoreConsoleControl();
  else {
    process.on("SIGINT", ignoreSignal);
    process.on("SIGTTOU", ignoreSignal);
  }

  try {
    await addon.waitForProcessExit(options.guardianPid);
    if (platform === "win32") {
      // Rationale: job termination is asynchronous; keep the runtime's final frame ahead of the notice.
      await Promise.race([
        addon.waitForProcessExit(options.runtimePid),
        delay(2_000),
      ]);
    } else if (options.processGroup !== null) {
      addon.stopProcessGroup(options.processGroup);
      if (options.foregroundGroup !== null) addon.restoreForegroundGroup(options.foregroundGroup);
    }
    addon.deliverExitNotice(options.noticePath, options.encodedModes);
    return 0;
  } finally {
    if (platform !== "win32") {
      process.off("SIGINT", ignoreSignal);
      process.off("SIGTTOU", ignoreSignal);
    }
  }
}

export function exitWatcherArguments(options: ExitWatcherOptions): string[] {
  return [
    "--guardian-pid", String(options.guardianPid),
    "--notice", options.noticePath,
    "--modes", options.encodedModes,
    "--addon", options.addonPath,
    "--runtime-pid", String(options.runtimePid),
    ...(options.processGroup === null ? [] : ["--process-group", String(options.processGroup)]),
    ...(options.foregroundGroup === null ? [] : ["--foreground-group", String(options.foregroundGroup)]),
  ];
}

function parseArguments(arguments_: readonly string[]): ExitWatcherOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!name?.startsWith("--") || value === undefined || values.has(name)) throw new TypeError("exit watcher arguments are malformed");
    values.set(name, value);
  }
  const guardianPid = positiveInteger(values.get("--guardian-pid"), "guardian PID");
  const runtimePid = positiveInteger(values.get("--runtime-pid"), "runtime PID");
  const noticePath = boundedValue(values.get("--notice"), "notice path");
  const encodedModes = boundedValue(values.get("--modes"), "terminal modes", 32_768);
  const addonPath = boundedValue(values.get("--addon"), "addon path");
  const processGroup = optionalPositiveInteger(values.get("--process-group"), "process group");
  const foregroundGroup = optionalPositiveInteger(values.get("--foreground-group"), "foreground group");
  const expected = 5 + (processGroup === null ? 0 : 1) + (foregroundGroup === null ? 0 : 1);
  if (values.size !== expected) throw new TypeError("exit watcher received an unknown argument");
  return { guardianPid, noticePath, encodedModes, addonPath, runtimePid, processGroup, foregroundGroup };
}

function positiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new TypeError(`exit watcher ${name} must be a positive safe integer`);
  return parsed;
}

function optionalPositiveInteger(value: string | undefined, name: string): number | null {
  return value === undefined ? null : positiveInteger(value, name);
}

function boundedValue(value: string | undefined, name: string, limit = 4_096): string {
  if (!value || value.length > limit || value.includes("\0")) throw new TypeError(`exit watcher ${name} is invalid`);
  return value;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

function ignoreSignal(): void {}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  void runExitWatcher(process.argv.slice(2)).then(
    code => process.exit(code),
    error => {
      process.stderr.write(`a1 exit watcher: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(2);
    },
  );
}

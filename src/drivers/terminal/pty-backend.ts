import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, extname, isAbsolute, join } from "node:path";
import { platform } from "node:os";
import * as pty from "node-pty";
import { FULL_VIEWPORT_NATIVE_PROJECTION, type TerminalAgentProfile, type TerminalDimensions } from "../../domain/index.js";

export interface TerminalProcess {
  readonly pid: number;
  onData(listener: (data: string) => void): void;
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): void;
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(): void;
}

export interface TerminalProcessBackend {
  readonly platform: NodeJS.Platform;
  spawn(profile: TerminalAgentProfile, environment: Readonly<Record<string, string>>): TerminalProcess;
  stop(process: TerminalProcess): void;
}

export class NodePtyProcessBackend implements TerminalProcessBackend {
  constructor(readonly platform: NodeJS.Platform = process.platform) {}

  spawn(profile: TerminalAgentProfile, environment: Readonly<Record<string, string>>): TerminalProcess {
    const launch = resolveTerminalLaunch(profile, environment, this.platform);
    return pty.spawn(launch.executable, launch.arguments, {
      name: profile.terminalType,
      cols: profile.dimensions.columns,
      rows: profile.dimensions.rows,
      cwd: profile.cwd,
      env: { ...environment },
      useConpty: this.platform === "win32",
    });
  }

  stop(process: TerminalProcess): void {
    if (this.platform === "win32") spawnSync("taskkill", ["/PID", String(process.pid), "/T", "/F"], { windowsHide: true });
    else process.kill();
  }
}

export interface TerminalLaunchSpec {
  readonly executable: string;
  readonly arguments: string[];
}

export function resolveTerminalLaunch(
  profile: TerminalAgentProfile,
  environment: Readonly<Record<string, string>>,
  currentPlatform: NodeJS.Platform = platform(),
): TerminalLaunchSpec {
  const resolved = resolveExecutable(profile.executable, environment, currentPlatform);
  const commandScript = currentPlatform === "win32" && [".cmd", ".bat"].includes(extname(resolved).toLowerCase());
  return commandScript
    ? { executable: environment.ComSpec ?? "cmd.exe", arguments: ["/d", "/s", "/c", resolved, ...profile.arguments] }
    : { executable: resolved, arguments: [...profile.arguments] };
}

export function defaultShellProfile(
  id: string,
  cwd: string,
  dimensions: TerminalDimensions,
  environment: Readonly<Record<string, string>> = {},
  currentPlatform: NodeJS.Platform = process.platform,
): TerminalAgentProfile {
  const executable = currentPlatform === "win32"
    ? environment.ComSpec ?? process.env.ComSpec ?? "cmd.exe"
    : environment.SHELL ?? process.env.SHELL ?? "/bin/sh";
  return {
    id,
    kind: "shell",
    executable,
    arguments: currentPlatform === "win32" ? ["/d"] : ["-i"],
    cwd,
    environment,
    terminalType: "xterm-256color",
    dimensions,
    projection: FULL_VIEWPORT_NATIVE_PROJECTION,
    conptyMouseFallback: "none",
    resume: "none",
    shellIntegration: "none",
  };
}

function resolveExecutable(executable: string, environment: Readonly<Record<string, string>>, currentPlatform: NodeJS.Platform): string {
  if (isAbsolute(executable)) {
    if (!existsSync(executable)) throw new Error(`executable not found: ${executable}`);
    return executable;
  }
  const extensions = currentPlatform === "win32" ? (environment.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const directory of (environment.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = join(directory, currentPlatform === "win32" ? `${executable}${extension.toLowerCase()}` : executable);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`executable '${executable}' was not found on PATH`);
}

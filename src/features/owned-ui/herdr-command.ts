import { spawn } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join, resolve } from "node:path";

export interface HerdrCommandResult { readonly ok: boolean; readonly settled: boolean; readonly stdout: string }
export type HerdrCommandPort = (arguments_: readonly string[]) => Promise<HerdrCommandResult>;
interface CommandOptions { readonly environment?: NodeJS.ProcessEnv; readonly platform?: NodeJS.Platform; readonly timeoutMs?: number; readonly maxBytes?: number }

/** Bounded local Core invocation. Literal args never pass through an interpolated shell command. */
export function createHerdrCommand(options: CommandOptions = {}): HerdrCommandPort {
  const environment = options.environment ?? process.env, platform = options.platform ?? process.platform;
  const timeoutMs = options.timeoutMs ?? 750, maxBytes = options.maxBytes ?? 128 * 1024;
  return async arguments_ => {
    try {
      const executable = await boundedResolution(environment, platform);
      if (!executable) return { ok: false, settled: true, stdout: "" };
      return await execute(executable, arguments_, environment, timeoutMs, maxBytes);
    } catch { return { ok: false, settled: true, stdout: "" }; }
  };
}

async function boundedResolution(environment: NodeJS.ProcessEnv, platform: NodeJS.Platform) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A late filesystem probe can finish, but can never spawn after its caller abandons resolution.
    return await Promise.race([resolveCommand(environment, platform), new Promise<undefined>(done => { timer = setTimeout(() => done(undefined), 200); })]);
  } finally { clearTimeout(timer); }
}

async function resolveCommand(environment: NodeJS.ProcessEnv, platform: NodeJS.Platform): Promise<{ file: string; prefix: string[] } | undefined> {
  const pathKey = Object.keys(environment).find(key => platform === "win32" ? key.toUpperCase() === "PATH" : key === "PATH");
  const paths = (pathKey ? environment[pathKey] ?? "" : "").split(platform === "win32" ? ";" : delimiter).filter(Boolean).slice(0, 128);
  for (const path of paths) {
    if (platform !== "win32") {
      const file = join(path, "hc");
      try { await access(file, constants.X_OK); if ((await stat(file)).isFile()) return { file, prefix: [] }; } catch {}
      continue;
    }
    const file = join(path, "hc.exe");
    try { if ((await stat(file)).isFile()) return { file, prefix: [] }; } catch {}
    // npm shims name a literal node_modules script; never execute arbitrary batch/shell text.
    for (const name of ["hc.cmd", "hc"]) {
      try {
        const shim = join(path, name);
        if ((await stat(shim)).size > 16_384) continue;
        const source = await readFile(shim, "utf8");
        const relative = source.match(/(?:%dp0%|\$basedir)[\\/]((?:node_modules)[\\/][^"\r\n]+\.js)/u)?.[1];
        if (!relative || relative.split(/[\\/]/u).some(part => part === "..")) continue;
        const script = resolve(path, relative.replaceAll("\\", "/"));
        if ((await stat(script)).isFile()) return { file: process.execPath, prefix: [script] };
      } catch {}
    }
  }
  return undefined;
}

function execute(executable: { file: string; prefix: string[] }, arguments_: readonly string[], environment: NodeJS.ProcessEnv, timeoutMs: number, maxBytes: number): Promise<HerdrCommandResult> {
  return new Promise(done => {
    const child = spawn(executable.file, [...executable.prefix, ...arguments_], { env: environment, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
    let stdout = "", bytes = 0, failed = false, complete = false;
    let settlement: ReturnType<typeof setTimeout> | undefined;
    const finish = (settled: boolean, ok = false) => {
      if (complete) return; complete = true;
      clearTimeout(deadline); clearTimeout(settlement);
      child.stdout.removeAllListeners("data"); child.stderr.removeAllListeners("data");
      done({ ok: ok && !failed, settled, stdout: failed ? "" : stdout });
    };
    const stop = () => {
      if (failed) return; failed = true;
      try { child.kill("SIGKILL"); } catch { /* Settlement, not kill success, owns fence release. */ }
      settlement = setTimeout(() => finish(false), 250);
    };
    const deadline = setTimeout(stop, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) stop(); else if (!failed) stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) stop(); });
    child.once("error", () => { failed = true; finish(true); });
    child.once("close", code => finish(true, code === 0));
  });
}

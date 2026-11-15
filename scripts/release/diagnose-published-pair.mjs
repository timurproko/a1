import { execFile as execFileCallback } from "node:child_process";
import { mkdir, open, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { resolveInstallerNpmCli, sanitizeDiagnostic } from "../../packages/a1-install/bin/a1-install.js";
import { smokePublishedInstaller } from "./smoke-published-installer.mjs";
import { createPublishedSmokeRunner } from "./published-smoke-processes.mjs";

const execFile = promisify(execFileCallback);

/** Retain bounded, redacted tails only; raw observer files never enter the uploaded artifact. */
export async function collectPublishedPairDiagnostics(directory, environment = process.env) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const diagnostics = {};
  for (const entry of entries.filter(entry => entry.isFile() && /^(?:\d+\.jsonl|worker-stderr-\d+\.log)$/u.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100)) {
    const file = await open(resolve(directory, entry.name), "r");
    try {
      const { size } = await file.stat();
      const buffer = Buffer.alloc(Math.min(size, 32_000));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
      let text = buffer.subarray(0, bytesRead).toString("utf8");
      for (const [key, secret] of Object.entries(environment)) {
        if (/token|password|secret|auth/iu.test(key) && typeof secret === "string" && secret.length >= 8) text = text.replaceAll(secret, "[redacted]");
      }
      diagnostics[entry.name] = text.split(/\r?\n/u).map(line => sanitizeDiagnostic(line)).filter(Boolean).slice(-80).join("\n").slice(-16_000);
    } finally { await file.close(); }
  }
  return diagnostics;
}

/** Exercise existing registry bytes on a hosted runner without rebuilding, staging, or promoting. */
export async function diagnosePublishedPair(environment = process.env) {
  const version = environment.PUBLISHED_PAIR_DIAGNOSTIC_VERSION;
  if (!/^\d+\.\d+\.\d+(?:-dev\.[1-9]\d*)?$/u.test(version ?? "")) throw new Error("invalid published-pair diagnostic version");
  const observerMode = environment.PUBLISHED_PAIR_OBSERVER_MODE ?? "stderr";
  if (!["none", "events", "stderr"].includes(observerMode)) throw new Error("invalid published-pair observer mode");
  const npmCli = resolveInstallerNpmCli(environment);
  const integrity = async name => {
    const { stdout } = await execFile(process.execPath, [npmCli, "view", `${name}@${version}`, "dist.integrity", "--json"], {
      env: environment, encoding: "utf8", timeout: 30_000, windowsHide: true, maxBuffer: 64_000,
    });
    const value = JSON.parse(stdout);
    if (typeof value !== "string" || !value.startsWith("sha512-")) throw new Error("published-pair diagnostic requires existing registry integrity");
    return value;
  };
  const applicationName = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")).name;
  const installerName = JSON.parse(await readFile(new URL("../../packages/a1-install/package.json", import.meta.url), "utf8")).name;
  const [application, installer] = await Promise.all([integrity(applicationName), integrity(installerName)]);
  const raw = resolve(".artifacts", "published-pair-diagnostic-raw");
  const output = resolve(".artifacts", "validation", "published-pair-diagnostic");
  await mkdir(raw, { recursive: true });
  await mkdir(output, { recursive: true });
  const observer = new URL("./published-pair-observer.mjs", import.meta.url).href;
  const observed = {
    ...environment,
    RELEASE_VERSION: version, RELEASE_CHANNEL: version.includes("-dev.") ? "next" : "latest",
    EXPECTED_APPLICATION_INTEGRITY: application, EXPECTED_INSTALLER_INTEGRITY: installer,
    PUBLISHED_INSTALLER_EVIDENCE: resolve(output, "smoke.json"),
    PUBLISHED_PAIR_OBSERVER_DIR: raw,
    PUBLISHED_PAIR_OBSERVER_MODE: observerMode,
    ...(observerMode === "none" ? {} : { NODE_OPTIONS: `${environment.NODE_OPTIONS ?? ""} --import=${observer}`.trim() }),
  };
  try {
    await smokePublishedInstaller({ environment: observed, createRunner: root => {
      const runner = createPublishedSmokeRunner(root);
      return { ...runner, async run(command, args, options) {
        process.stdout.write(`[published-pair diagnostic] ${args[0] ?? "install"} started\n`);
        return await runner.run(command, args, { ...options, timeout: Math.min(options.timeout, 5 * 60_000) });
      } };
    } });
  } finally {
    await writeFile(resolve(output, "worker-diagnostics.json"), `${JSON.stringify({
      version, observerMode, processes: await collectPublishedPairDiagnostics(raw, environment),
    }, null, 2)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await diagnosePublishedPair(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}

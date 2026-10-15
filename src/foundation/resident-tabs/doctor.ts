import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir, release as osRelease } from "node:os";
import { basename, dirname, resolve, sep } from "node:path";
import { resolveTerminalHostPath } from "./ensure-terminal-host.js";
import type { MaintenanceReport } from "./maintenance.js";
import { TERMINAL_HOST_MANIFEST_FILENAME, verifyTerminalHostArtifact } from "./terminal-host-artifact.js";
import { encodeZip, type ZipEntry } from "./zip-archive.js";

export const DOCTOR_MAX_BYTES = 25 * 1024 * 1024;

export interface DoctorOptions {
  /** The profile's resident state directory, as reported by the terminal host. */
  readonly stateDir: string;
  readonly hostStatus: MaintenanceReport;
  readonly releaseRoots: readonly string[];
  readonly settings: { readonly tabsMax: number; readonly tabsAutoName: boolean };
  readonly home?: string;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly now?: Date;
  readonly maxBytes?: number;
}

export interface DoctorBundle {
  readonly path: string;
  readonly bytes: number;
  readonly dropped: readonly string[];
}

const LOG_NAME = /^terminal-host-[a-z0-9-]+\.log(?:\.(\d{1,2}))?$/u;
const CRASH_NAME = /^crash-[a-z0-9-]+\.json$/u;

/**
 * Writes an owner-only diagnostic bundle by allowlist: structured logs, crash records, host
 * status, a redacted registry, the owner marker without secrets, artifact verification, platform
 * facts, and the Tabs settings. Secrets, tokens, environment values, prompt journals, drafts,
 * last screens, the private child-stderr sink, and terminal content are never read.
 */
export async function writeDoctorBundle(options: DoctorOptions): Promise<DoctorBundle> {
  const home = options.home ?? homedir();
  const redact = (value: string) => homeRelative(value, home);
  const now = options.now ?? new Date();
  const maxBytes = options.maxBytes ?? DOCTOR_MAX_BYTES;
  const diagnostics = resolve(options.stateDir, "diagnostics");
  const names = await readdir(diagnostics).catch(() => [] as string[]);

  const fixed: ZipEntry[] = [
    json("host-status.json", redactHostStatus(options.hostStatus, redact)),
    json("registry.json", await redactedRegistry(resolve(options.stateDir, "registry.json"), redact)),
    json("server-marker.json", await redactedMarker(resolve(options.stateDir, "server.json"), redact)),
    json("artifacts.json", await artifactFacts(options.releaseRoots, options.platform ?? process.platform, options.architecture ?? process.arch, redact)),
    json("platform.json", {
      platform: options.platform ?? process.platform,
      architecture: options.architecture ?? process.arch,
      osRelease: osRelease(),
      node: process.version,
      detachmentMode: (options.hostStatus.result as { detachmentMode?: unknown } | undefined)?.detachmentMode ?? null,
    }),
    json("settings.json", { tabsMax: options.settings.tabsMax, tabsAutoName: options.settings.tabsAutoName }),
  ];
  const crashes: ZipEntry[] = [];
  for (const name of names.filter(name => CRASH_NAME.test(name)).sort()) {
    crashes.push({ name: `crashes/${name}`, data: await readFile(resolve(diagnostics, name)) });
  }
  // Rationale: when the bundle would exceed its cap, the oldest log generations go first.
  const logs = names
    .filter(name => LOG_NAME.test(name))
    .map(name => ({ name, generation: Number(LOG_NAME.exec(name)?.[1] ?? 0) }))
    .sort((left, right) => left.generation - right.generation || left.name.localeCompare(right.name));
  const dropped: string[] = [];
  const included: ZipEntry[] = [...fixed, ...crashes];
  let budget = maxBytes - 64 * 1024 - included.reduce((total, entry) => total + entry.data.length, 0);
  for (const log of logs) {
    const size = (await stat(resolve(diagnostics, log.name))).size;
    if (size > budget) {
      dropped.push(log.name);
      continue;
    }
    budget -= size;
    included.push({ name: `logs/${log.name}`, data: await readFile(resolve(diagnostics, log.name)) });
  }
  const manifest = [
    "a1 tabs doctor bundle",
    `created: ${now.toISOString()}`,
    ...included.map(entry => `included: ${entry.name}`),
    ...dropped.map(name => `dropped to stay within ${maxBytes} bytes: logs/${name}`),
    "",
  ].join("\n");
  const archive = encodeZip([{ name: "manifest.txt", data: Buffer.from(manifest, "utf8") }, ...included], now);
  const directory = resolve(options.stateDir, "doctor");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = resolve(directory, `a1-tabs-doctor-${now.toISOString().replace(/[:.]/gu, "-")}.zip`);
  await writeFile(path, archive, { mode: 0o600, flag: "wx" });
  return { path, bytes: archive.length, dropped };
}

function json(name: string, value: unknown): ZipEntry {
  return { name, data: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8") };
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function homeRelative(value: string, home: string): string {
  const normalized = resolve(value);
  const root = resolve(home);
  const comparable = (path: string) => process.platform === "win32" ? path.toLowerCase() : path;
  if (comparable(normalized) === comparable(root)) return "~";
  return comparable(normalized).startsWith(comparable(`${root}${sep}`)) ? `~${normalized.slice(root.length).replaceAll("\\", "/")}` : normalized;
}

function redactHostStatus(report: MaintenanceReport, redact: (value: string) => string): unknown {
  const result = report.result ? { ...report.result } : undefined;
  if (result && Array.isArray(result.logs)) result.logs = result.logs.map(path => typeof path === "string" ? basename(path) : null);
  if (result && typeof result.release === "string") result.release = redact(result.release);
  return {
    host: report.host,
    pid: report.pid ?? null,
    exitCode: report.exitCode,
    result: result ?? null,
  };
}

async function redactedRegistry(path: string, redact: (value: string) => string): Promise<unknown> {
  let document: { registryRevision?: unknown; epoch?: unknown; tabs?: unknown };
  try {
    document = JSON.parse(await readFile(path, "utf8")) as typeof document;
  } catch (error) {
    return { readable: false, reason: error instanceof Error && "code" in error ? String(error.code) : "unparseable" };
  }
  const tabs = Array.isArray(document.tabs) ? document.tabs as Record<string, unknown>[] : [];
  const text = (value: unknown) => typeof value === "string" ? value : null;
  return {
    readable: true,
    registryRevision: document.registryRevision ?? null,
    epoch: document.epoch ?? null,
    tabs: tabs.map(tab => {
      const sessionFile = text(tab.sessionFile);
      return {
        tabId: text(tab.tabId),
        // Security: names can be generated from prompts, so only a stable hash is kept.
        nameHash: text(tab.displayName) === null ? null : stableHash(text(tab.displayName)!),
        nameSource: text(tab.nameSource),
        order: tab.order ?? null,
        cwd: text(tab.cwd) === null ? null : redact(text(tab.cwd)!),
        sessionDirectory: sessionFile === null ? null : redact(dirname(sessionFile)),
        sessionFileHash: sessionFile === null ? null : stableHash(basename(sessionFile)),
        desired: text(tab.desired),
        lifecycle: text(tab.lifecycle),
        incarnation: tab.incarnation ?? null,
        holderPid: tab.holderPid ?? null,
        childPid: tab.childPid ?? null,
        release: text(tab.release) === null ? null : redact(text(tab.release)!),
        lastExit: text(tab.lastExit),
        restarts: tab.restarts ?? null,
      };
    }),
  };
}

async function redactedMarker(path: string, redact: (value: string) => string): Promise<unknown> {
  try {
    const marker = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    return {
      present: true,
      pid: marker.pid ?? null,
      generation: marker.generation ?? null,
      verified: marker.verified ?? null,
      detachmentMode: marker.detachmentMode ?? null,
      releaseRoot: typeof marker.releaseRoot === "string" ? redact(marker.releaseRoot) : null,
    };
  } catch {
    return { present: false };
  }
}

async function artifactFacts(roots: readonly string[], platform: NodeJS.Platform, architecture: string, redact: (value: string) => string): Promise<unknown> {
  const facts = [];
  for (const root of roots) {
    const executable = resolveTerminalHostPath(root, {}, platform, architecture);
    const manifest = await readFile(resolve(dirname(executable), TERMINAL_HOST_MANIFEST_FILENAME), "utf8")
      .then(text => JSON.parse(text) as unknown)
      .catch(() => null);
    const verification = await verifyTerminalHostArtifact(executable, platform, architecture)
      .then(() => "verified")
      .catch((error: unknown) => error instanceof Error && "code" in error ? String(error.code) : "failed");
    facts.push({ releaseRoot: redact(root), verification, manifest });
  }
  return facts;
}

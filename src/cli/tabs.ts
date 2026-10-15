import { resolveProductPaths } from "../foundation/lifecycle/index.js";
import { CohortStateStore } from "../foundation/release/index.js";
import {
  readResidentTabLaunchSettings,
  runTerminalHostMaintenance,
  writeDoctorBundle,
  type MaintenanceReport,
} from "../foundation/resident-tabs/index.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../product-identity.js";
import type { TabsRequest } from "./tabs-request.js";

export type { TabsRequest } from "./tabs-request.js";

export interface TabsCommandOptions {
  /** The running package root; its terminal host is a candidate after the active release. */
  readonly packageRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly maintenance?: typeof runTerminalHostMaintenance;
  readonly doctor?: typeof writeDoctorBundle;
}

/** `a1 tabs`: inspect or stop resident tabs without attaching, and never start a host to report state. */
export async function runTabsCommand(request: TabsRequest, options: TabsCommandOptions = {}): Promise<number> {
  const environment = options.environment ?? process.env;
  const stdout = options.stdout ?? (message => process.stdout.write(message));
  const stderr = options.stderr ?? (message => process.stderr.write(message));
  const paths = resolveProductPaths(environment);
  const profileRoot = environment[PRODUCT_IDENTITY.environment.profileHome] ?? paths.configDir;
  const releaseRoots = await installedReleaseRoots(paths.dataDir, options.packageRoot);
  const maintenance = options.maintenance ?? runTerminalHostMaintenance;
  const report = await maintenance({
    action: request.action === "doctor" ? "host-status" : request.action,
    ...(request.tabId === undefined ? {} : { tabId: request.tabId }),
    profileRoot,
    dataDir: paths.dataDir,
    runtimeDir: paths.runtimeDir,
    releaseRoots,
    environment,
  });

  if (request.action === "doctor") {
    if (!report.stateDir) {
      stderr(`${PRODUCT_TEXT.diagnostic(`tabs doctor could not locate resident state: ${report.message ?? report.host}`)}\n`);
      return 1;
    }
    const settings = await readResidentTabLaunchSettings(environment.PI_CODING_AGENT_DIR ?? paths.configDir, PRODUCT_IDENTITY.commandName, paths.configDir, "a1");
    const bundle = await (options.doctor ?? writeDoctorBundle)({
      stateDir: report.stateDir,
      hostStatus: report,
      releaseRoots,
      settings: { tabsMax: settings.tabsMax, tabsAutoName: settings.tabsAutoName },
    });
    if (request.json) stdout(`${JSON.stringify({ schema: "a1-tabs-doctor-v1", path: bundle.path, bytes: bundle.bytes, dropped: bundle.dropped })}\n`);
    else stdout(`Wrote ${bundle.path}\n`);
    return 0;
  }

  if (request.json) {
    const { exitCode: _exitCode, ...printed } = report;
    stdout(`${JSON.stringify(printed)}\n`);
  } else {
    const text = describe(request, report);
    if (report.exitCode === 0) stdout(text);
    else stderr(text);
  }
  return report.exitCode === 0 ? 0 : 1;
}

async function installedReleaseRoots(dataDir: string, packageRoot: string | undefined): Promise<string[]> {
  const roots: string[] = [];
  try {
    const state = await new CohortStateStore(dataDir).read();
    for (const id of [state.references.active, state.references.rollback]) {
      if (id && state.releases[id]) roots.push(state.releases[id].releaseRoot);
    }
    roots.push(...Object.values(state.releases).map(record => record.releaseRoot));
  } catch {
    // Rationale: unreadable release state still leaves the running package's own host.
  }
  if (packageRoot) roots.push(packageRoot);
  return [...new Set(roots)];
}

const NO_TABS = "No resident tabs are running.\n";

function describe(request: TabsRequest, report: MaintenanceReport): string {
  const command = PRODUCT_TEXT.commandName;
  if (report.host === "none") return NO_TABS;
  if (report.host === "unavailable") return `${PRODUCT_TEXT.diagnostic(`tabs could not run maintenance: ${report.message ?? "terminal host unavailable"}`)}\n`;
  if (report.host === "unresponsive") {
    return `The resident host (pid ${report.pid ?? "unknown"}) is not responding. Run \`${command} tabs host stop\` to stop it.\n`;
  }
  if (report.host === "incompatible") {
    return `${PRODUCT_TEXT.diagnostic(report.message ?? "running tabs use another version")} Run \`${command} tabs host stop\` from that version.\n`;
  }
  if (report.host === "unverifiable" || report.host === "refused") {
    return `${PRODUCT_TEXT.diagnostic(report.message ?? "the resident host could not be verified; nothing was changed")}\n`;
  }
  const result = report.result ?? {};
  if (request.action === "list") return listing(result);
  if (request.action === "host-status") return status(result);
  if (request.action === "host-stop") {
    if (report.host === "stopped") return "Stopped every tab and the resident host.\n";
    return `Could not stop every tab: ${remaining(result)}. The host is still running.\n`;
  }
  if (result.accepted === false && typeof result.message === "string") {
    return `${PRODUCT_TEXT.diagnostic(`tabs stop: ${result.message === "unknown tab" ? `no tab ${request.tabId ?? ""}` : result.message}`)}\n`;
  }
  const stopped = Array.isArray(result.stopped) ? result.stopped.length : 0;
  if (result.accepted === false) return `Could not stop: ${remaining(result)}.\n`;
  if (request.action === "stop") return `Stopped tab ${request.tabId ?? ""}; its session can be resumed.\n`;
  return stopped === 0 ? NO_TABS : `Stopped ${stopped} tab${stopped === 1 ? "" : "s"}; their sessions can be resumed.\n`;
}

function remaining(result: Record<string, unknown>): string {
  return Array.isArray(result.remaining) && result.remaining.length > 0 ? result.remaining.join(", ") : "unknown tabs";
}

function listing(result: Record<string, unknown>): string {
  const tabs = Array.isArray(result.tabs) ? result.tabs as Record<string, unknown>[] : [];
  if (tabs.length === 0) return NO_TABS;
  const rows = [
    ["ID", "NAME", "STATUS", "CWD", "RELEASE", "HOLDER"],
    ...tabs.map(tab => [tab.tabId, tab.name, tab.status, tab.cwd, tab.release, tab.holderPid ?? "-"].map(value => String(value ?? "-"))),
  ];
  const widths = rows[0]!.map((_, column) => Math.max(...rows.map(row => row[column]!.length)));
  return `${rows.map(row => row.map((cell, column) => column === row.length - 1 ? cell : cell.padEnd(widths[column]!)).join("  ")).join("\n")}\n`;
}

function status(result: Record<string, unknown>): string {
  const limits = (result.limits ?? {}) as Record<string, unknown>;
  const counters = (result.counters ?? {}) as Record<string, unknown>;
  const byStatus = (result.tabsByStatus ?? {}) as Record<string, unknown>;
  const lines = [
    `pid: ${String(result.pid ?? "-")}`,
    `build: ${String(result.build ?? "-")}`,
    `release: ${String(result.release ?? "-")}`,
    `generation: ${String(result.generation ?? "-")}`,
    `epoch: ${String(result.epoch ?? "-")}`,
    `uptime: ${String(result.uptimeSeconds ?? "-")}s`,
    `detachment: ${String(result.detachmentMode ?? "unknown")}${result.detachmentVerified === false ? " (not verified)" : ""}`,
    `tabs: ${String(result.tabs ?? 0)}${Object.keys(byStatus).length > 0 ? ` (${Object.entries(byStatus).map(([key, value]) => `${key} ${String(value)}`).join(", ")})` : ""}`,
    `clients: ${String(result.clients ?? 0)}`,
    `limits: ${Object.entries(limits).map(([key, value]) => `${key} ${String(value)}`).join(", ")}`,
    `counters: ${Object.entries(counters).map(([key, value]) => `${key} ${String(value)}`).join(", ")}`,
    ...(Array.isArray(result.logs) ? result.logs.map(path => `log: ${String(path)}`) : []),
  ];
  return `${lines.join("\n")}\n`;
}

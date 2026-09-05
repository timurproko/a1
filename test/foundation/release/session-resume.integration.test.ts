import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resolveCohortEndpoint, resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";
import { readEndpointMetadata, releaseVerifiedIdleOwner } from "../../../src/foundation/release/index.js";
import { writeResumeFixture } from "../../support/session-resume-fixture.js";
import { extractValidationCandidate, loadValidationCandidate } from "./package-candidate-fixture.js";

let extracted: Awaited<ReturnType<typeof extractValidationCandidate>>;
let environment: NodeJS.ProcessEnv;
let cwd: string;
let store: string;
let sequence = 0;
const children = new Set<ChildProcess>();
const closedChildren = new WeakSet<ChildProcess>();

beforeAll(async () => {
  const candidate = await loadValidationCandidate();
  expect(candidate.manifest.dependencies?.["@earendil-works/pi-coding-agent"]).toBe("0.84.2");
  extracted = await extractValidationCandidate(candidate.bytes);
  cwd = resolve(extracted.root, "work space");
  const home = resolve(extracted.root, "home");
  const agent = resolve(home, ".a1", "agent");
  await Promise.all([mkdir(cwd), mkdir(agent, { recursive: true })]);
  // Security: no inherited product state, shell initialization, credentials, or model traffic.
  environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(A1_|PI_|BASH_ENV$|ENV$)|API_KEY|TOKEN|SECRET|AUTH/i.test(key)));
  Object.assign(environment, {
    HOME: home, USERPROFILE: home, A1_PROFILE_HOME: home,
    XDG_CONFIG_HOME: resolve(home, ".config"),
    A1_DATA_DIR: resolve(extracted.root, "data"), A1_RUNTIME_DIR: resolve(extracted.root, "runtime"),
    A1_CONFIG_DIR: resolve(extracted.root, "config"), A1_DATABASE_PATH: resolve(extracted.root, "data", "control.sqlite3"),
    PI_SESSION_ID: "stale-parent-id", PI_SESSION_FILE: "stale-parent.jsonl",
  });
  await writeFile(resolve(agent, "auth.json"), JSON.stringify({ openai: { type: "api_key", key: "offline-fixture-never-sent" } }));
  await writeFile(resolve(agent, "settings.json"), JSON.stringify({ enabledModels: [], defaultProvider: "openai", defaultModel: "gpt-5" }));
  vi.stubEnv("PI_CODING_AGENT_DIR", agent);
  vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", undefined);
  store = SessionManager.create(cwd).getSessionDir();
}, 30_000);

afterEach(async () => {
  await Promise.all([...children].map(closeLaunch));
}, 35_000);

afterAll(async () => {
  for (const child of children) await closeLaunch(child);
  if (environment) await stopSupervisor();
  vi.unstubAllEnvs();
  if (extracted) await rm(extracted.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}, 30_000);

describe("same-pin resume through the exact packaged public launch chain", () => {
  it.each([false, true])("creates, exits, and executes the default-store hint (compacted: %s)", async compacted => {
    const saved = await writeResumeFixture(store, cwd, { compacted });
    const before = await readFile(saved.path);
    const direct = SessionManager.open(saved.path).buildSessionContext();
    expect(direct.messages.map(message => message.role)).toEqual(compacted ? ["compactionSummary", "user", "assistant"] : ["user", "assistant"]);
    expect(JSON.stringify(direct.messages)).toContain(saved.marker);
    const first = await launch(["--session", saved.path]);
    await first.ready(saved.marker);
    expect(first.output()).toContain(saved.marker);
    await first.close();
    const hint = resumeHint(first.output());
    expect(hint).toBe(`a1 --session ${saved.id}`);
    const resumed = await launchHint(hint);
    await resumed.ready(saved.marker);
    expect(resumed.output()).toContain(saved.marker);
    await resumed.close();
    expect(resumeHint(resumed.output())).toBe(hint);
    expect(await readFile(saved.path)).toEqual(before);
    expect(SessionManager.open(saved.path).buildSessionContext()).toEqual(direct);
    await assertIdle();
  }, 120_000);

  it("preserves spaces/apostrophes through Git Bash quoting and a supervisor restart", async () => {
    const directory = resolve(extracted.root, "session's custom store");
    const saved = await writeResumeFixture(directory, cwd, { compacted: true });
    const first = await launch(["--session", saved.id, "--session-dir", directory]);
    await first.ready();
    await first.close();
    const hint = resumeHint(first.output());
    expect(hint).toContain("--session-dir");
    expect(hint).toContain(saved.id);
    await stopSupervisor();
    const restarted = await launchHint(hint);
    await restarted.ready(saved.marker);
    expect(restarted.output()).toContain(saved.marker);
    await restarted.close();
    expect(resumeHint(restarted.output())).toBe(hint);
    expect(await restarted.trace()).toContain('"phase":"replacement-supervisor-ready"');
    await assertIdle();
  }, 120_000);

  it("cancels a cross-project fork cleanly without writing a fork", async () => {
    const other = resolve(extracted.root, "other project");
    await mkdir(other);
    const foreignStore = resolve(extracted.root, "foreign-store");
    const saved = await writeResumeFixture(foreignStore, other);
    const before = await readFile(saved.path);
    const selected = await launch(["--session", saved.id, "--session-dir", foreignStore]);
    await until(async () => selected.output().includes("Fork this session into current directory?"), () => selected.output());
    selected.child.stdin!.write("n\n");
    expect(await selected.exited()).toBe(0);
    expect(selected.output()).toContain("Session resume cancelled.");
    expect(selected.output()).not.toContain("To resume this session:");
    expect(await readFile(saved.path)).toEqual(before);
    expect((await SessionManager.list(cwd, foreignStore)).some(session => session.parentSessionPath === saved.path)).toBe(false);
    await assertIdle();
  }, 120_000);

  it("keeps a bare launch fresh despite inherited session metadata", async () => {
    const fresh = await launch([]);
    await fresh.ready();
    await fresh.close();
    expect(fresh.output()).not.toContain("resume-proof-");
    expect(fresh.output()).not.toContain("To resume this session:");
    await assertIdle();
  }, 120_000);

  it("reports invalid targets through containment without creating replacement sessions", async () => {
    const before = (await SessionManager.list(cwd)).map(session => session.id);
    for (const target of ["unknown-id", resolve(cwd, "missing.jsonl")]) {
      const child = await launch(["--session", target]);
      expect(await child.exited()).toBe(1);
      expect(child.output()).toMatch(/No session found matching|Session file does not exist/);
      expect(child.output()).not.toContain("To resume this session:");
      expect(child.output()).not.toContain("at openSelectedPiSession");
      await assertIdle();
    }
    expect((await SessionManager.list(cwd)).map(session => session.id)).toEqual(before);
  }, 120_000);

  it("keeps simultaneous resume selections and cleanup independent", async () => {
    const a = await writeResumeFixture(store, cwd);
    const b = await writeResumeFixture(store, cwd, { compacted: true });
    const [first, second] = await Promise.all([launch(["--session", a.id]), launch(["--session", b.id])]);
    await Promise.all([first.ready(a.marker), second.ready(b.marker)]);
    expect(first.output()).toContain(a.marker);
    expect(first.output()).not.toContain(b.marker);
    expect(second.output()).toContain(b.marker);
    expect(second.output()).not.toContain(a.marker);
    const active = await endpoint();
    expect(active?.ownership.liveInstanceIds).toHaveLength(2);
    await first.close();
    await until(async () => (await endpoint())?.ownership.liveInstanceIds.length === 1);
    expect(second.child.exitCode).toBeNull();
    await second.close();
    await assertIdle();
  }, 120_000);
});

function resumeHint(output: string): string {
  const match = output.match(/To resume this session: (a1[^\r\n]*)/);
  if (!match) throw new Error(`No exit hint from packaged entry: ${output}`);
  return match[1]!.trim();
}

async function launchHint(hint: string) {
  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  // Compatibility: exercise user-shell grammar with the test's a1 function bound to the exact candidate.
  const command = `a1() { ${quote(process.execPath.replace(/\\/g, "/"))} ${quote(resolve(extracted.packageRoot, "bin", "cli.js").replace(/\\/g, "/"))} "$@"; }; ${hint}`;
  return launch([], { command: "bash", args: ["--noprofile", "--norc", "-c", command] });
}

async function launch(args: string[], shell?: { command: string; args: string[] }) {
  const tracePath = resolve(extracted.root, `launch-${++sequence}.jsonl`);
  const child = spawn(shell?.command ?? process.execPath, shell?.args ?? [resolve(extracted.packageRoot, "bin", "cli.js"), ...args], {
    cwd, env: { ...environment, A1_STARTUP_TRACE: tracePath }, windowsHide: true, stdio: "pipe",
  });
  children.add(child);
  let output = "";
  let spawnError: Error | undefined;
  child.on("error", error => { spawnError = error; });
  child.on("close", () => { closedChildren.add(child); });
  child.stdout!.on("data", data => { output += data.toString(); });
  child.stderr!.on("data", data => { output += data.toString(); });
  const trace = () => readFile(tracePath, "utf8").catch(() => "");
  return {
    child, trace,
    output: () => stripVTControlCharacters(output),
    async ready(marker?: string) {
      await until(async () => {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null) throw new Error(`Packaged launch exited before input ready: ${output}`);
        return (await trace()).includes('"phase":"first-input-ready-render"') && (marker === undefined || stripVTControlCharacters(output).includes(marker));
      }, () => `Packaged launch not ready: ${output}`);
      const source = await trace();
      for (const phase of ["bootstrap-selected", "guardian-start", "ui-entry", "session-created"]) expect(source).toContain(`"phase":"${phase}"`);
    },
    async exited() {
      await until(async () => {
        if (spawnError) throw spawnError;
        return closedChildren.has(child);
      }, () => `Packaged launch did not exit: ${output}`);
      children.delete(child);
      return child.exitCode;
    },
    async close() {
      await closeLaunch(child);
      expect(child.exitCode, output).toBe(0);
    },
  };
}

async function closeLaunch(child: ChildProcess): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    child.stdin?.write("\u0004");
  }
  await until(async () => closedChildren.has(child), () => "Packaged launch did not close after Ctrl+D");
  children.delete(child);
}

async function endpoint() {
  const paths = resolveProductPaths(environment);
  const state = JSON.parse(await readFile(resolve(paths.dataDir, "release-state.json"), "utf8")) as { references: { active: string } };
  return readEndpointMetadata(resolveCohortEndpoint(paths, state.references.active, environment).endpointMetadataPath);
}

async function assertIdle() {
  await until(async () => (await endpoint())?.ownership.liveInstanceIds.length === 0);
}

async function stopSupervisor() {
  const owner = await endpoint().catch(() => null);
  if (!owner) return;
  await assertIdle();
  const idle = await endpoint();
  if (idle) expect(await releaseVerifiedIdleOwner(idle, resolveProductPaths(environment).dataDir)).toBe(true);
}

async function until(predicate: () => Promise<boolean>, message = () => "Timed out waiting for isolated launch state") {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  throw new Error(message());
}

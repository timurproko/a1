import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { chmod, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { connect, type Socket } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";
import { once } from "node:events";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "../../src/foundation/resident-tabs/protocol.js";
import type { PredecessorFixture } from "./predecessor-fixture.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const execute = promisify(execFile);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
type RecordValue = Record<string, unknown>;
interface Tab { tabId: string; kind: string; incarnation: number; holderPid: number; childPid: number; sessionFile: string | null }

/** Owns one fixture client only; closing it never sends Agent stop/restart or replays input. */
class Client {
  readonly socket: Socket;
  readonly frames: ResidentEnvelope[] = [];
  readonly surfaces = new Map<string, ResidentEnvelope>();
  failure: Error | undefined;
  recoveryExpected = false;
  private sequence = 0;
  private constructor(socket: Socket) {
    this.socket = socket;
    const decoder = new ResidentFrameDecoder();
    socket.on("error", error => { this.failure = error; });
    socket.on("end", () => { this.failure ??= new Error("fixture control connection closed"); });
    socket.on("data", bytes => {
      try {
        for (const frame of decoder.push(bytes)) {
          if (frame.type === "surface") this.surfaces.set(String(frame.body.tabId), frame);
          else if (frame.type === "recovery.notice" && frame.body.accepted === false) this.failure = new Error(`fixture recovery failed: ${String(frame.body.message)}`);
          else if (frame.type === "input.rejected" || (frame.type === "input.uncertain" && !this.recoveryExpected) || frame.type === "error") this.failure = new Error(`fixture input failed: ${frame.type}`);
          else if (frame.type !== "tab.status") this.frames.push(frame);
          if (this.frames.length > 256) throw new Error("fixture control bound exceeded");
        }
      } catch (error) { this.failure = error instanceof Error ? error : new Error("invalid fixture frame"); socket.destroy(); }
    });
  }
  static async open(endpoint: string, releaseId: string, token: Uint8Array): Promise<Client> {
    const socket = connect(endpoint); const client = new Client(socket);
    await Promise.race([once(socket, "connect"), delay(5_000).then(() => { throw new Error("fixture connect deadline"); })]);
    client.send("hello", { role: "attach", generation: 1, build: "continuity-fixture", releaseId, features: ["structured-surface", "semantic-input", "terminal-effects"], token: [...token] }, 1);
    await client.take("welcome");
    return client;
  }
  send(type: string, body: RecordValue, requestId?: number): void {
    this.socket.write(encodeResidentFrame({ type, body, ...(requestId === undefined ? {} : { requestId }) }));
  }
  key(text?: string): void {
    this.send("input.event", { seq: ++this.sequence, epoch: 0, event: { kind: "key", key: text === undefined ? "enter" : "unidentified", mods: 0, ...(text === undefined ? {} : { text }) } });
  }
  async take(type: string): Promise<ResidentEnvelope> {
    return await until(() => {
      if (this.failure) throw this.failure;
      const index = this.frames.findIndex(frame => frame.type === type);
      return index < 0 ? undefined : this.frames.splice(index, 1)[0];
    }, `fixture ${type}`);
  }
  async text(id: string, includes: string): Promise<string> {
    return await until(() => {
      if (this.failure) throw this.failure;
      const body = this.surfaces.get(id)?.body;
      if (!body) return undefined;
      const state = body.structured as { rowData: { cells: { text: string }[] }[] } | undefined;
      const text = state?.rowData.map(row => row.cells.map(cell => cell.text).join("")).join("\n")
        ?? Buffer.from(body.bytes as Uint8Array).toString("utf8");
      return text.includes(includes) ? text : undefined;
    }, `fixture retained text ${includes}`).catch(error => {
      throw new Error(`${String(error)}; controlled fixture surface keys=${[...this.surfaces.keys()].join(",")}`);
    });
  }
  close(): void { this.socket.end(); this.socket.destroy(); }
}
async function until<T>(probe: () => T | undefined | Promise<T | undefined>, label: string, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const result = await probe(); if (result !== undefined) return result; await delay(25); }
  throw new Error(`${label} did not become ready`);
}

/** Actual published native host and real A1 engines, with model traffic confined to a held loopback stream. */
export async function exerciseResidentPredecessor(priorRoot: string, candidateRoot: string, fixture: PredecessorFixture): Promise<void> {
  const root = await fixture.temporaryRoot("resident-predecessor-");
  // Rationale: macOS's long per-user temporary directory exceeds the Unix socket path budget.
  const runtime = await fixture.temporaryRuntimeRoot();
  const profile = join(root, "profile"), data = join(root, "data"), cwd = join(root, "project");
  for (const directory of [profile, data, runtime, cwd]) { await mkdir(directory, { recursive: true }); if (process.platform !== "win32") await chmod(directory, 0o700); }
  const toolScript = join(root, "held-tool.cjs"), toolIdentity = join(root, "tool.identity.json"), toolRelease = join(root, "tool.release"), toolDone = join(root, "tool.done"), toolStarts = join(root, "tool.starts"), toolProgress = join(root, "tool.progress");
  const nodeMainCompatibility = join(root, "node-main-compatibility.cjs");
  await writeFile(nodeMainCompatibility, `const prefix = String.fromCharCode(92, 92, 63, 92);\nif (process.platform === "win32" && process.argv[1]?.startsWith(prefix)) process.argv[1] = process.argv[1].slice(4);\n`);
  await writeFile(toolScript, `const fs=require('node:fs'),crypto=require('node:crypto');
const [identity,release,done,starts,progress]=process.argv.slice(2),me={pid:process.pid,nonce:crypto.randomUUID()};
fs.appendFileSync(starts,JSON.stringify(me)+'\\n');fs.writeFileSync(identity,JSON.stringify(me),{flag:'wx'});let tick=0;
const timer=setInterval(()=>{if(fs.existsSync(release)){fs.writeFileSync(done,me.nonce);clearInterval(timer);console.log('fixture-tool-complete');}else fs.writeFileSync(progress,String(++tick));},50);\n`);
  const quote = (path: string) => `'${path.replaceAll("\\", "/").replaceAll("'", "'\"'\"'")}'`;
  const toolCommand = [process.execPath, toolScript, toolIdentity, toolRelease, toolDone, toolStarts, toolProgress].map(quote).join(" ");
  let requests = 0; let titleRequests = 0; let followups = 0; let queuedRequests = 0; let released = false;
  let providerFailure: Error | undefined;
  const server = createServer((request, response) => {
    void (async () => {
      if (request.method !== "POST" || request.url !== "/v1/chat/completions") { response.writeHead(404).end(); return; }
      const chunks: Buffer[] = []; let bytes = 0; for await (const chunk of request) { bytes += chunk.length; if (bytes > 1024 * 1024) throw new Error("fixture request bound"); chunks.push(Buffer.from(chunk)); }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { stream?: boolean; messages?: { role: string; content: unknown }[] };
      const content = body.messages?.findLast(message => message.role === "user")?.content;
      const prompt = typeof content === "string" ? content : Array.isArray(content)
        ? content.map(part => (part as { text?: string }).text ?? "").join("") : "";
      const title = prompt.startsWith("Name this coding task with a lowercase hyphenated title");
      const suggestion = prompt.startsWith("[NEXT USER INPUT]");
      const queued = prompt === "continuity-queued";
      if (!title && !suggestion && !queued && !/^continuity-request-[01]$/u.test(prompt)) throw new Error("Unexpected controlled fixture request");
      const followup = !title && !suggestion && body.messages?.some(message => message.role === "tool");
      const tool = !title && !suggestion && !followup && prompt === "continuity-request-1";
      const requestId = title ? `title-${++titleRequests}` : suggestion ? "suggestion" : queued ? `queued-${++queuedRequests}` : followup ? `followup-${++followups}` : `turn-${++requests}`;
      const delta = tool ? { tool_calls: [{ index: 0, id: "call_continuity_tool", type: "function", function: { name: "bash", arguments: JSON.stringify({ command: toolCommand }) } }] }
        : { content: title ? "fixture-task" : suggestion ? "" : " retained-stream " };
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (finish: boolean) => response.write(`data: ${JSON.stringify({ id: `resident-${requestId}`, object: "chat.completion.chunk", created: 1, model: "continuity-model", choices: [{ index: 0, delta: finish ? {} : delta, finish_reason: finish ? tool ? "tool_calls" : "stop" : null }] })}\n\n`);
      chunk(false);
      while (!title && !suggestion && !queued && !tool && !followup && !released && !response.destroyed) await delay(50);
      if (!response.destroyed) { chunk(true); response.end("data: [DONE]\n\n"); }
    })().catch(error => { providerFailure = error instanceof Error ? error : new Error("fixture provider failed"); response.destroy(); });
  });
  await writeFile(join(profile, "auth.json"), "{}");
  await mkdir(join(profile, ".pi", "agent"), { recursive: true });
  await writeFile(join(profile, ".pi", "agent", "auth.json"), "{}");
  const priorManifest = JSON.parse(await readFile(join(priorRoot, "package.json"), "utf8")) as { version: string };
  await writeFile(join(profile, "settings.json"), JSON.stringify({ defaultProvider: "fixture", defaultModel: "continuity-model", defaultProjectTrust: "always", promptSuggestions: false, lastChangelogVersion: priorManifest.version, [PRODUCT_IDENTITY.commandName]: { tabsAutoName: false } }));
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(environment)) if (/^(LAUNCH_CONTEXT_|A1_|PI_)/iu.test(key)
    || /(?:TOKEN|API_KEY|SECRET|PASSWORD|CREDENTIAL|COOKIE)/iu.test(key)
    || ["NODE_OPTIONS", "NODE_PATH", "NODE_USE_ENV_PROXY", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"].includes(key.toUpperCase())) delete environment[key];
  Object.assign(environment, { HOME: profile, USERPROFILE: profile, A1_PROFILE_HOME: profile, A1_CONFIG_DIR: profile, A1_DATA_DIR: data, A1_RUNTIME_DIR: runtime, A1_DATABASE_PATH: join(root, "control.sqlite3"), PI_CODING_AGENT_DIR: profile, A1_SKIP_VERSION_CHECK: "1", TERM: "xterm-256color", LAUNCH_CONTEXT_PROFILE: "a1", LAUNCH_CONTEXT_MODE: "tabs" });
  const publishedEnvironment = { ...environment };
  // Node 22 rejects a Windows verbatim path as its main script unless realpath resolution is
  // disabled. Published hosts canonicalize their immutable release root to that path form; keep
  // exercising their exact bytes while the candidate proves its native launch-path correction.
  if (process.platform === "win32" && process.versions.node.startsWith("22.")) {
    publishedEnvironment.NODE_OPTIONS = `--preserve-symlinks-main --require=${JSON.stringify(nodeMainCompatibility.replaceAll("\\", "/"))}`;
  }
  const common = ["--profile", profile, "--data-dir", data, "--runtime-dir", runtime];
  const entry = (packageRoot: string) => join(packageRoot, "dist", "foundation", "resident-tabs", "host-entry.js");
  const call = async (packageRoot: string, args: string[]) => {
    const launchEnvironment = packageRoot === priorRoot ? publishedEnvironment : environment;
    const result = await execute(process.execPath, [entry(packageRoot), ...args, ...common], { env: { ...launchEnvironment, LAUNCH_CONTEXT_RELEASE_ROOT: packageRoot }, windowsHide: true, timeout: 90_000, maxBuffer: 2 * 1024 * 1024 });
    return JSON.parse(result.stdout.trim()) as RecordValue;
  };
  const state = async (packageRoot: string) => {
    const expected = await realpath(packageRoot);
    for (const name of await readdir(join(data, "tabs"))) {
      const directory = join(data, "tabs", name);
      try {
        const marker = JSON.parse(await readFile(join(directory, "server.json"), "utf8")) as RecordValue;
        if (typeof marker.releaseRoot === "string" && await realpath(marker.releaseRoot) === expected) return { marker, directory };
      } catch { /* Invariant: a concurrently disappearing foreign fixture marker is never adopted. */ }
    }
    throw new Error("fixture source marker absent");
  };
  const registry = async (packageRoot: string) => JSON.parse(await readFile(join((await state(packageRoot)).directory, "registry.json"), "utf8")) as { tabs: Tab[] };
  const clients: Client[] = []; const processes: ChildProcess[] = [];
  let startedPrior = false, startedCandidate = false;
  const open = async (packageRoot: string, endpoint?: string) => {
    const current = await state(packageRoot);
    const client = await Client.open(endpoint ?? String(current.marker.endpoint), String(current.marker.releaseId), await readFile(join(current.directory, "client-token")));
    clients.push(client); return client;
  };
  const proxy = async () => {
    const child = spawn(process.execPath, [entry(candidateRoot), "workspace-proxy", ...common], { env: { ...environment, LAUNCH_CONTEXT_RELEASE_ROOT: candidateRoot }, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    processes.push(child); child.stdin!.on("error", () => {});
    let output = ""; let failure = "";
    child.stdout!.on("data", bytes => { output += bytes.toString(); if (output.length > 4096) child.kill(); });
    child.stderr!.on("data", bytes => { failure = `${failure}${bytes.toString()}`.slice(-2000); });
    const endpoint = await until(() => {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`fixture proxy exited: ${failure}`);
      const line = output.split("\n")[0]; return line ? String((JSON.parse(line) as RecordValue).endpoint) : undefined;
    }, "published source proxy");
    return { child, client: await open(candidateRoot, endpoint) };
  };
  try {
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address(); if (!address || typeof address === "string") throw new Error("fixture provider address");
    await writeFile(join(profile, "models.json"), JSON.stringify({ providers: { fixture: {
      baseUrl: `http://127.0.0.1:${address.port}/v1`, api: "openai-completions", apiKey: "fixture", models: [{ id: "continuity-model", name: "continuity-model", contextWindow: 32000, maxTokens: 4096 }],
    } } }));
    startedPrior = true; await call(priorRoot, ["server", "--detach"]);
    for (let index = 0; index < 3; index++) await call(priorRoot, ["internal", "tab-create", "--cwd", cwd, "--release-root", priorRoot, "--node-executable", process.execPath]);
    const tabs = await until(async () => { const tabs = (await registry(priorRoot)).tabs.filter(tab => tab.kind === "agent"); return tabs.length === 3 && tabs.every(tab => tab.childPid) ? tabs : undefined; }, "three published Agents");
    const old = await open(priorRoot); await old.take("attached");
    let generation = 1;
    for (let index = 0; index < 2; index++) {
      old.send("tab.view", { tab_id: tabs[index]!.tabId, request_generation: ++generation, resize: { columns: 100, rows: 28, epoch: 0, geometry_generation: 0 } });
      await old.text(tabs[index]!.tabId, "continuity-model");
      const prompt = `continuity-request-${index}`;
      old.key(prompt);
      await old.text(tabs[index]!.tabId, prompt);
      old.key();
      await until(() => { if (providerFailure) throw providerFailure; return requests === index + 1 ? true : undefined; }, "held provider turn");
    }
    old.send("tab.view", { tab_id: tabs[0]!.tabId, request_generation: ++generation, resize: { columns: 100, rows: 28, epoch: 0, geometry_generation: 0 } });
    await old.text(tabs[0]!.tabId, "continuity-model");
    old.key("continuity-queued"); await old.text(tabs[0]!.tabId, "continuity-queued"); old.key();
    const runningTool = await until(async () => {
      try { return JSON.parse(await readFile(toolIdentity, "utf8")) as { pid: number; nonce: string }; } catch { return undefined; }
    }, "running published bash tool");
    const progressBefore = await until(async () => { const tick = Number(await readFile(toolProgress, "utf8").catch(() => "")); return tick > 0 ? tick : undefined; }, "published tool progress");
    process.kill(runningTool.pid, 0);
    old.close(); await delay(250);
    const before = (await registry(priorRoot)).tabs.filter(tab => tab.kind === "agent");
    const titlesBeforeUpdate = titleRequests;
    await call(candidateRoot, ["workspace-check"]);
    startedCandidate = true; await call(candidateRoot, ["server", "--detach"]);
    const first = await proxy(); const admission = (await first.client.take("attached")).body;
    const listed = (admission.initialTabs as { tabs: { tabId: string }[] }).tabs;
    assert.equal(listed.length, 3); assert.equal(requests, 2);
    const idle = listed[2]!.tabId;
    first.client.send("tab.view", { tab_id: idle, request_generation: 2, resize: { columns: 100, rows: 28, epoch: 0, geometry_generation: 0 } });
    await first.client.text(idle, "continuity-model");
    first.client.key("unsent-retained-draft");
    await first.client.text(idle, "unsent-retained-draft");
    const oldServerPid = Number((await state(priorRoot)).marker.pid);
    first.client.recoveryExpected = true;
    first.client.surfaces.clear();
    process.kill(oldServerPid, "SIGKILL");
    await until(async () => {
      try { const source = await state(priorRoot); return Number(source.marker.pid) !== oldServerPid && source.marker.verified === true ? true : undefined; }
      catch { return undefined; }
    }, "originating coordinator recovery");
    first.client.send("tab.view", { tab_id: idle, request_generation: 3, resize: { columns: 100, rows: 28, epoch: 0, geometry_generation: 0 } });
    await first.client.text(idle, "unsent-retained-draft");
    first.client.key(" after-recovery");
    await first.client.text(idle, "unsent-retained-draft after-recovery");
    first.client.recoveryExpected = false;
    assert.deepEqual(JSON.parse(await readFile(toolIdentity, "utf8")), runningTool);
    process.kill(runningTool.pid, 0);
    first.client.close(); first.child.kill("SIGKILL");
    await until(() => first.child.exitCode !== null || first.child.signalCode !== null ? true : undefined, "hard updated client exit");
    await delay(250);
    const second = await proxy(); const restored = (await second.client.take("attached")).body;
    assert.equal(restored.selectedTab, idle);
    await second.client.text(idle, "unsent-retained-draft after-recovery");
    assert.equal(requests, 2); assert.equal(followups, 0); assert.equal(queuedRequests, 0);
    assert.deepEqual(JSON.parse(await readFile(toolIdentity, "utf8")), runningTool);
    process.kill(runningTool.pid, 0);
    await until(async () => Number(await readFile(toolProgress, "utf8")) > progressBefore ? true : undefined, "same tool progressing after reconnect");
    await writeFile(toolRelease, "release");
    released = true;
    for (const [index, tab] of listed.entries()) {
      second.client.send("tab.view", { tab_id: tab.tabId, request_generation: 4 + index, resize: { columns: 100, rows: 28, epoch: 0, geometry_generation: 0 } });
      await second.client.text(tab.tabId, "continuity-model");
    }
    let settledStatuses: unknown;
    await until(async () => {
      const report = await call(priorRoot, ["tabs", "list"]);
      const all = (report.result as { tabs: { status: string; lifecycle: string }[] }).tabs;
      settledStatuses = all.map(tab => ({ status: tab.status, lifecycle: tab.lifecycle }));
      return all.length === 3 && all.every(tab => tab.status === "idle" || tab.status === "done" || tab.status === "done-unseen") ? true : undefined;
    }, "settled published turns").catch(error => { throw new Error(`${String(error)}; metadata=${JSON.stringify(settledStatuses)}; requests=${requests}; followups=${followups}; provider=${providerFailure?.message ?? "healthy"}`); });
    await delay(1500);
    const after = (await registry(priorRoot)).tabs.filter(tab => tab.kind === "agent");
    for (const previous of before) {
      const current = after.find(tab => tab.tabId === previous.tabId);
      assert.ok(current);
      for (const key of ["tabId", "incarnation", "holderPid", "childPid", "sessionFile"] as const) assert.equal(current[key], previous[key]);
    }
    assert.equal(requests, 2); assert.equal(followups, 1); assert.equal(queuedRequests, 1); assert.equal(titleRequests, titlesBeforeUpdate); assert.equal(providerFailure, undefined);
    assert.equal(await readFile(toolDone, "utf8"), runningTool.nonce);
    assert.equal((await readFile(toolStarts, "utf8")).trim().split("\n").length, 1);
    assert.deepEqual(JSON.parse(await readFile(toolIdentity, "utf8")), runningTool);
  } finally {
    let safe = true;
    released = true;
    await writeFile(toolRelease, "release").catch(() => { safe = false; });
    for (const client of clients) client.close();
    for (const child of processes) { if (!child.stdin?.destroyed) child.stdin?.end(); if (child.exitCode === null && child.signalCode === null) { child.kill(); await Promise.race([once(child, "exit"), delay(5000)]); } }
    for (const [packageRoot, started] of [[priorRoot, startedPrior], [candidateRoot, startedCandidate]] as const) {
      if (!started) continue;
      try { const report = await call(packageRoot, ["tabs", "host-stop"]); safe &&= report.host === "stopped" || report.host === "none"; }
      catch { safe = false; }
    }
    const ownedTool = await readFile(toolIdentity, "utf8").then(text => JSON.parse(text) as { pid: number }).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") safe = false;
      return undefined;
    });
    if (!ownedTool && await readFile(toolStarts, "utf8").then(() => true, () => false)) safe = false;
    if (ownedTool) {
      try { await until(() => { try { process.kill(ownedTool.pid, 0); return undefined; } catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH" ? true : undefined; } }, "owned fixture tool exit", 5000); }
      catch { safe = false; }
    }
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    if (!safe) { fixture.retainForUnverifiedResident(root); throw new Error("resident predecessor cleanup unverified; fixture roots retained"); }
  }
  await fixture.discard(root);
}

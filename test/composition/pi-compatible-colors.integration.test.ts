import { execFile, spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeStartupTrace } from "../../src/foundation/startup/index.js";
import { assertIntegrationResponse, parseIntegrationRequest } from "../../src/features/integration-api/index.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { HERDR_IDENTITY_LABELS as LABELS } from "../../src/features/owned-ui/herdr-binding.js";
import { fixtureColorTargets, freshHerdrColorBinding, syncFixtureColors, type FixtureColorTarget, type FixtureColorTerminal } from "./fixtures/herdr-color-consumer.js";

const execute = promisify(execFile);
let root = "", packageRoot = "";
const launches: Array<{ child: ChildProcess; stop(): Promise<void> }> = [];
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "compatible-colors-")));
  const packed = await execute("bash", ["-c", 'npm pack --ignore-scripts --json --pack-destination "$1"', "pack", root], { timeout: 30_000 });
  await execute("tar", ["-xzf", JSON.parse(packed.stdout)[0].filename], { cwd: root, timeout: 15_000 });
  packageRoot = join(root, "package");
  await symlink(resolve("node_modules"), join(packageRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
}, 60_000);
afterAll(async () => {
  for (const launch of launches) await launch.stop();
  if (root) await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}, 60_000);

async function until(predicate: () => Promise<boolean>, diagnostic: () => string = () => "fixture not ready", budget = 30_000) {
  const deadline = Date.now() + budget;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(done => setTimeout(done, 50));
  }
  throw new Error(diagnostic());
}
async function readJson(file: string) { return JSON.parse(await readFile(file, "utf8")); }

async function fixture(machine: string) {
  const home = join(root, machine), agentDir = join(home, ".a1", "agent"), commands = join(home, "commands");
  const cwd = join(home, "workspace"), core = join(home, "core.json"), extension = join(home, "lifecycle.ts");
  const script = join(commands, "node_modules", "core-fixture", "cli.js");
  await Promise.all([mkdir(agentDir, { recursive: true }), mkdir(resolve(script, ".."), { recursive: true }), mkdir(cwd, { recursive: true })]);
  await writeFile(core, JSON.stringify({ t5z: {}, t6z: {} }));
  const coreSource = `const fs=require('node:fs'); const file=${JSON.stringify(core)}; const args=process.argv.slice(2); const lock=file+'.lock',deadline=Date.now()+500;while(true){try{fs.mkdirSync(lock);break;}catch(error){if(error.code!=='EEXIST'||Date.now()>deadline)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2);}}try{const all=JSON.parse(fs.readFileSync(file));const address=args[1],labels=all[address];if(!labels)throw Error('Unknown fixture terminal');if(args[0]==='label'){for(const item of args.slice(2).filter(x=>x!=='--json')){const i=item.indexOf('=');const key=item.slice(0,i),value=item.slice(i+1);if(value)labels[key]=value;else delete labels[key];}const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(all));fs.renameSync(temporary,file);}process.stdout.write(JSON.stringify({address,labels}));}finally{fs.rmdirSync(lock);}`;
  await writeFile(script, coreSource);
  await writeFile(join(commands, "hc.cmd"), '@"node" "%dp0%\\node_modules\\core-fixture\\cli.js" %*\r\n');
  if (process.platform !== "win32") { const hc = join(commands, "hc"); await writeFile(hc, `#!${process.execPath}\n${coreSource}`); await chmod(hc, 0o755); }
  // Security: public SDK lifecycle only. The fixture has no prompt/model transport, real terminal or private endpoint access.
  await writeFile(extension, `import {appendFile,readFile,writeFile} from 'node:fs/promises';
export default function(pi){let timer;let busy=false;
pi.registerCommand('fixture-replace',{handler:async(_args,ctx)=>{await ctx.newSession();}});
pi.on('session_start',async(event,ctx)=>{
 await new Promise(done=>setTimeout(done,25));
 await appendFile(process.env.FIXTURE_AUDIT,JSON.stringify({reason:event.reason,session:ctx.sessionManager.getSessionId(),runtime:process.env[${JSON.stringify(PRODUCT_IDENTITY.environment.sessionRuntimeId)}]})+'\\n');
 timer=setInterval(async()=>{if(busy)return;busy=true;try{const action=await readFile(process.env.FIXTURE_CONTROL,'utf8').catch(()=> '');if(!action)return;await writeFile(process.env.FIXTURE_CONTROL,'');if(action==='stop')ctx.shutdown();if(action==='replace')pi.sendUserMessage('/fixture-replace',{expandPromptTemplates:true});}finally{busy=false;}},50);
});
pi.on('session_shutdown',()=>{clearInterval(timer);});}
`);
  const settings = { defaultProvider: "fixture", defaultModel: "offline", defaultThinkingLevel: "low", defaultProjectTrust: "never", cacheWarming: "off", extensions: [extension], [PRODUCT_IDENTITY.commandName]: { defaultAccentColor: "pink", sessionAutoName: false, promptHistoryEnabled: false, promptSuggestions: false, updateCheck: "off" } };
  await writeFile(join(agentDir, "settings.json"), JSON.stringify(settings));
  await writeFile(join(agentDir, "models.json"), JSON.stringify({ providers: { fixture: { api: "openai-completions", apiKey: "hermetic-no-network", baseUrl: "http://127.0.0.1:1/v1", models: [{ id: "offline", name: "Offline fixture", reasoning: false, input: ["text"], contextWindow: 4096, maxTokens: 128 }] } } }));
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(A1_|PI_|HC_|FM_|NODE_OPTIONS$|NODE_COMPILE_CACHE$|BASH_ENV$|ENV$)|API_KEY|TOKEN|SECRET|AUTH/iu.test(key)));
  Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: join(home, "roaming"), LOCALAPPDATA: join(home, "local"), PI_OFFLINE: "1", PATH: `${commands}${delimiter}${env.PATH ?? env.Path ?? ""}`,
    [PRODUCT_IDENTITY.environment.profileHome]: home, [PRODUCT_IDENTITY.environment.dataDir]: join(home, "data"), [PRODUCT_IDENTITY.environment.runtimeDir]: join(home, "runtime"), [PRODUCT_IDENTITY.environment.configDir]: join(home, "config") });
  // Platform: Node's Windows environment selects the first case-insensitive PATH key.
  for (const key of Object.keys(env)) if (key !== "PATH" && key.toUpperCase() === "PATH") delete env[key];
  const cli = async (binding: { sessionId: string; runtimeId: string }, color?: string) => {
    const request = parseIntegrationRequest({ version: 1, id: randomUUID(), type: color === undefined ? "settings.get" : "settings.update",
      target: { scope: "session", sessionId: binding.sessionId, runtimeId: binding.runtimeId }, setting: "accentColor", ...(color === undefined ? {} : { value: color }) });
    const result = JSON.parse((await execute(process.execPath, [join(packageRoot, "bin", "cli.js"), "api", JSON.stringify(request)], { cwd, env, timeout: 10_000 })).stdout);
    assertIntegrationResponse(result, request);
    expect(result.success).toBe(true);
    const data = result.data as { target: { sessionId: string }; effectiveValue: string };
    return { sessionId: data.target.sessionId, color: data.effectiveValue };
  };
  const labels = async (terminal: string): Promise<Record<string, string>> => (await readJson(core))[terminal];
  const terminal = async (id: string): Promise<FixtureColorTerminal> => ({ address: id, state: "live", app: PRODUCT_IDENTITY.commandName, labels: await labels(id) });
  let sequence = 0;
  const launch = async (id: string, compatible: boolean, color: string) => {
    const control = join(home, `control-${++sequence}`), audit = join(home, `audit-${sequence}.jsonl`), trace = join(home, `trace-${sequence}.jsonl`);
    await writeFile(control, "");
    const launchEnvironment = { ...env, HC_TERMINAL_ID: id, FIXTURE_CONTROL: control, FIXTURE_AUDIT: audit, [PRODUCT_IDENTITY.environment.startupTrace]: trace };
    initializeStartupTrace(launchEnvironment, PRODUCT_IDENTITY.commandName);
    const child = spawn(process.execPath, [join(packageRoot, "bin", compatible ? "pi-compatible.js" : "cli.js"), "--session-color", color, ...(compatible ? ["--thinking", "low"] : [])],
      { cwd, env: launchEnvironment, stdio: "pipe", windowsHide: true });
    let output = "", closed = false;
    child.on("close", () => { closed = true; });
    child.stdout!.on("data", chunk => { output = (output + chunk).slice(-100_000); });
    child.stderr!.on("data", chunk => { output = (output + chunk).slice(-100_000); });
    const stop = async () => {
      if (closed) return;
      await writeFile(control, "stop");
      await until(async () => closed, () => `owned fixture failed to stop: ${output}`, 15_000);
      expect(child.exitCode, output).toBe(0);
    };
    launches.push({ child, stop });
    await until(async () => {
      if (closed) throw new Error(`packaged ${compatible ? "compatible" : "normal"} launch exited: ${output}`);
      return Boolean(freshHerdrColorBinding(await labels(id), Date.now()));
    }, () => output);
    const binding = freshHerdrColorBinding(await labels(id), Date.now())!;
    const notes = (await readFile(audit, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    expect(notes.at(-1)).toMatchObject({ session: binding.sessionId, runtime: binding.runtimeId });
    const phases = await readFile(trace, "utf8");
    for (const phase of ["bootstrap-selected", "ui-entry", "session-created"]) expect(phases).toContain(`"phase":"${phase}"`);
    return { binding, stop, replace: () => writeFile(control, "replace") };
  };
  const routed: string[] = [];
  const ports = {
    now: Date.now,
    terminal: async (target: FixtureColorTarget) => { expect(target.machine).toBe(machine); return terminal(target.terminal); },
    get: async (target: FixtureColorTarget) => { routed.push(target.machine); return cli(target); },
    set: async (target: FixtureColorTarget) => { routed.push(target.machine); return cli(target, target.color); },
  };
  const adopt = async (id: string, space: string, tab: string) => {
    const { createHerdrCommand } = await import("../../src/features/owned-ui/herdr-command.js");
    const result = await createHerdrCommand({ environment: env })(["label", id, `herdr.space=${space}`, `herdr.tab=${tab}`, "--json"]);
    expect(result.ok).toBe(true);
  };
  return { launch, cli, labels, terminal, adopt, ports, routed, settings: () => readJson(join(agentDir, "settings.json")) };
}

describe("packaged compatible producer and unchanged membership consumer contract", () => {
  it.each(["local", "remote-core-only"])("converges an inactive tab and rejects obsolete captures on %s", async machine => {
    const f = await fixture(machine);
    const first = await f.launch("t5z", true, "green"), peer = await f.launch("t6z", false, "orange");
    try {
      const originalSettings = await f.settings();
      await f.adopt("t5z", "space-a", "tab-a");
      const panes = [{ terminal: "t5z", tab: "tab-a" }, { terminal: "t6z", tab: "focused-peer" }];
      const capture = async (space = "space-a", color = "green") => fixtureColorTargets([{ machine, id: space, color, tabs: ["tab-a"] }], panes, [await f.terminal("t5z"), await f.terminal("t6z")], Date.now());
      const old = await capture();
      expect(old).toHaveLength(1);
      const moved = await capture("space-b", "cyan");
      // Protocol: membership arrived before adoption metadata: neither the old capture nor the new capture may be replayed blindly.
      expect(await syncFixtureColors(moved, Date.now() + 10_000, f.ports)).toEqual([]);
      await f.adopt("t5z", "space-b", "tab-a");
      expect(await syncFixtureColors(old, Date.now() + 10_000, f.ports)).toEqual([]);
      expect(await syncFixtureColors(moved, Date.now() + 10_000, f.ports)).toHaveLength(1);
      expect(await f.cli(first.binding)).toMatchObject({ color: "cyan" });
      expect(await f.cli(peer.binding)).toMatchObject({ color: "orange" });
      expect(f.routed.every(value => value === machine)).toBe(true);
      expect(await f.settings()).toEqual(originalSettings);
      const expired = Date.now() - 1;
      expect(await syncFixtureColors(await capture("space-b", "pink"), expired, f.ports)).toEqual([]);
      const pending = await capture("space-b", "pink");
      const replacementPorts = { ...f.ports, get: async (target: FixtureColorTarget) => {
        const value = await f.ports.get(target);
        await first.replace();
        await until(async () => (await f.labels("t5z"))[LABELS.session] !== first.binding.sessionId);
        return value;
      } };
      expect(await syncFixtureColors(pending, Date.now() + 10_000, replacementPorts)).toEqual([]);
      const replacement = freshHerdrColorBinding(await f.labels("t5z"), Date.now())!;
      expect(replacement.runtimeId).toBe(first.binding.runtimeId);
      expect(await f.cli(replacement)).toMatchObject({ color: "green" });
      await expect(f.cli(first.binding)).rejects.toBeDefined();
    } finally { await first.stop(); await peer.stop(); }
    // Protocol: same terminal, new compatible process: no manual label clearing or coordination repair.
    const successor = await f.launch("t5z", true, "green");
    expect(successor.binding.runtimeId).not.toBe(first.binding.runtimeId);
    expect(successor.binding.sessionId).not.toBe(first.binding.sessionId);
    await successor.stop();
  }, 120_000);
});

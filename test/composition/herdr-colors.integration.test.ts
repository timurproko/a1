import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runSessionColorCommand } from "../../src/cli/session-color.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { freshHerdrColorBinding, herdrLaunchArguments } from "./fixtures/herdr-color-consumer.js";
const children: ChildProcess[] = [];
let root = "";
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null) { const exit = new Promise(done => child.once("exit", done)); child.kill(); await exit; } }
  if (root) await rm(root, { recursive: true, force: true });
});
function received(child: ChildProcess): Promise<unknown> {
  return new Promise((done, reject) => {
    const timeout = setTimeout(() => { clean(); reject(new Error("fixture IPC timeout")); }, 5000);
    const message = (value: unknown) => { clean(); done(value); };
    const exit = () => { clean(); reject(new Error("fixture exited")); };
    function clean() { clearTimeout(timeout); child.off("message", message); child.off("exit", exit); }
    child.once("message", message); child.once("exit", exit);
  });
}
async function labels() { return JSON.parse(await readFile(join(root, "core.json"), "utf8")) as Record<string, string>; }
async function host() {
  const runtime = randomUUID(), session = randomUUID();
  const environment = { ...process.env, PATH: `${join(root, "commands")}${delimiter}${process.env.PATH ?? ""}`, HC_TERMINAL_ID: "t5z" };
  const child = fork(resolve("test/composition/fixtures/herdr-color-host.ts"), [root, runtime, session], { env: environment, execArgv: ["--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"] });
  children.push(child);
  let stderr = ""; child.stderr?.on("data", chunk => { stderr += chunk; });
  try { expect(await received(child)).toEqual({ ready: true }); } catch (error) { throw new Error(`${String(error)} ${stderr}`); }
  return { runtime, session, async send(action: string, sessionId?: string) { const result = received(child); child.send({ action, sessionId }); expect(await result).toEqual({ action }); } };
}
describe("Core-only subprocess integration and cross-process ownership", () => {
  it("keeps older discovery fallback and fails closed for partial/stale native labels", () => {
    expect(herdrLaunchArguments('{"version":1,"launchColor":true,"terminalIdentity":true}', "green")).toEqual(["--session-color", "green"]);
    for (const probe of ["", "not JSON", '{"version":1,"launchColor":true,"terminalIdentity":false}', '{"version":2,"launchColor":true,"terminalIdentity":true}']) expect(herdrLaunchArguments(probe, "green")).toEqual([]);
    const sessionId = randomUUID(), runtimeId = randomUUID();
    const legacy = { "custom.a1.session": sessionId, "custom.a1.runtime": runtimeId, "custom.a1.at": "100000" };
    expect(freshHerdrColorBinding(legacy, 100001)).toEqual({ sessionId, runtimeId });
    expect(freshHerdrColorBinding({ ...legacy, "a1.runtime": randomUUID() }, 100001)).toBeUndefined();
    const native = { ...legacy, "a1.session": sessionId, "a1.runtime": runtimeId, "a1.at": "100000" };
    expect(freshHerdrColorBinding(native, 190000)).toEqual({ sessionId, runtimeId });
    expect(freshHerdrColorBinding(native, 190001)).toBeUndefined();
    expect(freshHerdrColorBinding(native, 94999)).toBeUndefined();
  });
  it("publishes ready endpoint identity, acknowledges matching color, and fences delayed/older runtimes without a companion", async () => {
    root = await mkdtemp(join(tmpdir(), "core-only-colors-"));
    const scripts = join(root, "commands", "node_modules", "core-fixture"); await mkdir(scripts, { recursive: true });
    await writeFile(join(root, "core.json"), JSON.stringify({ "custom.a1.runtime": "legacy-unchanged", other: "keep" }));
    await writeFile(join(root, "commands", "hc.cmd"), '@"node" "%dp0%\\node_modules\\core-fixture\\cli.js" %*\r\n');
    await writeFile(join(scripts, "cli.js"), `const fs=require('node:fs'); const file=${JSON.stringify(join(root, "core.json"))}; const args=process.argv.slice(2); let labels=JSON.parse(fs.readFileSync(file)); if(args[0]==='label') { for(const item of args.slice(2).filter(x=>x!=='--json')) { const i=item.indexOf('='); const key=item.slice(0,i),value=item.slice(i+1); if(value)labels[key]=value;else delete labels[key]; } fs.writeFileSync(file,JSON.stringify(labels)); } process.stdout.write(JSON.stringify({address:'t5z',labels}));`);
    if (process.platform !== "win32") {
      const file = join(root, "commands", "hc");
      await writeFile(file, `#!${process.execPath}\n${await readFile(join(scripts, "cli.js"), "utf8")}`); await chmod(file, 0o755);
    }
    const old = await host(); // reserves first, deliberately delays endpoint/reporting
    const newer = await host(); await newer.send("start");
    await vi.waitFor(async () => expect(await labels()).toMatchObject({ "a1.runtime": newer.runtime, "a1.session": newer.session }), { timeout: 5000 });
    const output: string[] = [];
    expect(await runSessionColorCommand(["set", "pink", "--session", freshHerdrColorBinding(await labels(), Date.now())!.sessionId], { environment: { [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime") }, stdout: value => output.push(value) })).toBe(0);
    expect(JSON.parse(output[0]!)).toEqual({ sessionId: newer.session, color: "pink" });
    const before = await labels();
    await old.send("start"); await old.send("replace", randomUUID()); await old.send("stop");
    expect(await labels()).toEqual(before);
    const replacement = randomUUID(); await newer.send("replace", replacement);
    await vi.waitFor(async () => expect(await labels()).toMatchObject({ "a1.runtime": newer.runtime, "a1.session": replacement }), { timeout: 5000 });
    await newer.send("stop"); await old.send("replace", randomUUID());
    expect(await labels()).toEqual({ "custom.a1.runtime": "legacy-unchanged", other: "keep" });
  });
});

import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile), roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

async function fixture() {
  const home = await mkdtemp(resolve(tmpdir(), "a1-compatible-cli-")); roots.push(home);
  const agentDir = resolve(home, ".a1/agent"); await mkdir(agentDir, { recursive: true });
  await writeFile(resolve(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "never" }));
  await writeFile(resolve(agentDir, "models.json"), JSON.stringify({ providers: { "fixture-cli": { baseUrl: "http://127.0.0.1:1/v1", api: "openai-completions", apiKey: "hermetic-no-network", models: [{ id: "fixture-model", name: "Fixture model", reasoning: false, input: ["text"], contextWindow: 4096, maxTokens: 128 }] } } }));
  return { home, agentDir, env: { ...process.env, A1_PROFILE_HOME: home, PI_OFFLINE: "1", FM_PI_SESSION_PID: "parent-live-host", FM_PI_SESSION_START: "parent-start" } };
}

describe("actual compatibility executable", () => {
  it("returns truthful help/version and rejects invalid launch input with nonzero status", async () => {
    const f = await fixture();
    const help = await execute(process.execPath, ["bin/pi-compatible.js", "--help"], { env: f.env });
    expect(help.stdout).toContain("normal A1 UI and profile");
    expect(help.stdout).not.toContain("--tui-mode");
    const version = await execute(process.execPath, ["bin/pi-compatible.js", "--version"], { env: f.env });
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    expect(version.stdout).toContain(`A1 ${manifest.version}`);
    expect(version.stdout).toContain(`Pi engine ${manifest.dependencies["@earendil-works/pi-coding-agent"]}`);
    for (const args of [["--model"], ["--thinking", "ultra"], ["--mode", "rpc"], ["--help", "unexpected"]]) {
      await expect(execute(process.execPath, ["bin/pi-compatible.js", ...args], { env: f.env })).rejects.toMatchObject({ code: 2 });
    }
  });

  it("lists the effective A1 profile catalog and exits without UI/session startup", async () => {
    const f = await fixture();
    const result = await execute(process.execPath, ["bin/pi-compatible.js", "--list-models", "fixture-cli/"], { env: f.env, timeout: 20_000 });
    expect(result.stdout.trim()).toBe("fixture-cli/fixture-model");
    expect(result.stdout).not.toContain("parent-live-host");
    const { readdir } = await import("node:fs/promises");
    await expect(readdir(resolve(f.agentDir, "sessions"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("packs the real compatibility shim and runs discovery from the extracted package", async () => {
    const f = await fixture();
    const packed = await execute("bash", ["-c", 'npm pack --ignore-scripts --json --pack-destination "$1"', "pack", f.home], { timeout: 30_000 });
    const filename = JSON.parse(packed.stdout)[0].filename as string;
    await execute("tar", ["-xzf", filename], { cwd: f.home, timeout: 15_000 });
    const packageRoot = resolve(f.home, "package");
    // Use the pinned test installation; this is packaging smoke, not dependency-install certification.
    await symlink(resolve("node_modules"), resolve(packageRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const result = await execute("bash", ["-c", 'export PATH="$(pwd -P)/bin/pi-compatible:$PATH"; type -P pi && pi --version && pi --list-models fixture-cli/'], { cwd: packageRoot, env: f.env, timeout: 20_000 });
    expect(result.stdout).toContain("/package/bin/pi-compatible/pi");
    expect(result.stdout).toContain("Pi-compatible owned runtime");
    expect(result.stdout).toContain("fixture-cli/fixture-model");
  }, 45_000);

  it("offers a real PATH-resolved pi executable without replacing global installation metadata", async () => {
    const f = await fixture();
    const result = await execute("bash", ["-c", 'export PATH="$(pwd -P)/bin/pi-compatible:$PATH"; type -P pi && pi --version'], { env: f.env, timeout: 15_000 });
    expect(result.stdout.replaceAll("\\", "/")).toContain("/bin/pi-compatible/pi");
    expect(result.stdout).toContain("Pi-compatible owned runtime");
    expect(JSON.parse(await readFile("package.json", "utf8")).bin).toEqual({ a1: "bin/cli.js" });
  });
});

import { chmod, copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHerdrCommand } from "../../../src/features/owned-ui/herdr-command.js";
let root = "";
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });
async function npmFixture(source: string) {
  root = await mkdtemp(join(tmpdir(), "hc command's space-"));
  const script = join(root, "node_modules", "fixture", "cli.js");
  await mkdir(join(root, "node_modules", "fixture"), { recursive: true });
  await writeFile(script, source);
  await writeFile(join(root, "hc.cmd"), '@"node" "%dp0%\\node_modules\\fixture\\cli.js" %*\r\n');
  return { environment: { ...process.env, PATH: root }, platform: "win32" as const };
}
describe("literal bounded Core subprocess port", () => {
  it("resolves Windows npm scripts with paths/spaces and keeps selectors/labels literal", async () => {
    const options = await npmFixture("process.stdout.write(JSON.stringify(process.argv.slice(2)))");
    const args = ["label", "t5z", "a1.session=literal ' & $(text)", "--json"];
    const result = await createHerdrCommand(options)(args);
    expect(result).toMatchObject({ ok: true, settled: true }); expect(JSON.parse(result.stdout)).toEqual(args);
  });
  it.skipIf(process.platform !== "win32")("resolves an actual Windows executable before npm shims", async () => {
    const options = await npmFixture("process.exit(2)");
    await copyFile(process.execPath, join(root, "hc.exe"));
    const result = await createHerdrCommand(options)(["-e", "process.stdout.write('literal-executable')"]);
    expect(result).toEqual({ ok: true, settled: true, stdout: "literal-executable" });
  });
  it.each(["process.exit(2)", "setInterval(()=>{},1000)", "process.stdout.write('x'.repeat(4096))"])("contains subprocess failure: %s", async source => {
    const options = await npmFixture(source);
    const result = await createHerdrCommand({ ...options, timeoutMs: 100, maxBytes: 64 })(["get", "t5z", "--json"]);
    expect(result).toMatchObject({ ok: false, settled: true });
  });
  it("contains a missing command and refuses arbitrary batch wrappers", async () => {
    const options = await npmFixture("process.exit(0)");
    await writeFile(join(root, "hc.cmd"), "@echo unsafe wrapper\r\n");
    expect(await createHerdrCommand(options)(["get", "t5z"])).toEqual({ ok: false, settled: true, stdout: "" });
    expect(await createHerdrCommand({ environment: { PATH: "absent-command-directory" } })(["get", "t5z"])).toMatchObject({ ok: false, settled: true });
  });
  it.skipIf(process.platform === "win32")("uses a Unix executable directly", async () => {
    root = await mkdtemp(join(tmpdir(), "hc-unix-"));
    const file = join(root, "hc");
    await writeFile(file, `#!${process.execPath}\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));`); await chmod(file, 0o755);
    const result = await createHerdrCommand({ environment: { PATH: root }, platform: "linux" })(["get", "t5z", "--json"]);
    expect(result.ok).toBe(true); expect(JSON.parse(result.stdout)).toEqual(["get", "t5z", "--json"]);
  });
});

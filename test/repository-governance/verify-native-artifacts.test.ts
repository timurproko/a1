import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nativeArtifactProblems, RELEASE_NATIVE_TARGETS } from "../../scripts/release/verify-native-artifacts.mjs";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const entryFilename = "dist/foundation/resident-tabs/host-entry.js";
const record = (filename: string, content: string) => ({ filename, sha256: createHash("sha256").update(content).digest("hex"), size: Buffer.byteLength(content) });

async function assemble(skip?: string): Promise<string> {
  const packageRoot = await mkdtemp(join(tmpdir(), "a1-native-artifacts-"));
  roots.push(packageRoot);
  const root = join(packageRoot, "dist", "native");
  const entry = "fixed role entry";
  await mkdir(join(packageRoot, "dist", "foundation", "resident-tabs"), { recursive: true });
  await writeFile(join(packageRoot, entryFilename), entry);
  for (const { platform, architecture } of RELEASE_NATIVE_TARGETS) {
    const key = `${platform}-${architecture}`;
    const directory = join(root, key);
    await mkdir(directory, { recursive: true });
    const files = new Map([
      ["process-guardian.node", `guardian ${key}`],
      ["terminal-host.node", `host ${key}`],
      ["terminal-host-THIRD-PARTY-NOTICES.txt", `notices ${key}`],
    ]);
    for (const [name, content] of files) await writeFile(join(directory, name), content);
    const base = { platform, architecture, capability: "supported", kind: "node-addon", nodeApi: 9 };
    await writeFile(join(directory, "manifest.json"), JSON.stringify({
      ...base,
      schema: "a1-process-guardian-artifact-v2",
      artifact: record("process-guardian.node", files.get("process-guardian.node")!),
    }));
    if (skip === key) continue;
    await writeFile(join(directory, "terminal-host.manifest.json"), JSON.stringify({
      ...base,
      schema: "a1-terminal-host-artifact-v2",
      artifact: record("terminal-host.node", files.get("terminal-host.node")!),
      entry: record(entryFilename, entry),
      notices: record("terminal-host-THIRD-PARTY-NOTICES.txt", files.get("terminal-host-THIRD-PARTY-NOTICES.txt")!),
    }));
  }
  return root;
}

describe("native release artifact assembly", () => {
  it("requires the guardian and terminal host addons for all four release platforms", async () => {
    expect(RELEASE_NATIVE_TARGETS.map(target => `${target.platform}-${target.architecture}`)).toEqual(["win32-x64", "linux-x64", "darwin-arm64", "darwin-x64"]);
    await expect(nativeArtifactProblems(await assemble())).resolves.toEqual([]);
  });

  it("refuses an assembly missing one platform's host or carrying altered addon and entry bytes", async () => {
    await expect(nativeArtifactProblems(await assemble("darwin-x64"))).resolves.toEqual(["darwin-x64/terminal-host.manifest.json is missing or malformed"]);
    const altered = await assemble();
    await writeFile(join(altered, "linux-x64", "terminal-host.node"), "changed");
    await expect(nativeArtifactProblems(altered)).resolves.toEqual(["linux-x64/terminal-host.node does not match terminal-host.manifest.json"]);
    const alteredEntry = await assemble();
    await writeFile(join(alteredEntry, "..", "foundation", "resident-tabs", "host-entry.js"), "changed");
    await expect(nativeArtifactProblems(alteredEntry)).resolves.toEqual(RELEASE_NATIVE_TARGETS.map(() => `${entryFilename} does not match terminal-host.manifest.json`));
  });
});

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nativeArtifactProblems, RELEASE_NATIVE_TARGETS } from "../../scripts/release/verify-native-artifacts.mjs";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const record = (filename: string, content: string) => ({ filename, sha256: createHash("sha256").update(content).digest("hex"), size: Buffer.byteLength(content) });

async function assemble(skip?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "a1-native-artifacts-"));
  roots.push(root);
  for (const { platform, architecture } of RELEASE_NATIVE_TARGETS) {
    const key = `${platform}-${architecture}`;
    const directory = join(root, key);
    await mkdir(directory, { recursive: true });
    const exe = platform === "win32" ? ".exe" : "";
    const files: Record<string, string> = {
      [`process-guardian${exe}`]: `guardian ${key}`,
      [`terminal-host${exe}`]: `host ${key}`,
      "a1_session_lock.node": `lock ${key}`,
      "terminal-host-THIRD-PARTY-NOTICES.txt": `notices ${key}`,
    };
    for (const [name, content] of Object.entries(files)) await writeFile(join(directory, name), content);
    const base = { platform, architecture, capability: "supported" };
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ ...base, schema: "a1-process-guardian-artifact-v1", artifact: record(`process-guardian${exe}`, files[`process-guardian${exe}`]!) }));
    if (skip === key) continue;
    await writeFile(join(directory, "terminal-host.manifest.json"), JSON.stringify({
      ...base,
      schema: "a1-terminal-host-artifact-v1",
      artifact: record(`terminal-host${exe}`, files[`terminal-host${exe}`]!),
      sessionLock: record("a1_session_lock.node", files["a1_session_lock.node"]!),
      notices: record("terminal-host-THIRD-PARTY-NOTICES.txt", files["terminal-host-THIRD-PARTY-NOTICES.txt"]!),
    }));
  }
  return root;
}

describe("native release artifact assembly", () => {
  it("requires the guardian and terminal host for all four release platforms", async () => {
    expect(RELEASE_NATIVE_TARGETS.map(target => `${target.platform}-${target.architecture}`)).toEqual(["win32-x64", "linux-x64", "darwin-arm64", "darwin-x64"]);
    await expect(nativeArtifactProblems(await assemble())).resolves.toEqual([]);
  });

  it("refuses an assembly missing one platform's terminal host or carrying altered bytes", async () => {
    await expect(nativeArtifactProblems(await assemble("darwin-x64"))).resolves.toEqual(["darwin-x64/terminal-host.manifest.json is missing or malformed"]);
    const altered = await assemble();
    await writeFile(join(altered, "linux-x64", "a1_session_lock.node"), "changed");
    await expect(nativeArtifactProblems(altered)).resolves.toEqual(["linux-x64/a1_session_lock.node does not match terminal-host.manifest.json"]);
  });
});

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TerminalHostArtifactError, verifyTerminalHostArtifact } from "../../../src/foundation/resident-tabs/terminal-host-artifact.js";
import { ensureTerminalHost, resolveTerminalHostPath } from "../../../src/foundation/resident-tabs/ensure-terminal-host.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const override = PRODUCT_IDENTITY.environment.terminalHostPath;
const developmentInstance = PRODUCT_IDENTITY.environment.developmentInstanceId;

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function release(overrides: Record<string, unknown> = {}, platform = "linux", architecture = "x64") {
  const root = await mkdtemp(join(tmpdir(), "a1-terminal-host-artifact-"));
  roots.push(root);
  const directory = join(root, "dist", "native", `${platform}-${architecture}`);
  const entry = join(root, "dist", "foundation", "resident-tabs", "host-entry.js");
  await Promise.all([mkdir(directory, { recursive: true }), mkdir(join(entry, ".."), { recursive: true })]);
  const addon = join(directory, "terminal-host.node");
  await writeFile(addon, "host bytes");
  await writeFile(entry, "entry bytes");
  await writeFile(join(directory, "terminal-host-THIRD-PARTY-NOTICES.txt"), "notice bytes");
  const manifest = {
    schema: "a1-terminal-host-artifact-v2",
    kind: "node-addon",
    nodeApi: 9,
    protocolVersion: 1,
    generation: 1,
    platform,
    architecture,
    capability: "supported",
    artifact: { filename: "terminal-host.node", sha256: digest("host bytes"), size: 10 },
    entry: { filename: "dist/foundation/resident-tabs/host-entry.js", sha256: digest("entry bytes"), size: 11 },
    notices: { filename: "terminal-host-THIRD-PARTY-NOTICES.txt", sha256: digest("notice bytes"), size: 12 },
    ...overrides,
  };
  await writeFile(join(directory, "terminal-host.manifest.json"), JSON.stringify(manifest));
  return { root, directory, addon, entry };
}

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(TerminalHostArtifactError);
    return (error as TerminalHostArtifactError).code;
  }
}

describe("terminal-host artifact verification", () => {
  it("accepts an intact addon and names its certified Node role entry", async () => {
    const fixture = await release();
    await expect(verifyTerminalHostArtifact(fixture.addon, "linux", "x64")).resolves.toEqual({
      addon: fixture.addon,
      entry: fixture.entry,
      generation: 1,
    });
  });

  it("rejects missing, tampered, wrong-platform, wrong-generation, unsupported, and missing-entry artifacts", async () => {
    const missing = await release();
    await rm(join(missing.directory, "terminal-host.manifest.json"));
    expect(await code(verifyTerminalHostArtifact(missing.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_MISSING");

    const tampered = await release();
    await writeFile(tampered.addon, "host byteZ");
    expect(await code(verifyTerminalHostArtifact(tampered.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_TAMPERED");

    const tamperedEntry = await release();
    await writeFile(tamperedEntry.entry, "entry byteZ");
    expect(await code(verifyTerminalHostArtifact(tamperedEntry.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_TAMPERED");

    const wrongPlatform = await release({ platform: "darwin" });
    expect(await code(verifyTerminalHostArtifact(wrongPlatform.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const wrongGeneration = await release({ generation: 2 });
    expect(await code(verifyTerminalHostArtifact(wrongGeneration.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const escapingEntry = await release({ entry: { filename: "../host-entry.js", sha256: digest("entry bytes"), size: 11 } });
    expect(await code(verifyTerminalHostArtifact(escapingEntry.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const unsupported = await release({ capability: "unsupported" });
    expect(await code(verifyTerminalHostArtifact(unsupported.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_UNSUPPORTED");

    const missingEntry = await release();
    await rm(missingEntry.entry);
    expect(await code(verifyTerminalHostArtifact(missingEntry.addon, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_MISSING");
  });
});

describe("installed terminal-host bootstrap", () => {
  const base = (root: string) => ({ releaseRoot: root, profileRoot: root, dataDir: root, runtimeDir: root, platform: "linux" as const, architecture: "x64" });

  it("resolves the addon by its product-identity name and ignores the override outside development", async () => {
    expect(resolveTerminalHostPath("/release", {}, "win32", "x64").endsWith(join("dist", "native", "win32-x64", "terminal-host.node"))).toBe(true);
    expect(resolveTerminalHostPath("/release", { [override]: "/elsewhere/host" }, "linux", "x64").endsWith(join("linux-x64", "terminal-host.node"))).toBe(true);
    expect(resolveTerminalHostPath("/release", { [override]: "/elsewhere/host", [developmentInstance]: "dev" }, "linux", "x64").endsWith(join("elsewhere", "host"))).toBe(true);
  });

  it("starts nothing when the installed artifact fails verification", async () => {
    const tampered = await release();
    await writeFile(tampered.addon, "host byteZ");
    let spawned = 0;
    await expect(ensureTerminalHost({ ...base(tampered.root), environment: { [override]: "/elsewhere/host" }, run: async () => { spawned++; return { code: 0, stdout: "", stderr: "" }; } }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not verified" });

    const absent = await release();
    await rm(join(absent.directory, "terminal-host.manifest.json"));
    await expect(ensureTerminalHost({ ...base(absent.root), environment: {}, run: async () => { spawned++; return { code: 0, stdout: "", stderr: "" }; } }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not installed" });
    expect(spawned).toBe(0);
  });

  it("probes a verified installed artifact through Node and accepts Intel macOS", async () => {
    const intact = await release({}, "darwin", "x64");
    const observed: Array<[string, readonly string[]]> = [];
    await expect(ensureTerminalHost({
      ...base(intact.root), platform: "darwin", architecture: "x64", environment: {},
      run: async (executable, arguments_) => { observed.push([executable, arguments_]); return { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/host"}', stderr: "" }; },
    })).resolves.toEqual({ status: "ready", executable: { executable: process.execPath, entry: intact.entry }, endpoint: "/host" });
    expect(observed).toEqual([[process.execPath, [intact.entry, "probe", "--profile", intact.root, "--data-dir", intact.root, "--runtime-dir", intact.root]]]);
  });
});

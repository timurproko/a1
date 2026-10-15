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
  await mkdir(directory, { recursive: true });
  const executableName = platform === "win32" ? "terminal-host.exe" : "terminal-host";
  await writeFile(join(directory, executableName), "host bytes");
  await writeFile(join(directory, "a1_session_lock.node"), "lock bytes");
  const manifest = {
    schema: "a1-terminal-host-artifact-v1",
    protocolVersion: 1,
    generation: 1,
    platform,
    architecture,
    capability: "supported",
    artifact: { filename: executableName, sha256: digest("host bytes"), size: 10 },
    sessionLock: { filename: "a1_session_lock.node", sha256: digest("lock bytes"), size: 10 },
    ...overrides,
  };
  await writeFile(join(directory, "terminal-host.manifest.json"), JSON.stringify(manifest));
  return { root, directory, executable: join(directory, executableName) };
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
  it("accepts an intact artifact and names its verified session-writer lock", async () => {
    const fixture = await release();
    await expect(verifyTerminalHostArtifact(fixture.executable, "linux", "x64")).resolves.toEqual({
      executable: fixture.executable,
      sessionLock: join(fixture.directory, "a1_session_lock.node"),
      generation: 1,
    });
  });

  it("rejects missing, tampered, wrong-platform, wrong-generation, unsupported, and missing-lock artifacts", async () => {
    const missing = await release();
    await rm(join(missing.directory, "terminal-host.manifest.json"));
    expect(await code(verifyTerminalHostArtifact(missing.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_MISSING");

    const tampered = await release();
    await writeFile(tampered.executable, "host byteZ");
    expect(await code(verifyTerminalHostArtifact(tampered.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_TAMPERED");

    const tamperedLock = await release();
    await writeFile(join(tamperedLock.directory, "a1_session_lock.node"), "lock byteZ");
    expect(await code(verifyTerminalHostArtifact(tamperedLock.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_TAMPERED");

    const wrongPlatform = await release({ platform: "darwin" });
    expect(await code(verifyTerminalHostArtifact(wrongPlatform.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const wrongGeneration = await release({ generation: 2 });
    expect(await code(verifyTerminalHostArtifact(wrongGeneration.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const escapingLock = await release({ sessionLock: { filename: "../a1_session_lock.node", sha256: digest("lock bytes"), size: 10 } });
    expect(await code(verifyTerminalHostArtifact(escapingLock.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");

    const unsupported = await release({ capability: "unsupported" });
    expect(await code(verifyTerminalHostArtifact(unsupported.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_UNSUPPORTED");

    const missingLock = await release();
    await rm(join(missingLock.directory, "a1_session_lock.node"));
    expect(await code(verifyTerminalHostArtifact(missingLock.executable, "linux", "x64"))).toBe("TERMINAL_HOST_ARTIFACT_MISSING");
  });
});

describe("installed terminal-host bootstrap", () => {
  const base = (root: string) => ({ releaseRoot: root, profileRoot: root, dataDir: root, runtimeDir: root, platform: "linux" as const, architecture: "x64" });

  it("resolves the executable by its product-identity name and ignores the override outside development", async () => {
    expect(resolveTerminalHostPath("/release", {}, "win32", "x64").endsWith(join("dist", "native", "win32-x64", "terminal-host.exe"))).toBe(true);
    expect(resolveTerminalHostPath("/release", { [override]: "/elsewhere/host" }, "linux", "x64").endsWith(join("linux-x64", "terminal-host"))).toBe(true);
    expect(resolveTerminalHostPath("/release", { [override]: "/elsewhere/host", [developmentInstance]: "dev" }, "linux", "x64").endsWith(join("elsewhere", "host"))).toBe(true);
  });

  it("starts nothing when the installed artifact fails verification", async () => {
    const tampered = await release();
    await writeFile(tampered.executable, "host byteZ");
    let spawned = 0;
    await expect(ensureTerminalHost({ ...base(tampered.root), environment: { [override]: "/elsewhere/host" }, run: async () => { spawned++; return { code: 0, stdout: "", stderr: "" }; } }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not verified" });

    const absent = await release();
    await rm(join(absent.directory, "terminal-host.manifest.json"));
    await expect(ensureTerminalHost({ ...base(absent.root), environment: {}, run: async () => { spawned++; return { code: 0, stdout: "", stderr: "" }; } }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not installed" });
    expect(spawned).toBe(0);
  });

  it("probes a verified installed artifact and accepts Intel macOS", async () => {
    const intact = await release({}, "darwin", "x64");
    const observed: string[] = [];
    await expect(ensureTerminalHost({
      ...base(intact.root), platform: "darwin", architecture: "x64", environment: {},
      run: async executable => { observed.push(executable); return { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/host"}', stderr: "" }; },
    })).resolves.toEqual({ status: "ready", executable: intact.executable, endpoint: "/host" });
    expect(observed).toEqual([intact.executable]);
  });
});

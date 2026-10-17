import { describe, expect, it } from "vitest";
import { buildManifest } from "../../scripts/development/build-terminal-host.mjs";
import { addonLibraryName, machoArchitecture, observeAddonIdentity, observeExecutableIdentity, parseTargetArgument, RELEASE_TARGETS, resolveBuildTarget, targetIdentity } from "../../scripts/development/native-target.mjs";

function macho(cpuType: number): Buffer {
  const header = Buffer.alloc(32);
  header.writeUInt32LE(0xfeedfacf, 0);
  header.writeUInt32LE(cpuType, 4);
  return header;
}

describe("native release targets", () => {
  it("maps every release triple to its dist/native identity and Zig target, mirroring build_target.rs", async () => {
    const { readFile } = await import("node:fs/promises");
    const rust = await readFile("native/terminal-host/build_target.rs", "utf8");
    for (const [triple, identity] of Object.entries(RELEASE_TARGETS)) {
      expect(rust, triple).toContain(`"${triple}" => "${identity.zigTarget}"`);
      expect(targetIdentity(triple)).toBe(identity);
    }
    expect(Object.keys(RELEASE_TARGETS)).toHaveLength(4);
    expect(() => targetIdentity("x86_64-unknown-linux-musl")).toThrow(/unsupported/u);
  });

  it("names addon libraries for every supported platform", () => {
    expect(addonLibraryName("process_guardian", "win32")).toBe("process_guardian.dll");
    expect(addonLibraryName("process_guardian", "linux")).toBe("libprocess_guardian.so");
    expect(addonLibraryName("process_guardian", "darwin")).toBe("libprocess_guardian.dylib");
    expect(() => addonLibraryName("process-guardian", "linux")).toThrow(/invalid addon crate/u);
    expect(() => addonLibraryName("process_guardian", "freebsd")).toThrow(/unsupported addon platform/u);
  });

  it("parses --target and refuses unknown or missing triples", () => {
    expect(parseTargetArgument([])).toBeNull();
    expect(parseTargetArgument(["--target", "x86_64-apple-darwin"])).toBe("x86_64-apple-darwin");
    expect(() => parseTargetArgument(["--target"])).toThrow(/unsupported --target ""/u);
    expect(() => parseTargetArgument(["--target", "aarch64-pc-windows-msvc"])).toThrow(/unsupported --target/u);
  });

  it("resolves the host build and same-OS cross builds, refusing another operating system", () => {
    expect(resolveBuildTarget({ argv: [], hostPlatform: "darwin", hostArchitecture: "arm64" }))
      .toEqual({ triple: null, platform: "darwin", architecture: "arm64", cargoArguments: [], outputDirectory: "release", cross: false });
    expect(resolveBuildTarget({ argv: ["--target", "x86_64-apple-darwin"], hostPlatform: "darwin", hostArchitecture: "arm64" }))
      .toEqual({ triple: "x86_64-apple-darwin", platform: "darwin", architecture: "x64", cargoArguments: ["--target", "x86_64-apple-darwin"], outputDirectory: "x86_64-apple-darwin/release", cross: true });
    expect(resolveBuildTarget({ argv: ["--target", "aarch64-apple-darwin"], hostPlatform: "darwin", hostArchitecture: "arm64" }).cross).toBe(false);
    expect(() => resolveBuildTarget({ argv: ["--target", "x86_64-apple-darwin"], hostPlatform: "linux", hostArchitecture: "x64" })).toThrow(/cannot be produced on a linux host/u);
  });

  it("reads the architecture of a 64-bit Mach-O header only", () => {
    expect(machoArchitecture(macho(0x01000007))).toBe("x64");
    expect(machoArchitecture(macho(0x0100000c))).toBe("arm64");
    expect(machoArchitecture(macho(0x00000007))).toBeNull();
    expect(machoArchitecture(Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 2]))).toBeNull();
    expect(machoArchitecture(Buffer.from("MZ"))).toBeNull();
    expect(machoArchitecture(null)).toBeNull();
  });

  it("records an executed identity, falls back to the header only for a macOS cross build, and never invents one", () => {
    const cross = resolveBuildTarget({ argv: ["--target", "x86_64-apple-darwin"], hostPlatform: "darwin", hostArchitecture: "arm64" });
    const host = resolveBuildTarget({ argv: [], hostPlatform: "darwin", hostArchitecture: "arm64" });
    const executed = (_executable: string, _arguments: string[]) => ({ status: 0, stdout: '{"schema":"x"}' });
    const refused = (_executable: string, _arguments: string[]) => ({ status: null, error: { code: "ENOEXEC" } });
    const bytes = (architecture: number) => (_path: string) => macho(architecture);
    expect(observeExecutableIdentity({ executable: "/dist/host", arguments_: ["--version"], target: cross, execute: executed, readBytes: bytes(0x01000007) }))
      .toEqual({ check: "executed", stdout: '{"schema":"x"}' });
    expect(observeExecutableIdentity({ executable: "/dist/host", arguments_: ["--version"], target: cross, execute: refused, readBytes: bytes(0x01000007) }))
      .toEqual({ check: "mach-o-header", stdout: null });
    expect(() => observeExecutableIdentity({ executable: "/dist/host", arguments_: ["--version"], target: cross, execute: refused, readBytes: bytes(0x0100000c) }))
      .toThrow(/is a arm64 binary; expected x64 for x86_64-apple-darwin/u);
    expect(() => observeExecutableIdentity({ executable: "/dist/host", arguments_: ["--version"], target: host, execute: refused, readBytes: bytes(0x0100000c) }))
      .toThrow(/--version failed with ENOEXEC/u);
    const windowsCross = { ...host, platform: "win32", cross: true };
    expect(() => observeExecutableIdentity({ executable: "/dist/host.exe", arguments_: ["--version"], target: windowsCross, execute: refused, readBytes: bytes(0x01000007) }))
      .toThrow(/failed with ENOEXEC/u);

    expect(observeAddonIdentity({ addon: "/dist/process-guardian.node", loader: "/node", arguments_: ["-e", "load"], target: cross, execute: executed, readBytes: bytes(0x01000007) }))
      .toEqual({ check: "executed", stdout: '{"schema":"x"}' });
    expect(observeAddonIdentity({ addon: "/dist/process-guardian.node", loader: "/node", arguments_: ["-e", "load"], target: cross, execute: refused, readBytes: bytes(0x01000007) }))
      .toEqual({ check: "mach-o-header", stdout: null });
  });

  it("records the identity check in the terminal host manifest and refuses an unknown one", () => {
    const file = (filename: string) => ({ filename, sha256: "a".repeat(64), size: 10 });
    const input = {
      platform: "darwin", architecture: "x64", triple: "x86_64-apple-darwin", crateVersion: "0.1.0-dev",
      report: { schema: "a1-terminal-host-version-v1", protocolVersion: 1, generation: 1, crateVersion: "0.1.0-dev", features: { faultInjection: false, residentFixtures: false }, libghosttyVtCommit: "c".repeat(40), libghosttyTarget: "x86_64-macos", libghosttyCpu: "baseline" },
      artifact: file("terminal-host.node"), entry: file("dist/foundation/resident-tabs/host-entry.js"), notices: file("terminal-host-THIRD-PARTY-NOTICES.txt"),
      cargoLockSha256: "b".repeat(64), rustVersion: "rustc 1.99.1", zigVersion: "0.15.2", builtAt: "2026-10-16T00:00:00.000Z",
    };
    expect(buildManifest(input).provenance).toMatchObject({ identityCheck: "executed", zigTarget: "x86_64-macos", zigCpu: "baseline" });
    expect(buildManifest({ ...input, identityCheck: "mach-o-header" }).provenance.identityCheck).toBe("mach-o-header");
    expect(() => buildManifest({ ...input, identityCheck: "trust-me" as never })).toThrow(/unknown terminal host identity check/u);
  });
});

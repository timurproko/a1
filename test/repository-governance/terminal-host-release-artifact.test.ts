import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildManifest, sessionLockLibraryName, terminalHostExecutableName, verifyVersionReport, type TerminalHostVersionReport } from "../../scripts/development/build-terminal-host.mjs";
import { licenseAllowed, renderTerminalHostNotices, type CargoMetadata, type NoticeReader } from "../../scripts/release/generate-terminal-host-notices.mjs";

const report: TerminalHostVersionReport = {
  schema: "a1-terminal-host-version-v1",
  protocolVersion: 1,
  generation: 1,
  crateVersion: "0.1.0-dev",
  features: { faultInjection: false, residentFixtures: false },
  libghosttyVtCommit: "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3",
  libghosttyTarget: "x86_64-linux-gnu",
  libghosttyCpu: "baseline",
};

function crate(name: string, license: string | null, kind = "lib") {
  return { id: `${name} 1.0.0`, name, version: "1.0.0", license, manifest_path: `/registry/${name}/Cargo.toml`, targets: [{ kind: [kind] }] };
}

function graph(): CargoMetadata {
  return {
    packages: [crate("terminal-host", null, "bin"), crate("alpha", "MIT OR Apache-2.0"), crate("beta", "Apache-2.0 WITH LLVM-exception OR MIT"), crate("macro", "MIT", "proc-macro"), crate("hidden", "AGPL-3.0"), crate("tooling", "GPL-3.0")],
    resolve: {
      root: "terminal-host 1.0.0",
      nodes: [
        { id: "terminal-host 1.0.0", deps: [
          { pkg: "alpha 1.0.0", dep_kinds: [{ kind: null }] },
          { pkg: "macro 1.0.0", dep_kinds: [{ kind: null }] },
          { pkg: "tooling 1.0.0", dep_kinds: [{ kind: "build" }] },
        ] },
        { id: "alpha 1.0.0", deps: [{ pkg: "beta 1.0.0", dep_kinds: [{ kind: null }] }] },
        { id: "macro 1.0.0", deps: [{ pkg: "hidden 1.0.0", dep_kinds: [{ kind: null }] }] },
      ],
    },
  };
}

function reader(files: Record<string, string>): NoticeReader {
  const read = async (path: string) => {
    const normalized = path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
    const text = files[normalized];
    if (text === undefined) throw new Error(`missing ${path}`);
    return text;
  };
  return Object.assign(read, {
    list: async (directory: string) => {
      const prefix = `${directory.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "")}/`;
      return Object.keys(files).filter(path => path.startsWith(prefix) && !path.slice(prefix.length).includes("/")).map(path => path.slice(prefix.length));
    },
  });
}

const digest = (text: string) => createHash("sha256").update(text).digest("hex");

describe("terminal-host third-party notices", () => {
  it("evaluates license expressions against the allowlist", () => {
    expect(licenseAllowed("MIT")).toBe(true);
    expect(licenseAllowed("MIT/Apache-2.0")).toBe(true);
    expect(licenseAllowed("(MIT OR Apache-2.0) AND Unicode-3.0")).toBe(true);
    expect(licenseAllowed("Apache-2.0 WITH LLVM-exception")).toBe(true);
    expect(licenseAllowed("MIT AND GPL-3.0")).toBe(false);
    expect(licenseAllowed("GPL-3.0 OR AGPL-3.0")).toBe(false);
    expect(licenseAllowed("MIT WITH Classpath-exception-2.0")).toBe(false);
    expect(licenseAllowed("(MIT")).toBe(false);
  });

  it("covers shipped crates and linked components while skipping proc-macro and build-only subtrees", async () => {
    const text = await renderTerminalHostNotices({
      metadata: graph(),
      readText: reader({
        "/registry/alpha/LICENSE-MIT": "alpha mit text",
        "/registry/beta/LICENSE": "beta text",
        "native/ghostty/LICENSE": "ghostty text",
      }),
      linkedComponents: [{ name: "libghostty-vt", version: "c5a21ed", license: "MIT", licenseFiles: [{ path: "native/ghostty/LICENSE", sha256: digest("ghostty text") }] }],
    });
    expect(text).toContain("alpha 1.0.0\nLicense: MIT OR Apache-2.0");
    expect(text).toContain("alpha mit text");
    expect(text).toContain("beta text");
    expect(text).toContain("libghostty-vt c5a21ed");
    expect(text).not.toContain("macro");
    expect(text).not.toContain("hidden");
    expect(text).not.toContain("tooling");
  });

  it("fails on a shipped crate without license text unless a pinned upstream text stands in", async () => {
    const files = { "/registry/beta/LICENSE": "beta text", "native/napi-LICENSE": "napi text" };
    await expect(renderTerminalHostNotices({ metadata: graph(), readText: reader(files), linkedComponents: [] }))
      .rejects.toThrow(/alpha 1\.0\.0: no license text in the locked source/u);
    const text = await renderTerminalHostNotices({
      metadata: graph(),
      readText: reader(files),
      linkedComponents: [],
      crateLicenseTexts: { alpha: [{ path: "native/napi-LICENSE", sha256: digest("napi text") }] },
    });
    expect(text).toContain("napi text");
  });

  it("fails on a non-allowlisted license and on a linked text that no longer matches its digest", async () => {
    const metadata = graph();
    metadata.packages[1]!.license = "GPL-3.0";
    await expect(renderTerminalHostNotices({
      metadata,
      readText: reader({ "/registry/alpha/LICENSE": "a", "/registry/beta/LICENSE": "b", "native/ghostty/LICENSE": "changed" }),
      linkedComponents: [{ name: "libghostty-vt", version: "c5a21ed", license: "MIT", licenseFiles: [{ path: "native/ghostty/LICENSE", sha256: digest("original") }] }],
    })).rejects.toThrow(/alpha 1\.0\.0: license GPL-3\.0 is not allowlisted[\s\S]*libghostty-vt: license text native\/ghostty\/LICENSE does not match its recorded digest/u);
  });
});

describe("terminal-host release build", () => {
  it("names the executable from product identity and the addon per platform", () => {
    expect(terminalHostExecutableName({ artifacts: { nativeExecutable: "terminal-host" } }, "win32")).toBe("terminal-host.exe");
    expect(terminalHostExecutableName({ artifacts: { nativeExecutable: "terminal-host" } }, "darwin")).toBe("terminal-host");
    expect(sessionLockLibraryName("win32")).toBe("terminal_host_contracts.dll");
    expect(sessionLockLibraryName("darwin")).toBe("libterminal_host_contracts.dylib");
    expect(sessionLockLibraryName("linux")).toBe("libterminal_host_contracts.so");
  });

  it("refuses a binary whose identity or features differ from a release build", () => {
    expect(verifyVersionReport(report, "0.1.0-dev")).toEqual([]);
    expect(verifyVersionReport({ ...report, generation: 2 }, "0.1.0-dev")).toContain("generation 2 is not 1");
    expect(verifyVersionReport(report, "0.2.0")).toContain("crate version 0.1.0-dev is not 0.2.0");
    expect(verifyVersionReport({ ...report, features: { faultInjection: true, residentFixtures: false } }, "0.1.0-dev")).toContain("release binary must not include fault injection");
    expect(verifyVersionReport({ ...report, features: { faultInjection: false, residentFixtures: true } }, "0.1.0-dev")).toContain("release binary must not include resident fixtures");
    expect(verifyVersionReport({ ...report, libghosttyVtCommit: "other" }, "0.1.0-dev")).toContain("libghostty-vt commit does not match the pinned source");
  });

  it("records every shipped file with its digest and size in the manifest", () => {
    const file = (filename: string) => ({ filename, sha256: "a".repeat(64), size: 10 });
    const manifest = buildManifest({
      platform: "linux",
      architecture: "x64",
      triple: "x86_64-unknown-linux-gnu",
      crateVersion: "0.1.0-dev",
      report,
      executable: file("terminal-host"),
      sessionLock: file("a1_session_lock.node"),
      notices: file("terminal-host-THIRD-PARTY-NOTICES.txt"),
      cargoLockSha256: "b".repeat(64),
      rustVersion: "rustc 1.98.1",
      zigVersion: "0.15.2",
      builtAt: "2026-10-14T00:00:00.000Z",
    });
    expect(manifest).toMatchObject({
      schema: "a1-terminal-host-artifact-v1",
      protocolVersion: 1,
      generation: 1,
      platform: "linux",
      architecture: "x64",
      target: "x86_64-unknown-linux-gnu",
      capability: "supported",
      artifact: { filename: "terminal-host" },
      sessionLock: { filename: "a1_session_lock.node" },
      notices: { filename: "terminal-host-THIRD-PARTY-NOTICES.txt" },
      provenance: { libghosttyVtCommit: report.libghosttyVtCommit, cargoLockSha256: "b".repeat(64), signatureStatus: "ci-attestation-required" },
    });
  });
});

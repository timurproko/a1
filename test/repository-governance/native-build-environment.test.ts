import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildStages, runBuild } from "../../scripts/development/run-build.mjs";
import {
  inspectMsvcEnvironment,
  parseVcvarsEnvironment,
  requireNativeBuildEnvironment,
  resolveNativeBuildEnvironment,
  resolveWindowsMsvc,
  resolveWindowsRust,
  VCVARS_SENTINEL,
} from "../../scripts/development/native-build-environment.mjs";

const root = "C:\\Program Files\\Microsoft Visual Studio\\18\\Community";
const tools = `${root}\\VC\\Tools\\MSVC\\14.50.0`;
const bin = `${tools}\\bin\\Hostx64\\x64`;
const compiler = `${bin}\\cl.exe`;
const linker = `${bin}\\link.exe`;
const vcvars = `${root}\\VC\\Auxiliary\\Build\\vcvars64.bat`;
const vswhere = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
const gitLink = "C:\\Program Files\\Git\\usr\\bin\\link.exe";
const sdk = "C:\\Program Files (x86)\\Windows Kits\\10\\";
const commandInterpreter = "C:\\Windows\\System32\\cmd.exe";

function existing(...paths: string[]) {
  const files = new Set(paths.map(path => path.toLowerCase()));
  return (path: string) => files.has(path.toLowerCase());
}

function vcvarsOutput(extra = "") {
  return [
    "Visual Studio environment initialized",
    VCVARS_SENTINEL,
    `Path=${bin};C:\\Program Files\\Git\\usr\\bin`,
    `VCToolsInstallDir=${tools}\\`,
    `WindowsSdkDir=${sdk}`,
    "LIB=C:\\sdk\\lib;C:\\vc\\lib",
    "A1_TEST_SECRET=must-not-appear-in-diagnostics",
    extra,
  ].join("\r\n");
}

describe("Windows native build environment", () => {
  it("uses Rustup's canonical user bin without mutating the launching environment", () => {
    const environment = { USERPROFILE: "C:\\Users\\dev", PATH: "C:\\Program Files\\Git\\usr\\bin" };
    const cargo = "C:\\Users\\dev\\.cargo\\bin\\cargo.exe";
    const rustc = "C:\\Users\\dev\\.cargo\\bin\\rustc.exe";
    const result = resolveWindowsRust(environment, { exists: existing(cargo, rustc) });
    expect(result.cargo).toMatchObject({ status: "ready", source: "rustup", path: cargo });
    expect(result.rustc).toMatchObject({ status: "ready", source: "rustup", path: rustc });
    expect(result.environment.CARGO).toBe(cargo);
    expect(result.environment.PATH).toMatch(/^C:\\Users\\dev\\\.cargo\\bin;/u);
    expect(environment).toEqual({ USERPROFILE: "C:\\Users\\dev", PATH: "C:\\Program Files\\Git\\usr\\bin" });
  });

  it("honors valid explicit Rust executables before PATH and the canonical location", () => {
    const cargo = "D:\\toolchains\\cargo.exe";
    const rustc = "D:\\toolchains\\rustc.exe";
    const result = resolveWindowsRust({
      USERPROFILE: "C:\\Users\\dev", CARGO: cargo, RUSTC: rustc, PATH: "C:\\other",
    }, { exists: existing(cargo, rustc) });
    expect(result.cargo).toMatchObject({ status: "ready", source: "override", path: cargo });
    expect(result.rustc).toMatchObject({ status: "ready", source: "override", path: rustc });
  });

  it("fails an invalid explicit Rust override instead of silently choosing another tool", () => {
    const canonical = "C:\\Users\\dev\\.cargo\\bin\\cargo.exe";
    const result = resolveWindowsRust({ USERPROFILE: "C:\\Users\\dev", CARGO: "C:\\missing\\cargo.exe", PATH: "" }, {
      exists: existing(canonical),
    });
    expect(result.cargo).toMatchObject({ status: "invalid-override", source: "override", path: null });
    expect(result.environment.CARGO).toBe("C:\\missing\\cargo.exe");
  });

  it("accepts an initialized environment only when compiler, linker, and SDK are coherent", () => {
    const environment = { PATH: `${bin};C:\\Program Files\\Git\\usr\\bin`, VCToolsInstallDir: `${tools}\\`, WindowsSdkDir: sdk, LIB: "C:\\sdk\\lib" };
    const inspected = inspectMsvcEnvironment(environment, { exists: existing(compiler, linker) });
    expect(inspected.ready).toBe(true);
    expect(inspected.compiler?.toLowerCase()).toBe(compiler.toLowerCase());
    expect(inspected.linker?.toLowerCase()).toBe(linker.toLowerCase());
    expect(inspectMsvcEnvironment({ ...environment, WindowsSdkDir: "" }, { exists: existing(compiler, linker) }))
      .toMatchObject({ ready: false, reason: "the Windows SDK library environment is not initialized" });
    const shadowed = inspectMsvcEnvironment({ ...environment, PATH: `C:\\Program Files\\Git\\usr\\bin;${bin}` }, {
      exists: existing(compiler, linker, gitLink),
    });
    expect(shadowed).toMatchObject({ ready: false, reason: "Microsoft x64 link.exe is not selected in the Visual Studio C++ environment" });
    expect(shadowed.linker?.toLowerCase()).toBe(gitLink.toLowerCase());
  });

  it("discovers Visual Studio and replaces a shadowing Git Bash linker for child processes", () => {
    const calls: Array<{ executable: string; arguments_: string[]; options: Record<string, unknown> }> = [];
    const result = resolveWindowsMsvc({
      PATH: "C:\\Program Files\\Git\\usr\\bin",
      "ProgramFiles(x86)": "C:\\Program Files (x86)",
      SystemRoot: "C:\\Windows",
    }, {
      exists: existing(vswhere, vcvars, compiler, linker, gitLink, commandInterpreter),
      spawn: (executable: string, arguments_: string[], options: Record<string, unknown>) => {
        calls.push({ executable, arguments_, options });
        return executable === vswhere
          ? { status: 0, stdout: `${root}\r\n` }
          : { status: 0, stdout: vcvarsOutput() };
      },
    });
    expect(result.msvc).toMatchObject({ status: "ready", source: "discovered" });
    expect(result.msvc.compiler?.toLowerCase()).toBe(compiler.toLowerCase());
    expect(result.msvc.linker?.toLowerCase()).toBe(linker.toLowerCase());
    const effectivePath = Object.entries(result.environment).find(([key]) => key.toLowerCase() === "path")?.[1];
    expect(effectivePath).toMatch(new RegExp(`^${bin.replaceAll("\\", "\\\\")}`, "u"));
    expect(calls[0]?.arguments_).toContain("Microsoft.VisualStudio.Component.VC.Tools.x86.x64");
    expect(calls[0]?.arguments_).not.toContain("-prerelease");
    expect(calls[1]?.arguments_.join(" ")).toContain("vcvars64.bat");
    expect(calls[1]?.options).toMatchObject({ windowsVerbatimArguments: true, encoding: "utf16le" });
    expect(JSON.stringify(result.msvc)).not.toContain("must-not-appear-in-diagnostics");
  });

  it("distinguishes a missing workload from a missing Visual Studio installation", () => {
    const environment = { PATH: "", "ProgramFiles(x86)": "C:\\Program Files (x86)" };
    let calls = 0;
    const workload = resolveWindowsMsvc(environment, {
      exists: existing(vswhere),
      spawn: (_executable: string, arguments_: string[]) => {
        calls += 1;
        return arguments_.includes("-requires") ? { status: 0, stdout: "" } : { status: 0, stdout: `${root}\n` };
      },
    });
    expect(workload.msvc).toMatchObject({ status: "missing-workload", source: "vswhere" });
    expect(calls).toBe(2);

    const installation = resolveWindowsMsvc(environment, {
      exists: existing(vswhere),
      spawn: () => ({ status: 0, stdout: "" }),
    });
    expect(installation.msvc).toMatchObject({ status: "missing-installation", source: "vswhere" });
  });

  it("fails closed on malformed or unsuccessful Visual Studio probes", () => {
    const environment = { PATH: "", "ProgramFiles(x86)": "C:\\Program Files (x86)" };
    expect(resolveWindowsMsvc(environment, {
      exists: existing(vswhere), spawn: () => ({ error: { code: "ETIMEDOUT" } }),
    }).msvc).toMatchObject({ status: "probe-failed", probeStatus: "timeout" });

    let calls = 0;
    expect(resolveWindowsMsvc({ ...environment, SystemRoot: "C:\\Windows" }, {
      exists: existing(vswhere, vcvars, commandInterpreter),
      spawn: () => (++calls === 1 ? { status: 0, stdout: root } : { status: 0, stdout: "no sentinel" }),
    }).msvc).toMatchObject({ status: "initialization-failed", probeStatus: "invalid-environment" });
  });

  it("parses values containing equals only after the vcvars sentinel", () => {
    expect(parseVcvarsEnvironment(`ignored=before\n${VCVARS_SENTINEL}\nPATH=C:\\bin\nTOKEN=a=b=c\n=hidden=value\n`)).toEqual({
      PATH: "C:\\bin", TOKEN: "a=b=c",
    });
    expect(parseVcvarsEnvironment("PATH=C:\\bin")).toBeNull();
  });

  it("leaves non-Windows environments unchanged and never probes Visual Studio", () => {
    const environment = { PATH: "/usr/bin", CARGO: "/opt/cargo" };
    let calls = 0;
    const result = resolveNativeBuildEnvironment({ platform: "linux", environment, spawn: () => { calls += 1; return {}; } });
    expect(result.environment).toEqual(environment);
    expect(result.environment).not.toBe(environment);
    expect(result.msvc).toMatchObject({ status: "not-required" });
    expect(calls).toBe(0);
    expect(requireNativeBuildEnvironment(result)).toEqual(environment);
  });

  it("blocks direct native builds before Cargo when Windows discovery is incomplete", () => {
    expect(() => requireNativeBuildEnvironment({
      environment: {},
      cargo: { status: "ready", source: "path", path: "cargo.exe" },
      rustc: { status: "ready", source: "path", path: "rustc.exe" },
      msvc: { status: "missing-workload", source: "vswhere" },
    })).toThrow(/Microsoft C\+\+ x64 tools.*npm run doctor/u);
  });
});

describe("native build orchestration", () => {
  it("checks prerequisites before managed work and adds the terminal host only to a full build", () => {
    const full = buildStages({ core: false, npmCli: "npm-cli.js", node: "node" });
    expect(full.map(stage => stage.arguments.join(" "))).toEqual([
      expect.stringContaining("check-environment.mjs"),
      "npm-cli.js run build:managed",
      expect.stringContaining("prepare-local-terminal-host.mjs"),
      expect.stringContaining("generate-runtime-payload-inventory.mjs"),
    ]);
    expect(buildStages({ core: true, npmCli: "npm-cli.js", node: "node" }).map(stage => stage.arguments.join(" ")))
      .not.toEqual(expect.arrayContaining([expect.stringContaining("prepare-local-terminal-host.mjs")]));
  });

  it("passes one resolved environment to every build stage and stops on the first failure", () => {
    const calls: Array<{ arguments_: string[]; environment: NodeJS.ProcessEnv | undefined }> = [];
    const status = runBuild({
      environment: { npm_execpath: "npm-cli.js" },
      resolveEnvironment: () => ({ environment: { npm_execpath: "npm-cli.js", EFFECTIVE_NATIVE_ENV: "ready" } }),
      spawn: (_executable: string, arguments_: string[], options: { env?: NodeJS.ProcessEnv }) => {
        calls.push({ arguments_, environment: options.env });
        return { status: calls.length === 2 ? 7 : 0 };
      },
    });
    expect(status).toBe(7);
    expect(calls).toHaveLength(2);
    expect(calls.every(call => call.environment?.EFFECTIVE_NATIVE_ENV === "ready")).toBe(true);
    expect(calls[0]?.arguments_.join(" ")).toContain("check-environment.mjs");
    expect(calls[1]?.arguments_).toEqual(["npm-cli.js", "run", "build:managed"]);
  });

  it("makes both direct native builders require the shared environment", async () => {
    for (const path of ["scripts/development/build-process-guardian.mjs", "scripts/development/build-terminal-host.mjs"]) {
      const source = await readFile(path, "utf8");
      expect(source).toContain("requireNativeBuildEnvironment(resolveNativeBuildEnvironment())");
    }
  });
});

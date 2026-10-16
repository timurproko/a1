/**
 * Shared target handling for the native release builds. A build normally produces the host's
 * platform and architecture; `--target <triple>` cross-compiles for another architecture of the same
 * operating system, which publication uses to build macOS x64 on the macOS arm64 runner.
 */

/** Cargo triples a release may contain, with the `dist/native/<platform>-<architecture>` identity each maps to. */
export const RELEASE_TARGETS = Object.freeze({
  "x86_64-pc-windows-msvc": Object.freeze({ platform: "win32", architecture: "x64", zigTarget: "x86_64-windows-msvc" }),
  "x86_64-unknown-linux-gnu": Object.freeze({ platform: "linux", architecture: "x64", zigTarget: "x86_64-linux-gnu" }),
  "aarch64-apple-darwin": Object.freeze({ platform: "darwin", architecture: "arm64", zigTarget: "aarch64-macos" }),
  "x86_64-apple-darwin": Object.freeze({ platform: "darwin", architecture: "x64", zigTarget: "x86_64-macos" }),
});

// Invariant: this map mirrors native/terminal-host/build_target.rs; the Rust side is the authority the
// build script links against, and the JavaScript side only names the same target in manifests.
export const ZIG_BASELINE_CPU = "baseline";

/** Read `--target <triple>` from the script arguments; absent means the host target. */
export function parseTargetArgument(argv) {
  const index = argv.indexOf("--target");
  if (index < 0) return null;
  const triple = argv[index + 1];
  if (!triple || !Object.hasOwn(RELEASE_TARGETS, triple)) {
    throw new Error(`unsupported --target ${JSON.stringify(triple ?? "")}; expected one of ${Object.keys(RELEASE_TARGETS).join(", ")}`);
  }
  return triple;
}

/**
 * Resolve where Cargo writes the build and which platform identity the artifacts carry. A requested
 * target must share the host operating system: the build scripts execute the produced binary to read
 * its identity, which only a same-OS cross build can do (through Rosetta 2 on macOS).
 */
export function resolveBuildTarget({ argv = [], hostPlatform = process.platform, hostArchitecture = process.arch } = {}) {
  const triple = parseTargetArgument(argv);
  if (triple === null) return { triple: null, platform: hostPlatform, architecture: hostArchitecture, cargoArguments: [], outputDirectory: "release", cross: false };
  const identity = RELEASE_TARGETS[triple];
  if (identity.platform !== hostPlatform) {
    throw new Error(`--target ${triple} builds for ${identity.platform}, which cannot be produced on a ${hostPlatform} host`);
  }
  const cross = identity.architecture !== hostArchitecture;
  return { triple, platform: identity.platform, architecture: identity.architecture, cargoArguments: ["--target", triple], outputDirectory: `${triple}/release`, cross };
}

/** The `dist/native` directory name and Zig target recorded for a release target. */
export function targetIdentity(triple) {
  const identity = RELEASE_TARGETS[triple];
  if (!identity) throw new Error(`unsupported release target ${triple}`);
  return identity;
}

const MACHO_64_MAGIC_LITTLE_ENDIAN = 0xfeedfacf;
const CPU_TYPE_X86_64 = 0x01000007;
const CPU_TYPE_ARM64 = 0x0100000c;

/** The architecture a 64-bit Mach-O header declares, or null for anything else (including fat binaries). */
export function machoArchitecture(bytes) {
  if (!bytes || bytes.length < 8) return null;
  const view = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (view.readUInt32LE(0) !== MACHO_64_MAGIC_LITTLE_ENDIAN) return null;
  const cpuType = view.readUInt32LE(4);
  if (cpuType === CPU_TYPE_X86_64) return "x64";
  if (cpuType === CPU_TYPE_ARM64) return "arm64";
  return null;
}

/**
 * Verify a built executable's identity by running it. When a same-OS cross build cannot execute
 * (no Rosetta 2 on the producing macOS runner), fall back to the Mach-O architecture so the
 * manifest records what was actually observed instead of an identity nobody saw.
 */
export function observeExecutableIdentity({ executable, arguments_, target, execute, readBytes }) {
  const result = execute(executable, arguments_);
  if (result.status === 0) return { check: "executed", stdout: result.stdout ?? "" };
  if (!target.cross || target.platform !== "darwin") {
    throw new Error(`${executable} ${arguments_.join(" ")} failed with ${result.status ?? result.error?.code ?? "no status"}`);
  }
  const architecture = machoArchitecture(readBytes(executable));
  if (architecture !== target.architecture) {
    throw new Error(`${executable} is a ${architecture ?? "non-Mach-O"} binary; expected ${target.architecture} for ${target.triple}`);
  }
  return { check: "mach-o-header", stdout: null };
}

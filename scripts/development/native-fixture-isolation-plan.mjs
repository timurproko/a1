import { resolve, dirname, join } from "node:path";
import { NATIVE_FIXTURE_POLICY } from "./native-fixture-policy.mjs";

const PUBLIC_VARIABLES =
  /^(?:VALIDATION_|TERMINAL_HOST_|RESIDENT_CHAOS_|STARTUP_|FULL_|RELEASE_RUNNER_LABEL$|UPDATE_PREDECESSOR_COUNT$|RUN_PROCESS_CONTAINMENT_INTEGRATION$)/u;
const TOOL_VARIABLES = new Set([
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "SystemDrive",
  "ComSpec",
  "COMSPEC",
  "PATHEXT",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "INCLUDE",
  "LIB",
  "LIBPATH",
  "VCToolsInstallDir",
  "VCINSTALLDIR",
  "VSINSTALLDIR",
  "WindowsSdkDir",
  "WindowsSDKVersion",
  "UCRTVersion",
  "UniversalCRTSdkDir",
  "ZIG",
  "RUSTUP_TOOLCHAIN",
  "CI",
  "GITHUB_ACTIONS",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
  "GITHUB_REPOSITORY",
  "GITHUB_SHA",
  "GITHUB_JOB",
  "GITHUB_WORKSPACE",
  "RUNNER_OS",
  "RUNNER_ARCH",
  "RUNNER_NAME",
  "RUNNER_ENVIRONMENT",
  "XDG_SESSION_ID",
  "LANG",
  "LC_ALL",
  "TERM",
  "npm_execpath",
  "npm_node_execpath",
  "A1_PROBE_TRACE",
  "A1_TERMINAL_HOST_PATH",
  "A1_PROCESS_GUARDIAN_PATH",
  "A1_DEV_INSTANCE_ID",
  "RUN_PI_ENGINE_REAL_INTEGRATION",
]);

/** Only reviewed hosted VMs may provision; a workstation cannot opt in with CI=1. */
export function assertHostedFixtureJob(env) {
  const head = env.NATIVE_FIXTURE_HEAD ?? env.GITHUB_SHA;
  if (
    env.CI !== "true" ||
    env.GITHUB_ACTIONS !== "true" ||
    env.RUNNER_ENVIRONMENT !== "github-hosted" ||
    !/^[1-9]\d*$/u.test(env.GITHUB_RUN_ID ?? "") ||
    !/^[1-9]\d*$/u.test(env.GITHUB_RUN_ATTEMPT ?? "") ||
    !/^[a-f\d]{40}$/u.test(head ?? "") ||
    !/^[\w.-]+\/[\w.-]+$/u.test(env.GITHUB_REPOSITORY ?? "")
  ) {
    throw new Error(
      "Native fixture provisioning requires an exact reviewed GitHub-hosted job; workstation execution is refused",
    );
  }
}

/** A new low-privilege workload receives public tool/selection values, never the runner's credentials. */
export function fixtureEnvironment(source, state) {
  const env = {};
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== undefined &&
      !/(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH|PRIVATE_KEY|PROXY|GITHUB_(?:ENV|OUTPUT|PATH|STEP_SUMMARY))/iu.test(
        key,
      ) &&
      (TOOL_VARIABLES.has(key) || PUBLIC_VARIABLES.test(key))
    )
      env[key] = value;
  }
  Object.assign(env, {
    HOME: state.home,
    USERPROFILE: state.home,
    TEMP: state.temp,
    TMP: state.temp,
    TMPDIR: state.temp,
    RUNNER_TEMP: state.temp,
    CARGO_HOME: state.cargo,
    RUSTUP_HOME: state.rustup,
    CARGO_NET_OFFLINE: "true",
    NATIVE_FIXTURE_HEAD: state.head,
    NATIVE_FIXTURE_ISOLATION_RECEIPT: state.receipt,
    NATIVE_FIXTURE_SANDBOX_ID: state.id,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: state.workspace ?? state.repo,
    GITHUB_WORKSPACE: state.workspace ?? state.repo,
  });
  // Platform: this new locked Linux service account has one provisioner-owned login scope, not an interactive logind session.
  if (state.platform === "linux")
    env.XDG_SESSION_ID = `native-fixture-${state.id}`;
  if (state.zig) env.ZIG_GLOBAL_CACHE_DIR = state.zig;
  env.PATH = [
    join(state.cargo, "bin"),
    dirname(state.node),
    source.PATH ?? source.Path ?? "",
  ].join(state.platform === "win32" ? ";" : ":");
  for (const [key, suffix] of [
    ["A1_CONFIG_DIR", "config"],
    ["A1_DATA_DIR", "data"],
    ["A1_RUNTIME_DIR", "runtime"],
  ])
    env[key] = join(state.work, suffix);
  return env;
}

export function isolationReceipt(state, probe, defenderRealtime) {
  if (
    !probe.loopback ||
    !probe.remoteBlocked ||
    !probe.credentialsHidden ||
    !probe.unprivileged ||
    !probe.sourceImmutable
  )
    throw new Error("Native fixture isolation probe failed");
  if (state.platform === "win32" && defenderRealtime !== true)
    throw new Error("Defender must remain enabled");
  return {
    schema: NATIVE_FIXTURE_POLICY,
    head: state.head,
    runId: state.runId,
    runAttempt: state.runAttempt,
    environment: "native-fixture-security-review",
    disposable: true,
    credentials: "none",
    egress: "loopback-only",
    securityReview: "approved",
    ...(state.platform === "win32" ? { defenderRealtime: true } : {}),
    sandboxId: state.id,
  };
}

/** Source and the privileged orchestrator stay read-only; only generated output is writable. */
export function writableOutputs(repo) {
  return [resolve(repo, ".artifacts")];
}

const literal = (value) => JSON.stringify(value);
export function macSandboxProfile(state) {
  const readable = [
    state.repo,
    state.work,
    state.control,
    state.receipt,
    state.toolCache,
    dirname(dirname(state.node)),
  ].filter(Boolean);
  const writable = [state.work, ...writableOutputs(state.repo)];
  const except = (paths) =>
    paths.map((path) => `(require-not (subpath ${literal(path)}))`).join(" ");
  return (
    `(version 1)\n(allow default)\n(deny network*)\n(allow network* (local unix-socket) (remote unix-socket))\n` +
    `(allow network-bind (local ip "localhost:*"))\n(allow network-inbound (local ip "localhost:*"))\n(allow network-outbound (remote ip "localhost:*"))\n` +
    `(deny file-read* (require-all (subpath ${literal(state.runnerHome)}) ${except(readable)}))\n` +
    `(deny file-write* (require-all (subpath ${literal(state.repo)}) ${except(writable)}))\n`
  );
}

export function linuxSandboxArguments(state, command) {
  return [
    "--unshare-user",
    "--unshare-pid",
    "--unshare-net",
    "--die-with-parent",
    "--new-session",
    "--cap-drop",
    "ALL",
    "--ro-bind",
    "/",
    "/",
    "--tmpfs",
    "/home",
    "--tmpfs",
    "/root",
    "--tmpfs",
    "/tmp",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--ro-bind",
    state.repo,
    state.repo,
    "--bind",
    state.work,
    state.work,
    "--ro-bind",
    state.control,
    state.control,
    "--ro-bind",
    state.receipt,
    state.receipt,
    ...writableOutputs(state.repo).flatMap((path) => ["--bind", path, path]),
    "--chdir",
    state.workspace ?? state.repo,
    "--",
    ...command,
  ];
}

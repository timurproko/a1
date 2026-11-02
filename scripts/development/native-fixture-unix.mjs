import { chmod, chown, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  linuxSandboxArguments,
  macSandboxProfile,
  writableOutputs,
} from "./native-fixture-isolation-plan.mjs";

function trusted(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 180_000,
  });
  if (result.error || result.status !== 0) {
    // Invariant: these are fixed OS setup commands with public paths/IDs, never credential-bearing workload environments.
    const detail = String(result.stderr ?? result.error?.message ?? "")
      .trim()
      .slice(0, 2048);
    throw new Error(
      `native isolation system setup failed: ${command} ${args.join(" ")} (${result.status ?? result.error?.code ?? "unknown"})${detail ? `: ${detail}` : ""}`,
    );
  }
  return result.stdout.trim();
}
function sudo(...args) {
  return trusted("sudo", ["-n", ...args]);
}
function ancestors(path) {
  const all = [];
  for (
    let parent = dirname(path);
    parent !== dirname(parent);
    parent = dirname(parent)
  )
    all.push(parent);
  return all;
}

export async function prepareUnixIsolation(state) {
  if (state.platform === "linux") {
    if (
      spawnSync("bwrap", ["--version"]).status !== 0 ||
      spawnSync("setfacl", ["--version"]).status !== 0 ||
      spawnSync("ip", ["-V"]).status !== 0
    ) {
      sudo("apt-get", "update", "-qq");
      sudo("apt-get", "install", "-y", "bubblewrap", "acl", "iproute2");
    }
    sudo(
      "useradd",
      "--system",
      "--no-create-home",
      "--home-dir",
      state.home,
      "--shell",
      "/usr/sbin/nologin",
      "--comment",
      `native-fixture-${state.id}`,
      state.user,
    );
    state.uid = Number(trusted("id", ["-u", state.user]));
    state.gid = Number(trusted("id", ["-g", state.user]));
    // Platform: configure loopback before dropping privilege; the workload never needs CAP_NET_ADMIN.
    state.networkNamespace = `native-fixture-${state.id}`;
    sudo("ip", "netns", "add", state.networkNamespace);
    sudo("ip", "-n", state.networkNamespace, "link", "set", "lo", "up");
    for (const path of ancestors(state.repo))
      sudo("setfacl", "-m", `u:${state.uid}:--x`, path);
  } else {
    const found = spawnSync("dscl", [".", "-read", `/Users/${state.user}`]);
    if (found.status === 0)
      throw new Error("native isolation account already exists");
    if (
      trusted("dscl", [".", "-search", "/Users", "UniqueID", String(state.uid)])
    )
      throw new Error("native isolation UID collision");
    for (const [key, value] of [
      ["UniqueID", String(state.uid)],
      ["PrimaryGroupID", "20"],
      ["UserShell", "/usr/bin/false"],
      ["NFSHomeDirectory", state.home],
      ["RealName", `native-fixture:${state.id}`],
      ["Password", "*"],
    ])
      sudo("dscl", ".", "-create", `/Users/${state.user}`, key, value);
    state.gid = 20;
    for (const path of new Set([
      ...ancestors(state.repo),
      ...ancestors(state.node),
    ]))
      sudo("chmod", "+a", `${state.user} allow search`, path);
    sudo(
      "chmod",
      "-R",
      "+a",
      `${state.user} allow read,execute,readattr,readextattr,readsecurity`,
      state.repo,
    );
    await writeFile(state.profile, macSandboxProfile(state), { mode: 0o644 });
  }
  if (
    !Number.isSafeInteger(state.uid) ||
    state.uid <= 0 ||
    state.uid === process.getuid()
  )
    throw new Error("native workload requires a new unprivileged UID");
  sudo("chown", "-R", `${state.uid}:${state.gid}`, state.work);
  for (const path of [state.work, ...writableOutputs(state.repo)]) {
    await mkdir(path, { recursive: true });
    sudo("chown", "-R", `${state.uid}:${state.gid}`, path);
    if (state.platform === "linux") {
      sudo("setfacl", "-R", "-m", `u:${process.getuid()}:rwx`, path);
      sudo("setfacl", "-m", `d:u:${process.getuid()}:rwx`, path);
    } else {
      sudo(
        "chmod",
        "-R",
        "+a",
        `${process.env.USER} allow read,write,execute,delete,readattr,writeattr,readextattr,writeextattr,readsecurity,file_inherit,directory_inherit`,
        path,
      );
    }
  }
  await chmod(state.control, 0o755);
  await chmod(dirname(state.work), 0o755);
}

/** Every exec preserves the OS sandbox through fork/setsid and drops inherited runner environment. */
export function unixInvocation(state, request) {
  const worker = [
    state.node,
    join(state.repo, "scripts/development/native-fixture-worker.mjs"),
    request,
  ];
  const sandbox =
    state.platform === "linux"
      ? ["bwrap", ...linuxSandboxArguments(state, worker)]
      : ["/usr/bin/sandbox-exec", "-f", state.profile, ...worker];
  if (
    state.platform === "linux" &&
    state.networkNamespace !== `native-fixture-${state.id}`
  )
    throw new Error("native isolation network namespace is unavailable");
  const network =
    state.platform === "linux"
      ? ["ip", "netns", "exec", state.networkNamespace, "sudo", "-n"]
      : [];
  return {
    command: "sudo",
    args: [
      "-n",
      ...network,
      "-u",
      state.user,
      "--",
      "env",
      "-i",
      ...Object.entries(state.environment).map(
        ([key, value]) => `${key}=${value}`,
      ),
      ...sandbox,
    ],
  };
}

export async function shareUnixRequest(state, request) {
  await chmod(request, 0o644);
  await chmod(state.receipt, 0o644).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  const plan = JSON.parse(await readFile(request, "utf8"));
  for (const path of plan.command ?? [])
    if (path.startsWith(state.control)) await chmod(path, 0o644);
}

export async function cleanupUnixIsolation(state) {
  const uid = Number(trusted("id", ["-u", state.user]));
  if (uid !== state.uid || !state.user.startsWith("nf"))
    throw new Error("native isolation account identity changed");
  if (state.platform === "linux") {
    // Security: namespace init owns all workload descendants; refuse account removal if anything escaped its teardown.
    if (spawnSync("pgrep", ["-u", String(uid)]).status === 0)
      throw new Error("native workload processes survived namespace teardown");
    if (state.networkNamespace !== `native-fixture-${state.id}`)
      throw new Error("native isolation network namespace identity changed");
    if (sudo("ip", "netns", "pids", state.networkNamespace))
      throw new Error("native network namespace still has live processes");
    sudo("ip", "netns", "delete", state.networkNamespace);
    sudo("userdel", state.user);
  } else {
    // Security: this fresh dedicated UID belongs only to this disposable job, never the runner or a production account.
    const result = spawnSync("sudo", [
      "-n",
      "pkill",
      "-KILL",
      "-U",
      String(uid),
    ]);
    if (![0, 1].includes(result.status))
      throw new Error("native fixture account cleanup failed");
    if (spawnSync("pgrep", ["-U", String(uid)]).status === 0)
      throw new Error("native workload processes survived cleanup");
    sudo("dscl", ".", "-delete", `/Users/${state.user}`);
  }
}

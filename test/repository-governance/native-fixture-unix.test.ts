import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({
  missingAcl: false,
  useraddFailure: "",
  namespaceProcesses: "",
}));
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn((command: string, args: string[]) => {
    const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
    if (command === "id") return ok("640\n");
    if (command === "pgrep") return { status: 1, stdout: "", stderr: "" };
    if (command === "sudo" && args.slice(1, 4).join(" ") === "ip netns pids")
      return ok(control.namespaceProcesses);
    if (command === "setfacl" && control.missingAcl)
      return { status: 1, stdout: "", stderr: "missing" };
    if (command === "sudo" && args[1] === "useradd") {
      const comment = args[args.indexOf("--comment") + 1]!;
      const error =
        control.useraddFailure ||
        (/[\r\n:]/u.test(comment) ? "useradd: invalid comment" : "");
      if (error) return { status: 3, stdout: "", stderr: error };
    }
    return ok();
  }),
}));
vi.mock("node:fs/promises", () => ({
  chmod: vi.fn(async () => {}),
  chown: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
  readFile: vi.fn(),
  writeFile: vi.fn(async () => {}),
}));
import { spawnSync } from "node:child_process";
import {
  prepareUnixIsolation,
  unixInvocation,
  cleanupUnixIsolation,
  type UnixIsolationState,
} from "../../scripts/development/native-fixture-unix.mjs";

function state(): UnixIsolationState {
  return {
    id: "123456789abc",
    user: "nf123456789abc",
    uid: 50000,
    platform: "linux",
    head: "a".repeat(40),
    runId: "1",
    runAttempt: "1",
    repo: "/home/runner/work/repo",
    workspace: "/tmp/isolation/work/repo",
    node: "/usr/bin/node",
    home: "/tmp/isolation/work/home",
    temp: "/tmp/isolation/work/tmp",
    work: "/tmp/isolation/work",
    control: "/tmp/isolation/control",
    cargo: "/tmp/isolation/work/cargo",
    rustup: "/tmp/isolation/work/rustup",
    receipt: "/home/runner/work/_temp/receipt.json",
    runnerHome: "/home/runner",
    profile: "/tmp/isolation/control/sandbox.sb",
    environment: {},
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  control.missingAcl = false;
  control.useraddFailure = "";
  control.namespaceProcesses = "";
  vi.stubGlobal("process", { ...process, getuid: () => 1001 });
});
afterEach(() => vi.unstubAllGlobals());

describe("Linux native isolation account preparation", () => {
  it("uses a valid passwd comment and retains a dedicated non-runner UID", async () => {
    const value = state();
    await expect(prepareUnixIsolation(value)).resolves.toBeUndefined();
    const call = vi
      .mocked(spawnSync)
      .mock.calls.find(
        ([command, args]) =>
          command === "sudo" && (args as string[])[1] === "useradd",
      )!;
    const args = call[1] as string[];
    expect(args[args.indexOf("--comment") + 1]).toBe(
      "native-fixture-123456789abc",
    );
    expect(args).toEqual(
      expect.arrayContaining([
        "--system",
        "--no-create-home",
        "/usr/sbin/nologin",
      ]),
    );
    expect(value.uid).toBe(640);
    expect(value.uid).not.toBe(process.getuid!());
    expect(
      vi
        .mocked(spawnSync)
        .mock.calls.some(
          ([command, args]) =>
            command === "sudo" && (args as string[]).includes("setfacl"),
        ),
    ).toBe(true);
  });
  it("configures the private network before executing as the unprivileged account with zero capabilities", async () => {
    const value = state();
    await prepareUnixIsolation(value);
    const calls = vi
      .mocked(spawnSync)
      .mock.calls.map(
        ([command, args]) => `${command} ${(args as string[]).join(" ")}`,
      );
    const created = calls.indexOf(
      `sudo -n ip netns add ${value.networkNamespace}`,
    );
    const configured = calls.indexOf(
      `sudo -n ip -n ${value.networkNamespace} link set lo up`,
    );
    expect(created).toBeGreaterThan(-1);
    expect(configured).toBeGreaterThan(created);
    const invocation = unixInvocation(value, "request.json");
    expect(invocation.command).toBe("sudo");
    expect(invocation.args.slice(0, 9)).toEqual([
      "-n",
      "ip",
      "netns",
      "exec",
      value.networkNamespace,
      "sudo",
      "-n",
      "-u",
      value.user,
    ]);
    expect(invocation.args).toContain("--unshare-user");
    expect(invocation.args).toContain("--unshare-pid");
    expect(invocation.args).not.toContain("--unshare-net");
    expect(invocation.args[invocation.args.indexOf("--cap-drop") + 1]).toBe(
      "ALL",
    );
  });
  it("never falls back to the host network or removes a namespace with live processes", async () => {
    expect(() => unixInvocation(state(), "request.json")).toThrow(
      "network namespace is unavailable",
    );
    const value = state();
    await prepareUnixIsolation(value);
    control.namespaceProcesses = "123\n";
    await expect(cleanupUnixIsolation(value)).rejects.toThrow(
      "still has live processes",
    );
    expect(
      vi
        .mocked(spawnSync)
        .mock.calls.some(([, args]) => (args as string[]).includes("delete")),
    ).toBe(false);
  });
  it("removes only the prepared network namespace after verified process closure", async () => {
    const value = state();
    await prepareUnixIsolation(value);
    await cleanupUnixIsolation(value);
    const calls = vi
      .mocked(spawnSync)
      .mock.calls.map(
        ([command, args]) => `${command} ${(args as string[]).join(" ")}`,
      );
    const inspected = calls.indexOf(
      `sudo -n ip netns pids ${value.networkNamespace}`,
    );
    const removed = calls.indexOf(
      `sudo -n ip netns delete ${value.networkNamespace}`,
    );
    expect(inspected).toBeGreaterThan(-1);
    expect(removed).toBeGreaterThan(inspected);
    expect(calls.indexOf(`sudo -n userdel ${value.user}`)).toBeGreaterThan(
      removed,
    );
  });
  it("keeps the failed operation, exit code and bounded OS error instead of only reporting sudo", async () => {
    control.useraddFailure = "useradd: account database locked";
    await expect(prepareUnixIsolation(state())).rejects.toThrow(
      /sudo -n useradd.*\(3\): useradd: account database locked/u,
    );
  });
  it("installs the ACL tool even if Bubblewrap is already present", async () => {
    control.missingAcl = true;
    await prepareUnixIsolation(state());
    expect(
      vi
        .mocked(spawnSync)
        .mock.calls.some(
          ([command, args]) =>
            command === "sudo" &&
            (args as string[]).join(" ") ===
              "-n apt-get install -y bubblewrap acl iproute2",
        ),
    ).toBe(true);
  });
});

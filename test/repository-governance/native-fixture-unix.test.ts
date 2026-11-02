import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({ missingAcl: false, useraddFailure: "" }));
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn((command: string, args: string[]) => {
    const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
    if (command === "id") return ok("640\n");
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
              "-n apt-get install -y bubblewrap acl",
        ),
    ).toBe(true);
  });
});

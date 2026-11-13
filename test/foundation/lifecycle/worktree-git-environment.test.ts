import { describe, expect, it } from "vitest";
import { rethrowStartupGitFailure, worktreeGitEnvironment } from "../../../src/foundation/lifecycle/worktree-git-environment.js";

describe("worktree Git environment policy", () => {
  it("removes checkout/storage/discovery overrides without changing the caller or unrelated authentication/configuration", () => {
    const overrides = {
      GIT_DIR: "/other/.git", GIT_WORK_TREE: "/other", GIT_COMMON_DIR: "/other/.git",
      GIT_IMPLICIT_WORK_TREE: "0", GIT_INDEX_FILE: "/other/index", GIT_OBJECT_DIRECTORY: "/other/objects",
      GIT_ALTERNATE_OBJECT_DIRECTORIES: "/other/alternate", GIT_SHALLOW_FILE: "/other/shallow",
      GIT_GRAFT_FILE: "/other/grafts", GIT_REPLACE_REF_BASE: "refs/other/", GIT_NO_REPLACE_OBJECTS: "1",
      GIT_PREFIX: "subdir/", GIT_INTERNAL_SUPER_PREFIX: "parent/", GIT_CEILING_DIRECTORIES: "/root", GIT_DISCOVERY_ACROSS_FILESYSTEM: "0",
    };
    const retained = {
      PATH: "/bin", HOME: "/home/user", GIT_SSH_COMMAND: "ssh -F config", GIT_ASKPASS: "askpass",
      GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "credential.helper", GIT_CONFIG_VALUE_0: "manager",
      GIT_CONFIG_GLOBAL: "/home/user/.gitconfig", GIT_TERMINAL_PROMPT: "0", UNRELATED_SETTING: "retained",
    };
    const environment = Object.freeze({ ...overrides, ...retained });
    expect(worktreeGitEnvironment(environment, "linux")).toEqual(retained);
    expect(environment).toEqual({ ...overrides, ...retained });
  });

  it("matches Git variable names case-insensitively only on Windows", () => {
    const environment = { Git_Dir: "foreign", git_work_tree: "foreign", Git_Common_Dir: "foreign", Path: "bin", ordinary: "value" };
    expect(worktreeGitEnvironment(environment, "win32")).toEqual({ Path: "bin", ordinary: "value" });
    expect(worktreeGitEnvironment(environment, "linux")).toEqual(environment);
  });

  it("classifies only a definite non-repository startup, preserving the cause", () => {
    const error = Object.assign(new Error("git failed"), { code: 128, stderr: "fatal: not a git repository (or any of the parent directories): .git" });
    expect(() => rethrowStartupGitFailure(error)).toThrow(expect.objectContaining({ code: "worktree-startup-not-repository", cause: error }));
    for (const uncertain of [
      new Error("timeout"), Object.assign(new Error("cancelled"), { code: "ABORT_ERR", stderr: "not a git repository" }),
      Object.assign(new Error("permission"), { code: 128, stderr: "permission denied" }),
    ]) expect(() => rethrowStartupGitFailure(uncertain)).toThrow(uncertain);
  });
});

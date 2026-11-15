const REPOSITORY_ENVIRONMENT = new Set([
  "GIT_DIR", "GIT_COMMON_DIR", "GIT_WORK_TREE", "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_SHALLOW_FILE", "GIT_GRAFT_FILE", "GIT_REPLACE_REF_BASE", "GIT_NO_REPLACE_OBJECTS",
  "GIT_PREFIX", "GIT_INTERNAL_SUPER_PREFIX", "GIT_CEILING_DIRECTORIES", "GIT_DISCOVERY_ACROSS_FILESYSTEM",
]);

/** Explicit-root lifecycle operations must not inherit another checkout's Git storage or discovery. */
export function worktreeGitEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([name]) =>
    !REPOSITORY_ENVIRONMENT.has(platform === "win32" ? name.toUpperCase() : name)));
}

/** Missing discovery requires explicit repository selection; other failures stay uncertain. */
export function rethrowStartupGitFailure(error: unknown): never {
  if (error instanceof Error && "code" in error && error.code === 128
    && "stderr" in error && String(error.stderr).includes("not a git repository")) {
    throw Object.assign(new Error("no repository was selected; pass --repo <absolute-path> to enter/list or attach an absolute task worktree", { cause: error }), {
      code: "worktree-startup-not-repository",
    });
  }
  throw error;
}

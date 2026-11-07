const COMMIT = /^[0-9a-f]{40}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const ID = /^[a-z][a-z0-9-]{0,79}$/u;

/** Bind one scope outcome to immutable workflow and selection authority. */
export function validationOutcomeAuthority(environment, requested, selected) {
  const names = ["VALIDATION_HEAD", "VALIDATION_RUN_ID", "VALIDATION_RUN_ATTEMPT", "VALIDATION_SELECTION_ID", "VALIDATION_JOB_ID",
    "VALIDATION_TARGET_PLATFORM", "VALIDATION_TARGET_ARCHITECTURE", "VALIDATION_TARGET_NODE", "VALIDATION_OWNERS_JSON", "VALIDATION_JOB_STARTED_MS"];
  const present = names.filter(name => environment[name] !== undefined);
  if (present.length === 0) return null;
  if (present.length !== names.length) throw new Error("validation outcome authority is incomplete");
  const value = {
    schema: "a1-validation-outcome-authority-v1", head: environment.VALIDATION_HEAD, runId: environment.VALIDATION_RUN_ID,
    runAttempt: Number(environment.VALIDATION_RUN_ATTEMPT), selectionId: environment.VALIDATION_SELECTION_ID,
    job: environment.VALIDATION_JOB_ID, platform: environment.VALIDATION_TARGET_PLATFORM, architecture: environment.VALIDATION_TARGET_ARCHITECTURE, node: Number(environment.VALIDATION_TARGET_NODE),
    owners: JSON.parse(environment.VALIDATION_OWNERS_JSON), requested, selected,
    jobStartedAt: Number(environment.VALIDATION_JOB_STARTED_MS), cacheState: environment.VALIDATION_CACHE_STATE ?? "unmeasured",
  };
  return assertValidationOutcomeAuthority(value);
}

export function assertValidationOutcomeAuthority(value) {
  if (!value || value.schema !== "a1-validation-outcome-authority-v1" || !COMMIT.test(value.head ?? "") || !DIGEST.test(value.selectionId ?? "")
    || !/^\d{1,24}$/u.test(value.runId ?? "") || !Number.isSafeInteger(value.runAttempt) || value.runAttempt < 1 || !ID.test(value.job ?? "")
    || !["win32", "linux", "darwin"].includes(value.platform) || !["x64", "arm64"].includes(value.architecture) || ![22, 24].includes(value.node)
    || !Number.isSafeInteger(value.jobStartedAt) || value.jobStartedAt < 0 || typeof value.cacheState !== "string" || value.cacheState.length > 80) {
    throw new TypeError("validation outcome authority identity is invalid");
  }
  for (const key of ["owners", "requested", "selected"]) if (!Array.isArray(value[key]) || value[key].length > 64
    || value[key].some(entry => !ID.test(entry)) || new Set(value[key]).size !== value[key].length) throw new TypeError(`validation outcome ${key} is invalid`);
  return value;
}

const DEFAULT_CRITICAL_PATH_LIMIT_MS = 8 * 60_000;
const DEFAULT_SCOPE_LIMIT_MS = 5 * 60_000;
const ID = /^[a-z][a-z0-9-]{0,79}$/u;

/** Evaluate repository execution time without treating hosted queue delay as test time. */
export function evaluateDevelopmentValidationTiming({ jobs, aggregateProcessingMs = 0, criticalPathLimitMs = DEFAULT_CRITICAL_PATH_LIMIT_MS, scopeLimitMs = DEFAULT_SCOPE_LIMIT_MS }) {
  if (!Array.isArray(jobs) || jobs.length === 0 || jobs.length > 128) throw new TypeError("development timing jobs are missing or unbounded");
  for (const value of [aggregateProcessingMs, criticalPathLimitMs, scopeLimitMs]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("development timing limit or aggregate duration is invalid");
  }
  const scopes = [];
  for (const job of jobs) {
    if (!job || !ID.test(job.job ?? "") || !Number.isSafeInteger(job.runnerMs) || job.runnerMs < 0
      || !Array.isArray(job.scopeDurations) || job.scopeDurations.length > 256) throw new TypeError("development timing job is malformed");
    for (const invocation of job.scopeDurations) {
      if (!invocation || !ID.test(invocation.id ?? "") || !ID.test(invocation.scope ?? "")
        || !Number.isSafeInteger(invocation.durationMs) || invocation.durationMs < 0) throw new TypeError("development timing scope is malformed");
      scopes.push({ job: job.job, id: invocation.id, scope: invocation.scope, durationMs: invocation.durationMs });
    }
  }
  const aggregateRunnerMs = jobs.reduce((maximum, job) => Math.max(maximum, job.runnerMs), 0);
  const criticalPathMs = aggregateRunnerMs + aggregateProcessingMs;
  const maxScopeMs = scopes.reduce((maximum, scope) => Math.max(maximum, scope.durationMs), 0);
  return {
    aggregateProcessingMs,
    criticalPathMs,
    runnerMs: jobs.reduce((total, job) => total + job.runnerMs, 0),
    maxScopeMs,
    scopes,
    targets: {
      criticalPathLimitMs,
      scopeLimitMs,
      criticalPathMet: criticalPathMs <= criticalPathLimitMs,
      scopeMet: maxScopeMs <= scopeLimitMs,
    },
  };
}

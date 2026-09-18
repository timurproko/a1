export { assertStartupPerformanceBudget, evaluateStartupPerformanceBudget, formatStartupBudgetViolation, resolveStartupBudgetMs } from "./startup-budget.js";
export type { StartupBudgetViolation, StartupPerformanceEvidence } from "./startup-budget.js";
export {
  assertImmutableWarmupEnvironment,
  collectCompileCaches,
  enableEnvironmentCompileCache,
  enableStartupCompileCache,
  initializeStartupTrace,
  markStartupPhase,
  parseStartupTrace,
  startupCompileCachePath,
} from "./startup-runtime.js";
export type { StartupPhase, StartupTraceEvent } from "./startup-runtime.js";

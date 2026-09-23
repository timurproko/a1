/**
 * Emits the file boundary before Vitest executes a module, so a runner-level termination still
 * leaves the active file set in the job log instead of losing all ownership evidence.
 */
export default class ValidationProgressReporter {
  onTestModuleStart(testModule) {
    process.stdout.write(`[validation-test-start] ${testModule.moduleId}\n`);
  }
}
